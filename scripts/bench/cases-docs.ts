// The large-document cases: tens of thousands of objects (flat, in
// groups, as symbol instances), many pages in multi-page view, a page of
// effects and fills, and their exports. The documents are generated (see
// synthetic-docs.ts), saved once with the app's own save and kept in the
// inputs folder; the cases open them through File > Open.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  bootWithDocument,
  canvasCenter,
  closeActive,
  countNodes,
  frameStats,
  idle,
  openThroughUi,
  resetView,
  startFrames,
  stopFrames,
  TMP,
  withMetrics,
  type AppWindow,
  type Case,
  type Env,
  type Numbers,
  type Session,
} from "./drive.ts";
import { quantile, sleep, type Page } from "./lib.ts";
import {
  buildLarge,
  buildPages,
  EFFECTS,
  effectsNodes,
  insertSerialized,
  largeSpec,
  PAGES,
  type LargeSpec,
  type PagesSpec,
} from "./synthetic-docs.ts";
import { dataUrl, texturePngs } from "./synthetic-files.ts";

/** Waits in the large cases (open, paint, export): long, so slow steps give a number, not an error. */
const LONG = 600_000;

// ---------------------------------------------------------------------------
// Generated documents

/**
 * The .gvdesign of `build(spec)`, made in a page of its own and saved
 * with File > Save As (corpus.saveDocumentBytes), once: the file name
 * carries a hash of the builder and the spec, so a change to either makes
 * a new file.
 */
async function savedDocument<S>(
  env: Env,
  name: string,
  build: (spec: S) => unknown,
  spec: S,
): Promise<string> {
  const hash = createHash("sha1")
    .update(build.toString() + JSON.stringify(spec))
    .digest("hex")
    .slice(0, 10);
  const file = path.join(TMP, `${name}-${hash}.gvdesign`);
  if (fs.existsSync(file)) return file;
  const s = await bootWithDocument(env);
  try {
    // The builder goes to the page as source text; its argument as JSON.
    const info = await s.page.evaluate(build as (spec: unknown) => unknown, spec as unknown);
    const base64 = await s.page.evaluate(
      (timeout) =>
        (window as unknown as AppWindow).__parity.app.corpus.saveDocumentBytes(
          timeout,
        ) as Promise<string>,
      LONG,
    );
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(`${file}.tmp`, Buffer.from(base64, "base64"));
    fs.renameSync(`${file}.tmp`, file);
    fs.writeFileSync(file.replace(/\.gvdesign$/, ".json"), JSON.stringify(info));
  } finally {
    await s.context.close().catch(() => undefined);
  }
  return file;
}

/** What the builder reported for a saved document (nodes, top-level objects, ...). */
function builtInfo(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file.replace(/\.gvdesign$/, ".json"), "utf8"));
  } catch {
    return null;
  }
}

