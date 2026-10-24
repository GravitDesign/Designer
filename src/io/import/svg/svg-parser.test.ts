import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Transform } from "../../../engine/math/transform.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import { Group } from "../../../engine/scene/group.ts";
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

  it("fails on em lengths, which needed canvg's canvas", async () => {
    const result = await importTree(
      el("svg", {}, [el("rect", { x: "1em", width: "4", height: "4" })]),
    );
    expect(result.error).toBeInstanceOf(TypeError);
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

describe("R5-E-401: CSS selectors and ids named like Object.prototype members (old behaviour)", () => {
  // canvg kept CSS rules, definitions and references in plain objects
  // (old chunk.vendor.js 248074, 245913, 245340). The port keeps that;
  // these pin it until it is fixed as a bug.
  it("writes a __proto__ rule onto Object.prototype and still imports", async () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    try {
      const result = await importTree(
        el("svg", { width: "100", height: "100" }, [
          el("style", {}, [text("__proto__ { fill: red; stroke-width: 3 } rect { stroke: blue }")]),
          el("rect", { x: "10", y: "10", width: "30", height: "30" }),
          el("circle", { cx: "70", cy: "25", r: "15", fill: "#0a0" }),
        ]),
      );
      expect(Object.prototype.hasOwnProperty.call(proto, "fill")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(proto, "stroke-width")).toBe(true);
      expect(result.error).toBeNull();
      expect(result.node).toBeTruthy();
    } finally {
      Reflect.deleteProperty(proto, "fill");
      Reflect.deleteProperty(proto, "stroke-width");
    }
  });

  it("writes a constructor rule onto the Object function", async () => {
    const object = Object as unknown as Record<string, unknown>;
    try {
      const result = await importTree(
        el("svg", { width: "100", height: "100" }, [
          el("style", {}, [text("constructor { fill: red }")]),
          el("rect", { width: "30", height: "30" }),
        ]),
      );
      expect(Object.prototype.hasOwnProperty.call(object, "fill")).toBe(true);
      expect(result.error).toBeNull();
    } finally {
      Reflect.deleteProperty(object, "fill");
    }
  });

  it("fails the import for a use of #toString or of an element with id constructor", async () => {
    for (const id of ["toString", "constructor"]) {
      const result = await importTree(
        el("svg", { width: "100", height: "100" }, [
          el("defs", {}, [el("rect", { id: "constructor", width: "30", height: "30" })]),
          el("use", { "xlink:href": "#" + id }),
        ]),
      );
      expect(result.error, id).toBeInstanceOf(TypeError);
    }
  });
});
