// Every registered action run through app.execute(id) on a prepared
// document. Each scenario records the action's menu state (available,
// visible, enabled, checked) before and after, the document, selection and
// undo stack after running it, and the document after edit.undo and
// edit.redo when the action pushed an undo state. View actions also record
// zoom, scroll and view configuration; toggles record their settings.
//
// Actions that open a native file picker, start a download, open a dialog
// or leave the page (fullscreen, touch layout) only record their state
// here (`run: false`); their effect is covered by driver scenarios in
// dialogs.spec.ts and files.spec.ts.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { ACTION_ITEMS } from "./action-items.ts";
import { probe, type ProbeArgs } from "./lib.ts";

interface Case {
  id: string;
  setup?: string;
  variant?: string;
  covers?: string[];
  args?: Partial<ProbeArgs>;
}

const SNAP_SETTINGS = ["snap_disabled", "snap_zones", "snap_guides"];
const VIEW_SETTINGS = ["rulers_visible", "guide_lines_visible", "symbol_labels_visible"];

const cases: Case[] = [
  // ---------------------------------------------------------------- File
  { id: "file.new", args: { run: false } },
  { id: "file.open-from-template" },
  { id: "file.new.clipboard", variant: "empty-clipboard", setup: "rect" },
  {
    id: "file.new.clipboard",
    setup: "rects2",
    covers: ["EDT-CLIP-020"],
    args: { copyFirst: "selection", shell: true, clipboard: true, view: true },
  },
  { id: "file.open", args: { run: false } },
  { id: "file.open.safari", args: { run: false } },
  { id: "file.open-recent" },
  { id: "file.save", args: { run: false } },
  { id: "file.save-as.gvdesign", args: { run: false } },
  { id: "file.close-active-window", setup: "two-windows", args: { shell: true } },
  { id: "file.save-all" },
  { id: "file.place-import", args: { run: false } },
  { id: "file.import-image-from-ios-photos" },
  { id: "file.import-image-from-ios-files" },
  { id: "file.link-import" },
  { id: "font.import", args: { run: false } },
  { id: "file.export", args: { run: false } },
  { id: "file.save-as.png", args: { run: false } },
  { id: "file.save-as.jpg", args: { run: false } },
  { id: "file.save-as.svg", args: { run: false } },
  { id: "file.save-as.pdf", args: { run: false } },
  { id: "file.save-as.pdf.96", args: { run: false } },
  { id: "file.save-as.pdf.150", args: { run: false } },
  { id: "file.save-as.pdf.300", args: { run: false } },
  { id: "file.export.pdf", args: { run: false } },
  { id: "file.print", args: { run: false } },
  { id: "file.print", variant: "new-document", setup: "empty", args: { run: false } },
  { id: "file.install-to-desktop" },
  { id: "file.quit" },

  // ---------------------------------------------------------------- Edit
  {
    id: "edit.undo",
    setup: "rects2",
    covers: ["EDT-UNDO-006", "EDT-UNDO-007", "EDT-UNDO-009"],
    args: { pre: ["modify.group"], undo: false },
  },
  { id: "edit.undo", variant: "nothing-to-undo", setup: "empty", args: { undo: false } },
  {
    id: "edit.redo",
    setup: "rects2",
    covers: ["EDT-UNDO-006", "EDT-UNDO-007", "EDT-UNDO-010"],
    args: { pre: ["modify.group", "edit.undo"], undo: false },
  },
  { id: "edit.redo", variant: "nothing-to-redo", setup: "rect", args: { undo: false } },
  {
    id: "edit.cut",
    setup: "rects2",
    covers: ["EDT-CLIP-001", "EDT-CLIP-002", "EDT-CLIP-003", "EDT-CLIP-006"],
    args: { clipboard: true, settle: 300 },
  },
  {
    id: "edit.cut",
    variant: "group-child",
    setup: "group",
    covers: ["EDT-CLIP-003"],
    args: { clipboard: true, settle: 300 },
  },
  {
    id: "edit.copy",
    setup: "rects2",
    covers: ["EDT-CLIP-001", "EDT-CLIP-002", "EDT-CLIP-003"],
    args: { clipboard: true, settle: 300 },
  },
  {
    id: "edit.copy",
    variant: "nothing-selected",
    setup: "rect-nosel",
    args: { clipboard: true, settle: 300 },
  },
  {
    id: "paste.paste",
    setup: "rect",
    covers: ["EDT-CLIP-007", "EDT-CLIP-010"],
    args: { copyFirst: "selection", clipboard: true, settle: 300 },
  },
  {
    id: "paste.paste",
    variant: "fixed-page",
    setup: "fixed-page",
    covers: ["EDT-CLIP-010"],
    args: { copyFirst: "selection", settle: 300 },
  },
  { id: "paste.paste", variant: "empty-clipboard", setup: "rect", args: { settle: 300 } },
  {
    id: "edit.paste.in-place",
    setup: "rects2",
    covers: ["EDT-CLIP-018"],
    args: { copyFirst: "selection", pre: ["edit.deselect-all"] },
  },
  {
    id: "edit.paste.in-place",
    variant: "with-selection",
    setup: "rects3-one",
    covers: ["EDT-CLIP-018"],
    args: { copyFirst: "selection" },
  },
  {
    id: "edit.paste.replace",
    setup: "rects3-one",
    covers: ["EDT-CLIP-016"],
    args: { copyFirst: "selection", pre: ["edit.select-all"] },
  },
  {
    id: "edit.paste.inside",
    setup: "group",
    covers: ["EDT-CLIP-019"],
    args: { copyFirst: "selection" },
  },
  {
    id: "edit.paste.inside",
    variant: "into-shape",
    setup: "rects3-one",
    covers: ["EDT-CLIP-019"],
    args: { copyFirst: "selection" },
  },
  { id: "edit.paste.here" },
  {
    id: "edit.paste.style",
    setup: "styled",
    covers: ["EDT-CLIP-015"],
    args: { copyFirst: "selection", pre: ["edit.select-all"] },
  },
  { id: "edit.paste.style", variant: "no-clipboard", setup: "styled" },
  { id: "edit.delete", setup: "rects2", covers: ["EDT-DUP-003", "EDT-DUP-004"] },
  { id: "edit.delete", variant: "anchor-point", setup: "path-anchor", covers: ["EDT-DUP-004"] },
  { id: "edit.delete", variant: "group-child-last", setup: "compound", covers: ["EDT-DUP-004"] },
  {
    id: "edit.delete",
    variant: "instance-child",
    setup: "symbol-instance",
    covers: ["EDT-SYMBOL-006"],
    args: { options: { selectInstanceChild: true } },
  },
  { id: "edit.duplicate", setup: "rects2", covers: ["EDT-DUP-001"] },
  {
    id: "edit.duplicate",
    variant: "page",
    setup: "pages3",
    covers: ["EDT-DUP-001", "ADD-SCENE-001"],
    args: { options: { selectPage: true } },
  },
  { id: "edit.edit", setup: "rect", args: { tool: true } },
  { id: "edit.edit", variant: "text", setup: "text", args: { tool: true } },
  { id: "edit.select-all", setup: "rects3-one" },
  { id: "edit.select-all", variant: "pages", setup: "pages3" },
  { id: "edit.deselect-all", setup: "rects2" },
  { id: "edit.invert-selection", setup: "rects3-one" },
  { id: "edit.selectbyfonttype", setup: "texts" },
  { id: "edit.select-by-paintlayer.fill", setup: "styled" },
  { id: "edit.select-by-paintlayer.border", setup: "styled" },
  { id: "edit.select-by-paintlayer.fill_border", setup: "styled" },
  { id: "edit.select-by-border-width", setup: "styled" },
  { id: "edit.select-by-transparency", setup: "styled" },
  { id: "edit.select-by-blend-mode", setup: "styled" },
  { id: "edit.select-by-shape", setup: "styled" },
  { id: "edit.select-by-effect", setup: "styled-effect" },
  { id: "edit.settings", args: { run: false } },
  { id: "edit.eyedropper.fill", args: { run: false } },
  { id: "edit.eyedropper.border", args: { run: false } },
  { id: "edit.rename-layer", args: { run: false } },
  { id: "edit.change-opacity", args: { run: false } },

  // ------------------------------------------------------- Arrange / order
  { id: "arrange.order.send-front", setup: "stack" },
  { id: "arrange.order.bring-forward", setup: "stack" },
  { id: "arrange.order.send-backward", setup: "stack" },
  { id: "arrange.order.send-back", setup: "stack" },
  {
    id: "arrange.order.send-back",
    variant: "already-back",
    setup: "stack",
    args: { pre: ["arrange.order.send-back"] },
  },
  // ------------------------------------------------------------- Align
  { id: "arrange.align.align-left", setup: "rects3", covers: ["EDT-DUP-006", "EDT-DUP-007"] },
  { id: "arrange.align.align-center", setup: "rects3", covers: ["EDT-DUP-006", "EDT-DUP-007"] },
  { id: "arrange.align.align-right", setup: "rects3", covers: ["EDT-DUP-006", "EDT-DUP-007"] },
  { id: "arrange.align.align-top", setup: "rects3", covers: ["EDT-DUP-006", "EDT-DUP-007"] },
  { id: "arrange.align.align-middle", setup: "rects3", covers: ["EDT-DUP-006", "EDT-DUP-007"] },
  { id: "arrange.align.align-bottom", setup: "rects3", covers: ["EDT-DUP-006", "EDT-DUP-007"] },
  { id: "arrange.align.align-justify-horizontal", setup: "rects3", covers: ["EDT-DUP-007"] },
  { id: "arrange.align.align-justify-vertical", setup: "rects3", covers: ["EDT-DUP-007"] },
  {
    id: "arrange.align.align-left",
    variant: "single-infinite",
    setup: "scattered",
    covers: ["EDT-DUP-006"],
  },
  {
    id: "arrange.align.align-right",
    variant: "single-fixed-page",
    setup: "fixed-page",
    covers: ["EDT-DUP-006"],
  },
  {
    id: "arrange.align.align-bottom",
    variant: "single-fixed-page",
    setup: "fixed-page",
    covers: ["EDT-DUP-006"],
  },
  {
    id: "arrange.align.align-center",
    variant: "anchor-points",
    setup: "path-anchor",
    covers: ["EDT-DUP-006"],
    args: { options: { anchors: [0, 2, 3] } },
  },
  { id: "arrange.distribute.horizontal", setup: "rects3" },
  { id: "arrange.distribute.vertical", setup: "rects3" },
  { id: "arrange.distribute.horizontal", variant: "two", setup: "rects2" },
  { id: "arrange.snap-unit.full", setup: "grid" },
  { id: "arrange.snap-unit.half", setup: "grid" },
  // ---------------------------------------------------------- Transform
  { id: "arrange.transform.rotate-45-left", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.rotate-90-left", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.rotate-180-left", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.rotate-45-right", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.rotate-90-right", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.rotate-180-right", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.flip-vertical", setup: "rects2", covers: ["EDT-DUP-005"] },
  { id: "arrange.transform.flip-horizontal", setup: "rects2", covers: ["EDT-DUP-005"] },

  // -------------------------------------------------------------- Modify
  { id: "modify.group", setup: "rects2" },
  { id: "modify.clip", setup: "overlap", covers: ["EDT-DUP-008"] },
  { id: "modify.clip", variant: "three", setup: "rects3", covers: ["EDT-DUP-008"] },
  { id: "modify.split", setup: "group" },
  { id: "modify.split", variant: "compound", setup: "compound" },
  { id: "modify.split", variant: "instance", setup: "symbol-instance" },
  { id: "modify.mask-with-shape", setup: "overlap", covers: ["EDT-DUP-009"] },
  {
    id: "modify.mask-with-shape",
    variant: "gradient",
    setup: "overlap-gradient",
    covers: ["EDT-DUP-009"],
  },
  { id: "modify.crop", setup: "image-crop", covers: ["EDT-CROP-005", "EDT-CROP-001"] },
  { id: "modify.crop", variant: "not-cropping", setup: "image" },
  { id: "modify.cancel-crop", setup: "image-crop", covers: ["EDT-CROP-006"] },
  { id: "modify.merge", setup: "overlap" },
  { id: "modify.merge.intersect", setup: "overlap" },
  { id: "modify.merge.difference", setup: "overlap" },
  { id: "modify.merge.subtract", setup: "overlap" },
  { id: "modify.merge.union", setup: "overlap" },
  { id: "modify.merge.intersect", variant: "change-compound", setup: "compound" },
  { id: "modify.createnestedcompound", setup: "compounds2" },
  {
    id: "modify.createsymbol",
    setup: "symbol",
    covers: ["EDT-SYMBOL-001"],
    args: { prompt: "My Symbol" },
  },
  {
    id: "modify.createsymbol",
    variant: "default-name",
    setup: "symbol-master",
    covers: ["EDT-SYMBOL-001"],
    args: { pre: ["edit.deselect-all"], options: { selectByName: "A" }, prompt: "" },
  },
  {
    id: "modify.createsymbol",
    variant: "cancel",
    setup: "symbol",
    covers: ["EDT-SYMBOL-001"],
    args: { prompt: null },
  },
  { id: "modify.detachsymbol", setup: "symbol-instance", covers: ["EDT-SYMBOL-002"] },
  {
    id: "modify.detachsymbol",
    variant: "master",
    setup: "symbol-master",
    covers: ["EDT-SYMBOL-002"],
  },
  { id: "modify.resetinstance", setup: "symbol-instance-changed" },
  { id: "modify.resetinstance", variant: "in-sync", setup: "symbol-instance" },
  { id: "modify.path2bmp", setup: "rect-border", covers: ["ADD-PATH-005"] },
  { id: "modify.path2bmp", variant: "two", setup: "rects2", covers: ["ADD-PATH-005"] },

  // ---------------------------------------------------------------- Path
  { id: "modify.join-paths", setup: "paths2" },
  { id: "modify.join-paths", variant: "shapes", setup: "rects2" },
  { id: "modify.split-path", setup: "compoundpath" },
  { id: "modify.converttopath", setup: "rect" },
  { id: "modify.converttopath", variant: "ellipse-and-rect", setup: "overlap" },
  { id: "modify.converttorawpath", setup: "rect-border" },
  { id: "modify.converttorawpath", variant: "text", setup: "text" },
  { id: "modify.ouline", setup: "path-open", covers: ["ADD-PATH-002"], args: { prompt: "1" } },
  { id: "modify.offset", setup: "path-closed", covers: ["ADD-PATH-003"], args: { prompt: "1" } },
  { id: "modify.vectorize", setup: "rect-border" },
  { id: "modify.vectorize", variant: "open-path", setup: "path-open" },
  { id: "modify.bmp2path", setup: "image", covers: ["ADD-PATH-004"] },
  { id: "modify.simplify", args: { run: false } },
  { id: "modify.connect-lines", setup: "path-open" },
  { id: "modify.connect-lines", variant: "two-paths", setup: "paths2" },
  { id: "modify.split-line", setup: "path-anchor" },
  { id: "modify.reverse-order", setup: "path-open" },
  { id: "modify.attachToPath", setup: "text-path" },
  { id: "modify.detachFromPath", setup: "text-on-path" },

  // ------------------------------------------------- Shortcut-only (KEY)
  { id: "modify.lock-layer", args: { run: false } },
  { id: "modify.change-anchor-points-joint-type", setup: "path-anchor" },
  { id: "modify.change-anchor-points-joint-type.straight", setup: "path-anchor" },
  { id: "modify.change-anchor-points-joint-type.mirrored", setup: "path-anchor" },
  { id: "modify.change-anchor-points-joint-type.disconnected", setup: "path-anchor" },
  { id: "modify.change-anchor-points-joint-type.asymmetric", setup: "path-anchor" },
  { id: "modify.change-anchor-points-joint-type.connector", setup: "path-anchor" },
  { id: "modify.swap-paint-layers", setup: "rect-border" },
  {
    id: "modify.swap-paint-layers",
    variant: "styled",
    setup: "styled",
    args: { pre: ["edit.select-all"] },
  },
  { id: "modify.create-new-layer", args: { shell: true } },

  // ---------------------------------------------------------------- View
  { id: "view.zoom.original", setup: "scattered", args: { view: true } },
  { id: "view.zoom.original", variant: "fixed-page", setup: "fixed-page", args: { view: true } },
  { id: "view.zoom.fit-selection", setup: "scattered", args: { view: true } },
  { id: "view.zoom.fit-current-layer", setup: "layers2", args: { view: true } },
  { id: "view.zoom.fit.all", setup: "scattered", args: { view: true } },
  { id: "view.zoom.fit.all", variant: "fixed-page", setup: "fixed-page", args: { view: true } },
  { id: "view.zoom.fit.all", variant: "empty", setup: "empty", args: { view: true } },
  ...[6, 12, 25, 50, 66, 100, 150, 200, 300, 400, 800, 1600, 3200, 6400, 12800, 25600].map(
    (z): Case => ({ id: `view.magnification.${z}`, setup: "scattered", args: { view: true } }),
  ),
  { id: "view.zoom.in", setup: "scattered", args: { view: true } },
  {
    id: "view.zoom.in",
    variant: "at-max",
    setup: "scattered",
    args: { view: true, pre: ["view.magnification.25600"] },
  },
  { id: "zoom.out", setup: "scattered", args: { view: true } },
  { id: "zoom.out", variant: "twice", setup: "scattered", args: { view: true, pre: ["zoom.out"] } },
  { id: "view.outline-view", setup: "rect", args: { view: true } },
  { id: "view.fast-view", setup: "rect", args: { view: true } },
  { id: "view.canvas.show-rulers", args: { view: true, settings: VIEW_SETTINGS } },
  { id: "view.canvas.show-guide-lines", args: { view: true, settings: VIEW_SETTINGS } },
  { id: "view.canvas.show-symbol-labels", args: { view: true, settings: VIEW_SETTINGS } },
  { id: "view.canvas.show-grid", args: { view: true } },
  { id: "view.canvas.show-slices", args: { view: true } },
  { id: "view.canvas.show-effects", args: { view: true } },
  { id: "view.canvas.show-selection-handles", setup: "rect", args: { view: true } },
  { id: "view.toggle-snap", args: { settings: SNAP_SETTINGS } },
  { id: "view.toggle-snapzones", args: { settings: SNAP_SETTINGS } },
  ...["grid", "guide-lines", "full-pixels", "points", "bbox", "scene"].map((g): Case => ({
    id: `view.toggle-guide.guide.${g}`,
    args: { settings: SNAP_SETTINGS },
  })),
  {
    id: "view.toggle-guide.guide.grid",
    variant: "snapping-off",
    args: { settings: SNAP_SETTINGS, pre: ["view.toggle-snap"], restore: false },
  },
  ...["inspector", "annotations", "outline", "library", "symbols"].map((s): Case => ({
    id: `view.toggle-sidebar.${s}`,
    args: { shell: true },
  })),
  { id: "view.clone", setup: "rect", args: { shell: true, view: true } },
  { id: "view.change-active-window.next", setup: "two-windows", args: { shell: true } },
  { id: "view.change-active-window.previous", setup: "two-windows", args: { shell: true } },
  {
    id: "view.change-active-window.next",
    variant: "one-window",
    setup: "rect",
    args: { shell: true },
  },
  { id: "view.play", args: { run: false } },
  { id: "view.fullscreen", args: { run: false } },
  { id: "view.toggle-touch", args: { run: false } },
  { id: "view.enter-layer-group", args: { run: false } },
  { id: "view.enter-layer-group.reverse", args: { run: false } },
  { id: "view.toggle-layer-visibility", args: { run: false } },
  { id: "view.cycle-through-layers.next", args: { run: false } },
  { id: "view.cycle-through-layers.previous", args: { run: false } },
  { id: "view.toggle-multi-page-mode", setup: "pages3", args: { view: true } },
  { id: "view.change-active-page.next", setup: "pages3", args: { view: true } },
  {
    id: "view.change-active-page.previous",
    setup: "pages3",
    args: { view: true, pre: ["view.change-active-page.next"] },
  },
  {
    id: "view.change-active-page.previous",
    variant: "first-page",
    setup: "pages3",
    args: { view: true },
  },

  // ---------------------------------------------------------------- Help
  { id: "open-link.contact-us" },
  { id: "open-link.user-guide" },
  { id: "open-link.tutorials" },
  { id: "open-link.request-new-feature" },
  { id: "help.tooltip-visibility" },
  { id: "help.open-quick-help", args: { run: false } },
  { id: "open-welcome-screen", args: { run: false } },
  { id: "help.shortcuts", args: { run: false } },
];

const scenarios: Scenario<ProbeArgs>[] = cases.map((c) => {
  const item = ACTION_ITEMS[c.id];
  if (!item) throw new Error(`no inventory item for ${c.id}`);
  return {
    id: `editor-actions/exec/${c.id}${c.variant ? `--${c.variant}` : ""}`,
    covers: [item, "ACT-MENU-002", ...(c.covers ?? [])],
    kind: "document",
    inPage: probe,
    args: { setup: c.setup ?? "rect", id: c.id, ...c.args },
  };
});

// paritySuite takes Scenario<unknown>; the probe's args type is only known here.
paritySuite("editor-actions exec", defineScenarios(scenarios) as unknown as Scenario[], {
  newApp: false,
});
