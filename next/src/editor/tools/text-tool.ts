// Old: chunk.vendor.js module 547 (GTextTool).
/**
 * Creates texts. A drag draws a fixed-size text box, a click places an
 * auto-sized text ("Your text here"); either way the new text opens in
 * the inline editor. Over an existing text the tool shows the text cursor
 * and a click edits that text with the pointer tool. A click on the
 * outline of a path (highlighted while hovering) puts the new text on
 * that path.
 *
 * While dragging, the shape being drawn is a stand-in text of 1 x 1 that
 * is removed again at the end; the real text is made on drag end from the
 * drawn box (_insertShape).
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { PathUtil } from "../../engine/geometry/path-util.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import type { Element } from "../../engine/scene/element.ts";
import { Image } from "../../engine/scene/image.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import { openTypeMeasure } from "../../engine/text/gtl/measure.ts";
import type { Measurement } from "../../engine/text/gtl/measurement.ts";
import { Text } from "../../engine/text/text.ts";
import { TLPathTextTransformer } from "../../engine/text/tl-path-text-transformer.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import "../element-editors/text-editor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { PointerTool } from "./pointer-tool.ts";
import { ShapeTool, type DrawnShape } from "./shape-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

/** The vertex hit of a path's hit test (`data.vertex`). */
interface OutlineHitData {
  vertex: { x: number | null; y: number | null };
}

/** The default text's measurement; see _getDefaultMeasure. */
type DefaultMeasure = Partial<Pick<Measurement, "height">>;

const yourTextHere = (): string =>
  Locale.get(new LocaleKey("GTextTool", "your-text-here")) as string;
const insertTextName = (): string =>
  Locale.get(new LocaleKey("GTextTool", "action.insert-text")) as string;

export class TextTool extends ShapeTool {
  static {
    registerClass(this, "GTextTool");
  }

  _textUnderMouse: Text | null = null;
  _pathUnderMouse: Shape | null = null;
  /** Where the outline of _pathUnderMouse was hit (view coordinates). */
  _pathHit: Point | null = null;
  _justCreatedText: Text | null = null;
  _defaultMeasure: DefaultMeasure | null = null;
  /** The stand-in text shown while a text box is dragged out. */
  declare _fakeShape: Text | null | undefined;

  constructor() {
    super(true, true);
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    super.deactivate(view, light);
    if (this._pathUnderMouse) {
      this._pathUnderMouse.removeFlag(NodeFlag.Highlighted);
      this._pathUnderMouse = null;
    }
  }

  override getCursor(): string | null {
    return this._textUnderMouse ? Cursor.Text : this._shape ? super.getCursor() : Cursor.Cross;
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return Text;
  }

  /**
   * Over a text: activates the pointer tool, selects the text with it
   * unless it is selected, and opens the text's inline editor at the
   * click. Otherwise the shape tool's release, and the text just made
   * opens in the inline editor 10 ms later.
   */
  override _mouseRelease(event: MouseEvent): void {
    const editor = this._editor;
    const view = this._view;
    editor.getGuides().invalidate();
    if (this._textUnderMouse) {
      const manager = this._manager as ToolManager;
      manager.activateTool(PointerTool);
      if (!this._textUnderMouse.hasFlag(NodeFlag.Selected)) {
        PointerTool.prototype._mouseDown.call(manager.getActiveTool() as PointerTool, event);
        PointerTool.prototype._mouseRelease.call(manager.getActiveTool() as PointerTool, event);
      }
      // The editor's EdNode stand-in types getParent more narrowly than
      // the scene's Text (a ContainerNode); a Text is a valid EdNode.
      editor.openInlineEditor(this._textUnderMouse as never, view, event.client);
    } else {
      super._mouseRelease(event);
      if (this._pathUnderMouse) {
        this._pathUnderMouse.removeFlag(NodeFlag.Highlighted);
        this._pathUnderMouse = null;
      }
      if (this._justCreatedText) {
        const text = this._justCreatedText;
        this._justCreatedText = null;
        setTimeout(() => {
          // Text vs. the editor's EdNode stand-in, as above.
          editor.openInlineEditor(text as never, view);
        }, 10);
      }
    }
  }

