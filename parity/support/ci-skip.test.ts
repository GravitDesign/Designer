import { afterEach, describe, expect, it, vi } from "vitest";
import { skippedOnCi } from "./ci-skip.ts";

describe("CI skip list", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips only the renderer-dependent scenarios, and only on CI", () => {
    vi.stubEnv("CI", "1");
    for (const id of [
      "engine-model/render/blend-layer-hue",
      "corpus/blend-modes/render-light",
      "corpus/matrix/blend-and-composite",
      "import-export/corpus/effects-webgl-3",
      "io-export-pdf/corpus/effects-large",
      "import-export/export/pdf/effects-150dpi.render",
      "import-export/ui/print-pdf",
      "electron/window",
    ]) {
      expect(skippedOnCi(id), id).toBe(true);
    }
    for (const id of [
      "engine-model/render/blend-layer-normal",
      "engine-model/render/blend-element-multiply",
      "corpus/shapes-rectangles/render-light",
      "import-export/corpus/masks",
      "import-export/export/pdf/effects-72dpi",
      "import-export/ui/print-dialog",
      "electron/lifecycle",
      "brand/welcome-light",
    ]) {
      expect(skippedOnCi(id), id).toBe(false);
    }
    vi.stubEnv("CI", "");
    expect(skippedOnCi("electron/window")).toBe(false);
  });
});
