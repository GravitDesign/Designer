// Runs scene-probe.ts against the port and compares with what the same
// probe gave in the old app (__fixtures__/old-scene.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { ReferenceEvent } from "./reference-event.ts";
import { probeScene } from "./scene-probe.ts";

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

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, "__fixtures__/old-scene.json");
const expected = JSON.parse(fs.readFileSync(fixture, "utf8")) as Record<string, unknown>;

let uninstall: () => void;
let actual: Record<string, unknown>;
beforeAll(() => {
  uninstall = installFakeCanvas();
  actual = JSON.parse(JSON.stringify(probeScene({ G, ReferenceEvent }))) as Record<string, unknown>;
  if (process.env.SCENE_PROBE_OUT)
    fs.writeFileSync(process.env.SCENE_PROBE_OUT, JSON.stringify(actual, null, 1));
});
afterAll(() => uninstall());

describe("scene probe against the old engine", () => {
  for (const name of Object.keys(expected)) {
    it(name, () => {
      expect(actual[name]).toEqual(expected[name]);
    });
  }
});
