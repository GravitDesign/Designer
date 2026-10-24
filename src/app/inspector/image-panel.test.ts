import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Image } from "../../engine/scene/image.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { SubSelectTool } from "../../editor/tools/sub-select-tool.ts";
import type { Document } from "../document/document.ts";
import type { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { ColorThief, type RGB } from "./color-thief.ts";
import { cropImage, replaceImage } from "./image-crop.ts";
import { ImageProperties } from "./image-properties.ts";
import type { InspectedElements } from "./properties.ts";
import {
  click,
  documentOf,
  find,
  installShapeTestDom,
  sceneWith,
  type ShapeTestDom,
} from "./shape-panels-dom.testing.ts";

/** A tool manager that records activations; `active` is the active tool. */
function toolManager(active: unknown) {
  const calls: unknown[][] = [];
  const modes: unknown[] = [];
  const manager = {
    calls,
    modes,
    active,
    getActiveTool: () => manager.active,
    activateTool(tool: unknown, ...rest: unknown[]) {
      calls.push([tool, ...rest]);
      if (tool === PointerTool)
        manager.active = Object.assign(Object.create(SelectTool.prototype) as object, {
          setEditMode: (mode: unknown) => modes.push(mode),
        });
      else manager.active = Object.create(SubSelectTool.prototype) as object;
    },
  };
  return manager;
}

let env: ShapeTestDom;
afterEach(() => {
  vi.restoreAllMocks();
  env.uninstall();
});

describe("cropImage", () => {
  beforeEach(() => {
    env = installShapeTestDom();
  });

  function image(): Image {
    const result = new Image();
    result.setProperties(["iw", "ih"], [100, 50]);
    result.setProperty("trf", new Transform(2, 0, 0, 2, 5, 5));
    result.setProperty("tl_sx", 4);
    return result;
  }

  it("resets a shown crop, then turns the sub-select tool on", () => {
    const manager = toolManager(null);
    env.uninstall();
    env = installShapeTestDom({ getToolManager: () => manager });
    const target = image();
    const transform = new Transform(1, 0, 0, 1, 7, 7);
    vi.spyOn(target, "getImageTransform").mockReturnValue(transform);
    cropImage(target, true);
    expect((target.getProperty("trf") as Transform).getMatrix()).toEqual(transform.getMatrix());
    expect([target.getProperty("ut"), target.getProperty("tl_sx")]).toEqual([true, 0]);
    expect(manager.calls).toEqual([[SubSelectTool, null, true]]);
  });

  it("keeps the crop without noCrop and goes back to the pointer in select mode", () => {
    const manager = toolManager(Object.create(SubSelectTool.prototype));
    env.uninstall();
    env = installShapeTestDom({ getToolManager: () => manager });
    const target = image();
    cropImage(target, false);
    expect(target.getProperty("tl_sx")).toBe(4);
    expect(manager.calls).toEqual([[PointerTool, null, true]]);
    expect(manager.modes).toEqual([SelectTool.EditMode.Select]);
  });
});

describe("replaceImage", () => {
  const g = globalThis as unknown as Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  let messages: unknown[];
  let bitmaps: { naturalWidth: number; naturalHeight: number };
  let dataUrl: string;

  beforeEach(() => {
    messages = [];
    bitmaps = { naturalWidth: 300, naturalHeight: 200 };
    dataUrl = "data:image/png;base64,AAAA";
    saved.FileReader = g.FileReader;
    g.FileReader = class {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = dataUrl;
        this.onload?.();
      }
    };
    // Without the late message dialog module the message goes to console.warn.
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      if (args[0] === "[message dialog]") messages.push(args[1]);
    });
  });

  afterEach(() => {
    g.FileReader = saved.FileReader;
    delete g.Image;
  });

  function setup(storageOnDocument: boolean, bytes: number) {
    const manager = toolManager(null);
    const prompts: unknown[][] = [];
    const storage = {
      canPromptOpen: () => true,
      openPrompt(types: unknown, done: (item: unknown) => void, multiple: unknown) {
        prompts.push([types, multiple]);
        done({ read: (fn: (data: unknown) => void) => fn(new Uint8Array(bytes)) });
      },
    };
    env = installShapeTestDom({
      getToolManager: () => manager,
      getDefaultStorage: () => (storageOnDocument ? null : storage),
    });
    g.Image = (window as unknown as Record<string, unknown>).Image = class {
      naturalWidth = bitmaps.naturalWidth;
      naturalHeight = bitmaps.naturalHeight;
      onload: (() => void) | null = null;
      set src(_url: string) {
        this.onload?.();
      }
    };
    const target = new Image();
    target.setProperty("trf", new Transform(10, 0, 0, 10, 40, 60));
    sceneWith(target);
    const document = { getStorage: () => (storageOnDocument ? storage : null) };
    return { manager, prompts, target, document };
  }

  it("puts the picked bitmap in at the image's top left, from the default storage", () => {
    const { manager, prompts, target, document } = setup(false, 10);
    replaceImage(target, document);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.[1]).toBe(false);
    // The scene keeps the data URL in its dictionary and stores a reference.
    expect(target.getProperty("url")).toMatch(/^dictionary:\/\//);
    expect([target.getProperty("iw"), target.getProperty("ih")]).toEqual([300, 200]);
    expect((target.getProperty("itrf") as Transform).getMatrix()).toEqual(
      new Transform().translated(40, 60).getMatrix(),
    );
    expect(manager.calls).toEqual([[PointerTool]]);
    expect(manager.modes).toEqual([SelectTool.EditMode.Select, SelectTool.EditMode.Edit]);
    expect(messages).toEqual([]);
  });

  it("refuses too big files, data URLs and bitmaps", () => {
    const tooBig = (expectNothing: () => void) => {
      expectNothing();
      expect(messages).toHaveLength(1);
      expect(String(messages[0])).toContain("huge image");
      messages.length = 0;
    };
    let { target, document } = setup(true, Platform.maxPngDataSize + 1);
    replaceImage(target, document);
    tooBig(() => expect(target.getProperty("url")).toBeNull());
    env.uninstall();

    ({ target, document } = setup(true, 10));
    dataUrl = "x".repeat(Platform.maxImgDataUrlLength + 1);
    replaceImage(target, document);
    tooBig(() => expect(target.getProperty("url")).toBeNull());
    env.uninstall();

    dataUrl = "data:image/png;base64,AAAA";
    bitmaps = { naturalWidth: Platform.maxImgLinearDimension + 1, naturalHeight: 1 };
    ({ target, document } = setup(true, 10));
    replaceImage(target, document);
    tooBig(() => expect(target.getProperty("url")).toBeNull());
  });
});

