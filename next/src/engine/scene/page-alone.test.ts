// Page without scene.ts in the module graph: getActiveLayer must still
// find the selector engine (the old Page loaded it on demand).
import { describe, expect, it } from "vitest";
import { Layer } from "./layer.ts";
import { Page } from "./page.ts";

describe("Page on its own", () => {
  it("finds its active layer without the scene module", () => {
    const page = new Page();
    const layer = new Layer();
    page.appendChild(layer);
    expect(page.getActiveLayer()).toBeNull();
    page.setActiveLayer(layer);
    expect(page.getActiveLayer()).toBe(layer);
  });
});
