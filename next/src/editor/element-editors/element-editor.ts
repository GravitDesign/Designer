// Old: chunk.vendor.js module 36 (GElementEditor).
/**
 * The editor of one element. Element classes register their editor class
 * (`ElementEditor.exports(PathEditor, Path)`); openEditor creates it, hangs
 * it on the element (`__editor__`) and inserts it into its parent
 * element's editor in paint order, opening the parent's editor first.
 *
 * Previews: a part move or a transform paints on `_elementPreview` (a copy
 * the subclass builds) or through `_transform` / `_preTransform`;
 * applyTransform and applyPartMove write the result to the element. For
 * layouts the old box is remembered so the contents are relaid out once
 * the change is applied.
 */
import { registerClass, getTypeId } from "../../engine/core/object.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexSource, type VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { AnnotationMixin } from "../../engine/scene/annotations/annotation.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import type { LayoutApi } from "../../engine/scene/element-layout.ts";
import type { TransformApi } from "../../engine/scene/element-transform.ts";
import { Element } from "../../engine/scene/element.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import type { PropertiesApi } from "../../engine/scene/node-properties.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { BaseEditor, type EditorHost, type EditorPaintContext } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";

/**
 * An element as the editors drive it. The old code called the mixin
 * methods after hasMixin checks (or knew the class); the type lists all of
 * them, so the checks stay where the old code had them.
 */
export type EditedElement = Element &
  PropertiesApi &
  TransformApi &
  LayoutApi &
  ContainerApi & {
    /** Set on a preview: the element it previews. */
    _baseElement?: Element | null;
    /** The element's editor, set by openEditor. */
    __editor__?: ElementEditor | null;
  };

/** GElementEditor.DropType: what is dropped on an editor (acceptDrop). */
const DropType = {
  Pattern: 0,
  Text: 1,
  Node: 2,
  FontFamily: 10,
} as const;

/** GElementEditor.PartsPropertyVals: a property's values over the selected parts. */
export class PartsPropertyVals {
  static {
    registerClass(this, "GElementEditor.PartsPropertyVals");
  }

  declare property: unknown;
  declare parts: unknown[] | null;
  declare values: unknown[] | null;

  constructor(property: unknown) {
    this.property = property;
  }
}
Object.assign(PartsPropertyVals.prototype, { property: null, parts: null, values: null });

/** An element editor class: constructed with the element. */
export type ElementEditorClass = new (element: never) => ElementEditor;

/** Where an editor hangs: the node's `__editor__`. */
interface EditorSlot {
  __editor__?: ElementEditor | null;
  _scene?: unknown;
}

export class ElementEditor<E extends EditedElement = EditedElement> extends BoxEditor {
  static {
    registerClass(this, "GElementEditor");
  }

  /** Editor classes by the type id of the element class they edit. */
  static override _Editors: Record<number, ElementEditorClass> = {};

  static override exports(editorClass: unknown, elementClass: unknown): void {
    ElementEditor._Editors[getTypeId(elementClass) as number] = editorClass as ElementEditorClass;
  }

  static DropType = DropType;
  static DROP_MIME_TYPE_FONT_FAMILY = "application/font+family";
  static DROP_MIME_TYPE_CUSTOM = "gravit/custom+drop+data";

  /** The editor open on an element, or null. */
  static override getEditor<T = ElementEditor>(element: unknown): T | null {
    const slot = element as EditorSlot;
    return (slot.__editor__ ? slot.__editor__ : null) as T | null;
  }

  /** A new editor for the element's exact class (not its superclasses), or null. */
  static createEditor(element: Node, arg?: unknown): ElementEditor | null {
    const editorClass = ElementEditor._Editors[getTypeId(element) as number];
    return editorClass
      ? new (editorClass as unknown as new (element: Node, arg?: unknown) => ElementEditor)(
          element,
          arg,
        )
      : null;
  }

