// Old: designer.browser.dev.js module 1284 (GRedoAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeDocument, gDesigner } from "../host.ts";
import { isTextFieldFocused } from "./undo-action.ts";

export class RedoAction extends Action {
  static ID = "edit.redo";
  static TITLE = new LocaleKey("GRedoAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.SHIFT, Key.Constant.META, "z"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    RedoAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GRedoAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GRedoAction", "tooltip-description")),
        shortcut: RedoAction.SHORTCUT,
      }),
    };
  }

  override getId(): string {
    return RedoAction.ID;
  }

  /** "Redo <name of the next redo state>", or plain "Redo". */
  override getTitle(): string {
    const document = gDesigner().getActiveDocument();
    return document && document.getEditor().hasRedoState()
      ? (Locale.get(new LocaleKey("GRedoAction", "redo-action")) as string).replace(
          "%action",
          document.getEditor().getRedoStateName() as string,
        )
      : (Locale.get(RedoAction.TITLE) as string);
  }

  override getIcon(): string {
    return "gravit-icon-redo";
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "undo_redo";
  }

  override getShortcut(): Shortcut {
    return RedoAction.SHORTCUT;
  }

  override isEnabled(): boolean {
    const designer = gDesigner();
    const document = designer.getActiveDocument();
    return (
      !(document && !document.isEditingEnabled()) &&
      (isTextFieldFocused() ||
        !!(document && document.getEditor() && document.getEditor().hasRedoState()))
    );
  }

  override execute(): void {
    if (isTextFieldFocused()) document.execCommand("redo");
    else activeDocument().getEditor().redoState();
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && RedoAction.TOOLTIP_CONFIG && RedoAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GRedoAction]";
  }
}
