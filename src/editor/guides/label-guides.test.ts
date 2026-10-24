// Expected values worked out from the old GLabelGuide, GPageLabelGuide
// (chunk.vendor.js modules 744 and 743, lines 101792-101983) and
// GSymbolLabelGuide (module 1077, lines 235620-235699).
import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { GuidePaintContext } from "./guide.ts";
import { LabelGuide, LabelItem } from "./label-guide.ts";
import { PageLabelGuide } from "./page-label-guide.ts";
import { SymbolLabelGuide } from "./symbol-label-guide.ts";

const css = (name: string) => ({ toScreenCSS: () => name });

interface PageSpec {
  name: string;
  at: [number, number, number, number];
  index?: number;
  flags?: number[];
  scaleLabel?: boolean;
}

/** A page: real Page prototype (for instanceof), stubbed members. */
function fakePage(spec: PageSpec): Page {
  const [x, y, width, height] = spec.at;
  return Object.assign(Object.create(Page.prototype) as Page, {
    $name: spec.name,
    hasFlag: (flag: number) => (spec.flags ?? []).includes(flag),
    getProperty: () => null,
    getTransform: () => new Transform(1, 0, 0, 1, x, y),
    getScaleLabelFactor: () => 1,
    isScaleLabel: () => !!spec.scaleLabel,
    getElementIndex: () => spec.index ?? 0,
    getGeometryBBox: () => new Rect(0, 0, width, height),
    getPosition: (multiPageView?: boolean) => (multiPageView ? new Point(x, y) : new Point(0, 0)),
    sceneBox: new Rect(x, y, width, height),
  });
}

/** Labels are 10 px with 7 px padding; the quadtree is a plain intersect test. */
function fakeScene(pages: Page[], active: Page | null, extra: Record<string, unknown> = {}): Scene {
  return {
    $lbs: 10,
    $lbp: 7,
    $lbc: null,
    getActivePage: () => active,
    getLabelBBox: (scale?: number | null) => new Rect(0, 0, 0, 17 * (scale || 1)),
    retrieveChildrenInPaintBBox: (area: Rect) =>
      pages.filter((page) => (page as unknown as { sceneBox: Rect }).sceneBox.intersectsRect(area)),
    ...extra,
  } as unknown as Scene;
}

const host = (scene: Scene) => ({ _scene: scene, isMultiPageEnabled: () => false });

type TextCall = [string, number, number, string, string, string, number, string];

/** Every character is 6 px wide, whatever the size. */
function fakeCanvas() {
  const texts: TextCall[] = [];
  return {
    texts,
    getWidth: () => 1000,
    getHeight: () => 1000,
    measureText: (text: string) => ({ width: text.length * 6 }),
    putAuxilliaryText: (...args: unknown[]) => {
      texts.push(args as TextCall);
    },
  };
}

function context(
  canvas: ReturnType<typeof fakeCanvas>,
  dirty: Rect[],
  configuration: Record<string, boolean>,
  extra: Record<string, unknown> = {},
): GuidePaintContext {
  return {
    canvas,
    dirtyMatcher: { getDirtyRectangles: () => dirty },
    configuration: { multiPageView: false, ...configuration },
    labelColor: css("label"),
    selectionShapeOutlineColor: css("selected"),
    highlightOutlineColor: css("highlighted"),
    selectionThirdOutlineColor: css("third"),
    ...extra,
  } as unknown as GuidePaintContext;
}

/** A label guide that paints fixed items. */
class FixedLabelGuide extends LabelGuide {
  items: LabelItem[] = [];

  override getId(): string {
    return "guide.test";
  }

  override _gatherLabels(): LabelItem[] {
    return this.items;
  }
}

