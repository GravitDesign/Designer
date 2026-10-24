import type { ToolCase } from "./case.ts";
import { fixtureScript, type Fixture } from "./fixture.ts";
import {
  action,
  click,
  clickElement,
  down,
  drag,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  shot,
  tool,
  up,
  wait,
  type Step,
} from "./steps.ts";

/**
 * A 200 x 120 rectangle at (100, 100), selected, whose fill is a default
 * gradient of the given class (white to black, no transform).
 */
const gradientRect = (
  kind: "GLinearGradient" | "GRadialGradient" | "GAngularGradient",
): Fixture => ({
  shapes: [{ type: "rect", x: 100, y: 100, w: 200, h: 120 }],
  select: [0],
  script: fixtureScript(({ G, app }) => {
    const node = app.selection()[0];
    const layers = node.getPaintLayers();
    for (let l = layers.getFirstChild(); l; l = l.getNext()) {
      if (l instanceof G.GStylable.FillPaintLayer) l.setProperty("_pt", new G[kind]());
    }
  }).replace("G[kind]", `G.${kind}`),
});

/**
 * Opens the fill's pattern chooser in the inspector the way a user does,
 * by clicking its swatch (not the eyedropper on its corner). For a
 * gradient fill that activates the gradient style editor on the canvas.
 */
const openFillChooser: Step[] = [
  move(600, 500),
  clickElement("[data-property='_pt'] > .preview"),
  wait(300),
  move(600, 500),
];

/**
 * Two fixed-size 300 x 200 pages in multi-page view: page 1 at scene
 * (0, 0) with a rectangle, page 2 laid out to its right (x 337.5). Page
 * labels sit just above each page (y about -12 to -1).
 */
const TWO_PAGES: Fixture = {
  page: { w: 300, h: 200 },
  shapes: [{ type: "rect", x: 50, y: 50, w: 100, h: 60, fill: [229, 57, 53] }],
  script: fixtureScript(({ G, app }) => {
    const page = new G.GPage();
    page.setProperties(
      ["w", "h", "name", "bck"],
      [300, 200, "Page 2", new G.GRGBColor([255, 255, 255])],
    );
    app.scene().appendChild(page);
    app.execute("view.toggle-multi-page-mode");
    app.editorTools.prepareView(1, 400, 200);
    app.editor().clearSelection();
  }),
};
const PAGE = ["EDT-ELEDIT-032", "EDT-ELEDIT-023", "EDT-XFORM-025", "EDT-ELEDIT-002"];

/** A group of two rectangles (the group is selected). */
const GROUP: Fixture = {
  shapes: [
    {
      type: "group",
      children: [
        { type: "rect", x: 100, y: 100, w: 120, h: 100, fill: [229, 57, 53] },
        { type: "rect", x: 240, y: 100, w: 120, h: 100, fill: [67, 160, 71] },
      ],
    },
  ],
  select: [0],
};

/**
 * A layer with its own colour (`cls`, magenta) holding two rectangles.
 * The layer tool selects it by a click on one of its children.
 */
const LAYER: Fixture = {
  shapes: [
    {
      type: "layer",
      children: [
        { type: "rect", x: 100, y: 100, w: 120, h: 100, fill: [229, 57, 53] },
        { type: "rect", x: 240, y: 100, w: 120, h: 100, fill: [67, 160, 71] },
      ],
    },
  ],
  script: fixtureScript(({ G, app }) => {
    const layer = app.scene().getActivePage().getChildren()[1];
    layer.setProperty("cls", new G.GRGBColor([200, 0, 200]));
  }),
};
const selectLayer: Step[] = [move(600, 500), tool("GLayerTool"), ...click(150, 150), wait(100)];

/** A red rectangle with a program lock (`plkt`), selected. */
const lockedRect = (plkt: number): Fixture => ({
  shapes: [{ type: "rect", x: 100, y: 100, w: 200, h: 120, fill: [229, 57, 53] }],
  select: [0],
  // In-page code can't see `plkt`; the number is spliced into its source.
  // The editor reads the lock when it is created, so the rectangle is
  // locked first and selected again afterwards.
  script: fixtureScript(({ app }) => {
    const node = app.selection()[0];
    app.editor().clearSelection();
    node.setProperty("plkt", Number("PLKT"));
    app.editor().updateSelection(false, [node]);
  }).replace("PLKT", String(plkt)),
});

