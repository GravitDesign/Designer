// Old: designer.browser.dev.js module 1313 (the paste handler, gDesigner.getPaste()).
/**
 * Turns what the system clipboard holds into document content.
 *
 * The browser's paste event (Ctrl+V lands here because the Paste action's
 * shortcut lets the key through) and the async Clipboard API (Edit > Paste
 * from the menu) both end in _handlePasteData with a map of MIME type to
 * data. In order it tries:
 *
 * 1. text/xml or text/plain holding XML: an <svg> document becomes an
 *    image/svg+xml blob; a <gravit mimeType="..."> wrapper (what Copy
 *    writes) gives the node data under its MIME type;
 * 2. serialized nodes (Node.MIME_TYPE): a single paint layer or effect is
 *    added to the selection, a single text goes into the inline editor,
 *    anything else is inserted (a page as a new page) together with its
 *    styles, which are merged with equal document styles;
 * 3. plain text: a new text element (or into the inline text editor);
 * 4. an image or PDF file: placed through GDocument.placeOrImport.
 *
 * The paste-variant actions (Paste In Place, Paste Inside, ...) register a
 * one-shot callback (assignCallback) that receives the parsed elements
 * instead of the default insertion.
 *
 * Firefox and Safari (and browsers without ClipboardEvent) also get a
 * hidden contenteditable "paste area": the Paste shortcut focuses it so
 * the browser pastes rich content into it, then an image pasted there is
 * read back from the <img> it created.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Platform, WebBrowser } from "../../engine/core/platform.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { CollaborativeTextAnnotation } from "../../engine/scene/annotations/collaborative-text-annotation.ts";
import { Element as GElement } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Symbol as GSymbol } from "../../engine/scene/symbol.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { Effect } from "../../engine/style/effect.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Style } from "../../engine/style/style.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { Text } from "../../engine/text/text.ts";
import { TLDirectionTextTransformer } from "../../engine/text/tl-direction-text-transformer.ts";
import { Editor } from "../../editor/editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { InlineTextEditor } from "../../editor/element-editors/inline-text-editor.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { NotoFontsProvider } from "../fonts/noto-fonts-provider.ts";
import { dataUrlToBlob } from "../actions/deps.ts";
import { ANNOTATIONS_SIDEBAR_ID } from "../actions/element-action.ts";
import { isEditable } from "../actions/focus.ts";
import {
  activeDocument,
  activeWindow,
  gDesigner,
  props,
  type ActionStorageItem,
} from "../actions/host.ts";

/** MIME types that may carry XML (an SVG or Copy's <gravit> wrapper). */
const TEXT_TYPES = ["text/xml", "text/plain"];
/** MIME types placed as files, in the order they are tried. */
const FILE_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/gif",
  "application/pdf",
];
/** What the async Clipboard API read keeps. */
const READ_TYPES = TEXT_TYPES.concat(FILE_TYPES).concat(["text/uri-list"]);

/** MIME type to clipboard data: text, or a file or blob. */
export type PasteData = Record<string, string | Blob>;

/** Receives the parsed elements instead of the default insertion; `isText` for plain text. */
export type PasteCallback = (elements: Node[], isText?: boolean) => void;

/** Reads one clipboard item type into the paste data. */
interface ClipboardTypeHandler {
  handle(blob: Blob, data: PasteData): Promise<void>;
}

/** text/uri-list: every non-comment line is fetched and added under its blob type. */
class URIListHandler implements ClipboardTypeHandler {
  async handle(blob: Blob, data: PasteData): Promise<void> {
    const fetches = (await blob.text())
      .split("\n")
      .filter((line) => !(0 === line.indexOf("#")))
      .map((url) =>
        fetch(url).then((response) => (response.ok ? response.blob() : Promise.reject())),
      );
    (await Promise.all(fetches)).forEach((fetched) => {
      data[fetched.type] = fetched;
    });
  }
}

/** Text types: the text itself. */
class TextHandler implements ClipboardTypeHandler {
  async handle(blob: Blob, data: PasteData): Promise<void> {
    const text = await blob.text();
    data[blob.type] = text;
  }
}

const HANDLERS: Record<string, ClipboardTypeHandler> = {
  "text/plain": new TextHandler(),
  "text/xml": new TextHandler(),
  "text/uri-list": new URIListHandler(),
};

/** jQuery.parseXML: an XML document, or an exception for invalid XML. */
function parseXML(text: string): XMLDocument {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  if (!xml || xml.getElementsByTagName("parsererror").length) {
    throw new Error("Invalid XML: " + text);
  }
  return xml;
}

