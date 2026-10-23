import { describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { buildPreview, firstPage } from "./preview.ts";

describe("buildPreview", () => {
  it("uses the first page among the scene's children", () => {
    const scene = new Scene(new Workspace());
    const first = scene.getActivePage();
    scene.insertPage();
    expect(firstPage(scene)).toBe(first);
    expect(firstPage(new Scene(new Workspace(), true))).toBeNull();
  });

  it("never settles without a page", async () => {
    const pending = buildPreview(new Scene(new Workspace(), true));
    const result = await Promise.race([
      pending.then(() => "settled"),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 100)),
    ]);
    expect(result).toBe("pending");
  });

  it("rejects when the first page has nothing to draw", async () => {
    const scene = new Scene(new Workspace());
    const page = scene.getActivePage();
    page?.setProperties(["w", "h"], [100, 100]);
    if (page) vi.spyOn(page, "toBitmap").mockReturnValue(null);
    await expect(buildPreview(scene)).rejects.toBeInstanceOf(TypeError);
  });

  it("draws the page fitted to 600 px on white", () => {
    const scene = new Scene(new Workspace());
    const page = scene.getActivePage();
    page?.setProperties(["w", "h"], [1200, 300]);
    page?.appendChild(new Rectangle());
    const calls: unknown[][] = [];
    if (page) {
      vi.spyOn(page, "toBitmap").mockImplementation((...args: unknown[]) => {
        calls.push(args);
        return null;
      });
    }
    void buildPreview(scene).catch(() => {});
    expect(calls).toHaveLength(1);
    const [sx, sy, mode, background] = calls[0] as [number, number, number, RGBColor];
    expect([sx, sy, mode]).toEqual([0.5, 0.5, 2]);
    expect(background).toBe(RGBColor.WHITE);
  });
});
