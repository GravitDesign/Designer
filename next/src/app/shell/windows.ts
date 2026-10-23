// Old: designer.browser.dev.js module 603 (GWindows).
/**
 * The document windows in #windows. Only the active window's container
 * is attached; activating another one detaches it, tells the designer
 * which document is now active and lays the new one out.
 */
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { registerClass } from "../../engine/core/object.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { useShellStore } from "../state/shell-store.ts";
import { height, width } from "./dom.ts";
import type { DesignerDocument } from "./designer.ts";
import { designer } from "./globals.ts";
import { systemDialog } from "./late.ts";
import { Window, type WindowDocument } from "./window.ts";

const WindowEventType = {
  Added: 0,
  Removed: 1,
  Deactivated: 10,
  Activated: 11,
} as const;

export type WindowEventTypeValue = (typeof WindowEventType)[keyof typeof WindowEventType];

/** GWindows.WindowEvent. */
export class WindowEvent extends Event {
  static {
    registerClass(this, "GWindows.WindowEvent");
  }

  static readonly Type = WindowEventType;

  constructor(
    public type: WindowEventTypeValue,
    public window: Window,
    public index?: number,
  ) {
    super();
  }

  override toString(): string {
    return "[Object GWindows.WindowEvent]";
  }
}

/** The document-side calls of closing a window (GDocument; app-config-document). */
interface ClosableDocument extends WindowDocument {
  isSynchronizing?(): boolean;
  isModified?(): boolean;
}

/** The result a save prompt hands back (documentStatus SaveCancelled keeps the window). */
interface CloseResult {
  documentStatus?: number;
}

/** GSaveAction.ID (module 447): the close prompt runs it with a callback. */
const SAVE_ACTION_ID = "file.save";

export class Windows extends EventTarget {
  static readonly WindowEvent = WindowEvent;

  private readonly _htmlElement: HTMLElement;
  private readonly _windows: Window[] = [];
  private _activeWindow: Window | null = null;
  private _viewOffset: number[] | null = null;

  constructor(htmlElement: HTMLElement) {
    super();
    this._htmlElement = htmlElement;
  }

  getWindows(): readonly Window[] {
    return this._windows;
  }

  getActiveWindow(): Window | null {
    return this._activeWindow;
  }

  activateWindow(window: Window | null, recenter?: boolean): void {
    if (window === this._activeWindow) return;
    if (this._activeWindow) {
      this._activeWindow.deactivate();
      this._activeWindow._container.remove();
    }
    if (null === window) designer().activateDocument(null, true);
    else if (
      (window && this._activeWindow && window.getDocument() !== this._activeWindow.getDocument()) ||
      !this._activeWindow
    )
      designer().activateDocument(window.getDocument() as DesignerDocument, true);
    const previous = this._activeWindow;
    this._activeWindow = window;
    useShellStore.setState({ activeWindow: window });
    if (previous && this.hasEventListeners(WindowEvent))
      this.trigger(new WindowEvent(WindowEvent.Type.Deactivated, previous));
    if (window) {
      window.getDocument()._activeWindow = window;
      this._htmlElement.appendChild(window._container);
      this._relayoutWindow(window, recenter);
      window.activate(recenter);
      if (this.hasEventListeners(WindowEvent))
        this.trigger(new WindowEvent(WindowEvent.Type.Activated, window));
    }
  }

  /**
   * A new window for a document (or for the document of a window, then
   * with that window's scroll and zoom), inserted at `index`, activated.
   */
  addWindow(source: WindowDocument | Window, isPreview?: boolean, index?: number): Window {
    const document = source instanceof Window ? source.getDocument() : source;
    const added = this._addWindow(document, isPreview, index);
    if (source instanceof Window) {
      const view = source.getView();
      const addedView = added.getView();
      if (addedView && view)
        addedView.transform(view.getScrollX(), view.getScrollY(), view.getZoom());
    }
    return added;
  }

  /**
   * Closes a window. The last window of a modified document asks to save
   * first (the save action with the close callback); `force` skips that.
   */
  removeWindow(
    window: Window,
    done?: (() => void) | null,
    force?: boolean,
    recenter?: boolean,
  ): void {
    const document = window.getDocument() as ClosableDocument;
    const close = (result?: CloseResult): void => {
      if (result && result.documentStatus === DocumentStatus.SaveCancelled) return;
      if (window === this._activeWindow) {
        const index = this._windows.indexOf(window);
        if (index > 0) this.activateWindow(this._windows[index - 1] as Window, recenter);
        else if (index + 1 < this._windows.length)
          this.activateWindow(this._windows[index + 1] as Window, recenter);
        else this.activateWindow(null);
      }
      if (document._activeWindow === window) document._activeWindow = null;
      document._windows.splice(document._windows.indexOf(window), 1);
      this._windows.splice(this._windows.indexOf(window), 1);
      useShellStore.setState({ windows: this._windows.slice() });
      window._container.remove();
      if (this.hasEventListeners(WindowEvent))
        this.trigger(new WindowEvent(WindowEvent.Type.Removed, window));
      window.release();
      if (done) done();
      if (0 === document._windows.length) designer().removeDocument(document as DesignerDocument);
    };
    if (force) close();
    else if (document.isSynchronizing && document.isSynchronizing())
      systemDialog().alert(
        Locale.get(
          new LocaleKey("GCommonNames", "text.please-wait-avoid-losing-progress"),
        ) as string,
      );
    else if (1 === document._windows.length && document.isModified && document.isModified())
      designer()
        .canUnloadDocument(document as DesignerDocument)
        .then((canUnload) => {
          if (canUnload) close();
          else designer().executeAction(SAVE_ACTION_ID, [document, close], undefined, true);
        })
        .catch((error: unknown) => {
          if (error && !(error as CloseResult).documentStatus) console.log(error);
        });
    else close();
  }

  init(): void {}

  /** Keeps the view offset (left, top, right, bottom) and lays out the active window. */
  relayout(viewOffset?: number[] | null): void {
    this._viewOffset = viewOffset || this._viewOffset;
    if (this._activeWindow) this._relayoutWindow(this._activeWindow);
  }

  private _relayoutWindow(window: Window, recenter?: boolean): void {
    window.relayout(
      width(this._htmlElement),
      height(this._htmlElement),
      this._viewOffset,
      recenter,
    );
  }

  private _addWindow(document: WindowDocument, isPreview?: boolean, index?: number): Window {
    const window = new Window(document, isPreview);
    document._windows.push(window);
    if ("number" == typeof index) this._windows.splice(index, 0, window);
    else this._windows.push(window);
    useShellStore.setState({ windows: this._windows.slice() });
    if (this.hasEventListeners(WindowEvent))
      this.trigger(new WindowEvent(WindowEvent.Type.Added, window, index));
    this.activateWindow(window);
    return window;
  }

  getHtmlElement(): HTMLElement {
    return this._htmlElement;
  }

  getWindow(document: WindowDocument): Window | null {
    for (const window of this._windows) if (window.getDocument() === document) return window;
    return null;
  }

  override toString(): string {
    return "[Object GWindows]";
  }
}
