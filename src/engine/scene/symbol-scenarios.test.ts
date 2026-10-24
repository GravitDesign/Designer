// Runs the symbols-branches parity scenarios in Node against the values
// recorded from the old app, so the branches they reach (partial and full
// synchronize, desynchronize, nested symbols and swaps, the compared
// property names, constrained content, BLOCK_EDITED, sweeping) are checked
// on every unit test run. The Playwright parity run checks the same
// scenarios in the built app.
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Scenario } from "../../../parity/support/scenario.ts";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { storeOutput } from "../../../parity/support/runner.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../text/fonts/font-manager.ts";
import { OpenTypeFont } from "../text/fonts/open-type-font.ts";
import type { Scene } from "./scene.ts";

const captured: Scenario[] = [];

vi.mock("../../../parity/support/suite.ts", () => ({
  paritySuite: (_name: string, scenarios: Scenario[]) => {
    captured.push(...scenarios);
  },
}));

await import("../../../parity/scenarios/engine-model/symbols-branches.spec.ts");

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
const app = merge(import.meta.glob("../../parity/app/*.ts", { eager: true })) as {
  newInfiniteDocument(): void;
  scene(): Scene;
};

/**
 * The old app's default font, Open Sans Regular, from the files it serves.
 * The interim document hooks have no font providers (app-fonts-ui), so the
 * workspace's font manager gets it here.
 */
function installDefaultFont(): void {
  app.newInfiniteDocument();
  const fontManager = app.scene().getWorkspace()?.getFontManager() as FontManager;
  if (fontManager.getDefaultFont()) return;
  const file = path.resolve(
    import.meta.dirname,
    "../../../legacy/public/assets/font/OpenSans-Regular.ttf",
  );
  const bytes = fs.readFileSync(file);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const font = OpenTypeFont.create("Open Sans", "N", 400, buffer) as OpenTypeFont;
  fontManager._fonts.push(font);
  fontManager.setDefaultFont(font);
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
}

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
  installDefaultFont();
});
afterAll(() => uninstall());

async function run(scenario: Scenario): Promise<string> {
  // The runner sends the function's source text to the page; the
  // engine-model helpers only work that way (withHelpers), so rebuild it.
  const inPage = (0, eval)(`(${String(scenario.inPage)})`) as NonNullable<Scenario["inPage"]>;
  app.newInfiniteDocument();
  const raw: unknown = await inPage({ G, app } as never, scenario.args);
  return storeOutput(scenario, raw).toString("utf8");
}

describe("symbols-branches scenarios in Node", () => {
  it.each(captured.map((s) => s.id))("%s matches the old app", async (id) => {
    const scenario = captured.find((s) => s.id === id) as Scenario;
    const expected = fs.readFileSync(path.join(EXPECTED_ROOT, `${id}.json`), "utf8");
    const actual = await run(scenario);
    if (actual !== expected) {
      // A readable diff instead of two large strings.
      expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    }
    expect(actual).toBe(expected);
  });
});
