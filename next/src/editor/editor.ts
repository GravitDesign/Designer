// Old: chunk.vendor.js module 82 (GEditor).
/**
 * The editor of one scene: the selection, the undo and redo stacks built
 * from transactions, the snapping guides and the operations the actions
 * and tools run on the selection (move, transform, align, arrange,
 * insert, delete, convert, inline editing).
 *
 * The selection lives in the nodes' Selected flag. The editor listens to
 * the scene's flag, insert, remove and geometry events and keeps its list
 * (and the element editors) in step, so panels and actions may set the
 * flag directly. The editor hangs on `scene.__graphic_editor__`.
 *
 * Left out of the port: the debug transaction tooling (importStates,
 * exportStates and the sequence-id debug data), which only ran with
 * GEditorOptions.debugTransactions and the dev-only `gdb_loaddesign`
 * global, like the dropped GInputRecorder. importStates and exportStates
 * return null, as they did with the options' default.
 */
import { Locale } from "../engine/core/locale/locale.ts";
import { LocaleKey } from "../engine/core/locale/locale-key.ts";
import { Event } from "../engine/core/event.ts";
import { EventTarget } from "../engine/core/event-target.ts";
import { getRegisteredClass, registerClass } from "../engine/core/object.ts";
import { equals, extend, uuid } from "../engine/core/util.ts";
import { QuadTree } from "../engine/geometry/quadtree.ts";
import { PathUtil } from "../engine/geometry/path-util.ts";
import { VertexSourceMixin } from "../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../engine/geometry/vertex-transformer.ts";
import { GMath } from "../engine/math/math.ts";
import { Point } from "../engine/math/point.ts";
import { Rect } from "../engine/math/rect.ts";
import { Transform } from "../engine/math/transform.ts";
import { AnnotationMixin } from "../engine/scene/annotations/annotation.ts";
import { AnnotationsList } from "../engine/scene/annotations/annotations-list.ts";
import { CollabText } from "../engine/scene/annotations/collab-text.ts";
import { Comment } from "../engine/scene/annotations/comment.ts";
import { Block } from "../engine/scene/block.ts";
import { CompoundPath } from "../engine/scene/compound-path.ts";
import { CompoundShape } from "../engine/scene/compound-shape.ts";
import { Connector } from "../engine/scene/connector.ts";
import { ElementFlag } from "../engine/scene/element-change.ts";
import { Transform as TransformMixin } from "../engine/scene/element-transform.ts";
import { Element } from "../engine/scene/element.ts";
import { Group } from "../engine/scene/group.ts";
import { Item } from "../engine/scene/item.ts";
import { Layer } from "../engine/scene/layer.ts";
import { Container } from "../engine/scene/node-container.ts";
import {
  AfterFlagChangeEvent,
  AfterInsertEvent,
  BeforeFlagChangeEvent,
  BeforeRemoveEvent,
} from "../engine/scene/node-events.ts";
import { NodeFlag } from "../engine/scene/node-change.ts";
import { Multireference } from "../engine/scene/node-identity.ts";
import { Store } from "../engine/scene/node-store.ts";
import { Node } from "../engine/scene/node.ts";
import { Page } from "../engine/scene/page.ts";
import { PathBase } from "../engine/scene/path-base.ts";
import { Path } from "../engine/scene/path.ts";
import { PathsGraph } from "../engine/scene/paths-graph/paths-graph.ts";
import {
  RecordedTransactionFinishedEvent,
  RecordedTransactionStartedEvent,
  Scene,
} from "../engine/scene/scene.ts";
import { Symbol as SymbolNode } from "../engine/scene/symbol.ts";
import { Stylable } from "../engine/style/stylable.ts";
import { Text } from "../engine/text/text.ts";
import type { TransactionAction } from "../engine/undo/transaction-recorder.ts";
import { EditorOptions } from "./editor-options.ts";
import { BaseEditor } from "./element-editors/base-editor.ts";
import { BlockEditor } from "./element-editors/block-editor.ts";
import { BoxEditor, EdTransformOptions } from "./element-editors/box-editor.ts";
import { CompoundPathEditor } from "./element-editors/compound-path-editor.ts";
import { ElementEditor } from "./element-editors/element-editor.ts";
import { ImageEditor } from "./element-editors/image-editor.ts";
import { PageEditor } from "./element-editors/page-editor.ts";
import { PathEditor } from "./element-editors/path-editor.ts";
import { ActionGuide } from "./guides/action-guide.ts";
import { BBoxGuide } from "./guides/bbox-guide.ts";
import { DistanceHelper } from "./guides/distance-helper.ts";
import { FullPixelsGuide } from "./guides/full-pixels-guide.ts";
import { GridGuide } from "./guides/grid-guide.ts";
import { DetailMapMode } from "./guides/guide.ts";
import { GuideLinesGuide } from "./guides/guide-lines-guide.ts";
import { Guides } from "./guides/guides.ts";
import { PageGuide } from "./guides/page-guide.ts";
import { PageLabelGuide } from "./guides/page-label-guide.ts";
import { PointsGuide } from "./guides/points-guide.ts";
import { SymbolLabelGuide } from "./guides/symbol-label-guide.ts";
/**
 * A node as the editor drives it. The old code called whatever the node
 * had; the scene's classes all provide these (the mixins decide which
 * are really there, so callers check with hasMixin or instanceof first,
 * as the old code did).
 */
interface EdNode {
  getParent(): EdNode | null;
  getNext(skipSelf?: boolean): EdNode | null;
  getPrevious(): EdNode | null;
  getFirstChild(): EdNode | null;
  getLastChild(): EdNode | null;
  getChildren(): EdNode[];
  getScene(): Scene | null;
  hasFlag(flag: number): boolean;
  setFlag(flag: number): void;
  removeFlag(flag: number): void;
  hasMixin(mixin: unknown): boolean;
  getProperty(name: string, ...rest: unknown[]): unknown;
  setProperty(name: string, value: unknown): void;
  setProperties(names: string[], values: unknown[], custom?: unknown): void;
  getGeometryBBox(): Rect | null;
  getPaintBBox(): Rect | null;
  acceptChildren(
    visitor: (node: EdNode) => unknown,
    reverse?: boolean,
    visitAll?: boolean,
  ): boolean;
  accept(visitor: (node: EdNode) => unknown): boolean;
  findParent(predicate: (node: EdNode) => unknown): EdNode | null;
  insertChild(child: EdNode, next?: EdNode | null): void;
  removeChild(child: EdNode): void;
  appendChild(child: EdNode): void;
  getInternalSelectedNodes(): EdNode[] | null;
  transform(transform: Transform, noEvent?: boolean): void;
  getTransform(): Transform | null;
  clone(options?: unknown): EdNode | null;
  isLocked(): boolean;
  validateInsertion(parent: EdNode, next: EdNode | null): boolean;
  isFullUnderCollision(collision: unknown): boolean;
  getElementIndex(): number;
  [member: string]: unknown;
}

/**
 * An element editor as the editor drives it (GElementEditor and its
 * subclasses; the subclass methods are only called after the same
 * instanceof checks as in the old code).
 */
interface EdEditor {
  setFlag(flag: number, ...rest: unknown[]): void;
  removeFlag(flag: number, ...rest: unknown[]): void;
  hasFlag(flag: number): boolean;
  getElement(): EdNode;
  getEditors(): unknown[] | null;
  getParentEditor(): EdEditor | null;
  getPartSelection(): unknown[] | null;
  updatePartSelection(toggle: boolean, parts: unknown[] | null): void;
  getEditorStateData(): unknown;
  restoreEditorStateData(data: unknown): void;
  requestInvalidation(): void;
  resetTransform(): void;
  canApplyTransform(): boolean;
  applyTransform(element: EdNode, ...rest: unknown[]): void;
  edTransform(transform: Transform, ...rest: unknown[]): void;
  applyPartMove(...args: unknown[]): void;
  resize(...args: unknown[]): void;
  initialSetup(style?: unknown, uid?: unknown): void;
  validateSelectionChange(): boolean;
  isDeletePartsAllowed(): boolean;
  isRemovalBlocked(): boolean;
  deletePartsSelected(): void;
  isPartSelectionUnderCollisionAllowed(): boolean;
  updatePartSelectionUnderCollision(
    toggle: boolean,
    collision: unknown,
    highlight?: boolean,
  ): boolean;
  isAlignPartsAllowed(): boolean;
  alignParts(type: string, x: number | null, y: number | null): void;
  setEditMode(...args: unknown[]): void;
  hasSelectionEditing(): boolean;
  hasPathPartSelection(): boolean;
  setCatchHandle(value: boolean): void;
  canInlineEdit(): boolean;
  beginInlineEdit(view?: unknown): void;
  adjustInlineEditForView(view?: unknown, position?: unknown): void;
  isInlineEdit(): boolean;
  finishInlineEdit(): string | null;
  getPEGeometryBBox(): Rect | null;
  getElementSelectionBBox(): Rect | null;
  insertEditor(editor: unknown, next?: unknown): void;
  isTransformBoxActive(): boolean;
  setTransformBoxActive(active: boolean): void;
  getTransformBox(): unknown;
  getTBoxMode(): number;
}

/** The selection position editor (GSelectionPositionEditor) as the editor drives it. */
interface SelectionEditorLike {
  activate(scene: Scene, editor: Editor): void;
  updateFromSelection(): void;
  edTransform(transform: Transform, ...rest: unknown[]): void;
  resize(...args: unknown[]): void;
  applyPartMove(...args: unknown[]): void;
  resetTransform(): void;
  requestInvalidation(): void;
  setFlag(flag: number): void;
  removeFlag(flag: number): void;
}

/** What the old GEditorWorkspace adds to the workspace (style and tool managers). */
interface EditorWorkspaceLike {
  getTransactionRecorder(): {
    beginTransaction(debug?: unknown): void;
    endTransaction(): TransactionAction[] | null;
    getDebugBugged(): boolean;
    beginSelectionUpdate(editor: unknown): void;
    finishSelectionUpdate(editor: unknown): void;
  } | null;
  getStyleEdManager(): { isActivated(): boolean; deactivateEditor(): void };
  getToolManager(): { getTemporaryActiveTool(): unknown } | null;
  getReference(id: string): EdNode | null;
}

/** One saved selection entry: the element, its part selection and editor state. */
export interface SelectionEntry {
  element: EdNode;
  parts: unknown[] | null;
  data?: unknown;
}

/** What a transaction records: the actions and the selection before and after. */
export interface TransactionData {
  actions: TransactionAction[];
  selection: SelectionEntry[] | null;
  newSelection: SelectionEntry[] | null;
  relatedData?: unknown;
}

/** One entry of the undo or redo stack. */
export interface UndoState {
  id: string;
  name: string;
  action: (data: TransactionData) => void;
  revert: (data: TransactionData) => void;
  data: TransactionData;
  createdAt: number;
}

/** An open transaction: the selection when it began, and the actions of an outer one. */
interface TransactionFrame {
  selection: SelectionEntry[] | null;
  actions?: TransactionAction[] | null;
}

/** A view as the editor uses it (inline editing, detail selection). */
interface EditorView {
  getWorldTransform(...args: unknown[]): Transform;
}

/** The paint configuration bit updateByMousePosition reads. */
interface MultiPageConfiguration {
  multiPageView?: unknown;
}

const loc = (key: string): string => Locale.get(new LocaleKey("GEditor", key)) as string;

const asNode = (node: unknown): EdNode => node as EdNode;
const asNodes = (nodes: readonly unknown[]): EdNode[] => nodes as EdNode[];

/** The element editor open on a node (GElementEditor.getEditor). */
const editorOf = (node: unknown): EdEditor | null => ElementEditor.getEditor<EdEditor>(node);
const openEditorOf = (node: unknown, detached?: boolean, append?: boolean): EdEditor | null =>
  ElementEditor.openEditor(node as Node, detached, append) as unknown as EdEditor | null;

const ProgramLck = Block.ProgramLck as Readonly<Record<string, number>>;
const BoxFlag = BoxEditor.Flag as Readonly<Record<string, number>>;
const EditorFlag = BaseEditor.Flag as Readonly<Record<string, number>>;

/**
 * GPathsGraphEditor (editor-paths-graph-annotations, level 9). The old
 * module required it lazily; the class registers itself here.
 */
let pathsGraphEditorClass: (abstract new (...args: never[]) => unknown) | null = null;
const isPathsGraphEditor = (editor: unknown): boolean =>
  !!pathsGraphEditorClass && editor instanceof pathsGraphEditorClass;

const ArrangeOrderType = {
  SendToFront: "send-front",
  BringForward: "bring-forward",
  SendBackward: "send-backward",
  SendToBack: "send-back",
} as const;

const ArrangeAlignType = {
  AlignLeft: "align-left",
  AlignCenter: "align-center",
  AlignRight: "align-right",
  AlignTop: "align-top",
  AlignMiddle: "align-middle",
  AlignBottom: "align-bottom",
  AlignJustifyHorizontal: "align-justify-horizontal",
  AlignJustifyVertical: "align-justify-vertical",
} as const;

/** GEditor._SavePoint: rolls the save point back to the one before. */
class SavePoint {
  constructor(
    readonly _editor: Editor,
    readonly _oldId: string | null,
    readonly _newId: string | null,
  ) {}

  rollback(): SavePoint {
    return this._editor.markSavePoint(this._oldId);
  }
}

export class FileDropEvent extends Event {
  static {
    registerClass(this, "GEditor.FileDropEvent");
  }

  constructor(
    public file: unknown,
    public position: unknown,
  ) {
    super();
  }

  override toString(): string {
    return "[Event GEditor.FileDropEvent]";
  }
}

export class CustomDropEvent extends Event {
  static {
    registerClass(this, "GEditor.CustomDropEvent");
  }

  constructor(
    public data: unknown,
    public position: unknown,
  ) {
    super();
  }

  override toString(): string {
    return "[Event GEditor.CustomDropEvent]";
  }
}

const ModifiedEventType = { Raw: 1, Undo: 2, Redo: 3 } as const;

export class ModifiedEvent extends Event {
  static {
    registerClass(this, "GEditor.ModifiedEvent");
  }

  static Type = ModifiedEventType;

  data: unknown = null;

  /** `data` is the transaction's related data; `type` (Raw, Undo, Redo) is added as evtType. */
  constructor(data?: unknown, type?: number) {
    super();
    this.data = data || null;
    if (data && type) this.data = extend({ evtType: type }, data);
  }

  override toString(): string {
    return "[Event GEditor.ModifiedEvent]";
  }
}

