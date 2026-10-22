// Group "dropped": server routes, the WebSocket and startup traffic that
// only exist for the old license, subscription and cloud code. The rewrite
// drops them, so these recordings document what the old server did, and
// the new app must NOT match them: for the new server every route here
// should answer 404 and the WebSocket should refuse the upgrade. See the
// harness request in the platform report (a "dropped" scenario flag).
import type { Page } from "@playwright/test";
import type { AppKind } from "../../support/apps.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  base,
  localStorageEntries,
  parseStored,
  recordResponse,
  sortKeys,
  stripOrigin,
} from "./lib.ts";

/** Routes in server.js and routes/user.js that serve the license and cloud code. */
const DROPPED_ROUTES = [
  "/license",
  "/license?lang=1",
  "/subscription/test?lang=1",
  "/subscription/nextbillingdate",
  "/subscription/lifetime",
  "/quota",
  "/ever-subscribed",
  "/total-subscription-days",
  "/pro/paywall/upgrade",
  "/file?type=application%2Fgravit%2Bdesign&accessed=true&sort=-accessed&parent=*&limit=10&lang=1",
  "/user/settings?lang=1",
  // Android TWA link (FMT-PWA-007); express.static ignores dot folders by
  // default, so even the old server answers 404.
  "/.well-known/assetlinks.json",
] as const;

/**
 * GET /user answers the fake profile. last_seen and last_update are the
 * server's start time (new Date() when routes/user.js loads), so they are
 * replaced with "<server start>" when they are ISO date strings.
 */
function normalizeProfile(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const out = { ...(value as Record<string, unknown>) };
  for (const key of ["last_seen", "last_update"]) {
    if (typeof out[key] === "string" && !Number.isNaN(Date.parse(out[key]))) {
      out[key] = "<server start>";
    }
  }
  return out;
}

/** The WebSocket at /license/license: greeting, ping/pong and a wrong path. */
async function websocketExchange(page: Page, kind: AppKind): Promise<unknown> {
  const wsBase = base(kind).replace(/^http/, "ws");
  return page.evaluate(async (url) => {
    // Opens a socket, then sends each message and records the reply it got
    // within the wait time (null: no reply). The server answers at once, so
    // 2 s only matters for messages it ignores.
    const talk = async (path: string, sends: string[]) => {
      const ws = new WebSocket(url + path);
      const queue: string[] = [];
      let waiter: ((v: string | null) => void) | null = null;
      let closeCode: number | null = null;
      ws.onmessage = (e) => {
        const w = waiter;
        waiter = null;
        if (w) w(String(e.data));
        else queue.push(String(e.data));
      };
      const next = (ms: number) =>
        new Promise<string | null>((resolve) => {
          const queued = queue.shift();
          if (queued !== undefined) return resolve(queued);
          const timer = setTimeout(() => {
            waiter = null;
            resolve(null);
          }, ms);
          waiter = (v) => {
            clearTimeout(timer);
            resolve(v);
          };
        });
      const opened = await new Promise<boolean>((resolve) => {
        ws.onopen = () => resolve(true);
        // A refused upgrade fires error, then close (code 1006); wait for close.
        ws.onclose = (e) => {
          closeCode = e.code;
          resolve(false);
        };
      });
      if (!opened) return { opened, closeCode };
      const greeting = await next(2000);
      const replies: { sent: string; reply: string | null }[] = [];
      for (const sent of sends) {
        ws.send(sent);
        replies.push({ sent, reply: await next(sent === "garbage" ? 500 : 2000) });
      }
      ws.close();
      return { opened, greeting, replies };
    };
    return {
      license: await talk("/license/license?lang=1", [
        "ping",
        '{"name":"ping"}',
        "garbage",
        "ping",
      ]),
      licenseNoQuery: await talk("/license/license", []),
      wrongPath: await talk("/license?lang=1", []),
    };
  }, wsBase);
}

