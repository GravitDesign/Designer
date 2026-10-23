// Old: chunk.vendor.js module 1444 (GPDFPaintContext).
import { registerClass } from "../../../engine/core/object.ts";
import type { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../../engine/paint/paint-context.ts";
import type { PaintConfiguration } from "../../../engine/paint/paint-configuration.ts";
import { ScenePaintConfiguration } from "../../../engine/paint/scene-paint-configuration.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Node } from "../../../engine/scene/node.ts";
import { PDFNodeMarker } from "./marked-content.ts";
import { PDFPaintCanvas } from "./pdf-canvas-bridge.ts";
import type { PDFCanvasContext } from "./pdf-canvas.ts";

/**
 * The paint configuration of the export: full paint, no annotations,
 * slices or outlines, no effect cache, page background on.
 */
export class PDFPaintConfiguration {
  paintMode!: string;
  ignoreEffects!: boolean;
  annotations!: boolean;
  enableFxCache!: boolean;
  defaultEffectDetailLevel!: number;
  sceneBackground!: boolean;
  multiPageView!: boolean;
  thumbnails!: boolean;
  isOutline!: () => boolean;
  isClipToPage!: () => boolean;
  isSlicesVisible!: () => boolean;

  constructor() {
    Object.assign(this, {
      paintMode: ScenePaintConfiguration.PaintMode.Full,
      ignoreEffects: true,
      annotations: false,
      enableFxCache: false,
      defaultEffectDetailLevel: 1,
      sceneBackground: true,
      multiPageView: false,
      thumbnails: false,
      isOutline: () => false,
      isClipToPage: () => false,
      isSlicesVisible: () => false,
    });
  }

  isAnnotationsVisible(): boolean {
    return !!this.annotations;
  }

  isElementAnnotationsVisible(): boolean {
    return !!this.annotations;
  }
}

/**
 * The paint context of the export. It keeps the nodes being painted, and
 * marks where each one starts and ends in the current graphics block
 * (rasterized nodes are swapped in there). The fill and border layer
 * being painted, and the pattern box of a paths graph border, are set
 * here by the export's node proxies.
 */
export class PDFPaintContext extends PaintContext {
  static {
    registerClass(this, "GPDFPaintContext");
  }

  _context2d: PDFCanvasContext;
  declare canvas: PDFPaintCanvas;
  declare _nodeStack: Node[];
  declare _fillPaintLayer: unknown;
  declare _borderPaintLayer: unknown;
  declare _patternBBox: Rect | undefined;

  constructor(context: PDFCanvasContext) {
    super();
    this._context2d = context;
    this.canvas = PDFPaintCanvas.create(this._context2d);
    this.configuration = new PDFPaintConfiguration() as unknown as PaintConfiguration;
    this._context2d.canvas = this.canvas;
    this.canvas._canvasContext = context as PDFPaintCanvas["_canvasContext"];
    this._nodeStack = [];
    this.canvasStack = [this.canvas as PaintCanvas];
    this.canvas._paintContext = this;
    this.outlineColors = [];
  }

  /** The export configuration with the fields the export sets. */
  get pdfConfiguration(): PDFPaintConfiguration {
    return this.configuration as unknown as PDFPaintConfiguration;
  }

  beginNode(node: Node): void {
    this._nodeStack.push(node);
    this.canvas.getGraphics().add(new PDFNodeMarker(node, PDFNodeMarker.Type.BEGIN));
  }

  endNode(node: Node): void {
    this._nodeStack.pop();
    this.canvas.getGraphics().add(new PDFNodeMarker(node, PDFNodeMarker.Type.END));
  }

  /** The node being painted, or a fresh node outside any. */
  getCurrentNode(): Node {
    return this._nodeStack.slice(-1).pop() || new Node();
  }

  override toString(): string {
    return "[Object GPDFPaintContext]";
  }
}

PDFPaintContext.prototype._nodeStack = null as unknown as Node[];
