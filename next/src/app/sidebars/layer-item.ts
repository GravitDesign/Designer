// Old: designer.browser.dev.js module 1351 (the layers panel row builder).
/**
 * What a layers panel row shows for a node: the title group (icon and
 * name), the row's state classes, and the status the lock, visibility and
 * outline buttons read (own and inherited from the parents).
 */
import { VertexPolyBoolean } from "../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { Block } from "../../engine/scene/block.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Element } from "../../engine/scene/element.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Group } from "../../engine/scene/group.ts";
import { Image } from "../../engine/scene/image.ts";
import { Item } from "../../engine/scene/item.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { SimpleShape } from "../../engine/scene/simple-shape.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { Text } from "../../engine/text/text.ts";
import { designer } from "../shell/globals.ts";

/** A scene node as the panels read and change it (GNode with the Properties mixin). */
export type PanelNode = Node & {
  getProperty(name: string, custom?: boolean): unknown;
  setProperty(name: string, value: unknown): boolean;
};

/** A panel node that has children (GNode.Container). */
export type PanelContainerNode = PanelNode & ContainerApi;

/** The status getLayerOrItemStatus reports for a node. */
export interface LayerOrItemStatus {
  parentHidden: boolean;
  parentLockType: string | null;
  parentOutlined: boolean;
  isHidden: boolean;
  lockType: unknown;
  isOutlined: unknown;
  hasSelection: boolean;
}

/** jQuery's toggleClass(name, state) for one element. */
function toggleClass(element: globalThis.Element, name: string, state: boolean): void {
  element.classList.toggle(name, state);
}

/**
 * Builds the title group of a layer row into `row` and sets the row's
 * classes. `expanded` picks the open or closed folder for layers.
 */
export function buildLayerItemContainer(
  row: HTMLElement,
  node: Node,
  hasSelection: boolean,
  expanded: boolean | undefined,
): { container: HTMLElement; title: HTMLElement; titleGroup: HTMLElement } {
  const item = node as PanelNode;
  row.setAttribute("draggable", "false");
  // The old row went through gPro({ pro }) here; the licence is dropped
  // and an element is never pro, so it changed nothing.
  const titleGroup = document.createElement("span");
  titleGroup.classList.add("layer-title-group");
  toggleClass(titleGroup, "g-selected", node.hasFlag(Node.Flag.Selected as number));
  row.appendChild(titleGroup);
  row.addEventListener("mouseenter", () => {
    if (!node.hasFlag(Element.Flag.Hidden as number)) node.setFlag(Node.Flag.Highlighted as number);
  });
  row.addEventListener("mouseleave", () => {
    if (!node.hasFlag(Element.Flag.Hidden as number))
      node.removeFlag(Node.Flag.Highlighted as number);
  });
  let name = item.getProperty("name") as string | null;
  name = name || node.getNodeNameTranslated();
  const title = document.createElement("span");
  // The old code inserted the name as HTML; see "Layer and page names
  // are no longer read as HTML" in BUGS-FIXED.md.
  title.textContent = name;
  title.classList.add("layer-title");
  titleGroup.appendChild(title);
  const isSymbolInstance = (candidate: unknown): boolean =>
    candidate instanceof Symbol && !!candidate.getMasterSymbol();
  if (isSymbolInstance(node) || node.findParent(isSymbolInstance))
    row.classList.add("g-symbol-row");
  toggleClass(row, "g-active", node.hasFlag(Node.Flag.Active as number));
  toggleClass(row, "g-has-selection", hasSelection);
  toggleClass(row, "g-selected", node.hasFlag(Node.Flag.Selected as number));
  const { icon, overlayIcon } = getIconByLayerType(node, expanded);
  let iconElement: HTMLElement | null = null;
  if (icon) {
    if ("<svg" === icon.substr(0, 4)) {
      iconElement = document.createElement("span");
      iconElement.classList.add("layer-icon");
      const holder = document.createElement("div");
      holder.innerHTML = icon;
      const svg = holder.firstElementChild as SVGElement | null;
      if (svg) {
        svg.classList.add("layer-icon");
        svg.setAttribute("width", "16px");
        svg.setAttribute("height", "16px");
        svg.style.verticalAlign = "middle";
        svg.style.paddingLeft = "1px";
        svg.style.opacity = "initial";
        iconElement.appendChild(svg);
      }
      titleGroup.insertBefore(iconElement, title);
    } else {
      let className = icon;
      if (designer().isTouchEnabled()) className += "-small";
      iconElement = document.createElement("span");
      iconElement.classList.add("layer-icon", ...className.split(/\s+/).filter(Boolean));
      iconElement.style.opacity = "initial";
      titleGroup.insertBefore(iconElement, title);
    }
  }
  if (overlayIcon && iconElement) iconElement.appendChild(overlayIcon);
  return { container: row, title, titleGroup };
}

