/**
 * Interim document hooks for the parity harness: app.newInfiniteDocument,
 * app.document, app.scene, app.serialize, app.deserialize, app.editor and
 * app.execute (only the file actions below).
 *
 * In the old app these come from GDesigner and its GDocument
 * (designer.browser.dev.js, the app-config-document cluster, ported
 * later). This file ports only the part of that path that builds,
 * opens, saves and closes scenes, so engine and file-format scenarios
 * can run before the app exists. The app-config-document and
 * app-shell-storage clusters replace it.
 *
 * What it ports:
 * - the app's one workspace, made when GDesigner is constructed (the old
 *   app made a GEditorWorkspace, which only adds the editor's style and
 *   tool managers; those belong to the editor phase);
 * - the engine options the app sets at boot (GSceneOptions.scaleLabel =
 *   false, GSceneOptions.defaultBorderPositionForLines = true);
 * - GDesigner.createScene and GDesigner.newInfiniteDocument: a scene in
 *   the workspace whose first page is white and has no size (w = h = 0,
 *   the infinite canvas). createScene also copied
 *   GEditorOptions.scaleBorderWidth and scaleCorners to the scene; both
 *   are undefined unless the editor sets them, and the old app never
 *   does, so nothing is copied;
 * - the one engine call that activating a document makes:
 *   scene.getAnnotations() from the annotations sidebar, which creates
 *   the pages' annotations lists;
 * - the document list: GDocument's status (module 86 numbers), its title
 *   ("Untitled-<n>" for a new document, numbered the first time the title
 *   is asked for; the file name without extension for an opened one),
 *   GDesigner.addDocument / removeDocument / activateDocument;
 * - opening a .gvdesign (GDesigner._processOpenDocument and
 *   GDocument.load): a document is added with a fresh scene, goes to
 *   Loading, gets the scene from io/gvdesign/load.ts, goes to Loaded,
 *   then Ready with the new scene (GDocument.setScene), and is activated
 *   again. A file that holds no scene (invalid JSON, or JSON that
 *   restores to null or to something other than a scene) stays Loading,
 *   as in the old app, whose LoadFailed branch was unreachable (see "A
 *   .gvdesign that holds no scene stays Loading" in QUESTIONS.md);
 * - three actions, run through app.execute like the old
 *   designer.executeAction:
 *   - "file.open" (GOpenAction with the local storage's file input,
 *     module 1195 openPrompt): a hidden <input type="file" id="file-input"
 *     multiple>, clicked; on change every chosen file is read in order and
 *     opened;
 *   - "file.save-as.gvdesign" (GSaveAsAction._performSave, download
 *     branch, and the local storage item's write): the bytes from
 *     io/gvdesign/store.ts with the options the action passes
 *     ({save: true, singleton: true}), the size check the item runs
 *     (which serializes the scene once more), then FileSaver's download:
 *     a Blob without type, a blob URL and a click on an
 *     <a download="<name>.gvdesign">;
 *   - "file.close-active-window": removes the active document, releases
 *     its scene's dictionaries and references (what closing its view
 *     did, GSceneWidget.release) and activates the last remaining one.
 *
 * What it leaves out: the editor (GEditor; app.editor() returns a stand-in
 * whose clearSelection clears the Selected flag the old selection would
 * have held), the views and windows, the font providers and default font
 * (app-fonts-ui), the save point and modified state, recent files, the
 * missing-fonts dialog, the save and error dialogs, storage other than the
 * file input and downloads, and opening any format but .gvdesign.
 * Scenarios that need them stay unlisted. In particular the GEditor
 * constructor, which the old GDocument ran for every scene, sets
 * scene.__graphic_editor__, adds the AfterInsert, BeforeRemove, flag and
 * geometry listeners and moves the ":selected" nodes into the selection;
 * and boot set the page shadow of
 * GEditorPaintConfiguration.prototype.pageDecoration (blur 4, offset y 2,
 * rgba(0,0,0,0.25)). An engine scenario whose result depends on those
 * listeners, or on page shadows in the multi-page view, waits for the
 * editor phase.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Node } from "../../engine/scene/node.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import type { SerializeOptions } from "../../engine/serialize/blob.ts";
import { GVDESIGN_FILE_TYPE } from "../../io/gvdesign/format.ts";
import { loadGvdesign } from "../../io/gvdesign/load.ts";
import { documentRealFileSize, isFileTooSmall } from "../../io/gvdesign/save-checks.ts";
import { storeGvdesign } from "../../io/gvdesign/store.ts";

// GDesigner.init: the scene options the app always runs with.
SceneOptions.scaleLabel = false;
SceneOptions.defaultBorderPositionForLines = true;

/**
 * GDocument status numbers (module 86). Not exported: the bridge would
 * take every exported object for app hooks; documentStatusName gives
 * the names.
 */
