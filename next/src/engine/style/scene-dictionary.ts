// Old: chunk.vendor.js module 658 (GSceneDictionary).
/**
 * The image dictionary of one scene. Images and texture fills store a
 * "dictionary://<uuid>" url instead of their data url; this dictionary
 * holds the data, follows nodes as they are inserted and removed (so the
 * reference counts stay right), answers the workspace's url resolution
 * for its own urls, and keeps the decoded canvas of each entry against
 * the workspace's image memory budget.
 */
import { Event } from "../core/event.ts";
import type { EventClass } from "../core/event.ts";
import { getRegisteredClass, registerClass } from "../core/object.ts";
import { Image } from "../scene/image.ts";
import { AfterInsertEvent, AfterRemoveEvent } from "../scene/node-events.ts";
import type { Node } from "../scene/node.ts";
import { Dictionary, type DictionaryEntry } from "./dictionary.ts";
import { PaintLayer } from "./paint-layer.ts";
import type { PaintLayers } from "./paint-layers.ts";
import { Stylable } from "./stylable.ts";
import { Swatch } from "./swatch.ts";
import { TexturePattern } from "./texture-pattern.ts";

/** GWorkspace.ResolveUrlEvent as this dictionary reads and re-sends it. */
export interface ResolveUrlEventLike extends Event {
  url: string | null;
  scene: unknown;
  resolved: ((url: string) => void) | null;
}

type ResolveUrlEventClass = new (
  url: string,
  scene: unknown,
  resolved: ((url: string) => void) | null,
) => ResolveUrlEventLike;

/** What the dictionary needs from GWorkspace (engine-scene-document). */
export interface DictionaryWorkspace {
  addEventListener(eventClass: EventClass, listener: (event: never) => void, target?: object): void;
  removeEventListener(eventClass: EventClass, listener: unknown, target?: object): boolean;
  trigger(event: Event): void;
  /** False when the canvas would exceed the image memory budget. */
  increaseMemoryForImage(image: unknown): boolean;
  decreaseMemoryForImage(image: unknown): void;
}

/** What the dictionary needs from GScene (engine-scene-document). */
export interface DictionaryScene {
  getWorkspace(): DictionaryWorkspace | null;
  addEventListener(
    eventClass: EventClass,
    listener: (event: never) => void,
    target: object | null | undefined,
    args: readonly unknown[] | null | undefined,
    prepend?: boolean,
    persistent?: boolean,
  ): void;
  removeEventListener(eventClass: EventClass, listener: unknown, target?: object): boolean;
  accept(visitor: (node: Node) => unknown): unknown;
}

/** The workspace's url event class, registered by engine-scene-document. */
function resolveUrlEventClass(): ResolveUrlEventClass {
  const cls = getRegisteredClass("GWorkspace.ResolveUrlEvent");
  if (!cls) throw new Error("GWorkspace.ResolveUrlEvent is not registered");
  return cls as ResolveUrlEventClass;
}

interface AfterInsertOrRemove {
  node: Node;
}

/** Sent when `sanitize` recreated an entry a node referred to but the dictionary lacked. */
export class ResolvedMissingEntryEvent extends Event {
  static {
    registerClass(this, "GSceneDictionary.ResolvedMissingEntryEvent");
  }

  declare entry: DictionaryEntry | null;
  declare scene: DictionaryScene | null;

  constructor(scene: DictionaryScene, entry: DictionaryEntry) {
    super();
    this.entry = entry;
    this.scene = scene;
  }
}
ResolvedMissingEntryEvent.prototype.entry = null;
ResolvedMissingEntryEvent.prototype.scene = null;

/** The paint layers of a stylable node, or null. */
function paintLayersOf(node: Node): PaintLayers | null {
  if (!node.hasMixin(Stylable)) return null;
  return (node as unknown as { getPaintLayers(): PaintLayers | null }).getPaintLayers();
}

export class SceneDictionary extends Dictionary {
  static {
    registerClass(this, "GSceneDictionary");
  }

  static ResolvedMissingEntryEvent = ResolvedMissingEntryEvent;

  declare _scene: DictionaryScene;
  declare _workspace: DictionaryWorkspace | null;
  declare _memory: number;

