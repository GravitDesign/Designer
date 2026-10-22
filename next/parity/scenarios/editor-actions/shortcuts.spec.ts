// Every keyboard shortcut of a registered action, pressed with real
// Playwright keyboard input on a prepared document. The record per key
// check is the same as in exec.spec.ts (document, selection, undo/redo,
// view, settings), so a shortcut that runs the wrong action, or none,
// changes the output. Keys use the Windows/Linux mapping (Ctrl for
// Cmd, Alt for Option); each scenario records the platform the old app
// detected.
//
// Shortcuts whose action opens a dialog, a file picker or a download are
// in dialogs.spec.ts and files.spec.ts, clipboard keys in
// clipboard.spec.ts, Layers-panel keys in layers.spec.ts.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { ACTION_ITEMS } from "./action-items.ts";
import { AFTER_DELAY, runKeyChecks, type KeyCheck } from "./keys.ts";

const SNAP = ["snap_disabled", "snap_zones", "snap_guides"];
const VIEW = ["rulers_visible", "guide_lines_visible", "symbol_labels_visible"];

interface Group {
  name: string;
  covers: string[];
  checks: KeyCheck[];
}

const groups: Group[] = [
  {
    name: "edit",
    covers: [
      "ACT-KEY-025",
      "ACT-KEY-026",
      "ACT-KEY-027",
      "ACT-KEY-028",
      "EDT-UNDO-009",
      "EDT-UNDO-010",
    ],
    checks: [
      {
        name: "undo",
        setup: "rects2",
        id: "edit.undo",
        keys: ["Control+KeyZ"],
        args: { pre: ["modify.group"], undo: false },
      },
      {
        name: "redo",
        setup: "rects2",
        id: "edit.redo",
        keys: ["Control+Shift+KeyZ"],
        args: { pre: ["modify.group", "edit.undo"], undo: false },
      },
      { name: "delete", setup: "rects2", id: "edit.delete", keys: ["Delete"] },
      { name: "delete-backspace", setup: "rects2", id: "edit.delete", keys: ["Backspace"] },
      { name: "duplicate", setup: "rects2", id: "edit.duplicate", keys: ["Control+KeyD"] },
      {
        name: "duplicate-shift",
        setup: "rects2",
        id: "edit.duplicate",
        keys: ["Control+Shift+KeyD"],
      },
      { name: "select-all", setup: "rects3-one", id: "edit.select-all", keys: ["Control+KeyA"] },
      {
        name: "deselect-all",
        setup: "rects2",
        id: "edit.deselect-all",
        keys: ["Control+Shift+KeyA"],
      },
      {
        name: "invert-selection",
        setup: "rects3-one",
        id: "edit.invert-selection",
        keys: ["Control+Shift+KeyI"],
      },
      { name: "paste-style-no-clipboard", setup: "styled", id: "edit.paste.style", keys: ["F4"] },
      {
        name: "paste-style",
        setup: "styled",
        id: "edit.paste.style",
        keys: ["F4"],
        args: { copyFirst: "selection", pre: ["edit.select-all"] },
      },
      {
        name: "new-from-clipboard",
        setup: "rects2",
        id: "file.new.clipboard",
        keys: ["Control+Shift+Alt+KeyN"],
        args: { copyFirst: "selection", shell: true },
      },
    ],
  },
  {
    name: "opacity",
    covers: ["ACT-KEY-004", "ACT-KEY-028"],
    checks: [
      {
        name: "shift-5",
        setup: "rects2",
        id: "edit.change-opacity",
        keys: ["Shift+Digit5"],
        wait: AFTER_DELAY,
      },
      {
        name: "shift-0",
        setup: "rects2",
        id: "edit.change-opacity",
        keys: ["Shift+Digit0"],
        wait: AFTER_DELAY,
        args: { pre: [] },
      },
      {
        name: "shift-2-5",
        setup: "rects2",
        id: "edit.change-opacity",
        keys: ["Shift+Digit2", "Shift+Digit5"],
        wait: AFTER_DELAY,
      },
      {
        name: "shift-0-5",
        setup: "rects2",
        id: "edit.change-opacity",
        keys: ["Shift+Digit0", "Shift+Digit5"],
        wait: AFTER_DELAY,
      },
      {
        name: "shift-2-then-late-5",
        setup: "rects2",
        id: "edit.change-opacity",
        keys: ["Shift+Digit2", "Shift+Digit5"],
        gap: AFTER_DELAY,
        wait: AFTER_DELAY,
      },
    ],
  },
  {
    name: "arrange",
    covers: ["EDT-DUP-006"],
    checks: [
      {
        name: "send-front",
        setup: "stack",
        id: "arrange.order.send-front",
        keys: ["Control+Shift+ArrowUp"],
      },
      {
        name: "bring-forward",
        setup: "stack",
        id: "arrange.order.bring-forward",
        keys: ["Control+ArrowUp"],
      },
      {
        name: "send-backward",
        setup: "stack",
        id: "arrange.order.send-backward",
        keys: ["Control+ArrowDown"],
      },
      {
        name: "send-back",
        setup: "stack",
        id: "arrange.order.send-back",
        keys: ["Control+Shift+ArrowDown"],
      },
      { name: "align-left", setup: "rects3", id: "arrange.align.align-left", keys: ["Alt+KeyA"] },
      {
        name: "align-center",
        setup: "rects3",
        id: "arrange.align.align-center",
        keys: ["Alt+KeyH"],
      },
      { name: "align-right", setup: "rects3", id: "arrange.align.align-right", keys: ["Alt+KeyD"] },
      { name: "align-top", setup: "rects3", id: "arrange.align.align-top", keys: ["Alt+KeyW"] },
      {
        name: "align-middle",
        setup: "rects3",
        id: "arrange.align.align-middle",
        keys: ["Alt+KeyV"],
      },
      {
        name: "align-bottom",
        setup: "rects3",
        id: "arrange.align.align-bottom",
        keys: ["Alt+KeyS"],
      },
      {
        name: "snap-unit-full",
        setup: "grid",
        id: "arrange.snap-unit.full",
        keys: ["Control+Shift+KeyU"],
      },
    ],
  },
  {
    name: "modify",
    covers: [],
    checks: [
      { name: "group", setup: "rects2", id: "modify.group", keys: ["Control+KeyG"] },
      { name: "ungroup", setup: "group", id: "modify.split", keys: ["Control+Shift+KeyG"] },
      // modify.clip and modify.createnestedcompound share Ctrl+Alt+M.
      { name: "clip-keys", setup: "overlap", id: "modify.clip", keys: ["Control+Alt+KeyM"] },
      {
        name: "nested-compound-keys",
        setup: "compounds2",
        id: "modify.createnestedcompound",
        keys: ["Control+Alt+KeyM"],
      },
      {
        name: "mask",
        setup: "overlap",
        id: "modify.mask-with-shape",
        keys: ["Control+Shift+KeyM"],
      },
      {
        name: "detach-symbol",
        setup: "symbol-instance",
        id: "modify.detachsymbol",
        keys: ["Control+Shift+F8"],
      },
      { name: "flatten", setup: "rect-border", id: "modify.path2bmp", keys: ["F7"] },
      {
        name: "swap-paint-layers",
        setup: "rect-border",
        id: "modify.swap-paint-layers",
        keys: ["KeyX"],
      },
      {
        name: "create-new-layer",
        setup: "rect",
        id: "modify.create-new-layer",
        keys: ["Control+KeyM"],
        args: { shell: true },
      },
    ],
  },
  {
    name: "compound",
    covers: ["ACT-KEY-029", "ACT-MODIFY-007"],
    checks: [
      {
        name: "main-timeout-union",
        setup: "overlap",
        id: "modify.merge",
        keys: ["Control+Shift+KeyY"],
        wait: AFTER_DELAY,
      },
      {
        name: "union",
        setup: "overlap",
        id: "modify.merge.union",
        keys: ["Control+Shift+KeyY", "KeyU"],
        wait: AFTER_DELAY,
      },
      {
        name: "subtract",
        setup: "overlap",
        id: "modify.merge.subtract",
        keys: ["Control+Shift+KeyY", "KeyS"],
        wait: AFTER_DELAY,
      },
      {
        name: "intersect",
        setup: "overlap",
        id: "modify.merge.intersect",
        keys: ["Control+Shift+KeyY", "KeyI"],
        wait: AFTER_DELAY,
      },
      {
        name: "difference",
        setup: "overlap",
        id: "modify.merge.difference",
        keys: ["Control+Shift+KeyY", "KeyX"],
        wait: AFTER_DELAY,
      },
      // A sub-key after the 500 ms window: union runs on timeout, then X is
      // the swap-paint-layers key.
      {
        name: "late-sub-key",
        setup: "overlap",
        id: "modify.merge",
        keys: ["Control+Shift+KeyY", "KeyX"],
        gap: AFTER_DELAY,
        wait: AFTER_DELAY,
      },
      // Another key inside the window cancels the main action.
      {
        name: "other-key-cancels",
        setup: "overlap",
        id: "modify.merge",
        keys: ["Control+Shift+KeyY", "KeyQ"],
        wait: AFTER_DELAY,
        args: { tool: true },
      },
      {
        name: "change-compound-op",
        setup: "compound",
        id: "modify.merge.intersect",
        keys: ["Control+Shift+KeyY", "KeyI"],
        wait: AFTER_DELAY,
      },
    ],
  },
  {
    name: "path",
    covers: [],
    checks: [
      { name: "join", setup: "paths2", id: "modify.join-paths", keys: ["Control+KeyJ"] },
      {
        name: "split-path",
        setup: "compoundpath",
        id: "modify.split-path",
        keys: ["Control+Shift+KeyJ"],
      },
      {
        name: "convert-to-path",
        setup: "rect",
        id: "modify.converttopath",
        keys: ["Control+Shift+KeyP"],
      },
      {
        name: "convert-to-raw-path",
        setup: "rect-border",
        id: "modify.converttorawpath",
        keys: ["Control+Shift+KeyR"],
      },
    ],
  },
  {
    name: "joint-type",
    covers: ["ACT-KEY-029"],
    checks: [
      {
        name: "main-alone",
        setup: "path-anchor",
        id: "modify.change-anchor-points-joint-type",
        keys: ["Control+Alt+KeyA"],
        wait: AFTER_DELAY,
      },
      ...(
        [
          ["straight", "KeyS"],
          ["mirrored", "KeyM"],
          ["disconnected", "KeyD"],
          ["connector", "KeyC"],
          ["asymmetric", "KeyA"],
        ] as const
      ).map(([t, k]): KeyCheck => ({
        name: t,
        setup: "path-anchor",
        id: `modify.change-anchor-points-joint-type.${t}`,
        keys: ["Control+Alt+KeyA", k],
        wait: AFTER_DELAY,
      })),
    ],
  },
  {
    name: "view-zoom",
    covers: ["ACT-KEY-025"],
    checks: [
      {
        name: "original",
        setup: "scattered",
        id: "view.zoom.original",
        keys: ["Control+Digit0"],
        args: { view: true },
      },
      {
        name: "fit-all",
        setup: "scattered",
        id: "view.zoom.fit.all",
        keys: ["Control+Alt+Digit0"],
        args: { view: true },
      },
      {
        name: "mag-50",
        setup: "scattered",
        id: "view.magnification.50",
        keys: ["Control+Digit5"],
        args: { view: true },
      },
      {
        name: "mag-100",
        setup: "scattered",
        id: "view.magnification.100",
        keys: ["Control+Digit1"],
        args: { view: true, pre: ["view.magnification.50"] },
      },
      {
        name: "mag-400",
        setup: "scattered",
        id: "view.magnification.400",
        keys: ["Control+Digit4"],
        args: { view: true },
      },
      {
        name: "mag-800",
        setup: "scattered",
        id: "view.magnification.800",
        keys: ["Control+Digit8"],
        args: { view: true },
      },
      {
        name: "zoom-in-plus",
        setup: "scattered",
        id: "view.zoom.in",
        keys: ["Control+Shift+Equal"],
        args: { view: true },
      },
      {
        name: "zoom-in-equal",
        setup: "scattered",
        id: "view.zoom.in",
        keys: ["Control+Equal"],
        args: { view: true },
      },
      {
        name: "zoom-out",
        setup: "scattered",
        id: "zoom.out",
        keys: ["Control+Minus"],
        args: { view: true },
      },
      // Global shortcuts still fire while a text input has focus; others do not.
      {
        name: "zoom-in-from-input",
        setup: "scattered",
        id: "view.zoom.in",
        keys: ["Control+Equal"],
        inInput: true,
        args: { view: true },
      },
      {
        name: "group-from-input",
        setup: "rects2",
        id: "modify.group",
        keys: ["Control+KeyG"],
        inInput: true,
      },
    ],
  },
  {
    name: "view-toggles",
    covers: [],
    checks: [
      {
        name: "outline-view",
        setup: "rect",
        id: "view.outline-view",
        keys: ["Alt+KeyY"],
        args: { view: true },
      },
      {
        name: "rulers",
        setup: "rect",
        id: "view.canvas.show-rulers",
        keys: ["Control+Alt+KeyR"],
        args: { view: true, settings: VIEW },
      },
      {
        name: "guide-lines",
        setup: "rect",
        id: "view.canvas.show-guide-lines",
        keys: ["Control+Comma"],
        args: { view: true, settings: VIEW },
      },
      {
        name: "grid",
        setup: "rect",
        id: "view.canvas.show-grid",
        keys: ["Control+Alt+KeyG"],
        args: { view: true },
      },
      {
        name: "effects",
        setup: "rect",
        id: "view.canvas.show-effects",
        keys: ["Control+KeyE"],
        args: { view: true },
      },
      {
        name: "selection-handles",
        setup: "rect",
        id: "view.canvas.show-selection-handles",
        keys: ["Control+Shift+KeyX"],
        args: { view: true },
      },
      {
        name: "snap",
        setup: "rect",
        id: "view.toggle-snap",
        keys: ["Shift+F10"],
        args: { settings: SNAP },
      },
      {
        name: "layers-sidebar",
        setup: "rect",
        id: "view.toggle-sidebar.outline",
        keys: ["Alt+Digit1"],
        args: { shell: true },
      },
      {
        name: "inspector-sidebar",
        setup: "rect",
        id: "view.toggle-sidebar.inspector",
        keys: ["Alt+Digit2"],
        args: { shell: true },
      },
    ],
  },
  {
    name: "windows-pages",
    covers: [],
    checks: [
      {
        name: "new-view",
        setup: "rect",
        id: "view.clone",
        keys: ["Control+Alt+KeyN"],
        args: { shell: true },
      },
      {
        name: "next-tab",
        setup: "two-windows",
        id: "view.change-active-window.next",
        keys: ["Alt+Period"],
        args: { shell: true },
      },
      {
        name: "previous-tab",
        setup: "two-windows",
        id: "view.change-active-window.previous",
        keys: ["Alt+Comma"],
        args: { shell: true },
      },
      {
        name: "close-window",
        setup: "two-windows",
        id: "file.close-active-window",
        keys: ["Alt+KeyQ"],
        args: { shell: true },
      },
      {
        name: "multi-page",
        setup: "pages3",
        id: "view.toggle-multi-page-mode",
        keys: ["F6"],
        args: { view: true },
      },
      {
        name: "next-page",
        setup: "pages3",
        id: "view.change-active-page.next",
        keys: ["Control+Alt+ArrowDown"],
        args: { view: true },
      },
      {
        name: "previous-page",
        setup: "pages3",
        id: "view.change-active-page.previous",
        keys: ["Control+Alt+ArrowUp"],
        args: { view: true, pre: ["view.change-active-page.next"] },
      },
      // The PageDown/PageUp extra bindings are malformed in the old app.
      {
        name: "next-page-pagedown",
        setup: "pages3",
        id: "view.change-active-page.next",
        keys: ["PageDown"],
        args: { view: true },
      },
      {
        name: "previous-page-pageup",
        setup: "pages3",
        id: "view.change-active-page.previous",
        keys: ["PageUp"],
        args: { view: true, pre: ["view.change-active-page.next"] },
      },
    ],
  },
  {
    name: "tool-keys",
    covers: ["ACT-KEY-030", "ACT-KEY-031", "ACT-KEY-035"],
    checks: [
      { name: "q-pointer-transform", setup: "rect", keys: ["KeyR", "KeyQ"], args: { tool: true } },
      { name: "r-rectangle", setup: "rect", keys: ["KeyR"], args: { tool: true } },
      { name: "e-ellipse", setup: "rect", keys: ["KeyE"], args: { tool: true } },
      { name: "v-pointer", setup: "rect", keys: ["KeyR", "KeyV"], args: { tool: true } },
      {
        name: "eyedropper-i",
        setup: "rect",
        id: "edit.eyedropper.fill",
        keys: ["KeyI"],
        args: { tool: true },
      },
    ],
  },
];

const scenarios: Scenario[] = groups.map((g) => {
  const ids = new Set<string>();
  for (const c of g.checks) if (c.id) ids.add(ACTION_ITEMS[c.id] ?? c.id);
  return {
    id: `editor-actions/shortcuts/${g.name}`,
    covers: [...ids, "ACT-KEY-025", "ACT-KEY-027", ...g.covers],
    kind: "document",
    timeout: 240_000,
    driver: ({ page }) => runKeyChecks(page, g.checks),
  };
});

paritySuite("editor-actions shortcuts", defineScenarios(scenarios), { newApp: false });
