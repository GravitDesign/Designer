import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Block } from "../../engine/scene/block.ts";
import { Element } from "../../engine/scene/element.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { Editor } from "../../editor/editor.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { setDesigner } from "../shell/globals.ts";
import { AutoEdit } from "../widgets/auto-edit.ts";
import { PagePanel } from "./pages-panel.ts";
import {
  classHeights,
  fireEvent,
  installTreeDom,
  type TestElement,
} from "./testing/tree-dom.testing.ts";

let dom: ReturnType<typeof installTreeDom>;
let triggered: unknown[];
let editor: Editor | null;
let touch: boolean;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["page-row"] = 34;
  triggered = [];
  editor = null;
  touch = false;
  setDesigner({
    isTouchEnabled: () => touch,
    stats() {},
    setItemDraggingState() {},
    getActiveDocument: () => (editor ? { getEditor: () => editor } : null),
    getSetting: (_key: string, value?: unknown) => value,
    addEventListener() {},
    removeEventListener() {},
    getContextMenu: () => ({ trigger: (options: unknown) => triggered.push(options) }),
  } as never);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setDesigner(null);
  dom.uninstall();
  delete classHeights["page-row"];
});

function setup(options: ConstructorParameters<typeof PagePanel>[1] = {}) {
  const scene = new Scene(new EditorWorkspace());
  editor = new Editor(scene);
  const first = scene.getActivePage() as Page;
  first.setProperty("name", "One");
  const second = scene.insertPage();
  second.setProperty("name", "Two");
  const element = dom.document.createElement("div");
  element.box = { x: 0, y: 0, width: 249, height: 600 };
  dom.document.body.appendChild(element);
  const panel = new PagePanel(element as unknown as HTMLElement, options);
  panel.scene(scene);
  panel.vtree.requestInvalidation(true);
  return { scene, first, second, element, panel };
}

function rows(element: TestElement): TestElement[] {
  return element.children.filter((child) => child.id === "rowId" && child.style.display !== "none");
}

function titles(element: TestElement): string[] {
  return rows(element).map(
    (row) => row.querySelector<TestElement>(".page-title")?.textContent ?? "",
  );
}

