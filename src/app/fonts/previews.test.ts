import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRequest, installFakeXhr, requestedUrls } from "./fake-xhr.testing.ts";
import type { PreviewFamily } from "./font-preview.ts";
import type { ListedFamily, LoadCallbacks } from "./fonts-provider.ts";
import { NotoFontsProvider } from "./noto-fonts-provider.ts";
import { WebFontsProvider } from "./web-fonts-provider.ts";
import { ImportedFontsProvider } from "./imported-fonts-provider.ts";
import { LocalFontsProvider } from "./local-font-list.ts";
import { FontDB } from "./font-db.ts";
import { setDesigner } from "../shell/globals.ts";

const owner = { setLock: () => {}, reset: () => {} };

/** An SVG root as DOMParser gives it, with the attributes it was given. */
class FakeSvg {
  readonly attributes: Record<string, string>;
  constructor(public readonly source: string) {
    this.attributes = source.includes("xmlns") ? { xmlns: "http://www.w3.org/2000/svg" } : {};
  }
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }
}

class FakeParser {
  parseFromString(text: string): { firstChild: FakeSvg } {
    return { firstChild: new FakeSvg(text) };
  }
}

beforeEach(() => {
  installFakeXhr();
  vi.stubGlobal("DOMParser", FakeParser);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bundled fonts previews (UI-FONT-006)", () => {
  it("fetches the family's SVG and hands it over 20px high", () => {
    const provider = new NotoFontsProvider(owner);
    const family = { family: "Noto Sans", fonts: [], preview: "assets/x.svg" } as PreviewFamily;
    provider.addPreviews([family]);
    const received: FakeSvg[] = [];
    family.addPreviewCallback?.call(family, (svg) => received.push(svg as unknown as FakeSvg));
    expect(requestedUrls()).toEqual(["assets/x.svg"]);
    (FakeRequest.sent[0] as FakeRequest).respond(200, "<svg xmlns='x'/>");
    expect(received).toHaveLength(1);
    expect(received[0]?.getAttribute("height")).toBe("20px");
  });

  it("drops a preview without xmlns and leaves cached ones alone", () => {
    const provider = new NotoFontsProvider(owner);
    const family = { family: "A", fonts: [], preview: "a.svg" } as PreviewFamily;
    const cached = { family: "B", fonts: [], cachedPreview: {} } as unknown as PreviewFamily;
    provider.addPreviews([family, cached]);
    expect(cached.addPreviewCallback).toBeUndefined();
    const receiver = vi.fn();
    family.addPreviewCallback?.call(family, receiver);
    (FakeRequest.sent[0] as FakeRequest).respond(200, "<svg/>");
    expect(receiver).not.toHaveBeenCalled();
  });
});

