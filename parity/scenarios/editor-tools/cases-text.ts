import type { ToolCase } from "./case.ts";
import { fixtureScript, type Fixture } from "./fixture.ts";
import {
  click,
  dblclick,
  down,
  freezeCaret,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  shot,
  tripleclick,
  type,
  up,
  wait,
  type Step,
  tool,
} from "./steps.ts";

/** "Hello world" at (100, 100), auto width, selected. */
const HELLO: Fixture = {
  shapes: [{ type: "text", x: 100, y: 100, text: "Hello world" }],
  select: [0],
};

/** Two paragraphs. */
const TWO_PARAS: Fixture = {
  shapes: [{ type: "text", x: 100, y: 100, text: "First line here\nSecond paragraph text" }],
  select: [0],
};

const ctrl = (key: string): Step[] => [keyDown("Control"), press(key), keyUp("Control")];
const shift = (key: string): Step[] => [keyDown("Shift"), press(key), keyUp("Shift")];

/** Opens the inline editor of the selected text with Enter (pointer tool). */
const openInline: Step[] = [move(600, 500), press("Enter"), wait(50)];

const EDIT = ["EDT-TEXTEDIT-009", "EDT-TEXTEDIT-013", "EDT-TEXTEDIT-012", "EDT-EDITOR-032"];

export const textToolCases: ToolCase[] = [
  {
    id: "text/click-creates-text",
    covers: [
      "EDT-TOOL-076",
      "EDT-TOOL-077",
      "EDT-TEXTEDIT-009",
      "EDT-TEXTEDIT-010",
      "EDT-EDITOR-015",
    ],
    steps: [
      move(50, 50),
      tool("GTextTool"),
      probe("cursor"),
      ...click(100, 100),
      wait(50),
      probe("created"),
      type("Typed"),
      probe("typed"),
      press("Escape"),
      wait(50),
      probe("closed"),
    ],
  },
  {
    id: "text/drag-creates-box",
    covers: ["EDT-TOOL-076", "EDT-TEXTEDIT-004"],
    steps: [
      move(50, 50),
      tool("GTextTool"),
      down(100, 100),
      move(200, 150),
      move(300, 180),
      up(),
      wait(50),
      type("A fixed width text box that wraps its words"),
      press("Escape"),
    ],
  },
  {
    id: "text/drag-narrow-gets-auto-width",
    covers: ["EDT-TOOL-076"],
    steps: [
      move(50, 50),
      tool("GTextTool"),
      down(100, 100),
      move(101, 150),
      move(102, 200),
      up(),
      wait(50),
      press("Escape"),
    ],
  },
  {
    id: "text/drag-shift-alt",
    covers: ["EDT-TOOL-076", "EDT-TOOLMGR-019", "EDT-TOOLMGR-020"],
    steps: [
      move(50, 50),
      tool("GTextTool"),
      keyDown("Shift"),
      keyDown("Alt"),
      down(200, 200),
      move(260, 230),
      move(300, 250),
      up(),
      keyUp("Alt"),
      keyUp("Shift"),
      wait(50),
      press("Escape"),
    ],
  },
  {
    id: "text/hover-and-click-existing-text",
    covers: ["EDT-TOOL-077", "EDT-TOOL-078"],
    fixture: { shapes: [{ type: "text", x: 100, y: 100, text: "Hello world" }] },
    steps: [
      move(50, 50),
      tool("GTextTool"),
      move(300, 300),
      probe("empty"),
      move(130, 112),
      probe("over-text"),
      ...click(130, 112),
      wait(50),
      probe("clicked"),
    ],
  },
  {
    id: "text/text-on-path",
    covers: ["EDT-TOOL-079", "EDT-TEXTEDIT-029", "EDT-HANDLE-019"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [100, 250, 100, 250, 150, 100],
            [400, 250, 350, 100, 400, 250],
          ],
        },
      ],
    },
    steps: [
      move(50, 50),
      tool("GTextTool"),
      move(250, 138),
      probe("hover-path"),
      ...click(250, 138),
      wait(50),
      type("On a path"),
      press("Escape"),
      wait(50),
      probe("done"),
    ],
  },
  {
    id: "text/text-on-path-hover-overlay",
    covers: ["EDT-TOOL-079", "EDT-EDITOR-012"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [100, 250, 100, 250, 150, 100],
            [400, 250, 350, 100, 400, 250],
          ],
        },
      ],
    },
    steps: [move(50, 50), tool("GTextTool"), move(250, 138), shot(80, 80, 340, 190)],
  },
  {
    id: "text/text-on-shape-converts",
    covers: ["EDT-TOOL-079"],
    fixture: { shapes: [{ type: "ellipse", x: 100, y: 100, w: 200, h: 140 }] },
    steps: [
      move(50, 50),
      tool("GTextTool"),
      move(200, 100),
      ...click(200, 100),
      wait(50),
      type("Round"),
      press("Escape"),
    ],
  },
  {
    id: "text/text-on-path-move",
    covers: ["EDT-TEXTEDIT-031", "EDT-HANDLE-019"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [100, 250, 100, 250, 150, 100],
            [400, 250, 350, 100, 400, 250],
          ],
        },
      ],
    },
    steps: [
      move(50, 50),
      tool("GTextTool"),
      ...click(250, 138),
      wait(50),
      type("Moved"),
      press("Escape"),
      wait(50),
      move(600, 500),
      shot(80, 60, 340, 210),
    ],
  },
];

