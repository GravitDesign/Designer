// HTTP routes of the app server (server.js, routes/user.js): what each one
// answers, plus static file serving. Every request goes through
// Playwright's request API to the base URL of the app under test, so the
// same scenarios check the new server on its own port. The license,
// subscription and cloud routes are in dropped.spec.ts. The JSON stubs and
// PUT /user served only code the rewrite drops (the cloud maintenance
// check, translation downloads, the account locale, a request for "/null"),
// so the new server has none of them: their removedInNewApp checks expect
// 404. The old build's bundle files and its start-up online probe are
// replaced or gone too (REMOVED.md DROP-011 and DROP-012).
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { openApp, type AppKind } from "../../support/apps.ts";
import { EXPECTED_ROOT } from "../../support/env.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import { base, recordResponse } from "./lib.ts";

/** The static files the old index.html and the app load, plus the rest of public/. */
const STATIC_FILES = [
  "/",
  "/index.html",
  "/jquery.js",
  "/chunk.vendor.js",
  "/designer.browser.js",
  "/designer.browser.dev.js",
  "/designer.browser.light.css",
  "/designer.browser.dark.css",
  "/static.css",
  "/favicon.ico",
  "/manifest.json",
  "/cacher.js",
  "/service-worker.js",
  "/autosave.worker.js",
  "/pdf.worker.js",
  "/pdfexport.worker.js",
  "/ps.worker.js",
  "/proxy.html",
  "/assets/prerendered/icon512.png",
  "/assets/font/gravit-designer.ttf",
] as const;

/**
 * The files of STATIC_FILES the new build still serves under the old
 * name: the pages, the two theme stylesheets, the icon, the manifest and
 * the icon font. The rest were the old build's bundles, workers, service
 * workers and cloud pages, which the Vite build replaces (REMOVED.md
 * DROP-011).
 */
const KEPT_STATIC_FILES: ReadonlySet<string> = new Set([
  "/",
  "/index.html",
  "/designer.browser.light.css",
  "/designer.browser.dark.css",
  "/favicon.ico",
  "/manifest.json",
  "/assets/prerendered/icon512.png",
  "/assets/font/gravit-designer.ttf",
]);

/** The old bundle files the old index.html loaded. */
const OLD_BUNDLE_FILES = [
  "/jquery.js",
  "/chunk.vendor.js",
  "/designer.browser.js",
  "/designer.browser.dev.js",
];

function oldRecording(name: string): Record<string, unknown>[] {
  return JSON.parse(
    fs.readFileSync(path.join(EXPECTED_ROOT, "platform", "server", name + ".json"), "utf8"),
  ) as Record<string, unknown>[];
}

/**
 * DROP-011: the kept files answer exactly as the old server did, and the
 * replaced ones answer 404 (no stale copy of the old build is served).
 */
async function assertOldBuildReplaced(page: Page, kind: AppKind): Promise<void> {
  const old = new Map(oldRecording("static-files").map((r) => [r.request as string, r]));
  const wrong: string[] = [];
  for (const file of STATIC_FILES) {
    for (const method of ["GET", "HEAD"] as const) {
      const actual = await recordResponse(page, kind, file, { method, body: "none" });
      if (KEPT_STATIC_FILES.has(file)) {
        const expected = old.get(`${method} ${file}`);
        if (JSON.stringify(actual) !== JSON.stringify(expected))
          wrong.push(
            `${method} ${file}: ${JSON.stringify(actual)}, old ${JSON.stringify(expected)}`,
          );
      } else if (actual.status !== 404) {
        wrong.push(`${method} ${file} answered ${String(actual.status)}`);
      }
    }
  }
  if (wrong.length > 0) throw new Error(`static files differ:\n${wrong.join("\n")}`);
}

/** Same-origin files index.html references, in document order. */
async function indexReferences(
  page: Page,
): Promise<{ tag: string; rel: string | null; path: string }[]> {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'script[src], link[rel="stylesheet"][href], link[rel="manifest"], link[rel="modulepreload"]',
      ),
    ]
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        rel: e.getAttribute("rel"),
        url: new URL(e.getAttribute("src") ?? e.getAttribute("href") ?? "", location.href),
      }))
      .filter((r) => r.url.origin === location.origin)
      .map((r) => ({ tag: r.tag, rel: r.rel, path: r.url.pathname })),
  );
}

/**
 * DROP-011: the new index.html loads its own bundles. Every file it
 * references exists with a fitting content type, none of them is an old
 * bundle file, and the stylesheet and manifest links of the old index are
 * still there and served as before.
 */
