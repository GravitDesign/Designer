import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classHeights,
  installTreeDom,
  testElement,
  TestEvent,
  type TestElement,
} from "./testing/tree-dom.testing.ts";
import { setDesigner } from "../shell/globals.ts";
import {
  AutoScroll,
  VirtualTree,
  VirtualTreeNode,
  VirtualTreeNodeNamed,
  type TreeDropEvent,
} from "./virtual-tree.ts";

let dom: ReturnType<typeof installTreeDom>;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["test-row"] = 34;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  dom.uninstall();
  delete classHeights["test-row"];
});

function makeTree(options: { putLast?: boolean; drop?: (...args: unknown[]) => void } = {}) {
  const container = dom.document.createElement("div");
  container.box = { x: 0, y: 0, width: 249, height: 600 };
  dom.document.body.appendChild(container);
  const rendered: string[] = [];
  const drops: unknown[][] = [];
  const tree = new VirtualTree(
    container as unknown as HTMLElement,
    (node, row) => {
      const id = (node as VirtualTreeNodeNamed).id as string;
      rendered.push(id);
      row.appendChild(document.createElement("span")).textContent = id;
    },
    "test-row",
    null,
    null,
    null,
    7,
    "g-drop",
    () => true,
    (...args) => {
      drops.push(args.map((a) => (Array.isArray(a) ? a.map(name) : name(a))));
      if (options.drop) options.drop(...args);
    },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    options.putLast,
    15,
    21,
  );
  return { tree, container, rendered, drops };
}

function name(node: unknown): string | null {
  if (!node) return null;
  return (node as VirtualTreeNodeNamed).id ?? "<root>";
}

function rows(container: TestElement): TestElement[] {
  return container.children.filter(
    (child) => child.id === VirtualTree.ROW_ID && child.style.display !== "none",
  );
}

describe("GVirtualTreeNode", () => {
  it("counts nesting from the root and walks focusable nodes with wrap-around", () => {
    const { tree } = makeTree();
    const a = new VirtualTreeNodeNamed("a");
    const b = new VirtualTreeNodeNamed("b", true);
    const b1 = new VirtualTreeNodeNamed("b1");
    const b2 = new VirtualTreeNodeNamed("b2");
    tree.appendNode(null, a);
    tree.appendNode(null, b);
    tree.appendNode(b, b1);
    tree.appendNode(b, b2);
    // The wrap-around looks at whether the parent has a row: render first.
    tree.requestInvalidation(true);
    expect(a.getNestLevel()).toBe(1);
    expect(b2.getNestLevel()).toBe(2);
    expect(a.getNextFocusableNode()).toBe(b);
    expect(b.getNextFocusableNode()).toBe(b1);
    // The last child of an expanded parent with no next sibling: first top-level node.
    expect(b2.getNextFocusableNode()).toBe(a);
    expect(b1.getPreviousFocusableNode()).toBe(b);
    expect(a.getPreviousFocusableNode()).toBe(b2);
    expect(b.getNodeCount()).toBe(3);
  });

  it("collapses on the collapse arrow and expands on the expand arrow", () => {
    const node = new VirtualTreeNode();
    node.expanded = true;
    node.handleExpand({ target: { id: VirtualTree.COLLAPSE_ID } });
    expect(node.expanded).toBe(false);
    node.handleExpand({ target: { id: VirtualTree.COLLAPSE_ID } });
    expect(node.expanded).toBe(false);
    node.handleExpand({ target: { id: VirtualTree.EXPAND_ID } });
    expect(node.expanded).toBe(true);
  });
});

