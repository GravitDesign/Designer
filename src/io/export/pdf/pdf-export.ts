// Old: chunk.vendor.js module 1406 (GPDFExport).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Platform } from "../../../engine/core/platform.ts";
import { extend } from "../../../engine/core/util.ts";
import { Length } from "../../../engine/math/length.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import type { PaintStyle } from "../../../engine/paint/paint-canvas.ts";
import { Anchor } from "../../../engine/scene/anchor.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Image } from "../../../engine/scene/image.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Graph } from "../../../engine/scene/paths-graph/graph.ts";
import { PathsGraph } from "../../../engine/scene/paths-graph/paths-graph.ts";
import { PGEdge } from "../../../engine/scene/paths-graph/pg-edge.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Shape } from "../../../engine/scene/shape.ts";
import { Slice } from "../../../engine/scene/slice.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { DropShadowEffect } from "../../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../../engine/style/effects/inner-shadow-effect.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Text } from "../../../engine/text/text.ts";
import { BitmapExport, type BitmapExportNode } from "../bitmap-export.ts";
import { ExportCompat } from "../export-compat.ts";
import { PDFBorderPainter, type BorderLayer, type BorderShape } from "./border-painter.ts";
import { PDFByteStream } from "./byte-stream.ts";
import { ColorSpaces, colorSpaceByName } from "./color-spaces.ts";
import { PDFDropShadowEffect, type ShadowNode } from "./effects/drop-shadow.ts";
import { PDFInnerShadowEffect } from "./effects/inner-shadow.ts";
import { PDFCompatibilityProcessor } from "./master-page-processor.ts";
import type { PDFOutput } from "./output.ts";
import { PDFCanvasContext } from "./pdf-canvas.ts";
import { PDFDocument, type PDFExportWorker } from "./pdf-document.ts";
import { PDFPaintContext } from "./pdf-paint-context.ts";
import { PDFTLCore } from "./pdf-tl-render.ts";
import { PDFRasterFallback } from "./raster-fallback.ts";
import { createExportWorker } from "../../../workers/pdf-export/index.ts";

/** What the export dialog (old GExporter) passes. */
export interface PDFExportOptions {
  /** The resolution of rasterized parts; at least 72. */
  dpi?: number;
  /** "rgb" or "cmyk". */
  colorSpace?: string;
  jpegQuality?: number;
  configuration?: {
    ignoreEffects?: boolean;
    forceEffectsWhenZoomed?: boolean;
    sceneBackground?: boolean;
  } | null;
  backgroundColor?: PaintStyle | null;
  backgroundOpacity?: number | null;
  convertTextToPath?: boolean;
  /** Called with the progress in percent after each page or element. */
  progress?: ((percent: number) => void) | null;
  user?: string | null;
  title?: string | null;
  downsampleImages?: boolean;
  /** Runs everything on the main thread. */
  disableWorker?: boolean;
}

/** The dialog the old exporter could show messages in. */
export interface PDFExportDialog {
  message?(text: string): void;
}

/**
 * Called with an error, or with null and the file's bytes and the
 * document. With the default writer the bytes are a Uint8ClampedArray.
 */
export type PDFExportCallback = (
  error: unknown,
  bytes?: Uint8ClampedArray<ArrayBuffer> | null,
  document?: PDFDocument,
) => void;

type AnyMethod = (...args: unknown[]) => unknown;

/** A proxy is a shallow copy of a node with some methods replaced. */
type ProxyNode = Node & Record<string, unknown> & { __source__: Node };

function prototypeMethod(node: object, name: string): AnyMethod {
  return (Object.getPrototypeOf(node) as Record<string, AnyMethod>)[name] as AnyMethod;
}

/** The node calls of the effect pass and the paint hooks. */
interface StylableNodeLike {
  getEffects(): { getFirstChild(): Node | null } | null;
}

