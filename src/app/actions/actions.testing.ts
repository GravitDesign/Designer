/**
 * A fake designer and document for the action tests (Vitest runs in node):
 * one document over a real scene and editor, the internal clipboard, and a
 * stand-in for the browser document with a focused element and
 * execCommand.
 */
import { vi } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import "../../editor/element-editors/rectangle-editor.ts";
import "../../editor/element-editors/page-editor.ts";
import "../../editor/element-editors/scene-editor.ts";
import "../../editor/element-editors/layer-editor.ts";
import "../../editor/element-editors/selection-position-editor.ts";
import type { Action } from "./action.ts";
import { setActionDesigner, type ActionDesigner, type ActionDocument } from "./host.ts";

export interface FakeElement {
  nodeName: string;
  type?: string;
  isContentEditable?: boolean;
  className?: string;
  getAttribute(name: string): string | null;
}

/** An element as document.activeElement: an <input type=...>, a <div>, ... */
export function fakeElement(
  nodeName: string,
  attributes: Record<string, string> = {},
): FakeElement {
  return {
    nodeName: nodeName.toUpperCase(),
    type: attributes.type,
    getAttribute: (name) => (name in attributes ? (attributes[name] as string) : null),
  };
}

export interface FakeBrowserDocument {
  activeElement: FakeElement | null;
  execCommand: ReturnType<typeof vi.fn>;
  queryCommandSupported: () => boolean;
}

/** Puts a fake browser `document` in place; returns it. */
export function stubBrowserDocument(): FakeBrowserDocument {
  const fake: FakeBrowserDocument = {
    activeElement: null,
    execCommand: vi.fn(() => false),
    queryCommandSupported: () => false,
  };
  vi.stubGlobal("document", fake);
  return fake;
}

export function rect(name: string, x: number, y = 0, w = 10, h = 10): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  r.setProperty("name", name);
  return r;
}

export interface Fixture {
  scene: Scene;
  editor: Editor;
  document: ActionDocument;
  designer: ActionDesigner;
  clipboard: Map<string, string | null>;
  actions: Map<string, Action>;
  register(action: Action): Action;
}

/** A designer with one open document; `register` makes actions reachable by id. */
export function setupDesigner(): Fixture {
  const scene = new Scene(new EditorWorkspace());
  const editor = new Editor(scene);
  const clipboard = new Map<string, string | null>();
  const actions = new Map<string, Action>();
  const view = {
    focus() {},
    getViewConfiguration: () => ({ multiPageView: false }),
  };
  const document = {
    getEditor: () => editor,
    getScene: () => scene,
    getTitle: () => "Untitled-1",
    getActiveWindow: () => ({ getView: () => view, centerAndZoom() {} }),
    getActiveStylesList: () => ({}),
    isEditingEnabled: () => true,
    filterUnrestrictedCommercialFileElements: (nodes: unknown[]) => nodes,
  } as unknown as ActionDocument;
  const designer = {
    getAction: (id: string) => actions.get(id) || null,
    getActiveDocument: () => document,
    getDocuments: () => [document],
    getRightSidebars: () => ({ getActiveSidebar: () => "inspector", getSidebar: () => null }),
    getWindows: () => null,
    getClipboardContent: (mime: string) => clipboard.get(mime),
    setClipboardContent: (mime: string, data: string | null) => clipboard.set(mime, data),
    getClipboardMimeTypes: () => [...clipboard.keys()],
    getMouseOverContext: () => ({}),
    isTouchEnabled: () => false,
    isTouchDevice: () => false,
    isGravitIME: (element: FakeElement | null) => !!element && element.className === "g-ime",
  } as unknown as ActionDesigner;
  setActionDesigner(designer);
  return {
    scene,
    editor,
    document,
    designer,
    clipboard,
    actions,
    register(action: Action) {
      actions.set(action.getId(), action);
      return action;
    },
  };
}

/** The paint layers of a rectangle (always there once asked for). */
export function layersOf(node: Rectangle): PaintLayers {
  return node.getPaintLayers() as PaintLayers;
}
