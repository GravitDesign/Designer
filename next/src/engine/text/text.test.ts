import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { Node } from "../scene/node.ts";
import { PathBase } from "../scene/path-base.ts";
import { Path } from "../scene/path.ts";
import { Stylable } from "../style/stylable.ts";
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
});

describe("GText", () => {
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
