// The benchmark cases. Each drives the real app in Chromium the way the
// parity harness does (window.__parity hooks, File > Open through the
// file input, Playwright mouse and keyboard input) and returns numbers.
import fs from "node:fs";
import path from "node:path";
import {
  boot,
  bootWithDocument,
  canvasCenter,
  closeActive,
  frameStats,
  generated,
  idle,
  newDocument,
  openThroughUi,
  resetView,
  startFrames,
  stopFrames,
  withMetrics,
  type AppWindow,
  type Case,
  type Env,
  type Session,
} from "./drive.ts";
import { cdpMetrics, newContext, quantile, REPO, sleep } from "./lib.ts";
import { bigEps, bigSvg, buildHeavy, HEAVY, longText } from "./synthetic.ts";
import { docCases } from "./cases-docs.ts";
import { fileImportCases } from "./cases-import.ts";

export type { Case, Env, Numbers, Session } from "./drive.ts";

/** A document with the heavy synthetic scene, fitted into the view. */
async function heavySession(env: Env): Promise<Session> {
  const s = await bootWithDocument(env);
  await s.page.evaluate(buildHeavy, HEAVY);
  await s.page.evaluate(() => {
    const w = window as unknown as AppWindow;
    w.__parity.app.activateTool("GPointerTool");
    // Zoom to fit everything, as View > Fit All would.
    if (w.__parity.app.canExecute("view.zoom.fit.all")) w.__parity.app.execute("view.zoom.fit.all");
  });
  await idle(s.page);
  return s;
}

// ---------------------------------------------------------------------------
// Files

/** The three largest corpus documents. */
export function largestCorpus(n = 3): string[] {
  const dir = path.join(REPO, "parity", "corpus", "files");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".gvdesign"))
    .map((f) => ({ f, size: fs.statSync(path.join(dir, f)).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, n)
    .map((e) => path.join(dir, e.f));
}

interface ImportInput {
  id: string;
  what: string;
  file: () => string;
}

const IMPORTS: ImportInput[] = [
  {
    id: "import-svg-3000",
    what: "File > Open a generated SVG with 3,000 elements (paths, rects, circles, texts, gradients)",
    file: () => generated("bench-3000.svg", bigSvg(3000)),
  },
  {
    id: "import-svg-welcome",
    what: "File > Open assets/icon/welcome.svg (256 KB, the largest SVG in the repo)",
    file: () => path.join(REPO, "assets", "icon", "welcome.svg"),
  },
  {
    id: "import-pdf-print",
    what: "File > Open parity/expected/import-export/ui/print-pdf.pdf (131 KB, text and fonts)",
    file: () => path.join(REPO, "parity", "expected", "import-export", "ui", "print-pdf.pdf"),
  },
  {
    id: "import-pdf-2pages",
    what: "File > Open parity/fixtures/import/pdf/vector-2pages.pdf (small, two pages; pdf.js start dominates)",
    file: () => path.join(REPO, "parity", "fixtures", "import", "pdf", "vector-2pages.pdf"),
  },
  {
    id: "import-eps-2000",
    what: "File > Open a generated EPS with 2,000 filled and stroked curves",
    file: () => generated("bench-2000.eps", bigEps(2000)),
  },
  {
    id: "import-eps-gradient",
    what: "File > Open parity/fixtures/import/eps/gradient.eps (small, the worker start dominates)",
    file: () => path.join(REPO, "parity", "fixtures", "import", "eps", "gradient.eps"),
  },
];

// ---------------------------------------------------------------------------
// Cases

const coldStart: Case = {
  id: "cold-start",
  what: "fresh context: navigation to app ready (window.__parity) and to an empty document painted",
  headline: "docReadyMs",
  freshSession: true,
  async setup(env) {
    // The session is the measurement here; run() boots its own.
    const context = await newContext(env.browser);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    return { context, page, cdp };
  },
  async run(_s, env) {
    const s = await boot(env);
    try {
      await newDocument(s.page);
      const timing = await s.page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const fcp = performance.getEntriesByName("first-contentful-paint")[0];
        const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        return {
          domContentLoaded: nav.domContentLoadedEventEnd,
          load: nav.loadEventEnd,
          fcp: fcp ? fcp.startTime : NaN,
          bootMs: (window as unknown as { __benchBooted: number }).__benchBooted,
          docReadyMs: performance.now(),
          transferKB:
            (nav.transferSize + resources.reduce((a, r) => a + (r.transferSize || 0), 0)) / 1024,
          decodedKB:
            (nav.decodedBodySize + resources.reduce((a, r) => a + (r.decodedBodySize || 0), 0)) /
            1024,
        };
      });
      const m = await cdpMetrics(s.cdp);
      return {
        ...timing,
        requests: s.requests.length,
        heapMB: (m.JSHeapUsedSize ?? 0) / 1048576,
        LayoutCount: m.LayoutCount ?? 0,
        RecalcStyleCount: m.RecalcStyleCount ?? 0,
        ScriptDuration: (m.ScriptDuration ?? 0) * 1000,
        TaskDuration: (m.TaskDuration ?? 0) * 1000,
      };
    } finally {
      await s.context.close();
    }
  },
  async info(_s, env) {
    const s = await boot(env);
    await newDocument(s.page);
    const resources = await s.page.evaluate(() =>
      (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).map((r) => ({
        url: r.name,
        type: r.initiatorType,
        kb: r.decodedBodySize / 1024,
      })),
    );
    await s.context.close();
    return { requests: s.requests, resources };
  },
};

