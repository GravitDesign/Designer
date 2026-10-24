// Test runner for the desktop (Electron) scenarios. A browser parity
// scenario gets a page from paritySuite; a desktop scenario starts the
// desktop app itself (launcher.ts), often several times, so it gets the app
// kind and a temp sandbox instead. Outputs are stored and compared exactly
// like paritySuite's (support/runner.ts): recorded from the old desktop app
// with GD_RECORD=1, compared for the old app always and for the new app once
// it is enabled (`newApp`, or listed in parity/ported/*.json).
//
// All desktop scenarios share one fixed port (47823), so they run one at a
// time: keep them in one spec file (a file's tests run in order in one
// worker, since the config has fullyParallel off).
import { PNG } from "pngjs";
import { expect, test } from "@playwright/test";
import type { AppKind } from "../../support/apps.ts";
import { RECORDING } from "../../support/env.ts";
import { assertExceptionIsDocumented, exceptionFor } from "../../support/exceptions.ts";
import {
  assertSameOutput,
  readExpected,
  storeOutput,
  writeExpected,
  type StoredOutput,
} from "../../support/runner.ts";
import type { Scenario, ScenarioKind } from "../../support/scenario.ts";
import { portedScenarioIds } from "../../support/suite.ts";
import { createSandbox, type Sandbox } from "./launcher.ts";

export interface DesktopContext {
  /** Which desktop app to start: "old" (electron-main.js) or "new" (dist-electron/main.js). */
  kind: AppKind;
  /** A fresh temp folder for this test: profile, fake home folders, main-process log. */
  sandbox: Sandbox;
  /** Another fresh sandbox, for scenarios that need a second profile. */
  newSandbox(label: string): Sandbox;
}

export interface DesktopScenario {
  /** expected/<id>.<ext>; ids start with "electron/". */
  id: string;
  covers: readonly string[];
  kind: ScenarioKind;
  run(context: DesktopContext): Promise<unknown>;
  /** As in support/scenario.ts: the new app must show no trace of the feature. */
  removedInNewApp?(context: DesktopContext): Promise<void>;
  timeout?: number;
}

const SABOTAGE = process.env.GD_PARITY_SABOTAGE === "1";

/** Same change paritySuite makes under GD_PARITY_SABOTAGE (support/suite.ts). */
function sabotage(output: StoredOutput, kind: ScenarioKind): StoredOutput {
  if (kind === "png") {
    const image = PNG.sync.read(output);
    image.data[0] = (image.data[0] ?? 0) ^ 0xff;
    return PNG.sync.write(image);
  }
  return Buffer.concat([output, Buffer.from(" ")]);
}

function asScenario(s: DesktopScenario): Scenario {
  return { id: s.id, covers: s.covers, kind: s.kind };
}

function defineSide(kind: AppKind, scenarios: readonly DesktopScenario[]): void {
  test.describe(`${kind} app`, () => {
    for (const scenario of scenarios) {
      test(scenario.id, async () => {
        test.setTimeout(scenario.timeout ?? 180_000);
        const sandboxes: Sandbox[] = [];
        const newSandbox = (label: string) => {
          const s = createSandbox(label);
          sandboxes.push(s);
          return s;
        };
        const context: DesktopContext = { kind, sandbox: newSandbox("test"), newSandbox };
        try {
          if (kind === "new" && scenario.removedInNewApp) {
            if (SABOTAGE) throw new Error(`${scenario.id}: sabotaged`);
            await scenario.removedInNewApp(context);
            return;
          }
          const s = asScenario(scenario);
          let actual = storeOutput(s, await scenario.run(context));
          if (SABOTAGE) actual = sabotage(actual, scenario.kind);
          if (kind === "old" && RECORDING) {
            writeExpected(s, actual);
            return;
          }
          const exception = kind === "new" ? exceptionFor(scenario.id) : undefined;
          if (exception) {
            // As in paritySuite: a fixed old bug is compared against the
            // recorded correct output, which must differ from the old one.
            assertExceptionIsDocumented(exception);
            const fixed = readExpected(s, ".fixed");
            expect(fixed, `missing ${scenario.id}.fixed for ${exception.bug}`).toBeDefined();
            const old = readExpected(s);
            expect(
              old && fixed && old.equals(fixed),
              `${exception.bug}: .fixed equals the old output`,
            ).toBe(false);
            assertSameOutput(s, fixed as StoredOutput, actual, kind);
            return;
          }
          const expected = readExpected(s);
          expect(
            expected,
            `no expected output recorded for ${scenario.id}; record with GD_RECORD=1`,
          ).toBeDefined();
          assertSameOutput(s, expected as StoredOutput, actual, kind);
        } finally {
          for (const s of sandboxes) s.remove();
        }
      });
    }
  });
}

/** Defines the old-app (and, where enabled, new-app) tests for desktop scenarios. */
export function desktopSuite(
  name: string,
  scenarios: readonly DesktopScenario[],
  options: { newApp: boolean | readonly string[] },
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
    const ported = portedScenarioIds();
    const list = scenarios.filter(
      (s) =>
        enabled === true || (Array.isArray(enabled) && enabled.includes(s.id)) || ported.has(s.id),
    );
    if (list.length > 0) defineSide("new", list);
  });
}
