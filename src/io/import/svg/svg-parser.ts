// Old: chunk.vendor.js module 1391 (the canvg 1.x fork behind GSVGImport).
//
// canvg parsed an SVG DOM into its own element objects and drew them on a
// canvas. Gravit's fork kept the parsing and added `toScene`: every
// element builds Gravit scene nodes (groups, rectangles, paths, texts,
// images) with fills, borders, effects, clip paths and masks. The canvas
// drawing that was left behind (render, setContext, markers, the
// clipPath and feColorMatrix canvas code) can't run any more and is not
// ported; where the scene building still calls into it the port throws
// the TypeError the old code threw.
//
// The element classes keep canvg's names (svg.Element.rect -> SvgRect)
// and its quirks; QUESTIONS.md lists them under "SVG import".
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import type { Event } from "../../../engine/core/event.ts";
import { decompressString, each, extend, find } from "../../../engine/core/util.ts";
import { VertexPolyBoolean } from "../../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { Vertex } from "../../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { Length } from "../../../engine/math/length.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform, type TransformDecomposition } from "../../../engine/math/transform.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Block } from "../../../engine/scene/block.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Transform as ElementTransform } from "../../../engine/scene/element-transform.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image } from "../../../engine/scene/image.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Properties } from "../../../engine/scene/node-properties.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Path } from "../../../engine/scene/path.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { BlurEffect } from "../../../engine/style/effects/blur-effect.ts";
import { DropShadowEffect } from "../../../engine/style/effects/drop-shadow-effect.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { TexturePattern } from "../../../engine/style/texture-pattern.ts";
import { Font } from "../../../engine/text/fonts/font.ts";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { openTypeMeasure } from "../../../engine/text/gtl/measure.ts";
import { TLCore } from "../../../engine/text/gtl/tl-core.ts";
import { Text } from "../../../engine/text/text.ts";
import { TLPathTextTransformer } from "../../../engine/text/tl-path-text-transformer.ts";
import { SvgRenderContext } from "../../export/svg/svg-images.ts";
import { SvgUtil } from "../../export/svg/svg-util.ts";
import { arcToBezier } from "./helpers.ts";
import {
  aspectRatio,
  compressSpaces,
  createFont,
  createPath,
  getColor,
  SvgBounds,
  SvgPoint,
  SvgProperty,
  SvgTransform,
  toNumberArray,
  trim,
  ViewPort,
  type FillStyle,
  type PropertyValue,
  type SceneContext,
} from "./svg-values.ts";

/** The part of a DOM node the parser reads (an XML DOM from DOMParser). */
export interface SvgDomNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  attributes?: ArrayLike<{ nodeName: string; value: string }>;
  childNodes: ArrayLike<SvgDomNode>;
  textContent?: string | null;
  /** Old IE's text of a node; canvg still asked for it. */
  text?: string;
  cloneNode(deep: boolean): SvgDomNode;
}

/**
 * A scene node as the importer handles it. The old code called whatever
 * the node at hand had (after a hasMixin or instanceof check, or not), so
 * the importer works on this loose view of the engine classes; a method a
 * node doesn't have throws a TypeError, as before.
 */
export interface ImportNode {
  getParent(): ImportNode | null;
  appendChild(child: ImportNode): void;
  removeChild(child: ImportNode): void;
  getFirstChild(): ImportNode | null;
  getLastChild(): ImportNode | null;
  getNext(): ImportNode | null;
  getChildren(): ImportNode[];
  hasMixin(mixin: unknown): boolean;
  getProperty(name: string, custom?: boolean): unknown;
  setProperty(name: string, value: unknown, custom?: boolean): void;
  setProperties(names: string[], values: unknown[]): void;
  acceptChildren(visitor: (node: ImportNode) => unknown): void;
  querySingle(selector: string): ImportNode | null;
  getTransform(): Transform | null;
  setTransform(transform: Transform | null): void;
  transform(transform: Transform, force?: boolean): void;
  setBounds(x: number, y: number, width: number, height: number): void;
  getGeometryBBox(): Rect | null;
  getPaintLayers(): ImportPaintLayers | null;
  getEffects(): ImportNode | null;
  getStylePropertySets(): unknown[];
  getPaths(): ImportNode;
  getAnchorPoints(): ImportNode;
  validateInsertion(parent: unknown, reference?: unknown): boolean;
  assignFrom(other: ImportNode): void;
  rewindVertices(index: number): boolean;
  readVertex(vertex: Vertex): boolean;
  beginUpdate(): void;
  endUpdate(): void;
  getReferenceId(): string;
}

/** The paint layers list of a stylable node. */
export interface ImportPaintLayers extends ImportNode {
  getFillLayers(): ImportNode[];
  clearLayers(): void;
}

/** Any engine node or effect, seen as an ImportNode. */
export function importNode(node: object): ImportNode {
  return node as unknown as ImportNode;
}

/** What createSceneNode returns: a node, the texts of a <text>, or nothing. */
export type CreatedNode = ImportNode | ImportNode[] | null;

/** What toScene returns: a node, the texts of a <text>, or nothing. */
export type SceneResult = ImportNode | ImportNode[] | null | undefined;

/** The font provider of the import options (the app's font library search). */
export interface FontProvider {
  /** The callback's first argument is the answer; any further ones are passed on too. */
  queryFirst(query: FontQuery, callback: FontAnswerCallback): void;
}

/** What waits for a font provider answer. */
export type FontAnswerCallback = (result: FontAnswer | null, ...more: unknown[]) => void;

/** What the importer asks the font provider (an object whose prototype holds the fields). */
export interface FontQuery {
  text: Text;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  node: SvgTextElementBase;
}

/** A font provider's answer. */
export interface FontAnswer {
  family: string;
  weight: number;
  style: string;
}

export interface SvgParserOptions {
  fontProvider?: FontProvider;
  /** 1 logs the elements canvg doesn't know. */
  log?: number | boolean;
  [option: string]: unknown;
}

/** canvg's key of a font: "family_style_weight" (objects and undefined as strings). */
function fontKey(a: unknown, b?: unknown, c?: unknown): string {
  return String(a) + "_" + String(b) + "_" + String(c);
}

/**
 * svg.fontProvider: queues the queries to the options' font provider by
 * family, style and weight and answers every waiting query of the same
 * font with the first answer. The old code built the key from the query
 * object itself, so every query waited for the first one and got its
 * answer (BUGS-FIXED.md "BUG-072 Font queries are keyed "[object
 * Object]", so families get each other's answer").
 */
class FontProviderQueue {
  fontsToResolve = 0;
  fontCallbackMap = new Map<string, FontAnswerCallback[]>();

  constructor(
    readonly parser: SvgParser,
    readonly fontProvider: FontProvider | undefined,
  ) {}

  queryFirst(query: FontQuery, callback: FontAnswerCallback): void {
    if (0 == this.fontsToResolve) this.parser.beginJob();
    const key = fontKey(query.fontFamily, query.fontStyle, query.fontWeight);
    let callbacks = this.fontCallbackMap.get(key);
    if (!callbacks) {
      this.fontsToResolve++;
      callbacks = [];
      this.fontCallbackMap.set(key, callbacks);
    }
    callbacks.push(callback);
    if (1 === callbacks.length) {
      // No provider in the options throws here, as before.
      // Every waiting query gets all the arguments the provider answered
      // with (the old code applied `arguments`).
      // The job ends with the last answer even when a waiting query asks
      // again (a fallback family), since that query begins a job of its
      // own (BUGS-FIXED.md "BUG-071 SVG import never finishes when a font
      // is asked for after another resolved").
      (this.fontProvider as FontProvider).queryFirst(query, (...answer) => {
        const last = --this.fontsToResolve === 0;
        const waiting = this.fontCallbackMap.get(key);
        this.fontCallbackMap.delete(key);
        try {
          if (waiting) waiting.forEach((fn) => fn(...answer));
        } finally {
          if (last) this.parser.endJob();
        }
      });
    }
  }
}

/**
 * The parser state of one import (canvg's `svg` object): the options,
 * the font manager, the pending jobs (font lookups and loads) the import
 * callback waits for, the elements by id, the CSS rules, the texts on a
 * path by the id of their path, and the view port stack.
 */
export class SvgParser {
  readonly opts: SvgParserOptions;
  jobs = 0;
  jobCallback: (() => void) | null = null;
  readonly fontManager: FontManager;
  readonly fontProvider: FontProviderQueue;
  Definitions: Record<string, SvgElementBase> = {};
  Styles: Record<string, Record<string, SvgProperty>> = {};
  Images: SvgImage[] = [];
  References: Record<string, Text[]> = {};
  FontsToResolve = new Map<string, ((font: Font) => void)[]>();
  ViewPort = new ViewPort();
  _hasFontListener = false;
  readonly EmptyProperty: SvgProperty;

  constructor(options: SvgParserOptions, fontManager: FontManager) {
    this.opts = options;
    this.fontManager = fontManager;
    this.fontProvider = new FontProviderQueue(this, options.fontProvider);
    if (fontManager) {
      try {
        new TLCore().initialize(0, 0, fontManager);
      } catch {
        console.log("WARN: Could not load GTLCore");
      }
    }
    this.EmptyProperty = new SvgProperty(this, "EMPTY", "");
  }

  log(message: string): void {
    if (1 == this.opts.log && "undefined" != typeof console) console.log(message);
  }

  /** Calls back now, or once the last job ends. */
  waitFor(callback: () => void): void {
    if (this.hasJobs()) this.jobCallback = callback;
    else callback();
  }

  beginJob(): void {
    this.jobs++;
  }

  endJob(): void {
    this.jobs--;
    if (!this.jobs && this.jobCallback) this.jobCallback();
  }

  hasJobs(): boolean {
    return !!this.jobs;
  }

  property(name: string, value: PropertyValue): SvgProperty {
    return new SvgProperty(this, name, value);
  }

  addReference(id: string, text: Text): void {
    if (!this.References[id]) this.References[id] = [];
    (this.References[id] as Text[]).push(text);
  }

  isReferenced(node: unknown): boolean {
    const ids = Object.keys(this.References);
    for (const id of ids) {
      if (-1 !== (this.References[id] as unknown[]).indexOf(node)) return true;
    }
    return false;
  }

  /**
   * Calls back once the font manager reports the font available (with
   * it) or unavailable (with the default font). The listeners go on with
   * the first font and come off when none is left, and go on again for a
   * font asked for after that (BUGS-FIXED.md "BUG-071 SVG import never
   * finishes when a font is asked for after another resolved").
   */
  addFontToResolve(font: Font, callback: (font: Font) => void): void {
    if (!this._hasFontListener) {
      this.beginJob();
      this._hasFontListener = true;
      this.fontManager.addEventListener(
        FontManager.FontAvailableEvent,
        this._fontAvailableEvent,
        this,
      );
      this.fontManager.addEventListener(
        FontManager.FontUnavailableEvent,
        this._fontUnavailableEvent,
        this,
      );
    }
    const key = fontKey(font.getFamily(), font.getStyle(), font.getWeight());
    let callbacks = this.FontsToResolve.get(key);
    if (!callbacks) {
      callbacks = [];
      this.FontsToResolve.set(key, callbacks);
    }
    callbacks.push(callback);
  }

  _fontUnavailableEvent(event: Event & { font: Font }): void {
    this._resolvedFont(event.font, this.fontManager.getDefaultFont() as Font);
  }

  _fontAvailableEvent(event: Event & { font: Font }): void {
    this._resolvedFont(event.font);
  }

  _resolvedFont(font: Font, replacement?: Font): void {
    const key = fontKey(font.getFamily(), font.getStyle(), font.getWeight());
    try {
      const callbacks = this.FontsToResolve.get(key);
      if (callbacks) each(callbacks, (_index, callback) => callback(replacement || font));
    } finally {
      this.FontsToResolve.delete(key);
    }
    if (!this.hasFontsToResolve()) {
      // Off before the job ends, since ending it can finish the import.
      this.fontManager.removeEventListener(
        FontManager.FontAvailableEvent,
        this._fontAvailableEvent,
        this,
      );
      this.fontManager.removeEventListener(
        FontManager.FontUnavailableEvent,
        this._fontUnavailableEvent,
        this,
      );
      this._hasFontListener = false;
      this.endJob();
    }
  }

  hasFontsToResolve(): boolean {
    return !!this.FontsToResolve.size;
  }

  /** svg.ajax: a synchronous GET (images and SVG fonts that point at .svg files). */
  ajax(url: string): string {
    const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send(null);
    return request.responseText;
  }

  parseXml(text: string): Document {
    return new DOMParser().parseFromString(text, "text/xml");
  }

  /**
   * The element for a DOM element by its local name without dashes
   * ("font-face" -> fontface); MISSING for names canvg doesn't know. The
   * node name is set as the element's type after it is built.
   */
  CreateElement(node: SvgDomNode): SvgElementBase {
    let name = node.nodeName.replace(/^[^:]+:/, "");
    name = name.replace(/-/g, "");
    // BUG-006: the old canvg fork looked the name up with a plain property
    // read, so "constructor" or "toString" picked an Object.prototype member
    // and the whole import failed. Only the element table's own names count.
    const ElementClass = Object.prototype.hasOwnProperty.call(ELEMENTS, name)
      ? (ELEMENTS[name] as ElementConstructor)
      : SvgMissing;
    const element = new ElementClass(this, node);
    element.type = node.nodeName;
    return element;
  }
}

type ElementConstructor = new (svg: SvgParser, node?: SvgDomNode) => SvgElementBase;

/** Something an element's apply can be called on: a filter, a mask, a filter primitive. */
interface Applicable {
  apply(context: unknown, element: unknown, node?: unknown, stack?: unknown): unknown;
}

function hasApply(element: unknown): element is Applicable {
  return typeof (element as Partial<Applicable> | null | undefined)?.apply === "function";
}

function applyDefinition(definition: unknown): Applicable {
  if (!hasApply(definition)) throw new TypeError("apply is not a function");
  return definition;
}

// ---------------------------------------------------------------------------
// Element bases

