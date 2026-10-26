// CPU profiles through CDP, summarised by function with the build's
// sourcemaps, so the names and lines are the TypeScript sources.
import fs from "node:fs";
import path from "node:path";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import type { CDPSession } from "./lib.ts";

interface CallFrame {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

interface ProfileNode {
  id: number;
  callFrame: CallFrame;
  children?: number[];
}

export interface CpuProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

export interface FunctionCost {
  name: string;
  /** source:line in the original sources, or the bundle URL when unmapped. */
  where: string;
  selfMs: number;
  totalMs: number;
}

export interface ProfileSummary {
  totalMs: number;
  topSelf: FunctionCost[];
  topTotal: FunctionCost[];
  /** Self time by source file (or category such as "(garbage collector)"). */
  byFile: { file: string; selfMs: number }[];
}

export async function startProfile(cdp: CDPSession): Promise<void> {
  await cdp.send("Profiler.enable");
  // 200 us between samples: fine enough for frames of a few ms.
  await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
  await cdp.send("Profiler.start");
}

export async function stopProfile(cdp: CDPSession): Promise<CpuProfile> {
  const { profile } = (await cdp.send("Profiler.stop")) as { profile: CpuProfile };
  await cdp.send("Profiler.disable");
  return profile;
}

/**
 * A source path from a sourcemap as a path from the repo root: the build
 * lives outside the repo, so the maps point up and out of it.
 */
export function repoPath(source: string): string {
  const s = source.replace(/\\/g, "/");
  const nm = s.lastIndexOf("node_modules/");
  if (nm >= 0) return s.slice(nm);
  const m = /(?:^|\/)((?:src|server|parity)\/.*)$/.exec(s);
  return m ? (m[1] as string) : s.replace(/^(\.\.\/)+/, "");
}

/** Maps bundle positions to sources, reading `<file>.map` from the build folder. */
class SourceMaps {
  private readonly maps = new Map<string, TraceMap | null>();
  private readonly buildDir: string;
  constructor(buildDir: string) {
    this.buildDir = buildDir;
  }

  private mapFor(url: string): TraceMap | null {
    if (this.maps.has(url)) return this.maps.get(url) ?? null;
    let map: TraceMap | null = null;
    try {
      const pathname = new URL(url).pathname;
      const file = path.join(this.buildDir, decodeURIComponent(pathname)) + ".map";
      if (fs.existsSync(file)) map = new TraceMap(fs.readFileSync(file, "utf8"));
    } catch {
      map = null;
    }
    this.maps.set(url, map);
    return map;
  }

  resolve(frame: CallFrame): { name: string; file: string; line: number } {
    const fallbackName = frame.functionName || "(anonymous)";
    if (!frame.url)
      return {
        name: fallbackName,
        file: fallbackName.startsWith("(") ? fallbackName : "(native)",
        line: 0,
      };
    const map = this.mapFor(frame.url);
    if (!map) return { name: fallbackName, file: frame.url, line: frame.lineNumber + 1 };
    const pos = originalPositionFor(map, {
      line: frame.lineNumber + 1,
      column: frame.columnNumber,
    });
    if (!pos.source) return { name: fallbackName, file: frame.url, line: frame.lineNumber + 1 };
    const file = repoPath(pos.source);
    // The function's name in the sources is at its start; the minified
    // name is the fallback.
    return { name: pos.name || fallbackName, file, line: pos.line ?? 0 };
  }
}

export function summarise(profile: CpuProfile, buildDir: string, top = 15): ProfileSummary {
  const maps = new SourceMaps(buildDir);
  const byId = new Map<number, ProfileNode>();
  const parent = new Map<number, number>();
  for (const node of profile.nodes) {
    byId.set(node.id, node);
    for (const child of node.children ?? []) parent.set(child, node.id);
  }
  const keyOf = new Map<number, string>();
  const info = new Map<string, { name: string; where: string; file: string }>();
  for (const node of profile.nodes) {
    const r = maps.resolve(node.callFrame);
    const where = r.line ? `${r.file}:${r.line}` : r.file;
    const key = `${r.name}@${where}`;
    keyOf.set(node.id, key);
    if (!info.has(key)) info.set(key, { name: r.name, where, file: r.file });
  }
  const self = new Map<string, number>();
  const total = new Map<string, number>();
  const fileSelf = new Map<string, number>();
  let all = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const ms = (profile.timeDeltas[i + 1] ?? profile.timeDeltas[i] ?? 0) / 1000;
    const id = profile.samples[i] as number;
    const key = keyOf.get(id) as string;
    if (key.startsWith("(idle)")) continue;
    all += ms;
    self.set(key, (self.get(key) ?? 0) + ms);
    const file = info.get(key)?.file ?? "?";
    fileSelf.set(file, (fileSelf.get(file) ?? 0) + ms);
    // Total time: each function once per sample, however deep it recurses.
    const onStack = new Set<string>();
    for (let n: number | undefined = id; n !== undefined; n = parent.get(n)) {
      onStack.add(keyOf.get(n) as string);
    }
    for (const k of onStack) total.set(k, (total.get(k) ?? 0) + ms);
  }
  const rows = (m: Map<string, number>): FunctionCost[] =>
    [...m.entries()]
      .filter(([k]) => !/^\((root|program|idle)\)/.test(k))
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([k]) => {
        const i = info.get(k) as { name: string; where: string };
        return {
          name: i.name,
          where: i.where,
          selfMs: self.get(k) ?? 0,
          totalMs: total.get(k) ?? 0,
        };
      });
  return {
    totalMs: all,
    topSelf: rows(self),
    topTotal: rows(total).filter((r) => !r.where.startsWith("(")),
    byFile: [...fileSelf.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([file, selfMs]) => ({ file, selfMs })),
  };
}
