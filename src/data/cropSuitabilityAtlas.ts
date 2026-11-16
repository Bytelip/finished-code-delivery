/**
 * FIELD SHIFT: India Comprehensive Crop Suitability Atlas
 * 5-Factor 100-Point Agro-Ecological Scoring Model & 15 Agro-Climatic Zones
 *
 * Scoring Formula:
 * Overall Score = (Water * 0.26) + (Soil * 0.22) + (Terrain * 0.14) + (Climate * 0.23) + (Economics * 0.15)
 */

export interface AgroClimaticZone {
  zoneNumber: number;
  name: string;
  code: string;
  description: string;
  statesCovered: string[];
  dominantSoil: string;
  annualRainfallMm: { min: number; max: number };
  representativeCrops: string[];
}

export const AGRO_CLIMATIC_ZONES: AgroClimaticZone[] = [
  {
    zoneNumber: 1,
    name: "Western Himalayan Region",
    code: "WHR",
    description: "Cold alpine and sub-temperate valleys, skeletal and hill soils.",
    statesCovered: ["Jammu & Kashmir", "Himachal Pradesh", "Uttarakhand"],
    dominantSoil: "Brown Hill & Podzolic Soil",
    annualRainfallMm: { min: 650, max: 2000 },
    representativeCrops: ["Apple", "Barley", "Walnut", "Maize", "Saffron"],
  },
  {
    zoneNumber: 2,
    name: "Eastern Himalayan Region",
    code: "EHR",
    description: "High humidity, high rainfall, acidic red and laterite soils.",
    statesCovered: [
      "Assam",
      "Arunachal Pradesh",
      "Meghalaya",
      "Nagaland",
      "Manipur",
      "Mizoram",
      "Tripura",
      "Sikkim",
    ],
    dominantSoil: "Red Loamy & Laterite Soil",
    annualRainfallMm: { min: 1800, max: 3500 },
    representativeCrops: ["Tea", "Rice", "Cardamom", "Ginger", "Pineapple"],
  },
  {
    zoneNumber: 3,
    name: "Lower Gangetic Plains",
    code: "LGP",
    description: "Flood-prone alluvial delta with high water tables.",
    statesCovered: ["West Bengal"],
    dominantSoil: "Deltaic Alluvium",
    annualRainfallMm: { min: 1400, max: 2000 },
    representativeCrops: ["Rice", "Jute", "Potato", "Sesame", "Mustard"],
  },
  {
    zoneNumber: 4,
    name: "Middle Gangetic Plains",
    code: "MGP",
    description: "Fertile alluvial plains with intensive irrigation canal networks.",
    statesCovered: ["Bihar", "Eastern Uttar Pradesh"],
    dominantSoil: "Calcareous Alluvial",
    annualRainfallMm: { min: 1000, max: 1400 },
    representativeCrops: ["Rice", "Wheat", "Maize", "Lentil", "Pigeon Pea"],
  },
  {
    zoneNumber: 5,
    name: "Upper Gangetic Plains",
    code: "UGP",
    description: "Sub-humid to semi-arid alluvial plains, intensive tubewell farming.",
    statesCovered: ["Western Uttar Pradesh", "Central Uttar Pradesh"],
    dominantSoil: "Alluvial Loam",
    annualRainfallMm: { min: 700, max: 1000 },
    representativeCrops: ["Sugarcane", "Wheat", "Rice", "Mustard", "Chickpea"],
  },
  {
    zoneNumber: 6,
    name: "Trans-Gangetic Plains",
    code: "TGP",
    description: "High-yield Green Revolution belt facing severe groundwater depletion.",
    statesCovered: ["Punjab", "Haryana", "Delhi", "Chandigarh"],
    dominantSoil: "Alluvial & Silt Loam",
    annualRainfallMm: { min: 400, max: 800 },
    representativeCrops: ["Wheat", "Paddy Rice", "Cotton", "Mustard", "Maize"],
  },
  {
    zoneNumber: 7,
    name: "Eastern Plateau & Hills",
    code: "EPH",
    description: "Undulating plateau with poor water retention and high tribal farming.",
    statesCovered: ["Jharkhand", "Odisha", "Chhattisgarh"],
    dominantSoil: "Red & Yellow Soil",
    annualRainfallMm: { min: 1200, max: 1600 },
    representativeCrops: ["Rice", "Niger", "Horse Gram", "Black Gram", "Turmeric"],
  },
  {
    zoneNumber: 8,
    name: "Central Plateau & Hills",
    code: "CPH",
    description: "Semi-arid plateau with mixed red and black soils prone to droughts.",
    statesCovered: ["Madhya Pradesh", "Rajasthan (South)", "Uttar Pradesh (Bundelkhand)"],
    dominantSoil: "Mixed Red & Medium Black",
    annualRainfallMm: { min: 800, max: 1200 },
    representativeCrops: ["Soybean", "Chickpea", "Sorghum", "Wheat", "Coriander"],
  },
  {
    zoneNumber: 9,
    name: "Western Plateau & Hills",
    code: "WPH",
    description: "Deccan trap basalt region; black cotton soil with high deficit risk.",
    statesCovered: ["Maharashtra", "Madhya Pradesh (West)"],
    dominantSoil: "Deep Black Cotton Soil",
    annualRainfallMm: { min: 600, max: 1000 },
    representativeCrops: ["Cotton", "Soybean", "Sorghum", "Pigeon Pea", "Onion"],
  },
  {
    zoneNumber: 10,
    name: "Southern Plateau & Hills",
    code: "SPH",
    description:
      "Hard-rock gneiss/granite plateau with severe borewell over-exploitation; rainfed drought belt.",
    statesCovered: [
      "Karnataka (Kolar, Tumkur, Bangalore, Bellary)",
      "Telangana",
      "Andhra Pradesh (Rayalaseema)",
      "Tamil Nadu (Interior)",
    ],
    dominantSoil: "Red Sandy & Loamy Alfisols",
    annualRainfallMm: { min: 500, max: 900 },
    representativeCrops: [
      "Finger Millet / Ragi",
      "Sorghum",
      "Pearl Millet",
      "Horse Gram",
      "Groundnut",
      "Pigeon Pea",
      "Mango",
      "Tomato",
    ],
  },
  {
    zoneNumber: 11,
    name: "East Coast Plains & Hills",
    code: "ECP",
    description:
      "Maritime climate with deltaic alluvial and coastal saline soils; cyclone vulnerable.",
    statesCovered: ["Andhra Pradesh (Coastal)", "Tamil Nadu (Coastal)", "Odisha (Coastal)"],
    dominantSoil: "Coastal Alluvium & Deltaic Soils",
    annualRainfallMm: { min: 900, max: 1300 },
    representativeCrops: ["Rice", "Groundnut", "Black Gram", "Coconut", "Cashew"],
  },
  {
    zoneNumber: 12,
    name: "West Coast Plains & Ghats",
    code: "WCG",
    description: "Steep orographic rainfall, high organic matter, plantation & spices hub.",
    statesCovered: ["Kerala", "Karnataka (Coastal & Malnad)", "Goa", "Maharashtra (Konkan)"],
    dominantSoil: "Laterite & Coastal Sandy Soil",
    annualRainfallMm: { min: 2000, max: 3800 },
    representativeCrops: ["Black Pepper", "Cardamom", "Cashew", "Coconut", "Arecanut", "Paddy"],
  },
  {
    zoneNumber: 13,
    name: "Gujarat Plains & Hills",
    code: "GPH",
    description: "Arid to semi-arid marine fringe; salinity ingress and dairy-pasture dominance.",
    statesCovered: ["Gujarat"],
    dominantSoil: "Medium Black & Saline Alluvium",
    annualRainfallMm: { min: 500, max: 1000 },
    representativeCrops: ["Groundnut", "Cotton", "Castor", "Sesame", "Cumin"],
  },
  {
    zoneNumber: 14,
    name: "Western Dry Region",
    code: "WDR",
    description: "Extreme Thar desert conditions, ephemeral rainfall, sandy dune soils.",
    statesCovered: ["Rajasthan (Arid West: Jaisalmer, Bikaner, Barmer, Jodhpur)"],
    dominantSoil: "Desert Sandy Soils",
    annualRainfallMm: { min: 100, max: 400 },
    representativeCrops: ["Pearl Millet", "Guar", "Moth Bean", "Cumin", "Isabgol"],
  },
  {
    zoneNumber: 15,
    name: "The Islands",
    code: "ISL",
    description: "Equatorial humid maritime archipelago with coralline sandy soils.",
    statesCovered: ["Andaman & Nicobar Islands", "Lakshadweep"],
    dominantSoil: "Coralline & Coastal Sandy Alluvium",
    annualRainfallMm: { min: 2500, max: 3200 },
    representativeCrops: ["Coconut", "Arecanut", "Banana", "Spices", "Cassava"],
  },
];