/**
 * svg.Element.ElementBase: an element's attributes, its styles (from the
 * CSS rules for its tag, classes and id, then its style attribute) and
 * its children. Text nodes become tspans in elements that capture text.
 */
export class SvgElementBase {
  attributes: Record<string, SvgProperty> = {};
  styles: Record<string, SvgProperty> = {};
  children: SvgElementBase[] = [];
  parent: SvgElementBase | undefined;
  /** The DOM node name; set by CreateElement after construction. */
  type: string | undefined;
  /** Set on the root <svg>. */
  root: boolean | undefined;
  declare readonly captureTextNodes: boolean;

  constructor(
    readonly svg: SvgParser,
    readonly node?: SvgDomNode,
  ) {
    if (null != node && 1 == node.nodeType) this.parseNode(node);
  }

  private parseNode(node: SvgDomNode): void {
    const svg = this.svg;
    const attributes = node.attributes as ArrayLike<{ nodeName: string; value: string }>;
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i] as { nodeName: string; value: string };
      const property = svg.property(attribute.nodeName, attribute.value);
      property.owner = this;
      this.attributes[attribute.nodeName] = property;
    }
    const copy = (rules: Record<string, SvgProperty> | undefined) => {
      if (null != rules) for (const name in rules) this.styles[name] = rules[name] as SvgProperty;
    };
    copy(svg.Styles[node.nodeName]);
    if (this.attribute("class").hasValue()) {
      const classes = compressSpaces(this.attribute("class").value as string).split(" ");
      for (const name of classes) {
        copy(svg.Styles["." + name]);
        copy(svg.Styles[node.nodeName + "." + name]);
      }
    }
    if (this.attribute("id").hasValue()) copy(svg.Styles["#" + this.attribute("id").value]);
    if (this.attribute("style").hasValue()) {
      const declarations = (this.attribute("style").value as string).split(";");
      for (const declaration of declarations) {
        if ("" != trim(declaration)) {
          const parts = declaration.split(":");
          const name = trim(parts[0] as string);
          // A declaration without ":" throws in trim, as before.
          const value = trim(parts[1] as string);
          const property = svg.property(name, value);
          property.owner = this;
          this.styles[name] = property;
        }
      }
    }
    if (this.attribute("id").hasValue() && null == svg.Definitions[this.attribute("id").value]) {
      svg.Definitions[this.attribute("id").value] = this;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i] as SvgDomNode;
      if (1 == child.nodeType) this.addChild(child, true);
      if (this.captureTextNodes && (3 == child.nodeType || 4 == child.nodeType)) {
        const text = child.nodeValue || child.text || "";
        if ("" != trim(compressSpaces(text)) && !(this instanceof SvgTspan)) {
          const span = new SvgTspan(svg, child);
          const last = this.children.slice(-1).pop();
          if (last instanceof SvgTspan) {
            last.text += span.getText();
          } else {
            span.attributes = extend({}, span.attributes, this.attributes) as Record<
              string,
              SvgProperty
            >;
            this.addChild(span, false);
          }
        }
      }
    }
  }

  /** A copy made from a deep clone of the DOM node: no parent, no type. */
  clone(): SvgElementBase {
    const ElementClass = this.constructor as ElementConstructor;
    return new ElementClass(this.svg, (this.node as SvgDomNode).cloneNode(true));
  }

  attribute(name: string, createIfMissing?: boolean): SvgProperty {
    let attribute = this.attributes[name];
    if (null != attribute) return attribute;
    if (true == createIfMissing) {
      attribute = this.svg.property(name, "");
      this.attributes[name] = attribute;
    }
    return attribute || this.svg.EmptyProperty;
  }

  getHrefAttribute(): SvgProperty {
    for (const name in this.attributes) {
      if (name.match(/:href$/) || "href" === name) return this.attributes[name] as SvgProperty;
    }
    return this.svg.EmptyProperty;
  }

  /**
   * The style value: own style, else own attribute (then remembered as a
   * style), else, unless `noInherit`, the parent's style.
   */
  style(name: string, createIfMissing?: boolean, noInherit?: boolean): SvgProperty {
    let style = this.styles[name];
    if (null != style) return style;
    const attribute = this.attribute(name);
    if (null != attribute && attribute.hasValue()) {
      this.styles[name] = attribute;
      return attribute;
    }
    if (true != noInherit) {
      const parent = this.parent;
      if (null != parent) {
        const inherited = parent.style(name);
        if (null != inherited && inherited.hasValue()) return inherited;
      }
    }
    if (true == createIfMissing) {
      style = this.svg.property(name, "");
      this.styles[name] = style;
    }
    return style || this.svg.EmptyProperty;
  }

  createSceneNode(): CreatedNode {
    return null;
  }

  /**
   * Builds the element's node (or fills `target`): visibility, filter,
   * the element's own settings (setSceneContext), its children, then the
   * clip path and the mask around it. `stack` holds the contexts of the
   * ancestors; each carries the transform so far.
   */
  toScene(stack: SceneContext[], target?: ImportNode | null): SceneResult {
    let node = target || (this.createSceneNode() as ImportNode | null);
    if (node) {
      if (
        node instanceof Block &&
        node !== target &&
        ("none" == this.style("display").value || "hidden" == this.style("visibility").value)
      ) {
        node.setProperty("vis", false);
      }
      const context: SceneContext = {
        transform: stack.length
          ? (stack[stack.length - 1] as SceneContext).transform
          : new Transform(),
      };
      stack.push(context);
      if (this.style("filter", false, true).hasValue()) {
        const filter = this.style("filter").getDefinition();
        if (null != filter) applyDefinition(filter).apply(context, this, node);
      }
      this.setSceneContext(context, node);
      for (const child of this.children) {
        const result = child.toScene(stack);
        if (child instanceof SvgClipPath) continue;
        if (Array.isArray(result)) {
          const parent = node;
          each(result, (_index, item) => parent.appendChild(item));
        } else if (result && !result.getParent()) {
          node.appendChild(result);
        }
      }
      this.clearSceneContext(context, node);
      stack.pop();
      if (context.clipPath) {
        const clip = context.clipPath as ImportNode;
        clip.appendChild(node);
        node = clip;
        delete context.clipPath;
      }
      if (this.attribute("mask").hasValue()) {
        const mask = this.attribute("mask").getDefinition();
        if (null != mask) {
          node = applyDefinition(mask).apply(context, this, node, stack) as ImportNode;
        }
      }
    }
    return node;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden by the rendered elements
  setSceneContext(context: SceneContext, node?: ImportNode | null): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- canvg's hook, never overridden here
  clearSceneContext(context: SceneContext, node?: ImportNode | null): void {}

  /** Adds a child (built from a DOM node if `create`); <title> children are dropped. */
  addChild(child: SvgDomNode | SvgElementBase, create: boolean): void {
    const element = create
      ? this.svg.CreateElement(child as SvgDomNode)
      : (child as SvgElementBase);
    element.parent = this;
    if ("title" != element.type) this.children.push(element);
  }
}
Object.defineProperty(SvgElementBase.prototype, "captureTextNodes", {
  value: false,
  writable: true,
});

/**
 * svg.Element.RenderedElementBase: applies the element's transform,
 * name, svg attributes, opacity, fill, border and clip path to its node.
 */
export class SvgRenderedElementBase extends SvgElementBase {
  _clipPath: unknown = null;
  _transform: Transform | null = null;

  /**
   * The element's bounds. Only rendered elements have these two methods,
   * as in canvg, so calling them on a plain element (defs, stop, mask,
   * ...) is a TypeError.
   */
  getBoundingBox(): SvgBounds | null {
    throw new Error("getBoundingBox: unimplemented");
  }

  getAbsoluteBoundingBox(): SvgBounds | null {
    return this.getBoundingBox();
  }

  override setSceneContext(context: SceneContext, node?: ImportNode | null): void {
    if (this.attribute("transform").hasValue()) {
      const transform = new SvgTransform(this.svg, this.attribute("transform").value as string);
      const parent = context.transform;
      context.transform = new Transform();
      transform.apply(context);
      context.transform = context.transform.multiplied(parent);
    }
    if (node && node.hasMixin(Properties)) {
      const svgAttributes = ["type", "class"]
        .filter((name) => this.attributes[name])
        .reduce<Record<string, PropertyValue>>((out, name) => {
          out[name] = this.attribute(name).value;
          return out;
        }, {});
      if (Object.keys(svgAttributes).length) node.setProperty("svgattrs", svgAttributes, true);
    }
    if (node && node instanceof Block && this.attribute("id").hasValue()) {
      node.setProperty("name", this.attribute("id").value);
    }
    if (node && node.hasMixin(ElementTransform) && !context.transform.isIdentity()) {
      this._transform = context.transform;
      node.transform(context.transform, true);
    }
    if (node && node.hasMixin(Stylable)) {
      this.setPaintSceneContext(context, node);
    }
    if (this.style("clip-path", false, true).hasValue()) {
      const clipPath = this.style("clip-path", false, true).getDefinition<SvgClipPath>();
      if (clipPath) context.clipPath = clipPath.getPath(context);
    }
  }

  /** Opacity, the fill layer and the border layer of a stylable node. */
  private setPaintSceneContext(context: SceneContext, node: ImportNode): void {
    const propertySets = node.getStylePropertySets();
    const styleProperties: Record<string, unknown> = {};
    if (propertySets.indexOf(Stylable.PropertySet.Style) >= 0 && this.style("opacity").hasValue()) {
      styleProperties._stop = this.style("opacity").numValue();
    }
    const layers = node.getPaintLayers();
    if (layers) this.addFillLayer(node, layers);
    if (layers) this.addBorderLayer(context, node, layers);
    const names: string[] = [];
    const values: unknown[] = [];
    for (const name in styleProperties) {
      names.push(name);
      values.push(styleProperties[name]);
    }
    if (names.length) node.setProperties(names, values);
  }

  private addFillLayer(node: ImportNode, layers: ImportPaintLayers): void {
    const fillLayer = new Stylable.FillPaintLayer();
    // The layer's settings in the order they were made, as the old code
    // collected them on an array object.
    const finish = (settings: Record<string, unknown>) => {
      settings._vs = "boolean" != typeof settings._vs || settings._vs;
      if (this.style("fill-opacity").hasValue()) {
        settings._op = this.style("fill-opacity").numValue() * Math.min(settings._op as number, 1);
      }
      if ("number" == typeof settings._op) settings._op = Math.min(settings._op, 1);
      const defaultFill = SvgUtil.getDefaultFillForElement(this.type);
      const none = this.style("fill").hasValue() && "none" === this.style("fill").getValue();
      if (settings._pt) {
        settings._vs = true;
      } else if (settings._pt || none || !defaultFill) {
        settings._pt = RGBColor.BLACK;
        settings._vs = false;
      } else {
        settings._pt = defaultFill;
        settings._vs = true;
      }
      const values: unknown[] = [];
      const names: string[] = [];
      for (const name in settings) {
        names.push(name);
        values.push(settings[name]);
      }
      fillLayer.setProperties(names, values);
      layers.appendChild(importNode(fillLayer));
    };
    let color: unknown;
    let opacity: unknown = 1;
    const settings: Record<string, unknown> = {};
    if (this.style("fill").isUrlDefinition()) {
      this.style("fill")
        .getFillStyleDefinition(this, this.style("fill-opacity"))
        .then((fill: FillStyle) => {
          const urlSettings: Record<string, unknown> = {};
          let fillOpacity = fillLayer.getProperty("_op");
          if ("number" == typeof fill.opacity) fillOpacity = fill.opacity;
          if ("number" != typeof fillOpacity) fillOpacity = 1;
          color = fill.color;
          urlSettings._op = fillOpacity;
          urlSettings._pt = color;
          finish(urlSettings);
        });
    } else if (this.style("fill").hasValue()) {
      const fill = this.style("fill");
      if ("none" == fill.value) {
        color = null;
      } else {
        if ("currentColor" == fill.value) fill.value = this.style("color").value;
        const parsed = getColor(fill.value as string) || [RGBColor.BLACK, 1];
        if (parsed) {
          color = parsed[0];
          opacity = parsed[1];
        }
      }
      settings._op = opacity;
      settings._pt = color;
      finish(settings);
    } else if (!(node instanceof Image)) {
      color = RGBColor.BLACK;
      opacity = 1;
      settings._op = opacity;
      settings._pt = color;
      finish(settings);
    }
  }

