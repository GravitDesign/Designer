// Old: designer.browser.dev.js module 1503 (GWindow).
/**
 * One view of a document: a `div.window` in #windows holding the
 * document's GEditorWidget, plus the loading/saving overlay. The view is
 * created once the document is Ready (or Locked) with a scene, and
 * replaced when the document gets another scene.
 *
 * The container and the overlay are plain DOM, built here like the old
 * jQuery code did: the view's own element is an imperative canvas host,
 * and #windows renders no React children (docs/rewrite/UI.md, section 5).
 */
import { EventTarget } from "../../engine/core/event-target.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Util } from "../../engine/core/util.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import {
  AfterFlagChangeEvent,
  AfterPropertiesChangeEvent,
} from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Editor } from "../../editor/editor.ts";
import { EditorWidget } from "../../editor/view/editor-widget.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatusEvent } from "../document/document-status-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { PageClip } from "../export/page-clip.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { css, cssAll } from "./dom.ts";
import { designer } from "./globals.ts";

/** What a window needs of its document (GDocument; app-config-document). */
export interface WindowDocument {
  getScene(): Scene | null;
  getEditor(): Editor | null;
  getStatus(): number;
  getTitle(): string;
  getStorageItem(): { getExtension(): string | null } | null;
  addEventListener(
    eventClass: typeof DocumentStatusEvent,
    listener: (event: DocumentStatusEvent) => void,
    target?: object | null,
    args?: readonly unknown[] | null,
    prepend?: boolean,
    persistent?: boolean,
  ): void;
  removeEventListener(
    eventClass: typeof DocumentStatusEvent,
    listener: unknown,
    target?: object | null,
  ): boolean;
  /** The document's windows and its active one; Windows writes both, as before. */
  _windows: Window[];
  _activeWindow: Window | null;
  sessionId?: number;
  setErrored?(errored: boolean): void;
  isCollaborativeTextEditing?(): boolean;
  updateStatus?(status: number): void;
}

/** The data the document passes with a loading or saving status. */
interface StatusData {
  filename?: string;
  cancelHandlerHolder?: boolean;
  text?: unknown;
  progressInfo?: (info: string) => void;
  progress?: ((percent: number) => void) | null;
}

/** GConfig.USE_EXTENSION_IN_FILENAME (module 10). */
const USE_EXTENSION_IN_FILENAME = false;

function element(tag: string, className?: string): HTMLElement {
  const created = document.createElement(tag);
  if (className) created.className = className;
  return created;
}

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

export class Window extends EventTarget {
  /** GWindow.VIEW_MARGIN: the view margin on every side. */
  static readonly VIEW_MARGIN = 10;

  /** The element in #windows (old `_container`). */
  readonly _container: HTMLDivElement;
  private readonly _overlay: HTMLElement;
  private readonly _document: WindowDocument;
  private _view: EditorWidget | null = null;
  private _requiresViewTransformation = true;
  private _isPreview = false;

  constructor(document: WindowDocument, isPreview?: boolean) {
    super();
    this._container = element("div", "window") as HTMLDivElement;
    const overlayContainer = element("div", "window-overlay-container");
    overlayContainer.appendChild(element("div", "window-overlay-content"));
    this._overlay = element("div", "window-overlay");
    this._overlay.appendChild(overlayContainer);
    this._document = document;
    document.addEventListener(
      DocumentStatusEvent,
      this._documentStatusChanged,
      this,
      undefined,
      undefined,
      true,
    );
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
    this._container.addEventListener("mousedown", () => {
      if (this._view) this._view.focus();
    });
    if (isPreview) this._isPreview = isPreview;
    this._updateScene();
  }

  isPreview(): boolean {
    return this._isPreview;
  }

  getDocument(): WindowDocument {
    return this._document;
  }

  getView(): EditorWidget | null {
    return this._view;
  }

  getHtmlElement(): HTMLDivElement {
    return this._container;
  }

