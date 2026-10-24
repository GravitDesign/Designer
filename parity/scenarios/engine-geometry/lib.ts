// Shared helpers for the engine-geometry scenarios.
//
// Scenario code runs in the page as source text, so it can't import
// anything. `geomLib` is sent along as source too (see `geo()` below) and
// rebuilt in the page, where it gets the engine namespace G. Everything in
// here must therefore be plain, self-contained JavaScript that only uses
// G's public class and method names, so it runs unchanged in both apps.
import { defineScenarios, type ParityHandle, type Scenario } from "../../support/scenario.ts";

type G = ParityHandle["G"];
type App = ParityHandle["app"];
type Encoded = unknown;
/** An engine object (loosely typed, like G itself). */
type EngineObject = ParityHandle["G"];

/** What `geomLib(G)` returns; the type scenario bodies see as `L`. */
export interface GeomLib {
  /**
   * Encodes any engine value as plain data. Numbers, undefined, NaN and
   * -0 are returned as they are; geo() tags the special ones on the way
   * out of the page.
   */
  enc(value: unknown): Encoded;
  /** Calls `f` and encodes its result, or `{ throws: true }` if it threw. */
  run(f: () => unknown): Encoded;
  /** Reads a vertex source into `[command, x, y]` triples (null if it can't rewind). */
  verts(source: unknown): Encoded;
  /** Seeded PRNG (mulberry32): floats in [0, 1). */
  rng(seed: number): () => number;
  /** Seeded floats in [lo, hi). */
  floats(seed: number, count: number, lo: number, hi: number): number[];
  /** Builds a GVertexContainer from a compact list: [cmd, x, y, cmd, x, y, ...]. */
  vc(flat: number[]): EngineObject;
  /** Closed polygon as a GVertexContainer from [x0, y0, x1, y1, ...]. */
  poly(xy: number[], open?: boolean): EngineObject;
  /** GVertexContainer for a rectangle. */
  rect(x: number, y: number, w: number, h: number, ccw?: boolean): EngineObject;
  /** GVertexContainer for an ellipse (4 cubic segments, Gravit's kappa). */
  ellipse(cx: number, cy: number, rx: number, ry: number): EngineObject;
  /**
   * Builds a GPath. Each point is [x, y] or an object with anchor point
   * properties (x, y, tp, hlx, hly, hrx, hry, ah, cl, cr, cu).
   */
  path(points: (number[] | Record<string, unknown>)[], closed: boolean): EngineObject;
  /** Geometry bbox, paint bbox and vertices of an element. */
  shape(element: unknown): Encoded;
  /** Adds a solid black fill layer. */
  fill(element: unknown): void;
  /** Adds a solid black border layer with the given properties (_bw, _ba, ...). */
  border(element: unknown, props: Record<string, unknown>): void;
}

