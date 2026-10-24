import type { ToolCase } from "./case.ts";
import { THREE } from "./cases-pointer.ts";
import { fixtureScript, type Fixture } from "./fixture.ts";
import {
  action,
  click,
  down,
  keyDown,
  keyUp,
  move,
  moveView,
  press,
  probe,
  probeDom,
  shot,
  shotView,
  up,
  wait,
  type Step,
  tool,
} from "./steps.ts";

/**
 * Editor API scenarios (GEditor through the UI, and its public helpers
 * in the page), plus view actions and text hotkeys that go through the
 * editor.
 */

const chord = (mods: readonly string[], key: string): Step[] => [
  ...mods.map(keyDown),
  press(key),
  ...[...mods].reverse().map(keyUp),
];

/**
 * Four rectangles in a row (so a click hits exactly one), bottom to top;
 * the first has the AlwaysBack program lock.
 */
const STACK4: Fixture = {
  // In a layer, so the page's annotation list isn't among the siblings.
  shapes: [
    {
      type: "layer",
      children: [
        { type: "rect", x: 100, y: 100, w: 80, h: 80, fill: [200, 200, 200], name: "back" },
        { type: "rect", x: 200, y: 100, w: 80, h: 80, fill: [229, 57, 53], name: "red" },
        { type: "rect", x: 300, y: 100, w: 80, h: 80, fill: [67, 160, 71], name: "green" },
        { type: "rect", x: 400, y: 100, w: 80, h: 80, fill: [30, 136, 229], name: "blue" },
      ],
    },
  ],
  script: fixtureScript(({ G, app }) => {
    const layer = app.scene().getActivePage().getLastChild();
    layer.getFirstChild().setProperty("plkt", G.GBlock.ProgramLck.AlwaysBack);
  }),
};

/** Two fixed-size 400 x 300 pages side by side in multi-page view. */
const TWO_PAGES: Fixture = {
  page: { w: 400, h: 300 },
  script: fixtureScript(({ G, app }) => {
    const scene = app.scene();
    const second = new G.GPage();
    second.setProperties(
      ["w", "h", "name", "bck"],
      [400, 300, "Second", new G.GRGBColor([255, 255, 255])],
    );
    scene.appendChild(second);
    app.execute("view.toggle-multi-page-mode");
    app.editorTools.prepareView(0.5, 300, 300);
  }),
};

const TEXT: Fixture = {
  shapes: [{ type: "text", x: 100, y: 100, text: "Hello world" }],
  select: [0],
  // Bold and italic variants of the default family load on first use.
  // Without this, Ctrl+B/I first commit "Modify text properties" with the
  // old weight and later, once the font file arrived, "Edit text" with the
  // new one, so the result depended on load time. Requesting the variants
  // here makes the case's font wait (before the steps) cover the loads.
  script: fixtureScript(({ app }) => {
    const fm = app.scene().getWorkspace().getFontManager();
    for (const style of ["N", "I"]) {
      for (const weight of [400, 700]) fm.getFont("Open Sans", style, weight);
    }
  }),
};

