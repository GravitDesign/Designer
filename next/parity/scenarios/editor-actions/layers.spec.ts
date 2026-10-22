// Shortcut-only actions that act on the focused Layers panel row (rename,
// lock, hide, enter/leave group, Tab cycling), the multi-page toggle, and
// the eyedropper keys. The Layers panel gets focus from a real click on a
// row; the same keys with the canvas focused are recorded as well.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { runKeyChecks, type KeyCheck } from "./keys.ts";
import { sceneToClient } from "./lib.ts";

const clickRow =
  (name: string) =>
  async (page: Page): Promise<void> => {
    await page
      .locator(".g-layer-panel .layer-row")
      .filter({ hasText: new RegExp(`^${name}$`) })
      .first()
      .click();
    await page.waitForTimeout(100);
  };

const clickCanvas = async (page: Page): Promise<void> => {
  const p = await sceneToClient(page, 600, 400);
  await page.mouse.click(p.x, p.y);
};

const L = { center: true, shell: true } as const;

/** The eyedropper starts at the last pointer position, so put it over B first. */
const overB = async (page: Page): Promise<void> => {
  const p = await sceneToClient(page, 280, 130);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(300);
};

const checks: KeyCheck[] = [
  {
    name: "rename-alt-r",
    setup: "layers-tree",
    id: "edit.rename-layer",
    prepare: clickRow("C"),
    keys: ["Alt+KeyR"],
    act: async (page) => {
      await page.keyboard.press("Control+KeyA");
      await page.keyboard.type("Renamed");
      await page.keyboard.press("Enter");
    },
    wait: 300,
    args: L,
  },
  {
    name: "lock-ctrl-2",
    setup: "layers-tree",
    id: "modify.lock-layer",
    prepare: clickRow("C"),
    keys: ["Control+Digit2"],
    args: L,
  },
  {
    name: "lock-ctrl-2-canvas-focused",
    setup: "layers-tree",
    id: "modify.lock-layer",
    prepare: clickCanvas,
    keys: ["Control+Digit2"],
    args: L,
  },
  {
    name: "hide-ctrl-3",
    setup: "layers-tree",
    id: "view.toggle-layer-visibility",
    prepare: clickRow("C"),
    keys: ["Control+Digit3"],
    args: L,
  },
  {
    name: "enter-group",
    setup: "layers-tree",
    id: "view.enter-layer-group",
    prepare: clickRow("G"),
    keys: ["Enter"],
    args: L,
  },
  {
    name: "leave-group",
    setup: "layers-tree",
    id: "view.enter-layer-group.reverse",
    prepare: clickRow("G"),
    keys: ["Enter", "Shift+Enter"],
    args: L,
  },
  {
    name: "tab-next",
    setup: "layers-tree",
    id: "view.cycle-through-layers.next",
    prepare: clickRow("G"),
    keys: ["Tab"],
    args: L,
  },
  {
    name: "tab-wraps",
    setup: "layers-tree",
    id: "view.cycle-through-layers.next",
    prepare: clickRow("C"),
    keys: ["Tab", "Tab"],
    args: L,
  },
  {
    name: "shift-tab-previous",
    setup: "layers-tree",
    id: "view.cycle-through-layers.previous",
    prepare: clickRow("C"),
    keys: ["Shift+Tab"],
    args: L,
  },
  {
    name: "tab-canvas-focused",
    setup: "layers-tree",
    id: "view.cycle-through-layers.next",
    prepare: clickCanvas,
    keys: ["Tab"],
    args: L,
  },
  {
    name: "multi-page-f6",
    setup: "pages3",
    id: "view.toggle-multi-page-mode",
    keys: ["F6", "F6"],
    gap: 200,
    args: { view: true },
  },
  {
    name: "eyedropper-fill-ctrl-alt-c",
    setup: "eyedrop",
    id: "edit.eyedropper.fill",
    prepare: overB,
    keys: ["Control+Alt+KeyC"],
    act: async (page) => {
      await page.waitForTimeout(200);
      const p = await sceneToClient(page, 280, 130);
      await page.mouse.move(p.x, p.y);
      // The eyedropper samples the rendered canvas; let it settle.
      await page.waitForTimeout(400);
      await page.mouse.click(p.x, p.y);
    },
    wait: 300,
    args: { center: true, tool: true },
  },
  {
    name: "eyedropper-fill-i",
    setup: "eyedrop",
    id: "edit.eyedropper.fill",
    prepare: overB,
    keys: ["KeyI"],
    act: async (page) => {
      await page.waitForTimeout(200);
      const p = await sceneToClient(page, 280, 130);
      await page.mouse.move(p.x, p.y);
      // The eyedropper samples the rendered canvas; let it settle.
      await page.waitForTimeout(400);
      await page.mouse.click(p.x, p.y);
    },
    wait: 300,
    args: { center: true, tool: true },
  },
  {
    name: "eyedropper-border",
    setup: "eyedrop",
    id: "edit.eyedropper.border",
    prepare: overB,
    keys: ["Control+Shift+Alt+KeyC"],
    act: async (page) => {
      await page.waitForTimeout(200);
      const p = await sceneToClient(page, 280, 130);
      await page.mouse.move(p.x, p.y);
      // The eyedropper samples the rendered canvas; let it settle.
      await page.waitForTimeout(400);
      await page.mouse.click(p.x, p.y);
    },
    wait: 300,
    args: { center: true, tool: true },
  },
];

const scenarios: Scenario[] = [
  {
    id: "editor-actions/layers/panel-keys",
    covers: [
      "ACT-KEY-001",
      "ACT-KEY-002",
      "ACT-KEY-003",
      "ACT-KEY-005",
      "ACT-KEY-014",
      "ACT-KEY-015",
      "ACT-KEY-016",
      "ACT-KEY-017",
      "ACT-KEY-018",
      "ACT-KEY-019",
      "ACT-KEY-028",
    ],
    kind: "document",
    timeout: 240_000,
    driver: ({ page }) => runKeyChecks(page, checks),
  },
];

paritySuite("editor-actions layers", defineScenarios(scenarios), { newApp: false });
