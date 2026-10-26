// Shared parts of the benchmark (scripts/bench/run.ts): the build, the
// server, the browser, statistics and the result table.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Page,
} from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The repo root. */
export const REPO = path.resolve(here, "..", "..");
export const RESULTS = path.join(here, "results");

// ---------------------------------------------------------------------------
// Build

export interface BuildInfo {
  /** Folder with the built client (what GD_CLIENT_ROOT points at). */
  dir: string;
  /** "working tree" or the git ref that was exported. */
  source: string;
  commit: string;
  ms: number;
}

function git(args: string[]): string {
  const out = spawnSync("git", args, { cwd: REPO, encoding: "utf8" });
  if (out.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${out.stderr}`);
  return out.stdout.trim();
}

/** The files `vite build` needs, as git paths. */
const BUILD_INPUTS = [
  "src",
  "vendor",
  "public",
  "server",
  "index.html",
  "vite.config.ts",
  "tsconfig.json",
  "package.json",
];

/**
 * Builds the client with `vite build` into a folder outside the repo, so
 * the build never touches dist/ (the parity server's) and lint never sees
 * it. With `ref`, the files come from `git archive <ref>` instead of the
 * working tree, so a baseline can be built while src/ is being edited.
 */
export async function buildClient(ref: string | null): Promise<BuildInfo> {
  const started = performance.now();
  const outDir = path.join(
    os.tmpdir(),
    "gd-bench",
    ref ? `build-${ref.replace(/\W/g, "_")}` : "build",
  );
  let root = REPO;
  let staging: string | null = null;

  const commit = git(["rev-parse", "--short", ref ?? "HEAD"]);
  if (ref) {
    staging = path.join(os.tmpdir(), "gd-bench", `src-${commit}`);
    removeStaging(staging);
    fs.mkdirSync(staging, { recursive: true });
    // Relative paths for tar: GNU tar reads "C:" as a remote host.
    const tar = path.join(staging, "sources.tar");
    git(["archive", "--format=tar", "-o", tar, ref, ...BUILD_INPUTS]);
    const untar = spawnSync("tar", ["-xf", "sources.tar"], { cwd: staging, encoding: "utf8" });
    if (untar.status !== 0) throw new Error(`tar failed: ${untar.stderr}`);
    fs.rmSync(tar, { force: true });
    const junction = path.join(staging, "node_modules");
    fs.symlinkSync(path.join(REPO, "node_modules"), junction, "junction");
    root = staging;
  }
  try {
    const vite = await import("vite");
    await vite.build({
      root,
      configFile: path.join(root, "vite.config.ts"),
      logLevel: "warn",
      build: { outDir, emptyOutDir: true },
    });
  } finally {
    if (staging) removeStaging(staging);
  }
  return {
    dir: outDir,
    source: ref ? `git ${ref}` : "working tree",
    commit,
    ms: performance.now() - started,
  };
}

/**
 * Removes a staging folder. Its node_modules is a junction to the repo's,
 * so that link is removed on its own first; deleting through it would
 * delete the repo's node_modules.
 */
function removeStaging(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const link = path.join(dir, "node_modules");
  if (fs.existsSync(link) || isLink(link)) {
    if (!isLink(link)) throw new Error(`${link} is not a link; not removing ${dir}`);
    fs.rmdirSync(link);
    if (fs.existsSync(link) || isLink(link)) throw new Error(`could not unlink ${link}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function isLink(p: string): boolean {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Server

export interface Server {
  url: string;
  stop(): void;
}

/** Starts server/main.ts on the built client. */
export async function startServer(clientRoot: string, port: number): Promise<Server> {
  const child: ChildProcess = spawn(process.execPath, [path.join(REPO, "server", "main.ts")], {
    cwd: REPO,
    env: { ...process.env, PORT: String(port), GD_CLIENT_ROOT: clientRoot },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  const url = `http://127.0.0.1:${port}/`;
  const deadline = Date.now() + 30_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`the server exited: ${stderr}`);
    try {
      const res = await fetch(`${url}connection/test`);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`the server did not start on ${url}: ${stderr}`);
    }
    await sleep(200);
  }
  return { url, stop: () => child.kill() };
}

// ---------------------------------------------------------------------------
// Browser

/** The parity suite's Chromium flags (playwright.config.ts): software canvas, fixed colours. */
export const PARITY_ARGS = [
  "--font-render-hinting=none",
  "--disable-gpu-rasterization",
  "--disable-accelerated-2d-canvas",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--force-color-profile=srgb",
];

export function launchBrowser(gpu: boolean): Promise<Browser> {
  return chromium.launch({ headless: true, args: gpu ? [] : PARITY_ARGS });
}

/**
 * A fresh context (empty cache, storage and service workers) set up like
 * a parity context: fixed viewport, locale and scale, no requests off the
 * machine, no touch prompt, no File System Access API (so File > Open
 * uses the file input Playwright can answer) and the introduction marked
 * as seen (a returning user).
 */
export async function newContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
  await context.addInitScript(() => {
    if (navigator.maxTouchPoints > 1) {
      Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
        configurable: true,
        get: () => 0,
      });
    }
    const w = window as unknown as Record<string, unknown>;
    w.showOpenFilePicker = undefined;
    w.showSaveFilePicker = undefined;
    w.chooseFileSystemEntries = undefined;
    try {
      localStorage.setItem("designer.next-intro-shown", "true");
    } catch {
      // storage blocked: the intro then shows, which only adds a dialog
    }
  });
  return context;
}

// ---------------------------------------------------------------------------
// CDP metrics

export type Metrics = Record<string, number>;

const METRIC_NAMES = [
  "JSHeapUsedSize",
  "LayoutCount",
  "RecalcStyleCount",
  "LayoutDuration",
  "RecalcStyleDuration",
  "ScriptDuration",
  "TaskDuration",
];

export async function cdpMetrics(cdp: CDPSession): Promise<Metrics> {
  const { metrics } = (await cdp.send("Performance.getMetrics")) as {
    metrics: { name: string; value: number }[];
  };
  const out: Metrics = {};
  for (const m of metrics) if (METRIC_NAMES.includes(m.name)) out[m.name] = m.value;
  return out;
}

/** After minus before; durations in ms, the heap as its size after (MB). */
export function metricDelta(before: Metrics, after: Metrics): Metrics {
  const out: Metrics = {};
  for (const name of METRIC_NAMES) {
    const a = after[name] ?? 0;
    const b = before[name] ?? 0;
    if (name === "JSHeapUsedSize") out.heapMB = a / 1048576;
    else if (name.endsWith("Duration")) out[name] = (a - b) * 1000;
    else out[name] = a - b;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Statistics

export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo);
}

export const median = (values: readonly number[]): number => quantile(values, 0.5);

/** Median of every numeric field over the runs (fields missing in a run are skipped). */
export function medianOf(runs: readonly Record<string, number>[]): Record<string, number> {
  const keys = new Set(runs.flatMap((r) => Object.keys(r)));
  const out: Record<string, number> = {};
  for (const key of keys) {
    const values = runs.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    if (values.length) out[key] = median(values);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Output

export function fmt(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "-";
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString("en-US");
  return value.toFixed(digits);
}

/** A plain text table: header row, then rows, columns padded. */
export function table(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const line = (cells: string[]): string =>
    cells
      .map((c, i) => (i === 0 ? c.padEnd(widths[i] as number) : c.padStart(widths[i] as number)))
      .join("  ");
  return [line(header), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { Browser, BrowserContext, CDPSession, Page };
