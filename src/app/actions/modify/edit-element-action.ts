// Old: designer.browser.dev.js module 1312 (GEditElementActon).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Point } from "../../../engine/math/point.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Text } from "../../../engine/text/text.ts";
import { SubSelectTool } from "../../../editor/tools/sub-select-tool.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";
import { toolManager } from "./modify-deps.ts";

/**
 * Edit > Edit ("edit.edit"): opens the inline editor of the first
 * selected text, or switches to the subselect tool for anything else.
 * The class name keeps the old typo ("Acton").
 */
export class EditElementActon extends ElementAction {
  static ID = "edit.edit";

  protected _title: LocaleKey;

  constructor() {
    super();
    this._title = new LocaleKey("GEditElementActon", "title");
  }

  override getId(): string {
    return EditElementActon.ID;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "select";
  }

  override getShortcut(): null {
    return null;
  }

  /** `nodes` defaults to the individual selection. */
  override isEnabled(nodes?: unknown): boolean {
    if (!super.isEnabled()) return false;
    let enabled = false;
    const list = (nodes ||
      (gDesigner().getActiveDocument()
        ? activeDocument().getEditor().getIndividualSelection()
        : null)) as Node[] | null;
    if (list && list.length > 0 && !activeDocument().getEditor().isInlineEditing()) {
      if (toolManager().getActiveTool() != toolManager().getTool(SubSelectTool)) enabled = true;
      else {
        for (let i = 0; i < list.length; ++i) if (list[i] instanceof Text) enabled = true;
      }
    }
    return enabled;
  }

  override execute(nodes?: unknown): void {
    let opened = false;
    const list = (nodes ||
      (gDesigner().getActiveDocument()
        ? activeDocument().getEditor().getIndividualSelection()
        : null)) as Node[] | null;
    if (list && list.length > 0) {
      for (let i = 0; i < list.length && !opened; ++i) {
        const node = list[i] as Node;
        if (node instanceof Text) {
          const box = node.getGeometryBBox();
          const windows = gDesigner().getWindows();
          const window = windows ? windows.getActiveWindow() : null;
          const view = window ? window.getView() : null;
          if (box && view) {
            opened = activeDocument()
              .getEditor()
              .openInlineEditor(node as never, view, new Point(box.getX(), box.getY()));
          }
        }
      }
      if (!opened && toolManager().getActiveTool() != toolManager().getTool(SubSelectTool)) {
        toolManager().activateTool(SubSelectTool, null, true);
      }
    }
  }

  override toString(): string {
    return "[Object GEditElementActon]";
  }
}
