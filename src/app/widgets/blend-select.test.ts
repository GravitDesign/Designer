import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import { blendModeGroups, initBlendMode } from "./blend-select.ts";

let dom: FakeDomHandle;
beforeEach(() => {
  dom = installFakeDom();
});
afterEach(() => dom.uninstall());

describe("initBlendMode", () => {
  it("puts Normal first, then one optgroup per group, marking WebGL-only modes", () => {
    const select = dom.document.createElement("select");
    initBlendMode(select as unknown as HTMLSelectElement);
    const children = (select as FakeElement).children;
    expect(children[0]?.tagName).toBe("OPTION");
    expect(children[0]?.getAttribute("value")).toBe("normal");
    expect(children.slice(1).map((c) => c.tagName)).toEqual(Array(5).fill("OPTGROUP"));
    const darken = children[1] as FakeElement;
    expect(darken.children.map((o) => o.getAttribute("value"))).toEqual([
      "darken",
      "multiply",
      "color-burn",
      "subtract",
      "linear_burn",
    ]);
    expect(darken.children[3]?.textContent?.endsWith(" *")).toBe(true);
    expect(darken.children[0]?.textContent?.endsWith(" *")).toBe(false);
  });

  it("lists 28 modes, 12 of them WebGL-only", () => {
    const options = blendModeGroups().flatMap((g) => g.options);
    expect(options).toHaveLength(28);
    expect(options.filter((o) => !o.isCompatible)).toHaveLength(12);
  });
});
