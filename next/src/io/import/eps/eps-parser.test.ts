import { describe, expect, it } from "vitest";
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { Group } from "../../../engine/scene/group.ts";
import { EPSParser } from "./eps-parser.ts";

function parser(errors: string[] = []) {
  const calls: unknown[][] = [];
  const p = new EPSParser(
    new Uint8Array(0),
    (...args) => calls.push(args),
    new FontManager(),
    (m) => errors.push(m),
  );
  return { p, calls, errors };
}

const segment = (type: string, x: number, y: number) => ({ type, coord: { x, y } });

describe("EPSParser", () => {
  it("turns worker colors into Gravit colors", () => {
    const { p } = parser();
    const rgb = p.getGColor({ type: "rgb", value: [255, 0, 0] }) as RGBColor;
    expect(rgb).toBeInstanceOf(RGBColor);
    expect(rgb.getValue()).toEqual([255, 0, 0]);
    const cmyk = p.getGColor({ type: "cmyk", value: [255, 0, 0, 51] }) as CMYKColor;
    expect(cmyk).toBeInstanceOf(CMYKColor);
    expect(cmyk.getValue()).toEqual([1, 0, 0, 0.2]);
    expect(p.getGColor(null)).toBeInstanceOf(RGBColor);
    // A gradient needs a node to size it.
    expect(p.getGColor({ type: "linear", value: [0, 0, 1, 1], stops: [] })).toBeNull();
  });

  it("builds paths from the worker's segments and appends them", () => {
    const { p } = parser();
    const path = [
      [
        segment("moveto", 0, 0),
        segment("lineto", 10, 0),
        segment("lineto", 10, 10),
        segment("closepath", 0, 0),
      ],
    ];
    expect(p.fill(path as never, { type: "rgb", value: [0, 0, 255] }, [], false)).toBe(true);
    const node = p.ggroup.getFirstChild() as unknown as {
      getGeometryBBox(): { getWidth(): number; getHeight(): number };
    };
    expect(node).not.toBeNull();
    expect(node.getGeometryBBox().getWidth()).toBe(10);
    expect(node.getGeometryBBox().getHeight()).toBe(10);
  });

  it("takes a fill without path and clip as the page background", () => {
    const { p } = parser();
    expect(p.fill([], { type: "rgb", value: [1, 2, 3] }, [], false)).toBe(true);
    expect(p.ggroup.getFirstChild()).toBeNull();
    expect((p.background as RGBColor).getValue()).toEqual([1, 2, 3]);
  });

  it("hands over the group once and reports each error code once", () => {
    const { p, calls, errors } = parser();
    p.error("02");
    p.error("02");
    p.error("01");
    expect(errors).toEqual([]);
    p.doneCall();
    p.doneCall();
    expect(calls).toHaveLength(1);
    expect((calls[0] as unknown[])[0]).toBe(0);
    expect((calls[0] as unknown[])[1]).toBeInstanceOf(Group);
    expect(errors).toHaveLength(2);
    expect(p.ready()).toBe(true);
  });

  it("throws for text without a font name, as the old page side did", () => {
    const { p } = parser();
    expect(() =>
      p.show("x", null, 10, { type: "rgb", value: [0, 0, 0] }, { x: 0, y: 0 }, 0, 0, 0, 0, 0),
    ).toThrow(TypeError);
  });
});