export const textEditCases: ToolCase[] = [
  {
    id: "textedit/first-edit-selects-all",
    covers: [...EDIT, "EDT-TOOL-018"],
    fixture: HELLO,
    steps: [
      ...openInline,
      probe("opened"),
      type("New"),
      probe("replaced"),
      press("Escape"),
      probe("closed"),
    ],
  },
  {
    id: "textedit/caret-moves",
    covers: [...EDIT, "EDT-TEXTEDIT-014"],
    fixture: TWO_PARAS,
    steps: [
      ...openInline,
      press("ArrowLeft"),
      probe("left-collapses"),
      press("ArrowRight"),
      press("ArrowRight"),
      probe("right2"),
      ...ctrl("ArrowRight"),
      probe("word-right"),
      ...ctrl("ArrowLeft"),
      probe("word-left"),
      press("End"),
      probe("end"),
      press("Home"),
      probe("home"),
      press("ArrowDown"),
      probe("down"),
      press("ArrowUp"),
      probe("up"),
      press("PageDown"),
      probe("page-down"),
      press("PageUp"),
      probe("page-up"),
      press("Escape"),
    ],
  },
  {
    id: "textedit/shift-extends-selection",
    covers: [...EDIT, "EDT-TEXTEDIT-015"],
    fixture: TWO_PARAS,
    steps: [
      ...openInline,
      press("Home"),
      ...shift("ArrowRight"),
      ...shift("ArrowRight"),
      probe("two-chars"),
      keyDown("Shift"),
      keyDown("Control"),
      press("ArrowRight"),
      keyUp("Control"),
      keyUp("Shift"),
      probe("word"),
      ...shift("End"),
      probe("to-end"),
      ...shift("ArrowDown"),
      probe("down"),
      ...shift("ArrowLeft"),
      probe("back-one"),
      press("Escape"),
    ],
  },
  {
    id: "textedit/backspace-delete",
    covers: [...EDIT, "EDT-TEXTEDIT-016", "EDT-TEXTEDIT-004"],
    fixture: HELLO,
    steps: [
      ...openInline,
      press("End"),
      press("Backspace"),
      press("Backspace"),
      press("Home"),
      press("Delete"),
      keyDown("Shift"),
      press("End"),
      keyUp("Shift"),
      press("ArrowLeft"),
      press("ArrowRight"),
      press("ArrowRight"),
      ...shift("ArrowRight"),
      ...shift("ArrowRight"),
      press("Delete"),
      probe("edited"),
      press("Escape"),
    ],
  },
  {
    id: "textedit/lorem-easter-egg",
    covers: [...EDIT, "EDT-TEXTEDIT-017", "EDT-TEXTEDIT-024"],
    fixture: HELLO,
    steps: [...openInline, type("lorem"), press("Space"), probe("filled"), press("Escape")],
  },
  {
    id: "textedit/lorem-only-when-whole-text",
    covers: ["EDT-TEXTEDIT-017"],
    fixture: HELLO,
    steps: [...openInline, press("End"), type(" lorem"), press("Space"), press("Escape")],
  },
  {
    id: "textedit/enter-shift-enter-tab",
    covers: [...EDIT, "EDT-TEXTEDIT-018", "EDT-TEXTEDIT-019"],
    fixture: HELLO,
    steps: [
      ...openInline,
      press("End"),
      press("Enter"),
      type("next"),
      keyDown("Shift"),
      press("Enter"),
      keyUp("Shift"),
      type("soft"),
      press("Tab"),
      type("tabbed"),
      keyDown("Shift"),
      press("Tab"),
      keyUp("Shift"),
      probe("typed"),
      press("Escape"),
    ],
  },
  {
    id: "textedit/undo-redo-inside",
    covers: [...EDIT, "EDT-TEXTEDIT-020"],
    fixture: HELLO,
    steps: [
      ...openInline,
      press("End"),
      type(" one"),
      type(" two"),
      ...ctrl("z"),
      probe("undone"),
      ...ctrl("y"),
      probe("redone"),
      press("Escape"),
    ],
  },
  {
    id: "textedit/select-all",
    covers: [...EDIT, "EDT-TEXTEDIT-021"],
    fixture: HELLO,
    steps: [...openInline, press("End"), ...ctrl("a"), probe("all"), type("X"), press("Escape")],
  },
  {
    id: "textedit/empty-text-deleted",
    covers: [...EDIT, "EDT-TEXTEDIT-010"],
    fixture: HELLO,
    steps: [...openInline, press("Backspace"), press("Escape"), wait(50), probe("after")],
  },
  {
    id: "textedit/mouse-caret-and-drag",
    covers: [...EDIT, "EDT-TEXTEDIT-027", "EDT-TEXTEDIT-028"],
    fixture: TWO_PARAS,
    steps: [
      ...openInline,
      ...click(130, 112),
      probe("caret"),
      down(110, 112),
      move(140, 112),
      move(170, 112),
      up(),
      probe("drag-select"),
      keyDown("Shift"),
      ...click(150, 140),
      keyUp("Shift"),
      probe("shift-click"),
      dblclick(160, 140),
      probe("word"),
      tripleclick(160, 140),
      probe("paragraph"),
      press("Escape"),
    ],
  },
  {
    id: "textedit/inline-selection-overlay",
    covers: ["EDT-TEXTEDIT-011", "EDT-TEXTEDIT-009"],
    fixture: TWO_PARAS,
    steps: [
      ...openInline,
      press("Home"),
      ...shift("ArrowRight"),
      ...shift("ArrowRight"),
      ...shift("ArrowRight"),
      freezeCaret(),
      move(600, 500),
      shot(80, 80, 300, 90),
    ],
  },
  {
    id: "textedit/inline-caret-overlay",
    covers: ["EDT-TEXTEDIT-011"],
    fixture: HELLO,
    steps: [
      ...openInline,
      press("End"),
      press("ArrowLeft"),
      freezeCaret(),
      move(600, 500),
      shot(80, 80, 200, 60),
    ],
  },
  {
    id: "textedit/text-handles-overlay",
    covers: ["EDT-HANDLE-020"],
    fixture: {
      shapes: [
        { type: "text", x: 100, y: 100, text: "Auto width" },
        { type: "text", x: 300, y: 100, text: "Fixed width text box", w: 120 },
      ],
      select: [0, 1],
    },
    steps: [move(600, 500), tool("GSubSelectTool"), move(620, 500), shot(80, 70, 380, 120)],
  },
  {
    id: "textedit/resize-handles-turn-off-auto",
    covers: ["EDT-TEXTEDIT-005"],
    fixture: HELLO,
    steps: [
      move(600, 500),
      probe("before"),
      down(205, 127),
      move(220, 140),
      move(260, 160),
      up(),
      probe("resized"),
    ],
  },
  // The case above presses inside the box, beside the handle, so it moves
  // the text. These press on the handles of HELLO's 109 x 27.2 box (the
  // bottom-right handle sits a few pixels below the box corner on screen).
  {
    id: "textedit/resize-bottom-right-handle",
    covers: ["EDT-TEXTEDIT-005"],
    fixture: HELLO,
    steps: [
      move(600, 500),
      move(210, 130),
      probe("hover"),
      down(210, 130),
      move(220, 140),
      move(260, 160),
      up(),
      probe("resized", true),
    ],
  },
  {
    id: "textedit/resize-right-center-handle",
    covers: ["EDT-TEXTEDIT-005"],
    fixture: HELLO,
    steps: [
      move(600, 500),
      move(209, 114),
      probe("hover"),
      down(209, 114),
      move(230, 114),
      move(280, 114),
      up(),
      probe("resized", true),
    ],
  },
  {
    id: "textedit/resize-bottom-right-handle-scales-contents",
    covers: ["EDT-TEXTEDIT-005"],
    fixture: {
      ...HELLO,
      script: fixtureScript(({ app }) => {
        app.selection()[0].setProperty("sc", true);
      }),
    },
    steps: [
      move(600, 500),
      down(210, 130),
      move(220, 140),
      move(260, 160),
      up(),
      probe("resized", true),
    ],
  },
  {
    id: "textedit/double-click-right-handle-toggles-auto-width",
    covers: ["EDT-TEXTEDIT-006"],
    fixture: {
      shapes: [{ type: "text", x: 100, y: 100, text: "Fixed width text box", w: 120 }],
      select: [0],
    },
    steps: [
      move(600, 500),
      probe("before"),
      move(220, 127),
      probe("hover-right-center"),
      dblclick(220, 127),
      probe("after"),
    ],
  },
];

