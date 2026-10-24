// Old: designer.browser.dev.js module 841 (GMissingFontsDialog), and the
// part of module 255 (GFontsProviderManager) that opened it.
/**
 * Lists the fonts a document uses that no provider could load, with a
 * font button per row to pick a replacement. "Replace Fonts" swaps them in
 * every text and text style; "Keep Fonts" (only for texts that carry their
 * outlines or embedded fonts) records them in the scene's "cst" list so
 * nobody asks again.
 *
 * The fonts provider manager calls the handler registered at the bottom
 * whenever a font failed in every provider (FontsProviderManager
 * .setMissingFontsHandler); it collects the families per document and
 * opens one dialog for them once the document is ready.
 */
import { createElement, useSyncExternalStore, type ReactNode } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Style } from "../../engine/style/style.ts";
import { Text } from "../../engine/text/text.ts";
import type { Font } from "../../engine/text/fonts/font.ts";
import { DocumentStatusEvent } from "../document/document-status-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { FontsProviderManager, type FontRequest } from "../fonts/font-manager.ts";
import { designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";
import { Dialog } from "./dialog.ts";
import {
  MissingFontsButton,
  MissingFontsDialogView,
  type MissingFontRow,
} from "./missing-fonts-dialog-view.tsx";

/** gDesigner.getWorkspace().getFontManager().getDefaultFont(). */
function defaultFontOfWorkspace(): Font | null {
  const fonts = designer().getWorkspace().getFontManager();
  return (fonts as NonNullable<typeof fonts>).getDefaultFont();
}

function text(key: string): string {
  return Locale.get(new LocaleKey("GMissingFontsDialog", key)) as string;
}

/** What the dialog uses of a GDocument. */
export interface MissingFontsDocument {
  getScene(): MissingFontsScene | null;
  getStatus(): number | null;
  readonly sessionId: string;
}

interface MissingFontsScene {
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): void;
  acceptChildren(visitor: (node: Node) => boolean | undefined): unknown;
}

/** The font chooser behaviour of fonts/fonts-button.ts ($.fn.gFontsButton, app-fonts-ui). */
interface FontsButtonModule {
  attach(
    input: HTMLInputElement,
    options: { assignFontCallback: (family: string, input: HTMLInputElement) => void },
  ): void;
}

/** A text node as the replace code reads it. */
type TextLike = Text & { $fontFamilies?: string[] };

/** Font runs of a text (getContent): each names its family. */
type Run = { fontFamily?: string };

interface ButtonState {
  keepLabel: string;
  keepHidden: boolean;
}

export class MissingFontsDialog {
  private readonly _dialog: Dialog;
  /** Missing family -> replacement family. */
  private _replacedFonts: Record<string, string> = {};
  opened = false;
  private readonly _document: MissingFontsDocument | null;
  private readonly _callbacks: ((replaced: Record<string, string> | null) => void)[] = [];
  private _rows: MissingFontRow[] = [];
  private _enablerGroups: (readonly globalThis.Node[])[] = [];
  private _buttons: ButtonState;
  private readonly _buttonListeners = new Set<() => void>();
  private readonly _keepDisabled: boolean;

  constructor(
    document: MissingFontsDocument | null,
    fonts: string[] | Record<string, string> | null,
    enablers: readonly globalThis.Node[] | null,
    callback?: (replaced: Record<string, string> | null) => void,
  ) {
    this._document = document;
    this._buttons = { keepLabel: text("action.keep-fonts"), keepHidden: false };
    this._keepDisabled = !this._hasFakeTextNodes();
    if (callback) this._callbacks.push(callback);
    this.setMissingFonts(fonts);
    const buttons: ReactNode[] = [];
    buttons.push(createElement(KeepFontsButton, { key: "keep", dialog: this }));
    if (document)
      buttons.unshift(
        createElement(MissingFontsButton, {
          key: "replace",
          label: text("action.replace-fonts"),
          onClick: () => this._replaceFonts(),
        }),
      );
    this.setProviderEnablers(enablers);
    this._dialog = Dialog.create(this._view(), {
      releaseOnClose: true,
      className: "g-missingfonts-dialog",
      buttons,
    });
  }

  /** For the Keep Fonts button: its label and visibility change while open. */
  subscribeButtons(listener: () => void): () => void {
    this._buttonListeners.add(listener);
    return () => this._buttonListeners.delete(listener);
  }

  getButtons(): ButtonState {
    return this._buttons;
  }

  isKeepDisabled(): boolean {
    return this._keepDisabled;
  }

  keepFonts(): void {
    this._keepFonts();
  }

  private _setButtons(change: Partial<ButtonState>): void {
    this._buttons = { ...this._buttons, ...change };
    for (const listener of this._buttonListeners) listener();
  }

