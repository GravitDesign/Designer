// Old: chunk.vendor.js module 327 (GActionable).
/**
 * Elements with action buttons (GActionItem) in a row above their top
 * right corner, 5 units apart, right-aligned to the corner. Used by the
 * collaborative text nodes.
 */
import { defineMixin, GObject, registerClass, type AnyConstructor } from "../../core/object.ts";
import type { Point } from "../../math/point.ts";
import { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import { ElementData } from "../../paint/element-data.ts";
import type { ActionItem } from "./action-item.ts";

/** The gap between two action buttons. */
const ACTION_GAP = 5;

export interface ActionableApi {
  _actions: ActionItem[] | null;
  addAction(action: ActionItem): void;
  getActions(): ActionItem[];
  getActionsBBox(): Rect | null;
  hitActionTest(
    location: Point,
    transform: Transform,
  ): ElementData<unknown, { action: ActionItem }> | null;
}

interface GeometrySource {
  getGeometryBBox(): Rect | null;
}

function actionableMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class ActionableMembers extends Base implements ActionableApi {
    declare _actions: ActionItem[] | null;

    addAction(action: ActionItem): void {
      if (!this._actions) this._actions = [];
      this._actions.push(action);
    }

    getActions(): ActionItem[] {
      return this._actions || [];
    }

    /**
     * The box of the button row, above the geometry box's top right
     * corner, as wide as the union of the buttons. The offset only starts
     * growing after the second button, so the second overlaps the first
     * and the row is narrower than what hitActionTest tests. Kept.
     */
    getActionsBBox(): Rect | null {
      const box = (this as unknown as GeometrySource).getGeometryBBox();
      if (!box) return null;
      if (!this._actions) return null;
      const corner = box.getSide(Rect.Side.TOP_RIGHT);
      let offset = 0;
      let row: Rect | null = null;
      this._actions.forEach((action) => {
        let source = action.getSourceBBox();
        if (row) {
          const width = source.getWidth();
          source = source.translated(offset, 0);
          row = row.united(source);
          offset += ACTION_GAP + width;
        } else row = source;
      });
      const united = row as Rect | null;
      return united
        ? new Rect(
            corner.getX() - united.getWidth(),
            corner.getY() - united.getHeight(),
            united.getWidth(),
            united.getHeight(),
          )
        : null;
    }

    /** The button under `location` (buttons laid out right to left from the corner). */
    hitActionTest(
      location: Point,
      transform: Transform,
    ): ElementData<unknown, { action: ActionItem }> | null {
      if (!this._actions) return null;
      const box = (this as unknown as GeometrySource).getGeometryBBox();
      if (!box) return null;
      const corner = box.getSide(Rect.Side.TOP_RIGHT);
      let offset = 0;
      for (let i = 0; i < this._actions.length; i++) {
        const action = this._actions[i] as ActionItem;
        const source = action.getSourceBBox();
        const area = new Rect(
          corner.getX() - source.getWidth() - offset,
          corner.getY() - source.getHeight(),
          source.getWidth(),
          source.getHeight(),
        );
        if (transform.mapRect(area).containsPoint(location)) {
          return new ElementData(this, { action });
        }
        offset += ACTION_GAP + source.getWidth();
      }
      return null;
    }
  }
  ActionableMembers.prototype._actions = null;
  return ActionableMembers;
}

/** GActionable as a class (it extended GObject in the old code). */
export class Actionable extends actionableMembers(GObject) {
  static {
    registerClass(this, "GActionable");
  }
}

/** GActionable as a mixin: `class X extends ActionableMixin(Base)`. */
export const ActionableMixin = defineMixin(Actionable, actionableMembers);