describe("GVirtualTree", () => {
  it("measures the row height from the row class", () => {
    const { tree } = makeTree();
    expect(tree._rowHeight).toBe(34);
  });

  it("renders visible rows with the old ids, classes, offsets and the drop zone", () => {
    const { tree, container } = makeTree();
    const a = new VirtualTreeNodeNamed("a");
    const g = new VirtualTreeNodeNamed("g", true);
    tree.appendNode(null, a);
    tree.appendNode(null, g);
    tree.appendNode(g, new VirtualTreeNodeNamed("g1"));
    tree.requestInvalidation(true);
    const shown = rows(container);
    expect(shown.map((row) => row.textContent)).toEqual(["a", "▼g", "g1"]);
    expect(shown.map((row) => row.style.top)).toEqual(["0px", "34px", "68px"]);
    expect(shown.map((row) => row.style.paddingLeft)).toEqual(["15px", "15px", "36px"]);
    expect(shown[1]?.children[0]?.id).toBe(VirtualTree.COLLAPSE_ID);
    expect(shown[0]?.getAttribute("draggable")).toBe("true");
    expect(shown[0]?.className).toBe("test-row");
    const scroller = container.children[0] as TestElement;
    expect(scroller.className).toBe("vscroller");
    expect(scroller.style.height).toBe(3 * 34 + 7 + "px");
    const zone = container.children[container.children.length - 1] as TestElement;
    expect(zone.style.cssText).toBe("position: absolute; height: 7px; top: 102px; width: 249px;");
  });

  it("hides the rows of a collapsed parent", () => {
    const { tree, container } = makeTree();
    const g = new VirtualTreeNodeNamed("g", true);
    tree.appendNode(null, g);
    tree.appendNode(g, new VirtualTreeNodeNamed("g1"));
    tree.requestInvalidation(true);
    const arrow = rows(container)[0]?.children[0] as TestElement;
    arrow.dispatchEvent(new TestEvent("click"));
    expect(g.expanded).toBe(false);
    expect(rows(container).map((row) => row.textContent)).toEqual(["►g"]);
  });

  it("keeps counts in step through insert and remove, and collapses an emptied parent", () => {
    const { tree } = makeTree();
    const g = new VirtualTreeNodeNamed("g", true);
    const g1 = new VirtualTreeNodeNamed("g1");
    tree.appendNode(null, g);
    tree.appendNode(g, g1);
    tree.prependNode(null, new VirtualTreeNodeNamed("first"));
    expect(tree._nodeCount).toBe(3);
    expect(tree._rowCount).toBe(3);
    tree.removeNode(g1);
    expect(tree._nodeCount).toBe(2);
    expect(g.expanded).toBe(false);
    expect(g.firstChild).toBeNull();
  });

  it("expands the parents of a focused node", () => {
    const { tree } = makeTree();
    const g = new VirtualTreeNodeNamed("g");
    const inner = new VirtualTreeNodeNamed("inner");
    const leaf = new VirtualTreeNodeNamed("leaf");
    tree.appendNode(null, g);
    tree.appendNode(g, inner);
    tree.appendNode(inner, leaf);
    expect(tree.expandAndFocus(leaf)).toBe(true);
    expect(g.expanded).toBe(true);
    expect(inner.expanded).toBe(true);
  });

  it("drops a dragged row above another and reports parent, next and previous", () => {
    const { tree, container, drops } = makeTree();
    const a = new VirtualTreeNodeNamed("a");
    const b = new VirtualTreeNodeNamed("b");
    const c = new VirtualTreeNodeNamed("c");
    for (const node of [a, b, c]) tree.appendNode(null, node);
    tree.requestInvalidation(true);
    tree.setDragNodes([c]);
    const rowA = rows(container)[0] as TestElement;
    // A drop in the top 7px of row a puts c before a.
    tree._nodeDrop(a, {
      layerY: 3,
      currentTarget: rowA,
      target: rowA,
      preventDefault() {},
      stopPropagation() {},
    } as unknown as TreeDropEvent);
    expect(drops).toEqual([["<root>", "a", null, ["c"]]]);
    expect(
      [tree._root.firstChild, tree._root.firstChild?.next, tree._root.lastChild].map(name),
    ).toEqual(["c", "a", "b"]);
  });

  it("drops below a row near its bottom edge, and into it in the middle", () => {
    const { tree, container, drops } = makeTree();
    const a = new VirtualTreeNodeNamed("a");
    const b = new VirtualTreeNodeNamed("b");
    const c = new VirtualTreeNodeNamed("c");
    for (const node of [a, b, c]) tree.appendNode(null, node);
    tree.requestInvalidation(true);
    const rowA = rows(container)[0] as TestElement;
    const event = (layerY: number) =>
      ({
        layerY,
        currentTarget: rowA,
        target: rowA,
        preventDefault() {},
        stopPropagation() {},
      }) as unknown as TreeDropEvent;
    tree.setDragNodes([c]);
    tree._nodeDrop(a, event(30));
    expect(drops[0]).toEqual(["<root>", "b", "a", ["c"]]);
    expect(a.next).toBe(c);
    tree.setDragNodes([b]);
    tree._nodeDrop(a, event(17));
    // Into a: prepended (putLastChildWhenInside is off), reported with a as parent.
    expect(drops[1]).toEqual(["a", null, null, ["b"]]);
    expect(a.firstChild).toBe(b);
  });

  it("refuses to drop a node onto itself or into its own child", () => {
    const { tree } = makeTree();
    const g = new VirtualTreeNodeNamed("g", true);
    const g1 = new VirtualTreeNodeNamed("g1");
    tree.appendNode(null, g);
    tree.appendNode(g, g1);
    tree.setDragNodes([g]);
    expect(tree._dropHereAllowed(g)).toBe(false);
    expect(tree._dropHereAllowed(g1)).toBe(false);
    expect(tree._dropHereAllowed(tree._root)).toBe(true);
  });

  it("keeps a row height set as a string, as the panels pass it", () => {
    const { tree } = makeTree();
    tree.resetRowHeight("48");
    tree.setDragNodes([new VirtualTreeNodeNamed("x")]);
    const node = new VirtualTreeNodeNamed("n");
    tree.appendNode(null, node);
    // "48" - 7 = 41: the lower drop zone starts there.
    expect(tree._dropLowerAllowed(node, 41, null)).toBe(true);
    expect(tree._dropLowerAllowed(node, 40, null)).toBe(false);
  });

  it("uses the base list's row element", () => {
    const { container } = makeTree();
    expect(testElement(container).classList.contains("g-virtual-list")).toBe(true);
    expect(testElement(container).className).toBe("g-virtual-list g-virtual-tree");
  });
});