const DocumentStatus = {
  Init: 0,
  Ready: 1,
  Loading: 10,
  LoadFailed: 11,
  Loaded: 12,
} as const;

// GDocument.getTitle numbers new documents per session the first time
// their title is asked for.
const untitledNumbers = new Map<number, number>();
let nextUntitledNumber = 1;
let nextSessionId = 1;

/** The part of GDocument the hooks use. */
export class InterimDocument {
  private scene: Scene;
  private status: number = DocumentStatus.Init;
  private readonly sessionId = nextSessionId++;

  /** `fileName` is the storage item's full name; null for a new document. */
  constructor(
    scene: Scene,
    private readonly fileName: string | null = null,
  ) {
    this.scene = scene;
    // The constructor's setScene makes it Ready.
    this.status = DocumentStatus.Ready;
  }

  getScene(): Scene {
    return this.scene;
  }

  /** GDocument.setScene: the new scene, then Ready. */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.status = DocumentStatus.Ready;
  }

  getStatus(): number {
    return this.status;
  }

  setStatus(status: number): void {
    this.status = status;
  }

  isNew(): boolean {
    return null === this.fileName;
  }

  /** GDocument.getTitle; the default name is the English "Untitled". */
  getTitle(): string {
    if (null === this.fileName) {
      if (!untitledNumbers.has(this.sessionId)) {
        untitledNumbers.set(this.sessionId, nextUntitledNumber++);
      }
      return "Untitled-" + String(untitledNumbers.get(this.sessionId));
    }
    // Storage item getName: the full name up to its last dot.
    const dot = this.fileName.lastIndexOf(".");
    return dot >= 0 ? this.fileName.substr(0, dot) : this.fileName;
  }

  /** The storage item's extension, upper case like getExtension. */
  getExtension(): string | null {
    if (null === this.fileName) return null;
    const dot = this.fileName.lastIndexOf(".");
    return dot >= 0 ? this.fileName.substr(dot + 1).toUpperCase() : null;
  }
}

const workspace = new Workspace();
const documents: InterimDocument[] = [];
let activeDocument: InterimDocument | null = null;

/** The workspace every scene of the app lives in. */
export function appWorkspace(): Workspace {
  return workspace;
}

/** GDesigner.createScene. */
function createScene(noPage?: boolean): Scene {
  return new Scene(workspace, noPage);
}

/**
 * GDesigner.activateDocument. Activation opens the document's window; the
 * annotations sidebar (GAnnotationsSidebar._documentEvent) answers it with
 * scene.getAnnotations(), which gives every page its annotations list
 * ("annlst"). Documents in the old app always have one.
 */
function activateDocument(document: InterimDocument | null): void {
  activeDocument = document;
  if (document) document.getScene().getAnnotations();
}

/** GDesigner.addDocument: adds it and opens its window, which activates it. */
function addDocument(document: InterimDocument): void {
  documents.push(document);
  activateDocument(document);
}

/** GDesigner.removeDocument without the "save changes?" prompt. */
export function removeDocument(document: InterimDocument): void {
  const index = documents.indexOf(document);
  if (index < 0) return;
  const wasActive = activeDocument === document;
  if (wasActive) activateDocument(null);
  // Closing the window released its view (GSceneWidget.release), which
  // released the scene's dictionaries and forgot its reference ids in
  // the workspace, so a file opened again keeps its ids.
  document.getScene().releaseDictionaries();
  documents.splice(index, 1);
  // The window manager then activates the remaining window.
  if (wasActive) activateDocument(documents[documents.length - 1] ?? null);
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
  return STATUS_NAMES[document.getStatus()] || String(document.getStatus());
}

/** The open documents in tab order. */
export function getDocuments(): readonly InterimDocument[] {
  return documents;
}

export function getActiveDocument(): InterimDocument | null {
  return activeDocument;
}

/**
 * GDesigner.newInfiniteDocument: a white, unbounded first page. Returns
 * the document like the old method did (the old harness hook drops it).
 */
function newInfiniteDocument(): InterimDocument {
  const scene = createScene();
  (scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>).setProperties(
    ["bck", "w", "h"],
    [RGBColor.WHITE, 0, 0],
  );
  const document = new InterimDocument(scene);
  addDocument(document);
  return document;
}

/**
 * GDesigner.openDocument for a .gvdesign storage item holding `bytes`
 * (GDesigner._processOpenDocument, GDocument.load). Resolves once the
 * load has finished, rejects when the restore throws; a file that holds
 * no scene leaves it pending, like the old document that stays Loading.
 */