  private addBorderLayer(context: SceneContext, node: ImportNode, layers: ImportPaintLayers): void {
    const borderLayer = new Stylable.BorderPaintLayer();
    const finish = (settings: Record<string, unknown>) => {
      if (node instanceof Path) settings._ba = Stylable.BorderAlignment.Center;
      if (this.style("stroke-opacity").hasValue()) {
        const current = Object.prototype.hasOwnProperty.call(settings, "_op") ? settings._op : 1;
        settings._op = this.style("stroke-opacity").numValue() * (current as number);
      }
      settings._bw = this.style("stroke-width").hasValue()
        ? this.style("stroke-width").toPixels()
        : 1;
      if (this.attribute("stroke-dasharray").hasValue()) {
        const dashText = this.attribute("stroke-dasharray").value as string;
        if ("" !== dashText.trim()) {
          const dashes: number[] = [];
          const parts = dashText.includes(",")
            ? dashText.replace(/\s/g, "").split(",")
            : dashText.split(" ");
          const count = Math.min(4, parts.length);
          for (let i = 0; i < count; i++) {
            const dash = Length.parseEquationValue(parts[i] as string);
            if (null !== dash && dash >= 0) dashes.push(dash);
          }
          if (dashes.length) settings._bds = dashes;
        }
      }
      if (this.attribute("mask").hasValue()) {
        settings._bw = (settings._bw as number) / 2;
        const mask = this.attribute("mask").getDefinition<SvgElementBase>();
        if (mask) {
          const outside = mask.attribute("x").numValue() < 0;
          settings._ba = outside
            ? Stylable.BorderAlignment.Outside
            : Stylable.BorderAlignment.Inside;
        }
      }
      if ("non-scaling-stroke" !== this.attribute("vector-effect").value) {
        const scale = context.transform.getScaleFactor();
        if (scale > 0 && 1 !== scale) settings._bw = (settings._bw as number) * scale;
      }
      if (this.style("stroke-linecap").hasValue()) {
        switch (this.style("stroke-linecap").value) {
          case "round":
            settings._blc = PaintCanvas.LineCap.Round;
            break;
          case "square":
            settings._blc = PaintCanvas.LineCap.Square;
            break;
          default:
            settings._blc = PaintCanvas.LineCap.Butt;
        }
      } else {
        settings._blc = PaintCanvas.LineCap.Butt;
      }
      if (this.style("stroke-linejoin").hasValue()) {
        switch (this.style("stroke-linejoin").value) {
          case "round":
            settings._blj = PaintCanvas.LineJoin.Round;
            break;
          case "bevel":
            settings._blj = PaintCanvas.LineJoin.Bevel;
            break;
          default:
            settings._blj = PaintCanvas.LineJoin.Miter;
        }
      } else {
        settings._blj = PaintCanvas.LineJoin.Miter;
      }
      settings._bml = this.style("stroke-miterlimit").hasValue()
        ? this.style("stroke-miterlimit").numValue()
        : 4;
      // The old code worked out a default pattern here (black or the
      // element's default fill) and then dropped it.
      const names: string[] = [];
      const values: unknown[] = [];
      for (const name in settings) {
        names.push(name);
        values.push(settings[name]);
      }
      borderLayer.setProperties(names, values);
      layers.appendChild(importNode(borderLayer));
    };
    const settings: Record<string, unknown> = {};
    if (this.style("stroke").isUrlDefinition()) {
      this.style("stroke")
        .getFillStyleDefinition(this, this.style("stroke-opacity"))
        .then((fill: FillStyle) => {
          const urlSettings: Record<string, unknown> = {};
          let strokeOpacity = borderLayer.getProperty("_op");
          if ("number" == typeof fill.opacity) strokeOpacity = fill.opacity;
          if ("number" != typeof strokeOpacity) strokeOpacity = 1;
          urlSettings._pt = fill.color;
          urlSettings._vs = true;
          urlSettings._op = Math.min(1, strokeOpacity as number);
          finish(urlSettings);
        });
    } else if (this.style("stroke").hasValue()) {
      const stroke = this.style("stroke");
      if ("none" == stroke.value) {
        settings._pt = null;
      } else {
        if ("currentColor" == stroke.value) stroke.value = this.style("color").value;
        const parsed = getColor(stroke.value as string) || [RGBColor.BLACK, 1];
        if (parsed) {
          settings._pt = parsed[0];
          settings._op = parsed[1];
        }
      }
      finish(settings);
    } else {
      settings._pt = null;
      finish(settings);
    }
  }
}

interface Capability {
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

/**
 * svg.Element.PromiseCapability: an element others can wait for. Texts
 * resolve once laid out; gradients and patterns used by them wait for
 * that before they measure the text's box.
 */
export class SvgPromiseCapability extends SvgRenderedElementBase {
  promise: Promise<void> | undefined;
  promiseCapability: Capability | undefined;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    const capability = {} as Capability;
    this.promise = new Promise<void>((resolve, reject) => {
      capability.resolve = resolve;
      capability.reject = reject;
    });
    this.promiseCapability = capability;
  }

  get resolve(): () => void {
    return (this.promiseCapability as Capability).resolve;
  }

  get reject(): (reason?: unknown) => void {
    return (this.promiseCapability as Capability).reject;
  }
}

/** Calls `fn` with a resolver now, or once the element (a text) is ready. */
function whenReady<T>(element: unknown, fn: (resolve: (value: T) => void) => void): Promise<T> {
  if (element instanceof SvgPromiseCapability) {
    const deferred = {} as { resolve: (value: T) => void };
    const promise = new Promise<T>((resolve) => {
      deferred.resolve = resolve;
    });
    // An <a> with elements has no promise and throws here, as before.
    (element.promise as Promise<void>).then(() => {
      fn(deferred.resolve);
    });
    return promise;
  }
  return new Promise<T>(fn);
}

/** svg.Element.PathElementBase: shapes that set the fill rule ("evenodd") on their paths. */
export class SvgPathElementBase extends SvgRenderedElementBase {
  override setSceneContext(context: SceneContext, node?: ImportNode | null): void {
    super.setSceneContext(context, node);
    if (node instanceof CompoundPath) {
      for (
        let path = importNode(node).getPaths().getFirstChild();
        null !== path;
        path = path.getNext()
      ) {
        this._setPathSceneContext(context, path);
      }
    }
    this._setPathSceneContext(context, node);
  }

  _setPathSceneContext(_context: SceneContext, node: ImportNode | null | undefined): void {
    if (node instanceof PathBase || node instanceof CompoundPath) {
      if ("inherit" != this.style("fill-rule").valueOrDefault("inherit")) {
        importNode(node).setProperty("evenodd", "evenodd" === this.style("fill-rule").value);
      } else {
        importNode(node).setProperty("evenodd", false);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Structure

/**
 * svg.Element.svg: a group positioned at x, y whose viewBox fits its
 * width and height. Only the transform goes to the children: the node
 * itself gets no transform, name or style (QUESTIONS.md "SVG import
 * nested svg"). A <switch> child with Gravit's editing data replaces
 * the whole content with the original document.
 */
export class SvgSvg extends SvgRenderedElementBase {
  override createSceneNode(): ImportNode | null {
    return importNode(new Group());
  }

  override setSceneContext(context: SceneContext): void {
    const svg = this.svg;
    if (!this.attribute("x").hasValue()) this.attribute("x", true).value = 0;
    if (!this.attribute("y").hasValue()) this.attribute("y", true).value = 0;
    context.transform = new Transform(
      1,
      0,
      0,
      1,
      this.attribute("x").toPixels("x"),
      this.attribute("y").toPixels("y"),
    ).multiplied(context.transform);
    super.setSceneContext(context, undefined);
    let width = svg.ViewPort.width();
    let height = svg.ViewPort.height();
    if (!this.attribute("width").hasValue()) this.attribute("width", true).value = "100%";
    if (!this.attribute("height").hasValue()) this.attribute("height", true).value = "100%";
    if (void 0 === this.root) {
      width = this.attribute("width").toPixels("x");
      height = this.attribute("height").toPixels("y");
      // canvg's clip offset; computed and dropped (an em length still throws).
      if (this.attribute("refX").hasValue() && this.attribute("refY").hasValue()) {
        this.attribute("refX").toPixels("x");
        this.attribute("refY").toPixels("y");
      }
    }
    // The view port is never removed again (clearContext was canvas-only),
    // so every nested <svg> leaves its size on the stack.
    svg.ViewPort.SetCurrent(width, height);
    if (this.attribute("viewBox").hasValue()) {
      const viewBox = toNumberArray(this.attribute("viewBox").value as string);
      const minX = viewBox[0];
      const minY = viewBox[1];
      width = viewBox[2] as number;
      height = viewBox[3] as number;
      aspectRatio(
        svg,
        context,
        this.attribute("preserveAspectRatio").value as string,
        svg.ViewPort.width(),
        width,
        svg.ViewPort.height(),
        height,
        minX,
        minY,
        this.attribute("refX").value,
        this.attribute("refY").value,
      );
      svg.ViewPort.RemoveCurrent();
      svg.ViewPort.SetCurrent(viewBox[2] as number, viewBox[3] as number);
    }
  }

  override toScene(stack: SceneContext[], target?: ImportNode | null): SceneResult {
    const switchElement = find(
      this.children,
      (child) => child instanceof SvgSwitch,
    ) as SvgSwitch | null;
    if (switchElement && switchElement.hasValidGraphicSource()) {
      const source = switchElement.renderGraphicSource();
      let node = target || (this.createSceneNode() as ImportNode | null);
      if (node && source) {
        if (source instanceof Page) {
          node = importNode(source);
        } else if (Array.isArray(source)) {
          const parent = node;
          each(source as ImportNode[], (_index, item) => parent.appendChild(item));
        } else {
          node.appendChild(importNode(source));
        }
        return node;
      }
    }
    return super.toScene(stack, target);
  }
}

export class SvgRect extends SvgRenderedElementBase {
  _bbox: SvgBounds | null = null;

  override createSceneNode(): ImportNode | null {
    const rectangle = new Rectangle();
    const x = this.attribute("x").toPixels("x");
    const y = this.attribute("y").toPixels("y");
    const width = this.attribute("width").toPixels("x");
    const height = this.attribute("height").toPixels("y");
    let rx = this.attribute("rx").toPixels("x");
    let ry = this.attribute("ry").toPixels("y");
    if (this.attribute("rx").hasValue() && !this.attribute("ry").hasValue()) ry = rx;
    if (this.attribute("ry").hasValue() && !this.attribute("rx").hasValue()) rx = ry;
    rx = Math.min(rx, width / 2);
    ry = Math.min(ry, height / 2);
    rectangle.setProperties(
      ["trf", "tl_sx", "tl_sy"],
      [new Transform(width / 2, 0, 0, height / 2, x + width / 2, y + height / 2), rx, ry],
    );
    this._bbox = new SvgBounds(x, y, width, height);
    return importNode(rectangle);
  }

  override getBoundingBox(): SvgBounds | null {
    return this._bbox;
  }
}

export class SvgCircle extends SvgRenderedElementBase {
  _bbox: SvgBounds | null = null;

  override createSceneNode(): ImportNode | null {
    const ellipse = new Ellipse();
    const cx = this.attribute("cx").toPixels("x");
    const cy = this.attribute("cy").toPixels("y");
    const r = this.attribute("r").toPixels();
    const x = cx - r;
    const y = cy - r;
    const width = 2 * r;
    const height = 2 * r;
    ellipse.setProperty(
      "trf",
      new Transform(width / 2, 0, 0, height / 2, x + width / 2, y + height / 2),
    );
    ellipse.getGeometryBBox();
    this._bbox = new SvgBounds(x, y, width, height);
    return importNode(ellipse);
  }

  override getBoundingBox(): SvgBounds | null {
    return this._bbox;
  }
}

export class SvgEllipse extends SvgRenderedElementBase {
  _bbox: SvgBounds | null = null;

  override createSceneNode(): ImportNode | null {
    const ellipse = new Ellipse();
    const rx = this.attribute("rx").toPixels("x");
    const ry = this.attribute("ry").toPixels("y");
    const x = this.attribute("cx").toPixels("x") - rx;
    const y = this.attribute("cy").toPixels("y") - ry;
    const width = 2 * rx;
    const height = 2 * ry;
    ellipse.setProperty(
      "trf",
      new Transform(width / 2, 0, 0, height / 2, x + width / 2, y + height / 2),
    );
    ellipse.getGeometryBBox();
    this._bbox = new SvgBounds(x, y, width, height);
    return importNode(ellipse);
  }

  override getBoundingBox(): SvgBounds | null {
    return this._bbox;
  }
}

/** A path of anchor points (line, polyline, polygon). */
function pathOfPoints(points: SvgPoint[], bounds: SvgBounds): Path {
  const path = new Path();
  const anchorPoints = importNode(path).getAnchorPoints();
  for (const point of points) {
    const anchor = new PathBase.AnchorPoint();
    anchorPoints.appendChild(importNode(anchor));
    anchor.setProperties(["x", "y"], [point.x, point.y]);
    bounds.expand(point);
  }
  return path;
}

export class SvgLine extends SvgPathElementBase {
  _bbox: SvgBounds | null = null;

  getPoints(): SvgPoint[] {
    return [
      new SvgPoint(this.attribute("x1").toPixels("x"), this.attribute("y1").toPixels("y")),
      new SvgPoint(this.attribute("x2").toPixels("x"), this.attribute("y2").toPixels("y")),
    ];
  }

  override createSceneNode(): ImportNode | null {
    this._bbox = new SvgBounds();
    return importNode(pathOfPoints(this.getPoints(), this._bbox));
  }

  override getBoundingBox(): SvgBounds | null {
    return this._bbox;
  }
}

export class SvgPolyline extends SvgPathElementBase {
  _bbox: SvgBounds | null = null;
  points: SvgPoint[];

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.points = createPath(this.attribute("points").value as string);
  }

  override createSceneNode(): ImportNode | null {
    this._bbox = new SvgBounds();
    return importNode(pathOfPoints(this.points, this._bbox));
  }

  override getBoundingBox(): SvgBounds | null {
    return this._bbox;
  }
}

export class SvgPolygon extends SvgPolyline {
  override createSceneNode(): ImportNode | null {
    const node = super.createSceneNode() as ImportNode;
    node.setProperty("closed", true);
    return node;
  }
}

/**
 * canvg's path data tokenizer: the "d" text is split into commands and
 * numbers by spaces after the regex clean-up in SvgPath.
 */
class PathTokens {
  tokens: string[];
  i = -1;
  command = "";
  previousCommand = "";
  start = new SvgPoint(0, 0);
  control = new SvgPoint(0, 0);
  current = new SvgPoint(0, 0);

  constructor(text: string) {
    this.tokens = text.split(" ");
  }

  reset(): void {
    this.i = -1;
    this.command = "";
    this.previousCommand = "";
    this.start = new SvgPoint(0, 0);
    this.control = new SvgPoint(0, 0);
    this.current = new SvgPoint(0, 0);
  }

  isEnd(): boolean {
    return this.i >= this.tokens.length - 1;
  }

  isCommandOrEnd(): boolean {
    return !!this.isEnd() || null != (this.tokens[this.i + 1] as string).match(/^[A-Za-z]$/);
  }

  isRelativeCommand(): boolean {
    switch (this.command) {
      case "m":
      case "l":
      case "h":
      case "v":
      case "c":
      case "s":
      case "q":
      case "t":
      case "a":
      case "z":
        return true;
    }
    return false;
  }

  getToken(): string {
    this.i++;
    return this.tokens[this.i] as string;
  }

  getScalar(): number {
    return parseFloat(this.getToken());
  }

  nextCommand(): void {
    this.previousCommand = this.command;
    this.command = this.getToken();
  }

  getPoint(): SvgPoint {
    const point = new SvgPoint(this.getScalar(), this.getScalar());
    return this.makeAbsolute(point);
  }

  getAsControlPoint(): SvgPoint {
    const point = this.getPoint();
    this.control = point;
    return point;
  }

  getAsCurrentPoint(): SvgPoint {
    const point = this.getPoint();
    this.current = point;
    return point;
  }

  getReflectedControlPoint(): SvgPoint {
    return "c" != this.previousCommand.toLowerCase() &&
      "s" != this.previousCommand.toLowerCase() &&
      "q" != this.previousCommand.toLowerCase() &&
      "t" != this.previousCommand.toLowerCase()
      ? this.current
      : new SvgPoint(2 * this.current.x - this.control.x, 2 * this.current.y - this.control.y);
  }

  makeAbsolute(point: SvgPoint): SvgPoint {
    if (this.isRelativeCommand()) {
      point.x += this.current.x;
      point.y += this.current.y;
    }
    return point;
  }
}

/** canvg's clean-up of path data before splitting it at spaces. */
export function normalizePathData(d: string): string {
  d = d.replace(/,/gm, " ");
  d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm, "$1 $2");
  d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm, "$1 $2");
  d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm, "$1 $2");
  d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm, "$1 $2");
  d = d.replace(/([0-9])([+-])/gm, "$1 $2");
  d = d.replace(/(\.[0-9]*)(\.)/gm, "$1 $2");
  d = d.replace(/(\.[0-9]*)(\.)/gm, "$1 $2");
  d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm, "$1 $3 $4 ");
  d = compressSpaces(d);
  return trim(d);
}

