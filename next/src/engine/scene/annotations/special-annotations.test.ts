import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../color/rgb-color.ts";
import { GDate } from "../../core/date.ts";
import { getTypeId } from "../../core/object.ts";
import { Point } from "../../math/point.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import { FillPaintLayer } from "../../style/fill-paint-layer.ts";
import { Text } from "../../text/text.ts";
import { Linkable } from "../element-linkable.ts";
import { Reference } from "../node-identity.ts";
import { Node } from "../node.ts";
import { Actionable } from "./actionable.ts";
import { ActionItem } from "./action-item.ts";
import { Annotable } from "./annotable.ts";
import { Annotation } from "./annotation.ts";
import { CollabText } from "./collab-text.ts";
import { CollaborativeTextAnnotation } from "./collaborative-text-annotation.ts";
import { CommentAnnotation } from "./comment-annotation.ts";
import { EmptyAnnotation } from "./empty-annotation.ts";
import { TextAnnotation } from "./text-annotation.ts";

const NOW = 1_700_000_000_000;

function box(rect: Rect | null) {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function blobOf(node: Node): Record<string, unknown> {
  return JSON.parse(Node.serialize(node) as string) as Record<string, unknown>;
}

class FixedAction extends ActionItem {
  constructor(private readonly size: number) {
    super();
  }

  override getSourceBBox(): Rect {
    return new Rect(0, 0, this.size, this.size);
  }
}

beforeEach(() => {
  vi.spyOn(GDate, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GCommentAnnotation", () => {
  it("gets the bubble icon and its size", () => {
    const pin = new CommentAnnotation();
    expect(pin.isEmptyTextAllowed()).toBe(false);
    expect(pin.hitTest(new Point(0, 0))).toBeNull();
    pin.initSizeAndPosition();
    expect(Transform.serialize(pin.getProperty("trf") as Transform)).toEqual([
      2.6666666666666665, 0, 0, 2.6666666666666665, -5.333333333333333, -5.333333333333333,
    ]);
    pin.initDefaultForLimitedRestore();
    expect(pin.getAnchorPoints().getChildren().length).toBe(8);
    const lines = pin.getFirstChild() as Node;
    expect(Node.getName(lines)).toBe("path");
    expect(blobOf(pin)["closed"]).toBe(true);
    // Unfilled, the inside isn't hit; filled it is (the child path is never tested).
    expect(pin.hitTest(new Point(10, 10))).toBeNull();
    pin.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([0, 0, 0])));
    expect(pin.hitTest(new Point(10, 10))?.map((hit) => hit.element)).toEqual([pin]);
    expect(pin.hitTest(new Point(-100, 10))).toBeNull();
    expect(pin.hitTest(new Point(10, 10), null, () => false)).toBeNull();
  });

  it("throws on a second sizing, as the old GTransform.invert call did", () => {
    const pin = new CommentAnnotation();
    pin.initSizeAndPosition();
    expect(() => pin.initSizeAndPosition()).toThrow(TypeError);
    const singular = new CommentAnnotation();
    singular.setProperty("trf", new Transform(1, 0, 0, 0, 0, 0));
    singular.initSizeAndPosition();
    expect(Transform.serialize(singular.getProperty("trf") as Transform)).toEqual([
      1, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("GEmptyAnnotation", () => {
  it("restores none of its meta properties (old slip)", () => {
    const node = Node.deserialize(
      JSON.stringify({ "@": "ann", text: "T", uid: "u" }),
    ) as EmptyAnnotation;
    expect(node.getProperties(["text", "uid"])).toEqual([null, null]);
    expect(node.hasMixin(Reference)).toBe(true);
  });

  it("is always visible and throws when vis changes", () => {
    const node = new EmptyAnnotation();
    expect(() => node.setProperty("vis", false)).toThrow(TypeError);
    expect(node.getProperty("vis")).toBe(false);
    expect(node.hasFlag(Annotation.Flag["Hidden"] as number)).toBe(false);
    expect(node.isVisible()).toBe(true);
    node.setFlag(Annotation.Flag["Hidden"] as number);
    expect(() => node.setProperty("vis", true)).toThrow(TypeError);
    expect(node.hasFlag(Annotation.Flag["Hidden"] as number)).toBe(false);
  });
});

describe("GTextAnnotation", () => {
  it("starts as black placeholder text and is stamped while built", () => {
    const node = new TextAnnotation();
    expect(node instanceof Text).toBe(true);
    expect(node.isEmptyTextAllowed()).toBe(false);
    const blob = blobOf(node);
    expect(blob["mtime"]).toBe(NOW);
    expect(blob["_fc"]).toBe("C#[0,0,0]");
    expect(typeof blob["ct"]).toBe("string");
  });
});

describe("GCollaborativeTextAnnotation", () => {
  it("has a fixed icon and locks and is never painted", () => {
    const node = new CollaborativeTextAnnotation();
    node.setProperties(["img", "plkt"], ["x.png", 0]);
    expect(node.getProperties(["img", "plkt"])).toEqual([
      "assets/img/annotation/collaborative-text-annotation.svg",
      318,
    ]);
    expect(node.isPaintable()).toBe(false);
    expect(node.hasMixin(Linkable)).toBe(true);
    expect(node.getAnnotableReferences()).toEqual([]);
    const blob = blobOf(node);
    expect([blob["img"], blob["plkt"]]).toEqual([
      "assets/img/annotation/collaborative-text-annotation.svg",
      318,
    ]);
    const restored = Node.deserialize(
      JSON.stringify({ "@": "ancotext", annotablerefs: ["r1"], targetGuid: "t" }),
    ) as CollaborativeTextAnnotation;
    expect(restored._getRestoredAnnotableReferences()).toEqual(["r1"]);
    expect(restored.getProperty("targetGuid")).toBe("t");
  });
});

describe("GActionable", () => {
  it("lays the buttons out right to left above the top right corner", () => {
    const node = new CollabText();
    node.setProperty("trf", new Transform(1, 0, 0, 1, 100, 100));
    node.addAction(new FixedAction(30));
    node.addAction(new FixedAction(20));
    // The geometry box is (100, 100)..(200, 200); the corner is (200, 100).
    // The built-in button is 24 wide, the others follow 5 apart.
    const actionAt = (x: number, y: number) =>
      node.hitActionTest(new Point(x, y), new Transform())?.data.action;
    expect(actionAt(190, 90)).toBe(node.getActions()[0]);
    expect(actionAt(150, 80)).toBe(node.getActions()[1]);
    expect(actionAt(120, 90)).toBe(node.getActions()[2]);
    expect(actionAt(138, 90)).toBeUndefined();
    // The row box doesn't shift the second button and moves the third by
    // the second's width plus 5 (old slip): 35 + 20 wide.
    expect(box(node.getActionsBBox())).toEqual([145, 70, 55, 30]);
    expect(getTypeId(Actionable)).toBe(215);
    expect(getTypeId(Annotable)).toBe(217);
  });
});

describe("GCollabText", () => {
  it("is an image with the inline-text button above it", () => {
    const node = new CollabText();
    node.setProperty("trf", new Transform(50, 0, 0, 30, 100, 100));
    expect(Node.getName(node)).toBe("collabtext");
    // A 100 by 100 placeholder without an image.
    expect(box(node.getGeometryBBox())).toEqual([100, 100, 5000, 3000]);
    expect(box(node.getActionsBBox())).toEqual([5076, 76, 24, 24]);
    expect(box(node.getPaintBBox())).toEqual([100, 76, 5000, 3024]);
    expect(node.getNodeNameTranslated()).toBe("Collaborative Text");
    expect(blobOf(node)["collab"]).toBeUndefined();
  });

  it("switches into a text and back, keeping its type", () => {
    const node = new CollabText();
    const trf = new Transform(50, 0, 0, 30, 100, 100);
    node.setProperty("trf", trf);
    CollabText.setModeText(node);
    expect(CollabText.isTextMode(node)).toBe(true);
    expect(node instanceof Text).toBe(true);
    expect(Node.getName(node)).toBe("collabtext");
    expect(node.getProperties(["trf", "imgTrf", "afs"])).toEqual([null, trf, true]);
    CollabText.setModeImage(node);
    expect(node instanceof Text).toBe(false);
    expect(node.getProperty("trf")).toBe(trf);
  });
});
