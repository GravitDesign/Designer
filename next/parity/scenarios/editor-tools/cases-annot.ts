import type { ToolCase } from "./case.ts";
import { THREE } from "./cases-pointer.ts";
import {
  clickElement,
  down,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  shot,
  up,
  wait,
  click,
  drag,
  type Step,
} from "./steps.ts";

const openAnnotations: Step[] = [
  move(600, 500),
  clickElement(".sidebar-option.sidebar-annotations"),
  wait(300),
];
const annotTool = (name: string): Step[] => [
  clickElement(`.annotations-toolbar .gravit-icon-annotationtools-${name}`),
  wait(100),
];

const ANNOT = ["EDT-TOOL-087", "EDT-TOOLMGR-015", "EDT-TOOLMGR-028"];

export const annotationCases: ToolCase[] = [
  {
    id: "annotations/mode-and-blocked-shortcuts",
    covers: [
      "EDT-TOOL-087",
      "EDT-TOOLMGR-027",
      "EDT-TOOLMGR-028",
      "EDT-TOOLMGR-026",
      "EDT-TOOLMGR-014",
    ],
    fixture: { ...THREE, select: [0] },
    steps: [
      ...openAnnotations,
      probe("opened"),
      press("r"),
      probe("r-blocked"),
      press("p"),
      probe("p-blocked"),
      press("q"),
      probe("q-ignored"),
      press("h"),
      probe("hand-allowed"),
      press("v"),
      ...annotTool("ellipse"),
      probe("ellipse-tool"),
      press("Escape"),
      wait(50),
      probe("esc-exits"),
    ],
  },
  {
    id: "annotations/ellipse",
    covers: [...ANNOT, "EDT-TOOL-088", "EDT-CURSOR-007"],
    steps: [
      ...openAnnotations,
      ...annotTool("ellipse"),
      move(90, 90),
      probe("cursor"),
      down(100, 100),
      move(150, 130),
      move(200, 180),
      up(),
      wait(50),
      probe("after"),
      ...annotTool("ellipse"),
      keyDown("Shift"),
      keyDown("Alt"),
      ...drag(
        [300, 300],
        [
          [330, 320],
          [360, 340],
        ],
      ),
      keyUp("Alt"),
      keyUp("Shift"),
    ],
  },
  {
    id: "annotations/rectangle",
    covers: [...ANNOT, "EDT-TOOL-089", "EDT-CURSOR-007"],
    steps: [
      ...openAnnotations,
      ...annotTool("rectangle"),
      move(90, 90),
      probe("cursor"),
      ...drag(
        [100, 100],
        [
          [150, 130],
          [200, 180],
        ],
      ),
      ...annotTool("rectangle"),
      keyDown("Shift"),
      ...drag(
        [300, 300],
        [
          [330, 320],
          [380, 340],
        ],
      ),
      keyUp("Shift"),
    ],
  },
  {
    id: "annotations/arrow",
    covers: [...ANNOT, "EDT-TOOL-090", "EDT-CURSOR-007"],
    steps: [
      ...openAnnotations,
      ...annotTool("line"),
      move(90, 90),
      probe("cursor"),
      ...drag(
        [100, 100],
        [
          [150, 130],
          [250, 160],
        ],
      ),
      ...annotTool("line"),
      keyDown("Shift"),
      ...drag(
        [100, 300],
        [
          [150, 320],
          [250, 340],
        ],
      ),
      keyUp("Shift"),
    ],
  },
  {
    id: "annotations/comment-note",
    covers: [...ANNOT, "EDT-TOOL-091", "EDT-CURSOR-007"],
    steps: [
      ...openAnnotations,
      ...annotTool("comment"),
      move(140, 140),
      probe("cursor"),
      ...click(150, 150),
      wait(200),
      probe("after"),
    ],
  },
  {
    id: "annotations/pencil",
    covers: [...ANNOT, "EDT-TOOL-092", "EDT-CURSOR-007"],
    steps: [
      ...openAnnotations,
      ...annotTool("pencil"),
      move(90, 90),
      probe("cursor"),
      press("Enter"),
      probe("enter-ignored"),
      ...drag(
        [100, 100],
        [
          [130, 120],
          [170, 150],
          [210, 140],
          [240, 120],
        ],
      ),
      wait(600),
      probe("after"),
    ],
  },
  {
    id: "annotations/highlighter",
    covers: [...ANNOT, "EDT-TOOL-093", "EDT-CURSOR-007"],
    steps: [
      ...openAnnotations,
      ...annotTool("highlighter"),
      move(90, 90),
      probe("cursor"),
      ...drag(
        [100, 200],
        [
          [150, 200],
          [200, 202],
          [260, 204],
        ],
      ),
      wait(600),
      probe("after"),
    ],
  },
  {
    id: "annotations/drawing-overlay",
    covers: ["EDT-TOOL-088"],
    steps: [
      ...openAnnotations,
      ...annotTool("rectangle"),
      down(100, 100),
      move(150, 130),
      move(200, 180),
      shot(80, 80, 140, 120),
    ],
  },
  {
    id: "annotations/click-active-tool-returns-to-pointer",
    covers: ["EDT-TOOL-087", "EDT-TOOLMGR-030"],
    steps: [
      ...openAnnotations,
      ...annotTool("rectangle"),
      probe("rect"),
      ...annotTool("rectangle"),
      probe("toggled-off"),
    ],
  },
];
