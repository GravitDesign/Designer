// Old: chunk.vendor.js module 1404 (GEPSParser).
//
// The page side of an EPS/PS import (FMT-WORKER-008): the PostScript
// worker posts paint calls (workerAPI) and this builds the nodes in one
// group: paths (with clip groups), rectangles, images, gradients and
// meshes, and texts. "done" hands the group and the page background to
// the draw callback and reports the queued errors.
//
// Kept (old behaviour, see QUESTIONS.md / BUGS-FIXED.md):
// - show() without a font name calls getDefaultFont on the wrong object
//   and throws.
// - ImageData.data assignments of the old code did nothing; they are left
//   out.
//
// Fixed (BUG-008): the JPEG handler signalled the waiting worker with
// Atomics.wake, which browsers have removed (it threw, and the worker
// waited until its timeout); it told size requests by a byte view of
// length 2, which the 8-byte size area never has, so it wrote pixels
// where the size belonged. The request kind is now explicit and the
// handler calls Atomics.notify.
import { Color } from "../../../engine/color/color.ts";
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Vertex, VertexCommand } from "../../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import type { Rect } from "../../../engine/math/rect.ts";

/** The fields of a Rect the gradient code reads directly. */
interface RectFields {
  _x: number;
  _y: number;
  _width: number;
  _height: number;
}
import { Transform } from "../../../engine/math/transform.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import { sceneNode, type ImportPaintLayers, type SceneNodeLike } from "../scene-node.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image as GImage } from "../../../engine/scene/image.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";

import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { PropertySet, PropertySetInfo } from "../../../engine/style/stylable-sets.ts";
import { Font } from "../../../engine/text/fonts/font.ts";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { Text } from "../../../engine/text/text.ts";
import { JpegRequest, type JpegRequestKind } from "../../../workers/ps/jpeg.ts";

/** A color as the worker's _getGColor describes it. */
interface WorkerColor {
  type: string;
  value: number[];
  stops?: { color?: WorkerColor | null; opacity: number; position: number }[];
  transform?: number[];
  meshType?: number;
  width?: number;
  height?: number;
  colorSpace?: string;
}

/** A path segment the worker posts. */
interface WorkerSegment {
  type: string;
  coord: { x: number; y: number };
  coord1: { x: number; y: number };
  coord2: { x: number; y: number };
  coord3: { x: number; y: number };
  center: { x: number; y: number };
  radius: { x: number; y: number };
  angle1: number;
  angle2: number;
}

type WorkerPath = WorkerSegment[][];
type WorkerClipPath = WorkerPath & { clipPathId?: number };

type PaintNode = SceneNodeLike;

/** The paint layers of a node that has them. */
function layersOf(node: unknown): ImportPaintLayers {
  return sceneNode(node).getPaintLayers() as ImportPaintLayers;
}

export type EPSDrawCallback = (
  error: unknown,
  group: Group,
  size: null,
  background: unknown,
) => void;

export type EPSErrorCallback = (message: string) => void;

export class EPSParser {
  static ErrorCodes = {
    FailedColorUseBlue: "01",
    FailedElement: "02",
    Timeout: "03",
    General: "04",
    Canceled: "05",
  } as const;

  done = false;
  inputArray: Uint8Array;
  drawCallback: EPSDrawCallback;
  fontManager: FontManager;
  errorCallback: EPSErrorCallback | null | undefined;
  pointer = 0;
  worker: Worker | null = null;
  ggroup: Group = new Group();
  background: unknown = null;
  clipGPathes: SceneNodeLike[] = [];
  fontsCache: Record<string, Font | null> = {};
  _finished = false;
  _errorDone: Record<string, boolean> = {};
  _errorQueue: string[] | null = null;

  /** The handlers of the worker's calls, called with the parser as `this`. */
  workerAPI: Record<string, (this: EPSParser, ...args: never[]) => unknown>;

