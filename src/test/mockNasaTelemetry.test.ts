import { describe, expect, it } from "vitest";
import { generateTelemetry } from "@/services/mockNasaTelemetry";
import type { TelemetryInput } from "@/types/agroSpace";

const base: TelemetryInput = {
  lat: 13.13,
  lon: 78.13,
  borewellDepth: 60,
  season: "Kharif",
  scenario: "Nominal",
  irrigation: "Borewell",
};

describe("mockNasaTelemetry", () => {
  it("returns identical numbers for identical inputs", () => {
    expect(generateTelemetry(base)).toEqual(generateTelemetry({ ...base }));
  });

  it("recalculates when location changes", () => {
    const a = generateTelemetry(base);
    const b = generateTelemetry({ ...base, lat: 30.9, lon: 75.85 });
    expect(b.power).not.toEqual(a.power);
  });

  it("keeps borewell depth within 2–150 m", () => {
    expect(generateTelemetry({ ...base, borewellDepth: 0 }).input.borewellDepth).toBe(2);
    expect(generateTelemetry({ ...base, borewellDepth: 400 }).input.borewellDepth).toBe(150);
  });

  it("produces 30 days of NASA POWER data", () => {
    expect(generateTelemetry(base).power).toHaveLength(30);
  });

  it("always reports exactly 8 hazard alerts", () => {
    expect(generateTelemetry(base).hazards).toHaveLength(8);
  });

  it("flags the cyclone alert as critical in the Cat-4 Cyclone scenario", () => {
    const t = generateTelemetry({ ...base, scenario: "Cat-4 Cyclone" });
    expect(t.hazards.find((h) => h.type === "cyclone")?.severity).toBe("critical");
  });

  it("flags the seismic alert as critical in the M6.2 Earthquake scenario", () => {
    const t = generateTelemetry({ ...base, scenario: "M6.2 Earthquake" });
    expect(t.hazards.find((h) => h.type === "earthquake")?.severity).toBe("critical");
  });

  it("keeps all six plant-health pillar scores within 0–100", () => {
    const t = generateTelemetry({ ...base, scenario: "Severe Drought" });
    expect(t.plantHealth.pillars).toHaveLength(6);
    for (const p of t.plantHealth.pillars) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it("gives a deeper borewell more yield", () => {
    const shallow = generateTelemetry({ ...base, borewellDepth: 10 }).crop.borewellYieldLph;
    const deep = generateTelemetry({ ...base, borewellDepth: 140 }).crop.borewellYieldLph;
    expect(deep).toBeGreaterThan(shallow);
  });
});
