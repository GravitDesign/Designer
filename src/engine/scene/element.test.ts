import { describe, expect, it } from "vitest";
import { getTypeId } from "../core/object.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform as Matrix } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { Block } from "./block.ts";
import { Accelerated } from "./element-accelerated.ts";
import { Anchor } from "./element-anchor.ts";
import { CollisionFlag, ElementChange, ElementFlag } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { Transform } from "./element-transform.ts";
import { Element, GeometryChangeEvent, type ElementHit } from "./element.ts";
import { Item } from "./item.ts";
import { NodeFlag } from "./node-change.ts";
import { Container } from "./node-container.ts";
import { Node, registerNodeClass } from "./node.ts";

const UNIT = new Rect(0, 0, 1, 1);

/** A unit square mapped by `trf`, like the old shapes. */
class TestShape extends Transform(Item) {
  static {
    registerNodeClass(this, "testshape", "GTestShape");
  }
  declare $trf: Matrix | null;

  static at(x: number, y: number, w: number, h: number): TestShape {
    const shape = new TestShape();
    shape.setProperty("trf", new Matrix(w, 0, 0, h, x, y));
    return shape;
  }

  override getTransform(): Matrix | null {
    return this.$trf;
  }

  override setTransform(transform: Matrix | null): void {
    this.setProperty("trf", transform);
  }

  override transform(transform: Matrix): void {
    this.setTransform(this.$trf ? this.$trf.multiplied(transform) : transform);
  }

  override _calculateGeometryBBox(): Rect | null {
    return this.$trf ? this.$trf.mapRect(UNIT) : null;
  }

  override _calculatePaintBBox(): Rect | null {
    return this.getGeometryBBox();
  }

  override _detailHitTest(): ElementHit | null {
    return new ElementData<Element, unknown>(this, null);
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleGeometryChangeForProperties(change, args, { trf: null });
    super._handleChange(change, args);
  }
}

/** A 100 x 100 frame mapped by `trf` that lays out anchored children. */
class TestFrame extends Layout(Container(Transform(Item))) {
  static {
    registerNodeClass(this, "testframe", "GTestFrame");
  }
  declare $trf: Matrix | null;

  override getTransform(): Matrix | null {
    return this.$trf;
  }

  override setTransform(transform: Matrix | null): void {
    this.setProperty("trf", transform);
  }

  override _calculateGeometryBBox(): Rect | null {
    const box = new Rect(0, 0, 100, 100);
    return this.$trf ? this.$trf.mapRect(box) : box;
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleGeometryChangeForProperties(change, args, { trf: null });
    super._handleChange(change, args);
  }
}

class TestLayer extends Accelerated(Container(Item)) {
  static {
    registerNodeClass(this, "testlayer", "GTestLayer");
  }
}

class TestGroup extends Container(Item) {
  static {
    registerNodeClass(this, "testgroup", "GTestGroup");
  }
}

const box = (r: Rect | null) =>
  r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()].map((v) => +v.toFixed(9)) : null;

describe("GElement constants", () => {
  it("has the old ids and only its own flags", () => {
    expect(getTypeId(Element)).toBe(84);
    expect(getTypeId(Block)).toBe(88);
    expect(getTypeId(Item)).toBe(89);
    expect(getTypeId(GeometryChangeEvent)).toBe(85);
    expect(getTypeId(Element.Transform)).toBe(95);
    expect(getTypeId(Element.Layout)).toBe(96);
    expect(getTypeId(Element.Accelerated)).toBe(97);
    expect(getTypeId(Element.Anchor)).toBe(90);
    expect(getTypeId(Block.LabelHolder)).toBe(166);
    expect(Element.Flag).toEqual({
      Hidden: 1 << 21,
      PartialLocked: 1 << 22,
      FullLocked: 1 << 23,
      NoPaint: 1 << 24,
    });
    expect(Element.CollisionFlag).toBe(CollisionFlag);
    expect(Element.GeometryChangeEvent.Type).toEqual({ Before: 0, After: 1, Child: 2 });
    expect(Transform.MinimalDimention).toBe(1e-6);
    expect(Anchor.AnchorType).toEqual({ Start: 1, Middle: 2, End: 3, Stretch: 4 });
    expect(Block.ProgramLck.NoSelect).toBe(512);
  });
});

