// Old: chunk.vendor.js module 764 (GMagicTool).
/**
 * Freehand shaping: draws a freehand stroke and adds it to the selected
 * shapes (when the stroke starts inside one of them) or cuts it out of
 * them. The closed sub-paths of the selected vertex sources are united
 * with or subtracted from the stroke, the result replaces them as one
 * path.
 *
 * The add-or-cut decision starts from where the stroke began and flips
 * with the stroke's direction: a stroke that doesn't cross the shapes is
 * added when it runs clockwise.
 */
import { registerClass } from "../../engine/core/object.ts";
import { PolyIntersector } from "../../engine/geometry/boolean/poly-segments.ts";
import { VertexPolyBoolean } from "../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { PathUtil } from "../../engine/geometry/path-util.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexSourceMixin } from "../../engine/geometry/vertex-source.ts";
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Path } from "../../engine/scene/path.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Guide } from "../guides/guide.ts";
import { FreehandTool } from "./freehand-tool.ts";

/** A vertex source as the clipping reads it. */
type Source = Parameters<typeof VertexContainer.mergeVertexSources>[0] & {
  rewindVertices(index: number): boolean;
  readVertex(vertex: Vertex): boolean;
};

/** A selected element that is a vertex source. */
type SourceNode = Node & Source & { getGeometryBBox(): Rect | null; $trf: unknown };

export class MagicTool extends FreehandTool {
  static {
    registerClass(this, "GMagicTool");
  }

  /** Add the stroke (true) or cut it out (false). */
  override _willMerge = true;

  /** The stroke adds when it starts inside a selected vertex source. */
  override _mouseDown(event: MouseEvent): void {
    super._mouseDown(event);
    let point = this._view
      .getViewTransform(this._view.getScene().getActivePage() as Page)
      .mapPoint(event.client);
    const guides = this._editor.getGuides();
    guides.beginMap(this._editor.getMappingScopes() as unknown as Node[]);
    point = guides.mapPoint(point, Guide.DetailMap.Mode.DetailOnFilterOn);
    guides.finishMap();
    this._willMerge = false;
    const selection = this._startingSelection;
    if (selection)
      for (let i = 0; i < selection.length; i++)
        if ((selection[i] as Node).hasMixin(VertexSourceMixin)) {
          const source = selection[i] as SourceNode;
          const box = source.getGeometryBBox();
          if (
            box &&
            box.containsPoint(point as Point) &&
            VertexInfo.hitTest(point.getX(), point.getY(), source as never, 0, true)
          ) {
            this._willMerge = true;
            break;
          }
        }
  }

  override _finalizeDrawing(): void {
    this._doTheClip();
  }

