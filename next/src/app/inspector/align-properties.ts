// Old: designer.browser.dev.js module 1274 (GAlignProperties).
/**
 * Transform mode with two or more elements: the justify buttons and the
 * spacing boxes that distribute the elements with a fixed gap (Enter in
 * a box runs the distribute action with that gap).
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { formatNumber } from "../../engine/core/util.ts";
import { Element } from "../../engine/scene/element.ts";
import { Page } from "../../engine/scene/page.ts";
import { Editor } from "../../editor/editor.ts";
import { AlignAction } from "../actions/modify/align-action.ts";
import { DistributeAction } from "../actions/modify/distribute-action.ts";
import { InputBox } from "../widgets/input-box.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import {
  el,
  Properties,
  sceneOf,
  propertyRow,
  text,
  type InspectedElements,
} from "./properties.ts";

export class AlignProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _elements: InspectedElements = [];

  override isGroup(): boolean {
    return false;
  }

  override init(panel: HTMLElement): void {
    this._panel = panel;
    const button = (type: string) => {
      const id = AlignAction.ID + "." + type;
      const action = designer().getAction(id);
      const element = el("button");
      element.setAttribute("data-action", id);
      element.addEventListener("click", (event) => this._executeAction(event));
      element.textContent = String(
        Locale.get((action as NonNullable<typeof action>).getTitle()) ?? "",
      );
      return element;
    };
    panel.appendChild(el("hr"));
    panel.appendChild(
      propertyRow(el("div"), {
        columns: [
          { width: "45%", content: button(Editor.ArrangeAlignType.AlignJustifyHorizontal) },
          { width: "10%" },
          { width: "45%", content: button(Editor.ArrangeAlignType.AlignJustifyVertical) },
        ],
      }),
    );
    const space = (type: string) => {
      const input = el("input");
      input.addEventListener("keydown", (event) => this._spaceEvent(event));
      input.setAttribute("type", "text");
      input.setAttribute("data-dist", type);
      input.value = "1";
      new InputBox(input, { minValue: 1 });
      return input;
    };
    panel.appendChild(
      propertyRow(el("div"), {
        columns: [
          {
            width: "45%",
            prefix: { label: text("GAlignProperties", "text.space-x"), width: "50px" },
            content: space(DistributeAction.Type.Horizontal),
          },
          { width: "10%" },
          {
            width: "45%",
            prefix: { label: text("GAlignProperties", "text.space-y"), width: "50px" },
            content: space(DistributeAction.Type.Vertical),
          },
        ],
      }),
    );
  }

  _executeAction(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest("[data-action]");
    const id = target ? target.getAttribute("data-action") : null;
    if (id) designer().executeAction(id, undefined, "alignproperties");
  }

  _spaceEvent(event: KeyboardEvent): void {
    if (13 === event.keyCode) {
      const input = (event.target as HTMLElement).closest("input") as HTMLInputElement;
      const type = input.getAttribute("data-dist");
      const box = InputBox.of(input) as InputBox;
      const distance = sceneOf(this._document as Document).stringToPoint(box.value());
      if (!isNaN(distance as number) && (distance as number) > 0)
        designer().executeAction(
          DistributeAction.ID + "." + type,
          [this._elements, null, distance],
          "shortcut",
        );
      this._updateDisplayValues();
    }
  }

  override isAvailable(transformMode: boolean): boolean {
    return true === transformMode;
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      this._document = null;
      // The old code removed the listener without its target.
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
    }
    this._elements = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i] as InspectedElements[number];
        if (element.hasMixin(Element.Transform) && !(element instanceof Page))
          this._elements.push(element);
      }
      if (this._elements.length >= 2 && this._elements.length === list.length) {
        this._document = document;
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        return true;
      }
    }
    return false;
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateDisplayValues();
  }

  _updateDisplayValues(): void {
    const panel = this._panel as HTMLElement;
    for (const input of panel.querySelectorAll<HTMLInputElement>("[data-dist]")) {
      const box = InputBox.of(input) as InputBox;
      let value = parseFloat(box.value());
      value = isNaN(value) || value <= 0 || !value ? 1 : value;
      box.value(formatNumber(value, sceneOf(this._document as Document).getOptimalDecimalsCount()));
    }
  }

  override toString(): string {
    return "[Object GAlignProperties]";
  }
}
