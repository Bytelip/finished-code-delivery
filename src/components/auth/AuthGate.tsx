import React, { useEffect, useState, useCallback, useRef } from "react";
import { CosmicAuthPage, getStoredUser, saveStoredUser } from "@/components/CosmicAuthPage";
import {
  clearStoredProfile,
  loadStoredProfile,
  saveStoredProfile,
  type UserProfile,
} from "@/types/userProfile";
import { processIncomingAuthCallback } from "@/services/authService";
import { toast } from "sonner";
import { syncUrlCoords } from "@/utils/preciseLocation";

interface AuthGateProps {
  children: (props: {
    user: UserProfile;
    onSignOut: () => void;
    onUpdateUser: (u: UserProfile) => void;
  }) => React.ReactNode;
  onLiveLocationAcquired?: (lat: number, lon: number, locationName: string) => void;
}

export function AuthGate({ children, onLiveLocationAcquired }: AuthGateProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const stored = getStoredUser() || loadStoredProfile();
    if (stored && (stored.verified || stored.isVerified)) {
      return stored;
    }
    return null;
  });

  const watchIdRef = useRef<number | null>(null);

  // Auto-acquire high-accuracy live GPS location immediately after authentication
  const triggerAutoGpsTracking = useCallback(
    (userName: string) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        toast.info(`Welcome, ${userName}`, {
          description: "Hardware GPS not supported on this device. Manual coordinate entry active.",
        });
        return;
      }

      toast.loading("Acquiring Live GPS & Satellite Lock...", {
        id: "auto-gps-lock",
        duration: 4000,
      });

      const handlePos = async (pos: GeolocationPosition) => {
        const rawLat = pos.coords.latitude;
        const rawLon = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        const fixedLat = Math.round(rawLat * 10000) / 10000;
        const fixedLon = Math.round(rawLon * 10000) / 10000;

        let placeName = `Field ${Math.abs(fixedLat).toFixed(4)}°${fixedLat >= 0 ? "N" : "S"}, ${Math.abs(fixedLon).toFixed(4)}°${fixedLon >= 0 ? "E" : "W"}`;

        try {
          // Reverse-geocode via OpenStreetMap Nominatim
          const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLon}&zoom=14&addressdetails=1`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(nomUrl, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const town =
              addr.village ||
              addr.town ||
              addr.suburb ||
              addr.city ||
              addr.municipality ||
              addr.county ||
              data.name;
            const state = addr.state || addr.region || addr.country;
            if (town && state) {
              placeName = `${town}, ${state}`;
            } else if (town) {
              placeName = town;
            } else if (data.display_name) {
              placeName = data.display_name.split(",").slice(0, 2).join(",");
            }
          }
        } catch {
          // Fallback to formatted coords
        }

        // Update URL query parameters ?lat=...&lon=...
        syncUrlCoords(fixedLat, fixedLon);

        // Update parent dashboard state & flight pipeline
        onLiveLocationAcquired?.(fixedLat, fixedLon, placeName);

        toast.success(`🛰️ GPS Target Lock: ${placeName}`, {
          id: "auto-gps-lock",
          description: `Live coordinates ${fixedLat}°N, ${fixedLon}°E (±${accuracy}m). Telemetry calibrated.`,
          duration: 4000,
        });
      };

      const handleErr = (err: GeolocationPositionError) => {
        console.warn("Auto-GPS error:", err.message);
        toast.dismiss("auto-gps-lock");
        toast.info(`Welcome, ${userName}`, {
          description: "GPS permission not granted. Default farm target active. Click 'GPS' in navbar to retry.",
        });
      };

      // 1. One-time high-precision lock
      navigator.geolocation.getCurrentPosition(handlePos, handleErr, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      // 2. Active watch for moving equipment/operators
      try {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = Math.round(pos.coords.latitude * 10000) / 10000;
            const lon = Math.round(pos.coords.longitude * 10000) / 10000;
            syncUrlCoords(lat, lon);
          },
          undefined,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      } catch {
        // ignore watchPosition failure
      }
    },
    [onLiveLocationAcquired]
  );

  // Check returning OAuth callback tokens
  useEffect(() => {
    processIncomingAuthCallback().then((user) => {
      if (user && (user.verified || user.isVerified)) {
        setCurrentUser(user);
        saveStoredUser(user);
        saveStoredProfile(user);
        triggerAutoGpsTracking(user.fullName || user.name || "Operator");
      }
    });

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [triggerAutoGpsTracking]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    saveStoredUser(user);
    saveStoredProfile(user);
    triggerAutoGpsTracking(user.fullName || user.name || "Operator");
  };

  const handleSignOut = () => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearStoredProfile();
    try {
      localStorage.removeItem("agrospace_user_profile_v1");
      localStorage.removeItem("agro_user_profile");
    } catch {
      // ignore
    }
    setCurrentUser(null);
    toast.info("Operator Signed Out", {
      description: "Mission Control session terminated. Authentication required to access telemetry.",
    });
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    saveStoredUser(updated);
    saveStoredProfile(updated);
  };

  // If unauthenticated or unverified, NEVER render dashboard — display full-screen CosmicAuthPage!
  if (!currentUser || (!currentUser.verified && !currentUser.isVerified)) {
    return <CosmicAuthPage onSuccess={handleAuthSuccess} />;
  }

  return <>{children({ user: currentUser, onSignOut: handleSignOut, onUpdateUser: handleUpdateUser })}</>;
}