  /**
   * Looks for a text (exact hit) or a path outline (within the pick
   * distance) under the pointer, unless a text box is being drawn.
   */
  override _mouseMove(event: MouseEvent): void {
    if (this._textUnderMouse) {
      this._textUnderMouse = null;
      this.updateCursor();
    }
    if (this._pathUnderMouse) {
      this._pathUnderMouse.removeFlag(NodeFlag.Highlighted);
      this._pathUnderMouse = null;
    }
    if (this._shape) return;
    const multiPageView = this._view.getViewConfiguration().multiPageView;
    let hits = this._scene.hitTest(
      event.client,
      this._view.getWorldTransform(this._scene),
      null,
      false,
      -1,
      0,
      false,
      null,
      false,
      false,
      multiPageView,
    );
    // The old code keeps the exact hit only when it is both a Text and a
    // Path. A Text is never a Path, so this condition is never true and the
    // second hit test, with the pick distance, always runs. Kept on
    // purpose: "fixing" it would change what the tool hovers.
    if (!(
      hits &&
      hits.length &&
      hits[0]?.element instanceof Text &&
      hits[0].element instanceof Path
    ))
      hits = this._scene.hitTest(
        event.client,
        this._view.getWorldTransform(this._scene),
        null,
        false,
        -1,
        EditorOptions.pickDistance,
        false,
        null,
        false,
        false,
        multiPageView,
      );
    const hit = hits && hits.length ? hits[0] : null;
    if (hit) {
      const element: Element = hit.element;
      if (element instanceof Text) {
        this._textUnderMouse = element;
        this.updateCursor();
      } else if (
        element instanceof Shape &&
        !(element instanceof Image) &&
        !(element instanceof CompoundPath) &&
        !(element instanceof PathsGraph) &&
        null !== (hit.data as OutlineHitData).vertex.x
      ) {
        const vertex = (hit.data as OutlineHitData).vertex;
        this._pathUnderMouse = element;
        this._pathHit = new Point(vertex.x as number, vertex.y as number);
        this._pathUnderMouse.setFlag(NodeFlag.Highlighted);
      }
    }
  }

  /** The stand-in: a 1 x 1 text box. */
  override _createShape(): DrawnShape | null {
    const text = new Text();
    text.setProperties(["w", "h", "aw", "ah"], [1, 1, false, false]);
    return text as unknown as DrawnShape;
  }

  /** A preview maps the unit box onto the area; otherwise the unit circle's box. */
  override _updateShape(
    shape: DrawnShape,
    area: Rect | null,
    line: Point[] | null,
    preview?: boolean,
  ): boolean {
    void line;
    if (!area) return false;
    if (preview)
      shape.setProperty(
        "trf",
        new Transform(area.getWidth(), 0, 0, area.getHeight(), area.getX(), area.getY()),
      );
    else
      shape.setProperty(
        "trf",
        new Transform(
          area.getWidth() / 2,
          0,
          0,
          area.getHeight() / 2,
          area.getX() + area.getWidth() / 2,
          area.getY() + area.getHeight() / 2,
        ),
      );
    return true;
  }

  /**
   * At drag start (`preview`) the stand-in goes in without a transaction.
   * At drag end the stand-in is removed and the real text is made from
   * its box: narrower than 4 it gets an auto width, at most the default
   * text's line height high an auto height.
   */
  override _insertShape(shape: DrawnShape | null, preview?: boolean): boolean {
    let inserted = false;
    if (preview) {
      if (shape) {
        this._fakeShape = shape as unknown as Text;
        super._insertShape(shape, false, true);
      }
    } else {
      if (this._fakeShape) {
        const parent = this._fakeShape.getParent();
        if (parent) parent.removeChild(this._fakeShape);
        this._fakeShape = null;
      }
      const text = new Text();
      const transform = shape && (shape.getProperty("trf") as Transform | null);
      if (transform) {
        let lineHeight: number | undefined = 0;
        const measure = this._getDefaultMeasure(text);
        if (measure) lineHeight = measure.height;
        const matrix = transform.getMatrix();
        const autoWidth = (matrix[0] as number) < 4;
        const autoHeight = (matrix[3] as number) <= (lineHeight as number);
        text.setProperties(["aw", "ah"], [autoWidth, autoHeight]);
        text.transformSourceBBox(transform, !autoWidth, !autoHeight);
      } else text.setProperties(["aw", "ah"], [false, false]);
      text.setText(yourTextHere(), true, true);
      inserted = this._insertText(text);
      this._justCreatedText = text;
    }
    return inserted;
  }

