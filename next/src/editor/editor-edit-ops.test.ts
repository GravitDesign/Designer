// Runs the edit-operation scenarios (editor-edit-ops.scenarios.ts) against
// the port and compares each with the output the same function gave in the
// old app (editor-edit-ops.fixture.json). They cover the branches of
// deleteSelection, cloneSelection, insertElements, isModified/markSavePoint
// and _tryAddToSelection that editor.test.ts doesn't reach.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installFakeCanvas } from "../engine/paint/testing/fake-canvas.ts";
import "./index.ts";
import { scenarios } from "./editor-edit-ops.scenarios.ts";
import fixture from "./editor-edit-ops.fixture.json";

// The whole G namespace under the old public names, as the parity bridge
// builds it.
function merge(modules: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports as Record<string, unknown>)) {
      if (typeof part === "object" && part !== null) Object.assign(out, part);
    }
  }
  return out;
}
const G = merge(import.meta.glob("../parity/g/*.ts", { eager: true }));

const expected = fixture as Record<string, unknown>;

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

describe("editor edit operations match the old app", () => {
  it("has a recorded output for every scenario", () => {
    expect(Object.keys(expected).sort()).toEqual(Object.keys(scenarios).sort());
  });

  it.each(Object.keys(scenarios))("%s", (id) => {
    const scenario = scenarios[id] as (g: unknown) => unknown;
    const actual: unknown = JSON.parse(JSON.stringify(scenario(G) ?? null));
    expect(actual).toEqual(expected[id]);
  });
});
