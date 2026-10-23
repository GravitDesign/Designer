// Old: designer.browser.dev.js module 1314 (GConvertToImageAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Length } from "../../../engine/math/length.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Bitmap } from "../../../engine/paint/bitmap.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image } from "../../../engine/scene/image.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner, type ActionDocument } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/** An element whose paint box exists and is not empty (what can be flattened). */
function hasPaintArea(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const bbox = node.getPaintBBox();
  return !!bbox && !bbox.isEmpty();
}

/**
 * Modify > Flatten (F7): renders the selection into one bitmap image at
 * the screen resolution (at least the document's dpi) and puts it where
 * the selection was. Several elements are grouped first.
 */
export class ConvertToImageAction extends ElementAction {
  static USE_DPI = true;
  static ID = "modify.path2bmp";
  static TITLE = new LocaleKey("GConvertToImageAction", "title");

  override getId(): string {
    return ConvertToImageAction.ID;
  }

  override getTitle(): LocaleKey {
    return ConvertToImageAction.TITLE;
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-flatten" : "";
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-bitmap";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.F7];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument
      ? (designerDocument.getEditor().getSelection() as Node[] | null)
      : null;
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        if (hasPaintArea(selection[i] as Node)) return true;
      }
    }
    return false;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const nodes = editor
      ? Node.order((editor.getIndividualSelection() as unknown as Node[]).slice())
      : null;
    const elements: Node[] = [];
    if (nodes) {
      for (let i = 0; i < nodes.length; ++i) {
        if (hasPaintArea(nodes[i] as Node)) elements.push(nodes[i] as Node);
      }
    }
    if (elements.length && editor) {
      editor.beginTransaction();
      editor.clearSelection();
      try {
        const source = this._groupStuff(elements);
        if (source) {
          const parent = source.getParent() as ContainerNode;
          const next = source.getNext();
          const image = this._convertToImage(source as Element);
          if (image) {
            parent.insertChild(image, next);
            parent.removeChild(source);
            editor.updateSelection(false, [image]);
          }
        }
      } finally {
        editor.commitTransaction(Locale.get(this.getTitle()) as string);
      }
    }
  }

  /** One element as it is; several moved into a new group (like Group). */
  _groupStuff(elements: Node[]): Node {
    if (elements && 1 === elements.length) return elements[0] as Node;
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const group = new Group();
    const groupContainer = group as unknown as ContainerNode;
    const valid: Node[] = [];
    for (let i = 0; i < elements.length; ++i) {
      const node = elements[i] as Node;
      if (node.validateInsertion(groupContainer)) valid.push(node);
    }
    if (valid.length > 0) {
      const last = valid[valid.length - 1] as Node;
      const parent = last.getParent() as ContainerNode;
      const next = last.getNext();
      if (!parent.isLocked() && group.validateInsertion(parent)) {
        parent.insertChild(group, next);
        const scene = (gDesigner().getActiveDocument() as ActionDocument).getScene();
        let parents: Set<Node> | undefined;
        try {
          parents = new Set();
          for (let i = 0; i < valid.length; ++i)
            parents.add((valid[i] as Node).getParent() as Node);
          blockChanges(
            editor as unknown as Parameters<typeof blockChanges>[0],
            [...parents] as unknown as Updatable[],
            scene as unknown as Parameters<typeof blockChanges>[2],
            group as unknown as Updatable,
          );
          for (let i = 0; i < valid.length; ++i) {
            const node = valid[i] as Node;
            (node.getParent() as ContainerNode).removeChild(node);
            groupContainer.appendChild(node);
          }
        } finally {
          releaseChanges(
            editor as unknown as Parameters<typeof releaseChanges>[0],
            parents ? ([...parents] as unknown as Updatable[]) : parents,
            scene as unknown as Parameters<typeof releaseChanges>[2],
            group as unknown as Updatable,
          );
        }
      }
    }
    return group;
  }

  _convertToImage(element: Element): Image | null {
    let dpi: number | undefined;
    let scene: { getProperty(name: string): unknown } | null | undefined;
    if (!(element instanceof Image)) dpi = PaintCanvas.getScreenDPI() * Length.DPI;
    if (element instanceof Element)
      scene = element.getScene() as unknown as { getProperty(name: string): unknown } | null;
    if (!(element instanceof Image)) {
      dpi = Math.max(
        dpi || Length.DPI,
        (scene && (scene.getProperty("dpi") as number)) || Length.DPI,
      );
    }
    const bitmap = element.toBitmap(null, null, null, null, null, dpi) as Bitmap;
    const image = new Image();
    let scale = 1;
    if (!(element instanceof Image)) scale /= (dpi as number) / Length.DPI;
    const topLeft = (element.getPaintBBox() as Rect).getSide(Rect.Side.TOP_LEFT);
    const transform = new Transform()
      .scaled(scale, scale)
      .translated(topLeft.getX(), topLeft.getY());
    image.setProperties(
      ["iw", "ih", "url", "trf", "itrf"],
      [
        bitmap.getWidth(),
        bitmap.getHeight(),
        bitmap.toImageDataUrl(Bitmap.ImageType.PNG),
        transform,
        transform,
      ],
    );
    return image;
  }

  override toString(): string {
    return "[Object GConvertToImageAction]";
  }
}