describe("bounding boxes and geometry updates", () => {
  it("caches boxes and drops them on a geometry change", () => {
    const shape = TestShape.at(0, 0, 10, 10);
    const first = shape.getGeometryBBox();
    expect(shape.getGeometryBBox()).toBe(first);
    shape.setProperty("trf", new Matrix(20, 0, 0, 20, 5, 5));
    expect(box(shape.getGeometryBBox())).toEqual([5, 5, 20, 20]);
    expect(box(shape.getPaintBBox())).toEqual([5, 5, 20, 20]);
  });

  it("sends Before and After around a change and Child to the parent", () => {
    const group = new TestGroup();
    const shape = TestShape.at(0, 0, 10, 10);
    group.appendChild(shape);
    const log: string[] = [];
    group.addEventListener(GeometryChangeEvent, (e) =>
      log.push(Node.getName(e.element) + ":" + e.type),
    );
    shape.setProperty("trf", new Matrix(1, 0, 0, 1, 0, 0));
    // The parent hears of the change before the After event goes out.
    expect(log).toEqual(["testshape:0", "testgroup:2", "testshape:1"]);
    expect(box(group.getGeometryBBox())).toEqual([0, 0, 1, 1]);
  });

  it("holds one bracket open between beginUpdate and endUpdate", () => {
    const shape = TestShape.at(0, 0, 10, 10);
    const types: number[] = [];
    shape.addEventListener(GeometryChangeEvent, (e) => types.push(e.type as number));
    shape.beginUpdate();
    shape.setProperty("trf", new Matrix(2, 0, 0, 2, 0, 0));
    shape.setProperty("trf", new Matrix(3, 0, 0, 3, 0, 0));
    expect(types).toEqual([0]);
    shape.endUpdate();
    expect(types).toEqual([0, 1]);
    expect(box(shape.getGeometryBBox())).toEqual([0, 0, 3, 3]);
  });

  it("reports a size change to the element", () => {
    const shape = TestShape.at(0, 0, 10, 10);
    const changes: unknown[] = [];
    const original = shape._handleChange.bind(shape);
    shape._handleChange = (change: number, args?: unknown) => {
      if (change === ElementChange.GeometrySizeChanged)
        changes.push(box((args as [Element, Rect])[1]));
      original(change, args);
    };
    shape.setProperty("trf", new Matrix(10, 0, 0, 10, 50, 0));
    expect(changes).toEqual([]);
    shape.setProperty("trf", new Matrix(20, 0, 0, 10, 50, 0));
    expect(changes).toEqual([[50, 0, 10, 10]]);
  });

  it("maps the bounds into another frame", () => {
    const shape = TestShape.at(0, 0, 10, 10);
    const rotate = new Matrix().rotated(Math.PI / 4);
    const rect = shape.getPreTransformRect(rotate) as Rect;
    expect(rect.getWidth()).toBeCloseTo(Math.SQRT2 * 10, 9);
    expect(shape.getPreTransformRect(rotate)).toBe(rect);
  });
});