export class SelectionChangedEvent extends Event {
  static {
    registerClass(this, "GEditor.SelectionChangedEvent");
  }

  declare data?: unknown;

  constructor(data?: unknown) {
    super();
    if (data) this.data = data;
  }

  override toString(): string {
    return "[Event GEditor.SelectionChangedEvent]";
  }
}

const InlineEditorEventType = {
  BeforeOpen: 0,
  AfterOpen: 1,
  BeforeClose: 10,
  AfterClose: 11,
  TryOpen: 20,
  SelectionChanged: 100,
  TextEdited: 101,
} as const;

export class InlineEditorEvent extends Event {
  static {
    registerClass(this, "GEditor.InlineEditorEvent");
  }

  static Type = InlineEditorEventType;

  constructor(
    public editor: unknown = null,
    public type: number | null = null,
    public data: unknown = null,
  ) {
    super();
  }

  override toString(): string {
    return "[Event GEditor.InlineEditorEvent]";
  }
}

/** Some editor (or the pages in `args.pages`) needs repainting. */
export class EditorInvalidationRequestEvent extends Event {
  static {
    registerClass(this, "GEditor.InvalidationRequestEvent");
  }

  constructor(
    public editor: unknown = null,
    public args: unknown = null,
  ) {
    super();
  }

  /**
   * The page to repaint: the first of `args.pages` (the scene when there
   * are several), else the page of the editor's element.
   */
  getEditorPage(): unknown {
    const pages = (this.args as { pages?: { getScene(): unknown }[] } | null)?.pages;
    return this.args && pages
      ? pages.length > 1
        ? (pages[0] as { getScene(): unknown }).getScene()
        : pages[0]
      : this.editor
        ? Editor.getEditorPage(this.editor)
        : null;
  }

  override toString(): string {
    return "[Event GEditor.InvalidationRequestEvent]";
  }
}

export class EdGeometryChangeEvent extends Event {
  static {
    registerClass(this, "GEditor.EdGeometryChangeEvent");
  }
}

export class HotkeyEvent extends Event {
  static {
    registerClass(this, "GEditor.HotkeyEvent");
  }

  constructor(public keys: unknown = null) {
    super();
  }
}

const MODIFIED_EVENT = new ModifiedEvent();
const SELECTION_CHANGED_EVENT = new SelectionChangedEvent();

export class Editor extends EventTarget {
  static {
    registerClass(this, "GEditor");
  }

  static _SavePoint = SavePoint;
  static ArrangeOrderType = ArrangeOrderType;
  static ArrangeAlignType = ArrangeAlignType;
  static FileDropEvent = FileDropEvent;
  static CustomDropEvent = CustomDropEvent;
  static ModifiedEvent = ModifiedEvent;
  static MODIFIED_EVENT = MODIFIED_EVENT;
  static SelectionChangedEvent = SelectionChangedEvent;
  static SELECTION_CHANGED_EVENT = SELECTION_CHANGED_EVENT;
  static InlineEditorEvent = InlineEditorEvent;
  static InvalidationRequestEvent = EditorInvalidationRequestEvent;
  static EdGeometryChangeEvent = EdGeometryChangeEvent;
  static HotkeyEvent = HotkeyEvent;

  /** Registers GPathsGraphEditor, which the selection code checks for. */
  static registerPathsGraphEditor(editorClass: abstract new (...args: never[]) => unknown): void {
    pathsGraphEditorClass = editorClass;
  }

  /** The editor of a scene, or null. */
  static getEditor(scene: unknown): Editor | null {
    const holder = scene as { __graphic_editor__?: Editor | null };
    return holder.__graphic_editor__ ? holder.__graphic_editor__ : null;
  }

  /**
   * Runs `fn` inside a transaction of the editor of `node`'s scene (when
   * there is one) and commits it under `name`, even when `fn` throws.
   */
  static tryRunTransaction(node: unknown, fn: () => void, name?: string | null): void {
    let editor: Editor | null = null;
    const holder = node as { getScene?: () => unknown } | null;
    if (holder && holder.getScene) {
      const scene = holder.getScene();
      editor = scene ? Editor.getEditor(scene) : null;
    }
    if (editor) editor.beginTransaction();
    try {
      fn();
    } finally {
      if (editor) editor.commitTransaction(name);
    }
  }

  /**
   * Constrains the vector from (x0, y0) to (x, y), in a frame rotated by
   * `angle`, to the horizontal, vertical or a diagonal: within tan(22.5°)
   * of an axis it snaps to the axis, otherwise to the 45° diagonal.
   */
  static convertToConstrain(x0: number, y0: number, x: number, y: number, angle?: number): Point {
    let constrainedY: number;
    let constrainedX: number;
    let frame = new Transform(1, 0, 0, 1, 0, 0);
    if (angle) frame = frame.rotated(angle);
    const local = ((frame = frame.translated(x0, y0)).inverted() as Transform).mapPoint(
      new Point(x, y),
    );
    const dx = local.getX();
    const dy = local.getY();
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (
      GMath.isEqualEps(absX, 0) ||
      GMath.isEqualEps(absY, 0) ||
      GMath.isEqualEps(absX - absY, 0)
    ) {
      constrainedX = dx;
      constrainedY = dy;
    } else if (absX > absY) {
      constrainedX = dx;
      constrainedY = absY / absX < 0.4142 ? 0 : 0 > dy ? -absX : absX;
    } else {
      constrainedY = dy;
      constrainedX = absX / absY < 0.4142 ? 0 : 0 > dx ? -absY : absY;
    }
    return frame.mapPoint(new Point(constrainedX, constrainedY));
  }

