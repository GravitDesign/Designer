// Old: chunk.vendor.js module 528 (GParameterizedVertexProcessor).
/**
 * The geometry of a ready shape (GSimpleShape): vertices whose
 * coordinates are numbers or expressions of named parameters, the
 * parameters expressions of the annotation (handle) positions, and the
 * annotation positions expressions of the mouse location `x`, `y`,
 * optionally clamped to [min, max].
 *
 * The definitions come from the shape catalogue and from documents
 * (`pvp`, a JSON string of [annotations name, vertices, annotations,
 * parameters]). Every expression is checked against the old whitelist
 * (isSecure, unchanged) and compiled by ready-shape-expression.ts from
 * the same text the old code handed to Function, so nothing a document
 * contains is ever run as code.
 *
 * Vertices are [command, x type, x, y type, y] runs (Close is just the
 * command); type 1 is a number, 2 an expression.
 */
import { extend } from "../core/util.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { compileExpressionFunction, type ExpressionFunction } from "./ready-shape-expression.ts";

const CoordType = {
  Direct: 1,
  Expression: 2,
} as const;

const SUPPORTED_MATH_FUNCS =
  "abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|round|sign|sin|sqrt|tan|trunc";
const SUPPORTED_MATH_FUNCS2 = "min|max";

/** One annotation (handle) in the catalogue format. */
export interface AnnotationDefinition {
  /** The x position: a number, or an expression of `x` and `y`. */
  X?: unknown;
  Y?: unknown;
  minX?: unknown;
  maxX?: unknown;
  minY?: unknown;
  maxY?: unknown;
  [key: string]: unknown;
}

/** One parameter: an expression of the annotation positions (`<name>[i].X`). */
export interface ParameterDefinition {
  name: string;
  expression: unknown;
  [key: string]: unknown;
}

interface AnnotationFunctions {
  x: ExpressionFunction;
  y: ExpressionFunction;
}

interface ParameterFunction {
  name: string;
  func: ExpressionFunction;
}

/** A vertex: its command and, unless Close, each coordinate as a number or a function. */
interface VertexDefinition {
  c: number;
  tx: number | null;
  x: number | ExpressionFunction | null;
  ty: number | null;
  y: number | ExpressionFunction | null;
}

/** A function that returns `value` whatever it is called with (a numeric annotation position). */
function constant(value: number): ExpressionFunction {
  return () => value;
}

export class ParameterizedVertexProcessor {
  static CoordType = CoordType;
  static SUPPORTED_MATH_FUNCS = SUPPORTED_MATH_FUNCS;
  static SUPPORTED_MATH_FUNCS2 = SUPPORTED_MATH_FUNCS2;

  /** The JSON string saved in documents (`pvp`). */
  static serialize(processor: ParameterizedVertexProcessor): string {
    const data: unknown[] = [processor._annotationsName, processor._initVerticesList];
    if (processor._initAnnotationsList && processor._initParametersList) {
      data.push(processor._initAnnotationsList, processor._initParametersList);
    }
    return JSON.stringify(data, null, null as unknown as undefined);
  }

  /** The processor from a `pvp` string, or null when there is none. */
  static deserialize(blob: unknown): ParameterizedVertexProcessor | null {
    let processor: ParameterizedVertexProcessor | null = null;
    if (blob) {
      const data: unknown = JSON.parse(blob as string);
      if (data && data instanceof Array && data.length > 1) {
        const name = data[0];
        const vertices = data[1];
        let annotations = null;
        let parameters = null;
        if (4 == data.length) {
          annotations = data[2];
          parameters = data[3];
        }
        processor = new ParameterizedVertexProcessor(name, annotations, parameters, vertices);
      }
    }
    return processor;
  }

  declare _annotationsName: string | null;
  declare _annotationsFuncs: AnnotationFunctions[] | null;
  declare _initAnnotationsList: unknown[] | null;
  declare _parametersFuncs: ParameterFunction[] | null;
  declare _initParametersList: unknown[] | null;
  declare _vertices: VertexDefinition[] | null;
  declare _initVerticesList: unknown[] | null;

  /**
   * Annotations and parameters only count together; without either the
   * shape has fixed vertices.
   */
  constructor(
    annotationsName: unknown,
    annotations: readonly AnnotationDefinition[] | null | undefined,
    parameters: readonly ParameterDefinition[] | null | undefined,
    vertices: readonly unknown[] | null | undefined,
  ) {
    if (annotations && annotations.length && parameters && parameters.length) {
      this._annotationsName = annotationsName as string | null;
      this._initAnnotationsFuncs(annotations);
      this._initParametersFuncs(parameters);
      if (this._parametersFuncs && this._parametersFuncs.length) {
        this._initAnnotationsList = extend(true, [], annotations) as unknown as unknown[];
        this._initParametersList = extend(true, [], parameters) as unknown as unknown[];
      }
    } else {
      this._annotationsName = null;
      this._annotationsFuncs = null;
      this._parametersFuncs = null;
    }
    this._initVertices(vertices);
    this._initVerticesList = extend(true, [], vertices) as unknown as unknown[];
  }