describe("hit testing and collisions", () => {
  function layerWithShapes(): [TestLayer, TestShape, TestShape] {
    const layer = new TestLayer();
    const below = TestShape.at(0, 0, 50, 50);
    const above = TestShape.at(25, 25, 50, 50);
    layer.appendChild(below);
    layer.appendChild(above);
    return [layer, below, above];
  }

  it("finds the topmost element, or all of them stacked", () => {
    const [layer, below, above] = layerWithShapes();
    const hits = layer.hitTest(new Point(30, 30)) as ElementHit[];
    expect(hits.map((h) => h.element)).toEqual([above]);
    const all = layer.hitTest(new Point(30, 30), null, null, true) as ElementHit[];
    // The layer has no hit test of its own.
    expect(all.map((h) => h.element)).toEqual([above, below]);
    expect((layer.hitTest(new Point(10, 10)) as ElementHit[])[0]?.element).toBe(below);
    expect(layer.hitTest(new Point(90, 90))).toBeNull();
    expect(layer.hitTest(new Point(76, 30))).toBeNull();
    expect(layer.hitTest(new Point(76, 30), null, null, false, null, 4)).not.toBeNull();
  });

  it("finds children without the accelerated index too", () => {
    const group = new TestGroup();
    const shape = TestShape.at(0, 0, 10, 10);
    group.appendChild(shape);
    expect((group.hitTest(new Point(5, 5)) as ElementHit[])[0]?.element).toBe(shape);
    // Level 0 doesn't go into the children, and the group has no hit test of its own.
    expect(group.hitTest(new Point(5, 5), null, null, false, 0)).toBeNull();
  });

  it("moves hits inside selected elements to the front", () => {
    const [layer, below, above] = layerWithShapes();
    const group = new TestGroup();
    layer.removeChild(below);
    group.appendChild(below);
    layer.insertChild(group, above);
    group.setFlag(NodeFlag.Selected);
    const hits = layer.hitTest(
      new Point(30, 30),
      null,
      (e) => e !== layer,
      true,
      null,
      0,
      false,
      null,
      null,
      true,
    ) as ElementHit[];
    expect(hits.map((h) => h.element)).toEqual([below, above]);
    const plain = layer.hitTest(new Point(30, 30), null, null, true) as ElementHit[];
    expect(plain.map((h) => h.element)).toEqual([above, below]);
  });

  it("collects elements inside or touching an area", () => {
    const [layer, below, above] = layerWithShapes();
    const area = new VertexContainer();
    area.addVertex(1, 20, 20);
    area.addVertex(2, 80, 20);
    area.addVertex(2, 80, 80);
    area.addVertex(2, 20, 80);
    area.addVertex(5, 0, 0);
    const partial = layer.getCollisions(area, CollisionFlag.GeometryBBox | CollisionFlag.Partial);
    expect(partial).toEqual([layer, below, above]);
    const full = layer.getCollisions(area, CollisionFlag.GeometryBBox);
    expect(full).toEqual([above]);
    const inside = new VertexContainer();
    inside.addVertex(1, 20, 20);
    inside.addVertex(2, 80, 80);
    expect(layer.getCollisions(inside, CollisionFlag.PaintBBox)).toEqual([above]);
  });
});

describe("GBlock", () => {
  it("hides and locks the children with the block", () => {
    const group = new TestGroup();
    const shape = TestShape.at(0, 0, 10, 10);
    group.appendChild(shape);
    group.setProperty("vis", false);
    expect(shape.hasFlag(ElementFlag.Hidden)).toBe(true);
    expect(shape.getGeometryBBox()).toBeNull();
    group.setProperty("vis", true);
    expect(shape.hasFlag(ElementFlag.Hidden)).toBe(false);
    group.setProperty("lkt", Block.LockType.Full);
    expect(shape.hasFlag(ElementFlag.FullLocked)).toBe(true);
    expect(shape.hasFlag(ElementFlag.PartialLocked)).toBe(true);
    expect(shape.isLocked()).toBe("F");
    group.setProperty("lkt", Block.LockType.Partial);
    // Partial doesn't clear the full lock (old behaviour).
    expect(shape.hasFlag(ElementFlag.FullLocked)).toBe(true);
    group.setProperty("lkt", null);
    expect(shape.hasFlag(ElementFlag.FullLocked)).toBe(false);
    expect(shape.hasFlag(ElementFlag.PartialLocked)).toBe(false);
    expect(shape.isLocked()).toBeNull();
  });

  it("keeps a hidden child hidden in a visible block", () => {
    const group = new TestGroup();
    const shape = TestShape.at(0, 0, 10, 10);
    shape.setProperty("vis", false);
    group.appendChild(shape);
    expect(shape.hasFlag(ElementFlag.Hidden)).toBe(true);
  });

  it("escapes names and labels with the node name", () => {
    const shape = new TestShape();
    shape.setProperty("name", "a <b>");
    expect(shape.getProperty("name")).toBe("a &lt;b&gt;");
    expect(shape.getLabel()).toBe("a &lt;b&gt;");
    expect(new TestShape().getLabel()).toBe("testshape");
  });

  it("stores and restores only changed block and item properties, in the old order", () => {
    const shape = new TestShape();
    shape.__id = "abcdef";
    shape.setProperties(["clk", "name", "plkt", "vis"], [true, "N", 8, false]);
    expect(Node.serialize(shape)).toBe(
      '{"@":"testshape","@id":"abcdef","clk":true,"vis":false,"name":"N","plkt":8}',
    );
    const copy = Node.deserialize(Node.serialize(shape)) as TestShape;
    expect(copy.getProperties(["clk", "name", "plkt", "vis", "lkt"])).toEqual([
      true,
      "N",
      8,
      false,
      null,
    ]);
  });

  it("only lets items into layers, pages and other items", () => {
    const shape = new TestShape();
    expect(shape.validateInsertion(new TestGroup())).toBe(true);
    expect(() => new MapLike().appendChild(shape)).toThrow("Child insertion validation failed.");
    expect(
      box(TestShape.at(0, 0, 10, 20).getCenter() ? centerBox(TestShape.at(0, 0, 10, 20)) : null),
    ).toEqual([5, 10, 0, 0]);
  });
});

