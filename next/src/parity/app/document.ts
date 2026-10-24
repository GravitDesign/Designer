/**
 * The document hooks of the parity harness (app.newInfiniteDocument,
 * app.document, app.scene, app.editor, app.selection, app.serialize,
 * app.deserialize, app.execute) over the real app: the designer's
 * document list (src/app/shell/designer.ts) and GDocument
 * (src/app/document/document.ts). Actions run through
 * designer.executeAction, like the old designer.executeAction.
 *
 * The other hook files still import a few helpers from here; they are
 * one-line views of the designer:
 * - appWorkspace(): the designer's workspace;
 * - getDocuments(), getActiveDocument(), removeDocument();
 * - documentStatusName(): the status as corpus.documentStates reports it;
 * - onDocumentsChanged(): a listener for the designer's document events
 *   and every document's status changes (the fonts provider manager
 *   receives them all, GDocument._updateStatus).
 */
import {
  EditorWorkspace as EditorWorkspaceClass,
  type EditorWorkspace,
} from "../../editor/editor-workspace.ts";
import { EventTarget as EngineEventTarget } from "../../engine/core/event-target.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Editor } from "../../editor/editor.ts";
// Registers the tool manager factory before the node designer's workspace exists.
import "../../editor/tools/tool-manager.ts";
import { Node } from "../../engine/scene/node.ts";
import { Scene as SceneClass, type Scene } from "../../engine/scene/scene.ts";
import type { SerializeOptions } from "../../engine/serialize/blob.ts";
import { Document as DocumentClass, type Document } from "../../app/document/document.ts";
import { DocumentEvent } from "../../app/document/document-event.ts";
import { DocumentStatus } from "../../app/document/document-status.ts";
import { DocumentStatusEvent } from "../../app/document/document-status-event.ts";
import { FontsProviderManager } from "../../app/fonts/font-manager.ts";
import { designer, designerOrNull, setDesigner, whenDesigner } from "../../app/shell/globals.ts";

/** The documents as the other hook files type them. */
export type InterimDocument = Omit<Document, "getScene" | "getStatus"> & {
  /** Documents in the list always have a scene (only release drops it). */
  getScene(): Scene;
  getStatus(): number;
};

/** The workspace every scene of the app lives in (the designer's). */
export function appWorkspace(): EditorWorkspace {
  return designer().getWorkspace();
}

export function getDocuments(): readonly InterimDocument[] {
  const current = designerOrNull();
  return current ? (current.getDocuments() as unknown as InterimDocument[]) : [];
}

export function getActiveDocument(): InterimDocument | null {
  const current = designerOrNull();
  return current ? (current.getActiveDocument() as unknown as InterimDocument | null) : null;
}

/** GDesigner.removeDocument without the "save changes?" prompt. */
export function removeDocument(document: InterimDocument): void {
  designer().removeDocument(document as never, null, true);
}

const STATUS_NAMES: Record<number, string> = {
  [DocumentStatus.Ready]: "ready",
  [DocumentStatus.Loading]: "loading",
  [DocumentStatus.Loaded]: "loaded",
};

/**
 * The status as corpus.documentStates reports it: "ready", "loading",
 * "loaded", or the number for any other.
 */
export function documentStatusName(document: InterimDocument): string {
  const status = document.getStatus() as number;
  return STATUS_NAMES[status] || String(status);
}

const listeners = new Set<() => void>();

function notify(): void {
  // Before boot made the designer there is nothing to report.
  if (!designerOrNull()) return;
  for (const listener of Array.from(listeners)) listener();
}

// The designer's document events.
whenDesigner((current) => {
  current.addEventListener(DocumentEvent, notify);
});

// Every document's status change reaches the fonts provider manager.
if (typeof XMLHttpRequest !== "undefined") {
  FontsProviderManager.getInstance().addEventListener(DocumentStatusEvent, notify);
}

