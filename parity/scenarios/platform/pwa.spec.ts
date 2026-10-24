// Progressive web app parts: the manifest, what index.html declares, the
// service worker the app registers (and what it caches), and the install
// prompt with its throttling keys in localStorage.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  base,
  clickMenu,
  menuState,
  recordResponse,
  reopen,
  settle,
  stripOrigin,
  waitForStartupWrites,
} from "./lib.ts";

/** Visible dialogs, by class name. */
async function visibleDialogs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".g-dialog")]
      .filter((d) => d.offsetParent !== null)
      .map((d) => d.className)
      .sort(),
  );
}

/** The File menu entry "Install to Desktop": present, enabled. */
async function installMenuItem(page: Page): Promise<unknown> {
  return (await menuState(page, ["File"]))
    .filter((i) => i.caption === "Install to Desktop")
    .map((i) => ({ disabled: i.disabled }));
}

/**
 * The page clock is fixed at this time in the install-prompt scenarios, so
 * the time stamps the throttle keys hold are exact.
 */
const NOW = Date.UTC(2026, 0, 5, 10, 0, 0);

/** The two PWA throttle keys as stored (raw strings). */
async function pwaKeys(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const out: Record<string, string | null> = {};
    for (const key of [
      "pwa.closed-install-pwa-dialog-date",
      "pwa.show-install-dialog-3-times-a-week",
    ]) {
      out[key] = localStorage.getItem(key);
    }
    return out;
  });
}

/** Fires a synthetic beforeinstallprompt whose prompt() resolves with `outcome`. */
async function firePrompt(page: Page, outcome: "accepted" | "dismissed"): Promise<void> {
  await page.evaluate((o) => {
    const w = window as unknown as { __promptCalls?: number };
    w.__promptCalls ??= 0;
    const e = new Event("beforeinstallprompt") as Event & { prompt(): Promise<unknown> };
    e.prompt = () => {
      w.__promptCalls = (w.__promptCalls ?? 0) + 1;
      return Promise.resolve({ outcome: o });
    };
    window.dispatchEvent(e);
  }, outcome);
  await settle(page);
}

