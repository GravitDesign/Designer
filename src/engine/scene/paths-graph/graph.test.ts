import { describe, expect, it } from "vitest";
import { hasMixin } from "../../core/object.ts";
import { Uid } from "../../core/uid.ts";
import { AnchorLink } from "../anchor-link.ts";
import { Anchor } from "../anchor.ts";
import { Edge } from "./edge.ts";
import { EdgeLink } from "./edge-link.ts";
import { Graph, GraphColorMap, type GraphAnchor, type GraphEdge } from "./graph.ts";
import { PGAnchor } from "./pg-anchor.ts";
import { PathsGraph } from "./paths-graph.ts";

/** A minimal anchor: plain GAnchor fields with working edge lists. */
class TestAnchor extends Anchor {
  constructor(id: string) {
    super();
    this._uid = new Uid(id);
    this._outEdges = [];
    this._inEdges = [];
  }
  override addOutEdge(edge: unknown): void {
    (this._outEdges as unknown[]).push(edge);
  }
  override addInEdge(edge: unknown): void {
    (this._inEdges as unknown[]).push(edge);
  }
  override removeOutEdge(edge: unknown): void {
    const list = this._outEdges as unknown[];
    list.splice(list.indexOf(edge), 1);
  }
  override removeInEdge(edge: unknown): void {
    const list = this._inEdges as unknown[];
    list.splice(list.indexOf(edge), 1);
  }
}

function edge(id: string): Edge {
  const e = new Edge();
  e._uid = new Uid(id);
  return e;
}

const A = (a: TestAnchor) => a as unknown as GraphAnchor;
const E = (e: Edge) => e as unknown as GraphEdge;

function idsOf(items: { getId(): unknown }[]): string[] {
  return items.map((item) => String(item.getId())).sort();
}

describe("GGraph", () => {
  it("connects, partitions and removes", () => {
    const graph = new Graph();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((id) => new TestAnchor(id)) as TestAnchor[];
    for (const anchor of [a, b, c, d]) graph.addAnchor(A(anchor as TestAnchor));
    const ab = edge("ab");
    const bc = edge("bc");
    const dd = edge("dd");
    graph.connectAnchors(A(a as TestAnchor), A(b as TestAnchor), E(ab));
    graph.connectAnchors(A(b as TestAnchor), A(c as TestAnchor), E(bc));
    graph.connectAnchors(A(d as TestAnchor), A(d as TestAnchor), E(dd));
    expect(ab.getSource()).toBe(a);
    expect(ab.getDestination()).toBe(b);

    const parts: string[][][] = [];
    graph.dfsPartitioner(
      null,
      null,
      (anchors, edges) => parts.push([idsOf(anchors), idsOf(edges)]),
      null,
    );
    expect(parts).toEqual([
      [
        ["a", "b", "c"],
        ["ab", "bc"],
      ],
      [["d"], ["dd"]],
    ]);

    graph.removeAnchor(A(b as TestAnchor));
    expect(Object.keys(graph.getAnchors() as object)).toEqual(["a", "c", "d"]);
    expect(Object.keys(graph.getEdges() as object)).toEqual(["dd"]);
    // A removed edge keeps its ends as unresolved links.
    expect(ab.getAnchors()).toEqual([null, null]);
    expect(String(ab.getSourceId())).toBe("a");
    expect(a?.getOutEdges()).toEqual([]);
  });

  it("stops the search along an edge the visitor rejects", () => {
    const graph = new Graph();
    const [a, b, c] = ["a", "b", "c"].map((id) => new TestAnchor(id)) as TestAnchor[];
    for (const anchor of [a, b, c]) graph.addAnchor(A(anchor as TestAnchor));
    graph.connectAnchors(A(a as TestAnchor), A(b as TestAnchor), E(edge("ab")));
    graph.connectAnchors(A(c as TestAnchor), A(b as TestAnchor), E(edge("cb")));
    const anchors = new GraphColorMap<GraphAnchor>();
    const edges = new GraphColorMap<GraphEdge>();
    anchors.initWhite([A(a as TestAnchor), A(b as TestAnchor), A(c as TestAnchor)]);
    edges.initWhite(Object.values(graph.getEdges() as object) as GraphEdge[]);
    const seen: string[] = [];
    graph.depthFirstSearch(
      (e) => String(e.getId()) === "cb",
      (anchor) => seen.push(String(anchor.getId())),
      A(a as TestAnchor),
      anchors,
      edges,
    );
    expect(seen).toEqual(["a", "b"]);
    expect(idsOf(edges.getItemsOfColor(GraphColorMap.Colors.Black))).toEqual(["ab", "cb"]);
  });

  it("moves items between the color lists", () => {
    const map = new GraphColorMap<GraphAnchor>();
    const items = ["a", "b", "c"].map((id) => A(new TestAnchor(id)));
    map.initWhite(items);
    map.setColor(items[1] as GraphAnchor, GraphColorMap.Colors.Gray);
    expect(map.getFirstOfColor(GraphColorMap.Colors.Gray)).toBe(items[1]);
    expect(map.getIdxItemsOfColor(GraphColorMap.Colors.White)).toEqual([0, 2]);
    map.clearItemsOfColor(GraphColorMap.Colors.White);
    expect(map.getItemsOfColor(GraphColorMap.Colors.White)).toEqual([]);
    expect(map.getColor(items[0] as GraphAnchor)).toBe(GraphColorMap.Colors.White);
  });

  it("is mixed into the paths graph, which keeps its maps in containers", () => {
    expect(hasMixin(new PathsGraph(), Graph)).toBe(true);
    expect(new PathsGraph().getData()).toBe(null);
  });
});

describe("GEdge and the links", () => {
  it("takes anchors and anchor links (a GPGAnchor counts as an anchor)", () => {
    const e = new Edge();
    const anchor = new PGAnchor();
    expect(hasMixin(anchor, Anchor)).toBe(true);
    e.init(anchor as unknown as Anchor, new AnchorLink(new Uid("x")), "data");
    expect(e.getSource()).toBe(anchor);
    expect(e.getSourceId()).toBe(anchor.getId());
    expect(e.getAnchors()).toEqual([anchor, null]);
    expect(e.getData()).toBe("data");
    e.setSource({} as never);
    expect(e.getSource()).toBe(anchor);
  });

  it("drops a resolved edge when the link gets another id", () => {
    const e = edge("e");
    const link = new EdgeLink(null, e);
    link.setId(new Uid("e"));
    expect(link.getEdge()).toBe(e);
    link.setId(new Uid("f"));
    expect(link.getEdge()).toBe(null);
  });
});
