// Old: chunk.vendor.js module 909 (GElement.Layout).
/**
 * Containers that lay out anchored children (constraints, GElement.Anchor).
 * When the container's `trf` changes, the change is remembered as
 * `_layoutTransform`; when its size then changes (GeometrySizeChanged),
 * every child with a horizontal or vertical anchor is moved by
 * `relayoutAnchored`, with that transform or with the one that maps the
 * old box onto the new one.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import type { Rect } from "../math/rect.ts";
import { Transform as Matrix } from "../math/transform.ts";
import { Anchor, type AnchorApi } from "./element-anchor.ts";
import { ElementChange } from "./element-change.ts";
import { MINIMAL_DIMENTION, Transform } from "./element-transform.ts";
import type { Element } from "./element.ts";
import { NodeChange } from "./node-change.ts";
import type { ContainerNode } from "./node-container.ts";
import type { PropertiesChangeArgs, PropertiesNode } from "./node-properties.ts";

export interface LayoutApi {
  /** Set by subclasses while they relayout themselves. */
  _relayout: boolean;
  _layoutTransform: Matrix | null;
  _relayoutNow: boolean;
  _handleLayoutChange(change: number, args: unknown): void;
  _layoutAnchorContents(newBox: Rect | null, oldBox: Rect | null, transform: Matrix | null): void;
}

export const Layout = defineMixin(
  "GElement.Layout",
  <TBase extends AnyConstructor<Element>>(Base: TBase) => {
    abstract class LayoutMixin extends Base implements LayoutApi {
      declare _relayout: boolean;
      declare _layoutTransform: Matrix | null;
      declare _relayoutNow: boolean;

      _handleLayoutChange(change: number, args: unknown): void {
        if (this.isRecordedTransaction()) return;
        const self = this as unknown as ContainerNode & PropertiesNode;
        if (
          change === ElementChange.GeometrySizeChanged &&
          self.getFirstChild() &&
          !this._relayout
        ) {
          if (this._layoutTransform) {
            this._layoutAnchorContents(null, null, this._layoutTransform);
            this._layoutTransform = null;
          } else {
            const newBox = this.getGeometryBBox();
            const oldBox = (args as [Element, Rect])[1];
            this._layoutAnchorContents(newBox, oldBox, null);
          }
        } else if (
          !(
            change === NodeChange.AfterPropertiesChange &&
            (args as PropertiesChangeArgs).properties.indexOf("trf") >= 0
          ) ||
          (this._relayout && this._layoutTransform)
        ) {
          if (change === NodeChange.Restore) this._layoutTransform = null;
        } else {
          // The change from the old trf to the new one.
          const change_ = args as PropertiesChangeArgs;
          let delta: Matrix | null | undefined;
          const index = change_.properties.indexOf("trf");
          const current = self.getProperty("trf") as Matrix | null;
          const old = change_.values[index] as Matrix | null;
          if (old) delta = old.inverted();
          if (current) delta = delta ? delta.multiplied(current) : current;
          this._layoutTransform = delta as Matrix | null;
        }
      }

      _layoutAnchorContents(
        newBox: Rect | null,
        oldBox: Rect | null,
        transform: Matrix | null,
      ): void {
        let layout = transform;
        if (!transform) {
          const from = oldBox as Rect;
          const to = newBox as Rect;
          const oldWidth =
            from.getWidth() > MINIMAL_DIMENTION ? from.getWidth() : MINIMAL_DIMENTION;
          const oldHeight =
            from.getHeight() > MINIMAL_DIMENTION ? from.getHeight() : MINIMAL_DIMENTION;
          const newWidth = to.getWidth() > MINIMAL_DIMENTION ? to.getWidth() : MINIMAL_DIMENTION;
          const newHeight = to.getHeight() > MINIMAL_DIMENTION ? to.getHeight() : MINIMAL_DIMENTION;
          layout = new Matrix()
            .translated(-from.getX(), -from.getY())
            .scaled(newWidth / oldWidth, newHeight / oldHeight)
            .translated(to.getX(), to.getY());
        }
        const self = this as unknown as ContainerNode;
        for (let child = self.getFirstChild(); null !== child; child = child.getNext()) {
          if (child.hasMixin(Transform) && child.hasMixin(Anchor)) {
            const anchored = child as Element & AnchorApi & PropertiesNode;
            if (anchored.getProperty("hacr") || anchored.getProperty("vacr")) {
              anchored.dependentUpdate = true;
              anchored.relayoutAnchored(layout as Matrix);
              anchored.dependentUpdate = false;
            }
          }
        }
        this._relayout = false;
      }
    }
    LayoutMixin.prototype._relayout = false;
    LayoutMixin.prototype._layoutTransform = null;
    LayoutMixin.prototype._relayoutNow = false;
    return LayoutMixin;
  },
);