  /**
   * The vertices for the annotation positions `positions` (one per
   * annotation when there are parameters), or null when they don't fit
   * or an expression fails.
   */
  getVertices(positions: readonly Point[] | null | undefined): VertexContainer | null {
    if (
      (this._parametersFuncs &&
        (!positions ||
          positions.length != (this._annotationsFuncs as AnnotationFunctions[]).length)) ||
      !this._vertices
    ) {
      return null;
    }
    let container: VertexContainer | null = new VertexContainer();
    try {
      let values: unknown[] | null = null;
      if (this._parametersFuncs) {
        const list = positions as readonly Point[];
        let annotationPoints: Point[] = [];
        for (let i = 0; i < list.length; ++i) {
          const functions = (this._annotationsFuncs as AnnotationFunctions[])[
            i
          ] as AnnotationFunctions;
          const position = list[i] as Point;
          const x = functions.x(position.getX(), position.getY()) as number;
          const y = functions.y(position.getX(), position.getY()) as number;
          if (0 == i) annotationPoints = [new Point(x, y)];
          else annotationPoints.push(new Point(x, y));
        }
        for (let i = 0; i < this._parametersFuncs.length; ++i) {
          const value = (this._parametersFuncs[i] as ParameterFunction).func(annotationPoints);
          if (0 == i) values = [value];
          else (values as unknown[]).push(value);
        }
      }
      for (let i = 0; i < this._vertices.length; ++i) {
        const vertex = this._vertices[i] as VertexDefinition;
        const command = vertex.c;
        if (command != Vertex.Command.Close) {
          const x =
            vertex.tx == CoordType.Direct
              ? vertex.x
              : (vertex.x as ExpressionFunction)(...(values ?? []));
          const y =
            vertex.ty == CoordType.Direct
              ? vertex.y
              : (vertex.y as ExpressionFunction)(...(values ?? []));
          container.addVertex(command, x as number, y as number);
        } else container.addVertex(command, null as unknown as number, null as unknown as number);
      }
    } catch {
      container = null;
    }
    return container;
  }

  /** Where annotation `index` is drawn for the mouse location `location`, or null. */
  getAnnotationPosition(index: number, location: Point): Point | null {
    let position: Point | null = null;
    if (this._annotationsFuncs && this._annotationsFuncs.length > index) {
      const functions = this._annotationsFuncs[index] as AnnotationFunctions;
      const x = functions.x(location.getX(), location.getY()) as number;
      const y = functions.y(location.getX(), location.getY()) as number;
      position = new Point(x, y);
    }
    return position;
  }

  _initAnnotationsFuncs(annotations: readonly AnnotationDefinition[] | null | undefined): void {
    if (annotations && annotations.length) {
      const names = ["x", "y"];
      for (let i = 0; i < annotations.length; ++i) {
        const annotation = annotations[i] as AnnotationDefinition;
        const x =
          "number" == typeof annotation.X
            ? constant(annotation.X)
            : this._getExprFunction(annotation.X, names, annotation.minX, annotation.maxX);
        const y =
          "number" == typeof annotation.Y
            ? constant(annotation.Y)
            : this._getExprFunction(annotation.Y, names, annotation.minY, annotation.maxY);
        if (null === x || null === y) {
          this._annotationsFuncs = null;
          return;
        }
        const functions = { x, y };
        if (this._annotationsFuncs) this._annotationsFuncs.push(functions);
        else this._annotationsFuncs = [functions];
      }
    }
  }

