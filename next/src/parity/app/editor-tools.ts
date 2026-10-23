/**
 * The new app's side of parity/scenarios/editor-tools/contract.ts
 * (window.__parity.app.editorTools), plus the general tool hooks of the
 * harness (app.activateTool, app.activeTool, app.toolNames, as
 * parity/support/old-harness.js defines them for the old app).
 *
 * Until the app shell exists (phase 7) this file also stands in for the
 * parts of GDesigner (designer.browser.dev.js, module 1491) that the tools
 * need:
 *
 * - GDesigner.init's editor options: tooltips (coordinates only), the
 *   double click into the subselect tool, adaptive resize handles, the
 *   handle icons and the grid's minimum cell space;
 * - the settings GDesigner.start restores that reach the editor (snapping,
 *   hover highlight, decimals, the desktop handle look), from the defaults
 *   and localStorage "designer.settings";
 * - the app's tool table (gravit.tools, module 1483), with the tool keys;
 * - the tool shortcuts GDesigner.init registered with Mousetrap: a tool key
 *   down calls ToolManager.tempToolKeyActivate, the key up
 *   tempToolKeyRelease with the 450 ms spring-loaded delay; Q switches the
 *   pointer tool into transform mode;
 * - the first tool of the table (the pointer) activated at start, before
 *   any document is open;
 * - GDesigner._windowEvent: the tool manager follows the active window's
 *   view (setView on activation, null on deactivation).
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AfterFlagChangeEvent } from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import { AnnotationMixin } from "../../engine/scene/annotations/annotation.ts";
import type { Workspace } from "../../engine/scene/workspace.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { Text } from "../../engine/text/text.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { ItemTool } from "../../editor/tools/item-tool.ts";
import { TransformBox } from "../../editor/element-editors/transform-box.ts";
import { BBoxGuide } from "../../editor/guides/bbox-guide.ts";
import { FullPixelsGuide } from "../../editor/guides/full-pixels-guide.ts";
import { GridGuide } from "../../editor/guides/grid-guide.ts";
import { GuideLinesGuide } from "../../editor/guides/guide-lines-guide.ts";
import { Guides } from "../../editor/guides/guides.ts";
import { PageGuide } from "../../editor/guides/page-guide.ts";
import { PointsGuide } from "../../editor/guides/points-guide.ts";
import { PreserveAspectRatioAnnotation } from "../../editor/handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../../editor/handles/rotate-annotation.ts";
import { SkewHorizontalAnnotation } from "../../editor/handles/skew-horizontal-annotation.ts";
import { SkewVerticalAnnotation } from "../../editor/handles/skew-vertical-annotation.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import type { Tool } from "../../editor/tools/tool.ts";
import {
  ToolChangedEvent,
  type ToolClass,
  type ToolManager,
} from "../../editor/tools/tool-manager.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { BezigonTool } from "../../editor/tools/bezigon-tool.ts";
import { EllipseTool } from "../../editor/tools/ellipse-tool.ts";
import { FreehandTool } from "../../editor/tools/freehand-tool.ts";
import { HandTool } from "../../editor/tools/hand-tool.ts";
import { KnifeTool } from "../../editor/tools/knife-tool.ts";
import { LassoTool } from "../../editor/tools/lasso-tool.ts";
import { LayerTool } from "../../editor/tools/layer-tool.ts";
import { LineTool } from "../../editor/tools/line-tool.ts";
import { MagicTool } from "../../editor/tools/magic-tool.ts";
import { PenTool } from "../../editor/tools/pen-tool.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { PolygonTool } from "../../editor/tools/polygon-tool.ts";
import { RectangleTool } from "../../editor/tools/rectangle-tool.ts";
import { SliceTool } from "../../editor/tools/slice-tool.ts";
import { StarTool } from "../../editor/tools/star-tool.ts";
import { SubSelectTool } from "../../editor/tools/sub-select-tool.ts";
import { TextTool } from "../../editor/tools/text-tool.ts";
import { TriangleTool } from "../../editor/tools/triangle-tool.ts";
import { ZoomTool } from "../../editor/tools/zoom-tool.ts";
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import {
  appWorkspace,
  documentHooks,
  documentStatusName,
  getActiveDocument,
  onDocumentsChanged,
  type InterimDocument,
} from "./document.ts";
import { activeView } from "./view-host.ts";

// GDesigner.init: the editor options the app runs with.
EditorOptions.selectDoubleClickBehavior = "subselect";
EditorOptions.coordinatesTooltip = true;
EditorOptions.bboxPositionTooltip = false;
EditorOptions.sizeTooltip = false;
EditorOptions.angleTooltip = false;
EditorOptions.showTooltips = true;
EditorOptions.adaptiveResizeHandles = true;
// Engine unit tests load the parity hooks in Node, which has no
// XMLHttpRequest for the icon downloads; they run without the icons.
if (typeof XMLHttpRequest !== "undefined") {
  SkewHorizontalAnnotation.setIcon("assets/annotation/touch/skew-horizontal-handle.png");
  SkewVerticalAnnotation.setIcon("assets/annotation/touch/skew-vertical-handle.png");
  PreserveAspectRatioAnnotation.setIcon("assets/annotation/touch/preserve-aspect-ratio-handle.png");
  RotateAnnotation.setIcon("assets/annotation/touch/rotate-handle.png");
}
GridGuide.MIN_CELL_SPACE = 5;

/**
 * GDesigner._applyDefaultEditorOptions: the handle look of the desktop
 * layout, applied when the "touch" setting is restored as false.
 */
