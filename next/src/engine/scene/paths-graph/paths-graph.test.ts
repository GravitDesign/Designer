import { describe, expect, it, vi } from "vitest";
import { normalizeDocumentString } from "../../../../parity/support/normalize.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import { Point } from "../../math/point.ts";
import { FillPaintLayer } from "../../style/fill-paint-layer.ts";
import { BorderPaintLayer } from "../../style/border-paint-layer.ts";
import { CompoundPath } from "../compound-path.ts";
import { AfterSpecialChangeEvent } from "../node-events.ts";
import { Node } from "../node.ts";
import { AnchorPoint, PathBase } from "../path-base.ts";
import { Path } from "../path.ts";
import { GraphPosition, PathsGraph } from "./paths-graph.ts";
import type { PGAnchor } from "./pg-anchor.ts";
import { PGEdge, SplitPoint } from "./pg-edge.ts";
import { PGFacet } from "./pg-facet.ts";

// Every node class (paint layers, effects) for serialize and deserialize.
import.meta.glob("../../../parity/g/*.ts", { eager: true });

type Spec = [number, number] | Record<string, unknown>;

function line(points: Spec[]): PathBase {
  const p = new PathBase();
  for (const spec of points) {
    const ap = new AnchorPoint();
    if (Array.isArray(spec)) ap.setProperties(["x", "y"], spec);
    else ap.setProperties(Object.keys(spec), Object.values(spec));
    p.getAnchorPoints().appendChild(ap);
  }
  return p;
}

function points(p: PathBase): number[][] {
  return (p.getAnchorPoints().getChildren() as AnchorPoint[]).map((ap) => [ap.$x, ap.$y]);
}

function children<T>(container: { getChildren(): unknown[] }): T[] {
  return container.getChildren() as T[];
}

function square(x: number, y: number, size: number): Spec[] {
  return [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ];
}

