// Smaller editor behaviours that do not fit the other files: clone with
// offset, the transaction debug export when debugging is off, the copy
// exclusion option, copying a style row the mouse is over, panning with
// Space, Play mode page keys, and dragging a symbol from the Symbols panel.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { runKeyChecks, type KeyCheck } from "./keys.ts";
import { runProbe, sceneToClient, type Loose } from "./lib.ts";

const inPage: Scenario[] = [
  {
    id: "editor-actions/extras/clone-selection-with-offset",
    covers: ["EDT-DUP-002", "EDT-DUP-001"],
    kind: "json",
    inPage: ({ G, app }) => {
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(20, 0, 0, 10, 100, 100));
      app.editor().insertElements([r]);
      app.editor().cloneSelection(true);
      const first = app
        .selection()
        .map((n: { getProperty(k: string): unknown }) => String(n.getProperty("trf")));
      app.editor().cloneSelection(true);
      const second = app
        .selection()
        .map((n: { getProperty(k: string): unknown }) => String(n.getProperty("trf")));
      return {
        first,
        second,
        rects: app.scene().queryAll("rectangle").length,
        undo: app
          .editor()
          .getUndoStates()
          .map((s: { name: string }) => s.name),
      };
    },
  },
  {
    id: "editor-actions/extras/debug-export-off-and-copy-options",
    covers: ["EDT-UNDO-011", "EDT-CLIP-021"],
    kind: "json",
    inPage: ({ app }) => ({
      exportStates: app.editor().exportStates(),
      propertiesExcludedFromCopying: app.editorActions.editorOption(
        "propertiesExcludedFromCopying",
      ),
    }),
  },
];

type AppWindow = { __parity: { app: Loose } };

const selectByName = (name: string) => (page: Page) =>
  page.evaluate((n) => {
    const P = (window as unknown as AppWindow).__parity;
    const node = P.app
      .scene()
      .getActivePage()
      .getChildren()
      .find((c: { getProperty(k: string): unknown }) => c.getProperty("name") === n);
    P.app.editor().updateSelection(false, [node]);
  }, name);

const hover = (selector: string) => async (page: Page) => {
  await page
    .locator(selector)
    .first()
    .hover({ position: { x: 3, y: 8 } });
  await page.waitForTimeout(100);
};

const keyChecks: KeyCheck[] = [
  // Ctrl+C with the mouse over the fill row copies that fill only; Ctrl+V
  // then adds it to the selected shape.
  {
    name: "copy-fill-row-then-paste",
    setup: "eyedrop",
    id: "paste.paste",
    prepare: async (page) => {
      await selectByName("B")(page);
      await hover(".fill-properties-panel .g-property-row")(page);
    },
    keys: ["Control+KeyC"],
    act: async (page) => {
      await selectByName("A")(page);
      await page.mouse.move(700, 800);
      await page.keyboard.press("Control+KeyV");
    },
    wait: 400,
    args: { center: true, clipboard: true },
  },
  {
    name: "cut-border-row",
    setup: "eyedrop",
    id: "edit.cut",
    prepare: async (page) => {
      await selectByName("B")(page);
      await hover(".border-properties-panel .g-property-row")(page);
    },
    keys: ["Control+KeyX"],
    wait: 400,
    args: { center: true, clipboard: true },
  },
  {
    name: "delete-fill-row-hover",
    setup: "eyedrop",
    id: "edit.delete",
    prepare: hover(".fill-properties-panel .g-property-row"),
    keys: ["Delete"],
    wait: 300,
    args: { center: true },
  },
  // Space held while dragging pans the view and restores the tool after.
  {
    name: "space-drag-pans",
    setup: "rect",
    keys: [],
    act: async (page) => {
      const p = await sceneToClient(page, 400, 400);
      await page.mouse.move(p.x, p.y);
      await page.keyboard.down("Space");
      await page.waitForTimeout(100);
      const during = await page.evaluate(() =>
        (window as unknown as AppWindow).__parity.app.activeTool(),
      );
      await page.mouse.down();
      for (let i = 1; i <= 5; i++) await page.mouse.move(p.x + i * 20, p.y + i * 10);
      await page.mouse.up();
      await page.keyboard.up("Space");
      await page.waitForTimeout(100);
      return { toolWhileSpace: during };
    },
    args: { center: true, view: true, tool: true },
  },
  // Space while drawing a rectangle moves the shape being drawn.
  {
    name: "space-while-drawing",
    setup: "rect-nosel",
    keys: ["KeyR"],
    act: async (page) => {
      const a = await sceneToClient(page, 300, 300);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(a.x + 40, a.y + 30, { steps: 4 });
      await page.keyboard.down("Space");
      await page.mouse.move(a.x + 90, a.y + 50, { steps: 4 });
      await page.keyboard.up("Space");
      await page.mouse.move(a.x + 100, a.y + 70, { steps: 2 });
      await page.mouse.up();
    },
    wait: 200,
    args: { center: true, tool: true },
  },
];

async function playKeys(page: Page, arrow: boolean): Promise<Buffer> {
  await runProbe(page, { setup: "pages3", phase: "setup" });
  await page.evaluate(() => (window as unknown as AppWindow).__parity.app.execute("view.play"));
  await page.waitForTimeout(1000);
  if (arrow) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(500);
  }
  // Downscaled to keep the file small; the page content is large shapes.
  return page.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 1000 }, scale: "css" });
}

async function symbolsPanelDrag(page: Page): Promise<string> {
  await runProbe(page, { setup: "symbol-master", phase: "setup", center: true });
  await page.evaluate(() =>
    (window as unknown as AppWindow).__parity.app.execute("view.toggle-sidebar.symbols"),
  );
  await page.waitForTimeout(500);
  await runProbe(page, { setup: "empty", phase: "setup" });
  const tile = page.locator(".sidebar-symbols [draggable=true]").first();
  const to = await sceneToClient(page, 400, 300);
  await tile.dragTo(page.locator("body"), {
    targetPosition: { x: Math.round(to.x), y: Math.round(to.y) },
  });
  await page.waitForTimeout(500);
  return runProbe(page, { setup: "empty", phase: "after" });
}

const drivers: Scenario[] = [
  {
    id: "editor-actions/extras/panel-hover-and-space",
    covers: ["EDT-CLIP-005", "EDT-CLIP-011", "EDT-DUP-003", "ACT-KEY-032", "ACT-KEY-033"],
    kind: "document",
    timeout: 240_000,
    driver: ({ page }) => runKeyChecks(page, keyChecks),
  },
  {
    id: "editor-actions/extras/play-mode-first-page",
    covers: ["ACT-KEY-036", "ACT-VIEW-045"],
    kind: "png",
    driver: ({ page }) => playKeys(page, false),
  },
  {
    id: "editor-actions/extras/play-mode-arrow-down",
    covers: ["ACT-KEY-036", "ACT-VIEW-045"],
    kind: "png",
    driver: ({ page }) => playKeys(page, true),
  },
  {
    id: "editor-actions/extras/symbols-panel-drag",
    covers: ["EDT-DND-010", "EDT-DND-008", "EDT-DND-009"],
    kind: "document",
    driver: ({ page }) => symbolsPanelDrag(page),
  },
];

paritySuite("editor-actions extras", defineScenarios([...inPage, ...drivers]), { newApp: false });
