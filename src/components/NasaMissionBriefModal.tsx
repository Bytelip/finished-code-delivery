import React, { useState } from "react";
import {
  Rocket,
  X,
  Satellite,
  Cpu,
  Globe2,
  Sprout,
  ShieldAlert,
  Layers,
  ExternalLink,
  Award,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NasaMissionBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NasaMissionBriefModal({ isOpen, onClose }: NasaMissionBriefModalProps) {
  const [activeTab, setActiveTab] = useState<"satellites" | "architecture" | "impact">(
    "satellites",
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-cyan-500/40 bg-[#060D1A]/95 text-foreground shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Neon Lightline */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
              <Rocket className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 tracking-widest uppercase">
                  NASA Space Apps Challenge Flagship
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                  <Award className="size-2.5" /> GLOBAL COMPETITION GRADE
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                AgroSpace Nexus: Mission Architecture Brief
              </h2>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Sub-Header Tabs */}
        <div className="flex border-b border-border/40 bg-card/30 px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("satellites")}
            className={`py-3 px-3 text-xs font-mono font-bold tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "satellites"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Satellite className="size-3.5" />8 SATELLITE CONSTELLATIONS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("architecture")}
            className={`py-3 px-3 text-xs font-mono font-bold tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "architecture"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Cpu className="size-3.5" />
            4-STAGE 3D/2D WEBGL PIPELINE
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("impact")}
            className={`py-3 px-3 text-xs font-mono font-bold tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "impact"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Sprout className="size-3.5" />
            GLOBAL FOOD SECURITY & IMPACT
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {activeTab === "satellites" && (
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed text-xs">
                AgroSpace Nexus fuses 8 NASA Earth Observation constellations directly into
                real-time scientific WMTS raster layers and quantitative metrics for any
                agricultural field on Earth:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      MODIS Terra / Aqua (250m)
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">NDVI & EVI</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-normal">
                    Normalized Difference Vegetation Index (NDVI) and Enhanced Vegetation Index
                    (EVI) measure chlorophyll absorption and canopy vigor at 250m spatial resolution
                    globally every 16 days.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      SMAP L4 Polar (9km / 1km)
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      Soil Moisture
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-normal">
                    L-Band microwave radiometry penetrates the upper 5cm of soil and assimilates
                    into catchment hydrology models for surface and root-zone moisture metrics.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-amber-300">
                      ISS ECOSTRESS (70m)
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      Evaporative ESI
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-normal">
                    Thermal infrared radiometer mounted on the International Space Station measures
                    plant surface temperatures to detect drought stress up to 3 weeks before visible
                    canopy browning.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-blue-300">
                      GPM IMERG Core (10km)
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      Precipitation
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-normal">
                    Global Precipitation Measurement dual-frequency radar and passive microwave
                    constellation delivers 30-minute calibrated rainfall rates and accumulated
                    moisture balances.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-crimson/30 bg-crimson/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-crimson">
                      VIIRS / FIRMS Thermal
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      375m Fire Hotspots
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-normal">
                    Near real-time active fire locations and Fire Radiative Power (MW) detect crop
                    residue burning, wildfire threats, and thermal anomalies.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-purple-300">
                      MODIS Deep Blue / AOD
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      Aerosol Optical Depth
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-normal">
                    Tracks atmospheric particulate matter, smoke plumes, and agricultural stubble
                    haze to alert farmers to air quality hazards and photosynthetic obstruction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "architecture" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-card/60">
                <h4 className="font-mono text-xs font-bold text-cyan-300 uppercase mb-2">
                  Google Earth-Style 4-Stage Level of Detail (LOD)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-background/60 border border-border/40">
                    <div className="text-cyan font-bold text-[11px]">STAGE 1: ORBITAL</div>
                    <div className="text-[10px] text-muted-foreground mt-1">alt &gt; 1.5</div>
                    <p className="text-[10px] text-foreground/70 mt-1 font-sans">
                      Country & Ocean names only. Clean orbital view.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-background/60 border border-border/40">
                    <div className="text-cyan font-bold text-[11px]">STAGE 2: COUNTRY</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      0.75 &lt; alt ≤ 1.5
                    </div>
                    <p className="text-[10px] text-foreground/70 mt-1 font-sans">
                      State & Province names fade in with dark typography halos.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-background/60 border border-border/40">
                    <div className="text-cyan font-bold text-[11px]">STAGE 3: REGIONAL</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      0.28 &lt; alt ≤ 0.75
                    </div>
                    <p className="text-[10px] text-foreground/70 mt-1 font-sans">
                      City & District dots with screen-space anti-collision culling.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-background/60 border border-border/40">
                    <div className="text-emerald font-bold text-[11px]">STAGE 4: 2D GIS</div>
                    <div className="text-[10px] text-muted-foreground mt-1">alt ≤ 0.28</div>
                    <p className="text-[10px] text-foreground/70 mt-1 font-sans">
                      Smooth crossfade to 2D sub-meter satellite GIS and field boundaries.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/60 bg-background/50">
                  <h5 className="font-mono font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald" /> 100% Free Keyless Layers
                  </h5>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Uses ArcGIS Online Reference overlays and NASA GIBS WMTS endpoints exclusively.
                    Eliminates all paid Carto API keys and watermark errors completely.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-background/50">
                  <h5 className="font-mono font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="size-3.5 text-cyan" /> URL Coordinate Deep Linking
                  </h5>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Full bidirectional syncing of coordinates via URL parameters
                    (?lat=13.175&lon=78.4192) enabling shareable links and instant satellite
                    fly-ins.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "impact" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15">
                <h4 className="font-mono text-sm font-bold text-emerald-300 uppercase mb-2 flex items-center gap-2">
                  <Sprout className="size-4" /> Real-World Agricultural & Food Security Impact
                </h4>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Smallholder farmers in drought-prone regions such as Karnataka and Telangana often
                  rely on depleted borewells and uncoordinated pumping. AgroSpace Nexus bridges the
                  gap between NASA multimillion-dollar satellites and ground-level farming
                  operations:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/50 bg-background/60">
                  <div className="font-mono text-emerald font-bold text-lg">34%</div>
                  <div className="font-mono text-xs text-foreground mt-1 font-semibold">
                    Water Savings
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    By combining SMAP root-zone moisture with ECOSTRESS evapotranspiration rates.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/50 bg-background/60">
                  <div className="font-mono text-cyan font-bold text-lg">21 Days</div>
                  <div className="font-mono text-xs text-foreground mt-1 font-semibold">
                    Drought Early Warning
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Detects canopy water stress before visible signs appear on the ground.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/50 bg-background/60">
                  <div className="font-mono text-amber font-bold text-lg">3 Languages</div>
                  <div className="font-mono text-xs text-foreground mt-1 font-semibold">
                    Farmer Inclusivity
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Instant 1-click printable PDF advisory reports in English, Hindi, and Kannada.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-card/40">
          <span className="font-mono text-[10px] text-muted-foreground">
            NASA Space Apps Challenge 2026 • AgroSpace Nexus Mission Architecture
          </span>
          <Button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            Launch Live Mission HUD
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NasaMissionBriefModal;
