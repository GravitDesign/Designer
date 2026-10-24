// Old: designer.browser.dev.js module 1544 (GNewDocumentDialog).
/**
 * The welcome screen, which is also the new-document dialog: a sidebar
 * (New Design, Open from Computer, Open Recent, two help links and the
 * version) and the start page with the custom size row, the preset tiles
 * and the "don't show at startup" switch. Enter creates a document of the
 * typed size (both empty: an infinite canvas); a preset tile opens its
 * list of sizes, and picking one creates the document at once.
 *
 * The cloud parts are gone: the spectator ("view only") mode always
 * answered false and the licence listener only re-ran that check, so the
 * dialog shows its normal state (the spectator styling is left out); the
 * stats and analytics calls are dropped.
 */
import { createElement } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Length } from "../../engine/math/length.ts";
import { YOUTUBE_PLAYLIST } from "../actions/help/help-links.ts";
import { OpenAction } from "../actions/file/open-action.ts";
import { OpenSafariAction } from "../actions/file/open-safari-action.ts";
import { BrandLockup } from "../brand/brand-mark.tsx";
import { isNextBranding } from "../brand/branding.ts";
import { brandVersionLine } from "../brand/version.ts";
import { Dialog } from "../dialogs/dialog.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { Document } from "../document/document.ts";
import { Runtime, type RecentDocument } from "../shell/container.ts";
import { height, width } from "../shell/dom.ts";
import { container, designer } from "../shell/globals.ts";
import { renderInto } from "../state/islands.tsx";
import { offset } from "../widgets/dom-helpers.ts";
import type { InputBox } from "../widgets/input-box.ts";
import { Presets, type Preset, type PresetLayout } from "./presets.ts";
import {
  PresetListView,
  RecentDocumentsView,
  WelcomeScreenView,
  type SidebarEntry,
  type WelcomeLink,
  type WelcomeOption,
  type WelcomeScreenState,
} from "./welcome-screen-view.tsx";

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

/** What open() takes (the cloud options of the old callers are ignored, as before). */
export interface WelcomeScreenOptions {
  closable?: boolean;
  /** Called after a document was created from the dialog. */
  cb?: (() => void) | null;
  /** The class of a sidebar entry to click after the start page ("start-option"). */
  defaultOption?: string;
  /** Called when the dialog closes; `cancelled` is true for Escape and the backdrop. */
  closeCallback?: ((cancelled?: boolean) => void) | null;
  [cloudOption: string]: unknown;
}

/** The runtime short names of the version line (vendor chunk module 582). */
function runtimeAbbreviation(): string | null {
  const runtime = container().getRuntime();
  if (runtime === Runtime.PWA) return "Pwa";
  if (runtime === Runtime.Browser) return "Web";
  if (runtime === Runtime.Electron) {
    const platform = (container() as unknown as { getPlatform?(): string }).getPlatform?.();
    if (platform === "darwin") return "Mac";
    if (platform === "win32") return "Win";
    if (platform === "linux") return "Lin";
    return platform ?? null;
  }
  if (runtime === Runtime.Chrome) return "Cho";
  if (runtime === Runtime.IPad) return "Ips";
  return null;
}

/** The recent-file icon class of the Electron container, where it has one. */
function recentIconClass(item: RecentDocument): string {
  const host = container() as unknown as {
    getRecentDocumentIconClass?(item: RecentDocument): string;
  };
  return (host.getRecentDocumentIconClass && host.getRecentDocumentIconClass(item)) || "";
}

export class WelcomeScreen {
  private readonly _dialog: Dialog;
  private _cb: (() => void) | null = null;
  private _closeCallback: ((cancelled?: boolean) => void) | null | undefined;
  private _widthBox: InputBox | null = null;
  private _heightBox: InputBox | null = null;
  private _state: WelcomeScreenState;
  private readonly _entries: SidebarEntry[] = [];
  /** The version line's click counter (non-production builds only). */
  private _versionInfo: { current: number } | null = null;
  private _footerSerial = 0;
  /** The preset table, read once as the old dialog built it once (_createPresetsFrame). */
  private readonly _presets: Preset[] = Presets.getPresets(true);

