// Test support: drives the compound path, path, shape, compound shape,
// item, image and simple shape editors through the branches no other test
// reaches (part transforms and deletes of compound paths, flag rules,
// path point delete/align/move, symbol instance guards, centred line
// borders, partial path previews, default styles, centre crosses, outline
// and catch handle painting, the bitmap box resize) and returns plain data.
// The same function runs in the old app's page (to record
// __fixtures__/old-path-shape-editors.json; the TypeScript types are
// stripped first) and against the port in path-shape-editors-probe.test.ts,
// with the G namespace of each app, so it may only use what it is given and
// no imports. Ids are random, so nodes are described by their index.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new editors through the same untyped surface */

export function probePathShapeEditors(G: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const EditorOptions = G.GEditorOptions;
  const SceneOptions = G.GSceneOptions;
  const Flag = G.GBaseEditor.Flag;
  const BoxFlag = G.GBoxEditor.Flag;
  const NodeSelected = G.GNode.Flag.Selected;
  const PartType = G.GPathEditor.PartType;
  const PartInfo = G.GElementEditor.PartInfo;
  const AnchorPoint = G.GPathBase.AnchorPoint;
  const GeometryChangeEvent = G.GElement.GeometryChangeEvent;
  const identity = new G.GTransform();

  const num = (value: any): any => {
    if (typeof value !== "number") return value === undefined ? "undef" : value;
    if (Number.isNaN(value)) return "NaN";
    if (Object.is(value, -0)) return "-0";
    return value;
  };
  const pt = (point: any): any => (point ? [num(point.getX()), num(point.getY())] : point);
  const rect = (r: any): any =>
    r ? [num(r.getX()), num(r.getY()), num(r.getWidth()), num(r.getHeight())] : r;
  const matrix = (t: any): any => (t ? t.getMatrix().map(num) : t);
  const attempt = (fn: () => any): any => {
    try {
      return fn();
    } catch (e) {
      return "throws: " + String((e as Error).name);
    }
  };

  // A scene whose stand-in graphic editor logs the calls the editors make.
  const newScene = (log?: any[]): any => {
    const scene = new G.GScene(new G.GWorkspace());
    scene.__graphic_editor__ = {
      requestInvalidation: () => undefined,
      beginTransaction: () => log && log.push("begin"),
      commitTransaction: (name: any) => log && log.push(["commit", name]),
      exchangeElements: (target: any, replacements: any[], noSelect: any) =>
        log &&
        log.push(["exchange", target.getName ? "element" : "?", replacements.length, noSelect]),
    };
    return scene;
  };

  const anchor = (values: number[], type?: string): any => {
    const point = new AnchorPoint();
    const [x, y, hlx, hly, hrx, hry] = values;
    point.setProperties(["x", "y"], [x, y]);
    if (hlx !== undefined) point.setProperties(["hlx", "hly"], [hlx, hly]);
    if (hrx !== undefined) point.setProperties(["hrx", "hry"], [hrx, hry]);
    if (type) point.setProperty("tp", type);
    return point;
  };
  const newPath = (points: number[][], closed?: boolean): any => {
    const path = new G.GPath(!!closed);
    for (const values of points) path.getAnchorPoints().appendChild(anchor(values));
    return path;
  };
  const square = (x: number, y: number, size: number): any =>
    newPath(
      [
        [x, y],
        [x + size, y],
        [x + size, y + size],
        [x, y + size],
      ],
      true,
    );
  const anchors = (path: any): any[] => path.getAnchorPoints().getChildren();
  const points = (path: any): any =>
    anchors(path).map((point: any) => {
      const row = [num(point.getProperty("x")), num(point.getProperty("y"))];
      if (point.getProperty("hlx") !== null) {
        row.push(num(point.getProperty("hlx")), num(point.getProperty("hly")));
      }
      if (point.getProperty("hrx") !== null) {
        row.push("r", num(point.getProperty("hrx")), num(point.getProperty("hry")));
      }
      if (point.hasFlag(NodeSelected)) row.push("sel");
      return row;
    });
  const pointPart = (point: any): any => ({ type: PartType.Point, point: point });

  // --- Compound paths -------------------------------------------------

  const compound = (sizes: number[][]): any => {
    const log: any[] = [];
    const scene = newScene(log);
    const element = new G.GCompoundPath();
    const paths = sizes.map(([x, y, size]) => square(x as number, y as number, size as number));
    for (const path of paths) element.getPaths().appendChild(path);
    scene.getActivePage().appendChild(element);
    const editor = G.GElementEditor.openEditor(element);
    const child = (path: any): any => G.GElementEditor.getEditor(path);
    const state = (): any => ({
      paths: element
        .getPaths()
        .getChildren()
        .map((path: any) => paths.indexOf(path)),
      points: paths.map(points),
      log: log.slice(),
    });
    return { log, scene, element, paths, editor, child, state };
  };

  out.compoundPartialTransform = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    const inner = c.child(c.paths[1]);
    inner.updatePartSelection(false, [pointPart(anchors(c.paths[1])[0])]);
    const result: any = { hasPartSelection: c.editor.hasPathPartSelection() };
    c.editor.edTransform(new G.GTransform(1, 0, 0, 1, 10, 5));
    result.outerPreview = !!c.child(c.paths[0])._elementPreview;
    result.innerPreview = !!inner._elementPreview;
    result.canApply = !!c.editor.canApplyTransform();
    c.editor.applyTransform(c.element);
    result.after = c.state();
    result.transformCleared = c.editor._transform === null;
    result.innerPreviewAfter = !!inner._elementPreview;
    return result;
  });

  const selectAll = (path: any): void => {
    for (const point of anchors(path)) point.setFlag(NodeSelected);
  };

  out.compoundDeleteLeavesOne = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    selectAll(c.paths[1]);
    const allowed = c.editor.isDeletePartsAllowed();
    c.editor.deletePartsSelected();
    return { allowed, ...c.state(), innerSelected: c.paths[1].hasFlag(NodeSelected) };
  });

  out.compoundDeleteLeavesTwo = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
      [200, 0, 30],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    selectAll(c.paths[2]);
    const allowed = c.editor.isDeletePartsAllowed();
    c.editor.deletePartsSelected();
    return { allowed, ...c.state() };
  });

  out.compoundDeletePoints = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    c.child(c.paths[1]).updatePartSelection(false, [pointPart(anchors(c.paths[1])[2])]);
    const allowed = c.editor.isDeletePartsAllowed();
    c.editor.deletePartsSelected();
    return { allowed, ...c.state() };
  });

  out.compoundOwnedParts = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    const owned = (path: any, index: number): any =>
      new PartInfo(
        c.child(path),
        pointPart(anchors(path)[index]),
        { ownerEditor: c.editor },
        false,
        true,
      );
    const foreign = new PartInfo(
      c.child(c.paths[0]),
      pointPart(anchors(c.paths[0])[3]),
      { ownerEditor: null },
      false,
      true,
    );
    const result: any = {};
    c.child(c.paths[0]).updatePartSelection(false, [pointPart(anchors(c.paths[0])[1])]);
    c.editor.updateOwnedPartsSelection(false, [
      owned(c.paths[0], 0),
      owned(c.paths[1], 2),
      foreign,
    ]);
    result.single = c.state().points;
    c.editor.updateOwnedPartsSelection(true, [owned(c.paths[0], 0), owned(c.paths[1], 1), foreign]);
    result.toggled = c.state().points;
    c.editor.updateOwnedPartsSelection(true, []);
    result.empty = c.state().points;
    return result;
  });

  const rectArea = (x0: number, y0: number, x1: number, y1: number): any => {
    const area = new G.GVertexContainer();
    area.addVertex(G.GVertex.Command.Move, x0, y0);
    area.addVertex(G.GVertex.Command.Line, x1, y0);
    area.addVertex(G.GVertex.Command.Line, x1, y1);
    area.addVertex(G.GVertex.Command.Line, x0, y1);
    area.addVertex(G.GVertex.Command.Close, 0, 0);
    return area;
  };

  out.compoundCollision = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    const result: any = { allowed: c.editor.isPartSelectionUnderCollisionAllowed() };
    // The compound editor passes its arguments on in the same order.
    result.hitInner = c.editor.updatePartSelectionUnderCollision(false, rectArea(20, 20, 80, 30));
    result.afterInner = c.state().points;
    result.hitNone = c.editor.updatePartSelectionUnderCollision(
      false,
      rectArea(300, 300, 310, 310),
    );
    result.afterNone = c.state().points;
    result.hitBoth = c.editor.updatePartSelectionUnderCollision(true, rectArea(-5, 70, 105, 105));
    result.afterBoth = c.state().points;
    return result;
  });

  out.compoundGeometryChange = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    c.editor.removeFlag(BoxFlag.ResizeAll);
    const inner = c.child(c.paths[1]);
    const outer = c.child(c.paths[0]);
    inner.updatePartSelection(false, [pointPart(anchors(c.paths[1])[0])]);
    const result: any = {};
    const previews = (): any => [!!outer._elementPreview, !!inner._elementPreview];
    inner._createPathPreviewIfNecessary();
    outer._createPathPreviewIfNecessary();
    result.created = previews();
    c.editor._geometryChange(new GeometryChangeEvent(c.paths[1], GeometryChangeEvent.Type.Before));
    result.before = previews();
    const other = square(500, 500, 10);
    c.editor._geometryChange(new GeometryChangeEvent(other, GeometryChangeEvent.Type.After));
    result.otherPath = previews();
    c.editor._geometryChange(new GeometryChangeEvent(c.paths[1], GeometryChangeEvent.Type.After));
    result.after = previews();
    outer._createPathPreviewIfNecessary();
    inner._createPathPreviewIfNecessary();
    c.editor._geometryChange(new GeometryChangeEvent(c.element, GeometryChangeEvent.Type.After));
    result.ownAfter = previews();
    return result;
  });

  out.compoundRemoveFlag = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    const flags = (): any =>
      c.paths.map((path: any) => {
        const editor = c.child(path);
        return editor
          ? [
              editor.hasFlag(Flag.Selected),
              editor.hasFlag(Flag.Outline),
              editor.hasFlag(Flag.Detail),
            ]
          : null;
      });
    const result: any = { resizeAll: c.editor.hasFlag(BoxFlag.ResizeAll) };
    c.editor.setFlag(Flag.Selected);
    c.editor.setFlag(Flag.Detail);
    result.selected = flags();
    // removeFlag only acts on a flag the compound editor has itself.
    c.editor.setFlag(Flag.Outline);
    c.editor.removeFlag(Flag.Outline);
    result.outlineRemovedWhileResizable = flags();
    c.editor.removeFlag(Flag.Detail);
    result.detailRemoved = flags();
    c.editor.removeFlag(BoxFlag.ResizeAll);
    result.resizeAllRemoved = flags();
    c.editor.setFlag(Flag.Outline);
    c.editor.removeFlag(Flag.Outline);
    result.outlineRemoved = flags();
    c.editor.removeFlag(Flag.Selected);
    result.deselected = flags();
    return result;
  });

  out.compoundAlign = attempt(() => {
    const c = compound([
      [0, 0, 100],
      [25, 25, 50],
    ]);
    c.editor.setFlag(Flag.Selected);
    const result: any = { allowedResizable: c.editor.isAlignPartsAllowed() };
    c.editor.removeFlag(BoxFlag.ResizeAll);
    result.allowedNoParts = c.editor.isAlignPartsAllowed();
    c.child(c.paths[1]).updatePartSelection(false, [
      pointPart(anchors(c.paths[1])[0]),
      pointPart(anchors(c.paths[1])[1]),
    ]);
    c.child(c.paths[0]).updatePartSelection(false, [pointPart(anchors(c.paths[0])[2])]);
    result.allowed = c.editor.isAlignPartsAllowed();
    c.editor.alignParts("left", 40, null);
    result.alignedX = c.state().points;
    c.editor.alignParts("top", null, 60);
    result.alignedY = c.state().points;
    return result;
  });

  // --- Paths ------------------------------------------------------------

  const pathSetup = (pointsList: number[][], closed?: boolean, trf?: any): any => {
    const scene = newScene();
    const path = newPath(pointsList, closed);
    if (trf) path.setProperty("trf", trf);
    scene.getActivePage().appendChild(path);
    const editor = G.GElementEditor.openEditor(path);
    editor.setFlag(Flag.Selected);
    editor.removeFlag(BoxFlag.ResizeAll);
    return { scene, path, editor };
  };

  out.pathDelete = attempt(() => {
    const p = pathSetup(
      [
        [0, 0],
        [50, 0, 40, -10, 60, 10],
        [100, 50],
        [100, 100],
      ],
      false,
      new G.GTransform(2, 0, 0, 1, 10, 0),
    );
    const list = anchors(p.path);
    const result: any = { noParts: p.editor.isDeletePartsAllowed() };
    p.editor.updatePartSelection(false, [pointPart(list[1]), pointPart(list[2])]);
    result.allowed = p.editor.isDeletePartsAllowed();
    p.editor.deletePartsSelected();
    result.after = points(p.path);
    result.partSelection = p.editor.getPartSelection();
    p.editor.updatePartSelection(false, anchors(p.path).map(pointPart));
    result.allSelectedAllowed = p.editor.isDeletePartsAllowed();
    p.editor.setFlag(BoxFlag.ResizeAll);
    result.resizableAllowed = p.editor.isDeletePartsAllowed();
    p.editor.deletePartsSelected();
    result.resizableAfter = points(p.path);
    return result;
  });

  out.pathAlign = attempt(() => {
    const p = pathSetup(
      [
        [0, 0],
        [50, 0, 40, -10, 60, 10],
        [100, 50],
      ],
      false,
      new G.GTransform(2, 0, 0, 1, 10, 0),
    );
    const list = anchors(p.path);
    const result: any = { noParts: p.editor.isAlignPartsAllowed() };
    p.editor.updatePartSelection(false, [pointPart(list[1]), pointPart(list[2])]);
    result.allowed = p.editor.isAlignPartsAllowed();
    p.editor.alignParts("left", 30, null);
    result.alignedX = points(p.path);
    p.editor.alignParts("top", null, 25);
    result.alignedY = points(p.path);
    p.editor.updatePartSelection(false, [
      { type: PartType.Segment, point: null, apLeft: list[0], apRight: list[1] },
    ]);
    result.segmentOnly = p.editor.isAlignPartsAllowed();
    return result;
  });

  out.pathMovePoint = attempt(() => {
    const p = pathSetup(
      [
        [0, 0],
        [50, 0, 40, -10, 60, 10],
        [100, 50, 90, 50],
        [120, 50],
      ],
      false,
      new G.GTransform(2, 0, 0, 1, 10, 0),
    );
    const list = anchors(p.path);
    p.editor.movePoint(list[1], new G.GPoint(200, 30));
    p.editor.movePoint(list[2], new G.GPoint(150, 70), new G.GTransform(1, 0, 0, 1, 5, 5));
    list[3].setProperty("ah", true);
    p.editor.movePoint(list[3], new G.GPoint(260, 80));
    // The handles come from another point.
    p.editor.movePoint(list[0], new G.GPoint(30, 10), null, list[1]);
    return points(p.path);
  });

  out.pathSymbolInstance = attempt(() => {
    const scene = newScene();
    const page = scene.getActivePage();
    const path = newPath([
      [0, 0],
      [50, 0],
      [100, 50],
    ]);
    page.appendChild(path);
    const master = G.GSymbol.create([path], page, "Badge");
    const instance = master.clone();
    page.appendChild(instance);
    const instancePath = instance.getFirstChild();
    const result: any = { isPath: instancePath instanceof G.GPath };
    const editor = G.GElementEditor.openEditor(instancePath);
    editor.setFlag(Flag.Selected);
    editor.removeFlag(BoxFlag.ResizeAll);
    const list = anchors(instancePath);
    editor.updatePartSelection(false, list.map(pointPart));
    result.allSelectedAllowed = editor.isDeletePartsAllowed();
    editor.deletePartsSelected();
    result.after = points(instancePath);
    // A point added to the instance only can be deleted.
    const extra = anchor([150, 50]);
    instancePath.getAnchorPoints().appendChild(extra);
    editor.updatePartSelection(false, [pointPart(extra)]);
    result.extraAllowed = editor.isDeletePartsAllowed();
    editor.deletePartsSelected();
    result.afterExtra = points(instancePath);
    // The master's own editor isn't guarded.
    const masterEditor = G.GElementEditor.openEditor(path);
    masterEditor.setFlag(Flag.Selected);
    masterEditor.removeFlag(BoxFlag.ResizeAll);
    masterEditor.updatePartSelection(false, [pointPart(anchors(path)[1])]);
    result.masterAllowed = masterEditor.isDeletePartsAllowed();
    return result;
  });

  out.pathSimpleLine = attempt(() => {
    const saved = EditorOptions.simpleLineMode;
    const result: any = { defaultMode: saved };
    try {
      for (const mode of [true, false]) {
        EditorOptions.simpleLineMode = mode;
        const scene = newScene();
        const line = newPath([
          [0, 0],
          [100, 50],
        ]);
        scene.getActivePage().appendChild(line);
        const editor = G.GElementEditor.openEditor(line);
        editor.setFlag(Flag.Selected);
        const flags = BoxFlag.ResizeAll | BoxFlag.RotateHandle;
        result[String(mode)] = {
          filtered: editor.filterFlags(flags | Flag.Detail),
          resizeAll: editor.hasFlag(BoxFlag.ResizeAll),
          rotateHandle: editor.hasFlag(BoxFlag.RotateHandle),
        };
        editor.setFlag(flags);
        result[String(mode)].afterSet = [
          editor.hasFlag(BoxFlag.ResizeAll),
          editor.hasFlag(BoxFlag.RotateHandle),
        ];
      }
    } finally {
      EditorOptions.simpleLineMode = saved;
    }
    return result;
  });

  out.pathCenteredBorders = attempt(() => {
    const saved = SceneOptions.defaultBorderPositionForLines;
    const result: any = { defaultOption: saved };
    const borders = (path: any): any =>
      path
        .getPaintLayers()
        .getChildren()
        .filter((layer: any) => layer instanceof G.GStylable.BorderPaintLayer)
        .map((layer: any) => layer.getProperty("_ba"));
    const inside = (): any => {
      const layer = new G.GStylable.BorderPaintLayer();
      layer.setProperty("_ba", G.GStylable.BorderAlignment.Inside);
      return layer;
    };
    const build = (pointsList: number[][], closed?: boolean): any => {
      const scene = newScene();
      const path = newPath(pointsList, closed);
      path.getPaintLayers().appendChild(inside());
      scene.getActivePage().appendChild(path);
      const editor = G.GElementEditor.openEditor(path);
      return { path, editor };
    };
    const open3 = [
      [0, 0],
      [50, 0],
      [100, 0],
    ];
    try {
      for (const option of [true, false]) {
        SceneOptions.defaultBorderPositionForLines = option;
        const r: any = {};
        let b = build(open3);
        r.multiPointsLine = b.path.isMultiPointsLine();
        r.opened = borders(b.path);
        b.editor.setFlag(Flag.Selected);
        r.selected = borders(b.path);
        b.editor.removeFlag(BoxFlag.ResizeAll);
        b.editor.setFlag(BoxFlag.ResizeAll);
        r.resizeAll = borders(b.path);
        b = build(open3);
        b.path.getPaintLayers().appendChild(inside());
        r.inserted = borders(b.path);
        b = build(open3);
        b.editor.removeFlag(BoxFlag.ResizeAll);
        b.editor.setFlag(Flag.Selected);
        r.selectedWithoutResizeAll = borders(b.path);
        b.path.setFlag(NodeSelected);
        b.editor.removeFlag(Flag.Selected);
        r.deselectedWhileNodeSelected = borders(b.path);
        b.path.removeFlag(NodeSelected);
        b.editor.setFlag(Flag.Selected);
        b.editor.removeFlag(Flag.Detail);
        r.otherFlagRemoved = borders(b.path);
        b.editor.removeFlag(Flag.Selected);
        r.deselected = borders(b.path);
        b = build([
          [0, 0],
          [50, 20],
          [100, 0],
        ]);
        r.bentMultiPointsLine = b.path.isMultiPointsLine();
        b.path.getPaintLayers().appendChild(inside());
        r.bentInserted = borders(b.path);
        b = build(open3, true);
        b.path.getPaintLayers().appendChild(inside());
        r.closedInserted = borders(b.path);
        result[String(option)] = r;
      }
    } finally {
      SceneOptions.defaultBorderPositionForLines = saved;
    }
    return result;
  });

  out.pathGeometryChange = attempt(() => {
    const p = pathSetup([
      [0, 0],
      [50, 0],
      [100, 50],
    ]);
    const result: any = {};
    p.editor.updatePartSelection(false, [pointPart(anchors(p.path)[1])]);
    p.editor._createPathPreviewIfNecessary();
    result.created = !!p.editor._elementPreview;
    p.editor._geometryChange(new GeometryChangeEvent(p.path, GeometryChangeEvent.Type.Before));
    result.before = !!p.editor._elementPreview;
    p.editor._geometryChange(
      new GeometryChangeEvent(newPath([[0, 0]]), GeometryChangeEvent.Type.After),
    );
    result.other = !!p.editor._elementPreview;
    p.editor._geometryChange(new GeometryChangeEvent(p.path, GeometryChangeEvent.Type.After));
    result.after = [!!p.editor._elementPreview, p.editor._sourceIndexToPreviewIndex];
    // A real geometry change of the path drops the preview through the scene.
    p.editor._createPathPreviewIfNecessary();
    anchors(p.path)[2].setProperty("x", 120);
    result.viaScene = !!p.editor._elementPreview;
    return result;
  });

  // Builds the partial preview for the selected source indices (and the
  // `ah` points), then extends it to the full path, and reports both.
  const preview = (
    pointsList: number[][],
    closed: boolean,
    selected: number[],
    single?: number,
    auto?: number[],
  ): any => {
    const p = pathSetup(pointsList, closed);
    const list = anchors(p.path);
    for (const index of auto || []) list[index].setProperty("ah", true);
    for (const index of selected) list[index].setFlag(NodeSelected);
    const result: any = {};
    const made = p.editor._createPathPreviewIfNecessary(single === undefined ? null : list[single]);
    const report = (): any => ({
      points: points(made),
      closed: made.getProperty("closed"),
      table: Object.assign({}, p.editor._sourceIndexToPreviewIndex),
    });
    result.partial = report();
    result.again = p.editor._createPathPreviewIfNecessary() === made;
    p.editor.extendPreviewToFull();
    result.full = report();
    result.lookup = list.map((point: any) => {
      const found = p.editor.getPathPointPreview(point);
      return found ? anchors(made).indexOf(found) : null;
    });
    return result;
  };
  const five = [
    [0, 0],
    [100, 0],
    [150, 50],
    [100, 100],
    [0, 100],
  ];
  out.previewMiddleOfClosed = attempt(() => preview(five, true, [2]));
  out.previewFirstOfClosed = attempt(() => preview(five, true, [0]));
  out.previewLastOfClosed = attempt(() => preview(five, true, [4]));
  out.previewTwoAdjacent = attempt(() => preview(five, true, [2, 3]));
  out.previewNonContiguous = attempt(() => preview(five, true, [1, 3]));
  out.previewEndOfOpen = attempt(() => preview(five, false, [4]));
  out.previewStartOfOpen = attempt(() => preview(five, false, [0]));
  out.previewMiddleOfOpen = attempt(() => preview(five, false, [2]));
  out.previewOnePoint = attempt(() => preview(five, false, [], 3));
  out.previewAutoHandles = attempt(() => preview(five, true, [2], undefined, [1]));
  out.previewNothingSelected = attempt(() => preview(five, true, []));
  // A selected point outside the run between the first and last point.
  out.previewGapSelected = attempt(() => preview([...five, [-50, 80], [-50, 20]], true, [2, 5]));

  // --- Shapes -----------------------------------------------------------

  const typeId = (cls: any): any => G.GObject.getTypeId(cls);
  const layers = (element: any): any =>
    element
      .getPaintLayers()
      .getChildren()
      .map((layer: any) => [
        layer instanceof G.GStylable.BorderPaintLayer ? "border" : "fill",
        layer.getProperty("_pt") ? layer.getProperty("_pt").toScreen() : null,
      ]);

  out.shapeDefaultStyle = attempt(() => {
    const result: any = {};
    for (const which of ["rectangle", "shape", "none"]) {
      const scene = newScene();
      // Drop the scene's built-in default styles.
      const styles = scene.getStyles();
      while (styles.getFirstChild()) styles.removeChild(styles.getFirstChild());
      const addStyle = (name: string, sdf: any, color: number[], opacity: number): void => {
        const style = new G.GStyle();
        style.setProperties(["name", "ps", "_sdf"], [name, ["S", "BL", "FL"], sdf]);
        style.setProperty("_stop", opacity);
        style.getPaintLayers().appendChild(new G.GStylable.FillPaintLayer(new G.GRGBColor(color)));
        scene.getStyles().appendChild(style);
      };
      // An ellipse default style is never used for a rectangle.
      addStyle("ellipse", typeId(G.GEllipse), [0, 0, 255], 0.2);
      if (which === "rectangle") addStyle("rectangle", typeId(G.GRectangle), [255, 0, 0], 0.5);
      if (which !== "none") addStyle("shape", typeId(G.GShape), [0, 255, 0], 0.7);
      const shape = new G.GRectangle();
      scene.getActivePage().appendChild(shape);
      const editor = G.GElementEditor.openEditor(shape);
      const style = editor.getDefaultStyle();
      if (shape.getPaintLayers().clearFillLayers) shape.getPaintLayers().clearFillLayers();
      editor.initialSetup(undefined);
      result[which] = {
        style: style ? style.getProperty("name") : null,
        layers: layers(shape),
        opacity: num(shape.getProperty("_stop")),
      };
    }
    return result;
  });

  // A paint context whose canvas records calls; colours are named markers.
  const recordingContext = (): any => {
    const calls: any[] = [];
    const readVertices = (source: any): any[] => {
      const vertex = new G.GVertex();
      const list: any[] = [];
      source.rewindVertices(0);
      while (source.readVertex(vertex)) list.push([vertex.command, num(vertex.x), num(vertex.y)]);
      return list;
    };
    const marker = (value: any): any =>
      value === "SELECTION" || value === "HIGHLIGHT" || value === "ANNOTATION"
        ? value
        : value === G.GRGBColor.WHITE
          ? "WHITE"
          : value && value.toScreen
            ? value.toScreen()
            : num(value);
    const canvas = new Proxy(
      {},
      {
        get: (target: any, name: any) => {
          if (name === "putVertices") {
            return (source: any, ...rest: any[]) =>
              calls.push(["putVertices", readVertices(source), ...rest.map(marker)]);
          }
          return (...args: any[]) => calls.push([String(name), ...args.map(marker)]);
        },
      },
    );
    return {
      calls,
      context: {
        canvas,
        selectionOutlineColor: "SELECTION",
        highlightOutlineColor: "HIGHLIGHT",
        annotationColor: "ANNOTATION",
      },
    };
  };

  // Records EditorAnnotation.paintAnnotation calls while `fn` runs.
  const spyAnnotations = (fn: () => void): any[] => {
    const calls: any[] = [];
    const original = G.GEditorAnnotation.paintAnnotation;
    G.GEditorAnnotation.paintAnnotation = (
      context: any,
      transform: any,
      point: any,
      type: any,
      selected: any,
      size: any,
      fill: any,
      stroke: any,
    ) =>
      calls.push([
        matrix(transform),
        pt(point),
        type,
        !!selected,
        num(size),
        fill === G.GRGBColor.WHITE ? "WHITE" : fill,
        stroke,
      ]);
    try {
      fn();
    } finally {
      G.GEditorAnnotation.paintAnnotation = original;
    }
    return calls;
  };

  out.shapeCenterCross = attempt(() => {
    const saved = EditorOptions.outlineWidth;
    const result: any = { size: EditorOptions.centerCrossSize, defaultWidth: saved };
    try {
      for (const width of [1, 2]) {
        EditorOptions.outlineWidth = width;
        const r: any = {};
        for (const [name, trf, view] of [
          ["big", new G.GTransform(50, 0, 0, 30, 100, 100), new G.GTransform(1, 0, 0, 1, 0.3, 0.7)],
          [
            "zoomed",
            new G.GTransform(50, 0, 0, 30, 100, 100),
            new G.GTransform(2, 0, 0, 2, 10.6, 20.2),
          ],
          ["thin", new G.GTransform(3, 0, 0, 30, 100, 100), identity],
          ["noTransform", null, new G.GTransform(10, 0, 0, 10, 0, 0)],
        ] as any[]) {
          const scene = newScene();
          const shape = new G.GRectangle();
          if (trf) shape.setProperty("trf", trf);
          scene.getActivePage().appendChild(shape);
          // The plain shape editor: the rectangle editor paints corner
          // handles in detail mode too.
          const editor = new G.GShapeEditor(shape);
          editor._hasCenterCross = () => true;
          const record = recordingContext();
          editor.setFlag(Flag.Selected);
          editor._postPaint(view, record.context);
          r[name + "NoDetail"] = record.calls.length;
          editor.setFlag(Flag.Detail);
          editor._postPaint(view, record.context);
          r[name] = record.calls;
        }
        result[String(width)] = r;
      }
    } finally {
      EditorOptions.outlineWidth = saved;
    }
    return result;
  });

  out.compoundShapeOutline = attempt(() => {
    const scene = newScene();
    const shape = new G.GCompoundShape();
    const a = new G.GRectangle();
    a.setProperty("trf", new G.GTransform(20, 0, 0, 10, 30, 20));
    const b = new G.GRectangle();
    b.setProperty("trf", new G.GTransform(10, 0, 0, 20, 45, 25));
    shape.appendChild(a);
    shape.appendChild(b);
    scene.getActivePage().appendChild(shape);
    const editor = G.GElementEditor.openEditor(shape);
    const result: any = {};
    const view = new G.GTransform(1.5, 0, 0, 1.5, 0.25, 0.4);
    let record = recordingContext();
    editor._paintOutline(view, record.context, false, null);
    result.normal = record.calls;
    editor.setFlag(Flag.Highlighted);
    record = recordingContext();
    editor._paintOutline(view, record.context, false, null);
    result.highlighted = record.calls.map((call: any) =>
      call[0] === "putVertices" ? call[0] : call,
    );
    record = recordingContext();
    editor._paintOutline(view, record.context, false, new G.GRGBColor([1, 2, 3]));
    result.colored = record.calls.map((call: any) => (call[0] === "putVertices" ? call[0] : call));
    return result;
  });

  out.itemCatchHandle = attempt(() => {
    const result: any = { options: EditorOptions.annotationHandles.catch };
    const build = (inShape: boolean, contentTrf: any): any => {
      const scene = newScene();
      const content = new G.GRectangle();
      if (contentTrf) content.setProperty("trf", contentTrf);
      if (inShape) {
        const container = new G.GEllipse();
        container.setProperty("trf", new G.GTransform(100, 0, 0, 100, 100, 100));
        container.appendChild(content);
        scene.getActivePage().appendChild(container);
      } else scene.getActivePage().appendChild(content);
      return { content, editor: G.GElementEditor.openEditor(content) };
    };
    const view = new G.GTransform(2, 0, 0, 2, 5, 7);
    const record = recordingContext();
    let b = build(true, new G.GTransform(20, 0, 0, 10, 80, 90));
    result.unselected = spyAnnotations(() => b.editor._postPaint(view, record.context));
    b.editor.setFlag(Flag.Selected);
    result.selected = spyAnnotations(() => b.editor._postPaint(view, record.context));
    result.noTransform = spyAnnotations(() => b.editor._postPaint(null, record.context));
    b = build(true, null);
    b.editor.setFlag(Flag.Selected);
    result.ownIdentity = spyAnnotations(() => b.editor._postPaint(view, record.context));
    b = build(false, new G.GTransform(20, 0, 0, 10, 80, 90));
    b.editor.setFlag(Flag.Selected);
    result.outsideShape = spyAnnotations(() => b.editor._postPaint(view, record.context));
    result.canvasCalls = record.calls.length;
    return result;
  });

  out.imageBoxResize = attempt(() => {
    const result: any = {};
    const build = (): any => {
      const scene = newScene();
      const image = new G.GImage();
      image.setProperties(["iw", "ih"], [40, 20]);
      // A bitmap transform of its own, so pre- and post-multiplying differ.
      image.setProperty("itrf", new G.GTransform(0.5, 0, 0, 0.5, 3, 4));
      image.setProperty("trf", new G.GTransform(50, 0, 0, 25, 50, 25));
      scene.getActivePage().appendChild(image);
      const editor = G.GElementEditor.openEditor(image);
      editor.setFlag(Flag.Selected);
      editor.setEditMode(true);
      const inner = editor.getEditors()[0];
      return { image, editor, inner };
    };
    let b = build();
    result.itrfStart = matrix(b.image.getImageTransform());
    result.innerBox = rect(b.inner.getBox());
    result.bboxBefore = rect(b.editor.getBBox(identity));
    b.inner.transformBox(new G.GTransform(2, 0, 0, 1.5, -10, -5));
    result.preTransform = matrix(b.inner._preTransform);
    result.innerBBox = rect(b.inner.getBBox(identity));
    result.bboxDuring = rect(b.editor.getBBox(identity));
    b.inner.applyPartMove(G.GBoxEditor.RESIZE_HANDLE_PART_ID, { side: "br" });
    result.itrfAfterResize = matrix(b.image.getImageTransform());
    result.preTransformCleared = b.inner._preTransform;
    b.inner.edTransform(new G.GTransform(0, 1, -1, 0, 0, 0));
    b.inner.applyPartMove(G.GBoxEditor.ROTATION_HANDLE_PART_ID, {});
    result.itrfAfterRotate = matrix(b.image.getImageTransform());
    b.inner.edTransform(new G.GTransform(1, 0, 0, 1, 7, 0));
    b.inner.applyPartMove("other", {});
    result.itrfAfterOtherPart = matrix(b.image.getImageTransform());
    result.transformAfterOtherPart = matrix(b.inner._transform);
    // The frame editor's own pre-transform resizes the image as a whole.
    b = build();
    b.editor.setEditMode(false);
    b.editor._preTransform = new G.GTransform(2, 0, 0, 2, 0, 0);
    result.canApply = !!b.editor.canApplyTransform();
    b.editor.applyTransform(b.image);
    result.framePreTransform = {
      trf: matrix(b.image.getProperty("trf")),
      itrf: matrix(b.image.getImageTransform()),
      cleared: b.editor._preTransform,
    };
    return result;
  });

  out.simpleShape = attempt(() => {
    const scene = newScene();
    const processor = new G.GParameterizedVertexProcessor(
      "annot",
      [
        { X: "x", Y: -1, minX: -0.9, maxX: 0.9 },
        { X: 1, Y: "y", minY: -0.9, maxY: 0.9 },
      ],
      [
        { name: "px", expression: "annot[0].X" },
        { name: "py", expression: "annot[1].Y" },
      ],
      [1, 2, "px", -1, 2, 1, "py", 2, 1, 1, 2, -1, 1, 1, 5],
    );
    const shape = new G.GSimpleShape(
      processor,
      [new G.GPoint(-0.5, -1), new G.GPoint(1, 0.25)],
      100,
      80,
      "Corner",
      "icon",
    );
    shape.setProperty("trf", new G.GTransform(50, 0, 0, 40, 100, 100));
    scene.getActivePage().appendChild(shape);
    const editor = G.GElementEditor.openEditor(shape);
    editor.setFlag(Flag.Selected);
    const view = new G.GTransform(2, 0, 0, 2, 3, 4);
    const result: any = {};
    result.customPlain = rect(editor.getCustomBBox(view));
    editor.setFlag(Flag.Detail);
    result.customDetail = rect(editor.getCustomBBox(view));
    editor._transform = new G.GTransform(1, 0, 0, 1, 10, 0);
    result.customDetailTransformed = rect(editor.getCustomBBox(view, true));
    result.customDetailTransformIgnored = rect(editor.getCustomBBox(view, false));
    editor._transform = null;
    const record = recordingContext();
    result.paintUnselected = spyAnnotations(() => editor._postPaint(view, record.context));
    editor.updatePartSelection(false, [G.GSimpleShapeEditor.ANNOTATION_PART_ID]);
    result.paintSelected = spyAnnotations(() => editor._postPaint(view, record.context));
    editor.removeFlag(Flag.Detail);
    result.paintNoDetail = spyAnnotations(() => editor._postPaint(view, record.context));
    return result;
  });

  return out;
}