function openCase(file: string): Case {
  const name = path.basename(file);
  return {
    id: `open-${name.replace(/\.gvdesign$/, "")}`,
    what: `File > Open ${path.relative(REPO, file).replace(/\\/g, "/")} (${Math.round(fs.statSync(file).size / 1024)} KB) until painted`,
    headline: "painted",
    setup: bootWithDocument,
    async run(s) {
      const out = await withMetrics(s.cdp, async () => ({
        ...(await openThroughUi(s.page, file)),
      }));
      await closeActive(s.page);
      return out;
    },
  };
}

function importCase(input: ImportInput): Case {
  return {
    id: input.id,
    what: input.what,
    headline: "painted",
    setup: bootWithDocument,
    async run(s) {
      const file = input.file();
      const out = await withMetrics(s.cdp, async () => ({
        ...(await openThroughUi(s.page, file)),
      }));
      const nodes = await s.page.evaluate(() => {
        let n = 0;
        (window as unknown as AppWindow).__parity.app.scene().acceptChildren(() => {
          n++;
        });
        return n;
      });
      await closeActive(s.page);
      return { ...out, nodes };
    },
  };
}

const panWheel: Case = {
  id: "pan-wheel",
  what: `heavy document (${HEAVY.count} shapes, every ${HEAVY.shadowEvery}th with a shadow): 90 wheel scrolls, one per 16 ms`,
  headline: "frameP95",
  setup: heavySession,
  async run(s) {
    const c = await canvasCenter(s.page);
    await s.page.mouse.move(c.x, c.y);
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      for (let i = 0; i < 90; i++) {
        await s.page.mouse.wheel(0, i < 45 ? 60 : -60);
        await sleep(16);
      }
      const rec = await stopFrames(s.page);
      const settle = await idle(s.page);
      return { ...frameStats(rec), settleMs: settle };
    });
    await resetView(s.page);
    return out;
  },
};

const zoomWheel: Case = {
  id: "zoom-wheel",
  what: "heavy document: Ctrl + wheel, 20 steps in and 20 out at the canvas centre, one per 30 ms",
  headline: "frameP95",
  setup: heavySession,
  async run(s) {
    const c = await canvasCenter(s.page);
    await s.page.mouse.move(c.x, c.y);
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      await s.page.keyboard.down("Control");
      for (let i = 0; i < 40; i++) {
        await s.page.mouse.wheel(0, i < 20 ? -20 : 20);
        await sleep(30);
      }
      await s.page.keyboard.up("Control");
      const rec = await stopFrames(s.page);
      const settle = await idle(s.page);
      return { ...frameStats(rec), settleMs: settle };
    });
    await resetView(s.page);
    return out;
  },
};

