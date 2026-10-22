/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
import type { ParityHandle } from "../../support/scenario.ts";

/**
 * Small in-page helpers shared by the engine-model scenarios. They only use
 * the G namespace and the documented app hooks, so they run unchanged in
 * both apps. `makeHelpers` is sent to the page as source text together with
 * the scenario (see `withHelpers`), so it must not refer to anything
 * outside its own body.
 */
export function makeHelpers(p: ParityHandle) {
  const G = p.G;
  const app = p.app;
  const isNum = (x: any) => typeof x === "number";
  /** A rectangle as [x, y, w, h], or null. */
  const r = (b: any) => (b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null);
  /** Encodes any property value as plain JSON, keeping its type visible. */
  const v = (x: any): any => {
    if (x === undefined) return "<undefined>";
    if (x === null || typeof x === "boolean" || typeof x === "string") return x;
    if (isNum(x)) {
      if (Number.isNaN(x)) return "<NaN>";
      if (!Number.isFinite(x)) return x > 0 ? "<Infinity>" : "<-Infinity>";
      return x;
    }
    if (Array.isArray(x)) return x.map(v);
    if (x instanceof G.GPattern) return "pattern:" + G.GPattern.serialize(x);
    if (x instanceof G.GTransform) return { trf: G.GTransform.serialize(x) };
    if (x instanceof G.GRect) return { rect: G.GRect.serialize(x) };
    if (x instanceof G.GPoint) return { point: [x.getX(), x.getY()] };
    if (x instanceof G.GNode) return { node: G.GNode.getName(x) };
    if (typeof x === "function") return "<function>";
    if (typeof x === "object") {
      const out: Record<string, any> = {};
      for (const k of Object.keys(x)) out[k] = v(x[k]);
      return out;
    }
    return String(x);
  };
  /** The inverse of `v` for the value shapes scenarios pass in args. */
  const dec = (x: any): any => {
    if (typeof x === "string" && x.startsWith("pattern:"))
      return G.GPattern.deserialize(x.slice(8));
    if (Array.isArray(x)) return x.map(dec);
    if (x && typeof x === "object") {
      if (Array.isArray(x.trf)) return G.GTransform.deserialize(x.trf);
      if (Array.isArray(x.rect)) return G.GRect.deserialize(x.rect);
      if (Array.isArray(x.point)) return new G.GPoint(x.point[0], x.point[1]);
      if (x.json !== undefined) return x.json;
      const out: Record<string, any> = {};
      for (const k of Object.keys(x)) out[k] = dec(x[k]);
      return out;
    }
    return x;
  };
  /** Sets properties from an args object whose values are encoded for `dec`. */
  const setAll = (node: any, values: Record<string, any>) => {
    const names = Object.keys(values);
    node.setProperties(
      names,
      names.map((n) => dec(values[n])),
    );
    return node;
  };
  /** Reads the given properties of a node, encoded with `v`. */
  const props = (node: any, names: readonly string[]) => {
    const out: Record<string, any> = {};
    for (const n of names) out[n] = v(node.getProperty(n));
    return out;
  };
  /** Serializes one node (a JSON string). */
  const ser = (node: any, options?: any) => G.GNode.serialize(node, options);
  /** Serializes one node and parses it back into an object. */
  const rawBlob = (node: any, options?: any) => JSON.parse(G.GNode.serialize(node, options));
  /**
   * Replaces the random ids of a parsed blob (node ids, reference ids,
   * style layer and effect hashes, scene id lists, paths-graph uids) with
   * "<id>", also inside nested JSON strings and serialized patterns, and
   * wall-clock timestamps (annotations stamp "time"/"mtime" with now) with
   * "<now>", so json scenarios stay deterministic. Document scenarios keep
   * the ids and let the harness rename them instead.
   */
  const ID_KEYS = ["@id", "#", "&", "_effId", "_layId", "__ids", "sref", "_uid", "aid", "pgid"];
  const TIME_KEYS = ["time", "mtime", "lmd"];
  const clean = (x: any): any => {
    // Compact anchor points store references as [..., "#", id, "&", id].
    if (Array.isArray(x))
      return x.map((item, i) =>
        typeof item === "string" && (x[i - 1] === "#" || x[i - 1] === "&") ? "<id>" : clean(item),
      );
    if (typeof x === "string") {
      const m = /^([A-Z]#|pattern:[A-Z]#)?([[{].*[\]}])$/s.exec(x);
      if (m) {
        try {
          return (m[1] ?? "") + JSON.stringify(clean(JSON.parse(m[2] as string)));
        } catch {
          return x;
        }
      }
      return x;
    }
    if (x && typeof x === "object") {
      const out: Record<string, any> = {};
      for (const k of Object.keys(x)) {
        const val = x[k];
        if (ID_KEYS.includes(k) && val !== null) out[k] = "<id>";
        else if (TIME_KEYS.includes(k) && isNum(val) && val > 1e12) out[k] = "<now>";
        // Paths-graph nodes store [uid, ...] under "props".
        else if (
          k === "props" &&
          Array.isArray(val) &&
          typeof val[0] === "string" &&
          val[0].length === 32
        )
          out[k] = ["<id>", ...clean(val.slice(1))];
        else out[k] = clean(val);
      }
      return out;
    }
    return x;
  };
  /** Serializes one node into an object with random ids replaced (see clean). */
  const blob = (node: any, options?: any) => clean(rawBlob(node, options));
  /** All vertices of a vertex source as [command, x, y] triples. */
  const verts = (src: any, limit = 100000) => {
    const out: any[] = [];
    if (!src.rewindVertices(0)) return out;
    const vx = new G.GVertex();
    while (out.length < limit && src.readVertex(vx)) {
      out.push(vx.command === G.GVertex.Command.Close ? [vx.command] : [vx.command, vx.x, vx.y]);
    }
    return out;
  };
  /**
   * A compact digest of a long vertex stream (text outlines): vertex count,
   * per-contour bounds and the coordinate sums. Any moved glyph point
   * changes the sums; any moved glyph changes its contour bounds.
   */
  const outline = (src: any) => {
    const all = verts(src);
    const contours: number[][] = [];
    let cur: number[] | null = null;
    let sx = 0;
    let sy = 0;
    const cmds: Record<string, number> = {};
    for (const vx of all) {
      cmds[vx[0]] = (cmds[vx[0]] ?? 0) + 1;
      if (vx.length < 3) continue;
      const [c, x, y] = vx;
      sx += x;
      sy += y;
      if (c === G.GVertex.Command.Move || !cur) {
        cur = [x, y, x, y];
        contours.push(cur);
      }
      cur[0] = Math.min(cur[0] as number, x);
      cur[1] = Math.min(cur[1] as number, y);
      cur[2] = Math.max(cur[2] as number, x);
      cur[3] = Math.max(cur[3] as number, y);
    }
    return { count: all.length, cmds, sumX: sx, sumY: sy, contours };
  };
  const T = (a: number, b: number, c: number, d: number, e: number, f: number) =>
    new G.GTransform(a, b, c, d, e, f);
  /** A rectangle shape covering x, y, w, h. */
  const rect = (x: number, y: number, w: number, h: number) => {
    const n = new G.GRectangle();
    n.setProperty("trf", T(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
    return n;
  };
  const ellipse = (x: number, y: number, w: number, h: number) => {
    const n = new G.GEllipse();
    n.setProperty("trf", T(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
    return n;
  };
  const rgb = (r0: number, g0: number, b0: number) => new G.GRGBColor([r0, g0, b0]);
  const fill = (node: any, pattern: any, extra?: Record<string, any>) => {
    const l = new G.GStylable.FillPaintLayer();
    l.setProperty("_pt", pattern);
    if (extra) l.setProperties(Object.keys(extra), Object.values(extra));
    node.getPaintLayers().appendChild(l);
    return l;
  };
  const border = (node: any, pattern: any, extra?: Record<string, any>) => {
    const l = new G.GStylable.BorderPaintLayer();
    l.setProperty("_pt", pattern);
    if (extra) l.setProperties(Object.keys(extra), Object.values(extra));
    node.getPaintLayers().appendChild(l);
    return l;
  };
  /** Bounding boxes of an element: source, geometry, paint. */
  const boxes = (n: any) => ({
    source: r(n.getSourceBBox()),
    geometry: r(n.getGeometryBBox()),
    paint: r(n.getPaintBBox()),
  });
  const page = () => app.scene().getActivePage();
  /** Where new elements go: the active layer, or the page itself (infinite canvas). */
  const layer = () => app.scene().getActiveLayer() || app.scene().getActivePage();
  /** Adds nodes to the active layer directly (no editor, no default style). */
  const add = (...nodes: any[]) => {
    const l = layer();
    for (const n of nodes) l.appendChild(n);
    return nodes[0];
  };
  /** Adds nodes through the editor (default style, one undo step). */
  const insert = (...nodes: any[]) => {
    app.editor().insertElements(nodes);
    return nodes[0];
  };
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const frame = () => new Promise((res) => requestAnimationFrame(() => res(undefined)));
  /**
   * Waits until the font manager has no pending or unresolved fonts and
   * none of the given texts waits for a font, twice in a row, then lets
   * one frame pass so deferred layouts run.
   */
  const fonts = async (...texts: any[]) => {
    const fm = app.scene().getWorkspace().getFontManager();
    let quiet = 0;
    for (let i = 0; i < 400 && quiet < 2; i++) {
      const busy =
        fm.hasPendingFonts() || fm.hasUnresolvedFonts() || texts.some((t) => t.hasFontsToResolve());
      quiet = busy ? 0 : quiet + 1;
      await sleep(25);
    }
    if (quiet < 2) throw new Error("fonts did not load");
    await frame();
  };
  /**
   * Runs fn and returns its encoded result, or "<throws>" if it throws.
   * Messages of the old engine's internal errors are minified noise, so
   * only the fact that it throws is recorded.
   */
  const attempt = (fn: () => any) => {
    try {
      return v(fn());
    } catch {
      return "<throws>";
    }
  };
  /** Like attempt, but keeps the message (for errors the engine raises on purpose). */
  const attemptMsg = (fn: () => any) => {
    try {
      return v(fn());
    } catch (e) {
      return "error: " + (e as Error).message;
    }
  };
  /**
   * The first text inserted in a page can come before the default font
   * finished loading, and is then stored without its font family. Warming
   * the page up once with a throwaway text makes every scenario start from
   * the same state, whatever ran before it.
   */
  const warmText = async () => {
    const w = window as any;
    if (w.__engineModelTextWarm) return;
    const warm = new G.GText();
    insert(warm);
    warm.setText("warm up");
    await fonts(warm);
    warm.getParent().removeChild(warm);
    w.__engineModelTextWarm = true;
  };
  /** Inserts a text through the editor, sets text then props, waits for fonts. */
  const text = async (content: any, values?: Record<string, any>, x = 0, y = 0) => {
    await warmText();
    const t = new G.GText();
    t.setProperty("trf", T(1, 0, 0, 1, x, y));
    insert(t);
    t.setText(content);
    if (values) setAll(t, values);
    await fonts(t);
    // When a font was still loading, setText took a deferred path that
    // stores the runs differently. Setting the text again once every font
    // is resolved makes the result independent of what the page loaded
    // before (scenarios share one page).
    t.setText(content);
    if (values) setAll(t, values);
    await fonts(t);
    return t;
  };
  /**
   * A node blob with random ids replaced and without `_sdf`, the runtime type
   * id of the default style (it depends on module load order).
   */
  const stable = (n: any) => {
    const b = blob(n, { copy: true });
    delete b._sdf;
    return b;
  };
  /**
   * The scene's `_links` map is keyed by random reference ids, and the
   * harness only renames ids that appear as values. This turns it into a
   * list of [key, targets] pairs (in insertion order) so the keys get
   * renamed too. Use on parsed scene blobs in document scenarios.
   */
  const linksAsEntries = (sceneBlob: any) => {
    if (sceneBlob && sceneBlob._links && typeof sceneBlob._links === "object")
      sceneBlob._links = Object.entries(sceneBlob._links);
    return sceneBlob;
  };
  /** The active document serialized for saving, with `_links` as entries. */
  const savedScene = () => linksAsEntries(JSON.parse(app.serialize({ save: true })));
  /** Child node names of a container. */
  const kids = (n: any) => (n.getChildren() as any[]).map((c) => G.GNode.getName(c));
  return {
    G,
    app,
    r,
    v,
    dec,
    setAll,
    props,
    ser,
    blob,
    rawBlob,
    clean,
    verts,
    outline,
    T,
    rect,
    ellipse,
    rgb,
    fill,
    border,
    boxes,
    page,
    layer,
    add,
    insert,
    sleep,
    frame,
    fonts,
    attempt,
    attemptMsg,
    kids,
    linksAsEntries,
    savedScene,
    text,
    warmText,
    stable,
  };
}

export type Helpers = ReturnType<typeof makeHelpers>;

/**
 * Wraps an in-page scenario function so it receives the helpers as a third
 * argument. The runner sends `inPage.toString()` to the page, so the
 * wrapper's source text builds the helpers in the page and calls `fn`.
 */
export function withHelpers<A>(
  fn: (p: ParityHandle, args: A, H: Helpers) => unknown,
): (p: ParityHandle, args: unknown) => unknown {
  const source = `(p, a) => (${fn.toString()})(p, a, (${makeHelpers.toString()})(p))`;
  const wrapper = (): never => {
    throw new Error("in-page scenario functions only run in the page");
  };
  wrapper.toString = () => source;
  return wrapper;
}
