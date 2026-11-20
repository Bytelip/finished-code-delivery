import { describe, expect, it } from "vitest";
import {
  altitudeKmForZoom,
  clampGlobeZoom,
  easeInOutCubic,
  flyToZoomFor,
  orbitalStageForZoom,
  GLOBE_FLAT_ZOOM,
  flatnessForZoom,
  formatAltitude,
  projectionModeForZoom,
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

  it("is fully flat 2D at 1 km altitude and spherical 3D above ~1.5 km", () => {
    expect(35000 / Math.pow(2, GLOBE_FLAT_ZOOM)).toBeCloseTo(1);
    expect(projectionModeForZoom(GLOBE_FLAT_ZOOM)).toBe("flat");
    expect(projectionModeForZoom(17)).toBe("flat");
    expect(projectionModeForZoom(14.8)).toBe("morph");
    expect(projectionModeForZoom(14)).toBe("globe");
    expect(projectionModeForZoom(8)).toBe("globe");
    expect(flatnessForZoom(10)).toBe(0);
    expect(flatnessForZoom(GLOBE_FLAT_ZOOM)).toBe(1);
  });

  it("zooming back out past 1 km returns to the 3D globe", () => {
    expect(projectionModeForZoom(16)).toBe("flat");
    expect(projectionModeForZoom(GLOBE_FLAT_ZOOM - 0.01)).toBe("morph");
    expect(projectionModeForZoom(12)).toBe("globe");
  });

  it("altitude text switches to metres below 10 km", () => {
    expect(formatAltitude(2)).toBe("8,750 km");
    expect(formatAltitude(13)).toBe("4.3 km");
    expect(formatAltitude(17)).toBe("267 m");
  });

  it("eases the fly-to curve from 0 to 1 and is symmetric about the midpoint", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
  });
});
