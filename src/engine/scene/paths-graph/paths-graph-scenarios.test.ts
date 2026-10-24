// Runs the paths graph parity scenarios in Node against the values
// recorded from the old app, so every number is checked bit for bit
// without a browser. pathops/paths-graph appends the graph to the active
// page, so a stand-in page that only accepts the child is used here. The
// browser run lists both paths graph scenarios in
// parity/ported/engine-paths-graph.json; pathops/paths-graph-paint renders
// with toBitmap and so only runs there (Node has no canvas).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../../parity/support/env.ts";
import { storeOutput } from "../../../../parity/support/runner.ts";

const captured: Scenario[] = [];

vi.mock("../../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../../parity/scenarios/engine-geometry/pathops.spec.ts");

function merge(modules: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports as Record<string, unknown>)) {
      if (typeof part === "object" && part !== null) Object.assign(out, part);
    }
  }
  return out;
}
const G = merge(import.meta.glob("../../../parity/g/*.ts", { eager: true }));
const app = {
  ...merge(import.meta.glob("../../../parity/app/*.ts", { eager: true })),
  scene: () => ({ getActivePage: () => ({ appendChild() {} }) }),
};

async function run(scenario: Scenario): Promise<string> {
  const inPage = (0, eval)(`(${String(scenario.inPage)})`) as NonNullable<Scenario["inPage"]>;
  const raw: unknown = await inPage({ G, app } as never, scenario.args);
  return storeOutput(scenario, raw).toString("utf8");
}

describe("paths graph scenarios in Node", () => {
  it.each(["engine-geometry/pathops/paths-graph"])("%s matches the old app", async (id) => {
    const scenario = captured.find((s) => s.id === id);
    expect(scenario).toBeDefined();
    const expected = fs.readFileSync(path.join(EXPECTED_ROOT, `${id}.json`), "utf8");
    const actual = await run(scenario as Scenario);
    if (actual !== expected) expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    expect(actual).toBe(expected);
  });
});
