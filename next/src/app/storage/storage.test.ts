import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { System } from "../../engine/core/system.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import {
  Storage,
  StorageItem,
  WritePermission,
  setStorageHost,
  setStorageMessageDialog,
  type StorageDocument,
  type StorageHost,
} from "./storage.ts";

class NamedItem extends StorageItem {
  constructor(
    private readonly _name: string | null,
    private readonly _id: string | null = null,
  ) {
    super(new Storage());
  }
  override getFullName(): string | null {
    return this._name;
  }
  override getUniqueId(): string | null {
    return this._id;
  }
  /** Runs the protected size checks. */
  checkBefore(length: number, document?: StorageDocument | null): void {
    this._verifyFileNotTooSmall(length, document);
  }
  checkAfter(before: number, after: number): void {
    this._fileSizeBeforeSaved = before;
    this._fileSizeAfterSaved = after;
    this._verifyFileSizeAfterSaved();
  }
}

function fakeHost(overrides: Partial<StorageHost> = {}): StorageHost & { messages: string[] } {
  const settings = new Map<string, unknown>();
  const messages: string[] = [];
  return {
    messages,
    getSetting: (k) => settings.get(k),
    setSetting: (k, v) => void settings.set(k, v),
    getActiveDocument: () => null,
    getDocuments: () => [],
    ...overrides,
  };
}

function documentOf(scene: Scene, item: StorageItem | null = null): StorageDocument {
  return { getScene: () => scene, getStorageItem: () => item };
}

let host: ReturnType<typeof fakeHost>;

beforeEach(() => {
  host = fakeHost();
  setStorageHost(host);
  setStorageMessageDialog((text) => void host.messages.push(text));
});

afterEach(() => {
  setStorageHost(null);
  setStorageMessageDialog(null);
  vi.restoreAllMocks();
});

describe("Storage.Item (FMT-STORAGE-001)", () => {
  it("splits the name at the last dot and upper-cases the extension", () => {
    const item = new NamedItem("my.design.gvdesign");
    expect(item.getName()).toBe("my.design");
    expect(item.getExtension()).toBe("GVDESIGN");
    expect(new NamedItem("noext").getName()).toBe("noext");
    expect(new NamedItem("noext").getExtension()).toBeNull();
    expect(new NamedItem(".hidden").getName()).toBe("");
    expect(new NamedItem(null).getName()).toBeNull();
  });

  it("has the old defaults and throws for what subclasses must provide", async () => {
    const item = new StorageItem(new Storage());
    expect(item.isRegistrable()).toBe(false);
    expect(item.isEditingEnabled()).toBe(true);
    expect(item.supportsShadowFile()).toBe(false);
    expect(item.getUniqueId()).toBeNull();
    expect(() => item.getFullName()).toThrow("Not implemented.");
    expect(() => item.read(() => {})).toThrow("Not implemented.");
    await expect(item.hasUpdates()).rejects.toThrow("Not implemented!");
    await item.storeFileFormatVersion(3);
    expect(item.getFileFormatVersion()).toBe(3);
  });

  it("reports a file under 200 bytes, unless the counter measure is on", () => {
    const scene = new Scene(new Workspace());
    const item = new NamedItem("a.gvdesign");
    item.checkBefore(199, documentOf(scene));
    expect(host.messages).toEqual([
      expect.stringContaining("There was a problem saving your file"),
    ]);
    item.checkBefore(200, documentOf(scene));
    expect(host.messages).toHaveLength(1);
    item.setSaveCounterMeasureEnabled(true);
    item.checkBefore(10, documentOf(scene));
    expect(host.messages).toHaveLength(1);
  });

  it("measures the gzipped scene before every write and stamps lmd", () => {
    const scene = new Scene(new Workspace());
    const item = new NamedItem("a.gvdesign");
    item.checkBefore(5000, documentOf(scene));
    expect(item.documentRealFileSize).toBeGreaterThan(20);
    expect(scene.getProperty("lmd")).not.toBeNull();
  });

  it("logs instead of throwing when there is no document at all", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    new NamedItem("a.gvdesign").checkBefore(5000);
    expect(error).toHaveBeenCalledOnce();
  });

  it("measures the active document when none is given", () => {
    const scene = new Scene(new Workspace());
    setStorageHost(fakeHost({ getActiveDocument: () => documentOf(scene) }));
    const item = new NamedItem("a.gvdesign");
    expect(item.getDocumentRealSizeAfterSave()).toBe(item.documentRealFileSize);
    expect(item.documentRealFileSize).toBeGreaterThan(20);
  });

  it("reports a file that shrank below half its size", () => {
    const item = new NamedItem("a.gvdesign");
    item.checkAfter(1000, 499);
    expect(host.messages).toHaveLength(1);
    item.checkAfter(1000, 500);
    item.checkAfter(1000, 0);
    expect(host.messages).toHaveLength(1);
  });

  it("shows the disk space message", () => {
    new NamedItem("a").notEnoughDiskSpace();
    expect(host.messages).toEqual([
      "There was no enough space on your disk. Please free some space and try again",
    ]);
  });
});

describe("Storage (FMT-STORAGE-001)", () => {
  it("can do nothing by default and grants write permission", async () => {
    const storage = new Storage();
    expect([
      storage.canChooseDirectory(),
      storage.canPromptOpen(),
      storage.canPromptSave(),
      storage.canSave(),
      storage.canDownload(),
    ]).toEqual([false, false, false, false, false]);
    expect(() => storage.download("x", () => {})).toThrow("Not implemented.");
    const permission = await storage.getWritePermission();
    expect(permission).toBeInstanceOf(WritePermission);
    expect(permission.isAuthorized()).toBe(true);
    expect(permission.hasStatusText()).toBe(false);
    expect(new WritePermission().isAuthorized()).toBe(false);
  });

  it("keeps the last directory in the settings", () => {
    const storage = new Storage();
    expect(storage.getLastDirectory()).toBe("");
    storage.storeLastDirectory("/home/me");
    expect(host.getSetting("lastDirectory")).toBe("/home/me");
    expect(storage.getLastDirectory()).toBe("/home/me");
  });

  it("falls back to the folder of an open document's item", () => {
    const sep = System.operatingSystem === System.OperatingSystem.Windows ? "\\" : "/";
    const scene = new Scene(new Workspace());
    const item = new NamedItem("a.gvdesign", ["", "files", "a.gvdesign"].join(sep));
    setStorageHost(fakeHost({ getDocuments: () => [documentOf(scene), documentOf(scene, item)] }));
    expect(new Storage().getLastDirectory()).toBe(sep + "files");
  });

  it("throws, as before, for an item without unique id", () => {
    const scene = new Scene(new Workspace());
    const item = new NamedItem("a.gvdesign");
    setStorageHost(fakeHost({ getActiveDocument: () => documentOf(scene, item) }));
    expect(() => new Storage().getLastDirectory()).toThrow(TypeError);
  });
});
