// Old: designer.browser.dev.js module 1645 (GEyeDropperAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Text } from "../../../engine/text/text.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";

/** The inspector sidebar's id (module 198 SidebarsIds.GInspectorSidebar). */
const INSPECTOR_SIDEBAR_ID = "inspector";

/** The eye droppers the inspector sidebar opens at a page position. */
interface EyeDropperHost {
  openFillEyeDropper(pageX: number, pageY: number): void;
  openTextColorEyeDropper(pageX: number, pageY: number): void;
  openBorderEyeDropper(pageX: number, pageY: number): void;
}

/** What the action asks of a stylable element. */
type StyledNode = Node & { hasStyleFill(): boolean; hasStyleBorder(): boolean };

const Type = { Border: "border", Fill: "fill", Text: "text" } as const;
type EyeDropperType = (typeof Type)[keyof typeof Type];

/**
 * Shortcut-only actions that open the inspector's eye dropper for the
 * fill (or text color, or border) of the selection at the cursor.
 */
export class EyeDropperAction extends Action {
  static ID = "edit.eyedropper";
  static Type = Type;

  private readonly _type: EyeDropperType;
  private readonly _title: LocaleKey;
  pageX = 0;
  pageY = 0;

  constructor(type: EyeDropperType) {
    super();
    this._type = type;
    this._title = new LocaleKey("GEyeDropperAction", "title.".concat(type));
    this.pageX = 0;
    this.pageY = 0;
  }

  override getId(): string {
    return "".concat(EyeDropperAction.ID, ".").concat(this._type);
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getShortcut(): Shortcut | null {
    switch (this._type) {
      case Type.Fill:
        return [Key.Constant.META, Key.Constant.OPTION, "C"];
      case Type.Border:
        return [Key.Constant.SHIFT, Key.Constant.META, Key.Constant.OPTION, "C"];
      default:
        return null;
    }
  }

  override getAdditionalShortcuts(): Shortcut[] | null {
    switch (this._type) {
      case Type.Fill:
        return [["I"]];
      default:
        return null;
    }
  }

  override isVisible(): boolean {
    return false;
  }

  override execute(): void {
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && (editor.getSelection() as Node[] | null);
    const inspector = designer
      .getRightSidebars()
      .getSidebar(INSPECTOR_SIDEBAR_ID) as EyeDropperHost;
    const styled =
      selection && (selection.filter((node) => node && node.hasMixin(Stylable)) as StyledNode[]);
    if (!(styled && styled.length > 0)) return;
    const { pageX, pageY } = this._getLastCursorPoint();
    switch (this._type) {
      case Type.Fill:
        if (styled.find((node) => node.hasStyleFill() && !(node instanceof Text))) {
          inspector.openFillEyeDropper(pageX, pageY);
        } else if (styled.find((node) => node instanceof Text)) {
          inspector.openTextColorEyeDropper(pageX, pageY);
        } else if (!styled.find((node) => !node.hasStyleBorder())) {
          inspector.openBorderEyeDropper(pageX, pageY);
        }
        break;
      case Type.Border:
        if (!styled.find((node) => !node.hasStyleBorder())) {
          inspector.openBorderEyeDropper(pageX, pageY);
        }
    }
  }

  private _getLastCursorPoint(): { pageX: number; pageY: number } {
    const point = gDesigner().getCursorManager().getLastCursorPoint();
    return { pageX: (point && point.getX()) || 0, pageY: (point && point.getY()) || 0 };
  }

  override toString(): string {
    return "[Object GEyeDropperAction]";
  }
}