  constructor(
    input: Uint8Array,
    drawCallback: EPSDrawCallback,
    fontManager: FontManager,
    errorCallback?: EPSErrorCallback | null,
  ) {
    this.inputArray = input;
    this.drawCallback = drawCallback;
    this.fontManager = fontManager;
    this.errorCallback = errorCallback;
    this.workerAPI = {
      stroke: this.stroke,
      fill: this.fill,
      shfill: this.shfill,
      rectfill: this.rectfill,
      drawImage: this.drawImage,
      jpeg: this.jpeg,
      resolveFont: this.resolveFont,
      show: this.show,
      done: this.doneCall,
      error: this.error,
    } as EPSParser["workerAPI"];
  }

  appendItem(node: unknown, parent?: unknown): void {
    sceneNode(parent || this.ggroup).appendChild(sceneNode(node));
  }

  /** A Gravit color, gradient (relative to `node`'s box) or mesh image for a worker color. */
  getGColor(color: WorkerColor | null | undefined, node?: SceneNodeLike | null): unknown {
    if (!color) return new RGBColor();
    if (color.type == "rgb") return new RGBColor(color.value);
    if (color.type == "cmyk") return new CMYKColor(color.value.map((v) => v / 255));
    if ((color.type == "linear" || color.type == "radial") && node) {
      const stops = (color.stops as NonNullable<WorkerColor["stops"]>).map((stop) => {
        let stopColor = RGBColor.WHITE;
        if (!stop.color)
          return { opacity: stop.opacity, color: stopColor, position: stop.position };
        if (stop.color.type == "rgb") stopColor = new RGBColor(stop.color.value);
        else if (stop.color.type == "cmyk") {
          const rgb = Color.cmykToRGB(stop.color.value.map((v) => v / 255));
          stopColor = new RGBColor(rgb);
        }
        return { opacity: stop.opacity, color: stopColor, position: stop.position };
      });
      const box = node.getGeometryBBox() as unknown as RectFields;
      if (!box) return new RGBColor();
      let transform: Transform | null = null;
      if (color.transform && (transform = Transform.deserialize(color.transform))) {
        const native = Transform.getNativeRectTransformation(box as unknown as Rect);
        if (native && native.invertible())
          transform = transform.multiplied(native.inverted() as Transform);
      }
      type Stops = ConstructorParameters<typeof LinearGradient>[0];
      const gradientStops = stops as unknown as Stops;
      const coords = color.value;
      const x1 = coords[0] as number;
      const y1 = coords[1] as number;
      const x2 = coords[2] as number;
      const y2 = coords[3] as number;
      if (color.type == "linear") {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const length = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
        let scale = length;
        let fx = x1;
        let fy = y1;
        if (!transform) {
          fx = box._width ? (x1 - box._x) / box._width : 1;
          fy = box._height ? (y1 - box._y) / box._height : 1;
          const diagonal = Math.sqrt(box._width * box._width + box._height * box._height);
          const cos = Math.cos(angle);
          let span = cos ? box._width / cos : box._width;
          if (span > 1.2 * diagonal) {
            const sin = Math.sin(angle);
            span = sin ? box._height / sin : box._height;
          }
          if (span) scale = Math.abs(length / span);
        }
        return new LinearGradient(gradientStops, scale, angle, fx, fy, transform);
      }
      let fx = x1;
      let fy = y1;
      let cx = x2;
      let cy = y2;
      if (!transform) {
        fx = box._width ? (x1 - box._x) / box._width : x1 - box._x;
        fy = box._height ? (y1 - box._y) / box._height : y1 - box._y;
        cx = box._width ? (x2 - box._x) / box._width : x2 - box._x;
        cy = box._height ? (y2 - box._y) / box._height : y2 - box._y;
      }
      const radius = coords[5] as number;
      if (transform) return new RadialGradient(gradientStops, radius, fx, fy, cx, cy, transform);
      const ratio = box._height && box._width ? box._width / box._height : 1;
      return new RadialGradient(
        gradientStops,
        radius,
        fx,
        fy / ratio,
        cx,
        cy / ratio,
        new Transform().scaled(1, ratio),
      );
    }
    if (color.type == "imageData" && (color.meshType == 7 || color.meshType == 6)) {
      const width = color.width as number;
      const height = color.height as number;
      if (width && height) {
        const image = this.makeImage(width, height, color.value, color.colorSpace == "DeviceCMYK");
        let transform: Transform | undefined;
        if (color.transform) transform = Transform.deserialize(color.transform);
        // Sic: the image gets only the mesh's own transform (or none).
        image.setTransform(transform as Transform);
        return image;
      }
    }
    return null;
  }

