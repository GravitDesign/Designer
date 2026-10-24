import { afterEach, describe, expect, it, vi } from "vitest";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { handleDragForDeleteIcon } from "./drag-delete.ts";

/** An element whose style is a plain map; getComputedStyle reads it back. */
function image(): HTMLElement & { props: Map<string, string> } {
  const props = new Map<string, string>([["display", "none"]]);
  return {
    props,
    style: {
      setProperty: (name: string, value: string) => props.set(name, value),
      getPropertyValue: (name: string) => props.get(name) ?? "",
    },
  } as unknown as HTMLElement & { props: Map<string, string> };
}

afterEach(() => {
  resetGlobals();
  vi.unstubAllGlobals();
});

describe("handleDragForDeleteIcon (module 1161)", () => {
  it("shows the trash image left of the pointer outside the panel and hides it inside", () => {
    setDesigner({ isTouchEnabled: () => false } as unknown as Designer);
    vi.stubGlobal("getComputedStyle", (element: HTMLElement) => ({
      getPropertyValue: (name: string) => element.style.getPropertyValue(name),
    }));
    const icon = image();
    const panel = { top: 100, left: 50 };
    // Above the panel: deleting; the image sits at pointer - grab - its width (0, hidden) - 10.
    expect(handleDragForDeleteIcon({ clientX: 200, clientY: 80 }, icon, panel, 300, 5, 7)).toBe(
      true,
    );
    expect([...icon.props]).toEqual([
      ["display", "block"],
      ["top", "73px"],
      ["left", "185px"],
    ]);
    // Inside the panel: not deleting, hidden again.
    expect(handleDragForDeleteIcon({ clientX: 200, clientY: 150 }, icon, panel, 300, 5, 7)).toBe(
      false,
    );
    expect(icon.props.get("display")).toBe("none");
    // No panel offset: nothing happens.
    expect(handleDragForDeleteIcon({ clientX: 0, clientY: 0 }, icon, null, 300, 0, 0)).toBe(false);
  });
});
