// Driving the app for the cases: sessions, File > Open through the UI,
// the frame recorder and the measuring helpers the case files share.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { installBench, type BenchWindow, type FrameRecord } from "./in-page.ts";
import {
  cdpMetrics,
  metricDelta,
  newContext,
  quantile,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Metrics,
  type Page,
} from "./lib.ts";

export interface Env {
  browser: Browser;
  url: string;
  buildDir: string;
  /** Count React renders (slows the page a little; only for profiling runs). */
  countRenders: boolean;
}

export interface Session {
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
}

export type Numbers = Record<string, number>;

export interface Case {
  id: string;
  /** What the case measures, one line. */
  what: string;
  /** The column the table shows as the case's headline number. */
  headline: string;
  /**
   * The group `--group` selects (and the CI workflow splits by): "base"
   * for the original cases when not given.
   */
  group?: string;
  /** At most this many measured runs, whatever `--runs` asks for (slow cases). */
  runs?: number;
  /** No warm-up run (cases where one run takes minutes). */
  noWarmup?: boolean;
  /**
   * Cases with the same key that run one after the other share one
   * session: the first one's setup opens it and the last one closes it.
   * Each case leaves the document as it found it.
   */
  sessionKey?: string;
  /** A new session for every run (cold start) instead of one for all runs. */
  freshSession?: boolean;
  /** Prepares a session (boot, open documents). Not measured. */
  setup(env: Env): Promise<Session>;
  /** One measured run. */
  run(session: Session, env: Env, index: number): Promise<Numbers>;
  /** Extra information recorded once (not part of the medians). */
  info?(session: Session, env: Env): Promise<unknown>;
}

export type ParityApp = Record<string, unknown> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the hooks are untyped in the page
  [hook: string]: any;
};
export type AppWindow = Window &
  BenchWindow & { __parity: { G: Record<string, unknown>; app: ParityApp } };

// ---------------------------------------------------------------------------
// Sessions

/** Opens the app in a fresh context and waits for window.__parity. */
export async function boot(env: Env): Promise<Session & { requests: string[] }> {
  const context = await newContext(env.browser);
  await context.addInitScript(installBench, { countRenders: env.countRenders });
  // Records when the parity bridge appears (main.tsx installs it once the app is ready).
  await context.addInitScript(() => {
    let value: unknown;
    Object.defineProperty(window, "__parity", {
      configurable: true,
      get: () => value,
      set: (v) => {
        value = v;
        (window as unknown as { __benchBooted: number }).__benchBooted = performance.now();
      },
    });
  });
  const requests: string[] = [];
  context.on("request", (r) => requests.push(r.url()));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable", { timeDomain: "timeTicks" });
  await page.goto(env.url);
  await page.waitForFunction(() => !!(window as unknown as AppWindow).__parity, null, {
    timeout: 120_000,
    polling: 20,
  });
  return { context, page, cdp, requests };
}

export async function newDocument(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const w = window as unknown as AppWindow;
    w.__parity.app.newInfiniteDocument();
    return w.__bench.idle();
  });
}

export async function bootWithDocument(env: Env): Promise<Session> {
  const s = await boot(env);
  await newDocument(s.page);
  return s;
}

/**
 * Opens a file through File > Open Local File; ms until the document is
 * ready and until it is painted. `timeout` (ms) covers each of the two.
 */