/**
 * svg.Element.path: the path data as vertices, then a path or compound
 * path. Quadratic and cubic segments keep their control points; arcs
 * become cubics (see arcToBezier). An H or V right after a close starts
 * a new sub-path at the close vertex, whose position is undefined.
 */
export class SvgPath extends SvgPathElementBase {
  _bbox: SvgBounds | null = null;
  PathParser: PathTokens;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.PathParser = new PathTokens(normalizePathData(this.attribute("d").value as string));
  }

  override createSceneNode(): ImportNode | null {
    const C = Vertex.Command;
    const parser = this.PathParser;
    parser.reset();
    const vertices = new VertexContainer();
    // canvg's undefined coordinates of a close vertex (VertexContainer stores them as given).
    const none = undefined as unknown as number;
    while (!parser.isEnd()) {
      parser.nextCommand();
      switch (parser.command) {
        case "M":
        case "m": {
          let point = parser.getAsCurrentPoint();
          vertices.addVertex(C.Move, point.x, point.y);
          parser.start = parser.current;
          while (!parser.isCommandOrEnd()) {
            point = parser.getAsCurrentPoint();
            vertices.addVertex(C.Line, point.x, point.y);
          }
          break;
        }
        case "L":
        case "l":
          while (!parser.isCommandOrEnd()) {
            const point = parser.getAsCurrentPoint();
            vertices.addVertex(C.Line, point.x, point.y);
          }
          break;
        case "H":
        case "h":
          while (!parser.isCommandOrEnd()) {
            vertices.rewindVertices(vertices.getCount() - 1);
            const last = new Vertex();
            if (vertices.readVertex(last) && last.command === C.Close) {
              vertices.addVertex(C.Move, last.x, last.y);
            }
            const point = new SvgPoint(
              (parser.isRelativeCommand() ? parser.current.x : 0) + parser.getScalar(),
              parser.current.y,
            );
            parser.current = point;
            vertices.addVertex(C.Line, parser.current.x, parser.current.y);
          }
          break;
        case "V":
        case "v":
          while (!parser.isCommandOrEnd()) {
            vertices.rewindVertices(vertices.getCount() - 1);
            const last = new Vertex();
            if (vertices.readVertex(last) && last.command === C.Close) {
              vertices.addVertex(C.Move, last.x, last.y);
            }
            const point = new SvgPoint(
              parser.current.x,
              (parser.isRelativeCommand() ? parser.current.y : 0) + parser.getScalar(),
            );
            parser.current = point;
            vertices.addVertex(C.Line, parser.current.x, parser.current.y);
          }
          break;
        case "C":
        case "c":
          while (!parser.isCommandOrEnd()) {
            const control1 = parser.getPoint();
            const control2 = parser.getAsControlPoint();
            const end = parser.getAsCurrentPoint();
            vertices.addVertex(C.Curve2, end.x, end.y);
            vertices.addVertex(C.Curve2, control1.x, control1.y);
            vertices.addVertex(C.Curve2, control2.x, control2.y);
          }
          break;
        case "S":
        case "s":
          while (!parser.isCommandOrEnd()) {
            const control1 = parser.getReflectedControlPoint();
            const control2 = parser.getAsControlPoint();
            const end = parser.getAsCurrentPoint();
            vertices.addVertex(C.Curve2, end.x, end.y);
            vertices.addVertex(C.Curve2, control1.x, control1.y);
            vertices.addVertex(C.Curve2, control2.x, control2.y);
          }
          break;
        case "Q":
        case "q":
          while (!parser.isCommandOrEnd()) {
            const control = parser.getAsControlPoint();
            const end = parser.getAsCurrentPoint();
            vertices.addVertex(C.Curve, end.x, end.y);
            vertices.addVertex(C.Curve, control.x, control.y);
          }
          break;
        case "T":
        case "t":
          while (!parser.isCommandOrEnd()) {
            const control = parser.getReflectedControlPoint();
            parser.control = control;
            const end = parser.getAsCurrentPoint();
            vertices.addVertex(C.Curve, end.x, end.y);
            vertices.addVertex(C.Curve, control.x, control.y);
          }
          break;
        case "A":
        case "a":
          while (!parser.isCommandOrEnd()) {
            const start = parser.current;
            const rx = parser.getScalar();
            const ry = parser.getScalar();
            const rotation = parser.getScalar() * (Math.PI / 180);
            const largeArcFlag = parser.getScalar();
            const sweepFlag = parser.getScalar();
            const end = parser.getAsCurrentPoint();
            const curves = arcToBezier({
              px: start.x,
              py: start.y,
              cx: end.x,
              cy: end.y,
              rx,
              ry,
              xAxisRotation: rotation,
              largeArcFlag,
              sweepFlag,
            });
            each(curves, (_index, curve) => {
              vertices.addVertex(C.Curve2, curve.x, curve.y);
              vertices.addVertex(C.Curve2, curve.x1, curve.y1);
              vertices.addVertex(C.Curve2, curve.x2, curve.y2);
            });
          }
          break;
        case "Z":
        case "z":
          vertices.addVertex(C.Close, none, none);
          parser.current = parser.start;
      }
    }
    const path = PathUtil.createPathFromVertexSource(vertices, false, true) as
      Path | CompoundPath | null;
    if (path) {
      const bbox = path.getGeometryBBox();
      if (bbox)
        this._bbox = new SvgBounds(bbox.getX(), bbox.getY(), bbox.getWidth(), bbox.getHeight());
    }
    return path ? importNode(path) : (path as null);
  }

  override getBoundingBox(): SvgBounds | null {
    return this._bbox;
  }
}

/**
 * svg.Element.switch: a group with the switch's settings around its first
 * child that isn't a foreignObject or unknown; the other children are
 * alternatives and are left out. The old code took that child's node and
 * built every child into it (BUGS-FIXED.md "BUG-073 <switch> imports
 * every child").
 */
export class SvgSwitch extends SvgRenderedElementBase {
  /** The child the switch renders, or null. */
  renderedChild(): SvgElementBase | null {
    for (const child of this.children) {
      if (!(child instanceof SvgForeignObject) && !(child instanceof SvgMissing)) return child;
    }
    return null;
  }

  override createSceneNode(): CreatedNode {
    return this.renderedChild() ? importNode(new Group()) : null;
  }

  override toScene(stack: SceneContext[], target?: ImportNode | null): SceneResult {
    const children = this.children;
    const rendered = this.renderedChild();
    this.children = rendered ? [rendered] : [];
    try {
      return super.toScene(stack, target);
    } finally {
      this.children = children;
    }
  }

  getGraphicSource(): SvgForeignObject | null {
    return find(
      this.children,
      (child) => child instanceof SvgForeignObject,
    ) as SvgForeignObject | null;
  }

  hasValidGraphicSource(): boolean | null {
    const source = this.getGraphicSource();
    return source && source.isValid();
  }

  renderGraphicSource(): unknown {
    return (this.getGraphicSource() as SvgForeignObject).renderGraphicSource();
  }
}

export class SvgMarker extends SvgElementBase {}

/** svg.Element.defs: builds its children (which registers nothing new) and returns nothing. */
export class SvgDefs extends SvgElementBase {
  override toScene(stack: SceneContext[]): SceneResult {
    const context: SceneContext = {
      transform: stack.length
        ? (stack[stack.length - 1] as SceneContext).transform
        : new Transform(),
    };
    stack.push(context);
    this.setSceneContext(context, this.node as unknown as ImportNode);
    for (const child of this.children) child.toScene(stack);
    this.clearSceneContext(context, this.node as unknown as ImportNode);
    stack.pop();
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Paint servers

/**
 * svg.Element.pattern: the pattern's children as a texture. A single
 * image becomes the texture's URL; otherwise the group is the texture.
 * With objectBoundingBox units the size is the element's box, or a
 * percentage when width and height are percentages.
 */
export class SvgPattern extends SvgPromiseCapability {
  createPattern(_ctx: undefined, element: SvgElementBase): Promise<FillStyle> {
    return whenReady<FillStyle>(element, (resolve) => {
      let width = this.attribute("width").toPixels("x", true);
      let height = this.attribute("height").toPixels("y", true);
      const svgElement = new SvgSvg(this.svg);
      svgElement.attributes.viewBox = this.svg.property("viewBox", this.attribute("viewBox").value);
      svgElement.attributes.width = this.svg.property("width", width + "px");
      svgElement.attributes.height = this.svg.property("height", height + "px");
      svgElement.attributes.transform = this.svg.property(
        "transform",
        this.attribute("patternTransform").value,
      );
      svgElement.children = this.children;
      const group = svgElement.toScene([]) as ImportNode | null;
      let pattern: unknown = RGBColor.WHITE;
      if (group) {
        let texture: unknown = group;
        if (group.getFirstChild() instanceof Image && 1 == group.getChildren().length) {
          texture = (group.getFirstChild() as unknown as Image).$url;
        }
        let sizeMode: string = TexturePattern.SizeMode.Length;
        if (
          "objectBoundingBox" === this.attribute("patternUnits").valueOrDefault("objectBoundingBox")
        ) {
          const widthAttribute = this.attribute("width");
          const heightAttribute = this.attribute("height");
          if (
            (widthAttribute.getValue() + "").match(/%$/) &&
            (heightAttribute.getValue() + "").match(/%$/)
          ) {
            width = 100 * widthAttribute.numValue();
            height = 100 * heightAttribute.numValue();
            sizeMode = TexturePattern.SizeMode.Percent;
          } else {
            const bounds = (element as SvgRenderedElementBase).getBoundingBox() as SvgBounds;
            width = bounds.width();
            height = bounds.height();
          }
        }
        const texturePattern = new TexturePattern(
          texture as ConstructorParameters<typeof TexturePattern>[0],
          TexturePattern.RepeatMode.Both,
        );
        texturePattern.setWidth(width);
        texturePattern.setHeight(height);
        texturePattern.setSizeMode(sizeMode);
        pattern = texturePattern;
      }
      resolve({ color: pattern, opacity: null });
    });
  }
}

/** A gradient stop (svg.Element.stop): offset clamped to 0-1 and the color with its stop-opacity. */
export class SvgStop extends SvgElementBase {
  offset: number;
  color: PropertyValue;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.offset = this.attribute("offset").numValue();
    if (this.offset < 0) this.offset = 0;
    if (this.offset > 1) this.offset = 1;
    let color = this.style("stop-color");
    if (this.style("stop-opacity").hasValue()) color = color.addOpacity(this.style("stop-opacity"));
    this.color = color.value;
  }
}

/**
 * svg.Element.GradientBase: the stops (of the gradient an href names,
 * if any) and the gradient's own transform turned into a Gravit
 * gradient once the element using it is ready.
 */
export class SvgGradientBase extends SvgElementBase {
  gradientUnits: PropertyValue;
  stops: SvgStop[] = [];

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.gradientUnits = this.attribute("gradientUnits").valueOrDefault("objectBoundingBox");
    for (const child of this.children) {
      if ("stop" == child.type) {
        const stop = child as SvgStop;
        if (Number.isNaN(stop.offset)) stop.offset = 0;
        this.stops.push(stop);
      }
    }
  }

  getGradient(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implemented by the gradients
    ...args: [undefined, SvgElementBase, SvgStop[], string | null]
  ): Promise<unknown> {
    throw new Error("svg.Element.GradientBase.getGradient: virtual method");
  }

  createGradient(ctx: undefined, element: SvgElementBase): Promise<FillStyle> {
    const source = this.getHrefAttribute().hasValue()
      ? (this.getHrefAttribute().getDefinition() as SvgGradientBase)
      : this;
    const deferred = {} as { resolve: (fill: FillStyle) => void };
    const promise = new Promise<FillStyle>((resolve) => {
      deferred.resolve = resolve;
    });
    this.getGradient(
      ctx,
      element,
      source.stops,
      this.attribute("gradientTransform").hasValue()
        ? (this.attribute("gradientTransform").value as string)
        : null,
    ).then((gradient) => {
      if (null == gradient) {
        // Only the radial gradient resolves with null. A last stop
        // without a valid color resolves with no color and then throws,
        // as before.
        const color = getColor((source.stops[source.stops.length - 1] as SvgStop).color as string);
        if (!color) deferred.resolve({ color: null, opacity: null });
        deferred.resolve({
          color: (color as [RGBColor, number])[0],
          opacity: (color as [RGBColor, number])[1],
        });
      }
      deferred.resolve({ color: gradient, opacity: null });
    });
    return promise;
  }
}

