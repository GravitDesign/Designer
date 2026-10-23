import { describe, expect, it } from "vitest";
import { Vertex } from "../geometry/vertex.ts";
import type { VertexContainer } from "../geometry/vertex-container.ts";
import { Point } from "../math/point.ts";
import {
  ParameterizedVertexProcessor,
  type AnnotationDefinition,
  type ParameterDefinition,
} from "./parameterized-vertex-processor.ts";
import type { ExpressionFunction } from "./ready-shape-expression.ts";
import fixture from "./ready-shapes.fixture.json";

/**
 * The old processor, as the reference: the same class with the old
 * `_getExprFunction`, which compiled the body with Function. Only the
 * test does that, on the catalogue and corpus expressions.
 */
class OldProcessor extends ParameterizedVertexProcessor {
  override _getExprFunction(
    expression: unknown,
    names: readonly unknown[] | null | undefined,
    min?: unknown,
    max?: unknown,
  ): ExpressionFunction | null {
    let func: ExpressionFunction | null = null;
    if (expression && names && names.length && this.isSecure(expression, names)) {
      const params = names.slice();
      let a = "";
      let b = "";
      let c = "";
      let d = "";
      if (null !== min && "number" == typeof min) {
        a = "Math.max(" + min + ", ( ";
        b = " ))";
      }
      if (null !== max && "number" == typeof max) {
        c = "Math.min(" + max + ", ( ";
        d = " ))";
      }
      params.push("return " + a + c + this._prepareExpression(expression as string) + d + b + ";");
      // The old code path, as the test oracle.
      func = Function(...(params as string[])) as ExpressionFunction;
    }
    return func;
  }
}

interface CatalogueShape {
  name: string;
  annotations?: { name: string; annotList: (AnnotationDefinition & { x0: number; y0: number })[] };
  parameters?: ParameterDefinition[];
  vertices: unknown[];
}

const catalogue = (fixture as { catalogue: CatalogueShape[] }).catalogue;
const corpus = (
  fixture as { corpus: { file: string; ssn: string; pvp: string; apv: string | null }[] }
).corpus;

/** The vertices as a flat list (command, x, y, ...), or null. */
function flatten(container: VertexContainer | null): unknown[] | null {
  if (!container) return null;
  const out: unknown[] = [];
  const vertex = new Vertex();
  container.rewindVertices(0);
  while (container.readVertex(vertex)) out.push(vertex.command, vertex.x, vertex.y);
  return out;
}

/** Object.is on every element, with a message naming the first difference. */
function expectSameNumbers(
  actual: unknown[] | null,
  expected: unknown[] | null,
  label: string,
): void {
  if (actual === null || expected === null) {
    expect(actual, label).toBe(expected);
    return;
  }
  expect(actual.length, label).toBe(expected.length);
  for (let i = 0; i < expected.length; ++i) {
    if (!Object.is(actual[i], expected[i])) {
      expect.fail(
        `${label}: element ${i} is ${String(actual[i])}, expected ${String(expected[i])}`,
      );
    }
  }
}

/** Annotation positions to try: the initial ones, then moved around (also past the clamps). */
function positionSets(initial: Point[]): Point[][] {
  const sets = [initial];
  const offsets = [-3, -1.1, -0.999, -0.5, -0.25, -0.1, 0, 0.1, 0.33, 0.5, 0.75, 0.999, 1.5, 7];
  for (const dx of offsets) {
    for (const dy of [-0.7, 0, 0.4]) {
      sets.push(initial.map((p, i) => new Point(p.getX() + dx * (i + 1), p.getY() + dy - dx / 3)));
    }
  }
  return sets;
}

describe("ParameterizedVertexProcessor against the old Function-based compiler", () => {
  it.each(catalogue.map((shape) => [shape.name, shape] as const))(
    "catalogue shape %s gives the same vertices and handle positions",
    (_name, shape) => {
      const args = [
        shape.annotations ? shape.annotations.name : null,
        shape.annotations ? shape.annotations.annotList : null,
        shape.parameters,
        shape.vertices,
      ] as const;
      const processor = new ParameterizedVertexProcessor(...args);
      const old = new OldProcessor(...args);
      expect(ParameterizedVertexProcessor.serialize(processor)).toBe(
        ParameterizedVertexProcessor.serialize(old),
      );
      const initial = (shape.annotations?.annotList ?? []).map((a) => new Point(a.x0, a.y0));
      for (const positions of positionSets(initial)) {
        const expected = flatten(old.getVertices(initial.length ? positions : null));
        const actual = flatten(processor.getVertices(initial.length ? positions : null));
        expectSameNumbers(actual, expected, shape.name);
        for (let i = 0; i < positions.length; ++i) {
          const a = processor.getAnnotationPosition(i, positions[i] as Point);
          const b = old.getAnnotationPosition(i, positions[i] as Point);
          expectSameNumbers(a && [a.getX(), a.getY()], b && [b.getX(), b.getY()], shape.name);
        }
      }
    },
  );

  it.each(corpus.map((entry) => [entry.file + " " + entry.ssn, entry] as const))(
    "corpus shape %s gives the same vertices",
    (_label, entry) => {
      const processor = ParameterizedVertexProcessor.deserialize(
        entry.pvp,
      ) as ParameterizedVertexProcessor;
      // deserialize builds the base class; the reference is built from the same data.
      const data = JSON.parse(entry.pvp) as unknown[];
      const reference = new OldProcessor(
        data[0],
        (data[2] ?? null) as AnnotationDefinition[] | null,
        (data[3] ?? null) as ParameterDefinition[] | null,
        data[1] as unknown[],
      );
      expect(processor).not.toBeNull();
      const values = entry.apv ? (JSON.parse(entry.apv) as number[]) : [];
      const initial: Point[] = [];
      for (let i = 0; i + 1 < values.length; i += 2) {
        initial.push(new Point(values[i] as number, values[i + 1] as number));
      }
      for (const positions of positionSets(initial)) {
        const list = initial.length ? positions : null;
        expectSameNumbers(
          flatten(processor.getVertices(list)),
          flatten(reference.getVertices(list)),
          entry.ssn,
        );
      }
      expect(ParameterizedVertexProcessor.serialize(processor)).toBe(entry.pvp);
    },
  );

  it("the fixtures exercise expressions, clamps and parameters", () => {
    let expressions = 0;
    let clamped = 0;
    for (const shape of catalogue) {
      for (const a of shape.annotations?.annotList ?? []) {
        if (typeof a.X === "string" || typeof a.Y === "string") expressions++;
        if (typeof a.minX === "number" || typeof a.maxY === "number") clamped++;
      }
      expressions += (shape.parameters ?? []).length;
      expressions += shape.vertices.filter((v) => typeof v === "string").length;
    }
    expect(expressions).toBeGreaterThan(200);
    expect(clamped).toBeGreaterThan(10);
    expect(corpus.length).toBeGreaterThan(10);
  });
});

