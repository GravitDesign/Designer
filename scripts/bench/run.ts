// Performance benchmark of the app: a production build served by
// server/main.ts, driven in Chromium through Playwright. See
// docs/rewrite/PERFORMANCE.md.
//
//   node scripts/bench/run.ts                     every case, 5 runs each
//   node scripts/bench/run.ts --filter pan        cases whose id contains "pan"
//   node scripts/bench/run.ts --filter cold-start,export-svg --runs 9
//   node scripts/bench/run.ts --ref HEAD          build the committed sources, not the working tree
//   node scripts/bench/run.ts --no-build          reuse the last build
//   node scripts/bench/run.ts --profile           also one CPU-profiled run per case
//   node scripts/bench/run.ts --gpu               Chromium's own GPU settings instead of the parity flags
//
// The table goes to stdout; the full results to scripts/bench/results/<time>.json.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { bundleReport, composition, type BundleReport, type Composition } from "./bundle.ts";
import { allCases, type Case, type Env, type Numbers, type Session } from "./cases.ts";
import { installBench } from "./in-page.ts";
import {
  buildClient,
  newContext,
  fmt,
  launchBrowser,
  medianOf,
  RESULTS,
  startServer,
  table,
  type BuildInfo,
} from "./lib.ts";
import { startProfile, stopProfile, summarise, type ProfileSummary } from "./profile.ts";

const { values } = parseArgs({
  options: {
    filter: { type: "string", short: "f" },
    runs: { type: "string", short: "n", default: "5" },
    ref: { type: "string" },
    "no-build": { type: "boolean", default: false },
    profile: { type: "boolean", default: false },
    gpu: { type: "boolean", default: false },
    port: { type: "string", default: "3197" },
  },
});

const runs = Math.max(1, Number(values.runs));
const filters = (values.filter ?? "")
  .split(",")
  .map((f) => f.trim())
  .filter(Boolean);
const selected = (id: string): boolean =>
  filters.length === 0 || filters.some((f) => id.includes(f));

interface CaseResult {
  id: string;
  what: string;
  headline: string;
  /** The first run, which warms the JIT and caches (not in the medians). */
  warmup?: Numbers;
  runs: Numbers[];
  median: Numbers;
  info?: unknown;
  error?: string;
  profile?: ProfileSummary & {
    file: string;
    renders?: { commits: number; top: [string, number][] };
  };
}

function machine(browserVersion: string): Record<string, unknown> {
  const cpus = os.cpus();
  return {
    cpu: cpus[0]?.model.trim(),
    logicalCores: cpus.length,
    memoryGB: Math.round(os.totalmem() / 1073741824),
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    node: process.version,
    chromium: browserVersion,
  };
}

async function runCase(c: Case, env: Env): Promise<CaseResult> {
  const result: CaseResult = { id: c.id, what: c.what, headline: c.headline, runs: [], median: {} };
  let session: Session | null = null;
  try {
    session = await c.setup(env);
    if (!c.freshSession) result.warmup = await c.run(session, env, -1);
    for (let i = 0; i < runs; i++) {
      result.runs.push(await c.run(session, env, i));
      process.stdout.write(".");
    }
    result.median = medianOf(result.runs);
    if (c.info) result.info = await c.info(session, env);
  } catch (error) {
    result.error = String(error instanceof Error ? (error.stack ?? error.message) : error);
  } finally {
    await session?.context.close().catch(() => undefined);
  }
  return result;
}

/** One more run with the CPU profiler on (after a warm-up run) and React renders counted. */
async function profileCase(c: Case, env: Env, dir: string): Promise<CaseResult["profile"]> {
  const penv: Env = { ...env, countRenders: true };
  if (c.freshSession) return profileColdStart(penv, dir);
  const session = await c.setup(penv);
  try {
    await c.run(session, penv, -1);
    await session.page.evaluate(() =>
      (window as unknown as { __bench: { resetRenders(): void } }).__bench.resetRenders(),
    );
    await startProfile(session.cdp);
    await c.run(session, penv, -2);
    const profile = await stopProfile(session.cdp);
    const renders = await session.page.evaluate(
      () =>
        (
          window as unknown as {
            __bench: { renders: { commits: number; byName: Record<string, number> } };
          }
        ).__bench.renders,
    );
    const file = path.join(dir, `${c.id}.cpuprofile`);
    fs.writeFileSync(file, JSON.stringify(profile));
    return {
      ...summarise(profile, env.buildDir),
      file: path.relative(RESULTS, file).replace(/\\/g, "/"),
      renders: {
        commits: renders.commits,
        top: Object.entries(renders.byName)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15),
      },
    };
  } finally {
    await session.context.close().catch(() => undefined);
  }
}