export async function openThroughUi(
  page: Page,
  file: string,
  timeout = 120_000,
): Promise<{ ready: number; painted: number }> {
  await page.evaluate((limit) => {
    const w = window as unknown as AppWindow & {
      __benchOpen?: Promise<{ ready: number; painted: number }>;
    };
    const before = w.__parity.app.corpus.documentStates().length;
    const start = performance.now();
    w.__benchOpen = (async () => {
      // What went wrong when a file doesn't open: the statuses the new
      // document went through and any message box the app shows.
      const seen = new Set<string>();
      const why = (): string => {
        const boxes = Array.from(document.querySelectorAll<HTMLElement>('[class*="dialog"]'))
          .filter((e) => e.offsetParent !== null)
          .map((e) => e.innerText.trim().replace(/\s+/g, " "))
          .filter(Boolean);
        return `statuses ${[...seen].join(", ") || "none"}; dialogs: ${boxes.join(" | ").slice(0, 400) || "none"}`;
      };
      for (;;) {
        const states = w.__parity.app.corpus.documentStates() as {
          status: string;
          hasScene: boolean;
        }[];
        const doc = w.__parity.app.document();
        const last = states[states.length - 1];
        if (states.length > before) seen.add(last?.status ?? "?");
        // Ready, or loaded with its scene: a bitmap's document gets its
        // scene (and Ready) first and Loaded after it, in one go.
        if (
          states.length > before &&
          doc &&
          (last?.status === "ready" || (last?.status === "loaded" && last.hasScene))
        )
          break;
        if (seen.size && states.length <= before) {
          throw new Error(`the file failed to open (${why()})`);
        }
        if (performance.now() - start > limit) throw new Error(`the file did not open (${why()})`);
        await new Promise((r) => setTimeout(r, 5));
      }
      const ready = performance.now() - start;
      await w.__bench.idle(3, limit);
      return { ready, painted: performance.now() - start };
    })();
  }, timeout);
  const chooser = page.waitForEvent("filechooser");
  await page.evaluate(() => (window as unknown as AppWindow).__parity.app.execute("file.open"));
  await (await chooser).setFiles(file);
  return page.evaluate(
    () =>
      (window as unknown as { __benchOpen: Promise<{ ready: number; painted: number }> })
        .__benchOpen,
  );
}

/** Closes the active window's document; waits up to `timeout` ms for it to go. */
export async function closeActive(page: Page, timeout = 4000): Promise<void> {
  await page.evaluate(async (limit) => {
    const w = window as unknown as AppWindow;
    const before = w.__parity.app.corpus.documentStates().length;
    const start = performance.now();
    w.__parity.app.execute("file.close-active-window");
    while (
      performance.now() - start < limit &&
      w.__parity.app.corpus.documentStates().length >= before
    ) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }, timeout);
}

/** Nodes in the active scene. */
export async function countNodes(page: Page): Promise<number> {
  return page.evaluate(() => {
    let n = 0;
    (window as unknown as AppWindow).__parity.app.scene().acceptChildren(() => {
      n++;
    });
    return n;
  });
}

// ---------------------------------------------------------------------------
// Measuring helpers

export function frameStats(r: FrameRecord): Numbers {
  const f = r.frames;
  return {
    frames: f.length,
    frameMedian: quantile(f, 0.5),
    frameP95: quantile(f, 0.95),
    frameMax: f.length ? Math.max(...f) : NaN,
    slowFrames: f.filter((x) => x > 33.4).length,
    longTasks: r.longTasks.length,
    longTaskMs: r.longTasks.reduce((a, b) => a + b, 0),
    wallMs: r.wall,
  };
}

export async function withMetrics(cdp: CDPSession, body: () => Promise<Numbers>): Promise<Numbers> {
  const before: Metrics = await cdpMetrics(cdp);
  const out = await body();
  const after: Metrics = await cdpMetrics(cdp);
  return { ...out, ...metricDelta(before, after) };
}

export async function canvasCenter(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator(".g-editor-widget").first().boundingBox();
  if (!box) throw new Error("no editor widget");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export const startFrames = (page: Page): Promise<void> =>
  page.evaluate(() => (window as unknown as AppWindow).__bench.startFrames());
export const stopFrames = (page: Page): Promise<FrameRecord> =>
  page.evaluate(() => (window as unknown as AppWindow).__bench.stopFrames());
/** Waits until the view has painted everything; ms waited. */
export const idle = (page: Page, timeout = 120_000): Promise<number> =>
  page.evaluate((t) => (window as unknown as AppWindow).__bench.idle(3, t), timeout);

/** View > Fit All, then idle. */
export async function resetView(page: Page, timeout = 120_000): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as AppWindow;
    if (w.__parity.app.canExecute("view.zoom.fit.all")) w.__parity.app.execute("view.zoom.fit.all");
  });
  await idle(page, timeout);
}

// ---------------------------------------------------------------------------
// Files

/** Where generated inputs go (and stay, as a cache between runs). */
export const TMP = path.join(os.tmpdir(), "gd-bench", "inputs");

export function generated(name: string, content: string | Uint8Array): string {
  fs.mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, name);
  fs.writeFileSync(file, content);
  return file;
}

/** A generated file, made by `make` only when it isn't in the cache yet. */
export function cached(name: string, make: () => string | Uint8Array): string {
  const file = path.join(TMP, name);
  if (fs.existsSync(file)) return file;
  return generated(name, make());
}
