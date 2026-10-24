import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Transform } from "../../../engine/math/transform.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import { Pattern } from "../../../engine/style/pattern.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image } from "../../../engine/scene/image.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Path } from "../../../engine/scene/path.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import recorded from "./__fixtures__/svg-values.recorded.json" with { type: "json" };
import { SVGImport, type SvgImportInfo } from "./svg-import.ts";
import type { SvgTspan } from "./svg-parser.ts";
import {
  normalizePathData,
  SvgFontFace,
  SvgMissing,
  SvgParser,
  SvgRect,
  type ImportNode,
  type SvgDomNode,
} from "./svg-parser.ts";

/** A minimal XML DOM node, the parts the parser reads. */
function el(
  name: string,
  attrs: Record<string, string> = {},
  children: SvgDomNode[] = [],
): SvgDomNode {
  return {
    nodeType: 1,
    nodeName: name,
    nodeValue: null,
    attributes: Object.entries(attrs).map(([nodeName, value]) => ({ nodeName, value })),
    childNodes: children,
    textContent: children.map((c) => c.textContent ?? "").join(""),
    cloneNode: () =>
      el(
        name,
        attrs,
        children.map((c) => c.cloneNode(true)),
      ),
  };
}

function text(value: string): SvgDomNode {
  return {
    nodeType: 3,
    nodeName: "#text",
    nodeValue: value,
    childNodes: [],
    textContent: value,
    cloneNode: () => text(value),
  };
}

function parser(): SvgParser {
  // No font manager: the parser then skips the text engine setup.
  return new SvgParser({}, null as unknown as FontManager);
}

/** Runs the importer on a DOM tree; resolves with what the callback got. */
function importTree(
  root: SvgDomNode,
): Promise<{ error: unknown; node: ImportNode | null | undefined; info?: SvgImportInfo }> {
  return new Promise((resolve) => {
    SVGImport.import(
      { documentElement: root } as unknown as Document,
      {},
      new FontManager(),
      (error, node, info) => resolve({ error, node, info }),
    );
  });
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizePathData", () => {
  it("splits path data into the old tokenizer's tokens (recorded from the old app)", () => {
    recorded.inputs.PATHS.forEach((d, i) => {
      expect(normalizePathData(d).split(" "), d).toEqual(recorded.outputs.paths[i]);
    });
  });
});

describe("SvgParser elements", () => {
  it("builds canvg's element classes by local name without dashes", () => {
    const svg = parser();
    expect(svg.CreateElement(el("svg:rect"))).toBeInstanceOf(SvgRect);
    expect(svg.CreateElement(el("font-face"))).toBeInstanceOf(SvgFontFace);
    const unknown = svg.CreateElement(el("blink"));
    expect(unknown).toBeInstanceOf(SvgMissing);
    expect(unknown.type).toBe("blink");
  });

  it("takes styles from CSS rules, then the style attribute, then the parent", () => {
    const svg = parser();
    const root = svg.CreateElement(
      el("svg", {}, [
        el("style", {}, [text(".a { fill: red; stroke: green } rect.a { stroke-width: 3 }")]),
        el("g", { fill: "blue", stroke: "black" }, [
          el("rect", { class: "a", style: "stroke: navy" }),
          el("circle"),
        ]),
      ]),
    );
    const group = root.children[1] as (typeof root.children)[number];
    const [rect, circle] = group.children;
    expect(rect?.style("fill").value).toBe("red");
    expect(rect?.style("stroke").value).toBe("navy");
    expect(rect?.style("stroke-width").value).toBe("3");
    expect(circle?.style("fill").value).toBe("blue");
    expect(circle?.style("fill", false, true).value).toBe("");
  });

  it("appends a text node after a tspan to that tspan (old quirk)", () => {
    const svg = parser();
    const element = svg.CreateElement(
      el("text", { x: "1" }, [text("Bold "), el("tspan", {}, [text("italic")]), text(" end")]),
    );
    expect(element.children.map((c) => (c as SvgTspan).text)).toEqual(["Bold ", "italic end"]);
    // The text node's tspan takes the text element's attributes.
    expect(element.children[0]?.attribute("x").value).toBe("1");
  });

  it("drops <title> children and registers elements by id once", () => {
    const svg = parser();
    const root = svg.CreateElement(
      el("svg", {}, [
        el("title", {}, [text("t")]),
        el("rect", { id: "a" }),
        el("circle", { id: "a" }),
      ]),
    );
    expect(root.children.map((c) => c.type)).toEqual(["rect", "circle"]);
    expect(svg.Definitions.a).toBe(root.children[0]);
  });
});

