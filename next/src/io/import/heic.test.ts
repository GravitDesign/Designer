import { afterEach, describe, expect, it, vi } from "vitest";
import { HeicImport, setHeicConverterLoader } from "./heic.ts";

afterEach(() => {
  setHeicConverterLoader(null);
});

describe("HeicImport (FMT-IMPORT-019)", () => {
  it("loads the converter once and hands it the blob", async () => {
    const png = new Blob([new Uint8Array([1])], { type: "image/png" });
    const convert = vi.fn(async () => png);
    const load = vi.fn(async () => convert);
    setHeicConverterLoader(load);
    const input = new Blob([new Uint8Array([2])]);
    expect(await (await HeicImport.getInstance()).parse(input)).toBe(png);
    await HeicImport.getInstance();
    expect(load).toHaveBeenCalledOnce();
    expect(convert).toHaveBeenCalledWith({ blob: input });
  });

  it("rejects without a converter, so callers log a failed conversion", async () => {
    await expect(HeicImport.getInstance()).rejects.toThrow("HEIC conversion is not available");
  });
});