export const editorCases: ToolCase[] = [
  {
    id: "editor/convert-join-split",
    covers: ["EDT-EDITOR-019", "EDT-EDITOR-020", "EDT-EDITOR-002"],
    fixture: {
      shapes: [
        { type: "rect", x: 100, y: 100, w: 100, h: 80, fill: [229, 57, 53] },
        { type: "ellipse", x: 250, y: 100, w: 100, h: 80, fill: [30, 136, 229] },
        { type: "text", x: 100, y: 250, text: "Hi" },
      ],
      select: [0, 1, 2],
    },
    steps: [
      action("modify.converttopath"),
      probe("converted", true),
      action("modify.join-paths"),
      probe("joined", true),
      action("modify.split-path"),
      probe("split"),
    ],
  },
  {
    id: "editor/arrange-order-always-back",
    covers: ["EDT-EDITOR-021"],
    fixture: STACK4,
    steps: [
      move(600, 500),
      ...click(440, 140),
      // Shift+Ctrl+Down sends to back, but not below the AlwaysBack node.
      ...chord(["Shift", "Control"], "ArrowDown"),
      probe("blue-to-back", true),
      // Ctrl+Down sends backward: blocked by the AlwaysBack node.
      ...chord(["Control"], "ArrowDown"),
      probe("blue-backward-blocked", true),
      // Two selected siblings (blue, red): bring forward moves each above
      // the next unselected sibling.
      keyDown("Shift"),
      ...click(240, 140),
      keyUp("Shift"),
      ...chord(["Control"], "ArrowUp"),
      probe("two-forward", true),
    ],
  },
  {
    id: "editor/insert-above-selection",
    covers: ["EDT-EDITOR-017"],
    fixture: { ...THREE, select: [0] },
    steps: [
      move(600, 500),
      tool("GRectangleTool"),
      down(600, 400),
      move(650, 430),
      move(700, 460),
      up(),
      probe("inserted"),
    ],
  },
  {
    id: "editor/drag-threshold-one-pixel",
    covers: ["ADD-TOOLMGR-001"],
    fixture: THREE,
    steps: [
      move(600, 400),
      // The hand tool scrolls by the drag delta, so a drag of one pixel
      // shows up in the scroll and a press without a move doesn't.
      tool("GHandTool"),
      down(600, 400),
      up(),
      probe("press-release"),
      down(600, 400),
      move(601, 400, 1),
      probe("one-pixel"),
      move(601, 402, 1),
      probe("then-two-down"),
      up(),
      probe("released"),
    ],
  },
  {
    id: "editor/active-page-by-mouse",
    covers: ["EDT-EDITOR-016", "EDT-XFORM-025"],
    fixture: TWO_PAGES,
    steps: [
      move(200, 150),
      // The active row's title only: the row's class also gets a hover
      // highlight (g-highlighted-row) that is updated asynchronously.
      probeDom("over-first", ".g-page-panel .page-row.g-active .page-title"),
      move(650, 150),
      probeDom("over-second", ".g-page-panel .page-row.g-active .page-title"),
      ...click(650, 150),
      probeDom("clicked-second", ".g-page-panel .page-row.g-active .page-title"),
      ...click(200, 150),
      probeDom("clicked-first", ".g-page-panel .page-row.g-active .page-title"),
      // The page label sits above the page; clicking it selects the page.
      ...click(470, -14),
      probeDom("label-clicked", ".g-page-panel .page-row.g-active .page-title"),
    ],
  },
  {
    id: "editor/max-undo-steps",
    covers: ["EDT-EDITOR-027"],
    fixture: { ...THREE, select: [1] },
    steps: [
      move(600, 500),
      ...Array.from({ length: 105 }, () => press("ArrowRight")),
      probe("nudged-105"),
      keyDown("Control"),
      ...Array.from({ length: 105 }, () => press("z")),
      keyUp("Control"),
      probe("undone"),
    ],
  },
  {
    id: "editor/text-hotkeys-pointer",
    covers: ["EDT-TEXTEDIT-002", "EDT-TEXTEDIT-023", "EDT-TOOL-026"],
    fixture: TEXT,
    steps: [
      move(600, 500),
      ...chord(["Control"], "b"),
      probe("bold", true),
      ...chord(["Control"], "i"),
      probe("bold-italic", true),
      ...chord(["Control"], "b"),
      probe("italic"),
    ],
  },
  {
    id: "editor/text-hotkeys-inline",
    covers: ["EDT-TEXTEDIT-023", "EDT-TEXTEDIT-001"],
    fixture: TEXT,
    steps: [
      move(600, 500),
      press("Enter"),
      wait(50),
      press("Home"),
      keyDown("Shift"),
      ...Array.from({ length: 5 }, () => press("ArrowRight")),
      keyUp("Shift"),
      ...chord(["Control"], "u"),
      probe("underline", true),
      press("End"),
      keyDown("Shift"),
      ...Array.from({ length: 5 }, () => press("ArrowLeft")),
      keyUp("Shift"),
      ...chord(["Control"], "d"),
      probe("strikeout", true),
      ...chord(["Control"], "b"),
      press("Escape"),
      wait(50),
    ],
  },
  {
    id: "editor/hide-selection-during-drag",
    covers: ["EDT-EDITOR-007"],
    fixture: { ...THREE, select: [0, 1] },
    steps: [down(200, 160), move(220, 170), move(240, 180), shot(60, 60, 500, 220)],
  },
  {
    id: "editor/path-resize-frame",
    covers: ["EDT-EDITOR-006"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [100, 100],
            [300, 140],
            [200, 260],
          ],
          closed: true,
          fill: [30, 136, 229],
        },
      ],
      select: [0],
    },
    // The rotate handle above the frame is left out: where its stem meets
    // the circle two pixels came out differently from one page load to the
    // next (the same in every shot within one load).
    steps: [move(600, 500), shot(70, 92, 260, 198)],
  },
  {
    id: "editor/path-detail-no-frame",
    covers: ["EDT-EDITOR-006", "EDT-EDITOR-004"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [100, 100],
            [300, 140],
            [200, 260],
          ],
          closed: true,
          fill: [30, 136, 229],
        },
      ],
      select: [0],
    },
    steps: [move(600, 500), press("Enter"), wait(50), shot(70, 70, 260, 220)],
  },
  {
    id: "editor/image-selection-edit",
    covers: ["EDT-EDITOR-005", "EDT-EDITOR-004"],
    fixture: { shapes: [{ type: "image", x: 100, y: 100, w: 256, h: 192 }], select: [0] },
    steps: [move(600, 500), press("Enter"), wait(50), probe("edit"), press("Escape"), probe("esc")],
  },
  {
    id: "editor/image-selection-edit-overlay",
    covers: ["EDT-EDITOR-005"],
    fixture: { shapes: [{ type: "image", x: 100, y: 100, w: 256, h: 192 }], select: [0] },
    steps: [move(600, 500), press("Enter"), wait(50), shot(70, 70, 320, 250)],
  },
  {
    id: "editor/page-decoration",
    covers: ["EDT-EDITOR-030"],
    fixture: {
      page: { w: 300, h: 200 },
      script: fixtureScript(({ G, app }) => {
        // A second, transparent page shows the chessboard.
        const p = new G.GPage();
        p.setProperties(["w", "h", "name"], [200, 120, "Clear"]);
        app.scene().appendChild(p);
        app.execute("view.toggle-multi-page-mode");
        app.editorTools.prepareView(1, 300, 300);
      }),
    },
    steps: [moveView(1000, 850), wait(100), shot(-40, -40, 640, 300)],
  },
  {
    id: "editor/symbol-labels-on",
    covers: ["EDT-GUIDE-019", "EDT-VIEW-027"],
    fixture: {
      shapes: [{ type: "rect", x: 100, y: 100, w: 160, h: 100, fill: [229, 57, 53], name: "Card" }],
      select: [0],
      actions: ["modify.createsymbol"],
    },
    // modify.createsymbol asks for a name; Enter accepts "Symbol 1".
    steps: [
      wait(200),
      press("Enter"),
      wait(200),
      ...click(650, 500),
      wait(100),
      shot(60, 60, 260, 180),
    ],
  },
  {
    id: "editor/symbol-labels-off",
    covers: ["EDT-GUIDE-019", "EDT-VIEW-027"],
    fixture: {
      shapes: [{ type: "rect", x: 100, y: 100, w: 160, h: 100, fill: [229, 57, 53], name: "Card" }],
      select: [0],
      actions: ["modify.createsymbol"],
    },
    steps: [
      wait(200),
      press("Enter"),
      wait(200),
      ...click(650, 500),
      action("view.canvas.show-symbol-labels"),
      wait(100),
      shot(60, 60, 260, 180),
    ],
  },
  {
    id: "editor/new-view-window",
    covers: ["EDT-VIEW-033"],
    fixture: THREE,
    steps: [
      probeDom("one-tab", ".tabs"),
      move(600, 500),
      ...chord(["Control", "Alt"], "n"),
      wait(200),
      probeDom("two-tabs", ".tabs"),
    ],
  },
  {
    id: "editor/fullscreen-hides-ui",
    covers: ["EDT-VIEW-034"],
    fixture: THREE,
    // The top of the window: header and toolbar are gone, the banner shows.
    // The 1 px window frame is left out; one of its corner pixels varied by
    // one shade between runs.
    steps: [move(600, 500), ...chord(["Alt"], "Enter"), wait(300), shotView(4, 4, 1590, 300)],
  },
  {
    id: "editor/fullscreen-toggle",
    covers: ["EDT-VIEW-034"],
    fixture: THREE,
    steps: [
      move(600, 500),
      ...chord(["Alt"], "Enter"),
      wait(300),
      probeDom("banner", ".g-fullscreen-banner"),
      ...chord(["Alt"], "Enter"),
      wait(300),
      probeDom("restored", "#header"),
    ],
  },
  {
    id: "editor/enhanced-tooltips-toggle",
    covers: ["EDT-VIEW-035"],
    steps: [
      moveView(400, 400),
      // The pointer tool button; its rich tooltip opens 500 ms after
      // mouseover.
      moveView(330, 54),
      wait(1500),
      probeDom("enhanced", ".g-tooltip-content-overlay"),
      moveView(400, 400),
      wait(500),
      action("help.tooltip-visibility"),
      wait(100),
      moveView(330, 54),
      wait(1500),
      probeDom("plain", ".g-tooltip-content-overlay"),
    ],
  },
  {
    id: "editor/connector-tool",
    covers: ["EDT-TOOL-062", "EDT-ELEDIT-045"],
    fixture: {
      shapes: [
        { type: "rect", x: 100, y: 100, w: 100, h: 80, fill: [229, 57, 53] },
        { type: "ellipse", x: 350, y: 250, w: 100, h: 80, fill: [30, 136, 229] },
      ],
      script: fixtureScript(({ app }) => {
        // Tool 23 is the connector (it reports itself as GPenTool).
        if (!app.editorTools.activateToolAt(23)) throw new Error("no connector tool");
      }),
    },
    steps: [
      move(150, 140),
      probe("hover-source"),
      down(150, 140),
      up(),
      probe("source-pressed"),
      move(400, 290),
      down(400, 290),
      up(),
      wait(100),
      probe("connected"),
    ],
  },
];

/** Text direction renders (GTLDirectionTextTransformer through `dir`). */
export const directionCases: ToolCase[] = ([0, 1, 2, 3] as const).map((dir) => ({
  id: `editor/text-direction-${["ltr", "rtl", "ttb", "btt"][dir] ?? dir}`,
  covers: ["EDT-TEXTEDIT-030"],
  fixture: {
    shapes: [{ type: "text", x: 100, y: 100, text: "Abc 123" }],
    // In-page source text with the direction written in.
    script: `({ app }) => app.scene().getActivePage().getLastChild().setProperty("dir", ${dir})`,
  },
  steps: [move(600, 500), wait(100), shot(60, 40, 220, 220)],
}));