  constructor() {
    this._state = {
      activeOption: null,
      activeSeparators: new Set(),
      footer: null,
      version: this._versionText(),
    };
    this._createSeparator("start-option");
    this._createOption(
      text("GNewDocumentDialog", "text.start-option"),
      text("GNewDocumentDialog", "text.start-option-description"),
      "start-option",
      () => this._showStartPage(),
    );
    this._createSeparator("local-option");
    this._createOption(
      text("GNewDocumentDialog", "text.local-option"),
      text("GNewDocumentDialog", "text.local-option-description"),
      "local-option",
      () => this._openDocument(),
      true,
    );
    this._createSeparator("recent-option");
    this._createOption(
      text("GNewDocumentDialog", "text.recent-option"),
      text("GNewDocumentDialog", "text.recent-option-description"),
      "recent-option",
      (event) => this._showRecentDocuments(event.currentTarget),
      true,
    );
    this._createSeparator("");
    this._dialog = Dialog.create(this._view(), {
      closeTimeout: 0,
      releaseOnClose: false,
      className: "g-new-document-dialog",
      closeCallback: (cancelled) => {
        if (this._closeCallback) this._closeCallback(cancelled);
      },
      alwaysCloseable: true,
    });
    document.addEventListener("keydown", (event) => {
      if (13 === event.keyCode && this._dialog.isOpen()) this._newDocumentCustomSize();
    });
  }

  private _links(): WelcomeLink[] {
    const links = [
      { href: YOUTUBE_PLAYLIST, label: new LocaleKey("GOpenLinkAction", "title.tutorials") },
      { href: "/docs/index.html", label: new LocaleKey("GOpenLinkAction", "title.user-guide") },
    ];
    return links.map((link) => ({
      text: Locale.get(link.label) as string,
      onClick: (event) => container().openExternalLink(event, link.href),
    }));
  }

  private _view() {
    return createElement(WelcomeScreenView, {
      brandHead: isNextBranding()
        ? createElement(BrandLockup, { className: "gd-welcome-lockup" })
        : undefined,
      entries: this._entries,
      links: this._links(),
      presets: this._presets,
      texts: {
        width: text("GCommonNames", "text.width"),
        height: text("GCommonNames", "text.height"),
        createCanvas: text("GNewDocumentDialog", "action.create-canvas"),
        leaveEmpty: text("GNewDocumentDialog", "action.leave-empty-infinite"),
        dontShow: text("GNewDocumentDialog", "text.start-option-check"),
      },
      state: this._state,
      widthRef: (box: InputBox | null) => {
        this._widthBox = box;
      },
      heightRef: (box: InputBox | null) => {
        this._heightBox = box;
      },
      onSizeKeyDown: (event) => {
        if (13 === event.keyCode) this._newDocumentCustomSize();
      },
      onCreate: () => {
        if (!this._isSpectatorMode()) this._newDocumentCustomSize();
      },
      onPresetClick: (event, preset) => {
        if (!this._isSpectatorMode()) this._showPresetDropdown(event, preset);
      },
      onDontShowChange: (checked) => {
        designer().setSetting("show_welcome_screen", !checked);
      },
      onVersionClick: () => this._versionClicked(),
    });
  }

  private _setState(change: Partial<WelcomeScreenState>): void {
    this._state = { ...this._state, ...change };
    if (this._dialog) this._dialog.renderContent(this._view());
  }

  /** "Version <friendly>[ LTS| Staging][ <runtime>]". */
  private _versionSuffix(): string {
    let suffix = "";
    const env = designer().getEnv();
    if ("lts" === env) suffix = " LTS";
    else if ("rc" === env) suffix = " Staging";
    const runtime = runtimeAbbreviation();
    if (runtime) suffix += " ".concat(runtime);
    return suffix;
  }

  /**
   * "Version i015.3 Web" (classic), or "GravitDesign Next 2.0.0 Web" in
   * the "next" look (CHANGES.md).
   */
  private _versionText(): string {
    if (isNextBranding()) return brandVersionLine() + this._versionSuffix();
    return (
      text("GCommonNames", "text.version") +
      " " +
      designer().getVersionFriendlyName() +
      this._versionSuffix()
    );
  }

