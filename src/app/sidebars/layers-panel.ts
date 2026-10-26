// Old: designer.browser.dev.js module 1706 ($.fn.gLayerPanel).
/**
 * The layers list of the outline sidebar: the layers and items of the
 * active page in a virtual tree, top of the list = front of the page (the
 * tree shows the children last to first). Each row has the title (rename
 * on double click), lock and visibility buttons, and for layers the
 * outline button and the layer colour. The panel follows the scene's
 * insert, remove, property and flag events.
 *
 * The old jQuery plugin kept its state in `$(el).data("glayerpanel")` and
 * other code called `el.gLayerPanel("method", ...)`. This class is that
 * state and those methods under the same names; `data()` gives the vtree
 * and the focused tree node as the old data object did.
 */
import { Color } from "../../engine/color/color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Util } from "../../engine/core/util.ts";
import { Block } from "../../engine/scene/block.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Element } from "../../engine/scene/element.ts";
import { Item } from "../../engine/scene/item.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import type {
  AfterFlagChangeEvent,
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforeRemoveEvent,
} from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Symbol, type SymbolSiblingUpdateEvent } from "../../engine/scene/symbol.ts";
import { FontAvailableEvent } from "../../engine/text/fonts/font-manager.ts";
import { Editor } from "../../editor/editor.ts";
import { applicationManager } from "../actions/host.ts";
import { config } from "../config.ts";
import { chooserOf, eventArgs, patternChooser } from "../inspector/color-deps.ts";
import { ContextMenuContext, type ContextMenuOptions } from "../menus/context-menu.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { AutoEdit } from "../widgets/auto-edit.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import {
  buildLayerItemContainer,
  getLayerOrItemStatus,
  nameAsTyped,
  type PanelContainerNode,
  type PanelNode,
} from "./layer-item.ts";
import {
  VirtualTree,
  VirtualTreeNodeNamed,
  type TreeDropEvent,
  type VirtualTreeNode,
} from "./virtual-tree.ts";
import type { VirtualRow } from "./virtual-list.ts";
import { PressMode } from "../shell/press-mode.ts";

/** GPressMode.PRESS_AND_HOLD (shell/press-mode.ts), as the page panel imports it from here. */
export const PRESS_AND_HOLD = PressMode.PRESS_AND_HOLD;

/** The property names whose change re-renders the rows. */
const RENDERED_PROPERTIES = ["name"];

/** What the panel keeps per tree id. */
interface TreeEntry {
  element: HTMLElement | null;
  node: Node;
  treeNode: VirtualTreeNode;
}

/** What the panel keeps per scene node. */
interface NodeEntry {
  element: HTMLElement | null;
  treeNode: VirtualTreeNode;
  treeId: string;
}

export interface LayerPanelOptions {
  nodeStyle: string;
  expandStyle: string;
  collapseStyle: string;
  freeHeight: number;
  insertIntoStyle: string;
  upSeparatorSpan1Style: string;
  upSeparatorSpan2Style: string;
  downSeparatorSpan1Style: string;
  downSeparatorSpan2Style: string;
  renderer: ((id: string, expanded: boolean | undefined, row: VirtualRow) => void) | null;
  expandRenderer: ((element: HTMLElement) => void) | null;
  separatorRenderer: ((element: HTMLElement, level: number) => void) | null;
  /** Whether nodes may go into parent before reference; `out` gets accepted indices. */
  canDropCallback:
    ((parent: Node | null, reference: Node | null, nodes: Node[], out: number[]) => boolean) | null;
  moveCallback: ((parent: Node | null, reference: Node | null, nodes: Node[]) => void) | null;
  isDuplicateEffectCallback: ((event: TreeDropEvent) => boolean) | null;
  duplicateCallback: ((parent: Node | null, reference: Node | null, nodes: Node[]) => void) | null;
  clickCallback: ((node: Node | null) => void) | null;
  startDraggingCallback: ((node: Node) => Node[] | null) | null;
  patternChooserStatusChangeCallBack: ((open: boolean) => void) | null;
}

/** The first symbol up from the node, unless it is a master (then none). */
function symbolInstanceOf(node: Node | null): Symbol | null {
  do {
    if (node instanceof Symbol) return node.isMaster() ? null : node;
    node = (node as Node).getParent();
  } while (node);
  return null;
}

/** A path inside a paths graph edge or a compound path's paths: not listed. */
function isInnerPath(node: Node): boolean {
  const parent = node.getParent();
  return (
    node instanceof PathBase &&
    !!parent &&
    (parent instanceof PGEdge || parent instanceof CompoundPath.Paths)
  );
}

