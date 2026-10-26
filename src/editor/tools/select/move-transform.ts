// Old: chunk.vendor.js module 334 (GSelectTool._updateSelectionTransform,
// _cleanupTargetHighlights, _gatherItemsForAdd).
/**
 * The drag preview. Each pointer move (or modifier change) recomputes it
 * from the press point:
 *
 * - an isolated part (resize or rotation handle, gradient stop ...) is
 *   moved by its editor (movePart), with Shift or the preserve-ratio
 *   option keeping the aspect ratio at corners;
 * - path points and segments (also of a paths graph) move by the snapped
 *   point or the snapped segment box;
 * - anything else moves the selection (moveSelection snaps it), Shift
 *   constraining the direction.
 *
 * While the whole selection moves, the drop targets are collected: an
 * image over a shape or image grid (masks, with Meta for shapes), or
 * elements over another page in the multi-page view. Targets get the
 * Highlighted flag.
 */
import { Platform } from "../../../engine/core/platform.ts";
import { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { PolyIntersector, type PolyLine } from "../../../engine/geometry/boolean/poly-segments.ts";
import { QuadTree } from "../../../engine/geometry/quadtree.ts";
import { VertexSourceMixin } from "../../../engine/geometry/vertex-source.ts";
import { Vertex } from "../../../engine/geometry/vertex.ts";
import type { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Image } from "../../../engine/scene/image.ts";
import { ImageGrid } from "../../../engine/scene/image-grid.ts";
import { Container } from "../../../engine/scene/node-container.ts";
import { NodeFlag } from "../../../engine/scene/node-change.ts";
import { Reference } from "../../../engine/scene/node-identity.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { SceneNode } from "../../../engine/scene/scene-node.ts";
import { Symbol as SymbolNode } from "../../../engine/scene/symbol.ts";
import { Text } from "../../../engine/text/text.ts";
import { Editor } from "../../editor.ts";
import { EditorOptions } from "../../editor-options.ts";
import type { PartInfo } from "../../element-editors/base-editor.ts";
import { BoxEditor } from "../../element-editors/box-editor.ts";
import { BlockEditor } from "../../element-editors/block-editor.ts";
import { ElementEditor } from "../../element-editors/element-editor.ts";
import { PathEditor, type PathPartId } from "../../element-editors/path-editor.ts";
import { DetailMapMode } from "../../guides/guide.ts";
import type { SelectTool } from "../select-tool.ts";
import { updateMoveHint } from "./hints.ts";
import { isPathsGraphPart } from "./paths-graph.ts";
import { partData, type AddCandidate } from "./select-types.ts";

const modifiers = Platform.modifiers;

/** A part editor that moves path points (path editor or paths graph editor). */
interface PointPartEditor {
  getElement(): Element & { isLine(): boolean };
  getPointCoord(point: unknown): Point;
  constrainPosition(position: Point, worldToView: Transform, point: unknown): Point;
}

const RATIO_CORNERS = [
  Rect.Side.TOP_LEFT,
  Rect.Side.TOP_RIGHT,
  Rect.Side.BOTTOM_LEFT,
  Rect.Side.BOTTOM_RIGHT,
];

/** A path or paths graph point (or anchor) part. */
const isPointPart = (info: PartInfo): boolean =>
  (info.editor instanceof PathEditor &&
    (info.id as PathPartId).type == PathEditor.PartType.Point) ||
  isPathsGraphPart(info, "Point", "Anchor");

/** A path or paths graph segment part. */
const isSegmentPart = (info: PartInfo): boolean =>
  (info.editor instanceof PathEditor &&
    (info.id as PathPartId).type == PathEditor.PartType.Segment) ||
  isPathsGraphPart(info, "Segment");

/** A part whose drag moves path points: points, anchors and segments. */
const isPointsDrag = (info: PartInfo): boolean =>
  (info.editor instanceof PathEditor &&
    !!info.id &&
    ((info.id as PathPartId).type == PathEditor.PartType.Point ||
      (info.id as PathPartId).type == PathEditor.PartType.Segment)) ||
  (!!info.id && isPathsGraphPart(info, "Point", "Anchor", "Segment"));

/** The selection without `element` (a copy). */
function selectionWithout(tool: SelectTool, element: unknown): Node[] {
  const selection = ([] as Node[]).concat(tool._editor.getSelection() as Node[]);
  let i = 0;
  for (; i < selection.length && element != selection[i]; ++i);
  if (i < selection.length && element == selection[i]) selection.splice(i, 1);
  return selection;
}

export function updateSelectionTransform(tool: SelectTool): void {
  const Mode = (tool.constructor as typeof SelectTool)._Mode;
  if (tool._mode == Mode.Moving) {
    let current = tool._moveCurrent;
    if (!current) return;
    let sceneCurrent: Point | null = null;
    const info = tool._editorMovePartInfo;
    if (info && info.isolated) moveIsolatedPart(tool, info, current);
    else {
      if (modifiers.shiftKey) {
        const start = tool._moveStart as Point;
        current =
          info && isPointPart(info)
            ? // A path or paths graph editor (isPointPart); PartInfo types its editor as BaseEditor.
              (info.editor as unknown as PointPartEditor).constrainPosition(
                current,
                tool._view.getWorldTransform(tool._view.getScene().getActivePage()),
                (info.id as PathPartId).point,
              )
            : Editor.convertToConstrain(
                start.getX(),
                start.getY(),
                current.getX(),
                current.getY(),
                EditorOptions.cursorConstraint,
              );
        tool._shiftConstraining = true;
      }
      sceneCurrent = tool._view.getViewTransform(tool._view.getScene()).mapPoint(current);
      current = tool._view
        .getViewTransform(tool._view.getScene().getActivePage())
        .mapPoint(current);
      let delta: Point | null = null;
      let hintPoint: Point | null = null;
      if (info && isPointsDrag(info)) {
        // A path or paths graph editor (isPointsDrag); PartInfo types its editor as BaseEditor.
        const partEditor = info.editor as unknown as PointPartEditor;
        const id = info.id as PathPartId;
        if (
          !tool._shiftConstraining &&
          !tool._view.getViewConfiguration().isElementAnnotationsVisible()
        ) {
          let others: Node[] | null = tool._editor.getSelection() as Node[] | null;
          if (others) {
            let element: unknown = partEditor.getElement();
            const data = partData(info);
            if (data && data.ownerEditor) element = data.ownerEditor.getElement();
            others = selectionWithout(tool, element);
          }
          const guides = tool._editor.getGuides();
          // The editor works on its structural node type (EdNode), the guides on Node.
          guides.useExclusions(tool._editor.getAlignExclusions(false, others as never) as never);
          guides.beginMap(tool._editor.getMappingScopes() as never);
          if (isSegmentPart(info)) {
            const left = partEditor.getPointCoord(id.apLeft);
            const right = partEditor.getPointCoord(id.apRight);
            const segmentBox = Rect.fromPoints(left, right);
            if (segmentBox) {
              delta = current.subtract(tool._moveStartTransformed as Point);
              let moved = segmentBox.translated(delta.getX(), delta.getY());
              moved = guides.mapRect(moved);
              const topLeft = segmentBox.getSide(Rect.Side.TOP_LEFT);
              delta = moved.getSide(Rect.Side.TOP_LEFT).subtract(topLeft);
            }
          } else {
            current = guides.mapPoint(
              current,
              tool._editor.hasSelectionDetail() ||
                (info.editor instanceof PathEditor &&
                  info.editor.getElement().isLine() &&
                  EditorOptions.simpleLineMode)
                ? DetailMapMode.DetailOnFilterOn
                : DetailMapMode.DetailOffFilterOn,
            );
          }
          guides.finishMap();
        }
        delta = null !== delta ? delta : current.subtract(tool._moveStartTransformed as Point);
        if (isPointPart(info)) {
          const point = partEditor.getPointCoord(id.point);
          delta = current.subtract(point);
        }
        tool._editor.moveSelection(
          delta,
          false,
          tool._editorMovePartInfo ? tool._editorMovePartInfo.id : null,
          tool._editorMovePartInfo ? tool._editorMovePartInfo.data : null,
          null,
          null,
          tool._view.getViewConfiguration().multiPageView,
          modifiers.metaKey,
        );
        hintPoint = current;
      } else {
        delta = tool._editor.moveSelection(
          current.subtract(tool._moveStartTransformed as Point),
          true,
          tool._editorMovePartInfo ? tool._editorMovePartInfo.id : null,
          tool._editorMovePartInfo ? tool._editorMovePartInfo.data : null,
          tool._moveStartTransformed,
          modifiers.optionKey,
          tool._view.getViewConfiguration().multiPageView,
          modifiers.metaKey,
        ) as Point | null;
      }
      updateMoveHint(tool, hintPoint, delta);
    }
    const moved = tool._editorMovePartInfo;
    const selection = tool._editor.getSelection();
    if (
      (!moved || (moved && moved.id === BlockEditor.LabelHolder.LABEL_PART_ID)) &&
      selection &&
      selection.length
    ) {
      collectDropTargets(tool, sceneCurrent);
    }
  } else if (tool._mode == Mode.Transforming) {
    const sceneEditor = tool._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive() && tool._moveStart) {
      const viewTransform = tool._view.getViewTransform(tool._view.getScene().getActivePage());
      const current = viewTransform.mapPoint(tool._moveCurrent as Point);
      const applied = sceneEditor.transformTBox(
        tool._moveStartTransformed as Point,
        current,
        viewTransform,
        modifiers.optionKey,
        modifiers.shiftKey,
        void 0,
        tool._view.getViewConfiguration().multiPageView,
      );
      tool.invalidateArea(null);
      tool._updateResizeHint(applied);
    }
  }
}

