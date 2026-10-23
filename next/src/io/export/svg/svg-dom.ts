// New: the small XML DOM the SVG exporter builds its document in.
//
// The old exporter parsed its skeleton with jQuery.parseXML and built the
// rest with the browser DOM (createElementNS, cloneNode, insertBefore,
// importNode, ...), then serialized it with XMLSerializer. This module
// implements exactly the part of the DOM the exporter used, with the same
// semantics (live child lists, attribute order, shallow and deep clones
// that drop expando fields), and a serializer that writes what Chrome's
// XMLSerializer writes for such a document. It runs without a browser, so
// the exporter also runs in workers and in Node tests.
//
// What the serializer reproduces (checked against Chrome):
// - the XML declaration the skeleton was parsed with, comments and CDATA
//   sections verbatim;
// - attributes in insertion order, values escaped as &amp; &lt; &gt; &quot;
//   &#9; &#10; &#13;, text escaped as &amp; &lt; &gt;;
// - empty elements as `<name/>`;
// - xmlns attributes that were parsed (or imported with a parsed element)
//   written like any other attribute, and a namespace declaration added
//   right after the tag name when an element's prefix or default namespace
//   isn't in scope (`<gravitDesigner:x xmlns:gravitDesigner="...">`).

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";

export const NodeType = {
  Element: 1,
  Text: 3,
  CData: 4,
  Comment: 8,
  Document: 9,
} as const;

/** One attribute; `name` is the qualified name as given to setAttribute. */
export interface SvgAttribute {
  name: string;
  value: string;
}

export abstract class SvgNode {
  abstract readonly nodeType: number;
  abstract readonly nodeName: string;
  parentNode: SvgParent | null = null;
  /** The live child list: callers that loop over it see moves and removals. */
  readonly childNodes: SvgNode[] = [];

  constructor(public ownerDocument: SvgDocument | null) {}

  get parentElement(): SvgElement | null {
    return this.parentNode instanceof SvgElement ? this.parentNode : null;
  }

  get firstChild(): SvgNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): SvgNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get nextSibling(): SvgNode | null {
    const parent = this.parentNode;
    if (!parent) return null;
    return parent.childNodes[parent.childNodes.indexOf(this) + 1] ?? null;
  }

  get previousSibling(): SvgNode | null {
    const parent = this.parentNode;
    if (!parent) return null;
    return parent.childNodes[parent.childNodes.indexOf(this) - 1] ?? null;
  }

  /** Detaches the node from its parent. */
  remove(): void {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  abstract cloneNode(deep?: boolean): SvgNode;
}

/** A node that can hold children: an element or the document. */
export abstract class SvgParent extends SvgNode {
  /** The element children only (the DOM `children`). */
  get children(): SvgElement[] {
    return this.childNodes.filter((node): node is SvgElement => node instanceof SvgElement);
  }

  get firstElementChild(): SvgElement | null {
    return this.children[0] ?? null;
  }

  appendChild<T extends SvgNode>(node: T): T {
    return this.insertBefore(node, null);
  }

  /** The DOM `append` for one node. */
  append(node: SvgNode): void {
    this.appendChild(node);
  }

  /** Moves `node` before `reference` (at the end for null), detaching it first. */
  insertBefore<T extends SvgNode>(node: T, reference: SvgNode | null): T {
    if (reference && reference.parentNode !== this) {
      throw notFound(
        "insertBefore",
        "The node before which the new node is to be inserted is not a child of this node.",
      );
    }
    if (node === reference) return node;
    if (node.parentNode) node.parentNode.removeChild(node);
    if (this.ownerDocument) adopt(node, this.ownerDocument);
    const index = reference ? this.childNodes.indexOf(reference) : this.childNodes.length;
    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }

  removeChild<T extends SvgNode>(node: T): T {
    const index = this.childNodes.indexOf(node);
    if (index < 0)
      throw notFound("removeChild", "The node to be removed is not a child of this node.");
    this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }

