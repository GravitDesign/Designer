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
import { exceptionFor } from "../../../parity/support/exceptions.ts";
import { storeOutput } from "../../../parity/support/runner.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Transform } from "../math/transform.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../text/fonts/font-manager.ts";
import { OpenTypeFont } from "../text/fonts/open-type-font.ts";
import { Text } from "../text/text.ts";
import type { ContainerNode } from "./node-container.ts";
import type { Scene } from "./scene.ts";
import { Symbol } from "./symbol.ts";

/** The expected file; a BUG-NNN exception points at the corrected `.fixed` file. */
function expectedFile(id: string): string {
  return path.join(EXPECTED_ROOT, exceptionFor(id) ? `${id}.fixed.json` : `${id}.json`);
}

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
  const file = path.resolve(import.meta.dirname, "../../../assets/font/OpenSans-Regular.ttf");
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
    const expected = fs.readFileSync(expectedFile(id), "utf8");
    const actual = await run(scenario);
    if (actual !== expected) {
      // A readable diff instead of two large strings.
      expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    }
    expect(actual).toBe(expected);
  });
});

describe("master text changes", () => {
  /** Waits until no font is pending and no text waits for one. */
  async function fonts(...texts: Text[]): Promise<void> {
    const fontManager = app.scene().getWorkspace()?.getFontManager() as FontManager;
    for (let i = 0; i < 400; i++) {
      const busy =
        fontManager.hasPendingFonts() ||
        fontManager.hasUnresolvedFonts() ||
        texts.some((text) => text.hasFontsToResolve());
      if (!busy) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("fonts did not load");
  }

  const sizes = (text: Text) =>
    (JSON.parse(text.getProperty("content") as string) as { fontSize: number }[]).map(
      (run) => run.fontSize,
    );

  it("an in-sync instance follows a size change of a new master text, an overridden one keeps its size (BUG-027)", async () => {
    app.newInfiniteDocument();
    const scene = app.scene();
    const layer = (scene.getActiveLayer() || scene.getActivePage()) as unknown as ContainerNode;
    const text = new Text();
    text.setProperty("trf", new Transform(1, 0, 0, 1, 0, 0));
    layer.appendChild(text);
    text.setText("Hello world");
    await fonts(text);
    const master = Symbol.create([text], layer, "Texts");
    const inSync = master.clone() as unknown as Symbol;
    const overridden = master.clone() as unknown as Symbol;
    layer.appendChild(inSync);
    layer.appendChild(overridden);
    overridden.transform(new Transform(1, 0, 0, 1, 0, 100));
    const masterText = master.getFirstChild() as Text;
    const inSyncText = inSync.getFirstChild() as Text;
    const ownText = overridden.getFirstChild() as Text;
    ownText.setProperty("_tfi", 9);
    // setText alone never wrote the master's content.
    expect(masterText.getProperty("content")).toBe(null);
    expect(sizes(inSyncText)).toEqual([20]);

    masterText.setProperty("_tfi", 30);
    await fonts(masterText, inSyncText, ownText);
    // The old merge diffed against no content and the instance kept 20.
    expect(sizes(masterText)).toEqual([30]);
    expect(sizes(inSyncText)).toEqual([30]);
    expect(sizes(ownText)).toEqual([9]);
    expect(inSyncText.getPlainText()).toBe("Hello world");
  });

  it("an in-sync instance follows a color set on a selection when the two contents store the color differently (BUG-027)", async () => {
    app.newInfiniteDocument();
    const scene = app.scene();
    const layer = (scene.getActiveLayer() || scene.getActivePage()) as unknown as ContainerNode;
    const text = new Text();
    text.setProperty("trf", new Transform(1, 0, 0, 1, 0, 0));
    layer.appendChild(text);
    text.setText("Hello world");
    await fonts(text);
    const master = Symbol.create([text], layer, "Texts");
    const inSync = master.clone() as unknown as Symbol;
    layer.appendChild(inSync);
    const masterText = master.getFirstChild() as Text;
    const inSyncText = inSync.getFirstChild() as Text;
    // Gives the master a content, so the old merge has one to diff against.
    masterText.setProperty("_tfi", 20);
    // Content from a file or undo: the master keeps the color serialized,
    // the instance gets the master's color object, which JSON.stringify
    // writes as {"_value": [...]}.
    masterText.setProperty(
      "content",
      JSON.stringify([{ text: "Hello world", fontSize: 20, fontColor: "C#[255,0,0]" }]),
    );
    await fonts(masterText, inSyncText);
    const runs = (node: Text) =>
      JSON.parse(node.getProperty("content") as string) as { text: string; fontColor: unknown }[];
    expect(runs(inSyncText)[0]?.fontColor).toEqual(
      expect.objectContaining({ _value: [255, 0, 0] }),
    );

    // The inspector while the first word is selected in the text editor.
    masterText.repaint(true);
    masterText.getTLCore()?.select(0, 5);
    masterText.setProperties(["_fc"], [new RGBColor([0, 0, 255])], false, false, false, true);
    await fonts(masterText, inSyncText);
    // The old merge compared the two reds with ===, found them different
    // and left the instance red.
    const blue = runs(masterText)[0]?.fontColor;
    expect(runs(masterText)[0]?.text).toBe("Hello");
    expect(runs(inSyncText).map((run) => run.text)).toEqual(["Hello", " world"]);
    expect(runs(inSyncText)[0]?.fontColor).toEqual(blue);
  });
});
