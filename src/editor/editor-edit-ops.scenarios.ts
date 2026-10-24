/* eslint-disable @typescript-eslint/no-explicit-any -- the scenarios drive the untyped engine through the G namespace, the same code in the old app and here */
// Scenarios for the GEditor edit operations whose branches editor.test.ts
// doesn't reach: deleteSelection, cloneSelection, insertElements,
// isModified/markSavePoint and the selection modes of _tryAddToSelection.
//
// Each scenario takes the G namespace (old public names) and returns plain
// JSON. editor-edit-ops.test.ts runs them against the port and compares
// with editor-edit-ops.fixture.json, which holds the output of the very
// same functions run in the old app (transpiled to JavaScript and
// evaluated with the old GEditor, GScene and so on). Keep this file free of
// imports so it can be evaluated in the old page as it is.

type Scenario = (G: any) => unknown;

interface Env {
  G: any;
  workspace: any;
  scene: any;
  editor: any;
  page: any;
}

function setup(G: any): Env {
  const workspace = new G.GEditorWorkspace();
  const scene = new G.GScene(workspace);
  const editor = new G.GEditor(scene);
  return { G, workspace, scene, editor, page: scene.getActivePage() };
}

function rect(G: any, x: number, name: string): any {
  const r = new G.GRectangle();
  r.setProperty("trf", new G.GTransform(10, 0, 0, 10, x, 0));
  r.setProperty("name", name);
  return r;
}

function path(G: any, name: string, points: number[][]): any {
  const p = new G.GPath();
  for (const [x, y] of points) {
    const anchor = new G.GPathBase.AnchorPoint();
    anchor.setProperties(["x", "y"], [x, y]);
    p.getAnchorPoints().appendChild(anchor);
  }
  p.setProperty("name", name);
  return p;
}

/** The store name and name of each child, nested for containers. */
function tree(G: any, node: any): unknown[] {
  const out: unknown[] = [];
  for (let child = node.getFirstChild(); child; child = child.getNext()) {
    const label = G.GNode.getName(child) + ":" + String(child.getProperty("name"));
    if (child.hasMixin(G.GNode.Container) && child.getFirstChild()) {
      out.push([label, tree(G, child)]);
    } else out.push(label);
  }
  return out;
}

function names(nodes: any[] | null): unknown[] {
  return (nodes || []).map((node) => node.getProperty("name"));
}

function trf(transform: any): number[] | null {
  return transform ? transform.getMatrix().map((v: number) => Math.round(v * 1000) / 1000) : null;
}

/**
 * Runs `body`, then undoes once. Reports the tree after `body`, the
 * selection, what `observe` returns right after `body` and again after the
 * undo, the undo state's name and whether the undo restored the tree.
 */
function deleteAndUndo(env: Env, root: any, body: () => void, observe?: () => unknown): unknown {
  const { G, editor } = env;
  const before = tree(G, root);
  const states = editor.getUndoStates().length;
  body();
  const after = tree(G, root);
  const observed = observe ? observe() : null;
  const newStates = editor.getUndoStates().length - states;
  const undoName = editor.getUndoStateName();
  const selection = names(editor.getSelection());
  editor.undoState();
  const undone = tree(G, root);
  return {
    after,
    selection,
    observed,
    newStates,
    undoName,
    undoRestores: JSON.stringify(undone) === JSON.stringify(before),
    observedAfterUndo: observe ? observe() : null,
  };
}

