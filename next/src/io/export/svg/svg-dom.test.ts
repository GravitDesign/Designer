import { describe, expect, it } from "vitest";
import {
  createParsedDocument,
  serializeToString,
  SVG_NAMESPACE,
  SvgComment,
  SvgDocument,
  SvgElement,
} from "./svg-dom.ts";

/** The exporter's skeleton, as SvgRenderContext builds it. */
function skeleton(): SvgDocument {
  const document = new SvgDocument();
  document.xmlDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
  document.appendChild(new SvgComment(document, " Generator: Gravitdesign.com "));
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("xmlns", SVG_NAMESPACE);
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("style", "isolation:isolate");
  document.appendChild(svg);
  return document;
}

describe("svg-dom", () => {
  it("serializes like Chrome's XMLSerializer", () => {
    // The same DOM calls ran in Chrome on a jQuery.parseXML document;
    // `expected` is what XMLSerializer returned there.
    const doc = skeleton();
    const root = doc.documentElement;
    const group = doc.createElementNS(SVG_NAMESPACE, "g");
    group.setAttribute("t", "a\tb\nc\rd<e>f&g\"h'i j");
    group.setAttribute("xlink:href", "#x");
    root.appendChild(group);
    const text = doc.createElementNS(SVG_NAMESPACE, "text");
    text.append(doc.createTextNode("x<y>z&w\"q'  "));
    group.appendChild(text);
    const path = doc.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("style", "stroke:none;fill:#783CB4;stroke-miterlimit:10;");
    group.appendChild(path);
    const before = path.style.stroke;
    path.style.stroke = "url(#x)";
    const prefixed = doc.createElementNS("http://gravitdesign.com/", "gravitDesigner:x");
    prefixed.setAttribute("id", "q");
    root.appendChild(prefixed);
    prefixed.appendChild(doc.createElementNS("http://gravitdesign.com/", "gravitDesigner:y"));
    root.appendChild(doc.createElementNS(null, "nons"));
    const blend = createParsedDocument(SVG_NAMESPACE, "feBlend");
    blend.documentElement.setAttribute("in", "A");
    root.appendChild(doc.importNode(blend.documentElement, true));
    const func = createParsedDocument(SVG_NAMESPACE, "feFuncA", [
      ["type", "table"],
      ["tableValues", "0 0.5"],
    ]);
    const transfer = createParsedDocument(SVG_NAMESPACE, "feComponentTransfer");
    transfer.documentElement.appendChild(transfer.importNode(func.documentElement));
    root.appendChild(doc.importNode(transfer.documentElement, true));
    root.appendChild(doc.createCDATASection("abc]]x"));
    const expected =
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><!-- Generator: Gravitdesign.com --><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="isolation:isolate"><g t="a&#9;b&#10;c&#13;d&lt;e&gt;f&amp;g&quot;h\'i j" xlink:href="#x"><text>x&lt;y&gt;z&amp;w"q\'  </text><path style="stroke: url(&quot;#x&quot;); fill: rgb(120, 60, 180); stroke-miterlimit: 10;"/></g><gravitDesigner:x xmlns:gravitDesigner="http://gravitdesign.com/" id="q"><gravitDesigner:y/></gravitDesigner:x><nons xmlns=""/><feBlend xmlns="http://www.w3.org/2000/svg" in="A"/><feComponentTransfer xmlns="http://www.w3.org/2000/svg"><feFuncA xmlns="http://www.w3.org/2000/svg" type="table" tableValues="0 0.5"/></feComponentTransfer><![CDATA[abc]]x]]></svg>';
    expect(serializeToString(doc)).toBe(expected);
    expect(before).toBe("none");
  });

  it("leaves the style attribute alone when a style write changes nothing", () => {
    const doc = skeleton();
    const path = doc.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("style", "fill:none;stroke:#000000;");
    path.style.stroke = "#000000";
    expect(path.getAttribute("style")).toBe("fill:none;stroke:#000000;");
    path.style.stroke = undefined;
    expect(path.getAttribute("style")).toBe("fill:none;stroke:#000000;");
    path.style.stroke = null;
    expect(path.getAttribute("style")).toBe("fill: none;");
    // Recorded from Chrome like the serializer test.
    path.setAttribute("style", "stroke:none;fill:url(#a);");
    path.style.stroke = "url(#b)";
    expect(path.getAttribute("style")).toBe('stroke: url("#b"); fill: url("#a");');
    path.setAttribute("style", "stroke:rgba(1,2,3,0.5);fill:#abc;");
    path.style.stroke = "#ffffff80";
    expect(path.getAttribute("style")).toBe(
      "stroke: rgba(255, 255, 255, 0.5); fill: rgb(170, 187, 204);",
    );
  });

  it("keeps child lists live and drops expandos when cloning", () => {
    const doc = skeleton();
    const parent = doc.createElementNS(SVG_NAMESPACE, "g");
    const a = doc.createElementNS(SVG_NAMESPACE, "a");
    const b = doc.createElementNS(SVG_NAMESPACE, "b");
    parent.appendChild(a);
    parent.appendChild(b);
    const list = parent.childNodes;
    parent.insertBefore(b, a);
    expect(list.map((n) => n.nodeName)).toEqual(["b", "a"]);
    parent._keepIt = true;
    parent.setAttribute("x", 1);
    const copy = parent.cloneNode(true);
    expect(copy._keepIt).toBeUndefined();
    expect(copy.attributes).toEqual([{ name: "x", value: "1" }]);
    expect(copy.childNodes.map((n) => n.nodeName)).toEqual(["b", "a"]);
    expect(parent.cloneNode().childNodes).toEqual([]);
    expect(() => parent.removeChild(doc.createElementNS(SVG_NAMESPACE, "c"))).toThrow(
      "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
    );
    expect(parent.getElementsByTagName("a")[0]).toBeInstanceOf(SvgElement);
  });
});