  /** Descendant elements with this qualified name, in document order. */
  getElementsByTagName(name: string): SvgElement[] {
    const out: SvgElement[] = [];
    const visit = (parent: SvgParent) => {
      for (const child of parent.childNodes) {
        if (child instanceof SvgElement) {
          if (name === "*" || child.tagName === name) out.push(child);
          visit(child);
        }
      }
    };
    visit(this);
    return out;
  }
}

/** The DOMException Chrome throws for a reference node that isn't a child (same name and message). */
function notFound(method: string, reason: string): Error {
  const error = new Error("Failed to execute '" + method + "' on 'Node': " + reason);
  error.name = "NotFoundError";
  return error;
}

function adopt(node: SvgNode, document: SvgDocument): void {
  node.ownerDocument = document;
  for (const child of node.childNodes) adopt(child, document);
}

export class SvgElement extends SvgParent {
  readonly nodeType = NodeType.Element;
  readonly namespaceURI: string | null;
  readonly prefix: string | null;
  readonly localName: string;
  readonly tagName: string;
  readonly attributes: SvgAttribute[] = [];
  /** Set by the exporter on groups the post-processing must keep (an expando, not cloned). */
  _keepIt?: boolean;

  constructor(document: SvgDocument | null, namespace: string | null, qualifiedName: string) {
    super(document);
    this.namespaceURI = namespace;
    this.tagName = qualifiedName;
    const colon = qualifiedName.indexOf(":");
    this.prefix = colon >= 0 ? qualifiedName.slice(0, colon) : null;
    this.localName = colon >= 0 ? qualifiedName.slice(colon + 1) : qualifiedName;
  }

  get nodeName(): string {
    return this.tagName;
  }

  getAttribute(name: string): string | null {
    const attribute = this.attributes.find((a) => a.name === name);
    return attribute ? attribute.value : null;
  }

  /** Like the DOM: any value is converted with String(). */
  setAttribute(name: string, value: unknown): void {
    const text = String(value);
    const attribute = this.attributes.find((a) => a.name === name);
    if (attribute) attribute.value = text;
    else this.attributes.push({ name, value: text });
  }

  removeAttribute(name: string): void {
    const index = this.attributes.findIndex((a) => a.name === name);
    if (index >= 0) this.attributes.splice(index, 1);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.some((a) => a.name === name);
  }

  /**
   * The element's inline style, read and written like `element.style.<name>`.
   * Writing re-serializes the whole declaration list the way Chrome's CSSOM
   * does ("name: value; ..."), see cssText.
   */
  get style(): SvgStyleDeclaration {
    return new SvgStyleDeclaration(this);
  }

  cloneNode(deep?: boolean): SvgElement {
    const copy = new SvgElement(this.ownerDocument, this.namespaceURI, this.tagName);
    for (const attribute of this.attributes) copy.attributes.push({ ...attribute });
    if (deep) for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    return copy;
  }
}

export class SvgText extends SvgNode {
  readonly nodeType = NodeType.Text;
  readonly nodeName = "#text";

  constructor(
    document: SvgDocument | null,
    public data: string,
  ) {
    super(document);
  }

  cloneNode(): SvgText {
    return new SvgText(this.ownerDocument, this.data);
  }
}

export class SvgCData extends SvgNode {
  readonly nodeType = NodeType.CData;
  readonly nodeName = "#cdata-section";

  constructor(
    document: SvgDocument | null,
    public data: string,
  ) {
    super(document);
  }

  cloneNode(): SvgCData {
    return new SvgCData(this.ownerDocument, this.data);
  }
}

export class SvgComment extends SvgNode {
  readonly nodeType = NodeType.Comment;
  readonly nodeName = "#comment";

  constructor(
    document: SvgDocument | null,
    public data: string,
  ) {
    super(document);
  }

  cloneNode(): SvgComment {
    return new SvgComment(this.ownerDocument, this.data);
  }
}

export class SvgDocument extends SvgParent {
  readonly nodeType = NodeType.Document;
  readonly nodeName = "#document";
  /** The XML declaration the document was parsed with, written back first. */
  xmlDeclaration: string | null = null;

  constructor() {
    super(null);
    this.ownerDocument = null;
  }

