import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId } from "../core/object.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import { PaintContext } from "../paint/paint-context.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import { Anchor } from "./element-anchor.ts";
import { Group } from "./group.ts";
import { Layer } from "./layer.ts";
import { NodeFlag } from "./node-change.ts";
import { Node } from "./node.ts";
import { Page } from "./page.ts";
import { Rectangle } from "./rectangle.ts";

function box(rect: Rect | null | false): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

describe("GLayer", () => {
  it("is the node 'layer' with the old type id and defaults", () => {
    const layer = new Layer();
    expect(Node.getName(layer)).toBe("layer");
    expect(getTypeId(layer)).toBe(163);
    expect(layer.getProperty("otl")).toBe(false);
    expect(layer.getProperty("prt")).toBe(true);
    expect((layer.getProperty("cls") as RGBColor).getValue()).toEqual([0, 168, 255]);
    expect(layer.getProperty("frm")).toBe(false);
  });

  it("goes into pages and layers only", () => {
    const layer = new Layer();
    expect(layer.validateInsertion(new Page())).toBe(true);
    expect(layer.validateInsertion(new Layer())).toBe(true);
    expect(layer.validateInsertion(new Group())).toBe(false);
  });

  it("stores its color, frame and active flag", () => {
    const layer = new Layer();
    layer.setProperties(
      ["cls", "otl", "frm"],
      [new RGBColor([255, 0, 0]), true, new Rect(1, 2, 3, 4)],
    );
    layer.setFlag(NodeFlag.Active);
    const json = Node.serialize(layer) as string;
    const blob = JSON.parse(json) as Record<string, unknown>;
    expect(blob["otl"]).toBe(true);
    expect(typeof blob["cls"]).toBe("string");
    expect(blob["frm"]).toEqual([1, 2, 3, 4]);
    expect(blob["__active"]).toBe(true);
    expect("prt" in blob).toBe(false);
    const back = Node.deserialize(json) as Layer;
    expect(back).toBeInstanceOf(Layer);
    expect(back.hasFlag(NodeFlag.Active)).toBe(true);
    expect(box(back.getProperty("frm") as Rect)).toEqual([1, 2, 3, 4]);
    expect(back.getProperty("cls")).toBeInstanceOf(RGBColor);
    expect((back.getProperty("cls") as RGBColor).getValue()).toEqual([255, 0, 0]);
  });

  it("is the box of its children, or its frame", () => {
    const layer = new Layer();
    layer.appendChild(rect(0, 0, 100, 50));
    layer.appendChild(rect(150, 40, 20, 40));
    expect(box(layer.getGeometryBBox())).toEqual([0, 0, 170, 80]);
    layer.setFrame(true);
    expect(box(layer.getProperty("frm") as Rect)).toEqual([0, 0, 170, 80]);
    const child = layer.getFirstChild() as Rectangle;
    expect(child.getProperty("hacr")).toBe(Anchor.AnchorType.Start);
    expect(child.getProperty("vacr")).toBe(Anchor.AnchorType.Start);
    layer.appendChild(rect(500, 500, 10, 10));
    expect(box(layer.getGeometryBBox())).toEqual([0, 0, 170, 80]);
    expect(box(layer.getPaintBBox())).toEqual([0, 0, 170, 80]);
    layer.setFrame(false);
    expect(layer.getProperty("frm")).toBeNull();
    expect(child.getProperty("hacr")).toBeFalsy();
    expect(box(layer.getGeometryBBox())).toEqual([0, 0, 510, 510]);
  });

  it("moves its frame and its children", () => {
    const layer = new Layer();
    const child = rect(0, 0, 100, 50);
    layer.appendChild(child);
    layer.transform(new Transform(1, 0, 0, 1, 10, 5));
    expect(box(child.getGeometryBBox())).toEqual([10, 5, 100, 50]);
    layer.setFrame(true);
    layer.transform(new Transform(1, 0, 0, 1, 10, 5));
    expect(box(layer.getProperty("frm") as Rect)).toEqual([20, 10, 100, 50]);
    expect(box(child.getGeometryBBox())).toEqual([20, 10, 100, 50]);
  });

  it("maps its frame into another space for the pre-transform box", () => {
    const layer = new Layer();
    layer.appendChild(rect(10, 20, 30, 40));
    expect(box(layer.getPreTransformRect(new Transform(2, 0, 0, 2, 0, 0)))).toEqual([
      5, 10, 15, 20,
    ]);
    layer.setFrame(true);
    expect(box(layer.getPreTransformRect(new Transform(1, 0, 0, 1, 10, 20)))).toEqual([
      0, 0, 30, 40,
    ]);
  });

  it("pushes its outline color while painting and stays out of output with prt off", () => {
    const layer = new Layer();
    layer.appendChild(rect(0, 0, 10, 10));
    const context = new PaintContext();
    const configuration = new ScenePaintConfiguration();
    context.configuration = configuration;
    // Only setMasked is used while preparing.
    context.canvas = { setMasked() {} } as unknown as PaintCanvas;
    layer.setProperty("otl", true);
    expect(layer._preparePaint(context)).toBe(true);
    expect(context.outlineColors).toEqual([layer.getProperty("cls")]);
    layer._finishPaint(context);
    expect(context.outlineColors).toEqual([]);
    configuration.paintMode = ScenePaintConfiguration.PaintMode.Outline;
    expect(layer._preparePaint(context)).toBe(true);
    expect(context.outlineColors).toEqual([]);
    layer.setProperty("prt", false);
    configuration.annotations = false;
    expect(layer._preparePaint(context)).toBe(false);
    configuration.annotations = true;
    expect(layer._preparePaint(context)).toBe(true);
  });
});
