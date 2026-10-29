// Small writer objects: arrays and graphics lists fed with sparse arrays
// (old GUtil.each skips holes), and PDFPath.quadraticCurveTo.
import { describe, expect, it } from "vitest";
import { PDFByteStream } from "./byte-stream.ts";
import { PDFGraphics } from "./content-stream.ts";
import { PDFMediaBox } from "./media-box.ts";
import { PDFBezierCurveTo } from "./path-commands.ts";
import { PDFPath } from "./path-writer.ts";
import { PDFArray } from "./pdf-array.ts";

function written(object: { write(output: PDFByteStream): void }): string {
  const output = new PDFByteStream();
  object.write(output);
  return Buffer.from(output.asArray()).toString("latin1");
}

const pageSource = { getPageSize: () => new PDFMediaBox(0, 0, 100, 50) };

describe("sparse arrays", () => {
  it("PDFArray.push skips holes like the old GUtil.each", () => {
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point
    const array = new PDFArray([1, , 3]);
    expect(array.size()).toBe(2);
    expect(written(array)).toBe("[1 3]");
  });

  it("PDFGraphics.add skips holes like the old GUtil.each", () => {
    const graphics = new PDFGraphics(pageSource as never);
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point
    graphics.add(["q", , "Q"]);
    expect(graphics.size()).toBe(2);
    expect(graphics.get(1)?.getValue()).toBe("Q");
  });
});

describe("PDFPath.quadraticCurveTo", () => {
  it("throws a TypeError on a fresh path (peek of an empty collection)", () => {
    const path = new PDFPath(pageSource);
    expect(() => path.quadraticCurveTo(10, 10, 20, 0)).toThrow(TypeError);
  });

  it("throws a TypeError after a command without a point (old code called the missing _x)", () => {
    const path = new PDFPath(pageSource);
    path.moveTo(0, 0);
    path.close();
    expect(() => path.quadraticCurveTo(10, 10, 20, 0)).toThrow(TypeError);
    // Nothing was added before the throw.
    expect(path.peek()).toBe("h");
  });

  it("raises the curve to a cubic one from the last point with the 2/3 formula", () => {
    const path = new PDFPath(pageSource);
    path.moveTo(0, 0);
    path.quadraticCurveTo(30, 60, 90, 0);
    const curve = path.peek();
    expect(curve).toBeInstanceOf(PDFBezierCurveTo);
    const bezier = curve as PDFBezierCurveTo;
    const points = [bezier.getPoint1(), bezier.getPoint2(), bezier.getPoint3()].map((p) => [
      p.getX(),
      p.getY(),
    ]);
    // c1 = start + 2/3 (control - start), c2 = end + 2/3 (control - end).
    expect(points).toEqual([
      [0 + (2 / 3) * 30, 0 + (2 / 3) * 60],
      [90 + (2 / 3) * (30 - 90), 0 + (2 / 3) * 60],
      [90, 0],
    ]);
  });

  it("continues from the end of a previous cubic curve", () => {
    const path = new PDFPath(pageSource);
    path.moveTo(0, 0);
    path.bezierCurveTo(1, 1, 2, 2, 30, 30);
    path.quadraticCurveTo(60, 30, 60, 60);
    const bezier = path.peek() as PDFBezierCurveTo;
    expect([bezier.getPoint1().getX(), bezier.getPoint1().getY()]).toEqual([30 + (2 / 3) * 30, 30]);
  });
});

describe("PDFByteStream.write", () => {
  it("writes tokens as UTF-8, ASCII or not, and grows its buffer", () => {
    const output = new PDFByteStream(4);
    output.write("/Name 12.5 ");
    output.write("(Grüße €)");
    output.write(true);
    output.write(-0.25);
    expect(Array.from(output.asArray())).toEqual(
      Array.from(Buffer.from("/Name 12.5 (Grüße €)true-0.25", "utf8")),
    );
    expect(output.getPosition()).toBe(Buffer.byteLength("/Name 12.5 (Grüße €)true-0.25"));
  });

  it("throws on a lone surrogate, as the old encodeURIComponent did", () => {
    const output = new PDFByteStream();
    output.write("ok");
    expect(() => output.write("(\uD800)")).toThrow(URIError);
    expect(output.getPosition()).toBe(2);
  });
});
