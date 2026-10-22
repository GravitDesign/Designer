import type { Page } from "@playwright/test";
import type { ParityHandle } from "../../support/scenario.ts";

/**
 * Engine and app objects reached from scenario code. They come from two
 * different implementations through the same names, so they are typed
 * loosely, like ParityHandle.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;

/**
 * Arguments of the in-page probe. One probe call builds a document state
 * (`setup`), optionally runs an action, and records everything an action
 * can change.
 */
export interface ProbeArgs {
  /** Name of a document state built by `probe` (see the setups table). */
  setup: string;
  /** Action id to inspect and (unless `run` is false) execute. */
  id?: string;
  /** Arguments passed to app.execute(id, args). */
  execArgs?: unknown[];
  /**
   * "all": setup, execute, record (default).
   * "setup": setup and record the before state only, keep it for "after".
   * "after": record the after state of a previous "setup" call.
   */
  phase?: "all" | "setup" | "after";
  /** Skip running the action (only record its state). */
  run?: boolean;
  /** Run edit.undo/edit.redo when the action pushed undo states (default true). */
  undo?: boolean;
  /** Settings keys to record before and after. */
  settings?: string[];
  /** Also record the view (zoom, scroll, paint mode, rulers). */
  view?: boolean;
  /** Also record windows, documents and sidebars. */
  shell?: boolean;
  /** Also record the internal clipboard MIME types and node content. */
  clipboard?: boolean;
  /** Put these nodes (selection after setup, by default) into the internal clipboard first. */
  copyFirst?: "selection" | "fill-layer" | "border-layer" | "effect" | "none";
  /** Fill a system prompt dialog that the action opens with this value, then press OK. */
  prompt?: string | null;
  /** Milliseconds to wait after executing (async clipboard access). */
  settle?: number;
  /** Restore checkable state and settings after recording (default true). */
  restore?: boolean;
  /** Actions run after the setup and before recording "before". */
  pre?: string[];
  /** Zoom to 100% centred on the content (view.magnification.100) so drivers can click it. */
  center?: boolean;
  /** Record the active tool. */
  tool?: boolean;
  /** Extra numbers/strings used by some setups. */
  options?: Record<string, unknown>;
}

/**
 * Runs inside the page (both apps). Must not reference anything outside its
 * own body: it is sent to the page as source text.
 */
