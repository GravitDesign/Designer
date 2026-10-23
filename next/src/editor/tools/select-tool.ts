// Old: chunk.vendor.js module 334 (GSelectTool).
/**
 * The select tool: the base of the pointer tool (GPointerTool) and the
 * subselect tool. It
 *
 * - selects by click (going into groups one level per click, Meta cycling
 *   through the stack under the pointer) or by marquee (touching, or with
 *   Alt enclosed; Shift adds; Space moves the marquee),
 * - moves the selection by dragging (Alt duplicates, Shift constrains),
 *   drags the parts of the element editors (handles, points, segments),
 * - nudges with the arrow keys and resizes with +/- and the arrows,
 * - drives the transform box (edit mode Transform),
 * - drags ruler guide lines,
 * - drops dragged images into shapes (image masks, with Meta) and moves
 *   elements onto another page in the multi-page view.
 *
 * The parts live in tools/select/: the marquee (area-selector.ts), what a
 * click selects (picking.ts), the hover state (hover.ts), the drag
 * preview and drop targets (move-transform.ts), applying a drop
 * (drop-apply.ts), the inline size and position hints (hints.ts) and the
 * arrow keys (nudge.ts). The methods here keep the old names, since the
 * subclasses override some of them and the app calls a few.
 *
 * Modifier state is read from Platform.modifiers, as in the old code:
 * metaKey is Ctrl on Windows, optionKey is Alt.
 */
import { Event } from "../../engine/core/event.ts";
import { EventTargetMixin } from "../../engine/core/event-target.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { equals, find } from "../../engine/core/util.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { AnnotationMixin } from "../../engine/scene/annotations/annotation.ts";
import { Block } from "../../engine/scene/block.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Element } from "../../engine/scene/element.ts";
import { Item } from "../../engine/scene/item.ts";
import { Container } from "../../engine/scene/node-container.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { Group } from "../../engine/scene/group.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { Text } from "../../engine/text/text.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "../element-editors/base-editor.ts";
import { BlockEditor } from "../element-editors/block-editor.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { CompoundPathEditor } from "../element-editors/compound-path-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { ImageEditor } from "../element-editors/image-editor.ts";
import { PathEditor, type PathPartId } from "../element-editors/path-editor.ts";
import type { SceneEditor } from "../element-editors/scene-editor.ts";
import { StyleEditor } from "../element-editors/style-editor.ts";
import { TransformBox } from "../element-editors/transform-box.ts";
import type { StyleEdManager } from "../style-ed-manager.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Panning } from "../view/panning.ts";
import { AreaSelector } from "./select/area-selector.ts";
import { applyMoveDrop } from "./select/drop-apply.ts";
import { updateEditorUnderMouse, updateDistanceHelper } from "./select/hover.ts";
import { handleArrowKey, isArrowKey } from "./select/nudge.ts";
import {
  checkSelectedUnderMouse,
  getAllHitTestedElems,
  getSelectableForPosition,
  getTopMostHit,
} from "./select/picking.ts";
import { updateResizeHint } from "./select/hints.ts";
import { updateSelectionTransform } from "./select/move-transform.ts";
import { partData, type AddCandidate, type GuideLineHit } from "./select/select-types.ts";
import { Tool } from "./tool.ts";
import type { ToolManager } from "./tool-manager.ts";

/** The view a select tool works on. */
export type SelectToolView = EditorWidget;

const EditMode = {
  Select: 0,
  Transform: 1,
  Edit: 2,
} as const;

/** GEditorOptions.selectDoubleClickBehavior values. */
const DblClick = {
  Disabled: null,
  EditModeSwitch: "edit",
  SubSelectSwitch: "subselect",
} as const;

/** GEditorOptions.distanceHelperBehaviour values. */
const DistanceHelperBehaviour = {
  Default: null,
  Click: "click",
} as const;

/** What the tool is doing between press and release (null: nothing). */
const Mode = {
  Select: 1,
  Move: 2,
  Moving: 3,
  Transforming: 4,
  Editing: 5,
  MoveGuideLine: 6,
} as const;

const InteractionMode = {
  Default: 0,
  Mixed: 1,
} as const;

const EventType = {
  EditModeChanged: 0,
} as const;

/** GSelectTool.Event: the edit mode changed (args: { mode, previousMode }). */
class SelectToolEvent extends Event {
  static {
    registerClass(this, "GSelectTool.Event");
  }

  static Type = EventType;

  declare type: number | null;
  declare args: unknown;

  constructor(type: number, args: unknown) {
    super();
    this.type = type;
    this.args = args;
  }

  override toString(): string {
    return "[Event GSelectTool.Event]";
  }
}
(SelectToolEvent.prototype as { type: unknown }).type = null;
(SelectToolEvent.prototype as { args: unknown }).args = null;

const loc = (key: string): string => Locale.get(new LocaleKey("GSelectTool", key)) as string;

const modifiers = Platform.modifiers;

export class SelectTool extends Panning(EventTargetMixin(Tool)) {
  static {
    registerClass(this, "GSelectTool");
  }

  static EditMode = EditMode;
  static _DblClick = DblClick;
  static _DistanceHelperBehaviour = DistanceHelperBehaviour;
  static _Mode = Mode;
  /** Two presses further apart than this (ms) are no double click. */
  static DBLCLICKTM = 250;
  static InteractionMode = InteractionMode;
  static Event = SelectToolEvent;
  static _AreaSelector = AreaSelector;

  declare _interactionMode: number;
  _selectFilterFunc: (element: Element) => boolean;
  declare _handlingDragEnd: Promise<void> | null;
  _selectAcceptorFunc: (element: Element) => boolean;
  _areaSelector: AreaSelector;
  declare _releaseOnlySelection: boolean;
  declare _mode: number | null;
  declare _clickedElement: Element | null;
  /** A click on a selected group's child selects the child (false for subselect). */
  declare _clickGoDown: boolean;
  declare _clickedToggle: boolean | undefined;
  declare _selectionDone: boolean;
  declare _elementUnderMouse: Element | null;
  declare _editorUnderMouseInfo: PartInfo | null;
  declare _editorMovePartInfo: PartInfo | null;
  declare _guideLineUnderMouse: GuideLineHit | null;
  declare _shiftConstraining: boolean;
  declare _keyDelta: Point | null;
  declare _moveStart: Point | null;
  declare _moveStartTransformed: Point | null;
  declare _moveCurrent: Point | null;
  declare _dragHandling: boolean;
  /** Snap zone lines to paint (view pixels), and the area they cover. */
  declare _visuals: [Point, Point][] | null;
  declare _visualsArea: Rect | null;
  declare _editMode: number;
  declare _itemsToAddToImageMask: AddCandidate[] | null;
  declare _itemsToAddToPage: AddCandidate[] | null;
  declare _pageCandidates: unknown;
  declare _allowDistanceHelper: boolean;
  declare _elementMeasurementsToggle: boolean;
  /** Times of the last two presses, for the slow double click check. */
  declare _mDownTime1: number | null;
  declare _mDownTime2: number | null;
  declare _lastMouseEvent: MouseEvent | null;
  declare _clickToDragTimeout: ReturnType<typeof setTimeout> | null;
  declare _styleEdManager: StyleEdManager | null;
  /** False while X is held: a press on an element starts a marquee instead. */
  declare _isBackgroundSelectEnabled: boolean;
  declare _selectIgnoreBackgroundElements: (Element | null)[] | null;
  declare _backgroundSelectShouldBeEnabled: boolean;

