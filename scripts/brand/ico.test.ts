import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { encodeIco, readIcoDirectory } from "./ico.ts";

const root = path.resolve(import.meta.dirname, "..", "..");

describe("ico", () => {
  it("writes a directory entry per PNG and the PNGs after it", () => {
    const a = Buffer.from("PNG-A");
    const b = Buffer.from("PNG-BB");
    const ico = encodeIco([
      { size: 16, png: a },
      { size: 256, png: b },
    ]);
    expect(readIcoDirectory(ico)).toEqual([
      { size: 16, length: 5, offset: 38 },
      { size: 256, length: 6, offset: 43 },
    ]);
    expect(ico.subarray(38, 43).toString()).toBe("PNG-A");
    expect(ico.subarray(43).toString()).toBe("PNG-BB");
    expect(() => encodeIco([{ size: 512, png: a }])).toThrow();
  });
});

describe("the committed app icons", () => {
  it("are the rendered avatar at every size the manifest, favicon and desktop builds use", () => {
    for (const size of [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024]) {
      const png = PNG.sync.read(
        fs.readFileSync(path.join(root, `public/brand/icons/icon-${size}.png`)),
      );
      expect([png.width, png.height]).toEqual([size, size]);
    }
    const desktop = PNG.sync.read(fs.readFileSync(path.join(root, "build/icon.png")));
    expect([desktop.width, desktop.height]).toEqual([1024, 1024]);
    // The dark tile: its corner is the avatar's background.
    expect([...desktop.data.subarray(0, 4)]).toEqual([0x14, 0x13, 0x19, 255]);
  });

  it("hold the sizes Windows needs in the .ico files", () => {
    const sizes = (file: string) =>
      readIcoDirectory(fs.readFileSync(path.join(root, file))).map((e) => e.size);
    expect(sizes("public/brand/icons/favicon.ico")).toEqual([16, 32, 48]);
    expect(sizes("build/icon.ico")).toEqual([16, 24, 32, 48, 64, 128, 256]);
    const ico = fs.readFileSync(path.join(root, "build/icon.ico"));
    for (const entry of readIcoDirectory(ico)) {
      const png = PNG.sync.read(ico.subarray(entry.offset, entry.offset + entry.length));
      expect(png.width).toBe(entry.size);
    }
  });
});
