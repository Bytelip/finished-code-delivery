import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isInsecureLanContext,
  fetchIpLocation,
  resolvePreciseLocation,
  searchNominatimPlaces,
  searchDualProviderPlaces,
  reverseGeocodeAndElevation,
  computeKoppenClimateZone,
  getStoredLocation,
  saveStoredLocation,
  getUrlCoords,
  syncUrlCoords,
  SAVED_LOCATION_KEY,
} from "@/utils/preciseLocation";

describe("preciseLocation utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isInsecureLanContext", () => {
    it("returns false for localhost and 127.0.0.1", () => {
      // JSDOM runs on localhost by default
      expect(isInsecureLanContext()).toBe(false);
    });
  });

  describe("localStorage and URL query sync", () => {
    it("stores and retrieves saved farm location", () => {
      expect(getStoredLocation()).toBeNull();

      saveStoredLocation(12.3456, 76.5432, "My Farm");
      const stored = getStoredLocation();
      expect(stored).toEqual({
        lat: 12.3456,
        lon: 76.5432,
        label: "My Farm",
      });
    });

    it("parses valid coordinates from URL query parameters", () => {
      const origLocation = window.location;
      // @ts-expect-error Mocking window.location for test
      delete window.location;
      window.location = new URL(
        "http://localhost:8080/?lat=15.1234&lon=77.5678",
      ) as unknown as Location;

      const coords = getUrlCoords();
      expect(coords).toEqual({ lat: 15.1234, lon: 77.5678 });

      window.location = origLocation;
    });

    it("synchronizes coordinates into URL parameters via history.replaceState", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");
      syncUrlCoords(14.5, 75.8);

      expect(replaceStateSpy).toHaveBeenCalled();
      const calledUrl = replaceStateSpy.mock.calls[0][2] as string;
      expect(calledUrl).toContain("lat=14.5");
      expect(calledUrl).toContain("lon=75.8");
    });
  });

  describe("fetchIpLocation", () => {
    it("successfully falls back to ipwho.is", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          latitude: 12.9716,
          longitude: 77.5946,
          city: "Bengaluru",
          region: "Karnataka",
          country: "India",
        }),
      });
      global.fetch = mockFetch;

      const res = await fetchIpLocation();
      expect(res.lat).toBe(12.9716);
      expect(res.lon).toBe(77.5946);
      expect(res.source).toBe("ip-fallback");
      expect(res.city).toBe("Bengaluru");
    });
  });

  describe("resolvePreciseLocation", () => {
    it("acquires high-accuracy position and finishes early if accuracy <= 30m", async () => {
      let watchCallback: ((pos: GeolocationPosition) => void) | null = null;

      const mockGeolocation = {
        watchPosition: vi.fn((success) => {
          watchCallback = success;
          // Simulate GPS returning an accurate position
          setTimeout(() => {
            if (watchCallback) {
              watchCallback({
                coords: {
                  latitude: 13.1234,
                  longitude: 78.5678,
                  accuracy: 18, // <= 30m target accuracy
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              });
            }
          }, 10);
          return 1;
        }),
        clearWatch: vi.fn(),
      };

      Object.defineProperty(navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      const res = await resolvePreciseLocation({ sampleDurationMs: 1000, targetAccuracyM: 30 });
      expect(res.lat).toBe(13.1234);
      expect(res.lon).toBe(78.5678);
      expect(res.accuracy).toBe(18);
      expect(res.source).toBe("gps-high-accuracy");
      expect(mockGeolocation.clearWatch).toHaveBeenCalled();
    });

    it("flags coarse laptop Wi-Fi/IP location if accuracy > 1500m", async () => {
      let watchCallback: ((pos: GeolocationPosition) => void) | null = null;

      const mockGeolocation = {
        watchPosition: vi.fn((success) => {
          watchCallback = success;
          setTimeout(() => {
            if (watchCallback) {
              watchCallback({
                coords: {
                  latitude: 28.6139,
                  longitude: 77.209,
                  accuracy: 25000, // Coarse ISP hub 25km away
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              });
            }
          }, 10);
          return 1;
        }),
        clearWatch: vi.fn(),
      };

      Object.defineProperty(navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });

      const res = await resolvePreciseLocation({ sampleDurationMs: 100 });
      expect(res.isCoarse).toBe(true);
      expect(res.warning).toContain("Laptop Wi-Fi/IP location is coarse");
    });
  });

  describe("searchNominatimPlaces", () => {
    it("queries OpenStreetMap Nominatim and parses structured place results", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            place_id: 12345,
            display_name: "Kolar, Kolar District, Karnataka, 563101, India",
            lat: "13.1367",
            lon: "78.1292",
            type: "town",
            address: {
              town: "Kolar",
              state: "Karnataka",
              postcode: "563101",
              country: "India",
            },
          },
        ],
      });
      global.fetch = mockFetch;

      const places = await searchNominatimPlaces("Kolar");
      expect(places.length).toBe(1);
      expect(places[0].shortName).toBe("Kolar");
      expect(places[0].lat).toBe(13.1367);
      expect(places[0].lon).toBe(78.1292);
      expect(places[0].displayName).toContain("563101");
    });
  });

  describe("searchDualProviderPlaces", () => {
    it("queries Open-Meteo as primary and formats results", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 1277333,
              name: "Bengaluru",
              latitude: 12.97194,
              longitude: 77.59369,
              elevation: 920,
              admin1: "Karnataka",
              country: "India",
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const places = await searchDualProviderPlaces("Bengaluru");
      expect(places.length).toBe(1);
      expect(places[0].name).toBe("Bengaluru");
      expect(places[0].subtitle).toContain("Karnataka, India");
      expect(places[0].lat).toBe(12.9719);
      expect(places[0].lon).toBe(77.5937);
      expect(places[0].source).toBe("open-meteo");
    });

    it("falls back to Nominatim if Open-Meteo returns no results", async () => {
      const mockFetch = vi
        .fn()
        // Call 1: Open-Meteo returns no results
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        })
        // Call 2: Nominatim returns a result
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              place_id: 999,
              display_name: "Chintamani, Chikkaballapura, Karnataka, India",
              lat: "13.4000",
              lon: "78.0500",
              address: {
                town: "Chintamani",
                state: "Karnataka",
                country: "India",
              },
            },
          ],
        });
      global.fetch = mockFetch;

      const places = await searchDualProviderPlaces("Chintamani");
      expect(places.length).toBe(1);
      expect(places[0].name).toBe("Chintamani");
      expect(places[0].source).toBe("nominatim");
    });
  });

  describe("reverseGeocodeAndElevation", () => {
    it("returns dynamic reverse geocode label, elevation, and Köppen climate zone", async () => {
      const mockFetch = vi
        .fn()
        // Call 1: Nominatim reverse
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_name: "Bengaluru, Bangalore Urban, Karnataka, India",
            address: {
              city: "Bengaluru",
              state: "Karnataka",
              country: "India",
            },
          }),
        })
        // Call 2: Open-Meteo elevation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            elevation: [918.5],
          }),
        });
      global.fetch = mockFetch;

      const res = await reverseGeocodeAndElevation(12.9719, 77.5937);
      expect(res.label).toBe("Bengaluru, Karnataka");
      expect(res.elevationM).toBe(919);
      expect(res.zone).toBeDefined();
    });
  });

  describe("computeKoppenClimateZone", () => {
    it("classifies tropical vs temperate vs arid zones accurately", () => {
      // Near equator
      expect(computeKoppenClimateZone(0, 20)).toMatch(/Tropical/i);
      // Sahara / Arabian desert
      expect(computeKoppenClimateZone(25, 45)).toMatch(/Arid/i);
      // High latitude
      expect(computeKoppenClimateZone(65, 10)).toMatch(/boreal/i);
    });
  });
});
