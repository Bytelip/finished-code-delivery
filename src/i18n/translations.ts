/**
 * AgroSpace Nexus — Precision Agriculture & Multi-Hazard HUD
 * Multi-Language Translations: English, Hindi (हिंदी), and Kannada (ಕನ್ನಡ).
 */

export type SupportedLanguage = "en" | "hi" | "kn";

export interface LanguageMeta {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", nativeName: "English", flag: "🌐" },
  { code: "hi", label: "Hindi", nativeName: "हिंदी", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🌾" },
];

export interface HazardTranslation {
  title: string;
  category: string;
  shortDesc: string;
  source: string;
  mitigationSteps: string[];
}

export interface I18nDictionary {
  appTitle: string;
  appSubtitle: string;
  liveBadge: string;
  mockBadge: string;
  syncingBadge: string;
  tabs: {
    overview: string;
    plantHealth: string;
    groundwater: string;
    hazards: string;
    granules: string;
  };
  hud: {
    fieldHealth: string;
    climateZone: string;
    elevation: string;
    satellitePass: string;
    sowingWindow: string;
    recommendedCrop: string;
    expectedYield: string;
    waterDeficit: string;
    borewellYield: string;
    irrigationType: string;
    season: string;
    rootSaturation: string;
    aquiferAccess: string;
  };
  hazards: {
    matrixTitle: string;
    matrixSubtitle: string;
    tacticalSubtitle: string;
    summaryTitle: string;
    criticalAlerts: string;
    warningAlerts: string;
    watchAlerts: string;
    nominalAlerts: string;
    actionChecklist: string;
    completed: string;
    markCompleted: string;
    step: string;
    viewAdvisory: string;
    printAdvisory: string;
    close: string;
    status: {
      critical: string;
      warning: string;
      watch: string;
      nominal: string;
    };
    items: {
      cyclone: HazardTranslation;
      earthquake: HazardTranslation;
      solarStorm: HazardTranslation;
      eclipse: HazardTranslation;
      stubbleFire: HazardTranslation;
      flood: HazardTranslation;
      heatBlight: HazardTranslation;
      sprayDrift: HazardTranslation;
    };
  };
  crops: Record<string, string>;
  bulletin: {
    officialTitle: string;
    officialSubtitle: string;
    governmentAuth: string;
    bulletinRef: string;
    timestamp: string;
    fieldCoords: string;
    executiveSummary: string;
    fieldVitals: string;
    agronomicAdvisory: string;
    hazardMitigationMatrix: string;
    signatures: {
      officerTitle: string;
      leadAgronomist: string;
      farmerAcknowledgment: string;
      dateStamped: string;
    };
    printAction: string;
    downloadPdf: string;
    closeBulletin: string;
  };
}

export const translations: Record<SupportedLanguage, I18nDictionary> = {
  en: {
    appTitle: "AgroSpace Nexus",
    appSubtitle: "Precision Agriculture & Multi-Hazard HUD",
    liveBadge: "LIVE SATELLITE",
    mockBadge: "MOCK FALLBACK",
    syncingBadge: "SYNCING LIVE...",
    tabs: {
      overview: "HUD Overview",
      plantHealth: "Plant Health (6-Pillar)",
      groundwater: "Groundwater & Crops",
      hazards: "Hazard Center (8 Alerts)",
      granules: "NASA Granule Inspector",
    },
    hud: {
      fieldHealth: "Field Health Score",
      climateZone: "Climate Zone",
      elevation: "Field Elevation",
      satellitePass: "Next Satellite Overpass",
      sowingWindow: "Optimal Sowing Window",
      recommendedCrop: "Recommended Crop",
      expectedYield: "Projected Yield",
      waterDeficit: "Seasonal Water Deficit",
      borewellYield: "Borewell Discharge",
      irrigationType: "Irrigation System",
      season: "Cropping Season",
      rootSaturation: "Root Zone Saturation",
      aquiferAccess: "Aquifer Borewell Access",
    },
    hazards: {
      matrixTitle: "Hazard Alert Matrix",
      matrixSubtitle: "8 Live & Simulated Tactical Alert Feeds",
      tacticalSubtitle: "NASA EONET · USGS · DONKI · FIRMS · GPM · Open-Meteo",
      summaryTitle: "Tactical Hazard Summary",
      criticalAlerts: "Critical",
      warningAlerts: "Warning",
      watchAlerts: "Watch",
      nominalAlerts: "Nominal",
      actionChecklist: "Farmer Action Checklist",
      completed: "completed",
      markCompleted: "Mark step done",
      step: "Step",
      viewAdvisory: "Farmer Advisory Bulletin",
      printAdvisory: "Print / PDF Advisory",
      close: "Close",
      status: {
        critical: "CRITICAL ALERT",
        warning: "WARNING",
        watch: "WATCH",
        nominal: "NOMINAL",
      },
      items: {
        cyclone: {
          title: "Cyclone & Severe Storm",
          category: "Meteorological Hazard",
          shortDesc:
            "Monsoon depression and cyclone track monitoring with extreme wind shear alert.",
          source: "NASA EONET · GPM IMERG · JTWC",
          mitigationSteps: [
            "Dig radial drainage trenches to clear storm surface runoff from standing crop fields.",
            "Provide bamboo/eucalyptus propping for lodging-prone tall crops (banana, sugarcane, maize).",
            "Accelerate harvesting of mature standing grains immediately before landfall.",
            "Secure solar PV panels, micro-irrigation pump sheds, and greenhouse polyhouse film.",
          ],
        },
        earthquake: {
          title: "Earthquake & Liquefaction",
          category: "Geological Hazard",
          shortDesc:
            "Real-time seismic slip detection, aquifer strata shifting, and borewell casing shear risk.",
          source: "USGS ComCat · Fault Proximity",
          mitigationSteps: [
            "Inspect borewell casing integrity, submersible pump alignment, and electrical grounding.",
            "Walk irrigation canals, masonry flumes, and farm ponds to detect structural cracks or breaches.",
            "Run borewell water into settling sump to test for sand discharge/turbidity before drip lines.",
            "Check field bunds and terrace retaining walls for subsidence and shear cracks.",
          ],
        },
        solarStorm: {
          title: "Solar Winds, CME & Geomagnetic Storm",
          category: "Space Weather Hazard",
          shortDesc:
            "Coronal mass ejections and high planetary K-index causing RTK-GPS auto-steer drift and sensor loss.",
          source: "NASA DONKI · NOAA SWPC Planetary K-Index",
          mitigationSteps: [
            "Disengage RTK-GPS tractor auto-steer; expect ±3 m ionospheric positioning drift.",
            "Switch to manual steering or pause automated precision row planting/ridge making.",
            "Expect LoRaWAN soil moisture sensor packet dropouts; verify critical irrigation manually.",
            "Monitor UV-B index; apply kaolin clay protective foliar film if solar flare radiation spikes.",
          ],
        },
        eclipse: {
          title: "Solar Eclipse Photoperiod Dip",
          category: "Astronomical Hazard",
          shortDesc:
            "Sudden solar disk obscuration causing precipitous PAR drops, stomatal shutdown, and pollinator pauses.",
          source: "USNO Eclipse v4 · NASA SVS",
          mitigationSteps: [
            "Delay foliar nutrient, pesticide, and growth regulator sprays until full PAR sunlight returns.",
            "Expect sudden stomatal closure dip; withhold midday high-pressure micro-sprinklers.",
            "Suspend artificial supplemental greenhouse photoperiod lighting cycling.",
            "Anticipate temporary pollinator and honeybee forage pause; avoid disturbing apiary hives.",
          ],
        },
        stubbleFire: {
          title: "Stubble Fire & Smoke Dimming",
          category: "Atmospheric & Thermal Hazard",
          shortDesc:
            "Upwind agricultural residue burning, thermal anomalies, and optical depth aerosol dimming.",
          source: "NASA FIRMS VIIRS 375m · MODIS MAIAC AOD",
          mitigationSteps: [
            "Plow a 5-metre bare soil firebreak around field perimeters and hay storage sheds.",
            "Dampen dry crop residue stockpiles and ensure farm pond water pumps are primed.",
            "Provide N95 masks for outdoor farm labor when particulate AOD exceeds 1.0.",
            "Assess diffuse vs direct PAR; supplement light micronutrients (zinc, iron) to sustain photosynthesis.",
          ],
        },
        flood: {
          title: "Flood & Root Hypoxia",
          category: "Hydrological Hazard",
          shortDesc:
            "Excess precipitation resulting in saturated root zones, anaerobic root drowning, and nitrogen leaching.",
          source: "GPM IMERG 24h Rain · SMAP L4 Root Zone",
          mitigationSteps: [
            "Open all perimeter drainage ditches immediately to clear standing water within 24 hours.",
            "Aerate submerged root zones using temporary sumps or tractor PTO drainage pumps.",
            "Plan foliar nitrogen/urea spray after drainage to counteract anaerobic root denitrification.",
            "Apply bio-fungicide drench (Trichoderma harzianum) to prevent Pythium root rot.",
          ],
        },
        heatBlight: {
          title: "Heatwave, Frost & Fungal Blight",
          category: "Bioclimatic Hazard",
          shortDesc:
            "Canopy thermal stress (TS - T2M > 3°C), radiative frost vulnerability, and fungal spore outbreak conditions.",
          source: "NASA POWER TS vs T2M · RH2M · Dew Point",
          mitigationSteps: [
            "If Canopy Fever (TS - T2M > 3°C): apply short 15-minute drip cooling pulses at solar peak noon.",
            "If Frost Alert (T2M < 4°C): run evening light sprinkler irrigation to increase soil thermal mass.",
            "If Spore Blight Risk (RH2M > 85% & T2MDEW > 18°C): apply preventive copper-based fungicide.",
            "Apply straw mulch across inter-row spaces to buffer root zone temperature swings.",
          ],
        },
        sprayDrift: {
          title: "High Wind Spray Drift",
          category: "Operational Hazard",
          shortDesc:
            "Sustained wind velocities exceeding 6.5 m/s causing pesticide chemical drift and droplet loss.",
          source: "NASA POWER WS2M (Wind Speed at 2m)",
          mitigationSteps: [
            "Immediately halt tractor boom sprayers and drone pesticide/herbicide spraying (> 6.5 m/s).",
            "Avoid off-target chemical drift damage to neighboring organic plots and water channels.",
            "Tie and tighten agro-netting, nursery poly-tunnels, and shade net anchor lines.",
            "Postpone drone flights until wind speed stabilizes below 4.5 m/s.",
          ],
        },
      },
    },
    crops: {
      "Paddy Rice": "Paddy Rice (Oryza sativa)",
      "Finger Millet (Ragi)": "Finger Millet / Ragi (Eleusine coracana)",
      "Winter Wheat": "Winter Wheat (Triticum aestivum)",
      Chickpea: "Chickpea / Bengal Gram (Cicer arietinum)",
      Watermelon: "Watermelon (Citrullus lanatus)",
      "Green Gram (Moong)": "Green Gram / Moong (Vigna radiata)",
      Maize: "Maize / Corn (Zea mays)",
      Cotton: "Cotton (Gossypium)",
    },
    bulletin: {
      officialTitle: "AgroSpace Nexus — Farmer Advisory Bulletin",
      officialSubtitle: "Integrated Space Telemetry & Field Operations Guidance",
      governmentAuth: "Issued under AgroSpace Satellite Agricultural Intelligence Protocol",
      bulletinRef: "REF-ASN-NASA-2026",
      timestamp: "Bulletin Generated",
      fieldCoords: "Field Coordinates",
      executiveSummary: "Executive Field Diagnosis",
      fieldVitals: "Soil Moisture & Plant Health Indicators",
      agronomicAdvisory: "Agronomic & Irrigation Action Guidance",
      hazardMitigationMatrix: "Tactical Hazard Action & Mitigation Checklist",
      signatures: {
        officerTitle: "District Agricultural Extension Officer",
        leadAgronomist: "Satellite Agro-Meteorologist",
        farmerAcknowledgment: "Farmer Signature / Thumb Impression",
        dateStamped: "Date & Field Verification Stamp",
      },
      printAction: "Print Official Bulletin",
      downloadPdf: "Download PDF Report",
      closeBulletin: "Close Bulletin",
    },
  },
  hi: {
    appTitle: "एग्रोस्पेस नेक्सस",
    appSubtitle: "सटीक कृषि एवं बहु-आपदा प्रबंधन प्रणाली",
    liveBadge: "लाइव उपग्रह डेटा",
    mockBadge: "ऑफ़लाइन बैकअप",
    syncingBadge: "डेटा सिंक हो रहा है...",
    tabs: {
      overview: "सिंहावलोकन (HUD)",
      plantHealth: "फसल स्वास्थ्य (6-स्तंभ)",
      groundwater: "भूजल एवं फसलें",
      hazards: "आपदा केंद्र (8 अलर्ट)",
      granules: "नासा उपग्रह डेटा",
    },
    hud: {
      fieldHealth: "खेत स्वास्थ्य स्कोर",
      climateZone: "जलवायु क्षेत्र",
      elevation: "खेत की ऊंचाई",
      satellitePass: "अगला उपग्रह चक्र",
      sowingWindow: "सर्वोत्तम बुवाई समय",
      recommendedCrop: "सुझाई गई फसल",
      expectedYield: "अनुमानित उपज",
      waterDeficit: "मौसमी जल घाटा",
      borewellYield: "बोरवेल जल प्रवाह",
      irrigationType: "सिंचाई प्रणाली",
      season: "फसल का मौसम",
      rootSaturation: "जड़ क्षेत्र नमी",
      aquiferAccess: "भूजल स्तर पहुंच",
    },
    hazards: {
      matrixTitle: "आपदा चेतावनी मैट्रिक्स",
      matrixSubtitle: "8 लाइव और सिम्युलेटेड सामरिक आपदा अलर्ट",
      tacticalSubtitle: "नासा EONET · USGS · DONKI · FIRMS · GPM · Open-Meteo",
      summaryTitle: "सामरिक आपदा सारांश",
      criticalAlerts: "गंभीर",
      warningAlerts: "चेतावनी",
      watchAlerts: "निगरानी",
      nominalAlerts: "सामान्य",
      actionChecklist: "किसान कार्य योजना सूची",
      completed: "पूर्ण",
      markCompleted: "कदम पूरा हुआ चिह्नित करें",
      step: "कदम",
      viewAdvisory: "किसान परामर्श बुलेटिन",
      printAdvisory: "प्रिंट / पीडीएफ रिपोर्ट",
      close: "बंद करें",
      status: {
        critical: "गंभीर आपातकाल",
        warning: "चेतावनी अलर्ट",
        watch: "सतर्कता निगरानी",
        nominal: "सामान्य सुरक्षित",
      },
      items: {
        cyclone: {
          title: "चक्रवात और भीषण तूफान",
          category: "मौसम संबंधी आपदा",
          shortDesc: "मानसून निम्न दबाव, चक्रवात मार्ग और तीव्र हवा के झोंकों की निगरानी।",
          source: "नासा EONET · GPM IMERG · JTWC",
          mitigationSteps: [
            "खेतों से अतिरिक्त पानी निकालने के लिए परिधि और जल निकासी खाइयां खोदें।",
            "गिरने की आशंका वाली लंबी फसलों (केला, गन्ना, मक्का) को बांस का सहारा दें।",
            "तूफान के आगमन से पहले पकी हुई फसल की तुरंत कटाई करें।",
            "सौर पैनल, पंप शेड और पॉलीहाउस शीट को रस्सियों से मजबूती से बांधें।",
          ],
        },
        earthquake: {
          title: "भूकंप और मृदा द्रवीकरण",
          category: "भूगर्भीय आपदा",
          shortDesc: "वास्तविक समय में भूकंपीय हलचल, भूजल स्तर बदलाव और बोरवेल केसिंग क्षति जोखिम।",
          source: "USGS ComCat · भ्रंश रेखा निकटता",
          mitigationSteps: [
            "बोरवेल केसिंग, सबमर्सिबल पंप संरेखण और अर्थिंग की तुरंत जांच करें।",
            "सिंचाई नहरों, जल पक्के नालों और खेत तालाबों में दरारों या रिसाव का निरीक्षण करें।",
            "ड्रिप में पानी छोड़ने से पहले पानी की मैलापन और रेत की जांच करें।",
            "खेत की मेड़ों और सीढ़ीदार दीवारों में धंसाव या दरारों की मरम्मत करें।",
          ],
        },
        solarStorm: {
          title: "सौर हवाएं, सीएमई और भू-चुंबकीय तूफान",
          category: "अंतरिक्ष मौसम आपदा",
          shortDesc: "कोरोना मास इजेक्शन और उच्च केपी इंडेक्स से आरटीके-जीपीएस ट्रैक्टर में भटकाव संभव।",
          source: "नासा DONKI · NOAA SWPC प्लैनेटरी K-इंडेक्स",
          mitigationSteps: [
            "ट्रैक्टर के आरटीके-जीपीएस ऑटो-स्टीयर को बंद करें; आयनमंडल में ±3 मीटर जीपीएस भटकाव संभव है।",
            "स्वचालित कतार रोपण रोकें और पारंपरिक मैनुअल ड्राइविंग पर स्विच करें।",
            "लोरावान (LoRaWAN) मिट्टी नमी सेंसर से डेटा ड्रॉप हो सकता है; वाल्वों की मैनुअल जांच करें।",
            "सौर ज्वाला से यूवी-बी विकिरण बढ़ने पर फसलों पर केओलिन क्ले का हल्का छिड़काव करें।",
          ],
        },
        eclipse: {
          title: "सूर्य ग्रहण प्रकाश-अवधि में गिरावट",
          category: "खगोलीय आपदा",
          shortDesc: "सूर्य ग्रहण से प्रकाश संश्लेषण (PAR) में अचानक कमी और रंध्रों का बंद होना।",
          source: "USNO ग्रहण v4 · नासा SVS",
          mitigationSteps: [
            "पूर्ण सूर्य का प्रकाश लौटने तक पर्णीय पोषण और कीटनाशक छिड़काव टालें।",
            "रंध्र (स्टोमेटा) बंद होने से वाष्पोत्सर्जन घटता है; दोपहर के समय अतिरिक्त सिंचाई न करें।",
            "ग्रीनहाउस में कृत्रिम प्रकाश चक्र को ग्रहण अवधि के दौरान समायोजित रखें।",
            "परागणकारी मधुमक्खियों की गतिविधि अस्थायी रूप से रुकेगी; छत्तों को न छुएं।",
          ],
        },
        stubbleFire: {
          title: "पराली की आग और धुएं से प्रकाश क्षीणन",
          category: "वायुमंडलीय एवं तापीय आपदा",
          shortDesc: "आसपास पराली दहन, उच्च तापमान हॉटस्पॉट और एरोसोल (AOD) से धूप में रुकावट की स्थिति।",
          source: "नासा FIRMS VIIRS 375m · MODIS AOD",
          mitigationSteps: [
            "खेत की सीमाओं और भूसे के ढेरों के चारों ओर 5 मीटर चौड़ी जुताई करके फायरलाइन बनाएं।",
            "सूखे फसल अवशेषों पर पानी का छिड़काव करें और खेत के पानी के पंप तैयार रखें।",
            "धुआं और एओडी (AOD) 1.0 से अधिक होने पर कृषि श्रमिकों को एन95 मास्क दें।",
            "धुंध से प्रकाश संश्लेषण घटने पर जिंक और आयरन जैसे सूक्ष्म पोषक तत्वों का हल्का छिड़काव करें।",
          ],
        },
        flood: {
          title: "बाढ़ और जड़ हाइपोक्सिया (ऑक्सीजन की कमी)",
          category: "जल संबंधी आपदा",
          shortDesc: "अत्यधिक वर्षा से जलभराव, जड़ों का दम घुटना और नाइट्रोजन पोषक तत्वों का बह जाना।",
          source: "GPM IMERG 24h वर्षा · SMAP जड़ नमी",
          mitigationSteps: [
            "24 घंटे के भीतर रुके हुए पानी को निकालने के लिए खेत की सभी जल निकासी नालियां खोलें।",
            "जलमग्न जड़ों में ऑक्सीजन पहुंचाने के लिए ट्रैक्टर पंप से तेजी से पानी बाहर निकालें।",
            "जल निकासी के बाद जड़ों में नाइट्रोजन की कमी पूरी करने हेतु यूरिया का हल्का पर्णीय छिड़काव करें।",
            "जड़ सड़न रोग से बचाव के लिए ट्राइकोडर्मा या फफूंदनाशक का ड्रेन्चिंग करें।",
          ],
        },
        heatBlight: {
          title: "लू, पाला और फंगल झुलसा रोग",
          category: "जैव-जलवायु आपदा",
          shortDesc:
            "फसल तापमान तनाव (TS - T2M > 3°C), पाला जोखिम, और आर्द्रता > 85% से फफूंद संक्रमण का खतरा।",
          source: "नासा POWER TS vs T2M · RH2M",
          mitigationSteps: [
            "यदि फसल तापमान अधिक है (TS - T2M > 3°C): दोपहर में 15 मिनट के लिए ड्रिप से हल्का पानी दें।",
            "यदि पाला पड़ने का खतरा है (तापमान < 4°C): शाम को हल्की सिंचाई करें ताकि मिट्टी गर्म रहे।",
            "यदि फंगल झुलसा का खतरा है (नमी > 85%): बारिश से पहले तांबा-युक्त फफूंदनाशक का छिड़काव करें।",
            "मिट्टी के तापमान को नियंत्रित रखने के लिए पंक्तियों के बीच पुआल की मल्चिंग बिछाएं।",
          ],
        },
        sprayDrift: {
          title: "तेज हवा और कीटनाशक बहाव चेतावनी",
          category: "परिचालन आपदा",
          shortDesc: "हवा की गति 6.5 मीटर/सेकंड से अधिक होने पर कीटनाशक दवा का बहाव और फसलों का नुकसान।",
          source: "नासा POWER WS2M (2 मीटर पर हवा की गति)",
          mitigationSteps: [
            "हवा की गति 6.5 मीटर/सेकंड से अधिक होने पर ट्रैक्टर बूम और ड्रोन छिड़काव तुरंत रोकें।",
            "पड़ोसी जैविक खेतों और जल स्रोतों में दवा बहने (ड्रिफ्ट) से होने वाले नुकसान से बचें।",
            "नर्सरी शेडनेट, पॉली-टनल और सुरक्षात्मक जालों की रस्सियों को कसकर बांधें।",
            "हवा की गति 4.5 मीटर/सेकंड से नीचे आने तक ड्रोन छिड़काव स्थगित रखें।",
          ],
        },
      },
    },
    crops: {
      "Paddy Rice": "धान (चावल)",
      "Finger Millet (Ragi)": "रागी (मडुआ)",
      "Winter Wheat": "गेहूं",
      Chickpea: "चना",
      Watermelon: "तरबूज",
      "Green Gram (Moong)": "मूंग",
      Maize: "मक्का",
      Cotton: "कपास",
    },
    bulletin: {
      officialTitle: "एग्रोस्पेस नेक्सस — किसान परामर्श बुलेटिन",
      officialSubtitle: "एकीकृत अंतरिक्ष उपग्रह डेटा एवं कृषि प्रबंधन मार्गदर्शन",
      governmentAuth: "एग्रोस्पेस उपग्रह कृषि बुद्धिमत्ता प्रोटोकॉल द्वारा प्रमाणित",
      bulletinRef: "रिफ-ASN-नासा-2026-HI",
      timestamp: "बुलेटिन निर्माण समय",
      fieldCoords: "खेत के निर्देशांक (अक्षांश, देशांतर)",
      executiveSummary: "खेत की स्थिति का त्वरित सारांश",
      fieldVitals: "मृदा नमी एवं फसल स्वास्थ्य सूचकांक",
      agronomicAdvisory: "कृषि एवं सिंचाई मार्गदर्शन",
      hazardMitigationMatrix: "सामरिक आपदा प्रबंधन एवं किसान कार्य योजना",
      signatures: {
        officerTitle: "जिला कृषि विस्तार अधिकारी",
        leadAgronomist: "उपग्रह कृषि मौसम विज्ञानी",
        farmerAcknowledgment: "किसान के हस्ताक्षर / अंगूठे का निशान",
        dateStamped: "दिनांक एवं खेत सत्यापन मुहर",
      },
      printAction: "बुलेटिन प्रिंट करें",
      downloadPdf: "पीडीएफ डाउनलोड करें",
      closeBulletin: "बुलेटिन बंद करें",
    },
  },
  kn: {
    appTitle: "ಆಗ್ರೋಸ್ಪೇಸ್ ನೆಕ್ಸಸ್",
    appSubtitle: "ನಿಖರ ಕೃಷಿ ಮತ್ತು ಬಹು-ವಿಪತ್ತು ನಿರ್ವಹಣಾ ವ್ಯವಸ್ಥೆ",
    liveBadge: "ಲೈವ್ ಉಪಗ್ರಹ ಡೇಟಾ",
    mockBadge: "ಆಫ್‌ಲೈನ್ ಬ್ಯಾಕಪ್",
    syncingBadge: "ಡೇಟಾ ಸಿಂಕ್ ಆಗುತ್ತಿದೆ...",
    tabs: {
      overview: "ಅವಲೋಕನ (HUD)",
      plantHealth: "ಬೆಳೆ ಆರೋಗ್ಯ (6-ಸ್ತಂಭ)",
      groundwater: "ಅಂತರ್ಜಲ ಮತ್ತು ಬೆಳೆಗಳು",
      hazards: "ವಿಪತ್ತು ಕೇಂದ್ರ (8 ಎಚ್ಚರಿಕೆ)",
      granules: "ನಾಸಾ ಕಣ ಪರಿಶೀಲನೆ",
    },
    hud: {
      fieldHealth: "ಹೊಲದ ಆರೋಗ್ಯ ಸ್ಕೋರ್",
      climateZone: "ಹವಾಮಾನ ವಲಯ",
      elevation: "ಹೊಲದ ಎತ್ತರ",
      satellitePass: "ಮುಂದಿನ ಉಪಗ್ರಹ ಚಲನೆ",
      sowingWindow: "ಸೂಕ್ತ ಬಿತ್ತನೆ ಸಮಯ",
      recommendedCrop: "ಶಿಫಾರಸು ಮಾಡಿದ ಬೆಳೆ",
      expectedYield: "ಅಂದಾಜು ಇಳುವರಿ",
      waterDeficit: "ಋತುಮಾನದ ನೀರಿನ ಕೊರತೆ",
      borewellYield: "ಬೋರ್‌ವೆಲ್ ನೀರಿನ ಹರಿವು",
      irrigationType: "ನೀರಾವರಿ ವ್ಯವಸ್ಥೆ",
      season: "ಬೆಳೆ ಋತು",
      rootSaturation: "ಬೇರಿನ ತೇವಾಂಶ ಮಟ್ಟ",
      aquiferAccess: "ಅಂತರ್ಜಲ ಲಭ್ಯತೆ",
    },
    hazards: {
      matrixTitle: "ವಿಪತ್ತು ಎಚ್ಚರಿಕೆ ಮಾದರಿ",
      matrixSubtitle: "8 ಲೈವ್ ಮತ್ತು ಸಿಮ್ಯುಲೇಟೆಡ್ ರಕ್ಷಣಾತ್ಮಕ ಎಚ್ಚರಿಕೆಗಳು",
      tacticalSubtitle: "ನಾಸಾ EONET · USGS · DONKI · FIRMS · GPM · Open-Meteo",
      summaryTitle: "ವಿಪತ್ತು ಸಾರಾಂಶ",
      criticalAlerts: "ತೀವ್ರ ತುರ್ತು",
      warningAlerts: "ಎಚ್ಚರಿಕೆ",
      watchAlerts: "ವೀಕ್ಷಣೆ",
      nominalAlerts: "ಸಾಮಾನ್ಯ",
      actionChecklist: "ರೈತರ ಕ್ರಿಯಾ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ",
      completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
      markCompleted: "ಹಂತ ಪೂರ್ಣಗೊಳಿಸಿ",
      step: "ಹಂತ",
      viewAdvisory: "ರೈತ ಸಲಹಾ ವರದಿ",
      printAdvisory: "ಮುದ್ರಿಸಿ / ಪಿಡಿಎಫ್ ಉಳಿಸಿ",
      close: "ಮುಚ್ಚಿ",
      status: {
        critical: "ತೀವ್ರ ತುರ್ತು ಎಚ್ಚರಿಕೆ",
        warning: "ಎಚ್ಚರಿಕೆ ಸಂದೇಶ",
        watch: "ವೀಕ್ಷಣಾ ಹಂತ",
        nominal: "ಸಾಮಾನ್ಯ ಸುರಕ್ಷಿತ",
      },
      items: {
        cyclone: {
          title: "ಚಂಡಮಾರುತ ಮತ್ತು ತೀವ್ರ ಬಿರುಗಾಳಿ",
          category: "ಹವಾಮಾನ ವಿಪತ್ತು",
          shortDesc: "ತೀವ್ರ ಗಾಳಿಯ ರಭಸ, ಮಳೆ ಮಾರುತ ಮತ್ತು ಎತ್ತರದ ಬೆಳೆಗಳು ನೆಲಕಚ್ಚುವ ಅಪಾಯದ ಮುನ್ಸೂಚನೆ.",
          source: "ನಾಸಾ EONET · GPM IMERG · JTWC",
          mitigationSteps: [
            "ನಿಂತ ಬೆಳೆಗಳಿಂದ ಬಿರುಗಾಳಿಯ ನೀರನ್ನು ಹೊರಹಾಕಲು ಬಸಿಗಾಲುವೆಗಳನ್ನು ತಕ್ಷಣ ತೆರೆಯಿರಿ.",
            "ವಾಲುವ ಅಪಾಯವಿರುವ ಎತ್ತರದ ಬೆಳೆಗಳಿಗೆ (ಬಾಳೆ, ಕಬ್ಬು, ಮೆಕ್ಕೆಜೋಳ) ಬಿದಿರಿನ ಆಸರೆ ನೀಡಿ.",
            "ಮಳೆ ಬಿರುಗಾಳಿ ಅಪ್ಪಳಿಸುವ ಮುನ್ನವೇ ಮಾಗಿದ ಬೆಳೆಗಳನ್ನು ತಕ್ಷಣ ಕಟಾವು ಮಾಡಿ.",
            "ಸೌರ ಫಲಕಗಳು, ಪಂಪ್ ಶೆಡ್ ಮತ್ತು ಪಾಲಿಹೌಸ್ ಹಾಳೆಗಳನ್ನು ಭದ್ರವಾಗಿ ಕಟ್ಟಿ ರಕ್ಷಿಸಿ.",
          ],
        },
        earthquake: {
          title: "ಭೂಕಂಪ ಮತ್ತು ಮಣ್ಣಿನ ದ್ರವೀಕರಣ",
          category: "ಭೂವೈಜ್ಞಾನಿಕ ವಿಪತ್ತು",
          shortDesc: "ನೈಜ ಸಮಯದ ಭೂಕಂಪನ ಸಂಭವ, ಅಂತರ್ಜಲ ಮಾರ್ಗಗಳ ಬದಲಾವಣೆ ಮತ್ತು ಬೋರ್‌ವೆಲ್ ಕೇಸಿಂಗ್ ಬಿರುಕು ಅಪಾಯ.",
          source: "USGS ComCat · ಭೂಕಂಪನ ತೀವ್ರತೆ",
          mitigationSteps: [
            "ಬೋರ್‌ವೆಲ್ ಕೇಸಿಂಗ್, ಮೋಟಾರ್ ಪಂಪ್ ಜೋಡಣೆ ಮತ್ತು ವಿದ್ಯುತ್ ಅರ್ಥಿಂಗ್ ಪರಿಶೀಲಿಸಿ.",
            "ನೀರಾವರಿ ಕಾಲುವೆಗಳು ಮತ್ತು ಕೃಷಿ ಹೊಂಡಗಳಲ್ಲಿ ಬಿರುಕು ಅಥವಾ ಸೋರಿಕೆ ಇದೆಯೇ ಪರೀಕ್ಷಿಸಿ.",
            "ಹನಿ ನೀರಾವರಿ ಪೈಪ್‌ಗಳಿಗೆ ಕಲುಷಿತ ಮರಳು ನುಗ್ಗದಂತೆ ಸೆಟ್ಲಿಂಗ್ ಟ್ಯಾಂಕ್‌ನಲ್ಲಿ ನೀರು ಪರೀಕ್ಷಿಸಿ.",
            "ಕೃಷಿ ಬದುಗಳು ಮತ್ತು ಜಮೀನಿನ ತಡೆಗೋಡೆಗಳಲ್ಲಿ ಕುಸಿತ ಆಗಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ.",
          ],
        },
        solarStorm: {
          title: "ಸೌರ ಮಾರುತ, ಸಿಎಂಇ ಮತ್ತು ಭೂಕಾಂತೀಯ ಚಂಡಮಾರುತ",
          category: "ಬಾಹ್ಯಾಕಾಶ ಹವಾಮಾನ ವಿಪತ್ತು",
          shortDesc: "ಸೌರ ಜ್ವಾಲೆಗಳಿಂದ ಆರ್‌ಟಿಕೆ-ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕ್ಟರ್ ಸ್ವಯಂ-ಚಾಲನೆಯಲ್ಲಿ ವ್ಯತ್ಯಾಸ ಮತ್ತು ಸಂವೇದಕಗಳ ಸಿಗ್ನಲ್ ನಷ್ಟ.",
          source: "ನಾಸಾ DONKI · NOAA SWPC ಕೆ-ಇಂಡೆಕ್ಸ್",
          mitigationSteps: [
            "ಟ್ರಾಕ್ಟರ್‌ನ ಆರ್‌ಟಿಕೆ-ಜಿಪಿಎಸ್ ಆಟೋ-ಸ್ಟೀರಿಂಗ್ ಸ್ಥಗಿತಗೊಳಿಸಿ; ±3 ಮೀಟರ್ ಜಿಪಿಎಸ್ ವ್ಯತ್ಯಾಸ ಸಂಭವಿಸಬಹುದು.",
            "ಸ್ವಯಂಚಾಲಿತ ಬಿತ್ತನೆ ನಿಲ್ಲಿಸಿ ಮತ್ತು ಸಾಂಪ್ರದಾಯಿಕ ಕೈಚಾಲಿತ ಚಾಲನೆಗೆ ಬದಲಾಯಿಸಿ.",
            "ಲೋರಾವಾನ್ (LoRaWAN) ಮಣ್ಣಿನ ತೇವಾಂಶ ಸಂವೇದಕಗಳಲ್ಲಿ ಸಿಗ್ನಲ್ ಕಡಿತ ಸಾಧ್ಯ; ಮ್ಯಾನುಯಲ್ ಆಗಿ ನೀರು ಪರಿಶೀಲಿಸಿ.",
            "ಯುವಿ-ಬಿ ವಿಕಿರಣ ಹೆಚ್ಚಾದರೆ ಎಲೆಗಳ ಸುಡುವಿಕೆ ತಡೆಯಲು ಕಯೋಲಿನ್ ಜೇಡಿಮಣ್ಣಿನ ದ್ರಾವಣ ಸಿಂಪಡಿಸಿ.",
          ],
        },
        eclipse: {
          title: "ಸೂರ್ಯಗ್ರಹಣ ಫೋಟೊಪೀರಿಯಡ್ ಇಳಿಕೆ",
          category: "ಖಗೋಳ ವಿದ್ಯಮಾನ ವಿಪತ್ತು",
          shortDesc: "ಸೂರ್ಯನ ಬೆಳಕಿನ (PAR) ಹಠಾತ್ ಇಳಿಕೆ, ಎಲೆಗಳ ರಂಧ್ರ ಮುಚ್ಚುವಿಕೆ ಮತ್ತು ಜೇನುನೊಣಗಳ ಚಟುವಟಿಕೆ ಸ್ಥಗಿತ.",
          source: "USNO ಗ್ರಹಣ v4 · ನಾಸಾ SVS",
          mitigationSteps: [
            "ಸಂಪೂರ್ಣ ಸೂರ್ಯನ ಬೆಳಕು ಮರಳುವವರೆಗೆ ಎಲೆಗಳಿಗೆ ರಸಗೊಬ್ಬರ ಮತ್ತು ಕೀಟನಾಶಕ ಸಿಂಪಡಿಸುವುದನ್ನು ಮುಂದೂಡಿ.",
            "ಎಲೆಗಳ ರಂಧ್ರಗಳು ಮುಚ್ಚುವುದರಿಂದ ಆವಿಯಾಗುವಿಕೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ; ಆ ಸಮಯದಲ್ಲಿ ಅತಿಯಾದ ನೀರುಣಿಸಬೇಡಿ.",
            "ಹಸಿರುಮನೆ (ಪಾಲಿಹೌಸ್) ಕೃತಕ ಬೆಳಕಿನ ಸಮಯವನ್ನು ಸರಿಹೊಂದಿಸಿ.",
            "ಪರಾಗಸ್ಪರ್ಶ ಮಾಡುವ ಜೇನುನೊಣಗಳ ಸಂಚಾರ ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿಲ್ಲುತ್ತದೆ; ಜೇನುಪೆಟ್ಟಿಗೆಗಳನ್ನು ಕದಲಿಸಬೇಡಿ.",
          ],
        },
        stubbleFire: {
          title: "ಕೂಳೆ ಬೆಂಕಿ ಮತ್ತು ಹೊಗೆಯಿಂದ ಬೆಳಕಿನ ಮಂದತೆ",
          category: "ವಾತಾವರಣ ಮತ್ತು ಉಷ್ಣತೆಯ ವಿಪತ್ತು",
          shortDesc: "ಹೊಲದ ಸುತ್ತಮುತ್ತ ಕೃಷಿ ತ್ಯಾಜ್ಯ ದಹನ, ಉಷ್ಣತೆಯ ಏರಿಕೆ ಮತ್ತು ಹೊಗೆಯಿಂದ ಸೂರ್ಯನ ಬೆಳಕು ಕ್ಷೀಣಿಸುವಿಕೆ.",
          source: "ನಾಸಾ FIRMS VIIRS 375m · MODIS AOD",
          mitigationSteps: [
            "ಹೊಲದ ಸುತ್ತಲೂ ಮತ್ತು ಹುಲ್ಲಿನ ಮೆದೆಗಳ ಬಳಿ 5 ಮೀಟರ್ ಅಗಲದ ಬೆಂಕಿ ತಡೆ ಬೇಲಿ (ಫೈರ್ ಬ್ರೇಕ್) ಉಳುಮೆ ಮಾಡಿ.",
            "ಒಣ ತ್ಯಾಜ್ಯ ಮತ್ತು ಹುಲ್ಲಿನ ಮೆದೆಗಳಿಗೆ ನೀರು ಸಿಂಪಡಿಸಿ ಮತ್ತು ಕೃಷಿ ಪಂಪ್‌ಗಳನ್ನು ಸನ್ನದ್ಧವಾಗಿಡಿ.",
            "ಹೊಗೆಯ ಮಾಲಿನ್ಯ (AOD > 1.0) ಹೆಚ್ಚಾದಾಗ ಕೃಷಿ ಕಾರ್ಮಿಕರಿಗೆ ಮಾಸ್ಕ್ ಧರಿಸಲು ಸೂಚಿಸಿ.",
            "ಬೆಳಕು ಕಡಿಮೆಯಾದಾಗ ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆಗೆ ನೆರವಾಗಲು ಸತು (ಝಿಂಕ್) ಮತ್ತು ಕಬ್ಬಿನಾಂಶ ಸಿಂಪಡಿಸಿ.",
          ],
        },
        flood: {
          title: "ಪ್ರವಾಹ ಮತ್ತು ಬೇರಿನ ಆಮ್ಲಜನಕ ಕೊರತೆ",
          category: "ಜಲ ವಿಪತ್ತು",
          shortDesc:
            "ಅತಿಯಾದ ಮಳೆಯಿಂದ ಜಮೀನಿನಲ್ಲಿ ನೀರು ನಿಲ್ಲುವುದು, ಬೇರುಗಳ ಉಸಿರುಗಟ್ಟುವಿಕೆ ಮತ್ತು ಪೋಷಕಾಂಶಗಳ ಕೊಚ್ಚಿಹೋಗುವಿಕೆ.",
          source: "GPM IMERG 24h ಮಳೆ · SMAP ಬೇರಿನ ತೇವಾಂಶ",
          mitigationSteps: [
            "24 ಗಂಟೆಗಳಲ್ಲಿ ಹೊಲದಲ್ಲಿ ನಿಂತ ನೀರನ್ನು ಹೊರಹಾಕಲು ಎಲ್ಲಾ ಮುಖ್ಯ ಬಸಿಗಾಲುವೆಗಳನ್ನು ತಕ್ಷಣ ತೆರೆಯಿರಿ.",
            "ಬೇರುಗಳಿಗೆ ಆಮ್ಲಜನಕ ಸಿಗುವಂತೆ ಮಾಡಲು ಟ್ರಾಕ್ಟರ್ ಪಂಪ್ ಬಳಸಿ ನಿಂತ ನೀರನ್ನು ಪಂಪ್ ಮಾಡಿ.",
            "ನೀರು ಬಸಿದ ನಂತರ ಸಾರಜನಕದ ಕೊರತೆ ನೀಗಿಸಲು ಎಲೆಗಳ ಮೇಲೆ ಯೂರಿಯಾ ದ್ರಾವಣ ಸಿಂಪಡಿಸಿ.",
            "ಬೇರು ಕೊಳೆ ರೋಗ ತಡೆಗಟ್ಟಲು ಟ್ರೈಕೋಡರ್ಮಾ ಅಥವಾ ಸೂಕ್ತ ಶಿಲೀಂಧ್ರನಾಶಕವನ್ನು ಮಣ್ಣಿಗೆ ಸುರಿಯಿರಿ.",
          ],
        },
        heatBlight: {
          title: "ಬಿಸಿಗಾಳಿ, ಹಿಮ ಮತ್ತು ಶಿಲೀಂಧ್ರ ರೋಗ",
          category: "ಜೈವಿಕ-ಹವಾಮಾನ ವಿಪತ್ತು",
          shortDesc:
            "ಬೆಳೆ ತಾಪಮಾನ ಒತ್ತಡ (TS - T2M > 3°C), ಹಿಮ ಬೀಳುವಿಕೆ ಮತ್ತು ಅಧಿಕ ತೇವಾಂಶದಿಂದ ಶಿಲೀಂಧ್ರ ರೋಗದ ಹರಡುವಿಕೆ.",
          source: "ನಾಸಾ POWER TS vs T2M · RH2M",
          mitigationSteps: [
            "ಬೆಳೆ ತಾಪಮಾನ ಅಧಿಕವಾಗಿದ್ದರೆ (TS - T2M > 3°C): ಮಧ್ಯಾಹ್ನ 15 ನಿಮಿಷ ಹನಿ ನೀರಾವರಿ ಮೂಲಕ ತಂಪು ಮಾಡಿ.",
            "ಹಿಮ ಬೀಳುವ ಮುನ್ಸೂಚನೆ ಇದ್ದರೆ (ಉಷ್ಣಾಂಶ < 4°C): ಸಂಜೆ ವೇಳೆ ಲಘು ನೀರಾವರಿ ನೀಡಿ ಮಣ್ಣಿನ ಶಾಖ ಹೆಚ್ಚಿಸಿ.",
            "ಶಿಲೀಂಧ್ರ ರೋಗದ ಅಪಾಯವಿದ್ದರೆ (ತೇವಾಂಶ > 85%): ಮುನ್ನೆಚ್ಚರಿಕೆಯಾಗಿ ತಾಮ್ರ ಆಧಾರಿತ ಶಿಲೀಂಧ್ರನಾಶಕ ಸಿಂಪಡಿಸಿ.",
            "ಬುಡದ ಉಷ್ಣತೆ ಸಮತೋಲನದಲ್ಲಿಡಲು ಸಾಲುಗಳ ನಡುವೆ ಒಣಹುಲ್ಲಿನ ಹೊದಿಕೆ (ಮಲ್ಚಿಂಗ್) ಹಾಕಿರಿ.",
          ],
        },
        sprayDrift: {
          title: "ಬಿರುಗಾಳಿ ಮತ್ತು ಕೀಟನಾಶಕ ಕೊಚ್ಚಿಹೋಗುವ ಎಚ್ಚರಿಕೆ",
          category: "ಕಾರ್ಯಾಚರಣೆ ವಿಪತ್ತು",
          shortDesc:
            "ಗಾಳಿಯ ವೇಗ 6.5 ಮೀ/ಸೆ ಗಿಂತ ಹೆಚ್ಚಾದಾಗ ಕೀಟನಾಶಕ ಸಿಂಪರಣೆ ಗಾಳಿಯಲ್ಲಿ ಕೊಚ್ಚಿಹೋಗಿ ಅಕ್ಕಪಕ್ಕದ ಬೆಳೆಗೆ ಹಾನಿ ಮಾಡುವ ಅಪಾಯ.",
          source: "ನಾಸಾ POWER WS2M (ಗಾಳಿಯ ವೇಗ)",
          mitigationSteps: [
            "ಗಾಳಿಯ ವೇಗ 6.5 ಮೀ/ಸೆ ಗಿಂತ ಹೆಚ್ಚಿದ್ದರೆ ಟ್ರಾಕ್ಟರ್ ಮತ್ತು ಡ್ರೋನ್ ಮೂಲಕ ಕೀಟನಾಶಕ ಸಿಂಪರಣೆ ತಕ್ಷಣ ನಿಲ್ಲಿಸಿ.",
            "ಪಕ್ಕದ ಸಾವಯವ ಜಮೀನುಗಳಿಗೆ ಮತ್ತು ನೀರಿನ ಕಾಲುವೆಗಳಿಗೆ ಔಷಧ ಕೊಚ್ಚಿಹೋಗದಂತೆ ಎಚ್ಚರವಹಿಸಿ.",
            "ನರ್ಸರಿ ನೆರಳು ಪರದೆಗಳು ಮತ್ತು ಪಾಲಿಟನಲ್‌ಗಳ ಕಟ್ಟಿದ ಹಗ್ಗಗಳನ್ನು ಬಿಗಿಗೊಳಿಸಿ.",
            "ಗಾಳಿಯ ವೇಗ 4.5 ಮೀ/ಸೆ ಗಿಂತ ಕಡಿಮೆಯಾಗುವವರೆಗೆ ಡ್ರೋನ್ ಹಾರಾಟವನ್ನು ಮುಂದೂಡಿ.",
          ],
        },
      },
    },
    crops: {
      "Paddy Rice": "ಭತ್ತ (ಅಕ್ಕಿ)",
      "Finger Millet (Ragi)": "ರಾಗಿ",
      "Winter Wheat": "ಗೋಧಿ",
      Chickpea: "ಕಡಲೆ",
      Watermelon: "ಕಲ್ಲಂಗಡಿ",
      "Green Gram (Moong)": "ಹೆಸರು ಕಾಳು",
      Maize: "ಮೆಕ್ಕೆಜೋಳ",
      Cotton: "ಹತ್ತಿ",
    },
    bulletin: {
      officialTitle: "ಆಗ್ರೋಸ್ಪೇಸ್ ನೆಕ್ಸಸ್ — ರೈತ ಸಲಹಾ ವರದಿ",
      officialSubtitle: "ಸಮಗ್ರ ಉಪಗ್ರಹ ಡೇಟಾ ಮತ್ತು ಕೃಷಿ ಕಾರ್ಯಾಚರಣೆ ಮಾರ್ಗದರ್ಶನ",
      governmentAuth: "ಆಗ್ರೋಸ್ಪೇಸ್ ಉಪಗ್ರಹ ಕೃಷಿ ಬುದ್ಧಿಮತ್ತೆ ಪ್ರೋಟೋಕಾಲ್ ಅಡಿಯಲ್ಲಿ ಪ್ರಮಾಣೀಕರಿಸಲಾಗಿದೆ",
      bulletinRef: "ಉಲ್ಲೇಖ-ASN-ನಾಸಾ-2026-KN",
      timestamp: "ವರದಿ ಸಿದ್ಧಪಡಿಸಿದ ಸಮಯ",
      fieldCoords: "ಜಮೀನಿನ ಅಕ್ಷಾಂಶ ರೇಖಾಂಶಗಳು",
      executiveSummary: "ಹೊಲದ ಸ್ಥಿತಿಯ ಮುಖ್ಯಾಂಶಗಳು",
      fieldVitals: "ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಬೆಳೆ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕ",
      agronomicAdvisory: "ಕೃಷಿ ಮತ್ತು ನೀರಾವರಿ ಮಾರ್ಗದರ್ಶನ",
      hazardMitigationMatrix: "ವಿಪತ್ತು ನಿರ್ವಹಣೆ ಮತ್ತು ರೈತರ ಕ್ರಿಯಾ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ",
      signatures: {
        officerTitle: "ಜಿಲ್ಲಾ ಕೃಷಿ ವಿಸ್ತರಣಾಧಿಕಾರಿ",
        leadAgronomist: "ಉಪಗ್ರಹ ಕೃಷಿ ಹವಾಮಾನ ತಜ್ಞರು",
        farmerAcknowledgment: "ರೈತರ ಸಹಿ / ಹೆಬ್ಬೆಟ್ಟಿನ ಗುರುತು",
        dateStamped: "ದಿನಾಂಕ ಮತ್ತು ಜಮೀನು ಪರಿಶೀಲನಾ ಮುದ್ರೆ",
      },
      printAction: "ವರದಿ ಮುದ್ರಿಸಿ",
      downloadPdf: "ಪಿಡಿಎಫ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
      closeBulletin: "ವರದಿ ಮುಚ್ಚಿ",
    },
  },
};
