// Old: designer.browser.dev.js module 1341 (GChangeActivePageAction).
import { Key, type KeyValue } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import type { Scene } from "../../../engine/scene/scene.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";
import { outlineSidebar } from "./modify-deps.ts";

const Type = { Next: "next", Previous: "previous" } as const;

/**
 * Cmd+Alt+Down / Cmd+Alt+Up, also Page Down / Page Up (shortcut only):
 * makes the next or previous page active through the outline sidebar.
 */
export class ChangeActivePageAction extends Action {
  static ID = "view.change-active-page";
  static Type = Type;

  private readonly _type: string;
  private readonly _title: LocaleKey;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = new LocaleKey("GChangeActivePageAction", "title.".concat(this._type));
  }

  override getId(): string {
    return "".concat(ChangeActivePageAction.ID, ".").concat(this._type);
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut | null {
    const prefix: KeyValue[] = [Key.Constant.META, Key.Constant.OPTION];
    switch (this._type) {
      case Type.Next:
        return prefix.concat(Key.Constant.DOWN);
      case Type.Previous:
        return prefix.concat(Key.Constant.UP);
      default:
        return null;
    }
  }

  // The old list holds a bare key, not a key list; the shortcut code
  // treats a bare key as a one-key shortcut.
  override getAdditionalShortcuts(): Shortcut[] | null {
    switch (this._type) {
      case Type.Next:
        return [Key.Constant.PAGE_DOWN] as unknown as Shortcut[];
      case Type.Previous:
        return [Key.Constant.PAGE_UP] as unknown as Shortcut[];
      default:
        return null;
    }
  }

  override execute(): void {
    const sidebar = outlineSidebar();
    const designerDocument = gDesigner().getActiveDocument();
    const scene = designerDocument && designerDocument.getScene();
    // Until the sidebars cluster ports the outline sidebar, the stand-in
    // has no changeActivePage and nothing happens.
    if (sidebar && scene && sidebar.changeActivePage) {
      const page = this.getNextPage(scene);
      sidebar.changeActivePage(page);
    }
  }

  getNextPage(scene: Scene): Page | null {
    const active = scene.getActivePage() as unknown as Node;
    for (
      let node = this._getNextPageAccordingToType(active);
      null !== node;
      node = this._getNextPageAccordingToType(node)
    ) {
      if (node instanceof Page) return node;
    }
    return null;
  }

  _getNextPageAccordingToType(node: Node): Node | null {
    switch (this._type) {
      case Type.Next:
        return node.getNext();
      case Type.Previous:
        return node.getPrevious();
      default:
        return null;
    }
  }

  override toString(): string {
    return "[Object GChangeActivePageAction]";
  }
}
