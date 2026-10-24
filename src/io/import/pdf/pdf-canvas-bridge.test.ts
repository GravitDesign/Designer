import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image as GImage } from "../../../engine/scene/image.ts";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { CanvasHolder } from "../../export/canvas-holder.ts";
import { getList, setList } from "../fonts/google-font-names.ts";
import { PdfCanvasBridge } from "./pdf-canvas-bridge.ts";
import type { PdfCanvasState } from "./pdfjs.ts";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const fixture = (name: string) =>
  new Uint8Array(fs.readFileSync(path.join(here, "__fixtures__", name)));
/** Open Sans "AB" with its own names (family Open Sans). */
const OPEN_SANS = new Uint8Array(
  fs.readFileSync(
    path.join(here, "..", "..", "..", "workers", "pdf", "__fixtures__", "open-sans-ab.ttf"),
  ),
);
/** A font whose names match no family in the list. */
const ICONS = new Uint8Array(
  fs.readFileSync(
    path.join(
      here,
      "..",
      "..",
      "..",
      "..",
      "parity",
      "fixtures",
      "import",
      "font",
      "gravit-icons.ttf",
    ),
  ),
);

/** What the bridge asks the font manager for, and what it registers. */
class FakeFont {
  constructor(
    readonly family: string,
    readonly style: string,
    readonly weight: number,
  ) {}
  getFamily(): string {
    return this.family;
  }
  getStyle(): string {
    return this.style;
  }
  getWeight(): number {
    return this.weight;
  }
}

function fakeFontManager() {
  const requests: [string, string, number][] = [];
  const fonts: unknown[] = [];
  const manager = {
    requests,
    getFont(family: string, style: string, weight: number) {
      requests.push([family, style, weight]);
      return new FakeFont(family, style, weight);
    },
    getFonts: () => fonts,
    getDefaultFont: () => null,
  };
  return manager;
}

/** A bridge with pdf.js's graphics state reduced to the current font. */
function bridgeWith(manager: ReturnType<typeof fakeFontManager>) {
  const bridge = new PdfCanvasBridge(
    new Group(),
    {} as unknown as CanvasHolder,
    manager as unknown as FontManager,
  );
  const current = { font: {} } as unknown as PdfCanvasState;
  bridge.gfx = { current };
  const useFont = (font: { loadedName: string; name: string; data?: Uint8Array }) => {
    (current as unknown as { font: unknown }).font = font;
    return bridge._getCurrentFont() as unknown as {
      otf: FakeFont & { _family?: string; isEmbedded?: () => boolean };
      supported?: boolean;
      substituteFont?: boolean;
    };
  };
  return { bridge, useFont };
}

