// Test support: drives GPathsGraphEditor through segment bends, edge and
// anchor moves with relinking, right-button drags, the double-click
// toggle, Shift-constrained handle drags, the custom style flag, the
// geometry change handler and marquee selection, and returns plain data.
// The same function runs in the old app's page (to record
// __fixtures__/old-paths-graph-editor.json; the TypeScript types are
// stripped first) and against the port in paths-graph-editor-probe.test.ts,
// with the G namespace of each app plus `env` ({Platform}), so it may only
// use what it is given and no imports. Ids are random, so nodes are
// described by their index.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new editor through the same untyped surface */

export function probePathsGraphEditor(G: any, env: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const Editor = G.GPathsGraphEditor;
  const PartType = Editor.PartType;
  const PartInfo = G.GElementEditor.PartInfo;
  const Platform = env.Platform;
  const identity = new G.GTransform();
  const PointType = G.GPathBase.AnchorPoint.Type;

  const num = (value: any): any => {
    if (typeof value !== "number") return value === undefined ? "undef" : value;
    if (Number.isNaN(value)) return "NaN";
    if (Object.is(value, -0)) return "-0";
    return value;
  };
  const pt = (point: any): any => (point ? [num(point.getX()), num(point.getY())] : point);
  const attempt = (fn: () => any): any => {
    try {
      return fn();
    } catch (e) {
      return "throws: " + String((e as Error).name);
    }
  };

  // A scene with a stand-in graphic editor that counts invalidations.
  const newScene = (): any => {
    const scene = new G.GScene(new G.GWorkspace());
    scene.__graphic_editor__ = { requestInvalidation: () => undefined };
    return scene;
  };
  const line = (points: number[][]): any => {
    const base = new G.GPathBase();
    for (const [x, y] of points) {
      const point = new G.GPathBase.AnchorPoint();
      point.setProperties(["x", "y"], [x, y]);
      base.getAnchorPoints().appendChild(point);
    }
    return base;
  };
  const newGraph = (lines: number[][][]): any => {
    const scene = newScene();
    const graph = new G.GPathsGraph();
    scene.getActivePage().appendChild(graph);
    for (const points of lines) graph.addGraphLine(line(points), null, null, null, true);
    return { scene, graph };
  };
  const square = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
    [0, 0],
  ];
  const children = (container: any): any[] => {
    const list: any[] = [];
    for (let n = container.getFirstChild(); n; n = n.getNext()) list.push(n);
    return list;
  };
  const anchorsOf = (graph: any): any[] => children(graph.getAnchors());
  const edgesOf = (graph: any): any[] => children(graph.getEdges());
  const pointsOf = (edge: any): any[] => children(edge.getPathBase().getAnchorPoints());
  const geometry = ["x", "y", "hlx", "hly", "hrx", "hry", "tp", "ah", "cl", "cr"];
  const pointData = (point: any): any =>
    point ? geometry.map((name) => num(point.getProperty(name))) : point;
  const state = (graph: any): any => {
    const anchors = anchorsOf(graph);
    return {
      anchors: anchors.map((a) => [num(a.getProperty("x")), num(a.getProperty("y"))]),
      edges: edgesOf(graph).map((edge) => ({
        source: anchors.indexOf(edge.getSource()),
        destination: anchors.indexOf(edge.getDestination()),
        cSt: num(edge.getProperty("cSt")),
        points: pointsOf(edge).map(pointData),
      })),
      facets: children(graph.getFacets()).length,
    };
  };
  const flags = (node: any): any => [
    node.hasFlag(G.GNode.Flag.Selected),
    node.hasFlag(G.GNode.Flag.Highlighted),
  ];
  const partEditor = (graph: any): any => {
    const editor = new Editor(graph);
    editor.setFlag(G.GBaseEditor.Flag.Selected);
    editor.removeFlag(G.GBoxEditor.Flag.ResizeAll);
    return editor;
  };
  const describeId = (graph: any, id: any): any => {
    if (!id || typeof id !== "object") return id;
    const edges = edgesOf(graph);
    const result: Record<string, any> = { type: id.type };
    if (id.edge) result.edge = edges.indexOf(id.edge);
    const pointName = (point: any): any => {
      if (!point) return point;
      const anchors = anchorsOf(graph);
      if (anchors.indexOf(point) >= 0) return "anchor" + anchors.indexOf(point);
      const parent = point.getParent();
      return parent ? "point" + parent.getIndexOfChild(point) : "detached";
    };
    if ("point" in id) result.point = pointName(id.point);
    if ("apLeft" in id) result.apLeft = pointName(id.apLeft);
    if ("apRight" in id) result.apRight = pointName(id.apRight);
    if (id.facet) result.facet = children(graph.getFacets()).indexOf(id.facet);
    return result;
  };
  const describeData = (data: any): any => {
    if (!data || typeof data !== "object") return num(data);
    const result: Record<string, any> = {};
    for (const key of Object.keys(data).sort()) {
      const value = data[key];
      if (value && typeof value.getX === "function") result[key] = pt(value);
      else if (key === "hitRes" && value) {
        result[key] = [num(value.segment), num(value.x), num(value.y), num(value.slope)];
      } else if (value && typeof value === "object") result[key] = describeData(value);
      else result[key] = num(value);
    }
    return result;
  };
  const describeInfo = (graph: any, info: any): any =>
    info
      ? {
          id: describeId(graph, info.id),
          data: describeData(info.data),
          isolated: info.isolated,
          selectable: info.selectable,
        }
      : info;
  const selection = (graph: any, editor: any): any => {
    const parts = editor.getPartSelection();
    return parts ? parts.map((part: any) => describeId(graph, part)) : parts;
  };
  // The first segment hit of `edge` on the vertical line through x.
  const segmentHitAt = (editor: any, graph: any, edge: any, x: number): any => {
    for (let y = -60; y <= 60; y += 0.5) {
      const info = editor.getPartInfoAt(new G.GPoint(x, y), identity);
      if (info && info.id.type === PartType.Segment && info.id.edge === edge) return info;
    }
    return null;
  };
  const previews = (editor: any, points: any[]): any =>
    points.map((point) => pointData(editor.getPathPointPreview(point)));

  // R6-C-010: bending a segment by dragging it.
  const bend = (setHandles: (points: any[]) => void, hitX: number): any =>
    attempt(() => {
      const { graph } = newGraph([square]);
      const edge = edgesOf(graph)[0];
      const points = pointsOf(edge);
      setHandles(points);
      const editor = partEditor(graph);
      const hit = segmentHitAt(editor, graph, edge, hitX);
      const result: Record<string, any> = { hit: describeInfo(graph, hit) };
      const start = editor.selectToolDragStartAction(hit, false);
      result.start = describeInfo(graph, start);
      result.subType = num(editor._transformSubType);
      result.startPreviews = previews(editor, points);
      editor.movePart(start.id, start.data, new G.GPoint(hitX, 30), identity, null, false, false);
      result.movedPreviews = previews(editor, points);
      editor._applyPartMove(start.id, start.data);
      result.applied = state(graph);
      return result;
    });
  out.bendStraight = bend(() => undefined, 30);
  out.bendLeftMissing = bend((points) => {
    points[1].setProperties(["hlx", "hly"], [70, -40]);
  }, 50);
  out.bendRightMissing = bend((points) => {
    points[0].setProperties(["hrx", "hry"], [30, -40]);
  }, 50);
  out.bendBoth = bend((points) => {
    points[0].setProperties(["hrx", "hry"], [20, -30]);
    points[1].setProperties(["hlx", "hly"], [80, -30]);
  }, 60);
  const bendAtSlope = (slope: number): any =>
    attempt(() => {
      const { graph } = newGraph([square]);
      const edge = edgesOf(graph)[0];
      const points = pointsOf(edge);
      const editor = partEditor(graph);
      const id = { type: PartType.Segment, edge, apLeft: points[0], apRight: points[1] };
      const hit = { segment: 1, x: slope * 100, y: 0, slope };
      const info = new PartInfo(
        editor,
        id,
        { type: Editor.SegmentData.HitRes, hitRes: hit },
        true,
        false,
      );
      return describeInfo(graph, editor.selectToolDragStartAction(info, false));
    });
  out.bendAtSlope0 = bendAtSlope(0.0004);
  out.bendAtSlope1 = bendAtSlope(0.9996);

  // R6-C-034: a bend whose path base editor is gone throws.
  out.bendWithoutPreview = attempt(() => {
    const { graph } = newGraph([square]);
    const edge = edgesOf(graph)[0];
    const editor = partEditor(graph);
    const hit = segmentHitAt(editor, graph, edge, 30);
    const start = editor.selectToolDragStartAction(hit, false);
    editor._closePBEditor(true);
    editor.movePart(start.id, start.data, new G.GPoint(30, 30), identity, null, false, false);
    return "no throw";
  });

  // R6-C-011: applying an edge-mode move.
  const edgeMove = (lines: number[][][], pointIndex: number, dx: number, dy: number): any =>
    attempt(() => {
      const { graph } = newGraph(lines);
      const edge = edgesOf(graph)[0];
      const point = pointsOf(edge)[pointIndex];
      const editor = partEditor(graph);
      editor.updatePartSelection(false, [{ type: PartType.Point, edge, point }]);
      const before = {
        mode: editor._selectionMode,
        inEdit: editor.getPathBaseInEdit() === edge.getPathBase(),
      };
      editor.edTransform(new G.GTransform(1, 0, 0, 1, dx, dy));
      editor.applyTransform(graph);
      return {
        before,
        sameEdge: edgesOf(graph).indexOf(edge),
        inEdit: editor.getPathBaseInEdit()
          ? pointsOf({ getPathBase: () => editor.getPathBaseInEdit() }).length
          : null,
        pbEditor: !!editor._pbEditor,
        selection: selection(graph, editor),
        state: state(graph),
      };
    });
  const open3 = [
    [0, 0],
    [50, 0],
    [100, 0],
  ];
  out.edgeMoveMiddle = edgeMove([open3], 1, 0, 20);
  out.edgeMoveAcross = edgeMove(
    [
      open3,
      [
        [40, 20],
        [60, 20],
        [60, 60],
      ],
    ],
    1,
    0,
    80,
  );
  out.edgeMoveFirst = edgeMove([open3], 0, -20, 10);
  out.edgeMoveLast = edgeMove([square], 1, 10, 10);
  // A handle move keeps both ends: the edge gets the new path base, or is
  // added again between the same anchors when the curve now crosses
  // another edge.
  const handleMove = (lines: number[][][], target: number[]): any =>
    attempt(() => {
      const { graph } = newGraph(lines);
      const edge = edgesOf(graph)[0];
      const point = pointsOf(edge)[0];
      const editor = partEditor(graph);
      editor.updatePartSelection(false, [{ type: PartType.Point, edge, point }]);
      const id = { type: PartType.RightHandle, edge, point };
      editor.movePart(id, null, new G.GPoint(target[0], target[1]), identity, null, false, false);
      editor._applyPartMove(id, null);
      return {
        sameEdge: edgesOf(graph).indexOf(edge),
        inEdit: editor.getPathBaseInEdit() === edge.getPathBase(),
        selection: selection(graph, editor),
        state: state(graph),
      };
    });
  const crossing = [
    [50, 10],
    [50, 60],
  ];
  out.handleMoveFree = handleMove(
    [
      [
        [0, 0],
        [100, 0],
      ],
      crossing,
    ],
    [50, -60],
  );
  out.handleMoveCrossing = handleMove(
    [
      [
        [0, 0],
        [100, 0],
      ],
      crossing,
    ],
    [50, 80],
  );

  // R6-C-012: relinking in anchor mode, and the geometry events it sends.
  const anchorMove = (lines: number[][][], anchorIndex: number, dx: number, dy: number): any =>
    attempt(() => {
      const { scene, graph } = newGraph(lines);
      const anchor = anchorsOf(graph)[anchorIndex];
      const editor = partEditor(graph);
      editor.updatePartSelection(false, [{ type: PartType.Anchor, point: anchor }]);
      editor.edTransform(new G.GTransform(1, 0, 0, 1, dx, dy));
      const events: any[] = [];
      const listener = (event: any): void => {
        const element = event.element;
        const name =
          element === graph ? "graph" : element instanceof G.GPathBase ? "path base" : "other";
        events.push([event.type, name]);
      };
      scene.addEventListener(G.GElement.GeometryChangeEvent, listener);
      editor.applyTransform(graph);
      scene.removeEventListener(G.GElement.GeometryChangeEvent, listener);
      return { events, moved: anchorsOf(graph).indexOf(anchor), state: state(graph) };
    });
  out.anchorMovePlain = anchorMove([square], 2, 20, 10);
  out.anchorMoveCrossing = anchorMove(
    [
      square,
      [
        [130, 60],
        [250, 60],
      ],
    ],
    2,
    100,
    0,
  );
  out.anchorMoveTwoCrossing = anchorMove(
    [
      square,
      [
        [130, 60],
        [250, 60],
      ],
      [
        [-60, 130],
        [-60, 250],
      ],
    ],
    2,
    100,
    100,
  );

  // R6-C-013: right-button drags.
  out.rightSegment = attempt(() => {
    const { graph } = newGraph([square]);
    const editor = partEditor(graph);
    const hit = segmentHitAt(editor, graph, edgesOf(graph)[1], 100);
    const start = editor.selectToolDragStartAction(hit, true);
    return {
      hit: describeInfo(graph, hit),
      start: describeInfo(graph, start),
      same: start === hit,
      selection: selection(graph, editor),
      mode: editor._selectionMode,
    };
  });
  const rightPoint = (
    setup: (points: any[]) => void,
    pointIndex: number,
    option: boolean,
    selectEdge = true,
  ): any =>
    attempt(() => {
      const { graph } = newGraph([
        [
          [0, 0],
          [50, 0],
          [100, 50],
          [150, 0],
        ],
      ]);
      const edge = edgesOf(graph)[0];
      const points = pointsOf(edge);
      setup(points);
      const editor = partEditor(graph);
      // Clicking the edge, then the point, selects the point (its Selected
      // flag is set only when the edge stays in edit).
      if (selectEdge) {
        editor.updatePartSelection(false, [
          { type: PartType.Segment, edge, apLeft: points[0], apRight: points[1] },
        ]);
      }
      editor.updatePartSelection(false, [
        { type: PartType.Point, edge, point: points[pointIndex] },
      ]);
      const selectedFlag = points[pointIndex].hasFlag(G.GNode.Flag.Selected);
      const info = new PartInfo(
        editor,
        { type: PartType.Point, edge, point: points[pointIndex] },
        { apSelected: true },
        false,
        true,
      );
      Platform.modifiers.optionKey = option;
      try {
        const start = editor.selectToolDragStartAction(info, true);
        return {
          selectedFlag,
          start: describeInfo(graph, start),
          preview: pointData(editor.getPathPointPreview(points[pointIndex])),
          selection: selection(graph, editor),
        };
      } finally {
        Platform.modifiers.optionKey = false;
      }
    });
  // Edges have two points: point 0 is the first, point 1 the last.
  const smooth = (index: number) => (points: any[]) =>
    points[index].setProperty("tp", PointType.Symmetric);
  out.rightCorner = rightPoint(() => undefined, 1, false);
  out.rightSmoothUnselected = rightPoint(smooth(1), 1, false, false);
  out.rightSmooth = rightPoint(smooth(1), 1, false);
  out.rightSmoothFirst = rightPoint(smooth(0), 0, false);
  out.rightSmoothAltNoRight = rightPoint(smooth(1), 1, true);
  out.rightSmoothAltRight = rightPoint(
    (points) =>
      points[1].setProperties(["tp", "ah", "hrx", "hry"], [PointType.Symmetric, false, 70, -10]),
    1,
    true,
  );
  out.rightConnectorAfterCorner = rightPoint(
    (points) => points[1].setProperty("tp", PointType.Connector),
    1,
    false,
  );
  out.rightConnectorAfterSmooth = rightPoint(
    (points) => {
      points[0].setProperty("tp", PointType.Symmetric);
      points[1].setProperty("tp", PointType.Connector);
    },
    1,
    false,
  );
  out.rightConnectorFirst = rightPoint(
    (points) => points[0].setProperty("tp", PointType.Connector),
    0,
    false,
  );

  // R6-C-014: the double-click toggle in detail mode.
  const toggle = (type: string, detail: boolean): any =>
    attempt(() => {
      const { graph } = newGraph([open3]);
      const edge = edgesOf(graph)[0];
      const point = pointsOf(edge)[1];
      point.setProperties(["tp", "ah", "hlx", "hly", "hrx", "hry"], [type, false, 30, -10, 60, 20]);
      const editor = partEditor(graph);
      if (detail) editor.setFlag(G.GBaseEditor.Flag.Detail);
      editor.updatePartSelection(false, [{ type: PartType.Point, edge, point }]);
      const handled = editor.handleDblClick({ type: PartType.Point, edge, point });
      return { handled, state: state(graph) };
    });
  out.toggleAsymmetric = toggle(PointType.Asymmetric, true);
  out.toggleSymmetric = toggle(PointType.Symmetric, true);
  out.toggleMirror = toggle(PointType.Mirror, true);
  out.toggleCorner = toggle("R", true);
  out.toggleNoDetail = toggle(PointType.Asymmetric, false);

  // R6-C-015: Shift-constrained handle drags.
  out.shiftHandle = attempt(() => {
    const { graph } = newGraph([open3]);
    const edge = edgesOf(graph)[0];
    const point = pointsOf(edge)[1];
    point.setProperties(
      ["tp", "ah", "hlx", "hly", "hrx", "hry"],
      [PointType.Asymmetric, false, 30, -10, 60, 20],
    );
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [{ type: PartType.Point, edge, point }]);
    const id = { type: PartType.LeftHandle, edge, point };
    const view = new G.GTransform(2, 0, 0, 2, 10, 20);
    const viewToWorld = view.inverted();
    editor.movePart(id, null, new G.GPoint(40, 47), viewToWorld, null, true, false);
    const result: Record<string, any> = {
      preview: pointData(editor.getPathPointPreview(point)),
      pair: editor._constrainPair ? editor._constrainPair.map(pt) : editor._constrainPair,
    };
    const box = editor.getBBox(view);
    result.box = box
      ? [num(box.getX()), num(box.getY()), num(box.getWidth()), num(box.getHeight())]
      : box;
    const calls: string[] = [];
    const canvas = new Proxy(
      {},
      {
        get:
          (_target, name) =>
          (...args: any[]) => {
            calls.push(String(name) + ":" + args.length);
            return undefined;
          },
      },
    );
    const colors = new G.GRGBColor([255, 0, 0]);
    result.paint = attempt(() => {
      editor._postPaint(view, {
        canvas,
        highlightOutlineColor: colors,
        selectionOutlineColor: colors,
      });
      return calls.slice(0, 3);
    });
    result.pairAfterPaint = editor._constrainPair;
    editor._applyPartMove(id, null);
    result.applied = state(graph);
    return result;
  });
  out.noShiftHandle = attempt(() => {
    const { graph } = newGraph([open3]);
    const edge = edgesOf(graph)[0];
    const point = pointsOf(edge)[1];
    point.setProperties(
      ["tp", "ah", "hlx", "hly", "hrx", "hry"],
      [PointType.Asymmetric, false, 30, -10, 60, 20],
    );
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [{ type: PartType.Point, edge, point }]);
    const id = { type: PartType.RightHandle, edge, point };
    editor.movePart(id, null, new G.GPoint(40, 47), identity, null, false, false);
    return {
      preview: pointData(editor.getPathPointPreview(point)),
      pair: editor._constrainPair,
    };
  });

  // R6-C-016: the custom style flag and the geometry change handler.
  out.customStyle = attempt(() => {
    const { graph } = newGraph([square]);
    const editor = partEditor(graph);
    editor._attach();
    const edges = edgesOf(graph);
    const steps: any[] = [];
    const step = (label: string, fn: () => any): void => {
      const result = attempt(fn);
      steps.push(
        [label, result === undefined ? "ok" : result].concat(
          edges.map((edge) => num(edge.getProperty("cSt"))),
        ),
      );
    };
    const segment = (edge: any): any => {
      const points = pointsOf(edge);
      return {
        type: PartType.Segment,
        edge,
        apLeft: points[0],
        apRight: points[points.length - 1],
      };
    };
    const layers = (edge: any): any => edge.getPaintLayers();
    step("has layers", () => edges.map((edge) => !!layers(edge)));
    step("select edge 1", () => editor.updatePartSelection(false, [segment(edges[1])]));
    const layer = new G.GStylable.BorderPaintLayer();
    step("added", () => layers(edges[1]).appendChild(layer));
    step("changed", () => layer.setProperty("_bw", 4));
    step("removed", () => layers(edges[1]).removeChild(layer));
    step("unselected edge", () => layers(edges[2]).appendChild(new G.GStylable.BorderPaintLayer()));
    step("select facet", () =>
      editor.updatePartSelection(false, [
        { type: PartType.Facet, facet: graph.getFacets().getFirstChild() },
      ]),
    );
    step("facet edge", () => layers(edges[3]).appendChild(new G.GStylable.BorderPaintLayer()));
    step("detach", () => editor._detach());
    step("detached", () => layers(edges[0]).appendChild(new G.GStylable.BorderPaintLayer()));
    return steps;
  });
  out.geometryChange = attempt(() => {
    const { graph } = newGraph([square]);
    const editor = partEditor(graph);
    editor._attach();
    const edge = edgesOf(graph)[0];
    const points = pointsOf(edge);
    editor.updatePartSelection(false, [{ type: PartType.Point, edge, point: points[0] }]);
    editor.setActiveExtendingMode("probe");
    const before = [!!editor.getPathBaseInEdit(), editor.getActiveExtendingMode()];
    anchorsOf(graph)[2].setProperties(["x", "y"], [120, 130]);
    const after = [
      !!editor.getPathBaseInEdit(),
      num(editor.getActiveExtendingMode()),
      !!editor._pbEditor,
    ];
    editor._detach();
    return { before, after };
  });

  // R6-C-017: marquee selection and highlighting of anchors.
  const rectArea = (x0: number, y0: number, x1: number, y1: number): any => {
    const area = new G.GVertexContainer();
    area.addVertex(G.GVertex.Command.Move, x0, y0);
    area.addVertex(G.GVertex.Command.Line, x1, y0);
    area.addVertex(G.GVertex.Command.Line, x1, y1);
    area.addVertex(G.GVertex.Command.Line, x0, y1);
    area.addVertex(G.GVertex.Command.Close, 0, 0);
    return area;
  };
  out.collision = attempt(() => {
    const steps: any[] = [];
    const run = (
      label: string,
      preselect: number[],
      toggle: boolean,
      highlight: boolean,
      area: any,
      graphFlag?: string,
    ): void => {
      const { graph } = newGraph([square]);
      const anchors = anchorsOf(graph);
      const editor = partEditor(graph);
      if (preselect.length) {
        editor.updatePartSelection(
          false,
          preselect.map((i) => ({ type: PartType.Anchor, point: anchors[i] })),
        );
      }
      if (graphFlag === "highlighted") graph.setFlag(G.GNode.Flag.Highlighted);
      if (graphFlag === "selected") graph.setFlag(G.GNode.Flag.Selected);
      const result = editor.updatePartSelectionUnderCollision(toggle, area, highlight);
      steps.push({
        label,
        result: num(result),
        selection: selection(graph, editor),
        anchors: anchors.map(flags),
        graph: flags(graph),
      });
      if (highlight) {
        editor.updatePartSelectionUnderCollision(toggle, rectArea(-10, 90, 10, 110), true);
        steps.push({
          label: label + " then smaller",
          anchors: anchors.map(flags),
          graph: flags(graph),
        });
      }
    };
    const top = rectArea(-10, -10, 110, 10);
    run("plain", [], false, false, top);
    run("plain, graph highlighted", [], false, false, top, "highlighted");
    run("toggle adds", [3], true, false, top);
    run("toggle with one inside selected", [0], true, false, top);
    run("nothing inside", [], false, false, rectArea(200, 200, 300, 300));
    run("highlight", [], false, true, top);
    run("highlight toggle", [3], true, true, top);
    run("highlight toggle, inside selected", [0], true, true, top, "selected");
    return steps;
  });
  return out;
}