const panApi: Case = {
  id: "pan-api",
  what: "heavy document: view.scrollBy(15, 8) once per frame for 120 frames, through the view API (the same strip repaint as the wheel, but every frame)",
  headline: "frameP95",
  setup: heavySession,
  async run(s) {
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      await s.page.evaluate(async () => {
        const w = window as unknown as AppWindow;
        const view = w.__parity.app.view();
        for (let i = 0; i < 120; i++) {
          view.scrollBy(i < 60 ? 15 : -15, i < 60 ? 8 : -8);
          await w.__bench.nextFrame();
        }
      });
      const rec = await stopFrames(s.page);
      const settle = await idle(s.page);
      return { ...frameStats(rec), settleMs: settle };
    });
    await resetView(s.page);
    return out;
  },
};

const zoomApi: Case = {
  id: "zoom-api",
  what: "heavy document: view.zoomAt(centre) by 1.05 per frame, 30 in and 30 out, through the view API",
  headline: "frameP95",
  setup: heavySession,
  async run(s) {
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      await s.page.evaluate(async () => {
        const w = window as unknown as AppWindow;
        const view = w.__parity.app.view();
        const box = view.getViewBox();
        const G = w.__parity.G as { GPoint: new (x: number, y: number) => unknown };
        const centre = new G.GPoint(
          box.getX() + box.getWidth() / 2,
          box.getY() + box.getHeight() / 2,
        );
        for (let i = 0; i < 60; i++) {
          view.zoomAt(centre, view.getZoom() * (i < 30 ? 1.05 : 1 / 1.05));
          await w.__bench.nextFrame();
        }
      });
      const rec = await stopFrames(s.page);
      const settle = await idle(s.page);
      return { ...frameStats(rec), settleMs: settle };
    });
    await resetView(s.page);
    return out;
  },
};

const dragGroup: Case = {
  id: "drag-group",
  what: `heavy document: drag the selected group of ${HEAVY.groupSize} shapes with the pointer tool, 60 moves of 5 px, one per 16 ms; moveMedian is the time Playwright waits for the page to handle one move`,
  headline: "moveMedian",
  setup: heavySession,
  async run(s) {
    // The group's centre on screen.
    const start = await s.page.evaluate(() => {
      const w = window as unknown as AppWindow;
      const app = w.__parity.app;
      const scene = app.scene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
      let group: any = null;
      scene.acceptChildren((n: { getProperty?: (k: string) => unknown }) => {
        if (!group && n.getProperty && n.getProperty("name") === "bench-group") group = n;
      });
      app.editor().updateSelection(false, [group]);
      const box = group.getGeometryBBox();
      const m = app.view().getWorldTransform().getMatrix() as number[];
      const cx = box.getX() + box.getWidth() / 2;
      const cy = box.getY() + box.getHeight() / 2;
      const el = document.querySelector(".g-editor-widget") as HTMLElement;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + (m[0] as number) * cx + (m[2] as number) * cy + (m[4] as number),
        y: r.top + (m[1] as number) * cx + (m[3] as number) * cy + (m[5] as number),
      };
    });
    await idle(s.page);
    await s.page.mouse.move(start.x, start.y);
    await sleep(400); // past the double-click guard
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      // Input round trips as Playwright sees them: each waits until the
      // page has handled the event.
      let t = performance.now();
      await s.page.mouse.down();
      const downMs = performance.now() - t;
      const moves: number[] = [];
      for (let i = 1; i <= 60; i++) {
        const dir = i <= 30 ? i : 60 - i;
        t = performance.now();
        await s.page.mouse.move(start.x + dir * 5, start.y + dir * 3);
        moves.push(performance.now() - t);
        await sleep(16);
      }
      t = performance.now();
      await s.page.mouse.up();
      const upMs = performance.now() - t;
      const rec = await stopFrames(s.page);
      const settle = await idle(s.page);
      return {
        ...frameStats(rec),
        settleMs: settle,
        downMs,
        moveMedian: quantile(moves, 0.5),
        moveP95: quantile(moves, 0.95),
        upMs,
      };
    });
    // Back to where it was, so every run starts from the same scene.
    await s.page.evaluate(() => (window as unknown as AppWindow).__parity.app.execute("edit.undo"));
    await idle(s.page);
    return out;
  },
};