  private _view(): ReactNode {
    return createElement(MissingFontsDialogView, {
      title: text("text.fonts-missing"),
      subtitle: text("text.fonts-not-found"),
      rows: this._rows,
      enablerGroups: this._enablerGroups,
      enablersTitle: text("text.turn-disabled-function") + ":",
      attach: (input, font) => this._attachFontsButton(input, font),
    });
  }

  private _render(): void {
    // Before the dialog exists (constructor), the first render picks it up.
    if (this._dialog) this._dialog.renderContent(this._view());
  }

  private _attachFontsButton(input: HTMLInputElement, font: string): void {
    const fontsButton = lateExport<FontsButtonModule>("fonts/fonts-button.ts", "FontsButton");
    if (!fontsButton) return;
    fontsButton.attach(input, {
      assignFontCallback: (family) => {
        this._replacedFonts[font] = family;
      },
    });
  }

  getMissingFonts(): string[] {
    return this._rows.map((row) => row.font);
  }

  setProviderEnablers(enablers: readonly globalThis.Node[] | null): void {
    if (enablers && enablers.length > 0) {
      this._enablerGroups = [...this._enablerGroups, enablers.slice()];
      this._render();
    }
  }

  /**
   * A list gets the default font as the replacement for each family and
   * shows Keep Fonts; a map brings its own replacements and hides it.
   * Families already listed keep their row.
   */
  setMissingFonts(fonts: string[] | Record<string, string> | null): void {
    if (!fonts) {
      this._setButtons({ keepHidden: true });
      return;
    }
    const known = Object.keys(this._replacedFonts);
    let defaultFont: Font | null | undefined;
    if (Array.isArray(fonts)) {
      defaultFont = defaultFontOfWorkspace();
      this._setButtons({ keepHidden: false });
      fonts.forEach((font) => {
        this._replacedFonts[font] = (defaultFont as Font).getFamily();
      });
    } else {
      this._setButtons({ keepHidden: true });
      Object.keys(fonts).forEach((font) => {
        this._replacedFonts[font] = fonts[font] as string;
      });
    }
    const rows = this._rows.slice();
    Object.keys(this._replacedFonts).forEach((font) => {
      if (known.indexOf(font) >= 0) return;
      // Old: `replaced || n.getFamily()`, where n is only set for a list;
      // a map with an empty replacement throws here as before.
      rows.push({
        font,
        value: this._replacedFonts[font] || (defaultFont as Font).getFamily(),
      });
    });
    this._rows = rows;
    this._render();
  }

  open(keepLabel?: string | null): void {
    this._setButtons({ keepLabel: keepLabel || text("action.keep-fonts") });
    this.opened = true;
    this._dialog.open(false);
  }

  close(replaced?: boolean): void {
    this.opened = false;
    this._callbacks.forEach((callback) => {
      callback(replaced ? this._replacedFonts : null);
    });
    this._dialog.close();
  }

  private _keepFonts(): void {
    const scene = this._document ? this._document.getScene() : null;
    if (scene) {
      const kept = (scene.getProperty("cst") as string[] | null) || [];
      Object.keys(this._replacedFonts).forEach((font) => {
        // Old: `!t.indexOf(e) >= 0 && t.push(e)`, which is always true, so
        // every family is added again (see "Keep Fonts adds duplicates to
        // cst" in QUESTIONS.md).
        if (Number(!kept.indexOf(font)) >= 0) kept.push(font);
      });
      scene.setProperty("cst", kept);
      this.close();
    } else this.close();
  }

  private _hasFakeTextNodes(): boolean {
    let found = false;
    const scene = this._document && this._document.getScene();
    if (scene)
      scene.acceptChildren((node) => {
        if (node instanceof Text && (node.isFakeText() || node.hasEmbeddedFonts())) {
          found = true;
          return false;
        }
        return undefined;
      });
    return found;
  }

  private _replaceFonts(): void {
    const scene = (this._document as MissingFontsDocument).getScene() as MissingFontsScene;
    scene.acceptChildren((node) => {
      if (node instanceof Text) {
        const textNode = node as TextLike;
        if (textNode.isFakeText() || !textNode.$fontFamilies)
          textNode.replaceFonts(this._replacedFonts, textNode.hasEmbeddedFonts());
        else {
          const defaultFont = defaultFontOfWorkspace();
          const missing = Object.keys(this._replacedFonts);
          const runs = textNode.getContent() as Run[] | null;
          if (runs) {
            runs.forEach((run, index) => {
              const family =
                (textNode.$fontFamilies && textNode.$fontFamilies[index]) || run.fontFamily;
              if (-1 !== missing.indexOf(family as string))
                run.fontFamily =
                  this._replacedFonts[family as string] || (defaultFont as Font).getFamily();
            });
            textNode._runsDirty = true;
            textNode.$content = JSON.stringify(runs);
            textNode.setText(runs);
            textNode.repaint();
          }
        }
      } else if (node instanceof Style) {
        const family = node.getProperty("_tff") as string | null;
        // Old: a GFont replacement set family, style and weight; the
        // replacements are always a map here, so only the family changes.
        if (family && this._replacedFonts[family])
          node.setProperty("_tff", this._replacedFonts[family]);
      }
      return undefined;
    });
    this.close(true);
  }
}

