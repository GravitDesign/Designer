import type { Page } from "@playwright/test";
import { PARITY_CONTEXT, isolateNetwork, openApp, type OpenOptions } from "../../support/apps.ts";
import type { Scenario, ScenarioContext } from "../../support/scenario.ts";
import { buildFixture, type Fixture } from "./fixture.ts";
import { readCursor, normalizeIds, replay, settle, type Pt, type Step } from "./steps.ts";

/** One recorded input sequence. */
export interface ToolCase {
  /** Id below "editor-tools/", e.g. "shapes/rectangle-plain". */
  id: string;
  covers: readonly string[];
  fixture?: Fixture;
  steps: readonly Step[];
  /**
   * View state before the fixture is built: zoom and the view pixel where
   * scene (0, 0) appears. Default zoom 1 with the origin at (400, 200),
   * inside the canvas area between the left and right panels.
   */
  view?: { zoom: number; origin: Pt };
  /** Keep the view the app chose on open instead of setting one. */
  keepInitialView?: boolean;
  /** App open options (settings ...), merged with { newDocument: true }. */
  open?: OpenOptions;
  /** Open the app in a browser context with touch support. */
  touch?: boolean;
  /**
   * File the case opens (path from the repo root); its ids are kept unchanged in
   * the output (Scenario.keepIdsOf).
   */
  keepIdsOf?: string;
  /** Include the final document in the output (default true). */
  doc?: boolean;
  timeout?: number;
}

export const DEFAULT_VIEW = { zoom: 1, origin: [400, 200] as Pt };

async function waitForFonts(page: Page): Promise<void> {
  const ready = (): Promise<boolean> =>
    page.evaluate(() =>
      (
        window as unknown as { __parity: { app: { editorTools: { fontsReady(): boolean } } } }
      ).__parity.app.editorTools.fontsReady(),
    );
  for (let i = 0; i < 600; i++) {
    if (await ready()) return;
    await page.waitForTimeout(100);
  }
  const fonts = await page.evaluate(() => document.fonts.status);
  throw new Error(`fonts not ready after 60 s (document.fonts.status ${fonts})`);
}

async function prepare(page: Page, c: ToolCase): Promise<void> {
  await waitForFonts(page);
  const view = c.view ?? DEFAULT_VIEW;
  if (!c.keepInitialView)
    await page.evaluate(
      ({ zoom, origin }) => {
        (
          window as unknown as {
            __parity: {
              app: { editorTools: { prepareView(z: number, x: number, y: number): void } };
            };
          }
        ).__parity.app.editorTools.prepareView(zoom, origin[0], origin[1]);
      },
      { zoom: view.zoom, origin: view.origin },
    );
  if (c.fixture) {
    const source = buildFixture.toString();
    await page.evaluate(
      async ({ source: fnSource, spec }) => {
        // Sent as source text so the same builder runs in both apps.
        const fn = (0, eval)(`(${fnSource})`) as (p: unknown, a: unknown) => Promise<void>;
        await fn((window as unknown as { __parity: unknown }).__parity, spec);
      },
      { source, spec: c.fixture as unknown },
    );
  }
  await waitForFonts(page);
  await settle(page);
}

async function openTouchPage(
  page: Page,
  c: ToolCase,
  kind: ScenarioContext["kind"],
): Promise<Page> {
  const browser = page.context().browser();
  if (!browser) throw new Error("no browser");
  const context = await browser.newContext({
    ...PARITY_CONTEXT,
    viewport: { width: 1600, height: 1000 },
    hasTouch: true,
  });
  await isolateNetwork(context);
  const touchPage = await context.newPage();
  await openApp(touchPage, kind, { newDocument: true, ...c.open });
  return touchPage;
}

export function toScenario(c: ToolCase): Scenario {
  const hasShot = c.steps.some((s) => s.op === "shot");
  // A PNG case stores only its screenshot, so a probe in it would be lost.
  if (hasShot && c.steps.some((s) => s.op === "probe")) {
    throw new Error(`${c.id}: a screenshot case can't have probes; split it into two cases`);
  }
  // With the fake clock paused no animation frame runs, so the final state
  // of a JSON case could never settle.
  if (!hasShot && c.steps.some((s) => s.op === "pauseClock")) {
    throw new Error(`${c.id}: pauseClock is only for screenshot cases`);
  }
  return {
    id: `editor-tools/${c.id}`,
    covers: c.covers,
    kind: hasShot ? "png" : "document",
    keepIdsOf: c.keepIdsOf,
    // A driver scenario always gets its own page; `open` only adds settings.
    open: c.open,
    timeout: c.timeout ?? 120_000,
    driver: async ({ page, kind }) => {
      const since = Date.now();
      const target = c.touch ? await openTouchPage(page, c, kind) : page;
      try {
        await prepare(target, c);
        const result = await replay(target, c.steps);
        if (hasShot) {
          if (!result.shot) throw new Error(`${c.id}: no screenshot taken`);
          return result.shot;
        }
        // Some tools finish on a timer (notifyJobDone, inline editor close);
        // give them time before the final state is read.
        await target.waitForTimeout(200);
        await settle(target);
        const final = await target.evaluate(() => {
          const hooks = (
            window as unknown as {
              __parity: { app: { editorTools: { state(): unknown; document(): unknown } } };
            }
          ).__parity.app.editorTools;
          return { state: hooks.state(), doc: hooks.document() };
        });
        const out = {
          final: { state: final.state, cursor: await readCursor(target) },
          probes: result.probes,
          doc: c.doc === false ? null : final.doc,
        };
        return JSON.stringify(normalizeIds(out, since));
      } finally {
        if (target !== page) await target.context().close();
      }
    },
  };
}
