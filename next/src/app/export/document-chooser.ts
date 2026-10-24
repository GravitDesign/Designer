// Old: designer.browser.dev.js module 1475 (the document chooser, unnamed; its strings are GDocumentChooser).
/**
 * Asks which of two versions of a document to keep: a preview of each
 * (an "online" and an "offline" one), its date, and "newer file" on the
 * newer one. A click on a preview closes the dialog and hands that scene
 * to the callback.
 *
 *     .g-dialog.g-document-chooser > .g-dialog-content
 *       .g-btn-close, .header > .title, .subtitle, .container > .preview*, .footer > .buttons
 *
 * The old GDocument opened it when a cloud file and the local copy
 * differed. The cloud sync is gone, so nothing in the app opens it now;
 * it is kept because port-map ports it, with the old behaviour.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Bitmap } from "../../engine/paint/bitmap.ts";
import { Image, ImageStatusEvent } from "../../engine/scene/image.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { BitmapExport, type BitmapExportNode } from "../../io/export/bitmap-export.ts";
import { Dialog } from "../dialogs/dialog.ts";
import { css } from "../shell/dom.ts";

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/** What the chooser reads from a document version. */
export type ChooserScene = Pick<Scene, "lastModifiedDate" | "acceptChildren">;

export class DocumentChooser {
  _currentDocument: ChooserScene;
  _newDocument: ChooserScene;
  _localName: string;
  _cloudName: string;
  _callback: (scene: ChooserScene) => void;
  _onCancel: (() => void) | null;
  _content: HTMLElement;
  _container: HTMLElement;
  _footer: HTMLElement;
  _dialog: Dialog;

  constructor(
    currentDocument: ChooserScene,
    newDocument: ChooserScene,
    localName: string,
    cloudName: string,
    callback: (scene: ChooserScene) => void,
    onCancel?: (() => void) | null,
  ) {
    this._currentDocument = currentDocument;
    this._newDocument = newDocument;
    this._localName = localName;
    this._cloudName = cloudName;
    this._callback = callback;
    this._onCancel = onCancel || null;
    this._content = make("div");
    const close = make("div", "g-btn-close");
    css(close, "display", this._onCancel ? "" : "none");
    close.appendChild(make("span", "gravit-icon-close"));
    close.addEventListener("click", () => this.close());
    this._content.appendChild(close);
    const header = make("div", "header");
    this._content.appendChild(header);
    const title = make("div", "title");
    const titleText = make("span");
    titleText.textContent = text("GDocumentChooser", "text.sync.title");
    title.appendChild(titleText);
    header.appendChild(title);
    const subtitle = make("div", "subtitle");
    const subtitleText = make("span");
    subtitleText.textContent = text("GDocumentChooser", "text.sync.subtitle");
    subtitle.appendChild(subtitleText);
    header.appendChild(subtitle);
    this._container = make("div", "container");
    this._content.appendChild(this._container);
    this._footer = make("div", "footer");
    css(this._footer, "display", this._onCancel ? "" : "none");
    this._content.appendChild(this._footer);
    const buttons = make("div", "buttons");
    this._footer.appendChild(buttons);
    const cancel = make("button", "g-button");
    cancel.textContent = text("GLocale", "cancel");
    cancel.addEventListener("click", () => this.close());
    buttons.appendChild(cancel);
    this._dialog = new Dialog(this._content, {
      releaseOnClose: true,
      className: "g-document-chooser",
    });
    this._updatePreview();
  }

  open(): void {
    this._dialog.open(false);
  }

  close(): void {
    this._dialog.close();
    if (this._onCancel) this._onCancel();
  }

  _updatePreview(): void {
    this._container.replaceChildren();
    this._createPreview(
      this._newDocument,
      "online",
      this._cloudName,
      this._newDocument.lastModifiedDate() > this._currentDocument.lastModifiedDate(),
    );
    this._createPreview(
      this._currentDocument,
      "offline",
      this._localName,
      this._currentDocument.lastModifiedDate() > this._newDocument.lastModifiedDate(),
    );
  }

  /** Resolves once the images of an online version loaded or failed. */
  _loadPreview(scene: ChooserScene, kind: string): Promise<void> {
    return new Promise((resolve) => {
      if ("offline" === kind) {
        resolve();
        return;
      }
      const pending: Image[] = [];
      const listener = (event: ImageStatusEvent): void => {
        const image = event.image as Image;
        if (
          image.getStatus() === Image.ImageStatus.Loaded ||
          image.getStatus() === Image.ImageStatus.Error
        ) {
          image.removeEventListener(ImageStatusEvent, listener);
          const index = pending.indexOf(image);
          if (-1 !== index) pending.splice(index, 1);
          if (!pending.length) resolve();
        }
      };
      scene.acceptChildren((node) => {
        // The old test could never be true (Error and Loaded at once), so
        // every image is waited for, even one that already loaded.
        if (node instanceof Image) {
          pending.push(node);
          node.addEventListener(ImageStatusEvent, listener);
        }
        return undefined;
      });
      if (!pending.length) resolve();
    });
  }

  _createPreview(scene: ChooserScene, kind: string, name: string, newer = false): void {
    const image = make("div", "image");
    const preview = make("div", "preview");
    preview.addEventListener("click", () => {
      this.close();
      this._callback(scene);
    });
    this._container.appendChild(preview);
    const previewImage = make("div", "preview-image loading");
    css(previewImage, "background", Pattern.asCSSBackground(null));
    previewImage.appendChild(image);
    preview.appendChild(previewImage);
    void this._loadPreview(scene, kind).then(() => {
      const bitmap = BitmapExport.export(
        scene as unknown as BitmapExportNode,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ) as Bitmap;
      previewImage.classList.remove("loading");
      css(
        image,
        "background-image",
        "url(".concat(bitmap.toImageDataUrl(Bitmap.ImageType.JPEG, 1), ")"),
      );
    });
    const date = (value: Date): string =>
      0 === value.getTime()
        ? text("GDocumentChooser", "text.unavailable")
        : Locale.toLocaleDate(value, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          });
    const title = make("div", "title");
    const titleText = make("span");
    titleText.textContent = name + " " + text("GDocumentChooser", "text." + kind);
    title.appendChild(titleText);
    preview.appendChild(title);
    const subtitle = make("div", "subtitle");
    const subtitleText = make("span");
    subtitleText.textContent =
      date(scene.lastModifiedDate()) +
      (newer ? " " + text("GDocumentChooser", "text.newer-file") : "");
    subtitle.appendChild(subtitleText);
    preview.appendChild(subtitle);
  }

  toString(): string {
    return "[Object GDocumentChooser]";
  }
}
