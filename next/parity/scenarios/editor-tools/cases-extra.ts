import type { Scenario } from "../../support/scenario.ts";
import type { ToolCase } from "./case.ts";
import type { Fixture } from "./fixture.ts";
import { THREE } from "./cases-pointer.ts";
import {
  action,
  click,
  dblclick,
  down,
  imeCompose,
  insertText,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  repaint,
  shot,
  shotView,
  tool,
  type,
  up,
  wait,
  type Step,
} from "./steps.ts";

const ctrl = (key: string): Step[] => [keyDown("Control"), press(key), keyUp("Control")];

/** Two square sub-paths in one compound path. */
const COMPOUND: Fixture = {
  shapes: [
    {
      type: "compound",
      children: [
        {
          type: "path",
          closed: true,
          points: [
            [100, 100],
            [200, 100],
            [200, 200],
            [100, 200],
          ],
        },
        {
          type: "path",
          closed: true,
          points: [
            [250, 100],
            [350, 100],
            [350, 200],
            [250, 200],
          ],
        },
      ],
    },
  ],
  select: [0],
};

/** Shapes that differ in border width, opacity and blend mode. */
const STYLED: Fixture = {
  shapes: [
    { type: "rect", x: 100, y: 100, w: 80, h: 80, fill: [229, 57, 53] },
    { type: "rect", x: 200, y: 100, w: 80, h: 80, fill: [67, 160, 71] },
    { type: "ellipse", x: 300, y: 100, w: 80, h: 80, fill: [30, 136, 229] },
  ],
  select: [0],
};

/** A paths graph drawn with the (hidden) PathsGraph tool: a closed square. */
const drawGraph: Step[] = [
  move(50, 50),
  tool("GPathsGraphTool"),
  ...[
    [100, 100],
    [300, 100],
    [300, 300],
    [100, 300],
    [100, 100],
  ].flatMap(([x, y]) => click(x as number, y as number)),
  press("Escape"),
  wait(50),
];

