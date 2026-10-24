/**
 * The parts of a Sketch 49 document (pages/*.json, meta.json) the importer
 * reads. Everything comes from JSON, so every field is optional and may
 * hold anything; the importer used the values as they came.
 */

/** `{ x, y, width, height }` of a layer's `frame`. */
export interface SketchRectData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A colour as Sketch stores it: channels 0..1. */
export interface SketchColorData {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface SketchGradientStopData {
  position: number;
  color: SketchColorData;
}

export interface SketchGradientData {
  /** 0 linear, 1 radial, 2 angular. */
  gradientType: number;
  /** "{x, y}" in 0..1 of the frame. */
  from: string;
  to: string;
  elipseLength?: number;
  stops: SketchGradientStopData[];
}

export interface SketchContextSettingsData {
  blendMode?: number;
  opacity?: number;
}

/** A reference to another file in the zip ("images/<hash>"). */
export interface SketchFileReferenceData {
  _class?: string;
  _ref_class?: string;
  _ref: string;
}

/** A fill or a border; borders add `thickness` and `position`. */
export interface SketchFillData {
  isEnabled?: boolean;
  /** 0 colour, 1 gradient, 4 image, 5 noise. */
  fillType?: number;
  color?: SketchColorData;
  gradient?: SketchGradientData;
  contextSettings?: SketchContextSettingsData;
  image?: SketchFileReferenceData;
  patternFillType?: number;
  patternTileScale?: number;
  noiseIndex?: number;
  thickness?: number;
  position?: number;
}

export interface SketchBlurData {
  isEnabled?: boolean;
  type?: number;
  radius: number;
  center: string;
}

export interface SketchShadowData {
  isEnabled?: boolean;
  blurRadius: number;
  offsetX: number;
  offsetY: number;
  color: SketchColorData;
}

export interface SketchColorControlsData {
  isEnabled?: boolean;
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
}

/** An archived NSObject: base64 of a binary plist. */
export interface SketchArchiveData {
  _archive: unknown;
}

export interface SketchStyleData {
  borders?: SketchFillData[];
  fills?: SketchFillData[];
  miterLimit?: number;
  position?: number;
  contextSettings?: SketchContextSettingsData;
  colorControls?: SketchColorControlsData;
  blur?: SketchBlurData;
  innerShadows?: SketchShadowData[];
  shadows?: SketchShadowData[];
  textStyle?: { encodedAttributes?: Record<string, SketchArchiveData | undefined> };
}

export interface SketchCurvePointData {
  cornerRadius?: number;
  curveMode?: number;
  curveFrom: string;
  curveTo: string;
  hasCurveFrom?: boolean;
  hasCurveTo?: boolean;
  point: string;
}

export interface SketchPathData {
  isClosed?: boolean;
  points: SketchCurvePointData[];
}

/**
 * Symbol overrides: a text (string), an image (file reference) or nested
 * overrides (object) per object id; old files nest them under "0", "1".
 */
export type SketchOverridesData = Record<string, unknown>;

/** A layer (page, artboard, group, shape, text, symbol, ...). */
export interface SketchLayerData {
  _class?: string;
  do_objectID?: string;
  symbolID?: string;
  name?: string;
  frame?: SketchRectData;
  isVisible?: boolean;
  isLocked?: boolean;
  rotation?: number;
  isFlippedHorizontal?: boolean;
  isFlippedVertical?: boolean;
  resizingConstraint?: number;
  resizingType?: number;
  windingRule?: number;
  booleanOperation?: number;
  hasClippingMask?: boolean;
  hasBackgroundColor?: boolean;
  backgroundColor?: SketchColorData;
  style?: SketchStyleData;
  layers?: SketchLayerData[];
  path?: SketchPathData;
  fixedRadius?: number;
  image?: SketchFileReferenceData;
  overrides?: SketchOverridesData;
  attributedString?: { archivedAttributedString?: SketchArchiveData };
  textBehaviour?: number;
  /** Set by the importer: the layer this one is in. */
  parent?: SketchLayerData;
  /** Set by the importer: skip the element's own frame transform. */
  noTransform?: boolean;
  [key: string]: unknown;
}

/** meta.json. */
export interface SketchMetaData {
  appVersion?: unknown;
  [key: string]: unknown;
}