/**
 * Paints a scene through proxies of its nodes: copies whose navigation
 * hands out proxies again and whose paint hooks write PDF where the
 * canvas can't express it (borders off center, shadows, text, nodes to
 * rasterize). The scene itself is never changed.
 */
export class PDFExportProxy {
  _context: PDFPaintContext;
  _doc: PDFDocument;
  _options: PDFExportOptions;
  _compatibilityProcessor: PDFCompatibilityProcessor;
  _nodesToRasterize: Node[] | null = null;

  constructor(
    context: PDFPaintContext,
    document: PDFDocument,
    options: PDFExportOptions,
    compatibilityProcessor: PDFCompatibilityProcessor,
  ) {
    this._context = context;
    this._doc = document;
    this._options = options;
    this._compatibilityProcessor = compatibilityProcessor;
  }

  _isNeedToRaster(node: Node): boolean {
    return (
      !!this._nodesToRasterize && this._nodesToRasterize.some((candidate) => candidate === node)
    );
  }

  _instanceof(node: unknown, type: unknown): boolean {
    const candidate = node as { hasMixin?(mixin: unknown): boolean };
    // Mixins are factories here; in the old code instanceof a mixin was
    // simply false, so only hasMixin counts for them.
    return (
      !!(candidate.hasMixin && candidate.hasMixin(type)) ||
      ("function" == typeof type &&
        "object" == typeof type.prototype &&
        node instanceof (type as new (...args: never[]) => unknown))
    );
  }

