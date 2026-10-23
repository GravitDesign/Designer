import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId } from "../core/object.ts";
import { PaintContext } from "./paint-context.ts";
import type { PaintCanvas } from "./paint-canvas.ts";
import { RenderJob } from "./render-job.ts";
import { ScenePaintConfiguration } from "./scene-paint-configuration.ts";
import { GLTextures } from "./gl-textures.ts";
import { Shader } from "./webgl/shader.ts";

const fakeCanvas = (name: string, destroyed: string[]) =>
  ({ destroy: () => destroyed.push(name) }) as unknown as PaintCanvas;

describe("PaintContext", () => {
  it("keeps the old type id and editor colors", () => {
    expect(getTypeId(PaintContext)).toBe(83);
    const context = new PaintContext();
    expect((context.selectionOutlineColor as RGBColor).toScreen()).toEqual([40, 128, 230]);
    expect(context.selectionShapeOutlineColor).toBe(context.selectionOutlineColor);
    expect(Object.keys(context).sort()).toEqual(["canvasStack", "outlineColors"]);
  });

  it("stacks canvases and destroys the stacked ones", () => {
    const destroyed: string[] = [];
    const context = new PaintContext();
    const a = fakeCanvas("a", destroyed);
    const b = fakeCanvas("b", destroyed);
    context.canvas = a;
    expect(context.pushCanvas(b)).toBe(a);
    expect(context.canvas).toBe(b);
    expect(context.getRootCanvas()).toBe(a);
    context.popCanvas();
    expect(context.canvas).toBe(a);
    expect(() => context.popCanvas()).toThrow("Invalid call, stack length is zero.");
    context.pushCanvas(b);
    context.destroy();
    expect(destroyed).toEqual(["a"]);
    expect(context.canvas).toBeNull();
  });

  it("uses the last outline color or black", () => {
    const context = new PaintContext();
    expect(context.isOutline()).toBe(false);
    expect(context.getOutlineColor()).toBe(RGBColor.BLACK);
    const red = new RGBColor([255, 0, 0]);
    context.outlineColors?.push(new RGBColor([1, 1, 1]), red);
    expect(context.isOutline()).toBe(true);
    expect(context.getOutlineColor()).toBe(red);
  });
});

describe("ScenePaintConfiguration", () => {
  it("has its defaults on the prototype", () => {
    const config = new ScenePaintConfiguration();
    expect(Object.keys(config)).toEqual([]);
    expect([config.paintMode, config.thumbnailSize, config.enableFxCache]).toEqual(["F", 85, true]);
    expect(getTypeId(ScenePaintConfiguration)).toBe(82);
  });

  it("answers visibility and outline questions", () => {
    const config = new ScenePaintConfiguration();
    expect(config.isOutline()).toBe(false);
    expect(config.isOutline({ isOutline: () => true })).toBe(true);
    expect(config.isElementAnnotationsVisible()).toBe(false);
    config.elementAnnotations = true;
    expect(config.isElementAnnotationsVisible({ getProperty: (n) => n === "rsv" })).toBe(false);
    config.showResolvedAnnotations = true;
    expect(config.isElementAnnotationsVisible({ getProperty: (n) => n === "rsv" })).toBe(true);
    config.annotations = false;
    expect(config.isGuidesVisible()).toBe(false);
    expect(config.isClipToPage()).toBe(false);
    config.paintMode = ScenePaintConfiguration.PaintMode.Output;
    expect(config.isClipToPage()).toBe(true);
    expect(ScenePaintConfiguration.PaintModeName.L.getKey()).toBe("paint.outline");
  });
});

describe("RenderJob", () => {
  it("copies the parameters and never expires without a time limit", () => {
    const parameters = { noWebGL: true };
    const job = new RenderJob({ contextId: 7 }, 0, parameters);
    parameters.noWebGL = false;
    expect(job.parameters).toEqual({ noWebGL: true });
    expect(job.getId()).toBe(7);
    expect(job.isExpired()).toBe(false);
    const limited = new RenderJob({ contextId: 8 }, 1);
    limited._jobStart -= 10;
    expect(limited.isExpired()).toBe(true);
    job.lock();
    job.unlock();
    expect(() => job.unlock()).toThrow("GRenderJob: invalid lock");
  });
});

describe("GLTextures", () => {
  it("keeps real textures in one slot the array walks never see", () => {
    const texture = { id: { toString: () => "[object WebGLTexture]" }, width: 2, height: 2 };
    GLTextures.addTexture(texture);
    expect(GLTextures.checkMemory()).toEqual({ textures: 0, unrendered: 0, bytes: 0 });
    GLTextures.deleteTexture(texture);
    expect(Object.keys(GLTextures._textures)).toEqual([]);
  });
});

describe("Shader statics", () => {
  const areas = (list: number[][] | null) =>
    ({
      getAreas: () =>
        list
          ? list.map(([, , w, h]) => ({
              getWidth: () => w as number,
              getHeight: () => h as number,
            }))
          : null,
    }) as unknown as PaintCanvas;

  it("sizes tiles from the areas and the padding", () => {
    expect(Shader._getMaxSize(areas(null), [0, 0, 0, 0])).toBe(1024);
    expect(Shader._getMaxSize(areas([[0, 0, 100, 50]]), [0, 0, 0, 0])).toBe(256);
    expect(Shader._getMaxSize(areas([[0, 0, 600, 50]]), [200, 0, 200, 0])).toBe(2000);
    expect(Shader.shouldEnableTiles(2048, 2048)).toBe(false);
    expect(Shader.shouldEnableTiles(2049, 2048)).toBe(true);
  });

  it("lowers the detail level for a padding over a third of the tile", () => {
    expect(Shader.computeDownScale(areas(null), [10, 10, 10, 10])).toBe(1);
    expect(Shader.computeDownScale(areas(null), [400, 300, 400, 300], 2)).toBe(
      2 * ((0.33 * 2048) / 600),
    );
  });

  it("keeps the broken _genAreas", () => {
    expect(Shader._genAreas(null, null as never)).toBeNull();
    expect(() => Shader._genAreas([], null as never)).toThrow(ReferenceError);
  });
});
