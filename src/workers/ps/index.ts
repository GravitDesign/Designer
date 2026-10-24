// Starts a PostScript worker (see ps.worker.ts). The old importer loaded
// public/ps.worker.js, which pulled in the ps*.js scripts with
// importScripts; Vite bundles the module worker instead.

export function createPostScriptWorker(): Worker {
  return new Worker(new URL("./ps.worker.ts", import.meta.url), { type: "module" });
}
