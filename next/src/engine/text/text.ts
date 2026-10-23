// Old: chunk.vendor.js module 70 (GText).
/**
 * The text element. The text itself lives in a GTL core (TLCore): the
 * runs, line breaking, lists and glyph outlines. GText keeps the element
 * side: the box (`w`/`h` with automatic width and height, `aw`/`ah`),
 * vertical alignment in a fixed box, text on a path (`atPath` and the
 * `tpth*` parameters), the writing direction, and the text style
 * properties (`_tff`, `_tfi`, ...), which it maps onto the runs.
 *
 * Fonts load asynchronously. Until every font a text uses is resolved the
 * text waits (`_fontsToResolve`) and re-lays itself out when the font
 * manager reports them. A text whose fonts are missing or embedded can
 * show backup outlines instead ("fake text", `_bkpPath`); with
 * `GText.dontStorePaths` (the default) those outlines are never saved.
 *
 * `content` is the runs as a JSON string inside the blob (JSON in JSON);
 * the blob also keeps the runs as `ct`. Old documents stored text as a
 * tree of `txContent`/`txPara`/`txChr`/`txBrk` nodes with corner
 * coordinates (`tlx`, `trx`, ...); restoring such a blob converts it.
 *
 * Importing this file registers GStylable with the GTL core
 * (TLCore.initialize reads the text style defaults from it).
 */