export const scenarios: Record<string, Scenario> = {
  // R6-A-002: the old hoisted var keeps the first annotation list for the
  // nodes after it, so a later annotation or comment is not excluded.
  "annotation-exceptions/list-sticks"(G) {
    const { editor, page } = setup(G);
    editor.setUID("me");
    const theirs = new G.GRectangleAnnotation();
    theirs.setProperties(["uid", "name"], ["other", "theirs"]);
    page.getAnnotations().appendChild(theirs);
    const later = new G.GRectangleAnnotation();
    later.setProperties(["uid", "name"], ["other", "later"]);
    const comment = new G.GComment();
    comment.setProperty("name", "comment");
    const own = new G.GRectangleAnnotation();
    own.setProperties(["uid", "name"], ["me", "own"]);
    return {
      afterPage: names(editor.getAnnotationsExceptions([page, later, comment])),
      withoutPage: names(editor.getAnnotationsExceptions([later, comment, own])),
    };
  },

  // R6-A-032: an exception while deselecting is swallowed, the call
  // returns true and the selection update is finished.
  "clear-internal-selection/swallows"(G) {
    const { editor, page } = setup(G);
    const group = new G.GGroup();
    group.setProperty("name", "g");
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    group.appendChild(a);
    group.appendChild(b);
    page.appendChild(group);
    editor.updateSelection(false, [a, b]);
    let events = 0;
    editor.addEventListener(G.GEditor.SelectionChangedEvent, () => events++);
    a.removeFlag = () => {
      throw new Error("listener failed");
    };
    let result: unknown;
    let threw = false;
    try {
      result = editor.clearInternalSelection(group, null);
    } catch {
      threw = true;
    }
    return {
      result,
      threw,
      events,
      counter: editor._selectionUpdateCounter,
      stillSelected: names(group.getInternalSelectedNodes()),
    };
  },

  "delete/no-delete-lock"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const a = rect(G, 0, "a");
    a.setProperty("plkt", G.GBlock.ProgramLck.NoDelete);
    const b = rect(G, 20, "b");
    editor.insertElements([a, b], true);
    return deleteAndUndo(env, page, () => editor.deleteSelection());
  },

  "delete/only-no-delete"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    a.setProperty("plkt", G.GBlock.ProgramLck.NoDelete);
    editor.insertElements([a], true);
    const states = editor.getUndoStates().length;
    editor.deleteSelection();
    return { tree: tree(G, page), newStates: editor.getUndoStates().length - states };
  },

  "delete/empties-groups-and-compound-shapes"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const outer = new G.GGroup();
    outer.setProperty("name", "outer");
    const inner = new G.GGroup();
    inner.setProperty("name", "inner");
    const r = rect(G, 0, "r");
    inner.appendChild(r);
    outer.appendChild(inner);
    outer.appendChild(rect(G, 50, "keep"));
    page.appendChild(outer);
    const shape = new G.GCompoundShape();
    shape.setProperty("name", "shape");
    const s1 = rect(G, 100, "s1");
    const s2 = rect(G, 120, "s2");
    shape.appendChild(s1);
    shape.appendChild(s2);
    page.appendChild(shape);
    editor.updateSelection(false, [r, s1, s2]);
    return deleteAndUndo(env, page, () => editor.deleteSelection());
  },

  "delete/empties-nested-groups"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const outer = new G.GGroup();
    outer.setProperty("name", "outer");
    const inner = new G.GGroup();
    inner.setProperty("name", "inner");
    const r = rect(G, 0, "r");
    inner.appendChild(r);
    outer.appendChild(inner);
    page.appendChild(outer);
    editor.updateSelection(false, [r]);
    return deleteAndUndo(env, page, () => editor.deleteSelection());
  },

  "delete/partial-locked-skipped"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    editor.insertElements([a, b], true);
    a.setFlag(G.GElement.Flag.PartialLocked);
    return deleteAndUndo(env, page, () => editor.deleteSelection());
  },

  "delete/removal-blocked"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    editor.insertElements([a, b], true);
    G.GElementEditor.getEditor(a).blockRemoval();
    return deleteAndUndo(env, page, () => editor.deleteSelection());
  },

  "delete/path-parts"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const p = path(G, "p", [
      [0, 0],
      [40, 0],
      [40, 40],
    ]);
    editor.setPathResize(false);
    editor.insertElements([p], true);
    const pathEditor = G.GElementEditor.getEditor(p);
    const second = p.getAnchorPoints().getFirstChild().getNext();
    pathEditor.updatePartSelection(false, [{ type: G.GPathEditor.PartType.Point, point: second }]);
    const allowed = pathEditor.isDeletePartsAllowed();
    const points = (): unknown[] =>
      p
        .getAnchorPoints()
        .getChildren()
        .map((point: any) => [point.getProperty("x"), point.getProperty("y")]);
    return {
      allowed,
      ...(deleteAndUndo(env, page, () => editor.deleteSelection(), points) as object),
    };
  },

  "delete/active-layer"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const first = new G.GLayer();
    first.setProperty("name", "first");
    const second = new G.GLayer();
    second.setProperty("name", "second");
    page.appendChild(first);
    page.appendChild(second);
    second.appendChild(rect(G, 0, "inside"));
    editor.updateSelection(false, [second]);
    return deleteAndUndo(env, page, () => editor.deleteSelection());
  },

  "delete/symbol-instance-child"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    page.appendChild(a);
    page.appendChild(b);
    const master = G.GSymbol.create([a, b], page, "S");
    master.setProperty("name", "master");
    const instance = master.clone();
    instance.setProperty("name", "instance");
    page.appendChild(instance);
    const extra = rect(G, 60, "extra");
    instance.appendChild(extra);
    const [ia] = instance.getChildren();
    editor.updateSelection(false, [ia, extra]);
    const selected = names(editor.getSelection());
    return {
      selected,
      ...(deleteAndUndo(
        env,
        page,
        () => editor.deleteSelection(),
        () => [ia.getProperty("vis"), ia.getProperty("lkt"), ia.hasFlag(G.GNode.Flag.Selected)],
      ) as object),
    };
  },

  "delete/symbol-instance-child-detail"(G) {
    const env = setup(G);
    const { editor, page } = env;
    const a = rect(G, 0, "a");
    page.appendChild(a);
    const master = G.GSymbol.create([a], page, "S");
    master.setProperty("name", "master");
    const instance = master.clone();
    instance.setProperty("name", "instance");
    page.appendChild(instance);
    const [ia] = instance.getChildren();
    editor.setSelectionDetail(true);
    editor.updateSelection(false, [ia]);
    const states = editor.getUndoStates().length;
    editor.deleteSelection();
    return {
      tree: tree(G, page),
      vis: ia.getProperty("vis"),
      newStates: editor.getUndoStates().length - states,
    };
  },

  "clone/shift"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    editor.insertElements([a], true);
    const clones = editor.cloneSelection(true);
    return {
      tree: tree(G, page),
      clone: trf(clones[0].getTransform()),
      selection: names(editor.getSelection()),
      selectedIsClone: editor.getSelection()[0] === clones[0],
    };
  },

  // Duplicate, move the copy, duplicate again: the second copy repeats the
  // move, also a third time.
  "clone/repeat"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    editor.insertElements([a, b], true);
    const first = editor.cloneSelection(false, true);
    const lastAfterFirst = names(editor._lastCloneSelection);
    first[0].transform(new G.GTransform(1, 0, 0, 1, 30, 5));
    first[1].transform(new G.GTransform(1, 0, 0, 1, 30, 5));
    const second = editor.cloneSelection(false, true);
    const third = editor.cloneSelection(false, true);
    return {
      lastAfterFirst,
      tree: tree(G, page),
      first: first.map((n: any) => trf(n.getTransform())),
      second: second.map((n: any) => trf(n.getTransform())),
      third: third.map((n: any) => trf(n.getTransform())),
    };
  },

  // Moving through the editor changes the selection, which forgets the
  // last clones: the next repeat clones in place.
  "clone/repeat-after-editor-move"(G) {
    const { editor } = setup(G);
    const a = rect(G, 0, "a");
    editor.insertElements([a], true);
    editor.cloneSelection(false, true);
    editor.moveSelection(new G.GPoint(15, 0));
    editor.applySelectionTransform();
    const last = editor._lastCloneSelection;
    const again = editor.cloneSelection(false, true);
    return { last: last ? names(last) : last, again: trf(again[0].getTransform()) };
  },

  "clone/repeat-without-last"(G) {
    const { editor } = setup(G);
    const a = rect(G, 0, "a");
    editor.insertElements([a], true);
    const clones = editor.cloneSelection(true, true);
    return { clone: trf(clones[0].getTransform()), last: names(editor._lastCloneSelection) };
  },

  "clone/page"(G) {
    // The old app runs with scaleLabel off (an app setting); with it off
    // and a page this wide, the gap to the clone is an eighth of the
    // width, not the label height, which depends on font metrics.
    const savedScaleLabel = G.GSceneOptions.scaleLabel;
    G.GSceneOptions.scaleLabel = false;
    try {
      const { editor, scene, page } = setup(G);
      editor.setUID("me");
      page.setProperties(["name", "w", "h"], ["Page 1", 400, 80]);
      page.appendChild(rect(G, 0, "content"));
      const theirs = new G.GRectangleAnnotation();
      theirs.setProperties(["uid", "name"], ["other", "theirs"]);
      const own = new G.GRectangleAnnotation();
      own.setProperties(["uid", "name"], ["me", "own"]);
      const reply = new G.GComment();
      reply.setProperty("name", "reply");
      own.appendChild(reply);
      page.getAnnotations().appendChild(theirs);
      page.getAnnotations().appendChild(own);
      editor.updateSelection(false, [page]);
      const selected = names(editor.getSelection());
      const clones = editor.cloneSelection(true);
      const clone = clones[0];
      return {
        selected,
        pages: scene
          .getChildren()
          .map((n: any) => G.GNode.getName(n) + ":" + String(n.getProperty("name"))),
        cloneIsLastPage: scene.getLastChild() === clone || scene.getChildren().indexOf(clone),
        off: trf(clone.getProperty("off")),
        activeIsClone: scene.getActivePage() === clone,
        cloneTree: tree(G, clone),
        originalTree: tree(G, page),
      };
    } finally {
      G.GSceneOptions.scaleLabel = savedScaleLabel;
    }
  },

  "clone/transform-box-stays"(G) {
    const { editor, scene } = setup(G);
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    editor.insertElements([a, b], true);
    const sceneEditor = G.GElementEditor.getEditor(scene);
    const hadEditor = !!sceneEditor;
    if (sceneEditor) sceneEditor.setTransformBoxActive(true);
    const before = sceneEditor ? sceneEditor.isTransformBoxActive() : null;
    editor.cloneSelection();
    const after = G.GElementEditor.getEditor(scene);
    const plainSelect = (): unknown => {
      editor.updateSelection(false, [a, b]);
      const current = G.GElementEditor.getEditor(scene);
      return current ? current.isTransformBoxActive() : null;
    };
    return {
      hadEditor,
      before,
      after: after ? after.isTransformBoxActive() : null,
      // Without cloneSelection's restore, a new selection turns it off.
      plainSelect: plainSelect(),
    };
  },

  // A connector between two cloned elements is left out of the clones
  // (getLinkedElementsInSelection); one whose ends aren't selected is
  // cloned.
  "clone/linked-connector"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    const b = rect(G, 100, "b");
    page.appendChild(a);
    page.appendChild(b);
    const connector = new G.GConnector();
    for (const [x, y] of [
      [0, 0],
      [1, 1],
    ]) {
      const anchor = new G.GPathBase.AnchorPoint();
      anchor.setProperties(["x", "y"], [x, y]);
      connector.getAnchorPoints().appendChild(anchor);
    }
    connector.setProperty("name", "c");
    page.appendChild(connector);
    connector.attachPath(connector.getAnchorPoints().getFirstChild(), a);
    connector.attachPath(connector.getAnchorPoints().getLastChild(), b);
    const ends = [connector.getSrcPath() === a, connector.getDstPath() === b];
    const linked = names(editor.getLinkedElementsInSelection(connector, [a, connector]));
    const unlinked = names(editor.getLinkedElementsInSelection(connector, [connector]));
    editor.updateSelection(false, [a, b, connector]);
    const clones = editor.cloneSelection();
    const onlyConnector = (): unknown => {
      editor.updateSelection(false, [connector]);
      return names(editor.cloneSelection());
    };
    return {
      ends,
      linked,
      unlinked,
      clones: names(clones),
      tree: tree(G, page),
      onlyConnector: onlyConnector(),
    };
  },
  "insert/beside-selection-in-group"(G) {
    const { editor, page } = setup(G);
    const group = new G.GGroup();
    group.setProperty("name", "g");
    const x = rect(G, 0, "x");
    group.appendChild(x);
    group.appendChild(rect(G, 20, "y"));
    page.appendChild(group);
    page.appendChild(rect(G, 40, "z"));
    editor.updateSelection(false, [x]);
    editor.insertElements([rect(G, 60, "new")], true, false, true);
    return { tree: tree(G, page), selection: names(editor.getSelection()) };
  },

  // A selection directly in the target wins over one in another container.
  "insert/beside-selection-prefers-target"(G) {
    const { editor, page } = setup(G);
    const group = new G.GGroup();
    group.setProperty("name", "g");
    const x = rect(G, 0, "x");
    group.appendChild(x);
    page.appendChild(group);
    const z = rect(G, 40, "z");
    page.appendChild(z);
    page.appendChild(rect(G, 80, "last"));
    editor.updateSelection(false, [x, z]);
    editor.insertElements([rect(G, 60, "new")], true, false, true);
    return tree(G, page);
  },

  "insert/beside-selection-locked-group"(G) {
    const { editor, page } = setup(G);
    const group = new G.GGroup();
    group.setProperty("name", "g");
    const x = rect(G, 0, "x");
    group.appendChild(x);
    group.appendChild(rect(G, 20, "y"));
    page.appendChild(group);
    page.appendChild(rect(G, 40, "z"));
    editor.updateSelection(false, [x]);
    group.setProperty("lkt", G.GBlock.LockType.Full);
    editor.insertElements([rect(G, 60, "new")], true, false, true);
    return tree(G, page);
  },

  "insert/beside-selection-other-page"(G) {
    const { editor, scene, page } = setup(G);
    page.setProperty("name", "one");
    page.appendChild(rect(G, 0, "a"));
    const other = new G.GPage();
    other.setProperty("name", "two");
    scene.appendChild(other);
    const group = new G.GGroup();
    group.setProperty("name", "g");
    const x = rect(G, 0, "x");
    group.appendChild(x);
    group.appendChild(rect(G, 20, "y"));
    other.appendChild(group);
    const z = rect(G, 40, "z");
    other.appendChild(z);
    other.appendChild(rect(G, 50, "w"));
    scene.setActivePage(page);
    editor.updateSelection(false, [x]);
    const selectedInGroup = names(editor.getSelection());
    editor.insertElements([rect(G, 60, "n1")], true, false, true);
    editor.updateSelection(false, [z]);
    const selectedOnPage = names(editor.getSelection());
    editor.insertElements([rect(G, 60, "n2")], true, false, true);
    return {
      selectedInGroup,
      selectedOnPage,
      one: tree(G, page),
      two: tree(G, other),
    };
  },

  "insert/next"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    page.appendChild(a);
    page.appendChild(b);
    editor.insertElements([rect(G, 40, "n")], true, false, false, false, page, b);
    const group = new G.GGroup();
    group.setProperty("name", "g");
    page.appendChild(group);
    editor.insertElements([rect(G, 60, "m")], true, false, false, false, group, null);
    return tree(G, page);
  },

  "insert/style-from-single-selection"(G) {
    const { editor } = setup(G);
    const source = rect(G, 0, "source");
    editor.insertElements([source], true);
    source.setProperty("_sfop", 0.5);
    const layers = (n: any): number => n.getPaintLayers().getChildren().length;
    const styled = rect(G, 20, "styled");
    editor.insertElements([styled]);
    const other = rect(G, 40, "other");
    editor.insertElements([rect(G, 60, "second")], true);
    editor.updateSelection(false, [source, styled]);
    editor.insertElements([other]);
    const unstyled = rect(G, 80, "unstyled");
    editor.updateSelection(false, [source]);
    editor.insertElements([unstyled], true);
    return {
      source: [source.getProperty("_sfop"), layers(source)],
      styled: [styled.getProperty("_sfop"), layers(styled)],
      twoSelected: [other.getProperty("_sfop"), layers(other)],
      noInitialSetup: [unstyled.getProperty("_sfop"), layers(unstyled)],
    };
  },

  // Pasting a master and an instance of it into another scene of the
  // workspace (copies carry the reference ids): the master copy becomes
  // the master there, and every masterRef to the original in that scene is
  // rewritten to it, also on symbols that were there before.
  "insert/relink-symbols"(G) {
    const { workspace, editor, scene, page } = setup(G);
    const otherScene = new G.GScene(workspace);
    const otherPage = otherScene.getActivePage();
    const a = rect(G, 0, "a");
    otherPage.appendChild(a);
    const master = G.GSymbol.create([a], otherPage, "S");
    master.setProperty("name", "master");
    const instance = master.clone();
    instance.setProperty("name", "instance");
    otherPage.appendChild(instance);
    const originalRef = master.getReferenceId();
    // Pasted earlier without relinking: still points at the other scene.
    const earlier = G.GNode.deserialize(G.GNode.serialize(instance));
    earlier.setProperty("name", "earlier");
    page.appendChild(earlier);
    const masterCopy = G.GNode.deserialize(G.GNode.serialize(master));
    const instanceCopy = G.GNode.deserialize(G.GNode.serialize(instance));
    instanceCopy.setProperty("name", "instance copy");
    const copiedIds = [
      masterCopy.getReferenceId() === originalRef,
      masterCopy.getProperty("masterRef") === originalRef,
      instanceCopy.getProperty("masterRef") === originalRef,
    ];
    editor.insertElements([masterCopy, instanceCopy], true, false, false, true);
    const ref = (s: any): string => {
      const value = s.getProperty("masterRef");
      if (value === originalRef) return "original";
      if (value === masterCopy.getReferenceId()) return "master copy";
      return String(value);
    };
    const masterName = (s: any): unknown => {
      const m = s.getMasterSymbol();
      return m ? [m.getProperty("name"), m === masterCopy] : null;
    };
    return {
      copiedIds,
      masterCopyGotNewId: masterCopy.getReferenceId() !== originalRef,
      oldId: masterCopy.getOldReferenceId() === originalRef,
      tree: tree(G, page),
      refs: [ref(masterCopy), ref(instanceCopy), ref(earlier), ref(instance)],
      isMaster: [masterCopy.isMaster(), instanceCopy.isMaster(), earlier.isMaster()],
      masters: [masterName(instanceCopy), masterName(earlier)],
      linked: [scene.isLinked(instanceCopy, masterCopy), scene.isLinked(earlier, masterCopy)],
    };
  },

  // Without relinkSymbols the copies keep pointing at the original.
  "insert/no-relink-symbols"(G) {
    const { workspace, editor, page } = setup(G);
    const otherScene = new G.GScene(workspace);
    const otherPage = otherScene.getActivePage();
    const a = rect(G, 0, "a");
    otherPage.appendChild(a);
    const master = G.GSymbol.create([a], otherPage, "S");
    const originalRef = master.getReferenceId();
    const masterCopy = G.GNode.deserialize(G.GNode.serialize(master));
    editor.insertElements([masterCopy], true);
    return {
      tree: tree(G, page),
      masterRefIsOriginal: masterCopy.getProperty("masterRef") === originalRef,
      isMaster: masterCopy.isMaster(),
    };
  },

  // An instance pasted into the scene that holds its master keeps it.
  "insert/relink-symbols-same-scene"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    page.appendChild(a);
    const master = G.GSymbol.create([a], page, "S");
    master.setProperty("name", "master");
    const instance = master.clone();
    instance.setProperty("name", "instance");
    editor.insertElements([instance], true, false, false, true);
    return {
      keepsMaster: instance.getProperty("masterRef") === master.getReferenceId(),
      isMaster: instance.isMaster(),
      masterOf: instance.getMasterSymbol() ? instance.getMasterSymbol().getProperty("name") : null,
    };
  },
  // markSavePoint with an id on the undo stack moves the save point there;
  // an unknown id leaves it where it was.
  "modified/save-point-id"(G) {
    const { editor } = setup(G);
    const out: unknown[] = [];
    editor.insertElements([rect(G, 0, "a")], true);
    editor.insertElements([rect(G, 20, "b")], true);
    const [first, second] = editor.getUndoStates();
    editor.markSavePoint(first.id);
    out.push(["at first", editor.isModified()]);
    editor.undoState();
    out.push(["undone to first", editor.isModified()]);
    editor.redoState();
    editor.markSavePoint("missing");
    out.push(["unknown id", editor.isModified(), editor._savePointId === first.id]);
    editor.markSavePoint(second.id);
    out.push(["at second", editor.isModified()]);
    const savePoint = editor.markSavePoint("missing");
    out.push(["unknown id again", editor.isModified(), editor._savePointId === second.id]);
    savePoint.rollback();
    out.push(["rolled back", editor._savePointId === second.id]);
    return out;
  },

  // isModified(filter): only states after the save point count, and only
  // when a selected (or newly selected) element is rejected by the
  // filter, or, for states without selection data, a property change of a
  // rejected node.
  "modified/filter"(G) {
    const { editor, page } = setup(G);
    const a = rect(G, 0, "a");
    const b = rect(G, 20, "b");
    const c = rect(G, 40, "c");
    page.appendChild(b);
    editor.insertElements([c], true);
    editor.markSavePoint();
    const out: unknown[] = [];
    const check = (label: string): void => {
      out.push([
        label,
        editor.isModified(() => true),
        editor.isModified((n: any) => n !== a),
        editor.isModified((n: any) => n !== b),
        editor.isModified((n: any) => n !== c),
      ]);
    };
    check("at save point");
    editor.insertElements([a], true);
    check("inserted a");
    editor.clearSelection();
    editor.beginTransaction();
    b.setProperty("name", "b2");
    editor.commitTransaction("rename b");
    const top = editor.getUndoStates()[editor.getUndoStates().length - 1];
    out.push(["rename data", top.name, !!top.data.newSelection, !!top.data.selection]);
    check("renamed b, nothing selected");
    editor.beginTransaction();
    c.setProperty("name", "c2");
    editor.commitTransaction("rename c");
    check("renamed c");
    editor.markSavePoint();
    check("new save point");
    return out;
  },

  "modified/filter-without-states"(G) {
    const { editor } = setup(G);
    const before = editor.isModified(() => false);
    editor.insertElements([rect(G, 0, "a")], true);
    editor.markSavePoint();
    editor.undoState();
    return [before, editor.hasUndoState(), editor.isModified(() => true)];
  },

  // The selection modes of _tryAddToSelection.
  "select/compound-sub-path"(G) {
    const { editor, page } = setup(G);
    const compound = new G.GCompoundPath();
    compound.setProperty("name", "compound");
    const p1 = path(G, "p1", [
      [0, 0],
      [40, 0],
      [40, 40],
    ]);
    const p2 = path(G, "p2", [
      [50, 0],
      [90, 0],
      [90, 40],
    ]);
    compound.getPaths().appendChild(p1);
    compound.getPaths().appendChild(p2);
    page.appendChild(compound);
    editor.updateSelection(false, [p1]);
    const sub = G.GElementEditor.getEditor(p1);
    const out: any = {
      selection: names(editor.getSelection()),
      editor: !!sub,
      selectedFlag: sub ? sub.hasFlag(G.GBaseEditor.Flag.Selected) : null,
      catchHandle: sub ? sub._catchHandle : null,
      validate: sub ? sub.validateSelectionChange() : null,
    };
    editor.updateSelection(false, [compound]);
    const own = G.GElementEditor.getEditor(compound);
    out.compoundSelection = names(editor.getSelection());
    out.compoundResizeAll = own.hasFlag(G.GBoxEditor.Flag.ResizeAll);
    return out;
  },

  "select/path-resize-off"(G) {
    const { editor } = setup(G);
    const p = path(G, "p", [
      [0, 0],
      [40, 0],
      [40, 40],
    ]);
    const r = rect(G, 60, "r");
    editor.insertElements([p, r], true);
    const resizeAll = (n: any): unknown =>
      G.GElementEditor.getEditor(n).hasFlag(G.GBoxEditor.Flag.ResizeAll);
    const on = [resizeAll(p), resizeAll(r)];
    editor.clearSelection();
    editor.setPathResize(false);
    editor.updateSelection(false, [p, r]);
    const off = [resizeAll(p), resizeAll(r)];
    editor.setPathResize(true);
    return { on, off, restored: [resizeAll(p), resizeAll(r)] };
  },

  "select/selection-edit"(G) {
    const { editor, page } = setup(G);
    const image = new G.GImage();
    image.setProperties(
      ["trf", "itrf", "name"],
      [new G.GTransform(10, 0, 0, 10, 80, 10), new G.GTransform(1, 0, 0, 1, 0, 0), "img"],
    );
    page.appendChild(image);
    const p = path(G, "p", [
      [0, 0],
      [40, 0],
      [40, 40],
    ]);
    const r = rect(G, 60, "r");
    page.appendChild(p);
    page.appendChild(r);
    editor.setSelectionEdit(true);
    editor.updateSelection(false, [image, p, r]);
    const ed = (n: any): any => G.GElementEditor.getEditor(n);
    return {
      selection: names(editor.getSelection()),
      imageEditMode: !!ed(image)._editMode,
      imageDblMode: image.getProperty("dblMode"),
      pathResizeAll: ed(p).hasFlag(G.GBoxEditor.Flag.ResizeAll),
      rectResizeAll: ed(r).hasFlag(G.GBoxEditor.Flag.ResizeAll),
    };
  },

  // Detail mode with selectDoubleClickBehavior "subselect" puts an image
  // into crop mode; any other behaviour leaves it.
  "select/detail-subselect"(G) {
    const saved = G.GEditorOptions.selectDoubleClickBehavior;
    try {
      const run = (behavior: unknown): unknown => {
        G.GEditorOptions.selectDoubleClickBehavior = behavior;
        const { editor, page } = setup(G);
        const image = new G.GImage();
        image.setProperties(
          ["trf", "itrf", "name"],
          [new G.GTransform(10, 0, 0, 10, 80, 10), new G.GTransform(1, 0, 0, 1, 0, 0), "img"],
        );
        page.appendChild(image);
        editor.setSelectionDetail(true);
        editor.updateSelection(false, [image]);
        const imageEditor = G.GElementEditor.getEditor(image);
        return [
          !!imageEditor._editMode,
          imageEditor.hasFlag(G.GBaseEditor.Flag.Detail),
          imageEditor.hasFlag(G.GBaseEditor.Flag.Selected),
        ];
      };
      return { subselect: run("subselect"), other: run(null) };
    } finally {
      G.GEditorOptions.selectDoubleClickBehavior = saved;
    }
  },
};
