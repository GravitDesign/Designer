// Old: chunk.vendor.js module 172 (GAnnotationEditor).
/**
 * What the editors of review annotations share.
 *
 * The old GAnnotationEditor was a function mixed into the annotation
 * editors (only `_annotationSetup`) that also carried statics: the
 * transaction data the cloud comment sync listened for, and
 * removeAnnotations, which marks annotations removed (and hides them)
 * in one transaction. Here `AnnotationEditor` keeps the identity and the
 * statics, and `AnnotationEditorMixin(Base)` adds the members.
 *
 * Each old annotation editor also repeated the same handful of overrides
 * (hidden while the annotations are hidden, double clicks swallowed,
 * NoDelete program lock, no snapping to shape boxes). They live in the
 * mixin too; the result is the same as defining them per class.
 */
import { GDate } from "../../engine/core/date.ts";
import { defineMixin, registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { Annotation, AnnotationMixin } from "../../engine/scene/annotations/annotation.ts";
import { Comment } from "../../engine/scene/annotations/comment.ts";
import { Block } from "../../engine/scene/block.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorPaintContext } from "../element-editors/base-editor.ts";
import type { ElementEditor } from "../element-editors/element-editor.ts";
import { BBoxGuide } from "../guides/bbox-guide.ts";

const TransactionType = {
  RemoveAnnotation: "remove-synchronized-annotations",
  AddAnnotation: "add-synchronized-annotations",
} as const;

/** The data an annotation transaction carries (old: for the cloud comment sync). */
export interface AnnotationTransactionData {
  nodes: readonly Node[];
  parent: Node | null | undefined;
  type: string;
}

/** A paint context with the scene paint configuration's annotation visibility. */
interface AnnotationPaintContext {
  configuration: { isElementAnnotationsVisible(element: unknown): boolean };
}

/** A node with properties, as the annotation code reads and writes it. */
interface PropertyNode extends Node {
  getProperty(name: string): unknown;
  setProperties(names: readonly string[], values: readonly unknown[]): void;
}

const ProgramLck = Block.ProgramLck as Readonly<Record<string, number>>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GAnnotationEditor was a bare function: an identity with statics
export class AnnotationEditor {
  static {
    registerClass(this, "GAnnotationEditor");
  }

  static TransactionType = TransactionType;

  static createRemoveAnnotationTransactionData(
    nodes: readonly Node[],
    parent: Node | null | undefined,
  ): AnnotationTransactionData {
    return { nodes: nodes, parent: parent, type: TransactionType.RemoveAnnotation };
  }

  static createAddAnnotationTransactionData(
    nodes: readonly Node[],
    parent: Node | null | undefined,
  ): AnnotationTransactionData {
    return { nodes: nodes, parent: parent, type: TransactionType.AddAnnotation };
  }

  /**
   * Marks `nodes` (annotations or comments below `parent`) removed:
   * `rmd` set, hidden, `mtime` stamped, unselected; with `remove` also
   * takes them out of `parent`. Runs in its own transaction named
   * `actionName` unless `transaction` is false.
   */
  static removeAnnotations(
    nodes: readonly Node[],
    parent: Node,
    actionName?: unknown,
    transaction?: unknown,
    remove?: unknown,
  ): void {
    const scene = (parent as unknown as { getScene(): unknown }).getScene();
    if (scene) {
      const editor = Editor.getEditor(scene);
      if (editor) {
        const inTransaction = false !== transaction;
        try {
          if (inTransaction) editor.beginTransaction();
          nodes.forEach((node) => {
            (node as PropertyNode).setProperties(
              ["rmd", "vis", "mtime"],
              [true, false, Date.now()],
            );
            if (node.hasMixin(AnnotationMixin) || node instanceof Comment) {
              node.removeFlag(NodeFlag.Selected);
              node.removeFlag(NodeFlag.Highlighted);
            }
            if (remove) (parent as unknown as { removeChild(child: Node): void }).removeChild(node);
          });
        } finally {
          if (inTransaction) {
            editor.commitTransaction(
              actionName as string,
              AnnotationEditor.createRemoveAnnotationTransactionData(nodes, parent),
            );
          }
        }
      }
    }
  }
}

/** The members the annotation editors share, on top of their shape editor. */
function annotationEditorMembers<TBase extends AnyConstructor<ElementEditor>>(Base: TBase) {
  abstract class AnnotationEditorMembers extends Base {
    /** The author uid a new annotation gets (the editor's second constructor argument). */
    declare _uid: unknown;

    /**
     * Stamps a newly placed annotation: author name (`name`, else the
     * user name, else the annotation's own), uid, time, the next sequence
     * number among its siblings, location and type; not removed.
     */
    _annotationSetup(name?: unknown, location?: unknown, type?: unknown): void {
      let seq = -1;
      const element = this._element as unknown as PropertyNode;
      const parent = this._element.getParent();
      if (!parent || !element.hasMixin(AnnotationMixin)) {
        throw new Error("Annotation setup without valid annotation");
      }
      for (let child = parent.getFirstChild(); null !== child; child = child.getNext()) {
        seq = Math.max(seq, ((child as PropertyNode).getProperty("seq") as number) || 0);
      }
      (this._element as unknown as { $rmd: unknown }).$rmd = true;
      element.setProperties(
        ["name", "uid", "time", "seq", "loc", "typ", "rmd"],
        [
          name || EditorOptions.userConfig.userName || element.getProperty("name"),
          this._uid || Annotation.MetaProperties.uid,
          GDate.now(),
          seq + 1,
          location || Annotation.MetaProperties.loc,
          type || Annotation.MetaProperties.typ,
          false,
        ],
      );
    }

    /** Only while the scene shows this annotation (the comments sidebar is open). */
    override _showEditor(context?: EditorPaintContext): boolean {
      return (
        (!context ||
          (context as unknown as AnnotationPaintContext).configuration.isElementAnnotationsVisible(
            this._element,
          )) &&
        super._showEditor(context)
      );
    }

    /** The old editors passed only the style source on (no uid). */
    override initialSetup(style?: unknown): void {
      super.initialSetup(style);
      this._annotationSetup();
    }

    override canHandleDblClick(): boolean {
      return true;
    }

    override handleDblClick(): boolean {
      return true;
    }

    /** Blocked by the NoDelete program lock too. */
    override isRemovalBlocked(): boolean | undefined {
      return (
        0 != ((this._element.getProperty("plkt") as number) & (ProgramLck.NoDelete as number)) ||
        super.isRemovalBlocked()
      );
    }

    /** Annotations don't snap to the boxes of other elements. */
    override _getGuideExclusions(): unknown {
      return [BBoxGuide];
    }
  }
  return AnnotationEditorMembers;
}

/** The annotation editor mixin: `class X extends AnnotationEditorMixin(EllipseEditor)`. */
export const AnnotationEditorMixin = defineMixin(AnnotationEditor, annotationEditorMembers);
