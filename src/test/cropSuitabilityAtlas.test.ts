import { describe, expect, it } from "vitest";
import {
  calculate5FactorScore,
  CROP_SUITABILITY_ATLAS,
  detectAgroClimaticZone,
  evaluateCropSuitability,
  generateSustainableRotationPlan,
} from "@/data/cropSuitabilityAtlas";

describe("Field Shift: Crop Suitability Atlas & Scoring Model", () => {
  it("calculates exact 5-factor scores matching the Field Shift Atlas formula", () => {
    // Formula: (Water * 0.26) + (Soil * 0.22) + (Terrain * 0.14) + (Climate * 0.23) + (Economics * 0.15)
    const bajra = CROP_SUITABILITY_ATLAS.find((c) => c.id === "pearl-millet");
    expect(bajra).toBeDefined();
    expect(calculate5FactorScore(bajra!.factors)).toBe(87.7);

    const jowar = CROP_SUITABILITY_ATLAS.find((c) => c.id === "sorghum");
    expect(jowar).toBeDefined();
    expect(calculate5FactorScore(jowar!.factors)).toBe(87.5);

    const ragi = CROP_SUITABILITY_ATLAS.find((c) => c.id === "finger-millet");
    expect(ragi).toBeDefined();
    expect(calculate5FactorScore(ragi!.factors)).toBe(84.9);

    const rice = CROP_SUITABILITY_ATLAS.find((c) => c.id === "rice");
    expect(rice).toBeDefined();
    expect(rice!.baseScore).toBe(56.6);
    expect([56.6, 56.7]).toContain(calculate5FactorScore(rice!.factors));

    const sugarcane = CROP_SUITABILITY_ATLAS.find((c) => c.id === "sugarcane");
    expect(sugarcane).toBeDefined();
    expect(calculate5FactorScore(sugarcane!.factors)).toBe(55.8);

    const tomato = CROP_SUITABILITY_ATLAS.find((c) => c.id === "tomato");
    expect(tomato).toBeDefined();
    expect(calculate5FactorScore(tomato!.factors)).toBe(63.2);
  });

  it("detects Zone 10: Southern Plateau & Hills for Kolar Plateau, Karnataka", () => {
    const zone = detectAgroClimaticZone(13.175, 78.4192);
    expect(zone.zoneNumber).toBe(10);
    expect(zone.name).toBe("Southern Plateau & Hills");
    expect(zone.statesCovered.some((s) => s.includes("Karnataka"))).toBe(true);
  });

  it("triggers Hard Feasibility Filter for high-water crops during severe drought", () => {
    const zone = detectAgroClimaticZone(13.175, 78.4192);
    const sugarcane = CROP_SUITABILITY_ATLAS.find((c) => c.id === "sugarcane")!;
    const ragi = CROP_SUITABILITY_ATLAS.find((c) => c.id === "finger-millet")!;

    // Scenario: Severe Drought (moisture = 18%)
    const evaluatedSugarcane = evaluateCropSuitability(sugarcane, zone, {
      smapMoisture: 18,
      isDrought: true,
      scenario: "Severe Drought",
    });

    expect(evaluatedSugarcane.hardFilterViolation).toBe(true);
    expect(evaluatedSugarcane.suitabilityTier).toBe("LOW / INFEASIBLE");
    expect(evaluatedSugarcane.hardFilterMessage).toContain("INFEASIBLE WATER BUDGET");

    // Ragi should be boosted and remain Very High suitability
    const evaluatedRagi = evaluateCropSuitability(ragi, zone, {
      smapMoisture: 18,
      isDrought: true,
      scenario: "Severe Drought",
    });

    expect(evaluatedRagi.hardFilterViolation).toBe(false);
    expect(evaluatedRagi.adjustedScore).toBeGreaterThanOrEqual(85);
    expect(evaluatedRagi.suitabilityTier).toBe("VERY HIGH");
  });

  it("generates sustainable 3-season crop rotation plan for Zone 10", () => {
    const zone = detectAgroClimaticZone(13.175, 78.4192);
    const rotation = generateSustainableRotationPlan(zone);

    expect(rotation.zoneName).toBe("Southern Plateau & Hills");
    expect(rotation.kharif.crop).toContain("Finger Millet (Ragi)");
    expect(rotation.rabi.crop).toContain("Horse Gram");
    expect(rotation.zaid.crop).toContain("Green Gram");
    expect(rotation.totalWaterMm).toBeLessThan(1000);
    expect(rotation.waterSavedMmVsRiceSugarcane).toBeGreaterThanOrEqual(1000);
  });
});
