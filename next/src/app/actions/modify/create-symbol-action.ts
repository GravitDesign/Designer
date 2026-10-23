// Old: designer.browser.dev.js module 608 (GCreateSymbolAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { Symbol } from "../../../engine/scene/symbol.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";
import { promptDialog } from "./modify-deps.ts";

/**
 * Modify > Symbol > Create Symbol (F8): asks for a name, then turns the
 * selection into a new master symbol, or converts selected instances to
 * masters.
 */
export class CreateSymbolAction extends ElementAction {
  static ID = "modify.createsymbol";
  static TITLE = new LocaleKey("GCreateSymbolAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.F8];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    CreateSymbolAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GCreateSymbolAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GCreateSymbolAction", "tooltip-description")),
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return CreateSymbolAction.ID;
  }

  override getTitle(): LocaleKey {
    return CreateSymbolAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_SYMBOL;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-create-symbol" : "gravit-icon-symbolmaster";
  }

  override getShortcut(): Shortcut {
    return CreateSymbolAction.SHORTCUT;
  }

  // The old licence check: several masters at once were a Pro feature.
  // The local app has every Pro feature, so this is always false.
  override isPro(): boolean {
    if (!gDesigner().isEnabledProFeatures()) {
      const designerDocument = gDesigner().getActiveDocument();
      if (designerDocument) {
        const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
        if (selection && selection.length) {
          return selection.filter((node) => node instanceof Symbol).length > 1;
        }
      }
    }
    return false;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
      if (selection && selection.length) {
        let masters = 0;
        const probe = new Symbol() as unknown as ContainerNode;
        for (let i = selection.length - 1; i >= 0; --i) {
          const node = selection[i] as Node;
          const parent = node.getParent() as ContainerNode;
          if (
            (node instanceof Symbol && !node.getMasterSymbol()) ||
            (node.validateInsertion(probe) &&
              !parent.isLocked() &&
              probe.validateInsertion(parent) &&
              !Symbol.containsUnsupportedNodes(node))
          ) {
            if (!(node instanceof Symbol && node.isMaster())) return true;
            if (++masters > 1) return true;
          }
        }
      }
    }
    return false;
  }

  override execute(): void {
    // The old Pro interruption (licence dropped) is gone; see isPro.
    let number = 1;
    const baseName = Locale.get(
      new LocaleKey("GCreateSymbolAction", "createsymbol.defaultname"),
    ) as string;
    let name = baseName + " " + number;
    const designerDocument = gDesigner().getActiveDocument();
    if (!designerDocument) return;
    const scene = designerDocument.getScene();
    if (!scene) return;
    // One pass over the symbols in their order, as before: a name taken
    // by an earlier symbol only is not noticed.
    ((scene.getSymbols() || []) as unknown as Node[]).forEach((symbol) => {
      if (symbol instanceof Symbol && symbol.isMaster() && symbol.getProperty("name") === name) {
        number++;
        name = baseName + " " + number;
      }
    });
    promptDialog(
      Locale.get(new LocaleKey("GCreateSymbolAction", "createsymbol.enternewname")) as string,
      (value) => {
        const current = gDesigner().getActiveDocument();
        if (current && value) {
          const editor = current.getEditor();
          const nodes = Node.order(
            (editor.getIndividualSelection() as unknown as Node[]).slice(),
          ) as Node[];
          editor.beginTransaction();
          try {
            const probe = new Symbol() as unknown as ContainerNode;
            let parent: ContainerNode | null = null;
            for (let i = nodes.length - 1; i >= 0; --i) {
              const node = nodes[i] as Node;
              if (node instanceof Symbol && node.convertToMaster(value)) nodes.splice(i, 1);
              else if (node.validateInsertion(probe) && !Symbol.containsUnsupportedNodes(node)) {
                parent = node.getParent() as ContainerNode;
                if (!parent.isLocked() && probe.validateInsertion(parent)) break;
                parent = null;
              }
            }
            if (parent) editor.updateSelection(false, [Symbol.create(nodes, parent, value)]);
          } finally {
            editor.commitTransaction(
              Locale.get(new LocaleKey("GCreateSymbolAction", "title")) as string,
            );
          }
        }
      },
      name,
    );
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area && CreateSymbolAction.TOOLTIP_CONFIG && CreateSymbolAction.TOOLTIP_CONFIG[area]) || null
    );
  }

  override toString(): string {
    return "[Object GCreateSymbolAction]";
  }
}
