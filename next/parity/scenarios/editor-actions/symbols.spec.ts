// Symbols (EDT-SYMBOL): editing a master updates its instances, the
// symbol editor's label part moves the symbol, master labels are drawn on
// the canvas, pasting a master into another document, and removing a
// symbol removes its instances. Create/detach/reset and deleting inside an
// instance are in exec.spec.ts.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { probe, runProbe, sceneToClient, type ProbeArgs, type Loose } from "./lib.ts";

/** Builds master "Master" (rect A at 100,100 80x50) and an instance moved to 300,100. */
async function masterAndInstance(page: Page): Promise<void> {
  await runProbe(page, { setup: "symbol-instance", phase: "setup" });
  await page.evaluate(() => {
    const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
    const inst = P.app.selection()[0];
    inst.transform(new P.G.GTransform(1, 0, 0, 1, 200, 0));
    const master = P.app
      .scene()
      .getActivePage()
      .getChildren()
      .find((n: Loose) => n instanceof P.G.GSymbol && n.isMaster());
    P.app.editor().updateSelection(false, [master]);
    P.app.execute("view.magnification.100");
  });
}

async function docAndSelection(page: Page): Promise<string> {
  return runProbe(page, { setup: "empty", phase: "after" });
}

async function resizeMaster(page: Page): Promise<string> {
  await masterAndInstance(page);
  await runProbe(page, { setup: "empty", phase: "setup", options: { keep: true } });
  // Right-middle resize handle of the master frame (100..180, 100..150).
  const from = await sceneToClient(page, 180, 125);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(from.x + i * 8, from.y);
  await page.mouse.up();
  await page.waitForTimeout(200);
  return docAndSelection(page);
}

async function dragLabel(page: Page): Promise<string> {
  await masterAndInstance(page);
  await runProbe(page, { setup: "empty", phase: "setup", options: { keep: true } });
  // The label "○ Master" sits just above the master's top-left corner.
  const from = await sceneToClient(page, 118, 87);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(from.x + i * 6, from.y + i * 4);
  await page.mouse.up();
  await page.waitForTimeout(200);
  return docAndSelection(page);
}

async function labelShot(page: Page, labels: boolean): Promise<Buffer> {
  await masterAndInstance(page);
  await page.evaluate((on) => {
    const P = (window as unknown as { __parity: { app: Loose } }).__parity;
    P.app.editor().clearSelection();
    if (P.app.editorActions.actionInfo("view.canvas.show-symbol-labels").checked !== on) {
      P.app.execute("view.canvas.show-symbol-labels");
    }
  }, labels);
  await page.waitForTimeout(500);
  const tl = await sceneToClient(page, 80, 70);
  return page.screenshot({
    clip: { x: Math.round(tl.x), y: Math.round(tl.y), width: 340, height: 100 },
  });
}

const drivers: Scenario[] = [
  {
    id: "editor-actions/symbols/resize-master-updates-instance",
    covers: ["EDT-SYMBOL-004", "EDT-SYMBOL-003"],
    kind: "document",
    driver: ({ page }) => resizeMaster(page),
  },
  {
    id: "editor-actions/symbols/drag-master-label",
    covers: ["EDT-SYMBOL-003", "EDT-SYMBOL-005"],
    kind: "document",
    driver: ({ page }) => dragLabel(page),
  },
  {
    id: "editor-actions/symbols/labels-on",
    covers: ["EDT-SYMBOL-005", "ACT-VIEW-027"],
    kind: "png",
    open: { newDocument: true, settings: { symbol_labels_visible: true } },
    driver: ({ page }) => labelShot(page, true),
  },
  {
    id: "editor-actions/symbols/labels-off",
    covers: ["EDT-SYMBOL-005", "ACT-VIEW-027"],
    kind: "png",
    open: { newDocument: true, settings: { symbol_labels_visible: true } },
    driver: ({ page }) => labelShot(page, false),
  },
];

const inPage: Scenario<ProbeArgs>[] = [
  {
    id: "editor-actions/symbols/new-document-from-copied-master",
    covers: ["EDT-SYMBOL-007", "EDT-CLIP-020"],
    kind: "document",
    inPage: probe,
    args: {
      setup: "symbol-instance",
      id: "file.new.clipboard",
      copyFirst: "selection",
      shell: true,
    },
  },
  {
    id: "editor-actions/symbols/paste-master-copy",
    covers: ["EDT-SYMBOL-007", "EDT-CLIP-010"],
    kind: "document",
    inPage: probe,
    args: { setup: "symbol-master", id: "paste.paste", copyFirst: "selection", settle: 300 },
  },
];

const removeSymbol: Scenario = {
  id: "editor-actions/symbols/remove-symbol-removes-instances",
  covers: ["ADD-SYMBOL-001"],
  kind: "json",
  inPage: ({ G, app }) => {
    const r = new G.GRectangle();
    r.setProperty("trf", new G.GTransform(40, 0, 0, 25, 140, 125));
    app.editor().insertElements([r]);
    const master = G.GSymbol.create([r], app.scene().getActivePage(), "Master");
    app.editor().updateSelection(false, [master]);
    app.execute("edit.duplicate");
    app.execute("edit.duplicate");
    const count = () => ({
      symbols: app.scene().queryAll("symbol").length,
      dictionary: (app.scene().getSymbols() || []).length,
    });
    const before = count();
    app.scene().removeSymbol(master);
    return { before, after: count() };
  },
};

paritySuite(
  "editor-actions symbols",
  defineScenarios([...drivers, ...(inPage as unknown as Scenario[]), removeSymbol]),
  { newApp: false },
);
