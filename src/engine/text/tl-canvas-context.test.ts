import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { Vertex } from "../geometry/vertex.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Transform } from "../math/transform.ts";
import type { Context2D } from "../paint/context-2d.ts";
import { Font } from "./fonts/font.ts";
import { FontManager, ResolveFontEvent } from "./fonts/font-manager.ts";
import { OpenTypeFont } from "./fonts/open-type-font.ts";
import { Formatting } from "./gtl/formatting.ts";
import { RenderFlags } from "./gtl/render-flags.ts";
import { TLCanvasContext, type TLCanvasCore } from "./tl-canvas-context.ts";
import { TLDirectionTextTransformer } from "./tl-direction-text-transformer.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../legacy/public/assets/font");

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Recorded from the old bundle (module 655 with the old Open Sans font) by running probeCanvasContext in the old app. */
const expected = JSON.parse(
  readFileSync(resolve(here, "gtl/__fixtures__/old-canvas-context.json"), "utf8"),
) as Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any -- the probe drives the old and the new engine through the same untyped surface */
// PROBE START
// Runs the same calls against the old module (in the old app page, with the
// `: any` annotations stripped) and the port. Only uses what it is given.
function probeCanvasContext(api: any): any {
  const { TLCanvasContext, VertexContainer, Transform, Formatting, Direction, RGBColor, fm } = api;
  const F = 1;
  const S = 2;
  const V = 4;
  const EVENODD = 64;
  const LOCKFILL = 32;
  const OUT = 256;
  const IN = 512;
  const NODRAW = 1024;
  const STYLES = 2048;
  const r = (n: any) => (typeof n === "number" ? Math.round(n * 1e6) / 1e6 : n);
  const fmt = (v: any): any => {
    if (v && typeof v === "object" && v.toScreenCSS) return "color:" + v.toScreenCSS();
    if (v && typeof v === "object" && v.getMatrix) return v.getMatrix().map(r);
    return typeof v === "number" ? r(v) : v;
  };
  const makeLog = () => {
    const log: any[] = [];
    const state: any = {
      fillStyle: "#000000",
      strokeStyle: "#000000",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      lineWidth: 1,
      font: "10px sans-serif",
      textAlign: "start",
      textBaseline: "alphabetic",
    };
    const ctx: any = { log };
    Object.keys(state).forEach((k) => {
      Object.defineProperty(ctx, k, {
        get: () => state[k],
        set: (v: any) => {
          state[k] = v;
          log.push("set " + k + "=" + JSON.stringify(fmt(v)));
        },
      });
    });
    [
      "save",
      "restore",
      "beginPath",
      "moveTo",
      "lineTo",
      "quadraticCurveTo",
      "bezierCurveTo",
      "closePath",
      "fill",
      "stroke",
      "fillRect",
      "strokeRect",
      "clearRect",
      "fillText",
      "strokeText",
      "setTransform",
    ].forEach((name) => {
      ctx[name] = (...args: any[]) => {
        log.push(name + "(" + args.map((a) => JSON.stringify(fmt(a))).join(",") + ")");
      };
    });
    return ctx;
  };
  const core = {
    _fontManager: fm,
    required: [] as any[],
    requireFont(font: any) {
      core.required.push(font.getFamily());
    },
    getRenderBounds: () => null,
    getLines: () => [],
  };
  const dump = (source: any) => {
    const out: any[] = [];
    const vertex = { command: 0, x: 0, y: 0 };
    if (source.rewindVertices(0)) {
      while (source.readVertex(vertex)) out.push(vertex.command, r(vertex.x), r(vertex.y));
    }
    return out;
  };
  const saved = {
    fontFamily: Formatting.defaultFormatting.fontFamily,
    fontStyle: Formatting.defaultFormatting.fontStyle,
    fontWeight: Formatting.defaultFormatting.fontWeight,
  };
  Formatting.defaultFormatting.fontFamily = "Open Sans";
  Formatting.defaultFormatting.fontStyle = "normal";
  Formatting.defaultFormatting.fontWeight = 400;
  const out: any = {};
  const run = (name: string, setup: (c: any) => void) => {
    const log = makeLog();
    const c = new TLCanvasContext(core, log);
    c.font = "normal 400 20px Open Sans";
    setup(c);
    const collected = new VertexContainer();
    c.addVertices(collected);
    const styles: any[] = [];
    c.addStyleVertices(styles);
    out[name] = {
      log: log.log,
      collected: dump(collected),
      styles: styles.map((s: any) => {
        const o: any = {};
        Object.keys(s).forEach((k) => {
          o[k] = k === "vertices" ? (s[k] ? dump(s[k]) : s[k]) : fmt(s[k]);
        });
        return o;
      }),
    };
  };
  try {
    run("collect", (c) => {
      c.renderMode(V);
      c.drawText("Hello", 10, 30, 20, 50);
    });
    run("fill", (c) => {
      c.renderMode(V | F);
      c.fillStyle = "#ff0000";
      c.drawText("Hi there", 0, 20, 20, 70);
    });
    run("strokeInside", (c) => {
      c.renderMode(V | S | IN);
      c.lineWidth = 2;
      c.drawText("Ok", 5, 25, 20, 30);
    });
    run("fillStrokeOutsideLines", (c) => {
      c.renderMode(V | F | S | OUT | EVENODD);
      c.charSpacing = 2;
      c.textUnderline = true;
      c.textStrikeout = true;
      c.drawText("Wave", 3, 22, 21, 60);
    });
    run("nodrawStroke", (c) => {
      c.renderMode(V | S | NODRAW);
      c.drawText("AV", 0, 20, 20, 30);
    });
    run("styles", (c) => {
      c.renderMode(V | STYLES);
      c.fillStyle = "#00ff00";
      c.textUnderline = true;
      c.drawText("ab", 1, 2, 20, 20);
      try {
        c.drawText("", 1, 2, 20, 20);
      } catch (e: any) {
        out.emptyTextError = String(e.message);
      }
    });
    run("nbsp", (c) => {
      c.renderMode(V);
      c.drawText("a b", 0, 20, 20, 20);
    });
    run("marker", (c) => {
      const marker = new VertexContainer();
      marker.addVertex(1, -1, -2);
      marker.addVertex(2, 1, -2);
      marker.addVertex(2, 1, 0);
      marker.addVertex(5, 0, 0);
      c.renderMode(V | F | S | IN);
      c.drawMarker(marker, 10, 20);
      c.renderMode(V);
      c.drawMarker(marker, 1, 2);
      c.renderMode(V | STYLES);
      c.drawMarker(marker, 3, 4);
      c.renderMode(F);
      c.drawMarker(marker, 3, 4);
    });
    run("canvasFill", (c) => {
      c.renderMode(F);
      c.textUnderline = true;
      c.textStrikeout = true;
      c.drawText("plain", 4, 10, 16, 40);
    });
    run("canvasStrokeInside", (c) => {
      c.renderMode(S | IN | STYLES);
      c.textUnderline = true;
      c.drawText("plain", 4, 10, 16, 40);
    });
    run("canvasStrokeOutside", (c) => {
      c.renderMode(S | OUT);
      c.textStrikeout = true;
      c.drawText("plain", 4, 10, 16, 40);
    });
    run("rtl", (c) => {
      c.textTransformer = new Direction(core, { direction: 1 });
      c.renderMode(V | F);
      c.textUnderline = true;
      c.drawText("Rt", 0, 20, 20, 25);
    });
    run("ttb", (c) => {
      c.textTransformer = new Direction(core, { direction: 2 });
      c.renderMode(V);
      c.drawText("T1", 0, 20, 20, 25);
    });
    run("transforms", (c) => {
      c.setScale(2, 3);
      c.setTranslate(5, 6);
      c.scale(2, 1);
      c.translate(1, 1);
      c.appendFillTransform(new Transform(1, 0, 0, 1, 7, 0));
      c.prependFillTransform(new Transform(2, 0, 0, 2, 0, 0));
      c.fillRect(0, 0, 4, 4);
      c.fillRect(1, 1, 2, 2, "#123456");
      c.strokeRect(0, 0, 4, 4);
      c.fillVertices("#abcdef", 0.5, "destination-in");
      c.strokeVertices();
      c.setFillTransform(new Transform(1, 0, 0, 1, 1, 1));
      c.fillVertices();
      c.clearRect(0, 0, 1, 1);
      c.save();
      c.restore();
      c.fill();
    });
    run("defaultFill", (c) => {
      c.defaultFill = "#0000ff";
      c.renderMode(V | F);
      c.fillStyle = "#ff0000";
      c.drawText("d", 0, 20, 20, 10);
      c.defaultFill = "transparent";
      c.renderMode(V | F | LOCKFILL);
      c.fillStyle = "#00ff00";
      c.drawText("d", 0, 20, 20, 10);
    });
    run("patternFill", (c) => {
      c.renderMode(V | F | S);
      c.fillStyle = new RGBColor([255, 0, 0]);
      c.strokeStyle = new RGBColor([0, 0, 255]);
      c.drawText("p", 0, 20, 20, 10);
    });
    run("fontSwitch", (c) => {
      c.renderMode(V);
      c.font = "normal 700 30px Open Sans";
      c.drawText("B", 0, 30, 30, 20);
      c.font = "normal 400 10px Open Sans";
      c.drawText("s", 0, 30, 10, 20);
    });
  } finally {
    Formatting.defaultFormatting.fontFamily = saved.fontFamily;
    Formatting.defaultFormatting.fontStyle = saved.fontStyle;
    Formatting.defaultFormatting.fontWeight = saved.fontWeight;
  }
  out.required = core.required;
  return out;
}
// PROBE END
/* eslint-enable @typescript-eslint/no-explicit-any */

