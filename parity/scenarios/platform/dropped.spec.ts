// Group "dropped": server routes, the WebSocket, startup traffic, storage
// and UI that only exist for the old license, subscription and cloud code,
// and the developer mods. The rewrite drops them (PORT-PLAN, QUESTIONS
// Q-010), so the old app is recorded as usual to document what it did,
// and for the new app each scenario's removedInNewApp check runs instead
// of the comparison: routes answer 404, the WebSocket upgrade is refused,
// startup makes none of these requests or writes, and no menu item or DOM
// node of the feature is left. Behaviour the rewrite keeps lives in the
// other platform files (the online probe in server.spec.ts, for example).
import type { Page } from "@playwright/test";
import { openApp, type AppKind } from "../../support/apps.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  base,
  clickMenu,
  drawSample,
  installFsaStub,
  localStorageEntries,
  parseStored,
  recordResponse,
  reopen,
  settle,
  sortKeys,
  stripOrigin,
  visibleDialogs,
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

/** GET /user variants (the fake cloud profile); PUT /user stays (server.spec.ts). */
const PROFILE_QUERIES = ["?public=0&lang=1", "?lang=0", "?lang=14", "?lang=de-DE", "?lang=99", ""];

/** Same-origin API paths only the dropped code requests (method and path). */
const DROPPED_REQUEST =
  /^(GET|HEAD|POST|PUT) \/(license|subscription|quota|ever-subscribed|total-subscription-days|pro\/paywall|file|share|store|user\/settings)(\/|\?|$)|^GET \/user(\?|$)|autosave/i;

/** localStorage keys and cookies the old app writes for license, update check and analytics. */
const DROPPED_STORAGE_KEYS = [
  "offline_cache",
  "last_update_check",
  "old_version",
  "enabled_subscriptions",
  "gtm:clientid",
  "_gcl_ls",
];
const DROPPED_COOKIES = ["_ginst", "_gdt", "_gcoupon", "_gdesignerv", "_ga", "_gid", "_gcl_au"];

/** Files panel, cloud account and auth keys (UI-STORAGE-008, UI-STORAGE-009). */
const CLOUD_KEY =
  /^(designer\.filespanel\.|googleapi_auth|msteams\.authentication|sp_getToken|adal\.)/;

/** Static files, which startup-traffic leaves out (the app's own bundles differ by build). */
const STATIC_FILE = /\.(css|png|svg|gif|jpg|cur|woff2?|ttf|otf|ico|json)(\?|$)/;

async function assertAllNotFound(page: Page, kind: AppKind, routes: readonly string[]) {
  const wrong: string[] = [];
  for (const route of routes) {
    const r = await page.request.get(base(kind) + route, { maxRedirects: 0 });
    if (r.status() !== 404) wrong.push(`${route} answered ${r.status()}`);
  }
  if (wrong.length > 0) throw new Error(`dropped routes still answer:\n${wrong.join("\n")}`);
}

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
async function websocketExchange(page: Page, kind: AppKind): Promise<WsExchange> {
  const wsBase = base(kind).replace(/^http/, "ws");
  return page.evaluate(async (url) => {
    // Opens a socket, then sends each message and records the reply it got
    // within the wait time (null: no reply). The server answers at once, so
    // the wait only runs out for messages it ignores.
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

type WsExchange = Record<string, { opened: boolean }>;

interface Traffic {
  requests: string[];
  websockets: string[];
  framesReceived: string[];
}

/**
 * Loads the app (with `query` in the URL) and records every same-origin
 * request except static files, and every WebSocket, until the app is
 * ready, `until` (if given) has been requested, and no request was made
 * for a second. A set, sorted: parallel fetches arrive in any order and
 * some repeat a varying number of times.
 */
async function startupTraffic(
  page: Page,
  kind: AppKind,
  options: { query?: string; until?: RegExp } = {},
): Promise<Traffic> {
  const requests = new Set<string>();
  const sockets = new Set<string>();
  const frames: string[] = [];
  const origin = base(kind);
  let last = Date.now();
  const onRequest = (r: { url(): string; method(): string }) => {
    last = Date.now();
    const url = r.url();
    if (!url.startsWith(origin)) return;
    const p = url.slice(origin.length);
    if (STATIC_FILE.test(p)) return;
    requests.add(`${r.method()} ${stripOrigin(kind, p)}`);
  };
  page.on("request", onRequest);
  page.on("websocket", (ws) => {
    sockets.add(stripOrigin(kind, ws.url()));
    ws.on("framereceived", (f) => frames.push(String(f.payload)));
  });
  const until = options.until ? page.waitForRequest(options.until, { timeout: 90_000 }) : null;
  if (options.query) {
    await page.goto(`${origin}/${options.query}`);
    await page.locator("nav.g-menu-bar").waitFor({ timeout: 60_000 });
  } else {
    await openApp(page, kind, { newDocument: false });
  }
  if (until) await until;
  while (Date.now() - last < 1000) await page.waitForTimeout(100);
  page.off("request", onRequest);
  return {
    requests: [...requests].sort(),
    websockets: [...sockets].sort(),
    framesReceived: frames,
  };
}

function assertNoDroppedTraffic(traffic: Traffic, label: string): void {
  const found = traffic.requests.filter((r) => DROPPED_REQUEST.test(r));
  if (found.length > 0 || traffic.websockets.length > 0) {
    throw new Error(
      `${label}: the dropped license/cloud code still talks to the server:\n` +
        [...found, ...traffic.websockets.map((w) => `WebSocket ${w}`)].join("\n"),
    );
  }
}

/** The visible text of the account section in the header (cloud login). */
async function loginSection(page: Page): Promise<unknown> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("#header .section.login")].map((e) => ({
      className: e.className,
      visible: e.offsetParent !== null,
      text: e.innerText.trim(),
    })),
  );
}

