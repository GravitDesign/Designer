/**
 * window.__parity.app.corpus, the hooks declared in
 * parity/scenarios/corpus/contract.ts, for the interim app of
 * ./document.ts.
 *
 * saveDocumentBytes and openDocumentBytes go through the same file
 * actions as the old hooks (old-hooks.js): "file.save-as.gvdesign", whose
 * Blob is caught on its way through URL.createObjectURL, and "file.open",
 * whose file input gets the bytes as a File instead of a native picker.
 * Behind those actions are the format code in io/gvdesign and the
 * interim document list.
 *
 * Interim, until the app shell and the font providers exist:
 * - viewIdle() asks the interim view host (view-host.ts) whether the
 *   active view has a repaint or tiles left;
 * - waitForDocument() watches the number of scene nodes and the window
 *   size for a second (the old hook also watched the view box).
 */
import type { Node } from "../../engine/scene/node.ts";
import {
  appWorkspace,
  documentHooks,
  documentStatusName,
  getActiveDocument,
  getDocuments,
} from "./document.ts";
import { Image } from "../../engine/scene/image.ts";
import { activeViewIdle } from "./view-host.ts";

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface MaybePattern {
  isReady?: () => boolean;
}

/** Duck-typed views of a node, as the old hook checks them. */
interface Inspectable {
  getPaintLayers?: () => Node | null;
  hasProperty?: (name: string) => boolean;
  getProperty?: (name: string) => unknown;
  getFirstChild?: () => Node | null;
}

/** Every image and texture pattern in the active scene has loaded (or failed). */
function assetsReady(): boolean {
  const document = getActiveDocument();
  if (!document) return false;
  let ready = true;
  const checkPattern = (pattern: unknown): void => {
    const p = pattern as MaybePattern | null;
    if (p && typeof p.isReady === "function" && !p.isReady()) ready = false;
  };
  const visit = (node: Node): void => {
    if (node instanceof Image && node.getStatus() !== Image.ImageStatus.Loaded) {
      if (node.getStatus() !== Image.ImageStatus.Error) ready = false;
    }
    const inspect = node as unknown as Inspectable;
    const layers = typeof inspect.getPaintLayers === "function" ? inspect.getPaintLayers() : null;
    if (layers) {
      const first = (layers as unknown as Inspectable).getFirstChild;
      for (let layer = first ? first.call(layers) : null; layer; layer = layer.getNext()) {
        const read = (layer as unknown as Inspectable).getProperty;
        if (read) checkPattern(read.call(layer, "_pt"));
      }
    }
    if (typeof inspect.hasProperty === "function" && inspect.hasProperty("bck")) {
      checkPattern(inspect.getProperty?.call(node, "bck"));
    }
    if (typeof inspect.getFirstChild === "function") {
      for (let child = inspect.getFirstChild(); child; child = child.getNext()) visit(child);
    }
  };
  visit(document.getScene());
  return ready;
}

function fontsReady(): boolean {
  const fonts = appWorkspace().getFontManager();
  return !(fonts && fonts.hasPendingFonts()) && window.document.fonts.status === "loaded";
}

function viewIdle(): boolean {
  return activeViewIdle();
}

async function settle(options?: { quietFrames?: number; timeout?: number }): Promise<void> {
  const quietFrames = (options && options.quietFrames) || 10;
  const timeout = (options && options.timeout) || 120000;
  const start = Date.now();
  let quiet = 0;
  while (quiet < quietFrames) {
    if (Date.now() - start > timeout) throw new Error("corpus.settle: timed out");
    await frame();
    if (assetsReady() && fontsReady() && viewIdle()) quiet++;
    else quiet = 0;
  }
}

async function waitForDocument(title: string, timeout?: number): Promise<void> {
  const limit = timeout || 120000;
  const start = Date.now();
  for (;;) {
    const document = getActiveDocument();
    if (document && document.getTitle() === title && documentStatusName(document) === "ready")
      break;
    if (Date.now() - start > limit) {
      throw new Error("corpus.waitForDocument: " + title + " did not open");
    }
    await sleep(50);
  }
  const layout = (): string => {
    let nodes = 0;
    documentHooks.scene().acceptChildren(() => {
      nodes++;
    });
    return [nodes, window.innerWidth, window.innerHeight].join(",");
  };
  let last = layout();
  let stableSince = Date.now();
  while (Date.now() - stableSince < 1000) {
    if (Date.now() - start > limit) {
      throw new Error("corpus.waitForDocument: layout of " + title + " does not settle");
    }
    await sleep(50);
    const now = layout();
    if (now !== last) {
      last = now;
      stableSince = Date.now();
    }
  }
  await settle();
}

function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const text = atob(base64);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
  return out;
}

async function saveDocumentBytes(timeout?: number): Promise<string> {
  // Restored as is below.
  const original = URL.createObjectURL;
  let captured: Blob | null = null;
  URL.createObjectURL = function (object: Blob | MediaSource): string {
    if (!captured && object instanceof Blob && !/^image\//.test(object.type)) captured = object;
    return original.call(URL, object);
  };
  try {
    documentHooks.execute("file.save-as.gvdesign");
    const start = Date.now();
    while (!captured) {
      if (Date.now() - start > (timeout || 60000)) {
        throw new Error("corpus.saveDocumentBytes: the save produced no file");
      }
      await sleep(20);
    }
  } finally {
    URL.createObjectURL = original;
  }
  return toBase64(new Uint8Array(await (captured as Blob).arrayBuffer()));
}

async function openDocumentBytes(base64: string, fileName: string): Promise<void> {
  // Restored as is below.
  const click = HTMLInputElement.prototype.click;
  let input: HTMLInputElement | null = null;
  HTMLInputElement.prototype.click = function (this: HTMLInputElement): void {
    // Keep the input instead of opening the native file picker.
    if (this.type === "file") {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- the input the action clicked
      input = this;
    } else click.call(this);
  };
  try {
    documentHooks.execute("file.open");
    const start = Date.now();
    while (!input) {
      if (Date.now() - start > 10000) throw new Error("corpus.openDocumentBytes: no file input");
      await sleep(10);
    }
  } finally {
    HTMLInputElement.prototype.click = click;
  }
  const chosen = input as HTMLInputElement;
  const transfer = new DataTransfer();
  transfer.items.add(new File([fromBase64(base64)], fileName));
  chosen.files = transfer.files;
  chosen.dispatchEvent(new Event("change"));
  await waitForDocument(fileName.replace(/\.gvdesign$/, ""));
}

function documentStates(): { title: string; status: string; hasScene: boolean }[] {
  return getDocuments().map((document) => ({
    title: document.getTitle(),
    status: documentStatusName(document),
    hasScene: !!document.getScene(),
  }));
}

export const corpusHooks = {
  corpus: {
    documentStates,
    settle,
    waitForDocument,
    assetsReady,
    fontsReady,
    viewIdle,
    saveDocumentBytes,
    openDocumentBytes,
  },
};