/** A session with `file` opened through the UI, the pointer tool active and the view fitted. */
async function openedSession(env: Env, file: string): Promise<Session> {
  const s = await bootWithDocument(env);
  try {
    await openThroughUi(s.page, file, LONG);
    await s.page.evaluate(() => {
      const w = window as unknown as AppWindow;
      w.__parity.app.activateTool("GPointerTool");
      w.__parity.app.editor().clearSelection();
    });
    await resetView(s.page, LONG);
    return s;
  } catch (error) {
    await s.context.close().catch(() => undefined);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Operations, each leaving the document and the view as it found them

/**
 * A zoom gesture through the view API, the calls Ctrl + wheel makes:
 * view.beginZoom(), then view.zoomAt(point or view centre) by `factor` per
 * frame, `steps` in and `steps` - 1 out, then view.finishZoom(). Frame
 * times cover the steps; settledMs runs from finishZoom until the
 * full-quality render is painted (and the view quiet for three frames).
 * The gesture ends one step from where it started, and the tile cache is
 * emptied before finishZoom: an earlier run's render at the same zoom
 * would serve it otherwise.
 */
export async function zoomFrames(
  s: Session,
  steps: number,
  factor: number,
  at: { x: number; y: number } | null = null,
): Promise<Numbers> {
  const out = await withMetrics(s.cdp, async () => {
    await startFrames(s.page);
    await s.page.evaluate(
      async ({ steps, factor, at }) => {
        const w = window as unknown as AppWindow;
        const view = w.__parity.app.view();
        const box = view.getViewBox();
        const G = w.__parity.G as { GPoint: new (x: number, y: number) => unknown };
        const centre = at
          ? new G.GPoint(at.x, at.y)
          : new G.GPoint(box.getX() + box.getWidth() / 2, box.getY() + box.getHeight() / 2);
        view.beginZoom();
        for (let i = 0; i < steps * 2 - 1; i++) {
          view.zoomAt(centre, view.getZoom() * (i < steps ? factor : 1 / factor));
          await w.__bench.nextFrame();
        }
      },
      { steps, factor, at },
    );
    const rec = await stopFrames(s.page);
    const settledMs = await finishZoomSettled(s.page);
    return { ...frameStats(rec), settledMs };
  });
  await resetView(s.page, LONG);
  return out;
}

/**
 * view.finishZoom() with the tile cache emptied first; ms until the view
 * has painted everything again and is quiet.
 */
export function finishZoomSettled(page: Page): Promise<number> {
  return page.evaluate(async (timeout) => {
    const w = window as unknown as AppWindow;
    const view = w.__parity.app.view();
    view.cleanCache();
    const start = performance.now();
    view.finishZoom();
    await w.__bench.idle(3, timeout);
    return performance.now() - start;
  }, LONG);
}

/** view.scrollBy(15, 8) once per frame, `frames` frames, half forth and half back. */
async function panFrames(s: Session, frames: number): Promise<Numbers> {
  const out = await withMetrics(s.cdp, async () => {
    await startFrames(s.page);
    await s.page.evaluate(async (frames) => {
      const w = window as unknown as AppWindow;
      const view = w.__parity.app.view();
      for (let i = 0; i < frames; i++) {
        const back = i >= frames / 2;
        view.scrollBy(back ? -15 : 15, back ? -8 : 8);
        await w.__bench.nextFrame();
      }
    }, frames);
    const rec = await stopFrames(s.page);
    const settle = await idle(s.page, LONG);
    return { ...frameStats(rec), settleMs: settle };
  });
  await resetView(s.page, LONG);
  return out;
}

/** `count` mouse wheel scrolls over the canvas centre, one per 16 ms, half down and half up. */
async function wheelPan(s: Session, count: number): Promise<Numbers> {
  const c = await canvasCenter(s.page);
  await s.page.mouse.move(c.x, c.y);
  const out = await withMetrics(s.cdp, async () => {
    await startFrames(s.page);
    for (let i = 0; i < count; i++) {
      await s.page.mouse.wheel(0, i < count / 2 ? 60 : -60);
      await sleep(16);
    }
    const rec = await stopFrames(s.page);
    const settle = await idle(s.page, LONG);
    return { ...frameStats(rec), settleMs: settle };
  });
  await resetView(s.page, LONG);
  return out;
}

/** Runs action `id` in the page; ms until it returned and until the view is painted. */
async function timedAction(page: Page, id: string): Promise<{ actionMs: number; ms: number }> {
  return page.evaluate(
    async ({ id, timeout }) => {
      const w = window as unknown as AppWindow;
      const start = performance.now();
      w.__parity.app.execute(id);
      const actionMs = performance.now() - start;
      await w.__bench.idle(3, timeout);
      return { actionMs, ms: performance.now() - start };
    },
    { id, timeout: LONG },
  );
}

/** Shapes in the selection the move cases move. */
const MOVE_SHAPES = 200;

/**
 * Selects the topmost objects of the page until they hold at least
 * MOVE_SHAPES shapes (200 shapes or instances, or one group of 1,000);
 * returns the number of shapes. Moving everything isn't measurable: each
 * moved object makes the page re-measure all its children, so a nudge of
 * all 20,000 shapes takes far longer than the case's time limit.
 */
async function selectMoveSet(page: Page): Promise<number> {
  const shapes = await page.evaluate((want) => {
    const w = window as unknown as AppWindow;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine through the untyped G namespace
    const G = w.__parity.G as any;
    const app = w.__parity.app;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
    const weight = (n: any): number => {
      if (!(n instanceof G.GGroup)) return 1;
      let sum = 0;
      for (let c = n.getFirstChild(); c; c = c.getNext()) sum += weight(c);
      return sum;
    };
    const nodes = [];
    let count = 0;
    for (
      let n = app.scene().getActivePage().getLastChild();
      n && count < want;
      n = n.getPrevious()
    ) {
      if (!(n instanceof G.GElement)) continue;
      nodes.push(n);
      count += weight(n);
    }
    app.editor().updateSelection(false, nodes);
    return count;
  }, MOVE_SHAPES);
  await idle(page, LONG);
  return shapes;
}

/** Clears the selection; ms until the call returned and until the view is painted. */
async function clearSelection(page: Page): Promise<{ clearMs: number; clearPaintedMs: number }> {
  return page.evaluate(async (timeout) => {
    const w = window as unknown as AppWindow;
    const start = performance.now();
    w.__parity.app.editor().clearSelection();
    const clearMs = performance.now() - start;
    await w.__bench.idle(3, timeout);
    return { clearMs, clearPaintedMs: performance.now() - start };
  }, LONG);
}

/** The left edge of the first selected object (to see a move and its undo). */
const selectionX = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const sel = (window as unknown as AppWindow).__parity.app.selection();
    return sel.length ? (sel[0].getGeometryBBox().getX() as number) : NaN;
  });