function applyDefaultEditorOptions(): void {
  const dpi = PaintCanvas.getScreenDPI();
  const handles = EditorOptions.annotationHandles as unknown as Record<
    string,
    Record<string, unknown> & Record<string, Record<string, unknown>>
  >;
  const set = (handle: string, values: Record<string, unknown>): void => {
    Object.assign(handles[handle] as object, values);
  };
  const options = EditorOptions as unknown as Record<string, unknown>;
  options.distanceHelperBehaviour = SelectTool._DistanceHelperBehaviour.Default;
  options.resizeHandlesInDetailMode = true;
  options.rotateHandleInDetailMode = true;
  (handles as unknown as Record<string, unknown>).suppressRedundantCorners = false;
  set("gradient", { size: 9 * dpi, sizeBig: 12 * dpi });
  SkewHorizontalAnnotation.setIconVisible(false);
  SkewVerticalAnnotation.setIconVisible(false);
  PreserveAspectRatioAnnotation.setIconVisible(false);
  RotateAnnotation.setIconVisible(false);
  PaintContext.prototype.transformBoxOutlineColor = new RGBColor([23, 104, 196]);
  TransformBox.OUTSIDE_TOLERANCE = 100;
  options.annotPickDistance = 0;
  options.pickDistance = 4;
  set("tranformBox", {
    size: 10 * dpi,
    outlineWidth: null,
    pivotSize: null,
    pivotOutlineWidth: null,
    outsideStroke: false,
    shadowColor: null,
  });
  const transformBox = EditorOptions.annotationHandles.tranformBox;
  transformBox.skew.enabled = false;
  transformBox.rotate.enabled = false;
  set("preserveAspectRatio", { enabled: false });
  options.rotateHandle = "top";
  set("rotate", { size: 10 * dpi, outlineWidth: null, shadowColor: null, distance: 16 * dpi });
  set("resize", { size: 10 * dpi, outlineWidth: null, outsideStroke: false, shadowColor: null });
  for (const shape of ["rectangle", "polygon", "ellipse"])
    set(shape, { size: 8 * dpi, outlineWidth: null, outsideStroke: false, shadowColor: null });
  const path = handles.path as Record<string, Record<string, unknown>>;
  Object.assign(path.node as object, { size: 10 * dpi, outlineWidth: null });
  Object.assign(path.control as object, { size: 6 * dpi });
}

/**
 * The settings GDesigner starts with (its constructor), as far as they
 * reach the editor, overridden by the stored ones (localStorage
 * "designer.settings", which the parity harness writes before load).
 */
const SETTING_DEFAULTS: Record<string, unknown> = {
  snap_disabled: false,
  snap_zones: false,
  snap_guides: [
    GuideLinesGuide.ID,
    FullPixelsGuide.ID,
    PointsGuide.ID,
    BBoxGuide.ID,
    PageGuide.ID,
    GridGuide.ID,
  ],
  highlight_on_hover: true,
  decimals_num: null,
  enable_steps_debug: false,
  touch: false,
};

