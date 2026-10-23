// Runs the engine-geometry parity scenarios of the boolean cluster in
// Node, against the values recorded from the old app. The Playwright
// parity run checks the same scenarios in the built app.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../../parity/support/env.ts";
import { storeOutput } from "../../../../parity/support/runner.ts";
import { engineGeometry } from "../../../parity/app/engine-geometry.ts";
import "../../../parity/app/engine-geometry-boolean.ts";
import { engineGeometryBoolean } from "../../../parity/g/engine-geometry-boolean.ts";
import { engineGeometryVertex } from "../../../parity/g/engine-geometry-vertex.ts";
import { engineMath } from "../../../parity/g/engine-math.ts";

const captured: Scenario[] = [];

vi.mock("../../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../../parity/scenarios/engine-geometry/boolean.spec.ts");
await import("../../../../parity/scenarios/engine-geometry/pathops.spec.ts");

const G: Record<string, unknown> = {
  ...engineMath,
  ...engineGeometryVertex,
  ...engineGeometryBoolean,
};

const ours = [
  "engine-geometry/boolean/constants",
  "engine-geometry/boolean/merge-tool",
  "engine-geometry/boolean/compound-evenodd",
  "engine-geometry/boolean/compound-winding",
  "engine-geometry/pathops/simplifier",
  "engine-geometry/pathops/redistribute",
];

/**
 * Parts of a scenario whose input points come from Math.sin or Math.cos.
 * Chromium's V8 computes these with a different libm than Node's (they
 * can differ in the last bit), so those parts are compared only in the
 * browser parity run.
 */
const browserOnlyParts: Record<string, string[]> = {
  // The star and random pairs only differ in the NONE op, which hands
  // the input back; the clipped results are rounded to 11 decimals.
  "engine-geometry/boolean/merge-tool": ["stars", "random6"],
  "engine-geometry/boolean/compound-evenodd": ["stars", "random6"],
  "engine-geometry/boolean/compound-winding": ["stars"],
  "engine-geometry/pathops/simplifier": ["circle", "noisyCircle"],
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

describe("engine-geometry boolean scenarios in Node", () => {
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
      // A readable diff instead of two large strings.
      expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    }
    expect(actual).toBe(expected);
  });
});
