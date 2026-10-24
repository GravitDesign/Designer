import { afterEach, describe, expect, it, vi } from "vitest";
import { harfBuzzModule, loadHarfBuzz } from "./harfbuzz-module.ts";

const URL_IN_BROWSER = new URL("http://127.0.0.1:3192/bundle/harfbuzz-2.2.0-x.wasm");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function loadError(fetchImpl: () => Promise<Response>): Promise<Error> {
  vi.stubGlobal("fetch", vi.fn(fetchImpl));
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = await loadHarfBuzz(URL_IN_BROWSER).then(
    () => null,
    (e: unknown) => e as Error,
  );
  expect(error).toBeInstanceOf(Error);
  expect(consoleError).toHaveBeenCalledWith(error);
  return error as Error;
}

describe("loadHarfBuzz", () => {
  it("loads the .wasm the engine uses", () => {
    expect(typeof harfBuzzModule.exports.hb_buffer_create).toBe("function");
  });

  it("names the file and URL when the network fails", async () => {
    const error = await loadError(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(error.message).toBe(
      "The text engine cannot start: harfbuzz-2.2.0.wasm failed to load from " +
        URL_IN_BROWSER.href +
        " (Failed to fetch)",
    );
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it("names the file when the server answers 404", async () => {
    const error = await loadError(() =>
      Promise.resolve(new Response("not found", { status: 404 })),
    );
    expect(error.message).toMatch(/^The text engine cannot start: harfbuzz-2\.2\.0\.wasm .*404/);
  });

  it("names the file when an HTML page comes back instead of the .wasm", async () => {
    const error = await loadError(() =>
      Promise.resolve(new Response("<!doctype html><html></html>", { status: 200 })),
    );
    expect(error.message).toMatch(/^The text engine cannot start: harfbuzz-2\.2\.0\.wasm/);
    expect(error.cause).toBeInstanceOf(WebAssembly.CompileError);
  });
});
