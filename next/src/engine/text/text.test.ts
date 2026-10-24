import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { Node } from "../scene/node.ts";
import { PathBase } from "../scene/path-base.ts";
import { Path } from "../scene/path.ts";
import { Rect } from "../math/rect.ts";
import { Layer } from "../scene/layer.ts";
import { Scene } from "../scene/scene.ts";
import { Workspace } from "../scene/workspace.ts";
import { Stylable } from "../style/stylable.ts";
import { TransactionRecorder } from "../undo/transaction-recorder.ts";
import { FontManager, type ResolveFontEvent } from "./fonts/font-manager.ts";
import { OpenTypeFont } from "./fonts/open-type-font.ts";
import { TEXT_PROBE_FONTS, probeText } from "./text-probe.ts";
import { Text } from "./text.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../public/assets/font");

/** The files the old app serves for the probe fonts. */
const FONT_FILES: Record<string, string> = {
  "Open Sans/N/400": "OpenSans-Regular.ttf",
  "Open Sans/N/700": "OpenSans-Bold.ttf",
  "Open Sans/I/700": "OpenSans-BoldItalic.ttf",
  "Open Sans/I/400": "OpenSans-Italic.ttf",
  "Open Sans/N/300": "OpenSans-Light.ttf",
  "Open Sans/I/600": "OpenSans-SemiBoldItalic.ttf",
  "Open Sans/N/600": "OpenSans-SemiBold.ttf",
  "Noto Sans Hebrew/N/400": "noto/NotoSansHebrew-Regular.ttf",
  "Noto Sans Arabic/N/400": "noto/NotoSansArabic-Regular.ttf",
};

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Recorded from the old app with text-probe.ts (GText, module 70). */
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-text.json"), "utf8"),
) as Record<string, Record<string, unknown>>;

/**
 * The parts of old-text.json that show a bug the port fixes, as the port
 * gives them (BUGS-FIXED.md "BUG-020 A fake text gives only its first
 * backup outline to vertex readers").
 */
const fixed = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-text.fixed.json"), "utf8"),
) as { bug: string; fakeVertices: Record<string, unknown>; undo: Record<string, unknown> };
const expectedUndo = { ...(expected.undo as object), ...fixed.undo } as Record<string, unknown>;

let actual: Record<string, Record<string, unknown>>;
let uninstall: () => void;
let fontManager: FontManager;

beforeAll(() => {
  uninstall = installFakeCanvas();
  fontManager = new FontManager();
  for (const [family, style, weight] of TEXT_PROBE_FONTS) {
    const file = FONT_FILES[[family, style, weight].join("/")] as string;
    fontManager._fonts.push(
      OpenTypeFont.create(family, style, weight, readFont(file)) as OpenTypeFont,
    );
  }
  fontManager.setDefaultFont(fontManager._fonts[0] as OpenTypeFont);
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
  actual = JSON.parse(
    JSON.stringify(
      probeText({
        Text,
        Node,
        Transform,
        Point,
        Path,
        PathBase,
        VertexInfo,
        RGBColor,
        Stylable,
        FontManager,
        fontManager,
        TransactionRecorder,
        Scene,
        Workspace,
        Layer,
      }),
    ),
  ) as Record<string, Record<string, unknown>>;
}, 120_000);

afterAll(() => {
  uninstall();
});

function workspace(fm: FontManager) {
  return {
    getFontManager: () => fm,
    getTransactionRecorder: () => null,
    addReference: () => {},
    removeReference: () => {},
    getReference: () => null,
  };
}

