// Old: designer.browser.dev.js module 1711 ($.fn.gSelectedPanel).
/**
 * The list of the touch context menu's "Select" overlay: the elements
 * under the pressed point as layer rows (a row with its sub entries when
 * the hit has a submenu). A click on a row calls back with its element.
 */
import { Node } from "../../engine/scene/node.ts";
import { Util } from "../../engine/core/util.ts";
import { buildLayerItemContainer, getLayerOrItemStatus } from "./layer-item.ts";
import type { VirtualRow } from "./virtual-list.ts";
import {
  VirtualTree,
  VirtualTreeNodeNamed,
  type TreeDropEvent,
  type VirtualTreeNode,
} from "./virtual-tree.ts";

/** One hit of the touch context menu. */
export interface SelectionHit {
  element: Node;
}

/** What setSelections takes: the hits, the filtered ones listed, and sub entries per row. */
export interface Selections {
  elementHits: SelectionHit[];
  filteredElementHits: SelectionHit[];
  submenus: Record<string, Node[] | undefined>;
}

export interface SelectedPanelOptions {
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
  toggleRenderer: ((element: HTMLElement) => void) | null;
  separatorRenderer: ((element: HTMLElement, level: number) => void) | null;
  canDropCallback: () => boolean;
  moveCallback: null;
  isDuplicateEffectCallback: ((event: TreeDropEvent) => boolean) | null;
  duplicateCallback: null;
  clickCallback: ((node: Node | null) => void) | null;
  startDraggingCallback: null;
  patternChooserStatusChangeCallBack: null;
  bottomHeight: number;
  renderFinishCallback?: (() => void) | null;
}

interface Entry {
  element: HTMLElement | null;
  node: Node;
  treeNode: VirtualTreeNode;
}

export class SelectedPanel {
  readonly element: HTMLElement;
  readonly options: SelectedPanelOptions;
  readonly vtree: VirtualTree;
  layersTreeNodeMap: Record<string, Entry> = {};
  layersTreeNodeMapByNodes = new Map<
    Node,
    { element: HTMLElement | null; treeNode: VirtualTreeNode; treeId: string }
  >();
  selections: Selections | null = null;
  currentFocus: VirtualTreeNode | null = null;

  /** `$(el).gSelectedPanel(options)`. */
  constructor(element: HTMLElement, options: Partial<SelectedPanelOptions> = {}) {
    this.element = element;
    this.options = {
      nodeStyle: "selected-row",
      expandStyle: "selected-arrow gravit-icon-right",
      collapseStyle: "selected-arrow gravit-icon-down",
      freeHeight: 0,
      insertIntoStyle: "g-drop",
      upSeparatorSpan1Style: "g-up-separator-span1",
      upSeparatorSpan2Style: "g-up-separator-span2",
      downSeparatorSpan1Style: "g-down-separator-span1",
      downSeparatorSpan2Style: "g-down-separator-span2",
      renderer: (id, expanded, row) => this._renderRow(id, expanded, row),
      toggleRenderer: (arrow) => this._toggleRenderer(arrow),
      separatorRenderer: null,
      canDropCallback: () => false,
      moveCallback: null,
      isDuplicateEffectCallback: null,
      duplicateCallback: null,
      clickCallback: null,
      startDraggingCallback: null,
      patternChooserStatusChangeCallBack: null,
      bottomHeight: 3,
      ...options,
    };
    const o = this.options;
    element.classList.add("g-selected-panel");
    this.vtree = new VirtualTree(
      element,
      (node, row) => this._treeRender(node, row),
      o.nodeStyle,
      o.toggleRenderer ? o.toggleRenderer : null,
      o.expandStyle == o.collapseStyle ? o.expandStyle : null,
      o.separatorRenderer ? o.separatorRenderer : null,
      o.freeHeight,
      o.insertIntoStyle,
      () => false,
      null,
      o.isDuplicateEffectCallback,
      null,
      (node) => this._click(node),
      (node) => this._expand(node),
      o.upSeparatorSpan1Style,
      o.upSeparatorSpan2Style,
      o.downSeparatorSpan1Style,
      o.downSeparatorSpan2Style,
      false,
      15,
      21,
      o.bottomHeight,
      o.renderFinishCallback,
    );
  }

