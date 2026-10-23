// Old: chunk.vendor.js module 28 (GStylable: the constants and property sets).
/**
 * The GStylable constants and default tables, in their own file so the
 * paint layer and effect classes can use them without importing
 * stylable.ts, which imports them (and attaches them as statics).
 *
 * The default tables are file format: only values that differ from them
 * are saved.
 */
import { LocaleKey } from "../core/locale/locale-key.ts";
import { getRegisteredClass, hasMixin } from "../core/object.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import { Font } from "../text/fonts/font.ts";
import type { SceneHooks } from "../scene/scene-node.ts";
import type { Dictionary } from "./dictionary.ts";
import { Pattern } from "./pattern.ts";

/** The style layers effects can target (`ly`); null is the whole element. */
export const StyleLayer = {
  Fill: "F",
  Border: "B",
} as const;

export const StyleLayerName: Record<string, LocaleKey> = {
  "": new LocaleKey("GStylable", "layer.element"),
  F: new LocaleKey("GStylable", "layer.fill"),
  B: new LocaleKey("GStylable", "layer.border"),
};

export const BorderAlignment = {
  Center: "C",
  Outside: "O",
  Inside: "I",
} as const;

export const BorderMarker = {
  Circle: "C",
  Bullet: "B",
  Diamond: "D",
  Line: "L",
  LineDouble: "LD",
  Arrow: "A",
  ArrowFat: "AF",
  ArrowLine: "AL",
  ArrowDoubleLine: "ADL",
  ArrowLineBar: "ALB",
  ArrowPointer: "AP",
} as const;

export const ParagraphAlignment = {
  Left: "l",
  Center: "c",
  Right: "r",
  Justify: "j",
} as const;

export const TypographyScript = {
  Subscript: "sub",
  Superscript: "super",
} as const;

export const TextTransformation = {
  Uppercase: "u",
  Lowercase: "l",
  Capitalize: "c",
  SmallCaps: "s",
} as const;

export const PropertySet = {
  Style: "S",
  Effects: "E",
  Text: "T",
  Paragraph: "P",
  FillPaintLayers: "FL",
  BorderPaintLayers: "BL",
} as const;

export type PropertySetId = (typeof PropertySet)[keyof typeof PropertySet];

/** The defaults of one property set and how its values are saved. */
export interface PropertySetDescription {
  visualProperties?: Record<string, unknown>;
  geometryProperties?: Record<string, unknown>;
  storeFilter?: (name: string, value: unknown) => unknown;
  restoreFilter?: (name: string, value: unknown) => unknown;
}

export const PropertySetInfo: Record<string, PropertySetDescription> = {
  S: {
    visualProperties: {
      _sdf: null,
      _sbl: PaintCanvas.BlendMode.Normal,
      _sfop: 1,
      _stop: 1,
    },
  },
  E: {},
  FL: {},
  BL: {},
  T: {
    geometryProperties: {
      _tff: null,
      _tfi: 20,
      _tfw: Font.Weight.Regular,
      _tfs: Font.Style.Normal,
      _tcs: null,
      _tws: null,
      _ttrf: null,
      _ttsc: null,
      _tlsc: null,
      _tv: null,
      _tdu: false,
      _tds: false,
      _tlig: "auto",
      _tfrac: false,
      _tstyls: null,
      _tlocl: null,
    },
    visualProperties: {
      _fc: null,
    },
    storeFilter(name, value) {
      return value && "_fc" === name ? Pattern.serialize(value as Pattern) : value;
    },
    restoreFilter(name, value) {
      if (value) {
        if ("_fc" === name) return Pattern.deserialize(value as string);
        if ("_tff" === name) return Font.getFontFamilyCorrected(value as string);
      }
      return value;
    },
  },
  P: {
    geometryProperties: {
      _pal: null,
      _plh: 1,
      _pas: "0",
      _pai: 0,
    },
  },
};

/** Every visual property of every set, for change handling. */
export const AllVisualProperties: Record<string, unknown> = {};
/** Every geometry property of every set. */
export const AllGeometryProperties: Record<string, unknown> = {};

for (const id in PropertySetInfo) {
  const info = PropertySetInfo[id] as PropertySetDescription;
  if (info.visualProperties) {
    for (const name in info.visualProperties) {
      AllVisualProperties[name] = info.visualProperties[name];
    }
  }
  if (info.geometryProperties) {
    for (const name in info.geometryProperties) {
      AllGeometryProperties[name] = info.geometryProperties[name];
    }
  }
}

/**
 * Whether a node mixes in GStylable. The mixin is looked up by its old
 * name, so the paint layer and effect files don't import stylable.ts
 * (which imports them).
 */
export function isStylable(node: unknown): boolean {
  return hasMixin(node, getRegisteredClass("GStylable"));
}

/** What the style code needs from the scene a styled node is in (GScene). */
export interface StyleScene {
  getDictionary(): Dictionary;
  getWorkspace(): {
    resolveUrl(url: string, callback: (resolved: string) => void, scene: unknown): void;
  };
  addDestroyable(destroyable: unknown): void;
  addDestroyableIfAbsent(destroyable: unknown): void;
  destroy(destroyables: unknown[]): void;
  link(reference: unknown, node: unknown): void;
  unlink(reference: unknown, node: unknown): void;
  visitLinks(reference: unknown, visitor: (node: never) => void): void;
}

/**
 * Whether a value had the old destroyable mixin (chunk.vendor.js module
 * 118). The paint code made it an interface; only classes that mixed it in
 * have a `destroy` method among patterns and effects.
 */
export function isDestroyable(value: unknown): value is { destroy(): void } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { destroy?: unknown }).destroy === "function"
  );
}

/** The stylable node that owns paint layers and effects, as they call it. */
export interface StyleOwner {
  _styleRepaint(source?: unknown): void;
  _stylePrepareGeometryChange(source?: unknown): void;
  _styleFinishGeometryChange(source?: unknown): void;
  getScene?(): StyleSceneHooks | null;
  hasMixin(mixin: unknown): boolean;
  _layId?: string | null;
  _effId?: string | null;
}

/** The scene as both the scene nodes and the style code see it. */
export type StyleSceneHooks = SceneHooks & StyleScene;
