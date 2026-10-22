import type { ToolCase } from "./case.ts";
import type { Fixture } from "./fixture.ts";
import { action, click, dblclick, down, move, probe, shot, up, wait, type Step } from "./steps.ts";

/** 256 x 192 image (four coloured quadrants) at (100, 100). */
const IMAGE: Fixture = { shapes: [{ type: "image", x: 100, y: 100, w: 256, h: 192 }] };

/** Selects the image and double-clicks it, which enters crop mode. */
const enterCrop: Step[] = [...click(228, 196), dblclick(228, 196), wait(100)];

const CROP = ["EDT-CROP-001", "EDT-ELEDIT-041", "EDT-EDITOR-004"];

export const cropCases: ToolCase[] = [
  {
    id: "crop/double-click-enters-crop",
    covers: [...CROP, "EDT-TOOL-017", "EDT-CROP-007", "EDT-TOOL-025"],
    fixture: IMAGE,
    steps: [
      ...enterCrop,
      probe("crop-mode", true),
      move(228, 196),
      probe("inside-cursor"),
      move(356, 292),
      probe("corner-cursor"),
    ],
  },
  {
    id: "crop/handles-overlay",
    covers: [...CROP, "EDT-HANDLE-022", "EDT-CROP-004", "EDT-ELEDIT-042"],
    fixture: IMAGE,
    steps: [...enterCrop, move(600, 500), shot(70, 60, 320, 260)],
  },
  {
    id: "crop/drag-frame-corner",
    covers: [...CROP, "EDT-CROP-003", "EDT-ELEDIT-043"],
    fixture: IMAGE,
    steps: [
      ...enterCrop,
      down(356, 292),
      move(330, 270),
      move(300, 250),
      probe("dragging"),
      up(),
      probe("cropped", true),
    ],
  },
  {
    id: "crop/drag-image-inside-frame",
    covers: [...CROP, "EDT-CROP-003", "EDT-ELEDIT-043"],
    fixture: IMAGE,
    steps: [
      ...enterCrop,
      down(356, 292),
      move(300, 250),
      up(),
      down(200, 170),
      move(210, 180),
      move(230, 190),
      probe("dragging"),
      up(),
    ],
  },
  {
    id: "crop/drag-overlay",
    covers: ["EDT-CROP-003"],
    fixture: IMAGE,
    steps: [...enterCrop, down(356, 292), move(330, 270), move(300, 250), shot(70, 60, 320, 260)],
  },
  {
    id: "crop/finish-crop-action",
    covers: ["EDT-CROP-005"],
    fixture: IMAGE,
    steps: [
      ...enterCrop,
      down(356, 292),
      move(300, 250),
      up(),
      action("modify.crop"),
      wait(50),
      probe("finished"),
    ],
  },
  {
    id: "crop/cancel-crop-action",
    covers: ["EDT-CROP-006"],
    fixture: IMAGE,
    steps: [
      ...enterCrop,
      down(356, 292),
      move(300, 250),
      up(),
      action("modify.cancel-crop"),
      wait(50),
      probe("cancelled"),
    ],
  },
  {
    id: "crop/initial-inset-option",
    covers: ["EDT-CROP-002"],
    fixture: { ...IMAGE, editorOptions: { imageCropDistance: 10 } },
    steps: [...enterCrop, probe("inset")],
  },
  {
    id: "crop/click-outside-leaves-crop",
    covers: ["EDT-CROP-001"],
    fixture: IMAGE,
    steps: [...enterCrop, ...click(600, 500), wait(50), probe("left")],
  },
];