  refresh(): void {
    this.vtree.refresh();
  }

  relayout(): void {
    this.vtree.requestInvalidation();
  }

  /** `gSelectedPanel("setSelections", s)`; without an argument returns them. */
  setSelections(...args: [Selections] | []): Selections | null | this {
    if (!args.length) return this.selections;
    const selections = args[0];
    if (selections !== this.selections) {
      this._clear();
      this.selections = selections;
      this._fill();
    }
    return this;
  }

  private _click(treeNode: VirtualTreeNode): void {
    if (this.options.clickCallback)
      this.options.clickCallback(this._itemById((treeNode as VirtualTreeNodeNamed).id));
    this.vtree.requestInvalidation();
  }

  private _expand(treeNode: VirtualTreeNode): void {
    const node = this._itemById((treeNode as VirtualTreeNodeNamed).id);
    if (node) {
      if (treeNode.expanded) node.setFlag(Node.Flag.Expanded as number);
      else node.removeFlag(Node.Flag.Expanded as number);
    }
  }

  private _treeRender(treeNode: VirtualTreeNode, row: VirtualRow): void {
    if (this.options.renderer)
      this.options.renderer(
        (treeNode as VirtualTreeNodeNamed).id as string,
        treeNode.expanded,
        row,
      );
  }

  private _toggleRenderer(arrow: HTMLElement): void {
    const style =
      arrow.id === VirtualTree.COLLAPSE_ID
        ? this.options.collapseStyle
        : arrow.id === VirtualTree.EXPAND_ID
          ? this.options.expandStyle
          : null;
    if (style) arrow.classList.add(...style.split(/\s+/).filter(Boolean));
  }

  private _itemById(id: string | null | undefined): Node | null {
    const entry = id ? this.layersTreeNodeMap[id] : undefined;
    return entry ? entry.node : null;
  }

  private _renderRow(id: string, expanded: boolean | undefined, row: VirtualRow): void {
    const entry = this.layersTreeNodeMap[id];
    const node = entry ? entry.node : null;
    if (node && entry) {
      const { hasSelection } = getLayerOrItemStatus(node);
      const { titleGroup } = buildLayerItemContainer(row, node, hasSelection, expanded);
      entry.element = titleGroup;
    }
  }

  private _appendTreeNode(
    id: string,
    parent: VirtualTreeNode | null,
    expanded: boolean,
  ): VirtualTreeNode {
    const treeNode = new VirtualTreeNodeNamed(id, expanded);
    this.vtree.appendNode(parent, treeNode);
    return treeNode;
  }

  private _fill(): void {
    const vtree = this.vtree;
    vtree.beginUpdate();
    const { elementHits, filteredElementHits, submenus } = this.selections as Selections;
    const remember = (treeNode: VirtualTreeNode, node: Node, id: string): void => {
      this.layersTreeNodeMap[id] = { element: null, node, treeNode };
      this.layersTreeNodeMapByNodes.set(node, { element: null, treeNode, treeId: id });
    };
    for (let i = 0; i < filteredElementHits.length; i++) {
      const id = Util.uuid();
      const hit = filteredElementHits[i] as SelectionHit;
      const element = hit.element;
      // The old code computed the label here and dropped it.
      const key = "temp-" + elementHits.indexOf(hit);
      const subs = submenus[key];
      if (subs) {
        const treeNode = this._appendTreeNode(id, null, true);
        remember(treeNode, element, id);
        for (let j = 0; j < subs.length; j++) {
          const subId = Util.uuid();
          remember(this._appendTreeNode(subId, treeNode, false), subs[j] as Node, subId);
        }
      } else remember(this._appendTreeNode(id, null, false), element, id);
    }
    vtree.endUpdate();
  }

  private _clear(): void {
    this.vtree.clean();
    this.layersTreeNodeMap = {};
    this.layersTreeNodeMapByNodes = new Map();
  }
}