  constructor(scene: DictionaryScene) {
    super();
    this._scene = scene;
    this._scene.addEventListener(
      AfterInsertEvent,
      this._afterInsertEvent as (event: never) => void,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      AfterRemoveEvent,
      this._afterRemoveEvent as (event: never) => void,
      this,
      undefined,
      undefined,
      true,
    );
    const workspace = scene.getWorkspace();
    if (workspace) {
      this._workspace = workspace;
      this._workspace.addEventListener(
        resolveUrlEventClass(),
        this._resolveUrlEvent as (event: never) => void,
        this,
      );
    }
  }

  /**
   * Resolves this scene's dictionary urls: an entry holding a file, http
   * or data url answers directly, anything else (a cloud id) is asked of
   * the workspace again.
   */
  _resolveUrlEvent(event: ResolveUrlEventLike): void {
    if (Dictionary.isDictionary(event.url) && event.scene === this._scene) {
      const value = this.getValue(event.url) as string | null;
      if (value) {
        if (/^(file|http|data|\/\/)/i.test(value)) {
          (event.resolved as (url: string) => void)(value);
        } else {
          const ResolveUrlEvent = resolveUrlEventClass();
          (this._workspace as DictionaryWorkspace).trigger(
            new ResolveUrlEvent(value, event.scene, event.resolved),
          );
        }
      }
    }
  }

  /**
   * An inserted image or texture fill with a plain url gets a dictionary
   * url; entries it already used are recounted.
   */
  _afterInsertEvent(event: AfterInsertOrRemove): void {
    const entries: Record<string, DictionaryEntry> = {};
    const url = this._getUrl(event.node);
    if (url) {
      if (Dictionary.isDictionary(url)) {
        if (!(url in entries)) {
          const entry = this.getEntry(url);
          if (entry) entries[url] = entry;
          else this._redirectUrl(event.node);
        }
      } else this._redirectUrl(event.node);
    }
    if (event.node.hasMixin(Stylable)) {
      const layers = paintLayersOf(event.node);
      if (layers) {
        layers.getLayers().forEach((layer) => {
          const layerUrl = this._getUrl(layer);
          if (Dictionary.isDictionary(layerUrl)) {
            if (!(layerUrl in entries)) {
              const entry = this.getEntry(layerUrl);
              if (entry) entries[layerUrl] = entry;
            }
          } else this._redirectUrl(layer);
        });
      }
    }
    this._updateReferences(entries);
  }

  /** Drops one reference per url the removed node used (only the node itself, not its children). */
  _afterRemoveEvent(event: AfterInsertOrRemove): void {
    const url = this._getUrl(event.node);
    if (url) this.removeEntry(url);
    if (event.node.hasMixin(Stylable)) {
      const layers = paintLayersOf(event.node);
      if (layers) {
        layers.getLayers().forEach((layer) => {
          const layerUrl = this._getUrl(layer);
          if (layerUrl) this.removeEntry(layerUrl);
        });
      }
    }
  }

  /** Replaces a node's plain url by a dictionary url (without a property change). */
  _redirectUrl(node: Node): void {
    const url = this._getUrl(node);
    if (!Dictionary.isDictionary(url)) {
      const entry = this.putValueIfAbsent(url);
      if (entry) {
        if (node instanceof PaintLayer) (node.$_pt as TexturePattern)._url = entry.getUrl();
        else if (node instanceof Image) node.$url = entry.getUrl();
      }
    }
  }

  /**
   * Recounts the references of `entries` over the whole scene; an entry
   * left without references is removed (dropped from the map with `remove`).
   */
  _updateReferences(entries: Record<string, DictionaryEntry>, remove?: boolean): void {
    const list = Object.keys(entries).map((key) => {
      const entry = entries[key] as DictionaryEntry;
      entry.references = 0;
      return entry;
    });
    if (!list.length) return;
    this._scene.accept((node) => {
      if (node instanceof Image && String(node.$url) in entries) {
        (entries[String(node.$url)] as DictionaryEntry).references++;
      }
      if (node.hasMixin(Stylable)) {
        const layers = paintLayersOf(node);
        if (layers) {
          layers.getLayers().forEach((layer) => {
            const url = this._getUrl(layer);
            if (String(url) in entries) (entries[String(url)] as DictionaryEntry).references++;
          });
        }
      }
      if (node instanceof Swatch) {
        const url = this._getUrl(node);
        if (String(url) in entries) (entries[String(url)] as DictionaryEntry).references++;
      }
    });
    list.forEach((entry) => {
      if (!entry.hasReferences()) this.removeEntry(entry, remove);
    });
  }

