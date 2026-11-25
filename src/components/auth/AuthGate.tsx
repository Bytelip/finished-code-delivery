import React, { useEffect, useState, useCallback, useRef } from "react";
import { CosmicAuthPage, saveStoredUser } from "@/components/CosmicAuthPage";
import type { UserProfile } from "@/types/userProfile";
import { supabase } from "@/integrations/supabase/client";
import { fetchSignedInProfile, saveProfile, signOut } from "@/services/cloudAuth";
import { toast } from "sonner";
import { syncUrlCoords } from "@/utils/preciseLocation";
import { LocalizedText } from "@/components/i18n/LocalizedText";

interface AuthGateProps {
  children: (props: {
    user: UserProfile;
    onSignOut: () => void;
    onUpdateUser: (u: UserProfile) => void;
  }) => React.ReactNode;
  onLiveLocationAcquired?: (lat: number, lon: number, locationName: string) => void;
}

export function AuthGate({ children, onLiveLocationAcquired }: AuthGateProps) {
  // The signed-in account comes directly from Supabase Auth; the session is restored after mount
  // (it lives in browser storage), so the server and the first browser render match.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const profile = await fetchSignedInProfile();
        if (!active) return;
        setCurrentUser(profile);
        // Display cache only; access is always decided by the live session above.
        saveStoredUser(profile);
        setSessionChecked(true);
      } catch (err) {
        console.warn("[AuthGate] Error fetching signed in profile:", err);
        if (active) setSessionChecked(true);
      }
    };

    // Safety timeout: guaranteed resolution to unblock the UI within 1200ms
    const safetyTimer = setTimeout(() => {
      if (active) setSessionChecked(true);
    }, 1200);

    const initializeAuth = async () => {
      // Check current session first (awaits detectSessionInUrl PKCE exchange if ?code= is in URL)
      const { data: initialSessionData } = await supabase.auth.getSession();
      if (!active) return;

      // Fallback manual exchange if ?code= was present and not auto-exchanged
      if (!initialSessionData.session && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (err) {
            console.warn("[AuthGate] OAuth code exchange:", err);
          }
        }
      }

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("code")) {
          urlParams.delete("code");
          const qs = urlParams.toString();
          const cleanUrl =
            window.location.pathname + (qs ? `?${qs}` : "") + (window.location.hash || "");
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionData.session) {
        await refresh();
      } else {
        const hasPendingCode =
          typeof window !== "undefined" && new URLSearchParams(window.location.search).has("code");
        if (!hasPendingCode) {
          setSessionChecked(true);
        }
      }
    };

    void initializeAuth();

    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange((event, session) => {
        try {
          if (!active) return;
          if (!session) {
            const hasPendingCode =
              typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).has("code");
            if (!hasPendingCode) {
              setCurrentUser(null);
              saveStoredUser(null);
              setSessionChecked(true);
            }
            return;
          }
          if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "USER_UPDATED") {
            // Defer so the auth client finishes its own work before we query the profile.
            setTimeout(() => void refresh(), 0);
          }
        } catch (err) {
          console.warn("[AuthGate] onAuthStateChange error:", err);
          if (active) setSessionChecked(true);
        }
      });
      sub = res.data;
    } catch (err) {
      console.warn("[AuthGate] Failed to subscribe to onAuthStateChange:", err);
      if (active) setSessionChecked(true);
    }

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const hasAcquiredInitialGps = useRef(false);

  // Auto-acquire high-accuracy live GPS location strictly ONCE after authentication
  const triggerAutoGpsTracking = useCallback(
    (userName: string) => {
      if (
        hasAcquiredInitialGps.current ||
        (typeof window !== "undefined" &&
          window.sessionStorage?.getItem("agro_initial_gps_done") === "true")
      ) {
        return;
      }
      hasAcquiredInitialGps.current = true;
      try {
        window.sessionStorage?.setItem("agro_initial_gps_done", "true");
      } catch {
        // Ignore sessionStorage errors in restricted browser modes
      }

      if (typeof window === "undefined" || !navigator.geolocation) {
        toast.info(<LocalizedText text={`Welcome, ${userName}`} />, {
          description: (
            <LocalizedText text="Hardware GPS not supported on this device. Manual coordinate entry active." />
          ),
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

        toast.success(<LocalizedText text={`🛰️ GPS Target Lock: ${placeName}`} />, {
          id: "auto-gps-lock",
          description: (
            <LocalizedText
              text={`Live coordinates ${fixedLat}Â°N, ${fixedLon}Â°E (Â±${accuracy}m). Telemetry calibrated.`}
            />
          ),
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
    [onLiveLocationAcquired],
  );

  useEffect(() => {
    if (currentUser && !hasAcquiredInitialGps.current) {
      triggerAutoGpsTracking(currentUser.fullName || currentUser.name || "Farmer");
    }
  }, [currentUser, triggerAutoGpsTracking]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    saveStoredUser(user);
  };

  const handleSignOut = async () => {
    hasAcquiredInitialGps.current = false;
    try {
      window.sessionStorage?.removeItem("agro_initial_gps_done");
    } catch {
      // Ignore sessionStorage errors in restricted browser modes
    }
    await signOut();
    saveStoredUser(null);
    setCurrentUser(null);
    toast.info(<LocalizedText text="Signed out" />);
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    saveStoredUser(updated);
    void saveProfile(updated).then((result) => {
      if (!result.ok) {
        toast.error(<LocalizedText text="Your profile changes could not be saved." />, {
          description: result.error,
        });
      }
    });
  };

  if (!sessionChecked) {
    return <div className="min-h-[100dvh] w-full bg-background" aria-busy="true" />;
  }

  if (!currentUser) {
    return <CosmicAuthPage onSuccess={handleAuthSuccess} />;
  }

  return (
    <>{children({ user: currentUser, onSignOut: handleSignOut, onUpdateUser: handleUpdateUser })}</>
  );
}