export type CropCategory =
  "Cereals & Millets" | "Pulses" | "Oilseeds & Commercial" | "Horticulture, Vegetables & Spices";

export type CropSeason = "Kharif" | "Rabi" | "Zaid" | "Perennial" | "Multi-season";

export interface CropSuitabilityFactors {
  water: number; // 26%
  soil: number; // 22%
  terrain: number; // 14%
  climate: number; // 23%
  economics: number; // 15%
}

export interface CropAtlasEntry {
  id: string;
  name: string;
  localName?: string;
  botanicalName?: string;
  category: CropCategory;
  season: CropSeason;
  durationDays: string;
  waterRequirementMm: number; // Seasonal crop water need (ETc)
  factors: CropSuitabilityFactors;
  baseScore: number;
  primaryZones: number[]; // Zone numbers 1-15
  droughtTolerance: "High" | "Moderate" | "Low";
  agronomicNotes: string;
  fieldShiftAlternativeFor?: string[]; // Unsustainable crops this can substitute
  nitrogenFixing?: boolean;
}

/**
 * 5-Factor Scoring Formula:
 * Overall Score = (Water * 0.26) + (Soil * 0.22) + (Terrain * 0.14) + (Climate * 0.23) + (Economics * 0.15)
 */
export function calculate5FactorScore(factors: CropSuitabilityFactors): number {
  const score =
    factors.water * 0.26 +
    factors.soil * 0.22 +
    factors.terrain * 0.14 +
    factors.climate * 0.23 +
    factors.economics * 0.15;
  return Math.round(score * 10) / 10;
}

