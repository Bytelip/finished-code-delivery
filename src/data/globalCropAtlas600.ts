/**
 * Global Crop Suitability Atlas: Complete 600-Crop Agro-Ecological Engine
 * Standardized across 14 Sections, 11 India Zones (Appendix C), and 20 World Regions (Appendix B).
 *
 * Scoring Model:
 * Baseline 5-Factor Score = (Water + Soil + Terrain + Climate + Economics) / 5
 * Dynamic NASA/Open-Meteo Score combines baseline with live SMAP soil moisture, GPM rainfall,
 * borewell groundwater depth, ECOSTRESS ESI, and upland terrain calibration.
 */

export type IndiaZoneCode =
  | "HIM"
  | "NW"
  | "IGP"
  | "EST"
  | "NE"
  | "CEN"
  | "ARD"
  | "WST"
  | "DEC"
  | "SOU"
  | "ISL";

export type WorldRegionCode =
  | "South Asia"
  | "Southeast Asia"
  | "East Asia"
  | "Central Asia"
  | "West Asia"
  | "North Africa"
  | "West Africa"
  | "Central Africa"
  | "East Africa"
  | "Southern Africa"
  | "Northern Europe"
  | "Western Europe"
  | "Mediterranean Europe"
  | "Eastern Europe"
  | "North America"
  | "Central America & Mexico"
  | "Caribbean"
  | "Tropical South America"
  | "Southern Cone (S. America)"
  | "Oceania";

export interface IndiaZoneInfo {
  code: IndiaZoneCode;
  name: string;
  regionalDescription: string;
  states: string[];
}

export const INDIA_ZONES: Record<IndiaZoneCode, IndiaZoneInfo> = {
  HIM: {
    code: "HIM",
    name: "Western & Central Himalayas",
    regionalDescription: "Cold alpine & sub-temperate valleys; skeletal hill soils",
    states: ["Jammu & Kashmir", "Ladakh", "Himachal Pradesh", "Uttarakhand"],
  },
  NW: {
    code: "NW",
    name: "Northwestern Semi-Arid Plains",
    regionalDescription: "High-yield alluvial plains; groundwater stress",
    states: ["Punjab", "Haryana", "Delhi", "Western Uttar Pradesh"],
  },
  IGP: {
    code: "IGP",
    name: "Indo-Gangetic Alluvial Basin",
    regionalDescription: "Sub-humid to humid fertile alluvial plains",
    states: ["Uttar Pradesh", "Bihar"],
  },
  EST: {
    code: "EST",
    name: "Eastern Plateau & Coastal Delta",
    regionalDescription: "Undulating red/laterite soils; high monsoon rainfall",
    states: ["West Bengal", "Odisha", "Jharkhand"],
  },
  NE: {
    code: "NE",
    name: "Northeastern Hills & Brahmaputra",
    regionalDescription: "Hyper-humid montane rainforest; acidic loams",
    states: [
      "Assam",
      "Arunachal Pradesh",
      "Meghalaya",
      "Manipur",
      "Mizoram",
      "Nagaland",
      "Tripura",
      "Sikkim",
    ],
  },
  CEN: {
    code: "CEN",
    name: "Central Plateau & Vindhyan Hills",
    regionalDescription: "Semi-arid plateau with mixed red-and-black soils",
    states: ["Madhya Pradesh", "Chhattisgarh"],
  },
  ARD: {
    code: "ARD",
    name: "Arid Thar Desert & Kutch",
    regionalDescription: "Extreme desert sandy dunes; ephemeral rainfall (<400mm)",
    states: ["Rajasthan", "Kutch (Gujarat)"],
  },
  WST: {
    code: "WST",
    name: "Western Deccan Traps & Coast",
    regionalDescription: "Deep vertisols / black cotton soils and coastal plains",
    states: ["Maharashtra", "Gujarat", "Goa"],
  },
  DEC: {
    code: "DEC",
    name: "Deccan Plateau & Interior Peninsula",
    regionalDescription:
      "Hard-rock granite/gneiss plateau; severe borewell depletion; red alfisols",
    states: [
      "Karnataka (Interior: Kolar, Mulabagilu, Harohalli, Bengaluru, Mysuru)",
      "Telangana",
      "Andhra Pradesh (Rayalaseema)",
    ],
  },
  SOU: {
    code: "SOU",
    name: "Southern Coastal & Peninsular Tip",
    regionalDescription: "Tropical maritime and humid coastal ghats; laterite soils",
    states: ["Kerala", "Tamil Nadu", "Coastal Karnataka (Mangaluru/Udupi)", "Puducherry"],
  },
  ISL: {
    code: "ISL",
    name: "Tropical Island Archipelagos",
    regionalDescription: "Equatorial humid maritime; coral sandy soils",
    states: ["Andaman & Nicobar", "Lakshadweep"],
  },
};

export const WORLD_REGIONS: WorldRegionCode[] = [
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "Central Asia",
  "West Asia",
  "North Africa",
  "West Africa",
  "Central Africa",
  "East Africa",
  "Southern Africa",
  "Northern Europe",
  "Western Europe",
  "Mediterranean Europe",
  "Eastern Europe",
  "North America",
  "Central America & Mexico",
  "Caribbean",
  "Tropical South America",
  "Southern Cone (S. America)",
  "Oceania",
];

export interface ResolvedRegion {
  indiaZone: IndiaZoneCode | null;
  worldRegion: WorldRegionCode;
  zoneInfo: IndiaZoneInfo | null;
  zoneDisplay: string;
  isCoastal: boolean;
  isUplandPlateau: boolean;
  elevationM: number;
}

/**
 * Maps any [lat, lon], reverse-geocoded state/country, and elevation to the 11 India Zones (Appendix C)
 * and 20 World Regions (Appendix B).
 */
export function resolveAgroZoneAndWorldRegion(
  lat: number,
  lon: number,
  stateName?: string,
  countryName?: string,
  elevationM: number = 500,
): ResolvedRegion {
  const isIndia =
    countryName?.toLowerCase().includes("india") ||
    (!countryName && lat >= 6.5 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5);

  let worldRegion: WorldRegionCode = "South Asia";

  if (!isIndia) {
    if (lat >= -55 && lat <= 12 && lon >= -85 && lon <= -34) {
      worldRegion = lat < -22 ? "Southern Cone (S. America)" : "Tropical South America";
    } else if (lat >= 10 && lat <= 25 && lon >= -90 && lon <= -60) {
      worldRegion = "Caribbean";
    } else if (lat >= 7 && lat <= 33 && lon >= -118 && lon <= -77) {
      worldRegion = "Central America & Mexico";
    } else if (lat >= 25 && lat <= 75 && lon >= -170 && lon <= -50) {
      worldRegion = "North America";
    } else if (lat >= 35 && lat <= 72 && lon >= -10 && lon <= 40) {
      if (lat >= 55) worldRegion = "Northern Europe";
      else if (lat < 44 && lon < 25) worldRegion = "Mediterranean Europe";
      else if (lon >= 15) worldRegion = "Eastern Europe";
      else worldRegion = "Western Europe";
    } else if (lat >= 35 && lat <= 75 && lon >= 40 && lon <= 180) {
      worldRegion = lon < 85 ? "Central Asia" : "East Asia";
    } else if (lat >= 12 && lat <= 42 && lon >= 34 && lon <= 65) {
      worldRegion = "West Asia";
    } else if (lat >= -35 && lat <= 38 && lon >= -20 && lon <= 55) {
      if (lat >= 20) worldRegion = "North Africa";
      else if (lat < -15) worldRegion = "Southern Africa";
      else if (lon < 15) worldRegion = "West Africa";
      else if (lon < 30) worldRegion = "Central Africa";
      else worldRegion = "East Africa";
    } else if (lat >= -12 && lat <= 28 && lon >= 92 && lon <= 142) {
      worldRegion = "Southeast Asia";
    } else if (lat >= -50 && lat <= 0 && lon >= 110 && lon <= 180) {
      worldRegion = "Oceania";
    }
  }

  if (!isIndia) {
    return {
      indiaZone: null,
      worldRegion,
      zoneInfo: null,
      zoneDisplay: worldRegion,
      isCoastal: elevationM < 100,
      isUplandPlateau: elevationM >= 600,
      elevationM,
    };
  }

  const s = (stateName || "").toLowerCase();
  let code: IndiaZoneCode = "DEC";

  if (s.includes("karnataka")) {
    if ((lon < 74.85 && lat < 15.2) || s.includes("mangaluru") || s.includes("udupi") || s.includes("karwar")) {
      code = "SOU";
    } else {
      code = "DEC";
    }
  } else if (s.includes("kerala") || s.includes("tamil nadu") || s.includes("puducherry")) {
    code = "SOU";
  } else if (s.includes("telangana") || s.includes("andhra pradesh")) {
    code = "DEC";
  } else if (s.includes("maharashtra") || s.includes("goa")) {
    code = "WST";
  } else if (s.includes("gujarat")) {
    code = (lon < 71.0 && lat > 22.8) || s.includes("kutch") ? "ARD" : "WST";
  } else if (s.includes("rajasthan")) {
    code = "ARD";
  } else if (s.includes("madhya pradesh") || s.includes("chhattisgarh")) {
    code = "CEN";
  } else if (s.includes("punjab") || s.includes("haryana") || s.includes("delhi") || s.includes("chandigarh")) {
    code = "NW";
  } else if (s.includes("uttar pradesh")) {
    code = (lon < 78.5 && lat > 27.5) ? "NW" : "IGP";
  } else if (s.includes("bihar")) {
    code = "IGP";
  } else if (s.includes("west bengal") || s.includes("odisha") || s.includes("jharkhand")) {
    code = "EST";
  } else if (
    s.includes("assam") ||
    s.includes("meghalaya") ||
    s.includes("manipur") ||
    s.includes("mizoram") ||
    s.includes("nagaland") ||
    s.includes("tripura") ||
    s.includes("arunachal") ||
    s.includes("sikkim")
  ) {
    code = "NE";
  } else if (
    s.includes("jammu") ||
    s.includes("kashmir") ||
    s.includes("ladakh") ||
    s.includes("himachal") ||
    s.includes("uttarakhand")
  ) {
    code = "HIM";
  } else if (s.includes("andaman") || s.includes("nicobar") || s.includes("lakshadweep")) {
    code = "ISL";
  } else {
    // Coordinate bounding box fallback
    if (lat < 14.0 && (lon > 92.0 || lon < 74.0)) code = "ISL";
    else if (lat > 29.5 && lon < 81.0) code = "HIM";
    else if (lat >= 28.0 && lat <= 32.5 && lon >= 74.0 && lon < 78.2) code = "NW";
    else if (lat >= 23.5 && lat <= 30.5 && lon >= 69.5 && lon < 76.5) code = "ARD";
    else if (lon >= 88.5 && lat >= 21.5) code = "NE";
    else if (lat >= 19.0 && lat <= 27.5 && lon >= 83.5 && lon <= 88.5) code = "EST";
    else if (lat >= 24.5 && lat <= 28.5 && lon >= 78.2 && lon <= 88.0) code = "IGP";
    else if (lat >= 21.0 && lat <= 26.5 && lon >= 74.0 && lon <= 84.0) code = "CEN";
    else if (lat >= 15.0 && lat <= 24.0 && lon >= 72.0 && lon <= 78.0) code = "WST";
    else if ((lat < 13.5 && lon >= 75.0 && lon <= 80.5) || (lon < 75.0 && lat < 16.0)) code = "SOU";
    else code = "DEC";
  }

  const zoneInfo = INDIA_ZONES[code];
  const isCoastal = code === "ISL" || code === "SOU" || (code === "WST" && lon < 73.5) || (code === "EST" && lon > 86.5);
  const isUplandPlateau = elevationM >= 600 && (code === "DEC" || code === "CEN" || code === "WST");

  return {
    indiaZone: code,
    worldRegion: "South Asia",
    zoneInfo,
    zoneDisplay: `Zone: ${code} • ${zoneInfo.name}`,
    isCoastal,
    isUplandPlateau,
    elevationM,
  };
}

export type Crop600Category =
  | "All Open-Field"
  | "Cereals & Millets"
  | "Pulses"
  | "Oilseeds"
  | "Vegetables & Fruits"
  | "Spices & Medicinal"
  | "Agroforestry"
  | "Controlled / Mushrooms";

export interface CropAtlas600Entry {
  id: string;
  name: string;
  botanicalName: string;
  section: string;
  category: Crop600Category;
  season: "Kharif" | "Rabi" | "Zaid" | "Perennial" | "Multi-season";
  durationDays: string;
  waterRequirementMm: number;
  factors: {
    water: number;
    soil: number;
    terrain: number;
    climate: number;
    economics: number;
  };
  baseScore: number;
  indiaZones: string[];
  worldRegions: WorldRegionCode[];
  commercialInIndia: boolean;
  isIndoorControlled: boolean;
  isAquatic: boolean;
  droughtTolerance: "High" | "Moderate" | "Low";
  agronomicNotes: string;
}

export interface LiveTelemetryContext600 {
  smapMoisture?: number; // % volume
  gpmRainMm?: number; // mm/mo
  borewellDepthM?: number; // meters
  ecostressESI?: number; // 0-1
  elevationM?: number; // meters ASL
  isDrought?: boolean;
  scenario?: string;
  indiaZone?: IndiaZoneCode | null;
  worldRegion?: WorldRegionCode;
  showExperimental?: boolean;
}

export interface EvaluatedCrop600 extends CropAtlas600Entry {
  adjustedScore: number;
  suitabilityTier: "OPTIMAL / VERY HIGH" | "FAVOURABLE / HIGH" | "MODERATE / CONDITIONAL" | "UNSUITABLE / HIGH RISK";
  hardFilterViolation: boolean;
  hardFilterMessage?: string | undefined;
  tierColorHex: string;
  tierBadgeClass: string;
  waterWeightPct: number;
}

/**
 * Dynamic NASA Satellite + Open-Meteo Prediction Modulation Formula
 */
export function evaluateCrop600Suitability(
  crop: CropAtlas600Entry,
  ctx: LiveTelemetryContext600 = {},
): EvaluatedCrop600 {
  let score = crop.baseScore;
  let hardFilterViolation = false;
  let hardFilterMessage: string | undefined = undefined;

  const moisture = ctx.smapMoisture ?? 32;
  const borewell = ctx.borewellDepthM ?? 60;
  const esi = ctx.ecostressESI ?? 0.74;
  const elevation = ctx.elevationM ?? 500;
  const isDrought = ctx.isDrought || ctx.scenario === "Severe Drought" || moisture < 28 || esi < 0.75;
  const isDeepBorewell = borewell > 50;

  let waterWeight = 20;

  // 1. Water-Use Dynamic Weighting
  if (isDrought || isDeepBorewell) {
    waterWeight = 35; // Boost weight to 35%
    if (crop.factors.water < 45) {
      // Penalize thirsty crops (-15 to -25 points)
      const penalty = 15 + Math.round(((45 - crop.factors.water) / 45) * 10);
      score -= penalty;
      hardFilterViolation = true;
      hardFilterMessage = `⚠️ CRITICAL WATER DEFICIT: Requires ${crop.waterRequirementMm}mm water; SMAP moisture at ${moisture.toFixed(0)}% vol.`;
    } else if (crop.factors.water >= 78) {
      // Boost drought-hardy crops (+4 to +8 points)
      const boost = 4 + Math.round(((crop.factors.water - 78) / 22) * 4);
      score += boost;
    }
  }

  // 2. Terrain & Altitude Calibration
  if (elevation >= 650 && elevation <= 1100) {
    if (crop.factors.terrain >= 35) {
      const terrainBoost = 3 + Math.round(((crop.factors.terrain - 35) / 65) * 2);
      score += terrainBoost;
    }
  }

  // 3. Regional Zone Compatibility
  if (ctx.indiaZone) {
    if (!crop.commercialInIndia) {
      if (!ctx.showExperimental) {
        hardFilterViolation = true;
        hardFilterMessage = "Not commercially grown in India (Global / Experimental crop).";
        score -= 25;
      }
    } else if (
      crop.indiaZones.length > 0 &&
      !crop.indiaZones.includes("ALL") &&
      !crop.indiaZones.includes(ctx.indiaZone)
    ) {
      if (!ctx.showExperimental) {
        hardFilterViolation = true;
        hardFilterMessage = `Not adapted to Zone: ${ctx.indiaZone} (${INDIA_ZONES[ctx.indiaZone]?.name || "Local zone"}).`;
        score -= 15;
      }
    } else {
      score += 2.0; // Regional alignment boost
    }
  }

  // 4. Aquatic Crop Elevation Filter (Strict priority for upland plateau)
  if (crop.isAquatic && elevation > 150) {
    hardFilterViolation = true;
    hardFilterMessage = "Aquatic / wetland crop infeasible on upland plateau (>150m ASL).";
    score -= 30;
  }

  const adjustedScore = Math.max(5, Math.min(100, Math.round(score * 10) / 10));

  let suitabilityTier: EvaluatedCrop600["suitabilityTier"];
  let tierColorHex = "#10B981";
  let tierBadgeClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";

  if (hardFilterViolation || adjustedScore < 35) {
    suitabilityTier = "UNSUITABLE / HIGH RISK";
    tierColorHex = "#EF4444";
    tierBadgeClass = "bg-rose-500/15 text-rose-300 border-rose-500/40";
  } else if (adjustedScore >= 75) {
    suitabilityTier = "OPTIMAL / VERY HIGH";
    tierColorHex = "#10B981";
    tierBadgeClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  } else if (adjustedScore >= 55) {
    suitabilityTier = "FAVOURABLE / HIGH";
    tierColorHex = "#06B6D4";
    tierBadgeClass = "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
  } else {
    suitabilityTier = "MODERATE / CONDITIONAL";
    tierColorHex = "#F59E0B";
    tierBadgeClass = "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }

  return {
    ...crop,
    adjustedScore,
    suitabilityTier,
    hardFilterViolation,
    hardFilterMessage,
    tierColorHex,
    tierBadgeClass,
    waterWeightPct: waterWeight,
  };
}

export function getCropSuitabilityColor(score: number): {
  hex: string;
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 75) {
    return {
      hex: "#10B981",
      label: "OPTIMAL / VERY HIGH",
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      border: "border-emerald-500/40",
    };
  }
  if (score >= 55) {
    return {
      hex: "#84CC16",
      label: "FAVOURABLE / HIGH",
      bg: "bg-lime-500/15",
      text: "text-lime-400",
      border: "border-lime-500/40",
    };
  }
  if (score >= 35) {
    return {
      hex: "#F59E0B",
      label: "MODERATE / CONDITIONAL",
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/40",
    };
  }
  return {
    hex: "#EF4444",
    label: "UNSUITABLE / HIGH RISK",
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/40",
  };
}

