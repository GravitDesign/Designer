import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Group } from "../../engine/scene/group.ts";
import { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { config } from "../config.ts";
import { TouchConfig } from "../../editor/touch/touch-config.ts";
import { FileTypes } from "./file-types.ts";
import { documentStatusName, DocumentStatus } from "./document-status.ts";
import { editDistance, pickFont } from "./import-font-provider.ts";
import { optimizeImport, optimizerStats } from "./import-optimizer.ts";

describe("file types", () => {
  it("open, place and drop accept only eight types, in the old order", () => {
    expect(FileTypes.getFileTypesArray().map((type) => type.ext)).toEqual([
      "gvdesign",
      "png",
      "heic",
      "jpg",
      "jpeg",
      "svg",
      "pdf",
      "eps",
    ]);
  });

  it("the config keeps the local constants", () => {
    expect(config.FILE_EXTENSIONS).toEqual(["gvdesign"]);
    expect(config.HAS_ANNOTATIONS).toBe(true);
    expect(config.USE_EXTENSION_IN_FILENAME).toBe(false);
    expect(config.MIN_TOUCH_MOVE_DISTANCE).toBe(TouchConfig.MIN_TOUCH_MOVE_DISTANCE);
    expect(config.LONG_PRESS_TIME_OUT).toBe(TouchConfig.LONG_PRESS_TIME_OUT);
    expect(config.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE).toBe(
      TouchConfig.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE,
    );
  });

  it("names statuses", () => {
    expect(documentStatusName(DocumentStatus.LoadFailed)).toBe("LoadFailed");
    expect(documentStatusName(99)).toBe("99");
  });
});

describe("import font matching", () => {
  it("measures edit distances", () => {
    expect(editDistance("Arial", "Arial")).toBe(0);
    expect(editDistance("Arial", "Arail")).toBe(2);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it("keeps the old lengths when the first name is the longer one", () => {
    // The old code swapped the strings but not their lengths, so this is
    // not the Levenshtein distance of 3.
    expect(editDistance("bcd", "abcd")).toBe(1);
    expect(editDistance("abcd", "bcd")).toBe(3);
  });

  it("wraps distances above 127 in the Int8Array row", () => {
    expect(editDistance("", "x".repeat(200))).toBe(200);
    expect(editDistance("a", "b".repeat(200))).toBe(-56);
  });

  it("picks the closest family and the font of the asked style", () => {
    const faces = [
      { family: "Roboto", fonts: [{ weight: 400, style: "N" as never }] },
      {
        family: "Open Sans",
        fonts: [
          { weight: 400, style: "N" as never },
          { weight: 700, style: "I" as never },
        ],
      },
    ];
    const query = { fontFamily: "OpenSans", fontStyle: "I", fontWeight: 700 };
    expect(pickFont(query, faces, () => "Default")).toEqual({
      family: "Open Sans",
      weight: 700,
      style: "I",
    });
    const plain = { fontFamily: "Open Sans", fontStyle: "N", fontWeight: 300 };
    expect(pickFont(plain, faces, () => "Default")).toEqual({
      family: "Open Sans",
      weight: 400,
      style: "N",
    });
  });
});

describe("import optimiser", () => {
  function clipPath(children: number): Path {
    const path = new Path();
    path.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([1, 2, 3])));
    for (let i = 0; i < children; i++) path.appendChild(new Rectangle());
    return path;
  }

  it("merges a following equal path that has children", () => {
    const group = new Group();
    group.appendChild(clipPath(1));
    group.appendChild(clipPath(1));
    const before = optimizerStats.removed;
    optimizeImport(group);
    expect(group.getChildren()).toHaveLength(1);
    expect((group.getFirstChild() as Path).getChildren()).toHaveLength(2);
    expect(optimizerStats.removed).toBe(before + 1);
  });

  it("keeps paths that differ", () => {
    const group = new Group();
    group.appendChild(clipPath(1));
    const other = clipPath(1);
    other.setProperty("closed", true);
    group.appendChild(other);
    optimizeImport(group);
    expect(group.getChildren()).toHaveLength(2);
  });

  it("moves every child of the merged path, in order (BUG-101)", () => {
    const group = new Group();
    const first = clipPath(1);
    const second = clipPath(3);
    const moved = second.getChildren();
    group.appendChild(first);
    group.appendChild(second);
    optimizeImport(group);
    expect(group.getChildren()).toEqual([first]);
    expect(first.getChildren().slice(1)).toEqual(moved);
    expect(first.getChildren()).toHaveLength(4);
  });
});
