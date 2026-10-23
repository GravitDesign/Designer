import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Page } from "../../engine/scene/page.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import type { PGAnchor } from "../../engine/scene/paths-graph/pg-anchor.ts";
import type { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import type { PGFacet } from "../../engine/scene/paths-graph/pg-facet.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { BaseEditor, PartInfo } from "../element-editors/base-editor.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import {
  PathsGraphEditor,
  type EditedPathsGraph,
  type GraphPartId,
  type GraphSegmentData,
} from "./paths-graph-editor.ts";

const { PartType, SelectionMode } = PathsGraphEditor;
const identity = new Transform();

function line(points: [number, number][]): PathBase {
  const base = new PathBase();
  for (const [x, y] of points) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    base.getAnchorPoints().appendChild(point);
  }
  return base;
}

/** A closed 100 x 100 square graph (4 anchors, 4 edges, 1 facet) on a page. */
function setup() {
  const scene = new Scene(new Workspace());
  const host = { invalidations: 0, requestInvalidation: () => host.invalidations++ };
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const graph = new PathsGraph();
  graph.addGraphLine(
    line([
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [0, 0],
    ]),
    null,
    null,
    null,
    true,
  );
  (scene.getActivePage() as Page).appendChild(graph);
  const anchors = graph.getAnchors().getChildren() as PGAnchor[];
  const edges = graph.getEdges().getChildren() as PGEdge[];
  const facets = graph.getFacets().getChildren() as PGFacet[];
  return { scene, graph, anchors, edges, facets };
}

/** A selected editor showing its parts (no resize box), as the subselect tool opens it. */
function partEditor(graph: PathsGraph): PathsGraphEditor {
  const editor = new PathsGraphEditor(graph as EditedPathsGraph);
  editor.setFlag(BaseEditor.Flag.Selected);
  editor.removeFlag(BoxEditor.Flag.ResizeAll);
  return editor;
}

const anchorPart = (anchor: PGAnchor): GraphPartId => ({ type: PartType.Anchor, point: anchor });
const segmentPart = (edge: PGEdge): GraphPartId => {
  const points = edge.getPathBase().getAnchorPoints();
  return {
    type: PartType.Segment,
    edge: edge,
    apLeft: points.getFirstChild() as AnchorPoint,
    apRight: points.getLastChild() as AnchorPoint,
  };
};

