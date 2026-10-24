// Drag and drop onto the canvas (EDT-DND). Playwright cannot drag files
// from the OS, so the driver dispatches dragenter, dragover and drop events
// with a DataTransfer on the element under the drop point, the way the
// browser delivers them. The probe records the document and selection
// before and after (and after undo/redo of what the drop added).
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { frames, runKeyChecks, signature, waitForChange, type KeyCheck } from "./keys.ts";
import { runProbe, sceneToClient, type Loose, type ProbeArgs } from "./lib.ts";

interface DropData {
  /** Scene point of the drop. */
  at: [number, number];
  /** MIME type -> data; the special values build Gravit data in the page. */
  strings?: Record<string, string>;
  /** Serialize the node with this name as application/gravit+node. */
  nodeByName?: string;
  /** Serialize the first selected symbol (instance) as application/gravit+node. */
  selectedNode?: boolean;
  /** Pattern: an RGB colour serialized as application/gravit+pattern. */
  patternRgb?: [number, number, number];
  files?: { name: string; type: string; svg?: string; png?: [number, number] }[];
}

function drop(d: DropData): (page: Page) => Promise<unknown> {
  return async (page) => {
    const pt = await sceneToClient(page, d.at[0], d.at[1]);
    return page.evaluate(
      async ({ data, x, y }) => {
        const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
        const { G, app } = P;
        const dt = new DataTransfer();
        for (const [type, value] of Object.entries(data.strings ?? {})) dt.setData(type, value);
        if (data.nodeByName) {
          const node = app
            .scene()
            .getActivePage()
            .getChildren()
            .find((n: Loose) => n.getProperty("name") === data.nodeByName);
          dt.setData("application/gravit+node", G.GNode.serialize(node));
        }
        if (data.selectedNode)
          dt.setData("application/gravit+node", G.GNode.serialize(app.selection()[0]));
        if (data.patternRgb)
          dt.setData(
            "application/gravit+pattern",
            G.GPattern.serialize(new G.GRGBColor(data.patternRgb)),
          );
        for (const f of data.files ?? []) {
          let blob: Blob;
          if (f.svg) blob = new Blob([f.svg], { type: f.type });
          else {
            const c = document.createElement("canvas");
            c.width = (f.png as [number, number])[0];
            c.height = (f.png as [number, number])[1];
            const cx = c.getContext("2d") as CanvasRenderingContext2D;
            cx.fillStyle = "#0000ff";
            cx.fillRect(0, 0, c.width, c.height);
            blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b as Blob), "image/png"));
          }
          dt.items.add(new File([blob], f.name, { type: f.type }));
        }
        const target = document.elementFromPoint(x, y) as HTMLElement;
        const opts = { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true };
        const enter = new DragEvent("dragenter", opts);
        target.dispatchEvent(enter);
        const over = new DragEvent("dragover", opts);
        target.dispatchEvent(over);
        const dropEv = new DragEvent("drop", opts);
        target.dispatchEvent(dropEv);
        return {
          target: target.tagName,
          dragoverPrevented: over.defaultPrevented,
          dropEffect: dt.dropEffect,
          dropPrevented: dropEv.defaultPrevented,
        };
      },
      { data: d, x: pt.x, y: pt.y },
    );
  };
}

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#00ff00"/></svg>';
const C = { center: true } as const;

const checks: KeyCheck[] = [
  {
    name: "png-file",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], files: [{ name: "drop.png", type: "image/png", png: [30, 20] }] }),
    args: C,
  },
  {
    name: "svg-file",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], files: [{ name: "drop.svg", type: "image/svg+xml", svg: SVG }] }),
    args: C,
  },
  {
    name: "two-files",
    setup: "rect-nosel",
    keys: [],
    act: drop({
      at: [120, 120],
      files: [
        { name: "one.png", type: "image/png", png: [10, 10] },
        { name: "two.png", type: "image/png", png: [20, 10] },
      ],
    }),
    args: C,
  },
  {
    name: "unknown-file",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], files: [{ name: "notes.txt", type: "text/plain", svg: "hello" }] }),
    args: C,
  },
  {
    name: "node-on-empty-canvas",
    setup: "rect",
    keys: [],
    act: drop({ at: [400, 300], nodeByName: "A" }),
    args: C,
  },
  {
    name: "symbol-instance-node",
    setup: "symbol-instance",
    keys: [],
    act: drop({ at: [400, 300], selectedNode: true }),
    args: C,
  },
  {
    name: "pattern-on-fill",
    setup: "rect-border",
    keys: [],
    act: drop({ at: [150, 130], patternRgb: [255, 0, 128] }),
    args: C,
  },
  {
    name: "pattern-on-stroke",
    setup: "rect-border",
    keys: [],
    act: drop({ at: [100, 130], patternRgb: [0, 160, 0] }),
    args: C,
  },
  {
    name: "pattern-on-empty-canvas",
    setup: "rect-border",
    keys: [],
    act: drop({ at: [400, 400], patternRgb: [0, 160, 0] }),
    args: C,
  },
  {
    name: "font-family-on-text",
    setup: "text",
    keys: [],
    act: drop({ at: [110, 113], strings: { "application/font+family": "Noto Sans Arabic" } }),
    args: C,
  },
  {
    name: "plain-text",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], strings: { "text/plain": "Dropped text" } }),
    args: C,
  },
];

