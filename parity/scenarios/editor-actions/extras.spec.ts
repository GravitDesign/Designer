// Smaller editor behaviours that do not fit the other files: clone with
// offset, the transaction debug export, the copy exclusion option,
// copying a style row the mouse is over, panning with Space, hiding the
// selection handles, Play mode page keys, and dragging a symbol from the
// Symbols panel.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { frames, runKeyChecks, signature, waitForChange, type KeyCheck } from "./keys.ts";
import { runProbe, sceneToClient, type Loose, type ProbeArgs } from "./lib.ts";

type AppWindow = { __parity: { G: Loose; app: Loose } };

/**
 * Clone with offset: cloneSelection(true) shifts each copy by cloneShift
 * and keeps the transform box open when it was open. The transform box
 * is opened with Q (pointer tool in Transform mode), as a user does.
 */
async function cloneWithOffset(page: Page): Promise<string> {
  const base: ProbeArgs = { setup: "rect", center: true, tool: true };
  await runProbe(page, { ...base, phase: "setup" });
  const before = await signature(page, base);
  await page.keyboard.press("KeyQ");
  await waitForChange(page, base, before);
  const out = await page.evaluate(() => {
    const { app } = (window as unknown as AppWindow).__parity;
    const E = app.editorActions;
    const state = () => ({
      trf: app.selection().map((n: Loose) => String(n.getProperty("trf"))),
      transformBox: E.transformBoxActive(),
      toolEditMode: E.toolEditMode(),
    });
    const start = state();
    app.editor().cloneSelection(true);
    const first = state();
    app.editor().cloneSelection(true);
    const second = state();
    return {
      start,
      first,
      second,
      rects: app.scene().queryAll("rectangle").length,
      undo: app
        .editor()
        .getUndoStates()
        .map((s: { name: string }) => s.name),
    };
  });
  const doc = JSON.parse(await runProbe(page, { ...base, phase: "after" })) as unknown;
  return JSON.stringify({ ...out, probe: doc });
}

/**
 * The transaction debug export with steps debugging switched on (the
 * enable_steps_debug setting), and the copy exclusion list set (the old
 * build leaves it null). Both are switched off again at the end.
 */
function debugExportAndCopyExclusion(P: { G: Loose; app: Loose }): string {
  const { G, app } = P;
  const E = app.editorActions;
  const ed = app.editor();
  const out: Record<string, unknown> = {
    offBefore: {
      exportStates: ed.exportStates(),
      propertiesExcludedFromCopying: E.editorOption("propertiesExcludedFromCopying"),
    },
  };
  app.setSetting("enable_steps_debug", true);
  try {
    // The export after each step, or the error it throws.
    const exported = () => {
      try {
        const raw = ed.exportStates();
        if (typeof raw !== "string") return raw;
        const parsed = JSON.parse(raw);
        // Undo state ids are random uuids under "id"; keep only their form.
        for (const st of parsed.states || []) {
          st.id = typeof st.id === "string" ? `<uuid of ${st.id.length} chars>` : st.id;
        }
        return parsed;
      } catch (e) {
        return { exportError: String((e as Error).message) };
      }
    };
    out.exportStatesEmpty = exported();
    const r = new G.GRectangle();
    r.setProperties(["trf", "name"], [new G.GTransform(20, 0, 0, 10, 100, 100), "Named"]);
    ed.insertElements([r]);
    out.exportStatesAfterInsert = exported();
    app.execute("arrange.transform.rotate-90-left");
    out.exportStatesAfterRotate = exported();
  } finally {
    app.setSetting("enable_steps_debug", false);
  }
  out.exportStatesAfterOff = ed.exportStates();
  // The list names the node's own "@" keys that a copy leaves out (a
  // copy keeps the other "@" keys and drops "@id"). Copy and duplicate
  // both pass it to GNode.serialize.
  const node = app.selection()[0];
  node["@kept"] = "kept";
  node["@dropped"] = "dropped";
  E.setEditorOption("propertiesExcludedFromCopying", ["@dropped"]);
  try {
    E.clipboardClear();
    app.execute("edit.copy");
    out.copied = E.clipboardGet("application/gravit+node");
    app.execute("edit.duplicate");
    out.duplicateKeys = app
      .selection()
      .map((n: Loose) => ({ kept: n["@kept"] ?? null, dropped: n["@dropped"] ?? null }));
  } finally {
    E.setEditorOption("propertiesExcludedFromCopying", null);
  }
  out.optionAfter = E.editorOption("propertiesExcludedFromCopying");
  return JSON.stringify(out);
}

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
  await frames(page);
};

const activeTool = (page: Page): Promise<string> =>
  page.evaluate(() => (window as unknown as AppWindow).__parity.app.activeTool() as string);

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
    args: { center: true, clipboard: true },
  },
  {
    name: "delete-fill-row-hover",
    setup: "eyedrop",
    id: "edit.delete",
    prepare: hover(".fill-properties-panel .g-property-row"),
    keys: ["Delete"],
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
      const tool = await activeTool(page);
      await page.keyboard.down("Space");
      await page.waitForFunction(
        (t) => (window as unknown as AppWindow).__parity.app.activeTool() !== t,
        tool,
      );
      const during = await activeTool(page);
      await page.mouse.down();
      for (let i = 1; i <= 5; i++) await page.mouse.move(p.x + i * 20, p.y + i * 10);
      await page.mouse.up();
      await page.keyboard.up("Space");
      await page.waitForFunction(
        (t) => (window as unknown as AppWindow).__parity.app.activeTool() === t,
        tool,
      );
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
    args: { center: true, tool: true },
  },
];