export const CROP_SUITABILITY_ATLAS: CropAtlasEntry[] = [
  // ---------------- CEREALS & MILLETS ----------------
  {
    id: "pearl-millet",
    name: "Pearl Millet",
    localName: "Bajra / Sajje",
    botanicalName: "Pennisetum glaucum",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "75–90",
    waterRequirementMm: 300,
    factors: { water: 95, soil: 75, terrain: 85, climate: 95, economics: 85 },
    baseScore: 87.7,
    primaryZones: [10, 14, 13, 8, 9, 6],
    droughtTolerance: "High",
    agronomicNotes:
      "Superb heat and drought tolerance. Thrives on light sandy loams with minimal nitrogen.",
    fieldShiftAlternativeFor: ["rice", "sugarcane", "maize"],
  },
  {
    id: "sorghum",
    name: "Sorghum",
    localName: "Jowar / Jola",
    botanicalName: "Sorghum bicolor",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "100–115",
    waterRequirementMm: 400,
    factors: { water: 90, soil: 85, terrain: 85, climate: 90, economics: 85 },
    baseScore: 87.5,
    primaryZones: [10, 9, 8, 13, 7],
    droughtTolerance: "High",
    agronomicNotes:
      "Deep rooting system accesses subsoil moisture. Dual-purpose for nutritious grain and livestock stover.",
    fieldShiftAlternativeFor: ["rice", "sugarcane", "cotton"],
  },
  {
    id: "foxtail-millet",
    name: "Foxtail Millet",
    localName: "Navane / Kangni",
    botanicalName: "Setaria italica",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "70–80",
    waterRequirementMm: 250,
    factors: { water: 95, soil: 75, terrain: 85, climate: 90, economics: 80 },
    baseScore: 85.8,
    primaryZones: [10, 8, 9, 11],
    droughtTolerance: "High",
    agronomicNotes:
      "Ultra-fast maturity (75 days). Highly resilient catch-crop when monsoons arrive late.",
    fieldShiftAlternativeFor: ["rice"],
  },
  {
    id: "little-millet",
    name: "Little Millet",
    localName: "Same / Kutki",
    botanicalName: "Panicum sumatrense",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "75–85",
    waterRequirementMm: 260,
    factors: { water: 95, soil: 75, terrain: 80, climate: 90, economics: 80 },
    baseScore: 85.1,
    primaryZones: [10, 7, 8, 2],
    droughtTolerance: "High",
    agronomicNotes:
      "Tolerates waterlogging as well as drought. Excellent fit for marginal gravelly soils.",
    fieldShiftAlternativeFor: ["rice"],
  },
  {
    id: "finger-millet",
    name: "Finger Millet / Ragi",
    localName: "Ragi / Mandua",
    botanicalName: "Eleusine coracana",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "105–120",
    waterRequirementMm: 350,
    factors: { water: 90, soil: 80, terrain: 80, climate: 90, economics: 80 },
    baseScore: 84.9,
    primaryZones: [10, 7, 12, 11, 1],
    droughtTolerance: "High",
    agronomicNotes:
      "Flagship climate-resilient staple for Southern Plateau (Karnataka/Kolar). Rich in calcium and iron with high MSP stability.",
    fieldShiftAlternativeFor: ["rice", "sugarcane", "maize"],
  },
  {
    id: "barnyard-millet",
    name: "Barnyard Millet",
    localName: "Sanwa / Oodalu",
    botanicalName: "Echinochloa frumentacea",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "60–75",
    waterRequirementMm: 220,
    factors: { water: 95, soil: 70, terrain: 85, climate: 90, economics: 75 },
    baseScore: 84.3,
    primaryZones: [1, 10, 7, 2],
    droughtTolerance: "High",
    agronomicNotes:
      "Fastest growing millet among all small millets. Yields grain and nutritious straw under harsh conditions.",
  },
  {
    id: "kodo-millet",
    name: "Kodo Millet",
    localName: "Kodon / Harka",
    botanicalName: "Paspalum scrobiculatum",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "95–110",
    waterRequirementMm: 280,
    factors: { water: 95, soil: 70, terrain: 80, climate: 90, economics: 75 },
    baseScore: 83.6,
    primaryZones: [7, 8, 10],
    droughtTolerance: "High",
    agronomicNotes:
      "Resistant to drought and locusts; grain has prolonged storage viability (decades).",
  },
  {
    id: "barley",
    name: "Barley",
    localName: "Jau",
    botanicalName: "Hordeum vulgare",
    category: "Cereals & Millets",
    season: "Rabi",
    durationDays: "110–125",
    waterRequirementMm: 320,
    factors: { water: 80, soil: 80, terrain: 85, climate: 85, economics: 75 },
    baseScore: 81.1,
    primaryZones: [1, 6, 5, 14, 8],
    droughtTolerance: "High",
    agronomicNotes:
      "High salinity tolerance; requires 30% less water than wheat during the Rabi cycle.",
    fieldShiftAlternativeFor: ["wheat"],
  },
  {
    id: "maize",
    name: "Maize",
    localName: "Makka / Musukina Jola",
    botanicalName: "Zea mays",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "90–110",
    waterRequirementMm: 500,
    factors: { water: 65, soil: 80, terrain: 75, climate: 80, economics: 65 },
    baseScore: 73.2,
    primaryZones: [10, 8, 6, 4, 1],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "High nutrient feeder; susceptible to mid-season moisture stress during tasseling and silking.",
    fieldShiftAlternativeFor: ["rice"],
  },
  {
    id: "wheat",
    name: "Wheat",
    localName: "Gehun",
    botanicalName: "Triticum aestivum",
    category: "Cereals & Millets",
    season: "Rabi",
    durationDays: "120–140",
    waterRequirementMm: 450,
    factors: { water: 65, soil: 85, terrain: 80, climate: 75, economics: 55 },
    baseScore: 72.3,
    primaryZones: [6, 5, 4, 8],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "Rabi staple vulnerable to terminal heat stress above 32°C during grain-fill stage.",
  },
  {
    id: "rice",
    name: "Rice / Paddy",
    localName: "Dhan / Akki",
    botanicalName: "Oryza sativa",
    category: "Cereals & Millets",
    season: "Kharif",
    durationDays: "120–150",
    waterRequirementMm: 1250,
    factors: { water: 35, soil: 75, terrain: 45, climate: 75, economics: 50 },
    baseScore: 56.6,
    primaryZones: [3, 2, 4, 11, 12],
    droughtTolerance: "Low",
    agronomicNotes:
      "Requires ~1200mm water; severely depletes groundwater aquifers in semi-arid hard-rock zones (Zone 10/14).",
  },

  // ---------------- PULSES ----------------
  {
    id: "moth-bean",
    name: "Moth Bean",
    localName: "Matki",
    botanicalName: "Vigna aconitifolia",
    category: "Pulses",
    season: "Kharif",
    durationDays: "65–75",
    waterRequirementMm: 200,
    factors: { water: 98, soil: 65, terrain: 85, climate: 98, economics: 85 },
    baseScore: 87.0,
    primaryZones: [14, 13, 8, 10],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes:
      "Most drought-hardy legume in India. Thrives in arid sandy dunes with annual rainfall under 300mm.",
  },
  {
    id: "horse-gram",
    name: "Horse Gram",
    localName: "Kulthi / Hurali",
    botanicalName: "Macrotyloma uniflorum",
    category: "Pulses",
    season: "Kharif",
    durationDays: "90–110",
    waterRequirementMm: 240,
    factors: { water: 95, soil: 70, terrain: 85, climate: 95, economics: 85 },
    baseScore: 86.6,
    primaryZones: [10, 7, 8, 9, 11],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes:
      "Premier drought-resilient pulse for South India. Excellent for zero-tillage relay cropping after Ragi.",
    fieldShiftAlternativeFor: ["rice", "sugarcane"],
  },
  {
    id: "green-gram",
    name: "Green Gram / Moong",
    localName: "Moong / Hesaru",
    botanicalName: "Vigna radiata",
    category: "Pulses",
    season: "Zaid",
    durationDays: "60–70",
    waterRequirementMm: 280,
    factors: { water: 90, soil: 75, terrain: 85, climate: 90, economics: 80 },
    baseScore: 84.5,
    primaryZones: [10, 6, 8, 9, 13, 4],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes:
      "Short-duration pulse that fixes 40–50 kg N/ha into soil. Ideal for summer catch crop rotation.",
  },
  {
    id: "cowpea",
    name: "Cowpea / Lobia",
    localName: "Alasande / Chawli",
    botanicalName: "Vigna unguiculata",
    category: "Pulses",
    season: "Kharif",
    durationDays: "70–85",
    waterRequirementMm: 300,
    factors: { water: 90, soil: 75, terrain: 85, climate: 90, economics: 80 },
    baseScore: 84.5,
    primaryZones: [10, 11, 12, 8, 14],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes: "Excellent cover crop suppressing weeds and soil erosion on sloping terrains.",
  },
  {
    id: "black-gram",
    name: "Black Gram / Urad",
    localName: "Urad / Uddu",
    botanicalName: "Vigna mungo",
    category: "Pulses",
    season: "Kharif",
    durationDays: "75–90",
    waterRequirementMm: 320,
    factors: { water: 85, soil: 75, terrain: 80, climate: 85, economics: 80 },
    baseScore: 81.4,
    primaryZones: [10, 11, 7, 9, 4],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes: "High protein legume suited for intercropping with sorghum, maize, or cotton.",
  },
  {
    id: "pigeon-pea",
    name: "Pigeon Pea / Tur",
    localName: "Arhar / Togari",
    botanicalName: "Cajanus cajan",
    category: "Pulses",
    season: "Kharif",
    durationDays: "150–180",
    waterRequirementMm: 450,
    factors: { water: 85, soil: 75, terrain: 80, climate: 85, economics: 75 },
    baseScore: 80.6,
    primaryZones: [10, 9, 8, 5, 4],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes:
      "Deep taproot (up to 2m) penetrates hardpan soil and extracts deep subsoil nutrients. Ideal Ragi intercrop (4:1).",
  },
  {
    id: "chickpea",
    name: "Chickpea / Chana",
    localName: "Chana / Kadale",
    botanicalName: "Cicer arietinum",
    category: "Pulses",
    season: "Rabi",
    durationDays: "95–115",
    waterRequirementMm: 300,
    factors: { water: 85, soil: 75, terrain: 80, climate: 80, economics: 80 },
    baseScore: 80.2,
    primaryZones: [8, 9, 10, 6, 5],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes:
      "Premier post-monsoon pulse utilizing residual soil moisture in black and deep loamy soils.",
  },
  {
    id: "lentil",
    name: "Lentil / Masoor",
    localName: "Masoor",
    botanicalName: "Lens culinaris",
    category: "Pulses",
    season: "Rabi",
    durationDays: "100–120",
    waterRequirementMm: 280,
    factors: { water: 80, soil: 75, terrain: 80, climate: 80, economics: 75 },
    baseScore: 78.1,
    primaryZones: [4, 5, 8, 1],
    droughtTolerance: "Moderate",
    nitrogenFixing: true,
    agronomicNotes: "Cold-tolerant pulse grown on alluvial plains as a relay crop after paddy.",
  },

  // ---------------- OILSEEDS & COMMERCIAL ----------------
  {
    id: "guar",
    name: "Guar / Cluster Bean",
    localName: "Gowar / Gorikayi",
    botanicalName: "Cyamopsis tetragonoloba",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "85–100",
    waterRequirementMm: 250,
    factors: { water: 95, soil: 70, terrain: 85, climate: 95, economics: 85 },
    baseScore: 86.6,
    primaryZones: [14, 13, 6, 10],
    droughtTolerance: "High",
    nitrogenFixing: true,
    agronomicNotes:
      "High industrial value for guar gum export. Exceptionally hardy in dry rainfed belts.",
  },
  {
    id: "safflower",
    name: "Safflower",
    localName: "Kusum / Kusube",
    botanicalName: "Carthamus tinctorius",
    category: "Oilseeds & Commercial",
    season: "Rabi",
    durationDays: "120–135",
    waterRequirementMm: 320,
    factors: { water: 90, soil: 80, terrain: 85, climate: 90, economics: 80 },
    baseScore: 85.6,
    primaryZones: [9, 10, 8, 13],
    droughtTolerance: "High",
    agronomicNotes: "Spiny foliage and deep taproot draw moisture from deep cracking vertisols.",
  },
  {
    id: "sesame",
    name: "Sesame / Til",
    localName: "Til / Ellu",
    botanicalName: "Sesamum indicum",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "80–95",
    waterRequirementMm: 300,
    factors: { water: 90, soil: 75, terrain: 85, climate: 90, economics: 75 },
    baseScore: 83.8,
    primaryZones: [13, 10, 11, 3, 8],
    droughtTolerance: "High",
    agronomicNotes:
      "Extremely low input cost; high international price for premium hulled white seeds.",
  },
  {
    id: "niger",
    name: "Niger / Ramtil",
    localName: "Ramtil / Huchchellu",
    botanicalName: "Guizotia abyssinica",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "95–110",
    waterRequirementMm: 320,
    factors: { water: 90, soil: 70, terrain: 80, climate: 90, economics: 80 },
    baseScore: 82.7,
    primaryZones: [7, 10, 9, 8],
    droughtTolerance: "High",
    agronomicNotes: "Thrives on stony, poor, acidic soils where other oilseeds fail completely.",
  },
  {
    id: "mustard",
    name: "Mustard",
    localName: "Sarson / Sasive",
    botanicalName: "Brassica juncea",
    category: "Oilseeds & Commercial",
    season: "Rabi",
    durationDays: "105–125",
    waterRequirementMm: 350,
    factors: { water: 85, soil: 80, terrain: 85, climate: 85, economics: 75 },
    baseScore: 82.4,
    primaryZones: [6, 14, 5, 8, 13],
    droughtTolerance: "High",
    agronomicNotes: "Requires only 1–2 protective irrigations. High oil content (38–42%).",
  },
  {
    id: "castor",
    name: "Castor",
    localName: "Arandi / Haralu",
    botanicalName: "Ricinus communis",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "150–180",
    waterRequirementMm: 450,
    factors: { water: 85, soil: 75, terrain: 80, climate: 90, economics: 70 },
    baseScore: 81.0,
    primaryZones: [13, 10, 11, 8],
    droughtTolerance: "High",
    agronomicNotes:
      "Deep-rooted non-edible oilseed with strong domestic and export industrial demand.",
  },
  {
    id: "sunflower",
    name: "Sunflower",
    localName: "Surajmukhi / Suryakanthi",
    botanicalName: "Helianthus annuus",
    category: "Oilseeds & Commercial",
    season: "Rabi",
    durationDays: "90–105",
    waterRequirementMm: 450,
    factors: { water: 70, soil: 80, terrain: 80, climate: 85, economics: 70 },
    baseScore: 77.0,
    primaryZones: [10, 9, 11],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "Photo-insensitive crop adaptable to any season; requires bee pollination for optimum seed set.",
  },
  {
    id: "groundnut",
    name: "Groundnut / Peanut",
    localName: "Mungphali / Kadalekayi",
    botanicalName: "Arachis hypogaea",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "105–125",
    waterRequirementMm: 500,
    factors: { water: 70, soil: 80, terrain: 80, climate: 80, economics: 65 },
    baseScore: 75.2,
    primaryZones: [13, 10, 11, 9],
    droughtTolerance: "Moderate",
    nitrogenFixing: true,
    agronomicNotes:
      "Requires well-drained sandy loam for easy peg penetration and pod formation. Sensitive to drought at pegging stage.",
  },
  {
    id: "soybean",
    name: "Soybean",
    localName: "Soyabean",
    botanicalName: "Glycine max",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "90–105",
    waterRequirementMm: 550,
    factors: { water: 65, soil: 80, terrain: 80, climate: 75, economics: 65 },
    baseScore: 72.7,
    primaryZones: [8, 9, 13],
    droughtTolerance: "Moderate",
    nitrogenFixing: true,
    agronomicNotes:
      "Dominant Kharif oilseed in Central India; sensitive to waterlogging and terminal dry spells.",
  },
  {
    id: "cotton",
    name: "Cotton",
    localName: "Kapas / Hatti",
    botanicalName: "Gossypium hirsutum",
    category: "Oilseeds & Commercial",
    season: "Kharif",
    durationDays: "160–190",
    waterRequirementMm: 750,
    factors: { water: 55, soil: 80, terrain: 70, climate: 80, economics: 40 },
    baseScore: 66.1,
    primaryZones: [9, 13, 6, 10],
    droughtTolerance: "Low",
    agronomicNotes:
      "High pest management costs and pesticide load. Heavy yield loss during extended dry spells.",
    fieldShiftAlternativeFor: [],
  },
  {
    id: "sugarcane",
    name: "Sugarcane",
    localName: "Ganna / Kabbu",
    botanicalName: "Saccharum officinarum",
    category: "Oilseeds & Commercial",
    season: "Perennial",
    durationDays: "360–420",
    waterRequirementMm: 2200,
    factors: { water: 25, soil: 85, terrain: 55, climate: 80, economics: 30 },
    baseScore: 55.8,
    primaryZones: [5, 9, 10, 11],
    droughtTolerance: "Low",
    agronomicNotes:
      "Extreme water consumption (2000–2500 mm). Completely unsustainable in hard-rock overexploited groundwater zones.",
  },

  // ---------------- HORTICULTURE, VEGETABLES, SPICES & FRUITS ----------------
  {
    id: "fodder-sorghum",
    name: "Fodder Sorghum",
    localName: "Chari / Jola Fodder",
    botanicalName: "Sorghum sudanense",
    category: "Horticulture, Vegetables & Spices",
    season: "Kharif",
    durationDays: "55–70",
    waterRequirementMm: 300,
    factors: { water: 85, soil: 80, terrain: 85, climate: 90, economics: 80 },
    baseScore: 84.3,
    primaryZones: [10, 6, 8, 9, 13],
    droughtTolerance: "High",
    agronomicNotes:
      "Rapid multi-cut green fodder stabilizing livestock dairy output during dry seasons.",
  },
  {
    id: "coriander",
    name: "Coriander",
    localName: "Dhaniya / Kotambari",
    botanicalName: "Coriandrum sativum",
    category: "Horticulture, Vegetables & Spices",
    season: "Rabi",
    durationDays: "90–110",
    waterRequirementMm: 350,
    factors: { water: 80, soil: 80, terrain: 85, climate: 80, economics: 70 },
    baseScore: 79.2,
    primaryZones: [8, 14, 10, 13],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "Short-cycle spice with low water requirement; high price realization in spice markets.",
  },
  {
    id: "jackfruit",
    name: "Jackfruit",
    localName: "Kathal / Halasina Hannu",
    botanicalName: "Artocarpus heterophyllus",
    category: "Horticulture, Vegetables & Spices",
    season: "Perennial",
    durationDays: "Perennial",
    waterRequirementMm: 600,
    factors: { water: 80, soil: 75, terrain: 70, climate: 90, economics: 75 },
    baseScore: 79.0,
    primaryZones: [10, 12, 2, 7],
    droughtTolerance: "High",
    agronomicNotes:
      "Zero-maintenance perennial superfood. Survives droughts once established with zero irrigation.",
  },
  {
    id: "cashew",
    name: "Cashew",
    localName: "Kaju / Geru",
    botanicalName: "Anacardium occidentale",
    category: "Horticulture, Vegetables & Spices",
    season: "Perennial",
    durationDays: "Perennial",
    waterRequirementMm: 700,
    factors: { water: 80, soil: 70, terrain: 80, climate: 90, economics: 65 },
    baseScore: 77.8,
    primaryZones: [12, 11, 10],
    droughtTolerance: "High",
    agronomicNotes:
      "Thrives on gravelly laterite hills and red wastelands; strong international kernel demand.",
  },
  {
    id: "guava",
    name: "Guava",
    localName: "Amrood / Seebe",
    botanicalName: "Psidium guajava",
    category: "Horticulture, Vegetables & Spices",
    season: "Perennial",
    durationDays: "Perennial",
    waterRequirementMm: 650,
    factors: { water: 75, soil: 80, terrain: 80, climate: 85, economics: 65 },
    baseScore: 77.6,
    primaryZones: [10, 5, 8, 4],
    droughtTolerance: "High",
    agronomicNotes:
      "Hardy fruit tree tolerant of soil salinity and drought. High density planting yields year-round returns.",
  },
  {
    id: "pomegranate",
    name: "Pomegranate",
    localName: "Anaar / Dalimbe",
    botanicalName: "Punica granatum",
    category: "Horticulture, Vegetables & Spices",
    season: "Perennial",
    durationDays: "Perennial",
    waterRequirementMm: 600,
    factors: { water: 75, soil: 80, terrain: 80, climate: 90, economics: 45 },
    baseScore: 75.8,
    primaryZones: [9, 10, 13, 14],
    droughtTolerance: "High",
    agronomicNotes:
      "Thrives in semi-arid heat under drip irrigation; sensitive to bacterial blight in humid phases.",
  },
  {
    id: "okra",
    name: "Okra",
    localName: "Bhindi / Bhendi",
    botanicalName: "Abelmoschus esculentus",
    category: "Horticulture, Vegetables & Spices",
    season: "Kharif",
    durationDays: "75–90",
    waterRequirementMm: 450,
    factors: { water: 70, soil: 75, terrain: 80, climate: 85, economics: 65 },
    baseScore: 75.2,
    primaryZones: [10, 5, 4, 11],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "Fast cash returns every 3–4 days; responsive to drip fertigation in peri-urban clusters.",
  },
  {
    id: "mango",
    name: "Mango",
    localName: "Aam / Mavu",
    botanicalName: "Mangifera indica",
    category: "Horticulture, Vegetables & Spices",
    season: "Perennial",
    durationDays: "Perennial",
    waterRequirementMm: 800,
    factors: { water: 70, soil: 75, terrain: 75, climate: 85, economics: 55 },
    baseScore: 73.0,
    primaryZones: [10, 5, 11, 13],
    droughtTolerance: "High",
    agronomicNotes:
      "Flagship orchard crop in Kolar/Chittoor belt. Once established, deep roots withstand dry months.",
  },
  {
    id: "chilli",
    name: "Chilli",
    localName: "Mirch / Menasinakayi",
    botanicalName: "Capsicum annuum",
    category: "Horticulture, Vegetables & Spices",
    season: "Kharif",
    durationDays: "120–150",
    waterRequirementMm: 600,
    factors: { water: 60, soil: 75, terrain: 75, climate: 80, economics: 45 },
    baseScore: 67.8,
    primaryZones: [10, 11, 9, 13],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "High market price volatility and susceptibility to thrips and leaf-curl virus.",
  },
  {
    id: "onion",
    name: "Onion",
    localName: "Pyaz / Eerulli",
    botanicalName: "Allium cepa",
    category: "Horticulture, Vegetables & Spices",
    season: "Rabi",
    durationDays: "110–130",
    waterRequirementMm: 550,
    factors: { water: 55, soil: 80, terrain: 80, climate: 75, economics: 45 },
    baseScore: 67.1,
    primaryZones: [9, 10, 13, 8],
    droughtTolerance: "Moderate",
    agronomicNotes:
      "Shallow root system requires frequent light irrigations; bulb rotting risk under water stress.",
  },
  {
    id: "tomato",
    name: "Tomato",
    localName: "Tamatar / Tomato",
    botanicalName: "Solanum lycopersicum",
    category: "Horticulture, Vegetables & Spices",
    season: "Multi-season",
    durationDays: "100–120",
    waterRequirementMm: 650,
    factors: { water: 50, soil: 80, terrain: 75, climate: 70, economics: 40 },
    baseScore: 63.2,
    primaryZones: [10, 9, 8, 5],
    droughtTolerance: "Low",
    agronomicNotes:
      "Intensive monoculture in Kolar/Bengaluru rural. High input costs (pesticides, staking, borewell pumping) with extreme price crashes.",
    fieldShiftAlternativeFor: [],
  },
  {
    id: "banana",
    name: "Banana",
    localName: "Kela / Bale",
    botanicalName: "Musa acuminata",
    category: "Horticulture, Vegetables & Spices",
    season: "Perennial",
    durationDays: "330–360",
    waterRequirementMm: 1800,
    factors: { water: 35, soil: 80, terrain: 60, climate: 80, economics: 50 },
    baseScore: 60.1,
    primaryZones: [11, 12, 10, 9],
    droughtTolerance: "Low",
    agronomicNotes:
      "High water and nutrient feeder; pseudostem vulnerable to lodging and water stress collapse.",
  },
];

