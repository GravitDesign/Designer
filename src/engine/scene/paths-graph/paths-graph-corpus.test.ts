// The paths graph of the corpus file, restored and stored again, must give
// the blob the old app saved after loading that file (corpus/paths-graph
// document): anchors, edges and facets as JSON strings, facets resolved,
// ids from the file kept and the rest renamed in the same order.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT, NEXT_ROOT } from "../../../../parity/support/env.ts";
import {
  documentIds,
  normalizeDocumentString,
  type Json,
} from "../../../../parity/support/normalize.ts";
import type { NodeBlob } from "../../serialize/blob.ts";
import { Point } from "../../math/point.ts";
import { Node } from "../node.ts";
import { PathsGraph } from "./paths-graph.ts";
import type { PGEdge } from "./pg-edge.ts";
import { PGFacet } from "./pg-facet.ts";

// Every node class, registered as the app registers them.
import.meta.glob("../../../parity/g/*.ts", { eager: true });

const FILE = path.join(NEXT_ROOT, "parity/corpus/files/paths-graph.gvdesign");

type Tree = { "@"?: string; $?: Tree[] } & Record<string, unknown>;

function findGraph(tree: Tree): Tree | null {
  if (tree["@"] === "Paths Graph") return tree;
  for (const child of tree.$ ?? []) {
    const found = findGraph(child);
    if (found) return found;
  }
  return null;
}

function replaceGraph(tree: Tree, blob: Tree): void {
  const children = tree.$ ?? [];
  for (let i = 0; i < children.length; i++) {
    if ((children[i] as Tree)["@"] === "Paths Graph") children[i] = blob;
    else replaceGraph(children[i] as Tree, blob);
  }
}

function loadFile(): Tree {
  const doc = JSON.parse(zlib.gunzipSync(fs.readFileSync(FILE)).toString("utf8")) as Tree;
  delete doc["_preview"];
  return doc;
}

describe("paths graph corpus file", () => {
  it("restores and stores the graph as the old app saved it", () => {
    const doc = loadFile();
    const keepIds = documentIds(doc as Json);
    const graph = Node.restore(findGraph(doc) as NodeBlob) as PathsGraph;
    expect(graph).toBeInstanceOf(PathsGraph);
    // The facet resolved its four edges and rebuilt its path.
    const facet = graph.getFacets().getFirstChild() as PGFacet;
    expect(facet).toBeInstanceOf(PGFacet);
    expect(facet.getDirectedEdges().getChildren()).toHaveLength(4);
    expect(facet.isInside(new Point(200, 180), false)).toBe(true);
    expect(facet.isInside(new Point(200, 60), false)).toBe(false);

    // Painting gives every edge curve the scene (GPGEdge._paintBorder sets
    // it), and a curve in a scene saves reftxt and refanchors. The old app
    // had painted the document before it was saved; a scene without
    // references stands in for that here.
    for (
      let edge = graph.getEdges().getFirstChild() as PGEdge | null;
      edge;
      edge = edge.getNext() as PGEdge | null
    ) {
      edge.getPathBase()._scene = { visitReferences() {} } as never;
    }
    replaceGraph(doc, Node.store(graph) as unknown as Tree);
    const actual = JSON.parse(normalizeDocumentString(JSON.stringify(doc), { keepIds })) as Tree;
    const expected = JSON.parse(
      fs.readFileSync(path.join(EXPECTED_ROOT, "corpus/paths-graph/document.json"), "utf8"),
    ) as Tree;
    expect(findGraph(actual)).toEqual(findGraph(expected));
  });
});