describe("SVGImport.import", () => {
  it("refuses documents whose root isn't <svg>", async () => {
    const result = await importTree(el("html"));
    expect(result.error).toBe("Invalid svg document.");
  });

  it("imports shapes with their geometry, fill and border", async () => {
    const result = await importTree(
      el("svg", { width: "100", height: "50" }, [
        el("rect", {
          x: "10",
          y: "10",
          width: "20",
          height: "10",
          fill: "#f00",
          stroke: "#00f",
          "stroke-width": "2",
        }),
        el("circle", { cx: "50", cy: "25", r: "5" }),
        el("path", { d: "M0 0 L10 0 L10 10 z" }),
      ]),
    );
    expect(result.error).toBeNull();
    expect(result.info).toEqual({ width: 100, height: 50, unit: null });
    const group = result.node as unknown as Group;
    expect(group).toBeInstanceOf(Group);
    const [rect, circle, path] = group.getChildren() as unknown as [Rectangle, Ellipse, Path];
    expect(rect).toBeInstanceOf(Rectangle);
    expect((rect.getProperty("trf") as Transform).getMatrix()).toEqual([10, 0, 0, 5, 20, 15]);
    const layers = rect.getPaintLayers()?.getChildren() ?? [];
    expect(layers.map((l) => (l as unknown as ImportNode).getProperty("_bw"))).toEqual([
      undefined,
      2,
    ]);
    expect(circle).toBeInstanceOf(Ellipse);
    expect((circle.getProperty("trf") as Transform).getMatrix()).toEqual([5, 0, 0, 5, 50, 25]);
    expect(path).toBeInstanceOf(Path);
    expect(path.getProperty("closed")).toBe(true);
  });

  it("unwraps a single child and applies group transforms to it", async () => {
    const result = await importTree(
      el("svg", {}, [
        el("g", { transform: "translate(5 0) scale(2)" }, [
          el("rect", { width: "4", height: "4" }),
        ]),
      ]),
    );
    const group = result.node as unknown as Group;
    expect(group).toBeInstanceOf(Group);
    const rect = group.getFirstChild() as unknown as Rectangle;
    expect((rect.getProperty("trf") as Transform).getMatrix()).toEqual([4, 0, 0, 4, 9, 4]);
  });

  it("builds only the first child of a switch that isn't a foreignObject (BUG-073)", async () => {
    const result = await importTree(
      el("svg", {}, [
        el("rect", { width: "4", height: "4" }),
        el("switch", { transform: "translate(5 0)", fill: "#0f0" }, [
          el("foreignObject", { width: "10", height: "10" }),
          el("rect", { x: "20", y: "20", width: "10", height: "6" }),
          el("circle", { cx: "40", cy: "40", r: "5", fill: "red" }),
        ]),
      ]),
    );
    expect(result.error).toBeNull();
    const kinds: string[] = [];
    const walk = (node: ImportNode) => {
      kinds.push(node.constructor.name);
      for (const child of (node as unknown as Group).getChildren?.() ?? []) {
        walk(child as unknown as ImportNode);
      }
    };
    walk(result.node as ImportNode);
    expect(kinds.filter((k) => k === "Ellipse")).toHaveLength(0);
    const group = result.node as unknown as Group;
    const alternative = group.getChildren()[1] as unknown as Group;
    expect(alternative).toBeInstanceOf(Group);
    const rect = alternative.getFirstChild() as unknown as Rectangle;
    expect(rect).toBeInstanceOf(Rectangle);
    expect(rect.getNext()).toBeNull();
    expect(rect.getFirstChild?.() ?? null).toBeNull();
    expect((rect.getProperty("trf") as Transform).getMatrix()).toEqual([5, 0, 0, 3, 30, 23]);
  });

  it("styles a use's instance by the use's class where it sets nothing itself (BUG-075)", async () => {
    const result = await importTree(
      el("svg", { width: "100", height: "100" }, [
        el("style", {}, [text(".blue { fill: #00c; stroke: #0c0 } use.wide { stroke-width: 3 }")]),
        el("defs", {}, [
          el("rect", { id: "plain", width: "10", height: "10" }),
          el("rect", { id: "red", width: "10", height: "10", fill: "#f00" }),
        ]),
        el("use", { "xlink:href": "#plain", class: "blue wide" }),
        el("use", { "xlink:href": "#red", class: "blue", x: "20" }),
      ]),
    );
    expect(result.error).toBeNull();
    const [plain, red] = (result.node as unknown as Group).getChildren() as unknown as Rectangle[];
    const layers = (rect: Rectangle | undefined) =>
      (rect?.getPaintLayers()?.getChildren() ?? []).map((l) => [
        Pattern.serialize((l as unknown as ImportNode).getProperty("_pt") as Pattern | null),
        (l as unknown as ImportNode).getProperty("_bw"),
      ]);
    expect(layers(plain)).toEqual([
      ["C#[0,0,204]", undefined],
      ["C#[0,204,0]", 3],
    ]);
    // Its own fill wins over the class, as with inheritance.
    expect(layers(red)[0]).toEqual(["C#[255,0,0]", undefined]);
    expect(layers(red)[1]?.[0]).toBe("C#[0,204,0]");
  });

  it("imports an element whose filter has a feColorMatrix (BUG-077)", async () => {
    const result = await importTree(
      el("svg", { width: "100", height: "100" }, [
        el("filter", { id: "f" }, [el("feColorMatrix", { type: "saturate", values: "0" })]),
        el("rect", { width: "30", height: "30", fill: "#f00", filter: "url(#f)" }),
        el("circle", { cx: "70", cy: "25", r: "15" }),
      ]),
    );
    expect(result.error).toBeNull();
    const children = (result.node as unknown as Group).getChildren();
    expect(children.map((c) => c.constructor.name)).toEqual(["Rectangle", "Ellipse"]);
  });

  it("resolves em and ex lengths against the element's font size (BUG-079)", async () => {
    const result = await importTree(
      el("svg", { width: "100", height: "100" }, [
        el("g", { "font-size": "20" }, [
          el("rect", { x: "1em", y: "2ex", width: "4", height: "4" }),
          el("rect", { x: "1em", width: "0.5em", height: "4", "font-size": "1.5em" }),
        ]),
        el("rect", { x: "1em", width: "4", height: "4" }),
      ]),
    );
    expect(result.error).toBeNull();
    const group = result.node as unknown as Group;
    const [inner, outer] = group.getChildren() as unknown as [Group, Rectangle];
    const [first, second] = inner.getChildren() as unknown as Rectangle[];
    // x = 1em = 20, y = 2ex = 20; the box is 4 x 4 around its center.
    expect((first?.getProperty("trf") as Transform).getMatrix()).toEqual([2, 0, 0, 2, 22, 22]);
    // Its own font size is 1.5em of the group's 20 = 30: x 30, width 15.
    expect((second?.getProperty("trf") as Transform).getMatrix()).toEqual([7.5, 0, 0, 2, 37.5, 2]);
    // No font size anywhere: 16.
    expect((outer.getProperty("trf") as Transform).getMatrix()).toEqual([2, 0, 0, 2, 18, 2]);
  });
});

