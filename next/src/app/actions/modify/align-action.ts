// Old: designer.browser.dev.js module 866 (GAlignAction).
import { Key, type KeyValue } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { Page } from "../../../engine/scene/page.ts";
import { Editor } from "../../../editor/editor.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeDocument, gDesigner } from "../host.ts";

const AlignType = Editor.ArrangeAlignType;

/** The sidebar tooltip of one alignment. */
function alignTooltip(name: string): unknown {
  return richTooltipConfig({
    title: Locale.get(new LocaleKey("GAlignAction", `text.${name}-tooltip-title`)),
    description: Locale.get(new LocaleKey("GAlignAction", `text.${name}-tooltip-description`)),
    learnMore: "",
  });
}

/**
 * Modify > Align: one action per Editor.ArrangeAlignType ("arrange.align.<type>").
 * A single element without part alignment (anchor points) is aligned to
 * the page of a fixed-size scene, otherwise to the scene's paint box.
 */
export class AlignAction extends Action {
  static ID = "arrange.align";
  static TOOLTIP_CONFIG: Record<string, Record<string, unknown>> | null = null;

  protected _type: string;
  protected _title: LocaleKey;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = new LocaleKey("GAlignAction", "title." + type);
    AlignAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.SIDEBAR]: {
        [AlignType.AlignLeft]: alignTooltip("align-left"),
        [AlignType.AlignCenter]: alignTooltip("align-center"),
        [AlignType.AlignRight]: alignTooltip("align-right"),
        [AlignType.AlignTop]: alignTooltip("align-top"),
        [AlignType.AlignMiddle]: alignTooltip("align-middle"),
        [AlignType.AlignBottom]: alignTooltip("align-bottom"),
      },
    };
  }

  override getId(): string {
    return AlignAction.ID + "." + this._type;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_ALIGN;
  }

  override getGroup(): string {
    let group = "";
    switch (this._type) {
      case AlignType.AlignLeft:
      case AlignType.AlignCenter:
      case AlignType.AlignRight:
        group = "horizontal";
        break;
      case AlignType.AlignTop:
      case AlignType.AlignMiddle:
      case AlignType.AlignBottom:
        group = "vertical";
        break;
      case AlignType.AlignJustifyHorizontal:
      case AlignType.AlignJustifyVertical:
        group = "justify";
    }
    return "arrange/align-" + group;
  }

  override getShortcut(): Shortcut | null {
    const shortcut: KeyValue[] = [Key.Constant.OPTION];
    switch (this._type) {
      case AlignType.AlignLeft:
        return shortcut.concat("A");
      case AlignType.AlignCenter:
        return shortcut.concat("H");
      case AlignType.AlignRight:
        return shortcut.concat("D");
      case AlignType.AlignTop:
        return shortcut.concat("W");
      case AlignType.AlignMiddle:
        return shortcut.concat("V");
      case AlignType.AlignBottom:
        return shortcut.concat("S");
      default:
        return null;
    }
  }

  /** `nodes` defaults to the individual selection (the align panel passes its own). */
  override isEnabled(nodes?: unknown): boolean {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const list = (nodes || (editor ? editor.getIndividualSelection() : null)) as Node[] | null;
    return !(!list || !list.length);
  }

  /**
   * `nodes`, `asGroup` and `area` go to Editor.arrangeAlign; without an
   * area a single element is aligned to the page or the scene.
   */
  override execute(nodes?: unknown, asGroup?: unknown, area?: unknown): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const list = (nodes || (editor ? editor.getIndividualSelection() : null)) as Node[] | null;
    let toArea = area as Rect | null | undefined;
    if (editor && list && 1 === list.length && !toArea) {
      const elementEditor = ElementEditor.getEditor(list[0]) as {
        isAlignPartsAllowed(): boolean;
      } | null;
      if (!elementEditor || !elementEditor.isAlignPartsAllowed()) {
        if (editor.getScene().isFixedSized()) {
          toArea = (editor.getScene().getActivePage() as Page).getGeometryBBox();
        } else toArea = editor.getScene().getPaintBBox();
      }
    }
    activeDocument().getEditor().arrangeAlign(this._type, list, asGroup, toArea);
  }

  protected _isAlignOnlyCategory(): boolean {
    switch (this._type) {
      case AlignType.AlignLeft:
      case AlignType.AlignCenter:
      case AlignType.AlignRight:
      case AlignType.AlignTop:
      case AlignType.AlignMiddle:
      case AlignType.AlignBottom:
        return true;
      default:
        return false;
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area &&
        AlignAction.TOOLTIP_CONFIG &&
        AlignAction.TOOLTIP_CONFIG[area] &&
        AlignAction.TOOLTIP_CONFIG[area][this._type]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GAlignAction]";
  }
}
