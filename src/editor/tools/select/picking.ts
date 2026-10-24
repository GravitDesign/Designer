// Old: chunk.vendor.js module 334 (GSelectTool: _getSelectableForPosition,
// _checkSelectedUnderMouse, _getAllHitTestedElems, _getTopMostHit).
/**
 * What a click selects. A hit selects the item at the top of the tree
 * (a page's direct child) unless its group is already selected, in which
 * case it goes one level deeper. Meta (Ctrl) picks the topmost hit
 * itself and then cycles through the stack under the pointer on each
 * click. A press on an already selected element keeps it, so it can be
 * dragged even where another element lies on top.
 */
import { Platform } from "../../../engine/core/platform.ts";
import type { MouseEvent } from "../../../engine/core/mouse-event.ts";
import type { Point } from "../../../engine/math/point.ts";
import type { Element, ElementHit } from "../../../engine/scene/element.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Item } from "../../../engine/scene/item.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import { NodeFlag } from "../../../engine/scene/node-change.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import { EditorOptions } from "../../editor-options.ts";
import { Guides } from "../../guides/guides.ts";
import type { SelectTool } from "../select-tool.ts";
import type { ToolManager } from "../tool-manager.ts";

const modifiers = Platform.modifiers;

/** Meta (Ctrl) without a temporary tool: deep select. */
function isDeepSelect(tool: SelectTool): boolean {
  return modifiers.metaKey && null == (tool._manager as ToolManager).getTemporaryActiveTool();
}

/**
 * The element a press (`onPress`) or release at `position` selects, or
 * null. `rightButton` keeps a selected container under the pointer, as a
 * press does.
 */
export function getSelectableForPosition(
  tool: SelectTool,
  position: Point,
  onPress?: boolean,
  rightButton?: boolean,
): Element | null {
  const selectedHit = tool._checkSelectedUnderMouse(position);
  if (selectedHit && (!tool._clickGoDown || onPress || rightButton)) return selectedHit;
  const deep = isDeepSelect(tool);
  const zones = Guides.options.zones && !deep;
  const acceptor = (element: Element): boolean =>
    !(element instanceof Group || element instanceof Layer) && tool._selectAcceptor(element);
  const hitTest = (annotations: boolean): ElementHit[] | null =>
    tool._scene.hitTest(
      position,
      tool._view.getWorldTransform(tool._scene),
      acceptor,
      deep,
      -1,
      EditorOptions.pickDistance,
      zones,
      tool._selectFilterFunc,
      true,
      false,
      tool._view.getViewConfiguration().multiPageView,
      annotations,
    );
  let hits: ElementHit[] | null;
  // Nothing in the old app sets Mixed mode (setInteractionMode is never
  // called); kept for API parity.
  if (tool._interactionMode === (tool.constructor as typeof SelectTool).InteractionMode.Mixed) {
    hits = hitTest(false);
    if (!(hits && hits.length)) hits = hitTest(true);
  } else {
    hits = hitTest(tool._view.getViewConfiguration().isElementAnnotationsVisible());
  }
  let result: Element | null = null;
  let candidates: Element[] | null = null;
  // With overlapping pages (the default) the multi-page hit test returns
  // the bare page under the point when no element is hit; that is what
  // this checks, not a hit whose element is a page.
  if (hits && !((hits[0] as unknown) instanceof Page)) {
    const elements: Element[] = [];
    for (let i = 0; i < hits.length; ++i) elements.push((hits[i] as ElementHit).element);
    candidates = tool._getSelectableElements(elements, true);
  }
  if (!candidates || !candidates.length) return null;
  if (deep && candidates.length > 0) {
    // The one after the selected candidate, from the top again past the end.
    let selectedIndex: number | null = null;
    for (let i = 0; i < candidates.length; ++i) {
      if ((candidates[i] as Element).hasFlag(NodeFlag.Selected)) selectedIndex = i;
    }
    result =
      null == selectedIndex || selectedIndex + 1 >= candidates.length
        ? (candidates[0] as Element)
        : (candidates[selectedIndex + 1] as Element);
  } else if (candidates.length > 0) {
    if (tool._clickGoDown) result = goDown(candidates[0] as Element, !!onPress, !!rightButton);
    else result = candidates[0] as Element;
  }
  return result;
}

/** No selected item among the container's children. */
// The caller checked the Container mixin, which doesn't narrow the type.
const hasNoSelectedItemChild = (container: Node): boolean =>
  (
    container as unknown as {
      acceptChildren(v: (n: Node) => boolean, a: boolean, b: boolean): boolean;
    }
  ).acceptChildren(
    (node) => !(node instanceof Item && node.hasFlag(NodeFlag.Selected)),
    false,
    false,
  );

/**
 * From the topmost hit `hit`, the element a click selects: the hit if it
 * or its container is selected (or a sibling is), else the outermost
 * unselected item container above it.
 */
