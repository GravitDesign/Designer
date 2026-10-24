import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { FakeRequest, installFakeXhr, requestedUrls } from "./fake-xhr.testing.ts";
import { FontsProviderErrors, type ListedFamily, type ResolveCallbacks } from "./fonts-provider.ts";
import { NotoFontsProvider } from "./noto-fonts-provider.ts";
import { WebFontsProvider } from "./web-fonts-provider.ts";
import { ImportedFontsProvider } from "./imported-fonts-provider.ts";
import { FontDB } from "./font-db.ts";
import { LocalFontsProvider } from "./local-font-list.ts";
import { generateFormattedList, getFontFamily } from "./font-style-naming.ts";
import { setContainer, setDesigner } from "../shell/globals.ts";

function callbacks(): {
  done: Mock<ResolveCallbacks["done"]>;
  fail: Mock<ResolveCallbacks["fail"]>;
} {
  return { done: vi.fn<ResolveCallbacks["done"]>(), fail: vi.fn<ResolveCallbacks["fail"]>() };
}

const owner = { setLock: () => {}, reset: () => {} };

beforeEach(() => {
  installFakeXhr();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setDesigner(null);
  setContainer(null);
});

describe("NotoFontsProvider", () => {
  it("downloads the bundled file of the exact weight and style", () => {
    const provider = new NotoFontsProvider(owner);
    const answer = callbacks();
    provider.resolveFont("Open Sans", "I", 800, answer);
    expect(requestedUrls()).toEqual(["assets/font/OpenSans-ExtraBoldItalic.ttf"]);
    const bytes = new ArrayBuffer(4);
    (FakeRequest.sent[0] as FakeRequest).respond(200, bytes);
    expect(answer.done).toHaveBeenCalledWith(bytes);
    expect(answer.fail).not.toHaveBeenCalled();
  });

  it("defaults to regular normal and fails at once for an unknown face", () => {
    const provider = new NotoFontsProvider(owner);
    provider.resolveFont("Open Sans", null, null, callbacks());
    expect(requestedUrls()).toEqual(["assets/font/OpenSans-Regular.ttf"]);
    const missing = callbacks();
    provider.resolveFont("Open Sans", "N", 100, missing);
    expect(missing.fail).toHaveBeenCalledTimes(1);
    expect(requestedUrls()).toHaveLength(1);
  });

  it("shares one download between requests for the same file", () => {
    const provider = new NotoFontsProvider(owner);
    const first = callbacks();
    const second = callbacks();
    provider.resolveFont("Noto Sans CJK SC", "N", 700, first);
    provider.resolveFont("Noto Sans CJK SC", "N", 700, second);
    expect(requestedUrls()).toEqual(["assets/font/chinese-simplified/NotoSansCJKsc-Bold.otf"]);
    (FakeRequest.sent[0] as FakeRequest).respond(200, new ArrayBuffer(1));
    expect(first.done).toHaveBeenCalledTimes(1);
    expect(second.done).toHaveBeenCalledTimes(1);
  });

  it("fails only the first request on a connection error, and none on a 404", () => {
    const provider = new NotoFontsProvider(owner);
    const first = callbacks();
    const second = callbacks();
    provider.resolveFont("Open Sans", "N", 300, first);
    provider.resolveFont("Open Sans", "N", 300, second);
    (FakeRequest.sent[0] as FakeRequest).fail();
    expect(first.fail).toHaveBeenCalledWith(FontsProviderErrors.ConnectionError);
    expect(second.fail).not.toHaveBeenCalled();
    const notFound = callbacks();
    provider.resolveFont("Open Sans", "N", 600, notFound);
    (FakeRequest.sent[1] as FakeRequest).respond(404, null);
    expect(notFound.done).not.toHaveBeenCalled();
    expect(notFound.fail).not.toHaveBeenCalled();
  });

  it("lists Open Sans first, then the CJK and Noto families", () => {
    const provider = new NotoFontsProvider(owner);
    let listed: ListedFamily[] = [];
    provider.load("%", 0, 3, { done: (families) => (listed = families), fail: () => {} });
    expect(listed.map((family) => family.family)).toEqual([
      "Open Sans",
      "Noto Sans CJK SC",
      "Noto Sans CJK TC",
    ]);
    provider.load("noto sans ar%", 0, 9999, {
      done: (families) => (listed = families),
      fail: () => {},
    });
    expect(listed.map((family) => family.family)).toEqual([
      "Noto Sans Arabic",
      "Noto Sans Armenian",
    ]);
    expect(provider.getTotalFonts()).toBe(49);
    expect(provider.hasFont("Noto Sans CJK JP")).toBe(true);
    expect(provider.hasFont("Noto Sans CS")).toBe(false);
  });
});