import { CMYKColor } from "../color/cmyk-color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Locale } from "../core/locale/locale.ts";
import { System } from "../core/system.ts";
import { each, equals, extend, replaceMicrosoftLineFeed, unique, uuid } from "../core/util.ts";
import { PathUtil } from "../geometry/path-util.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import type { VertexReader } from "../geometry/vertex-source.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import { Vertex } from "../geometry/vertex.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Background } from "../style/background.ts";
import type { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { Gradient } from "../style/gradient.ts";
import type { PaintLayer } from "../style/paint-layer.ts";
import type { PaintLayers } from "../style/paint-layers.ts";
import { Pattern } from "../style/pattern.ts";
import { Stylable } from "../style/stylable.ts";
import { TexturePattern } from "../style/texture-pattern.ts";
import { Anchor } from "../scene/element-anchor.ts";
import { ElementChange } from "../scene/element-change.ts";
import { Element } from "../scene/element.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Reference } from "../scene/node-identity.ts";
import type { PropertiesChangeArgs } from "../scene/node-properties.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "../scene/node.ts";
import { PathBase } from "../scene/path-base.ts";
import { Path } from "../scene/path.ts";
import { SceneNodeChange, type SceneHooks } from "../scene/scene-node.ts";
import { Shape, type ShapePaint, type ShapePaintContext } from "../scene/shape.ts";
import { FontEntry } from "./fonts/font-entry.ts";
import { FontManager, type FontAvailableEvent } from "./fonts/font-manager.ts";
import { Font, type FontStyle } from "./fonts/font.ts";
import { Formatting, type Run } from "./gtl/formatting.ts";
import { registerStylable } from "./gtl/late-bound.ts";
import type { TLRange } from "./gtl/range.ts";
import { RenderFlags } from "./gtl/render-flags.ts";
import { TLCore, type TLRenderStyle } from "./gtl/tl-core.ts";
import { TLDirectionTextTransformer } from "./tl-direction-text-transformer.ts";
import { TLPathTextTransformer, type TextBasePath } from "./tl-path-text-transformer.ts";

// The GTL core reads the text style defaults from GStylable, which it
// can't import itself (engine-style is a later cluster than the core).
registerStylable(Stylable);

type Dict = Record<string, unknown>;

/** What a text needs from its workspace beyond NodeWorkspace. */
export interface TextWorkspace extends NodeWorkspace {
  getFontManager(): FontManager;
}

/** What a text needs from its scene. */
interface TextScene extends SceneHooks {
  addDestroyable(destroyable: unknown): void;
  /** Set on scenes loaded from files older than 3.1 (text heights were measured differently). */
  _pre310?: boolean;
}

/** A setter that waits for fonts (setProperties with font properties). */
interface DeferredRangeSetter {
  func: (vars: DeferredRangeVars, replacement?: Font | Record<string, string>) => boolean;
  vars: DeferredRangeVars;
}

interface DeferredRangeVars {
  fontFamily: unknown;
  fontStyle: unknown;
  fontWeight: unknown;
  content: unknown;
}

/** Properties set before the GTL core could be initialized. */
interface PendingProperties {
  props: string[];
  values: unknown[];
  // The old code stored the flag as `rng` but read it as `toRange` (always undefined); kept.
  rng?: unknown;
  toRange?: unknown;
}

/** One styled outline run from TLCore.renderVerticesWithStyle. */
interface StyledVertices {
  fill?: unknown;
  stroke?: unknown;
  textFill?: unknown;
  textStroke?: unknown;
  vertices: (VertexContainer & VertexReader) | VertexReader | null;
}

/** A backup outline: a path made from the glyphs (fake text). */
type BackupPath = Shape;

const VerticalAlign = {
  Top: "t",
  Middle: "m",
  Bottom: "b",
} as const;

const Markers = {
  Bullet: "Bullet",
  Check: "Check",
  Square: "Square",
  Number: "Number",
  RomanBracket: "RomanBracket",
  RomanDot: "RomanDot",
} as const;

const GeometryProperties = {
  aw: true,
  ah: true,
  afs: false,
  va: VerticalAlign.Top,
  ttrf: null,
  head: 0,
  content: null,
  w: 1,
  h: 1,
  tpthd: TLPathTextTransformer.TransformerParams.direction,
  tptho: TLPathTextTransformer.TransformerParams.offset,
  tpths: TLPathTextTransformer.TransformerParams.side,
  tpthl: TLPathTextTransformer.TransformerParams.distance,
  atPath: null,
  dir: TLDirectionTextTransformer.LTR,
};

/** Text style property → GTL run property. */
const PropertyMapping: Record<string, string> = {
  _tff: "fontFamily",
  _tfw: "fontWeight",
  _tfs: "fontStyle",
  _plh: "lineSpacing",
  _pas: "paragraphSpacing",
  _pai: "paragraphIndent",
  _pal: "align",
  _tws: "wordSpacing",
  _tcs: "charSpacing",
  _ttsc: "script",
  _ttrf: "transformation",
  _tdu: "underline",
  _tds: "strikeout",
  _tlig: "ligatures",
  _tfrac: "fractions",
  _tstyls: "stylisticSet",
  _tlocl: "localizedForm",
  _fc: "fontColor",
  _tfi: "fontSize",
  _tlsc: "langScript",
  _tv: "variant",
};

const VisualProperties = {};

const MetaProperties = {
  _we: false,
  _bkpPath: null,
  sc: false,
  _ed: true,
};

const GEOMETRY_UPDATE = [ElementChange.PrepareGeometryUpdate, ElementChange.FinishGeometryUpdate];

const ParagraphAlignment = Stylable.ParagraphAlignment;
const TextTransformation = Stylable.TextTransformation;
const BorderAlignment = Stylable.BorderAlignment;

/** `JSON.stringify` replacer for the runs: colors as pattern strings. */
function serializeContent(key: string, value: unknown): unknown {
  return "fontColor" === key && value instanceof Pattern ? Pattern.serialize(value) : value;
}

/** `JSON.parse` reviver for the runs: colors back to patterns. */
function deserializeContent(key: string, value: unknown): unknown {
  if ("fontColor" === key) {
    if ("transparent" === value) return RGBColor.BLACK;
    if ("string" == typeof value) return Pattern.deserialize(value) || value;
    if ("object" == typeof value) {
      const values = (value as { _value: number[] })._value;
      return 3 === values.length ? new RGBColor(values) : new CMYKColor(values);
    }
  }
  return value;
}

function parseContent(json: string): unknown {
  return JSON.parse(json, deserializeContent) as unknown;
}

function stringifyContent(content: unknown): string {
  return JSON.stringify(content, serializeContent);
}

/** A copy of a path (the attached path) as a GPath or a GPathBase with the same anchors. */
function copyPath(source: PathBase): PathBase {
  const anchors = source.cloneAnchorPoints();
  const copy =
    source instanceof Path || source.getProperty("closed")
      ? new Path(
          source.getProperty("closed") as boolean,
          source.getProperty("evenodd") as boolean,
          anchors,
        )
      : new PathBase(source.getProperty("evenodd") as boolean, anchors);
  if (copy) copy.assignFrom(source);
  return copy;
}

/** `new Transform(...matrix)`. */
function transformOf(matrix: number[]): Transform {
  return new Transform(...(matrix as [number, number, number, number, number, number]));
}

/** Whether the code runs under node (the old code checked `process.release.name`). */
function isNode(): boolean {
  const process = (globalThis as { process?: { release?: { name?: string } } }).process;
  return void 0 !== process && !!process.release && "node" === process.release.name;
}

const TextBase = Reference(Shape);

export class Text extends TextBase {
  static {
    registerNodeClass(this, "text", "GText");
  }

  static MAXLENGTH = 8192;
  static VMARGIN = 0;
  static HMARGIN = 1;
  /** The placeholder font a text waits for while the font manager has no default font. */
  static DEFAULTFONT: Font = new FontEntry(
    "gravit",
    "is" as FontStyle,
    "thebest" as unknown as number,
  );
  /** Don't save the glyph outlines (`_bkpPath`) with the text. */
  static dontStorePaths = true;
  static HITTEST_TEXT = false;
  static HITTEST_BOX = true;
  static VerticalAlign = VerticalAlign;
  static Markers = Markers;
  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static PropertyMapping = PropertyMapping;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static _serializeContent = serializeContent;
  static _deserializeContent = deserializeContent;

  declare $aw: boolean;
  declare $ah: boolean;
  declare $afs: boolean;
  declare $va: string;
  declare $ttrf: Transform | null;
  declare $head: number;
  declare $content: string | null;
  declare $w: number;
  declare $h: number;
  declare $tpthd: number;
  declare $tptho: number;
  declare $tpths: number;
  declare $tpthl: number;
  declare $atPath: string | null;
  declare $dir: number;
  declare $_we: boolean;
  declare $_bkpPath: unknown;
  declare $sc: boolean;
  declare $_ed: boolean;
  declare $_tff: unknown;
  declare $_tfs: unknown;

  /** The text set before the core could be initialized. */
  declare _tempText: unknown;
  /** The first text set (as JSON when the core took it). */
  declare _startText: unknown;
  declare _setTextWhenAvailable: boolean;
  declare _lastResolutionFill: number;
  declare _lastResolutionBorder: number;
  declare _attachedPath: PathBase | null;
  declare _pendingAttachedPath: PathBase | null;
  /** The path attachPath is attaching (while it sets `atPath`). */
  declare _atPath: PathBase | null | undefined;
  /** `trf` before the text was put on a path, restored when it comes off. */
  declare _oldTrf: Transform | null;
  declare _lastFillPaintLayer: PaintLayer | null;
  declare _lastBorderPaintLayer: BorderPaintLayer | null;
  declare _legacyHeight: boolean;
  declare _repairedHeight: boolean;
  declare _addedDestroyable: boolean;
  declare _lastActualBounds: { b: number } | null;
  declare _hasStyleBorderPadding: boolean;
  declare _fontsToResolve: (Font | null)[] | null;
  declare _deferredRangeSetters: DeferredRangeSetter[] | null;
  declare _waitForWorkspace: boolean;
  declare _deferredRestore: unknown;
  declare _pendingProperties: PendingProperties[] | null;
  declare _hasFontManagerListener: boolean;
  declare _verticalShift: number;
  declare _runs: unknown[] | null;
  declare _runsDirty: boolean;
  declare _verticesDirty: boolean;
  declare _tlCore: TLCore | null;
  declare _resolution: number;
  declare _vertexContainer: VertexContainer;
  declare _isVirgin: boolean;
  declare _vertexIterator: number;
  declare _hasEmbeddedFonts: boolean;
  declare _isEdited: boolean;
  declare _contentChangedHandler: {
    handler: (param: unknown) => unknown;
    removeSub: boolean | undefined;
  } | null;
  declare deferredLoadHandler: (() => void) | null;
  declare _serializedBackupPaths: unknown;
  declare __deserializedBackupPaths: BackupPath[] | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this._setDefaultProperties(MetaProperties);
    this._runs = [];
    this._runsDirty = false;
    this.$w = 142;
    this.$h = 27.236;
    this._vertexContainer = new VertexContainer();
  }

  /**
   * The backup outlines, parsed from `_bkpPath` on first use. Parse errors
   * are swallowed (the old getter returned from `finally`).
   */
  get _deserializedBackupPaths(): BackupPath[] | null {
    if (this.__deserializedBackupPaths) return this.__deserializedBackupPaths;
    if (this._serializedBackupPaths) {
      const serialized = this._serializedBackupPaths;
      try {
        const list = (
          "string" == typeof serialized ? JSON.parse(serialized) : serialized
        ) as unknown[];
        this.__deserializedBackupPaths = list.map((entry) =>
          "string" == typeof entry
            ? (Node.deserialize(entry) as unknown as BackupPath)
            : (Node.restore(entry as never) as unknown as BackupPath),
        );
      } catch {
        // Swallowed like the old getter did.
      }
      return this.__deserializedBackupPaths;
    }
    return null;
  }

  set _deserializedBackupPaths(paths: BackupPath[] | null) {
    this._serializedBackupPaths = "dummy";
    this.__deserializedBackupPaths = paths;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GText", "name", this.getNodeName()) as string;
  }

  _fontManager(): FontManager {
    return (this._workspace as TextWorkspace).getFontManager();
  }

  /** The backup outlines of a fake text (only called when isFakeText()). */
  _backupPaths(): BackupPath[] {
    return this._deserializedBackupPaths as BackupPath[];
  }

  /** The runs (or the text waiting for the core). */
  getContent(): unknown {
    const core = this.getTLCore();
    return !core || this._tempText ? this._tempText : core.getRichContent();
  }

  /** Sets the core's content change handler, or keeps it until the core exists. */
  contentChangedHandler(handler: (param: unknown) => unknown, removeSub?: boolean): void {
    const core = this.getTLCore();
    if (core) {
      core.contentChanged(handler, removeSub);
      this._contentChangedHandler = null;
    } else {
      this._contentChangedHandler = { handler, removeSub };
    }
  }

  hasPathAttached(): boolean {
    return !!this._attachedPath;
  }

  /**
   * Puts the text on `path` (null takes it off) by setting `atPath` to a
   * serialized copy of the path. During undo/redo the path is attached
   * directly from the recorded `atPath`.
   */
  attachPath(path: PathBase | null): void {
    let serialized: string | null = null;
    if (this.isRecordedTransaction()) {
      serialized = this.getProperty("atPath") as string | null;
      this._attachPath(
        path,
        serialized ? (Node.deserialize(serialized) as unknown as PathBase) : null,
      );
    } else {
      this._atPath = path;
      if (path) {
        const copy = copyPath(path);
        if (copy) serialized = Node.serialize(copy);
      }
      this.setProperty("atPath", serialized);
      this._atPath = null;
    }
  }

  /**
   * Lays the text out on `path` to measure the pre-transform of the path
   * transformer, then puts back the transformer the core had. Returns
   * that pre-transform.
   */
  _trySetPath(
    path: PathBase | null,
    direction: unknown,
    side: unknown,
    offset: number,
    distance: number,
    transform: unknown,
  ): Transform | null {
    void transform;
    const core = this.getTLCore();
    if (core && path) {
      const previous = core.getTransformer(
        TLPathTextTransformer.TYPE,
      ) as TLPathTextTransformer | null;
      let borderWidth = 0;
      if (path && path.hasMixin(Stylable)) {
        const layers = path.getPaintLayers();
        if (layers) {
          each(layers.getBorderLayers(true), (_index, border) => {
            borderWidth = Math.max(borderWidth, border.$_bw);
          });
        }
      }
      core.setPath(
        path as unknown as TextBasePath,
        this._correctDirOnPath(direction) as number,
        this._correctSideOnPath(side) as number,
        path ? (offset ? offset - borderWidth / 2 + 0.5 : -borderWidth / 2 + 0.5) : offset,
        path ? (distance ? distance - borderWidth / 2 + 0.5 : -borderWidth / 2 + 0.5) : distance,
      );
      this._runsDirty = true;
      this._verticesDirty = true;
      const preTransform = this._getApplyPreTransform(TLPathTextTransformer.TYPE);
      if (previous) {
        core.setPath(
          previous._basePath,
          TLPathTextTransformer.DIRECTION_OUTWARDS,
          previous._params.side,
          previous._params.offset,
          previous._params.distance,
        );
      } else {
        core.setPath(
          null,
          TLPathTextTransformer.DIRECTION_OUTWARDS,
          this._correctSideOnPath(side) as number,
          0,
          0,
        );
      }
      this._runsDirty = true;
      this._verticesDirty = true;
      return preTransform;
    }
    return null;
  }

  /** Changes the writing direction; returns the direction transformer's pre-transform. */
  _setDirection(direction: number): Transform | null {
    const core = this.getTLCore();
    if (core && core.getDirection() !== direction) {
      core.setDirection(direction);
      this._runsDirty = true;
      this._verticesDirty = true;
      return this._getApplyPreTransform(TLDirectionTextTransformer.TYPE) || new Transform();
    }
    return null;
  }

  _getApplyPreTransform(type: string): Transform | null {
    const core = this.getTLCore();
    if (!core || !core.getTransformer()) return null;
    const transformer = core.getTransformer(type);
    return transformer ? transformer.getPreTransform(this) : null;
  }

  /** The path direction, flipped for right-to-left text that is mirrored horizontally. */
  _correctDirOnPath(direction?: unknown): unknown {
    let result = direction || this.$tpthd;
    if (this.$dir === TLDirectionTextTransformer.LTR) return result;
    if (this.$trf) {
      const decomposed = this.$trf.decomposed();
      if (decomposed && (decomposed.scale.getMatrix()[0] as number) < 0) {
        result =
          result === TLPathTextTransformer.DIRECTION_INWARDS
            ? TLPathTextTransformer.DIRECTION_OUTWARDS
            : TLPathTextTransformer.DIRECTION_INWARDS;
      }
    }
    return result;
  }

  /** The path side, flipped for right-to-left text that is mirrored horizontally. */
  _correctSideOnPath(side?: unknown): unknown {
    let result = side || this.$tpths;
    if (this.$dir === TLDirectionTextTransformer.LTR) return result;
    if (this.$trf) {
      const decomposed = this.$trf.decomposed();
      if (decomposed && (decomposed.scale.getMatrix()[0] as number) < 0) {
        result =
          result === TLPathTextTransformer.OUTSIDE
            ? TLPathTextTransformer.INSIDE
            : TLPathTextTransformer.OUTSIDE;
      }
    }
    return result;
  }

  /** Lays the text out on `pathCopy` (the parsed `atPath`) and remembers the original `path`. */
  _attachPath(path: PathBase | null, pathCopy: PathBase | null): void {
    const core = this.getTLCore();
    if (core) {
      this._verticesDirty = true;
      this._runsDirty = true;
      let borderWidth = 0;
      if (pathCopy && pathCopy.hasMixin(Stylable)) {
        const layers = pathCopy.getPaintLayers();
        if (layers) {
          each(layers.getBorderLayers(true), (_index, border) => {
            borderWidth = Math.max(borderWidth, border.$_bw);
          });
        }
      }
      core.setPath(
        pathCopy as unknown as TextBasePath | null,
        this._correctDirOnPath() as number,
        this._correctSideOnPath() as number,
        pathCopy
          ? this.$tptho
            ? this.$tptho - borderWidth / 2 + 0.5
            : -borderWidth / 2 + 0.5
          : this.$tptho,
        this.$tpthl,
      );
      if (pathCopy && !this.hasPathAttached() && !this.isRecordedTransaction()) {
        this._oldTrf = this.getProperty("trf") as Transform | null;
      }
      this._attachedPath = path;
    } else this._pendingAttachedPath = path;
  }

  override _calculatePreTransformRect(transform: Transform | null | undefined): Rect | null {
    let rect: Rect | null;
    if (transform && transform.invertible()) {
      rect = this.getGeometryBBox();
      if (rect) {
        const corners = (transform.inverted() as Transform).mapQuadrilateral(rect);
        rect = Rect.fromPoints(...corners);
      } else rect = null;
    } else rect = this.getGeometryBBox();
    return rect;
  }

  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    void includeInvisible;
    if (this.isFakeText()) {
      const paths = this._backupPaths();
      const transform = this.getProperty("trf") as Transform | null;
      let box = paths.length ? (paths[0] as BackupPath).getPreTransformRect(transform) : null;
      for (let i = 1; i < paths.length; i++) {
        const next = (paths[i] as BackupPath).getPreTransformRect(transform);
        if (box && next) box = box.united(next);
        else if (next) box = next;
      }
      return box;
    }
    return new Rect(0, 0, this._getWidth(), this._getHeight());
  }

  /** The letter spacing after the widest line, which automatic width leaves out of the box. */
  _calculateBBoxSpacing(): number {
    if (!this.$aw) return 0;
    const core = this.getTLCore();
    return core ? core.getBBoxSpacing() : 0;
  }

  /**
   * The box: with `includeInvisible` the bounds of the glyph outlines (or
   * the layout bounds), else the text box, mapped by `trf`. Lays the text
   * out first when it changed.
   */
  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    if (this.isFakeText()) {
      const paths = this._backupPaths();
      let box = paths.length ? (paths[0] as BackupPath).getGeometryBBox(includeInvisible) : null;
      for (let i = 1; i < paths.length; i++) {
        box = (box as Rect).united(
          (paths[i] as BackupPath).getGeometryBBox(includeInvisible) as Rect,
        );
      }
      return box;
    }
    let box: Rect | null = new Rect();
    const core = this.getTLCore();
    if (!core) return box;
    if (this.isFakeText()) return this.getGeometryBBox(includeInvisible);
    if (this._runsDirty || !core.getCanvas()) {
      if (!this._workspace) {
        this._waitForWorkspace = true;
        return box;
      }
      core.setWidth(this.$aw ? TLCore.AUTO : this._getWidth() - 2 * Text.HMARGIN);
      core.setHeight(this.$ah ? TLCore.AUTO : this._getHeight() - 2 * Text.VMARGIN);
      if (-1 === this.$w || this.hasPathAttached()) {
        this.$w = core.getWidth() + 2 * Text.HMARGIN;
      }
      if (-1 === this.$h || this.hasPathAttached()) {
        this.$h = core.getHeight() + 2 * Text.VMARGIN;
      }
    }
    if (includeInvisible) {
      if (core.constructor === TLCore) {
        const shapes = this.getTextShapes();
        box = null;
        for (let i = 0; i < shapes.length; ++i) {
          const shape = shapes[i] as BackupPath;
          const bounds = VertexInfo.calculateBounds(shape as unknown as VertexReader, true);
          box = box ? box.united(bounds as Rect) : bounds;
        }
        if (box) return box;
      }
      if (this.hasPathAttached()) {
        let width = core.getWidth();
        width = width > 0 ? width : this._getWidth() - 2 * Text.HMARGIN;
        let height = core.getHeight();
        height = height > 0 ? height : this._getHeight() - 2 * Text.VMARGIN;
        box = new Rect(0, 0, width, height);
      } else {
        const bounds = core.getRealBounds();
        box = new Rect(bounds.l, bounds.t, bounds.w, bounds.h);
      }
    } else box = new Rect(0, 0, this._getWidth(), this._getHeight());
    if (this.$trf) box = this.$trf.mapRect(box);
    return box;
  }

  /** The paint box grown by the core's paddings and letter spacing; border paddings go to the core. */
  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    let box = super._calculatePaintBBox(arg, includeInvisible);
    if (box) {
      const core = this.getTLCore();
      if (core) {
        const horizontal = Math.max(
          2 * (core.getLeftPadding() as number),
          2 * (core.getRightPadding() as number),
        );
        const vertical = 2 * core.getTopPadding();
        box = box.expanded(
          horizontal,
          vertical,
          horizontal + this._calculateBBoxSpacing(),
          vertical,
        );
        if (this.hasStyleBorder() || this._hasStyleBorderPadding) {
          let padding = 0;
          (this.getPaintLayers() as PaintLayers).getBorderLayers(true).forEach((border) => {
            const borderPadding = this.getStyleBorderPadding(border);
            if (borderPadding) padding = Math.max(padding, borderPadding);
          });
          if (padding) core.setPadding(padding);
          this._hasStyleBorderPadding = !!this.hasStyleBorder();
        }
      }
    }
    return box;
  }

  override _styleRepaint(source?: unknown): void {
    this._runsDirty = true;
    super._styleRepaint(source);
  }

  override _styleFinishGeometryChange(source?: unknown): void {
    this._runsDirty = true;
    super._styleFinishGeometryChange(source);
  }

  /**
   * Checks which fonts the content uses: whether any is embedded, and
   * drops the backup outlines when all are resolved and none is embedded.
   */
  _checkHasEmbeddedAndResetFakeText(): void {
    this._hasEmbeddedFonts = false;
    if (this._workspace) {
      try {
        let content = (this.$content && parseContent(this.$content)) || this.getContent();
        if (content) {
          let allResolved = true;
          content = this._fixText(content);
          (content as Run[]).forEach((run) => {
            const font = this._fontManager().getFont(
              this._getGravitValue("fontFamily", run.fontFamily) as string,
              this._getGravitValue("fontStyle", run.fontStyle) as FontStyle,
              this._getGravitValue("fontWeight", run.fontWeight) as number,
            );
            if (!(font && font.isResolved())) allResolved = false;
            if (font && font.isEmbedded()) this._hasEmbeddedFonts = true;
          });
          if (allResolved && !this._hasEmbeddedFonts) this._serializedBackupPaths = null;
          return;
        }
      } catch (error) {
        console.warn("Text: couldn't parse content: " + (error as Error).message);
      }
    }
  }

  /**
   * Sets the text (a string or runs). With `keepSelection` the changed part
   * is selected afterwards; `lockEvents` mutes the core's change events.
   * Runs with fonts that aren't resolved yet wait (`_setTextWhenAvailable`).
   */
  setText(text: unknown, keepSelection?: boolean, lockEvents?: boolean): void {
    let previousPlain: string | undefined;
    const core = this.getTLCore();
    text = this._shorten(text);
    // GSystem.OperatingSystem.Windows is the enum value (1), so this runs
    // everywhere; kept.
    if (System.OperatingSystem.Windows) text = replaceMicrosoftLineFeed(text);
    if (core) {
      if (keepSelection) previousPlain = core.getDocumentRange().plainText();
      if (lockEvents) core.lockChangeEvents(1);
      if (this._workspace) {
        if (text instanceof Array) {
          let allResolved = true;
          for (let i = 0; i < text.length; i++) {
            const run = text[i] as Run;
            const family = this._getGravitValue(
              "fontFamily",
              run.fontFamily || Formatting.defaultFormatting.fontFamily,
            );
            const style = this._getGravitValue(
              "fontStyle",
              run.fontStyle || Formatting.defaultFormatting.fontStyle,
            );
            const weight = this._getGravitValue(
              "fontWeight",
              run.fontWeight || Formatting.defaultFormatting.fontWeight,
            );
            const font = this._fontManager().getFont(
              family as string,
              style as FontStyle,
              weight as number,
            );
            if (!(font && font.isResolved())) {
              this._requireResolvedFont(font);
              allResolved = false;
            }
          }
          // Returns with the change events still locked (old behaviour).
          if (!allResolved) {
            this._setTextWhenAvailable = true;
            return;
          }
        }
      } else this._waitForWorkspace = true;
      const applied = core.setText(text);
      if (lockEvents) core.lockChangeEvents(0);
      if (!this._startText) {
        this._startText = applied ? stringifyContent(core.getRichContent()) : text;
      }
      if (!applied) return;
      this._setTextWhenAvailable = false;
      this._tempText = null;
      if (keepSelection) {
        const before = previousPlain as string;
        const after = core.getDocumentRange().plainText();
        const afterLength = after.length;
        const beforeLength = before.length;
        const common = Math.min(afterLength, beforeLength);
        let i = 0;
        while (i < common && before.charAt(i) == after.charAt(i)) i++;
        let start = i;
        i = 0;
        while (
          i < common &&
          before.charAt(beforeLength - i - 1) == after.charAt(afterLength - i - 1)
        ) {
          i++;
        }
        let end = afterLength - i;
        if (end - start <= 1) {
          if (afterLength < beforeLength) end = start;
          else start = end;
        }
        core.select(start, end);
      }
    } else this._tempText = text;
  }

  getPlainText(): unknown {
    let plain: unknown = null;
    const core = this.getTLCore();
    if (core) {
      plain = core.getDocumentRange().plainText();
      if (!plain) plain = this._startText;
    } else if (this._tempText) plain = this._tempText;
    return plain;
  }

  override getStylePropertySets(): string[] {
    return super
      .getStylePropertySets()
      .concat(Stylable.PropertySet.Text, Stylable.PropertySet.Paragraph);
  }

  override rewindVertices(index: number): boolean {
    if (this.isFakeText()) {
      let ok = true;
      this._vertexIterator = 0;
      const paths = this._backupPaths();
      for (let i = 0; i < paths.length; i++) {
        ok = ok && (paths[i] as unknown as VertexReader).rewindVertices(0);
      }
      return ok;
    }
    const core = this.getTLCore();
    if (!core) return false;
    if (this._verticesDirty) {
      this._vertexContainer.clearVertices();
      core.renderVertices(this._vertexContainer);
      this._verticesDirty = false;
    }
    return this._vertexContainer.rewindVertices(index);
  }

  /**
   * The glyph outlines as paths, one per run style (with the run's fill
   * and stroke as paint layers when the text has none), or one path for
   * the whole text when it has no font color. Positioned like the text.
   */
  getTextShapes(): BackupPath[] {
    if (this.isFakeText()) return this._backupPaths();
    const core = this.getTLCore();
    if (!core) return [];
    if (!PathBase || !PathUtil.createPathFromVertexSource) return [];
    core.setWidth(this.$aw ? TLCore.AUTO : this._getWidth() - 2 * Text.HMARGIN);
    core.setHeight(this.$ah ? TLCore.AUTO : this._getHeight() - 2 * Text.VMARGIN);
    const styled: StyledVertices[] = [];
    const shapes: BackupPath[] = [];
    const fontColor = core.getDocumentRange().getFormatting().fontColor;
    let own: Transform;
    let bounds: Rect | null;
    let shift: Point;
    let shape: BackupPath | null;
    if (fontColor && "transparent" !== fontColor) {
      core.renderVerticesWithStyle(styled);
      for (let i = styled.length - 2; i >= 0; i--) {
        const current = styled[i] as StyledVertices;
        const next = styled[i + 1] as StyledVertices;
        if (
          current.fill == next.fill &&
          current.stroke == next.stroke &&
          current.textFill == next.textFill &&
          current.textStroke == next.textStroke
        ) {
          styled.splice(i, 1);
          if (current.vertices && next.vertices) {
            (next.vertices as VertexContainer).appendVertices(current.vertices as VertexContainer);
          }
        }
      }
      own = this.$trf || new Transform();
      bounds = core.getRenderBounds();
      if (!bounds) bounds = new Rect(0, 0, core.getWidth(), core.getHeight());
      shift = new Point(0, 0);
      if (this.$va && !this.hasPathAttached()) {
        if ("m" == this.$va) shift = new Point(0, (core.getHeight() - core.getActualHeight()) / 2);
        else if ("b" == this.$va) shift = new Point(0, core.getHeight() - core.getActualHeight());
      }
      this.$trf = null;
      for (let i = 0; i < styled.length; i++) {
        const run = styled[i] as StyledVertices;
        if (run.vertices && (run.vertices as VertexContainer).getCount()) {
          run.vertices = new VertexTransformer(
            run.vertices,
            new Transform()
              .translated(-bounds.getX() + shift.getX(), -bounds.getY() + shift.getY())
              .multiplied(own),
          );
          shape = PathUtil.createPathFromVertexSource(
            run.vertices,
            null as unknown as boolean,
            true,
          ) as BackupPath | null;
          if (shape) {
            shape.assignFrom(this);
            shape.setProperty("evenodd", this._isEvenOddFill());
            const ownLayers = this.getPaintLayers() as PaintLayers;
            const shapeLayers = shape.getPaintLayers() as PaintLayers;
            if (run.textFill) {
              if (!ownLayers.getFillLayers(false).length) {
                shapeLayers.clearFillLayers();
                shapeLayers.appendChild(new Stylable.FillPaintLayer(run.textFill as Pattern));
              }
            } else if ("string" == typeof run.fill || run.fill instanceof String) {
              if (!ownLayers.getFillLayers(false).length) {
                const css = RGBColor.parseCSSColor(String(run.fill)) as number[] | null;
                if (css) {
                  shapeLayers.clearFillLayers();
                  shapeLayers.appendChild(
                    new Stylable.FillPaintLayer(new RGBColor(css.slice(0, 3)), css[3]),
                  );
                }
              }
            }
            if (
              (run.textStroke || "string" == typeof run.stroke || run.stroke instanceof String) &&
              !ownLayers.getBorderLayers(true).length
            ) {
              let strokePattern: Pattern | null = null;
              let opacity = 1;
              if (run.textStroke) strokePattern = run.textStroke as Pattern;
              else {
                const css = RGBColor.parseCSSColor(String(run.stroke)) as number[] | null;
                if (css && (css[3] as number) > 0) {
                  strokePattern = new RGBColor(css.slice(0, 3));
                  opacity = css[3] as number;
                }
              }
              if (strokePattern) {
                shapeLayers.clearBorderLayers();
                shapeLayers.appendChild(new Stylable.BorderPaintLayer(strokePattern, opacity));
              }
            }
            shapes.push(shape);
          }
        }
      }
      if (!own.isIdentity()) this.$trf = own;
    } else {
      this.rewindVertices(0);
      own = this.$trf || new Transform();
      bounds = core.getRenderBounds();
      if (!bounds) bounds = new Rect(0, 0, core.getWidth(), core.getHeight());
      shift = new Point(0, 0);
      if (this.$va && !this.hasPathAttached()) {
        if ("m" == this.$va) shift = new Point(0, (core.getHeight() - core.getActualHeight()) / 2);
        else if ("b" == this.$va) shift = new Point(0, core.getHeight() - core.getActualHeight());
      }
      const source = new VertexTransformer(
        this._vertexContainer,
        new Transform()
          .translated(-bounds.getX() + shift.getX(), -bounds.getY() + shift.getY())
          .multiplied(own),
      );
      shape = PathUtil.createPathFromVertexSource(
        source,
        null as unknown as boolean,
        true,
      ) as BackupPath | null;
      if (shape) {
        this.$trf = null;
        shape.assignFrom(this);
        if (!own.isIdentity()) this.$trf = own;
        shapes.push(shape);
      }
    }
    return shapes;
  }

  /** The outline vertices: `trf` applied, moved by the margin, and by the render bounds on a path. */
  override readVertex(vertex: Vertex, scale?: number): boolean {
    if (this.isFakeText()) {
      return (
        !!this.hasVertexForRead() &&
        (this._backupPaths()[this._vertexIterator] as unknown as VertexReader).readVertex(vertex)
      );
    }
    const read = this._vertexContainer.readVertex(vertex);
    if ((vertex.x || 0 === vertex.x) && scale) vertex.x += Text.HMARGIN / scale;
    if (
      (read && vertex.command !== Vertex.Command.Close && this.$trf) ||
      (this.hasPathAttached() && this._tlCore && this._tlCore.isInitialized())
    ) {
      let transform: Transform;
      if (this.hasPathAttached()) {
        const renderBounds = (this._tlCore as TLCore).getRenderBounds() as Rect;
        transform = new Transform(
          1,
          0,
          0,
          1,
          -renderBounds.getX(),
          -renderBounds.getY(),
        ).multiplied(this.$trf || new Transform());
      } else transform = this.$trf as Transform;
      transform.map(vertex);
    }
    return read;
  }

  /** Copies the text properties from another text, then the path base way (style, trf). */
  override assignFrom(other: Node): void {
    if (other instanceof Text) {
      this.transferProperties(other, [GeometryProperties, MetaProperties]);
    }
    // The old code called GPathBase.prototype.assignFrom, which only adds
    // path properties for paths.
    PathBase.prototype.assignFrom.call(this as unknown as PathBase, other);
  }

  override hasVertexForRead(): boolean {
    if (this.isFakeText()) {
      const path = this._backupPaths()[this._vertexIterator] as unknown as
        { hasVertexForRead(): unknown } | undefined;
      return (path && path.hasVertexForRead()) as boolean;
    }
    return this._vertexContainer.hasVertexForRead();
  }

  /** Repaints (sets whether the text is being edited when given). */
  repaint(edited?: boolean): void {
    if (void 0 !== edited) this._isEdited = edited;
    this._notifyChange(ElementChange.PrepareGeometryUpdate);
    this._notifyChange(ElementChange.FinishGeometryUpdate);
  }

  /** Fits the text box into x, y, width, height (fixed size from then on). */
  override setBounds(x: number, y: number, width: number, height: number): void {
    if (!this.hasPathAttached()) {
      const own = this.$trf;
      let delta = new Transform()
        .scaled(width / this._getWidth(), height / this._getHeight())
        .translated(x, y);
      if (own) {
        const inverse = own.inverted();
        if (inverse) delta = delta.multiplied(inverse);
      }
      this.beginUpdate();
      this.setProperties(["aw", "ah"], [false, false], false, false, false);
      this.transformSourceBBox(delta);
      this.endUpdate();
    }
  }

  /**
   * Applies a transform to the text box instead of scaling the text: the
   * box takes the new width and height (switching automatic width or
   * height off when they change), `trf` keeps the translation and the
   * flips. Returns the scale that was applied to the box, or null.
   */
  transformSourceBBox(
    transform: Transform | null,
    unitWidth?: boolean,
    unitHeight?: boolean,
    keepAutoWidth?: boolean,
    keepAutoHeight?: boolean,
  ): Transform | null {
    if (transform) {
      this._notifyChange(ElementChange.PrepareGeometryUpdate);
      const matrix = transform.getMatrix();
      const own = this.$trf;
      const translation = own ? own.getTranslation() : new Point(0, 0);
      const width = this._getWidth();
      const height = this._getHeight();
      const box = new Rect(
        translation.getX(),
        translation.getY(),
        unitWidth ? 1 : width,
        unitHeight ? 1 : height,
      );
      const corners = transform.mapQuadrilateral(box);
      const newWidth = Math.max(
        1,
        Math.abs((corners[0] as Point).getX() - (corners[1] as Point).getX()),
      );
      const newHeight = Math.max(
        1,
        Math.abs((corners[0] as Point).getY() - (corners[3] as Point).getY()),
      );
      let autoWidth = this.getProperty("aw");
      let autoHeight = this.getProperty("ah");
      if (autoWidth && keepAutoWidth && !GMath.isEqualEps(this._getWidth(), newWidth, 1e-9)) {
        autoWidth = false;
        if (this.getProperty("vacr") == Anchor.AnchorType.Stretch) autoHeight = false;
      } else if (
        autoHeight &&
        keepAutoHeight &&
        !GMath.isEqualEps(this._getHeight(), newHeight, 1e-9)
      ) {
        autoHeight = false;
      }
      let next = this.$trf || new Transform();
      const move = transform.getTranslation();
      next.getMatrix();
      next = next.preMultiplied(
        new Transform(
          (matrix[0] as number) < 0 ? -1 : 1,
          0,
          0,
          (matrix[3] as number) < 0 ? -1 : 1,
          move.getX(),
          move.getY(),
        ),
      );
      this.setProperties(
        ["w", "h", "trf", "aw", "ah"],
        [newWidth, newHeight, next, autoWidth, autoHeight],
      );
      this._notifyChange(ElementChange.FinishGeometryUpdate);
      return width && height
        ? new Transform(
            (newWidth / width) * ((matrix[0] as number) < 0 ? -1 : 1),
            0,
            0,
            (newHeight / height) * ((matrix[3] as number) < 0 ? -1 : 1),
            move.getX(),
            move.getY(),
          )
        : null;
    }
    return null;
  }

  /**
   * Hits the text pixels (HITTEST_TEXT), the text box (HITTEST_BOX, the
   * default) or always the text.
   */
  override _detailHitTest(
    location: Point,
    transform?: Transform | null,
    tolerance?: number,
    force?: unknown,
    options?: unknown,
  ): ElementData<Element, unknown> | null {
    if (this.isFakeText() && Text.HITTEST_TEXT) {
      return super._detailHitTest(location, transform, tolerance, force, options);
    }
    let core: TLCore | null | undefined;
    if (!this.isFakeText()) core = this.getTLCore();
    if (Text.HITTEST_TEXT && core && core.getCanvas()) {
      let full = new Transform();
      if (this.$trf) full = full.multiplied(this.$trf);
      if (transform) full = full.multiplied(transform);
      const local = (full.inverted() as Transform).mapPoint(location);
      const x = local.getX();
      const y = local.getY();
      if (!isFinite(x) || !isFinite(y)) return null;
      const reach = Math.floor(
        (tolerance as number) + 0.5 * (transform as Transform).getScaleFactor(),
      );
      const size = 1 + 2 * reach;
      const fillCanvas = core.getCanvas(RenderFlags.RENDERFLAG_FILL);
      const strokeCanvas = core.getCanvas(RenderFlags.RENDERFLAG_STROKE);
      const canvases: HTMLCanvasElement[] = [];
      if (fillCanvas) canvases.push(fillCanvas);
      if (strokeCanvas) canvases.push(strokeCanvas);
      // The old loops kept the last canvas's values for the result.
      let data: ArrayLike<number> = [0, 0, 0];
      let best = Number.MAX_VALUE;
      let bestIndex = NaN;
      for (let c = 0; c < canvases.length; c++) {
        const image = (
          (canvases[c] as HTMLCanvasElement).getContext("2d") as CanvasRenderingContext2D
        ).getImageData(x - reach, y - reach, size, size);
        data = image ? image.data : [0, 0, 0];
        best = Number.MAX_VALUE;
        bestIndex = NaN;
        for (let w = 3; w < data.length; w += 4) {
          if (0 !== data[w]) {
            const column = (w >> 2) % size;
            // Not floored in the old code; kept.
            const row = (w >> 2) / size;
            const distance = (reach - column) * (reach - column) + (reach - row) * (reach - row);
            if (distance < best) {
              best = distance;
              bestIndex = w;
            }
          }
        }
      }
      return Math.sqrt(best) > reach
        ? null
        : new ElementData<Element, unknown>(this, {
            pixel: Array.prototype.slice.call(data, bestIndex - 3, bestIndex + 1),
          });
    }
    if (Text.HITTEST_BOX) {
      let full = new Transform();
      if (this.$trf) full = full.multiplied(this.$trf);
      if (transform) full = full.multiplied(transform);
      const local = (full.inverted() as Transform).mapPoint(location);
      const box = this.getSourceBBox();
      return box && box.containsPoint(local)
        ? new ElementData<Element, unknown>(this, undefined)
        : null;
    }
    return new ElementData<Element, unknown>(this, undefined);
  }

  setTLCore(core: TLCore | null): void {
    this._tlCore = core;
    this._runsDirty = true;
  }

  /**
   * The GTL core, initialized on first use once the text is in a
   * workspace whose default font is resolved (null until then). The first
   * initialization fills the runs' formatting from the style properties,
   * sets the waiting text and applies the properties set meanwhile.
   */
  getTLCore(): TLCore | null {
    if (!this._tlCore) this._tlCore = new TLCore();
    if (!this._workspace && !this._tlCore.isInitialized()) {
      this._waitForWorkspace = true;
      return null;
    }
    if (!this._tlCore.isInitialized()) {
      const defaultFont = this._fontManager().getDefaultFont();
      if (!defaultFont) {
        this._requireResolvedFont(Text.DEFAULTFONT);
        return null;
      }
      if (!defaultFont.isResolved()) {
        this._requireResolvedFont(defaultFont);
        return null;
      }
      this._tlCore.initialize(this.$w, this.$h, this._fontManager(), (font) => {
        this._requireResolvedFont(font);
      });
      this._tlCore.setWrap(!this.$aw);
      const range = this._tlCore.getDocumentRange();
      const sets = this.getStylePropertySets();
      for (let i = sets.length - 1; i >= 0; i--) {
        const info = Stylable.PropertySetInfo[sets[i] as string] as {
          geometryProperties?: Dict;
          visualProperties?: Dict;
        };
        if (info.geometryProperties) {
          for (const name in info.geometryProperties) {
            const key = PropertyMapping[name];
            const value = this._getGTLValue(name, info.geometryProperties[name]);
            if (key) range.setFormatting(key, value);
          }
        }
        if (info.visualProperties) {
          for (const name in info.visualProperties) {
            const key = PropertyMapping[name];
            const value = this._getGTLValue(name, info.visualProperties[name]);
            if (key) range.setFormatting(key, value);
          }
        }
      }
      if (this._contentChangedHandler) {
        this._tlCore.contentChanged(
          this._contentChangedHandler.handler,
          this._contentChangedHandler.removeSub,
        );
        this._contentChangedHandler = null;
      }
      if (this._tempText) {
        this._beginBlockChanges(GEOMETRY_UPDATE);
        const pending = this._pendingProperties;
        const tempText = this._tempText;
        this._pendingProperties = null;
        const pendingPath = this._pendingAttachedPath;
        this._pendingAttachedPath = null;
        this.setText(this._tempText, true, true);
        this._checkHasEmbeddedAndResetFakeText();
        this._pendingProperties = pending;
        this._pendingAttachedPath = pendingPath;
        if (pending && tempText instanceof Array) {
          let found = false;
          let index = 0;
          // `props` is an array, so hasOwnProperty("content") is always
          // false: this always ends on the last entry. Kept.
          pending.every((entry, i) => {
            return (
              !(
                !entry.toRange &&
                ((found = true), (index = i), Object.hasOwn(entry.props, "content"))
              ) || ((found = false), false)
            );
          });
          if (found) {
            (pending[index] as PendingProperties).props.push("content");
            (pending[index] as PendingProperties).values.push(stringifyContent(tempText));
          }
        }
        this._endBlockChanges(GEOMETRY_UPDATE);
        if (this.deferredLoadHandler) this.deferredLoadHandler();
      }
    }
    if (this._pendingProperties) {
      const pending = this._pendingProperties;
      const pendingPath = this._pendingAttachedPath;
      this._pendingProperties = null;
      this._pendingAttachedPath = null;
      const whole: { props: string[]; values: unknown[] } = { props: [], values: [] };
      const ranged: { props: string[]; values: unknown[] } = { props: [], values: [] };
      pending.forEach((entry) => {
        if (entry.toRange) {
          ranged.props = ranged.props.concat(entry.props);
          ranged.values = ranged.values.concat(entry.values);
        } else {
          whole.props = whole.props.concat(entry.props);
          whole.values = whole.values.concat(entry.values);
        }
      });
      if (ranged.props.length) {
        this.setProperties(ranged.props, ranged.values, false, false, false, true, true);
      }
      if (whole.props.length) {
        this.setProperties(whole.props, whole.values, false, false, false, false, true);
      }
      this._pendingAttachedPath = pendingPath;
    }
    if (this._pendingAttachedPath) {
      const path = this._pendingAttachedPath;
      this._pendingAttachedPath = null;
      this.attachPath(path);
    }
    return this._tlCore;
  }

  /** The box width: `w`, or the laid out width with automatic width. */
  _getWidth(): number {
    if (!this.$aw) return this.$w;
    const core = this.getTLCore();
    return core ? core.getWidth() - this._calculateBBoxSpacing() + 2 * Text.HMARGIN : this.$w;
  }

  /** The box height: `h`, or the laid out height with automatic height. */
  _getHeight(): number {
    const core = this.getTLCore();
    if (!core) return this.$h;
    if (!this.$ah) {
      if (this._legacyHeight && !this._fontsToResolve) {
        const actual = core.getActualHeight() + 2 * Text.VMARGIN;
        this.$h = Math.max(actual, this.$h);
        this._legacyHeight = false;
        this._repairedHeight = true;
      }
      return this.$h;
    }
    return core.getHeight() + 2 * Text.VMARGIN;
  }

  /** A run value (GTL form) as the style property value (Gravit form). */
  _getGravitValue(key: string, value: unknown): unknown {
    let result: unknown = null;
    if (key) {
      switch (key) {
        case "fontStyle":
          result =
            "italic" === value
              ? Font.Style.Italic
              : "normal" === value || void 0 === value
                ? Font.Style.Normal
                : value === Font.Style.Normal || value === Font.Style.Italic
                  ? value
                  : null;
          break;
        case "fontFamily": {
          let fallback = "";
          if (this._workspace) {
            const font = this._fontManager().getDefaultFont();
            if (font) fallback = font.getFamily();
          }
          result = value || fallback;
          break;
        }
        case "fontColor":
          if ("transparent" == value) result = RGBColor.BLACK;
          else if ("string" == typeof value) {
            const match = RGBColor.RGBREGEX.exec(value);
            result =
              match && 5 == match.length && 0 == (match[4] as unknown as number)
                ? null
                : RGBColor.fromCSSColor(value);
          } else {
            result =
              value ||
              RGBColor.fromCSSColor(Formatting.defaultFormatting[key] as unknown as string);
          }
          break;
        case "fontWeight": {
          const weight = void 0 !== value ? parseInt(value as string) : 0;
          if (isNaN(weight)) {
            switch (value) {
              case "normal":
                result = Font.Weight.Regular;
                break;
              case "lighter":
                result = Font.Weight.Thin;
                break;
              case "bold":
                result = Font.Weight.Bold;
                break;
              case "bolder":
                result = Font.Weight.Heavy;
                break;
              default:
                result = null;
            }
          } else result = weight || Font.Weight.Regular;
          break;
        }
        case "align":
          switch (value) {
            case "left":
              result = ParagraphAlignment.Left;
              break;
            case "center":
              result = ParagraphAlignment.Center;
              break;
            case "right":
              result = ParagraphAlignment.Right;
              break;
            case "justify":
              result = ParagraphAlignment.Justify;
          }
          break;
        case "transformation":
          switch (value) {
            case "lowercase":
              result = TextTransformation.Lowercase;
              break;
            case "uppercase":
              result = TextTransformation.Uppercase;
              break;
            case "capitalize":
              result = TextTransformation.Capitalize;
              break;
            case "smallcaps":
              result = TextTransformation.SmallCaps;
          }
          break;
        case "paragraphSpacing":
          result =
            value || !Number.isNaN(value)
              ? value
              : (Formatting.defaultFormatting as Dict)[key] || null;
          break;
        default:
          result = value || (Formatting.defaultFormatting as Dict)[key] || null;
      }
      if (result === Formatting.multipleValues) result = null;
    }
    return result;
  }

  /** A style property value (Gravit form) as the run value (GTL form). */
  _getGTLValue(name: string, value: unknown): unknown {
    let result: unknown = null;
    if (!PropertyMapping[name]) return null;
    switch (name) {
      case "_tfw":
        result = parseInt(value as string);
        if (Number.isNaN(result)) result = value;
        break;
      case "_tws":
      case "_tcs":
      case "_tfi":
      case "_plh":
      case "_pas":
      case "_pai":
        if (value instanceof String || "string" == typeof value) result = value;
        else {
          result = parseFloat(value as string);
          if (Number.isNaN(result)) result = value;
        }
        break;
      case "_tff":
        result = value;
        break;
      case "_tfs":
        result =
          value === Font.Style.Italic ? "italic" : value === Font.Style.Normal ? "normal" : value;
        break;
      case "_fc": {
        let pattern: Pattern | null;
        result =
          value instanceof RGBColor
            ? value.toScreenCSS()
            : null === value
              ? "transparent"
              : ("string" == typeof value || value instanceof String) &&
                  (pattern = Pattern.deserialize(String(value)))
                ? (pattern as unknown as RGBColor).toScreenCSS()
                : value;
        break;
      }
      case "_pal":
        switch (value) {
          case ParagraphAlignment.Left:
            result = "left";
            break;
          case ParagraphAlignment.Center:
            result = "center";
            break;
          case ParagraphAlignment.Right:
            result = "right";
            break;
          case ParagraphAlignment.Justify:
            result = "justify";
        }
        break;
      case "_ttrf":
        switch (value) {
          case TextTransformation.Lowercase:
            result = "lowercase";
            break;
          case TextTransformation.Uppercase:
            result = "uppercase";
            break;
          case TextTransformation.Capitalize:
            result = "capitalize";
            break;
          case TextTransformation.SmallCaps:
            result = "smallcaps";
        }
        break;
      default:
        result = value;
    }
    return result;
  }

  /**
   * Text style properties come from the runs: of the whole text, or (with
   * `fromSelection`) of the selection or the formatting the next typed
   * character gets. Before the core exists they come from the waiting
   * runs when all of them agree.
   */
  override getProperty(
    name: string,
    custom?: boolean,
    defaultValue?: unknown,
    temporary?: boolean,
    fromSelection?: boolean,
  ): unknown {
    let core: TLCore | null;
    let value: unknown;
    if (fromSelection) {
      if (!(core = this.getTLCore())) return;
      const range = (
        "_pal" === name || "_plh" === name || "_pas" === name || "_pai" === name
          ? core.selectedParagraphRange()
          : core.selectedRange()
      ) as TLRange;
      let formatting: Run;
      if (range.start === range.end) {
        formatting = range.getFormatting();
        for (const key in range.doc.nextInsertFormatting) {
          formatting[key] = range.doc.nextInsertFormatting[key];
        }
      } else formatting = range.getFormatting();
      const key = PropertyMapping[name] as string;
      value = formatting[key];
      return this._getGravitValue(key, value);
    }
    const key = PropertyMapping[name] as string;
    let result: unknown = null;
    if ((core = this.getTLCore()) && key && !this._tempText) {
      value = core.getDocumentRange().getFormatting()[key];
      result = this._getGravitValue(key, value);
    } else {
      let found = false;
      if (this._tempText && this._tempText instanceof Array) {
        const runs = this._tempText as Dict[];
        for (let i = 0; i < runs.length; i++) {
          if (Object.hasOwn(runs[i] as Dict, key)) {
            if (found) {
              if ((runs[i] as Dict)[key] !== value) {
                result = null;
                break;
              }
            } else {
              value = (runs[i] as Dict)[key];
              result = this._getGravitValue(key, value);
              found = true;
            }
          }
        }
      }
      if (!found) result = super.getProperty(name, custom, defaultValue, temporary);
    }
    return result;
  }

  /**
   * Sets properties. Text style properties go onto the runs (of the whole
   * text, or the selection with `toRange`), font changes wait for the
   * fonts to resolve, `content` replaces the text, `atPath` and the
   * `tpth*` parameters re-lay the text on its path and `dir` changes the
   * direction; `trf` then gets the pre-transform of the transformers.
   * Before the core exists everything is kept for later. `noBase` skips
   * setting the element properties themselves; `noContent` skips setting
   * the text from `content`.
   *
   * Returns nothing (the old method had no return value).
   */
  override setProperties(
    names: readonly string[],
    values: readonly unknown[],
    custom?: boolean | null,
    force?: boolean | null,
    temporary?: boolean | null,
    toRange?: boolean,
    noBase?: boolean,
    noContent?: boolean,
  ): boolean {
    const core = this.getTLCore();
    if (!core) {
      if (!this._pendingProperties) this._pendingProperties = [];
      this._pendingProperties.push({
        props: names as string[],
        values: values as unknown[],
        rng: toRange,
      });
      if (!toRange && !noBase) super.setProperties(names, values, custom, force, temporary);
      return undefined as unknown as boolean;
    }
    core.lockChangeEvents(1);
    const range = (toRange ? core.selectedRange() : core.getDocumentRange()) as TLRange;
    let fontFamily: unknown = null;
    let fontWeight: unknown = null;
    let fontStyle: unknown = null;
    let content: unknown = null;
    let contentChanged = false;
    const outNames: string[] = [];
    const outValues: unknown[] = [];
    let prepared = false;
    let pathOffset: unknown = this.$tptho;
    let pathDirection: unknown = this.$tpthd;
    let pathSide: unknown = this.$tpths;
    let pathDistance: unknown = this.$tpthl;
    let atPathChanged = false;
    let pathCopy: PathBase | null = null;
    let attaching: PathBase | null;
    let atPathValue: string | null = null;
    let direction: number = -1;
    let trf = this.getProperty("trf") as Transform | null;
    let pathChanged = false;
    for (let i = 0; i < names.length; i++) {
      const name = names[i] as string;
      if ("content" == name) {
        content = values[i] || this._startText;
        contentChanged = true;
      } else if ("aw" == name) core.setWrap(!values[i]);
      else if ("atPath" != name || this.isRecordedTransaction()) {
        if ("trf" != name || temporary) {
          if ("dir" === name) {
            if (values[i] !== core.getDirection()) {
              direction = values[i] as number;
              if (this.hasPathAttached()) pathChanged = true;
            }
          } else if (this.hasPathAttached() && 0 === name.indexOf("tpth")) {
            pathChanged = true;
            this._runsDirty = true;
            this._verticesDirty = true;
            if ("tpthd" === name) pathDirection = values[i];
            else if ("tptho" === name) pathOffset = values[i];
            else if ("tpths" === name) pathSide = values[i];
            else if ("tpthl" === name) pathDistance = values[i];
          }
        } else trf = values[i] as Transform | null;
      } else {
        pathChanged = true;
        atPathChanged = true;
        atPathValue = values[i] as string | null;
        attaching = this._atPath ? this._atPath : null;
        if (atPathValue && !attaching) {
          pathCopy = Node.deserialize(atPathValue) as unknown as PathBase;
        } else if (attaching) {
          pathCopy = copyPath(attaching);
        }
      }
    }
    for (let i = 0; i < names.length; i++) {
      const key = PropertyMapping[names[i] as string];
      let value = values[i];
      if (key) contentChanged = true;
      if ("fontWeight" == key) {
        if (value instanceof Array) {
          value = 1 !== value.length || value[0] instanceof Array ? null : value[0];
        }
        fontWeight = ~~(value as number);
      } else if ("fontStyle" == key) {
        if (value instanceof Array) {
          value = 1 !== value.length || value[0] instanceof Array ? null : value[0];
        }
        fontStyle = value;
      } else if ("fontFamily" == key) {
        if (value instanceof Array) {
          value = 1 !== value.length || value[0] instanceof Array ? null : value[0];
        }
        fontFamily = value;
      } else if (key) {
        if (!content) {
          if (!prepared) {
            this._notifyChange(ElementChange.PrepareGeometryUpdate);
            prepared = true;
          }
          range.setFormatting(key, this._getGTLValue(names[i] as string, value));
        }
        if ("fontColor" === key) {
          outNames.push(names[i] as string);
          outValues.push(value);
        }
      } else if ("content" !== names[i]) {
        outNames.push(names[i] as string);
        outValues.push(value);
      }
    }
    if (fontWeight || fontFamily || fontStyle) {
      const valuesOf = (name: string, given: unknown): unknown[] => {
        let list: unknown[] = [];
        let current: unknown;
        if (given) list.push(given);
        else if ((current = this.getProperty(name, false, null, false, this._isEdited))) {
          list.push(current);
        } else if (null === current) {
          const saved = range.save() as Dict[];
          const key = PropertyMapping[name] as string;
          for (let i = 0; i < saved.length; i++) {
            list.push(this._getGravitValue(key, (saved[i] as Dict)[key]));
          }
          list = unique(list) as unknown[];
        }
        return list;
      };
      const families = valuesOf("_tff", fontFamily);
      const weights = valuesOf("_tfw", fontWeight);
      const styles = valuesOf("_tfs", fontStyle);
      if (!this._isEdited) {
        if (1 === families.length) {
          outNames.push("_tff");
          outValues.push(families[0]);
        }
        if (1 === styles.length) {
          outNames.push("_tfs");
          outValues.push(styles[0]);
        }
        if (1 === weights.length) {
          outNames.push("_tfw");
          outValues.push(weights[0]);
        }
      }
      const waiting: Font[] = [];
      if (content) {
        (parseContent(content as string) as Run[]).forEach((run) => {
          if (run.fontFamily) {
            const family = this._getGravitValue("fontFamily", run.fontFamily);
            const style = this._getGravitValue("fontStyle", run.fontStyle);
            const weight = this._getGravitValue("fontWeight", run.fontWeight);
            const font = this._fontManager().getFont(
              family as string,
              style as FontStyle,
              weight as number,
            ) as Font;
            if (!font.isResolved()) {
              if (waiting.indexOf(font) < 0) waiting.push(font);
              this._requireResolvedFont(font);
            }
          }
        });
      }
      for (let f = 0; f < families.length; f++) {
        for (let s = 0; s < styles.length; s++) {
          for (let w = 0; w < weights.length; w++) {
            const font = this._fontManager().getFont(
              families[f] as string,
              styles[s] as FontStyle,
              weights[w] as number,
            ) as Font;
            if (!font.isResolved()) {
              if (waiting.indexOf(font) < 0) waiting.push(font);
              this._requireResolvedFont(font);
            }
          }
        }
      }
      const vars: DeferredRangeVars = { fontFamily, fontStyle, fontWeight, content };
      // Applies the font change once the fonts are there; `replacement`
      // maps families that were replaced (replaceFonts). Returns whether
      // it could.
      const apply = (
        target: DeferredRangeVars,
        replacement?: Font | Record<string, string>,
      ): boolean => {
        let ready = true;
        let family: unknown = target.fontFamily ? target.fontFamily : null;
        let style: unknown = target.fontStyle ? target.fontStyle : null;
        let weight: unknown = target.fontWeight ? target.fontWeight : null;
        let runs: unknown;
        for (let i = 0; i < waiting.length; i++) {
          const font = waiting[i] as Font;
          const wanted = font.getFamily();
          let family2 = wanted;
          let style2: unknown = font.getStyle();
          let weight2: unknown = font.getWeight();
          if (replacement) {
            if (replacement instanceof Font) {
              family2 = replacement.getFamily();
              weight2 = replacement.getWeight();
              style2 = replacement.getStyle();
            } else if (wanted in replacement) {
              family2 = replacement[wanted] as string;
              weight2 = Font.Weight.Regular;
              style2 = Font.Style.Normal;
            }
          }
          if (!family || (family && family == wanted && wanted != family2)) {
            family = family2;
            style = style2;
            weight = weight2;
            target.fontFamily = family2;
            target.fontWeight = weight2;
            target.fontStyle = style2;
          }
          if (target.content && wanted != family2) {
            runs = this._shorten(parseContent(target.content as string));
            const from = { fontFamily: wanted };
            const to = { fontFamily: family2, fontWeight: weight2, fontStyle: style2 };
            this._replaceFF(runs, from, to);
            target.content = stringifyContent(runs);
            if (this.$_tff === wanted) this.$_tff = family2;
          }
          const next = this._fontManager().getFont(family2, style2 as FontStyle, weight2 as number);
          if (!(next && next.isResolved())) {
            if (next && !next.isResolved() && wanted !== family2) {
              waiting[i] = next;
              this._requireResolvedFont(next);
            }
            ready = false;
          }
        }
        if (!ready) return false;
        if (target.content) {
          if (ready) {
            runs = this._shorten(parseContent(target.content as string));
            if (!equals(runs, this.getContent(), true)) {
              this._notifyChange(ElementChange.PrepareGeometryUpdate);
              this.setText(runs, true, temporary as boolean);
            }
          }
        } else {
          this._notifyChange(ElementChange.PrepareGeometryUpdate);
          const keys: string[] = [];
          const formats: unknown[] = [];
          if (family) {
            keys.push("fontFamily");
            formats.push(family);
          }
          if (weight) {
            keys.push("fontWeight");
            formats.push(weight);
          }
          if (style) {
            keys.push("fontStyle");
            formats.push(style === Font.Style.Normal ? "normal" : "italic");
          }
          if (keys.length) {
            if (temporary) core.lockChangeEvents(1);
            range.setFormatting(keys, formats);
            if (temporary) core.lockChangeEvents(0);
          }
        }
        return ready;
      };
      if (waiting.length) {
        if (!this._deferredRangeSetters) this._deferredRangeSetters = [];
        contentChanged = false;
        this._deferredRangeSetters.push({ func: apply, vars });
      } else if (!content) {
        apply(vars);
        contentChanged = true;
      }
    }
    if (content && !noContent) {
      const runs = this._shorten(parseContent(content as string));
      if (!equals(runs, this.getContent(), true)) {
        if (!prepared) {
          this._notifyChange(ElementChange.PrepareGeometryUpdate);
          prepared = true;
        }
        this.setText(runs, true);
      }
    }
    let trfChanged = false;
    if (direction >= 0) {
      const before = this._getApplyPreTransform(TLDirectionTextTransformer.TYPE) || new Transform();
      const after = this._setDirection(direction);
      trf = (trf || new Transform()).preMultiplied(
        (after || new Transform()).multiplied(before.inverted() as Transform),
      );
      trfChanged = true;
    }
    core.lockChangeEvents(0);
    if (!noBase) {
      let preTransform: Transform | null = null;
      if (contentChanged) {
        outNames.push("content");
        outValues.push(content || stringifyContent(this.getContent()));
        trfChanged = true;
        pathChanged = pathChanged || this.hasPathAttached();
        force = true;
      }
      if (this.isRecordedTransaction()) {
        if (trf && this.isFakeText()) {
          const delta = (
            ((this.getProperty("trf") as Transform | null) || new Transform()).inverted() ||
            new Transform()
          ).multiplied(trf);
          each(this._backupPaths(), (_index, path) => {
            path.transform(delta);
          });
        }
      } else {
        if (pathChanged) {
          if (!atPathChanged && this._attachedPath) pathCopy = copyPath(this._attachedPath);
          if (!prepared) this._notifyChange(ElementChange.PrepareGeometryUpdate);
          if (trf && pathCopy && trf.invertible()) {
            const pathTrf = pathCopy.getProperty("trf") as Transform | null;
            pathCopy.setProperty(
              "trf",
              pathTrf
                ? pathTrf.multiplied(trf.inverted() as Transform)
                : (trf.inverted() as Transform),
            );
            atPathValue = Node.serialize(pathCopy);
          } else if (pathCopy && !atPathValue) atPathValue = Node.serialize(pathCopy);
          preTransform = this._trySetPath(
            pathCopy,
            pathDirection,
            pathSide,
            pathOffset as number,
            pathDistance as number,
            trf,
          );
          trfChanged = true;
          const at = outNames.indexOf("atPath");
          if (at >= 0) outValues[at] = atPathValue;
          else {
            outNames.push("atPath");
            outValues.push(atPathValue);
          }
        } else if (trfChanged && core.getTransformer(TLPathTextTransformer.TYPE)) {
          this._runsDirty = true;
          this._verticesDirty = true;
          const pathPreTransform = this._getApplyPreTransform(TLPathTextTransformer.TYPE);
          preTransform = (preTransform as Transform | null)
            ? (preTransform as unknown as Transform).multiplied(pathPreTransform as Transform)
            : pathPreTransform;
        }
        if (trfChanged && preTransform) {
          trf = trf ? preTransform.multiplied(trf) : preTransform;
        } else if (atPathChanged && !pathCopy) {
          trfChanged = true;
          trf = this._oldTrf ? this._oldTrf : null;
          this._oldTrf = null;
          force = true;
        }
        if (trfChanged) {
          const at = outNames.indexOf("trf");
          if (at >= 0) outValues[at] = trf;
          else {
            outNames.push("trf");
            outValues.push(trf);
          }
        }
      }
      super.setProperties(outNames, outValues, custom, force, temporary);
    }
    return undefined as unknown as boolean;
  }

  /** Replaces the font family (and style and weight) in runs, recursively. */
  _replaceFF(
    runs: unknown,
    from: { fontFamily?: unknown },
    to: { fontFamily?: unknown; fontStyle?: unknown; fontWeight?: unknown },
  ): void {
    if (runs && from && to) {
      const replace = (object: Dict): void => {
        for (const key in object) {
          if (Object.hasOwn(object, key)) {
            if ("object" == typeof object[key]) replace(object[key] as Dict);
            else if (
              "fontFamily" == key &&
              Object.hasOwn(object, "fontFamily") &&
              (!from.fontFamily || object.fontFamily == from.fontFamily)
            ) {
              object.fontFamily = to.fontFamily;
              if (Object.hasOwn(object, "fontStyle")) {
                const style = to.fontStyle;
                switch (style) {
                  case Font.Style.Normal:
                    object.fontStyle = "normal";
                    break;
                  case Font.Style.Italic:
                    object.fontStyle = "italic";
                    break;
                  default:
                    object.fontStyle = style;
                }
              }
              if (Object.hasOwn(object, "fontWeight")) object.fontWeight = to.fontWeight;
            }
          }
        }
      };
      if (runs instanceof Array) {
        for (let i = 0; i < runs.length; ++i) replace(runs[i] as Dict);
      } else replace(runs as Dict);
    }
  }

  // GElement's partial collision test, skipping GShape's.
  override _checkPartialCollision(
    ...args: Parameters<Shape["_checkPartialCollision"]>
  ): ReturnType<Shape["_checkPartialCollision"]> {
    return (
      Element.prototype._checkPartialCollision as (
        ...params: Parameters<Shape["_checkPartialCollision"]>
      ) => ReturnType<Shape["_checkPartialCollision"]>
    ).apply(this, args);
  }

  override _preparePaint(context: PaintContext, arg?: unknown): boolean {
    if (super._preparePaint(context, arg)) {
      const clip = this._getClipBox(context);
      if (clip && (context.canvas as PaintCanvas).hasClip()) {
        (context.canvas as PaintCanvas).clipRect(
          clip.getX(),
          clip.getY(),
          clip.getWidth(),
          clip.getHeight(),
        );
      }
      return true;
    }
    return false;
  }

  override _finishPaint(context: PaintContext): void {
    if (null !== this._getClipBox(context) && (context.canvas as PaintCanvas).hasClip()) {
      (context.canvas as PaintCanvas).resetClip();
    }
    this._runsDirty = false;
    super._finishPaint(context);
  }

  /** A single run object becomes a list of one run. */
  _fixText(text: unknown): unknown {
    if (
      !(text instanceof Array) &&
      text instanceof Object &&
      !(text instanceof String) &&
      Object.hasOwn(text, "text")
    ) {
      text = [text];
    }
    return text;
  }

  /** Cuts the text (a string or runs) to MAXLENGTH characters. */
  _shorten(text: unknown): unknown {
    text = this._fixText(text);
    if ("string" == typeof text || text instanceof String) {
      if (text.length > Text.MAXLENGTH) text = text.substr(0, Text.MAXLENGTH);
    } else if (text instanceof Array) {
      let total = 0;
      const max = Text.MAXLENGTH;
      for (let i = 0; i < text.length; i++) {
        const run = text[i] as { text: string };
        if (Object.hasOwn(run, "text")) {
          if (total + run.text.length > max) {
            text = text.slice(0, i + 1);
            run.text = run.text.substr(0, max - total);
            break;
          }
          total += run.text.length;
        }
      }
    }
    return text;
  }

  /** Keeps the glyph outlines as backup paths and the runs as `content`. */
  toFakeText(): void {
    this._deserializedBackupPaths = this.getTextShapes();
    const content = this.getContent() || [];
    this.$content = stringifyContent(content);
  }

  hasEmbeddedFonts(): boolean {
    return this._hasEmbeddedFonts;
  }

  hasFontsToResolve(): (Font | null)[] | null {
    return this._fontsToResolve;
  }

  /**
   * Whether the text shows its backup outlines: fonts are missing or
   * embedded and the text wasn't edited. Returns the raw && / || value
   * (null, false, true), as the old code did.
   */
  isFakeText(): unknown {
    return (
      (this._fontsToResolve || this._hasEmbeddedFonts) &&
      this._isVirgin &&
      ((this._serializedBackupPaths &&
        !!(this._serializedBackupPaths as { length: number }).length) ||
        (this._deserializedBackupPaths && !!this._deserializedBackupPaths.length))
    );
  }

  /**
   * Replaces fonts: `replacement` is a font (for every family) or a map of
   * family → family. Retries the deferred font setters with it and, with
   * `updateContent`, rewrites the runs.
   */
  replaceFonts(replacement: Font | Record<string, string>, updateContent?: boolean): void {
    if (replacement) {
      let applied = false;
      if (this._deferredRangeSetters) {
        for (let i = this._deferredRangeSetters.length - 1; i >= 0; --i) {
          const setter = this._deferredRangeSetters[i] as DeferredRangeSetter;
          if (setter.func.call(this, setter.vars, replacement)) {
            this._deferredRangeSetters.splice(i, 1);
            applied = true;
          }
        }
        if (0 == this._deferredRangeSetters.length) this._deferredRangeSetters = null;
      }
      if (this._fontsToResolve) {
        for (let i = this._fontsToResolve.length - 1; i >= 0; --i) {
          const wanted = ((this._fontsToResolve as Font[])[i] as Font).getFamily();
          if (replacement instanceof Font || wanted in replacement) {
            let family: string;
            let weight: number;
            let style: FontStyle;
            if (replacement instanceof Font) {
              family = replacement.getFamily();
              weight = replacement.getWeight();
              style = replacement.getStyle();
            } else {
              family = replacement[wanted] as string;
              weight = Font.Weight.Regular;
              style = Font.Style.Normal;
            }
            const font = this._fontManager().getFont(family, style, weight);
            if (font) {
              (this._fontsToResolve as Font[]).splice(i, 1);
              if (!font.isResolved()) this._requireResolvedFont(font);
            }
            if (0 === (this._fontsToResolve as (Font | null)[]).length) {
              this._fontsToResolve = null;
              this._updateFontManagerListener();
            }
          }
        }
      }
      if (applied) {
        this._runsDirty = true;
        this._verticesDirty = true;
        this._resetFxCacheAndState();
        if (this.hasPathAttached()) this.attachPath(this._attachedPath);
        this._notifyChange(ElementChange.PrepareGeometryUpdate);
        this._notifyChange(ElementChange.FinishGeometryUpdate);
      }
      if (updateContent) {
        const runs = (
          this.isFakeText() ? parseContent(this.$content as string) : this.getContent()
        ) as Run[];
        let allResolved = true;
        runs.forEach((run) => {
          if (replacement instanceof Font || replacement[run.fontFamily as string]) {
            let family: string | undefined;
            let weight: number = Font.Weight.Regular;
            let style: FontStyle = Font.Style.Normal;
            if (replacement instanceof Font) {
              family = replacement.getFamily();
              weight = replacement.getWeight();
              style = replacement.getStyle();
            } else family = replacement[run.fontFamily as string];
            if (family) {
              const font = this._fontManager().getFont(family, style, weight);
              if (font) {
                run.fontFamily = font.getFamily();
                run.fontStyle = this._getGTLValue("_tfs", font.getStyle()) as string;
                run.fontWeight = font.getWeight();
                if (!font.isResolved()) {
                  this._requireResolvedFont(font);
                  allResolved = false;
                }
              } else {
                const defaultFont = this._fontManager().getDefaultFont();
                if (defaultFont) {
                  run.fontFamily = defaultFont.getFamily();
                  run.fontStyle = this._getGTLValue("_tfs", defaultFont.getStyle()) as string;
                  run.fontWeight = defaultFont.getWeight();
                } else allResolved = false;
              }
            }
          }
        });
        if (replacement instanceof Font) {
          this.$_tff = replacement.getFamily();
          // The old code set `$_tfs` twice (weight, then style); kept.
          this.$_tfs = replacement.getWeight();
          this.$_tfs = replacement.getStyle();
        } else if (replacement[this.$_tff as string]) {
          this.$_tff = replacement[this.$_tff as string];
        }
        if (allResolved) {
          this.setProperty("content", stringifyContent(runs));
          this.repaint();
        } else if (this._fontManager().getDefaultFont()) {
          this.$content = stringifyContent(runs);
          this._setTextWhenAvailable = true;
        }
      }
    }
  }

  /**
   * Drops `_tff`/`_tfw`/`_tfs` from a blob unless every run has that
   * value (an empty family counts as none).
   */
  _fixFontAttributes(blob: Dict): void {
    if (blob.ct && (blob._tff || blob._tfs || blob._tfw)) {
      if (blob._tff && !(blob._tff as string).length) blob._tff = null;
      let debug = false;
      if ("function" == typeof (globalThis as Dict).gdb_loaddesign) debug = true;
      blob._tfs = blob._tfs || null;
      blob._tfw = blob._tfw || null;
      const runs = blob.ct as Run[];
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i] as Run;
        if (blob._tff && this._getGravitValue("fontFamily", run.fontFamily) !== blob._tff) {
          if (debug) console.warn("invalid tff");
          delete blob._tff;
        }
        if (blob._tfw && this._getGravitValue("fontWeight", run.fontWeight) !== blob._tfw) {
          if (debug) console.warn("invalid tfw");
          delete blob._tfw;
        }
        if (blob._tfs && this._getGravitValue("fontStyle", run.fontStyle) !== blob._tfs) {
          if (debug) console.warn("invalid tfs");
          delete blob._tfs;
        }
        if (!(blob._tff || blob._tfs || blob._tfw)) break;
      }
      if (null === blob._tff) delete blob._tff;
      if (null === blob._tfs) delete blob._tfs;
      if (null === blob._tfw) delete blob._tfw;
    } else {
      delete blob._tff;
      delete blob._tfs;
      delete blob._tfw;
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this._store(args as StoreChangeArgs);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob as Dict;
      if (blob.blx && blob.trx) this._restoreLegacy(blob);
      else {
        if (!(
          !Object.hasOwn(blob, "_fpt") ||
          (blob._fpt && "C#[0,0,0]" !== blob._fpt) ||
          (Object.hasOwn(blob, "_fvs") && !blob._fvs)
        )) {
          // A default black fill stored in the old flat format.
          delete blob._fpt;
        }
        this._fixFontAttributes(blob);
        if (blob.content) {
          const runs = parseContent(blob.content as string);
          this._fixFontFamily(runs);
          blob.content = stringifyContent(runs);
        }
        this._fixFontFamily(blob.ct);
        this.setText(blob.ct, true, true);
        this.restoreProperties(blob, GeometryProperties, (name, value) =>
          "ttrf" === name && value ? Transform.deserialize(value as number[]) : value,
        );
        this.restoreProperties(blob, MetaProperties, (name, value) => {
          if ("_bkpPath" === name && value) {
            this._isVirgin = true;
            this._serializedBackupPaths = value;
            return null;
          }
          return value;
        });
      }
    } else if (change === NodeChange.WorkspaceAttached || change === NodeChange.WorkspaceDetach) {
      if (
        change === NodeChange.WorkspaceAttached &&
        this._workspace &&
        (this._waitForWorkspace ||
          (this.hasPathAttached() && (this._attachedPath as PathBase).getScene()))
      ) {
        this._waitForWorkspace = false;
        this._runsDirty = true;
        this._verticesDirty = true;
        this._resetFxCacheAndState();
        if (this.hasPathAttached()) this.attachPath(this._attachedPath);
        this._notifyChange(ElementChange.PrepareGeometryUpdate);
        this._notifyChange(ElementChange.FinishGeometryUpdate);
      }
      if (change === NodeChange.WorkspaceDetach && this._workspace) {
        // Without a workspace _updateFontManagerListener does nothing, so
        // the listener stays (old behaviour).
        setTimeout(() => {
          if (!this._workspace) this._updateFontManagerListener(true);
        }, 100);
      }
    } else if (change === SceneNodeChange.SceneAttached) {
      const scene = this.getScene() as TextScene;
      if (!this._addedDestroyable) {
        scene.addDestroyable(this._tlCore);
        this._addedDestroyable = true;
      }
      (this.getParent() as unknown as Node)._notifyChange(ElementChange.ChildVisualUpdate, [this]);
      if (scene._pre310 && !this._repairedHeight && !this.$ah) {
        this._legacyHeight = true;
        if (null === this._fontsToResolve) this.setProperty("h", this._getHeight(), false, true);
      }
    } else if (change == NodeChange.BeforePropertiesChange) {
      this._beforePropertiesChange(args as PropertiesChangeArgs);
    } else if (change == NodeChange.AfterPropertiesChange) {
      this._afterPropertiesChange(args as PropertiesChangeArgs);
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    this._handleGeometryChangeForProperties(
      change,
      args,
      extend({}, Stylable.AllGeometryProperties),
    );
    super._handleChange(change, args);
  }

  /** Stores the runs (`ct`, `content`), a fresh `#` off paths, and the properties. */
  _store(args: StoreChangeArgs): void {
    const blob = args.blob as Dict;
    const core = this.getTLCore();
    if (core && !this._tempText) {
      if (this._isEdited && args.options && false === (args.options as Dict).save) {
        blob.ct = (core.selectedRange() as TLRange).save();
      } else if (this.isFakeText()) {
        blob.ct = parseContent(this.getProperty("content") as string);
      } else blob.ct = core.getRichContent();
    } else blob.ct = this._tempText;
    let content = blob.ct;
    if (!this.isFakeText() && (content instanceof String || "string" == typeof content)) {
      content = [{ text: content }];
    }
    if (!this.hasPathAttached()) blob["#"] = uuid();
    this.storeProperties(args.blob, GeometryProperties, (name, value) =>
      "ttrf" === name && value
        ? Transform.serialize(value as Transform)
        : "content" === name && content
          ? stringifyContent(content)
          : value,
    );
    this._fixFontAttributes(blob);
    this.storeProperties(args.blob, MetaProperties, (name, value) => {
      if ("_bkpPath" === name) {
        if (Text.dontStorePaths) return null;
        let stored: unknown[] | null = null;
        try {
          if (this.isFakeText()) {
            if (this._deserializedBackupPaths) {
              stored = this._deserializedBackupPaths.map((path) => Node.store(path));
            }
          } else {
            stored = this.getTextShapes().map((shape) => Node.store(shape));
          }
        } catch {
          console.warn("Couldn't serialize text to path");
        }
        return stored || null;
      }
      return value;
    });
  }

  /**
   * Converts an old text blob: corner coordinates to `w`/`h`/`trf` and the
   * `txContent` tree (`txPara`, `txChr` with `cnt`, `txBrk`) to runs.
   */
  _restoreLegacy(blob: Dict): void {
    const names: string[] = [];
    const values: unknown[] = [];
    ["aw", "ah"].forEach((name) => {
      if (Object.hasOwn(blob, name)) {
        names.push(name);
        values.push(blob[name]);
      }
    });
    names.push("w");
    values.push(Math.abs((blob.trx as number) - (blob.tlx as number)));
    names.push("h");
    values.push(Math.abs((blob.try as number) - (blob.bry as number)));
    let own: Transform | undefined;
    const left = blob.tlx as number;
    const top = blob.tly as number;
    let move = new Transform();
    if (Object.hasOwn(blob, "ttrf")) {
      own = Transform.deserialize(blob.ttrf as number[]).makeInvertible();
    } else if (Object.hasOwn(blob, "trf")) {
      // The raw array, which has no preMultiplied (throws, as before).
      own = blob.trf as Transform;
    }
    move = move.translated(left, top);
    if (!own) own = new Transform();
    blob.trf = Transform.serialize(own.preMultiplied(move));
    const collect = (
      node: Dict,
      runs: Dict[],
      inherited: Dict | null,
      keepFalsy?: boolean,
    ): void => {
      if (node && runs) {
        const run = (
          inherited
            ? JSON.parse(JSON.stringify(inherited))
            : {
                fontColor: "transparent",
              }
        ) as Dict;
        const type = node["@"];
        let hasText = false;
        for (const key in PropertyMapping) {
          if (Object.hasOwn(node, key)) {
            let value = this._getGTLValue(key, node[key]);
            if (keepFalsy || value) {
              if ("_tff" === key && value) value = Font.getFontFamilyCorrected(value as string);
              run[PropertyMapping[key] as string] = value;
            }
          }
        }
        if ("text" === type) collect(node.ct as Dict, runs, run);
        else {
          if (Object.hasOwn(node, "cnt")) {
            run.text = node.cnt;
            hasText = true;
          }
          if (hasText) runs.push(run);
          if ("txPara" === type && runs.length) {
            (runs[runs.length - 1] as Dict).text =
              ((runs[runs.length - 1] as Dict).text as string) + "\n";
          } else if ("txBrk" === type) {
            run.text = "\n";
            runs.push(run);
          }
          if (node.$) {
            const children = node.$ as Dict[];
            for (let i = 0; i < children.length; i++) collect(children[i] as Dict, runs, run);
          }
        }
      }
    };
    const runs: Dict[] = [];
    collect(blob, runs, null, true);
    if (runs.length) {
      names.push("content");
      values.push(stringifyContent(runs));
    }
    this.setProperties(names, values);
  }

  /**
   * Keeps `w`/`h` in step with `aw`/`ah` (the current size when switching
   * automatic size off, -1 to measure again when switching it on) and
   * marks the layout dirty unless only the translation changes.
   */
  _beforePropertiesChange(args: PropertiesChangeArgs): void {
    const properties = args.properties;
    const values = args.values;
    const awIndex = properties.indexOf("aw");
    let ahIndex = properties.indexOf("ah");
    const wIndex = properties.indexOf("w");
    const hIndex = properties.indexOf("h");
    const trfIndex = properties.indexOf("trf");
    const contentIndex = properties.indexOf("content");
    let dropAw = false;
    let dropAh = false;
    // The old code also tested hacr/vacr with a layout parent here, with
    // no effect.
    if (awIndex >= 0 && wIndex < 0) {
      if (false === values[awIndex]) {
        if (this.hasPathAttached()) dropAw = true;
        else {
          properties.push("w");
          values.push(this._getWidth());
        }
      } else {
        properties.push("w");
        values.push(-1);
      }
    }
    if (ahIndex >= 0 && hIndex < 0) {
      if (false === values[ahIndex]) {
        if (this.hasPathAttached()) dropAh = true;
        else {
          properties.push("h");
          values.push(this._getHeight());
        }
      } else {
        properties.push("h");
        values.push(-1);
      }
    }
    if (trfIndex >= 0 && !(contentIndex >= 0)) {
      const current = this.$trf ? this.$trf.getMatrix() : null;
      const next = values[trfIndex] ? (values[trfIndex] as Transform).getMatrix() : null;
      if (current && next && current !== next) {
        if (
          current[0] !== next[0] ||
          current[1] !== next[1] ||
          current[2] !== next[2] ||
          current[3] !== next[3] ||
          (hIndex >= 0 && !this.$ah) ||
          (wIndex >= 0 && !this.$aw)
        ) {
          this._runsDirty = true;
          this._verticesDirty = true;
        }
      } else {
        this._runsDirty = true;
        this._verticesDirty = true;
      }
    } else {
      this._runsDirty = true;
      this._verticesDirty = true;
    }
    if (dropAw) {
      properties.splice(awIndex, 1);
      values.splice(awIndex, 1);
      if (dropAh) {
        if (awIndex < ahIndex) ahIndex--;
        properties.splice(ahIndex, 1);
        values.splice(ahIndex, 1);
      }
    } else if (dropAh) {
      properties.splice(ahIndex, 1);
      values.splice(ahIndex, 1);
    }
  }

  /** Attaches the path after `atPath` changed, re-lays after `tpth*`, checks fonts after `content`. */
  _afterPropertiesChange(args: PropertiesChangeArgs): void {
    const atPathIndex = args.properties.indexOf("atPath");
    if (atPathIndex >= 0) {
      const previous = args.values[atPathIndex];
      const current = this.getProperty("atPath") as string | null;
      if (null !== previous || null !== current) {
        let path: PathBase | null = this._atPath ? this._atPath : null;
        let copy: PathBase | null = null;
        if (current && !path) {
          if (this._scene && this._scene.hasLinks(this)) {
            this._scene.visitLinks(this, (linked) => {
              path = linked as unknown as PathBase;
            });
          }
        } else if (path && !current) path = null;
        if (current) copy = Node.deserialize(current) as unknown as PathBase;
        this._attachPath(path, copy);
      }
    } else if (
      args.properties.indexOf("tptho") >= 0 ||
      args.properties.indexOf("tpthd") >= 0 ||
      args.properties.indexOf("tpths") >= 0 ||
      args.properties.indexOf("tpthl") >= 0
    ) {
      if (this._attachedPath && this.$atPath) {
        const copy = Node.deserialize(this.$atPath) as unknown as PathBase;
        this._attachPath(this._attachedPath, copy);
      } else this._attachPath(null, null);
    } else if (args.properties.indexOf("content") >= 0) {
      this._checkHasEmbeddedAndResetFakeText();
      if (!(this.$aw && this.$ah)) this._resetFxCacheAndState();
    }
  }

  _fixFontFamilyName(run: Run): void {
    if (run.fontFamily) run.fontFamily = Font.getFontFamilyCorrected(run.fontFamily);
  }

  _fixFontFamily(runs: unknown): void {
    if (runs instanceof Array) {
      for (let i = 0; i < runs.length; ++i) this._fixFontFamilyName(runs[i] as Run);
    } else if (runs) this._fixFontFamilyName(runs as Run);
  }

  override _paint(context: PaintContext, arg?: unknown): void {
    if (this.isFakeText()) {
      each(this._backupPaths(), (_index, path) => {
        Shape.prototype._paint.call(path, context);
      });
    } else super._paint(context, arg);
  }

  override _paintFill(context: ShapePaintContext, separate: boolean, fill: PaintLayer): void {
    void separate;
    if (!context.configuration.isOutline(context as never) && this.hasStyleFill()) {
      this._paintTextFill(context, fill);
    }
  }

  /** True without fill layers (the text color paints), else whether one has a style. */
  override hasStyleFill(): boolean {
    const layers = this.getPaintLayers();
    if (!layers) return true;
    const fills = layers.getLayers(Stylable.FillPaintLayer);
    // The old method returned the count of fills with a style.
    return (!fills.length || fills.filter((fill) => fill.hasStyle()).length) as unknown as boolean;
  }

  override setTransform(transform: Transform | null): void {
    super.setTransform(transform);
    if (this.isFakeText()) {
      each(this._backupPaths(), (_index, path) => {
        path.setTransform(transform);
      });
    }
  }

  /**
   * Transforms the text. Without `sc` (scale content) and when the
   * transform has no skew, the box is resized instead of scaling the
   * glyphs (transformSourceBBox); otherwise `trf` takes the transform.
   */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    this.beginUpdate();
    try {
      let scaleContent: unknown;
      let delta: Transform | null = transform;
      let own: Transform | null = null;
      let ownInverse: Transform | null = null;
      if (transform && !transform.isIdentity()) {
        this._layoutTransform = transform;
        this._relayoutNow = !this._relayout;
        scaleContent = force || this.getProperty("sc");
        if (!scaleContent) {
          own = this.$trf;
          const parts = (delta as Transform).noSkewDecomposed();
          if (parts) {
            const rotated = own ? own.multiplied(parts.rotation) : parts.rotation;
            const source = this.getSourceBBox() as Rect;
            let center = rotated.mapPoint(source.getSide(Rect.Side.CENTER));
            const corners = rotated.mapQuadrilateral(source);
            const topLeft = corners[0] as Point;
            const bottomLeft = corners[3] as Point;
            const bottomRight = corners[2] as Point;
            const up = topLeft.subtract(bottomLeft);
            const across = bottomRight.subtract(bottomLeft);
            const cross = up.getX() * across.getY() - up.getY() * across.getX();
            if (
              GMath.isEqualEps(cross, 0) ||
              (GMath.isEqualEps(across.getX(), 0) && GMath.isEqualEps(across.getY(), 0)) ||
              (GMath.isEqualEps(up.getX(), 0) && GMath.isEqualEps(up.getY(), 0))
            ) {
              scaleContent = true;
            } else {
              let a: number;
              let b: number;
              let c: number;
              let d: number;
              const scale = parts.scalation.getMatrix();
              const scaleX = scale[0] as number;
              const scaleY = scale[3] as number;
              if (GMath.isEqualEps(across.getY(), 0)) {
                b = 0;
                a = 1 / across.getX();
              } else a = (-(b = across.getY() / cross) * up.getY()) / across.getY();
              if (GMath.isEqualEps(across.getX(), 0)) {
                d = 0;
                c = 1 / across.getY();
              } else c = (-(d = -across.getX() / cross) * up.getX()) / across.getX();
              if (GMath.isEqualEps(a + b, 0) || GMath.isEqualEps(c + d, 0)) scaleContent = true;
              else {
                const a1 = a / (a + b);
                const b1 = b / (a + b);
                const c1 = c / (c + d);
                const d1 = d / (c + d);
                const sourceCenter = source.getSide(Rect.Side.CENTER);
                delta = new Transform(1, 0, 0, 1, -sourceCenter.getX(), -sourceCenter.getY())
                  .multiplied(new Transform(a1 * scaleX + b1, 0, 0, b1 * scaleX + a1, 0, 0))
                  .multiplied(new Transform(c1 * scaleY + d1, 0, 0, d1 * scaleY + c1, 0, 0))
                  .multiplied(new Transform(1, 0, 0, 1, sourceCenter.getX(), sourceCenter.getY()));
                ownInverse = own ? own.inverted() : null;
                if (ownInverse) delta = delta.multiplied(own as Transform);
                center = parts.scalation.mapPoint(center);
                delta = delta
                  .multiplied(parts.rotation)
                  .multiplied(parts.scalation)
                  .multiplied(new Transform(1, 0, 0, 1, -center.getX(), -center.getY()))
                  .multiplied(parts.scalation.inverted() as Transform)
                  .multiplied(new Transform(1, 0, 0, 1, center.getX(), center.getY()))
                  .multiplied(parts.rotationBack)
                  .multiplied(parts.translation);
                if (ownInverse) delta = delta.multiplied(ownInverse);
              }
            }
          } else scaleContent = true;
        }
        if (scaleContent) {
          this.setProperties(["trf"], [this.$trf ? this.$trf.multiplied(transform) : transform]);
        } else {
          if (this.dependentUpdate) this._noAnchoringPropsUpdate = true;
          delta = this.transformSourceBBox(delta, false, false, true, true);
          if (this.dependentUpdate && delta) {
            const anchored = ownInverse
              ? ownInverse.multiplied(delta).multiplied(own as Transform)
              : delta;
            if (this.getProperty("hacr")) {
              let horizontal = this.getProperty("hstrf") as Transform | null;
              horizontal = horizontal ? horizontal.multiplied(anchored) : anchored;
              this.setProperty("hstrf", horizontal);
            }
            if (this.getProperty("vacr")) {
              let vertical = this.getProperty("vstrf") as Transform | null;
              vertical = vertical ? vertical.multiplied(anchored) : anchored;
              this.setProperty("vstrf", vertical);
            }
            this._noAnchoringPropsUpdate = false;
          }
        }
        this._relayout = true;
        // GElement.Transform's transform (moves the children), not GShape's.
        if (this.isTransformChildren(transform, force)) {
          this._transformChildren(transform, force, exceptions);
        }
        if (this._relayoutNow) {
          this._layoutAnchorContents(null, null, this._layoutTransform);
          this._layoutTransform = null;
          this._relayoutNow = false;
        }
      }
      if (transform && !transform.isIdentity() && this.isFakeText()) {
        each(this._backupPaths(), (_index, path) => {
          path.transform(transform);
        });
      }
    } catch (error) {
      console.warn("ERROR during text rendering:" + (error as Error).message);
    } finally {
      this.endUpdate();
    }
  }

  /** The texture transform of a fill or border pattern, as GText maps gradients. */
  _textPaintTransform(
    layer: PaintLayer,
    shapePaint: ShapePaint,
    patternBox: Rect | null,
    scale: number,
  ): void {
    const pattern = layer.$_pt;
    if (pattern && pattern instanceof Gradient && pattern.getTransform()) {
      const boxTransform = patternBox
        ? Transform.getNativeRectTransformation(patternBox)
        : new Transform();
      const gradientTransform = pattern.getTransform() as Transform;
      const translation = gradientTransform.getTranslation();
      const width = patternBox ? patternBox.getWidth() : 1;
      const height = patternBox ? patternBox.getHeight() : 1;
      shapePaint.transform = gradientTransform
        .multiplied(
          new Transform(
            scale,
            0,
            0,
            scale,
            -scale * translation.getX(),
            -scale * translation.getY(),
          ),
        )
        .multiplied(boxTransform)
        .multiplied(
          new Transform(
            1 / scale,
            0,
            0,
            1 / scale,
            translation.getX() * width * scale,
            translation.getY() * height * scale,
          ),
        );
    }
    if (layer.$_px && !layer.$_px.isIdentity()) {
      shapePaint.transform = (shapePaint.transform as Transform).preMultiplied(layer.$_px);
    }
  }

  /**
   * Paints the text fill: lets the core render the glyphs into its fill
   * canvas (again when the resolution, the layout or the fill changed)
   * and draws that bitmap through a style canvas.
   */
  _paintTextFill(context: ShapePaintContext, fill: PaintLayer): void {
    const core = this.getTLCore();
    if (core) {
      let shapePaint: ShapePaint | null | undefined = null;
      const includeInvisible = context.isIncludingInvisible();
      const patternBox = this.getPatternBBox(includeInvisible);
      const layers = this.getPaintLayers();
      if (layers && layers.hasStyleFill()) {
        shapePaint = this.createShapePaint(context, fill.$_pt, patternBox);
      }
      const canvas = this._createStyleCanvas(
        context,
        this.getPaintBBox(false, null, includeInvisible) as Rect,
      );
      const previous = context.pushCanvas(canvas) as PaintCanvas;
      const scale = (canvas.getScale() as number) * (this.$trf ? this.$trf.getScaleFactor() : 1);
      try {
        let bitmap = core.getCanvas(RenderFlags.RENDERFLAG_FILL);
        const rendered = !!bitmap;
        if (
          1 * scale !== this._lastResolutionFill ||
          this._runsDirty ||
          !rendered ||
          (this._lastFillPaintLayer !== fill &&
            ((fill && fill.hasStyle()) ||
              (this._lastFillPaintLayer && this._lastFillPaintLayer.hasStyle())))
        ) {
          if (shapePaint && shapePaint.transform) {
            this._textPaintTransform(fill, shapePaint, patternBox, scale);
          }
          const style: TLRenderStyle & Dict = {
            shapePaint: shapePaint ? shapePaint.paint : null,
            paintTransform: shapePaint ? shapePaint.transform : null,
            opacity: shapePaint ? fill.$_op : 1,
            objTransform: this.$trf,
            evenodd: this._isEvenOddFill(),
            valign: this.$va,
          };
          core.render(
            this._isEdited,
            1 * scale,
            style,
            RenderFlags.RENDERFLAG_FILL |
              RenderFlags.RENDERFLAG_VERTEX |
              RenderFlags.RENDERFLAG_SCALEBITMAP,
          );
          bitmap = core.getCanvas(RenderFlags.RENDERFLAG_FILL);
          this._lastResolutionFill = 1 * scale;
          this._lastFillPaintLayer = fill;
        }
        const saved = canvas.getTransform(true);
        const inverseScale = 1 / (1 * scale);
        const unscale = new Transform(inverseScale, 0, 0, inverseScale, 0, 0);
        const view = (
          this.$trf ? saved.preMultiplied(this.$trf) : transformOf(saved.getMatrix())
        ).preMultiplied(unscale);
        canvas.setTransform(view);
        const correction = canvas.getTranslateCorrection(
          new Point(0, 0),
          canvas.getTransform().getTranslation(),
        );
        if (bitmap && bitmap.width * bitmap.height > 0) {
          try {
            canvas.drawImage(
              bitmap,
              Text.HMARGIN + correction.getX() - (core.getLeftPadding() as number) * scale,
              Text.VMARGIN + correction.getY() - core.getTopPadding() * scale,
              false,
            );
            canvas.setTransform(saved);
            // The old code read a pixel here on desktop browsers (to flush
            // the canvas); kept.
            if (System.hardware === System.Hardware.Desktop && !isNode()) {
              previous.getBitmap().getPixelValue(0, 0);
            }
            previous.drawCanvas(canvas, 0, 0, 1, fill.getBlendingForContext(context as never));
          } catch {
            // Ignored like before.
          }
        }
      } catch (error) {
        console.warn("ERROR during text rendering:" + (error as Error).message);
      } finally {
        canvas.finish();
        context.popCanvas();
      }
    }
  }

  /**
   * Paints a text border: the core strokes the glyphs into its stroke
   * canvas, drawn like the fill. In outline mode the outlines are stroked.
   */
  override _paintBorder(
    context: ShapePaintContext,
    separate: boolean,
    border: BorderPaintLayer | null,
  ): void {
    void separate;
    const core = this.getTLCore();
    if (core) {
      const outline = context.configuration.isOutline(context as never);
      if (!outline && this.hasStyleBorder()) {
        const layer = border as BorderPaintLayer;
        const includeInvisible = context.isIncludingInvisible();
        let patternBox = this.getPatternBBox(includeInvisible);
        const canvas = this._createStyleCanvas(
          context,
          this.getPaintBBox(false, null, includeInvisible) as Rect,
        );
        const previous = context.pushCanvas(canvas) as PaintCanvas;
        const scale = (canvas.getScale() as number) * (this.$trf ? this.$trf.getScaleFactor() : 1);
        // `$_ba` of the text itself is never set; kept.
        if (patternBox && (this as unknown as { $_ba: unknown }).$_ba !== BorderAlignment.Inside) {
          let reach = layer.$_bw;
          if (layer.$_ba === Stylable.BorderAlignment.Center) reach *= 0.5;
          if (this.$trf) {
            reach /= this.$trf.getScaleFactor();
            patternBox = patternBox.expanded(reach, reach, reach, reach);
          } else patternBox = patternBox.expanded(reach, reach, reach, reach);
        }
        const shapePaint = this.createShapePaint(context, layer.$_pt, patternBox);
        if (shapePaint && shapePaint.paint) {
          let width = layer.$_bw;
          let borderArea: Rect | null = null;
          try {
            let bitmap = core.getCanvas(RenderFlags.RENDERFLAG_STROKE);
            const rendered = true;
            if (
              1 * scale !== this._lastResolutionBorder ||
              this._runsDirty ||
              !rendered ||
              (this._lastBorderPaintLayer !== layer &&
                ((layer && layer.hasStyle()) ||
                  (this._lastBorderPaintLayer && this._lastBorderPaintLayer.hasStyle())))
            ) {
              if (layer.$_ba !== Stylable.BorderAlignment.Center) width *= 2;
              if (shapePaint.transform && shapePaint.transform.isValid()) {
                this._textPaintTransform(layer, shapePaint, patternBox, scale);
                let area = this.getSourceBBox(includeInvisible) as Rect;
                const padding = this.getStyleBorderPadding(layer);
                if (padding) area = area.expanded(padding, padding, padding, padding);
                width /= (shapePaint.transform as Transform).getScaleFactor();
                borderArea = area;
              }
              const style: TLRenderStyle & Dict = {
                shapePaint: shapePaint.paint,
                paintTransform: shapePaint.transform,
                opacity: layer.$_op,
                objTransform: this.$trf,
                strokeWidth: width,
                lineJoin: layer.$_blj as string,
                miterLimit: layer.$_bml as number,
                lineCap: layer.$_blc as string,
                strokeAlign: layer.$_ba,
                borderArea,
                valign: this.$va,
              };
              core.render(
                this._isEdited,
                1 * scale,
                style,
                RenderFlags.RENDERFLAG_STROKE |
                  RenderFlags.RENDERFLAG_VERTEX |
                  RenderFlags.RENDERFLAG_SCALEBITMAP,
              );
              bitmap = core.getCanvas(RenderFlags.RENDERFLAG_STROKE);
              this._lastResolutionBorder = 1 * scale;
              this._lastBorderPaintLayer = layer;
            }
            const saved = canvas.getTransform(true);
            const inverseScale = 1 / (1 * scale);
            const unscale = new Transform(inverseScale, 0, 0, inverseScale, 0, 0);
            const view = (
              this.$trf ? saved.preMultiplied(this.$trf) : transformOf(saved.getMatrix())
            ).preMultiplied(unscale);
            canvas.setTransform(view);
            const correction = canvas.getTranslateCorrection(
              new Point(0, 0),
              canvas.getTransform().getTranslation(),
            );
            if (bitmap && bitmap.width * bitmap.height > 0) {
              try {
                canvas.drawImage(
                  bitmap,
                  Text.HMARGIN + correction.getX() - (core.getLeftPadding() as number) * scale,
                  Text.VMARGIN + correction.getY() - core.getTopPadding() * scale,
                  false,
                );
                canvas.setTransform(saved);
                previous.drawCanvas(
                  canvas,
                  0,
                  0,
                  null as unknown as number,
                  layer.getBlendingForContext(context as never),
                );
              } catch {
                // Ignored like before.
              }
            }
          } catch (error) {
            console.warn("ERROR during text rendering:" + (error as Error).message);
          } finally {
            canvas.finish();
            context.popCanvas();
          }
        }
      } else if (outline) {
        const view = context.canvas.resetTransform() as Transform;
        const source = new VertexTransformer(this as unknown as VertexReader, view);
        context.canvas.putVertices(source);
        context.canvas.strokeVertices(context.getOutlineColor());
        context.canvas.setTransform(view);
      }
    }
  }

  /** A background paints the root canvas, mapped through the text box; else as shapes do. */
  override createShapePaint(
    context: ShapePaintContext,
    pattern: Pattern | null | undefined,
    bbox?: Rect | null,
  ): ShapePaint | null | undefined {
    if (pattern instanceof Background) {
      const root = context.getRootCanvas();
      if (!root) return null;
      const origin = root.getOrigin() as Point;
      const scale = root.getScale() as number;
      let transform = new Transform();
      const ownScale = this.$trf ? this.$trf.getScaleFactor() : 1;
      transform = transform
        .scaled(1 / scale, 1 / scale)
        .translated(origin.getX() * ownScale, origin.getY() * ownScale);
      if (this.$trf && this.$trf.invertible()) {
        const inverse = this.$trf.inverted() as Transform;
        const translation = inverse.getTranslation();
        transform = transform
          .multiplied(inverse)
          .translated(-translation.getX(), -translation.getY())
          .translated(translation.getX() * scale * ownScale, translation.getY() * scale * ownScale)
          .translated(-Text.HMARGIN, -Text.VMARGIN);
      }
      this._resetFxCacheAndState();
      return {
        paint: context.canvas.createTexture(root, TexturePattern.RepeatMode.None),
        transform,
      };
    }
    return super.createShapePaint(context, pattern, bbox);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  _getClipBox(context: PaintContext): Rect | null {
    return null;
  }

  override _requireMiterLimitApproximation(): unknown {
    return true;
  }

  /** Waits for `font` (listens to the font manager until it is available). */
  _requireResolvedFont(font: Font | null): void {
    if (this._fontsToResolve) {
      for (let i = 0; i < this._fontsToResolve.length; ++i) {
        if (Font.equals(this._fontsToResolve[i], font)) return;
      }
    }
    this._fontsToResolve = this._fontsToResolve || [];
    this._fontsToResolve.push(font);
    this._updateFontManagerListener();
  }

  /** Listens to FontAvailableEvent while fonts are missing; `remove` stops listening. */
  _updateFontManagerListener(remove?: boolean): void {
    if (this._workspace) {
      if ((this._fontsToResolve && !remove) || !this._hasFontManagerListener) {
        if (this._fontsToResolve && !this._hasFontManagerListener) {
          this._hasFontManagerListener = true;
          this._fontManager().addEventListener(
            FontManager.FontAvailableEvent,
            this._fontAvailableEvent,
            this,
          );
        }
      } else {
        this._fontManager().removeEventListener(
          FontManager.FontAvailableEvent,
          this._fontAvailableEvent,
          this,
        );
        this._hasFontManagerListener = false;
      }
    }
  }

  /** A font arrived: retries the deferred setters and the waiting text, then lays out again. */
  _fontAvailableEvent(event: FontAvailableEvent): void {
    let changed = false;
    if (this._workspace) {
      const defaultFont = this._fontManager().getDefaultFont();
      if (defaultFont) {
        if (this._fontsToResolve) {
          for (let i = this._fontsToResolve.length - 1; i >= 0; --i) {
            if (
              (Font.equals((this._fontsToResolve as Font[])[i], event.font) ||
                ((this._fontsToResolve as Font[])[i] === Text.DEFAULTFONT &&
                  Font.equals(event.font, defaultFont))) &&
              ((this._fontsToResolve as Font[]).splice(i, 1),
              0 === (this._fontsToResolve as Font[]).length &&
                ((this._fontsToResolve = null), this._updateFontManagerListener()),
              (changed = true),
              this._deferredRangeSetters)
            ) {
              for (let r = this._deferredRangeSetters.length - 1; r >= 0; --r) {
                const setter = this._deferredRangeSetters[r] as DeferredRangeSetter;
                if (setter.func.call(this, setter.vars)) this._deferredRangeSetters.splice(r, 1);
              }
            }
          }
        }
        if (changed) {
          if (this._setTextWhenAvailable && null === this._fontsToResolve) {
            this._setTextWhenAvailable = false;
            if (this.$content) this.setText(parseContent(this.$content), true);
          }
          this._runsDirty = true;
          this._verticesDirty = true;
          this._resetFxCacheAndState();
          if (this.hasPathAttached()) this.attachPath(this._attachedPath);
          this._notifyChange(ElementChange.PrepareGeometryUpdate);
          this._notifyChange(ElementChange.FinishGeometryUpdate);
        }
      }
    } else this._waitForWorkspace = true;
  }

  /**
   * Fits the font size to the fixed text box (binary search in steps of
   * 0.1 between 6 and 72 around the current size).
   */
  adaptFontSizeToFitBBox(): void {
    if (!(
      this.isFakeText() ||
      this.hasPathAttached() ||
      this.getProperty("aw") ||
      this.getProperty("ah")
    )) {
      const core = this.getTLCore();
      if (core) {
        const box = this.getGeometryBBox();
        if (box) {
          const actual = core.getActualBounds();
          if (actual && (!this._lastActualBounds || this._lastActualBounds.b !== actual.b)) {
            this._lastActualBounds = actual;
            let low: number;
            let high: number;
            const size =
              (this.getProperty("_tfi") as number) || Formatting.defaultFormatting.fontSize;
            const ratio = box.getHeight() / actual.b;
            if (ratio > 1) {
              low = Math.max(6, Math.floor(size));
              high = Math.min(72, Math.ceil(size * ratio) + 5);
            } else {
              low = Math.max(6, Math.floor(size * ratio) - 5);
              high = Math.ceil(size);
            }
            let best = size;
            let from = 0;
            let to = (high - low) / 0.1;
            while (from <= to) {
              const middle = Math.ceil(from + (to - from) / 2);
              const candidate = low + 0.1 * middle;
              const document = core.cloneDocument();
              document.documentRange().setFormatting("fontSize", candidate);
              const bounds = document.realBounds();
              if (!bounds) break;
              if (bounds.b <= box.getHeight() + 2) {
                from = middle + 1;
                best = candidate;
              } else to = middle - 1;
            }
            if (best !== size) this.setProperty("_tfi", best);
          }
        }
      }
    }
  }

  override toString(): string {
    return "[GText]";
  }
}

