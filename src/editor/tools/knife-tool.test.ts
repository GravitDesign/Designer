import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Group } from "../../engine/scene/group.ts";
import { Image } from "../../engine/scene/image.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Path } from "../../engine/scene/path.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Cursor } from "../cursor.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import recordedCuts from "./knife-cuts.recorded.json";
import { KnifeTool } from "./knife-tool.ts";
import {
  clearModifiers,
  ellipse,
  pause,
  points,
  rect,
  scenarioView,
  setModifiers,
  setupPathTool,
} from "./path-testing.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

const setup = () => setupPathTool(new KnifeTool());
type Input = ReturnType<typeof setup>["input"];

function cut(input: Input, from: [number, number], through: [number, number][]): void {
  pause();
  input.down(...from);
  for (const p of through) input.drag(...p);
  const last = through[through.length - 1] as [number, number];
  input.up(...last);
}

const names = (nodes: Node[]): string[] => nodes.map((n) => n.getNodeName());

/** The y range of a path's anchor points (page coordinates). */
function yRange(path: Path): [number, number] {
  const ys = points(path).map((p) => {
    const trf = path.getTransform();
    return trf
      ? trf.mapPoint({ getX: () => p[0], getY: () => p[1] } as never).getY()
      : (p[1] as number);
  });
  return [Math.min(...ys), Math.max(...ys)];
}

describe("KnifeTool", () => {
  it("cuts a crossed rectangle into a top and a bottom path, selected", () => {
    const { page, input, tool, editor } = setup();
    expect(tool.getCursor()).toBe(Cursor.Knife);
    rect(page, 100, 100, 200, 140);
    cut(
      input,
      [80, 170],
      [
        [200, 170],
        [330, 170],
      ],
    );
    const children = page.getChildren();
    expect(names(children)).toEqual(["path", "path"]);
    const ranges = (children as Path[]).map(yRange).sort((a, b) => a[0] - b[0]);
    expect(ranges).toEqual([
      [100, 170],
      [170, 240],
    ]);
    expect(editor.getSelection()).toEqual(children);
    expect(editor.getUndoStateName()).toBe("Cut shape(s)");
  });

  it("with a selection cuts only the selected shapes", () => {
    const { page, input, editor } = setup();
    const r = rect(page, 100, 100, 200, 140);
    const e = ellipse(page, 350, 100, 140, 140);
    editor.updateSelection(false, [e]);
    cut(
      input,
      [80, 170],
      [
        [300, 175],
        [520, 180],
      ],
    );
    const children = page.getChildren();
    expect(children[0]).toBe(r);
    expect(names(children)).toEqual(["rectangle", "path", "path"]);
  });

  it("leaves a shape the line doesn't cross alone", () => {
    const { page, input, editor } = setup();
    const r = rect(page, 100, 100, 200, 140);
    cut(
      input,
      [80, 300],
      [
        [200, 300],
        [330, 300],
      ],
    );
    expect(page.getChildren()).toEqual([r]);
    expect(r).toBeInstanceOf(Rectangle);
    expect(editor.getSelection() ?? []).toEqual([]);
  });

  it("Shift constrains the cut line to 45° steps", () => {
    const { page, input } = setup();
    rect(page, 100, 100, 200, 140);
    pause();
    input.down(80, 130);
    setModifiers({ shiftKey: true });
    input.drag(200, 150);
    input.drag(330, 160);
    input.up(330, 160);
    setModifiers({ shiftKey: false });
    // Constrained to the horizontal through y = 130.
    const ranges = (page.getChildren() as Path[]).map(yRange).sort((a, b) => a[0] - b[0]);
    expect(ranges).toEqual([
      [100, 130],
      [130, 240],
    ]);
  });

  it("with Alt at the press the release only shapes the line; letting Alt go cuts", () => {
    const { page, input } = setup();
    rect(page, 100, 100, 200, 140);
    pause();
    setModifiers({ optionKey: true });
    input.down(80, 170);
    input.drag(150, 120);
    input.up(150, 120);
    expect(names(page.getChildren())).toEqual(["rectangle"]);
    // Alt up replays a press and release at the last position, which a
    // press within the double-click time would swallow.
    pause();
    setModifiers({ optionKey: false });
    // The curve ends inside the rectangle and crosses its outline once:
    // the rectangle is opened there into one path.
    expect(names(page.getChildren())).toEqual(["path"]);
  });

  it("right clicks add rounded points to the line and cut at every release", () => {
    const { page, input } = setup();
    rect(page, 100, 100, 200, 140);
    pause();
    input.down(80, 130, MouseEvent.BUTTON_RIGHT);
    input.up(80, 130, MouseEvent.BUTTON_RIGHT);
    expect(names(page.getChildren())).toEqual(["rectangle"]);
    expect((page.getChildren()[0] as Rectangle).getParent()).not.toBeNull();
  });
});

/**
 * A shape of a recorded knife case (knife-cuts.recorded.json). The old
 * app built the same shapes with the same values, cut them with the knife
 * through real pointer input (a hover, a press at the first point, moves
 * to the others, the release) in a view with scene (0, 0) at view
 * (400, 200), and described the page afterwards the way describeNode()
 * below does.
 */
interface ShapeSpec {
  t: "path" | "compound" | "rect" | "image" | "group";
  pts?: number[][];
  closed?: boolean;
  evenodd?: boolean;
  corner?: { cl: number; cr: number };
  paths?: ShapeSpec[];
  box?: number[];
  fill?: boolean;
  plkt?: number;
  locked?: boolean;
  kids?: ShapeSpec[];
}