/** Drags an isolated part (handle) through its editor's movePart. */
function moveIsolatedPart(tool: SelectTool, info: PartInfo, current: Point): void {
  let others: Node[] | null = tool._editor.getSelection() as Node[] | null;
  if (
    info.id === BoxEditor.RESIZE_HANDLE_PART_ID &&
    others &&
    info.editor instanceof ElementEditor
  ) {
    // The old code meant to drop the resized element from the list but
    // kept the removed entry instead (splice's return value), see
    // "Resize snapping excludes only the resized element" in QUESTIONS.md.
    others = ([] as Node[]).concat(tool._editor.getSelection() as Node[]);
    const element = info.editor.getElement();
    let i = 0;
    for (; i < others.length && element != others[i]; ++i);
    if (i < others.length && element == others[i]) others = others.splice(i, 1);
  }
  let keepRatio = modifiers.shiftKey;
  const selection = tool._editor.getSelection() as Node[];
  if (
    !keepRatio &&
    EditorOptions.preserveAspectRatio &&
    (selection.length > 1 ||
      !(selection[0] instanceof Text) ||
      EditorOptions.allowTextRatioPreservation)
  ) {
    const data = partData(info);
    keepRatio = !!info.data && -1 !== RATIO_CORNERS.indexOf((data as { side: never }).side);
  }
  const guides = tool._editor.getGuides();
  // The editor works on its structural node type (EdNode), the guides on Node.
  guides.useExclusions(tool._editor.getAlignExclusions(false, others as never) as never);
  guides.beginMap(tool._editor.getMappingScopes() as never);
  const applied = (info.editor as BoxEditor).movePart(
    info.id,
    info.data,
    current,
    tool._view.getViewTransform(tool._view.getScene().getActivePage()),
    guides,
    keepRatio,
    modifiers.optionKey,
    tool._view.getViewConfiguration().multiPageView,
  );
  guides.finishMap();
  if (tool._editor.hasEventListeners(Editor.EdGeometryChangeEvent)) {
    tool._editor.trigger(new Editor.EdGeometryChangeEvent());
  }
  tool._updateResizeHint(applied);
}

