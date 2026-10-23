// Old: designer.browser.dev.js module 1171 (GUndoAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { isButtonLike, isEditable, isSelectElement } from "../focus.ts";
import { activeDocument, gDesigner } from "../host.ts";

/**
 * Whether undo and redo go to the focused text field (document.execCommand)
 * instead of the document: an editable element that is not a button, a
 * select or the canvas's IME field.
 */
export function isTextFieldFocused(): boolean {
  const active = document.activeElement;
  return !(
    !active ||
    !isEditable(active) ||
    isButtonLike(active) ||
    isSelectElement(active) ||
    gDesigner().isGravitIME(active)
  );
}

export class UndoAction extends Action {
  static ID = "edit.undo";
  static TITLE = new LocaleKey("GUndoAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.META, "z"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    UndoAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GUndoAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GUndoAction", "tooltip-description")),
        shortcut: UndoAction.SHORTCUT,
      }),
    };
  }

  override getId(): string {
    return UndoAction.ID;
  }

  /** "Undo <name of the last undo state>", or plain "Undo". */
  override getTitle(): string {
    const document = gDesigner().getActiveDocument();
    return document && document.getEditor() && document.getEditor().hasUndoState()
      ? (Locale.get(new LocaleKey("GUndoAction", "undo-action")) as string).replace(
          "%action",
          document.getEditor().getUndoStateName() as string,
        )
      : (Locale.get(UndoAction.TITLE) as string);
  }

  override getIcon(): string {
    return "gravit-icon-undo";
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "undo_redo";
  }

  override getShortcut(): Shortcut {
    return UndoAction.SHORTCUT;
  }

  override isEnabled(): boolean {
    const designer = gDesigner();
    const document = designer.getActiveDocument();
    return (
      !(document && !document.isEditingEnabled()) &&
      (isTextFieldFocused() ||
        !!(document && document.getEditor() && document.getEditor().hasUndoState()))
    );
  }

  override execute(): void {
    if (isTextFieldFocused()) document.execCommand("undo");
    else activeDocument().getEditor().undoState();
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && UndoAction.TOOLTIP_CONFIG && UndoAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GUndoAction]";
  }
}