describe("GText against the old engine", () => {
  it("has the old statics", () => {
    expect(actual.statics).toEqual(expected.statics);
  });

  for (const name of Object.keys(expected.layout as object)) {
    it(`lays out ${name}`, () => {
      expect((actual.layout as Record<string, unknown>)[name]).toEqual(
        (expected.layout as Record<string, unknown>)[name],
      );
    });
  }

  it("keeps text and properties until it has a workspace", () => {
    expect(actual.waiting).toEqual(expected.waiting);
  });

  it("sizes, fits and truncates", () => {
    expect(actual.sizes).toEqual(expected.sizes);
  });

  for (const name of Object.keys(expected.onPath as object)) {
    if (name === "open") continue;
    it(`puts text on a path (${name})`, () => {
      expect((actual.onPath as Record<string, unknown>)[name]).toEqual(
        (expected.onPath as Record<string, unknown>)[name],
      );
    });
  }

  // The open path runs diagonally, so the glyphs are rotated by
  // Math.atan2/cos/sin, which Node computes differently from Chromium in
  // the last bit. The vertex digests are compared where the old app
  // recorded them, in the browser (text-probe.ts runs unchanged in the new
  // app's parity page); here everything else must match, including the
  // outline bounds.
  it("puts text on a path (open)", () => {
    const withoutDigests = (value: unknown): unknown =>
      JSON.parse(JSON.stringify(value), (key, inner: unknown) =>
        key === "digest" ? undefined : inner,
      );
    const open = (actual.onPath as Record<string, unknown>).open;
    expect(withoutDigests(open)).toEqual(
      withoutDigests((expected.onPath as Record<string, unknown>).open),
    );
  });

  it("converts to shapes", () => {
    expect(actual.shapes).toEqual(expected.shapes);
  });

  it("serializes, restores, copies and clones", () => {
    expect(actual.serialize).toEqual(expected.serialize);
  });

  for (const name of Object.keys(expected.legacy as object)) {
    it(`restores legacy blob ${name}`, () => {
      expect((actual.legacy as Record<string, unknown>)[name]).toEqual(
        (expected.legacy as Record<string, unknown>)[name],
      );
    });
  }

  for (const name of Object.keys(expected.transforms as object)) {
    it(`transforms (${name})`, () => {
      expect((actual.transforms as Record<string, unknown>)[name]).toEqual(
        (expected.transforms as Record<string, unknown>)[name],
      );
    });
  }

  it("converts values between Gravit and GTL", () => {
    expect(actual.values).toEqual(expected.values);
    expect(actual.fontAttributes).toEqual(expected.fontAttributes);
    expect(actual.replaceFF).toEqual(expected.replaceFF);
  });

  it("reads and sets properties of the selection", () => {
    expect(actual.selection).toEqual(expected.selection);
  });

  it("changes fonts and content through properties", () => {
    expect(actual.fontChange).toEqual(expected.fontChange);
    expect(actual.contentProperty).toEqual(expected.contentProperty);
  });

  it("hit tests the box", () => {
    expect(actual.hits).toEqual(expected.hits);
  });

  it("waits for missing fonts", () => {
    expect(actual.missing).toEqual(expected.missing);
  });

  it("reads every backup outline of a fake text (BUG-020)", () => {
    expect(actual.fakeVertices).toEqual(fixed.fakeVertices);
    type Outline = { digest: string; head: unknown[]; bounds: [string, ...number[]] };
    const fake = actual.fakeVertices as { backups: Outline[]; outline: Outline };
    const old = expected.fakeVertices as { backups: Outline[]; outline: Outline };
    // The old outline was the first backup's alone.
    expect(old.outline.bounds).toEqual(old.backups[0]?.bounds);
    // Now it starts like the first one and covers both.
    expect(fake.outline.head).toEqual(fake.backups[0]?.head);
    const [first, second] = fake.backups as [Outline, Outline];
    const [, x1, y1, w1, h1] = first.bounds as [string, number, number, number, number];
    const [, x2, y2, w2, h2] = second.bounds as [string, number, number, number, number];
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    expect(fake.outline.bounds).toEqual([
      "R",
      left,
      top,
      Math.max(x1 + w1, x2 + w2) - left,
      Math.max(y1 + h1, y2 + h2) - top,
    ]);
  });

  for (const name of Object.keys(expected.undo as object)) {
    it(`undoes and redoes through the transaction recorder (${name})`, () => {
      expect((actual.undo as Record<string, unknown>)[name]).toEqual(expectedUndo[name]);
    });
  }

  for (const name of Object.keys(expected.direction as object)) {
    it(`changes the direction (${name})`, () => {
      expect((actual.direction as Record<string, unknown>)[name]).toEqual(
        (expected.direction as Record<string, unknown>)[name],
      );
    });
  }

  // A replacement font's weight reaches `_tfw` (BUGS-FIXED.md "BUG-021
  // replaceFonts writes the style twice and never the weight"); the old
  // app stored no _tfw in the cases that store the content.
  const replacedWeight: Record<string, number> = { fontSetterContent: 700, fontContent: 700 };
  for (const name of Object.keys(expected.replaceFonts as object)) {
    it(`replaces fonts (${name})`, () => {
      const old = (expected.replaceFonts as Record<string, { state: { blob: { _tfw: unknown } } }>)[
        name
      ];
      const want = JSON.parse(JSON.stringify(old)) as NonNullable<typeof old>;
      if (replacedWeight[name]) {
        expect(old?.state.blob._tfw).toBeUndefined();
        want.state.blob._tfw = replacedWeight[name];
      }
      expect((actual.replaceFonts as Record<string, unknown>)[name]).toEqual(want);
    });
  }

  for (const name of Object.keys(expected.legacyHeight as object)) {
    it(`repairs pre-3.1 heights and re-attaches on scene attach (${name})`, () => {
      expect((actual.legacyHeight as Record<string, unknown>)[name]).toEqual(
        (expected.legacyHeight as Record<string, unknown>)[name],
      );
    });
  }

  it("cuts at MAXLENGTH code units, even inside a surrogate pair", () => {
    expect(actual.maxLength).toEqual(expected.maxLength);
  });

  it("keeps the old slip of a raw trf array throwing", () => {
    expect(actual.quirks?.rawTrf).toEqual(expected.quirks?.rawTrf);
    expect(actual.quirks?.lockAfterResolved).toEqual(expected.quirks?.lockAfterResolved);
  });

  it("unlocks the change events when setText waits for a missing font (BUG-010)", () => {
    // The old app left them locked (old-text.json quirks.lockAfterMissing = 1).
    expect(expected.quirks?.lockAfterMissing).toBe(1);
    expect(actual.quirks?.lockAfterMissing).toBe(0);
  });
});

