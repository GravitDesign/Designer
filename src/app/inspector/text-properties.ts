// Old: designer.browser.dev.js module 1273 (GTextProperties).
/**
 * The text part of the appearance panel: color and font family, weight
 * and size, decoration, alignment, spacing, sizing, script and
 * autoscale, text on a path, and the advanced settings overlay
 * (typography, transform, list type, paragraph, language, stylistic
 * set). Shown when every inspected element is a text, or for the text
 * tool's default style.
 *
 * While a text's inline editor is open the fields read and write the
 * inline selection: every element goes through its element editor
 * (ElementEditor.getEditor(text) || text), and formatting that has no
 * property (underline, strikeout, ligatures, fractions, list markers)
 * goes to the selected range of the text's GTL core instead of the whole
 * document range.
 *
 * Plain DOM like the old jQuery code (the sidebar hands the panel its
 * element and moves elements around afterwards, see properties.ts); the
 * fields use the widget classes (InputBox, UnitBox), the color field and
 * the font button of the color and font clusters.
 *
 * Dropped: the Pro badges (gPro) and the analytics calls (stats), and
 * with them the editor hotkey listener, which only counted shortcuts.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { getTypeId } from "../../engine/core/object.ts";
import { formatNumber, parseNumber, unique } from "../../engine/core/util.ts";
import { Color } from "../../engine/color/color.ts";
import { Length } from "../../engine/math/length.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Style } from "../../engine/style/style.ts";
import {
  ParagraphAlignment,
  PropertySetInfo,
  TextTransformation,
  TypographyScript,
} from "../../engine/style/stylable-sets.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { Formatting, type Run } from "../../engine/text/gtl/formatting.ts";
import type { TLRange } from "../../engine/text/gtl/range.ts";
import { Text } from "../../engine/text/text.ts";
import { TLDirectionTextTransformer } from "../../engine/text/tl-direction-text-transformer.ts";
import { TLPathTextTransformer } from "../../engine/text/tl-path-text-transformer.ts";
import { Editor, InlineEditorEvent, ModifiedEvent } from "../../editor/editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { TextEditor } from "../../editor/element-editors/text-editor.ts";
import { PatternChooserWidget } from "../color/color-chooser.ts";
import { onPatternEvent } from "../color/pattern-target.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import type { Document } from "../document/document.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { FontsButton } from "../fonts/fonts-button.ts";
import type { FontsPanel } from "../fonts/fonts-panel.ts";
import { NotoFontsProvider } from "../fonts/noto-fonts-provider.ts";
import { container, designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { toCapitalize, watchDog } from "../util/designer-util.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { InputBox } from "../widgets/input-box.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { UnitBox } from "../widgets/unit-box.ts";
import { baseConfig } from "../file-formats.ts";
import {
  el,
  insertAfter,
  Properties,
  propertyRow,
  setDisplayed,
  text,
  type InspectedElements,
} from "./properties.ts";

/** Separates weight, style, family and subfamily in the weight select's values. */
const SEPARATOR = "#2635#";

/** The font sizes the size box lists. */
const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 18, 21, 24, 36, 48, 60, 72];

interface ListType {
  readonly label: string;
  value: string;
  types?: { icon: string; value: string }[];
}

/** The list markers of the list type overlay, grouped as the old LIST_TYPES. */
const LIST_TYPES: Record<"None" | "Bullet" | "Number", ListType> = {
  None: {
    get label() {
      return text("GTextProperties", "text.marker-none");
    },
    value: "none",
  },
  Bullet: {
    get label() {
      return text("GTextProperties", "text.marker-bulleted");
    },
    value: "bulleted",
    types: [
      { icon: "gravit-icon-bullets-1", value: Text.Markers.Bullet },
      { icon: "gravit-icon-bullets-2", value: Text.Markers.Check },
      { icon: "gravit-icon-bullets-3", value: Text.Markers.Square },
    ],
  },
  Number: {
    get label() {
      return text("GTextProperties", "text.marker-numbered");
    },
    value: "numbered",
    types: [
      { icon: "gravit-icon-numbers-1", value: Text.Markers.RomanDot },
      { icon: "gravit-icon-numbers-2", value: Text.Markers.RomanBracket },
      { icon: "gravit-icon-numbers-3", value: Text.Markers.Number },
    ],
  },
};

/** A text, or the text tool's default style (a GStyle whose _sdf is GText's). */
type TextTarget = Text | Style;

/** What the fields read and write: a target, or its element editor. */
type Inspected = TextTarget | TextEditor;

/** The reads every inspected object answers. */
interface PropertySource {
  getProperty(name: string): unknown;
  hasPathAttached?(): boolean;
}

/** The weights of a family and their style strings (style#family#subfamily). */
export interface WeightStyles {
  weight: number;
  styles: string[];
}

/** The font queries of the font list panel (the old gFontsPanel methods). */
type FontList = Pick<
  FontsPanel,
  "fontDisplayName" | "weightsForFont" | "stylesForWeight" | "subfamiliesForWeight"
>;

/** What the update gets when it comes from undo or redo of a color change. */
interface UpdateData {
  evtType?: number;
  chooserOn?: boolean;
  textPattern?: boolean;
}

function locale(key: LocaleKey | undefined): string {
  return key ? (Locale.get(key) ?? "") : "";
}

/** `$(el).attr(name, value)` for several attributes, in order. */
function attrs<T extends Element>(element: T, values: Record<string, string>): T {
  for (const name of Object.keys(values)) element.setAttribute(name, values[name] as string);
  return element;
}

/** `$("<button>").addClass(...).attr("data-property", p)`. */
function button(classes: string, property?: string): HTMLButtonElement {
  const element = el("button", classes);
  if (property !== undefined) element.setAttribute("data-property", property);
  return element;
}

function icon(classes: string): HTMLSpanElement {
  return el("span", classes);
}

function option(value: string, label: string): HTMLOptionElement {
  const element = el("option");
  element.setAttribute("value", value);
  element.textContent = label;
  return element;
}

/** `$(select).val(value)`; null selects nothing (jQuery set the value to ""). */
function setSelectValue(select: HTMLSelectElement, value: unknown): void {
  select.value = value === null || value === undefined ? "" : String(value);
}

/** `$(select).val()`: null when nothing is selected. */
function selectValue(select: HTMLSelectElement): string | null {
  return select.selectedIndex < 0 ? null : select.value;
}

/** `$(input).val(value)`: null and undefined empty the box. */
function setInputValue(input: HTMLInputElement, value: unknown): void {
  input.value = value === null || value === undefined ? "" : String(value);
}

/** jQuery's `.prop("disabled", value)`. */
function setDisabled(element: Element | null, value: boolean): void {
  if (element) (element as HTMLButtonElement).disabled = value;
}

/** jQuery's `.toggleClass(name, state)` on every element. */
function toggleAll(elements: Iterable<Element>, name: string, state: boolean): void {
  for (const element of elements) element.classList.toggle(name, state);
}

/** The global isNaN of the old reads (coerces, so null is a number). */
function looseIsNaN(value: unknown): boolean {
  return isNaN(value as number);
}

/** The view of the document's active window (focus goes back to the canvas). */
function focusView(document: Document | null): void {
  const window = document ? document.getActiveWindow() : null;
  const view = window ? (window.getView() as unknown as { focus(): unknown } | null) : null;
  if (view) view.focus();
}

function fontManager(): FontManager {
  return designer().getWorkspace().getFontManager() as FontManager;
}

