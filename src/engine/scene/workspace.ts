// Old: chunk.vendor.js module 280 (GWorkspace).
/**
 * What the documents of one app share: the font manager, the transaction
 * recorder that undo listens to, the registry of referenceable nodes (by
 * reference id) and a budget for decoded image memory. Urls of images and
 * textures are resolved through it: http(s) and data urls directly, every
 * other url by asking the app (ResolveUrlEvent).
 */
import { Event } from "../core/event.ts";
import { EventTarget } from "../core/event-target.ts";
import { registerClass } from "../core/object.ts";
import { uuid } from "../core/util.ts";
import { registerWorkspace } from "../style/late-bound.ts";
import { FontManager } from "../text/fonts/font-manager.ts";
import { TransactionRecorder } from "../undo/transaction-recorder.ts";
import type { ReferenceNode } from "./node-identity.ts";
import type { Node, NodeWorkspace } from "./node.ts";
import { SceneNode } from "./scene-node.ts";

/** GWorkspace.ResolveUrlEvent: asks the app to turn `url` into one that loads. */
export class ResolveUrlEvent extends Event {
  static {
    registerClass(this, "GWorkspace.ResolveUrlEvent");
  }

  declare url: string | null;
  declare scene: unknown;
  declare resolved: ((url: string) => void) | null;

  constructor(url: string, scene: unknown, resolved: ((url: string) => void) | null) {
    super();
    this.url = url;
    this.scene = scene;
    this.resolved = resolved;
  }

  override toString(): string {
    return "[Event GWorkspace.ResolveUrlEvent]";
  }
}
const resolveUrlEventPrototype = ResolveUrlEvent.prototype as unknown as Record<string, unknown>;
resolveUrlEventPrototype["url"] = null;
resolveUrlEventPrototype["scene"] = null;
resolveUrlEventPrototype["resolved"] = null;

/** Decoded images may take this many bytes (1 GiB) in all. */
const MEMORY_LIMIT = 1 << 30;

/** What the image budget measures: canvases count, image elements are always allowed. */
interface SizedImage {
  width: number;
  height: number;
}

function isCanvas(image: unknown): image is SizedImage {
  return (
    ("undefined" != typeof HTMLCanvasElement && image instanceof HTMLCanvasElement) ||
    ("undefined" != typeof OffscreenCanvas && image instanceof OffscreenCanvas)
  );
}

const HTTP_URL = /(https?):\/\/(-\.)?([^\s/?.#]+\.?)+(\/[^\s]*)?$/i;

export class Workspace extends EventTarget implements NodeWorkspace {
  static {
    registerClass(this, "GWorkspace");
  }

  static ResolveUrlEvent = ResolveUrlEvent;

  declare _fontManager: FontManager | null;
  declare _transactionRecorder: TransactionRecorder | null;
  declare _references: Record<string, Node> | null;
  declare _memory: number;

  constructor() {
    super();
    this._fontManager = new FontManager();
    this._references = {};
    this._transactionRecorder = new TransactionRecorder();
  }

  getFontManager(): FontManager | null {
    return this._fontManager;
  }

  getTransactionRecorder(): TransactionRecorder | null {
    return this._transactionRecorder;
  }

  setTransactionRecorder(recorder: TransactionRecorder | null): void {
    this._transactionRecorder = recorder;
  }

  /**
   * Registers a node under its reference id. A node whose id is taken
   * gets a new one and keeps the taken one as its old reference id, which
   * the scene uses to repair links after a paste or an import.
   */
  addReference(node: Node): void {
    const reference = node as Node & ReferenceNode;
    let id = reference.getReferenceId();
    const references = this._references as Record<string, Node>;
    if (Object.prototype.hasOwnProperty.call(references, id)) {
      reference._oldReferenceId = id;
      id = uuid();
      reference._referenceId = id;
    }
    references[id] = node;
  }

  removeReference(node: Node): void {
    const id = (node as Node & ReferenceNode).getReferenceId();
    const references = this._references as Record<string, Node>;
    if (!Object.prototype.hasOwnProperty.call(references, id)) {
      throw new Error("Reference not yet added.");
    }
    Reflect.deleteProperty(references, id);
  }

  /** Forgets every reference that lives in `scene` (a closed document). */
  cleanReferences(scene: unknown): void {
    if (!scene) return;
    const references = this._references as Record<string, Node>;
    for (const id in references) {
      let node: Node | null = references[id] as Node;
      if (!(node instanceof SceneNode)) node = node.findParent((n) => n instanceof SceneNode);
      if (node && (node as SceneNode).getScene() === scene) Reflect.deleteProperty(references, id);
    }
  }

  getReference(id: string): Node | null {
    const references = this._references as Record<string, Node>;
    return Object.prototype.hasOwnProperty.call(references, id) ? (references[id] as Node) : null;
  }

  /**
   * Books the memory of a decoded canvas; false when it would exceed the
   * budget. Image elements are always accepted and not counted.
   */
  increaseMemoryForImage(image: unknown): boolean {
    if (!image) return true;
    if (isCanvas(image)) {
      const bytes = (image.width * image.height) << 2;
      if (this._memory + bytes <= MEMORY_LIMIT) {
        this._memory += bytes;
        return true;
      }
    }
    return "undefined" != typeof HTMLImageElement && image instanceof HTMLImageElement;
  }

  decreaseMemoryForImage(image: unknown): void {
    if (image && isCanvas(image)) {
      this._memory = Math.max(0, this._memory - ((image.width * image.height) << 2));
    }
  }

  /**
   * Calls `resolved` with a url that loads: empty, data and http(s) urls
   * as they are, anything else through a ResolveUrlEvent (nothing happens
   * when nobody listens).
   */
  resolveUrl(url: string, resolved: (url: string) => void, scene: unknown): void {
    if (url && 0 !== url.indexOf("data:")) {
      if (url.trim().match(HTTP_URL)) resolved(url);
      else if (this.hasEventListeners(ResolveUrlEvent)) {
        this.trigger(new ResolveUrlEvent(url, scene, resolved));
      }
    } else resolved(url);
  }
}

const workspacePrototype = Workspace.prototype;
workspacePrototype._fontManager = null;
workspacePrototype._transactionRecorder = null;
workspacePrototype._references = null;
workspacePrototype._memory = 0;

registerWorkspace(Workspace);
