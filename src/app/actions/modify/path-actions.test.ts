import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { VertexPolyBoolean } from "../../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { AnchorPoint } from "../../../engine/scene/path-base.ts";
import { Path } from "../../../engine/scene/path.ts";
import "../../../editor/element-editors/compound-shape-editor.ts";
import "../../../editor/element-editors/compound-path-editor.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { PathEditor } from "../../../editor/element-editors/path-editor.ts";
import { setLateModules } from "../../shell/late.ts";
import { rect, setupDesigner, type Fixture } from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { ConnectLinesAction } from "./connect-lines-action.ts";
import { ConvertToRawPathAction } from "./convert-to-raw-path-action.ts";
import { CreateNestedCompoundAction } from "./create-nested-compound-action.ts";
import { JoinPathsAction } from "./join-paths-action.ts";
import { MergeMainAction } from "./merge-main-action.ts";
import { MergeSubAction } from "./merge-sub-action.ts";
import { OffsetAction } from "./offset-action.ts";
import { OutlineAction } from "./outline-action.ts";
import { ReverseOrderAction } from "./reverse-order-action.ts";
import { SplitLineAction } from "./split-line-action.ts";

let fixture: Fixture;

function path(name: string, points: number[][], closed = false): Path {
  const p = new Path(closed);
  for (const [x, y] of points) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    p.getAnchorPoints().appendChild(point);
  }
  p.setProperty("name", name);
  return p;
}

function points(p: Path): unknown[] {
  const out: unknown[] = [];
  for (let a = p.getAnchorPoints().getFirstChild(); a; a = a.getNext() as AnchorPoint | null) {
    out.push([a.getProperty("x"), a.getProperty("y")]);
  }
  return out;
}

function select(nodes: Node[]): void {
  fixture.editor.insertElements(nodes, true);
  fixture.editor.updateSelection(false, nodes);
}

/** A system dialog whose prompt answers with `answer`. */
function answerPrompts(answer: string | undefined): { messages: string[] } {
  const seen = { messages: [] as string[] };
  setLateModules({
    "dialogs/system-dialog.ts": {
      SystemDialog: {
        prompt(message: string, done: (value?: string) => void) {
          seen.messages.push(message);
          done(answer);
        },
        alert(message: string) {
          seen.messages.push("alert: " + message);
        },
      },
    },
  });
  return seen;
}

beforeEach(() => {
  fixture = setupDesigner();
});

afterEach(() => {
  setLateModules({});
  setActionDesigner(null);
  vi.restoreAllMocks();
});

describe("Combine (merge)", () => {
  it("builds a compound shape with the operation on every new child", () => {
    const main = fixture.register(new MergeMainAction(MergeSubAction)) as MergeMainAction;
    const subtract = fixture.register(new MergeSubAction(MergeSubAction.Type.Subtract));
    const a = rect("A", 0);
    const b = rect("B", 5);
    select([a, b]);
    expect(main.isEnabled()).toBe(true);
    expect(subtract.getId()).toBe("modify.merge.subtract");
    expect(subtract.getFullTitle()).toBe("Create Compound (Subtract)");
    subtract.execute();
    const [compound] = fixture.editor.getSelection() as Node[];
    expect(compound).toBeInstanceOf(CompoundShape);
    expect((compound as CompoundShape).getChildren()).toEqual([a, b]);
    expect(a.getProperty("bool")).toBe(VertexPolyBoolean.SUB);
    expect(b.getProperty("bool")).toBe(VertexPolyBoolean.SUB);
    expect(fixture.editor.getUndoStateName()).toBe("Combine");
  });

  it("changes the operation of one selected compound shape", () => {
    fixture.register(new MergeMainAction(MergeSubAction));
    const union = new MergeSubAction(MergeSubAction.Type.Union);
    const intersect = new MergeSubAction(MergeSubAction.Type.Intersect);
    const a = rect("A", 0);
    const b = rect("B", 5);
    select([a, b]);
    union.execute();
    const compound = (fixture.editor.getSelection() as Node[])[0] as CompoundShape;
    intersect.execute();
    // The first child keeps its operation; the others get the new one.
    expect(a.getProperty("bool")).toBe(VertexPolyBoolean.OR);
    expect(b.getProperty("bool")).toBe(VertexPolyBoolean.AND);
    expect(fixture.editor.getSelection()).toEqual([compound]);
    expect(fixture.editor.getUndoStateName()).toBe("Merge");
  });

  it("is disabled for a single plain shape and has the sub keys U S I X", () => {
    const main = fixture.register(new MergeMainAction(MergeSubAction)) as MergeMainAction;
    for (const type of Object.values(MergeSubAction.Type)) {
      fixture.register(new MergeSubAction(type));
    }
    select([rect("A", 0)]);
    expect(main.isEnabled()).toBe(false);
    expect([...(main.getShortcutSubKeys() as string[])].sort()).toEqual(["I", "S", "U", "X"]);
  });
});

