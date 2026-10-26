import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { System } from "../../engine/core/system.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { flush, installFakeDom, type FakeDom, type FakeElement } from "./dom.testing.ts";
import {
  BrowserFileItem,
  BrowserFileStorage,
  resetBrowserFileStorageState,
  savePickerFallbackType,
  type FileHandleLike,
  type WritableLike,
} from "./file-system-access.ts";
import {
  setStorageHost,
  setStorageMessageDialog,
  type StorageItem,
  type StorageHost,
} from "./storage.ts";

const GVDESIGN = { ext: "gvdesign", mime: "application/gravit+design" };
const PNG = { ext: "png", mime: "image/png" };
const JPG = { ext: "jpg", mime: "image/jpeg" };
const JPEG = { ext: "jpeg", mime: "image/jpeg" };

let dom: FakeDom;
let messages: string[];
let log: unknown[];

/** The download links saveAs clicked so far (call flush first). */
function downloads(): { readonly names: string[] } {
  return {
    get names() {
      return dom.created
        .filter((e) => e.tagName === "a" && e.dispatched.length > 0)
        .map((e) => e.download);
    },
  };
}

function handle(name: string, bytes = new Uint8Array([1, 2, 3])): FileHandleLike {
  return {
    name,
    getFile: async () => {
      log.push(["getFile", name]);
      return new File([bytes], name);
    },
    createWritable: async () => {
      log.push(["createWritable", name]);
      const writable: WritableLike = {
        truncate: async (n) => void log.push(["truncate", n]),
        write: async (d) => void log.push(["write", (d as Uint8Array).length]),
        close: async () => void log.push(["close"]),
      };
      return writable;
    },
  };
}

beforeEach(() => {
  // Before the fake DOM: the engine probes a real-looking canvas when a scene is made.
  const scene = new Scene(new Workspace());
  dom = installFakeDom();
  messages = [];
  log = [];
  const host: StorageHost = {
    getSetting: () => undefined,
    setSetting: () => {},
    getActiveDocument: () => ({ getScene: () => scene, getStorageItem: () => null }),
    getDocuments: () => [],
  };
  setStorageHost(host);
  setStorageMessageDialog((text) => void messages.push(text));
  resetBrowserFileStorageState();
});

