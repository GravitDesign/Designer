import { describe, expect, it } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Image } from "../../engine/scene/image.ts";
import { cornerTypeIcon } from "../widgets/corner-type-select.ts";
import { cropImage, setOriginSize } from "./image-crop.ts";

describe("setOriginSize", () => {
  it("puts the image at its top left with its natural size and no image transform", () => {
    const image = new Image();
    image.setProperties(["iw", "ih"], [120, 80]);
    image.setProperties(["trf"], [new Transform(2, 0, 0, 2, 10, 20)]);
    const bbox = image.getGeometryBBox();
    setOriginSize(image);
    const expected = new Transform().translated(bbox ? bbox.getX() : 0, bbox ? bbox.getY() : 0);
    expect((image.getProperty("trf") as Transform).getMatrix()).toEqual(expected.getMatrix());
    expect((image.getProperty("itrf") as Transform).getMatrix()).toEqual(expected.getMatrix());
    expect([image.getProperty("pw"), image.getProperty("ph")]).toEqual([
      image.getWidth(),
      image.getHeight(),
    ]);
  });

  it("does nothing for other nodes", () => {
    expect(() => setOriginSize({})).not.toThrow();
    expect(() => cropImage({}, true)).not.toThrow();
  });
});

describe("cornerTypeIcon", () => {
  it("maps each corner type to its icon class", () => {
    expect(["R", "U", "B", "I", "F", "X"].map(cornerTypeIcon)).toEqual([
      "gravit-icon-corner-rounded",
      "gravit-icon-corner-inverse-rounded",
      "gravit-icon-corner-bevel",
      "gravit-icon-corner-inset",
      "gravit-icon-corner-fancy",
      null,
    ]);
  });
});
