import { describe, expect, it } from "vitest";
import { Transform } from "../../math/transform.ts";
import { Vertex } from "../vertex.ts";
import { VertexContainer } from "../vertex-container.ts";
import { VertexSimplifier } from "../vertex-simplifier.ts";
import { fuzzCases, targetedCases, type BooleanImpl } from "./fixture-cases.ts";
import oldFixtures from "./old-fixtures.json";
import fixedFixtures from "./old-fixtures.fixed.json";
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

/**
 * The cases whose old output shows a bug the port fixes, with the fixed
 * output (BUGS-FIXED.md "BUG-014 Boolean intersections: one collinear pair
 * drops every later hit, quadratic-vs-curve hits unlimited").
 */
const FIXED = fixedFixtures as {
  bug: string;
  targeted: Record<string, unknown>;
  fuzz: Record<string, string>;
};
const EXPECTED = {
  targeted: { ...OLD.targeted, ...FIXED.targeted },
  fuzz: { ...OLD.fuzz, ...FIXED.fuzz },
};

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
      expect(targeted[name]).toEqual(EXPECTED.targeted[name]);
    });

  it("has fixed outputs only for recorded cases they change (BUG-014)", () => {
    expect(FIXED.bug).toBe("BUG-014");
    for (const [name, value] of Object.entries(FIXED.targeted)) {
      expect(OLD.targeted[name], name).toBeDefined();
      expect(value, name).not.toEqual(OLD.targeted[name]);
    }
    for (const [key, value] of Object.entries(FIXED.fuzz)) {
      expect(OLD.fuzz[key], key).toBeDefined();
      expect(value, key).not.toBe(OLD.fuzz[key]);
    }
  });

  for (const seed of [11, 21])
    it(`matches the seeded differential fuzz, seed ${seed}`, { timeout: 60000 }, () => {
      const fuzz = fuzzCases(impl, seed, FUZZ_ITERATIONS);
      const expected = Object.fromEntries(
        Object.entries(EXPECTED.fuzz).filter(([key]) => key.startsWith(seed + ".")),
      );
      expect(Object.keys(expected).length).toBe(Object.keys(fuzz).length);
      expect(fuzz).toEqual(expected);
    });
});
