import { PNG } from "pngjs";
import { chromium, test, expect, type Browser, type Page } from "@playwright/test";
import { PARITY_CONTEXT, isolateNetwork, openApp, type AppKind } from "./apps.ts";
import fs from "node:fs";
import path from "node:path";
import { NEXT_ROOT, RECORDING } from "./env.ts";
import { exceptionFor, assertExceptionIsDocumented } from "./exceptions.ts";
import {
  assertSameOutput,
  readExpected,
  runScenario,
  writeExpected,
  type StoredOutput,
} from "./runner.ts";
import type { Scenario } from "./scenario.ts";

export interface SuiteOptions {
  /**
   * Whether the new app is compared yet: false while the feature is not
   * ported, a list of scenario ids while it is partly ported, true when all
   * of them are. The final check requires true everywhere.
   */
  newApp: boolean | readonly string[];
}

/**
 * GD_PARITY_SABOTAGE=1 changes every output before it is compared. Every
 * comparison must then fail; `npm run parity:prove` checks that.
 */
const SABOTAGE = process.env.GD_PARITY_SABOTAGE === "1";

export function sabotage(output: StoredOutput, scenario: Scenario): StoredOutput {
  if (scenario.kind === "png") {
    // Flip one pixel channel, keeping the PNG valid.
    return flipFirstPixel(output);
  }
  return Buffer.concat([output, Buffer.from(" ")]);
}

function flipFirstPixel(png: Buffer): Buffer {
  const image = PNG.sync.read(png);
  image.data[0] = (image.data[0] ?? 0) ^ 0xff;
  return PNG.sync.write(image);
}

/** Scenarios that can share one page: in-page code on a fresh document. */
function canSharePage(scenario: Scenario): boolean {
  return (
    !scenario.driver &&
    !scenario.open?.theme &&
    !scenario.open?.language &&
    !scenario.open?.settings &&
    !scenario.open?.fileSystemAccess &&
    !scenario.open?.hasTouch
  );
}

async function newAppPage(
  browser: Browser,
  kind: AppKind,
  scenario: Scenario | undefined,
): Promise<Page> {
  const context = await browser.newContext({
    ...PARITY_CONTEXT,
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
    hasTouch: scenario?.open?.hasTouch === true,
  });
  await isolateNetwork(context);
  const page = await context.newPage();
  await openApp(page, kind, { newDocument: true, ...scenario?.open });
  return page;
}

/**
 * Returns a shared page to its boot state with one empty document (see
 * resetState in old-harness.js and the new app's bridge). Returns what the
 * reset could not restore.
 */
async function resetSharedPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const app = (window as unknown as { __parity: { app: { resetState(): string[] } } }).__parity
      .app;
    return app.resetState();
  });
}

