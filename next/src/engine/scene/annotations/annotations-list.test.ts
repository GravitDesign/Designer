import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GDate } from "../../core/date.ts";
import { Point } from "../../math/point.ts";
import { Transform } from "../../math/transform.ts";
import { CollisionFlag } from "../element-change.ts";
import { Group } from "../group.ts";
import { NodeFlag } from "../node-change.ts";
import { Node } from "../node.ts";
import { Rectangle } from "../rectangle.ts";
import { AnnotationsList } from "./annotations-list.ts";
import { EllipseAnnotation } from "./ellipse-annotation.ts";
import { EmptyAnnotation } from "./empty-annotation.ts";
import { RectangleAnnotation } from "./rectangle-annotation.ts";

const NOW = 1_700_000_000_000;

function box(
  rect: { getX(): number; getY(): number; getWidth(): number; getHeight(): number } | null,
) {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

/** A list with a rectangle (10..30, 15..25), an ellipse (46..54) and an empty annotation. */
function filledList() {
  const list = new AnnotationsList();
  const rect = new RectangleAnnotation();
  rect.setProperty("trf", new Transform(10, 0, 0, 5, 20, 20));
  const ellipse = new EllipseAnnotation();
  ellipse.setProperty("trf", new Transform(4, 0, 0, 4, 50, 50));
  const empty = new EmptyAnnotation();
  list.appendAnnotation(rect, "First", "u1", 3, "loc");
  list.appendAnnotation(ellipse);
  list.appendAnnotation(empty, null, "u2");
  return { list, rect, ellipse, empty };
}

function area(half: number): Rectangle {
  const rect = new Rectangle();
  rect.setProperty("trf", new Transform(half, 0, 0, half, half, half));
  return rect;
}

beforeEach(() => {
  vi.spyOn(GDate, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GAnnotationsList", () => {
  it("keeps its own id in aid and only goes into a page", () => {
    const list = new AnnotationsList();
    expect(Node.getName(list)).toBe("annlst");
    expect(list.getProperty("aid")).toBe(list.getId());
    expect(list.validateInsertion(new Group())).toBe(false);
    expect(list.restored).toBe(false);
    expect((Node.deserialize(Node.serialize(list) as string) as AnnotationsList).restored).toBe(
      true,
    );
  });

  it("numbers appended annotations after the highest seq and stamps them", () => {
    const { rect, ellipse, empty } = filledList();
    expect(rect.getProperties(["name", "uid", "seq", "loc", "typ", "time"])).toEqual([
      "First",
      "u1",
      0,
      "loc",
      3,
      NOW,
    ]);
    expect(ellipse.getProperties(["name", "uid", "seq", "loc", "typ"])).toEqual([
      null,
      null,
      1,
      null,
      0,
    ]);
    expect(empty.getProperties(["uid", "seq"])).toEqual(["u2", 2]);
  });

  it("has the union of its elements' boxes, updated when one is removed", () => {
    const { list, ellipse } = filledList();
    expect(box(list.getGeometryBBox())).toEqual([10, 15, 44, 39]);
    expect(box(list.getPaintBBox())).toEqual([10, 15, 44, 39]);
    expect(list.getSourceBBox()).toBeNull();
    expect(box(list.getPreTransformRect(new Transform(2, 0, 0, 2, 1, 1)))).toEqual([
      4.5, 7, 22, 19.5,
    ]);
    list.removeChild(ellipse);
    expect(box(list.getGeometryBBox())).toEqual([10, 15, 20, 10]);
    expect(box(new AnnotationsList().getPaintBBox())).toEqual([0, 0, 0, 0]);
  });

  it("collides by the union box and then by its annotations", () => {
    const { list } = filledList();
    const names = (flags: number, half: number) =>
      list.getCollisions(area(half), flags).map((e) => Node.getName(e));
    expect(names(CollisionFlag.GeometryBBox, 50)).toEqual(["annlst", "anr", "ane"]);
    expect(names(CollisionFlag.PaintBBox | CollisionFlag.Partial, 12.5)).toEqual(["annlst", "anr"]);
    expect(list.isFullUnderCollision(area(50))).toBe(true);
    expect(list.isFullUnderCollision(area(12.5))).toBe(false);
    expect(list.hitTest(new Point(200, 200))).toBeNull();
  });

  it("resolves the annotations of one uid, or all", () => {
    const { list, rect, ellipse } = filledList();
    list.resolve("u1");
    expect([rect.getProperty("rsv"), ellipse.getProperty("rsv")]).toEqual([true, undefined]);
    list.resolve();
    expect(ellipse.getProperty("rsv")).toBe(true);
  });

  it("stores the page id as pgid, and drops the ids in copies", () => {
    const list = new AnnotationsList();
    list.setProperties(["Guid", "sid"], ["g", "s"]);
    const page = new Group();
    list._setParent(page as never);
    const plain = JSON.parse(Node.serialize(list) as string) as Record<string, unknown>;
    expect([plain["pgid"], plain["aid"], plain["Guid"], plain["sid"]]).toEqual([
      page.getId(),
      list.getId(),
      "g",
      "s",
    ]);
    const copy = JSON.parse(Node.serialize(list, { copy: true }) as string) as Record<
      string,
      unknown
    >;
    expect(["pgid", "aid", "Guid", "sid"].filter((k) => Object.hasOwn(copy, k))).toEqual([]);
  });

  it("throws in getSelected once an annotation is selected (old slip)", () => {
    const { list, rect } = filledList();
    expect(list.getSelected()).toEqual([]);
    rect.setFlag(NodeFlag.Selected);
    expect(() => list.getSelected()).toThrow(ReferenceError);
  });

  it("counts nested update brackets", () => {
    const list = new AnnotationsList();
    list.beginUpdate();
    list.beginUpdate();
    list.endUpdate();
    expect(list._updateCounter).toBe(1);
    list.endUpdate();
    expect(list._updateCounter).toBeUndefined();
  });

  it("isn't paintable outside a scene or while annotations are hidden", () => {
    const { list } = filledList();
    expect(list.isPaintable()).toBe(false);
    const context = {
      configuration: { multiPageView: false, isElementAnnotationsVisible: () => false },
      dirtyMatcher: null,
    };
    expect(list.isPaintable(context as never)).toBe(false);
    context.configuration.isElementAnnotationsVisible = () => true;
    expect(list.isPaintable(context as never)).toBe(true);
  });
});
