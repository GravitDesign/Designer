// Old: chunk.vendor.js module 76 (no G name; the base of GElement).
/**
 * A node that can live in a scene: it knows its scene (`getScene`), gets a
 * scene-wide id (`getSceneId`), finds its page and keeps the scene's links
 * to the references it uses (`refs`: ids of styles, symbol masters, text
 * paths) up to date. It is an event target, which is why scene nodes get
 * the events of their descendants.
 */
import { EventTargetMixin } from "../core/event-target.ts";
import { registerClass } from "../core/object.ts";
import { unique, uuid } from "../core/util.ts";
import type { Rect } from "../math/rect.ts";
import type { ContainerNode } from "./node-container.ts";
import { NodeFlag } from "./node-change.ts";
import { Identity, Multireference, type ReferenceNode } from "./node-identity.ts";
import { Properties, type PropertiesNode } from "./node-properties.ts";
import { Node, type NodeWorkspace } from "./node.ts";
import { ReferenceEvent } from "./reference-event.ts";

/** GScene's transform settings (Transform and Item read them). */
export interface SceneTransformSettings {
  inheritedGlobal?: boolean | null;
  borderScale?: boolean | null;
}

/**
 * What scene nodes and elements need from GScene. The scene cluster
 * (engine-scene-document) implements it; GScene is itself a scene node.
 */
export interface SceneHooks {
  /** Set while the scene restores ("rebuild"): links are not maintained. */
  $rb?: unknown;
  /** Label size of pages and symbols. */
  $lbs?: unknown;
  _isRestoring: boolean;
  _workspace: NodeWorkspace | null;
  link(reference: Node | string, target: SceneNode): void;
  unlink(reference: string, target: SceneNode): void;
  hasLinks(reference: Node): boolean;
  visitLinks(reference: Node, visitor: (linked: SceneNode) => void): void;
  _unsetSceneNode(node: SceneNode): void;
  _invalidateArea(area: Rect, element: Node): void;
  getTransformSettings(): SceneTransformSettings | null;
  getLabelBBox(scale: number): Rect;
}

/** The scene node's own change codes (GSceneNode._Change). */
export const SceneNodeChange = {
  SceneAttached: 200,
  SceneDetached: 201,
} as const;

/**
 * Scene id → the node that has it, so the scene can find a linked node
 * without walking the tree. A node gets its id once and keeps it, so an
 * entry never points at the wrong node; it goes when the node is
 * garbage collected.
 */
const nodesBySceneId = new Map<string, WeakRef<SceneNode>>();
const sceneIdsToForget = new FinalizationRegistry<string>((sceneId) => {
  const entry = nodesBySceneId.get(sceneId);
  if (entry && !entry.deref()) nodesBySceneId.delete(sceneId);
});

/** The node whose scene id is `sceneId`, wherever it is, or undefined. */
export function sceneNodeById(sceneId: string): SceneNode | undefined {
  const entry = nodesBySceneId.get(sceneId);
  return entry ? entry.deref() : undefined;
}

const SceneNodeBase = EventTargetMixin(Multireference(Identity(Node)));

export class SceneNode extends SceneNodeBase {
  static {
    registerClass(this, "GSceneNode");
  }

  static override _Change: Readonly<Record<string, number>> = SceneNodeChange;

  /** Reference ids this node uses (a property for classes with GNode.Properties). */
  declare $refs: string[];
  declare ____id: string | null;
  declare _scene: SceneHooks | null;

  constructor() {
    super();
    this.$refs = [];
  }

  /** An id unique in the scene, made on first use. */
  getSceneId(): string {
    if (!this.____id) {
      this.____id = uuid();
      nodesBySceneId.set(this.____id, new WeakRef(this));
      sceneIdsToForget.register(this, this.____id);
    }
    return this.____id;
  }

  /** The page this node is on, or null. */
  getPage(): Node | null {
    if ("page" === Node.getName(this)) return this;
    let node: Node | null = this.getParent();
    while (node && "page" !== Node.getName(node)) node = node.getParent();
    return node;
  }

  _setScene(scene: SceneHooks | null): void {
    if (scene === this._scene) return;
    if (this._scene) this._notifyChange(SceneNodeChange.SceneDetached);
    if (scene) this._scene = scene;
    else {
      if (this._scene) this._scene._unsetSceneNode(this);
      this._scene = null;
    }
    if (this._scene) this._notifyChange(SceneNodeChange.SceneAttached);
  }

