// Old: designer.browser.dev.js module 1654 (GFrameProperties).
/**
 * The "Frame" checkbox of layers: a layer with a frame clips its content
 * to the page. Shown when every inspected element is a layer.
 */
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import {
  editorOf,
  el,
  Properties,
  sceneOf,
  propertyRow,
  text,
  type InspectedElements,
} from "./properties.ts";

export class FrameProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _items: Layer[] = [];

  override init(panel: HTMLElement): void {
    this._panel = panel;
    panel.classList.add("frame-property-panel");
    const checkbox = el("input", "frm-checkbox");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("data-item-property", "frm");
    checkbox.addEventListener("change", (event) => {
      const checked = (event.target as HTMLInputElement).matches(":checked");
      designer().stats("frameproperties_toggle_frame", checked ? "enable" : "disable");
      this._assignProperty(
        "frm",
        checked,
        checked
          ? text("GFrameProperties", "text.switch-frame")
          : text("GFrameProperties", "text.frame-off"),
      );
    });
    const caption = el("span");
    caption.textContent = text("GFrameProperties", "text.frame");
    const label = el("label", "g-checkbox-label");
    label.append(checkbox, caption);
    const row = el("div");
    row.setAttribute("major-item-only", "true");
    row.classList.add("item-frame");
    propertyRow(row, { columns: [{ width: "auto", content: label }] });
    panel.appendChild(row);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    this._updateUI();
    if (this._document) {
      designer().removeEventListener(SettingChangedEvent, this._settingChanged, this);
      // The old code removed the scene listener without its target.
      sceneOf(this._document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
      );
      this._document = null;
    }
    this._items = [];
    if (document) {
      const list = elements as InspectedElements;
      designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Layer) this._items.push(element);
      }
      if (this._items.length && this._items.length === list.length) {
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        this._updateProperties();
        return true;
      }
    }
    return false;
  }

  _updateUI(): void {
    const panel = this._panel as HTMLElement;
    for (const box of panel.querySelectorAll<HTMLInputElement>(".frm-checkbox"))
      if (designer().isTouchEnabled()) mountCheckboxSlider(box);
      else unmountCheckboxSlider(box);
  }

  _settingChanged(event: SettingChangedEvent): void {
    if (event.key === "touch") this._updateUI();
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._items.length > 0 && this._items[0] === event.node)
      this._updateProperties();
  }

  _updateProperties(): void {
    const layer = this._items[0] as Layer;
    const panel = this._panel as HTMLElement;
    for (const row of panel.querySelectorAll<HTMLElement>("[major-item-only]"))
      row.style.setProperty("display", "");
    for (const box of panel.querySelectorAll<HTMLInputElement>('input[data-item-property="frm"]')) {
      box.disabled = false;
      box.checked = !!layer.getProperty("frm");
    }
  }

  _assignProperty(property: string, value: boolean, title: string): void {
    if ("frm" == property) {
      const editor = editorOf(this._document as Document);
      editor.beginTransaction();
      try {
        for (let i = 0; i < this._items.length; ++i) {
          const item = this._items[i] as Layer & { setFrame?: (on: boolean) => void };
          if (item.setFrame) item.setFrame(value);
        }
      } finally {
        editor.commitTransaction(title);
      }
    }
  }

  override toString(): string {
    return "[Object GFrameProperties]";
  }
}
