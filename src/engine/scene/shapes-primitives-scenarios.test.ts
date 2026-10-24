// Runs the parity scenarios of the shapes-primitives cluster in Node,
// against the values recorded from the old app, so every recorded number
// is checked bit for bit without a browser. The Playwright parity run
// checks the same scenarios in the built app; it also covers the polygon,
// star and hit-test scenarios, whose numbers depend on Math.sin/cos, which
// differ in the last bit between Node and the Chromium the old app was
// recorded in.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { storeOutput } from "../../../parity/support/runner.ts";

const captured: Scenario[] = [];

vi.mock("../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../parity/scenarios/engine-geometry/shapes.spec.ts");
await import("../../../parity/scenarios/engine-geometry/hittest.spec.ts");
await import("../../../parity/scenarios/engine-geometry/boolean.spec.ts");
await import("../../../parity/scenarios/engine-model/nodes.spec.ts");
await import("../../../parity/scenarios/engine-model/special-nodes.spec.ts");
await import("../../../parity/scenarios/engine-model/scene.spec.ts");
await import("../../../parity/scenarios/smoke/smoke.spec.ts");

// The whole G namespace and the app hooks, as the bridge builds them.
function merge(modules: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports as Record<string, unknown>)) {
      if (typeof part === "object" && part !== null) Object.assign(out, part);
    }
  }
  return out;
}
const G = merge(import.meta.glob("../../parity/g/*.ts", { eager: true }));
const app = merge(import.meta.glob("../../parity/app/*.ts", { eager: true }));

const ours = [
  "engine-geometry/shapes/rectangle-corners",
  "engine-geometry/shapes/ellipse-arcs",
  "engine-geometry/boolean/live-compound-shape",
  "engine-model/special/compound-path-and-shape",
  "engine-model/nodes/serialize-options",
  "engine-model/nodes/clone",
  "engine-model/scene/constraints",
  "smoke/rectangle-bbox",
];

async function run(scenario: Scenario): Promise<string> {
  // The runner sends the function's source text to the page; the
  // engine-model helpers only work that way (withHelpers), so rebuild it.
  const inPage = (0, eval)(`(${String(scenario.inPage)})`) as NonNullable<Scenario["inPage"]>;
  const raw: unknown = await inPage({ G, app } as never, scenario.args);
  return storeOutput(scenario, raw).toString("utf8");
}

describe("shapes-primitives scenarios in Node", () => {
  it.each(ours)("%s matches the old app", async (id) => {
    const scenario = captured.find((s) => s.id === id);
    expect(scenario).toBeDefined();
    const expected = fs.readFileSync(path.join(EXPECTED_ROOT, `${id}.json`), "utf8");
    const actual = await run(scenario as Scenario);
    if (actual !== expected) {
      // A readable diff instead of two large strings.
      expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    }
    expect(actual).toBe(expected);
  });
});
