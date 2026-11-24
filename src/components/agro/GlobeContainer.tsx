import { useEffect, useState, lazy, Suspense } from "react";
import type { GlobeViewportProps } from "@/components/GlobeViewport";

export type { GlobeViewportProps };

const LazyGlobeViewport = lazy(() =>
  import("@/components/GlobeViewport").then((m) => ({ default: m.GlobeViewport }))
);

export function GlobeContainer(props: GlobeViewportProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lat = props.telemetry.location.lat;
  const lon = props.telemetry.location.lon;
  const activeLayer = props.activeLayer;

  const fallback = (
    <div
      id="globe-container"
      data-lat={lat}
      data-lon={lon}
      data-layer={activeLayer}
      className="relative w-full h-[calc(100vh-140px)] min-h-[580px] max-h-[820px] rounded-2xl border border-white/[0.08] bg-[#03060d] overflow-hidden select-none shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] mb-4 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-3 text-cyan-400/80">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span className="font-mono text-xs uppercase tracking-widest">
          Initializing AgroSpace Orbital Telemetry...
        </span>
      </div>
    </div>
  );

  if (!mounted) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <LazyGlobeViewport {...props} />
    </Suspense>
  );
}