  proxy<T>(node: T): T {
    if (!node) return null as T;
    // The replaced methods need both the proxy (`this`) and the exporter.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const proxy = Object.create(Object.getPrototypeOf(node) as object) as ProxyNode;
    extend(proxy, node);
    proxy.__source__ = node as unknown as Node;
    if (this._instanceof(proxy, Node)) {
      const vectorable = this._compatibilityProcessor.isVectorable(node as unknown as Node);
      proxy._needToRaster = !vectorable;
    }
    const methods = proxy as unknown as Record<string, unknown>;
    if (proxy instanceof Workspace) {
      methods.getReference = function (this: ProxyNode, id: unknown) {
        return self.proxy(prototypeMethod(this, "getReference").call(this, id));
      };
      return proxy as T;
    }
    if (this._instanceof(proxy, Node)) {
      methods.getNext = function (this: ProxyNode) {
        return self.proxy(prototypeMethod(this, "getNext").call(this));
      };
      methods.getPrevious = function (this: ProxyNode) {
        return self.proxy(prototypeMethod(this, "getPrevious").call(this));
      };
    }
    if (this._instanceof(proxy, Shape)) {
      proxy._paintBorder = function (
        this: ProxyNode,
        context: PDFPaintContext,
        separate: unknown,
        layer: unknown,
      ) {
        context._borderPaintLayer = layer;
        prototypeMethod(this, "_paintBorder").call(this, context, separate, layer);
      };
      proxy._paintBorderSeparate = function (
        this: ProxyNode,
        context: PDFPaintContext,
        sharp: boolean,
        withMarkers: boolean,
        withOpacity: boolean,
        layer: BorderLayer,
      ) {
        new PDFBorderPainter(this as unknown as BorderShape).paint(
          context,
          sharp,
          withMarkers,
          withOpacity,
          layer,
        );
      };
      proxy._paintFill = function (
        this: ProxyNode,
        context: PDFPaintContext,
        sharp: unknown,
        layer: unknown,
      ) {
        context._fillPaintLayer = layer;
        prototypeMethod(this, "_paintFill").call(this, context, sharp, layer);
        delete (context as Partial<PDFPaintContext>)._fillPaintLayer;
      };
    }
    if (this._instanceof(proxy, Element)) {
      proxy._paintSharp = false;
      const ignoreEffects =
        this._options.configuration && this._options.configuration.ignoreEffects;
      proxy._paint = function (this: ProxyNode, context: PDFPaintContext) {
        context.beginNode(this.__source__);
        if (!(this._needToRaster || ignoreEffects)) dropShadows(context, this.__source__);
        if (!(this.__source__ instanceof Image && this._needToRaster && !ignoreEffects)) {
          prototypeMethod(this, "_paint").call(this, context);
        }
        if (!(this._needToRaster || ignoreEffects)) innerShadows(context, this.__source__);
      };
      proxy._finishPaint = function (this: ProxyNode, context: PDFPaintContext) {
        prototypeMethod(this, "_finishPaint").call(this, context);
        context.endNode(this.__source__);
        if (self._instanceof(this, Text)) (this.__source__ as Text)._runsDirty = true;
      };
    }
    if (this._instanceof(proxy, Node.Container)) {
      proxy.getFirstChild = function (this: ProxyNode) {
        return self.proxy(prototypeMethod(this, "getFirstChild").call(this));
      };
      proxy.getLastChild = function (this: ProxyNode) {
        return self.proxy(prototypeMethod(this, "getLastChild").call(this));
      };
    }
    if (this._instanceof(proxy, Graph)) {
      proxy.depthFirstSearch = function (
        this: ProxyNode,
        start: unknown,
        visit: unknown,
        from: unknown,
        reverse: unknown,
        visited: unknown,
      ) {
        (this.__source__ as unknown as { depthFirstSearch: AnyMethod }).depthFirstSearch(
          start,
          visit,
          self.proxy(from),
          reverse,
          visited,
        );
      };
    }
    if (this._instanceof(proxy, Anchor)) {
      // No null check: with the GAnchor default (null) the old proxy threw
      // a TypeError, and so does this one.
      proxy.getOutEdges = function (this: ProxyNode) {
        const edges = (this.__source__ as unknown as Anchor).getOutEdges() as unknown[];
        return edges.map((edge) => self.proxy(edge));
      };
      proxy.getInEdges = function (this: ProxyNode) {
        const edges = (this.__source__ as unknown as Anchor).getInEdges() as unknown[];
        return edges.map((edge) => self.proxy(edge));
      };
    }
    if (this._instanceof(proxy, Text)) {
      const text = proxy as unknown as Text;
      const layers = text.getPaintLayers() as unknown as {
        getFillLayers(visible: boolean): unknown[];
        getBorderLayers(visible: boolean): unknown[];
      };
      const fills = layers.getFillLayers(true);
      const borders = layers.getBorderLayers(true);
      if (
        fills.length > 1 ||
        borders.length > 1 ||
        text.getProperty("dir") ||
        (this._options && this._options.convertTextToPath)
      ) {
        proxy._paint = function (this: ProxyNode, context: PDFPaintContext) {
          context.beginNode(this.__source__);
          const shapes = (this as unknown as Text).getTextShapes();
          if (shapes) {
            for (const shape of shapes) {
              self.proxy(shape as unknown as Element).paint(context as never);
            }
          }
        };
      } else {
        text.setTLCore(new PDFTLCore(this._context, this._doc, proxy.__source__ as Text));
      }
    } else if (this._instanceof(proxy, PathsGraph)) {
      if (proxy._edges) proxy._edges = this.proxy(proxy._edges);
    } else if (this._instanceof(proxy, PGEdge)) {
      for (const key of Object.getOwnPropertyNames(proxy.__source__)) {
        Object.defineProperty(proxy, key, {
          configurable: true,
          set(this: ProxyNode, value: unknown) {
            (this.__source__ as unknown as Record<string, unknown>)[key] = value;
          },
          get(this: ProxyNode) {
            return (this.__source__ as unknown as Record<string, unknown>)[key];
          },
        });
      }
      proxy._paintBorder = function (
        this: ProxyNode,
        context: PDFPaintContext,
        transform: unknown,
        scene: unknown,
        _separate: unknown,
        layer: unknown,
      ) {
        context._borderPaintLayer = layer;
        context._patternBBox = (this._pathBase as { getPatternBBox(): Rect }).getPatternBBox();
        try {
          prototypeMethod(this, "_paintBorder").call(this, context, transform, scene, false, layer);
        } finally {
          delete (context as Partial<PDFPaintContext>)._borderPaintLayer;
          delete (context as Partial<PDFPaintContext>)._patternBBox;
        }
      };
    } else if (this._instanceof(proxy, Page)) {
      proxy._scene = this.proxy(proxy._scene);
    } else if (this._instanceof(proxy, Scene)) {
      proxy._workspace = this.proxy(proxy._workspace);
    }
    return proxy as T;
  }
}

