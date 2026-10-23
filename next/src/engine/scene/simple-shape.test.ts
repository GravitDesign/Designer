import { describe, expect, it } from "vitest";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { Node } from "./node.ts";
import { ParameterizedVertexProcessor } from "./parameterized-vertex-processor.ts";
import { SimpleShape } from "./simple-shape.ts";

const annotations = [{ X: "x", Y: -1, minX: -0.9, maxX: 0.9 }];
const parameters = [
  { name: "px", expression: "annot[0].X" },
  { name: "py", expression: "min(1, abs(annot[0].X) + 0.5)" },
];
const vertices = [1, 2, "px", 1, -1, 2, 1, 1, 2, "py", 2, 1, -1, 1, 1, 5];

function triangle(width = 100, height = 80): SimpleShape {
  const processor = new ParameterizedVertexProcessor("annot", annotations, parameters, vertices);
  return new SimpleShape(processor, [new Point(-0.5, -1)], width, height, "Test Triangle", "icon");
}

function read(shape: SimpleShape): number[] {
  const out: number[] = [];
  const vertex = new Vertex();
  if (shape.rewindVertices(0))
    while (shape.readVertex(vertex)) out.push(vertex.command, vertex.x, vertex.y);
  return out;
}

describe("GSimpleShape", () => {
  it("builds its paths from the processor and fits them into the size", () => {
    const shape = triangle();
    expect(Node.getName(shape)).toBe("Ready Shape");
    expect(shape.toString()).toBe("Test Triangle");
    expect(shape.getIcon()).toBe("icon");
    expect(shape._isEvenOddFill()).toBe(true);
    const box = VertexInfo.calculateBounds(shape, true);
    expect([box?.getX(), box?.getY(), box?.getWidth(), box?.getHeight()]).toEqual([0, 0, 100, 80]);
    expect(read(shape).length).toBeGreaterThan(6);
    expect(shape.getAnnotationsCount()).toBe(1);
  });

  it("moves an annotation and recomputes the shape", () => {
    const shape = triangle(0, 0);
    expect(shape.getProperty("trf")).toBeNull();
    const before = read(shape);
    shape.setAnnotationMouseLocation(0, new Point(0.8, 0));
    expect(read(shape)).not.toEqual(before);
    expect(shape.getAnnotationPosition(0)?.getX()).toBe(0.8);
    shape.setAnnotationMouseLocation(0, new Point(5, 0));
    expect(shape.getAnnotationPosition(0)?.getX()).toBe(0.9);
    const seen: (number | undefined)[] = [];
    shape.iterateAnnotations((position) => {
      seen.push(position?.getY());
    });
    expect(seen).toEqual([-1]);
  });

  it("maps the annotations with its transform", () => {
    const shape = triangle(0, 0);
    shape.setProperty("trf", new Transform(10, 0, 0, 10, 5, 5));
    expect(shape.getAnnotationPosition(0)?.getX()).toBe(0);
    shape.setAnnotationMouseLocation(0, new Point(10, 0));
    expect(shape.getAnnotationPosition(0)?.getX()).toBe(10);
  });

  it("saves the processor and the annotation positions and restores them", () => {
    const shape = triangle();
    const blob = JSON.parse(Node.serialize(shape) as string) as Record<string, unknown>;
    expect([blob["ssn"], blob["icn"], blob["apv"]]).toEqual(["Test Triangle", "icon", "[-0.5,-1]"]);
    expect(blob["pvp"]).toBe(
      ParameterizedVertexProcessor.serialize(
        shape._parameterizedVertexProcessor as ParameterizedVertexProcessor,
      ),
    );
    const back = Node.deserialize(JSON.stringify(blob)) as SimpleShape;
    expect(read(back)).toEqual(read(shape));
    expect(back.toString()).toBe("Test Triangle");
  });

  it("without a processor starts empty, like the old constructor that ran no base constructor", () => {
    const shape = new SimpleShape();
    expect(Object.keys(shape)).toEqual([]);
    expect(shape.getAnnotationsCount()).toBe(0);
    expect(shape.rewindVertices(0)).toBe(false);
  });

  it("fails to save without annotations (old bug, kept)", () => {
    const processor = new ParameterizedVertexProcessor(
      null,
      null,
      null,
      [1, 1, 0, 1, 0, 2, 1, 1, 1, 1, 5],
    );
    const shape = new SimpleShape(processor, null, 0, 0, "Fixed");
    expect(read(shape).length).toBeGreaterThan(0);
    expect(() => Node.serialize(shape)).toThrow(TypeError);
  });
});