afterEach(() => {
  setStorageHost(null);
  setStorageMessageDialog(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BrowserFileStorage capabilities (FMT-STORAGE-002)", () => {
  it("saves through handles only with showSaveFilePicker and not on ChromeOS", () => {
    const storage = new BrowserFileStorage();
    expect([storage.canSave(), storage.canPromptSave(), storage.canPromptOpen()]).toEqual([
      false,
      false,
      true,
    ]);
    expect(storage.canDownload()).toBe(true);
    dom.window.showSaveFilePicker = async () => handle("x");
    expect([storage.canSave(), storage.canPromptSave()]).toEqual([true, true]);
    dom.navigator.userAgent = "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) Chrome/120";
    expect(storage.canSave()).toBe(false);
  });

  it("never offers directories without chooseFileSystemEntries", () => {
    dom.window.showSaveFilePicker = async () => handle("x");
    expect(new BrowserFileStorage().canChooseDirectory()).toBe(false);
  });
});

describe("open (FMT-STORAGE-003, FMT-STORAGE-004)", () => {
  it("opens every picked file with its bytes and handle", async () => {
    let options: unknown = null;
    dom.window.showSaveFilePicker = async () => handle("x");
    dom.window.showOpenFilePicker = async (o: unknown) => {
      options = o;
      return [handle("a.gvdesign", new Uint8Array([7])), handle("b.gvdesign")];
    };
    const opened: [string | null, number, number, boolean][] = [];
    new BrowserFileStorage().openPrompt(
      [GVDESIGN, PNG],
      (item, count) => {
        const local = item as BrowserFileItem;
        let length = -1;
        local.read((data) => (length = data ? data.length : -1));
        opened.push([item.getFullName(), count, length, local.getFileHandle() !== null]);
      },
      true,
    );
    await flush();
    expect(options).toEqual({
      multiple: true,
      excludeAcceptAllOption: true,
      types: [
        {
          description: "*.gvdesign, *.png",
          accept: { "application/gravit+design": ".gvdesign", "image/png": ".png" },
        },
      ],
    });
    expect(opened).toEqual([
      ["a.gvdesign", 2, 1, true],
      ["b.gvdesign", 2, 3, true],
    ]);
    expect(dom.created).toHaveLength(0);
  });

  it("ignores a cancelled picker and warns about other errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    dom.window.showSaveFilePicker = async () => handle("x");
    dom.window.showOpenFilePicker = async () => {
      throw new DOMException("cancelled", "AbortError");
    };
    const done = vi.fn();
    const storage = new BrowserFileStorage();
    storage.openPrompt([], done, false);
    await flush();
    expect(warn).not.toHaveBeenCalled();
    dom.window.showOpenFilePicker = async () => {
      throw new Error("odd");
    };
    storage.openPrompt([], done, false);
    await flush();
    expect(warn).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
  });

  it("uses the hidden file input without the API, reading files one after the other", async () => {
    const storage = new BrowserFileStorage();
    const opened: [string | null, number, number[]][] = [];
    storage.openPrompt(
      [GVDESIGN, PNG],
      (item, count) => {
        item.read((data) => opened.push([item.getFullName(), count, [...(data ?? [])]]));
      },
      true,
    );
    const input = dom.created[0] as FakeElement;
    expect(dom.appended).toEqual([input]);
    expect(input.getAttribute("type")).toBe("file");
    expect(input.getAttribute("id")).toBe("file-input");
    expect(input.multiple).toBe(true);
    expect(input.style).toMatchObject({ position: "absolute", left: "-9999px", top: "-9999px" });
    expect(input.getAttribute("accept")).toBe(
      System.operatingSystem === System.OperatingSystem.OSX_IOS ? null : ".gvdesign,.png",
    );
    expect([input.focused, input.clicks]).toEqual([1, 1]);
    input.value = "C:\\fakepath\\a.gvdesign";
    input.choose([
      new File([new Uint8Array([1])], "a.gvdesign"),
      new File([new Uint8Array([2, 2])], "b.png"),
    ]);
    await flush();
    expect(opened).toEqual([
      ["a.gvdesign", 2, [1]],
      ["b.png", 2, [2, 2]],
    ]);
    expect(input.value).toBe("");
  });

  it("creates the input once: multiple and accept follow each call (BUG-142)", () => {
    const storage = new BrowserFileStorage();
    storage.openPrompt([GVDESIGN], () => {}, false);
    expect((dom.created[0] as FakeElement).multiple).toBe(false);
    storage.openPrompt([], () => {}, true, { silent: true });
    expect(dom.created).toHaveLength(1);
    const input = dom.created[0] as FakeElement;
    expect(input.multiple).toBe(true);
    expect(input.getAttribute("accept")).toBeNull();
    expect(input.clicks).toBe(1);
    expect(input.focused).toBe(2);
  });

  it("uses the input when the API is turned off for the call", () => {
    dom.window.showSaveFilePicker = async () => handle("x");
    dom.window.showOpenFilePicker = vi.fn();
    new BrowserFileStorage().openPrompt([PNG], () => {}, false, {
      disableFileSystemAccessAPI: true,
    });
    expect(dom.window.showOpenFilePicker).not.toHaveBeenCalled();
    expect(dom.created).toHaveLength(1);
  });
});