/** Undoes until the first selected object is back at `x` (at most `max` steps). */
async function undoTo(page: Page, x: number, max = 12): Promise<number> {
  let steps = 0;
  while (steps < max && Math.abs((await selectionX(page)) - x) > 1e-6) {
    await page.evaluate(() => (window as unknown as AppWindow).__parity.app.execute("edit.undo"));
    await idle(page, LONG);
    steps++;
  }
  return steps;
}

/** Installs a keydown recorder: window.__benchKey is the time of the last keydown. */
async function recordKeys(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __benchKeys?: boolean; __benchKey: number };
    if (w.__benchKeys) return;
    w.__benchKeys = true;
    window.addEventListener(
      "keydown",
      (e) => {
        w.__benchKey = e.timeStamp;
      },
      true,
    );
  });
}

/** One arrow-key nudge of the selection; ms from keydown until painted, and the press round trip. */
async function nudge(page: Page, key = "ArrowRight"): Promise<{ ms: number; pressMs: number }> {
  const t = performance.now();
  await page.keyboard.press(key);
  const pressMs = performance.now() - t;
  const ms = await page.evaluate(async (timeout) => {
    const w = window as unknown as AppWindow & { __benchKey: number };
    await w.__bench.idle(3, timeout);
    return performance.now() - w.__benchKey;
  }, LONG);
  return { ms, pressMs };
}

const NUDGES = 2;

async function nudgeRun(s: Session): Promise<Numbers> {
  await recordKeys(s.page);
  const selected = await selectMoveSet(s.page);
  const x0 = await selectionX(s.page);
  const times: number[] = [];
  const presses: number[] = [];
  const out = await withMetrics(s.cdp, async () => {
    for (let i = 0; i < NUDGES; i++) {
      const r = await nudge(s.page);
      times.push(r.ms);
      presses.push(r.pressMs);
    }
    return {
      nudgeMedian: quantile(times, 0.5),
      nudgeMax: Math.max(...times),
      pressMedian: quantile(presses, 0.5),
    };
  });
  const movedPx = (await selectionX(s.page)) - x0;
  const undos = await undoTo(s.page, x0);
  await clearSelection(s.page);
  return { ...out, selected, movedPx, undos };
}