const textPrototype = Text.prototype;
textPrototype._tempText = null;
textPrototype._startText = null;
textPrototype._setTextWhenAvailable = false;
textPrototype._lastResolutionFill = -1;
textPrototype._lastResolutionBorder = -1;
textPrototype._attachedPath = null;
textPrototype._pendingAttachedPath = null;
textPrototype._oldTrf = null;
textPrototype._lastFillPaintLayer = null;
textPrototype._lastBorderPaintLayer = null;
textPrototype._legacyHeight = false;
textPrototype._repairedHeight = false;
textPrototype._addedDestroyable = false;
textPrototype._lastActualBounds = null;
textPrototype._hasStyleBorderPadding = false;
textPrototype._fontsToResolve = null;
textPrototype._deferredRangeSetters = null;
textPrototype._waitForWorkspace = false;
textPrototype._deferredRestore = null;
textPrototype._pendingProperties = null;
textPrototype._hasFontManagerListener = false;
textPrototype._verticalShift = 0;
textPrototype._runs = null;
textPrototype._runsDirty = false;
textPrototype._verticesDirty = false;
textPrototype._tlCore = null;
textPrototype._resolution = 1;
textPrototype._vertexContainer = null as unknown as VertexContainer;
textPrototype._isVirgin = true;
textPrototype._vertexIterator = 0;
textPrototype._hasEmbeddedFonts = false;
textPrototype._isEdited = false;
textPrototype._contentChangedHandler = null;
textPrototype.deferredLoadHandler = null;
textPrototype._serializedBackupPaths = null;
textPrototype.__deserializedBackupPaths = null;