describe("PdfCanvasBridge._getCurrentFont", () => {
  let previousList: readonly string[];
  beforeEach(() => {
    previousList = getList().slice();
    setList(["Open Sans"]);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    setList(previousList);
    vi.restoreAllMocks();
  });

  it("maps a family from the list to the font manager's font", () => {
    const manager = fakeFontManager();
    const { bridge, useFont } = bridgeWith(manager);
    const font = useFont({ loadedName: "g_d0_f1", name: "OpenSans", data: OPEN_SANS });
    expect(manager.requests).toEqual([["Open Sans", "N", 400]]);
    expect(font.otf).toBeInstanceOf(FakeFont);
    expect(font.supported).toBe(true);
    expect(bridge.getMissingFonts()).toEqual([]);
    expect(bridge.getEmbeddedFonts()).toEqual([]);
  });

  // The full name is stripped of weight names in module 1204's order
  // (ExtraLight, ExtraBold, SemiBold, Thin, Light, Regular, Medium, Bold,
  // Heavy). Stripping "bold" before "extrabold" would leave "open sans
  // extra", which isn't in the list.
  it.each([
    ["ParityXYZ-ExtraBold.ttf", 800],
    ["ParityXYZ-Bold.ttf", 700],
    ["ParityXYZ-Thin.ttf", 100],
  ])("maps %s by its full name minus the weight names", (file, weight) => {
    const manager = fakeFontManager();
    const { bridge, useFont } = bridgeWith(manager);
    const font = useFont({ loadedName: "g_d0_f1", name: "ParityXYZ", data: fixture(file) });
    expect(manager.requests).toEqual([["Open Sans", "N", weight]]);
    expect(font.otf.getFamily()).toBe("Open Sans");
    expect(font.supported).toBe(true);
    expect(bridge.getMissingFonts()).toEqual([]);
    expect(bridge.getEmbeddedFonts()).toEqual([]);
  });

  it("registers a font outside the list as embedded and missing", () => {
    const manager = fakeFontManager();
    const { bridge, useFont } = bridgeWith(manager);
    const font = useFont({ loadedName: "g_d0_f1", name: "Icons", data: ICONS });
    expect(manager.requests).toEqual([]);
    expect(font.supported).toBeUndefined();
    expect(font.otf.isEmbedded?.()).toBe(true);
    const name = font.otf.getFamily();
    expect(bridge.getMissingFonts()).toEqual([name]);
    expect(bridge.getEmbeddedFonts()).toEqual([font.otf]);
    expect(manager.getFonts()).toEqual([font.otf]);
  });

  it("reuses an embedded font with the same bytes and renames one with other bytes", () => {
    const manager = fakeFontManager();
    const first = bridgeWith(manager).useFont({ loadedName: "a", name: "Icons", data: ICONS });
    const family = first.otf.getFamily();

    // Same bytes in another import: the registered font is reused.
    const again = bridgeWith(manager);
    const reused = again.useFont({ loadedName: "b", name: "Icons", data: ICONS.slice() });
    expect(reused.otf).toBe(first.otf);
    expect(again.bridge.getEmbeddedFonts()).toEqual([]);
    expect(again.bridge.getMissingFonts()).toEqual([family]);

    // Other bytes, same family, style and weight: renamed with a suffix.
    const changed = ICONS.slice();
    changed[changed.length - 1] = (changed[changed.length - 1] as number) ^ 1;
    const other = bridgeWith(manager);
    const renamed = other.useFont({ loadedName: "c", name: "Icons", data: changed });
    expect(renamed.otf).not.toBe(first.otf);
    expect(renamed.otf.getFamily()).toMatch(new RegExp(`^${family}_[A-Za-z0-9]{3}$`));
    expect(other.bridge.getMissingFonts()).toEqual([renamed.otf.getFamily()]);
    expect(manager.getFonts()).toHaveLength(2);
  });

  it("substitutes Open Sans for a font without data and counts it missing", () => {
    const manager = fakeFontManager();
    const { bridge, useFont } = bridgeWith(manager);
    const font = useFont({ loadedName: "g_d0_f1", name: "Helvetica-BoldOblique-Italic" });
    expect(manager.requests).toEqual([["Open Sans", "I", 700]]);
    expect(font.substituteFont).toBe(true);
    expect(bridge.getMissingFonts()).toEqual(["Helvetica-BoldOblique-Italic"]);
    // Cached per loaded name.
    expect(useFont({ loadedName: "g_d0_f1", name: "ignored" })).toBe(font);
    expect(bridge.getMissingFonts()).toHaveLength(1);
  });

  it("substitutes Open Sans when the font data can't be parsed", () => {
    const manager = fakeFontManager();
    const { bridge, useFont } = bridgeWith(manager);
    const font = useFont({ loadedName: "x", name: "Broken", data: new Uint8Array([1, 2, 3, 4]) });
    expect(font.substituteFont).toBe(true);
    expect(manager.requests).toEqual([["Open Sans", "N", 400]]);
    expect(bridge.getMissingFonts()).toEqual([]);
  });
});

describe("PdfCanvasBridge paths and colors", () => {
  function bridge() {
    return new PdfCanvasBridge(
      new Group(),
      {} as unknown as CanvasHolder,
      null as unknown as FontManager,
    );
  }

  it("collapses a clip equal to the previous one", () => {
    const context = bridge();
    const root = context._root;
    context.save();
    context.rect(0, 0, 10, 10);
    context.clip();
    const first = context._clipping;
    expect(first).not.toBe(root);
    context.restore();
    context.save();
    context.rect(0, 0, 10, 10);
    context.clip();
    expect(root.getChildren()).toEqual([first]);
    expect(context._clipping).toBe(first);
    context.restore();
    // A different clip is kept.
    context.rect(0, 0, 20, 10);
    context.clip();
    expect(root.getChildren()).toHaveLength(2);
  });

  it("turns cmyk() strings into CMYK colors and CSS colors into RGB", () => {
    const context = bridge();
    const cmyk = context._getPattern("cmyk(10, 20.5, 30, 100)") as CMYKColor;
    expect(cmyk).toBeInstanceOf(CMYKColor);
    expect(cmyk._value).toEqual([0.1, 0.205, 0.3, 1]);
    const rgb = context._getPattern("rgb(255, 0, 0)") as RGBColor;
    expect(rgb).toBeInstanceOf(RGBColor);
    expect(RGBColor.equals(rgb, new RGBColor([255, 0, 0]))).toBe(true);
    const gradient = {};
    expect(context._getPattern(gradient)).toBe(gradient);
  });

  it("fills and strokes the current path with the styles", () => {
    const context = bridge();
    context.fillStyle = "cmyk(0, 100, 0, 0)" as never;
    context.rect(0, 0, 10, 10);
    context.fill();
    const path = context._root.getLastChild() as unknown as {
      getPaintLayers(): { getChildren(): { getProperty(name: string): unknown }[] };
    };
    const [fill] = path.getPaintLayers().getChildren();
    expect(fill?.getProperty("_pt")).toEqual(new CMYKColor([0, 1, 0, 0]));
  });
});