const scenarios = defineScenarios([
  {
    id: "platform/pwa/manifest",
    covers: ["FMT-PWA-001"],
    kind: "json",
    // manifest.json as served, and every icon it names.
    driver: async ({ page, kind }) => {
      const manifest = await recordResponse(page, kind, "/manifest.json", { body: "json" });
      const icons = ((manifest.body as { icons?: { src: string }[] } | undefined)?.icons ?? []).map(
        (i) => i.src,
      );
      const served: unknown[] = [];
      for (const src of icons)
        served.push(await recordResponse(page, kind, `/${src}`, { body: "hash" }));
      return { manifest, icons: served };
    },
  },
  {
    id: "platform/pwa/index-head",
    covers: ["FMT-PWA-002"],
    kind: "json",
    // What index.html declares for installation: the manifest link, title,
    // theme colour and the og: tags (parsed from the served file, not the
    // live DOM, which the app changes).
    driver: async ({ page, kind }) => {
      const head = await page.evaluate(async () => {
        const text = await (await fetch("/index.html")).text();
        const doc = new DOMParser().parseFromString(text, "text/html");
        const attrs = (e: Element) =>
          Object.fromEntries([...e.attributes].map((a) => [a.name, a.value]));
        return {
          title: doc.title,
          manifest: [...doc.querySelectorAll('link[rel="manifest"]')].map(attrs),
          icons: [...doc.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map(
            attrs,
          ),
          meta: [...doc.querySelectorAll("meta[name], meta[property]")].map(attrs),
        };
      });
      return JSON.parse(stripOrigin(kind, JSON.stringify(head))) as unknown;
    },
  },
  {
    id: "platform/pwa/service-worker",
    covers: ["FMT-SW-001", "FMT-SW-003", "FMT-SW-004", "RUN-STORAGE-010"],
    kind: "json",
    timeout: 120_000,
    // Which worker the app registers, when, with what result, and what
    // ends up in Cache Storage. The old app registers /cacher.js 15 s after
    // start; cacher.js imports Workbox from a CDN, which the test blocks
    // (no network), so the registration fails and nothing is cached.
    driver: async ({ page, kind }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __swLog: unknown[] };
        w.__swLog = [];
        const sw = navigator.serviceWorker;
        const original = sw.register.bind(sw);
        sw.register = (url: string | URL, options?: RegistrationOptions) => {
          const entry: Record<string, unknown> = {
            script: String(url),
            options: options ?? null,
            // Seconds after navigation, in 5 s steps (the old app waits 15 s).
            afterSeconds: Math.floor(performance.now() / 5000) * 5,
          };
          w.__swLog.push(entry);
          const p = original(url, options);
          p.then(
            (r) => {
              entry.result = { scope: r.scope };
            },
            (e: unknown) => {
              entry.result = { error: e instanceof Error ? e.name : String(e) };
            },
          );
          return p;
        };
      });
      await reopen(page, kind, { newDocument: true });
      await page.waitForFunction(
        () => {
          const log = (window as unknown as { __swLog: { result?: unknown }[] }).__swLog;
          return log.length > 0 && log.every((e) => e.result);
        },
        null,
        { timeout: 60_000, polling: 500 },
      );
      const state = await page.evaluate(async () => ({
        registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => ({
          scope: r.scope,
          active: r.active?.scriptURL ?? null,
          waiting: r.waiting?.scriptURL ?? null,
          installing: r.installing?.scriptURL ?? null,
        })),
        controller: navigator.serviceWorker.controller?.scriptURL ?? null,
        caches: (await caches.keys()).sort(),
        calls: (window as unknown as { __swLog: unknown[] }).__swLog,
      }));
      return JSON.parse(stripOrigin(kind, JSON.stringify(state))) as unknown;
    },
  },
  {
    id: "platform/pwa/cacher-precache",
    covers: ["FMT-SW-001", "FMT-SW-002"],
    kind: "json",
    // The service worker script the app registers, as served: the scripts
    // it imports, cache names, and the precache list (URLs sorted, the
    // revision reduced to its build suffix).
    driver: async ({ page, kind }) => {
      const response = await page.request.get(`${base(kind)}/cacher.js`);
      const text = await response.text();
      const imports = [...text.matchAll(/importScripts\(\s*([^)]*)\)/g)].map((m) => m[1]?.trim());
      const cacheNames =
        /setCacheNameDetails\(\s*(\{[^}]*\})/.exec(text)?.[1]?.replace(/\s+/g, " ") ?? null;
      const entries = [...text.matchAll(/revision:\s*"([0-9a-f]+)_(\d+)",\s*url:\s*"([^"]+)"/g)];
      const suffixes = [...new Set(entries.map((m) => m[2]))].sort();
      return {
        status: response.status(),
        contentType: response.headers()["content-type"] ?? null,
        imports,
        cacheNames,
        ignoresUrlParameters: /ignoreURLParametersMatching:\s*\[\/\.\*\/\]/.test(text),
        skipWaitingOnInstall: /addEventListener\("install"[\s\S]{0,80}skipWaiting\(\)/.test(text),
        revisionSuffixes: suffixes,
        precacheCount: entries.length,
        precacheUrls: entries.map((m) => m[3]).sort(),
      };
    },
  },
  {
    id: "platform/pwa/install-prompt",
    covers: ["FMT-PWA-003", "FMT-PWA-004", "FMT-PWA-005", "FMT-PWA-006", "UI-STORAGE-007"],
    kind: "json",
    // Three beforeinstallprompt events in a row (the install dialog opens
    // on the third within a week), then File > Install to Desktop with a
    // prompt the user accepts: the throttle keys are removed again.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      await page.clock.setFixedTime(NOW);
      const steps: Record<string, unknown>[] = [];
      steps.push({
        step: "start",
        menu: await installMenuItem(page),
        keys: await pwaKeys(page),
        dialogs: await visibleDialogs(page),
      });
      for (let i = 1; i <= 3; i++) {
        await firePrompt(page, "accepted");
        steps.push({
          step: `event ${i}`,
          keys: await pwaKeys(page),
          dialogs: await visibleDialogs(page),
        });
      }
      // Close whatever dialog opened, the way a user would.
      await page.keyboard.press("Escape");
      await settle(page);
      steps.push({
        step: "after Escape",
        keys: await pwaKeys(page),
        dialogs: await visibleDialogs(page),
      });
      steps.push({ step: "menu", menu: await installMenuItem(page) });
      await clickMenu(page, ["File", "Install to Desktop"]);
      await settle(page);
      steps.push({
        step: "File > Install to Desktop",
        promptCalls: await page.evaluate(
          () => (window as unknown as { __promptCalls?: number }).__promptCalls ?? 0,
        ),
        keys: await pwaKeys(page),
        dialogs: await visibleDialogs(page),
      });
      return steps;
    },
  },
  {
    id: "platform/pwa/install-prompt-closed-recently",
    covers: ["FMT-PWA-004", "UI-STORAGE-007"],
    kind: "json",
    // The install dialog was closed a day ago: the event only resets the
    // weekly counter and no dialog opens.
    driver: async ({ page, kind }) => {
      await page.evaluate((now) => {
        localStorage.setItem(
          "pwa.closed-install-pwa-dialog-date",
          JSON.stringify(now - 86_400_000),
        );
        localStorage.setItem(
          "pwa.show-install-dialog-3-times-a-week",
          JSON.stringify(JSON.stringify([now - 1000, now - 500])),
        );
      }, NOW);
      await reopen(page, kind, { newDocument: true });
      await waitForStartupWrites(page);
      await page.clock.setFixedTime(NOW);
      await firePrompt(page, "dismissed");
      return { keys: await pwaKeys(page), dialogs: await visibleDialogs(page) };
    },
  },
]);

paritySuite("platform pwa", scenarios, { newApp: false });