/**
 * `$("<div/>").html(text).text()`: the text with HTML entities decoded.
 * Parsed with DOMParser so nothing in it loads or runs.
 */
function decodeHtml(text: string): string {
  return new DOMParser().parseFromString(text, "text/html").body.textContent || "";
}

/** The hidden contenteditable the browser pastes rich content into. */
function createPasteArea(): HTMLDivElement {
  const area = document.createElement("div");
  area.style.overflow = "hidden";
  area.style.height = "1px";
  area.style.top = "-9999px";
  area.style.position = "absolute";
  area.contentEditable = "true";
  area.tabIndex = -1;
  document.body.appendChild(area);
  return area;
}

export class ClipboardBridge {
  private _pasteArea: HTMLDivElement | null = null;
  private _allowFocus = false;
  private _callback: PasteCallback | null = null;

  constructor() {
    const isSafari = navigator.userAgent.toLowerCase().indexOf("safari") >= 0;
    if (Object.prototype.hasOwnProperty.call(window, "ClipboardEvent")) {
      if (navigator.userAgent.toLowerCase().indexOf("firefox") >= 0 || isSafari) {
        this._pasteArea = createPasteArea();
      }
      document.addEventListener("paste", this._documentPasteEvent.bind(this));
    } else {
      this._pasteArea = createPasteArea();
      this._pasteArea.addEventListener("paste", this._documentPasteEvent.bind(this));
    }
    if (this._pasteArea) {
      const area = this._pasteArea;
      // The area takes the focus only when the Paste shortcut allowed it;
      // otherwise the focus goes back to the canvas.
      area.addEventListener("focus", () => {
        const designer = gDesigner();
        if (designer.getWindows() && !this._allowFocus) {
          area.blur();
          const window = activeWindow();
          if (window) window.getView().focus();
        }
      });
    }
  }

  /**
   * Edit > Paste from the menu: reads the system clipboard with the async
   * Clipboard API. Rejects when it isn't there or reading is denied, and
   * the Paste action then falls back to the internal clipboard.
   */
  async pasteFromClipboard(): Promise<void> {
    if (!navigator.clipboard) return Promise.reject();
    if (navigator.permissions) {
      const status = await navigator.permissions.query({
        name: "clipboard-read",
        allowWithoutGesture: true,
      } as unknown as PermissionDescriptor);
      if (!status || "denied" === status.state) return Promise.reject();
    }
    const items = await navigator.clipboard.read();
    if (!items) return Promise.reject();
    for (const item of items) {
      const data: PasteData = {};
      for (const type of item.types) {
        if (!READ_TYPES.includes(type)) continue;
        const blob = await item.getType(type);
        const handler = HANDLERS[type];
        if (handler) await handler.handle(blob, data);
        else data[type] = blob;
      }
      this.handlePasteData(data);
    }
  }

  private _documentPasteEvent(event: ClipboardEvent): boolean | undefined {
    if (!this._canTrigger()) return false;
    const designer = gDesigner();
    const active = document.activeElement;
    if (
      !active ||
      !isEditable(active) ||
      (this._pasteArea && active === this._pasteArea) ||
      designer.isGravitIME(active)
    ) {
      const clipboardData = event.clipboardData as DataTransfer;
      if (event.clipboardData && event.clipboardData.items && event.clipboardData.items.length) {
        const items = clipboardData.items;
        const data: PasteData = {};
        for (let i = 0; i < items.length; i++) {
          let value: string | Blob | null;
          const type = (items[i] as DataTransferItem).type;
          switch (type) {
            case "image/png":
            case "image/jpeg":
            case "image/gif":
            case "application/pdf":
              value = (items[i] as DataTransferItem).getAsFile();
              break;
            case "image/svg+xml":
              // A copied .svg file is a file item; getData gives nothing
              // for it, which dropped the paste (BUGS-FIXED.md "BUG-083
              // Pasting an SVG file does nothing").
              value =
                "file" === (items[i] as DataTransferItem).kind
                  ? (items[i] as DataTransferItem).getAsFile()
                  : clipboardData.getData(type) || null;
              break;
            default:
              value = clipboardData.getData(type) || null;
          }
          if (value) data[type] = value;
        }
        this._handlePasteData(data);
        if (Platform.webBrowser === WebBrowser.Firefox) {
          event.stopPropagation();
          event.preventDefault();
        }
      } else if (this._pasteArea) {
        const area = this._pasteArea;
        const data: PasteData = {};
        let fileIndex = 0;
        if (clipboardData.types && clipboardData.types.length) {
          const types = clipboardData.types;
          for (let i = 0; i < types.length; i++) {
            const type = types[i] as string;
            if (
              "public.file-url" === type &&
              clipboardData.files &&
              fileIndex < clipboardData.files.length
            ) {
              const file = clipboardData.files[fileIndex++];
              if (file) data[file.type] = file;
            } else {
              const value = clipboardData.getData(type);
              if (value) data[type] = value;
            }
          }
        }
        // The browser fills the area after the event; read it on the next turn.
        setTimeout(() => {
          const children = area.children;
          if (1 === children.length && (children[0] as HTMLElement).nodeName === "IMG") {
            const blob = dataUrlToBlob((children[0] as HTMLImageElement).src);
            if (blob) data[blob.type] = blob;
          }
          this._handlePasteData(data);
          area.replaceChildren();
        }, 1);
      }
      if (this._pasteArea) {
        this._allowFocus = false;
        this._pasteArea.blur();
        const window = activeWindow();
        if (window) window.getView().focus();
      }
    }
  }

