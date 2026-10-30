import { describe, expect, it, vi } from "vitest";
import { Transform } from "../math/transform.ts";
import type { NodeBlob } from "../serialize/blob.ts";
import { Node } from "./node.ts";
import { AnchorPoint, AnchorPoints } from "./path-base.ts";
import { Rectangle } from "./rectangle.ts";

function corners(rect: Rectangle): unknown[][] {
  return (rect.getAnchorPoints().getChildren() as AnchorPoint[]).map((p) => [
    p.$tp,
    p.$x,
    p.$y,
    p.$cl,
    p.$cr,
    p.$cu,
  ]);
}

function blobOf(node: Node): Record<string, unknown> {
  return JSON.parse(Node.serialize(node) as string) as Record<string, unknown>;
}

/**
 * Restores `blob` the way Node.restore does, handing the new rectangle to
 * `early` after its construction and before its blob is restored into it.
 */
function restoreWith(blob: Record<string, unknown>, early: (rect: Rectangle) => void): Rectangle {
  let result: Node | null = null;
  Node._restore(
    blob as NodeBlob,
    null,
    null,
    null,
    null,
    (restoredBlob, node, restored, progress, total, done) => {
      early(node as Rectangle);
      done(Node.restoreInstance(restoredBlob, node, restored, progress, total));
    },
    (node) => {
      result = node;
    },
  );
  return result as unknown as Rectangle;
}

/** How many points there are, without building pending ones. */
function builtPoints(rect: Rectangle): number {
  return (rect._anchorPoints as AnchorPoints).getChildren().length;
}

describe("GRectangle", () => {
  it("is the closed unit square with four round corners", () => {
    const rect = new Rectangle();
    expect(Node.getName(rect)).toBe("rectangle");
    expect(rect.$closed).toBe(true);
    expect(rect._paintSharp).toBe(true);
    expect(corners(rect)).toEqual([
      ["R", -1, -1, 0, 0, false],
      ["R", 1, -1, 0, 0, false],
      ["R", 1, 1, 0, 0, false],
      ["R", -1, 1, 0, 0, false],
    ]);
    expect(rect.getSourceBBox()?.toString()).toBe(rect._calculateSourceBBox()?.toString());
    expect(new Rectangle(0, 0, 10, 5).getSourceBBox()?.getWidth()).toBe(10);
    expect(rect.toString()).toBe("[GRectangle]");
  });

  it("with uniform corners, one changed corner sets all four", () => {
    const rect = new Rectangle();
    rect.setProperty("br_sy", 7);
    rect.setProperty("tr_ct", "B");
    expect(corners(rect).map((c) => c.slice(0, 1).concat(c.slice(3, 5)))).toEqual([
      ["B", 7, 7],
      ["B", 7, 7],
      ["B", 7, 7],
      ["B", 7, 7],
    ]);
    expect(rect.getProperty("tl_sx")).toBe(7);
  });

  it("without uniform corners keeps each corner, with equal radii where the corner is uniform", () => {
    const rect = new Rectangle();
    rect.setProperties(["uf", "tl_uf"], [false, false]);
    rect.setProperties(["tl_sx", "tl_sy", "br_sx"], [3, 9, 4]);
    expect(corners(rect).map((c) => [c[3], c[4]])).toEqual([
      [3, 9],
      [0, 0],
      [4, 4],
      [0, 0],
    ]);
  });

  it("saves uniform corners compactly and the others per corner", () => {
    const rect = new Rectangle();
    rect.setProperties(["tl_ct", "tl_sx"], ["U", 5]);
    const uniform = blobOf(rect);
    expect([uniform["uf"], uniform["ct"], uniform["sl"]]).toEqual([true, "U", 5]);
    expect(uniform["tluf"]).toBeUndefined();
    rect.setProperties(["uf", "tr_uf", "tr_sx", "tr_sy"], [false, false, 2, 8]);
    const mixed = blobOf(rect);
    expect([mixed["uf"], mixed["trct"], mixed["trsl"], mixed["truf"], mixed["blsl"]]).toEqual([
      false,
      "U",
      [2, 8],
      false,
      [5, 5],
    ]);
    const back = Node.deserialize(JSON.stringify(mixed)) as Rectangle;
    expect(corners(back)).toEqual(corners(rect));
    // A blob without `uf` gets the defaults; a non-uniform one without radii throws.
    expect(corners(Node.deserialize('{"@":"rectangle"}') as Rectangle)[0]).toEqual([
      "R",
      -1,
      -1,
      0,
      0,
      false,
    ]);
    expect(() => Node.deserialize('{"@":"rectangle","uf":false}')).toThrow(TypeError);
  });

  it("scales the corner radii with the transform", () => {
    const rect = new Rectangle();
    rect.setProperty("tl_sx", 2);
    rect.transform(new Transform(2, 0, 0, 8, 0, 0));
    expect(rect.getProperty("tr_sx")).toBe(8);
    expect(rect.getProperty("bl_sy")).toBe(8);
  });

  it("computes the miter limit and the shorter side", () => {
    const rect = new Rectangle();
    rect.setProperty("trf", new Transform(10, 0, 0, 30, 0, 0));
    expect(rect.calculateMitterLimit()).toBe(2);
    expect(rect.getPointsMinDistance()).toBe(20);
    expect(rect._requireMiterLimitApproximation()).toBe(false);
    rect.setProperty("trf", new Transform(10, 0, 0, 30, 0, 0).rotated(0.5));
    expect(rect._requireMiterLimitApproximation()).toBe(true);
  });

  it("copies corners to other rectangles", () => {
    const source = new Rectangle();
    source.setProperties(["tl_ct", "tl_sx"], ["I", 4]);
    const target = new Rectangle();
    source.transferStyledCorners(target);
    expect(corners(target)).toEqual(corners(source));
    const copy = new Rectangle();
    copy.assignFrom(source);
    expect(copy.getProperty("br_ct")).toBe("I");
  });
});