  /** Outside production, LTS and RC, clicks cycle through version, build and commit. */
  private _versionClicked(): void {
    const env = designer().getEnv();
    if ("production" === env || "lts" === env || "rc" === env) return;
    if (!this._versionInfo) this._versionInfo = { current: 0 };
    const info = this._versionInfo;
    info.current = (info.current + 1) % 4;
    let html = "";
    switch (info.current) {
      case 0:
        html = this._versionText();
        break;
      case 1:
        html = text("GCommonNames", "text.internal-version") + ": " + designer().getVersion();
        break;
      case 2:
        html = text("GCommonNames", "text.build") + ": " + (designer().getBuildNum() || "");
        break;
      case 3:
        html =
          text("GCommonNames", "text.commit") +
          ": " +
          (designer().getCommitSHA() || "").substr(0, 8);
    }
    this._setState({ version: html });
  }

  getDialogElement(): HTMLElement {
    return this._dialog.getContent();
  }

  private _createSeparator(className: string): void {
    this._entries.push({
      kind: "separator",
      className,
      index: this._entries.filter((entry) => entry.kind === "separator").length,
    });
  }

  /**
   * A sidebar entry. Clicking one that may activate separators lights up
   * the separators right before and after it.
   */
  private _createOption(
    title: string,
    subtitle: string,
    className: string,
    callback: (event: React.MouseEvent<HTMLDivElement>) => void,
    keepSeparators?: boolean,
  ): void {
    const position = this._entries.length;
    const option: WelcomeOption = {
      className,
      title,
      subtitle,
      onClick: (event) => {
        if (!keepSeparators) this._activateSeparatorsAround(position);
        callback(event);
      },
    };
    this._entries.push({ kind: "option", option });
  }

  private _activateSeparatorsAround(position: number): void {
    const active = new Set<number>();
    for (let i = position - 1; i >= 0; i--) {
      const entry = this._entries[i] as SidebarEntry;
      if (entry.kind === "separator") {
        active.add(entry.index);
        break;
      }
    }
    for (let i = position + 1; i < this._entries.length; i++) {
      const entry = this._entries[i] as SidebarEntry;
      if (entry.kind === "separator") {
        active.add(entry.index);
        break;
      }
    }
    this._setState({ activeSeparators: active });
  }

  /** The start page: presets again and a new "don't show" row with the current setting. */
  private _showStartPage(): void {
    const stored: unknown = designer().getSetting("show_welcome_screen");
    const show = typeof stored !== "boolean" || stored;
    this._setState({
      footer: { serial: ++this._footerSerial, checked: !show },
      activeOption: this._isSpectatorMode() ? this._state.activeOption : "start-option",
    });
  }

  private _showRecentDocuments(option: HTMLElement): void {
    const content = document.createElement("div");
    const overlay = new Overlay(content, {
      releaseOnClose: true,
      clazz: "g-recent-documents",
      padding: false,
    });
    const recent = container().getRecentDocuments();
    renderInto(
      content,
      createElement(RecentDocumentsView, {
        items: recent
          ? recent.map((item) => ({
              iconClass: recentIconClass(item),
              name: item.getName() + "." + (item.getExtension() as string).toLowerCase(),
              onClick: () => {
                try {
                  designer().openDocument(
                    item as unknown as Parameters<ReturnType<typeof designer>["openDocument"]>[0],
                  );
                } catch (error) {
                  // Old: an external-file error (dropped with the cloud) showed a
                  // dialog; everything else closed the dialog and was rethrown.
                  void this.close();
                  throw error;
                }
                void this.close();
              },
            }))
          : null,
        empty: text("GNewDocumentDialog", "text.recent-option-empty"),
      }),
    );
    // Old: content.height() before opening, while it was not in the page (0).
    const contentHeight = content.isConnected ? height(content) : 0;
    const x = offset(option).left + width(option) - 10;
    const y = offset(option).top - contentHeight;
    overlay.open({ x, y });
  }

