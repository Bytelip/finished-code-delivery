import React, { useEffect, useState, useCallback, useRef } from "react";
import { CosmicAuthPage, getStoredUser, saveStoredUser } from "@/components/CosmicAuthPage";
import {
  clearStoredProfile,
  loadStoredProfile,
  saveStoredProfile,
  type UserProfile,
} from "@/types/userProfile";
import { processIncomingAuthCallback, signOutUser } from "@/services/authService";
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

  const hasAcquiredInitialGps = useRef(false);

  // Auto-acquire high-accuracy live GPS location strictly ONCE after authentication
  const triggerAutoGpsTracking = useCallback(
    (userName: string) => {
      if (
        hasAcquiredInitialGps.current ||
        (typeof window !== "undefined" && window.sessionStorage?.getItem("agro_initial_gps_done") === "true")
      ) {
        return;
      }
      hasAcquiredInitialGps.current = true;
      try {
        window.sessionStorage?.setItem("agro_initial_gps_done", "true");
      } catch {}

      if (typeof window === "undefined" || !navigator.geolocation) {
        toast.info(`Welcome, ${userName}`, {
          description: "Hardware GPS not supported on this device. Manual coordinate entry active.",
        });
        return;
      }

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
          const timeoutId = setTimeout(() => controller.abort(), 2000);
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
          duration: 2000,
        });
      };

      const handleErr = (err: GeolocationPositionError) => {
        console.warn("Auto-GPS error:", err.message);
        toast.dismiss("auto-gps-lock");
      };

      // Strict one-time fetch with maximumAge: 60000 and 8s timeout (no watchPosition)
      navigator.geolocation.getCurrentPosition(handlePos, handleErr, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });
    },
    [onLiveLocationAcquired]
  );

  // Check returning OAuth callback tokens or initialize GPS for existing verified session
  useEffect(() => {
    processIncomingAuthCallback().then((user) => {
      if (user && (user.verified || user.isVerified)) {
        setCurrentUser(user);
        saveStoredUser(user);
        saveStoredProfile(user);
        triggerAutoGpsTracking(user.fullName || user.name || "Operator");
      }
    });

    if (currentUser && (currentUser.verified || currentUser.isVerified) && !hasAcquiredInitialGps.current) {
      triggerAutoGpsTracking(currentUser.fullName || currentUser.name || "Operator");
    }
  }, [currentUser, triggerAutoGpsTracking]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    saveStoredUser(user);
    saveStoredProfile(user);
    triggerAutoGpsTracking(user.fullName || user.name || "Operator");
  };

  const handleSignOut = async () => {
    hasAcquiredInitialGps.current = false;
    try {
      window.sessionStorage?.removeItem("agro_initial_gps_done");
    } catch {}
    await signOutUser();
    setCurrentUser(null);
    toast.info("Operator Signed Out", {
      description: "Mission Control session terminated. Authentication required to access telemetry.",
    });
    if (typeof window !== "undefined") {
      window.location.assign(window.location.origin);
    }
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
