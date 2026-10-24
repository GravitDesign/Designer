// Old: chunk.vendor.js module 925 (the list marker codes: bullets, numbers, roman numerals).
import { Vertex } from "../../geometry/vertex.ts";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import { PathNumberCode, type MarkerData } from "./path-number.ts";
import { VertexSourceCode } from "./vertex-source-part.ts";

/** Close vertices were added without coordinates. */
const NO_COORDINATE = undefined as unknown as number;

const { Move, Line, Curve2, Close } = Vertex.Command;

/** Builds a shape from [command, x, y] triples; a lone command has no coordinates. */
function shape(...vertices: number[][]): VertexContainer {
  const container = new VertexContainer();
  for (const [command, x, y] of vertices) {
    container.addVertex(
      command as number,
      x === undefined ? NO_COORDINATE : x,
      y === undefined ? NO_COORDINATE : y,
    );
  }
  return container;
}

const SQUARE: number[][] = [[Move, -1, -2], [Line, 1, -2], [Line, 1, 0], [Line, -1, 0], [Close]];

const CIRCLE: number[][] = [
  [Move, -1, -1],
  [Curve2, 0, -2],
  [Curve2, -1, -1.551915024494],
  [Curve2, -0.551915024494, -2],
  [Curve2, 1, -1],
  [Curve2, 0.551915024494, -2],
  [Curve2, 1, -1.551915024494],
  [Curve2, 0, 0],
  [Curve2, 1, -0.448084975506],
  [Curve2, 0.551915024494, 0],
  [Curve2, -1, -1],
  [Curve2, -0.551915024494, 0],
  [Curve2, -1, -0.448084975506],
  [Close],
];

const DIAMOND: number[][] = [[Move, -1, -1], [Line, 0, -2], [Line, 1, -1], [Line, 0, 0], [Close]];

const RIGHT_POINTING: number[][] = [
  [Move, -1, -2],
  [Line, 1, -0.84529946162075],
  [Line, -1, 0.3094010767585],
  [Close],
];

/** The marker shapes, 2 units high with the baseline at y = 0. */
export const MarkerShapes: Record<string, VertexContainer> = {
  SquareFilled: shape(...SQUARE),
  SquareOutlined: shape(
    ...SQUARE,
    [Move, -0.8, -1.8],
    [Line, -0.8, -0.2],
    [Line, 0.8, -0.2],
    [Line, 0.8, -1.8],
    [Close],
  ),
  CircleFilled: shape(...CIRCLE),
  CircleOutlined: shape(
    ...CIRCLE,
    [Move, -0.8, -1],
    [Curve2, 0, -0.2],
    [Curve2, -0.8, -0.5584679804048],
    [Curve2, -0.4415320195952, -0.2],
    [Curve2, 0.8, -1],
    [Curve2, 0.4415320195952, -0.2],
    [Curve2, 0.8, -0.5584679804048],
    [Curve2, 0, -1.8],
    [Curve2, 0.8, -1.4415320195952],
    [Curve2, 0.4415320195952, -1.8],
    [Curve2, -0.8, -1],
    [Curve2, -0.4415320195952, -1.8],
    [Curve2, -0.8, -1.4415320195952],
    [Close],
  ),
  Check: shape(
    [Move, -0.22766122766122898, 0.30380730380730236],
    [Curve2, -0.44470344470344614, -0.0712250712250726],
    [Curve2, -0.3216783216783231, 0.1339031339031327],
    [Curve2, -0.39393939393939537, 0.008806008806007348],
    [Line, -0.5249935249935265, -0.19709919709919865],
    [Line, -0.5858585858585875, -0.28956228956229135],
    [Curve2, -1.0000000000000018, -0.8010878010878031],
    [Curve2, -0.7182077182077199, -0.4959854959854979],
    [Curve2, -0.8565138565138584, -0.6664076664076686],
    [Curve2, -0.7710437710437728, -0.9026159026159049],
    [Curve2, -0.91815591815592, -0.8689458689458711],
    [Curve2, -0.8417508417508435, -0.9026159026159049],
    [Curve2, -0.5387205387205404, -0.8070448070448093],
    [Curve2, -0.6840196840196857, -0.9026159026159049],
    [Curve2, -0.6065786065786081, -0.8707588707588729],
    [Curve2, -0.28231028231028366, -0.44289044289044477],
    [Curve2, -0.47086247086247246, -0.7433307433307454],
    [Curve2, -0.38539238539238685, -0.621859621859624],
    [Curve2, 0.16550116550116445, -1.5281015281015309],
    [Curve2, -0.16498316498316634, -0.8243978243978265],
    [Curve2, -0.01579901579901688, -1.1859621859621883],
    [Curve2, 0.4333074333074325, -1.9036519036519066],
    [Curve2, 0.26547526547526457, -1.714063714063717],
    [Curve2, 0.35483035483035397, -1.8394198394198424],
    [Curve2, 0.7451437451437444, -2.000000000000003],
    [Curve2, 0.511784511784511, -1.9678839678839708],
    [Curve2, 0.6156436156436149, -2.000000000000003],
    [Curve2, 0.9999999999999996, -1.9681429681429712],
    [Curve2, 0.8140378140378135, -2.000000000000003],
    [Curve2, 0.8989898989898988, -1.9893809893809924],
    [Curve2, 0.37632737632737556, -1.2214452214452238],
    [Curve2, 0.7399637399637393, -1.7586117586117616],
    [Curve2, 0.5322455322455313, -1.5097125097125124],
    [Curve2, -0.22766122766122898, 0.30380730380730236],
    [Curve2, 0.22066822066821978, -0.9331779331779355],
    [Curve2, 0.0191660191660179, -0.42476042476042664],
    [Close, 0, 0],
  ),
  DiamondFilled: shape(...DIAMOND),
  DiamondOutlined: shape(
    ...DIAMOND,
    [Move, -0.717157287525381, -1],
    [Line, 0, -0.282842712474619],
    [Line, 0.717157287525381, -1],
    [Line, 0, -1.717157287525381],
    [Close],
  ),
  RightPointingFilled: shape(...RIGHT_POINTING),
  RightPointingOutlined: shape(
    ...RIGHT_POINTING,
    [Move, -0.8, -1.6535898384862],
    [Line, -0.8, -0.0370090847553],
    [Line, 0.6, -0.84529946162075],
    [Close],
  ),
};