describe("GText", () => {
  it("widens the border's pattern box only for borders that aren't inside (BUG-022)", () => {
    const text = new Text();
    text._setWorkspace(workspace(fontManager));
    text.setText("border");
    const boxes: number[][] = [];
    const stubbed = text as unknown as Record<string, unknown>;
    stubbed.hasStyleBorder = () => true;
    stubbed.getPatternBBox = () => new Rect(0, 0, 100, 50);
    stubbed._createStyleCanvas = () => ({ getScale: () => 1 });
    stubbed.createShapePaint = (_context: unknown, _pattern: unknown, box: Rect) => {
      boxes.push([box.getX(), box.getY(), box.getWidth(), box.getHeight()]);
      return null;
    };
    const context = {
      configuration: { isOutline: () => false },
      isIncludingInvisible: () => false,
      pushCanvas: () => ({}),
      popCanvas: () => {},
    };
    for (const alignment of ["I", "C", "O"]) {
      text._paintBorder(context as never, false, { $_ba: alignment, $_bw: 10 } as never);
    }
    // The old code read the text's own _ba (never set) and widened all three.
    expect(boxes).toEqual([
      [0, 0, 100, 50],
      [-5, -5, 110, 60],
      [-10, -10, 120, 70],
    ]);
  });

  it("registers GStylable with the GTL core, so a core initializes", () => {
    const text = new Text();
    text._setWorkspace(workspace(fontManager));
    expect(text.getTLCore()).not.toBeNull();
    expect(text.getTLCore()?.isInitialized()).toBe(true);
  });

  it("re-lays out and sets the waiting text when a font becomes available", () => {
    const fm = new FontManager();
    fm.setDefaultFont(fontManager.getDefaultFont() as OpenTypeFont);
    fm._fonts.push(fontManager.getDefaultFont() as OpenTypeFont);
    const bold = fontManager.getFont("Open Sans", "N", 700) as OpenTypeFont;
    let resolve: ((font: OpenTypeFont) => void) | null = null;
    fm.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
      if (event.weight === 700) resolve = (font) => event.resolved(font);
      else event.failed();
    });
    const text = new Text();
    text._setWorkspace(workspace(fm));
    text.setText("start");
    text.setProperty(
      "content",
      JSON.stringify([{ text: "later", fontFamily: "Open Sans", fontWeight: 700 }]),
    );
    expect(text.hasFontsToResolve()?.length).toBe(1);
    expect(text.getPlainText()).toBe("start");
    expect(resolve).not.toBeNull();
    (resolve as unknown as (font: OpenTypeFont) => void)(bold);
    expect(text.hasFontsToResolve()).toBeNull();
    expect(text.getPlainText()).toBe("later");
  });

  // Old chunk.vendor.js 18206-18213: the timer runs after the workspace is
  // gone, and _updateFontManagerListener does nothing without one.
  it("keeps listening for fonts after it leaves the workspace", () => {
    vi.useFakeTimers();
    try {
      const fm = new FontManager();
      fm.setDefaultFont(fontManager.getDefaultFont() as OpenTypeFont);
      fm.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
        event.failed();
      });
      const text = new Text();
      text._setWorkspace(workspace(fm));
      text.setText([{ text: "gone", fontFamily: "Gone" }]);
      expect(fm.hasEventListeners(FontManager.FontAvailableEvent)).toBe(true);
      text._setWorkspace(null);
      vi.advanceTimersByTime(200);
      expect(fm.hasEventListeners(FontManager.FontAvailableEvent)).toBe(true);
      expect(text._hasFontManagerListener).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  // Old chunk.vendor.js 17816, 18332-18337 and 17000-17001: the parent's
  // methods get only the arguments the old Text passed on.
  it("passes only the old arguments to the parent's paint and hit test", () => {
    const parent = Object.getPrototypeOf(Text.prototype) as {
      _preparePaint(...args: unknown[]): unknown;
      _paint(...args: unknown[]): unknown;
      _detailHitTest(...args: unknown[]): unknown;
    };
    const prepare = vi.spyOn(parent, "_preparePaint").mockReturnValue(false);
    const paint = vi.spyOn(parent, "_paint").mockReturnValue(undefined);
    const hitTest = vi.spyOn(parent, "_detailHitTest").mockReturnValue(null);
    try {
      const text = new Text();
      const context = {} as never;
      text._preparePaint(context, "arg");
      text._paint(context, "arg");
      expect(prepare.mock.calls).toEqual([[context]]);
      expect(paint.mock.calls).toEqual([[context]]);
      text.isFakeText = () => true;
      Text.HITTEST_TEXT = true;
      const point = new Point(1, 2);
      const transform = new Transform();
      text._detailHitTest(point, transform, 3, true, { options: true });
      expect(hitTest.mock.calls).toEqual([[point, transform, 3, true]]);
    } finally {
      Text.HITTEST_TEXT = false;
      prepare.mockRestore();
      paint.mockRestore();
      hitTest.mockRestore();
    }
  });

  // Old chunk.vendor.js 17039-17041: the pixel is a slice of ImageData.data.
  it("hit tests text pixels and returns the pixel as a Uint8ClampedArray", () => {
    const text = new Text();
    text._setWorkspace(workspace(fontManager));
    text.setText("pixels");
    // A 1x1 sample around the point (tolerance 0, scale 1): one opaque pixel.
    const data = new Uint8ClampedArray([10, 20, 30, 255]);
    const canvas = { getContext: () => ({ getImageData: () => ({ data }) }) };
    const core = text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
    core.getCanvas = (() => canvas) as unknown as typeof core.getCanvas;
    Text.HITTEST_TEXT = true;
    try {
      const hit = text._detailHitTest(new Point(5, 5), new Transform(), 0);
      const pixel = (hit?.data as { pixel: unknown }).pixel;
      expect(pixel).toBeInstanceOf(Uint8ClampedArray);
      expect(Array.from(pixel as Uint8ClampedArray)).toEqual([10, 20, 30, 255]);
    } finally {
      Text.HITTEST_TEXT = false;
    }
  });

  it("stores no backup outlines while dontStorePaths is set", () => {
    const text = new Text();
    text._setWorkspace(workspace(fontManager));
    text.setText("paths");
    expect("_bkpPath" in JSON.parse(Node.serialize(text) as string)).toBe(false);
    Text.dontStorePaths = false;
    try {
      const blob = JSON.parse(Node.serialize(text) as string) as { _bkpPath?: unknown[] };
      expect(Array.isArray(blob._bkpPath)).toBe(true);
    } finally {
      Text.dontStorePaths = true;
    }
  });

  it("shows the backup outlines as fake text while a font is missing", () => {
    const fm = new FontManager();
    fm.setDefaultFont(fontManager.getDefaultFont() as OpenTypeFont);
    fm._fonts.push(fontManager.getDefaultFont() as OpenTypeFont);
    fm.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
      event.failed();
    });
    const source = new Text();
    source._setWorkspace(workspace(fontManager));
    source.setText("fake");
    source._verticesDirty = true;
    const shapes = source.getTextShapes().map((shape) => Node.store(shape));
    const blob = JSON.parse(Node.serialize(source) as string) as Record<string, unknown>;
    blob.content = JSON.stringify([{ text: "fake", fontFamily: "Gone" }]);
    blob.ct = [{ text: "fake", fontFamily: "Gone" }];
    blob._bkpPath = shapes;
    const restored = Node.deserialize(JSON.stringify(blob)) as unknown as Text;
    restored._setWorkspace(workspace(fm));
    restored.getTLCore();
    expect(restored.isFakeText()).toBe(true);
    expect(restored.getGeometryBBox()).toEqual(source.getTextShapes()[0]?.getGeometryBBox());
  });
});