  override _showMousePositionInlineHint(): boolean {
    return true;
  }

  override _showAreaInlineHint(): boolean {
    return true;
  }

  override _hasCenterCross(): boolean {
    return true;
  }

  /**
   * A click: an auto-sized text at `point`, or on the highlighted path,
   * which a non-path shape is first turned into (replacing the shape).
   */
  override _createShapeManually(point: Point): void {
    const text = new Text();
    const place = new Transform(1, 0, 0, 1, point.getX(), point.getY());
    text.transformSourceBBox(place);
    text.setText(yourTextHere(), true, true);
    try {
      this._editor.beginTransaction();
      this._insertText(text, true);
      if (this._pathUnderMouse) {
        let path: Shape | null = null;
        if (this._pathUnderMouse instanceof PathBase) path = this._pathUnderMouse;
        else if (
          (path = PathUtil.createPathFromVertexSource(
            this._pathUnderMouse,
          ) as Shape | null) instanceof Path
        ) {
          const source = this._pathUnderMouse;
          const sourceTransform = source.$trf;
          source.$trf = null;
          path.assignFrom(source);
          if (source instanceof PathBase) {
            (path as Path).$evenodd = source.getProperty("evenodd") as boolean;
            (path as Path).$closed = source.getProperty("closed") as boolean;
          }
          source.$trf = sourceTransform;
          const parent = source.getParent() as ContainerNode;
          const next = source.getNext();
          parent.removeChild(source);
          parent.insertChild(path, next);
        } else path = null;
        if (path) {
          const copy = path.clone();
          this._scene.link(text, path);
          // path is a PathBase or a Path here, both TextBasePaths; its Shape
          // type doesn't say so.
          const transformer = new TLPathTextTransformer(null, copy as never);
          transformer.getMatrix(0, 0, new Rect());
          const hit = (
            this._view
              .getWorldTransform(this._view.getScene().getActivePage())
              .inverted() as Transform
          ).mapPoint(this._pathHit as Point);
          const origin = Transform.getNativeRectTransformation(
            path.getGeometryBBox() as Rect,
          ).getTranslation();
          const offset = transformer.inverseTransform(hit.subtract(origin));
          text.setProperties(["tpthl", "tpths"], [offset.getX(), TLPathTextTransformer.OUTSIDE]);
        }
      }
    } finally {
      this._editor.commitTransaction(insertTextName());
    }
    this._justCreatedText = text;
  }

  _insertText(text: Text, noTransaction?: boolean): boolean {
    return super._insertShape(
      text as unknown as DrawnShape,
      false,
      noTransaction,
      insertTextName(),
    );
  }

  /**
   * The measurement of "Your text here" in the default text's font, made
   * once the font is resolved. Until then (the meter returns null) it is
   * an empty object, whose height is undefined, and the next call measures
   * again. The old code kept that empty object for good (BUG-051 The text
   * tool caches an empty default measure for the session).
   */
  _getDefaultMeasure(text: Text): DefaultMeasure | null {
    if (!this._defaultMeasure) {
      const workspace = this._scene && this._scene.getWorkspace();
      const fontManager = workspace && workspace.getFontManager();
      if (fontManager) {
        const parts: unknown[] = [];
        parts.push(text.getProperty("_tfs") === Font.Style.Normal ? "normal" : "italic");
        parts.push(text.getProperty("_tfw"));
        parts.push(String(text.getProperty("_tfi")) + "px");
        parts.push(text.getProperty("_tff"));
        const style = "font: " + parts.join(" ");
        const measure = openTypeMeasure(yourTextHere(), style, null, fontManager);
        if (!measure) return {};
        this._defaultMeasure = measure;
      }
    }
    return this._defaultMeasure;
  }

  override toString(): string {
    return "[Object GTextTool]";
  }
}