  /** Unites the stroke with or cuts it out of the selection's closed sub-paths. */
  _doTheClip(): void {
    let stroke: Path;
    if (this._closeIfNeeded()) {
      stroke = this._newPath as Path;
      this._correctFillVisibility();
    } else {
      // An open stroke is closed in a copy.
      stroke = (this._newPath as Path).clone() as Path;
      const anchors = stroke.getAnchorPoints();
      const first = anchors.getFirstChild() as AnchorPoint;
      const closing = new AnchorPoint();
      closing.setProperties(["x", "y"], [first.$x, first.$y]);
      anchors.appendChild(closing);
      stroke.correctClosedAttribute();
    }
    const selection = this._startingSelection;
    if (selection) {
      const touched: { item: SourceNode; sub: boolean; splitted: Source[] }[] = [];
      // The open sub-paths, kept as they are.
      const open: Source[] = [];
      const intersector = new PolyIntersector();
      let crosses = false;
      for (let f = 0; f < selection.length; f++)
        if ((selection[f] as Node).hasMixin(VertexSourceMixin)) {
          const redistributed = PolyIntersector.redistributeVertexSource(selection[f] as never);
          const groups = redistributed.containers.length;
          const closed: Source[] = [];
          for (let v = 0; v < groups; v++)
            for (
              let group = redistributed.containers[v] as Source[], c = 0;
              c < group.length;
              c++
            ) {
              const part = group[c] as Source;
              const first = new Vertex();
              const last = new Vertex();
              let isClosed = false;
              if (part.rewindVertices(0) && part.readVertex(first) && part.readVertex(last)) {
                while (part.readVertex(last));
                if (
                  last.command === Vertex.Command.Close ||
                  (last.x === first.x && last.y === first.y)
                ) {
                  closed.push(part);
                  isClosed = true;
                  if (
                    intersector.intersect(
                      stroke as never,
                      part as never,
                      false,
                      true,
                      null,
                      (redistributed.polys[v] as never[])[c],
                    )
                  )
                    crosses = true;
                }
              }
              if (!isClosed) open.push(part);
            }
          if (closed.length)
            touched.push({ item: selection[f] as SourceNode, sub: false, splitted: closed });
        }
      if (touched.length) {
        let parts: Source[] = [];
        for (let f = 0; f < touched.length; f++)
          parts = parts.concat((touched[f] as (typeof touched)[number]).splitted);
        if (!crosses && this._willMerge) {
          if (!stroke.isClockWise()) this._willMerge = false;
        } else if (!crosses && stroke.isClockWise()) this._willMerge = true;
        const clipped = (
          this._willMerge ? this._doTheMerge(parts, [stroke]) : this._doTheSub(parts, [stroke])
        ).concat(open);
        const merged = VertexContainer.mergeVertexSources(clipped as never);
        const result = PathUtil.createPathFromVertexSource(merged as never) as Path | null;
        if (result) {
          const source = (touched[0] as (typeof touched)[number]).item;
          const transform = source.$trf;
          source.$trf = null;
          result.assignFrom(source);
          source.$trf = transform;
        }
        for (let f = 0; f < touched.length; f++) {
          const item = (touched[f] as (typeof touched)[number]).item;
          const parent = item.getParent() as ContainerNode | null;
          if (parent) parent.removeChild(item);
        }
        // The open sub-paths are vertex sources, not entries with an item:
        // with any of them this throws a TypeError, as in the old code. A
        // crash, kept for now (BUGS-FIXED candidate, pinned by
        // view-tools.test.ts "MagicTool with open sub-paths").
        for (let f = 0; f < open.length; f++) {
          const item = (open[f] as unknown as { item: Node }).item;
          const parent = item.getParent() as ContainerNode | null;
          if (parent) parent.removeChild(item);
        }
        const newPath = this._newPath as Path;
        if (result) (newPath.getParent() as ContainerNode).insertChild(result, newPath);
        (newPath.getParent() as ContainerNode).removeChild(newPath);
        if (result) {
          this._newPath = result;
          this._editor.updateSelection(false, [result]);
        }
      } else (this._newPath as Path).setFlag(NodeFlag.Selected);
    } else (this._newPath as Path).setFlag(NodeFlag.Selected);
  }

  _doTheMerge(parts: Source[], stroke: Source[]): Source[] {
    const clipper = new VertexPolyBoolean(
      VertexPolyBoolean.PIP_CHECK_ODDEVEN,
      VertexPolyBoolean.AUTO,
    );
    const source = VertexContainer.mergeVertexSources(parts as never);
    const clip = VertexContainer.mergeVertexSources(stroke as never);
    return clipper.initializeSources(source as never, clip as never)
      ? (clipper.clipOp(VertexPolyBoolean.OR) as unknown as Source[])
      : parts.concat(stroke);
  }

  _doTheSub(parts: Source[], stroke: Source[]): Source[] {
    const clipper = new VertexPolyBoolean(
      VertexPolyBoolean.PIP_CHECK_ODDEVEN,
      VertexPolyBoolean.AUTO,
    );
    const source = VertexContainer.mergeVertexSources(parts as never);
    const clip = VertexContainer.mergeVertexSources(stroke as never);
    return clipper.initializeSources(source as never, clip as never)
      ? (clipper.clipOp(VertexPolyBoolean.SUB) as unknown as Source[])
      : parts;
  }

  override toString(): string {
    return "[Object GMagicTool]";
  }
}
