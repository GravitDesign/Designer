import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROOT } from "./paths.ts";

/**
 * The old app's service workers (public/cacher.js, public/service-worker.js)
 * are replaced by ones that remove themselves. Each runs here in a fake
 * service worker scope.
 */
async function activate(name: string) {
  const source = fs.readFileSync(path.join(APP_ROOT, "public", name), "utf8");
  const listeners = new Map<string, (event: unknown) => void>();
  const caches = new Map([
    ["gravit-designer-precache", {}],
    ["designer-cache-v1", {}],
  ]);
  const navigated: string[] = [];
  let skipped = false;
  let unregistered = false;
  const self = {
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      listeners.set(type, listener),
    skipWaiting: () => (skipped = true),
    registration: { unregister: async () => (unregistered = true) },
    clients: {
      matchAll: async () => [
        { url: "https://gravitdesign.com/", navigate: (url: string) => navigated.push(url) },
      ],
    },
  };
  const cacheStorage = {
    keys: async () => [...caches.keys()],
    delete: async (key: string) => caches.delete(key),
  };
  new Function("self", "caches", source)(self, cacheStorage);
  listeners.get("install")?.({});
  let done: Promise<unknown> = Promise.resolve();
  listeners.get("activate")?.({ waitUntil: (promise: Promise<unknown>) => (done = promise) });
  await done;
  return { skipped, unregistered, caches: [...caches.keys()], navigated };
}

describe("the old app's service workers", () => {
  for (const name of ["cacher.js", "service-worker.js"]) {
    it(`${name} clears the old caches, removes itself and reloads the open tabs`, async () => {
      expect(await activate(name)).toEqual({
        skipped: true,
        unregistered: true,
        caches: [],
        navigated: ["https://gravitdesign.com/"],
      });
    });
  }
});
