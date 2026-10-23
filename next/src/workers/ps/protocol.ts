// The messages between the EPS importer and the PostScript worker (old
// public/ps.worker.js, FMT-WORKER-002).
//
// Page → worker: `{func, data}` calls a worker function with `data` as its
// arguments ("init" with [bytes, options], then "run" with []). The worker
// answers each call with `{error: 0, result, call}` or an error code:
//   -1 no `func` field, -2 no such function, -3 no `data` field.
// Worker → page: `{func, data}` for paint calls and status ("progress",
// "fill", "stroke", "rectfill", "shfill", "drawImage", "show", "jpeg",
// "error", "done"); "jpeg" also carries `result`, a SharedArrayBuffer the
// page fills before it notifies the waiting worker (see ./jpeg.ts).
import type { PSInitOptions } from "./interpreter.ts";

export interface PSWorkerCall {
  func?: string;
  data?: unknown[];
}

export type PSWorkerReply =
  { error: 0; result: unknown; call: PSWorkerCall } | { error: -1 | -2 | -3; errorStr: string };

export type PSInitArguments = [input: Uint8Array, options: PSInitOptions];