  /**
   * Opens the element's editor (or returns the open one) and inserts it
   * into the editor of the nearest element ancestor that has one, opening
   * those as needed. The new editor goes before the editor of the next
   * sibling element that has one, so the children's editors keep paint
   * order; with `append` it goes at the end.
   */
  static openEditor(element: Node, detached?: unknown, append?: unknown): ElementEditor | null {
    if (!(element as EditorSlot)._scene && !detached) {
      throw new Error("Node is not attached to create an editor for.");
    }
    if (null != ElementEditor.getEditor(element)) return ElementEditor.getEditor(element);
    const editor = ElementEditor.createEditor(element);
    if (!editor) return null;
    for (let parent = element.getParent(); null !== parent; parent = parent.getParent()) {
      if (parent instanceof Element) {
        let parentEditor = ElementEditor.getEditor(parent);
        if (!parentEditor) parentEditor = ElementEditor.openEditor(parent);
        if (parentEditor) {
          let reference: BaseEditor | null = null;
          if (!append) {
            const siblings = parentEditor.getEditors() || [];
            reference = siblings[0] || null;
            let next: BaseEditor | null = null;
            search: for (let i = siblings.length - 1; i >= 0; i--) {
              const sibling = siblings[i] as BaseEditor;
              if (sibling instanceof ElementEditor) {
                for (
                  let node = sibling.getElement().getNext();
                  null != node;
                  node = node.getNext()
                ) {
                  if (node === element) {
                    reference = next;
                    break search;
                  }
                  if (next && ElementEditor.getEditor(node) === next) break;
                }
                next = sibling;
              }
            }
          }
          parentEditor.insertEditor(editor, reference);
          break;
        }
      }
    }
    editor._attach();
    (element as EditorSlot).__editor__ = editor;
    return editor;
  }

  /** Closes the element's editor and the editors inside it. */
  static closeElementEditor(element: Node): void {
    const editor = ElementEditor.getEditor(element);
    if (editor) {
      if (!ElementEditor._Editors[getTypeId(element) as number]) return;
      for (let children = editor.getEditors(); children && children.length;) {
        const child = children[0] as BaseEditor;
        if (child instanceof ElementEditor) ElementEditor.closeElementEditor(child.getElement());
        else BaseEditor.closeEditor(child);
        children = editor.getEditors();
      }
      editor.requestInvalidation();
      const parent = editor.getParentEditor();
      if (parent) parent.removeEditor(editor);
      editor._detach();
      delete (element as EditorSlot).__editor__;
    }
  }

  static PartsPropertyVals = PartsPropertyVals;

  declare _element: E;
  declare _elementPreview: E | null;
  declare _preTransform: Transform | null;
  /** The geometry box before a part move or transform, for the relayout. */
  declare _oldBBox: Rect | null | undefined;

  constructor(element: E) {
    // The old constructor set the element before GBoxEditor's ran.
    super();
    this._element = element;
  }

  getElement(): E {
    return this._element;
  }

  /** The element to paint: the preview while there is one. */
  getPaintElement(): E {
    return this._elementPreview ? this._elementPreview : this._element;
  }

  override _computeOutlineColor(
    context: EditorPaintContext,
    transform?: Transform | null,
  ): unknown {
    let matrix = new Transform();
    const element = this._element;
    const paintBox = element.getPaintBBox() || new Rect();
    const corner = new Point(paintBox.getX() - 1, paintBox.getY() - 1);
    if (transform) matrix = matrix.multiplied(transform);
    const mapped = matrix.mapPoint(corner);
    const x = mapped.getX();
    const y = mapped.getY();
    this._computedOutlineColor = BaseEditor.getOutlineColor(
      context,
      x,
      y,
      context.selectionShapeOutlineColor,
      element,
    );
    return undefined;
  }

  /**
   * The geometry box of what the editor shows (the preview, or the element
   * with the previewed transforms), while selected, highlighted or
   * outlined; null otherwise.
   */
  getPEGeometryBBox(): Rect | null {
    let box: Rect | null = null;
    if (
      this.hasFlag(BaseEditor.Flag.Selected) ||
      this.hasFlag(BaseEditor.Flag.Highlighted) ||
      this.hasFlag(BaseEditor.Flag.Outline)
    ) {
      let target: E;
      const paintElement = this.getPaintElement();
      const element = this.getElement();
      let transform: Transform | null = null;
      if (paintElement && paintElement != element) target = paintElement;
      else {
        target = element;
        const own = target.getTransform();
        if (this._preTransform && own && own.invertible()) {
          transform = (own.inverted() as Transform).multiplied(this._preTransform).multiplied(own);
        }
        if (this._transform) {
          transform = transform ? transform.multiplied(this._transform) : this._transform;
        }
      }
      if (target.hasMixin(VertexSource)) {
        const source = (
          transform ? new VertexTransformer(target as unknown as VertexReader, transform) : target
        ) as VertexReader;
        box = VertexInfo.calculateBounds(source, true);
      } else {
        box = target.getGeometryBBox();
        if (transform && box) box = transform.mapRect(box);
      }
    }
    return box;
  }

  _isBBoxEmpty(): boolean {
    return !(this.hasFlag(BaseEditor.Flag.Selected) || this.hasFlag(BaseEditor.Flag.Highlighted));
  }

