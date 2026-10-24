// Old: chunk.vendor.js module 911 (GElement.Stylable).
/**
 * GStylable for elements: shared style links (`sref`), style painting
 * (separate canvases for opacity and blend modes, effects per style layer)
 * and the effect cache, and the geometry and repaint notifications the
 * paint layers and effects trigger.
 *
 * registerStyleMixins (element.ts) makes this `Element.Stylable`; element
 * classes mix it in.
 */
import { defineMixin, getTypeId, type AnyConstructor } from "../core/object.ts";
import { equals } from "../core/util.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../paint/paint-canvas.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import { Shader } from "../paint/webgl/shader.ts";
import { Container } from "../scene/node-container.ts";
import { NodeChange } from "../scene/node-change.ts";
import { ElementChange, isElement } from "../scene/element-change.ts";
import type { PropertiesNode } from "../scene/node-properties.ts";
import { SceneNode, type SceneHooks } from "../scene/scene-node.ts";
import { registerStyleMixins } from "../scene/element.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Effect, type EffectPadding } from "./effect.ts";
import type { PropertiesChangeArgs } from "../scene/node-properties.ts";
import { Stylable, type StylableNode } from "./stylable.ts";
import type { StyleSceneHooks } from "./stylable-sets.ts";

/** The paint context as style painting uses it. */
export interface StylePaintContext {
  configuration: ScenePaintConfiguration;
  canvas: PaintCanvas;
  pushCanvas(canvas: PaintCanvas): PaintCanvas;
  popCanvas(): void;
  getRootCanvas(): PaintCanvas;
}

/** One cached effect result. */
interface FxCacheEntry {
  bmp: PaintCanvas;
  deps: Effect[];
  fx: Effect;
}

/**
 * The cache every stylable element starts with. The old mixin kept one
 * array on its prototype and the mix copied that reference into every
 * class, so all elements share it until their first full reset assigns
 * their own (see QUESTIONS.md "Stylable elements share one effect cache
 * array").
 */
const sharedFxCache: FxCacheEntry[] = [];

/** What the mixin needs from the element it is mixed into. */
export interface ElementStylableBase extends PropertiesNode, SceneNode {
  getPaintBBox(): Rect | null;
  _requestInvalidationArea(area: Rect | null): void;
  beginUpdate(arg?: unknown): void;
  endUpdate(arg?: unknown): void;
}

type ElementStylableBaseClass = AnyConstructor<ElementStylableBase>;

/** A page global of the old app that overrode `clipDirty`. */
declare const CLIPDIRTY: boolean | undefined;
/** Set by the old debugging loader; rendering errors are logged then. */
declare const gdb_loaddesign: unknown;

/** Whether the effect paints next to the content rather than filtering it. */
function isOverlayType(effect: Effect): boolean {
  const type = effect.getEffectType();
  return (
    type === Effect.Type.PreEffect || type === Effect.Type.PostEffect || type === Effect.Type.Multi
  );
}