export const GLOBAL_CROP_ATLAS_600: CropAtlas600Entry[] = [
  {
    "id": "grain-amaranth",
    "name": "Grain Amaranth",
    "botanicalName": "Amaranthus cruentus",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 62,
      "climate": 43,
      "economics": 100
    },
    "baseScore": 67.8,
    "indiaZones": [
      "HIM",
      "NE",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Climate-resilient pseudo-cereal high in lysine and squalene."
  },
  {
    "id": "proso-millet",
    "name": "Proso Millet",
    "botanicalName": "Panicum miliaceum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 87,
      "soil": 52,
      "terrain": 46,
      "climate": 42,
      "economics": 100
    },
    "baseScore": 65.4,
    "indiaZones": [
      "HIM",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Shortest duration millet; lowest water requirement among temperate cereals."
  },
  {
    "id": "finger-millet-ragi",
    "name": "Finger Millet (Ragi)",
    "botanicalName": "Eleusine coracana",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "105–120d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 50,
      "climate": 38,
      "economics": 100
    },
    "baseScore": 63.6,
    "indiaZones": [
      "SOU",
      "DEC",
      "HIM",
      "EST",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Primary dryland staple of Karnataka; exceptional calcium content and drought resistance."
  },
  {
    "id": "foxtail-millet",
    "name": "Foxtail Millet",
    "botanicalName": "Setaria italica",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "70–85d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 87,
      "soil": 52,
      "terrain": 45,
      "climate": 36,
      "economics": 100
    },
    "baseScore": 64,
    "indiaZones": [
      "DEC",
      "SOU",
      "HIM",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Low glycemic index grain; thrives on marginal soils with minimal irrigation."
  },
  {
    "id": "sorghum-jowar",
    "name": "Sorghum (Jowar)",
    "botanicalName": "Sorghum bicolor",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "100–115d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 62,
      "terrain": 42,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 63.2,
    "indiaZones": [
      "DEC",
      "WST",
      "CEN",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dual-purpose grain and fodder crop with deep root moisture extraction."
  },
  {
    "id": "pearl-millet-bajra",
    "name": "Pearl Millet (Bajra)",
    "botanicalName": "Pennisetum glaucum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 87,
      "soil": 62,
      "terrain": 24,
      "climate": 43,
      "economics": 100
    },
    "baseScore": 63.2,
    "indiaZones": [
      "ARD",
      "NW",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Superb heat shock tolerance; thrives in arid climates and light sandy soils."
  },
  {
    "id": "little-millet",
    "name": "Little Millet",
    "botanicalName": "Panicum sumatrense",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "75–85d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 85,
      "soil": 52,
      "terrain": 45,
      "climate": 35,
      "economics": 100
    },
    "baseScore": 63.4,
    "indiaZones": [
      "CEN",
      "EST",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Ideal rainfed crop for drought-prone red loamy alfisols."
  },
  {
    "id": "kodo-millet",
    "name": "Kodo Millet",
    "botanicalName": "Paspalum scrobiculatum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "90–105d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 85,
      "soil": 52,
      "terrain": 43,
      "climate": 33,
      "economics": 100
    },
    "baseScore": 62.6,
    "indiaZones": [
      "CEN",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High dietary fibre; extremely hardy against prolonged dry spells."
  },
  {
    "id": "browntop-millet",
    "name": "Browntop Millet",
    "botanicalName": "Urochloa ramosa",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "70–80d",
    "waterRequirementMm": 260,
    "factors": {
      "water": 87,
      "soil": 56,
      "terrain": 31,
      "climate": 37,
      "economics": 100
    },
    "baseScore": 62.2,
    "indiaZones": [
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Endemic to Karnataka and Andhra; outstanding pest resilience and soil binder."
  },
  {
    "id": "maize",
    "name": "Maize",
    "botanicalName": "Zea mays",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 52,
      "climate": 52,
      "economics": 67
    },
    "baseScore": 57.8,
    "indiaZones": [
      "DEC",
      "CEN",
      "IGP",
      "NW",
      "WST",
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Versatile industrial cereal; responsive to moderate moisture."
  },
  {
    "id": "rice-paddy",
    "name": "Rice (Paddy)",
    "botanicalName": "Oryza sativa",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "120–145d",
    "waterRequirementMm": 1250,
    "factors": {
      "water": 44,
      "soil": 66,
      "terrain": 32,
      "climate": 51,
      "economics": 67
    },
    "baseScore": 52,
    "indiaZones": [
      "IGP",
      "EST",
      "NE",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Traditional flooded staple; highly vulnerable to groundwater depletion."
  },
  {
    "id": "barnyard-millet-sanwa",
    "name": "Barnyard Millet (Sanwa)",
    "botanicalName": "Echinochloa frumentacea",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 85,
      "soil": 52,
      "terrain": 48,
      "climate": 36,
      "economics": 100
    },
    "baseScore": 64.2,
    "indiaZones": [
      "HIM",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fastest-growing cereal grain; tolerant to both salinity and waterlogging."
  },
  {
    "id": "buckwheat-kuttu",
    "name": "Buckwheat (Kuttu)",
    "botanicalName": "Fagopyrum esculentum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "65–80d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 58,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 63,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Himalayan highland staple; excellent phosphorus mobilizer."
  },
  {
    "id": "barley-jau",
    "name": "Barley (Jau)",
    "botanicalName": "Hordeum vulgare",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "110–125d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 78,
      "soil": 58,
      "terrain": 38,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 61.6,
    "indiaZones": [
      "NW",
      "HIM",
      "IGP",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High salinity tolerance; widely used for food, feed, and malt."
  },
  {
    "id": "teff",
    "name": "Teff",
    "botanicalName": "Eragrostis tef",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "80–95d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 36,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 60.2,
    "indiaZones": [
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Gluten-free ancient grain; adapted to diverse moisture regimes."
  },
  {
    "id": "quinoa",
    "name": "Quinoa",
    "botanicalName": "Chenopodium quinoa",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "90–120d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 48,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 58.6,
    "indiaZones": [
      "HIM",
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Complete amino acid profile; thrives on alkaline and drought-prone soils."
  },
  {
    "id": "oats-jai",
    "name": "Oats (Jai)",
    "botanicalName": "Avena sativa",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "115–130d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 38,
      "climate": 45,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "NW",
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Cool-season cereal high in beta-glucan; excellent dual grain/fodder."
  },
  {
    "id": "rye",
    "name": "Rye",
    "botanicalName": "Secale cereale",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "120–140d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 48,
      "terrain": 44,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Cold and frost-hardy winter grain for acidic sub-temperate soils."
  },
  {
    "id": "durum-wheat",
    "name": "Durum Wheat",
    "botanicalName": "Triticum durum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "110–125d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 66,
      "soil": 62,
      "terrain": 34,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "CEN",
      "WST",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Hard amber wheat adapted to Central & Western black vertisols."
  },
  {
    "id": "bread-wheat",
    "name": "Bread Wheat",
    "botanicalName": "Triticum aestivum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "115–135d",
    "waterRequirementMm": 480,
    "factors": {
      "water": 60,
      "soil": 66,
      "terrain": 32,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "NW",
      "IGP",
      "CEN",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "North Indian winter staple; requires 4–6 timed irrigations."
  },
  {
    "id": "triticale",
    "name": "Triticale",
    "botanicalName": "x Triticosecale",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "120–135d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 38,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Hybrid of wheat and rye combining yield and stress tolerance."
  },
  {
    "id": "spelt",
    "name": "Spelt",
    "botanicalName": "Triticum spelta",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "125–140d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 42,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Ancient hulled wheat adapted to organic hill farming."
  },
  {
    "id": "emmer-wheat-khapli",
    "name": "Emmer Wheat (Khapli)",
    "botanicalName": "Triticum dicoccum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "110–125d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 36,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 54,
    "indiaZones": [
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Diabetic-friendly ancient grain; historically cultivated in Deccan plateau."
  },
  {
    "id": "fonio-white",
    "name": "Fonio (White)",
    "botanicalName": "Digitaria exilis",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "60–80d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 34,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-maturing West African dryland grain; high sulphur amino acids."
  },
  {
    "id": "black-fonio",
    "name": "Black Fonio",
    "botanicalName": "Digitaria iburua",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Zaid",
    "durationDays": "65–85d",
    "waterRequirementMm": 260,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 32,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "ARD",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Extremely drought-tolerant minor cereal for shallow rocky ground."
  },
  {
    "id": "job-s-tears-adlay",
    "name": "Job's Tears (Adlay)",
    "botanicalName": "Coix lacryma-jobi",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "120–150d",
    "waterRequirementMm": 600,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 46,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 55.8,
    "indiaZones": [
      "NE",
      "EST",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Nutritious grain and medicinal cereal cultivated in Northeastern hills."
  },
  {
    "id": "wild-rice",
    "name": "Wild Rice",
    "botanicalName": "Zizania aquatica",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "120–135d",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 40,
      "soil": 62,
      "terrain": 26,
      "climate": 45,
      "economics": 56
    },
    "baseScore": 45.8,
    "indiaZones": [
      "EST",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Wetland aquatic grass; requires shallow marshland habitats."
  },
  {
    "id": "canary-seed",
    "name": "Canary Seed",
    "botanicalName": "Phalaris canariensis",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "90–105d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 34,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Commercial grain crop with growing gluten-free human food interest."
  },
  {
    "id": "chia",
    "name": "Chia",
    "botanicalName": "Salvia hispanica",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "95–115d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 36,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 59.8,
    "indiaZones": [
      "CEN",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High omega-3 pseudocereal; well-suited to dryland autumn/winter cycles."
  },
  {
    "id": "broomcorn",
    "name": "Broomcorn",
    "botanicalName": "Sorghum vulgare var. technicum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "100–115d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 78,
      "soil": 56,
      "terrain": 38,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 61,
    "indiaZones": [
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Specialized sorghum grown for long stiff panicle brushes and grain."
  },
  {
    "id": "sweet-sorghum",
    "name": "Sweet Sorghum",
    "botanicalName": "Sorghum bicolor var. saccharatum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "105–120d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 76,
      "soil": 60,
      "terrain": 36,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 61,
    "indiaZones": [
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Multi-purpose biofuel, syrup, and fodder crop needing 50% less water than cane."
  },
  {
    "id": "kani-millet",
    "name": "Kani (Millet)",
    "botanicalName": "Digitaria sanguinalis",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "75–85d",
    "waterRequirementMm": 290,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 44,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 60.2,
    "indiaZones": [
      "NE",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Himalayan hill forage and grain millet adapted to thin terrace soils."
  },
  {
    "id": "kamut-khorasan-wheat",
    "name": "Kamut (Khorasan Wheat)",
    "botanicalName": "Triticum turgidum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "115–130d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 34,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Ancient giant grain wheat with sweet nutty flavor and high protein."
  },
  {
    "id": "einkorn-wheat",
    "name": "Einkorn Wheat",
    "botanicalName": "Triticum monococcum",
    "section": "Cereal & Millet",
    "category": "Cereals & Millets",
    "season": "Rabi",
    "durationDays": "120–135d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 38,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "The earliest cultivated diploid wheat; resilient in mountain terrain."
  },
  {
    "id": "chickpea",
    "name": "Chickpea",
    "botanicalName": "Cicer arietinum",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "95–115d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 62,
      "terrain": 39,
      "climate": 49,
      "economics": 89
    },
    "baseScore": 64.2,
    "indiaZones": [
      "CEN",
      "DEC",
      "NW",
      "WST",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Major rabi pulse; fixes up to 40 kg N/ha; deep root moisture extraction."
  },
  {
    "id": "horse-gram",
    "name": "Horse Gram",
    "botanicalName": "Macrotyloma uniflorum",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "85–100d",
    "waterRequirementMm": 220,
    "factors": {
      "water": 93,
      "soil": 52,
      "terrain": 35,
      "climate": 36,
      "economics": 100
    },
    "baseScore": 63.2,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Ultimate drought-resilient pulse for dry rocky hardpan soils."
  },
  {
    "id": "cowpea",
    "name": "Cowpea",
    "botanicalName": "Vigna unguiculata",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "70–85d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 28,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 59.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dual-purpose grain and green manure; tolerates heat and drought."
  },
  {
    "id": "lablab",
    "name": "Lablab",
    "botanicalName": "Lablab purpureus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "120–150d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 36,
      "climate": 41,
      "economics": 89
    },
    "baseScore": 59.2,
    "indiaZones": [
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Traditional Deccan intercrop; excellent nitrogen fixer and fodder producer."
  },
  {
    "id": "mung-bean",
    "name": "Mung Bean",
    "botanicalName": "Vigna radiata",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "60–70d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 29,
      "climate": 39,
      "economics": 89
    },
    "baseScore": 58.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Short-duration pulse ideal for catch crop and soil fertility restoration."
  },
  {
    "id": "pigeon-pea-tur",
    "name": "Pigeon Pea (Tur)",
    "botanicalName": "Cajanus cajan",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 34,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 56.6,
    "indiaZones": [
      "DEC",
      "CEN",
      "WST",
      "SOU",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Deep taproot breaks subsoil hardpans; fixes 50 kg N/ha."
  },
  {
    "id": "black-gram",
    "name": "Black Gram",
    "botanicalName": "Vigna mungo",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "70–85d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 26,
      "climate": 36,
      "economics": 89
    },
    "baseScore": 57,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rich in phosphoric acid; thrives as relay pulse on residual moisture."
  },
  {
    "id": "soybean",
    "name": "Soybean",
    "botanicalName": "Glycine max",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "90–105d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 28,
      "climate": 37,
      "economics": 67
    },
    "baseScore": 51,
    "indiaZones": [
      "CEN",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Major protein and oil crop in Central black vertisols."
  },
  {
    "id": "lentil",
    "name": "Lentil",
    "botanicalName": "Lens culinaris",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "100–120d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 76,
      "soil": 58,
      "terrain": 32,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 60,
    "indiaZones": [
      "IGP",
      "CEN",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Winter pulse with high cold tolerance and protein content."
  },
  {
    "id": "moth-bean",
    "name": "Moth Bean",
    "botanicalName": "Vigna aconitifolia",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "65–75d",
    "waterRequirementMm": 200,
    "factors": {
      "water": 93,
      "soil": 48,
      "terrain": 26,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD",
      "NW",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Most heat and drought resistant legume grown in Thar desert."
  },
  {
    "id": "field-pea",
    "name": "Field Pea",
    "botanicalName": "Pisum sativum",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "90–110d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "IGP",
      "NW",
      "CEN",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Cool-season nitrogen fixer grown for dry pulse and forage."
  },
  {
    "id": "faba-bean",
    "name": "Faba Bean",
    "botanicalName": "Vicia faba",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "110–130d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-yielding cold-tolerant legume with massive nitrogen fixation."
  },
  {
    "id": "grass-pea-khesari",
    "name": "Grass Pea (Khesari)",
    "botanicalName": "Lathyrus sativus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "90–105d",
    "waterRequirementMm": 220,
    "factors": {
      "water": 87,
      "soil": 52,
      "terrain": 26,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "EST",
      "CEN",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Insurance crop that survives both severe drought and waterlogging."
  },
  {
    "id": "ricebean",
    "name": "Ricebean",
    "botanicalName": "Vigna umbellata",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "100–120d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 42,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 60.2,
    "indiaZones": [
      "HIM",
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Acid-soil tolerant pulse with high resistance to bruchid storage pests."
  },
  {
    "id": "adzuki-bean",
    "name": "Adzuki Bean",
    "botanicalName": "Vigna angularis",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "90–110d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 40,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Compact sweet red bean adapted to temperate hill climates."
  },
  {
    "id": "tepary-bean",
    "name": "Tepary Bean",
    "botanicalName": "Phaseolus acutifolius",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "65–80d",
    "waterRequirementMm": 220,
    "factors": {
      "water": 91,
      "soil": 48,
      "terrain": 26,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "ARD",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Desert legume with extreme heat resilience and low water need."
  },
  {
    "id": "winged-bean",
    "name": "Winged Bean",
    "botanicalName": "Psophocarpus tetragonolobus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "140–170d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 34,
      "climate": 45,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "SOU",
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Every part of the plant is edible; exceptional protein rich nodules."
  },
  {
    "id": "velvet-bean-mucuna",
    "name": "Velvet Bean (Mucuna)",
    "botanicalName": "Mucuna pruriens",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "120–150d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 32,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 59.4,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Smother crop that suppresses nematodes and produces medicinal L-DOPA."
  },
  {
    "id": "sword-bean",
    "name": "Sword Bean",
    "botanicalName": "Canavalia gladiata",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "130–160d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 32,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Resilient vine legume adapted to poor acidic and coastal soils."
  },
  {
    "id": "jack-bean",
    "name": "Jack Bean",
    "botanicalName": "Canavalia ensiformis",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "120–150d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 30,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy green manure pulse tolerant to shade and dry spells."
  },
  {
    "id": "lima-bean",
    "name": "Lima Bean",
    "botanicalName": "Phaseolus lunatus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Kharif",
    "durationDays": "100–125d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 36,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "SOU",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Heat-tolerant butter bean with deep rooting and high yield."
  },
  {
    "id": "kidney-bean-rajma",
    "name": "Kidney Bean (Rajma)",
    "botanicalName": "Phaseolus vulgaris",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "95–115d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 62,
      "soil": 56,
      "terrain": 48,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 55.8,
    "indiaZones": [
      "HIM",
      "NE",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Cool-season premium pulse of Kashmir and Himachal valleys."
  },
  {
    "id": "cluster-bean-guar",
    "name": "Cluster Bean (Guar)",
    "botanicalName": "Cyamopsis tetragonoloba",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "80–95d",
    "waterRequirementMm": 260,
    "factors": {
      "water": 87,
      "soil": 52,
      "terrain": 28,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 60,
    "indiaZones": [
      "ARD",
      "NW",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Major industrial gum producer with outstanding drought endurance."
  },
  {
    "id": "white-lupine",
    "name": "White Lupine",
    "botanicalName": "Lupinus albus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "120–140d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 36,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Phosphorus mobilizer adapted to cold acidic and sandy soils."
  },
  {
    "id": "blue-lupine",
    "name": "Blue Lupine",
    "botanicalName": "Lupinus angustifolius",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "115–135d",
    "waterRequirementMm": 360,
    "factors": {
      "water": 71,
      "soil": 50,
      "terrain": 36,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Sweet lupine grain for cool temperate livestock feed."
  },
  {
    "id": "yellow-lupine",
    "name": "Yellow Lupine",
    "botanicalName": "Lupinus luteus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "115–135d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 48,
      "terrain": 36,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 52.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deep-rooted acid sand specialist with high protein seed."
  },
  {
    "id": "tarwi-andean-lupin",
    "name": "Tarwi (Andean Lupin)",
    "botanicalName": "Lupinus mutabilis",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "130–150d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 48,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High protein and oil legume adapted to high-altitude mountain slopes."
  },
  {
    "id": "bambara-groundnut",
    "name": "Bambara Groundnut",
    "botanicalName": "Vigna subterranea",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "110–130d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 28,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 57.6,
    "indiaZones": [
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Subterranean pod legume that yields on soils too poor for peanuts."
  },
  {
    "id": "kersting-s-groundnut",
    "name": "Kersting's Groundnut",
    "botanicalName": "Macrotyloma geocarpum",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Zaid",
    "durationDays": "100–120d",
    "waterRequirementMm": 290,
    "factors": {
      "water": 82,
      "soil": 48,
      "terrain": 26,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 56.6,
    "indiaZones": [
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rare geocarpic legume with high lysine protein and low moisture demand."
  },
  {
    "id": "marama-bean",
    "name": "Marama Bean",
    "botanicalName": "Tylosema esculentum",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 89,
      "soil": 46,
      "terrain": 26,
      "climate": 36,
      "economics": 89
    },
    "baseScore": 57.2,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Kalahari desert legume with large edible tuber and rich seeds."
  },
  {
    "id": "runner-bean",
    "name": "Runner Bean",
    "botanicalName": "Phaseolus coccineus",
    "section": "Pulse",
    "category": "Pulses",
    "season": "Rabi",
    "durationDays": "100–120d",
    "waterRequirementMm": 480,
    "factors": {
      "water": 58,
      "soil": 54,
      "terrain": 46,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Perennial climbing bean adapted to cooler, moist highland microclimates."
  },
  {
    "id": "neem",
    "name": "Neem",
    "botanicalName": "Azadirachta indica",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 66,
      "terrain": 35,
      "climate": 62,
      "economics": 100
    },
    "baseScore": 69,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN",
      "WST",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Pest-repellent bio-oil tree with outstanding arid adaptability."
  },
  {
    "id": "pongamia",
    "name": "Pongamia",
    "botanicalName": "Millettia pinnata",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 75,
      "soil": 66,
      "terrain": 30,
      "climate": 62,
      "economics": 100
    },
    "baseScore": 66.6,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Nitrogen-fixing tree seed oil for biodiesel and soil reclamation."
  },
  {
    "id": "niger",
    "name": "Niger",
    "botanicalName": "Guizotia abyssinica",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Zaid",
    "durationDays": "95–110d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 87,
      "soil": 52,
      "terrain": 43,
      "climate": 38,
      "economics": 100
    },
    "baseScore": 64,
    "indiaZones": [
      "EST",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy tribal oilseed thriving on barren rocky gravel soils."
  },
  {
    "id": "safflower",
    "name": "Safflower",
    "botanicalName": "Carthamus tinctorius",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "115–130d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 66,
      "terrain": 32,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 61.8,
    "indiaZones": [
      "DEC",
      "WST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Deep taproot extracts subsoil moisture; high polyunsaturated oil."
  },
  {
    "id": "sesame",
    "name": "Sesame",
    "botanicalName": "Sesamum indicum",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "80–95d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 26,
      "climate": 41,
      "economics": 89
    },
    "baseScore": 58,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Ancient high-value antioxidant oilseed suited to semi-arid Kharif."
  },
  {
    "id": "castor",
    "name": "Castor",
    "botanicalName": "Ricinus communis",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "140–180d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 31,
      "climate": 36,
      "economics": 89
    },
    "baseScore": 55.8,
    "indiaZones": [
      "WST",
      "DEC",
      "SOU",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Major non-edible industrial lubricant oil; thrives on Gujarat sandy loams."
  },
  {
    "id": "sunflower",
    "name": "Sunflower",
    "botanicalName": "Helianthus annuus",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "85–100d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 34,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.6,
    "indiaZones": [
      "DEC",
      "WST",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Day-neutral oilseed responsive to sunshine; ideal relay crop."
  },
  {
    "id": "groundnut",
    "name": "Groundnut",
    "botanicalName": "Arachis hypogaea",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "105–125d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 71,
      "soil": 40,
      "terrain": 26,
      "climate": 35,
      "economics": 67
    },
    "baseScore": 47.8,
    "indiaZones": [
      "DEC",
      "SOU",
      "WST",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Major oil and protein nut; requires sandy loam for peg penetration."
  },
  {
    "id": "coconut",
    "name": "Coconut",
    "botanicalName": "Cocos nucifera",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 31,
      "soil": 66,
      "terrain": 14,
      "climate": 36,
      "economics": 45
    },
    "baseScore": 38.4,
    "indiaZones": [
      "SOU",
      "ISL",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Perennial coastal palm; severely stressed by falling groundwater."
  },
  {
    "id": "mustard-indian",
    "name": "Mustard (Indian)",
    "botanicalName": "Brassica juncea",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "105–120d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 76,
      "soil": 60,
      "terrain": 30,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 59.8,
    "indiaZones": [
      "NW",
      "IGP",
      "CEN",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dominant North Indian rabi edible oilseed; pungent allyl isothiocyanate."
  },
  {
    "id": "linseed-flaxseed",
    "name": "Linseed (Flaxseed)",
    "botanicalName": "Linum usitatissimum",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "110–130d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 73,
      "soil": 56,
      "terrain": 32,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "CEN",
      "IGP",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Omega-3 rich linseed grown under rainfed or utera cultivation."
  },
  {
    "id": "jojoba",
    "name": "Jojoba",
    "botanicalName": "Simmondsia chinensis",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 91,
      "soil": 46,
      "terrain": 28,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Desert shrub producing liquid wax esters for cosmetics and lubrication."
  },
  {
    "id": "oil-palm",
    "name": "Oil Palm",
    "botanicalName": "Elaeis guineensis",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1800,
    "factors": {
      "water": 26,
      "soil": 66,
      "terrain": 18,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 40,
    "indiaZones": [
      "SOU",
      "ISL",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Highest yielding vegetable oil crop; requires intense humid moisture."
  },
  {
    "id": "olive",
    "name": "Olive",
    "botanicalName": "Olea europaea",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 38,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "ARD",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Mediterranean dry-climate tree adapted to calcareous rocky slopes."
  },
  {
    "id": "camelina",
    "name": "Camelina",
    "botanicalName": "Camelina sativa",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Rabi",
    "durationDays": "85–100d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 82,
      "soil": 50,
      "terrain": 34,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 59,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "False flax with high omega-3 and outstanding frost resilience."
  },
  {
    "id": "crambe",
    "name": "Crambe",
    "botanicalName": "Crambe abyssinica",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Kharif",
    "durationDays": "90–105d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 32,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Industrial oil rich in erucic acid used in plastics and surfactants."
  },
  {
    "id": "sacha-inchi",
    "name": "Sacha Inchi",
    "botanicalName": "Plukenetia volubilis",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Inca peanut rich in alpha-linolenic acid for rainforest agroforestry."
  },
  {
    "id": "perilla",
    "name": "Perilla",
    "botanicalName": "Perilla frutescens",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Rabi",
    "durationDays": "110–130d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 55.2,
    "indiaZones": [
      "NE",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Traditional Himalayan aromatic oilseed used for cooking and drying oils."
  },
  {
    "id": "meadowfoam",
    "name": "Meadowfoam",
    "botanicalName": "Limnanthes alba",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Rabi",
    "durationDays": "110–125d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 48,
      "terrain": 30,
      "climate": 38,
      "economics": 67
    },
    "baseScore": 50.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Winter annual oilseed producing exceptionally oxidative-stable oil."
  },
  {
    "id": "shea-butter-tree",
    "name": "Shea Butter Tree",
    "botanicalName": "Vitellaria paradoxa",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 26,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": false,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "African savannah tree yielding cosmetic and confectionery fat."
  },
  {
    "id": "mahua",
    "name": "Mahua",
    "botanicalName": "Madhuca longifolia",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 80,
      "soil": 62,
      "terrain": 32,
      "climate": 54,
      "economics": 89
    },
    "baseScore": 63.4,
    "indiaZones": [
      "CEN",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Indigenous forest tree; seeds yield edible butter and biofuel."
  },
  {
    "id": "kusum",
    "name": "Kusum",
    "botanicalName": "Schleichera oleosa",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 78,
      "soil": 60,
      "terrain": 34,
      "climate": 52,
      "economics": 89
    },
    "baseScore": 62.6,
    "indiaZones": [
      "EST",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Host tree for lac insect; seeds yield macassar oil for soap."
  },
  {
    "id": "jatropha",
    "name": "Jatropha",
    "botanicalName": "Jatropha curcas",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 32,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 54.8,
    "indiaZones": [
      "ARD",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Biofuel shrub growing on degraded wastelands; unpalatable to cattle."
  },
  {
    "id": "tallow-tree",
    "name": "Tallow Tree",
    "botanicalName": "Triadica sebifera",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 30,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "HIM",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fast-growing tree producing vegetable tallow wax around seeds."
  },
  {
    "id": "sal-seed",
    "name": "Sal Seed",
    "botanicalName": "Shorea robusta",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 800,
    "factors": {
      "water": 68,
      "soil": 66,
      "terrain": 38,
      "climate": 52,
      "economics": 89
    },
    "baseScore": 62.6,
    "indiaZones": [
      "EST",
      "CEN",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dominant timber tree whose seeds yield cocoa butter extender fat."
  },
  {
    "id": "tung-tree",
    "name": "Tung Tree",
    "botanicalName": "Vernicia fordii",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 62,
      "soil": 56,
      "terrain": 42,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "NE",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Subtropical hill tree yielding rapid-drying wood-finishing tung oil."
  },
  {
    "id": "taramira-arugula-oilseed",
    "name": "Taramira (Arugula Oilseed)",
    "botanicalName": "Eruca vesicaria",
    "section": "Oilseed",
    "category": "Oilseeds",
    "season": "Zaid",
    "durationDays": "90–105d",
    "waterRequirementMm": 200,
    "factors": {
      "water": 89,
      "soil": 50,
      "terrain": 26,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Drought-hardy brassica grown on dry sandy soils in Rajasthan."
  },
  {
    "id": "sweet-potato",
    "name": "Sweet Potato",
    "botanicalName": "Ipomoea batatas",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "100–120d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 40,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 55.6,
    "indiaZones": [
      "EST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-yielding nutritious tuber with deep soil drought resilience."
  },
  {
    "id": "cassava",
    "name": "Cassava",
    "botanicalName": "Manihot esculenta",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "240–300d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 38,
      "climate": 51,
      "economics": 67
    },
    "baseScore": 55.8,
    "indiaZones": [
      "SOU",
      "DEC",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Starch security staple that thrives on acidic low-nutrient soils."
  },
  {
    "id": "potato",
    "name": "Potato",
    "botanicalName": "Solanum tuberosum",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "80–110d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 58,
      "soil": 62,
      "terrain": 44,
      "climate": 43,
      "economics": 56
    },
    "baseScore": 52.6,
    "indiaZones": [
      "IGP",
      "HIM",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Cool-season tuber requiring consistent soil moisture and loose loam."
  },
  {
    "id": "elephant-foot-yam",
    "name": "Elephant Foot Yam",
    "botanicalName": "Amorphophallus paeoniifolius",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "210–240d",
    "waterRequirementMm": 900,
    "factors": {
      "water": 44,
      "soil": 52,
      "terrain": 26,
      "climate": 38,
      "economics": 45
    },
    "baseScore": 41,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value edible corm needing rich humid tropical soil moisture."
  },
  {
    "id": "taro-colocasia",
    "name": "Taro (Colocasia)",
    "botanicalName": "Colocasia esculenta",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 1000,
    "factors": {
      "water": 42,
      "soil": 56,
      "terrain": 28,
      "climate": 45,
      "economics": 56
    },
    "baseScore": 45.4,
    "indiaZones": [
      "EST",
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Wetland shade-tolerant corm rich in digestible starch and iron."
  },
  {
    "id": "greater-yam",
    "name": "Greater Yam",
    "botanicalName": "Dioscorea alata",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "210–270d",
    "waterRequirementMm": 700,
    "factors": {
      "water": 58,
      "soil": 52,
      "terrain": 34,
      "climate": 45,
      "economics": 56
    },
    "baseScore": 49,
    "indiaZones": [
      "EST",
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Vigorous climbing vine producing massive edible underground tubers."
  },
  {
    "id": "lesser-yam",
    "name": "Lesser Yam",
    "botanicalName": "Dioscorea esculenta",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "180–210d",
    "waterRequirementMm": 650,
    "factors": {
      "water": 60,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Prolific cluster yam with soft sweet edible tubers."
  },
  {
    "id": "aerial-yam",
    "name": "Aerial Yam",
    "botanicalName": "Dioscorea bulbifera",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "180–240d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 38,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "NE",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Produces bulbils in leaf axils; hardy forest food plant."
  },
  {
    "id": "arrowroot",
    "name": "Arrowroot",
    "botanicalName": "Maranta arundinacea",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "240–300d",
    "waterRequirementMm": 750,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 34,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "SOU",
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fine digestible starch rhizome cultivated under partial forest canopy."
  },
  {
    "id": "jerusalem-artichoke",
    "name": "Jerusalem Artichoke",
    "botanicalName": "Helianthus tuberosus",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "120–150d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 40,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 55.8,
    "indiaZones": [
      "HIM",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Inulin-rich perennial sunflower producing edible prebiotic tubers."
  },
  {
    "id": "yacon",
    "name": "Yacon",
    "botanicalName": "Smallanthus sonchifolius",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "180–210d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Andean crisp juicy tuber high in fructooligosaccharides (FOS)."
  },
  {
    "id": "oca",
    "name": "Oca",
    "botanicalName": "Oxalis tuberosa",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "180–220d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 62,
      "soil": 52,
      "terrain": 50,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Tangy colorful highland Andean tuber adapted to Himalayan hill cold."
  },
  {
    "id": "mashua",
    "name": "Mashua",
    "botanicalName": "Tropaeolum tuberosum",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "180–220d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 66,
      "soil": 50,
      "terrain": 52,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Insect-repellent mountain tuber with peppery flavor and high yield."
  },
  {
    "id": "ulluco",
    "name": "Ulluco",
    "botanicalName": "Ullucus tuberosus",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "180–240d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 60,
      "soil": 52,
      "terrain": 48,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Bright mucilaginous mountain tuber for cool high-altitude terraces."
  },
  {
    "id": "beetroot",
    "name": "Beetroot",
    "botanicalName": "Beta vulgaris",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 64,
      "soil": 56,
      "terrain": 34,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "NW",
      "DEC",
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Saline-tolerant root rich in betanin and nitrates; quick winter cash crop."
  },
  {
    "id": "radish",
    "name": "Radish",
    "botanicalName": "Raphanus sativus",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "35–50d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 30,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 56.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Ultra-fast bio-drilling taproot crop that loosens compacted subsoil."
  },
  {
    "id": "turnip",
    "name": "Turnip",
    "botanicalName": "Brassica rapa subsp. rapa",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "50–65d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 32,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "NW",
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Cool-season bulbous root crop used for both table vegetables and fodder."
  },
  {
    "id": "parsnip",
    "name": "Parsnip",
    "botanicalName": "Pastinaca sativa",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "120–150d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 62,
      "soil": 56,
      "terrain": 40,
      "climate": 40,
      "economics": 56
    },
    "baseScore": 50.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Cold-sweetened biennial root requiring deep stone-free mountain soil."
  },
  {
    "id": "maca",
    "name": "Maca",
    "botanicalName": "Lepidium meyenii",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "200–240d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 73,
      "soil": 48,
      "terrain": 56,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 56.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High-altitude adaptogenic hypocotyl thriving on frost-exposed peaks."
  },
  {
    "id": "lotus-root",
    "name": "Lotus Root",
    "botanicalName": "Nelumbo nucifera",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "180–210d",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 30,
      "soil": 56,
      "terrain": 14,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 40,
    "indiaZones": [
      "IGP",
      "EST",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Aquatic rhizome requiring perennial shallow freshwater ponds."
  },
  {
    "id": "water-chestnut-singhara",
    "name": "Water Chestnut (Singhara)",
    "botanicalName": "Trapa natans",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 30,
      "soil": 56,
      "terrain": 14,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 40,
    "indiaZones": [
      "IGP",
      "EST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Floating aquatic wetland nut grown in village tanks and floodplains."
  },
  {
    "id": "ginger-tuber",
    "name": "Ginger Tuber",
    "botanicalName": "Zingiber officinale",
    "section": "Root & Tuber",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "210–240d",
    "waterRequirementMm": 850,
    "factors": {
      "water": 48,
      "soil": 56,
      "terrain": 38,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "SOU",
      "NE",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value spice rhizome needing humus-rich soil and partial shade."
  },
  {
    "id": "palmyra-palm",
    "name": "Palmyra Palm",
    "botanicalName": "Borassus flabellifer",
    "section": "Sugar Crop",
    "category": "Cereals & Millets",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 62,
      "terrain": 30,
      "climate": 43,
      "economics": 67
    },
    "baseScore": 56.8,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Traditional palm jaggery tree surviving extreme coastal and dryland drought."
  },
  {
    "id": "stevia",
    "name": "Stevia",
    "botanicalName": "Stevia rebaudiana",
    "section": "Sugar Crop",
    "category": "Cereals & Millets",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 32,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 48,
    "indiaZones": [
      "DEC",
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Zero-calorie steviol glycoside herb requiring well-drained loams."
  },
  {
    "id": "sugarcane",
    "name": "Sugarcane",
    "botanicalName": "Saccharum officinarum",
    "section": "Sugar Crop",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "300–365d",
    "waterRequirementMm": 2000,
    "factors": {
      "water": 31,
      "soil": 66,
      "terrain": 22,
      "climate": 33,
      "economics": 23
    },
    "baseScore": 35,
    "indiaZones": [
      "IGP",
      "WST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Extreme groundwater depletion driver; massive economic overdraft."
  },
  {
    "id": "sugar-beet",
    "name": "Sugar Beet",
    "botanicalName": "Beta vulgaris subsp. vulgaris",
    "section": "Sugar Crop",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 34,
      "climate": 40,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "NW",
      "WST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Saline-tolerant sugar crop needing 40% less water than cane."
  },
  {
    "id": "sweet-sorghum-sugar",
    "name": "Sweet Sorghum (Sugar)",
    "botanicalName": "Sorghum bicolor",
    "section": "Sugar Crop",
    "category": "Cereals & Millets",
    "season": "Kharif",
    "durationDays": "105–120d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 62,
      "terrain": 38,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 62.4,
    "indiaZones": [
      "DEC",
      "WST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Produces sugar stalks and grain simultaneously on rainfed moisture."
  },
  {
    "id": "sunn-hemp",
    "name": "Sunn Hemp",
    "botanicalName": "Crotalaria juncea",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–90d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 36,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 60.8,
    "indiaZones": [
      "DEC",
      "CEN",
      "IGP",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing bast fibre and green manure fixing 60 kg N/ha."
  },
  {
    "id": "bamboo",
    "name": "Bamboo",
    "botanicalName": "Bambusa tulda",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 66,
      "soil": 66,
      "terrain": 52,
      "climate": 51,
      "economics": 67
    },
    "baseScore": 60.4,
    "indiaZones": [
      "NE",
      "EST",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Green gold structural fibre with immense carbon sequestration."
  },
  {
    "id": "sisal",
    "name": "Sisal",
    "botanicalName": "Agave sisalana",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 42,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 53.4,
    "indiaZones": [
      "DEC",
      "ARD",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Xerophytic succulent leaf fibre ideal for dryland hedge erosion control."
  },
  {
    "id": "mesta",
    "name": "Mesta",
    "botanicalName": "Hibiscus sabdariffa",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "120–140d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 34,
      "climate": 40,
      "economics": 56
    },
    "baseScore": 50.6,
    "indiaZones": [
      "EST",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Hardy jute substitute grown on marginal rainfed red soils."
  },
  {
    "id": "cotton-upland",
    "name": "Cotton (Upland)",
    "botanicalName": "Gossypium hirsutum",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 700,
    "factors": {
      "water": 58,
      "soil": 62,
      "terrain": 26,
      "climate": 42,
      "economics": 45
    },
    "baseScore": 46.6,
    "indiaZones": [
      "WST",
      "NW",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "White gold commercial fibre requiring pest shield and deep vertisol."
  },
  {
    "id": "jute-white",
    "name": "Jute (White)",
    "botanicalName": "Corchorus capsularis",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "120–140d",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 42,
      "soil": 62,
      "terrain": 22,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 45.6,
    "indiaZones": [
      "EST",
      "NE",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Golden fibre of Bengal delta requiring retting water tanks."
  },
  {
    "id": "jute-tossa",
    "name": "Jute (Tossa)",
    "botanicalName": "Corchorus olitorius",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "120–140d",
    "waterRequirementMm": 1000,
    "factors": {
      "water": 45,
      "soil": 62,
      "terrain": 24,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 46.6,
    "indiaZones": [
      "EST",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Finer silken bast fibre suited to non-inundated delta uplands."
  },
  {
    "id": "industrial-hemp",
    "name": "Industrial Hemp",
    "botanicalName": "Cannabis sativa",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "90–120d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 73,
      "soil": 56,
      "terrain": 38,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 55.6,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Bast fibre with extreme tensile strength and deep taproot aeration."
  },
  {
    "id": "flax-linseed-fibre",
    "name": "Flax (Linseed Fibre)",
    "botanicalName": "Linum usitatissimum",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "95–110d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 34,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54,
    "indiaZones": [
      "NW",
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Linen fibre crop cultivated in cool humid winter valleys."
  },
  {
    "id": "kenaf",
    "name": "Kenaf",
    "botanicalName": "Hibiscus cannabinus",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "110–130d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 34,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 51.4,
    "indiaZones": [
      "DEC",
      "EST",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing pulp and cordage fibre with high cellulosic yield."
  },
  {
    "id": "ramie",
    "name": "Ramie",
    "botanicalName": "Boehmeria nivea",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1000,
    "factors": {
      "water": 50,
      "soil": 60,
      "terrain": 36,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Strongest natural plant fibre; requires warm humid subtropical climate."
  },
  {
    "id": "abaca-manila-hemp",
    "name": "Abaca (Manila Hemp)",
    "botanicalName": "Musa textilis",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 35,
      "soil": 62,
      "terrain": 28,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 43,
    "indiaZones": [
      "ISL",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Marine cordage banana-family leaf fibre requiring rainforest rainfall."
  },
  {
    "id": "coir",
    "name": "Coir",
    "botanicalName": "Cocos nucifera (fibre)",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 35,
      "soil": 66,
      "terrain": 16,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 44.8,
    "indiaZones": [
      "SOU",
      "ISL",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Thick natural husks processed into erosion mats and grow media."
  },
  {
    "id": "kapok",
    "name": "Kapok",
    "botanicalName": "Ceiba pentandra",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 73,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 54.8,
    "indiaZones": [
      "SOU",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Silk-cotton pod fibre used for flotation, lifejackets, and insulation."
  },
  {
    "id": "agave-cantala",
    "name": "Agave Cantala",
    "botanicalName": "Agave cantala",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 40,
      "climate": 42,
      "economics": 45
    },
    "baseScore": 52.4,
    "indiaZones": [
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Manila maguey fibre plant thriving on arid rocky scrubland."
  },
  {
    "id": "urena-congo-jute",
    "name": "Urena (Congo Jute)",
    "botanicalName": "Urena lobata",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "120–150d",
    "waterRequirementMm": 600,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 32,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "EST",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Subtropical shrub producing soft durable jute-like bast fibre."
  },
  {
    "id": "broom-grass",
    "name": "Broom Grass",
    "botanicalName": "Thysanolaena latifolia",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 60,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 59.2,
    "indiaZones": [
      "NE",
      "HIM",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Soil conservation hill grass cultivated for domestic sweeping brooms."
  },
  {
    "id": "red-silk-cotton",
    "name": "Red Silk Cotton",
    "botanicalName": "Bombax ceiba",
    "section": "Fibre Crop",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 76,
      "soil": 56,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 56.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Indigenous deciduous tree producing soft downy seed floss."
  },
  {
    "id": "moringa-drumstick",
    "name": "Moringa (Drumstick)",
    "botanicalName": "Moringa oleifera",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 35,
      "climate": 51,
      "economics": 89
    },
    "baseScore": 61,
    "indiaZones": [
      "SOU",
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Miracle tree with nutrient-dense leaves and drought tolerance."
  },
  {
    "id": "spinach-palak",
    "name": "Spinach (Palak)",
    "botanicalName": "Spinacia oleracea",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "40–55d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 66,
      "soil": 58,
      "terrain": 34,
      "climate": 51,
      "economics": 89
    },
    "baseScore": 59.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fast-growing iron-rich leafy green; quick winter cash generator."
  },
  {
    "id": "coriander-leaf",
    "name": "Coriander Leaf",
    "botanicalName": "Coriandrum sativum (leaf)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "35–45d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 30,
      "climate": 53,
      "economics": 89
    },
    "baseScore": 59,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Aromatic culinary herb; short rotation catch crop."
  },
  {
    "id": "cabbage",
    "name": "Cabbage",
    "botanicalName": "Brassica oleracea var. capitata",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 64,
      "soil": 60,
      "terrain": 36,
      "climate": 49,
      "economics": 78
    },
    "baseScore": 57.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-yielding cool-season brassica head vegetable."
  },
  {
    "id": "pumpkin",
    "name": "Pumpkin",
    "botanicalName": "Cucurbita moschata",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 34,
      "climate": 45,
      "economics": 78
    },
    "baseScore": 56,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy cucurbit with long storage life and high carotenoids."
  },
  {
    "id": "carrot",
    "name": "Carrot",
    "botanicalName": "Daucus carota",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "85–100d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 64,
      "soil": 58,
      "terrain": 36,
      "climate": 49,
      "economics": 67
    },
    "baseScore": 54.8,
    "indiaZones": [
      "NW",
      "HIM",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Beta-carotene rich taproot requiring deep friable soil."
  },
  {
    "id": "okra-bhindi",
    "name": "Okra (Bhindi)",
    "botanicalName": "Abelmoschus esculentus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 32,
      "climate": 49,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Heat-loving Kharif and summer vegetable with continuous picking."
  },
  {
    "id": "cucumber",
    "name": "Cucumber",
    "botanicalName": "Cucumis sativus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "55–70d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 32,
      "climate": 49,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fast-growing vine crop suited to open field and shaded polyhouse."
  },
  {
    "id": "brinjal-eggplant",
    "name": "Brinjal (Eggplant)",
    "botanicalName": "Solanum melongena",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "100–120d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 32,
      "climate": 43,
      "economics": 67
    },
    "baseScore": 51.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deep-rooted solanaceous vegetable with high year-round productivity."
  },
  {
    "id": "chilli-pepper",
    "name": "Chilli Pepper",
    "botanicalName": "Capsicum annuum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "110–135d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 58,
      "soil": 54,
      "terrain": 34,
      "climate": 47,
      "economics": 56
    },
    "baseScore": 49.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Pungent cash crop requiring good drainage and sunny weather."
  },
  {
    "id": "onion",
    "name": "Onion",
    "botanicalName": "Allium cepa",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "120–140d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 56,
      "soil": 58,
      "terrain": 32,
      "climate": 47,
      "economics": 56
    },
    "baseScore": 49.8,
    "indiaZones": [
      "WST",
      "DEC",
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Key commercial bulb vegetable; sensitive to waterlogging."
  },
  {
    "id": "tomato",
    "name": "Tomato",
    "botanicalName": "Solanum lycopersicum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "100–120d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 34,
      "climate": 45,
      "economics": 56
    },
    "baseScore": 49,
    "indiaZones": [
      "DEC",
      "WST",
      "NW",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value commercial crop in Kolar; vulnerable to leaf curl virus."
  },
  {
    "id": "garlic",
    "name": "Garlic",
    "botanicalName": "Allium sativum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "130–150d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 56,
      "soil": 58,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "CEN",
      "WST",
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Antibacterial allicin bulb requiring well-drained fertile loam."
  },
  {
    "id": "oyster-mushroom",
    "name": "Oyster Mushroom",
    "botanicalName": "Pleurotus ostreatus",
    "section": "Vegetable",
    "category": "Controlled / Mushrooms",
    "season": "Zaid",
    "durationDays": "25–35d",
    "waterRequirementMm": 50,
    "factors": {
      "water": 95,
      "soil": 70,
      "terrain": 70,
      "climate": 80,
      "economics": 100
    },
    "baseScore": 83,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": true,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Controlled indoor cultivation on agricultural crop residue substrates."
  },
  {
    "id": "milky-mushroom",
    "name": "Milky Mushroom",
    "botanicalName": "Calocybe indica",
    "section": "Vegetable",
    "category": "Controlled / Mushrooms",
    "season": "Zaid",
    "durationDays": "30–40d",
    "waterRequirementMm": 50,
    "factors": {
      "water": 95,
      "soil": 70,
      "terrain": 70,
      "climate": 80,
      "economics": 100
    },
    "baseScore": 83,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": true,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Tropical indoor mushroom thriving at higher ambient summer temperatures (30-38°C)."
  },
  {
    "id": "bottle-gourd",
    "name": "Bottle Gourd",
    "botanicalName": "Lagenaria siceraria",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "65–80d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 32,
      "climate": 45,
      "economics": 67
    },
    "baseScore": 52.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Prolific vine crop yielding cooling nutritious fruits."
  },
  {
    "id": "bitter-gourd",
    "name": "Bitter Gourd",
    "botanicalName": "Momordica charantia",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 34,
      "climate": 47,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Antidiabetic charantin cucurbit cultivated on bower trellises."
  },
  {
    "id": "ridge-gourd",
    "name": "Ridge Gourd",
    "botanicalName": "Luffa acutangula",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 32,
      "climate": 45,
      "economics": 67
    },
    "baseScore": 52.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High fiber cucurbit; young fruits eaten as tender vegetable."
  },
  {
    "id": "snake-gourd",
    "name": "Snake Gourd",
    "botanicalName": "Trichosanthes cucumerina",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 480,
    "factors": {
      "water": 60,
      "soil": 52,
      "terrain": 30,
      "climate": 45,
      "economics": 56
    },
    "baseScore": 48.6,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Long cylindrical fruit popular in South and East Indian cuisine."
  },
  {
    "id": "ash-gourd-wax-gourd",
    "name": "Ash Gourd (Wax Gourd)",
    "botanicalName": "Benincasa hispida",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "90–120d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 30,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Waxy white coating gives exceptional room-temperature shelf life."
  },
  {
    "id": "pointed-gourd-parwal",
    "name": "Pointed Gourd (Parwal)",
    "botanicalName": "Trichosanthes dioica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 56,
      "soil": 56,
      "terrain": 32,
      "climate": 47,
      "economics": 67
    },
    "baseScore": 51.6,
    "indiaZones": [
      "IGP",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dioecious perennial riverbed vegetable of the Gangetic plain."
  },
  {
    "id": "ivy-gourd-tindora",
    "name": "Ivy Gourd (Tindora)",
    "botanicalName": "Coccinia grandis",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.8,
    "indiaZones": [
      "DEC",
      "WST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Perennial climbing creeper producing fruits for 4–5 years."
  },
  {
    "id": "sponge-gourd-ghia-tori",
    "name": "Sponge Gourd (Ghia Tori)",
    "botanicalName": "Luffa aegyptiaca",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 30,
      "climate": 45,
      "economics": 67
    },
    "baseScore": 52,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Smooth-skinned gourd; mature fibrous skeleton forms natural loofah."
  },
  {
    "id": "french-beans",
    "name": "French Beans",
    "botanicalName": "Phaseolus vulgaris (green)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "55–70d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value green snap bean grown in Bangalore-Ooty horticulture belt."
  },
  {
    "id": "cluster-beans-vegetable",
    "name": "Cluster Beans (Vegetable)",
    "botanicalName": "Cyamopsis tetragonoloba",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 28,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "ARD",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Tender edible pods rich in soluble dietary fiber."
  },
  {
    "id": "cauliflower",
    "name": "Cauliflower",
    "botanicalName": "Brassica oleracea var. botrytis",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "80–100d",
    "waterRequirementMm": 480,
    "factors": {
      "water": 54,
      "soil": 62,
      "terrain": 34,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 50.8,
    "indiaZones": [
      "NW",
      "IGP",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Temperature-sensitive curd vegetable demanding strict blanching."
  },
  {
    "id": "broccoli",
    "name": "Broccoli",
    "botanicalName": "Brassica oleracea var. italica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "70–85d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 56,
      "soil": 60,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Sulforaphane-rich green heading brassica for peri-urban markets."
  },
  {
    "id": "capsicum-bell-pepper",
    "name": "Capsicum (Bell Pepper)",
    "botanicalName": "Capsicum annuum var. grossum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 52,
      "soil": 58,
      "terrain": 34,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "DEC",
      "HIM",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Thick-walled sweet pepper responsive to protected greenhouse cultivation."
  },
  {
    "id": "fenugreek-leaves-methi",
    "name": "Fenugreek Leaves (Methi)",
    "botanicalName": "Trigonella foenum-graecum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "30–45d",
    "waterRequirementMm": 260,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 30,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 58,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Quick-growing aromatic winter leafy green that enriches soil nitrogen."
  },
  {
    "id": "amaranth-leaves-chaulai",
    "name": "Amaranth Leaves (Chaulai)",
    "botanicalName": "Amaranthus tricolor",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "30–40d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 59,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Heat-tolerant tropical green vegetable exceptionally rich in calcium."
  },
  {
    "id": "drumstick-leaves",
    "name": "Drumstick Leaves",
    "botanicalName": "Moringa oleifera (leaf)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 34,
      "climate": 50,
      "economics": 89
    },
    "baseScore": 61,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Superfood green harvested continuously from perennial hedges."
  },
  {
    "id": "lettuce-crisphead",
    "name": "Lettuce (Crisphead)",
    "botanicalName": "Lactuca sativa",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "50–65d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 50,
      "soil": 56,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Cool-season salad leaf; popular in high-tech hydroponic systems."
  },
  {
    "id": "celery",
    "name": "Celery",
    "botanicalName": "Apium graveolens",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "100–120d",
    "waterRequirementMm": 650,
    "factors": {
      "water": 46,
      "soil": 62,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.4,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Crisp aromatic stalk vegetable requiring steady shallow moisture."
  },
  {
    "id": "asparagus",
    "name": "Asparagus",
    "botanicalName": "Asparagus officinalis",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 66,
      "soil": 58,
      "terrain": 38,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Perennial spear vegetable producing harvests for 15+ years."
  },
  {
    "id": "globe-artichoke",
    "name": "Globe Artichoke",
    "botanicalName": "Cynara cardunculus var. scolymus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 40,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Mediterranean thistle bud vegetable cultivated in cool hill stations."
  },
  {
    "id": "button-mushroom",
    "name": "Button Mushroom",
    "botanicalName": "Agaricus bisporus",
    "section": "Vegetable",
    "category": "Controlled / Mushrooms",
    "season": "Zaid",
    "durationDays": "35–45d",
    "waterRequirementMm": 60,
    "factors": {
      "water": 90,
      "soil": 70,
      "terrain": 70,
      "climate": 80,
      "economics": 90
    },
    "baseScore": 80,
    "indiaZones": [
      "HIM",
      "NW",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": true,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Cool-climate indoor composting mushroom with high global market share."
  },
  {
    "id": "shiitake-mushroom",
    "name": "Shiitake Mushroom",
    "botanicalName": "Lentinula edodes",
    "section": "Vegetable",
    "category": "Controlled / Mushrooms",
    "season": "Rabi",
    "durationDays": "60–90d",
    "waterRequirementMm": 60,
    "factors": {
      "water": 90,
      "soil": 70,
      "terrain": 70,
      "climate": 80,
      "economics": 90
    },
    "baseScore": 80,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": true,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Medicinal wood-decay fungus cultivated indoors on hardwood sawdust blocks."
  },
  {
    "id": "zucchini-courgette",
    "name": "Zucchini (Courgette)",
    "botanicalName": "Cucurbita pepo",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "50–65d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 34,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fast-yielding summer squash popular in gourmet city markets."
  },
  {
    "id": "broad-bean-green",
    "name": "Broad Bean (Green)",
    "botanicalName": "Vicia faba (green)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "85–105d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Tender green pods picked early for sweet vegetable use."
  },
  {
    "id": "knol-khol-kohlrabi",
    "name": "Knol Khol (Kohlrabi)",
    "botanicalName": "Brassica oleracea var. gongylodes",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "55–70d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 64,
      "soil": 56,
      "terrain": 34,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Swollen edible stem vegetable common in Kashmiri and Bengali cuisine."
  },
  {
    "id": "beet-greens",
    "name": "Beet Greens",
    "botanicalName": "Beta vulgaris (leaves)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "40–50d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 68,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Nutritious mineral-dense foliage harvested during root thinning."
  },
  {
    "id": "basella-malabar-spinach",
    "name": "Basella (Malabar Spinach)",
    "botanicalName": "Basella alba",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 30,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 54.8,
    "indiaZones": [
      "EST",
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Mucilaginous heat-loving climbing green thriving in tropical monsoons."
  },
  {
    "id": "gongura-sorrel-leaf",
    "name": "Gongura (Sorrel Leaf)",
    "botanicalName": "Hibiscus sabdariffa var. altissima",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sour leafy green essential in Andhra Pradesh culinary heritage."
  },
  {
    "id": "water-spinach-kangkong",
    "name": "Water Spinach (Kangkong)",
    "botanicalName": "Ipomoea aquatica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "40–50d",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 35,
      "soil": 54,
      "terrain": 16,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 44,
    "indiaZones": [
      "EST",
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Semi-aquatic marsh green grown in wetland furrows and paddy edges."
  },
  {
    "id": "sweet-corn",
    "name": "Sweet Corn",
    "botanicalName": "Zea mays var. saccharata",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "75–85d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 60,
      "soil": 54,
      "terrain": 42,
      "climate": 50,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "DEC",
      "NW",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Harvested at milky stage for high end-consumer sugar content."
  },
  {
    "id": "baby-corn",
    "name": "Baby Corn",
    "botanicalName": "Zea mays (baby)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "55–65d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 44,
      "climate": 50,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "DEC",
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "De-tasseled unfertilized ear vegetable with rapid turnover."
  },
  {
    "id": "leek",
    "name": "Leek",
    "botanicalName": "Allium ampeloprasum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "110–130d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 52,
      "soil": 58,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Mild non-bulbing allium stalk vegetable suited to cool hill terraces."
  },
  {
    "id": "shallot-small-onion",
    "name": "Shallot (Small Onion)",
    "botanicalName": "Allium cepa var. aggregatum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "70–85d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.2,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Clustered multiplier onion indispensable in sambar and curry pastes."
  },
  {
    "id": "spring-onion-scallion",
    "name": "Spring Onion (Scallion)",
    "botanicalName": "Allium fistulosum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "45–60d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 62,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 54.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fast hollow-stem green bunching onion grown year-round."
  },
  {
    "id": "red-cabbage",
    "name": "Red Cabbage",
    "botanicalName": "Brassica oleracea var. capitata f. rubra",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "85–100d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 62,
      "soil": 60,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Anthocyanin-dense purple head cabbage for specialty salad use."
  },
  {
    "id": "brussels-sprouts",
    "name": "Brussels Sprouts",
    "botanicalName": "Brassica oleracea var. gemmifera",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "110–130d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 54,
      "soil": 62,
      "terrain": 38,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Miniature axillary bud heads requiring long cool frost-kissed autumns."
  },
  {
    "id": "kale-curly",
    "name": "Kale (Curly)",
    "botanicalName": "Brassica oleracea var. sabellica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 68,
      "soil": 56,
      "terrain": 38,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Superfood crucifer thriving across frost-prone mountain soils."
  },
  {
    "id": "bok-choy-pak-choi",
    "name": "Bok Choy (Pak Choi)",
    "botanicalName": "Brassica rapa subsp. chinensis",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "40–50d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 62,
      "soil": 54,
      "terrain": 32,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 54.8,
    "indiaZones": [
      "HIM",
      "NE",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Crisp white-stemmed Asian cabbage responsive to intensive beds."
  },
  {
    "id": "swiss-chard",
    "name": "Swiss Chard",
    "botanicalName": "Beta vulgaris subsp. vulgaris",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "50–65d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 68,
      "soil": 56,
      "terrain": 34,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rainbow-stemmed durable leafy green tolerating both heat and frost."
  },
  {
    "id": "arugula-rocket",
    "name": "Arugula (Rocket)",
    "botanicalName": "Eruca vesicaria",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "30–45d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 30,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 58,
    "indiaZones": [
      "NW",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Peppery salad green; rapid cycle between seasonal crop windows."
  },
  {
    "id": "watercress",
    "name": "Watercress",
    "botanicalName": "Nasturtium officinale",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "50–60d",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 30,
      "soil": 54,
      "terrain": 18,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 41.2,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Aquatic perennial herb requiring clean running freshwater spring beds."
  },
  {
    "id": "chayote-chow-chow",
    "name": "Chayote (Chow-Chow)",
    "botanicalName": "Sechium edule",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 64,
      "soil": 56,
      "terrain": 50,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 56.6,
    "indiaZones": [
      "NE",
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Single-seeded vigorous hill cucurbit thriving on mountain trellis nets."
  },
  {
    "id": "tinda-round-gourd",
    "name": "Tinda (Round Gourd)",
    "botanicalName": "Praecitrullus fistulosus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–70d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 28,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.4,
    "indiaZones": [
      "NW",
      "ARD",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dryland baby pumpkin prized as an early summer cucurbit in Punjab."
  },
  {
    "id": "kakrol-spine-gourd",
    "name": "Kakrol (Spine Gourd)",
    "botanicalName": "Momordica dioica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "90–120d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 34,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 56.2,
    "indiaZones": [
      "EST",
      "NE",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Wild indigenous prickly vegetable with high medicinal antioxidant value."
  },
  {
    "id": "kantola-teasel-gourd",
    "name": "Kantola (Teasel Gourd)",
    "botanicalName": "Momordica subangulata",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "90–120d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 34,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.6,
    "indiaZones": [
      "EST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Small spiny perennial cucurbit sold at premium prices in monsoon."
  },
  {
    "id": "kohlrabi-purple",
    "name": "Kohlrabi (Purple)",
    "botanicalName": "Brassica oleracea var. gongylodes (purple)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "55–70d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 64,
      "soil": 56,
      "terrain": 34,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Anthocyanin-tinted stem bulb with mild sweet crisp flesh."
  },
  {
    "id": "rutabaga-swede",
    "name": "Rutabaga (Swede)",
    "botanicalName": "Brassica napus var. napobrassica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "90–110d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 62,
      "soil": 54,
      "terrain": 36,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Hardy winter storage root cross between cabbage and turnip."
  },
  {
    "id": "fennel-bulb-florence",
    "name": "Fennel Bulb (Florence)",
    "botanicalName": "Foeniculum vulgare var. azoricum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "80–100d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 56,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Anise-flavored overlapping leaf base bulb for gourmet dining."
  },
  {
    "id": "chive-garlic-chive",
    "name": "Chive (Garlic Chive)",
    "botanicalName": "Allium tuberosum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 34,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 56.2,
    "indiaZones": [
      "NE",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Perennial flat-leaf allium with mild garlic flavor harvested continually."
  },
  {
    "id": "endive-escarole",
    "name": "Endive (Escarole)",
    "botanicalName": "Cichorium endivia",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 60,
      "soil": 54,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.2,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Slightly bitter curly salad chicory popular for winter harvest."
  },
  {
    "id": "radicchio",
    "name": "Radicchio",
    "botanicalName": "Cichorium intybus var. foliosum",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "75–90d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Wine-red Italian heading chicory with distinct gourmet bitterness."
  },
  {
    "id": "purslane-kulfa",
    "name": "Purslane (Kulfa)",
    "botanicalName": "Portulaca oleracea",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "30–45d",
    "waterRequirementMm": 200,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 30,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 59.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Succulent wild green with highest omega-3 fatty acid levels among greens."
  },
  {
    "id": "mallow-leaves-khubazi",
    "name": "Mallow Leaves (Khubazi)",
    "botanicalName": "Malva verticillata",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Rabi",
    "durationDays": "45–60d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 36,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Mucilaginous soothing winter vegetable used in traditional cuisine."
  },
  {
    "id": "chekkurmanis-sweet-shoot",
    "name": "Chekkurmanis (Sweet Shoot)",
    "botanicalName": "Sauropus androgynus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 32,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Multivitamin plant of Kerala home gardens; high protein leaf hedge."
  },
  {
    "id": "agathi-hummingbird-tree",
    "name": "Agathi (Hummingbird Tree)",
    "botanicalName": "Sesbania grandiflora",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 30,
      "climate": 50,
      "economics": 78
    },
    "baseScore": 57,
    "indiaZones": [
      "SOU",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing legume tree; large edible white/red flowers and tender pods."
  },
  {
    "id": "curry-cucumber-dosakaya",
    "name": "Curry Cucumber (Dosakaya)",
    "botanicalName": "Cucumis melo subsp. agrestis",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "65–80d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 30,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.8,
    "indiaZones": [
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sturdy non-bitter cooking melon essential in Telugu dal recipes."
  },
  {
    "id": "madras-cucumber",
    "name": "Madras Cucumber",
    "botanicalName": "Cucumis sativus var. sikkimensis",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "70–85d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.2,
    "indiaZones": [
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rusty-brown netted culinary cucumber with long keeping quality."
  },
  {
    "id": "snapmelon-phoot",
    "name": "Snapmelon (Phoot)",
    "botanicalName": "Cucumis melo var. momordica",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "65–75d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 76,
      "soil": 48,
      "terrain": 28,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 54.8,
    "indiaZones": [
      "NW",
      "ARD",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Bursting summer melon adapted to dry sandy river beds."
  },
  {
    "id": "kachri",
    "name": "Kachri",
    "botanicalName": "Cucumis callosus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 180,
    "factors": {
      "water": 89,
      "soil": 46,
      "terrain": 26,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Wild arid desert cucurbit dried into a pungent souring powder."
  },
  {
    "id": "yam-bean-jicama",
    "name": "Yam Bean (Jicama)",
    "botanicalName": "Pachyrhizus erosus",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 30,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.8,
    "indiaZones": [
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Leguminous vine producing crisp sweet watery tubers."
  },
  {
    "id": "bamboo-shoots",
    "name": "Bamboo Shoots",
    "botanicalName": "Dendrocalamus asper (shoots)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 800,
    "factors": {
      "water": 64,
      "soil": 64,
      "terrain": 50,
      "climate": 50,
      "economics": 67
    },
    "baseScore": 59,
    "indiaZones": [
      "NE",
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fermented and canned succulent edible shoots of giant bamboo."
  },
  {
    "id": "banana-blossom-mocha",
    "name": "Banana Blossom (Mocha)",
    "botanicalName": "Musa acuminata (flower)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 38,
      "soil": 62,
      "terrain": 26,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 45.2,
    "indiaZones": [
      "EST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Heart-shaped terminal inflorescence cooked as high-fiber delicacy."
  },
  {
    "id": "plantain-stem-thandu",
    "name": "Plantain Stem (Thandu)",
    "botanicalName": "Musa balbisiana (stem)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 38,
      "soil": 62,
      "terrain": 26,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 45.2,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Inner tender core of pseudostem prized for kidney stone prevention."
  },
  {
    "id": "colocasia-leaves-patra",
    "name": "Colocasia Leaves (Patra)",
    "botanicalName": "Colocasia esculenta (leaves)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "60–90d",
    "waterRequirementMm": 900,
    "factors": {
      "water": 45,
      "soil": 56,
      "terrain": 28,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 48.4,
    "indiaZones": [
      "WST",
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Large heart-shaped leaves rolled with spiced chickpea paste."
  },
  {
    "id": "makhana-fox-nut",
    "name": "Makhana (Fox Nut)",
    "botanicalName": "Euryale ferox",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "180–210d",
    "waterRequirementMm": 1600,
    "factors": {
      "water": 28,
      "soil": 56,
      "terrain": 12,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 39.2,
    "indiaZones": [
      "IGP",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Prickly aquatic water lily nut harvested from traditional Bihar wetlands."
  },
  {
    "id": "shevanti-flower-edible",
    "name": "Shevanti Flower (Edible)",
    "botanicalName": "Chrysanthemum coronarium",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "45–60d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 55.4,
    "indiaZones": [
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Garland chrysanthemum leaves and petals used as aromatic green."
  },
  {
    "id": "roselle-calyces-sorrel",
    "name": "Roselle Calyces (Sorrel)",
    "botanicalName": "Hibiscus sabdariffa (calyx)",
    "section": "Vegetable",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "120–150d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 55.8,
    "indiaZones": [
      "EST",
      "DEC",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fleshy ruby red calyces brewed into tangy herbal infusions and jams."
  },
  {
    "id": "enoki-mushroom",
    "name": "Enoki Mushroom",
    "botanicalName": "Flammulina velutipes",
    "section": "Vegetable",
    "category": "Controlled / Mushrooms",
    "season": "Rabi",
    "durationDays": "40–50d",
    "waterRequirementMm": 60,
    "factors": {
      "water": 90,
      "soil": 70,
      "terrain": 70,
      "climate": 80,
      "economics": 90
    },
    "baseScore": 80,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": true,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Delicate long-stemmed winter mushroom cultivated in cool dark chambers."
  },
  {
    "id": "paddy-straw-mushroom",
    "name": "Paddy Straw Mushroom",
    "botanicalName": "Volvariella volvacea",
    "section": "Vegetable",
    "category": "Controlled / Mushrooms",
    "season": "Zaid",
    "durationDays": "15–20d",
    "waterRequirementMm": 80,
    "factors": {
      "water": 85,
      "soil": 70,
      "terrain": 70,
      "climate": 80,
      "economics": 90
    },
    "baseScore": 79,
    "indiaZones": [
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": true,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing high-temperature tropical mushroom grown on soaked rice straw."
  },
  {
    "id": "ber-indian-jujube",
    "name": "Ber (Indian Jujube)",
    "botanicalName": "Ziziphus mauritiana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 93,
      "soil": 62,
      "terrain": 38,
      "climate": 52,
      "economics": 100
    },
    "baseScore": 69,
    "indiaZones": [
      "ARD",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Poor man's apple; supreme desert resilience and saline soil tolerance."
  },
  {
    "id": "bael",
    "name": "Bael",
    "botanicalName": "Aegle marmelos",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 89,
      "soil": 62,
      "terrain": 36,
      "climate": 53,
      "economics": 100
    },
    "baseScore": 68,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sacred fruit with mucilaginous cooling pulp that cures digestive ailments."
  },
  {
    "id": "amla-indian-gooseberry",
    "name": "Amla (Indian Gooseberry)",
    "botanicalName": "Phyllanthus emblica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 87,
      "soil": 62,
      "terrain": 36,
      "climate": 49,
      "economics": 100
    },
    "baseScore": 66.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Richest natural source of vitamin C; thrives on degraded sodic wastelands."
  },
  {
    "id": "mulberry",
    "name": "Mulberry",
    "botanicalName": "Morus alba",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 82,
      "soil": 60,
      "terrain": 41,
      "climate": 44,
      "economics": 100
    },
    "baseScore": 65.4,
    "indiaZones": [
      "DEC",
      "SOU",
      "HIM",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Silk industry anchor; highly resilient perennial forage and delicious fruit."
  },
  {
    "id": "fig-anjeer",
    "name": "Fig (Anjeer)",
    "botanicalName": "Ficus carica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 80,
      "soil": 60,
      "terrain": 38,
      "climate": 49,
      "economics": 89
    },
    "baseScore": 63.2,
    "indiaZones": [
      "WST",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Drought-hardy subtropical fruit thriving in dry limestone and black soils."
  },
  {
    "id": "pomegranate",
    "name": "Pomegranate",
    "botanicalName": "Punica granatum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 78,
      "soil": 62,
      "terrain": 40,
      "climate": 43,
      "economics": 89
    },
    "baseScore": 62.4,
    "indiaZones": [
      "DEC",
      "WST",
      "ARD",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Major commercial cash crop of North Karnataka and Maharashtra dry belts."
  },
  {
    "id": "tamarind",
    "name": "Tamarind",
    "botanicalName": "Tamarindus indica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 82,
      "soil": 58,
      "terrain": 30,
      "climate": 43,
      "economics": 89
    },
    "baseScore": 60.4,
    "indiaZones": [
      "SOU",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Centuries-living dryland highway tree yielding acidic pulp and durable timber."
  },
  {
    "id": "jamun-black-plum",
    "name": "Jamun (Black Plum)",
    "botanicalName": "Syzygium cumini",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 73,
      "soil": 62,
      "terrain": 34,
      "climate": 50,
      "economics": 78
    },
    "baseScore": 59.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Antidiabetic fruit that tolerates periodic waterlogging and poor soils."
  },
  {
    "id": "custard-apple-sitaphal",
    "name": "Custard Apple (Sitaphal)",
    "botanicalName": "Annona squamosa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 48,
      "terrain": 42,
      "climate": 41,
      "economics": 78
    },
    "baseScore": 58.2,
    "indiaZones": [
      "DEC",
      "WST",
      "CEN",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Wild hillside fruit tree unpalatable to goats and monkeys; sweet creamy pulp."
  },
  {
    "id": "guava",
    "name": "Guava",
    "botanicalName": "Psidium guajava",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 34,
      "climate": 47,
      "economics": 56
    },
    "baseScore": 51.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Prolific fruit yielding 2–3 crops a year on varied soils."
  },
  {
    "id": "acid-lime-kagzi-nimbu",
    "name": "Acid Lime (Kagzi Nimbu)",
    "botanicalName": "Citrus aurantiifolia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 62,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "DEC",
      "WST",
      "SOU",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Year-round flowering citrus essential for culinary juice and citric acid."
  },
  {
    "id": "dragon-fruit-kamalam",
    "name": "Dragon Fruit (Kamalam)",
    "botanicalName": "Selenicereus undatus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 42,
      "terrain": 32,
      "climate": 38,
      "economics": 45
    },
    "baseScore": 47.8,
    "indiaZones": [
      "ARD",
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Climbing cactus yielding vibrant antioxidant fruits with minimal water."
  },
  {
    "id": "sapota-chikoo",
    "name": "Sapota (Chikoo)",
    "botanicalName": "Manilkara zapota",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 700,
    "factors": {
      "water": 60,
      "soil": 52,
      "terrain": 30,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 46.6,
    "indiaZones": [
      "WST",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Evergreen tree producing sweet malty fruits continuously in maritime air."
  },
  {
    "id": "mango",
    "name": "Mango",
    "botanicalName": "Mangifera indica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 54,
      "soil": 58,
      "terrain": 32,
      "climate": 41,
      "economics": 45
    },
    "baseScore": 46,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "King of fruits; requires distinct dry season for synchronized winter flowering."
  },
  {
    "id": "papaya",
    "name": "Papaya",
    "botanicalName": "Carica papaya",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 42,
      "soil": 52,
      "terrain": 22,
      "climate": 45,
      "economics": 23
    },
    "baseScore": 36.8,
    "indiaZones": [
      "SOU",
      "DEC",
      "WST",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Rapid herbaceous fruit; highly sensitive to root waterlogging and frost."
  },
  {
    "id": "banana",
    "name": "Banana",
    "botanicalName": "Musa paradisiaca",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1600,
    "factors": {
      "water": 31,
      "soil": 62,
      "terrain": 18,
      "climate": 49,
      "economics": 23
    },
    "baseScore": 36.6,
    "indiaZones": [
      "SOU",
      "DEC",
      "WST",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Heavy consumer of water and potassium; high risk under groundwater limits."
  },
  {
    "id": "wood-apple",
    "name": "Wood Apple",
    "botanicalName": "Limonia acidissima",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 85,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 62,
    "indiaZones": [
      "DEC",
      "CEN",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hard-shelled arid fruit used for cooling sherbets."
  },
  {
    "id": "karonda",
    "name": "Karonda",
    "botanicalName": "Carissa carandas",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 310,
    "factors": {
      "water": 89,
      "soil": 50,
      "terrain": 36,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 61.6,
    "indiaZones": [
      "DEC",
      "WST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Thorny dryland hedge bearing sour crimson fruits for pickling."
  },
  {
    "id": "phalsa",
    "name": "Phalsa",
    "botanicalName": "Grewia asiatica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 85,
      "soil": 52,
      "terrain": 34,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 59,
    "indiaZones": [
      "NW",
      "CEN",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Arid shrub yielding refreshing purple berry sherbet in peak summer."
  },
  {
    "id": "jackfruit",
    "name": "Jackfruit",
    "botanicalName": "Artocarpus heterophyllus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 60,
      "terrain": 38,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Largest tree fruit; resilient staple and vegan meat alternative."
  },
  {
    "id": "breadfruit",
    "name": "Breadfruit",
    "botanicalName": "Artocarpus altilis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 60,
      "terrain": 32,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 47.6,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Starchy staple tree cultivated in humid coastal rainforests."
  },
  {
    "id": "sweet-orange-mosambi",
    "name": "Sweet Orange (Mosambi)",
    "botanicalName": "Citrus sinensis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 640,
    "factors": {
      "water": 56,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "WST",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Popular table citrus with sweet low-acid juice."
  },
  {
    "id": "mandarin-orange",
    "name": "Mandarin Orange",
    "botanicalName": "Citrus reticulata",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 58,
      "terrain": 44,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "NE",
      "HIM",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Nagpur and Coorg loose-jacket oranges with balanced sweet-tang."
  },
  {
    "id": "kinnow",
    "name": "Kinnow",
    "botanicalName": "Citrus nobilis x deliciosa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 58,
      "terrain": 30,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Prolific juicy hybrid mandarin of Punjab canal colonies."
  },
  {
    "id": "pomelo",
    "name": "Pomelo",
    "botanicalName": "Citrus maxima",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.4,
    "indiaZones": [
      "EST",
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Largest citrus fruit with sweet pink vesicular segments."
  },
  {
    "id": "grapefruit",
    "name": "Grapefruit",
    "botanicalName": "Citrus paradisi",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 660,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 48.4,
    "indiaZones": [
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Subtropical citrus known for mild bitterness and weight management."
  },
  {
    "id": "passion-fruit",
    "name": "Passion Fruit",
    "botanicalName": "Passiflora edulis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 640,
    "factors": {
      "water": 56,
      "soil": 54,
      "terrain": 42,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "NE",
      "SOU",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Aromatic purple and yellow vine fruit of highland plantations."
  },
  {
    "id": "mangosteen",
    "name": "Mangosteen",
    "botanicalName": "Garcinia mangostana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 880,
    "factors": {
      "water": 32,
      "soil": 64,
      "terrain": 30,
      "climate": 50,
      "economics": 45
    },
    "baseScore": 44.2,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Queen of tropical fruits; demands ultra-humid rainforest microclimate."
  },
  {
    "id": "rambutan",
    "name": "Rambutan",
    "botanicalName": "Nephelium lappaceum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 35,
      "soil": 62,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Hairy red exotic fruit thriving in Kerala's riverine orchards."
  },
  {
    "id": "durian",
    "name": "Durian",
    "botanicalName": "Durio zibethinus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 920,
    "factors": {
      "water": 28,
      "soil": 62,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 42.6,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "King of Asian fruits; pungent creamy aril needing high rainfall."
  },
  {
    "id": "lychee",
    "name": "Lychee",
    "botanicalName": "Litchi chinensis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 45,
      "soil": 62,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.2,
    "indiaZones": [
      "IGP",
      "EST",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Subtropical delicacy of Muzaffarpur requiring high humidity at fruiting."
  },
  {
    "id": "longan",
    "name": "Longan",
    "botanicalName": "Dimocarpus longan",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 34,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.4,
    "indiaZones": [
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Dragon eye sweet fruit related to lychee but more cold-tolerant."
  },
  {
    "id": "star-fruit-carambola",
    "name": "Star Fruit (Carambola)",
    "botanicalName": "Averrhoa carambola",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 640,
    "factors": {
      "water": 56,
      "soil": 54,
      "terrain": 32,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "SOU",
      "EST",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Five-angled ribbed fruit eaten fresh or pickled."
  },
  {
    "id": "bilimbi",
    "name": "Bilimbi",
    "botanicalName": "Averrhoa bilimbi",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 660,
    "factors": {
      "water": 54,
      "soil": 52,
      "terrain": 30,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 50.2,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Intensely sour cucumber-like tree fruit used in coastal fish curries."
  },
  {
    "id": "date-palm",
    "name": "Date Palm",
    "botanicalName": "Phoenix dactylifera",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 24,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 55.4,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Desert oasis palm; loves feet in water and head in desert sun."
  },
  {
    "id": "apple-delicious",
    "name": "Apple (Delicious)",
    "botanicalName": "Malus domestica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 62,
      "terrain": 50,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Temperate mountain king requiring 800+ winter chilling hours."
  },
  {
    "id": "pear-patharnakh",
    "name": "Pear (Patharnakh)",
    "botanicalName": "Pyrus pyrifolia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 580,
    "factors": {
      "water": 62,
      "soil": 58,
      "terrain": 42,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Low-chill crisp sand pear adapted to North Indian plains and foothills."
  },
  {
    "id": "peach-low-chill",
    "name": "Peach (Low-chill)",
    "botanicalName": "Prunus persica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 44,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.6,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Velvety stone fruit grown across subtropical valleys and mountain slopes."
  },
  {
    "id": "plum-santa-rosa",
    "name": "Plum (Santa Rosa)",
    "botanicalName": "Prunus domestica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 44,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Juicy purple drupe requiring moderate chilling and well-drained hillsides."
  },
  {
    "id": "apricot-chuli",
    "name": "Apricot (Chuli)",
    "botanicalName": "Prunus armeniaca",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 520,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 48,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-altitude cold-tolerant stone fruit of Ladakh and Kinnaur."
  },
  {
    "id": "sweet-cherry",
    "name": "Sweet Cherry",
    "botanicalName": "Prunus avium",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 60,
      "terrain": 52,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 51.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value delicate fruit requiring cool temperate valley climates."
  },
  {
    "id": "almond-fruit-nut",
    "name": "Almond (Fruit/Nut)",
    "botanicalName": "Prunus dulcis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 490,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 56,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Kashmir stone fruit producing valuable kernel inside velvety hull."
  },
  {
    "id": "kiwi-fruit",
    "name": "Kiwi Fruit",
    "botanicalName": "Actinidia deliciosa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 60,
      "terrain": 46,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Vigorous dioecious vine demanding high organic matter and winter chill."
  },
  {
    "id": "strawberry",
    "name": "Strawberry",
    "botanicalName": "Fragaria x ananassa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 45,
      "soil": 60,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.6,
    "indiaZones": [
      "WST",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value commercial berry grown on plastic mulch with drip."
  },
  {
    "id": "blueberry",
    "name": "Blueberry",
    "botanicalName": "Vaccinium corymbosum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 54,
      "terrain": 40,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 47.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Acidic-soil specialist producing antioxidant-rich blue berries."
  },
  {
    "id": "blackberry",
    "name": "Blackberry",
    "botanicalName": "Rubus fruticosus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 52,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Thorny bramble producing sweet-tart dark aggregate berries."
  },
  {
    "id": "raspberry",
    "name": "Raspberry",
    "botanicalName": "Rubus idaeus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 54,
      "terrain": 44,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Delicate aggregate cane fruit suited to temperate mountain slopes."
  },
  {
    "id": "cranberry",
    "name": "Cranberry",
    "botanicalName": "Vaccinium macrocarpon",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 35,
      "soil": 52,
      "terrain": 38,
      "climate": 44,
      "economics": 45
    },
    "baseScore": 42.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Bog-dwelling acidic wetland berry requiring specialized water beds."
  },
  {
    "id": "grape-thompson",
    "name": "Grape (Thompson)",
    "botanicalName": "Vitis vinifera",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 58,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Major commercial vine in Nashik; requires pruning for double cropping."
  },
  {
    "id": "pineapple-kew",
    "name": "Pineapple (Kew)",
    "botanicalName": "Ananas comosus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 640,
    "factors": {
      "water": 56,
      "soil": 52,
      "terrain": 38,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "NE",
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Bromeliad fruit thriving on acidic red laterites on hill contours."
  },
  {
    "id": "avocado-butter-fruit",
    "name": "Avocado (Butter Fruit)",
    "botanicalName": "Persea americana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 60,
      "terrain": 40,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "SOU",
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-fat subtropical fruit sensitive to saline soils and frost."
  },
  {
    "id": "soursop-graviola",
    "name": "Soursop (Graviola)",
    "botanicalName": "Annona muricata",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 660,
    "factors": {
      "water": 54,
      "soil": 54,
      "terrain": 34,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Large prickly green annona fruit with refreshing musky-sour pulp."
  },
  {
    "id": "cherimoya",
    "name": "Cherimoya",
    "botanicalName": "Annona cherimola",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 54,
      "terrain": 44,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 51.6,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Highland custard apple praised as the most delicious fruit known to man."
  },
  {
    "id": "white-sapote",
    "name": "White Sapote",
    "botanicalName": "Casimiroa edulis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 38,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.8,
    "indiaZones": [
      "DEC",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Subtropical citrus relative producing sweet creamy avocado-like fruit."
  },
  {
    "id": "black-sapote-chocolate-pudding",
    "name": "Black Sapote (Chocolate Pudding)",
    "botanicalName": "Diospyros nigra",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 660,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 32,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Persimmon relative whose ripe pulp resembles dark chocolate pudding."
  },
  {
    "id": "mamey-sapote",
    "name": "Mamey Sapote",
    "botanicalName": "Pouteria sapota",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 32,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 46.2,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Large Central American fruit with rich almond-apricot orange flesh."
  },
  {
    "id": "canistel-egg-fruit",
    "name": "Canistel (Egg Fruit)",
    "botanicalName": "Pouteria campechiana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 580,
    "factors": {
      "water": 62,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dense sweet orange-yellow fruit with texture of hard-boiled egg yolk."
  },
  {
    "id": "persimmon-japani-phal",
    "name": "Persimmon (Japani Phal)",
    "botanicalName": "Diospyros kaki",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 58,
      "terrain": 44,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Astringent and non-astringent autumnal tree fruit of Himachal."
  },
  {
    "id": "loquat",
    "name": "Loquat",
    "botanicalName": "Eriobotrya japonica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 56,
      "terrain": 38,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.6,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Subtropical evergreen tree producing sweet juicy yellow pome fruits."
  },
  {
    "id": "quince",
    "name": "Quince",
    "botanicalName": "Cydonia oblonga",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 540,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 42,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Aromatic astringent pome fruit used for traditional jellies and pectin."
  },
  {
    "id": "medlar",
    "name": "Medlar",
    "botanicalName": "Mespilus germanica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 520,
    "factors": {
      "water": 68,
      "soil": 54,
      "terrain": 44,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Ancient European fruit eaten when bletted after winter frosts."
  },
  {
    "id": "pecan-fruit-nut",
    "name": "Pecan (Fruit/Nut)",
    "botanicalName": "Carya illinoinensis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 640,
    "factors": {
      "water": 56,
      "soil": 62,
      "terrain": 40,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Large deciduous tree producing rich buttery kernels."
  },
  {
    "id": "walnut-akhrot",
    "name": "Walnut (Akhrot)",
    "botanicalName": "Juglans regia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 580,
    "factors": {
      "water": 62,
      "soil": 62,
      "terrain": 50,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 56.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Traditional mountain nut tree of Kashmir and Himachal Pradesh."
  },
  {
    "id": "chestnut-sweet",
    "name": "Chestnut (Sweet)",
    "botanicalName": "Castanea sativa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 48,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Starchy sweet nut roasted in European and Himalayan winters."
  },
  {
    "id": "pistachio",
    "name": "Pistachio",
    "botanicalName": "Pistacia vera",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 36,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "HIM",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Desert mountain nut with outstanding tolerance to drought and salinity."
  },
  {
    "id": "hazelnut-filbert",
    "name": "Hazelnut (Filbert)",
    "botanicalName": "Corylus avellana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 640,
    "factors": {
      "water": 56,
      "soil": 56,
      "terrain": 46,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Temperate multi-stem shrub producing heart-healthy dessert nuts."
  },
  {
    "id": "macadamia-nut",
    "name": "Macadamia Nut",
    "botanicalName": "Macadamia integrifolia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 36,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 46.6,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Premium buttery nut requiring deep fertile soil and mild subtropics."
  },
  {
    "id": "cashew-apple-nut",
    "name": "Cashew Apple & Nut",
    "botanicalName": "Anacardium occidentale",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 48,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "SOU",
      "WST",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Drought-hardy coastal tree producing edible apple and prized nut."
  },
  {
    "id": "areca-palm-betel-nut",
    "name": "Areca Palm (Betel Nut)",
    "botanicalName": "Areca catechu",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 880,
    "factors": {
      "water": 32,
      "soil": 62,
      "terrain": 22,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 41.2,
    "indiaZones": [
      "SOU",
      "NE",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Slender palm bearing mastulatory betel nut; high water demand."
  },
  {
    "id": "betel-leaf-vine",
    "name": "Betel Leaf Vine",
    "botanicalName": "Piper betle",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 64,
      "terrain": 28,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 47.6,
    "indiaZones": [
      "EST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Shade-loving medicinal vine cultivated in conserved moisture barejas."
  },
  {
    "id": "water-apple-rose-apple",
    "name": "Water Apple (Rose Apple)",
    "botanicalName": "Syzygium samarangense",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 28,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 47.6,
    "indiaZones": [
      "SOU",
      "EST",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Crisp watery bell-shaped fruit eaten fresh with salt and chilli."
  },
  {
    "id": "wax-apple",
    "name": "Wax Apple",
    "botanicalName": "Syzygium aqueum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 28,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 47.6,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Glossy translucent tropical fruit refreshing on hot summer days."
  },
  {
    "id": "malay-apple",
    "name": "Malay Apple",
    "botanicalName": "Syzygium malaccense",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 60,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Oblong crimson fruit with fragrant white flesh native to Malaysia."
  },
  {
    "id": "black-mulberry",
    "name": "Black Mulberry",
    "botanicalName": "Morus nigra",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 420,
    "factors": {
      "water": 78,
      "soil": 58,
      "terrain": 40,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 59.6,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Large tart-sweet black berries prized for syrup and winemaking."
  },
  {
    "id": "goji-berry-wolfberry",
    "name": "Goji Berry (Wolfberry)",
    "botanicalName": "Lycium barbarum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 82,
      "soil": 50,
      "terrain": 44,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 59.2,
    "indiaZones": [
      "HIM",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Arid super-fruit rich in zeaxanthin and polysaccharides."
  },
  {
    "id": "sea-buckthorn",
    "name": "Sea Buckthorn",
    "botanicalName": "Hippophae rhamnoides",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 310,
    "factors": {
      "water": 89,
      "soil": 48,
      "terrain": 58,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 64.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Thorny cold desert bush of Ladakh producing vitamin-packed orange berries."
  },
  {
    "id": "elderberry",
    "name": "Elderberry",
    "botanicalName": "Sambucus nigra",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 580,
    "factors": {
      "water": 62,
      "soil": 54,
      "terrain": 42,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Immune-boosting dark purple berry used in antiviral syrups and wines."
  },
  {
    "id": "aroniaberry-chokeberry",
    "name": "Aroniaberry (Chokeberry)",
    "botanicalName": "Aronia melanocarpa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 520,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Highest polyphenol antioxidant concentration among temperate berries."
  },
  {
    "id": "honeyberry-haskap",
    "name": "Honeyberry (Haskap)",
    "botanicalName": "Lonicera caerulea",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 490,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 48,
      "climate": 38,
      "economics": 67
    },
    "baseScore": 55.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Earliest ripening spring berry surviving down to -45°C winter cold."
  },
  {
    "id": "serviceberry-saskatoon",
    "name": "Serviceberry (Saskatoon)",
    "botanicalName": "Amelanchier alnifolia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 470,
    "factors": {
      "water": 73,
      "soil": 50,
      "terrain": 46,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 55.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Sweet blueberry-like pome fruit adapted to dry cold mountain conditions."
  },
  {
    "id": "jostaberry",
    "name": "Jostaberry",
    "botanicalName": "Ribes x nidigrolaria",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 60,
      "soil": 54,
      "terrain": 44,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Disease-resistant thornless hybrid of blackcurrant and gooseberry."
  },
  {
    "id": "cape-gooseberry-rasbhari",
    "name": "Cape Gooseberry (Rasbhari)",
    "botanicalName": "Physalis peruviana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 540,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 34,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Papery husked golden berry packed with vitamins and bioflavonoids."
  },
  {
    "id": "tamarillo-tree-tomato",
    "name": "Tamarillo (Tree Tomato)",
    "botanicalName": "Solanum betaceum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 660,
    "factors": {
      "water": 54,
      "soil": 54,
      "terrain": 44,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 50.8,
    "indiaZones": [
      "HIM",
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Fast-growing subtropical tree bearing egg-shaped tangy-sweet fruits."
  },
  {
    "id": "feijoa-pineapple-guava",
    "name": "Feijoa (Pineapple Guava)",
    "botanicalName": "Acca sellowiana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 520,
    "factors": {
      "water": 68,
      "soil": 54,
      "terrain": 40,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Frost-hardy evergreen shrub yielding fragrant guava-mint fruits."
  },
  {
    "id": "jabuticaba-tree-grape",
    "name": "Jabuticaba (Tree Grape)",
    "botanicalName": "Plinia cauliflora",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 740,
    "factors": {
      "water": 46,
      "soil": 62,
      "terrain": 32,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 46.6,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Brazilian cauliflorous tree bearing dark purple grape-like fruits on trunk."
  },
  {
    "id": "pitanga-surinam-cherry",
    "name": "Pitanga (Surinam Cherry)",
    "botanicalName": "Eugenia uniflora",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 540,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Ribbed resinous cherry-like fruit rich in vitamin A and antioxidants."
  },
  {
    "id": "grumichama-brazil-cherry",
    "name": "Grumichama (Brazil Cherry)",
    "botanicalName": "Eugenia brasiliensis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 58,
      "terrain": 32,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Sweet melting cherry substitute adapted to humid subtropical red soils."
  },
  {
    "id": "monstera-deliciosa-fruit",
    "name": "Monstera Deliciosa Fruit",
    "botanicalName": "Monstera deliciosa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 800,
    "factors": {
      "water": 40,
      "soil": 60,
      "terrain": 28,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44.2,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Epiphytic rainforest vine yielding pineapple-banana flavored spadix."
  },
  {
    "id": "salak-snake-fruit",
    "name": "Salak (Snake Fruit)",
    "botanicalName": "Salacca zalacca",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 880,
    "factors": {
      "water": 32,
      "soil": 64,
      "terrain": 28,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 43.4,
    "indiaZones": [
      "ISL",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Spiny palm fruit with snake-skin scales and sweet crunchy segments."
  },
  {
    "id": "noni-indian-mulberry",
    "name": "Noni (Indian Mulberry)",
    "botanicalName": "Morinda citrifolia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 420,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 28,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "ISL",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Coastal pioneer tree with intense pungent medicinal antioxidant juice."
  },
  {
    "id": "barbados-cherry-acerola",
    "name": "Barbados Cherry (Acerola)",
    "botanicalName": "Malpighia emarginata",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 540,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Record-high vitamin C tropical berry fruiting multiple times yearly."
  },
  {
    "id": "miracle-fruit",
    "name": "Miracle Fruit",
    "botanicalName": "Synsepalum dulcificum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 700,
    "factors": {
      "water": 50,
      "soil": 54,
      "terrain": 30,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Miraculin glycoprotein turns sour acidic tastes delightfully sweet."
  },
  {
    "id": "safou-african-pear",
    "name": "Safou (African Pear)",
    "botanicalName": "Dacryodes edulis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 740,
    "factors": {
      "water": 46,
      "soil": 58,
      "terrain": 32,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 45.4,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Buttery oil-rich forest tree fruit roasted as nutritious vegetable."
  },
  {
    "id": "ackee",
    "name": "Ackee",
    "botanicalName": "Blighia sapida",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 660,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 46.6,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "National fruit of Jamaica; yellow arils boiled as savory delicacy."
  },
  {
    "id": "langsat-duku",
    "name": "Langsat (Duku)",
    "botanicalName": "Lansium domesticum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 820,
    "factors": {
      "water": 38,
      "soil": 62,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44.6,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Translucent sweet-sour segmented fruit borne in grape-like clusters."
  },
  {
    "id": "santol",
    "name": "Santol",
    "botanicalName": "Sandoricum koetjape",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 56,
      "terrain": 32,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Fast-growing Southeast Asian fruit tree yielding sweet or sour pulp."
  },
  {
    "id": "marang",
    "name": "Marang",
    "botanicalName": "Artocarpus odoratissimus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 60,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "ISL",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Exotic cousin of jackfruit with soft spines and exquisite melon-creamy flesh."
  },
  {
    "id": "cempedak",
    "name": "Cempedak",
    "botanicalName": "Artocarpus integer",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 45,
      "soil": 60,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 45.6,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Smaller sweeter cousin of jackfruit with stringy fragrant golden arils."
  },
  {
    "id": "monkey-jack-badhal",
    "name": "Monkey Jack (Badhal)",
    "botanicalName": "Artocarpus lakoocha",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 58,
      "terrain": 36,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "EST",
      "NE",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Indigenous wild fruit tree eaten raw or cooked in tart curries."
  },
  {
    "id": "kokum",
    "name": "Kokum",
    "botanicalName": "Garcinia indica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 580,
    "factors": {
      "water": 62,
      "soil": 60,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "WST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Western Ghats endemic tree yielding souring rinds and edible butter."
  },
  {
    "id": "malabar-tamarind-kudampuli",
    "name": "Malabar Tamarind (Kudampuli)",
    "botanicalName": "Garcinia gummi-gutta",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 62,
      "terrain": 36,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "SOU",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Hydroxycitric acid rich fruit sun-smoked for authentic fish curries."
  },
  {
    "id": "egg-fruit-lucuma",
    "name": "Egg Fruit (Lucuma)",
    "botanicalName": "Pouteria lucuma",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 60,
      "soil": 54,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Andean fruit with mapley sweet flesh dried into natural sweetener."
  },
  {
    "id": "cupuacu",
    "name": "Cupuacu",
    "botanicalName": "Theobroma grandiflorum",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 880,
    "factors": {
      "water": 32,
      "soil": 64,
      "terrain": 28,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 43.4,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Amazonian relative of cocoa producing white chocolate and creamy pulp."
  },
  {
    "id": "bacuri",
    "name": "Bacuri",
    "botanicalName": "Platonia insignis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 60,
      "terrain": 28,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44.6,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Amazonian tree fruit with snow-white pulp prized for ice creams."
  },
  {
    "id": "pitaya-yellow-dragon",
    "name": "Pitaya (Yellow Dragon)",
    "botanicalName": "Selenicereus megalanthus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 80,
      "soil": 44,
      "terrain": 34,
      "climate": 38,
      "economics": 45
    },
    "baseScore": 48.2,
    "indiaZones": [
      "ARD",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sweeter spiny yellow dragon fruit native to South American valleys."
  },
  {
    "id": "prickly-pear-cactus-fruit",
    "name": "Prickly Pear (Cactus Fruit)",
    "botanicalName": "Opuntia ficus-indica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 95,
      "soil": 42,
      "terrain": 38,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 56.4,
    "indiaZones": [
      "ARD",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Supreme drought-surviving cactus bearing sweet refreshing magenta fruits."
  },
  {
    "id": "chupa-chupa",
    "name": "Chupa Chupa",
    "botanicalName": "Quararibea cordata",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 780,
    "factors": {
      "water": 42,
      "soil": 58,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44.6,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "South American forest tree yielding fibrous sweet apricot-like pulp."
  },
  {
    "id": "genipapo",
    "name": "Genipapo",
    "botanicalName": "Genipa americana",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 720,
    "factors": {
      "water": 48,
      "soil": 56,
      "terrain": 28,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 46.8,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Yields edible fruit and dark blue natural edible dye for traditional art."
  },
  {
    "id": "ice-cream-bean-inga",
    "name": "Ice Cream Bean (Inga)",
    "botanicalName": "Inga edulis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 520,
    "factors": {
      "water": 68,
      "soil": 56,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Nitrogen-fixing legume tree producing pods filled with cottony sweet pulp."
  },
  {
    "id": "kei-apple",
    "name": "Kei Apple",
    "botanicalName": "Dovyalis caffra",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 36,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 57.8,
    "indiaZones": [
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Subtropical spiny hedge bearing bright yellow tart aromatic fruits."
  },
  {
    "id": "governor-s-plum",
    "name": "Governor's Plum",
    "botanicalName": "Flacourtia indica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 34,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "DEC",
      "CEN",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dry forest bush bearing edible astringent dark purple plums."
  },
  {
    "id": "hog-plum-amra",
    "name": "Hog Plum (Amra)",
    "botanicalName": "Spondias mombin",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 540,
    "factors": {
      "water": 66,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "EST",
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Tart wild plum eaten fresh or pickled in spicy mustards."
  },
  {
    "id": "indian-olive-jalpai",
    "name": "Indian Olive (Jalpai)",
    "botanicalName": "Elaeocarpus serratus",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 620,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 38,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "NE",
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Green astringent drupe prepared as sweet-sour pickles and chutneys."
  },
  {
    "id": "elephant-apple-chalta",
    "name": "Elephant Apple (Chalta)",
    "botanicalName": "Dillenia indica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 680,
    "factors": {
      "water": 52,
      "soil": 60,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "NE",
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Hard evergreen sepaled fruit eaten in Assamese and Bengali fish curries."
  },
  {
    "id": "mahua-fruit",
    "name": "Mahua Fruit",
    "botanicalName": "Madhuca longifolia (fruit)",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 80,
      "soil": 62,
      "terrain": 32,
      "climate": 52,
      "economics": 89
    },
    "baseScore": 63,
    "indiaZones": [
      "CEN",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Succulent fruit following the fragrant flowers; seeds yield edible fat."
  },
  {
    "id": "chironji-buchanania",
    "name": "Chironji (Buchanania)",
    "botanicalName": "Buchanania lanzan",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 82,
      "soil": 58,
      "terrain": 38,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 62.6,
    "indiaZones": [
      "CEN",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Wild forest dryland tree producing sweet fleshy fruit and nut kernels."
  },
  {
    "id": "marking-nut-bhilawa",
    "name": "Marking Nut (Bhilawa)",
    "botanicalName": "Semecarpus anacardium",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 420,
    "factors": {
      "water": 78,
      "soil": 56,
      "terrain": 36,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 58.8,
    "indiaZones": [
      "CEN",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Orange hypocarp is eaten sweet; black nut used in Ayurveda."
  },
  {
    "id": "khirni",
    "name": "Khirni",
    "botanicalName": "Manilkara hexandra",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 85,
      "soil": 54,
      "terrain": 32,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 58.6,
    "indiaZones": [
      "WST",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dry tropical evergreen tree bearing golden sweet oval berries."
  },
  {
    "id": "lasora-gonda",
    "name": "Lasora (Gonda)",
    "botanicalName": "Cordia myxa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 330,
    "factors": {
      "water": 87,
      "soil": 50,
      "terrain": 30,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 60,
    "indiaZones": [
      "NW",
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Mucilaginous desert fruit renowned for Rajasthani pickles and cooling health."
  },
  {
    "id": "kair-capparis",
    "name": "Kair (Capparis)",
    "botanicalName": "Capparis decidua",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 95,
      "soil": 44,
      "terrain": 26,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Leafless thorny desert bush bearing pink berries for Panchkuta curry."
  },
  {
    "id": "piloo-salvadora",
    "name": "Piloo (Salvadora)",
    "botanicalName": "Salvadora persica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 95,
      "soil": 46,
      "terrain": 24,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Toothbrush tree thriving in hyper-saline desert sands; edible red berries."
  },
  {
    "id": "persian-lime",
    "name": "Persian Lime",
    "botanicalName": "Citrus x latifolia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 580,
    "factors": {
      "water": 62,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "WST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Seedless commercial lime with vigorous heavy bearing."
  },
  {
    "id": "kaffir-lime",
    "name": "Kaffir Lime",
    "botanicalName": "Citrus hystrix",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Bumpy-skinned citrus whose fragrant hourglass leaves season Thai curries."
  },
  {
    "id": "buddha-s-hand",
    "name": "Buddha's Hand",
    "botanicalName": "Citrus medica var. sarcodactylis",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 34,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50,
    "indiaZones": [
      "NE",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fragrant fingered citron used for zest, perfumery, and religious offerings."
  },
  {
    "id": "citron-galgal",
    "name": "Citron (Galgal)",
    "botanicalName": "Citrus medica",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Ancient thick-rinded citrus candied for bakery and mountain pickles."
  },
  {
    "id": "sweet-lime-mitha-nimbu",
    "name": "Sweet Lime (Mitha Nimbu)",
    "botanicalName": "Citrus limetta",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Mild non-acidic sweet citrus popular during illness recovery."
  },
  {
    "id": "rangpur-lime",
    "name": "Rangpur Lime",
    "botanicalName": "Citrus x limonia",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 490,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54,
    "indiaZones": [
      "WST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Hardy mandarin-lime hybrid widely used as disease-resistant rootstock."
  },
  {
    "id": "calamansi-calamondin",
    "name": "Calamansi (Calamondin)",
    "botanicalName": "Citrus microcarpa",
    "section": "Fruit",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 560,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Small round citrus with aromatic sour juice prized in Southeast Asia."
  },
  {
    "id": "karanj-seed-nut",
    "name": "Karanj Seed Nut",
    "botanicalName": "Millettia pinnata (seed)",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 75,
      "soil": 66,
      "terrain": 30,
      "climate": 62,
      "economics": 100
    },
    "baseScore": 66.6,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Non-edible oilseed nut used in bio-pesticides and indigenous medicine."
  },
  {
    "id": "cashew-nut",
    "name": "Cashew Nut",
    "botanicalName": "Anacardium occidentale (nut)",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 48,
      "terrain": 30,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 50.6,
    "indiaZones": [
      "SOU",
      "WST",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-value export nut thriving on coastal red laterite plateaus."
  },
  {
    "id": "macadamia",
    "name": "Macadamia",
    "botanicalName": "Macadamia integrifolia",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 34,
      "climate": 44,
      "economics": 45
    },
    "baseScore": 45.8,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Rich buttery dessert nut with thick shell requiring specialized crackers."
  },
  {
    "id": "areca-nut-supari",
    "name": "Areca Nut (Supari)",
    "botanicalName": "Areca catechu (nut)",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 32,
      "soil": 62,
      "terrain": 22,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 41.2,
    "indiaZones": [
      "SOU",
      "NE",
      "ISL",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Commercial masticatory nut heavily vulnerable to borewell decline."
  },
  {
    "id": "walnut-kashmiri",
    "name": "Walnut (Kashmiri)",
    "botanicalName": "Juglans regia",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 62,
      "soil": 62,
      "terrain": 50,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 56.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-altitude mountain nut rich in alpha-linolenic omega-3 acid."
  },
  {
    "id": "almond-kagzi-badam",
    "name": "Almond (Kagzi Badam)",
    "botanicalName": "Prunus dulcis",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 56,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Thin-shelled paper almond cultivated in sunny temperate dry valleys."
  },
  {
    "id": "pistachio-nut",
    "name": "Pistachio Nut",
    "botanicalName": "Pistacia vera",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 36,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "HIM",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Salinity-hardy desert nut requiring hot summers and cold winters."
  },
  {
    "id": "pecan-nut",
    "name": "Pecan Nut",
    "botanicalName": "Carya illinoinensis",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 700,
    "factors": {
      "water": 56,
      "soil": 62,
      "terrain": 40,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deep-rooted river bottom tree yielding rich buttery elongated kernels."
  },
  {
    "id": "hazelnut-cobnut",
    "name": "Hazelnut (Cobnut)",
    "botanicalName": "Corylus avellana",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 56,
      "soil": 56,
      "terrain": 46,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Cool-season multi-stemmed nut prized in praline and chocolate spreads."
  },
  {
    "id": "sweet-chestnut",
    "name": "Sweet Chestnut",
    "botanicalName": "Castanea sativa",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 48,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Low-fat starchy mountain nut roasted as winter street delicacy."
  },
  {
    "id": "pine-nut-chilgoza",
    "name": "Pine Nut (Chilgoza)",
    "botanicalName": "Pinus gerardiana",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 76,
      "soil": 48,
      "terrain": 62,
      "climate": 38,
      "economics": 78
    },
    "baseScore": 60.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Wild harvested pine seed of Kinnaur and dry inner Himalayan valleys."
  },
  {
    "id": "brazil-nut",
    "name": "Brazil Nut",
    "botanicalName": "Bertholletia excelsa",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1800,
    "factors": {
      "water": 32,
      "soil": 62,
      "terrain": 26,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 42.6,
    "indiaZones": [],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": false,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Giant Amazonian rainforest tree nut richest in natural selenium."
  },
  {
    "id": "betel-nut-spiced",
    "name": "Betel Nut (Spiced)",
    "botanicalName": "Areca catechu var.",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1350,
    "factors": {
      "water": 34,
      "soil": 60,
      "terrain": 22,
      "climate": 44,
      "economics": 45
    },
    "baseScore": 41,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Selected chewing nut processed with edible lime and aromatic spices."
  },
  {
    "id": "ginkgo-nut",
    "name": "Ginkgo Nut",
    "botanicalName": "Ginkgo biloba",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 66,
      "soil": 54,
      "terrain": 40,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Ancient living fossil tree bearing edible medicinal gametophyte kernels."
  },
  {
    "id": "shea-nut",
    "name": "Shea Nut",
    "botanicalName": "Vitellaria paradoxa (nut)",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 26,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": false,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Savannah oil nut processed into valuable confectionery and cosmetic butter."
  },
  {
    "id": "cola-nut-kola",
    "name": "Cola Nut (Kola)",
    "botanicalName": "Cola nitida",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 42,
      "soil": 58,
      "terrain": 30,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 46.4,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Caffeine-bearing masticatory nut native to tropical West African rainforests."
  },
  {
    "id": "chinquapin",
    "name": "Chinquapin",
    "botanicalName": "Castanea pumila",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 62,
      "soil": 52,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dwarf American chestnut relative resistant to chestnut blight."
  },
  {
    "id": "buchanania-chironji-nut",
    "name": "Buchanania (Chironji Nut)",
    "botanicalName": "Buchanania lanzan (nut)",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 58,
      "terrain": 38,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 62.6,
    "indiaZones": [
      "CEN",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High-value delicate sweet kernel essential in royal Indian desserts."
  },
  {
    "id": "marking-nut-edible",
    "name": "Marking Nut (Edible)",
    "botanicalName": "Semecarpus anacardium (nut)",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 78,
      "soil": 56,
      "terrain": 36,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 58.8,
    "indiaZones": [
      "CEN",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Detoxified kernel eaten roasted with rich cashewnut flavor."
  },
  {
    "id": "oak-acorn-sweet",
    "name": "Oak Acorn (Sweet)",
    "botanicalName": "Quercus ilex",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 46,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 55.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Low-tannin edible acorn of evergreen holm oaks in mountain ridges."
  },
  {
    "id": "water-caltrop-nut",
    "name": "Water Caltrop Nut",
    "botanicalName": "Trapa bispinosa",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 30,
      "soil": 56,
      "terrain": 14,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 40,
    "indiaZones": [
      "IGP",
      "EST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Starchy horned nut harvested from calm village lakes and flood pools."
  },
  {
    "id": "bunya-pine-nut",
    "name": "Bunya Pine Nut",
    "botanicalName": "Araucaria bidwillii",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 44,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 52,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Massive cones yielding delicious roasted starchy nuts up to 5cm long."
  },
  {
    "id": "monkey-puzzle-nut",
    "name": "Monkey Puzzle Nut",
    "botanicalName": "Araucaria araucana",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 50,
      "climate": 40,
      "economics": 56
    },
    "baseScore": 52.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Andean conifer nut eaten roasted or boiled as staple by indigenous pehuenche."
  },
  {
    "id": "candlenut-kukui",
    "name": "Candlenut (Kukui)",
    "botanicalName": "Aleurites moluccanus",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 900,
    "factors": {
      "water": 52,
      "soil": 56,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High oil nut used as traditional candle and Indonesian curry thickener."
  },
  {
    "id": "mongongo-nut",
    "name": "Mongongo Nut",
    "botanicalName": "Schinziophyton rautanenii",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 220,
    "factors": {
      "water": 91,
      "soil": 44,
      "terrain": 26,
      "climate": 38,
      "economics": 78
    },
    "baseScore": 55.4,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Kalahari desert tree nut providing high protein and vitamin E."
  },
  {
    "id": "yeheb-nut",
    "name": "Yeheb Nut",
    "botanicalName": "Cordeauxia edulis",
    "section": "Nut",
    "category": "Vegetables & Fruits",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 180,
    "factors": {
      "water": 93,
      "soil": 42,
      "terrain": 26,
      "climate": 36,
      "economics": 78
    },
    "baseScore": 55,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Horn of Africa dry scrub legume yielding sweet edible roasted seeds."
  },
  {
    "id": "rosemary",
    "name": "Rosemary",
    "botanicalName": "Salvia rosmarinus",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 46,
      "climate": 44,
      "economics": 100
    },
    "baseScore": 64.8,
    "indiaZones": [
      "HIM",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Antioxidant aromatic shrub thriving on stony limestone hill contours."
  },
  {
    "id": "vetiver-khus",
    "name": "Vetiver (Khus)",
    "botanicalName": "Chrysopogon zizanioides",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 78,
      "soil": 62,
      "terrain": 36,
      "climate": 50,
      "economics": 100
    },
    "baseScore": 65.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Deep sponge root system fixes slopes and yields premium perfumery oil."
  },
  {
    "id": "holy-basil-tulsi",
    "name": "Holy Basil (Tulsi)",
    "botanicalName": "Ocimum tenuiflorum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 34,
      "climate": 48,
      "economics": 89
    },
    "baseScore": 59.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Revered adaptogen; supreme air purifier and immunity stimulant."
  },
  {
    "id": "coriander-seed",
    "name": "Coriander Seed",
    "botanicalName": "Coriandrum sativum (seed)",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 30,
      "climate": 53,
      "economics": 89
    },
    "baseScore": 59,
    "indiaZones": [
      "WST",
      "CEN",
      "DEC",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Major spice crop in Rajasthan and MP; essential in curry powders."
  },
  {
    "id": "curry-leaf",
    "name": "Curry Leaf",
    "botanicalName": "Murraya koenigii",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 32,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 57.2,
    "indiaZones": [
      "SOU",
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Indispensable South Indian aromatic leaf; hardy drought-tolerant bush."
  },
  {
    "id": "sweet-basil",
    "name": "Sweet Basil",
    "botanicalName": "Ocimum basilicum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 32,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 55.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Linalool-rich herb used for pesto, essential oils, and seasoning."
  },
  {
    "id": "palmarosa",
    "name": "Palmarosa",
    "botanicalName": "Cymbopogon martinii",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 32,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.2,
    "indiaZones": [
      "CEN",
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Aromatic grass yielding geraniol oil for rose-note perfumes and soaps."
  },
  {
    "id": "lemongrass",
    "name": "Lemongrass",
    "botanicalName": "Cymbopogon citratus",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Citral-rich aromatic grass distilled for mosquito repellent and flavor."
  },
  {
    "id": "turmeric-haldi",
    "name": "Turmeric (Haldi)",
    "botanicalName": "Curcuma longa",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "210–250d",
    "waterRequirementMm": 1000,
    "factors": {
      "water": 42,
      "soil": 56,
      "terrain": 30,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 43.6,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Golden curcumin rhizome requiring deep fertile soil and copious water."
  },
  {
    "id": "ginger",
    "name": "Ginger",
    "botanicalName": "Zingiber officinale (spice)",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "210–240d",
    "waterRequirementMm": 950,
    "factors": {
      "water": 44,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "SOU",
      "NE",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-value spice rhizome needing humus-rich soil and partial shade."
  },
  {
    "id": "black-pepper",
    "name": "Black Pepper",
    "botanicalName": "Piper nigrum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 35,
      "soil": 62,
      "terrain": 34,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 44.4,
    "indiaZones": [
      "SOU",
      "WST",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "King of spices; climbing vine requiring living tree standards and high humidity."
  },
  {
    "id": "cardamom-small",
    "name": "Cardamom (Small)",
    "botanicalName": "Elettaria cardamomum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1800,
    "factors": {
      "water": 30,
      "soil": 64,
      "terrain": 40,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "SOU",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Queen of spices; delicate understorey perennial of Western Ghats mist forests."
  },
  {
    "id": "large-cardamom",
    "name": "Large Cardamom",
    "botanicalName": "Amomum subulatum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 36,
      "soil": 60,
      "terrain": 52,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Smoky dark brown capsule grown on shaded Himalayan mountain streams."
  },
  {
    "id": "clove",
    "name": "Clove",
    "botanicalName": "Syzygium aromaticum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 38,
      "soil": 62,
      "terrain": 32,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Dried unopened flower bud rich in eugenol for toothaches and spices."
  },
  {
    "id": "nutmeg-mace",
    "name": "Nutmeg & Mace",
    "botanicalName": "Myristica fragrans",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 36,
      "soil": 62,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44.2,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Dioecious tropical tree yielding both kernel (nutmeg) and aril (mace)."
  },
  {
    "id": "cinnamon-ceylon",
    "name": "Cinnamon (Ceylon)",
    "botanicalName": "Cinnamomum verum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 45,
      "soil": 60,
      "terrain": 32,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 48.2,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Thin delicate sweet inner bark harvested from coppiced shoots."
  },
  {
    "id": "cassia-chinese-cinnamon",
    "name": "Cassia (Chinese Cinnamon)",
    "botanicalName": "Cinnamomum cassia",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 50,
      "soil": 58,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Stronger pungent bark with high cinnamaldehyde and coumarin."
  },
  {
    "id": "fennel-seed-saunf",
    "name": "Fennel Seed (Saunf)",
    "botanicalName": "Foeniculum vulgare",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "140–160d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 28,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 55.4,
    "indiaZones": [
      "WST",
      "ARD",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Anise-scented rabi seed spice cultivated extensively in Gujarat."
  },
  {
    "id": "fenugreek-seed-methi",
    "name": "Fenugreek Seed (Methi)",
    "botanicalName": "Trigonella foenum-graecum (seed)",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "90–105d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 28,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 57.8,
    "indiaZones": [
      "ARD",
      "WST",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Bitter medicinal condiment seed packed with galactomannan fibre."
  },
  {
    "id": "cumin-jeera",
    "name": "Cumin (Jeera)",
    "botanicalName": "Cuminum cyminum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "90–110d",
    "waterRequirementMm": 220,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 24,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 57.6,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High-value delicate arid rabi spice; sensitive to humid cloudiness."
  },
  {
    "id": "caraway-shahi-jeera",
    "name": "Caraway (Shahi Jeera)",
    "botanicalName": "Carum carvi",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "Biennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 46,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 55.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Aromatic mountain seed spice of Kashmir and Himachal dry temperate zones."
  },
  {
    "id": "ajwain-bishop-s-weed",
    "name": "Ajwain (Bishop's Weed)",
    "botanicalName": "Trachyspermum ammi",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "120–140d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 26,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 57.8,
    "indiaZones": [
      "WST",
      "ARD",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Thymol-rich pungent carminative seed spice of dryland winter fields."
  },
  {
    "id": "dill-seed-suva",
    "name": "Dill Seed (Suva)",
    "botanicalName": "Anethum graveolens",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "100–120d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 28,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 54.6,
    "indiaZones": [
      "WST",
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Feathery rabi crop grown for essential oil and digestive infant gripe water."
  },
  {
    "id": "aniseed",
    "name": "Aniseed",
    "botanicalName": "Pimpinella anisum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "110–130d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 30,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 52.4,
    "indiaZones": [
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sweet licorice-scented seed spice cultivated on well-drained loams."
  },
  {
    "id": "star-anise",
    "name": "Star Anise",
    "botanicalName": "Illicium verum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 42,
      "soil": 58,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 48.4,
    "indiaZones": [
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Eight-pointed star shaped fruit rich in shikimic acid (antiviral precursor)."
  },
  {
    "id": "saffron",
    "name": "Saffron",
    "botanicalName": "Crocus sativus",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 68,
      "soil": 56,
      "terrain": 46,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 60.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "World's most expensive spice; hand-picked trifid orange stigmas of Kashmir."
  },
  {
    "id": "vanilla",
    "name": "Vanilla",
    "botanicalName": "Vanilla planifolia",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1600,
    "factors": {
      "water": 32,
      "soil": 62,
      "terrain": 32,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 43.8,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Climbing orchid requiring hand-pollination and 6-month curing of beans."
  },
  {
    "id": "oregano",
    "name": "Oregano",
    "botanicalName": "Origanum vulgare",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 76,
      "soil": 50,
      "terrain": 44,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 58,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Carvacrol-rich culinary herb adapted to rocky dry mountain slopes."
  },
  {
    "id": "thyme",
    "name": "Thyme",
    "botanicalName": "Thymus vulgaris",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 80,
      "soil": 48,
      "terrain": 46,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 58.8,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Woody low-growing Mediterranean herb loving gritty limestone soils."
  },
  {
    "id": "marjoram",
    "name": "Marjoram",
    "botanicalName": "Origanum majorana",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 73,
      "soil": 50,
      "terrain": 38,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.4,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Sweeter milder relative of oregano used in fine sausages and herbal tea."
  },
  {
    "id": "sage-garden",
    "name": "Sage (Garden)",
    "botanicalName": "Salvia officinalis",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 76,
      "soil": 50,
      "terrain": 42,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Silvery-leaved subshrub with antibacterial thujone essential oil."
  },
  {
    "id": "mint-pudina",
    "name": "Mint (Pudina)",
    "botanicalName": "Mentha spicata",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 46,
      "soil": 60,
      "terrain": 28,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 49.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Fast-spreading spearmint requiring abundant water for repeated flushes."
  },
  {
    "id": "peppermint",
    "name": "Peppermint",
    "botanicalName": "Mentha x piperita",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 900,
    "factors": {
      "water": 44,
      "soil": 60,
      "terrain": 30,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 49.4,
    "indiaZones": [
      "IGP",
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Menthol-rich hybrid mint grown in Terai irrigated commercial beds."
  },
  {
    "id": "spearmint",
    "name": "Spearmint",
    "botanicalName": "Mentha spicata var.",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 46,
      "soil": 60,
      "terrain": 28,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 49.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Sweet carvone-rich herb popular in chewing gums and cool mocktails."
  },
  {
    "id": "lavender",
    "name": "Lavender",
    "botanicalName": "Lavandula angustifolia",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 48,
      "terrain": 48,
      "climate": 40,
      "economics": 78
    },
    "baseScore": 58.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Kashmir purple revolution crop yielding calming linalool aromatherapy oil."
  },
  {
    "id": "bay-leaf-tejpatta",
    "name": "Bay Leaf (Tejpatta)",
    "botanicalName": "Cinnamomum tamala",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 56,
      "soil": 56,
      "terrain": 44,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Subtropical hill tree yielding sweet cinnamon-scented Indian bay leaves."
  },
  {
    "id": "allspice-pimenta",
    "name": "Allspice (Pimenta)",
    "botanicalName": "Pimenta dioica",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Evergreen tree combining flavors of clove, cinnamon, and nutmeg."
  },
  {
    "id": "galangal-greater",
    "name": "Galangal (Greater)",
    "botanicalName": "Alpinia galanga",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 50,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48,
    "indiaZones": [
      "EST",
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Aromatic pungent rhizome vital for authentic Thai tom yum pastes."
  },
  {
    "id": "galangal-lesser",
    "name": "Galangal (Lesser)",
    "botanicalName": "Alpinia officinarum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 50,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.4,
    "indiaZones": [
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Stronger peppery-ginger rhizome used in traditional respiratory remedies."
  },
  {
    "id": "asafetida-hing",
    "name": "Asafetida (Hing)",
    "botanicalName": "Ferula assa-foetida",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 52,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 62.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Cold desert umbellifer resin harvested from roots in cold dry scree slopes."
  },
  {
    "id": "mustard-seed-black",
    "name": "Mustard Seed (Black)",
    "botanicalName": "Brassica nigra",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 76,
      "soil": 58,
      "terrain": 30,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 57.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Pungent seasoning seeds essential for Indian tempering (tadka)."
  },
  {
    "id": "nigella-kalonji",
    "name": "Nigella (Kalonji)",
    "botanicalName": "Nigella sativa",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "110–130d",
    "waterRequirementMm": 300,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 30,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 58.6,
    "indiaZones": [
      "IGP",
      "CEN",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Black cumin seeds rich in thymoquinone for breads and pickles."
  },
  {
    "id": "celery-seed-ajmod",
    "name": "Celery Seed (Ajmod)",
    "botanicalName": "Apium graveolens (seed)",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "140–160d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 28,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 51,
    "indiaZones": [
      "NW",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Pungent tiny seeds extracted for celery oil and savory seasonings."
  },
  {
    "id": "parsley-curly",
    "name": "Parsley (Curly)",
    "botanicalName": "Petroselinum crispum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "70–85d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Vitamin-rich decorative garnishing herb for salad and culinary stocks."
  },
  {
    "id": "tarragon-french",
    "name": "Tarragon (French)",
    "botanicalName": "Artemisia dracunculus",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 40,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Anise-flavored gourmet herb essential in bearnaise sauce."
  },
  {
    "id": "chervil",
    "name": "Chervil",
    "botanicalName": "Anthriscus cerefolium",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "45–60d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 56,
      "soil": 54,
      "terrain": 36,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 49.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Delicate spring herb with faint anise perfume used in French fines herbes."
  },
  {
    "id": "borage",
    "name": "Borage",
    "botanicalName": "Borago officinalis",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "50–65d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 71,
      "soil": 50,
      "terrain": 34,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.2,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Starflower with cucumber-flavored edible blue blooms loved by bees."
  },
  {
    "id": "lemon-verbena",
    "name": "Lemon Verbena",
    "botanicalName": "Aloysia citrodora",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deciduous shrub with sweetest intense lemon perfume for infusions."
  },
  {
    "id": "lemon-balm",
    "name": "Lemon Balm",
    "botanicalName": "Melissa officinalis",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 420,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 38,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Calming lemon-scented mint relative brewing antiviral herbal teas."
  },
  {
    "id": "hyssop",
    "name": "Hyssop",
    "botanicalName": "Hyssopus officinalis",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 320,
    "factors": {
      "water": 76,
      "soil": 48,
      "terrain": 44,
      "climate": 40,
      "economics": 78
    },
    "baseScore": 57.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Ancient medicinal biblically revered herb bearing vivid blue spikes."
  },
  {
    "id": "winter-savory",
    "name": "Winter Savory",
    "botanicalName": "Satureja montana",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 80,
      "soil": 46,
      "terrain": 44,
      "climate": 40,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Peppery evergreen subshrub surviving dry stony mountain terraces."
  },
  {
    "id": "summer-savory",
    "name": "Summer Savory",
    "botanicalName": "Satureja hortensis",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "60–75d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 73,
      "soil": 50,
      "terrain": 36,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.6,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Delicate annual bean seasoning herb preventing flatulence."
  },
  {
    "id": "epazote",
    "name": "Epazote",
    "botanicalName": "Dysphania ambrosioides",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 82,
      "soil": 48,
      "terrain": 32,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Traditional Mexican pungent herb seasoned in black bean cooking."
  },
  {
    "id": "lovage",
    "name": "Lovage",
    "botanicalName": "Levisticum officinale",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 58,
      "soil": 56,
      "terrain": 42,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Robust perennial celery-flavored herb reaching 2 meters in moist soils."
  },
  {
    "id": "angelica",
    "name": "Angelica",
    "botanicalName": "Angelica archangelica",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "Biennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 50,
      "soil": 58,
      "terrain": 46,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Candied aromatic stalks and roots used in chartreuse and gin flavoring."
  },
  {
    "id": "pipicha",
    "name": "Pipicha",
    "botanicalName": "Porophyllum linaria",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 260,
    "factors": {
      "water": 82,
      "soil": 48,
      "terrain": 34,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Strong citrus-cilantro herb favored in dry Mexican upland cuisine."
  },
  {
    "id": "papalo",
    "name": "Papalo",
    "botanicalName": "Porophyllum ruderale",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 280,
    "factors": {
      "water": 80,
      "soil": 48,
      "terrain": 34,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Aromatic pungent summer substitute for coriander that never bolts in heat."
  },
  {
    "id": "vietnamese-coriander",
    "name": "Vietnamese Coriander",
    "botanicalName": "Persicaria odorata",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 950,
    "factors": {
      "water": 42,
      "soil": 56,
      "terrain": 26,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 47.8,
    "indiaZones": [
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Rau ram aquatic/wetland herb with fiery spicy cilantro flavor."
  },
  {
    "id": "culantro-bhandhanya",
    "name": "Culantro (Bhandhanya)",
    "botanicalName": "Eryngium foetidum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "Biennial",
    "waterRequirementMm": 700,
    "factors": {
      "water": 54,
      "soil": 56,
      "terrain": 32,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "NE",
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Serrated-leaf shadow-loving herb retaining aroma tenaciously when dried."
  },
  {
    "id": "pandanus-leaf-annapurna",
    "name": "Pandanus Leaf (Annapurna)",
    "botanicalName": "Pandanus amaryllifolius",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 45,
      "soil": 58,
      "terrain": 24,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 48.4,
    "indiaZones": [
      "SOU",
      "ISL",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Basmati rice aroma plant whose leaves fragrance sweets and curries."
  },
  {
    "id": "kaffir-lime-leaves",
    "name": "Kaffir Lime Leaves",
    "botanicalName": "Citrus hystrix (leaves)",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Double-lobed glossy leaves essential for green curry and tom kha."
  },
  {
    "id": "sweet-cicely",
    "name": "Sweet Cicely",
    "botanicalName": "Myrrhis odorata",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 56,
      "soil": 54,
      "terrain": 44,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fern-like mountain herb with naturally sweet aniseed-flavored leaves."
  },
  {
    "id": "grains-of-paradise",
    "name": "Grains of Paradise",
    "botanicalName": "Aframomum melegueta",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1300,
    "factors": {
      "water": 40,
      "soil": 58,
      "terrain": 30,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 46.4,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "West African melegueta pepper with cardamom-citrus-peppery seeds."
  },
  {
    "id": "long-pepper-pippali",
    "name": "Long Pepper (Pippali)",
    "botanicalName": "Piper longum",
    "section": "Spice & Herb",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 45,
      "soil": 60,
      "terrain": 32,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 47.8,
    "indiaZones": [
      "SOU",
      "NE",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Slender aromatic climber bearing cylindrical spike fruit used in Ayurveda."
  },
  {
    "id": "sandalwood",
    "name": "Sandalwood",
    "botanicalName": "Santalum album",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 36,
      "climate": 41,
      "economics": 40
    },
    "baseScore": 47,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Royal semi-parasite tree producing santalol heartwood of extreme value."
  },
  {
    "id": "tobacco",
    "name": "Tobacco",
    "botanicalName": "Nicotiana tabacum",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "110–130d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 58,
      "soil": 54,
      "terrain": 30,
      "climate": 44,
      "economics": 35
    },
    "baseScore": 44.2,
    "indiaZones": [
      "DEC",
      "WST",
      "IGP",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Nicotiana cash crop demanding sandy loams and strict flue curing."
  },
  {
    "id": "tea-camellia",
    "name": "Tea (Camellia)",
    "botanicalName": "Camellia sinensis",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 42,
      "soil": 62,
      "terrain": 50,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "NE",
      "EST",
      "SOU",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Highland acidic rainfed evergreen producing black, green, and oolong flushes."
  },
  {
    "id": "arabica-coffee",
    "name": "Arabica Coffee",
    "botanicalName": "Coffea arabica",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 44,
      "soil": 60,
      "terrain": 46,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 48,
    "indiaZones": [
      "SOU",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-altitude shade-grown coffee with fine floral acidity (1000-1500m ASL)."
  },
  {
    "id": "robusta-coffee",
    "name": "Robusta Coffee",
    "botanicalName": "Coffea canephora",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 48,
      "soil": 58,
      "terrain": 36,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 46.6,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Lower-altitude heat-tolerant coffee with bold body and higher caffeine."
  },
  {
    "id": "cocoa-cacao",
    "name": "Cocoa (Cacao)",
    "botanicalName": "Theobroma cacao",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1700,
    "factors": {
      "water": 35,
      "soil": 64,
      "terrain": 28,
      "climate": 48,
      "economics": 23
    },
    "baseScore": 39.6,
    "indiaZones": [
      "SOU",
      "ISL",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Understorey intercrop in areca/coconut groves demanding deep humid loams."
  },
  {
    "id": "natural-rubber",
    "name": "Natural Rubber",
    "botanicalName": "Hevea brasiliensis",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1800,
    "factors": {
      "water": 32,
      "soil": 62,
      "terrain": 28,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 43,
    "indiaZones": [
      "SOU",
      "NE",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Latex-producing Amazonian tree forming backbone of Kerala plantation economy."
  },
  {
    "id": "oil-palm-plantation",
    "name": "Oil Palm (Plantation)",
    "botanicalName": "Elaeis guineensis",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 2000,
    "factors": {
      "water": 26,
      "soil": 66,
      "terrain": 18,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 40,
    "indiaZones": [
      "SOU",
      "ISL",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Massive tropical oil palm; high water demand unsustainable in dry belts."
  },
  {
    "id": "hops",
    "name": "Hops",
    "botanicalName": "Humulus lupulus",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 52,
      "soil": 58,
      "terrain": 40,
      "climate": 42,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dioecious twining bines cultivated on high wire trellises for beer brewing."
  },
  {
    "id": "yerba-mate",
    "name": "Yerba Mate",
    "botanicalName": "Ilex paraguariensis",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1300,
    "factors": {
      "water": 46,
      "soil": 60,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "SOU",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Caffeine-rich subtropical holly brewed into traditional South American infusion."
  },
  {
    "id": "guayusa",
    "name": "Guayusa",
    "botanicalName": "Ilex guayusa",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 40,
      "soil": 60,
      "terrain": 34,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 45,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Amazonian tea tree leaf with smooth non-jittery caffeine and theobromine."
  },
  {
    "id": "khat",
    "name": "Khat",
    "botanicalName": "Catha edulis",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 71,
      "soil": 50,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.8,
    "indiaZones": [],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": false,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Evergreen shrub chewed fresh for stimulant cathinone in Horn of Africa."
  },
  {
    "id": "kava-kava",
    "name": "Kava Kava",
    "botanicalName": "Piper methysticum",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1600,
    "factors": {
      "water": 38,
      "soil": 60,
      "terrain": 30,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 44.2,
    "indiaZones": [
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Pacific island ceremonial root containing relaxing anxiolytic kavalactones."
  },
  {
    "id": "rooibos-redbush",
    "name": "Rooibos (Redbush)",
    "botanicalName": "Aspalathus linearis",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 85,
      "soil": 46,
      "terrain": 34,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 54.4,
    "indiaZones": [],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": false,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "South African fynbos needle shrub producing antioxidant caffeine-free tea."
  },
  {
    "id": "honeybush",
    "name": "Honeybush",
    "botanicalName": "Cyclopia intermedia",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 82,
      "soil": 48,
      "terrain": 36,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": false,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Wild harvested Cape shrub brewing sweet honey-scented medicinal tea."
  },
  {
    "id": "guarana",
    "name": "Guarana",
    "botanicalName": "Paullinia cupana",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1700,
    "factors": {
      "water": 35,
      "soil": 60,
      "terrain": 28,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 43.2,
    "indiaZones": [
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Climbing Amazonian vine bearing eye-like seeds with double coffee caffeine."
  },
  {
    "id": "betel-vine-paan",
    "name": "Betel Vine (Paan)",
    "botanicalName": "Piper betle (plantation)",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 40,
      "soil": 64,
      "terrain": 26,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 46.8,
    "indiaZones": [
      "EST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "High-investment shaded conservatory vine producing heart-shaped leaves."
  },
  {
    "id": "palmyra-sugar-sap-palm",
    "name": "Palmyra Sugar Sap Palm",
    "botanicalName": "Borassus flabellifer (sap)",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 80,
      "soil": 62,
      "terrain": 30,
      "climate": 43,
      "economics": 67
    },
    "baseScore": 56.4,
    "indiaZones": [
      "SOU",
      "EST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Tapped for sweet neera sap yielding nutrient-rich palm jaggery."
  },
  {
    "id": "date-palm-commercial",
    "name": "Date Palm (Commercial)",
    "botanicalName": "Phoenix dactylifera (orchard)",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 82,
      "soil": 50,
      "terrain": 24,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 55.2,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Tissue-cultured varieties (Medjool, Barhee) irrigated in arid Thar soils."
  },
  {
    "id": "chicory-coffee-blend",
    "name": "Chicory (Coffee Blend)",
    "botanicalName": "Cichorium intybus var. sativum",
    "section": "Plantation & Beverage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "140–160d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 32,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "WST",
      "SOU",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Roasted roasted ground root essential in traditional South Indian filter coffee."
  },
  {
    "id": "stylosanthes",
    "name": "Stylosanthes",
    "botanicalName": "Stylosanthes hamata",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 280,
    "factors": {
      "water": 85,
      "soil": 52,
      "terrain": 40,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 61.6,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Caribbean pasture legume enriching nitrogen and restoring degraded rangelands."
  },
  {
    "id": "fodder-sorghum",
    "name": "Fodder Sorghum",
    "botanicalName": "Sorghum bicolor (fodder)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 76,
      "soil": 60,
      "terrain": 36,
      "climate": 45,
      "economics": 89
    },
    "baseScore": 61.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Multi-cut drought-resilient cattle forage providing high dry-matter tonnage."
  },
  {
    "id": "sudan-grass",
    "name": "Sudan Grass",
    "botanicalName": "Sorghum x drummondii",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "50–65d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 76,
      "soil": 56,
      "terrain": 34,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 57.2,
    "indiaZones": [
      "NW",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rapid-tillering palatable grass producing successive multi-cut flushes."
  },
  {
    "id": "dinanath-grass",
    "name": "Dinanath Grass",
    "botanicalName": "Pennisetum pedicellatum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "75–90d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 34,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "EST",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Annual prolific fodder grass with great soil-holding fibrous root mat."
  },
  {
    "id": "leucaena-subabul",
    "name": "Leucaena (Subabul)",
    "botanicalName": "Leucaena leucocephala",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 78,
      "soil": 56,
      "terrain": 36,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 54,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Miracle tree legume offering 22% crude protein leaves for ruminant feed."
  },
  {
    "id": "fodder-maize",
    "name": "Fodder Maize",
    "botanicalName": "Zea mays (fodder)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 500,
    "factors": {
      "water": 60,
      "soil": 54,
      "terrain": 42,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 52,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-energy succulence fodder ideal for high-yielding dairy silage."
  },
  {
    "id": "napier-grass-hybrid",
    "name": "Napier Grass (Hybrid)",
    "botanicalName": "Pennisetum purpureum x glaucum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 46,
      "soil": 58,
      "terrain": 28,
      "climate": 48,
      "economics": 35
    },
    "baseScore": 43,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Heavy green biomass grass requiring high irrigation and slurry application."
  },
  {
    "id": "lucerne-alfalfa",
    "name": "Lucerne (Alfalfa)",
    "botanicalName": "Medicago sativa",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 60,
      "soil": 62,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "NW",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Queen of forages; deep taproot extracts minerals, rich in crude protein."
  },
  {
    "id": "berseem-egyptian-clover",
    "name": "Berseem (Egyptian Clover)",
    "botanicalName": "Trifolium alexandrinum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 700,
    "factors": {
      "water": 52,
      "soil": 62,
      "terrain": 30,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.4,
    "indiaZones": [
      "NW",
      "IGP",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "King of winter rabi forages providing 4–6 succulent dairy cuts."
  },
  {
    "id": "guinea-grass",
    "name": "Guinea Grass",
    "botanicalName": "Megathyrsus maximus",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 64,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "SOU",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Shade-tolerant tussock grass adapted as understorey in coconut groves."
  },
  {
    "id": "rhodes-grass",
    "name": "Rhodes Grass",
    "botanicalName": "Chloris gayana",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 32,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.4,
    "indiaZones": [
      "ARD",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Stoloniferous pasture grass with superior tolerance to soil salinity and alkali."
  },
  {
    "id": "buffel-grass-anjan",
    "name": "Buffel Grass (Anjan)",
    "botanicalName": "Cenchrus ciliaris",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 89,
      "soil": 48,
      "terrain": 28,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Supreme arid desert range grass surviving in under 200mm annual rain."
  },
  {
    "id": "birdwood-grass-dhaman",
    "name": "Birdwood Grass (Dhaman)",
    "botanicalName": "Cenchrus setigerus",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 220,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 26,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy non-rhizomatous pasture grass for arid sandy pastures."
  },
  {
    "id": "marvel-grass",
    "name": "Marvel Grass",
    "botanicalName": "Dichanthium annulatum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 80,
      "soil": 54,
      "terrain": 30,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "WST",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High-protein indigenous dryland grass thriving on black clay soils."
  },
  {
    "id": "sehima-shedha",
    "name": "Sehima (Shedha)",
    "botanicalName": "Sehima nervosum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 320,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 36,
      "climate": 40,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "DEC",
      "CEN",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Grass of the rocky Deccan hillsides providing lean season cattle grazing."
  },
  {
    "id": "congosignal-grass",
    "name": "Congosignal Grass",
    "botanicalName": "Urochloa ruziziensis",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dense creeping stolon grass that smothers weeds on acidic red soils."
  },
  {
    "id": "para-grass-water-grass",
    "name": "Para Grass (Water Grass)",
    "botanicalName": "Urochloa mutica",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 32,
      "soil": 60,
      "terrain": 18,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 40.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Waterlogging-tolerant forage grass thriving in sewage channels and marsh lagoons."
  },
  {
    "id": "fodder-cowpea",
    "name": "Fodder Cowpea",
    "botanicalName": "Vigna unguiculata (forage)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 28,
      "climate": 45,
      "economics": 78
    },
    "baseScore": 56.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing leguminous green fodder that enriches companion maize."
  },
  {
    "id": "velvet-bean-forage",
    "name": "Velvet Bean Forage",
    "botanicalName": "Mucuna pruriens (forage)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "90–120d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 30,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.4,
    "indiaZones": [
      "DEC",
      "SOU",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dense green canopy fixes massive nitrogen and provides protein-rich silage."
  },
  {
    "id": "desmodium-greenleaf",
    "name": "Desmodium (Greenleaf)",
    "botanicalName": "Desmodium intortum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 68,
      "soil": 54,
      "terrain": 36,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "NE",
      "SOU",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deep-rooted perennial pasture legume adapted to humid subtropical hills."
  },
  {
    "id": "silverleaf-desmodium",
    "name": "Silverleaf Desmodium",
    "botanicalName": "Desmodium uncinatum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 66,
      "soil": 54,
      "terrain": 38,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "HIM",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Known for striga weed suppression in push-pull cereal cropping systems."
  },
  {
    "id": "centrosema-centro",
    "name": "Centrosema (Centro)",
    "botanicalName": "Centrosema pubescens",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "SOU",
      "EST",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Aggressive cover crop and pasture legume for tropical plantation interspaces."
  },
  {
    "id": "calopo",
    "name": "Calopo",
    "botanicalName": "Calopogonium mucunoides",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 62,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.8,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Dense creeping vine used as pioneer green manure in humid rubber estates."
  },
  {
    "id": "siratro",
    "name": "Siratro",
    "botanicalName": "Macroptilium atropurpureum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 320,
    "factors": {
      "water": 82,
      "soil": 50,
      "terrain": 32,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "DEC",
      "CEN",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Deeply rooted perennial trailing legume with exceptional drought survival."
  },
  {
    "id": "gliricidia-quickstick",
    "name": "Gliricidia (Quickstick)",
    "botanicalName": "Gliricidia sepium",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 76,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "SOU",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Living fence nitrogen tree providing abundant nutrient-rich loppings."
  },
  {
    "id": "sesbania-dhaincha-fodder",
    "name": "Sesbania (Dhaincha Fodder)",
    "botanicalName": "Sesbania aculeata",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 73,
      "soil": 58,
      "terrain": 28,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Tolerates sodicity and waterlogging; fixes 80 kg N/ha in two months."
  },
  {
    "id": "sesbania-grandiflora-agathi",
    "name": "Sesbania Grandiflora (Agathi)",
    "botanicalName": "Sesbania grandiflora (fodder)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 30,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 56.6,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rapid tree providing high-digestibility protein forage for goats."
  },
  {
    "id": "fodder-moringa",
    "name": "Fodder Moringa",
    "botanicalName": "Moringa oleifera (dense)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 34,
      "climate": 50,
      "economics": 78
    },
    "baseScore": 58.4,
    "indiaZones": [
      "SOU",
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Densely planted biomass crop cut every 35 days for superior milk yields."
  },
  {
    "id": "spineless-cactus-opuntia",
    "name": "Spineless Cactus (Opuntia)",
    "botanicalName": "Opuntia ficus-indica f. inermis",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 150,
    "factors": {
      "water": 95,
      "soil": 42,
      "terrain": 34,
      "climate": 40,
      "economics": 78
    },
    "baseScore": 57.8,
    "indiaZones": [
      "ARD",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Living water reservoir in arid droughts; pads contain 85-90% water for cattle."
  },
  {
    "id": "teosinte",
    "name": "Teosinte",
    "botanicalName": "Zea mexicana",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 54,
      "terrain": 38,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "NW",
      "CEN",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Wild progenitor of maize yielding heavy multi-cut succulent stalks."
  },
  {
    "id": "fodder-oats-kent",
    "name": "Fodder Oats (Kent)",
    "botanicalName": "Avena sativa (forage)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "75–90d",
    "waterRequirementMm": 420,
    "factors": {
      "water": 68,
      "soil": 56,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "NW",
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Sweet succulent winter green fodder with high milk lactation boost."
  },
  {
    "id": "fodder-barley",
    "name": "Fodder Barley",
    "botanicalName": "Hordeum vulgare (forage)",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "65–80d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 76,
      "soil": 56,
      "terrain": 36,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 58,
    "indiaZones": [
      "NW",
      "HIM",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Saline-resilient early winter forage crop for semi-arid livestock."
  },
  {
    "id": "italian-ryegrass",
    "name": "Italian Ryegrass",
    "botanicalName": "Lolium multiflorum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "120–150d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 56,
      "soil": 58,
      "terrain": 40,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Cool-season high sugar grass yielding excellent hay in mountain valleys."
  },
  {
    "id": "perennial-ryegrass",
    "name": "Perennial Ryegrass",
    "botanicalName": "Lolium perenne",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 54,
      "soil": 58,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Dense pasture turf grass for cool temperate rangelands."
  },
  {
    "id": "hairy-vetch",
    "name": "Hairy Vetch",
    "botanicalName": "Vicia villosa",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "90–110d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 40,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 54.4,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Cold-tolerant winter legume covering soil and fixing nitrogen."
  },
  {
    "id": "common-vetch",
    "name": "Common Vetch",
    "botanicalName": "Vicia sativa",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "85–100d",
    "waterRequirementMm": 380,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 38,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Protein-rich legume intercropped with oats for balanced cattle nutrition."
  },
  {
    "id": "red-clover",
    "name": "Red Clover",
    "botanicalName": "Trifolium pratense",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "Biennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 56,
      "soil": 58,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deep-rooted temperate legume fixing nitrogen in sub-alpine pastures."
  },
  {
    "id": "white-clover",
    "name": "White Clover",
    "botanicalName": "Trifolium repens",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 52,
      "soil": 58,
      "terrain": 42,
      "climate": 44,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Creeping stolon clover companion for perennial ryegrass swards."
  },
  {
    "id": "crimson-clover",
    "name": "Crimson Clover",
    "botanicalName": "Trifolium incarnatum",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Rabi",
    "durationDays": "90–110d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 62,
      "soil": 54,
      "terrain": 36,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fast-growing crimson flower clover providing early spring flush and nectar."
  },
  {
    "id": "birdsfoot-trefoil",
    "name": "Birdsfoot Trefoil",
    "botanicalName": "Lotus corniculatus",
    "section": "Fodder & Forage",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 44,
      "climate": 42,
      "economics": 67
    },
    "baseScore": 55.6,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Non-bloating tannin-rich pasture legume adapted to infertile mountain soils."
  },
  {
    "id": "aloe-vera",
    "name": "Aloe Vera",
    "botanicalName": "Aloe barbadensis miller",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 93,
      "soil": 48,
      "terrain": 34,
      "climate": 42,
      "economics": 100
    },
    "baseScore": 63.4,
    "indiaZones": [
      "ARD",
      "DEC",
      "WST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Supreme succulent; thrives on poor gravelly wastelands with massive gel market."
  },
  {
    "id": "eucalyptus-oil",
    "name": "Eucalyptus (Oil)",
    "botanicalName": "Eucalyptus globulus",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 76,
      "soil": 56,
      "terrain": 48,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 62.6,
    "indiaZones": [
      "SOU",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Blue gum distilled in Nilgiris for cineole medicinal decongestant oil."
  },
  {
    "id": "ashwagandha",
    "name": "Ashwagandha",
    "botanicalName": "Withania somnifera",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "150–180d",
    "waterRequirementMm": 250,
    "factors": {
      "water": 87,
      "soil": 52,
      "terrain": 34,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 58.6,
    "indiaZones": [
      "CEN",
      "ARD",
      "NW",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Indian ginseng adaptogen with withanolides; thrives on dry marginal soils."
  },
  {
    "id": "giloy-guduchi",
    "name": "Giloy (Guduchi)",
    "botanicalName": "Tinospora cordifolia",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 85,
      "soil": 52,
      "terrain": 34,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 58.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Immuno-modulator woody climber living without soil for months on moisture."
  },
  {
    "id": "moringa-leaf-powder",
    "name": "Moringa Leaf Powder",
    "botanicalName": "Moringa oleifera (powder)",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 80,
      "soil": 52,
      "terrain": 35,
      "climate": 51,
      "economics": 89
    },
    "baseScore": 61.4,
    "indiaZones": [
      "SOU",
      "DEC",
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dehydrated superfood leaf powder exported worldwide for nutrition."
  },
  {
    "id": "shatavari",
    "name": "Shatavari",
    "botanicalName": "Asparagus racemosus",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 54,
      "terrain": 40,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 58.4,
    "indiaZones": [
      "CEN",
      "HIM",
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Thorny climbing asparagus with succulent tuberous roots balancing hormones."
  },
  {
    "id": "tulsi-kapoor",
    "name": "Tulsi Kapoor",
    "botanicalName": "Ocimum kilimandscharicum",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 76,
      "soil": 50,
      "terrain": 34,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 56.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Camphor-scented perennial basil with high insecticidal essential oil."
  },
  {
    "id": "senna-sonamukhi",
    "name": "Senna (Sonamukhi)",
    "botanicalName": "Senna alexandrina",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "90–110d",
    "waterRequirementMm": 200,
    "factors": {
      "water": 91,
      "soil": 46,
      "terrain": 26,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "ARD",
      "WST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Laxative sennoside export crop thriving in arid red desert sands."
  },
  {
    "id": "isabgol-psyllium",
    "name": "Isabgol (Psyllium)",
    "botanicalName": "Plantago ovata",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "110–130d",
    "waterRequirementMm": 220,
    "factors": {
      "water": 87,
      "soil": 48,
      "terrain": 24,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 58,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Mucilaginous husk dietary fiber cultivated during dry mild winter."
  },
  {
    "id": "kalmegh-king-of-bitters",
    "name": "Kalmegh (King of Bitters)",
    "botanicalName": "Andrographis paniculata",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "120–140d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 32,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 56.2,
    "indiaZones": [
      "EST",
      "SOU",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Intensely bitter hepatoprotective herb combating viral fever and liver stress."
  },
  {
    "id": "safed-musli",
    "name": "Safed Musli",
    "botanicalName": "Chlorophytum borivilianum",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "90–105d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 34,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.2,
    "indiaZones": [
      "CEN",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "High-value aphrodisiac saponin tuber requiring raised beds and drainage."
  },
  {
    "id": "brahmi-water-hyssop",
    "name": "Brahmi (Water Hyssop)",
    "botanicalName": "Bacopa monnieri",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 32,
      "soil": 56,
      "terrain": 16,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 43.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Cognitive memory tonic creeping herb requiring wet soil or marsh canals."
  },
  {
    "id": "mandukaparni-gotu-kola",
    "name": "Mandukaparni (Gotu Kola)",
    "botanicalName": "Centella asiatica",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1300,
    "factors": {
      "water": 35,
      "soil": 56,
      "terrain": 18,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 44.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Brain tonic and wound-healing runner thriving on shady moist ditch banks."
  },
  {
    "id": "shankhpushpi",
    "name": "Shankhpushpi",
    "botanicalName": "Convolvulus pluricaulis",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 89,
      "soil": 46,
      "terrain": 28,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.6,
    "indiaZones": [
      "ARD",
      "NW",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Prostrate morning-glory with blue flowers calming nervous tension."
  },
  {
    "id": "coleus-forskohlii",
    "name": "Coleus Forskohlii",
    "botanicalName": "Plectranthus barbatus",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "150–180d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 38,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.4,
    "indiaZones": [
      "DEC",
      "SOU",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Forskolin-yielding root crop used in cardiac and anti-glaucoma medicines."
  },
  {
    "id": "geranium-rose",
    "name": "Geranium (Rose)",
    "botanicalName": "Pelargonium graveolens",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 44,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "HIM",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Rose-scented essential oil crop grown in cool upland hills."
  },
  {
    "id": "patchouli",
    "name": "Patchouli",
    "botanicalName": "Pogostemon cablin",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 46,
      "soil": 58,
      "terrain": 32,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 50.2,
    "indiaZones": [
      "SOU",
      "NE",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Base-note perfumery oil distilled from shade-grown subtropical leaves."
  },
  {
    "id": "citronella-java",
    "name": "Citronella (Java)",
    "botanicalName": "Cymbopogon winterianus",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 62,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.2,
    "indiaZones": [
      "NE",
      "SOU",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Mosquito repellent oil grass thriving in warm humid subtropical plains."
  },
  {
    "id": "davana",
    "name": "Davana",
    "botanicalName": "Artemisia pallens",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "100–120d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 30,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 55,
    "indiaZones": [
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fragrant winter rabi herb of Karnataka giving individualistic fruity perfume."
  },
  {
    "id": "chamomile-german",
    "name": "Chamomile (German)",
    "botanicalName": "Matricaria chamomilla",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "110–130d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 68,
      "soil": 52,
      "terrain": 32,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "NW",
      "HIM",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Chamazulene-rich daisy flowers brewed into sleep-inducing herbal teas."
  },
  {
    "id": "stevia-medicinal",
    "name": "Stevia (Medicinal)",
    "botanicalName": "Stevia rebaudiana (med)",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 32,
      "climate": 45,
      "economics": 45
    },
    "baseScore": 48,
    "indiaZones": [
      "DEC",
      "NW",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Calorie-free sweetener supporting glycemic control in diabetic dietaries."
  },
  {
    "id": "artemisia-sweet-wormwood",
    "name": "Artemisia (Sweet Wormwood)",
    "botanicalName": "Artemisia annua",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Rabi",
    "durationDays": "120–140d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 38,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "HIM",
      "NW"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "World Health Organization anti-malarial artemisinin compound source."
  },
  {
    "id": "sarpagandha",
    "name": "Sarpagandha",
    "botanicalName": "Rauvolfia serpentina",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 50,
      "soil": 56,
      "terrain": 34,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 48.8,
    "indiaZones": [
      "EST",
      "SOU",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Reserpine-rich root combating hypertension and psychiatric mania."
  },
  {
    "id": "licorice-mulethi",
    "name": "Licorice (Mulethi)",
    "botanicalName": "Glycyrrhiza glabra",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 56,
      "terrain": 30,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "NW",
      "ARD",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sweet glycyrrhizin root soothing sore throat and peptic ulceration."
  },
  {
    "id": "guggul",
    "name": "Guggul",
    "botanicalName": "Commiphora wightii",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 180,
    "factors": {
      "water": 93,
      "soil": 44,
      "terrain": 34,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 60,
    "indiaZones": [
      "ARD",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Endangered arid desert tree yielding cholesterol-lowering oleoresin."
  },
  {
    "id": "gymnema-gurmar",
    "name": "Gymnema (Gurmar)",
    "botanicalName": "Gymnema sylvestre",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 73,
      "soil": 54,
      "terrain": 36,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 57,
    "indiaZones": [
      "DEC",
      "CEN",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sugar destroyer woody climber abolishing sweetness taste reception."
  },
  {
    "id": "bael-leaf-medicinal",
    "name": "Bael Leaf (Medicinal)",
    "botanicalName": "Aegle marmelos (leaf)",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 300,
    "factors": {
      "water": 89,
      "soil": 62,
      "terrain": 36,
      "climate": 53,
      "economics": 100
    },
    "baseScore": 68,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Trifoliate leaves prescribed in Ayurveda for glycemic and digestive balance."
  },
  {
    "id": "bhringraj",
    "name": "Bhringraj",
    "botanicalName": "Eclipta prostrata",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Kharif",
    "durationDays": "90–120d",
    "waterRequirementMm": 900,
    "factors": {
      "water": 46,
      "soil": 56,
      "terrain": 26,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 48.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Master hair rejuvenator weed thriving in moist ditch borders."
  },
  {
    "id": "henna-mehndi",
    "name": "Henna (Mehndi)",
    "botanicalName": "Lawsonia inermis",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 89,
      "soil": 48,
      "terrain": 26,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 59.2,
    "indiaZones": [
      "ARD",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Natural lawsone dye bush thriving in arid heat of Sojat, Rajasthan."
  },
  {
    "id": "punarnava",
    "name": "Punarnava",
    "botanicalName": "Boerhavia diffusa",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 85,
      "soil": 48,
      "terrain": 30,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 57,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Renal regenerator weed surviving dry seasons by thick underground crown."
  },
  {
    "id": "gokshura-puncture-vine",
    "name": "Gokshura (Puncture Vine)",
    "botanicalName": "Tribulus terrestris",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Zaid",
    "durationDays": "60–75d",
    "waterRequirementMm": 180,
    "factors": {
      "water": 93,
      "soil": 44,
      "terrain": 26,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 58.8,
    "indiaZones": [
      "ARD",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Prostrate desert weed boosting testosterone and urinary health."
  },
  {
    "id": "chitrak-leadwort",
    "name": "Chitrak (Leadwort)",
    "botanicalName": "Plumbago zeylanica",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 76,
      "soil": 50,
      "terrain": 34,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 56.4,
    "indiaZones": [
      "DEC",
      "CEN",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Plumbagin-rich digestive fire igniter shrub suited to rocky scrubland."
  },
  {
    "id": "vacha-sweet-flag",
    "name": "Vacha (Sweet Flag)",
    "botanicalName": "Acorus calamus",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1500,
    "factors": {
      "water": 32,
      "soil": 58,
      "terrain": 18,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 44.2,
    "indiaZones": [
      "HIM",
      "EST",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Acorin-rich wetland root sharpening intellect and vocal articulation."
  },
  {
    "id": "kutki-picrorhiza",
    "name": "Kutki (Picrorhiza)",
    "botanicalName": "Picrorhiza kurroa",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 60,
      "soil": 50,
      "terrain": 64,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 60.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "High alpine Himalayan bitter root protecting liver against chemical injury."
  },
  {
    "id": "atis-aconite",
    "name": "Atis (Aconite)",
    "botanicalName": "Aconitum heterophyllum",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 62,
      "soil": 48,
      "terrain": 66,
      "climate": 36,
      "economics": 89
    },
    "baseScore": 60.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Non-poisonous medicinal tuber of sub-alpine meadows treating fevers."
  },
  {
    "id": "jatamansi-spikenard",
    "name": "Jatamansi (Spikenard)",
    "botanicalName": "Nardostachys jatamansi",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 58,
      "soil": 48,
      "terrain": 68,
      "climate": 36,
      "economics": 89
    },
    "baseScore": 59.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rhizome yielding deeply sedative grounding essential oil from alpine heights."
  },
  {
    "id": "pashanbheda",
    "name": "Pashanbheda",
    "botanicalName": "Bergenia ciliata",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 64,
      "soil": 52,
      "terrain": 60,
      "climate": 38,
      "economics": 78
    },
    "baseScore": 58.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Stone breaker growing in clefts of mountain rocks dissolving kidney calculi."
  },
  {
    "id": "kuth-costus",
    "name": "Kuth (Costus)",
    "botanicalName": "Saussurea costus",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 62,
      "soil": 52,
      "terrain": 56,
      "climate": 38,
      "economics": 89
    },
    "baseScore": 59.4,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Endemic aromatic mountain root of Kashmir dry temperate valleys."
  },
  {
    "id": "manjistha-indian-madder",
    "name": "Manjistha (Indian Madder)",
    "botanicalName": "Rubia cordifolia",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 48,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 57.2,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Climbing vine whose red root purifies blood and treats dermatological eczema."
  },
  {
    "id": "sarivan-desmodium",
    "name": "Sarivan (Desmodium)",
    "botanicalName": "Desmodium gangeticum",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 76,
      "soil": 52,
      "terrain": 34,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Member of Dashamoola ten roots treating inflammatory post-partum debility."
  },
  {
    "id": "kantakari",
    "name": "Kantakari",
    "botanicalName": "Solanum virginianum",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 91,
      "soil": 46,
      "terrain": 26,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 58.4,
    "indiaZones": [
      "ARD",
      "NW",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Thorny prostrate solanaceous herb renowned for chronic bronchodilation."
  },
  {
    "id": "brihati",
    "name": "Brihati",
    "botanicalName": "Solanum anguivi",
    "section": "Medicinal & Aromatic",
    "category": "Spices & Medicinal",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 380,
    "factors": {
      "water": 78,
      "soil": 50,
      "terrain": 34,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 56.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Erect prickly shrub whose berries and roots form part of Dashamoola."
  },
  {
    "id": "bougainvillea",
    "name": "Bougainvillea",
    "botanicalName": "Bougainvillea spectabilis",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 85,
      "soil": 50,
      "terrain": 42,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 60.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Vibrant drought-resilient paper flower climbing bush thriving in poor soil."
  },
  {
    "id": "marigold-african",
    "name": "Marigold (African)",
    "botanicalName": "Tagetes erecta",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 68,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Lutein-rich festive flower suppressing soil nematodes in rotation."
  },
  {
    "id": "marigold-french",
    "name": "Marigold (French)",
    "botanicalName": "Tagetes patula",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "50–65d",
    "waterRequirementMm": 320,
    "factors": {
      "water": 71,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 55.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Compact companion border marigold producing dense allelopathic root exudates."
  },
  {
    "id": "rose-damask",
    "name": "Rose (Damask)",
    "botanicalName": "Rosa damascena",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 64,
      "soil": 58,
      "terrain": 40,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 54.6,
    "indiaZones": [
      "NW",
      "HIM",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Distilled into precious rose attar and refreshing gulkand in Rajasthan/Kashmir."
  },
  {
    "id": "rose-hybrid-tea",
    "name": "Rose (Hybrid Tea)",
    "botanicalName": "Rosa x hybrida",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 52,
      "soil": 62,
      "terrain": 36,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 48.2,
    "indiaZones": [
      "DEC",
      "HIM",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Long-stem cut flower rose cultivated in climate-controlled greenhouse polyhouses."
  },
  {
    "id": "jasmine-mogra",
    "name": "Jasmine (Mogra)",
    "botanicalName": "Jasminum sambac",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 62,
      "soil": 56,
      "terrain": 32,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "SOU",
      "DEC",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Intensely fragrant white flower woven into hair garlands and distilled for attar."
  },
  {
    "id": "jasmine-jathimalli",
    "name": "Jasmine (Jathimalli)",
    "botanicalName": "Jasminum grandiflorum",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 34,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Spanish jasmine yielding rich concrete and absolute for international perfumery."
  },
  {
    "id": "jasmine-mullai",
    "name": "Jasmine (Mullai)",
    "botanicalName": "Jasminum auriculatum",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 64,
      "soil": 54,
      "terrain": 32,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Heavy-bearing star jasmine blooming abundantly during monsoon and autumn."
  },
  {
    "id": "tuberose-rajnigandha",
    "name": "Tuberose (Rajnigandha)",
    "botanicalName": "Polianthes tuberosa",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 56,
      "soil": 58,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.8,
    "indiaZones": [
      "EST",
      "WST",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Spiked white nocturnal bloomer with powerful sweet lactonic fragrance."
  },
  {
    "id": "carnation",
    "name": "Carnation",
    "botanicalName": "Dianthus caryophyllus",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 50,
      "soil": 60,
      "terrain": 40,
      "climate": 46,
      "economics": 45
    },
    "baseScore": 48.2,
    "indiaZones": [
      "HIM",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Cool-season high-value greenhouse cut flower with long vase longevity."
  },
  {
    "id": "gerbera",
    "name": "Gerbera",
    "botanicalName": "Gerbera jamesonii",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 700,
    "factors": {
      "water": 48,
      "soil": 60,
      "terrain": 36,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 47.4,
    "indiaZones": [
      "DEC",
      "HIM",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Vibrant daisy cut flower requiring sterile substrate and careful humidity."
  },
  {
    "id": "chrysanthemum-florist",
    "name": "Chrysanthemum (Florist)",
    "botanicalName": "Chrysanthemum x morifolium",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "100–120d",
    "waterRequirementMm": 450,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Short-day photoperiodic floral crop blooming profusely during winter festivals."
  },
  {
    "id": "gladiolus",
    "name": "Gladiolus",
    "botanicalName": "Gladiolus grandiflorus",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "85–100d",
    "waterRequirementMm": 550,
    "factors": {
      "water": 54,
      "soil": 58,
      "terrain": 34,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 49.6,
    "indiaZones": [
      "NW",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Tall showy floral spikes emerging from underground corms in winter."
  },
  {
    "id": "orchid-dendrobium",
    "name": "Orchid (Dendrobium)",
    "botanicalName": "Dendrobium nobile",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1100,
    "factors": {
      "water": 40,
      "soil": 54,
      "terrain": 40,
      "climate": 50,
      "economics": 35
    },
    "baseScore": 43.8,
    "indiaZones": [
      "NE",
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Epiphytic mist orchid grown in coconut husk media under shaded net houses."
  },
  {
    "id": "anthurium",
    "name": "Anthurium",
    "botanicalName": "Anthurium andraeanum",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 38,
      "soil": 56,
      "terrain": 32,
      "climate": 50,
      "economics": 35
    },
    "baseScore": 42.2,
    "indiaZones": [
      "SOU",
      "NE",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Heart-shaped glossy spathe cut flower demanding high humidity and shade."
  },
  {
    "id": "crossandra-kanakambaram",
    "name": "Crossandra (Kanakambaram)",
    "botanicalName": "Crossandra infundibuliformis",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 66,
      "soil": 52,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 52.6,
    "indiaZones": [
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Orange firecracker flower unyielding in heat and prized in South Indian garlands."
  },
  {
    "id": "sacred-lotus-kamal",
    "name": "Sacred Lotus (Kamal)",
    "botanicalName": "Nelumbo nucifera (flower)",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1600,
    "factors": {
      "water": 28,
      "soil": 56,
      "terrain": 14,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 40,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "India's national flower blooming above calm freshwater ponds and lakes."
  },
  {
    "id": "water-lily-neelkamal",
    "name": "Water Lily (Neelkamal)",
    "botanicalName": "Nymphaea nouchali",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1600,
    "factors": {
      "water": 28,
      "soil": 56,
      "terrain": 14,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 40,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Aquatic day or night blooming wetland flower floating on quiet waters."
  },
  {
    "id": "hibiscus-shoeblack",
    "name": "Hibiscus (Shoeblack)",
    "botanicalName": "Hibiscus rosa-sinensis",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 68,
      "soil": 54,
      "terrain": 32,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 56,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy tropical hedge bearing large showy flowers beneficial for hair care."
  },
  {
    "id": "china-aster",
    "name": "China Aster",
    "botanicalName": "Callistephus chinensis",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "90–110d",
    "waterRequirementMm": 400,
    "factors": {
      "water": 60,
      "soil": 54,
      "terrain": 32,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 51.8,
    "indiaZones": [
      "DEC",
      "WST",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Winter loose and cut flower widely grown around Bangalore and Pune."
  },
  {
    "id": "golden-shower-amaltas",
    "name": "Golden Shower (Amaltas)",
    "botanicalName": "Cassia fistula",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 56,
      "terrain": 36,
      "climate": 48,
      "economics": 89
    },
    "baseScore": 62.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Spectacular dry-season deciduous tree draped in cascading yellow blooms."
  },
  {
    "id": "gulmohar-flamboyant",
    "name": "Gulmohar (Flamboyant)",
    "botanicalName": "Delonix regia",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 78,
      "soil": 52,
      "terrain": 32,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 57.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fiery scarlet summer canopy tree providing shade across semi-arid avenues."
  },
  {
    "id": "oleander-kaner",
    "name": "Oleander (Kaner)",
    "botanicalName": "Nerium oleander",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 200,
    "factors": {
      "water": 91,
      "soil": 46,
      "terrain": 34,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 60.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Poisonous drought-invincible roadside shrub flowering continuously in dry heat."
  },
  {
    "id": "bird-of-paradise",
    "name": "Bird of Paradise",
    "botanicalName": "Strelitzia reginae",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 36,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 51.2,
    "indiaZones": [
      "SOU",
      "HIM",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Striking crane-like architectural cut flower with long vase longevity."
  },
  {
    "id": "heliconia",
    "name": "Heliconia",
    "botanicalName": "Heliconia rostrata",
    "section": "Flower & Ornamental",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1400,
    "factors": {
      "water": 42,
      "soil": 60,
      "terrain": 30,
      "climate": 50,
      "economics": 45
    },
    "baseScore": 45.4,
    "indiaZones": [
      "SOU",
      "ISL",
      "NE"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Hanging lobster claw tropical bract flower thriving in wet humid soils."
  },
  {
    "id": "babool-kikar",
    "name": "Babool (Kikar)",
    "botanicalName": "Vachellia nilotica",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 250,
    "factors": {
      "water": 93,
      "soil": 58,
      "terrain": 36,
      "climate": 48,
      "economics": 89
    },
    "baseScore": 64.8,
    "indiaZones": [
      "ARD",
      "NW",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Supreme arid multipurpose legume tree yielding gum, timber, and goat fodder."
  },
  {
    "id": "neem-agroforestry",
    "name": "Neem Agroforestry",
    "botanicalName": "Azadirachta indica (agro)",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 66,
      "terrain": 35,
      "climate": 62,
      "economics": 100
    },
    "baseScore": 69,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Universal windbreak tree enriching topsoil and detoxifying environment."
  },
  {
    "id": "pongamia-biofuel",
    "name": "Pongamia Biofuel",
    "botanicalName": "Millettia pinnata (bio)",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 75,
      "soil": 66,
      "terrain": 30,
      "climate": 62,
      "economics": 100
    },
    "baseScore": 66.6,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy nitrogen-fixing avenue tree reclaiming sodic and rocky wastelands."
  },
  {
    "id": "eucalyptus-timber",
    "name": "Eucalyptus (Timber)",
    "botanicalName": "Eucalyptus tereticornis",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 68,
      "soil": 58,
      "terrain": 36,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 57.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing industrial paper-pulp pole tree planted on farm bunds."
  },
  {
    "id": "dhaincha",
    "name": "Dhaincha",
    "botanicalName": "Sesbania bispinosa",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "60–75d",
    "waterRequirementMm": 350,
    "factors": {
      "water": 76,
      "soil": 58,
      "terrain": 30,
      "climate": 46,
      "economics": 89
    },
    "baseScore": 59.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Rapid green manure fixing up to 80 kg N/ha; breaks saline encrustations."
  },
  {
    "id": "melia-dubia-malabar-neem",
    "name": "Melia Dubia (Malabar Neem)",
    "botanicalName": "Melia dubia",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 66,
      "soil": 56,
      "terrain": 36,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 52,
    "indiaZones": [
      "SOU",
      "DEC",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Fastest-growing hardwood tree in India for plywood, biomass, and packing cases."
  },
  {
    "id": "teak",
    "name": "Teak",
    "botanicalName": "Tectona grandis",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 950,
    "factors": {
      "water": 54,
      "soil": 62,
      "terrain": 38,
      "climate": 46,
      "economics": 23
    },
    "baseScore": 44.6,
    "indiaZones": [
      "CEN",
      "WST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "King of timber woods; high silica ring-porous heartwood of highest value."
  },
  {
    "id": "seaweed-gracilaria",
    "name": "Seaweed Gracilaria",
    "botanicalName": "Gracilaria edulis",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "45–60d",
    "waterRequirementMm": 2000,
    "factors": {
      "water": 20,
      "soil": 50,
      "terrain": 10,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 36.4,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Marine red agarophyte algae cultivated on coastal bamboo rafts."
  },
  {
    "id": "seaweed-kappaphycus",
    "name": "Seaweed Kappaphycus",
    "botanicalName": "Kappaphycus alvarezii",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Kharif",
    "durationDays": "45–60d",
    "waterRequirementMm": 2000,
    "factors": {
      "water": 20,
      "soil": 50,
      "terrain": 10,
      "climate": 46,
      "economics": 56
    },
    "baseScore": 36.4,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": true,
    "droughtTolerance": "Low",
    "agronomicNotes": "Fast-growing carrageenan marine seaweed cultivated along Tamil Nadu coast."
  },
  {
    "id": "casuarina-beefwood",
    "name": "Casuarina (Beefwood)",
    "botanicalName": "Casuarina equisetifolia",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 450,
    "factors": {
      "water": 78,
      "soil": 54,
      "terrain": 30,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 57.2,
    "indiaZones": [
      "SOU",
      "EST",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Coastal actinorhizal windbreak fixing nitrogen in poor coastal beach sands."
  },
  {
    "id": "sissoo-shisham",
    "name": "Sissoo (Shisham)",
    "botanicalName": "Dalbergia sissoo",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 73,
      "soil": 62,
      "terrain": 36,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 59,
    "indiaZones": [
      "NW",
      "IGP",
      "CEN",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Premier North Indian furniture timber tree with dense interlocked grain."
  },
  {
    "id": "red-sanders-raktachandan",
    "name": "Red Sanders (Raktachandan)",
    "botanicalName": "Pterocarpus santalinus",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 350,
    "factors": {
      "water": 82,
      "soil": 52,
      "terrain": 44,
      "climate": 40,
      "economics": 89
    },
    "baseScore": 61.4,
    "indiaZones": [
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Endemic to Seshachalam hills; wavy-grain red heartwood of colossal value."
  },
  {
    "id": "mahogany-african",
    "name": "Mahogany (African)",
    "botanicalName": "Khaya senegalensis",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 66,
      "soil": 58,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 54.2,
    "indiaZones": [
      "SOU",
      "DEC",
      "CEN"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Dry-zone mahogany with lustrous reddish-brown timber resistant to borers."
  },
  {
    "id": "mahogany-american",
    "name": "Mahogany (American)",
    "botanicalName": "Swietenia macrophylla",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 52,
      "soil": 62,
      "terrain": 34,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 50.4,
    "indiaZones": [
      "SOU",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Classic cabinet timber tree requiring deep moist alluvial soils."
  },
  {
    "id": "poplar",
    "name": "Poplar",
    "botanicalName": "Populus deltoides",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 900,
    "factors": {
      "water": 46,
      "soil": 62,
      "terrain": 28,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 49.4,
    "indiaZones": [
      "NW",
      "IGP"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Deciduous agroforestry tree intercropped with rabi wheat in Punjab and UP."
  },
  {
    "id": "kadam",
    "name": "Kadam",
    "botanicalName": "Neolamarckia cadamba",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 1200,
    "factors": {
      "water": 45,
      "soil": 62,
      "terrain": 30,
      "climate": 48,
      "economics": 56
    },
    "baseScore": 48.2,
    "indiaZones": [
      "EST",
      "NE",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Low",
    "agronomicNotes": "Rapid-growing shade tree with orange globe blossoms for matchwood industry."
  },
  {
    "id": "silver-oak",
    "name": "Silver Oak",
    "botanicalName": "Grevillea robusta",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 71,
      "soil": 56,
      "terrain": 46,
      "climate": 44,
      "economics": 78
    },
    "baseScore": 59,
    "indiaZones": [
      "SOU",
      "DEC",
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Shade tree for coffee and tea plantations; provides rot-resistant timber."
  },
  {
    "id": "subabul-timber-variety",
    "name": "Subabul (Timber Variety)",
    "botanicalName": "Leucaena leucocephala (timber)",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 76,
      "soil": 56,
      "terrain": 34,
      "climate": 44,
      "economics": 67
    },
    "baseScore": 55.4,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Giant subabul varieties grown on 4-year rotations for paper pulp."
  },
  {
    "id": "acacia-mangium",
    "name": "Acacia Mangium",
    "botanicalName": "Acacia mangium",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 900,
    "factors": {
      "water": 60,
      "soil": 56,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 53.4,
    "indiaZones": [
      "SOU",
      "NE",
      "ISL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Acid-soil pioneer legume tree producing pulpwood and restoring mine spoils."
  },
  {
    "id": "acacia-auriculiformis",
    "name": "Acacia Auriculiformis",
    "botanicalName": "Acacia auriculiformis",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 500,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 34,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 56.6,
    "indiaZones": [
      "EST",
      "SOU",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Hardy earleaf wattle growing on impoverished laterite gravels."
  },
  {
    "id": "anjan-hardwickia",
    "name": "Anjan (Hardwickia)",
    "botanicalName": "Hardwickia binata",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 280,
    "factors": {
      "water": 89,
      "soil": 52,
      "terrain": 36,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 61.6,
    "indiaZones": [
      "DEC",
      "CEN",
      "WST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "One of the hardest and heaviest Indian timbers; excellent dryland drought survival."
  },
  {
    "id": "khejri-prosopis-cineraria",
    "name": "Khejri (Prosopis cineraria)",
    "botanicalName": "Prosopis cineraria",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 150,
    "factors": {
      "water": 95,
      "soil": 52,
      "terrain": 26,
      "climate": 42,
      "economics": 100
    },
    "baseScore": 63,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "State tree of Rajasthan; holy tree of Bishnois fixing soil fertility in Thar."
  },
  {
    "id": "rohida-desert-teak",
    "name": "Rohida (Desert Teak)",
    "botanicalName": "Tecomella undulata",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 180,
    "factors": {
      "water": 93,
      "soil": 50,
      "terrain": 28,
      "climate": 42,
      "economics": 89
    },
    "baseScore": 60.4,
    "indiaZones": [
      "ARD"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Beautiful orange-flowered desert timber tree resisting extreme heat."
  },
  {
    "id": "banj-oak",
    "name": "Banj Oak",
    "botanicalName": "Quercus leucotrichophora",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 800,
    "factors": {
      "water": 66,
      "soil": 62,
      "terrain": 56,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 60.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Himalayan evergreen water-recharging oak holding hillside aquifers."
  },
  {
    "id": "morus-serrata-himalayan-mulberry",
    "name": "Morus Serrata (Himalayan Mulberry)",
    "botanicalName": "Morus serrata",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 73,
      "soil": 56,
      "terrain": 52,
      "climate": 42,
      "economics": 78
    },
    "baseScore": 60.2,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Sturdy wild mountain mulberry tree yielding tough wood for hockey sticks."
  },
  {
    "id": "chir-pine",
    "name": "Chir Pine",
    "botanicalName": "Pinus roxburghii",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 76,
      "soil": 48,
      "terrain": 58,
      "climate": 40,
      "economics": 78
    },
    "baseScore": 60,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Subtropical Himalayan pine tapped for industrial turpentine and rosin."
  },
  {
    "id": "deodar-cedar",
    "name": "Deodar Cedar",
    "botanicalName": "Cedrus deodara",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 62,
      "soil": 60,
      "terrain": 60,
      "climate": 40,
      "economics": 67
    },
    "baseScore": 57.8,
    "indiaZones": [
      "HIM"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Timber of the gods; durable aromatic insect-repellent temple wood."
  },
  {
    "id": "indian-rosewood-sheesham",
    "name": "Indian Rosewood (Sheesham)",
    "botanicalName": "Dalbergia latifolia",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 850,
    "factors": {
      "water": 62,
      "soil": 64,
      "terrain": 38,
      "climate": 48,
      "economics": 45
    },
    "baseScore": 51.4,
    "indiaZones": [
      "SOU",
      "WST",
      "DEC"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Deep purple-brown luxury timber used for musical instruments and fine art."
  },
  {
    "id": "bijasal-malabar-kino",
    "name": "Bijasal (Malabar Kino)",
    "botanicalName": "Pterocarpus marsupium",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 650,
    "factors": {
      "water": 68,
      "soil": 62,
      "terrain": 36,
      "climate": 48,
      "economics": 67
    },
    "baseScore": 56.2,
    "indiaZones": [
      "CEN",
      "DEC",
      "SOU"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Heartwood cups turn drinking water blue; proven anti-diabetic activity."
  },
  {
    "id": "haldu",
    "name": "Haldu",
    "botanicalName": "Haldina cordifolia",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 700,
    "factors": {
      "water": 66,
      "soil": 58,
      "terrain": 38,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 55,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Yellow heartwood timber tree resistant to rot and used for textile bobbins."
  },
  {
    "id": "gamhar-yemane",
    "name": "Gamhar (Yemane)",
    "botanicalName": "Gmelina arborea",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 750,
    "factors": {
      "water": 64,
      "soil": 58,
      "terrain": 34,
      "climate": 46,
      "economics": 67
    },
    "baseScore": 53.8,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "Moderate",
    "agronomicNotes": "Lightweight stable timber tree growing rapidly in warm subtropical rainfall."
  },
  {
    "id": "siris-white",
    "name": "Siris (White)",
    "botanicalName": "Albizia procera",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 550,
    "factors": {
      "water": 73,
      "soil": 56,
      "terrain": 32,
      "climate": 46,
      "economics": 78
    },
    "baseScore": 57,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Fast-growing nitrogen-fixing tree thriving in flooded and dryland areas."
  },
  {
    "id": "siris-black",
    "name": "Siris (Black)",
    "botanicalName": "Albizia lebbeck",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 400,
    "factors": {
      "water": 82,
      "soil": 54,
      "terrain": 32,
      "climate": 44,
      "economics": 89
    },
    "baseScore": 60.2,
    "indiaZones": [
      "ALL"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Flea tree that resists severe drought, salty winds, and poor alkaline soil."
  },
  {
    "id": "indian-coral-tree",
    "name": "Indian Coral Tree",
    "botanicalName": "Erythrina variegata",
    "section": "Tree & Agroforestry",
    "category": "Agroforestry",
    "season": "Perennial",
    "durationDays": "Perennial",
    "waterRequirementMm": 600,
    "factors": {
      "water": 73,
      "soil": 52,
      "terrain": 30,
      "climate": 48,
      "economics": 78
    },
    "baseScore": 56.2,
    "indiaZones": [
      "SOU",
      "WST",
      "EST"
    ],
    "worldRegions": [
      "South Asia"
    ],
    "commercialInIndia": true,
    "isIndoorControlled": false,
    "isAquatic": false,
    "droughtTolerance": "High",
    "agronomicNotes": "Support tree for betel vine and black pepper; fixes abundant nitrogen."
  }
];