/**
 * Five paragraphs in a 320 wide box: a one-line title (so the line below
 * it starts a paragraph), two that wrap over several lines, a short one
 * and a last one of two lines.
 */
const LONG: Fixture = {
  shapes: [
    {
      type: "text",
      x: 40,
      y: 40,
      w: 320,
      text: [
        "Long text edits:",
        "Typing into a long text should only redraw the lines that change, while every other line keeps the pixels it had before the keystroke.",
        "This paragraph wraps over several lines as well, so inserting words near its start pushes the rest of it down and moves words from one line to the next.",
        "A short one.",
        "The last paragraph ends the text with a few more words.",
      ].join("\n"),
    },
  ],
  select: [0],
};

/**
 * Opens the inline editor at the start of LONG's text with the caret
 * frozen visible. The caret's blink repaints the whole text, so after this
 * only the edits repaint it.
 */
const openLong: Step[] = [...openInline, press("ArrowLeft"), freezeCaret()];

const linesDown = (lines: number): Step[] =>
  Array.from({ length: lines }, () => press("ArrowDown"));
const wordsRight = (words: number): Step[] =>
  Array.from({ length: words }, () => ctrl("ArrowRight")).flat();

/** The whole text box with the caret and some margin. */
const longShot = (): Step[] => [move(600, 500), shot(30, 30, 350, 560)];