describe("ParameterizedVertexProcessor", () => {
  const triangle = {
    name: "annot",
    annotList: [{ X: "x", Y: -1, minX: -0.9, maxX: 0.9 }],
    parameters: [
      { name: "px", expression: "annot[0].X" },
      { name: "py", expression: "min(1, abs(annot[0].X) + 0.5)" },
    ],
    vertices: [1, 2, "px", 1, -1, 2, 1, 1, 2, "py", 2, 1, -1, 1, 1, 5],
  };

  function make(
    parameters: ParameterDefinition[] = triangle.parameters,
  ): ParameterizedVertexProcessor {
    return new ParameterizedVertexProcessor(
      triangle.name,
      triangle.annotList,
      parameters,
      triangle.vertices,
    );
  }

  it("computes the vertices from the clamped handle", () => {
    const processor = make();
    expect(flatten(processor.getVertices([new Point(0.5, 0)]))).toEqual([
      1,
      0.5,
      -1,
      2,
      1,
      1,
      2,
      -1,
      1,
      5,
      null,
      null,
    ]);
    // x is clamped to 0.9.
    expect(flatten(processor.getVertices([new Point(5, 0)]))?.slice(0, 3)).toEqual([1, 0.9, -1]);
    expect(processor.getAnnotationPosition(0, new Point(-5, 3))?.getX()).toBe(-0.9);
    expect(processor.getAnnotationPosition(0, new Point(-5, 3))?.getY()).toBe(-1);
  });

  it("needs one position per annotation when there are parameters", () => {
    const processor = make();
    expect(processor.getVertices(null)).toBeNull();
    expect(processor.getVertices([new Point(0, 0), new Point(0, 0)])).toBeNull();
  });

  it("drops the parameters when one is not on the whitelist", () => {
    const processor = make([{ name: "px", expression: "alert(1)" }]);
    expect(processor._parametersFuncs).toBeNull();
    // The expression vertices are dropped with them: only the direct ones are left.
    expect(flatten(processor.getVertices(null))).toEqual([2, -1, 1, 5, null, null]);
  });

  it("rejects parameter names that are not letters", () => {
    expect(make([{ name: "p1", expression: "annot[0].X" }])._parametersFuncs).toBeNull();
  });

  it("serializes the definitions and reads them back", () => {
    const processor = make();
    const blob = ParameterizedVertexProcessor.serialize(processor);
    expect(JSON.parse(blob)).toEqual([
      "annot",
      triangle.vertices,
      triangle.annotList,
      triangle.parameters,
    ]);
    const back = ParameterizedVertexProcessor.deserialize(blob) as ParameterizedVertexProcessor;
    expect(flatten(back.getVertices([new Point(0.25, 0)]))).toEqual(
      flatten(processor.getVertices([new Point(0.25, 0)])),
    );
    expect(ParameterizedVertexProcessor.deserialize(null)).toBeNull();
    expect(ParameterizedVertexProcessor.deserialize("[1]")).toBeNull();
  });

  it("returns null vertices when an expression fails at run time", () => {
    const processor = make([
      { name: "px", expression: "annot[0].X" },
      { name: "py", expression: "annot[1].X" },
    ]);
    expect(processor.getVertices([new Point(0, 0)])).toBeNull();
  });

  it("keeps the whitelist", () => {
    const processor = make();
    expect(processor.isSecure("sin(x) * 2 + max(1, y)", ["x", "y"])).toBe(false); // the x of max
    expect(processor.isSecure("sin(x) * 2 + min(1, y)", ["x", "y"])).toBe(true);
    expect(processor.isSecure("((((x))))", ["x", "y"])).toBe(false); // nesting past 3
    expect(processor.isSecure("(((x)))", ["x", "y"])).toBe(true);
    expect(processor.isSecure("x; alert(1)", ["x", "y"])).toBe(false);
    expect(processor.isSecure("-x", ["x", "y"])).toBe(true);
    expect(processor.isSecure("max(1, -2)", ["a"])).toBe(false);
  });
});
