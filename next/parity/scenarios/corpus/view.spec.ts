// The canvas view with corpus documents: paint modes (outline, fast,
// output), the repaint paths that a full render bypasses (pan reuse,
// partial repaint, the per-zoom tile cache, low quality while panning),
// effects when zoomed in far, wheel zoom, a retina screen, and full window
// shots in both themes. Each runs with real input or the app's actions.
import type { Page } from "@playwright/test";
import { PARITY_CONTEXT, isolateNetwork, openApp } from "../../support/apps.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { zoomAndMeasure } from "./corpus-scenarios.ts";
import {
  canvasArea,
  corpusFile,
  focusCanvas,
  openFile,
  settle,
  stableScreenshot,
  stack,
  type Clip,
} from "./lib.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
type Loose = any;
type ParityPage = Window & { __parity: { G: Loose; app: Loose } };

async function execute(page: Page, id: string): Promise<void> {
  await page.evaluate((a) => (window as unknown as ParityPage).__parity.app.execute(a), id);
}

/** Paint mode of the active view and what the app stored about it. */
async function viewState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const { app } = (window as unknown as ParityPage).__parity;
    const config = app.view().getViewConfiguration();
    // What the app persisted: localStorage keys and settings about the mode.
    const stored: Record<string, unknown> = {};
    const pick = /outline|fast|paint-?mode/i;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (pick.test(key)) stored[key] = localStorage.getItem(key);
    }
    const settings = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
      string,
      unknown
    >;
    for (const [key, value] of Object.entries(settings)) {
      if (pick.test(key)) stored["designer.settings " + key] = value;
    }
    return {
      paintMode: config.paintMode,
      defaultEffectDetailLevel: config.defaultEffectDetailLevel ?? null,
      stored,
    };
  });
}

/** A full repaint from scratch of `clip`, for comparing with a partial one. */
async function fullRepaint(page: Page, clip: Clip): Promise<Buffer> {
  await page.evaluate(async () => {
    const { app } = (window as unknown as ParityPage).__parity;
    app.view().cleanCache();
    app.view().invalidate(null, true);
    await app.corpus.settle();
  });
  return stableScreenshot(page, clip);
}

/** The middle of the view box, in page pixels. */
async function viewCenter(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const { app } = (window as unknown as ParityPage).__parity;
    const vb = app.view().getViewBox(true);
    return {
      x: Math.round(vb.getX() + vb.getWidth() / 2),
      y: Math.round(vb.getY() + vb.getHeight() / 2),
    };
  });
}

/** Pans with Space + drag (the temporary hand tool), leaving the button down. */
async function startPan(page: Page, dx: number, dy: number): Promise<void> {
  const c = await viewCenter(page);
  await page.mouse.move(c.x, c.y);
  await page.keyboard.down("Space");
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(c.x + (dx * i) / steps, c.y + (dy * i) / steps);
  }
}

async function endPan(page: Page): Promise<void> {
  await page.mouse.up();
  await page.keyboard.up("Space");
}