describe("save prompt (FMT-STORAGE-007)", () => {
  it("passes the name and types and gives an item on the picked handle", async () => {
    let options: unknown = null;
    dom.window.showSaveFilePicker = async (o: unknown) => {
      options = o;
      return handle("picked.gvdesign");
    };
    let item: StorageItem | null = null;
    new BrowserFileStorage().savePrompt("Untitled-1.gvdesign", [GVDESIGN], (i) => (item = i));
    await flush();
    expect(options).toEqual({
      suggestedName: "Untitled-1.gvdesign",
      excludeAcceptAllOption: true,
      types: [{ description: "*.gvdesign", accept: { "application/gravit+design": ".gvdesign" } }],
    });
    expect((item as unknown as BrowserFileItem).getFullName()).toBe("picked.gvdesign");
    expect((item as unknown as BrowserFileItem).getFileHandle()).not.toBeNull();
  });

  it("rewrites the JPG MIME type when saving and lists repeated MIME types", async () => {
    let options: { types?: unknown[] } = {};
    dom.window.showSaveFilePicker = async (o: { types?: unknown[] }) => {
      options = o;
      return handle("x.jpg");
    };
    new BrowserFileStorage().savePrompt(
      "x.jpg",
      [JPG, JPEG, { ext: ".jpe", mime: "image/jpeg" }],
      () => {},
    );
    await flush();
    expect(options.types).toEqual([
      {
        description: "*.jpg, *.jpeg, *.jpe",
        accept: { "x-really-an-image/jpeg": ".jpg", "image/jpeg": [".jpeg", ".jpe"] },
      },
    ]);
  });

  it("sends no suggested name without types", async () => {
    let options: unknown = null;
    dom.window.showSaveFilePicker = async (o: unknown) => {
      options = o;
      return handle("x");
    };
    new BrowserFileStorage().savePrompt("x.png", [], () => {});
    await flush();
    expect(options).toEqual({});
  });

  it("calls cancel when the user aborts, downloads on any other failure", async () => {
    const storage = new BrowserFileStorage();
    dom.window.showSaveFilePicker = async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    };
    const done = vi.fn();
    const cancel = vi.fn();
    storage.savePrompt("a.png", [PNG], done, cancel);
    await flush();
    expect([done.mock.calls.length, cancel.mock.calls.length]).toEqual([0, 1]);
    dom.window.showSaveFilePicker = async () => {
      throw new TypeError("bad options");
    };
    storage.savePrompt("a.png", [PNG], done, cancel);
    await flush();
    expect(cancel).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledOnce();
    const item = done.mock.calls[0]?.[0] as BrowserFileItem;
    expect([item.getFullName(), item.getFileHandle()]).toEqual(["a.png", null]);
    expect(savePickerFallbackType()).toBe("saveFile");
  });

  it("does nothing without the API", () => {
    const done = vi.fn();
    new BrowserFileStorage().savePrompt("a.png", [PNG], done);
    expect(done).not.toHaveBeenCalled();
  });

  it("download gives an item without handle", () => {
    const item = new BrowserFileStorage().download("b.svg", (i) => i) as BrowserFileItem;
    expect([item.getFullName(), item.getFileHandle(), item.getExtension()]).toEqual([
      "b.svg",
      null,
      "SVG",
    ]);
  });
});

