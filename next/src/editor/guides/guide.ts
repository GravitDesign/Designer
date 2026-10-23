// Old: chunk.vendor.js module 99 (GGuide).
import type { Color } from "../../engine/color/color.ts";
import { Platform } from "../../engine/core/platform.ts";
import {
  GObject,
  defineMixin,
  registerClass,
  type AnyConstructor,
} from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import { Rect, type RectSide } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { DirtyMatcher } from "../../engine/paint/dirty-list.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Guides } from "./guides.ts";

/** A snap target point drawn with a handle marker (points guide). */
export interface GuideMarker {
  pt: Point;
  annot: string;
  size: number;
}

/** A point of a guide line: a plain point or one with a marker. */
export type GuidePoint = Point | GuideMarker;

/** A distance value shown on a guide line (bbox guide). */
export interface GuideValueSegment {
  bounds: number[];
  value?: number;
  valuePt?: Point;
  valueDir?: number;
}

/**
 * A guide line as the guides hand it back: the line, its orientation, the
 * ranges of the boxes it touches and, once finishMap has run, the parts
 * drawn plain (freeSegments) and with a distance value (valueSegments).
 */
export interface GuideLine {
  line: GuidePoint[];
  orient?: number;
  bounds?: number[][];
  srcBounds?: number[];
  freeSegments?: number[][];
  freeSegmentsColor?: Color | null;
  valueSegments?: GuideValueSegment[];
}

/**
 * What a guide reports for one axis of a hit: either a GuideLine, a pair
 * of points or a single point (drawn as a line from the snapped point).
 */
export type GuideShape = GuideLine | GuidePoint[] | Point;

/** One axis of a guide hit. */
export interface GuideAxisHit {
  value: number;
  guide?: GuideShape | null;
  delta?: number | null;
  page?: Page | null;
}

/** What Map.map returns; null when nothing snapped. */
export interface GuideMapResult {
  x: GuideAxisHit | null;
  y: GuideAxisHit | null;
}

/** The editor paint configuration flags the guides read. */
export interface GuidePaintConfiguration {
  multiPageView: boolean;
  gridVisible?: boolean;
  guideLinesVisible?: boolean;
  pageLabelsVisible?: boolean;
  symbolLabelsVisible?: boolean;
}

/** A paint context while the editor paints its overlays. */
export type GuidePaintContext = PaintContext & {
  configuration: GuidePaintConfiguration;
  canvas: PaintCanvas;
  dirtyMatcher: DirtyMatcher;
};

/** The paint context with the parts that are always set while guides paint. */
export function guidePaintContext(context: PaintContext): GuidePaintContext {
  return context as GuidePaintContext;
}

/** The part of GGuides a guide uses. */
export interface GuidesHost {
  _scene: Scene;
  isMultiPageEnabled(): boolean;
}

/** GGuide.DetailMap.Mode. */
export const DetailMapMode = {
  DetailOnFilterOn: 1,
  DetailOffFilterOn: 2,
  FilterOff: 3,
} as const;

/**
 * The base of all guides: exclusions, the snap zones a guide may snap
 * (top-left, center and bottom-right by default) and scope support.
 */
export class Guide extends GObject {
  static {
    registerClass(this, "GGuide");
  }

  declare static Visual: typeof GuideVisual;
  declare static Map: typeof GuideMap;
  declare static DetailMap: typeof GuideDetailMap & { Mode: typeof DetailMapMode };

  _guides: GuidesHost;
  _scene: Scene;
  _exclusions: Node[] | null = null;
  _allowedZones: RectSide[];

  constructor(guides: GuidesHost) {
    super();
    this._guides = guides;
    this._scene = guides._scene;
    this._allowedZones = [Rect.Side.TOP_LEFT, Rect.Side.CENTER, Rect.Side.BOTTOM_RIGHT];
  }

  getId(): string {
    throw new Error("Not Implemented.");
  }

  isVisual(): boolean {
    return this.hasMixin(GuideVisual);
  }

  isRelativeToPage(): boolean {
    return false;
  }

