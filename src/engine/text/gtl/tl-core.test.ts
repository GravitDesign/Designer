import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import { Transform } from "../../math/transform.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import { installFakeCanvas } from "../../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../fonts/font-manager.ts";
import { OpenTypeFont } from "../fonts/open-type-font.ts";
import { TLCanvasContext } from "../tl-canvas-context.ts";
import { Formatting } from "./formatting.ts";
import { GTL_PROBE_FONTS, probeGtl } from "./gtl-probe.ts";
import { registerStylable } from "./late-bound.ts";
import { Per } from "./list-util.ts";
import { openTypeMeasure } from "./measure.ts";
import { RunDraw } from "./run-draw.ts";
import { TLCodes } from "./tl-codes.ts";
import { TLCore } from "./tl-core.ts";
import { TLUtil } from "./tl-util.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../legacy/public/assets/font");

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
  "Noto Sans CJK JP/N/400": "noto/NotoSansCJKjp-Regular.otf",
};

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Recorded from the old app with gtl-probe.ts (old modules 148-928 around GTLCore). */
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-gtl.json"), "utf8"),
) as Record<string, unknown>;

let actual: Record<string, unknown>;
let uninstall: () => void;

beforeAll(() => {
  uninstall = installFakeCanvas();
  // The text style defaults of the old app (GStylable), as far as the core reads them.
  registerStylable({
    PropertySetInfo: {
      T: { geometryProperties: { _tfi: 20, _fc: undefined, _tcs: null, _tws: null } },
      P: { geometryProperties: { _plh: 1, _pal: null } },
    },
    PropertySet: { Text: "T", Paragraph: "P" },
    ParagraphAlignment: { Left: "l", Center: "c", Right: "r", Justify: "j" },
    BorderAlignment: { Inside: "I", Outside: "O" },
  });
  const fontManager = new FontManager();
  for (const [family, style, weight] of GTL_PROBE_FONTS) {
    const file = FONT_FILES[[family, style, weight].join("/")] as string;
    fontManager._fonts.push(
      OpenTypeFont.create(family, style, weight, readFont(file)) as OpenTypeFont,
    );
  }
  fontManager.setDefaultFont(fontManager._fonts[0] as OpenTypeFont);
  // Like the app: fonts it doesn't have fail to resolve and stay placeholders.
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
  actual = JSON.parse(
    JSON.stringify(
      probeGtl({
        TLCore,
        Formatting,
        TLUtil,
        RunDraw,
        measure: openTypeMeasure,
        Per,
        TLCodes,
        TLCanvasContext,
        VertexContainer,
        VertexInfo,
        Transform,
        RGBColor,
        fontManager,
      }),
    ),
  ) as Record<string, unknown>;
}, 120_000);

afterAll(() => {
  uninstall();
});

describe("GTL against the old engine", () => {
  it("loads the same fonts", () => {
    expect(actual.fonts).toEqual(expected.fonts);
  });

  it("parses fonts and CSS like GTLUtil", () => {
    expect(actual.parseFont).toEqual(expected.parseFont);
    expect(actual.cssProperty).toEqual(expected.cssProperty);
    expect(actual.transformText).toEqual(expected.transformText);
  });

  it("normalizes every line break (BUG-023)", () => {
    // The old GTLUtil.deCRLFify replaced only the first CRLF and the first CR.
    expect(expected.deCRLFify).toBe("a\nb\n\nc\rd   e\r");
    expect(actual.deCRLFify).toBe("a\nb\nc\nd   e\n");
  });

  it("builds font strings (super/sub at 0.8) and additional props", () => {
    expect(actual.fontString).toEqual(expected.fontString);
  });

  it("formats, merges and consolidates runs", () => {
    expect(actual.formatting).toEqual(expected.formatting);
  });

  it("runs per sequences", () => {
    expect(actual.per).toEqual(expected.per);
  });

  it("numbers and draws list markers", () => {
    expect(actual.markers).toEqual(expected.markers);
  });

  it("fills the default formatting on the first initialize", () => {
    expect(actual.defaultFormatting).toEqual(expected.defaultFormatting);
  });

  it("measures runs with the OpenType meter", () => {
    expect(actual.measure).toEqual(expected.measure);
    expect(actual.meterDirect).toEqual(expected.meterDirect);
  });

  const layouts = expected.layouts as Record<string, unknown>;
  for (const name of Object.keys(layouts)) {
    it(`lays out ${name}`, () => {
      expect((actual.layouts as Record<string, unknown>)[name]).toEqual(layouts[name]);
    });
  }

  const edits = expected.edits as Record<string, unknown>;
  for (const name of Object.keys(edits)) {
    it(`edits ${name}`, () => {
      expect((actual.edits as Record<string, unknown>)[name]).toEqual(edits[name]);
    });
  }

  // Glyphs on a path are placed with Math.atan2, sin and cos, which differ
  // in the last bits between Node's V8 and Chromium's, where the fixture was
  // recorded. Node checks the layout around the path; the placed outlines,
  // boxes and render bounds match exactly when the port runs in Chromium
  // (checked by running the probe on the bundled port in the old app's
  // browser). The path transformer itself is compared with values recorded
  // in Node in tl-path-text-transformer.test.ts.
  type PathResult = {
    layout: Record<string, unknown>;
    first: unknown;
    hasPath: unknown;
    removed: unknown;
  };
  const paths = expected.paths as Record<string, PathResult>;
  const pathLayout = (result: PathResult) => ({
    ok: result.layout.ok,
    lines: result.layout.lines,
    tree: result.layout.tree,
    plain: result.layout.plain,
    saved: result.layout.saved,
    styled: (result.layout.styled as { fill: unknown; op: unknown }[]).map((s) => [s.fill, s.op]),
    first: result.first,
    hasPath: result.hasPath,
    removed: result.removed,
  });
  for (const name of Object.keys(paths)) {
    it(`puts text on a path: ${name}`, () => {
      const result = (actual.paths as Record<string, PathResult>)[name] as PathResult;
      expect(pathLayout(result)).toEqual(pathLayout(paths[name] as PathResult));
    });
  }

  it("switches directions", () => {
    expect(actual.directions).toEqual(expected.directions);
  });

  // The outline digests on the circle are exact only in Chromium (see
  // above); the transformer chain and the rounded bounds must match here.
  it("changes direction on a path: direction transformer in front, removed for LTR", () => {
    const withoutDigests = (steps: unknown) =>
      (steps as Record<string, unknown>[]).map((step) => ({ ...step, digest: undefined }));
    expect(withoutDigests(actual.pathDirections)).toEqual(withoutDigests(expected.pathDirections));
  });

  const renderBranches = expected.renderBranches as Record<string, unknown>;
  for (const name of Object.keys(renderBranches)) {
    it(`renders: ${name}`, () => {
      expect((actual.renderBranches as Record<string, unknown>)[name]).toEqual(
        renderBranches[name],
      );
    });
  }

  it("keeps the old slips: merge of a run array, deferred initialize, unknown codes", () => {
    expect(actual.quirks).toEqual(expected.quirks);
  });

  it("fires events, clones and handles an uninitialized core", () => {
    expect(actual.misc).toEqual(expected.misc);
  });
});