function makeFontManager(): FontManager {
  const manager = new FontManager();
  const regular = OpenTypeFont.create(
    "Open Sans",
    Font.Style.Normal,
    400,
    readFont("OpenSans-Regular.ttf"),
  );
  const bold = OpenTypeFont.create(
    "Open Sans",
    Font.Style.Normal,
    700,
    readFont("OpenSans-Bold.ttf"),
  );
  manager._fonts.push(regular as OpenTypeFont, bold as OpenTypeFont);
  manager.setDefaultFont(regular as OpenTypeFont);
  return manager;
}

/** A context that only records calls, for the behaviour tests below. */
function recordingContext(): { ctx: Context2D; log: string[] } {
  const log: string[] = [];
  const target: Record<string, unknown> = { fillStyle: "#000000", strokeStyle: "#000000" };
  const ctx = new Proxy(target, {
    get(object, key: string) {
      if (key in object) return object[key];
      return (...args: unknown[]) => log.push(key + "(" + args.join(",") + ")");
    },
    set(object, key: string, value: unknown) {
      object[key] = value;
      log.push(key + "=" + String(value));
      return true;
    },
  });
  return { ctx: ctx as unknown as Context2D, log };
}

let manager: FontManager;
let actual: Record<string, unknown>;

beforeAll(() => {
  manager = makeFontManager();
  actual = JSON.parse(
    JSON.stringify(
      probeCanvasContext({
        TLCanvasContext,
        VertexContainer,
        Transform,
        Formatting,
        Direction: TLDirectionTextTransformer,
        RGBColor,
        fm: manager,
      }),
    ),
  ) as Record<string, unknown>;
});

