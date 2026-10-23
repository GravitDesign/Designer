import { describe, expect, it } from "vitest";
import { Transform } from "../math/transform.ts";
import { Group } from "../scene/group.ts";
import { AfterSpecialChangeEvent } from "../scene/node-events.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "../scene/node.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { Symbol } from "../scene/symbol.ts";
import { SymbolDictionary, SymbolDictionaryEntry } from "./symbol-dictionary.ts";

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
