import { PNG } from "pngjs";
import { test, expect, type Browser, type Page } from "@playwright/test";
import { isolateNetwork, openApp, type AppKind } from "./apps.ts";
import { RECORDING } from "./env.ts";
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
   * Whether the new app is compared yet. Suites start with false while the
   * feature is not ported; the final check requires true everywhere.
   */
  newApp: boolean;
}

/**
 * GD_PARITY_SABOTAGE=1 changes every output before it is compared. Every
 * comparison must then fail; `npm run parity:prove` checks that.
 */
const SABOTAGE = process.env.GD_PARITY_SABOTAGE === "1";

function sabotage(output: StoredOutput, scenario: Scenario): StoredOutput {
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
    !scenario.open?.fileSystemAccess
  );
}

async function newAppPage(
  browser: Browser,
  kind: AppKind,
  scenario: Scenario | undefined,
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
  });
  await isolateNetwork(context);
  const page = await context.newPage();
  await openApp(page, kind, { newDocument: true, ...scenario?.open });
  return page;
}

async function freshDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    const app = (window as unknown as { __parity: { app: { newInfiniteDocument(): void } } })
      .__parity.app;
    app.newInfiniteDocument();
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
        if (canSharePage(scenario)) {
          shared ??= await newAppPage(browser, kind, undefined);
          page = shared;
          await freshDocument(page);
        } else {
          page = await newAppPage(browser, kind, scenario);
          owned = true;
        }
        try {
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
    if (options.newApp && !RECORDING) defineSide("new", scenarios);
  });
}
