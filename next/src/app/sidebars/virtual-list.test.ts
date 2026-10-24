import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, installTreeDom, type TestElement } from "./testing/tree-dom.testing.ts";
import { VirtualList } from "./virtual-list.ts";

let dom: ReturnType<typeof installTreeDom>;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  dom.uninstall();
});

function makeList(rowCount = 10) {
  const container = dom.document.createElement("div");
  // Two rows of 20px are visible: six rows (three screens) are rendered.
  container.box = { x: 0, y: 0, width: 200, height: 40 };
  dom.document.body.appendChild(container);
  const rendered: number[] = [];
  const list = new VirtualList(
    container as unknown as HTMLElement,
    ((index: number, row: HTMLElement) => {
      rendered.push(index);
      row.textContent = String(index);
    }) as never,
    rowCount,
    20,
  );
  return { list, container, rendered };
}

function shown(container: TestElement): string[] {
  return container.children
    .filter((child) => child.classList.contains("vrow") && child.style.display !== "none")
    .map((child) => child.textContent);
}

describe("GVirtualList", () => {
  it("renders three screens from the first row and keeps the scroller as the first child", () => {
    const { list, container } = makeList();
    expect(list._visibleRows).toBe(2);
    expect(list._scrollCacheSize).toBe(40);
    expect(shown(container)).toEqual(["0", "1", "2", "3", "4", "5"]);
    const scroller = container.children[0] as TestElement;
    expect(scroller.className).toBe("vscroller");
    expect(scroller.style.height).toBe("200px");
  });

  it("stops at the row count", () => {
    const { container } = makeList(4);
    expect(shown(container)).toEqual(["0", "1", "2", "3"]);
  });

  it("re-renders on scroll only the first time and when it moved further than one screen", () => {
    const { container, rendered } = makeList();
    rendered.length = 0;
    container.scrollTop = 30;
    fireEvent(container, "scroll");
    // The first scroll always renders (no last render position yet).
    expect(rendered).toEqual([0, 1, 2, 3, 4, 5]);
    rendered.length = 0;
    container.scrollTop = 70;
    fireEvent(container, "scroll");
    // 40px from the last render: not more than the 40px cache.
    expect(rendered).toEqual([]);
    container.scrollTop = 80;
    fireEvent(container, "scroll");
    // First row 80 / 20 - 2 = 2, up to 2 + 6.
    expect(rendered).toEqual([2, 3, 4, 5, 6, 7]);
    expect(shown(container)).toEqual(["2", "3", "4", "5", "6", "7"]);
    // The scroller is never hidden.
    expect((container.children[0] as TestElement).style.display).toBe("");
  });

  it("removes the hidden rows 300 ms after a scroll, at most once per 100 ms", () => {
    vi.setSystemTime(10_000);
    const { container } = makeList();
    const total = () => container.children.length;
    expect(total()).toBe(7);
    container.scrollTop = 80;
    fireEvent(container, "scroll");
    // Six hidden old rows wait for the clean.
    expect(container.querySelectorAll("div[data-clean]").length).toBe(6);
    vi.advanceTimersByTime(299);
    expect(total()).toBe(13);
    vi.advanceTimersByTime(1);
    expect(total()).toBe(7);
    // A second clean within 100 ms of the last one is skipped.
    container.scrollTop = 200;
    fireEvent(container, "scroll");
    vi.setSystemTime(Date.now() - 250);
    vi.advanceTimersByTime(300);
    expect(container.querySelectorAll("div[data-clean]").length).toBe(6);
    // The skipped timer was still reset: the next scroll cleans again.
    container.scrollTop = 0;
    fireEvent(container, "scroll");
    vi.advanceTimersByTime(300);
    expect(container.querySelectorAll("div[data-clean]").length).toBe(0);
  });
});
