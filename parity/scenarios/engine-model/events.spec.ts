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
      const ws = s.getWorkspace();
      const pg = H.page();
      const config = H.app.view().getViewConfiguration();
      const out: Record<string, unknown> = {};
      /** Waits frame by frame until `done` holds (at most about 5 s). */
      const until = async (what: string, done: () => boolean) => {
        for (let i = 0; i < 300 && !done(); i++) await H.frame();
        if (!done()) throw new Error(`timed out waiting for ${what}`);
      };
      const url = (u: unknown) =>
        String(u).replace(/^dictionary:\/\/(.*)$/, (_m, id: string) => `dictionary://${H.id(id)}`);
      // Every event the scene, workspace, dictionary, page and texture fire
      // during a step, in order. The view repaints asynchronously, so the
      // InvalidationFinished events (one or more per repaint) are recorded
      // as the set of distinct payloads seen.
      let log: unknown[] = [];
      let finished: string[] = [];
      s.addEventListener(
        G.GScene.InvalidationRequestEvent,
        (e: { area: unknown; page: { getProperty(n: string): unknown } | null }) =>
          log.push(["scene invalidation", H.r(e.area), e.page ? e.page.getProperty("name") : null]),
      );
      s.addEventListener(
        G.GScene.InvalidationFinishedEvent,
        (e: { scene: unknown; configuration: unknown; wasDirty: unknown }) => {
          const key = JSON.stringify([e.scene === s, e.configuration === config, e.wasDirty]);
          if (!finished.includes(key)) finished.push(key);
        },
      );
      pg.addEventListener(G.GPage.InvalidationRequestEvent, (e: { area: unknown }) =>
        log.push(["page invalidation", H.r(e.area)]),
      );
      let thumbs = 0;
      pg.addEventListener(
        G.GPage.AfterThumbnailUpdate,
        (e: {
          page: unknown;
          // A GPaintCanvas holding the rendered thumbnail; its bitmap wraps a
          // recording canvas, so the PNG comes from the real one behind it.
          image: {
            getWidth(): number;
            getHeight(): number;
            getBitmap(): { getHTMLElement(real: boolean): HTMLCanvasElement };
          } | null;
        }) => {
          thumbs++;
          log.push([
            "thumbnail",
            e.page === pg,
            e.image
              ? [
                  e.image.getWidth(),
                  e.image.getHeight(),
                  e.image.getBitmap().getHTMLElement(true).toDataURL("image/png"),
                ]
              : null,
          ]);
        },
      );
      ws.addEventListener(
        G.GWorkspace.ResolveUrlEvent,
        (e: { url: unknown; scene: unknown; resolved: unknown }) =>
          log.push(["resolve url", url(e.url), e.scene === s, typeof e.resolved]),
      );
      s.getDictionary().addEventListener(
        G.GSceneDictionary.ResolvedMissingEntryEvent,
        (e: { scene: unknown; entry: { getUrl(): string } }) =>
          log.push(["missing entry", e.scene === s, url(e.entry.getUrl())]),
      );
      const step = async (name: string, fn: () => void, done: () => boolean = () => true) => {
        log = [];
        finished = [];
        fn();
        await until(name, () => done() && finished.length > 0);
        out[name] = { events: log.slice(), finished: finished.map((f) => JSON.parse(f)) };
      };
      const r = H.rect(20, 20, 20, 20);
      H.fill(r, H.rgb(255, 0, 0));
      await step("insert", () => H.add(r));
      await step("move", () => r.setProperty("trf", H.T(10, 0, 0, 10, 50, 50)));
      await step("page background", () => pg.setProperty("bck", H.rgb(1, 2, 3)));
      // Texture fills. In a new paint layer the image URL goes into the scene
      // dictionary and is resolved through the workspace; set on an existing
      // layer it is not. Either way the texture asks for a repaint once its
      // image has loaded.
      const cv = document.createElement("canvas");
      cv.width = 2;
      cv.height = 2;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "#00f";
      ctx.fillRect(0, 0, 2, 1);
      const texture = () => {
        const tex = new G.GTexturePattern(cv.toDataURL("image/png"));
        const state = { updates: 0 };
        tex.addEventListener(G.GTexturePattern.UpdateEvent, (e: { texture: unknown }) => {
          state.updates++;
          log.push(["texture update", e.texture === tex]);
        });
        return { tex, state };
      };
      const t1 = texture();
      await step(
        "texture set on layer",
        () => r.getPaintLayers().getFirstChild().setProperty("_pt", t1.tex),
        () => t1.state.updates > 0,
      );
      const t2 = texture();
      await step(
        "texture in new layer",
        () => H.fill(r, t2.tex),
        () => t2.state.updates > 1,
      );
      // An image with a relative URL goes through the workspace too: first
      // the URL itself, then its dictionary entry.
      const img = new G.GImage();
      await step(
        "image url",
        () => {
          H.add(img);
          img.setProperty("url", "assets/does-not-exist.png");
        },
        () => log.some((e) => (e as unknown[])[0] === "resolve url"),
      );
      out.imageUrlStatus = img.getStatus();
      // Page thumbnails are rendered after a repaint while the view asks for
      // them (the pages panel turns this on).
      config.pageThumbnails = true;
      try {
        await step(
          "thumbnail",
          () => r.setProperty("trf", H.T(10, 0, 0, 10, 30, 30)),
          () => thumbs > 0,
        );
      } finally {
        config.pageThumbnails = false;
      }
      // Guides ask for invalidation of the area they cover.
      const guides = ed.getGuides();
      const guideEvents: unknown[] = [];
      guides.addEventListener(guides.constructor.InvalidationRequestEvent, (e: { area: unknown }) =>
        guideEvents.push(H.r(e.area)),
      );
      guides.invalidate(new G.GRect(1, 2, 3, 4));
      guides.invalidate(new G.GRect(5, 5, 0, 0));
      guides.invalidate();
      out.guides = guideEvents;
      // Undo and redo run inside RecordedTransactionStarted/Finished, and
      // nodes are flagged as recordedTransaction while they replay.
      const rec: unknown[] = [];
      const r2 = H.add(H.rect(0, 0, 10, 10));
      const started = (e: { scene: unknown }) =>
        rec.push(["started", e.scene === s, r2.recordedTransaction === true]);
      const ended = (e: { scene: unknown }) =>
        rec.push(["finished", e.scene === s, r2.recordedTransaction === true]);
      s.addEventListener(G.GScene.RecordedTransactionStartedEvent, started);
      s.addEventListener(G.GScene.RecordedTransactionFinishedEvent, ended);
      const seen = () =>
        rec.push([
          "change",
          r2.recordedTransaction === true,
          H.attempt(() => r2.isRecordedTransaction()),
        ]);
      s.addEventListener(G.GNode.AfterPropertiesChangeEvent, seen);
      ed.beginTransaction();
      r2.setProperty("name", "a");
      ed.commitTransaction("Rename");
      rec.push(["--", "undo"]);
      ed.undoState();
      rec.push(["--", "redo"]);
      ed.redoState();
      s.removeEventListener(G.GScene.RecordedTransactionStartedEvent, started);
      s.removeEventListener(G.GScene.RecordedTransactionFinishedEvent, ended);
      s.removeEventListener(G.GNode.AfterPropertiesChangeEvent, seen);
      out.recorded = rec;
      // An image reports its status changes. Nothing in the engine resolves
      // a relative URL, so it stays Resolving.
      const other = new G.GImage();
      const statuses: unknown[] = [];
      other.addEventListener(G.GImage.StatusEvent, (e: { status: unknown }) =>
        statuses.push(e.status),
      );
      H.add(other);
      other.setProperty("url", "assets/missing-too.png");
      await until("image status", () => statuses.length > 0);
      out.imageStatus = { events: statuses, final: other.getStatus() };
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