  /**
   * Whether a paste may run: a document is open and the annotations
   * sidebar is not active, or a single text is being edited inline.
   */
  private _canTrigger(): boolean {
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    if (editor && editor.isInlineEditing()) {
      const selection = this._filterForInlineEditing(editor.getSelection());
      if (selection && 1 === selection.length && selection[0] instanceof Text) return true;
    }
    return !(
      !designerDocument || designer.getRightSidebars().getActiveSidebar() == ANNOTATIONS_SIDEBAR_ID
    );
  }

  handlePasteData(data: PasteData): boolean | undefined {
    return this._handlePasteData(data);
  }

  private _handlePasteData(data: PasteData): boolean | undefined {
    if (!this._canTrigger()) return false;
    const ownTransaction = !this._callback;
    const designerDocument = activeDocument();
    const editor = designerDocument.getEditor();
    for (let t = 0; t < TEXT_TYPES.length; ++t) {
      const text = data[TEXT_TYPES[t] as string] as string | undefined;
      if (text) {
        try {
          const xml = parseXML(text);
          if (xml) {
            if ("svg" === xml.documentElement.nodeName) {
              data["image/svg+xml"] = new Blob([text], { type: "image/svg+xml" });
              break;
            }
            if (
              "gravit" === xml.documentElement.nodeName &&
              xml.documentElement.hasAttribute("mimeType")
            ) {
              if (xml.documentElement.hasAttribute("restricted")) {
                const restricted = xml.documentElement.getAttribute("restricted");
                if (
                  restricted &&
                  "false" != restricted &&
                  (!designerDocument.getStorageItem() ||
                    (designerDocument.getStorageItem() as ActionStorageItem).getId() != restricted)
                ) {
                  return;
                }
              }
              data[xml.documentElement.getAttribute("mimeType") as string] = decodeHtml(
                xml.documentElement.textContent as string,
              );
            }
          }
        } catch {
          // Not XML: plain text, handled below.
        }
      }
      if (data[Node.MIME_TYPE]) {
        this._pasteNodes(data[Node.MIME_TYPE] as string, ownTransaction);
        return;
      }
      if (text && this._pasteText(text, ownTransaction)) return;
    }
    for (let i = 0; i < FILE_TYPES.length; ++i) {
      const type = FILE_TYPES[i] as string;
      if (data[type]) {
        if (ownTransaction) editor.beginTransaction();
        try {
          designerDocument.placeOrImport(
            data[type],
            null,
            false,
            true,
            this.executeCallback.bind(this),
          );
        } finally {
          if (ownTransaction) {
            editor.commitTransaction(
              Locale.get(new LocaleKey("GPaste", "action.paste-image")) as string,
            );
          }
        }
        return;
      }
    }
  }