  /**
   * The union of the elements' geometry boxes; `relativeToPage` moves each
   * by its page position, `usePreview` takes an open editor's preview box
   * for transformable elements.
   */
  static getGroupGeometryBBox(
    elements: readonly unknown[] | null | undefined,
    relativeToPage?: unknown,
    usePreview?: unknown,
  ): Rect | null {
    if (!elements) return null;
    let box: Rect | null = null;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element instanceof Element) {
        let elementBox: Rect | null;
        if (usePreview && element.hasMixin(TransformMixin)) {
          const editor = editorOf(element);
          elementBox = editor ? editor.getPEGeometryBBox() : element.getGeometryBBox();
        } else elementBox = element.getGeometryBBox();
        if (elementBox) {
          if (relativeToPage) {
            const page = Editor.getElementPage(element);
            if (page) {
              const position = page.getPosition(true);
              elementBox = elementBox.translated(position.getX(), position.getY());
            }
          }
          box = box ? box.united(elementBox) : elementBox;
        }
      }
    }
    return box;
  }

  /**
   * The union of the elements' selection boxes (their editors' boxes)
   * moved by their page positions; falls back to the geometry boxes when
   * that union is empty.
   */
  static getGroupTransformBBox(
    elements: readonly unknown[] | null | undefined,
    relativeToPage?: unknown,
  ): Rect | null {
    if (!elements) return null;
    let box: Rect | null = null;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element instanceof Element) {
        const editor = editorOf(element);
        let elementBox: Rect | null;
        if ((elementBox = editor ? editor.getElementSelectionBBox() : element.getGeometryBBox())) {
          const page = Editor.getElementPage(element);
          if (page) {
            const position = page.getPosition(true);
            elementBox = elementBox.translated(position.getX(), position.getY());
          }
          box = box ? box.united(elementBox) : elementBox;
        }
      }
    }
    return box && (box.getWidth() || box.getHeight())
      ? box
      : Editor.getGroupGeometryBBox(elements, relativeToPage);
  }

  /** The page a node is on (itself when it is a page), or null. */
  static getElementPage(node: unknown): Page | null {
    for (let current = node as Node | null; current;) {
      if (current instanceof Page) return current;
      current = current.getParent();
    }
    return null;
  }

  /** The page of an element editor's element (or of its parent element editor's). */
  static getEditorPage(editor: unknown): Page | null {
    let elementEditor: ElementEditor | null = null;
    if (editor instanceof ElementEditor) elementEditor = editor;
    else if ((editor as BaseEditor).getParentEditor() instanceof ElementEditor) {
      elementEditor = (editor as BaseEditor).getParentEditor() as ElementEditor;
    }
    if (elementEditor) return Editor.getElementPage(elementEditor.getElement());
    return null;
  }

  /**
   * Whether `block` may be inserted into `parent` before `next` (null:
   * appended) without breaking the always-at-the-back program lock: such
   * blocks stay before every other block, except in pages, symbols and
   * other always-back containers.
   */
  static validateBlockInsertion(parent: unknown, block: unknown, next?: unknown): boolean {
    let previous: EdNode | null = null;
    let container = parent as EdNode | null;
    const blockNode = block as EdNode | null;
    const nextNode = (next ?? null) as EdNode | null;
    if (!container) {
      if (!nextNode || !nextNode.getParent()) return false;
      container = nextNode.getParent() as EdNode;
    }
    if (!blockNode) return false;
    if (nextNode === blockNode) return false;
    if (nextNode) previous = nextNode.getPrevious();
    else if (container.hasMixin(Container)) previous = container.getLastChild();
    if (previous === blockNode) previous = previous.getPrevious();
    if (
      (blockNode.getProperty("plkt") as number) & (ProgramLck.AlwaysBack as number) &&
      !(
        container instanceof Page ||
        container instanceof Scene ||
        (container.getProperty("plkt") as number) & (ProgramLck.AlwaysBack as number)
      )
    ) {
      return false;
    }
    if (previous) {
      if ((previous.getProperty("plkt") as number) & (ProgramLck.AlwaysBack as number)) {
        let after = previous.getNext();
        if (after === blockNode) after = after.getNext();
        return !(
          after && (after.getProperty("plkt") as number) & (ProgramLck.AlwaysBack as number)
        );
      }
      return !((blockNode.getProperty("plkt") as number) & (ProgramLck.AlwaysBack as number));
    }
    return !(
      nextNode && (nextNode.getProperty("plkt") as number) & (ProgramLck.AlwaysBack as number)
    );
  }

  declare _scene: Scene;
  declare _selection: EdNode[] | null;
  declare _lastCloneSelection: EdNode[] | null;
  declare _storedSelection: SelectionEntry[] | null;
  declare _selectionUpdateCounter: number;
  declare _selectionDetail: boolean;
  declare _selectionEdit: boolean;
  declare _pathResize: boolean;
  declare _transactionStack: TransactionFrame[];
  declare _undoStates: UndoState[];
  declare _redoStates: UndoState[];
  declare _savePointId: string | null;
  declare _guides: Guides;
  declare _distanceHelper: DistanceHelper;
  declare _keysOff: unknown[] | null;
  declare _currentInlineEditorNode: EdNode | null;
  declare _selEditor: SelectionEditorLike | null;
  declare _activatedPage: unknown;
  declare _edTrfSettings: { fullContentTransform: boolean } | null;
  declare _uid: unknown;

  constructor(scene: Scene) {
    super();
    this._scene = scene;
    (this._scene as unknown as { __graphic_editor__: Editor }).__graphic_editor__ = this;
    this._transactionStack = [];
    this._undoStates = [];
    this._redoStates = [];
    this._guides = new Guides(this._scene);
    const bboxGuide = new BBoxGuide(this._guides);
    bboxGuide.setPriority(BBoxGuide.PRIORITY.DISTANCE_FIRST);
    this._guides.addGuide(bboxGuide, true);
    this._guides.addGuide(new GridGuide(this._guides));
    this._guides.addGuide(new GuideLinesGuide(this._guides));
    this._guides.addGuide(new PointsGuide(this._guides));
    this._guides.addGuide(new PageGuide(this._guides));
    this._guides.addGuide(new FullPixelsGuide(this._guides));
    this._guides.addGuide(new PageLabelGuide(this._guides));
    this._guides.addGuide(new SymbolLabelGuide(this._guides));
    this._guides.addGuide(new ActionGuide(this._guides));
    this._distanceHelper = new DistanceHelper(this._scene);
    // Prepended, so the editor sees the changes before anyone else.
    this._scene.addEventListener(
      AfterInsertEvent,
      this._afterNodeInsert,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      BeforeRemoveEvent,
      this._beforeNodeRemove,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      BeforeFlagChangeEvent,
      this._beforeFlagChange,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      AfterFlagChangeEvent,
      this._afterFlagChange,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      Element.GeometryChangeEvent,
      this._geometryChange,
      this,
      undefined,
      undefined,
      true,
    );
    const selected = this._scene.queryAll(":selected") as unknown as EdNode[] | null;
    if (selected && selected.length) {
      for (let i = 0; i < selected.length; ++i) this._tryAddToSelection(selected[i] as EdNode);
    }
  }

  getScene(): Scene {
    return this._scene;
  }

  /** Whether anything is selected; null (not false) while there is no selection list, as before. */
  hasSelection(): boolean | null {
    return this._selection && this._selection.length > 0;
  }

  /** The union of the selection's paint boxes (geometry boxes with `geometry`), skipping empty ones. */
  getSelectionBBox(geometry?: boolean): Rect | null {
    if (this.hasSelection()) {
      const selection = this._selection as EdNode[];
      let box: Rect | null = null;
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i] as EdNode;
        const nodeBox = geometry ? node.getGeometryBBox() : node.getPaintBBox();
        if (nodeBox && nodeBox.getWidth() + nodeBox.getHeight() > 0) {
          box = box
            ? box.united(nodeBox)
            : new Rect(nodeBox.getX(), nodeBox.getY(), nodeBox.getWidth(), nodeBox.getHeight());
        }
      }
      return box;
    }
    return null;
  }

  getSelection(): Node[] | null {
    return this._selection as unknown as Node[] | null;
  }

  hasSelectionDetail(): boolean {
    return this._selectionDetail;
  }

  /**
   * Detail mode: the selection's editors show their parts (anchor points);
   * images switch to sub-selection editing when the double-click
   * behaviour asks for it.
   */
  setSelectionDetail(detail: boolean, force?: unknown, view?: EditorView | null): void {
    if (detail !== this._selectionDetail || force) {
      this._selectionDetail = detail;
      if (this._selection) {
        for (let i = 0; i < this._selection.length; ++i) {
          const editor = editorOf(this._selection[i]);
          if (editor) {
            if (this._selectionDetail) {
              editor.setFlag(EditorFlag.Detail as number);
              if (
                editor instanceof ImageEditor &&
                "subselect" == EditorOptions.selectDoubleClickBehavior
              ) {
                editor.setEditMode(
                  true,
                  force,
                  true,
                  view ? view.getWorldTransform().getScaleFactor() : null,
                );
              }
            } else {
              if (
                editor.getPartSelection() ||
                (editor instanceof CompoundPathEditor && editor.hasPathPartSelection())
              ) {
                editor.updatePartSelection(false, null);
              }
              if (
                editor instanceof ImageEditor &&
                "subselect" == EditorOptions.selectDoubleClickBehavior
              ) {
                editor.setEditMode(false, force);
              }
              editor.removeFlag(EditorFlag.Detail as number);
            }
          }
        }
      }
      this.updateSelectionEditors();
    }
  }

  hasSelectionEdit(): boolean {
    return this._selectionEdit;
  }

  /**
   * Edit mode: editors with their own selection editing (images) switch
   * it on; other boxes lose their resize handles, except paths.
   */
  setSelectionEdit(edit: boolean, force?: unknown, view?: EditorView | null): void {
    if (edit !== this._selectionEdit || force) {
      this._selectionEdit = edit;
      if (this._selection) {
        for (let i = 0; i < this._selection.length; ++i) {
          const editor = editorOf(this._selection[i]);
          if (editor) {
            if (editor.hasSelectionEditing()) {
              editor.setEditMode(
                edit,
                force,
                true,
                view ? view.getWorldTransform().getScaleFactor() : null,
              );
            } else if (!(
              editor instanceof PathEditor ||
              editor instanceof CompoundPathEditor ||
              isPathsGraphEditor(editor)
            )) {
              if (edit) editor.removeFlag(BoxFlag.ResizeAll as number);
              else editor.setFlag(BoxFlag.ResizeAll as number);
            }
          }
        }
      }
    }
  }

  hasPathResize(): boolean {
    return this._pathResize;
  }

  /** Whether paths in the selection show resize handles. */
  setPathResize(resize: boolean, force?: unknown): void {
    if ((this._pathResize !== resize || force) && ((this._pathResize = resize), this._selection)) {
      for (let i = 0; i < this._selection.length; ++i) {
        const editor = editorOf(this._selection[i]);
        if (
          (editor instanceof PathEditor &&
            !CompoundPath.isOwnedPath(this._selection[i] as never)) ||
          editor instanceof CompoundPathEditor ||
          isPathsGraphEditor(editor)
        ) {
          if (this._pathResize) (editor as EdEditor).setFlag(BoxFlag.ResizeAll as number);
          else (editor as EdEditor).removeFlag(BoxFlag.ResizeAll as number);
        }
      }
    }
  }

  getSelectionEditor(): SelectionEditorLike | null {
    return this._selEditor;
  }

  /** Hides the editors of the selected blocks and the selection editor. */
  hideSelection(): void {
    if (this._selection) {
      for (let i = 0; i < this._selection.length; ++i) {
        const editor = editorOf(this._selection[i]);
        if (editor instanceof BlockEditor) editor.setFlag(EditorFlag.HideEditor as number);
      }
      if (this._selEditor) this._selEditor.setFlag(EditorFlag.HideEditor as number);
    }
  }

  resetHideSelection(): void {
    if (this._selection) {
      for (let i = 0; i < this._selection.length; ++i) {
        const editor = editorOf(this._selection[i]);
        if (editor instanceof BlockEditor) editor.removeFlag(EditorFlag.HideEditor as number);
      }
      if (this._selEditor) this._selEditor.removeFlag(EditorFlag.HideEditor as number);
    }
    this.updateSelectionEditors();
  }

  getGuides(): Guides {
    return this._guides;
  }

  getDistanceHelper(): DistanceHelper {
    return this._distanceHelper;
  }

  /** Starts measuring, unless `key` is switched off; returns whether it did. */
  activateDistanceHelper(key?: unknown): boolean {
    let allowed = true;
    if (key && this._keysOff && this._keysOff.length) {
      for (let i = 0; i < this._keysOff.length && allowed; ++i) {
        if (this._keysOff[i] == key) allowed = false;
      }
    }
    return !!allowed && (this._distanceHelper.activateMeasurement(), true);
  }

  /** Switches keys off for the distance helper (no duplicates). */
  keysOff(keys: readonly unknown[] | null | undefined): void {
    if (keys && keys.length) {
      if (this._keysOff) {
        for (let i = 0; i < keys.length; ++i) {
          let add = true;
          for (let k = 0; k < this._keysOff.length && add; ++k) {
            if (this._keysOff[k] == keys[i]) add = false;
          }
          if (add) this._keysOff.push(keys[i]);
        }
      } else this._keysOff = keys.slice();
    }
  }

  keysOn(keys: readonly unknown[] | null | undefined): void {
    if (keys && keys.length && this._keysOff && this._keysOff.length) {
      for (let i = 0; i < keys.length; ++i) {
        for (let k = this._keysOff.length - 1; k >= 0; --k) {
          if (this._keysOff[k] == keys[i]) this._keysOff.splice(k, 1);
        }
      }
      if (!this._keysOff.length) this._keysOff = null;
    }
  }

  /** The one selected path or compound path, or null when anything else is selected too. */
  getPathSelection(): EdNode | null {
    let path: EdNode | null = null;
    if (this.hasSelection()) {
      const selection = this._selection as EdNode[];
      for (let i = 0; i < selection.length; ++i) {
        if (selection[i] instanceof Path || selection[i] instanceof CompoundPath) {
          if (path) {
            path = null;
            break;
          }
          path = selection[i] as EdNode;
        } else if (path) {
          path = null;
          break;
        }
      }
    }
    return path;
  }

  /**
   * The nodes snapping must ignore: the selection (unless `childrenOnly`)
   * and every element inside a selected container.
   */
  getAlignExclusions(childrenOnly?: unknown, nodes?: readonly EdNode[] | null): EdNode[] | null {
    let exclusions: EdNode[] | null = null;
    const list = nodes || this._selection;
    if (list && list.length) {
      let found: EdNode[] = [];
      if (!childrenOnly) found = list.slice();
      for (let i = 0; i < list.length; ++i) {
        const node = list[i] as EdNode;
        if (node.hasMixin(Container)) {
          node.acceptChildren(
            (child) => {
              if (!(child instanceof Element)) return false;
              found.push(child);
            },
            false,
            true,
          );
        }
      }
      if (found.length) exclusions = found;
    }
    return exclusions;
  }

  /**
   * The containers snapping looks in: the nearest element parent of each
   * node, or the active layer (else the active page) without nodes.
   */
  getMappingScopes(nodes?: readonly EdNode[] | null): EdNode[] {
    const list = nodes || this._selection;
    const scopes: EdNode[] = [];
    let scope: EdNode | null;
    if (list && list.length) {
      for (let i = 0; i < list.length; ++i) {
        const node = list[i] as EdNode;
        if (node.getParent()) {
          scope = node.findParent((parent) => parent instanceof Element);
          if (scope && (!scopes.length || scopes.indexOf(scope) < 0)) scopes.push(scope);
        }
      }
    } else {
      scope =
        (this._scene.querySingle("layer:active") as unknown as EdNode | null) ||
        (this._scene.getActivePage() as unknown as EdNode | null);
      if (scope) scopes.push(scope);
    }
    return scopes;
  }

  /** Detaches the editor from its scene. */
  release(): void {
    MODIFIED_EVENT.sender = null;
    SELECTION_CHANGED_EVENT.sender = null;
    delete (this._scene as unknown as { __graphic_editor__?: Editor }).__graphic_editor__;
    this._scene.removeEventListener(AfterInsertEvent, this._afterNodeInsert, this);
    this._scene.removeEventListener(BeforeRemoveEvent, this._beforeNodeRemove, this);
    this._scene.removeEventListener(BeforeFlagChangeEvent, this._beforeFlagChange, this);
    this._scene.removeEventListener(AfterFlagChangeEvent, this._afterFlagChange, this);
    this._scene.removeEventListener(Element.GeometryChangeEvent, this._geometryChange, this);
  }

  requestInvalidation(editor?: unknown, args?: unknown): void {
    if (this.hasEventListeners(EditorInvalidationRequestEvent)) {
      this.trigger(new EditorInvalidationRequestEvent(editor, args));
    }
  }

  /** Centres the selection on the active page (its box when fixed-size, its paint box otherwise). */
  centerSelection(): void {
    const page = this._scene.getActivePage();
    const area = page
      ? page.isFixedSized()
        ? page.getGeometryBBox()
        : page.getPaintBBox()
      : this._scene.getPaintBBox();
    this.arrangeAlign(ArrangeAlignType.AlignCenter, null, true, area, true);
    this.arrangeAlign(ArrangeAlignType.AlignMiddle, null, true, area, true);
  }

  /**
   * The annotations a clone must leave out: other users' annotations and
   * the comments under this user's own ones.
   */
  getAnnotationsExceptions(nodes: readonly EdNode[]): EdNode[] {
    const uid = this._uid;
    const exceptions: EdNode[] = [];
    const add = (annotation: EdNode): void => {
      if (annotation.getProperty("uid") === uid) {
        for (let child = annotation.getFirstChild(); null !== child; child = child.getNext()) {
          if (child instanceof Comment) exceptions.push(child);
        }
      } else exceptions.push(annotation);
    };
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as EdNode;
      let list: EdNode | undefined;
      if (node instanceof Page && node.hasAnnotations()) {
        list = node.getAnnotations() as unknown as EdNode;
      } else if (node instanceof AnnotationsList) list = node as unknown as EdNode;
      if (list) {
        for (
          let annotation = list.getFirstChild();
          null !== annotation;
          annotation = annotation.getNext()
        ) {
          add(annotation);
        }
      } else if (node.hasMixin(AnnotationMixin)) add(node);
      else if (node instanceof Comment) exceptions.push(node);
    }
    return exceptions;
  }

  /**
   * The texts on a path and the connectors inside `node` whose path (or
   * an ancestor of it) is in `selection`: they must move with it, so
   * clones and transforms leave them out.
   */
  getLinkedElementsInSelection(node: EdNode, selection: readonly EdNode[]): EdNode[] {
    const linked: EdNode[] = [];
    const scene = this._scene;
    const visit = (element: EdNode): unknown => {
      let paths: EdNode[] | undefined;
      if (element instanceof Text && element.hasPathAttached()) {
        scene.visitLinks(element as never, (link: unknown) => {
          if (link instanceof PathBase) {
            paths = [link as unknown as EdNode];
            return false;
          }
        });
      }
      if (element instanceof Connector) {
        paths = [
          element.getSrcPath() as unknown as EdNode,
          element.getDstPath() as unknown as EdNode,
        ];
      }
      if (paths) {
        paths.forEach((path) => {
          for (let current: EdNode | null = path; current;) {
            if (selection.indexOf(current) >= 0) {
              linked.push(element);
              break;
            }
            current = current.getParent();
          }
        });
      }
      return undefined;
    };
    visit(node);
    if (!linked.length && node.hasMixin(Container)) node.acceptChildren(visit);
    return linked;
  }

  /**
   * Clones the selection (shifted by cloneShift with `shift`) and selects
   * the clones. With `repeat`, the transform between the last clones and
   * their originals is applied again (duplicate repeats the last move).
   */
  cloneSelection(shift?: unknown, repeat?: unknown): EdNode[] | null {
    if (this._selection && this._selection.length > 0) {
      const individual = this.getIndividualSelection() as EdNode[];
      const toClone: { element: EdNode; transform: Transform | null }[] = [];
      let exceptions: EdNode[] = [];
      for (let i = 0; i < individual.length; ++i) {
        const element = individual[i] as EdNode;
        exceptions = exceptions.concat(this.getLinkedElementsInSelection(element, individual));
        if (element.hasMixin(Store)) {
          toClone.push({
            element,
            transform: shift
              ? new Transform(1, 0, 0, 1, EditorOptions.cloneShift, EditorOptions.cloneShift)
              : null,
          });
        }
      }
      exceptions = exceptions.concat(this.getAnnotationsExceptions(individual));
      const clones: EdNode[] = [];
      let originals: EdNode[] | undefined;
      if (repeat) {
        if (this._lastCloneSelection) {
          for (let i = 0; i < this._lastCloneSelection.length; ++i) {
            const previous = this._lastCloneSelection[i] as EdNode;
            const current = (toClone[i] as { element: EdNode }).element;
            if (previous.hasMixin(TransformMixin) && current.hasMixin(TransformMixin)) {
              const previousTransform = previous.getTransform();
              const currentTransform = current.getTransform();
              if (currentTransform) {
                const delta = previousTransform
                  ? currentTransform.preMultiplied(previousTransform.inverted() as Transform)
                  : currentTransform;
                if (!delta.isIdentity())
                  (toClone[i] as { transform: Transform | null }).transform = delta;
              }
            }
          }
        }
        originals = [];
      }
      for (let i = 0; i < toClone.length; ++i) {
        const element = (toClone[i] as { element: EdNode }).element;
        const transform = (toClone[i] as { transform: Transform | null }).transform;
        const clone = element.clone({
          exceptions,
          copy: true,
          copyIgnoreProperties: EditorOptions.propertiesExcludedFromCopying,
        });
        if (clone) {
          if (clone instanceof Page) {
            (element.getParent() as EdNode).insertChild(clone as unknown as EdNode);
            const position = clone.getPosition(true, true, true, true);
            clone.setProperty("off", new Transform(1, 0, 0, 1, position.getX(), position.getY()));
            this._scene.renameClone(element as never, clone as never);
          } else (element.getParent() as EdNode).insertChild(clone, element.getNext());
          if (!(clone instanceof Page) && transform && clone.hasMixin(TransformMixin)) {
            clone.transform(transform, true);
          }
          clones.push(clone);
          if (repeat) (originals as EdNode[]).push(element);
        }
      }
      if (clones.length > 0) {
        let sceneEditor = editorOf(this._scene);
        const transformBoxActive = !!sceneEditor && sceneEditor.isTransformBoxActive();
        this.updateSelection(false, clones);
        if (clones[0] instanceof Page) this._scene.setActivePage(clones[0]);
        if ((sceneEditor = editorOf(this._scene)) && transformBoxActive) {
          sceneEditor.setTransformBoxActive(true);
        }
      }
      if (repeat) this._lastCloneSelection = (originals as EdNode[]).slice();
      return clones;
    }
    return null;
  }

  /**
   * Deletes the selection (one transaction unless `noTransaction`): an
   * editor with selected parts deletes the parts, a symbol instance
   * inside a symbol is hidden and locked instead, emptied groups and
   * compound shapes are removed too, and selected layers are deleted.
   */
  deleteSelection(noTransaction?: unknown): null {
    let selection = this.getIndividualSelection();
    if (selection) {
      selection = selection
        .slice()
        .filter(
          (node) => !((node.getProperty("plkt") as number) & (ProgramLck.NoDelete as number)),
        );
    }
    if (selection && selection.length > 0) {
      if (!noTransaction) this.beginTransaction();
      this._beginSelectionUpdate();
      try {
        const ordered = Node.order(selection as unknown as Node[], true) as unknown as EdNode[];
        for (let i = 0; i < ordered.length; ++i) {
          const node = ordered[i] as EdNode;
          let parent = node.getParent();
          while (parent && (!(parent instanceof SymbolNode) || parent.isMaster())) {
            parent = parent.getParent();
          }
          if (parent && node.hasMixin(Multireference)) {
            if (
              !(parent as unknown as SymbolNode)._getMasterSibling(
                (node as unknown as { getMultireferenceId(): string }).getMultireferenceId(),
                false,
                true,
              )
            ) {
              parent = null;
            }
          }
          if (node instanceof Block && parent && !this._selectionDetail) {
            node.setProperties(["vis", "lkt"], [false, Block.LockType.Full]);
            node.removeFlag(NodeFlag.Selected);
            node.removeFlag(NodeFlag.Highlighted);
          } else if (node instanceof Item && !node.hasFlag(ElementFlag.PartialLocked)) {
            let editor = editorOf(node);
            if (parent && node instanceof Block && !(editor as EdEditor).isDeletePartsAllowed())
              continue;
            parent = node.getParent() as EdNode | null;
            if (
              (editor = editorOf(node)) &&
              editor.isDeletePartsAllowed() &&
              !editor.isRemovalBlocked()
            ) {
              editor.deletePartsSelected();
            } else if (editor && !editor.isRemovalBlocked() && parent) {
              node.removeFlag(NodeFlag.Selected);
              parent.removeChild(node as unknown as EdNode);
            }
            while (
              (parent instanceof CompoundShape || parent instanceof Group) &&
              !parent.getFirstChild()
            ) {
              const grandParent = (parent as unknown as EdNode).getParent();
              if (grandParent) grandParent.removeChild(parent as unknown as EdNode);
              parent = grandParent;
            }
          } else if (node instanceof Layer && !node.hasFlag(ElementFlag.PartialLocked)) {
            this._scene.deleteActiveLayer(node as never);
          }
        }
      } finally {
        this._finishSelectionUpdate();
        if (!noTransaction) this.commitTransaction(loc("action.delete-selection"));
      }
    }
    return null;
  }

  /**
   * Selects `nodes` (replacing the selection), or with `toggle` flips
   * each one's selection; a deselected container hands the selection to
   * its internally selected children. Fully program-locked nodes are
   * skipped.
   */
  updateSelection(toggle: boolean, nodes?: readonly unknown[] | null): void {
    let list = nodes as EdNode[] | null | undefined;
    this._beginSelectionUpdate();
    try {
      if (list && list.length) {
        list = list.filter((node) => {
          const lock = node.getProperty("plkt") as number;
          return !(
            lock & (ProgramLck.NoEdit as number) &&
            lock & (ProgramLck.NoSizeChanges as number) &&
            lock & (ProgramLck.NoMove as number) &&
            lock & (ProgramLck.NoDelete as number) &&
            lock & (ProgramLck.NoSelect as number)
          );
        });
      }
      if (toggle) {
        if (list && list.length) {
          for (let i = 0; i < list.length; ++i) {
            const node = list[i] as EdNode;
            if (node.hasFlag(NodeFlag.Selected)) {
              const internal = node.hasMixin(Container) ? node.getInternalSelectedNodes() : null;
              node.removeFlag(NodeFlag.Selected);
              if (internal && internal.length)
                internal.forEach((child) => child.setFlag(NodeFlag.Selected));
            } else node.setFlag(NodeFlag.Selected);
          }
        }
      } else {
        this.clearSelection(list);
        if (list && list.length > 0) {
          for (let i = 0; i < list.length; ++i) (list[i] as EdNode).setFlag(NodeFlag.Selected);
        }
      }
    } finally {
      this._finishSelectionUpdate();
    }
  }

  /**
   * Selects the nodes under a marquee (`collision`); in detail mode
   * editors that support it select their parts under it instead, and
   * whole nodes only count when fully inside. `pageRelative` maps the
   * marquee into each node's page; `partsOnly` only updates parts.
   */
  updateSelectionUnderCollision(
    toggle: boolean,
    nodes: readonly unknown[],
    collision: unknown,
    pageRelative?: unknown,
    partsOnly?: unknown,
  ): void {
    let area = collision;
    this._beginSelectionUpdate();
    try {
      let whole: EdNode[] = [];
      const withParts: EdNode[] = [];
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i] as EdNode;
        const editor = openEditorOf(node);
        if (pageRelative) {
          const page =
            (node.findParent((parent) => parent instanceof Page) as unknown as Page | null) ||
            (this._scene.getActivePage() as Page);
          const position = page.getPosition(pageRelative);
          area = new VertexTransformer(
            collision as never,
            new Transform(1, 0, 0, 1, -position.getX(), -position.getY()),
          );
        }
        if (partsOnly) {
          if (this._selectionDetail && editor && editor.isPartSelectionUnderCollisionAllowed()) {
            editor.updatePartSelectionUnderCollision(toggle, area);
          }
        } else if (
          editor &&
          editor.isPartSelectionUnderCollisionAllowed() &&
          this._selectionDetail
        ) {
          if (editor.updatePartSelectionUnderCollision(toggle, area)) withParts.push(node);
        } else if (this._selectionDetail) {
          if (node.isFullUnderCollision(area)) whole.push(node);
        } else whole.push(node);
      }
      if (!partsOnly) {
        if (withParts && withParts.length) {
          if ((this._selection || (this._selection = []), toggle)) {
            for (let i = 0; i < withParts.length; ++i) {
              if (this._selection.indexOf(withParts[i] as EdNode) < 0) {
                this._tryAddToSelection(withParts[i] as EdNode);
              }
            }
            this.updateSelection(toggle, whole);
          } else {
            whole = whole.concat(withParts);
            this.updateSelection(toggle, whole);
          }
        } else this.updateSelection(toggle, whole);
      }
    } finally {
      this._finishSelectionUpdate();
    }
  }

  /**
   * Highlights what a marquee would select (the hover preview of
   * updateSelectionUnderCollision) and removes the highlight elsewhere.
   */
  highlightSelectablesUnderCollision(
    toggle: boolean,
    nodes: readonly unknown[],
    collision: unknown,
    pageRelative?: unknown,
    partsOnly?: unknown,
  ): void {
    let index: number;
    let editor: EdEditor | null = null;
    let keptSelected: boolean;
    let area = collision;
    const remaining = asNodes(nodes).slice();
    const toHighlight: EdNode[] = [];
    const pageArea = (node: EdNode): unknown => {
      const page =
        (node.findParent((parent) => parent instanceof Page) as unknown as Page | null) ||
        (this._scene.getActivePage() as Page);
      const position = page.getPosition(pageRelative);
      return new VertexTransformer(
        collision as never,
        new Transform(1, 0, 0, 1, -position.getX(), -position.getY()),
      );
    };
    this._scene.acceptChildren(
      (child: Node) => {
        const node = child as unknown as EdNode;
        if ((index = remaining.indexOf(node)) >= 0) {
          keptSelected = false;
          remaining.splice(index, 1);
          if (partsOnly) {
            if (
              this._selectionDetail &&
              (toggle || !node.hasFlag(NodeFlag.Highlighted)) &&
              (editor = openEditorOf(node)) &&
              editor.isPartSelectionUnderCollisionAllowed()
            ) {
              if (pageRelative) area = pageArea(node);
              editor.updatePartSelectionUnderCollision(toggle, area, true);
            }
          } else if (!(node.hasFlag(NodeFlag.Highlighted) && !toggle)) {
            if (this._selectionDetail) editor = openEditorOf(node);
            if (this._selectionDetail && editor && editor.isPartSelectionUnderCollisionAllowed()) {
              if (!this._selectionDetail) editor = openEditorOf(node);
              if (editor) {
                if (pageRelative) area = pageArea(node);
                editor.updatePartSelectionUnderCollision(toggle, area, true);
              }
            } else {
              if (this._selectionDetail && pageRelative) area = pageArea(node);
              if (!(this._selectionDetail && !node.isFullUnderCollision(area))) {
                if (toggle && node.hasFlag(NodeFlag.Selected)) {
                  keptSelected = true;
                  if (node.hasFlag(NodeFlag.Highlighted)) {
                    node.removeFlag(NodeFlag.Highlighted);
                    // The old code incremented an undeclared global here
                    // (`removeFlag++`), which throws a ReferenceError. Kept
                    // until the coordinator's fix (BUGS-FIXED candidate "Toggle
                    // marquee over a highlighted selected node throws").
                    throw new ReferenceError("removeFlag is not defined");
                  }
                } else node.setFlag(NodeFlag.Highlighted);
              }
            }
          }
          if (toggle && !partsOnly && !(keptSelected || node.hasFlag(NodeFlag.Highlighted))) {
            toHighlight.push(node);
          }
        } else if (node.hasFlag(NodeFlag.Highlighted)) node.removeFlag(NodeFlag.Highlighted);
        return true;
      },
      false,
      true,
    );
    if (!partsOnly && toggle && toHighlight.length) {
      for (let i = 0; i < toHighlight.length; ++i)
        (toHighlight[i] as EdNode).setFlag(NodeFlag.Highlighted);
    }
  }

  /**
   * Deselects everything except `keep` (no-op when the selection equals
   * `keep`); deselected containers hand the selection to their
   * internally selected children.
   */
  clearSelection(keep?: readonly unknown[] | null): void {
    if (!equals(keep, this._selection)) {
      this._beginSelectionUpdate();
      try {
        for (let i = 0; this._selection && i < this._selection.length;) {
          const node = this._selection[i] as EdNode;
          if (keep && keep.indexOf(node) >= 0) i++;
          else {
            const internal = node.hasMixin(Container) ? node.getInternalSelectedNodes() : null;
            node.removeFlag(NodeFlag.Selected);
            if (internal && internal.length)
              internal.forEach((child) => child.setFlag(NodeFlag.Selected));
          }
        }
      } finally {
        this._finishSelectionUpdate();
      }
    }
  }

  /** Deselects a container's internally selected children except `keep`; false when nothing changed. */
  clearInternalSelection(container: EdNode, keep?: readonly unknown[] | null): boolean {
    const internal = container.hasMixin(Container) ? container.getInternalSelectedNodes() : null;
    if (internal && internal.length) {
      if (equals(keep, internal)) return false;
      this._beginSelectionUpdate();
      try {
        for (let i = 0; i < internal.length; ++i) {
          if (!keep || keep.indexOf(internal[i]) < 0)
            (internal[i] as EdNode).removeFlag(NodeFlag.Selected);
        }
      } finally {
        this._finishSelectionUpdate();
      }
      return true;
    }
    return false;
  }

  storeSelection(): void {
    this._storedSelection = this._saveSelection();
  }

  restoreSelection(): void {
    this._loadSelection(this._storedSelection);
  }

  /** Drops containers that have a selected item inside (those items are selected on their own). */
  filterIndividualElements(nodes: readonly EdNode[]): EdNode[] {
    const out: EdNode[] = [];
    const noSelectedItem = (node: EdNode): boolean =>
      !(node instanceof Item && node.hasFlag(NodeFlag.Selected));
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i] as EdNode;
      if (node.hasMixin(Container)) {
        if (node.acceptChildren(noSelectedItem)) out.push(node);
      } else out.push(node);
    }
    return out;
  }

  getIndividualSelection(): EdNode[] | null {
    return this._selection ? this.filterIndividualElements(this._selection) : null;
  }

  /**
   * Moves the selection by `delta`, snapped by the guides when `snap`
   * (with snap zones, the closest side of a single element's box to
   * `zonePoint` snaps; otherwise the group's box). Returns the move done.
   */
  moveSelection(
    delta: Point,
    snap?: unknown,
    detail?: unknown,
    noBlock?: unknown,
    zonePoint?: Point | null,
    childrenOnlyExclusions?: unknown,
    multiPage?: unknown,
    collisionless?: unknown,
  ): Point {
    if (!this._selection) return new Point(0, 0);
    const movable = this._selection.filter(
      (node) =>
        !(node instanceof Block) ||
        (node instanceof Block &&
          0 == ((node.getProperty("plkt") as number) & (ProgramLck.NoMove as number))),
    );
    if (!movable.length) return new Point(0, 0);
    let move = delta;
    if (snap) {
      const exclusions = this.getAlignExclusions(childrenOnlyExclusions);
      if (exclusions) this._guides.useExclusions(exclusions as unknown as Node[]);
      const scopes = this.getMappingScopes();
      // The old code passed the bbox guide's class as the guide id list
      // when an annotation is moved; see "Moving an annotation disables
      // every guide" in QUESTIONS.md.
      let guideIds: string[] | null = null;
      if (movable.some((node) => node.hasMixin(AnnotationMixin))) {
        guideIds = [BBoxGuide as unknown as string];
      }
      if (
        Guides.options.zones &&
        zonePoint &&
        1 == movable.length &&
        (movable[0] as EdNode).getGeometryBBox()
      ) {
        const box = (movable[0] as EdNode).getGeometryBBox() as Rect;
        const sideName = box.getClosestSideName(zonePoint);
        const side = box.getSide(sideName);
        let target = side.add(delta);
        this._guides.beginMap(scopes as unknown as Node[]);
        target = this._guides.mapPoint(
          target,
          detail ? DetailMapMode.DetailOnFilterOn : DetailMapMode.FilterOff,
          guideIds,
        );
        this._guides.finishMap();
        move = target.subtract(side);
      } else {
        const individual = this.filterIndividualElements(movable);
        const box = Editor.getGroupGeometryBBox(individual, multiPage);
        if (box) {
          let moved = box.translated(delta.getX(), delta.getY());
          this._guides.beginMap(scopes as unknown as Node[]);
          moved = this._guides.mapRect(moved, guideIds, !!multiPage);
          this._guides.finishMap();
          const topLeft = box.getSide(Rect.Side.TOP_LEFT);
          move = moved.getSide(Rect.Side.TOP_LEFT).subtract(topLeft);
        }
      }
    }
    let options: EdTransformOptions | null = null;
    if (multiPage) {
      options = new EdTransformOptions();
      options.isMultiPage = true;
      options.doCollisionlessTransform = collisionless;
    }
    this.transformSelection(
      new Transform(1, 0, 0, 1, move.getX(), move.getY()),
      detail,
      noBlock,
      options,
    );
    return new Point(move.getX(), move.getY());
  }

  /**
   * Scales the selection's previews by (sx, sy) around the side given by
   * the signs of (dx, dy): negative takes the bottom/right edge, positive
   * the top/left, zero the centre.
   */
  scaleSelection(
    scaleX: number,
    scaleY: number,
    directionX: number,
    directionY: number,
    _unused?: unknown,
    detail?: unknown,
    noBlock?: unknown,
    multiPage?: unknown,
  ): void {
    const individual = this.getIndividualSelection();
    const box = Editor.getGroupGeometryBBox(individual, multiPage);
    if (box) {
      const topLeft = box.getSide(Rect.Side.TOP_LEFT);
      const bottomRight = box.getSide(Rect.Side.BOTTOM_RIGHT);
      const center = box.getSide(Rect.Side.CENTER);
      const originX =
        directionX < 0 ? bottomRight.getX() : directionX > 0 ? topLeft.getX() : center.getX();
      const originY =
        directionY < 0 ? bottomRight.getY() : directionY > 0 ? topLeft.getY() : center.getY();
      const transform = new Transform(1, 0, 0, 1, -originX, -originY)
        .multiplied(new Transform(scaleX, 0, 0, scaleY, 0, 0))
        .multiplied(new Transform(1, 0, 0, 1, originX, originY));
      let options: EdTransformOptions | null = null;
      if (multiPage) {
        options = new EdTransformOptions();
        options.isMultiPage = true;
      }
      this.transformSelection(transform, detail, noBlock, options);
    }
  }

  /**
   * Previews `transform` on the selection's editors (in multi-page mode
   * conjugated by each element's page offset from the active page).
   */
  transformSelection(
    transform: Transform,
    detail?: unknown,
    noBlock?: unknown,
    options?: EdTransformOptions | null,
  ): void {
    if (this._selection && this._selection.length) {
      if (this._selEditor) this._selEditor.edTransform(transform, detail, noBlock, options);
      const individual = this.filterIndividualElements(this._selection);
      const activePage = this._scene ? this._scene.getActivePage() : null;
      const activePosition = activePage ? activePage.getPosition(true) : null;
      for (let i = 0; i < individual.length; ++i) {
        let page: Page | null;
        const element = individual[i] as EdNode;
        const editor = editorOf(element);
        if (editor) {
          if (options && options.isMultiPage && (page = Editor.getElementPage(element))) {
            let offset = page.getPosition(true);
            if (activePosition) offset = offset.subtract(activePosition);
            const shift = new Transform(1, 0, 0, 1, offset.getX(), offset.getY());
            editor.edTransform(
              shift.multiplied(transform).multiplied(shift.inverted() as Transform),
              detail,
              noBlock,
              options,
            );
          } else editor.edTransform(transform, detail, noBlock, options);
        }
      }
      if (this.hasEventListeners(EdGeometryChangeEvent)) this.trigger(new EdGeometryChangeEvent());
    }
  }

  /** Previews a resize of the selection (the selection editor's, else each block editor's). */
  resizeSelection(a: unknown, b: unknown, c: unknown): void {
    if (this._selection && this._selection.length) {
      if (this._selEditor) this._selEditor.resize(a, b, c);
      else {
        let individual = this.filterIndividualElements(this._selection);
        if (
          !(individual = individual.filter(
            (node) =>
              !(node instanceof Block) ||
              (node instanceof Block &&
                0 == ((node.getProperty("plkt") as number) & (ProgramLck.NoSizeChanges as number))),
          )).length
        ) {
          return;
        }
        for (let i = 0; i < individual.length; ++i) {
          const editor = editorOf(individual[i]);
          if (editor && editor instanceof BlockEditor) editor.resize(a, b, c);
        }
      }
      if (this.hasEventListeners(EdGeometryChangeEvent)) this.trigger(new EdGeometryChangeEvent());
    }
  }

  /** Applies the previewed resize (one transaction unless `noTransaction`). */
  applyResizeSelection(partId: unknown, partData: unknown, noTransaction?: unknown): void {
    if (this._selection && this._selection.length) {
      if (!noTransaction) this.beginTransaction();
      try {
        let linked: EdNode[] = [];
        let individual = this.filterIndividualElements(this._selection);
        for (let i = 0; i < individual.length; ++i) {
          linked = linked.concat(
            this.getLinkedElementsInSelection(individual[i] as EdNode, individual),
          );
        }
        if (this._selEditor) this._selEditor.applyPartMove(partId, partData, null, linked);
        else {
          individual = this.filterIndividualElements(this._selection);
          for (let i = 0; i < individual.length; ++i) {
            const element = individual[i];
            if (element) {
              const editor = editorOf(element);
              if (editor && editor instanceof BlockEditor)
                editor.applyPartMove(partId, partData, null, linked);
            }
          }
        }
      } finally {
        // The old key is misspelled ("selecion"); the string table has it so.
        if (!noTransaction) this.commitTransaction(loc("action.resize-selecion"));
      }
    }
  }

  resetSelectionTransform(): void {
    if (this._selection && this._selection.length) {
      for (let i = 0; i < this._selection.length; ++i) {
        const editor = editorOf(this._selection[i]);
        if (editor) editor.resetTransform();
      }
    }
  }

  /**
   * Applies the previewed transform of the selection (one transaction
   * unless `noTransaction`). With `clone`, storable elements are cloned
   * and the clones get the transform (and the selection); `applyToSource`
   * applies to the originals even then. Linked texts and connectors are
   * left to follow their paths.
   */
  applySelectionTransform(
    clone?: unknown,
    noTransaction?: unknown,
    applyToSource?: unknown,
    extra?: unknown,
  ): void {
    if (this._selection && this._selection.length) {
      const individual = this.filterIndividualElements(this._selection);
      this._guides.invalidate();
      const applicable: EdNode[] = [];
      for (let i = 0; i < individual.length; ++i) {
        const element = individual[i] as EdNode;
        const editor = editorOf(element);
        if (editor) {
          if (editor.canApplyTransform()) applicable.push(element);
          else editor.resetTransform();
        }
      }
      if (applicable && applicable.length > 0) {
        let linked: EdNode[] = [];
        let originals: EdNode[] | undefined;
        if (clone) originals = [];
        for (let i = 0; i < applicable.length; ++i) {
          linked = linked.concat(
            this.getLinkedElementsInSelection(applicable[i] as EdNode, applicable),
          );
        }
        if (clone) linked = linked.concat(this.getAnnotationsExceptions(applicable));
        if (!noTransaction) this.beginTransaction();
        try {
          const clones: EdNode[] = [];
          let cloneLinked: EdNode[] = [];
          for (let i = 0; i < applicable.length; ++i) {
            const element = applicable[i] as EdNode;
            const editor = editorOf(element);
            if (editor) {
              const source = element;
              let target: EdNode | null =
                linked.length && linked.indexOf(source) >= 0 ? null : source;
              if (target) {
                if (clone) {
                  if (source.hasMixin(Store)) {
                    if (
                      (target = source.clone({
                        exceptions: linked,
                        copy: true,
                        copyIgnoreProperties: EditorOptions.propertiesExcludedFromCopying,
                      }))
                    ) {
                      (source.getParent() as EdNode).insertChild(target, source.getNext());
                      if (target instanceof Page)
                        this._scene.renameClone(source as never, target as never);
                      clones.push(target);
                      cloneLinked = cloneLinked.concat(
                        this.getLinkedElementsInSelection(target, clones),
                      );
                      (originals as EdNode[]).push(source);
                    }
                  } else target = null;
                } else if (source.hasFlag(ElementFlag.PartialLocked)) target = null;
              }
              if (target)
                editor.applyTransform(
                  applyToSource ? source : target,
                  extra,
                  clone ? cloneLinked : linked,
                );
              else editor.resetTransform();
            }
          }
          if (this._selEditor) this._selEditor.resetTransform();
          if (!applyToSource && clones.length > 0) this.updateSelection(false, clones);
          if (clone) this._lastCloneSelection = (originals as EdNode[]).slice();
        } finally {
          if (!noTransaction) {
            this.commitTransaction(
              clone ? loc("action.transform-clone-selection") : loc("action.transform-selection"),
            );
          }
        }
      }
    }
  }

  setUID(uid: unknown): void {
    this._uid = uid;
  }

  /**
   * Inserts elements into `target` (default: the active layer, else the
   * scene's active page; a locked layer falls back to the scene) and
   * selects them, as one transaction unless `noTransaction`.
   *
   * - `noInitialSetup`: don't give new editors the selected element's style;
   * - `besideSelection`: insert after the topmost selected element when it
   *   is in the target, else in its parent when every element may go there;
   * - `relinkSymbols`: symbol instances whose master isn't in this scene
   *   become masters, and instances are relinked;
   * - `next`: insert before this node.
   *
   * Annotations go into the active page's annotations list. Texts whose
   * path is among the elements are not inserted on their own.
   */
  insertElements(
    elements: readonly unknown[],
    noInitialSetup?: unknown,
    noTransaction?: unknown,
    besideSelection?: unknown,
    relinkSymbols?: unknown,
    target?: unknown,
    next?: unknown,
  ): void {
    let list = asNodes(elements);
    let parent = (target ||
      this._scene.querySingle("layer:active") ||
      this._scene) as unknown as EdNode;
    if (parent instanceof Layer && parent.isLocked()) parent = this._scene as unknown as EdNode;
    let page = (
      parent === (this._scene as unknown as EdNode) ? this._scene.getActivePage() : null
    ) as (Page & EdNode) | null;
    if (page && page.isLocked()) return;
    const annotations = list.filter((element) => element.hasMixin(AnnotationMixin));
    if (annotations.length) {
      list = annotations;
      if (!page) return;
      parent = page = page.getAnnotations() as unknown as Page & EdNode;
    } else {
      if (page && (page.getProperty("plkt") as number) & (ProgramLck.NoNewChildren as number))
        return;
      if (
        parent instanceof Block &&
        (parent.getProperty("plkt") as number) & (ProgramLck.NoNewChildren as number)
      ) {
        return;
      }
    }
    let insertBefore = (next || null) as EdNode | null;
    let otherParent: EdNode | null = null;
    let otherNext: EdNode | null = null;
    let found = false;
    if (besideSelection && this.hasSelection()) {
      const ordered = Node.order(
        (this._selection as EdNode[]).slice() as unknown as Node[],
        true,
      ) as unknown as EdNode[];
      for (let i = 0; i < ordered.length && !found; ++i) {
        const selected = ordered[i] as EdNode;
        if ((page && selected.getParent() === page) || (!page && selected.getParent() === parent)) {
          insertBefore = selected.getNext();
          found = true;
        } else if (!otherParent) {
          otherParent = selected.getParent();
          otherNext = selected.getNext();
          for (let k = 0; k < list.length && otherParent; ++k) {
            if (!(
              !otherParent.isLocked() &&
              (list[k] as EdNode).validateInsertion(otherParent, otherNext)
            )) {
              otherParent = null;
              otherNext = null;
            }
          }
          if (otherParent && page) {
            if (otherParent instanceof Page) {
              if (otherParent !== page) otherParent = null;
            } else if (
              otherParent.findParent((ancestor) => ancestor instanceof Page && ancestor !== page)
            ) {
              otherParent = null;
            }
          }
        }
      }
    }
    if (!found && otherParent) {
      parent = otherParent;
      insertBefore = otherNext;
    }
    list = list.filter((element) => {
      if (element instanceof Text) {
        for (let i = 0; i < list.length; i++) {
          const other = list[i];
          if (other instanceof PathBase && other.hasReferencedText(element)) return false;
        }
      }
      return true;
    });
    if (!noTransaction) this.beginTransaction();
    let style: EdNode | null = null;
    if (
      !noInitialSetup &&
      this._selection &&
      1 === this._selection.length &&
      (this._selection[0] as EdNode).hasMixin(Element.Stylable)
    ) {
      style = this._selection[0] as EdNode;
    }
    let newMasters: EdNode[] | undefined;
    const scene = this._scene;
    if (relinkSymbols) {
      newMasters = [];
      const symbols = scene.getSymbols() as unknown as EdNode[];
      const masters = newMasters;
      list.forEach((element) => {
        element.accept((node: EdNode) => {
          if (node instanceof SymbolNode) {
            const symbol = node as unknown as SymbolNode & EdNode & { _master?: boolean };
            if (!(
              (symbol.getProperty("masterRef") !== symbol.getReferenceId() &&
                symbol.getProperty("masterRef") !== symbol.getOldReferenceId()) ||
              symbols.concat(masters).some((other) => {
                const otherSymbol = other as unknown as SymbolNode & EdNode;
                if (otherSymbol.getMultireferenceId() === symbol.getMultireferenceId()) {
                  const master = (
                    scene.getWorkspace() as unknown as EditorWorkspaceLike
                  ).getReference(otherSymbol.getProperty("masterRef") as string);
                  if (master && master.getScene() && master.getScene() === scene) return true;
                }
                return false;
              })
            )) {
              symbol._master = true;
              masters.push(symbol);
            }
            if (!symbol._master) {
              symbols.some((other) => {
                const otherSymbol = other as unknown as SymbolNode & EdNode;
                if (otherSymbol.getMultireferenceId() === symbol.getMultireferenceId()) {
                  if (symbol.getProperty("masterRef") !== otherSymbol.getProperty("masterRef")) {
                    symbol.setProperty("masterRef", otherSymbol.getProperty("masterRef"));
                  }
                  return true;
                }
                return undefined;
              });
            }
          }
          return undefined;
        });
      });
    }
    try {
      for (let i = 0; i < list.length; ++i) {
        const element = list[i] as EdNode;
        parent.insertChild(element, insertBefore);
        if (!noInitialSetup) {
          const editor = ElementEditor.createEditor(
            element as unknown as Node,
            this._uid,
          ) as unknown as EdEditor | null;
          if (editor) editor.initialSetup(style);
        }
      }
      if (newMasters) {
        newMasters.forEach((master) => {
          const oldRef = master.getProperty("masterRef");
          const newRef = (master as unknown as SymbolNode).getReferenceId();
          master.setProperty("masterRef", newRef);
          scene.acceptChildren((node: Node) => {
            if (node instanceof SymbolNode && node.getProperty("masterRef") === oldRef) {
              node.setProperty("masterRef", newRef);
            }
            return undefined;
          });
        });
        scene.acceptChildren((node: Node) => {
          if (
            node instanceof SymbolNode &&
            !node.isMaster() &&
            node.getMasterSymbol() &&
            !scene.isLinked(node as never, node.getMasterSymbol() as never)
          ) {
            scene.link(node.getMasterSymbol() as never, node as never);
          }
          return undefined;
        });
      }
      this.updateSelection(false, list);
    } finally {
      if (!noTransaction) this.commitTransaction(loc("action.insert-elements"));
    }
  }

  /** Replaces `element` with `replacements` in its place (keeping its selection). */
  exchangeElements(
    element: EdNode,
    replacements: readonly EdNode[],
    noTransaction?: unknown,
  ): void {
    if (!noTransaction) this.beginTransaction();
    try {
      const parent = element.getParent() as EdNode;
      const next = element.getNext(true);
      const selected = element.hasFlag(NodeFlag.Selected);
      for (let i = 0; i < replacements.length; ++i) {
        const replacement = replacements[i] as EdNode;
        if (replacement.getParent()) (replacement.getParent() as EdNode).removeChild(replacement);
        parent.insertChild(replacement, next);
        if (selected) replacement.setFlag(NodeFlag.Selected);
      }
      parent.removeChild(element);
    } finally {
      if (!noTransaction) this.commitTransaction(loc("action.change-elements"));
    }
  }

  /**
   * Converts the selected shapes and texts to paths (texts to their
   * shapes) in place and selects the results with the rest of the
   * selection.
   */
  convertSelectionToPaths(noTransaction?: unknown): void {
    let toConvert: EdNode[] | null = [];
    const result: EdNode[] = [];
    if (this._selection && this._selection.length) {
      for (let i = 0; i < this._selection.length; ++i) {
        const node = this._selection[i] as EdNode;
        if (
          (node instanceof PathBase && !(node instanceof Path)) ||
          !(
            !node.hasMixin(VertexSourceMixin) ||
            node instanceof CompoundPath ||
            node instanceof PathsGraph
          )
        ) {
          toConvert.push(node);
        } else result.push(node);
      }
    }
    if (toConvert.length) {
      if (!noTransaction) this.beginTransaction();
      this._beginSelectionUpdate();
      try {
        this.updateSelection(false, toConvert);
        for (let i = 0; i < toConvert.length; ++i) {
          let node: EdNode | null = toConvert[i] as EdNode;
          node.removeFlag(NodeFlag.Selected);
          const parent = node.getParent() as EdNode;
          const next = node.getNext(true);
          let path: EdNode | null = null;
          if (node instanceof PathBase) {
            parent.removeChild(node as unknown as EdNode);
            const anchorPoints = node.cloneAnchorPoints();
            if (
              (path = new Path(
                node.getProperty("closed") as never,
                node.getProperty("evenodd") as never,
                anchorPoints as never,
              ) as unknown as EdNode)
            ) {
              (path as unknown as Path).assignFrom(node as never);
              node = null;
              parent.insertChild(path, next);
              result.push(path);
            }
          } else if (node instanceof Text) {
            const shapes = node.getTextShapes() as unknown as EdNode[] | null;
            parent.removeChild(node as unknown as EdNode);
            if (shapes) {
              for (let k = shapes.length - 1; k >= 0; k--) {
                parent.insertChild(shapes[k] as EdNode, next);
                result.push(shapes[k] as EdNode);
              }
            }
          } else if (node.hasMixin(VertexSourceMixin)) {
            parent.removeChild(node);
            if (
              (path = PathUtil.createPathFromVertexSource(
                node as never,
              ) as unknown as EdNode | null)
            ) {
              const shape = node as EdNode & { $trf: unknown };
              const transform = shape.$trf;
              shape.$trf = null;
              (path as unknown as Path).assignFrom(node as never);
              if (node instanceof PathBase) {
                (path as unknown as Record<string, unknown>).$evenodd = node.getProperty("evenodd");
                (path as unknown as Record<string, unknown>).$closed = node.getProperty("closed");
              }
              shape.$trf = transform;
              node = null;
              parent.insertChild(path, next);
              result.push(path);
            }
          } else parent.removeChild(node);
        }
        toConvert = null;
        this.updateSelection(false, result);
      } finally {
        this._finishSelectionUpdate();
        if (!noTransaction) this.commitTransaction(loc("action.convert-to-paths"));
      }
    }
  }

  /**
   * Joins the selected paths and compound paths into one compound path
   * where the topmost of them was; returns it (or the single path).
   */
  joinPaths(): EdNode | null {
    let joined: EdNode | null = null;
    if (this._selection && this._selection.length) {
      const ordered = Node.order((this.getSelection() as Node[]).slice()) as unknown as EdNode[];
      const paths: EdNode[] = [];
      for (let i = 0; i < ordered.length; ++i) {
        const node = ordered[i] as EdNode;
        if (node instanceof Path || node instanceof CompoundPath) paths.push(node);
      }
      if (paths.length > 1) {
        const compound = new CompoundPath();
        joined = compound as unknown as EdNode;
        const last = paths[paths.length - 1] as EdNode;
        const parent = last.getParent() as EdNode;
        const next = last.getNext();
        for (let i = 0; i < paths.length; ++i) {
          const path = paths[i] as EdNode;
          if (path instanceof Path) {
            (path.getParent() as unknown as EdNode).removeChild(path as unknown as EdNode);
            (compound.getPaths() as unknown as EdNode).appendChild(
              path.clone() as unknown as EdNode,
            );
          } else {
            (path.getParent() as EdNode).removeChild(path);
            const subPaths = (path as unknown as CompoundPath).cloneSubPaths() as unknown as EdNode;
            let following: EdNode | null;
            for (let child = subPaths.getFirstChild(); null !== child; child = following) {
              following = child.getNext();
              subPaths.removeChild(child);
              (compound.getPaths() as unknown as EdNode).appendChild(child);
            }
          }
        }
        parent.insertChild(joined, next);
      } else if (1 == paths.length) joined = paths[0] as EdNode;
    }
    return joined;
  }

  /** Splits a compound path into its paths in its place; returns them. */
  splitCompoundPath(compound: unknown): EdNode[] | null {
    let paths: EdNode[] | null = null;
    if (compound instanceof CompoundPath) {
      paths = [];
      const node = compound as unknown as EdNode;
      const parent = node.getParent();
      const next = node.getNext();
      if (parent) parent.removeChild(node);
      const subPaths = compound.cloneSubPaths() as unknown as EdNode;
      let following: EdNode | null;
      for (let child = subPaths.getFirstChild(); null !== child; child = following) {
        following = child.getNext();
        subPaths.removeChild(child);
        if (parent) parent.insertChild(child, next);
        paths.push(child);
      }
    }
    return paths;
  }

  /**
   * Moves `nodes` (default: the selection) in their parent's paint order,
   * respecting validateBlockInsertion, as one transaction unless
   * `noTransaction`; then reselects the selection.
   */
  arrangeOrder(type: string, nodes?: readonly unknown[] | null, noTransaction?: unknown): void {
    let reselect: EdNode[] | null = null;
    let list = nodes as EdNode[] | null | undefined;
    if (!list) {
      if (!this._selection || 0 === this._selection.length) return;
      list = reselect = this._selection.slice();
    }
    list = (type === ArrangeOrderType.SendToFront || type === ArrangeOrderType.SendBackward
      ? Node.order(list as unknown as Node[])
      : Node.order(list as unknown as Node[], true)) as unknown as EdNode[];
    if (!noTransaction) this.beginTransaction();
    try {
      for (let i = 0; i < list.length; ++i) {
        const node = list[i] as EdNode;
        const parent = node.getParent() as EdNode;
        switch (type) {
          case ArrangeOrderType.SendToFront:
            if (null !== node.getNext() && Editor.validateBlockInsertion(parent, node)) {
              parent.removeChild(node);
              parent.appendChild(node);
            }
            break;
          case ArrangeOrderType.BringForward: {
            let next = node.getNext();
            if (null !== next) {
              let over: EdNode | null = null;
              while (!over && next) {
                if (next instanceof Element && !next.hasFlag(NodeFlag.Selected)) over = next;
                next = next.getNext();
              }
              if (null !== over) {
                const after = over.getNext();
                if (Editor.validateBlockInsertion(parent, node, after)) {
                  parent.removeChild(node);
                  parent.insertChild(node, after);
                }
              }
            }
            break;
          }
          case ArrangeOrderType.SendBackward: {
            let previous = node.getPrevious();
            if (null !== previous) {
              let under: EdNode | null = null;
              while (!under && previous) {
                if (
                  previous instanceof Element &&
                  !previous.hasFlag(NodeFlag.Selected) &&
                  Editor.validateBlockInsertion(parent, node, previous)
                ) {
                  under = previous;
                }
                previous = previous.getPrevious();
              }
              if (null !== under) {
                parent.removeChild(node);
                parent.insertChild(node, under);
              }
            }
            break;
          }
          case ArrangeOrderType.SendToBack:
            if (null !== node.getPrevious()) {
              let first: EdNode | null = null;
              for (let child = parent.getFirstChild(); !first && child;) {
                if (Editor.validateBlockInsertion(parent, node, child)) first = child;
                child = child.getNext();
              }
              if (first) {
                parent.removeChild(node);
                parent.insertChild(node, first);
              }
            }
        }
      }
    } finally {
      if (!noTransaction) this.commitTransaction(loc("action.arrange-order"));
    }
    if (reselect) this.updateSelection(false, reselect);
  }

  /**
   * Aligns `nodes` (default: the selection) to `area` (default: the union
   * of their boxes, or of the fully locked ones among them); `asGroup`
   * moves them as one box. A single element aligns to its parent's box
   * unless its editor aligns parts or `toArea` is set. Stops at the first
   * fully locked element or empty area.
   */
  arrangeAlign(
    type: string,
    nodes?: readonly unknown[] | null,
    asGroup?: unknown,
    area?: Rect | null,
    noTransaction?: unknown,
    toArea?: unknown,
  ): void {
    let list = nodes as EdNode[] | null | undefined;
    if (!list) {
      if (!this._selection || 0 === this._selection.length) return;
      list = this._selection.slice();
    }
    const source = list;
    const items: { bbox: Rect; element: EdNode }[] = [];
    let union: Rect | null = null;
    let lockedUnion: Rect | null = null;
    for (let i = 0; i < source.length; ++i) {
      const element = source[i] as EdNode;
      if (element.hasMixin(TransformMixin)) {
        const box = element.getGeometryBBox();
        if (!box || box.getWidth() + box.getHeight() === 0) continue;
        union = union ? union.united(box) : box;
        items.push({ bbox: box, element });
        if (element.hasFlag(ElementFlag.FullLocked))
          lockedUnion = lockedUnion ? lockedUnion.united(box) : box;
      }
    }
    if (!area) {
      for (let i = 0; i < items.length; ++i) {
        const box = (items[i] as { bbox: Rect }).bbox;
        area = area ? area.united(box) : box;
      }
    }
    if (!noTransaction) this.beginTransaction();
    const single = 1 === items.length;
    try {
      for (let i = 0; i < items.length; ++i) {
        const box = asGroup ? (union as Rect) : (items[i] as { bbox: Rect }).bbox;
        const element = (items[i] as { element: EdNode }).element;
        const editor = editorOf(element);
        const target =
          element.getParent() && single && editor && !editor.isAlignPartsAllowed() && !toArea
            ? (element.getParent() as EdNode).getGeometryBBox()
            : lockedUnion || area;
        if (
          !target ||
          target.getWidth() + target.getHeight() === 0 ||
          element.hasFlag(ElementFlag.FullLocked)
        ) {
          return;
        }
        let center: number;
        switch (type) {
          case ArrangeAlignType.AlignLeft:
            if (editor && editor.isAlignPartsAllowed()) {
              editor.alignParts(ArrangeAlignType.AlignLeft, target.getX(), null);
            } else if (target.getX() !== box.getX()) {
              element.transform(new Transform(1, 0, 0, 1, target.getX() - box.getX(), 0), true);
            }
            break;
          case ArrangeAlignType.AlignCenter:
            center = target.getX() + target.getWidth() / 2;
            if (editor && editor.isAlignPartsAllowed()) {
              editor.alignParts(ArrangeAlignType.AlignCenter, center, null);
            } else if (center !== box.getX() + box.getWidth() / 2) {
              element.transform(
                new Transform(1, 0, 0, 1, center - box.getX() - box.getWidth() / 2, 0),
                true,
              );
            }
            break;
          case ArrangeAlignType.AlignRight: {
            const right = target.getX() + target.getWidth();
            if (editor && editor.isAlignPartsAllowed()) {
              editor.alignParts(ArrangeAlignType.AlignRight, right, null);
            } else if (right !== box.getX() + box.getWidth()) {
              element.transform(
                new Transform(1, 0, 0, 1, right - box.getWidth() - box.getX(), 0),
                true,
              );
            }
            break;
          }
          case ArrangeAlignType.AlignTop:
            if (editor && editor.isAlignPartsAllowed()) {
              editor.alignParts(ArrangeAlignType.AlignTop, null, target.getY());
            } else if (target.getY() !== box.getY()) {
              element.transform(new Transform(1, 0, 0, 1, 0, target.getY() - box.getY()), true);
            }
            break;
          case ArrangeAlignType.AlignMiddle:
            center = target.getY() + target.getHeight() / 2;
            if (editor && editor.isAlignPartsAllowed()) {
              editor.alignParts(ArrangeAlignType.AlignMiddle, null, center);
            } else if (center !== box.getY() + box.getHeight() / 2) {
              element.transform(
                new Transform(1, 0, 0, 1, 0, center - box.getY() - box.getHeight() / 2),
                true,
              );
            }
            break;
          case ArrangeAlignType.AlignBottom: {
            const bottom = target.getY() + target.getHeight();
            if (editor && editor.isAlignPartsAllowed()) {
              editor.alignParts(ArrangeAlignType.AlignBottom, null, bottom);
            } else if (bottom !== box.getY() + box.getHeight()) {
              element.transform(
                new Transform(1, 0, 0, 1, 0, bottom - box.getHeight() - box.getY()),
                true,
              );
            }
            break;
          }
          case ArrangeAlignType.AlignJustifyHorizontal:
            if (!(target.getX() === box.getX() && box.getWidth() === target.getWidth())) {
              element.transform(
                new Transform(1, 0, 0, 1, 0, 0)
                  .translated(-box.getX(), -box.getY())
                  .scaled(target.getWidth() / box.getWidth(), 1)
                  .translated(box.getX(), box.getY())
                  .translated(target.getX() - box.getX(), 0),
              );
            }
            break;
          case ArrangeAlignType.AlignJustifyVertical:
            if (!(target.getY() === box.getY() && box.getHeight() === target.getHeight())) {
              element.transform(
                new Transform(1, 0, 0, 1, 0, 0)
                  .translated(-box.getX(), -box.getY())
                  .scaled(1, target.getHeight() / box.getHeight())
                  .translated(box.getX(), box.getY())
                  .translated(0, target.getY() - box.getY()),
              );
            }
        }
      }
    } finally {
      if (!noTransaction) this.commitTransaction(loc("action.arrange-alignment"));
    }
  }

  /**
   * Multi-page view: hit tests the page labels and pages at `position`
   * (view coordinates through `transform`). With `highlightOnly`, the
   * page label under the mouse is highlighted; otherwise the page hit
   * becomes active (a label hit selects it) and is remembered as the
   * activated page.
   */
  updateByMousePosition(
    position: Point,
    transform: Transform | null | undefined,
    highlightOnly: unknown,
    configuration: MultiPageConfiguration,
  ): void {
    const scene = this._scene;
    if (configuration.multiPageView) {
      let box = scene.getPaintBBox(configuration.multiPageView as never);
      if (box && !box.isEmpty()) {
        let scale = 1;
        if (transform) {
          box = transform.mapRect(box);
          scale = transform.getScaleFactor();
        }
        const pick = EditorOptions.pickDistance;
        const activePage = scene.getActivePage() as Page;
        const labelScale = activePage.isScaleLabel() ? scale : activePage.getScaleLabelFactor();
        const labelHeight = scene.getLabelBBox(labelScale as never).getHeight();
        if (activePage && !box.containsPoint(position)) {
          const width = box.getWidth();
          if (
            !new Rect(
              box.getX() - pick,
              box.getY() - pick - labelHeight,
              width + 2 * pick,
              labelHeight + 2 * pick,
            ).containsPoint(position)
          ) {
            if (highlightOnly) {
              scene.iteratePages((page: Page) => {
                if (page.hasFlag(NodeFlag.Highlighted)) page.removeFlag(NodeFlag.Highlighted);
              });
            } else this._activatedPage = null;
            return;
          }
        }
        let hit: { element: Page; data: { label?: unknown } } | null = null;
        let area: Rect;
        if (transform && transform.invertible()) {
          const scenePosition = (transform.inverted() as Transform).mapPoint(position);
          area = new Rect(
            scenePosition.getX() - pick,
            scenePosition.getY() - pick - labelHeight,
            2 * pick,
            2 * (labelHeight + pick),
          );
        } else area = new Rect(position.getX() - pick, position.getY() - pick, 2 * pick, 2 * pick);
        const candidates = scene.retrieveChildrenInPaintBBox(
          area,
          QuadTree.RETRIEVE_MODE_INTERSECT,
        ) as unknown as (Page & {
          _detailHitTest(...args: unknown[]): typeof hit;
        })[];
        const activeIndex = candidates.indexOf(activePage as never);
        if (activeIndex >= 0) candidates.splice(activeIndex, 1);
        candidates.sort((a, b) => b.getElementIndex() - a.getElementIndex());
        if (activeIndex >= 0) candidates.unshift(activePage as never);
        for (let i = 0; i < candidates.length && !hit; i++) {
          const candidate = candidates[i] as (typeof candidates)[number];
          hit = candidate._detailHitTest(
            position,
            transform,
            pick,
            false,
            null,
            !!configuration && configuration.multiPageView,
            !candidate.isScaleLabel(),
          );
        }
        if (hit && !highlightOnly) {
          if (scene.getActivePage() !== hit.element) scene.setActivePage(hit.element);
          if (hit.data.label) this.updateSelection(false, [hit.element]);
        }
        if (EditorOptions.pageSelectable) {
          const moveMaster = PageEditor.MOVE_MASTER;
          scene.iteratePages((page: Page) => {
            if (
              highlightOnly &&
              hit &&
              page === hit.element &&
              hit.data.label &&
              (moveMaster || !scene.hasLinks(page as never))
            ) {
              page.setFlag(NodeFlag.Highlighted);
            } else page.removeFlag(NodeFlag.Highlighted);
          });
        }
        if (!highlightOnly) this._activatedPage = hit && hit.element;
      }
    }
  }

  getActivatedPage(): unknown {
    return this._activatedPage;
  }

  clearHighlighted(): void {
    this._scene.acceptChildren(
      (node: Node) => {
        if (node.hasFlag(NodeFlag.Highlighted)) node.removeFlag(NodeFlag.Highlighted);
        return true;
      },
      false,
      true,
    );
  }

  /** Debug transaction tooling (dropped); null, as with debugTransactions off. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature (workspace, json)
  importStates(_workspace?: unknown, _json?: string): null {
    return null;
  }

  /** Debug transaction tooling (dropped); null, as with debugTransactions off. */
  exportStates(): null {
    return null;
  }

  /**
   * Starts a transaction: remembers the selection and starts recording.
   * An open outer transaction hands over what was recorded so far.
   */
  beginTransaction(): TransactionFrame {
    ElementEditor.getEditor(this._scene);
    const frame: TransactionFrame = { selection: this._saveSelection() };
    const workspace = this._scene.getWorkspace() as unknown as EditorWorkspaceLike | null;
    const recorder = workspace ? workspace.getTransactionRecorder() : null;
    if (recorder) {
      if (this._transactionStack.length) {
        const recorded = recorder.endTransaction();
        if (recorded && recorded.length) {
          (this._transactionStack[this._transactionStack.length - 1] as TransactionFrame).actions =
            recorded;
        }
      }
      recorder.beginTransaction(false);
    }
    this._transactionStack.push(frame);
    return frame;
  }

  /** Redoes a transaction: its actions in order, then its new selection. */
  _transactionRedo(data: TransactionData): void {
    if (data.newSelection && data.newSelection.length) {
      for (let i = 0; i < data.newSelection.length; ++i) {
        (data.newSelection[i] as SelectionEntry).element.recordedTransaction = true;
      }
    }
    for (let i = 0; i < data.actions.length; ++i) (data.actions[i] as TransactionAction).action();
    this._loadSelection(data.newSelection);
    if (data.newSelection && data.newSelection.length) {
      for (let i = 0; i < data.newSelection.length; ++i) {
        (data.newSelection[i] as SelectionEntry).element.recordedTransaction = false;
      }
    }
  }

  /** Undoes a transaction: its actions reverted backwards, then the old selection. */
  _transactionUndo(data: TransactionData): void {
    if (data.selection && data.selection.length) {
      for (let i = 0; i < data.selection.length; ++i) {
        (data.selection[i] as SelectionEntry).element.recordedTransaction = true;
      }
    }
    for (let i = data.actions.length - 1; i >= 0; --i)
      (data.actions[i] as TransactionAction).revert();
    this._loadSelection(data.selection);
    if (data.selection && data.selection.length) {
      for (let i = 0; i < data.selection.length; ++i) {
        (data.selection[i] as SelectionEntry).element.recordedTransaction = false;
      }
    }
  }

  /**
   * Ends the innermost transaction; when it recorded anything, pushes an
   * undo state named `name` (with `relatedData` for the modified event).
   */
  commitTransaction(name?: string | null, relatedData?: unknown): void {
    if (!this._transactionStack.length) {
      throw new Error("Nothing to commit, transaction stack is empty.");
    }
    let actions: TransactionAction[] | null = null;
    const workspace = this._scene.getWorkspace() as unknown as EditorWorkspaceLike | null;
    const recorder = workspace ? workspace.getTransactionRecorder() : null;
    if (recorder) actions = recorder.endTransaction();
    const frame = this._transactionStack.pop() as TransactionFrame;
    if (!actions) actions = frame.actions ? frame.actions.slice() : null;
    if (actions && actions.length > 0) {
      const data: TransactionData = {
        actions,
        selection: frame.selection ? frame.selection.slice() : null,
        newSelection: this._saveSelection(),
      };
      if (relatedData) data.relatedData = relatedData;
      this.pushState(
        name,
        this._transactionRedo.bind(this),
        this._transactionUndo.bind(this),
        data,
      );
    }
  }

  /** Adds an undo state (dropping the oldest beyond maxUndoSteps) and clears the redo stack. */
  pushState(
    name: string | null | undefined,
    action: (data: TransactionData) => void,
    revert: (data: TransactionData) => void,
    data: TransactionData,
  ): void {
    if (this._undoStates.length >= EditorOptions.maxUndoSteps) this._undoStates.shift();
    this._undoStates.push({
      id: uuid(),
      name: name || "",
      action,
      revert,
      data,
      createdAt: Date.now(),
    });
    this._redoStates = [];
    if (this.hasEventListeners(ModifiedEvent)) {
      if (data.relatedData)
        this.trigger(new ModifiedEvent(data.relatedData, ModifiedEventType.Raw));
      else this.trigger(MODIFIED_EVENT);
    }
  }

  hasUndoState(): boolean {
    return this._undoStates.length > 0;
  }

  getUndoStates(): UndoState[] {
    return this._undoStates;
  }

  getRedoStates(): UndoState[] {
    return this._redoStates;
  }

  hasRedoState(): boolean {
    return this._redoStates.length > 0;
  }

  getUndoStateName(): string | null {
    return this._undoStates.length > 0
      ? (this._undoStates[this._undoStates.length - 1] as UndoState).name
      : null;
  }

  getRedoStateName(): string | null {
    return this._redoStates.length > 0
      ? (this._redoStates[this._redoStates.length - 1] as UndoState).name
      : null;
  }

  undoState(): void {
    if (this._undoStates.length > 0) {
      const state = this._undoStates.pop() as UndoState;
      this._redoStates.push(state);
      this._scene.trigger(new RecordedTransactionStartedEvent(this._scene));
      state.revert(state.data);
      this._scene.trigger(new RecordedTransactionFinishedEvent(this._scene));
      if (this.hasEventListeners(ModifiedEvent)) {
        if (state.data.relatedData)
          this.trigger(new ModifiedEvent(state.data.relatedData, ModifiedEventType.Undo));
        else this.trigger(MODIFIED_EVENT);
      }
    }
  }

  redoState(): void {
    if (this._redoStates.length > 0) {
      const state = this._redoStates.pop() as UndoState;
      this._undoStates.push(state);
      this._scene.trigger(new RecordedTransactionStartedEvent(this._scene));
      state.action(state.data);
      this._scene.trigger(new RecordedTransactionFinishedEvent(this._scene));
      if (this.hasEventListeners(ModifiedEvent)) {
        if (state.data.relatedData)
          this.trigger(new ModifiedEvent(state.data.relatedData, ModifiedEventType.Redo));
        else this.trigger(MODIFIED_EVENT);
      }
    }
  }

  getCurrentStateId(): string | null {
    return this._undoStates && this._undoStates.length
      ? (this._undoStates[this._undoStates.length - 1] as UndoState).id
      : null;
  }

  /**
   * Marks the save point at the undo state `id` (when it is on the stack)
   * or at the current state; returns a save point that rolls back.
   */
  markSavePoint(id?: string | null): SavePoint {
    const previous = this._savePointId;
    if (void 0 !== id && "string" == typeof id) {
      for (let i = this._undoStates.length - 1; i >= 0; i--) {
        if ((this._undoStates[i] as UndoState).id === id) {
          this._savePointId = id;
          break;
        }
      }
    } else {
      this._savePointId =
        this._undoStates && this._undoStates.length
          ? (this._undoStates[this._undoStates.length - 1] as UndoState).id
          : null;
    }
    return new SavePoint(this, previous, this._savePointId);
  }

  /**
   * Whether there are changes since the save point. With `filter`, only
   * states since the save point touching an element the filter rejects
   * count.
   */
  isModified(filter?: (node: unknown) => boolean): boolean {
    if (this.hasUndoState()) {
      if ("function" == typeof filter) {
        for (let i = this._undoStates.length - 1; i >= 0; i--) {
          const state = this._undoStates[i] as UndoState;
          if (state.id === this._savePointId) return false;
          if (state.data) {
            if (
              state.data.newSelection &&
              state.data.newSelection.some((entry) => !filter(entry.element))
            ) {
              return true;
            }
            if (
              state.data.selection &&
              state.data.selection.some((entry) => !filter(entry.element))
            ) {
              return true;
            }
            if (
              !state.data.newSelection &&
              !state.data.selection &&
              state.data.actions &&
              state.data.actions.some((action) => {
                if (action.isPropertyChangeAction && !filter(action.node)) return true;
                return undefined;
              })
            ) {
              return true;
            }
          }
        }
        return false;
      }
      return (this._undoStates[this._undoStates.length - 1] as UndoState).id !== this._savePointId;
    }
    return null !== this._savePointId;
  }

  /**
   * Whether `node` had `count` (default 2) property changes. The old loop
   * leaves a state after its first hit, so it counts states with a change
   * rather than changes (see "isElementModified counts undo states" in
   * QUESTIONS.md).
   */
  isElementModified(node: unknown, count?: number): boolean {
    if (!count) count = 2;
    let hits = 0;
    if (this.hasUndoState()) {
      for (let i = this._undoStates.length - 1; i >= 0; --i) {
        const data = (this._undoStates[i] as UndoState).data;
        if (data) {
          const actions = data.actions;
          for (let k = actions.length - 1; k >= 0; --k) {
            const action = actions[k] as TransactionAction;
            if (action.isPropertyChangeAction && action.node === node) {
              if (++hits < count) break;
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  isInlineEditing(): boolean {
    return !!this._currentInlineEditorNode;
  }

  /**
   * Opens the inline editor of `node` (a collab text in image mode
   * switches to text mode first), unless a tool is temporarily active;
   * returns whether it opened.
   */
  openInlineEditor(node: EdNode, view?: unknown, position?: unknown): boolean {
    // The tool manager arrives with the tools cluster (level 9); until
    // then there is no temporary tool.
    const toolManager = (
      this._scene.getWorkspace() as unknown as EditorWorkspaceLike
    ).getToolManager();
    if (!(toolManager && toolManager.getTemporaryActiveTool())) {
      this.closeInlineEditor();
      let editor = editorOf(node);
      if (editor && node instanceof CollabText && !CollabText.isTextMode(node)) {
        node.removeFlag(NodeFlag.Selected);
        ElementEditor.closeElementEditor(node);
        CollabText.setModeText(node);
        editor = openEditorOf(node);
        node.setFlag(NodeFlag.Selected);
      }
      if (editor) {
        if (this.hasEventListeners(InlineEditorEvent)) {
          this.trigger(new InlineEditorEvent(editor, InlineEditorEventType.TryOpen));
        }
        if (editor.canInlineEdit()) {
          if (this.hasEventListeners(InlineEditorEvent)) {
            this.trigger(new InlineEditorEvent(editor, InlineEditorEventType.BeforeOpen));
          }
          editor.beginInlineEdit(view);
          editor.adjustInlineEditForView(view, position);
          this._currentInlineEditorNode = node;
          if (this.hasEventListeners(InlineEditorEvent)) {
            this.trigger(new InlineEditorEvent(editor, InlineEditorEventType.AfterOpen));
          }
          return true;
        }
      }
    }
    return false;
  }

  updateInlineEditorForView(view: unknown): void {
    if (this._currentInlineEditorNode) {
      const editor = editorOf(this._currentInlineEditorNode);
      if (editor && editor.isInlineEdit()) editor.adjustInlineEditForView(view);
    }
  }

  closeInlineEditor(): boolean {
    let closed = false;
    if (this._currentInlineEditorNode) {
      if ((closed = this._finishEditorInlineEdit(this._currentInlineEditorNode))) {
        this._currentInlineEditorNode = null;
      }
    }
    return closed;
  }

  getCurrentInlineEditorNode(): EdNode | null {
    return this._currentInlineEditorNode;
  }

  _afterNodeInsert(event: AfterInsertEvent): void {
    this._tryAddToSelection(asNode(event.node));
  }

  _beforeNodeRemove(event: BeforeRemoveEvent): void {
    if (event.node instanceof Element) {
      if (this._selection && this._selection.indexOf(asNode(event.node)) >= 0) {
        event.node.removeFlag(NodeFlag.Selected);
      } else this._closeEditor(asNode(event.node));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- an empty listener in the old code too
  _beforeFlagChange(_event: BeforeFlagChangeEvent): void {}

  _afterFlagChange(event: AfterFlagChangeEvent): void {
    if (event.node instanceof Element) {
      const node = asNode(event.node);
      if (event.flag === NodeFlag.Selected) {
        if (event.set) this._tryAddToSelection(node);
        else this._tryRemoveFromSelection(node);
      } else if (event.flag == NodeFlag.Highlighted) {
        let editor: EdEditor | null;
        if (event.set) {
          if ((editor = openEditorOf(node, false, true)))
            editor.setFlag(EditorFlag.Highlighted as number);
        } else {
          if ((editor = openEditorOf(node, false, true)))
            editor.removeFlag(EditorFlag.Highlighted as number);
          this._tryCloseEditor(node);
        }
      }
    }
  }

  _geometryChange(event: InstanceType<typeof Element.GeometryChangeEvent>): void {
    if (this._selection && this._selection.indexOf(asNode(event.element)) >= 0) {
      switch (event.type) {
        case Element.GeometryChangeEvent.Type.Before:
        case Element.GeometryChangeEvent.Type.After:
        case Element.GeometryChangeEvent.Type.Child: {
          const editor = editorOf(event.element);
          if (editor) editor.requestInvalidation();
        }
      }
    }
  }

  _beginSelectionUpdate(): void {
    this._selectionUpdateCounter += 1;
    const workspace = this._scene.getWorkspace() as unknown as EditorWorkspaceLike | null;
    const recorder = workspace ? workspace.getTransactionRecorder() : null;
    if (recorder) recorder.beginSelectionUpdate(this);
  }

  _finishSelectionUpdate(): void {
    if (0 == --this._selectionUpdateCounter) this._updatedSelection();
    const workspace = this._scene.getWorkspace() as unknown as EditorWorkspaceLike | null;
    const recorder = workspace ? workspace.getTransactionRecorder() : null;
    if (recorder) recorder.finishSelectionUpdate(this);
  }

  _updatedSelection(): void {
    if (0 === this._selectionUpdateCounter) {
      this._lastCloneSelection = null;
      if (this.hasEventListeners(SelectionChangedEvent)) this.trigger(SELECTION_CHANGED_EVENT);
      const styleEdManager = (
        this._scene.getWorkspace() as unknown as EditorWorkspaceLike
      ).getStyleEdManager();
      if (styleEdManager.isActivated()) styleEdManager.deactivateEditor();
      this.updateSelectionEditors();
    }
  }

  /**
   * Keeps the selection editor (GSelectionPositionEditor) in step: one
   * for several selected elements outside detail mode, none otherwise
   * (then the single editors lose their outline-only flag unless the
   * transform box is active).
   */
  updateSelectionEditors(): void {
    let individual = this.getIndividualSelection();
    if (individual) {
      individual = individual.filter((node) => {
        const lock = node.getProperty("plkt") as number;
        return !(
          lock & (ProgramLck.NoEdit as number) &&
          lock & (ProgramLck.NoSizeChanges as number) &&
          lock & (ProgramLck.NoMove as number)
        );
      });
    }
    if (individual && individual.length > 1 && !this._selectionDetail) {
      if (this._selEditor) this._selEditor.updateFromSelection();
      else {
        // Looked up when needed, as the old code required it lazily: the
        // selection position editor's module reads Editor when it loads.
        const SelectionPositionEditor = getRegisteredClass(
          "GSelectionPositionEditor",
        ) as new () => SelectionEditorLike;
        this._selEditor = new SelectionPositionEditor();
        this._selEditor.activate(this._scene, this);
        (editorOf(this._scene) as EdEditor).insertEditor(this._selEditor);
        this._selEditor.setFlag(EditorFlag.Selected as number);
      }
    } else if (
      this._selEditor ||
      (individual && 1 == individual.length && !this._selectionDetail)
    ) {
      const sceneEditor = editorOf(this._scene);
      if (this._selEditor) {
        this._selEditor.requestInvalidation();
        BaseEditor.closeEditor(this._selEditor as unknown as BaseEditor);
        this._selEditor = null;
      }
      if (
        individual &&
        individual.length >= 1 &&
        (!sceneEditor || !sceneEditor.isTransformBoxActive())
      ) {
        for (let i = 0; i < individual.length; ++i) {
          const editor = editorOf(individual[i]);
          if (editor && editor.hasFlag(EditorFlag.Outline as number))
            editor.removeFlag(EditorFlag.Outline as number);
        }
      }
    }
  }

  /** Adds a node whose Selected flag is set: opens its editor and sets its flags. */
  _tryAddToSelection(node: EdNode): void {
    if (node instanceof Element && node.hasFlag(NodeFlag.Selected)) {
      const editor = openEditorOf(node);
      if (editor) {
        editor.setFlag(EditorFlag.Selected as number);
        if (this._selectionDetail) editor.setFlag(EditorFlag.Detail as number);
        if (
          editor instanceof PathEditor &&
          CompoundPath.isOwnedPath(editor.getElement() as never)
        ) {
          editor.setCatchHandle(false);
        }
        if (
          (editor instanceof PathEditor &&
            !CompoundPath.isOwnedPath(editor.getElement() as never)) ||
          editor instanceof CompoundPathEditor ||
          isPathsGraphEditor(editor)
        ) {
          if (!this._pathResize) editor.removeFlag(BoxFlag.ResizeAll as number);
          if (isPathsGraphEditor(editor) && this._selectionEdit) editor.setEditMode(true);
        } else if (this._selectionEdit) {
          if (editor instanceof ImageEditor) editor.setEditMode(true);
          else editor.removeFlag(BoxFlag.ResizeAll as number);
        } else if (
          this._selectionDetail &&
          editor instanceof ImageEditor &&
          "subselect" == EditorOptions.selectDoubleClickBehavior
        ) {
          editor.setEditMode(true);
        }
        if (editor.validateSelectionChange()) {
          if (!this._selection) this._selection = [];
          this._selection.push(node);
          this._updatedSelection();
        }
      }
    }
  }

  /** Removes a node whose Selected flag was cleared, closing its editor when nothing else needs it. */
  _tryRemoveFromSelection(node: EdNode): void {
    if (node instanceof Element) {
      const editor = editorOf(node);
      if (editor && editor.hasFlag(EditorFlag.Selected as number)) {
        editor.removeFlag(EditorFlag.Selected as number);
        this._tryCloseEditor(node, true);
      }
      if (this._selection) {
        let index = -1;
        for (let i = 0; i < this._selection.length; ++i) {
          if (this._selection[i] === node) index = i;
        }
        if (index >= 0) {
          this._selection.splice(index, 1);
          if (0 == this._selection.length) this._selection = null;
          this._updatedSelection();
        }
      }
    }
  }

  /**
   * Closes a node's editor when it is neither selected nor highlighted
   * and (unless `force`) has no child editors, then tries its parent's.
   */
  _tryCloseEditor(node: EdNode, force?: boolean): void {
    const editor = editorOf(node);
    if (
      editor &&
      !editor.hasFlag(EditorFlag.Selected as number) &&
      !editor.hasFlag(EditorFlag.Highlighted as number) &&
      (force || null == editor.getEditors() || 0 == (editor.getEditors() as unknown[]).length)
    ) {
      const parent = editor.getParentEditor();
      this._closeEditor(node);
      if (parent) this._tryCloseEditor(parent.getElement());
    }
  }

  /** Ends a node's inline editing as one transaction; returns whether it was editing. */
  _finishEditorInlineEdit(node: EdNode): boolean {
    const editor = editorOf(node);
    if (editor && editor.isInlineEdit()) {
      if (this.hasEventListeners(InlineEditorEvent)) {
        this.trigger(new InlineEditorEvent(editor, InlineEditorEventType.BeforeClose));
      }
      let name: string | null = null;
      this.beginTransaction();
      try {
        name = editor.finishInlineEdit();
      } finally {
        this.commitTransaction(name || loc("action.inline-editing"));
      }
      if (node === this._currentInlineEditorNode) this._currentInlineEditorNode = null;
      if (this.hasEventListeners(InlineEditorEvent)) {
        this.trigger(new InlineEditorEvent(editor, InlineEditorEventType.AfterClose));
      }
      return true;
    }
    return false;
  }

  _closeEditor(node: EdNode): void {
    this._finishEditorInlineEdit(node);
    ElementEditor.closeElementEditor(node as unknown as Node);
  }

  /** The selection with each editor's part selection and state, for undo. */
  _saveSelection(): SelectionEntry[] | null {
    if (!this._selection || 0 === this._selection.length) return null;
    const saved: SelectionEntry[] = [];
    for (let i = 0; i < this._selection.length; ++i) {
      const element = this._selection[i] as EdNode;
      const editor = editorOf(element);
      const parts = editor && editor.getPartSelection();
      const data = editor && editor.getEditorStateData();
      if (data) saved.push({ element, parts: parts ? parts.slice() : null, data });
      else saved.push({ element, parts: parts ? parts.slice() : null });
    }
    return saved;
  }

  _loadSelection(saved: SelectionEntry[] | null | undefined): void {
    if (saved && 0 !== saved.length) {
      const elements: EdNode[] = [];
      for (let i = 0; i < saved.length; ++i) elements.push((saved[i] as SelectionEntry).element);
      this.updateSelection(false, elements);
      for (let i = 0; i < saved.length; ++i) {
        const entry = saved[i] as SelectionEntry;
        if (entry.parts || entry.data) {
          const editor = editorOf(entry.element);
          if (editor) {
            if (entry.data) editor.restoreEditorStateData(entry.data);
            if (entry.parts) editor.updatePartSelection(false, entry.parts);
          }
        }
      }
    } else this.clearSelection();
  }

  /**
   * The unlocked elements of the active page with a fill equal to
   * `pattern`; selects them unless `noSelect`. False when there are none.
   */
  selectFromPattern(pattern: unknown, noSelect?: unknown): EdNode[] | false {
    const found: EdNode[] = [];
    const page = this._scene && this._scene.getActivePage();
    if (page) {
      page.acceptChildren(
        (child: Node) => {
          const node = child as unknown as EdNode;
          if (node.hasMixin(Stylable) && !node.hasFlag(ElementFlag.FullLocked)) {
            const layers = (
              node as unknown as { getPaintLayers(): EdNode | null }
            ).getPaintLayers();
            if (layers) {
              for (let layer = layers.getFirstChild(); null !== layer; layer = layer.getNext()) {
                if (
                  layer instanceof Stylable.FillPaintLayer &&
                  layer.getProperty("_pt") &&
                  equals(pattern, layer.getProperty("_pt"))
                ) {
                  found.push(node);
                  break;
                }
              }
            }
          }
          return undefined;
        },
        false,
        true,
      );
    }
    return found.length > 0 && (noSelect || this.updateSelection(false, found), found);
  }

  /** Blinks the selection's highlight for `duration` ms, `count` times. */
  blinkSelection(duration: number, count: number): void {
    if (this._selection && this._selection.length) {
      const selection = this._selection.slice();
      const off = (): void => this.clearHighlighted();
      const on = (): void => {
        for (let i = 0; i < selection.length; ++i)
          (selection[i] as EdNode).setFlag(NodeFlag.Highlighted);
      };
      const interval = duration / count;
      on();
      const onTimer = setInterval(on, interval);
      let offTimer: ReturnType<typeof setInterval> | 0 = 0;
      setTimeout(() => {
        off();
        offTimer = setInterval(off, interval);
      }, interval / 2);
      setTimeout(
        () => {
          clearInterval(onTimer);
          clearInterval(offTimer);
          off();
        },
        duration - interval / 3,
      );
    }
  }

  getEdTransformSettings(): { fullContentTransform: boolean } | null {
    return this._edTrfSettings;
  }

  setFullContentTransform(full: unknown): void {
    if (this._edTrfSettings) this._edTrfSettings.fullContentTransform = !!full;
    else this._edTrfSettings = { fullContentTransform: !!full };
  }

  clearEdTransformSettings(): void {
    this._edTrfSettings = null;
  }

  override toString(): string {
    return "[Object GEditor]";
  }
}

Object.assign(Editor.prototype, {
  _selection: null,
  _lastCloneSelection: null,
  _storedSelection: null,
  _selectionUpdateCounter: 0,
  _selectionDetail: false,
  _selectionEdit: false,
  _pathResize: true,
  _savePointId: null,
  _keysOff: null,
  _currentInlineEditorNode: null,
  _selEditor: null,
  _activatedPage: null,
  _edTrfSettings: null,
  _uid: null,
});