/**
 * Maps lat/lon to India Agro-Climatic Zone (Zones 1-15)
 */
export function detectAgroClimaticZone(lat: number, lon: number): AgroClimaticZone {
  // 1. Check coordinates inside or near India boundary (lat 6-37 N, lon 68-98 E)
  // Karnataka Plateau & Hills (Kolar, Bengaluru, Tumkur, Bellary, Rayalaseema)
  if (lat >= 11.5 && lat <= 18.5 && lon >= 74.8 && lon <= 80.0) {
    return AGRO_CLIMATIC_ZONES[9]!; // Zone 10: Southern Plateau & Hills
  }

  // Western Dry Region (Arid Rajasthan)
  if (lat >= 24.5 && lat <= 30.5 && lon >= 69.5 && lon <= 75.5) {
    return AGRO_CLIMATIC_ZONES[13]!; // Zone 14: Western Dry Region
  }

  // Trans-Gangetic Plains (Punjab, Haryana, Delhi)
  if (lat >= 28.0 && lat <= 32.5 && lon >= 73.8 && lon <= 77.8) {
    return AGRO_CLIMATIC_ZONES[5]!; // Zone 6: Trans-Gangetic Plains
  }

  // Upper Gangetic Plains (Western/Central UP)
  if (lat >= 25.5 && lat <= 30.0 && lon >= 77.5 && lon <= 82.5) {
    return AGRO_CLIMATIC_ZONES[4]!; // Zone 5: Upper Gangetic Plains
  }

  // Middle Gangetic Plains (Bihar, Eastern UP)
  if (lat >= 24.5 && lat <= 27.5 && lon >= 82.5 && lon <= 88.5) {
    return AGRO_CLIMATIC_ZONES[3]!; // Zone 4: Middle Gangetic Plains
  }

  // Lower Gangetic Plains (West Bengal Delta)
  if (lat >= 21.5 && lat <= 27.0 && lon >= 87.5 && lon <= 89.9) {
    return AGRO_CLIMATIC_ZONES[2]!; // Zone 3: Lower Gangetic Plains
  }

  // Western Plateau & Hills (Maharashtra Deccan / Marathwada / Vidarbha)
  if (lat >= 16.0 && lat <= 22.0 && lon >= 72.8 && lon <= 80.5) {
    return AGRO_CLIMATIC_ZONES[8]!; // Zone 9: Western Plateau & Hills
  }

  // Central Plateau & Hills (MP, Bundelkhand)
  if (lat >= 21.0 && lat <= 26.5 && lon >= 74.5 && lon <= 82.5) {
    return AGRO_CLIMATIC_ZONES[7]!; // Zone 8: Central Plateau & Hills
  }

  // Eastern Plateau & Hills (Jharkhand, Odisha inland, Chota Nagpur)
  if (lat >= 18.5 && lat <= 25.0 && lon >= 82.5 && lon <= 87.5) {
    return AGRO_CLIMATIC_ZONES[6]!; // Zone 7: Eastern Plateau & Hills
  }

  // Gujarat Plains & Hills (Saurashtra, Kutch, Gujarat)
  if (lat >= 20.5 && lat <= 24.5 && lon >= 68.5 && lon <= 74.5) {
    return AGRO_CLIMATIC_ZONES[12]!; // Zone 13: Gujarat Plains & Hills
  }

  // West Coast Plains & Ghats (Kerala, Malnad, Konkan, Goa)
  if (lat >= 8.2 && lat <= 18.5 && lon >= 73.0 && lon <= 77.2) {
    return AGRO_CLIMATIC_ZONES[11]!; // Zone 12: West Coast Plains & Ghats
  }

  // East Coast Plains & Hills (Tamil Nadu & Andhra Coastal)
  if (lat >= 8.5 && lat <= 20.0 && lon >= 79.5 && lon <= 86.5) {
    return AGRO_CLIMATIC_ZONES[10]!; // Zone 11: East Coast Plains & Hills
  }

  // Western Himalayan Region (J&K, HP, Uttarakhand)
  if (lat >= 29.5 && lat <= 37.0 && lon >= 73.5 && lon <= 81.0) {
    return AGRO_CLIMATIC_ZONES[0]!; // Zone 1: Western Himalayan Region
  }

  // Eastern Himalayan Region (Assam, NE states)
  if (lat >= 22.0 && lat <= 29.5 && lon >= 89.5 && lon <= 97.5) {
    return AGRO_CLIMATIC_ZONES[1]!; // Zone 2: Eastern Himalayan Region
  }

  // The Islands (Andaman & Nicobar, Lakshadweep)
  if (
    (lat >= 6.5 && lat <= 14.0 && lon >= 92.0 && lon <= 94.5) ||
    (lat >= 8.0 && lat <= 12.5 && lon >= 71.0 && lon <= 74.0)
  ) {
    return AGRO_CLIMATIC_ZONES[14]!; // Zone 15: The Islands
  }

  // Default fallback for general semi-arid Deccan plateau or coordinates outside India
  return AGRO_CLIMATIC_ZONES[9]!; // Zone 10: Southern Plateau & Hills
}

