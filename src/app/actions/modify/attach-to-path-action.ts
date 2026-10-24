// Old: designer.browser.dev.js module 1176 (GAttachToPathAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { PathsGraph } from "../../../engine/scene/paths-graph/paths-graph.ts";
import type { SceneNode } from "../../../engine/scene/scene-node.ts";
import { Text } from "../../../engine/text/text.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner, type ActionDocument } from "../host.ts";
import type { Editor } from "../../../editor/editor.ts";
import { SplitPathAction } from "./split-path-action.ts";

/** A text without a path that is not being edited inline: what can be attached. */
function isAttachableText(node: Node): boolean {
  if (!(node instanceof Text) || node.hasPathAttached()) return false;
  const editor = ElementEditor.getEditor<{ isInlineEdit(): boolean }>(node);
  return !!editor && !editor.isInlineEdit();
}

/**
 * Modify > Path > Attach Text to Path: links the selected texts to the
 * first selected path. A shape is converted to a path first (a compound
 * path is split, which leaves its first part selected).
 */
export class AttachToPathAction extends ElementAction {
  static ID = "modify.attachToPath";
  static TITLE = new LocaleKey("GAttachToPathAction", "title");

  override getId(): string {
    return AttachToPathAction.ID;
  }

  override getTitle(): LocaleKey {
    return AttachToPathAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-attach-to-path" : null;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument
      ? (designerDocument.getEditor().getSelection() as Node[] | null)
      : null;
    const texts: Node[] = [];
    let path: Node | null = null;
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (node instanceof Text && !node.hasPathAttached()) {
          if (isAttachableText(node)) texts.push(node);
        } else if (node.hasMixin(VertexSource) && !(node instanceof PathsGraph)) path = node;
      }
    }
    return !(!texts.length || !path);
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const scene = designerDocument ? designerDocument.getScene() : null;
    let editor = designerDocument ? designerDocument.getEditor() : null;
    let selection = editor ? (editor.getIndividualSelection() as unknown as Node[] | null) : null;
    let path: Node | null = null;
    let shape: Node | undefined;
    const texts: Node[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (!path && node instanceof PathBase) path = node;
        else if (node instanceof Text && !node.hasPathAttached()) {
          if (isAttachableText(node)) texts.push(node);
        } else if (!shape && node.hasMixin(VertexSource) && !(node instanceof PathsGraph)) {
          shape = node;
        }
      }
    }
    // isEnabled made sure there is an editor.
    try {
      (editor as Editor).beginTransaction();
      if (!path) {
        editor = (gDesigner().getActiveDocument() as ActionDocument).getEditor();
        if (shape instanceof CompoundPath) {
          gDesigner().executeAction(SplitPathAction.ID, undefined, undefined, true);
        } else {
          editor.updateSelection(false, [shape]);
          editor.convertSelectionToPaths();
        }
        path = (editor.getSelection() as Node[])[0] as Node;
        selection = (selection as Node[]).concat();
        selection.splice(selection.indexOf(shape as Node), 1);
        editor.updateSelection(true, selection);
      }
      if (scene) {
        texts.map((text) => {
          scene.link(text, path as unknown as SceneNode);
        });
      }
    } finally {
      (editor as Editor).commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override toString(): string {
    return "[Object GAttachToPathAction]";
  }
}
