// Old: public/pscolor.js, the Pattern branch of PSColor._getGColor.
//
// Shadings become what the page can draw: axial and radial shadings
// (types 2 and 3) become linear/radial gradients with stops sampled from
// their functions; free-form and lattice triangle meshes (4, 5) and Coons
// and tensor patch meshes (6, 7) are rasterized into a small image in
// device space ("imageData"). Everything else is error "01" and blue.
//
// BUG-116: the mesh parameters (BitsPerComponent, BitsPerCoordinate,
// BitsPerFlag, Decode, VerticesPerRow, Function) come from the shading
// dict, also when it sits in a PatternType 2 pattern; mesh data can be a
// file, a string or an array; triangle meshes get their triangles and a
// lattice joins all its rows. The old code read the pattern dict, read
// only files, threw on the first triangle vertex and joined two rows.
import {
  ColorBitsReader,
  failedColor,
  valueOf,
  asNumber,
  type GColor,
  type GradientStop,
  type ImageDataGColor,
  type Indexed,
  type PSColor,
  type PSFunctionInfo,
  type SampledFunction,
} from "./color.ts";
import type { GraphicsState, PSPlainRecord, PSValue } from "./objects.ts";

/** A triangle (types 4, 5) or patch (6, 7) with its vertex colours. */
interface MeshPiece {
  flag?: number;
  coords: number[];
  colors: number[][];
}