  /** An image node from RGBA (or CMYK + 255) pixels. */
  makeImage(width: number, height: number, pixels: number[], cmyk: boolean): GImage {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    const imageData = context.createImageData(width, height);
    const data = pixels;
    if (cmyk) {
      for (let i = 0; i + 3 < data.length; i += 4) {
        const rgb = Color.cmykToRGB([
          (data[i] as number) / 255,
          (data[i + 1] as number) / 255,
          (data[i + 2] as number) / 255,
          (data[i + 3] as number) / 255,
        ]);
        data[i] = rgb[0] as number;
        data[i + 1] = rgb[1] as number;
        data[i + 2] = rgb[2] as number;
        data[i + 3] = 255;
      }
    }
    if (data && imageData.data.length == data.length)
      for (let i = 0; i < data.length; ++i) imageData.data[i] = data[i] as number;
    context.putImageData(imageData, 0, 0);
    const image = new GImage();
    image.setProperties(["url", "iw", "ih"], [canvas.toDataURL(), width, height]);
    return image;
  }

  /** Nests the clip paths (each inside the previous) and returns the innermost, or the group. */
  getClipPath(clipPaths: WorkerClipPath[]): SceneNodeLike {
    this.clipGPathes = [];
    for (let i = 0; i < clipPaths.length; i++) {
      const clip = clipPaths[i] as WorkerClipPath;
      const path = this.path2GPath(clip) as (PaintNode & { clipPathId?: number }) | null;
      if (path) {
        path.clipPathId = clip.clipPathId;
        if (i > 0) this.appendItem(path, this.clipGPathes[i - 1]);
        else this.appendItem(path);
        this.clipGPathes[i] = path;
      }
    }
    return this.clipGPathes.length
      ? (this.clipGPathes[this.clipGPathes.length - 1] as SceneNodeLike)
      : sceneNode(this.ggroup);
  }

  /** A path (or compound path) from the worker's subpaths; arcs come from an ellipse's vertices. */
  path2GPath(path: WorkerPath): PaintNode | null {
    const vertices = new VertexContainer(null);
    for (let i = 0; i < path.length; i++) {
      const subpath = path[i] as WorkerSegment[];
      for (let n = 0; n < subpath.length; n++) {
        const segment = subpath[n] as WorkerSegment;
        if (segment.type == "curveto") {
          vertices.addVertex(VertexCommand.Curve2, segment.coord3.x, segment.coord3.y);
          vertices.addVertex(VertexCommand.Curve2, segment.coord1.x, segment.coord1.y);
          vertices.addVertex(VertexCommand.Curve2, segment.coord2.x, segment.coord2.y);
        } else if (segment.type == "lineto") {
          vertices.addVertex(VertexCommand.Line, segment.coord.x, segment.coord.y);
        } else if (segment.type == "closepath") {
          vertices.addVertex(VertexCommand.Close, segment.coord.x, segment.coord.y);
        } else if (segment.type == "moveto") {
          vertices.addVertex(VertexCommand.Move, segment.coord.x, segment.coord.y);
        } else if (segment.type == "arc" || segment.type == "arcn") {
          const transform = new Transform()
            .scaled(segment.radius.x, segment.radius.y)
            .translated(segment.center.x, segment.center.y);
          const startAngle = segment.type == "arc" ? segment.angle1 : segment.angle2;
          const endAngle = segment.type == "arc" ? segment.angle2 : segment.angle1;
          let ellipse: Ellipse = new Ellipse();
          ellipse.setProperties(
            ["sa", "ea", "etp", "trf"],
            [
              (startAngle + 2 * Math.PI) % (2 * Math.PI),
              (endAngle + 2 * Math.PI) % (2 * Math.PI),
              Ellipse.Type.Arc,
              transform,
            ],
          );
          // arcn draws the arc the other way round.
          if (segment.type == "arcn")
            ellipse = VertexContainer.clone(ellipse, true) as unknown as Ellipse;
          const vertex = new Vertex();
          const source = ellipse as unknown as {
            rewindVertices(index: number): boolean;
            hasVertexForRead(vertex: Vertex): boolean;
            readVertex(vertex: Vertex): boolean;
          };
          source.rewindVertices(0);
          if (source.hasVertexForRead(vertex))
            while (source.readVertex(vertex))
              vertices.addVertex(vertex.command, vertex.x, vertex.y);
        }
      }
    }
    return PathUtil.createPathFromVertexSource(vertices) as PaintNode | null;
  }

