// Old: chunk.vendor.js module 133 (GScenePaintConfiguration).
import { LocaleKey } from "../core/locale/locale-key.ts";
import { registerClass } from "../core/object.ts";
import { PaintConfiguration } from "./paint-configuration.ts";

/** What the elements a configuration is asked about need to answer. */
interface OutlineSource {
  isOutline(): boolean;
}

interface PropertySource {
  getProperty(name: string): unknown;
}

const PaintMode = {
  Full: "F",
  Fast: "S",
  Outline: "L",
  Output: "O",
} as const;

export type PaintModeValue = (typeof PaintMode)[keyof typeof PaintMode];

/**
 * How a scene is painted: paint mode, which annotations show, effect and
 * WebGL switches, thumbnails. The defaults live on the prototype, as in the
 * old code, so a configuration has no own properties until one is set.
 */
export class ScenePaintConfiguration extends PaintConfiguration {
  static {
    registerClass(this, "GScenePaintConfiguration");
  }

  static PaintMode = PaintMode;

  static PaintModeName: Record<PaintModeValue, LocaleKey> = {
    F: new LocaleKey("GScenePaintConfiguration", "paint.full"),
    S: new LocaleKey("GScenePaintConfiguration", "paint.fast"),
    L: new LocaleKey("GScenePaintConfiguration", "paint.outline"),
    O: new LocaleKey("GScenePaintConfiguration", "paint.output"),
  };

  declare watermark: unknown;
  declare paintMode: string;
  declare pixelMode: boolean;
  declare clipToPage: boolean;
  declare guides: boolean;
  declare slices: boolean;
  declare annotations: boolean;
  declare elementAnnotations: boolean;
  declare showResolvedAnnotations: boolean;
  declare clipArea: unknown;
  declare ignoreEffects: boolean;
  declare noWebGL: boolean;
  declare forceEffectsWhenZoomed: boolean;
  declare enableFxCache: boolean;
  declare clipDirty: boolean;
  declare defaultEffectDetailLevel: number | null;
  declare sceneBackground: boolean;
  declare multiPageView: boolean;
  declare ignoreRulerOffsets: boolean;
  declare rulerLeftFill: boolean;
  declare thumbnails: boolean;
  declare thumbnailSize: number;
  declare pageThumbnails: boolean;
  declare pageThumbnailSize: number;
  declare paintSharp: boolean;

  isOutline(element?: OutlineSource | null): boolean {
    return this.paintMode === PaintMode.Outline || !(!element || !element.isOutline());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isAnnotationsVisible(element?: unknown): boolean {
    return !!this.annotations;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isGuidesVisible(element?: unknown): boolean {
    return !(!this.guides || !this.isAnnotationsVisible());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isSlicesVisible(element?: unknown): boolean {
    return !(!this.slices || !this.isAnnotationsVisible());
  }

  isElementAnnotationsVisible(element?: PropertySource | null): boolean {
    if (!this.elementAnnotations || !this.isAnnotationsVisible()) return false;
    if (element) {
      if (element.getProperty("rmd")) return false;
      if (!this.showResolvedAnnotations && element.getProperty("rsv")) return false;
    }
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isClipToPage(element?: unknown): boolean {
    return this.clipToPage || this.paintMode === PaintMode.Output;
  }

  override toString(): string {
    return "[Object GScenePaintConfiguration]";
  }
}

Object.assign(ScenePaintConfiguration.prototype, {
  watermark: null,
  paintMode: PaintMode.Full,
  pixelMode: false,
  clipToPage: false,
  guides: true,
  slices: true,
  annotations: true,
  elementAnnotations: false,
  showResolvedAnnotations: false,
  clipArea: null,
  ignoreEffects: false,
  noWebGL: false,
  forceEffectsWhenZoomed: false,
  enableFxCache: true,
  clipDirty: true,
  defaultEffectDetailLevel: null,
  sceneBackground: true,
  multiPageView: false,
  ignoreRulerOffsets: false,
  rulerLeftFill: false,
  thumbnails: true,
  thumbnailSize: 85,
  pageThumbnails: false,
  pageThumbnailSize: 85,
  paintSharp: true,
});
