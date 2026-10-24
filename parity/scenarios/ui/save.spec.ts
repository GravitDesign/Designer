// What File > Download File writes (the scene JSON with its default
// styles), opening that file again, and the settings that have no default
// and only appear once something sets them.
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { behaviour, clickMenu, drag, insertShapes, settle, start } from "./lib.ts";

/** A rectangle and an ellipse, as the walkthrough sample has them. */
const drawSample = (page: Page) =>
  insertShapes(page, [
    { type: "GRectangle", x: 400, y: 300, w: 200, h: 120, select: false },
    { type: "GEllipse", x: 700, y: 320, w: 140, h: 140, select: false },
  ]);

async function downloadDocument(page: Page): Promise<{ name: string; bytes: Buffer }> {
  const download = page.waitForEvent("download");
  await clickMenu(page, ["File", "Download File"]);
  const file = await download;
  const chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk as Buffer);
  await settle(page);
  return { name: file.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

/** Node names of the active scene as a tree (children in order). */
const sceneTree = (page: Page) =>
  page.evaluate(() => {
    interface NodeLike {
      getNodeName(): string;
      getFirstChild?(): NodeLike | null;
      getNext(): NodeLike | null;
    }
    const { app } = (window as unknown as { __parity: { app: { scene(): NodeLike } } }).__parity;
    const walk = (n: NodeLike): unknown => {
      const kids: unknown[] = [];
      for (let c = n.getFirstChild ? n.getFirstChild() : null; c; c = c.getNext())
        kids.push(walk(c));
      return kids.length ? [n.getNodeName(), kids] : n.getNodeName();
    };
    return walk(app.scene());
  });

const SETTINGS_WITHOUT_DEFAULTS = [
  "language",
  "lastDirectory",
  "color_mode",
  "font-set",
  "show_welcome_screen",
  "sidebars_width_outline",
  "scrubbing_flag",
  "disable_warning_unsupported_features",
  "create_backup_copy",
];

const scenarios: Scenario[] = [
  {
    id: "ui/save/downloaded-document",
    covers: ["RUN-SAVE-007", "RUN-SAVE-008", "RUN-SAVE-005"],
    kind: "document",
    // The thumbnail is a rendered PNG; platform/files compares previews.
    dropKeys: ["_preview"],
    driver: async (ctx) => {
      await start(ctx, { newDocument: true });
      await drawSample(ctx.page);
      const { bytes } = await downloadDocument(ctx.page);
      return zlib.gunzipSync(bytes).toString("utf8");
    },
  },
  behaviour("save/reopen-roundtrip", ["RUN-SAVE-009", "RUN-SAVE-005"], async (page) => {
    await drawSample(page);
    const { name, bytes } = await downloadDocument(page);
    const saved = await sceneTree(page);
    const chooser = page.waitForEvent("filechooser");
    await clickMenu(page, ["File", "Open Local File..."]);
    await (await chooser).setFiles({ name, mimeType: "application/octet-stream", buffer: bytes });
    await page.locator("#header .tabs .tab").nth(1).waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll(".window-overlay-content").length === 0,
    );
    await settle(page, 300);
    return {
      name,
      saved,
      reopened: await sceneTree(page),
      tabs: await page.locator("#header .tabs .tab .title .cover").allTextContents(),
      active: await page.locator("#header .tabs .tab.g-active .title .cover").allTextContents(),
    };
  }),
  behaviour(
    "storage/settings-without-defaults",
    ["UI-SETTING-020", "UI-SHELL-017"],
    async (page) => {
      const read = () =>
        page.evaluate((keys) => {
          const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
            string,
            unknown
          >;
          return Object.fromEntries(keys.map((k) => [k, k in s ? s[k] : "<unset>"]));
        }, SETTINGS_WITHOUT_DEFAULTS);
      const out: Record<string, unknown> = { boot: await read() };
      // Resizing the left sidebar stores its width.
      await page.mouse.move(249, 500);
      await settle(page);
      await drag(page, [249, 500], [330, 500], { steps: 10 });
      out.sidebarResized = await read();
      // The settings dialog's scrubbing switch writes scrubbing_flag.
      await clickMenu(page, ["Edit", "Settings..."]);
      await page.click('.g-settings-dialog label.g-switch:has(> [data-setting="scrubbing_flag"])');
      await page.click('.g-dialog-container.visible button:text-is("Save Changes")');
      await settle(page, 300);
      out.scrubbingSwitched = await read();
      return out;
    },
  ),
];

paritySuite("ui save", scenarios, { newApp: false });