/** The screen position of a rectangle or ellipse near the top of the page (inside the selection). */
async function shapeOnScreen(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const w = window as unknown as AppWindow;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine through the untyped G namespace
    const G = w.__parity.G as any;
    const app = w.__parity.app;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
    const find = (n: any): any => {
      for (let c = n.getLastChild(); c; c = c.getPrevious()) {
        if (c instanceof G.GRectangle || c instanceof G.GEllipse) return c;
        if (c instanceof G.GGroup || c instanceof G.GSymbol) {
          const inner = find(c);
          if (inner) return inner;
        }
      }
      return null;
    };
    const shape = find(app.scene().getActivePage());
    if (!shape) throw new Error("no rectangle or ellipse on the page");
    const box = shape.getGeometryBBox();
    const m = app.view().getWorldTransform().getMatrix() as number[];
    const cx = box.getX() + box.getWidth() / 2;
    const cy = box.getY() + box.getHeight() / 2;
    const r = (document.querySelector(".g-editor-widget") as HTMLElement).getBoundingClientRect();
    return {
      x: r.left + (m[0] as number) * cx + (m[2] as number) * cy + (m[4] as number),
      y: r.top + (m[1] as number) * cx + (m[3] as number) * cy + (m[5] as number),
    };
  });
}

const DRAG_MOVES = 10;

/** Selects the topmost objects and drags them with the pointer tool by 10 moves of 5 x 3 px. */
async function dragRun(s: Session): Promise<Numbers> {
  const selected = await selectMoveSet(s.page);
  const x0 = await selectionX(s.page);
  const start = await shapeOnScreen(s.page);
  await s.page.mouse.move(start.x, start.y);
  await sleep(400); // past the double-click guard
  const out = await withMetrics(s.cdp, async () => {
    await startFrames(s.page);
    let t = performance.now();
    await s.page.mouse.down();
    const downMs = performance.now() - t;
    const moves: number[] = [];
    for (let i = 1; i <= DRAG_MOVES; i++) {
      t = performance.now();
      await s.page.mouse.move(start.x + i * 5, start.y + i * 3);
      moves.push(performance.now() - t);
      await sleep(16);
    }
    t = performance.now();
    await s.page.mouse.up();
    const upMs = performance.now() - t;
    const settle = await idle(s.page, LONG);
    const rec = await stopFrames(s.page);
    return {
      ...frameStats(rec),
      settleMs: settle,
      downMs,
      moveMedian: quantile(moves, 0.5),
      moveMax: Math.max(...moves),
      upMs,
      upToPaintedMs: performance.now() - t,
    };
  });
  const movedPx = (await selectionX(s.page)) - x0;
  const undos = await undoTo(s.page, x0);
  await clearSelection(s.page);
  return { ...out, selected, movedPx, undos };
}

/** Selects the topmost objects, nudges them once and times the undo (and, for "redo", the redo after it). */
async function undoRedoRun(s: Session, which: "undo" | "redo"): Promise<Numbers> {
  await recordKeys(s.page);
  const selected = await selectMoveSet(s.page);
  const x0 = await selectionX(s.page);
  await nudge(s.page);
  let out: Numbers;
  if (which === "undo") {
    out = await withMetrics(s.cdp, async () => ({ ...(await timedAction(s.page, "edit.undo")) }));
  } else {
    await timedAction(s.page, "edit.undo");
    out = await withMetrics(s.cdp, async () => ({ ...(await timedAction(s.page, "edit.redo")) }));
  }
  const undos = await undoTo(s.page, x0);
  await clearSelection(s.page);
  return { ...out, selected, undos };
}

/** Scrolls the layers list from top to bottom with 60 wheel events, one per 16 ms. */
async function layersScrollRun(s: Session): Promise<Numbers> {
  const panel = s.page.locator(".g-layer-panel").first();
  if (!(await panel.isVisible())) {
    await s.page.evaluate(() =>
      (window as unknown as AppWindow).__parity.app.execute("view.toggle-sidebar.outline"),
    );
    await idle(s.page, LONG);
  }
  const box = await panel.boundingBox();
  if (!box) throw new Error("no layers panel");
  await s.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const range = await panel.evaluate((el) => el.scrollHeight - el.clientHeight);
  const rowHeight = await panel.evaluate(
    (el) => (el.querySelector(".vrow") as HTMLElement | null)?.offsetHeight ?? 0,
  );
  const steps = 60;
  const delta = Math.max(1, Math.ceil(range / steps));
  const out = await withMetrics(s.cdp, async () => {
    await startFrames(s.page);
    for (let i = 0; i < steps; i++) {
      await s.page.mouse.wheel(0, delta);
      await sleep(16);
    }
    const settle = await idle(s.page, LONG);
    const rec = await stopFrames(s.page);
    return { ...frameStats(rec), settleMs: settle };
  });
  const scrolled = await panel.evaluate((el) => el.scrollTop);
  await panel.evaluate((el) => {
    el.scrollTop = 0;
  });
  await idle(s.page, LONG);
  return {
    ...out,
    rangePx: range,
    scrolledPx: scrolled,
    rows: rowHeight ? Math.round((range + box.height) / rowHeight) : NaN,
  };
}