interface GradientStopSpec {
  position: number;
  color: RGBColor;
  opacity: number;
}

/**
 * svg.Element.linearGradient. The SVG gradient line is turned into
 * Gravit's (angle, scale and stop positions relative to the element's
 * box). A gradient whose two points are equal never resolves, so the
 * element gets no fill at all.
 */
export class SvgLinearGradient extends SvgGradientBase {
  override getGradient(
    _ctx: undefined,
    element: SvgElementBase,
    stops: SvgStop[],
    gradientTransform: string | null,
  ): Promise<unknown> {
    return whenReady<unknown>(element, (resolve) => {
      const box = (element as SvgRenderedElementBase).getAbsoluteBoundingBox() as SvgBounds;
      if (
        !this.attribute("x1").hasValue() &&
        !this.attribute("y1").hasValue() &&
        !this.attribute("x2").hasValue() &&
        !this.attribute("y2").hasValue()
      ) {
        this.attribute("x1", true).value = 0;
        this.attribute("y1", true).value = 0;
        this.attribute("x2", true).value = 1;
        this.attribute("y2", true).value = 0;
      }
      const boxUnits = "objectBoundingBox" == this.gradientUnits;
      let x1 = boxUnits
        ? box.x() + box.width() * this.attribute("x1").numValue()
        : this.attribute("x1").toPixels("x");
      let y1 = boxUnits
        ? box.y() + box.height() * this.attribute("y1").numValue()
        : this.attribute("y1").toPixels("y");
      let x2 = boxUnits
        ? box.x() + box.width() * this.attribute("x2").numValue()
        : this.attribute("x2").toPixels("x");
      let y2 = boxUnits
        ? box.y() + box.height() * this.attribute("y2").numValue()
        : this.attribute("y2").toPixels("y");
      if (x1 == x2 && y1 == y2) return;
      if (gradientTransform) {
        const transform = new SvgTransform(this.svg, gradientTransform);
        const context: SceneContext = { transform: new Transform() };
        transform.apply(context);
        if (boxUnits) {
          const m = context.transform.getMatrix();
          context.transform = new Transform(
            m[0] as number,
            m[1] as number,
            m[2] as number,
            m[3] as number,
            (m[4] as number) * box.width(),
            (m[5] as number) * box.height(),
          );
        }
        const start = context.transform.mapPoint(new Point(x1, y1));
        const end = context.transform.mapPoint(new Point(x2, y2));
        x1 = start.getX();
        x2 = end.getX();
        y1 = start.getY();
        y2 = end.getY();
      }
      let dx = x2 - x1;
      let dy = y2 - y1;
      let reversed = false;
      let swap: number;
      if ("objectBoundingBox" == this.gradientUnits && dx < 0) {
        reversed = true;
        dx = -dx;
        dy = -dy;
        swap = x2;
        x2 = x1;
        x1 = swap;
        swap = y2;
        y2 = y1;
        y1 = swap;
        stops.sort((a, b) => a.offset - b.offset);
        reverseOffsets(stops);
        stops.sort((a, b) => a.offset - b.offset);
      }
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;
      let angle = Math.atan2(unitY, unitX);
      const centerX = box.x() + 0.5 * box.width();
      const centerY = box.y() + 0.5 * box.height();
      const along = ((centerX - x1) * dx + (centerY - y1) * dy) / (dx * dx + dy * dy);
      const footX = x1 + along * dx;
      const footY = y1 + along * dy;
      let toEdge = (box.x() - centerX) / dx;
      const toEdgeY = (box.y() - centerY) / dy;
      if (Math.abs(toEdge) > Math.abs(toEdgeY)) toEdge = toEdgeY;
      const edgeX = centerX + toEdge * dx;
      const edgeY = centerY + toEdge * dy;
      const halfSpan = GMath.ptDist(centerX, centerY, edgeX, edgeY);
      const spanStartX = footX - halfSpan * unitX;
      const spanStartY = footY - halfSpan * unitY;
      const span = 2 * halfSpan;
      let startX: number | undefined;
      let startY: number | undefined;
      const startOffset = 0 != dx ? (x1 - spanStartX) / unitX : (y1 - spanStartY) / unitY;
      const shift = startOffset / span;
      let scale = (startOffset + length) / span - shift;
      const out: GradientStopSpec[] = [];
      // Blends a stop's color toward a neighbour's when the stop falls
      // outside 0-1 (on the color pair from getColor).
      const blend = (
        neighbour: SvgStop,
        color: [RGBColor, number],
        amount: number,
        invert?: boolean,
      ) => {
        const other = getColor(neighbour.color as string) as [RGBColor, number];
        const from = other[0].toScreen(false);
        const to = color[0].toScreen(false);
        const fromOpacity = other[1];
        const toOpacity = color[1];
        if (invert) amount = 1 - amount;
        color[0] = new RGBColor([
          Math.round((from[0] as number) * (1 - amount) + (to[0] as number) * amount),
          Math.round((from[1] as number) * (1 - amount) + (to[1] as number) * amount),
          Math.round((from[2] as number) * (1 - amount) + (to[2] as number) * amount),
        ]);
        color[1] = fromOpacity * (1 - amount) + toOpacity * amount;
      };
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i] as SvgStop;
        const color = getColor(stop.color as string);
        let position = stop.offset * scale + shift;
        if (color) {
          if ("userSpaceOnUse" == this.gradientUnits) {
            position = stop.offset;
          } else if (position < 0) {
            const next = i < stops.length - 1 ? (stops[i + 1] as SvgStop) : null;
            if (next) {
              if (next.offset * scale + shift <= 0) continue;
              blend(next, color, -position / scale, true);
            }
            position = 0;
          } else if (position > 1) {
            const previous = i > 0 ? (stops[i - 1] as SvgStop) : null;
            if (previous) blend(previous, color, 1 / (position - shift));
            position = 1;
          }
          out.push({ position, color: color[0], opacity: color[1] });
        } else {
          out.push({ position, color: RGBColor.BLACK, opacity: 1 });
        }
      }
      if (0 == out.length && stops.length > 0) {
        const color = getColor((stops[stops.length - 1] as SvgStop).color as string) as [
          RGBColor,
          number,
        ];
        out.push({ position: 0, color: color[0], opacity: color[1] });
        out.push({ position: 1, color: color[0], opacity: color[1] });
      }
      if (reversed) {
        reverseOffsets(stops);
        stops.sort((a, b) => a.offset - b.offset);
      }
      scale = 1;
      if ("userSpaceOnUse" == this.gradientUnits) {
        const toBox = Transform.getNativeRectTransformation(
          Rect.fromPoints(new Point(box._x0, box._y0), new Point(box._x1, box._y1)),
        ).inverted();
        if (toBox) {
          const start = toBox.mapPoint(new Point(x1, y1));
          const end = toBox.mapPoint(new Point(x2, y2));
          startX = start.getX();
          startY = start.getY();
          const mappedX = end.getX() - start.getX();
          const mappedY = end.getY() - start.getY();
          angle = -GMath.normalizeAngleRadians(-Math.atan2(mappedY, mappedX));
          const userAngle = -GMath.normalizeAngleRadians(-Math.atan2(y2 - y1, x2 - x1));
          let userScale: number;
          if (0 !== mappedX) {
            scale = mappedX / Math.cos(angle);
            userScale = mappedX / Math.cos(userAngle);
          } else {
            scale = mappedY / Math.sin(angle);
            userScale = mappedY / Math.sin(userAngle);
          }
          if ((scale = Math.min(scale, userScale)) < Number.MIN_VALUE || scale > Number.MAX_VALUE) {
            scale = 1;
          }
          const ownBox = (element as SvgRenderedElementBase).getBoundingBox() as SvgBounds;
          const absolute = new Rect(box.x(), box.y(), box.width(), box.height());
          const own = new Rect(ownBox.x(), ownBox.y(), ownBox.width(), ownBox.height());
          if (!Rect.equals(absolute, own)) scale = box.width() / ownBox.width();
          angle = userAngle;
        }
      }
      resolve(new LinearGradient(out, scale, angle, startX, startY));
    });
  }
}

/** Swaps the offsets of the first and last stop, the second and second last, ... */
function reverseOffsets(stops: SvgStop[]): void {
  for (let i = 0; i < stops.length / 2; i++) {
    const swap = (stops[i] as SvgStop).offset;
    (stops[i] as SvgStop).offset = (stops[stops.length - i - 1] as SvgStop).offset;
    (stops[stops.length - i - 1] as SvgStop).offset = swap;
  }
}

/**
 * svg.Element.radialGradient: center, focus and radius as given (box
 * fractions or pixels). With a gradientTransform in user space, the
 * center and focus are mapped into the element's box.
 */
export class SvgRadialGradient extends SvgGradientBase {
  override getGradient(
    _ctx: undefined,
    element: SvgElementBase,
    stops: SvgStop[],
    gradientTransform: string | null,
  ): Promise<unknown> {
    return whenReady<unknown>(element, (resolve) => {
      let cx: number | undefined;
      let cy: number | undefined;
      let fx: number | undefined;
      let fy: number | undefined;
      const box = (element as SvgRenderedElementBase).getAbsoluteBoundingBox() as SvgBounds;
      if (!this.attribute("cx").hasValue()) this.attribute("cx", true).value = "50%";
      if (!this.attribute("cy").hasValue()) this.attribute("cy", true).value = "50%";
      if (!this.attribute("r").hasValue()) this.attribute("r", true).value = "50%";
      if ("objectBoundingBox" == this.gradientUnits) {
        cx = this.attribute("cx").hasValue() ? this.attribute("cx").numValue() : void 0;
        cy = this.attribute("cy").hasValue() ? this.attribute("cy").numValue() : void 0;
        fx = this.attribute("fx").hasValue() ? this.attribute("fx").numValue() : cx;
        fy = this.attribute("fy").hasValue() ? this.attribute("fy").numValue() : cy;
      } else {
        cx = this.attribute("cx").hasValue() ? this.attribute("cx").toPixels("x") : void 0;
        cy = this.attribute("cy").hasValue() ? this.attribute("cy").toPixels("y") : void 0;
        fx = this.attribute("fx").hasValue() ? this.attribute("fx").toPixels("x") : cx;
        fy = this.attribute("fy").hasValue() ? this.attribute("fy").toPixels("y") : cy;
      }
      const radius = this.attribute("r").numValue();
      const out: GradientStopSpec[] = [];
      for (const stop of stops) {
        const color = getColor(stop.color as string);
        if (color) out.push({ position: stop.offset, color: color[0], opacity: color[1] });
        else out.push({ position: stop.offset * radius, color: RGBColor.BLACK, opacity: 1 });
      }
      const gradient = new RadialGradient(out, radius, fx, fy, cx, cy);
      if (gradientTransform) {
        const transform = new SvgTransform(this.svg, gradientTransform);
        const context: SceneContext = { transform: new Transform() };
        transform.apply(context);
        if ("objectBoundingBox" !== this.gradientUnits) {
          let center = context.transform.mapPoint(new Point(cx as number, cy as number));
          let focus = context.transform.mapPoint(new Point(fx as number, fy as number));
          const toBox = Transform.getNativeRectTransformation(
            new Rect(box.x(), box.y(), box.width(), box.height()),
          ).inverted();
          if (!toBox) {
            resolve(null);
            return;
          }
          center = toBox.mapPoint(center);
          focus = toBox.mapPoint(focus);
          gradient._cx = center.getX();
          gradient._cy = center.getY();
          gradient._fx = focus.getX();
          gradient._fy = focus.getY();
          gradient._scale = focus.getX() === center.getX() ? 1 : 1 / (radius / box.width());
          // canvg kept the skew and rotation of the transform; nothing uses them.
          const parts = context.transform.decomposed() as TransformDecomposition;
          context.transform = parts.skew.multiplied(parts.rotate);
        }
      }
      resolve(gradient);
    });
  }
}

// ---------------------------------------------------------------------------
// SVG fonts (kept as definitions; the text import doesn't use them)

export class SvgFontFace extends SvgElementBase {
  ascent: PropertyValue;
  descent: PropertyValue;
  unitsPerEm: number;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.ascent = this.attribute("ascent").value;
    this.descent = this.attribute("descent").value;
    this.unitsPerEm = this.attribute("units-per-em").numValue();
  }
}

export class SvgMissingGlyph extends SvgPath {
  horizAdvX = 0;
}

export class SvgGlyph extends SvgPath {
  horizAdvX: number;
  unicode: PropertyValue;
  arabicForm: PropertyValue;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.horizAdvX = this.attribute("horiz-adv-x").numValue();
    this.unicode = this.attribute("unicode").value;
    this.arabicForm = this.attribute("arabic-form").value;
  }
}

