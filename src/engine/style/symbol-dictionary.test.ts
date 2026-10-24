import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Transform } from "../math/transform.ts";
import { Canvas2DPaintCanvas } from "../paint/paint-canvas.ts";
import { FakeImage, installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { Group } from "../scene/group.ts";
import { AfterSpecialChangeEvent } from "../scene/node-events.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "../scene/node.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { Symbol, SymbolThumbnailEvent } from "../scene/symbol.ts";
import {
  SymbolDictionary,
  SymbolDictionaryEntry,
  type SymbolEntryValue,
} from "./symbol-dictionary.ts";

/** A scene stand-in that owns a symbol dictionary and records special changes. */
class SymbolDictionaryTestScene extends Group {
  static {
    registerNodeClass(this, "testsymboldictionaryscene", "GTestSymbolDictionaryScene");
  }

  symbols: SymbolDictionary;
  recorded: [string, boolean][] = [];
  sent: boolean[] = [];

  constructor() {
    super();
    const references = new Map<string, Node>();
    const workspace: NodeWorkspace = {
      getTransactionRecorder: () => null,
      addReference: (n) => references.set((n as Symbol).getReferenceId(), n),
      removeReference: (n) => references.delete((n as Symbol).getReferenceId()),
      getReference: (id) => references.get(id) ?? null,
    };
    this.symbols = new SymbolDictionary(this as never);
    this._setWorkspace(workspace);
    this._setScene(this as never);
    this.addEventListener(AfterSpecialChangeEvent, (e: AfterSpecialChangeEvent) =>
      this.sent.push((e.data as { created: boolean }).created),
    );
  }

  override getWorkspace(): never {
    return {
      getTransactionRecorder: () => ({
        afterSpecialChange: (node: Node, data: { created: boolean }) =>
          this.recorded.push([Node.getName(node), data.created]),
      }),
    } as never;
  }

  link(): void {}
  unlink(): void {}
  hasLinks(): boolean {
    return false;
  }
  visitLinks(): void {}
  visitReferences(): void {}
  startBlockReferenceChanges(): void {}
  endBlockReferenceChanges(): void {}
  _unsetSceneNode(): void {}
  _invalidateArea(): void {}
  getTransformSettings(): null {
    return null;
  }
  getLabelBBox(): never {
    return { getHeight: () => 0 } as never;
  }
  override validateInsertion(): boolean {
    return true;
  }
}

function master(scene: SymbolDictionaryTestScene, name: string): Symbol {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(5, 0, 0, 5, 5, 5));
  scene.appendChild(r);
  return Symbol.create([r], scene, name);
}

describe("symbol dictionary", () => {
  it("keeps an entry per master inserted into the scene", () => {
    const scene = new SymbolDictionaryTestScene();
    const one = master(scene, "One");
    const two = master(scene, "Two");
    expect(scene.symbols.getSymbols()).toEqual([one, two]);
    expect(scene.symbols.getEntry(one.getMultireferenceId())?.value).toEqual({
      image: null,
      symbol: one,
    });
    expect(scene.recorded).toEqual([
      ["symbol", true],
      ["symbol", true],
    ]);
    expect(scene.sent).toEqual([true, true]);
    // Instances don't get entries.
    scene.appendChild(one.clone() as Symbol);
    expect(scene.symbols.getSymbols().length).toBe(2);
  });

  it("records a master's removal only when the entry is removed for good", () => {
    const scene = new SymbolDictionaryTestScene();
    const one = master(scene, "One");
    scene.symbols.removeEntry(one.getMultireferenceId(), true);
    expect(scene.symbols.getSymbols()).toEqual([]);
    expect(scene.recorded.at(-1)).toEqual(["symbol", false]);
    expect(scene.sent.at(-1)).toBe(false);
  });

  it("saves an unreferenced entry with its master and restores it as a master", () => {
    const scene = new SymbolDictionaryTestScene();
    const one = master(scene, "One");
    const entry = scene.symbols.getEntry(one.getMultireferenceId()) as SymbolDictionaryEntry;
    expect(entry.serialize()).toEqual({ uuid: entry.uuid, value: null, references: 1 });
    entry.references = 0;
    const saved = entry.serialize();
    expect(typeof (saved.value as { symbol: unknown }).symbol).toBe("string");
    const copy = new SymbolDictionaryEntry();
    copy.deserialize(saved);
    const restored = (copy.value as { symbol: Symbol }).symbol;
    expect(restored).toBeInstanceOf(Symbol);
    expect(restored._master).toBe(true);
    expect(restored.getProperty("name")).toBe("One");
  });
});

