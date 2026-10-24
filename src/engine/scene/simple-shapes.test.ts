import { describe, expect, it } from "vitest";
import fixture from "./ready-shapes.fixture.json";
import shapes from "./simple-shapes.json";

describe("simple-shapes.json", () => {
  it("is the old ready-shape table (designer.browser.dev.js module 1542)", () => {
    expect(shapes).toHaveLength(29);
    expect(shapes.map((s) => s.name).slice(0, 3)).toEqual([
      "Rectangle",
      "Rounded Rectangle",
      shapes[2]?.name,
    ]);
    // The engine's vertex processor fixture recorded the same catalogue.
    expect(shapes).toEqual((fixture as { catalogue: unknown[] }).catalogue);
  });
});