/** Whether the node is on a page other than the active one. */
function isOnInactivePage(node: Node): boolean {
  // getScene and getPage come from the Element mixin, which Node's
  // typings lack; the scene is typed as its SceneHooks part there.
  const scene = (node as unknown as { getScene(): Scene | null }).getScene();
  if (scene) {
    const page = (node as unknown as { getPage(): Node | null }).getPage();
    const active = scene.getActivePage();
    if (active && page && page !== active) return true;
  }
  return false;
}

function text(table: string, key: string): string {
  return Locale.get(new LocaleKey(table, key)) as string;
}

/** `$(el).html(text)` of the old code for names, as the name was typed (see nameAsTyped). */
function setText(element: HTMLElement, value: string | null | undefined): void {
  element.textContent = value == null ? "" : nameAsTyped(value);
}

function span(className: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.classList.add(...className.split(/\s+/).filter(Boolean));
  return element;
}

export class LayerPanel {
  readonly element: HTMLElement;
  readonly options: LayerPanelOptions;
  readonly vtree: VirtualTree;
  layersTreeNodeMap: Record<string, TreeEntry | null> = {};
  layersTreeNodeMapByNodes = new Map<Node, NodeEntry>();
  _scene: Scene | null = null;
  currentFocus: VirtualTreeNode | null = null;
  _blockHandlers = false;
  _onlyUpdateStyle = false;
  _ignoreBlock: Node | null = null;
  _blockHighlight = false;

  /** `$(el).gLayerPanel(options)`. */
  constructor(element: HTMLElement, options: Partial<LayerPanelOptions> = {}) {
    this.element = element;
    this.options = {
      nodeStyle: "layer-row",
      expandStyle: "layer-arrow gravit-icon-right",
      collapseStyle: "layer-arrow gravit-icon-down",
      freeHeight: config.VTREE_FREE_HEIGHT,
      insertIntoStyle: "g-drop",
      upSeparatorSpan1Style: "g-up-separator-span1",
      upSeparatorSpan2Style: "g-up-separator-span2",
      downSeparatorSpan1Style: "g-down-separator-span1",
      downSeparatorSpan2Style: "g-down-separator-span2",
      renderer: (id, expanded, row) => this._renderRow(id, expanded, row),
      expandRenderer: (arrow) => this._expandRenderer(arrow),
      separatorRenderer: null,
      canDropCallback: (parent, reference, nodes) => this._canDrop(parent, reference, nodes),
      moveCallback: null,
      isDuplicateEffectCallback: null,
      duplicateCallback: null,
      clickCallback: null,
      startDraggingCallback: null,
      patternChooserStatusChangeCallBack: null,
      ...options,
    };
    const o = this.options;
    element.classList.add("g-layer-panel");
    this.vtree = new VirtualTree(
      element,
      (node, row) => this._treeRender(node, row),
      o.nodeStyle,
      o.expandRenderer ? o.expandRenderer : null,
      o.expandStyle == o.collapseStyle ? o.expandStyle : null,
      o.separatorRenderer ? o.separatorRenderer : null,
      o.freeHeight,
      o.insertIntoStyle,
      (parent, next, previous, nodes, out) => this._dropAllowed(parent, next, previous, nodes, out),
      (parent, next, previous, nodes) => this._move(parent, next, previous, nodes),
      o.isDuplicateEffectCallback,
      (parent, next, previous, nodes) => this._duplicate(parent, next, previous, nodes),
      (node) => this._click(node),
      (node) => this._expand(node),
      o.upSeparatorSpan1Style,
      o.upSeparatorSpan2Style,
      o.downSeparatorSpan1Style,
      o.downSeparatorSpan2Style,
      false,
      15,
      21,
    );
  }

  /** `$(el).data("glayerpanel")`: the tree and the focused tree node. */
  data(): this {
    return this;
  }

  // ---------------------------------------------------------------------------
  // Plugin methods

  refresh(): void {
    this.vtree.refresh();
  }

  relayout(): void {
    const focus = this.currentFocus;
    if (focus) this.vtree.expandAndFocus(focus);
    this.vtree.requestInvalidation();
  }