function storedSettings(): Record<string, unknown> {
  try {
    const stored = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as unknown;
    return stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * GDesigner._settingChangedEvent for the restored settings
 * (GDesigner.start triggers it once per setting). The touch layout comes
 * with the touch cluster; only the desktop options are applied here.
 */
function applySetting(key: string, value: unknown): void {
  switch (key) {
    case "touch":
      if (!value) applyDefaultEditorOptions();
      break;
    case "snap_disabled":
      Guides.options.disabled = value as boolean;
      break;
    case "snap_zones":
      Guides.options.zones = value as boolean;
      break;
    case "snap_guides":
      Guides.options.guides = value as string[];
      break;
    case "highlight_on_hover":
      EditorOptions.highlightOnHover = value as boolean;
      break;
    case "dont_store_textpath":
      Text.dontStorePaths = value as boolean;
      break;
    case "decimals_num":
      Scene.decimalsNum = value as number | null;
      break;
    case "enable_steps_debug":
      EditorOptions.debugTransactions = value as boolean;
      break;
  }
}

if (typeof localStorage === "object") {
  const settings = storedSettings();
  for (const key of Object.keys(SETTING_DEFAULTS))
    if (!Object.prototype.hasOwnProperty.call(settings, key)) settings[key] = SETTING_DEFAULTS[key];
  for (const key of Object.keys(settings)) applySetting(key, settings[key]);
}

function toolManager(): ToolManager {
  const manager = appWorkspace().getToolManager() as ToolManager | null;
  if (!manager) throw new Error("the workspace has no tool manager");
  return manager;
}

/** A tool's name: its toString without "[Object ]". */
function toolName(tool: unknown): string | null {
  return tool ? String(tool).replace(/^\[Object (.*)\]$/, "$1") : null;
}

// ---------------------------------------------------------------------------
// The app's tool table (gravit.tools, designer.browser.dev.js module 1483).

/** GRichTooltipConfig as the table holds it (only the fields given are set). */
interface RichTooltipConfig {
  _title: string;
  _description: string;
  _video?: string;
  _isPro?: boolean;
  _middle: boolean;
  _shortcut?: string[];
  _learnMore: string;
}

interface ToolTableEntry {
  tool: ToolClass;
  toolString: string;
  title: string;
  group: string;
  category?: string;
  key?: string;
  shortcuts?: string[][];
  icon: string;
  pro?: boolean;
  feature?: string;
  richTooltipConfig: RichTooltipConfig;
}

interface TooltipOptions {
  video?: string;
  isPro?: boolean;
  shortcut?: string[];
}

const localized = (owner: string, key: string): string =>
  Locale.get(new LocaleKey(owner, key)) as string;

/**
 * gApi.getRichTooltipVideoURL: the API address (the page origin in a local
 * build) and the name of the video.
 */
const videoUrl = (name: string): string =>
  (typeof location === "object" ? location.origin : "") + "/rich-tooltip-video/" + name;

/** GRichTooltipConfig.from: the fields given, in this order. */
function richTooltip(owner: string, options: TooltipOptions): RichTooltipConfig {
  const config: Record<string, unknown> = {
    _title: localized(owner, "tooltip-title"),
    _description: localized(owner, "tooltip-description"),
  };
  if (options.video !== undefined) config._video = videoUrl(options.video);
  if (options.isPro !== undefined) config._isPro = options.isPro;
  config._middle = false;
  if (options.shortcut !== undefined) config._shortcut = options.shortcut;
  config._learnMore = "";
  return config as unknown as RichTooltipConfig;
}

function entry(
  tool: ToolClass,
  toolString: string,
  fields: Omit<ToolTableEntry, "tool" | "toolString" | "title" | "richTooltipConfig">,
  tooltip: TooltipOptions,
): ToolTableEntry {
  return {
    tool,
    toolString,
    title: localized(toolString, "name"),
    ...fields,
    richTooltipConfig: richTooltip(toolString, tooltip),
  };
}

/**
 * The entries in the old order; the first one is activated at start. The
 * bezigon tool is a pro feature, which this build always has (its tooltip
 * says isPro false).
 */
const TOOL_TABLE: readonly ToolTableEntry[] = [
  entry(
    PointerTool,
    "GPointerTool",
    { group: "select", key: "V", icon: "gravit-icon-cursor-filled" },
    { shortcut: ["V"], video: "Pointer_Tool.mp4" },
  ),
  entry(
    SubSelectTool,
    "GSubSelectTool",
    { group: "select", key: "D", icon: "gravit-icon-cursor" },
    { shortcut: ["D"], video: "Subselect_Tool.mp4" },
  ),
  entry(
    LassoTool,
    "GLassoTool",
    { group: "select", category: "special", key: "O", icon: "gravit-icon-rope" },
    { shortcut: ["O"], video: "Lasso_Tool.mp4" },
  ),
  entry(
    LayerTool,
    "GLayerTool",
    { group: "select", category: "special", icon: "gravit-icon-sheets" },
    {},
  ),
  entry(
    SliceTool,
    "GSliceTool",
    { group: "select", category: "other", key: "S", icon: "gravit-icon-slice" },
    { shortcut: ["S"] },
  ),
  entry(
    PenTool,
    "GPenTool",
    { group: "path", key: "P", icon: "gravit-icon-pen" },
    { shortcut: ["P"], video: "Pen_Too.mp4" },
  ),
  entry(
    BezigonTool,
    "GBezigonTool",
    { group: "path", key: "B", icon: "gravit-icon-pen-filled", pro: true, feature: "bezigon" },
    { shortcut: ["B"], isPro: false, video: "Bezigon_Tool.mp4" },
  ),
  entry(
    KnifeTool,
    "GKnifeTool",
    { group: "knife", category: "modify", key: "K", icon: "gravit-icon-scalpel" },
    { shortcut: ["K"], video: "Knife_Tool.mp4" },
  ),
  entry(
    FreehandTool,
    "GFreehandTool",
    { group: "path", category: "hand", icon: "gravit-icon-free-hand-draw" },
    { video: "Freehand_Tool.mp4" },
  ),
  entry(
    MagicTool,
    "GMagicTool",
    { group: "knife", category: "modify", icon: "gravit-icon-freehand-shape" },
    { video: "Freehand_Shaping_Tool.mp4" },
  ),
  entry(
    LineTool,
    "GLineTool",
    { group: "shape", key: "L", icon: "gravit-icon-line" },
    { shortcut: ["L"], video: "Line_Tool.mp4" },
  ),
  entry(
    RectangleTool,
    "GRectangleTool",
    { group: "shape", key: "R", shortcuts: [["M"]], icon: "gravit-icon-rectangle" },
    { shortcut: ["R"], video: "Rectangle_Tool.mp4" },
  ),
  entry(
    EllipseTool,
    "GEllipseTool",
    { group: "shape", key: "E", icon: "gravit-icon-ellipse" },
    { shortcut: ["E"], video: "Ellipse_Tool.mp4" },
  ),
  entry(
    PolygonTool,
    "GPolygonTool",
    { group: "shape", category: "polygon", icon: "gravit-icon-polygon" },
    {},
  ),
  entry(
    TriangleTool,
    "GTriangleTool",
    { group: "shape", category: "polygon", icon: "gravit-icon-triangle" },
    {},
  ),
  entry(
    StarTool,
    "GStarTool",
    { group: "shape", category: "polygon", icon: "gravit-icon-star" },
    {},
  ),
  entry(
    TextTool,
    "GTextTool",
    { group: "insert", key: "T", icon: "gravit-icon-textbox" },
    { video: "Text_Tool.mp4", shortcut: ["T"] },
  ),
  entry(
    HandTool,
    "GHandTool",
    { group: "view", key: "H", icon: "gravit-icon-move" },
    { shortcut: ["H"] },
  ),
  entry(
    ZoomTool,
    "GZoomTool",
    { group: "view", key: "Z", icon: "gravit-icon-zoom-in" },
    { shortcut: ["Z"] },
  ),
];

// GDesigner.init: the first tool of the table, before any window exists.
toolManager().activateTool((TOOL_TABLE[0] as ToolTableEntry).tool);

// GDesigner._windowEvent: the tool manager works on the active window's
// view. The view host's listener runs first (this module imports it), so
// the active view is already up to date here.
//
// The properties sidebar (GPropertiesSidebar, designer.browser.dev.js
// module 571, _updateFromToolOrSelection) shows the selection, or without
// one the default style of the active item tool (else the active page). It
// does that on document activation, tool changes, selection changes and
// page activation; asking an item tool for its default style creates the
// scene's default styles, which every saved document then holds. Only that
// lookup is ported here; the panels come with the inspector clusters.
let propertiesDocument: InterimDocument | null = null;

function updateFromToolOrSelection(): void {
  const document = propertiesDocument;
  const editor = document ? document.getEditor() : null;
  if (!document || !editor) return;
  let elements = editor.getSelection() as Node[] | null;
  if (elements && elements.length)
    elements = editor.filterIndividualElements(
      elements.filter((node) => !node.hasMixin(AnnotationMixin)) as never,
    ) as unknown as Node[];
  if (!elements || 0 === elements.length) {
    const tool = toolManager().getActiveTool();
    if (tool instanceof ItemTool) tool.getDefaultStyle();
  }
}

function propertiesPageFlag(event: AfterFlagChangeEvent): void {
  const editor = propertiesDocument ? propertiesDocument.getEditor() : null;
  if (
    event.node instanceof Page &&
    event.flag === NodeFlag.Active &&
    editor &&
    !editor.hasSelection()
  )
    updateFromToolOrSelection();
}

function activatePropertiesDocument(document: InterimDocument | null): void {
  if (document === propertiesDocument) return;
  if (propertiesDocument) {
    toolManager().removeEventListener(ToolChangedEvent, updateFromToolOrSelection);
    const editor = propertiesDocument.getEditor();
    if (editor) editor.removeEventListener(Editor.SelectionChangedEvent, updateFromToolOrSelection);
    propertiesDocument.getScene().removeEventListener(AfterFlagChangeEvent, propertiesPageFlag);
    propertiesDocument = null;
  }
  if (document) {
    propertiesDocument = document;
    toolManager().addEventListener(ToolChangedEvent, updateFromToolOrSelection);
    const editor = document.getEditor();
    if (editor) editor.addEventListener(Editor.SelectionChangedEvent, updateFromToolOrSelection);
    document.getScene().addEventListener(AfterFlagChangeEvent, propertiesPageFlag);
    updateFromToolOrSelection();
  }
}

if (typeof HTMLDivElement === "function")
  onDocumentsChanged(() => {
    toolManager().setView(activeView());
    const active = getActiveDocument();
    activatePropertiesDocument(active && "ready" === documentStatusName(active) ? active : null);
  });

// ---------------------------------------------------------------------------
// The tool shortcuts (GDesigner.init with registerShortcut and Mousetrap).

/**
 * Mousetrap's stopCallback: no shortcut while typing into a form field or
 * an editable element, unless it has the "mousetrap" class.
 */
function stoppedByTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  if ((" " + element.className + " ").indexOf(" mousetrap ") > -1) return false;
  return (
    "INPUT" == element.tagName ||
    "SELECT" == element.tagName ||
    "TEXTAREA" == element.tagName ||
    element.isContentEditable
  );
}

/** The key a Mousetrap binding of one character names: the character, lower case. */
function bindingKey(keys: readonly string[]): string | null {
  return keys.length === 1 ? (keys[0] as string).toLowerCase() : null;
}

/** Mousetrap's character for a key event without modifiers (letters only here). */
function eventCharacter(event: KeyboardEvent): string | null {
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return null;
  const code = event.which || event.keyCode;
  if (!code) return null;
  return String.fromCharCode(code).toLowerCase();
}

interface Shortcut {
  down: (event: KeyboardEvent) => unknown;
  up?: (event: KeyboardEvent) => unknown;
}

const shortcuts = new Map<string, Shortcut>();

/**
 * GDesigner.registerShortcut: the keydown callback is skipped while a text
 * is edited inline and its editor takes the key; a callback returning
 * true stops the event.
 */
function registerShortcut(keys: readonly string[], shortcut: Shortcut): void {
  const key = bindingKey(keys);
  if (key) shortcuts.set(key, shortcut);
}

function inlineTextEditor(): { handleKeyDown(event: KeyboardEvent): boolean } | null {
  const document = documentHooks.document();
  const editor = document ? document.getEditor() : null;
  if (!editor || !editor.isInlineEditing()) return null;
  const node = editor.getCurrentInlineEditorNode();
  if (!(node instanceof Text)) return null;
  return ElementEditor.getEditor(node);
}

function handleShortcutKey(event: KeyboardEvent, down: boolean): void {
  const character = eventCharacter(event);
  if (!character) return;
  const shortcut = shortcuts.get(character);
  if (!shortcut) return;
  const callback = down ? shortcut.down : shortcut.up;
  if (!callback || stoppedByTarget(event.target)) return;
  const textEditor = down ? inlineTextEditor() : null;
  if (textEditor && textEditor.handleKeyDown(event)) return;
  if (true === callback(event)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** The 450 ms delay of tempToolKeyRelease. */
const SPRING_LOADED_DELAY = 450;

for (const entry of TOOL_TABLE) {
  if (entry.key || entry.shortcuts) {
    const tool = entry.tool;
    const shortcut: Shortcut = {
      down: () => toolManager().tempToolKeyActivate(tool),
      up: () => toolManager().tempToolKeyRelease(tool, SPRING_LOADED_DELAY),
    };
    if (entry.key) registerShortcut([entry.key], shortcut);
    if (Array.isArray(entry.shortcuts))
      entry.shortcuts.forEach((keys) => {
        registerShortcut(keys, shortcut);
      });
  }
}

/** Q: the pointer tool, in transform mode (the advanced transform box). */
registerShortcut(["Q"], {
  down: () => {
    const manager = toolManager();
    if (!(manager.getActiveTool() && manager.getActiveTool() instanceof SelectTool))
      manager.activateTool(PointerTool);
    const active = manager.getActiveTool();
    if (active instanceof SelectTool && active.getEditMode() !== SelectTool.EditMode.Transform)
      active.setEditMode(SelectTool.EditMode.Transform);
    return true;
  },
});

if (typeof document === "object" && typeof document.addEventListener === "function") {
  document.addEventListener("keydown", (event) => {
    handleShortcutKey(event, true);
  });
  document.addEventListener("keyup", (event) => {
    handleShortcutKey(event, false);
  });
}

// ---------------------------------------------------------------------------
// The hooks.

interface EditModeTool {
  getEditMode(): number;
  setEditMode(mode: number): void;
}

/** "<i>/<j>/...:<nodeName>": child indices from the scene root, then the node name. */
function nodePath(node: Node): string {
  const parts: number[] = [];
  let current: Node | null = node;
  while (current && current.getParent()) {
    const parent = current.getParent() as ContainerNode;
    parts.unshift(parent.getIndexOfChild(current));
    current = parent;
  }
  return parts.join("/") + ":" + node.getNodeName();
}

/** A part id equal to a static field of the editor's class chain is written as the field name. */
function staticName(editor: unknown, value: string): string {
  for (
    let proto = editor ? (Object.getPrototypeOf(editor) as object | null) : null;
    proto;
    proto = Object.getPrototypeOf(proto) as object | null
  ) {
    const ctor = (proto as { constructor?: unknown }).constructor as
      Record<string, unknown> | undefined;
    if (!ctor) continue;
    for (const key of Object.keys(ctor)) if (ctor[key] === value) return key;
    for (const key of Object.keys(ctor)) {
      const inner = ctor[key];
      if (!inner || (typeof inner !== "function" && typeof inner !== "object")) continue;
      for (const sub of Object.keys(inner)) {
        if ((inner as Record<string, unknown>)[sub] === value) return `${key}.${sub}`;
      }
    }
  }
  return value;
}

function plainPart(part: unknown, depth: number, editor: unknown): unknown {
  if (part === null || part === undefined) return null;
  if (typeof part === "string") return staticName(editor, part);
  if (typeof part !== "object") return part;
  if (depth > 2) return "<deep>";
  if (part instanceof Node) {
    const parent = part.getParent();
    return { node: part.getNodeName(), index: parent ? parent.getIndexOfChild(part) : -1 };
  }
  if (Array.isArray(part)) return part.map((p: unknown) => plainPart(p, depth + 1, editor));
  const out: Record<string, unknown> = {};
  const record = part as Record<string, unknown>;
  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    if (typeof value === "function") continue;
    out[key] = plainPart(value, depth + 1, editor);
  }
  return out;
}

interface EditorSlot {
  __editor__?: unknown;
}

interface PartEditor {
  getPartSelection?(): unknown[] | null;
  getPaintElement?(): Node | null;
  _nextCaretToggle?: number;
}

const editorOf = (node: Node): PartEditor | null =>
  ((node as unknown as EditorSlot).__editor__ as PartEditor | undefined) || null;

interface AnchorPointsHolder {
  getAnchorPoints(): ContainerNode;
}

function selectedAnchors(node: Node): number[] | undefined {
  const holder = node as unknown as Partial<AnchorPointsHolder>;
  if (!holder.getAnchorPoints) return undefined;
  const out: number[] = [];
  const points = holder.getAnchorPoints();
  let i = 0;
  for (let p = points.getFirstChild(); p; p = p.getNext(), i++) {
    if (p.hasFlag(NodeFlag.Selected)) out.push(i);
  }
  return out;
}

const round = (v: number): number => Math.round(v * 1e6) / 1e6;

interface VertexReader {
  rewindVertices(index: number): boolean;
  readVertex(vertex: Vertex): boolean;
}

function outline(element: unknown): [number, number, number][] | null {
  const reader = element as Partial<VertexReader> | null;
  if (!reader || !reader.rewindVertices || !reader.rewindVertices(0)) return null;
  const vertex = new Vertex();
  const out: [number, number, number][] = [];
  const r9 = (n: number): number => Math.round(n * 1e9) / 1e9;
  while (out.length < 400 && (reader as VertexReader).readVertex(vertex))
    out.push([vertex.command, r9(vertex.x), r9(vertex.y)]);
  return out;
}

interface Measured {
  getGeometryBBox?(): {
    getX(): number;
    getY(): number;
    getWidth(): number;
    getHeight(): number;
  } | null;
  getProperty?(name: string): unknown;
}

const toolChangeLog: { previous: string | null; next: string | null; light: boolean }[] = [];
toolManager().addEventListener(ToolChangedEvent, (event: ToolChangedEvent) => {
  toolChangeLog.push({
    previous: toolName(event.previousTool),
    next: toolName(event.newTool),
    light: event.light,
  });
});

function view(): EditorWidget {
  const current = activeView();
  if (!current) throw new Error("no active view");
  return current;
}

/** The text core of the node being edited inline. */
interface TextCore {
  getSelection?(): { start: number; end: number } | null;
  isCaretVisible(): boolean;
  toggleCaret(): boolean;
}

function activateTool(name: string): boolean {
  const manager = toolManager();
  for (let i = 0; i < manager.getToolCount(); i++) {
    const tool = manager.getTool(i);
    if (toolName(tool) === name) {
      manager.activateTool(tool as Tool);
      return true;
    }
  }
  return false;
}

export const editorToolsHooks = {
  activateTool,
  activeTool(): string | null {
    return toolName(toolManager().getActiveTool());
  },
  toolNames(): (string | null)[] {
    const manager = toolManager();
    const names: (string | null)[] = [];
    for (let i = 0; i < manager.getToolCount(); i++) names.push(toolName(manager.getTool(i)));
    return names;
  },
  editorTools: {
    toolChanges(): { previous: string | null; next: string | null; light: boolean }[] {
      return toolChangeLog.splice(0, toolChangeLog.length);
    },
    prepareView(zoom: number, originX: number, originY: number): void {
      RendererConfig.CACHE_WHEN_DRAWING_LONGER_THAN = Infinity;
      const current = view();
      current.transform(-originX, -originY, zoom);
      current.invalidate();
    },
    worldToView(): number[] {
      return view().getWorldTransform().getMatrix().map(round);
    },
    state(): unknown {
      const editor = documentHooks.editor();
      const manager = toolManager();
      const current = view();
      const selection = (editor.getSelection() || []) as Node[];
      const tool = manager.getActiveTool() as (Tool & Partial<EditModeTool>) | null;
      const temporary = manager.getTemporaryActiveTool();
      const out = {
        tool: toolName(tool),
        temporaryTool: temporary ? toolName(temporary) : null,
        selection: selection.map(nodePath),
        parts: selection.map((node) => {
          const ed = editorOf(node);
          const parts = ed && ed.getPartSelection ? ed.getPartSelection() : null;
          return parts ? parts.map((p) => plainPart(p, 0, ed)) : null;
        }),
        anchors: selection.map((node) => {
          const anchors = selectedAnchors(node);
          return anchors === undefined ? null : anchors;
        }),
        preview: selection.map((node) => {
          const ed = editorOf(node);
          const element = (ed && ed.getPaintElement ? ed.getPaintElement() : node) as
            (Node & Measured) | null;
          const bbox = element && element.getGeometryBBox ? element.getGeometryBBox() : null;
          const box = bbox ? [bbox.getX(), bbox.getY(), bbox.getWidth(), bbox.getHeight()] : null;
          const trf = (element && element.getProperty ? element.getProperty("trf") : null) as {
            getMatrix(): number[];
          } | null;
          const isPreview = element !== node;
          const entry: {
            box: number[] | null;
            trf: number[] | null;
            isPreview: boolean;
            outline?: [number, number, number][] | null;
          } = { box, trf: trf ? trf.getMatrix() : null, isPreview };
          if (isPreview) entry.outline = outline(element);
          return entry;
        }),
        selectEditMode: tool && typeof tool.getEditMode === "function" ? tool.getEditMode() : null,
        inlineEditing: editor.isInlineEditing(),
        textSelection: null as [number, number] | null,
        zoom: current.getZoom(),
        scroll: [current.getScrollX(), current.getScrollY()],
        undo: editor.hasUndoState() ? editor.getUndoStateName() : null,
      };
      if (editor.isInlineEditing()) {
        const node = editor._currentInlineEditorNode as unknown as {
          getTLCore?(): TextCore | null;
        } | null;
        const core = node && node.getTLCore && node.getTLCore();
        const textSelection = core && core.getSelection && core.getSelection();
        if (textSelection) out.textSelection = [textSelection.start, textSelection.end];
      }
      return out;
    },
    document(): unknown {
      const scene = JSON.parse(documentHooks.serialize({ save: true }) as string) as Record<
        string,
        unknown
      >;
      delete scene.lmd;
      return scene;
    },
    activateToolAt(index: number): boolean {
      const manager = toolManager();
      if (index < 0 || index >= manager.getToolCount()) return false;
      manager.activateTool(manager.getTool(index) as Tool);
      return manager.getActiveTool() === manager.getTool(index);
    },
    toolRegistry(): { index: number; name: string; cursor: string | null; instanceOf: number[] }[] {
      const manager = toolManager();
      const tools: Tool[] = [];
      for (let i = 0; i < manager.getToolCount(); i++) tools.push(manager.getTool(i) as Tool);
      return tools.map((tool, index) => ({
        index,
        name: toolName(tool) as string,
        cursor: tool.getCursor ? tool.getCursor() : null,
        instanceOf: tools
          .map((other, j) => (tool instanceof (other.constructor as ToolClass) ? j : -1))
          .filter((j) => j >= 0),
      }));
    },
    repaint(): void {
      view().invalidate();
    },
    fontsReady(): boolean {
      const fontManager = (
        documentHooks.scene().getWorkspace() as Workspace
      ).getFontManager() as FontManager;
      const family = fontManager.getDefaultFont() as unknown;
      const variants = fontManager.queryFontFamily(
        typeof family === "string" ? family : "Open Sans",
      );
      return (
        document.fonts.status === "loaded" &&
        Array.isArray(variants) &&
        variants.length > 0 &&
        !fontManager.hasPendingFonts() &&
        !fontManager.hasUnresolvedFonts()
      );
    },
    toolTable(): Record<string, unknown>[] {
      return TOOL_TABLE.map((entry) => {
        const out: Record<string, unknown> = {};
        const record = entry as unknown as Record<string, unknown>;
        for (const key of Object.keys(record).sort()) {
          if (key === "tool" || typeof record[key] === "function") continue;
          out[key] = JSON.parse(JSON.stringify(record[key])) as unknown;
        }
        return out;
      });
    },
    setEditorOptions(options: Record<string, unknown>): void {
      const target = EditorOptions as unknown as Record<string, unknown>;
      for (const key of Object.keys(options)) target[key] = options[key];
    },
    freezeCaret(): boolean {
      const editor = documentHooks.editor();
      const node = editor._currentInlineEditorNode as unknown as
        (Node & { getTLCore?(): TextCore | null; repaint?(force?: boolean): void }) | null;
      if (!node) return false;
      const ed = editorOf(node);
      if (ed) ed._nextCaretToggle = Number.MAX_SAFE_INTEGER;
      const core = node.getTLCore && node.getTLCore();
      if (core && !core.isCaretVisible()) core.toggleCaret();
      if (node.repaint) node.repaint(true);
      return true;
    },
  },
};