async function assertIndexLoadsOwnBundles(page: Page, kind: AppKind): Promise<void> {
  const refs = await indexReferences(page);
  const wrong: string[] = [];
  const types: Record<string, string> = {
    script: "text/javascript; charset=utf-8",
    modulepreload: "text/javascript; charset=utf-8",
    stylesheet: "text/css; charset=utf-8",
    manifest: "application/json; charset=utf-8",
  };
  for (const ref of refs) {
    if (OLD_BUNDLE_FILES.includes(ref.path)) wrong.push(`${ref.path} is an old bundle file`);
    const r = await recordResponse(page, kind, ref.path, { body: "none" });
    const type = types[ref.tag === "script" ? "script" : (ref.rel ?? "")];
    if (r.status !== 200 || r["content-type"] !== type)
      wrong.push(`${ref.path} answered ${String(r.status)} ${String(r["content-type"])}`);
  }
  if (!refs.some((r) => r.tag === "script")) wrong.push("no script");
  for (const old of oldRecording("index-references").filter((r) => r.tag === "link")) {
    if (!refs.some((r) => r.tag === "link" && r.rel === old.rel && r.path === old.path)) {
      wrong.push(`no ${String(old.rel)} link to ${String(old.path)}`);
      continue;
    }
    const r = await recordResponse(page, kind, old.path as string, { body: "none" });
    const actual = {
      ...old,
      status: r.status,
      "content-type": r["content-type"],
      "cache-control": r["cache-control"] ?? null,
    };
    if (JSON.stringify(actual) !== JSON.stringify(old))
      wrong.push(`${String(old.path)}: ${JSON.stringify(actual)}, old ${JSON.stringify(old)}`);
  }
  if (wrong.length > 0) throw new Error(`index.html references:\n${wrong.join("\n")}`);
}

/** Every locale code the server knows (routes/user.js LANGUAGES), then odd inputs. */
const PUT_USER_LOCALES: readonly unknown[] = [
  ...Array.from({ length: 16 }, (_, i) => i),
  "0",
  "14",
  "de-DE",
  "DE-de",
  "en",
  "ja-JP",
  "sv-se",
  "de",
  "xx-XX",
  "",
  null,
];

/** Fails unless every request answers 404 (a route the new server doesn't have). */
async function assertNotFound(
  page: Page,
  kind: AppKind,
  requests: readonly { method: "GET" | "PUT"; path: string; data?: unknown }[],
): Promise<void> {
  const wrong: string[] = [];
  for (const r of requests) {
    const response = await page.request.fetch(base(kind) + r.path, {
      method: r.method,
      maxRedirects: 0,
      ...(r.data !== undefined ? { data: r.data as object } : {}),
    });
    if (response.status() !== 404)
      wrong.push(`${r.method} ${r.path} answered ${response.status()}`);
  }
  if (wrong.length > 0) throw new Error(`dropped routes still answer:\n${wrong.join("\n")}`);
}

const JSON_ROUTES = [
  "/maintenance/status?lang=0",
  "/maintenance/status",
  "/i18n-url/en-US/designer?lang=1",
  "/i18n-url/de-DE/designer?lang=0",
  "/null",
] as const;