describe("GVirtualTree first render", () => {
  it("renders 25 ms after construction, sets the scroller height and calls renderFinishCallback", () => {
    const container = dom.document.createElement("div");
    container.box = { x: 0, y: 0, width: 249, height: 600 };
    dom.document.body.appendChild(container);
    let finished = 0;
    const tree = new VirtualTree(
      container as unknown as HTMLElement,
      () => {},
      "test-row",
      null,
      null,
      null,
      9,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      false,
      15,
      21,
      0,
      () => finished++,
    );
    const scroller = container.children[0] as TestElement;
    // The list constructor's _updateScroller sees the prototype's free height 0.
    expect(scroller.style.height).toBe("0px");
    expect(finished).toBe(0);
    expect(tree._invalidationRequestTimerId).not.toBeNull();
    vi.advanceTimersByTime(25);
    expect(finished).toBe(1);
    expect(scroller.style.height).toBe("9px");
    expect(tree._invalidationRequestTimerId).toBeNull();
  });
});

describe("GVirtualTree animated drag", () => {
  let dragging: boolean[];

  beforeEach(() => {
    dragging = [];
    setDesigner({
      isTouchEnabled: () => false,
      setItemDraggingState: (state: boolean) => dragging.push(state),
    } as never);
  });

  afterEach(() => setDesigner(null));

  function animatedTree() {
    const made = makeTree();
    const nodes = ["a", "b", "c"].map((id) => new VirtualTreeNodeNamed(id));
    for (const node of nodes) made.tree.appendNode(null, node);
    made.tree.setAnimatedDragEnabled(true);
    nodes.forEach((node, i) => {
      (node.row as unknown as TestElement).box = { x: 0, y: i * 34, width: 249, height: 34 };
    });
    return {
      ...made,
      nodes: nodes as [VirtualTreeNodeNamed, VirtualTreeNodeNamed, VirtualTreeNodeNamed],
    };
  }

  function startDrag(tree: VirtualTree, node: VirtualTreeNode, clientY: number) {
    const row = node.row as unknown as TestElement;
    row.dispatchEvent(new TestEvent("draginit", { clientX: 10, clientY }));
    row.dispatchEvent(new TestEvent("dragstart", { clientX: 10, clientY }));
    const helper = tree._dragAndDropHelper as NonNullable<typeof tree._dragAndDropHelper>;
    const calls: string[] = [];
    vi.spyOn(helper, "setDroppableNodeUpper").mockImplementation((n) => {
      calls.push("upper " + name(n));
    });
    vi.spyOn(helper, "setDroppableNodeLower").mockImplementation((n) => {
      calls.push("lower " + name(n));
    });
    vi.spyOn(helper, "setDroppableNodeInside").mockImplementation((n) => {
      if (n) calls.push("inside " + name(n));
    });
    return calls;
  }

  function drag(clientY: number) {
    dom.document.dispatchEvent(new TestEvent("drag", { clientX: 10, clientY }));
  }

  it("marks rows as drag rows and adds no drop listeners or free zone", () => {
    const { tree, container, nodes } = animatedTree();
    const row = nodes[0].row as unknown as TestElement;
    expect(row.classList.contains("g-drag-vrow")).toBe(true);
    expect(row.listenerCount("dragenter")).toBe(0);
    expect(row.listenerCount("drop")).toBe(0);
    expect(tree._freeZone).toBeNull();
    tree.setAnimatedDragEnabled(false);
    const fresh = rows(container)[0] as TestElement;
    expect(fresh.classList.contains("g-drag-vrow")).toBe(false);
    expect(fresh.listenerCount("dragenter")).toBe(1);
  });

  it("reuses the row elements while dragging, without a second click listener", () => {
    const { tree, nodes } = animatedTree();
    const row = nodes[2].row as unknown as TestElement;
    startDrag(tree, nodes[2], 78);
    expect(nodes[2].row).toBe(row);
    expect(row.listenerCount("click")).toBe(1);
    expect(row.classList.contains("g-dragging")).toBe(true);
    expect(row.classList.contains("g-drag-mouse")).toBe(false);
    expect(dragging).toEqual([]);
  });

  it("with one hit moves below it when going down near its top, into it further away", () => {
    const { tree, nodes } = animatedTree();
    const calls = startDrag(tree, nodes[0], 10);
    // Box top 24, one hit, b: |-10| > 7, inside b (Math.abs on the way down).
    drag(34);
    // Box top 30 (4px above b's top): |-4| <= 7, lower b.
    drag(40);
    expect(calls).toEqual(["inside b", "lower b"]);
  });

  it("with one hit going up, a negative offset moves above it (no Math.abs on the way up)", () => {
    const { tree, nodes } = animatedTree();
    const calls = startDrag(tree, nodes[1], 44);
    // Box top -10 over a only: -10 > 7 is false, upper a.
    drag(0);
    expect(calls).toEqual(["upper a"]);
  });

  it("with two hits takes the second going down and the first going up", () => {
    const { tree, nodes } = animatedTree();
    const calls = startDrag(tree, nodes[0], 10);
    // Box 50..84 hits b and c; down: c with offset -18, inside c.
    drag(60);
    expect(calls).toEqual(["inside c"]);
    calls.length = 0;
    // Up to box 44..78, which hits b and c: the first, b, offset 10, inside b.
    drag(54);
    expect(calls).toEqual(["inside b"]);
  });

  it("ignores a drag event without vertical movement", () => {
    const { tree, nodes } = animatedTree();
    const calls = startDrag(tree, nodes[0], 10);
    drag(10);
    expect(calls).toEqual([]);
    expect(tree._dragLastPt).toBeNull();
  });

  it("drops on dragend and reports the new place to the drop callback", () => {
    const { tree, nodes, drops } = animatedTree();
    const row = nodes[1].row as unknown as TestElement;
    row.dispatchEvent(new TestEvent("draginit", { clientX: 10, clientY: 44 }));
    row.dispatchEvent(new TestEvent("dragstart", { clientX: 10, clientY: 44 }));
    drag(0);
    expect([tree._root.firstChild, tree._root.firstChild?.next].map(name)).toEqual(["b", "a"]);
    (nodes[1].row as unknown as TestElement).dispatchEvent(new TestEvent("dragend"));
    expect(drops).toEqual([["<root>", "a", null, ["b"]]]);
    expect(dragging).toEqual([false]);
    expect(tree._dragNode).toBeNull();
    expect(tree._dragAndDropHelper).toBeNull();
    expect(nodes[1].dragging).toBe(false);
  });
});

