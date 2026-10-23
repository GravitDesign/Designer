// Runs the parity scenarios of the offset/trace cluster in Node, against
// the values recorded from the old app, so every recorded number is
// checked bit for bit without a browser. The Playwright parity run checks
// the same scenarios in the built app.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { storeOutput } from "../../../parity/support/runner.ts";
import { engineGeometry } from "../../parity/app/engine-geometry.ts";
import { engineGeometryOffsetTrace } from "../../parity/g/engine-geometry-offset-trace.ts";
import { engineGeometryVertex } from "../../parity/g/engine-geometry-vertex.ts";
import { engineMath } from "../../parity/g/engine-math.ts";

const captured: Scenario[] = [];

vi.mock("../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../parity/scenarios/engine-geometry/pathops.spec.ts");
await import("../../../parity/scenarios/engine-geometry/bitmap.spec.ts");

// The scenario helpers check for GHitResult with instanceof; these
// scenarios never produce one.
class HitResultStandIn {
  declare segment: unknown;
}

const G: Record<string, unknown> = {
  ...engineMath,
  ...engineGeometryVertex,
  ...engineGeometryOffsetTrace,
  GHitResult: HitResultStandIn,
};

const ours = ["engine-geometry/pathops/offsetter", "engine-geometry/bitmap/image-tracer"];

/**
 * Parts whose input points come from Math.sin or Math.cos, which
 * Chromium computes with a different libm than Node (last-bit
 * differences); those are compared only in the browser parity run.
 */
const browserOnlyParts: Record<string, string[]> = {
  "engine-geometry/pathops/offsetter": ["star"],
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

describe("engine-geometry offset/trace scenarios in Node", () => {
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