export const extraCases: ToolCase[] = [
  {
    id: "extra/compound-path-points",
    covers: ["EDT-PATHEDIT-023", "EDT-PATHEDIT-021", "EDT-PATHEDIT-004"],
    fixture: COMPOUND,
    steps: [
      move(600, 500),
      tool("GSubSelectTool"),
      ...click(200, 200),
      probe("point-in-first"),
      keyDown("Shift"),
      ...click(250, 100),
      keyUp("Shift"),
      probe("point-in-second"),
      down(250, 100),
      move(240, 90),
      move(230, 80),
      up(),
      probe("moved"),
      press("Delete"),
      probe("deleted"),
    ],
  },
  {
    id: "extra/compound-path-whole-transform",
    covers: ["EDT-PATHEDIT-023"],
    fixture: COMPOUND,
    steps: [move(600, 500), down(150, 150), move(170, 160), move(190, 170), up()],
  },
  {
    id: "extra/paths-graph-editing",
    covers: [
      "EDT-PATHEDIT-024",
      "EDT-PATHEDIT-025",
      "EDT-PATHEDIT-026",
      "EDT-PATHEDIT-027",
      "EDT-PATHEDIT-031",
      "EDT-TOOL-061",
    ],
    steps: [
      ...drawGraph,
      probe("drawn", true),
      tool("GSubSelectTool"),
      move(200, 100),
      probe("hover-edge"),
      ...click(300, 300),
      probe("anchor"),
      down(300, 300),
      move(320, 320),
      move(340, 330),
      up(),
      probe("anchor-moved"),
      ...click(200, 200),
      probe("facet"),
    ],
  },
  {
    id: "extra/paths-graph-delete-and-toggle",
    covers: ["EDT-PATHEDIT-028", "EDT-PATHEDIT-030", "EDT-PATHEDIT-029"],
    steps: [
      ...drawGraph,
      tool("GSubSelectTool"),
      ...click(300, 300),
      dblclick(300, 300),
      probe("toggled"),
      ...click(100, 300),
      press("Delete"),
      probe("deleted"),
    ],
  },
  {
    id: "extra/paths-graph-overlay",
    covers: ["EDT-PATHEDIT-025", "EDT-HANDLE-003"],
    steps: [
      ...drawGraph,
      tool("GSubSelectTool"),
      ...click(300, 300),
      move(600, 500),
      shot(70, 70, 260, 260),
    ],
  },
  {
    id: "extra/select-same-styles",
    covers: ["EDT-SEL-015", "EDT-SEL-017", "EDT-SEL-018", "EDT-SEL-019", "EDT-SEL-021"],
    fixture: STYLED,
    steps: [
      action("edit.select-by-border-width"),
      probe("border-width"),
      ...click(140, 140),
      action("edit.select-by-transparency"),
      probe("transparency"),
      ...click(140, 140),
      action("edit.select-by-blend-mode"),
      probe("blend-mode"),
      ...click(140, 140),
      action("edit.select-by-effect"),
      probe("effect"),
    ],
  },
  {
    id: "extra/select-same-font",
    covers: ["EDT-SEL-022"],
    fixture: {
      shapes: [
        { type: "text", x: 100, y: 100, text: "One" },
        { type: "text", x: 100, y: 200, text: "Two" },
        { type: "rect", x: 300, y: 100, w: 80, h: 80 },
      ],
      select: [0],
    },
    steps: [action("edit.selectbyfonttype"), probe("same-font")],
  },
  {
    id: "extra/tab-cycles-layers",
    covers: ["EDT-SEL-023", "EDT-SEL-024"],
    fixture: { ...THREE, select: [0] },
    steps: [
      move(600, 500),
      press("Tab"),
      probe("next"),
      press("Tab"),
      probe("next-2"),
      press("Tab"),
      probe("wraps"),
      keyDown("Shift"),
      press("Tab"),
      keyUp("Shift"),
      probe("previous"),
    ],
  },
  {
    id: "extra/enter-layer-group",
    covers: ["EDT-SEL-024"],
    fixture: {
      shapes: [
        {
          type: "group",
          children: [
            { type: "rect", x: 100, y: 100, w: 80, h: 80, fill: [229, 57, 53] },
            { type: "rect", x: 200, y: 100, w: 80, h: 80, fill: [67, 160, 71] },
          ],
        },
      ],
      select: [0],
    },
    steps: [
      action("view.enter-layer-group"),
      probe("entered"),
      action("view.enter-layer-group.reverse"),
      probe("reverse"),
    ],
  },
  {
    id: "extra/adaptive-handles-tiny-object",
    covers: ["EDT-HANDLE-005", "EDT-HANDLE-004", "EDT-XFORM-011"],
    fixture: {
      shapes: [{ type: "rect", x: 100, y: 100, w: 6, h: 6, fill: [229, 57, 53] }],
      select: [0],
    },
    steps: [move(600, 500), shot(70, 70, 70, 70)],
  },
  {
    id: "extra/adaptive-handles-tiny-resize",
    covers: ["EDT-HANDLE-005"],
    fixture: {
      shapes: [{ type: "rect", x: 100, y: 100, w: 6, h: 6, fill: [229, 57, 53] }],
      select: [0],
    },
    steps: [move(115, 115), probe("hover"), down(115, 115), move(125, 125), move(140, 130), up()],
  },
  {
    id: "extra/paste-into-inline-text",
    covers: ["EDT-TEXTEDIT-007", "EDT-TEXTEDIT-022"],
    fixture: { shapes: [{ type: "text", x: 100, y: 100, text: "Hello world" }], select: [0] },
    open: { settings: {} },
    steps: [
      move(600, 500),
      press("Enter"),
      wait(50),
      press("End"),
      keyDown("Shift"),
      keyDown("Control"),
      press("ArrowLeft"),
      keyUp("Control"),
      keyUp("Shift"),
      ...ctrl("c"),
      wait(100),
      press("End"),
      ...ctrl("v"),
      wait(300),
      probe("pasted"),
      press("Escape"),
    ],
  },
  {
    id: "extra/ime-composition",
    covers: ["EDT-TEXTEDIT-025", "EDT-TEXTEDIT-026"],
    fixture: { shapes: [{ type: "text", x: 100, y: 100, text: "Hello world" }], select: [0] },
    steps: [
      move(600, 500),
      press("Enter"),
      wait(50),
      press("End"),
      imeCompose("k"),
      imeCompose("ka"),
      probe("composing"),
      insertText("か"),
      wait(50),
      probe("committed"),
      type("!"),
      press("Escape"),
    ],
  },
  {
    id: "extra/auto-width-overflow-on-page",
    covers: ["EDT-TEXTEDIT-008"],
    fixture: {
      page: { w: 300, h: 200 },
      shapes: [{ type: "text", x: 100, y: 50, text: "Grow" }],
      select: [0],
    },
    steps: [
      move(600, 500),
      press("Enter"),
      wait(50),
      press("End"),
      type(" and keep on growing past the edge"),
      press("Escape"),
    ],
  },
  {
    id: "extra/initial-view-on-open",
    covers: ["EDT-VIEW-018", "EDT-VIEW-002", "EDT-VIEW-003"],
    keepInitialView: true,
    steps: [wait(300), probe("initial")],
  },
  {
    id: "extra/show-slices-toggle",
    covers: ["EDT-VIEW-028"],
    fixture: THREE,
    steps: [
      move(50, 50),
      tool("GSliceTool"),
      down(80, 80),
      move(200, 200),
      move(330, 250),
      up(),
      ...click(650, 500),
      action("view.canvas.show-slices"),
      wait(100),
      shot(60, 60, 300, 220),
    ],
  },
  {
    id: "extra/multi-page-toggle",
    covers: ["EDT-VIEW-032"],
    fixture: {
      page: { w: 500, h: 400 },
      shapes: [{ type: "rect", x: 100, y: 100, w: 150, h: 100, fill: [229, 57, 53] }],
    },
    steps: [move(600, 500), press("F6"), wait(300), shot(-60, -60, 640, 540)],
  },
  {
    id: "extra/touch-layout-overlay",
    covers: ["EDT-TOUCH-010", "EDT-TOUCH-011", "EDT-TOUCH-013", "EDT-TOUCH-015", "EDT-TOOL-095"],
    touch: true,
    open: { settings: { touch: true } },
    fixture: { ...THREE, select: [0] },
    steps: [wait(500), repaint(), shotView(580, 845, 440, 105)],
  },
  {
    id: "extra/touch-quick-help",
    covers: ["EDT-TOUCH-014"],
    touch: true,
    open: { settings: { touch: true } },
    steps: [action("help.open-quick-help"), wait(500), shotView(0, 280, 1600, 720)],
  },
];

/** In-page checks of editor selection helpers (public GEditor methods). */
export const extraInPage: Scenario[] = [
  {
    id: "editor-tools/extra/store-restore-selection",
    covers: ["EDT-SEL-009"],
    kind: "json",
    inPage: ({ G, app }) => {
      const a = new G.GRectangle();
      a.setProperty("trf", new G.GTransform(50, 0, 0, 50, 150, 150));
      const b = new G.GEllipse();
      b.setProperty("trf", new G.GTransform(50, 0, 0, 50, 350, 150));
      app.editor().insertElements([a, b]);
      app.editor().updateSelection(false, [b]);
      const stored = app.editor().storeSelection();
      app.editor().updateSelection(false, [a]);
      const before = app.editorTools.state().selection;
      app.editor().restoreSelection(stored);
      return { before, after: app.editorTools.state().selection };
    },
  },
];