describe("GVirtualTree drop branches", () => {
  beforeEach(() => {
    setDesigner({ isTouchEnabled: () => false, setItemDraggingState() {} } as never);
  });

  afterEach(() => setDesigner(null));

  function dropEvent(row: unknown, layerY: number): TreeDropEvent {
    return {
      layerY,
      currentTarget: row,
      target: row,
      preventDefault() {},
      stopPropagation() {},
    } as unknown as TreeDropEvent;
  }

  function threeRows(options: Parameters<typeof makeTree>[0] = {}) {
    const made = makeTree(options);
    const nodes = ["a", "b", "c"].map((id) => new VirtualTreeNodeNamed(id));
    for (const node of nodes) made.tree.appendNode(null, node);
    made.tree.requestInvalidation(true);
    return {
      ...made,
      nodes: nodes as [VirtualTreeNodeNamed, VirtualTreeNodeNamed, VirtualTreeNodeNamed],
    };
  }

  function makeDuplicateTree(duplicates: unknown[][]) {
    const container = dom.document.createElement("div");
    container.box = { x: 0, y: 0, width: 249, height: 600 };
    dom.document.body.appendChild(container);
    const drops: unknown[][] = [];
    const record =
      (into: unknown[][]) =>
      (...args: unknown[]) =>
        into.push(args.map((a) => (Array.isArray(a) ? a.map(name) : name(a))));
    const tree = new VirtualTree(
      container as unknown as HTMLElement,
      () => {},
      "test-row",
      null,
      null,
      null,
      7,
      "g-drop",
      () => true,
      record(drops),
      () => true,
      record(duplicates),
    );
    const nodes = ["a", "b", "c"].map((id) => new VirtualTreeNodeNamed(id));
    for (const node of nodes) tree.appendNode(null, node);
    tree.requestInvalidation(true);
    return {
      tree,
      container,
      drops,
      nodes: nodes as [VirtualTreeNodeNamed, VirtualTreeNodeNamed, VirtualTreeNodeNamed],
    };
  }

  it("appends a drop on the free zone to the root, reporting the last child as previous", () => {
    const { tree, nodes, drops } = threeRows();
    tree.setDragNodes([nodes[0]]);
    tree._nodeDrop(tree._root, dropEvent(tree._freeZone, 3));
    expect(drops).toEqual([["<root>", null, "c", ["a"]]]);
    expect(tree._root.lastChild).toBe(nodes[0]);
  });

  it("hands a duplicating drop to the duplicate callback and leaves the tree alone", () => {
    const duplicates: unknown[][] = [];
    const { tree, container, nodes, drops } = makeDuplicateTree(duplicates);
    const rowA = rows(container)[0];
    tree.setDragNodes([nodes[2]]);
    tree._nodeDrop(nodes[0], dropEvent(rowA, 3));
    tree.setDragNodes([nodes[2]]);
    tree._nodeDrop(nodes[0], dropEvent(rowA, 30));
    tree.setDragNodes([nodes[2]]);
    tree._nodeDrop(nodes[0], dropEvent(rowA, 17));
    tree.setDragNodes([nodes[0]]);
    tree._nodeDrop(tree._root, dropEvent(tree._freeZone, 3));
    expect(duplicates).toEqual([
      ["<root>", "a", null, ["c"]],
      ["<root>", "b", "a", ["c"]],
      ["a", null, null, ["c"]],
      ["<root>", null, "c", ["a"]],
    ]);
    expect(drops).toEqual([]);
    expect([tree._root.firstChild, tree._root.lastChild].map(name)).toEqual(["a", "c"]);
  });

  it("appends a drop into a node after its children with putLastChildWhenInside", () => {
    const { tree, container, nodes, drops } = threeRows({ putLast: true });
    const child = new VirtualTreeNodeNamed("a1");
    tree.appendNode(nodes[0], child);
    nodes[0].expanded = false;
    tree.requestInvalidation(true);
    tree.setDragNodes([nodes[2]]);
    tree._nodeDrop(nodes[0], dropEvent(rows(container)[0], 17));
    // Only a free-zone drop reports the last child as previous.
    expect(drops).toEqual([["a", null, null, ["c"]]]);
    expect(nodes[0].lastChild).toBe(nodes[2]);
    expect(nodes[0].firstChild).toBe(child);
  });

  it("keeps the insert-into style until the last of nested dragleaves", () => {
    const { tree, container, nodes } = threeRows();
    tree.setDragNodes([nodes[2]]);
    const rowA = rows(container)[0] as TestElement;
    rowA.dispatchEvent(new TestEvent("dragenter", { layerY: 17 }));
    vi.advanceTimersByTime(10);
    rowA.dispatchEvent(new TestEvent("dragenter", { layerY: 17 }));
    vi.advanceTimersByTime(10);
    expect(rowA.classList.contains("g-drop")).toBe(true);
    expect((rowA as unknown as { _specCounter: number })._specCounter).toBe(2);
    rowA.dispatchEvent(new TestEvent("dragleave", { layerY: 17 }));
    expect(rowA.classList.contains("g-drop")).toBe(true);
    rowA.dispatchEvent(new TestEvent("dragleave", { layerY: 17 }));
    expect(rowA.classList.contains("g-drop")).toBe(false);
    expect((rowA as unknown as { _specCounter: number })._specCounter).toBe(0);
  });

  it("updates the marks 10 ms after dragover, and a later dragover replaces the pending one", () => {
    const { tree, container, nodes } = threeRows();
    tree.setDragNodes([nodes[2]]);
    const rowA = rows(container)[0] as TestElement;
    rowA.dispatchEvent(new TestEvent("dragover", { layerY: 17 }));
    vi.advanceTimersByTime(9);
    expect(rowA.classList.contains("g-drop")).toBe(false);
    rowA.dispatchEvent(new TestEvent("dragover", { layerY: 3 }));
    vi.advanceTimersByTime(9);
    expect(rowA.children[0]?.id).not.toBe(VirtualTree.UPPER_SEP_ID);
    vi.advanceTimersByTime(1);
    // Only the second (upper) one ran: a separator, no insert-into style.
    expect(rowA.classList.contains("g-drop")).toBe(false);
    expect(rowA.children[0]?.id).toBe(VirtualTree.UPPER_SEP_ID);
  });
});