interface RecordedCut {
  id: string;
  shapes: ShapeSpec[];
  select?: number[];
  cut: [number, number][];
  result: { page: unknown[]; selection: number[]; undo: string | null; same: number[] };
}

/** The members the builders and describeNode use, on any built node. */
type Built = Node & {
  setProperty(name: string, value: unknown): void;
  getProperty(name: string): unknown;
  setFlag(flag: number): void;
  appendChild(child: Node): void;
  hasStyleFill?: () => boolean;
  getChildren?: () => Node[];
};

function buildPath(spec: ShapeSpec): Path {
  const path = new Path();
  for (const [x, y] of spec.pts ?? []) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    if (spec.corner) point.setProperties(["cl", "cr"], [spec.corner.cl, spec.corner.cr]);
    path.getAnchorPoints().appendChild(point);
  }
  if (spec.closed) path.setProperty("closed", true);
  if (spec.evenodd !== undefined) path.setProperty("evenodd", spec.evenodd);
  return path;
}

function build(spec: ShapeSpec): Built {
  let node: Built;
  if (spec.t === "path") node = buildPath(spec) as unknown as Built;
  else if (spec.t === "compound") {
    const compound = new CompoundPath();
    for (const path of spec.paths ?? []) compound.getPaths().appendChild(buildPath(path));
    if (spec.evenodd !== undefined) compound.setProperty("evenodd", spec.evenodd);
    node = compound as unknown as Built;
  } else if (spec.t === "rect" || spec.t === "image") {
    const [x, y, w, h] = spec.box as [number, number, number, number];
    node = (spec.t === "rect" ? new Rectangle() : new Image()) as unknown as Built;
    node.setProperty(
      "trf",
      spec.t === "rect"
        ? new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2)
        : new Transform(w, 0, 0, h, x, y),
    );
  } else node = new Group() as unknown as Built;
  if (spec.fill) {
    (node as unknown as Rectangle)
      .getPaintLayers()
      ?.appendChild(new FillPaintLayer(RGBColor.BLACK));
  }
  if (spec.plkt) node.setProperty("plkt", spec.plkt);
  for (const kid of spec.kids ?? []) node.appendChild(build(kid));
  return node;
}

const round6 = (value: unknown): unknown =>
  typeof value === "number" ? Math.round(value * 1e6) / 1e6 : value;

const POINT_PROPERTIES = ["x", "y", "tp", "hlx", "hly", "hrx", "hry", "cl", "cr", "ah"];

/** The node as the recording script described it. */
function describeNode(node: Node): Record<string, unknown> {
  const element = node as Built;
  const out: Record<string, unknown> = { n: node.getNodeName() };
  const trf = element.getProperty("trf") as Transform | null;
  out.trf = trf ? trf.getMatrix().map(round6) : null;
  // Rectangles and images are path bases too, with their own anchor points.
  if (node instanceof PathBase) {
    out.closed = node.getProperty("closed");
    out.eo = node.getProperty("evenodd");
    out.pts = points(node as Path, POINT_PROPERTIES).map((p) => p.map(round6));
  }
  if (node instanceof CompoundPath) {
    out.eo = node.getProperty("evenodd");
    const paths: unknown[] = [];
    for (let child: Node | null = node.getPaths().getFirstChild(); child; child = child.getNext())
      paths.push(describeNode(child));
    out.paths = paths;
  }
  if (element.hasStyleFill) out.fill = !!element.hasStyleFill();
  const kids = element.getChildren ? element.getChildren() : [];
  if (kids.length) out.kids = kids.map(describeNode);
  return out;
}

describe("KnifeTool cuts recorded in the old app", () => {
  // Compound paths split into closed and open groups, styled corners,
  // evenodd, a side of several pieces (a new group), masked children
  // cloned onto every piece, and which elements the knife leaves alone.
  for (const recorded of recordedCuts as unknown as RecordedCut[]) {
    it(recorded.id, () => {
      const { page, input, editor } = scenarioView(setup());
      const nodes = recorded.shapes.map(build);
      for (const node of nodes) page.appendChild(node);
      // Appending re-applies the block lock, so the flag goes on afterwards.
      recorded.shapes.forEach((spec, i) => {
        if (spec.locked) (nodes[i] as Built).setFlag(ElementFlag.FullLocked);
      });
      editor.updateSelection(
        false,
        (recorded.select ?? []).map((i) => nodes[i] as Node),
      );
      const [start, ...through] = recorded.cut;
      const [x, y] = start as [number, number];
      pause();
      input.move(x - 30, y - 30);
      input.move(x, y);
      input.down(x, y);
      for (const p of through) input.drag(...p);
      const last = through[through.length - 1] as [number, number];
      input.up(...last);
      const children = page.getChildren();
      const selection = editor.getSelection() ?? [];
      expect({
        page: children.map(describeNode),
        selection: selection.map((n) => children.indexOf(n)),
        undo: editor.getUndoStateName(),
        same: children.map((n) => nodes.indexOf(n as Built)),
      }).toEqual({
        page: recorded.result.page,
        selection: recorded.result.selection,
        undo: recorded.result.undo,
        same: recorded.result.same,
      });
    });
  }
});

describe("KnifeTool._selectFilter", () => {
  it("rejects an element whose parent block has the NoEdit program lock", () => {
    // Unreachable through the cut: the collision search applies the same
    // filter to the parent first and doesn't look below a rejected one
    // (pinned by "filter-program-locks" above). Pinned here directly.
    const { tool } = setup();
    const group = new Group();
    const child = new Rectangle();
    group.appendChild(child);
    expect(tool._selectFilter(child)).toBe(true);
    group.setProperty("plkt", 4);
    expect(tool._selectFilter(child)).toBe(false);
  });
});