class MapLike extends Container(Node) {
  static {
    registerNodeClass(this, "testmaplike", "GTestMapLike");
  }
}

function centerBox(item: Item): Rect {
  const c = item.getCenter() as Point;
  return new Rect(c.getX(), c.getY(), 0, 0);
}

describe("constraints (GElement.Anchor)", () => {
  function anchored(type: number, vertical = false) {
    const frame = new TestFrame();
    const shape = TestShape.at(10, 10, 20, 20);
    frame.appendChild(shape);
    shape.setProperty(vertical ? "vacr" : "hacr", type);
    return { frame, shape };
  }

  it("records the boxes and distances when the anchor is set", () => {
    const { shape } = anchored(Anchor.AnchorType.Stretch);
    expect(shape.getProperties(["hdl", "hdr", "hcf"])).toEqual([10, -70, null]);
    expect(box(shape.getProperty("habox") as Rect)).toEqual([0, 0, 100, 100]);
    expect(box(shape.getProperty("hsbox") as Rect)).toEqual([10, 10, 20, 20]);
    const middle = anchored(Anchor.AnchorType.Middle, true).shape;
    expect(middle.getProperties(["vdt", "vdb", "vcf"])).toEqual([null, null, 0.2]);
  });

  it("saves boxes and transforms as arrays and restores them", () => {
    const { shape } = anchored(Anchor.AnchorType.Start);
    shape.__id = "aaaaaa";
    const json = Node.serialize(shape) as string;
    expect(json).toContain('"hacr":1,"habox":[0,0,100,100],"hsbox":[10,10,20,20],"hdl":10');
    const restored = Node.deserialize(json) as TestShape;
    expect(restored.getProperty("habox")).toBeInstanceOf(Rect);
    expect(restored.getProperty("hdl")).toBe(10);
  });

  it("keeps the distances when the frame is resized", () => {
    const stretch = (type: number, vertical = false) => {
      const { frame, shape } = anchored(type, vertical);
      frame.setProperty(
        "trf",
        vertical ? new Matrix(1, 0, 0, 2, 0, 0) : new Matrix(2, 0, 0, 1, 0, 0),
      );
      return box(shape.getGeometryBBox());
    };
    expect(stretch(Anchor.AnchorType.Start)).toEqual([10, 10, 20, 20]);
    expect(stretch(Anchor.AnchorType.End)).toEqual([110, 10, 20, 20]);
    expect(stretch(Anchor.AnchorType.Stretch)).toEqual([10, 10, 120, 20]);
    expect(stretch(Anchor.AnchorType.Middle)).toEqual([30, 10, 20, 20]);
    expect(stretch(Anchor.AnchorType.End, true)).toEqual([10, 110, 20, 20]);
    expect(stretch(Anchor.AnchorType.Stretch, true)).toEqual([10, 10, 20, 120]);
    expect(stretch(Anchor.AnchorType.Middle, true)).toEqual([10, 30, 20, 20]);
  });

  it("measures again when the user moves the element", () => {
    const { shape } = anchored(Anchor.AnchorType.Start);
    shape.setProperty("trf", new Matrix(20, 0, 0, 20, 40, 10));
    expect(shape.getProperty("hdl")).toBe(40);
  });

  it("drops the constraint data when moved to another parent", () => {
    const { frame, shape } = anchored(Anchor.AnchorType.Start);
    frame.removeChild(shape);
    new TestFrame().appendChild(shape);
    expect(shape.getProperties(["hacr", "hdl"])).toEqual([null, null]);
  });
});
