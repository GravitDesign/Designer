import { describe, expect, it } from "vitest";
import { Transform } from "../math/transform.ts";
import { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { Node } from "./node.ts";
import type { AnchorPoint } from "./path-base.ts";
import { Polygon } from "./polygon.ts";

describe("GPolygon", () => {
  it("has no points until a property changes", () => {
    const polygon = new Polygon();
    expect(Node.getName(polygon)).toBe("polygon");
    expect(polygon.getAnchorPoints().getChildren()).toHaveLength(0);
    expect(polygon.$ia).toBe(2 * Math.PI - Math.PI / 3);
    polygon.setProperty("or", 10);
    expect(polygon.getAnchorPoints().getChildren()).toHaveLength(12);
  });

  it("alternates outer and inner points with their own corners", () => {
    const star = new Polygon();
    star.setProperties(
      ["pts", "or", "ir", "ia", "oct", "ocr", "icr"],
      [5, 50, 20, Math.PI / 5, "B", 3, 1],
    );
    const list = star.getAnchorPoints().getChildren() as AnchorPoint[];
    expect(list).toHaveLength(10);
    expect([list[0]?.$x, list[0]?.$y, list[0]?.$tp, list[0]?.$cl]).toEqual([50, 0, "B", 3]);
    expect(list[1]?.$x).toBeCloseTo(20 * Math.cos(Math.PI / 5), 12);
    expect([list[1]?.$tp, list[1]?.$cr]).toEqual(["R", 1]);
    expect(star.isPlainEdges()).toBe(false);
    expect(star.getOrigHalfWidth()).toBe(50);
  });

  it("knows a regular polygon by its inner points on the edges", () => {
    const hexagon = new Polygon();
    hexagon.setProperties(
      ["pts", "or", "ir", "ia"],
      [6, 50, 50 * Math.cos(Math.PI / 6), Math.PI / 6],
    );
    expect(hexagon.isPlainEdges()).toBe(true);
    expect(hexagon.getPointsMinDistance()).toBeCloseTo(25, 9);
  });

  it("scales the corner radii, maps its center and raises the miter limit", () => {
    const star = new Polygon();
    star.setProperties(
      ["pts", "or", "ir", "ia", "ocr", "icr", "cx"],
      [5, 50, 20, Math.PI / 5, 4, 2, 3],
    );
    star.transform(new Transform(3, 0, 0, 3, 10, 0));
    expect([star.$ocr, star.$icr]).toEqual([12, 6]);
    expect(star.getCenter(true)?.getX()).toBe(19);
    expect(star.getCenter()?.getX()).toBe(3);
    const border = new BorderPaintLayer();
    border.setProperty("_bml", 1);
    expect(star.calculateMitterLimit(border)).toBeGreaterThan(1);
    border.setProperty("_bml", 50);
    expect(star.calculateMitterLimit(border)).toBe(50);
  });

  it("saves its properties and rebuilds the points on load", () => {
    const star = new Polygon();
    star.setProperties(["pts", "or", "ir"], [7, 40, 10]);
    const blob = JSON.parse(Node.serialize(star) as string) as Record<string, unknown>;
    expect([blob["pts"], blob["or"], blob["ir"], blob["oa"]]).toEqual([7, 40, 10, undefined]);
    const back = Node.deserialize(JSON.stringify(blob)) as Polygon;
    expect(back.getAnchorPoints().getChildren()).toHaveLength(14);
  });
});
