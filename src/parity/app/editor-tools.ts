/**
 * The new app's side of parity/scenarios/editor-tools/contract.ts
 * (window.__parity.app.editorTools), plus the general tool hooks of the
 * harness (app.activateTool, app.activeTool, app.toolNames, as
 * parity/support/old-harness.js defines them for the old app).
 *
 * The GDesigner parts the tools need (editor options, the restored
 * settings, the tool table and its shortcuts, the first tool, the tool
 * manager following the active view) live in the app now
 * (src/app/shell/designer.ts, bootstrap.ts, tool-table.ts); these hooks
 * read them.
 */
import { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Workspace } from "../../engine/scene/workspace.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import type { Tool } from "../../editor/tools/tool.ts";
import {
  ToolChangedEvent,
  type ToolClass,
  type ToolManager,
} from "../../editor/tools/tool-manager.ts";
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import { appWorkspace, documentHooks } from "./document.ts";
import { activeView } from "./view-host.ts";
import { appRegistry, designerOrNull, whenDesigner } from "../../app/shell/globals.ts";

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
whenDesigner(() =>
  toolManager().addEventListener(ToolChangedEvent, (event: ToolChangedEvent) => {
    // The first tool is activated while the app boots, before any scenario
    // looks; the old interim activated it before this listener existed.
    const designer = designerOrNull();
    if (!designer || !designer.isReady()) return;
    toolChangeLog.push({
      previous: toolName(event.previousTool),
      next: toolName(event.newTool),
      light: event.light,
    });
  }),
);

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
      return appRegistry().tools.map((entry) => {
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