const scenarios = defineScenarios([
  {
    id: "platform/server/connection-test",
    covers: ["FMT-SERVER-004", "FMT-SERVER-001"],
    kind: "json",
    // The app probes this route with HEAD for its online check.
    driver: async ({ page, kind }) => [
      await recordResponse(page, kind, "/connection/test"),
      await recordResponse(page, kind, "/connection/test", { method: "HEAD" }),
      await recordResponse(page, kind, "/connection/test?lang=1"),
    ],
  },
  {
    id: "platform/server/json-routes",
    covers: ["FMT-SERVER-005", "FMT-SERVER-006", "FMT-SERVER-014"],
    kind: "json",
    // The exact requests the old app makes on startup, then variants.
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const route of JSON_ROUTES) {
        out.push(await recordResponse(page, kind, route, { body: "json" }));
      }
      return out;
    },
    removedInNewApp: async ({ page, kind }) =>
      assertNotFound(
        page,
        kind,
        JSON_ROUTES.map((path) => ({ method: "GET" as const, path })),
      ),
  },
  {
    id: "platform/server/put-user-locale",
    covers: ["FMT-SERVER-018", "FMT-SERVER-019", "FMT-SERVER-001"],
    kind: "json",
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const locale of PUT_USER_LOCALES) {
        const r = await recordResponse(page, kind, "/user", {
          method: "PUT",
          data: { locale },
          body: "json",
        });
        out.push({ locale, ...r });
      }
      // No JSON body at all: express.json() leaves req.body undefined.
      out.push({
        locale: "(no body)",
        ...(await recordResponse(page, kind, "/user", { method: "PUT", body: "json" })),
      });
      return out;
    },
    removedInNewApp: async ({ page, kind }) =>
      assertNotFound(page, kind, [
        ...PUT_USER_LOCALES.map((locale) => ({
          method: "PUT" as const,
          path: "/user",
          data: { locale },
        })),
        { method: "PUT" as const, path: "/user" },
      ]),
  },
  {
    id: "platform/server/static-files",
    covers: ["FMT-SERVER-002", "FMT-PWA-002"],
    kind: "json",
    // Status, content type and Cache-Control of each static file. Bodies
    // are the app itself and are not compared; only chunk.vendor.js and
    // designer.browser.js get the immutable Cache-Control.
    driver: async ({ page, kind }) => {
      const out: unknown[] = [];
      for (const file of STATIC_FILES) {
        out.push(await recordResponse(page, kind, file, { body: "none" }));
        out.push(await recordResponse(page, kind, file, { method: "HEAD" }));
      }
      return out;
    },
    removedInNewApp: async ({ page, kind }) => assertOldBuildReplaced(page, kind),
  },
  {
    id: "platform/server/index-references",
    covers: ["FMT-SERVER-002", "FMT-PWA-002"],
    kind: "json",
    // Whatever index.html loads (scripts, styles, manifest) and how the
    // server serves each of those files, in document order.
    driver: async ({ page, kind }) => {
      const refs = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            'script[src], link[rel="stylesheet"][href], link[rel="manifest"]',
          ),
        ]
          .map((e) => ({
            tag: e.tagName.toLowerCase(),
            rel: e.getAttribute("rel"),
            url: new URL(e.getAttribute("src") ?? e.getAttribute("href") ?? "", location.href),
          }))
          // Third-party scripts (reCAPTCHA, Tag Manager) are not served by the app.
          .filter((r) => r.url.origin === location.origin)
          .map((r) => ({ tag: r.tag, rel: r.rel, path: r.url.pathname })),
      );
      const out: unknown[] = [];
      for (const ref of refs) {
        const r = await recordResponse(page, kind, ref.path, { body: "none" });
        out.push({
          ...ref,
          status: r.status,
          "content-type": r["content-type"],
          "cache-control": r["cache-control"] ?? null,
        });
      }
      return out;
    },
    removedInNewApp: async ({ page, kind }) => assertIndexLoadsOwnBundles(page, kind),
  },
  {
    id: "platform/server/online-probe",
    covers: ["FMT-SERVER-004", "FMT-SERVER-020"],
    kind: "json",
    open: { newDocument: false },
    // The online check the app makes while it starts: which requests reach
    // /connection/test, on the app's own origin (gApi.url is
    // location.origin), until no request was made for a second.
    driver: async ({ page, kind }) => {
      const origin = base(kind);
      const probes = new Set<string>();
      let last = Date.now();
      page.on("request", (r) => {
        last = Date.now();
        if (!r.url().includes("/connection/test")) return;
        const sameOrigin = r.url().startsWith(origin + "/");
        probes.add(`${r.method()} ${sameOrigin ? r.url().slice(origin.length) : r.url()}`);
      });
      const probe = page.waitForRequest(/\/connection\/test/, { timeout: 30_000 });
      await openApp(page, kind, { newDocument: false });
      await probe;
      while (Date.now() - last < 1000) await page.waitForTimeout(100);
      return [...probes].sort();
    },
    // DROP-012: the start-up probe only fed the dropped sign-in flow, so
    // the new app makes none; the route itself stays (connection-test).
    removedInNewApp: async ({ page, kind }) => {
      const probes: string[] = [];
      let last = Date.now();
      page.on("request", (r) => {
        last = Date.now();
        if (r.url().includes("/connection/test")) probes.push(`${r.method()} ${r.url()}`);
      });
      await openApp(page, kind, { newDocument: false });
      while (Date.now() - last < 1000) await page.waitForTimeout(100);
      if (probes.length > 0) throw new Error(`the app still probes: ${probes.join(", ")}`);
    },
  },
  {
    id: "platform/server/not-found",
    covers: ["FMT-SERVER-001"],
    kind: "json",
    // Express' default 404 page for unknown routes and methods, including
    // GET /undefined, which the old app requests on every load.
    driver: async ({ page, kind }) => [
      await recordResponse(page, kind, "/undefined"),
      await recordResponse(page, kind, "/does-not-exist.js"),
      await recordResponse(page, kind, "/assets/missing.png"),
      await recordResponse(page, kind, "/connection/test", { method: "POST", data: {} }),
      await recordResponse(page, kind, "/maintenance/status", { method: "PUT", data: {} }),
    ],
  },
]);

paritySuite("platform server", scenarios, { newApp: false });