  /** The document title, with ":<n>" for every window after the first. */
  getTitle(): string {
    let title = this._document.getTitle();
    const index = this._document._windows.indexOf(this);
    if (index > 0) title += ":" + index.toString();
    return title;
  }

  getTitleWithExtension(): string {
    const title = this.getTitle();
    const item = this._document.getStorageItem();
    if (item && USE_EXTENSION_IN_FILENAME) {
      const extension = "." + (item.getExtension() || "").toLowerCase();
      if (!title.endsWith(extension)) return title + extension;
    }
    return title;
  }

  /**
   * Shows the view: centered and zoomed the first time (or with
   * `recenter`), with the rulers and guide settings, and focused.
   */
  activate(recenter?: boolean): void {
    const view = this._view;
    if (!view) return;
    if (
      this._requiresViewTransformation &&
      ((1 === view.getZoom() && 0 === view.getScrollX() && 0 === view.getScrollY()) || recenter)
    )
      this.centerAndZoom();
    this._requiresViewTransformation = false;
    view.setRulers(designer().getSetting("rulers_visible") as boolean);
    const active = designer().getWindows().getActiveWindow();
    const mainframe = document.getElementById("mainframe");
    if (mainframe && active && active.getView())
      mainframe.classList.toggle("rulers", (active.getView() as EditorWidget).hasRulers());
    const configuration = view.getViewConfiguration();
    configuration.guideLinesVisible = designer().getSetting("guide_lines_visible") as boolean;
    configuration.symbolLabelsVisible = designer().getSetting("symbol_labels_visible") as boolean;
    configuration.gridVisible = true;
    view.focus();
  }

  /** Closes the inline editor and drops the view's tile cache. */
  deactivate(): void {
    if (this._document) {
      const editor = this._document.getEditor();
      if (editor) editor.closeInlineEditor();
      if (this._view) this._view.cleanCache();
    }
  }

  /**
   * The container gets the size of #windows, the view the panels' offset
   * and the new size (scrolling by half the size change), the overlay the
   * same offset.
   */
  relayout(width: number, height: number, viewOffset: number[] | null, force?: boolean): void {
    const view = this._view;
    if (view) {
      css(this._container, "width", width);
      css(this._container, "height", height);
      view.setViewOffset(viewOffset as number[]);
      const previousWidth = view.getWidth();
      const previousHeight = view.getHeight();
      view.resize(width, height, force, () => {
        if (previousWidth && previousHeight && (previousWidth != width || previousHeight != height))
          view.scrollBy((previousWidth - width) / 2, (previousHeight - height) / 2);
      });
    }
    cssAll(this._overlay, {
      left: (viewOffset ? viewOffset[0] : 0) + "px",
      top: (viewOffset ? viewOffset[1] : 0) + "px",
      right: (viewOffset ? viewOffset[2] : 0) + "px",
      bottom: (viewOffset ? viewOffset[3] : 0) + "px",
    });
  }

  release(): void {
    this._releaseScene();
    this._releaseView();
    this._document.removeEventListener(DocumentStatusEvent, this._documentStatusChanged, this);
    designer().removeEventListener(DocumentEvent, this._documentEvent, this);
    const fonts = FontsProviderManager.getInstance() as unknown as {
      releaseDocumentListener?(sessionId: number | undefined): void;
    };
    if (fonts.releaseDocumentListener) fonts.releaseDocumentListener(this._document.sessionId);
  }

