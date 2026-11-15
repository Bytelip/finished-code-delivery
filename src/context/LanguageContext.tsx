import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export type LanguageCode =
  | "en"
  | "kn"
  | "hi"
  | "ta"
  | "te"
  | "ko"
  | "ja"
  | "es"
  | "fr"
  | "ar"
  | "ru"
  | "zh"
  | "de";

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  isRtl?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🌐" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🌾" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", isRtl: true },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
];

// Comprehensive native dictionary for zero leftover English words in primary UI elements
const NATIVE_DICTIONARY: Record<string, Partial<Record<LanguageCode, string>>> = {
  // Brand & Navbar
  app_name: {
    en: "AgroSpace Nexus",
    kn: "ಆಗ್ರೋಸ್ಪೇಸ್ ನೆಕ್ಸಸ್",
    hi: "एग्रोस्पेस नेक्सस",
    ta: "அக்ரோஸ்பேஸ் நெக்ஸஸ்",
    te: "ఆగ్రోస్పేస్ నెక్సస్",
    ko: "아그로스페이스 넥서스",
    ja: "アグロスペース・ネクサス",
    es: "AgroSpace Nexus",
    fr: "AgroSpace Nexus",
    ar: "أجروسبيس نيكسوس",
    ru: "АгроСпейс Нексус",
    zh: "农业太空枢纽",
    de: "AgroSpace Nexus",
  },
  orbital_dock: {
    en: "Orbital Dock",
    kn: "ಕಕ್ಷೀಯ ಡಾಕ್",
    hi: "कक्षीय डॉक",
    ta: "சுற்றுப்பாதை டாக்",
    te: "కక్ష్య డాక్",
    ko: "궤도 독",
    ja: "軌道ドック",
    es: "Muelle Orbital",
    fr: "Quai Orbital",
    ar: "الرصيف المداري",
    ru: "Орбитальный док",
    zh: "轨道控制坞",
    de: "Orbitales Dock",
  },
  search_field_params: {
    en: "Search & Field Params",
    kn: "ಹುಡುಕಾಟ & ಕ್ಷೇತ್ರ ನಿಯತಾಂಕಗಳು",
    hi: "खोजें और खेत पैरामीटर",
    ta: "தேடல் & கள அளவுருக்கள்",
    te: "శోధన & ఫీల్డ్ పారామితులు",
    ko: "검색 및 농장 매개변수",
    ja: "検索と圃場パラメータ",
    es: "Buscar y Parámetros",
    fr: "Recherche et Paramètres",
    ar: "البحث ومعلمات الحقل",
    ru: "Поиск и параметры поля",
    zh: "搜索与农田参数",
    de: "Suche & Feldparameter",
  },
  health: {
    en: "Health",
    kn: "ಆರೋಗ್ಯ",
    hi: "स्वास्थ्य",
    ta: "ஆரோக்கியம்",
    te: "ఆరోగ్యం",
    ko: "건강도",
    ja: "健全度",
    es: "Salud",
    fr: "Santé",
    ar: "الصحة",
    ru: "Здоровье",
    zh: "健康度",
    de: "Gesundheit",
  },
  mission_brief: {
    en: "Mission Brief",
    kn: "ಮಿಷನ್ ಸಂಕ್ಷಿಪ್ತ",
    hi: "मिशन विवरण",
    ta: "பணி சுருக்கம்",
    te: "మిషన్ బ్రీఫ్",
    ko: "미션 브리핑",
    ja: "ミッション概要",
    es: "Informe de Misión",
    fr: "Dossier de Mission",
    ar: "ملخص المهمة",
    ru: "Отчет о миссии",
    zh: "任务简报",
    de: "Missionsüberblick",
  },
  brief: {
    en: "Brief",
    kn: "ಸಂಕ್ಷಿಪ್ತ",
    hi: "विवरण",
    ta: "சுருக்கம்",
    te: "బ్రీఫ్",
    ko: "브리핑",
    ja: "概要",
    es: "Informe",
    fr: "Brief",
    ar: "موجز",
    ru: "Отчет",
    zh: "简报",
    de: "Überblick",
  },
  theme: {
    en: "Theme",
    kn: "ವಿನ್ಯಾಸ",
    hi: "थीम",
    ta: "தீம்",
    te: "థీమ్",
    ko: "테마",
    ja: "テーマ",
    es: "Tema",
    fr: "Thème",
    ar: "السمة",
    ru: "Тема",
    zh: "主题",
    de: "Design",
  },
  language: {
    en: "Language",
    kn: "ಭಾಷೆ",
    hi: "भाषा",
    ta: "மொழி",
    te: "భాష",
    ko: "언어",
    ja: "言語",
    es: "Idioma",
    fr: "Langue",
    ar: "اللغة",
    ru: "Язык",
    zh: "语言",
    de: "Sprache",
  },
  sign_out: {
    en: "Sign Out",
    kn: "ಸೈನ್ ಔಟ್",
    hi: "साइन आउट",
    ta: "வெளியேறு",
    te: "సైన్ అవుట్",
    ko: "로그아웃",
    ja: "ログアウト",
    es: "Cerrar sesión",
    fr: "Déconnexion",
    ar: "تسجيل الخروج",
    ru: "Выйти",
    zh: "退出登录",
    de: "Abmelden",
  },
  sign_in: {
    en: "Sign In",
    kn: "ಸೈನ್ ಇನ್",
    hi: "साइन इन",
    ta: "உள்நுழைக",
    te: "సైన్ ఇన్",
    ko: "로그인",
    ja: "ログイン",
    es: "Iniciar sesión",
    fr: "Connexion",
    ar: "تسجيل الدخول",
    ru: "Войти",
    zh: "登录",
    de: "Anmelden",
  },
  done: {
    en: "Done",
    kn: "ಮುಕ್ತಾಯ",
    hi: "संपन्न",
    ta: "முடிந்தது",
    te: "పూర్తయింది",
    ko: "완료",
    ja: "完了",
    es: "Listo",
    fr: "Terminé",
    ar: "تم",
    ru: "Готово",
    zh: "完成",
    de: "Fertig",
  },

  // Sidebar Tabs
  tab_overview: {
    en: "HUD Overview",
    kn: "HUD ಅವಲೋಕನ",
    hi: "HUD अवलोकन",
    ta: "HUD மேலோட்டம்",
    te: "HUD అవలోకనం",
    ko: "HUD 개요",
    ja: "HUD 概要",
    es: "Resumen HUD",
    fr: "Aperçu HUD",
    ar: "نظرة عامة على HUD",
    ru: "Обзор HUD",
    zh: "HUD 总览",
    de: "HUD-Übersicht",
  },
  tab_crop_atlas: {
    en: "Global Crop Atlas (600 Crops)",
    kn: "ಜಾಗತಿಕ ಬೆಳೆ ಅಟ್ಲಾಸ್ (600 ಬೆಳೆಗಳು)",
    hi: "वैश्विक फसल एटलस (600 फसलें)",
    ta: "உலகளாவிய பயிர் அட்லஸ் (600 பயிர்கள்)",
    te: "గ్లోబల్ క్రాప్ అట్లాస్ (600 పంటలు)",
    ko: "글로벌 작물 지도 (600개 작물)",
    ja: "グローバル作物アトラス (600作目)",
    es: "Atlas Global de Cultivos (600 Cultivos)",
    fr: "Atlas Mondial des Cultures (600 Espèces)",
    ar: "أطلس المحاصيل العالمي (600 محصول)",
    ru: "Глобальный атлас культур (600 культур)",
    zh: "全球作物图谱 (600种作物)",
    de: "Globaler Nutzpflanzen-Atlas (600 Kulturen)",
  },
  tab_plant_health: {
    en: "Plant Health (6-Pillar)",
    kn: "ಸಸ್ಯ ಆರೋಗ್ಯ (6-ಸ್ತಂಭಗಳು)",
    hi: "पौधे का स्वास्थ्य (6-स्तंभ)",
    ta: "பயிர் ஆரோக்கியம் (6-தூண்கள்)",
    te: "మొక్కల ఆరోగ్యం (6-స్తంభాలు)",
    ko: "식물 건강 (6대 기둥)",
    ja: "植物の健康 (6つの柱)",
    es: "Salud Vegetal (6 Pilares)",
    fr: "Santé Végétale (6 Piliers)",
    ar: "صحة النبات (6 ركائز)",
    ru: "Здоровье растений (6 столпов)",
    zh: "植物健康监测 (6大支柱)",
    de: "Pflanzengesundheit (6 Säulen)",
  },
  tab_groundwater: {
    en: "Groundwater & Crops",
    kn: "ಅಂತರ್ಜಲ ಮತ್ತು ಬೆಳೆಗಳು",
    hi: "भूजल और फसलें",
    ta: "நிலத்தடி நீர் & பயிர்கள்",
    te: "భూగర్భ జలాలు & పంటలు",
    ko: "지하수 및 작물",
    ja: "地下水と農作物",
    es: "Aguas Subterráneas y Cultivos",
    fr: "Nappes Phréatiques et Cultures",
    ar: "المياه الجوفية والمحاصيل",
    ru: "Грунтовые воды и урожай",
    zh: "地下水与农作物",
    de: "Grundwasser & Feldfrüchte",
  },
  tab_hazards: {
    en: "Hazard Center (8 Alerts)",
    kn: "ಅಪಾಯ ಕೇಂದ್ರ (8 ಎಚ್ಚರಿಕೆಗಳು)",
    hi: "आपदा केंद्र (8 अलर्ट)",
    ta: "ஆபத்து மையம் (8 எச்சரிக்கைகள்)",
    te: "ప్రమాద కేంద్రం (8 హెచ్చరికలు)",
    ko: "재해 경보 센터 (8대 위험)",
    ja: "災害センター (8つの警報)",
    es: "Centro de Amenazas (8 Alertas)",
    fr: "Centre d'Alertes (8 Risques)",
    ar: "مركز المخاطر (8 تنبيهات)",
    ru: "Центр угроз (8 предупреждений)",
    zh: "灾害预警中心 (8项警报)",
    de: "Gefahrenzentrum (8 Warnungen)",
  },
  tab_granules: {
    en: "NASA Granule Inspector",
    kn: "ನಾಸಾ ಗ್ರ್ಯಾನ್ಯೂಲ್ ಇನ್ಸ್ಪೆಕ್ಟರ್",
    hi: "नासा ग्रैन्यूल निरीक्षक",
    ta: "நாசா துகள் ஆய்வாளர்",
    te: "నాసా గ్రాన్యూల్ ఇన్స్పెక్టర్",
    ko: "NASA 그래뉼 분석기",
    ja: "NASA グラニュール検査",
    es: "Inspector de Gránulos NASA",
    fr: "Inspecteur de Granules NASA",
    ar: "فاحص حبيبات ناسا",
    ru: "Инспектор гранул NASA",
    zh: "NASA 颗粒数据检查器",
    de: "NASA-Granulat-Inspektor",
  },
  orbital_modules: {
    en: "ORBITAL MODULES",
    kn: "ಕಕ್ಷೀಯ ಮಾಡ್ಯೂಲ್‌ಗಳು",
    hi: "कक्षीय मॉड्यूल",
    ta: "சுற்றுப்பாதை தொகுதிகள்",
    te: "కక్ష్య మాడ్యూల్స్",
    ko: "궤도 모듈",
    ja: "軌道モジュール",
    es: "MÓDULOS ORBITALES",
    fr: "MODULES ORBITAUX",
    ar: "الوحدات المدارية",
    ru: "ОРБИТАЛЬНЫЕ МОДУЛИ",
    zh: "轨道功能模块",
    de: "ORBITALE MODULE",
  },
  target_waypoints: {
    en: "TARGET WAYPOINTS",
    kn: "ಗುರಿ ಬಿಂದುಗಳು",
    hi: "लक्ष्य वेपॉइंट्स",
    ta: "இலக்கு புள்ளிகள்",
    te: "లక్ష్య వేపాయింట్లు",
    ko: "목표 지점",
    ja: "目標地点",
    es: "PUNTOS DE RUTA",
    fr: "POINTS DE PASSAGE",
    ar: "نقاط الهدف",
    ru: "ТОЧКИ МАРШРУТА",
    zh: "目标航路点",
    de: "ZIEL-WEGPUNKTE",
  },
  collapse_dock: {
    en: "Collapse Dock",
    kn: "ಡಾಕ್ ಕುಗ್ಗಿಸು",
    hi: "डॉक छोटा करें",
    ta: "டாக்கை சுருக்கு",
    te: "డాక్ కుదించు",
    ko: "독 접기",
    ja: "ドックを折りたたむ",
    es: "Colapsar Muelle",
    fr: "Réduire le Quai",
    ar: "طي الرصيف",
    ru: "Свернуть док",
    zh: "折叠面板",
    de: "Dock einklappen",
  },
  expand_dock: {
    en: "Expand Dock",
    kn: "ಡಾಕ್ ವಿಸ್ತರಿಸಿ",
    hi: "डॉक बड़ा करें",
    ta: "டாக்கை விரிவுபடுத்து",
    te: "డాక్ విస్తరించు",
    ko: "독 펼치기",
    ja: "ドックを展開",
    es: "Expandir Muelle",
    fr: "Développer le Quai",
    ar: "توسيع الرصيف",
    ru: "Развернуть док",
    zh: "展开面板",
    de: "Dock ausklappen",
  },

  // Target Reticle Lock
  target_reticle_lock: {
    en: "Target Reticle Lock",
    kn: "ಗುರಿ ರೆಟಿಕಲ್ ಲಾಕ್",
    hi: "लक्ष्य रेटिकल लॉक",
    ta: "இலக்கு ரெட்டிகல் பூட்டு",
    te: "లక్ష్య రెటికిల్ లాక్",
    ko: "표적 조준경 고정",
    ja: "ターゲット照準ロック",
    es: "Bloqueo de Retícula",
    fr: "Verrouillage Réticule",
    ar: "قفل شبكة الهدف",
    ru: "Фиксация прицела цели",
    zh: "目标十字线锁定",
    de: "Zielabsehen-Sperre",
  },
  latitude: {
    en: "LATITUDE",
    kn: "ಅಕ್ಷಾಂಶ",
    hi: "अक्षांश",
    ta: "அட்சரேகை",
    te: "అక్షాంశం",
    ko: "위도",
    ja: "緯度",
    es: "LATITUD",
    fr: "LATITUDE",
    ar: "خط العرض",
    ru: "ШИРОТА",
    zh: "纬度",
    de: "BREITENGRAD",
  },
  longitude: {
    en: "LONGITUDE",
    kn: "ರೇಖಾಂಶ",
    hi: "देशांतर",
    ta: "தீர்க்கரேகை",
    te: "రేఖాంశం",
    ko: "경도",
    ja: "経度",
    es: "LONGITUD",
    fr: "LONGITUDE",
    ar: "خط الطول",
    ru: "ДОЛГОТА",
    zh: "经度",
    de: "LÄNGENGRAD",
  },
  elevation: {
    en: "ELEVATION",
    kn: "ಎತ್ತರ",
    hi: "ऊंचाई",
    ta: "உயரம்",
    te: "ఎత్తు",
    ko: "고도",
    ja: "標高",
    es: "ELEVACIÓN",
    fr: "ALTITUDE",
    ar: "الارتفاع",
    ru: "ВЫСОТА",
    zh: "海拔",
    de: "HÖHE",
  },
  satellite_pass: {
    en: "PASS",
    kn: "ಉಪಗ್ರಹ ಪಾಸ್",
    hi: "उपग्रह पास",
    ta: "செயற்கைக்கோள் பாஸ்",
    te: "ఉపగ్రహ పాస్",
    ko: "위성 통과",
    ja: "衛星通過",
    es: "PASE",
    fr: "PASSAGE",
    ar: "مرور القمر",
    ru: "ПРОЛЕТ",
    zh: "卫星过境",
    de: "ÜBERFLUG",
  },
  next_window: {
    en: "NEXT WINDOW",
    kn: "ಮುಂದಿನ ಕಿಟಕಿ",
    hi: "अगली विंडो",
    ta: "அடுத்த சாளரம்",
    te: "తదుపరి విండో",
    ko: "다음 관측창",
    ja: "次回ウィンドウ",
    es: "PRÓXIMA VENTANA",
    fr: "PROCHAINE FENÊTRE",
    ar: "النافذة التالية",
    ru: "СЛЕДУЮЩЕЕ ОКНО",
    zh: "下次观测窗口",
    de: "NÄCHSTES FENSTER",
  },
  forecast_4day: {
    en: "4-Day Forecast",
    kn: "೪ ದಿನಗಳ ಮುನ್ಸೂಚನೆ",
    hi: "4-दिवसीय पूर्वानुमान",
    ta: "4-நாள் முன்னறிவிப்பு",
    te: "4-రోజుల సూచన",
    ko: "4일간 일기 예보",
    ja: "4日間天気予报",
    es: "Pronóstico a 4 Días",
    fr: "Prévisions à 4 Jours",
    ar: "توقعات 4 أيام",
    ru: "Прогноз на 4 дня",
    zh: "4天天气预报",
    de: "4-Tage-Vorhersage",
  },

  // Bottom Telemetry Dock
  open_orbital_layers: {
    en: "Open Orbital Layers",
    kn: "ಕಕ್ಷೀಯ ಪದರಗಳನ್ನು ತೆರೆಯಿರಿ",
    hi: "कक्षीय परतें खोलें",
    ta: "சுற்றுப்பாதை அடுக்குகளைத் திற",
    te: "కక్ష్య పొరలను తెరవండి",
    ko: "궤도 레이어 열기",
    ja: "軌道レイヤーを開く",
    es: "Abrir Capas Orbitales",
    fr: "Ouvrir les Couches Orbitales",
    ar: "فتح الطبقات المدارية",
    ru: "Открыть орбитальные слои",
    zh: "展开轨道遥感图层",
    de: "Orbital-Ebenen öffnen",
  },
  minimize_dock: {
    en: "Minimize",
    kn: "ಕನಿಷ್ಠಗೊಳಿಸು",
    hi: "छोटा करें",
    ta: "சுருக்கு",
    te: "చిన్నది చేయి",
    ko: "최소화",
    ja: "最小化",
    es: "Minimizar",
    fr: "Réduire",
    ar: "تصغير",
    ru: "Свернуть",
    zh: "最小化",
    de: "Minimieren",
  },
  view_3d_orbital: {
    en: "3D Orbital",
    kn: "೩D ಕಕ್ಷೀಯ",
    hi: "3D कक्षीय",
    ta: "3D சுற்றுப்பாதை",
    te: "3D కక్ష్య",
    ko: "3D 궤도",
    ja: "3D 軌道",
    es: "3D Orbital",
    fr: "3D Orbital",
    ar: "مداري ثلاثي الأبعاد",
    ru: "3D Орбитальный",
    zh: "3D 轨道球体",
    de: "3D Orbital",
  },
  view_2d_field_gis: {
    en: "2D Field GIS",
    kn: "೨D ಕ್ಷೇತ್ರ GIS",
    hi: "2D खेत GIS",
    ta: "2D கள GIS",
    te: "2D ఫీల్డ్ GIS",
    ko: "2D 농장 GIS",
    ja: "2D 圃場 GIS",
    es: "2D GIS de Campo",
    fr: "2D SIG de Terrain",
    ar: "نظم المعلومات الجغرافية 2D",
    ru: "2D Полевой ГИС",
    zh: "2D 农田 GIS",
    de: "2D Feld-GIS",
  },

  // Basemaps
  basemap_satellite: {
    en: "Satellite",
    kn: "ಉಪಗ್ರಹ ಚಿತ್ರ",
    hi: "उपग्रह",
    ta: "செயற்கைக்கோள்",
    te: "ఉపగ్రహం",
    ko: "위성 사진",
    ja: "衛星画像",
    es: "Satélite",
    fr: "Satellite",
    ar: "القمر الصناعي",
    ru: "Спутник",
    zh: "卫星影像",
    de: "Satellit",
  },
  basemap_radar: {
    en: "Radar",
    kn: "ರಡಾರ್",
    hi: "रडार",
    ta: "ரேடார்",
    te: "రాడార్",
    ko: "레이더",
    ja: "レーダー",
    es: "Radar",
    fr: "Radar",
    ar: "رادار",
    ru: "Радар",
    zh: "气象雷达",
    de: "Radar",
  },
  basemap_precipitation: {
    en: "Precipitation",
    kn: "ಮಳೆ ಬೀಳುವಿಕೆ",
    hi: "वर्षा",
    ta: "மழைப்பொழிவு",
    te: "వర్షపాతం",
    ko: "강수량",
    ja: "降水量",
    es: "Precipitación",
    fr: "Précipitations",
    ar: "هطول الأمطار",
    ru: "Осадки",
    zh: "降水量",
    de: "Niederschlag",
  },
  basemap_wind: {
    en: "Wind",
    kn: "ಗಾಳಿ",
    hi: "हवा",
    ta: "காற்று",
    te: "గాలి",
    ko: "바람",
    ja: "風速",
    es: "Viento",
    fr: "Vent",
    ar: "الرياح",
    ru: "Ветер",
    zh: "风场",
    de: "Wind",
  },
  basemap_temperature: {
    en: "Temperature",
    kn: "ತಾಪಮಾನ",
    hi: "तापमान",
    ta: "வெப்பநிலை",
    te: "ఉష్ణోగ్రత",
    ko: "기온",
    ja: "気温",
    es: "Temperatura",
    fr: "Température",
    ar: "درجة الحرارة",
    ru: "Температура",
    zh: "气温",
    de: "Temperatur",
  },
  basemap_humidity: {
    en: "Humidity",
    kn: "ಆರ್ದ್ರತೆ",
    hi: "आर्द्रता",
    ta: "ஈரப்பதம்",
    te: "తేమ",
    ko: "습도",
    ja: "湿度",
    es: "Humedad",
    fr: "Humidité",
    ar: "الرطوبة",
    ru: "Влажность",
    zh: "湿度",
    de: "Luftfeuchtigkeit",
  },
  basemap_pressure: {
    en: "Pressure",
    kn: "ಒತ್ತಡ",
    hi: "वायुदाब",
    ta: "அழுத்தம்",
    te: "పీడనం",
    ko: "기압",
    ja: "気圧",
    es: "Presión",
    fr: "Pression",
    ar: "الضغط الجوي",
    ru: "Давление",
    zh: "气压",
    de: "Luftdruck",
  },
  basemap_terrain: {
    en: "Terrain",
    kn: "ಭೂಪ್ರದೇಶ",
    hi: "भू-भाग",
    ta: "நிலப்பரப்பு",
    te: "భూభాగం",
    ko: "지형",
    ja: "地形",
    es: "Terreno",
    fr: "Relief",
    ar: "التضاريس",
    ru: "Рельеф",
    zh: "地形地貌",
    de: "Gelände",
  },

  // Seasons
  season_kharif: {
    en: "Kharif",
    kn: "ಖಾರೀಫ್ (ಮುಂಗಾರು)",
    hi: "खरीफ (मानसून)",
    ta: "காரீப் (மழைக்காலம்)",
    te: "ఖరీఫ్ (వర్షాకాలం)",
    ko: "하계 작기 (카리프)",
    ja: "雨季作期 (カリフ)",
    es: "Kharif (Monzón)",
    fr: "Kharif (Mousson)",
    ar: "خريف (موسم الرياح الموسمية)",
    ru: "Хариф (муссонный сезон)",
    zh: "季风雨季 (Kharif)",
    de: "Kharif (Monsunzeit)",
  },
  season_rabi: {
    en: "Rabi",
    kn: "ರಬಿ (ಹಿಂಗಾರು)",
    hi: "रबी (सर्दियां)",
    ta: "ரபி (குளிர்காலம்)",
    te: "రబీ (శీతాకాలం)",
    ko: "동계 작기 (라비)",
    ja: "乾季作期 (ラビ)",
    es: "Rabi (Invierno)",
    fr: "Rabi (Hiver)",
    ar: "ربيع (موسم الشتاء)",
    ru: "Раби (зимний сезон)",
    zh: "冬春作期 (Rabi)",
    de: "Rabi (Winterzeit)",
  },
  season_zaid: {
    en: "Zaid",
    kn: "ಝೈದ್ (ಬೇಸಿಗೆ)",
    hi: "जायद (गर्मी)",
    ta: "ஜைத் (கோடைகாலம்)",
    te: "జైద్ (వేసవి)",
    ko: "하계 간작기 (자이드)",
    ja: "夏季短期作期 (ザイド)",
    es: "Zaid (Verano)",
    fr: "Zaid (Été)",
    ar: "زايد (موسم الصيف)",
    ru: "Зайд (летний сезон)",
    zh: "夏季作期 (Zaid)",
    de: "Zaid (Sommerzeit)",
  },

  // Simulation Scenarios
  sim_nominal: {
    en: "Nominal",
    kn: "ಸಾಮಾನ್ಯ ಸ್ಥಿತಿ",
    hi: "सामान्य स्थिति",
    ta: "இயல்பானது",
    te: "సాధారణం",
    ko: "정상 상태",
    ja: "通常状態",
    es: "Nominal",
    fr: "Nominal",
    ar: "طبيعي",
    ru: "Штатный режим",
    zh: "正常状况",
    de: "Normalzustand",
  },
  sim_flash_drought: {
    en: "Flash Drought",
    kn: "ತೀವ್ರ ಬರಗಾಲ",
    hi: "आकस्मिक सूखा",
    ta: "திடீர் வறட்சி",
    te: "ఆకస్మిక కరువు",
    ko: "돌발 가뭄",
    ja: "急速干ばつ",
    es: "Sequía Repentina",
    fr: "Sécheresse Éclair",
    ar: "جفاف مفاجئ",
    ru: "Внезапная засуха",
    zh: "突发特大干旱",
    de: "Plötzliche Dürre",
  },
  sim_heatwave: {
    en: "Heatwave Spike",
    kn: "ತೀವ್ರ ಬಿಸಿಗಾಳಿ",
    hi: "लू का प्रकोप",
    ta: "வெப்ப அலை தாக்கம்",
    te: "తీవ్ర వడగాల్పులు",
    ko: "폭염 급증",
    ja: "熱波スパイク",
    es: "Pico de Ola de Calor",
    fr: "Pic de Canicule",
    ar: "موجة حر حادة",
    ru: "Аномальная жара",
    zh: "极端高温热浪",
    de: "Hitzewellen-Spitze",
  },
  sim_monsoon_delay: {
    en: "Monsoon Delay",
    kn: "ಮುಂಗಾರು ವಿಳಂಬ",
    hi: "मानसून में देरी",
    ta: "பருவமழை தாமதம்",
    te: "రుతుపవనాల ఆలస్యం",
    ko: "몬순 우기 지연",
    ja: "モンスーン遅延",
    es: "Retraso del Monzón",
    fr: "Retard de Mousson",
    ar: "تأخر الرياح الموسمية",
    ru: "Задержка муссона",
    zh: "季风降雨推迟",
    de: "Monsunverzögerung",
  },

  // Decision Engine
  ai_decision_engine: {
    en: "AI Agronomic & Climate Decision Engine",
    kn: "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಕೃಷಿ & ಹವಾಮಾನ ನಿರ್ಧಾರ ಯಂತ್ರ",
    hi: "AI कृषि एवं जलवायु निर्णय प्रणाली",
    ta: "AI வேளாண்மை & காலநிலை முடிவு இயந்திரம்",
    te: "AI వ్యవసాయ & వాతావరణ నిర్ణయ వ్యవస్థ",
    ko: "AI 농업 및 기후 의사결정 엔진",
    ja: "AI 農業・気候意思決定エンジン",
    es: "Motor de Decisión Agronómica y Climática con IA",
    fr: "Moteur de Décision Agronomique et Climatique IA",
    ar: "محرك قرارات الزراعة والمناخ بالذكاء الاصطناعي",
    ru: "ИИ-система агрономических и климатических решений",
    zh: "AI 农艺与气候智能决策引擎",
    de: "KI-System für Agrar- und Klimaentscheidungen",
  },
  actionable_advisory: {
    en: "Actionable Farmer Advisory",
    kn: "ರೈತರಿಗೆ ಕ್ರಿಯಾತ್ಮಕ ಸಲಹೆಗಳು",
    hi: "किसानों के लिए कार्रवाई योग्य परामर्श",
    ta: "செயல்படுத்தக்கூடிய விவசாய ஆலோசனை",
    te: "రైతులకు కార్యాచరణ సలహాలు",
    ko: "농민 실행 권장 사항",
    ja: "実践的営農アドバイス",
    es: "Asesoramiento Práctico para Agricultores",
    fr: "Conseils Agricoles Pratiques",
    ar: "إرشادات عملية للمزارعين",
    ru: "Практические рекомендации для фермеров",
    zh: "农户实用行动指南",
    de: "Praktische Beratung für Landwirte",
  },
  export_report: {
    en: "Export NASA Field Report",
    kn: "ನಾಸಾ ಕ್ಷೇತ್ರ ವರದಿ ಡೌನ್‌ಲೋಡ್",
    hi: "नासा फील्ड रिपोर्ट डाउनलोड करें",
    ta: "நாசா கள அறிக்கையை ஏற்றுமதி செய்",
    te: "నాసా ఫీల్డ్ రిపోర్ట్ ఎగుమతి చేయండి",
    ko: "NASA 농장 보고서 내보내기",
    ja: "NASA 圃場レポート出力",
    es: "Exportar Informe NASA",
    fr: "Exporter le Rapport NASA",
    ar: "تصدير تقرير ناسا الميداني",
    ru: "Экспорт отчета NASA",
    zh: "导出 NASA 农田遥感报告",
    de: "NASA-Feldbericht exportieren",
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  translateAsync: (text: string, targetLang?: LanguageCode) => Promise<string>;
  isRtl: boolean;
  languages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_LANG_KEY = "agrospace_language";
const TRANSLATION_CACHE_KEY = "agrospace_translation_cache_v1";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Load saved language on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_LANG_KEY) as LanguageCode | null;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setLanguageState(saved);
      }
      try {
        const cached = localStorage.getItem(TRANSLATION_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          cacheRef.current = new Map(Object.entries(parsed));
        }
      } catch {
        // ignore cache parse errors
      }
    }
  }, []);

  const isRtl = language === "ar";

  const setLanguage = useCallback((newLang: LanguageCode) => {
    setLanguageState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_LANG_KEY, newLang);
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    }
  }, []);

  // Update HTML lang and dir attributes whenever language changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = isRtl ? "rtl" : "ltr";
    }
  }, [language, isRtl]);

  // Synchronous dictionary lookup
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = NATIVE_DICTIONARY[key];
      if (entry && entry[language]) {
        return entry[language]!;
      }
      if (entry && entry.en) {
        return entry.en;
      }
      // Check if the key itself has a cached online translation
      const cacheKey = `${language}:${key}`;
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey)!;
      }
      return fallback !== undefined ? fallback : key;
    },
    [language],
  );

  // Live online translation fallback using Google's keyless GTX endpoint
  const translateAsync = useCallback(
    async (text: string, targetLang?: LanguageCode): Promise<string> => {
      const dest = targetLang || language;
      if (dest === "en" || !text.trim()) return text;

      // Check dictionary first
      const dictMatch = Object.entries(NATIVE_DICTIONARY).find(
        ([_, val]) => val.en?.toLowerCase() === text.trim().toLowerCase(),
      );
      if (dictMatch && dictMatch[1][dest]) {
        return dictMatch[1][dest]!;
      }

      // Check cache
      const cacheKey = `${dest}:${text.trim()}`;
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey)!;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${dest}&dt=t&q=${encodeURIComponent(text.trim())}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && Array.isArray(json[0])) {
            const translated = json[0].map((item: unknown[]) => item[0]).join("");
            if (translated) {
              cacheRef.current.set(cacheKey, translated);
              try {
                const cacheObj = Object.fromEntries(cacheRef.current);
                localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cacheObj));
              } catch {
                // storage quota exceeded, ignore
              }
              return translated;
            }
          }
        }
      } catch {
        // Fall back to original on network error
      }
      return text;
    },
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateAsync,
        isRtl,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "en" as LanguageCode,
      setLanguage: () => {},
      t: (key: string, fallback?: string) => fallback ?? key,
      translateAsync: async (text: string) => text,
      isRtl: false,
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return ctx;
}