describe("GPathsGraph", () => {
  it("saves its parts as JSON strings inside the blob", () => {
    const graph = new PathsGraph();
    const empty = JSON.parse(Node.serialize(graph) as string) as Record<string, unknown>;
    expect(Object.keys(empty)).toEqual(["@", "@id", "anchors", "_layId", "_effId"]);
    expect(empty["@"]).toBe("Paths Graph");
    expect(empty["anchors"]).toBe('{"@":"MapContainer"}');

    graph.addGraphLine(line(square(0, 0, 100)), null, null, null, true);
    const blob = JSON.parse(Node.serialize(graph) as string) as Record<string, string>;
    const anchors = JSON.parse(blob["anchors"] as string) as {
      $: { "@": string; props: unknown[] }[];
    };
    expect(anchors.$.map((a) => [a["@"], a.props.slice(1)])).toEqual([
      ["GPGAnchor", [0, 0]],
      ["GPGAnchor", [100, 0]],
      ["GPGAnchor", [100, 100]],
      ["GPGAnchor", [0, 100]],
    ]);
    const edges = JSON.parse(blob["edges"] as string) as { "@": string; $: { props: unknown[] }[] };
    expect(edges["@"]).toBe("GPathsGraph.Edges");
    expect(edges.$).toHaveLength(4);
    // [uid, cSt, source uid, destination uid, points]
    expect(edges.$[0]?.props.slice(1, 4)).toEqual([
      false,
      anchors.$[0]?.props[0],
      anchors.$[1]?.props[0],
    ]);
    const facets = JSON.parse(blob["facets"] as string) as { $: { props: unknown[] }[] };
    expect(facets.$).toHaveLength(1);
    expect((facets.$[0]?.props.slice(2) as { euid: string }[]).map((d) => d.euid)).toEqual(
      edges.$.map((e) => e.props[0]),
    );
  });

  it("restores edges onto their anchors and facets onto their edges", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(line(square(0, 0, 100)), null, null, null, true);
    const copy = Node.deserialize(Node.serialize(graph)) as PathsGraph;
    const anchors = children<PGAnchor>(copy.getAnchors());
    expect(anchors.map((a) => [a.getInEdges().length, a.getOutEdges().length])).toEqual([
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1],
    ]);
    const facet = copy.getFacets().getFirstChild() as PGFacet;
    // The restored facet dropped the bogus first link (its deserialize
    // starts reading at cSt) and kept its four edges.
    expect(facet.getDirectedEdges().getChildren()).toHaveLength(4);
    expect(facet.isInside(new Point(50, 50), false)).toBe(true);
    // Equal but for the ids of the edge curves, which are made anew.
    expect(normalizeDocumentString(Node.serialize(copy) as string)).toBe(
      normalizeDocumentString(Node.serialize(graph) as string),
    );
  });

  it("deserializes a facet with one random link too many until it is resolved", () => {
    const facet = new PGFacet();
    facet.deserialize(["f", false, { dir: 1, euid: "a" }, { dir: 2, euid: "b" }]);
    const links = children<{ getEdgeId(): unknown; $direction: number }>(facet.getDirectedEdges());
    expect(links.map((l) => [String(l.getEdgeId()).length, l.$direction])).toEqual([
      [32, 1],
      [1, 1],
      [1, 2],
    ]);
  });

  it("splits crossing lines and finds the facets between them", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(line(square(0, 0, 100)));
    graph.addGraphLine(
      line([
        [50, -20],
        [50, 120],
      ]),
    );
    expect(children<PGAnchor>(graph.getAnchors()).map((a) => [a.$x, a.$y])).toEqual([
      [0, 0],
      [100, 0],
      [50, 0],
      [50, 100],
      [50, -20],
      [50, 120],
    ]);
    expect(graph.getEdges().getChildren()).toHaveLength(7);
    const facets = children<PGFacet>(graph.getFacets());
    expect(facets).toHaveLength(2);
    expect(
      facets.map((f) => [
        f.isInside(new Point(25, 50), false),
        f.isInside(new Point(75, 50), false),
      ]),
    ).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it("makes a facet with a hole for a part inside another", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(line(square(0, 0, 100)), null, null, null, true);
    graph.addGraphLine(line(square(25, 25, 50)), null, null, null, true);
    const facets = children<PGFacet>(graph.getFacets());
    expect(facets).toHaveLength(2);
    const outer = facets.find((f) => f.getPath() instanceof CompoundPath) as PGFacet;
    expect(outer).toBeDefined();
    expect(outer.isInside(new Point(10, 10), false)).toBe(true);
    // The hole is a separate facet, not part of the outer one.
    expect(outer.isInside(new Point(50, 50), false)).toBe(false);
  });

  it("snaps line ends to anchor positions and to anchors within defaultEps", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(
      line([
        [0, 0],
        [100, 0],
      ]),
    );
    const end = graph.getAnchors().getLastChild() as PGAnchor;
    graph.addGraphLine(
      line([
        [100 + 5e-6, 0],
        [100, 100],
      ]),
    );
    graph.addGraphLine(
      line([
        [0, 100],
        [3, 3],
      ]),
      null,
      new GraphPosition(GraphPosition.PosType.Anchor, new GraphPosition.AnchorSpec(end)),
    );
    expect(children<PGAnchor>(graph.getAnchors()).map((a) => [a.$x, a.$y])).toEqual([
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ]);
    expect(points((graph.getEdges().getLastChild() as PGEdge).getPathBase())).toEqual([
      [0, 100],
      [100, 0],
    ]);
  });

  it("takes only bare GPathBase lines: a GPath can't be an edge's child", () => {
    const graph = new PathsGraph();
    const path = new Path(
      false,
      false,
      line([
        [0, 0],
        [100, 0],
      ]).cloneAnchorPoints(),
    );
    expect(() => graph.addGraphLine(path)).toThrow("Child insertion validation failed.");
  });

  it("moves the ends of its edges with an anchor", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(
      line([
        [0, 0],
        [100, 0],
        [100, 100],
      ]),
      null,
      null,
      null,
      true,
    );
    const corner = children<PGAnchor>(graph.getAnchors())[1] as PGAnchor;
    corner.setProperties(["x", "y"], [80, 20]);
    expect(children<PGEdge>(graph.getEdges()).map((e) => points(e.getPathBase()))).toEqual([
      [
        [0, 0],
        [80, 20],
      ],
      [
        [80, 20],
        [100, 100],
      ],
    ]);
  });

  it("splits an edge in place at split points", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(
      line([
        [0, 0],
        [100, 0],
      ]),
    );
    const edges: PGEdge[] = [];
    const anchors: PGAnchor[] = [];
    graph.splitEdge(
      graph.getEdges().getFirstChild() as PGEdge,
      [new SplitPoint(0, 0.75), new SplitPoint(0, 0.25)],
      false,
      edges,
      anchors,
    );
    expect(anchors.map((a) => [a.$x, a.$y])).toEqual([
      [25, 0],
      [75, 0],
    ]);
    expect(edges.map((e) => points(e.getPathBase()))).toEqual([
      [
        [0, 0],
        [25, 0],
      ],
      [
        [25, 0],
        [75, 0],
      ],
      [
        [75, 0],
        [100, 0],
      ],
    ]);
    expect(children<PGEdge>(graph.getEdges())).toEqual(edges);
  });

  it("keeps a facet's own style when the facets are rebuilt", () => {
    const graph = new PathsGraph();
    graph.addGraphLine(line(square(0, 0, 100)), null, null, null, true);
    const facet = graph.getFacets().getFirstChild() as PGFacet;
    const fill = new FillPaintLayer();
    fill.setProperty("_pt", new RGBColor([255, 0, 0]));
    facet.getPaintLayers()?.appendChild(fill);
    facet.setProperty("cSt", true);
    graph.addGraphLine(
      line([
        [200, 0],
        [300, 0],
      ]),
    );
    const rebuilt = graph.getFacets().getFirstChild() as PGFacet;
    expect(rebuilt).not.toBe(facet);
    expect(rebuilt.getProperty("cSt")).toBe(true);
    expect(
      rebuilt
        .getPaintLayers()
        ?.getFillLayers()
        .map((l) => String(l.$_pt)),
    ).toEqual([String(new RGBColor([255, 0, 0]))]);
  });

  it("reads the edge curves as its vertices and has a border only through its edges", () => {
    const graph = new PathsGraph();
    expect(graph.hasStyleBorder()).toBe(false);
    const border = new BorderPaintLayer();
    border.setProperty("_pt", new RGBColor([0, 0, 0]));
    graph.getPaintLayers()?.appendChild(border);
    expect(graph.hasStyleBorder()).toBe(false);
    graph.addGraphLine(
      line([
        [0, 0],
        [100, 50],
      ]),
    );
    expect(graph.hasStyleBorder()).toBe(true);
    const box = graph.getGeometryBBox();
    expect([box?.getX(), box?.getY(), box?.getWidth(), box?.getHeight()]).toEqual([0, 0, 100, 50]);
    expect((graph.findPivots() as Point[]).map((p) => [p.getX(), p.getY()])).toEqual([
      [0, 0],
      [100, 50],
    ]);
  });
});

