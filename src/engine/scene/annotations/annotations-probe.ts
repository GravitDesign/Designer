// Test support: drives the annotation classes through hit testing,
// painting, geometry updates, links and store/restore, and returns plain
// data. The same function runs in the old app's page (to record
// __fixtures__/old-annotations.json; the TypeScript types are stripped
// first) and against the port in annotations-probe.test.ts, with the G
// namespace and the app hooks of each app, so it may only use what it is
// given and no imports. Times are left out: they come from the clock.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export function probeAnnotations(G: any, app: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const Change: Record<string, number> = Object.assign({}, G.GNode._Change, G.GElement._Change);
  const changeName = (id: unknown): string => {
    const names = Object.keys(Change).filter((name) => Change[name] === id);
    return names.length ? names.sort().join("|") : "change:" + String(id);
  };
  let refNames: Record<string, string> = {};

  const enc = (value: any, depth = 0): any => {
    if (typeof value === "number") {
      if (Object.is(value, -0)) return "-0";
      if (Number.isNaN(value)) return "NaN";
      if (value === Infinity) return "Inf";
      if (value === -Infinity) return "-Inf";
      return value;
    }
    if (value === undefined) return "undef";
    if (typeof value === "string") return refNames[value] || value;
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "function") return "fn";
    if (depth > 5) return "deep";
    if (Array.isArray(value)) return value.map((v) => enc(v, depth + 1));
    if (value instanceof G.GNode) return "node:" + G.GNode.getName(value);
    if (typeof value.getMatrix === "function") return ["T"].concat(value.getMatrix().map(enc));
    if (typeof value.getX === "function" && typeof value.getWidth === "function") {
      return [
        "R",
        enc(value.getX()),
        enc(value.getY()),
        enc(value.getWidth()),
        enc(value.getHeight()),
      ];
    }
    if (typeof value.getX === "function") return ["P", enc(value.getX()), enc(value.getY())];
    if (value instanceof G.GRGBColor) return "color:" + value.toScreenCSS();
    const result: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) result[key] = enc(value[key], depth + 1);
    return result;
  };
  const attempt = (fn: () => any): any => {
    try {
      return enc(fn());
    } catch (e) {
      return "throws: " + String((e as Error).name);
    }
  };
  const hits = (result: any): any => {
    if (!result) return enc(result);
    return result.map((hit: any) => ({
      element: G.GNode.getName(hit.element),
      data: hit.data
        ? enc(
            Object.keys(hit.data).reduce((all: any, key) => {
              // The action is a class without a G name: say whose it is.
              all[key] =
                key === "action" && hit.element.getActions
                  ? "action:" + hit.element.getActions().indexOf(hit.data[key])
                  : hit.data[key];
              return all;
            }, {}),
          )
        : enc(hit.data),
    }));
  };
  const blobOf = (node: any, options?: any): any => JSON.parse(G.GNode.serialize(node, options));
  const keys = (blob: any): string[] => Object.keys(blob).sort();

  app.newInfiniteDocument();
  const scene = app.scene();
  const page = scene.getActivePage();
  let layer = scene.getActiveLayer();
  for (let child = page.getFirstChild(); !layer && child; child = child.getNext()) {
    if (G.GNode.getName(child) === "layer") layer = child;
  }
  if (!layer) {
    layer = new G.GLayer();
    page.appendChild(layer);
  }
  const list = page.getAnnotations();

  // -- GCommentAnnotation.hitTest: the paint box test, then the shape.
  {
    const pin = new G.GCommentAnnotation();
    pin.initSizeAndPosition();
    pin.initDefaultForLimitedRestore();
    pin.getPaintLayers().appendChild(new G.GStylable.FillPaintLayer(new G.GRGBColor([0, 0, 0])));
    const box = pin.getPaintBBox();
    const left = new G.GPoint(box.getX() - 2, box.getY() + box.getHeight() / 2);
    const inside = new G.GPoint(10, 10);
    const scale = new G.GTransform(2, 0, 0, 2, 0, 0);
    out.comment = {
      paintBox: enc(box),
      inside: attempt(() => hits(pin.hitTest(inside))),
      outside: attempt(() => hits(pin.hitTest(new G.GPoint(-100, 10)))),
      leftNoTolerance: attempt(() => hits(pin.hitTest(left))),
      leftTolerance3: attempt(() => hits(pin.hitTest(left, null, null, false, null, 3))),
      leftTolerance3Identity: attempt(() =>
        hits(pin.hitTest(left, new G.GTransform(), null, false, null, 3)),
      ),
      leftTolerance1Identity: attempt(() =>
        hits(pin.hitTest(left, new G.GTransform(), null, false, null, 1)),
      ),
      leftTolerance3Scaled: attempt(() =>
        hits(pin.hitTest(new G.GPoint(left.getX() * 2, 20), scale, null, false, null, 3)),
      ),
      scaled: attempt(() => hits(pin.hitTest(new G.GPoint(20, 20), scale))),
      scaledMiss: attempt(() => hits(pin.hitTest(new G.GPoint(100, 100), scale))),
      filterFalse: attempt(() =>
        hits(pin.hitTest(inside, null, null, false, null, 0, false, () => false)),
      ),
      filterTrue: attempt(() =>
        hits(pin.hitTest(inside, null, null, false, null, 0, false, () => true)),
      ),
      filterZero: attempt(() =>
        hits(pin.hitTest(inside, null, null, false, null, 0, false, () => 0)),
      ),
      acceptor: [0, 1, 2, true, false, "1", null].map((answer) =>
        attempt(() => hits(pin.hitTest(inside, null, () => answer))),
      ),
      stacked: attempt(() => hits(pin.hitTest(inside, null, null, true))),
      emptyBox: attempt(() => hits(new G.GCommentAnnotation().hitTest(inside))),
    };
  }

  // -- GAnnotationsList: hit test, paint and the geometry update modes.
  {
    const rect = new G.GRectangleAnnotation();
    rect.setProperty("trf", new G.GTransform(10, 0, 0, 5, 20, 20));
    rect.getPaintLayers().appendChild(new G.GStylable.FillPaintLayer(new G.GRGBColor([0, 0, 0])));
    const ellipse = new G.GEllipseAnnotation();
    ellipse.setProperty("trf", new G.GTransform(4, 0, 0, 4, 50, 50));
    const empty = new G.GEmptyAnnotation();
    list.appendAnnotation(rect, "R", "u1");
    list.appendAnnotation(ellipse, "E", "u2");
    list.appendAnnotation(empty, "N", "u3");
    const at = (x: number, y: number) => new G.GPoint(x, y);
    const listOut: Record<string, unknown> = {
      boxes: [enc(list.getGeometryBBox()), enc(list.getPaintBBox())],
      hitRect: attempt(() => hits(list.hitTest(at(20, 20)))),
      hitRectStacked: attempt(() => hits(list.hitTest(at(20, 20), null, null, true))),
      hitEllipseUnfilled: attempt(() => hits(list.hitTest(at(50, 50)))),
      hitEllipseOutline: attempt(() => hits(list.hitTest(at(46, 50), null, null, false, null, 1))),
      hitEllipseOutlineIdentity: attempt(() =>
        hits(list.hitTest(at(46, 50), new G.GTransform(), null, false, null, 1)),
      ),
      hitNothingInBox: attempt(() => hits(list.hitTest(at(40, 40)))),
      hitNothingInBoxStacked: attempt(() => hits(list.hitTest(at(40, 40), null, null, true))),
      hitOutside: attempt(() => hits(list.hitTest(at(500, 500)))),
      hitAcceptorList: attempt(() =>
        hits(
          list.hitTest(at(20, 20), null, (element: any) =>
            G.GNode.getName(element) === "annlst" ? 1 : 0,
          ),
        ),
      ),
      hitScaled: attempt(() => hits(list.hitTest(at(40, 40), new G.GTransform(2, 0, 0, 2, 0, 0)))),
    };

    // paint: only element children are painted, and only while the
    // list is paintable in the context.
    const painted: string[] = [];
    for (const child of [rect, ellipse, empty]) {
      child.paint = function (this: any) {
        painted.push(G.GNode.getName(this));
      };
    }
    const context = (visible: boolean, clipArea: any, dirty: any) => ({
      configuration: {
        multiPageView: false,
        clipArea,
        isElementAnnotationsVisible: () => visible,
      },
      dirtyMatcher: dirty,
    });
    const paintRuns: any[] = [];
    const paintCases: [string, any][] = [
      ["visible", context(true, null, null)],
      ["hidden", context(false, null, null)],
      ["clipOutside", context(true, new G.GRect(200, 200, 10, 10), null)],
      ["clipInside", context(true, new G.GRect(0, 0, 30, 30), null)],
      ["notDirty", context(true, null, { isDirty: () => false })],
      ["dirty", context(true, null, { isDirty: () => true })],
    ];
    for (const [name, paintContext] of paintCases) {
      painted.length = 0;
      const result = attempt(() => list.paint(paintContext));
      paintRuns.push([name, result, painted.slice()]);
    }
    list.setFlag(G.GElement.Flag.NoPaint);
    painted.length = 0;
    paintRuns.push([
      "noPaint",
      attempt(() => list.paint(context(true, null, null))),
      painted.slice(),
    ]);
    list.removeFlag(G.GElement.Flag.NoPaint);
    for (const child of [rect, ellipse, empty]) delete child.paint;
    listOut.paint = paintRuns;

    // _handleChange(FinishGeometryUpdate, args) for each mode: what the
    // page hears, what is invalidated and which caches are cleared.
    const log: any[] = [];
    const pageNotify = page._notifyChange;
    page._notifyChange = function (this: any, ...rest: any[]) {
      const [change, args] = rest;
      log.push([
        "page",
        changeName(change),
        Array.isArray(args) ? args.map((a: any) => enc(a)) : enc(args),
      ]);
      return pageNotify.apply(this, rest);
    };
    const invalidate = scene._invalidateArea;
    scene._invalidateArea = function (this: any, ...rest: any[]) {
      const [area, node] = rest;
      log.push(["invalidate", enc(area), node ? G.GNode.getName(node) : null]);
      return invalidate.apply(this, rest);
    };
    const sentinel = () => new G.GRect(1, 2, 3, 4);
    const modes: [string, any, boolean][] = [
      ["none", undefined, false],
      ["0", 0, false],
      ["0-changed", 0, true],
      ["1", 1, false],
      ["1-changed", 1, true],
      ["2", 2, false],
      ["2-changed", 2, true],
      ["-1", -1, false],
      ["-1-changed", -1, true],
      // The extra value goes to the page as the area to invalidate.
      ["[0,area]", [0, new G.GRect(7, 7, 1, 1)], false],
      ["[1,y]-changed", [1, "y"], true],
      ["string", "1", true],
    ];
    const finish: Record<string, unknown> = {};
    for (const [name, mode, changed] of modes) {
      log.length = 0;
      list._handleChange(Change.PrepareGeometryUpdate);
      const saved = enc(list._savedPaintBBox);
      if (changed) list._savedPaintBBox = new G.GRect(0, 0, 1, 1);
      list._geometryBBox = sentinel();
      list._paintBBox = sentinel();
      list._preTransformRect = sentinel();
      const result = attempt(() => list._handleChange(Change.FinishGeometryUpdate, mode));
      finish[name] = {
        result,
        saved,
        geometryBBox: enc(list._geometryBBox),
        paintBBox: enc(list._paintBBox),
        preTransformRect: enc(list._preTransformRect),
        savedAfter: [enc(list._savedPaintBBox), enc(list._savedGeometryBBox)],
        log: log.slice(),
      };
    }
    listOut.finish = finish;
    // Restore real boxes after the sentinels.
    list._geometryBBox = null;
    list._paintBBox = null;
    list._preTransformRect = null;

    const other: Record<string, unknown> = {};
    const step = (name: string, fn: () => void) => {
      log.length = 0;
      list._paintBBox = sentinel();
      const result = attempt(fn);
      other[name] = { result, paintBBox: enc(list._paintBBox), log: log.slice() };
      list._paintBBox = null;
    };
    step("childVisual", () => list._handleChange(Change.ChildVisualUpdate, [rect]));
    step("childGeometry", () => list._handleChange(Change.ChildGeometryUpdate, [rect, true]));
    step("childGeometryUnchanged", () =>
      list._handleChange(Change.ChildGeometryUpdate, [rect, false]),
    );
    step("invalidationRequested", () =>
      list._handleChange(Change.InvalidationRequested, new G.GRect(5, 6, 7, 8)),
    );
    step("invalidationRequest", () => list._handleChange(Change.InvalidationRequest));
    step("flagNoPaint", () =>
      list._handleChange(Change.AfterFlagChange, { flag: G.GElement.Flag.NoPaint, set: true }),
    );
    step("flagOther", () =>
      list._handleChange(Change.AfterFlagChange, { flag: G.GNode.Flag.Selected, set: true }),
    );
    step("beginEnd", () => {
      list.beginUpdate();
      list.endUpdate();
    });
    step("beginEndVisual", () => {
      list.beginUpdate(true);
      list.endUpdate(true);
    });
    step("moveChild", () => rect.setProperty("trf", new G.GTransform(10, 0, 0, 5, 30, 20)));
    listOut.other = other;
    delete page._notifyChange;
    delete scene._invalidateArea;
    out.list = listOut;
    list.removeChild(rect);
    list.removeChild(ellipse);
    list.removeChild(empty);
  }

  // -- GAnnotable.linkAnnotation, getLinkedAnnotations, and the links a
  // GCollaborativeTextAnnotation stores and restores.
  {
    const collab = new G.GCollabText();
    collab.setProperty("trf", new G.GTransform(50, 0, 0, 30, 100, 100));
    layer.appendChild(collab);
    const note = new G.GCollaborativeTextAnnotation();
    note.setProperty("trf", new G.GTransform(10, 0, 0, 10, 0, 0));
    list.appendAnnotation(note, "C", "u4");
    const plain = new G.GRectangleAnnotation();
    list.appendAnnotation(plain, "P", "u5");
    const shape = new G.GRectangle();
    layer.appendChild(shape);
    refNames = {};
    refNames[collab.getReferenceId()] = "REF:collab";
    const links: Record<string, unknown> = {
      noScene: attempt(() => new G.GCollabText().linkAnnotation(note)),
      notLinkable: attempt(() => collab.linkAnnotation(plain)),
      linkable: attempt(() => collab.linkAnnotation(note)),
      again: attempt(() => collab.linkAnnotation(note)),
      isLinked: attempt(() => scene.isLinked(note, collab)),
      references: attempt(() => note.getAnnotableReferences()),
      linkedBefore: attempt(() => collab.getLinkedAnnotations()),
      noSceneLinked: attempt(() => new G.GCollabText().getLinkedAnnotations()),
    };
    // A non-annotation linked to the collab text is left out.
    scene.link(collab, shape);
    links.linkedWithShape = attempt(() => collab.getLinkedAnnotations());
    links.noteRefs = attempt(() => note.getProperty("refs"));

    note.setProperty("targetGuid", "tg");
    const blob = blobOf(note);
    links.blobKeys = keys(blob);
    links.blob = enc({
      annotablerefs: blob.annotablerefs,
      targetGuid: blob.targetGuid,
      refs: blob.refs,
    });
    const separate = JSON.parse(JSON.stringify(G.GNode.store(note, { separateSaving: true })));
    links.separateKeys = keys(separate);
    links.separateOwnKeys = separate.own ? keys(separate.own) : null;
    links.separate = enc({
      annotablerefs: separate.own && separate.own.annotablerefs,
      targetGuid: separate.own && separate.own.targetGuid,
      outerTargetGuid: separate.targetGuid,
    });

    // Restore: out of the scene, the saved references wait; once inserted
    // they are linked and dropped.
    list.removeChild(note);
    links.afterRemove = attempt(() => scene.isLinked(note, collab));
    const restored = G.GNode.deserialize(JSON.stringify(blob));
    links.restoredPending = attempt(() => restored._getRestoredAnnotableReferences());
    links.restoredTargetGuid = attempt(() => restored.getProperty("targetGuid"));
    list.appendChild(restored);
    links.restoredAfterAttach = attempt(() => restored._getRestoredAnnotableReferences());
    links.restoredLinked = attempt(() => scene.isLinked(restored, collab));
    links.restoredReferences = attempt(() => restored.getAnnotableReferences());
    links.linkedAfter = attempt(() => collab.getLinkedAnnotations());
    // Saved references that aren't in the workspace are skipped.
    const orphan = G.GNode.deserialize(
      JSON.stringify({ "@": "ancotext", annotablerefs: ["nope"], targetGuid: "x" }),
    );
    list.appendChild(orphan);
    links.orphanAfterAttach = attempt(() => orphan._getRestoredAnnotableReferences());
    links.orphanReferences = attempt(() => orphan.getAnnotableReferences());
    out.links = links;
    list.removeChild(restored);
    list.removeChild(orphan);
    list.removeChild(plain);
    refNames = {};

    // -- GCollabText: the paint box raised by the button row, the hit
    // order (shape, then button), the button and its action.
    const actions = collab.getActions();
    const box = collab.getPaintBBox();
    const identity = new G.GTransform();
    const collabOut: Record<string, unknown> = {
      geometryBox: enc(collab.getGeometryBBox()),
      paintBox: enc(box),
      actionsBox: enc(collab.getActionsBBox()),
      actionSource: enc(actions[0].getSourceBBox()),
      hitNoTransform: attempt(() => hits(collab.hitTest(new G.GPoint(200, 200)))),
      hitInside: attempt(() => hits(collab.hitTest(new G.GPoint(200, 200), identity))),
      hitButton: attempt(() => hits(collab.hitTest(new G.GPoint(5088, 88), identity))),
      hitButtonCorner: attempt(() => hits(collab.hitTest(new G.GPoint(5077, 77), identity))),
      hitAboveLeft: attempt(() => hits(collab.hitTest(new G.GPoint(200, 88), identity))),
      hitButtonScaled: attempt(() =>
        hits(collab.hitTest(new G.GPoint(5088 * 2, 88 * 2), new G.GTransform(2, 0, 0, 2, 0, 0))),
      ),
      hitButtonTolerance: attempt(() =>
        hits(collab.hitTest(new G.GPoint(5088, 74), identity, null, false, null, 3)),
      ),
      detailNullTransform: attempt(() => collab._detailHitTest(new G.GPoint(5088, 88), null, 0)),
      detailInsideNullTransform: attempt(() =>
        hits([collab._detailHitTest(new G.GPoint(200, 200), null, 0)]),
      ),
    };
    collab.getPaintLayers().appendChild(new G.GStylable.FillPaintLayer(new G.GRGBColor([0, 0, 0])));
    collabOut.hitInsideFilled = attempt(() =>
      hits(collab.hitTest(new G.GPoint(200, 200), identity)),
    );
    collabOut.hitEdgeFilled = attempt(() =>
      hits(collab.hitTest(new G.GPoint(5099, 100), identity)),
    );
    const calls: any[] = [];
    const editor = (editing: boolean) => ({
      isInlineEditing: () => {
        calls.push("isInlineEditing");
        return editing;
      },
      closeInlineEditor: () => calls.push("closeInlineEditor"),
      updateSelection: (toggle: any, elements: any) =>
        calls.push(["updateSelection", toggle, elements.map((e: any) => G.GNode.getName(e))]),
      openInlineEditor: (element: any, event: any) =>
        calls.push(["openInlineEditor", G.GNode.getName(element), event]),
    });
    collabOut.executeEditing = attempt(() => {
      calls.length = 0;
      actions[0].execute(collab, editor(true), "evt");
      return calls.slice();
    });
    collabOut.executeIdle = attempt(() => {
      calls.length = 0;
      actions[0].execute(collab, editor(false), "evt");
      return calls.slice();
    });
    const canvasCalls: any[] = [];
    const canvas = {
      putVertices: (source: any) => {
        let count = 0;
        const vertex = new G.GVertex();
        const first: number[] = [];
        if (source.rewindVertices(0)) {
          while (source.readVertex(vertex)) {
            if (count === 0) first.push(vertex.command, vertex.x, vertex.y);
            count++;
          }
        }
        canvasCalls.push(["putVertices", count, first]);
      },
      fillVertices: (fill: any, opacity: any) =>
        canvasCalls.push(["fillVertices", typeof fill === "string" ? fill : enc(fill), opacity]),
    };
    collabOut.actionPaint = attempt(() => {
      actions[0].paint({ canvas }, new G.GTransform(1, 0, 0, 1, 10, 20));
      return canvasCalls;
    });
    out.collab = collabOut;
    layer.removeChild(collab);
    layer.removeChild(shape);
  }

  // -- GEmptyAnnotation: the old restore read no meta properties, so a
  // saved "ann" came back with the defaults (BUG-003, fixed in the port).
  {
    const saved = {
      "@": "ann",
      text: "T",
      uid: "u9",
      seq: 4,
      name: "N",
      rsv: true,
      rmd: true,
      loc: "L",
      typ: 2,
      email: "e@example.com",
      read: ["u9", "u8"],
    };
    const node = G.GNode.deserialize(JSON.stringify(saved));
    const names = ["text", "uid", "seq", "name", "rsv", "rmd", "loc", "typ", "email", "read"];
    const again = blobOf(node);
    out.empty = {
      restored: names.map((name) => attempt(() => node.getProperty(name))),
      saved: names.map((name) => enc(again[name])),
      savedKeys: keys(again).filter((k) => k !== "time" && k !== "mtime" && k !== "@id"),
    };
  }

  return out;
}
