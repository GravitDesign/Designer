import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { compileExpressionFunction } from "./ready-shape-expression.ts";

type Outcome = { value: unknown } | { error: string };

function outcome(run: () => unknown): Outcome {
  try {
    return { value: run() };
  } catch (error) {
    return { error: (error as Error).name };
  }
}

/** What the old code did: Function(...names, body), then the call. */
function viaFunction(names: string[], body: string, args: unknown[]): Outcome {
  const compiled = outcome(
    // The old code path, as the test oracle.
    () => Function(...names, body) as (...values: unknown[]) => unknown,
  );
  if ("error" in compiled) return compiled;
  return outcome(() => (compiled.value as (...values: unknown[]) => unknown)(...args));
}

function viaCompiler(names: string[], body: string, args: unknown[]): Outcome {
  const compiled = outcome(() => compileExpressionFunction(names, body));
  if ("error" in compiled) return compiled;
  return outcome(() => (compiled.value as (...values: unknown[]) => unknown)(...args));
}

/** Same value (Object.is, so -0 and NaN count) or the same error class. */
function expectSame(names: string[], body: string, args: unknown[]): void {
  const expected = viaFunction(names, body, args);
  const actual = viaCompiler(names, body, args);
  if ("value" in expected && "value" in actual) {
    if (typeof expected.value === "number") {
      expect(Object.is(actual.value, expected.value), `${body} gave ${String(actual.value)}`).toBe(
        true,
      );
    } else expect(actual.value, body).toEqual(expected.value);
  } else expect(actual, body).toEqual(expected);
}

describe("compileExpressionFunction", () => {
  const xy = ["x", "y"];
  const numbers = [0, -0, 1, -1, 0.5, -0.999, 2.75, 1e-9, 123456.789, NaN, Infinity];

  it.each([
    "x",
    "-x",
    "- -x",
    "1 + x * 2 - y / 3",
    "x - y - 1",
    "x / y / 2",
    "2 ** 3 ** 2",
    "(-2) ** 2",
    "x ** -1",
    "2 ** -x ** 2",
    "sin(x) * cos(y)",
    "Math.atan2(y, x)",
    "Math.sqrt(x * x + y * y)",
    "Math.max(-0.9, ( Math.min(0.9, ( x )) ))",
    "Math.max(0, ( -0 ))",
    "Math.min(x, y)",
    "Math.max()",
    "Math.round(x) + Math.trunc(y) + Math.sign(-x) + Math.ceil(y) + Math.floor(x)",
    "Math.exp(x) + Math.log(y) + Math.tan(x) + Math.asin(y) + Math.acos(x) + Math.atan(y)",
    "Math.abs(x - y)",
    "1.5 + .5 + 5. + 1e3 + 1E-2 + 2.5e+1",
    "0x1F + 0o17 + 0b101 + 0X0a",
    "012 + 08 + 09.5 + 019",
    "07.5",
    "1_000 + 0x_1",
    "1__0",
    "1_",
    "0_1",
    "1n",
    "1n + 1",
    "x++ + x",
    "++x + x",
    "x-- - --y",
    "1++",
    "++1",
    "(x)++ + x",
    "x+++y",
    "x++y",
    "x--y",
    "x---y",
    "-2 ** 2",
    "typeof x ** 2",
    "x, y",
    "(x, y)",
    "2x",
    "1.X",
    "x // comment",
    "Math.max(1, ( x // ))",
    "x /* c */ + y",
    "x /* open",
    "z",
    "NaN + Infinity",
    "undefined",
    "null + true + false",
    "typeof z",
    "void x",
    "x(1)",
    "(1)(2)",
    "x[0]",
    "Math.sin",
    "",
    ";",
    "x;;",
    "x y",
    "(x",
    "x)",
    "x.",
    "if",
  ])("%s with x, y", (expression) => {
    for (const x of numbers) {
      for (const y of [0.25, -0]) {
        expectSame(xy, "return " + expression + ";", [x, y]);
      }
    }
  });

  it.each([
    "a[0].getX()",
    "a[1].getY() - a[0].getX()",
    "Math.sqrt((1 + a[0].getX()) * (1 + a[0].getX()) * 2) * 0.310026286",
    "a[0][0]",
    "a[0].getX",
    "a[2].getX()",
    "a.getX()",
    "a[0].getX().getY()",
    "a[0]++ + a[0]",
    "a[0].getX()++",
    "a.length",
    "a[0] + 1",
    "a[01].getY()",
    "a[0x1].getY()",
    "a[1 - 1].getX()",
  ])("%s with a point list", (expression) => {
    const points = () => [new Point(0.25, -0.5), new Point(3, 4)];
    expectSame(["a"], "return " + expression + ";", [points()]);
  });

  it("handles parameter lists the way Function did", () => {
    for (const names of [
      [],
      ["a", "a"],
      ["a", ""],
      ["", "a"],
      ["a b"],
      ["null"],
      ["undefined"],
      ["Math"],
      ["a, b"],
      ["if"],
    ]) {
      expectSame(names, "return a;", [1, 2]);
      expectSame(names, "return Math.abs(-1);", [1, 2]);
    }
  });

  it("updates a parameter only in the call", () => {
    const f = compileExpressionFunction(["x"], "return x++ + x;");
    expect(f(1)).toBe(3);
    expect(f(1)).toBe(3);
  });

  it("never reaches the prototype chain or other globals", () => {
    const steal = (body: string, names: string[] = ["a"]) =>
      outcome(() => compileExpressionFunction(names, body)([[new Point(1, 2)]]));
    expect(steal("return a.constructor;")).toEqual({ value: undefined });
    expect(steal("return a[0].constructor;")).toEqual({ value: undefined });
    expect(steal("return Math.random();")).toEqual({ error: "TypeError" });
    expect(steal("return window;")).toEqual({ error: "ReferenceError" });
    expect(steal("return globalThis;")).toEqual({ error: "ReferenceError" });
    expect(steal("return a[0].getX.call(1);")).toEqual({ error: "TypeError" });
  });

  it("differs from Function only where documented", () => {
    const run = (body: string) => outcome(() => compileExpressionFunction(["x"], body)(1));
    // Function: "1/2/3", 3.14..., the inherited function, a TypeError.
    expect(run("return 1 + /2/ + 3;")).toEqual({ error: "SyntaxError" });
    expect(run("return Math.PI;")).toEqual({ value: undefined });
    expect(run("return 1..toFixed;")).toEqual({ value: undefined });
    expect(run("return new x;")).toEqual({ error: "SyntaxError" });
    // Function: the global object.
    expect(run("return this;")).toEqual({ error: "SyntaxError" });
  });
});
