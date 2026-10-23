import { describe, expect, it } from "vitest";
import { Transform } from "../../math/transform.ts";
import { Vertex } from "../vertex.ts";
import { VertexContainer } from "../vertex-container.ts";
import { VertexSimplifier } from "../vertex-simplifier.ts";
import { fuzzCases, targetedCases, type BooleanImpl } from "./fixture-cases.ts";
import oldFixtures from "./old-fixtures.json";
import { PolyLineExtended } from "./poly-line-extended.ts";
import { PolyIntersector } from "./poly-segments.ts";
import { VertexPolyBoolean } from "./vertex-poly-boolean.ts";

/**
 * old-fixtures.json holds what the old modules (264, 187, 1002) returned
 * for the drivers in fixture-cases.ts, recorded once in Node. The fuzz
 * part stores a hash per case (seed.iteration.case); rerun the drivers on
 * both versions to see the full outputs of a failing case.
 */
const OLD = oldFixtures as { targeted: Record<string, unknown>; fuzz: Record<string, string> };

const impl: BooleanImpl = {
  VertexPolyBoolean,
  PolyLineExtended,
  PolyIntersector,
  VertexSimplifier,
  VertexContainer,
  Vertex,
  Transform,
};

const FUZZ_ITERATIONS = 50;

describe("boolean cluster against recorded old outputs", () => {
  const targeted = targetedCases(impl);
  it("runs exactly the recorded targeted cases", () => {
    expect(Object.keys(targeted)).toEqual(Object.keys(OLD.targeted));
  });
  for (const name of Object.keys(OLD.targeted))
    it(name, () => {
      expect(targeted[name]).toEqual(OLD.targeted[name]);
    });

  for (const seed of [11, 21])
    it(`matches the seeded differential fuzz, seed ${seed}`, { timeout: 60000 }, () => {
      const fuzz = fuzzCases(impl, seed, FUZZ_ITERATIONS);
      const expected = Object.fromEntries(
        Object.entries(OLD.fuzz).filter(([key]) => key.startsWith(seed + ".")),
      );
      expect(Object.keys(expected).length).toBe(Object.keys(fuzz).length);
      expect(fuzz).toEqual(expected);
    });
});
