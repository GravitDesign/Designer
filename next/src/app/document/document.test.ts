import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { gzipJson } from "../../io/gvdesign/format.ts";
import { ungzip } from "pako";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { Storage, StorageItem, type ReadCallback } from "../storage/storage.ts";
import { Document } from "./document.ts";
import { DocumentEvent } from "./document-event.ts";
import { DocumentStatus } from "./document-status.ts";
import { DocumentStatusEvent } from "./document-status-event.ts";
import { registerDocumentDialogs } from "./document-host.ts";

/** The part of GDesigner the document calls, with a record of the calls. */
class FakeDesigner extends EventTarget {
  workspace = new EditorWorkspace();
  active: Document | null = null;
  calls: string[] = [];
  recent: unknown[] = [];

  createScene(noPage?: boolean): Scene {
    return new Scene(this.workspace, noPage);
  }

  getWorkspace(): EditorWorkspace {
    return this.workspace;
  }

  getActiveDocument(): Document | null {
    return this.active;
  }

  activateDocument(document: Document | null): void {
    this.calls.push(document ? "activate" : "deactivate");
    this.active = document;
  }

  getWindows(): { getActiveWindow(): null } {
    return { getActiveWindow: () => null };
  }

  getSetting(_key: string, defaultValue?: unknown): unknown {
    return defaultValue;
  }

  addToRecentFiles(item: unknown): void {
    this.recent.push(item);
  }
}

/** A storage item over bytes in memory. */
class MemoryItem extends StorageItem {
  written: Uint8Array | null = null;

  constructor(
    private readonly name: string,
    private readonly bytes: Uint8Array | null = null,
  ) {
    super(new Storage());
  }

  override getFullName(): string {
    return this.name;
  }

  override read(done: ReadCallback): void {
    done(this.bytes);
  }

  override write(data: Uint8Array, done?: (() => void) | null): void {
    this.written = data;
    if (done) done();
  }
}

let designer: FakeDesigner;
const messages: string[] = [];

beforeEach(() => {
  designer = new FakeDesigner();
  setDesigner(designer as never);
  messages.length = 0;
  registerDocumentDialogs({ message: (text) => messages.push(text) });
});

afterEach(() => {
  resetGlobals();
  vi.useRealTimers();
});

/** Statuses the document reports from now on. */
function recordStatuses(document: Document): number[] {
  const statuses: number[] = [];
  document.addEventListener(DocumentStatusEvent, (event: DocumentStatusEvent) => {
    statuses.push(event.status);
  });
  return statuses;
}

function gvdesignBytes(width: number): Uint8Array {
  const scene = new Scene(designer.workspace);
  scene.getActivePage()?.setProperties(["w", "h"], [width, 100]);
  return gzipJson(Node.serialize(scene, { save: true, singleton: true }) as string);
}

