// Old: designer.browser.dev.js module 1339 (GPageProperties).
/**
 * The "Page" panel: background color and opacity, size (presets, width,
 * height, rotate, trim to content, clip content), bleed, margins and the
 * master page. Shown with the scene panel when nothing is selected.
 *
 * It also owns the page's "clip content" setting for every window, not
 * only while it is shown: on window activation, page activation and page
 * size changes it switches the active view between the Output paint mode
 * (content clipped to the page) and Full, and stores the choice in the
 * page's "cce" property (PageClip).
 *
 * The canvas, page size and bleed rows are built again on every update
 * (_updateUI), as before, desktop or touch (page-properties-touch.ts).
 *
 * Dropped with the licence and analytics: the Pro badge and the watchDog
 * traps of the master page select, the isPro flag of its tooltip; stats()
 * stays a no-op call.
 */
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { formatOpacity } from "../../engine/core/util.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { Length } from "../../engine/math/length.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { Block } from "../../engine/scene/block.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import {
  AfterFlagChangeEvent,
  AfterPropertiesChangeEvent,
} from "../../engine/scene/node-events.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Gradient } from "../../engine/style/gradient.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { ModifiedEvent } from "../../editor/editor.ts";
import { StyleEdManager, type StyleEditorEvent } from "../../editor/style-ed-manager.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { DocumentEvent } from "../document/document-event.ts";
import type { Document } from "../document/document.ts";
import { PageClip } from "../export/page-clip.ts";
import { config } from "../config.ts";
import { designer } from "../shell/globals.ts";
import type { SidebarTouchTool } from "../shell/layout.ts";
import { PaintModeEvent } from "../shell/paint-mode-event.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { WindowEvent } from "../shell/windows.ts";
import { Presets } from "../welcome/presets.ts";
import { InputBox } from "../widgets/input-box.ts";
import { initInputLabel } from "../widgets/input-label.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import {
  chooserOf,
  clickPreview,
  eventArgs,
  patternChooser,
  patternChooserPopup,
} from "./color-deps.ts";
import { getData, setData } from "./paint-dom.ts";
import { reInitTouchLayout } from "./page-properties-touch.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

const PaintMode = ScenePaintConfiguration.PaintMode;

/**
 * The active window's paint mode
 * (gDesigner.getWindows().getActiveWindow().getView().getViewConfiguration().paintMode).
 */
function activeViewMode(): string | undefined {
  const view = designer().getWindows().getActiveWindow()?.getView();
  return view ? view.getViewConfiguration().paintMode : undefined;
}

/** The designer's active document as the app's Document. */
function activeDocument(): Document | null {
  return designer().getActiveDocument() as unknown as Document | null;
}

/** The related data of a background change, handed back on undo and redo. */
interface RelatedData {
  evtType?: number;
  chooserOn?: boolean;
  pagePattern?: boolean;
  activeStopIdx?: number | null;
}

/** The page properties kept on slave pages in sync with their master. */
const SLAVE_PROPERTIES = ["mt", "mb", "ml", "mr", "bop", "bl", "bck"];

/** `$("<span>" + html + "</span>")`. */
function spanHtml(html: string): HTMLSpanElement {
  const span = el("span");
  span.innerHTML = html;
  return span;
}

/** jQuery's `.attr(name, bool)` for a boolean attribute: true sets it to its name, false removes it. */
function setBoolAttr(element: Element, name: string, value: boolean): void {
  if (value) element.setAttribute(name, name);
  else element.removeAttribute(name);
}

/** `$(panel).find(selector).attr("disabled", value)`. */
function disableAll(root: ParentNode, selector: string, value: boolean): void {
  for (const element of root.querySelectorAll(selector)) setBoolAttr(element, "disabled", value);
}

/** `$(element).insertAfter(target)` for every target (the element moves to the last one). */
function insertAfterEach(make: () => HTMLElement, targets: Iterable<Element>): void {
  for (const target of targets) {
    if (target.parentNode) target.parentNode.insertBefore(make(), target.nextSibling);
  }
}

export class PageProperties extends Properties {
  _panel: HTMLElement | null = null;
  _canvasPropertiesRowInTouch: HTMLElement | null = null;
  _canvasPropertiesRowInNormal: HTMLElement | null = null;
  _hrAfterCanvasRow: HTMLElement | null = null;
  _bleedRowInTouch: HTMLElement | null = null;
  _bleedRowInNormal: HTMLElement | null = null;
  _pageSizeRowInNormal: HTMLElement | null = null;
  _hrAfterPageSizeRow: HTMLElement | null = null;
  _hrAfterbleedRow: HTMLElement | null = null;
  _toolbar: HTMLElement | null = null;
  override _document: Document | null = null;
  _oldDocument: Document | null = null;
  _pages: Page[] | null = null;
  _styleEditorChange = false;
  _styleEdOn = false;
  _ownChange = false;
  _chooserElem: HTMLElement | null = null;
  _clipContentButton: HTMLButtonElement | null = null;
  _lastScene: Scene | null = null;
  /**
   * Sic: Presets.TYPE has no MERCH (the merch presets went with the Corel
   * marketplace), so this is [undefined]; see "Page presets excluded for
   * templates" in QUESTIONS.md.
   */
  _excludedPresets: unknown[] = [(Presets.TYPE as Record<string, string | undefined>)["MERCH"]];