  /** `gLayerPanel("scene")` / `gLayerPanel("scene", scene)`. */
  scene(): Scene | null;
  scene(scene: Scene | null): this;
  scene(...args: [Scene | null] | []): Scene | null | this {
    if (!args.length) return this._scene;
    const scene = args[0];
    if (scene !== this._scene) {
      const old = this._scene;
      if (old) {
        old.removeEventListener(Node.AfterInsertEvent, this._afterInsert, this);
        old.removeEventListener(Node.BeforeRemoveEvent, this._beforeRemove, this);
        old.removeEventListener(Node.AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        old.removeEventListener(Node.AfterFlagChangeEvent, this._afterFlagChange, this);
        old.removeEventListener(Symbol.AfterSiblingUpdate, this._afterSiblingUpdate, this);
        designer().removeEventListener(SettingChangedEvent, this._settingChanged, this);
        const workspace = old.getWorkspace();
        if (workspace)
          workspace
            .getFontManager()
            ?.removeEventListener(FontAvailableEvent, this._fontAvailable, this);
      }
      this._clear();
      this._scene = scene;
      if (scene) {
        scene.addEventListener(Symbol.AfterSiblingUpdate, this._afterSiblingUpdate, this);
        scene.addEventListener(Node.AfterInsertEvent, this._afterInsert, this);
        scene.addEventListener(Node.BeforeRemoveEvent, this._beforeRemove, this);
        scene.addEventListener(Node.AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        scene.addEventListener(Node.AfterFlagChangeEvent, this._afterFlagChange, this);
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        const workspace = scene.getWorkspace();
        if (workspace)
          workspace
            .getFontManager()
            ?.addEventListener(FontAvailableEvent, this._fontAvailable, this);
        this._fillFromActivePage();
        this._updateLayout();
      }
    }
    return this;
  }

  blockHandlers(block: boolean): void {
    this._blockHandlers = !!block;
  }

  onlyUpdateStyle(only: boolean): void {
    this._onlyUpdateStyle = !!only;
  }

  ignoreBlock(node: Node | null): void {
    this._ignoreBlock = node;
  }

  setBlockHighlight(block: boolean): void {
    this._blockHighlight = !!block;
  }

  getLastVisitedDroppable(): VirtualRow | null {
    return this.vtree.getLastVisitedDroppable();
  }

  getTreeNode(node: Node): VirtualTreeNode | null {
    return this._treeNodeOf(node);
  }

  getItem(treeNode: VirtualTreeNode): Node | null {
    return this._itemById((treeNode as VirtualTreeNodeNamed).id);
  }

  /** The row's title group; `openAutoEdit` is its `gAutoEdit("open")`. */
  getTitleOfLayer(row: unknown): { element: HTMLElement | null; openAutoEdit(): void } {
    let group: HTMLElement | null = null;
    if (row instanceof HTMLElement)
      for (const child of row.children)
        if (child.classList.contains("layer-title-group")) {
          group = child as HTMLElement;
          break;
        }
    return {
      element: group,
      openAutoEdit: () => {
        const edit = group ? AutoEdit.of(group) : null;
        if (edit) edit.open();
      },
    };
  }

  getSelected(): HTMLElement[] {
    return [...this.element.children].filter((child) =>
      child.classList.contains("g-selected"),
    ) as HTMLElement[];
  }

  /**
   * The lock button: locks fully or unlocks the node (with Alt its
   * siblings that differ), unless a parent is fully locked or the program
   * lock forbids it.
   */
  toggleLockStatusOfLayerOrItem(node: unknown): void {
    const item = node as PanelNode;
    designer().stats("layers_change_locktype");
    const { parentLockType } = getLayerOrItemStatus(item);
    if (parentLockType && parentLockType !== Block.LockType.Partial) return;
    let lockType = item.getProperty("lkt") as string | null;
    const programLock = item.getProperty("plkt") as number;
    if (lockType) {
      if (
        !(
          programLock &
          (Block.ProgramLck.NoEdit |
            Block.ProgramLck.NoMove |
            Block.ProgramLck.NoNewChildren |
            Block.ProgramLck.NoDelete)
        )
      )
        lockType = null;
    } else lockType = Block.LockType.Full;
    if (parentLockType === Block.LockType.Partial && null === lockType) return;
    const targets: PanelNode[] = [];
    if (Platform.modifiers.optionKey) {
      for (
        let sibling = (item.getParent() as PanelContainerNode).getFirstChild() as PanelNode | null;
        null != sibling;
        sibling = sibling.getNext() as PanelNode | null
      ) {
        const siblingLock = sibling.getProperty("lkt");
        if (!(
          lockType === siblingLock ||
          (siblingLock === Block.LockType.Full && lockType === Block.LockType.Partial)
        ))
          targets.push(sibling);
      }
    } else targets.push(item);
    if (targets.length)
      Editor.tryRunTransaction(
        item,
        () => {
          for (let i = 0; i < targets.length; ++i) {
            const target = targets[i] as PanelNode;
            if (lockType === Block.LockType.Full)
              target.accept((child) => {
                child.removeFlag(Node.Flag.Selected as number);
              });
            target.setProperty("lkt", lockType);
          }
        },
        text("GCommonNames", "action.toggle-lock"),
      );
  }

  /** The visibility button: hides or shows the node (with Alt its siblings that differ). */
  toggleHideStatusOfLayerOrItem(node: unknown): void {
    const item = node as PanelNode;
    designer().stats("layers_toggle_visibility");
    const { parentHidden } = getLayerOrItemStatus(item);
    if (parentHidden) return;
    const visible = !item.getProperty("vis");
    const targets: PanelNode[] = [];
    if (Platform.modifiers.optionKey) {
      for (
        let sibling = (item.getParent() as PanelContainerNode).getFirstChild() as PanelNode | null;
        null != sibling;
        sibling = sibling.getNext() as PanelNode | null
      ) {
        const siblingVisible = sibling.getProperty("vis");
        if (null !== siblingVisible && siblingVisible !== visible) targets.push(sibling);
      }
    } else targets.push(item);
    Editor.tryRunTransaction(
      item,
      () => {
        for (let i = 0; i < targets.length; ++i) {
          const target = targets[i] as PanelNode;
          target.removeFlag(Node.Flag.Highlighted as number);
          target.setProperty("vis", visible);
        }
      },
      text("GCommonNames", "action.toggle-visibility"),
    );
  }

  /** The panels pass the height as a string ("34", "48"), as the old code did. */
  resetVTreeRowHeight(height: string | number): void {
    this.vtree.resetRowHeight(height);
  }

  getCurrentFocusedNode(): VirtualTreeNode | null {
    return this.currentFocus;
  }

  setCurrentFocusedNode(node: VirtualTreeNode | null): void {
    this.currentFocus = node;
  }

  _updateLayout(): void {
    const touch = designer().isTouchEnabled();
    this.vtree.setFreeHeight(touch ? config.VTREE_FREE_HEIGHT_TOUCH : config.VTREE_FREE_HEIGHT);
    this.vtree.setAnimatedDragEnabled(touch);
  }

  // ---------------------------------------------------------------------------
  // Tree callbacks

  /** The scene node of a tree node: the item, or the active page for the root. */
  private _sceneParent(treeNode: VirtualTreeNode): Node | null {
    const id = (treeNode as VirtualTreeNodeNamed).id;
    return id ? this._itemById(id) : this._scene ? this._scene.getActivePage() : null;
  }

  private _dropAllowed(
    parent: VirtualTreeNode,
    _next: VirtualTreeNode | null,
    previous: VirtualTreeNode | null,
    dragNodes: VirtualTreeNode[],
    out: VirtualTreeNode[] | null,
  ): boolean {
    let allowed = true;
    if (this.options.canDropCallback) {
      const target = this._sceneParent(parent);
      const reference = previous ? this._itemById((previous as VirtualTreeNodeNamed).id) : null;
      const nodes: Node[] = [];
      for (let i = 0; i < dragNodes.length; ++i)
        nodes.push(this._itemById((dragNodes[i] as VirtualTreeNodeNamed).id) as Node);
      const accepted: number[] = [];
      allowed = this.options.canDropCallback(target, reference, nodes, accepted);
      if (allowed)
        for (let i = 0; i < accepted.length; ++i)
          (out as VirtualTreeNode[]).push(dragNodes[accepted[i] as number] as VirtualTreeNode);
    }
    return allowed;
  }

  /**
   * The default drop test. The old code meant to collect the accepted
   * indices with `out.push(i)` but wrote `out.push[i]`, so it never
   * collects any; see "Drop tests never collect the accepted nodes" in
   * QUESTIONS.md.
   */
  private _canDrop(parent: Node | null, reference: Node | null, nodes: Node[]): boolean {
    if (!nodes || !nodes.length || !parent) return false;
    // The pro-feature check (symbol instances as drop targets) is always
    // passed in the local app (isEnabledProFeatures() is true).
    let allowed = true;
    for (let i = 0; i < nodes.length && allowed; ++i) {
      const node = nodes[i] as Node;
      allowed =
        !parent.isLocked() &&
        node.validateInsertion(parent as PanelContainerNode, reference) &&
        Editor.validateBlockInsertion(parent, node, reference);
    }
    return allowed;
  }

  private _move(
    parent: VirtualTreeNode,
    _next: VirtualTreeNode | null,
    previous: VirtualTreeNode | null,
    dragNodes: VirtualTreeNode[],
  ): void {
    if (!this.options.moveCallback) return;
    const target = this._sceneParent(parent);
    const reference = previous ? this._itemById((previous as VirtualTreeNodeNamed).id) : null;
    const nodes: Node[] = [];
    for (let i = 0; i < dragNodes.length; ++i)
      nodes.push(this._itemById((dragNodes[i] as VirtualTreeNodeNamed).id) as Node);
    this.options.moveCallback(target, reference, nodes);
  }

  private _duplicate(
    parent: VirtualTreeNode,
    _next: VirtualTreeNode | null,
    previous: VirtualTreeNode | null,
    dragNodes: VirtualTreeNode[],
  ): void {
    if (!this.options.duplicateCallback) return;
    const target = this._sceneParent(parent);
    const reference = previous ? this._itemById((previous as VirtualTreeNodeNamed).id) : null;
    const nodes: Node[] = [];
    for (let i = 0; i < dragNodes.length; ++i)
      nodes.push(this._itemById((dragNodes[i] as VirtualTreeNodeNamed).id) as Node);
    this.options.duplicateCallback(target, reference, nodes);
  }

  private _click(treeNode: VirtualTreeNode): void {
    if (this.options.clickCallback)
      this.options.clickCallback(this._itemById((treeNode as VirtualTreeNodeNamed).id));
  }

  private _expand(treeNode: VirtualTreeNode): void {
    const node = this._itemById((treeNode as VirtualTreeNodeNamed).id);
    if (node) {
      if (treeNode.expanded) node.setFlag(Node.Flag.Expanded as number);
      else node.removeFlag(Node.Flag.Expanded as number);
    }
  }

  private _treeRender(treeNode: VirtualTreeNode, row: VirtualRow): void {
    if (this.options && this.options.renderer)
      this.options.renderer(
        (treeNode as VirtualTreeNodeNamed).id as string,
        treeNode.expanded,
        row,
      );
    this._updateTouchHeight();
  }

  private _expandRenderer(arrow: HTMLElement): void {
    const style =
      arrow.id === VirtualTree.COLLAPSE_ID
        ? this.options.collapseStyle
        : arrow.id === VirtualTree.EXPAND_ID
          ? this.options.expandStyle
          : null;
    if (style) arrow.classList.add(...style.split(/\s+/).filter(Boolean));
  }

  // ---------------------------------------------------------------------------
  // Maps

  private _itemById(id: string | null | undefined): Node | null {
    const entry = id ? this.layersTreeNodeMap[id] : null;
    return entry ? entry.node : null;
  }

  private _entryById(id: string): TreeEntry | null | undefined {
    return this.layersTreeNodeMap[id];
  }

  private _treeIdOf(node: Node): string | null {
    const entry = this.layersTreeNodeMapByNodes.get(node);
    return entry ? entry.treeId : null;
  }

  private _treeNodeOf(node: Node): VirtualTreeNode | null {
    const entry = this.layersTreeNodeMapByNodes.get(node);
    return entry ? entry.treeNode : null;
  }

  private _forgetNodes(node: Node): void {
    node.accept((child) => {
      if (child instanceof Layer || child instanceof Item) {
        const entry = this.layersTreeNodeMapByNodes.get(child);
        if (entry) {
          this.layersTreeNodeMapByNodes.delete(child);
          this.layersTreeNodeMap[entry.treeId] = null;
        }
      }
      return undefined;
    });
  }

  // ---------------------------------------------------------------------------
  // Rows

  /** The default row renderer: the title group, the buttons and the row menu. */
  private _renderRow(id: string, expanded: boolean | undefined, row: VirtualRow): void {
    const entry = this._entryById(id);
    const node = entry ? entry.node : null;
    if (!node || !entry) return;
    const item = node as PanelNode;
    const { parentHidden, isHidden, lockType, isOutlined, hasSelection } =
      getLayerOrItemStatus(node);
    const { container, title, titleGroup } = buildLayerItemContainer(
      row,
      node,
      hasSelection,
      expanded,
    );
    entry.element = titleGroup;
    if (!node.hasFlag(Element.Flag.PartialLocked as number)) {
      titleGroup.setAttribute("draggable", "true");
      titleGroup.setAttribute("data-drag-mode", String(PRESS_AND_HOLD));
      titleGroup.addEventListener("dragstart", () => {
        if (!this.options.startDraggingCallback) return;
        const nodes = this.options.startDraggingCallback(node);
        if (nodes && nodes.length) {
          const own = title.textContent;
          let names = "";
          let name = (nodes[0] as PanelNode).getProperty("name") as string | null;
          if ((name = name || (nodes[0] as Node).getNodeNameTranslated())) names = name;
          for (let i = 1; i < nodes.length; ++i)
            if (
              (name =
                ((nodes[i] as PanelNode).getProperty("name") as string | null) ||
                (nodes[i] as Node).getNodeNameTranslated())
            )
              names += ", " + name;
          if (names.length) setText(title, names);
          const treeNodes: VirtualTreeNode[] = [];
          for (let i = 0; i < nodes.length; ++i) {
            const treeNode = this._treeNodeOf(nodes[i] as Node);
            if (treeNode) treeNodes.push(treeNode);
          }
          this.vtree.setDragNodes(treeNodes);
          // Puts back the row's own name, as the pages panel does. The old
          // code put back the last name of the list (BUGS-FIXED.md
          // "BUG-159").
          setTimeout(() => (title.textContent = own));
        } else titleGroup.setAttribute("draggable", "false");
      });
    }
    if (!this._blockHighlight) {
      let highlighted = node.hasFlag(Node.Flag.Highlighted as number);
      if (!highlighted && !expanded && node.hasMixin(Node.Container))
        highlighted = !!(node as PanelContainerNode).acceptChildren(
          (child) => child.hasFlag(Node.Flag.Highlighted as number),
          false,
          true,
        );
      container.classList.toggle("g-highlighted-row", highlighted);
    }
    if (!lockType && designer().getActiveDocument() && applicationManager().isEditingEnabled())
      new AutoEdit(titleGroup, {
        textSelector: ":scope > .layer-title",
        getContainer: () => (this._entryById(id) as TreeEntry).element as HTMLElement,
        submitCallback: (value) => {
          if (value && "" !== value.trim())
            Editor.tryRunTransaction(
              item,
              () => {
                item.setProperty("name", value);
              },
              text("GLayerPanel", "action.rename-layer"),
            );
        },
      });
    const instance = symbolInstanceOf(node);
    if (instance && !instance.inSync(node, true)) {
      const sync = span("layer-action layer-synchronize gravit-icon-refresh");
      sync.setAttribute("data-title", text("GLayerPanel", "action.reset-instance"));
      sync.addEventListener("click", (event) => {
        designer().stats("layers_click_symbol-reset");
        event.stopPropagation();
        Editor.tryRunTransaction(
          node,
          () => {
            instance.synchronize(node);
          },
          text("GLayerPanel", "action.reset-instance"),
        );
      });
      container.appendChild(sync);
    }
    const touch = designer().isTouchEnabled();
    let lockIcon = lockType ? "gravit-icon-lock" : "gravit-icon-unlock";
    lockIcon = touch ? lockIcon + "-small" : lockIcon;
    const lock = span("layer-action layer-lock " + lockIcon);
    lock.classList.toggle("g-active", !!lockType);
    lock.setAttribute("data-title", text("GCommonNames", "action.toggle-lock"));
    lock.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleLockStatusOfLayerOrItem(node);
    });
    container.appendChild(lock);
    attachRichTooltip(
      lock,
      RichTooltipConfig.from({
        title: text("GCommonNames", "text.layer-toggle-lock-tooltip-title"),
        description: text("GCommonNames", "text.layer-toggle-lock-tooltip-description"),
        learnMore: "",
      }),
    );
    container.classList.toggle("layer-hidden", isHidden);
    let visibilityIcon = isHidden ? "gravit-icon-hide" : "gravit-icon-display";
    visibilityIcon = touch ? visibilityIcon + "-small" : visibilityIcon;
    const visibility = span("layer-action layer-visibility " + visibilityIcon);
    visibility.classList.toggle("g-active", isHidden);
    visibility.setAttribute("data-title", text("GCommonNames", "action.toggle-visibility"));
    visibility.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleHideStatusOfLayerOrItem(node);
    });
    container.appendChild(visibility);
    attachRichTooltip(
      visibility,
      RichTooltipConfig.from({
        title: text("GCommonNames", "text.layer-toggle-visibility-tooltip-title"),
        description: text("GCommonNames", "text.layer-toggle-visibility-tooltip-description"),
        learnMore: "",
      }),
    );
    if (node instanceof Layer) {
      const outline = span(
        "layer-action layer-outline gravit-icon-" + (isOutlined ? "ellipse" : "circle"),
      );
      outline.classList.toggle("g-active", !!isOutlined);
      outline.setAttribute("data-title", text("GLayerPanel", "action.toggle-outline"));
      outline.addEventListener("click", (event) => {
        designer().stats("layers_toggle_outline");
        event.stopPropagation();
        if (parentHidden) return;
        Editor.tryRunTransaction(
          node,
          () => {
            item.setProperty("otl", !item.getProperty("otl"));
            outline.classList.toggle("gravit-icon-ellipse", !!item.getProperty("otl"));
            outline.classList.toggle("gravit-icon-circle", !item.getProperty("otl"));
          },
          text("GLayerPanel", "action.toggle-outline"),
        );
      });
      attachRichTooltip(
        outline,
        RichTooltipConfig.from({
          title: text("GCommonNames", "text.layer-toggle-outline-tooltip-title"),
          learnMore: "",
        }),
      );
      container.appendChild(outline);
      const color = span("layer-color");
      patternChooser(color, {
        types: [Color],
        hasOpacity: false,
        asButton: false,
        simplified: true,
      });
      chooserOf(color)?.value(item.getProperty("cls") as Color | null);
      color.addEventListener("patternchange", (event) => {
        const [pattern, , temporary] = eventArgs(event);
        if (temporary) return;
        Editor.tryRunTransaction(
          node,
          () => {
            const previous = item.getProperty("cls");
            item.setProperty("cls", pattern);
            (node as PanelContainerNode).acceptChildren((child) => {
              if (child instanceof Layer) {
                const childColor = child.getProperty("cls");
                if (Util.equals(childColor, previous)) child.setProperty("cls", pattern);
              }
              return undefined;
            });
          },
          text("GLayerPanel", "action.change-layer-color"),
        );
      });
      color.addEventListener("chooseropen", () => {
        (this.options.patternChooserStatusChangeCallBack as (open: boolean) => void)(true);
      });
      color.addEventListener("chooserclose", () => {
        (this.options.patternChooserStatusChangeCallBack as (open: boolean) => void)(false);
      });
      container.appendChild(color);
    }
    container.addEventListener("contextmenu", (event) => {
      const editor = designer().getActiveDocument()?.getEditor();
      const selection = (editor && editor.getSelection()) || [];
      if (selection.indexOf(node) < 0 && this.options.clickCallback)
        this.options.clickCallback(node);
      const contextMenu = designer().getContextMenu();
      if (contextMenu)
        contextMenu.trigger(contextMenuOptions(event, ContextMenuContext.LayerPanel));
    });
  }

  private _insertTreeNodeBefore(
    id: string,
    reference: VirtualTreeNode,
    expanded: boolean,
  ): VirtualTreeNode {
    const treeNode = new VirtualTreeNodeNamed(id);
    if (expanded) treeNode.expanded = true;
    this.vtree.insertNodeBefore(reference, treeNode);
    return treeNode;
  }

  private _appendTreeNode(
    id: string,
    parent: VirtualTreeNode | null,
    expanded: boolean,
  ): VirtualTreeNode {
    const treeNode = new VirtualTreeNodeNamed(id);
    if (expanded) treeNode.expanded = true;
    this.vtree.appendNode(parent, treeNode);
    return treeNode;
  }

  /**
   * Adds a row for the node (and its layers and items), above its previous
   * element sibling. Without `force` it does nothing while the parent
   * container has no row (it isn't shown).
   */
  private _addNode(node: Node, force?: boolean): void {
    const id = Util.uuid();
    const parent = node.getParent();
    if (
      !force &&
      parent &&
      parent.hasMixin(Node.Container) &&
      !(parent instanceof Scene) &&
      !(parent instanceof Page) &&
      !this._treeIdOf(parent)
    )
      return;
    this.vtree.beginUpdate();
    let previous = node.getPrevious();
    while (previous && !(previous instanceof Element)) previous = previous.getPrevious();
    const previousTreeNode = previous ? this._treeNodeOf(previous) : null;
    let treeNode: VirtualTreeNode;
    const expanded = node.hasFlag(Node.Flag.Expanded as number);
    if (previousTreeNode) treeNode = this._insertTreeNodeBefore(id, previousTreeNode, expanded);
    else {
      const parentTreeNode =
        !parent || parent instanceof Scene || parent instanceof Page
          ? null
          : this._treeNodeOf(parent);
      treeNode = this._appendTreeNode(id, parentTreeNode, expanded);
    }
    this.layersTreeNodeMap[id] = { element: null, node, treeNode };
    this.layersTreeNodeMapByNodes.set(node, { element: null, treeNode, treeId: id });
    if (node.hasMixin(Node.Container))
      for (
        let child = (node as PanelContainerNode).getFirstChild();
        null !== child;
        child = child.getNext()
      )
        if (child instanceof Layer || child instanceof Item) this._addNode(child, force);
    this.vtree.endUpdate();
  }

  private _removeNodeRows(node: Node): void {
    const treeNode = this._treeNodeOf(node);
    if (treeNode) {
      this.vtree.removeNode(treeNode);
      this._forgetNodes(node);
    }
  }

  /** Whether the scene handlers run: not blocked, or blocked except for this node. */
  private _handlersAllowed(node: Node | null): boolean {
    return !this._blockHandlers || !(!this._ignoreBlock || this._ignoreBlock !== node);
  }

  private _afterSiblingUpdate(event: SymbolSiblingUpdateEvent): void {
    const node = event.targetNode;
    if (node instanceof Layer || (node instanceof Item && !isInnerPath(node)))
      switch (event.type) {
        case Symbol.AfterSiblingUpdate.INSERT:
          this._addNode(node);
          break;
        case Symbol.AfterSiblingUpdate.REMOVE:
          this._removeNodeRows(node);
      }
  }

  private _afterInsert(event: AfterInsertEvent): void {
    const node = event.node as Node;
    if (
      this._handlersAllowed(node) &&
      (node instanceof Layer ||
        (node instanceof Item && !isInnerPath(node) && !isOnInactivePage(node)))
    )
      this._addNode(node);
  }

  private _beforeRemove(event: BeforeRemoveEvent): void {
    const node = event.node as Node;
    if (this._handlersAllowed(node) && (node instanceof Layer || node instanceof Item))
      this._removeNodeRows(node);
  }

  private _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (event.temporary) return;
    const node = event.node as Node;
    if (
      !this._blockHandlers &&
      ((event.properties as string[]).some((name) => RENDERED_PROPERTIES.indexOf(name) >= 0) ||
        symbolInstanceOf(node)) &&
      (node instanceof Layer || node instanceof Item)
    )
      this.vtree.requestInvalidation();
  }

  private _fontAvailable(): void {
    this.vtree.requestInvalidation();
  }

  private _settingChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._updateLayout();
  }

  private _afterFlagChange(event: AfterFlagChangeEvent): void {
    const vtree = this.vtree;
    let onlyStyle = this._onlyUpdateStyle;
    const node = event.node as Node;
    const flag = event.flag;
    if (!this._handlersAllowed(node)) return;
    let invalidate = false;
    if (node instanceof Layer || node instanceof Item) {
      if (
        flag === Element.Flag.Hidden ||
        flag === Element.Flag.PartialLocked ||
        flag === Element.Flag.FullLocked ||
        flag === Node.Flag.Selected ||
        flag === Node.Flag.Active
      ) {
        // getScene's type is the SceneHooks part, without getActivePage.
        const page = node.getPage();
        const scene = node.getScene() as unknown as Scene | null;
        const active = scene && scene.getActivePage();
        if (!(active && page && active !== page)) {
          invalidate = true;
          if (!onlyStyle) onlyStyle = flag === Node.Flag.Active;
        }
      } else if (!this._blockHighlight && flag === Node.Flag.Highlighted) {
        const shown = (candidate: Node): boolean | null => {
          const treeNode = this._treeNodeOf(candidate);
          return treeNode && treeNode.isVisible();
        };
        if (shown(node) || node.findParent(shown)) invalidate = true;
      }
    }
    if (
      designer().getSetting("auto_expand_layers") &&
      flag === Node.Flag.Selected &&
      node &&
      node.hasFlag(Node.Flag.Selected as number)
    ) {
      const treeNode = this._treeNodeOf(node);
      if (treeNode) {
        if (vtree.expandAndFocus(treeNode, invalidate)) this.currentFocus = treeNode;
        else invalidate = true;
      }
    }
    if (node instanceof Page && flag === Node.Flag.Active) {
      this._clear();
      this._fillFromActivePage();
      invalidate = false;
    }
    if (invalidate) {
      if (onlyStyle) setTimeout(() => this._updateRowStyle(node));
      else vtree.requestInvalidation();
    }
  }

  private _fillFromActivePage(): void {
    this.vtree.beginUpdate();
    const page = this._scene && this._scene.getActivePage();
    if (page)
      for (let child = page.getFirstChild(); null !== child; child = child.getNext())
        if (child instanceof Layer || child instanceof Item) this._addNode(child, true);
    this.vtree.endUpdate();
    this._updateTouchHeight();
  }

  /** On touch the list is as high as its rows (plus the drop zone). */
  private _updateTouchHeight(): void {
    if (!designer().isTouchEnabled()) return;
    const parent = this.element.parentElement;
    const scroller = this.element.querySelector(".vscroller");
    if (parent && scroller)
      parent.style.height =
        parseInt(getComputedStyle(scroller).height, 10) + config.VTREE_FREE_HEIGHT + "px";
  }

  private _clear(): void {
    this.vtree.clean();
    this.layersTreeNodeMap = {};
    this.layersTreeNodeMapByNodes = new Map();
  }

  /** Updates the state classes of the node's row (and its parents' rows) without rendering. */
  private _updateRowStyle(node: Node): null | undefined {
    const treeId = this._treeIdOf(node);
    if (!treeId) return null;
    const entry = this._entryById(treeId);
    if (!entry) return null;
    const titleGroup = entry.element;
    // The old code threw here when the row was never rendered (element
    // null); it ran in a timer, so only the console saw it.
    if (!titleGroup) return null;
    const row = titleGroup.parentElement;
    let hasSelection = false;
    if (node.hasMixin(Node.Container))
      for (
        let child = (node as PanelContainerNode).getFirstChild();
        null !== child && !hasSelection;
        child = child.getNext()
      )
        if (child instanceof Item && child.hasFlag(Node.Flag.Selected as number))
          hasSelection = true;
    const parent = node.getParent();
    if (parent && node instanceof Item) this._updateRowStyle(parent);
    if (row) {
      row.classList.toggle("g-active", node.hasFlag(Node.Flag.Active as number));
      row.classList.toggle("g-selected", node.hasFlag(Node.Flag.Selected as number));
      row.classList.toggle("g-has-selection", hasSelection);
    }
    titleGroup.classList.toggle("g-selected", node.hasFlag(Node.Flag.Selected as number));
    return undefined;
  }
}

/** The options a row's context menu hands over: the event's position and the context. */
export function contextMenuOptions(event: MouseEvent, context: number): ContextMenuOptions {
  return {
    pageX: event.pageX,
    pageY: event.pageY,
    clientX: event.clientX,
    clientY: event.clientY,
    data: { context },
  };
}