describe("GPathsGraph undo of a facets change", () => {
  function rebuildFacets() {
    const graph = new PathsGraph();
    graph.addGraphLine(line(square(0, 0, 100)), null, null, null, true);
    const before = graph.getFacets();
    const sent: AfterSpecialChangeEvent[] = [];
    vi.spyOn(graph, "_sendEvent").mockImplementation((event) => {
      if (event instanceof AfterSpecialChangeEvent) sent.push(event);
    });
    graph.addGraphLine(
      line([
        [50, -20],
        [50, 120],
      ]),
    );
    const after = graph.getFacets();
    // The last change is the one that replaced `before`.
    const change = sent.find(
      (e) => (e.data as { oldFacets: unknown } | null)?.oldFacets === before,
    ) as AfterSpecialChangeEvent;
    return { graph, before, after, data: change.data as { oldFacets: typeof before } };
  }

  it("sends the replaced facets with the AfterSpecialChangeEvent", () => {
    const { graph, before, after, data } = rebuildFacets();
    expect(after).not.toBe(before);
    expect(data.oldFacets).toBe(before);
    expect(before.getParent()).toBeNull();
    expect(after.getParent()).toBe(graph);
    expect(graph.getTransactionActionSerialized(data)).toEqual({});
    expect(graph.getTransactionActionSerialized(null)).toBeNull();
  });

  it("reverts to the old facets and redoes the new ones", () => {
    const { graph, before, after, data } = rebuildFacets();
    const redo = graph.getTransactionAction(data);
    const revert = graph.getTransactionRevertAction(data);
    revert();
    expect(graph.getFacets()).toBe(before);
    expect(before.getParent()).toBe(graph);
    expect(after.getParent()).toBeNull();
    expect(graph.getFacets().getChildren()).toHaveLength(1);
    redo();
    expect(graph.getFacets()).toBe(after);
    expect(after.getParent()).toBe(graph);
    expect(before.getParent()).toBeNull();
    expect(graph.getFacets().getChildren()).toHaveLength(2);
  });

  it("does nothing without change data", () => {
    const { graph, after } = rebuildFacets();
    graph.getTransactionAction(null)();
    graph.getTransactionRevertAction(undefined)();
    graph.getTransactionActionDeserialized({})();
    expect(graph.getFacets()).toBe(after);
    expect(after.getParent()).toBe(graph);
  });
});

