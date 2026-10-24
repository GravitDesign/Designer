// Old: designer.browser.dev.js module 1656 (GItemProperties).
/**
 * "Click through" (clk) and, for shapes, "Scale with content" (scc) of
 * items that have item children. Shown when every inspected element is
 * an item and the first one has an item child.
 */
import { Image } from "../../engine/scene/image.ts";
import { Item } from "../../engine/scene/item.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Node } from "../../engine/scene/node.ts";
import { Shape } from "../../engine/scene/shape.ts";
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

function checkboxRow(
  attribute: string,
  boxClass: string,
  property: string,
  caption: HTMLElement,
  onChange: (checked: boolean) => void,
): HTMLElement {
  const box = el("input", boxClass);
  box.setAttribute("type", "checkbox");
  box.setAttribute("data-item-property", property);
  box.addEventListener("change", (event) =>
    onChange((event.target as HTMLInputElement).matches(":checked")),
  );
  const label = el("label", "g-checkbox-label");
  label.append(box, caption);
  const row = el("div");
  row.setAttribute(attribute, "true");
  return propertyRow(row, { columns: [{ width: "auto", content: label }] });
}

export class ItemProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _items: Item[] = [];

  override init(panel: HTMLElement): void {
    this._panel = panel;
    panel.classList.add("item-property-panel");
    const clickThrough = el("span");
    clickThrough.textContent = text("GItemProperties", "text.click-through");
    clickThrough.classList.add("clickElement");
    panel.appendChild(
      checkboxRow("major-item-only", "clk-checkbox", "clk", clickThrough, (checked) => {
        designer().stats("itemproperties_click_through");
        this._assignProperty("clk", checked);
      }),
    );
    const scale = el("span");
    scale.textContent = text("GItemProperties", "text.scale-with-content");
    panel.appendChild(
      checkboxRow("major-shape-only", "scc-checkbox", "scc", scale, (checked) => {
        designer().stats(
          "itemproperties_toggle_scale-with-content",
          checked ? "enable" : "disable",
        );
        this._assignProperty("scc", checked);
      }),
    );
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
        if (element instanceof Item) this._items.push(element);
      }
      if (
        this._items.length &&
        this._items.length === list.length &&
        this._hasChildItem(this._items[0] as Item)
      ) {
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
    const touch = designer().isTouchEnabled();
    for (const selector of [".clk-checkbox", ".scc-checkbox"])
      for (const box of panel.querySelectorAll<HTMLInputElement>(selector))
        if (touch) mountCheckboxSlider(box);
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
    const item = this._items[0] as Item;
    const panel = this._panel as HTMLElement;
    const all = (selector: string) => [...panel.querySelectorAll<HTMLElement>(selector)];
    const itemRows = all("[major-item-only]");
    const shapeRows = all("[major-shape-only]");
    const display = (rows: HTMLElement[], value: string) => {
      for (const row of rows) row.style.setProperty("display", value);
    };
    if (this._hasChildItem(item)) {
      display(itemRows, "");
      for (const box of panel.querySelectorAll<HTMLInputElement>(
        'input[data-item-property="clk"]',
      )) {
        box.disabled = false;
        box.checked = !!item.getProperty("clk");
      }
      if (item instanceof Shape && !(item instanceof Image && item.getProperty("dblMode"))) {
        display(shapeRows, "");
        for (const row of itemRows) row.classList.add("item-click-through");
        for (const row of shapeRows) row.classList.add("shape-scale-with-content");
        for (const box of panel.querySelectorAll<HTMLInputElement>(
          'input[data-item-property="scc"]',
        ))
          box.checked = !!item.getProperty("scc");
      } else {
        display(shapeRows, "none");
        for (const row of itemRows) row.classList.remove("item-click-through");
        for (const row of shapeRows) row.classList.remove("shape-scale-with-content");
      }
    } else {
      display(itemRows, "none");
      display(shapeRows, "none");
      for (const row of itemRows) row.classList.remove("item-click-through");
      for (const row of shapeRows) row.classList.remove("shape-scale-with-content");
    }
  }

  _assignProperty(property: string, value: boolean, title?: string): void {
    if ("clk" == property || "scc" == property) {
      const editor = editorOf(this._document as Document);
      editor.beginTransaction();
      try {
        for (let i = 0; i < this._items.length; ++i) {
          const item = this._items[i] as Item;
          if (this._hasChildItem(item) && ("clk" == property || item instanceof Shape))
            item.setProperties([property], [value]);
        }
      } finally {
        editor.commitTransaction(title);
      }
    }
  }

  _hasChildItem(item: Node): boolean {
    return (
      !!item.hasMixin(Node.Container) &&
      !(item as unknown as ContainerNode).acceptChildren(
        (child: Node) => !(child instanceof Item),
        false,
        false,
      )
    );
  }

  override toString(): string {
    return "[Object GItemProperties]";
  }
}
