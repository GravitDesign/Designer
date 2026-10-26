// Old: designer.browser.dev.js module 1658 (GSymbolProperties).
/**
 * The "Symbol" panel of symbol instances: a select that swaps the
 * selected instance for an instance of another symbol, selects the
 * master ("(Master)") or detaches the instance ("(Detach Symbol)").
 * Shown when an instance (not a master) with a master is inspected.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { DetachSymbolAction } from "../actions/modify/detach-symbol-action.ts";
import { FitSelectionAction } from "../actions/view/fit-selection-action.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { getData, setData } from "./paint-dom.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";
import { nameAsTyped } from "../sidebars/layer-item.ts";

export class SymbolProperties extends Properties {
  _panel: HTMLElement | null = null;
  _toolbar: HTMLElement | null = null;
  override _document: Document | null = null;
  _symbols: Symbol[] | null = null;
  /** Overrides of instances swapped away, by "<old master>_<new master>" multireference ids. */
  _disabledSiblingMaps: Record<string, Record<string, unknown>> | null = null;

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._panel = panel;
    this._toolbar = toolbar;
    toolbar.classList.add("filled");
    toolbar.classList.add("page-toolbar");
    toolbar.classList.add("symbol-instance-toolbar");
    panel.classList.add("symbol-instance-panel");
    const select = el("select");
    select.setAttribute("data-property", "symbol-instance");
    select.addEventListener("change", () => this._instanceChange(select));
    const title = el("label");
    title.textContent = text("GSymbolProperties", "title");
    toolbar.appendChild(title);
    const caption = el("span");
    caption.innerHTML = text("GSymbolProperties", "text.chooseinstance");
    const row = el("div", "chooseinstance-row");
    propertyRow(row, {
      columns: [
        { clazz: "chooseinstance-title-col", content: caption },
        { clazz: "chooseinstance-select-col", content: select },
      ],
    });
    panel.appendChild(row);
  }

  private _instanceChange(select: HTMLSelectElement): void {
    designer().stats("symbolproperties_select_swap");
    const document = this._document as Document;
    const scene = sceneOf(document);
    let editor = editorOf(document);
    const activatePageOf = (node: Node): void => {
      const page = node.findParent((parent) => parent instanceof Page);
      if (page && scene.getActivePage() !== page) scene.setActivePage(page as Page);
    };
    const value = select.value;
    if (value && "0" !== value && "-1" !== value) {
      const option = select.querySelector('option[value="' + value + '"]');
      const target = option ? getData<Symbol>(option, "symbol") : undefined;
      if (target) {
        editor = editorOf(document);
        editor.beginTransaction();
        const symbols = this._symbols as Symbol[];
        const current = symbols[0] as Symbol;
        const master = current.getMasterSymbol() as Symbol;
        const disabled = current.getDisabledSiblings();
        const swapped = current.swapWith(target) as Symbol;
        if (!this._disabledSiblingMaps) this._disabledSiblingMaps = {};
        if (disabled) {
          const key = master.getMultireferenceId() + "_" + swapped.getMultireferenceId();
          this._disabledSiblingMaps[key] = disabled;
        }
        const restored =
          this._disabledSiblingMaps[
            target.getMultireferenceId() + "_" + current.getMultireferenceId()
          ];
        if (restored) swapped.desynchronize(restored);
        if (swapped) {
          activatePageOf(swapped);
          editor.updateSelection(false, [swapped]);
        }
        editor.commitTransaction("Swap symbol instance");
      }
    } else if (value && "0" === value) {
      const master = (this._symbols as Symbol[])[0]?.getMasterSymbol() as Symbol;
      editor.beginTransaction();
      activatePageOf(master);
      editor.clearSelection();
      editor.updateSelection(false, [master]);
      if (editor.hasSelection())
        designer().executeAction(FitSelectionAction.ID, undefined, undefined, true);
      editor.commitTransaction("Select master symbol");
    } else if (value && "-1" === value) {
      designer().executeAction(DetachSymbolAction.ID, undefined, undefined, true);
      editor.updateSelection(false, (editor.getSelection() as Node[]).slice());
    }
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    this._updateUI();
    if (this._document) {
      designer().removeEventListener(SettingChangedEvent, this._settingChanged, this);
      this._document = null;
    }
    this._symbols = null;
    if (!document) return false;
    // Added before the selection check; see "Symbol panel adds a settings
    // listener on every update" in QUESTIONS.md.
    designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
    const symbols = (elements as InspectedElements).filter(
      (element): element is Symbol =>
        element instanceof Symbol && !element.isMaster() && !!element.getMasterSymbol(),
    );
    if (!symbols.length) return false;
    this._symbols = symbols.slice();
    this._document = document;
    this._updateProperties();
    return true;
  }

  /** Sic: the panel has no .frm-checkbox; the old code looked for one anyway. */
  _updateUI(): void {
    const boxes = (this._panel as HTMLElement).querySelectorAll<HTMLInputElement>(".frm-checkbox");
    for (const box of boxes) {
      if (designer().isTouchEnabled()) mountCheckboxSlider(box);
      else unmountCheckboxSlider(box);
    }
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._updateUI();
  }

  _updateProperties(): void {
    const scene = sceneOf(this._document as Document);
    const symbols = this._symbols as Symbol[];
    const first = symbols[0] as Symbol;
    const master = first.getMasterSymbol() as Symbol;
    let symbolList = scene.getSymbols() as Symbol[];
    let title: string;
    if (symbols.length > 1) {
      title = symbols.length + " " + text("GSymbolProperties", "text.instances");
    } else {
      title =
        nameAsTyped((first.getProperty("name") as string) || "") ||
        text("GSymbolProperties", "title");
      if (master.getProperty("name"))
        title +=
          " (" +
          text("GSymbolProperties", "text.instanceof") +
          " " +
          nameAsTyped(master.getProperty("name") as string);
      else title += " (" + text("GSymbolProperties", "text.instance");
      title += ")";
    }
    const label = (this._toolbar as HTMLElement).querySelector("label:first-child");
    if (label) label.textContent = title;
    const select = (this._panel as HTMLElement).querySelector<HTMLSelectElement>(
      'select[data-property="symbol-instance"]',
    ) as HTMLSelectElement;
    select.replaceChildren();
    let empty: HTMLOptionElement | undefined;
    if (designer().canExecuteAction(DetachSymbolAction.ID)) {
      select.insertAdjacentHTML(
        "beforeend",
        '<option value="-1">(' + Locale.get(DetachSymbolAction.TITLE) + ")</option>",
      );
      empty = el("option");
      empty.setAttribute("value", "-2");
      select.appendChild(empty);
    }
    let count = 0;
    if (!symbolList.length && master) symbolList = [master];
    if (symbolList.length) {
      select.classList.remove("g-disabled");
      select.removeAttribute("disabled");
    } else {
      select.classList.add("g-disabled");
      select.setAttribute("disabled", "");
    }
    let found = false;
    for (const symbol of symbolList) {
      const option = el("option");
      setData(option, "symbol", symbol);
      option.setAttribute("value", String(++count));
      option.textContent = nameAsTyped((symbol.getProperty("name") as string) || "");
      select.appendChild(option);
      if (master.getMultireferenceId() === symbol.getMultireferenceId()) {
        option.selected = true;
        found = true;
      }
    }
    // Sic: without the detach option there is no empty option either, and
    // this throws a TypeError, as before.
    if (!found) (empty as HTMLOptionElement).selected = true;
    if (master && master.getScene())
      select.insertAdjacentHTML(
        "beforeend",
        '<option value="0">(' + text("GSymbolProperties", "text.master") + ")</option>",
      );
  }

  override toString(): string {
    return "[Object GSymbolProperties]";
  }
}
