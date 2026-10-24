// Old: designer.browser.dev.js module 1272 (GSliceProperties).
/**
 * Position, size, "trim transparent pixels" and the background color of
 * slices. Shown when every inspected element is a slice; with several
 * slices the position and size boxes are empty and disabled.
 *
 * Plain DOM, as the old jQuery code built it (see properties.ts for the
 * contract with the inspector sidebar).
 */
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { ModifiedEvent } from "../../editor/editor.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import type { Document } from "../document/document.ts";
import type { SidebarTouchTool } from "../shell/layout.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { InputBox } from "../widgets/input-box.ts";
import { chooserOf, clickPreview, eventArgs, patternChooser } from "./color-deps.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

/** The related data of an undone or redone transaction, as the sidebar passes it on. */
interface RelatedData {
  evtType?: number;
  chooserOn?: boolean;
  slicePattern?: boolean;
}

export class SliceProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _slices: Slice[] = [];
  _ownChange = false;
  _chooserElem: HTMLElement | null = null;

  override init(panel: HTMLElement): void {
    this._panel = panel;
    panel.classList.add("slice-property-panel");
    this.setTouchTools([TouchTool.APPEARANCE_TOUCH_TOOL as unknown as SidebarTouchTool]);
    const create = (property: string): HTMLElement => this._createInput(property);
    const row = (
      className: string,
      label: string | null,
      columns: Parameters<typeof propertyRow>[1]["columns"],
    ) => {
      const element = el("div", className);
      propertyRow(element, label === null ? { columns } : { label, columns });
      panel.appendChild(element);
    };
    row("slice-position-left-row", text("GCommonNames", "text.left"), [
      { width: "44%", content: create("x") },
    ]);
    row("slice-position-top-row", text("GCommonNames", "text.top"), [
      { width: "44%", content: create("y") },
    ]);
    row("slice-size-width-row", text("GCommonNames", "text.width"), [
      { width: "44%", content: create("w") },
    ]);
    row("slice-size-height-row", text("GCommonNames", "text.height"), [
      { width: "44%", content: create("h") },
    ]);
    row("slice-trm-row", null, [{ width: "100%", content: create("trm") }]);
    row("slice-bg-row", null, [
      { width: "80%", content: create("cls-check") },
      { width: "20%", content: create("cls") },
    ]);
  }

  private _createInput(property: string): HTMLElement {
    if ("x" === property || "y" === property || "w" === property || "h" === property) {
      const input = el("input", property + "-input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("sliceproperties_change_size");
        this._assignProperty(
          property,
          sceneOf(this._document as Document).stringToPoint(
            (InputBox.of(input) as InputBox).value(),
          ),
        );
      });
      new InputBox(input, { minValue: "w" === property || "h" === property ? 1e-10 : null });
      return input;
    }
    if ("cls" === property) {
      const button = el("button");
      button.setAttribute("data-property", property);
      patternChooser(button, { types: [Color], hasOpacity: false });
      button.addEventListener("chooseropen", () => {
        editorOf(this._document as Document).hideSelection();
        this._chooserElem = button;
      });
      button.addEventListener("chooserclose", () => {
        if (this._document) editorOf(this._document).resetHideSelection();
        this._chooserElem = null;
      });
      button.addEventListener("patternchange", (event) => {
        // The old handler took (event, pattern, opacity, temporary,
        // fromChooser) and passed temporary on as the third argument.
        const [pattern, , temporary, fromChooser] = eventArgs(event) as [
          unknown,
          unknown,
          boolean | undefined,
          unknown,
        ];
        let related: RelatedData | null = null;
        if (fromChooser) related = { chooserOn: true, slicePattern: true };
        this._assignProperty(property, pattern, temporary, related);
      });
      return button;
    }
    if ("cls-check" === property) {
      const label = el("label", "g-checkbox-label");
      const input = el("input", "cls-check-checkbox");
      input.setAttribute("type", "checkbox");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("sliceproperties_change_background");
        this._assignProperty("cls", input.checked ? RGBColor.WHITE : null);
      });
      label.appendChild(input);
      label.appendChild(spanHtml(text("GCommonNames", "text.background-color")));
      return label;
    }
    if ("trm" === property) {
      const label = el("label", "g-checkbox-label");
      const input = el("input", "trm-checkbox");
      input.setAttribute("type", "checkbox");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("sliceproperties_trim_transparent");
        this._assignProperty(property, input.checked);
      });
      label.appendChild(input);
      label.appendChild(spanHtml(text("GSliceProperties", "text.trim-transparent-pixels")));
      return label;
    }
    throw new Error("Unknown input property: " + property);
  }

  override update(
    document: Document | null,
    elements: InspectedElements | null,
    data?: unknown,
  ): boolean {
    this._updateUI();
    if (this._ownChange) return true;
    if (this._chooserElem) chooserOf(this._chooserElem)?.close();
    if (this._document) {
      sceneOf(this._document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
        this,
      );
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._slices = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Slice) this._slices.push(element);
      }
      if (this._slices.length && this._slices.length === list.length) {
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        this._updateProperties((data as RelatedData | null) || null);
        return true;
      }
    }
    return false;
  }

  /** The touch layout shows the checkboxes as sliders and x/y/w/h labels in the boxes. */
  _updateUI(): void {
    const panel = this._panel as HTMLElement;
    const removeLabel = (input: Element | null): void => {
      const previous = input ? input.previousElementSibling : null;
      if (previous) previous.remove();
    };
    const addLabel = (input: Element | null, label: string): void => {
      if (!input || input.previousElementSibling) return;
      const span = el("span", "g-input-label");
      span.textContent = label;
      input.before(span);
    };
    const left = panel.querySelector(".slice-position-left-row .property-label span");
    const width = panel.querySelector(".slice-size-width-row .property-label span");
    const x = panel.querySelector(".x-input");
    const y = panel.querySelector(".y-input");
    const w = panel.querySelector(".w-input");
    const h = panel.querySelector(".h-input");
    const checkboxes = [
      panel.querySelector<HTMLInputElement>(".trm-checkbox"),
      panel.querySelector<HTMLInputElement>(".cls-check-checkbox"),
    ];
    if (designer().isTouchEnabled()) {
      for (const box of checkboxes) if (box) mountCheckboxSlider(box);
      if (left) left.textContent = text("GCommonNames", "text.position");
      if (width) width.textContent = text("GCommonNames", "text.size");
      addLabel(x, "x");
      addLabel(y, "y");
      addLabel(w, "w");
      addLabel(h, "h");
    } else {
      for (const box of checkboxes) if (box) unmountCheckboxSlider(box);
      if (left) left.textContent = text("GCommonNames", "text.left");
      if (width) width.textContent = text("GCommonNames", "text.width");
      removeLabel(x);
      removeLabel(y);
      removeLabel(w);
      removeLabel(h);
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._slices.length > 0 && this._slices[0] === event.node)
      this._updateProperties();
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateProperties();
    if ("touch" === event.key) this._updateUI();
  }

  _updateProperties(data?: RelatedData | null): void {
    const panel = this._panel as HTMLElement;
    const scene = sceneOf(this._document as Document);
    const first = this._slices[0] as Slice;
    const show = (property: string): void => {
      const input = panel.querySelector<HTMLInputElement>(
        'input[data-property="' + property + '"]',
      );
      if (!input) return;
      const box = InputBox.of(input) as InputBox;
      if (this._slices.length > 1) {
        box.value(null);
        input.disabled = true;
      } else {
        box.value(
          scene.pointToString(
            first.getProperty(property) as number,
            scene.getOptimalDecimalsCount(),
          ),
        );
        input.disabled = false;
      }
    };
    show("x");
    show("y");
    show("w");
    show("h");
    const background = first.getProperty("cls");
    for (const check of panel.querySelectorAll<HTMLInputElement>('[data-property="cls-check"]'))
      check.checked = !!background;
    for (const chooser of panel.querySelectorAll<HTMLButtonElement>('[data-property="cls"]')) {
      chooser.disabled = !background;
      chooserOf(chooser)?.value(first.getProperty("cls") as Color | null);
    }
    for (const trim of panel.querySelectorAll<HTMLInputElement>('input[data-property="trm"]'))
      trim.checked = !!first.getProperty("trm");
    if (
      data &&
      (data.evtType == ModifiedEvent.Type.Undo || data.evtType == ModifiedEvent.Type.Redo) &&
      data.chooserOn &&
      data.slicePattern
    ) {
      for (const preview of panel.querySelectorAll('[data-property="cls"] .preview'))
        clickPreview(preview, null);
    }
  }

  _assignProperty(
    property: string,
    value: unknown,
    temporary?: boolean,
    related?: RelatedData | null,
  ): void {
    this._assignProperties([property], [value], temporary, related);
  }

  _assignProperties(
    properties: string[],
    values: unknown[],
    temporary?: boolean,
    related?: RelatedData | null,
  ): void {
    // Sic: true is setProperties' "custom" argument; see "Slice background
    // preview writes a custom property" in QUESTIONS.md.
    if (temporary) {
      for (let i = 0; i < this._slices.length; ++i)
        (this._slices[i] as Slice).setProperties(properties, values, true);
      return;
    }
    this._ownChange = true;
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      for (let i = 0; i < this._slices.length; ++i)
        (this._slices[i] as Slice).setProperties(properties, values);
    } finally {
      editor.commitTransaction(
        text("GSliceProperties", "action.modify-slice-properties"),
        related || null,
      );
      this._ownChange = false;
    }
  }

  override toString(): string {
    return "[Object GSliceProperties]";
  }
}

/** `$("<span>" + html + "</span>")`: the old code built these spans from markup. */
function spanHtml(html: string): HTMLSpanElement {
  const span = el("span");
  span.innerHTML = html;
  return span;
}
