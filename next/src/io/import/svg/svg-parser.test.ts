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
