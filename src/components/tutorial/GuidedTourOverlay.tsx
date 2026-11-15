import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Rocket,
  Compass,
  Layers,
  Globe2,
  SlidersHorizontal,
  Sprout,
  Palette,
  Radar,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export const TOUR_STORAGE_KEY = "agrospace_tour_completed_v1";

export interface TourStepConfig {
  id: string;
  targetKey: string;
  category: string;
  title: string;
  description: string;
  actionLabel: string;
  onAutoAction?: () => void;
  onMicroAction?: () => void;
}

export interface GuidedTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleViewMode?: () => void;
  onRecenterGlobe?: () => void;
  onToggleParamsDrawer?: () => void;
  onSelectTelemetryLayer?: (layer: string) => void;
}

export function GuidedTourOverlay({
  isOpen,
  onClose,
  onToggleViewMode,
  onRecenterGlobe,
  onToggleParamsDrawer,
  onSelectTelemetryLayer,
}: GuidedTourOverlayProps) {
  const { t } = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cutoutRect, setCutoutRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const prevStepRef = useRef<number>(0);

  // Define the 7 flagship guided tour steps
  const steps: TourStepConfig[] = [
    {
      id: "reticle-lock",
      targetKey: "reticle-lock",
      category: "ORBITAL GPS LOCK",
      title: t("tour_step1_title", "🛰️ Live Orbital & GPS Field Lock"),
      description: t(
        "tour_step1_desc",
        "Your session is calibrated to your exact field coordinates, tracking real-time satellite pass windows, elevation (m ASL), and a 4-day localized forecast.",
      ),
      actionLabel: "🎯 Center Target Field",
      onAutoAction: () => {
        onRecenterGlobe?.();
      },
      onMicroAction: () => {
        onRecenterGlobe?.();
        const reticle = document.querySelector('[data-tour="reticle-lock"]');
        if (reticle instanceof HTMLElement) {
          reticle.classList.add("ring-2", "ring-cyan-400");
          setTimeout(() => reticle.classList.remove("ring-2", "ring-cyan-400"), 1200);
        }
      },
    },
    {
      id: "view-toggle-dock",
      targetKey: "view-toggle-dock",
      category: "DUAL-ENGINE SPATIAL GIS",
      title: t("tour_step2_title", "🌐 Seamless 3D Orbital ↔ 2D Field GIS"),
      description: t(
        "tour_step2_desc",
        "Inspect planetary telemetry in 3D Orbital mode with 4-stage progressive labels (Country → State → District), or zoom in past 850 km (or click 2D Field GIS) to inspect individual farm plots.",
      ),
      actionLabel: "🔄 Toggle 3D / 2D View",
      onMicroAction: () => {
        if (onToggleViewMode) {
          onToggleViewMode();
        } else {
          const btn = document.querySelector(
            '[data-tour="view-toggle-dock"] button:not([class*="bg-cyan"])',
          );
          if (btn instanceof HTMLButtonElement) btn.click();
        }
      },
    },
    {
      id: "nasa-telemetry-dock",
      targetKey: "nasa-telemetry-dock",
      category: "NASA TELEMETRY DOCK",
      title: t("tour_step3_title", "📡 8-Channel NASA Earth Telemetry"),
      description: t(
        "tour_step3_desc",
        "Switch between MODIS NDVI vegetation vigor, SMAP root-zone soil moisture, and ISS ECOSTRESS thermal stress. Clicking field sensors like LAI or ECOSTRESS automatically opens the 2D Field GIS heatmap!",
      ),
      actionLabel: "⚡ Test Next Sensor Layer",
      onAutoAction: () => {
        // Expand dock if minimized
        const expandBtn = document.querySelector('button[title*="Open Orbital Layers"]');
        if (expandBtn instanceof HTMLButtonElement) {
          expandBtn.click();
        }
      },
      onMicroAction: () => {
        const buttons = Array.from(
          document.querySelectorAll('[data-tour="nasa-telemetry-dock"] button[role="radio"]'),
        );
        if (buttons.length > 0) {
          const currentIndex = buttons.findIndex(
            (b) => b.getAttribute("aria-checked") === "true",
          );
          const nextIndex = (currentIndex + 1) % buttons.length;
          const nextBtn = buttons[nextIndex];
          if (nextBtn instanceof HTMLButtonElement) nextBtn.click();
        }
      },
    },
    {
      id: "basemap-switcher",
      targetKey: "basemap-switcher",
      category: "METEOROLOGICAL BASEMAPS",
      title: t("tour_step4_title", "⛈️ Live Meteorological & Terrain Basemaps"),
      description: t(
        "tour_step4_desc",
        "Overlay real-time Satellite (Live/HD), Precipitation Radar, animated Wind Speed & Gust streamlines, Temperature (Actual/Feels Like), Wet-Bulb Humidity, and Sea-Level Pressure.",
      ),
      actionLabel: "🗺️ Open Basemap Layers",
      onMicroAction: () => {
        const switcher = document.querySelector('[data-tour="basemap-switcher"] button');
        if (switcher instanceof HTMLButtonElement) switcher.click();
      },
    },
    {
      id: "search-field-params",
      targetKey: "search-field-params",
      category: "SCENARIO SIMULATION",
      title: t("tour_step5_title", "🎛️ Search Any Coordinate & Simulate Scenarios"),
      description: t(
        "tour_step5_desc",
        "Jump to any farm or district worldwide, adjust Borewell Depth (m), switch Irrigation source, toggle Season (Kharif, Rabi, Zaid), or simulate climate hazards like droughts and cyclones.",
      ),
      actionLabel: "🔍 Open ⌘K Parameters Drawer",
      onMicroAction: () => {
        if (onToggleParamsDrawer) {
          onToggleParamsDrawer();
        } else {
          const searchBtn = document.querySelector('[data-tour="search-field-params"] button');
          if (searchBtn instanceof HTMLButtonElement) searchBtn.click();
        }
      },
    },
    {
      id: "crop-decision-engine",
      targetKey: "crop-decision-engine",
      category: "600-CROP SUITABILITY ATLAS",
      title: t("tour_step6_title", "🌾 600-Crop Atlas & AI Farmer Advisory"),
      description: t(
        "tour_step6_desc",
        "Powered by our 5-criterion Global Crop Suitability Atlas (Water, Soil, Terrain, Climate, Economics) fused with live NASA SMAP & ECOSTRESS data to rank the best crops for your exact Agro-Climatic Zone and export a full NASA Field Report.",
      ),
      actionLabel: "📊 Frame 600-Crop Atlas",
      onAutoAction: () => {
        const el = document.querySelector('[data-tour="crop-decision-engine"]');
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      onMicroAction: () => {
        const el = document.querySelector('[data-tour="crop-decision-engine"]');
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    },
    {
      id: "top-right-controls",
      targetKey: "top-right-controls",
      category: "SPATIAL CUSTOMIZATION",
      title: t("tour_step7_title", "✨ Customize Your Spatial Observatory"),
      description: t(
        "tour_step7_desc",
        "Collapse or expand the Left Orbital Dock anytime with [Tab / H], translate 100% of the interface into 12+ native Indian & international scripts (Kannada, Hindi, Tamil, Telugu, Japanese, Spanish, etc.), or build your own Custom Theme.",
      ),
      actionLabel: "🌐 Highlight Language Engine",
      onAutoAction: () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onMicroAction: () => {
        const langBtn = document.querySelector(
          '[data-tour="top-right-controls"] button[aria-haspopup="dialog"], [data-tour="top-right-controls"] button',
        );
        if (langBtn instanceof HTMLButtonElement) langBtn.click();
      },
    },
  ];

  const currentStep = steps[currentStepIndex] || steps[0];

  // Recalculate spotlight cutout bounding box
  const updateCutout = useCallback(() => {
    if (!isOpen) return;
    const targetEl = document.querySelector(`[data-tour="${currentStep.targetKey}"]`);

    if (targetEl instanceof HTMLElement) {
      const rect = targetEl.getBoundingClientRect();
      const padding = 10;
      setCutoutRect({
        x: Math.max(8, rect.left - padding),
        y: Math.max(8, rect.top - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
      });
    } else {
      // Fallback: center screen default spotlight
      setCutoutRect({
        x: window.innerWidth / 2 - 200,
        y: window.innerHeight / 2 - 100,
        width: 400,
        height: 200,
      });
    }
  }, [isOpen, currentStep.targetKey]);

  // Handle step transitions and scroll synchronization
  useEffect(() => {
    if (!isOpen) return;

    // Run auto-action for the new step
    currentStep.onAutoAction?.();

    // If moving from step 6 back to earlier or forward to step 7, ensure window is at top
    if (prevStepRef.current === 5 && currentStepIndex !== 5) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevStepRef.current = currentStepIndex;

    // Small delay to allow smooth scroll / render to settle before calculating bounding box
    const timer = setTimeout(updateCutout, 120);
    const retryTimer = setTimeout(updateCutout, 400);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
    };
  }, [isOpen, currentStepIndex, currentStep, updateCutout]);

  // Window resize and scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => updateCutout();
    const handleScroll = () => updateCutout();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updateCutout]);

  // Keyboard navigation listener (ArrowRight, ArrowLeft, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      } catch {
        // ignore
      }
    }
    // If we're scrolled down for step 6, restore to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    onClose();
  };

  const goToStep = (idx: number) => {
    if (idx >= 0 && idx < steps.length) {
      setCurrentStepIndex(idx);
    }
  };

  if (!isOpen) return null;

  // Compute smart floating card coordinates
  const cardWidth = Math.min(390, typeof window !== "undefined" ? window.innerWidth - 32 : 360);
  const cardHeight = 310;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  let cardLeft = viewportWidth / 2 - cardWidth / 2;
  let cardTop = viewportHeight / 2 - cardHeight / 2;
  let arrowPlacement: "top" | "bottom" | "left" | "right" = "top";

  if (cutoutRect) {
    const spaceBelow = viewportHeight - (cutoutRect.y + cutoutRect.height);
    const spaceAbove = cutoutRect.y;

    if (spaceBelow >= cardHeight + 20) {
      // Place below cutout
      cardTop = cutoutRect.y + cutoutRect.height + 16;
      arrowPlacement = "top";
    } else if (spaceAbove >= cardHeight + 20) {
      // Place above cutout
      cardTop = Math.max(16, cutoutRect.y - cardHeight - 16);
      arrowPlacement = "bottom";
    } else {
      // Horizontal side placement
      const spaceRight = viewportWidth - (cutoutRect.x + cutoutRect.width);
      if (spaceRight >= cardWidth + 20) {
        cardLeft = cutoutRect.x + cutoutRect.width + 16;
        cardTop = Math.max(16, Math.min(viewportHeight - cardHeight - 16, cutoutRect.y));
        arrowPlacement = "left";
      } else {
        cardLeft = Math.max(16, cutoutRect.x - cardWidth - 16);
        cardTop = Math.max(16, Math.min(viewportHeight - cardHeight - 16, cutoutRect.y));
        arrowPlacement = "right";
      }
    }

    // When placed above or below, horizontally center card on the cutout
    if (arrowPlacement === "top" || arrowPlacement === "bottom") {
      cardLeft = cutoutRect.x + cutoutRect.width / 2 - cardWidth / 2;
      cardLeft = Math.max(16, Math.min(viewportWidth - cardWidth - 16, cardLeft));
    }

    // Clamp top to stay within viewport
    cardTop = Math.max(16, Math.min(viewportHeight - cardHeight - 16, cardTop));
  }

  // Calculate arrow offset relative to the card's left boundary
  const arrowX = cutoutRect
    ? Math.max(24, Math.min(cardWidth - 24, cutoutRect.x + cutoutRect.width / 2 - cardLeft))
    : cardWidth / 2;

  return (
    <div className="fixed inset-0 z-[9990] select-none overflow-hidden pointer-events-auto">
      {/* ---------------- 1. FROSTED GLASS SPOTLIGHT CUTOUT SVG ---------------- */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
        style={{ zIndex: 9991 }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White area = dimmed backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black area = punch-out window for highlighted element */}
            {cutoutRect && (
              <rect
                x={cutoutRect.x}
                y={cutoutRect.y}
                width={cutoutRect.width}
                height={cutoutRect.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 6, 14, 0.75)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-[3px]"
        />
      </svg>

      {/* ---------------- 2. 4-ZONE CLICK INTERCEPTORS (LEAVES CUTOUT AREA FULLY CLICKABLE LIVE!) ---------------- */}
      {cutoutRect && (
        <>
          {/* Top zone */}
          <div
            className="fixed top-0 left-0 right-0 pointer-events-auto"
            style={{ height: cutoutRect.y, zIndex: 9992 }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Bottom zone */}
          <div
            className="fixed left-0 right-0 bottom-0 pointer-events-auto"
            style={{ top: cutoutRect.y + cutoutRect.height, zIndex: 9992 }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Left zone */}
          <div
            className="fixed left-0 pointer-events-auto"
            style={{
              top: cutoutRect.y,
              height: cutoutRect.height,
              width: cutoutRect.x,
              zIndex: 9992,
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Right zone */}
          <div
            className="fixed right-0 pointer-events-auto"
            style={{
              top: cutoutRect.y,
              height: cutoutRect.height,
              left: cutoutRect.x + cutoutRect.width,
              zIndex: 9992,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </>
      )}

      {/* ---------------- 3. ANIMATED NEON SPOTLIGHT BORDER OVER TARGET ---------------- */}
      {cutoutRect && (
        <motion.div
          key={`spotlight-border-${currentStep.id}`}
          className="fixed pointer-events-none rounded-2xl border-2 border-cyan-400"
          style={{ zIndex: 9995 }}
          initial={false}
          animate={{
            left: cutoutRect.x,
            top: cutoutRect.y,
            width: cutoutRect.width,
            height: cutoutRect.height,
          }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
        >
          {/* Radiant visionOS outer and inner glows */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                "0 0 0 1px rgba(6, 182, 212, 0.6), 0 0 35px rgba(6, 182, 212, 0.45), inset 0 0 18px rgba(6, 182, 212, 0.25)",
            }}
          />

          {/* Precision Aerospace Corner Reticle Ticks */}
          <span className="absolute -top-1 -left-1 size-3 border-t-2 border-l-2 border-cyan-300 shadow-[0_0_8px_#22d3ee]" />
          <span className="absolute -top-1 -right-1 size-3 border-t-2 border-r-2 border-cyan-300 shadow-[0_0_8px_#22d3ee]" />
          <span className="absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-cyan-300 shadow-[0_0_8px_#22d3ee]" />
          <span className="absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-cyan-300 shadow-[0_0_8px_#22d3ee]" />
        </motion.div>
      )}

      {/* ---------------- 4. FLOATING SPECULAR GLASS COACHMARK CARD ---------------- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tour-card-${currentStep.id}`}
          className="fixed z-[10000] w-[390px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#070D19]/96 backdrop-blur-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.22)] p-5 text-white pointer-events-auto"
          initial={{ opacity: 0, scale: 0.94, y: cardTop + 12, x: cardLeft }}
          animate={{
            opacity: 1,
            scale: 1,
            x: cardLeft,
            y: cardTop,
          }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
        >
          {/* Specular pointer arrow pointing towards target */}
          {cutoutRect && (
            <div
              className={cn(
                "absolute size-3.5 bg-[#070D19] border-white/20 rotate-45 pointer-events-none shadow-xl",
                arrowPlacement === "top" && "-top-2 border-t border-l",
                arrowPlacement === "bottom" && "-bottom-2 border-b border-r",
                arrowPlacement === "left" && "-left-2 border-b border-l",
                arrowPlacement === "right" && "-right-2 border-t border-r",
              )}
              style={
                arrowPlacement === "top" || arrowPlacement === "bottom"
                  ? { left: arrowX - 7 }
                  : { top: 32 }
              }
            />
          )}

          {/* Top Step Progress Bar & Dots */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              <span className="font-mono text-[10px] font-bold text-cyan-300 tracking-widest uppercase">
                STEP {currentStepIndex + 1} OF {steps.length} • {currentStep.category}
              </span>
            </div>

            {/* Interactive Progress Step Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToStep(idx)}
                  title={`Jump to Step ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    idx === currentStepIndex
                      ? "w-5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                      : idx < currentStepIndex
                        ? "w-2 bg-emerald-400/80"
                        : "w-2 bg-white/20 hover:bg-white/40",
                  )}
                />
              ))}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Exit Tour (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Title & Body Description */}
          <div className="py-3">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed mt-2 font-normal">
              {currentStep.description}
            </p>
          </div>

          {/* Interactive "Try It Now" Micro-Action Button */}
          <div className="mt-1 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => currentStep.onMicroAction?.()}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)] group"
            >
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="size-3.5 text-cyan-400 shrink-0 animate-spin-slow" />
                <span className="truncate">{currentStep.actionLabel}</span>
              </div>
              <span className="text-[10px] text-cyan-200/80 group-hover:translate-x-0.5 transition-transform shrink-0 font-semibold">
                TRY LIVE ↗
              </span>
            </button>
          </div>

          {/* Navigation Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer px-1 py-1 transition-colors"
            >
              {t("tour_skip", "Skip Tour")}
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleBack}
                  className="h-8 px-3 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  {t("tour_back", "Back")}
                </Button>
              )}

              {currentStepIndex < steps.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="h-8 px-4 text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  {t("tour_next", "Next")}
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 px-4 text-xs font-mono font-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer"
                >
                  🚀 {t("tour_launch", "Launch Observatory")}
                </Button>
              )}
            </div>
          </div>

          {/* Mini Keyboard Hint */}
          <div className="mt-2 text-center text-[9.5px] font-mono text-white/40">
            ← Prev • → Next • Esc Exit
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default GuidedTourOverlay;
