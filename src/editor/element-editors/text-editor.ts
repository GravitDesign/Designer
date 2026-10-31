// Old: chunk.vendor.js module 387 (GTextEditor).
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Key } from "../../engine/core/key.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { getTypeId, registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { System } from "../../engine/core/system.ts";
import { replaceMicrosoftLineFeed, unique, uuid } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Font } from "../../engine/text/fonts/font.ts";

/**
 * GFont.Weight has no Normal, so the old check against it compared with
 * undefined and never held; see "Bold toggle checks a weight that doesn't
 * exist" in QUESTIONS.md.
 */
const WEIGHT_NORMAL = (Font.Weight as Record<string, number | undefined>).Normal;
import type { Selection } from "../../engine/text/gtl/document.ts";
import type { TLBox, TLCore } from "../../engine/text/gtl/tl-core.ts";
import { TLUtil } from "../../engine/text/gtl/tl-util.ts";
import { Text } from "../../engine/text/text.ts";
import { TLPathTextTransformer } from "../../engine/text/tl-path-text-transformer.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { BoxEditor, type EdTransformOptions } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import {
  InlineTextEditor,
  type CaretBox,
  type DomKeyEvent,
  type InlineEditView,
} from "./inline-text-editor.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

/** The text as the editor drives it. */
type EditedText = Text & EditedShape;

/** A text box (or caret, or selection box) mapped by the path or direction transformer. */
type TextBox = TLBox | CaretBox;

/** Part data of a resize handle (BoxEditor). */
interface ResizeData {
  side: string;
}

/** The text-on-path transformer calls the editor makes. */
interface PathTransformer {
  getBoxOrigin(): Point | null;
  inverseTransform(point: Point, noShift?: boolean): Point;
}

/** A matrix-producing transformer (path or direction). */
interface MatrixTransformer {
  getMatrix(x: number, y: number, box: Rect): Transform | null;
}

/**
 * GElement.Transform's own preTransform, run on a text: it maps the
 * transform into the element's space and passes it on to the children
 * only. The old resize code called the mixin method directly
 * (`GElement.Transform.prototype.preTransform.call(text, ...)`) instead of
 * text.preTransform, which goes through Shape.preTransform and would
 * multiply the resize into `trf` a second time after transformSourceBBox
 * already applied it. The mixin has no prototype of its own here, so its
 * body is repeated; isTransformChildren and _transformChildren dispatch
 * through the element as they did in the old code.
 */
function preTransformChildrenOnly(element: EditedText, transform: Transform, extra: unknown): void {
  const exceptions = extra as Parameters<EditedText["preTransform"]>[2];
  if (element.isTransformChildren(transform, false)) {
    const own = element.getProperty("trf") as Transform | null;
    const mapped =
      own && own.invertible()
        ? (own.inverted() as Transform).multiplied(transform).multiplied(own)
        : transform;
    element._transformChildren(mapped, false, exceptions);
  }
}

/**
 * The editor of a text: text box resizing (auto width and height, scale
 * content), the text-on-path start handle, inline editing through an
 * InlineTextEditor, and the bold and italic hotkeys.
 */
export class TextEditor extends ShapeEditor<EditedText> {
  static {
    registerClass(this, "GTextEditor");
    ElementEditor.exports(this, Text);
  }

  static DISTANCE_HANDLER_ID = uuid();

  declare _inlineEditor: InlineTextEditor | null;
  declare _dontSetContent: boolean;
  declare _currentRangeFormatting: unknown;
  /** Whether the transform in progress scales the contents (`sc`, rotation). */
  declare _fullContentsTransform: boolean;
  declare _view: unknown;
  declare _inlineEditEnabled: boolean;
  declare _toggles: Record<string, string>;
  declare _nextCaretToggle: number;

  constructor(element: EditedText) {
    // The old constructor set this before the base constructors ran.
    super(element);
    this._inlineEditEnabled = true;
  }

  /** Reads through the inline selection while inline editing. */
  getProperty(
    name: string,
    custom?: boolean,
    defaultValue?: unknown,
    temporary?: boolean,
  ): unknown {
    return this.getElement().getProperty(
      name,
      custom,
      defaultValue,
      temporary,
      this.isInlineEdit(),
    );
  }

  /** Writes to the inline selection while inline editing; `trf` is dropped for text on a path. */
  setProperties(names: string[], values: unknown[], temporary?: boolean): void {
    const attached = this.getElement().hasPathAttached();
    this.getElement().getProperty("trf");
    const index = names.indexOf("trf");
    if (attached && index >= 0) {
      names.splice(index, 1);
      values.splice(index, 1);
      if (!names.length) return;
    }
    this.getElement().setProperties(
      names,
      values,
      false,
      false,
      temporary,
      this.isInlineEdit(),
      false,
    );
  }

  /**
   * The font families in use: the inline selection's, else every run's.
   * The old code assigned the property to an undeclared global
   * `fontProperty`; here it is a local.
   */
  getFonts(): unknown[] | null {
    let fonts: unknown[] | null = [];
    const fontProperty = this.getProperty("_tff");
    if (fontProperty) fonts.push(fontProperty);
    else {
      const key = Text.PropertyMapping._tff as string;
      const content = this.getElement().getContent() as Record<string, unknown>[] | null;
      if (content) {
        for (let i = 0; i < content.length; i++) {
          fonts.push(
            this.getElement()._getGravitValue(key, (content[i] as Record<string, unknown>)[key]),
          );
        }
        fonts = unique(fonts);
      }
    }
    return fonts;
  }