/** Finds the page or image-mask targets for the moved selection. */
function collectDropTargets(tool: SelectTool, sceneCurrent: Point | null): void {
  if (tool._view.getViewConfiguration().multiPageView && sceneCurrent) {
    const probe = new Rect(sceneCurrent.getX(), sceneCurrent.getY(), 0, 0);
    let pages = (
      (tool._scene.retrieveChildrenInPaintBBox(probe, QuadTree.RETRIEVE_MODE_INTERSECT) ||
        []) as Page[]
    ).filter((page) => {
      const position = page.getPosition(true);
      return (page.getGeometryBBox() as Rect)
        .translated(position.getX(), position.getY())
        .containsPoint(sceneCurrent);
    });
    if (pages.indexOf(tool._scene.getActivePage() as Page) < 0) {
      pages.sort((a, b) => b.getElementIndex() - a.getElementIndex());
      if (pages.length) pages = [pages[0] as Page];
      tool._itemsToAddToPage = tool._gatherItemsForAdd(
        () => true,
        (element) => element instanceof Page,
        (visit) => {
          for (let i = 0; i < pages.length; i++) visit(pages[i] as Element);
        },
        sceneCurrent,
        Page,
      );
      const notPages = tool._itemsToAddToPage.filter((item) => !(item.source instanceof Page));
      if (notPages.length) tool._itemsToAddToPage = notPages;
    } else {
      // Back over the own page there is no page target. The old code kept
      // the last one, so the drop still went to the page the pointer had
      // left and that page stayed highlighted (BUG-057 A page drop target
      // is never shown highlighted).
      tool._itemsToAddToPage = [];
    }
  }
  tool._itemsToAddToImageMask = [];
  if (!(tool._itemsToAddToPage && tool._itemsToAddToPage.length)) {
    tool._itemsToAddToImageMask = tool._gatherItemsForAdd(
      (element) => element instanceof Image,
      (element) => {
        if (!(element instanceof Image)) {
          if (element instanceof ImageGrid) return true;
          if (element.hasMixin(Container)) {
            return (
              modifiers.metaKey &&
              (element instanceof PathBase || element.hasMixin(VertexSourceMixin))
            );
          }
        }
        return false;
      },
      null,
      sceneCurrent,
    );
  }
  tool._cleanupTargetHighlights(tool._itemsToAddToPage, tool._scene.iteratePages.bind(tool._scene));
  // The image mask cleanup walks the whole scene, so the page targets
  // count as targets there too. The old code passed only the image mask
  // targets and cleared the page's highlight at once (BUG-057 A page drop
  // target is never shown highlighted).
  tool._cleanupTargetHighlights((tool._itemsToAddToPage || []).concat(tool._itemsToAddToImageMask));
}