/**
 * Edits in a long multi-line text, each shot right after them: the text is
 * not repainted as a whole in between (the shot only composites the
 * view again), so a repaint of only the changed lines must give the same
 * pixels as the old app's repaint of the whole text.
 */
export const textLongEditCases: ToolCase[] = [
  {
    id: "textedit/long-type-middle",
    covers: [...EDIT, "EDT-TEXTEDIT-014", "EDT-TEXTEDIT-024"],
    fixture: LONG,
    steps: [...openLong, ...linesDown(5), ...wordsRight(2), type("many new "), ...longShot()],
  },
  {
    id: "textedit/long-type-start",
    covers: [...EDIT, "EDT-TEXTEDIT-024"],
    fixture: LONG,
    steps: [...openLong, type("Start: "), ...longShot()],
  },
  {
    id: "textedit/long-type-end",
    covers: [...EDIT, "EDT-TEXTEDIT-014", "EDT-TEXTEDIT-024"],
    fixture: LONG,
    steps: [...openLong, press("PageDown"), type(" One more line at the end."), ...longShot()],
  },
  {
    id: "textedit/long-enter-splits",
    covers: [...EDIT, "EDT-TEXTEDIT-014", "EDT-TEXTEDIT-018"],
    fixture: LONG,
    steps: [
      ...openLong,
      ...linesDown(2),
      ...wordsRight(3),
      press("Enter"),
      type("split"),
      ...longShot(),
    ],
  },
  {
    id: "textedit/long-backspace-joins",
    covers: [...EDIT, "EDT-TEXTEDIT-014", "EDT-TEXTEDIT-016"],
    fixture: LONG,
    // At the start of the second paragraph: the first Backspace joins it
    // with the title, the second deletes the title's colon.
    steps: [...openLong, ...linesDown(1), press("Backspace"), press("Backspace"), ...longShot()],
  },
  {
    id: "textedit/long-delete-words",
    covers: [...EDIT, "EDT-TEXTEDIT-014", "EDT-TEXTEDIT-016"],
    fixture: LONG,
    steps: [
      ...openLong,
      ...linesDown(1),
      ...wordsRight(1),
      ...Array.from({ length: 12 }, () => press("Delete")),
      ...longShot(),
    ],
  },
  {
    id: "textedit/long-underline-strikeout",
    covers: [...EDIT, "EDT-TEXTEDIT-015", "EDT-TEXTEDIT-023"],
    fixture: LONG,
    steps: [
      ...openLong,
      ...linesDown(1),
      ...wordsRight(2),
      ...shift("ArrowDown"),
      ...shift("ArrowDown"),
      ...ctrl("u"),
      ...shift("ArrowRight"),
      ...ctrl("d"),
      ...longShot(),
    ],
  },
  {
    id: "textedit/long-bold",
    covers: [...EDIT, "EDT-TEXTEDIT-015", "EDT-TEXTEDIT-023", "EDT-TEXTEDIT-001"],
    fixture: LONG,
    steps: [
      ...openLong,
      ...linesDown(4),
      ...wordsRight(1),
      ...shift("ArrowDown"),
      ...ctrl("b"),
      ...longShot(),
    ],
  },
];