describe("GRectangle restored from a blob", () => {
  it("builds its points once, from the restored corners", () => {
    const rect = new Rectangle();
    rect.setProperties(["uf", "tl_uf"], [false, false]);
    rect.setProperties(["tl_sx", "tl_sy", "br_ct"], [3, 9, "B"]);
    const json = JSON.stringify(blobOf(rect));
    const builds = vi.spyOn(Rectangle.prototype, "_invalidatePath");
    try {
      const back = Node.deserialize(json) as Rectangle;
      expect(builds).toHaveBeenCalledTimes(1);
      expect(corners(back)).toEqual(corners(rect));
    } finally {
      builds.mockRestore();
    }
  });

  it("builds the default points when read before the blob is restored", () => {
    const rect = new Rectangle();
    rect.setProperties(["tl_ct", "tl_sx"], ["B", 5]);
    let early: unknown[][] = [];
    const back = restoreWith(blobOf(rect), (node) => {
      expect(node._pathPending).toBe(true);
      early = corners(node);
    });
    expect(early).toEqual(corners(new Rectangle()));
    expect(back._pathPending).toBe(false);
    expect(corners(back)).toEqual(corners(rect));
  });

  it("gets the vertices of one outline when its box is asked for first", () => {
    restoreWith(blobOf(new Rectangle()), (node) => {
      const plain = new Rectangle();
      expect(node.getGeometryBBox()?.toString()).toBe(plain.getGeometryBBox()?.toString());
      expect(node._vertices.getCount()).toBe(plain._vertices.getCount());
    });
  });

  it("builds the points before anything else happens to it", () => {
    restoreWith(blobOf(new Rectangle()), (node) => {
      Node.store(node);
      expect(node._pathPending).toBe(false);
      expect(builtPoints(node)).toBe(4);
    });
  });

  it("keeps points given in place of pending ones", () => {
    restoreWith(blobOf(new Rectangle()), (node) => {
      const given = new AnchorPoints();
      given.appendChild(new AnchorPoint());
      node.setAnchorPoints(given);
      expect(node.getAnchorPoints()).toBe(given);
      expect(given.getChildren()).toHaveLength(1);
    });
  });

  it("is built at once when made outside a restore", () => {
    const rect = new Rectangle();
    expect(rect._pathPending).toBe(false);
    expect(builtPoints(rect)).toBe(4);
    restoreWith(blobOf(rect), () => {
      // The restored rectangle has used up _restore's claim.
      const other = new Rectangle();
      expect(other._pathPending).toBe(false);
      expect(builtPoints(other)).toBe(4);
    });
  });
});