const scenarios: Scenario[] = [
  {
    id: "editor-actions/dnd/drops",
    covers: [
      "EDT-DND-001",
      "EDT-DND-002",
      "EDT-DND-003",
      "EDT-DND-004",
      "EDT-DND-005",
      "EDT-DND-006",
      "EDT-DND-007",
      "EDT-DND-008",
      "EDT-DND-009",
    ],
    kind: "document",
    timeout: 240_000,
    driver: ({ page }) => runKeyChecks(page, checks),
  },
];

/** Records the drag events (not drag/dragover) with their data types and pattern data. */
async function logDragEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __eaDrag?: unknown[] };
    w.__eaDrag = [];
    if ((window as unknown as { __eaDragHooked?: boolean }).__eaDragHooked) return;
    (window as unknown as { __eaDragHooked?: boolean }).__eaDragHooked = true;
    for (const type of ["draginit", "dragstart", "dragenter", "dragleave", "drop", "dragend"]) {
      window.addEventListener(
        type,
        (e) => {
          const dt = (e as DragEvent).dataTransfer;
          const t = e.target as HTMLElement | null;
          (w.__eaDrag as unknown[]).push({
            type,
            target: t && t.classList ? Array.from(t.classList).slice(0, 2).join(" ") : null,
            types: dt ? Array.from(dt.types) : null,
            pattern:
              dt && type === "drop" ? dt.getData("application/gravit+pattern") || null : undefined,
          });
        },
        true,
      );
    }
  });
}

const PREVIEW = ".fill-properties-panel .g-pattern-chooser .preview";

/**
 * Drags the fill swatch of the selected rectangle B (red) from the
 * inspector onto rectangle A, with the mouse or with touch. The swatch is
 * a pattern drag source (application/gravit+pattern); with touch the
 * DragDropTouch polyfill turns a press-and-hold and a move into drag
 * events. Records the drag events, the document and undo.
 */
async function swatchDrag(page: Page, touch: boolean): Promise<string> {
  const base: ProbeArgs = { setup: "eyedrop", center: true, options: { selectByName: "B" } };
  await runProbe(page, { ...base, phase: "setup" });
  await logDragEvents(page);
  const before = await signature(page, base);
  await page.locator(PREVIEW).first().waitFor();
  await frames(page);
  const box = await page.locator(PREVIEW).first().boundingBox();
  if (!box) throw new Error("fill swatch not visible");
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const to = await sceneToClient(page, 130, 130);
  const at = (i: number) => ({
    x: from.x + ((to.x - from.x) * i) / 10,
    y: from.y + ((to.y - from.y) * i) / 10,
  });
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
    // Press and hold: the polyfill marks the source once dragging may start.
    await page.waitForFunction((sel) => !!document.querySelector(`${sel}.g-draggable`), PREVIEW);
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [at(i)] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(at(i).x, at(i).y);
    await page.mouse.up();
  }
  const changed = await waitForChange(page, base, before);
  const events = await page.evaluate(() => (window as unknown as { __eaDrag: unknown[] }).__eaDrag);
  const after = JSON.parse(await runProbe(page, { ...base, phase: "after" })) as object;
  return JSON.stringify({ changed, events, ...after });
}

scenarios.push(
  {
    id: "editor-actions/dnd/fill-swatch-drag",
    covers: ["EDT-DND-011", "EDT-DND-007", "EDT-DND-008"],
    kind: "document",
    driver: ({ page }) => swatchDrag(page, false),
  },
  {
    id: "editor-actions/dnd/touch-swatch-drag",
    covers: ["EDT-DND-012", "EDT-DND-011", "UI-TOUCH-020"],
    kind: "document",
    driver: ({ page }) => swatchDrag(page, true),
  },
);

paritySuite("editor-actions dnd", defineScenarios(scenarios), { newApp: false });
