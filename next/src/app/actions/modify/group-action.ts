// Old: designer.browser.dev.js module 811 (GGroupAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };
type LockableParent = ContainerNode & { isLocked(): boolean };

/**
 * Modify > Group Selection (Cmd+G): puts the selected elements that may go
 * into a group into a new group, inserted where the last of them was.
 */
export class GroupAction extends ElementAction {
  static ID = "modify.group";
  static TITLE = new LocaleKey("GGroupAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.META, "G"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    GroupAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GGroupAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GGroupAction", "tooltip-description")),
        shortcut: GroupAction.SHORTCUT,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return GroupAction.ID;
  }

  override getTitle(): LocaleKey {
    return GroupAction.TITLE;
  }

  override getIcon(): string {
    return "gravit-icon-group";
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override getShortcut(): Shortcut {
    return GroupAction.SHORTCUT;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
      if (selection && selection.length > 0) {
        const group = new Group();
        for (let i = selection.length - 1; i >= 0; --i) {
          const node = selection[i] as Node;
          const parent = node.getParent() as LockableParent;
          if (
            node.validateInsertion(group) &&
            !parent.isLocked() &&
            group.validateInsertion(parent)
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
    const ordered = Node.order(
      (editor.getIndividualSelection() as unknown as Node[]).slice(),
    ) as Node[];
    editor.beginTransaction();
    try {
      const group = new Group();
      const nodes: Node[] = [];
      for (let i = 0; i < ordered.length; ++i) {
        const node = ordered[i] as Node;
        if (node.validateInsertion(group)) nodes.push(node);
      }
      if (nodes.length > 0) {
        const last = nodes[nodes.length - 1] as Node;
        const parent = last.getParent() as LockableParent;
        const next = last.getNext();
        if (!parent.isLocked() && group.validateInsertion(parent)) {
          parent.insertChild(group, next);
          let parents: Set<Node> | undefined;
          const scene = activeDocument().getScene();
          try {
            parents = new Set();
            for (let i = 0; i < nodes.length; ++i)
              parents.add((nodes[i] as Node).getParent() as Node);
            blockChanges(editor, [...parents] as unknown as Updatable[], scene, group);
            for (let i = 0; i < nodes.length; ++i) {
              const node = nodes[i] as Node;
              (node.getParent() as ContainerNode).removeChild(node);
              group.appendChild(node);
            }
          } finally {
            releaseChanges(
              editor,
              parents ? ([...parents] as unknown as Updatable[]) : parents,
              scene,
              group,
            );
          }
        }
        editor.updateSelection(false, [group]);
      }
    } finally {
      editor.commitTransaction(Locale.get(new LocaleKey("GGroupAction", "title")) as string);
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && GroupAction.TOOLTIP_CONFIG && GroupAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GGroupAction]";
  }
}