export type ElementWalker = (visit: (element: Element) => unknown) => void;

/** Removes Highlighted from every element that is no longer a target. */
export function cleanupTargetHighlights(
  tool: SelectTool,
  candidates: AddCandidate[] | null,
  walk?: ElementWalker,
): void {
  if (!candidates) return;
  const targets = candidates.map((candidate) => candidate.target);
  // acceptChildren visits every node; only elements carry the Highlighted flag checked here.
  const visitAll: ElementWalker =
    walk || (tool._scene.acceptChildren.bind(tool._scene) as unknown as ElementWalker);
  visitAll((element) => {
    if (element.hasFlag(NodeFlag.Highlighted) && targets.indexOf(element) < 0) {
      element.removeFlag(NodeFlag.Highlighted);
    }
  });
}

/**
 * The drop targets of the selection: for each selected element (when all
 * pass `sourceFilter`), the first element (`targetFilter`, visited by
 * `walk` or the whole scene) whose box contains the dragged box, or
 * which contains `point` (or is of `sameClass` like the source) and
 * whose box and, for vertex sources, outline intersect the dragged box.
 * The target gets Highlighted. Symbol instances of a dragged master go
 * along to the same target.
 */
export function gatherItemsForAdd(
  tool: SelectTool,
  sourceFilter: (element: Element) => boolean,
  targetFilter: (element: Element) => boolean,
  walk: ElementWalker | null,
  point: Point | null,
  sameClass?: abstract new (...args: never[]) => unknown,
): AddCandidate[] {
  const result: AddCandidate[] = [];
  const selection = tool._editor.getSelection() as Element[] | null;
  if (!selection) return result;
  if (!selection.every(sourceFilter)) return result;
  let index = 0;
  // The scene's elements that reference `source` (symbol instances),
  // outside the selected element itself.
  const referencesOf = (source: Element): Element[] | undefined => {
    const found: Element[] = [];
    const isSymbol = source instanceof SymbolNode;
    if (source instanceof SceneNode) {
      tool._scene.visitReferences(source, (reference) => {
        if (
          reference instanceof Element &&
          reference.getScene() &&
          !(isSymbol && reference instanceof SymbolNode)
        ) {
          let parent = reference.getParent();
          while (parent && parent !== (selection[index] as unknown)) parent = parent.getParent();
          if (!parent) found.push(reference);
        }
      });
      return found;
    }
    return undefined;
  };
  // `rect` moved by the position of the page holding `element`.
  const withPageOffset = (element: Node, rect: Rect): Rect => {
    let page: Node | null = element;
    while (page && !(page instanceof Page)) page = page.getParent();
    if (page) {
      const position = (page as Page).getPosition(tool._view.getViewConfiguration().multiPageView);
      return new Transform(1, 0, 0, 1, position.getX(), position.getY()).mapRect(rect);
    }
    return rect;
  };
  // acceptChildren visits every node; the target filters only pass elements.
  const visitAll: ElementWalker =
    walk || (tool._scene.acceptChildren.bind(tool._scene) as unknown as ElementWalker);
  for (; index < selection.length; index++) {
    const source = selection[index] as Element;
    if (!(
      source.getPaintBBox() &&
      (EditorOptions.pageCollisionTransform || !(source instanceof Page)) &&
      ((source instanceof SymbolNode && source.isMaster()) ||
        !source.hasMixin(Reference) ||
        !tool._scene.hasLinks(source))
    )) {
      continue;
    }
    const editor = ElementEditor.getEditor<ElementEditor>(source) as ElementEditor;
    const identity = new Transform();
    const box = editor.getBBox(identity) as Rect;
    const sourceBox = withPageOffset(source, box);
    const outline = new VertexContainer();
    outline.addVertex(Vertex.Command.Move, box.getX(), box.getY());
    outline.addVertex(Vertex.Command.Line, box.getX() + box.getWidth(), box.getY());
    outline.addVertex(
      Vertex.Command.Line,
      box.getX() + box.getWidth(),
      box.getY() + box.getHeight(),
    );
    outline.addVertex(Vertex.Command.Line, box.getX(), box.getY() + box.getHeight());
    outline.addVertex(Vertex.Command.Close, 0, 0);
    const intersector = new PolyIntersector();
    // The flattened outline of the first intersection test, reused by the next ones.
    let outlinePoly: PolyLine | null = null;
    visitAll((target) => {
      if (source !== target && targetFilter(target)) {
        let parent: Node | null = source;
        do {
          parent = parent.getParent();
        } while (parent && parent !== target);
        if (null === parent) {
          const targetBox = withPageOffset(target, target.getGeometryBBox() as Rect);
          if (targetBox) {
            const add = (): false => {
              target.setFlag(NodeFlag.Highlighted);
              result.push({ target, source, sourceBox });
              (referencesOf(source) as Element[]).forEach((reference) => {
                result.push({ target, source: reference, sourceBox });
              });
              return false;
            };
            if (targetBox.containsRect(sourceBox, true)) return add();
            if (
              ((point && targetBox.containsPoint(point)) ||
                (sameClass &&
                  target !== source &&
                  target instanceof sameClass &&
                  source instanceof sameClass)) &&
              targetBox.intersectsRect(sourceBox, true)
            ) {
              if (
                !target.hasMixin(VertexSourceMixin) ||
                // The target has the vertex source mixin (checked above), which
                // doesn't narrow the type; the cached polyline starts out null.
                intersector.intersect(outline, target as never, false, true, outlinePoly as never)
              ) {
                return add();
              }
              outlinePoly = intersector._polyLine0;
            }
          }
        }
      }
      return undefined;
    });
  }
  return result;
}