  constructor(areaSelector?: AreaSelector) {
    super();
    this._selectFilterFunc = this._selectFilter.bind(this);
    this._selectAcceptorFunc = this._selectAcceptor.bind(this);
    this._areaSelector = areaSelector || new SelectTool._AreaSelector();
  }

  override supportsElementClick(): boolean {
    return true;
  }

  clearClickedElement(): void {
    this._clickedElement = null;
  }

  setInteractionMode(mode: number): void {
    this._interactionMode = mode;
  }

  getEditMode(): number {
    return this._editMode;
  }

  // The second argument some callers pass is ignored, as in the old code.
  setEditMode(mode: number, ...ignored: unknown[]): void {
    void ignored;
    if (this._editMode === mode) return;
    const previousMode = this._editMode;
    switch (this._editMode) {
      case EditMode.Edit:
        this._editor.setSelectionDetail(false);
        this._editor.setPathResize(this._hasPathResize());
        this._editor.setSelectionEdit(false);
        break;
      case EditMode.Transform:
        this._closeTransformBox();
        if (void 0 !== EditorOptions.scaleBorderWidth) {
          this._scene.setBorderScale(EditorOptions.scaleBorderWidth);
        } else this._scene.setBorderScale(null);
        if (void 0 !== EditorOptions.scaleCorners) {
          this._scene.setCornersScale(EditorOptions.scaleCorners);
        } else this._scene.setCornersScale(null);
        this._editor.setFullContentTransform(false);
    }
    this._editMode = mode;
    switch (this._editMode) {
      case EditMode.Edit:
        this._editor.setSelectionDetail(true);
        this._editor.setPathResize(false);
        this._editor.setSelectionEdit(true);
        break;
      case EditMode.Transform:
        this._openTransformBox();
        this._editor.setFullContentTransform(true);
    }
    if (this.hasEventListeners(SelectToolEvent)) {
      this.trigger(
        new SelectToolEvent(EventType.EditModeChanged, { mode: this._editMode, previousMode }),
      );
    }
  }

  override getCursor(): string {
    if (
      modifiers.optionKey &&
      this._mode == Mode.Moving &&
      (!this._editorMovePartInfo || !this._editorMovePartInfo.isolated)
    ) {
      return Cursor.SelectPlus;
    }
    if (this._editorUnderMouseInfo) {
      let cursor = (this._editorUnderMouseInfo.editor as BaseEditor).getCursor(
        this._editorUnderMouseInfo.id,
        this._editorUnderMouseInfo.data,
      ) as string | null;
      if (!cursor) cursor = Cursor.SelectDot;
      return cursor;
    }
    if (this._guideLineUnderMouse) {
      return this._guideLineUnderMouse.isVertical
        ? Cursor.SelectResizeHoriz
        : Cursor.SelectResizeVert;
    }
    return this._elementUnderMouse ? Cursor.SelectDot : Cursor.Select;
  }

  override activate(view: SelectToolView, light?: boolean): void {
    super.activate(view, light);
    this._mDownTime1 = null;
    this._mDownTime2 = null;
    if (!light) {
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
      view.addEventListener(MouseEvent.Down, this._mouseDown, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
      view.addEventListener(MouseEvent.DblClick, this._mouseDblClick, this);
      view.addEventListener(KeyEvent.Down, this._keyDown, this);
      view.addEventListener(KeyEvent.Release, this._keyRelease, this);
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
      this._editor.addEventListener(Editor.SelectionChangedEvent, this._selectionChanged, this);
    }
    this._editor.setPathResize(this._hasPathResize(), true);
    this._shiftConstraining = false;
    this._view.setRightDrag(true);
    this._releaseOnlySelection = false;
    this._lastMouseEvent = null;
  }

  override deactivate(view: SelectToolView, light?: boolean): void {
    if (this._elementUnderMouse) this._elementUnderMouse.removeFlag(NodeFlag.Highlighted);
    if (this._visualsArea) {
      this.invalidateArea(this._visualsArea);
      this._visualsArea = null;
    }
    this._lastMouseEvent = null;
    if (
      this._allowDistanceHelper &&
      this._editor &&
      this._editor.getDistanceHelper().isActivated()
    ) {
      this._editor.getDistanceHelper().deactivateMeasurement();
    }
    if (!light && this._editor) this._editor.setPathResize(true);
    if (this._editor) {
      this._editor.removeEventListener(Editor.SelectionChangedEvent, this._selectionChanged, this);
    }
    this.updateInlineHint(null);
    // Removed without a target, so these drop the registrations of every
    // tool that shares the method, as in the old code.
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    view.removeEventListener(MouseEvent.Move, this._mouseMove);
    view.removeEventListener(MouseEvent.DblClick, this._mouseDblClick);
    view.removeEventListener(KeyEvent.Down, this._keyDown);
    view.removeEventListener(KeyEvent.Release, this._keyRelease);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
    if (this._view) this._view.setRightDrag(false);
    super.deactivate(view, light);
  }

  override isDeactivatable(): boolean {
    if (this._editor) {
      const inline = this._editor.getCurrentInlineEditorNode();
      return (!this._mode && !inline) || this._mode === Mode.Transforming;
    }
    return undefined as unknown as boolean;
  }

  hasSelectedArea(): boolean {
    return this._mode === Mode.Select && !!this._areaSelector && this._areaSelector.hasSelectArea();
  }

  override paint(context: EditorPaintContext): void {
    if (this._mode == Mode.Select && this._areaSelector.hasSelectArea()) {
      this._areaSelector.paint(context);
    }
    if (this._visuals) {
      const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      for (let i = 0; i < this._visuals.length; ++i) {
        const [from, to] = this._visuals[i] as [Point, Point];
        let offset = 0;
        if (EditorOptions.outlineWidth % 2 != 0) offset = 0.5;
        canvas.strokeLine(
          Math.floor(from.getX()) + offset,
          Math.floor(from.getY()) + offset,
          Math.floor(to.getX()) + offset,
          Math.floor(to.getY()) + offset,
          EditorOptions.outlineWidth,
          EditorOptions.guideOutlineColor,
        );
      }
      this._visuals = null;
    }
  }

  _selectionChanged(): void {
    if (this._mode == Mode.Transforming) {
      const selection = this._editor.getIndividualSelection();
      if (selection && selection.length) this.setEditMode(EditMode.Transform, true);
      else this.setEditMode(EditMode.Select);
    }
  }

  _hasPathResize(): boolean {
    return true;
  }

  /** The scene's editor (GSceneEditor), which owns the transform box. */
  _sceneEditor(): SceneEditor | null {
    return ElementEditor.getEditor<SceneEditor>(this._scene);
  }

  _mouseMove(event: MouseEvent): void {
    this._lastMouseEvent = event;
    if (
      this._allowDistanceHelper &&
      this._editor.getDistanceHelper().isActivated() &&
      !modifiers.optionKey
    ) {
      this._editor.getDistanceHelper().deactivateMeasurement();
    }
    if (this._editor.getCurrentInlineEditorNode()) return;
    const sceneEditor = this._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive() && this._mode != Mode.MoveGuideLine) {
      this._updateMode(Mode.Transforming);
    }
    this._editor.updateByMousePosition(
      event.client,
      this._view.getWorldTransform(this._scene),
      true,
      this._view.getViewConfiguration(),
    );
    this._updateEditorUnderMouse(event.client);
  }

