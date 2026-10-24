// Old: chunk.vendor.js module 933 (the scene's symbol dictionary, unnamed).
/**
 * The masters of a scene, keyed by their multireference id, with a
 * thumbnail each. It follows the scene: a master inserted anywhere gets
 * an entry, a removed one loses it, and both changes are recorded as
 * special changes (undo) and sent as AfterSpecialChangeEvent. The scene
 * saves it as `symbolDictionary`.
 */
import type { Event, EventClass } from "../core/event.ts";
import { registerClass } from "../core/object.ts";
import { Bitmap } from "../paint/bitmap.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../paint/paint-canvas.ts";
import {
  AfterInsertEvent,
  AfterSpecialChangeEvent,
  BeforeRemoveEvent,
} from "../scene/node-events.ts";
import { Node } from "../scene/node.ts";
import { Symbol, SymbolThumbnailEvent } from "../scene/symbol.ts";
import { Dictionary, DictionaryEntry, type DictionaryEntryBlob } from "./dictionary.ts";

/** An entry's value: the master and its thumbnail canvas. */
export interface SymbolEntryValue {
  image: PaintCanvas | null;
  symbol: Symbol | null;
}

/** What a saved entry's value looks like before `deserialize` turns it back into nodes. */
interface StoredSymbolEntryValue {
  image: unknown;
  symbol: unknown;
}

/** The part of GTransactionRecorder the dictionary reports to (engine-scene-document). */
export interface SpecialChangeRecorder {
  afterSpecialChange(node: Node, data: unknown): void;
}

/** What the symbol dictionary needs from GScene (engine-scene-document). */
export interface SymbolDictionaryScene {
  getWorkspace(): { getTransactionRecorder(): SpecialChangeRecorder | null } | null;
  addEventListener(
    eventClass: EventClass,
    listener: (event: never) => void,
    target: object | null | undefined,
    args: readonly unknown[] | null | undefined,
    prepend?: boolean,
    persistent?: boolean,
  ): void;
  removeEventListener(eventClass: EventClass, listener: unknown, target?: object): boolean;
  _canEventBeSent(eventClass: unknown): boolean;
  _sendEvent(event: Event): void;
}

function isString(value: unknown): value is string {
  return !!value && (value instanceof String || "string" == typeof value);
}

/** The special-change data for an added or removed master. */
interface SymbolChangeData {
  created: boolean;
  scene: SymbolDictionaryScene;
}

export class SymbolDictionaryEntry extends DictionaryEntry {
  static {
    registerClass(this, "GSymbolDictionary.Entry");
  }

  declare value: SymbolEntryValue | null;

  /**
   * An entry that has references saves only its id; one without saves
   * the master and its thumbnail as a PNG data url.
   */
  override serialize(): DictionaryEntryBlob {
    return this.references
      ? { uuid: this.uuid, value: null, references: this.references }
      : {
          uuid: this.uuid,
          value: {
            symbol: this.value && Node.serialize(this.value.symbol as Symbol),
            image:
              this.value &&
              this.value.image &&
              this.value.image.getBitmap().toImageDataUrl(Bitmap.ImageType.PNG),
          },
          references: this.references,
        };
  }

  /**
   * Restores the master (marked as master) and loads the thumbnail in the
   * background; the master hears AfterThumbnailUpdate when it is ready.
   */
  override deserialize(blob: DictionaryEntryBlob): void {
    this.uuid = blob.uuid;
    this.value = blob.value as SymbolEntryValue | null;
    this.references = blob.references;
    if (!this.value) return;
    const stored = this.value as unknown as StoredSymbolEntryValue;
    if (isString(stored.image)) {
      const image = new globalThis.Image();
      const value = this.value;
      image.src = stored.image;
      value.image = null;
      image.onload = () => {
        if (0 !== image.naturalWidth && 0 !== image.naturalHeight && !value.image) {
          const canvas = new Canvas2DPaintCanvas();
          canvas.resize(image.naturalWidth, image.naturalHeight);
          canvas.prepare();
          canvas.drawImage(image);
          value.image = canvas;
          if (value.symbol) value.symbol.trigger(new SymbolThumbnailEvent(value.symbol, canvas));
        }
      };
    }
    if (isString(stored.symbol)) {
      const symbol = Node.deserialize(stored.symbol) as Symbol;
      this.value.symbol = symbol;
      symbol._master = true;
    }
  }
}

