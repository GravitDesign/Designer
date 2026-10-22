// Undo stack and transactions (EDT-UNDO): the 100-step cap, nested
// transactions, empty transactions, the replay flag, save points, and one
// undo step per pointer drag or nudge. In-page scenarios use the editor's
// public transaction API; the drag and nudge checks use real mouse and
// keyboard input.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { runProbe, sceneToClient, type Loose } from "./lib.ts";

const inPage: Scenario[] = [
  {
    id: "editor-actions/undo/cap-100",
    covers: ["EDT-UNDO-005", "EDT-UNDO-007"],
    kind: "json",
    inPage: ({ G, app }) => {
      const ed = app.editor();
      for (let i = 0; i < 105; i++) {
        const r = new G.GRectangle();
        r.setProperty("trf", new G.GTransform(5, 0, 0, 5, i * 12, 0));
        ed.beginTransaction();
        app.scene().getActivePage().appendChild(r);
        ed.commitTransaction(`step ${i}`);
      }
      const states = ed.getUndoStates().map((s: { name: string }) => s.name);
      let undone = 0;
      while (ed.hasUndoState()) {
        ed.undoState();
        undone++;
      }
      return {
        count: states.length,
        first: states[0],
        last: states[states.length - 1],
        undoName: ed.getUndoStateName(),
        undone,
        remainingRects: app.scene().queryAll("rectangle").length,
        redoCount: ed.getRedoStates().length,
        redoName: ed.getRedoStateName(),
      };
    },
  },
  {
    id: "editor-actions/undo/nested-transaction",
    covers: ["EDT-UNDO-003", "EDT-UNDO-004"],
    kind: "json",
    inPage: ({ G, app }) => {
      const ed = app.editor();
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(10, 0, 0, 10, 50, 50));
      app.editor().insertElements([r]);
      const before = ed.getUndoStates().length;
      ed.beginTransaction();
      r.setProperty("name", "A (outer, before inner)");
      ed.beginTransaction();
      r.setProperty("_stop", 0.5);
      ed.commitTransaction("inner");
      // After the inner commit the recorder is no longer recording.
      r.setProperty("_sbl", "multiply");
      ed.commitTransaction("outer");
      const names = ed
        .getUndoStates()
        .slice(before)
        .map((s: { name: string }) => s.name);
      const props = () => ({
        name: r.getProperty("name"),
        opacity: r.getProperty("_stop"),
        blend: r.getProperty("_sbl"),
      });
      const afterCommit = props();
      ed.undoState();
      const afterUndo1 = props();
      ed.undoState();
      const afterUndo2 = props();
      ed.redoState();
      ed.redoState();
      const afterRedo = props();
      return { names, afterCommit, afterUndo1, afterUndo2, afterRedo };
    },
  },
  {
    id: "editor-actions/undo/empty-and-unbalanced",
    covers: ["EDT-UNDO-004"],
    kind: "json",
    inPage: ({ app }) => {
      const ed = app.editor();
      const before = ed.getUndoStates().length;
      ed.beginTransaction();
      ed.commitTransaction("nothing changed");
      const afterEmpty = ed.getUndoStates().length - before;
      let error: string | null = null;
      try {
        ed.commitTransaction("no begin");
      } catch (e) {
        error = String((e as Error).message);
      }
      return { statesAddedByEmpty: afterEmpty, commitWithoutBegin: error };
    },
  },
  {
    id: "editor-actions/undo/redo-cleared-by-new-state",
    covers: ["EDT-UNDO-005", "EDT-UNDO-006"],
    kind: "json",
    inPage: ({ G, app }) => {
      const ed = app.editor();
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(10, 0, 0, 10, 50, 50));
      ed.insertElements([r]);
      app.execute("arrange.transform.rotate-90-left");
      app.execute("edit.undo");
      const redoBefore = ed.getRedoStates().map((s: { name: string }) => s.name);
      const titles = {
        undo: app.editorActions.actionInfo("edit.undo").title,
        redo: app.editorActions.actionInfo("edit.redo").title,
      };
      app.execute("arrange.transform.flip-vertical");
      return {
        redoBefore,
        titles,
        redoAfter: ed.getRedoStates().map((s: { name: string }) => s.name),
        undo: ed.getUndoStates().map((s: { name: string }) => s.name),
        redoEnabled: app.canExecute("edit.redo"),
      };
    },
  },
  {
    id: "editor-actions/undo/replay-flag",
    covers: ["EDT-UNDO-002", "EDT-UNDO-001", "EDT-UNDO-006"],
    kind: "json",
    inPage: ({ G, app }) => {
      const ed = app.editor();
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(10, 0, 0, 10, 50, 50));
      ed.insertElements([r]);
      ed.updateSelection(false, [r]);
      const seen: unknown[] = [];
      const listener = (e: {
        node: { isRecordedTransaction(): boolean; getProperty(k: string): unknown };
      }) => {
        seen.push({
          recorded: !!e.node.isRecordedTransaction(),
          opacity: e.node.getProperty("_stop"),
        });
      };
      app.scene().addEventListener(G.GNode.AfterPropertiesChangeEvent, listener);
      ed.beginTransaction();
      r.setProperty("_stop", 0.25);
      ed.commitTransaction("opacity");
      ed.clearSelection();
      ed.undoState();
      const selectionAfterUndo = (ed.getSelection() || []).map((n: { getNodeName(): string }) =>
        n.getNodeName(),
      );
      ed.clearSelection();
      ed.redoState();
      const selectionAfterRedo = (ed.getSelection() || []).map((n: { getNodeName(): string }) =>
        n.getNodeName(),
      );
      app.scene().removeEventListener(G.GNode.AfterPropertiesChangeEvent, listener);
      return { seen, selectionAfterUndo, selectionAfterRedo };
    },
  },
  {
    id: "editor-actions/undo/save-point",
    covers: ["EDT-UNDO-008"],
    kind: "json",
    inPage: ({ G, app }) => {
      const ed = app.editor();
      const a = new G.GRectangle();
      a.setProperty("trf", new G.GTransform(10, 0, 0, 10, 50, 50));
      const b = new G.GRectangle();
      b.setProperty("trf", new G.GTransform(10, 0, 0, 10, 150, 50));
      ed.insertElements([a, b]);
      const out: Record<string, unknown> = { initial: ed.isModified() };
      ed.markSavePoint();
      out.afterSavePoint = ed.isModified();
      ed.updateSelection(false, [a]);
      app.execute("arrange.transform.rotate-90-left");
      out.afterChange = ed.isModified();
      out.aModified = ed.isElementModified(a);
      out.bModified = ed.isElementModified(b);
      app.execute("edit.undo");
      out.afterUndo = ed.isModified();
      app.execute("edit.redo");
      out.afterRedo = ed.isModified();
      return out;
    },
  },
];

