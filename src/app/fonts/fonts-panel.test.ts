import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import {
  fake,
  FakeElement,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { FontsProviderManager, ResetEvent, type QueryResult } from "./font-manager.ts";
import type { PreviewFamily } from "./font-preview.ts";
import { FontsPanel } from "./fonts-panel.ts";

let dom: FakeDomHandle;
let touch = false;
let answer: QueryResult = { faces: [] };
const manager = FontsProviderManager.getInstance();

function family(name: string, extra: Partial<PreviewFamily> = {}): PreviewFamily {
  return { family: name, fonts: [], ...extra } as PreviewFamily;
}

function panel(options: ConstructorParameters<typeof FontsPanel>[1] = {}): FontsPanel {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return new FontsPanel(element, options);
}

const rows = (p: FontsPanel) => fake(p.getElement()).querySelectorAll(".fonts-row");
const infos = (p: FontsPanel) => rows(p).map((row) => row.querySelector(".info")?.textContent);

beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
  // The preview check is `instanceof Element`.
  vi.stubGlobal("Element", FakeElement);
  touch = false;
  answer = { faces: [] };
  setDesigner({
    getWorkspace: () => ({
      getFontManager: () => ({ getDefaultFont: () => ({ getFamily: () => "Open Sans" }) }),
    }),
    isTouchEnabled: () => touch,
  } as unknown as Designer);
  vi.spyOn(manager, "query").mockImplementation((callback) => callback(answer));
  vi.spyOn(manager, "loadMore").mockReturnValue(0);
  vi.spyOn(manager, "isLoading").mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  dom.uninstall();
  resetGlobals();
});

describe("FontsPanel rows (UI-FONT-004)", () => {
  it("lists the answer of the search query, named by display name", () => {
    answer = { faces: [family("Lato"), family("Roboto", { displayname: "Roboto Sans" })] };
    const p = panel();
    p.search("La");
    expect(manager.query).toHaveBeenLastCalledWith(expect.any(Function), "La%");
    expect(infos(p)).toEqual(["Lato", "Roboto Sans"]);
    expect(p.getElement().classList.contains("g-fonts-panel")).toBe(true);
    expect(p.fontsLength()).toBe(2);
  });

  it("shows Loading... and asks only when the query changed", () => {
    vi.mocked(manager.query).mockImplementation(() => {});
    const p = panel();
    p.refresh();
    expect(fake(p.getElement()).textContent.endsWith("...")).toBe(true);
    expect(manager.query).toHaveBeenCalledTimes(1);
    p.refresh();
    expect(manager.query).toHaveBeenCalledTimes(1);
    p.reload();
    expect(manager.query).toHaveBeenCalledTimes(2);
  });

  it("refresh(true) keeps the old query but drops the search for the next one", () => {
    const p = panel();
    p.search("ab");
    expect(p.search()).toBe("ab");
    p.reload();
    p.refresh(true);
    expect(p.search()).toBe("ab");
    p.reload();
    expect(manager.query).toHaveBeenLastCalledWith(expect.any(Function), "ab%");
  });

  it("moves a cached preview into the new row and waits for the others", () => {
    const svg = document.createElement("svg") as unknown as Element;
    const asked: string[] = [];
    const callback: PreviewFamily["addPreviewCallback"] = function (receiver) {
      asked.push(this.family);
      if (this.family === "B") (receiver as (e: Element) => void)(svg);
    };
    const a = family("A", { addPreviewCallback: callback });
    const b = family("B", { addPreviewCallback: callback });
    const c = family("C", { addPreviewCallback: callback });
    answer = { faces: [a, b, c] };
    const p = panel();
    p.selection("x");
    p.reload("B");
    // Previews are asked for from the selected font outwards.
    expect(asked).toEqual(["B", "C", "A"]);
    // The preview lands in its row on the next timer turn.
    expect(rows(p)[1]?.querySelector(".preview")).toBeNull();
    vi.runAllTimers();
    expect(fake(rows(p)[1]?.querySelector(".preview")).children[0]).toBe(svg);
    expect(b.cachedPreview).toBe(svg);
    // Listed again: the cached preview moves into the new row at once.
    p.reload();
    expect(fake(rows(p)[1]?.querySelector(".preview")).children[0]).toBe(svg);
    expect(asked).toEqual(["B", "C", "A", "A", "C"]);
  });
});

