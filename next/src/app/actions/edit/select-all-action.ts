// Old: designer.browser.dev.js module 1333 (GSelectAllAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { AnnotationMixin } from "../../../engine/scene/annotations/annotation.ts";
import { Block } from "../../../engine/scene/block.ts";
import { Item } from "../../../engine/scene/item.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { isButtonElement, isEditable } from "../focus.ts";
import { activeDocument, gDesigner, props, type ActionWindow } from "../host.ts";

/**
 * Whether Select All and Deselect All go to the focused text field: an
 * editable element that is not a button or the canvas's IME field.
 */
export function isSelectAllInTextField(): boolean {
  const active = document.activeElement;
  return (
    !!active && isEditable(active) && !isButtonElement(active) && !gDesigner().isGravitIME(active)
  );
}

/**
 * The visibility and lock test Select All and Invert Selection share: not
 * hidden (itself or a block above it) and not locked against editing,
 * resizing, moving and deleting all at once.
 */
export function isSelectableTopItem(node: Node): boolean {
  const hidden =
    !props(node).getProperty("vis") ||
    node.findParent((parent) => parent instanceof Block && !parent.getProperty("vis"));
  const lock = props(node).getProperty("plkt") as number;
  const fullyLocked =
    lock & Block.ProgramLck.NoEdit &&
    lock & Block.ProgramLck.NoSizeChanges &&
    lock & Block.ProgramLck.NoMove &&
    lock & Block.ProgramLck.NoDelete;
  return !(hidden || fullyLocked);
}

/** The multiPageView flag of the active document's window. */
export function isMultiPageView(): unknown {
  return (activeDocument().getActiveWindow() as ActionWindow).getView().getViewConfiguration()
    .multiPageView;
}

export class SelectAllAction extends Action {
  static ID = "edit.select-all";
  static TITLE = new LocaleKey("GSelectAllAction", "title");

  override getId(): string {
    return SelectAllAction.ID;
  }

  override getTitle(): LocaleKey {
    return SelectAllAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "select";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "A"];
  }

  override isEnabled(): boolean {
    return (
      !(!document.activeElement || !isEditable(document.activeElement)) ||
      !!gDesigner().getActiveDocument()
    );
  }

  /**
   * Selects every visible, unlocked top-level item of the active page (of
   * all pages in multi-page view), annotations aside.
   */
  override execute(): void {
    if (isSelectAllInTextField()) {
      document.execCommand("selectAll");
      return;
    }
    const designerDocument = activeDocument();
    const editor = designerDocument.getEditor();
    const scene = designerDocument.getScene();
    const page = scene.getActivePage();
    const multiPageView = isMultiPageView();
    const selection: Node[] = [];
    scene.accept((node: Node) => {
      if (
        node instanceof Item &&
        !node.hasMixin(AnnotationMixin) &&
        !(node.getParent() instanceof Item) &&
        (node.getPage() === page || multiPageView) &&
        !node.isLocked() &&
        isSelectableTopItem(node)
      ) {
        selection.push(node);
      }
    });
    editor.updateSelection(false, selection);
  }

  override toString(): string {
    return "[Object GSelectAllAction]";
  }
}