/** An ellipse and a rectangle; the rectangle is selected. */
const SHAPE_WITH_CONTENT: Fixture = {
  shapes: [
    { type: "ellipse", x: 100, y: 100, w: 200, h: 160, fill: [30, 136, 229] },
    { type: "rect", x: 350, y: 120, w: 80, h: 60, fill: [229, 57, 53] },
  ],
  select: [1],
};

/**
 * Cuts the selected rectangle, selects the ellipse and pastes the
 * rectangle inside it (it lands at 100..180 x 100..160, selected), then
 * runs `then`.
 */
const pasteInside = (then: Step[]): Step[] => [
  move(600, 500),
  press("Control+x"),
  wait(100),
  ...click(200, 180),
  action("edit.paste.inside"),
  wait(200),
  ...then,
];

/**
 * A selected rectangle with the given fill on a page whose background is
 * close to the selection colour, so the editor adapts its outline colour.
 */
const adaptive = (fill: readonly [number, number, number]): Fixture => ({
  shapes: [{ type: "rect", x: 100, y: 100, w: 200, h: 120, fill }],
  select: [0],
  script: fixtureScript(({ G, app }) => {
    // The outline colour is picked from the bottom-right pixel of the
    // canvas being painted (getOutlineColor clamps with a one-argument
    // Math.min), so in a partial repaint it depends on the dirty area. The
    // rotation handle's stem gets such a repaint at a load-dependent
    // moment, which changed two of its pixels between runs. NoMove (plkt
    // 8) removes the rotation handle; the box outline and handles that show
    // the adapted colour don't vary. The background is set while nothing
    // is selected, so the editor is created with it in place.
    const node = app.selection()[0];
    app.editor().clearSelection();
    app
      .scene()
      .getActivePage()
      .setProperty("bck", new G.GRGBColor([33, 130, 226]));
    node.setProperty("plkt", 8);
    app.editor().updateSelection(false, [node]);
  }),
});

/**
 * Presses on the first fill swatch in the inspector (the selected
 * element's fill), drags it onto the canvas and drops it at scene point
 * `to`. The editor widget covers the window, so view pixels are client
 * pixels.
 */
const dragSwatchTo = (to: readonly [number, number]): Step[] => [
  { op: "move", at: { view: [1320, 494] } },
  { op: "down", at: { view: [1320, 494] } },
  { op: "move", at: { view: [1200, 450] } },
  move(to[0] + 20, to[1] + 20),
  move(to[0], to[1]),
  up(),
];

/**
 * A compound path of `count` small square sub-paths, selected, with the
 * subselect tool active, so each sub-path's editor paints its points.
 */
const manySubPaths = (count: number): Fixture => ({
  shapes: [
    {
      type: "compound",
      children: Array.from({ length: count }, (_, i) => {
        const x = 100 + (i % 50) * 8;
        const y = 100 + Math.floor(i / 50) * 8;
        return {
          type: "path" as const,
          closed: true,
          points: [
            [x, y],
            [x + 5, y],
            [x + 5, y + 5],
            [x, y + 5],
          ],
        };
      }),
    },
  ],
  select: [0],
  tool: "GSubSelectTool",
});

/**
 * Presses at (x, y), starts the drag with a 1 px move and returns to the
 * press point once the drag runs. The select tool only starts moving parts
 * 33 ms after the drag starts (_clickToDragTimeout), so moves before that
 * are dropped and the radial editor, which accumulates per move, would
 * depend on timing. The return move puts the handle back where it was.
 */
const grab = (x: number, y: number): Step[] => [
  down(x, y),
  move(x + 1, y, 1),
  wait(100),
  move(x, y, 1),
];

const GRADIENT = ["EDT-ELEDIT-047", "EDT-ELEDIT-048", "EDT-HANDLE-021"];

/**
 * gradientRect with the gradient editor opened through the editor API, as
 * the inspector's fill chooser does when it opens (chooseropen): hide the
 * selection, then GStyleEdManager.updateEditor(fill, "_pt", false). The
 * pointer tool has activated the manager already. Needs no inspector, so
 * the same steps run in the new app before its panels exist.
 */
