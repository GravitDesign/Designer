// Old: designer.browser.dev.js module 1611 (GReverseOrderAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Path } from "../../../engine/scene/path.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

/** Modify > Path > Reverse Order: reverses the direction of the selected paths. */
export class ReverseOrderAction extends ElementAction {
  static ID = "modify.reverse-order";
  static TITLE = new LocaleKey("GReverseOrderAction", "title");

  override getId(): string {
    return ReverseOrderAction.ID;
  }

  override getTitle(): LocaleKey {
    return ReverseOrderAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/path";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument ? designerDocument.getEditor().getSelection() : null;
    let enabled = false;
    if (selection) {
      for (let i = 0; !enabled && i < selection.length; ++i) {
        if (selection[i] instanceof Path) enabled = true;
      }
    }
    return enabled;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? editor.getSelection() : null;
    const paths: Path[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Path) paths.push(node);
      }
    }
    if (paths.length) {
      const ed = editor as NonNullable<typeof editor>;
      ed.beginTransaction();
      try {
        for (let i = 0; i < paths.length; ++i) (paths[i] as Path).reverseOrder();
      } finally {
        ed.commitTransaction(Locale.get(this.getTitle()) as string);
      }
    }
  }

  override toString(): string {
    return "[Object GReverseOrderAction]";
  }
}
