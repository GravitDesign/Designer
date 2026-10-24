// Old: designer.browser.dev.js module 1317 (GOffsetAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { VertexOffsetter } from "../../../engine/geometry/vertex-offsetter.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { gDesigner } from "../host.ts";
import { OutlineAction, topBorderCap } from "./outline-action.ts";

/**
 * Modify > Path > Expand/Shrink (no shortcut): Convert to Outline with one
 * side only, outwards for a positive value and inwards for a negative one.
 */
export class OffsetAction extends OutlineAction {
  static override ID = "modify.offset";
  static override TITLE = new LocaleKey("GOffsetAction", "title");

  override getId(): string {
    return OffsetAction.ID;
  }

  override getTitle(): LocaleKey {
    return OffsetAction.TITLE;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getShortcut(): null {
    return null;
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-expand-shrink" : null;
  }

  protected override _dialogPromptMessage(): string {
    return Locale.get(new LocaleKey("GOffsetAction", "text.dialog-prompt-message")) as string;
  }

  protected override _makeOffsetter(offset: number, source: Node): VertexOffsetter {
    const cap = topBorderCap(source);
    const clockwise = PathUtil.makeClockWise(source) as unknown as VertexReader;
    return offset > 0
      ? new VertexOffsetter(clockwise, offset, false, true, 0, cap)
      : new VertexOffsetter(clockwise, -offset, true, false, 0, cap);
  }

  /**
   * Never called: the invalid-value alert uses Convert to Outline's text.
   * See "Expand/Shrink shows the outline action's invalid-value text" in QUESTIONS.md.
   */
  _dialogAlertMessage(): string {
    return Locale.get(new LocaleKey("GOffsetAction", "text.invalid-value")) as string;
  }

  override toString(): string {
    return "[Object GOffsetAction]";
  }
}