const scenarios = defineScenarios([
  {
    id: "platform/dropped/license-routes",
    covers: [
      "FMT-SERVER-007",
      "FMT-SERVER-008",
      "FMT-SERVER-009",
      "FMT-SERVER-010",
      "FMT-SERVER-011",
      "FMT-SERVER-012",
      "FMT-SERVER-013",
      "FMT-SERVER-016",
      "FMT-PWA-007",
    ],
    kind: "json",
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const route of DROPPED_ROUTES) {
        const r = await recordResponse(page, kind, route);
        // Keep JSON bodies readable; the paywall answers an empty text body.
        if (typeof r.body === "string" && /json/.test(String(r["content-type"]))) {
          r.body = JSON.parse(r.body) as unknown;
        }
        out.push(r);
      }
      return out;
    },
  },
  {
    id: "platform/dropped/user-profile",
    covers: ["FMT-SERVER-017", "FMT-SERVER-019", "FMT-SERVER-020"],
    kind: "json",
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const query of [
        "?public=0&lang=1",
        "?lang=0",
        "?lang=14",
        "?lang=de-DE",
        "?lang=99",
        "",
      ]) {
        const r = await recordResponse(page, kind, `/user${query}`, { body: "json" });
        out.push({ ...r, body: normalizeProfile(r.body) });
      }
      return out;
    },
  },
  {
    id: "platform/dropped/license-websocket",
    covers: ["FMT-WS-001"],
    kind: "json",
    driver: async ({ page, kind }) => websocketExchange(page, kind),
  },
  {
    id: "platform/dropped/startup-traffic",
    covers: [
      "FMT-WS-002",
      "FMT-SERVER-020",
      "FMT-SERVER-004",
      "FMT-AUTOSAVE-001",
      "FMT-WORKER-001",
    ],
    kind: "json",
    // Every same-origin request (except static assets) and WebSocket the
    // old app makes while it starts, as a sorted set: parallel fetches
    // arrive in any order and some (GET /user, /file) repeat a varying
    // number of times. The new app keeps only the online probe.
    driver: async ({ page, kind }) => {
      const requests = new Set<string>();
      const sockets = new Set<string>();
      const frames: string[] = [];
      const origin = base(kind);
      page.on("request", (r) => {
        const url = r.url();
        if (!url.startsWith(origin)) return;
        const p = url.slice(origin.length);
        if (/\.(css|png|svg|gif|jpg|woff2?|ttf|otf|ico|json)(\?|$)/.test(p)) return;
        requests.add(`${r.method()} ${stripOrigin(kind, p)}`);
      });
      page.on("websocket", (ws) => {
        sockets.add(stripOrigin(kind, ws.url()));
        ws.on("framereceived", (f) => frames.push(String(f.payload)));
      });
      await page.reload();
      await page.waitForFunction(() => {
        const d = (window as unknown as { gDesigner?: { isReady?: () => boolean } }).gDesigner;
        return !!d && typeof d.isReady === "function" && d.isReady();
      });
      // The autosave worker and the recent-files /file request come shortly
      // after ready; wait for the last of them, then a quiet period.
      await page.waitForFunction(
        () => performance.getEntriesByType("resource").some((e) => /\/file\?/.test(e.name)),
        null,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(1500);
      return {
        requests: [...requests].sort(),
        websockets: [...sockets].sort(),
        framesReceived: frames,
      };
    },
  },
  {
    id: "platform/dropped/startup-storage",
    covers: [
      "RUN-STORAGE-003",
      "RUN-STORAGE-004",
      "RUN-STORAGE-005",
      "RUN-STORAGE-006",
      "RUN-STORAGE-007",
      "RUN-STORAGE-011",
      "UI-STORAGE-005",
      "UI-STORAGE-010",
      "UI-STORAGE-013",
    ],
    kind: "json",
    // License, update and analytics data the old app writes on startup.
    // Time stamps and the profile's server start time are replaced with
    // placeholders after checking their type.
    driver: async ({ page }) => {
      await page.waitForFunction(
        () =>
          ["last_update_check", "old_version", "offline_cache", "enabled_subscriptions"].every(
            (k) => localStorage.getItem(k) !== null,
          ),
        null,
        { timeout: 30_000 },
      );
      const entries = await localStorageEntries(page);
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(entries).sort()) {
        if (key === "designer.settings") continue; // user data, see storage.spec.ts
        const raw = entries[key] ?? "";
        if (key === "last_update_check") {
          out[key] = /^\d{13}$/.test(raw) ? "<epoch ms string>" : raw;
          continue;
        }
        const value = parseStored(raw);
        if (key === "offline_cache" && value && typeof value === "object") {
          const v = { ...(value as Record<string, unknown>) };
          if (typeof v.lastUpdate === "string" && !Number.isNaN(Date.parse(v.lastUpdate))) {
            v.lastUpdate = "<ISO time>";
          }
          v.user = normalizeProfile(v.user);
          out[key] = { raw: "(JSON)", value: sortKeys(v) };
          continue;
        }
        out[key] = { raw, value };
      }
      const cookies = await page.evaluate(() => document.cookie);
      const sessionKeys = await page.evaluate(() => Object.keys(sessionStorage).sort());
      return {
        localStorage: out,
        cookies: cookies.split("; ").sort(),
        sessionStorage: sessionKeys,
      };
    },
  },
]);

paritySuite("platform dropped", scenarios, { newApp: false });
