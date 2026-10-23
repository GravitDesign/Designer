import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GObject } from "../../core/object.ts";
import { registerGLBlurEffect } from "../late-bound.ts";
import { PaintCanvas } from "../paint-canvas.ts";
import { installFakeCanvas } from "../testing/fake-canvas.ts";
import { GLContext, GLTexture, type SharedGLContext } from "./gl-context.ts";
import { Shader } from "./shader.ts";
import { WebGLRenderer, type ShaderClass } from "./webgl-renderer.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
afterEach(() => {
  vi.restoreAllMocks();
});

class DummyShader {
  destroyed = 0;
  destroy(): void {
    this.destroyed++;
  }
}

class Host extends WebGLRenderer(GObject) {
  override getShaderClass(): ShaderClass {
    return DummyShader as unknown as ShaderClass;
  }
}

describe("GLContext.createTexture", () => {
  it("reads width and height only from three or more arguments", () => {
    const fromCanvas = vi.spyOn(GLTexture, "fromCanvas").mockReturnValue(undefined);
    const fromBytes = vi.spyOn(GLTexture, "fromBytes").mockReturnValue(undefined);
    const canvas = document.createElement("canvas");
    GLContext.createTexture(canvas, 5);
    GLContext.createTexture(canvas, 5, 6);
    const bytes = new Uint8Array(4);
    GLContext.createTexture(bytes, 3);
    GLContext.createTexture(bytes, 3, 4);
    expect(fromCanvas.mock.calls).toEqual([
      [canvas, undefined, undefined],
      [canvas, 5, 6],
    ]);
    expect(fromBytes.mock.calls).toEqual([
      [undefined, undefined, bytes],
      [3, 4, bytes],
    ]);
  });
});

describe("WebGLRenderer", () => {
  it("throws on an empty backup slot when a third GL context shows up", () => {
    const contexts = [{}, {}, {}] as unknown as SharedGLContext[];
    const getGL = vi.spyOn(GLContext, "getGLContext");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const host = new Host();
    getGL.mockReturnValue(contexts[0] as SharedGLContext);
    expect(host.prepareShader()).toBe(true);
    // A second context: the first one's state goes into the backup.
    getGL.mockReturnValue(contexts[1] as SharedGLContext);
    expect(host.prepareShader()).toBe(true);
    expect(host.backupShaderData?.currentGL).toBe(contexts[0]);
    // A third: the old code called destroy on every backup slot, null ones too.
    getGL.mockReturnValue(contexts[2] as SharedGLContext);
    expect(() => host.prepareShader()).toThrow(TypeError);
    expect(warn).toHaveBeenCalledWith("third webgl type created");
  });

  it("draws nothing for the effect whose GL-bug probe can't prepare its blur shader", () => {
    registerGLBlurEffect(
      class {
        shaderInstance = null;
        prepareShader(): boolean {
          return false;
        }
      },
    );
    const apply = vi.spyOn(Shader, "apply").mockReturnValue("applied" as never);
    const host = new Host();
    host._isAffectedByGLBug = true;
    const canvas = new PaintCanvas(false, true);
    canvas.resize(4, 4);
    canvas.prepare();
    expect(host.drawShader(canvas, {}, 1)).toBeNull();
    expect(apply).not.toHaveBeenCalled();
    // The probe ran once and found no bug, so the next effect is drawn.
    expect(host.drawShader(canvas, {}, 1)).toBe("applied");
  });
});
