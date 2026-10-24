import type { Scenario } from "../../support/scenario.ts";

/**
 * In-page checks of public GEditor methods and statics (reached through
 * app.editor() and its constructor), for behaviour the UI only reaches
 * indirectly. Engine objects are loosely typed here.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- engine objects from window.__parity */
export const editorInPage: Scenario[] = [
  {
    id: "editor-tools/editor/api-convert-to-constrain",
    covers: ["EDT-EDITOR-023"],
    kind: "json",
    inPage: ({ app }) => {
      const GEditor = app.editor().constructor;
      // Vectors around the 22.5 degree threshold (tan = 0.4142), on both
      // axes and in all quadrants, with and without a rotated frame.
      const vectors = [
        [100, 0],
        [100, 41],
        [100, 42],
        [100, 100],
        [41, 100],
        [42, 100],
        [-100, 30],
        [-100, -60],
        [30, -100],
        [0, 0],
      ];
      const out: unknown[] = [];
      for (const angle of [0, Math.PI / 6]) {
        for (const [x = 0, y = 0] of vectors) {
          const p = GEditor.convertToConstrain(10, 20, 10 + x, 20 + y, angle);
          out.push([angle, x, y, p.getX(), p.getY()]);
        }
      }
      return out;
    },
  },
  {
    id: "editor-tools/editor/api-group-bboxes",
    covers: ["EDT-EDITOR-024"],
    kind: "json",
    inPage: ({ G, app }) => {
      const GEditor = app.editor().constructor;
      const a = new G.GRectangle();
      a.setProperty("trf", new G.GTransform(50, 0, 0, 30, 100, 100));
      const b = new G.GEllipse();
      b.setProperty(
        "trf",
        new G.GTransform(40, 0, 0, 20, 0, 0).rotated(Math.PI / 5).translated(300, 200),
      );
      app.editor().insertElements([a, b]);
      app.editor().updateSelection(false, [a, b]);
      const rect = (r: any) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);
      const sel = app.selection();
      return {
        geometry: rect(GEditor.getGroupGeometryBBox(sel)),
        geometryPreview: rect(GEditor.getGroupGeometryBBox(sel, false, true)),
        transform: rect(GEditor.getGroupTransformBBox(sel)),
        selection: rect(app.editor().getSelectionBBox()),
        selectionPaint: rect(app.editor().getSelectionBBox(true)),
        none: rect(GEditor.getGroupGeometryBBox([])),
      };
    },
  },
  {
    id: "editor-tools/editor/api-transactions-and-events",
    covers: ["EDT-EDITOR-002", "EDT-EDITOR-003", "EDT-SEL-007"],
    kind: "json",
    inPage: ({ G, app }) => {
      const editor = app.editor();
      const GEditor = editor.constructor;
      const log: unknown[] = [];
      const name = (n: any) => (n ? n.getNodeName() : null);
      const listeners: [unknown, (e: any) => void][] = [
        [
          GEditor.ModifiedEvent,
          (e) => log.push(["modified", e.data ? (e.data.evtType ?? "<none>") : null]),
        ],
        [
          GEditor.SelectionChangedEvent,
          () => log.push(["selection", editor.getSelection()?.map(name) ?? null]),
        ],
        [GEditor.InlineEditorEvent, (e) => log.push(["inline", e.type])],
      ];
      for (const [type, fn] of listeners) editor.addEventListener(type, fn);
      try {
        const a = new G.GRectangle();
        a.setProperty("trf", new G.GTransform(50, 0, 0, 30, 100, 100));
        const t = new G.GText();
        t.setText("Hi", 1, 1);
        t.setProperty("trf", new G.GTransform(1, 0, 0, 1, 300, 100));
        log.push("insert");
        editor.insertElements([a, t]);
        log.push("select-two");
        editor.updateSelection(false, [a, t]);
        log.push("transaction");
        GEditor.tryRunTransaction(a, () => a.setProperty("name", "Renamed"), "my change");
        const undoName = editor.getUndoStateName();
        log.push("undo");
        editor.undoState();
        log.push("redo");
        editor.redoState();
        log.push("open-inline");
        editor.updateSelection(false, [t]);
        editor.openInlineEditor(t, app.view());
        const inline = editor.isInlineEditing();
        log.push("close-inline");
        editor.closeInlineEditor();
        // Without an editor (node outside any scene) the function still runs.
        const loose = new G.GRectangle();
        let ranLoose = false;
        GEditor.tryRunTransaction(loose, () => (ranLoose = true), "loose");
        return { log, undoName, inline, ranLoose, name: a.getProperty("name") };
      } finally {
        for (const [type, fn] of listeners) editor.removeEventListener(type, fn);
      }
    },
  },
  {
    id: "editor-tools/editor/api-exchange-and-center",
    covers: ["EDT-EDITOR-018", "EDT-EDITOR-022"],
    kind: "json",
    inPage: ({ G, app }) => {
      const editor = app.editor();
      const page = app.scene().getActivePage();
      const kids = () => {
        const out: unknown[] = [];
        for (let c = page.getFirstChild(); c; c = c.getNext()) {
          const trf = c.getProperty("trf");
          out.push([
            c.getNodeName(),
            trf ? trf.getMatrix() : null,
            c.hasFlag(G.GNode.Flag.Selected),
          ]);
        }
        return out;
      };
      const a = new G.GRectangle();
      a.setProperty("trf", new G.GTransform(50, 0, 0, 30, 100, 100));
      const b = new G.GRectangle();
      b.setProperty("trf", new G.GTransform(20, 0, 0, 20, 400, 100));
      editor.insertElements([a, b]);
      editor.updateSelection(false, [a]);
      const e1 = new G.GEllipse();
      e1.setProperty("trf", new G.GTransform(10, 0, 0, 10, 10, 10));
      const e2 = new G.GEllipse();
      e2.setProperty("trf", new G.GTransform(15, 0, 0, 15, 20, 20));
      editor.exchangeElements(a, [e1, e2]);
      const exchanged = { kids: kids(), undo: editor.getUndoStateName() };
      // Center on an infinite page (its paint bbox), then on a fixed page.
      editor.updateSelection(false, [e1, e2]);
      editor.centerSelection();
      const infinite = kids();
      page.setProperties(["w", "h"], [600, 400]);
      editor.centerSelection();
      return { exchanged, infinite, fixed: kids(), undo: editor.getUndoStateName() };
    },
  },
  {
    id: "editor-tools/editor/api-insert-elements",
    covers: ["EDT-EDITOR-017", "EDT-EDITOR-009"],
    kind: "json",
    inPage: ({ G, app }) => {
      const editor = app.editor();
      const page = app.scene().getActivePage();
      const path = (n: any): string | null => {
        if (!n) return null;
        const parts: number[] = [];
        let c = n;
        while (c && c.getParent()) {
          parts.unshift(c.getParent().getIndexOfChild(c));
          c = c.getParent();
        }
        return `${parts.join("/")}:${n.getNodeName()}`;
      };
      const paths = (list: any) => (Array.isArray(list) ? list.map(path) : list);
      const rect = (x: number) => {
        const r = new G.GRectangle();
        r.setProperty("trf", new G.GTransform(20, 0, 0, 20, x, 100));
        return r;
      };
      const out: Record<string, unknown> = {};
      const lower = new G.GLayer();
      const upper = new G.GLayer();
      page.appendChild(lower);
      page.appendChild(upper);
      // No active layer: into the page.
      const r1 = rect(100);
      editor.insertElements([r1]);
      out.noActiveLayer = [path(r1), editor.getUndoStateName(), paths(app.selection())];
      // Into the active layer.
      upper.setFlag(G.GNode.Flag.Active);
      const r2 = rect(150);
      editor.insertElements([r2]);
      out.activeLayer = path(r2);
      out.scopes = paths(editor.getMappingScopes());
      out.exclusions = paths(editor.getAlignExclusions());
      // Above the selection: r3 goes right above r1 in the page.
      editor.updateSelection(false, [r1]);
      const r3 = rect(200);
      editor.insertElements([r3], false, false, true);
      out.aboveSelection = path(r3);
      // NoNewChildren on the active layer blocks insertion.
      upper.setProperty("plkt", G.GBlock.ProgramLck.NoNewChildren);
      const r4 = rect(250);
      editor.insertElements([r4]);
      out.noNewChildren = r4.getParent() ? path(r4) : "not inserted";
      upper.setProperty("plkt", null);
      // Annotations are not inserted while a layer is the target.
      const ann = new G.GRectangleAnnotation();
      ann.setProperty("trf", new G.GTransform(20, 0, 0, 20, 300, 100));
      editor.insertElements([ann]);
      out.annotationIntoLayer = ann.getParent() ? path(ann) : "not inserted";
      // A locked active layer is skipped: the page (and for annotations
      // its annotation list) is the target instead.
      upper.setProperty("lkt", true);
      editor.clearSelection();
      out.emptyScopes = paths(editor.getMappingScopes());
      const r5 = rect(350);
      editor.insertElements([r5]);
      out.lockedLayer = [!!upper.isLocked(), path(r5)];
      editor.insertElements([ann]);
      out.annotation = ann.getParent() ? path(ann) : "not inserted";
      upper.setProperty("lkt", false);
      // Scopes and exclusions for an element inside a group.
      const g = new G.GGroup();
      const inner = rect(400);
      g.appendChild(inner);
      editor.insertElements([g]);
      editor.updateSelection(false, [inner]);
      out.groupChild = {
        scopes: paths(editor.getMappingScopes()),
        exclusions: paths(editor.getAlignExclusions()),
        groupExclusions: paths(editor.getAlignExclusions(false, [g])),
        childrenOnly: paths(editor.getAlignExclusions(true, [g])),
      };
      return out;
    },
  },
  {
    id: "editor-tools/editor/api-select-pattern-and-blink",
    covers: ["EDT-SEL-010", "EDT-SEL-011"],
    kind: "json",
    inPage: ({ G, app }) => {
      const editor = app.editor();
      const specs: [number, number[] | null, boolean][] = [
        [100, [229, 57, 53], false],
        [150, [67, 160, 71], false],
        [200, [229, 57, 53], false],
        [250, [229, 57, 53], true],
        [300, null, false],
      ];
      const shapes = specs.map(([x]) => {
        const r = new G.GRectangle();
        r.setProperty("trf", new G.GTransform(20, 0, 0, 20, x, 100));
        r.setProperty("name", `r${x}`);
        return r;
      });
      editor.insertElements(shapes);
      specs.forEach(([, rgb, locked], i) => {
        const r = shapes[i];
        const layers = r.getPaintLayers();
        for (let l = layers.getFirstChild(); l; l = l.getNext()) {
          if (l instanceof G.GStylable.FillPaintLayer)
            l.setProperty("_pt", rgb ? new G.GRGBColor(rgb) : null);
        }
        if (locked) r.setFlag(G.GElement.Flag.FullLocked);
      });
      editor.clearSelection();
      const names = (list: any) =>
        Array.isArray(list) ? list.map((n: any) => n.getProperty("name")) : list;
      const red = new G.GRGBColor([229, 57, 53]);
      const onlyFind = names(editor.selectFromPattern(red, true));
      const selectedAfterFind = names(app.selection());
      const select = names(editor.selectFromPattern(red));
      const selectedAfterSelect = names(app.selection());
      const none = editor.selectFromPattern(new G.GRGBColor([1, 2, 3]));

      // Blink on a virtual clock: the timers blinkSelection starts are
      // collected and run in time order, recording the Highlighted flag of
      // each selected shape after every timer.
      interface Timer {
        id: number;
        at: number;
        every: number | null;
        fn: () => void;
      }
      const w = window as unknown as Record<string, unknown>;
      const real = {
        setTimeout: w.setTimeout,
        setInterval: w.setInterval,
        clearInterval: w.clearInterval,
      };
      let timers: Timer[] = [];
      let nextId = 1;
      let now = 0;
      w.setTimeout = (fn: () => void, ms: number) => {
        timers.push({ id: nextId, at: now + ms, every: null, fn });
        return nextId++;
      };
      w.setInterval = (fn: () => void, ms: number) => {
        timers.push({ id: nextId, at: now + ms, every: ms, fn });
        return nextId++;
      };
      w.clearInterval = (id: number) => {
        timers = timers.filter((t) => t.id !== id);
      };
      const flags = () => app.selection().map((n: any) => n.hasFlag(G.GNode.Flag.Highlighted));
      const blink: unknown[] = [];
      try {
        editor.blinkSelection(1000, 4);
        blink.push([0, flags()]);
        for (let i = 0; i < 40 && timers.length > 0; i++) {
          timers.sort((x, y) => x.at - y.at || x.id - y.id);
          const t = timers[0] as Timer;
          now = t.at;
          if (t.every === null) timers.shift();
          else t.at += t.every;
          t.fn();
          blink.push([now, flags()]);
        }
      } finally {
        Object.assign(w, real);
      }
      return {
        onlyFind,
        selectedAfterFind,
        select,
        selectedAfterSelect,
        none,
        blink,
        left: timers.length,
      };
    },
  },
  {
    id: "editor-tools/editor/api-drop-font-and-custom",
    covers: ["EDT-TEXTEDIT-003", "EDT-EDITOR-003"],
    kind: "json",
    inPage: async ({ G, app }) => {
      const editor = app.editor();
      const GEditor = editor.constructor;
      const ready = () => app.editorTools.fontsReady();
      for (let i = 0; i < 300 && !ready(); i++) await new Promise((r) => setTimeout(r, 100));
      app.editorTools.prepareView(1, 400, 200);
      const t = new G.GText();
      t.setProperties(["aw", "ah"], [true, true]);
      t.setText("Drop here", 1, 1);
      t.setProperty("trf", new G.GTransform(1, 0, 0, 1, 100, 100));
      editor.insertElements([t]);
      editor.clearSelection();
      // Real DOM drag events at the client point of scene (120, 110).
      const m = app.editorTools.worldToView();
      const widget = document.querySelector(".g-editor-widget") as HTMLElement;
      const box = widget.getBoundingClientRect();
      const at = (x: number, y: number) => ({
        clientX: box.left + m[0] * x + m[2] * y + m[4],
        clientY: box.top + m[1] * x + m[3] * y + m[5],
      });
      const drop = (x: number, y: number, type: string, data: string) => {
        const dt = new DataTransfer();
        dt.setData(type, data);
        const p = at(x, y);
        const target = document.elementFromPoint(p.clientX, p.clientY) as HTMLElement;
        for (const name of ["dragenter", "dragover", "drop"]) {
          target.dispatchEvent(
            new DragEvent(name, { bubbles: true, cancelable: true, dataTransfer: dt, ...p }),
          );
        }
      };
      const custom: unknown[] = [];
      const onCustom = (e: any) =>
        custom.push([e.data, Math.round(e.position.getX()), Math.round(e.position.getY())]);
      editor.addEventListener(GEditor.CustomDropEvent, onCustom);
      try {
        drop(120, 110, "application/font+family", "Lato");
        // The dropped family loads asynchronously.
        await new Promise((r) => setTimeout(r, 50));
        for (let i = 0; i < 300 && !ready(); i++) await new Promise((r) => setTimeout(r, 100));
        const afterFont = {
          tff: t.getProperty("_tff"),
          content: JSON.parse(G.GNode.serialize(t)).ct,
          undo: editor.getUndoStateName(),
        };
        drop(300, 300, "gravit/custom+drop+data", "payload");
        return { afterFont, custom };
      } finally {
        editor.removeEventListener(GEditor.CustomDropEvent, onCustom);
      }
    },
  },
];