  ready(): boolean {
    return this._finished;
  }

  stroke(
    path: WorkerPath,
    color: WorkerColor,
    width: number,
    clipPaths: WorkerClipPath[] | null,
    lineCap: number,
    lineJoin: number,
    strokeAdjustment: unknown,
    miterLimit: number,
    dash: { arr: number[] } | null,
  ): boolean | undefined {
    void strokeAdjustment;
    const node = this.path2GPath(path);
    if (!node) return undefined;
    const layer = new BorderPaintLayer();
    let cap: string = PaintCanvas.LineCap.Butt;
    if (lineCap == 1) cap = PaintCanvas.LineCap.Round;
    else if (lineCap == 2) cap = PaintCanvas.LineCap.Square;
    let join: string = PaintCanvas.LineJoin.Miter;
    if (lineJoin == 1) join = PaintCanvas.LineJoin.Bevel;
    else if (lineJoin == 2) join = PaintCanvas.LineJoin.Round;
    let dashes: number[] | null = null;
    if (dash && dash.arr.length) dashes = dash.arr;
    const miter = miterLimit || 3;
    layer.setProperties(
      ["_pt", "op", "_bw", "_blc", "_blj", "_bds", "_bml"],
      [this.getGColor(color, node), 1, width, cap, join, dashes, miter],
    );
    layersOf(node).appendChild(layer);
    if (clipPaths && clipPaths.length > 0) this.appendItem(node, this.getClipPath(clipPaths));
    else this.appendItem(node);
    return true;
  }

  /** A fill with no path and no clip sets the page background. */
  fill(
    path: WorkerPath,
    color: WorkerColor,
    clipPaths: WorkerClipPath[],
    evenOdd: boolean,
  ): boolean {
    if (
      path.length == 0 &&
      (clipPaths.length == 0 || (clipPaths.length == 1 && (clipPaths[0] as WorkerPath).length == 0))
    ) {
      // Sic: the old code passed the path node here before it existed.
      const background = this.getGColor(color, undefined);
      if (background) {
        this.background = background;
        return true;
      }
    }
    const node = this.path2GPath(path);
    if (!node) return false;
    const layer = new FillPaintLayer();
    layer.setProperties(["_pt"], [this.getGColor(color, node)]);
    layersOf(node).appendChild(layer);
    node.setProperties(["evenodd"], [!!evenOdd]);
    if (clipPaths && clipPaths.length > 0) this.appendItem(node, this.getClipPath(clipPaths));
    else this.appendItem(node);
    return true;
  }

  /** A shading fills its clip: a mesh image goes inside, a gradient becomes the clip's fill. */
  shfill(shading: WorkerColor, clipPaths: WorkerClipPath[]): void {
    if (clipPaths && clipPaths.length > 0) {
      const clip = this.getClipPath(clipPaths);
      const color = this.getGColor(shading, clip);
      if (color instanceof GImage) this.appendItem(color, clip);
      else if (clip != sceneNode(this.ggroup)) {
        const layer = new FillPaintLayer();
        layer.setProperties(["_pt"], [color]);
        layersOf(clip).appendChild(layer);
      } else if (color) this.background = color;
    }
  }