  getScene(): SceneHooks | null {
    return this._scene;
  }

  /** Takes the workspace and scene of the nearest scene node at or above `parent`. */
  override _attachToParent(parent: Node): void {
    let owner: Node | null = parent;
    while (owner && !(owner instanceof SceneNode)) owner = owner.getParent();
    if (owner && (owner._workspace || owner._scene)) {
      const sceneOwner = owner;
      this.accept((node) => {
        node._setWorkspace(sceneOwner._workspace);
        if (node instanceof SceneNode) node._setScene(sceneOwner._scene);
      });
    }
  }

  /**
   * Links this node to the references in `refs` (default: its `refs`
   * property) once it is in a scene. A reference that isn't in the scene
   * yet is inserted next to this node, unless the scene is restoring;
   * with `useOldIds`, a reference that was re-identified is linked by its
   * old id and dropped from `refs`. Nodes linked to this one hear that it
   * is back (ReferenceEvent).
   */
  _handleReferencesOnSceneAttach(refs?: readonly unknown[] | null, useOldIds?: boolean): void {
    if (!this._workspace) return;
    const scene = this._scene as SceneHooks;
    const list = refs || this.$refs;
    if (list && list.length) {
      for (let i = 0; i < list.length; i++) {
        let reference: unknown = list[i];
        if ("string" == typeof reference) reference = this._workspace.getReference(reference);
        else if (!(reference instanceof SceneNode)) continue;
        if (!reference) continue;
        const ref = reference as SceneNode & ReferenceNode;
        if (ref._scene) scene.link(ref, this);
        else if (useOldIds && ref.getOldReferenceId()) {
          scene.link(ref.getOldReferenceId() as string, this);
          const remaining = this.$refs.slice();
          remaining.splice(this.$refs.indexOf(ref.getReferenceId()), 1);
          setRefs(this, remaining);
        } else if (!scene._isRestoring) {
          if (!ref.getParent()) (this.getParent() as ContainerNode).appendChild(ref);
          scene.link(ref, this);
        }
      }
    }
    if (this.hasMixin(Node.Reference) && scene.hasLinks(this)) {
      scene.visitLinks(this, (linked) => {
        linked.trigger(new ReferenceEvent(this, linked, true));
      });
    }
  }

  override _detachFromParent(parent: Node): void {
    let owner: Node | null = parent;
    while (owner && !(owner instanceof SceneNode)) owner = owner.getParent();
    if (owner && (owner._workspace || owner._scene)) {
      this.accept(
        (node) => {
          if (node.hasFlag(NodeFlag.Selected)) node.removeFlag(NodeFlag.Selected);
          if (node instanceof SceneNode) node._setScene(null);
          node._setWorkspace(null);
        },
        false,
        false,
        true,
      );
    }
  }

  /** Keeps `refs` in sync when the scene links or unlinks this node. */
  _referenceEvent(event: ReferenceEvent): void {
    if (event.target !== this || !this.hasMixin(Properties)) return;
    const linked = event.linked;
    const reference = event.reference as ReferenceNode;
    if (linked) {
      const refs = unique(this.$refs.concat([reference.getReferenceId()]).filter((id) => id));
      setRefs(this, refs as string[]);
    } else {
      // An id that isn't there removes the last entry (indexOf -1); kept.
      let refs = this.$refs.slice();
      refs.splice(this.$refs.indexOf(reference.getReferenceId()), 1);
      refs = refs.filter((id) => id);
      setRefs(this, refs);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === SceneNodeChange.SceneAttached && this._scene) {
      if (!this._scene.$rb) this.addEventListener(ReferenceEvent, this._referenceEvent, this);
      this._handleReferencesOnSceneAttach();
    } else if (change === SceneNodeChange.SceneDetached && this._scene && !this._scene.$rb) {
      if (this.$refs) {
        const refs = this.$refs.slice();
        for (let i = refs.length - 1; i >= 0; i--) this._scene.unlink(refs[i] as string, this);
      }
      this.removeEventListener(ReferenceEvent, this._referenceEvent, this);
    }
    super._handleChange(change, args);
  }
}

const sceneNodePrototype = SceneNode.prototype;
sceneNodePrototype.____id = null;
sceneNodePrototype._scene = null;

function setRefs(node: SceneNode, refs: string[]): void {
  // Only classes with GNode.Properties get here (the reference event checks
  // it; references are only handled for such nodes).
  (node as SceneNode & PropertiesNode).setProperty("refs", refs);
}