/** Calls `listener` after any document event or status change. Returns the unsubscribe function. */
export function onDocumentsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function activeDocumentOrThrow(): InterimDocument {
  const document = getActiveDocument();
  if (!document) throw new Error("no document (call app.newInfiniteDocument first)");
  return document;
}

export const documentHooks = {
  /** GDesigner.newInfiniteDocument, then the welcome screen closed (old-harness.js). */
  newInfiniteDocument(): Document | null {
    const document = designer().newInfiniteDocument() as unknown as Document | null;
    designer().closeNewDocumentDialog();
    return document;
  },
  document(): InterimDocument | null {
    return getActiveDocument();
  },
  scene(): Scene {
    return activeDocumentOrThrow().getScene() as Scene;
  },
  editor(): Editor {
    return activeDocumentOrThrow().getEditor() as Editor;
  },
  /** GEditor.getSelection of the active document, or an empty list. */
  selection(): Node[] {
    return activeDocumentOrThrow().getEditor()?.getSelection() || [];
  },
  serialize(options?: SerializeOptions): string | null {
    return Node.serialize(documentHooks.scene(), options);
  },
  deserialize(json: string): Node | Node[] | null {
    return Node.deserialize(json);
  },
  actionIds(): string[] {
    return designer()
      .getActions()
      .map((action) => action.getId());
  },
  canExecute(id: string, args?: unknown[]): boolean {
    return designer().canExecuteAction(id, args);
  },
  execute(id: string, args?: unknown[]): unknown {
    return designer().executeAction(id, args);
  },
  /** GDesigner.getSetting (old-harness.js app.setting). */
  setting(key: string): unknown {
    return designer().getSetting(key);
  },
  /** GDesigner.setSetting (old-harness.js app.setSetting). */
  setSetting(key: string, value: unknown): void {
    designer().setSetting(key, value);
  },
};

// ---------------------------------------------------------------------------
// Node unit tests load these hooks without a DOM, where the real Designer
// can't be built. They get a designer with just the document list the
// hooks and GDocument use: documents are added and activated (with the
// designer's Activated and Deactivated events), removed
// (released) and the last one activated again; there are no windows,
// settings or actions.

class NodeDesigner extends EngineEventTarget {
  private readonly workspace = new EditorWorkspaceClass();
  private readonly documents: Document[] = [];
  private active: Document | null = null;

  getWorkspace(): EditorWorkspace {
    return this.workspace;
  }

  createScene(noPage?: boolean): Scene {
    return new SceneClass(this.workspace, noPage);
  }

  getDocuments(): Document[] {
    return this.documents;
  }

  getActiveDocument(): Document | null {
    return this.active;
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

  newInfiniteDocument(): Document {
    const scene = this.createScene();
    scene.getActivePage()?.setProperties(["bck", "w", "h"], [RGBColor.WHITE, 0, 0]);
    const document = new DocumentClass(scene);
    this.documents.push(document);
    this.activateDocument(document);
    return document;
  }

  removeDocument(document: Document): void {
    const index = this.documents.indexOf(document);
    if (index < 0) return;
    if (document === this.active) this.activateDocument(null);
    document.release();
    this.documents.splice(index, 1);
    if (!this.active) this.activateDocument(this.documents[this.documents.length - 1] ?? null);
  }

  closeNewDocumentDialog(): void {}

  getWindows(): { getActiveWindow(): null } {
    return { getActiveWindow: () => null };
  }

  getSetting(_key: string, defaultValue?: unknown): unknown {
    return defaultValue;
  }

  setSetting(): undefined {
    return undefined;
  }

  getActions(): { getId(): string }[] {
    return [];
  }

  getAction(): null {
    return null;
  }

  canExecuteAction(): boolean {
    return false;
  }

  executeAction(id: string): never {
    throw new Error(`Unable to execute action '${id}' - not registered.`);
  }
}

if (typeof HTMLDivElement !== "function" && !designerOrNull()) {
  setDesigner(new NodeDesigner() as never);
}