/** The colour of a shading or pattern dict (`dict` is what the old code called t). */
export function getPatternColor(color: PSColor, dict: unknown): GColor {
  // `in` on the dict's value as before (throws when it has none).
  const patternEntries = valueOf(dict) as PSPlainRecord;
  let shadingObject: unknown = null;
  if (
    "PatternType" in (patternEntries as object) &&
    patternEntries.PatternType == 2 &&
    "Shading" in patternEntries
  )
    shadingObject = patternEntries.Shading;
  else if ("ShadingType" in patternEntries) shadingObject = dict;
  if (!shadingObject) {
    color.core.toGravit("error", ["01"]);
    return failedColor();
  }
  const shading = valueOf(shadingObject) as PSPlainRecord;
  const shadingType = shading.ShadingType as number;
  const spaceValue = valueOf(shading.ColorSpace);
  const spaceName = (
    typeof spaceValue == "string" ? spaceValue : valueOf((spaceValue as PSValue[])[0])
  ) as string;
  /** One function per colour component (r in the old code). */
  let functionPerComponent = false;
  let mainFunction: PSFunctionInfo | null | false = false;
  let componentFunctions: (PSFunctionInfo | null)[] | false = false;
  if ("Function" in shading) {
    const functionObject = shading.Function;
    if (color.core.classes.isPSObject(functionObject, "array")) {
      if ((mainFunction = color.PSFunction(functionObject.value[0]))) {
        componentFunctions = [mainFunction];
        for (let i = 1; i < functionObject.value.length; ++i)
          componentFunctions.push(color.PSFunction(functionObject.value[i]));
      }
      if (
        !componentFunctions ||
        !(
          (spaceName == "DeviceRGB" && componentFunctions.length == 3) ||
          (spaceName == "DeviceCMYK" && componentFunctions.length == 4) ||
          (spaceName == "DeviceGray" && componentFunctions.length == 1)
        )
      ) {
        color.core.toGravit("error", ["01"]);
        return failedColor();
      }
      functionPerComponent = true;
    } else mainFunction = color.PSFunction(functionObject);
  }

  /** Components to a page colour in the shading's space (h in the old code). */
  const toColor = (values: unknown): GColor | null => {
    const components = values as number[];
    let result: GColor | null = null;
    if (components.length == 3 && spaceName == "DeviceRGB")
      result = {
        type: "rgb",
        value: [
          color.round_clamp_byte(255 * asNumber(components[0])),
          color.round_clamp_byte(255 * asNumber(components[1])),
          color.round_clamp_byte(255 * asNumber(components[2])),
        ],
      };
    else if (components.length == 4 && spaceName == "DeviceCMYK")
      result = {
        type: "cmyk",
        value: [
          color.round_clamp_byte(255 * asNumber(components[0])),
          color.round_clamp_byte(255 * asNumber(components[1])),
          color.round_clamp_byte(255 * asNumber(components[2])),
          color.round_clamp_byte(255 * asNumber(components[3])),
        ],
      };
    else if (components.length == 1 && spaceName == "DeviceGray")
      result = {
        type: "rgb",
        value: [
          color.round_clamp_byte(255 * asNumber(components[0])),
          color.round_clamp_byte(255 * asNumber(components[0])),
          color.round_clamp_byte(255 * asNumber(components[0])),
        ],
      };
    else if (
      (spaceName == "DeviceN" || spaceName == "Separation") &&
      (valueOf(shading.ColorSpace) as { length: number }).length == 4
    ) {
      const space = valueOf(shading.ColorSpace) as PSValue[];
      const alternate =
        typeof valueOf(space[2]) == "string" ? [space[2]] : (valueOf(space[2]) as PSValue[]);
      const tint = color._getSeparationColorVal(alternate, space[3], components);
      return color._getGColor(alternate, tint);
    }
    return result;
  };

  const ctm = () => (patternEntries.gstate as GraphicsState).CTM;

  if (shadingType == 2 || shadingType == 3) {
    const type = shadingType == 2 ? "linear" : "radial";
    const coords = valueOf(shading.Coords) as PSValue[];
    let stops: GradientStop[] = [
      { opacity: 1, color: { type: "rgb", value: [255, 255, 255] }, position: 0 },
      { opacity: 1, color: { type: "rgb", value: [0, 0, 0] }, position: 1 },
    ];
    if (!mainFunction) return { type, value: coords, stops, transform: ctm() };
    const exponential = mainFunction as { C0?: number[] | false; C1?: number[] | false };
    if (exponential.C0 && exponential.C1) {
      // Sic: with one function per component, only the first one's ends are used.
      stops = [
        { opacity: 1, color: toColor(exponential.C0), position: 0 },
        { opacity: 1, color: toColor(exponential.C1), position: 1 },
      ];
    } else if (
      (mainFunction.type == "samples" && mainFunction.size.length == 1) ||
      mainFunction.type == "exp"
    ) {
      let collected: GradientStop[] = [];
      if (componentFunctions) {
        const perFunction: GradientStop[][] = [];
        let count = 0;
        let mismatch = false;
        for (let i = 0; i < componentFunctions.length && !mismatch; ++i) {
          const fn = componentFunctions[i] as PSFunctionInfo;
          const fnStops = stopsFor(fn, fn, fn.domain[0] as number, fn.domain[1] as number, 0, 1);
          if (!count && fnStops && fnStops.length) count = fnStops.length;
          else if (!(fnStops.length && count == fnStops.length)) mismatch = true;
          perFunction.push(fnStops);
        }
        if (mismatch) return { type, value: coords, stops, transform: ctm() };
        for (let i = 0; i < count; ++i) {
          const components: unknown[] = [];
          for (const fnStops of perFunction) components.push((fnStops[i] as GradientStop).color);
          const position = ((perFunction[0] as GradientStop[])[i] as GradientStop).position;
          collected.push({ opacity: 1, color: toColor(components), position });
        }
        if (collected.length > 2) collected = color._optimizeStops(collected);
      } else {
        collected = stopsFor(
          mainFunction,
          mainFunction,
          mainFunction.domain[0] as number,
          mainFunction.domain[1] as number,
          0,
          1,
        );
      }
      if (collected.length) stops = collected;
    } else if (
      mainFunction.type == "stitch" &&
      mainFunction.stitches.length == (mainFunction.bounds ? mainFunction.bounds.length + 1 : 1) &&
      2 * mainFunction.stitches.length == mainFunction.encode.length
    ) {
      const collected: GradientStop[] = [];
      let end = mainFunction.domain[0] as number;
      for (let i = 0; i < mainFunction.stitches.length; ++i) {
        const start = end;
        end =
          mainFunction.bounds && i < mainFunction.bounds.length
            ? (mainFunction.bounds[i] as number)
            : (mainFunction.domain[1] as number);
        const part = stopsFor(
          mainFunction,
          mainFunction.stitches[i] as PSFunctionInfo,
          start,
          end,
          i,
          mainFunction.stitches.length,
        );
        if (part && part.length) for (const stop of part) collected.push(stop);
      }
      if (collected.length) stops = collected;
    }
    return { type, value: coords, stops, transform: ctm() };
  }

  if (shadingType == 4 || shadingType == 5)
    return triangleMesh(color, shadingType, shading, patternEntries, spaceName, toColor);
  if (shadingType == 6 || shadingType == 7)
    return patchMesh(color, shadingType, shading, patternEntries, spaceName, toColor);
  console.log("shadingType = " + shadingType);
  color.core.toGravit("error", ["01"]);
  return failedColor();

  /**
   * The gradient stops of `fn` between t0 and t1, the index-th of `count`
   * parts of `parent` (v in the old code). With one function per
   * component, stop colours stay raw component arrays.
   */
  function stopsFor(
    parent: PSFunctionInfo,
    fn: PSFunctionInfo,
    t0: number,
    t1: number,
    index: number,
    count: number,
  ): GradientStop[] {
    const encodeValue = (parent as { encode?: number[] | null }).encode;
    const encode = encodeValue ? encodeValue : null;
    let stops: GradientStop[] = [];
    const parentDomain = parent.domain;
    const domainStart = parentDomain[0] as number;
    const domainEnd = parentDomain[1] as number;
    const at = (value: number, fallback: number) =>
      Math.abs(domainEnd - domainStart) <= 1e-10
        ? fallback
        : (value - domainStart) / (domainEnd - domainStart);
    if (fn.type == "exp") {
      let stopColor: unknown;
      if (fn.C0 != null) stopColor = functionPerComponent ? fn.C0 : toColor(fn.C0);
      else {
        const c1 = fn.C1 != null ? (fn.C1 as number[])[0] : 1;
        const value = (encode ? (encode[2 * index] as number) : 0) * (c1 as number);
        const clamped = color.PSFunctionDomain([value], fn.range);
        stopColor = functionPerComponent ? clamped : toColor(clamped);
      }
      const position = at(t0, index / count);
      stops.push({ opacity: 1, color: stopColor, position });
      if (index == count - 1) {
        if (fn.C1 != null) stopColor = functionPerComponent ? fn.C1 : toColor(fn.C1);
        else {
          const c0 = fn.C0 != null ? ((fn.C0 as number[])[0] as number) : 0;
          const value = c0 + (encode ? (encode[2 * index + 1] as number) : 1) * (1 - c0);
          const clamped = color.PSFunctionDomain([value], fn.range);
          stopColor = functionPerComponent ? clamped : toColor(clamped);
        }
        stops.push({ opacity: 1, color: stopColor, position: 1 });
      }
    } else if (fn.type == "samples" && fn.size.length == 1) {
      const outputs = fn.range.length / 2;
      if (
        functionPerComponent ||
        (spaceName == "DeviceRGB" && outputs == 3) ||
        (spaceName == "DeviceCMYK" && outputs == 4) ||
        (spaceName == "DeviceGray" && outputs == 1)
      )
        stops = sampledStops(fn, outputs);
    }
    return stops;

    function sampledStops(sampled: SampledFunction, outputs: number): GradientStop[] {
      let stops: GradientStop[] = [];
      const samples = sampled.samples;
      const count2 = Math.floor(samples.length / outputs);
      const decode = sampled.decode ? sampled.decode : sampled.range;
      const sampleEncode = sampled.encode ? sampled.encode : [0, count2 - 1];
      const maxSample = () => Math.pow(2, sampled.bitsPerSample) - 1;
      const sampleColor = (offset: number) => {
        let components: number[] = [];
        for (let r = 0; r < outputs; ++r) {
          const raw = samples[offset + r] as number;
          components.push(
            color.PSFunctionInterpolate(
              raw,
              0,
              maxSample(),
              decode[2 * r] as number,
              decode[2 * r + 1] as number,
            ),
          );
        }
        components = color.PSFunctionDomain(components, sampled.range);
        return functionPerComponent ? components : toColor(components);
      };
      if (decode.length != 2 * outputs) return stops;
      if (count2 > 1) {
        let raw: GradientStop[] = [];
        const p0 = at(t0, index / count);
        const p1 =
          Math.abs(domainEnd - domainStart) <= 1e-10
            ? (index + 1) / count
            : (t1 - domainStart) / (domainEnd - domainStart);
        const low = Math.min(p0, p1);
        const high = Math.max(p0, p1);
        let encodeLow = 0;
        let encodeHigh = 0;
        if (encode) {
          encodeLow = Math.min(encode[2 * index] as number, encode[2 * index + 1] as number);
          encodeHigh = Math.max(encode[2 * index] as number, encode[2 * index + 1] as number);
        }
        const positionOf = (sample: number) => {
          if (encode) {
            const encoded = color.PSFunctionInterpolate(
              sample,
              sampleEncode[0] as number,
              sampleEncode[1] as number,
              encodeLow,
              encodeHigh,
            );
            return color.PSFunctionInterpolate(
              encoded,
              encode[2 * index] as number,
              encode[2 * index + 1] as number,
              low,
              high,
            );
          }
          return color.PSFunctionInterpolate(
            sample,
            sampleEncode[0] as number,
            sampleEncode[1] as number,
            low,
            high,
          );
        };
        for (let g = 0; g < count2 - 1; ++g) {
          const position = positionOf(g);
          raw.push({ color: sampleColor(g * outputs), position });
        }
        if (index == count - 1) {
          const lastColor = sampleColor((count2 - 1) * outputs);
          // Sic: the last stop sits at sample index count2, one past the last sample.
          raw.push({ color: lastColor, position: positionOf(count2) });
        }
        if (functionPerComponent) stops = raw;
        else {
          if (raw.length > 2) raw = color._optimizeStops(raw);
          for (const stop of raw)
            stops.push({ opacity: 1, color: stop.color, position: stop.position });
        }
      } else if (count2 == 1) {
        const position = index == count - 1 ? 1 : at(t0, index / count);
        stops.push({ opacity: 1, color: sampleColor(0), position });
      }
      return stops;
    }
  }
}

