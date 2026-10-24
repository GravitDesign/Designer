// Old: chunk.vendor.js module 1455 (GSVGExport).
//
// Writes a page, a scene or an element as SVG text. The tree is walked
// node by node (renderNode): simple shapes without unsupported features
// are written as native SVG elements (rect, circle, ellipse, line,
// polygon, path) with their fills, borders and effects as attributes,
// gradients and filters (checkNativeShape). Everything else is painted
// through the SVG paint context, which records the engine's canvas calls
// as paths (generateSvgPath); texts go through an SVG text layout core
// that writes <text> elements. Nodes with effects, patterns or blends SVG
// can't express are rasterized into an <image> (checkRasterize).
//
// The order of DOM operations, attribute writes and id generation is the
// old one; the output is compared byte for byte.
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { Color } from "../../../engine/color/color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { equals, extend, find, uuid, compressString } from "../../../engine/core/util.ts";
import { Vertex } from "../../../engine/geometry/vertex.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { Length } from "../../../engine/math/length.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Canvas2DPaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Annotation } from "../../../engine/scene/annotations/annotation.ts";
import { CommentAnnotation } from "../../../engine/scene/annotations/comment-annotation.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import { Group } from "../../../engine/scene/group.ts";
import type { Image } from "../../../engine/scene/image.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import { Container } from "../../../engine/scene/node-container.ts";
import type { PropertiesApi } from "../../../engine/scene/node-properties.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Path } from "../../../engine/scene/path.ts";
import { PathsGraph } from "../../../engine/scene/paths-graph/paths-graph.ts";
import { Polygon } from "../../../engine/scene/polygon.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Shape } from "../../../engine/scene/shape.ts";
import { Slice } from "../../../engine/scene/slice.ts";
import { Symbol as SymbolNode } from "../../../engine/scene/symbol.ts";
import { AngularGradient } from "../../../engine/style/angular-gradient.ts";
import { Background } from "../../../engine/style/background.ts";
import type { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import { BlurEffect } from "../../../engine/style/effects/blur-effect.ts";
import { DropShadowEffect } from "../../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../../engine/style/effects/inner-shadow-effect.ts";
import type { Effects } from "../../../engine/style/effects.ts";
import { Gradient } from "../../../engine/style/gradient.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { NoisePattern } from "../../../engine/style/noise-pattern.ts";
import type { PaintLayer } from "../../../engine/style/paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import type { Pattern } from "../../../engine/style/pattern.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { TexturePattern } from "../../../engine/style/texture-pattern.ts";
import { GLBlurEffect } from "../../../engine/style/webgl/effects/gl-blur-effect.ts";
import { Text } from "../../../engine/text/text.ts";
import { BitmapExport, type BitmapExportNode } from "../bitmap-export.ts";
import { formatNumberDetached, numberFormat } from "./number-format.ts";
import { SvgContext, type SvgContextStyle, type SvgDrawImageEntry } from "./svg-context.ts";
import { SVG_NAMESPACE, SvgElement, type SvgDocument, type SvgNode } from "./svg-dom.ts";
import { SvgEffects, type EffectMarkupResult, type EffectsHost } from "./svg-effects.ts";
import { SvgFormat } from "./svg-format.ts";
import { createSvgLinearGradient, createSvgRadialGradient } from "./svg-gradients.ts";
import { SvgRenderContext, type SvgExportOptions, type SvgExportResult } from "./svg-images.ts";
import { SvgMasks, type MaskState } from "./svg-masks.ts";
import type { SvgPaintCanvas } from "./svg-paint-canvas.ts";
import { gradientAsSVG, SvgPaintContext, toFill } from "./svg-paint-context.ts";
import { SvgPostProcess } from "./svg-post-process.ts";
import { SvgStyle } from "./svg-style.ts";
import { SvgTLCore } from "./svg-tl-render.ts";
import { SvgUtil } from "./svg-util.ts";

const BlendMode = Canvas2DPaintCanvas.BlendMode;
const LineJoin = Canvas2DPaintCanvas.LineJoin;
const LineCap = Canvas2DPaintCanvas.LineCap;
const BorderAlignment = Stylable.BorderAlignment;

/** The fields the exporter puts on the nodes it renders. */
interface ExportFields {
  _export?: Record<string, unknown>;
  _renderContext: SvgRenderContext;
  _paintContext: SvgPaintContext;
}

/**
 * A node as the exporter handles it. The old code called whatever the
 * node at hand had; this type lists those calls, and the code checks the
 * node's class (or mixin) before it relies on one.
 */
type ExportNode = Element &
  PropertiesApi &
  ExportFields & {
    getNodeNameTranslated(): string;
    getEffects(): Effects | null;
    getPaintLayers(): PaintLayers | null;
    getStyleLayers(): string[] | null;
    getTransform(raw?: boolean): Transform | null;
    getPatternBBox(includeInvisible?: unknown): Rect | null;
    getFirstChild(): Node | null;
    getChildren(): Node[];
    toSVGPath(round?: (value: number) => number): string;
    rewindVertices(index: number): boolean;
    readVertex(vertex: Vertex): boolean;
    getHeadMarkerVertices(border: BorderPaintLayer): VertexReader | null;
    getTailMarkerVertices(border: BorderPaintLayer): VertexReader | null;
  };

/** A paint layer's pattern, opacity, visibility and blend. */
type LayerNode = PaintLayer & { $_pt: Pattern | null };

/** The options of the SVG export with the defaults the old code merged in. */
const DefaultOptions: SvgExportOptions = {
  forceRoot: false,
  viewBox: true,
  clipToPage: false,
  preserveEditingCapabilities: true,
  layerNamesAsId: false,
  print: false,
  rasterizeUnsupportedObjectsByCDR: void 0,
  useImageDictionary: true,
  unit: Length.Unit.PT,
  dpi: Length.DPI,
  includeInvisible: false,
  annotations: false,
};

/** The blend modes a group style or a recorded path may carry as mix-blend-mode. */
const CSS_BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

function asExportNode(node: unknown): ExportNode {
  return node as ExportNode;
}

/** `extend({}, DefaultOptions, options)`: the options every check reads. */
function effectiveOptions(context: SvgRenderContext): SvgExportOptions {
  const options = extend({}, DefaultOptions) as SvgExportOptions;
  extend(options, context.options || {});
  return options;
}

/** Calls `fn` with each entry of a live child list, its length read once (jQuery.each). */
function eachLive(list: SvgNode[], fn: (child: SvgElement) => void): void {
  const length = list.length;
  for (let i = 0; i < length; i++) fn(list[i] as SvgElement);
}

type Encoder = (node: ExportNode) => void;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GSVGExport: statics only, Encoders replaceable
export class SvgExport {
  constructor() {
    throw new Error("This class cannot be instantiated");
  }

  static DefaultOptions = DefaultOptions;

  /** One encoder per node class, looked up by the class name in the node's toString. */
  static Encoders: Record<string, Encoder> = {
    GScene() {},
    GPage() {},
    GArrowAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GCommentAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GEllipseAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GHighlighterAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GPencilAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GRectangleAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GTextAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GEmptyAnnotation(e) {
      SvgExport._nativeOrPath(e);
    },
    GRectangle(e) {
      SvgExport._nativeOrPath(e);
    },
    GEllipse(e) {
      SvgExport._nativeOrPath(e);
    },
    GPolygon(e) {
      SvgExport._nativeOrPath(e);
    },
    GText(e) {
      SvgExport.generateSvgPath(e);
    },
    GLine(e) {
      SvgExport._nativeOrPath(e);
    },
    GLayer() {},
    GGroup() {},
    GSymbol() {},
    GCompoundPath(e) {
      SvgExport._encodeCompound(e);
    },
    /** A path with fewer than two vertices writes nothing; a two-point line is a GLine. */
    GPath(e) {
      let count = 0;
      if (e.rewindVertices(0)) {
        const vertex = new Vertex();
        while (e.readVertex(vertex) && 2 != ++count);
      }
      if (count < 2) return;
      if ((e as unknown as Path).isLine()) SvgExport.Encoders.GLine?.(e);
      else if (!SvgExport.checkNativeShape(e)) SvgExport.generateSvgPath(e, {});
    },
    GCompoundShape(e) {
      SvgExport._encodeCompound(e);
    },
    GImage(e) {
      SvgExport.exportImage(e);
    },
    GSlice() {},
    GPathsGraph(e) {
      SvgExport.generateSvgPath(e);
    },
  };

  /** The native element, or else the painted paths. */
  static _nativeOrPath(e: ExportNode): void {
    if (!SvgExport.checkNativeShape(e)) SvgExport.generateSvgPath(e);
  }

  /** A compound path or shape that isn't native: its paths in a group named after the node. */
  static _encodeCompound(e: ExportNode): void {
    if (SvgExport.checkNativeShape(e)) return;
    const context = e._renderContext;
    const group = context.createSvgElement("g");
    context.peek().appendChild(group);
    context.push(group);
    SvgFormat.addAttributes(group, { shape: e.toString() });
    SvgExport.generateSvgPath(e);
    context.pop();
  }

  /** The node being painted by generateSvgPath (processPath reads it). */
  static _node: Node | null = null;

  static _SUPPORTED_EFFECTS: (abstract new (...args: never[]) => unknown)[] = [
    GLBlurEffect,
    DropShadowEffect,
    BlurEffect,
    InnerShadowEffect,
  ];

  static isSupportedEffect(effect: unknown): boolean {
    return SvgExport._SUPPORTED_EFFECTS.some((cls) => effect instanceof cls);
  }

  /** Whether any node in the tree has an effect the SVG filters can write. */
  static hasSupportedEffects(node: Node): boolean {
    let found = false;
    node.accept((child) => {
      if (child.hasMixin(Stylable)) {
        const effects = asExportNode(child).getEffects();
        if (
          effects &&
          (effects.getChildren() as Node[]).some((effect) => SvgExport.isSupportedEffect(effect))
        ) {
          found = true;
          return false;
        }
      }
    });
    return found;
  }

  /**
   * The nodes with effects or fill patterns the SVG can't hold, with what
   * those are (shown after an SVG export): name and features (effects and
   * texture, angular or background patterns).
   */
  static getUnsupportedFeatures(
    node: Node,
    out?: { name: string; features: unknown[] }[],
  ): { name: string; features: unknown[] }[] {
    out = out || [];
    if (node.hasMixin(Stylable)) {
      const element = asExportNode(node);
      const features: unknown[] = [];
      for (const effect of (element.getEffects() as Effects).getChildren() as Node[]) {
        if (!SvgExport.isSupportedEffect(effect)) features.push(effect);
      }
      const layers = element.getPaintLayers();
      if (layers) {
        layers.getLayers(null, true).forEach((layer) => {
          const pattern = (layer as LayerNode).$_pt;
          if (
            pattern instanceof Background ||
            pattern instanceof TexturePattern ||
            pattern instanceof AngularGradient
          ) {
            features.push(pattern);
          }
        });
      }
      if (features.length) {
        out.push({
          name: (element.getProperty("name") as string) || element.getNodeNameTranslated(),
          features,
        });
      }
    }
    if (node.hasMixin(Container)) {
      for (let child = asExportNode(node).getFirstChild(); null != child; child = child.getNext()) {
        SvgExport.getUnsupportedFeatures(child, out);
      }
    }
    return out;
  }

  /** The CDR rule: more than one fill or border, any non-color fill or border, or any effect. */
  static hasUnsupportedObjectsByCDR(node: Node): boolean {
    if (SvgExport.hasUnsupportedEffects(node)) return true;
    if (node.hasMixin(Stylable)) {
      const element = asExportNode(node);
      const layers = element.getPaintLayers();
      if (layers) {
        const fills = layers.getFillLayers(true) || [];
        if (fills.length > 1) return true;
        const borders = layers.getBorderLayers(true) || [];
        if (borders.length > 1) return true;
        if (fills.some((layer) => !((layer as LayerNode).$_pt instanceof Color))) return true;
        if (borders.some((layer) => !((layer as LayerNode).$_pt instanceof Color))) return true;
      }
      if (
        (((element.getEffects() as Effects).getChildren() as Node[]) || []).some(
          (effect) => !!effect,
        )
      )
        return true;
    }
    let found = false;
    if (node.hasMixin(Container)) {
      for (let child = asExportNode(node).getFirstChild(); null != child; child = child.getNext()) {
        if (SvgExport.hasUnsupportedObjectsByCDR(child)) {
          found = true;
          break;
        }
      }
    }
    return found;
  }

  /** A background, texture or angular fill, or an effect other than the supported ones, here or below. */
  static hasUnsupportedEffects(node: Node): boolean {
    let found = false;
    if (node.hasMixin(Stylable)) {
      const element = asExportNode(node);
      const layers = element.getPaintLayers();
      if (
        layers &&
        layers.getFillLayers(true).filter((layer) => {
          const pattern = (layer as LayerNode).$_pt;
          return (
            pattern instanceof Background ||
            pattern instanceof TexturePattern ||
            pattern instanceof AngularGradient
          );
        }).length
      ) {
        return true;
      }
      for (const effect of (element.getEffects() as Effects).getChildren() as Node[]) {
        if (!SvgExport._SUPPORTED_EFFECTS.find((cls) => effect instanceof cls)) found = true;
      }
    }
    if (found) return found;
    if (node.hasMixin(Container)) {
      for (let child = asExportNode(node).getFirstChild(); null != child; child = child.getNext()) {
        if (SvgExport.hasUnsupportedEffects(child)) found = true;
      }
    }
    return found;
  }

  /**
   * Writes the node as a native SVG element when it can: an ellipse (a
   * circle when round) that is a full ellipse without skew or rotation, a
   * line, a plain polygon, a rectangle without rounded corners; other
   * paths, polygons and compounds as `<path>`. Returns false when it
   * can't (unsupported effects, rounded or rotated shapes, ...), and the
   * caller paints the node instead.
   */
  static checkNativeShape(e: ExportNode): boolean {
    const context = e._renderContext;
    const options = effectiveOptions(context);
    if ("boolean" == typeof options.rasterizeUnsupportedObjectsByCDR) {
      if (options.rasterizeUnsupportedObjectsByCDR && SvgExport.hasUnsupportedObjectsByCDR(e))
        return false;
    } else if (SvgExport.hasUnsupportedEffects(e)) return false;
    let transform = e.getTransform();
    if (!transform) transform = new Transform();
    // The old test ended in `(!e) instanceof GRectangle`, which is never true.
    let maskMode: string | undefined;
    const parent = context.peek();
    const group = context.createSvgElement("g");
    if (e instanceof Ellipse) {
      const parts = transform.decomposed() as NonNullable<ReturnType<Transform["decomposed"]>>;
      if (
        e.getProperty("sa") == e.getProperty("ea") &&
        parts.skew.isIdentity() &&
        parts.rotate.isIdentity()
      ) {
        const box = e.getGeometryBBox(options.includeInvisible) as Rect;
        const rx = box.getWidth() / 2;
        const ry = box.getHeight() / 2;
        const cx = box.getSide(Rect.Side.CENTER).getX();
        const cy = box.getSide(Rect.Side.CENTER).getY();
        const round = GMath.isEqualEps(box.getWidth(), box.getHeight(), 1e-10);
        const element = round
          ? context.createSvgElement("circle")
          : context.createSvgElement("ellipse");
        group.appendChild(element);
        if (!transform.isIdentity()) element.setAttribute("vector-effect", "non-scaling-stroke");
        element.setAttribute("cx", cx);
        element.setAttribute("cy", cy);
        if (round) element.setAttribute("r", rx);
        else {
          element.setAttribute("rx", rx);
          element.setAttribute("ry", ry);
        }
        SvgUtil.setAttributeId(element, e, options);
        SvgUtil.exportAttributes(element, e, options);
        SvgExport.setCommonFillStyles(e, element, void 0, options);
        SvgExport.renderBorder(context, e, element, group, options);
      } else SvgExport.renderAsNativePath(context, e, group, options);
    } else if (e instanceof Path && e.isLine()) {
      const element = context.createSvgElement("line");
      group.appendChild(element);
      const vertices = (e as unknown as { _vertices: { _vertices: Vertex[] } })._vertices._vertices;
      element.setAttribute("x1", numberFormat.formatNumber((vertices[0] as Vertex).x));
      element.setAttribute("y1", numberFormat.formatNumber((vertices[0] as Vertex).y));
      element.setAttribute("x2", numberFormat.formatNumber((vertices[1] as Vertex).x));
      element.setAttribute("y2", numberFormat.formatNumber((vertices[1] as Vertex).y));
      SvgUtil.setAttributeId(element, e, options);
      SvgUtil.exportAttributes(element, e, options);
      SvgExport.setCommonStrokeStyles(e, element, options);
    } else if (e instanceof Polygon) {
      if (SvgUtil.isPolygonNative(e)) {
        const element = context.createSvgElement("polygon");
        group.appendChild(element);
        const points: number[] = [];
        e.iterateSegments((point, inner) => {
          if (!inner) {
            points.push(point.getX());
            points.push(point.getY());
          }
        }, true);
        element.setAttribute("points", numberFormat.formatMatrix(points).join(","));
        SvgUtil.setAttributeId(element, e, options);
        SvgUtil.exportAttributes(element, e, options);
        SvgExport.setCommonFillStyles(e, element, null, options);
        SvgExport.renderBorder(context, e, element, group, options);
      } else SvgExport.renderAsNativePath(context, e, group, options);
    } else if (e instanceof Path) SvgExport.renderAsNativePath(context, e, group, options);
    else if (e instanceof CompoundPath) SvgExport.renderAsNativePath(context, e, group, options);
    else if (e instanceof CompoundShape) SvgExport.renderAsNativePath(context, e, group, options);
    else if (e instanceof Rectangle) {
      const element = context.createSvgElement("rect");
      group.appendChild(element);
      const geometry = transform.isIdentity()
        ? (e.getGeometryBBox(options.includeInvisible) as Rect)
        : new Rect(-1, -1, 2, 2);
      let mapped: Rect;
      const radiusX = e.getProperty("bl_sx");
      const radiusY = e.getProperty("bl_sy");
      let rounded = false;
      e.iterateSegments((_point, _side, _type, sx, sy) => {
        if (sx > 0 || sy > 0) {
          rounded = true;
          return true;
        }
      });
      if (rounded) return false;
      if (radiusX || radiusY) {
        element.setAttribute("rx", radiusX);
        element.setAttribute("ry", radiusY);
      }
      let matrix = new Transform().getMatrix();
      if (transform.isIdentity()) mapped = transform.mapRect(geometry);
      else {
        const parts = transform.decomposed() as NonNullable<ReturnType<Transform["decomposed"]>>;
        const origin = parts.translate.mapPoint(new Point(0, 0));
        matrix = new Transform()
          .translated(-origin.getX(), -origin.getY())
          .multiplied(parts.skew.multiplied(parts.rotate))
          .translated(origin.getX(), origin.getY())
          .getMatrix();
        mapped = parts.scale.multiplied(parts.translate).mapRect(geometry);
      }
      element.setAttribute("x", "" + numberFormat.formatNumber(mapped.getX()));
      element.setAttribute("y", "" + numberFormat.formatNumber(mapped.getY()));
      element.setAttribute("width", "" + numberFormat.formatNumber(mapped.getWidth()));
      element.setAttribute("height", "" + numberFormat.formatNumber(mapped.getHeight()));
      element.setAttribute(
        "transform",
        "matrix(" + numberFormat.formatMatrix(matrix).join(",") + ")",
      );
      SvgUtil.setAttributeId(element, e, options);
      SvgUtil.exportAttributes(element, e, options);
      SvgExport.setCommonFillStyles(e, element, Transform.deserialize(matrix), options);
      SvgExport.renderBorder(context, e, element, group, options);
    }
    const style = new SvgStyle();
    const blend = e.getProperty("_sbl") as string | null;
    if (blend && "normal" !== blend) {
      switch (blend) {
        case "m":
        case "!m":
          maskMode = blend;
          break;
        default:
          style.set("mix-blend-mode", blend);
      }
    }
    const opacity = e.getProperty("_stop");
    if (1 != opacity) group.setAttribute("opacity", opacity);
    const defs = context.createSvgElement("defs");
    const result: EffectMarkupResult = {};
    SvgEffects.getEffectMarkup(e as unknown as EffectsHost, result, defs);
    if (result.filter) {
      group.setAttribute("filter", result.filter);
      parent.appendChild(defs);
    }
    if (maskMode)
      SvgMasks.createMask(context, group.children[0] as SvgElement, parent, "!m" === maskMode);
    else {
      style.setElementStyle(group);
      parent.appendChild(group);
    }
    return true;
  }

  /** The node's outline as `<path d>` (evenodd when set) with fill and stroke attributes. */
  static renderAsNativePath(
    context: SvgRenderContext,
    e: ExportNode,
    group: SvgElement,
    options: SvgExportOptions,
  ): void {
    const data = e.toSVGPath(formatNumberDetached);
    const element = context.createSvgElement("path");
    group.appendChild(element);
    element.setAttribute("d", data);
    if (e.getProperty("evenodd")) element.setAttribute("fill-rule", "evenodd");
    SvgUtil.setAttributeId(element, e, context.options);
    SvgUtil.exportAttributes(element, e, context.options);
    SvgExport.setCommonFillStyles(e, element, null, options);
    SvgExport.setCommonStrokeStyles(e, element, options);
  }

  static renderBorder(
    _context: SvgRenderContext,
    e: ExportNode,
    element: SvgElement,
    _group: SvgElement,
    options: SvgExportOptions,
  ): void {
    SvgExport.setCommonStrokeStyles(e, element, options);
  }

  /**
   * Rasterizes the node when it has unsupported features: renders it (a
   * background or noise fill renders the page area behind it instead) as
   * PNG at the export dpi into an `<image>`. Returns whether it did.
   */
  static checkRasterize(e: ExportNode): boolean {
    const context = e._renderContext;
    const options = effectiveOptions(context);
    let rasterize = false;
    if ("boolean" == typeof options.rasterizeUnsupportedObjectsByCDR) {
      if (options.rasterizeUnsupportedObjectsByCDR)
        rasterize = SvgExport.hasUnsupportedObjectsByCDR(e);
    } else rasterize = SvgExport.hasUnsupportedEffects(e);
    if (rasterize) {
      let bitmap: ReturnType<typeof BitmapExport.export> | undefined;
      const area = e.getPaintBBox(false, null, options.includeInvisible) as Rect;
      const x = area.getX();
      const y = area.getY();
      const width = area.getWidth();
      const height = area.getHeight();
      if (e.hasMixin(Stylable)) {
        const layers = e.getPaintLayers();
        if (layers) {
          if (
            layers.getFillLayers(true).some((layer) => {
              const pattern = (layer as LayerNode).$_pt;
              return pattern instanceof Background || pattern instanceof NoisePattern;
            })
          ) {
            bitmap = BitmapExport.export(
              e.getPage() as unknown as BitmapExportNode,
              null,
              null,
              null,
              options.dpi || 72,
              null,
              undefined,
              e.getPaintBBox(false, null, options.includeInvisible),
            );
          }
        }
      }
      if (!bitmap) {
        bitmap = BitmapExport.export(
          e as unknown as BitmapExportNode,
          null,
          null,
          null,
          options.dpi || 72,
          undefined,
        );
      }
      // Like the old code this throws when the export gave no bitmap.
      const data = (bitmap as NonNullable<typeof bitmap>).toImageDataUrl("image/png", null);
      const parent = context.peek();
      const group = context.createSvgElement("g");
      parent.appendChild(group);
      const image = context.createSvgElement("image");
      group.appendChild(image);
      image.setAttribute("xlink:href", data);
      image.setAttribute("x", "" + numberFormat.formatNumber(x));
      image.setAttribute("y", "" + numberFormat.formatNumber(y));
      image.setAttribute("width", numberFormat.formatNumber(width));
      image.setAttribute("height", numberFormat.formatNumber(height));
      const style = new SvgStyle();
      const blend = e.getProperty("_sbl") as string | null;
      if (blend && "normal" !== blend) style.set("mix-blend-mode", blend);
      image.setAttribute("style", style.toString());
      e._renderContext.wasRasterized = true;
    }
    return rasterize;
  }

  /** The innermost last element below `element`, descending through groups. */
  static getTargetPath(element: SvgElement): SvgElement | null {
    let target = element.lastChild as SvgElement | null;
    while (target && "g" === target.tagName) target = target.firstChild as SvgElement | null;
    return target;
  }

  /**
   * Paints the node through the SVG paint context and writes the paths it
   * recorded since, each with its style, into a new group (texts write
   * their `<text>` elements first). Effects become a filter on the group.
   */
  static generateSvgPath(
    e: ExportNode,
    result?: EffectMarkupResult,
    flags?: { ignoreFilter?: boolean },
  ): void {
    if (SvgExport.checkRasterize(e)) return;
    SvgExport._node = e;
    result = result || {};
    flags = flags || {};
    const paintContext = e._paintContext;
    const context = e._renderContext;
    const first = paintContext.getSvgPaths().length;
    e.paint(paintContext);
    const document = context.svgDoc;
    const parent = context.peek();
    const group = context.createSvgElement("g");
    parent.appendChild(group);
    if (e instanceof Text) {
      context.push(group);
      (e.getTLCore() as unknown as SvgTLCore).renderSVG(context);
      context.pop();
    }
    const defs = context.createSvgElement("defs");
    if (!flags.ignoreFilter) {
      SvgEffects.getEffectMarkup(e as unknown as EffectsHost, result, defs);
      if (result.filter) group.setAttribute("filter", result.filter);
    }
    const paths = paintContext.getSvgPaths().slice(first);
    for (let index = 0; index < paths.length; index++) {
      const entry = paths[index];
      const style = paintContext.getSvgStyle(first + index, defs);
      const operation = paintContext.getGlobalCompositeOperation(first + index);
      const alpha = paintContext.getGlobalAlpha(first + index);
      if (e instanceof Text) {
        if (CSS_BLEND_MODES.includes(operation)) {
          group.setAttribute("style", "mix-blend-mode:" + operation + ";");
          if (1 != alpha && "1" !== alpha) group.setAttribute("opacity", alpha);
        }
      } else {
        if (void 0 !== (entry as SvgDrawImageEntry).drawImage) {
          SvgExport.renderExportCanvas(
            paintContext,
            document,
            defs,
            group,
            entry as SvgDrawImageEntry,
            operation,
            alpha,
          );
          // The old loop returned from the callback here, i.e. went on with the next entry.
          continue;
        }
        const state: MaskState = { isMask: false, maskTarget: group };
        SvgExport.processPath(
          document,
          group,
          defs,
          entry as string,
          style,
          paintContext.getSvgStyleObject(first + index),
          operation,
          state,
        );
      }
    }
    if (defs.childNodes.length > 0) parent.insertBefore(defs, group);
    if (e instanceof Path && e.getChildren().length > 0) SvgMasks.createClipPath(e, group);
    SvgExport._node = null;
  }

  /**
   * Fill attributes of a native element, one copy of the element per
   * further fill layer (the copies lose fill and fill-opacity first). A
   * gradient becomes a gradient element in front of the element.
   */
  static setCommonFillStyles(
    e: ExportNode,
    element: SvgElement,
    elementTransform: Transform | null | undefined,
    options: SvgExportOptions,
  ): void {
    if (e.hasMixin(Stylable)) {
      const layers = e.getPaintLayers();
      if (layers) {
        const fills = layers.getFillLayers(true);
        if (fills.length) {
          fills.forEach((layer, index) => {
            if (index > 0) {
              const parent = element.parentNode as SvgElement;
              element = element.cloneNode();
              parent.appendChild(element);
              element.removeAttribute("fill");
              element.removeAttribute("fill-opacity");
            }
            let fill: string;
            const visible = layer.getProperty("_vs");
            const opacity = layer.getProperty("_op");
            const pattern = layer.getProperty("_pt");
            const blend = layer.getProperty("_bl");
            const patternBox = e.getPatternBBox(options.includeInvisible);
            const transform = e.getTransform() || new Transform();
            if (visible) {
              if (null == pattern) fill = "rgba(0,0,0,0)";
              else if (pattern instanceof LinearGradient) {
                const gradient = createSvgLinearGradient(
                  e._renderContext,
                  e._renderContext.svgDoc,
                  pattern,
                  patternBox,
                  transform,
                  elementTransform,
                );
                (element.parentNode as SvgElement).insertBefore(gradient, element);
                fill = "url(#" + gradient.getAttribute("id") + ")";
              } else if (pattern instanceof RadialGradient) {
                const gradient = createSvgRadialGradient(
                  e._renderContext,
                  e._renderContext.svgDoc,
                  pattern,
                  patternBox,
                  transform,
                  elementTransform,
                );
                (element.parentNode as SvgElement).insertBefore(gradient, element);
                fill = "url(#" + gradient.getAttribute("id") + ")";
              } else if (pattern instanceof RGBColor || pattern instanceof CMYKColor) {
                fill = SvgFormat.formatRGB(layer, "");
              } else {
                fill = "none";
                console.log("Paint type not supported");
              }
            } else fill = "none";
            element.setAttribute("fill", fill);
            if (1 != opacity) element.setAttribute("fill-opacity", opacity);
            const style = new SvgStyle(element.getAttribute("style"));
            if (blend && blend !== BlendMode.Normal) style.set("mix-blend-mode", blend);
            else style.remove("mix-blend-mode");
            style.setElementStyle(element);
          });
          return;
        }
      }
    }
    element.setAttribute("fill", "none");
  }

  /**
   * Stroke attributes of a native element per border layer. Several
   * borders (or fills) put stroke-only copies into an isolated group; an
   * outside border of a rectangle or circle grows a copy by the border
   * width; other inside or outside borders double the width and mask the
   * stroke with the shape. Border markers (arrow heads) become paths.
   */
  static setCommonStrokeStyles(
    e: ExportNode,
    element: SvgElement,
    options: SvgExportOptions,
  ): void {
    if (!e.hasMixin(Stylable)) return;
    const layers = e.getPaintLayers();
    if (!layers) return;
    const borders = layers.getBorderLayers(true);
    if (!borders.length) return;
    let isolation: SvgElement | undefined;
    const separate = borders.length > 1 || layers.getFillLayers(true).length > 1;
    const markers: {
      vertexSource: VertexReader;
      properties: { paint: string; bw: number; outlined: unknown };
    }[] = [];
    const addMarker = (
      source: VertexReader | null,
      properties: { paint: string; bw: number; outlined: unknown },
    ) => {
      if (source) markers.push({ vertexSource: source, properties });
    };
    borders.forEach((layer) => {
      let target = element;
      if (separate) {
        target = element.cloneNode(true);
        target.setAttribute("fill", "none");
        target.removeAttribute("stroke");
        target.removeAttribute("stroke-width");
        target.removeAttribute("stroke-dasharray");
        target.removeAttribute("stroke-opacity");
        target.removeAttribute("stroke-linejoin");
        target.removeAttribute("stroke-linecap");
        target.removeAttribute("stroke-miterlimit");
        target.removeAttribute("mask");
        if (!isolation) {
          isolation = e._renderContext.svgDoc.createElementNS(SVG_NAMESPACE, "g");
          isolation.setAttribute("style", "isolation: isolate;");
          (element.parentNode as SvgElement).appendChild(isolation);
        }
        isolation.appendChild(target);
      }
      let paint = "";
      let width = layer.getProperty("_bw") as number;
      const alignment = layer.getProperty("_ba");
      let stroked = target;
      if (
        (e instanceof Rectangle || e instanceof Ellipse) &&
        alignment === BorderAlignment.Outside
      ) {
        stroked = target.cloneNode(false);
        (target.parentNode as SvgElement).insertBefore(stroked, target);
        const grown: Record<string, number> = {};
        if (e instanceof Rectangle) {
          grown.x = parseFloat(target.getAttribute("x") as string) - width / 2;
          grown.y = parseFloat(target.getAttribute("y") as string) - width / 2;
          grown.width = parseFloat(target.getAttribute("width") as string) + width;
          grown.height = parseFloat(target.getAttribute("height") as string) + width;
        } else if (e instanceof Ellipse) {
          grown.r = parseFloat(target.getAttribute("r") as string) + width / 2;
        }
        Object.keys(grown).forEach((name) => {
          stroked.setAttribute(name, grown[name]);
        });
        SvgUtil.replaceFill(stroked, "transparent");
      } else if (alignment !== BorderAlignment.Center) {
        width *= 2;
        let copy = target.cloneNode(true);
        SvgMasks.createMask(
          e._renderContext,
          copy,
          target,
          alignment === BorderAlignment.Outside,
          true,
        );
        if (target.hasAttribute("fill")) {
          copy = target.cloneNode(true);
          copy.removeAttribute("stroke");
          copy.removeAttribute("stroke-width");
          copy.removeAttribute("stroke-dasharray");
          copy.removeAttribute("stroke-opacity");
          copy.removeAttribute("stroke-linejoin");
          copy.removeAttribute("stroke-linecap");
          copy.removeAttribute("stroke-miterlimit");
          copy.removeAttribute("mask");
          (element.parentNode as SvgElement).insertBefore(copy, element);
        }
      }
      ((node: SvgElement) => {
        node.setAttribute("vector-effect", "non-scaling-stroke");
        node.setAttribute("stroke-width", numberFormat.formatNumber(width));
        const dashes = layer.getProperty("_bds") as number[] | null;
        if (dashes && dashes.length) {
          if (dashes.length < 2) dashes.push(dashes[0] as number);
          node.setAttribute("stroke-dasharray", dashes.join(","));
        }
        const pattern = layer.getProperty("_pt");
        e.getPatternBBox(options.includeInvisible);
        if (null == pattern) paint = "rgba(0,0,0,0)";
        else if (pattern instanceof LinearGradient) {
          const gradient = createSvgLinearGradient(
            e._renderContext,
            e._renderContext.svgDoc,
            pattern,
          );
          (node.parentNode as SvgElement).insertBefore(gradient, target);
          paint = "url(#" + gradient.getAttribute("id") + ")";
        } else if (pattern instanceof RadialGradient) {
          const gradient = createSvgRadialGradient(
            e._renderContext,
            e._renderContext.svgDoc,
            pattern,
          );
          (node.parentNode as SvgElement).insertBefore(gradient, target);
          paint = "url(#" + gradient.getAttribute("id") + ")";
        } else if (pattern instanceof RGBColor || pattern instanceof CMYKColor) {
          paint = SvgFormat.formatRGB(layer, "");
        } else {
          paint = "none";
          console.log("Paint type not supported");
        }
        node.setAttribute("stroke", paint);
        const opacity = layer.getProperty("_op");
        if (1 != opacity) node.setAttribute("stroke-opacity", opacity);
        const join = layer.getProperty("_blj");
        if (join) {
          switch (join) {
            case LineJoin.Round:
              node.setAttribute("stroke-linejoin", "round");
              break;
            case LineJoin.Miter:
              node.setAttribute("stroke-linejoin", "miter");
              break;
            case LineJoin.Bevel:
              node.setAttribute("stroke-linejoin", "bevel");
          }
        }
        const cap = layer.getProperty("_blc");
        if (cap) {
          switch (cap) {
            case LineCap.Butt:
              node.setAttribute("stroke-linecap", "butt");
              break;
            case LineCap.Round:
              node.setAttribute("stroke-linecap", "round");
              break;
            case LineCap.Square:
              node.setAttribute("stroke-linecap", "square");
          }
        }
        let miterLimit = (layer as BorderPaintLayer).$_bml as unknown;
        if (e instanceof Shape) miterLimit = e.calculateMitterLimit(layer);
        if (miterLimit) node.setAttribute("stroke-miterlimit", miterLimit);
        const blend = layer.getProperty("_bl");
        const style = new SvgStyle(node.getAttribute("style"));
        if (blend && blend !== BlendMode.Normal) style.set("mix-blend-mode", blend);
        else style.remove("mix-blend-mode");
        style.setElementStyle(node);
      })(stroked);
      const properties = { paint, bw: (layer as BorderPaintLayer).$_bw };
      addMarker(
        e.getHeadMarkerVertices(layer),
        extend({ outlined: (layer as BorderPaintLayer).$_bhmo }, properties) as never,
      );
      addMarker(
        e.getTailMarkerVertices(layer),
        extend({ outlined: (layer as BorderPaintLayer).$_btmo }, properties) as never,
      );
    });
    markers.forEach((marker) => {
      const data = (
        marker.vertexSource as VertexReader & {
          toSVGPath(round: (value: number) => number): string;
        }
      ).toSVGPath(formatNumberDetached);
      const path = e._renderContext.createSvgElement("path");
      path.setAttribute("d", data);
      let paint = marker.properties.paint;
      if (-1 !== paint.indexOf("url")) {
        const document = e._renderContext.svgDoc;
        const pattern = document.createElementNS(SVG_NAMESPACE, "pattern");
        pattern.setAttribute("id", "_pattern_" + uuid(3));
        pattern.setAttribute(
          "width",
          (document.firstElementChild as SvgElement).getAttribute("width"),
        );
        pattern.setAttribute(
          "height",
          (document.firstElementChild as SvgElement).getAttribute("height"),
        );
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        const area = e.getPaintBBox(false, null, options.includeInvisible) as Rect;
        const rect = e._renderContext.createSvgElement("rect");
        rect.setAttribute("x", numberFormat.formatNumber(area.getX()));
        rect.setAttribute("y", numberFormat.formatNumber(area.getY()));
        rect.setAttribute("width", numberFormat.formatNumber(area.getWidth()));
        rect.setAttribute("height", numberFormat.formatNumber(area.getHeight()));
        rect.setAttribute("fill", marker.properties.paint);
        pattern.appendChild(rect);
        paint = SvgUtil.createIdUrl(pattern.getAttribute("id"));
        (element.parentNode as SvgElement).appendChild(pattern);
      }
      if (-1 === data.indexOf("Z") || marker.properties.outlined) {
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", paint);
        path.setAttribute("stroke-width", marker.properties.bw);
      } else {
        path.setAttribute("fill", paint);
        path.setAttribute("stroke", "none");
      }
      (element.parentNode as SvgElement).appendChild(path);
    });
  }

  /**
   * Writes one recorded path. Normal compositing appends it; source-in
   * (on a paths graph) recolors the strokes; destination-in and
   * destination-out turn it into a mask of the target (the group being
   * written, or its last path).
   */
  static processPath(
    document: SvgDocument,
    group: SvgElement,
    defs: SvgElement,
    data: string,
    style: SvgStyle,
    recorded: SvgContextStyle,
    operation: string,
    state: MaskState,
  ): void {
    const path = document.createElementNS(SVG_NAMESPACE, "path");
    if (state.isMask) {
      const color = state.isInverse ? "black" : "white";
      if ("none" !== style.get("fill")) style.set("fill", color);
      if ("none" !== style.get("stroke")) style.set("stroke", color);
    }
    for (const name of Object.keys(BlendMode)) {
      if ((BlendMode as Record<string, string>)[name] === operation) {
        style.set("mix-blend-mode", operation);
        break;
      }
    }
    path.setAttribute("d", data);
    path.setAttribute("style", style.toString());
    const target = group;
    switch (operation) {
      case "normal":
      case "multiply":
      case "screen":
      case "overlay":
      case "darken":
      case "lighten":
      case "color-dodge":
      case "color-burn":
      case "hard-light":
      case "soft-light":
      case "difference":
      case "exclusion":
      case "hue":
      case "saturation":
      case "color":
      case "luminosity":
      case "source-over":
        target.appendChild(path);
        break;
      case "source-in":
        if (SvgExport._node instanceof PathsGraph) {
          if (2 == (group.parentElement as SvgElement).getElementsByTagName("g").length) {
            group.remove();
            return;
          }
          let fill = style.get("fill") as string;
          if (recorded.fillStyle instanceof Gradient) {
            const pattern = document.createElementNS(SVG_NAMESPACE, "pattern");
            pattern.setAttribute("id", "_pattern_" + uuid(3));
            pattern.setAttribute(
              "width",
              (document.firstElementChild as SvgElement).getAttribute("width"),
            );
            pattern.setAttribute(
              "height",
              (document.firstElementChild as SvgElement).getAttribute("height"),
            );
            pattern.setAttribute("patternUnits", "userSpaceOnUse");
            pattern.appendChild(path);
            group.insertBefore(pattern, group.firstChild);
            fill = SvgUtil.createIdUrl(pattern.getAttribute("id"));
          }
          eachLive(group.childNodes, (child) => {
            if (
              child instanceof SvgElement &&
              child.style.stroke &&
              "none" !== child.style.stroke
            ) {
              child.style.stroke = fill;
            }
          });
        }
        break;
      case "destination-in": {
        const id = "_mask_" + uuid();
        const masked = state.maskTarget || SvgExport.getTargetPath(target);
        if (!masked) {
          console.warn("target path not found for destination-in");
          break;
        }
        if (masked.getAttribute("mask")) {
          const wrapper = document.createElementNS(SVG_NAMESPACE, "g");
          const current = state.maskTarget as SvgElement;
          (current.parentNode as SvgElement).insertBefore(wrapper, current);
          wrapper.setAttribute("mask", "url(#" + id + ")");
          (current.parentNode as SvgElement).removeChild(current);
          wrapper.appendChild(current);
          state.maskTarget = wrapper;
        } else masked.setAttribute("mask", "url(#" + id + ")");
        const mask = document.createElementNS(SVG_NAMESPACE, "mask");
        defs.appendChild(mask);
        mask.setAttribute("id", id);
        mask.appendChild(path);
        if (recorded._isStroke) SvgUtil.replaceFillAndStroke(path, "black", "white");
        else SvgUtil.replaceFillAndStroke(path, "white", "black");
        break;
      }
      case "destination-out": {
        const id = "_mask_" + uuid();
        const masked = state.maskTarget || SvgExport.getTargetPath(target);
        if (!masked) {
          console.warn("target path not found for destination-out");
          break;
        }
        if (masked.getAttribute("mask")) {
          const wrapper = document.createElementNS(SVG_NAMESPACE, "g");
          const last = target.lastChild as SvgElement;
          (last.parentNode as SvgElement).insertBefore(wrapper, last);
          wrapper.setAttribute("mask", "url(#" + id + ")");
          wrapper.appendChild(target.lastChild as SvgElement);
        } else masked.setAttribute("mask", "url(#" + id + ")");
        const mask = document.createElementNS(SVG_NAMESPACE, "mask");
        defs.appendChild(mask);
        mask.setAttribute("id", id);
        mask.appendChild(path);
        const copy = masked.cloneNode(true);
        copy.removeAttribute("mask");
        copy.removeAttribute("fill");
        copy.removeAttribute("stroke");
        SvgUtil.replaceFillAndStroke(copy, "white", "black");
        mask.setAttribute("filterUnits", "userSpaceOnUse");
        mask.setAttribute("x", "-1000%");
        mask.setAttribute("y", "-1000%");
        mask.setAttribute("width", "2000%");
        mask.setAttribute("height", "2000%");
        mask.appendChild(copy);
        mask.appendChild(path);
        break;
      }
      default:
        console.log(operation);
    }
  }

  /**
   * Writes a canvas that was drawn into the paint canvas (a blend or mask
   * step) as a nested group, its recorded paths processed with the
   * canvas offset added to their transforms.
   */
  static renderExportCanvas(
    paintContext: SvgPaintContext,
    document: SvgDocument,
    defs: SvgElement,
    parent: SvgElement,
    entry: SvgDrawImageEntry,
    operation: string,
    alpha: number | string | undefined,
  ): void {
    const group = document.createElementNS(SVG_NAMESPACE, "g");
    parent.appendChild(group);
    const state: MaskState = { isMask: false, maskTarget: group };
    switch (operation) {
      case "normal":
      case "multiply":
      case "screen":
      case "overlay":
      case "darken":
      case "lighten":
      case "color-dodge":
      case "color-burn":
      case "hard-light":
      case "soft-light":
      case "difference":
      case "exclusion":
      case "hue":
      case "saturation":
      case "color":
      case "luminosity":
        parent.setAttribute("style", "mix-blend-mode:" + operation + ";");
        if (1 != alpha && "1" !== alpha) parent.setAttribute("opacity", alpha);
        break;
      case "destination-in":
      case "destination-out":
        SvgMasks.createMaskDefinition(document, operation, parent, state);
    }
    const source = entry.drawImage._canvasContext;
    const previousCanvas = paintContext.canvas;
    paintContext.canvas = entry.drawImage as unknown as SvgPaintCanvas;
    for (let index = 0; index < source._svgs.length; index++) {
      const path = source._svgs[index] as string | SvgDrawImageEntry;
      const recorded = source._svgStyles[index] as SvgContextStyle;
      const style = paintContext.getSvgStyle(index, defs);
      recorded._transform = recorded._transform.translated(
        (entry.drawImage._offset as Point).getX(),
        (entry.drawImage._offset as Point).getY(),
      );
      if (void 0 !== (path as SvgDrawImageEntry).drawImage) {
        operation = paintContext.getGlobalCompositeOperation(index);
        alpha = paintContext.getGlobalAlpha(index);
        const nested = document.createElementNS(SVG_NAMESPACE, "g");
        group.appendChild(nested);
        SvgExport.renderExportCanvas(
          paintContext,
          document,
          defs,
          nested,
          path as SvgDrawImageEntry,
          operation,
          alpha,
        );
      } else {
        SvgExport.processPath(
          document,
          group,
          defs,
          path as string,
          style,
          paintContext.getSvgStyleObject(index),
          recorded.globalCompositeOperation,
          state,
        );
      }
    }
    paintContext.canvas = previousCanvas;
  }

  /**
   * Exports `node` and calls `fnResult(null, svgText)`; with a missing
   * bounding box `fnResult("Missing BBox")`. A background color in the
   * options temporarily replaces a page's background.
   */
  static export(
    node: Node | Node[],
    options: SvgExportOptions | null | undefined,
    fnResult: SvgExportResult,
  ): void {
    options = options || DefaultOptions;
    const background = options.backgroundColor;
    const backgroundOpacity =
      background && "number" == typeof options.backgroundOpacity ? options.backgroundOpacity : 1;
    const includeInvisible = !!options.includeInvisible && options.includeInvisible;
    if (!fnResult) {
      console.error("No fnResult callback passed to GSVGExport.export.");
      return;
    }
    let element = node as ExportNode;
    let savedBackground: unknown = null;
    let savedOpacity: unknown = null;
    if (background && element instanceof Page) {
      savedBackground = element.getProperty("bck");
      savedOpacity = element.getProperty("bop");
      element.setProperties(["bck", "bop"], [background, backgroundOpacity]);
    }
    try {
      let precision = 3;
      if (!isNaN(options.decimalPlacesPrecision as number)) {
        precision = parseInt(options.decimalPlacesPrecision as string);
      }
      numberFormat.setDecimalPlacesPrecision(precision);
      const exportOptions = options;
      const paintContext = new SvgPaintContext(new SvgContext(null, exportOptions));
      (paintContext.getRootCanvas() as SvgPaintCanvas)._createContext = () =>
        new SvgContext(null, exportOptions);
      let sliceClass: unknown;
      const context = new SvgRenderContext(options, paintContext, fnResult);
      if (!(element instanceof Scene)) {
        const box = SvgFormat.getBoundingBox(element, includeInvisible);
        if (!box) {
          fnResult("Missing BBox");
          return;
        }
        if (element instanceof Slice) {
          sliceClass = element.getProperty("cls");
          element = element.getScene() as unknown as ExportNode;
        }
        const viewBox =
          numberFormat.formatNumber(box.getX()) +
          " " +
          numberFormat.formatNumber(box.getY()) +
          " " +
          numberFormat.formatNumber(box.getWidth()) +
          " " +
          numberFormat.formatNumber(box.getHeight());
        context.svgDoc.documentElement.setAttribute("viewBox", viewBox);
        context.svgDoc.documentElement.setAttribute(
          "width",
          numberFormat.formatNumber(box.getWidth()) + Length.Unit.PT,
        );
        context.svgDoc.documentElement.setAttribute(
          "height",
          numberFormat.formatNumber(box.getHeight()) + Length.Unit.PT,
        );
        context.viewBox = box;
      }
      context.beginJob(element.toString());
      SvgExport.renderNode(element, context, sliceClass, includeInvisible);
      if (options.preserveEditingCapabilities) SvgExport.addEditingCapabilities(context, element);
      new SvgPostProcess(context.svgDoc).postProcess();
      context.endJob(element.toString());
    } catch (error) {
      // A painting error ends the export through the callback; the old
      // code let it escape, so nothing was written and the caller waited
      // (BUGS-FIXED.md "BUG-086 A broken image makes the SVG export never
      // finish").
      fnResult(error);
    } finally {
      if (background && element instanceof Page)
        element.setProperties(["bck", "bop"], [savedBackground, savedOpacity]);
    }
  }

  /**
   * The editing data: the content group moves into a `<switch>` next to a
   * `<foreignObject>` that requires the Gravit extension and references a
   * `<gravitDesigner:gravitGraphicSource>` holding the node, serialized and
   * compressed, as CDATA.
   */
  static addEditingCapabilities(context: SvgRenderContext, node: Node): void {
    const data = compressString(Node.serialize(node) as string);
    const document = context.svgDoc;
    const root = document.documentElement;
    const switchElement = context.createSvgElement("switch");
    root.appendChild(switchElement);
    const content = find(root.children, (child) => "g" === child.nodeName) as SvgElement;
    root.removeChild(content);
    switchElement.appendChild(content);
    const foreign = context.createSvgElement("foreignObject");
    foreign.setAttribute("requiredExtensions", SvgRenderContext.XMLNamespaceURI);
    const id = uuid();
    const reference = context.createInternalSvgElement("gravitElementRef", {
      "xlink:href": "#" + id,
    });
    foreign.appendChild(reference);
    switchElement.appendChild(foreign);
    const source = context.createInternalSvgElement("gravitGraphicSource", { id, version: 1 });
    root.appendChild(source);
    source.appendChild(document.createCDATASection(data));
  }

  /**
   * An image as `<image>` (or a `<use>` of the image dictionary) with its
   * image transform; a mask blend ("m", "!m") turns the image into an
   * alpha (or inverted) mask of what is before it. The image's frame is
   * then painted (fills taken off) for its border and effects.
   */
  static exportImage(e: ExportNode): void {
    let context = e._renderContext;
    const options = effectiveOptions(context);
    if (SvgExport.checkRasterize(e)) return;
    context = e._renderContext;
    const image = e as unknown as Image;
    // The old call passed true, which getTransform ignores.
    const transform = image.getTransform() as Transform | null;
    const rotation = null != transform ? transform.getRotationFactor() : 0;
    if (0 != rotation) {
      const center = image.getCenter(true) as Point;
      const unrotate = new Transform()
        .translated(-center.getX(), -center.getY())
        .scaled(1, 1)
        .rotated(-rotation)
        .translated(center.getX(), center.getY());
      image.transform(unrotate);
      image.getGeometryBBox(options.includeInvisible);
      image.transform(unrotate.inverted() as Transform);
    } else image.getGeometryBBox(options.includeInvisible);
    const result: EffectMarkupResult = {};
    const defs = context.createSvgElement("defs");
    const element = options.useImageDictionary
      ? context.createImageElement(image)
      : context.createSvgElement("image");
    SvgEffects.getEffectMarkup(e as unknown as EffectsHost, result, defs);
    if (defs.childNodes.length > 0) context.peek().appendChild(defs);
    context.peek().appendChild(element);
    let fills: PaintLayer[] | undefined;
    let layers: PaintLayers | null | undefined;
    const style = new SvgStyle();
    const canvas = image.getImageCanvas();
    if (canvas) {
      const imageTransform = image.getImageTransform() || new Transform();
      if (!options.useImageDictionary) {
        element.setAttribute("width", canvas.width);
        element.setAttribute("height", canvas.height);
      }
      element.setAttribute(
        "transform",
        "matrix(" + numberFormat.formatNumber(imageTransform.getMatrix()).join(",") + ")",
      );
      element.setAttribute("preserveAspectRatio", "none");
      const blend = e.getProperty("_sbl") as string | null;
      if (blend && "normal" !== blend && "m" !== blend && "!m" != blend)
        style.set("mix-blend-mode", blend);
      const opacity = e.getProperty("_stop");
      if (1 != opacity) style.set("opacity", opacity);
      if (!options.useImageDictionary) element.setAttribute("xlink:href", canvas.toDataURL());
      element.setAttribute("style", style.toString());
    } else {
      (element.parentNode as SvgElement).removeChild(element);
      // Kept: removes the image element from the defs' parent, which isn't its parent.
      if (defs.parentNode) defs.parentNode.removeChild(element);
    }
    const maskMode = e.getProperty("_sbl");
    let maskGroup: SvgElement | undefined;
    let parent: SvgElement | undefined;
    if ("m" === maskMode || "!m" === maskMode) {
      const id = "_mask_" + uuid();
      maskGroup = (element.ownerDocument as SvgDocument).createElementNS(SVG_NAMESPACE, "mask");
      maskGroup.setAttribute("id", id);
      parent = element.parentNode as SvgElement;
      parent.removeChild(element);
      eachLive(parent.childNodes, (child) => {
        child.setAttribute("mask", "url(#" + id + ")");
      });
      parent.appendChild(maskGroup);
      maskGroup.appendChild(element);
      const filterId = "_mask_filter_" + uuid(8);
      element.setAttribute("filter", "url(#" + filterId + ")");
      const filter = (element.ownerDocument as SvgDocument).createElementNS(
        SVG_NAMESPACE,
        "filter",
      );
      parent.appendChild(filter);
      filter.setAttribute("id", filterId);
      const matrix = (element.ownerDocument as SvgDocument).createElementNS(
        SVG_NAMESPACE,
        "feColorMatrix",
      );
      filter.appendChild(matrix);
      matrix.setAttribute("type", "matrix");
      matrix.setAttribute("in", "SourceAlpha");
      if ("m" === maskMode) {
        matrix.setAttribute("values", "0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0");
      } else {
        matrix.setAttribute("values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0");
        const white = (element.ownerDocument as SvgDocument).createElementNS(SVG_NAMESPACE, "rect");
        (element.parentNode as SvgElement).insertBefore(white, element);
        white.setAttribute("x", "0");
        white.setAttribute("y", "0");
        white.setAttribute("width", "100%");
        white.setAttribute("height", "100%");
        white.setAttribute("fill", "white");
      }
    }
    if (e.hasMixin(Stylable) && (layers = e.getPaintLayers())) fills = layers.getFillLayers();
    if (layers) layers.clearFillLayers();
    SvgExport.generateSvgPath(e, result);
    if (fills) {
      fills.forEach((layer) => {
        (layers as PaintLayers).appendChild(layer);
      });
    }
    const lastDefs = context.peek().getElementsByTagName("defs").slice(-1).pop();
    if (lastDefs) {
      parent = element.parentNode as SvgElement;
      const filter = lastDefs.getElementsByTagName("filter")[0];
      if (filter) {
        const filtered = context.createSvgElement("g");
        filtered.setAttribute("filter", "url(#" + filter.getAttribute("id") + ")");
        parent.appendChild(filtered);
        parent = filtered;
      }
      const mask = lastDefs.getElementsByTagName("mask")[0];
      if (mask) {
        maskGroup = context.createSvgElement("g");
        maskGroup.setAttribute("mask", "url(#" + mask.getAttribute("id") + ")");
        maskGroup.appendChild(element);
        const blend = e.getProperty("_sbl") as string | null;
        if (blend && "normal" !== blend && "m" !== blend && "!m" != blend) {
          maskGroup.setAttribute("style", "mix-blend-mode:" + blend);
        }
        parent.appendChild(maskGroup);
      }
    }
  }

  /** Whether text must be written as outlines: asked for, fake text, several fills or borders, or a direction. */
  static _shouldConverTextToPath(text: Text, options?: SvgExportOptions | null): boolean {
    if (options && options.convertTextToPath) return true;
    if (text.isFakeText()) return true;
    const layers = text.getPaintLayers() as PaintLayers;
    const fills = layers.getFillLayers(true);
    const borders = layers.getBorderLayers(true);
    return !!(fills.length > 1 || borders.length > 1 || text.getProperty("dir"));
  }

  /** Elements, except texts without a fill. */
  static _shouldRenderNode(node: Node): boolean {
    return node instanceof Element && !(node instanceof Text && !node.hasStyleFill());
  }

  /**
   * Writes one node and its children. Scenes get the canvas size and an
   * offset group; groups, layers and symbols a `<g>` with name, blend,
   * opacity and filter; containers with children a clip path from their
   * own outline; texts are either outlined or laid out with an SVG text
   * core on a shallow copy.
   */
  static renderNode(
    node: Node,
    context: SvgRenderContext,
    sliceClass: unknown,
    includeInvisible?: boolean,
  ): void {
    if (!SvgExport._shouldRenderNode(node)) return;
    let e = asExportNode(node);
    const visible = e.getProperty("vis");
    if (false === visible && !includeInvisible) return;
    let outlined = false;
    if (e instanceof Text) {
      if (SvgExport._shouldConverTextToPath(e, context.options)) {
        outlined = true;
        const shapes = e.getTextShapes();
        for (let i = 0; i < shapes.length; i++) {
          SvgExport.renderNode(shapes[i] as unknown as Node, context, null, includeInvisible);
        }
      } else {
        const source = e;
        const copy = Object.create(Object.getPrototypeOf(source)) as ExportNode & {
          __source__: Text;
          _finishPaint(context: unknown): void;
        };
        extend(copy, source);
        copy.__source__ = source as unknown as Text;
        (copy as unknown as Text).setTLCore(
          new SvgTLCore(source as unknown as Text, context.options) as never,
        );
        copy._finishPaint = function (this: typeof copy, paintContext: unknown) {
          (
            Object.getPrototypeOf(this) as { _finishPaint(context: unknown): void }
          )._finishPaint.call(this, paintContext);
          this.__source__._runsDirty = true;
        };
        e = copy;
      }
    }
    e._export = {};
    e._renderContext = context;
    e._paintContext = context.paintContext;
    let rasterized = false;
    let annotation = false;
    let clipsChildren = false;
    const savedIgnoreContents = context.paintContext._ignoreContents;
    context.paintContext._ignoreContents = false;
    let pageBox: Rect | null = null;
    if (e instanceof Scene) {
      const root = context.svgDoc.documentElement;
      let width: string | number | null = root.getAttribute("width");
      let height: string | number | null = root.getAttribute("height");
      if (!width || !height) {
        const area = e.getPaintBBox(true, null, includeInvisible) as Rect;
        if (e.isFixedSized()) {
          pageBox = new Rect(0, 0, area.getWidth(), area.getHeight());
          width = pageBox.getWidth().toString();
          height = pageBox.getHeight().toString();
          context._ignoreContents = true;
        } else {
          pageBox = area || new Rect(0, 0, 0, 0);
          const contentGroup = context.createSvgElement("g");
          context.peek().appendChild(contentGroup);
          context.push(contentGroup);
          const dx = 0 - pageBox.getX();
          const dy = 0 - pageBox.getY();
          contentGroup.setAttribute(
            "transform",
            "translate(" +
              numberFormat.formatNumber(dx) +
              "," +
              numberFormat.formatNumber(dy) +
              ")",
          );
          width = (pageBox.getWidth() + 0).toString();
          height = (pageBox.getHeight() + 0).toString();
          const inner = context.createSvgElement("g");
          contentGroup.appendChild(inner);
          context.push(inner);
          context.globalOffset = { x: dx, y: dy };
        }
        root.setAttribute("width", numberFormat.formatNumber(width as unknown as number));
        root.setAttribute("height", numberFormat.formatNumber(height as unknown as number));
      }
      SvgExport.setVisibility(root, visible);
    } else if (e instanceof Group || e instanceof Layer || e instanceof SymbolNode) {
      if (e instanceof Group || e instanceof SymbolNode) {
        const options = effectiveOptions(context);
        let unsupported = false;
        if ("boolean" == typeof options.rasterizeUnsupportedObjectsByCDR) {
          if (options.rasterizeUnsupportedObjectsByCDR)
            unsupported = SvgExport.hasUnsupportedObjectsByCDR(e);
        } else unsupported = SvgExport.hasUnsupportedEffects(e);
        if (unsupported) {
          SvgExport.generateSvgPath(e, {});
          rasterized = !!e._renderContext.wasRasterized;
        }
      }
      if (!rasterized) {
        const group = context.createSvgElement("g");
        if (e instanceof Layer) group.setAttribute("style", "isolation:isolate");
        SvgUtil.setAttributeId(group, e, e._renderContext.options);
        SvgUtil.exportAttributes(group, e, e._renderContext.options);
        const style = new SvgStyle();
        const blend = e.getProperty("_sbl") as string | null;
        if (blend && "normal" !== blend) style.set("mix-blend-mode", blend);
        const opacity = e.getProperty("_stop");
        if (opacity && 1 != opacity) style.set("opacity", opacity);
        if (style.getLength() > 0) group.setAttribute("style", style.toString());
        context.peek().appendChild(group);
        context.push(group);
        const defs = context.createSvgElement("defs");
        const result: EffectMarkupResult = {};
        SvgEffects.getEffectMarkup(e as unknown as EffectsHost, result, defs);
        if (result.filter) {
          group.setAttribute("filter", result.filter);
          (group.parentNode as SvgElement).appendChild(defs);
        }
      }
    } else if (!e.hasMixin(Annotation) || e instanceof CommentAnnotation) {
      if (e instanceof Path) {
        // The old code also created a <g> here that it never used or
        // attached (createSvgElement has no side effects), so it is left out.
        clipsChildren = e.hasMixin(Container) && e.getChildren().length > 0;
      } else if (e instanceof CompoundShape) annotation = true;
      else if (!(e instanceof Page))
        clipsChildren = e.hasMixin(Container) && e.getChildren().length > 0;
    } else {
      annotation = true;
      clipsChildren = false;
    }
    if (clipsChildren) context.paintContext._ignoreContents = function () {};
    let hasFill = false;
    let layers: PaintLayers | null | undefined;
    if (e.hasMixin(Stylable)) hasFill = !!(layers = e.getPaintLayers()) && layers.hasStyleFill();
    if (!hasFill && e instanceof Text) hasFill = outlined || !!e.getProperty("_fc");
    const whiteFill =
      clipsChildren && !hasFill && (!layers || !layers.getBorderLayers(true).length);
    if (whiteFill && layers)
      layers.appendChild(new Stylable.FillPaintLayer(new RGBColor([255, 255, 255])));
    if (!outlined) {
      let name = e.toString().replace(/[[\]]/g, "");
      name = name.replace(/^Object /, "");
      const encoder = SvgExport.Encoders[name];
      if (encoder instanceof Function) {
        if (!rasterized) {
          e._renderContext.wasRasterized = false;
          encoder.call(SvgExport, e);
          rasterized = !!e._renderContext.wasRasterized;
        }
      } else console.warn("Missing encoder for node type " + name);
    }
    if (whiteFill && e.hasMixin(Stylable)) {
      layers = e.getPaintLayers();
      if (layers) layers.clearFillLayers();
    }
    if (!rasterized && (!annotation || clipsChildren)) {
      if (clipsChildren) {
        const clipGroup = context.createSvgElement("g");
        const last = context.peek().lastChild as SvgElement | null;
        if (last) {
          const shapes = SvgMasks.filterElementsUsedForMasking(last);
          const outside = e.getProperty("_ba") === BorderAlignment.Outside;
          const clipPath = SvgMasks.createMaskDefinitionFromShape(context.svgDoc, last, outside);
          if (whiteFill) while (last.firstChild) last.removeChild(last.firstChild);
          clipGroup.setAttribute("clip-path", "url(#" + clipPath.getAttribute("id") + ")");
          last.appendChild(clipPath);
          last.appendChild(clipGroup);
          if ((layers as PaintLayers).hasStyleBorder()) {
            for (let i = 0; i < shapes.length; i++) {
              const shape = shapes[i] as SvgElement;
              if (shape.parentNode === last && shape.getAttribute("stroke-width")) {
                const outline = shape.cloneNode(false);
                SvgUtil.replaceFill(outline, "transparent");
                last.appendChild(outline);
              }
            }
          }
          context.push(clipGroup);
        }
      }
      if (e instanceof Page)
        SvgExport.renderPage(e, context, sliceClass, pageBox, includeInvisible);
      else if (e.hasMixin(Container)) {
        for (let child = e.getFirstChild(); null != child; child = child.getNext()) {
          if (child instanceof Page)
            SvgExport.renderPage(child, context, sliceClass, pageBox, includeInvisible);
          else SvgExport.renderNode(child, context, null, includeInvisible);
        }
      }
      if (clipsChildren) context.pop();
    }
    if (!(!includeInvisible || e instanceof Scene))
      SvgExport.setVisibility(context.peek(), visible);
    if (((e instanceof Group || e instanceof SymbolNode) && !rasterized) || e instanceof Layer)
      context.pop();
    context.paintContext._ignoreContents = savedIgnoreContents;
  }

  static setVisibility(element: SvgElement, visible: unknown): void {
    if (false === visible) element.setAttribute("visibility", "hidden");
  }

  /**
   * A page: a group clipped to the page area (when the scene background
   * is on) with the background as a rect (or an image for a background
   * pattern), then the master pages and the children.
   */
  static renderPage(
    page: Page,
    context: SvgRenderContext,
    sliceClass: unknown,
    pageBox: Rect | null,
    includeInvisible?: boolean,
  ): void {
    const group = context.createSvgElement("g");
    context.peek().appendChild(group);
    context.push(group);
    if (!context.options || false !== context.options.sceneBackground) {
      const rect = context.createSvgElement("rect");
      let width = page.getProperty("w") as number;
      let height = page.getProperty("h") as number;
      let area: Rect | null = null;
      if (!page.isFixedSized()) {
        area = page.getPaintBBox(false, null, includeInvisible);
        if (area) {
          width = area.getWidth();
          height = area.getHeight();
          rect.setAttribute("x", numberFormat.formatNumber(area.getX()));
          rect.setAttribute("y", numberFormat.formatNumber(area.getY()));
        }
      }
      if (width && height) {
        rect.setAttribute("width", numberFormat.formatNumber(width));
        rect.setAttribute("height", numberFormat.formatNumber(height));
        const clipPath = SvgMasks.createMaskDefinitionFromShape(context.svgDoc, rect, false);
        const defs = context.createSvgElement("defs");
        defs.appendChild(clipPath);
        (group.parentNode as SvgElement).insertBefore(defs, group);
        group.setAttribute("clip-path", "url(#" + clipPath.getAttribute("id") + ")");
        let background = (sliceClass || page.getProperty("bck")) as unknown;
        if (
          background instanceof Color &&
          equals(background.toScreen(), RGBColor.WHITE.toScreen())
        ) {
          background = null;
        }
        if (background) {
          const fill = context.createSvgElement("rect");
          if (!page.isFixedSized()) {
            fill.setAttribute("x", numberFormat.formatNumber((area as Rect).getX()));
            fill.setAttribute("y", numberFormat.formatNumber((area as Rect).getY()));
          }
          fill.setAttribute("width", numberFormat.formatNumber(width));
          fill.setAttribute("height", numberFormat.formatNumber(height));
          group.appendChild(fill);
          if (background instanceof AngularGradient) {
            let rasterize = true;
            const options = context.options || {};
            if (
              "boolean" == typeof options.rasterizeUnsupportedObjectsByCDR &&
              !options.rasterizeUnsupportedObjectsByCDR
            ) {
              rasterize = false;
            }
            if (rasterize) {
              const shape = new Rectangle(0, 0, width, height);
              (shape.getPaintLayers() as PaintLayers).appendChild(
                new Stylable.FillPaintLayer(background),
              );
              const data = (
                shape.toBitmap() as NonNullable<ReturnType<Rectangle["toBitmap"]>>
              ).toImageDataUrl();
              const image = context.createSvgElement("image");
              image.setAttribute("width", numberFormat.formatNumber(width));
              image.setAttribute("height", numberFormat.formatNumber(height));
              image.setAttribute("xlink:href", data);
              group.appendChild(image);
            }
          } else if (background instanceof Gradient) {
            // Kept: a page under a scene was never rendered as a node, so it has no paint context here.
            const paint = (page as unknown as ExportFields)._paintContext.canvas.createPatternPaint(
              background,
              pageBox,
            ) as unknown as { paint: Gradient };
            const gradient = gradientAsSVG(
              paint.paint,
              context.svgDoc,
              "e._paintContext.canvas.createPatternPaint(...).paint",
            );
            fill.setAttribute("style", "fill:url(#" + gradient.getAttribute("id") + ");");
            (fill.parentNode as SvgElement).insertBefore(gradient, fill);
          } else if (background instanceof RGBColor || background instanceof CMYKColor) {
            fill.setAttribute("style", "fill:" + toFill(background));
            const opacity = page.getProperty("bop");
            if (1 != opacity) fill.setAttribute("fill-opacity", opacity);
          } else console.error("background color not supported");
        }
      }
    }
    (page.getMasterPages() as Page[]).forEach((master) => {
      if (master instanceof Page) SvgExport.renderNode(master, context, null, includeInvisible);
    });
    for (let child = page.getFirstChild(); null != child; child = child.getNext()) {
      SvgExport.renderNode(child, context, null, includeInvisible);
    }
    context.pop();
  }
}