  get documentElement(): SvgElement {
    const element = this.firstElementChild;
    if (!element) throw new Error("document has no element");
    return element;
  }

  createElementNS(namespace: string | null, qualifiedName: string): SvgElement {
    return new SvgElement(this, namespace, qualifiedName);
  }

  createTextNode(data: string): SvgText {
    return new SvgText(this, data);
  }

  createCDATASection(data: string): SvgCData {
    return new SvgCData(this, data);
  }

  createComment(data: string): SvgComment {
    return new SvgComment(this, data);
  }

  /** A copy owned by this document (shallow unless `deep`, as in the DOM). */
  importNode<T extends SvgNode>(node: T, deep?: boolean): T {
    const copy = node.cloneNode(deep) as T;
    adopt(copy, this);
    return copy;
  }

  override insertBefore<T extends SvgNode>(node: T, reference: SvgNode | null): T {
    node.ownerDocument = this;
    for (const child of node.childNodes) adopt(child, this);
    return super.insertBefore(node, reference);
  }

  cloneNode(deep?: boolean): SvgDocument {
    const copy = new SvgDocument();
    copy.xmlDeclaration = this.xmlDeclaration;
    if (deep) for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    return copy;
  }
}

/** A document whose element is `<qualifiedName xmlns="namespace" attr...>`, as parsed from markup. */
export function createParsedDocument(
  namespace: string,
  qualifiedName: string,
  attributes: [string, string][] = [],
): SvgDocument {
  const document = new SvgDocument();
  const element = document.createElementNS(namespace, qualifiedName);
  element.setAttribute("xmlns", namespace);
  for (const [name, value] of attributes) element.setAttribute(name, value);
  document.appendChild(element);
  return document;
}

/**
 * `element.style`: reads one property from the style attribute; writing
 * one rewrites the attribute in Chrome's serialized form. Only what the
 * exporter needs (stroke) is offered; values are normalized the way
 * Chrome's CSSOM prints the ones the exporter writes (colors as
 * `rgb(r, g, b)`, `url("...")`).
 */
export class SvgStyleDeclaration {
  constructor(private readonly element: SvgElement) {}

  private declarations(): [string, string][] {
    const text = this.element.getAttribute("style");
    const out: [string, string][] = [];
    if (!text) return out;
    for (const part of text.split(";")) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      const name = part.slice(0, colon).trim();
      const value = part.slice(colon + 1).trim();
      if (!name || !value) continue;
      const existing = out.find((d) => d[0] === name);
      if (existing) existing[1] = normalizeCssValue(value);
      else out.push([name, normalizeCssValue(value)]);
    }
    return out;
  }

  get stroke(): string {
    return this.getPropertyValue("stroke");
  }

  set stroke(value: string | null | undefined) {
    this.setProperty("stroke", value);
  }

  getPropertyValue(name: string): string {
    const declaration = this.declarations().find((d) => d[0] === name);
    return declaration ? declaration[1] : "";
  }

  /**
   * Like the CSSOM: undefined is an invalid value and changes nothing,
   * null or "" removes the property, and setting the value a property
   * already has leaves the attribute as it was written.
   */
  setProperty(name: string, value: string | null | undefined): void {
    if (void 0 === value) return;
    const list = this.declarations();
    const index = list.findIndex((d) => d[0] === name);
    if (null === value || "" === value) {
      if (index < 0) return;
      list.splice(index, 1);
    } else {
      const normalized = normalizeCssValue(String(value));
      const existing = list[index];
      if (existing) {
        if (existing[1] === normalized) return;
        existing[1] = normalized;
      } else list.push([name, normalized]);
    }
    this.element.setAttribute("style", list.map((d) => d[0] + ": " + d[1] + ";").join(" "));
  }
}

