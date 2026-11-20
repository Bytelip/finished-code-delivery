import React from "react";
import { Ruler, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export interface GeoPoint {
  lat: number;
  lng: number;
}

interface FieldMeasurementOverlayProps {
  active: boolean;
  points: GeoPoint[];
  onClearPoints: () => void;
  onClose: () => void;
  className?: string;
}

// Calculate geodesic distance between two points in km (Haversine formula)
export function calculateGeodesicDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate approximate spherical polygon area in hectares
export function calculatePolygonAreaHa(points: GeoPoint[]): number {
  if (points.length < 3) return 0;
  const R = 6371000; // Earth radius in meters
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const p1 = points[i]!;
    const p2 = points[j]!;
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;
    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  const areaSqM = Math.abs((total * R * R) / 2);
  return areaSqM / 10000; // Convert to Hectares
}

export function FieldMeasurementOverlay({
  active,
  points,
  onClearPoints,
  onClose,
  className,
}: FieldMeasurementOverlayProps) {
  if (!active) return null;

  // Calculate cumulative distance
  let totalDistKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistKm += calculateGeodesicDistanceKm(points[i]!, points[i + 1]!);
  }

  // Calculate area if polygon is closed (>= 3 points)
  const areaHa = points.length >= 3 ? calculatePolygonAreaHa(points) : 0;
  const areaAcres = areaHa * 2.47105;

  return (
    <div
      data-hud-overlay="measurement-banner"
      className={cn(
        "absolute top-16 md:top-14 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-3 rounded-xl bg-[#181C24]/95 backdrop-blur-2xl border border-amber-400/40 px-4 py-2 text-foreground shadow-2xl animate-in fade-in duration-200 select-none",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs">
        <Ruler className="size-4 animate-bounce" />
        <span>{<LocalizedText text={"FIELD MEASURE"} />}</span>
      </div>

      <div className="h-4 w-px bg-white/20" />

      {/* Dynamic Measurement Readouts */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div>
          <span className="text-muted-foreground text-xs block">
            {<LocalizedText text={"TOTAL DISTANCE"} />}
          </span>
          <span className="font-bold text-foreground text-sm">
            {totalDistKm < 1
              ? `${Math.round(totalDistKm * 1000)} m`
              : `${totalDistKm.toFixed(2)} km`}
          </span>
        </div>

        {points.length >= 3 && (
          <div>
            <span className="text-muted-foreground text-xs block">
              {<LocalizedText text={"PARCEL AREA"} />}
            </span>
            <span className="font-bold text-emerald-400 text-sm">
              {areaHa.toFixed(2)} {<LocalizedText text={" ha"} />}{" "}
              <span className="text-xs text-foreground">
                ({areaAcres.toFixed(1)} {<LocalizedText text={" ac)"} />}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-white/20" />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onClearPoints}
          disabled={points.length === 0}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-foreground disabled:opacity-40 transition-colors cursor-pointer"
          title="Clear Measurement Points"
        >
          <Trash2 className="size-3 text-amber-400" />
          <span>
            {<LocalizedText text={"Clear ("} />}
            {points.length})
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Exit Measurement Mode"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