  _createInput(property: string): HTMLElement {
    if ("bck" === property) return this._createBackground(property);
    if ("preset-size" === property) {
      const select = el("select");
      select.setAttribute("data-property", "preset-size");
      select.style.width = "100%";
      select.addEventListener("change", () => {
        const option = select.selectedOptions[0];
        const english = option ? option.getAttribute("data-preset-locale-en") : null;
        designer().stats(
          "pageproperties_preset_size",
          english || (option ? option.textContent : ""),
        );
        this._assignPresetSize(select.value);
      });
      return select;
    }
    if ("w" === property || "h" === property) {
      const label = Locale.get(
        new LocaleKey("GCommonNames", "property-" + property.toLowerCase()),
        property,
      ) as string;
      const holder = el("div");
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("pageproperties_change_size");
        const typed = (InputBox.of(input) as InputBox).value();
        const value = sceneOf(this._document as Document).stringToPoint(typed);
        const title = text("GPageProperties", "action.change-size");
        if ("" === typed || 0 === value) this._assignProperties(["w", "h"], [value, value], title);
        else if (null !== value && "number" == typeof value && value >= 0)
          this._assignProperty(property, value, title);
        else this._updateProperties();
      });
      new InputBox(input);
      holder.appendChild(input);
      initInputLabel(holder, { label, autoPadding: label.length > 1 });
      return holder;
    }
    if ("bl" === property) {
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("pageproperties_change_bleeding");
        const value = sceneOf(this._document as Document).stringToPoint(
          (InputBox.of(input) as InputBox).value(),
        );
        if (null !== value && "number" == typeof value && value >= 0)
          this._assignProperty(property, value, text("GPageProperties", "action.change-bleeding"));
        else this._updateProperties();
      });
      new InputBox(input);
      return input;
    }
    if ("mt" === property || "mb" === property || "ml" === property || "mr" === property) {
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("pageproperties_change_margins");
        const value = sceneOf(this._document as Document).stringToPoint(
          (InputBox.of(input) as InputBox).value(),
        );
        if (null !== value && "number" == typeof value && value >= 0) {
          const lock = (this._panel as HTMLElement).querySelector("[data-lock-margin]");
          if ("yes" === (lock ? lock.getAttribute("data-lock-margin") : null))
            this._assignProperties(
              ["mt", "mb", "ml", "mr"],
              [value, value, value, value],
              text("GPageProperties", "action.change-margins"),
            );
          else
            this._assignProperty(property, value, text("GPageProperties", "action.change-margin"));
        } else this._updateProperties();
      });
      new InputBox(input);
      return input;
    }
    if ("equal-margins" === property) {
      const button = el("span", "g-button g-flat valign-middle");
      button.appendChild(el("span", "gravit-icon-linked"));
      button.addEventListener("click", () => {
        designer().stats("pageproperties_lock_margin", button.getAttribute("data-lock-margin"));
        const icon = button.querySelector("span:first-child");
        if ("yes" === button.getAttribute("data-lock-margin")) {
          button.setAttribute("data-lock-margin", "no");
          if (icon) icon.setAttribute("class", "gravit-icon-unlinked");
        } else {
          button.setAttribute("data-lock-margin", "yes");
          if (icon) icon.setAttribute("class", "gravit-icon-linked");
        }
      });
      button.setAttribute("data-title", text("GPageProperties", "action.equal-margin"));
      button.setAttribute("data-lock-margin", "yes");
      return button;
    }
    if ("master-page" === property) {
      const select = el("select");
      select.setAttribute("data-property", "master-page");
      select.style.width = "100%";
      select.addEventListener("change", () => {
        designer().stats("pageproperties_change_masterpages");
        const option = select.querySelector('option[value="' + select.value + '"]');
        this._assignMasterPage(getData<Page>(option, "page"));
      });
      return select;
    }
    if ("bop" === property) {
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("pageproperties_change_canvas-opacity");
        this._assignProperty(
          property,
          (Length.parseEquationValue((InputBox.of(input) as InputBox).value()) as number) / 100,
          text("GPageProperties", "action.change-canvas-opacity"),
        );
      });
      new InputBox(input, {
        minValue: 0,
        maxValue: 100,
        incrementValue: designer().getOpacityIncrement(),
        postfix: "%",
      });
      return input;
    }
    if ("rotate-canvas" === property) {
      const button = el("button");
      button.setAttribute("data-property", property);
      button.setAttribute("data-title", text("GPageProperties", "text.rotate-canvas"));
      button.appendChild(el("span", "gravit-icon-flip-canvas"));
      button.addEventListener("click", () => {
        designer().stats("pageproperties_change_rotate");
        const page = (this._pages as Page[])[0];
        if (page && (page.getProperty("w") as number) > 0 && (page.getProperty("h") as number) > 0)
          this._assignProperties(
            ["w", "h"],
            [page.getProperty("h"), page.getProperty("w")],
            text("GPageProperties", "action.change-size"),
          );
      });
      return button;
    }
    if ("trim-canvas" === property) {
      const button = el("button");
      button.setAttribute("data-property", property);
      button.setAttribute("data-title", text("GPageProperties", "text.size-trim"));
      button.appendChild(el("span", "gravit-icon-trim-canvas"));
      button.addEventListener("click", () => {
        designer().stats("pageproperties_trim_page");
        // Sic: there is no "@trim" option, so the select shows nothing until the next update.
        for (const select of (this._panel as HTMLElement).querySelectorAll<HTMLSelectElement>(
          'select[data-property="preset-size"]',
        ))
          select.value = "@trim";
        this._assignPresetSize("@trim");
      });
      return button;
    }
    if ("clip-content" === property) {
      const button = el("button");
      this._clipContentButton = button;
      button.setAttribute("data-property", property);
      button.setAttribute("disabled", "disabled");
      button.classList.add("g-disabled");
      button.setAttribute("data-title", text("GPageProperties", "text.clip-content"));
      button.appendChild(el("span", "gravit-icon-clip-content"));
      button.addEventListener("click", () => {
        const window = designer().getWindows().getActiveWindow();
        if (!window) return;
        const mode = (window.getView() as EditorWidget).getViewConfiguration().paintMode;
        designer().stats("pageproperties_clip_content", mode !== PaintMode.Output);
        this._setClipContent(mode !== PaintMode.Output, false);
      });
      return button;
    }
    throw new Error("Unknown input property: " + property);
  }

  /** The click's inner function: the paint mode and the page's "cce" setting. */
  _setClipContent(clip: boolean, onlyWhenOff: boolean): void {
    if (onlyWhenOff && clip) return;
    let mode: string;
    if (clip) {
      mode = PaintMode.Output;
      this._updatePageSetting(PageClip.PAGE_CLIP_CONTENT_ENABLED);
    } else {
      mode = PaintMode.Full;
      this._updatePageSetting(PageClip.PAGE_CLIP_CONTENT_DISABLED);
    }
    this._setPaintMode(mode);
  }

  /** gDesigner.setPaintMode; its PaintModeEvent updates the clip button. */
  private _setPaintMode(mode: string): void {
    designer().setPaintMode(mode);
  }

  private _createBackground(property: string): HTMLElement {
    const field = el("div");
    field.setAttribute("data-property", property);
    patternChooser(field, { types: [Color, Gradient, TexturePattern] });
    field.addEventListener("chooseropen", () => {
      designer()
        .getWorkspace()
        .getStyleEdManager()
        .updateEditor(
          (this._pages as Page[])[0] as unknown as Parameters<StyleEdManager["updateEditor"]>[0],
          property,
          false,
        );
      this._styleEdOn = true;
      this._chooserElem = field;
      this.updatePropertiesAvailability(
        sceneOf(activeDocument() as Document).getActivePage() as Page,
      );
    });
    field.addEventListener("chooserclose", (event) => {
      const [preventClose, closeEvent] = eventArgs(event) as [() => void, unknown];
      const manager = designer().getWorkspace().getStyleEdManager();
      if (manager.getOverlayLock(closeEvent)) preventClose();
      else {
        if (this._document && this._document.hasCDR()) {
          const popup = patternChooserPopup();
          const pattern = popup ? popup.getPattern() : null;
          if (pattern && !(pattern instanceof RGBColor))
            void SystemDialog.showCDRUnsupportedObjectWarning();
        }
        this._styleEdOn = false;
        manager.deactivateEditor();
      }
      this._chooserElem = null;
    });
    field.addEventListener("patternchange", (event) => {
      const [pattern, opacity, temporary, fromChooser, stopIndex] = eventArgs(event) as [
        unknown,
        unknown,
        boolean | undefined,
        unknown,
        number | null | undefined,
      ];
      const names: string[] = [];
      const values: unknown[] = [];
      if (void 0 !== pattern) {
        names.push("bck");
        values.push(pattern);
      }
      if ("number" == typeof opacity) {
        names.push("bop");
        values.push(opacity);
      }
      if (!this._pages) return;
      if (temporary) {
        for (const page of this._pages) page.setProperties(names, values, false, false, temporary);
      } else {
        let related: RelatedData | null = null;
        if (fromChooser) {
          related = { chooserOn: true, pagePattern: true };
          if (null !== stopIndex) related.activeStopIdx = stopIndex;
        }
        this._assignProperties(
          names,
          values,
          text("GPageProperties", "action.change-background"),
          related,
        );
      }
    });
    return field;
  }

  _windowEvent(event: WindowEvent): void {
    const { type, window } = event;
    if (type !== WindowEvent.Type.Activated) {
      if (type === WindowEvent.Type.Removed && this._lastScene) {
        this._lastScene.removeEventListener(
          AfterPropertiesChangeEvent,
          this._propertiesUpdateEventHandler,
          this,
        );
        this._lastScene.removeEventListener(
          AfterFlagChangeEvent,
          this._pageActivationEventHandler,
          this,
        );
        this._lastScene = null;
      }
      return;
    }
    if ((window.getDocument() as unknown) !== designer().getActiveDocument()) return;
    const scene = sceneOf(activeDocument() as Document);
    // The last scene's listeners go first. The old code removed them after
    // adding the new ones, so with a second window of the same document
    // (the same scene) it removed the listeners just added (BUG-160).
    if (this._lastScene) {
      this._lastScene.removeEventListener(
        AfterPropertiesChangeEvent,
        this._propertiesUpdateEventHandler,
        this,
      );
      this._lastScene.removeEventListener(
        AfterFlagChangeEvent,
        this._pageActivationEventHandler,
        this,
      );
    }
    scene.addEventListener(AfterFlagChangeEvent, this._pageActivationEventHandler, this);
    scene.addEventListener(AfterPropertiesChangeEvent, this._propertiesUpdateEventHandler, this);
    this._lastScene = scene;
    this._pageActivationEventHandler({ node: scene.getActivePage(), flag: NodeFlag.Active });
  }

  _paintModeEvent(): void {
    this.updatePropertiesAvailability(
      sceneOf(activeDocument() as Document).getActivePage() as Page,
    );
  }

  /** On page activation (and deactivation): clip a fixed-size page as its "cce" says, never an infinite one. */
  _pageActivationEventHandler(event: { node: Node | null; flag: number | null }): void {
    const { node, flag } = event;
    if (!(node instanceof Page) || flag !== NodeFlag.Active) return;
    const mode = activeViewMode();
    const infinite = !node.isFixedSized();
    if (infinite && mode === PaintMode.Output) {
      this._setPaintMode(PaintMode.Full);
      this._updatePageSetting(PageClip.PAGE_CLIP_CONTENT_DISABLED);
    } else if (!infinite) {
      const setting =
        node.getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true) ||
        (config.PAGE_CLIP_DEFAULT
          ? PageClip.PAGE_CLIP_CONTENT_ENABLED
          : PageClip.PAGE_CLIP_CONTENT_DISABLED);
      this._setPaintMode(
        setting === PageClip.PAGE_CLIP_CONTENT_ENABLED ? PaintMode.Output : PaintMode.Full,
      );
    }
    this.updatePropertiesAvailability(node);
  }

  /** A page that became infinite stops clipping; otherwise the clip button follows the size. */
  _propertiesUpdateEventHandler(event: AfterPropertiesChangeEvent): void {
    const { node, temporary } = event;
    const properties = event.properties as string[];
    if (
      temporary ||
      !(node instanceof Page) ||
      !(properties.indexOf("w") >= 0 || properties.indexOf("h") >= 0)
    )
      return;
    const mode = activeViewMode();
    const infinite = !node.isFixedSized();
    if (infinite && mode === PaintMode.Output) {
      this._setPaintMode(PaintMode.Full);
      this._updatePageSetting(PageClip.PAGE_CLIP_CONTENT_DISABLED);
    } else this._manageClipButtonState(false, !infinite);
  }

  _updatePageSetting(value: number): void {
    const page = sceneOf(activeDocument() as Document).getActivePage() as Page;
    page.setProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, value, true);
  }

  _reInitLayout(): void {
    const before = (row: HTMLElement): HTMLElement => {
      const anchor = this._hrAfterbleedRow as HTMLElement;
      if (anchor.parentNode) anchor.parentNode.insertBefore(row, anchor);
      return row;
    };
    const canvas = el("div", "canvas-properties-normal");
    canvas.setAttribute("data-property-row", "canvas-size");
    propertyRow(canvas, {
      columns: [
        {
          width: "25%",
          content: this._createInput("bck"),
          label: text("GCommonNames", "text.color"),
        },
        {
          width: "25%",
          content: this._createInput("w"),
          label: text("GCommonNames", "text.width"),
        },
        {
          width: "25%",
          content: this._createInput("h"),
          label: text("GCommonNames", "text.height"),
        },
        {
          width: "25%",
          content: this._createInput("bop"),
          label: text("GCommonNames", "text.opacity"),
        },
      ],
    });
    this._canvasPropertiesRowInNormal = before(canvas);
    this._hrAfterCanvasRow = before(el("hr"));
    const size = el("div", "page-size-properties-normal");
    propertyRow(size, {
      columns: [
        { width: "25%", content: spanHtml(text("GPageProperties", "text.page-size")) },
        { width: "30%", content: this._createInput("preset-size") },
        { width: "15%", content: this._createInput("rotate-canvas") },
        { width: "15%", content: this._createInput("trim-canvas") },
        { width: "15%", content: this._createInput("clip-content") },
      ],
    });
    this._pageSizeRowInNormal = before(size);
    const hr = el("hr");
    hr.setAttribute("data-property-row", "fixed-size");
    this._hrAfterPageSizeRow = before(hr);
    const bleed = el("div", "bleed-properties-normal");
    bleed.setAttribute("data-property-row", "fixed-size");
    propertyRow(bleed, {
      columns: [
        { width: "25%", content: spanHtml(text("GPageProperties", "text.bleed")) },
        { width: "20%", content: this._createInput("bl") },
      ],
    });
    this._bleedRowInNormal = before(bleed);
  }

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._panel = panel;
    this._toolbar = toolbar;
    designer().getWindows().addEventListener(WindowEvent, this._windowEvent, this);
    this._listenToPaintMode();
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
    this.setTouchTools([
      new TouchTool({
        id: "document",
        icon: "gravit-icon-touch-document",
        // The old code passed [element, selector] pairs.
        panel: [this._panel, ".scene-properties-panel"],
        toolbar: [this._toolbar, ".scene-properties-toolbar"],
        panelWidth: "380px",
      }) as SidebarTouchTool,
    ]);
    toolbar.classList.add("filled");
    toolbar.classList.add("page-toolbar");
    toolbar.classList.add("page-properties-toolbar");
    panel.classList.add("page-properties-panel");
    const title = el("label");
    title.textContent = text("GPageProperties", "title").toUpperCase();
    toolbar.appendChild(title);
    const anchor = el("hr");
    anchor.setAttribute("data-property-row", "fixed-size");
    this._hrAfterbleedRow = anchor;
    panel.appendChild(anchor);
    const marginTip = RichTooltipConfig.from({
      title: text("GPageProperties", "text.margin-tooltip-title"),
      description: text("GPageProperties", "text.margin-tooltip-description"),
      learnMore: "",
    });
    const margin = (name: string): HTMLElement => {
      const input = this._createInput(name);
      attachRichTooltip(input, marginTip);
      return input;
    };
    const margins = el("div", "page-margin-properties");
    margins.setAttribute("data-property-row", "fixed-size");
    const marginTitle = spanHtml(text("GPageProperties", "text.margin"));
    marginTitle.classList.add("margin-title");
    propertyRow(margins, {
      columns: [
        { clazz: "margin-title-column", content: marginTitle },
        {
          clazz: "margin-input-column",
          labelClass: "margin-input-labels",
          label: text("GCommonNames", "text.left"),
          content: margin("ml"),
        },
        {
          clazz: "margin-input-column",
          labelClass: "margin-input-labels",
          label: text("GCommonNames", "text.top"),
          content: margin("mt"),
        },
        {
          clazz: "margin-input-column",
          labelClass: "margin-input-labels",
          label: text("GCommonNames", "text.right"),
          content: margin("mr"),
        },
        {
          clazz: "margin-input-column",
          labelClass: "margin-input-labels",
          label: text("GCommonNames", "text.bottom"),
          content: margin("mb"),
        },
        {
          clazz: "margin-btn-column",
          labelClass: "margin-input-labels",
          content: this._createInput("equal-margins"),
        },
      ],
    });
    panel.appendChild(margins);
    const hr = el("hr");
    hr.setAttribute("data-property-row", "fixed-size");
    panel.appendChild(hr);
    const masterHolder = el("div");
    masterHolder.appendChild(this._createInput("master-page"));
    attachRichTooltip(
      masterHolder,
      RichTooltipConfig.from({
        title: text("GPageProperties", "text.master-tooltip-title"),
        description: text("GPageProperties", "text.master-tooltip-description"),
        middle: false,
        isPro: false,
        learnMore: "",
      }),
    );
    const master = el("div", "master-property-row");
    master.setAttribute("data-property-row", "fixed-size");
    propertyRow(master, {
      columns: [
        {
          clazz: "master-property-title",
          content: spanHtml(text("GPageProperties", "text.master")),
        },
        { clazz: "master-property-selector", content: masterHolder },
      ],
    });
    panel.appendChild(master);
    const buttonTip = (property: string, key: string, extra: object): void => {
      const config = RichTooltipConfig.from({
        title: text("GPageProperties", "text." + key + "-tooltip-title"),
        description: text("GPageProperties", "text." + key + "-tooltip-description"),
        ...extra,
      });
      for (const field of panel.querySelectorAll('[data-property="' + property + '"]')) {
        const content = field.parentElement;
        if (content && content.classList.contains("content")) attachRichTooltip(content, config);
      }
    };
    // The rows these look in are built by _updateUI below, so nothing is
    // found; see "Page size button tooltips never attach" in QUESTIONS.md.
    buttonTip("rotate-canvas", "rotate-canvas", { learnMore: "" });
    buttonTip("trim-canvas", "trim-canvas", { learnMore: "" });
    buttonTip("clip-content", "clip-content", {});
    buttonTip("bl", "bleed", { middle: false, learnMore: "" });
    designer()
      .getWorkspace()
      .getStyleEdManager()
      .addEventListener(StyleEdManager.EditorEvent, this._styleEditorEventHandler, this);
    this._updateUI();
  }

  private _listenToPaintMode(): void {
    designer().addEventListener(PaintModeEvent, this._paintModeEvent, this);
  }

  _documentEvent(event: DocumentEvent): void {
    if (event.type !== DocumentEvent.Type.Removed) return;
    for (const select of (this._panel as HTMLElement).querySelectorAll(
      'select[data-property="master-page"]',
    ))
      select.replaceChildren(el("option"));
  }

  _assignPresetSize(value: string): void {
    if ("@infinite" === value) {
      this._assignProperties(
        ["w", "h"],
        [0, 0],
        text("GPageProperties", "action.change-size"),
        null,
        true,
      );
    } else if ("@trim" === value) {
      this._ownChange = true;
      const editor = editorOf(this._document as Document);
      editor.beginTransaction();
      try {
        for (const page of this._pages as Page[]) page.trimToContent();
      } finally {
        editor.commitTransaction(text("GPageProperties", "action.change-size"));
        this._ownChange = false;
      }
    } else {
      const scene = sceneOf(this._document as Document);
      const parts = value.split("x");
      const width = scene.stringToPoint(parts[0] as string);
      const height = scene.stringToPoint(parts[1] as string);
      const dpi = +(parts[2] as string);
      if (scene.getProperty("dpi") !== dpi) scene.setProperty("dpi", dpi);
      this._assignProperties(
        ["w", "h"],
        [width, height],
        text("GPageProperties", "action.change-size"),
      );
    }
  }

  _assignMasterPage(master: Page | undefined): void {
    const scene = sceneOf(this._document as Document);
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      if (master) {
        for (const page of this._pages as Page[]) {
          const masters = page.getMasterPages() as Page[];
          let linked = false;
          for (const current of masters) {
            if (master !== current) scene.unlink(current, page);
            else linked = true;
          }
          if (!linked) scene.link(master, page);
        }
        this._updateSlavePages(master);
      } else {
        for (const page of this._pages as Page[]) {
          for (const current of page.getMasterPages() as Page[]) scene.unlink(current, page);
        }
      }
    } finally {
      editor.commitTransaction(text("GPageProperties", "action.assign-master-page"));
    }
  }

  override update(
    document: Document | null,
    elements: InspectedElements | null,
    data?: unknown,
  ): boolean {
    this._updateUI();
    if (this._styleEditorChange) {
      this._styleEditorChange = false;
      return true;
    }
    if (this._ownChange) return true;
    if (this._chooserElem) chooserOf(this._chooserElem)?.close();
    const documentChanged = document !== this._oldDocument;
    this._oldDocument = document;
    if (this._document) {
      sceneOf(this._document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
        this,
      );
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._pages = null;
    if (document) {
      const pages = (elements as InspectedElements).filter(
        (element): element is Page => element instanceof Page,
      );
      if (pages.length) {
        this._pages = pages.slice();
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        if (documentChanged) this._updatePresetSizes();
        this._updateProperties((data as RelatedData | null) || null);
        return true;
      }
    }
    const active = activeDocument();
    const scene = active && sceneOf(active);
    if (designer().isTouchEnabled() && scene && scene.getActivePage()) {
      const view = designer().getActiveView();
      const configuration = view && view.getViewConfiguration();
      if (configuration && configuration.elementAnnotations) {
        const tool = designer().getToolManager().getActiveTool();
        if (!tool || tool instanceof SelectTool) return true;
      }
    }
    return false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    const properties = event.properties as string[];
    if (event.node === (this._pages as Page[])[0]) this._updateProperties();
    else if (
      !event.temporary &&
      event.node === sceneOf(this._document as Document) &&
      properties.indexOf("ut") >= 0
    ) {
      this._updatePresetSizes();
      this._updateProperties();
    }
    this._updateSlavePages(event.node, properties);
  }

  _updateUI(): void {
    this._removeOldHtmlElement();
    if (designer().isTouchEnabled()) reInitTouchLayout(this);
    else this._reInitLayout();
    if (this._document) {
      this._updatePresetSizes();
      this._updateProperties();
    } else if (this._oldDocument) this._updatePresetSizes();
  }

  _removeOldHtmlElement(): void {
    this._removeHtmlElem(this._canvasPropertiesRowInNormal);
    this._canvasPropertiesRowInNormal = null;
    this._removeHtmlElem(this._hrAfterCanvasRow);
    this._hrAfterCanvasRow = null;
    this._removeHtmlElem(this._bleedRowInNormal);
    this._bleedRowInNormal = null;
    this._removeHtmlElem(this._pageSizeRowInNormal);
    this._pageSizeRowInNormal = null;
    this._removeHtmlElem(this._hrAfterPageSizeRow);
    this._hrAfterPageSizeRow = null;
    this._removeHtmlElem(this._canvasPropertiesRowInTouch);
    this._canvasPropertiesRowInTouch = null;
    this._removeHtmlElem(this._bleedRowInTouch);
    this._bleedRowInTouch = null;
  }

  _removeHtmlElem(element: HTMLElement | null): void {
    if (element) element.remove();
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateProperties();
    else if ("touch" === event.key) this._updateUI();
  }

  /** Copies the master's margins, bleed and background to the pages that use it as master. */
  _updateSlavePages(node: Node | null, properties?: string[]): void {
    if (!(node instanceof Page)) return;
    const changed = properties || SLAVE_PROPERTIES;
    const names = SLAVE_PROPERTIES.filter((name) => changed.indexOf(name) >= 0);
    if (!names.length) return;
    for (const slave of node.getSlavePages()) {
      const values: unknown[] = [];
      names.forEach((name) => values.push(node.getProperty(name)));
      slave.setProperties(names, values);
    }
  }

  /** The preset select: Infinite Canvas, then every preset category with sizes in the scene's unit. */
  _updatePresetSizes(): void {
    const unit = sceneOf((this._document || this._oldDocument) as Document).getProperty("ut");
    const panel = this._panel as HTMLElement;
    const selects = [
      ...panel.querySelectorAll<HTMLSelectElement>('select[data-property="preset-size"]'),
    ];
    for (const select of selects) select.replaceChildren();
    const append = (child: () => HTMLElement): void => {
      for (const select of selects) select.appendChild(child());
    };
    append(() => {
      const custom = el("optgroup");
      custom.setAttribute("label", text("GPageProperties", "text.size-custom"));
      const infinite = el("option");
      infinite.setAttribute("value", "@infinite");
      infinite.textContent = text("GPageProperties", "text.size-infinite");
      custom.appendChild(infinite);
      return custom;
    });
    for (const preset of Presets.getPresets()) {
      const build = (): { group: HTMLOptGroupElement; any: boolean } => {
        const group = el("optgroup");
        group.setAttribute("label", preset.name);
        let any = false;
        for (const layout of preset.layouts as PresetLayoutLike[]) {
          if (layout.unit !== unit) continue;
          const sizes = layout.includes;
          if (sizes) {
            for (let i = 0; i < sizes.length; i++)
              group.appendChild(presetOption(preset.id, sizes[i] as PresetLayoutLike, layout.dpi));
          } else group.appendChild(presetOption(preset.id, layout, layout.dpi));
          any = true;
        }
        if ((preset as { hidden?: boolean }).hidden) group.style.setProperty("display", "none");
        return { group, any };
      };
      for (const select of selects) {
        const { group, any } = build();
        if (any) select.appendChild(group);
      }
    }
  }

  _styleEditorEventHandler(event: StyleEditorEvent): void {
    if (this._styleEdOn && event.type === StyleEdManager.EditorEventType.PrepareModifiedEvent)
      this._styleEditorChange = true;
  }

  _updateProperties(data?: RelatedData | null): void {
    const panel = this._panel as HTMLElement;
    const scene = sceneOf(this._document as Document);
    const pages = this._pages as Page[];
    const page = pages[0] as Page;
    const fixed = scene.isFixedSized();
    let name = text("GCommonNames", "text.page");
    if (designer().isTouchEnabled()) name = name.toUpperCase();
    let title = name + " (";
    if (pages.length > 1) title += pages.length + " " + text("GCommonNames", "text.pages");
    else title += (page.getProperty("name") as string) || text("GCommonNames", "text.active");
    title += ")";
    const label = (this._toolbar as HTMLElement).querySelector("label:first-child");
    if (label) label.textContent = title;
    const decimals = scene.getOptimalDecimalsCount();
    const point = (property: string): string =>
      scene.pointToString(page.getProperty(property) as number, decimals);
    for (const input of panel.querySelectorAll<HTMLInputElement>('input[data-property="bl"]'))
      input.value = point("bl");
    if (!page.getProperty("bck")) {
      page.setProperty("bck", RGBColor.WHITE);
      page.setProperty("bop", 0);
    }
    const background = page.getProperty("bck", false, false, true) as Color | null;
    for (const row of panel.querySelectorAll<HTMLElement>('[data-property-row="background"]'))
      row.style.setProperty("display", "");
    for (const field of panel.querySelectorAll<HTMLElement>('[data-property="bck"]')) {
      field.style.setProperty("display", background ? "" : "none");
      const chooser = chooserOf(field);
      if (chooser) {
        chooser
          .updateSettings(fixed ? { types: [Color, Gradient, TexturePattern] } : { types: [Color] })
          .setPattern(background)
          .value(background)
          .opacity(page.getProperty("bop", false, false, true) as number);
      }
    }
    for (const input of panel.querySelectorAll<HTMLInputElement>('input[data-property="bop"]')) {
      input.style.setProperty("display", background ? "" : "none");
      InputBox.of(input)?.value(formatOpacity(100 * (page.getProperty("bop") as number)));
    }
    const presetSelects = panel.querySelectorAll<HTMLSelectElement>(
      'select[data-property="preset-size"]',
    );
    if (fixed) {
      const value = point("w") + "x" + point("h") + "x" + scene.getProperty("dpi");
      for (const select of presetSelects)
        select.value = select.querySelector('option[value="' + value + '"]') ? value : "@custom";
    } else for (const select of presetSelects) select.value = "@infinite";
    for (const property of ["w", "h", "mt", "mb", "ml", "mr"]) {
      for (const input of panel.querySelectorAll<HTMLInputElement>(
        'input[data-property="' + property + '"]',
      ))
        InputBox.of(input)?.value(point(property));
    }
    const masterSelects = [
      ...panel.querySelectorAll<HTMLSelectElement>('select[data-property="master-page"]'),
    ];
    for (const select of masterSelects) select.replaceChildren(el("option"));
    let index = -1;
    let common: Page | null | undefined = null;
    pages.forEach((current) => {
      const masters = current.getMasterPages() as Page[];
      if (masters.length) {
        if (null === common) common = masters[0];
        else if (common !== masters[0]) common = void 0;
      }
    });
    scene.iteratePages((other: Page) => {
      if (pages.indexOf(other) < 0) {
        index++;
        for (const select of masterSelects) {
          const option = el("option");
          setData(option, "page", other);
          option.setAttribute("value", String(index));
          option.textContent = other.getProperty("name") as string;
          select.appendChild(option);
          if (common === other) option.selected = true;
        }
      }
    }, true);
    if (
      data &&
      (data.evtType === ModifiedEvent.Type.Undo || data.evtType === ModifiedEvent.Type.Redo) &&
      data.chooserOn &&
      data.pagePattern
    ) {
      for (const preview of panel.querySelectorAll('[data-property="bck"] .preview'))
        clickPreview(preview, null !== data.activeStopIdx ? (data.activeStopIdx ?? null) : null);
    }
    this.updatePropertiesAvailability(page);
  }

  /**
   * Enables the fields for `page`: everything off for a page locked
   * against size changes, the clip and rotate buttons only for a
   * fixed-size page. Disabled fields get a tooltip that says why.
   */
  updatePropertiesAvailability(page: Page): void {
    const panel = this._panel as HTMLElement;
    const lock = page.getProperty("plkt") as number | null;
    const fixed = page.isFixedSized();
    let fromTemplate: boolean | null;
    let excluded: boolean | undefined;
    if (lock && lock & Block.ProgramLck.NoSizeChanges) {
      disableAll(panel, '[data-property="bck"]', true);
      disableAll(panel, 'input[data-property="bop"]', true);
      disableAll(panel, 'input[data-property="w"]', true);
      disableAll(panel, 'input[data-property="h"]', true);
      disableAll(panel, 'button[data-property="rotate-canvas"]', true);
      disableAll(panel, 'select[data-property="preset-size"]', true);
      disableAll(panel, 'button[data-property="trim-canvas"]', true);
      this._manageClipButtonState(false, false);
      disableAll(panel, 'input[data-property="bl"]', true);
      disableAll(panel, 'input[data-property="mt"]', true);
      disableAll(panel, 'input[data-property="mb"]', true);
      disableAll(panel, 'input[data-property="ml"]', true);
      disableAll(panel, 'input[data-property="mr"]', true);
      disableAll(panel, "[data-lock-margin]", true);
      disableAll(panel, 'select[data-property="master-page"]', true);
    } else {
      fromTemplate = this._document && this._document.isDocumentFromTemplate();
      const background = page.getProperty("bck", false, false, true);
      const presets = panel.querySelector<HTMLSelectElement>('select[data-property="preset-size"]');
      const selected = presets
        ? presets.querySelector('option[value="' + presets.value + '"]')
        : null;
      // jQuery's .data("preset-id") read the data-preset-id attribute.
      const presetId = selected
        ? (selected.getAttribute("data-preset-id") ?? undefined)
        : undefined;
      excluded = !!fromTemplate && this._excludedPresets.includes(presetId);
      disableAll(panel, 'select[data-property="preset-size"]', excluded);
      disableAll(panel, '[data-property="bck"]', !background);
      disableAll(panel, 'input[data-property="bop"]', !background);
      disableAll(panel, 'input[data-property="w"]', false);
      disableAll(panel, 'input[data-property="h"]', false);
      disableAll(panel, 'button[data-property="rotate-canvas"]', !fixed);
      disableAll(panel, 'button[data-property="trim-canvas"]', false);
      const window = designer().getWindows().getActiveWindow();
      this._manageClipButtonState(
        !!(
          window &&
          window.getView() &&
          (window.getView() as EditorWidget).getViewConfiguration().paintMode === PaintMode.Output
        ),
        !!fixed,
      );
      disableAll(panel, 'input[data-property="bl"]', false);
      disableAll(panel, 'input[data-property="mt"]', false);
      disableAll(panel, 'input[data-property="mb"]', false);
      disableAll(panel, 'input[data-property="ml"]', false);
      disableAll(panel, 'input[data-property="mr"]', false);
      disableAll(panel, "[data-lock-margin]", false);
      let cdr = false;
      const scene = page.getScene() as Scene | null;
      if (scene && PageClip.CDR_ORIGIN_PROPERTY_NAME)
        cdr = !!scene.getProperty(PageClip.CDR_ORIGIN_PROPERTY_NAME, true);
      for (const select of panel.querySelectorAll('select[data-property="master-page"]')) {
        setBoolAttr(select, "disabled", cdr);
        select.setAttribute("i18n", "text.plkt-no-size-changes");
      }
    }
    const reason =
      lock && lock & Block.ProgramLck.NoSizeChanges
        ? "text.plkt-no-size-changes"
        : "text.infinite-canvas-no-size-changes";
    for (const element of panel.querySelectorAll("[data-title]:not([default-data-title])"))
      element.setAttribute("default-data-title", element.getAttribute("data-title") || "");
    for (const element of panel.querySelectorAll(":disabled")) {
      if (excluded) continue;
      element.setAttribute("default-data-title", element.getAttribute("default-data-title") || "");
      element.setAttribute(
        "data-title",
        text("GCommonNames", element.getAttribute("i18n") || reason).replace(
          "%name",
          element.getAttribute("default-data-title") || "",
        ),
      );
    }
    for (const element of panel.querySelectorAll(":not(:disabled)[default-data-title]")) {
      element.removeAttribute("data-title");
      const original = element.getAttribute("default-data-title") as string;
      if (original.length) element.setAttribute("data-title", original);
    }
    const wrapper = (source: Element | null): HTMLElement => {
      const div = el("div", "tooltip-wrapper");
      div.setAttribute(
        "data-title",
        text("GCommonNames", (source && source.getAttribute("i18n")) || reason),
      );
      return div;
    };
    for (const old of panel.querySelectorAll(".tooltip-wrapper")) old.remove();
    for (const select of panel.querySelectorAll("select:disabled")) {
      if (!excluded) insertAfterEach(() => wrapper(select), [select]);
    }
    insertAfterEach(() => wrapper(null), panel.querySelectorAll('[data-property="bck"][disabled]'));
  }

  /** The clip button: disabled for an infinite page, active while the view clips. */
  _manageClipButtonState(active: boolean, enabled: boolean): void {
    const button = this._clipContentButton;
    if (!button) return;
    if (enabled || button.classList.contains("g-disabled")) {
      if (enabled) {
        if (button.classList.contains("g-disabled")) {
          button.removeAttribute("disabled");
          button.classList.remove("g-disabled");
        }
        if (active) button.classList.add("g-active");
        else button.classList.remove("g-active");
      }
    } else {
      button.setAttribute("disabled", "disabled");
      button.classList.add("g-disabled");
      button.classList.remove("g-active");
    }
  }

  _assignProperty(property: string, value: unknown, name: string): void {
    this._assignProperties([property], [value], name);
  }

  /** Sets the properties on every page in one transaction; `resetBackground` gives non-color backgrounds white. */
  _assignProperties(
    properties: string[],
    values: unknown[],
    name: string,
    related?: RelatedData | null,
    resetBackground?: boolean,
  ): void {
    this._ownChange = true;
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      for (const page of this._pages as Page[]) {
        let names = properties;
        let list = values;
        if (resetBackground) {
          names = properties.slice();
          list = values.slice();
          if (!(page.getProperty("bck") instanceof Color)) {
            names.push("bck");
            list.push(RGBColor.WHITE);
            names.push("bop");
            list.push(1);
          }
        }
        page.setProperties(names, list);
      }
    } finally {
      editor.commitTransaction(name, related || null);
      this._ownChange = false;
    }
  }

  override toString(): string {
    return "[Object GPageProperties]";
  }
}

/** A preset size as _updatePresetSizes reads it (some old tables nested sizes in "includes"). */
interface PresetLayoutLike {
  name: string;
  unit: string;
  width: number;
  height: number;
  dpi?: number;
  localeClass: unknown;
  displaySize?: boolean;
  includes?: PresetLayoutLike[];
}

/** One option of the preset select: "<w>x<h>x<dpi>" with the preset's id. */
function presetOption(presetId: string, layout: PresetLayoutLike, dpi?: number): HTMLOptionElement {
  const option = el("option");
  option.setAttribute("data-preset-id", presetId);
  const english = Locale.get(layout.localeClass as LocaleKey, undefined, LocaleLanguage.English);
  // jQuery's attr(name, null) leaves the attribute out.
  if (english !== null && english !== undefined)
    option.setAttribute("data-preset-locale-en", String(english));
  option.setAttribute("value", layout.width + "x" + layout.height + "x" + (dpi || 72));
  option.textContent =
    "" + layout.name + (layout.displaySize ? " " + layout.width + "x" + layout.height : "");
  return option;
}
