// Old: chunk.vendor.js module 533 (GCollaborativeTextAnnotation).
/**
 * The annotation behind a collaborative text (GCollabText), node
 * "ancotext": an invisible rectangle annotation linked to the collab
 * texts that reference it. Its icon and program locks are fixed (getters
 * that ignore writes), so they show up in every saved blob.
 */
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Block } from "../block.ts";
import { Linkable } from "../element-linkable.ts";
import { NodeChange } from "../node-change.ts";
import type { ContainerNode } from "../node-container.ts";
import type { ReferenceNode } from "../node-identity.ts";
import type { PropertiesChangeArgs } from "../node-properties.ts";
import { Node, registerNodeClass } from "../node.ts";
import { Rectangle } from "../rectangle.ts";
import {
  AnnotationMixin,
  restoreAnnotationProperties,
  separateOwnBlob,
  storeAnnotationProperties,
} from "./annotation.ts";

const ICON = "assets/img/annotation/collaborative-text-annotation.svg";

const ProgramLck = Block.ProgramLck;
const PROGRAM_LOCKS =
  ProgramLck.NoSizeChanges |
  ProgramLck.NoEdit |
  ProgramLck.NoMove |
  ProgramLck.NoOrigChildrenEdit |
  ProgramLck.NoNewChildren |
  ProgramLck.NoDirectVisibilityChange;

/** The scene lookup this class needs (GScene implements it). */
interface ReferenceVisitor {
  visitReferences(node: Node, visitor: (reference: Node) => void): void;
}

export class CollaborativeTextAnnotation extends Linkable(AnnotationMixin(Rectangle)) {
  static {
    registerNodeClass(this, "ancotext", "GCollaborativeTextAnnotation");
  }

  constructor() {
    super();
    this.initializeAnnotation();
    Object.defineProperties(this, {
      $img: {
        set() {},
        get() {
          return ICON;
        },
      },
      $plkt: {
        set() {},
        get() {
          return PROGRAM_LOCKS;
        },
      },
    });
  }

  /** The collab texts that reference this annotation. */
  override getAnnotableReferences(): ReferenceNode[] {
    const references: ReferenceNode[] = [];
    if (this._scene) {
      (this._scene as unknown as ReferenceVisitor).visitReferences(this, (node) => {
        if ("collabtext" === Node.getName(node)) references.push(node as ReferenceNode);
      });
    }
    return references;
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return "annlst" === Node.getName(parent);
  }

  override isPaintable(): boolean {
    return false;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const storeArgs = args as StoreChangeArgs;
      storeAnnotationProperties(this, storeArgs);
      separateOwnBlob(this, storeArgs, false);
      this.storeProperties(storeArgs.blob, Linkable.MetaProperties);
    } else if (change === NodeChange.Restore) {
      const restoreArgs = args as RestoreChangeArgs;
      this.restoreProperties(restoreArgs.blob, Linkable.MetaProperties);
      restoreAnnotationProperties(this, restoreArgs);
    } else if (change === NodeChange.BeforePropertiesChange) {
      this.handleBeforePropertiesChange(args as PropertiesChangeArgs);
    }
    this._handleAnnotationLinkableChange(change, args);
    super._handleChange(change, args);
  }

  /** Links the collab texts saved in `annotablerefs` once in a scene. */
  override _handleReferencesOnSceneAttach(): void {
    super._handleReferencesOnSceneAttach(
      this._getRestoredAnnotableReferences() as readonly unknown[] | null,
    );
    this._resetRestoredAnnotableReferences();
  }

  override toString(): string {
    return "[GCollaborativeTextAnnotation]";
  }
}
