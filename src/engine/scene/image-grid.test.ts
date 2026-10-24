import { describe, expect, it } from "vitest";
import { Vertex } from "../geometry/vertex.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { Image } from "./image.ts";
import { ImageGrid, ImageGridImages } from "./image-grid.ts";
import { Node } from "./node.ts";

function vertices(grid: ImageGrid): number[][] {
  const out: number[][] = [];
  if (!grid.rewindVertices()) return out;
  const vertex = new Vertex();
  while (grid.readVertex(vertex)) {
    out.push(
      vertex.command === Vertex.Command.Close
        ? [vertex.command]
        : [vertex.command, vertex.x, vertex.y],
    );
  }
  return out;
}

describe("GImageGrid", () => {
  it("has no grid unless constructed with an argument", () => {
    const empty = new ImageGrid();
    expect(Node.getName(empty)).toBe("imagegrid");
    expect(empty.getProperty("grid")).toBe(undefined);
    expect(empty.getProperties(["im", "mg", "off"])).toEqual([null, 0.1, null]);
    expect(vertices(empty)).toEqual([]);
    const withDefault = new ImageGrid(true);
    expect((withDefault.getProperty("grid") as unknown[]).length).toBe(3);
    // 9 cells of 5 vertices each.
    expect(vertices(withDefault).length).toBe(45);
  });

  it("lays the cells out row by row with margins, mapped to the unit square by trf", () => {
    const grid = new ImageGrid();
    grid.setProperty("grid", [
      [
        [0.5, 0.5],
        [0.5, 0.5],
      ],
      [[1, 0.5]],
    ]);
    // Width 0.1 + 0.5 + 0.1 + 0.5 + 0.1 = 1.3, height 0.1 + 0.5 + 0.1 + 0.5 + 0.1 = 1.3.
    const first = vertices(grid).slice(0, 5);
    const unit = 1 / 1.3;
    expect(first[0]?.[0]).toBe(Vertex.Command.Move);
    expect(first[0]?.[1]).toBeCloseTo(0.1 * unit, 12);
    expect(first[2]?.[1]).toBeCloseTo(0.6 * unit, 12);
    expect(first[2]?.[2]).toBeCloseTo(0.6 * unit, 12);
    expect(first[4]).toEqual([Vertex.Command.Close]);
    expect(vertices(grid).length).toBe(15);
  });

  it("puts an image into the nearest cell, saving the x offset for both coordinates", () => {
    const grid = new ImageGrid(true);
    grid.setProperty("trf", new Transform(100, 0, 0, 100, 0, 0));
    vertices(grid);
    const image = new Image();
    grid.addImage(image, new Rect(0, 0, 5, 5));
    const images = grid.getProperty("im") as Image[];
    expect(images[0]).toBe(image);
    const offsets = grid.getProperty("off") as number[];
    expect(offsets).toHaveLength(2);
    expect(offsets[0]).toBe(offsets[1]);
    expect((grid._images as ImageGridImages).getChildren()).toEqual([image]);
  });

  it("fits a dropped image with a finite itrf, two offset numbers per cell (BUG-017)", () => {
    const grid = new ImageGrid(true);
    grid.setProperty("trf", new Transform(100, 0, 0, 100, 0, 0));
    vertices(grid);
    const image = new Image();
    grid.addImage(image, new Rect(2, 3, 10, 10));
    const offsets = grid.getProperty("off") as number[];
    expect(offsets).toHaveLength(2);
    // The cells are cached; a geometry update fits the images again.
    grid._invalidateGeometryForChildUpdate();
    vertices(grid);
    const itrf = Transform.serialize(image.getProperty("itrf") as Transform);
    expect(itrf).toHaveLength(6);
    expect(itrf.every(Number.isFinite)).toBe(true);
    // A later cell pads the earlier ones with 0.
    grid.addImage(new Image(), new Rect(45, 45, 10, 10));
    const padded = grid.getProperty("off") as number[];
    expect(padded).toHaveLength(10);
    expect(padded.slice(0, 2)).toEqual(offsets);
    expect(padded.slice(2, 8)).toEqual([0, 0, 0, 0, 0, 0]);
    // The old app wrote an [x, y] pair per cell; files with it still fit.
    const old = new ImageGrid(true);
    old.setProperty("trf", new Transform(100, 0, 0, 100, 0, 0));
    const oldImage = new Image();
    old.setProperties(["im", "off"], [[oldImage], [[offsets[0], offsets[1]]]]);
    old._invalidateGeometryForChildUpdate();
    vertices(old);
    expect(Transform.serialize(oldImage.getProperty("itrf") as Transform)).toEqual(itrf);
  });

  it("saves its images as serialized nodes", () => {
    const grid = new ImageGrid(true);
    const image = new Image();
    image.setProperty("iw", 7);
    grid.setProperty("im", [image]);
    const blob = JSON.parse(Node.serialize(grid) as string) as Record<string, unknown>;
    const saved = blob["im"] as string[];
    expect(typeof saved[0]).toBe("string");
    const restored = Node.deserialize(JSON.stringify(blob)) as ImageGrid;
    const restoredImages = restored.getProperty("im") as Image[];
    expect(restoredImages[0]).toBeInstanceOf(Image);
    expect(restoredImages[0]?.getProperty("iw")).toBe(7);
  });

  it("keeps its images container in place", () => {
    const images = new ImageGridImages();
    expect(images.validateRemoval()).toBe(false);
    expect(images.validateInsertion(new ImageGrid())).toBe(true);
    expect(images.validateInsertion(new Image())).toBe(false);
  });
});
