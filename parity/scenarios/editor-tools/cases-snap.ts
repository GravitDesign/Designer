import type { ToolCase } from "./case.ts";
import type { Fixture } from "./fixture.ts";
import {
  action,
  down,
  keyDown,
  keyUp,
  move,
  moveView,
  press,
  probe,
  shot,
  shotGuides,
  up,
  wait,
  type Step,
} from "./steps.ts";

/** A target square and a small square to drag next to it. */
const PAIR: Fixture = {
  shapes: [
    { type: "rect", x: 300, y: 100, w: 150, h: 150, fill: [67, 160, 71] },
    { type: "rect", x: 100, y: 120, w: 80, h: 80, fill: [229, 57, 53] },
  ],
};

/** Drags the small square so its right edge lands 3 px left of the target's left edge. */
const dragNearEdge = (mods: readonly string[] = []): Step[] => [
  move(140, 160),
  down(140, 160),
  ...mods.map(keyDown),
  move(200, 162),
  move(257, 163),
  probe("near-edge"),
  up(),
  ...[...mods].reverse().map(keyUp),
];

/**
 * Drags the small square below the target so its centre lands 3 px left
 * of the target's vertical centre line (x 375).
 */
const dragNearCenter = (): Step[] => [
  move(140, 160),
  down(140, 160),
  move(250, 250),
  move(372, 340),
  probe("near-center"),
  up(),
];

const rulersOn: Step[] = [
  move(600, 500),
  keyDown("Control"),
  keyDown("Alt"),
  press("r"),
  keyUp("Alt"),
  keyUp("Control"),
  wait(200),
];

const THREE_IN_ROW: Fixture = {
  shapes: [
    { type: "rect", x: 100, y: 100, w: 80, h: 80, fill: [229, 57, 53] },
    { type: "rect", x: 220, y: 100, w: 80, h: 80, fill: [67, 160, 71] },
    { type: "rect", x: 380, y: 300, w: 80, h: 80, fill: [30, 136, 229] },
  ],
};