/** The icon class of a row (or an svg string from a simple shape) and a fake text's overlay. */
export function getIconByLayerType(
  node: Node,
  expanded: boolean | undefined,
): { icon: string | null; overlayIcon: HTMLElement | null } {
  let icon: string | null = null;
  let overlayIcon: HTMLElement | null = null;
  if (node instanceof Layer) icon = expanded ? "gravit-icon-folderopen" : "gravit-icon-folderclose";
  else if (node instanceof Slice) icon = "gravit-icon-slice";
  else if (node instanceof Group) icon = "gravit-icon-group";
  else if (node instanceof Shape) {
    if (node instanceof PathsGraph) icon = "gravit-icon-pathgraph3";
    else if (node instanceof SimpleShape) icon = node.getIcon();
    else if (node instanceof Text) {
      icon = "gravit-icon-textbox";
      if (node.isFakeText()) {
        overlayIcon = document.createElement("div");
        overlayIcon.classList.add("layer-icon-overlay");
      }
    } else if (node instanceof Image) icon = "gravit-icon-picture";
    else if (node instanceof Ellipse) icon = "gravit-icon-ellipse";
    else if (node instanceof Rectangle) icon = "gravit-icon-rectangle";
    else if (node instanceof Path || node instanceof CompoundPath) icon = "gravit-icon-pen";
    else if (node instanceof Polygon) icon = "gravit-icon-polygon";
    else if (node instanceof CompoundShape) icon = "gravit-icon-merge-union";
  } else if (node instanceof Symbol) {
    icon = "gravit-icon-symbol";
    if (node.isMaster()) icon += "master";
    else if (node.getMasterSymbol()) icon += "instance";
    else icon += "detached";
  }
  if (node instanceof Shape && node.getParent() instanceof CompoundShape && node.getPrevious()) {
    switch ((node as unknown as PanelNode).getProperty("bool")) {
      case VertexPolyBoolean.OR:
        icon = "gravit-icon-merge-union";
        break;
      case VertexPolyBoolean.AND:
        icon = "gravit-icon-merge-intersect";
        break;
      case VertexPolyBoolean.SUB:
        icon = "gravit-icon-merge-subtract";
        break;
      case VertexPolyBoolean.XOR:
        icon = "gravit-icon-merge-difference";
    }
  }
  return { icon, overlayIcon };
}

/**
 * Whether the node or a parent block hides, locks or outlines it, and
 * whether one of its direct item children is selected.
 */
export function getLayerOrItemStatus(node: Node): LayerOrItemStatus {
  let parentHidden = false;
  let parentLockType: string | null = null;
  let parentOutlined = false;
  let parent: Node | null = node;
  while ((parent = parent.getParent()) && !(parent instanceof Scene)) {
    if (parent instanceof Block) {
      const block = parent as unknown as PanelNode;
      parentHidden = false === block.getProperty("vis") || parentHidden;
      const lock = block.getProperty("lkt") as string | null;
      if (lock) {
        if (parentLockType) {
          if (lock === Block.LockType.Full) parentLockType = lock;
        } else parentLockType = lock;
      }
    }
    if (parent instanceof Layer)
      parentOutlined =
        true === (parent as unknown as PanelNode).getProperty("otl") || parentOutlined;
  }
  const item = node as PanelNode;
  const isHidden = parentHidden || false === item.getProperty("vis");
  const lockType = parentLockType || item.getProperty("lkt");
  const isOutlined = parentOutlined || (node instanceof Layer && item.getProperty("otl"));
  let hasSelection = false;
  if (node.hasMixin(Node.Container)) {
    for (
      let child = (node as PanelContainerNode).getFirstChild();
      null !== child && !hasSelection;
      child = child.getNext()
    )
      if (child instanceof Item && child.hasFlag(Node.Flag.Selected as number)) hasSelection = true;
  }
  return {
    parentHidden,
    parentLockType,
    parentOutlined,
    isHidden,
    lockType,
    isOutlined,
    hasSelection,
  };
}
