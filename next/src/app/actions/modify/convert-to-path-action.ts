// Old: designer.browser.dev.js module 810 (GConvertToPathAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Path } from "../../../engine/scene/path.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { PathsGraph } from "../../../engine/scene/paths-graph/paths-graph.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

/** Modify > Path > Convert to Path (Cmd+Shift+P): shapes become editable paths. */
export class ConvertToPathAction extends ElementAction {
  static ID = "modify.converttopath";
  static TITLE = new LocaleKey("GConvertToPathAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.META, Key.Constant.SHIFT, "P"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    ConvertToPathAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GConvertToPathAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GConvertToPathAction", "tooltip-description")),
        shortcut: ConvertToPathAction.SHORTCUT,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return ConvertToPathAction.ID;
  }

  override getTitle(): LocaleKey {
    return ConvertToPathAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getIcon(): string {
    return "gravit-icon-convert-to-path";
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getShortcut(): Shortcut {
    return ConvertToPathAction.SHORTCUT;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection) {
        for (let i = 0; i < selection.length; ++i) {
          const node = selection[i] as Node;
          if (
            !(node instanceof Path) &&
            !(node instanceof Image) &&
            !(node instanceof PathsGraph) &&
            (node instanceof PathBase ||
              (node.hasMixin(VertexSource) && !(node instanceof CompoundPath)))
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  override execute(): void {
    activeDocument().getEditor().convertSelectionToPaths();
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area && ConvertToPathAction.TOOLTIP_CONFIG && ConvertToPathAction.TOOLTIP_CONFIG[area]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GConvertToPathAction]";
  }
}