function goDown(hit: Element, onPress: boolean, rightButton: boolean): Element {
  let candidate: Element = hit;
  let result: Element | null = null;
  if (candidate.hasFlag(NodeFlag.Selected)) result = candidate;
  else if (EditorOptions.visualGroupSelect) {
    if (candidate instanceof Layer || candidate instanceof Page) result = candidate;
    else {
      let outermost: Element | null = null;
      for (
        let parent = candidate.getParent();
        null != parent && !result;
        parent = parent.getParent()
      ) {
        if (parent.hasFlag(NodeFlag.Selected)) result = candidate;
        else if (!hasNoSelectedItemChild(parent) && parent instanceof Item) result = candidate;
        else if (parent instanceof Item) outermost = parent;
      }
      if (!result && outermost) result = outermost;
    }
  } else {
    for (
      let parent = candidate.getParent();
      null != parent && !result;
      parent = parent.getParent()
    ) {
      if (parent.hasFlag(NodeFlag.Selected)) {
        if ((rightButton || onPress) && parent instanceof Item) result = parent;
        if (!onPress && !rightButton) result = candidate;
      }
      if (!result) {
        if (!hasNoSelectedItemChild(parent)) result = candidate;
        if (
          !result &&
          !parent.hasFlag(NodeFlag.Selected) &&
          parent instanceof Item &&
          !parent.getProperty("clk")
        ) {
          candidate = parent;
        }
      }
    }
  }
  if (!result) result = candidate;
  return result;
}

/**
 * The topmost selected page under `position`, or null. Only pages
 * qualify (and only without pageCollisionTransform); the hit test runs
 * exact first, then with the pick distance.
 */
export function checkSelectedUnderMouse(tool: SelectTool, position: Point): Element | null {
  const deep = isDeepSelect(tool);
  const toggle = modifiers.shiftKey && !tool._shiftConstraining;
  const selection = tool._editor.getSelection();
  if (!tool._selectionDone && !deep && !toggle && selection && selection.length) {
    const hitTest = (tolerance: number): ElementHit[] | null =>
      tool._scene.hitTest(
        position,
        tool._view.getWorldTransform(tool._scene),
        tool._selectAcceptorFunc,
        true,
        -1,
        tolerance,
        true,
        tool._selectFilterFunc,
        true,
        false,
        tool._view.getViewConfiguration().multiPageView,
        tool._view.getViewConfiguration().isElementAnnotationsVisible(),
      );
    let hits = hitTest(0);
    if (!(hits && hits.length)) hits = hitTest(EditorOptions.pickDistance);
    if (hits) {
      let pages: Element[] = [];
      for (let i = 0; i < hits.length; ++i) {
        const hit = hits[i] as ElementHit & Element;
        const element = (
          EditorOptions.pageCollisionTransform ? hit.element : hit.element || hit
        ) as Element;
        if (
          element.hasFlag(NodeFlag.Selected) &&
          !EditorOptions.pageCollisionTransform &&
          element instanceof Page
        ) {
          pages.push(element);
        }
      }
      if (pages.length) {
        pages = Node.order(pages) as Element[];
        return pages[pages.length - 1] as Element;
      }
    }
  }
  return null;
}

/** The selectable element of every hit under `position` (X held: these are skipped by the marquee). */
export function getAllHitTestedElems(tool: SelectTool, position: Point): (Element | null)[] {
  const acceptor = (element: Element): boolean =>
    !(element instanceof Group || element instanceof Layer) && tool._selectAcceptor(element);
  const worldTransform = tool._view.getWorldTransform(tool._scene);
  const config = tool._view.getViewConfiguration();
  const annotations = config.isElementAnnotationsVisible();
  const hitTest = (tolerance: number): ElementHit[] | null =>
    tool._scene.hitTest(
      position,
      worldTransform,
      acceptor,
      true,
      -1,
      tolerance,
      false,
      tool._selectFilterFunc,
      true,
      true,
      config.multiPageView,
      annotations,
    );
  let hits = hitTest(0);
  if (!(hits && hits.length)) hits = hitTest(EditorOptions.pickDistance);
  let result: (Element | null)[] = [];
  if (hits && hits.length) {
    result = hits.map((hit) => tool._getSelectableElement(hit.element, true));
  }
  return result;
}

/**
 * The selectable element of the topmost hit under the event's position.
 * Unused in the old app, kept for API parity.
 */
export function getTopMostHit(
  tool: SelectTool,
  event: MouseEvent,
  keepGroups?: boolean,
  stacked?: boolean,
): Element | null {
  const acceptor = keepGroups
    ? tool._selectAcceptorFunc
    : (element: Element): boolean => !(element instanceof Group) && tool._selectAcceptor(element);
  const hitTest = (tolerance: number): ElementHit[] | null =>
    tool._scene.hitTest(
      event.client,
      tool._view.getWorldTransform(tool._scene),
      acceptor,
      !!stacked,
      -1,
      tolerance,
      false,
      tool._selectFilterFunc,
      true,
      !!stacked,
      tool._view.getViewConfiguration().multiPageView,
      tool._view.getViewConfiguration().isElementAnnotationsVisible(),
    );
  let hits = hitTest(0);
  if (!(hits && hits.length)) hits = hitTest(EditorOptions.pickDistance);
  let result: Element | null = null;
  if (hits && hits.length) {
    for (let i = 0; i < hits.length && !result; ++i) {
      result = tool._getSelectableElement((hits[i] as ElementHit).element, true);
    }
  }
  return result;
}
