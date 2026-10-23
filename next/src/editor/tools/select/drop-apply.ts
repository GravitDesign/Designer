// Old: chunk.vendor.js module 334 (GSelectTool._mouseDragEnd, the Moving branch).
/**
 * Finishes a move drag in one transaction: applies the dragged part (an
 * isolated handle) or the selection move (Alt: a moved copy), then puts
 * dropped images into their mask target, or moves dropped elements onto
 * the page under the pointer (pages dropped on pages swap places when
 * GPageEditor.SWITCH_ORDER is on).
 */
import { Platform } from "../../../engine/core/platform.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { MouseEvent } from "../../../engine/core/mouse-event.ts";
import { uniqueObj } from "../../../engine/core/util.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Transform as TransformMixin } from "../../../engine/scene/element-transform.ts";
import type { Element } from "../../../engine/scene/element.ts";
import { ImageGrid } from "../../../engine/scene/image-grid.ts";
import { NodeFlag } from "../../../engine/scene/node-change.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Editor } from "../../editor.ts";
import { EditorOptions } from "../../editor-options.ts";
import type { BaseEditor } from "../../element-editors/base-editor.ts";
import { BlockEditor } from "../../element-editors/block-editor.ts";
import { BoxEditor } from "../../element-editors/box-editor.ts";
import { GradientStyleEditor } from "../../element-editors/gradient-style-editor.ts";
import { PageEditor } from "../../element-editors/page-editor.ts";
import type { SelectTool } from "../select-tool.ts";

const modifiers = Platform.modifiers;

/** Removes `node` from its parent container. */
function removeFromParent(node: Node): void {
  // The parent is typed as a plain Node; removeChild comes with the Container mixin.
  (node.getParent() as unknown as { removeChild(child: Node): void }).removeChild(node);
}

const loc = (key: string): string => Locale.get(new LocaleKey("GSelectTool", key)) as string;

/** Distinct targets of the candidates, and per target the candidates' values. */
function groupByTarget<T>(
  candidates: { target: Element }[],
  value: (candidate: never) => T,
): { targets: Element[]; groups: T[][] } {
  const targets = candidates.map((candidate) => candidate.target);
  uniqueObj(targets);
  const groups = targets.map((target) =>
    candidates.filter((candidate) => candidate.target === target).map(value as (c: unknown) => T),
  );
  return { targets, groups };
}

export function applyMoveDrop(tool: SelectTool, event: MouseEvent): void {
  let name: string | undefined;
  let relatedData: unknown = null;
  tool._editor.beginTransaction();
  try {
    tool._editor.getGuides().invalidate();
    const toMask = !(!tool._itemsToAddToImageMask || !tool._itemsToAddToImageMask.length);
    const toPage = !(!tool._itemsToAddToPage || !tool._itemsToAddToPage.length);
    const info = tool._editorMovePartInfo;
    // Alt drops a moved copy (not for a dragged handle).
    const clone =
      (!info || info.id === BlockEditor.LabelHolder.LABEL_PART_ID) && modifiers.optionKey;
    if (info && info.isolated && !clone) {
      let linked: Node[] = [];
      if (
        info.id === BoxEditor.RESIZE_HANDLE_PART_ID ||
        info.id === BoxEditor.ROTATION_HANDLE_PART_ID
      ) {
        const selection = tool._editor.getSelection();
        if (selection && selection.length) {
          for (let i = 0; i < selection.length; ++i) {
            // The editor's methods take and return its structural node type (EdNode).
            linked = linked.concat(
              tool._editor.getLinkedElementsInSelection(
                selection[i] as never,
                selection as never,
              ) as unknown as Node[],
            );
          }
        }
      }
      const partEditor = info.editor as BaseEditor;
      partEditor.applyPartMove(info.id, info.data, null, linked);
      if (partEditor instanceof GradientStyleEditor) relatedData = partEditor.getEditorData();
      let element = partEditor.getObjectNameModified();
      if (!element) element = loc("text.element");
      name = loc("action.modify-element").replace("%element", element);
    } else {
      tool._editor.applySelectionTransform(clone, true, clone && (toMask || toPage), true);
      name = clone ? loc("action.transform-clone-selection") : loc("action.transform-selection");
    }
    if (toMask) {
      const candidates = tool._itemsToAddToImageMask as NonNullable<
        SelectTool["_itemsToAddToImageMask"]
      >;
      const { targets, groups } = groupByTarget(
        candidates,
        (candidate: { source: Element; sourceBox: Rect }) => ({
          src: candidate.source,
          box: candidate.sourceBox,
        }),
      );
      for (let i = 0; i < groups.length; i++) {
        const sources = groups[i] as { src: Element; box: Rect }[];
        const target = targets[i] as Element;
        sources.forEach((entry) => {
          const source = entry.src;
          removeFromParent(source);
          // Only images are gathered for a mask (the source filter), but the
          // candidate list is typed with plain elements.
          if (target instanceof ImageGrid) target.addImage(source as never, entry.box);
          // Mask targets are containers (the target filter); Element lacks appendChild.
          else (target as unknown as { appendChild(node: Node): void }).appendChild(source);
        });
      }
      tool._editor.updateSelection(false, targets);
      // Not localized in the old code either; see "Image mask undo name is
      // not localized" in QUESTIONS.md.
      name = "Create image mask";
      tool._itemsToAddToImageMask = null;
    } else if (toPage) {
      name = movePagesOrElements(tool, name as string);
    }
  } finally {
    tool.updateInlineHint(null);
    tool._editor.commitTransaction(name, relatedData);
  }
  // There is no pagesCollisionTransform option (pageCollisionTransform
  // is), so this never runs; see "Misspelled pagesCollisionTransform
  // option" in QUESTIONS.md.
  // Read by name: the option doesn't exist, so it is not on the typed options.
  if ((EditorOptions as unknown as Record<string, unknown>)["pagesCollisionTransform"]) {
    tool._editor.updateByMousePosition(
      event.client,
      tool._view.getWorldTransform(tool._scene),
      false,
      tool._view.getViewConfiguration(),
    );
  }
}

