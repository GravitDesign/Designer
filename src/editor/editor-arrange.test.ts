// Paint order, alignment and the path conversions of the editor
// (arrangeOrder, arrangeAlign, convertSelectionToPaths, joinPaths,
// splitCompoundPath). Expected values are recorded from the old app
// (GEditor, chunk.vendor.js module 82) with the same scenes built from the
// old classes.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VertexSourceMixin } from "../engine/geometry/vertex-source.ts";
import { Rect } from "../engine/math/rect.ts";
import { Transform } from "../engine/math/transform.ts";
import { Block } from "../engine/scene/block.ts";
import { CompoundPath } from "../engine/scene/compound-path.ts";
import { CompoundShape } from "../engine/scene/compound-shape.ts";
import { ElementFlag } from "../engine/scene/element-change.ts";
import { Element } from "../engine/scene/element.ts";
import { Ellipse } from "../engine/scene/ellipse.ts";
import { Group } from "../engine/scene/group.ts";
import type { Node } from "../engine/scene/node.ts";
import type { Page } from "../engine/scene/page.ts";
import { AnchorPoint } from "../engine/scene/path-base.ts";
import { Path } from "../engine/scene/path.ts";
import { Rectangle } from "../engine/scene/rectangle.ts";
import { Scene } from "../engine/scene/scene.ts";
import { Text } from "../engine/text/text.ts";
import { Editor } from "./editor.ts";
import { EditorWorkspace } from "./editor-workspace.ts";
import "./element-editors/compound-path-editor.ts";
import "./element-editors/compound-shape-editor.ts";
import "./element-editors/ellipse-editor.ts";
import "./element-editors/group-editor.ts";
import "./element-editors/layer-editor.ts";
import "./element-editors/page-editor.ts";
import { PathEditor } from "./element-editors/path-editor.ts";
import "./element-editors/rectangle-editor.ts";
import "./element-editors/scene-editor.ts";
import "./element-editors/selection-position-editor.ts";
import "./element-editors/text-editor.ts";
import { ElementEditor } from "./element-editors/element-editor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const load = (name: string) =>
  JSON.parse(readFileSync(resolve(here, "__fixtures__", name), "utf8")) as Record<string, unknown>;
const oldArrange = load("old-editor-arrange.json");
const oldConvert = load("old-editor-convert.json");

type Box = [number, number, number, number] | null;
const box = (b: Rect | null | undefined): Box =>
  b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null;
const names = (nodes: readonly Node[] | null): unknown[] =>
  (nodes || []).map((n) => (n as Rectangle).getProperty("name"));
const tag = (n: Node): string => String(n) + ":" + String((n as Rectangle).getProperty("name"));

/** The parts of a container the tests need (pages and groups have them). */
type Parent = Node & {
  appendChild(child: Node): void;
  insertChild(child: Node, next: Node | null): void;
  removeChild(child: Node): void;
  getChildren(): Node[];
};

function rect(a: number, d: number, x: number, y: number, name: string): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(a, 0, 0, d, x, y));
  r.setProperty("name", name);
  return r;
}

function setup() {
  const scene = new Scene(new EditorWorkspace());
  const editor = new Editor(scene);
  const page = scene.getActivePage() as Page;
  return { scene, editor, page, parent: page as unknown as Parent };
}

const BACK = Block.ProgramLck.AlwaysBack;
const Order = Editor.ArrangeOrderType;
const Align = Editor.ArrangeAlignType;