async function exportRun(s: Session, format: "svg" | "pdf" | "png"): Promise<Numbers> {
  return withMetrics(s.cdp, () =>
    s.page.evaluate(
      async ({ fmt, timeout }) => {
        const w = window as unknown as AppWindow;
        const io = w.__parity.app.importExport;
        const page = w.__parity.app.scene().getActivePage();
        const [exportable] = io.generateExportables(page, { format: fmt, size: "1x" }, false);
        const start = performance.now();
        const blob = (await io.exportExportable(exportable, timeout)) as Blob | null;
        return { ms: performance.now() - start, outKB: blob ? blob.size / 1024 : 0 };
      },
      { fmt: format, timeout: LONG },
    ),
  );
}

function exportCases(
  prefix: string,
  sessionKey: string,
  setup: Case["setup"],
  runs?: number,
): Case[] {
  return (["svg", "pdf", "png"] as const).map((format) => ({
    id: `export-${prefix}-${format}`,
    what: `the ${prefix} page through Exporter.exportExportable as ${format.toUpperCase()}${format === "png" ? " at 1x" : ""}`,
    headline: "ms",
    group: "import-export",
    sessionKey,
    ...(runs ? { runs } : {}),
    setup,
    run: (s: Session) => exportRun(s, format),
  }));
}

// ---------------------------------------------------------------------------
// The large documents

type Op =
  | "open"
  | "zoom-api"
  | "pan-api"
  | "pan-wheel"
  | "select-all"
  | "nudge"
  | "drag"
  | "undo"
  | "redo"
  | "layers-scroll";

const ALL_OPS: Op[] = [
  "open",
  "zoom-api",
  "pan-api",
  "pan-wheel",
  "select-all",
  "nudge",
  "drag",
  "undo",
  "redo",
  "layers-scroll",
];

interface DocDef {
  key: string;
  spec: LargeSpec;
  ops: Op[];
  /** Run limit for every case of the document. */
  runs?: number;
  /** Run limit for the cases that move everything (nudge, drag, undo, redo). */
  moveRuns: number;
  what: string;
}

const MOVES: Op[] = ["nudge", "drag", "undo", "redo"];

const DOCS: DocDef[] = [
  {
    key: "doc20k-flat",
    spec: largeSpec(20_000, "flat"),
    moveRuns: 3,
    ops: ALL_OPS,
    what: "20,000 shapes on one page",
  },
  {
    key: "doc50k-flat",
    spec: largeSpec(50_000, "flat"),
    moveRuns: 1,
    ops: ALL_OPS,
    runs: 3,
    what: "50,000 shapes on one page",
  },
  {
    key: "doc20k-nested",
    spec: largeSpec(20_000, "nested"),
    moveRuns: 3,
    // The layers list shows only the 20 collapsed top groups.
    ops: ALL_OPS.filter((op) => op !== "layers-scroll"),
    what: "20,000 shapes in groups of groups (20 x 10 x 10 x 10)",
  },
  {
    key: "doc20k-symbols",
    spec: largeSpec(20_000, "symbols"),
    moveRuns: 3,
    ops: ALL_OPS,
    what: "20,000 objects on one page: 5 symbol masters, 1,999 instances of them and 17,996 shapes",
  },
  {
    key: "doc50k-nested",
    spec: largeSpec(50_000, "nested"),
    moveRuns: 1,
    ops: ["open", "select-all"],
    runs: 3,
    what: "50,000 shapes in groups of groups (50 x 10 x 10 x 10)",
  },
];

