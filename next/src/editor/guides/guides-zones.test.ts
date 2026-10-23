// Snap zones and the snapping toggles. The zone marks are compared with
// guides-zones.fixture.json, recorded from the old GGuides.getBBoxSnapZones
// (chunk.vendor.js module 210): every one of the nine closest sides on four
// boxes (smaller than the mark length, between one and two lengths, longer,
// and tall), the pick distance edges, and the cases without a zonable guide.
import { afterEach, describe, expect, it } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BBoxGuide } from "./bbox-guide.ts";
import { FullPixelsGuide } from "./full-pixels-guide.ts";
import type { Guide } from "./guide.ts";
import { GuideLinesGuide } from "./guide-lines-guide.ts";
import { Guides, type GuidesView } from "./guides.ts";
import fixture from "./guides-zones.fixture.json";

interface ZoneCase {
  box: number[] | null;
  point: number[];
  guides: string[];
  zones: number[][][] | null;
}

const savedOptions = { ...Guides.options };
afterEach(() => {
  Object.assign(Guides.options, savedOptions);
  Guides.options.guides = [];
  Platform.modifiers.metaKey = false;
});

/** A stand-in guide with the methods getBBoxSnapZones asks. */
function fakeGuide(id: string, topLeftOnly: boolean): Guide {
  return {
    getId: () => id,
    isMappingAllowed: () => true,
    canMapWithFullPixelsGuide: () => true,
    mapTopLeftOnly: () => topLeftOnly,
    isFullPixelsGuide: () => false,
  } as unknown as Guide;
}

describe("Guides.getBBoxSnapZones matches the recorded old module 210", () => {
  it("was recorded with the same mark length", () => {
    expect(Guides.options.visualsLength).toBe(fixture.visualsLength);
  });

  for (const c of fixture.cases as ZoneCase[]) {
    const label = `box ${c.box ? c.box.join(",") : "none"} at ${c.point.join(",")} with [${c.guides.join(",")}]`;
    it(label, () => {
      const guides = new Guides(new Scene(new Workspace()));
      guides.addGuide(fakeGuide("topLeftOnly", true));
      guides.addGuide(fakeGuide("zonable", false));
      guides._fullPixelsGuide = fakeGuide("fullPixels", false);
      Guides.options.guides = c.guides;
      const box = c.box ? new Rect(...(c.box as [number, number, number, number])) : null;
      const zones = guides.getBBoxSnapZones(
        box,
        new Point(c.point[0] as number, c.point[1] as number),
      );
      expect(zones ? zones.map((line) => line.map((p) => [p.getX(), p.getY()])) : null).toEqual(
        c.zones,
      );
    });
  }

  it("records a zone for every side of every box", () => {
    // Guards the fixture: the nine sides of the four boxes all gave marks.
    const sided = (fixture.cases as ZoneCase[]).filter((c) => c.zones && c.zones.length === 2);
    expect(sided.length).toBeGreaterThanOrEqual(36);
  });
});

describe("snapping toggles through mapPoint", () => {
  /** A scene with a vertical guide line at x 50 and the guides in editor order. */
  function setup(): Guides {
    const scene = new Scene(new Workspace());
    (scene.getActivePage() as Page).setProperties(["w", "h"], [400, 300]);
    scene.setProperties(["vgl"], [[50]]);
    const guides = new Guides(scene);
    const bbox = new BBoxGuide(guides);
    guides.addGuide(bbox, true);
    guides.addGuide(new GuideLinesGuide(guides));
    guides.addGuide(new FullPixelsGuide(guides));
    const view: GuidesView = {
      getScene: () => scene,
      getZoom: () => 1,
      getLogicalZoom: () => 1,
      getViewConfiguration: () => ({ multiPageView: false }),
      getEditor: () => ({ getDistanceHelper: () => null }),
    };
    guides._view = view;
    return guides;
  }

  const map = (guides: Guides): number[] => {
    guides.beginMap();
    const point = guides.mapPoint(new Point(52.3, 7.3));
    guides.finishMap();
    return [point.getX(), point.getY()];
  };

  it("snaps to the guide line and full pixels when enabled", () => {
    const guides = setup();
    Guides.options.guides = [GuideLinesGuide.ID, FullPixelsGuide.ID];
    expect(map(guides)).toEqual([50, 7]);
  });

  it("doesn't snap at all while snapping is disabled", () => {
    const guides = setup();
    Guides.options.guides = [GuideLinesGuide.ID, FullPixelsGuide.ID];
    Guides.options.disabled = true;
    expect(map(guides)).toEqual([52.3, 7.3]);
  });

  it("Cmd/Ctrl turns snapping back on while disabled, but not full pixels", () => {
    const guides = setup();
    Guides.options.guides = [GuideLinesGuide.ID, FullPixelsGuide.ID];
    Guides.options.disabled = true;
    Platform.modifiers.metaKey = true;
    expect(map(guides)).toEqual([50, 7.3]);
  });

  it("Cmd/Ctrl turns snapping off while enabled, but full pixels still rounds", () => {
    const guides = setup();
    Guides.options.guides = [GuideLinesGuide.ID, FullPixelsGuide.ID];
    Platform.modifiers.metaKey = true;
    expect(map(guides)).toEqual([52, 7]);
  });

  it("leaves out a guide that is toggled off", () => {
    const guides = setup();
    Guides.options.guides = [FullPixelsGuide.ID];
    expect(map(guides)).toEqual([52, 7]);
    Guides.options.guides = [GuideLinesGuide.ID];
    expect(map(guides)).toEqual([50, 7.3]);
  });
});
