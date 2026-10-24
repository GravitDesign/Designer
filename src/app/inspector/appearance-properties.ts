// Old: designer.browser.dev.js module 1160 (GAppearanceProperties).
/**
 * The appearance rows of the inspector: opacity (slider and box), the
 * blend mode select with the mask modes, and the shared style picker with
 * its sync button. They apply to every inspected element with the style
 * property set; through the element editors' parts where an editor takes
 * them (a paths-graph's selected edges or facets).
 */
import { registerClass } from "../../engine/core/object.ts";
import { formatOpacity } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { Element as GElement } from "../../engine/scene/element.ts";
import { Node } from "../../engine/scene/node.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  AfterRemoveEvent,
  type AfterFlagChangeEvent,
} from "../../engine/scene/node-events.ts";
import { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import { PGFacet } from "../../engine/scene/paths-graph/pg-facet.ts";
import { PropertySet } from "../../engine/style/stylable-sets.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { Text } from "../../engine/text/text.ts";
import type { Editor } from "../../editor/editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import type { Document } from "../document/document.ts";
import { cssAll, css } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import type { SidebarTouchTool } from "../shell/layout.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { initBlendMode } from "../widgets/blend-select.ts";
import { InputBox } from "../widgets/input-box.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { OPACITY_DEFAULT, inputSlider, setSliderValue, sliderValue } from "./color-deps.ts";
import { designerStyleEditor } from "./designer-style-editor.ts";
import { addClass, attrs, el, findAll, propertyRow, setText, setValue, str } from "./paint-dom.ts";
import { Properties, type InspectedElements } from "./properties.ts";

const KEY = "GAppearanceProperties";

/** An inspected element with the style property set. */
type StyledElement = Node & {
  getStylePropertySets(): string[];
  getProperty(name: string): unknown;
  hasProperty(name: string): boolean;
  setProperty(name: string, value: unknown, ...flags: boolean[]): unknown;
  setProperties(names: string[], values: unknown[]): unknown;
  getReferencedStyle(): (Node & { assignStyleFrom(source: Node): void }) | null;
  equalsStyle(): boolean;
};

export class AppearanceProperties extends Properties {
  static {
    registerClass(this, "GAppearanceProperties");
  }

  _panel: HTMLElement | null = null;
  _elements: StyledElement[] = [];

  override init(panel: HTMLElement): void {
    this._panel = panel;
    this.setTouchTools([TouchTool.APPEARANCE_TOUCH_TOOL as unknown as SidebarTouchTool]);
    const field = (property: string): HTMLElement => this._createField(property);
    panel.appendChild(
      propertyRow(el("div", "appearance-opacity-property"), {
        label: str("GCommonNames", "text.opacity"),
        columns: [
          { width: "auto", clazz: "opacity-slider-col", content: field("opacity-slider") },
          { width: "5px" },
          { clazz: "opacity-input-col", content: field("opacity-input") },
        ],
      }),
    );
    panel.appendChild(
      propertyRow(el("div", "appearance-blending-property"), {
        label: str("GCommonNames", "text.blending"),
        columns: [{ width: "100%", content: field("_sbl") }],
      }),
    );

    const license = designer().getLicense();
    const row = el("div", "g-property-row appearance-style-property");
    const label = el("label", "property-label");
    label.appendChild(setText(el("span", "vertical-align"), str(KEY, "text.style")));
    row.appendChild(label);
    const selector = el("div", "style-selector-container");
    css(selector, "display", "flex");
    const wrapper = el("div", "style-selector-inner-wrapper");
    cssAll(wrapper, { display: "flex", width: "100%", overflow: "hidden" });
    const preview = el("div", "g-styles-preview");
    css(preview, "margin-right", "5px");
    css(preview, "align-self", "center");
    css(preview, "display", "none");
    wrapper.appendChild(preview);
    const container = el("div", "g-select g-styles-field-container");
    css(container, "overflow", "hidden");
    css(container, "margin-right", "5px");
    const styleField = el("span");
    cssAll(styleField, {
      width: "95%",
      alignSelf: "center",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
    });
    attrs(styleField, { type: "text" });
    addClass(styleField, "g-styles-field");
    attrs(styleField, { "data-property": "_styles" });
    container.appendChild(styleField);
    designerStyleEditor(container);
    attachRichTooltip(
      container,
      RichTooltipConfig.from({
        title: str(KEY, "text.shared-styles-tooltip-title"),
        description: str(KEY, "text.shared-styles-tooltip-description"),
        middle: false,
        isPro: !designer().isEnabledProFeatures() || !(license.isPro() && !license.isExpired()),
        learnMore: "",
      }),
    );
    wrapper.appendChild(container);
    selector.appendChild(wrapper);
    const sync = el("button", "g-style-sync g-disabled");
    sync.addEventListener("click", () => {
      designer().stats("appearance_click_stylebutton");
      if (!sync.classList.contains("g-disabled") && this._elements && this._elements.length > 0) {
        const first = this._elements[0] as StyledElement;
        const style = first.getReferencedStyle() as Node & { assignStyleFrom(s: Node): void };
        style.assignStyleFrom(first);
        const image = designer().createNewStylePreview(style, true, first instanceof Text);
        if (image) this._addPreview(image);
        sync.classList.add("g-disabled");
      }
    });
    selector.appendChild(sync);
    row.appendChild(selector);
    panel.appendChild(row);
  }

  /** The old `_getBlendingProperties`: the blend select with the mask modes. */
  _getBlendingProperties(): HTMLSelectElement {
    const select = el("select");
    attrs(select, { "data-property": "_sbl" });
    initBlendMode(select);
    const group = el("optgroup");
    group.setAttribute("label", str(KEY, "text.masking"));
    const mask = el("option");
    mask.setAttribute("value", "m");
    group.appendChild(setText(mask, str(KEY, "blending.mask")));
    const inverse = el("option");
    inverse.setAttribute("value", "!m");
    group.appendChild(setText(inverse, str(KEY, "blending.inverse-mask")));
    select.appendChild(group);
    attachRichTooltip(
      select,
      RichTooltipConfig.from({
        title: str(KEY, "text.blend-tooltip-title"),
        description: str(KEY, "text.blend-tooltip-description"),
        middle: false,
        learnMore: "",
      }),
    );
    select.addEventListener("change", () => {
      designer().stats("appearance_change_blending", select.value);
      this._assignProperty(
        "_sbl",
        select.value,
        str("GCommonNames", "action.change-blending-mode"),
      );
    });
    return select;
  }

  private _createField(property: string): HTMLElement {
    if ("evenodd" === property) {
      // Never asked for by init; kept from the old field factory.
      const select = el("select");
      attrs(select, { "data-property": "evenodd" });
      const zero = el("option");
      zero.setAttribute("value", "0");
      select.appendChild(setText(zero, str("GCommonNames", "evenodd.non-zero")));
      const odd = el("option");
      odd.setAttribute("value", "1");
      select.appendChild(setText(odd, str("GCommonNames", "evenodd.non-odd")));
      select.addEventListener("change", () => {
        designer().stats(
          "appearance_toggle_evenodd",
          "1" === select.value ? "activate" : "deactivate",
        );
        this._assignProperty(
          "evenodd",
          "1" === select.value,
          str("GCommonNames", "action.change-fill-rule"),
        );
      });
      return select;
    }
    if ("_sbl" === property) return this._getBlendingProperties();
    if ("opacity-slider" === property) {
      const slider = el("div");
      attrs(slider, { "data-property": "_stop" });
      addClass(slider, "gravit-icon-touch-transparency");
      inputSlider(slider, {
        ...OPACITY_DEFAULT,
        richTooltipConfig: RichTooltipConfig.from({
          title: str(KEY, "text.opacity-slider-tooltip-title"),
          description: str(KEY, "text.opacity-slider-tooltip-description"),
        }),
      });
      slider.addEventListener("mousedown", () => {
        const editor = (this._document as Document).getEditor() as Editor;
        editor.hideSelection();
        document.addEventListener(
          "mouseup",
          () => {
            ((this._document as Document).getEditor() as Editor).resetHideSelection();
          },
          { once: true },
        );
      });
      slider.addEventListener("input", (event) => {
        const target = event.target as HTMLElement;
        const name = target.getAttribute("data-property") as string;
        const value = parseInt(String(sliderValue(target))) / 100;
        for (let r = 0; r < this._elements.length; ++r)
          (this._elements[r] as StyledElement).setProperty(name, value, false, false, true);
        for (const input of findAll<HTMLInputElement>(
          this._panel as HTMLElement,
          '[type="text"][data-property="' + name + '"]',
        )) {
          const box = InputBox.of(input);
          if (box) box.value(formatOpacity(100 * value));
        }
      });
      slider.addEventListener("change", () => {
        designer().stats("appearance_change_opacity");
        this._assignProperty(
          slider.getAttribute("data-property") as string,
          parseFloat(String(sliderValue(slider))) / 100,
          "Change opacity",
        );
      });
      return slider;
    }
    if ("opacity-input" === property) {
      const input = el("input");
      attrs(input, { type: "text", "data-property": "_stop" });
      input.addEventListener("change", () => {
        designer().stats("appearance_change_opacity");
        const box = InputBox.of(input) as InputBox;
        this._assignProperty(
          input.getAttribute("data-property") as string,
          (Length.parseEquationValue(box.value()) as number) / 100,
          "Change opacity",
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
    throw new Error("Unknown input property: " + property);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    this._updateUI();
    if (this._document) {
      designer().removeEventListener(SettingChangedEvent, this._settingChanged, this);
      const scene = this._document.getScene();
      if (scene) {
        scene.removeEventListener(AfterInsertEvent, this._styleChanged);
        scene.removeEventListener(AfterRemoveEvent, this._styleChanged);
        scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
        scene.removeEventListener(GElement.AfterFlagChangeEvent, this._afterFlagChange);
      }
      this._document = null;
    }
    this._elements = [];
    if (document) {
      designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
      const list = elements as InspectedElements;
      for (let n = 0; n < list.length; ++n) {
        const element = list[n] as StyledElement;
        if (
          element.hasMixin(Stylable) &&
          element.getStylePropertySets().indexOf(PropertySet.Style) >= 0
        )
          this._elements.push(element);
      }
      if (this._elements.length) {
        this._document = document;
        const scene = document.getScene();
        if (scene) {
          scene.addEventListener(AfterInsertEvent, this._styleChanged, this);
          scene.addEventListener(AfterRemoveEvent, this._styleChanged, this);
          scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
          scene.addEventListener(GElement.AfterFlagChangeEvent, this._afterFlagChange, this);
        }
        this._updateProperties();
        return true;
      }
    }
    return false;
  }

  _updateUI(): void {
    for (const sync of findAll(this._panel as HTMLElement, ".g-style-sync"))
      if (designer().isTouchEnabled()) {
        sync.textContent = "";
        sync.appendChild(el("span", "g-style-sync-refresh-item"));
      } else setText(sync, str(KEY, "action.sync"));
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._updateUI();
  }

  _afterFlagChange(event: AfterFlagChangeEvent): void {
    if (
      event.flag === Node.Flag.Selected &&
      (event.node instanceof PGEdge || event.node instanceof PGFacet)
    ) {
      const parent = event.node.getParent();
      const owner = parent ? parent.getParent() : null;
      if (owner && this._elements.indexOf(owner as unknown as StyledElement) >= 0)
        this._updateProperties();
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && event.node === this._elements[0]) this._updateProperties();
    this._styleChanged();
  }

  _styleChanged(): void {
    if (1 === this._elements.length) this._checkSyncState();
  }

  _updateProperties(): void {
    if (this._elements && this._elements.length) {
      const first = this._elements[0] as StyledElement;
      const editor = ElementEditor.getEditor(first);
      // A parts editor's common value (`multiple` when the parts differ).
      const value = (name: string, firstOnly: boolean, multiple: unknown): unknown => {
        const parts = editor ? editor.getPartsProperty(name) : null;
        if (parts) {
          const values = parts.values as unknown[];
          if (values.length) {
            if (1 == values.length || firstOnly) return values[0];
            const start = values[0];
            for (let l = 1; l < values.length; ++l) if (values[l] !== start) return multiple;
            return start;
          }
          return multiple;
        }
        return first.getProperty(name);
      };
      const panel = this._panel as HTMLElement;
      const opacity = 100 * (value("_stop", false, null) as number);
      for (const slider of findAll(panel, '.g-input-slider[data-property="_stop"]'))
        setSliderValue(slider, null !== opacity ? opacity : 100);
      for (const input of findAll<HTMLInputElement>(
        panel,
        '[type="text"][data-property="_stop"]',
      )) {
        const box = InputBox.of(input);
        if (box) box.value(formatOpacity(opacity));
      }
      for (const select of findAll<HTMLSelectElement>(panel, '[data-property="_sbl"]'))
        setValue(select, value("_sbl", true, undefined));
      let preview: string | null = null;
      let name: unknown = null;
      if (1 === this._elements.length && first.hasProperty("sref") && first.getReferencedStyle()) {
        const style = first.getReferencedStyle() as unknown as Node & {
          getProperty(name: string): unknown;
        };
        preview = designer().getStylePreview(style, first instanceof Text);
        name = style.getProperty("name");
      }
      this._checkSyncState();
      const fields = findAll(panel, ".g-styles-field");
      const previews = findAll(panel, ".g-styles-preview");
      if (preview) {
        this._addPreview(preview);
        for (const item of fields) setText(item, name);
        for (const item of fields) item.classList.remove("g-disabled");
      } else {
        let referenced = false;
        for (let d = 0; d < this._elements.length; ++d)
          if (
            first.hasProperty("sref") &&
            (this._elements[d] as StyledElement).getReferencedStyle()
          )
            referenced = true;
        for (const item of previews) item.textContent = "";
        for (const item of previews) css(item, "display", "none");
        if (referenced && this._elements.length > 1) {
          for (const item of fields) setText(item, str(KEY, "text.multiple-selection"));
          for (const item of fields) item.classList.add("g-disabled");
        } else {
          for (const item of fields) setText(item, str(KEY, "text.no-style"));
          for (const item of fields) item.classList.remove("g-disabled");
        }
      }
    } else console.warn("GAppearanceProperties: empty _elements array");
  }

  _addPreview(source: string): void {
    const panel = this._panel as HTMLElement;
    const previews = findAll(panel, ".g-styles-preview");
    for (const item of previews) item.textContent = "";
    for (const item of previews) {
      css(item, "display", "");
      const image = el("img");
      cssAll(image, { height: "20px", width: "20px", borderRadius: "3px" });
      image.setAttribute("src", source);
      item.appendChild(image);
    }
  }

  _assignProperty(name: string, value: unknown, title: string): void {
    this._assignProperties([name], [value], title);
  }

  _assignProperties(names: string[], values: unknown[], title: string): void {
    if (this._document) {
      const editor = this._document.getEditor() as Editor;
      editor.beginTransaction();
      try {
        for (let a = 0; a < this._elements.length; ++a) {
          const element = this._elements[a] as StyledElement;
          const elementEditor = ElementEditor.getEditor(element);
          if (!(elementEditor && elementEditor.applyPropertiesToParts(names, values)))
            element.setProperties(names, values);
        }
      } finally {
        editor.commitTransaction(title);
      }
    } else console.warn("GAppearanceProperties: empty _document property");
  }

  _checkSyncState(): void {
    const enabled =
      this._elements &&
      this._elements.length > 0 &&
      (this._elements[0] as StyledElement).hasProperty("sref") &&
      !(this._elements[0] as StyledElement).equalsStyle();
    for (const sync of findAll(this._panel as HTMLElement, ".g-style-sync"))
      if (enabled) sync.classList.remove("g-disabled");
      else sync.classList.add("g-disabled");
  }

  override toString(): string {
    return "[Object GAppearanceProperties]";
  }
}