  open(options: WelcomeScreenOptions): void {
    const { closable, cb, defaultOption, closeCallback } = options;
    this._cb = cb || null;
    this._closeCallback = closeCallback;
    this._dialog.open(closable);
    // Old: display "" on the sidebar parts (a no-op), then a click on the
    // start entry and on everything with the default option's class.
    this._clickOption("start-option");
    if (defaultOption) this._clickOption(defaultOption);
    // Old: _updateUI() for the spectator mode and a licence listener
    // removed again on close; both are gone with the licence.
  }

  /** Clicks the sidebar entry with the class, as jQuery's trigger("click") did. */
  private _clickOption(className: string): void {
    const element = this._dialog
      .getContent()
      .querySelector<HTMLElement>(".sidebar-options .option." + className);
    if (element) element.click();
  }

  isOpen(): boolean {
    return this._dialog.isOpen();
  }

  close(): Promise<void> {
    this._dialog.close(false, 0);
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  private _newDocumentFromPreset(preset: Preset, index: number): void {
    const layout = preset.layouts[index] as PresetLayout;
    this._newDocument(layout.width, layout.height, layout.unit, layout.dpi);
  }

  /** Both sizes empty: an infinite canvas; otherwise both must be positive numbers. */
  private _newDocumentCustomSize(): void {
    const widthText = (this._widthBox as InputBox).value();
    const heightText = (this._heightBox as InputBox).value();
    const unit = this.getDialogElement().querySelector<HTMLSelectElement>(
      '.preset.custom-size [name="unit"]',
    )?.value;
    const widthEmpty = "" === widthText;
    const heightEmpty = "" === heightText;
    const w = widthEmpty ? 0 : parseInt(widthText);
    const h = heightEmpty ? 0 : parseInt(heightText);
    if (isNaN(w) || isNaN(h) || !unit || (!w && !widthEmpty) || (!h && !heightEmpty)) return;
    // The typed texts go in as they are (see "Custom page size in pt is
    // stored as text" in QUESTIONS.md).
    this._newDocument(widthText, heightText, unit);
  }

  private _newDocument(
    pageWidth: number | string,
    pageHeight: number | string,
    unit: string,
    dpi?: number,
  ): void {
    const scene = designer().createScene();
    scene.setProperties(["ut", "dpi"], [unit, dpi || Length.DPI]);
    // Old: new GLength(text, unit); its arithmetic coerces the text.
    (
      scene.getActivePage() as unknown as {
        setProperties(names: string[], values: unknown[]): void;
      }
    ).setProperties(
      ["bck", "w", "h"],
      [
        RGBColor.WHITE,
        new Length(pageWidth as number, unit).toPoint(),
        new Length(pageHeight as number, unit).toPoint(),
      ],
    );
    designer().addDocument(
      new Document(scene) as unknown as Parameters<ReturnType<typeof designer>["addDocument"]>[0],
    );
    void this.close();
    if (this._cb) this._cb();
  }

  private _openDocument(): void {
    const action = designer().getAction(OpenSafariAction.ID);
    designer().executeAction(
      action && action.isAvailable() ? OpenSafariAction.ID : OpenAction.ID,
      [null, this.close.bind(this)],
      undefined,
      true,
    );
  }

  private _getLayoutFormattedSize(layout: PresetLayout): string {
    return layout.width + "x" + layout.height + " " + layout.unit;
  }

  private _getLayoutDisplayName(layout: PresetLayout): string {
    return layout.name + " (" + this._getLayoutFormattedSize(layout) + ")";
  }

  private _showPresetDropdown(event: React.MouseEvent<HTMLElement>, preset: Preset): void {
    event.stopPropagation();
    const target = (event.target as HTMLElement).closest(".preset")?.querySelector(".name");
    const list = document.createElement("ul");
    const overlay = new Overlay(list, { clazz: "preset-select", padding: false, offsetY: 10 });
    renderInto(
      list,
      createElement(PresetListView, {
        items: preset.layouts.map((layout) => this._getLayoutDisplayName(layout)),
        onPick: (pick) => {
          overlay.close();
          const value = parseInt((pick.target as HTMLElement).getAttribute("data-value") as string);
          this._newDocumentFromPreset(preset, value);
        },
      }),
    );
    overlay.open(target as Element);
  }

  private _isSpectatorMode(): boolean {
    return false;
  }
}
