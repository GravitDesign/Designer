import { gzip } from "pako";
import { describe, expect, it, vi } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import {
  EMPTY_INFINITE_CANVAS_CODE,
  checkEmptyInfiniteCanvas,
  documentRealFileSize,
  hasFileShrunk,
  hasPagesWithInfiniteEmptyCanvas,
  isFileTooSmall,
  needsLinkedFilesWarning,
} from "./save-checks.ts";

function infiniteScene(): Scene {
  const scene = new Scene(new Workspace());
  scene.getActivePage()?.setProperties(["w", "h"], [0, 0]);
  return scene;
}

describe("save checks", () => {
  it("refuses an empty infinite page with code 507, but not one with content", () => {
    const scene = infiniteScene();
    expect(hasPagesWithInfiniteEmptyCanvas(scene)).toBe(true);
    expect(checkEmptyInfiniteCanvas(scene)).toEqual({
      code: EMPTY_INFINITE_CANVAS_CODE,
      localeKey: { group: "GCommonNames", key: "text.error-emtpy-infinite-canvas" },
      noFailCall: true,
    });
    const rect = new Rectangle();
    rect.setProperty("trf", new Transform(10, 0, 0, 10, 20, 20));
    scene.getActivePage()?.appendChild(rect);
    expect(hasPagesWithInfiniteEmptyCanvas(scene)).toBe(false);
    expect(checkEmptyInfiniteCanvas(scene)).toBeNull();
  });

  it("does not refuse a fixed-size page, even an empty one", () => {
    const scene = new Scene(new Workspace());
    scene.getActivePage()?.setProperties(["w", "h"], [100, 100]);
    expect(hasPagesWithInfiniteEmptyCanvas(scene)).toBe(false);
  });

  it("does not refuse a hidden page, but a hidden empty infinite one (BUG-092)", () => {
    const scene = new Scene(new Workspace());
    const page = scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>;
    page.setProperties(["w", "h", "vis"], [100, 100, false]);
    expect(hasPagesWithInfiniteEmptyCanvas(scene)).toBe(false);
    page.setProperties(["w", "h"], [0, 0]);
    expect(hasPagesWithInfiniteEmptyCanvas(scene)).toBe(true);
    const rect = new Rectangle();
    rect.setProperty("trf", new Transform(10, 0, 0, 10, 20, 20));
    page.appendChild(rect);
    expect(hasPagesWithInfiniteEmptyCanvas(scene)).toBe(false);
  });

  it("warns about linked files only when the scene links one", () => {
    expect(needsLinkedFilesWarning(infiniteScene())).toBe(false);
  });

  it("flags files under 200 bytes and files that shrank below half", () => {
    expect(isFileTooSmall(199)).toBe(true);
    expect(isFileTooSmall(200)).toBe(false);
    expect(isFileTooSmall(10, true)).toBe(false);
    expect(hasFileShrunk(1000, 499)).toBe(true);
    expect(hasFileShrunk(1000, 500)).toBe(false);
    expect(hasFileShrunk(1000, 0)).toBe(false);
    expect(hasFileShrunk(400, 900)).toBe(false);
  });

  it("measures the real file size by gzipping a fresh save serialization", () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    const scene = infiniteScene();
    const size = documentRealFileSize(scene);
    const json = Node.serialize(scene, { save: true, singleton: false }) as string;
    expect(size).toBe(gzip(json, { level: 9 }).length);
    expect(size).toBeGreaterThan(20);
  });
});