  _mouseDown(event: MouseEvent): void {
    this._mDownTime1 = this._mDownTime2;
    this._mDownTime2 = new Date().getTime();
    this._lastMouseEvent = event;
    if (
      this._allowDistanceHelper &&
      this._editor.getDistanceHelper().isActivated() &&
      !modifiers.optionKey
    ) {
      this._editor.getDistanceHelper().deactivateMeasurement();
    }
    const inline = this._editor.getCurrentInlineEditorNode() as Element | null;
    if (inline) {
      // A press outside the inline editor's box (plus the pick distance) closes it.
      let box = inline.getPaintBBox();
      if (box && !box.isEmpty()) {
        box = this._view.getWorldTransform(this._view.getScene().getActivePage()).mapRect(box);
        const pick = EditorOptions.pickDistance;
        if (!box.expanded(pick, pick, pick, pick).containsPoint(event.client)) {
          this._editor.closeInlineEditor();
        }
      }
      return;
    }

    this._clickedElement = null;
    this._selectionDone = false;
    const deepSelect =
      modifiers.metaKey && null == (this._manager as ToolManager).getTemporaryActiveTool();
    const toggle = modifiers.shiftKey && !this._shiftConstraining;
    const sceneEditor = this._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive()) {
      if (this._mode != Mode.Transforming) this._updateMode(Mode.Transforming);
      this._editorMovePartInfo = sceneEditor.getTBoxPartInfoAt(
        event.client,
        this._view.getWorldTransform(this._scene),
        EditorOptions.pickDistance,
        this._view.getViewConfiguration().multiPageView,
      );
      const id = this._editorMovePartInfo.id;
      if (
        !this._guideLineUnderMouse ||
        (id !== TransformBox.OUTSIDE &&
          id !== TransformBox.INSIDE &&
          id !== TransformBox.FAR_OUTSIDE)
      ) {
        if (id === TransformBox.FAR_OUTSIDE) this.setEditMode(EditMode.Select);
      } else {
        this._updateMode(Mode.MoveGuideLine);
        this._selectionDone = true;
      }
    } else {
      this._updateMode(Mode.Select);
      if (!deepSelect) this._pressOnEditorPart(event, toggle);
    }