describe("Create Nested Compound", () => {
  it("moves the other compound shapes into the first", () => {
    fixture.register(new MergeMainAction(MergeSubAction));
    const union = new MergeSubAction(MergeSubAction.Type.Union);
    select([rect("A", 0), rect("B", 5)]);
    union.execute();
    const first = (fixture.editor.getSelection() as Node[])[0] as CompoundShape;
    select([rect("C", 50), rect("D", 55)]);
    union.execute();
    const second = (fixture.editor.getSelection() as Node[])[0] as CompoundShape;
    fixture.editor.updateSelection(false, [first, second]);
    const action = new CreateNestedCompoundAction();
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(second.getParent()).toBe(first);
    expect(fixture.editor.getSelection()).toEqual([first]);
    expect(fixture.editor.getUndoStateName()).toBe("Create nested compound");
  });
});

describe("Join Paths", () => {
  it("joins two shapes into one compound path styled like the first", () => {
    const action = new JoinPathsAction();
    const a = rect("A", 0);
    a.setProperty("_stop", 0.5);
    select([a, rect("B", 20)]);
    expect(action.isEnabled()).toBe(true);
    action.execute();
    const [joined] = fixture.editor.getSelection() as Node[];
    expect(joined).toBeInstanceOf(CompoundPath);
    expect((joined as CompoundPath).getProperty("_stop")).toBe(0.5);
    expect((joined as CompoundPath).getPaths().getChildren().length).toBe(2);
  });
});