describe("write (FMT-STORAGE-008)", () => {
  const bytes = new Uint8Array(300);

  it("truncates, writes and closes the handle, then calls done", async () => {
    const save = downloads();
    const storage = new BrowserFileStorage();
    const item = new BrowserFileItem(storage, null, "a.gvdesign", handle("a.gvdesign"));
    const done = vi.fn(() => log.push(["done"]));
    item.write(bytes, done);
    await flush();
    expect(log).toEqual([
      ["createWritable", "a.gvdesign"],
      ["truncate", 0],
      ["write", 300],
      ["close"],
      ["done"],
    ]);
    expect(save.names).toEqual([]);
    expect(messages).toEqual([]);
  });

  it("downloads when there is no handle", async () => {
    const save = downloads();
    const done = vi.fn();
    new BrowserFileItem(new BrowserFileStorage(), null, "a.gvdesign").write(bytes, done);
    await flush();
    expect(save.names).toEqual(["a.gvdesign"]);
    expect(done).toHaveBeenCalledOnce();
  });

  it("downloads when the handle fails", async () => {
    const save = downloads();
    const failing = handle("a.gvdesign");
    failing.createWritable = async () => {
      throw new DOMException("no", "NotAllowedError");
    };
    const done = vi.fn();
    const fail = vi.fn();
    new BrowserFileItem(new BrowserFileStorage(), null, "a.gvdesign", failing).write(
      bytes,
      done,
      fail,
    );
    await flush();
    expect(save.names).toEqual(["a.gvdesign"]);
    expect([done.mock.calls.length, fail.mock.calls.length]).toEqual([1, 0]);
  });

  it("reports a full disk and calls fail instead of downloading", async () => {
    const save = downloads();
    const full = handle("a.gvdesign");
    full.createWritable = async () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    const done = vi.fn();
    const fail = vi.fn();
    const item = new BrowserFileItem(new BrowserFileStorage(), null, "a.gvdesign", full);
    item.write(bytes, done, fail);
    await flush();
    expect(save.names).toEqual([]);
    expect([done.mock.calls.length, fail.mock.calls.length]).toEqual([0, 1]);
    expect(messages).toEqual([expect.stringContaining("no enough space")]);
    item.write(bytes, done);
    await flush();
    expect(done).toHaveBeenCalledOnce();
  });

  it("downloads too and calls done twice when done throws after a write", async () => {
    const save = downloads();
    let calls = 0;
    const done = () => {
      calls++;
      if (calls === 1) throw new Error("caller bug");
    };
    new BrowserFileItem(new BrowserFileStorage(), null, "a.gvdesign", handle("a.gvdesign")).write(
      bytes,
      done,
    );
    await flush();
    expect(calls).toBe(2);
    expect(save.names).toEqual(["a.gvdesign"]);
  });

  it("warns about a tiny file before writing it", () => {
    new BrowserFileItem(new BrowserFileStorage(), null, "a.gvdesign").write(new Uint8Array(10));
    expect(messages).toEqual([expect.stringContaining("There was a problem saving your file")]);
  });

  it("reads the bytes through the handle once", async () => {
    const item = new BrowserFileItem(
      new BrowserFileStorage(),
      null,
      "a",
      handle("a", new Uint8Array([9, 9])),
    );
    const seen: number[][] = [];
    item.read((d) => seen.push([...(d ?? [])]));
    await flush();
    item.read((d) => seen.push([...(d ?? [])]));
    expect(seen).toEqual([
      [9, 9],
      [9, 9],
    ]);
    expect(log.filter((e) => (e as string[])[0] === "getFile")).toHaveLength(1);
  });
});

describe("chooseDirectory", () => {
  it("turns directories off after a SecurityError", async () => {
    dom.window.showSaveFilePicker = async () => handle("x");
    dom.window.chooseFileSystemEntries = async () => {
      throw new DOMException("no", "SecurityError");
    };
    const storage = new BrowserFileStorage();
    expect(storage.canChooseDirectory()).toBe(true);
    const denied = vi.fn();
    const cancel = vi.fn();
    storage.chooseDirectory(() => {}, cancel, denied);
    await flush();
    expect([denied.mock.calls.length, cancel.mock.calls.length]).toEqual([1, 0]);
    expect(storage.canChooseDirectory()).toBe(false);
  });

  it("switches the picker type after a TypeError and hands out the directory", async () => {
    dom.window.showSaveFilePicker = async () => handle("x");
    const types: string[] = [];
    const dir = {
      queryPermission: async () => "granted" as PermissionState,
      requestPermission: async () => "granted" as PermissionState,
      getDirectory: vi.fn(),
      getFile: vi.fn(),
    };
    dom.window.chooseFileSystemEntries = async (o: { type: string }) => {
      types.push(o.type);
      if (types.length === 1) throw new TypeError("unknown type");
      return dir;
    };
    const storage = new BrowserFileStorage();
    const cancel = vi.fn();
    const done = vi.fn();
    storage.chooseDirectory(done, cancel);
    await flush();
    storage.chooseDirectory(done, cancel);
    await flush();
    expect(types).toEqual(["open-directory", "openDirectory"]);
    expect(cancel).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledOnce();
  });
});