describe("FontsPanel selection (UI-FONT-005)", () => {
  it("marks the picked family and reports it", () => {
    answer = { faces: [family("Lato"), family("Roboto")] };
    const picked: string[] = [];
    const p = panel({ changeCallback: (font) => picked.push(font.family) });
    p.reload();
    expect(p.selection()).toBeNull();
    fire(rows(p)[1]?.querySelector(".info"), "mousedown");
    expect(picked).toEqual(["Roboto"]);
    expect(p.selection()).toBe("Roboto");
    expect(rows(p).map((row) => row.classList.contains("g-selected"))).toEqual([false, true]);
  });

  it("picks on click instead of mousedown in the touch layout", () => {
    touch = true;
    answer = { faces: [family("Lato")] };
    const picked: string[] = [];
    const p = panel({ changeCallback: (font) => picked.push(font.family) });
    p.reload();
    fire(rows(p)[0], "mousedown");
    expect(picked).toEqual([]);
    fire(rows(p)[0], "click");
    expect(picked).toEqual(["Lato"]);
  });

  it("ignores the delete icon and special rows", () => {
    answer = { faces: [family("Lato"), family("Install", { special: true })] };
    const picked: string[] = [];
    const p = panel({ changeCallback: (font) => picked.push(font.family) });
    p.reload();
    const trash = document.createElement("span");
    trash.setAttribute("name", "_SPECIAL_");
    rows(p)[0]?.appendChild(fake(trash));
    expect(fire(trash, "mousedown").propagationStopped).toBe(true);
    expect(fire(rows(p)[1], "mousedown").propagationStopped).toBe(true);
    expect(picked).toEqual([]);
  });

  it("re-renders on a font manager reset, around the default family", () => {
    answer = { faces: [family("Open Sans")] };
    const p = panel();
    manager.trigger(new ResetEvent(manager));
    expect(infos(p)).toEqual(["Open Sans"]);
    expect(p.getElement().classList.contains("g-loading")).toBe(false);
  });
});

describe("FontsPanel family lookups (UI-FONT-002)", () => {
  const lato = family("Lato", {
    displayname: "Lato Display",
    fonts: [
      { weight: 400, style: "N" },
      { weight: 700, style: "N", family: "Lato" },
      { weight: 700, style: "I", family: "Lato Black", subfamily: "Black" },
    ],
  });

  it("answers undefined and fills the cache while it is empty", async () => {
    vi.spyOn(manager, "isCacheEmpty").mockReturnValue(true);
    const p = panel();
    const done = vi.fn();
    expect(p.fontDisplayName("Lato", done)).toBeUndefined();
    expect(manager.query).toHaveBeenLastCalledWith(done, "%", true);
    expect(await p.weightsForFont("Lato")).toBeUndefined();
  });

  it("reads names, styles and weights from the cache", async () => {
    vi.spyOn(manager, "isCacheEmpty").mockReturnValue(false);
    vi.spyOn(manager, "searchFamilyInCache").mockImplementation((name) =>
      name === "Lato" ? lato : null,
    );
    const p = panel();
    expect(p.fontDisplayName("Lato Bold Italic")).toBe("Lato Display");
    expect(p.fontDisplayName("Unknown")).toBe("Unknown");
    expect(p.stylesForFont("Lato")).toEqual(["N", "N", "I"]);
    expect(p.stylesForWeight(700, "Lato")).toEqual(["N", "I"]);
    expect(p.stylesForWeight(700, "Lato", null, true)).toEqual(["N"]);
    expect(p.subfamiliesForWeight(700, "Lato")).toEqual([
      { realName: "Lato", subFamily: undefined },
      { realName: "Lato Black", subFamily: "Black" },
    ]);
    // With `exact`, a font of the family itself counts twice, as before.
    expect(await p.weightsForFont("Lato")).toEqual([400, 700, 700]);
    expect(await p.weightsForFont("Lato", null, true)).toEqual([400, 700, 700, 700]);
    // BUG-163: a family the cache doesn't know answers null (the old app threw).
    expect(await p.weightsForFont("Unknown")).toBeNull();
  });
});