describe("GVirtualTree AutoScroll", () => {
  function fakeElement(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      offsetWidth: 200,
      offsetHeight: 100,
      scrollTop: 0,
      scrollLeft: 0,
      offsetParent: null,
      parentNode: null,
      offsetTop: 0,
      offsetLeft: 0,
      ...extra,
    };
  }

  it("scrolls down near the bottom edge, walking offsetParents, and stops at equal coordinates", () => {
    const elem = fakeElement();
    const scroll = new AutoScroll(elem as unknown as HTMLElement, 30, 10, null, 7);
    const child = fakeElement({ offsetParent: elem, offsetTop: 90, offsetLeft: 20 });
    const event = { layerY: 5, layerX: 30, clientY: 999, clientX: 998, target: child as never };
    scroll.takeOnOffAction(event);
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.OFF);
    scroll.enableAScroll();
    scroll.takeOnOffAction(event);
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.DOWN);
    expect(scroll._aScrollX).toBe(AutoScroll.AUTO_SCROLL_X.OFF);
    vi.advanceTimersByTime(30);
    expect(elem.scrollTop).toBe(10);
    // Scrolled by 10: the same point is 85 down now, out of the edge zone.
    scroll.takeOnOffAction(event);
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.OFF);
    scroll.takeOnOffAction({ ...event, layerY: 12, target: elem as never });
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.UP);
    // layerY equal to clientY: the old "not over the element" exit (95 would be DOWN).
    scroll.takeOnOffAction({ ...event, layerY: 15, clientY: 15 });
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.OFF);
    scroll.takeOnOffAction({
      layerY: 60,
      layerX: 3,
      clientY: 1,
      clientX: 2,
      target: elem as never,
    });
    expect(scroll._aScrollX).toBe(AutoScroll.AUTO_SCROLL_X.LEFT);
    scroll.disableAScroll();
    expect(scroll._timerId).toBeNull();
  });

  it("does nothing for a target outside the element", () => {
    const elem = fakeElement();
    const scroll = new AutoScroll(elem as unknown as HTMLElement, 30, 10, null, 7);
    scroll.enableAScroll();
    scroll.takeOnOffAction({ layerY: 99, layerX: 50, target: fakeElement() as never });
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.OFF);
    scroll.disableAScroll();
  });

  it("chains its mouseout handler before an existing one, and only stops for the element itself", () => {
    const seen: string[] = [];
    const elem = fakeElement({ onmouseout: () => seen.push("old") });
    const scroll = new AutoScroll(elem as unknown as HTMLElement, 30, 10, null, 7);
    scroll._aScrollY = AutoScroll.AUTO_SCROLL_Y.DOWN;
    (elem.onmouseout as (e: unknown) => void)({ target: {} });
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.DOWN);
    (elem.onmouseout as (e: unknown) => void)({ target: elem });
    expect(scroll._aScrollY).toBe(AutoScroll.AUTO_SCROLL_Y.OFF);
    expect(seen).toEqual(["old", "old"]);
    expect(typeof elem.ondragleave).toBe("function");
  });
});
