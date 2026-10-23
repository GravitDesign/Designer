import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import { PGFacet } from "../../engine/scene/paths-graph/pg-facet.ts";

// Only the names the old G barrel (vendor module 1) had: GPGAnchor, GGraph,
// GEdge and GEdgeLink were not in it.
export const enginePathsGraph = {
  GPathsGraph: PathsGraph,
  GPGEdge: PGEdge,
  GPGFacet: PGFacet,
};
