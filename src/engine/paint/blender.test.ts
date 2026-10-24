import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BlendShader } from "./webgl/blend-shader.ts";
import { PaintCanvas } from "./paint-canvas.ts";
import { installFakeCanvas, logOf } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

describe("Blender", () => {
  it("maps normal to source-over", () => {
    const canvas = new PaintCanvas(false, true);
    canvas._blender.globalCompositeOperation = "normal";
    expect(canvas._blender.globalCompositeOperation).toBe("source-over");
  });

  it("draws browser operators directly and sets them only when they change", () => {
    const canvas = new PaintCanvas(false, true);
    canvas.resize(10, 10);
    const blender = canvas._blender;
    const start = logOf(canvas).length;
    blender.globalCompositeOperation = "source-over";
    blender.fillRect(0, 0, 1, 1);
    blender.globalCompositeOperation = "screen";
    blender.fill("evenodd");
    blender.stroke();
    expect(logOf(canvas).slice(start)).toEqual([
      "fillRect(0,0,1,1)",
      'globalCompositeOperation="screen"',
      'fill("evenodd")',
      "stroke()",
    ]);
  });

  it("takes operators the context refuses down the WebGL path (nothing without WebGL)", () => {
    const canvas = new PaintCanvas(false, true);
    canvas.resize(10, 10);
    const blender = canvas._blender;
    blender.globalCompositeOperation = "linear_burn";
    expect(blender._isCustomOperation()).toBe(true);
    const start = logOf(canvas).length;
    // No WebGL in Node: prepareShader fails and the draw is dropped, as in a
    // browser without WebGL.
    blender.fillRect(0, 0, 5, 5);
    expect(logOf(canvas).slice(start)).toEqual([]);
  });

  it("uses the short drawImage forms where they fit", () => {
    const canvas = new PaintCanvas(false, true);
    const image = new PaintCanvas(false, true);
    image.resize(20, 10);
    const source = image._canvasContext.canvas;
    const start = logOf(canvas).length;
    canvas._blender.drawImage(source, 0, 0, 20, 10, 5, 6, 20, 10);
    canvas._blender.drawImage(source, 0, 0, 20, 10, 5, 6, 40, 20);
    canvas._blender.drawImage(source, 1, 0, 19, 10, 5, 6, 19, 10);
    canvas._blender.drawImage(source, 0, 0, 0, 10, 5, 6, 19, 10);
    canvas._blender.drawImage(source, 3, 4);
    const id = /canvas#\d+/.exec(String(logOf(canvas).slice(start)[0]))?.[0];
    expect(logOf(canvas).slice(start)).toEqual([
      `drawImage(${id},5,6)`,
      `drawImage(${id},5,6,40,20)`,
      `drawImage(${id},1,0,19,10,5,6,19,10)`,
      `drawImage(${id},3,4)`,
    ]);
  });
});

describe("BlendShader", () => {
  it("builds one GLSL source per mode around its blend function", () => {
    const shader = Object.create(BlendShader.prototype) as BlendShader;
    const source = shader.getShaderSource("subtract");
    expect(source.startsWith("        vec3 blend (vec3 src, vec3 dst)\n            {\n")).toBe(
      true,
    );
    expect(source).toContain("max(0.0, dst.x - src.x)");
    expect(source).toContain("clamp(blend(dst.rgb, src.rgb), 0.0, 1.0) * src.a");
    expect(BlendShader.BlendModes).toHaveLength(BlendShader.Blenders.length);
  });
});
