import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flush, installFakeDom, type FakeDom, type FakeElement } from "./dom.testing.ts";
import { Downloader } from "./downloader.ts";
import { REVOKE_DELAY, saveAs } from "./save-as.ts";

let dom: FakeDom;
let blobs: Map<string, Blob>;
let revoked: string[];

beforeEach(() => {
  dom = installFakeDom();
  blobs = new Map();
  revoked = [];
  let n = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    const url = `blob:test/${++n}`;
    blobs.set(url, blob as Blob);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => void revoked.push(url));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function clicked(): FakeElement[] {
  return dom.created.filter((e) => e.tagName === "a" && e.dispatched.length > 0);
}

async function bytesOf(link: FakeElement): Promise<number[]> {
  return [...new Uint8Array(await (blobs.get(link.href) as Blob).arrayBuffer())];
}

describe("saveAs (FMT-STORAGE-009)", () => {
  it("clicks a download link on the next tick and revokes the URL 40 s later", () => {
    vi.useFakeTimers();
    saveAs(new Blob([new Uint8Array([1, 2])]), "a.gvdesign");
    expect(clicked()).toHaveLength(0);
    vi.advanceTimersByTime(0);
    const [link] = clicked();
    expect([link?.download, link?.href, link?.dispatched[0]?.type]).toEqual([
      "a.gvdesign",
      "blob:test/1",
      "click",
    ]);
    vi.advanceTimersByTime(REVOKE_DELAY - 1);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(revoked).toEqual(["blob:test/1"]);
  });

  it("names the file after the File, else 'download'", async () => {
    saveAs(new File([new Uint8Array([1])], "mine.png"));
    saveAs(new Blob([new Uint8Array([1])]), "");
    await flush();
    expect(clicked().map((l) => l.download)).toEqual(["mine.png", "download"]);
  });

  it("adds a BOM to UTF-8 text unless told not to, keeps other bytes as they are", async () => {
    const svg = "<svg/>";
    saveAs(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "a.svg");
    saveAs(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "b.svg", true);
    saveAs(new Blob([svg], { type: "image/svg+xml" }), "c.svg");
    await flush();
    const [a, b, c] = clicked() as [FakeElement, FakeElement, FakeElement];
    const plain = [...new TextEncoder().encode(svg)];
    expect(await bytesOf(a)).toEqual([0xef, 0xbb, 0xbf, ...plain]);
    expect(await bytesOf(b)).toEqual(plain);
    expect(await bytesOf(c)).toEqual(plain);
  });
});

describe("Downloader", () => {
  it("downloads the buffer as <name>.<extension> with the given Blob options", async () => {
    await new Downloader().download({
      buffer: new Uint8Array([5, 6]),
      name: "Page 1",
      extension: "png",
      mime: { type: "image/png" },
    });
    await flush();
    const [link] = clicked() as [FakeElement];
    expect(link.download).toBe("Page 1.png");
    expect((blobs.get(link.href) as Blob).type).toBe("image/png");
    expect(await bytesOf(link)).toEqual([5, 6]);
  });
});
