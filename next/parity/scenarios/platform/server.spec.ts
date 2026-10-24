// HTTP routes of the app server (server.js, routes/user.js): what each one
// answers, plus static file serving. Every request goes through
// Playwright's request API to the base URL of the app under test, so the
// same scenarios check the new server on its own port. The license,
// subscription and cloud routes are in dropped.spec.ts. The JSON stubs and
// PUT /user served only code the rewrite drops (the cloud maintenance
// check, translation downloads, the account locale, a request for "/null"),
// so the new server has none of them: their removedInNewApp checks expect
// 404.
import type { Page } from "@playwright/test";
import { openApp, type AppKind } from "../../support/apps.ts";
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