  setProperty(name: string, value: unknown, temporary?: boolean): void {
    this.setProperties([name], [value], temporary);
  }

  hasPathAttached(): boolean {
    return this.getElement().hasPathAttached();
  }

  /** A text never copies the style of another element. */
  override initialSetup(): void {
    super.initialSetup(null);
  }

  override acceptDrop(position: unknown, type: unknown, source: unknown, hit: unknown): boolean {
    if (super.acceptDrop(position, type, source, hit)) return true;
    if (type === ElementEditor.DropType.FontFamily) {
      const editor = Editor.getEditor(this.getElement().getScene());
      if (editor) {
        editor.beginTransaction();
        try {
          this.getElement().setProperty("_tff", source);
        } finally {
          editor.commitTransaction(Locale.get(new LocaleKey("GTextEditor", "action.drop-font")));
        }
      }
      return true;
    }
    return false;
  }

  override _detach(): void {
    if (this.isInlineEdit()) {
      const element = this.getElement();
      if (!element) return;
      const editor = Editor.getEditor(element.getScene());
      if (editor) editor.closeInlineEditor();
    }
  }

  /** Ctrl/Cmd+B and Ctrl/Cmd+I toggle bold and italic of the whole text (not inline). */
  override handleKeyEvent(event: unknown): void {
    if (!this.isInlineEdit() && event instanceof KeyEvent.Down) {
      const key = event.key as string;
      const ctrl = Platform.modifiers.metaKey;
      const shift = Platform.modifiers.shiftKey;
      const core = this.getElement().getTLCore() as TLCore;
      const editor = Editor.getEditor(this.getElement().getScene()) as Editor;
      const toggle = this._toggles[key];
      if (ctrl && !shift && toggle) {
        let style: unknown;
        let weight: unknown;
        let next: unknown;
        let applies: boolean | undefined;
        const current = (
          core.getDocumentRange().getFormatting() as unknown as Record<string, unknown>
        )[toggle];
        const fontManager = this.getElement()._fontManager();
        const family = this.getProperty("_tff");
        const variants = fontManager.queryFontFamily(family as string) as
          { style: unknown; weight: unknown }[] | undefined;
        if ("fontWeight" === toggle) {
          style = this.getProperty("_tfs");
          next = weight =
            parseInt(current as string) == Font.Weight.Bold
              ? Font.Weight.Regular
              : Font.Weight.Bold;
          applies =
            next === WEIGHT_NORMAL ||
            void 0 === variants ||
            variants.filter((v) => v.style === style && v.weight === weight).length > 0;
          if (applies) {
            editor.beginTransaction();
            this.setProperties(["_tfw"], [next]);
            editor.commitTransaction(
              Locale.get(new LocaleKey("GTextEditor", "action.modify-text-properties")),
            );
          }
        } else if ("fontStyle" === toggle) {
          weight = this.getProperty("_tfw");
          next = style = "italic" == current ? Font.Style.Normal : Font.Style.Italic;
          applies =
            next === Font.Style.Normal ||
            void 0 === variants ||
            variants.filter((v) => v.style === style && v.weight === weight).length > 0;
          if (applies) {
            editor.beginTransaction();
            this.setProperties(["_tfs"], [next]);
            editor.commitTransaction(
              Locale.get(new LocaleKey("GTextEditor", "action.modify-text-properties")),
            );
          }
        }
        if (applies) this.triggerHotkeyEvent([Key.Constant.CONTROL, key]);
      }
    }
  }

  /** Writes layout changes back to `content` (one "edit-text" step unless `noTransaction`). */
  override _attach(): void {
    const element = this.getElement();
    element.deferredLoadHandler = () => {
      this._triggerSelectionChanged();
    };
    element.contentChangedHandler((noTransaction: unknown) => {
      const text = this.getElement();
      if (text) {
        const core = text.getTLCore() as TLCore;
        const editor = Editor.getEditor(text.getScene());
        const content = core.getRichContent();
        const serialized = JSON.stringify(content);
        const wasEdited = core.getWasEdited();
        if (serialized !== text.getProperty("content")) {
          if (!noTransaction && editor) editor.beginTransaction();
          try {
            // Repaints only the lines the edit changed.
            text._editChange(() => {
              text.setProperties(
                ["content"],
                [serialized],
                false,
                false,
                false,
                false,
                false,
                this._dontSetContent,
              );
            });
            if (text.getProperty("afs")) text.adaptFontSizeToFitBBox();
          } finally {
            if (!noTransaction && editor) {
              editor.commitTransaction(
                Locale.get(new LocaleKey("GTextEditor", "action.edit-text")),
              );
            }
            if (editor && this.isInlineEdit()) {
              setTimeout(() => {
                this._triggerTextEdited({ wasModifiedBefore: wasEdited });
              });
            }
            this.requestInvalidation();
          }
        } else console.log("same content tried set");
      }
    }, true);
  }

  /** The scene's default text style. */
  override getDefaultStyle(): ReturnType<ShapeEditor["getDefaultStyle"]> {
    const element = this.getElement();
    const scene = element.getScene() as unknown as {
      getStyles(): { querySingle(selector: string): ReturnType<ShapeEditor["getDefaultStyle"]> };
    } | null;
    return scene ? scene.getStyles().querySingle('style[_sdf="' + getTypeId(Text) + '"]') : null;
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    if (this._element.hasPathAttached()) {
      const handle = this._getDistHandlePosition(transform) as Point;
      const pick = EditorOptions.annotPickDistance;
      if (
        EditorAnnotation.getAnnotationBBox(
          null,
          handle,
          EditorOptions.annotationHandles.textOnPath.size,
          false,
        )
          .expanded(pick, pick, pick, pick)
          .containsPoint(location)
      ) {
        const part = new PartInfo(this, TextEditor.DISTANCE_HANDLER_ID, null, true, true);
        if (part) return part;
      }
    }
    return super._getPartInfoAt(location, transform, tolerance, extra);
  }