const scenarios: Scenario[] = [
  {
    id: "corpus/view/outline-view",
    covers: ["EDT-RENDER-004", "EDT-RENDER-007", "EDT-RENDER-008", "EDT-PCTX-002", "EDT-PCTX-003"],
    kind: "png",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("structure-groups-layers"));
      const clip = await zoomAndMeasure(page, 1);
      await focusCanvas(page);
      await page.keyboard.press("Alt+KeyY");
      await settle(page);
      const outline = await stableScreenshot(page, clip);
      await page.keyboard.press("Alt+KeyY");
      await settle(page);
      return stack([outline, await stableScreenshot(page, clip)]);
    },
  },
  {
    id: "corpus/view/outline-view-state",
    covers: ["EDT-RENDER-002", "EDT-RENDER-004", "EDT-RENDER-008", "EDT-RENDER-010"],
    kind: "json",
    driver: async ({ page }) => {
      const out: Record<string, unknown>[] = [];
      for (const name of ["structure-groups-layers", "pages-settings"]) {
        await openFile(page, corpusFile(name));
        await focusCanvas(page);
        const before = await viewState(page);
        await page.keyboard.press("Alt+KeyY");
        const on = await viewState(page);
        await page.keyboard.press("Alt+KeyY");
        out.push({ name, before, on, off: await viewState(page) });
      }
      return out;
    },
  },
  {
    id: "corpus/view/fast-view",
    covers: ["EDT-RENDER-002", "EDT-RENDER-009", "EDT-RENDER-015"],
    kind: "png",
    timeout: 300_000,
    driver: async ({ page }) => {
      await openFile(page, corpusFile("effects-webgl-1"));
      const clip = await zoomAndMeasure(page, 1);
      const full = await stableScreenshot(page, clip);
      await execute(page, "view.fast-view");
      await settle(page);
      const fast = await stableScreenshot(page, clip);
      if (fast.equals(full)) throw new Error("fast-view: the fast view looks like the full one");
      return stack([full, fast]);
    },
  },
  {
    id: "corpus/view/fast-view-state",
    covers: ["EDT-RENDER-009"],
    kind: "json",
    driver: async ({ page }) => {
      const out: Record<string, unknown>[] = [];
      for (const name of ["shapes-rectangles", "pages-settings"]) {
        await openFile(page, corpusFile(name));
        await execute(page, "view.fast-view");
        const on = await viewState(page);
        await execute(page, "view.fast-view");
        out.push({ name, on, off: await viewState(page) });
      }
      return out;
    },
  },
  {
    // The page's "clip content" button in the inspector switches between
    // Output (content clipped to the page) and Full.
    id: "corpus/view/clip-content",
    covers: ["EDT-RENDER-002", "EDT-RENDER-004", "EDT-RENDER-010"],
    kind: "png",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("pages-settings"));
      const clip = await zoomAndMeasure(page, 1);
      const shots = [await stableScreenshot(page, clip)];
      const button = page.locator('button[data-property="clip-content"]');
      for (let i = 0; i < 2; i++) {
        await button.click();
        await settle(page);
        shots.push(await stableScreenshot(page, clip));
      }
      return stack(shots);
    },
  },
  {
    // Ctrl+wheel zooms in steps that snap to the zoom stops and clamp at
    // the minimum and maximum zoom; a plain wheel scrolls, Shift+wheel
    // scrolls sideways.
    id: "corpus/view/wheel",
    covers: [
      "EDT-RENDER-022",
      "EDT-RENDER-029",
      "EDT-RENDER-023",
      "EDT-RENDER-028",
      "EDT-RENDER-030",
      "EDT-RENDER-039",
    ],
    kind: "json",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("shapes-rectangles"));
      const read = () =>
        page.evaluate(async () => {
          const { app } = (window as unknown as ParityPage).__parity;
          // The view handles a wheel event right away and repaints on the
          // next frame.
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const v = app.view();
          return [v.getZoom(), v.getScrollX(), v.getScrollY()];
        });
      const c = await viewCenter(page);
      await page.mouse.move(c.x + 37, c.y - 23);
      const zoomIn: unknown[] = [];
      const zoomOut: unknown[] = [];
      await page.keyboard.down("Control");
      for (let i = 0; i < 40; i++) {
        await page.mouse.wheel(0, -100);
        zoomIn.push(await read());
      }
      for (let i = 0; i < 60; i++) {
        await page.mouse.wheel(0, 100);
        zoomOut.push(await read());
      }
      await page.keyboard.up("Control");
      await page.evaluate(async () => {
        const { G, app } = (window as unknown as ParityPage).__parity;
        app.view().zoomAtCenter(new G.GPoint(300, 200), 1);
        await app.corpus.settle();
      });
      const scroll: unknown[] = [await read()];
      await page.mouse.wheel(0, 120);
      scroll.push(await read());
      await page.mouse.wheel(45, 0);
      scroll.push(await read());
      await page.keyboard.down("Shift");
      await page.mouse.wheel(0, 90);
      scroll.push(await read());
      await page.keyboard.up("Shift");
      const api = await page.evaluate(() => {
        const { G, app } = (window as unknown as ParityPage).__parity;
        const v = app.view();
        const at = () => [v.getZoom(), v.getScrollX(), v.getScrollY()];
        const out: Record<string, unknown> = {};
        out.scrollSmall = [v.scrollBy(0.4, -0.5), at()];
        out.scrollBig = [v.scrollBy(10.6, -3.2), at()];
        v.zoomAll(new G.GRect(-50, 20, 900, 300), false);
        out.zoomAll = at();
        v.zoomAll(new G.GRect(0, 0, 40, 30), true);
        out.zoomAllReduceOnly = at();
        v.zoomAll(new G.GRect(0, 0, 40, 30), false);
        out.zoomAllSmall = at();
        v.zoomAt(new G.GPoint(10, 10), 3.3);
        out.zoomAt = at();
        v.zoomAtCenter(new G.GPoint(0, 0), 1000);
        out.zoomAtCenterMax = at();
        v.zoomAtCenter(new G.GPoint(0, 0), 0.001);
        out.zoomAtCenterMin = at();
        v.transform(12.5, -40.25, 1.75);
        out.transform = at();
        return out;
      });
      return { zoomIn, zoomOut, scroll, api };
    },
  },
  {
    // A pan, and changing two elements, which repaints only their dirty
    // areas. Each is followed by a full repaint of the same area for
    // comparison. The view renders everything again 100 ms after a pan
    // stops, even with the button still down, so a settled shot cannot show
    // the reused pixels of the pan itself; that stays unchecked.
    id: "corpus/view/pan-and-partial-repaint",
    covers: [
      "EDT-RENDER-032",
      "EDT-RENDER-033",
      "EDT-RENDER-045",
      "EDT-RENDER-046",
      "EDT-RENDER-042",
    ],
    kind: "png",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("fills-colors"));
      const clip = await zoomAndMeasure(page, 1);
      await focusCanvas(page);
      // The shot while the button is still down shows the moved pixels plus
      // the freshly rendered strips; after the release the view renders
      // everything again, which the second shot shows.
      await startPan(page, 137, 61);
      await settle(page);
      const panned = await stableScreenshot(page, clip);
      await endPan(page);
      await settle(page);
      const pannedFull = await fullRepaint(page, clip);
      await page.evaluate(async () => {
        const { G, app } = (window as unknown as ParityPage).__parity;
        const pg = app.scene().getActivePage();
        let n = 0;
        for (let c = pg.getFirstChild(); c; c = c.getNext()) {
          if (!(c instanceof G.GShape)) continue;
          // Move one shape and fade another: two separate dirty areas.
          if (n === 1) c.transform(new G.GTransform(1, 0, 0, 1, 23, 7));
          if (n === 3) c.setProperty("_stop", 0.35);
          n++;
        }
        await app.corpus.settle();
      });
      const partial = await stableScreenshot(page, clip);
      return stack([panned, pannedFull, partial, await fullRepaint(page, clip)]);
    },
  },
  {
    // Zooming back to a zoom level that is still cached draws from that
    // level's tiles.
    id: "corpus/view/zoom-cache",
    covers: ["EDT-RENDER-044", "EDT-RENDER-042"],
    kind: "png",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("fills-gradients"));
      const clip = await zoomAndMeasure(page, 1);
      await page.evaluate(async () => {
        const { app } = (window as unknown as ParityPage).__parity;
        const { G } = (window as unknown as ParityPage).__parity;
        const v = app.view();
        const pg = app.scene().getActivePage();
        const p = pg
          .getPaintBBox()
          .getSide(G.GRect.Side.CENTER)
          .add(pg.getPosition(v.getViewConfiguration().multiPageView));
        v.zoomAtCenter(p, 2);
        await app.corpus.settle();
        v.zoomAtCenter(p, 0.5);
        await app.corpus.settle();
        v.zoomAtCenter(p, 1);
        await app.corpus.settle();
      });
      const cached = await stableScreenshot(page, clip);
      return stack([cached, await fullRepaint(page, clip)]);
    },
  },
  {
    // Beyond 600% the view skips effects (fx cache on, not forced).
    id: "corpus/view/effects-zoomed-in",
    covers: ["EDT-RENDER-015", "EDT-RENDER-003"],
    kind: "png",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("effects-shadows"));
      const shots: Buffer[] = [];
      for (const z of [6, 8])
        shots.push(await stableScreenshot(page, await zoomAndMeasure(page, z)));
      return stack(shots);
    },
  },
  {
    // Changing an effect redraws the element with the new effect instead
    // of the cached result.
    id: "corpus/view/effect-cache",
    covers: ["EDT-RENDER-018", "EDT-RENDER-017"],
    kind: "png",
    driver: async ({ page }) => {
      await openFile(page, corpusFile("effects-shadows"));
      const clip = await zoomAndMeasure(page, 1);
      const changed = await page.evaluate(async () => {
        const { G, app } = (window as unknown as ParityPage).__parity;
        const pg = app.scene().getActivePage();
        const names: string[] = [];
        for (let c = pg.getFirstChild(); c; c = c.getNext()) {
          const fx = c.getEffects?.()?.getFirstChild();
          if (!(fx instanceof G.GDropShadowEffect)) continue;
          fx.setProperties(["x", "y", "r"], [-14, 18, 2]);
          names.push(String(c));
          if (names.length === 2) break;
        }
        await app.corpus.settle();
        return names.length;
      });
      if (changed !== 2) throw new Error(`effect-cache: changed ${changed} drop shadows, not 2`);
      return stack([await stableScreenshot(page, clip), await fullRepaint(page, clip)]);
    },
  },
  {
    // A 2x screen: canvases get twice the pixels, editor handles and
    // outlines are scaled by the screen DPI.
    id: "corpus/view/retina",
    covers: ["EDT-PAINT-011", "EDT-RENDER-025", "EDT-RENDER-026", "EDT-RENDER-051"],
    kind: "png",
    driver: async ({ page, kind }) => {
      const browser = page.context().browser();
      if (!browser) throw new Error("retina: no browser");
      const context = await browser.newContext({
        ...PARITY_CONTEXT,
        deviceScaleFactor: 2,
        viewport: { width: 1600, height: 1000 },
        acceptDownloads: true,
      });
      try {
        await isolateNetwork(context);
        const retina = await context.newPage();
        await openApp(retina, kind, { newDocument: true });
        await openFile(retina, corpusFile("shapes-rectangles"));
        // zoomAndMeasure works in device pixels of a 1x screen, so the clip
        // here is a fixed CSS-pixel square around the content.
        await retina.evaluate(async () => {
          const { G, app } = (window as unknown as ParityPage).__parity;
          const pg = app.scene().getActivePage();
          app.view().zoomAtCenter(pg.getPaintBBox().getSide(G.GRect.Side.CENTER), 1);
          await app.corpus.settle();
        });
        const c = await viewCenter(retina);
        const clip = { x: c.x - 200, y: c.y - 150, width: 400, height: 300 };
        // Select everything, showing the handles and outlines.
        await focusCanvas(retina);
        await retina.keyboard.press("Control+KeyA");
        await settle(retina);
        const sizes = await retina.evaluate(() =>
          [...document.querySelectorAll("canvas")]
            .filter((el) => el.getBoundingClientRect().width > 100)
            .map((el) => [el.width, el.height, el.style.width, el.style.height].join(" ")),
        );
        const shot = await stableScreenshot(retina, clip);
        // Every canvas has twice the pixels of its CSS size.
        if (sizes.some((s) => !/^(\d+) (\d+) (\d+)px (\d+)px$/.test(s))) {
          throw new Error(`retina: unexpected canvas sizes ${sizes.join(", ")}`);
        }
        for (const s of sizes) {
          const [w, h, cw, ch] = s.split(" ").map((v) => parseInt(v, 10));
          if (w !== 2 * (cw ?? 0) || h !== 2 * (ch ?? 0)) {
            throw new Error(`retina: canvas ${s} is not twice its CSS size`);
          }
        }
        return shot;
      } finally {
        await context.close();
      }
    },
  },
  ...(["light", "dark"] as const).map((theme): Scenario => ({
    // The whole window at 25% and 400% with a document on fixed pages:
    // panels, rulers, the page edge with its shadow, the canvas
    // background and the page decoration, per theme.
    id: `corpus/window/${theme}`,
    covers: [
      "EDT-RENDER-019",
      "EDT-RENDER-048",
      "EDT-RENDER-049",
      "EDT-RENDER-050",
      "EDT-PAINT-009",
      "EDT-RENDER-047",
    ],
    kind: "png",
    open: { theme, settings: { rulers_visible: true } },
    driver: async ({ page }) => {
      await openFile(page, corpusFile("pages-settings"));
      const shots: Buffer[] = [];
      for (const z of [0.25, 4]) {
        await zoomAndMeasure(page, z);
        // Everything left of the inspector: its form controls have shown
        // sub-pixel differences between runs, and the ui area checks the
        // panels.
        const area = await canvasArea(page);
        shots.push(
          await stableScreenshot(page, {
            x: 0,
            y: 0,
            width: area.x + area.width,
            height: area.y + area.height,
          }),
        );
      }
      return stack(shots);
    },
  })),
];

paritySuite("corpus view", defineScenarios(scenarios), { newApp: false });
