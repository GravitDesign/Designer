import { describe, expect, it, vi } from "vitest";
import type { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import { PaintContext } from "../paint/paint-context.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import { PropertySet } from "../style/stylable-sets.ts";
import { Anchor } from "./element-anchor.ts";
import { ElementChange } from "./element-change.ts";
import { Ellipse } from "./ellipse.ts";
import { Group } from "./group.ts";
import { Layer } from "./layer.ts";
import { Node } from "./node.ts";
import { Rectangle } from "./rectangle.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function group(): Group {
  const g = new Group();
  g.appendChild(rect(0, 0, 100, 50));
  const e = new Ellipse();
  e.setProperty("trf", new Transform(20, 0, 0, 20, 150, 60));
  g.appendChild(e);
  return g;
}

describe("GGroup", () => {
  it("has a style and effects, but no fills or borders", () => {
    const g = new Group();
    expect(Node.getName(g)).toBe("group");
    expect(g.getStylePropertySets()).toEqual([PropertySet.Style, PropertySet.Effects]);
    expect(g.getPaintLayers?.()).toBeFalsy();
  });

  it("is the box of its children and moves them along", () => {
    const g = group();
    expect(box(g.getGeometryBBox())).toEqual([0, 0, 170, 80]);
    g.transform(new Transform(1, 0, 0, 1, 10, 5));
    expect(box(g.getGeometryBBox())).toEqual([10, 5, 170, 80]);
    expect(box((g.getFirstChild() as Rectangle).getGeometryBBox())).toEqual([10, 5, 100, 50]);
    expect(Transform.serialize(g.getTransform() as Transform)).toEqual([1, 0, 0, 1, 10, 5]);
    expect(g.getAngle()).toBe(-0);
  });

  it("gets a frame and default constraints for its children", () => {
    const g = group();
    g.setFrame(true);
    expect(box(g.getProperty("frm") as Rect)).toEqual([0, 0, 170, 80]);
    const child = g.getFirstChild() as Rectangle;
    expect(child.getProperty("hacr")).toBe(Anchor.AnchorType.Start);
    expect(child.getProperty("vacr")).toBe(Anchor.AnchorType.Start);
    // With a frame the boxes are the frame's.
    g.appendChild(rect(500, 500, 10, 10));
    expect(box(g.getGeometryBBox())).toEqual([0, 0, 170, 80]);
    g.setFrame(false);
    expect(g.getProperty("frm")).toBeNull();
    expect(child.getProperty("hacr")).toBeNull();
  });

  it("frames itself when a child asks for anchoring", () => {
    const g = group();
    g._handleChange(ElementChange.PrepareChildAnchoring);
    expect(g.getProperty("frm")).not.toBeNull();
  });

  it("saves trf and frm as arrays", () => {
    const g = group();
    g.transform(new Transform(2, 0, 0, 2, 0, 0));
    g.setFrame(true);
    const blob = JSON.parse(Node.serialize(g) as string) as Record<string, unknown>;
    expect(blob["frm"]).toEqual([0, 0, 340, 160]);
    expect(blob["trf"]).toBeUndefined();
    const back = Node.deserialize(JSON.stringify(blob)) as Group;
    expect(box(back.getProperty("frm") as Rect)).toEqual([0, 0, 340, 160]);
    expect(back.getChildren()).toHaveLength(2);
  });

  describe("with a masking child (BUG-011)", () => {
    function paintPath(container: Group | Layer): string {
      const context = new PaintContext();
      const configuration = new ScenePaintConfiguration();
      configuration.ignoreEffects = true;
      context.configuration = configuration;
      context.canvas = { getScale: () => 1 } as unknown as PaintCanvas;
      let path = "";
      vi.spyOn(container, "_paintStyleSeparate").mockImplementation(() => {
        path = "separate";
      });
      vi.spyOn(container, "_paintStyleFillLayer").mockImplementation(() => {
        path = "shared";
      });
      container._paintStyle(context as never, container.getPaintBBox() as Rect);
      return path;
    }

    for (const blend of ["m", "!m"]) {
      it(`paints a plain group into its own canvas when a child has blend ${blend}`, () => {
        const g = group();
        expect(paintPath(g)).toBe("shared");
        const mask = new Ellipse();
        mask.setProperty("trf", new Transform(30, 0, 0, 30, 50, 25));
        mask.setProperty("_sbl", blend);
        g.appendChild(mask);
        expect(paintPath(g)).toBe("separate");
      });
    }

    it("paints a layer into its own canvas when a child masks", () => {
      const layer = new Layer();
      layer.appendChild(rect(0, 0, 100, 50));
      expect(paintPath(layer)).toBe("shared");
      const mask = rect(10, 10, 20, 20);
      mask.setProperty("_sbl", "m");
      layer.appendChild(mask);
      expect(paintPath(layer)).toBe("separate");
    });

    it("leaves a mask in a nested group to that group", () => {
      const outer = new Group();
      const inner = group();
      const mask = rect(10, 10, 20, 20);
      mask.setProperty("_sbl", "m");
      inner.appendChild(mask);
      outer.appendChild(inner);
      expect(paintPath(outer)).toBe("shared");
      expect(paintPath(inner)).toBe("separate");
    });
  });
});