  /** Step 2 of _handlePasteData: serialized nodes. */
  private _pasteNodes(serialized: string, ownTransaction: boolean): void {
    const designerDocument = activeDocument();
    const editor = designerDocument.getEditor();
    const restored = Node.deserialize(serialized) as Node | Node[] | null;
    const isPage = restored instanceof Page;
    const nodes = designerDocument.filterUnrestrictedCommercialFileElements(
      isPage ? (restored as Page).getChildren() : (restored as Node[]),
    );
    if (!((nodes && nodes.length > 0) || isPage)) return;
    let elements: Node[] = nodes.filter((node) => node instanceof GElement);
    const styles = nodes.filter((node) => node instanceof Style) as Style[];
    const intoInlineText =
      1 === nodes.length &&
      nodes[0] instanceof Text &&
      editor.hasSelection() &&
      (editor.getSelection() as Node[])[0] instanceof Text &&
      editor.isInlineEditing();
    if (intoInlineText || (0 == elements.length && 1 == nodes.length && !isPage)) {
      const single = nodes[0] as Node;
      editor.beginTransaction();
      try {
        if (intoInlineText) {
          if (!InlineTextEditor.HANDLECOPYPASTE) {
            const target = (editor.getSelection() as Node[])[0] as Node;
            (
              ElementEditor.getEditor(target) as unknown as { processPaste(v: unknown): void }
            ).processPaste(single);
          }
        } else if (single instanceof FillPaintLayer || single instanceof BorderPaintLayer) {
          elements = this._filterForStyleExceptions(editor.getSelection() as Node[]);
          if (0 != elements.length) {
            if (elements.length > 1) {
              elements.forEach((element) => {
                const layer =
                  single instanceof FillPaintLayer ? new FillPaintLayer() : new BorderPaintLayer();
                layer.assignFrom(single);
                stylable(element).getPaintLayers().appendChild(layer);
              });
            } else
              stylable(elements[0] as Node)
                .getPaintLayers()
                .appendChild(single);
          }
        } else if (single instanceof Effect) {
          elements = this._filterForStyleExceptions(editor.getSelection() as Node[]);
          if (0 != elements.length) {
            if (elements.length > 1) {
              elements.forEach((element) => {
                const effect = new Effect();
                effect.assignFrom(single);
                stylable(element).getEffects().appendChild(effect);
              });
            } else
              stylable(elements[0] as Node)
                .getEffects()
                .appendChild(single);
          }
        }
      } finally {
        editor.commitTransaction(Locale.get(new LocaleKey("GPaste", "action.paste")) as string);
      }
      return;
    }
    const documentStyles = designerDocument.getScene().getStyles();
    if (!(elements.length > 0 || isPage)) return;
    if (ownTransaction) editor.beginTransaction();
    try {
      for (let s = 0; s < styles.length; ++s) {
        const style = styles[s] as Style;
        const oldReference = style.getReferenceId();
        let match: Style | null = null;
        for (
          let existing = documentStyles.getFirstChild() as Style | null;
          null !== existing;
          existing = existing.getNext() as Style | null
        ) {
          if (
            existing.arePropertiesEqual(style, ["ps", "defaultStyle"]) &&
            existing.equalsStyle(style)
          ) {
            match = existing;
            break;
          }
        }
        if (!match) {
          match = new Style();
          match.setProperties(
            ["name", "defaultStyle", "ps"],
            [style.getProperty("name"), false, style.getProperty("ps")],
          );
          match.assignStyleFrom(style);
          designerDocument.getScene().getStyles().insertChild(match, undefined);
        }
        for (let e = 0; e < elements.length; ++e) {
          const element = props(elements[e] as Node);
          if (element.hasProperty("sref") && element.getProperty("sref") === oldReference) {
            element.setProperty("sref", match.getReferenceId());
          }
        }
      }
      if (!this.executeCallback(elements)) {
        const scene = activeDocument().getScene();
        if (isPage) {
          const page = restored as Page;
          page.clearChildren();
          page.setProperty("off", null);
          scene.appendChild(page);
          if (elements.length > 0) editor.insertElements(elements, true, true, false, true, page);
          scene.setActivePage(page);
        } else editor.insertElements(elements, true, true, true, true);
        if (!scene.isFixedSized()) this._centerToView(true);
      }
    } finally {
      if (ownTransaction) {
        editor.commitTransaction(Locale.get(new LocaleKey("GPaste", "action.paste")) as string);
      }
    }
  }

