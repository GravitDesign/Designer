import { describe, expect, it, vi } from "vitest";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import "./sketch-classes.ts";
import { SketchBase } from "./sketch-base.ts";
import type { SketchLayerData } from "./sketch-data.ts";
import type { SketchFile } from "./sketch-file.ts";
import { SketchFontSearch, type SketchFontAnswer } from "./sketch-font-search.ts";

/** Just enough of a SketchFile for parsing layers without nodes. */
function fakeFile(): SketchFile {
  return { addObject: vi.fn() } as unknown as SketchFile;
}

function layer(id: string, extra: Partial<SketchLayerData> = {}): SketchLayerData {
  return { _class: "base", do_objectID: id, ...extra };
}

describe("SketchBase", () => {
  it("adds up the frames of a layer and its parents", () => {
    const root = new SketchBase(
      layer("root", {
        frame: { x: 10, y: 20, width: 300, height: 200 },
        layers: [layer("child", { frame: { x: 5, y: 7, width: 40, height: 30 } })],
      }),
      fakeFile(),
      null,
    );
    root.parse();
    const child = root.getChildren()[0] as SketchBase;
    expect(String(child._getGeometryBBox())).toBe(
      "[Object GRect(x=15, y=27, width=40, height=30)]",
    );
  });

  it("lets a clipping mask take the layers after it", () => {
    const root = new SketchBase(
      layer("root", {
        layers: [layer("a"), layer("mask", { hasClippingMask: true }), layer("b"), layer("c")],
      }),
      fakeFile(),
      null,
    );
    root.parse();
    expect(root.getChildren().map((c) => c.getId())).toEqual(["a", "mask"]);
    const mask = root.getChildren()[1] as SketchBase;
    expect(mask.getChildren().map((c) => c.getId())).toEqual(["b", "c"]);
  });

  it("finds a layer by object id at any depth", () => {
    const root = new SketchBase(
      layer("root", { layers: [layer("a", { layers: [layer("deep")] }), layer("b")] }),
      fakeFile(),
      null,
    );
    root.parse();
    expect(root.findSymbol("deep")?.getId()).toBe("deep");
    expect(root.findSymbol("none")).toBeUndefined();
  });

  it("replaces the first child when the layer is not a direct child (old inverted test)", () => {
    const file = fakeFile();
    const root = new SketchBase(
      layer("root", { layers: [layer("a"), layer("b", { layers: [layer("deep")] })] }),
      file,
      null,
    );
    root.parse();
    const replacement = new SketchBase(layer("new"), file, root);
    const deep = root.findSymbol("deep") as SketchBase;
    expect(root.replaceChild(deep, replacement)).toBe(true);
    expect(root.getChildren()[0]).toBe(replacement);
    expect(root.getChildren()[1]?.getId()).toBe("b");
    // A direct child is searched for further down instead, and stays.
    const b = root.getChildren()[1] as SketchBase;
    root.replaceChild(b, null);
    expect(root.getChildren()).toContain(b);
  });

  it("throws while creating the children when a layer's class is the paint base class", () => {
    // SketchPattern has no parse of its own, so SketchParser's throws, and
    // that happens outside the per-child try/catch.
    const root = new SketchBase(
      layer("root", { layers: [layer("a"), { _class: "pattern", do_objectID: "p" }] }),
      fakeFile(),
      null,
    );
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(() => root.parse()).toThrow("Not implemented");
  });

  it("looks classes up in a plain object, so Object.prototype names resolve", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const json = { _class: "constructor", do_objectID: "c" } as SketchLayerData;
    const root = new SketchBase(layer("root", { layers: [json] }), fakeFile(), null);
    // `new Object(json, ...)` is json itself: its missing parse is logged,
    // then the clipping-mask pass calls json.hasClippingMask().
    expect(() => root.parse()).toThrow(/hasClippingMask is not a function/);
    expect(root.getChildren()[0]).toBe(json);
    expect(log).toHaveBeenCalledWith(expect.any(TypeError));
    const broken = new SketchBase(
      layer("root", { layers: [{ _class: "toString", do_objectID: "t" }] }),
      fakeFile(),
      null,
    );
    expect(() => broken.parse()).toThrow(TypeError);
  });

  it("treats a missing winding rule as even-odd", () => {
    expect(new SketchBase(layer("x"), fakeFile(), null).isEvenOdd()).toBe(true);
    expect(new SketchBase(layer("x", { windingRule: 0 }), fakeFile(), null).isEvenOdd()).toBe(
      false,
    );
  });
});

describe("SketchFontSearch", () => {
  it("asks the provider once per family, style and weight and lists the missing names", () => {
    const answers: ((answer: SketchFontAnswer | null) => void)[] = [];
    const provider = { queryFirst: vi.fn((_q, done) => answers.push(done)) };
    const search = new SketchFontSearch(provider, new FontManager());
    const first = vi.fn();
    const second = vi.fn();
    const query = { fontName: "Foo-Bold", fontFamily: "Foo", fontWeight: 700, fontStyle: "N" };
    search.queryFirst(query, first);
    search.queryFirst({ ...query, fontName: "Foo Bold" }, second);
    expect(provider.queryFirst).toHaveBeenCalledTimes(1);
    answers[0]?.(null);
    expect(first).toHaveBeenCalledWith(null);
    expect(second).toHaveBeenCalledWith(null);
    expect(search._missingFonts).toEqual(["Foo-Bold"]);
  });

  it("answers with the default font when there is no provider", () => {
    const search = new SketchFontSearch(null, new FontManager());
    const done = vi.fn();
    search.queryFirst({ fontFamily: "X", fontWeight: 400, fontStyle: "N" }, done);
    expect(done).toHaveBeenCalledWith({ family: "Open Sans", style: "N", weight: 400 });
  });

  it("is ready once nothing is pending", async () => {
    const search = new SketchFontSearch(null, new FontManager());
    await expect(search.ready()).resolves.toBeUndefined();
  });
});