/** An image element that loads asynchronously, as browsers do: 6 x 4 pixels. */
class LoadingImage extends FakeImage {
  onload: (() => void) | null = null;
  private _src = "";

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      this.naturalWidth = 6;
      this.naturalHeight = 4;
      this.onload?.();
    });
  }
}

describe("symbol dictionary thumbnails", () => {
  let uninstall: () => void;
  let savedImage: unknown;
  beforeEach(() => {
    uninstall = installFakeCanvas();
    savedImage = globalThis.Image;
    (globalThis as unknown as { Image: unknown }).Image = LoadingImage;
  });
  afterEach(() => {
    (globalThis as unknown as { Image: unknown }).Image = savedImage;
    uninstall();
  });

  it("loads a saved thumbnail into a canvas and tells the master", async () => {
    const scene = new SymbolDictionaryTestScene();
    const one = master(scene, "One");
    const entry = scene.symbols.getEntry(one.getMultireferenceId()) as SymbolDictionaryEntry;
    entry.references = 0;
    const saved = entry.serialize();
    saved.value = { ...(saved.value as object), image: "data:image/png;base64,AAAA" };
    const copy = new SymbolDictionaryEntry();
    copy.deserialize(saved);
    const value = copy.value as SymbolEntryValue;
    // Loading runs in the background: no image yet.
    expect(value.image).toBeNull();
    const heard: unknown[] = [];
    (value.symbol as Symbol).addEventListener(SymbolThumbnailEvent, (e: SymbolThumbnailEvent) =>
      heard.push([e.symbol, e.image]),
    );
    await Promise.resolve();
    expect(value.image).toBeInstanceOf(Canvas2DPaintCanvas);
    const canvas = value.image as Canvas2DPaintCanvas;
    expect([canvas.getWidth(), canvas.getHeight()]).toEqual([6, 4]);
    expect(heard).toEqual([[value.symbol, canvas]]);
  });

  it("keeps the thumbnail a master announces and saves it as a PNG data url", () => {
    const scene = new SymbolDictionaryTestScene();
    const one = master(scene, "One");
    const entry = scene.symbols.getEntry(one.getMultireferenceId()) as SymbolDictionaryEntry;
    const canvas = new Canvas2DPaintCanvas();
    canvas.resize(8, 8);
    one.trigger(new SymbolThumbnailEvent(one, canvas));
    expect((entry.value as SymbolEntryValue).image).toBe(canvas);
    entry.references = 0;
    const image = (entry.serialize().value as { image: unknown }).image;
    expect(image).toMatch(/^data:image\/png;/);
    // Without a thumbnail the image is saved as null.
    (entry.value as SymbolEntryValue).image = null;
    expect((entry.serialize().value as { image: unknown }).image).toBeNull();
  });

  // _afterInsert listens with a fresh bound function, which neither
  // _beforeRemove nor release can remove, so the entry keeps hearing the
  // master's thumbnails (kept).
  it("keeps listening to a master's thumbnails after removal and release", () => {
    const scene = new SymbolDictionaryTestScene();
    const one = master(scene, "One");
    const entry = scene.symbols.getEntry(one.getMultireferenceId()) as SymbolDictionaryEntry;
    one.getParent()?.removeChild(one);
    expect(entry.references).toBe(0);
    const first = new Canvas2DPaintCanvas();
    one.trigger(new SymbolThumbnailEvent(one, first));
    expect((entry.value as SymbolEntryValue).image).toBe(first);
    scene.symbols.release();
    const second = new Canvas2DPaintCanvas();
    one.trigger(new SymbolThumbnailEvent(one, second));
    expect((entry.value as SymbolEntryValue).image).toBe(second);
  });

  it("throws when removing an entry without a value for good", () => {
    const scene = new SymbolDictionaryTestScene();
    scene.symbols.addEntry(new SymbolDictionaryEntry(null, "empty"));
    expect(() => scene.symbols.removeEntry("empty", true)).toThrow(TypeError);
    // Without `remove` it only drops a reference.
    scene.symbols.removeEntry("empty");
    expect(scene.symbols.getEntry("empty")?.references).toBe(0);
  });
});
