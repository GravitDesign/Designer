// Old: designer.browser.dev.js module 1513 (the export dialog, unnamed; its strings are GExportDialog).
/**
 * File > Export > Advanced Export... and the PDF "Advanced Options...":
 *
 *     .g-dialog.g-export-dialog > .g-dialog-content
 *       .setup-container
 *         .mode-container > label[data-mode=canvas|selection|assets]
 *         .settings-container > div[data-setting=...] > span.label, span.control
 *       .preview-container > (.preview-image.content | .list.content > .item* | .empty)
 *
 * The dialog builds and rewrites its rows imperatively from the change
 * handlers (rows shown and hidden, options selected, the preview rebuilt),
 * and the export itself queries what it built, so it owns plain DOM like
 * the old jQuery code (docs/rewrite/UI.md: dialogs own their element).
 *
 * The settings of the last export without options are remembered for the
 * next dialog without options (the old module variable `f`).
 *
 * Dropped with the licence and analytics: the free-user lock on the
 * controls and its "dialog-expired-pro" class, the Pro badges (gPro) of
 * the SVG options, the watchDog wrapper of the Export button and the stats
 * and Amplitude calls.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Platform } from "../../engine/core/platform.ts";
import { extend } from "../../engine/core/util.ts";
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Length } from "../../engine/math/length.ts";
import { Bitmap } from "../../engine/paint/bitmap.ts";
import type { PaintStyle } from "../../engine/paint/paint-canvas.ts";
import type { Element as SceneElement } from "../../engine/scene/element.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Editor } from "../../editor/editor.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { BitmapExport, type BitmapExportNode } from "../../io/export/bitmap-export.ts";
import { exporters } from "../../io/export/index.ts";
import { SvgExport } from "../../io/export/svg/svg-export.ts";
import { Dialog } from "../dialogs/dialog.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import type { Document } from "../document/document.ts";
import { FileTypes } from "../document/file-types.ts";
import { chooserOf, eventArgs, patternChooser } from "../inspector/color-deps.ts";
import { hide, show } from "../inspector/properties.ts";
import { Menu, MenuPosition } from "../menus/menu.ts";
import type { MenuItem } from "../menus/menu-item.ts";
import { css } from "../shell/dom.ts";
import { container, designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";
import { InputBox } from "../widgets/input-box.ts";
import {
  Exporter,
  JPEG_EXPORT_QUALITY_DEFAULT,
  type Exportable,
  type ExportMessenger,
  type ExportStorage,
} from "./export-document.ts";

type Mode = "canvas" | "selection" | "assets";

/** The dialog's export configuration (the old `configuration` object). */
interface ExportConfiguration {
  ignoreEffects: boolean;
  forceEffectsWhenZoomed: boolean;
  sceneBackground: boolean;
  isOutline: () => boolean;
  [key: string]: unknown;
}

/** The dialog settings (the old `this._settings`). */
export interface ExportDialogSettings {
  size: string;
  format: string;
  jpegQuality: number;
  backgroundColor: PaintStyle | null;
  backgroundOpacity: number;
  /** What the background chooser shows: a page background (bck) or the picked colour. */
  chooserColor: Pattern | null;
  chooserOpacity: number;
  convertTextToPath: boolean;
  decimalPlacesPrecision: number;
  configuration: ExportConfiguration;
  preserveEditingCapabilities: boolean;
  layerNamesAsId: boolean;
  downsampleImages: boolean;
  background?: string;
  colorSpace?: string;
  /** The options of "Export Page" and the PDF variant (`element`, `format`). */
  element?: unknown;
  [key: string]: unknown;
}

/** A storage destination of the container (none in the browser). */
interface StorageDestination {
  id: number;
  label: string;
  stats?: string;
  isSupported(format: string): boolean;
}

interface WriteAccessStorage {
  getWritePermission(destination: unknown): Promise<{
    isAuthorized(): boolean;
    hasStatusText(): boolean;
    getStatusText(): string | undefined;
  }>;
}

interface PreviewItem {
  element: Node | Node[];
  name: string | undefined;
  format: string;
  size: string | undefined;
  jpegQuality: number | undefined;
  backgroundColor: PaintStyle | null | undefined;
  backgroundOpacity: number | undefined;
  sizes: string;
  formats: string;
  configuration: Exportable["configuration"];
}

const PDF_EXT = FileTypes.PDF.ext;
const ZIP_EXT = "zip";

/** The settings of the last export without options (module variable `f`). */
let rememberedSettings: Partial<ExportDialogSettings> = {};

/** Forgets the remembered settings (for tests). */
export function resetRememberedExportSettings(): void {
  rememberedSettings = {};
}

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

function setDisplay(element: Element | null, shown: boolean): void {
  if (element) css(element as HTMLElement, "display", shown ? "" : "none");
}

