import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PSHost } from "./host.ts";
import { PSInterpreter } from "./interpreter.ts";

const CORPUS = path.join(import.meta.dirname, "__fixtures__", "corpus");

interface MeshImage {
  type: string;
  value: number[];
  colorSpace: string;
  width: number;
  height: number;
  transform: number[];
}

/** The messages a program posts, uncompacted. */
function run(program: string): { func: string; data: unknown[] }[] {
  const messages: { func: string; data: unknown[] }[] = [];
  const host: PSHost = {
    postMessage(message) {
      messages.push(JSON.parse(JSON.stringify({ func: message.func, data: message.data })));
    },
    close() {},
    setTimeout() {
      return 0;
    },
    shouldYield: () => false,
  };
  const interpreter = new PSInterpreter(host);
  interpreter.init(new TextEncoder().encode(program), {
    gDevelopment: false,
    maxWaitTime: 3e5,
    outlineFonts: true,
  });
  interpreter.run();
  return messages;
}

/** The image of the program's first shfill. */
function shfillImage(program: string): MeshImage {
  const shfill = run(program).find((m) => m.func === "shfill");
  expect(shfill, "shfill").toBeDefined();
  return shfill?.data[0] as MeshImage;
}

/** The colour components of the cell at (x, y) of a 100 x 100 image over 0..100. */
function cell(image: MeshImage, x: number, y: number): number[] {
  const channels = image.colorSpace === "DeviceGray" ? 1 : 3;
  const at = (y * image.width + x) * channels;
  return image.value.slice(at, at + channels);
}

function expectNear(actual: number[], expected: number[]): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, i) => expect(Math.abs(value - (expected[i] as number))).toBeLessThan(8));
}

// One triangle: (0, 0) red, (0, 100) green, (100, 100) blue. At the cell
// centre (x + 0.5, y + 0.5) its colour is 255 * (1 - y', y' - x', x')
// with x' and y' the centre / 100.
const TRIANGLE_BYTES = "00 00 00 ff0000 00 00 ff 00ff00 00 ff ff 0000ff";
const RGB_8BIT =
  "/ColorSpace /DeviceRGB /BitsPerCoordinate 8 /BitsPerComponent 8 /BitsPerFlag 8 " +
  "/Decode [0 100 0 100 0 1 0 1 0 1]";
const expected = (x: number, y: number) => {
  const u = (x + 0.5) / 100;
  const v = (y + 0.5) / 100;
  return [255 * (1 - v), 255 * (v - u), 255 * u];
};

describe("mesh shadings (BUG-116)", () => {
  it("draws a free-form triangle from string data", () => {
    const image = shfillImage(
      `%!PS\n<< /ShadingType 4 ${RGB_8BIT} /DataSource <${TRIANGLE_BYTES}> >> shfill\n`,
    );
    expect([image.type, image.width, image.height]).toEqual(["imageData", 100, 100]);
    expectNear(cell(image, 20, 60), expected(20, 60));
    expectNear(cell(image, 10, 90), expected(10, 90));
    expectNear(cell(image, 50, 80), expected(50, 80));
  });

  it("draws a free-form triangle from array data, without bits or Decode", () => {
    const image = shfillImage(
      "%!PS\n<< /ShadingType 4 /ColorSpace /DeviceRGB /DataSource " +
        "[0 0 0 1 0 0  0 0 100 0 1 0  0 100 100 0 0 1] >> shfill\n",
    );
    expect([image.width, image.height]).toEqual([100, 100]);
    expectNear(cell(image, 20, 60), expected(20, 60));
    expectNear(cell(image, 50, 80), expected(50, 80));
  });

  it("joins every row of a lattice", () => {
    // Gray = y / 100 over three rows at y 0, 50 and 100.
    const image = shfillImage(
      "%!PS\n<< /ShadingType 5 /ColorSpace /DeviceGray /BitsPerCoordinate 8 " +
        "/BitsPerComponent 8 /VerticesPerRow 2 /Decode [0 100 0 100 0 1] " +
        "/DataSource <000000 ff0000 008080 ff8080 00ffff ffffff> >> shfill\n",
    );
    expect(image.colorSpace).toBe("DeviceGray");
    expectNear(cell(image, 50, 20), [52]);
    // The third row.
    expectNear(cell(image, 50, 80), [205]);
    expectNear(cell(image, 10, 95), [243]);
  });

  it("colours the vertices' t through the shading's Function", () => {
    // t = 0, 0, 1 at (0, 0), (100, 0), (0, 100); red to blue.
    const image = shfillImage(
      "%!PS\n<< /ShadingType 4 /ColorSpace /DeviceRGB /BitsPerCoordinate 8 " +
        "/BitsPerComponent 8 /BitsPerFlag 8 /Decode [0 100 0 100 0 1] " +
        "/Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> " +
        "/DataSource <00 00 00 00 00 ff 00 00 00 00 ff ff> >> shfill\n",
    );
    const t = 0.205;
    expectNear(cell(image, 20, 20), [255 * (1 - t), 0, 255 * t]);
  });

  it("fills with a mesh pattern as the shading itself draws it", () => {
    const text = fs.readFileSync(path.join(CORPUS, "color-sh6-coons.ps"), "latin1");
    const shading = /<< \/ShadingType[\s\S]*?>>(?= shfill)/.exec(text)?.[0] as string;
    const direct = shfillImage(`%!PS\n${shading} shfill\n`);
    const fill = run(
      `%!PS\n/Pattern setcolorspace << /PatternType 2 /Shading ${shading} >> ` +
        "matrix makepattern setpattern 0 0 100 100 rectfill\n",
    ).find((m) => m.func === "fill");
    expect(fill?.data[1]).toEqual(direct);
    expect(direct.value.length).toBe(100 * 100 * 3);
  });
});