/** Paints the visible drop shadows of a node before the node. */
function dropShadows(context: PDFPaintContext, node: Node): void {
  if (!node.hasMixin(Stylable)) return;
  const effects = (node as unknown as StylableNodeLike).getEffects();
  if (!effects) return;
  for (let effect = effects.getFirstChild(); null != effect; effect = effect.getNext()) {
    if (effect instanceof DropShadowEffect && effect.$vs) {
      new PDFDropShadowEffect().render(context, node as ShadowNode, effect as never);
    }
  }
}

/** Paints the visible inner shadows of a node after the node. */
function innerShadows(context: PDFPaintContext, node: Node): void {
  if (!node.hasMixin(Stylable)) return;
  const effects = (node as unknown as StylableNodeLike).getEffects();
  if (!effects) return;
  for (let effect = effects.getFirstChild(); null != effect; effect = effect.getNext()) {
    if (effect instanceof InnerShadowEffect && effect.$vs) {
      new PDFInnerShadowEffect().render(context, node as never, effect as never);
    }
  }
}

/** The node calls of the page export. */
interface ExportNode extends Node {
  _getBitmapPaintArea(): Rect | null;
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): void;
  setProperties(names: string[], values: unknown[]): void;
  paint(context: unknown): void;
  isVisible(): boolean;
  getPage(): Page;
  getPaintBBox(): Rect;
  accept(visitor: (node: Node) => unknown): unknown;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GPDFExport was a class of statics
export class PDFExport {
  /**
   * Whether every node the PDF would rasterize (images, nodes it can't
   * draw as vectors) fits the browser's canvas limits at `size`.
   */
  static isSupported(node: Node | Node[], withEffects: boolean, size: string): boolean {
    let supported = true;
    const visit = (visited: Node): boolean | undefined => {
      if (!ExportCompat.isCompatible(visited, withEffects) || visited instanceof Image) {
        const area = BitmapExport.getNodeSelfBitmapUsedArea(
          visited as unknown as BitmapExportNode,
          size,
        );
        const width = area.getWidth();
        const height = area.getHeight();
        const dots = width * height;
        if (
          width > Platform.absoluteMaxImgLinearDimension ||
          height > Platform.absoluteMaxImgLinearDimension ||
          dots > Platform.absoluteMaxImgAreaDots ||
          4 * dots > Platform.maxPngDataSize
        ) {
          supported = false;
          return true;
        }
      }
      return undefined;
    };
    if (Array.isArray(node)) node.some((item) => item.accept(visit as never));
    else node.accept(visit as never);
    return supported;
  }

