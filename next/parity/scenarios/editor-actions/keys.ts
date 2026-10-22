import type { Page } from "@playwright/test";
import { runProbe, type ProbeArgs, type Loose } from "./lib.ts";

/**
 * One keyboard check: build `setup`, press `keys` with real Playwright
 * keyboard input, wait, then record what changed (same record as the
 * execute path in exec.spec.ts).
 *
 * Key strings use the Windows/Linux mapping of the old app's GKey
 * (META/COMMAND -> Control, OPTION -> Alt, REMOVE -> Delete), because the
 * tests run in Chromium on Windows. Each result also stores the platform
 * the old app detected, so a run on another OS shows up as a difference.
 */
export interface KeyCheck {
  name: string;
  setup: string;
  /** Action whose state is recorded (optional for tool keys). */
  id?: string;
  /** Arguments to page.keyboard.press, pressed one after the other. */
  keys: string[];
  /** Milliseconds to wait between keys (default 30). */
  gap?: number;
  /** Milliseconds to wait after the last key (default 100). */
  wait?: number;
  /** Extra probe options (view, settings, shell, ...). */
  args?: Partial<ProbeArgs>;
  /** Focus a text input of the inspector before pressing the keys. */
  inInput?: boolean;
  /** Driver step after the setup and before the keys (e.g. clicking a Layers row). */
  prepare?: (page: Page) => Promise<void>;
  /** Extra driver step after the keys (e.g. dispatching a paste event); its result is recorded. */
  act?: (page: Page) => Promise<unknown>;
}

/** Waits for the old app's SHORTCUT_DELAY (500 ms) plus margin. */
export const AFTER_DELAY = 800;

export async function platform(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const G = (window as unknown as { __parity: { G: Record<string, Loose> } }).__parity.G;
    return {
      userAgentHasWindows: navigator.userAgent.includes("Windows"),
      operatingSystem: G.GSystem ? G.GSystem.operatingSystem : null,
      hardware: G.GSystem ? G.GSystem.hardware : null,
    };
  });
}

async function focusInput(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll("input[type=text], input:not([type])"),
    ).filter((i) => (i as HTMLElement).offsetParent !== null) as HTMLInputElement[];
    const input = inputs[0];
    if (!input) return false;
    input.focus();
    return document.activeElement === input;
  });
}

export async function runKeyChecks(page: Page, checks: KeyCheck[]): Promise<string> {
  const results: Record<string, unknown> = { platform: await platform(page) };
  for (const c of checks) {
    await page.evaluate(() => {
      (
        window as unknown as { __parity: { app: { newInfiniteDocument(): void } } }
      ).__parity.app.newInfiniteDocument();
    });
    const base: ProbeArgs = { setup: c.setup, id: c.id, ...c.args };
    await runProbe(page, { ...base, phase: "setup" });
    if (c.prepare) await c.prepare(page);
    let focused: boolean | undefined;
    if (c.inInput) focused = await focusInput(page);
    for (let i = 0; i < c.keys.length; i++) {
      if (i > 0) await page.waitForTimeout(c.gap ?? 30);
      await page.keyboard.press(c.keys[i] as string);
    }
    let actResult: unknown;
    if (c.act) actResult = await c.act(page);
    await page.waitForTimeout(c.wait ?? 100);
    if (c.inInput) {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
    const r = JSON.parse(await runProbe(page, { ...base, phase: "after" })) as Record<
      string,
      unknown
    >;
    results[c.name] = {
      keys: c.keys,
      ...(focused === undefined ? {} : { focusedInput: focused }),
      ...(actResult === undefined ? {} : { actResult }),
      ...r,
    };
  }
  return JSON.stringify(results);
}