/** A bullet marker: the shape for the item's depth, cycling through three. */
class ShapeMarker extends VertexSourceCode {
  constructor(data: MarkerData, shapes: { $: string }[]) {
    const pick = shapes[data.node.getDepth() % shapes.length] as { $: string };
    super(MarkerShapes[pick.$] as VertexContainer);
  }
}

/** Filled circle, outlined circle, filled square. */
export class BulletCode extends ShapeMarker {
  constructor(_obj: unknown, data: MarkerData) {
    super(data, [{ $: "CircleFilled" }, { $: "CircleOutlined" }, { $: "SquareFilled" }]);
  }
}

/** Check mark, filled diamond, outlined diamond. */
export class CheckCode extends ShapeMarker {
  constructor(_obj: unknown, data: MarkerData) {
    super(data, [{ $: "Check" }, { $: "DiamondFilled" }, { $: "DiamondOutlined" }]);
  }
}

/** Outlined square, filled and outlined right-pointing triangles. */
export class SquareCode extends ShapeMarker {
  constructor(_obj: unknown, data: MarkerData) {
    super(data, [
      { $: "SquareOutlined" },
      { $: "RightPointingFilled" },
      { $: "RightPointingOutlined" },
    ]);
  }
}

/** "1.2.3": the item's path, one-based, joined with dots. */
export class NumberCode extends PathNumberCode {
  constructor(obj: unknown, data: MarkerData) {
    super(obj, data, (path) => path.map((index) => index + 1).join("."));
  }
}

const ROMAN_VALUES = [1e3, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
const ROMAN_DIGITS = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];

/**
 * The last index of the path, by its depth in the path: depth 0, 3, ...
 * as a number, 1, 4, ... as letters (a to y, repeated past y: the old code
 * divides by 25), 2, 5, ... as lower-case roman numerals; then `suffix`.
 */
function romanListNumber(path: number[], suffix: string): string {
  const depth = path.length - 1;
  const index = path[depth] as number;
  let text = String(index + 1);
  const kind = depth % 3;
  if (1 === kind) {
    const a = "a".charCodeAt(0);
    const span = "z".charCodeAt(0) - a;
    const letter = String.fromCharCode((index % span) + a);
    let repeats = Math.floor(index / span);
    for (text = letter; repeats-- > 0;) text += letter;
  } else if (2 === kind) {
    text = "";
    let rest = index + 1;
    // The loop runs one past the table; that step compares with NaN and does nothing.
    for (let i = 0; i <= ROMAN_VALUES.length; i++) {
      while (rest % (ROMAN_VALUES[i] as number) < rest) {
        text += (ROMAN_DIGITS[i] as string).toLowerCase();
        rest -= ROMAN_VALUES[i] as number;
      }
    }
  }
  return text + suffix;
}

/** Numbers, letters and roman numerals by depth, with a suffix. */
class RomanCode extends PathNumberCode {
  constructor(obj: unknown, data: MarkerData, suffix: string) {
    super(obj, data, (path) => romanListNumber(path, suffix));
  }
}

/** "1.", "a.", "i." by depth. */
export class RomanDotCode extends RomanCode {
  constructor(obj: unknown, data: MarkerData) {
    super(obj, data, ".");
  }
}

/** "1)", "a)", "i)" by depth. */
export class RomanBracketCode extends RomanCode {
  constructor(obj: unknown, data: MarkerData) {
    super(obj, data, ")");
  }
}
