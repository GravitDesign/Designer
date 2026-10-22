import type { ToolCase } from "./case.ts";
import {
  click,
  down,
  keyDown,
  keyUp,
  move,
  probe,
  shot,
  tool,
  up,
  wait,
  type Step,
} from "./steps.ts";

/** How a shape tool is activated: a shortcut key or the tool class name. */
interface ShapeTool {
  name: string;
  /** Shortcut key, when the tool has one. */
  key?: string;
  /** Tool class name, used when there is no key. */
  className: string;
  /** Items covered by every case of this tool. */
  covers: readonly string[];
  shift: readonly string[];
  alt: readonly string[];
}

const activate = (t: ShapeTool): Step[] => [move(40, 40), tool(t.className)];

const BASE = [
  "EDT-TOOLMGR-018",
  "EDT-TOOLMGR-023",
  "EDT-CURSOR-009",
  "EDT-TOOLMGR-012",
  "EDT-TOOLMGR-013",
  "EDT-TOOLMGR-016",
];

const tools: ShapeTool[] = [
  {
    name: "rectangle",
    key: "r",
    className: "GRectangleTool",
    covers: ["EDT-TOOL-070", "EDT-CURSOR-006"],
    shift: ["EDT-TOOLMGR-019"],
    alt: ["EDT-TOOLMGR-020"],
  },
  {
    name: "ellipse",
    key: "e",
    className: "GEllipseTool",
    covers: ["EDT-TOOL-071", "EDT-HANDLE-013"],
    shift: ["EDT-TOOLMGR-019"],
    alt: ["EDT-TOOLMGR-020"],
  },
  {
    name: "polygon",
    className: "GPolygonTool",
    covers: ["EDT-TOOL-072"],
    shift: ["EDT-TOOL-072"],
    alt: ["EDT-TOOL-072"],
  },
  {
    name: "triangle",
    className: "GTriangleTool",
    covers: ["EDT-TOOL-073"],
    shift: ["EDT-TOOL-073"],
    alt: ["EDT-TOOL-073"],
  },
  {
    name: "star",
    className: "GStarTool",
    covers: ["EDT-TOOL-074"],
    shift: ["EDT-TOOL-074"],
    alt: ["EDT-TOOL-074"],
  },
  {
    name: "line",
    key: "l",
    className: "GLineTool",
    covers: ["EDT-TOOL-069", "EDT-HANDLE-025"],
    shift: ["EDT-TOOL-069", "EDT-TOOLMGR-019"],
    alt: ["EDT-TOOL-069", "EDT-TOOLMGR-020"],
  },
  {
    name: "slice",
    key: "s",
    className: "GSliceTool",
    covers: ["EDT-TOOL-036"],
    shift: ["EDT-TOOL-037"],
    alt: ["EDT-TOOL-037"],
  },
];

function casesFor(t: ShapeTool): ToolCase[] {
  const covers = (...extra: readonly string[]): string[] => [
    ...new Set([...BASE, ...t.covers, ...extra]),
  ];
  return [
    {
      id: `shapes/${t.name}-plain`,
      covers: covers(),
      steps: [
        ...activate(t),
        move(60, 60),
        probe("hover"),
        down(100, 100),
        move(140, 125),
        probe("mid-drag", true),
        move(230, 190),
        up(),
        probe("after"),
      ],
    },
    {
      id: `shapes/${t.name}-shift`,
      covers: covers(...t.shift),
      steps: [
        ...activate(t),
        keyDown("Shift"),
        down(100, 100),
        move(160, 130),
        move(250, 160),
        up(),
        keyUp("Shift"),
      ],
    },
    {
      id: `shapes/${t.name}-alt`,
      covers: covers(...t.alt),
      steps: [
        ...activate(t),
        keyDown("Alt"),
        down(200, 200),
        move(230, 220),
        move(260, 250),
        up(),
        keyUp("Alt"),
      ],
    },
    {
      id: `shapes/${t.name}-shift-alt`,
      covers: covers(...t.shift, ...t.alt),
      steps: [
        ...activate(t),
        keyDown("Shift"),
        keyDown("Alt"),
        down(200, 200),
        move(240, 215),
        move(290, 230),
        up(),
        keyUp("Alt"),
        keyUp("Shift"),
      ],
    },
    {
      id: `shapes/${t.name}-modifiers-mid-drag`,
      covers: covers(...t.shift, ...t.alt),
      steps: [
        ...activate(t),
        down(150, 150),
        move(200, 170),
        keyDown("Shift"),
        move(260, 185),
        probe("shift-down", true),
        keyDown("Alt"),
        move(265, 190),
        probe("shift-alt-down", true),
        keyUp("Shift"),
        move(270, 195),
        probe("alt-only", true),
        keyUp("Alt"),
        move(280, 205),
        up(),
      ],
    },
    {
      id: `shapes/${t.name}-space-moves`,
      covers: covers("EDT-TOOLMGR-021"),
      steps: [
        ...activate(t),
        down(100, 100),
        move(180, 160),
        keyDown("Space"),
        move(230, 210),
        probe("space-held", true),
        keyUp("Space"),
        move(260, 230),
        up(),
      ],
    },
    {
      id: `shapes/${t.name}-click-no-drag`,
      covers: covers(),
      steps: [...activate(t), ...click(150, 150), wait(50), probe("after-click")],
    },
    {
      id: `shapes/${t.name}-mid-drag-overlay`,
      covers: covers("EDT-TOOLMGR-022"),
      steps: [
        ...activate(t),
        down(100, 100),
        move(150, 130),
        move(220, 180),
        shot(60, 60, 220, 180),
      ],
    },
  ];
}

export const shapeCases: ToolCase[] = tools.flatMap(casesFor);
