// Drag and drop onto the canvas (EDT-DND). Playwright cannot drag files
// from the OS, so the driver dispatches dragenter, dragover and drop events
// with a DataTransfer on the element under the drop point, the way the
// browser delivers them. The probe records the document and selection
// before and after (and after undo/redo of what the drop added).
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { runKeyChecks, type KeyCheck } from "./keys.ts";
import { sceneToClient, type Loose } from "./lib.ts";

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
    wait: 1500,
    args: C,
  },
  {
    name: "svg-file",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], files: [{ name: "drop.svg", type: "image/svg+xml", svg: SVG }] }),
    wait: 1500,
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
    wait: 1500,
    args: C,
  },
  {
    name: "unknown-file",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], files: [{ name: "notes.txt", type: "text/plain", svg: "hello" }] }),
    wait: 800,
    args: C,
  },
  {
    name: "node-on-empty-canvas",
    setup: "rect",
    keys: [],
    act: drop({ at: [400, 300], nodeByName: "A" }),
    wait: 500,
    args: C,
  },
  {
    name: "symbol-instance-node",
    setup: "symbol-instance",
    keys: [],
    act: drop({ at: [400, 300], selectedNode: true }),
    wait: 500,
    args: C,
  },
  {
    name: "pattern-on-fill",
    setup: "rect-border",
    keys: [],
    act: drop({ at: [150, 130], patternRgb: [255, 0, 128] }),
    wait: 500,
    args: C,
  },
  {
    name: "pattern-on-stroke",
    setup: "rect-border",
    keys: [],
    act: drop({ at: [100, 130], patternRgb: [0, 160, 0] }),
    wait: 500,
    args: C,
  },
  {
    name: "pattern-on-empty-canvas",
    setup: "rect-border",
    keys: [],
    act: drop({ at: [400, 400], patternRgb: [0, 160, 0] }),
    wait: 500,
    args: C,
  },
  {
    name: "font-family-on-text",
    setup: "text",
    keys: [],
    act: drop({ at: [110, 113], strings: { "application/font+family": "Noto Sans Arabic" } }),
    wait: 800,
    args: C,
  },
  {
    name: "plain-text",
    setup: "rect-nosel",
    keys: [],
    act: drop({ at: [300, 250], strings: { "text/plain": "Dropped text" } }),
    wait: 800,
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

paritySuite("editor-actions dnd", defineScenarios(scenarios), { newApp: false });
