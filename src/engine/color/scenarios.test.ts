// Runs the engine-model color scenarios that only need the color classes
// in Node, against the values recorded from the old app, bit for bit. The
// Playwright parity run checks the same scenarios in the built app.
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { exceptionFor } from "../../../parity/support/exceptions.ts";

/** The expected file; a BUG-NNN exception points at the corrected `.fixed` file. */
function expectedFile(id: string): string {
  return path.join(EXPECTED_ROOT, exceptionFor(id) ? `${id}.fixed.json` : `${id}.json`);
}
import { storeOutput } from "../../../parity/support/runner.ts";
import { ASSETS_ROOT } from "../../../server/paths.ts";
import { engineColor } from "../../parity/g/engine-color.ts";
import { engineMath } from "../../parity/g/engine-math.ts";
import { Gradient } from "../style/gradient.ts";
import { Pattern } from "../style/pattern.ts";
import { Color } from "./color.ts";
import type { IccHeader } from "./icc-header.ts";
import { IccProfile } from "./icc-profile.ts";

const captured: Scenario[] = [];

vi.mock("../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../parity/scenarios/engine-model/colors.spec.ts");

// Stand-ins for classes of later clusters. The helpers check
// `instanceof G.GNode` before encoding plain objects; the gradient and
// color-helper scenarios create an angular gradient and a scene next to
// the parts this cluster owns, so only those parts are compared below.
class NodeStandIn {
  readonly standIn = "GNode";
}
class AngularGradientStandIn extends Gradient {
  static {
    Pattern.register("A", this);
  }
  override clone(): AngularGradientStandIn {
    return new AngularGradientStandIn();
  }
}
class SceneStandIn {
  getStyles() {
    return { getChildren: () => [] };
  }
  setProperty() {}
  getProperty() {}
}
const G: Record<string, unknown> = {
  GNode: NodeStandIn,
  GAngularGradient: AngularGradientStandIn,
  GScene: SceneStandIn,
  ...engineMath,
  ...engineColor,
};

/** Scenarios that need later clusters as a whole. */
const needsOtherClusters = new Set([
  "engine-model/colors/patterns", // GTexturePattern, GNoisePattern, GBackground
  "engine-model/colors/render-gradients", // nodes and rendering
]);

/**
 * Scenarios that mix this cluster with later ones: only the listed keys of
 * their output are compared here. The whole output is compared by the
 * browser parity run once the later clusters exist.
 */
const partial: Record<string, (key: string) => boolean> = {
  "engine-model/colors/gradients": (key) =>
    !key.startsWith("angular") && key !== "legacyAngularEnd",
  // hsv->CMYK goes through Math.pow in rgbToCMYK (see browserOnly).
  "engine-model/colors/color-helper": (key) => key.includes("->") && key !== "hsv->CMYK",
};

/**
 * Chromium's V8 and Node's V8 round Math.pow differently in the last bit
 * for some inputs; the ICC conversions of [128, 128, 128] hit one, so this
 * scenario only matches in the browser (it does there). The same values
 * are checked against the old code run in Node in color.test.ts.
 */
const browserOnly = new Set(["engine-model/colors/cmyk-hsv"]);

function loadProfile(): IccHeader {
  const file = fs.readFileSync(path.join(ASSETS_ROOT, "data/icc/USWebCoatedSWOP.icc"));
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  let profile: IccHeader | null = null;
  new IccProfile().read(buffer as ArrayBuffer, (p) => (profile = p));
  if (!profile) throw new Error("the ICC profile did not load");
  return profile;
}

async function run(scenario: Scenario): Promise<string> {
  // withHelpers scenarios exist only as page source text; evaluate it
  // as the page would.
  const pageFunction = (0, eval)(String(scenario.inPage)) as (
    p: unknown,
    args: unknown,
  ) => Promise<unknown>;
  const raw = await pageFunction({ G, app: {} }, scenario.args);
  return storeOutput(scenario, raw).toString("utf8");
}

describe("engine-model color scenarios in Node", () => {
  beforeAll(() => {
    Color.currentCMYKProfile = loadProfile();
  });
  afterAll(() => {
    Color.currentCMYKProfile = null;
  });

  const ours = captured.filter(
    (s) => !needsOtherClusters.has(s.id) && !browserOnly.has(s.id) && !partial[s.id],
  );
  const mixed = captured.filter((s) => partial[s.id]);
  it("finds the scenarios", () => {
    expect(captured.length).toBe(6);
    expect(ours.map((s) => s.id)).toEqual(["engine-model/colors/rgb"]);
    expect(mixed.length).toBe(2);
  });
  it.each(ours.map((s) => [s.id, s] as const))("%s matches the old app", async (id, scenario) => {
    const expected = fs.readFileSync(expectedFile(id), "utf8");
    const actual = await run(scenario);
    if (actual !== expected) expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    expect(actual).toBe(expected);
  });
  it.each(mixed.map((s) => [s.id, s] as const))(
    "%s matches the old app in this cluster's parts",
    async (id, scenario) => {
      const keep = partial[id] as (key: string) => boolean;
      const pick = (json: string) =>
        Object.fromEntries(
          Object.entries(JSON.parse(json) as Record<string, unknown>).filter(([k]) => keep(k)),
        );
      const expected = pick(fs.readFileSync(expectedFile(id), "utf8"));
      expect(Object.keys(expected).length).toBeGreaterThan(5);
      const actual = pick(await run(scenario));
      // Serialized again, so -0 vs 0 and key order count as well.
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
    },
  );
});
