import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  buildShareableLocationUrl,
  capturePendingUrlCoords,
  clampCoords,
  consumePendingUrlCoords,
  parseUrlCoords,
  peekPendingUrlCoords,
} from "@/utils/preciseLocation";
import { AuthGate } from "@/components/auth/AuthGate";

const getUserMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  MISSING_SUPABASE_ENV_MESSAGE: "",
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      exchangeCodeForSession: vi.fn(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: "aal1", nextLevel: "aal1" },
          error: null,
        }),
      },
    },
  },
}));

vi.mock("@/services/cloudAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/cloudAuth")>();
  return {
    ...actual,
    fetchSignedInProfile: async () => ({
      id: "user-deep-link",
      name: "Kiran",
      fullName: "Kiran Rao",
      email: "kiran@agrospace.io",
      callsign: "ORBIT-7",
      role: "Agronomist",
      avatarColor: "#10B981",
      verified: true,
      preferences: {
        homeBaseName: "Bengaluru",
        homeCoords: { lat: 12.9716, lon: 77.5946 },
        defaultViewMode: "3d",
        defaultActiveLayer: "NDVI",
        units: "metric",
      },
      notifications: {
        cycloneAlerts: true,
        usgsQuakeAlerts: true,
        droughtAlerts: true,
        emailAlerts: true,
      },
    }),
    saveProfile: async () => ({ ok: true }),
    signOut: async () => undefined,
  };
});

describe("URL deep-linking, bounds validation & AuthGate protection", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-deep-link", email: "kiran@agrospace.io" } },
      error: null,
    });
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-deep-link" } } },
      error: null,
    });
  });

  it("parses valid ?lat=47.1988&lon=111.196 and builds clean shareable links", () => {
    expect(parseUrlCoords("?lat=47.1988&lon=111.196")).toEqual({ lat: 47.1988, lon: 111.196 });
    expect(buildShareableLocationUrl(47.1988, 111.196, "https://argospacenexus.vercel.app")).toBe(
      "https://argospacenexus.vercel.app/?lat=47.1988&lon=111.196",
    );
  });

  it("rejects missing, NaN, trailing-garbage, and out-of-bounds URL coordinates without crashing", () => {
    expect(parseUrlCoords("")).toBeNull();
    expect(parseUrlCoords("?lat=47.1988")).toBeNull();
    expect(parseUrlCoords("?lat=NaN&lon=111.196")).toBeNull();
    expect(parseUrlCoords("?lat=47.1988abc&lon=111.196")).toBeNull();
    expect(parseUrlCoords("?lat=95&lon=111.196")).toBeNull();
    expect(parseUrlCoords("?lat=-91&lon=0")).toBeNull();
    expect(parseUrlCoords("?lat=47&lon=181")).toBeNull();
    expect(parseUrlCoords("?lat=47&lon=-185")).toBeNull();
  });

  it("clamps arbitrary internal coordinates safely to valid Earth bounds", () => {
    expect(clampCoords(120, -250)).toEqual({ lat: 90, lon: -180 });
    expect(clampCoords(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      lat: 12.6622,
      lon: 77.4503,
    });
  });

  it("captures and restores pending deep-link coordinates across auth redirects", () => {
    expect(capturePendingUrlCoords("?lat=47.1988&lon=111.196")).toEqual({
      lat: 47.1988,
      lon: 111.196,
    });
    expect(peekPendingUrlCoords()).toEqual({ lat: 47.1988, lon: 111.196 });
    expect(consumePendingUrlCoords()).toEqual({ lat: 47.1988, lon: 111.196 });
    expect(peekPendingUrlCoords()).toBeNull();
  });

  it("does NOT overwrite explicit ?lat=47.1988&lon=111.196 with auto-GPS inside AuthGate", async () => {
    const origLocation = window.location;
    // @ts-expect-error Mocking location for deep-link guard test
    delete window.location;
    (window as unknown as { location: unknown }).location = new URL(
      "https://argospacenexus.vercel.app/?lat=47.1988&lon=111.196",
    );

    const geoSpy = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: geoSpy },
    });

    const onLiveLocationAcquired = vi.fn();
    render(
      <AuthGate onLiveLocationAcquired={onLiveLocationAcquired}>
        {({ user }) => <div>Signed in as {user.email}</div>}
      </AuthGate>,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("kiran@agrospace.io");
    });

    expect(geoSpy).not.toHaveBeenCalled();
    expect(onLiveLocationAcquired).not.toHaveBeenCalled();
    expect(peekPendingUrlCoords()).toEqual({ lat: 47.1988, lon: 111.196 });

    (window as unknown as { location: unknown }).location = origLocation;
  });
});
