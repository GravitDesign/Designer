// Runs the engine-geometry parity scenarios of the vertex cluster in Node,
// against the values recorded from the old app. This checks every recorded
// number bit for bit without a browser; the Playwright parity run checks
// the same scenarios in the built app.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { storeOutput } from "../../../parity/support/runner.ts";
import { engineGeometry } from "../../parity/app/engine-geometry.ts";
import { engineGeometryVertex } from "../../parity/g/engine-geometry-vertex.ts";
import { engineMath } from "../../parity/g/engine-math.ts";

const captured: Scenario[] = [];

vi.mock("../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../parity/scenarios/engine-geometry/vertex.spec.ts");
await import("../../../parity/scenarios/engine-geometry/pathops.spec.ts");

// GHitResult belongs to the scene cluster; the hit-test scenario only
// needs an object with the old prototype defaults.
class HitResultStandIn {
  declare segment: unknown;
  declare x: unknown;
  declare y: unknown;
  declare slope: unknown;
  declare outline: unknown;
}
for (const key of ["segment", "x", "y", "slope", "outline"]) {
  (HitResultStandIn.prototype as unknown as Record<string, unknown>)[key] = null;
}

const G: Record<string, unknown> = {
  ...engineMath,
  ...engineGeometryVertex,
  GHitResult: HitResultStandIn,
};

const ours = [
  "engine-geometry/vertex/container",
  "engine-geometry/vertex/clockwise",
  "engine-geometry/vertex/transformer",
  "engine-geometry/vertex/info-bounds-length",
  "engine-geometry/vertex/info-collinear",
  "engine-geometry/vertex/info-hittest",
  "engine-geometry/vertex/pixel-aligner",
  "engine-geometry/pathops/fitter",
];

/**
 * Parts of a scenario whose input points come from Math.sin or Math.cos.
 * Chromium's V8 computes these with a different libm than Node's (they
 * differ in the last bit for some inputs), so those parts can only be
 * compared in the browser parity run; the rest is compared here.
 */
const browserOnlyParts: Record<string, string[]> = {
  "engine-geometry/pathops/fitter": ["arc", "wave"],
};

function withoutParts(json: string, parts: string[]): string {
  const value = JSON.parse(json) as Record<string, unknown>;
  for (const part of parts) expect(value).toHaveProperty(part);
  return JSON.stringify(
    Object.fromEntries(Object.entries(value).filter(([k]) => !parts.includes(k))),
  );
}

async function run(scenario: Scenario): Promise<string> {
  const raw: unknown = await (scenario.inPage as NonNullable<Scenario["inPage"]>)(
    { G, app: { ...engineGeometry } } as never,
    scenario.args,
  );
  return storeOutput(scenario, raw).toString("utf8");
}

describe("engine-geometry vertex scenarios in Node", () => {
  it.each(ours)("%s matches the old app", async (id) => {
    const scenario = captured.find((s) => s.id === id);
    expect(scenario).toBeDefined();
    const parts = browserOnlyParts[id] ?? [];
    let expected = fs.readFileSync(path.join(EXPECTED_ROOT, `${id}.json`), "utf8");
    let actual = await run(scenario as Scenario);
    if (parts.length) {
      expected = withoutParts(expected, parts);
      actual = withoutParts(actual, parts);
    }
    if (actual !== expected) {
      // A readable diff instead of two 100 KB strings.
      expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    }
    expect(actual).toBe(expected);
  });
});