describe("Editor.arrangeOrder", () => {
  /** The page's children by name; nodes that aren't elements as <node>. */
  const kids = (parent: Parent) =>
    parent
      .getChildren()
      .map((n) => (n instanceof Element ? (n as Rectangle).getProperty("name") : "<node>"));

  /** Rects a, b, c, ... side by side on the page, built like the old recording. */
  function row(count: number, extra?: (s: ReturnType<typeof setup>, nodes: Rectangle[]) => void) {
    const s = setup();
    const nodes: Rectangle[] = [];
    for (let i = 0; i < count; i++) {
      const r = rect(10, 10, i * 30, 0, String.fromCharCode(97 + i));
      s.parent.appendChild(r);
      nodes.push(r);
    }
    if (extra) extra(s, nodes);
    return { ...s, nodes };
  }

  /** Moves the page's annotations list (not an element) before `next`. */
  const listBefore = (index: number) => (s: ReturnType<typeof setup>, nodes: Rectangle[]) => {
    const list = s.page.getAnnotations() as unknown as Node;
    s.parent.removeChild(list);
    s.parent.insertChild(list, nodes[index] as Rectangle);
  };
  const alwaysBack =
    (...indices: number[]) =>
    (_s: ReturnType<typeof setup>, nodes: Rectangle[]) => {
      for (const i of indices) (nodes[i] as Rectangle).setProperty("plkt", BACK);
    };

  const cases: [
    string,
    number,
    number[],
    string,
    ((s: ReturnType<typeof setup>, nodes: Rectangle[]) => void)?,
    number[]?,
  ][] = [
    ["fwdOne", 4, [0], Order.BringForward],
    ["fwdTwo", 4, [0, 1], Order.BringForward],
    ["fwdSkipSelected", 4, [0, 2], Order.BringForward],
    ["fwdLast", 3, [2], Order.BringForward],
    ["fwdBehindSelected", 3, [1, 2], Order.BringForward],
    ["fwdNonElement", 3, [0], Order.BringForward, listBefore(1)],
    ["bwdNonElement", 3, [2], Order.SendBackward, listBefore(2)],
    ["backOne", 4, [2], Order.SendToBack],
    ["backTwo", 4, [2, 3], Order.SendToBack],
    ["backFirst", 3, [0], Order.SendToBack],
    ["backPastAlwaysBack", 4, [3], Order.SendToBack, alwaysBack(0, 1)],
    ["frontAlwaysBack", 3, [0], Order.SendToFront, alwaysBack(0)],
    ["fwdAlwaysBackBlocked", 3, [0], Order.BringForward, alwaysBack(0)],
    ["fwdAlwaysBackAmongBack", 3, [0], Order.BringForward, alwaysBack(0, 1)],
    ["bwdIntoBack", 3, [2], Order.SendBackward, alwaysBack(0, 1)],
    // Explicit nodes and noTransaction: no undo state, no reselect.
    ["explicitNoTx", 4, [3], Order.SendToFront, undefined, [0]],
    ["explicitBack", 4, [], Order.SendToBack, undefined, [3]],
  ];
  for (const [name, count, selected, type, extra, explicit] of cases) {
    it(name, () => {
      const s = row(count, extra);
      s.editor.updateSelection(
        false,
        selected.map((i) => s.nodes[i] as Rectangle),
      );
      const before = s.editor.getUndoStates().length;
      if (explicit) {
        s.editor.arrangeOrder(
          type,
          explicit.map((i) => s.nodes[i] as Rectangle),
          true,
        );
      } else s.editor.arrangeOrder(type);
      expect({
        kids: kids(s.parent),
        sel: names(s.editor.getSelection()),
        undo: s.editor.getUndoStates().length - before,
        undoName: s.editor.getUndoStateName(),
      }).toEqual(oldArrange[name]);
    });
  }
});