  /** A rectangle with the text's geometry previews a box resize (not on a path). */
  override createElementPreview(): void {
    if (!this._elementPreview && !this.getElement().hasPathAttached()) {
      const box = this._element.getSourceBBox();
      if (box) {
        this._setElementPreview(
          new Rectangle(
            box.getX(),
            box.getY(),
            box.getWidth(),
            box.getHeight(),
          ) as unknown as EditedText,
        );
        (this._elementPreview as unknown as Rectangle).transferProperties(this._element, [
          Shape.GeometryProperties,
        ]);
      }
    }
  }

  /** Text on a path takes translations only. */
  override canApplyTransform(): unknown {
    if (this.hasPathAttached()) {
      if (this._elementPreview) return false;
      if (this._transform) {
        const translation = this._transform.getTranslation();
        if (this._transform.translated(-translation.getX(), -translation.getY()).isIdentity()) {
          return true;
        }
      }
      return false;
    }
    return this._elementPreview || super.canApplyTransform();
  }

  /** A path-attached text moves its path. */
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const text = target as EditedText;
    this._fullContentsTransform = text.getProperty("sc") as boolean;
    super._applyTransform(text.hasPathAttached() ? text._attachedPath : text, ...rest);
  }

  override resetTransform(): void {
    this._fullContentsTransform = false;
    super.resetTransform();
  }

  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    const opts = options as EdTransformOptions | null | undefined;
    this._fullContentsTransform =
      (opts && !!opts.fullContentsTransform) || (this.getElement().getProperty("sc") as boolean);
    // Skips the block editor's version, as the old code did.
    BoxEditor.prototype.edTransform.call(this, transform, partId, partData, options);
  }

  override getPEGeometryBBox(): Rect | null {
    let box: Rect | null = null;
    if (
      this.hasFlag(BaseEditor.Flag.Selected) ||
      this.hasFlag(BaseEditor.Flag.Highlighted) ||
      this.hasFlag(BaseEditor.Flag.Outline)
    ) {
      const element = this.getElement();
      box = element.getSourceBBox();
      const elementTransform = element.getTransform();
      let transform: Transform | null = null;
      if (this._preTransform) transform = this._preTransform;
      if (elementTransform)
        transform = transform ? transform.multiplied(elementTransform) : elementTransform;
      if (this._transform)
        transform = transform ? transform.multiplied(this._transform) : this._transform;
      if (box && transform) box = transform.mapRect(box);
    }
    return box;
  }

  /** Dragging the distance handle moves the text's start along its path (`tpthl`). */
  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    const result = super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    if (partId === TextEditor.DISTANCE_HANDLER_ID) {
      const core = this._element.getTLCore();
      if (!core || !core.getTransformer()) return 0;
      const transformer = core.getTransformer(
        TLPathTextTransformer.TYPE,
      ) as unknown as PathTransformer;
      const origin = transformer.getBoxOrigin();
      if (!origin) return 0;
      let point = viewToWorld.mapPoint(position);
      const own = this._element.getProperty("trf") as Transform | null;
      if (own && own.invertible()) point = (own.inverted() as Transform).mapPoint(point);
      const local = transformer.inverseTransform(point.subtract(origin), true);
      this._element.setProperty(
        "tpthl",
        local.getX() + (this._element.$tpthl || 0),
        null,
        false,
        true,
      );
      this.requestInvalidation();
    }
    return result;
  }

  /**
   * Applies a box handle drag. Resizing a text box changes its source box
   * and turns auto height (any handle but left/right center) and auto
   * width (any but top/bottom center) off; with scale contents (`sc`)
   * the bottom-right handle scales the font size instead.
   */
  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    const data = partData as ResizeData;
    if (
      partId === BoxEditor.RESIZE_HANDLE_PART_ID ||
      partId === BoxEditor.ROTATION_HANDLE_PART_ID
    ) {
      if (this.canApplyTransform()) {
        const scaleContents = this._element.getProperty("sc");
        this._fullContentsTransform = !!scaleContents && data.side !== Rect.Side.BOTTOM_RIGHT;
        if (
          this._element &&
          this._elementPreview &&
          !this._element.isFakeText() &&
          partId === BoxEditor.RESIZE_HANDLE_PART_ID &&
          !this._fullContentsTransform
        ) {
          let fontSize: number | undefined;
          let content: string | undefined;
          const names: string[] = [];
          const values: unknown[] = [];
          let previewTransform = this._elementPreview.getProperty("trf") as Transform | null;
          const own = this._element.getProperty("trf") as Transform | null;
          const ownInverse = own ? own.inverted() : null;
          if (previewTransform) {
            if (scaleContents && data.side === Rect.Side.BOTTOM_RIGHT) {
              const factor = (
                ownInverse ? ownInverse.multiplied(previewTransform) : previewTransform
              ).getScaleFactor();
              const size = this._element.getProperty("_tfi") as number | null;
              if (size) fontSize = parseInt((size * factor) as unknown as string);
              else if (this._element.getTLCore()) {
                let runs = this._element.getContent() as { fontSize: number }[] | null;
                if (runs) {
                  runs = runs.map((run) => {
                    run.fontSize = factor * run.fontSize;
                    return run;
                  });
                  content = JSON.stringify(runs, Text._serializeContent as never);
                }
              }
            }
            if (ownInverse) previewTransform = previewTransform.multiplied(ownInverse);
          }
          this._element.beginUpdate();
          if (
            data.side !== Rect.Side.RIGHT_CENTER &&
            data.side !== Rect.Side.LEFT_CENTER &&
            this._element.getProperty("ah") &&
            !this._element.hasPathAttached()
          ) {
            names.push("ah");
            values.push(false);
          }
          if (
            data.side !== Rect.Side.TOP_CENTER &&
            data.side !== Rect.Side.BOTTOM_CENTER &&
            this._element.getProperty("aw") &&
            !this._element.hasPathAttached()
          ) {
            names.push("aw");
            values.push(false);
          }
          if (names.length) this._element.setProperties(names, values, false, false, false);
          this._element.transformSourceBBox(previewTransform);
          if (void 0 !== fontSize) this._element.setProperties(["_tfi"], [fontSize]);
          else if (void 0 !== content) this._element.setProperties(["content"], [content]);
          if (this._preTransform && !this._preTransform.isIdentity()) {
            preTransformChildrenOnly(this._element, this._preTransform, extra);
          }
          this._element.endUpdate();
          this.resetTransform();
        } else if (!(
          this._element &&
          this._element.isFakeText() &&
          partId === BoxEditor.RESIZE_HANDLE_PART_ID
        )) {
          // The old code also called GShapeEditor.prototype._prepareApplyTransform
          // with the editor as the element; that checks the editor for the
          // Layout mixin, which it never has, so it did nothing.
          ShapeEditor.prototype._applyTransform.call(
            this,
            this._element,
            partId === BoxEditor.ROTATION_HANDLE_PART_ID,
            extra,
            option,
          );
        }
      } else this.resetTransform();
    } else if (partId === TextEditor.DISTANCE_HANDLER_ID) {
      this._element.setProperty("tpthl", this._element.$tpthl);
      this.resetPartMove(partId, partData);
    }
    // Skips the block editor's version, as the old code did.
    ElementEditor.prototype._applyPartMove.call(this, partId, partData, option, extra);
  }

  /** Pastes a text's content or a string into the inline edited text. */
  processPaste(source: unknown): boolean | number {
    let content: unknown = null;
    if (!this.isInlineEdit()) return false;
    if (source instanceof Text) content = source.getContent();
    else if (source instanceof String || "string" == typeof source) {
      // Quirk: the enum value, not the current system, so this runs on
      // every system; see "Pasted text loses Windows line feeds
      // everywhere" in QUESTIONS.md.
      if (System.OperatingSystem.Windows) source = replaceMicrosoftLineFeed(source);
      content = source;
    }
    if (!content) return false;
    const core = this._element.getTLCore();
    if (core) {
      this.requestInvalidation();
      this.contentSetEnabled(0);
      core.insert(this._element._shorten(content));
      this.invalidateTextWidth();
      this.contentSetEnabled(1);
      return true;
    }
    return 0;
  }

  /**
   * An auto-width text that grew past the page's right edge (or, when
   * mirrored, the left edge) gets a fixed width, if at least 50 px of it
   * stays on the page.
   */
  invalidateTextWidth(): void {
    const element = this._element;
    if (element.$aw && !element.hasPathAttached()) {
      const box = element.getGeometryBBox() as Rect;
      const pageBox = (
        element.getPage() as unknown as { getGeometryBBox(): Rect }
      ).getGeometryBBox();
      const transform = element.getTransform();
      const width = element._getWidth();
      if (transform && (transform.getMatrix()[0] as number) < 0) {
        if (box.getX() < 0 && box.getX() + box.getWidth() > 50) {
          element.setProperties(["aw", "w"], [false, width]);
          const scale = (box.getWidth() + box.getX()) / box.getWidth();
          let scaling = new Transform();
          scaling = scaling.scaled(scale, 1);
          element.transformSourceBBox(scaling);
        }
      } else {
        const right = box.getX() + box.getWidth();
        const pageWidth = pageBox.getWidth();
        if (right > pageWidth) {
          let scaling = new Transform();
          const overflow = right - pageWidth;
          if (box.getWidth() - overflow > 50) {
            element.setProperties(["aw", "w"], [false, width]);
            const scale = (box.getWidth() - overflow) / box.getWidth();
            scaling = scaling.scaled(scale, 1);
            element.transformSourceBBox(scaling);
          }
        }
      }
    }
  }

  /** A DOM keydown while inline editing (Ctrl/Cmd = ctrlKey without altKey). */
  handleKeyDown(event: DomKeyEvent): boolean {
    return (
      !!this.isInlineEdit() && (this._inlineEditor as InlineTextEditor).handleDomKeyDown(event)
    );
  }

  /** 0 makes content changes skip the property write-back (`_dontSetContent`). */
  contentSetEnabled(enabled: unknown): void {
    this._dontSetContent = !enabled;
  }

  override canHandleDblClick(): boolean {
    return true;
  }

  /** Double-clicking the right / bottom center handle toggles auto width / height. */
  override handleDblClick(partId: unknown, partData?: unknown): boolean {
    if (partId === BoxEditor.RESIZE_HANDLE_PART_ID) {
      const side = (partData as ResizeData).side;
      if (side === Rect.Side.RIGHT_CENTER) {
        this._element.setProperty("aw", !this._element.getProperty("aw"));
      } else if (side === Rect.Side.BOTTOM_CENTER) {
        this._element.setProperty("ah", !this._element.getProperty("ah"));
      }
      return true;
    }
    return false;
  }

  /** Half the free height of a box taller than its text (for mouse hits). */
  _getVerticalOffset(): number {
    const core = this._element.getTLCore();
    if (!core) return 0;
    const box = this._element.getSourceBBox();
    const boxHeight = (box && box.getHeight()) || 0;
    const textHeight = core.getHeight();
    return textHeight < boxHeight ? 0.5 * (this._element._getHeight() - textHeight) : 0;
  }

  /** Text on a path: the merged glyph boxes. */
  override getBBox(transform: Transform): Rect | null {
    if (
      this.hasPathAttached() &&
      (this.hasFlag(BaseEditor.Flag.Selected) || this.hasFlag(BaseEditor.Flag.Highlighted))
    ) {
      let full = transform;
      if (this._transform) full = this._transform.multiplied(transform);
      const core = this._element.getTLCore();
      if (core) {
        let mapping = full;
        const boxTransform = this.getBoxTransform();
        if (boxTransform) mapping = boxTransform.multiplied(full);
        const boxes = core.getBoxes(core.getDocumentRange());
        if (!boxes) return null;
        const merged = this._mergeRectangles(boxes);
        let minX: number;
        let minY: number;
        let maxX: number;
        let maxY: number;
        minX = minY = Number.POSITIVE_INFINITY;
        maxX = maxY = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < merged.length; i++) {
          const outline = merged[i] as Point[];
          for (let j = 0; j < outline.length; j++) {
            const point = outline[j] as Point;
            const x = point.getX();
            const y = point.getY();
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        if (isFinite(minX) && isFinite(maxX) && isFinite(maxY) && isFinite(minY)) {
          const rect = new Rect(minX, minY, maxX - minX, maxY - minY);
          const margin = this.getBBoxMargin();
          return mapping.mapRect(rect).expanded(margin, margin, margin, margin);
        }
        return null;
      }
    }
    return super.getBBox(transform);
  }

  override getBBoxMargin(): number {
    const margin = super.getBBoxMargin();
    if (this.getElement().hasPathAttached()) {
      const caret = this.isInlineEdit() && (this._inlineEditor as InlineTextEditor).getCaretBox();
      let own = this.hasFlag(BaseEditor.Flag.Selected)
        ? EditorAnnotation.getAnnotationPaintMargin(EditorOptions.annotationHandles.textOnPath.size)
        : 0;
      if (caret) own = Math.max(caret.box.getWidth(), caret.box.getHeight());
      return Math.max(own, margin);
    }
    return margin;
  }

  /** While a non-scaling transform previews, the box as the text will reflow into it. */
  override _getBBox(transform: Transform, includeTransform?: unknown): Rect | null {
    if (!this._fullContentsTransform && this._transform) {
      const full =
        this._transform && includeTransform ? this._transform.multiplied(transform) : transform;
      const params = this._getBoxParams(full);
      if (params.bbox) {
        const box = params.bbox;
        if (params.trf) return params.trf.mapRect(box);
      }
    }
    return null;
  }

  /**
   * The right-center handle is inverted with auto width, the bottom-center
   * one with auto height; with scale contents the bottom-right handle is
   * orange.
   */
  override _paintResizeHandles(transform: Transform, context: EditorPaintContext): void {
    const style = EditorOptions.annotationHandles.resize;
    this._iterateResizeHandles((point: Point, side: unknown) => {
      let inverted = style.inverted;
      if (
        EditorOptions.annotationHandles.text.showAutoSize &&
        ((side === Rect.Side.RIGHT_CENTER && this._element.getProperty("aw")) ||
          (side === Rect.Side.BOTTOM_CENTER && this._element.getProperty("ah")))
      ) {
        inverted = !inverted;
      }
      if (side === Rect.Side.BOTTOM_RIGHT && this._element.getProperty("sc")) {
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          point,
          style.type,
          inverted,
          style.size,
          EditorOptions.annotationHandles.text.blResizeColor,
          RGBColor.WHITE,
        );
      } else {
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          point,
          style.type,
          inverted,
          style.size,
          this.getColor() || context.selectionOutlineColor,
          RGBColor.WHITE,
        );
      }
    }, transform);
  }

  override _showResizeHandles(): boolean {
    return !this.getElement().hasPathAttached() && super._showResizeHandles();
  }

  /**
   * Draws a caret (`asCaret`: a 1 px wide box as a line), a box outline
   * (`strokeOnly`) or a filled selection box, pixel aligned.
   */
  _drawBBox(
    context: EditorPaintContext,
    transform: Transform,
    box: TextBox | Point[],
    color: unknown,
    opacity: number,
    asCaret: boolean,
    strokeOnly?: boolean,
  ): void {
    let points: Point[] | undefined;
    const shape = ((box as TextBox).box || box) as Rect | Point[];
    let mapping = transform;
    if (asCaret) {
      const boxTransform = (box as TextBox).transform;
      if (boxTransform) mapping = mapping.preMultiplied(boxTransform);
      const rect = shape as Rect;
      let width = 0;
      let height = 0;
      if (1 == rect.getWidth()) height = rect.getHeight();
      else width = rect.getWidth();
      points = [
        mapping.mapPoint(new Point(rect.getX() + 0.5, rect.getY())),
        mapping.mapPoint(new Point(rect.getX() + width + 0.5, rect.getY() + height)),
      ];
    } else if (shape instanceof Rect) points = mapping.mapQuadrilateral(shape);
    else if (shape.length) points = shape.map((point) => mapping.mapPoint(point));
    let aligned: Point[] | null = null;
    if (points && points.length) {
      aligned = points.map(
        (point) => new Point(Math.floor(point.getX()) + 0.5, Math.floor(point.getY()) + 0.5),
      );
    }
    if (aligned) {
      const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      canvas.putVertices(aligned, true);
      if (2 == aligned.length) {
        canvas.strokeVertices(
          color as Color,
          Math.sqrt(mapping.getScaleFactor()) || 1,
          null,
          null,
          null,
          null,
          opacity,
        );
      } else if (strokeOnly)
        canvas.strokeVertices(color as Color, 1, null, null, null, null, opacity);
      else canvas.fillVertices(color as Color, opacity);
    }
  }

  /**
   * Joins the boxes of consecutive, touching glyphs on a path into one
   * outline per run of them (top edge, then the bottom edge reversed).
   * Boxes without a transform are skipped.
   */
  _mergeRectangles(boxes: TextBox[]): Point[][] {
    const outlines: Point[][] = [];
    let i = 0;
    while (i < boxes.length) {
      let box = (boxes[i] as TextBox).box as Rect;
      let transform = (boxes[i] as TextBox).transform;
      if (transform) {
        let quad = transform.mapQuadrilateral(box);
        let leftTurn =
          GMath.getTurnAngle(
            quad[0] as Point,
            quad[1] as Point,
            quad[1] as Point,
            quad[2] as Point,
          ) <= 0;
        const top = (leftTurn ? [quad[0], quad[1]] : [quad[1], quad[0]]) as Point[];
        const bottom = (leftTurn ? [quad[3], quad[2]] : [quad[2], quad[3]]) as Point[];
        let next: Point[];
        let j: number;
        for (j = i + 1; j < boxes.length; j++) {
          const other = (boxes[j] as TextBox).box as Rect;
          if (!(
            other.getX() <= box.getX() + box.getWidth() &&
            other.getX() + other.getWidth() >= box.getX() &&
            other.getY() <= box.getY() + box.getHeight() &&
            other.getY() + other.getHeight() >= box.getY()
          ))
            break;
          if ((transform = (boxes[j] as TextBox).transform)) {
            next = transform.mapQuadrilateral(other);
            const n0 = next[0] as Point;
            const n1 = next[1] as Point;
            const n2 = next[2] as Point;
            const n3 = next[3] as Point;
            const q0 = quad[0] as Point;
            const q1 = quad[1] as Point;
            const q2 = quad[2] as Point;
            const q3 = quad[3] as Point;
            const topCross = GMath.getIntersectionPoint(
              n0.getX(),
              n0.getY(),
              n1.getX(),
              n1.getY(),
              q0.getX(),
              q0.getY(),
              q1.getX(),
              q1.getY(),
            ) as Point | null;
            leftTurn = GMath.getTurnAngle(n0, n1, n1, n2) <= 0;
            if (topCross) {
              top.pop();
              if (leftTurn) top.push(topCross, n1);
              else top.push(topCross, n0);
            } else if (leftTurn) top.push(n0, n1);
            else top.push(n1, n0);
            let bottomCross: Point | null = null;
            const direction = GMath.normalizePoint(n2.subtract(n3));
            if (!(GMath.normalizePoint(q2.subtract(q3)).dot(direction) > 0.999)) {
              const params: number[] = [];
              bottomCross = GMath.getIntersectionPoint(
                n2.getX(),
                n2.getY(),
                n3.getX(),
                n3.getY(),
                q2.getX(),
                q2.getY(),
                q3.getX(),
                q3.getY(),
                params,
              ) as Point | null;
              if (
                bottomCross &&
                (params[0] as number) * (params[1] as number) > 0 &&
                Math.abs(params[0] as number) + Math.abs(params[1] as number) > 2
              ) {
                bottomCross = null;
              }
            }
            if (topCross) {
              if (leftTurn) bottom.push(n3, n2);
              else bottom.push(n2, n3);
            } else {
              bottom.pop();
              if (bottomCross) bottom.push(bottomCross);
              if (leftTurn) bottom.push(n2);
              else bottom.push(n3);
            }
            box = other;
            quad = next;
          }
        }
        const outline = top.concat(bottom.reverse());
        outlines.push(outline);
        i = j;
      } else i++;
    }
    return outlines;
  }

  /**
   * The box outline (not on a path; while inline editing only without
   * auto size), then the caret in the text color (brightened by a
   * brightness/contrast effect), the selection boxes, or, on a path, the
   * glyph outlines.
   */
  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    _noVertices: unknown,
    color: Color | null,
  ): void {
    if (!this.getElement().hasPathAttached()) {
      let outline = true;
      if (this.isInlineEdit()) {
        outline = !this.getElement().getProperty("ah") || !this.getElement().getProperty("aw");
      }
      if (outline) BoxEditor.prototype._paintOutline.call(this, transform, context, true, color);
    }
    let caret: CaretBox | null | undefined;
    let selection: TLBox[] | null | undefined;
    let merged: Point[][];
    let full = transform;
    const boxTransform = this.getBoxTransform();
    full = boxTransform ? boxTransform.multiplied(full) : full;
    if (this.isInlineEdit()) {
      caret = (this._inlineEditor as InlineTextEditor).getCaretBox();
      selection = (this._inlineEditor as InlineTextEditor).getSelectionBoxes();
    }
    if (caret) {
      const element = this.getElement();
      const core = element.getTLCore() as TLCore;
      // A text always has its effects node, so no null check (the old code
      // had none either).
      const effect = (element.getEffects() as { getFirstChild(): unknown }).getFirstChild() as {
        getProperty(name: string): unknown;
      } | null;
      const brightnessContrast =
        (effect &&
          (effect.getProperty("GGLBrightnessContrastEffect&shp") as {
            brightness: number;
          } | null)) ||
        null;
      const brightness = effect && brightnessContrast ? brightnessContrast.brightness : 0;
      const opacity = element.getProperty("_stop") as number;
      const runs = core.getRichContent() as unknown as { text: string; fontColor: unknown }[];
      const coreSelection = core.getSelection() as Selection | null;
      const caretAt = coreSelection ? coreSelection.start : 0;
      let runIndex = 0;
      let end = 0;
      for (let k = 0, count = runs.length; k < count; k++) {
        if (caretAt <= (end += (runs[k] as { text: string }).text.length)) {
          runIndex = k;
          break;
        }
      }
      let caretColor = runs.length ? (runs[runIndex] as { fontColor: unknown }).fontColor : color;
      if (brightness) {
        const hsv = Color.rgbToHSV(RGBColor.parseCSSColor(caretColor as string) as number[]);
        hsv[2] = (hsv[2] as number) + brightness;
        caretColor = Color.rgbToHtmlHex(Color.hsvToRGB(hsv));
      }
      this._drawBBox(context, full, caret, caretColor, opacity, true);
    } else if (selection && selection.length) {
      const fill =
        color ||
        (this.hasFlag(BaseEditor.Flag.Highlighted)
          ? context.highlightOutlineColor
          : context.selectionOutlineColor);
      if ((selection[0] as TLBox).transform) {
        merged = this._mergeRectangles(selection);
        for (let k = 0; k < merged.length; k++) {
          this._drawBBox(context, full, merged[k] as Point[], fill, 0.3, false);
        }
      } else {
        for (let k = 0; k < selection.length; k++) {
          this._drawBBox(context, full, selection[k] as TLBox, fill, 0.3, false);
        }
      }
    } else if (this.getElement().hasPathAttached() && !this.isInlineEdit()) {
      const core = this.getElement().getTLCore();
      if (!core) return;
      const boxes = core.getBoxes(core.getDocumentRange());
      if (boxes) {
        merged = this._mergeRectangles(boxes);
        const stroke =
          color ||
          (this.hasFlag(BaseEditor.Flag.Highlighted)
            ? context.highlightOutlineColor
            : context.selectionOutlineColor);
        for (let k = 0; k < merged.length; k++) {
          this._drawBBox(context, full, merged[k] as Point[], stroke, 0.3, false, true);
        }
      }
    }
  }

  override _paintResizeBoxOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
    width?: number,
  ): void {
    if (!this._fullContentsTransform && this._transform) {
      const params = this._getBoxParams(transform);
      if (params.bbox)
        this._paintTransformedQuadrilateral(params.trf, params.bbox, context, color, width);
    } else
      BoxEditor.prototype._paintResizeBoxOutline.call(
        this,
        transform,
        context,
        noVertices,
        color,
        width,
      );
  }

  /**
   * The box a transform reflows the text into: axis aligned in the text's
   * own space (mirroring kept as a sign), at least 1 x 1.
   */
  _getBoxParams(transform: Transform): { bbox: Rect | null; trf: Transform | null } {
    let box = this.getBox();
    let boxTransform = this.getBoxTransform();
    if (box && transform) {
      let full = transform;
      const inverse = boxTransform ? boxTransform.inverted() : null;
      const source = this._element.getSourceBBox() || new Point(0, 0);
      if (inverse) {
        full = new Transform(1, 0, 0, 1, source.getX(), source.getY())
          .multiplied(boxTransform as Transform)
          .multiplied(full)
          .multiplied(inverse);
      }
      boxTransform = boxTransform || new Transform();
      const matrix = full.getMatrix();
      const translation = boxTransform.getTranslation();
      const rect = new Rect(
        translation.getX(),
        translation.getY(),
        box.getWidth(),
        box.getHeight(),
      );
      const quad = full.mapQuadrilateral(rect);
      const q0 = quad[0] as Point;
      const width = Math.max(1, Math.abs(q0.getX() - (quad[1] as Point).getX()));
      const height = Math.max(1, Math.abs(q0.getY() - (quad[3] as Point).getY()));
      const offset = full.getTranslation();
      boxTransform = boxTransform.preMultiplied(
        new Transform(
          (matrix[0] as number) < 0 ? -1 : 1,
          0,
          0,
          (matrix[3] as number) < 0 ? -1 : 1,
          offset.getX(),
          offset.getY(),
        ),
      );
      box = new Rect(0, 0, width, height);
    }
    return { bbox: box, trf: boxTransform };
  }

  /** Where the text starts on its path (the distance handle), in view space. */
  _getDistHandlePosition(transform: Transform | null): Point | null {
    if (!this._element.hasPathAttached()) return null;
    const core = this.getElement().getTLCore();
    if (!core || !core.getTransformer()) return null;
    const origin = new Point(0, 0);
    const unit = new Rect(origin.getX(), -core.getVShift() + origin.getY(), 1, 1);
    const matrix =
      (core.getTransformer() as unknown as MatrixTransformer).getMatrix(0, 0, unit) ||
      new Transform();
    const bounds = core.getRenderBounds() as Rect;
    const toBounds = new Transform(1, 0, 0, 1, -bounds.getX(), -bounds.getY());
    const view = transform || new Transform();
    transform = matrix
      .multiplied(toBounds)
      .multiplied(this._element.$trf || new Transform())
      .multiplied(view);
    return transform.mapPoint(origin);
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    super._postPaint(transform, context);
    if (this._element.hasFlag(NodeFlag.Selected)) {
      const point = this._getDistHandlePosition(transform);
      if (point) {
        const style = EditorOptions.annotationHandles.textOnPath;
        EditorAnnotation.paintAnnotation(
          context,
          null,
          point,
          style.type,
          false,
          style.size,
          RGBColor.WHITE,
          context.annotationColor,
        );
      }
    }
  }

  _triggerSelectionChanged(): void {
    const editor = Editor.getEditor(this.getElement().getScene());
    if (editor && editor.hasEventListeners(Editor.InlineEditorEvent)) {
      editor.trigger(
        new Editor.InlineEditorEvent(this, Editor.InlineEditorEvent.Type.SelectionChanged),
      );
    }
  }

  _triggerTextEdited(data: unknown): void {
    const editor = Editor.getEditor(this.getElement().getScene());
    if (editor && editor.hasEventListeners(Editor.InlineEditorEvent)) {
      editor.trigger(
        new Editor.InlineEditorEvent(this, Editor.InlineEditorEvent.Type.TextEdited, data),
      );
    }
  }

  triggerHotkeyEvent(keys: unknown[]): void {
    const editor = Editor.getEditor(this.getElement().getScene());
    if (editor && editor.hasEventListeners(Editor.HotkeyEvent)) {
      editor.trigger(new Editor.HotkeyEvent(keys));
    }
  }

  /** Blinks the caret every 500 ms while the view has focus, hides it without. */
  _caretUpdate(): void {
    let core: TLCore | null;
    if (this.isInlineEdit()) {
      if ((this._inlineEditor as InlineTextEditor).hasFocus()) {
        const now = new Date().getTime();
        if (now > this._nextCaretToggle) {
          core = this._element.getTLCore();
          this._nextCaretToggle = now + 500;
          // The caret is ours to paint; the text repaints only for an edit.
          if (core && core.toggleCaret()) this.getElement().repaintEdited(true);
        }
      } else if ((core = this._element.getTLCore()) && core.isCaretVisible()) core.toggleCaret();
    }
  }

  /** A text never edited selects all, else the caret goes to `position`. */
  override adjustInlineEditForView(_view: unknown, position?: unknown): void {
    const core = this.getElement().getTLCore();
    if (core && !this.getElement().getProperty("_we")) core.selectAll();
    else if (position) (this._inlineEditor as InlineTextEditor).setCursor(position as Point);
  }

  override canInlineEdit(): boolean {
    if (
      EditorOptions.inlineEditText &&
      this._inlineEditEnabled &&
      this.getElement().getTLCore() &&
      this._element._fontManager().getDefaultFont() &&
      !this._element.isFakeText() &&
      this._element.$_ed
    )
      return true;
    return false;
  }

  override isInlineEdit(): boolean {
    return null !== this._inlineEditor && this._inlineEditor.isActivated();
  }

  override beginInlineEdit(view: unknown): void {
    const core = this.getElement().getTLCore();
    if (core && this._element._fontManager().getDefaultFont() && !this._element.isFakeText()) {
      this.removeFlag(BoxEditor.Flag.ResizeAll);
      if (!this._inlineEditor) {
        this._inlineEditor = new InlineTextEditor(this);
        core.selectionChanged(
          (() => {
            if (!this.getParentEditor()) return TLUtil.UNSUBSCRIBE;
            this._triggerSelectionChanged();
            this.getElement().repaintEdited();
            return undefined;
          }) as (...args: never[]) => unknown,
          true,
        );
      }
      this._nextCaretToggle = new Date().getTime();
      this._inlineEditor.activate(view as InlineEditView);
      this.getElement().repaint(true);
    }
  }

  isSelectionHit(position: Point): boolean {
    return (
      !!this.isInlineEdit() && (this._inlineEditor as InlineTextEditor).isSelectionHit(position)
    );
  }

  override isDeletePartsAllowed(): boolean {
    return this.isInlineEdit();
  }

  override deletePartsSelected(): void {
    if (this.isInlineEdit()) (this._inlineEditor as InlineTextEditor).deleteSelected();
  }

  /**
   * Ends inline editing: resize handles come back (unless the program
   * lock forbids size changes), `_we` records an edit, and a text left
   * empty is deleted.
   */
  override finishInlineEdit(): string {
    const inline = this._inlineEditor as InlineTextEditor;
    inline.deactivate();
    this.getElement().repaint(false);
    if (!((this.getElement().getProperty("plkt") as number) & Block.ProgramLck.NoSizeChanges)) {
      this.setFlag(BoxEditor.Flag.ResizeAll);
    }
    const core = this.getElement().getTLCore();
    if (core) {
      this.getElement().setProperty(
        "_we",
        this.getElement().getProperty("_we") || core.getWasEdited(),
        false,
        false,
        false,
      );
      if (core.getLength() <= 1) {
        const editor = Editor.getEditor(this.getElement().getScene());
        if (editor) editor.deleteSelection(true);
      }
    }
    return "Modify Text Content";
  }

  override canHandleKeyEvents(): boolean {
    return true;
  }

  setInlineEditEnabled(enabled: boolean): void {
    this._inlineEditEnabled = enabled;
  }

  override toString(): string {
    return "[Object GTextEditor]";
  }
}

// Prototype defaults, as the old prototype had them.
Object.assign(TextEditor.prototype, {
  _inlineEditor: null,
  _dontSetContent: false,
  _currentRangeFormatting: null,
  _fullContentsTransform: false,
  _view: null,
  _inlineEditEnabled: true,
  _toggles: { B: "fontWeight", I: "fontStyle" },
  _nextCaretToggle: 0,
});