async function dragAndNudge(page: Page): Promise<unknown> {
  await runProbe(page, { setup: "rect", phase: "setup", center: true });
  const names = () =>
    page.evaluate(() =>
      (window as unknown as { __parity: { app: Loose } }).__parity.app
        .editor()
        .getUndoStates()
        .map((s: { name: string }) => s.name),
    );
  const trf = () =>
    page.evaluate(() =>
      String(
        (window as unknown as { __parity: { app: Loose } }).__parity.app
          .selection()[0]
          .getProperty("trf"),
      ),
    );
  const out: Record<string, unknown> = { start: await names() };
  // Drag the rectangle (100,100 100x60) by its centre in 10 steps.
  const from = await sceneToClient(page, 150, 130);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + i * 7, from.y + i * 3);
  await page.mouse.up();
  await page.waitForTimeout(200);
  out.afterDrag = { undo: await names(), trf: await trf() };
  // Three arrow presses with key up in between: one step each.
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  out.afterThreeNudges = { undo: await names(), trf: await trf() };
  // Holding the key (repeats) commits once on key up.
  await page.keyboard.down("Shift");
  await page.keyboard.down("ArrowDown");
  for (let i = 0; i < 4; i++) await page.keyboard.down("ArrowDown");
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(100);
  out.afterHeldShiftNudge = { undo: await names(), trf: await trf() };
  await page.keyboard.press("Control+KeyZ");
  await page.waitForTimeout(100);
  out.afterUndo = { undo: await names(), trf: await trf() };
  return out;
}

async function undoInInput(page: Page): Promise<unknown> {
  await runProbe(page, { setup: "rect", phase: "setup", center: true });
  // The inspector's X field: type a value without committing, then undo.
  const input = page
    .locator(".g-inspector-sidebar input[type=text]:visible, input:visible")
    .first();
  await input.click();
  await page.keyboard.press("End");
  await page.keyboard.type("5");
  const typed = await input.inputValue();
  await page.keyboard.press("Control+KeyZ");
  await page.waitForTimeout(100);
  const afterUndo = await input.inputValue();
  const undo = await page.evaluate(() =>
    (window as unknown as { __parity: { app: Loose } }).__parity.app
      .editor()
      .getUndoStates()
      .map((s: { name: string }) => s.name),
  );
  return { typed, afterUndo, undoStates: undo };
}

const drivers: Scenario[] = [
  {
    id: "editor-actions/undo/drag-and-nudge",
    covers: [
      "EDT-UNDO-004",
      "EDT-UNDO-005",
      "EDT-NUDGE-001",
      "EDT-NUDGE-002",
      "ACT-KEY-034",
      "ACT-EDIT-001",
    ],
    kind: "json",
    driver: ({ page }) => dragAndNudge(page),
  },
  {
    id: "editor-actions/undo/in-text-input",
    covers: ["EDT-UNDO-009", "ACT-EDIT-001"],
    kind: "json",
    driver: ({ page }) => undoInInput(page),
  },
];

paritySuite("editor-actions undo", defineScenarios([...inPage, ...drivers]), { newApp: false });