export class TextProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _text: TextTarget[] = [];
  _ownChange = false;
  _chooserElem: HTMLElement | null = null;
  _openingInlineEditor = false;
  _weightsAvailable: number[] | null = [];
  /** The advanced settings overlay's content. */
  _advancedSettings: HTMLElement | null = null;
  /** The list type overlay's content. */
  _listTypeSettings: HTMLElement | null = null;
  _advancedSettingsButton: HTMLButtonElement | null = null;
  _scriptBlock: HTMLElement | null = null;
  _sizingBlock: HTMLElement | null = null;
  _autoScrollBlock: HTMLElement | null = null;

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    panel.classList.add("text-properties-panel");
    this._panel = panel;
    this._advancedSettings = this._getAdvancedSettingsOverlayDiv();
    this._listTypeSettings = this._createListTypeSettings();

    const advanced = this._advancedSettings;
    const typography = el("div", "typography");
    typography.appendChild(
      this._withTitle(
        this._createField("_ttsc-" + TypographyScript.Subscript),
        "g-group-start",
        text("GTextProperties", "text.typography-subscript"),
      ),
    );
    typography.appendChild(
      this._withTitle(
        this._createField("_ttsc-" + TypographyScript.Superscript),
        "g-group-end",
        text("GTextProperties", "text.typography-superscript"),
      ),
    );
    typography.appendChild(
      this._withTitle(
        this._createField("typography-ligatures"),
        null,
        text("GTextProperties", "text.typography-ligatures"),
      ),
    );
    typography.appendChild(
      this._withTitle(
        this._createField("typography-fractions"),
        null,
        text("GTextProperties", "text.typography-fractions"),
      ),
    );
    advanced.appendChild(
      propertyRow(el("div", "typography-properties"), {
        label: text("GTextProperties", "text.typography"),
        columns: [
          {
            width: "100%",
            label: text("GTextProperties", "text.typography"),
            content: typography,
          },
        ],
      }),
    );

    const transform = el("div");
    transform.appendChild(
      this._withTitle(
        this._createField("_ttrf-" + TextTransformation.Uppercase),
        "g-group-start",
        text("GTextProperties", "text.transform-uppercase"),
      ),
    );
    transform.appendChild(
      this._withTitle(
        this._createField("_ttrf-" + TextTransformation.Capitalize),
        "g-group-element",
        text("GTextProperties", "text.transform-capitalize"),
      ),
    );
    transform.appendChild(
      this._withTitle(
        this._createField("_ttrf-" + TextTransformation.Lowercase),
        "g-group-element",
        text("GTextProperties", "text.transform-lowercase"),
      ),
    );
    transform.appendChild(
      this._withTitle(
        this._createField("_ttrf-" + TextTransformation.SmallCaps),
        "g-group-end",
        text("GTextProperties", "text.transform-smallcaps"),
      ),
    );
    advanced.appendChild(
      propertyRow(el("div", "transform-properties"), {
        label: text("GTextProperties", "text.transform"),
        columns: [
          { width: "100%", label: text("GTextProperties", "text.transform"), content: transform },
        ],
      }),
    );

    if (baseConfig.LISTS_FEATURE) {
      advanced.appendChild(
        propertyRow(el("div", "list-type-properties"), {
          label: text("GTextProperties", "text.list-type"),
          columns: [
            {
              width: "100%",
              label: text("GTextProperties", "text.list-type"),
              content: this._createField("_pm"),
            },
          ],
        }),
      );
      advanced.appendChild(el("hr"));
    }
    advanced.appendChild(
      propertyRow(el("div", "paragraph-properties"), {
        label: text("GTextProperties", "text.paragraph"),
        columns: [
          {
            width: "50%",
            label: text("GTextProperties", "text.paragraph-indent"),
            content: this._createField("_pai"),
          },
          {
            width: "50%",
            label: text("GTextProperties", "text.paragraph-spacing"),
            content: this._createField("_pas"),
          },
        ],
      }),
    );
    advanced.appendChild(el("hr"));
    advanced.appendChild(
      propertyRow(el("div", "language-properties"), {
        label: text("GTextProperties", "text.language"),
        columns: [{ width: "100%", content: this._createField("_tlocl") }],
      }),
    );
    advanced.appendChild(el("hr"));
    advanced.appendChild(
      propertyRow(el("div", "stylistic-set-properties"), {
        label: text("GTextProperties", "text.stylisticset"),
        columns: [{ width: "100%", content: this._createField("_tstyls") }],
      }),
    );
    this._advancedSettingsButton = this._getAdvancedSettingsButton();
    toolbar.appendChild(this._advancedSettingsButton);

    const colorFont = el("div", "color-font");
    panel.appendChild(colorFont);
    colorFont.appendChild(
      propertyRow(el("div", "font-color-properties"), {
        columns: [
          { clazz: "color-picker-button", padding: false, content: this._createField("_fc") },
          { width: "auto", content: this._createField("_tff") },
        ],
      }),
    );
    // Old: $("<span>" + text + "</span>"), markup from the string table.
    const colorTitle = el("span");
    colorTitle.innerHTML = text("GTextProperties", "text.color");
    colorTitle.classList.add("color-title");
    colorFont.appendChild(
      propertyRow(el("div", "font-style-properties"), {
        columns: [
          { clazz: "color-title-label", content: colorTitle },
          {
            width: "auto",
            content: this._createField("style"),
            label: text("GTextProperties", "text.weight"),
          },
          {
            width: "25%",
            content: this._createField("_tfi"),
            label: text("GTextProperties", "text.size"),
          },
        ],
      }),
    );
    panel.appendChild(el("hr"));
    panel.appendChild(
      propertyRow(el("div", "decoration-properties"), {
        label: text("GTextProperties", "text.decoration"),
        columns: [
          { width: "25%", content: this._createField("decoration-bold") },
          { width: "25%", content: this._createField("decoration-italic") },
          { width: "25%", content: this._createField("decoration-underline") },
          { width: "25%", content: this._createField("decoration-strikeout") },
        ],
      }),
    );
    panel.appendChild(el("hr"));

    const alignment = el("div");
    alignment.appendChild(
      this._withTitle(
        this._createField("_pal-" + ParagraphAlignment.Left),
        "g-group-start",
        text("GAlignAction", "title.align-left"),
      ),
    );
    alignment.appendChild(
      this._withTitle(
        this._createField("_pal-" + ParagraphAlignment.Center),
        "g-group-element",
        text("GAlignAction", "title.align-center"),
      ),
    );
    alignment.appendChild(
      this._withTitle(
        this._createField("_pal-" + ParagraphAlignment.Right),
        "g-group-element",
        text("GAlignAction", "title.align-right"),
      ),
    );
    alignment.appendChild(
      this._withTitle(
        this._createField("_pal-" + ParagraphAlignment.Justify),
        "g-group-end",
        text("GTextProperties", "action.justify"),
      ),
    );
    panel.appendChild(
      propertyRow(el("div", "alignment-properties"), {
        label: text("GTextProperties", "text.alignment"),
        columns: [{ width: "100%", content: alignment }],
      }),
    );

    const vertical = el("div");
    vertical.appendChild(
      this._withTitle(
        this._createField("va-" + Text.VerticalAlign.Top),
        "g-group-start",
        text("GAlignAction", "title.align-top"),
      ),
    );
    vertical.appendChild(
      this._withTitle(
        this._createField("va-" + Text.VerticalAlign.Middle),
        "g-group-element",
        text("GAlignAction", "title.align-middle"),
      ),
    );
    vertical.appendChild(
      this._withTitle(
        this._createField("va-" + Text.VerticalAlign.Bottom),
        "g-group-end",
        text("GAlignAction", "title.align-bottom"),
      ),
    );
    panel.appendChild(
      propertyRow(el("div", "vertical-properties"), {
        label: text("GTextProperties", "text.vertical"),
        columns: [{ width: "auto", content: vertical }],
      }),
    );
    panel.appendChild(
      propertyRow(el("div", "spacing-properties"), {
        label: text("GTextProperties", "text.spacing"),
        columns: [
          {
            label: text("GTextProperties", "text.char"),
            width: "30%",
            content: this._createField("_tcs"),
          },
          {
            label: text("GTextProperties", "text.word"),
            width: "30%",
            content: this._createField("_tws"),
          },
          {
            label: text("GTextProperties", "text.line"),
            width: "40%",
            content: this._createField("_plh"),
          },
        ],
      }),
    );
    panel.appendChild(el("hr"));
    this._sizingBlock = propertyRow(el("div", "sizing-properties"), {
      label: text("GTextProperties", "text.sizing"),
      columns: [
        {
          width: "50%",
          content: this._createField("aw"),
          label: text("GCommonNames", "text.width"),
        },
        {
          width: "50%",
          content: this._createField("ah"),
          label: text("GCommonNames", "text.height"),
        },
      ],
    });
    panel.appendChild(this._sizingBlock);
    this._scriptBlock = propertyRow(el("div"), {
      label: text("GTextProperties", "text.script"),
      columns: [
        { width: "50%", content: this._createField("dir") },
        { width: "50%", content: this._createField("_tlsc") },
      ],
    });
    panel.appendChild(this._scriptBlock);
    const autoScale = el("div", "auto-scale-font");
    autoScale.setAttribute("major-item-only", "true");
    this._autoScrollBlock = propertyRow(autoScale, {
      columns: [{ width: "auto", content: this._createField("sc") }],
    });
    panel.appendChild(this._autoScrollBlock);
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GTextProperties", "text.on-path"),
        columns: [
          {
            width: "30%",
            content: this._createField("tpths"),
            label: text("GCommonNames", "text.outside"),
          },
          {
            width: "30%",
            content: this._createField("tpthd"),
            label: text("GTextProperties", "text.reverse"),
          },
          {
            width: "40%",
            content: this._createField("tptho"),
            label: text("GTextProperties", "text.distance"),
          },
        ],
      }),
    );
    for (const element of panel.querySelectorAll("button")) element.setAttribute("tabindex", "-1");
    this._reInitLayout();
    designer().addEventListener(SettingChangedEvent, this._touchChanged, this);
  }

  /** `.addClass(group).attr("data-title", title)` on a field. */
  private _withTitle<T extends HTMLElement>(field: T, group: string | null, title: string): T {
    if (group) field.classList.add(group);
    field.setAttribute("data-title", title);
    return field;
  }

  /** The list type overlay: one group per LIST_TYPES entry, with its marker options. */
  private _createListTypeSettings(): HTMLElement {
    const settings = el("div", "list-type-settings");
    const options = el("div", "list-type-options");
    settings.appendChild(options);
    for (const { label, value, types } of Object.values(LIST_TYPES)) {
      const group = el("div", "list-type-group");
      group.setAttribute("value", value);
      const header = el("div", "list-type-group-header");
      header.appendChild(icon("gravit-icon-check"));
      const caption = el("span");
      caption.textContent = label;
      header.appendChild(caption);
      group.appendChild(header);
      if (!types) group.addEventListener("click", () => this._assignMarker(null));
      const container = el("div", "list-type-group-container");
      if (types)
        for (const type of types) {
          const item = el("div", "list-type-option");
          item.setAttribute("value", type.value);
          item.appendChild(el("div", type.icon));
          item.addEventListener("click", (event) => {
            const marker = (event.target as Element)
              .closest(".list-type-option")
              ?.getAttribute("value");
            this._assignMarker(marker ?? null);
          });
          container.appendChild(item);
        }
      group.appendChild(container);
      options.appendChild(group);
    }
    new Overlay(settings, { releaseOnClose: false, clazz: "list-type-settings-overlay" });
    return settings;
  }

  /** The field of one property (the old local `n` of init). */
  private _createField(property: string): HTMLElement {
    if ("_pm" === property) {
      const select = el("div");
      select.setAttribute("data-property", property);
      select.classList.add("g-select");
      select.appendChild(el("span"));
      select.addEventListener(
        "click",
        watchDog.trap((event: MouseEvent) => {
          Overlay.of(this._listTypeSettings as HTMLElement)?.open(event.target as Element);
        }),
      );
      return select;
    }
    if (0 === property.indexOf("typography")) {
      const kind = property.substr("typography-".length);
      const element = button("g-button typography-button", property);
      element.addEventListener(
        "click",
        watchDog.trap(() => this._toggleFormatting(kind)),
      );
      element.appendChild(icon("gravit-icon-text-typography-".concat(kind)));
      return element;
    }
    if (0 === property.indexOf("_ttsc")) {
      const script = property.substr("_ttsc-".length);
      const element = button("g-button script-button", property);
      element.addEventListener(
        "click",
        watchDog.trap((event: MouseEvent) => {
          const target = (event.target as Element).closest("button");
          this._assignProperty(
            "_ttsc",
            target && target.classList.contains("g-active") ? null : script,
          );
        }),
      );
      element.appendChild(icon("gravit-icon-text-typography-".concat(script, "script")));
      return element;
    }
    if ("_tlsc" === property) {
      const select = el("select");
      select.setAttribute("data-property", "_tlsc");
      select.appendChild(option("auto", text("GTextProperties", "text.auto")));
      select.addEventListener("change", (event) => {
        this._assignProperty("_tlsc", (event.target as HTMLSelectElement).value);
      });
      return select;
    }
    if ("_tv" === property) {
      const select = el("select");
      select.setAttribute("data-property", "_tv");
      select.addEventListener(
        "change",
        watchDog.trap((event: Event) => {
          this._assignProperty("_tv", (event.target as HTMLSelectElement).value);
        }),
      );
      return select;
    }
    if (0 === property.indexOf("_ttrf-")) {
      let iconClass = "";
      const transformation = property.substr("_ttrf-".length);
      switch (transformation) {
        case TextTransformation.Uppercase:
          iconClass = "gravit-icon-text-transform-uppercase";
          break;
        case TextTransformation.Lowercase:
          iconClass = "gravit-icon-text-transform-lowercase";
          break;
        case TextTransformation.Capitalize:
          iconClass = "gravit-icon-text-transform-capitalize";
          break;
        case TextTransformation.SmallCaps:
          iconClass = "gravit-icon-text-transform-smallcaps";
      }
      const element = button("g-button transformation-button", property);
      element.addEventListener(
        "click",
        watchDog.trap((event: MouseEvent) => {
          const target = (event.target as Element).closest("button");
          this._assignProperty(
            "_ttrf",
            target && target.classList.contains("g-active") ? null : transformation,
          );
        }),
      );
      element.appendChild(icon(iconClass));
      return element;
    }
    if (0 === property.indexOf("va-")) {
      let iconClass = "";
      const align = property.substr("va-".length);
      switch (align) {
        case Text.VerticalAlign.Top:
          iconClass = "gravit-icon-text-align-top";
          break;
        case Text.VerticalAlign.Middle:
          iconClass = "gravit-icon-text-align-middle";
          break;
        case Text.VerticalAlign.Bottom:
          iconClass = "gravit-icon-text-align-bottom";
      }
      const element = button("g-button vertical-align", property);
      element.addEventListener("click", () => {
        this._assignProperty("va", element.classList.contains("g-active") ? null : align);
      });
      element.appendChild(icon(iconClass));
      return element;
    }
    if (0 === property.indexOf("_pal-")) {
      let iconClass = "";
      const align = property.substr("_pal-".length);
      switch (align) {
        case ParagraphAlignment.Left:
          iconClass = "gravit-icon-text-align-left";
          break;
        case ParagraphAlignment.Center:
          iconClass = "gravit-icon-text-align-center";
          break;
        case ParagraphAlignment.Right:
          iconClass = "gravit-icon-text-align-right";
          break;
        case ParagraphAlignment.Justify:
          iconClass = "gravit-icon-text-justify";
      }
      const element = button("g-button alignment-button", property);
      element.addEventListener("click", () => {
        this._assignProperty("_pal", element.classList.contains("g-active") ? null : align);
      });
      element.appendChild(icon(iconClass));
      return element;
    }
    if ("aw" === property || "ah" === property) {
      const sizing = el("div");
      sizing.setAttribute("data-property", property);
      const auto = el("button", "sizing-button-auto g-group-start g-button");
      auto.addEventListener("click", () => this._assignProperty(property, true));
      auto.textContent = text("GTextProperties", "text.auto");
      sizing.appendChild(auto);
      const fixed = el("button", "sizing-button-fixed g-group-end g-button");
      fixed.addEventListener("click", () => this._assignProperty(property, false));
      fixed.textContent = text("GTextProperties", "text.fix");
      sizing.appendChild(fixed);
      return sizing;
    }
    if ("_fc" === property) {
      // Old: .prop("disabled", true) on the div, an expando nothing reads.
      const chooser = el("div");
      attrs(chooser, { "data-property": "_fc", id: "text-color" });
      new PatternChooserWidget(chooser, { types: [Color], hasOpacity: false });
      onPatternEvent(chooser, "chooseropen", () => {
        this._document?.getEditor()?.hideSelection();
        this._chooserElem = chooser;
      });
      onPatternEvent(chooser, "chooserclose", () => {
        if (this._document) this._document.getEditor()?.resetHideSelection();
        this._chooserElem = null;
      });
      onPatternEvent(
        chooser,
        "patternchange",
        (_event, pattern, _opacity, temporary, fromChooser) => {
          // The old handler also read the current color into an unused local.
          let data: UpdateData | null = null;
          if (fromChooser) data = { chooserOn: true, textPattern: true };
          this._assignProperty("_fc", pattern, temporary, data);
        },
      );
      return chooser;
    }
    if ("_tff" === property) {
      const input = el("input", "g-select");
      attrs(input, { "data-property": property, type: "button" });
      FontsButton.attach(input, {
        closeCallback: () => {
          if (this._document) focusView(this._document);
        },
        assignFontCallback: (family) => {
          void this._assignFont(family);
        },
      });
      return input;
    }
    if ("_tfi" === property) {
      const holder = el("div");
      const input = el("input");
      attrs(input, { type: "text", "data-property": property });
      input.classList.add("g-select");
      input.classList.add("text-size");
      input.addEventListener("change", () => {
        const length = (UnitBox.of(input) as UnitBox).value();
        const value = length ? length.toUnit(Length.Unit.PT) : null;
        if (null === value || ("number" == typeof value && value >= 0))
          this._assignProperty(property, value);
        else void this._updateProperties();
      });
      new UnitBox(input, { source: "text" });
      holder.appendChild(input);
      return holder;
    }
    if ("_tws" === property || "_tcs" === property) {
      const input = el("input");
      attrs(input, { type: "text", "data-property": property });
      input.addEventListener("change", () => {
        const document = this._document;
        if (document) {
          const value = (document.getScene() as Scene).stringToPoint(input.value);
          if (null === value || "number" == typeof value) this._assignProperty(property, value);
          else void this._updateProperties();
        }
      });
      new InputBox(input);
      return input;
    }
    if ("style" === property) {
      const select = el("select");
      select.setAttribute("data-property", property);
      select.addEventListener("change", () => {
        const value = select.value || null;
        if (value) {
          const font = fontManager().getDefaultFont() as Font;
          const parts: (string | number)[] = value.split(SEPARATOR);
          parts[0] = parseInt(parts[0] as string) || 400;
          const values: unknown[] = [parts[0], parts[1]];
          const names = ["_tfw", "_tfs"];
          const family = parts[2] as string | undefined;
          if (family && family.length && family !== font.getFamily()) {
            names.push("_tff");
            values.push(family);
          }
          this._assignProperties(names, values);
        }
        focusView(this._document);
      });
      return select;
    }
    if (0 !== property.indexOf("tpth")) {
      if ("_plh" === property) return this._createLineHeightField(property);
      if ("fontSet" === property) {
        const input = el("input");
        attrs(input, { type: "checkbox", "data-property": property });
        input.addEventListener("change", () => {
          const checked = input.checked;
          designer().setSetting("font-set", checked);
          const provider = container().getSystemFontsProvider() as never;
          if (checked) FontsProviderManager.enableProviders([provider]);
          else FontsProviderManager.disableProviders([provider]);
        });
        return input;
      }
      if ("sc" === property) {
        const label = el("label");
        const input = el("input", "auto-scale-checkbox");
        attrs(input, { type: "checkbox", "data-property": property });
        input.addEventListener("change", (event) => {
          this._assignProperty("sc", (event.target as HTMLInputElement).checked);
        });
        label.appendChild(input);
        const caption = el("span");
        caption.textContent = text("GTextProperties", "text.scale-content");
        label.appendChild(caption);
        return label;
      }
      if (0 === property.indexOf("decoration-")) {
        const kind = property.substr("decoration-".length);
        const element = button("g-button decoration-buttons", property);
        element.setAttribute(
          "data-title",
          toCapitalize(text("GTextProperties", "text.decoration-".concat(kind))),
        );
        element.addEventListener("click", () => this._toggleFormatting(kind));
        element.appendChild(icon("gravit-icon-text-decoration-".concat(kind)));
        return element;
      }
      if ("_pas" === property) return this._createParagraphSpacingField(property);
      if ("_pai" === property) {
        const input = el("input");
        attrs(input, { type: "text", "data-property": property });
        input.addEventListener(
          "change",
          watchDog.trap((event: Event) => {
            const document = this._document;
            if (!document) return;
            const target = (event.target as Element).closest("input") as HTMLInputElement;
            const value = (document.getScene() as Scene).stringToPoint(target.value);
            if (null === value || ("number" == typeof value && value >= 0))
              this._assignProperty(property, value);
            else void this._updateProperties();
          }),
        );
        new InputBox(input, { minValue: 0, allowEmptyValue: false });
        return input;
      }
      if ("dir" === property) {
        const select = el("select");
        select.setAttribute("data-property", "dir");
        select.appendChild(
          option(
            String(TLDirectionTextTransformer.LTR),
            text("GTextProperties", "text.orientation-ltr"),
          ),
        );
        select.appendChild(
          option(
            String(TLDirectionTextTransformer.RTL),
            text("GTextProperties", "text.orientation-rtl"),
          ),
        );
        select.appendChild(
          option(
            String(TLDirectionTextTransformer.TTB),
            text("GTextProperties", "text.orientation-ttb"),
          ),
        );
        select.addEventListener("change", (event) => {
          this._assignProperty("dir", parseInt((event.target as HTMLSelectElement).value));
        });
        return select;
      }
      if ("_tlocl" === property) return this._createLanguageSelector();
      if ("_tstyls" === property) return this._createStylisticSetSelector();
      throw new Error("Unknown input property: " + property);
    }
    if ("tpthd" === property || "tpths" === property) {
      const label = el("label", "g-switch");
      const input = el("input");
      attrs(input, { type: "checkbox", "data-property": property });
      input.addEventListener("change", () => {
        if ("tpthd" === property)
          this._assignProperty(
            property,
            input.checked
              ? TLPathTextTransformer.DIRECTION_OUTWARDS
              : TLPathTextTransformer.DIRECTION_INWARDS,
          );
        else
          this._assignProperty(
            property,
            input.checked ? TLPathTextTransformer.OUTSIDE : TLPathTextTransformer.INSIDE,
          );
      });
      label.appendChild(input);
      label.appendChild(el("div"));
      return label;
    }
    if ("tptho" === property) {
      const input = el("input");
      attrs(input, { type: "text", "data-property": property });
      input.addEventListener("change", () => {
        const value = (this._document?.getScene() as Scene).stringToPoint(input.value);
        if (null === value || "number" == typeof value) this._assignProperty(property, value);
        else void this._updateProperties();
      });
      new InputBox(input);
      return input;
    }
    // The old code fell through and returned undefined for other "tpth" names.
    throw new Error("Unknown input property: " + property);
  }

  /** The line height box with its "%"/unit toggle. */
  private _createLineHeightField(property: string): HTMLElement {
    const holder = el("div", "text-line-height");
    const input = el("input");
    attrs(input, { type: "text", "data-property": property });
    input.classList.add("value");
    input.addEventListener("change", () => {
      const scene = (this._document as Document).getScene() as Scene;
      const unit = (
        (this._panel as HTMLElement).querySelector('button[data-property="_plh_unit"]') as Element
      ).textContent;
      let value: unknown = input.value;
      if ("%" !== unit) {
        const length = Length.parseEquation(value as string, scene.getProperty("ut") as string);
        if (length) value = length.toUnit(Length.Unit.PX);
      } else value = parseNumber(value as string);
      if (null === value || (value as number) > 0 || ("%" !== unit && 0 === value)) {
        if ("number" == typeof value) {
          if ("%" === unit) value = value / 100;
          else value = String(value);
        }
        this._assignProperty(property, value);
      } else void this._updateProperties();
    });
    new InputBox(input);
    holder.appendChild(input);
    const toggle = el("button", "g-flat");
    toggle.setAttribute("data-property", "_plh_unit");
    toggle.classList.add("text-unit");
    toggle.textContent = "%";
    toggle.addEventListener("click", () => {
      const current = toggle.textContent;
      const scene = (this._document as Document).getScene() as Scene;
      let value: unknown = (
        (this._panel as HTMLElement).querySelector(
          'input[data-property="_plh"]',
        ) as HTMLInputElement
      ).value;
      const editor = (this._document as Document).getEditor() as Editor;
      if ("%" !== current) {
        const length = Length.parseEquation(value as string, scene.getProperty("ut") as string);
        if (length) value = length.toUnit(Length.Unit.PX);
      } else value = parseNumber(value as string);
      // parseNumber gives NaN, never null, for a box that isn't a number, so
      // from "%" the line height becomes "NaN" (see "Line height unit switch
      // writes NaN for text in the box" in QUESTIONS.md).
      if (null !== value && "%" === current) {
        const unit = (scene.getProperty("ut") as string) || "px";
        toggle.textContent = unit;
        if ("number" == typeof value) {
          try {
            editor.beginTransaction();
            for (let i = 0; i < this._text.length; i++) {
              const target = this._inspected(this._text[i] as TextTarget);
              const size = (this._getProperty("_tfi", [target]) as number) || 20;
              const lineHeight = percentToLength(value, size);
              target.setProperties([property], [lineHeight]);
            }
          } finally {
            editor.commitTransaction(text("GTextProperties", "action.modify-text-properties"));
          }
        }
      } else if (null !== value) {
        toggle.textContent = "%";
        if ("number" == typeof value) {
          try {
            editor.beginTransaction();
            for (let i = 0; i < this._text.length; i++) {
              const target = this._inspected(this._text[i] as TextTarget);
              const size = (this._getProperty("_tfi", [target]) as number) || 20;
              const lineHeight = lineHeightPercent(value, size);
              target.setProperties([property], [lineHeight]);
            }
          } finally {
            editor.commitTransaction(text("GTextProperties", "action.modify-text-properties"));
          }
        }
      }
    });
    holder.appendChild(toggle);
    return holder;
  }

  /** The paragraph spacing box of the advanced settings, with its "%"/unit toggle. */
  private _createParagraphSpacingField(property: string): HTMLElement {
    const holder = el("div", "text-paragraph-spacing");
    const input = el("input");
    input.setAttribute("type", "text");
    input.classList.add("value");
    input.setAttribute("data-property", property);
    input.addEventListener(
      "change",
      watchDog.trap((event: Event) => {
        const document = this._document;
        if (!document) return;
        const unit = (
          (this._advancedSettings as HTMLElement).querySelector(
            'button[data-property="_pas_unit"]',
          ) as Element
        ).textContent;
        const target = (event.target as Element).closest("input") as HTMLInputElement;
        let value: unknown = null;
        if ("%" !== unit) {
          const length = Length.parseEquation(
            target.value,
            (document.getScene() as Scene).getProperty("ut") as string,
          );
          if (length) value = length.toUnit(Length.Unit.PX);
        } else value = parseNumber(target.value);
        if (null === value || ("number" == typeof value && value >= 0)) {
          if ("number" == typeof value) {
            if ("%" === unit) value = value / 100;
            else value = String(value);
          }
          this._assignProperty(property, value);
        } else void this._updateProperties();
      }),
    );
    new InputBox(input, { minValue: 0, allowEmptyValue: false });
    holder.appendChild(input);
    const toggle = el("button", "g-flat");
    toggle.classList.add("unit");
    toggle.setAttribute("data-property", "_pas_unit");
    toggle.textContent = "px";
    toggle.addEventListener(
      "click",
      watchDog.trap((event: MouseEvent) => {
        const document = this._document;
        if (!document) return;
        const scene = document.getScene() as Scene;
        const target = event.target as Element;
        const current = target.textContent;
        const next = "%" === current ? (scene.getProperty("ut") as string) || "px" : "%";
        target.textContent = next;
        const box = (this._advancedSettings as HTMLElement).querySelector(
          'input[data-property="_pas"]',
        ) as HTMLInputElement;
        let value: number | null = null;
        if ("%" !== current) {
          const length = Length.parseEquation(box.value, scene.getProperty("ut") as string);
          if (length) value = length.toUnit(Length.Unit.PX);
        } else value = parseNumber(box.value);
        // A length box that doesn't parse leaves null, which isNaN lets
        // through: the spacing becomes 0 (see "Paragraph spacing unit switch
        // turns text into 0" in QUESTIONS.md).
        if (!isNaN(value as number)) {
          const targets = this._text.map((t) => this._inspected(t));
          const size = (this._getProperty("_tfi", targets) as number) || 20;
          let spacing: unknown;
          if ("%" === next) spacing = paragraphSpacingPercent(value as number, size);
          else spacing = percentToLength(value as number, size);
          this._assignProperties(["_pas"], [spacing]);
        }
      }),
    );
    holder.appendChild(toggle);
    return holder;
  }

  _createLanguageSelector(): HTMLSelectElement {
    const select = el("select");
    select.setAttribute("data-property", "_tlocl");
    // Old: .gPro() and a mousedown trap; with every Pro feature on, neither did anything.
    select.addEventListener(
      "change",
      watchDog.trap((event: Event) => {
        const value = ((event.target as Element).closest("select") as HTMLSelectElement).value;
        this._assignProperties(["_tlocl"], [value || null]);
      }),
    );
    return select;
  }

  _createStylisticSetSelector(): HTMLSelectElement {
    const select = el("select");
    select.setAttribute("data-property", "_tstyls");
    select.addEventListener(
      "change",
      watchDog.trap((event: Event) => {
        const value = ((event.target as Element).closest("select") as HTMLSelectElement).value;
        this._assignProperties(["_tstyls"], [value || null]);
      }),
    );
    return select;
  }

  /** Opens the eye dropper of the text color field. */
  override openEyeDropper(pageX?: number, pageY?: number): void {
    const chooser = (this._panel as HTMLElement).querySelector('[data-property="_fc"]');
    const widget = chooser ? PatternChooserWidget.of(chooser) : null;
    if (widget) widget.openEyeDropper(pageX, pageY);
  }

  _getAdvancedSettingsOverlayDiv(): HTMLElement {
    const content = el("div");
    // Old: "dialog-expired-pro" was added without Pro features; they are always on.
    new Overlay(content, { releaseOnClose: false, clazz: "g-overlay-advanced-setting" });
    return content;
  }

  _getAdvancedSettingsButton(): HTMLButtonElement {
    const element = el("button");
    attrs(element, {
      "data-action": "text-settings",
      "data-title": text("GTextProperties", "text.advanced-text-settings"),
    });
    element.appendChild(icon("gravit-icon-settings"));
    element.addEventListener("click", (event) => {
      const target = (event.target as Element).closest("button");
      Overlay.of(this._advancedSettings as HTMLElement)?.open(target);
    });
    attachRichTooltip(
      element,
      RichTooltipConfig.from({
        title: text("GTextProperties", "text.advanced-properties-icon-tooltip-title"),
        description: text("GTextProperties", "text.advanced-properties-icon-tooltip-description"),
        // Old: !isEnabledProFeatures() || !(licence.isPro() && !licence.isExpired()).
        isPro: false,
        learnMore: "",
      }),
    );
    return element;
  }

  override update(
    document: Document | null,
    elements: InspectedElements | null,
    data?: unknown,
  ): boolean {
    if (this._ownChange) return true;
    if (this._chooserElem) PatternChooserWidget.of(this._chooserElem)?.close();
    if (this._document) {
      // Removed without the target, as before (it removes the listener for every target).
      this._document
        .getScene()
        ?.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
      this._document.getEditor()?.removeEventListener(InlineEditorEvent, this._inlineEditorEvent);
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._text = [];
    if (document) {
      const list = elements as Node[];
      let style = false;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Text) this._text.push(element);
        else if (element instanceof Style && element.getProperty("_sdf") === getTypeId(Text)) {
          this._text.push(element);
          style = true;
        }
      }
      if ((this._text.length && this._text.length === list.length) || style) {
        this._document = document;
        document
          .getScene()
          ?.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        document.getEditor()?.addEventListener(InlineEditorEvent, this._inlineEditorEvent, this);
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        void this._updateProperties((data as UpdateData | null) ?? undefined);
        setDisplayed(this._advancedSettingsButton as HTMLElement, true);
        return true;
      }
    }
    setDisplayed(this._advancedSettingsButton as HTMLElement, false);
    return false;
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("font-set" === event.key) {
      const box = (this._panel as HTMLElement).querySelector<HTMLInputElement>(
        'input[data-property="fontSet"]',
      );
      if (box && box.checked !== !!event.newValue) box.checked = !!event.newValue;
    } else if ("decimals_num" === event.key) void this._updateProperties();
  }

  _touchChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._reInitLayout();
  }

  /** Touch puts the autoscale row after the sizing row, as a slider switch. */
  _reInitLayout(): void {
    const block = this._autoScrollBlock as HTMLElement;
    const checkbox = block.querySelector<HTMLInputElement>(".auto-scale-checkbox");
    if (designer().isTouchEnabled()) {
      insertAfter(block, this._sizingBlock);
      if (checkbox) mountCheckboxSlider(checkbox);
    } else {
      insertAfter(block, this._scriptBlock);
      if (checkbox) unmountCheckboxSlider(checkbox);
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    const last = this._text.length > 0 && this._text[this._text.length - 1];
    if (
      !event.temporary &&
      last &&
      (last === event.node ||
        last instanceof Style ||
        (last instanceof Text && last.getContent() === event.node))
    ) {
      void this._updateProperties();
      if (last instanceof Text && last.hasEmbeddedFonts())
        this._document?.getEditor()?.closeInlineEditor();
    }
  }

  _inlineEditorEvent(event: InlineEditorEvent): void {
    switch (event.type) {
      case InlineEditorEvent.Type.AfterOpen:
      case InlineEditorEvent.Type.AfterClose:
      case InlineEditorEvent.Type.SelectionChanged:
        void this._updateProperties();
        break;
      case InlineEditorEvent.Type.TryOpen:
        this._tryOpenInlineEditor();
        break;
      case InlineEditorEvent.Type.BeforeClose:
      case InlineEditorEvent.Type.TextEdited:
        this._tryModifyingInitialFont(
          event.type,
          !!(event.data && (event.data as { wasModifiedBefore?: boolean }).wasModifiedBefore),
        );
    }
  }

  /**
   * After the first edit of a single text (or when its editor closes after
   * an edit), switches it to the Noto family for its script when that
   * isn't the default family, with the script's direction.
   */
  _tryModifyingInitialFont(type: number | null, wasModifiedBefore: boolean): void {
    if (this._document && this._text && 1 === this._text.length) {
      const target = this._text[0] as TextTarget;
      if (!target.getProperty("_we")) {
        const core = target instanceof Text && target.getTLCore();
        if (
          core &&
          ((type === InlineEditorEvent.Type.BeforeClose && core.getWasEdited()) ||
            (type === InlineEditorEvent.Type.TextEdited && !wasModifiedBefore))
        ) {
          const plain = core.getDocumentRange().plainText();
          const noto = FontsProviderManager.getProviderInstance(NotoFontsProvider);
          const family = noto ? noto.getDefaultFamilyForString(plain) : null;
          const workspace = designer().getWorkspace();
          const manager = workspace && workspace.getFontManager();
          const defaultFont = manager && manager.getDefaultFont();
          const defaultFamily = defaultFont && defaultFont.getFamily();
          if (family && defaultFamily && defaultFamily !== family) {
            const direction = OpenTypeFont.getDirectionForString(plain);
            if (direction !== TLDirectionTextTransformer.LTR)
              target.setProperties(["_tff", "dir"], [family, direction]);
            else target.setProperty("_tff", family);
          }
        }
      }
    }
  }

  /** A text whose fonts are only placeholders asks before its editor opens; yes replaces them. */
  _tryOpenInlineEditor(): void {
    if (this._document && this._text && 1 === this._text.length && !this._openingInlineEditor) {
      const target = this._text[0] as Text;
      if (target.isFakeText())
        void SystemDialog.confirm(
          text("GTextProperties", "text.edit"),
          (ok) => {
            if (ok) {
              Editor.tryRunTransaction(
                target,
                () => {
                  target.replaceFonts(
                    fontManager().getDefaultFont() as Font,
                    target.hasEmbeddedFonts(),
                  );
                },
                "Replace fonts",
              );
              this._openingInlineEditor = true;
              try {
                const document = this._document as Document;
                (document.getEditor() as Editor).openInlineEditor(
                  target as unknown as Parameters<Editor["openInlineEditor"]>[0],
                  (document.getActiveWindow() as { getView(): unknown }).getView(),
                );
              } finally {
                this._openingInlineEditor = false;
              }
            }
          },
          text("GLocale", "no"),
          text("GLocale", "yes"),
        );
    }
  }

  _intersectArrays<T>(a: T[] | null, b: T[] | null): T[] | null {
    return null === a ? b : null === b ? a : a.filter((value) => -1 !== b.indexOf(value));
  }

  /** The element editor of a target, else the target. */
  _inspected(target: TextTarget): Inspected {
    return (ElementEditor.getEditor(target) as TextEditor | null) || target;
  }

  /** The range formatting applies to: the inline selection while editing, else the whole text. */
  private _rangeOf(element: Text): TLRange | null {
    const core = element.getTLCore();
    if (!core) return null;
    const editor = ElementEditor.getEditor(element) as TextEditor | null;
    return editor && editor.isInlineEdit() ? core.selectedRange() : core.getDocumentRange();
  }

  /** A run formatting key when every inspected text has the same value, else null. */
  _getFormatting(key: string, list: Inspected[]): unknown {
    const count = list.length;
    if (0 === count) return null;
    const read = (item: Inspected): unknown => {
      let element: Text | undefined;
      if (item instanceof TextEditor) element = item.getElement() as unknown as Text;
      else if (item instanceof Text) element = item;
      if (element) {
        const core = element.getTLCore();
        if (core) {
          const editor = ElementEditor.getEditor(element) as TextEditor | null;
          const range =
            editor && editor.isInlineEdit() ? core.selectedRange() : core.getDocumentRange();
          if (range) return (range.getFormatting() as Run)[key];
        }
      }
      return null;
    };
    const first = read(list[0] as Inspected);
    for (let i = 1; i < count; i++) if (read(list[i] as Inspected) !== first) return null;
    return first;
  }

  /**
   * A property when every inspected object has the same value, else null.
   * With a fallback, an undefined (or NaN) value gives the fallback.
   */
  _getProperty(name: string, list: Inspected[], ...fallback: unknown[]): unknown {
    const count = list.length;
    if (0 == count) return null;
    const value = (list[0] as PropertySource).getProperty(name);
    for (let i = 1; i < count; i++)
      if ((list[i] as PropertySource).getProperty(name) !== value) return null;
    return value || !looseIsNaN(value) ? value : 1 === fallback.length ? fallback[0] : value;
  }

  /** The color of the first run of the first text. */
  _getFontColor(list: Inspected[]): unknown {
    const first = list[0] instanceof ElementEditor ? list[0].getElement() : list[0];
    if (!(first && first instanceof Text)) return null;
    const content = (
      first.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>
    ).getRichContent();
    return content && content.length
      ? first._getGravitValue("fontColor", (content[0] as Run).fontColor)
      : null;
  }

  /** Shows the inspected texts' values in every field. */
  async _updateProperties(data?: UpdateData): Promise<void> {
    const manager = fontManager();
    const defaultFont = manager.getDefaultFont();
    let weights: number[] | null = null;
    let weightStyles: WeightStyles[] | null = null;
    if (!defaultFont) return;
    const panel = this._panel as HTMLElement;
    const advanced = this._advancedSettings as HTMLElement;
    const list: Inspected[] = [];
    for (let i = 0; i < this._text.length; i++)
      list.push(this._inspected(this._text[i] as TextTarget));
    const fontSet = panel.querySelector<HTMLInputElement>('input[data-property="fontSet"]');
    if (fontSet) fontSet.checked = !!designer().getSetting("font-set");
    const underline = this._getFormatting("underline", list) || null;
    const strikeout = this._getFormatting("strikeout", list) || null;
    const fractions = this._getFormatting("fractions", list) || false;
    const marker = this._getFormatting("listMarker", list) || null;
    const indent = this._getProperty(
      "_pai",
      list,
      (PropertySetInfo.P as { geometryProperties: Record<string, unknown> }).geometryProperties
        ._pai,
    );
    const paragraphSpacing = this._getProperty(
      "_pas",
      list,
      (PropertySetInfo.P as { geometryProperties: Record<string, unknown> }).geometryProperties
        ._pas,
    );
    const script = this._getProperty("_tlsc", list);
    const typographyScript = this._getProperty("_ttsc", list);
    const transformation = this._getProperty("_ttrf", list) || null;
    const weight = (this._getProperty("_tfw", list) || "") as number | string;
    const style = (this._getProperty("_tfs", list) || "") as string;
    const autoWidth = this._getProperty("aw", list) || false;
    const autoHeight = this._getProperty("ah", list) || false;
    const scaleContent = this._getProperty("sc", list) || false;
    const verticalAlign = this._getProperty("va", list) || "";
    const size = this._getProperty("_tfi", list);
    let color = this._getProperty("_fc", list);
    const wordSpacing = this._getProperty("_tws", list);
    const charSpacing = this._getProperty("_tcs", list);
    const alignment = this._getProperty("_pal", list);
    const lineHeight = this._getProperty("_plh", list);
    const pathDirection = this._getProperty("tpthd", list);
    const pathSide = this._getProperty("tpths", list);
    const pathOffset = this._getProperty("tptho", list);
    const direction = this._getProperty("dir", list);
    const language = this._getProperty("_tlocl", list);
    const stylisticSet = this._getProperty("_tstyls", list);
    let ligatures = this._getFormatting("ligatures", list);
    ligatures = "auto" === ligatures ? !charSpacing : !!ligatures;
    if (!color) color = this._getFontColor(list);
    const editor = this._document && this._document.getEditor();
    const inlineEditing =
      !!editor && editor.isInlineEditing() && editor.getCurrentInlineEditorNode() instanceof Text;
    const onPath = list.every((item) => {
      const source = item as PropertySource;
      return source.hasPathAttached && source.hasPathAttached();
    });
    for (const element of advanced.querySelectorAll('[data-property^="_ttsc"]')) {
      const value = (element.getAttribute("data-property") as string).substr("_ttsc-".length);
      element.classList.toggle("g-active", typographyScript === value);
    }
    for (const element of advanced.querySelectorAll('[data-property^="_ttrf"]')) {
      const value = (element.getAttribute("data-property") as string).substr("_ttrf-".length);
      element.classList.toggle("g-active", transformation === value);
    }
    const scene = (this._document as Document).getScene() as Scene;
    const indentBox = advanced.querySelector('[data-property="_pai"]');
    if (indentBox)
      InputBox.of(indentBox)?.value(
        null !== indent
          ? scene.pointToString(indent as number, scene.getOptimalDecimalsCount())
          : "",
      );
    const spacingUnit = advanced.querySelector('button[data-property="_pas_unit"]') as Element;
    const spacingBox = advanced.querySelector('[data-property="_pas"]') as HTMLInputElement;
    if ("number" == typeof paragraphSpacing) {
      spacingUnit.textContent = "%";
      spacingBox.value = formatNumber(100 * paragraphSpacing, scene.getOptimalDecimalsCount());
    } else if ("string" == typeof paragraphSpacing) {
      spacingUnit.textContent = (scene.getProperty("ut") as string) || "px";
      spacingBox.value = scene.pointToString(
        paragraphSpacing as unknown as number,
        scene.getOptimalDecimalsCount(),
      );
    } else spacingBox.value = "";
    const vertical = verticalAlign || Text.VerticalAlign.Top;
    const verticalButtons = panel.querySelectorAll<HTMLButtonElement>(
      'button[data-property^="va"]',
    );
    for (const element of verticalButtons) {
      element.disabled = inlineEditing || onPath;
      element.classList.toggle(
        "g-active",
        element.getAttribute("data-property") === "va-" + String(vertical),
      );
    }
    for (const row of rowsOf(verticalButtons))
      setDisplayed(row, !(onPath || autoHeight || inlineEditing));
    for (const element of panel.querySelectorAll<HTMLButtonElement>(
      '[data-property="ah"] button',
    )) {
      element.disabled = inlineEditing;
      element.classList.toggle("g-active", isFirstChild(element) === autoHeight);
    }
    const widthButtons = panel.querySelectorAll<HTMLButtonElement>('[data-property="aw"] button');
    for (const element of widthButtons) {
      element.disabled = inlineEditing;
      element.classList.toggle("g-active", isFirstChild(element) === autoWidth);
    }
    const directionSelect = panel.querySelector('select[data-property="dir"]') as HTMLSelectElement;
    directionSelect.disabled = inlineEditing;
    if (!inlineEditing) setSelectValue(directionSelect, direction);
    for (const element of panel.querySelectorAll<HTMLInputElement>('[data-property="sc"]'))
      element.checked = !!scaleContent;
    for (const row of rowsOf(widthButtons)) setDisplayed(row, !onPath);
    (panel.querySelector('input[data-property="tpthd"]') as HTMLInputElement).checked =
      pathDirection === TLPathTextTransformer.DIRECTION_OUTWARDS;
    (panel.querySelector('input[data-property="tpths"]') as HTMLInputElement).checked =
      pathSide === TLPathTextTransformer.OUTSIDE;
    const offsetBox = panel.querySelector('input[data-property="tptho"]') as HTMLInputElement;
    setInputValue(offsetBox, pathOffset);
    for (const row of rowsOf([offsetBox])) setDisplayed(row, onPath);

    let callback: (() => void) | null = () => {
      setTimeout(() => void this._updateProperties(), 1);
    };
    const familyInput = panel.querySelector('input[data-property="_tff"]') as HTMLInputElement;
    const fontList: FontList | null = FontsButton.getFontList(familyInput);
    let fakeFamily: string | null = null;
    let sameDisplayName = true;
    let sameFamily = true;
    let displayName: string | undefined;
    let family: string | undefined;
    for (let s = 0; s < list.length; s++) {
      const item = list[s] as Inspected;
      const families: unknown[] =
        item instanceof TextEditor
          ? (item.getFonts() as unknown[])
          : [(item as PropertySource).getProperty("_tff")];
      if (1 == list.length) {
        const element = item instanceof TextEditor ? item.getElement() : item;
        if (element instanceof Text) {
          const unresolved = element.hasFontsToResolve();
          if (unresolved && unresolved.length && element.isFakeText()) {
            const name = (unresolved[0] as Font).getFamily();
            if (name) fakeFamily = name;
          }
        }
      }
      for (let f = 0; f < families.length; f++) {
        let name: string | undefined;
        let current = families[f] as string;
        if (current) {
          if (current === defaultFont.getFamily()) name = current;
          else {
            name = fontList ? fontList.fontDisplayName(current, callback) : current;
            if (undefined === name) {
              callback = null;
              name = current;
            }
          }
        } else {
          current = "";
          name = current;
        }
        if (undefined === displayName) displayName = name;
        else if (displayName !== name) {
          displayName = "";
          sameDisplayName = false;
          sameFamily = false;
          break;
        }
        if (undefined === family) family = current;
        else if (family !== current) {
          sameFamily = false;
          family = "";
        }
      }
    }
    for (let s = 0; s < list.length; s++) {
      let available: number[] | null = null;
      let styles: WeightStyles[] | null = null;
      const item = list[s] as Inspected;
      const families: unknown[] =
        item instanceof TextEditor
          ? (item.getFonts() as unknown[])
          : [(item as PropertySource).getProperty("_tff") || defaultFont.getFamily()];
      for (let f = 0; f < families.length; f++) {
        const current = families[f] as string;
        let filtered: WeightStyles[];
        if (current === defaultFont.getFamily()) {
          available = unique(manager.getDefaultFontWeights() as number[]) as number[];
          styles = available.map((w) => ({
            weight: w,
            styles: (manager.getDefaultFontStyles() as string[]).map(
              (st) => st + SEPARATOR + (sameDisplayName ? defaultFont.getFamily() : "") + SEPARATOR,
            ),
          }));
        } else if (fontList) {
          const found = await fontList.weightsForFont(current, callback);
          if (undefined === found) callback = null;
          available = unique(found || []) as number[];
          styles = available.map((w) => {
            const named = fontList.stylesForWeight(w, current) as string[];
            const subfamilies = fontList.subfamiliesForWeight(w, current) as {
              realName: string;
              subFamily: string | null | undefined;
            }[];
            for (let o = 0; o < subfamilies.length; o++)
              named[o] =
                named[o] +
                SEPARATOR +
                (sameDisplayName ? (subfamilies[o] as { realName: string }).realName : "") +
                SEPARATOR +
                ((subfamilies[o] as { subFamily: string | null | undefined }).subFamily || "");
            return { weight: w, styles: named };
          });
        }
        weights = unique(this._intersectArrays(weights, available));
        const known = styles || [];
        if (weightStyles) {
          filtered = weightStyles.filter((entry) => {
            if ((weights as number[]).indexOf(entry.weight) >= 0) {
              const match = known.find((k) => k.weight === entry.weight);
              if (!match) return false;
              const kept: string[] = [];
              entry.styles = entry.styles.filter((value) => {
                const prefix = value.split(SEPARATOR)[0];
                if (prefix && prefix.length) {
                  const same = match.styles.find((candidate) => candidate.startsWith(prefix));
                  if (same) {
                    if (same !== value) kept.push(prefix + SEPARATOR + SEPARATOR);
                    else kept.push(value);
                    return true;
                  }
                }
                return false;
              });
              entry.styles = kept;
              if (entry.styles.length) return true;
            }
            return false;
          });
        } else filtered = known.filter((entry) => (weights || []).indexOf(entry.weight) >= 0);
        weightStyles = filtered;
      }
    }
    if (fakeFamily) familyInput.value = fakeFamily;
    else setInputValue(familyInput, displayName);
    if (familyInput === document.activeElement) familyInput.select();
    const sizeBox = panel.querySelector('input[data-property="_tfi"]') as HTMLInputElement;
    this._updateSizeBox(sizeBox);
    (UnitBox.of(sizeBox) as UnitBox).value(
      null !== size ? new Length(size as number, Length.Unit.PT) : null,
    );
    const colorField = panel.querySelector('[data-property="_fc"]');
    if (colorField) PatternChooserWidget.of(colorField)?.value(color as never);

    const weightSelect = panel.querySelector('select[data-property="style"]') as HTMLSelectElement;
    weightSelect.replaceChildren();
    if (!(weightStyles && weightStyles.length))
      weightStyles = [{ weight: 400, styles: [Font.Style.Normal] }];
    if (!(weights && weights.length)) weights = [400];
    for (const entry of weightOptions(weights, weightStyles))
      weightSelect.appendChild(option(entry.value, entry.label));
    setDisabled(
      advanced.querySelector(`[data-property="_ttrf-${TextTransformation.SmallCaps}"]`),
      false,
    );
    setDisabled(advanced.querySelector('[data-property="typography-fractions"]'), false);
    toggleAll(
      advanced.querySelectorAll('[data-property="typography-ligatures"]'),
      "g-active",
      true === ligatures,
    );
    toggleAll(
      advanced.querySelectorAll('[data-property="typography-fractions"]'),
      "g-active",
      true === fractions,
    );
    const scriptSelect = panel.querySelector('select[data-property="_tlsc"]') as HTMLSelectElement;
    scriptSelect.replaceChildren();
    scriptSelect.appendChild(option("auto", text("GTextProperties", "text.auto")));
    const font = manager.getFont(
      (sameFamily && list[0] && ((list[0] as PropertySource).getProperty("_tff") as string)) ||
        defaultFont.getFamily(),
      style,
      weight as number,
    );
    // The old code went on with font.isResolved() and stopped there with an error.
    if (!font) return;
    if (font.isResolved()) {
      if (!font.hasFeature(Font.Features.SmallCaps))
        setDisabled(
          advanced.querySelector(`[data-property="_ttrf-${TextTransformation.SmallCaps}"]`),
          true,
        );
      const scripts = (
        font as unknown as { getAvailableScripts(): (string | null)[] }
      ).getAvailableScripts();
      for (let s = 0; s < scripts.length; s++) {
        let name = scripts[s];
        if (name) {
          const letters = name.toLowerCase().split("");
          letters[0] = (letters[0] as string).toUpperCase();
          name = letters.join("");
          scriptSelect.appendChild(
            option(
              scripts[s] as string,
              Locale.get(
                new LocaleKey("GTextProperties", "text.".concat(name.toLowerCase())),
                name,
              ) ?? "",
            ),
          );
        }
      }
    }
    const fonts = [
      ...new Set(
        list
          .map((item) => {
            let out: (Font | null)[] = [];
            let family = (item as PropertySource).getProperty("_tff") as string;
            let fontStyle = (item as PropertySource).getProperty("_tfs") as string;
            let fontWeight = (item as PropertySource).getProperty("_tfw") as number;
            if (item instanceof TextEditor && !family) {
              const element = item.getElement() as unknown as Text;
              const content = element.getContent() as Record<string, unknown>[] | null;
              if (content) {
                const familyKey = Text.PropertyMapping._tff as string;
                const styleKey = Text.PropertyMapping._tfs as string;
                const weightKey = Text.PropertyMapping._tfw as string;
                out = content
                  .map((run) => {
                    family = element._getGravitValue(familyKey, run[familyKey]) as string;
                    fontStyle = element._getGravitValue(styleKey, run[styleKey]) as string;
                    fontWeight = element._getGravitValue(weightKey, run[weightKey]) as number;
                    return family && fontStyle && fontWeight
                      ? manager.getFont(family, fontStyle, fontWeight, false)
                      : null;
                  })
                  .filter((entry) => !!entry);
              }
            } else if (family && fontStyle && fontWeight)
              out = [manager.getFont(family, fontStyle, fontWeight, false)];
            return out;
          })
          .reduce((all, entries) => all.concat(entries), [] as (Font | null)[]),
      ),
    ];
    if (
      !fonts.every(
        (entry) => entry && entry.isResolved() && entry.hasFeature(Font.Features.Fractions),
      )
    )
      setDisabled(advanced.querySelector('[data-property="typography-fractions"]'), true);
    setSelectValue(scriptSelect, script);
    const previous = selectValue(weightSelect);
    setSelectValue(
      weightSelect,
      String(weight) +
        SEPARATOR +
        style +
        SEPARATOR +
        (sameFamily
          ? ((list[0] as PropertySource).getProperty("_tff") as string) || defaultFont.getFamily()
          : ""),
    );
    if (!selectValue(weightSelect)) {
      if (
        this._text.some((target) => {
          if (!(target instanceof Text)) return false;
          const formatting = (target.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>)
            .getDocumentRange()
            .getFormatting() as Run;
          return (
            Formatting.multipleValues === formatting[Text.PropertyMapping._tfw as string] ||
            Formatting.multipleValues === formatting[Text.PropertyMapping._tfs as string]
          );
        })
      ) {
        weightSelect.appendChild(option("mixed", text("GTextProperties", "text.mixed")));
        setSelectValue(weightSelect, "mixed");
      } else setSelectValue(weightSelect, previous);
    }
    let boldAvailable = weights.indexOf(Font.Weight.Bold) >= 0;
    const styleList = weightStyles;
    if (!(weight && parseInt(String(weight)) === Font.Weight.Bold))
      if (style && style === Font.Style.Italic)
        boldAvailable = styleList.some(
          ({ weight: w, styles: st }) =>
            w === Font.Weight.Bold && st.some((value) => 0 === value.indexOf(Font.Style.Italic)),
        );
    const bold = panel.querySelector('[data-property="decoration-bold"]') as HTMLButtonElement;
    bold.classList.toggle(
      "g-active",
      boldAvailable && !!weight && parseInt(String(weight)) === Font.Weight.Bold,
    );
    bold.disabled = !boldAvailable;
    const italicAvailable = styleList.some(
      ({ weight: w, styles: st }) =>
        w === parseInt(String(weight || Font.Weight.Regular)) &&
        st.some((value) => 0 === value.indexOf(Font.Style.Italic)),
    );
    const italic = panel.querySelector('[data-property="decoration-italic"]') as HTMLButtonElement;
    italic.classList.toggle("g-active", italicAvailable && !!style && style === Font.Style.Italic);
    italic.disabled = !italicAvailable;
    (panel.querySelector('[data-property="decoration-underline"]') as Element).classList.toggle(
      "g-active",
      1 == (underline as number),
    );
    (panel.querySelector('[data-property="decoration-strikeout"]') as Element).classList.toggle(
      "g-active",
      1 == (strikeout as number),
    );
    (panel.querySelector('input[data-property="_tws"]') as HTMLInputElement).value =
      null !== wordSpacing
        ? scene.pointToString(wordSpacing as number, scene.getOptimalDecimalsCount())
        : "0";
    (panel.querySelector('input[data-property="_tcs"]') as HTMLInputElement).value =
      null !== charSpacing
        ? scene.pointToString(charSpacing as number, scene.getOptimalDecimalsCount())
        : "0";
    const paragraph = alignment || ParagraphAlignment.Left;
    const alignButtons = panel.querySelectorAll('button[data-property^="_pal"]');
    for (const element of alignButtons)
      element.classList.toggle(
        "g-active",
        element.getAttribute("data-property") === "_pal-" + String(paragraph),
      );
    for (const row of rowsOf(alignButtons)) setDisplayed(row, !onPath);
    const lineUnit = panel.querySelector('button[data-property="_plh_unit"]') as Element;
    const lineBox = panel.querySelector('input[data-property="_plh"]') as HTMLInputElement;
    if ("number" == typeof lineHeight) {
      lineUnit.textContent = "%";
      lineBox.value = formatNumber(100 * lineHeight);
    } else if ("string" == typeof lineHeight || lineHeight instanceof String) {
      const unit = scene.getProperty("ut") as string;
      lineUnit.textContent = unit || "px";
      lineBox.value = scene.pointToString(
        lineHeight as unknown as number,
        scene.getOptimalDecimalsCount(),
      );
    } else lineBox.value = "";
    if (
      data &&
      (data.evtType == ModifiedEvent.Type.Undo || data.evtType == ModifiedEvent.Type.Redo) &&
      data.chooserOn &&
      data.textPattern
    ) {
      const preview = panel.querySelector('[data-property="_fc"] .preview');
      if (preview instanceof HTMLElement) preview.click();
    }
    this._weightsAvailable = weights;
    const listSettings = this._listTypeSettings as HTMLElement;
    for (const element of listSettings.querySelectorAll(".list-type-group.g-selected"))
      element.classList.remove("g-selected");
    for (const element of listSettings.querySelectorAll(".list-type-option.g-selected"))
      element.classList.remove("g-selected");
    const markerLabel = advanced.querySelector('[data-property="_pm"] > span');
    if (markerLabel) markerLabel.textContent = "";
    if ("string" == typeof marker) {
      const group = Object.values(LIST_TYPES).find(({ types = [] }) =>
        types.find(({ value }) => value === marker),
      );
      if (group && markerLabel) markerLabel.textContent = group.label;
      const item = listSettings.querySelector(`.list-type-option[value="${marker}"]`);
      if (item) {
        item.classList.add("g-selected");
        item.closest(".list-type-group")?.classList.add("g-selected");
      }
    } else if (null == marker) {
      if (markerLabel) markerLabel.textContent = LIST_TYPES.None.label;
      listSettings
        .querySelector(`.list-type-group[value="${LIST_TYPES.None.value}"]`)
        ?.classList.add("g-selected");
    }
    this._updateLanguageSelector(font, script, language);
    this._updateStylisticSetSelector(font, script, stylisticSet);
  }

  /**
   * The old update called gUnitBox(options) again with the unit of the
   * document and the size list. The box itself keeps the options of its
   * first init (only a new list click handler took the new ones), so here
   * the list is handed to the box once; see "Font size box keeps the unit
   * of its first init" in QUESTIONS.md.
   *
   * The box is constructed a second time because the ported UnitBox binds
   * its list click (and unbinds the input box's own click) only in its
   * constructor, and the first one in init had no list. The second
   * construction also adds a second change listener that marks the
   * selected list item; both mark the same item, so it does nothing more.
   * The old code did the same on every update, adding a listener each time.
   */
  private _updateSizeBox(input: HTMLInputElement): void {
    const unitBox = UnitBox.of(input) as UnitBox;
    if (!unitBox.options().list) {
      unitBox.list(FONT_SIZES);
      new UnitBox(input, {
        unit:
          this._document &&
          (this._document.getScene() as unknown as { $ut: string }).$ut === Length.Unit.PX
            ? Length.Unit.PX
            : Length.Unit.PT,
        list: FONT_SIZES,
        source: "text",
      });
    }
  }

  _updateLanguageSelector(font: Font, script: unknown, language: unknown): void {
    const select = (this._advancedSettings as HTMLElement).querySelector(
      'select[data-property="_tlocl"]',
    ) as HTMLSelectElement;
    select.replaceChildren();
    select.setAttribute("disabled", "disabled");
    select.classList.add("g-disabled");
    if (!font.isResolved() || !font.hasFeature(Font.Features.LocalizedForm)) return;
    let tag: string | null = null;
    if (script && "auto" !== script)
      tag = OpenTypeFont.scriptNameToOpenTypeScriptTagString(script as string);
    const tags = font.getAvailableLanguageSystemTags(tag as string | undefined);
    if (tags && 0 !== tags.length) {
      select.removeAttribute("disabled");
      select.classList.remove("g-disabled");
      select.appendChild(option("", text("GCommonNames", "text.default")));
      // A tag without a BCP 47 code looks up "text.lang.null", which has no
      // string: its name is undefined, and the sort throws as soon as such a
      // name is the left side of a comparison. The select then keeps only
      // "Default" and the stylistic set select is not updated (see "Unknown
      // language tag stops the text panel update" in QUESTIONS.md).
      const named = tags
        .map((value) => {
          const bcp47 = OpenTypeFont.openTypeLanguageSystemTagStringToBCP47(value);
          return {
            name: Locale.get(
              new LocaleKey("GBCP47LanguageTags", "text.lang.".concat(String(bcp47))),
            ),
            tag: value,
          };
        })
        .sort((a, b) => (a.name as string).localeCompare(b.name as string));
      // Old: .text(undefined) left the option empty.
      for (const { name, tag: value } of named) select.appendChild(option(value, name ?? ""));
      if (language) setSelectValue(select, language);
      else if (this._hasMultipleLanguages()) {
        select.appendChild(this._mixedOption());
        setSelectValue(select, "mixed");
      }
    }
  }

  _updateStylisticSetSelector(font: Font, script: unknown, stylisticSet: unknown): void {
    const select = (this._advancedSettings as HTMLElement).querySelector(
      'select[data-property="_tstyls"]',
    ) as HTMLSelectElement;
    select.replaceChildren();
    select.setAttribute("disabled", "disabled");
    select.classList.add("g-disabled");
    if (!font.isResolved() || !font.hasFeature(Font.Features.StylisticSet)) return;
    let tag: string | null = null;
    if (script && "auto" !== script)
      tag = OpenTypeFont.scriptNameToOpenTypeScriptTagString(script as string);
    const sets = font.getAvailableStylisticSets(tag as string | undefined);
    if (sets && 0 !== sets.length) {
      select.removeAttribute("disabled");
      select.classList.remove("g-disabled");
      select.appendChild(option("", text("GCommonNames", "text.none")));
      for (const value of sets) select.appendChild(option(value, value.toUpperCase()));
      if (stylisticSet) setSelectValue(select, stylisticSet);
      else if (this._hasMultipleStylisticSets()) {
        select.appendChild(this._mixedOption());
        setSelectValue(select, "mixed");
      }
    }
  }

  /** The hidden, disabled "mixed" option of the language and stylistic set selects. */
  private _mixedOption(): HTMLOptionElement {
    const element = el("option");
    element.setAttribute("value", "mixed");
    element.setAttribute("hidden", "hidden");
    element.setAttribute("disabled", "disabled");
    element.textContent = text("GTextProperties", "text.mixed");
    return element;
  }

  _hasMultipleLanguages(): boolean {
    return this._hasMultipleValues(Text.PropertyMapping._tlocl as string);
  }

  _hasMultipleStylisticSets(): boolean {
    return this._hasMultipleValues(Text.PropertyMapping._tstyls as string);
  }

  _hasMultipleValues(key: string): boolean {
    return this._text.some((target) => {
      if (target instanceof Text) {
        const value = (
          (target.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>)
            .getDocumentRange()
            .getFormatting() as Run
        )[key];
        return Formatting.multipleValues === value;
      }
      return false;
    });
  }

  /**
   * Moves `weights[0]` to the nearest weight `family` has and `styles[0]`
   * to a style that weight has. Returns whether anything changed.
   */
  async _correctStyleAndWeight(
    family: string,
    styles: string[],
    weights: number[],
  ): Promise<boolean> {
    let available: number[] | null | undefined = null;
    let byWeight: { weight: number; styles: string[] | null | undefined }[] | null | undefined =
      null;
    const manager = fontManager();
    const defaultFont = manager.getDefaultFont() as Font;
    const familyInput = (this._panel as HTMLElement).querySelector(
      'input[data-property="_tff"]',
    ) as HTMLInputElement;
    const list = FontsButton.getFontList(familyInput);
    let changed = false;
    if (family === defaultFont.getFamily()) {
      available = manager.getDefaultFontWeights() as number[];
      byWeight =
        available &&
        available.map((w) => ({ weight: w, styles: manager.getDefaultFontStyles() as string[] }));
    } else if (list) {
      available = await list.weightsForFont(
        family,
        () => {
          console.warn("textproperties: Unexpected callback");
        },
        true,
      );
      byWeight =
        available &&
        available.map((w) => ({
          weight: w,
          styles: list.stylesForWeight(
            w,
            family,
            () => {
              console.warn("textproperties: Unexpected callback");
            },
            true,
          ),
        }));
    }
    if (available && available.indexOf(weights[0] as number) < 0) {
      let nearest = 0;
      for (let u = 0; u < available.length; u++)
        if (
          Math.abs((weights[0] as number) - (available[u] as number)) <
          Math.abs((weights[0] as number) - (available[nearest] as number))
        )
          nearest = u;
      weights[0] = available[nearest] as number;
      changed = true;
    }
    const matching = (byWeight || []).filter((entry) => entry.weight === weights[0]) || [];
    if (
      matching.length &&
      ((matching[0] as { styles: string[] }).styles as string[]).indexOf(styles[0] as string) < 0
    ) {
      if (
        styles[0] === Font.Style.Normal &&
        ((matching[0] as { styles: string[] }).styles as string[]).length
      )
        styles[0] = Font.Style.Italic;
      else styles[0] = Font.Style.Normal;
      changed = true;
    }
    return changed;
  }

  /** Bold and italic change weight and style; the rest flips a run formatting. */
  _toggleFormatting(kind: string): void {
    if (this._text && this._text.length) {
      const list = this._text.map((target) => this._inspected(target));
      const underline = this._getFormatting("underline", list) || null;
      const strikeout = this._getFormatting("strikeout", list) || null;
      let ligatures = this._getFormatting("ligatures", list);
      ligatures = "auto" === ligatures ? !this._getProperty("_tcs", list) : !!ligatures;
      const current: Record<string, unknown> = {
        underline,
        strikeout,
        ligatures,
        fractions: this._getFormatting("fractions", list),
      };
      const weight = this._getProperty("_tfw", list) || "";
      const style = this._getProperty("_tfs", list) || "";
      if ("bold" === kind) {
        let next: number | undefined;
        if (parseInt(String(weight)) === Font.Weight.Bold) {
          const available = this._weightsAvailable as number[];
          next =
            available.indexOf(Font.Weight.Regular) >= 0
              ? Font.Weight.Regular
              : Math.min.apply(null, available);
          // Old: `|| GFont.Style.Regular`, which doesn't exist (see "Bold toggle
          // writes Infinity when no weights are known" in QUESTIONS.md).
          next = next || undefined;
        } else next = Font.Weight.Bold;
        this._assignProperties(["_tfw"], [next]);
      } else if ("italic" === kind)
        this._assignProperties(
          ["_tfs"],
          [style === Font.Style.Italic ? Font.Style.Normal : Font.Style.Italic],
        );
      else {
        const editor = (this._document as Document).getEditor() as Editor;
        try {
          editor.beginTransaction();
          this._text.forEach((target) => {
            let element: unknown = target;
            if (element instanceof TextEditor) element = element.getElement();
            if (element instanceof Text) {
              const range = this._rangeOf(element);
              if (range) range.setFormatting(kind, 1 != current[kind]);
            }
          });
        } finally {
          editor.commitTransaction(text("GTextProperties", "action.modify-text-properties"));
        }
      }
      void this._updateProperties();
    }
  }

  /** Assigns a picked family once the font list knows its weights. */
  async _assignFont(family: string | null): Promise<void> {
    if ((fontManager().getDefaultFont() as Font).getFamily() !== family) {
      const familyInput = (this._panel as HTMLElement).querySelector(
        'input[data-property="_tff"]',
      ) as HTMLInputElement;
      const list = FontsButton.getFontList(familyInput) as FontsPanel;
      if (
        undefined ===
        (await list.weightsForFont(family as string, () => {
          void this._assignFontMain(family);
        }))
      )
        return;
    }
    void this._assignFontMain(family);
  }

  /** Toggles a list marker (null removes the list) on the texts' ranges. */
  _assignMarker(marker: string | null): void {
    if (!this._document) return;
    const editor = this._document.getEditor() as Editor;
    this._ownChange = true;
    editor.beginTransaction();
    try {
      this._text.forEach((target) => {
        let element: unknown = target;
        if (element instanceof TextEditor) element = element.getElement();
        if (element instanceof Text) {
          const range = this._rangeOf(element);
          if (range) range.toggleList(marker);
        }
      });
    } finally {
      editor.commitTransaction(text("GTextProperties", "action.modify-text-properties"));
      this._ownChange = false;
    }
  }

  /**
   * Sets the family on every text, moving weight and style to ones the
   * family has; texts with placeholder fonts get all their fonts replaced.
   */
  async _assignFontMain(family: string | null): Promise<void> {
    let styles: string[];
    let weights: number[];
    const manager = fontManager();
    manager.getDefaultFont();
    if (this._document) {
      const editor = this._document.getEditor() as Editor;
      if (this._text.length) {
        editor.beginTransaction();
        try {
          for (let s = 0; s < this._text.length; ++s) {
            const target = this._text[s] as TextTarget;
            const elementEditor = ElementEditor.getEditor(target) as TextEditor | null;
            if (target instanceof Text && target.isFakeText()) {
              const content = target.getContent() as { fontFamily: string }[] | null;
              const replacement: Record<string, string> = {};
              if (content)
                content.forEach((run) => {
                  replacement[run.fontFamily] = family as string;
                });
              const own = target.getProperty("_tff") as string;
              replacement[own] = family as string;
              target.replaceFonts(replacement, true);
            } else {
              const destination = elementEditor || target;
              const names = ["_tff"];
              const values: unknown[] = [family];
              const core = target instanceof Text && target.getTLCore();
              if (core) {
                const range =
                  elementEditor && elementEditor.isInlineEdit()
                    ? (core.selectedRange() as TLRange)
                    : core.getDocumentRange();
                const runs = range.save();
                const styleKey = Text.PropertyMapping._tfs as string;
                const weightKey = Text.PropertyMapping._tfw as string;
                let styleChanged = false;
                let weightChanged = false;
                for (let w = 0; w < runs.length; w++) {
                  const run = runs[w] as Run;
                  const runStyle: string =
                    "italic" === run[styleKey] ? Font.Style.Italic : Font.Style.Normal;
                  const runWeight = ~~(run[weightKey] as number);
                  styles = [runStyle];
                  weights = [runWeight];
                  if (await this._correctStyleAndWeight(family as string, styles, weights)) {
                    let styleIndex = names.indexOf("_tfs");
                    let weightIndex = names.indexOf("_tfw");
                    if (runStyle !== styles[0]) {
                      if (styleIndex < 0) {
                        styleIndex = names.length;
                        names.push("_tfs");
                        values.push("");
                      }
                      if (weightChanged) {
                        values[weightIndex] = weights[0];
                        values[styleIndex] = styles[0];
                        break;
                      }
                      values[styleIndex] = styles[0];
                      styleChanged = true;
                    }
                    if (runWeight !== weights[0]) {
                      if (weightIndex < 0) {
                        weightIndex = names.length;
                        names.push("_tfw");
                        values.push("");
                      }
                      if (styleChanged) {
                        values[styleIndex] = styles[0];
                        values[weightIndex] = weights[0];
                        break;
                      }
                      values[weightIndex] = weights[0];
                      weightChanged = true;
                    }
                  }
                }
              } else {
                styles = [
                  ((destination as PropertySource).getProperty("_tfs") as string) ||
                    Font.Style.Normal,
                ];
                weights = [
                  ((destination as PropertySource).getProperty("_tfw") as number) ||
                    Font.Weight.Regular,
                ];
                await this._correctStyleAndWeight(family as string, styles, weights);
                if (!manager.getFont(family as string, styles[0] as string, weights[0] as number))
                  continue;
                Array.prototype.push.apply(names, ["_tfs", "_tfw"]);
                Array.prototype.push.apply(values, [styles[0], weights[0]]);
              }
              destination.setProperties(names, values);
            }
            if (elementEditor) {
              const defaultStyle = elementEditor.getDefaultStyle() as {
                assignStyleFrom(source: unknown): void;
              } | null;
              if (defaultStyle) defaultStyle.assignStyleFrom(target);
            }
            if (target instanceof Style) void this._updateProperties();
          }
        } finally {
          editor.commitTransaction(text("GTextProperties", "action.modify-text-properties"));
        }
      }
    }
  }

  _assignProperty(name: string, value: unknown, temporary?: boolean, data?: unknown): void {
    this._assignProperties([name], [value], temporary, data);
  }

  /**
   * Writes the properties through each text's element editor (so the
   * inline selection gets them while editing), in one transaction unless
   * `temporary`.
   */
  _assignProperties(names: string[], values: unknown[], temporary?: boolean, data?: unknown): void {
    if (this._document) {
      const editor = this._document.getEditor() as Editor;
      if (!temporary) {
        this._ownChange = true;
        editor.beginTransaction();
      }
      try {
        for (let s = 0; s < this._text.length; ++s) {
          const elementEditor = ElementEditor.getEditor(this._text[s]) as TextEditor | null;
          if (elementEditor) elementEditor.setProperties(names, values, temporary);
          else (this._text[s] as TextTarget).setProperties(names, values, false, false, temporary);
        }
      } finally {
        if (!temporary) {
          editor.commitTransaction(
            text("GTextProperties", "action.modify-text-properties"),
            data || null,
          );
          this._ownChange = false;
        }
      }
      if (names.includes("sc"))
        for (let s = 0; s < this._text.length; ++s) {
          const elementEditor = ElementEditor.getEditor(this._text[s]) as TextEditor | null;
          if (elementEditor) elementEditor.requestInvalidation();
        }
    }
  }

  override toString(): string {
    return "[Object GTextProperties]";
  }
}