/** Cold start: the profiler starts before navigation, on a fresh context. */
async function profileColdStart(env: Env, dir: string): Promise<CaseResult["profile"]> {
  const context = await newContext(env.browser);
  await context.addInitScript(installBench, { countRenders: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await startProfile(cdp);
  await page.goto(env.url);
  await page.waitForFunction(() => !!(window as unknown as { __parity?: unknown }).__parity, null, {
    timeout: 120_000,
    polling: 20,
  });
  await page.evaluate(async () => {
    const w = window as unknown as {
      __parity: { app: { newInfiniteDocument(): void } };
      __bench: { idle(): Promise<number> };
    };
    w.__parity.app.newInfiniteDocument();
    await w.__bench.idle();
  });
  const profile = await stopProfile(cdp);
  const renders = await page.evaluate(
    () =>
      (
        window as unknown as {
          __bench: { renders: { commits: number; byName: Record<string, number> } };
        }
      ).__bench.renders,
  );
  await context.close();
  const file = path.join(dir, "cold-start.cpuprofile");
  fs.writeFileSync(file, JSON.stringify(profile));
  return {
    ...summarise(profile, env.buildDir),
    file: path.relative(RESULTS, file).replace(/\\/g, "/"),
    renders: {
      commits: renders.commits,
      top: Object.entries(renders.byName)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15),
    },
  };
}

/** Columns shown for every case, when it has them. */
const COLUMNS: [string, string, number][] = [
  ["frameMedian", "frame med", 1],
  ["frameP95", "frame p95", 1],
  ["frameMax", "frame max", 0],
  ["slowFrames", ">33ms", 0],
  ["longTasks", "long tasks", 0],
  ["longTaskMs", "long ms", 0],
  ["settleMs", "settle", 0],
  ["ScriptDuration", "script ms", 0],
  ["LayoutCount", "layouts", 0],
  ["RecalcStyleCount", "styles", 0],
  ["heapMB", "heap MB", 0],
];

function printTable(results: CaseResult[]): void {
  const header = ["case", "headline", "median", "min", "max", ...COLUMNS.map((c) => c[1])];
  const rows = results.map((r) => {
    if (r.error)
      return [r.id, "ERROR", r.error.split("\n")[0]?.slice(0, 60) ?? "", ...COLUMNS.map(() => "")];
    const values = r.runs
      .map((x) => x[r.headline])
      .filter((v): v is number => typeof v === "number");
    return [
      r.id,
      r.headline,
      fmt(r.median[r.headline]),
      fmt(Math.min(...values)),
      fmt(Math.max(...values)),
      ...COLUMNS.map(([key, , digits]) => fmt(r.median[key], digits)),
    ];
  });
  console.log("\n" + table(header, rows));
}

function printBundle(b: BundleReport, cold: Composition[]): void {
  const kb = (n: number): string => fmt(n / 1024, 0);
  console.log(
    `\nbuild: ${kb(b.totalBytes)} KB (${kb(b.totalGzip)} KB gzip) without ${kb(b.mapsBytes)} KB of sourcemaps`,
  );
  console.log(
    table(
      ["file", "KB", "gzip KB"],
      b.files.slice(0, 15).map((f) => [f.file, kb(f.bytes), kb(f.gzip)]),
    ),
  );
  for (const c of cold) {
    console.log(`\n${c.chunk} (${kb(c.bytes)} KB) by source:`);
    console.log(
      table(
        ["source", "KB", "share"],
        c.groups.slice(0, 15).map((g) => [g.group, kb(g.bytes), `${(g.share * 100).toFixed(1)}%`]),
      ),
    );
  }
}

async function main(): Promise<void> {
  const cases = allCases().filter((c) => selected(c.id));
  const wantBundle = selected("bundle");
  if (cases.length === 0 && !wantBundle) {
    console.error(
      `no case matches ${filters.join(",")}; cases: bundle, ${allCases()
        .map((c) => c.id)
        .join(", ")}`,
    );
    process.exit(1);
  }

  let build: BuildInfo;
  const reuse = path.join(os.tmpdir(), "gd-bench", "last-build.json");
  if (values["no-build"] && fs.existsSync(reuse)) {
    build = JSON.parse(fs.readFileSync(reuse, "utf8")) as BuildInfo;
    console.log(`reusing the build of ${build.source} (${build.commit}) in ${build.dir}`);
  } else {
    console.log(`building ${values.ref ? `git ${values.ref}` : "the working tree"} ...`);
    build = await buildClient(values.ref ?? null);
    fs.writeFileSync(reuse, JSON.stringify(build));
    console.log(`built in ${fmt(build.ms / 1000)} s into ${build.dir}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.mkdirSync(RESULTS, { recursive: true });
  const profileDir = path.join(RESULTS, `profiles-${stamp}`);
  if (values.profile) fs.mkdirSync(profileDir, { recursive: true });

  const results: CaseResult[] = [];
  const server = cases.length ? await startServer(build.dir, Number(values.port)) : null;
  const browser = await launchBrowser(values.gpu);
  const browserVersion = browser.version();
  const env: Env = { browser, url: server?.url ?? "", buildDir: build.dir, countRenders: false };
  try {
    for (const c of cases) {
      process.stdout.write(`${c.id} `);
      const r = await runCase(c, env);
      if (values.profile && !r.error) {
        try {
          r.profile = await profileCase(c, env, profileDir);
        } catch (error) {
          r.profile = undefined;
          console.warn(`\n  profiling ${c.id} failed: ${String(error)}`);
        }
      }
      results.push(r);
      console.log(
        r.error
          ? ` failed: ${r.error.split("\n")[0]}`
          : ` ${r.headline} ${fmt(r.median[r.headline])}`,
      );
    }
  } finally {
    await browser.close();
    server?.stop();
  }

  let bundle: BundleReport | null = null;
  let coldChunks: Composition[] = [];
  if (wantBundle) {
    bundle = bundleReport(build.dir);
    // The JavaScript the cold start loads, by source.
    const cold = results.find((r) => r.id === "cold-start")?.info as
      { requests?: string[] } | undefined;
    const chunks = (cold?.requests ?? [])
      .map((u) => new URL(u).pathname.slice(1))
      .filter((p) => p.endsWith(".js") && fs.existsSync(path.join(build.dir, p)));
    const names = chunks.length
      ? [...new Set(chunks)]
      : bundle.files
          .filter((f) => f.file.startsWith("bundle/index-") && f.file.endsWith(".js"))
          .map((f) => f.file);
    coldChunks = names.map((n) => composition(build.dir, n)).filter((c): c is Composition => !!c);
  }

  printTable(results);
  if (bundle) printBundle(bundle, coldChunks);
  for (const r of results) {
    if (!r.profile) continue;
    console.log(
      `\nprofile ${r.id}: ${fmt(r.profile.totalMs, 0)} ms on the main thread; top self time:`,
    );
    console.log(
      table(
        ["function", "where", "self ms", "total ms"],
        r.profile.topSelf.slice(0, 8).map((f) => [f.name, f.where, fmt(f.selfMs), fmt(f.totalMs)]),
      ),
    );
  }

  const out = {
    date: new Date().toISOString(),
    machine: machine(browserVersion),
    build: { source: build.source, commit: build.commit, gpu: values.gpu },
    runs,
    results,
    bundle: bundle ? { ...bundle, coldStartChunks: coldChunks } : undefined,
  };
  const file = path.join(RESULTS, `${stamp}.json`);
  // Formatted by Prettier, so `npm run lint` (prettier --check .) passes
  // with local results in the folder.
  const prettier = await import("prettier");
  const json = await prettier.format(JSON.stringify(out), { parser: "json" });
  fs.writeFileSync(file, json);
  fs.writeFileSync(path.join(RESULTS, "latest.json"), json);
  console.log(`\nresults: ${path.relative(process.cwd(), file)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
