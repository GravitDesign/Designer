import type { ToolCase } from "./case.ts";
import type { Fixture } from "./fixture.ts";
import {
  click,
  down,
  drag,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  tool,
  up,
  wait,
  type Step,
} from "./steps.ts";

/**
 * Pen and bezigon branches the first pen cases don't reach: continuing a
 * path from its first point, Alt pressed before a drag, connector and
 * rounded-corner drags, the handle decisions around closing, Edit-mode
 * drags and closing the bezigon on release.
 */

/** Open polyline (100,100) -> (300,250) -> (100,250), selected. */
const POLY_SELECTED: Fixture = {
  shapes: [
    {
      type: "path",
      points: [
        [100, 100],
        [300, 250],
        [100, 250],
      ],
    },
  ],
  select: [0],
};

/** Open curve with smooth (symmetric) points and handles, selected. */
const CURVE: Fixture = {
  shapes: [
    {
      type: "path",
      tp: "TS",
      points: [
        [100, 200, 60, 240, 140, 160],
        [250, 120, 200, 120, 300, 120],
        [400, 200, 360, 160, 440, 240],
      ],
    },
  ],
  select: [0],
};

const clicks = (...pts: [number, number][]): Step[] => pts.flatMap(([x, y]) => click(x, y));

/** Pen: corner point at (100, 200), then a curve point at (250, 120) dragged to (320, 120). */
const curveStart: Step[] = [
  move(50, 50),
  tool("GPenTool"),
  ...click(100, 200),
  ...drag(
    [250, 120],
    [
      [280, 120],
      [320, 120],
    ],
  ),
];