/** Moves the dropped elements onto their target page (or swaps dropped pages); returns the undo name. */
function movePagesOrElements(tool: SelectTool, name: string): string {
  const candidates = tool._itemsToAddToPage as NonNullable<SelectTool["_itemsToAddToPage"]>;
  const { targets, groups } = groupByTarget(
    candidates,
    (candidate: { source: Element }) => candidate.source,
  );
  const scene = tool._scene;
  let pages = false;
  if ((candidates[0] as { source: Element }).source instanceof Page) pages = true;
  scene.startBlockReferenceChanges();
  if (pages) {
    name += " & Switch Pages";
    if (PageEditor.SWITCH_ORDER) tool._editor.clearSelection();
    scene.beginUpdate();
  } else name += " & Move to Page";
  for (let i = 0; i < groups.length; i++) {
    const sources = groups[i] as Element[];
    const target = targets[i] as Element;
    sources.forEach((source) => {
      let sourceIndex = 0;
      let targetIndex = 0;
      const parent = source.getParent() as Node;
      if (!(target.getScene() && parent !== target)) return;
      if (pages) {
        sourceIndex = scene.getIndexOfChild(source);
        targetIndex = scene.getIndexOfChild(target);
      }
      if (pages) {
        removeFromParent(source);
        if (PageEditor.SWITCH_ORDER) {
          // _requestInvalidation is internal to the element and not typed on Element.
          (target as unknown as { _requestInvalidation(): void })._requestInvalidation();
          if (sourceIndex < targetIndex) {
            if (target.getNext()) scene.insertChild(source, target.getNext());
            else scene.appendChild(source);
          } else scene.insertChild(source, target);
          (target as unknown as { _requestInvalidation(): void })._requestInvalidation();
        }
      } else {
        if (source instanceof Page && target instanceof Page) {
          console.warn("tried to insert page into page, aborting");
          return;
        }
        removeFromParent(source);
        // Page targets are containers; Element lacks appendChild.
        (target as unknown as { appendChild(node: Node): void }).appendChild(source);
        const fromPage = Editor.getElementPage(parent);
        const toPage = Editor.getElementPage(target);
        if (fromPage && toPage && source.hasMixin(TransformMixin)) {
          const from = fromPage.getPosition(true);
          const to = toPage.getPosition(true);
          const offset = from.subtract(to);
          // hasMixin(Transform) doesn't narrow the type.
          (source as unknown as { transform(t: Transform, noEvent?: boolean): void }).transform(
            new Transform(1, 0, 0, 1, offset.getX(), offset.getY()),
            true,
          );
        }
      }
    });
    target.removeFlag(NodeFlag.Highlighted);
  }
  if (pages) {
    scene.endUpdate();
    tool._editor.updateSelection(
      false,
      candidates.map((candidate) => candidate.source),
    );
  } else if (PageEditor.SWITCH_ORDER) scene.setActivePage(targets[0] as Page);
  else {
    tool._editor.updateSelection(
      false,
      candidates.map((candidate) => candidate.source),
    );
  }
  scene.endBlockReferenceChanges();
  tool._itemsToAddToPage = null;
  return name;
}