  override getBBox(transform: Transform): Rect | null {
    if (this._isBBoxEmpty()) return null;
    let paintTransform = transform;
    if (this._transform) paintTransform = this._transform.multiplied(transform);
    let box = this.getPaintElement().getGeometryBBox();
    // A shape without a preview transform maps its source box with its own
    // transform, which is tighter than the mapped geometry box.
    let shapeTransform: Transform | null | false =
      !this._preTransform && this.getElement() instanceof Shape && this.getElement().getTransform();
    if (shapeTransform) {
      const source = this.getElement().getSourceBBox();
      if (source) {
        const geometry = this.getElement().getGeometryBBox();
        if (Rect.equals(box, geometry)) {
          shapeTransform = paintTransform.preMultiplied(shapeTransform);
          box = source;
        } else shapeTransform = null;
      } else shapeTransform = null;
    }
    if (box) {
      const margin = this.getBBoxMargin();
      box = (shapeTransform || paintTransform)
        .mapRect(box)
        .expanded(margin, margin, margin, margin);
    }
    const custom = this.getCustomBBox(paintTransform, false);
    if (custom) box = box ? box.united(custom) : custom;
    return box;
  }

  override requestInvalidation(args?: unknown): void {
    if (this._element.getScene()) {
      (BaseEditor.getEditor(this._element.getScene()) as EditorHost).requestInvalidation(
        this,
        args,
      );
    }
  }

  override resetPartMove(partId: unknown, partData: unknown, ...rest: unknown[]): void {
    this._setElementPreview(null);
    this._element._relayout = false;
    super.resetPartMove(partId, partData, ...rest);
  }

  override _prepareApplyPartMove(partId: unknown, partData: unknown): void {
    if (this._element.hasMixin(Element.Layout)) {
      this._element._layoutTransform = null;
      if (!(partData && (partData as { noRelayout?: unknown }).noRelayout)) {
        this._oldBBox = this._element.getGeometryBBox();
      }
      this._element._relayout = true;
    }
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    super._applyPartMove(partId, partData, option, extra);
    this._setElementPreview(null);
  }

  override _finishApplyPartMove(partId: unknown, partData: unknown): void {
    const noRelayout = !!partData && !!(partData as { noRelayout?: unknown }).noRelayout;
    if (!noRelayout && this._element.hasMixin(Element.Layout) && this._element._relayout) {
      if (this._element._layoutTransform) {
        this._element._layoutAnchorContents(null, null, this._element._layoutTransform);
        this._element._layoutTransform = null;
      } else {
        const box = this._element.getGeometryBBox();
        if (!(
          Rect.equals(this._oldBBox, box) ||
          !this._oldBBox ||
          !box ||
          (GMath.isEqualEps(this._oldBBox.getWidth(), box.getWidth(), 1e-10) &&
            GMath.isEqualEps(this._oldBBox.getHeight(), box.getHeight(), 1e-10))
        )) {
          this._element._layoutAnchorContents(box, this._oldBBox, null);
        }
      }
      this._element._relayout = false;
    } else if (noRelayout && this._element.hasMixin(Element.Layout)) {
      // A rotation: the anchored children keep their position relative to
      // the parent, so the rotation is added to their anchor transforms.
      let layoutTransform = this._element._layoutTransform;
      if (!this._element._layoutTransform) layoutTransform = new Transform();
      for (
        let child = this._element.getFirstChild() as EditedElement | null;
        null !== child;
        child = child.getNext() as EditedElement | null
      ) {
        if (
          child.hasMixin(Element.Transform) &&
          child.hasMixin(Element.Anchor) &&
          (child.getProperty("hacr") || child.getProperty("vacr"))
        ) {
          const horizontal = child.getProperty("hatrf") as Transform | null;
          const vertical = child.getProperty("vatrf") as Transform | null;
          const add = layoutTransform as Transform;
          child.setProperties(
            ["hatrf", "vatrf"],
            [
              horizontal ? horizontal.multiplied(add) : add,
              vertical ? vertical.multiplied(add) : add,
            ],
          );
        }
      }
      this._element._layoutTransform = null;
      this._element._relayout = false;
    }
  }

  override resetTransform(): void {
    this._setElementPreview(null);
    super.resetTransform();
  }

  override canApplyTransform(): unknown {
    const element = this.getElement();
    return (
      super.canApplyTransform() &&
      element.hasMixin(Element.Transform) &&
      !element.hasFlag(ElementFlag.PartialLocked)
    );
  }

  override applyTransform(target: unknown, ...rest: unknown[]): void {
    this._prepareApplyTransform(target);
    this._applyTransform(target, ...rest);
    this._finishApplyTransform(target);
  }

