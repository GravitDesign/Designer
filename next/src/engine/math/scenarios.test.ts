// Runs the engine-geometry parity scenarios that only need the math
// classes in Node, against the values recorded from the old app. This
// checks every recorded number bit for bit without a browser; the
// Playwright parity run checks the same scenarios in the built app.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { storeOutput } from "../../../parity/support/runner.ts";
import { engineMath } from "../../parity/g/engine-math.ts";

const captured: Scenario[] = [];

vi.mock("../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../parity/scenarios/engine-geometry/point-rect.spec.ts");
await import("../../../parity/scenarios/engine-geometry/transform.spec.ts");
await import("../../../parity/scenarios/engine-geometry/math.spec.ts");
await import("../../../parity/scenarios/engine-geometry/length-util.spec.ts");

// The scenario helpers check `instanceof G.GVertex` and `G.GHitResult`
// before encoding plain objects; those classes belong to the vertex
// cluster, so stand-ins keep the checks from throwing here.
class VertexStandIn {
  readonly standIn = "GVertex";
}
class HitResultStandIn {
  readonly standIn = "GHitResult";
}
const G: Record<string, unknown> = {
  GVertex: VertexStandIn,
  GHitResult: HitResultStandIn,
  ...engineMath,
};

/**
 * Scenarios that call Math.sin, Math.cos or Math.atan2. Chromium's V8
 * computes these with a different libm than Node's (they differ in the
 * last bit for some inputs), so they can only be compared in the browser
 * parity run.
 */
const browserOnly = new Set([
  "engine-geometry/point/arithmetic",
  "engine-geometry/transform/matrix-ops",
  "engine-geometry/transform/decompose",
  "engine-geometry/transform/rotation-transform",
  "engine-geometry/transform/line-constrain-rotation",
  "engine-geometry/math/scalar",
]);

/** Scenarios that need classes or app hooks from other clusters. */
const needsOtherClusters = new Set([
  "engine-geometry/transform/editor-constrain", // GEditor.convertToConstrain
  "engine-geometry/util/numbers", // GUtil (engine-core)
  "engine-geometry/util/packing",
  "engine-geometry/util/helpers",
]);

/** Runs the scenario's page code here and stores the result as the harness does. */
async function run(scenario: Scenario): Promise<string> {
  const raw: unknown = await (scenario.inPage as NonNullable<Scenario["inPage"]>)(
    { G, app: {} },
    scenario.args,
  );
  return storeOutput(scenario, raw).toString("utf8");
}

describe("engine-geometry scenarios in Node", () => {
  const ours = captured.filter((s) => !needsOtherClusters.has(s.id) && !browserOnly.has(s.id));
  it("finds the scenarios", () => {
    expect(captured.length).toBe(23);
    expect(ours.length).toBe(13);
  });
  // Some scenarios (bezier) take a few seconds and passed the 5 s default
  // when the machine was busy; the result check is the same.
  it.each(ours.map((s) => [s.id, s] as const))(
    "%s matches the old app",
    async (id, scenario) => {
      const expected = fs.readFileSync(path.join(EXPECTED_ROOT, `${id}.json`), "utf8");
      const actual = await run(scenario);
      if (actual !== expected) {
        // A readable diff instead of two 100 KB strings.
        expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
      }
      expect(actual).toBe(expected);
    },
    60_000,
  );
});