  rectfill(x: number, y: number, width: number, height: number, color: WorkerColor): boolean {
    const rectangle = new Rectangle(x, y, width, height);
    const pattern = this.getGColor(color, sceneNode(rectangle));
    const layer = new FillPaintLayer();
    layer.setProperties(["_pt"], [pattern]);
    layersOf(rectangle).appendChild(layer);
    this.appendItem(rectangle);
    return true;
  }

  drawImage(
    width: number,
    height: number,
    pixels: ArrayLike<number>,
    imageMatrix: number[],
    ctm: number[],
    clipPaths: WorkerClipPath[] | null,
    cmyk: boolean,
  ): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    const imageData = context.createImageData(width, height);
    let data: ArrayLike<number> = pixels;
    if (cmyk) {
      const rgba: number[] = new Array(Math.round((pixels.length / 5) * 4));
      for (let p = 0, u = 0; p + 4 < pixels.length; p += 5, u += 4) {
        const rgb = Color.cmykToRGB([
          (pixels[p] as number) / 255,
          (pixels[p + 1] as number) / 255,
          (pixels[p + 2] as number) / 255,
          (pixels[p + 3] as number) / 255,
        ]);
        rgba[u] = rgb[0] as number;
        rgba[u + 1] = rgb[1] as number;
        rgba[u + 2] = rgb[2] as number;
        rgba[u + 3] = pixels[p + 4] as number;
      }
      data = rgba;
    }
    if (data && imageData.data.length == data.length)
      for (let p = 0; p < data.length; ++p) imageData.data[p] = data[p] as number;
    context.putImageData(imageData, 0, 0);
    const image = new GImage();
    image.setProperties(["url", "iw", "ih"], [canvas.toDataURL(), width, height]);
    const m = imageMatrix;
    const c = ctm;
    const transform = (
      new Transform(
        m[0] as number,
        m[1] as number,
        m[2] as number,
        m[3] as number,
        m[4] as number,
        m[5] as number,
      ).inverted() as Transform
    ).multiplied(
      new Transform(
        c[0] as number,
        c[1] as number,
        c[2] as number,
        c[3] as number,
        c[4] as number,
        c[5] as number,
      ),
    );
    image.setTransform(transform);
    if (clipPaths && clipPaths.length > 0) this.appendItem(image, this.getClipPath(clipPaths));
    else this.appendItem(image);
    return true;
  }

  /**
   * Decodes a JPEG data URL for the blocked worker and answers its
   * request through the shared buffer (see workers/ps/jpeg.ts): the size,
   * or the RGBA pixels. Every outcome, a decode error included, stores
   * the flag and notifies the worker, so it never waits for its timeout.
   */
  jpeg(
    dataUrl: string,
    kind: JpegRequestKind,
    flags: Int32Array,
    view: Uint8Array,
  ): boolean | undefined {
    if (!(view && view.length && flags && flags.length)) return false;
    const answer = (width: number, height: number, rgba: Uint8ClampedArray | null) => {
      if (kind == JpegRequest.Size) {
        const size = new Int32Array(view.buffer, view.byteOffset, 2);
        Atomics.store(size, 0, width);
        Atomics.store(size, 1, height);
      } else {
        view.fill(0);
        if (rgba) view.set(rgba.length > view.length ? rgba.subarray(0, view.length) : rgba);
      }
      Atomics.store(flags, 0, 1);
      Atomics.notify(flags, 0);
    };
    const image = new Image();
    image.onload = () => {
      let rgba: Uint8ClampedArray | null = null;
      try {
        if (image.width && image.height) {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d") as CanvasRenderingContext2D;
          context.drawImage(image, 0, 0);
          rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
        }
      } catch {
        rgba = null;
      }
      if (rgba && rgba.length) answer(image.width, image.height, rgba);
      else answer(0, 0, null);
    };
    image.onerror = () => answer(0, 0, null);
    image.src = dataUrl;
    return undefined;
  }

  resolveFont(name: string): boolean {
    if (!this.fontsCache[name]) {
      let font: Font | null = this.fontManager.getFont(
        name,
        Font.Style.Normal,
        Font.Weight.Regular,
      );
      if (!font) {
        const fallback = this.fontManager.getDefaultFont();
        if (fallback)
          font = OpenTypeFont.create(
            name,
            Font.Style.Normal,
            Font.Weight.Regular,
            (fallback as OpenTypeFont)._buffer as ArrayBuffer,
          );
      }
      this.fontsCache[name] = font;
    }
    return true;
  }

  /** A text at the PostScript position, moved up by the default font's ascent. */
  show(
    text: string,
    fontName: string | null,
    fontSize: number,
    color: WorkerColor,
    position: { x: number; y: number },
    paintType: number,
    _unused1: unknown,
    _unused2: unknown,
    _unused3: unknown,
    _unused4: unknown,
    strokeWidth?: number,
    lineCap?: number,
    lineJoin?: number,
    strokeAdjustment?: unknown,
    miterLimit?: number,
    dash?: { arr: number[] } | null,
  ): boolean {
    void strokeAdjustment;
    const fill = this.getGColor(color);
    const texts = [new Text()];
    const family = fontName;
    let size = fontSize;
    for (const node of texts) {
      const layer = paintType == 2 ? new BorderPaintLayer() : new FillPaintLayer();
      layer.setProperties(["_pt"], [fill]);
      if (paintType == 2) {
        let cap: string = PaintCanvas.LineCap.Butt;
        if (lineCap == 1) cap = PaintCanvas.LineCap.Round;
        else if (lineCap == 2) cap = PaintCanvas.LineCap.Square;
        let join: string = PaintCanvas.LineJoin.Miter;
        if (lineJoin == 1) join = PaintCanvas.LineJoin.Bevel;
        else if (lineJoin == 2) join = PaintCanvas.LineJoin.Round;
        let dashes: number[] | null = null;
        if (dash && dash.arr.length) dashes = dash.arr;
        const miter = miterLimit || 3;
        layer.setProperties(
          ["_bw", "_blc", "_blj", "_bds", "_bml"],
          [strokeWidth, cap, join, dashes, miter],
        );
      }
      layersOf(node).appendChild(layer);
      if (!family) {
        // Sic: the old code asked webpack's require function for the default font.
        throw new TypeError("i.getDefaultFont is not a function");
      }
      const defaults = (
        PropertySetInfo[PropertySet.Text] as { geometryProperties: Record<string, unknown> }
      ).geometryProperties;
      size = size || (defaults._tfi as number);
      node.setProperties(
        ["_tfs", "_tff", "_tfw", "_fc", "_tfi", "_aw", "_ah"],
        [Font.Style.Normal, family, Font.Weight.Regular, fill, size, true, true],
      );
      node.setText(text);
      const defaultFont = this.fontManager.getDefaultFont() as OpenTypeFont | null;
      let ascent = size;
      if (
        defaultFont &&
        defaultFont._openTypeFont &&
        defaultFont._openTypeFont.ascender &&
        defaultFont._openTypeFont.unitsPerEm
      )
        ascent = (defaultFont._openTypeFont.ascender / defaultFont._openTypeFont.unitsPerEm) * size;
      node.transformSourceBBox(new Transform(1, 0, 0, 1, position.x, position.y - ascent));
      this.appendItem(node);
    }
    return true;
  }

  /** Hands over the group and reports the errors queued so far (once). */
  doneCall(): boolean {
    if (!this._finished) {
      this.drawCallback(0, this.ggroup, null, this.background);
      if (this.errorCallback && this._errorQueue)
        for (let i = 0; i < this._errorQueue.length; ++i)
          this.errorCallback(this._errorQueue[i] as string);
      this._errorQueue = null;
      this._finished = true;
    }
    return true;
  }

  /** Queues the localized message of an error code, once per code. */
  error(code: string): void {
    if (this.errorCallback && code && !this._errorDone[code]) {
      this._errorQueue = this._errorQueue ? this._errorQueue : [];
      this._errorQueue.push(Locale.get(new LocaleKey("GEPSParser", code)) as string);
      this._errorDone[code] = true;
    }
  }
}