/** svg.Element.font: registers itself under its font-face's family. */
export class SvgFont extends SvgElementBase {
  horizAdvX: number;
  isRTL = false;
  isArabic = false;
  fontFace: SvgElementBase | null = null;
  missingGlyph: SvgElementBase | null = null;
  glyphs: Record<string, SvgGlyph | Record<string, SvgGlyph>> = {};

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.horizAdvX = this.attribute("horiz-adv-x").numValue();
    for (const child of this.children) {
      if ("font-face" == child.type) {
        this.fontFace = child;
        if (child.style("font-family").hasValue()) {
          svg.Definitions[child.style("font-family").value] = this;
        }
      } else if ("missing-glyph" == child.type) {
        this.missingGlyph = child;
      } else if ("glyph" == child.type) {
        const glyph = child as SvgGlyph;
        if ("" != glyph.arabicForm) {
          this.isRTL = true;
          this.isArabic = true;
          if (void 0 === this.glyphs[glyph.unicode]) this.glyphs[glyph.unicode] = {};
          (this.glyphs[glyph.unicode] as Record<string, SvgGlyph>)[glyph.arabicForm] = glyph;
        } else {
          this.glyphs[glyph.unicode] = glyph;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Text

/**
 * svg.Element.TextElementBase: a text part that becomes a Gravit text.
 * Once laid out (ready) it resolves its promise, which lets gradients
 * and patterns measure it.
 */
export class SvgTextElementBase extends SvgPromiseCapability {
  bbox: Rect | null = null;
  element: Text | null = null;

  getText(): string | undefined {
    return undefined;
  }

  /** Lays the text out in a workspace of its own if it has no box yet, then resolves. */
  ready(): void {
    if (this.element) {
      const bbox = this.element.getGeometryBBox();
      if (!bbox || bbox.isEmpty()) {
        const workspace = new Workspace();
        workspace._fontManager = this.svg.fontManager;
        this.element._setWorkspace(workspace);
        this.element.repaint();
        this.bbox = this.element.getGeometryBBox();
      }
      this.resolve();
    }
  }

  /** The text's box, with its width as the height too (QUESTIONS.md "SVG import text box"). */
  override getBoundingBox(): SvgBounds | null {
    return this.bbox
      ? new SvgBounds(
          this.bbox.getX(),
          this.bbox.getY(),
          this.bbox.getWidth(),
          this.bbox.getWidth(),
        )
      : new SvgBounds(0, 0, 0, 0);
  }
}

/** "bold" -> 700 and so on through GFont.Weight's names; numbers as numbers. */
function parseFontWeight(weight: string): number {
  if (isNaN(weight as unknown as number)) {
    if ("inherit" !== weight && "normal" !== weight) {
      const names = Object.keys(Font.Weight);
      for (const name of names) {
        if (name.toLowerCase() === weight.toLowerCase()) {
          return (Font.Weight as Record<string, number>)[name] as number;
        }
      }
    }
    return Font.Weight.Regular;
  }
  return parseInt(weight);
}

function parseFontStyle(style: string): string {
  return "normal" === style ? Font.Style.Normal : Font.Style.Italic;
}

/**
 * A font-family entry as the font provider gets it: quotes and the
 * first space removed, a "-Weight" suffix dropped, then camel case and
 * digits split into words ("OpenSans-Bold" -> "Open Sans").
 */
export function cleanFontFamily(family: string): string {
  family = family.replace(/["']/g, "").replace(" ", "").trim();
  const dash = family.indexOf("-");
  if (-1 !== dash) {
    const suffix = family.substring(dash + 1, family.length).trim();
    if ((Font.Weight as Record<string, number>)[suffix] || "normal" === suffix.toLowerCase()) {
      family = family.substring(0, dash).trim();
    }
  }
  return family
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/([0-9])([a-z])/gi, "$1 $2")
    .trim();
}

/** The fields of a font query on its prototype, as the old code made them (Object.create). */
function fontQuery(fields: FontQuery): FontQuery {
  return Object.create(fields) as FontQuery;
}

/**
 * svg.Element.text: one Gravit text per tspan (text nodes become
 * tspans). The texts are positioned at the tspan's x and y once their
 * font is known, shifted by the font's ascent and the text anchor.
 * Children of a textPath are attached to the path's id; tref and a
 * inside a text are skipped. Each text gets the settings of the tspan it
 * came from. The old code gave it those of the child at the same index
 * and spliced the textPath out of the children (BUGS-FIXED.md "BUG-074
 * Text children take the position and style of another child").
 */
export class SvgText extends SvgTextElementBase {
  /** The tspan each created text came from, in the order of the texts. */
  spans: SvgTextElementBase[] = [];

  override toScene(stack: SceneContext[]): SceneResult {
    const texts = this.createSceneNode();
    if (texts) {
      each(texts, (index, text) => {
        const context: SceneContext = {
          transform: stack.length
            ? (stack[stack.length - 1] as SceneContext).transform
            : new Transform(),
        };
        stack.push(context);
        const child = this.spans[index as number] as SvgTextElementBase;
        child.attributes = extend({}, this.attributes, child.attributes) as Record<
          string,
          SvgProperty
        >;
        child.setSceneContext(context, text);
        child.clearSceneContext(context, text);
        child.ready();
        stack.pop();
      });
    }
    return texts;
  }

  override getBoundingBox(): SvgBounds | null {
    if (this.spans.length) {
      let united: Rect | null = null;
      for (const child of this.spans) {
        const bbox = (child as SvgTextElementBase).bbox;
        if (bbox && !bbox.isEmpty()) united = united ? united.united(bbox) : bbox;
      }
      if (united) {
        return new SvgBounds(united.getX(), united.getY(), united.getWidth(), united.getHeight());
      }
    }
    return super.getBoundingBox();
  }

  override createSceneNode(): ImportNode[] {
    const svg = this.svg;
    const texts: ImportNode[] = [];
    this.spans = [];
    const createText = (span: SvgTextElementBase): Text => {
      let fontSize = span.attribute("font-size").hasValue()
        ? span.attribute("font-size").toPixels()
        : span.style("font-size").toPixels();
      fontSize = fontSize || 16;
      const text = new Text();
      text.setProperty("_tfi", fontSize);
      text.setText(span.getText());
      const position = new Transform().translated(
        span.attribute("x").toPixels(),
        span.attribute("y").toPixels() - fontSize,
      );
      text.setProperty("sc", true);
      text.transform(position);
      svg.fontManager.getDefaultFont();
      let family: string | undefined;
      // Positions the text once its font is known.
      const place = (element: Text, font: Font, owner: SvgTextElementBase) => {
        owner.element = element;
        try {
          if (font.isResolved()) {
            const css: (string | number)[] = [];
            css.push("font:");
            css.push(font.getStyle() === Font.Style.Normal ? "normal" : "italic");
            css.push(font.getWeight());
            css.push(fontSize + "px");
            css.push(font.getFamily());
            // `new` on the meter: a null result gives an empty object.
            const metrics: { ascent?: number; width?: number } =
              openTypeMeasure(owner.getText() as string, css.join(" ")) ?? {};
            let shift = 0;
            const ascent = metrics.ascent || fontSize;
            const anchor = owner.style("text-anchor");
            if (anchor.hasValue()) {
              if ("middle" === anchor.getValue()) shift = (metrics.width as number) / 2;
              else if ("end" === anchor.getValue()) shift = metrics.width as number;
            }
            let offset = new Transform().translated(-shift, -ascent + fontSize);
            if (element.getTransform() && owner._transform) {
              const origin = new Transform().translated(
                owner.attribute("x").toPixels(),
                owner.attribute("y").toPixels() - fontSize,
              );
              const rest = (origin.multiplied(owner._transform).inverted() as Transform).multiplied(
                element.getTransform() as Transform,
              );
              offset = origin.multiplied(offset).multiplied(owner._transform).multiplied(rest);
              element.setTransform(offset);
              owner.ready();
            } else {
              element.transform(offset);
            }
          } else {
            owner.reject(new Error("Unresolved font"));
          }
        } catch (error) {
          owner.reject(error);
        }
      };
      const setFont = (
        element: Text,
        familyName: string,
        weight: number,
        style: string,
        owner: SvgTextElementBase,
      ) => {
        element.setProperties(["_tff", "_tfw", "_tfs"], [familyName, weight, style]);
        let font = svg.fontManager.getFont(familyName, style as never, weight) as Font;
        if (font.isFailed()) font = svg.fontManager.getDefaultFont() as Font;
        if (font.isResolved()) place(element, font, owner);
        else svg.addFontToResolve(font, (resolved) => place(element, resolved, owner));
      };
      let style: string = Font.Style.Normal;
      let weight: number = Font.Weight.Regular;
      if (span.style("font-weight").hasValue()) {
        weight = parseFontWeight(span.style("font-weight").value as string);
      }
      if (span.style("font-style").hasValue()) {
        style = parseFontStyle(span.style("font-style").value as string);
      }
      // The parser always has its provider queue, so this is the path.
      const families = (span.style("font-family").value as string).split(",");
      const queries: FontQuery[] = [];
      families.forEach((entry) => {
        const fontText = [
          span.style("font-style").value || "normal",
          span.style("font-variant").value || "normal",
          span.style("font-weight").value || "normal",
          fontSize,
          entry,
        ].join(" ");
        const parsed = createFont(fontText);
        entry = cleanFontFamily(entry);
        if (entry.length) {
          queries.push(
            fontQuery({
              text,
              fontFamily: entry,
              fontWeight: parsed.fontWeight ? parseFontWeight(parsed.fontWeight) : weight,
              fontStyle: parsed.fontStyle ? parseFontStyle(parsed.fontStyle) : style,
              node: span,
            }),
          );
        }
      });
      queries.slice().forEach((query) => {
        queries.push(
          fontQuery({
            text: query.text,
            fontFamily: (svg.fontManager.getDefaultFont() as Font).getFamily(),
            fontWeight: query.fontWeight,
            fontStyle: query.fontStyle,
            node: span,
          }),
        );
      });
      const first = queries.shift();
      if (first) {
        // Every retry runs with the first query as `this` (a bound
        // function can't be bound again).
        const answered = (answer: FontAnswer | null) => {
          const query = first;
          if (answer) {
            setFont(query.text, answer.family, answer.weight, answer.style, query.node);
          } else if (queries.length) {
            const next = queries.shift() as FontQuery;
            svg.fontProvider.queryFirst(next, answered);
          } else {
            setFont(
              query.text,
              families.length ? (families[0] as string) : "Open Sans",
              query.fontWeight,
              query.fontStyle,
              query.node,
            );
          }
        };
        svg.fontProvider.queryFirst(first, answered);
      } else {
        family = families.length ? families[0] : "Open Sans";
      }
      if (family) setFont(text, family, weight, style, span);
      texts.push(importNode(text));
      this.spans.push(span);
      return text;
    };
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i] as SvgElementBase;
      if (child instanceof SvgTspan) {
        createText(child);
      } else if (child instanceof SvgTextPath) {
        const textPath = child;
        if (textPath.getHrefAttribute().hasValue()) {
          const path = textPath.getHrefAttribute().getDefinition() as SvgElementBase;
          each(textPath.children, (_index, span) => {
            const startOffset = textPath.attribute("startOffset").toPixels("x");
            const text = createText(span as SvgTextElementBase);
            text.setProperties(["tpths", "tpthl"], [TLPathTextTransformer.OUTSIDE, startOffset]);
            svg.addReference(path.attribute("id").getValue() as string, text);
          });
        }
      }
    }
    return texts;
  }
}
Object.defineProperty(SvgText.prototype, "captureTextNodes", { value: true, writable: true });

/**
 * svg.Element.tspan: a run of text. On a path (a referenced text), the
 * font size takes the transform's scale.
 */
export class SvgTspan extends SvgTextElementBase {
  text: string;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    const source = node as SvgDomNode;
    this.text = source.nodeValue || source.text || source.textContent || "";
  }

  override getText(): string {
    return this.text;
  }

  override setSceneContext(context: SceneContext, node?: ImportNode | null): void {
    super.setSceneContext(context, node);
    if (this.svg.isReferenced(node)) {
      const text = node as ImportNode;
      const transform = text.getTransform();
      if (transform && !transform.isIdentity()) {
        text.setProperty("_tfi", (text.getProperty("_tfi") as number) * transform.getScaleFactor());
      }
    }
  }

  override getAbsoluteBoundingBox(): SvgBounds | null {
    return (this.parent as SvgRenderedElementBase).getBoundingBox();
  }
}
Object.defineProperty(SvgTspan.prototype, "captureTextNodes", { value: true, writable: true });

export class SvgTextPath extends SvgText {}

/** svg.Element.tref: the text of the referenced element's first child (never imported, see SvgText). */
export class SvgTref extends SvgTextElementBase {
  override getText(): string | undefined {
    const definition = this.getHrefAttribute().getDefinition<SvgElementBase>();
    if (null != definition) return (definition.children[0] as SvgTextElementBase).getText();
    return undefined;
  }
}

/**
 * svg.Element.a: with only text inside, a text part; otherwise a group
 * (then it has none of a text part's promise or methods and throws
 * where they are used).
 */
export class SvgAnchor extends SvgTextElementBase {
  hasText: boolean;
  text: string;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    const source = node as SvgDomNode;
    let hasText = true;
    for (let i = 0; i < source.childNodes.length; i++) {
      if (3 != (source.childNodes[i] as SvgDomNode).nodeType) hasText = false;
    }
    this.hasText = hasText;
    if (!hasText) {
      this.promise = undefined;
      this.promiseCapability = undefined;
    }
    this.text = hasText ? ((source.childNodes[0] as SvgDomNode).nodeValue as string) : "";
  }

  override getText(): string {
    return this.text;
  }

  override createSceneNode(): ImportNode | null {
    return this.hasText ? null : importNode(new Group());
  }

  override ready(): void {
    if (!this.hasText) throw new TypeError("ready is not a function");
    super.ready();
  }

  override getBoundingBox(): SvgBounds | null {
    if (!this.hasText) throw new Error("getBoundingBox: unimplemented");
    return super.getBoundingBox();
  }
}

// ---------------------------------------------------------------------------
// Images, groups, symbols, styles, use

/**
 * svg.Element.image: a Gravit image of the href, sized to width and
 * height once it has loaded. The status listener is never removed (the
 * old code removed `this`, not the listener), so a later reload scales
 * the image again (QUESTIONS.md "SVG import image listener").
 */
export class SvgImage extends SvgRect {
  loaded: boolean | undefined;
  img: string | undefined;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    const href = this.getHrefAttribute().value as string;
    if ("" != href) {
      const isSvg = href.match(/\.svg$/);
      svg.Images.push(this);
      this.loaded = false;
      if (isSvg) {
        this.img = svg.ajax(href);
        this.loaded = true;
      }
      // Dropped: canvg also loaded every other href into an <img> for
      // drawing (with crossOrigin "Anonymous" when the `useCORS` option
      // was set), logged 'ERROR: image "<href>" not found' through
      // opts.log when it failed, and set `loaded` to true either way.
      // Nothing reads `img` or `loaded` for those images (the scene image
      // loads its URL itself), so only that second request and the log
      // line are gone, and `loaded` stays false.
    }
  }