  override _prepareApplyTransform(target: unknown): void {
    const element = target as EditedElement;
    if (element.hasMixin(Element.Layout)) {
      element._layoutTransform = null;
      if ((this._partSelection && this._partSelection.length) || this._elementPreview) {
        this._oldBBox = element.getGeometryBBox();
        element._relayout = true;
      } else if (this._transform && !this._transform.isIdentity()) {
        element._layoutTransform = this._transform;
        element._relayout = true;
      } else if (this._preTransform && !this._preTransform.isIdentity()) {
        const own = element.getTransform();
        element._layoutTransform =
          own && own.invertible()
            ? (own.inverted() as Transform).multiplied(this._preTransform).multiplied(own)
            : this._preTransform;
        element._relayout = true;
      }
    }
  }

  /**
   * Writes the previewed transform to `target`. `force` and `exceptions`
   * go to GElement.transform. The transform stays in `_transform` (or
   * `_preTransform`) afterwards; the base class then resets it.
   */
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const element = target as EditedElement | null;
    const force = rest[0] as boolean | null | undefined;
    const exceptions = rest[1] as readonly Node[] | false | null | undefined;
    if ((this._transform || this._preTransform) && element) {
      let wasPreTransform = false;
      let transform: Transform | null =
        this._transform && !this._transform.isIdentity() ? this._transform : null;
      if (!transform && this._preTransform && !this._preTransform.isIdentity()) {
        const own = element.getTransform();
        transform =
          own && own.invertible()
            ? (own.inverted() as Transform).multiplied(this._preTransform).multiplied(own)
            : this._preTransform;
        wasPreTransform = true;
      }
      if (transform) {
        this._transform = null;
        this._preTransform = null;
        element.transform(transform, force, exceptions);
        this._transform = wasPreTransform ? null : transform;
        this._preTransform = wasPreTransform ? transform : null;
      }
    } else if (element && this._elementPreview) {
      const transform = this._getTransformFromPreview();
      if (transform && !transform.isIdentity()) element.transform(transform, force, exceptions);
    }
    BoxEditor.prototype._applyTransform.call(this, undefined);
  }

  _getTransformFromPreview(): Transform | null {
    return null;
  }

  override _finishApplyTransform(target: unknown): void {
    const element = target as EditedElement;
    if (element.hasMixin(Element.Layout) && element._relayout) {
      if (element._layoutTransform) {
        element._layoutAnchorContents(null, null, element._layoutTransform);
        element._layoutTransform = null;
      } else {
        const box = element.getGeometryBBox();
        if (!(
          Rect.equals(this._oldBBox, box) ||
          !this._oldBBox ||
          !box ||
          (GMath.isEqualEps(this._oldBBox.getWidth(), box.getWidth(), 1e-10) &&
            GMath.isEqualEps(this._oldBBox.getHeight(), box.getHeight(), 1e-10))
        )) {
          element._layoutAnchorContents(box, this._oldBBox, null);
        }
        this._oldBBox = null;
      }
      element._relayout = false;
    }
  }

  /**
   * Offers a drop (`type` from DropType, `source` the dropped thing,
   * `hit` the hit on the element) to the child editors; subclasses take
   * what they understand.
   */
  acceptDrop(position: unknown, type: unknown, source: unknown, hit: unknown): boolean {
    if (this._editors) {
      for (let i = 0; i < this._editors.length; ++i) {
        const child = this._editors[i];
        if (
          child instanceof ElementEditor &&
          true === child.acceptDrop(position, type, source, hit)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  applyPropertiesToParts(
    properties: unknown,
    values: unknown,
    parts?: unknown,
    extra?: unknown,
    more?: unknown,
  ): boolean {
    return false;
  }

  getPartsProperty(property: unknown): PartsPropertyVals | null {
    return null;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  getStylableParts(): unknown {
    return null;
  }

  /** Setup of a newly created element; annotations get the user's id. */
  initialSetup(style?: unknown, uid?: unknown): void {
    if (this._element.hasMixin(AnnotationMixin)) this._element.setProperty("uid", uid);
  }

  override getObjectNameModified(): string | null {
    return this.getElement().getNodeNameTranslated();
  }

  getEditorStateData(): unknown {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  restoreEditorStateData(data: unknown): void {}

  findPivots(area?: unknown): unknown[] | null {
    return this._element.findPivots(true, area);
  }

  getElementSelectionBBox(): Rect | null {
    return this._element.getGeometryBBox();
  }

  _setElementPreview(preview: E | null): void {
    if (this._elementPreview) this._elementPreview._baseElement = null;
    this._elementPreview = preview;
    if (this._elementPreview) this._elementPreview._baseElement = this._element;
  }

  _attach(): void {}

  _detach(): void {}

  override toString(): string {
    return "[Object GElementEditor]";
  }
}

Object.assign(ElementEditor.prototype, {
  _element: null,
  _elementPreview: null,
  _preTransform: null,
});
