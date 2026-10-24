// Old: chunk.vendor.js module 908 (GElement.Transform).
/**
 * Elements that can be transformed. The base `transform` only moves the
 * children (when the scene's transform settings or the element's `scc`
 * property say children follow); shapes and groups override
 * getTransform/setTransform/transform to change their own `trf`.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import type { Rect } from "../math/rect.ts";
import { Transform as Matrix } from "../math/transform.ts";
import { isElement } from "./element-change.ts";
import type { Element } from "./element.ts";
import { hasContainer } from "./node-container.ts";
import type { PropertiesNode } from "./node-properties.ts";
import type { Node } from "./node.ts";

/** What GElement.Transform adds to an element. */
export interface TransformApi {
  getTransform(): Matrix | null;
  setTransform(transform: Matrix | null): void;
  /** Moves and scales the element so its geometry box becomes x, y, width, height. */
  setBounds(x: number, y: number, width: number, height: number): void;
  /**
   * Applies `transform`. `force` transforms the children whatever the
   * settings say; elements in `exceptions` are left alone.
   */
  transform(
    transform: Matrix,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void;
  /** Like transform, with `transform` given in the element's own coordinates. */
  preTransform(
    transform: Matrix,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void;
  isTransformChildren(transform: Matrix | null, force?: boolean | null): unknown;
  assignPreTransformFrom(transform: Matrix, source: Element): void;
  assignTransformFrom(transform: Matrix, source: Element): void;
  _transformChildren(
    transform: Matrix,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void;
}

export type TransformElement = Element & TransformApi;

/**
 * GElement.Transform.MinimalDimention (sic): the smallest width or height
 * setBounds and the layouts scale to.
 */
export const MINIMAL_DIMENTION = 1e-6;

const transformBody = <TBase extends AnyConstructor<Element>>(Base: TBase) => {
  abstract class TransformMixin extends Base implements TransformApi {
    getTransform(): Matrix | null {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implemented by the transformable classes
    setTransform(transform: Matrix | null): void {
      throw new Error("Not Supported.");
    }

    setBounds(x: number, y: number, width: number, height: number): void {
      const minimal = MINIMAL_DIMENTION;
      const targetWidth = width > minimal ? width : minimal;
      const targetHeight = height > minimal ? height : minimal;
      const bbox = this.getGeometryBBox() as Rect;
      const bboxWidth = bbox.getWidth();
      const bboxHeight = bbox.getHeight();
      const scaleX = bboxWidth > 0 ? targetWidth / bboxWidth : 0;
      const scaleY = bboxHeight > 0 ? targetHeight / bboxHeight : 0;
      const delta = new Matrix()
        .translated(-bbox.getX(), -bbox.getY())
        .scaled(scaleX, scaleY)
        .translated(x, y);
      const current = this.getTransform();
      this.setTransform(current ? current.multiplied(delta) : delta);
    }

    transform(
      transform: Matrix,
      force?: boolean | null,
      exceptions?: readonly Node[] | false | null,
    ): void {
      if (this.isTransformChildren(transform, force)) {
        this._transformChildren(transform, force, exceptions);
      }
    }

    preTransform(
      transform: Matrix,
      force?: boolean | null,
      exceptions?: readonly Node[] | false | null,
    ): void {
      if (this.isTransformChildren(transform, force)) {
        const own = (this as unknown as PropertiesNode).getProperty("trf") as Matrix | null;
        const mapped =
          own && own.invertible()
            ? (own.inverted() as Matrix).multiplied(transform).multiplied(own)
            : transform;
        this._transformChildren(mapped, force, exceptions);
      }
    }

    /** Children follow when forced, by the scene setting, or by the element's `scc` (default true). */

    isTransformChildren(transform: Matrix | null, force?: boolean | null): unknown {
      const settings = this._scene ? this._scene.getTransformSettings() : null;
      const inherited = settings ? settings.inheritedGlobal : null;
      return (
        force ||
        inherited ||
        ((undefined === inherited || null == inherited) &&
          (this as unknown as PropertiesNode).getProperty("scc", false, true))
      );
    }

    assignPreTransformFrom(transform: Matrix, source: Element): void {
      let matrix =
        (source.hasMixin(Transform) && (source as TransformElement).getTransform()) || new Matrix();
      matrix = transform.multiplied(matrix);
      this.setTransform(matrix);
    }

    assignTransformFrom(transform: Matrix, source: Element): void {
      let matrix =
        (source.hasMixin(Transform) && (source as TransformElement).getTransform()) || new Matrix();
      matrix = matrix.multiplied(transform);
      this.setTransform(matrix);
    }

    _transformChildren(
      transform: Matrix,
      force?: boolean | null,
      exceptions?: readonly Node[] | false | null,
    ): void {
      if (!hasContainer(this)) return;
      for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
        if (
          isElement(child) &&
          child.hasMixin(Transform) &&
          (!exceptions || exceptions.indexOf(child) < 0)
        ) {
          child.dependentUpdate = true;
          (child as TransformElement).transform(transform, force, exceptions);
          child.dependentUpdate = false;
        }
      }
    }
  }
  return TransformMixin;
};

const TransformMixin = defineMixin("GElement.Transform", transformBody);

export const Transform = Object.assign(TransformMixin, {
  MinimalDimention: MINIMAL_DIMENTION,
});