  /** The active page's content at 100%, or fitted when it is larger than the view. */
  centerAndZoom(): void {
    const view = this._view as EditorWidget;
    const scene = this._document.getScene() as Scene;
    const page = scene.getActivePage();
    let box = scene.getPaintBBox();
    if (page) {
      if (view.getViewConfiguration().multiPageView) {
        const position = page.getPosition(1);
        const pageBox = page.getPaintBBox(1);
        if (pageBox) box = pageBox.translated(position.getX(), position.getY());
      } else if (
        PageClip.CDR_ORIGIN_PROPERTY_NAME &&
        page.getProperty(PageClip.CDR_ORIGIN_PROPERTY_NAME, true)
      ) {
        const content = page.getContentBBox();
        box = content && !content.isEmpty() ? content : page.getPaintBBox();
      } else box = page.getPaintBBox();
    } else if (scene.isFixedSized())
      box = new Rect(0, 0, scene.getProperty("w") as number, scene.getProperty("h") as number);
    const viewBox = view.getViewBox(true);
    if (!box || box.isEmpty() || viewBox.isEmpty()) view.zoomAt(new Point(0, 0), 1);
    else if (box.getWidth() >= viewBox.getWidth() || box.getHeight() >= viewBox.getHeight())
      view.zoomAll(box, false);
    else view.zoomAtCenter(box.getSide(Rect.Side.CENTER), 1);
  }

  /** Whether a point in view coordinates is inside the view minus its offset. */
  viewContainsMouse(x: number, y: number): boolean {
    if (!this._view) return false;
    const offset = this._view.getViewOffset();
    const left = offset[0] as number;
    const top = offset[1] as number;
    const right = this._view.getWidth() - (offset[2] as number);
    const bottom = this._view.getHeight() - (offset[3] as number);
    return !(x < left || x > right || y < top || y > bottom);
  }

  private _releaseView(): void {
    if (this._view) {
      this._view.release();
      this._view = null;
    }
  }

  private _releaseScene(): void {
    const scene = this._view ? this._view.getScene() : null;
    if (scene) {
      scene.removeEventListener(
        AfterPropertiesChangeEvent,
        this._sceneAfterPropertiesChanged,
        this,
      );
      scene.removeEventListener(AfterFlagChangeEvent, this._afterFlagChangeEvent, this);
    }
  }

  /** The progress overlay with a message, a 0-100 bar and a hidden cancel button. */
  activateProgress(message: string, cancelable?: boolean | null): HTMLElement {
    const content = element("div");
    const box = element("span");
    const paragraph = element("p", "text");
    paragraph.textContent = message;
    const progress = element("progress") as HTMLProgressElement;
    progress.setAttribute("min", "0");
    progress.setAttribute("max", "100");
    css(progress, "width", "200px");
    progress.value = 0;
    const info = element("p");
    css(info, "display", "none");
    info.classList.add("progress-info");
    box.append(paragraph, progress, info);
    const buttons = element("div");
    const cancel = element("button", "cancel-loading");
    css(cancel, "display", "none");
    buttons.appendChild(cancel);
    content.append(box, buttons);
    return this._setOverlayContent(content, cancelable);
  }

  deactivateProgress(): void {
    this._setOverlayContent(null);
  }

  activateCancelLoading(cancel: () => void): void {
    const button = this._overlay.querySelector<HTMLElement>(".cancel-loading");
    if (!button) return;
    button.textContent = text("GCommonNames", "text.cancel-loading");
    button.addEventListener("click", () => {
      cancel();
      this.deactivateProgress();
    });
    css(button, "display", "");
  }

  private _setOverlayContent(
    content: HTMLElement | null,
    closeOnClick?: boolean | null,
  ): HTMLElement {
    if (content) {
      this._container.appendChild(this._overlay);
      const holder = this._overlay.querySelector(".window-overlay-content") as HTMLElement;
      holder.replaceChildren(content);
      if (closeOnClick) {
        // The old handler tried to unbind itself with the wrong argument, so
        // it stays on the reused overlay element (see "The window overlay
        // keeps its close-on-click handler" in QUESTIONS.md).
        this._overlay.addEventListener("click", () => {
          this._setOverlayContent(null);
        });
      }
    } else {
      this._overlay.remove();
    }
    return this._overlay;
  }

  private _documentEvent(event: DocumentEvent): void {
    if (event.type === DocumentEvent.Type.StorageItemUpdated) this._updateViewConfiguration();
  }