describe("WebFontsProvider", () => {
  const list = JSON.stringify([
    {
      family: "Roboto",
      fonts: [{ style: "N", weight: 400, url: "https://fonts.example/roboto.ttf" }],
    },
  ]);

  it("loads the family list once and resolves the requests that waited for it", () => {
    setDesigner({ getVersion: () => "3.15.0" } as never);
    setContainer({ getRootPath: () => "" } as never);
    const provider = new WebFontsProvider(owner);
    const first = callbacks();
    const second = callbacks();
    provider.resolveFont("Roboto", "N", 400, first);
    provider.resolveFont("Roboto", "N", 400, second);
    expect(requestedUrls()).toEqual(["/assets/data/googlefonts.json?3.15.0"]);
    (FakeRequest.sent[0] as FakeRequest).respond(200, list);
    expect(requestedUrls()).toEqual([
      "/assets/data/googlefonts.json?3.15.0",
      "https://fonts.example/roboto.ttf",
    ]);
    (FakeRequest.sent[1] as FakeRequest).respond(200, new ArrayBuffer(2));
    expect(first.done).toHaveBeenCalledTimes(1);
    expect(second.done).toHaveBeenCalledTimes(1);
    const missing = callbacks();
    provider.resolveFont("Lobster", "N", 400, missing);
    expect(missing.fail).toHaveBeenCalledWith();
  });

  it("asks for the list under the app's root path, with a random number before the designer", () => {
    setContainer({ getRootPath: () => "/root" } as never);
    new WebFontsProvider(owner).initialize();
    expect(requestedUrls()[0]).toMatch(/^\/root\/assets\/data\/googlefonts\.json\?\d+$/);
  });

  it("fails what waited with a connection error when the list can't load", () => {
    const provider = new WebFontsProvider(owner);
    const waiting = callbacks();
    provider.resolveFont("Roboto", "N", 400, waiting);
    (FakeRequest.sent[0] as FakeRequest).fail();
    expect(waiting.fail).toHaveBeenCalledWith(FontsProviderErrors.ConnectionError);
  });
});

describe("ImportedFontsProvider", () => {
  function fakeDb(items: Record<string, unknown>) {
    const db = {
      getItem: (key: string) => Promise.resolve({ value: items[key], store: undefined }),
    } as unknown as FontDB;
    return vi.spyOn(FontDB, "getInstance").mockImplementation((callback) => {
      callback?.(db);
      return db;
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs its first request twice, later ones once", async () => {
    fakeDb({ [FontDB.FONT_LIST]: [] });
    const provider = new ImportedFontsProvider(owner);
    const answer = callbacks();
    provider.resolveFont("Mine", "N", 400, answer);
    await vi.waitFor(() => expect(answer.fail).toHaveBeenCalledTimes(2));
    const again = callbacks();
    provider.resolveFont("Mine", "N", 400, again);
    await vi.waitFor(() => expect(again.fail).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(answer.fail).toHaveBeenCalledTimes(2);
    expect(again.fail).toHaveBeenCalledTimes(1);
  });

  it("hands back a stored font file, by family, weight and style", async () => {
    const bytes = new ArrayBuffer(3);
    fakeDb({
      [FontDB.FONT_LIST]: [{ family: "Mine", weight: "700", style: "I" }],
      Mine_700_I: new Uint8Array(bytes),
    });
    const provider = new ImportedFontsProvider(owner);
    const answer = callbacks();
    provider.resolveFont("Mine", "I", 700, answer);
    await vi.waitFor(() => expect(answer.done).toHaveBeenCalled());
    expect(answer.done).toHaveBeenCalledWith(bytes);
  });
});

describe("LocalFontsProvider", () => {
  it("fails when the Local Font Access API gives nothing", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("window", {});
    const provider = new LocalFontsProvider(owner);
    const answer = callbacks();
    provider.resolveFont("Arial", "N", 400, answer);
    await vi.waitFor(() => expect(answer.fail).toHaveBeenCalledTimes(1));
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("finds a local family by name and parses only its fonts", async () => {
    const data = { family: "Local Sans", blob: () => Promise.resolve(new Blob([])) };
    vi.stubGlobal("window", { queryLocalFonts: () => Promise.resolve([data]) });
    const provider = new LocalFontsProvider(owner);
    let listed: ListedFamily[] = [];
    provider.load("local%", 0, 9999, { done: (families) => (listed = families), fail: () => {} });
    await vi.waitFor(() => expect(listed).toHaveLength(1));
    expect(listed[0]?.family).toBe("Local Sans");
    expect(listed[0]?.fonts).toEqual([data]);
  });
});

describe("font-style-naming", () => {
  it("groups by display name and names a group after its regular family", () => {
    const groups = generateFormattedList([
      { family: "Acme Bold", weight: "700", style: "N", displayname: "Acme" },
      { family: "Acme", weight: "400", style: "I", displayname: "Acme" },
      { family: "Acme Regular", weight: "400", style: "N", displayname: "Acme" },
      { family: "Other", weight: "400", style: "N" },
    ]);
    expect(groups?.map((group) => [group.family, group.displayname, group.families])).toEqual([
      ["Acme Regular", "Acme", ["Acme Bold", "Acme Regular", "Acme"]],
      ["Other", "Other", ["Other"]],
    ]);
    expect(groups?.[0]?.fonts.map((font) => font.weight)).toEqual([700, 400, 400]);
  });

  it("finds a family without its variant suffix or trailing words", () => {
    const known = new Map([["Acme Sans", 1]]);
    const find = (name: string) => known.get(name);
    expect(getFontFamily("Acme Sans variant 3", find)).toBe(1);
    expect(getFontFamily("Acme Sans Condensed Bold", find)).toBe(1);
    expect(getFontFamily("Other", find)).toBeUndefined();
  });
});