export function geomLib(G: G): GeomLib {
  const isSource = (v: unknown): boolean =>
    !!v &&
    typeof v === "object" &&
    typeof (v as { rewindVertices?: unknown }).rewindVertices === "function" &&
    typeof (v as { readVertex?: unknown }).readVertex === "function";
  const verts = (source: unknown): Encoded => {
    const s = source as {
      rewindVertices(i: number): boolean;
      readVertex(v: unknown): boolean;
    };
    if (!s.rewindVertices(0)) return null;
    const out: unknown[] = [];
    const v = new G.GVertex();
    let guard = 0;
    while (s.readVertex(v)) {
      out.push([v.command, v.x, v.y]);
      if (++guard > 200000) {
        out.push("overflow");
        break;
      }
    }
    return out;
  };
  const enc = (v: unknown, depth = 0): Encoded => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string" || typeof v === "boolean") return v;
    if (typeof v === "function") return "function";
    if (depth > 12) return "deep";
    const o = v as EngineObject;
    if (o instanceof G.GPoint) return { P: [o.getX(), o.getY()] };
    if (o instanceof G.GRect) return { R: [o.getX(), o.getY(), o.getWidth(), o.getHeight()] };
    if (o instanceof G.GTransform) return { T: o.getMatrix().slice() };
    if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>);
    if (Array.isArray(v)) return v.map((x) => enc(x, depth + 1));
    if (v instanceof G.GVertex) {
      const vx = v as { command: number; x: number; y: number };
      return { cmd: vx.command, x: vx.x, y: vx.y };
    }
    if (v instanceof G.GHitResult) {
      const h = v as { segment: unknown; x: unknown; y: unknown; slope: unknown; outline: unknown };
      return {
        segment: enc(h.segment, depth + 1),
        x: enc(h.x, depth + 1),
        y: enc(h.y, depth + 1),
        slope: enc(h.slope, depth + 1),
        outline: enc(h.outline, depth + 1),
      };
    }
    if (isSource(v)) return { V: verts(v) };
    const out: Record<string, Encoded> = {};
    for (const k of Object.keys(v as object).sort()) {
      out[k] = enc((v as Record<string, unknown>)[k], depth + 1);
    }
    return out;
  };
  const run = (f: () => unknown): Encoded => {
    try {
      return enc(f());
    } catch {
      return { throws: true };
    }
  };
  const rng = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const floats = (seed: number, count: number, lo: number, hi: number): number[] => {
    const r = rng(seed);
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(lo + (hi - lo) * r());
    return out;
  };
  const vc = (flat: number[]): unknown => {
    const c = new G.GVertexContainer();
    for (let i = 0; i < flat.length; i += 3) {
      c.addVertex(flat[i], flat[i + 1], flat[i + 2]);
    }
    return c;
  };
  const poly = (xy: number[], open?: boolean): unknown => {
    const c = new G.GVertexContainer();
    for (let i = 0; i < xy.length; i += 2) c.addVertex(i === 0 ? 1 : 2, xy[i], xy[i + 1]);
    if (!open) c.addVertex(5, 0, 0);
    return c;
  };
  const rect = (x: number, y: number, w: number, h: number, ccw?: boolean): unknown =>
    ccw
      ? poly([x, y, x, y + h, x + w, y + h, x + w, y])
      : poly([x, y, x + w, y, x + w, y + h, x, y + h]);
  const ellipse = (cx: number, cy: number, rx: number, ry: number): unknown => {
    const k = 0.5522847498307936;
    const c = new G.GVertexContainer();
    // Curve2 (4) is a cubic: the vertex holds the end point, the next two
    // vertices hold the control points.
    c.addVertex(1, cx + rx, cy);
    c.addVertex(4, cx, cy + ry);
    c.addVertex(4, cx + rx, cy + ry * k);
    c.addVertex(4, cx + rx * k, cy + ry);
    c.addVertex(4, cx - rx, cy);
    c.addVertex(4, cx - rx * k, cy + ry);
    c.addVertex(4, cx - rx, cy + ry * k);
    c.addVertex(4, cx, cy - ry);
    c.addVertex(4, cx - rx, cy - ry * k);
    c.addVertex(4, cx - rx * k, cy - ry);
    c.addVertex(4, cx + rx, cy);
    c.addVertex(4, cx + rx * k, cy - ry);
    c.addVertex(4, cx + rx, cy - ry * k);
    c.addVertex(5, 0, 0);
    return c;
  };
  const path = (points: (number[] | Record<string, unknown>)[], closed: boolean): unknown => {
    const p = new G.GPath(closed);
    const aps = p.getAnchorPoints();
    for (const pt of points) {
      const ap = new G.GPathBase.AnchorPoint();
      if (Array.isArray(pt)) {
        ap.setProperties(["x", "y"], [pt[0], pt[1]]);
      } else {
        const keys = Object.keys(pt);
        ap.setProperties(
          keys,
          keys.map((k) => pt[k]),
        );
      }
      aps.appendChild(ap);
    }
    return p;
  };
  const shape = (element: unknown): Encoded => {
    const e = element as {
      getGeometryBBox(): unknown;
      getPaintBBox(): unknown;
    };
    return {
      geometry: run(() => e.getGeometryBBox()),
      paint: run(() => e.getPaintBBox()),
      verts: run(() => verts(e)),
    };
  };
  const layer = (element: unknown, kind: string, props: Record<string, unknown>): void => {
    const l = new G.GStylable[kind]();
    l.setProperty("_pt", new G.GRGBColor([0, 0, 0]));
    const keys = Object.keys(props);
    if (keys.length)
      l.setProperties(
        keys,
        keys.map((k) => props[k]),
      );
    (element as { getPaintLayers(): { appendChild(n: unknown): void } })
      .getPaintLayers()
      .appendChild(l);
  };
  const fill = (element: unknown): void => layer(element, "FillPaintLayer", {});
  const border = (element: unknown, props: Record<string, unknown>): void =>
    layer(element, "BorderPaintLayer", props);
  return { enc, run, verts, rng, floats, vc, poly, rect, ellipse, path, shape, fill, border };
}

const LIB = geomLib.toString();

interface GeoArgs {
  lib: string;
  body: string;
}

/** A scenario body: gets the helpers, the engine namespace and the app hooks. */
export type GeoBody = (L: GeomLib, G: G, app: App) => unknown;

/** Defines a json scenario whose body runs in the page with the helpers. */
export function geo(id: string, covers: string[], body: GeoBody): Scenario {
  return {
    id: `engine-geometry/${id}`,
    covers,
    kind: "json",
    args: { lib: LIB, body: body.toString() },
    inPage: ({ G, app }, args) => {
      const { lib, body: source } = args as GeoArgs;
      // Both functions arrive as source text; rebuilding them in the page is
      // the only way to run the same code in both apps.
      const L = (0, eval)(`(${lib})`)(G);
      const fn = (0, eval)(`(${source})`);
      // -0, NaN, ±Infinity and undefined as the tagged strings the harness
      // defines (runner.ts tagSpecialValues); JSON.stringify would turn them
      // into 0, null or nothing. Tagged strings pass through the harness's
      // own tagging unchanged.
      const tag = (v: unknown): unknown => {
        if (typeof v === "number") {
          if (Object.is(v, -0)) return "<-0>";
          if (Number.isNaN(v)) return "<NaN>";
          if (v === Infinity) return "<Infinity>";
          if (v === -Infinity) return "<-Infinity>";
          return v;
        }
        if (v === undefined) return "<undefined>";
        if (Array.isArray(v)) return v.map(tag);
        if (v && typeof v === "object") {
          const out: Record<string, unknown> = {};
          for (const [k, child] of Object.entries(v)) out[k] = tag(child);
          return out;
        }
        return v;
      };
      return Promise.resolve(fn(L, G, app)).then(tag);
    },
  };
}

export { defineScenarios };