  private _documentStatusChanged(event: DocumentStatusEvent): void {
    // The document passes an object with every loading and saving status;
    // the handlers below add their callbacks to it.
    const data = (event.data || {}) as StatusData;
    switch (event.status) {
      case DocumentStatus.Ready:
        this._updateScene();
        break;
      case DocumentStatus.Loading:
      case DocumentStatus.Saving:
      case DocumentStatus.Syncing:
      case DocumentStatus.Downloading: {
        // The old code also looked up a title per status and never used it.
        let detail = text("GCommonNames", "text.loading-file");
        if (event.status === DocumentStatus.Saving)
          detail = text("GCommonNames", "text.saving-file");
        else if (event.status === DocumentStatus.Syncing)
          detail = text("GCommonNames", "text.synchronizing-file");
        else if (event.status === DocumentStatus.Downloading)
          detail = text("GCommonNames", "text.downloading-file");
        const name = data.filename ? data.filename : this._document.getTitle();
        if (name) detail = detail.replace("%name", name);
        const message = name ? detail + "..." : text("GDocument", "text.opening-your-image");
        this.activateProgress(message, data.cancelHandlerHolder ? data.cancelHandlerHolder : null);
        data.text = (value: string, plain?: boolean) => {
          const paragraph = this._overlay.querySelector(".text");
          if (paragraph) paragraph.textContent = name && !plain ? detail : value;
        };
        data.progressInfo = (info: string) => {
          const paragraph = this._overlay.querySelector<HTMLElement>(".progress-info");
          if (!paragraph) return;
          paragraph.textContent = info;
          css(paragraph, "display", info ? "" : "none");
        };
        let last = 0;
        let lastTime = new Date().getTime();
        const chained = data.progress;
        data.progress = (percent: number) => {
          const now = new Date().getTime();
          if (100 === percent || (percent - last >= 0.5 && now - lastTime >= 40)) {
            lastTime = now;
            const bar = this._overlay.querySelector("progress");
            if (bar) {
              bar.value = percent;
              // Forces the bar to repaint (an old browser workaround).
              const display = bar.style.display;
              bar.style.display = "none";
              void bar.offsetHeight;
              bar.style.display = display;
              void bar.offsetHeight;
            }
            last = percent;
            if (chained && typeof chained === "function") chained(percent);
          }
        };
        break;
      }
      case DocumentStatus.LoadCancelled:
      case DocumentStatus.DownloadCancelled:
      case DocumentStatus.SaveCancelled:
        this._setOverlayContent(null);
        break;
      case DocumentStatus.Saved:
        if (this._document.setErrored) this._document.setErrored(false);
        this._setOverlayContent(null);
        break;
      case DocumentStatus.Loaded:
        this.centerAndZoom();
        break;
      case DocumentStatus.SyncFailed:
      case DocumentStatus.Downloaded:
      case DocumentStatus.DownloadFailed:
        this._setOverlayContent(null);
        break;
      case DocumentStatus.LoadFailed: {
        let message = text("GCommonNames", "text.loading-failed");
        if (data.text && !(data.text instanceof Function)) message = String(data.text);
        const span = element("span");
        span.textContent = message;
        this._setOverlayContent(span);
        break;
      }
      case DocumentStatus.SaveFailed:
        if (this._document.setErrored) this._document.setErrored(true);
        if (
          this._document.isCollaborativeTextEditing &&
          this._document.isCollaborativeTextEditing()
        )
          return;
        this._setOverlayContent(this._saveFailedContent(event.data));
        break;
    }
  }