  /** The url of an image, or of a paint layer's or swatch's texture. */
  _getUrl(node: Node): string | null {
    if (node instanceof PaintLayer || node instanceof Swatch) {
      if (node.$_pt && node.$_pt instanceof TexturePattern && node.$_pt._url) return node.$_pt._url;
    } else if (node instanceof Image) return node.$url;
    return null;
  }

  /**
   * Stores the decoded canvas of an entry, moving the workspace's memory
   * count from the old canvas to the new one. False (and nothing stored)
   * when the budget is exceeded.
   */
  setCachedCanvas(entry: DictionaryEntry, canvas: unknown): boolean {
    const workspace = this._scene.getWorkspace();
    if (workspace) {
      workspace.decreaseMemoryForImage(entry.cachedCanvas);
      if (!workspace.increaseMemoryForImage(canvas)) {
        console.warn("MAX IMAGE MEMORY EXCEEDED");
        return false;
      }
      if (canvas) entry.cachedCanvas = canvas;
    }
    return true;
  }

  override release(): void {
    this._scene.removeEventListener(AfterInsertEvent, this._afterInsertEvent, this);
    this._scene.removeEventListener(AfterRemoveEvent, this._afterRemoveEvent, this);
    const workspace = this._scene.getWorkspace();
    if (workspace) {
      workspace.removeEventListener(resolveUrlEventClass(), this._resolveUrlEvent, this);
    }
    this.getEntries().forEach((entry) => {
      if (workspace) workspace.decreaseMemoryForImage(entry.cachedCanvas);
      entry.cachedCanvas = null;
      Reflect.deleteProperty(this._map, String(entry.uuid));
    });
    this._memory = 0;
  }

  /**
   * Recreates entries that nodes refer to but the dictionary lacks, from
   * the value the node kept (an image's `storedUrl`, a texture's raw url).
   * Throws when there is no value to recreate one from.
   */
  override sanitize(): void {
    const ensure = (url: unknown, value: unknown) => {
      if (Dictionary.isDictionary(url) && !this.getEntry(url)) {
        const id = url.substring((Dictionary.PROTOCOL + "://").length);
        if (!value) throw new Error("Missing entry value for " + url);
        const entry = new this.EntryClass(value, id);
        if (!this.addEntry(entry)) throw new Error("Could not add an entry for " + url);
        if (this.hasEventListeners(ResolvedMissingEntryEvent)) {
          this.trigger(new ResolvedMissingEntryEvent(this._scene, entry));
        }
      }
    };
    this._scene.accept((node) => {
      if (node instanceof Image) {
        ensure(node.getProperty("url"), node.getProperty("storedUrl"));
      }
      if (node.hasMixin(Stylable)) {
        const layers = paintLayersOf(node);
        if (layers) {
          layers.getLayers().forEach((layer) => {
            if (layer instanceof PaintLayer) {
              const pattern = layer.getProperty("_pt");
              if (pattern && pattern instanceof TexturePattern) {
                const url = pattern.getUrl();
                if (url && "string" == typeof url) ensure(url, pattern.getRawUrl());
              }
            }
          });
        }
      }
    });
  }

  /** Recounts every entry and drops those without references. */
  override flush(): void {
    const entries: Record<string, DictionaryEntry> = {};
    this.getEntries().forEach((entry) => {
      entries[entry.getUrl()] = entry;
    });
    this._updateReferences(entries, true);
    const workspace = this._scene.getWorkspace();
    this.getEntries().forEach((entry) => {
      if (!entry.hasReferences()) {
        Reflect.deleteProperty(this._map, String(entry.uuid));
        if (workspace) workspace.decreaseMemoryForImage(entry.cachedCanvas);
      }
    });
  }
}
SceneDictionary.prototype._workspace = null;
SceneDictionary.prototype._memory = 0;