describe("Google fonts previews (UI-FONT-007)", () => {
  function loaded(count: number): { provider: WebFontsProvider; families: ListedFamily[] } {
    const provider = new WebFontsProvider(owner);
    const list = Array.from({ length: count }, (_, i) => ({ family: "F" + i, fonts: [] }));
    let families: ListedFamily[] = [];
    const callbacks: LoadCallbacks = {
      done: (result) => {
        families = result;
      },
      fail: () => {},
    };
    provider.load("%", 0, count, callbacks);
    (FakeRequest.sent[0] as FakeRequest).respond(200, JSON.stringify(list));
    FakeRequest.sent = [];
    return { provider, families };
  }

  it("loads the batch files of the listed families and hands each preview on", () => {
    const { provider, families } = loaded(25);
    const wanted = [families[3], families[12]] as PreviewFamily[];
    provider.addPreviews(wanted, true);
    expect(requestedUrls()).toEqual([
      "/assets/data/google_previews/previews0.json",
      "/assets/data/google_previews/previews1.json",
    ]);
    const received: string[] = [];
    // The panel asks before the batch is there; the preview follows.
    (wanted[1] as PreviewFamily).addPreviewCallback?.call(wanted[1] as PreviewFamily, (svg) =>
      received.push((svg as unknown as FakeSvg).source),
    );
    const batch = Array.from({ length: 10 }, (_, i) => `<svg xmlns='x' id='${10 + i}'/>`);
    (FakeRequest.sent[1] as FakeRequest).respond(200, JSON.stringify(batch));
    expect(received).toEqual(["<svg xmlns='x' id='12'/>"]);
    // Asked after the batch came: handed over at once.
    const later: string[] = [];
    const other = families[15] as PreviewFamily;
    other.addPreviewCallback?.call(other, (svg) => later.push((svg as unknown as FakeSvg).source));
    expect(later).toEqual(["<svg xmlns='x' id='15'/>"]);
  });

  it("only sets the callbacks without previews, and skips cached first batches", () => {
    const { provider, families } = loaded(25);
    provider.addPreviews([families[0] as ListedFamily], false);
    expect(requestedUrls()).toEqual([]);
    expect((families[0] as PreviewFamily).addPreviewCallback).toBeDefined();
    (families[0] as PreviewFamily).cachedPreview = {} as Element;
    provider.addPreviews([families[1] as ListedFamily, families[20] as ListedFamily], true);
    // Batch 0 starts with a cached family, so only batch 2 is fetched.
    expect(requestedUrls()).toEqual(["/assets/data/google_previews/previews2.json"]);
  });
});

describe("font names in the imported and local previews (BUG-146)", () => {
  /** Records what was put in as markup and what as text. */
  class NameElement {
    html: string | undefined = undefined;
    text: string | undefined = undefined;
    className = "";
    style: Record<string, string> = {};
    readonly children: NameElement[] = [];
    set innerHTML(value: string) {
      this.html = value;
    }
    set textContent(value: string) {
      this.text = value;
    }
    appendChild(child: NameElement): void {
      this.children.push(child);
    }
    setAttribute(): void {}
    addEventListener(): void {}
  }

  const name = '<img src=x onerror="alert(1)">';

  beforeEach(() => {
    vi.stubGlobal("document", { createElement: () => new NameElement() });
  });

  afterEach(() => {
    setDesigner(null);
    vi.restoreAllMocks();
  });

  it("puts an imported family's name in as text", async () => {
    setDesigner({ isTouchEnabled: () => false } as never);
    const db = {
      getItem: (key: string) =>
        Promise.resolve({
          value:
            key === FontDB.FONT_LIST ? [{ family: name, weight: "400", style: "N" }] : undefined,
          store: undefined,
        }),
    } as unknown as FontDB;
    const getInstance = vi.spyOn(FontDB, "getInstance").mockImplementation((callback) => {
      callback?.(db);
      return db;
    });
    const provider = new ImportedFontsProvider(owner);
    let families: ListedFamily[] = [];
    provider.load("%", 0, 9999, { done: (result) => (families = result), fail: () => {} });
    await vi.waitFor(() => expect(families).toHaveLength(1));
    // No font file for the preview's @font-face.
    getInstance.mockImplementation((callback) => {
      callback?.(null);
      return null as unknown as FontDB;
    });
    provider.addPreviews(families);
    const received: NameElement[] = [];
    const family = families[0] as PreviewFamily;
    family.addPreviewCallback?.call(family, (container) =>
      received.push(container as unknown as NameElement),
    );
    const label = received[0]?.children[0];
    expect(label?.text).toBe(name);
    expect(label?.html).toBeUndefined();
  });

  it("puts a local family's name in as text", () => {
    const provider = new LocalFontsProvider(owner);
    const family = { family: name, fonts: [] } as unknown as PreviewFamily;
    provider.addPreviews([family as ListedFamily]);
    const received: NameElement[] = [];
    family.addPreviewCallback?.call(family, (preview) =>
      received.push(preview as unknown as NameElement),
    );
    expect(received[0]?.text).toBe(name);
    expect(received[0]?.html).toBeUndefined();
  });
});