export const snapCases: ToolCase[] = [
  {
    id: "snap/smart-guide-edge",
    covers: [
      "EDT-GUIDE-001",
      "EDT-GUIDE-002",
      "EDT-GUIDE-003",
      "EDT-GUIDE-004",
      "EDT-GUIDE-007",
      "EDT-SNAP-010",
      "EDT-SNAP-006",
      "EDT-EDITOR-009",
    ],
    fixture: PAIR,
    steps: dragNearEdge(),
  },
  {
    id: "snap/smart-guide-overlay",
    covers: ["EDT-GUIDE-005", "EDT-GUIDE-007"],
    fixture: PAIR,
    steps: [
      move(140, 160),
      down(140, 160),
      move(200, 162),
      move(257, 163),
      shotGuides(80, 60, 400, 220),
    ],
  },
  {
    id: "snap/ctrl-inverts-snapping",
    covers: ["EDT-SNAP-003"],
    fixture: PAIR,
    steps: dragNearEdge(["Control"]),
  },
  {
    id: "snap/snapping-disabled",
    covers: ["EDT-SNAP-002", "EDT-SNAP-001"],
    fixture: PAIR,
    steps: [
      move(600, 500),
      keyDown("Shift"),
      press("F10"),
      keyUp("Shift"),
      probe("disabled"),
      ...dragNearEdge(),
    ],
  },
  {
    id: "snap/snapping-disabled-ctrl-enables",
    covers: ["EDT-SNAP-002", "EDT-SNAP-003"],
    fixture: PAIR,
    steps: [
      move(600, 500),
      keyDown("Shift"),
      press("F10"),
      keyUp("Shift"),
      ...dragNearEdge(["Control"]),
    ],
  },
  {
    id: "snap/snap-distance-scales-with-zoom",
    covers: ["EDT-SNAP-006", "EDT-GUIDE-001"],
    view: { zoom: 2, origin: [100, 0] },
    fixture: PAIR,
    steps: [
      move(140, 160),
      down(140, 160),
      move(200, 162),
      move(216, 163),
      probe("near-edge"),
      up(),
    ],
  },
  {
    // Centre alignment comes only from the shapes (bbox) guide: no anchor
    // point lies on the target's centre line, unlike its edges, which the
    // anchor point guide snaps to as well.
    id: "snap/smart-guide-center",
    covers: ["EDT-SNAP-004", "EDT-GUIDE-001"],
    fixture: PAIR,
    steps: dragNearCenter(),
  },
  {
    id: "snap/bbox-guide-toggled-off",
    covers: ["EDT-SNAP-004"],
    fixture: PAIR,
    steps: [action("view.toggle-guide.guide.bbox"), ...dragNearCenter()],
  },
  {
    id: "snap/equal-spacing",
    covers: ["EDT-GUIDE-008", "EDT-SNAP-010"],
    fixture: THREE_IN_ROW,
    steps: [
      move(420, 340),
      down(420, 340),
      move(400, 200),
      move(381, 142),
      probe("near-equal-gap"),
      up(),
    ],
  },
  {
    id: "snap/equal-spacing-overlay",
    covers: ["EDT-GUIDE-008", "EDT-GUIDE-005", "EDT-GUIDE-021"],
    fixture: THREE_IN_ROW,
    steps: [
      move(420, 340),
      down(420, 340),
      move(400, 200),
      move(381, 142),
      shotGuides(80, 60, 440, 180),
    ],
  },
  {
    id: "snap/grid",
    covers: ["EDT-SNAP-007", "EDT-GUIDE-013", "EDT-GUIDE-014"],
    fixture: { ...PAIR, scene: { gm: "box", gx: 25, gy: 25 } },
    steps: [move(140, 160), down(140, 160), move(170, 190), move(193, 203), up()],
  },
  {
    id: "snap/grid-overlay",
    covers: ["EDT-GUIDE-013"],
    fixture: { ...PAIR, scene: { gm: "box", gx: 25, gy: 25 } },
    steps: [move(600, 500), shot(80, 80, 300, 200)],
  },
  {
    id: "snap/grid-axonometric-overlay",
    covers: ["EDT-GUIDE-013", "EDT-GUIDE-014"],
    fixture: { scene: { gm: "axo", gaw: 30 } },
    steps: [move(600, 500), shot(80, 80, 300, 200)],
  },
  {
    id: "snap/grid-axonometric-move",
    covers: ["EDT-GUIDE-013", "EDT-SNAP-007"],
    fixture: { ...PAIR, scene: { gm: "axo", gaw: 30 } },
    steps: [move(140, 160), down(140, 160), move(170, 190), move(193, 203), up()],
  },
  {
    id: "snap/guide-lines",
    covers: ["EDT-SNAP-009", "EDT-GUIDE-010"],
    fixture: { ...PAIR, scene: { hgl: [300], vgl: [50] } },
    steps: [
      move(140, 160),
      down(140, 160),
      move(120, 200),
      move(103, 257),
      probe("near-guides"),
      up(),
    ],
  },
  {
    id: "snap/guide-lines-overlay",
    covers: ["EDT-GUIDE-010"],
    fixture: { ...PAIR, scene: { hgl: [300], vgl: [50] } },
    steps: [move(600, 500), shot(0, 250, 500, 100)],
  },
  {
    id: "snap/guide-lines-hidden-still-snap",
    covers: ["EDT-GUIDE-010", "EDT-GUIDE-023"],
    fixture: { ...PAIR, scene: { hgl: [300], vgl: [50] } },
    steps: [
      move(600, 500),
      keyDown("Control"),
      press("Comma"),
      keyUp("Control"),
      probe("hidden"),
      move(140, 160),
      down(140, 160),
      move(120, 200),
      move(103, 257),
      up(),
    ],
  },
  {
    id: "snap/anchor-points",
    covers: ["EDT-SNAP-011", "EDT-GUIDE-015", "EDT-GUIDE-009", "EDT-GUIDE-006"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [300, 300],
            [420, 380],
          ],
        },
        { type: "rect", x: 100, y: 120, w: 80, h: 80, fill: [229, 57, 53] },
      ],
    },
    steps: [
      move(180, 200),
      down(180, 200),
      move(300, 290),
      move(417, 377),
      probe("near-point"),
      up(),
    ],
  },
  {
    id: "snap/anchor-points-overlay",
    covers: ["EDT-GUIDE-015", "EDT-GUIDE-005"],
    fixture: {
      shapes: [
        {
          type: "path",
          points: [
            [300, 300],
            [420, 380],
          ],
        },
        { type: "rect", x: 100, y: 120, w: 80, h: 80, fill: [229, 57, 53] },
      ],
    },
    steps: [
      move(180, 200),
      down(180, 200),
      move(300, 290),
      move(417, 377),
      shotGuides(280, 260, 240, 200),
    ],
  },
  {
    id: "snap/full-pixels-at-zoom",
    covers: ["EDT-SNAP-008"],
    view: { zoom: 3, origin: [0, 0] },
    fixture: { shapes: [{ type: "rect", x: 100, y: 100, w: 50, h: 50, fill: [229, 57, 53] }] },
    steps: [move(120, 120), down(120, 120), move(121, 121.4), move(122.33, 121.67), up()],
  },
  {
    id: "snap/full-pixels-off",
    covers: ["EDT-SNAP-008", "EDT-SNAP-004"],
    view: { zoom: 3, origin: [0, 0] },
    fixture: { shapes: [{ type: "rect", x: 100, y: 100, w: 50, h: 50, fill: [229, 57, 53] }] },
    steps: [
      action("view.toggle-guide.guide.full-pixels"),
      move(120, 120),
      down(120, 120),
      move(121, 121.4),
      move(122.33, 121.67),
      up(),
    ],
  },
  {
    id: "snap/full-pixels-kept-with-ctrl",
    covers: ["EDT-SNAP-003", "EDT-SNAP-008"],
    view: { zoom: 3, origin: [0, 0] },
    fixture: { shapes: [{ type: "rect", x: 100, y: 100, w: 50, h: 50, fill: [229, 57, 53] }] },
    steps: [
      move(120, 120),
      down(120, 120),
      keyDown("Control"),
      move(121, 121.4),
      move(122.33, 121.67),
      up(),
      keyUp("Control"),
    ],
  },
  {
    id: "snap/page-edges",
    covers: ["EDT-GUIDE-016", "EDT-SNAP-011"],
    fixture: {
      page: { w: 500, h: 400 },
      shapes: [{ type: "rect", x: 100, y: 120, w: 80, h: 80, fill: [229, 57, 53] }],
    },
    steps: [
      move(140, 160),
      down(140, 160),
      move(80, 100),
      move(43, 43),
      probe("near-page-corner"),
      up(),
    ],
  },
  {
    id: "snap/page-overlay",
    covers: ["EDT-GUIDE-016", "EDT-GUIDE-017", "EDT-GUIDE-018", "EDT-VIEW-026", "EDT-VIEW-025"],
    fixture: {
      page: { w: 500, h: 400 },
      shapes: [{ type: "rect", x: 100, y: 120, w: 80, h: 80, fill: [229, 57, 53] }],
    },
    steps: [
      move(140, 160),
      down(140, 160),
      move(80, 100),
      move(43, 43),
      shotGuides(-30, -40, 560, 480),
    ],
  },
  {
    id: "snap/snap-zones",
    covers: ["EDT-SNAP-005"],
    fixture: PAIR,
    steps: [action("view.toggle-snapzones"), probe("on"), ...dragNearEdge()],
  },
  {
    id: "snap/snap-zones-overlay",
    covers: ["EDT-SNAP-005", "EDT-XFORM-022"],
    fixture: { ...PAIR, select: [1] },
    steps: [
      action("view.toggle-snapzones"),
      move(176, 196),
      wait(50),
      shotGuides(80, 100, 120, 120),
    ],
  },
  {
    id: "snap/snap-to-pixel-grid-action",
    covers: ["EDT-SNAP-012"],
    fixture: {
      shapes: [{ type: "rect", x: 100.3, y: 100.6, w: 80.4, h: 50.2, fill: [229, 57, 53] }],
      select: [0],
    },
    steps: [
      move(600, 500),
      keyDown("Shift"),
      keyDown("Control"),
      press("u"),
      keyUp("Control"),
      keyUp("Shift"),
    ],
  },
  {
    id: "guides/ruler-drag-creates-guide",
    covers: ["EDT-GUIDE-011", "EDT-VIEW-019"],
    fixture: PAIR,
    steps: [
      ...rulersOn,
      moveView(700, 82),
      { op: "down", at: { view: [700, 82] } },
      moveView(700, 200),
      moveView(700, 352),
      probe("dragging"),
      up(),
      probe("created"),
      moveView(259, 600),
      { op: "down", at: { view: [259, 600] } },
      moveView(400, 600),
      moveView(551, 600),
      up(),
      probe("vertical-created"),
    ],
  },
  {
    id: "guides/ruler-drag-overlay",
    covers: ["EDT-GUIDE-011", "EDT-VIEW-036"],
    fixture: PAIR,
    steps: [
      ...rulersOn,
      moveView(700, 82),
      { op: "down", at: { view: [700, 82] } },
      moveView(700, 200),
      moveView(700, 352),
      { op: "shot", rect: { view: [500, 300, 400, 100] } },
    ],
  },
  {
    id: "guides/ruler-click-adds-guide-at-zero",
    covers: ["EDT-GUIDE-011"],
    fixture: PAIR,
    steps: [...rulersOn, { op: "down", at: { view: [700, 82] } }, up(), probe("after")],
  },
  {
    id: "guides/move-and-remove-guide",
    covers: ["EDT-GUIDE-012", "EDT-TOOL-024", "EDT-TOOL-002"],
    fixture: { ...PAIR, scene: { hgl: [300] } },
    steps: [
      ...rulersOn,
      move(600, 300),
      probe("hover-guide"),
      down(600, 300),
      move(600, 330),
      move(600, 351),
      probe("moving"),
      up(),
      probe("moved"),
      down(600, 351),
      move(600, 200),
      keyDown("Control"),
      move(600, 120),
      keyUp("Control"),
      { op: "move", at: { view: [700, 80] } },
      up(),
      probe("removed"),
    ],
  },
];