function defineSide(kind: AppKind, scenarios: readonly Scenario[]): void {
  test.describe(`${kind} app`, () => {
    let shared: Page | undefined;

    test.afterAll(async () => {
      await shared?.context().close();
      shared = undefined;
    });

    for (const scenario of scenarios) {
      test(scenario.id, async ({ browser }) => {
        if (scenario.timeout) test.setTimeout(scenario.timeout);
        let page: Page;
        let owned = false;
        let ownBrowser: Browser | undefined;
        if (scenario.freshBrowser) {
          // Some outputs (WebGL effects) depend on state the GPU process
          // keeps across contexts; these get a browser of their own.
          ownBrowser = await chromium.launch(test.info().project.use.launchOptions);
          page = await newAppPage(ownBrowser, kind, scenario);
          owned = true;
        } else if (canSharePage(scenario)) {
          if (shared) {
            // Scenarios share a page to save boot time, so the state one
            // leaves behind (settings, clipboard, tool, documents) must not
            // reach the next. If the reset can't restore something, the
            // page is replaced by a freshly booted one.
            const left = await resetSharedPage(shared);
            if (left.length > 0) {
              console.warn(
                `[parity] ${scenario.id}: replacing the shared page, reset left ${left.join(", ")}`,
              );
              await shared.context().close();
              shared = undefined;
            }
          }
          shared ??= await newAppPage(browser, kind, undefined);
          page = shared;
        } else {
          page = await newAppPage(browser, kind, scenario);
          owned = true;
        }
        try {
          if (kind === "new" && scenario.removedInNewApp) {
            // The task removes this feature (license, subscription, cloud):
            // the new app must show no trace of it instead of matching.
            if (SABOTAGE) throw new Error(`${scenario.id}: sabotaged`);
            await scenario.removedInNewApp({ page, kind }, scenario.args);
            return;
          }
          let actual = await runScenario(page, kind, scenario);
          if (SABOTAGE) actual = sabotage(actual, scenario);
          if (kind === "old" && RECORDING) {
            writeExpected(scenario, actual);
            return;
          }
          const exception = kind === "new" ? exceptionFor(scenario.id) : undefined;
          if (exception) {
            // The new app deliberately differs here. It must match the
            // recorded correct behaviour, and that must differ from the old.
            assertExceptionIsDocumented(exception);
            const fixed = readExpected(scenario, ".fixed");
            expect(
              fixed,
              `missing ${scenario.id}.fixed expected file for ${exception.bug}`,
            ).toBeDefined();
            const old = readExpected(scenario);
            expect(
              old && fixed && old.equals(fixed),
              `${exception.bug}: .fixed equals the old output`,
            ).toBe(false);
            assertSameOutput(scenario, fixed as StoredOutput, actual, kind);
            return;
          }
          const expected = readExpected(scenario);
          expect(
            expected,
            `no expected output recorded for ${scenario.id}; run npm run parity:record`,
          ).toBeDefined();
          assertSameOutput(scenario, expected as StoredOutput, actual, kind);
        } finally {
          if (owned) await page.context().close();
          await ownBrowser?.close();
        }
      });
    }
  });
}

/**
 * Defines the tests for a list of scenarios:
 * - "old app" tests check the old app still produces the recorded output
 *   (or record it with GD_RECORD=1);
 * - "new app" tests check the new app produces the same output.
 */
export function paritySuite(
  name: string,
  scenarios: readonly Scenario[],
  options: SuiteOptions,
): void {
  const ids = new Set<string>();
  for (const s of scenarios) {
    if (ids.has(s.id)) throw new Error(`duplicate scenario id ${s.id}`);
    ids.add(s.id);
  }
  test.describe(name, () => {
    defineSide("old", scenarios);
    if (RECORDING) return;
    const enabled = options.newApp;
    if (Array.isArray(enabled)) {
      const unknown = enabled.filter((id) => !ids.has(id));
      if (unknown.length > 0) {
        throw new Error(`unknown scenario ids in newApp: ${unknown.join(", ")}`);
      }
    }
    const ported = portedScenarioIds();
    const list = scenarios.filter(
      (s) =>
        enabled === true || (Array.isArray(enabled) && enabled.includes(s.id)) || ported.has(s.id),
    );
    if (list.length > 0) defineSide("new", list);
  });
}

let ported: Set<string> | undefined;

/**
 * Scenario ids listed in parity/ported/*.json. Each port cluster keeps its
 * own file there (an array of scenario ids), so parallel work never edits
 * the same suite file just to enable comparisons.
 */
export function portedScenarioIds(): Set<string> {
  if (ported) return ported;
  ported = new Set();
  const dir = path.join(NEXT_ROOT, "parity", "ported");
  if (!fs.existsSync(dir)) return ported;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const list = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as unknown;
    if (!Array.isArray(list) || list.some((id) => typeof id !== "string")) {
      throw new Error(`parity/ported/${file} must be an array of scenario ids`);
    }
    for (const id of list as string[]) ported.add(id);
  }
  return ported;
}