function fireChange(element: Element): void {
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/** The element behind an item's data("element"). */
const itemElements = new WeakMap<Element, Node | Node[]>();

export class ExportDialog {
  _document: Document | null;
  _options: Partial<ExportDialogSettings> | null;
  _settings: ExportDialogSettings;
  _activeMode: Mode | null = null;
  _warningSection: HTMLElement | null = null;
  _chooserElem: HTMLElement | null = null;
  _dialog!: Dialog;
  _content!: HTMLElement;
  _setupContainer!: HTMLElement;
  _modeContainer!: HTMLElement;
  _settingsContainer!: HTMLElement;
  _previewContainer!: HTMLElement;
  _sizeMenu!: Menu;

  /**
   * `document` is the active document, `options` the action's options
   * (the PDF variant's `{ format: "pdf" }`, "Export Page"'s `element`),
   * `referer` the action id (the old free-user lock used it).
   */
  constructor(
    document: Document | null,
    options?: Partial<ExportDialogSettings> | null,
    referer?: string,
  ) {
    this._document = document;
    this._options = options || null;
    const page = document ? (document.getScene() as Scene).getActivePage() : null;
    this._settings = extend(
      {
        size: "1x",
        format: "png",
        jpegQuality: JPEG_EXPORT_QUALITY_DEFAULT,
        backgroundColor: page ? page.getProperty("bck") : null,
        backgroundOpacity: page ? page.getProperty("bop") : 1,
        chooserColor: page ? page.getProperty("bck") : null,
        chooserOpacity: page ? page.getProperty("bop") : 1,
        convertTextToPath: false,
        decimalPlacesPrecision: 3,
        configuration: {
          ignoreEffects: false,
          forceEffectsWhenZoomed: true,
          sceneBackground: true,
          isOutline: function () {
            return false;
          },
        },
        preserveEditingCapabilities: false,
        layerNamesAsId: SvgExport.DefaultOptions.layerNamesAsId,
        downsampleImages: false,
      },
      this._options || rememberedSettings,
    ) as unknown as ExportDialogSettings;
    this.init(false, referer);
  }

  /** Builds the dialog; `free` was the free-user lock (always false now). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the referer only fed the dropped licence lock
  init(free: boolean, _referer?: string): void {
    if (!this._settings.background) this._settings.background = "page-background";
    this._chooserElem = null;
    this._content = make("div");
    this._setupContainer = make("div", "setup-container");
    this._content.appendChild(this._setupContainer);
    this._modeContainer = make("div", "mode-container");
    this._setupContainer.appendChild(this._modeContainer);
    const addMode = (mode: Mode, caption: string, icon: string): void => {
      const label = make("label");
      label.setAttribute("data-mode", mode);
      label.appendChild(make("span", "icon " + icon));
      const name = make("span", "name");
      name.textContent = caption;
      label.appendChild(name);
      label.addEventListener("click", (event) => {
        const target = (event.target as Element).closest("label");
        if (!target || !target.classList.contains("g-disabled")) this._setActiveMode(mode);
      });
      this._modeContainer.appendChild(label);
    };
    // The canvas and selection icons came from the cloud icon module
    // (257, dropped); these are the names it mapped them to.
    addMode("canvas", text("GExportDialog", "text.canvas"), "gravit-icon-display");
    addMode("selection", text("GExportDialog", "text.selection"), "gravit-icon-cursor-filled");
    addMode("assets", text("GExportDialog", "text.assets"), "gravit-icon-layers");
    this._settingsContainer = make("div", "settings-container");
    this._setupContainer.appendChild(this._settingsContainer);

    const addSetting = (
      setting: string,
      label: string,
      control: HTMLElement,
      options: { controlLeft?: boolean } = {},
    ): HTMLElement => {
      const span = make("span", "control");
      span.appendChild(control);
      if (options.controlLeft) span.classList.add("control-left");
      if ("jpeg-quality" === setting) {
        css(span, "width", "55%");
        css(span, "height", "100%");
        css(span, "display", "flex");
        css(span, "justify-content", "center");
      }
      const row = make("div");
      row.setAttribute("data-setting", setting);
      if ("" !== label) {
        const caption = make("span", "label");
        caption.textContent = label;
        row.appendChild(caption);
      }
      row.appendChild(span);
      this._settingsContainer.appendChild(row);
      return row;
    };
    const left = { controlLeft: true };

    // Format
    const format = make("select");
    format.addEventListener("change", (event) => {
      this._settings.format = (event.target as HTMLSelectElement).value;
      if ("pdf" !== this._settings.format) this._settings.configuration.ignoreEffects = false;
      if (
        ("pdf" == this._settings.format || "jpg" == this._settings.format) &&
        "no-background" == this._settings.background
      )
        this._settings.background = "page-background";
      this._updateSettings();
      this._updatePreview();
      this._updateSizeMenu();
    });
    for (const [value, caption] of [
      ["png", "PNG"],
      ["jpg", "JPEG"],
      ["svg", "SVG"],
      ["pdf", "PDF"],
    ] as const) {
      const option = make("option");
      option.setAttribute("value", value);
      option.textContent = caption;
      format.appendChild(option);
    }
    addSetting("format", text("GCommonNames", "text.format"), format);

    // Size
    const sizeSelect = make("div", "g-input-select");
    const sizeInput = make("input");
    sizeInput.setAttribute("size", "6");
    sizeInput.value = this._settings.size;
    sizeInput.addEventListener("change", (event) => {
      this._settings.size = (event.target as HTMLInputElement).value;
      this._updatePreview();
    });
    const sizeButton = make("button");
    sizeButton.addEventListener("click", (event) => {
      const button = event.target as HTMLElement;
      this._sizeMenu.open(
        button,
        MenuPosition.Right_Bottom,
        MenuPosition.Right_Bottom,
        (item: MenuItem) => {
          const holder = button.closest("div");
          const input = holder ? holder.querySelector("input") : null;
          if (!input) return;
          input.value = this._formatCaption(String(item.getCaption()));
          fireChange(input);
          input.focus();
          input.select();
        },
      );
    });
    sizeSelect.appendChild(sizeInput);
    sizeSelect.appendChild(sizeButton);
    addSetting("size", text("GCommonNames", "text.size"), sizeSelect);

    // JPEG quality: a slider and a box that follow each other.
    const slider = make("div");
    const qualityInput = make("input");
    const sliders = lateExport<SliderClass>("color/opacity-slider.ts", "InputSlider");
    const qualitySlider = sliders ? new sliders(slider, { min: 25, max: 100 }) : null;
    css(slider, "align-self", "center");
    if (qualitySlider) qualitySlider.value(this._settings.jpegQuality);
    slider.addEventListener("change", () => {
      const value = parseInt(String(qualitySlider ? qualitySlider.value() : NaN), 10);
      this._settings.jpegQuality = value;
      this._updatePreview();
      qualityBox.value(value);
    });
    qualityInput.setAttribute("type", "text");
    const qualityBox = new InputBox(qualityInput, {
      minValue: 25,
      maxValue: 100,
      incrementValue: 1,
      postfix: "%",
    });
    qualityBox.value(this._settings.jpegQuality);
    qualityInput.addEventListener("change", () => {
      let value = parseInt(qualityBox.value(), 10);
      if (value > 100) value = 100;
      else if (value < 25) value = 25;
      if (qualitySlider) qualitySlider.value(value);
      this._settings.jpegQuality = value;
      this._updatePreview();
    });
    const quality = make("div", "jpeg-quality");
    quality.appendChild(slider);
    const qualityLabel = make("label");
    qualityLabel.appendChild(qualityInput);
    quality.appendChild(qualityLabel);
    addSetting("jpeg-quality", text("GExportDialog", "text.jpeg-quality"), quality);

    // Background
    const backgroundSelector = make("div", "export-background-selector");
    const background = make("select");
    background.addEventListener("change", (event) => {
      const select = event.target as HTMLSelectElement;
      this._settings.background = select.value;
      const next = select.nextElementSibling;
      if (next && next.classList.contains("export-background-pattern-chooser"))
        setDisplay(next, "custom-background" === this._settings.background);
      this._updateBackground();
      this._updatePreview();
    });
    for (const [value, key] of [
      ["page-background", "text.page-background"],
      ["custom-background", "text.custom-background"],
      ["no-background", "text.no-background"],
    ] as const) {
      const option = make("option");
      option.setAttribute("value", value);
      option.textContent = text("GExportDialog", key);
      background.appendChild(option);
    }
    backgroundSelector.appendChild(background);
    const chooser = make("span");
    css(chooser, "display", "custom-background" === this._settings.background ? "" : "none");
    chooser.classList.add("export-background-pattern-chooser");
    patternChooser(chooser, { noEyedropper: true, types: [Color], hasOpacity: true });
    const chooserHandle = chooserOf(chooser);
    if (chooserHandle) chooserHandle.value(this._settings.chooserColor);
    // The old handlers were unbound functions: `this` was the chooser
    // element, so the dialog's _chooserElem never changed. See "Export
    // dialog never closes its color chooser" in QUESTIONS.md.
    chooser.addEventListener("chooseropen", () => undefined);
    chooser.addEventListener("chooserclose", () => undefined);
    chooser.addEventListener("patternchange", (event) => {
      // The chooser offers colours only (types: [Color]).
      const [pattern, opacity] = eventArgs(event) as [Color | null | undefined, unknown];
      if (pattern) {
        this._settings.backgroundColor = pattern;
        this._settings.chooserColor = pattern;
      }
      if (opacity) {
        this._settings.backgroundOpacity = opacity as number;
        this._settings.chooserOpacity = opacity as number;
      } else {
        this._settings.backgroundOpacity = this._document
          ? (((this._document.getScene() as Scene).getActivePage() as Page).getProperty(
              "bop",
            ) as number)
          : 1;
      }
      this._updateBackground();
      this._updatePreview();
    });
    backgroundSelector.appendChild(chooser);
    if (this._settings.chooserColor && chooserHandle)
      chooserHandle.setPattern(this._settings.chooserColor);
    if (this._settings.chooserOpacity && chooserHandle)
      chooserHandle.opacity(this._settings.chooserOpacity);
    addSetting(
      "background-color",
      text("GCommonNames", "text.background-color"),
      backgroundSelector,
    );
    const selected = backgroundSelector.querySelector<HTMLOptionElement>(
      'option[value="' + this._settings.background + '"]',
    );
    if (selected) selected.selected = true;

    // Color space
    const colorSpace = make("select");
    colorSpace.addEventListener("change", (event) => {
      this._settings.colorSpace = (event.target as HTMLSelectElement).value;
    });
    for (const [value, caption] of [
      ["rgb", "RGB"],
      ["cmyk", "CMYK"],
    ] as const) {
      const option = make("option");
      option.setAttribute("value", value);
      option.textContent = caption;
      colorSpace.appendChild(option);
    }
    addSetting("color-space", text("GExportDialog", "text.color-mode"), colorSpace);

    /** label.label > input[type=checkbox] + span("&nbsp;" + text) [+ div.description]. */
    const checkbox = (
      checked: boolean,
      onChange: (checked: boolean) => void,
      key: string,
      descriptionKey?: string,
    ): HTMLElement => {
      const label = make("label", "label");
      const input = make("input");
      input.setAttribute("type", "checkbox");
      input.checked = checked;
      input.addEventListener("change", (event) => {
        onChange((event.target as HTMLInputElement).checked);
      });
      label.appendChild(input);
      const caption = make("span");
      // Markup from the string table, as the old .html("&nbsp;" + text).
      caption.innerHTML = "&nbsp;" + text("GExportDialog", key);
      label.appendChild(caption);
      if (descriptionKey) {
        const description = make("div", "description");
        description.innerHTML = text("GExportDialog", descriptionKey);
        label.appendChild(description);
      }
      return label;
    };

    addSetting(
      "ignore-effects",
      "",
      checkbox(
        true,
        (checked) => {
          this._settings.configuration.ignoreEffects = !checked;
          this._updatePreview();
        },
        "text.with-effects",
      ),
      left,
    );

    const decimals = make("input");
    decimals.setAttribute("type", "text");
    css(decimals, "width", "63px");
    const decimalsBox = new InputBox(decimals, { minValue: 0, maxValue: 6 });
    decimalsBox.value(this._settings.decimalPlacesPrecision);
    decimals.addEventListener("change", () => {
      this._settings.decimalPlacesPrecision = parseInt(decimalsBox.value());
    });
    addSetting(
      "decimal-places-precision",
      text("GExportDialog", "text.decimal-places-precision"),
      decimals,
    );

    addSetting(
      "convert-text-to-path",
      "",
      checkbox(
        true,
        (checked) => {
          this._settings.convertTextToPath = checked;
        },
        "text.export-as-curves",
      ),
      left,
    );

    addSetting(
      "export-all",
      "",
      checkbox(
        true,
        (checked) => {
          for (const input of this._previewContainer.querySelectorAll<HTMLInputElement>(
            ".item .preview-check input",
          )) {
            input.checked = checked;
            this._updateStorageDestinationSetting();
          }
        },
        "text.export-all",
      ),
      left,
    );

    addSetting(
      "layer-as-id",
      "",
      checkbox(
        this._settings.layerNamesAsId,
        (checked) => {
          this._settings.layerNamesAsId = checked;
        },
        "text.layer-as-id",
        "text.layer-as-id-info",
      ),
      left,
    );

    addSetting(
      "export-preserve-editing-capabilities",
      "",
      checkbox(
        true,
        (checked) => {
          this._settings.preserveEditingCapabilities = checked;
        },
        "text.preserve-svg-editing-capabilites",
        "text.preserve-svg-editing-capabilites-description",
      ),
      left,
    );

    addSetting(
      "do-not-downsample-images",
      "",
      checkbox(
        !this._settings.downsampleImages,
        (checked) => {
          this._settings.downsampleImages = !checked;
        },
        "text.do-not-downsample-images",
        "text.do-not-downsample-images-info",
      ),
      left,
    );

    addSetting("storage-destination", text("GExportDialog", "text.export-to"), make("select"));

    this._previewContainer = make("div", "preview-container");
    this._content.appendChild(this._previewContainer);
    this._sizeMenu = new Menu();
    this._setActiveMode("canvas", true);
    this._updateSettings();
    this._updateSizeMenu();

    const cancel = make("button");
    cancel.textContent = text("GLocale", "cancel");
    cancel.addEventListener("click", () => this.close());
    const exportButton = make("button");
    exportButton.textContent = text("GCommonNames", "text.export");
    exportButton.classList.add("primary");
    exportButton.addEventListener("click", () => {
      void this._export();
    });
    this._dialog = new Dialog(this._content, {
      releaseOnClose: true,
      className: free ? "g-export-dialog dialog-expired-pro" : "g-export-dialog",
      buttons: [cancel, exportButton],
    });
    fireChange(background);
  }

  open(): void {
    this._dialog.open(true);
  }

  close(): void {
    if (this._chooserElem) {
      const handle = chooserOf(this._chooserElem);
      if (handle) handle.close();
    }
    this._dialog.close();
  }

  /** The dialog's content element (`.g-dialog-content`). */
  getContent(): HTMLElement {
    return this._content;
  }

  _shouldWarningBeShown(exportables: Exportable[]): boolean {
    if (!this._hasFormat()) return false;
    if (!(this._settings.format === PDF_EXT)) return false;
    if (!exportables || !exportables.length) return false;
    const limit = new Length(200, Length.Unit.IN).toUnit(Length.Unit.PX);
    const dpi = Length.DPI;
    return exportables.some((exportable) => {
      const area = BitmapExport.getBitmapPaintArea(
        exportable.element as unknown as BitmapExportNode,
        exportable.size as string,
        dpi,
      );
      if (area.getWidth() > limit || area.getHeight() > limit) return true;
      return undefined;
    });
  }

  _updateWarningSection(exportables: Exportable[]): void {
    if (this._shouldWarningBeShown(exportables)) {
      if (!this._warningSection) {
        this._warningSection = this._buildWarningSection();
        this._settingsContainer.appendChild(this._warningSection);
      }
      show(this._warningSection);
    } else if (this._warningSection) hide(this._warningSection);
  }

  _buildWarningSection(): HTMLElement {
    const section = make("div", "warning-section");
    const control = make("span", "control");
    const label = make("label", "label");
    const icon = make("span", "icon");
    icon.classList.add("gravit-icon-export-warning");
    label.appendChild(icon);
    const title = make("span", "title");
    title.textContent = text("GExportDialog", "text.warning");
    label.appendChild(title);
    const description = make("div", "description");
    description.textContent = text("GExportDialog", "text.canvas-bigger-than-200-in");
    label.appendChild(description);
    control.appendChild(label);
    section.appendChild(control);
    return section;
  }

  _getStorageDestinations(): StorageDestination[] {
    const format = this._getFormat();
    if (format) {
      const destinations = container().getStorageDestinations() as StorageDestination[] | null;
      if (destinations) return destinations.filter((d) => d.isSupported(format));
    }
    return [];
  }

  _getSelectedStorageDestination(): StorageDestination | undefined {
    const select = this._settingsContainer.querySelector<HTMLSelectElement>(
      "[data-setting=storage-destination] > .control > select",
    );
    const id = parseInt(select ? select.value : "");
    return this._getStorageDestinations().find((d) => d.id === id);
  }

  _isStorageDestinationSettingAvailable(): boolean {
    return !(this._getStorageDestinations().length < 2);
  }

  _updateStorageDestinationSetting(): void {
    const available = this._isStorageDestinationSettingAvailable();
    const destinations = available ? this._getStorageDestinations() : [];
    const row = this._settingsContainer.querySelector<HTMLElement>(
      "[data-setting=storage-destination]",
    );
    if (!row) return;
    setDisplay(row, available);
    for (const select of row.querySelectorAll("select")) {
      select.replaceChildren();
      for (const destination of destinations) {
        const option = make("option");
        option.setAttribute("value", String(destination.id));
        option.textContent = destination.label;
        select.appendChild(option);
      }
    }
  }

  _getFormat(): string | null {
    if (this._hasFormat()) {
      if ("assets" === this._activeMode) return ZIP_EXT;
      if (
        this._previewContainer.querySelectorAll(".item .preview-check input:checked").length > 1
      ) {
        if (!(this._settings.format === PDF_EXT)) return ZIP_EXT;
      }
      return this._settings.format;
    }
    return null;
  }

  _setActiveMode(mode: Mode, noPreview?: boolean): void {
    if (mode === this._activeMode) return;
    this._activeMode = mode;
    for (const label of this._modeContainer.querySelectorAll(":scope > label")) {
      label.classList.toggle("g-active", label.getAttribute("data-mode") === mode);
    }
    if ("selection" === mode && "page-background" === this._settings.background)
      this._settings.background = "custom-background";
    this._updateSettings();
    if (!noPreview) this._updatePreview();
    this._updateSizeMenu();
  }

  _hasBackgroundColor(): boolean {
    return (
      "canvas" === this._activeMode ||
      ("selection" === this._activeMode && this._settings.format in { png: 1, jpg: 1, pdf: 1 })
    );
  }

  _hasSize(): boolean {
    return this._hasFormat() && this._settings.format in { png: 1, jpg: 1, pdf: 1 };
  }

  _hasJpegQuality(): boolean {
    return this._hasFormat() && this._settings.format in { jpg: 1, pdf: 1 };
  }

  _hasFormat(): boolean {
    return "canvas" === this._activeMode || "selection" === this._activeMode;
  }

  _updateBackground(): void {
    const settings = this._settings;
    settings.configuration.sceneBackground = true;
    if (!this._hasBackgroundColor()) {
      settings.backgroundColor = null;
      settings.backgroundOpacity = 0;
      return;
    }
    if ("custom-background" !== settings.background) {
      settings.configuration.sceneBackground = "page-background" == settings.background;
      settings.backgroundColor = "jpg" === settings.format ? RGBColor.WHITE : null;
      settings.backgroundOpacity = 1;
      return;
    }
    settings.configuration.sceneBackground = false;
    const element = this._settingsContainer.querySelector(
      "[data-setting=background-color] .export-background-pattern-chooser",
    );
    const chooser = chooserOf(element);
    const page = this._document ? (this._document.getScene() as Scene).getActivePage() : null;
    if (chooser && chooser.value()) {
      settings.backgroundColor = chooser.value() as PaintStyle;
      settings.backgroundOpacity = chooser.opacity();
      if (!(settings.backgroundColor instanceof Color)) {
        settings.backgroundColor = RGBColor.WHITE;
        settings.backgroundOpacity = 1;
        chooser.value(settings.backgroundColor);
        chooser.opacity(settings.backgroundOpacity);
      }
    } else {
      settings.backgroundColor = page ? (page.getProperty("bck") as PaintStyle) : null;
      settings.backgroundOpacity = page ? (page.getProperty("bop") as number) : 1;
      if (settings.backgroundColor && settings.backgroundColor instanceof Color) {
        if (null == settings.backgroundOpacity) settings.backgroundOpacity = 1;
      } else {
        settings.backgroundOpacity = 1;
        settings.backgroundColor = RGBColor.WHITE;
      }
      if (chooser) {
        chooser.value(settings.backgroundColor);
        chooser.opacity(settings.backgroundOpacity);
      }
    }
    if ("jpg" === settings.format) {
      const white = (RGBColor.WHITE.getValue() as number[]).slice();
      const color = ((settings.backgroundColor as Color).getValue() as number[]).slice();
      white[3] = 1;
      color[3] = settings.backgroundOpacity;
      const mixed = RGBColor.mix(white, color) as number[];
      settings.backgroundColor = new RGBColor(mixed);
      settings.backgroundOpacity = 1;
    }
  }

  _updateSettings(): void {
    this._updateBackground();
    const settings = this._settings;
    const row = (name: string): HTMLElement | null =>
      this._settingsContainer.querySelector<HTMLElement>("[data-setting=" + name + "]");
    const setChecked = (name: string, checked: boolean): void => {
      const element = row(name);
      if (element) for (const input of element.querySelectorAll("input")) input.checked = checked;
    };
    const hasFormat = this._hasFormat();
    setDisplay(row("size"), this._hasSize());
    setDisplay(row("format"), hasFormat);
    setDisplay(row("jpeg-quality"), this._hasJpegQuality());
    setDisplay(row("background-color"), this._hasBackgroundColor());
    const chooser = row("background-color");
    if (chooser)
      setDisplay(
        chooser.querySelector(".export-background-pattern-chooser"),
        "custom-background" === settings.background,
      );
    setDisplay(row("color-space"), hasFormat && "pdf" === settings.format);
    for (const option of this._settingsContainer.querySelectorAll("[value=no-background]")) {
      setDisplay(option, !hasFormat || ("pdf" !== settings.format && "jpg" !== settings.format));
    }
    // There is no retina-display row; the old code looked for one anyway.
    setDisplay(
      row("retina-display"),
      !(!this._hasSize() || ("jpg" !== settings.format && "png" !== settings.format)),
    );
    setDisplay(row("ignore-effects"), hasFormat && "pdf" === settings.format);
    setChecked("ignore-effects", !settings.configuration.ignoreEffects);
    setDisplay(
      row("convert-text-to-path"),
      !(!hasFormat || ("svg" !== settings.format && "pdf" !== settings.format)),
    );
    setChecked("convert-text-to-path", settings.convertTextToPath);
    setDisplay(row("layer-as-id"), hasFormat && "svg" === settings.format);
    setChecked("layer-as-id", settings.layerNamesAsId);
    setDisplay(row("export-preserve-editing-capabilities"), hasFormat && "svg" === settings.format);
    setChecked("export-preserve-editing-capabilities", settings.preserveEditingCapabilities);
    setDisplay(row("decimal-places-precision"), hasFormat && "svg" === settings.format);
    const format = row("format");
    if (format) {
      for (const option of format.querySelectorAll("[value=" + settings.format + "]"))
        option.setAttribute("selected", "selected");
    }
    const colorSpace = row("color-space");
    if (settings.colorSpace && colorSpace) {
      for (const option of colorSpace.querySelectorAll("[value=" + settings.colorSpace + "]"))
        option.setAttribute("selected", "selected");
    }
    setDisplay(row("do-not-downsample-images"), hasFormat && "pdf" === settings.format);
    setChecked("do-not-downsample-images", !settings.downsampleImages);
    setChecked("export-all", !this._options || !this._options.element);
    // The old code looked these up in the whole page.
    for (const option of document.querySelectorAll(
      '.export-background-selector option[value="page-background"]',
    ))
      setDisplay(option, "selection" !== this._activeMode);
    for (const option of document.querySelectorAll<HTMLOptionElement>(
      '.export-background-selector option[value="' + settings.background + '"]',
    ))
      option.selected = true;
    this._updateStorageDestinationSetting();
  }

  _generateExportables(): Exportable[] {
    const document = this._document as Document;
    const settings = this._settings;
    if ("canvas" === this._activeMode || "selection" === this._activeMode) {
      const defaults: Partial<Exportable> = {
        size: settings.size,
        suffix: "",
        format: settings.format,
        jpegQuality: settings.jpegQuality,
        backgroundColor: settings.backgroundColor,
        backgroundOpacity: settings.backgroundOpacity,
        colorSpace: settings.colorSpace,
        configuration: settings.configuration,
        convertTextToPath: settings.convertTextToPath,
        decimalPlacesPrecision: settings.decimalPlacesPrecision,
        preserveEditingCapabilities: settings.preserveEditingCapabilities,
        layerNamesAsId: settings.layerNamesAsId,
        overrideBackground: "page-background" !== settings.background,
        downsampleImages: settings.downsampleImages,
      };
      if ("canvas" === this._activeMode) {
        return Exporter.generateExportables(
          document.getScene() as Scene,
          extend({ name: document.getTitle() }, defaults) as Partial<Exportable>,
          false,
        );
      }
      const selection = (document.getEditor() as Editor).getSelection();
      return selection && selection.length
        ? Exporter.generateExportables(selection as Node[], defaults, false)
        : [];
    }
    return Exporter.generateExportables(document.getScene() as Scene, null, true);
  }

  async _export(): Promise<void> {
    if (!this._options) rememberedSettings = this._settings;
    let exportables = this._generateExportables();
    let opacities: SavedOpacity[] = [];
    try {
      const checks = this._previewContainer.querySelectorAll<HTMLInputElement>(
        ".item .preview-check input",
      );
      if (checks.length) {
        const chosen: (Node | Node[] | undefined)[] = [];
        for (const check of checks) {
          if (check.checked) {
            const item = check.closest(".item");
            chosen.push(item ? itemElements.get(item) : undefined);
          }
        }
        const kept: Exportable[] = [];
        for (const exportable of exportables) {
          for (const element of chosen) {
            if (
              (element instanceof Page &&
                exportable.element instanceof Page &&
                element.getReferenceId() === exportable.element.getReferenceId()) ||
              element === exportable.element
            ) {
              kept.push(exportable);
              break;
            }
          }
        }
        exportables = kept;
      }
      const max = BitmapExport.getMaximumCanvasSize();
      if (
        exportables.some((exportable) => {
          if ("jpg" === exportable.format || "png" === exportable.format) {
            const area = BitmapExport.getBitmapPaintArea(
              exportable.element as unknown as BitmapExportNode,
              exportable.size as string,
              Length.DPI,
            );
            if (
              area.getWidth() > max.width ||
              area.getHeight() > max.height ||
              area.getWidth() * area.getHeight() > max.area
            )
              return true;
          }
          return false;
        })
      ) {
        const alert = SystemDialog.alert(
          text("GExportDialog", "text.default-limit")
            .replace("%width", String(max.width))
            .replace("%height", String(max.height))
            .replace("%area", max.area / 1024 / 1024 + "MP"),
        );
        css(alert.getContent(), "width", "500px");
        return;
      }
      if (
        exportables.some(
          (exportable) =>
            "pdf" === exportable.format &&
            !exporters.PDFExport.isSupported(
              exportable.element,
              !exportable.configuration || !exportable.configuration.ignoreEffects,
              exportable.size as string,
            ),
        )
      ) {
        const alert = SystemDialog.alert(
          text("GExportDialog", "text.pdf-limit").replace(
            "%limit",
            Math.round(Platform.maxPngDataSize / 1024 / 1024) + "MB",
          ),
        );
        css(alert.getContent(), "width", "500px");
        return;
      }
      opacities = this._persistOpacities(exportables);
      if (exportables.length) {
        const destination = this._getSelectedStorageDestination();
        if (destination && !(await this._checkWriteAccess(destination))) return;
        const overlay = make("div", "export-overlay");
        overlay.textContent = text("GExportDialog", "text.exporting") + "...";
        this._content.appendChild(overlay);
        const message = make("div", "message");
        message.appendChild(make("span"));
        const messenger: ExportMessenger = {
          abort: undefined,
          message: (value: string) => {
            const span = message.querySelector("span");
            if (span) span.textContent = value;
          },
          close: () => overlay.remove(),
          error: () =>
            (messenger.message as (value: string) => void)(
              text("GCommonNames", "text.pdf-export-error"),
            ),
        };
        const saveOptions = { storageDestination: destination };
        const onWriteError = (error: unknown): void => {
          if (error) SystemDialog.error(error, { closeCallback: () => this.close() });
        };
        if (exportables.length && "pdf" === (exportables[0] as Exportable).format) {
          const cancel = make("button");
          cancel.textContent = text("GCommonNames", "text.cancel");
          cancel.addEventListener("click", () => {
            if (messenger.abort) messenger.abort();
            (messenger.close as () => void)();
          });
          overlay.appendChild(cancel);
          overlay.appendChild(message);
        }
        const document = this._document as Document;
        const exported = exportables;
        Exporter.export(
          exportables,
          (document.getStorage() || designer().getDefaultStorage()) as unknown as ExportStorage,
          document.getTitle(),
          () => {
            this.close();
            if (!designer().getSetting("disable_warning_unsupported_features", false)) {
              let features: unknown[] = [];
              for (const exportable of exported) {
                if ("svg" === exportable.format)
                  features = features.concat(
                    exporters.SVGExport.getUnsupportedFeatures(exportable.element),
                  );
              }
              if (features.length) {
                const Unsupported = lateExport<new (entries: unknown[]) => { open(): void }>(
                  "color/pattern-type-menu.ts",
                  "UnsupportedFeaturesDialog",
                );
                if (Unsupported) new Unsupported(features).open();
              }
            }
          },
          () => this.close(),
          "assets" === this._activeMode,
          (value: number) => {
            let progress = overlay.querySelector("progress");
            if (!progress) {
              const paragraph = make("p");
              progress = make("progress");
              progress.setAttribute("min", "0");
              progress.setAttribute("max", "100");
              css(progress, "width", "200px");
              paragraph.appendChild(progress);
              overlay.appendChild(paragraph);
            }
            progress.value = value;
          },
          messenger,
          onWriteError,
          saveOptions,
        );
      }
    } finally {
      this._restoreOpacities(exportables, opacities);
    }
  }

  async _checkWriteAccess(destination: StorageDestination): Promise<boolean> {
    const document = this._document as Document;
    const storage = (document.getStorage() ||
      designer().getDefaultStorage()) as unknown as WriteAccessStorage;
    const permission = await storage.getWritePermission(destination);
    const authorized = permission.isAuthorized();
    if (!authorized && permission.hasStatusText())
      SystemDialog.error(permission.getStatusText(), { showTitle: false });
    return authorized;
  }

  _formatCaption(caption: string): string {
    return "pdf" === this._settings.format ? caption.replace(/[^0-9.]/g, "") + "dpi" : caption;
  }

  _updateSizeMenu(): void {
    this._sizeMenu.clearItems();
    let size = "1x";
    if ("pdf" === this._settings.format) {
      const dpi =
        this._document &&
        this._document.getScene() &&
        (this._document.getScene() as Scene).getProperty("dpi");
      size = isNaN(dpi as number) ? "72dpi" : dpi + "dpi";
      this._sizeMenu.createAddItem(text("GCommonNames", "text.default") + " (72dpi)");
      this._sizeMenu.createAddItem(text("GCommonNames", "text.web") + " (96dpi)");
      this._sizeMenu.createAddItem(text("GExportDialog", "text.medium-quality") + " (150dpi)");
      this._sizeMenu.createAddItem(text("GExportDialog", "text.high-quality") + " (300dpi)");
    } else {
      for (const caption of ["1x", "2x", "0.5x", "3x", "512w", "512h", "128x128", "300dpi"])
        this._sizeMenu.createAddItem(caption);
    }
    for (let i = 0; i < this._sizeMenu.getItemCount(); i++) {
      const item = this._sizeMenu.getItem(i) as MenuItem;
      if (-1 !== String(item.getCaption()).indexOf(this._settings.size)) return;
    }
    this._settings.size = size;
    for (const input of this._settingsContainer.querySelectorAll<HTMLInputElement>(
      ".g-input-select > input",
    ))
      input.value = this._settings.size;
  }

  _updatePreview(): void {
    this._previewContainer.replaceChildren();
    const exportables = this._generateExportables();
    let opacities: SavedOpacity[] = [];
    try {
      opacities = this._persistOpacities(exportables);
      setDisplay(
        this._settingsContainer.querySelector("[data-setting=export-all]"),
        "canvas" !== this._activeMode || exportables.length > 1,
      );
      if (exportables.length) {
        const loader = make("div", "loader");
        const loaderText = make("span", "text");
        loaderText.textContent = text("GExportDialog", "text.preparing-preview") + "...";
        loader.appendChild(loaderText);
        this._previewContainer.appendChild(loader);
        const items: PreviewItem[] = [];
        for (const exportable of exportables) {
          let item: PreviewItem | null = null;
          for (const candidate of items) {
            if (candidate.element === exportable.element) {
              item = candidate;
              break;
            }
          }
          if (!item) {
            item = {
              element: exportable.element,
              name: exportable.name,
              format: exportable.format,
              size: exportable.size,
              jpegQuality: exportable.jpegQuality,
              backgroundColor: exportable.backgroundColor,
              backgroundOpacity: exportable.backgroundOpacity,
              sizes: "",
              formats: "",
              configuration: exportable.configuration,
            };
            items.push(item);
          }
          if ("" !== item.formats) item.formats += ", ";
          item.formats += exportable.format;
          if (exportable.size) {
            if ("" !== item.sizes) item.sizes += ", ";
            item.sizes += exportable.size;
          }
        }
        let list: HTMLElement | null = null;
        if (items.length > 1 || "assets" === this._activeMode) {
          list = make("div", "list content");
          this._previewContainer.appendChild(list);
        }
        for (const item of items) {
          let type: string = Bitmap.ImageType.PNG;
          let quality: number | null = null;
          if ("jpg" === item.format) {
            type = Bitmap.ImageType.JPEG;
            quality = (item.jpegQuality || 100) / 100;
          }
          let bitmap: Bitmap;
          let url: string;
          const element = item.element as SceneElement;
          if (list) {
            const thumb = new Length(50, Length.Unit.PX);
            bitmap = element.toBitmap(
              thumb,
              thumb,
              2,
              item.backgroundColor,
              item.configuration as Record<string, unknown> | null,
              null,
              item.backgroundOpacity,
            ) as Bitmap;
            url = bitmap.toImageDataUrl(type, quality);
          } else {
            let backgroundColor: PaintStyle | null | undefined = null;
            if (this._hasBackgroundColor()) backgroundColor = item.backgroundColor;
            const area = element._getBitmapPaintArea();
            const dpi = [0];
            const scale = BitmapExport.convertSizeToScale(
              area.getWidth(),
              area.getHeight(),
              item.size as string,
              null,
              dpi,
            );
            const width = area.getWidth() * ((dpi[0] as number) / Length.DPI) * scale.getX();
            const height = area.getHeight() * ((dpi[0] as number) / Length.DPI) * scale.getY();
            let size = item.size;
            if (width > 1920 || height > 1080)
              size = Math.min(1920 / area.getWidth(), 1080 / area.getHeight()) + "x";
            bitmap = BitmapExport.export(
              element as unknown as BitmapExportNode,
              size,
              backgroundColor,
              item.configuration as Record<string, unknown> | null,
              null,
              item.backgroundOpacity,
              true,
            ) as Bitmap;
            url = bitmap.toImageDataUrl(type, quality);
          }
          const image = make("img");
          image.setAttribute("src", url);
          const preview = make("div", "preview-image");
          css(preview, "background", Pattern.asCSSBackground(null, 0));
          preview.appendChild(image);
          if (list) {
            let meta = "";
            if ("assets" === this._activeMode) {
              if (item.sizes) meta = item.sizes + " - ";
              meta += item.formats;
            }
            const entry = make("div", "item");
            itemElements.set(entry, item.element);
            entry.appendChild(preview);
            const check = make("div", "preview-check");
            const input = make("input");
            input.checked =
              !this._options || !this._options.element || this._options.element == item.element;
            input.addEventListener("change", () => {
              this._updateStorageDestinationSetting();
            });
            input.setAttribute("type", "checkbox");
            check.appendChild(input);
            entry.appendChild(check);
            const name = make("div", "preview-name");
            name.textContent = item.name ?? "";
            entry.appendChild(name);
            const metaElement = make("div", "preview-meta");
            metaElement.textContent = meta;
            entry.appendChild(metaElement);
            list.appendChild(entry);
          } else {
            preview.classList.add("content");
            this._previewContainer.appendChild(preview);
          }
        }
        loader.remove();
      } else {
        let key: string | null = null;
        if ("selection" === this._activeMode) key = "text.selection-warning";
        else if ("assets" === this._activeMode) key = "text.assets-warning";
        if (key) {
          const empty = make("div", "empty");
          empty.textContent = text("GExportDialog", key);
          this._previewContainer.appendChild(empty);
        }
      }
    } finally {
      this._restoreOpacities(exportables, opacities);
    }
    this._updateStorageDestinationSetting();
    this._updateWarningSection(exportables);
  }

  /**
   * Canvas-mode bitmaps with another background than the page's: the
   * pages' own background opacity is set to 0 while exporting.
   */
  _persistOpacities(exportables: Exportable[]): SavedOpacity[] {
    const saved: SavedOpacity[] = [];
    if (
      "canvas" === this._activeMode &&
      "svg" !== this._settings.format &&
      "pdf" !== this._settings.format
    ) {
      for (let index = 0; index < exportables.length; ++index) {
        const exportable = exportables[index] as Exportable;
        if (exportable.overrideBackground) {
          const element = exportable.element as Page;
          saved.push({ index, opacity: element.getProperty("bop") });
          element.setProperty("bop", 0);
        }
      }
    }
    return saved;
  }

  _restoreOpacities(exportables: Exportable[], saved: SavedOpacity[]): void {
    if (saved.length > 0) {
      for (let index = 0; index < exportables.length; ++index) {
        const exportable = exportables[index] as Exportable;
        for (const entry of saved) {
          if (index === entry.index) {
            (exportable.element as Page).setProperty("bop", entry.opacity);
            break;
          }
        }
      }
    }
  }

  toString(): string {
    return "[Object GExportDialog]";
  }
}

interface SavedOpacity {
  index: number;
  opacity: unknown;
}

/** The slider of the JPEG quality (color/opacity-slider.ts, app-color-ui). */
interface SliderClass {
  new (
    element: HTMLElement,
    options: { min: number; max: number },
  ): {
    value(): string | number;
    value(value: unknown): unknown;
  };
}
