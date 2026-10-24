import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classHeights,
  installTreeDom,
  testElement,
  TestEvent,
  type TestElement,
} from "./testing/tree-dom.testing.ts";
import {
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
