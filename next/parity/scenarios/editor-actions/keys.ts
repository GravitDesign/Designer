import type { Page } from "@playwright/test";
import { normalizeDocumentString } from "../../support/normalize.ts";
import { runProbe, type ProbeArgs, type Loose } from "./lib.ts";

/**
 * Pseudo key for KeyCheck.keys: empties the app's internal clipboard, so a
 * following paste has to come from the system clipboard.
 */
export const CLEAR_INTERNAL_CLIPBOARD = "<clear-internal-clipboard>";

/**
 * One keyboard check: build `setup`, press `keys` with real Playwright
 * keyboard input, wait until the state changed (or a no-change window
 * passed), then record what changed (same record as the execute path in
 * exec.spec.ts).
 *
 * Key strings use the Windows/Linux mapping of the old app's GKey
 * (META/COMMAND -> Control, OPTION -> Alt, REMOVE -> Delete), because the
 * tests run in Chromium on Windows. Each result also stores the platform
 * the old app detected, so a run on another OS shows up as a difference.
 * The mac mapping is checked separately (shortcuts.spec.ts, "mac").
 */
export interface KeyCheck {
  name: string;
  setup: string;
  /** Action whose state is recorded (optional for tool keys). */
  id?: string;
  /** Arguments to page.keyboard.press, pressed one after the other. */
  keys: string[];
  /**
   * Wait until the previous key changed the state before pressing the
   * next one. For two-stroke and opacity shortcuts, whose first key acts
   * only after the 500 ms SHORTCUT_DELAY: the next key must come after it.
   */
  stepwise?: boolean;
  /** Extra probe options (view, settings, shell, ...). */
  args?: Partial<ProbeArgs>;
  /** Focus a text input of the inspector before pressing the keys. */
  inInput?: boolean;
  /** Driver step after the setup and before the keys (e.g. clicking a Layers row). */
  prepare?: (page: Page) => Promise<void>;
  /** Extra driver step after the keys (e.g. dispatching a paste event); its result is recorded. */
  act?: (page: Page) => Promise<unknown>;
}

/**
 * How long a check waits for a change before it records "nothing
 * happened". Far longer than any timer the old app uses for a key (the
 * 500 ms SHORTCUT_DELAY), so a slow machine still sees the change.
 */
export const NO_CHANGE_WINDOW = 3000;

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

/** Waits for `n` animation frames, so the view has painted what changed. */
export async function frames(page: Page, n = 2): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const step = () => (++i >= count ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    n,
  );
}

/** The probe's state signature (document, selection, undo, view, tool, clipboard, dialogs). */
export async function signature(page: Page, base: ProbeArgs): Promise<string> {
  // Random ids are renamed as in the recorded output: some nodes get a new
  // reference id on every serialize, which is not a change of state.
  return normalizeDocumentString(await runProbe(page, { ...base, phase: "signature" }));
}

/**
 * Waits until the state differs from `before`, then until it stops
 * changing (three equal signatures in a row). Returns false when nothing
 * changed within NO_CHANGE_WINDOW.
 */
export async function waitForChange(
  page: Page,
  base: ProbeArgs,
  before: string,
  windowMs = NO_CHANGE_WINDOW,
): Promise<boolean> {
  const t0 = Date.now();
  let current = await signature(page, base);
  while (current === before) {
    if (Date.now() - t0 > windowMs) return false;
    await page.waitForTimeout(50);
    current = await signature(page, base);
  }
  let stable = 0;
  const t1 = Date.now();
  while (stable < 2) {
    await page.waitForTimeout(50);
    const next = await signature(page, base);
    if (next !== current && Date.now() - t1 > 15_000) {
      const a = JSON.parse(current) as Record<string, unknown>;
      const b = JSON.parse(next) as Record<string, unknown>;
      const keys = Object.keys(b).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      const firstDiff = (x: unknown, y: unknown, path: string): string => {
        if (JSON.stringify(x) === JSON.stringify(y)) return "";
        if (x && y && typeof x === "object" && typeof y === "object") {
          for (const k of Object.keys(y as object)) {
            const d = firstDiff(
              (x as Record<string, unknown>)[k],
              (y as Record<string, unknown>)[k],
              `${path}.${k}`,
            );
            if (d) return d;
          }
        }
        return `${path}: ${JSON.stringify(x)?.slice(0, 200)} -> ${JSON.stringify(y)?.slice(0, 200)}`;
      };
      throw new Error(
        `state keeps changing after the action: ${keys.join(", ")} (${firstDiff(a, b, "")})`,
      );
    }
    stable = next === current ? stable + 1 : 0;
    current = next;
  }
  return true;
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

async function pressKey(page: Page, key: string): Promise<void> {
  if (key === CLEAR_INTERNAL_CLIPBOARD) {
    await page.evaluate(() =>
      (
        window as unknown as { __parity: { app: Loose } }
      ).__parity.app.editorActions.clipboardClear(),
    );
  } else {
    await page.keyboard.press(key);
  }
}

export async function runKeyChecks(page: Page, checks: KeyCheck[]): Promise<string> {
  const results: Record<string, unknown> = { platform: await platform(page) };
  // Browser-level effects of a key: file pickers, downloads, popups,
  // native dialogs. None should happen for these checks; any that does is
  // recorded with the check.
  let events: string[] = [];
  page.on("filechooser", (fc) => events.push(`filechooser multiple=${fc.isMultiple()}`));
  page.on("download", (d) => events.push(`download ${d.suggestedFilename()}`));
  page.on("popup", (p) => events.push(`popup ${p.url()}`));
  page.on("dialog", (d) => {
    events.push(`dialog ${d.type()} ${d.message()}`);
    void d.dismiss();
  });
  for (const c of checks) {
    if (process.env.GD_EA_DEBUG) console.log(`[ea] ${c.name}`);
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
    events = [];
    const before = await signature(page, base);
    let previous = before;
    for (let i = 0; i < c.keys.length; i++) {
      if (i > 0 && c.stepwise) {
        await waitForChange(page, base, previous);
        previous = await signature(page, base);
      }
      await pressKey(page, c.keys[i] as string);
    }
    let actResult: unknown;
    if (c.act) actResult = await c.act(page);
    // Stepwise checks wait for the last key's own effect (it may come
    // after the 500 ms delay); the others for any change since the setup.
    const changed = c.stepwise
      ? (await waitForChange(page, base, previous)) || previous !== before
      : await waitForChange(page, base, before);
    if (c.inInput) {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
    const r = JSON.parse(await runProbe(page, { ...base, phase: "after" })) as Record<
      string,
      unknown
    >;
    results[c.name] = {
      keys: c.keys,
      changed,
      ...(focused === undefined ? {} : { focusedInput: focused }),
      ...(actResult === undefined ? {} : { actResult }),
      ...(events.length ? { events } : {}),
      ...r,
    };
  }
  return JSON.stringify(results);
}