describe("Connect Lines", () => {
  it("closes a single path", () => {
    const p = path("P", [
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    select([p]);
    new ConnectLinesAction().execute();
    expect(p.getProperty("closed")).toBe(true);
  });

  it("joins two paths in tree order into one", () => {
    const p1 = path("P1", [
      [0, 0],
      [10, 0],
    ]);
    const p2 = path("P2", [
      [10, 10],
      [0, 10],
    ]);
    fixture.editor.insertElements([p1, p2], true);
    fixture.editor.updateSelection(false, [p2, p1]);
    new ConnectLinesAction().execute();
    const [joined] = fixture.editor.getSelection() as Path[];
    expect(joined).toBeInstanceOf(Path);
    expect(p1.getParent()).toBeNull();
    expect(points(joined as Path)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    // The last path in tree order gives its properties.
    expect((joined as Path).getProperty("name")).toBe("P2");
  });
});

describe("Reverse Order", () => {
  it("reverses the points of selected paths", () => {
    const p = path("P", [
      [0, 0],
      [10, 0],
      [20, 5],
    ]);
    select([p]);
    const action = new ReverseOrderAction();
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(points(p)).toEqual([
      [20, 5],
      [10, 0],
      [0, 0],
    ]);
  });
});

describe("Convert to Raw Path", () => {
  it("replaces a rectangle by a path in its place", () => {
    const a = rect("A", 0);
    a.setProperty("_stop", 0.5);
    select([a]);
    const parent = a.getParent();
    new ConvertToRawPathAction().execute();
    const [converted] = fixture.editor.getSelection() as Node[];
    expect(converted).toBeInstanceOf(Path);
    expect(converted?.getParent()).toBe(parent);
    expect(a.getParent()).toBeNull();
    expect((converted as Path).getProperty("_stop")).toBe(0.5);
  });
});

describe("Convert to Outline and Expand/Shrink", () => {
  it("asks for a width with default 1 and replaces the path by its outline", () => {
    const seen = answerPrompts("2");
    const p = path("P", [
      [0, 0],
      [100, 0],
    ]);
    p.setProperty("_stop", 0.5);
    select([p]);
    const action = new OutlineAction();
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(seen.messages).toEqual(["Enter a positive value for the outline:"]);
    const [outline] = fixture.editor.getSelection() as Node[];
    expect(outline).not.toBe(p);
    expect(p.getParent()).toBeNull();
    expect((outline as Path).getProperty("_stop")).toBe(0.5);
    expect(fixture.editor.getUndoStateName()).toBe("Convert to Outline");
  });

  it("shows its own alert for an invalid offset (BUG-135)", () => {
    const seen = answerPrompts("0");
    const p = path(
      "P",
      [
        [0, 0],
        [100, 0],
        [100, 100],
      ],
      true,
    );
    select([p]);
    new OffsetAction().execute();
    expect(seen.messages).toEqual([
      "Enter a positive value for offset or negative for inset:",
      "alert: Entered invalid number for offset value.",
    ]);
    expect(p.getParent()).not.toBeNull();
  });

  it("keeps Convert to Outline's alert for an invalid width", () => {
    const seen = answerPrompts("x");
    const p = path("P", [
      [0, 0],
      [100, 0],
    ]);
    select([p]);
    new OutlineAction().execute();
    expect(seen.messages).toEqual([
      "Enter a positive value for the outline:",
      "alert: Entered invalid number for outline value.",
    ]);
    expect(p.getParent()).not.toBeNull();
  });

  it("does nothing on cancel", () => {
    answerPrompts(undefined);
    const p = path(
      "P",
      [
        [0, 0],
        [100, 0],
        [100, 100],
      ],
      true,
    );
    select([p]);
    const before = fixture.editor.getUndoStates().length;
    new OffsetAction().execute();
    expect(fixture.editor.getUndoStates().length).toBe(before);
    expect(fixture.editor.getSelection()).toEqual([p]);
  });
});

describe("Split Line", () => {
  it("gives line pieces of a path without fill and border a black border (BUG-137)", () => {
    const p = path("P", [
      [0, 0],
      [50, 0],
      [100, 0],
    ]);
    select([p]);
    const parent = p.getParent();
    const anchors = p.getAnchorPoints().getChildren();
    const pathEditor = ElementEditor.getEditor(p) as unknown as PathEditor;
    pathEditor.updatePartSelection(false, [{ type: PathEditor.PartType.Point, point: anchors[1] }]);
    const action = new SplitLineAction();
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(p.getParent()).toBeNull();
    const pieces = parent?.getChildren().filter((n) => n instanceof Path);
    expect(pieces?.map((piece) => points(piece as Path))).toEqual([
      [
        [0, 0],
        [50, 0],
      ],
      [
        [50, 0],
        [100, 0],
      ],
    ]);
    for (const piece of pieces as Path[]) {
      const layers = piece.getPaintLayers();
      expect(layers?.getFillLayers(true).length).toBe(0);
      const borders = layers?.getBorderLayers(true) ?? [];
      expect(borders.length).toBe(1);
      expect(RGBColor.equals(borders[0]?.getProperty("_pt"), RGBColor.BLACK)).toBe(true);
    }
    expect(fixture.editor.getUndoStateName()).toBe("Break Curve");
  });
});
