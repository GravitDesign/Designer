// Old: designer.browser.dev.js module 1648 (GChangeAnchorPointsJointTypeSubAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { SidebarsIds } from "../../shell/sidebar-ids.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";
import { SubAction } from "../sub-action.ts";
import { ChangeAnchorPointsJointTypeMainAction } from "./change-anchor-points-joint-type-main-action.ts";
import type { InspectorSidebarLike } from "./modify-deps.ts";

const Type = {
  Straight: "straight",
  Mirrored: "mirrored",
  Disconnected: "disconnected",
  Connector: "connector",
  Asymmetric: "asymmetric",
} as const;

/**
 * One joint type of Cmd+Alt+A: the inspector's path panel sets it on the
 * selected anchor points. The titles follow the menu wording, not the
 * engine names: "Disconnected" is the engine's Asymmetric type and
 * "Asymmetric" its Symmetric one.
 */
export class ChangeAnchorPointsJointTypeSubAction extends SubAction {
  static override Type: Readonly<Record<string, string>> = Type;

  constructor(type: string) {
    super(type);
    this._title = new LocaleKey(
      "GChangeAnchorPointsJointTypeSubAction",
      "title.".concat(this._type),
    );
  }

  protected override _getMainActionId(): string {
    return ChangeAnchorPointsJointTypeMainAction.ID;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getShortcutSubKey(): string | null {
    switch (this._type) {
      case Type.Straight:
        return Key.Constant.S;
      case Type.Mirrored:
        return Key.Constant.M;
      case Type.Disconnected:
        return Key.Constant.D;
      case Type.Connector:
        return Key.Constant.C;
      case Type.Asymmetric:
        return Key.Constant.A;
      default:
        return null;
    }
  }

  override execute(): void {
    const inspector = gDesigner()
      .getRightSidebars()
      .getSidebar(SidebarsIds.GInspectorSidebar) as Partial<InspectorSidebarLike> | null;
    const nodeType = this._getNodeType();
    // Until the inspector cluster ports the sidebar there is nothing to set it on.
    if (nodeType && inspector && inspector.setPathPointsNodeType) {
      inspector.setPathPointsNodeType(nodeType);
    }
  }

  _getNodeType(): string | null {
    switch (this._type) {
      case Type.Straight:
        return "-";
      case Type.Mirrored:
        return PathBase.AnchorPoint.Type.Mirror;
      case Type.Disconnected:
        return PathBase.AnchorPoint.Type.Asymmetric;
      case Type.Connector:
        return PathBase.AnchorPoint.Type.Connector;
      case Type.Asymmetric:
        return PathBase.AnchorPoint.Type.Symmetric;
      default:
        return null;
    }
  }

  override toString(): string {
    return "[Object GChangeAnchorPointsJointTypeSubAction]";
  }
}