  /**
   * The old whitelist: after removing `.X`, `.Y`, `[n]`, the parameter
   * names, numbers and the Math function names, only a single "0"
   * (or "-0") may be left once operator chains, two-argument min/max
   * and parentheses are folded (three rounds, so nesting is limited).
   * The names are used as regular expressions, as before.
   */
  isSecure(expression: unknown, names?: readonly unknown[] | null): boolean {
    // `expression` is a string; anything else throws here, as before.
    let reduced = (expression as string).replace(/\.X/g, "");
    reduced = reduced.replace(/\.Y/g, "");
    reduced = reduced.replace(/\[[0-9]+\]/g, "");
    if (names) {
      for (let i = 0; i < names.length; ++i) {
        reduced = reduced.replace(new RegExp(names[i] as string, "g"), "0");
      }
    }
    reduced = reduced.replace(/\d+\.*\d*/g, "0");
    let pattern = "(?:" + SUPPORTED_MATH_FUNCS + ")\\(";
    reduced = reduced.replace(new RegExp(pattern, "g"), "a(");
    for (let i = 0; i < 3; ++i) {
      pattern = "(?:" + SUPPORTED_MATH_FUNCS2 + ")\\(0, *0";
      reduced = reduced.replace(new RegExp(pattern, "g"), "a(0");
      reduced = reduced.replace(/(?:0 *[+\-/*]+ *)*0/g, "0");
      reduced = reduced.replace(/a?\( *-? *0 *\)/g, "0");
    }
    return "0" == reduced || "-0" == reduced;
  }

  /** `.X` and `.Y` become getX()/getY() calls, the function names Math calls. */
  _prepareExpression(expression: string | null | undefined): string | null {
    let prepared = expression || null;
    if (prepared) {
      prepared = prepared.replace(/\.X/g, ".getX()").replace(/\.Y/g, ".getY()");
      let pattern = "(" + SUPPORTED_MATH_FUNCS + ")\\(";
      prepared = prepared.replace(new RegExp(pattern, "g"), "Math.$1(");
      pattern = "(" + SUPPORTED_MATH_FUNCS2 + ")\\(";
      prepared = prepared.replace(new RegExp(pattern, "g"), "Math.$1(");
    }
    return prepared;
  }

  _initParametersFuncs(parameters: readonly ParameterDefinition[] | null | undefined): void {
    this._parametersFuncs = null;
    if (
      parameters &&
      parameters.length &&
      this._annotationsFuncs &&
      this._annotationsFuncs.length
    ) {
      const names = [this._annotationsName];
      for (let i = 0; i < parameters.length; ++i) {
        const parameter = parameters[i] as ParameterDefinition;
        if (!/^[a-z]*$/i.test(parameter.name)) {
          this._parametersFuncs = null;
          return;
        }
        const func = this._getExprFunction(parameter.expression, names);
        if (null === func) {
          this._parametersFuncs = null;
          return;
        }
        const entry = { name: parameter.name, func };
        if (this._parametersFuncs) this._parametersFuncs.push(entry);
        else this._parametersFuncs = [entry];
      }
    }
  }

  _initVertices(vertices: readonly unknown[] | null | undefined): void {
    if (vertices) {
      let i = 0;
      for (this._vertices = []; i < vertices.length;) {
        const command = vertices[i];
        switch (command) {
          case Vertex.Command.Move:
          case Vertex.Command.Line:
          case Vertex.Command.Curve:
          case Vertex.Command.Curve2:
            if (i + 4 < vertices.length) {
              const xType = vertices[i + 1];
              const xValue = vertices[i + 2];
              const yType = vertices[i + 3];
              const yValue = vertices[i + 4];
              const x = this._getCoordVal(xValue, xType);
              const y = this._getCoordVal(yValue, yType);
              if (null !== x && null !== y) {
                this._vertices.push({
                  c: command,
                  tx: xType as number,
                  x,
                  ty: yType as number,
                  y,
                });
              }
            }
            i += 5;
            break;
          case Vertex.Command.Close:
            this._vertices.push({ c: command, tx: null, x: null, ty: null, y: null });
            ++i;
            break;
          default:
            ++i;
        }
      }
    }
  }

  /** A number, a function of the parameters, or null when the coordinate is not usable. */
  _getCoordVal(value: unknown, type: unknown): number | ExpressionFunction | null {
    let result: number | ExpressionFunction | null = null;
    if (type == CoordType.Direct && "number" == typeof value) result = value;
    else if (
      type == CoordType.Expression &&
      this._parametersFuncs &&
      this._parametersFuncs.length
    ) {
      const names: string[] = [];
      for (let i = 0; i < this._parametersFuncs.length; ++i) {
        names.push((this._parametersFuncs[i] as ParameterFunction).name);
      }
      result = this._getExprFunction(value, names);
    }
    return result;
  }

  /**
   * The function for `expression` with the parameters `names`, clamped
   * to `min`/`max` when they are numbers; null when the expression is
   * empty or not on the whitelist. The body text is exactly what the old
   * code compiled, numbers included (so a -0 bound reads as 0).
   */
  _getExprFunction(
    expression: unknown,
    names: readonly unknown[] | null | undefined,
    min?: unknown,
    max?: unknown,
  ): ExpressionFunction | null {
    let func: ExpressionFunction | null = null;
    if (expression && names && names.length && this.isSecure(expression, names)) {
      let minStart = "";
      let minEnd = "";
      let maxStart = "";
      let maxEnd = "";
      if (null !== min && "number" == typeof min) {
        minStart = "Math.max(" + min + ", ( ";
        minEnd = " ))";
      }
      if (null !== max && "number" == typeof max) {
        maxStart = "Math.min(" + max + ", ( ";
        maxEnd = " ))";
      }
      const body =
        "return " +
        minStart +
        maxStart +
        this._prepareExpression(expression as string) +
        maxEnd +
        minEnd +
        ";";
      // Function joined the names with commas; a name that isn't a string
      // (null from a document) was turned into text the same way.
      func = compileExpressionFunction(
        names.map((name) => String(name)),
        body,
      );
    }
    return func;
  }
}

const processorPrototype = ParameterizedVertexProcessor.prototype;
processorPrototype._annotationsName = null;
processorPrototype._annotationsFuncs = null;
processorPrototype._initAnnotationsList = null;
processorPrototype._parametersFuncs = null;
processorPrototype._initParametersList = null;
processorPrototype._vertices = null;
processorPrototype._initVerticesList = null;