export async function probe(P: ParityHandle, a: ProbeArgs): Promise<string> {
  const { G, app } = P;
  const E = app.editorActions;
  const w = window as unknown as Record<string, unknown>;
  const ed = () => app.editor();
  const scene = () => app.scene();
  const page = () => scene().getActivePage();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (cond: () => boolean, ms = 5000) => {
    const t0 = Date.now();
    while (!cond()) {
      if (Date.now() - t0 > ms) throw new Error("timeout waiting in probe");
      await sleep(10);
    }
  };

  // ---------------------------------------------------------------- builders
  const T = (sx: number, sy: number, cx: number, cy: number) =>
    new G.GTransform(sx, 0, 0, sy, cx, cy);
  const solid = (rgb: number[]) => new G.GRGBColor(rgb);
  const fill = (node: Loose, rgb: number[]) => {
    const f = new G.GStylable.FillPaintLayer();
    f.setProperty("_pt", solid(rgb));
    node.getPaintLayers().appendChild(f);
    return f;
  };
  const border = (node: Loose, rgb: number[], width = 1) => {
    const b = new G.GStylable.BorderPaintLayer();
    b.setProperties(["_pt", "_bw"], [solid(rgb), width]);
    node.getPaintLayers().appendChild(b);
    return b;
  };
  const clearLayers = (node: Loose) => {
    const layers = node.getPaintLayers();
    for (const c of layers.getChildren().slice()) layers.removeChild(c);
  };
  const named = (node: Loose, name: string) => {
    node.setProperty("name", name);
    return node;
  };
  const rect = (name: string, x: number, y: number, w2: number, h2: number) =>
    named(
      (() => {
        const r = new G.GRectangle();
        r.setProperty("trf", T(w2 / 2, h2 / 2, x + w2 / 2, y + h2 / 2));
        return r;
      })(),
      name,
    );
  const ellipse = (name: string, x: number, y: number, w2: number, h2: number) => {
    const e = new G.GEllipse();
    e.setProperty("trf", T(w2 / 2, h2 / 2, x + w2 / 2, y + h2 / 2));
    return named(e, name);
  };
  const path = (name: string, pts: number[][], closed: boolean) => {
    const p = new G.GPath(closed);
    for (const [x, y] of pts) {
      const ap = new G.GPathBase.AnchorPoint();
      ap.setProperties(["x", "y"], [x, y]);
      p.getAnchorPoints().appendChild(ap);
    }
    return named(p, name);
  };
  const text = (name: string, content: string, x: number, y: number) => {
    const t = new G.GText();
    t.setText(content, true, true);
    t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
    return named(t, name);
  };
  const insert = (nodes: Loose[]) => ed().insertElements(nodes);
  const select = (nodes: Loose[]) => ed().updateSelection(false, nodes);
  const byName = (name: string) => {
    let found: Loose = null;
    scene().acceptChildren(function visit(n: Loose): unknown {
      if (found) return false;
      if (n.getProperty && n.getProperty("name") === name) {
        found = n;
        return false;
      }
      if (n.acceptChildren) n.acceptChildren(visit);
    });
    return found;
  };
  const pngDataUrl = (w2: number, h2: number) => {
    const c = document.createElement("canvas");
    c.width = w2;
    c.height = h2;
    const x = c.getContext("2d") as CanvasRenderingContext2D;
    x.fillStyle = "#ff0000";
    x.fillRect(0, 0, w2, h2);
    x.fillStyle = "#0000ff";
    x.fillRect(w2 / 4, h2 / 4, w2 / 2, h2 / 2);
    return c.toDataURL("image/png");
  };
  const image = async (name: string, x: number, y: number) => {
    const img = new G.GImage();
    img.setProperties(["url", "trf"], [pngDataUrl(40, 20), new G.GTransform(1, 0, 0, 1, x, y)]);
    named(img, name);
    insert([img]);
    await waitFor(() => !img.getStatus() && img.getProperty("iw") > 0);
    return img;
  };
  const waitTexts = async () => {
    await waitFor(() => {
      let pending = false;
      scene().acceptChildren(function v(n: Loose) {
        if (n instanceof G.GText && n.hasFontsToResolve && n.hasFontsToResolve()) pending = true;
        if (n.acceptChildren) n.acceptChildren(v);
      });
      return !pending;
    }, 15000);
  };
  const fixedPage = (w2: number, h2: number) => {
    page().setProperties(["w", "h"], [w2, h2]);
  };

  // ------------------------------------------------------------------ setups
  // Runs another setup by name (setups build on each other).
  const runSetup = (name: string) => (setups[name] as () => Promise<void> | void)();
  const setups: Record<string, () => Promise<void> | void> = {
    empty: () => {},
    rect: () => {
      insert([rect("A", 100, 100, 100, 60)]);
    },
    "rect-nosel": () => {
      insert([rect("A", 100, 100, 100, 60)]);
      ed().clearSelection();
    },
    "rect-border": () => {
      const r = rect("A", 100, 100, 100, 60);
      insert([r]);
      border(r, [0, 0, 255], 4);
    },
    rects2: () => {
      const a1 = rect("A", 100, 100, 100, 60);
      const b1 = rect("B", 300, 150, 60, 120);
      insert([a1, b1]);
      select([a1, b1]);
    },
    rects3: () => {
      const a1 = rect("A", 100, 100, 100, 60);
      const b1 = rect("B", 260, 140, 40, 120);
      const c1 = rect("C", 500, 60, 80, 30);
      insert([a1, b1, c1]);
      select([a1, b1, c1]);
    },
    "rects3-one": () => {
      const a1 = rect("A", 100, 100, 100, 60);
      const b1 = rect("B", 260, 140, 40, 120);
      const c1 = rect("C", 500, 60, 80, 30);
      insert([a1, b1, c1]);
      select([b1]);
    },
    stack: () => {
      // Four overlapping shapes, the second from the bottom selected.
      const n = [
        rect("A", 100, 100, 100, 100),
        rect("B", 120, 120, 100, 100),
        rect("C", 140, 140, 100, 100),
        rect("D", 160, 160, 100, 100),
      ];
      insert(n);
      select([n[1]]);
    },
    overlap: () => {
      const r = rect("R", 100, 100, 120, 80);
      const e = ellipse("E", 160, 130, 100, 100);
      insert([r, e]);
      select([r, e]);
    },
    "overlap-gradient": () => {
      const r = rect("R", 100, 100, 120, 80);
      const e = ellipse("E", 160, 130, 100, 100);
      insert([r, e]);
      clearLayers(e);
      const f = new G.GStylable.FillPaintLayer();
      const grad = new G.GLinearGradient([
        { position: 0, color: new G.GRGBColor([0, 0, 0]) },
        { position: 1, color: new G.GRGBColor([255, 255, 255]) },
      ]);
      f.setProperty("_pt", grad);
      e.getPaintLayers().appendChild(f);
      select([r, e]);
    },
    group: () => {
      const a1 = rect("A", 100, 100, 60, 60);
      const b1 = rect("B", 200, 120, 60, 60);
      insert([a1, b1]);
      select([a1, b1]);
      app.execute("modify.group");
    },
    compound: () => {
      runSetup("overlap");
      app.execute("modify.merge.union");
    },
    compounds2: () => {
      const r1 = rect("R1", 100, 100, 80, 80);
      const e1 = ellipse("E1", 140, 120, 80, 80);
      insert([r1, e1]);
      select([r1, e1]);
      app.execute("modify.merge.union");
      const c1 = ed().getSelection()[0];
      const r2 = rect("R2", 300, 100, 80, 80);
      const e2 = ellipse("E2", 340, 120, 80, 80);
      insert([r2, e2]);
      select([r2, e2]);
      app.execute("modify.merge.subtract");
      const c2 = ed().getSelection()[0];
      select([c1, c2]);
    },
    "path-open": () => {
      insert([
        path(
          "P",
          [
            [100, 100],
            [200, 120],
            [260, 60],
          ],
          false,
        ),
      ]);
    },
    paths2: () => {
      const p1 = path(
        "P1",
        [
          [100, 100],
          [200, 100],
        ],
        false,
      );
      const p2 = path(
        "P2",
        [
          [200, 160],
          [100, 160],
        ],
        false,
      );
      insert([p1, p2]);
      select([p1, p2]);
    },
    "path-closed": () => {
      insert([
        path(
          "P",
          [
            [100, 100],
            [220, 100],
            [220, 180],
            [100, 180],
          ],
          true,
        ),
      ]);
    },
    "path-closed-ccw": () => {
      // Same square as path-closed, points in the other direction.
      insert([
        path(
          "P",
          [
            [100, 100],
            [100, 180],
            [220, 180],
            [220, 100],
          ],
          true,
        ),
      ]);
    },
    "path-anchor": () => {
      const p = path(
        "P",
        [
          [100, 100],
          [200, 140],
          [300, 100],
          [400, 160],
        ],
        false,
      );
      insert([p]);
      // Anchor points are selected with the Subselect tool; the pointer
      // tool's transform box ignores part selections.
      app.activateTool("GSubSelectTool");
      select([p]);
      E.selectAnchorPoints(p, [1]);
    },
    "path-many": () => {
      // A jittery open path with many points for simplify: a slow wave
      // (amplitude 30) with +-3 noise on every point.
      const pts: number[][] = [];
      for (let i = 0; i <= 40; i++) {
        pts.push([100 + i * 10, 200 + Math.round(Math.sin(i / 8) * 30) + (i % 2 ? 3 : -3)]);
      }
      const p = path("Wave", pts, false);
      insert([p]);
      border(p, [0, 0, 0], 2);
    },
    compoundpath: () => {
      // Join Paths turns two shapes into one compound path.
      runSetup("rects2");
      app.execute("modify.join-paths");
    },
    text: async () => {
      insert([text("T", "Hello", 100, 100)]);
      await waitTexts();
    },
    texts: async () => {
      const t1 = text("T1", "One", 100, 100);
      const t2 = text("T2", "Two", 100, 200);
      insert([t1, t2, rect("R", 300, 100, 50, 50)]);
      await waitTexts();
      select([t1]);
    },
    "text-path": async () => {
      const t = text("T", "Along", 100, 300);
      const p = path(
        "P",
        [
          [100, 100],
          [300, 60],
          [500, 100],
        ],
        false,
      );
      insert([t, p]);
      await waitTexts();
      select([t, p]);
    },
    "text-on-path": async () => {
      await runSetup("text-path");
      app.execute("modify.attachToPath");
      await waitTexts();
      select([byName("T")]);
    },
    image: async () => {
      await image("I", 100, 100);
    },
    "image-crop": async () => {
      const img = await image("I", 100, 100);
      select([img]);
      ed().setSelectionDetail(true);
      // Entering crop mode is what a double click on the image does.
      E.setImageCropMode(img, true);
    },
    symbol: () => {
      const a1 = rect("A", 100, 100, 80, 50);
      insert([a1]);
      select([a1]);
    },
    "symbol-master": () => {
      const a1 = rect("A", 100, 100, 80, 50);
      insert([a1]);
      const m = G.GSymbol.create([a1], page(), "Master");
      select([m]);
    },
    "symbol-instance": () => {
      runSetup("symbol-master");
      app.execute("edit.duplicate");
    },
    "symbol-instance-changed": () => {
      runSetup("symbol-instance");
      const inst = ed().getSelection()[0];
      // An overridden property on the instance's child puts it out of sync.
      inst.getFirstChild().setProperty("_stop", 0.3);
      select([inst]);
    },
    styled: () => {
      // Shapes that share some style properties with "A" and differ in others.
      const a1 = rect("A", 100, 100, 60, 60);
      const b1 = rect("B", 200, 100, 60, 60);
      const c1 = ellipse("C", 300, 100, 60, 60);
      const d1 = rect("D", 400, 100, 60, 60);
      const e1 = ellipse("E", 500, 100, 60, 60);
      insert([a1, b1, c1, d1, e1]);
      for (const n of [a1, b1, c1, d1, e1]) clearLayers(n);
      fill(a1, [255, 0, 0]);
      border(a1, [0, 0, 255], 3);
      fill(b1, [255, 0, 0]);
      border(b1, [0, 0, 0], 3);
      fill(c1, [0, 255, 0]);
      border(c1, [0, 0, 255], 3);
      fill(d1, [255, 0, 0]);
      border(d1, [0, 0, 255], 1);
      fill(e1, [0, 255, 0]);
      border(e1, [0, 255, 0], 5);
      a1.setProperty("_stop", 0.5);
      c1.setProperty("_stop", 0.5);
      a1.setProperty("_sbl", "multiply");
      e1.setProperty("_sbl", "multiply");
      select([a1]);
    },
    "styled-effect": () => {
      runSetup("styled");
      const a1 = byName("A");
      const c1 = byName("C");
      for (const n of [a1, c1]) {
        const fx = new G.GDropShadowEffect();
        n.getEffects().appendChild(fx);
      }
      select([a1]);
    },
    pages3: () => {
      fixedPage(400, 300);
      page().setProperty("name", "P1");
      insert([rect("A", 50, 50, 100, 60)]);
      const p2 = scene().insertPage();
      p2.setProperty("name", "P2");
      const p3 = scene().insertPage();
      p3.setProperty("name", "P3");
      scene().setActivePage(
        scene()
          .getChildren()
          .filter((n: Loose) => n instanceof G.GPage)[0],
      );
      select([byName("A")]);
    },
    "fixed-page": () => {
      fixedPage(800, 600);
      insert([rect("A", 50, 50, 100, 60), rect("B", 400, 300, 50, 50)]);
      select([byName("A")]);
    },
    layers2: () => {
      const l = new G.GLayer();
      l.setProperty("name", "Layer X");
      page().appendChild(l);
      scene().setActiveLayer(l);
      insert([rect("A", 100, 100, 50, 50), rect("B", 400, 300, 80, 40)]);
      select([byName("A")]);
    },
    grid: () => {
      insert([rect("A", 103.3, 101.7, 50.4, 30.6)]);
    },
    "layers-tree": () => {
      // Group "G" (A, B) and a rectangle C next to it, nothing selected.
      const a1 = rect("A", 100, 100, 60, 60);
      const b1 = rect("B", 200, 100, 60, 60);
      const c1 = rect("C", 300, 100, 60, 60);
      insert([a1, b1, c1]);
      select([a1, b1]);
      app.execute("modify.group");
      ed().getSelection()[0].setProperty("name", "G");
      ed().clearSelection();
    },
    eyedrop: () => {
      // A grey rectangle selected and a red one to pick the colour from.
      const a1 = rect("A", 100, 100, 60, 60);
      const b1 = rect("B", 250, 100, 60, 60);
      insert([a1, b1]);
      clearLayers(b1);
      fill(b1, [255, 0, 0]);
      border(b1, [0, 0, 255], 6);
      select([a1]);
    },
    "two-windows": () => {
      insert([rect("A", 100, 100, 50, 50)]);
      app.execute("view.clone");
    },
    scattered: () => {
      // Content spread out so zoom actions centre on something.
      insert([rect("A", -400, -300, 100, 100), rect("B", 900, 700, 200, 100)]);
      select([byName("B")]);
    },
  };

  // --------------------------------------------------------------- recording
  const nodeLabel = (n: Loose) => {
    const name =
      n.getProperty && n.hasProperty && n.hasProperty("name") ? n.getProperty("name") : null;
    return name ? `${n.getNodeName()}:${name}` : String(n.getNodeName());
  };
  const selection = () => (ed().getSelection() || []).map(nodeLabel);
  // The harness normalizer (normalize.ts) renames @id, #, &, _effId, _layId
  // and __ids, but misses ids inside JSON strings held in arrays (compound
  // path "paths") and the old app's other random 32-character ids: the
  // third element of each anchor point in "pts", "sbl" entries, the keys of
  // "_links", dictionary entry "uuid"s and the "dictionary://<uuid>" image
  // URLs that refer to them. They are renamed here to rid1, rid2, ... in
  // order of first appearance in the whole record, so before/after/undo
  // stay comparable.
  const stabilize = (value: unknown): unknown => {
    const ids = new Map<string, string>();
    const RID = /^[A-Za-z0-9]{32}$/;
    // Keys whose values are random ids (as in normalize.ts).
    const ID_KEYS = new Set(["@id", "#", "&", "_effId", "_layId"]);
    const DICT = /^dictionary:\/\/([A-Za-z0-9]{32})$/;
    const add = (v: string) => {
      if (!ids.has(v)) ids.set(v, `rid${ids.size + 1}`);
    };
    const nested = (v: string): unknown => {
      const first = v.charAt(0);
      if ((first !== "{" && first !== "[") || v.length < 2) return undefined;
      try {
        return JSON.parse(v);
      } catch {
        return undefined;
      }
    };
    // Pass 1: collect ids in depth-first order, inside nested JSON too.
    const collect = (v: unknown, key: string | null): void => {
      if (typeof v === "string") {
        if (RID.test(v) || (key !== null && ID_KEYS.has(key))) add(v);
        const m = DICT.exec(v);
        if (m) add(m[1] as string);
        const n = nested(v);
        if (n !== undefined) collect(n, null);
        return;
      }
      if (Array.isArray(v)) {
        for (const c of v) collect(c, null);
        return;
      }
      if (v && typeof v === "object") {
        for (const [k, c] of Object.entries(v)) {
          if (RID.test(k)) add(k);
          collect(c, k);
        }
      }
    };
    // Pass 2: rename every collected id wherever it appears.
    const rename = (v: unknown): unknown => {
      if (typeof v === "string") {
        const r = ids.get(v);
        if (r) return r;
        const m = DICT.exec(v);
        if (m) return `dictionary://${ids.get(m[1] as string) ?? m[1]}`;
        const n = nested(v);
        if (n !== undefined) return JSON.stringify(rename(n));
        return v;
      }
      if (Array.isArray(v)) return v.map(rename);
      if (v && typeof v === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, c] of Object.entries(v)) out[ids.get(k) ?? k] = rename(c);
        return out;
      }
      return v;
    };
    collect(value, null);
    return rename(value);
  };
  const docJson = () => {
    try {
      return JSON.parse(app.serialize({ save: true }));
    } catch (e) {
      // The old app can fail to serialize (see BUGS: flatten + undo + redo).
      // Keep the message without the random dictionary key.
      return {
        serializeError: String((e as Error).message).replace(
          /dictionary:\/\/\S+/g,
          "dictionary://<key>",
        ),
      };
    }
  };
  const undoNames = () => (ed().getUndoStates() || []).map((s: Loose) => s.name);
  const redoNames = () => (ed().getRedoStates() || []).map((s: Loose) => s.name);
  const viewState = () => {
    const v = app.view();
    const cfg = v.getViewConfiguration();
    const out: Record<string, unknown> = {
      zoom: v.getZoom(),
      scrollX: v.getScrollX(),
      scrollY: v.getScrollY(),
      rulers: v.hasRulers ? !!v.hasRulers() : null,
    };
    for (const k of Object.keys(cfg).sort()) {
      const val = cfg[k];
      if (typeof val === "number" || typeof val === "boolean" || typeof val === "string")
        out[k] = val;
    }
    return out;
  };
  const settingsState = () => {
    const out: Record<string, unknown> = {};
    for (const k of a.settings || []) out[k] = app.setting(k);
    return out;
  };
  const clipState = () => {
    const types = E.clipboardTypes();
    const node = E.clipboardGet("application/gravit+node");
    return { types, node: node ? JSON.parse(node) : null };
  };
  const dialogs = () =>
    Array.from(document.querySelectorAll(".g-dialog-container.visible")).map((d) => ({
      className: (d as HTMLElement).className.replace(/\s*\bvisible\b/, ""),
      message: ((d.querySelector(".message") as HTMLElement | null)?.innerText ?? "").trim(),
      buttons: Array.from(d.querySelectorAll("button")).map((b) =>
        (b as HTMLElement).innerText.trim(),
      ),
    }));
  const closeDialogs = () => {
    for (const d of Array.from(
      document.querySelectorAll(".g-dialog-container.g-system-dialog.visible"),
    )) {
      const buttons = d.querySelectorAll("button");
      const last = buttons[buttons.length - 1] as HTMLElement | undefined;
      if (last) last.click();
    }
  };
  const activeNames = () => {
    const pg = scene().getActivePage();
    const layer = scene().getActiveLayer ? scene().getActiveLayer() : null;
    return {
      page: pg ? pg.getProperty("name") : null,
      layer: layer ? layer.getProperty("name") : null,
    };
  };
  const capture = () => {
    const s: Record<string, unknown> = {
      selection: selection(),
      active: activeNames(),
      dialogs: dialogs(),
      selectionDetail: !!ed().hasSelectionDetail(),
      undo: undoNames(),
      redo: redoNames(),
      doc: docJson(),
    };
    if (a.view) s.view = viewState();
    if (a.settings) s.settings = settingsState();
    if (a.shell) {
      s.windows = E.windows();
      s.documents = E.documents();
      s.sidebars = E.sidebars();
    }
    if (a.clipboard) s.clipboard = clipState();
    if (a.tool) s.tool = app.activeTool();
    return s;
  };
  // Documents compared without the save time (lmd), which changes per call.
  const same = (x: unknown, y: unknown) =>
    JSON.stringify(x, (k, v) => (k === "lmd" ? undefined : v)) ===
    JSON.stringify(y, (k, v) => (k === "lmd" ? undefined : v));
  const strip = (prev: Loose, cur: Loose) => {
    // Keep the document only when it changed; the rest is small.
    const out: Record<string, unknown> = { ...cur };
    if (prev && same(prev.doc, cur.doc)) out.doc = "unchanged";
    return out;
  };

  const phase = a.phase || "all";
  if (phase === "all" || phase === "setup") {
    // Start from one document, the pointer tool, no open dialog and the
    // clipboard empty, whatever the previous scenario on this page did.
    E.closeOtherDocuments();
    closeDialogs();
    app.activateTool("GPointerTool");
    if (!a.options || a.options.clearClipboard !== false) E.clipboardClear();
    const setup = setups[a.setup];
    if (!setup) throw new Error(`unknown setup ${a.setup}`);
    await setup();
    if (a.copyFirst === "selection") {
      const nodes = (ed().getSelection() || []).slice();
      E.clipboardSet("application/gravit+node", G.GNode.serialize(nodes));
    }
    if (
      a.copyFirst === "fill-layer" ||
      a.copyFirst === "border-layer" ||
      a.copyFirst === "effect"
    ) {
      // A lone style layer in the clipboard, as copying a row of the
      // fill/border/effect panel puts it there.
      const src = (ed().getSelection() || [])[0];
      const layer =
        a.copyFirst === "effect"
          ? src.getEffects().getFirstChild()
          : src
              .getPaintLayers()
              .getChildren()
              .find((l: Loose) =>
                a.copyFirst === "fill-layer"
                  ? l instanceof G.GStylable.FillPaintLayer
                  : l instanceof G.GStylable.BorderPaintLayer,
              );
      E.clipboardSet("application/gravit+node", G.GNode.serialize([layer]));
    }
    for (const id of a.pre || []) {
      app.execute(id);
      await waitTexts();
    }
    const o = a.options || {};
    if (typeof o.selectByName === "string") select([byName(o.selectByName)]);
    if (o.selectInstanceChild) select([ed().getSelection()[0].getFirstChild()]);
    if (o.selectPage) select([page()]);
    if (o.selectGroupAndChild) {
      const g = ed().getSelection()[0];
      select([g, g.getFirstChild()]);
    }
    if (Array.isArray(o.anchors)) {
      for (const n of ed().getSelection())
        if (n.getAnchorPoints) E.selectAnchorPoints(n, o.anchors);
    }
    if (a.center) app.execute("view.magnification.100");
    const settingsBefore: Record<string, unknown> = {};
    for (const k of a.settings || []) settingsBefore[k] = app.setting(k);
    const before = capture();
    const info = a.id ? E.actionInfo(a.id) : null;
    w.__eaState = { before, info, settingsBefore, sidebars: E.sidebars() };
    if (phase === "setup") return JSON.stringify(stabilize({ before, info }));
  }
  const state = w.__eaState as {
    before: Loose;
    info: Loose;
    settingsBefore: Record<string, unknown>;
    sidebars: unknown;
  };
  const result: Record<string, unknown> = {
    setup: a.setup,
    id: a.id ?? null,
    info: state.info,
    before: state.before,
  };
  if (phase === "all" && a.id && a.run !== false) {
    const opened: string[] = [];
    const origOpen = window.open;
    window.open = ((url?: string | URL) => {
      opened.push(String(url));
      return null;
    }) as typeof window.open;
    try {
      result.returned = (await app.execute(a.id, a.execArgs)) ?? null;
    } finally {
      window.open = origOpen;
    }
    if (a.prompt !== undefined) {
      const find = () =>
        document.querySelector(".g-dialog-container.g-prompt-dialog.visible") as HTMLElement | null;
      await waitFor(() => !!find());
      const dlg = find() as HTMLElement;
      const input = dlg.querySelector("input[type=text]") as HTMLInputElement | null;
      result.promptMessage = (
        (dlg.querySelector(".message") as HTMLElement | null)?.innerText ?? ""
      ).trim();
      result.promptDefault = input ? input.value : null;
      if (a.prompt === null) {
        (dlg.querySelectorAll(".g-dialog-footer button")[0] as HTMLElement).click();
      } else {
        // "" keeps the value the dialog was opened with.
        if (input && a.prompt !== "") input.value = a.prompt;
        (dlg.querySelector(".g-dialog-footer button.primary") as HTMLElement).click();
      }
    }
    if (a.settle) await sleep(a.settle);
    if (opened.length) result.opened = opened;
    await sleep(0);
    await waitTexts();
  }
  const after = capture();
  closeDialogs();
  result.after = strip(state.before, after);
  result.infoAfter = a.id ? E.actionInfo(a.id) : null;
  // Undo/redo when the action added undo states.
  const pushed = (after.undo as string[]).length - (state.before.undo as string[]).length;
  const undoChanged = JSON.stringify(after.undo) !== JSON.stringify(state.before.undo);
  if (a.undo !== false && undoChanged && pushed >= 0) {
    app.execute("edit.undo");
    await waitTexts();
    const u = capture();
    result.afterUndo = {
      ...strip(null, u),
      doc: same(u.doc, state.before.doc) ? "same as before" : u.doc,
    };
    app.execute("edit.redo");
    await waitTexts();
    const r = capture();
    result.afterRedo = {
      ...strip(null, r),
      doc: same(r.doc, after.doc) ? "same as after" : r.doc,
    };
  }
  // Put back toggles and settings so the next scenario on a shared page starts clean.
  if (a.restore !== false && a.id) {
    const info = E.actionInfo(a.id);
    if (state.info && info && state.info.checkable && info.checked !== state.info.checked) {
      app.execute(a.id);
      result.restoredChecked = E.actionInfo(a.id).checked;
    }
    E.setSidebars(state.sidebars);
    for (const [k, v] of Object.entries(state.settingsBefore)) {
      if (JSON.stringify(app.setting(k)) !== JSON.stringify(v)) app.setSetting(k, v);
    }
  }
  return JSON.stringify(stabilize(result));
}

/** Runs `probe` in the page from Node (driver scenarios). */
export async function runProbe(page: Page, args: ProbeArgs): Promise<string> {
  const source = probe.toString();
  return page.evaluate(
    async ({ src, a }) => {
      const fn = (0, eval)(`(${src})`) as (p: unknown, x: unknown) => Promise<string>;
      return fn((window as unknown as { __parity: unknown }).__parity, a);
    },
    { src: source, a: args },
  );
}

/** Client (viewport) coordinates of a scene point in the active view. */
export async function sceneToClient(
  page: Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ x: sx, y: sy }) => {
      const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
      const v = P.app.view();
      const pt = v.getWorldTransform().mapPoint(new P.G.GPoint(sx, sy));
      const el = v.getHtmlElement();
      const r = (el.jquery ? el[0] : el).getBoundingClientRect();
      return { x: r.left + pt.getX(), y: r.top + pt.getY() };
    },
    { x, y },
  );
}
