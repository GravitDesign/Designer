import { describe, expect, it } from "vitest";
import { getTypeId } from "../core/object.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexOffsetter } from "./vertex-offsetter.ts";

const square = (x: number, y: number, w: number): number[] => [
  1,
  x,
  y,
  2,
  x + w,
  y,
  2,
  x + w,
  y + w,
  2,
  x,
  y + w,
  5,
  0,
  0,
];

const offset = (
  data: number[],
  ...args: [offset: number, inset: boolean, outset: boolean, tolerance?: number, cap?: string]
): number[] =>
  VertexContainer.serialize(new VertexOffsetter(VertexContainer.deserialize(data), ...args));

describe("VertexOffsetter", () => {
  it("insets and outsets a square, keeping sharp line joins", () => {
    expect(offset(square(0, 0, 100), 10, true, false)).toEqual([
      1, 10, 10, 2, 90, 10, 2, 90, 90, 2, 10, 90, 2, 10, 10,
    ]);
    expect(offset(square(0, 0, 100), 10, false, true)).toEqual([
      1, -10, -10, 2, 110, -10, 2, 110, 110, 2, -10, 110, 2, -10, -10,
    ]);
    // The sign of the offset is ignored.
    expect(offset(square(0, 0, 100), -10, true, false)).toEqual(
      offset(square(0, 0, 100), 10, true, false),
    );
  });

  it("goes on to the next sub-path when one collapses under the inset", () => {
    const compound = [...square(0, 0, 4), ...square(10, 0, 100)];
    expect(offset(compound, 5, true, false)).toEqual([
      1, 15, 5, 2, 105, 5, 2, 105, 95, 2, 15, 95, 2, 15, 5,
    ]);
  });

  it("outlines an open line with butt and square caps", () => {
    const line = [1, 0, 0, 2, 100, 0];
    expect(offset(line, 10, true, true, 0, "butt")).toEqual([
      1, 0, 10, 2, 0, -10, 2, 100, -10, 2, 100, 10, 2, 0, 10,
    ]);
    expect(offset(line, 10, true, true, 0, "square")).toEqual([
      1, 0, 10, 2, -10, 10, 2, -10, -10, 2, 0, -10, 2, 100, -10, 2, 110, -10, 2, 110, 10, 2, 100,
      10, 2, 0, 10,
    ]);
  });

  it("gives an open line round caps made of cubic curves", () => {
    const out = offset([1, 0, 0, 2, 100, 0], 10, true, true, 0, "round");
    const commands = out.filter((_, i) => i % 3 == 0);
    expect(commands[0]).toBe(Vertex.Command.Move);
    expect(commands).toContain(Vertex.Command.Curve2);
    // The caps reach 10 beyond the ends.
    const xs = out.filter((_, i) => i % 3 == 1);
    expect(Math.min(...xs)).toBe(-10);
    expect(Math.max(...xs)).toBe(110);
  });

  it("bends the end cap inward when no cap is given (old quirk)", () => {
    const out = offset([1, 0, 0, 2, 100, 0], 10, true, true);
    const xs = out.filter((_, i) => i % 3 == 1);
    expect(Math.min(...xs)).toBe(-10);
    // The end cap's arc gets the reversed bulge and bulges back to x = 90.
    expect(Math.max(...xs)).toBe(100);
    expect(xs).toContain(90);
  });

  it("rounds the output to the tolerance's decimal places", () => {
    const line = [1, 0, 0, 2, 100, 0];
    expect(new VertexOffsetter(VertexContainer.deserialize(line), 1, true, true)._tolRange).toBe(
      100,
    );
    expect(
      new VertexOffsetter(VertexContainer.deserialize(line), 1, true, true, 0.003)._tolRange,
    ).toBe(1000);
    expect(new VertexOffsetter(VertexContainer.deserialize(line), 1, true, true, 3)._tolRange).toBe(
      1,
    );
    const out = offset([1, 0, 0, 2, 100, 0], 10 / 3, true, true, 3, "butt");
    expect(out).toEqual([1, 0, 3, 2, 0, -3, 2, 100, -3, 2, 100, 3, 2, 0, 3]);
  });

  it("only rewinds to 0", () => {
    const source = VertexContainer.deserialize(square(0, 0, 10));
    const offsetter = new VertexOffsetter(source, 1, true, false);
    expect(offsetter.rewindVertices(1)).toBe(false);
    expect(offsetter.rewindVertices(0)).toBe(true);
    expect(offsetter.hasVertexForRead()).toBe(true);
    expect(offsetter.toString()).toBe("[Object GVertexOffsetter]");
  });

  it("keeps the old type ids", () => {
    expect(getTypeId(VertexOffsetter)).toBe(110);
    expect(getTypeId(VertexOffsetter.PolyOffsetSegment)).toBe(111);
  });
});
