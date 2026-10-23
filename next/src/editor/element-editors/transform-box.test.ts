import { describe, expect, it } from "vitest";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { BaseEditor, PartInfo } from "./base-editor.ts";
import { TransformBox } from "./transform-box.ts";

const H = TransformBox.Handles;
const owner = new BaseEditor();

function box(flags?: number, cx: number | null = null, cy: number | null = null): TransformBox {
  return new TransformBox(new Rect(0, 0, 200, 100), cx, cy, flags ?? null, null);
}

function hit(target: TransformBox, x: number, y: number): PartInfo {
  return target.getPartInfoAt(new Point(x, y), new Transform(), 4, owner);
}

function matrix(transform: Transform | undefined): number[] | null {
  return transform ? transform.getMatrix().slice() : null;
}

const noSnap = { mapPoint: (p: Point) => p };

describe("GTransformBox", () => {
  it("rotates around the centre unless one is given; 0 counts as none", () => {
    expect([box().cx, box().cy]).toEqual([100, 50]);
    expect([box(undefined, 10, 20).cx, box(undefined, 10, 20).cy]).toEqual([10, 20]);
    // The old constructor tested the centre with ||.
    expect([box(undefined, 0, 0).cx, box(undefined, 0, 0).cy]).toEqual([100, 50]);
  });

  it("has the four corners as vertices, mapped by its transform", () => {
    const target = box();
    target.setTransform(new Transform(1, 0, 0, 1, 10, 5));
    const out: number[][] = [];
    const vertex = { command: 0, x: 0, y: 0 };
    target.rewindVertices(0);
    while (target.readVertex(vertex as never)) out.push([vertex.command, vertex.x, vertex.y]);
    const { Move, Line, Close } = Vertex.Command;
    expect(out.slice(0, 4)).toEqual([
      [Move, 10, 5],
      [Line, 210, 5],
      [Line, 210, 105],
      [Line, 10, 105],
    ]);
    expect(out.length).toBe(5);
    expect(out[4]?.[0]).toBe(Close);
  });

  it("counts the skew and rotate handles in its box even when they are off", () => {
    // Skew and rotate handles are disabled by default, yet their options
    // objects exist, so the box reaches out to them.
    const area = box()._calculateGeometryBBox();
    expect([area.getX(), area.getY(), area.getWidth(), area.getHeight()]).toEqual([
      0, -46, 246, 192,
    ]);
  });

  it("hit tests handles, pivot, inside, outline, outside and far outside", () => {
    const target = box();
    const corner = hit(target, 1, 1);
    expect(corner.id).toBe(H.TOP_LEFT);
    expect(corner.editor).toBe(owner);
    expect(hit(target, 199, 99).id).toBe(H.BOTTOM_RIGHT);
    expect(hit(target, 100, 1).id).toBe(H.TOP_CENTER);
    expect(hit(target, 100, 50).id).toBe(H.ROTATION_CENTER);
    expect(hit(target, 50, 30).id).toBe(TransformBox.INSIDE);
    const top = hit(target, 50, 0.5);
    const right = hit(target, 200, 30);
    expect(top.id).toBe(TransformBox.OUTLINE);
    expect(right.id).toBe(TransformBox.OUTLINE);
    // The data is the axis: horizontal and vertical edges differ.
    expect([0, 1]).toContain(top.data);
    expect(right.data).toBe(1 - (top.data as number));
    const outside = hit(target, 300, 50);
    expect(outside.id).toBe(TransformBox.OUTSIDE);
    expect((outside.data as { rotationSegment: number }).rotationSegment).toBe(
      GMath.getRotationSegment(new Point(100, 50), new Point(300, 50)),
    );
    expect(hit(target, 600, 50).id).toBe(TransformBox.FAR_OUTSIDE);
  });

  it("only has the parts its flags allow", () => {
    const moveOnly = box(TransformBox.TBoxFlag.Move);
    expect(hit(moveOnly, 1, 1).id).toBe(TransformBox.INSIDE);
    expect(hit(moveOnly, 100, 50).id).toBe(TransformBox.INSIDE);
    expect(hit(moveOnly, 300, 50).id).toBe(TransformBox.FAR_OUTSIDE);
    // A small box in the view loses its side handles first, then the corners.
    const small = new TransformBox(new Rect(0, 0, 50, 50), null, null, null, null);
    expect(small._collectResizeHandles(new Transform())).toEqual([0, 2, 6, 4]);
    expect(small._collectResizeHandles(new Transform(0.5, 0, 0, 0.5, 0, 0))).toEqual([]);
  });

  it("turns drags into resize, pivot, move, skew and rotation transforms", () => {
    const target = box();
    const part = (id: unknown, data?: unknown) => new PartInfo(owner, id, data, null, null);
    const resize = target.calculateTransformation(
      part(H.BOTTOM_RIGHT),
      new Transform(),
      new Point(200, 100),
      new Point(220, 110),
      noSnap,
    );
    expect(matrix(resize)).toEqual(
      Transform.getResizeTransform(
        new Rect(0, 0, 200, 100),
        Rect.Side.BOTTOM_RIGHT,
        20,
        10,
      ).getMatrix(),
    );
    expect(
      matrix(
        target.calculateTransformation(
          part(H.ROTATION_CENTER),
          new Transform(),
          new Point(100, 50),
          new Point(103, 57),
          noSnap,
        ),
      ),
    ).toEqual([1, 0, 0, 1, 3, 7]);
    // A move from the left third snaps the left edge: guides that round to
    // 10 turn a move by (13, 7) into one by (10, 10).
    const round = {
      mapPoint: (p: Point) =>
        new Point(Math.round(p.getX() / 10) * 10, Math.round(p.getY() / 10) * 10),
    };
    expect(
      matrix(
        target.calculateTransformation(
          part(TransformBox.INSIDE),
          new Transform(),
          new Point(10, 10),
          new Point(23, 17),
          round,
        ),
      ),
    ).toEqual([1, 0, 0, 1, 10, 10]);
    // Skew with shift and a step rounds the drag to the step.
    expect(
      matrix(
        target.calculateTransformation(
          part(TransformBox.OUTLINE, 0),
          new Transform(),
          new Point(100, 0),
          new Point(114, 3),
          noSnap,
          false,
          true,
          10,
        ),
      ),
    ).toEqual(
      new Transform(1, 0, 0, 1, -100, -50)
        .multiplied(new Transform(1, 0, (2 * -10) / 100, 1, 0, 0))
        .multiplied(new Transform(1, 0, 0, 1, 100, 50))
        .getMatrix(),
    );
    const rotation = target.calculateTransformation(
      part(TransformBox.OUTSIDE, {}),
      new Transform(),
      new Point(300, 50),
      new Point(100, 250),
      noSnap,
    );
    expect(matrix(rotation)).toEqual(
      Transform.getRotationTransform(300, 50, 100, 250, 100, 50).getMatrix(),
    );
    // Shift without the axis points: no transform at all.
    expect(
      target.calculateTransformation(
        part(TransformBox.OUTSIDE, {}),
        new Transform(),
        new Point(300, 50),
        new Point(100, 250),
        noSnap,
        false,
        true,
      ),
    ).toBeUndefined();
  });

  it("moves its pivot by the preview and records the move", () => {
    const calls: unknown[] = [];
    const invalidations: number[] = [];
    const scene = {
      __editor__: { requestInvalidation: () => invalidations.push(1) },
      getWorkspace: () => ({
        getTransactionRecorder: () => ({
          afterTBoxCenterTransform: (...args: unknown[]) => calls.push(args.slice(1)),
        }),
      }),
    };
    const target = new TransformBox(new Rect(0, 0, 200, 100), null, null, null, scene);
    target.setCenterTransform(new Transform(1, 0, 0, 1, 5, -5));
    target.applyCenterTransform();
    expect([target.cx, target.cy, target.cTrf, target.trf]).toEqual([105, 45, null, null]);
    expect(calls).toEqual([[100, 50, 105, 45]]);
    expect(invalidations.length).toBe(2);
    // Nothing previewed: nothing recorded.
    target.applyCenterTransform();
    expect(calls.length).toBe(1);
  });
});