    if (this._mode === Mode.Select) {
      this._editor.updateByMousePosition(
        event.client,
        this._view.getWorldTransform(this._scene),
        false,
        this._view.getViewConfiguration(),
      );
      if (this._guideLineUnderMouse) {
        this._updateMode(Mode.MoveGuideLine);
        this._selectionDone = true;
      }
      if (!this._selectionDone) {
        if (this._isBackgroundSelectEnabled) {
          this._clickedElement = this._getSelectableForPosition(
            event.client,
            true,
            event.button === MouseEvent.BUTTON_RIGHT,
          );
        } else {
          this._selectIgnoreBackgroundElements = this._getAllHitTestedElems(event.client);
        }
        this._clickedToggle = toggle;
        if (this._clickedElement) {
          // `inline` is always null here: a press while inline editing returned
          // above. See "Dead checks in the select tool's press and modifier
          // handlers" in QUESTIONS.md.
          if (inline && this._clickedElement !== inline) this._editor.closeInlineEditor();
          this._scene.updateActivePageForElem(this._clickedElement);
          this._scene.updateActiveLayerForElem(this._clickedElement);
        } else {
          if (!this._releaseOnlySelection) this._updateSelection(this._clickedToggle, []);
          if (inline) this._editor.closeInlineEditor();
        }
      }
    }
  }

  /**
   * The press part of _mouseDown that hits an element editor's part
   * (handle, point, segment, label): selects it as the old code did and
   * switches to Move.
   */
  _pressOnEditorPart(event: MouseEvent, toggle: boolean): void {
    const sceneEditor = this._sceneEditor();
    if (!sceneEditor) return;
    const page =
      find(this._scene.getChildren(), (node: Node) => {
        if (node instanceof Page && node.hasFlag(NodeFlag.Highlighted)) return node;
        return undefined;
      }) || this._scene.getActivePage();
    let info = sceneEditor.getPartInfoAt(
      event.client,
      this._view.getWorldTransform(page as Page | null),
      (editor: BaseEditor) => {
        if (editor.allowPartSelection()) {
          if (!editor.isRelativeToPage()) return true;
          if (Editor.getEditorPage(editor) === page) return true;
        }
        return false;
      },
      EditorOptions.pickDistance,
      this._view.getViewConfiguration().multiPageView,
    ) as PartInfo | null;
    if (
      !info ||
      !(
        this._editor.hasSelectionDetail() ||
        this._editor.hasSelectionEdit() ||
        !this._isLineSegment(info)
      )
    ) {
      return;
    }
    const partEditor = info.editor as BaseEditor;
    let partId = info.id;
    const rightSelectable = (part: PartInfo): unknown => {
      const data = partData(part);
      return (
        part.selectable ||
        (event.button === MouseEvent.BUTTON_RIGHT &&
          data &&
          data.rightButton &&
          data.rightButton.selectable)
      );
    };
    let selectable = rightSelectable(info);
    if (toggle || (!partEditor.isPartSelected(partId) && selectable)) {
      let selectedCount = 0;
      const data = partData(info);
      if (data && data.ownerEditor) {
        if (toggle && selectable && partEditor.isPartSelected(partId)) {
          selectedCount = data.ownerEditor.getOwnedPartsSelectionLength();
        }
        if ((selectable && 1 !== selectedCount) || (!selectable && toggle)) {
          data.ownerEditor.updateOwnedPartsSelection(toggle, [info]);
        }
      } else {
        if (toggle && selectable && partEditor.isPartSelected(partId)) {
          selectedCount = partEditor.getPartsSelectionLength();
        }
        if ((selectable && 1 !== selectedCount) || (!selectable && toggle)) {
          const result = (
            partEditor.updatePartSelection as (toggle: unknown, ids: unknown) => unknown
          ).call(partEditor, toggle, selectable ? [partId] : null);
          // Some editors answer with the part that ended up selected.
          if (result && result instanceof PartInfo) {
            info = result;
            partId = info.id;
            selectable = rightSelectable(info);
          }
          const resultData = partData(info);
          if (
            this._editor.hasEventListeners(Editor.SelectionChangedEvent) &&
            !(resultData && resultData.noEditorSelectionChangedEvent)
          ) {
            this._editor.trigger(Editor.SELECTION_CHANGED_EVENT);
          }
        }
      }
      this._selectionDone = true;
    }
    if (!(
      selectable &&
      !partEditor.isPartSelected(partId) &&
      partId !== BlockEditor.LabelHolder.LABEL_PART_ID
    )) {
      this._editorMovePartInfo = info;
    }
    this._updateMode(Mode.Move);
    if (partId === BlockEditor.LabelHolder.LABEL_PART_ID) {
      this._editor.updateByMousePosition(
        event.client,
        this._view.getWorldTransform(this._scene),
        false,
        this._view.getViewConfiguration(),
      );
    }
  }

  _getSelectableForPosition(
    position: Point,
    onPress?: boolean,
    rightButton?: boolean,
  ): Element | null {
    return getSelectableForPosition(this, position, onPress, rightButton);
  }

  _checkSelectedUnderMouse(position: Point): Element | null {
    return checkSelectedUnderMouse(this, position);
  }

  _mouseRelease(event: MouseEvent): void {
    const release = (): void => {
      this._lastMouseEvent = event;
      let hadHighlight = false;
      if (this._elementUnderMouse) {
        this._elementUnderMouse.removeFlag(NodeFlag.Highlighted);
        this._elementUnderMouse = null;
        hadHighlight = true;
      }
      if (this._backgroundSelectShouldBeEnabled) {
        this._backgroundSelectShouldBeEnabled = false;
        this._isBackgroundSelectEnabled = true;
        this._selectIgnoreBackgroundElements = null;
      }
      if (this._mode == Mode.Select && !this._selectionDone) {
        if (this._clickedElement) {
          if (!this._isDistanceHelperActivatedByClick()) {
            this._clickedElement = this._getSelectableForPosition(
              event.client,
              false,
              event.button === MouseEvent.BUTTON_RIGHT,
            );
            if (
              this._clickedElement instanceof Page &&
              this._scene.getActivePage() === this._clickedElement &&
              !hadHighlight
            ) {
              this._clickedElement = null;
            }
            if (this._clickedElement) {
              let toggle = this._clickedToggle as boolean;
              if (
                modifiers.shiftKey &&
                this._clickedElement instanceof Text &&
                this._editor.getCurrentInlineEditorNode()
              ) {
                toggle = false;
              }
              this._updateSelectionWithElement(toggle, this._clickedElement, false);
              this._selectionDone = true;
            }
          }
        } else {
          if (this._releaseOnlySelection) {
            this._updateSelection(this._clickedToggle as boolean, []);
            this._selectionDone = true;
          }
          if (this._isDistanceHelperActivated() && this._isDistanceHelperClickBehaviour()) {
            this._editor.getDistanceHelper().invalidate();
          }
        }
      }
      this._insertPointOnSegmentClick(event);
      this._editorMovePartInfo = null;
      this._moveStart = null;
      this._moveStartTransformed = null;
      this._moveCurrent = null;
      this._selectionDone = false;
      if (this._mode != Mode.Transforming) {
        this._updateMode(null);
        this.updateCursor();
      }
      this._updateEditorUnderMouse(event.client);
      if (
        this._isDistanceHelperActivatedByClick() &&
        this._editor.getSelection() &&
        (this._editor.getSelection() as Node[]).length
      ) {
        this._updateDistanceHelper(true);
      }
    };
    if (this._handlingDragEnd) {
      void this._handlingDragEnd.then(() => {
        release();
        this._handlingDragEnd = null;
      });
    } else release();
  }

  /** A left click (no drag) on a path segment inserts an anchor point there. */
  _insertPointOnSegmentClick(event: MouseEvent): void {
    const info = this._editorMovePartInfo;
    const data = partData(info);
    if (!(
      event.button === MouseEvent.BUTTON_LEFT &&
      this._mode == Mode.Move &&
      info &&
      info.editor instanceof PathEditor &&
      info.id &&
      (info.id as PathPartId).type == PathEditor.PartType.Segment &&
      data &&
      data.type == PathEditor.SegmentData.HitRes
    )) {
      return;
    }
    const pathEditor = info.editor;
    const path = pathEditor.getElement() as unknown as {
      insertHitPoint(hit: unknown): unknown;
    };
    let point: unknown;
    this._editor.beginTransaction();
    try {
      point = path.insertHitPoint(data.hitRes);
    } finally {
      this._editor.commitTransaction(loc("action.insert-path-point"));
    }
    if (point) {
      const parent = (pathEditor as unknown as { _parentEditor: unknown })._parentEditor;
      if (!modifiers.shiftKey && parent && parent instanceof CompoundPathEditor) {
        parent.updatePartSelection(false, null);
      }
      pathEditor.updatePartSelection(modifiers.shiftKey, [
        { type: PathEditor.PartType.Point, point },
      ]);
    }
  }

  _updateSelectionWithElement(toggle: boolean, element: Element, keepSelected: boolean): void {
    let nodes: Node[];
    if (!element.hasFlag(NodeFlag.Selected)) this.setEditMode(EditMode.Select);
    if (toggle) {
      const internal = element.hasMixin(Container)
        ? (
            element as unknown as { getInternalSelectedNodes(): Node[] | null }
          ).getInternalSelectedNodes()
        : null;
      if (internal) this._editor.clearInternalSelection(element as never);
      nodes = [];
      if (!(element.hasFlag(NodeFlag.Selected) && keepSelected)) nodes.push(element);
      for (let parent = element.getParent(); null != parent; parent = parent.getParent()) {
        if (parent.hasFlag(NodeFlag.Selected)) nodes.push(parent);
      }
      this._updateSelection(true, nodes);
    } else if (!element.hasFlag(NodeFlag.Selected)) this._updateSelection(false, [element]);
  }

  _mouseDragStart(event: MouseEvent): void {
    this._lastMouseEvent = event;
    const styleDrag = (): boolean =>
      !!this._editorMovePartInfo && this._editorMovePartInfo.editor instanceof StyleEditor;
    if (
      !(this._mode != Mode.Select && this._mode != Mode.Move && this._mode != Mode.Transforming) &&
      !styleDrag()
    ) {
      this.beginPan();
    }
    if (this._allowDistanceHelper && this._editor.getDistanceHelper().isActivated()) {
      this._editor.getDistanceHelper().deactivateMeasurement();
    }
    if (this._elementUnderMouse) {
      this._elementUnderMouse.removeFlag(NodeFlag.Highlighted);
      this._elementUnderMouse = null;
    }
    if (this._styleEdManager && this._styleEdManager.getActiveEditor() && !styleDrag()) {
      this._styleEdManager.deactivateEditor();
    }
    if (this._visualsArea) {
      this.invalidateArea(this._visualsArea);
      this._visualsArea = null;
    }
    if (this._mode == Mode.Select && !this._editor.getCurrentInlineEditorNode()) {
      this._areaSelector.clearArea();
      if (!this._selectionDone) this._dragStartSelection();
    }

    if (this._mode == Mode.Move) {
      this._moveStart = event.client;
      this._moveStartTransformed = this._view
        .getViewTransform(this._view.getScene().getActivePage())
        .mapPoint(this._moveStart);
      if (this.catchesContextMenu() || event.button === MouseEvent.BUTTON_LEFT) {
        this._dragHandling = true;
        // The move starts a frame later, so a click with a tiny jitter stays a click.
        this._clickToDragTimeout = setTimeout(() => {
          this._updateMode(Mode.Moving);
        }, 33);
        if (this._editorMovePartInfo) this._dragStartPartAction(event);
      }
      if (modifiers.optionKey) this.updateCursor();
    } else if (this._mode == Mode.Transforming) {
      this._moveStart = event.client;
      this._moveStartTransformed = this._view
        .getViewTransform(this._view.getScene().getActivePage())
        .mapPoint(this._moveStart);
      const sceneEditor = this._sceneEditor();
      if (sceneEditor && sceneEditor.isTransformBoxActive()) {
        sceneEditor.startTBoxTransform(this._editorMovePartInfo);
      }
    } else if (this._mode === Mode.MoveGuideLine) {
      const guide = this._guideLineUnderMouse as GuideLineHit;
      this._view.startMoveGuideLine(guide.isVertical, guide.guideIndex);
    }
  }

  /** At drag start in Select mode: select the pressed element (or not) and maybe switch to Move. */
  _dragStartSelection(): void {
    const isPathLike = (node: unknown): boolean =>
      node instanceof Path || node instanceof CompoundPath || node instanceof PathsGraph;
    if (this._releaseOnlySelection) {
      let pathSelected = false;
      const selection = this._editor.getSelection();
      if (selection && selection.length) {
        for (let i = 0; i < selection.length && !pathSelected; ++i) {
          if (isPathLike(selection[i])) pathSelected = true;
        }
      }
      const clicked = this._clickedElement;
      if (!clicked || isPathLike(clicked)) {
        if (!(
          pathSelected ||
          (clicked && (!clicked || clicked.hasFlag(NodeFlag.Selected) || !isPathLike(clicked)))
        )) {
          this._updateSelection(this._clickedToggle as boolean, []);
        }
      } else {
        if (!(clicked.hasFlag(NodeFlag.Selected) || pathSelected)) {
          this._updateSelectionWithElement(this._clickedToggle as boolean, clicked, true);
        }
        if (clicked.hasFlag(NodeFlag.Selected)) {
          this._updateMode(Mode.Move);
          this._selectionDone = true;
        }
      }
    } else if (this._clickedElement) {
      this._updateSelectionWithElement(this._clickedToggle as boolean, this._clickedElement, true);
      this._selectionDone = true;
      this._updateMode(Mode.Move);
    }
  }

  /** Lets the dragged part's editor (or a selected element's editor) take over the drag. */
  _dragStartPartAction(event: MouseEvent): void {
    const info = this._editorMovePartInfo as PartInfo;
    const data = partData(info);
    const right = event.button == MouseEvent.BUTTON_RIGHT;
    if (
      (info.isolated && event.button === MouseEvent.BUTTON_LEFT) ||
      (event.button === MouseEvent.BUTTON_RIGHT &&
        data &&
        data.rightButton &&
        data.rightButton.isolated)
    ) {
      this._editorMovePartInfo = (info.editor as BaseEditor).selectToolDragStartAction(info, right);
      return;
    }
    const selection = this._editor.getSelection();
    if (selection && selection.length) {
      for (let i = 0; i < selection.length; ++i) {
        const editor = ElementEditor.getEditor<ElementEditor>(selection[i]);
        if (editor) {
          const taken = editor.selectToolDragStartAction(
            this._editorMovePartInfo as PartInfo,
            right,
          );
          if (taken) {
            this._editorMovePartInfo = taken;
            break;
          }
        }
      }
    }
  }

  _mouseDrag(event: MouseEvent): void {
    this._lastMouseEvent = event;
    if (this.isPanning()) this.panView(event.client, event.clientDelta);
    if (this._mode == Mode.Moving || this._mode == Mode.Transforming) {
      this._moveCurrent = event.client;
      this._updateSelectionTransform();
    } else if (
      this._mode != Mode.Select ||
      event.button == MouseEvent.BUTTON_RIGHT ||
      this._editor.getCurrentInlineEditorNode()
    ) {
      if (this._mode === Mode.MoveGuideLine) this._view.moveGuideLine(event.client);
    } else {
      if (this._areaSelector.hasSelectArea()) {
        let area = this._areaSelector.getAreaPaintRect() as Rect;
        if (this.isPanning()) {
          const pan = this.getLastPanMovement();
          if (pan) {
            area = this._calculateInvalidationPanAreaForRect(
              (pan.inverted() as Transform).mapRect(area),
              EditorOptions.outlineWidth,
            );
          }
        }
        this.invalidateArea(area);
      }
      if (this._areaSelector.hasAreaStarted()) {
        if (modifiers.spaceKey) this._areaSelector.moveToPoint(event.client);
        else {
          const pan = this.getLastPanMovement();
          if (pan) this._areaSelector.translate((pan.inverted() as Transform).getTranslation());
          this._areaSelector.expandToPoint(event.client);
        }
      } else this._areaSelector.startArea(event.clientStart);
      if (this._areaSelector.hasSelectArea()) {
        this._processElementsUnderCollision(true);
        let area = this._areaSelector.getAreaPaintRect() as Rect;
        if (this.isPanning()) area = this._calculateInvalidationPanAreaForRect(area);
        this.invalidateArea(area);
      } else this._editor.clearHighlighted();
    }
  }

  _mouseDragEnd(event: MouseEvent): void {
    const finish = (done?: () => void): void => {
      if (this._mode == Mode.Moving) {
        if (this._dragHandling) {
          setTimeout(() => {
            this._dragHandling = false;
          }, 0);
        }
        applyMoveDrop(this, event);
      } else if (this._mode == Mode.Select && event.button != MouseEvent.BUTTON_RIGHT) {
        this._editor.clearHighlighted();
        if (this._areaSelector.hasSelectArea()) {
          if (!this._isDistanceHelperActivatedByClick()) this._processElementsUnderCollision(false);
          this._selectionDone = true;
          const area = this._areaSelector.getAreaPaintRect();
          this._areaSelector.clearArea();
          this.invalidateArea(area);
        }
      } else if (this._mode == Mode.Transforming) {
        const sceneEditor = this._sceneEditor();
        if (sceneEditor && sceneEditor.isTransformBoxActive()) {
          sceneEditor.applyTBoxTransform();
          this.invalidateArea(null);
        }
        this.updateInlineHint(null);
      } else if (this._mode === Mode.MoveGuideLine) this._view.finishMoveGuideLine();
      if (done) done();
    };
    this._lastMouseEvent = event;
    if (this._clickToDragTimeout) clearTimeout(this._clickToDragTimeout);
    this._clickToDragTimeout = null;
    if (this.isPanning()) {
      // The release waits for this, so it sees the state after the drop.
      this._handlingDragEnd = new Promise<void>((resolve) => {
        this.endPan(() => finish(resolve));
      });
    } else finish();
  }

  /** Highlights (`highlight`) or selects what the marquee covers. */
  _processElementsUnderCollision(highlight: boolean): void {
    let elements: Element[];
    const area = this._areaSelector.getCollisionArea(
      this._view.getViewTransform(this._view.getScene()),
    );
    const flags = this._getCollisionFlags();
    let partsOnly = false;
    if (flags) {
      elements = this._scene.getCollisions(
        area as never,
        flags,
        null,
        this._selectFilterFunc,
        (element: Element) => !(element instanceof Shape),
        this._view.getViewConfiguration().multiPageView,
        this._view.getViewConfiguration().isElementAnnotationsVisible(),
      );
    } else {
      elements = (this._editor.getSelection() || []) as unknown as Element[];
      partsOnly = true;
    }
    let selectable = this._getSelectableElements(elements) as Element[];
    if (
      !this._isBackgroundSelectEnabled &&
      this._selectIgnoreBackgroundElements &&
      this._selectIgnoreBackgroundElements.length > 0
    ) {
      const ignored = this._selectIgnoreBackgroundElements;
      selectable = selectable.filter((element) => !ignored.some((other) => equals(element, other)));
    }
    selectable = selectable.filter(this._selectAcceptorFunc);
    if (highlight) {
      this._editor.highlightSelectablesUnderCollision(
        modifiers.shiftKey,
        selectable as never,
        area,
        this._view.getViewConfiguration().multiPageView,
        partsOnly,
      );
    } else {
      this._editor.updateSelectionUnderCollision(
        modifiers.shiftKey,
        selectable as never,
        area,
        this._view.getViewConfiguration().multiPageView,
        partsOnly,
      );
    }
  }

  /**
   * Touching (Partial) by default, enclosed with Alt; invertSelectionMode
   * swaps the two. Null means only parts of the selection are selected.
   */
  _getCollisionFlags(): number | null {
    let flags: number = Element.CollisionFlag.GeometryBBox;
    if (
      (!modifiers.optionKey && !EditorOptions.invertSelectionMode) ||
      (modifiers.optionKey && EditorOptions.invertSelectionMode)
    ) {
      flags |= Element.CollisionFlag.Partial;
    }
    return flags;
  }

  /** Returns whether the double click was handled. */
  _mouseDblClick(event: MouseEvent): boolean {
    this._lastMouseEvent = event;
    // Presses further apart than DBLCLICKTM don't count as a double click.
    const tooSlow =
      null != this._mDownTime1 &&
      null != this._mDownTime2 &&
      this._mDownTime2 - this._mDownTime1 > SelectTool.DBLCLICKTM;
    this._mDownTime1 = null;
    this._mDownTime2 = null;
    if (tooSlow) return true;
    if (this._editor.getCurrentInlineEditorNode()) return true;
    let handled = false;
    if (this._clickedElement) {
      handled = this._editor.openInlineEditor(
        this._clickedElement as never,
        this._view,
        event.client,
      );
    }
    if (handled || EditorOptions.selectDoubleClickBehavior === DblClick.Disabled) {
      if (handled) this._handleInlineEditingStart();
    } else if (
      this._editorUnderMouseInfo &&
      (this._editorUnderMouseInfo.editor as BaseEditor).hasFlag(BaseEditor.Flag.Selected)
    ) {
      const partEditor = this._editorUnderMouseInfo.editor as BaseEditor;
      if (partEditor.canHandleDblClick()) {
        this._editor.beginTransaction();
        try {
          handled = partEditor.handleDblClick(
            this._editorUnderMouseInfo.id,
            this._editorUnderMouseInfo.data,
          );
        } finally {
          const name = partEditor.getObjectNameModified() || loc("text.element");
          this._editor.commitTransaction(loc("action.modify-element").replace("%element", name));
        }
      }
    } else if (this._clickedElement) {
      const elementEditor = ElementEditor.getEditor<ElementEditor>(this._clickedElement);
      if (elementEditor && elementEditor.canHandleDblClick()) {
        this._editor.beginTransaction();
        try {
          handled = (elementEditor.handleDblClick as () => boolean)();
        } finally {
          const name = elementEditor.getObjectNameModified() || loc("text.element");
          this._editor.commitTransaction(loc("action.modify-element").replace("%element", name));
        }
      }
    }
    return handled;
  }

  override catchesContextMenu(event?: unknown): boolean {
    void event;
    return (
      !!this._isDistanceHelperActivatedByClick() ||
      this._dragHandling ||
      super.catchesContextMenu() ||
      ((this._editorUnderMouseInfo &&
        this._editorUnderMouseInfo.id != ImageEditor.IMAGEINTERNAL_PART_ID) as boolean)
    );
  }

  isCropContext(): boolean {
    return (this._editorUnderMouseInfo &&
      this._editorUnderMouseInfo.id == ImageEditor.IMAGEINTERNAL_PART_ID) as boolean;
  }

  /**
   * After an inline editor opened on the clicked element: select it, plus
   * the selected groups and compound shapes above it.
   */
  _handleInlineEditingStart(): void {
    const clicked = this._clickedElement as Element;
    let parent = clicked.getParent();
    let selection = this._editor.getSelection() as Node[] | null;
    const nodes: Node[] = [clicked];
    while (parent && selection) {
      selection = selection.concat();
      if (parent instanceof Group || parent instanceof CompoundShape) {
        for (let i = 0; i < selection.length; i++) {
          if (selection[i] === parent) {
            nodes.push(parent);
            selection.splice(i, 1);
            break;
          }
        }
      }
      parent = parent.getParent();
    }
    this._updateSelection(false, nodes);
  }

  override _keyDown(event: KeyEvent): void {
    super._keyDown(event);
    if (this._editor.getCurrentInlineEditorNode()) return;
    if (event.key === Key.Constant.X && !modifiers.metaKey) this._disableBackgroundSelect();
    if (isArrowKey(event.key)) {
      if (modifiers.spaceKey) return;
      handleArrowKey(this, event.key);
    } else if (
      event.key === Key.Constant.ENTER &&
      this._editor.hasSelection() &&
      !this._view.getViewConfiguration().isElementAnnotationsVisible() &&
      (!this._mode || this._mode === Mode.Select)
    ) {
      // Never true: the method returned above while inline editing.
      if (this._editor.getCurrentInlineEditorNode()) return;
      const selection = this._editor.getSelection();
      if (selection && selection.length) {
        let opened = false;
        for (let i = 0; i < selection.length && !opened; ++i) {
          const editor = ElementEditor.getEditor<ElementEditor>(selection[i]);
          if (editor && editor.canInlineEdit()) {
            (event.preventDefault as () => void)();
            (event.stopPropagation as () => void)();
            opened = this._editor.openInlineEditor(selection[i] as never, this._view);
          }
        }
        if (!opened) (this._manager as ToolManager).activateSubSelect();
      }
    }
    if (this._editor && this._editor.hasSelection()) {
      const texts = (this._editor.getSelection() as Node[]).filter((node) => node instanceof Text);
      if (texts.length) {
        texts.forEach((text) => {
          const editor = ElementEditor.getEditor<ElementEditor>(text) as ElementEditor;
          if (editor.canHandleKeyEvents()) editor.handleKeyEvent(event);
        });
      }
    }
  }

  _keyRelease(event: KeyEvent): void {
    if (this._editor.getCurrentInlineEditorNode()) return;
    if (event.key === Key.Constant.X) this._enableBackgroundSelect();
    if (isArrowKey(event.key)) {
      this._applyKeyTransformation();
      if (
        modifiers.optionKey &&
        this._allowDistanceHelper &&
        this._editor.getDistanceHelper().isActivated() &&
        this._editor.getSelection() &&
        (this._editor.getSelection() as Node[]).length
      ) {
        this._updateDistanceHelper();
      }
    }
  }

  _modifiersChanged(event: ModifiersChangedEvent): void {
    const changed = event.changed;
    const sceneEditor = this._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive() && this._mode != Mode.MoveGuideLine) {
      if (this._mode != Mode.Transforming) this._updateMode(Mode.Transforming);
    } else if (this._mode == Mode.Transforming) this._updateMode(null);

    if (this._keyDelta && (changed.metaKey || changed.tabKey)) {
      this._applyKeyTransformation();
    } else if (
      !(changed.shiftKey || changed.optionKey || changed.metaKey) ||
      (this._mode !== Mode.Moving && this._mode != Mode.Transforming)
    ) {
      if (changed.escapeKey && modifiers.escapeKey) {
        if (this._editor.closeInlineEditor()) this._view.focus();
        else (this._manager as ToolManager).notifyJobDone(this);
      } else if (
        (changed.shiftKey || changed.optionKey) &&
        this._mode == Mode.Select &&
        // The event has no button, so this always holds (see "Dead checks in
        // the select tool's press and modifier handlers" in QUESTIONS.md).
        (event as unknown as { button?: number }).button != MouseEvent.BUTTON_RIGHT &&
        !this._editor.getCurrentInlineEditorNode() &&
        this._areaSelector.hasSelectArea()
      ) {
        this._processElementsUnderCollision(true);
        this.invalidateArea(this._areaSelector.getAreaPaintRect());
      }
    } else {
      // Shift, Alt or Meta flipped mid-drag: redo the drag with the new modifiers.
      if (changed.shiftKey && modifiers.shiftKey) this._shiftConstraining = true;
      this._updateSelectionTransform();
      if (changed.optionKey && this._mode === Mode.Moving) this.updateCursor();
    }

    if (this._allowDistanceHelper && changed.optionKey) {
      if (modifiers.optionKey && null == this._mode) {
        if (this._editor.activateDistanceHelper(Key.Constant.OPTION) && this._lastMouseEvent) {
          this._updateEditorUnderMouse(this._lastMouseEvent.client);
        }
      } else if (!modifiers.optionKey) this._editor.getDistanceHelper().deactivateMeasurement();
    }
    if (
      changed.shiftKey &&
      (!modifiers.shiftKey ||
        (modifiers.shiftKey && this._mode !== Mode.Moving && this._mode !== Mode.Transforming))
    ) {
      this._shiftConstraining = false;
    }
    if (changed.metaKey && this._lastMouseEvent) {
      this._editor.updateByMousePosition(
        this._lastMouseEvent.client,
        this._view.getWorldTransform(this._scene),
        true,
        this._view.getViewConfiguration(),
      );
      this._updateEditorUnderMouse(this._lastMouseEvent.client);
    }
  }

  _updateSelection(toggle: boolean, nodes: readonly Node[]): void {
    this.setEditMode(EditMode.Select);
    this._editor.updateSelection(toggle, nodes);
    this._elementMeasurementsToggle = false;
  }

  _getAllHitTestedElems(position: Point): (Element | null)[] {
    return getAllHitTestedElems(this, position);
  }

  _getTopMostHit(event: MouseEvent, keepGroups?: boolean, stacked?: boolean): Element | null {
    return getTopMostHit(this, event, keepGroups, stacked);
  }

  /** Commits the arrow key nudge or resize once the key is released. */
  _applyKeyTransformation(): void {
    if (!this._keyDelta) return;
    if (
      this._editorMovePartInfo &&
      this._editorMovePartInfo.id === BoxEditor.RESIZE_HANDLE_PART_ID
    ) {
      this._editor.applyResizeSelection(this._editorMovePartInfo.id, this._editorMovePartInfo.data);
      this._editorMovePartInfo = null;
    } else this._editor.applySelectionTransform(false, false, false, true);
    this._keyDelta = null;
    this._updateMode(null);
  }

  _openTransformBox(): boolean {
    const sceneEditor = ElementEditor.openEditor(this._scene) as SceneEditor | null;
    if (
      !sceneEditor ||
      sceneEditor.isTransformBoxActive() ||
      this._editor.getCurrentInlineEditorNode()
    ) {
      return false;
    }
    sceneEditor.setTransformBoxActive(true);
    this._updateMode(Mode.Transforming);
    this.invalidateArea(null);
    this.updateCursor();
    return true;
  }

  _closeTransformBox(): boolean {
    const sceneEditor = this._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive()) {
      sceneEditor.setTransformBoxActive(false);
      this._updateMode(null);
      this.invalidateArea(null);
      this.updateCursor();
      return true;
    }
    this._updateMode(null);
    this.invalidateArea(null);
    this.updateCursor();
    return false;
  }

  _updateSelectionTransform(): void {
    updateSelectionTransform(this);
  }

  _updateResizeHint(transform: unknown): void {
    updateResizeHint(this, transform);
  }

  _updateMode(mode: number | null): void {
    if (mode !== this._mode) this._mode = mode;
  }

  _updateEditorUnderMouse(position: Point): void {
    updateEditorUnderMouse(this, position);
  }

  _updateDistanceHelper(byClick?: boolean): void {
    updateDistanceHelper(this, byClick);
  }

  /** Skips slices (unless shown), hidden annotations, locked elements and NoSelect blocks. */
  _selectFilter(element: Element): boolean {
    const config = this._view.getViewConfiguration();
    return (
      !(element instanceof Slice && !config.slices) &&
      !(
        element.hasMixin(AnnotationMixin) && !config.isElementAnnotationsVisible(element as never)
      ) &&
      !element.hasFlag(Element.Flag.FullLocked as number) &&
      !(
        element instanceof Block &&
        (element.getProperty("plkt") as number) & (Block.ProgramLck.NoSelect as number)
      )
    );
  }

  _selectAcceptor(element: Element): boolean {
    return !(element instanceof Page);
  }

  _getSelectableElements(elements: readonly (Node | null)[], deep?: boolean): Element[] {
    let result: Element[] = [];
    for (let i = 0; i < elements.length; ++i) {
      const selectable = this._getSelectableElement(elements[i] as Node, deep);
      // The deep flag doubles as indexOf's start index, as in the old code;
      // see "Selectable elements may repeat the first one" in QUESTIONS.md.
      if (selectable && result.indexOf(selectable, deep as unknown as number) < 0) {
        result.push(selectable);
      }
    }
    result = this._pageFilterRule(result);
    return result;
  }

  /** The item or page a hit selects: the hit itself or the item above it. */
  _getSelectableElement(element: Node | null, deep?: boolean): Element | null {
    for (let node = element; null !== node; node = node.getParent()) {
      if (
        (node instanceof Item || node instanceof Page) &&
        (deep || !node.getParent() || !(node.getParent() instanceof Item))
      ) {
        return node;
      }
    }
    return null;
  }

  /** Pages only count when nothing but pages was hit. */
  _pageFilterRule(elements: Element[]): Element[] {
    return elements.every((element) => element instanceof Page)
      ? elements
      : elements.filter((element) => !(element instanceof Page));
  }

  _switchToMoveFilter(elements: readonly Element[]): Element[] {
    return elements.filter((element) => !(element instanceof Page));
  }

  /** A segment of a single line (not inside a compound path). */
  _isLineSegment(info: PartInfo): boolean {
    const data = partData(info);
    return (
      info.editor instanceof PathEditor &&
      (!data || !(data.ownerEditor instanceof CompoundPathEditor)) &&
      (info.id as PathPartId).type == PathEditor.PartType.Segment &&
      info.editor.getElement().isLine()
    );
  }

  _isDistanceHelperClickBehaviour(): boolean {
    return EditorOptions.distanceHelperBehaviour === DistanceHelperBehaviour.Click;
  }

  _isDistanceHelperActivated(): boolean {
    return this._allowDistanceHelper && this._editor.getDistanceHelper().isActivated();
  }

  _isDistanceHelperActivatedByClick(): boolean | null {
    return (
      !!(
        this._isDistanceHelperActivated() &&
        this._isDistanceHelperClickBehaviour() &&
        modifiers.optionKey
      ) && this._editor.hasSelection()
    );
  }

  _disableBackgroundSelect(): void {
    this._isBackgroundSelectEnabled = false;
  }

  _enableBackgroundSelect(): void {
    if (this._mode === Mode.Select) this._backgroundSelectShouldBeEnabled = true;
    else {
      this._isBackgroundSelectEnabled = true;
      this._selectIgnoreBackgroundElements = null;
    }
  }

  override toString(): string {
    return "[Object GSelectTool]";
  }
}

const proto = SelectTool.prototype;
proto._interactionMode = InteractionMode.Default;
proto._handlingDragEnd = null;
proto._releaseOnlySelection = false;
proto._mode = null;
proto._clickedElement = null;
proto._clickGoDown = true;
proto._selectionDone = false;
proto._elementUnderMouse = null;
proto._editorUnderMouseInfo = null;
proto._editorMovePartInfo = null;
proto._guideLineUnderMouse = null;
proto._shiftConstraining = false;
proto._keyDelta = null;
proto._moveStart = null;
proto._moveStartTransformed = null;
proto._moveCurrent = null;
proto._dragHandling = false;
proto._visuals = null;
proto._visualsArea = null;
proto._editMode = EditMode.Select;
proto._itemsToAddToImageMask = null;
proto._itemsToAddToPage = null;
proto._pageCandidates = null;
proto._allowDistanceHelper = false;
proto._elementMeasurementsToggle = false;
proto._mDownTime1 = null;
proto._mDownTime2 = null;
proto._lastMouseEvent = null;
proto._clickToDragTimeout = null;
proto._styleEdManager = null;
proto._isBackgroundSelectEnabled = true;
proto._selectIgnoreBackgroundElements = null;
proto._backgroundSelectShouldBeEnabled = false;