export interface LiveTelemetryContext {
  smapMoisture?: number; // 0-100%
  ecostressESI?: number; // 0-1 (Evaporative Stress Index)
  gpmRainMm?: number; // mm
  ndvi?: number; // 0-1
  borewellDepthM?: number;
  scenario?: string;
  isDrought?: boolean;
}

export interface EvaluatedCropSuitability extends CropAtlasEntry {
  adjustedScore: number;
  suitabilityTier: "VERY HIGH" | "HIGH" | "MODERATE" | "LOW / INFEASIBLE";
  hardFilterViolation: boolean;
  hardFilterMessage?: string | undefined;
  waterSavingsPercentVsBaseline?: number;
  capitalSafetyScore: number;
}

/**
 * Evaluates crop suitability combining the 5-factor Atlas with live NASA telemetry modifiers
 */
export function evaluateCropSuitability(
  crop: CropAtlasEntry,
  zone: AgroClimaticZone,
  telemetry?: LiveTelemetryContext,
): EvaluatedCropSuitability {
  let score = crop.baseScore;
  let hardFilterViolation = false;
  let hardFilterMessage: string | undefined = undefined;

  // 1. Regional Compatibility Boost
  const isPrimaryZone = crop.primaryZones.includes(zone.zoneNumber);
  if (isPrimaryZone) {
    score += 2.0;
  } else {
    score -= 4.0;
  }

  // 2. NASA Telemetry Live Hard Filters
  const moisture = telemetry?.smapMoisture ?? 35;
  const isSevereDrought =
    telemetry?.isDrought ||
    telemetry?.scenario === "Severe Drought" ||
    (telemetry?.ecostressESI !== undefined && telemetry.ecostressESI < 0.35) ||
    moisture < 25;

  if (isSevereDrought) {
    // Hard Feasibility Filter: flag crops with water requirement > 600mm or water factor <= 45
    if (crop.factors.water <= 45 || crop.waterRequirementMm >= 800) {
      hardFilterViolation = true;
      hardFilterMessage = `⚠️ INFEASIBLE WATER BUDGET (${crop.waterRequirementMm}mm required; SMAP Moisture critical at ${moisture.toFixed(0)}%)`;
      score -= 22.0; // Heavy penalty
    } else if (crop.factors.water >= 90) {
      // Drought-resilient boost for millets and pulses
      score += 4.5;
    }
  }

  // 3. Low Borewell Groundwater Penalty
  if (telemetry?.borewellDepthM && telemetry.borewellDepthM > 100) {
    if (crop.waterRequirementMm >= 1000) {
      hardFilterViolation = true;
      hardFilterMessage = `⚠️ CRITICAL GROUNDWATER DEPTH (${telemetry.borewellDepthM}m borewell cannot sustain ${crop.name})`;
      score -= 15.0;
    }
  }

  // Clamp score 0-100
  const adjustedScore = Math.min(100, Math.max(10, Math.round(score * 10) / 10));

  // Determine suitability tier
  let suitabilityTier: EvaluatedCropSuitability["suitabilityTier"];
  if (hardFilterViolation || adjustedScore < 55) {
    suitabilityTier = "LOW / INFEASIBLE";
  } else if (adjustedScore >= 85) {
    suitabilityTier = "VERY HIGH";
  } else if (adjustedScore >= 70) {
    suitabilityTier = "HIGH";
  } else {
    suitabilityTier = "MODERATE";
  }

  // Capital safety score (Millets & Pulses have 80-95, fragile horticulture/cash crops have 40-50)
  const capitalSafetyScore = crop.factors.economics;

  return {
    ...crop,
    adjustedScore,
    suitabilityTier,
    hardFilterViolation,
    hardFilterMessage,
    capitalSafetyScore,
  };
}