describe("LabelGuide paint", () => {
  it("cuts unscaled labels to the box width with an ellipsis", () => {
    const guide = new FixedLabelGuide(host(fakeScene([], null)));
    guide.items = [
      // 60 px of text in a 40 px box less 7 px padding: cut while the
      // text is at least 33 - 6 px wide, so four characters stay.
      new LabelItem(new Point(100, 50), 40, "ABCDEFGHIJ", css("one")),
      // Fits: unchanged.
      new LabelItem(new Point(0, 0), 40, "ABCD", css("two")),
      // Empty labels are skipped.
      new LabelItem(new Point(0, 0), 40, "", css("three")),
      // Scaled labels are never cut, and size and padding scale.
      new LabelItem(new Point(10, 20), 10, "ABCDEFGHIJ", css("four"), true),
    ];
    const canvas = fakeCanvas();
    guide.paint(new Transform(2, 0, 0, 2, 0, 0), context(canvas, [], {}));
    expect(canvas.texts).toEqual([
      ["ABCD…", 100, 43, "10px Verdana", "bottom", "start", 0.8, "one"],
      ["ABCD", 0, -7, "10px Verdana", "bottom", "start", 0.8, "two"],
      ["ABCDEFGHIJ", 10, 6, "20px Verdana", "bottom", "start", 0.8, "four"],
    ]);
  });

  it("drops the whole text when not even the ellipsis fits", () => {
    const guide = new FixedLabelGuide(host(fakeScene([], null)));
    guide.items = [new LabelItem(new Point(0, 0), 8, "ABC", css("one"))];
    const canvas = fakeCanvas();
    guide.paint(new Transform(), context(canvas, [], {}));
    expect(canvas.texts.map((call) => call[0])).toEqual(["…"]);
  });

  it("falls back to the scene color, the context label color, then black", () => {
    const item = () => new LabelItem(new Point(0, 0), 100, "A");
    const paintWith = (scene: Scene, extra: Record<string, unknown>) => {
      const guide = new FixedLabelGuide(host(scene));
      guide.items = [item()];
      const canvas = fakeCanvas();
      guide.paint(new Transform(), context(canvas, [], {}, extra));
      return (canvas.texts[0] as TextCall)[7];
    };
    expect(paintWith(fakeScene([], null, { $lbc: css("scene") }), {})).toBe("scene");
    expect(paintWith(fakeScene([], null), {})).toBe("label");
    expect(paintWith(fakeScene([], null), { labelColor: undefined })).toBe(
      RGBColor.BLACK.toScreenCSS(),
    );
  });
});

describe("PageLabelGuide", () => {
  const multi = { multiPageView: true, pageLabelsVisible: true };

  it("shows only the active page's label without multi-page view", () => {
    const active = fakePage({ name: "A", at: [0, 0, 100, 100], flags: [NodeFlag.Active] });
    const other = fakePage({ name: "B", at: [0, 200, 100, 100], index: 1 });
    const guide = new PageLabelGuide(host(fakeScene([active, other], active)));
    const ctx = context(fakeCanvas(), [], { pageLabelsVisible: true });
    expect(guide._pageFilter(active, ctx, new Transform())).toBe(true);
    expect(guide._pageFilter(other, ctx, new Transform())).toBe(false);
  });

  it("hides a label covered by a later page or by the active page", () => {
    // The label box of `covered` is (0, 103, 6, 17); `cover` starts at y 110.
    const covered = fakePage({ name: "A", at: [0, 120, 100, 100], index: 1 });
    const cases: [PageSpec, boolean][] = [
      [{ name: "C", at: [0, 0, 100, 115], index: 2 }, false],
      [{ name: "C", at: [0, 0, 100, 115], index: 0 }, true],
      [{ name: "C", at: [0, 0, 100, 115], index: 0, flags: [NodeFlag.Active] }, false],
      // Overlaps the page but not its label.
      [{ name: "C", at: [0, 150, 100, 100], index: 2 }, true],
    ];
    for (const [spec, shows] of cases) {
      const cover = fakePage(spec);
      const active = fakePage({ name: "X", at: [1000, 1000, 10, 10] });
      const guide = new PageLabelGuide(host(fakeScene([covered, cover], active)));
      expect(guide._pageFilter(covered, context(fakeCanvas(), [], multi), new Transform())).toBe(
        shows,
      );
    }
  });

  it("never filters the active page itself", () => {
    const active = fakePage({ name: "A", at: [0, 120, 100, 100], index: 0 });
    const cover = fakePage({ name: "C", at: [0, 0, 100, 115], index: 2 });
    const guide = new PageLabelGuide(host(fakeScene([active, cover], active)));
    expect(guide._pageFilter(active, context(fakeCanvas(), [], multi), new Transform())).toBe(true);
  });

  it("gathers labels in dirty areas with selected and highlighted colours", () => {
    const first = fakePage({
      name: "First",
      at: [0, 0, 100, 50],
      flags: [NodeFlag.Active, NodeFlag.Selected],
    });
    const second = fakePage({
      name: "Second",
      at: [200, 0, 100, 50],
      index: 1,
      flags: [NodeFlag.Highlighted],
    });
    const third = fakePage({ name: "Third", at: [400, 0, 100, 50], index: 2 });
    // Its label (y 183 to 200) is outside the dirty areas.
    const outside = fakePage({ name: "Outside", at: [0, 200, 100, 50], index: 3 });
    const guide = new PageLabelGuide(host(fakeScene([first, second, third, outside], first)));
    const canvas = fakeCanvas();
    // The second area also covers the first label; it is added only once.
    const labels = guide._gatherLabels(
      new Transform(2, 0, 0, 2, 10, 0),
      context(canvas, [new Rect(-10, -30, 1000, 40), new Rect(-10, -20, 50, 30)], multi),
    ) as LabelItem[];
    expect(
      labels.map((item) => [
        item.getLabel(),
        item.getPosition().getX(),
        item.getPosition().getY(),
        item.getWidth(),
        item.getColor()?.toScreenCSS(),
        item.isScaleLabel(),
      ]),
    ).toEqual([
      ["Third", 810, 0, 200, "label", false],
      ["Second", 410, 0, 200, "highlighted", false],
      ["First", 10, 0, 200, "selected", false],
    ]);
  });

  it("uses the scene label color for plain pages and gathers nothing when hidden", () => {
    const page = fakePage({ name: "P", at: [0, 0, 100, 50], flags: [NodeFlag.Active] });
    const guide = new PageLabelGuide(host(fakeScene([page], page, { $lbc: css("scene") })));
    const dirty = [new Rect(-10, -30, 200, 40)];
    const labels = guide._gatherLabels(
      new Transform(),
      context(fakeCanvas(), dirty, { pageLabelsVisible: true }),
    ) as LabelItem[];
    expect(labels.map((item) => item.getColor()?.toScreenCSS())).toEqual(["scene"]);
    expect(guide._gatherLabels(new Transform(), context(fakeCanvas(), dirty, {}))).toBeNull();
  });
});

