import { describe, expect, it, vi } from "vitest";
import {
  haversineKm,
  fetchLiveTelemetry,
  fetchSpaceWeather,
  fetchUsgsEarthquakes,
} from "@/services/nasaLiveApiService";
import type { TelemetryInput } from "@/types/agroSpace";

const testInput: TelemetryInput = {
  lat: 13.13,
  lon: 78.13,
  borewellDepth: 60,
  season: "Kharif",
  scenario: "Nominal",
  irrigation: "Borewell",
};

describe("nasaLiveApiService", () => {
  it("computes accurate Haversine distances in km", () => {
    // Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) is approx 343 km
    const dist = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(330);
    expect(dist).toBeLessThan(360);
  });

  it("calculates 0 km distance for identical coordinates", () => {
    expect(haversineKm(13.13, 78.13, 13.13, 78.13)).toBe(0);
  });

  it("gracefully returns valid AgroTelemetry contract even when all network fetches fail or offline", async () => {
    // Mock global fetch to reject
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    try {
      const { telemetry, status } = await fetchLiveTelemetry(testInput);

      expect(telemetry).toBeDefined();
      expect(telemetry.input.lat).toBe(13.13);
      expect(telemetry.input.lon).toBe(78.13);
      expect(telemetry.power).toHaveLength(30);
      expect(telemetry.hazards).toHaveLength(8);
      expect(telemetry.plantHealth.pillars).toHaveLength(6);
      expect(status.isLive).toBe(false);
      expect(status.failedFeeds.length).toBeGreaterThan(0);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("correctly integrates live USGS earthquake data into hazards", async () => {
    const originalFetch = global.fetch;
    // Mock USGS earthquake response
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("earthquake.usgs.gov")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            features: [
              {
                properties: { mag: 6.3, place: "80km NE of Kolar", time: Date.now() },
                geometry: { coordinates: [78.5, 13.5, 15] },
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Other API unavailable"));
    });

    try {
      const { telemetry, status } = await fetchLiveTelemetry(testInput);
      expect(status.activeFeeds).toContain("USGS ComCat");
      const quakeAlert = telemetry.hazards.find((h) => h.type === "earthquake");
      expect(quakeAlert).toBeDefined();
      expect(quakeAlert?.severity).toBe("critical");
      expect(quakeAlert?.metric).toContain("M6.3");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("correctly updates plant health NDVI from live MODIS subset data", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("modis.ornl.gov")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            subset: [
              {
                band: "250m_16_days_NDVI",
                scale: 0.0001,
                data: [6500, 7200],
              },
              {
                band: "250m_16_days_EVI",
                scale: 0.0001,
                data: [4200, 4800],
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Other API down"));
    });

    try {
      const { telemetry, status } = await fetchLiveTelemetry(testInput);
      expect(status.activeFeeds).toContain("ORNL DAAC MODIS");
      expect(telemetry.layers.NDVI.value).toBe(0.72);
      expect(telemetry.layers.EVI.value).toBe(0.48);
      const ndviPillar = telemetry.plantHealth.pillars.find((p) => p.key === "ndvi");
      expect(ndviPillar?.note).toContain("NDVI 0.72");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