const typeLongText: Case = {
  id: "type-long-text",
  what: "a 40-paragraph text (2,400 words, 600 pt wide) edited inline: 30 keystrokes at the end, time from keydown to the next frame",
  headline: "keyP95",
  async setup(env) {
    const s = await bootWithDocument(env);
    await s.page.evaluate((text) => {
      const w = window as unknown as AppWindow;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine through the untyped G namespace
      const G = w.__parity.G as any;
      const app = w.__parity.app;
      const n = new G.GText();
      n.setProperties(["aw", "ah"], [false, true]);
      n.setText(text, 1, 1);
      n.transformSourceBBox(new G.GTransform(600, 0, 0, 1, 100, 100), true, false);
      app.editor().insertElements([n]);
      app.editor().updateSelection(false, [n]);
      (w as unknown as { __benchText: unknown }).__benchText = n;
      app.activateTool("GPointerTool");
      w.addEventListener(
        "keydown",
        (e) => {
          (w as unknown as { __benchKey: number }).__benchKey = e.timeStamp;
        },
        true,
      );
    }, longText(40));
    await idle(s.page);
    return s;
  },
  async run(s) {
    const c = await canvasCenter(s.page);
    await s.page.mouse.move(c.x + 300, c.y + 300);
    await s.page.keyboard.press("Enter");
    await s.page.waitForFunction(() =>
      (window as unknown as AppWindow).__parity.app.editor().isInlineEditing(),
    );
    await s.page.keyboard.press("Control+End");
    await idle(s.page);
    const latencies: number[] = [];
    const out = await withMetrics(s.cdp, async () => {
      await startFrames(s.page);
      const text = "the quick brown fox jumps over";
      for (const ch of text) {
        await s.page.keyboard.press(ch === " " ? "Space" : ch);
        latencies.push(
          await s.page.evaluate(async () => {
            const w = window as unknown as AppWindow & { __benchKey: number };
            await w.__bench.nextFrame();
            // After the frame callbacks, the paint of this frame.
            await new Promise((r) => setTimeout(r, 0));
            return performance.now() - w.__benchKey;
          }),
        );
      }
      const rec = await stopFrames(s.page);
      return {
        keyMedian: quantile(latencies, 0.5),
        keyP95: quantile(latencies, 0.95),
        keyMax: Math.max(...latencies),
        longTasks: rec.longTasks.length,
        longTaskMs: rec.longTasks.reduce((a, b) => a + b, 0),
      };
    });
    // Leave the editor and select the text again for the next run. The
    // typed characters stay (30 more on 14,000 change nothing measurable).
    await s.page.keyboard.press("Escape");
    await s.page.evaluate(() => {
      const w = window as unknown as AppWindow & { __benchText: unknown };
      w.__parity.app.editor().updateSelection(false, [w.__benchText]);
    });
    await idle(s.page);
    return out;
  },
};

function exportCase(format: "svg" | "pdf" | "png"): Case {
  return {
    id: `export-${format}`,
    what: `heavy document's page (${HEAVY.page.w} x ${HEAVY.page.h}, ${HEAVY.count} shapes) through Exporter.exportExportable as ${format.toUpperCase()}${format === "png" ? " at 1x" : ""}`,
    headline: "ms",
    setup: heavySession,
    async run(s) {
      return withMetrics(s.cdp, () =>
        s.page.evaluate(async (fmt) => {
          const w = window as unknown as AppWindow;
          const io = w.__parity.app.importExport;
          const page = w.__parity.app.scene().getActivePage();
          const [exportable] = io.generateExportables(page, { format: fmt, size: "1x" }, false);
          const start = performance.now();
          const blob = (await io.exportExportable(exportable, 300_000)) as Blob | null;
          return { ms: performance.now() - start, outKB: blob ? blob.size / 1024 : 0 };
        }, format),
      );
    },
  };
}

export function allCases(): Case[] {
  return [
    coldStart,
    ...largestCorpus(3).map(openCase),
    panWheel,
    zoomWheel,
    panApi,
    zoomApi,
    dragGroup,
    typeLongText,
    exportCase("svg"),
    exportCase("pdf"),
    exportCase("png"),
    ...IMPORTS.map(importCase),
    ...docCases(),
    ...fileImportCases(),
  ];
}