describe("Editor.arrangeAlign", () => {
  function three() {
    const s = setup();
    const a = rect(10, 10, 0, 0, "a");
    const b = rect(15, 5, 50, 40, "b");
    const c = rect(5, 20, 100, -30, "c");
    for (const n of [a, b, c]) s.parent.appendChild(n);
    s.editor.updateSelection(false, [a, b, c]);
    return { ...s, nodes: [a, b, c] as Element[] };
  }

  /** a and b in a group with a selected, as the old recording built it. */
  function single() {
    const s = setup();
    const group = new Group();
    s.parent.appendChild(group);
    const a = rect(10, 10, 0, 0, "a");
    const b = rect(20, 30, 100, 50, "b");
    (group as unknown as Parent).appendChild(a);
    (group as unknown as Parent).appendChild(b);
    s.editor.updateSelection(false, [a]);
    return { ...s, nodes: [a, b] as Element[] };
  }

  function check(
    name: string,
    build: () => ReturnType<typeof three>,
    run: (s: ReturnType<typeof three>) => void,
  ) {
    const s = build();
    const before = s.editor.getUndoStates().length;
    run(s);
    expect({
      boxes: s.nodes.map((n) => box(n.getGeometryBBox())),
      undo: s.editor.getUndoStates().length - before,
      undoName: s.editor.getUndoStateName(),
    }).toEqual(oldArrange[name]);
  }

  const area = () => new Rect(-33.3, 7, 70.7, 13);

  for (const key of Object.keys(Align) as (keyof typeof Align)[]) {
    it(`aligns to the union of the boxes: ${key}`, () => {
      check("al_" + key, three, (s) => s.editor.arrangeAlign(Align[key]));
    });
  }

  it("moves nothing as a group without an area (the group box is the area)", () => {
    for (const key of [
      "AlignLeft",
      "AlignCenter",
      "AlignJustifyHorizontal",
      "AlignJustifyVertical",
      "AlignBottom",
    ] as const) {
      check("alGroup_" + key, three, (s) => s.editor.arrangeAlign(Align[key], null, true));
    }
  });

  it("moves and justifies as a group to an area, with non-integer ratios", () => {
    for (const key of [
      "AlignLeft",
      "AlignMiddle",
      "AlignJustifyHorizontal",
      "AlignJustifyVertical",
    ] as const) {
      check("alGroupArea_" + key, three, (s) =>
        s.editor.arrangeAlign(Align[key], null, true, area()),
      );
    }
  });

  it("aligns and justifies each element to an area", () => {
    check("alArea", three, (s) => s.editor.arrangeAlign(Align.AlignLeft, null, false, area()));
    check("alAreaJustify", three, (s) =>
      s.editor.arrangeAlign(Align.AlignJustifyHorizontal, null, false, area()),
    );
  });

  it("aligns to the fully locked elements", () => {
    check(
      "alLockedRef",
      () => {
        const s = three();
        (s.nodes[2] as Element).setFlag(ElementFlag.FullLocked);
        return s;
      },
      (s) => s.editor.arrangeAlign(Align.AlignLeft, s.nodes),
    );
  });

  it("stops at a fully locked element after moving the ones before it, and still commits", () => {
    check(
      "alLockedMid",
      () => {
        const s = three();
        (s.nodes[1] as Element).setFlag(ElementFlag.FullLocked);
        return s;
      },
      (s) => s.editor.arrangeAlign(Align.AlignTop, s.nodes),
    );
  });

  it("stops at an empty area", () => {
    check("alEmptyArea", three, (s) =>
      s.editor.arrangeAlign(Align.AlignLeft, null, false, new Rect(5, 5, 0, 0)),
    );
  });

  it("aligns a single element to its parent, or to the area with toArea", () => {
    check("alSingle", single, (s) => s.editor.arrangeAlign(Align.AlignRight));
    check("alSingleMiddle", single, (s) => s.editor.arrangeAlign(Align.AlignMiddle));
    check("alSingleToArea", single, (s) =>
      s.editor.arrangeAlign(Align.AlignRight, null, false, new Rect(0, 0, 300, 300), false, true),
    );
    check(
      "alSingleOnPage",
      () => {
        const s = setup();
        const a = rect(10, 10, 0, 0, "a");
        s.parent.appendChild(a);
        s.editor.updateSelection(false, [a]);
        return { ...s, nodes: [a] as Element[] };
      },
      (s) => s.editor.arrangeAlign(Align.AlignCenter),
    );
  });

  it("skips elements without a size and records nothing with noTransaction", () => {
    check(
      "alZeroSize",
      () => {
        const s = three();
        (s.nodes[1] as Rectangle).setProperty("trf", new Transform(0, 0, 0, 0, 7, 7));
        return s;
      },
      (s) => s.editor.arrangeAlign(Align.AlignLeft),
    );
    check("alNoTx", three, (s) => s.editor.arrangeAlign(Align.AlignLeft, null, false, null, true));
  });

  it("aligns the selected points of a path instead of the path", () => {
    const { editor, parent } = setup();
    const path = new Path(false, false);
    const points = path.getAnchorPoints();
    for (const [x, y] of [
      [0, 0],
      [30, 10],
      [60, 40],
    ] as const) {
      const anchor = new AnchorPoint();
      anchor.setProperties(["x", "y"], [x, y]);
      (points as unknown as Parent).appendChild(anchor as unknown as Node);
    }
    path.setProperty("trf", new Transform(1, 0, 0, 1, 5, 7));
    editor.setPathResize(false);
    parent.appendChild(path);
    editor.updateSelection(false, [path]);
    const pathEditor = ElementEditor.getEditor(path) as unknown as PathEditor;
    expect(String(pathEditor)).toBe(oldArrange["pathEd"]);
    const anchors = (points as unknown as Parent).getChildren();
    pathEditor.updatePartSelection(false, [
      { type: PathEditor.PartType.Point, point: anchors[0] },
      { type: PathEditor.PartType.Point, point: anchors[2] },
    ]);
    expect(pathEditor.isAlignPartsAllowed()).toBe(oldArrange["alignPartsAllowed"]);
    editor.arrangeAlign(Align.AlignTop);
    expect([
      anchors.map((a) => [
        (a as unknown as AnchorPoint).getProperty("x"),
        (a as unknown as AnchorPoint).getProperty("y"),
      ]),
      editor.getUndoStateName(),
    ]).toEqual(oldArrange["alParts"]);
  });
});

