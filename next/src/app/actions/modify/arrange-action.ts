// Old: designer.browser.dev.js module 869 (GArrangeAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, richTooltipVideoUrl, TOOLTIP_AREA } from "../deps.ts";
import { activeDocument, gDesigner } from "../host.ts";

const OrderType = Editor.ArrangeOrderType;

/**
 * Modify > Arrange: one action per Editor.ArrangeOrderType
 * ("arrange.order.<type>"), running Editor.arrangeOrder.
 */
export class ArrangeAction extends Action {
  static SHORTCUT: Record<string, Shortcut> = {
    [OrderType.SendToFront]: [Key.Constant.SHIFT, Key.Constant.META, Key.Constant.UP],
    [OrderType.BringForward]: [Key.Constant.META, Key.Constant.UP],
    [OrderType.SendBackward]: [Key.Constant.META, Key.Constant.DOWN],
    [OrderType.SendToBack]: [Key.Constant.SHIFT, Key.Constant.META, Key.Constant.DOWN],
  };
  static TOOLTIP_CONFIG: Record<string, Record<string, unknown>> | null = null;
  static ID = "arrange.order";

  protected _type: string;
  protected _title: LocaleKey;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = new LocaleKey("GArrangeAction", "title." + type);
    ArrangeAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: {
        [OrderType.BringForward]: richTooltipConfig({
          title: Locale.get(new LocaleKey("GArrangeAction", "bring-forward-tooltip-title")),
          description: Locale.get(
            new LocaleKey("GArrangeAction", "bring-forward-tooltip-description"),
          ),
          shortcut: ArrangeAction.SHORTCUT[OrderType.BringForward],
          video: richTooltipVideoUrl("Bring_Forward.mp4"),
          learnMore: "",
        }),
        [OrderType.SendBackward]: richTooltipConfig({
          title: Locale.get(new LocaleKey("GArrangeAction", "send-backward-tooltip-title")),
          description: Locale.get(
            new LocaleKey("GArrangeAction", "send-backward-tooltip-description"),
          ),
          shortcut: ArrangeAction.SHORTCUT[OrderType.SendBackward],
          video: richTooltipVideoUrl("Send_Backward.mp4"),
          learnMore: "",
        }),
      },
    };
  }

  override getId(): string {
    return ArrangeAction.ID + "." + this._type;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_ARRANGE;
  }

  override getGroup(): string {
    return "arrange/arrange";
  }

  override getShortcut(): Shortcut | null {
    return ArrangeAction.SHORTCUT[this._type] || null;
  }

  /** `nodes` defaults to the individual selection. */
  override isEnabled(nodes?: unknown): boolean {
    const list = (nodes ||
      (gDesigner().getActiveDocument()
        ? activeDocument().getEditor().getIndividualSelection()
        : null)) as Node[] | null;
    return !!list && list.length > 0;
  }

  override execute(nodes?: unknown): void {
    activeDocument()
      .getEditor()
      .arrangeOrder(this._type, nodes as Node[] | undefined, false);
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area &&
        ArrangeAction.TOOLTIP_CONFIG &&
        ArrangeAction.TOOLTIP_CONFIG[area] &&
        ArrangeAction.TOOLTIP_CONFIG[area][this._type]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GArrangeAction]";
  }
}
