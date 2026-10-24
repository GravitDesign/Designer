// Old: designer.browser.dev.js module 1599 (GInvertSelectionAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { AnnotationMixin } from "../../../engine/scene/annotations/annotation.ts";
import { Item } from "../../../engine/scene/item.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeDocument, gDesigner } from "../host.ts";
import { isMultiPageView, isSelectableTopItem } from "./select-all-action.ts";

export class InvertSelectionAction extends Action {
  static ID = "edit.invert-selection";
  static TITLE = new LocaleKey("GInvertSelectionAction", "title");

  override getId(): string {
    return InvertSelectionAction.ID;
  }

  override getTitle(): LocaleKey {
    return InvertSelectionAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "select";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, "I"];
  }

  override isEnabled(): boolean {
    return !!gDesigner().getActiveDocument();
  }

  /** Selects what Select All would, minus what is selected now. */
  override execute(): void {
    const designerDocument = activeDocument();
    const scene = designerDocument.getScene();
    const page = scene.getActivePage();
    const multiPageView = isMultiPageView();
    const selection: Node[] = [];
    scene.accept((node: Node) => {
      if (
        node instanceof Item &&
        !node.hasMixin(AnnotationMixin) &&
        !(node.getParent() instanceof Item) &&
        !node.hasFlag(Node.Flag.Selected as number) &&
        (node.getPage() === page || multiPageView) &&
        !node.isLocked() &&
        isSelectableTopItem(node)
      ) {
        selection.push(node);
      }
    });
    designerDocument.getEditor().updateSelection(false, selection);
  }

  override toString(): string {
    return "[Object GInvertSelectionAction]";
  }
}