describe("BUG-006: element names that are built-in object members", () => {
  it("treats <constructor> like any unknown element and still imports the rest", async () => {
    const result = await importTree(
      el("svg", { width: "20", height: "20" }, [
        el("constructor"),
        el("rect", { width: "10", height: "10" }),
      ]),
    );
    expect(result.error).toBeNull();
    expect(result.node).toBeTruthy();
  });

  it("creates the unknown-element placeholder for a name found on Object.prototype", () => {
    expect(parser().CreateElement(el("toString"))).toBeInstanceOf(SvgMissing);
  });
});

describe("SvgImage", () => {
  it("sizes the image once it has loaded and then stops listening (BUG-082)", () => {
    const element = parser().CreateElement(
      el("image", { "xlink:href": "a.png", x: "10", y: "20", width: "100", height: "50" }),
    );
    const image = element.createSceneNode() as unknown as Image;
    const load = (width: number, height: number) => {
      image.setProperties(["iw", "ih"], [width, height]);
      (image as unknown as { _status: number })._status = Image.ImageStatus.Loaded;
      image.trigger(new Image.StatusEvent(image, Image.ImageStatus.Loaded));
    };
    load(10, 10);
    expect((image.getProperty("trf") as Transform).getMatrix()).toEqual([10, 0, 0, 5, 10, 20]);
    // A later load (Replace Image) leaves the transform to whoever loads it.
    load(40, 20);
    expect((image.getProperty("trf") as Transform).getMatrix()).toEqual([10, 0, 0, 5, 10, 20]);
    expect(image.hasEventListeners(Image.StatusEvent)).toBe(false);
  });
});