describe("GPathsGraphEditor", () => {
  it("is the editor of paths graphs", () => {
    const { graph } = setup();
    expect(ElementEditor.createEditor(graph)).toBeInstanceOf(PathsGraphEditor);
    expect(String(new PathsGraphEditor(graph as EditedPathsGraph))).toBe(
      "[Object GPathsGraphEditor]",
    );
  });

  it("hits anchors, then edge segments, then facets", () => {
    const { graph, anchors, edges, facets } = setup();
    const editor = partEditor(graph);
    const onAnchor = editor.getPartInfoAt(new Point(100, 0), identity) as PartInfo;
    expect(onAnchor.id).toEqual({ type: PartType.Anchor, point: anchors[1] });
    expect([onAnchor.isolated, onAnchor.selectable]).toEqual([false, true]);
    const onEdge = editor.getPartInfoAt(new Point(50, 0), identity) as PartInfo;
    const id = onEdge.id as GraphPartId;
    expect([id.type, id.edge]).toEqual([PartType.Segment, edges[0]]);
    expect((onEdge.data as GraphSegmentData).hitRes.slope).toBeCloseTo(0.5, 10);
    expect([onEdge.isolated, onEdge.selectable]).toEqual([true, false]);
    expect(editor.getCursor(onEdge.id)).toBe("select-curve");
    const inside = editor.getPartInfoAt(new Point(50, 50), identity) as PartInfo;
    expect(inside.id).toEqual({ type: PartType.Facet, facet: facets[0] });
    expect(editor.getPartInfoAt(new Point(300, 300), identity)).toBeNull();
  });

  it("keeps one kind of part selected and moves the Selected flags with it", () => {
    const { graph, anchors, edges, facets } = setup();
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [
      anchorPart(anchors[0] as PGAnchor),
      anchorPart(anchors[2] as PGAnchor),
    ]);
    expect(editor._selectionMode).toBe(SelectionMode.Anchors);
    expect(anchors.map((a) => a.hasFlag(NodeFlag.Selected))).toEqual([true, false, true, false]);

    // Anchors win over facets in a mixed selection.
    editor.updatePartSelection(false, [
      { type: PartType.Facet, facet: facets[0] },
      anchorPart(anchors[1] as PGAnchor),
    ]);
    expect(editor.getPartSelection()).toEqual([anchorPart(anchors[1] as PGAnchor)]);

    editor.updatePartSelection(false, [{ type: PartType.Facet, facet: facets[0] }]);
    expect(editor._selectionMode).toBe(SelectionMode.Facets);
    expect(anchors.some((a) => a.hasFlag(NodeFlag.Selected))).toBe(false);
    expect((facets[0] as PGFacet).hasFlag(NodeFlag.Selected)).toBe(true);
    // A facet styles the edges around it.
    expect((editor.getStylableParts() as PGEdge[]).length).toBe(4);

    editor.updatePartSelection(false, [segmentPart(edges[1] as PGEdge)]);
    expect(editor._selectionMode).toBe(SelectionMode.Edge);
    expect((facets[0] as PGFacet).hasFlag(NodeFlag.Selected)).toBe(false);
    expect((edges[1] as PGEdge).hasFlag(NodeFlag.Selected)).toBe(true);
    expect(editor.getPathBaseInEdit()).toBe((edges[1] as PGEdge).getPathBase());
    expect(editor.getStylableParts()).toEqual([edges[1]]);
  });

  it("compares handle part ids by type only (see QUESTIONS.md)", () => {
    const { graph, edges } = setup();
    const editor = partEditor(graph);
    const points = (edges[0] as PGEdge).getPathBase().getAnchorPoints();
    const left = { type: PartType.LeftHandle, point: points.getFirstChild() as AnchorPoint };
    const other = { type: PartType.LeftHandle, point: points.getLastChild() as AnchorPoint };
    // Handles of two different points: equal, because both have no facet.
    expect(editor._partIdAreEqual(left, other)).toBe(true);
    expect(
      editor._partIdAreEqual(
        { type: PartType.Point, point: points.getFirstChild() as AnchorPoint },
        { type: PartType.Point, point: points.getLastChild() as AnchorPoint },
      ),
    ).toBe(false);
  });

  it("deletes only the first edge of an edge selection (old bug, kept)", () => {
    const { graph, edges } = setup();
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [
      segmentPart(edges[0] as PGEdge),
      segmentPart(edges[2] as PGEdge),
    ]);
    expect(editor._selectionMode).toBe(SelectionMode.Edge);
    expect(editor.getPartSelection()).toHaveLength(2);
    expect(editor.isDeletePartsAllowed()).toBe(true);
    editor.deletePartsSelected();
    const left = graph.getEdges().getChildren();
    expect(left).toHaveLength(3);
    expect(left).not.toContain(edges[0]);
    expect(left).toContain(edges[2]);
    expect(graph.getFacets().getChildren()).toHaveLength(0);
  });

  it("deletes selected anchors while at least one stays", () => {
    const { graph, anchors } = setup();
    const editor = partEditor(graph);
    editor.updatePartSelection(false, anchors.map(anchorPart));
    expect(editor.isDeletePartsAllowed()).toBe(false);
    editor.updatePartSelection(false, [anchorPart(anchors[0] as PGAnchor)]);
    expect(editor.isDeletePartsAllowed()).toBe(true);
    editor.deletePartsSelected();
    expect(graph.getAnchors().getChildren()).toHaveLength(3);
    // The two edges at the anchor go with it.
    expect(graph.getEdges().getChildren()).toHaveLength(2);
    expect(editor.getPartSelection()).toBeNull();
  });

  it("moves selected anchors and the edge ends at them", () => {
    const { graph, anchors } = setup();
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [anchorPart(anchors[2] as PGAnchor)]);
    expect(editor.canApplyTransform()).toBe(true);
    editor.edTransform(new Transform(1, 0, 0, 1, 20, 10));
    // The preview moves, the graph not yet.
    expect((anchors[2] as PGAnchor).getPoint().toString()).toBe(new Point(100, 100).toString());
    editor.applyTransform(graph);
    expect([
      (anchors[2] as PGAnchor).getProperty("x"),
      (anchors[2] as PGAnchor).getProperty("y"),
    ]).toEqual([120, 110]);
    const ends = (graph.getEdges().getChildren() as PGEdge[]).flatMap((edge) => {
      const points = edge.getPathBase().getAnchorPoints();
      return [points.getFirstChild(), points.getLastChild()].map((p) => [
        (p as AnchorPoint).getProperty("x"),
        (p as AnchorPoint).getProperty("y"),
      ]);
    });
    expect(ends.filter(([x, y]) => x === 120 && y === 110)).toHaveLength(2);
    expect(ends.filter(([x, y]) => x === 100 && y === 100)).toHaveLength(0);
  });

  it("throws when aligning anchors, as the old code did (old bug, kept)", () => {
    const { graph, anchors } = setup();
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [
      anchorPart(anchors[1] as PGAnchor),
      anchorPart(anchors[2] as PGAnchor),
    ]);
    expect(editor.isAlignPartsAllowed()).toBe(true);
    // alignParts applies without a target, which GElementEditor reads.
    expect(() => editor.alignParts(null, 150, null)).toThrow(TypeError);
    expect(anchors.map((a) => a.getProperty("x"))).toEqual([0, 100, 100, 0]);
    const preview = editor.getGraphPaintElement().getAnchors().getChildren() as PGAnchor[];
    expect(preview.map((a) => a.getProperty("x"))).toEqual([0, 150, 150, 0]);
  });

  it("throws on a whole-graph preview transform, as GPathBaseEditor's did", () => {
    const { graph } = setup();
    const editor = new PathsGraphEditor(graph as EditedPathsGraph);
    editor.setFlag(BaseEditor.Flag.Selected);
    // With the resize box (pointer tool) the part selection doesn't count.
    expect(() => editor.edTransform(new Transform(1, 0, 0, 1, 10, 10))).toThrow(TypeError);
  });

  it("splits an edge at a segment hit and returns the new anchor", () => {
    const { graph, edges } = setup();
    const editor = partEditor(graph);
    const hit = editor.getPartInfoAt(new Point(50, 0), identity) as PartInfo;
    const anchor = editor.splitEdge(hit, true) as PGAnchor;
    expect(anchor).not.toBeNull();
    expect([anchor.getProperty("x"), anchor.getProperty("y")]).toEqual([50, 0]);
    expect(graph.getAnchors().getChildren()).toHaveLength(5);
    expect(graph.getEdges().getChildren()).toHaveLength(5);
    expect(graph.getEdges().getChildren()).not.toContain(edges[0]);
    // An anchor part splits nothing.
    const onAnchor = editor.getPartInfoAt(new Point(100, 100), identity) as PartInfo;
    expect(editor.splitEdge(onAnchor)).toBe((onAnchor.id as GraphPartId).point);
  });

  it("restores PartInfos, not part ids, from the Selected flags (see QUESTIONS.md)", () => {
    const { graph, anchors } = setup();
    (anchors[0] as PGAnchor).setFlag(NodeFlag.Selected);
    const editor = partEditor(graph);
    editor.restoreEditorStateData(null);
    const selection = editor.getPartSelection() as unknown[];
    expect(selection).toHaveLength(1);
    expect(selection[0]).toBeInstanceOf(PartInfo);
    expect(editor._selectionMode).toBe(SelectionMode.None);
  });

  it("gives a new graph's border round caps unless styled from another graph", () => {
    const { graph } = setup();
    const layers = graph.getPaintLayers() as NonNullable<ReturnType<PathsGraph["getPaintLayers"]>>;
    layers.appendChild(new BorderPaintLayer());
    const editor = new PathsGraphEditor(graph as EditedPathsGraph);
    editor.initialSetup();
    const borders = layers.getBorderLayers();
    const border = borders[borders.length - 1] as BorderPaintLayer;
    expect(border.getProperty("_blc")).toBe("round");
    border.setProperty("_blc", "butt");
    editor.initialSetup(new PathsGraph());
    expect(border.getProperty("_blc")).toBe("butt");
  });

  it("throws in getPointsSelectionType for one selected part (path code, see QUESTIONS.md)", () => {
    const { graph, anchors } = setup();
    const editor = partEditor(graph);
    editor.updatePartSelection(false, [anchorPart(anchors[0] as PGAnchor)]);
    expect(() => editor.getPointsSelectionType()).toThrow(TypeError);
    editor.updatePartSelection(false, [
      anchorPart(anchors[0] as PGAnchor),
      anchorPart(anchors[1] as PGAnchor),
    ]);
    expect(editor.getPointsSelectionType()).toBe(PathsGraphEditor.PointsSelectionType.Several);
  });
});