/**
 * 3-Season Sustainable Rotation Sequence Generator for locked coordinate
 */
export interface CropRotationPlan {
  zoneName: string;
  rationale: string;
  kharif: { crop: string; role: string; waterMm: number };
  rabi: { crop: string; role: string; waterMm: number };
  zaid: { crop: string; role: string; waterMm: number };
  totalWaterMm: number;
  waterSavedMmVsRiceSugarcane: number;
  nitrogenFixedKgPerHa: number;
}

export function generateSustainableRotationPlan(zone: AgroClimaticZone): CropRotationPlan {
  if (zone.zoneNumber === 10) {
    // Southern Plateau & Hills (Karnataka / Kolar Plateau)
    return {
      zoneName: zone.name,
      rationale:
        "Restores overdrawn borewell aquifers in the hard-rock granite belt by anchoring on drought-hardy Finger Millet (Ragi) + Pigeon Pea intercrop, followed by deep-taproot Horse Gram on residual soil moisture, and short-duration Moong catch crop to fix 45 kg N/ha.",
      kharif: {
        crop: "Finger Millet (Ragi) + Pigeon Pea Intercrop (4:1)",
        role: "Primary Food Security & Soil Nitrogen Enrichment",
        waterMm: 350,
      },
      rabi: {
        crop: "Horse Gram / Chickpea (Residual Moisture)",
        role: "Zero-Tillage Relay Pulse; Survives Dry Hardpan",
        waterMm: 240,
      },
      zaid: {
        crop: "Short-Duration Green Gram (Moong) / Drip Vegetables",
        role: "Soil Bio-Mulch & Summer Cash Flow",
        waterMm: 280,
      },
      totalWaterMm: 870,
      waterSavedMmVsRiceSugarcane: 1330, // 2200mm sugarcane - 870mm = 1330mm saved
      nitrogenFixedKgPerHa: 52,
    };
  }

  if (zone.zoneNumber === 14) {
    // Western Dry Region (Arid Rajasthan)
    return {
      zoneName: zone.name,
      rationale:
        "Thar Desert micro-moisture harvesting sequence: Pearl Millet (Bajra) + Moth Bean intercropping, followed by low-water Mustard/Cumin, and soil-preservation summer fallow.",
      kharif: {
        crop: "Pearl Millet (Bajra) + Moth Bean",
        role: "Heat-Shock Resistant Grain & Arid Soil Binder",
        waterMm: 280,
      },
      rabi: {
        crop: "Mustard / Cumin (1–2 Protective Spinklers)",
        role: "High-Value Low-Water Winter Cash Crop",
        waterMm: 300,
      },
      zaid: {
        crop: "Fodder Sorghum / Stubble Mulch Fallow",
        role: "Wind Erosion Shield & Cattle Nutrition",
        waterMm: 200,
      },
      totalWaterMm: 780,
      waterSavedMmVsRiceSugarcane: 1420,
      nitrogenFixedKgPerHa: 38,
    };
  }

  if (zone.zoneNumber === 6) {
    // Trans-Gangetic Plains (Punjab / Haryana)
    return {
      zoneName: zone.name,
      rationale:
        "Groundwater rescue rotation shifting Punjab/Haryana away from water-intensive Summer Paddy towards Direct-Seeded Basmati/Maize, followed by Wheat/Mustard and summer Green Gram.",
      kharif: {
        crop: "Maize / Direct-Seeded Short Basmati",
        role: "40% Less Pumping than Flooded Paddy",
        waterMm: 500,
      },
      rabi: {
        crop: "Wheat + Mustard Intercrop",
        role: "Winter Breadbasket with Diversified Pest Shield",
        waterMm: 450,
      },
      zaid: {
        crop: "Green Gram (Moong 60-Day)",
        role: "Stubble Decomposition & Nitrogen Recharge",
        waterMm: 280,
      },
      totalWaterMm: 1230,
      waterSavedMmVsRiceSugarcane: 970,
      nitrogenFixedKgPerHa: 45,
    };
  }

  // Default semi-arid plateau rotation
  return {
    zoneName: zone.name,
    rationale:
      "Sustainable multi-season pulse and millet rotation minimizing groundwater withdrawals while maximizing soil biological activity.",
    kharif: {
      crop: "Sorghum / Pearl Millet + Pulses",
      role: "Climate-Smart Cereal Anchor",
      waterMm: 380,
    },
    rabi: {
      crop: "Chickpea / Safflower",
      role: "Deep Subsoil Moisture Extraction",
      waterMm: 300,
    },
    zaid: {
      crop: "Cowpea / Green Gram",
      role: "Leguminous Green Manure",
      waterMm: 260,
    },
    totalWaterMm: 940,
    waterSavedMmVsRiceSugarcane: 1260,
    nitrogenFixedKgPerHa: 48,
  };
}