  /**
   * Exports a scene (all its pages), a page, an element or a list of them
   * (one page each; a slice exports its page area with the slice's
   * background) and calls `callback` with the bytes once every raster
   * and encoding job is done. Returns the document (to abort it).
   */
  static export(
    element: Node | Node[],
    options: PDFExportOptions,
    callback: PDFExportCallback,
    writerClass?: (new () => PDFOutput) | null,
    dialog?: PDFExportDialog | null,
  ): PDFDocument | undefined {
    if (!callback) {
      console.error("No fnResult callback passed to GPDFExport.export.");
      return undefined;
    }
    let workers: PDFExportWorker[] | undefined;
    if (dialog && dialog.message) {
      dialog.message(Locale.get(new LocaleKey("GPDFExport", "text.wait")) as string);
    }
    if ("undefined" != typeof Worker && !options.disableWorker) {
      workers = [];
      const count =
        "undefined" != typeof navigator && navigator.hardwareConcurrency
          ? navigator.hardwareConcurrency
          : 4;
      for (let i = 0; i < count; i++) workers.push(createExportWorker());
    }
    let colorSpace = ColorSpaces.RGB as (typeof ColorSpaces)["RGB"] | undefined;
    if (options.colorSpace) {
      colorSpace = colorSpaceByName(options.colorSpace.toUpperCase()) as typeof colorSpace;
    }
    const document = new PDFDocument({
      version: 1.7,
      compress: true,
      colorSpace,
      workers,
      user: options.user,
      title: options.title,
      jpegQuality: options.jpegQuality,
      downsampleImages: options.downsampleImages,
    });
    const dpi = Math.max(Length.DPI, options.dpi || Length.DPI);
    const configuration = options.configuration || {
      ignoreEffects: false,
      forceEffectsWhenZoomed: true,
    };
    const progress = options.progress || null;
    const scale = dpi / Length.DPI;

    const fail = (error: unknown) => {
      document.finish();
      callback(error);
      if (error) console.error(error);
      const lastJob = document.getLastJob();
      if (lastJob) console.info("Last job", lastJob.toString());
    };

    /** One page of the PDF for a node, over `area` (its paint area by default). */
    const exportNode = (node: ExportNode, area: Rect | null, done: () => void) => {
      if (document.isAbort()) return;
      if (!(area || (area = node._getBitmapPaintArea()))) {
        done();
        return;
      }
      const page = document.newPage(area.getWidth(), area.getHeight());
      if (node instanceof Page && node.$bl) {
        // The page area includes the bleed, so the bleed box is the whole
        // page and the trim box the page inside it. The old code set the
        // trim area as the bleed box and no trim box (BUGS-FIXED.md
        // "BUG-089 PDF bleed box is written as x y width height").
        const bleed = node.$bl;
        page.setBleedBox(new Rect(0, 0, area.getWidth(), area.getHeight()));
        page.setTrimBox(
          new Rect(bleed, bleed, area.getWidth() - 2 * bleed, area.getHeight() - 2 * bleed),
        );
      }
      const width = Math.round(area.getWidth() * scale);
      const height = Math.round(area.getHeight() * scale);
      const context = new PDFPaintContext(new PDFCanvasContext(document));
      context.pdfConfiguration.sceneBackground =
        void 0 !== configuration.sceneBackground
          ? configuration.sceneBackground
          : context.pdfConfiguration.sceneBackground;
      context.canvas.resize(width, height);
      context.canvas.prepare();
      context.canvas.setOrigin(new Point(area.getX() * scale, area.getY() * scale));
      const canvasContext = context._context2d;
      const translation = (
        canvasContext.getTransform().decomposed() as NonNullable<
          ReturnType<Transform["decomposed"]>
        >
      ).translate
        .scaled(1 / scale, 1 / scale)
        .mapPoint(new Point(0, 0));
      const originTransform = Transform.deserialize(canvasContext.getTransform().getMatrix())
        .scaled(1 / scale, 1 / scale)
        .translated(-translation.getX(), -translation.getY())
        .scaled(scale, scale)
        .translated(translation.getX(), -translation.getY());
      document.setPageOrigin(originTransform.mapPoint(new Point(0, 0)));
      context._context2d.setPageOrigin(document.getPageOrigin());
      context.canvas.setScale(scale);
      if (options.backgroundColor) {
        context.canvas.fillCanvas(options.backgroundColor, options.backgroundOpacity);
      }
      const processor = new PDFCompatibilityProcessor(!configuration.ignoreEffects);
      processor.processNode(node);
      try {
        new PDFExportProxy(context, document, options, processor).proxy(node).paint(context);
      } finally {
        const finishPage = () => {
          context.canvas.finish();
          done();
        };
        if (processor.hasRasterizableNodes()) {
          let pageBitmap: ReturnType<typeof BitmapExport.export> | undefined;
          const job = document.beginJob("Raster effects");
          const nodes = processor.getRasterizableNodes() as ExportNode[];
          const rasterize = (index: number): void => {
            if (index >= nodes.length) {
              job.done();
              finishPage();
              return;
            }
            if (document.isAbort()) {
              // Cancelled while rasterizing: end the job and go on to the
              // end of the export, which calls back once without bytes, as
              // an abort between pages does. The old loop just returned and
              // the callback never came (BUGS-FIXED.md "BUG-088 Cancelling
              // a PDF export during rasterization never calls back").
              job.done();
              done();
              return;
            }
            const rasterized = nodes[index] as ExportNode;
            try {
              if (!rasterized.isVisible()) {
                rasterize(++index);
                return;
              }
              if (ExportCompat.isAffectedByBackground(rasterized)) {
                if (!pageBitmap) {
                  pageBitmap = BitmapExport.export(
                    rasterized.getPage() as unknown as BitmapExportNode,
                    dpi + "dpi",
                    null,
                    null,
                    null,
                    null,
                    true,
                  );
                }
                if (pageBitmap && pageBitmap.getWidth() && pageBitmap.getHeight()) {
                  const pageArea = BitmapExport.getBitmapPaintArea(
                    rasterized.getPage() as unknown as BitmapExportNode,
                    "1x",
                  );
                  const box = rasterized.getPaintBBox();
                  context.canvas
                    .getContext()
                    .replaceWithBitmap(pageBitmap.getHTMLElement(), rasterized, pageArea, box);
                }
                rasterize(++index);
              } else {
                new PDFRasterFallback()
                  .export(context, document, rasterized as never, dpi + "dpi")
                  .then(() => rasterize(++index))
                  .catch(fail);
              }
            } catch (error) {
              fail(error);
            }
          };
          rasterize(0);
        } else finishPage();
      }
    };

    let total = -1;
    const exportEach = (
      list: ExportNode[],
      exportOne: (node: ExportNode, done: () => void) => void,
      done: () => void,
    ) => {
      setTimeout(() => {
        if (list.length && !document.isAbort()) {
          exportOne(list.shift() as ExportNode, () => exportEach(list, exportOne, done));
        } else done();
      }, 1);
      if (total < 0) total = list.length;
      if (progress) progress(((total - list.length) / (total + 1)) * 100);
    };

    /** A slice exports its page over the slice area, with the slice's background. */
    const exportElement = (node: ExportNode, done: () => void) => {
      let background: unknown = null;
      let backgroundOpacity: unknown = null;
      let area: Rect | null = null;
      if (node instanceof Slice) {
        const slice = node as unknown as Slice & ExportNode;
        area = slice._getBitmapPaintArea();
        node = slice.findParent((parent) => parent instanceof Page) as unknown as ExportNode;
        background = node.getProperty("bck");
        backgroundOpacity = node.getProperty("bop");
        node.setProperty("bck", slice.$cls);
      }
      try {
        exportNode(node, area, done);
      } finally {
        if (background) node.setProperties(["bck", "bop"], [background, backgroundOpacity]);
      }
    };

    const exportPage = (node: ExportNode, done: () => void) => {
      exportNode(node, null, done);
    };

    const write = () => {
      document
        .ready()
        .then(() => {
          try {
            const output = writerClass ? new writerClass() : new PDFByteStream();
            document.write(output);
            callback(null, output.asArray() as Uint8ClampedArray<ArrayBuffer>, document);
          } catch (error) {
            fail(error);
          } finally {
            document.finish();
          }
        })
        .catch(fail);
    };

    Platform.scheduleFrame(() => {
      if (element instanceof Scene) {
        const pages: ExportNode[] = [];
        element.iteratePages((page) => {
          pages.push(page as unknown as ExportNode);
        }, true);
        exportEach(pages, exportPage, write);
      } else {
        const list = (Array.isArray(element) ? element : [element]) as ExportNode[];
        exportEach(list, exportElement, write);
      }
    });
    return document;
  }
}