const body = <TBase extends ElementStylableBaseClass>(Base: TBase) => {
  abstract class ElementStylableMixin extends Stylable(Base) {
    declare $sref: string | null;
    /** Cached effect results. Quirk: the default is one array shared by every element until it is replaced. */
    declare _fxCache: FxCacheEntry[];

    override assignStyleFrom(source: StylableNode, blockChildChanges?: boolean): void {
      this.beginUpdate();
      try {
        super.assignStyleFrom(source, blockChildChanges);
      } finally {
        this.endUpdate();
      }
    }

    addStyle(style: unknown): void {
      this.setProperty("sref", style);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    removeStyle(style?: unknown): void {
      this.setProperty("sref", null);
    }

    /** The shared style `sref` points to, once the element is in a workspace. */
    getReferencedStyle(): StylableNode | null {
      return this._workspace && this.$sref
        ? (this._workspace.getReference(this.$sref) as unknown as StylableNode | null)
        : null;
    }

    /**
     * Paints the element's style: outlines only in outline mode; otherwise,
     * with total opacity, through a separate canvas when the opacity or the
     * blend mode needs it, with the effects of each style layer.
     */
    _paintStyle(context: StylePaintContext, bbox: Rect): void {
      const layers = this.getStyleLayers();
      let effectCanvas: PaintCanvas | null = null;
      if (context.configuration.isOutline(context as never)) {
        this._paintStyleFillLayer(context, bbox, layers);
      } else if ((this.$_stop as number) > 0) {
        const effects =
          context.configuration.ignoreEffects ||
          context.configuration.noWebGL ||
          ((context.getRootCanvas().getScale() as number) > 6 &&
            context.configuration.enableFxCache &&
            !context.configuration.forceEffectsWhenZoomed)
            ? null
            : this._effects
              ? this._effects.getLayersEffects(layers, true)
              : null;
        let hasEffects = false;
        if (effects) {
          const padding = (
            list: Effect[] | null | undefined,
            filter: (effect: Effect) => boolean,
            scale: number,
          ) => this._fxPadding(list, filter, scale);
          const present = effects.filter((list) => {
            if (list) return true;
            return undefined;
          });
          let maxPadding: number[];
          const scale = context.canvas.getScale() as number;
          if (0 === present.length) maxPadding = [0, 0, 0, 0];
          else if (1 === present.length) maxPadding = padding(present[0], isOverlayType, scale);
          else {
            (present as unknown[])[0] = padding(present[0], isOverlayType, scale);
            maxPadding = (present as unknown[]).reduce((current, list) => {
              const listPadding = padding(list as Effect[], isOverlayType, scale);
              return (current as number[]).map((value, i) =>
                Math.max(value, listPadding[i] as number),
              );
            }) as number[];
          }
          for (let i = 0; i < effects.length && !effectCanvas; ++i) {
            const list = effects[i];
            if (list) {
              for (let j = 0; j < list.length && !effectCanvas; ++j) {
                hasEffects = true;
                if (isOverlayType(list[j] as Effect)) {
                  effectCanvas = this._createStyleCanvas(context, bbox, maxPadding);
                }
              }
            }
          }
        }
        if (
          1 !== this.$_stop ||
          this.$_sbl !== Canvas2DPaintCanvas.BlendMode.Normal ||
          this._hasMaskingChild()
        ) {
          this._paintStyleSeparate(context, bbox, layers, effects, effectCanvas, hasEffects);
        } else {
          this._paintStyleFillLayer(context, bbox, layers, effects, effectCanvas, hasEffects);
        }
      }
      if (effectCanvas) effectCanvas.finish();
    }

    _isStyleSeparate(): boolean {
      return false;
    }

    /**
     * Whether a direct child masks ("m") or inverse-masks ("!m") what is
     * painted below it. Such a container paints into its own canvas, so the
     * mask only reaches its siblings (BUGS-FIXED.md "BUG-011 A mask in a
     * plain group erases everything painted before it").
     */
    _hasMaskingChild(): boolean {
      type Child = { getNext(): Child | null; $_sbl?: unknown };
      const container = this as unknown as { getFirstChild?: () => Child | null };
      if (typeof container.getFirstChild != "function") return false;
      for (let child = container.getFirstChild(); null != child; child = child.getNext()) {
        if ("m" === child.$_sbl || "!m" === child.$_sbl) return true;
      }
      return false;
    }

    _paintStyleSeparate(
      context: StylePaintContext,
      bbox: Rect,
      layers: string[] | null,
      effects: (Effect[] | null)[] | null,
      effectCanvas: PaintCanvas | null,
      hasEffects: boolean,
    ): void {
      const canvas = this._createStyleCanvas(context, bbox);
      const previous = context.pushCanvas(canvas);
      try {
        this._paintStyleFillLayer(context, bbox, layers, effects, effectCanvas, hasEffects);
        this._paintCompositedWithBackground(previous, (target, opacity, composite) => {
          target.drawCanvas(canvas, 0, 0, opacity, composite);
        });
        canvas.finish();
      } finally {
        context.popCanvas();
      }
    }

    /** Composites with the element's blend mode; "m" and "!m" mask what is below. */
    _paintCompositedWithBackground(
      canvas: PaintCanvas,
      paint: (canvas: PaintCanvas, opacity: number, composite: string) => void,
    ): void {
      if ("m" === this.$_sbl || "!m" === this.$_sbl) {
        let clipped = false;
        const area = this._getStyleMaskClipArea();
        if (area && canvas.hasClip()) {
          canvas.clipRect(area.getX(), area.getY(), area.getWidth(), area.getHeight());
          clipped = true;
        }
        try {
          paint(
            canvas,
            this.$_stop as number,
            "m" === this.$_sbl
              ? Canvas2DPaintCanvas.CompositeOperator.DestinationIn
              : Canvas2DPaintCanvas.CompositeOperator.DestinationOut,
          );
        } finally {
          if (clipped) canvas.resetClip();
        }
      } else paint(canvas, this.$_stop as number, this.$_sbl as string);
    }

    /**
     * Paints the content, through a canvas with the fill opacity when it
     * isn't 1 or when the element itself has effects (the last list).
     */
    _paintStyleFillLayer(
      context: StylePaintContext,
      bbox: Rect,
      layers: string[] | null,
      effects?: (Effect[] | null)[] | null,
      effectCanvas?: PaintCanvas | null,
      hasEffects?: boolean,
    ): void {
      if (context.configuration.isOutline(context as never)) {
        this._paintStyleContent(context, bbox, layers, effects, effectCanvas, hasEffects);
        return;
      }
      const elementEffects = effects ? effects[layers && layers.length ? layers.length : 0] : null;
      if (1 !== this.$_sfop || elementEffects) {
        const extents: (Rect | null)[] = [null];
        const downScale = [1];
        const canvas = this._createStyleCanvas(
          context,
          bbox,
          this._fxPadding(elementEffects, null, context.canvas.getScale() as number),
          extents,
          downScale,
        );
        const previous = context.pushCanvas(canvas);
        try {
          this._paintStyleContent(context, bbox, layers, effects, effectCanvas, hasEffects);
          if (elementEffects) {
            let layerEffects: Effect[] = [];
            if (layers) {
              for (let i = 0; i < layers.length; i++) {
                const list = (effects as (Effect[] | null)[])[i];
                if (list) layerEffects = layerEffects.concat(list);
              }
            }
            this._paintWithEffects(
              canvas,
              context.getRootCanvas(),
              previous,
              this.$_sfop as number,
              elementEffects,
              effectCanvas as PaintCanvas,
              layerEffects,
              context.configuration.enableFxCache,
              extents[0] as Rect,
              downScale[0] as number,
            );
          } else previous.drawCanvas(canvas, 0, 0, this.$_sfop as number);
          canvas.finish();
        } catch (error) {
          if ("function" == typeof gdb_loaddesign) console.warn("Rendering error:" + String(error));
        } finally {
          context.popCanvas();
        }
      } else if ((this.$_sfop as number) > 0) {
        this._paintStyleContent(context, bbox, layers, effects, effectCanvas, hasEffects);
      }
    }

    /**
     * The largest padding of the effects (that pass `filter`) in device
     * pixels, rounded up. Quirk: with several effects the first one's
     * padding replaces it in the list before the reduce, as in the old code.
     */
    _fxPadding(
      effects: Effect[] | null | undefined,
      filter: ((effect: Effect) => boolean) | null,
      scale: number,
    ): number[] {
      const none = [0, 0, 0, 0];
      if (!effects) return none;
      const list = effects.filter((effect) => {
        if (effect) return !filter || filter(effect);
        return undefined;
      });
      if (0 === list.length) return none;
      let first: EffectPadding =
        (list[0] as Effect).getAbsoluteEffectPadding &&
        (list[0] as Effect).getAbsoluteEffectPadding();
      if ("number" == typeof first) first = [first, first, first, first];
      else if (!first) first = none;
      if (1 === list.length) return (first as number[]).map((value) => Math.ceil(value * scale));
      (list as unknown[])[0] = first;
      return (
        (list as unknown[]).reduce((current, effect) => {
          let padding: EffectPadding = (effect as Effect).getAbsoluteEffectPadding();
          if ("number" == typeof padding) padding = [padding, padding, padding, padding];
          else if (!padding) padding = none;
          return ((current as number[]) || none).map((value, i) =>
            Math.max(value, (padding as number[])[i] as number),
          );
        }) as number[]
      ).map((value) => Math.ceil(value * scale));
    }

    /** Paints each style layer, through a canvas when it has effects or is separate. */
    _paintStyleContent(
      context: StylePaintContext,
      bbox: Rect,
      layers: string[] | null,
      effects?: (Effect[] | null)[] | null,
      effectCanvas?: PaintCanvas | null,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- passed along by the old code
      hasEffects?: boolean,
    ): void {
      if (!layers || !layers.length) return;
      const outline = context.configuration.isOutline(context as never);
      let canvas: PaintCanvas | null = null;
      const extents: (Rect | null)[] = [null];
      for (let i = 0; i < layers.length; ++i) {
        const layer = layers[i] as string;
        if (outline) this._paintStyleLayer(context, layer, false);
        else {
          const layerEffects = effects ? effects[i] : null;
          if (layerEffects || this._isSeparateStylePaintLayer(context, layer)) {
            const downScale = [1];
            if (canvas) canvas.clear();
            else {
              canvas = this._createStyleCanvas(
                context,
                bbox,
                layerEffects ? [0, 0, 0, 0] : null,
                extents,
                downScale,
              );
            }
            const previous = context.pushCanvas(canvas);
            try {
              this._paintStyleLayer(context, layer, true);
              if (layerEffects) {
                this._paintWithEffects(
                  canvas,
                  context.getRootCanvas(),
                  previous,
                  1,
                  layerEffects,
                  effectCanvas as PaintCanvas,
                  null,
                  context.configuration.enableFxCache,
                  extents[0] as Rect,
                  downScale[0] as number,
                );
              } else previous.drawCanvas(canvas);
            } finally {
              context.popCanvas();
            }
          } else this._paintStyleLayer(context, layer, false);
        }
      }
      if (canvas) canvas.finish();
    }

    /**
     * Draws the cached result of `effect` into `canvas`, scaled when the
     * zoom changed by at most one step. Returns whether it drew (or, with
     * `probe`, would draw).
     */
    _getFxCache(
      canvas: PaintCanvas,
      effect: Effect,
      extents: Rect | null,
      probe?: boolean,
    ): boolean {
      if (!effect.isCacheable(canvas)) return false;
      const index = this._getFxIdx(effect);
      if (index >= 0 && this._fxCache[index]) {
        const entry = this._fxCache[index] as FxCacheEntry;
        const depsExist = entry.deps.every(function (this: ElementStylableMixin, dep) {
          return this._fxExists(dep);
        }, this);
        const bitmap = entry.bmp;
        const rendered = bitmap && bitmap.isRendered();
        if (depsExist && rendered) {
          const cachedScale = bitmap.getScale() as number;
          const scale = canvas.getScale() as number;
          if (cachedScale !== scale) {
            if (cachedScale > scale || canvas.getWidth() * canvas.getHeight() > 16777216) {
              if (probe) return true;
              if (
                Math.ceil(
                  Math.log(Math.max(cachedScale, scale) / Math.min(cachedScale, scale)) /
                    Math.log(2),
                ) > 1
              ) {
                this._resetFxCacheAndState(effect, true);
                return false;
              }
              const origin = extents
                ? extents.getSide(Rect.Side.TOP_LEFT)
                : (canvas.getOffset() as Point);
              const transform = canvas.getTransform(false);
              const rawTransform = canvas.getTransform(true);
              const inverse = transform.inverted();
              canvas.setTransform(inverse);
              canvas.clear();
              const currentScale = canvas.getScale() as number;
              const offset = canvas.getOffset() as Point;
              const x = (cachedScale * (offset.getX() - origin.getX())) / currentScale;
              const y = (cachedScale * (offset.getY() - origin.getY())) / currentScale;
              const width = (cachedScale * canvas.getWidth()) / currentScale;
              const height = (cachedScale * canvas.getHeight()) / currentScale;
              const marginX = Math.max(0, 0);
              const marginY = Math.max(0, 0);
              const bounds = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
              let source = new Rect(
                x + marginX,
                y + marginY,
                Math.floor(width),
                Math.floor(height),
              );
              source = source.intersected(bounds);
              const targetWidth = canvas.getWidth() - 0;
              const targetHeight = canvas.getHeight() - 0;
              if (!source.isEmpty()) {
                const target = canvas._canvasContext as CanvasRenderingContext2D;
                target.globalAlpha = 1;
                target.globalCompositeOperation = "source-over";
                target.drawImage(
                  (bitmap._canvasContext as CanvasRenderingContext2D).canvas,
                  source.getX(),
                  source.getY(),
                  source.getWidth(),
                  source.getHeight(),
                  0,
                  0,
                  targetWidth,
                  targetHeight,
                );
              }
              canvas.setTransform(rawTransform);
              return true;
            }
            this._resetFxCacheAndState(effect, true);
            return false;
          }
          if (
            !extents &&
            (Math.abs(bitmap.getWidth() - canvas.getWidth()) > 1 ||
              Math.abs(bitmap.getHeight() - canvas.getHeight()) > 1)
          ) {
            console.log("fx cache: size misfit");
            this._resetFxCacheAndState(effect, true);
            return false;
          }
          if (!probe) {
            if (extents) bitmap.setOffset(extents.getSide(Rect.Side.TOP_LEFT));
            else bitmap.setOffset(canvas.getOffset());
            canvas.drawCanvas(bitmap, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.Copy);
          }
          return true;
        }
        if (!(depsExist && rendered)) this._fxCache.splice(index, 1);
      }
      return false;
    }

    /** Keeps a copy of `canvas` as the result of `effect`, valid while `deps` are cached. */
    _setFxCache(canvas: PaintCanvas, effect: Effect, deps: Effect[]): boolean | undefined {
      if (!canvas.isClipped() && this._scene) {
        if (!effect.isCacheable(canvas)) return false;
        const copy = canvas.clone(false, {
          renderPhaseDraw: true,
          dontCopyContents: false,
          persistent: true,
        } as never);
        (this._scene as unknown as StyleSceneHooks).addDestroyable(copy);
        this._reinvalidateRemovedFx(effect);
        const cache = this._fxCache;
        for (let i = 0; i < cache.length; i++) {
          if (cache[i] && (cache[i] as FxCacheEntry).fx === effect) {
            cache[i] = { bmp: copy, deps, fx: effect };
            return undefined;
          }
        }
        this._fxCache.push({ bmp: copy, deps, fx: effect });
      }
      return undefined;
    }

    /** Drops cached results whose dependencies changed. */
    _reinvalidateFxDeps(effects: Effect[], extraDeps: Effect[]): void {
      for (let i = effects.length - 1; i >= 0; i--) {
        const index = this._getFxIdx(effects[i] as Effect, true);
        if (index >= 0 && this._fxCache[index]) {
          const deps = effects.slice(0, i).concat(extraDeps);
          const cachedDeps = (this._fxCache[index] as FxCacheEntry).deps;
          if (!equals(deps, cachedDeps)) this._resetFxCacheAndState(effects[i] as Effect, true);
        }
      }
    }

    /** Drops cached results that depend on `effect` or on a result that is gone. */
    _reinvalidateRemovedFx(effect: Effect): void {
      const scene = this._scene as unknown as StyleSceneHooks;
      this._fxCache = this._fxCache.filter(function (this: ElementStylableMixin, entry) {
        if (!entry) return false;
        const deps = entry.deps;
        for (let i = 0; i < deps.length; i++) {
          const dep = deps[i] as Effect;
          if (dep === effect || !this._fxExists(dep)) {
            scene.destroy([entry.bmp]);
            return false;
          }
        }
        return true;
      }, this);
    }

    /**
     * Drops the cached result of `effect` (or all of them) and then the
     * caches of the nearest stylable ancestor element.
     */
    _resetFxCacheAndState(effect?: Effect | null, reinvalidate?: boolean): void {
      let reset = false;
      const scene = this._scene as unknown as StyleSceneHooks;
      if (ElementStylable._ENABLE_PARTIAL_RESET && effect) {
        const index = this._getFxIdx(effect);
        if (index >= 0) {
          const entry = this._fxCache[index];
          if (entry) scene.destroy([entry.bmp]);
          this._fxCache.splice(index, 1);
          reset = true;
          if (reinvalidate) this._reinvalidateRemovedFx(effect);
        }
      } else {
        (this._fxCache || []).forEach((entry) => {
          if (entry) scene.destroy([entry.bmp]);
        });
        this._fxCache = [];
        reset = true;
      }
      if (reset) {
        let parent = this.getParent();
        while (parent && !(isElement(parent) && parent.hasMixin(ElementStylable))) {
          parent = parent.getParent();
        }
        const owner = parent as unknown as ElementStylableMixin | null;
        if (owner && (owner._workspace || owner._scene)) owner._resetFxCacheAndState();
      }
    }

    _fxExists(effect: Effect): boolean {
      const index = this._getFxIdx(effect);
      return !!(index >= 0 && this._fxCache[index]);
    }

    /**
     * The cache index of `effect`, or -1. An entry for an effect that is no
     * longer in the effects is dropped with `drop`.
     */
    _getFxIdx(effect: Effect, drop?: boolean): number {
      if (!this._effects) return -1;
      const cache = this._fxCache;
      let index = -1;
      let i = 0;
      for (; i < cache.length; i++) {
        if ((cache[i] as FxCacheEntry).fx === effect) {
          index = i;
          break;
        }
      }
      if (index < 0) return -1;
      for (let child = this._effects.getFirstChild(); null !== child; child = child.getNext()) {
        if (child === effect) return index;
      }
      if (drop) cache.splice(i, 1);
      return -1;
    }

    /**
     * Runs `effects` over `canvas` and draws the result into `target`:
     * filters change the content, pre/post/multi effects paint into
     * `effectCanvas`, which is drawn under (pre) or over (post) the content.
     */
    _paintWithEffects(
      canvas: PaintCanvas,
      rootCanvas: PaintCanvas,
      target: PaintCanvas,
      opacity: number,
      effects: Effect[],
      effectCanvas: PaintCanvas,
      extraDeps: Effect[] | null,
      useCache: boolean,
      extents: Rect,
      downScale: number,
    ): void {
      let contentDrawn = false;
      let partial: boolean | undefined;
      if (!extraDeps) extraDeps = [];
      this._reinvalidateFxDeps(effects, extraDeps);
      if (
        canvas.getWidth() < extents.getWidth() - 1 ||
        canvas.getHeight() < extents.getHeight() - 1
      ) {
        partial = true;
      }
      let contents: PaintCanvas | undefined;
      const singletons: Record<number, boolean> = {};
      if (effects.some((effect) => effect.isAffectedByContents())) {
        contents = canvas.clone(false, { renderPhaseDraw: true, dontCopyContents: false } as never);
      }
      // The type id of the last singleton seen; the old code kept it across
      // iterations (a `var`), so a non-singleton marks the previous one again.
      let typeId: number | undefined;
      for (let i = 0; i < effects.length; ++i) {
        const effect = effects[i] as Effect;
        const type = effect.getEffectType();
        if (effect.isSingleton()) {
          typeId = getTypeId(effect) as number;
          if (singletons[typeId]) continue;
        }
        singletons[typeId as number] = true;
        if (type === Effect.Type.Filter) {
          if (!useCache || (effect instanceof Effect && !effect.isCacheable(canvas))) {
            effect.render(canvas, null, rootCanvas, canvas.getScale(), extents, this, downScale);
          } else if (!this._getFxCache(canvas, effect, partial ? extents : null)) {
            effect.render(canvas, null, rootCanvas, canvas.getScale(), extents, this, downScale);
            if (!partial) this._setFxCache(canvas, effect, effects.slice(0, i).concat(extraDeps));
          }
          if (contents) {
            effect.render(contents, null, rootCanvas, canvas.getScale(), extents, this, downScale);
          }
        } else if (
          type === Effect.Type.PreEffect ||
          type === Effect.Type.PostEffect ||
          type === Effect.Type.Multi
        ) {
          if (type === Effect.Type.PostEffect && !contentDrawn && opacity > 0) {
            target.drawCanvas(canvas, 0, 0, opacity);
            contentDrawn = true;
          }
          effectCanvas.clear();
          let result: unknown;
          const own = canvas;
          if (effect.isAffectedByContents()) canvas = contents as PaintCanvas;
          if (!useCache || (effect instanceof Effect && !effect.isCacheable(canvas))) {
            result = effect.render(
              canvas,
              effectCanvas,
              rootCanvas,
              effectCanvas.getScale(),
              extents,
              this,
              downScale,
            );
          } else if (!this._getFxCache(effectCanvas, effect, partial ? extents : null)) {
            result = effect.render(
              canvas,
              effectCanvas,
              rootCanvas,
              effectCanvas.getScale(),
              extents,
              this,
              downScale,
            );
            if (!partial) {
              this._setFxCache(effectCanvas, effect, effects.slice(0, i).concat(extraDeps));
            }
          }
          if (effect.isAffectedByContents()) canvas = own;
          let blend: string = Canvas2DPaintCanvas.BlendMode.Normal;
          if (type === Effect.Type.PostEffect && "string" == typeof result) blend = result;
          target.drawCanvas(effectCanvas, 0, 0, 1, blend);
          if (contents) contents.drawCanvas(effectCanvas, 0, 0, 1, blend);
        }
      }
      if (contents) contents.clear();
      if (!contentDrawn && opacity > 0) target.drawCanvas(canvas, 0, 0, opacity);
    }

    /** Paints one style layer; shapes implement it. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implemented by shapes
    _paintStyleLayer(context: StylePaintContext, layer: string, separate: boolean): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implemented by shapes
    _isSeparateStylePaintLayer(context: StylePaintContext, layer: string): boolean {
      return false;
    }

    /** "!m" (inverse mask) clips to the paint box unless the new blend is "m". */
    _getStyleMaskClipArea(blend?: unknown): Rect | null {
      return "m" === this.$_sbl
        ? null
        : "!m" === this.$_sbl
          ? "m" === blend
            ? null
            : this.getPaintBBox()
          : null;
    }

    /**
     * A canvas for painting `bbox` (plus `padding`) separately. `extents`
     * receives the device rect it covers, `downScale` the effect detail
     * scale. Fast paint mode uses a plain canvas of the box's size.
     */
    _createStyleCanvas(
      context: StylePaintContext,
      bbox: Rect,
      padding?: number[] | null,
      extents?: (Rect | null)[] | null,
      downScale?: number[] | null,
    ): PaintCanvas {
      const scale = context.canvas.getScale() as number;
      if (context.configuration.paintMode === ScenePaintConfiguration.PaintMode.Fast) {
        const canvas = new Canvas2DPaintCanvas();
        if (scale > 1) {
          const corrected = context.canvas.getScaleBoxCorrection(
            bbox.getX(),
            bbox.getY(),
            bbox.getWidth(),
            bbox.getHeight(),
            scale,
            true,
          );
          canvas.resize(Math.ceil(corrected.getWidth()), Math.ceil(corrected.getHeight()));
        }
        bbox = bbox.toAlignedRect();
        if (scale <= 1) canvas.resize(bbox.getWidth(), bbox.getHeight());
        canvas.prepare();
        const topLeft = bbox.getSide(Rect.Side.TOP_LEFT);
        canvas.setOrigin(topLeft);
        canvas.setOffset(topLeft);
        if (extents) extents[0] = bbox;
        return canvas;
      }
      let paintExtents = context.canvas.getPaintExtents(bbox, false, padding);
      let finalExtents = context.canvas.getFinalExtents(paintExtents);
      const translation = context.canvas.getTransform().getTranslation();
      let shift = new Point(-finalExtents.getX(), -finalExtents.getY());
      let correction = context.canvas.getTranslateCorrection(translation, shift);
      const unit = 1 / scale;
      if (padding) {
        const detail = Shader.computeDownScale(
          context.canvas,
          padding,
          context.configuration.defaultEffectDetailLevel as number,
        );
        if (downScale) downScale[0] = detail;
        if (detail < 1)
          padding = padding.map((value) => value + Math.max(0, Math.ceil(1 / detail)));
      }
      let dx = correction.getX() * unit;
      let dy = correction.getY() * unit;
      let area = bbox.translated(dx, dy).expanded(unit, unit, unit, unit);
      const canvas = context.canvas.createCanvas(
        area,
        "undefined" != typeof CLIPDIRTY ? CLIPDIRTY : context.configuration.clipDirty,
        padding,
      );
      if (extents) {
        paintExtents = context.canvas.getPaintExtents(bbox, true, padding);
        finalExtents = context.canvas.getFinalExtents(paintExtents);
        shift = new Point(-finalExtents.getX(), -finalExtents.getY());
        correction = context.canvas.getTranslateCorrection(translation, shift);
        dx = correction.getX() * unit;
        dy = correction.getY() * unit;
        area = bbox.translated(dx, dy).expanded(unit, unit, unit, unit);
        paintExtents = context.canvas.getPaintExtents(area, true, padding);
        finalExtents = context.canvas.getFinalExtents(paintExtents).toRoundedPrecision();
        extents[0] = new Rect(
          finalExtents.getX(),
          finalExtents.getY(),
          Math.ceil(finalExtents.getWidth()),
          Math.ceil(finalExtents.getHeight()),
        );
      }
      return canvas;
    }

    /** Geometry is about to change; with a source, the stylable children follow. */
    override _stylePrepareGeometryChange(source?: unknown): void {
      this._notifyChange(ElementChange.PrepareGeometryUpdate);
      if (source && this.hasMixin(Container)) {
        const container = this as unknown as { getFirstChild(): ElementStylableMixin | null };
        for (
          let child = container.getFirstChild();
          null !== child;
          child = child.getNext() as never
        ) {
          if (isElement(child) && child.hasMixin(ElementStylable)) {
            child._stylePrepareGeometryChange(source);
          }
        }
      }
    }

    /** Geometry changed: drop the effect cache (of one effect, when it was the source). */
    override _styleFinishGeometryChange(source?: unknown): void {
      this._notifyChange(ElementChange.FinishGeometryUpdate, 1);
      if (source) {
        if (source instanceof Effect) this._resetFxCacheAndState(source);
        else this._resetFxCacheAndState();
        if (this.hasMixin(Container)) {
          const container = this as unknown as { getFirstChild(): ElementStylableMixin | null };
          for (
            let child = container.getFirstChild();
            null !== child;
            child = child.getNext() as never
          ) {
            if (isElement(child) && child.hasMixin(ElementStylable)) {
              child._styleFinishGeometryChange(source);
            }
          }
        }
      } else this._resetFxCacheAndState();
    }

    override _styleRepaint(source?: unknown): void {
      if (source && source instanceof Effect) this._resetFxCacheAndState(source);
      else this._resetFxCacheAndState();
      this._notifyChange(ElementChange.InvalidationRequest);
    }

    /**
     * Keeps the scene's style links in sync with `sref` (and pulls the
     * style in when it is set), repaints mask areas when the blend mode
     * switches to or from a mask, and saves `sref`.
     */
    override _handleStyleChange(change: number, args?: unknown): void {
      if (this._workspace) {
        if (
          ((change === NodeChange.BeforePropertiesChange ||
            change === NodeChange.AfterPropertiesChange) &&
            (args as PropertiesChangeArgs).properties.indexOf("sref") >= 0) ||
          change === SceneNode._Change.SceneAttached ||
          change === SceneNode._Change.SceneDetached
        ) {
          const style = this.getReferencedStyle();
          if (style) {
            const scene = this._scene as SceneHooks;
            switch (change) {
              case NodeChange.BeforePropertiesChange:
              case SceneNode._Change.SceneDetached:
                scene.unlink(style as never, this);
                break;
              case NodeChange.AfterPropertiesChange:
              case SceneNode._Change.SceneAttached:
                scene.link(style, this);
                if (change === NodeChange.AfterPropertiesChange) this.assignStyleFrom(style, true);
            }
          }
        }
        if (change === NodeChange.AfterPropertiesChange) {
          const changed = args as PropertiesChangeArgs;
          const index = changed.properties.indexOf("_sbl");
          if (index >= 0) {
            const previous = changed.values[index];
            const current = this.$_sbl;
            if (
              (index >= 0 && "m" === current) ||
              "!m" === current ||
              "m" === previous ||
              "!m" === previous
            ) {
              this._requestInvalidationArea(this._getStyleMaskClipArea(previous));
            }
          }
        }
        if (this._workspace) {
          if (change === NodeChange.ParentAttached) {
            if ("m" === this.$_sbl) this._requestInvalidationArea(this._getStyleMaskClipArea());
          } else if (change === NodeChange.ParentDetach && "m" === this.$_sbl) {
            this._requestInvalidationArea(this._getStyleMaskClipArea());
          }
        }
      }
      if (change === NodeChange.Store) {
        if (this.$sref) (args as StoreChangeArgs).blob["sref"] = this.$sref;
      } else if (change === NodeChange.Restore) {
        this.$sref = (args as RestoreChangeArgs).blob["sref"] as string | null;
      }
      super._handleStyleChange(change, args);
    }

    /** Compares with the referenced style (the argument is ignored, as in the old code). */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    override equalsStyle(other?: unknown): boolean {
      return super.equalsStyle(this.getReferencedStyle());
    }
  }
  const prototype = ElementStylableMixin.prototype;
  prototype._fxCache = sharedFxCache;
  return ElementStylableMixin;
};

/**
 * GElement.Stylable. Carries GStylable's statics, as the old
 * `GObject.inherit(GElement.Stylable, GStylable)` copied them.
 */
const elementStylableMixin = defineMixin("GElement.Stylable", body);
const elementStylableStatics = {
  StyleLayer: Stylable.StyleLayer,
  StyleLayerName: Stylable.StyleLayerName,
  BorderAlignment: Stylable.BorderAlignment,
  BorderMarker: Stylable.BorderMarker,
  ParagraphAlignment: Stylable.ParagraphAlignment,
  TypographyScript: Stylable.TypographyScript,
  TextTransformation: Stylable.TextTransformation,
  PropertySet: Stylable.PropertySet,
  PropertySetInfo: Stylable.PropertySetInfo,
  AllVisualProperties: Stylable.AllVisualProperties,
  AllGeometryProperties: Stylable.AllGeometryProperties,
  PaintLayer: Stylable.PaintLayer,
  FillPaintLayer: Stylable.FillPaintLayer,
  BorderPaintLayer: Stylable.BorderPaintLayer,
  PaintLayers: Stylable.PaintLayers,
  Effects: Stylable.Effects,
  Effect: Stylable.Effect,
  GeometryProperties: { sref: null } as Record<string, unknown>,
  /** Resets only the changed effect's cache entry instead of all of them. */
  _ENABLE_PARTIAL_RESET: true,
};
export const ElementStylable: typeof elementStylableMixin & typeof elementStylableStatics =
  Object.assign(elementStylableMixin, elementStylableStatics);

registerStyleMixins(Stylable, ElementStylable);
