import type { ToolCase } from "./case.ts";
import { THREE } from "./cases-pointer.ts";
import { probe, probeDom, repaint, shot, touch, wait, type Pt, type Step } from "./steps.ts";

const TOUCH_OPEN = { settings: { touch: true } };

/** One finger down and up at p. */
const tap = (p: Pt): Step[] => [touch("start", p), wait(80), touch("end"), wait(80)];

/** Interpolated one- or two-finger move from `from` to `to`, `n` steps. */
const glide = (from: readonly Pt[], to: readonly Pt[], n: number): Step[] => {
  const steps: Step[] = [];
  for (let i = 1; i <= n; i++) {
    const pts = from.map((f, k) => {
      const t = to[k] ?? f;
      return [f[0] + ((t[0] - f[0]) * i) / n, f[1] + ((t[1] - f[1]) * i) / n] as Pt;
    });
    steps.push(touch("move", ...pts), wait(20));
  }
  return steps;
};

const TOUCH = ["EDT-TOUCH-003", "EDT-TOUCH-004", "EDT-TOUCH-005"];

export const touchCases: ToolCase[] = [
  {
    id: "touch/pinch-zoom",
    covers: [...TOUCH, "EDT-TOUCH-006", "EDT-TOUCH-016", "EDT-VIEW-001"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: THREE,
    steps: [
      touch("start", [200, 200], [300, 200]),
      wait(80),
      ...glide(
        [
          [200, 200],
          [300, 200],
        ],
        [
          [150, 200],
          [350, 200],
        ],
        5,
      ),
      probe("pinching"),
      touch("end"),
      wait(200),
      probe("after"),
    ],
  },
  {
    id: "touch/two-finger-pan",
    covers: [...TOUCH, "EDT-TOUCH-006"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: THREE,
    steps: [
      touch("start", [200, 200], [300, 200]),
      wait(80),
      ...glide(
        [
          [200, 200],
          [300, 200],
        ],
        [
          [150, 150],
          [250, 150],
        ],
        5,
      ),
      touch("end"),
      wait(200),
      probe("after"),
    ],
  },
  {
    id: "touch/tap-selects",
    covers: [...TOUCH, "EDT-TOUCH-007", "EDT-TOUCH-001"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: THREE,
    steps: [...tap([200, 160]), probe("selected"), ...tap([650, 500]), probe("cleared")],
  },
  {
    id: "touch/double-tap",
    covers: [...TOUCH, "EDT-TOUCH-007"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: { ...THREE, select: [0] },
    steps: [
      touch("start", [200, 160]),
      wait(20),
      touch("end"),
      wait(30),
      touch("start", [202, 161]),
      wait(20),
      touch("end"),
      wait(200),
      probe("after"),
    ],
  },
  {
    id: "touch/drag-moves-selection",
    covers: [...TOUCH, "EDT-TOUCH-008"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: { ...THREE, select: [0] },
    steps: [
      touch("start", [200, 160]),
      wait(80),
      ...glide([[200, 160]], [[260, 200]], 8),
      probe("dragging"),
      touch("end"),
      wait(100),
      probe("after"),
    ],
  },
  {
    id: "touch/long-press-context-menu",
    covers: [...TOUCH, "EDT-TOUCH-009", "EDT-TOUCH-012"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: { ...THREE, select: [0] },
    steps: [
      touch("start", [200, 160]),
      wait(700),
      touch("end"),
      wait(300),
      { op: "shot", rect: { view: [596, 356, 220, 454] } },
    ],
  },
  {
    // The app's own long press (500 ms timer) opens the touch context
    // menu; a 250 ms press doesn't. No contextmenu event is involved, so
    // this isn't Chromium's long-press gesture, which also comes later.
    id: "touch/long-press-context-menu-state",
    covers: [...TOUCH, "EDT-TOUCH-009", "EDT-TOUCH-012"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: { ...THREE, select: [0] },
    steps: [
      touch("start", [200, 160]),
      wait(250),
      touch("end"),
      wait(300),
      probeDom("short-press", ".context-menu-touch-overlay"),
      touch("start", [200, 160]),
      wait(700),
      touch("end"),
      wait(300),
      probeDom("long-press", ".context-menu-touch-overlay"),
    ],
  },
  {
    id: "touch/handles-overlay",
    covers: ["EDT-TOUCH-002", "EDT-EDITOR-028", "EDT-HANDLE-009", "EDT-HANDLE-024"],
    touch: true,
    open: TOUCH_OPEN,
    fixture: { ...THREE, select: [0] },
    steps: [wait(500), repaint(), shot(50, 40, 300, 260)],
  },
];
