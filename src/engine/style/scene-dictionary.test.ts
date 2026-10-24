import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Event } from "../core/event.ts";
import { registerClass } from "../core/object.ts";
import { Platform, WebBrowser } from "../core/platform.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { Group } from "../scene/group.ts";
import { Image } from "../scene/image.ts";
import { registerNodeClass, type NodeWorkspace } from "../scene/node.ts";
import { DictionaryEntry } from "./dictionary.ts";
import { ResolvedMissingEntryEvent, SceneDictionary } from "./scene-dictionary.ts";

/** The workspace cluster registers the real one; this file runs without it. */
class TestResolveUrlEvent extends Event {
  static {
    registerClass(this, "GWorkspace.ResolveUrlEvent");
  }
}
void TestResolveUrlEvent;

/** A scene stand-in that owns a scene dictionary; images stay unresolved (no url resolution). */
class DictionaryTestScene extends Group {
  static {
    registerNodeClass(this, "testdictionaryscene", "GTestDictionaryScene");
  }

  dictionary: SceneDictionary;
  memory = { allowed: true, increased: [] as unknown[], decreased: [] as unknown[] };
  workspace = {
    addEventListener: () => {},
    removeEventListener: () => false,
    trigger: () => {},
    increaseMemoryForImage: (image: unknown) => {
      this.memory.increased.push(image);
      return this.memory.allowed;
    },
    decreaseMemoryForImage: (image: unknown) => {
      this.memory.decreased.push(image);
    },
  };

  constructor() {
    super();
    // A node workspace without resolveUrl: images get no further than Resolving.
    const nodeWorkspace = {
      getTransactionRecorder: () => null,
      addReference: () => {},
      removeReference: () => {},
      getReference: () => null,
      resolveUrl: () => {},
    } as NodeWorkspace;
    this.dictionary = new SceneDictionary(this as never);
    this._setWorkspace(nodeWorkspace);
    this._setScene(this as never);
  }

  override getWorkspace(): never {
    return this.workspace as never;
  }

  getDictionary(): SceneDictionary {
    return this.dictionary;
  }

  addDestroyable(): void {}
  _unsetSceneNode(): void {}
  _invalidateArea(): void {}
  getTransformSettings(): null {
    return null;
  }
  link(): void {}
  unlink(): void {}
  hasLinks(): boolean {
    return false;
  }
  visitLinks(): void {}
  visitReferences(): void {}
  override validateInsertion(): boolean {
    return true;
  }
}

function imageWithUrl(url: string): Image {
  const image = new Image();
  image.setProperty("url", url);
  return image;
}

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeCanvas();
  Platform.setWebBrowser(WebBrowser.Chrome);
});
afterEach(() => uninstall());

describe("GSceneDictionary", () => {
  it("stores one entry per url and counts the images using it", () => {
    const scene = new DictionaryTestScene();
    const a = imageWithUrl("data:image/png;base64,AAAA");
    const b = imageWithUrl("data:image/png;base64,AAAA");
    scene.appendChild(a);
    scene.appendChild(b);
    const entries = scene.dictionary.getEntries();
    expect(entries.length).toBe(1);
    expect(a.getProperty("url")).toBe((entries[0] as DictionaryEntry).getUrl());
    expect(b.getProperty("url")).toBe(a.getProperty("url"));
    scene.dictionary.flush();
    expect((entries[0] as DictionaryEntry).references).toBe(2);
    scene.removeChild(b);
    scene.dictionary.flush();
    expect((entries[0] as DictionaryEntry).references).toBe(1);
    scene.removeChild(a);
    scene.dictionary.flush();
    expect(scene.dictionary.getEntries()).toEqual([]);
  });

  it("recreates a missing entry from the stored url and says so", () => {
    const scene = new DictionaryTestScene();
    const image = imageWithUrl("data:image/png;base64,BBBB");
    scene.appendChild(image);
    const url = image.getProperty("url") as string;
    const entry = scene.dictionary.getEntry(url) as DictionaryEntry;
    Reflect.deleteProperty(scene.dictionary._map, String(entry.uuid));
    image.$storedUrl = "data:image/png;base64,BBBB";
    const events: unknown[] = [];
    scene.dictionary.addEventListener(ResolvedMissingEntryEvent, (e: ResolvedMissingEntryEvent) =>
      events.push(e.entry?.value),
    );
    scene.dictionary.sanitize();
    expect(scene.dictionary.getValue(url)).toBe("data:image/png;base64,BBBB");
    expect(events).toEqual(["data:image/png;base64,BBBB"]);
    image.$storedUrl = null;
    Reflect.deleteProperty(scene.dictionary._map, String(entry.uuid));
    expect(() => scene.dictionary.sanitize()).toThrow("Missing entry value for " + url);
  });

  it("keeps the data of an image removed before a save for when it comes back (BUG-026)", () => {
    // Undo of an inserted image, Save, Redo.
    const scene = new DictionaryTestScene();
    const image = imageWithUrl("data:image/png;base64,DDDD");
    scene.appendChild(image);
    const url = image.getProperty("url") as string;
    scene.removeChild(image);
    // The save writes only entries something refers to.
    expect(scene.dictionary.serialize().entries).toEqual([]);
    expect(scene.dictionary.getEntry(url)).toBeUndefined();
    scene.appendChild(image);
    expect(image.getProperty("url")).toBe(url);
    expect(scene.dictionary.getValue(url)).toBe("data:image/png;base64,DDDD");
    // The old dictionary lost the data here, and this save threw
    // "Missing entry value for dictionary://...".
    const saved = scene.dictionary.serialize().entries;
    expect(saved.map((entry) => entry.value)).toEqual(["data:image/png;base64,DDDD"]);
    expect(scene.dictionary.getEntry(url)?.references).toBe(1);
  });

  it("answers the workspace for its own urls", () => {
    const scene = new DictionaryTestScene();
    const entry = scene.dictionary.putValueIfAbsent(
      "data:image/png;base64,CCCC",
    ) as DictionaryEntry;
    const resolved: string[] = [];
    scene.dictionary._resolveUrlEvent({
      url: entry.getUrl(),
      scene,
      resolved: (url: string) => resolved.push(url),
    } as never);
    scene.dictionary._resolveUrlEvent({
      url: entry.getUrl(),
      scene: new DictionaryTestScene(),
      resolved: (url: string) => resolved.push("other " + url),
    } as never);
    expect(resolved).toEqual(["data:image/png;base64,CCCC"]);
  });

  it("keeps cached canvases within the workspace's memory budget", () => {
    const scene = new DictionaryTestScene();
    const entry = new DictionaryEntry("x");
    expect(scene.dictionary.setCachedCanvas(entry, "canvas 1")).toBe(true);
    expect(entry.cachedCanvas).toBe("canvas 1");
    scene.memory.allowed = false;
    expect(scene.dictionary.setCachedCanvas(entry, "canvas 2")).toBe(false);
    expect(entry.cachedCanvas).toBe("canvas 1");
    expect(scene.memory.decreased).toEqual([null, "canvas 1"]);
  });
});