export class SymbolDictionary extends Dictionary {
  static {
    registerClass(this, "GSymbolDictionary");
  }

  static override Entry = SymbolDictionaryEntry;

  declare _scene: SymbolDictionaryScene;

  constructor(scene: SymbolDictionaryScene) {
    super();
    this.EntryClass = SymbolDictionaryEntry;
    this._scene = scene;
    this._scene.addEventListener(
      AfterInsertEvent,
      this._afterInsert as (event: never) => void,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      BeforeRemoveEvent,
      this._beforeRemove as (event: never) => void,
      this,
      undefined,
      undefined,
      true,
    );
  }

  _updateThumbnail(event: SymbolThumbnailEvent): void {
    const entry = this.getEntry((event.symbol as Symbol).getMultireferenceId());
    if (entry && entry.value) (entry.value as SymbolEntryValue).image = event.image;
  }

  /** The masters, in entry order. */
  getSymbols(): Symbol[] {
    return this.getEntries()
      .map(
        (entry) =>
          (entry.value as SymbolEntryValue | null) && (entry.value as SymbolEntryValue).symbol,
      )
      .filter((symbol): symbol is Symbol => !!symbol);
  }

  /** Records an added or removed master (undo) and tells the scene. */
  _afterSymbolChange(symbol: Symbol, created: boolean): void {
    const data: SymbolChangeData = { created, scene: this._scene };
    const workspace = this._scene.getWorkspace();
    const recorder = workspace ? workspace.getTransactionRecorder() : null;
    if (recorder) recorder.afterSpecialChange(symbol, data);
    if (this._scene._canEventBeSent(AfterSpecialChangeEvent)) {
      this._scene._sendEvent(new AfterSpecialChangeEvent(symbol, data));
    }
  }

  /** Every master in the inserted subtree gets (or takes over) an entry. */
  _afterInsert(event: { node: Node }): void {
    event.node.accept((node) => {
      if (node instanceof Symbol && node.isMaster()) {
        const id = node.getMultireferenceId();
        let entry = this.getEntry(id);
        let changed: boolean;
        if (entry) {
          const value = entry.value as SymbolEntryValue | null;
          if (value) {
            changed = value.symbol !== node;
            value.symbol = node;
          } else {
            changed = true;
            entry.value = { image: null, symbol: node };
          }
        } else {
          changed = true;
          entry = new this.EntryClass({ image: null, symbol: node }, id);
          this.addEntry(entry);
        }
        if (changed) {
          this._afterSymbolChange(node, true);
          // A fresh bound function each time; _beforeRemove's never matches it (kept).
          node.addEventListener(SymbolThumbnailEvent, this._updateThumbnail.bind(this));
        }
      }
    });
  }

  /** Every master in the removed subtree loses one reference of its entry. */
  _beforeRemove(event: { node: Node }): void {
    event.node.accept((node) => {
      if (node instanceof Symbol && node.isMaster()) {
        this.removeEntry(node.getMultireferenceId());
        node.removeEventListener(SymbolThumbnailEvent, this._updateThumbnail.bind(this));
      }
    });
  }

  /**
   * With `remove`, drops a reference and records the master's removal;
   * the entry goes once it has no references left.
   */
  override removeEntry(
    entryOrKey: DictionaryEntry | string | null | undefined,
    remove?: boolean,
  ): void {
    if (remove) {
      let entry: DictionaryEntry | undefined;
      if (entryOrKey instanceof DictionaryEntry) entry = entryOrKey;
      else if (entryOrKey) entry = this.getEntry(entryOrKey);
      if (entry) {
        // An entry without a value throws here, as before.
        const symbol = (entry.value as SymbolEntryValue).symbol;
        super.removeEntry(entry, remove);
        if (symbol) this._afterSymbolChange(symbol, false);
      }
    } else super.removeEntry(entryOrKey, remove);
  }

  override release(): void {
    this._scene.removeEventListener(AfterInsertEvent, this._afterInsert, this);
    this._scene.removeEventListener(BeforeRemoveEvent, this._beforeRemove, this);
    this.getSymbols().map((symbol) => {
      if (symbol.isMaster()) {
        // Never registered unbound, so this removes nothing (kept).
        symbol.removeEventListener(SymbolThumbnailEvent, this._updateThumbnail);
      }
      return undefined;
    });
  }
}