  override createSceneNode(): ImportNode | null {
    const image = new Image();
    image.setProperty("url", this.getHrefAttribute().value);
    const x = this.attribute("x").toPixels("x");
    const y = this.attribute("y").toPixels("y");
    const width = this.attribute("width").toPixels("x");
    const height = this.attribute("height").toPixels("y");
    let rx = this.attribute("rx").toPixels("x");
    let ry = this.attribute("ry").toPixels("y");
    if (this.attribute("rx").hasValue() && !this.attribute("ry").hasValue()) ry = rx;
    if (this.attribute("ry").hasValue() && !this.attribute("rx").hasValue()) rx = ry;
    rx = Math.min(rx, width / 2);
    ry = Math.min(ry, height / 2);
    image.setProperties(["tl_sx", "tl_sy"], [rx, ry]);
    const fit = (event?: { image: Image | null }) => {
      if (event) {
        const status = (event.image as Image).getStatus();
        if (status !== Image.ImageStatus.Loaded && status !== Image.ImageStatus.Error) return;
      }
      const transform = (
        (image.getProperty("trf") as Transform | null) || new Transform()
      ).preMultiplied(
        new Transform(width / (image.$iw as number), 0, 0, height / (image.$ih as number), x, y),
      );
      image.setProperties(["trf", "itrf"], [transform, transform]);
    };
    if (image.getStatus() === Image.ImageStatus.Loaded) fit();
    else if (image.getStatus() !== Image.ImageStatus.Error) {
      image.addEventListener(Image.StatusEvent, fit);
    }
    this._bbox = new SvgBounds(x, y, width, height);
    return importNode(image);
  }
}

export class SvgG extends SvgRenderedElementBase {
  override createSceneNode(): ImportNode | null {
    return importNode(new Group());
  }
}

/**
 * svg.Element.symbol: the node of its first child (not a foreignObject
 * or unknown) with the symbol's settings; the other children and the
 * viewBox are ignored.
 */
export class SvgSymbol extends SvgRenderedElementBase {
  override toScene(stack: SceneContext[], target?: ImportNode | null): SceneResult {
    let node = target || (this.createSceneNode() as ImportNode | null);
    if (node) {
      if (
        node instanceof Block &&
        node !== target &&
        ("none" == this.style("display").value || "hidden" == this.style("visibility").value)
      ) {
        node.setProperty("vis", false);
      }
      const context: SceneContext = {
        transform: stack.length
          ? (stack[stack.length - 1] as SceneContext).transform
          : new Transform(),
      };
      stack.push(context);
      if (this.style("filter", false, true).hasValue()) {
        const filter = this.style("filter").getDefinition();
        if (null != filter) applyDefinition(filter).apply(context, this, node);
      }
      this.setSceneContext(context, node);
      this.clearSceneContext(context, node);
      stack.pop();
      if (context.clipPath) {
        const clip = context.clipPath as ImportNode;
        clip.appendChild(node);
        node = clip;
        delete context.clipPath;
      }
      if (this.attribute("mask").hasValue()) {
        const mask = this.attribute("mask").getDefinition();
        if (null != mask)
          node = applyDefinition(mask).apply(context, this, node, stack) as ImportNode;
      }
    }
    return node;
  }

  override createSceneNode(): CreatedNode {
    for (const child of this.children) {
      if (!(child instanceof SvgForeignObject) && !(child instanceof SvgMissing)) {
        return child.createSceneNode();
      }
    }
    return null;
  }
}

/**
 * svg.Element.style: CSS rules ("selector, selector { name: value }")
 * into the parser's styles, which elements built after it pick up.
 * @font-face rules with an SVG font load that font synchronously.
 */
export class SvgStyle extends SvgElementBase {
  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    const source = node as SvgDomNode;
    let css = "";
    for (let i = 0; i < source.childNodes.length; i++) {
      css += (source.childNodes[i] as SvgDomNode).nodeValue;
    }
    css = css.replace(/(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(^[\s]*\/\/.*)/gm, "");
    css = compressSpaces(css);
    const blocks = css.split("}");
    for (const block of blocks) {
      if (!block || "" == trim(block)) continue;
      const parts = block.split("{");
      if (parts.length <= 1) continue;
      const selectors = (parts[0] as string).split(",");
      const declarations = (parts[1] as string).split(";");
      for (const selectorText of selectors) {
        const selector = trim(selectorText);
        if ("" == selector) continue;
        const rules = svg.Styles[selector] || {};
        for (const declaration of declarations) {
          const colon = declaration.indexOf(":");
          const name = declaration.substr(0, colon);
          const value = declaration.substr(colon + 1, declaration.length - colon);
          if (null != name && null != value)
            rules[trim(name)] = svg.property(trim(name), trim(value));
        }
        svg.Styles[selector] = rules;
        if ("@font-face" == selector) {
          // A rule without font-family throws here, as before.
          const fontFamily = ((rules["font-family"] as SvgProperty).value as string).replace(
            /"/g,
            "",
          );
          const src = (rules.src as SvgProperty).value as string;
          if (src) {
            const sources = src.split(",");
            for (const fontSource of sources) {
              if (fontSource.indexOf('format("svg")') > 0) {
                const start = fontSource.indexOf("url");
                const end = fontSource.indexOf(")", start);
                const url = fontSource.substr(start + 5, end - start - 6);
                const fonts = svg.parseXml(svg.ajax(url)).getElementsByTagName("font");
                for (let f = 0; f < fonts.length; f++) {
                  const font = svg.CreateElement(fonts[f] as unknown as SvgDomNode);
                  svg.Definitions[fontFamily] = font;
                }
              }
            }
          }
        }
      }
    }
  }
}

/** The attributes of a <use> that aren't copied onto the referenced element. */
const USE_PARAMETERS = ["href", "xlink:href", "x", "y", "transform", "width", "height"];

/**
 * svg.Element.use: a fresh copy of the referenced element (built from
 * its DOM node again, without parent or type) with the use's style and
 * other attributes, then moved by the use's transform, x and y. The CSS
 * rules of the use's classes style the copy where it sets nothing itself,
 * as if it inherited them from the use. The old code copied the class
 * only as an attribute, after the copy had picked its rules
 * (BUGS-FIXED.md "BUG-075 class on <use> doesn't style the instance").
 */
export class SvgUse extends SvgRenderedElementBase {
  element: SvgElementBase | undefined;

  _setSceneContext(context: SceneContext, node: ImportNode): void {
    if (this.attribute("transform").hasValue()) {
      const transform = new SvgTransform(this.svg, this.attribute("transform").value as string);
      const parent = context.transform;
      context.transform = new Transform();
      transform.apply(context);
      context.transform = parent.multiplied(context.transform);
    }
    const x = this.attribute("x");
    if (x.hasValue()) context.transform = context.transform.translated(x.numValue(), 0);
    const y = this.attribute("y");
    if (y.hasValue()) context.transform = context.transform.translated(0, y.numValue());
    if (node && node.hasMixin(ElementTransform) && !context.transform.isIdentity()) {
      this._transform = context.transform;
      node.setTransform(context.transform);
    }
  }

  override toScene(stack: SceneContext[], target?: ImportNode | null): SceneResult {
    let definition = this.getHrefAttribute().getDefinition<SvgElementBase>();
    if (!definition) return null;
    definition = definition.clone();
    if (this.attribute("class").hasValue()) {
      const instance = definition;
      const inherit = (rules: Record<string, SvgProperty> | undefined) => {
        if (null == rules) return;
        for (const name of Object.keys(rules)) {
          if (null == instance.styles[name] && !instance.attribute(name).hasValue()) {
            instance.styles[name] = rules[name] as SvgProperty;
          }
        }
      };
      const classes = compressSpaces(this.attribute("class").value as string).split(" ");
      // Later rules win, as in parseNode: collect them first, newest last.
      const rules: Record<string, SvgProperty> = {};
      for (const name of classes) {
        Object.assign(rules, this.svg.Styles["." + name], this.svg.Styles["use." + name]);
      }
      inherit(rules);
    }
    if (this.attribute("style").hasValue()) {
      const declarations = (this.attribute("style").value as string).split(";");
      for (const declaration of declarations) {
        if ("" != trim(declaration)) {
          const parts = declaration.split(":");
          const name = trim(parts[0] as string);
          const value = trim(parts[1] as string);
          const property = this.svg.property(name, value);
          property.owner = definition;
          definition.styles[name] = property;
        }
      }
    }
    const copy = definition;
    Object.keys(this.attributes)
      .filter((name) => !USE_PARAMETERS.includes(name))
      .forEach((name) => {
        const attribute = this.attributes[name] as SvgProperty;
        if (attribute.hasValue()) copy.attributes[name] = attribute;
      });
    stack.push({ transform: new Transform() });
    const result = copy.toScene(stack, target);
    stack.pop();
    const place = (node: ImportNode) => {
      const context: SceneContext = {
        transform: node.getTransform() ? (node.getTransform() as Transform) : new Transform(),
      };
      this._setSceneContext(context, node);
      const parent = stack[stack.length - 1]
        ? (stack[stack.length - 1] as SceneContext).transform
        : new Transform();
      if (node.hasMixin(ElementTransform)) {
        node.setTransform((node.getTransform() || new Transform()).multiplied(parent));
      }
    };
    // A referenced <text> gives its texts as a list; each is placed. The
    // old code treated the list as one node and threw (BUGS-FIXED.md
    // "BUG-076 <use> of a <text> fails the import").
    if (Array.isArray(result)) each(result, (_index, node) => place(node));
    else if (result) place(result);
    return result;
  }

  override createSceneNode(): CreatedNode {
    this.element = this.getHrefAttribute().getDefinition<SvgElementBase>();
    return this.element ? this.element.createSceneNode() : null;
  }

  override getBoundingBox(): SvgBounds | null {
    return this.element ? (this.element as SvgRenderedElementBase).getBoundingBox() : null;
  }
}

// ---------------------------------------------------------------------------
// Masks, clip paths, filters

/**
 * svg.Element.mask: the mask's shapes become one shape (black areas cut
 * out of white ones), with its fills made transparent white, and the
 * masked node goes inside it (inside its only path, if it has one).
 */
export class SvgMask extends SvgElementBase {
  apply(
    _context: SceneContext,
    _element: SvgElementBase,
    node: ImportNode,
    stack: SceneContext[],
  ): ImportNode {
    const mask = this._toScene(stack);
    if (mask) {
      const paths: ImportNode[] = [];
      mask.acceptChildren((child) => {
        if (child instanceof Path) paths.push(child);
      });
      if (0 === paths.length && mask instanceof Path) paths.push(mask);
      if (1 === paths.length) (paths[0] as ImportNode).appendChild(node);
      else mask.appendChild(node);
      return mask;
    }
    return node;
  }

  _toScene(stack: SceneContext[], target?: ImportNode | null): ImportNode | null {
    let node = target || this._createSceneNode(stack);
    if (node) {
      if (
        node instanceof Block &&
        node !== target &&
        ("none" == this.style("display").value || "hidden" == this.style("visibility").value)
      ) {
        node.setProperty("vis", false);
      }
      const context: SceneContext = {
        transform: stack.length
          ? (stack[stack.length - 1] as SceneContext).transform
          : new Transform(),
      };
      stack.push(context);
      if (this.style("filter", false, true).hasValue()) {
        const filter = this.style("filter").getDefinition();
        if (null != filter) applyDefinition(filter).apply(context, this, node);
      }
      this.setSceneContext(context, node);
      this.clearSceneContext(context, node);
      stack.pop();
      if (context.clipPath) {
        const clip = context.clipPath as ImportNode;
        clip.appendChild(node);
        node = clip;
        delete context.clipPath;
      }
    }
    return node;
  }

  _createSceneNode(stack: SceneContext[]): ImportNode | null {
    // Whether a node's fills include black (it cuts out of the mask).
    const isBlack = (node: ImportNode, fallback?: boolean): boolean | null => {
      const layers = node && node.hasMixin(Stylable) && node.getPaintLayers();
      const fills = (layers && layers.getFillLayers()) as ImportNode[];
      return fills.length
        ? fills.some((fill) => {
            const pattern = fill.getProperty("_pt");
            return !!pattern && RGBColor.equals(pattern, RGBColor.BLACK);
          })
        : fallback || false;
    };
    const clearFills = (node: ImportNode) => {
      const layers = node && node.hasMixin(Stylable) && node.getPaintLayers();
      ((layers && layers.getFillLayers()) as ImportNode[]).forEach((fill) => {
        fill.setProperties(["_pt", "_op"], [RGBColor.WHITE, 0]);
      });
    };
    let items: ImportNode[] = [];
    for (const child of this.children) {
      const result = child.toScene(stack);
      items = items.concat(this._getValidItems(result as ImportNode));
    }
    const shape = importNode(new CompoundShape());
    if (items.length > 1) {
      try {
        const inShapes: ImportNode[] = [];
        const others: ImportNode[] = [];
        for (const item of items) {
          if (item.getParent() instanceof CompoundShape) inShapes.push(item);
          else others.push(item);
        }
        items = inShapes.concat(others);
        shape.beginUpdate();
        // An inconsistent comparator, kept as it is: the result depends on
        // the engine's sort.
        items.sort((a, b) => {
          const aBlack = isBlack(a);
          const bBlack = isBlack(b);
          return aBlack && bBlack ? 0 : aBlack ? 1 : -1;
        });
        for (const item of items) {
          item.setProperty("bool", isBlack(item) ? VertexPolyBoolean.SUB : VertexPolyBoolean.AND);
          clearFills(item);
          shape.appendChild(item);
        }
      } finally {
        shape.endUpdate();
      }
      const path = PathUtil.createPathFromVertexSource(shape as unknown as VertexSource) as
        Path | CompoundPath | null;
      if (path) {
        (shape as unknown as { $trf: unknown }).$trf = null;
        importNode(path).assignFrom(shape);
        clearFills(importNode(path));
        return importNode(path);
      }
      return null;
    }
    if (1 === items.length) {
      const item = items[0] as ImportNode;
      clearFills(item);
      if (item.getParent()) (item.getParent() as ImportNode).removeChild(item);
      return item;
    }
    return null;
  }