describe("SvgElementBase and SvgRenderedElementBase (old chunk.vendor.js 245941-245951)", () => {
  it("gives only rendered elements getBoundingBox and getAbsoluteBoundingBox", () => {
    for (const name of ["defs", "stop", "mask", "clipPath", "style", "linearGradient"]) {
      const element = parser().CreateElement(el(name)) as unknown as Record<string, unknown>;
      expect(element.getBoundingBox, name).toBeUndefined();
      expect(element.getAbsoluteBoundingBox, name).toBeUndefined();
    }
    expect(parser().CreateElement(el("rect", { width: "4", height: "2" }))).toHaveProperty(
      "getBoundingBox",
    );
    const g = parser().CreateElement(el("g")) as unknown as { getBoundingBox(): unknown };
    expect(() => g.getBoundingBox()).toThrow("getBoundingBox: unimplemented");
  });
});

describe("the font provider queue (old chunk.vendor.js 245127-245131)", () => {
  it("passes every argument of the provider's answer to every waiting query", async () => {
    const calls: unknown[][] = [];
    let answer: ((...args: unknown[]) => void) | null = null;
    const svg = new SvgParser(
      {
        fontProvider: {
          queryFirst(_query: unknown, done: (...args: unknown[]) => void) {
            answer = done;
          },
        },
      } as unknown as ConstructorParameters<typeof SvgParser>[0],
      null as unknown as FontManager,
    );
    const query = { fontFamily: "A" } as unknown as Parameters<
      SvgParser["fontProvider"]["queryFirst"]
    >[0];
    svg.fontProvider.queryFirst(query, (...args: unknown[]) => calls.push(args));
    svg.fontProvider.queryFirst(query, (...args: unknown[]) => calls.push(args));
    (answer as unknown as (...args: unknown[]) => void)({ family: "A" }, "extra", 3);
    expect(calls).toEqual([
      [{ family: "A" }, "extra", 3],
      [{ family: "A" }, "extra", 3],
    ]);
  });

  it("asks for each family on its own and answers it with its own answer (BUG-072)", () => {
    const asked: string[] = [];
    const answers: ((...args: unknown[]) => void)[] = [];
    const svg = new SvgParser(
      {
        fontProvider: {
          queryFirst(query: { fontFamily: string }, done: (...args: unknown[]) => void) {
            asked.push(query.fontFamily);
            answers.push(done);
          },
        },
      } as unknown as ConstructorParameters<typeof SvgParser>[0],
      null as unknown as FontManager,
    );
    type Query = Parameters<SvgParser["fontProvider"]["queryFirst"]>[0];
    const query = (fontFamily: string, fontWeight = 400) =>
      ({ fontFamily, fontWeight, fontStyle: "N" }) as unknown as Query;
    const got: Record<string, unknown> = {};
    svg.fontProvider.queryFirst(query("A"), (answer) => (got.A = answer));
    svg.fontProvider.queryFirst(query("B"), (answer) => (got.B = answer));
    svg.fontProvider.queryFirst(query("A", 700), (answer) => (got.A700 = answer));
    expect(asked).toEqual(["A", "B", "A"]);
    answers[1]?.({ family: "B" });
    answers[0]?.(null);
    answers[2]?.({ family: "A", weight: 700 });
    expect(got).toEqual({ A: null, B: { family: "B" }, A700: { family: "A", weight: 700 } });
    expect(svg.jobs).toBe(0);
  });
});

describe("BUG-071: fonts asked for after another font resolved", () => {
  /** A font manager with just the listener parts the parser uses. */
  function fakeFontManager() {
    const listeners = new Map<unknown, { fn: (e: unknown) => void; target: unknown }[]>();
    return {
      addEventListener(type: unknown, fn: (e: unknown) => void, target: unknown) {
        listeners.set(type, [...(listeners.get(type) ?? []), { fn, target }]);
      },
      removeEventListener(type: unknown, fn: (e: unknown) => void) {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((l) => l.fn !== fn),
        );
      },
      fire(type: unknown, event: unknown) {
        for (const l of listeners.get(type) ?? []) l.fn.call(l.target, event);
      },
      getDefaultFont: () => null,
    };
  }
  const font = (family: string) =>
    ({
      getFamily: () => family,
      getStyle: () => "N",
      getWeight: () => 400,
    }) as unknown as Parameters<SvgParser["addFontToResolve"]>[0];

  it("answers the later font and ends the import's wait", () => {
    const fm = fakeFontManager();
    const svg = new SvgParser({}, null as unknown as FontManager);
    (svg as unknown as { fontManager: unknown }).fontManager = fm;
    const resolved: string[] = [];
    svg.beginJob(); // the rest of the import
    svg.addFontToResolve(font("A"), (f) => resolved.push(f.getFamily()));
    fm.fire(FontManager.FontAvailableEvent, { font: font("A") });
    svg.addFontToResolve(font("B"), (f) => resolved.push(f.getFamily()));
    let done = false;
    svg.waitFor(() => (done = true));
    svg.endJob();
    expect(done).toBe(false);
    fm.fire(FontManager.FontAvailableEvent, { font: font("B") });
    expect(resolved).toEqual(["A", "B"]);
    expect(done).toBe(true);
  });
});