export const penBranchCases: ToolCase[] = [
  {
    id: "pen/continue-from-first-point",
    covers: ["EDT-TOOL-038", "EDT-PATHEDIT-018"],
    fixture: POLY_SELECTED,
    steps: [
      move(500, 400),
      tool("GPenTool"),
      move(500, 400),
      // In Edit mode a click on the first point of the open path switches
      // to Prepend (a tool switch from the subselect tool would drop the
      // point selection).
      ...click(100, 100),
      probe("first-point-picked"),
      move(500, 400),
      // A curve point before the first point (Prepend): the dragged handle
      // is the incoming one, the mirrored one points to the path.
      ...drag(
        [50, 50],
        [
          [60, 40],
          [80, 30],
        ],
      ),
      probe("prepended-curve"),
      // Alt+right drag: a connector point whose handle lies on the line
      // through the next point.
      keyDown("Alt"),
      ...drag(
        [0, 100],
        [
          [-20, 120],
          [-40, 150],
        ],
        "right",
      ),
      keyUp("Alt"),
      probe("prepended-connector"),
      move(400, 400),
      press("Escape"),
    ],
  },
  {
    id: "pen/alt-press-on-end-point",
    covers: ["EDT-TOOL-041"],
    steps: [
      ...curveStart,
      move(400, 300),
      keyDown("Alt"),
      ...drag(
        [250, 120],
        [
          [270, 140],
          [290, 170],
        ],
      ),
      keyUp("Alt"),
      probe("after-alt-drag"),
      move(400, 300),
      press("Escape"),
    ],
  },
  {
    id: "pen/alt-drag-existing-point",
    covers: ["EDT-TOOL-041", "EDT-TOOL-044"],
    fixture: CURVE,
    steps: [
      move(500, 400),
      tool("GPenTool"),
      move(500, 400),
      // Alt held before the press on a middle point: the outgoing handle
      // moves by the drag, the point turns asymmetric.
      keyDown("Alt"),
      ...drag(
        [250, 120],
        [
          [260, 135],
          [270, 150],
        ],
      ),
      keyUp("Alt"),
      probe("dragged"),
    ],
  },
  {
    id: "pen/click-dragged-point",
    covers: ["EDT-TOOL-038"],
    steps: [
      ...curveStart,
      move(400, 300),
      ...click(250, 120),
      probe("after-click"),
      move(400, 300),
      press("Escape"),
    ],
  },
  {
    id: "pen/connector-handle-drag",
    covers: ["EDT-TOOL-043"],
    steps: [
      move(50, 50),
      tool("GPenTool"),
      ...click(100, 100),
      keyDown("Alt"),
      ...drag(
        [250, 100],
        [
          [280, 110],
          [300, 120],
        ],
        "right",
      ),
      keyUp("Alt"),
      move(400, 400),
      keyDown("Alt"),
      // Dragged back towards the previous point: no handle.
      ...drag(
        [250, 250],
        [
          [250, 230],
          [252, 220],
        ],
        "right",
      ),
      keyUp("Alt"),
      move(400, 400),
      press("Escape"),
    ],
  },
  {
    id: "pen/rounded-shoulder-drag",
    covers: ["EDT-TOOL-043"],
    steps: [
      move(50, 50),
      tool("GPenTool"),
      ...click(100, 100),
      ...drag(
        [250, 100],
        [
          [270, 100],
          [280, 104],
        ],
        "right",
      ),
      move(400, 400),
      // Dragged back onto the point: no shoulder.
      ...drag(
        [250, 250],
        [
          [270, 250],
          [250, 250],
        ],
        "right",
      ),
      move(400, 400),
      press("Escape"),
    ],
  },
  {
    id: "pen/close-drag-straight-end",
    covers: ["EDT-TOOL-045"],
    steps: [
      move(50, 50),
      tool("GPenTool"),
      ...clicks([100, 100], [250, 100], [250, 250]),
      move(110, 110),
      ...drag(
        [100, 100],
        [
          [80, 120],
          [60, 140],
        ],
      ),
      probe("closed"),
      press("Escape"),
    ],
  },
  {
    id: "pen/edit-drag-middle-point",
    covers: ["EDT-TOOL-044", "EDT-TOOL-051"],
    fixture: POLY_SELECTED,
    steps: [
      move(500, 400),
      tool("GPenTool"),
      move(500, 400),
      ...drag(
        [300, 250],
        [
          [320, 250],
          [340, 260],
        ],
      ),
      probe("dragged"),
    ],
  },
  {
    id: "pen/compound-path-segment",
    covers: ["EDT-TOOL-044"],
    fixture: {
      shapes: [
        {
          type: "compound",
          children: [
            {
              type: "path",
              points: [
                [100, 100],
                [300, 100],
              ],
            },
            {
              type: "path",
              points: [
                [100, 250],
                [300, 250],
              ],
            },
          ],
        },
      ],
      select: [0],
    },
    steps: [
      move(500, 400),
      tool("GPenTool"),
      move(500, 400),
      move(200, 250),
      ...click(200, 250),
      probe("inserted"),
    ],
  },
  {
    id: "pen/double-press-edit-option",
    covers: ["EDT-TOOL-046"],
    fixture: { editorOptions: { selectDoubleClickBehavior: "edit" } },
    steps: [
      move(50, 50),
      tool("GPenTool"),
      ...click(100, 100),
      ...click(250, 100),
      down(250, 100, undefined, true),
      up(),
      probe("after-double-press"),
    ],
  },
  {
    id: "pen/shift-replays-move",
    covers: ["EDT-TOOL-040"],
    steps: [
      move(50, 50),
      tool("GPenTool"),
      ...click(100, 100),
      // The pen ignores moves for DBLCLICKTM (300 ms) after a press.
      wait(350),
      move(250, 130),
      probe("before-shift"),
      // Shift alone replays the last move, constrained to 45°.
      keyDown("Shift"),
      probe("shift-replayed"),
      ...click(250, 130),
      keyUp("Shift"),
      move(400, 400),
      press("Escape"),
    ],
  },
];

/** Bezigon: three auto-handle points (100,100), (250,100), (250,250). */
const bezigonThree: Step[] = [
  move(50, 50),
  tool("GBezigonTool"),
  ...clicks([100, 100], [250, 100], [250, 250]),
];

export const bezigonBranchCases: ToolCase[] = [
  {
    id: "bezigon/close-on-release",
    covers: ["EDT-TOOL-055"],
    steps: [
      ...bezigonThree,
      move(140, 130),
      ...drag(
        [140, 130],
        [
          [120, 115],
          [100, 100],
        ],
      ),
      probe("closed"),
      press("Escape"),
    ],
  },
  {
    id: "bezigon/close-on-release-alt",
    covers: ["EDT-TOOL-055"],
    steps: [
      ...bezigonThree,
      move(140, 130),
      down(140, 130),
      move(120, 115),
      keyDown("Alt"),
      move(100, 100),
      up(),
      keyUp("Alt"),
      probe("closed"),
      press("Escape"),
    ],
  },
  {
    id: "bezigon/drag-end-onto-first",
    covers: ["EDT-TOOL-052", "EDT-TOOL-055"],
    steps: [
      ...bezigonThree,
      move(250, 250),
      ...drag(
        [250, 250],
        [
          [180, 180],
          [100, 100],
        ],
      ),
      probe("closed"),
      press("Escape"),
    ],
  },
];
