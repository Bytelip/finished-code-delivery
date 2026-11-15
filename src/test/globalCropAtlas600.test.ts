import { describe, expect, it } from "vitest";
import {
  GLOBAL_CROP_ATLAS_600,
  INDIA_ZONES,
  WORLD_REGIONS,
  resolveAgroZoneAndWorldRegion,
  evaluateCrop600Suitability,
  getCropSuitabilityColor,
} from "@/data/globalCropAtlas600";

describe("Global Crop Suitability Atlas: 600-Crop Engine & Geospatial Resolver", () => {
  it("contains exactly 600 crops across all 14 sections of the Atlas", () => {
    expect(GLOBAL_CROP_ATLAS_600.length).toBe(600);

    const sections = new Set(GLOBAL_CROP_ATLAS_600.map((c) => c.section));
    expect(sections.has("Cereal & Millet")).toBe(true);
    expect(sections.has("Pulse")).toBe(true);
    expect(sections.has("Oilseed")).toBe(true);
    expect(sections.has("Root & Tuber")).toBe(true);
    expect(sections.has("Sugar Crop")).toBe(true);
    expect(sections.has("Fibre Crop")).toBe(true);
    expect(sections.has("Vegetable")).toBe(true);
    expect(sections.has("Fruit")).toBe(true);
    expect(sections.has("Nut")).toBe(true);
    expect(sections.has("Spice & Herb")).toBe(true);
    expect(sections.has("Plantation & Beverage")).toBe(true);
    expect(sections.has("Fodder & Forage")).toBe(true);
    expect(sections.has("Medicinal & Aromatic")).toBe(true);
    expect(sections.has("Flower & Ornamental")).toBe(true);
    expect(sections.has("Tree & Agroforestry")).toBe(true);

    // Verify all 11 India Zones and 20 World Regions exist
    expect(Object.keys(INDIA_ZONES).length).toBe(11);
    expect(WORLD_REGIONS.length).toBe(20);
  });

  it("verifies exact 5-factor baseline scores for key benchmark crops", () => {
    const amaranth = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "grain-amaranth")!;
    expect(amaranth).toBeDefined();
    expect(amaranth.baseScore).toBe(67.8); // 68%

    const ragi = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "finger-millet-ragi")!;
    expect(ragi).toBeDefined();
    expect(ragi.baseScore).toBe(63.6); // 64%

    const bajra = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "pearl-millet-bajra")!;
    expect(bajra).toBeDefined();
    expect(bajra.baseScore).toBe(63.2); // 63%

    const jowar = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "sorghum-jowar")!;
    expect(jowar).toBeDefined();
    expect(jowar.baseScore).toBe(63.2); // 63%

    const rice = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "rice-paddy")!;
    expect(rice).toBeDefined();
    expect(rice.baseScore).toBe(52); // 52%

    const sugarcane = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "sugarcane")!;
    expect(sugarcane).toBeDefined();
    expect(sugarcane.baseScore).toBe(35); // 35%

    const horseGram = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "horse-gram")!;
    expect(horseGram).toBeDefined();
    expect(horseGram.baseScore).toBe(63.2); // 63%

    const neem = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "neem")!;
    expect(neem).toBeDefined();
    expect(neem.baseScore).toBe(69); // 69%

    const oysterMushroom = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "oyster-mushroom")!;
    expect(oysterMushroom).toBeDefined();
    expect(oysterMushroom.isIndoorControlled).toBe(true);
    expect(oysterMushroom.baseScore).toBe(83); // 83%
  });

  it("resolves Kolar, Harohalli & Bengaluru to Zone DEC (Deccan Plateau) and South Asia", () => {
    // Harohalli, Karnataka (12.6622°N, 77.4503°E, 750m ASL)
    const harohalli = resolveAgroZoneAndWorldRegion(12.6622, 77.4503, "Karnataka", "India", 750);
    expect(harohalli.indiaZone).toBe("DEC");
    expect(harohalli.worldRegion).toBe("South Asia");
    expect(harohalli.isUplandPlateau).toBe(true);
    expect(harohalli.zoneDisplay).toContain("Zone: DEC");

    // Coastal Karnataka Mangaluru (12.9141°N, 74.8560°E, 20m ASL) -> Zone SOU
    const mangaluru = resolveAgroZoneAndWorldRegion(12.9141, 74.80, "Coastal Karnataka", "India", 20);
    expect(mangaluru.indiaZone).toBe("SOU");

    // International: California, USA (37.77, -122.41)
    const usa = resolveAgroZoneAndWorldRegion(37.77, -122.41, "California", "United States", 50);
    expect(usa.indiaZone).toBeNull();
    expect(usa.worldRegion).toBe("North America");
  });

  it("dynamically modulates scores under water deficit and penalizes thirsty crops", () => {
    const sugarcane = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "sugarcane")!;
    const horseGram = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "horse-gram")!;

    // Scenario: Severe water deficit on Deccan plateau (moisture 20%, borewell 90m, ESI 0.50, elev 800m)
    const ctx = {
      smapMoisture: 20,
      borewellDepthM: 90,
      ecostressESI: 0.5,
      elevationM: 800,
      isDrought: true,
      indiaZone: "DEC" as const,
    };

    const evalSugarcane = evaluateCrop600Suitability(sugarcane, ctx);
    expect(evalSugarcane.hardFilterViolation).toBe(true);
    expect(evalSugarcane.suitabilityTier).toBe("UNSUITABLE / HIGH RISK");
    expect(evalSugarcane.hardFilterMessage).toContain("CRITICAL WATER DEFICIT");
    expect(evalSugarcane.adjustedScore).toBeLessThanOrEqual(20);

    const evalHorseGram = evaluateCrop600Suitability(horseGram, ctx);
    expect(evalHorseGram.hardFilterViolation).toBe(false);
    expect(evalHorseGram.adjustedScore).toBeGreaterThanOrEqual(70);
    expect(["FAVOURABLE / HIGH", "OPTIMAL / VERY HIGH"]).toContain(evalHorseGram.suitabilityTier);
  });

  it("filters out aquatic/marine crops on upland plateau (elevation > 150m)", () => {
    const seaweed = GLOBAL_CROP_ATLAS_600.find((c) => c.id === "seaweed-gracilaria")!;
    expect(seaweed.isAquatic).toBe(true);

    const evaluated = evaluateCrop600Suitability(seaweed, {
      elevationM: 820,
      indiaZone: "DEC",
    });

    expect(evaluated.hardFilterViolation).toBe(true);
    expect(evaluated.suitabilityTier).toBe("UNSUITABLE / HIGH RISK");
    expect(evaluated.hardFilterMessage).toContain("Aquatic / wetland crop infeasible on upland plateau");
  });

  it("matches the 4-tier color code legend from the Atlas PDF", () => {
    expect(getCropSuitabilityColor(85).hex).toBe("#10B981");
    expect(getCropSuitabilityColor(65).hex).toBe("#84CC16");
    expect(getCropSuitabilityColor(45).hex).toBe("#F59E0B");
    expect(getCropSuitabilityColor(25).hex).toBe("#EF4444");
  });
});
