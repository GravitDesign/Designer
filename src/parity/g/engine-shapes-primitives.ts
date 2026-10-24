import { Connector } from "../../engine/scene/connector.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Group } from "../../engine/scene/group.ts";
import { ParameterizedVertexProcessor } from "../../engine/scene/parameterized-vertex-processor.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { SimpleShape } from "../../engine/scene/simple-shape.ts";
import { Slice } from "../../engine/scene/slice.ts";

export const engineShapesPrimitives = {
  GRectangle: Rectangle,
  GGroup: Group,
  GEllipse: Ellipse,
  GConnector: Connector,
  GPolygon: Polygon,
  GSlice: Slice,
  GParameterizedVertexProcessor: ParameterizedVertexProcessor,
  GSimpleShape: SimpleShape,
};
