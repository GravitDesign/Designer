// Old: chunk.vendor.js module 1078 (the connector editor, no G name).
/**
 * The editor of a connector: a path editor without resize box and
 * rotation handle. Moving the whole connector moves the paths it connects
 * along, and its end points can't be deleted.
 */
import { registerClass } from "../../engine/core/object.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { Connector } from "../../engine/scene/connector.ts";
import type { Node } from "../../engine/scene/node.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathEditor, type EditedPath, type PathPartId } from "./path-editor.ts";

/** A connector as its editor drives it. */
export type EditedConnector = EditedPath & Connector;

/** A connected path as the connector editor moves it. */
interface TransformablePath {
  transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void;
}

export class ConnectorEditor extends PathEditor<EditedConnector> {
  static {
    // The old module had no G name; it was registered for GConnector only.
    registerClass(this, "GConnectorEditor");
    ElementEditor.exports(this, Connector);
  }

  override filterFlags(flags: number): number {
    if (0 != (flags & BoxEditor.Flag.ResizeAll)) flags &= ~BoxEditor.Flag.ResizeAll;
    if (0 != (flags & BoxEditor.Flag.RotateHandle)) flags &= ~BoxEditor.Flag.RotateHandle;
    return flags;
  }

  /**
   * Selected points move as in a path; otherwise the transform moves the
   * anchor points and both connected paths (when both exist).
   */
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const connector = target as EditedConnector;
    if (
      this._partSelection &&
      this._partSelection.length > 0 &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      super._applyTransform(target, ...rest);
    } else if (
      this._transform &&
      !this._transform.isIdentity() &&
      connector.getSrcPath() &&
      connector.getDstPath()
    ) {
      const exceptions = rest[1] as readonly Node[] | false | null | undefined;
      connector.transformAnchors(this._transform);
      (connector.getSrcPath() as unknown as TransformablePath).transform(
        this._transform,
        true,
        exceptions,
      );
      (connector.getDstPath() as unknown as TransformablePath).transform(
        this._transform,
        true,
        exceptions,
      );
      this.resetTransform();
    }
  }

  /** The first and last points (the connected ends) can't be deleted. */
  override isDeletePartsAllowed(): boolean {
    if (this._partSelection && this._partSelection.length) {
      const first = this._element.getAnchorPoints().getFirstChild();
      const last = this._element.getAnchorPoints().getLastChild();
      for (let i = 0; i < this._partSelection.length; i++) {
        const part = this._partSelection[i] as PathPartId;
        if (
          part.type == PathEditor.PartType.Point &&
          (part.point === first || part.point === last)
        ) {
          return false;
        }
      }
    }
    return super.isDeletePartsAllowed();
  }
}