describe("ImageProperties", () => {
  function shown(detail: boolean) {
    const log: string[] = [];
    const image = new Image();
    const document = documentOf(sceneWith(image), log, { hasSelectionDetail: () => detail });
    env = installShapeTestDom({ getActiveDocument: () => document });
    const panel = env.dom.document.createElement("div");
    const controls = env.dom.document.createElement("div");
    const properties = new ImageProperties();
    properties.init(panel as unknown as HTMLElement, controls as unknown as HTMLElement);
    expect(properties.update(document as Document, [image] as InspectedElements)).toBe(true);
    return { properties, panel, controls, image };
  }

  it("names the crop button after the selection detail", () => {
    expect(find(shown(false).panel, ".crop-label").textContent).toBe("Crop");
    env.uninstall();
    expect(find(shown(true).panel, ".crop-label").textContent).toBe("No crop");
  });

  it("shows the colour profile status while checking or converting only", () => {
    const { properties, controls } = shown(false);
    const status = find(controls, ".g-image-convert-status");
    properties._updateConvertStatus(Image.ConvertStatus.Checking);
    expect([status.style.display, find(status, "span").textContent]).toEqual([
      "",
      "Check CMYK Profile...",
    ]);
    properties._updateConvertStatus(Image.ConvertStatus.Converting);
    expect(find(status, "span").textContent).toBe("Loading CMYK Profile...");
    properties._updateConvertStatus(null);
    expect(status.style.display).toBe("none");
    expect(find(status, "span").textContent).toBe("Loading CMYK Profile...");
  });

  it("shows the dominant colour, then up to seven other palette colours", () => {
    const { properties, panel, image } = shown(false);
    vi.spyOn(image, "getImage").mockReturnValue({} as never);
    vi.spyOn(ColorThief.prototype, "getColor").mockReturnValue([10, 20, 30]);
    const palette: RGB[] = [[10, 20, 30], ...Array.from({ length: 10 }, (_, i): RGB => [i, i, i])];
    vi.spyOn(ColorThief.prototype, "getPalette").mockReturnValue(palette);
    properties._updateImagePalette();
    const swatches = find(panel, '[data-image-palette="palette"]').children;
    expect(
      swatches.map((swatch) => (swatch.style as unknown as { background: string }).background),
    ).toEqual(
      [[10, 20, 30], ...palette.slice(1, 8)].map((rgb) =>
        Pattern.asCSSBackground(new RGBColor(rgb)),
      ),
    );
    expect(
      (find(panel, '[data-image-palette="button"]') as unknown as { disabled: boolean }).disabled,
    ).toBe(true);
  });

  it("falls back to black when no dominant colour comes out", () => {
    const { properties, panel, image } = shown(false);
    vi.spyOn(image, "getImage").mockReturnValue({} as never);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(ColorThief.prototype, "getColor").mockImplementation(() => {
      throw new Error("tainted");
    });
    vi.spyOn(ColorThief.prototype, "getPalette").mockReturnValue([
      [0, 0, 0],
      [9, 9, 9],
    ]);
    properties._updateImagePalette();
    const swatches = find(panel, '[data-image-palette="palette"]').children;
    expect(
      swatches.map((swatch) => (swatch.style as unknown as { background: string }).background),
    ).toEqual([
      Pattern.asCSSBackground(RGBColor.BLACK),
      Pattern.asCSSBackground(new RGBColor([9, 9, 9])),
    ]);
  });

  it("resets the crop through the crop button when the image shows its crop", () => {
    const manager = toolManager(null);
    const log: string[] = [];
    const image = new Image();
    image.setProperty("tl_sx", 4);
    const document = documentOf(sceneWith(image), log, { hasSelectionDetail: () => true });
    env = installShapeTestDom({ getActiveDocument: () => document, getToolManager: () => manager });
    const panel = env.dom.document.createElement("div");
    const properties = new ImageProperties();
    properties.init(
      panel as unknown as HTMLElement,
      env.dom.document.createElement("div") as unknown as HTMLElement,
    );
    properties.update(document, [image] as InspectedElements);
    click(find(panel, 'button[data-action="handle-crop"]') as FakeElement);
    expect(image.getProperty("tl_sx")).toBe(0);
    expect(manager.calls).toEqual([[SubSelectTool, null, true]]);
  });
});