/** Chrome's serialization of the CSS values the exporter writes. */
function normalizeCssValue(value: string): string {
  const url = /^url\(\s*['"]?([^'")]*)['"]?\s*\)$/.exec(value);
  if (url) return 'url("' + url[1] + '")';
  const hex = /^#([0-9a-fA-F]{3,8})$/.exec(value);
  if (hex) {
    let digits = hex[1] as string;
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((d) => d + d)
        .join("");
    }
    if (digits.length === 6 || digits.length === 8) {
      const channel = (i: number) => parseInt(digits.slice(2 * i, 2 * i + 2), 16);
      if (digits.length === 6)
        return "rgb(" + channel(0) + ", " + channel(1) + ", " + channel(2) + ")";
      const alpha = channel(3) / 255;
      return alpha === 1
        ? "rgb(" + channel(0) + ", " + channel(1) + ", " + channel(2) + ")"
        : "rgba(" +
            channel(0) +
            ", " +
            channel(1) +
            ", " +
            channel(2) +
            ", " +
            roundAlpha(alpha) +
            ")";
    }
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(value);
  if (rgb) {
    const parts = (rgb[1] as string).split(",").map((p) => p.trim());
    if (parts.length === 4 && Number(parts[3]) === 1) parts.pop();
    return (parts.length === 4 ? "rgba(" : "rgb(") + parts.join(", ") + ")";
  }
  return value;
}

/** An 8-bit alpha the way Chrome prints it: two decimals when they round back to the same byte, else three. */
function roundAlpha(alpha: number): number {
  const byte = Math.round(alpha * 255);
  const two = Math.round((byte / 255) * 100) / 100;
  return Math.round(two * 255) === byte ? two : Math.round((byte / 255) * 1000) / 1000;
}

function escapeAttribute(value: string): string {
  let out = "";
  for (const ch of value) {
    switch (ch) {
      case "&":
        out += "&amp;";
        break;
      case "<":
        out += "&lt;";
        break;
      case ">":
        out += "&gt;";
        break;
      case '"':
        out += "&quot;";
        break;
      case "\t":
        out += "&#9;";
        break;
      case "\n":
        out += "&#10;";
        break;
      case "\r":
        out += "&#13;";
        break;
      default:
        out += ch;
    }
  }
  return out;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** In-scope namespace bindings: prefix ("" for the default) to namespace. */
type Scope = Map<string, string | null>;

function serializeNode(node: SvgNode, scope: Scope, out: string[]): void {
  if (node instanceof SvgElement) {
    const local: Scope = new Map(scope);
    let declarations = "";
    for (const attribute of node.attributes) {
      if (attribute.name === "xmlns") local.set("", attribute.value);
      else if (attribute.name.startsWith("xmlns:"))
        local.set(attribute.name.slice(6), attribute.value);
    }
    const prefix = node.prefix ?? "";
    const bound = local.has(prefix) ? local.get(prefix) : prefix ? undefined : null;
    if (bound !== node.namespaceURI) {
      declarations +=
        " " +
        (prefix ? "xmlns:" + prefix : "xmlns") +
        '="' +
        escapeAttribute(node.namespaceURI ?? "") +
        '"';
      local.set(prefix, node.namespaceURI);
    }
    out.push("<" + node.tagName + declarations);
    for (const attribute of node.attributes) {
      out.push(" " + attribute.name + '="' + escapeAttribute(attribute.value) + '"');
    }
    if (node.childNodes.length === 0) {
      out.push("/>");
      return;
    }
    out.push(">");
    for (const child of node.childNodes) serializeNode(child, local, out);
    out.push("</" + node.tagName + ">");
  } else if (node instanceof SvgText) {
    out.push(escapeText(node.data));
  } else if (node instanceof SvgCData) {
    out.push("<![CDATA[" + node.data + "]]>");
  } else if (node instanceof SvgComment) {
    out.push("<!--" + node.data + "-->");
  } else if (node instanceof SvgDocument) {
    if (node.xmlDeclaration) out.push(node.xmlDeclaration);
    for (const child of node.childNodes) serializeNode(child, scope, out);
  }
}

/** XMLSerializer.serializeToString. */
export function serializeToString(node: SvgNode): string {
  const out: string[] = [];
  const scope: Scope = new Map([
    ["xml", "http://www.w3.org/XML/1998/namespace"],
    ["xmlns", XMLNS_NAMESPACE],
  ]);
  serializeNode(node, scope, out);
  return out.join("");
}
