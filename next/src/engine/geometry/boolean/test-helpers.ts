// Shapes and readers shared by the boolean cluster's unit tests.
import { Vertex } from "../vertex.ts";
import { VertexContainer } from "../vertex-container.ts";
import type { VertexReader } from "../vertex-source.ts";
import oldOutputs from "./old-outputs.json";

/**
 * Outputs of the old modules (264, 187 and 1002 of public/chunk.vendor.js)
 * for the inputs the tests build, recorded in Node by loading the old
 * modules directly.
 */
export const OLD = oldOutputs as Record<string, unknown>;

export function build(flat: number[]): VertexContainer {
  const container = new VertexContainer();
  for (let i = 0; i < flat.length; i += 3)
    container.addVertex(flat[i] as number, flat[i + 1] as number, flat[i + 2] as number);
  return container;
}

/** A source's vertices as a flat [command, x, y, ...] list (null if it can't rewind). */
export function verts(source: VertexReader | null | undefined): number[] | null {
  if (!source || !source.rewindVertices(0)) return null;
  const out: number[] = [];
  const vertex = new Vertex();
  while (source.readVertex(vertex)) out.push(vertex.command, vertex.x, vertex.y);
  return out;
}

export function rect(x: number, y: number, w: number, h: number): number[] {
  return [1, x, y, 2, x + w, y, 2, x + w, y + h, 2, x, y + h, 5, 0, 0];
}

const KAPPA = 0.5522847498307936;

/** An ellipse as four cubics, the way the parity scenarios build it. */
export function ellipse(cx: number, cy: number, rx: number, ry: number): number[] {
  const k = KAPPA;
  return [
    1,
    cx + rx,
    cy,
    4,
    cx,
    cy + ry,
    4,
    cx + rx,
    cy + ry * k,
    4,
    cx + rx * k,
    cy + ry,
    4,
    cx - rx,
    cy,
    4,
    cx - rx * k,
    cy + ry,
    4,
    cx - rx,
    cy + ry * k,
    4,
    cx,
    cy - ry,
    4,
    cx - rx,
    cy - ry * k,
    4,
    cx - rx * k,
    cy - ry,
    4,
    cx + rx,
    cy,
    4,
    cx + rx * k,
    cy - ry,
    4,
    cx + rx,
    cy - ry * k,
    5,
    0,
    0,
  ];
}
