// Old: designer.browser.dev.js module 1655 (GGroupFrameProperties).
/**
 * The Group / Frame select of groups: a group with a frame clips its
 * children to its first child. Shown when every inspected element is a
 * group.
 */
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Group } from "../../engine/scene/group.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import {
  editorOf,
  el,
  Properties,
  sceneOf,
  propertyRow,
  text,
  type InspectedElements,
} from "./properties.ts";

export class GroupFrameProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _items: Group[] = [];

  override init(panel: HTMLElement): void {
    this._panel = panel;
    panel.classList.add("group-frame-property-panel");
    const select = el("select");
    select.setAttribute("data-item-property", "frm");
    select.addEventListener("change", (event) => {
      const frame = "1" == (event.target as HTMLSelectElement).value;
      designer().stats("groupframeproperties_toggle_frame", frame ? "enable" : "disable");
      this._assignProperty(
        "frm",
        frame,
        frame
          ? text("GGroupFrameProperties", "text.switch-frame")
          : text("GGroupFrameProperties", "text.switch-group"),
      );
    });
    const group = el("option");
    group.setAttribute("value", "0");
    group.textContent = text("GGroupFrameProperties", "text.group");
    const frame = el("option");
    frame.setAttribute("value", "1");
    frame.textContent = text("GGroupFrameProperties", "text.frame");
    select.append(group, frame);
    const row = el("div", "group-frame-row");
    row.setAttribute("major-item-only", "true");
    propertyRow(row, { columns: [{ width: "auto", content: select }] });
    panel.appendChild(row);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
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
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Group) this._items.push(element);
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

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._items.length > 0 && this._items[0] === event.node)
      this._updateProperties();
  }

  _updateProperties(): void {
    const group = this._items[0] as Group;
    const panel = this._panel as HTMLElement;
    for (const row of panel.querySelectorAll<HTMLElement>("[major-item-only]"))
      row.style.setProperty("display", "");
    for (const select of panel.querySelectorAll<HTMLSelectElement>('[data-item-property="frm"]')) {
      select.disabled = false;
      select.value = group.getProperty("frm") ? "1" : "0";
    }
  }

  _assignProperty(property: string, value: boolean, title: string): void {
    if ("frm" == property) {
      const editor = editorOf(this._document as Document);
      editor.beginTransaction();
      try {
        for (let i = 0; i < this._items.length; ++i) {
          const item = this._items[i] as Group & { setFrame?: (on: boolean) => void };
          if (item.setFrame) item.setFrame(value);
        }
      } finally {
        editor.commitTransaction(title);
      }
    }
  }

  override toString(): string {
    return "[Object GGroupFrameProperties]";
  }
}