/** `$(elements).closest(".g-property-row")`: the rows of the elements, once each. */
function rowsOf(elements: Iterable<Element>): HTMLElement[] {
  const rows: HTMLElement[] = [];
  for (const element of elements) {
    const row = element.closest<HTMLElement>(".g-property-row");
    if (row && rows.indexOf(row) < 0) rows.push(row);
  }
  return rows;
}

/** jQuery's `.is(":first-child")`. */
function isFirstChild(element: Element): boolean {
  return !!element.parentElement && element.parentElement.firstElementChild === element;
}

/**
 * The options of the weight select: for each weight from 100 to 900 that
 * every text has, one option per style string of that weight
 * ("style#family#subfamily"). The value is "weight#style#family"; the
 * label is the weight's name, italic or not, after the subfamily when the
 * name doesn't start with it.
 */
export function weightOptions(
  weights: readonly number[],
  weightStyles: readonly WeightStyles[],
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let w = 100; w <= 900; w += 100)
    if (weights.indexOf(w) >= 0) {
      let entryStyles: string[] | null = null;
      for (let g = 0; g < weightStyles.length; g++)
        if ((weightStyles[g] as WeightStyles).weight === w) {
          entryStyles = (weightStyles[g] as WeightStyles).styles;
          break;
        }
      for (let g = 0; entryStyles && g < entryStyles.length; g++) {
        let label: string;
        const parts = (entryStyles[g] as string).split(SEPARATOR);
        if (parts[0] === Font.Style.Italic) label = locale(Font.WeightNameItalic[w]);
        else label = locale(Font.WeightName[w]);
        if (parts[2] && parts[2].length && 0 != label.indexOf(parts[2]))
          label = parts[2] + " " + label;
        out.push({
          value: w.toString() + SEPARATOR + parts[0] + SEPARATOR + (parts[1] || ""),
          label,
        });
      }
    }
  return out;
}

/**
 * A line height or paragraph spacing in percent of the font size as the
 * length string the property holds, for the "%" to unit switch. The size
 * counts 4/3 (pt to px at 96 dpi), see "Line height unit switch converts
 * pt at 96 dpi" in QUESTIONS.md.
 */
export function percentToLength(percent: number, size: number): string {
  return String(((percent / 100) * size * 4) / 3);
}

/** A line height length as a factor of the font size (at least 0.01), two decimals. */
export function lineHeightPercent(length: number, size: number): number {
  return Math.round(100 * Math.max(length / ((4 * size) / 3), 0.01)) / 100;
}

/** A paragraph spacing length as a factor of the font size, two decimals. */
export function paragraphSpacingPercent(length: number, size: number): number {
  return Math.round(100 * parseFloat(String(length / ((4 * size) / 3)))) / 100;
}