type ToColor = (values: unknown) => GColor | null;

/** The mesh parameters shared by types 4-7, from the shading dict. */
interface MeshParameters {
  bitsPerComponent: number;
  maxComponent: number;
  bitsPerCoordinate: number;
  bitsPerFlag: number;
  decode: number[];
  maxCoordinate: number;
}

function meshParameters(shading: PSPlainRecord, fromArray: boolean): MeshParameters {
  const bitsPerComponent = shading.BitsPerComponent as number;
  const bitsPerCoordinate = shading.BitsPerCoordinate as number;
  return {
    bitsPerComponent,
    maxComponent: Math.pow(2, bitsPerComponent) - 1,
    bitsPerCoordinate,
    bitsPerFlag: shading.BitsPerFlag as number,
    // An array holds its values as they are: no Decode.
    decode: fromArray ? [] : (valueOf(shading.Decode) as number[]).slice(),
    maxCoordinate: Math.pow(2, bitsPerCoordinate) - 1,
  };
}

function channelsOf(spaceName: string): number {
  let channels: number | undefined;
  if (spaceName == "DeviceRGB") channels = 3;
  else if (spaceName == "DeviceCMYK") channels = 4;
  else if (spaceName == "DeviceGray") channels = 1;
  return channels as number;
}

/**
 * The vertex data of a mesh: the bits of a file or string mapped through
 * Decode, or the numbers of an array as they are. Every flag starts on a
 * byte boundary.
 */
