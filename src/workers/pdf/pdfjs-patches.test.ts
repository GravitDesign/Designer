import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { applyPatches, MAIN_PATCHES, WORKER_PATCHES } from "./pdfjs-patches.ts";

const BUILD = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "node_modules",
  "pdfjs-dist",
  "build",
);
const mainSource = fs.readFileSync(path.join(BUILD, "pdf.js"), "utf8");
const workerSource = fs.readFileSync(path.join(BUILD, "pdf.worker.js"), "utf8");

describe("pdf.js patches", () => {
  it("apply to pdfjs-dist 2.1.266", () => {
    expect(mainSource).toContain("var pdfjsVersion = '2.1.266';");
    expect(() => applyPatches(mainSource, MAIN_PATCHES)).not.toThrow();
    expect(() => applyPatches(workerSource, WORKER_PATCHES)).not.toThrow();
  });

  it("refuse text they don't match, or match twice", () => {
    expect(() => applyPatches("abc", [{ name: "x", find: "zz", replace: "" }])).toThrow(
      /doesn't match/,
    );
    expect(() => applyPatches("aa", [{ name: "x", find: "a", replace: "b" }])).toThrow(
      /more than once/,
    );
    expect(applyPatches("abc", [{ name: "x", find: "b", replace: "B" }])).toBe("aBc");
  });

  it("make the main build export the classes the importer extends, and cmyk() styles", () => {
    const module: { exports: Record<string, unknown> } = { exports: {} };
    // A `window` keeps pdf.js from looking for Node modules.
    const context = vm.createContext({
      module,
      exports: module.exports,
      window: {},
      console,
      setTimeout,
      clearTimeout,
    });
    vm.runInContext(applyPatches(mainSource, MAIN_PATCHES), context);
    const pdfjs = module.exports as {
      CanvasGraphics: { prototype: Record<string | number, unknown> };
      TilingPattern: unknown;
      getShadingPatternFromIR: unknown;
      OPS: Record<string, number>;
      Util: { makeCssCMYK(c: number, m: number, y: number, k: number): string };
    };
    expect(typeof pdfjs.CanvasGraphics).toBe("function");
    expect(typeof pdfjs.TilingPattern).toBe("function");
    expect(typeof pdfjs.getShadingPatternFromIR).toBe("function");
    expect(pdfjs.Util.makeCssCMYK(10, 20, 30, 40)).toBe("cmyk(10%,20%,30%,40%)");
    // The operator table entries exist for the CMYK operators now.
    const proto = pdfjs.CanvasGraphics.prototype;
    expect(typeof proto[pdfjs.OPS.setFillCMYKColor as number]).toBe("function");
    const graphics = {
      ctx: {} as Record<string, unknown>,
      current: {} as Record<string, unknown>,
    };
    (proto.setFillCMYKColor as (...a: number[]) => void).call(graphics, 0, 50, 100, 0);
    expect(graphics.ctx.fillStyle).toBe("cmyk(0%,50%,100%,0%)");
    expect(graphics.current.patternFill).toBe(false);
  });

  it("make the worker keep CMYK colors when asked", () => {
    const patched = applyPatches(workerSource, WORKER_PATCHES);
    expect(patched).toContain("disableCMYKToRGB: data.disableCMYKToRGB");
    expect(patched).toContain("if (self.options.disableCMYKToRGB) {");
    const getCmyk = patched.match(
      /key: "getCmyk",\n {6}value: (function getCmyk\(src\) \{[\s\S]*?\n {6}\})/,
    );
    expect(getCmyk).not.toBeNull();
    const fn = vm.runInNewContext("(" + (getCmyk as RegExpMatchArray)[1] + ")") as (
      src: number[],
    ) => Uint8Array;
    expect(Array.from(fn([0, 0.5, 0.257, 1]))).toEqual([0, 50, 25, 100]);
  });
});