/**
 * Show Selection Handles switched off with its shortcut: the selected
 * rectangle is drawn without its handles and bounding box.
 */
async function hiddenHandles(page: Page): Promise<Buffer> {
  const base: ProbeArgs = { setup: "rect", center: true };
  await runProbe(page, { ...base, phase: "setup" });
  await page.keyboard.press("Control+Shift+KeyX");
  await page.waitForFunction(
    () =>
      (window as unknown as AppWindow).__parity.app.editorActions.actionInfo(
        "view.canvas.show-selection-handles",
      ).checked === false,
  );
  await frames(page, 3);
  // Rectangle A is 100x60 at (100, 100); keep a margin for the handles.
  const tl = await sceneToClient(page, 80, 80);
  return page.screenshot({
    clip: { x: Math.round(tl.x), y: Math.round(tl.y), width: 140, height: 100 },
  });
}

async function playKeys(page: Page, arrow: boolean): Promise<Buffer> {
  await runProbe(page, { setup: "pages3", phase: "setup" });
  await page.evaluate(() => (window as unknown as AppWindow).__parity.app.execute("view.play"));
  // Play mode starts once the browser has entered fullscreen.
  await page.waitForFunction(() => !!document.fullscreenElement);
  await frames(page, 4);
  if (arrow) {
    await page.keyboard.press("ArrowDown");
    await frames(page, 4);
  }
  return page.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 1000 }, scale: "css" });
}

async function symbolsPanelDrag(page: Page): Promise<string> {
  await runProbe(page, { setup: "symbol-master", phase: "setup", center: true });
  // The second setup keeps the master and records "before"; the probe
  // resets the sidebars, so the Symbols panel is opened after it.
  const base: ProbeArgs = { setup: "empty" };
  await runProbe(page, { ...base, phase: "setup" });
  await page.evaluate(() =>
    (window as unknown as AppWindow).__parity.app.execute("view.toggle-sidebar.symbols"),
  );
  const before = await signature(page, base);
  const tile = page.locator(".sidebar-symbols [draggable=true]").first();
  const to = await sceneToClient(page, 400, 300);
  await tile.dragTo(page.locator("body"), {
    targetPosition: { x: Math.round(to.x), y: Math.round(to.y) },
  });
  await waitForChange(page, base, before);
  return runProbe(page, { ...base, phase: "after" });
}

/**
 * Resizing a page next to another one. The collision rule (ADD-SCENE-002)
 * only runs when GSceneOptions.pagesCanOverlap is false; the old app
 * leaves it at its default true, so a widened page overlaps its
 * neighbour and no page offset ("off") moves. Pages are resized in a
 * transaction, as the page inspector does.
 */
function pageResize(P: { G: Loose; app: Loose }): unknown {
  const { G, app } = P;
  const scene = app.scene();
  const ed = app.editor();
  const pages = () =>
    scene
      .getChildren()
      .filter((n: Loose) => n instanceof G.GPage)
      .map((p: Loose) => ({
        name: p.getProperty("name"),
        w: p.getProperty("w"),
        h: p.getProperty("h"),
        off: String(p.getProperty("off")),
        bbox: String(p.getPaintBBox()),
      }));
  const p1 = scene.getActivePage();
  p1.setProperties(["w", "h", "name"], [400, 300, "P1"]);
  const p2 = scene.insertPage();
  p2.setProperty("name", "P2");
  const start = pages();
  const resize = (page: Loose, w: number, h: number) => {
    ed.beginTransaction();
    page.setProperties(["w", "h"], [w, h]);
    ed.commitTransaction("Resize page");
  };
  resize(p1, 900, 300);
  const widened = pages();
  resize(p2, 400, 700);
  const taller = pages();
  app.execute("edit.undo");
  const undone = pages();
  return { start, widened, taller, undone };
}

const scenarios: Scenario[] = [
  {
    id: "editor-actions/extras/page-resize-overlap",
    covers: ["ADD-SCENE-002"],
    kind: "json",
    inPage: pageResize as (p: unknown) => unknown,
  },
  {
    id: "editor-actions/extras/clone-selection-with-offset",
    covers: ["EDT-DUP-002", "EDT-DUP-001"],
    kind: "document",
    driver: ({ page }) => cloneWithOffset(page),
  },
  {
    id: "editor-actions/extras/debug-export-and-copy-exclusion",
    covers: ["EDT-UNDO-011", "EDT-CLIP-021"],
    kind: "document",
    inPage: debugExportAndCopyExclusion as (p: unknown) => string,
  },
  {
    id: "editor-actions/extras/panel-hover-and-space",
    covers: ["EDT-CLIP-005", "EDT-CLIP-011", "EDT-DUP-003", "ACT-KEY-032", "ACT-KEY-033"],
    kind: "document",
    timeout: 240_000,
    driver: ({ page }) => runKeyChecks(page, keyChecks),
  },
  {
    id: "editor-actions/extras/selection-handles-hidden",
    covers: ["ACT-VIEW-031"],
    kind: "png",
    driver: ({ page }) => hiddenHandles(page),
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

paritySuite("editor-actions extras", defineScenarios(scenarios), { newApp: false });