describe("BUG-071: a font query asked again from the last answer", () => {
  it("ends the provider's job once the fallback query is answered", () => {
    const answers: ((...args: unknown[]) => void)[] = [];
    const svg = new SvgParser(
      {
        fontProvider: {
          queryFirst(_query: unknown, done: (...args: unknown[]) => void) {
            answers.push(done);
          },
        },
      } as unknown as ConstructorParameters<typeof SvgParser>[0],
      null as unknown as FontManager,
    );
    type Query = Parameters<SvgParser["fontProvider"]["queryFirst"]>[0];
    const unknown = { fontFamily: "Unknown" } as unknown as Query;
    const fallback = { fontFamily: "Open Sans" } as unknown as Query;
    let done = false;
    svg.fontProvider.queryFirst(unknown, () => {
      // No answer for the family: ask for the fallback, as text does.
      svg.fontProvider.queryFirst(fallback, () => {});
    });
    svg.waitFor(() => (done = true));
    answers[0]?.(null);
    expect(done).toBe(false);
    answers[1]?.({ family: "Open Sans" });
    expect(svg.jobs).toBe(0);
    expect(done).toBe(true);
  });
});

describe("BUG-081: CSS selectors and ids named like Object.prototype members", () => {
  // canvg kept CSS rules, definitions and references in plain objects
  // (old chunk.vendor.js 248074, 245913, 245340).
  it("keeps a __proto__ rule to itself and still imports", async () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    try {
      const result = await importTree(
        el("svg", { width: "100", height: "100" }, [
          el("style", {}, [text("__proto__ { fill: red; stroke-width: 3 } rect { stroke: blue }")]),
          el("rect", { x: "10", y: "10", width: "30", height: "30" }),
          el("circle", { cx: "70", cy: "25", r: "15", fill: "#0a0" }),
        ]),
      );
      expect(Object.prototype.hasOwnProperty.call(proto, "fill")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(proto, "stroke-width")).toBe(false);
      expect(result.error).toBeNull();
      expect(result.node).toBeTruthy();
    } finally {
      Reflect.deleteProperty(proto, "fill");
      Reflect.deleteProperty(proto, "stroke-width");
    }
  });

  it("keeps a constructor rule off the Object function", async () => {
    const object = Object as unknown as Record<string, unknown>;
    try {
      const result = await importTree(
        el("svg", { width: "100", height: "100" }, [
          el("style", {}, [text("constructor { fill: red }")]),
          el("rect", { width: "30", height: "30" }),
        ]),
      );
      expect(Object.prototype.hasOwnProperty.call(object, "fill")).toBe(false);
      expect(result.error).toBeNull();
    } finally {
      Reflect.deleteProperty(object, "fill");
    }
  });

  it("imports a use of #toString (nothing) and of an element with id constructor", async () => {
    const results: Record<string, unknown> = {};
    for (const id of ["toString", "constructor"]) {
      const result = await importTree(
        el("svg", { width: "100", height: "100" }, [
          el("defs", {}, [el("rect", { id: "constructor", width: "30", height: "30" })]),
          el("use", { "xlink:href": "#" + id }),
          el("circle", { cx: "70", cy: "25", r: "15" }),
        ]),
      );
      expect(result.error, id).toBeNull();
      const blob = Node.serialize(result.node as never) as string;
      results[id] = ["rectangle", "ellipse"].filter((kind) => blob.includes(`"@":"${kind}"`));
    }
    expect(results).toEqual({ toString: ["ellipse"], constructor: ["rectangle", "ellipse"] });
  });
});
