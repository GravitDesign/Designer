// The user guide the server publishes at /docs (server.js serves docs/ as
// static files): routing, content types, and the text of the pages the
// inventory cites. Page text is the article's innerText, so markup changes
// that keep the words and their order still pass.
import type { Page } from "@playwright/test";
import type { AppKind } from "../../support/apps.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import { base, recordResponse, stripOrigin } from "./lib.ts";

/** Opens a docs page in the tab and returns its title and article text. */
async function pageText(page: Page, kind: AppKind, name: string): Promise<unknown> {
  const response = await page.goto(`${base(kind)}/docs/${name}`, { waitUntil: "domcontentloaded" });
  return page.evaluate(
    ({ name: n, status }) => {
      const article = document.querySelector<HTMLElement>("article.content, article, main");
      return {
        page: n,
        status,
        title: document.title,
        headings: [...(article ?? document.body).querySelectorAll("h1, h2, h3, h4")].map((h) =>
          (h as HTMLElement).innerText.trim(),
        ),
        text: (article ?? document.body).innerText.split(/\s*\n\s*/).filter(Boolean),
      };
    },
    { name, status: response?.status() ?? null },
  );
}

const scenarios = defineScenarios([
  {
    id: "platform/docs/routing",
    covers: ["FMT-SERVER-003", "FMT-DOCS-001"],
    kind: "json",
    driver: async ({ page, kind }) => [
      // Directory without slash: express.static redirects to "/docs/".
      await recordResponse(page, kind, "/docs"),
      await recordResponse(page, kind, "/docs/", { body: "hash" }),
      await recordResponse(page, kind, "/docs/index.html", { body: "hash" }),
      await recordResponse(page, kind, "/docs/import.html", { body: "hash" }),
      await recordResponse(page, kind, "/docs/images/01_File-Open.png", { body: "hash" }),
      await recordResponse(page, kind, "/docs/images/Addtext.mp4", { method: "HEAD" }),
      await recordResponse(
        page,
        kind,
        "/docs/wp-content/themes/gravit-documentation/assets/fonts/subset-Lato-Black.woff2",
        { body: "hash" },
      ),
      await recordResponse(page, kind, "/docs/missing-page.html"),
      await recordResponse(page, kind, "/docs/images/missing.png"),
    ],
  },
  {
    id: "platform/docs/index",
    covers: ["FMT-DOCS-001"],
    kind: "json",
    // Title, text and every link of the guide's start page.
    driver: async ({ page, kind }) => {
      const info = (await pageText(page, kind, "index.html")) as Record<string, unknown>;
      const links = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.href),
      );
      return { ...info, links: links.map((l) => stripOrigin(kind, l)) };
    },
  },
  ...(
    [
      ["import", "FMT-DOCS-002"],
      ["export", "FMT-DOCS-003"],
      ["save-and-open-files", "FMT-DOCS-004"],
      ["documents", "FMT-DOCS-005"],
      ["working-with-files", "FMT-DOCS-005"],
      ["import-export", "FMT-DOCS-006"],
    ] as const
  ).map(([name, id]) => ({
    id: `platform/docs/page-${name}`,
    covers: [id, "FMT-DOCS-001"],
    kind: "json" as const,
    driver: async ({ page, kind }: { page: Page; kind: AppKind }) =>
      pageText(page, kind, `${name}.html`),
  })),
]);

paritySuite("platform docs", scenarios, { newApp: false });
