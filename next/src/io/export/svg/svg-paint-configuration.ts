// Old: chunk.vendor.js module 1457 (the SVG exporter's paint configuration).
import { registerClass } from "../../../engine/core/object.ts";
import { ScenePaintConfiguration } from "../../../engine/paint/scene-paint-configuration.ts";

/**
 * Paints everything in full, as one multi-page view, without effects
 * (the exporter writes them as filters) and without thumbnails.
 * Annotations show when the export options ask for them.
 */
export class SvgPaintConfiguration extends ScenePaintConfiguration {
  static {
    registerClass(this, "GSVGPaintConfiguration");
  }

  constructor() {
    super();
    this.paintMode = ScenePaintConfiguration.PaintMode.Full;
    this.multiPageView = true;
    this.ignoreEffects = true;
    this.thumbnails = false;
  }

  override isOutline(): boolean {
    return false;
  }

  override isAnnotationsVisible(): boolean {
    return !!this.annotations;
  }

  override isElementAnnotationsVisible(): boolean {
    return !!this.annotations;
  }

  override isClipToPage(): boolean {
    return false;
  }
}
