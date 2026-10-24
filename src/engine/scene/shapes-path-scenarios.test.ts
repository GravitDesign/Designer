// Runs the parity scenarios of the shapes-path cluster in Node, against
// the values recorded from the old app, so every recorded number is
// checked bit for bit without a browser. The Playwright parity run checks
// the same scenarios in the built app.
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
await import("../../../parity/scenarios/engine-geometry/pathops.spec.ts");
await import("../../../parity/scenarios/engine-geometry/vertex.spec.ts");
await import("../../../parity/scenarios/engine-model/nodes.spec.ts");

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
  "engine-geometry/shapes/path-anchors",
  "engine-geometry/shapes/compound-path",
  "engine-geometry/hittest/path-hittest",
  "engine-geometry/pathops/path-edits",
  "engine-geometry/pathops/knife-intersections",
  "engine-geometry/vertex/path-util",
  "engine-model/nodes/anchor-points-legacy",
];

async function run(scenario: Scenario): Promise<string> {
  // The runner sends the function's source text to the page; the
  // engine-model helpers only work that way (withHelpers), so rebuild it.
  const inPage = (0, eval)(`(${String(scenario.inPage)})`) as NonNullable<Scenario["inPage"]>;
  const raw: unknown = await inPage({ G, app } as never, scenario.args);
  return storeOutput(scenario, raw).toString("utf8");
}

describe("shapes-path scenarios in Node", () => {
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

// shapes/bboxes also needs the primitives (engine-shapes-primitives); its
// two path cases are checked here against the recorded values.
describe("shapes/bboxes path cases in Node", () => {
  it("match the old app", async () => {
    const recorded = JSON.parse(
      fs.readFileSync(path.join(EXPECTED_ROOT, "engine-geometry/shapes/bboxes.json"), "utf8"),
    ) as Record<string, unknown>;
    const { geomLib } = await import("../../../parity/scenarios/engine-geometry/lib.ts");
    const L = geomLib(G as never);
    const make: Record<string, () => unknown> = {
      curvePath: () =>
        L.path(
          [
            { x: 0, y: 0, hrx: 30, hry: -80 },
            { x: 100, y: 0, hlx: 70, hly: 90 },
          ],
          false,
        ),
      line: () =>
        L.path(
          [
            [0, 0],
            [100, 40],
          ],
          false,
        ),
    };
    const borders: Record<string, Record<string, unknown> | null> = {
      none: null,
      center: { _bw: 6 },
      inside: { _bw: 6, _ba: "I" },
      outside: { _bw: 6, _ba: "O" },
      miter: { _bw: 4, _blj: "miter", _bml: 10 },
      roundCap: { _bw: 4, _blc: "round" },
      squareCap: { _bw: 4, _blc: "square" },
    };
    const actual: Record<string, unknown> = {};
    const expected: Record<string, unknown> = {};
    for (const [name, f] of Object.entries(make)) {
      for (const [borderName, border] of Object.entries(borders)) {
        const element = f() as {
          getSourceBBox(): unknown;
          getGeometryBBox(): unknown;
          getPaintBBox(): unknown;
        };
        L.fill(element);
        if (border) L.border(element, border);
        actual[`${name}/${borderName}`] = {
          source: L.run(() => element.getSourceBBox()),
          geometry: L.run(() => element.getGeometryBBox()),
          paint: L.run(() => element.getPaintBBox()),
        };
        expected[`${name}/${borderName}`] = recorded[`${name}/${borderName}`];
      }
    }
    expect(actual).toEqual(expected);
  });
});