describe("Document", () => {
  it("starts Ready with an editor for a new scene", () => {
    const document = new Document();
    expect(document.getStatus()).toBe(DocumentStatus.Ready);
    expect(document.getScene()).toBeInstanceOf(Scene);
    expect(document.getEditor()).toBe(Editor.getEditor(document.getScene()));
    expect(document.isNew()).toBe(true);
    expect(document.getExtension()).toBe("gvdesign");
  });

  it("numbers new documents the first time their title is asked for", () => {
    const first = new Document();
    const second = new Document();
    const secondTitle = second.getTitle();
    const firstTitle = first.getTitle();
    expect(Number(firstTitle.split("-")[1])).toBe(Number(secondTitle.split("-")[1]) + 1);
    expect(second.getTitle()).toBe(secondTitle);
    first.setTitle("Mine");
    expect(first.getTitle()).toBe("Mine");
  });

  it("deactivates an active document around a scene change", () => {
    const document = new Document();
    designer.active = document;
    designer.calls.length = 0;
    document.setScene(designer.createScene());
    expect(designer.calls).toEqual(["deactivate", "activate"]);
    designer.calls.length = 0;
    document.setScene(document.getScene());
    expect(designer.calls).toEqual([]);
  });

  it("loads .gvdesign bytes: Loading, Loaded, then Ready with the file's scene", async () => {
    const item = new MemoryItem("drawing.gvdesign", gvdesignBytes(321));
    const document = new Document(item);
    const statuses = recordStatuses(document);
    document.load();
    await vi.waitFor(() => expect(document.getStatus()).toBe(DocumentStatus.Ready));
    expect(statuses).toEqual([DocumentStatus.Loading, DocumentStatus.Loaded, DocumentStatus.Ready]);
    expect(document.getScene()?.getActivePage()?.getProperty("w")).toBe(321);
    expect(document.getTitle()).toBe("drawing");
    expect(designer.recent).toEqual([item]);
  });

  it.each([
    ["cut-off JSON", "{"],
    ["a group root", '{"@":"group"}'],
  ])("fails the load with a message for %s (BUG-100)", async (_name, text) => {
    const document = new Document(
      new MemoryItem("broken.gvdesign", new TextEncoder().encode(text)),
    );
    const statuses = recordStatuses(document);
    vi.spyOn(console, "log").mockImplementation(() => {});
    document.load();
    await vi.waitFor(() => expect(document.getStatus()).toBe(DocumentStatus.LoadFailed));
    expect(statuses).toEqual([DocumentStatus.Loading, DocumentStatus.LoadFailed]);
    expect(messages).toHaveLength(1);
  });

  it("fails the load of an unknown extension", () => {
    const document = new Document();
    document.load(new MemoryItem("notes.txt", new Uint8Array(1)));
    expect(document.getStatus()).toBe(DocumentStatus.LoadFailed);
  });

  it("saves .gvdesign: Saving, Saved, Ready, the bytes written, the save point marked", async () => {
    const item = new MemoryItem("out.gvdesign");
    const document = new Document(item);
    (document.getScene()?.getActivePage() as unknown as ContainerApi).appendChild(new Rectangle());
    const statuses = recordStatuses(document);
    const modified: unknown[] = [];
    designer.addEventListener(DocumentEvent, (event: DocumentEvent) => modified.push(event.type));
    const savePoint = vi.spyOn(document.getEditor() as Editor, "markSavePoint");
    const done = vi.fn();
    await document.store(null, done, null, { preview: () => Promise.resolve(null) });
    expect(done).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual([DocumentStatus.Saving, DocumentStatus.Saved, DocumentStatus.Ready]);
    expect(savePoint).toHaveBeenCalledTimes(1);
    const json = JSON.parse(ungzip(item.written as Uint8Array, { to: "string" })) as {
      "@": string;
    };
    expect(json["@"]).toBe("scene");
    expect(modified).toContain(DocumentEvent.Type.Modified);
    expect(designer.recent).toEqual([item]);
  });

  it("exports without status changes or a save point", async () => {
    const document = new Document();
    (document.getScene()?.getActivePage() as unknown as ContainerApi).appendChild(new Rectangle());
    const statuses = recordStatuses(document);
    const savePoint = vi.spyOn(document.getEditor() as Editor, "markSavePoint");
    const item = new MemoryItem("copy.gvdesign");
    await document.store(item, null, null, { export: true, preview: () => Promise.resolve(null) });
    expect(item.written).not.toBeNull();
    expect(statuses).toEqual([]);
    expect(savePoint).not.toHaveBeenCalled();
  });

  it("throws without a storage item to save to", async () => {
    await expect(new Document().store()).rejects.toThrow("no storage item");
  });

  it("counts the document colors of the scene and of inserted layers", () => {
    const scene = designer.createScene();
    const rectangle = new Rectangle();
    rectangle.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([255, 0, 0])));
    scene.getActivePage()?.appendChild(rectangle);
    const document = new Document(scene);
    expect(document.getDocumentColors()).toHaveLength(1);
    const other = new Rectangle();
    other.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([0, 0, 255])));
    other.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([0, 0, 255])));
    scene.getActivePage()?.appendChild(other);
    const colors = document.getDocumentColors();
    expect(colors).toHaveLength(2);
    // Most used first.
    expect(Pattern.serialize(colors[0] as Pattern)).toBe(
      Pattern.serialize(new RGBColor([0, 0, 255])),
    );
    expect(document.getDocumentColors(1)).toHaveLength(1);
  });

  it("scales an element down to a fixed-size scene and centers it", () => {
    const scene = designer.createScene();
    const page = scene.getActivePage() as Node & { setProperties(n: string[], v: unknown[]): void };
    page.setProperties(["w", "h"], [100, 100]);
    scene.setProperties(["w", "h"], [100, 100]);
    const document = new Document(scene);
    expect(scene.isFixedSized()).toBeTruthy();
    const rectangle = new Rectangle();
    rectangle.setBounds(0, 0, 400, 200);
    document.insertElement(rectangle, true, true);
    const box = rectangle.getGeometryBBox();
    expect([box?.getX(), box?.getY(), box?.getWidth(), box?.getHeight()]).toEqual([0, 25, 100, 50]);
  });

  it("throws in clearActiveStylesList like the old code", () => {
    expect(() => new Document().clearActiveStylesList()).toThrow(TypeError);
  });

  it("places a dropped file of an unknown type nowhere", () => {
    const document = new Document();
    const inserted = vi.spyOn(document, "insertElement");
    document._dropFileEvent({
      file: new File(["x"], "notes.webp", { type: "image/webp" }),
      position: { getX: () => 1, getY: () => 2 },
    });
    expect(inserted).not.toHaveBeenCalled();
  });

  it("releases its scene and storage item", () => {
    const item = new MemoryItem("a.gvdesign");
    const release = vi.spyOn(item, "release");
    const document = new Document(item);
    document.release();
    expect(document.getScene()).toBeNull();
    expect(release).toHaveBeenCalled();
  });
});
