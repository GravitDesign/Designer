import { afterEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Node } from "../../engine/scene/node.ts";
import { Scene } from "../../engine/scene/scene.ts";
import "../../editor/index.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { ToolManager } from "../../editor/tools/tool-manager.ts";
import { Document } from "../document/document.ts";
import { DocumentEvent } from "../document/document-event.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { InspectorSidebar } from "./inspector-sidebar.ts";

/**
 * The designer parts GDocument and the sidebar's document binding use:
 * activateDocument triggers Deactivated and Activated as GDesigner does.
 */
class FakeDesigner extends EventTarget {
  readonly workspace = new EditorWorkspace();
  active: Document | null = null;

  getWorkspace(): EditorWorkspace {
    return this.workspace;
  }

  getToolManager(): ToolManager {
    return this.workspace.getToolManager() as ToolManager;
  }

  createScene(): Scene {
    return new Scene(this.workspace);
  }

  getActiveDocument(): Document | null {
    return this.active;
  }

  isTouchEnabled(): boolean {
    return false;
  }

  activateDocument(document: Document | null): void {
    if (document === this.active) return;
    if (this.active) {
      const previous = this.active;
      this.active = null;
      previous.deactivate();
      this.trigger(new DocumentEvent(DocumentEvent.Type.Deactivated, previous));
    }
    this.active = document;
    if (document) {
      document.activate();
      this.trigger(new DocumentEvent(DocumentEvent.Type.Activated, document));
    }
  }
}

afterEach(() => resetGlobals());

describe("InspectorSidebar and the active document (R6-C-004)", () => {
  it("rebinds to the new scene and editor when the active document gets a new scene", () => {
    const designer = new FakeDesigner();
    setDesigner(designer as unknown as Designer);
    const document = new Document(designer.createScene());
    designer.activateDocument(document);
    const sidebar = new InspectorSidebar();
    // The panels' DOM is not under test here.
    vi.spyOn(sidebar, "_updatePropertyPanels").mockImplementation(() => undefined);
    sidebar.activate();
    const oldScene = document.getScene() as Scene;
    const oldEditor = document.getEditor() as Editor;
    expect(oldScene.hasEventListeners(Node.AfterFlagChangeEvent)).toBe(true);

    const newScene = designer.createScene();
    document.setScene(newScene);

    const newEditor = document.getEditor() as Editor;
    expect(newEditor).not.toBe(oldEditor);
    expect(newScene.hasEventListeners(Node.AfterFlagChangeEvent)).toBe(true);
    expect(newEditor.hasEventListeners(Editor.SelectionChangedEvent)).toBe(true);
    expect(oldScene.hasEventListeners(Node.AfterFlagChangeEvent)).toBe(false);
    expect(oldEditor.hasEventListeners(Editor.SelectionChangedEvent)).toBe(false);
    // Without a selection or an item tool it inspects the new scene's page.
    expect(sidebar._elements).toEqual([newScene.getActivePage()]);
  });
});