/** A canvas element stand-in: size, toDataURL naming the size, drawImage calls. */
class FakeCanvas {
  width = 300;
  height = 150;
  draws: unknown[][] = [];
  getContext() {
    return { drawImage: (...args: unknown[]) => this.draws.push(args) };
  }
  toDataURL() {
    return `data:fake/${this.width}x${this.height}`;
  }
}

describe("PdfCanvasBridge.drawImage", () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  let saved: Record<string, unknown>;
  beforeEach(() => {
    saved = {
      document: globals.document,
      HTMLCanvasElement: globals.HTMLCanvasElement,
      HTMLImageElement: globals.HTMLImageElement,
    };
    globals.HTMLCanvasElement = FakeCanvas;
    // No image elements in these tests: drawImage only checks instanceof.
    globals.HTMLImageElement = class FakeImage {
      readonly fake = true;
    };
    globals.document = { createElement: () => new FakeCanvas() };
  });
  afterEach(() => {
    Object.assign(globals, saved);
  });

  function bridge() {
    return new PdfCanvasBridge(
      new Group(),
      new CanvasHolder(100, 100),
      null as unknown as FontManager,
    );
  }

  function canvas(width: number, height: number): HTMLCanvasElement {
    const element = new FakeCanvas();
    element.width = width;
    element.height = height;
    return element as unknown as HTMLCanvasElement;
  }

  it("adds an image node with the canvas as url and the scaled transform", () => {
    const context = bridge();
    context.drawImage(canvas(4, 2), 0, 0, 4, 2, 0, -1, 1, 1);
    const image = context._root.getLastChild() as unknown as GImage;
    expect(image).toBeInstanceOf(GImage);
    expect(image.getProperty("url")).toBe("data:fake/4x2");
    expect((image.getTransform() as Transform).getMatrix()).toEqual([4, 0, 0, 2, 0, -2]);
  });

  it("lets an image replace the fresh clip it fills exactly", () => {
    const context = bridge();
    context.save();
    // The box the image covers: (0, 0, 1, 1) through its transform.
    context.rect(0, -2, 4, 2);
    context.clip();
    context.drawImage(canvas(4, 2), 0, 0, 4, 2, 0, -1, 1, 1);
    const children = context._root.getChildren();
    expect(children).toHaveLength(1);
    expect(children[0]).toBeInstanceOf(GImage);
    expect(context._currentClip).toBeNull();
  });

  it("keeps the clip when the image doesn't fill it", () => {
    const context = bridge();
    context.rect(0, -2, 4, 3);
    context.clip();
    context.drawImage(canvas(4, 2), 0, 0, 4, 2, 0, -1, 1, 1);
    const clip = context._root.getLastChild() as unknown as Group;
    expect(clip).not.toBeInstanceOf(GImage);
    expect(clip.getLastChild()).toBeInstanceOf(GImage);
  });

  it("scales images above 100 million pixels down", () => {
    const context = bridge();
    context.drawImage(canvas(20000, 20000), 0, 0, 20000, 20000, 0, 0, 1, 1);
    const image = context._root.getLastChild() as unknown as GImage;
    expect(image.getProperty("url")).toBe("data:fake/10000x10000");
    // The transform takes the inverse of the downscale factor.
    expect((image.getTransform() as Transform).getMatrix()).toEqual([40000, 0, 0, 40000, 0, 0]);
  });

  it("moves a scratch canvas's nodes over when it wasn't rasterized", () => {
    const context = bridge();
    const scratch = new CanvasHolder(10, 10);
    const inner = context.createContext(scratch);
    inner.rect(0, 0, 5, 5);
    inner.fill();
    const moved = inner._root.getFirstChild();
    context.globalAlpha = 0.5;
    context.translate(3, 4);
    context.drawImage(scratch, 0, 0, 10, 10, 0, 0, 10, 10);
    expect(inner._root.getFirstChild()).toBeNull();
    expect(context._root.getLastChild()).toBe(moved);
    expect((moved as unknown as { getProperty(n: string): unknown }).getProperty("_stop")).toBe(
      0.5,
    );
  });

  it("adds a rasterized scratch canvas as one image", () => {
    const context = bridge();
    const scratch = new CanvasHolder(10, 10);
    const inner = context.createContext(scratch);
    inner.rect(2, 3, 5, 5);
    inner.fill();
    inner._bitmap = {
      trim() {},
      toImageDataUrl: () => "data:fake/bitmap",
      getHTMLElement: () => canvas(10, 10),
    } as never;
    context.drawImage(scratch, 0, 0, 10, 10, 0, 0, 10, 10);
    const image = context._root.getLastChild() as unknown as GImage;
    expect(image).toBeInstanceOf(GImage);
    expect(image.getProperty("url")).toBe("data:fake/bitmap");
    expect(image.getProperty("_bvs")).toBe(false);
    expect((image.getTransform() as Transform).getMatrix()).toEqual([1, 0, 0, 1, 2, 3]);
  });
});