describe("SymbolLabelGuide", () => {
  interface SymbolSpec {
    name: string;
    master?: boolean;
    inScene?: boolean;
    frame?: Rect | null;
    page: Page;
  }

  function fakeSymbol(spec: SymbolSpec) {
    const notAPage = {};
    return {
      $name: spec.name,
      isMaster: () => spec.master !== false,
      getScene: () => (spec.inScene === false ? null : {}),
      // Walks a group, then the page, as the parent chain would.
      findParent: (test: (node: unknown) => boolean | undefined) =>
        [notAPage, spec.page].find((node) => test(node)) ?? null,
      getFrame: () => (spec.frame === undefined ? new Rect(10, 10, 50, 50) : spec.frame),
      isScaleLabel: () => false,
    };
  }

  it("labels master symbols in the scene with a ○ prefix and the third outline colour", () => {
    const active = fakePage({ name: "A", at: [0, 0, 500, 500], flags: [NodeFlag.Active] });
    const inactive = fakePage({ name: "B", at: [600, 0, 500, 500] });
    const symbols = [
      fakeSymbol({ name: "Button", page: active }),
      // Only masters pass the filter, so the "● " prefix never shows.
      fakeSymbol({ name: "Instance", master: false, page: active }),
      fakeSymbol({ name: "Detached", inScene: false, page: active }),
      fakeSymbol({ name: "Elsewhere", page: inactive }),
      fakeSymbol({ name: "NoFrame", frame: null, page: active }),
      fakeSymbol({ name: "Card", frame: new Rect(100, 200, 40, 30), page: active }),
    ];
    const guide = new SymbolLabelGuide(host(fakeScene([], active, { getSymbols: () => symbols })));
    const labels = guide._gatherLabels(
      new Transform(2, 0, 0, 2, 0, 0),
      context(fakeCanvas(), [new Rect(0, 0, 1000, 1000)], { symbolLabelsVisible: true }),
    ) as LabelItem[];
    expect(
      labels.map((item) => [
        item.getLabel(),
        item.getPosition().getX(),
        item.getPosition().getY(),
        item.getWidth(),
        item.getColor()?.toScreenCSS(),
      ]),
    ).toEqual([
      ["○ Card", 200, 400, 80, "third"],
      ["○ Button", 20, 20, 100, "third"],
    ]);
    expect(
      guide._gatherLabels(new Transform(), context(fakeCanvas(), [new Rect(0, 0, 1000, 1000)], {})),
    ).toBeNull();
  });

  it("offsets frames by the page position in multi-page view and skips clean areas", () => {
    const page = fakePage({ name: "B", at: [600, 0, 500, 500] });
    const symbols = [fakeSymbol({ name: "Button", page })];
    const guide = new SymbolLabelGuide(host(fakeScene([], null, { getSymbols: () => symbols })));
    const config = { multiPageView: true, symbolLabelsVisible: true };
    // The label box is (610, -7, 50, 17).
    const hit = guide._gatherLabels(
      new Transform(),
      context(fakeCanvas(), [new Rect(600, -5, 20, 5)], config),
    ) as LabelItem[];
    expect(hit.map((item) => [item.getPosition().getX(), item.getPosition().getY()])).toEqual([
      [610, 10],
    ]);
    const miss = guide._gatherLabels(
      new Transform(),
      context(fakeCanvas(), [new Rect(0, -5, 20, 5)], config),
    ) as LabelItem[];
    expect(miss).toEqual([]);
  });
});