/** Traces of the cloud UI anywhere in the page: login section, cloud icons, cloud buttons. */
async function cloudTraces(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const e of document.querySelectorAll<HTMLElement>(
      "#header .section.login, [class*='gravit-cloud'], [class*='cloud-drive'], .g-files-panel",
    )) {
      if (e.offsetParent !== null) out.push(`${e.tagName.toLowerCase()}.${e.className}`);
    }
    // Any visible text that offers the cloud, an account or a subscription.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.trim() ?? "";
      const parent = n.parentElement;
      if (!text || !parent || parent.offsetParent === null) continue;
      if (/cloud|sign in|log in|subscri|upgrade/i.test(text)) out.push(`"${text}"`);
    }
    return out;
  });
}

/** URL parameters the old app turns into cloud open requests at startup. */
const URL_OPEN_CASES = [
  { query: "?d=abc123", until: /\/file\/abc123/ },
  { query: "?token=tok123", until: /\/share\/tok123\// },
  { query: "?storeContent=1", until: /\/store\/v1\/content\// },
  { query: "?directlink=https%3A%2F%2Fexample.invalid%2Fx.gvdesign", until: /\/file\?/ },
] as const;

const MOD = {
  name: "Parity mod",
  code: "function (shapes) { window.__parityModRan = shapes.length; }",
  id: "paritymod1",
};

/** Seeds the developer mod keys and reloads. */
async function seedMods(page: Page, kind: AppKind): Promise<void> {
  await page.evaluate((mod) => {
    localStorage.setItem("enable_mods", "1");
    localStorage.setItem("designer.custom", JSON.stringify([mod]));
  }, MOD);
  await reopen(page, kind, { newDocument: true });
  await settle(page);
}

/** The toolbar's "Add custom button" and the custom mod buttons (by their titles). */
async function modButtons(page: Page): Promise<{ addButton: number; custom: string[] }> {
  return page.evaluate(() => ({
    addButton: document.querySelectorAll(
      '#toolbar .toolbar-button > .action-button[data-title="Add custom button"]',
    ).length,
    custom: [
      ...document.querySelectorAll<HTMLElement>("#toolbar .custom_codes_button > .action-button"),
    ].map((b) => b.getAttribute("data-title") ?? ""),
  }));
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
    removedInNewApp: async ({ page, kind }) => assertAllNotFound(page, kind, DROPPED_ROUTES),
  },
  {
    id: "platform/dropped/user-profile",
    covers: ["FMT-SERVER-017"],
    kind: "json",
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const query of PROFILE_QUERIES) {
        const r = await recordResponse(page, kind, `/user${query}`, { body: "json" });
        out.push({ ...r, body: normalizeProfile(r.body) });
      }
      return out;
    },
    removedInNewApp: async ({ page, kind }) =>
      assertAllNotFound(
        page,
        kind,
        PROFILE_QUERIES.map((q) => `/user${q}`),
      ),
  },
  {
    id: "platform/dropped/license-websocket",
    covers: ["FMT-WS-001"],
    kind: "json",
    driver: async ({ page, kind }) => websocketExchange(page, kind),
    removedInNewApp: async ({ page, kind }) => {
      const exchange = await websocketExchange(page, kind);
      const opened = Object.entries(exchange).filter(([, r]) => r.opened);
      if (opened.length > 0) {
        throw new Error(`WebSocket upgrade accepted for ${opened.map(([k]) => k).join(", ")}`);
      }
    },
  },
  {
    id: "platform/dropped/startup-traffic",
    covers: ["FMT-WS-002", "FMT-AUTOSAVE-001", "FMT-WORKER-001"],
    kind: "json",
    open: { newDocument: false },
    // Everything the old app requests while it starts (static files left
    // out), the license WebSocket and its greeting. The recent-files
    // request (GET /file?...) comes last, shortly after ready.
    driver: async ({ page, kind }) => startupTraffic(page, kind, { until: /\/file\?/ }),
    removedInNewApp: async ({ page, kind }) =>
      assertNoDroppedTraffic(await startupTraffic(page, kind), "startup"),
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
        (keys) => keys.every((k) => localStorage.getItem(k) !== null),
        ["last_update_check", "old_version", "offline_cache", "enabled_subscriptions"],
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
    removedInNewApp: async ({ page, kind }) => {
      // Let startup finish its requests first, then look at what it wrote.
      await startupTraffic(page, kind);
      const entries = await localStorageEntries(page);
      const keys = DROPPED_STORAGE_KEYS.filter((k) => k in entries);
      const cookies = (await page.evaluate(() => document.cookie))
        .split("; ")
        .map((c) => c.split("=")[0] ?? "")
        .filter((name) => DROPPED_COOKIES.includes(name));
      if (keys.length > 0 || cookies.length > 0) {
        throw new Error(
          `license/analytics data still written: ${[...keys, ...cookies.map((c) => `cookie ${c}`)].join(", ")}`,
        );
      }
    },
  },
  {
    id: "platform/dropped/cloud-ui",
    covers: ["FMT-STORAGE-019", "UI-STORAGE-008", "UI-STORAGE-009"],
    kind: "json",
    open: { fileSystemAccess: true },
    // The cloud parts of the UI: File > Save on a new document asks "file
    // or cloud", and the header has an account section. None of the files
    // panel or auth keys are written.
    driver: async ({ page, kind }) => {
      await installFsaStub(page);
      await reopen(page, kind, { newDocument: true, fileSystemAccess: true });
      await drawSample(page);
      const header = await loginSection(page);
      await clickMenu(page, ["File", "Save"]);
      await page.locator(".g-save-chooser-dialog").waitFor();
      const chooser = await visibleDialogs(page);
      const traces = await cloudTraces(page);
      const keys = Object.keys(await localStorageEntries(page)).filter((k) => CLOUD_KEY.test(k));
      return { header, chooser, traces, cloudKeys: keys };
    },
    removedInNewApp: async ({ page, kind }) => {
      await installFsaStub(page);
      await reopen(page, kind, { newDocument: true, fileSystemAccess: true });
      await drawSample(page);
      await clickMenu(page, ["File", "Save"]);
      await settle(page);
      const traces = await cloudTraces(page);
      const keys = Object.keys(await localStorageEntries(page)).filter((k) => CLOUD_KEY.test(k));
      if (traces.length > 0 || keys.length > 0) {
        throw new Error(`cloud UI or storage left: ${[...traces, ...keys].join(", ")}`);
      }
    },
  },
  {
    id: "platform/dropped/url-open-requests",
    covers: ["FMT-STORAGE-018"],
    kind: "json",
    open: { newDocument: false },
    // ?d=, ?token=, ?storeContent= and ?directlink= in the start URL: the
    // old app asks the cloud API for the file and shows "can't be
    // accessed" (our server has no such routes) or opens an empty document.
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const c of URL_OPEN_CASES) {
        const traffic = await startupTraffic(page, kind, { query: c.query, until: c.until });
        await settle(page);
        out.push({
          query: c.query,
          requests: traffic.requests.filter((r) => /\/(file|share|store)\b/.test(r)),
          tabs: await page.locator("#header .tabs .tab .title .cover").allTextContents(),
          dialogs: (await visibleDialogs(page)).map((d) => d.className).sort(),
          url: stripOrigin(kind, page.url()),
        });
      }
      return out;
    },
    removedInNewApp: async ({ page, kind }) => {
      for (const c of URL_OPEN_CASES) {
        const traffic = await startupTraffic(page, kind, { query: c.query });
        assertNoDroppedTraffic(traffic, c.query);
        const tabs = await page.locator("#header .tabs .tab .title .cover").allTextContents();
        const dialogs = await page.locator(".g-file-can-not-be-found-dialog").count();
        if (tabs.some((t) => /abc123|tok123|^1$/.test(t)) || dialogs > 0) {
          throw new Error(`${c.query} still opens a cloud file: tabs ${tabs.join(", ")}`);
        }
      }
    },
  },
  {
    id: "platform/dropped/dev-mods",
    covers: ["UI-STORAGE-011"],
    kind: "json",
    // Developer mods: with localStorage "enable_mods" set, the toolbar has
    // "Add custom button", and every entry of "designer.custom" becomes a
    // toolbar button that evals its code with the selection, the scene and
    // three webpack modules. Dropped: it runs arbitrary stored code against
    // old internals.
    driver: async ({ page, kind }) => {
      await seedMods(page, kind);
      const toolbar = await modButtons(page);
      await drawSample(page);
      await page.keyboard.press("Control+a");
      await page.locator("#toolbar .custom_codes_button .action-button").first().click();
      const ran = await page.evaluate(
        () => (window as unknown as { __parityModRan?: number }).__parityModRan ?? null,
      );
      return { toolbar, ranWithSelection: ran };
    },
    removedInNewApp: async ({ page, kind }) => {
      await seedMods(page, kind);
      const left = await modButtons(page);
      if (left.addButton + left.custom.length > 0) {
        throw new Error(`developer mod buttons are still in the toolbar: ${JSON.stringify(left)}`);
      }
    },
  },
]);

paritySuite("platform dropped", scenarios, { newApp: false });
