// Old: chunk.vendor.js module 51 (GWebGLEffect).
//
// The base of the WebGL filter effects. `shp` holds the shader parameters
// (one object, saved as JSON) and `sh` the shader name ("GGLBlurShader"),
// which getShaderClass resolves through the shader table in shaders/index.ts
// (the old code used a webpack context for that).
import { getTypeId } from "../../core/object.ts";
import type { Rect } from "../../math/rect.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { RendererConfig } from "../../paint/renderer-config.ts";
import { WebGLRenderer, type ShaderClass } from "../../paint/webgl/webgl-renderer.ts";
import { Node, registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import { requireShader } from "./shaders/index.ts";

/** A [min, max] range of an effect parameter (what the inspector sliders use). */
export type ParameterRange = [number, number];

/** What the effects inspector reads from an effect class. */
interface WebGLEffectClassTables {
  GeometryProperties: Record<string, unknown>;
}

const GeometryProperties = {
  shp: null,
  sh: null,
};

export class WebGLEffect extends WebGLRenderer(Effect) {
  static {
    registerNodeClass(this, "GWebGLEffect", "GWebGLEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  /** Same class and the same values for every property of the class's GeometryProperties. */
  static equals(a: unknown, b: unknown): boolean {
    if (a instanceof WebGLEffect && b instanceof WebGLEffect) {
      const typeId = getTypeId(a);
      if (typeId === getTypeId(b)) {
        if (null === typeId) return true;
        const cls = Node.getClassFromId(typeId as number) as unknown as WebGLEffectClassTables;
        return a.arePropertiesEqual(b, Object.keys(cls.GeometryProperties));
      }
    }
    return false;
  }

  /** Maps a slider position in `range` to a value, with `power` as the curve. */
  static polynomialTransform(value: number, power: number, range: ParameterRange): number {
    const min = range[0];
    const max = range[1];
    const position = (value - min) / (max - min);
    return Math.pow(position, power) * (max - min) + min;
  }

  static polynomialInverseTransform(value: number, power: number, range: ParameterRange): number {
    const min = range[0];
    const max = range[1];
    return Math.pow((value - min) / (max - min), 1 / power) * (max - min) + min;
  }

  declare $shp: Record<string, unknown> | null;
  declare $sh: string | null;
  declare _useCroppedRendering: boolean;
  /** The operator the content is copied into the target with; never set, so source-over. */
  declare _defaultBlending: string | undefined;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this._defaultBlending = void 0;
  }

  /** The shader class named by `sh`; throws for an unknown name, as the webpack context did. */
  override getShaderClass(): ShaderClass {
    const shader = requireShader("./" + (this.$sh as string).toLowerCase().substr(1));
    if ("function" != typeof shader) throw new Error("shader not found");
    return shader as ShaderClass;
  }

  /** Slider value to parameter value; subclasses curve some parameters. */
  propertyTransform(name: string, value: number): number {
    void name;
    return value;
  }

  propertyInverseTransform(name: string, value: number): number {
    void name;
    return value;
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take the bounding box (or whatever the caller passes)
  override getEffectPadding(bbox?: unknown): EffectPadding {
    throw "Not implemented";
  }

  isFullCanvasEffect(): boolean {
    return this._useCroppedRendering;
  }

  /** Padding means pixels outside the content, which the browsers with GL bugs get wrong. */
  override isAffectedByGLBug(): boolean {
    if (this._isAffectedByGLBug) return true;
    const padding = this.getEffectPadding();
    return "number" == typeof padding
      ? padding > 0
      : !!(padding as number[]).length && Math.max.apply(0, padding as number[]) > 0;
  }

  /**
   * Runs the shader over `canvas` (or over `target` after copying the
   * canvas into it), or applies the CSS filter equivalent when there is one.
   * Returns false when WebGL is missing.
   */
  override render(
    canvas: PaintCanvas,
    target?: PaintCanvas | null,
    rootCanvas?: unknown,
    scale?: number,
    extents?: Rect | null,
    sceneHolder?: { getScene(): unknown } | null,
    downScale?: number,
  ): unknown {
    void rootCanvas;
    if (this.canApplyNativeEffect()) {
      this.applyNativeEffect(canvas, null, null, scale);
      canvas.drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.Copy);
      this.removeNativeEffect(canvas);
      return canvas;
    }
    if (this.$sh && !this.prepareShader()) return false;
    const source = target || canvas;
    if (target) target.drawCanvas(canvas, 0, 0, 1, this._defaultBlending);
    const result = this.drawShader(
      source,
      this.$shp as Record<string, unknown>,
      scale as number,
      0,
      0,
      extents,
      sceneHolder,
      downScale,
    );
    if (this.$sh && RendererConfig.DELETE_EFFECT_TEXTURES_AFTER_DRAW) this.destroy();
    return result;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, GeometryProperties);
    } else if (change === NodeChange.WorkspaceAttached) {
      // Effect._handleChange registers the effect a second time; the old
      // code did both.
      const scene = this.getScene();
      if (scene) scene.addDestroyable(this);
    } else if (change === NodeChange.WorkspaceDetach) {
      const scene = this.getScene();
      if (scene) scene.destroy([this]);
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    super._handleChange(change, args);
  }

  override destroy(): void {
    this._destroy();
  }

  override toString(): string {
    return "[Object GWebGLEffect]";
  }
}

WebGLEffect.prototype._useCroppedRendering = false;