  /**
   * Step 3 of _handlePasteData: plain text. Returns false only while a
   * text is edited inline and the inline editor handles paste itself
   * (InlineTextEditor.HANDLECOPYPASTE); the old loop then went on with the
   * next text type.
   */
  private _pasteText(text: string, ownTransaction: boolean): boolean {
    const designer = gDesigner();
    const designerDocument = activeDocument();
    const editor = designerDocument.getEditor();
    const provider = FontsProviderManager.getProviderInstance(NotoFontsProvider);
    const fontManager = designer.getWorkspace() && designer.getWorkspace()?.getFontManager();
    const defaultFamily =
      fontManager &&
      fontManager.getDefaultFont() &&
      (fontManager.getDefaultFont() as { getFamily(): string }).getFamily();
    const selection = this._filterForInlineEditing(editor.getSelection());
    if (
      selection &&
      selection.length > 0 &&
      selection[0] instanceof Text &&
      editor.isInlineEditing()
    ) {
      if (!InlineTextEditor.HANDLECOPYPASTE) {
        const target = selection[0];
        (
          ElementEditor.getEditor(target) as unknown as { processPaste(v: unknown): void }
        ).processPaste(text);
        return true;
      }
      return false;
    }
    const textNode = new Text();
    textNode.setText(text, true, true);
    if (ownTransaction) editor.beginTransaction();
    try {
      if (!this.executeCallback([textNode], true)) {
        editor.insertElements([textNode], false, true, true);
        const family = provider && provider.getDefaultFamilyForString(text);
        if (family && family !== defaultFamily) {
          const direction = OpenTypeFont.getDirectionForString(text);
          if (direction !== TLDirectionTextTransformer.LTR) {
            textNode.setProperties(["_tff", "dir", "_we"], [family, direction, true]);
          } else textNode.setProperties(["_tff", "_we"], [family, true]);
        } else textNode.setProperty("_we", true);
        (
          ElementEditor.getEditor(textNode) as unknown as { invalidateTextWidth(): void }
        ).invalidateTextWidth();
        this._centerToView();
      }
    } finally {
      if (ownTransaction) {
        editor.commitTransaction(Locale.get(new LocaleKey("GPaste", "action.paste")) as string);
      }
    }
    return true;
  }

  /** The selection without collaborative text annotations. */
  private _filterForInlineEditing(selection: readonly Node[] | null): Node[] | null {
    return selection
      ? selection.filter((node) => !(node instanceof CollaborativeTextAnnotation))
      : null;
  }

  /** The nodes a pasted paint layer or effect may go to: no pages, groups or symbols. */
  private _filterForStyleExceptions(nodes: readonly Node[]): Node[] {
    const excluded = [Page, Group, GSymbol];
    const result: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as Node;
      let allowed = true;
      for (let k = 0; k < excluded.length; k++) {
        if (node instanceof (excluded[k] as typeof Page)) {
          allowed = false;
          break;
        }
      }
      if (allowed) result.push(node);
    }
    return result;
  }

  /**
   * Centers the selection in the visible part of the canvas (clipped to
   * the page on a fixed-size page), or in the page or content when no
   * window is open.
   */
  private _centerToView(noUndo?: boolean): void {
    const editor = activeDocument().getEditor();
    const scene = activeDocument().getScene();
    const window = activeWindow();
    const page = scene.getActivePage();
    let area: Rect;
    const content = (
      scene.isFixedSized() ? (page as Page).getGeometryBBox() : scene.getPaintBBox()
    ) as Rect;
    if (window) {
      const view = window.getView();
      const viewTransform = view.getViewTransform(page);
      const dpi = PaintCanvas.getScreenDPI();
      const viewBox = view.getViewBox().scaled(dpi, dpi);
      area = viewTransform.mapRect(viewBox);
      if (scene.isFixedSized()) area = area.intersected(content);
      if (area.isEmpty()) area = content;
    } else area = content;
    editor.arrangeAlign(Editor.ArrangeAlignType.AlignCenter, null, true, area, true, noUndo);
    editor.arrangeAlign(Editor.ArrangeAlignType.AlignMiddle, null, true, area, true, noUndo);
  }

  /** The hidden paste area (Firefox, Safari), or null. */
  getArea(): HTMLDivElement | null {
    return this._pasteArea;
  }

  setAllowFocus(allow: boolean): void {
    this._allowFocus = allow;
  }

  getAllowFocus(): boolean {
    return this._allowFocus;
  }

  /** Sets the one-shot receiver of the next paste (null: insert as usual). */
  assignCallback(callback: PasteCallback | null): void {
    this._callback = callback;
  }

  /** Hands the elements to the assigned callback; false when there is none. */
  executeCallback(elements: Node[], isText?: boolean): boolean {
    if (!this._callback) return false;
    this._callback(elements, isText);
    this._callback = null;
    return true;
  }
}

/** A node with paint layers and effects. */
function stylable(node: Node): {
  getPaintLayers(): { appendChild(child: Node): void };
  getEffects(): { appendChild(child: Node): void };
} {
  return node as unknown as ReturnType<typeof stylable>;
}