const gradientViaEditor = (
  kind: "GLinearGradient" | "GRadialGradient" | "GAngularGradient",
): Fixture => ({
  ...gradientRect(kind),
  script: fixtureScript(({ G, app }) => {
    const node = app.selection()[0];
    const layers = node.getPaintLayers();
    let fill = null;
    for (let l = layers.getFirstChild(); l; l = l.getNext()) {
      if (l instanceof G.GStylable.FillPaintLayer) {
        l.setProperty("_pt", new G[kind]());
        fill = fill || l;
      }
    }
    app.editor().hideSelection();
    app.scene().getWorkspace().getStyleEdManager().updateEditor(fill, "_pt", false);
  }).replace("G[kind]", `G.${kind}`),
});

export const eleditCases: ToolCase[] = [
  {
    id: "eledit/gradient-linear-add-and-slide-stop",
    covers: [...GRADIENT, "EDT-ELEDIT-049", "EDT-ELEDIT-051", "EDT-ELEDIT-007"],
    fixture: gradientRect("GLinearGradient"),
    steps: [
      ...openFillChooser,
      move(200, 160),
      probe("hover-line"),
      move(300, 160),
      probe("hover-end-stop"),
      ...click(200, 160),
      wait(100),
      probe("stop-added", true),
      // The new middle stop slides along the line and is clamped to the end.
      ...drag(
        [200, 160],
        [
          [240, 170],
          [360, 175],
        ],
      ),
      wait(100),
      probe("stop-clamped", true),
    ],
  },
  {
    id: "eledit/gradient-linear-end-snaps",
    covers: [...GRADIENT, "EDT-ELEDIT-050", "EDT-ELEDIT-051"],
    fixture: gradientRect("GLinearGradient"),
    steps: [
      ...openFillChooser,
      // 2 px off the bottom-right corner: snaps onto it.
      ...drag(
        [300, 160],
        [
          [300, 190],
          [298, 218],
        ],
      ),
      wait(100),
      probe("snapped-to-corner", true),
      // The same drag again with Meta (Ctrl here) held during the move:
      // no snapping, the end stays 2 px off the corner.
      down(300, 220),
      move(300, 200),
      keyDown("Control"),
      move(299, 210),
      move(298, 218),
      up(),
      keyUp("Control"),
      wait(100),
      probe("meta-no-snap", true),
    ],
  },
  {
    id: "eledit/gradient-linear-shift-constrains",
    covers: [...GRADIENT, "EDT-ELEDIT-051"],
    fixture: gradientRect("GLinearGradient"),
    steps: [
      ...openFillChooser,
      down(300, 160),
      keyDown("Shift"),
      move(290, 190),
      move(273, 233),
      probe("constrained", true),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("after", true),
    ],
  },
  {
    id: "eledit/gradient-linear-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-051"],
    fixture: gradientRect("GLinearGradient"),
    steps: [
      ...openFillChooser,
      ...click(160, 160),
      wait(100),
      move(250, 160),
      shot(80, 80, 240, 160),
    ],
  },
  {
    id: "eledit/gradient-radial-hover",
    covers: [...GRADIENT, "EDT-ELEDIT-052", "EDT-ELEDIT-012"],
    fixture: gradientRect("GRadialGradient"),
    steps: [
      ...openFillChooser,
      move(200, 100),
      probe("extra-handle"),
      move(200, 130),
      probe("move-handle"),
      move(250, 160),
      probe("plus-stop"),
      move(300, 160),
      probe("end-handle"),
    ],
  },
  ...(
    [
      // End handle: radius along x.
      ["end", [300, 160], [330, 165]],
      // Extra handle: radius along y.
      ["extra", [200, 100], [205, 80]],
      // Move handle (the line to the extra handle): translates.
      ["move", [200, 130], [230, 150]],
    ] as const
  ).map(([name, from, to]): ToolCase => ({
    id: `eledit/gradient-radial-drag-${name}`,
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientRect("GRadialGradient"),
    steps: [
      ...openFillChooser,
      // One pointer event per position: the radial editor accumulates the
      // transform per move, so extra interpolated events change the last
      // bits of the result.
      down(from[0], from[1]),
      move(to[0], to[1], 1),
      up(),
      wait(100),
      probe("dragged", true),
    ],
  })),
  {
    id: "eledit/gradient-radial-end-shift",
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientRect("GRadialGradient"),
    steps: [
      ...openFillChooser,
      down(300, 160),
      move(302, 162, 1),
      keyDown("Shift"),
      move(310, 180, 1),
      move(330, 205, 1),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("dragged", true),
    ],
  },
  {
    id: "eledit/gradient-radial-extra-click-toggles-axis",
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientRect("GRadialGradient"),
    steps: [
      ...openFillChooser,
      ...click(200, 100),
      wait(100),
      move(250, 200),
      shot(80, 70, 240, 170),
    ],
  },
  {
    id: "eledit/gradient-radial-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientRect("GRadialGradient"),
    steps: [...openFillChooser, move(250, 200), shot(80, 70, 240, 170)],
  },
  {
    id: "eledit/gradient-angular-handles",
    covers: [...GRADIENT, "EDT-ELEDIT-053"],
    fixture: gradientRect("GAngularGradient"),
    steps: [
      ...openFillChooser,
      move(200, 160),
      probe("hover-center"),
      // Center: snaps to the bbox centre and corners within 5 px.
      ...drag(
        [200, 160],
        [
          [230, 170],
          [297, 103],
        ],
      ),
      wait(100),
      probe("center-snapped", true),
      // End handle with Shift: constrained angle.
      down(397, 103),
      keyDown("Shift"),
      move(390, 130),
      move(380, 170),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("end-shift", true),
    ],
  },
  {
    id: "eledit/gradient-angular-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-053"],
    fixture: gradientRect("GAngularGradient"),
    steps: [...openFillChooser, move(250, 250), shot(80, 40, 240, 240)],
  },
  // The same editors opened through the editor API (gradientViaEditor)
  // instead of the inspector. One pointer event per position, as above;
  // grab() lets the drag start before the first position that counts.
  {
    id: "eledit/gradient-api-linear-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-051"],
    fixture: gradientViaEditor("GLinearGradient"),
    steps: [move(600, 500), ...click(160, 160), wait(100), move(250, 160), shot(80, 80, 240, 160)],
  },
  {
    id: "eledit/gradient-api-linear-stops",
    covers: [...GRADIENT, "EDT-ELEDIT-049", "EDT-ELEDIT-050", "EDT-ELEDIT-051"],
    fixture: gradientViaEditor("GLinearGradient"),
    steps: [
      move(600, 500),
      move(200, 160),
      probe("hover-line"),
      ...click(200, 160),
      wait(100),
      probe("stop-added", true),
      ...grab(200, 160),
      move(240, 170, 1),
      probe("stop-slid", true),
      move(360, 175, 1),
      up(),
      wait(100),
      probe("stop-clamped", true),
      ...grab(100, 160),
      keyDown("Shift"),
      move(110, 180, 1),
      move(127, 213, 1),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("start-shift", true),
    ],
  },
  {
    id: "eledit/gradient-api-radial-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientViaEditor("GRadialGradient"),
    steps: [move(600, 500), ...click(250, 160), wait(100), move(250, 220), shot(80, 70, 240, 170)],
  },
  {
    id: "eledit/gradient-api-radial-toggled-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientViaEditor("GRadialGradient"),
    steps: [move(600, 500), ...click(200, 100), wait(100), move(250, 220), shot(80, 70, 240, 170)],
  },
  ...(
    [
      // Stop 0 at position 0 is the focal point: moves _fx/_fy.
      ["focal", [200, 160], [230, 175]],
      // Dragged past the radius: the focal point is pulled back inside.
      ["focal-clamped", [200, 160], [340, 160]],
      ["end", [300, 160], [330, 175]],
      ["move", [200, 130], [230, 150]],
    ] as const
  ).map(([name, from, to]): ToolCase => ({
    id: `eledit/gradient-api-radial-drag-${name}`,
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientViaEditor("GRadialGradient"),
    steps: [
      move(600, 500),
      ...grab(from[0], from[1]),
      move(to[0], to[1], 1),
      up(),
      wait(100),
      probe("dragged", true),
    ],
  })),
  ...(
    [
      // After the extra handle click the end handle sits on the y axis.
      ["skewed", [230, 70]],
      // Level with the centre: dy is 0, scale 0, the transform isn't applied.
      ["flat", [240, 160]],
    ] as const
  ).map(([name, to]): ToolCase => ({
    id: `eledit/gradient-api-radial-y-leading-end-${name}`,
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientViaEditor("GRadialGradient"),
    steps: [
      move(600, 500),
      ...click(200, 100),
      wait(100),
      probe("toggled", true),
      ...grab(200, 100),
      move(to[0], to[1], 1),
      up(),
      wait(100),
      probe("dragged", true),
    ],
  })),
  {
    id: "eledit/gradient-api-radial-middle-stop",
    covers: [...GRADIENT, "EDT-ELEDIT-049", "EDT-ELEDIT-052"],
    fixture: gradientViaEditor("GRadialGradient"),
    steps: [
      move(600, 500),
      ...click(250, 160),
      wait(100),
      probe("stop-added", true),
      ...grab(250, 160),
      move(275, 172, 1),
      probe("slid", true),
      move(340, 160, 1),
      probe("past-end", true),
      move(201, 160, 1),
      probe("near-start", true),
      up(),
      wait(100),
      probe("after", true),
    ],
  },
  {
    id: "eledit/gradient-api-radial-focal-shift",
    covers: [...GRADIENT, "EDT-ELEDIT-052"],
    fixture: gradientViaEditor("GRadialGradient"),
    steps: [
      move(600, 500),
      ...grab(200, 160),
      move(202, 161, 1),
      keyDown("Shift"),
      move(230, 185, 1),
      move(243, 176, 1),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("dragged", true),
    ],
  },
  {
    id: "eledit/gradient-api-angular-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-053"],
    fixture: gradientViaEditor("GAngularGradient"),
    steps: [move(600, 500), move(250, 250), shot(80, 40, 240, 240)],
  },
  {
    id: "eledit/gradient-api-angular-stop-overlay",
    covers: [...GRADIENT, "EDT-ELEDIT-053"],
    fixture: gradientViaEditor("GAngularGradient"),
    steps: [move(600, 500), ...click(200, 100), wait(100), move(250, 250), shot(80, 40, 240, 240)],
  },
  {
    id: "eledit/gradient-api-angular-handles",
    covers: [...GRADIENT, "EDT-ELEDIT-053"],
    fixture: gradientViaEditor("GAngularGradient"),
    steps: [
      move(600, 500),
      ...grab(200, 160),
      move(230, 170, 1),
      move(297, 103, 1),
      up(),
      wait(100),
      probe("center-snapped", true),
      ...grab(397, 103),
      keyDown("Shift"),
      move(390, 130, 1),
      move(380, 170, 1),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("end-shift", true),
    ],
  },
  {
    id: "eledit/gradient-api-angular-middle-stop",
    covers: [...GRADIENT, "EDT-ELEDIT-049", "EDT-ELEDIT-053"],
    fixture: gradientViaEditor("GAngularGradient"),
    steps: [
      move(600, 500),
      ...click(200, 100),
      wait(100),
      probe("stop-added", true),
      ...grab(200, 100),
      move(260, 110, 1),
      probe("slid", true),
      move(300, 150, 1),
      probe("near-start-angle", true),
      move(300, 172, 1),
      probe("past-start-angle", true),
      move(120, 200, 1),
      up(),
      wait(100),
      probe("after", true),
    ],
  },
  {
    id: "eledit/gradient-api-angular-stop-shift",
    covers: [...GRADIENT, "EDT-ELEDIT-053"],
    fixture: gradientViaEditor("GAngularGradient"),
    steps: [
      move(600, 500),
      ...click(200, 100),
      wait(100),
      ...grab(200, 100),
      move(201, 101, 1),
      keyDown("Shift"),
      move(150, 120, 1),
      move(133, 107, 1),
      up(),
      keyUp("Shift"),
      wait(100),
      probe("dragged", true),
    ],
  },
  {
    id: "eledit/page-label-select-and-drag",
    covers: [...PAGE, "EDT-ELEDIT-036"],
    fixture: TWO_PAGES,
    steps: [
      move(360, -6),
      probe("hover-label"),
      ...click(360, -6),
      probe("selected"),
      move(637, 200),
      probe("corner-no-rotate"),
      move(645, 208),
      probe("outside-corner-no-rotate"),
      ...drag(
        [360, -6],
        [
          [380, 10],
          [420, 40],
        ],
      ),
      wait(100),
      probe("dragged", true),
    ],
  },
  {
    id: "eledit/page-label-drag-overlaps",
    covers: [...PAGE, "EDT-ELEDIT-033"],
    fixture: TWO_PAGES,
    steps: [
      ...click(360, -6),
      // Onto page 1: pageCollisionTransform is off, so the page simply
      // moves and overlaps page 1.
      ...drag(
        [360, -6],
        [
          [300, 10],
          [200, 30],
        ],
      ),
      wait(100),
      probe("overlapping", true),
    ],
  },
  {
    id: "eledit/page-label-shift-drag-avoids-collision",
    covers: [...PAGE, "EDT-ELEDIT-033", "EDT-ELEDIT-034"],
    fixture: TWO_PAGES,
    steps: [
      ...click(360, -6),
      keyDown("Shift"),
      ...drag(
        [360, -6],
        [
          [300, 10],
          [200, 30],
        ],
      ),
      keyUp("Shift"),
      wait(100),
      probe("shift", true),
    ],
  },
  {
    id: "eledit/page-resize",
    covers: [...PAGE],
    fixture: TWO_PAGES,
    steps: [
      ...click(360, -6),
      move(637.5, 100),
      probe("hover-right-edge"),
      ...drag(
        [637.5, 100],
        [
          [660, 110],
          [700, 120],
        ],
      ),
      wait(100),
      probe("resized", true),
      ...drag(
        [637.5 + 62.5, 200],
        [
          [720, 230],
          [740, 260],
        ],
      ),
      wait(100),
      probe("corner", true),
    ],
  },
  {
    id: "eledit/page-selected-overlay",
    covers: [...PAGE, "EDT-ELEDIT-035"],
    fixture: TWO_PAGES,
    steps: [...click(360, -6), move(500, 400), shot(-20, -30, 680, 250)],
  },
  // Group resize: children follow the group transform (Shift keeps the
  // ratio, Alt resizes from the centre).
  ...(
    [
      ["plain", []],
      ["shift", ["Shift"]],
      ["alt", ["Alt"]],
    ] as const
  ).map(([name, mods]): ToolCase => ({
    id: `eledit/group-resize-${name}`,
    covers: ["EDT-ELEDIT-029", "EDT-ELEDIT-030"],
    fixture: GROUP,
    steps: [
      ...mods.map(keyDown),
      down(360, 200),
      move(380, 230),
      move(420, 250),
      probe("dragging"),
      up(),
      ...[...mods].reverse().map(keyUp),
      wait(100),
    ],
  })),
  {
    id: "eledit/group-child-editor-overlay",
    covers: ["EDT-ELEDIT-003", "EDT-ELEDIT-006"],
    fixture: GROUP,
    // A click on the selected group selects the child: its editor opens
    // inside the group's editor.
    steps: [...click(150, 150), move(600, 500), shot(80, 70, 300, 150)],
  },
  {
    id: "eledit/layer-selected-overlay",
    covers: ["EDT-ELEDIT-031", "EDT-ELEDIT-002"],
    fixture: LAYER,
    steps: [...selectLayer, move(600, 500), shot(80, 70, 300, 150)],
  },
  {
    id: "eledit/layer-move",
    covers: ["EDT-ELEDIT-031", "EDT-ELEDIT-002"],
    fixture: LAYER,
    steps: [
      ...selectLayer,
      probe("layer-selected"),
      ...drag(
        [300, 150],
        [
          [320, 170],
          [340, 190],
        ],
      ),
      wait(100),
    ],
  },
  {
    id: "eledit/compound-shape-resize-and-boolean-op",
    covers: ["EDT-ELEDIT-038", "EDT-ELEDIT-002"],
    fixture: {
      shapes: [
        { type: "rect", x: 100, y: 100, w: 150, h: 100, fill: [229, 57, 53] },
        { type: "ellipse", x: 180, y: 150, w: 120, h: 100, fill: [30, 136, 229] },
      ],
      select: [0, 1],
      actions: ["modify.merge.subtract"],
    },
    steps: [
      move(600, 500),
      probe("subtract", true),
      // Resize by the bottom-right corner of the subtracted shape (the
      // rectangle's): forwarded to the children.
      ...drag(
        [250, 200],
        [
          [270, 210],
          [300, 230],
        ],
      ),
      wait(100),
      probe("resized", true),
      // The inspector's compound buttons write `bool` themselves (the
      // editor's setBooleanOp is never called by the UI).
      clickElement("button.compound-chooser-btn[data-op='3']"),
      wait(100),
    ],
  },
  {
    id: "eledit/slice-no-rotate-and-resize",
    covers: ["EDT-ELEDIT-040", "EDT-ELEDIT-002"],
    steps: [
      move(50, 50),
      tool("GSliceTool"),
      ...drag(
        [100, 100],
        [
          [150, 140],
          [200, 180],
        ],
      ),
      wait(100),
      tool("GPointerTool"),
      move(600, 500),
      probe("drawn"),
      move(206, 186),
      probe("rotate-zone"),
      move(200, 180),
      probe("corner"),
      ...drag(
        [200, 180],
        [
          [220, 200],
          [250, 230],
        ],
      ),
      wait(100),
    ],
  },
  {
    id: "eledit/slice-overlay",
    covers: ["EDT-ELEDIT-040", "EDT-ELEDIT-002"],
    steps: [
      move(50, 50),
      tool("GSliceTool"),
      ...drag(
        [100, 100],
        [
          [150, 140],
          [200, 180],
        ],
      ),
      wait(100),
      tool("GPointerTool"),
      move(600, 500),
      shot(70, 60, 160, 150),
    ],
  },
  ...(
    [
      // NoSizeChanges: no resize handles.
      ["no-size-changes", 2],
      // NoMove: no rotation handle and no rotate corners.
      ["no-move", 8],
    ] as const
  ).flatMap(([name, plkt]): ToolCase[] => [
    {
      id: `eledit/program-lock-${name}-overlay`,
      covers: ["EDT-ELEDIT-021"],
      fixture: lockedRect(plkt),
      steps: [move(600, 500), shot(70, 60, 260, 190)],
    },
    {
      id: `eledit/program-lock-${name}`,
      covers: ["EDT-ELEDIT-021", "EDT-ELEDIT-009"],
      fixture: lockedRect(plkt),
      steps: [
        move(300, 220),
        probe("corner"),
        move(308, 228),
        probe("rotate-zone"),
        move(200, 90),
        probe("rotate-handle"),
        ...drag(
          [300, 220],
          [
            [320, 240],
            [340, 250],
          ],
        ),
        wait(100),
      ],
    },
  ]),
  {
    id: "eledit/catch-handle-overlay",
    covers: ["EDT-ELEDIT-024", "EDT-HANDLE-023"],
    fixture: SHAPE_WITH_CONTENT,
    steps: pasteInside([move(600, 500), shot(80, 80, 260, 220)]),
  },
  {
    id: "eledit/catch-handle-drag",
    covers: ["EDT-ELEDIT-024", "EDT-HANDLE-023", "EDT-ELEDIT-007"],
    fixture: SHAPE_WITH_CONTENT,
    steps: pasteInside([
      move(140, 130),
      probe("hover-catch"),
      ...drag(
        [140, 130],
        [
          [170, 150],
          [210, 190],
        ],
      ),
      wait(100),
      probe("dragged"),
    ]),
  },
  {
    id: "eledit/adaptive-outline-white",
    covers: ["EDT-ELEDIT-014"],
    fixture: adaptive([229, 57, 53]),
    steps: [move(600, 500), shot(70, 60, 260, 190)],
  },
  {
    id: "eledit/adaptive-outline-dark",
    covers: ["EDT-ELEDIT-014"],
    fixture: adaptive([250, 250, 250]),
    steps: [move(600, 500), shot(70, 60, 260, 190)],
  },
  {
    id: "eledit/symbol-instance-overlay",
    covers: ["EDT-ELEDIT-046", "EDT-ELEDIT-023", "EDT-ELEDIT-002"],
    fixture: {
      shapes: [{ type: "rect", x: 100, y: 100, w: 200, h: 120, fill: [229, 57, 53] }],
      select: [0],
      actions: ["modify.createsymbol"],
    },
    // The action asks for the symbol's name first; Enter accepts "Symbol 1".
    steps: [wait(200), press("Enter"), wait(200), move(600, 500), shot(70, 40, 260, 210)],
  },
  {
    // Above maxNumberOfEditorsToDraw (2000) a compound path doesn't paint
    // its sub-path editors.
    id: "eledit/many-sub-path-editors-not-drawn",
    covers: ["EDT-ELEDIT-055"],
    fixture: manySubPaths(2001),
    steps: [move(800, 600), shot(80, 80, 140, 100)],
  },
  {
    id: "eledit/many-sub-path-editors-drawn",
    covers: ["EDT-ELEDIT-055"],
    fixture: manySubPaths(2000),
    steps: [move(800, 600), shot(80, 80, 140, 100)],
  },
  {
    id: "eledit/pattern-drop-on-border-and-fill",
    covers: ["EDT-ELEDIT-026", "EDT-ELEDIT-019"],
    fixture: {
      shapes: [
        { type: "rect", x: 100, y: 100, w: 120, h: 100, fill: [229, 57, 53] },
        { type: "rect", x: 300, y: 100, w: 160, h: 120, fill: [200, 200, 200] },
      ],
      select: [0],
      script: fixtureScript(({ G, app }) => {
        // The target gets a thick border so its stroke is easy to hit.
        const target = app.scene().getActivePage().getChildren()[2];
        const border = new G.GStylable.BorderPaintLayer();
        border.setProperties(["_pt", "_bw"], [new G.GRGBColor([0, 0, 0]), 8]);
        target.getPaintLayers().appendChild(border);
      }),
    },
    steps: [
      // The selected rectangle's fill swatch, dragged from the inspector
      // onto the target's border, then onto its interior.
      ...dragSwatchTo([300, 160]),
      wait(200),
      probe("on-border", true),
      ...dragSwatchTo([380, 160]),
      wait(200),
    ],
  },
  {
    id: "eledit/page-resize-relayouts-anchored-child",
    covers: ["EDT-ELEDIT-017", "EDT-ELEDIT-032"],
    fixture: {
      page: { w: 300, h: 200 },
      shapes: [{ type: "rect", x: 200, y: 50, w: 60, h: 40, fill: [229, 57, 53] }],
      script: fixtureScript(({ app }) => {
        // Multi-page view shows the page label, which selects the page.
        app.execute("view.toggle-multi-page-mode");
        app.editorTools.prepareView(1, 400, 200);
        app.editor().clearSelection();
      }),
    },
    steps: [
      // Anchor the rectangle to the page's right edge in the inspector.
      ...click(230, 70),
      clickElement(".gravit-icon-anchor-right"),
      wait(100),
      probe("anchored", true),
      // Select the page by its label and widen it by its right edge.
      ...click(20, -6),
      ...drag(
        [300, 100],
        [
          [340, 100],
          [400, 100],
        ],
      ),
      wait(100),
    ],
  },
  {
    id: "eledit/group-transform-box-resize",
    covers: ["EDT-ELEDIT-022", "EDT-ELEDIT-029", "EDT-ELEDIT-036"],
    fixture: GROUP,
    steps: [
      move(600, 500),
      press("q"),
      down(360, 200),
      move(380, 220),
      move(400, 240),
      probe("dragging"),
      up(),
      wait(100),
    ],
  },
  {
    // A partially locked element (lkt "P", as saved in files; the UI only
    // sets full locks) stays selectable. Its transform isn't applied, so a
    // move does nothing; the corner resize still goes through (the
    // rectangle editor applies it as a part move).
    id: "eledit/partial-lock-blocks-move",
    covers: ["EDT-ELEDIT-018"],
    fixture: {
      shapes: [{ type: "rect", x: 100, y: 100, w: 200, h: 120, fill: [229, 57, 53] }],
      select: [0],
      script: fixtureScript(({ app }) => {
        const node = app.selection()[0];
        app.editor().clearSelection();
        node.setProperty("lkt", "P");
        app.editor().updateSelection(false, [node]);
      }),
    },
    steps: [
      move(600, 500),
      probe("selected"),
      ...drag(
        [300, 220],
        [
          [320, 240],
          [340, 250],
        ],
      ),
      wait(100),
      probe("resized"),
      ...drag(
        [200, 160],
        [
          [220, 170],
          [240, 190],
        ],
      ),
      wait(100),
    ],
  },
];
