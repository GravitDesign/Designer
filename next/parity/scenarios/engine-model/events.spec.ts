import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Node events (order and kind) for typical operations, and engine-level
// undo through the editor's transaction API and the transaction recorder.

const NODE_EVENTS = [
  "BeforeInsertEvent",
  "AfterInsertEvent",
  "BeforeRemoveEvent",
  "AfterRemoveEvent",
  "BeforePropertiesChangeEvent",
  "AfterPropertiesChangeEvent",
  "BeforeFlagChangeEvent",
  "AfterFlagChangeEvent",
  "BeforeSpecialChangeEvent",
  "AfterSpecialChangeEvent",
  "AfterRestoreEvent",
];

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/events/node-events",
    covers: [
      "ENG-EVENT-001",
      "ENG-EVENT-002",
      "ENG-EVENT-003",
      "ENG-EVENT-004",
      "ENG-EVENT-005",
      "ENG-EVENT-006",
      "ENG-EVENT-007",
      "ENG-NODE-004",
      "ENG-NODE-005",
    ],
    kind: "json",
    args: NODE_EVENTS,
    inPage: withHelpers((_p, names: string[], H) => {
      const G = H.G;
      const N = G.GNode;
      const s = H.app.scene();
      const log: unknown[] = [];
      const label = (n: unknown) => (n ? G.GNode.getName(n) : null);
      const handlers: [unknown, unknown][] = [];
      for (const k of names) {
        const h = (e: {
          node?: unknown;
          properties?: string[];
          values?: unknown[];
          flag?: number;
          set?: boolean;
          custom?: boolean;
          temporary?: boolean;
        }) =>
          log.push([
            k,
            label(e.node),
            e.properties ?? null,
            e.values ? H.v(e.values) : null,
            e.flag ?? null,
            e.set ?? null,
            e.custom ?? null,
            e.temporary ?? null,
          ]);
        s.addEventListener(N[k], h);
        handlers.push([N[k], h]);
      }
      const geometry: unknown[] = [];
      const step = (name: string, fn: () => void) => {
        log.push(["--", name]);
        fn();
      };
      const r = H.rect(0, 0, 10, 10);
      r.addEventListener(G.GElement.GeometryChangeEvent, (e: { type: number }) =>
        geometry.push(["rect", e.type]),
      );
      const g = new G.GGroup();
      step("insert group", () => H.add(g));
      step("insert rect into group", () => g.appendChild(r));
      step("set one property", () => r.setProperty("name", "x"));
      step("set same value again", () => r.setProperty("name", "x"));
      step("set two properties", () => r.setProperties(["name", "vis"], [null, false]));
      step("set custom property", () => r.setProperty("@note", "n"));
      step("set temporary", () => r.setProperty("name", "tmp", false, true));
      step("reset temporary", () => r.resetTemporaryProperty && r.resetTemporaryProperty("name"));
      step("transform", () => r.transform(H.T(2, 0, 0, 2, 0, 0)));
      step("set selected", () => r.setFlag(N.Flag.Selected));
      step("set selected again", () => r.setFlag(N.Flag.Selected));
      step("remove highlighted (not set)", () => r.removeFlag(N.Flag.Highlighted));
      step("add fill layer", () => H.fill(r, H.rgb(1, 2, 3)));
      step("change fill", () =>
        r
          .getPaintLayers()
          .getFirstChild()
          .setProperty("_pt", H.rgb(4, 5, 6)),
      );
      step("add effect", () => r.getEffects().appendChild(new G.GBlurEffect()));
      step("remove rect", () => g.removeChild(r));
      step("remove group", () => g.getParent().removeChild(g));
      for (const [c, h] of handlers) s.removeEventListener(c, h);
      // Removing the listener stops the events.
      const after = log.length;
      H.add(H.rect(0, 0, 1, 1));
      return {
        log,
        geometry,
        geometryTypes: G.GElement.GeometryChangeEvent.Type,
        afterRemoveListener: log.length - after,
        hasListeners: s.hasEventListeners(N.AfterInsertEvent),
      };
    }),
  },
  {
    id: "engine-model/events/restore-and-special",
    covers: ["ENG-EVENT-002", "ENG-EVENT-006", "ENG-SER-002", "ENG-EVENT-010"],
    kind: "json",
    args: NODE_EVENTS,
    inPage: withHelpers((_p, names: string[], H) => {
      const G = H.G;
      const N = G.GNode;
      const s = H.app.scene();
      const log: unknown[] = [];
      const handlers: [unknown, unknown][] = [];
      for (const k of names) {
        const h = (e: { node?: unknown }) => log.push([k, e.node ? G.GNode.getName(e.node) : null]);
        s.addEventListener(N[k], h);
        handlers.push([N[k], h]);
      }
      // Insert a restored group: one insert for the group, none for children.
      const blob = H.ser(
        (() => {
          const g = new G.GGroup();
          g.appendChild(H.rect(0, 0, 5, 5));
          g.appendChild(H.ellipse(0, 0, 5, 5));
          return g;
        })(),
      );
      log.push(["--", "insert restored group"]);
      H.add(G.GNode.deserialize(blob));
      // Symbols: master edits are special changes on the instances.
      log.push(["--", "symbol master edit"]);
      const a = H.add(H.rect(0, 0, 10, 10));
      const m = G.GSymbol.create([a], H.layer(), "S");
      const i = m.clone();
      H.add(i);
      log.push(["--", "edit master child"]);
      a.setProperty("name", "changed");
      for (const [c, h] of handlers) s.removeEventListener(c, h);
      return log;
    }),
  },
  {
    id: "engine-model/events/scene-and-page-events",
    covers: ["ENG-EVENT-008", "ENG-EVENT-009", "ENG-EVENT-011", "ENG-EVENT-013", "ENG-SCENE-015"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const ed = H.app.editor();
      const out: Record<string, unknown> = {};
      out.classes = {
        page: [typeof G.GPage.InvalidationRequestEvent, typeof G.GPage.AfterThumbnailUpdate],
        scene: [
          typeof G.GScene.InvalidationRequestEvent,
          typeof G.GScene.InvalidationFinishedEvent,
          typeof G.GScene.RecordedTransactionStartedEvent,
          typeof G.GScene.RecordedTransactionFinishedEvent,
        ],
        image: [typeof G.GImage.StatusEvent, typeof G.GImage.ConvertStatusEvent],
        texture: typeof G.GTexturePattern.UpdateEvent,
        font: [
          typeof G.GFontManager.FontAvailableEvent,
          typeof G.GFontManager.FontUnavailableEvent,
          typeof G.GFontManager.ResolveFontEvent,
          typeof G.GFontManager.QueryFontFamilyEvent,
        ],
        symbol: [typeof G.GSymbol.AfterThumbnailUpdate, typeof G.GSymbol.AfterSiblingUpdate],
        event: [typeof G.GEvent, typeof G.GEventTarget],
      };
      // Undo and redo run inside RecordedTransactionStarted/Finished, and
      // nodes are flagged as recordedTransaction while they replay.
      const log: unknown[] = [];
      const r = H.add(H.rect(0, 0, 10, 10));
      const started = () => log.push(["started", r.recordedTransaction === true]);
      const finished = () => log.push(["finished", r.recordedTransaction === true]);
      s.addEventListener(G.GScene.RecordedTransactionStartedEvent, started);
      s.addEventListener(G.GScene.RecordedTransactionFinishedEvent, finished);
      const seen = () =>
        log.push([
          "change",
          r.recordedTransaction === true,
          H.attempt(() => r.isRecordedTransaction()),
        ]);
      s.addEventListener(G.GNode.AfterPropertiesChangeEvent, seen);
      ed.beginTransaction();
      r.setProperty("name", "a");
      ed.commitTransaction("Rename");
      log.push(["--", "undo"]);
      ed.undoState();
      log.push(["--", "redo"]);
      ed.redoState();
      s.removeEventListener(G.GScene.RecordedTransactionStartedEvent, started);
      s.removeEventListener(G.GScene.RecordedTransactionFinishedEvent, finished);
      s.removeEventListener(G.GNode.AfterPropertiesChangeEvent, seen);
      out.recorded = log;
      // A page asks for invalidation when its content changes.
      const inv: unknown[] = [];
      const pageInv = (e: { area: unknown }) => inv.push(["page", H.v(e.area)]);
      H.page().addEventListener(G.GPage.InvalidationRequestEvent, pageInv);
      const r2 = H.add(H.rect(100, 100, 20, 10));
      r2.setProperty("trf", H.T(20, 0, 0, 10, 300, 300));
      H.page().removeEventListener(G.GPage.InvalidationRequestEvent, pageInv);
      out.pageInvalidation = inv;
      // An image with a broken URL reports its status changes.
      const img = new G.GImage();
      const statuses: unknown[] = [];
      img.addEventListener(G.GImage.StatusEvent, (e: { status: unknown }) =>
        statuses.push(e.status),
      );
      H.add(img);
      img.setProperty("url", "assets/does-not-exist.png");
      for (let i = 0; i < 200 && img.getStatus() !== G.GImage.ImageStatus.Error; i++)
        await H.sleep(25);
      out.imageStatus = { events: statuses, final: img.getStatus() };
      return out;
    }),
  },
  {
    id: "engine-model/events/transactions-and-undo",
    covers: ["ENG-SCENE-014", "ENG-SCENE-015", "ENG-SCENE-013"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const ed = H.app.editor();
      const out: Record<string, unknown> = {};
      out.actionTypes = G.GTransactionRecorder.ActionType;
      out.hasRecorder = !!H.app.scene().getWorkspace().getTransactionRecorder();
      const r = H.add(H.rect(0, 0, 10, 10));
      const state = () => ({
        undo: (ed.getUndoStates() as { name: string }[]).map((x) => x.name),
        redo: (ed.getRedoStates() as { name: string }[]).map((x) => x.name),
        undoName: ed.getUndoStateName(),
        redoName: ed.getRedoStateName(),
        name: r.getProperty("name"),
        vis: r.getProperty("vis"),
        selected: r.hasFlag(G.GNode.Flag.Selected),
        trf: H.v(r.getProperty("trf")),
        fills: r.getPaintLayers().getFillLayers().length,
        inLayer: r.getParent() ? true : false,
      });
      out.start = state();
      // A simple transaction with property, flag, insert and transform changes.
      ed.beginTransaction();
      r.setProperty("name", "first");
      r.setFlag(G.GNode.Flag.Active);
      H.fill(r, H.rgb(1, 1, 1));
      r.transform(H.T(1, 0, 0, 1, 10, 10));
      ed.commitTransaction("Edit");
      out.afterEdit = state();
      ed.undoState();
      out.undone = state();
      ed.redoState();
      out.redone = state();
      // Empty transactions push no state.
      ed.beginTransaction();
      ed.commitTransaction("Nothing");
      out.empty = state();
      // Nested transactions: the inner commit becomes its own state, and the
      // outer state only keeps the actions recorded before the inner began.
      ed.beginTransaction();
      r.setProperty("name", "outer-1");
      ed.beginTransaction();
      r.setProperty("name", "inner");
      ed.commitTransaction("Inner");
      r.setProperty("vis", false);
      ed.commitTransaction("Outer");
      out.nested = state();
      ed.undoState();
      out.nestedUndo1 = state();
      ed.undoState();
      out.nestedUndo2 = state();
      ed.redoState();
      out.nestedRedo1 = state();
      // A new state clears the redo stack.
      ed.beginTransaction();
      r.setProperty("name", "fresh");
      ed.commitTransaction("Fresh");
      out.redoCleared = state();
      // Removing an element and undoing puts it back.
      ed.beginTransaction();
      r.getParent().removeChild(r);
      ed.commitTransaction("Remove");
      out.removed = state();
      ed.undoState();
      out.removeUndone = state();
      out.commitEmptyStack = H.attemptMsg(() => ed.commitTransaction("x"));
      // Save points and modified state.
      const sp = ed.markSavePoint();
      out.modifiedAtSavePoint = ed.isModified();
      ed.beginTransaction();
      r.setProperty("name", "after save");
      ed.commitTransaction("After save");
      out.modifiedAfterEdit = ed.isModified();
      out.elementModified = H.attempt(() => ed.isElementModified(r));
      ed.undoState();
      out.modifiedAfterUndo = ed.isModified();
      out.savePointType = typeof sp;
      return out;
    }),
  },
]);

paritySuite("engine-model events", scenarios, { newApp: false });