describe("GPGFacet", () => {
  it("accepts a cycle whose pieces only meet in x or in y (quirk)", () => {
    const first = new PGEdge();
    first.setPathBase(
      line([
        [0, 0],
        [10, 0],
      ]),
    );
    const second = new PGEdge();
    second.setPathBase(
      line([
        [10, 5],
        [0, 0],
      ]),
    );
    const facet = new PGFacet();
    const cycle = [first, second].map((e) => new PGFacet.DirectedEdge(e));
    expect(facet.init(cycle)).toBe(true);
    const third = new PGEdge();
    third.setPathBase(
      line([
        [5, 5],
        [0, 0],
      ]),
    );
    expect(facet.init([first, third].map((e) => new PGFacet.DirectedEdge(e)))).toBe(false);
  });
});

describe("GPGEdge", () => {
  it("replaces its curve", () => {
    const edge = new PGEdge();
    edge.setPathBase(
      line([
        [0, 0],
        [1, 1],
      ]),
    );
    const second = line([
      [2, 2],
      [3, 3],
    ]);
    edge.setPathBase(second);
    expect(edge.getChildren()).toEqual([second]);
    expect(edge.getPathBase()).toBe(second);
  });

  it("can't be saved without anchors", () => {
    expect(() => Node.serialize(new PGEdge())).toThrow(TypeError);
  });

  it("measures the angles its curve leaves its ends at (y up)", () => {
    const edge = new PGEdge();
    edge.setPathBase(line([[0, 0], { x: 100, y: 0, hlx: 100, hly: 50 }]));
    expect(edge.getStartAngle()).toBeCloseTo(2 * Math.PI - Math.atan2(50, 100), 12);
    expect(edge.getEndAngle()).toBeCloseTo((3 * Math.PI) / 2, 12);
  });

  it("cuts its first and last segments", () => {
    const edge = new PGEdge();
    edge.setPathBase(
      line([
        [0, 0],
        [100, 0],
        [100, 100],
      ]),
    );
    expect(points(edge.getFirstSegment(null, 0.25))).toEqual([
      [0, 0],
      [25, 0],
    ]);
    expect(points(edge.getFirstSegment(true, 0.25))).toEqual([
      [25, 0],
      [0, 0],
    ]);
    expect(points(edge.getLastSegment(null, 0.25))).toEqual([
      [100, 75],
      [100, 100],
    ]);
  });
});