  useExclusions(exclusions: Node[] | null | undefined): void {
    this._exclusions = exclusions ?? null;
  }

  cleanExclusions(): void {
    this._exclusions = null;
  }

  isScopeSupported(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden by scoped guides
  setScope(scope: Node[] | null): void {}

  getAllowedSnapZones(): RectSide[] {
    return this._allowedZones;
  }

  allowSnapZone(zone: RectSide): void {
    if (-1 === this._allowedZones.indexOf(zone)) this._allowedZones.push(zone);
  }

  disallowSnapZone(zone: RectSide): void {
    const index = this._allowedZones.indexOf(zone);
    if (index >= 0) this._allowedZones.splice(index, 1);
  }

  snapZoneIsAllowed(zone: RectSide | string): boolean {
    return this._allowedZones.indexOf(zone as RectSide) > -1;
  }

  isFullPixelsGuide(): boolean {
    return false;
  }

  canMapWithFullPixelsGuide(): boolean {
    return true;
  }
}

/** GGuide.Visual: a guide that paints. */
export const GuideVisual = defineMixin(
  "GGuide.Visual",
  <TBase extends AnyConstructor<Guide>>(Base: TBase) => {
    abstract class VisualGuide extends Base {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden by every visual guide
      paint(transform: Transform, context: PaintContext): void {}
    }
    return VisualGuide;
  },
);

/** GGuide.DetailMap: a guide that also maps in detail mode. */
export const GuideDetailMap = defineMixin(
  "GGuide.DetailMap",
  <TBase extends AnyConstructor<Guide>>(Base: TBase) => {
    abstract class DetailMapGuide extends Base {}
    return DetailMapGuide;
  },
);

/** GGuide.Map: a guide that snaps. */
export const GuideMap = defineMixin(
  "GGuide.Map",
  <TBase extends AnyConstructor<Guide>>(Base: TBase) => {
    abstract class MapGuide extends Base {
      /**
       * Snaps (x, y). `useMargin` widens the lines drawn (bbox guide),
       * `distance` is the snap distance in screen units and `zoom` the
       * logical zoom it is divided by; `pageRelative` says the point is
       * already relative to the page.
       */
      map(
        /* eslint-disable @typescript-eslint/no-unused-vars -- the old signature */
        x: number,
        y: number,
        useMargin?: boolean,
        distance?: number,
        zoom?: number | null,
        pageRelative?: boolean,
        /* eslint-enable @typescript-eslint/no-unused-vars */
      ): GuideMapResult | null | undefined {
        return undefined;
      }

      /**
       * Whether the guide maps in the given detail mode. Cmd/Ctrl held
       * inverts snapping: it turns mapping off while snapping is on and on
       * while it is off.
       */
      isMappingAllowed(mode?: number | null): boolean {
        let allowed = true;
        if (mode === DetailMapMode.DetailOnFilterOn) allowed = this.hasMixin(GuideDetailMap);
        else if (mode === DetailMapMode.DetailOffFilterOn) allowed = false;
        if (allowed) {
          if (!Guides.options.disabled && Platform.modifiers.metaKey) allowed = false;
          if (Guides.options.disabled && !Platform.modifiers.metaKey) allowed = false;
        }
        return allowed;
      }

      mapTopLeftOnly(): boolean {
        return (
          1 === this._allowedZones.length && 0 === this._allowedZones.indexOf(Rect.Side.TOP_LEFT)
        );
      }
    }
    return MapGuide;
  },
);

Guide.Visual = GuideVisual;
Guide.Map = GuideMap;
Guide.DetailMap = Object.assign(GuideDetailMap, { Mode: DetailMapMode });

/** A guide with the Map mixin. */
export type MapGuide = Guide & {
  map(
    x: number,
    y: number,
    useMargin?: boolean,
    distance?: number,
    zoom?: number | null,
    pageRelative?: boolean,
  ): GuideMapResult | null | undefined;
  isMappingAllowed(mode?: number | null): boolean;
  mapTopLeftOnly(): boolean;
};

/** A guide with the Visual mixin. */
export type VisualGuide = Guide & {
  paint(transform: Transform, context: PaintContext): void;
};