describe("Editor path conversions", () => {
  const rounded = (v: number) => Math.round(v * 1e6) / 1e6;

  function describeNode(n: Node): Record<string, unknown> {
    const element = n as Rectangle;
    const d: Record<string, unknown> = { cls: String(n), name: element.getProperty("name") };
    if (n instanceof Path) {
      const trf = n.getProperty("trf") as Transform | null;
      d["closed"] = n.getProperty("closed");
      d["evenodd"] = n.getProperty("evenodd");
      d["trf"] = trf ? Transform.serialize(trf) : null;
      d["points"] = (n.getAnchorPoints() as unknown as Parent).getChildren().map((a) => {
        const anchor = a as unknown as AnchorPoint;
        return [
          rounded(anchor.getProperty("x") as number),
          rounded(anchor.getProperty("y") as number),
          anchor.getProperty("tp"),
        ];
      });
    }
    if (n instanceof CompoundPath) {
      d["subPaths"] = (n.getPaths() as unknown as Parent).getChildren().map(describeNode);
    }
    const b = box(element.getGeometryBBox());
    d["box"] = b ? b.map(rounded) : b;
    return d;
  }

  const elements = (parent: Parent) => parent.getChildren().filter((n) => n instanceof Element);

  function path(points: readonly (readonly [number, number])[], closed: boolean, name: string) {
    const p = new Path(closed, false);
    for (const [x, y] of points) {
      const anchor = new AnchorPoint();
      anchor.setProperties(["x", "y"], [x, y]);
      (p.getAnchorPoints() as unknown as Parent).appendChild(anchor as unknown as Node);
    }
    p.setProperty("name", name);
    return p;
  }

  function compound(name: string | null, ...paths: Path[]) {
    const c = new CompoundPath();
    if (name) c.setProperty("name", name);
    for (const p of paths) (c.getPaths() as unknown as Parent).appendChild(p);
    return c;
  }

  it("has texts as vertex sources, so they are converted", () => {
    expect(new Text().hasMixin(VertexSourceMixin)).toBe(oldConvert["textVS"]);
  });

  it("converts rectangles and ellipses to paths in place and keeps paths and groups", () => {
    const { editor, parent } = setup();
    const r = rect(10, 20, 30, 40, "r");
    const e = new Ellipse();
    e.setProperty("trf", new Transform(15, 0, 0, 5, 100, 0));
    e.setProperty("name", "e");
    e.setProperty("etp", Ellipse.Type.Pie);
    e.setProperties(["sa", "ea"], [0, Math.PI]);
    const p = path(
      [
        [0, 0],
        [5, 5],
      ],
      false,
      "p",
    );
    const g = new Group();
    g.setProperty("name", "g");
    (g as unknown as Parent).appendChild(rect(1, 1, 0, 0, "inner"));
    const after = rect(1, 1, 300, 300, "after");
    for (const n of [r, e, p, g, after]) parent.appendChild(n);
    editor.updateSelection(false, [r, e, p, g]);
    editor.convertSelectionToPaths();
    const expected = oldConvert["convert"] as Record<string, unknown>;
    expect(elements(parent).map(describeNode)).toEqual(expected["kids"]);
    expect((editor.getSelection() || []).map(tag)).toEqual(expected["sel"]);
    expect(editor.getUndoStateName()).toBe(expected["undo"]);
    expect(r.getParent() === null).toBe(expected["rRemoved"]);

    editor.undoState();
    expect({
      kids: elements(parent).map(tag),
      sel: (editor.getSelection() || []).map(tag),
    }).toEqual(oldConvert["convertUndo"]);
    editor.redoState();
    expect({
      kids: elements(parent).map(tag),
      sel: (editor.getSelection() || []).map(tag),
    }).toEqual(oldConvert["convertRedo"]);
  });

  it("converts a compound shape from its vertices and drops one with no vertices", () => {
    const { editor, parent } = setup();
    const shape = new CompoundShape();
    shape.setProperty("name", "cs");
    (shape as unknown as Parent).appendChild(rect(10, 10, 0, 0, "c1"));
    const second = rect(10, 10, 15, 0, "c2");
    second.setProperty("bool", 1);
    (shape as unknown as Parent).appendChild(second);
    shape.transform(new Transform(1, 0, 0, 1, 7, 3));
    const empty = new CompoundShape();
    empty.setProperty("name", "empty");
    const after = rect(1, 1, 300, 300, "after");
    for (const n of [shape, empty, after]) parent.appendChild(n);
    const trf = () => {
      const t = shape.getProperty("trf") as Transform | null;
      return t ? Transform.serialize(t) : null;
    };
    expect(trf()).toEqual(oldConvert["csTrf"]);
    expect(box(shape.getGeometryBBox())).toEqual(oldConvert["csBox"]);
    editor.updateSelection(false, [shape, empty]);
    const before = editor.getUndoStates().length;
    editor.convertSelectionToPaths(true);
    expect({
      kids: elements(parent).map(describeNode),
      sel: (editor.getSelection() || []).map(tag),
      undo: editor.getUndoStates().length - before,
      // The shape's own transform is put back after assignFrom.
      csTrfAfter: trf(),
    }).toEqual(oldConvert["convertCompound"]);
  });

  it("replaces a text by its shapes, inserted in reverse before its successor", () => {
    const { editor, parent } = setup();
    const text = new Text();
    text.setProperty("name", "t");
    const before = rect(1, 1, -300, 0, "before");
    const after = rect(1, 1, 300, 300, "after");
    for (const n of [before, text, after]) parent.appendChild(n);
    // The outlines need fonts; the editor only takes what getTextShapes returns.
    (text as unknown as { getTextShapes(): Path[] }).getTextShapes = () => [
      path(
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
        true,
        "s0",
      ),
      path(
        [
          [2, 0],
          [3, 0],
          [3, 1],
        ],
        true,
        "s1",
      ),
      path(
        [
          [4, 0],
          [5, 0],
          [5, 1],
        ],
        true,
        "s2",
      ),
    ];
    editor.updateSelection(false, [text, before]);
    expect(editor.getSelection()?.length).toBe(oldConvert["textInSel"]);
    editor.convertSelectionToPaths();
    expect({
      kids: names(elements(parent)),
      sel: names(editor.getSelection()),
      undo: editor.getUndoStateName(),
    }).toEqual(oldConvert["convertText"]);
  });

  it("joins paths and compound paths in paint order where the topmost was", () => {
    const { editor, parent } = setup();
    const p1 = path(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      true,
      "p1",
    );
    const cp = compound(
      "cp",
      path(
        [
          [20, 0],
          [30, 0],
          [30, 10],
        ],
        true,
        "cp1",
      ),
      path(
        [
          [40, 0],
          [50, 0],
          [50, 10],
        ],
        true,
        "cp2",
      ),
    );
    const r = rect(5, 5, 100, 100, "r");
    const p2 = path(
      [
        [60, 0],
        [70, 0],
      ],
      false,
      "p2",
    );
    const after = rect(1, 1, 300, 300, "after");
    for (const n of [p1, r, cp, p2, after]) parent.appendChild(n);
    editor.updateSelection(false, [p2, r, p1, cp]);
    const undoBefore = editor.getUndoStates().length;
    const joined = editor.joinPaths() as CompoundPath;
    expect({
      joined: describeNode(joined),
      kids: elements(parent)
        .map(describeNode)
        .map((d) => String(d["cls"]) + ":" + String(d["name"])),
      p1Removed: p1.getParent() === null,
      p2Removed: p2.getParent() === null,
      cpRemoved: cp.getParent() === null,
      sel: (editor.getSelection() || []).map(tag),
      undo: editor.getUndoStates().length - undoBefore,
      // Paths go in as clones; the compound path's sub-paths are cloned too.
      firstIsOriginal: (joined.getPaths() as unknown as Parent).getChildren()[0] === p1,
      cpKidsLeft: (cp.getPaths() as unknown as Parent).getChildren().length,
    }).toEqual(oldConvert["join"]);
  });

  it("returns the only path, or null without paths", () => {
    const { editor, parent } = setup();
    const p1 = path(
      [
        [0, 0],
        [10, 0],
      ],
      false,
      "p1",
    );
    const r = rect(5, 5, 100, 100, "r");
    parent.appendChild(p1);
    parent.appendChild(r);
    editor.updateSelection(false, [p1, r]);
    expect(editor.joinPaths() === p1).toBe(oldConvert["joinOne"]);
    editor.updateSelection(false, [r]);
    expect(editor.joinPaths()).toBe(oldConvert["joinNone"]);
  });

  it("splits a compound path into transformed clones in its place, or out of the tree", () => {
    const { editor, parent } = setup();
    const cp = compound(
      "cp",
      path(
        [
          [20, 0],
          [30, 0],
          [30, 10],
        ],
        true,
        "cp1",
      ),
      path(
        [
          [40, 0],
          [50, 0],
          [50, 10],
        ],
        true,
        "cp2",
      ),
    );
    cp.transform(new Transform(2, 0, 0, 2, 1, 1));
    const after = rect(1, 1, 300, 300, "after");
    parent.appendChild(cp);
    parent.appendChild(after);
    const parts = editor.splitCompoundPath(cp) as Node[];
    expect({
      parts: parts.map(describeNode),
      kids: elements(parent)
        .map(describeNode)
        .map((d) => String(d["cls"]) + ":" + String(d["name"])),
      cpRemoved: cp.getParent() === null,
      cpKidsLeft: (cp.getPaths() as unknown as Parent).getChildren().length,
    }).toEqual(oldConvert["split"]);

    const lone = compound(
      null,
      path(
        [
          [0, 0],
          [1, 1],
        ],
        false,
        "l1",
      ),
    );
    const loneParts = editor.splitCompoundPath(lone) as Node[];
    expect({
      parts: loneParts.map(describeNode),
      noParent: loneParts.map((p) => p.getParent() === null),
      loneKidsLeft: (lone.getPaths() as unknown as Parent).getChildren().length,
    }).toEqual(oldConvert["splitLone"]);
    expect(editor.splitCompoundPath(after)).toBe(oldConvert["splitNot"]);
  });
});
