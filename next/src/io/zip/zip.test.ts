import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CP437_TABLE } from "./zip.ts";
import { FS, type ZipFileEntry } from "./zip-fs.ts";
import recorded from "./zip.old-outputs.json" with { type: "json" };

/** Node has Blob but no FileReader; zip.js reads Blobs through one. */
class NodeFileReader {
  result: unknown = null;
  onload: ((event: { target: NodeFileReader }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    blob.arrayBuffer().then((buffer) => this.done(buffer), this.onerror);
  }

  readAsText(blob: Blob): void {
    blob.text().then((text) => this.done(text), this.onerror);
  }

  private done(result: unknown): void {
    this.result = result;
    this.onload?.({ target: this });
  }
}

beforeAll(() => {
  vi.stubGlobal("FileReader", NodeFileReader);
  // The recording ran with the clock at this local time; entries store local time.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2024, 4, 17, 13, 45, 31) });
});
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function build(kind: string): FS {
  const fs = new FS();
  const root = fs.root;
  if (kind === "flat") {
    root.addBlob(
      "Icon.png",
      new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4, 5, 6, 7, 8, 9])]),
    );
    root.addBlob("Icon@2x.png", new Blob(["hello hello hello hello hello"]));
    root.addBlob("Übersicht 日本.svg", new Blob(["<svg>" + "a".repeat(2000) + "</svg>"]));
  } else if (kind === "nested") {
    const folder = root.addDirectory("Folder");
    const sub = folder.addDirectory("Sub");
    sub.addBlob("Leaf_big.png", new Blob(["leaf"]));
    root.addBlob("Top.jpg", new Blob([new Uint8Array(0)]));
    folder.addBlob("Mid.pdf", new Blob(["%PDF-1.7 mid"]));
  } else if (kind === "big") {
    const data = new Uint8Array(1300000);
    let s = 7;
    for (let i = 0; i < data.length; i++) {
      // The recorder's generator, in doubles (the product loses low bits).
      s = (s * 1103515245 + 12345) >>> 0;
      data[i] = i % 3 === 0 ? s >>> 24 : i & 0x3f;
    }
    root.addBlob("big.bin", new Blob([data]));
  }
  return fs;
}

function exportBlob(fs: FS): Promise<Blob> {
  return new Promise((resolve, reject) => fs.exportBlob(resolve, null, reject));
}

type Kind = "flat" | "nested" | "big" | "empty";

describe("zip.fs export", () => {
  for (const kind of ["flat", "nested", "big", "empty"] as Kind[]) {
    it(`writes the same ZIP bytes as the old zip.js: ${kind}`, async () => {
      const expected = recorded[kind];
      const blob = await exportBlob(build(kind));
      const bytes = Buffer.from(await blob.arrayBuffer());
      expect(blob.type).toBe(expected.type);
      expect(bytes.length).toBe(expected.size);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected.sha);
      if (expected.b64) expect(bytes.toString("base64")).toBe(expected.b64);
    });
  }
});

describe("zip.fs import", () => {
  for (const kind of ["flat", "nested", "big"] as Kind[]) {
    it(`reads back what it wrote, with CRC check: ${kind}`, async () => {
      const expected = recorded[kind] as {
        entries: (string | null)[];
        firstText: string;
        firstName: string;
      };
      const blob = await exportBlob(build(kind));
      const fs = new FS();
      await new Promise<void>((resolve, reject) => fs.importBlob(blob, resolve, reject));
      expect(fs.entries.map((e) => (e ? (e.getFullname() ?? null) : null))).toEqual(
        expected.entries,
      );
      const file = fs.entries.find((e) => e && !e.directory) as ZipFileEntry;
      const text = await new Promise<string>((resolve) => file.getText(resolve, null, undefined));
      expect(file.getFullname()).toBe(expected.firstName);
      expect(text.slice(0, 40)).toBe(expected.firstText);
    });
  }

  it("rejects a file that isn't a ZIP", async () => {
    const fs = new FS();
    const error = await new Promise((resolve) =>
      fs.importBlob(new Blob(["not a zip file at all, really"]), () => resolve(null), resolve),
    );
    expect(error).toBe("File format is not recognized.");
  });
});

describe("zip.fs tree", () => {
  it("refuses duplicate names and finds entries by path", () => {
    const fs = new FS();
    const folder = fs.root.addDirectory("A");
    folder.addText("b.txt", "x");
    expect(() => folder.addText("b.txt", "y")).toThrow();
    expect(fs.find("A/b.txt")?.getFullname()).toBe("A/b.txt");
    expect(fs.find("A/c.txt")).toBeUndefined();
  });

  it("throws on addData without params, after the entry has joined the tree (old zip.js)", () => {
    const fs = new FS();
    const folder = fs.root.addDirectory("A");
    expect(() => folder.addData("x.bin", undefined as never)).toThrow(
      new TypeError("Cannot read properties of undefined (reading 'Reader')"),
    );
    expect(() => folder.addData("y.bin", null as never)).toThrow(
      new TypeError("Cannot read properties of null (reading 'Reader')"),
    );
    expect(folder.children.map((child) => child.name)).toEqual(["x.bin", "y.bin"]);
    expect(fs.entries.map((entry) => entry?.getFullname() ?? null)).toEqual([
      null,
      "A",
      "A/x.bin",
      "A/y.bin",
    ]);
  });

  it("keeps the 128-entry CP437 table of zip.js", () => {
    expect(CP437_TABLE.length).toBe(128);
    expect(CP437_TABLE.charAt(0)).toBe("Ç");
    expect(CP437_TABLE.charAt(127)).toBe(" ");
  });
});
