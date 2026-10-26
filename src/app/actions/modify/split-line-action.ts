// Old: designer.browser.dev.js module 1319 (GSplitLineAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { Path } from "../../../engine/scene/path.ts";
import { AnchorPoint } from "../../../engine/scene/path-base.ts";
import { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { PathEditor, type PathPartId } from "../../../editor/element-editors/path-editor.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

const SELECTED = (): number => Node.Flag.Selected as number;

function layersOf(path: Path): PaintLayers {
  return path.getPaintLayers() as PaintLayers;
}

/**
 * Modify > Path > Split Line: cuts each path at its selected anchor points
 * (selected with the Subselect tool) into several paths. A piece that is a
 * single line gets a border if it has none.
 */
export class SplitLineAction extends ElementAction {
  static ID = "modify.split-line";
  static TITLE = new LocaleKey("GSplitLineAction", "title");

  override getId(): string {
    return SplitLineAction.ID;
  }

  override getTitle(): LocaleKey {
    return SplitLineAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/path";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-break-curve" : null;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument ? designerDocument.getEditor().getSelection() : null;
    let enabled = false;
    if (selection) {
      for (let i = 0; !enabled && i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Path) enabled = this._isPathSplittable(node);
      }
    }
    return enabled;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? editor.getSelection() : null;
    const paths: Path[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Path && this._isPathSplittable(node)) paths.push(node);
      }
    }
    if (!paths.length) return;
    const ed = editor as NonNullable<typeof editor>;
    ed.beginTransaction();
    try {
      const pieces: Path[] = [];
      const parents = new Set<ContainerNode>();
      for (let i = 0; i < paths.length; ++i)
        parents.add((paths[i] as Path).getParent() as ContainerNode);
      const blocked = [...parents] as unknown as Updatable[];
      try {
        blockChanges(ed, blocked, null, null);
        for (let i = 0; i < paths.length; ++i) {
          const path = paths[i] as Path;
          const parent = path.getParent() as ContainerNode;
          const next = path.getNext();
          const points = path.getAnchorPoints();
          let point: AnchorPoint | null;
          // An open path whose first point is not selected starts a piece there.
          let startAtFirst = false;
          if (path.getProperty("closed")) {
            for (
              point = points.getFirstChild() as AnchorPoint | null;
              null !== point && !point.hasFlag(SELECTED());
              point = point.getNext() as AnchorPoint | null
            );
          } else {
            point = points.getFirstChild() as AnchorPoint | null;
            if (!(point as AnchorPoint).hasFlag(SELECTED())) startAtFirst = true;
          }
          let current = point;
          const first = current;
          let following: AnchorPoint | null = current
            ? ((current.getNext() || current.getPrevious()) as AnchorPoint | null)
            : null;
          // A closed path's first piece starts with a copy of its cut point.
          let copyStart = false;
          if (path.getProperty("closed")) copyStart = true;
          while (
            null !== current &&
            (current.hasFlag(SELECTED()) || startAtFirst) &&
            null !== following
          ) {
            let copy: AnchorPoint;
            const piece = new Path();
            const piecePoints = piece.getAnchorPoints();
            startAtFirst = false;
            piece.assignFrom(path);
            parent.insertChild(piece, next);
            pieces.push(piece);
            point = points.getNextPoint(current);
            if (copyStart) {
              copy = new AnchorPoint();
              copy.deserialize(current.serialize());
              current = copy;
              copyStart = false;
            } else points.removeChild(current);
            piecePoints.appendChild(current);
            while (null !== point && !point.hasFlag(SELECTED()) && points.getFirstChild()) {
              following = points.getNextPoint(point);
              points.removeChild(point);
              piecePoints.appendChild(point);
              point = following;
            }
            if (null !== point && point.hasFlag(SELECTED()) && points.getFirstChild()) {
              // The cut point ends this piece and starts the next one.
              copy = new AnchorPoint();
              copy.deserialize(point.serialize());
              piecePoints.appendChild(copy);
              following = (current = point) === first ? null : points.getNextPoint(point);
            } else following = null;
            // A line piece without a border gets a black one. Old: only when
            // the source had fills; otherwise it appended the source's
            // missing first fill and threw (BUG-137).
            if (piece.isLine() && !layersOf(piece).getBorderLayers(true).length) {
              layersOf(piece).appendChild(new BorderPaintLayer(RGBColor.BLACK));
            }
          }
          parent.removeChild(path);
        }
      } finally {
        releaseChanges(ed, blocked, null);
        if (pieces.length) ed.updateSelection(false, pieces.slice(-1));
      }
    } finally {
      ed.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  /** Whether an anchor point other than an open path's ends is part-selected. */
  _isPathSplittable(path: Path): boolean {
    let splittable = false;
    const editor = ElementEditor.getEditor<PathEditor>(path);
    const parts = editor ? (editor.getPartSelection() as PathPartId[] | null) : null;
    if (parts && parts.length) {
      for (let i = 0; !splittable && i < parts.length; ++i) {
        const part = parts[i] as PathPartId;
        if (
          part.type == PathEditor.PartType.Point &&
          (path.getProperty("closed") ||
            (part.point != path.getAnchorPoints().getFirstChild() &&
              part.point != path.getAnchorPoints().getLastChild()))
        ) {
          splittable = true;
        }
      }
    }
    return splittable;
  }

  override toString(): string {
    return "[Object GSplitLineAction]";
  }
}