describe("TLCanvasContext against the old module", () => {
  for (const name of Object.keys(expected)) {
    it(name, () => {
      expect(actual[name]).toEqual(expected[name]);
    });
  }
});

describe("TLCanvasContext", () => {
  let saved: [unknown, unknown, unknown];
  beforeAll(() => {
    const d = Formatting.defaultFormatting;
    saved = [d.fontFamily, d.fontStyle, d.fontWeight];
    d.fontFamily = "Open Sans";
    d.fontStyle = "normal";
    d.fontWeight = 400;
  });
  afterAll(() => {
    const d = Formatting.defaultFormatting;
    [d.fontFamily, d.fontStyle, d.fontWeight] = saved as [string, string, number];
  });

  const core = (fm: FontManager): TLCanvasCore & { required: string[] } => {
    const required: string[] = [];
    return {
      _fontManager: fm,
      required,
      requireFont(font: Font) {
        required.push(font.getFamily() + "/" + font.getWeight());
      },
    };
  };

  it("collects glyph outlines in vertex mode without touching the canvas", () => {
    const { ctx, log } = recordingContext();
    const context = new TLCanvasContext(core(manager), ctx);
    context.font = "normal 400 20px Open Sans";
    context.renderMode(RenderFlags.RENDERFLAG_VERTEX);
    context.drawText("H", 0, 20, 20, 10);
    expect(log.filter((entry) => !entry.startsWith("font="))).toEqual([]);
    const collected = new VertexContainer();
    context.addVertices(collected);
    const vertex = new Vertex();
    collected.rewindVertices(0);
    expect(collected.readVertex(vertex)).toBe(true);
    expect(vertex.command).toBe(Vertex.Command.Move);
  });

  it("keeps the last resolved font and asks the core for missing ones", () => {
    const fm = makeFontManager();
    // A listener makes getFont create an unresolved placeholder.
    fm.addEventListener(ResolveFontEvent, () => {});
    const owner = core(fm);
    const { ctx } = recordingContext();
    const context = new TLCanvasContext(owner, ctx);
    context.font = "normal 700 20px Open Sans";
    expect(context.getCurrentFont()?.getWeight()).toBe(700);
    context.font = "normal 400 20px Missing Family";
    expect(owner.required).toEqual(["Missing Family/400"]);
    // The bold font stays current while the missing one is unresolved.
    expect(context.getCurrentFont()?.getWeight()).toBe(700);
    expect(owner.required).toEqual(["Missing Family/400", "Missing Family/400"]);
  });

  it("falls back to the default font when nothing was ever resolved", () => {
    const fm = makeFontManager();
    const { ctx } = recordingContext();
    const context = new TLCanvasContext(core(fm), ctx);
    (ctx as unknown as { font: string }).font = "normal 400 9px Nowhere";
    expect(context.getCurrentFont()).toBe(fm.getDefaultFont());
  });

  it("passes a pattern fill to the text fill style instead of the canvas", () => {
    const { ctx, log } = recordingContext();
    const context = new TLCanvasContext(core(manager), ctx);
    const red = new RGBColor([255, 0, 0]);
    context.fillStyle = red;
    expect(context._textFillStyle).toBe(red);
    expect(log).toEqual([]);
    context.fillStyle = "#010203";
    expect(context._textFillStyle).toBe(null);
    expect(log).toEqual(["fillStyle=#010203"]);
  });

  it("unwraps a canvas element for its 2D context", () => {
    const { ctx } = recordingContext();
    class FakeCanvasElement {
      getContext(): Context2D {
        return ctx;
      }
    }
    const globals = globalThis as unknown as Record<string, unknown>;
    const previous = globals.HTMLCanvasElement;
    globals.HTMLCanvasElement = FakeCanvasElement;
    try {
      const context = new TLCanvasContext(
        core(manager),
        new FakeCanvasElement() as unknown as HTMLCanvasElement,
      );
      expect(context.$canvasContext).toBe(ctx);
    } finally {
      globals.HTMLCanvasElement = previous;
    }
  });
});