const OP_WHAT: Record<Op, string> = {
  open: "File > Open of the saved document until painted",
  "zoom-api": "a zoom gesture: view.zoomAt(centre) by 1.1 per frame, 10 in and 9 out",
  "pan-api": "view.scrollBy(15, 8) once per frame for 60 frames",
  "pan-wheel": "60 wheel scrolls over the canvas, one per 16 ms",
  "select-all": "Edit > Select All until painted",
  nudge: `select the topmost ${MOVE_SHAPES} shapes, then ${NUDGES} arrow-key nudges; nudgeMedian is keydown until painted`,
  drag: `select the topmost ${MOVE_SHAPES} shapes and drag them with the pointer tool, ${DRAG_MOVES} moves; moveMedian is the time the page takes to handle one move`,
  undo: `select the topmost ${MOVE_SHAPES} shapes, nudge once, then Edit > Undo until painted`,
  redo: `select the topmost ${MOVE_SHAPES} shapes, nudge once, undo, then Edit > Redo until painted`,
  "layers-scroll": "the layers list scrolled from top to bottom with 60 wheel events; frame times",
};

const OP_HEADLINE: Record<Op, string> = {
  open: "painted",
  "zoom-api": "frameP95",
  "pan-api": "frameP95",
  "pan-wheel": "frameP95",
  "select-all": "ms",
  nudge: "nudgeMedian",
  drag: "moveMedian",
  undo: "ms",
  redo: "ms",
  "layers-scroll": "frameP95",
};