export function openDocumentFromBytes(bytes: Uint8Array, fileName: string): Promise<void> {
  const document = new InterimDocument(createScene(), fileName);
  if (document.getExtension() !== GVDESIGN_FILE_TYPE.ext.toUpperCase()) {
    // The other formats come with their import clusters.
    return Promise.reject(new Error(`interim open: unsupported file ${fileName}`));
  }
  addDocument(document);
  document.setStatus(DocumentStatus.Loading);
  return loadGvdesign(bytes, workspace).then((scene) => {
    document.setStatus(DocumentStatus.Loaded);
    // GDocument.setScene(scene, true): an active document is deactivated,
    // gets the scene and Ready, and is activated again.
    const wasActive = activeDocument === document;
    if (wasActive) activateDocument(null);
    document.setScene(scene);
    if (wasActive) activateDocument(document);
  });
}

/**
 * File > Download File (GSaveAsAction, download branch): named after the
 * storage item, else the title, else "Design".
 */
async function downloadActiveDocument(): Promise<void> {
  const document = activeDocument;
  if (!document) return;
  const fileName = (document.getTitle() || "Design") + "." + GVDESIGN_FILE_TYPE.ext;
  const scene = document.getScene();
  const bytes = await storeGvdesign(scene, { save: true, singleton: true });
  // The local storage item's write: the size check first (it serializes
  // the scene again to learn its real size), then FileSaver.
  if (isFileTooSmall(bytes.length)) {
    console.warn("text.saveing-error: the saved file has under 200 bytes");
  }
  documentRealFileSize(scene);
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>]));
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 40000);
}

let fileInput: HTMLInputElement | null = null;

/**
 * The local storage's openPrompt with its hidden file input. Interim
 * shortcut, not to be copied by app-shell-storage: the old openPrompt
 * used window.showOpenFilePicker on Chromium (unless
 * disableFileSystemAccessAPI was set) and kept the file handle on the
 * item for later writes, and its file input accepted every type
 * GOpenAction lists (no accept attribute on iOS).
 */
function openPrompt(): void {
  if (!fileInput) {
    const input = window.document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("id", "file-input");
    input.multiple = true;
    input.style.opacity = "0";
    input.style.position = "absolute";
    input.style.zIndex = "-1";
    input.style.left = "-9999px";
    input.style.top = "-9999px";
    input.addEventListener("change", () => {
      void readChosenFiles(input);
    });
    window.document.body.appendChild(input);
    fileInput = input;
  }
  fileInput.setAttribute("accept", "." + GVDESIGN_FILE_TYPE.ext);
  fileInput.focus();
  fileInput.click();
}

/** Reads the chosen files one after another and opens each. */
async function readChosenFiles(input: HTMLInputElement): Promise<void> {
  const files = input.files ? Array.from(input.files) : [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    openDocumentFromBytes(bytes, file.name).catch((error: unknown) => console.error(error));
  }
  input.value = "";
}

const actions: Record<string, () => unknown> = {
  "file.open": openPrompt,
  "file.save-as.gvdesign": () => {
    downloadActiveDocument().catch((error: unknown) => console.error(error));
  },
  "file.close-active-window": () => {
    if (activeDocument) removeDocument(activeDocument);
  },
};

function activeScene(): Scene {
  if (!activeDocument) throw new Error("no document (call app.newInfiniteDocument first)");
  return activeDocument.getScene();
}

/** The stand-in for GEditor the scenarios call. */
const interimEditor = {
  /**
   * GEditor.clearSelection. Without the editor nothing is selected
   * except nodes restored with the Selected flag, which the old GEditor
   * constructor moved into its selection; clearing drops the flag.
   */
  clearSelection(): void {
    activeScene().acceptChildren((node: Node) => {
      if (node.hasFlag(NodeFlag.Selected)) node.removeFlag(NodeFlag.Selected);
    });
  },
};

export const documentHooks = {
  newInfiniteDocument,
  document(): InterimDocument | null {
    return activeDocument;
  },
  scene(): Scene {
    return activeScene();
  },
  editor(): typeof interimEditor {
    activeScene();
    return interimEditor;
  },
  serialize(options?: SerializeOptions): string | null {
    return Node.serialize(activeScene(), options);
  },
  deserialize(json: string): Node | Node[] | null {
    return Node.deserialize(json);
  },
  execute(id: string): unknown {
    const action = actions[id];
    if (!action) throw new Error(`interim app: no action ${id}`);
    return action();
  },
};
