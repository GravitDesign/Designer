// Old: designer.browser.dev.js module 870 (GSplitAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Group } from "../../../engine/scene/group.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { Shape } from "../../../engine/scene/shape.ts";
import { Symbol as SymbolNode } from "../../../engine/scene/symbol.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };
type SplitNode = ContainerNode & Updatable;

/** A symbol instance (a symbol with a master). */
function isInstance(node: Node): boolean {
  return (
    node instanceof SymbolNode &&
    !(node as unknown as { getMasterSymbol(): unknown }).getMasterSymbol()
  );
}

/** A shape with children (clipped content). */
function isClippingShape(node: Node): boolean {
  return node instanceof Shape && null !== node.getFirstChild();
}

/**
 * Modify > Ungroup (Shift+Cmd+G): groups, compound shapes and symbol
 * instances are replaced by their children; a shape that clips content
 * lets go of it (the content goes on top of the shape).
 */
export class SplitAction extends ElementAction {
  static ID = "modify.split";
  static TITLE = new LocaleKey("GSplitAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.SHIFT, Key.Constant.META, "G"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    SplitAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GSplitAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GSplitAction", "tooltip-description")),
        shortcut: SplitAction.SHORTCUT,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return SplitAction.ID;
  }

  override getTitle(): LocaleKey {
    return SplitAction.TITLE;
  }

  override getIcon(): string {
    return "gravit-icon-ungroup";
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override getShortcut(): Shortcut {
    return SplitAction.SHORTCUT;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
      if (selection) {
        for (let i = 0; i < selection.length; ++i) {
          const node = selection[i] as Node;
          if (
            node instanceof Group ||
            node instanceof CompoundShape ||
            isInstance(node) ||
            isClippingShape(node)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  override execute(): void {
    const editor = activeDocument().getEditor();
    const selection = (editor.getIndividualSelection() as unknown as Node[]).slice();
    editor.beginTransaction();
    try {
      let parents: Set<Node> | undefined;
      const result: Node[] = [];
      const scene = activeDocument().getScene();
      editor.clearSelection();
      try {
        parents = new Set();
        for (let i = 0; i < selection.length; ++i) {
          const node = selection[i] as Node;
          if (
            isClippingShape(node) ||
            node instanceof Group ||
            node instanceof CompoundShape ||
            isInstance(node)
          ) {
            parents.add(node.getParent() as Node);
          }
        }
        blockChanges(editor, [...parents] as unknown as Updatable[], scene, null);
        for (let i = 0; i < selection.length; ++i) {
          const node = selection[i] as SplitNode;
          if (node instanceof Group || node instanceof CompoundShape || isInstance(node)) {
            const parent = node.getParent() as ContainerNode;
            const children = node.getChildren();
            try {
              node.beginUpdate();
              for (let j = 0; j < children.length; ++j) {
                const child = children[j] as Node;
                node.removeChild(child);
                parent.insertChild(child, node);
                result.push(child);
              }
            } finally {
              node.endUpdate();
            }
            parent.removeChild(node);
          } else if (isClippingShape(node)) {
            const parent = node.getParent() as ContainerNode;
            const children = node.getChildren();
            try {
              node.beginUpdate();
              for (let j = children.length - 1; j >= 0; --j) {
                const child = children[j] as Node;
                node.removeChild(child);
                parent.insertChild(child, node.getNext());
                result.push(child);
              }
            } finally {
              node.endUpdate();
            }
            result.push(node);
          } else result.push(node);
        }
      } finally {
        releaseChanges(editor, parents ? ([...parents] as unknown as Updatable[]) : parents, scene);
      }
      if (result.length > 0) editor.updateSelection(false, result);
    } finally {
      editor.commitTransaction(Locale.get(SplitAction.TITLE) as string);
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && SplitAction.TOOLTIP_CONFIG && SplitAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GSplitAction]";
  }
}