describe("GPagePanel", () => {
  it("lists the pages in scene order with the old row structure", () => {
    const { element } = setup();
    expect(titles(element)).toEqual(["One", "Two"]);
    const row = rows(element)[0] as TestElement;
    expect(row.className).toBe("page-row g-active");
    expect(row.children.map((child) => child.className)).toEqual([
      "page-title-group",
      "page-action page-lock gravit-icon-unlock",
      "page-action page-visibility gravit-icon-display",
    ]);
    expect((row.children[0] as TestElement).children.map((child) => child.className)).toEqual([
      "page-icon gravit-icon-page",
      "page-title",
    ]);
  });

  it("shows a page name as typed, as text and not as markup (BUG-166)", () => {
    const { first, element, panel } = setup();
    first.setProperty("name", "a <b>x</b>");
    panel.vtree.requestInvalidation(true);
    const title = rows(element)[0]?.querySelector<TestElement>(".page-title") as TestElement;
    // The engine stores names with < and > escaped (Block's name filter);
    // the row shows the name as typed.
    expect(first.getProperty("name")).toBe("a &lt;b&gt;x&lt;/b&gt;");
    expect(title.textContent).toBe("a <b>x</b>");
    expect(title.children).toEqual([]);
    expect(title.querySelector("b")).toBeNull();
  });

  it("renames a page with < in its name the way the old app stored it (BUG-166)", () => {
    const { first, element, panel } = setup();
    first.setProperty("name", "a<b");
    panel.vtree.requestInvalidation(true);
    expect(titles(element)[0]).toBe("a<b");
    const edit = AutoEdit.of(rows(element)[0]?.children[0] as unknown as HTMLElement) as AutoEdit;
    edit.open();
    const input = dom.document.body.querySelector<TestElement>(".g-auto-edit") as TestElement;
    expect(input.value).toBe("a<b");
    input.value = "a<b>";
    fireEvent(input, "blur");
    expect(first.getProperty("name")).toBe("a&lt;b&gt;");
  });

  it("shows the dragged page names as typed while dragging, then its own (BUG-166)", () => {
    const { first, second, element, panel } = setup({
      startDraggingCallback: () => [first, second],
    });
    first.setProperty("name", "a<b");
    second.setProperty("name", "c>d");
    panel.vtree.requestInvalidation(true);
    const group = rows(element)[0]?.children[0] as TestElement;
    fireEvent(group, "dragstart");
    const title = group.querySelector<TestElement>(".page-title") as TestElement;
    expect(title.textContent).toBe("a<b, c>d");
    vi.advanceTimersByTime(0);
    expect(title.textContent).toBe("a<b");
  });

  it("adds ' (master)' to a master page on desktop, and the master icon on touch", () => {
    const { second, element, panel } = setup();
    vi.spyOn(second, "getSlavePages").mockReturnValue([second]);
    panel.vtree.requestInvalidation(true);
    expect(titles(element)).toEqual(["One", "Two (master)"]);
    touch = true;
    panel.vtree.requestInvalidation(true);
    expect(titles(element)).toEqual(["One", "Two"]);
    const icons = rows(element).map(
      (row) => row.querySelector<TestElement>(".page-icon")?.className,
    );
    expect(icons).toEqual(["page-icon gravit-icon-page", "page-icon gravit-icon-page-master"]);
    expect(rows(element)[0]?.querySelector(".page-lock")?.className).toBe(
      "page-action page-lock gravit-icon-unlock-small",
    );
  });

  it("shows the infinity icon for a page without a size on touch", () => {
    const { first, element, panel } = setup();
    first.setProperties(["w", "h"], [0, 0]);
    touch = true;
    panel.vtree.requestInvalidation(true);
    expect(rows(element)[0]?.querySelector(".page-icon")?.className).toBe(
      "page-icon gravit-icon-page-infinity",
    );
  });

  it("locks a page fully, turns editing off and clears the selection, and back", () => {
    const { scene, first, element } = setup();
    const rect = new Rectangle();
    first.appendChild(rect);
    (editor as Editor).updateSelection(false, [rect]);
    fireEvent(rows(element)[0]?.querySelector(".page-lock"), "click");
    expect(first.getProperty("lkt")).toBe(Block.LockType.Full);
    expect(scene.getProperty("edit")).toBe(false);
    expect((editor as Editor).hasSelection()).toBeFalsy();
    vi.advanceTimersByTime(25);
    const lock = rows(element)[0]?.querySelector<TestElement>(".page-lock") as TestElement;
    expect(lock.className).toBe("page-action page-lock gravit-icon-lock g-active");
    fireEvent(lock, "click");
    expect(first.getProperty("lkt")).toBe(null);
    expect(scene.getProperty("edit")).toBe(true);
  });

  it("toggles the visibility and marks a hidden row", () => {
    const { first, element } = setup();
    fireEvent(rows(element)[0]?.querySelector(".page-visibility"), "click");
    expect(first.getProperty("vis")).toBe(false);
    vi.advanceTimersByTime(25);
    const row = rows(element)[0] as TestElement;
    expect(row.classList.contains("page-hiden")).toBe(true);
    expect(row.querySelector(".page-visibility")?.className).toBe(
      "page-action page-visibility gravit-icon-hide g-active",
    );
    fireEvent(row.querySelector(".page-visibility"), "click");
    expect(first.getProperty("vis")).toBe(true);
  });

  it("offers no rename on a locked page and ignores a blank name", () => {
    const { first, second, element, panel } = setup();
    second.setProperty("lkt", Block.LockType.Full);
    panel.vtree.requestInvalidation(true);
    const [firstGroup, secondGroup] = rows(element).map((row) => row.children[0]) as TestElement[];
    expect(AutoEdit.of(secondGroup as unknown as HTMLElement)).toBeNull();
    const edit = AutoEdit.of(firstGroup as unknown as HTMLElement) as AutoEdit;
    edit.open();
    const input = dom.document.body.querySelector<TestElement>(".g-auto-edit") as TestElement;
    input.value = "  ";
    fireEvent(input, "blur");
    expect(first.getProperty("name")).toBe("One");
    edit.open();
    const again = dom.document.body.querySelector<TestElement>(".g-auto-edit") as TestElement;
    again.value = "Uno";
    fireEvent(again, "blur");
    expect(first.getProperty("name")).toBe("Uno");
  });

  it("shows every dragged page name on the row while dragging, then its own again", () => {
    const { first, second, element, panel } = setup({
      startDraggingCallback: () => [first, second],
    });
    const group = rows(element)[0]?.children[0] as TestElement;
    const setDragNodes = vi.spyOn(panel.vtree, "setDragNodes");
    fireEvent(group, "dragstart");
    const title = group.querySelector<TestElement>(".page-title") as TestElement;
    expect(title.textContent).toBe("One, Two");
    expect(group.classList.contains("g-dragging")).toBe(true);
    expect(setDragNodes.mock.calls[0]?.[0]).toEqual([
      panel.vtree._root.firstChild,
      panel.vtree._root.lastChild,
    ]);
    vi.advanceTimersByTime(0);
    expect(title.textContent).toBe("One");
    expect(group.classList.contains("g-dragging")).toBe(false);
  });

  it("stops the drag of a row when the callback gives no pages", () => {
    const { element } = setup({ startDraggingCallback: () => [] });
    const group = rows(element)[0]?.children[0] as TestElement;
    fireEvent(group, "dragstart");
    expect(group.getAttribute("draggable")).toBe("false");
  });

  it("highlights on hover only pages with a width that aren't hidden", () => {
    const { first, second, element } = setup();
    second.setProperty("vis", false);
    first.setProperties(["w", "h"], [0, 0]);
    vi.advanceTimersByTime(25);
    const [firstRow, secondRow] = rows(element) as TestElement[];
    fireEvent(firstRow, "mouseenter");
    fireEvent(secondRow, "mouseenter");
    expect(first.hasFlag(Node.Flag.Highlighted as number)).toBe(false);
    expect(second.hasFlag(Node.Flag.Highlighted as number)).toBe(false);
    second.setProperty("vis", true);
    vi.advanceTimersByTime(25);
    const row = rows(element)[1] as TestElement;
    fireEvent(row, "mouseenter");
    expect(second.hasFlag(Node.Flag.Highlighted as number)).toBe(true);
    fireEvent(row, "mouseleave");
    expect(second.hasFlag(Node.Flag.Highlighted as number)).toBe(false);
  });

  it("activates the page of a row before opening its context menu", () => {
    const { scene, second, element } = setup();
    fireEvent(rows(element)[1], "contextmenu", { pageX: 1, pageY: 2, clientX: 3, clientY: 4 });
    expect(scene.getActivePage()).toBe(second);
    expect(triggered).toEqual([
      {
        pageX: 1,
        pageY: 2,
        clientX: 3,
        clientY: 4,
        data: { context: ContextMenuContext.PagePanel },
      },
    ]);
  });

  it("marks the newly active row without rendering, and re-renders when the active page hides", () => {
    const { scene, second, element, panel } = setup();
    const invalidate = vi.spyOn(panel.vtree, "requestInvalidation");
    scene.setActivePage(second);
    expect(rows(element).map((row) => row.classList.contains("g-active"))).toEqual([false, true]);
    expect(invalidate).not.toHaveBeenCalled();
    second.setFlag(Element.Flag.Hidden as number);
    expect(invalidate).toHaveBeenCalled();
    invalidate.mockClear();
    // Another page's flags change nothing.
    const first = scene.getFirstChild() as Page;
    first.setFlag(Element.Flag.Hidden as number);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("stops listening to the old scene when it gets another one", () => {
    const { scene, element, panel } = setup();
    const other = new Scene(new EditorWorkspace());
    panel.scene(other);
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual(["Page 1"]);
    const late = scene.insertPage();
    late.setProperty("name", "Late");
    (scene.getFirstChild() as Page).setFlag(Element.Flag.Hidden as number);
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual(["Page 1"]);
    expect(panel.pagesTreeNodeMapByNodes.has(late)).toBe(false);
  });
});
