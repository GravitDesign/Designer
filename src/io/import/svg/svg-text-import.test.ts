// SVG imports with texts, run in Node with the app's Open Sans as the
// only font and a font provider that answers every query with it.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installFakeCanvas } from "../../../engine/paint/testing/fake-canvas.ts";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { Node } from "../../../engine/scene/node.ts";
import { SVGImport } from "./svg-import.ts";
import type { FontAnswerCallback, FontQuery, SvgDomNode } from "./svg-parser.ts";

const here = dirname(fileURLToPath(import.meta.url));
let fontManager: FontManager;
let uninstall: () => void;

beforeAll(() => {
  uninstall = installFakeCanvas();
  const bytes = readFileSync(resolve(here, "../../../../assets/font/OpenSans-Regular.ttf"));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  fontManager = new FontManager();
  const font = OpenTypeFont.create("Open Sans", "N", 400, buffer) as OpenTypeFont;
  fontManager._fonts.push(font);
  fontManager.setDefaultFont(font);
});

afterAll(() => uninstall());

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

interface Blob {
  "@": string;
  ct?: { text: string }[];
  trf?: number[];
  $?: Blob[];
  _layers?: { $: { "@": string; _pt?: string }[] };
}

/** Imports the tree; resolves with the callback's error and the serialized node. */
function importTree(root: SvgDomNode): Promise<{ error: unknown; node: Blob | null }> {
  const fontProvider = {
    queryFirst(_query: FontQuery, done: FontAnswerCallback) {
      done({ family: "Open Sans", weight: 400, style: "N" });
    },
  };
  return new Promise((resolvePromise) => {
    SVGImport.import(
      { documentElement: root } as unknown as Document,
      { fontProvider },
      fontManager,
      (error, node) =>
        resolvePromise({
          error,
          node: node ? (JSON.parse(Node.serialize(node as never) as string) as Blob) : null,
        }),
    );
  });
}

/** The texts of a serialized node, depth first. */
function texts(node: Blob | null): Blob[] {
  if (!node) return [];
  if (node["@"] === "text") return [node];
  return (node.$ ?? []).flatMap(texts);
}

const fill = (blob: Blob) => blob._layers?.$.find((l) => l["@"] === "fillPaintLayer")?._pt;

describe("BUG-074: text children with mixed content", () => {
  it("gives each text the position and style of its own tspan", async () => {
    const result = await importTree(
      el("svg", { width: "200", height: "100" }, [
        el("text", { x: "10", y: "20", "font-family": "Open Sans", "font-size": "16" }, [
          text("A"),
          el("tref"),
          el("tspan", { x: "50", y: "60", fill: "#f00" }, [text("B")]),
        ]),
      ]),
    );
    expect(result.error).toBeNull();
    const [a, b] = texts(result.node);
    expect(a?.ct?.[0]?.text).toBe("A");
    expect(fill(a as Blob)).toBe("C#[0,0,0]");
    expect(b?.ct?.[0]?.text).toBe("B");
    expect(fill(b as Blob)).toBe("C#[255,0,0]");
    expect(b?.trf?.[4]).toBe(50);
  });

  it("keeps the child after a textPath and makes one text per textPath span", async () => {
    const result = await importTree(
      el("svg", { width: "200", height: "100" }, [
        el("defs", {}, [el("path", { id: "p", d: "M0 50 L200 50" })]),
        el("text", { "font-family": "Open Sans", "font-size": "16" }, [
          el("textPath", { "xlink:href": "#p" }, [text("On path")]),
          el("tspan", { x: "20", y: "90", fill: "#f00" }, [text("After")]),
        ]),
      ]),
    );
    expect(result.error).toBeNull();
    const found = texts(result.node);
    expect(found.map((t) => t.ct?.[0]?.text)).toEqual(["On path", "After"]);
    expect(fill(found[1] as Blob)).toBe("C#[255,0,0]");
  });
});

describe("BUG-076: a <use> of a <text>", () => {
  it("imports the referenced text, moved by the use", async () => {
    const font = { "font-family": "Open Sans", "font-size": "12" };
    const used = await importTree(
      el("svg", { width: "200", height: "100" }, [
        el("rect", { width: "1", height: "1" }),
        el("defs", {}, [el("text", { id: "t", ...font }, [text("Referenced")])]),
        el("use", { "xlink:href": "#t", x: "10", y: "50" }),
      ]),
    );
    const direct = await importTree(
      el("svg", { width: "200", height: "100" }, [
        el("rect", { width: "1", height: "1" }),
        el("text", { x: "10", y: "50", ...font }, [text("Referenced")]),
      ]),
    );
    expect(used.error).toBeNull();
    const [found] = texts(used.node);
    const [expected] = texts(direct.node);
    expect(found?.ct?.[0]?.text).toBe("Referenced");
    expect(found?.trf).toEqual(expected?.trf);
  });
});