  /** The vertex sources below groups and compound shapes that may go into a compound shape. */
  _getValidItems(node: ImportNode): ImportNode[] {
    let items: ImportNode[] = [];
    if (node instanceof Group || node instanceof CompoundShape) {
      for (let child = node.getFirstChild(); null !== child; child = child.getNext()) {
        items = items.concat(this._getValidItems(importNode(child)));
      }
    } else if (node.hasMixin(VertexSource) && node.validateInsertion(new CompoundShape())) {
      items.push(node);
    }
    return items;
  }
}

/**
 * svg.Element.clipPath: the clip path's shapes (their own nodes, without
 * children) in the clipped element's transform, merged into one path
 * without style. clipPathUnits are ignored.
 */
export class SvgClipPath extends SvgElementBase {
  getPath(context: SceneContext): ImportNode | null {
    const nodes: ImportNode[] = [];
    for (const child of this.children) {
      const node = child.createSceneNode() as ImportNode | null;
      if (node) {
        const childContext: SceneContext = { transform: context.transform || new Transform() };
        child.setSceneContext(childContext, node);
        child.clearSceneContext(childContext, node);
        nodes.push(node);
      }
    }
    if (nodes && nodes.length) {
      let path: ImportNode | null;
      if (1 == nodes.length) {
        path = nodes[0] as ImportNode;
      } else {
        const vertices = new VertexContainer();
        const vertex = new Vertex();
        const collect = (node: ImportNode) => {
          if (node instanceof Group) {
            for (let child = node.getFirstChild(); null != child; child = child.getNext()) {
              collect(importNode(child));
            }
          } else {
            for (node.rewindVertices(0); node.readVertex(vertex);) {
              vertices.addVertex(vertex.command, vertex.x, vertex.y);
            }
          }
        };
        for (const node of nodes) collect(node);
        const merged = PathUtil.createPathFromVertexSource(vertices, false, true) as
          Path | CompoundPath | null;
        path = merged ? importNode(merged) : null;
      }
      if (path) {
        if (path.hasMixin(Stylable)) {
          const layers = path.getPaintLayers();
          if (layers) layers.clearLayers();
        }
        return path;
      }
    }
    return null;
  }

  override toScene(): SceneResult {
    return null;
  }

  override createSceneNode(): ImportNode | null {
    return null;
  }
}

/**
 * svg.Element.filter. With x, y, width and height set, the element is
 * first resized to them (width read along y and height along x). An
 * offset and blur followed by a composite or blend become one drop
 * shadow; otherwise every primitive applies itself (blur and drop
 * shadow add effects, the canvas-only ones do nothing or throw).
 */
export class SvgFilter extends SvgElementBase {
  apply(context: SceneContext, element: SvgElementBase, node: ImportNode): void {
    if (
      ["x", "y", "height", "width"].every(
        (name) => this.attributes[name] && this.attributes[name].hasValue(),
      )
    ) {
      const region = {
        x: this.attribute("x").toPixels("x"),
        y: this.attribute("y").toPixels("y"),
        width: this.attribute("width").toPixels("y"),
        height: this.attribute("height").toPixels("x"),
      };
      if (null === node.getGeometryBBox()) {
        if (node instanceof Group) {
          node.setProperty("frm", new Rect(region.x, region.y, region.width, region.height));
        }
      } else if (node.hasMixin(ElementTransform)) {
        node.setBounds(region.x, region.y, region.width, region.height);
      }
    }
    const filterValue = element.style("filter").value;
    element.style("filter").value = "";
    let extraX = 0;
    let extraY = 0;
    for (const child of this.children) {
      const distance = (child as { extraFilterDistance?: number }).extraFilterDistance || 0;
      extraX = Math.max(extraX, distance);
      extraY = Math.max(extraY, distance);
    }
    const shadowParts = ["feOffset", "feGaussianBlur"];
    const combiners = ["feBlend", "feComposite"];
    let combined = false;
    const notShadow = this.children.every((child) => {
      if (!combined && combiners.indexOf(child.type as string) >= 0) {
        combined = true;
        return !!shadowParts.length;
      }
      if (shadowParts.length) {
        const index = shadowParts.indexOf(child.type as string);
        if (index >= 0) {
          shadowParts.splice(index, 1);
          return !combined || shadowParts.length;
        }
      }
      return true;
    });
    if (!notShadow) {
      if (node.hasMixin(Stylable)) {
        const effects = node.getEffects();
        if (effects) {
          const blur = find(
            this.children,
            (child) => "feGaussianBlur" === child.type,
          ) as SvgFeGaussianBlur | null;
          const offset = find(
            this.children,
            (child) => "feOffset" === child.type,
          ) as SvgFeOffset | null;
          const flood = find(
            this.children,
            (child) => "feFlood" === child.type,
          ) as SvgFeFlood | null;
          const shadow = new DropShadowEffect();
          // Without a blur this throws, as before.
          shadow.setProperty(
            "r",
            SvgUtil.stdDeviationToPixel((blur as SvgFeGaussianBlur).blurRadius),
          );
          shadow.setProperty("x", (offset as SvgFeOffset).dx);
          shadow.setProperty("y", (offset as SvgFeOffset).dy);
          if (flood) {
            shadow.setProperty("pat", flood.floodColor);
            shadow.setProperty("opc", flood.floodOpacity);
          }
          effects.appendChild(importNode(shadow));
        }
      }
    } else {
      for (const child of this.children) {
        if (hasApply(child)) child.apply(context, node, extraX, extraY);
      }
    }
    element.style("filter", true).value = filterValue;
  }
}

/** Filter primitives canvg drew on the canvas; as scene filters they do nothing. */
export class SvgFeMorphology extends SvgElementBase {
  apply(): void {}
}

export class SvgFeComposite extends SvgElementBase {
  apply(): void {}
}

/**
 * svg.Element.feColorMatrix: canvg recolored the canvas pixels. As a
 * scene filter it does nothing, like feMorphology and feComposite; the
 * old code got the scene context instead of a canvas and threw, which
 * failed the import (BUGS-FIXED.md "BUG-077 feColorMatrix fails the whole
 * import").
 */
export class SvgFeColorMatrix extends SvgElementBase {
  apply(): void {}
}

export class SvgFeOffset extends SvgElementBase {
  dx: number;
  dy: number;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.dx = this.attribute("dx").toPixels("x");
    this.dy = this.attribute("dy").toPixels("y");
  }

  apply(): void {}
}

/** flood-color and flood-opacity of an element (no inheritance: built before its parent). */
function floodOf(element: SvgElementBase): [RGBColor, number] {
  const flood = element.style("flood-color");
  let color = RGBColor.BLACK;
  let opacity = 1;
  if ("none" !== flood.value) {
    if ("currentColor" == flood.value) flood.value = element.style("color").value;
    const parsed = getColor(flood.value as string) || [RGBColor.BLACK, 1];
    if (parsed) {
      color = parsed[0];
      opacity = parsed[1];
    }
  }
  if (element.style("flood-opacity").hasValue()) {
    opacity = element.style("flood-opacity").numValue() * Math.min(opacity, 1);
  }
  return [color, opacity];
}

export class SvgFeFlood extends SvgElementBase {
  floodColor: RGBColor;
  floodOpacity: number;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    [this.floodColor, this.floodOpacity] = floodOf(this);
  }

  apply(): void {}
}

/** svg.Element.feDropShadow: a drop shadow effect. */
export class SvgFeDropShadow extends SvgElementBase {
  dx: number;
  dy: number;
  blurRadius: number;
  extraFilterDistance: number;
  floodColor: RGBColor;
  floodOpacity: number;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.dx = this.attribute("dx").toPixels("x");
    this.dy = this.attribute("dy").toPixels("y");
    this.blurRadius = this.attribute("stdDeviation").numValue();
    this.extraFilterDistance = this.blurRadius;
    [this.floodColor, this.floodOpacity] = floodOf(this);
  }

  apply(_context: SceneContext, node: ImportNode): void {
    if (node.hasMixin(Stylable)) {
      const effects = node.getEffects();
      if (effects) {
        const shadow = new DropShadowEffect();
        shadow.setProperty("r", SvgUtil.stdDeviationToPixel(this.blurRadius));
        shadow.setProperty("x", this.dx);
        shadow.setProperty("y", this.dy);
        shadow.setProperty("pat", this.floodColor);
        shadow.setProperty("opc", this.floodOpacity);
        effects.appendChild(importNode(shadow));
      }
    }
  }
}

/**
 * svg.Element.feGaussianBlur: a blur effect. When the blur in pixels is
 * bigger than the element (in the parent's transform), the radius is
 * the deviation divided by the pixel rate instead.
 */
export class SvgFeGaussianBlur extends SvgElementBase {
  blurRadius: number;
  extraFilterDistance: number;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.blurRadius = this.attribute("stdDeviation").numValue();
    this.extraFilterDistance = this.blurRadius;
  }

  apply(context: SceneContext, node: ImportNode): void {
    if (node.hasMixin(Stylable)) {
      const effects = node.getEffects();
      if (effects) {
        const blur = new BlurEffect();
        let radius = SvgUtil.stdDeviationToPixel(this.blurRadius);
        let bbox = node.getGeometryBBox();
        if (bbox) {
          if (context.transform) bbox = context.transform.mapRect(bbox);
          if (radius > bbox.getWidth() || radius > bbox.getHeight()) {
            radius = SvgUtil.pixelToStdDeviation(this.blurRadius);
          }
        }
        blur.setProperty("r", radius);
        effects.appendChild(importNode(blur));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gravit's editing data (written by the SVG exporter with "preserve editing")

/** The original document, compressed, in a CDATA section. */
export class SvgGravitGraphicSource extends SvgElementBase {
  version: number;
  sourceElement: string | undefined;

  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    this.version = this.attribute("version").numValue();
    const source = node as SvgDomNode;
    for (let i = 0; i < source.childNodes.length; i++) {
      const child = source.childNodes[i] as SvgDomNode;
      if ("#cdata-section" === child.nodeName) {
        this.sourceElement = (child.nodeValue as string).trim();
        break;
      }
    }
  }

  override toScene(): SceneResult {
    return undefined;
  }

  /** The deserialized document node(s), or null when the data doesn't decode. */
  renderGraphicSource(): unknown {
    try {
      return this.sourceElement && Node.deserialize(decompressString(this.sourceElement));
    } catch {
      return null;
    }
  }
}

/** A foreignObject; Gravit's (requiredExtensions = its namespace) points at the editing data. */
export class SvgForeignObject extends SvgElementBase {
  isSupported(): boolean {
    return this.attribute("requiredExtensions").getValue() === SvgRenderContext.XMLNamespaceURI;
  }

  getElementOfReference(): SvgGravitElementRef | null {
    return find(
      this.children,
      (child) => child instanceof SvgGravitElementRef,
    ) as SvgGravitElementRef | null;
  }

  isValid(): boolean {
    return this.isSupported() && !!this.getElementOfReference();
  }

  override toScene(): SceneResult {
    return undefined;
  }

  renderGraphicSource(): unknown {
    if (!this.isValid()) return null;
    const reference = this.getElementOfReference();
    return reference && reference.renderGraphicSource();
  }
}

export class SvgGravitElementRef extends SvgElementBase {
  override toScene(): SceneResult {
    return undefined;
  }

  renderGraphicSource(): unknown {
    const source = this.getHrefAttribute().getDefinition<SvgGravitGraphicSource>();
    return source && source.renderGraphicSource();
  }
}

export class SvgTitle extends SvgElementBase {}

export class SvgDesc extends SvgElementBase {}

/** An element canvg doesn't know: no node, its children still parsed. */
export class SvgMissing extends SvgElementBase {
  constructor(svg: SvgParser, node?: SvgDomNode) {
    super(svg, node);
    svg.log("ERROR: Element '" + (node as SvgDomNode).nodeName + "' not yet implemented.");
  }
}

/** canvg's svg.Element table: the classes by element name (dashes removed). */
const ELEMENTS: Record<string, ElementConstructor> = {
  ElementBase: SvgElementBase,
  RenderedElementBase: SvgRenderedElementBase,
  PromiseCapability: SvgPromiseCapability,
  PathElementBase: SvgPathElementBase,
  svg: SvgSvg,
  rect: SvgRect,
  circle: SvgCircle,
  ellipse: SvgEllipse,
  line: SvgLine,
  polyline: SvgPolyline,
  polygon: SvgPolygon,
  path: SvgPath,
  switch: SvgSwitch,
  pattern: SvgPattern,
  marker: SvgMarker,
  defs: SvgDefs,
  GradientBase: SvgGradientBase,
  linearGradient: SvgLinearGradient,
  radialGradient: SvgRadialGradient,
  stop: SvgStop,
  font: SvgFont,
  fontface: SvgFontFace,
  missingglyph: SvgMissingGlyph,
  glyph: SvgGlyph,
  TextElementBase: SvgTextElementBase,
  text: SvgText,
  tspan: SvgTspan,
  textPath: SvgTextPath,
  tref: SvgTref,
  a: SvgAnchor,
  image: SvgImage,
  g: SvgG,
  symbol: SvgSymbol,
  style: SvgStyle,
  use: SvgUse,
  mask: SvgMask,
  clipPath: SvgClipPath,
  filter: SvgFilter,
  feMorphology: SvgFeMorphology,
  feComposite: SvgFeComposite,
  feColorMatrix: SvgFeColorMatrix,
  feOffset: SvgFeOffset,
  feFlood: SvgFeFlood,
  feDropShadow: SvgFeDropShadow,
  gravitGraphicSource: SvgGravitGraphicSource,
  foreignObject: SvgForeignObject,
  gravitElementRef: SvgGravitElementRef,
  feGaussianBlur: SvgFeGaussianBlur,
  title: SvgTitle,
  desc: SvgDesc,
  MISSING: SvgMissing,
};