  private _saveFailedContent(data: unknown): HTMLElement {
    const span = element("span");
    cssAll(span, {
      padding: "6px",
      display: "inline-block",
      backgroundColor: "#333",
      borderRadius: "6px",
    });
    const paragraph = element("p");
    paragraph.textContent =
      "string" == typeof data ? data : text("GCommonNames", "text.unable-to-save");
    cssAll(paragraph, { lineHeight: "1.5em", margin: "10px" });
    const cancel = element("button");
    cancel.textContent = text("GLocale", "cancel");
    cancel.addEventListener("click", () => {
      if (this._document.updateStatus) this._document.updateStatus(DocumentStatus.SaveCancelled);
      this._setOverlayContent(null);
    });
    css(cancel, "margin", "10px");
    const retry = element("button");
    retry.textContent = text("GCommonNames", "text.try-again");
    retry.addEventListener("click", () => {
      // GSaveAsAction.ID + "." + the default format's extension.
      if (this._document)
        designer().executeAction(
          "file.save-as.gvdesign",
          [null, this._document, null],
          "failedalertdialog",
        );
    });
    css(retry, "margin", "10px");
    span.append(paragraph, cancel, retry);
    return span;
  }

  /** A new view when the document is ready and its scene changed. */
  _updateScene(): void {
    if (this._view && this._document.getScene() === this._view.getScene()) return;
    this._releaseScene();
    this._releaseView();
    const status = this._document.getStatus();
    const scene = this._document.getScene();
    if (!scene || (status !== DocumentStatus.Ready && status !== DocumentStatus.Locked)) return;
    const view = new EditorWidget(this._document.getEditor() as Editor);
    this._view = view;
    this._updateViewConfiguration();
    view.setViewMargin([
      Window.VIEW_MARGIN,
      Window.VIEW_MARGIN,
      Window.VIEW_MARGIN,
      Window.VIEW_MARGIN,
    ]);
    this._container.replaceChildren(view._htmlElement);
    this._updateWindowBackground();
    const viewScene = view.getScene() as Scene;
    viewScene.addEventListener(
      AfterPropertiesChangeEvent,
      this._sceneAfterPropertiesChanged,
      this,
      undefined,
      undefined,
      true,
    );
    viewScene.addEventListener(
      AfterFlagChangeEvent,
      this._afterFlagChangeEvent,
      this,
      undefined,
      undefined,
      true,
    );
    this._requiresViewTransformation = true;
  }

  /** No watermark: the commercial-product watermark came with the cloud licence. */
  private _updateViewConfiguration(): void {
    if (!this._view) return;
    (this._view.getViewConfiguration() as { watermark?: unknown }).watermark = null;
    this._view.invalidate();
  }

  private _sceneAfterPropertiesChanged(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && Util.containsOneOf(event.properties as string[], ["w", "h"]))
      this._updateWindowBackground();
  }

  /** White behind an infinite canvas, the stylesheet's colour behind fixed pages. */
  private _updateWindowBackground(): void {
    if (!this._view) return;
    this._view._htmlElement.style.background = (this._document.getScene() as Scene).isFixedSized()
      ? ""
      : "white";
  }

  getVisibleBBox(): Rect | null {
    const scene = this._document.getScene() as Scene;
    if (scene.isFixedSized())
      return new Rect(0, 0, scene.getProperty("w") as number, scene.getProperty("h") as number);
    return this._view ? new Rect(0, 0, this._view.getWidth(), this._view.getHeight()) : null;
  }

  private _afterFlagChangeEvent(event: AfterFlagChangeEvent): void {
    if (event.node instanceof Page && event.flag === NodeFlag.Active)
      this._updateWindowBackground();
  }

  /** Scrolls the box (scene coordinates) into the visible area on the next frame. */
  scrollIntoView(box: Rect | null): void {
    if (!box || box.isEmpty()) return;
    const view = this.getView() as EditorWidget;
    const visible = view.getViewVisibleArea();
    const mapped = view.getWorldTransform().mapRect(box);
    if (!visible.containsRect(mapped)) {
      const center = visible.getSide(Rect.Side.CENTER);
      const delta = mapped.getSide(Rect.Side.CENTER).subtract(center);
      Platform.scheduleFrame(() => view.scrollBy(delta.getX(), delta.getY()));
    }
  }

  override toString(): string {
    return "[Object GWindow]";
  }
}
