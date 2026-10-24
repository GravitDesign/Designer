import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { Node } from "./node.ts";
import { Rectangle } from "./rectangle.ts";
import { Slice } from "./slice.ts";

describe("GSlice", () => {
  it("is a 100 x 100 box at the origin that trims", () => {
    const slice = new Slice();
    expect(Node.getName(slice)).toBe("slice");
    const box = slice.getGeometryBBox();
    expect([box?.getX(), box?.getY(), box?.getWidth(), box?.getHeight()]).toEqual([0, 0, 100, 100]);
    expect(slice.getProperty("trm")).toBe(true);
    expect(slice.getPaintBBox()?.getWidth()).toBe(100);
  });

  it("saves its box and background", () => {
    const slice = new Slice();
    slice.setProperties(["x", "w", "trm", "cls"], [5, 70, false, new RGBColor([10, 20, 30])]);
    const blob = JSON.parse(Node.serialize(slice) as string) as Record<string, unknown>;
    expect([blob["x"], blob["w"], blob["trm"], blob["cls"], blob["h"]]).toEqual([
      5,
      70,
      false,
      "C#[10,20,30]",
      undefined,
    ]);
    const back = Node.deserialize(JSON.stringify(blob)) as Slice;
    expect(back.getProperty("cls")).toBeInstanceOf(RGBColor);
    expect(back.getGeometryBBox()?.getX()).toBe(5);
  });

  it("goes only into pages and layers", () => {
    expect(new Slice().validateInsertion(new Rectangle())).toBe(false);
  });

  it("refuses to render outside a scene", () => {
    expect(() => new Slice()._paintToBitmap({} as never)).toThrow("Not part of a scene.");
  });
});
