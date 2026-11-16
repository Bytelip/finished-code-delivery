import { describe, expect, it } from "vitest";
import {
  altitudeKmForZoom,
  clampGlobeZoom,
  flyToZoomFor,
  orbitalStageForZoom,
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
});