/** The Keep Fonts button, following the label and visibility the dialog sets. */
function KeepFontsButton({ dialog }: { dialog: MissingFontsDialog }): ReactNode {
  const state = useSyncExternalStore(
    (listener) => dialog.subscribeButtons(listener),
    () => dialog.getButtons(),
  );
  return createElement(MissingFontsButton, {
    label: state.keepLabel,
    disabled: dialog.isKeepDisabled(),
    hidden: state.keepHidden,
    onClick: () => dialog.keepFonts(),
  });
}

// ---------------------------------------------------------------------------
// The manager side (old module 255, function g): which families are still
// to be asked about per document, and the one open dialog.

/** Families asked about per document session; a value once the user chose. */
const missingFontsActions: Record<string, Record<string, string | null>> = {};
/** The status listener waiting for each document to be ready. */
const listenerFor = new Map<string, (event?: DocumentStatusEvent) => void>();
let missingFontsDialog: MissingFontsDialog | null = null;

/** The open dialog, if any (for tests). */
export function currentMissingFontsDialog(): MissingFontsDialog | null {
  return missingFontsDialog;
}

/** What the old code read of a provider. */
interface EnablerProvider {
  isInitialized(): boolean;
  hasEnabler(): boolean;
  getEnabler(): unknown;
}

/** Drops the families already asked about for this document and remembers the rest. */
function filterAsked(families: string[], document: MissingFontsDocument): void {
  if (!missingFontsActions[document.sessionId]) missingFontsActions[document.sessionId] = {};
  const asked = missingFontsActions[document.sessionId] as Record<string, string | null>;
  for (let i = families.length - 1; i >= 0; i--) {
    const family = families[i] as string;
    if (Object.prototype.hasOwnProperty.call(asked, family)) families.splice(i, 1);
    else asked[family] = null;
  }
}

/** A font failed everywhere: ask about it once the active document is ready. */
export function handleMissingFont(request: FontRequest): void {
  const document = designer().getActiveDocument() as unknown as MissingFontsDocument | null;
  const manager = FontsProviderManager.getInstance();
  const check = (event?: DocumentStatusEvent): void => {
    const doc = document as MissingFontsDocument;
    if (event)
      switch (event.status) {
        case DocumentStatus.Saved:
        case DocumentStatus.SyncFailed:
        case DocumentStatus.Ready:
        case DocumentStatus.SaveFailed:
          manager.removeEventListener(DocumentStatusEvent, check);
          listenerFor.delete(doc.sessionId);
          break;
        case DocumentStatus.LoadFailed:
          manager.removeEventListener(DocumentStatusEvent, check);
          listenerFor.delete(doc.sessionId);
          return;
        default:
          return;
      }
    const scene = doc.getScene() as MissingFontsScene;
    if (((scene.getProperty("cst") as string[] | null) || []).indexOf(request.family) >= 0) return;
    const families = [request.family];
    const enablers = (FontsProviderManager.getProviders() as unknown as EnablerProvider[])
      .filter((provider) => !provider.isInitialized() && provider.hasEnabler())
      .map((provider) => provider.getEnabler() as globalThis.Node);
    filterAsked(families, doc);
    if (!families.length) return;
    if (missingFontsDialog) {
      missingFontsDialog.setProviderEnablers(enablers);
      missingFontsDialog.setMissingFonts(families);
    } else
      missingFontsDialog = new MissingFontsDialog(doc, families, enablers, (replaced) => {
        missingFontsDialog = null;
        manager.keepFontsMessage = null;
        const asked = missingFontsActions[doc.sessionId] as Record<string, string | null>;
        for (const family in replaced) asked[family] = replaced[family] as string;
      });
    if (
      request.tryToResolveMissingFont &&
      manager.getShowMissingFontsDialog() &&
      !missingFontsDialog.opened
    )
      missingFontsDialog.open(manager.keepFontsMessage);
    manager._firstCallback = () => {};
  };
  if (document && document.getStatus() === DocumentStatus.Ready) check();
  else if (document && !listenerFor.has(document.sessionId)) {
    listenerFor.set(document.sessionId, check);
    manager.addEventListener(DocumentStatusEvent, check);
  }
}

// The old manager's reset() dropped its reference to the open dialog, so
// the next missing font after a reset builds a new one.
FontsProviderManager.setMissingFontsHandler(handleMissingFont, () => {
  missingFontsDialog = null;
});