function docCase(d: DocDef, op: Op): Case {
  const group = d.key.startsWith("doc50k") ? "doc50k" : "doc20k";
  const file = (env: Env): Promise<string> => savedDocument(env, d.key, buildLarge, d.spec);
  const base = {
    id: `${d.key}-${op}`,
    what: `${d.what}: ${OP_WHAT[op]}`,
    headline: OP_HEADLINE[op],
    group,
    ...(MOVES.includes(op)
      ? // One move of everything takes seconds to minutes; the session's
        // earlier cases have warmed the page up.
        { runs: d.moveRuns, noWarmup: true }
      : d.runs
        ? { runs: d.runs }
        : {}),
  };
  if (op === "open") {
    let opened = "";
    return {
      ...base,
      async setup(env) {
        opened = await file(env);
        return bootWithDocument(env);
      },
      async run(s) {
        const out = await withMetrics(s.cdp, async () => ({
          ...(await openThroughUi(s.page, opened, LONG)),
        }));
        const nodes = await countNodes(s.page);
        await closeActive(s.page, LONG);
        return { ...out, nodes, fileKB: fs.statSync(opened).size / 1024 };
      },
      async info() {
        return builtInfo(opened);
      },
    };
  }
  return {
    ...base,
    sessionKey: d.key,
    async setup(env) {
      return openedSession(env, await file(env));
    },
    run(s) {
      switch (op) {
        case "zoom-api":
          return zoomFrames(s, 10, 1.1);
        case "pan-api":
          return panFrames(s, 60);
        case "pan-wheel":
          return wheelPan(s, 60);
        case "select-all":
          return (async () => {
            const out = await withMetrics(s.cdp, async () => ({
              ...(await timedAction(s.page, "edit.select-all")),
            }));
            const selected = await s.page.evaluate(
              () => (window as unknown as AppWindow).__parity.app.selection().length,
            );
            // Untimed in the headline: clearing a large selection.
            const clear = await clearSelection(s.page);
            return { ...out, selected, ...clear };
          })();
        case "nudge":
          return nudgeRun(s);
        case "drag":
          return dragRun(s);
        case "undo":
        case "redo":
          return undoRedoRun(s, op);
        default:
          return layersScrollRun(s);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Many pages

function pagesCases(spec: PagesSpec): Case[] {
  const file = (env: Env): Promise<string> => savedDocument(env, "pages", buildPages, spec);
  const what = `${spec.pages} pages of ${spec.page.w} x ${spec.page.h} with ${spec.shapesPerPage} shapes each`;
  let opened = "";
  const shared = {
    group: "fx-pages",
    sessionKey: "pages",
    async setup(env: Env): Promise<Session> {
      return openedSession(env, await file(env));
    },
  };
  const multiPage = (page: Page): Promise<boolean> =>
    page.evaluate(
      () =>
        !!(window as unknown as AppWindow).__parity.app.view().getViewConfiguration().multiPageView,
    );
  /** Multi-page view on or off (View > Multi-Page Mode, F6), until painted; ms. */
  const setMultiPage = async (page: Page, on: boolean): Promise<number> => {
    if ((await multiPage(page)) === on) return 0;
    const { ms } = await timedAction(page, "view.toggle-multi-page-mode");
    if ((await multiPage(page)) !== on) throw new Error("multi-page view did not switch");
    return ms;
  };
  return [
    {
      id: "pages-open",
      what: `${what}: File > Open until painted`,
      headline: "painted",
      group: "fx-pages",
      async setup(env) {
        opened = await file(env);
        return bootWithDocument(env);
      },
      async run(s) {
        const out = await withMetrics(s.cdp, async () => ({
          ...(await openThroughUi(s.page, opened, LONG)),
        }));
        const nodes = await countNodes(s.page);
        await closeActive(s.page, LONG);
        return { ...out, nodes };
      },
    },
    {
      ...shared,
      id: "pages-multipage",
      what: `${what}: switch to multi-page view until painted`,
      headline: "ms",
      async run(s) {
        await setMultiPage(s.page, false);
        const out = await withMetrics(s.cdp, async () => ({
          ms: await setMultiPage(s.page, true),
        }));
        await setMultiPage(s.page, false);
        await resetView(s.page, LONG);
        return out;
      },
    },
    {
      ...shared,
      id: "pages-zoom-api",
      what: `${what}, multi-page view: a zoom gesture: view.zoomAt(centre) by 1.1 per frame, 10 in and 9 out`,
      headline: "frameP95",
      async run(s) {
        await setMultiPage(s.page, true);
        const out = await zoomFrames(s, 10, 1.1);
        await setMultiPage(s.page, false);
        await resetView(s.page, LONG);
        return out;
      },
    },
    {
      ...shared,
      id: "pages-pan-api",
      what: `${what}, multi-page view: view.scrollBy(15, 8) once per frame for 60 frames`,
      headline: "frameP95",
      async run(s) {
        await setMultiPage(s.page, true);
        const out = await panFrames(s, 60);
        await setMultiPage(s.page, false);
        await resetView(s.page, LONG);
        return out;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// The effects page

/**
 * The zoom extremes: 6% is the editor's minimum (ZOOM_LIMITS in
 * src/editor/view/zoom.ts), so 1% can't be reached; 6,400% is well
 * inside its maximum of 25,600%.
 */
const ZOOM_MIN = 0.06;
const ZOOM_MAX = 64;

function effectsCases(): Case[] {
  const spec = EFFECTS;
  const w = spec.cols * spec.tile;
  const h = spec.rows * spec.tile;
  // The centre of a tile near the middle (a texture fill with a border and a shadow).
  const col = Math.floor(spec.cols / 2) - 1;
  const row = Math.floor(spec.rows / 2) - 1;
  const focus = { x: col * spec.tile + spec.tile / 2, y: row * spec.tile + spec.tile / 2 };
  const what = `effects page (${spec.cols * spec.rows} objects on ${w} x ${h}: gradients, textures, several fills and borders, blend modes, shadows, blur, masks)`;
  const setup = async (env: Env): Promise<Session> => {
    const s = await bootWithDocument(env);
    const textures = texturePngs(64).map((b) => dataUrl(b));
    await s.page.evaluate(insertSerialized, { w, h, nodes: effectsNodes(spec, textures) });
    await s.page.evaluate(() =>
      (window as unknown as AppWindow).__parity.app.activateTool("GPointerTool"),
    );
    await resetView(s.page, LONG);
    return s;
  };
  const base = { group: "fx-pages", sessionKey: "fx", setup };

  /** Zooms at `focus` to `zoom` at once; ms until painted. */
  const jump = async (s: Session, zoom: number): Promise<Numbers> => {
    const out = await withMetrics(s.cdp, () =>
      s.page.evaluate(
        async ({ zoom, focus, timeout }) => {
          const w = window as unknown as AppWindow;
          const G = w.__parity.G as { GPoint: new (x: number, y: number) => unknown };
          const view = w.__parity.app.view();
          const start = performance.now();
          view.zoomAt(new G.GPoint(focus.x, focus.y), zoom);
          const zoomMs = performance.now() - start;
          await w.__bench.nextFrame();
          const firstFrame = performance.now() - start;
          await w.__bench.idle(3, timeout);
          return {
            ms: performance.now() - start,
            zoomMs,
            firstFrame,
            zoom: view.getZoom() as number,
          };
        },
        { zoom, focus, timeout: LONG },
      ),
    );
    await resetView(s.page, LONG);
    return out;
  };

  /**
   * A zoom gesture at `focus` (beginZoom, steps, finishZoom) by `factor` per
   * frame until the zoom reaches `limit`; frame times of the steps, ms
   * until painted at full quality.
   */
  const step = async (s: Session, factor: number, limit: number): Promise<Numbers> => {
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      const r = await s.page.evaluate(
        async ({ factor, limit, focus }) => {
          const w = window as unknown as AppWindow;
          const G = w.__parity.G as { GPoint: new (x: number, y: number) => unknown };
          const view = w.__parity.app.view();
          const at = new G.GPoint(focus.x, focus.y);
          const start = performance.now();
          let steps = 0;
          view.beginZoom();
          for (; steps < 200; steps++) {
            const zoom = view.getZoom() as number;
            if (factor > 1 ? zoom >= limit * 0.999 : zoom <= limit * 1.001) break;
            view.zoomAt(
              at,
              factor > 1 ? Math.min(limit, zoom * factor) : Math.max(limit, zoom * factor),
            );
            await w.__bench.nextFrame();
          }
          return {
            steps,
            steppedMs: performance.now() - start,
            zoom: view.getZoom() as number,
          };
        },
        { factor, limit, focus },
      );
      const rec = await stopFrames(s.page);
      const settledMs = await finishZoomSettled(s.page);
      return { ...frameStats(rec), ...r, settledMs, ms: r.steppedMs + settledMs };
    });
    await resetView(s.page, LONG);
    return out;
  };

  return [
    {
      ...base,
      id: "fx-zoom-api",
      what: `${what}: a zoom gesture: view.zoomAt(centre) by 1.05 per frame, 30 in and 29 out`,
      headline: "frameP95",
      run: (s) => zoomFrames(s, 30, 1.05),
    },
    {
      ...base,
      id: "fx-pan-api",
      what: `${what}: view.scrollBy(15, 8) once per frame for 120 frames`,
      headline: "frameP95",
      run: (s) => panFrames(s, 120),
    },
    {
      ...base,
      id: "fx-zoom-min",
      what: `${what}: from fitted, zoom to 6% (the minimum) at once; ms until painted`,
      headline: "ms",
      // A slightly different zoom each run: the effect caches survive
      // View > Fit All, so the same zoom again would only show the cache.
      run: (s, _env, i) => jump(s, ZOOM_MIN * (1.02 + 0.01 * i)),
    },
    {
      ...base,
      id: "fx-zoom-max",
      what: `${what}: from fitted, zoom to 6,400% on one object at once; ms until painted`,
      headline: "ms",
      run: (s, _env, i) => jump(s, ZOOM_MAX * (0.98 - 0.01 * i)),
    },
    {
      ...base,
      id: "fx-zoom-step-min",
      what: `${what}: from fitted, zoom out by 0.8 per frame to 6%; frame times, ms until painted`,
      headline: "frameP95",
      run: (s) => step(s, 0.8, ZOOM_MIN),
    },
    {
      ...base,
      id: "fx-zoom-step-max",
      what: `${what}: from fitted, zoom in on one object by 1.25 per frame to 6,400%; frame times, ms until painted`,
      headline: "frameP95",
      run: (s) => step(s, 1.25, ZOOM_MAX),
    },
    ...exportCases("fx", "fx", setup),
  ];
}

export function docCases(): Case[] {
  const out: Case[] = [];
  for (const d of DOCS) {
    out.push(...d.ops.map((op) => docCase(d, op)));
    if (d.key === "doc20k-flat") {
      out.push(
        ...exportCases(
          d.key,
          d.key,
          async (env) => openedSession(env, await savedDocument(env, d.key, buildLarge, d.spec)),
          3,
        ),
      );
    }
  }
  out.push(...pagesCases(PAGES), ...effectsCases());
  return out;
}