class MeshData {
  readonly #bits: ColorBitsReader | null = null;
  readonly #numbers: PSValue[] | null = null;
  #next = 0;
  readonly #color: PSColor;
  readonly #parameters: MeshParameters;

  constructor(color: PSColor, source: PSValue, parameters: MeshParameters) {
    const classes = color.core.classes;
    this.#color = color;
    this.#parameters = parameters;
    if (classes.isPSObject(source, "array") || classes.isPSObject(source, "packedarray"))
      this.#numbers = source.value;
    else this.#bits = new ColorBitsReader(source, classes);
  }

  static fromArray(color: PSColor, source: PSValue): boolean {
    const classes = color.core.classes;
    return classes.isPSObject(source, "array") || classes.isPSObject(source, "packedarray");
  }

  isEOF(): boolean {
    if (this.#numbers) return this.#next >= this.#numbers.length;
    return (this.#bits as ColorBitsReader).isEOF();
  }

  #number(): number | null {
    const numbers = this.#numbers as PSValue[];
    if (this.#next >= numbers.length) return null;
    return asNumber(numbers[this.#next++]);
  }

  flag(): number | null {
    if (this.#numbers) return this.#number();
    const bits = this.#bits as ColorBitsReader;
    bits.align();
    return bits.readData(this.#parameters.bitsPerFlag);
  }

  /** The x (axis 0) or y (axis 1) of a point. */
  coordinate(axis: number): number | null {
    if (this.#numbers) return this.#number();
    const { decode, bitsPerCoordinate, maxCoordinate } = this.#parameters;
    const raw = (this.#bits as ColorBitsReader).readData(bitsPerCoordinate);
    if (raw === null) return null;
    return this.#color._valueDecodeDomain(
      raw,
      decode[2 * axis] as number,
      decode[2 * axis + 1] as number,
      maxCoordinate,
    );
  }

  /** The index-th colour component (or the parametric value t). */
  component(index: number): number | null {
    if (this.#numbers) return this.#number();
    const { decode, bitsPerComponent, maxComponent } = this.#parameters;
    const raw = (this.#bits as ColorBitsReader).readData(bitsPerComponent);
    if (raw === null) return null;
    return this.#color._valueDecodeDomain(
      raw,
      decode[4 + 2 * index] as number,
      decode[5 + 2 * index] as number,
      maxComponent,
    );
  }

  /** `count` colour components, or null when the data ran out. */
  colorOf(count: number): number[] | null {
    const components: number[] = [];
    for (let i = 0; i < count; ++i) {
      const value = this.component(i);
      if (value === null) return null;
      components.push(value);
    }
    return components;
  }
}

/**
 * How a mesh's vertex colours become page colours: the components read
 * per vertex, the value of a cell no piece painted, and the conversion of
 * an interpolated cell. With a Function each vertex has one parametric
 * value t, interpolated as a fraction of the function's domain (the
 * interpolation clamps to 0..1) and turned into a colour per cell.
 */
interface MeshColors {
  components: number;
  vertex(values: number[]): number[];
  cell(values: number[]): GColor | null;
}

function meshColors(
  color: PSColor,
  shading: PSPlainRecord,
  spaceName: string,
  toColor: ToColor,
): MeshColors | null {
  const device = spaceName == "DeviceRGB" || spaceName == "DeviceCMYK" || spaceName == "DeviceGray";
  if (!device && spaceName != "Separation" && spaceName != "DeviceN" && spaceName != "CIEBasedABC")
    return null;
  const spaceValue = valueOf(shading.ColorSpace);
  const space = typeof spaceValue == "string" ? [shading.ColorSpace] : (spaceValue as PSValue[]);
  const convert = (values: number[]): GColor | null =>
    device ? toColor(values) : color._getGColor(space, values);
  if (!("Function" in shading))
    return {
      components: device ? channelsOf(spaceName) : color.getColorChannelsCount(space),
      vertex: (values) => values,
      cell: convert,
    };
  const functionObject = shading.Function;
  const functions = color.core.classes.isPSObject(functionObject, "array")
    ? functionObject.value
    : [functionObject];
  const first = valueOf(functions[0]) as PSPlainRecord | undefined;
  if (!first || typeof first != "object" || !("Domain" in first)) return null;
  const domain = valueOf(first.Domain) as number[];
  const start = domain[0] as number;
  const end = domain[1] as number;
  return {
    components: 1,
    vertex: ([t]) => [end == start ? 0 : ((t as number) - start) / (end - start)],
    cell: ([fraction]) => {
      const t = start + (fraction as number) * (end - start);
      const components: number[] = [];
      for (const fn of functions) {
        const result = evaluateFunction(color, fn, t);
        if (!result) return null;
        for (const value of result) components.push(value);
      }
      return convert(components);
    },
  };
}

/** The outputs of a one-input function dict (types 0, 2 and 3) at t, or null. */
function evaluateFunction(color: PSColor, functionObject: PSValue, t: number): number[] | null {
  const dict = valueOf(functionObject) as PSPlainRecord | undefined;
  if (!dict || typeof dict != "object" || !("FunctionType" in dict)) return null;
  const domain = valueOf(dict.Domain) as number[];
  const x = Math.min(Math.max(t, domain[0] as number), domain[1] as number);
  const range = "Range" in dict ? (valueOf(dict.Range) as number[]) : null;
  let result: number[];
  switch (dict.FunctionType) {
    case 0: {
      const sampled = color.PSFunction(functionObject) as SampledFunction | null;
      if (!sampled || sampled.size.length != 1) return null;
      const size = sampled.size[0] as number;
      const outputs = sampled.range.length / 2;
      const encode = sampled.encode ? sampled.encode : [0, size - 1];
      const decode = sampled.decode ? sampled.decode : sampled.range;
      const position = Math.min(
        Math.max(
          color.PSFunctionInterpolate(
            x,
            domain[0] as number,
            domain[1] as number,
            encode[0] as number,
            encode[1] as number,
          ),
          0,
        ),
        size - 1,
      );
      const low = Math.floor(position);
      const high = Math.min(low + 1, size - 1);
      const fraction = position - low;
      const maxSample = Math.pow(2, sampled.bitsPerSample) - 1;
      result = [];
      for (let j = 0; j < outputs; ++j) {
        const a = sampled.samples[low * outputs + j] as number;
        const b = sampled.samples[high * outputs + j] as number;
        result.push(
          color.PSFunctionInterpolate(
            a + fraction * (b - a),
            0,
            maxSample,
            decode[2 * j] as number,
            decode[2 * j + 1] as number,
          ),
        );
      }
      break;
    }
    case 2: {
      const c0 = "C0" in dict ? (valueOf(dict.C0) as number[]) : [0];
      const c1 = "C1" in dict ? (valueOf(dict.C1) as number[]) : [1];
      const power = Math.pow(x, dict.N as number);
      result = c0.map((start, i) => start + power * ((c1[i] as number) - start));
      break;
    }
    case 3: {
      const functions = valueOf(dict.Functions) as PSValue[];
      const bounds = valueOf(dict.Bounds) as number[];
      const encode = valueOf(dict.Encode) as number[];
      let k = 0;
      while (k < bounds.length && x >= (bounds[k] as number)) ++k;
      const low = k == 0 ? (domain[0] as number) : (bounds[k - 1] as number);
      const high = k == bounds.length ? (domain[1] as number) : (bounds[k] as number);
      const inner = evaluateFunction(
        color,
        functions[k],
        color.PSFunctionInterpolate(
          x,
          low,
          high,
          encode[2 * k] as number,
          encode[2 * k + 1] as number,
        ),
      );
      if (!inner) return null;
      result = inner;
      break;
    }
    default:
      return null;
  }
  return range ? color.PSFunctionDomain(result, range) : result;
}

/** A vertex of a triangle mesh. */
interface MeshVertex {
  x: number;
  y: number;
  color: number[];
}

function readVertex(data: MeshData, colors: MeshColors): MeshVertex | null {
  const x = data.coordinate(0);
  if (x === null) return null;
  const y = data.coordinate(1);
  if (y === null) return null;
  const values = data.colorOf(colors.components);
  if (!values) return null;
  return { x, y, color: colors.vertex(values) };
}

function trianglePiece(a: MeshVertex, b: MeshVertex, c: MeshVertex): MeshPiece {
  return { coords: [a.x, a.y, b.x, b.y, c.x, c.y], colors: [a.color, b.color, c.color] };
}

function triangleBox(coords: number[]): number[] {
  const c = coords as unknown as Indexed;
  return [
    Math.min(c[0], c[2], c[4]),
    Math.min(c[1], c[3], c[5]),
    Math.max(c[0], c[2], c[4]),
    Math.max(c[1], c[3], c[5]),
  ];
}

/**
 * Free-form (4) and lattice (5) triangle meshes. A free-form triangle
 * with flag 0 reads three vertices (the flags of the second and third are
 * read and ignored); flags 1 and 2 add a vertex to the previous
 * triangle's vb, vc or vc, va. A lattice joins every row with the next.
 * Data that ends inside a triangle or row ends the mesh.
 */
function triangleMesh(
  color: PSColor,
  shadingType: number,
  shading: PSPlainRecord,
  entries: PSPlainRecord,
  spaceName: string,
  toColor: ToColor,
): GColor {
  const colors = meshColors(color, shading, spaceName, toColor);
  const verticesPerRow = shadingType == 5 ? (shading.VerticesPerRow as number) : 0;
  if (!colors || (shadingType == 5 && !(verticesPerRow >= 2))) {
    color.core.toGravit("error", ["01"]);
    return failedColor();
  }
  const fromArray = MeshData.fromArray(color, shading.DataSource);
  const parameters = meshParameters(shading, fromArray);
  const data = new MeshData(color, shading.DataSource, parameters);
  const pieces: MeshPiece[] = [];
  if (shadingType == 4) {
    let previous: MeshVertex[] | null = null;
    while (!data.isEOF()) {
      const flag = data.flag();
      if (flag === null) break;
      const edge = flag & 3;
      if (edge == 3) {
        color.core.toGravit("error", ["01"]);
        return failedColor();
      }
      // Flags 1 and 2 continue a previous triangle; without one the mesh ends.
      if (edge != 0 && !previous) break;
      const vertex = readVertex(data, colors);
      if (!vertex) break;
      let triangle: MeshVertex[];
      if (edge == 0) {
        if (data.flag() === null) break;
        const second = readVertex(data, colors);
        if (!second) break;
        if (data.flag() === null) break;
        const third = readVertex(data, colors);
        if (!third) break;
        triangle = [vertex, second, third];
      } else {
        const [a, b, c] = previous as [MeshVertex, MeshVertex, MeshVertex];
        triangle = edge == 1 ? [b, c, vertex] : [c, a, vertex];
      }
      pieces.push(trianglePiece(...(triangle as [MeshVertex, MeshVertex, MeshVertex])));
      previous = triangle;
    }
  } else {
    let previousRow: MeshVertex[] | null = null;
    rows: while (!data.isEOF()) {
      const row: MeshVertex[] = [];
      for (let k = 0; k < verticesPerRow; ++k) {
        const vertex = readVertex(data, colors);
        if (!vertex) break rows;
        row.push(vertex);
      }
      if (previousRow) {
        for (let k = 0; k < verticesPerRow - 1; ++k) {
          const above = previousRow as MeshVertex[];
          pieces.push(
            trianglePiece(above[k] as MeshVertex, above[k + 1] as MeshVertex, row[k] as MeshVertex),
          );
          pieces.push(
            trianglePiece(
              above[k + 1] as MeshVertex,
              row[k] as MeshVertex,
              row[k + 1] as MeshVertex,
            ),
          );
        }
      }
      previousRow = row;
    }
  }
  const boxes = pieces.map((piece) => triangleBox(piece.coords));
  return rasterizeMesh(
    color,
    shadingType,
    entries,
    meshBox(parameters, fromArray, pieces),
    colors,
    spaceName,
    pieces,
    boxes,
  );
}

/** Coons (6) and tensor-product (7) patch meshes. */
function patchMesh(
  color: PSColor,
  shadingType: number,
  shading: PSPlainRecord,
  entries: PSPlainRecord,
  spaceName: string,
  toColor: ToColor,
): GColor {
  const colors = meshColors(color, shading, spaceName, toColor);
  if (!colors) {
    color.core.toGravit("error", ["01"]);
    return failedColor();
  }
  const fromArray = MeshData.fromArray(color, shading.DataSource);
  const parameters = meshParameters(shading, fromArray);
  const data = new MeshData(color, shading.DataSource, parameters);
  let flag: number | null;
  let coords: number[] | null = null;
  let previousCoords: number[] | null;
  let patchColors: number[][] | null = null;
  let previousColors: number[][] | null;
  let failed = false;
  const pieces: MeshPiece[] = [];
  const boxes: number[][] = [];
  while (!data.isEOF() && !failed && (flag = data.flag()) !== null) {
    let coordinateCount: number;
    switch ((flag &= 3)) {
      case 0:
        coordinateCount = shadingType == 6 ? 24 : 32;
        break;
      case 1:
      case 2:
      case 3:
        coordinateCount = shadingType == 6 ? 16 : 24;
        break;
      default:
        color.core.toGravit("error", ["01"]);
        return failedColor();
    }
    if (!(flag == 0 || (coords && patchColors))) break;
    previousCoords = flag == 0 ? null : coords;
    coords = [];
    for (let k = 0; k < coordinateCount; ++k) {
      const value = data.coordinate(k % 2);
      if (value === null) {
        failed = true;
        break;
      }
      coords.push(value);
    }
    if (failed) break;
    previousColors = flag == 0 ? null : patchColors;
    patchColors = [];
    const colorCount = flag == 0 ? 4 : 2;
    for (let k = 0; k < colorCount; ++k) {
      const values = data.colorOf(colors.components);
      if (!values) {
        failed = true;
        break;
      }
      patchColors.push(colors.vertex(values));
    }
    if (failed) break;
    const previous = previousCoords as number[];
    const previousC = previousColors as number[][];
    if (flag == 1) {
      coords = previous.slice(6, 14).concat(coords);
      patchColors = previousC.slice(1, 3).concat(patchColors);
    } else if (flag == 2) {
      coords = previous.slice(12, 20).concat(coords);
      patchColors = previousC.slice(2, 4).concat(patchColors);
    } else if (flag == 3) {
      coords = previous.slice(18, 24).concat(previous.slice(0, 2)).concat(coords);
      patchColors = [previousC[3] as number[], previousC[0] as number[]].concat(patchColors);
    }
    pieces.push({ flag, coords, colors: patchColors });
    const c = coords as unknown as Indexed;
    boxes.push([
      Math.min(c[0], c[6], c[18], c[12]),
      Math.min(c[1], c[19], c[7], c[13]),
      Math.max(c[0], c[6], c[18], c[12]),
      Math.max(c[1], c[19], c[7], c[13]),
    ]);
  }
  return rasterizeMesh(
    color,
    shadingType,
    entries,
    meshBox(parameters, fromArray, pieces),
    colors,
    spaceName,
    pieces,
    boxes,
  );
}

/**
 * The shading-space box the mesh is rasterized over, as x0, x1, y0, y1:
 * the Decode ranges of the coordinates, or for array data the bounds of
 * every point.
 */
function meshBox(parameters: MeshParameters, fromArray: boolean, pieces: MeshPiece[]): number[] {
  if (!fromArray) return parameters.decode.slice(0, 4);
  let box = [0, 0, 0, 0];
  let first = true;
  for (const piece of pieces) {
    for (let i = 0; i + 1 < piece.coords.length; i += 2) {
      const x = piece.coords[i] as number;
      const y = piece.coords[i + 1] as number;
      if (first) box = [x, x, y, y];
      else
        box = [
          Math.min(box[0] as number, x),
          Math.max(box[1] as number, x),
          Math.min(box[2] as number, y),
          Math.max(box[3] as number, y),
        ];
      first = false;
    }
  }
  return box;
}

/** Device-space bounds of the axis-aligned box (x0, y0)-(x1, y1) under `ctm`. */
function transformedBounds(
  color: PSColor,
  ctm: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  order: "decode" | "box",
): [number, number, number, number] {
  const corners =
    order == "decode"
      ? [
          color.core.CTM.transform(x0, y0, ctm),
          color.core.CTM.transform(x1, y0, ctm),
          color.core.CTM.transform(x0, y1, ctm),
          color.core.CTM.transform(x1, y1, ctm),
        ]
      : [
          color.core.CTM.transform(x0, y0, ctm),
          color.core.CTM.transform(x0, y1, ctm),
          color.core.CTM.transform(x1, y0, ctm),
          color.core.CTM.transform(x1, y1, ctm),
        ];
  const first = corners[0] as { x: number; y: number };
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  for (let i = 1; i < corners.length; ++i) {
    const { x, y } = corners[i] as { x: number; y: number };
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Rasterizes mesh pieces into a grid of one cell per device unit over the
 * mesh box, fills the cells no piece hit from their neighbours, and
 * returns the grid as an image: in the shading's colour space for the
 * device spaces, otherwise in the RGB or CMYK its colours convert to.
 */
function rasterizeMesh(
  color: PSColor,
  shadingType: number,
  entries: PSPlainRecord,
  box: number[],
  colors: MeshColors,
  spaceName: string,
  pieces: MeshPiece[],
  boxes: number[][],
): GColor {
  const [d0, d1, d2, d3] = box as [number, number, number, number];
  const gstateCTM = (entries.gstate as GraphicsState).CTM;
  const ctm = gstateCTM ? gstateCTM : null;
  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;
  if (ctm) {
    [minX, minY, maxX, maxY] = transformedBounds(color, ctm, d0, d2, d1, d3, "decode");
  } else {
    if (d0 < d1) {
      minX = d0;
      maxX = d1;
    } else {
      minX = d1;
      maxX = d0;
    }
    if (d3 > d2) {
      minY = d2;
      maxY = d3;
    } else {
      minY = d3;
      maxY = d2;
    }
  }
  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);
  if (!width || !height) {
    color.core.toGravit("error", ["01"]);
    return failedColor();
  }
  const blank: number[] = [];
  for (let c = 0; c < colors.components; ++c) blank.push(1);
  const cells: number[][][] = [];
  const painted: number[][] = [];
  for (let row = 0; row < height; ++row) {
    const cellRow: number[][] = [];
    const paintedRow: number[] = [];
    cells[row] = cellRow;
    painted[row] = paintedRow;
    for (let column = 0; column < width; ++column) {
      cellRow[column] = blank.slice();
      paintedRow[column] = 0;
    }
  }
  for (let c = 0; c < boxes.length; ++c) {
    const pieceBox = boxes[c] as [number, number, number, number];
    const piece = pieces[c] as MeshPiece;
    let [left, top, right, bottom] = [pieceBox[0], pieceBox[1], pieceBox[2], pieceBox[3]];
    if (ctm)
      [left, top, right, bottom] = transformedBounds(
        color,
        ctm,
        pieceBox[0],
        pieceBox[1],
        pieceBox[2],
        pieceBox[3],
        "box",
      );
    const pieceWidth = Math.round(right - left);
    const pieceHeight = Math.round(bottom - top);
    if (pieceWidth && pieceHeight) {
      const steps = Math.max(pieceWidth, pieceHeight);
      const step = 1 / steps;
      const uv = [0, 0];
      const point = [0, 0];
      for (let j = 0; j <= steps; ++j) {
        for (let k = 0; k <= steps; ++k) {
          uv[0] = k * step;
          uv[1] = j * step;
          let cellColor: number[];
          if (shadingType == 4 || shadingType == 5) {
            cellColor = color._getTriangularPoint(uv, piece.coords, point, piece.colors);
          } else if (shadingType == 6) {
            color._getCoonsPoint(uv, piece.coords, point);
            cellColor = [];
          } else {
            color._getTenzorPoint(uv, piece.coords, point);
            cellColor = [];
          }
          const [px, py] = point as [number, number];
          let column: number;
          let row: number;
          if (ctm) {
            column = ((px - d0) / (d1 - d0)) * width - 0.5;
            row = ((py - d2) / (d3 - d2)) * height - 0.5;
          } else {
            row = py - d2 - 0.5;
            column = px - d0 - 0.5;
          }
          const r = Math.max(Math.min(Math.round(row), height - 1), 0);
          const cIndex = Math.max(Math.min(Math.round(column), width - 1), 0);
          if (shadingType == 6) cellColor = color._interpolateColorBilinearCoons(uv, piece.colors);
          else if (shadingType == 7)
            cellColor = color._interpolateColorBilinearTenzor(uv, piece.colors);
          (cells[r] as number[][])[cIndex] = cellColor;
          (painted[r] as number[])[cIndex] = 1;
        }
      }
    }
  }
  const device = spaceName == "DeviceRGB" || spaceName == "DeviceCMYK" || spaceName == "DeviceGray";
  let colorSpace = spaceName;
  let channels = device ? channelsOf(spaceName) : 0;
  const pixels: number[] = [];
  for (let row = 0; row < height; ++row) {
    for (let column = 0; column < width; ++column) {
      const cell = (painted[row] as number[])[column]
        ? ((cells[row] as number[][])[column] as number[])
        : color._getApproximatedColor(row, column, cells, painted);
      const pixel = colors.cell(cell);
      if (!pixel || (pixel.type != "rgb" && pixel.type != "cmyk")) {
        color.core.toGravit("error", ["01"]);
        return failedColor();
      }
      if (!channels) {
        colorSpace = pixel.type == "cmyk" ? "DeviceCMYK" : "DeviceRGB";
        channels = pixel.type == "cmyk" ? 4 : 3;
      }
      for (let c = 0; c < channels; ++c) pixels.push((pixel.value as number[])[c] as number);
    }
  }
  const result: ImageDataGColor = {
    type: "imageData",
    value: pixels,
    colorSpace,
    meshType: shadingType,
    width,
    height,
    transform: color.core.CTM.multiply(
      [(d1 - d0) / width, 0, 0, (d3 - d2) / height, d0, d2],
      (entries.gstate as GraphicsState).CTM,
    ),
  };
  return result;
}
