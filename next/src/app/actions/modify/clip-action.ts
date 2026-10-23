// Old: designer.browser.dev.js module 809 (GClipAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, richTooltipVideoUrl, TOOLTIP_AREA } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };
/** The first (bottom-most) selected element, which becomes the clipping shape. */
type ClipNode = ContainerNode & Updatable & { isLocked(): boolean; getPaintBBox(): Rect | null };

/**
 * Modify > Clip Selection (Alt+Cmd+M): the bottom-most selected element
 * becomes the clipping shape and takes the other selected elements that
 * overlap its paint box as children.
 *
 * MaskWithShapeAction runs this with `order` and `noTransaction` set.
 */
export class ClipAction extends ElementAction {
  static ID = "modify.clip";
  static TITLE = new LocaleKey("GClipAction", "title");
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    ClipAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GClipAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GClipAction", "tooltip-description")),
        video: richTooltipVideoUrl("Clip.mp4"),
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return ClipAction.ID;
  }

  override getTitle(): LocaleKey {
    return ClipAction.TITLE;
  }

  override getIcon(): string | null {
    return "gravit-icon-clip-circle";
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection();
      return !!selection && selection.length > 1;
    }
    return false;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, Key.Constant.META, "M"];
  }

  /** `reverse` orders the selection bottom-up (Node.order); `noTransaction` runs inside the caller's. */
  override execute(reverse?: unknown, noTransaction?: unknown): void {
    const editor = activeDocument().getEditor();
    const scene = activeDocument().getScene();
    const nodes = Node.order(
      (editor.getIndividualSelection() as unknown as Node[]).slice(),
      reverse as boolean | undefined,
    ) as Node[];
    const clip = nodes.shift() as unknown as ClipNode;
    if (clip.isLocked()) return;
    let parents: Set<Node> | undefined;
    const clipBox = clip.getPaintBBox();
    if (!noTransaction) editor.beginTransaction();
    try {
      parents = new Set();
      for (let i = 0; i < nodes.length; ++i) parents.add((nodes[i] as Node).getParent() as Node);
      try {
        blockChanges(editor, [...parents] as unknown as Updatable[], scene, clip);
        for (let i = 0; i < nodes.length; ++i) {
          const node = nodes[i] as Node & { getPaintBBox(): Rect | null };
          if (
            node.validateInsertion(clip) &&
            node.getPaintBBox() &&
            clipBox &&
            (node.getPaintBBox() as Rect).intersectsRect(clipBox)
          ) {
            (node.getParent() as ContainerNode).removeChild(node);
            clip.appendChild(node);
          }
        }
      } finally {
        releaseChanges(editor, [...parents] as unknown as Updatable[], scene, clip);
        editor.updateSelection(false, [clip]);
      }
    } finally {
      if (!noTransaction) {
        // The key's typo ("selecion") is the old string table's.
        editor.commitTransaction(
          Locale.get(new LocaleKey("GClipAction", "text.clip-selecion")) as string,
        );
      }
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return area && (ClipAction.TOOLTIP_CONFIG as Record<string, unknown>)[area];
  }

  override toString(): string {
    return "[Object GClipAction]";
  }
}
