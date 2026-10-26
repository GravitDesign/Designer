// Old: designer.browser.dev.js module 1717 ($.fn.gPagePanel).
/**
 * The pages list of the outline sidebar: one row per page in scene order,
 * with the title (rename on double click), lock and visibility buttons.
 * Rows can be dragged to reorder the pages; a click makes the page active.
 *
 * Like the layers panel, this class is the old plugin's data and methods
 * under their old names.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Util } from "../../engine/core/util.ts";
import { Block } from "../../engine/scene/block.ts";
import { Element } from "../../engine/scene/element.ts";
import { Node } from "../../engine/scene/node.ts";
import type {
  AfterFlagChangeEvent,
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforeRemoveEvent,
} from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Editor } from "../../editor/editor.ts";
import { applicationManager } from "../actions/host.ts";
import { config } from "../config.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { AutoEdit } from "../widgets/auto-edit.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { contextMenuOptions, PRESS_AND_HOLD } from "./layers-panel.ts";
import { nameAsTyped, type PanelContainerNode, type PanelNode } from "./layer-item.ts";
import type { VirtualRow } from "./virtual-list.ts";
import { VirtualTree, VirtualTreeNodeNamed, type VirtualTreeNode } from "./virtual-tree.ts";

interface PageEntry {
  node: Node;
  treeNode: VirtualTreeNode;
  element: HTMLElement | null;
}

interface PageNodeEntry {
  element: HTMLElement | null;
  treeNode: VirtualTreeNode;
  treeId: string;
}

export interface PagePanelOptions {
  nodeStyle: string;
  collapseStyle: string;
  freeHeight: number;
  insertIntoStyle: string;
  upSeparatorSpan1Style: string;
  upSeparatorSpan2Style: string;
  downSeparatorSpan1Style: string;
  downSeparatorSpan2Style: string;
  renderer: ((id: string, row: VirtualRow) => void) | null;
  separatorRenderer: ((element: HTMLElement, level: number) => void) | null;
  canDropCallback:
    | ((
        parent: Node | null,
        reference: Node | null,
        nodes: Node[],
        out: number[],
      ) => boolean | undefined)
    | null;
  moveCallback: ((parent: Node | null, reference: Node | null, nodes: Node[]) => void) | null;
  clickCallback: ((node: Node | null) => void) | null;
  startDraggingCallback: ((node: Node) => Node[] | null) | null;
}

function text(table: string, key: string): string {
  return Locale.get(new LocaleKey(table, key)) as string;
}

function span(className: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.classList.add(...className.split(/\s+/).filter(Boolean));
  return element;
}

export class PagePanel {
  readonly element: HTMLElement;
  readonly options: PagePanelOptions;
  readonly vtree: VirtualTree;
  pagesTreeNodeMap: Record<string, PageEntry | null> = {};
  pagesTreeNodeMapByNodes = new Map<Node, PageNodeEntry>();
  _scene: Scene | null = null;
  currentFocus: VirtualTreeNode | null = null;
  _blockHandlers = false;
  _blockHighlight = false;

  /** `$(el).gPagePanel(options)`. */
  constructor(element: HTMLElement, options: Partial<PagePanelOptions> = {}) {
    this.element = element;
    this.options = {
      nodeStyle: "page-row",
      collapseStyle: "page-arrow gravit-icon-down",
      freeHeight: config.VTREE_FREE_HEIGHT,
      insertIntoStyle: "g-drop",
      upSeparatorSpan1Style: "g-up-separator-span1",
      upSeparatorSpan2Style: "g-up-separator-span2",
      downSeparatorSpan1Style: "g-down-separator-span1",
      downSeparatorSpan2Style: "g-down-separator-span2",
      renderer: (id, row) => this._renderRow(id, row),
      separatorRenderer: null,
      canDropCallback: (parent, reference, nodes) => this._canDrop(parent, reference, nodes),
      moveCallback: null,
      clickCallback: null,
      startDraggingCallback: null,
      ...options,
    };
    const o = this.options;
    element.classList.add("g-page-panel");
    this.vtree = new VirtualTree(
      element,
      (node, row) => this._treeRender(node, row),
      o.nodeStyle,
      null,
      null,
      o.separatorRenderer ? o.separatorRenderer : null,
      o.freeHeight,
      o.insertIntoStyle,
      (parent, next, previous, nodes, out) => this._dropAllowed(parent, next, nodes, out),
      (parent, next, _previous, nodes) => this._move(parent, next, nodes),
      null,
      null,
      (node) => this._click(node),
      null,
      o.upSeparatorSpan1Style,
      o.upSeparatorSpan2Style,
      o.downSeparatorSpan1Style,
      o.downSeparatorSpan2Style,
      false,
      0,
      21,
    );
  }

  data(): this {
    return this;
  }

  refresh(): void {
    this.vtree.refresh();
  }

  relayout(): void {
    const focus = this.currentFocus;
    if (focus) this.vtree.expandAndFocus(focus);
    this.vtree.requestInvalidation();
  }

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
        designer().removeEventListener(SettingChangedEvent, this._settingChanged, this);
      }
      this._clear();
      this._scene = scene;
      if (scene) {
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        scene.addEventListener(Node.AfterInsertEvent, this._afterInsert, this);
        scene.addEventListener(Node.BeforeRemoveEvent, this._beforeRemove, this);
        scene.addEventListener(Node.AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        scene.addEventListener(Node.AfterFlagChangeEvent, this._afterFlagChange, this);
        for (let child = scene.getLastChild(); null !== child; child = child.getPrevious())
          if (child instanceof Page) this._addPage(child);
        this._updateLayout();
      }
    }
    return this;
  }

  blockHandlers(block: boolean): void {
    this._blockHandlers = !!block;
  }

  getLastVisitedDroppable(): VirtualRow | null {
    return this.vtree.getLastVisitedDroppable();
  }

  setBlockHighlight(block: boolean): void {
    this._blockHighlight = !!block;
  }

  resetVTreeRowHeight(height: string | number): void {
    this.vtree.resetRowHeight(height);
  }

  _updateLayout(): void {
    const touch = designer().isTouchEnabled();
    this.vtree.setFreeHeight(touch ? config.VTREE_FREE_HEIGHT_TOUCH : config.VTREE_FREE_HEIGHT);
    this.vtree.setAnimatedDragEnabled(touch);
  }

  // ---------------------------------------------------------------------------

  private _itemById(id: string | null | undefined): Node | null {
    const entry = id ? this.pagesTreeNodeMap[id] : null;
    return entry ? entry.node : null;
  }

  private _entryById(id: string): PageEntry | null | undefined {
    return this.pagesTreeNodeMap[id];
  }

  private _treeNodeOf(node: Node): VirtualTreeNode | null {
    const entry = this.pagesTreeNodeMapByNodes.get(node);
    return entry ? entry.treeNode : null;
  }

  private _forgetNodes(node: Node): void {
    node.accept((child) => {
      if (child instanceof Page) {
        const entry = this.pagesTreeNodeMapByNodes.get(child);
        if (entry) {
          this.pagesTreeNodeMapByNodes.delete(child);
          this.pagesTreeNodeMap[entry.treeId] = null;
        }
      }
      return undefined;
    });
  }

  /** The scene node of a tree node: the page, or the scene for the root. */
  private _sceneParent(treeNode: VirtualTreeNode): Node | null {
    const id = (treeNode as VirtualTreeNodeNamed).id;
    return id ? this._itemById(id) : this._scene;
  }

  /**
   * Unlike the layers panel this passes the tree's next row as the
   * reference (pages are listed in scene order).
   */
  private _dropAllowed(
    parent: VirtualTreeNode,
    next: VirtualTreeNode | null,
    dragNodes: VirtualTreeNode[],
    out: VirtualTreeNode[] | null,
  ): boolean {
    let allowed: boolean | undefined = true;
    if (this.options.canDropCallback) {
      const target = this._sceneParent(parent);
      const reference = next ? this._itemById((next as VirtualTreeNodeNamed).id) : null;
      const nodes: Node[] = [];
      for (let i = 0; i < dragNodes.length; ++i)
        nodes.push(this._itemById((dragNodes[i] as VirtualTreeNodeNamed).id) as Node);
      const accepted: number[] = [];
      allowed = this.options.canDropCallback(target, reference, nodes, accepted);
      if (allowed)
        for (let i = 0; i < accepted.length; ++i)
          (out as VirtualTreeNode[]).push(dragNodes[accepted[i] as number] as VirtualTreeNode);
    }
    return !!allowed;
  }

  /**
   * The default drop test. Without editing it returns undefined (no drop);
   * `out.push[i]` never collects anything, as in the layers panel (see
   * "Drop tests never collect the accepted nodes" in QUESTIONS.md).
   */
  private _canDrop(
    parent: Node | null,
    reference: Node | null,
    nodes: Node[],
  ): boolean | undefined {
    if (!nodes || !nodes.length || !parent) return false;
    let allowed = true;
    if (applicationManager().isEditingEnabled()) {
      for (let i = 0; i < nodes.length && allowed; ++i) {
        const node = nodes[i];
        allowed =
          !parent.isLocked() &&
          !!node &&
          node.validateInsertion(parent as PanelContainerNode, reference);
      }
      return allowed;
    }
    return undefined;
  }

  private _move(
    parent: VirtualTreeNode,
    next: VirtualTreeNode | null,
    dragNodes: VirtualTreeNode[],
  ): void {
    if (!this.options.moveCallback) return;
    const target = this._sceneParent(parent);
    const reference = next ? this._itemById((next as VirtualTreeNodeNamed).id) : null;
    const nodes: Node[] = [];
    for (let i = 0; i < dragNodes.length; ++i)
      nodes.push(this._itemById((dragNodes[i] as VirtualTreeNodeNamed).id) as Node);
    this.options.moveCallback(target, reference, nodes);
  }

  private _click(treeNode: VirtualTreeNode): void {
    if (this.options.clickCallback)
      this.options.clickCallback(this._itemById((treeNode as VirtualTreeNodeNamed).id));
  }

  private _treeRender(treeNode: VirtualTreeNode, row: VirtualRow): void {
    if (this.options.renderer)
      this.options.renderer((treeNode as VirtualTreeNodeNamed).id as string, row);
    this._updateTouchHeight();
  }

  /** The default row renderer. */
  private _renderRow(id: string, row: VirtualRow): void {
    const entry = this._entryById(id) as PageEntry;
    const node = entry.node;
    if (!node) return;
    if (!(node instanceof Page)) throw new Error("item not page");
    const page = node;
    const lockType = page.getProperty("lkt");
    const isMaster = !!page.getSlavePages().length;
    const isInfinite = 0 === page.getProperty("w") && 0 === page.getProperty("h");
    row.setAttribute("draggable", "false");
    row.addEventListener("mouseenter", () => {
      if (page.getProperty("w") && !page.hasFlag(Element.Flag.Hidden as number))
        page.setFlag(Node.Flag.Highlighted as number);
    });
    row.addEventListener("mouseleave", () => {
      if (page.getProperty("w") && !page.hasFlag(Element.Flag.Hidden as number))
        page.removeFlag(Node.Flag.Highlighted as number);
    });
    const titleGroup = span("page-title-group");
    row.appendChild(titleGroup);
    entry.element = titleGroup;
    let name = page.getProperty("name") as string | null;
    // The old code inserted the name as HTML; see nameAsTyped.
    name = nameAsTyped(name || page.getNodeNameTranslated());
    if (isMaster && !designer().isTouchEnabled()) name += " (master)";
    const title = span("page-title");
    title.textContent = name;
    titleGroup.appendChild(title);
    if (!page.hasFlag(Element.Flag.PartialLocked as number)) {
      titleGroup.setAttribute("draggable", "true");
      titleGroup.setAttribute("data-drag-mode", String(PRESS_AND_HOLD));
      titleGroup.addEventListener("dragstart", () => {
        if (!this.options.startDraggingCallback) return;
        const nodes = this.options.startDraggingCallback(page);
        if (nodes && nodes.length) {
          titleGroup.classList.add("g-dragging");
          let names = "";
          let other = (nodes[0] as PanelNode).getProperty("name") as string | null;
          if ((other = other || (nodes[0] as Node).getNodeNameTranslated())) names = other;
          for (let i = 1; i < nodes.length; ++i)
            if (
              (other =
                ((nodes[i] as PanelNode).getProperty("name") as string | null) ||
                (nodes[i] as Node).getNodeNameTranslated())
            )
              names += ", " + other;
          if (names.length) title.textContent = nameAsTyped(names);
          const treeNodes: VirtualTreeNode[] = [];
          for (let i = 0; i < nodes.length; ++i) {
            const treeNode = this._treeNodeOf(nodes[i] as Node);
            if (treeNode) treeNodes.push(treeNode);
          }
          this.vtree.setDragNodes(treeNodes);
          setTimeout(() => {
            titleGroup.classList.remove("g-dragging");
            title.textContent = name;
          });
        } else titleGroup.setAttribute("draggable", "false");
      });
    }
    row.classList.toggle("g-active", page.hasFlag(Node.Flag.Active as number));
    if (!this._blockHighlight)
      row.classList.toggle("g-highlighted-row", page.hasFlag(Node.Flag.Highlighted as number));
    if (!lockType && applicationManager().isEditingEnabled())
      new AutoEdit(titleGroup, {
        textSelector: ":scope > .page-title",
        getContainer: () => (this._entryById(id) as PageEntry).element as HTMLElement,
        submitCallback: (value) => {
          if (value && "" !== value.trim())
            Editor.tryRunTransaction(
              page,
              () => {
                page.setProperty("name", value);
              },
              text("GPagePanel", "action.rename-page"),
            );
        },
      });
    const icon = span("page-icon gravit-icon-page");
    titleGroup.insertBefore(icon, title);
    if (designer().isTouchEnabled()) {
      if (isInfinite) {
        icon.classList.toggle("gravit-icon-page-infinity", true);
        icon.classList.toggle("gravit-icon-page", false);
      } else if (isMaster) {
        icon.classList.toggle("gravit-icon-page-master", true);
        icon.classList.toggle("gravit-icon-page", false);
      }
    }
    const touch = designer().isTouchEnabled();
    let lockIcon = lockType ? "gravit-icon-lock" : "gravit-icon-unlock";
    lockIcon = touch ? lockIcon + "-small" : lockIcon;
    const lock = span("page-action page-lock " + lockIcon);
    lock.classList.toggle("g-active", !!lockType);
    lock.setAttribute("data-title", text("GCommonNames", "action.toggle-lock"));
    lock.addEventListener("click", (event) => {
      designer().stats("pages_change_lock");
      event.stopPropagation();
      let next = page.getProperty("lkt") as string | null;
      next = next ? null : Block.LockType.Full;
      const scene = this._scene as Scene;
      Editor.tryRunTransaction(
        page,
        () => {
          page.setProperty("lkt", next);
          if (next === Block.LockType.Full) {
            scene.setProperty("edit", false);
            const active = designer().getActiveDocument();
            if (active) active.getEditor()?.clearSelection();
          } else scene.setProperty("edit", true);
        },
        text("GCommonNames", "action.toggle-lock"),
      );
    });
    row.appendChild(lock);
    attachRichTooltip(
      lock,
      RichTooltipConfig.from({
        title: text("GCommonNames", "text.page-toggle-lock-tooltip-title"),
        description: text("GCommonNames", "text.page-toggle-lock-tooltip-description"),
        learnMore: "",
      }),
    );
    const hidden = false === page.getProperty("vis");
    row.classList.toggle("page-hiden", hidden);
    let visibilityIcon = hidden ? "gravit-icon-hide" : "gravit-icon-display";
    visibilityIcon = touch ? visibilityIcon + "-small" : visibilityIcon;
    const visibility = span("page-action page-visibility " + visibilityIcon);
    visibility.classList.toggle("g-active", hidden);
    visibility.setAttribute("data-title", text("GCommonNames", "action.toggle-visibility"));
    visibility.addEventListener("click", (event) => {
      designer().stats("pages_change_visibility");
      event.stopPropagation();
      const visible = !page.getProperty("vis");
      Editor.tryRunTransaction(
        page,
        () => {
          page.setProperty("vis", visible);
        },
        text("GCommonNames", "action.toggle-visibility"),
      );
    });
    row.appendChild(visibility);
    attachRichTooltip(
      visibility,
      RichTooltipConfig.from({
        title: text("GCommonNames", "text.page-toggle-visibility-tooltip-title"),
        description: text("GCommonNames", "text.page-toggle-visibility-tooltip-description"),
        learnMore: "",
      }),
    );
    row.addEventListener("contextmenu", (event) => {
      (this._scene as Scene).setActivePage(page);
      const contextMenu = designer().getContextMenu();
      if (contextMenu) contextMenu.trigger(contextMenuOptions(event, ContextMenuContext.PagePanel));
    });
  }

  private _insertTreeNodeBefore(id: string, reference: VirtualTreeNode): VirtualTreeNode {
    const treeNode = new VirtualTreeNodeNamed(id);
    this.vtree.insertNodeBefore(reference, treeNode);
    return treeNode;
  }

  private _appendTreeNode(id: string): VirtualTreeNode {
    const treeNode = new VirtualTreeNodeNamed(id);
    this.vtree.appendNode(null, treeNode);
    return treeNode;
  }

  /** Adds a row for the page, before the row of the next page. */
  private _addPage(page: Node): void {
    const id = Util.uuid();
    this.vtree.beginUpdate();
    let next = page.getNext();
    for (; next && !(next instanceof Page); next = next.getNext());
    const nextTreeNode = next ? this._treeNodeOf(next) : null;
    const treeNode = nextTreeNode
      ? this._insertTreeNodeBefore(id, nextTreeNode)
      : this._appendTreeNode(id);
    this.pagesTreeNodeMap[id] = { node: page, treeNode, element: null };
    this.pagesTreeNodeMapByNodes.set(page, { element: null, treeNode, treeId: id });
    this.vtree.endUpdate();
  }

  private _removePage(page: Node): void {
    const treeNode = this._treeNodeOf(page);
    if (treeNode) {
      this.vtree.removeNode(treeNode);
      this._forgetNodes(page);
    }
  }

  private _afterInsert(event: AfterInsertEvent): void {
    if (!this._blockHandlers && event.node instanceof Page) this._addPage(event.node);
  }

  private _beforeRemove(event: BeforeRemoveEvent): void {
    if (!this._blockHandlers && event.node instanceof Page) this._removePage(event.node);
  }

  private _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (
      !event.temporary &&
      !this._blockHandlers &&
      (event.node instanceof Page || event.node instanceof Scene)
    ) {
      const properties = event.properties as string[];
      // The scene's page index alone changes nothing the rows show.
      if (event.node instanceof Scene && 1 === properties.length && "pi" === properties[0]) return;
      this.vtree.requestInvalidation();
    }
  }

  /** Marks the active row without rendering. */
  private _markActive(treeNode: VirtualTreeNode | null): void {
    if (!treeNode) return;
    for (const row of this.element.querySelectorAll(".page-row.g-active"))
      row.classList.remove("g-active");
    const entry = this._entryById((treeNode as VirtualTreeNodeNamed).id as string);
    const element = entry && entry.element;
    const row = element ? element.closest(".page-row") : null;
    if (row) row.classList.add("g-active");
  }

  private _afterFlagChange(event: AfterFlagChangeEvent): void {
    const node = event.node;
    if (this._blockHandlers || !(node instanceof Page)) return;
    const flag = event.flag;
    if (
      flag === Element.Flag.Hidden ||
      flag === Element.Flag.PartialLocked ||
      flag === Element.Flag.FullLocked ||
      flag === Node.Flag.Active
    ) {
      // getScene's type is the SceneHooks part, without getActivePage.
      const scene = node.getScene() as unknown as Scene | null;
      const active = scene && scene.getActivePage();
      if (active && active == node && event.set) {
        const treeNode = this._treeNodeOf(node) as VirtualTreeNode;
        this.vtree.expandAndFocus(treeNode, true);
        if (flag === Node.Flag.Active) this._markActive(treeNode);
        else this.vtree.requestInvalidation();
      }
    } else if (!this._blockHighlight && flag === Node.Flag.Highlighted)
      this.vtree.requestInvalidation();
  }

  private _settingChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._updateLayout();
  }

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
    this.pagesTreeNodeMap = {};
    this.pagesTreeNodeMapByNodes = new Map();
    this._scene = null;
  }
}
