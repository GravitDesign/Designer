/**
 * Modules of other app clusters the modify actions need, looked up late
 * (see shell/late.ts and docs/rewrite/UI.md section 9) while those
 * clusters are ported in parallel. The shared ones (alert, rich tooltips,
 * icons) are in ../deps.ts.
 */
import { lateExport } from "../../shell/late.ts";
import { SidebarsIds } from "../../shell/sidebar-ids.ts";
import type { ToolManager } from "../../../editor/tools/tool-manager.ts";
import { gDesigner } from "../host.ts";

/** What GSystemDialog.prompt (module 44) hands back: the value, or nothing on cancel. */
export type PromptCallback = (value?: string) => void;

interface PromptingDialog {
  prompt(
    message: string,
    done: PromptCallback,
    defaultValue?: string,
    cancelText?: string,
    okText?: string,
    className?: string,
  ): unknown;
}

/**
 * GSystemDialog.prompt (module 44, dialogs/system-dialog.ts). Until the
 * dialogs cluster exists there is no prompt; the action then does nothing,
 * like a cancelled prompt, and says so on the console.
 */
export function promptDialog(message: string, done: PromptCallback, defaultValue?: string): void {
  const dialog = lateExport<Partial<PromptingDialog>>("dialogs/system-dialog.ts", "SystemDialog");
  if (dialog && dialog.prompt) {
    dialog.prompt(message, done, defaultValue);
    return;
  }
  console.warn("[system dialog] prompt is not ported yet:", message);
}

/**
 * A row of the layers panel (GLayerPanel's item for a node); the flags are
 * GNode.Flag values (Selected).
 */
export interface LayerPanelItem {
  hasFlag(flag: number): boolean;
  setFlag(flag: number): void;
  removeFlag(flag: number): void;
}

/** A node of the layers panel's virtual tree (the jQuery plugin's tree node). */
export interface LayerPanelTreeNode {
  row?: unknown;
  parent?: LayerPanelTreeNode | null;
  firstChild?: LayerPanelTreeNode | null;
  lastChild?: LayerPanelTreeNode | null;
  next?: LayerPanelTreeNode | null;
  previous?: LayerPanelTreeNode | null;
  getNextFocusableNode(): LayerPanelTreeNode | null;
  getPreviousFocusableNode(): LayerPanelTreeNode | null;
}

/**
 * The layers panel of the outline sidebar as the layer actions drive it.
 * The old code called the gLayerPanel jQuery plugin
 * (`panel.gLayerPanel("getItem", node)`) and read its data
 * (`panel.data("glayerpanel")`); the same operations, under the plugin
 * method names, are what the sidebars cluster's panel handle must offer.
 */
export interface LayerPanelHandle {
  /** `data("glayerpanel")`: the virtual tree and the focused tree node. */
  data(): {
    vtree: { expandAndFocus(item: LayerPanelItem): void };
    currentFocus: LayerPanelTreeNode | null;
  };
  /** The title element of a row; `openAutoEdit` is its `gAutoEdit("open", ...)`. */
  getTitleOfLayer(row: unknown): { openAutoEdit(): void };
  getCurrentFocusedNode(): LayerPanelTreeNode | null;
  setCurrentFocusedNode(node: LayerPanelTreeNode): void;
  getItem(node: LayerPanelTreeNode): LayerPanelItem;
  relayout(): void;
  toggleLockStatusOfLayerOrItem(item: LayerPanelItem): void;
  toggleHideStatusOfLayerOrItem(item: LayerPanelItem): void;
}

/** GOutlineSidebar (module 1260, sidebars/outline-sidebar.ts) as the actions use it. */
export interface OutlineSidebarLike {
  getId(): string;
  getLayerPanel(): LayerPanelHandle;
  changeActivePage(page: unknown): void;
  insertLayer(): void;
}

/** GInspectorSidebar (module 864, inspector/inspector-sidebar.ts) as the actions use it. */
export interface InspectorSidebarLike {
  setPathPointsNodeType(type: string): void;
}

/** One side's sidebars (GSidebars) as the layer actions use them. */
export interface SidebarsLike {
  getActiveSidebar(): string | null;
  getSidebar(id: string): unknown;
}

/** gDesigner.getLeftSidebars(). */
export function leftSidebars(): SidebarsLike | null {
  return gDesigner().getLeftSidebars();
}

/**
 * The outline sidebar, or null while only the shell's stand-in for it
 * exists (pending-sidebar.ts has none of the panel methods).
 */
export function outlineSidebar(): Partial<OutlineSidebarLike> | null {
  const sidebars = leftSidebars();
  const sidebar = sidebars && sidebars.getSidebar(SidebarsIds.GOutlineSidebar);
  return sidebar ? (sidebar as Partial<OutlineSidebarLike>) : null;
}

/** The outline sidebar's layers panel, or null until the sidebars cluster provides it. */
export function outlineLayerPanel(): {
  sidebar: Pick<OutlineSidebarLike, "getId" | "getLayerPanel">;
  panel: LayerPanelHandle;
} | null {
  const sidebar = outlineSidebar();
  if (!sidebar || !sidebar.getLayerPanel || !sidebar.getId) return null;
  const found = sidebar as Pick<OutlineSidebarLike, "getId" | "getLayerPanel">;
  return { sidebar: found, panel: found.getLayerPanel() };
}

/** gDesigner.getToolManager(). */
export function toolManager(): ToolManager {
  return gDesigner().getToolManager();
}
