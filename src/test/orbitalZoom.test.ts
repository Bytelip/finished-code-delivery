import { describe, expect, it } from "vitest";
import {
  altitudeKmForZoom,
  clampGlobeZoom,
  easeInOutCubic,
  flyToZoomFor,
  orbitalStageForZoom,
  projectionForAltitude,
  projectionForZoom,
} from "@/lib/orbitalZoom";

describe("orbital globe zoom rules", () => {
  it("altitude readout is round(35000 / 2^zoom) km", () => {
    expect(altitudeKmForZoom(0)).toBe(35000);
    expect(altitudeKmForZoom(5)).toBe(1094);
    expect(altitudeKmForZoom(12)).toBe(9);
  });

  it("zoom is limited to 1.5 – 19", () => {
    expect(clampGlobeZoom(0.2)).toBe(1.5);
    expect(clampGlobeZoom(25)).toBe(19);
    expect(clampGlobeZoom(8.25)).toBe(8.25);
  });

  it("stage pill follows the zoom bands", () => {
    expect(orbitalStageForZoom(3.9).label).toBe("ORBITAL VIEW");
    expect(orbitalStageForZoom(4).label).toBe("CONTINENTAL");
    expect(orbitalStageForZoom(6.9).label).toBe("CONTINENTAL");
    expect(orbitalStageForZoom(7).label).toBe("STATE / REGIONAL");
    expect(orbitalStageForZoom(10).label).toBe("STATE / REGIONAL");
    expect(orbitalStageForZoom(10.1).label).toBe("DISTRICT / FIELD");
  });

  it("picking a place flies to at least zoom 11 and never zooms out", () => {
    expect(flyToZoomFor(3)).toBe(11);
    expect(flyToZoomFor(14.5)).toBe(14.5);
  });

  it("switches to flat mercator when altitude reaches <= 1 km (zoom >= 15) and back to globe on zoom out past 1 km", () => {
    expect(projectionForZoom(11, "globe")).toBe("globe");
    expect(projectionForZoom(15, "globe")).toBe("mercator");
    expect(projectionForZoom(16, "globe")).toBe("mercator");
    expect(projectionForZoom(14, "mercator")).toBe("mercator");
    expect(projectionForZoom(13, "mercator")).toBe("globe");
    expect(projectionForZoom(5, "mercator")).toBe("globe");
  });

  it("projectionForAltitude switches cleanly at 1.0 km altitude threshold", () => {
    expect(projectionForAltitude(2.5, "globe")).toBe("globe");
    expect(projectionForAltitude(1.0, "globe")).toBe("mercator");
    expect(projectionForAltitude(0.8, "globe")).toBe("mercator");
    expect(projectionForAltitude(1.5, "mercator")).toBe("globe");
  });

  it("eases the fly-to curve from 0 to 1 and is symmetric about the midpoint", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
  });
});
