// Old: designer.browser.dev.js module 1661 (GSymbolsSidebar).
/**
 * The Symbols sidebar on the left: a toolbar with Delete Symbol and
 * Create New Symbol, and the symbol masters of the active document as
 * tiles (symbols-panel.ts). A click on a tile selects the master and
 * zooms to it, a double click selects the master and its instances.
 *
 * It extends View with GSidebar's defaults (module 806) written out,
 * because shell/sidebar.ts (app-shell-storage) doesn't exist yet; switch
 * the base to Sidebar once it does.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { Editor } from "../../editor/editor.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { applicationManager } from "../actions/host.ts";
import { CreateSymbolAction } from "../actions/modify/create-symbol-action.ts";
import { FitSelectionAction } from "../actions/view/fit-selection-action.ts";
import type { Document } from "../document/document.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { css, cssAll } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import type { SidebarLike, SidebarTouchTool } from "../shell/layout.ts";
import { Sidebar } from "../shell/sidebar.ts";
import { View } from "../shell/view.ts";
import { initAccordion, toggleAccordionOpen } from "../widgets/accordion.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { SymbolsPanel } from "./symbols-panel.ts";

/** Stops the browser from opening a file dropped on the toolbar or the tiles. */
function swallowDrops(element: HTMLElement): void {
  for (const type of ["dragover", "dragenter", "drop"])
    element.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
}

function iconSpan(className: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.classList.add(className);
  return span;
}

export class SymbolsSidebar extends Sidebar implements SidebarLike {
  static ID = "symbols";
  static TITLE = new LocaleKey("GSymbolsSidebar", "title");

  _htmlElement: HTMLElement | null = null;
  _newSymbolButton: HTMLButtonElement | null = null;
  _symbolsToolbar: HTMLElement | null = null;
  _symbolsPanel: SymbolsPanel | null = null;
  _document: Document | null = null;

  override getId(): string {
    return SymbolsSidebar.ID;
  }

  override getTitle(): LocaleKey {
    return SymbolsSidebar.TITLE;
  }

  override isEnabled(): boolean {
    return true;
  }

  override isVisible(): boolean {
    return !!applicationManager().isEditingEnabled();
  }

  override getOrientation(): string {
    return "left";
  }

  override getMinimumWidth(): number {
    return 250;
  }

  override getDefaultWidth(): number {
    return 250;
  }

  override isResizeable(): boolean {
    return true;
  }

  override relayout(): void {
    (this._symbolsPanel as SymbolsPanel).relayout();
  }

  override init(htmlElement: HTMLElement): void {
    this._htmlElement = htmlElement;
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar symbols-toolbar";
    const label = document.createElement("label");
    css(label, "flex-grow", "1");
    label.textContent = Locale.get(new LocaleKey("GSymbolsSidebar", "text.symbols")) as string;
    toolbar.appendChild(label);
    swallowDrops(toolbar);
    htmlElement.appendChild(toolbar);
    this._symbolsToolbar = toolbar;

    const deleteButton = document.createElement("button");
    deleteButton.setAttribute(
      "data-title",
      Locale.get(new LocaleKey("GSymbolsSidebar", "action.delete-symbol")) as string,
    );
    deleteButton.addEventListener("click", () => this._deleteSymbol());
    deleteButton.append(iconSpan("gravit-icon-trash"), iconSpan("gravit-icon-touch-trash"));
    toolbar.appendChild(deleteButton);
    attachRichTooltip(
      deleteButton,
      RichTooltipConfig.from({
        title: Locale.get(
          new LocaleKey("GSymbolsSidebar", "text.delete-symbol-tooltip-title"),
        ) as string,
        description: Locale.get(
          new LocaleKey("GSymbolsSidebar", "text.delete-symbol-tooltip-description"),
        ) as string,
        learnMore: "",
      }),
    );

    const newButton = document.createElement("button");
    newButton.setAttribute(
      "data-title",
      Locale.get(new LocaleKey("GSymbolsSidebar", "action.create-symbol")) as string,
    );
    newButton.addEventListener("click", () => {
      designer().stats("symbols_new_symbol");
      // newSymbolClick always returns false, so this never opens.
      if ((this._symbolsPanel as SymbolsPanel).newSymbolClick()) {
        toggleAccordionOpen(toolbar, true);
        initAccordion(toolbar);
      }
    });
    newButton.append(iconSpan("gravit-icon-plus"), iconSpan("gravit-icon-touch-plus"));
    toolbar.appendChild(newButton);
    newButton.classList.add("g-disabled");
    attachRichTooltip(
      newButton,
      RichTooltipConfig.from({
        title: Locale.get(
          new LocaleKey("GSymbolsSidebar", "text.create-symbol-tooltip-title"),
        ) as string,
        description: Locale.get(
          new LocaleKey("GSymbolsSidebar", "text.create-symbol-tooltip-description"),
        ) as string,
        learnMore: "",
      }),
    );
    this._newSymbolButton = newButton;

    const container = document.createElement("div");
    container.classList.add("symbols-container");
    htmlElement.appendChild(container);
    container.addEventListener("click", (event) => {
      designer().stats("symbols_click_symbol");
      const target = event.target as Element | null;
      const panel = this._symbolsPanel as SymbolsPanel;
      if (
        (target === container || (!!target && target.classList.contains("g-symbols-panel"))) &&
        panel.isSelected()
      ) {
        const editor = (this._document as Document).getEditor() as Editor;
        editor.updateSelection(
          false,
          (editor.getSelection() || [])
            .slice()
            .filter((node) => !(node instanceof Symbol && node.isMaster())),
        );
      }
    });
    container.addEventListener("scroll", () => {
      if (document.body.classList.contains("g-touch")) {
        let top = container.scrollTop;
        const color = "light" == designer().getSetting("theme") ? "DFDFDF" : "2E2E2E";
        top = top > 20 ? 20 : top;
        for (const bar of document.querySelectorAll<HTMLElement>(".symbols-toolbar"))
          cssAll(bar, { "box-shadow": `0 0 25px ${top}px #${color}` });
      }
    });

    const panelElement = document.createElement("div");
    panelElement.classList.add("symbols");
    swallowDrops(panelElement);
    container.appendChild(panelElement);
    this._symbolsPanel = new SymbolsPanel(panelElement, {
      moveCallback: () => undefined,
      clickCallback: (symbol) => this._clickSymbolCallback(symbol),
      dblClickCallback: (symbol) => this._dblClickSymbolCallback(symbol),
      startDraggingCallback: () => {
        console.log("start dragging cb");
        return null;
      },
    });
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
  }

  /** Follows the active document: its scene's masters and its selection. */
  _documentEvent(event: DocumentEvent): void {
    const panel = this._symbolsPanel as SymbolsPanel;
    if (event.type === DocumentEvent.Type.Activated) {
      this._document = event.document as Document;
      panel.setScene(this._document.getScene() as Scene);
      this.trigger(View.UPDATE_EVENT);
      (this._document.getEditor() as Editor).addEventListener(
        Editor.SelectionChangedEvent,
        this._selectionUpdate,
        this,
      );
    } else if (event.type === DocumentEvent.Type.Deactivated) {
      panel.setScene(null);
      (this._document?.getEditor() as Editor).removeEventListener(
        Editor.SelectionChangedEvent,
        this._selectionUpdate,
        this,
      );
      this._document = null;
      this.trigger(View.UPDATE_EVENT);
    }
  }

  /** Delete Symbol: removes the highlighted master and its instances, in one undo step. */
  _deleteSymbol(): void {
    designer().stats("symbols_delete_symbol");
    const scene = (this._document as Document).getScene() as Scene;
    const panel = this._symbolsPanel as SymbolsPanel;
    if (panel.isSelected())
      Editor.tryRunTransaction(
        scene,
        () => panel.removeSelected(),
        Locale.get(new LocaleKey("GSymbolsSidebar", "action.delete-symbol")) as string,
      );
  }

  /** A click on a tile: activates the master's page, selects it and zooms to it. */
  _clickSymbolCallback(symbol: Symbol): void {
    if (!symbol || !symbol.isMaster()) return;
    const document = this._document as Document;
    const editor = document.getEditor();
    if (!editor) return;
    const page = Editor.getElementPage(symbol);
    if (page) (document.getScene() as Scene).setActivePage(page);
    editor.clearSelection();
    editor.updateSelection(false, [symbol]);
    if (editor.hasSelection())
      designer().executeAction(FitSelectionAction.ID, undefined, undefined, true);
  }

  /** A double click on a tile: selects the master and all its instances. */
  _dblClickSymbolCallback(symbol: Symbol): void {
    if (!symbol || !symbol.isMaster()) return;
    const document = this._document as Document;
    const editor = document.getEditor();
    const scene = document.getScene() as Scene;
    const selection: Symbol[] = [symbol];
    scene.visitLinks(symbol, (linked) => {
      if (linked instanceof Symbol) selection.push(linked);
    });
    if (editor) {
      editor.clearSelection();
      editor.updateSelection(false, selection);
    }
  }

  /** Create New Symbol is enabled while Create Symbol can run. */
  _selectionUpdate(): void {
    const button = this._newSymbolButton as HTMLButtonElement;
    const can = designer().canExecuteAction(CreateSymbolAction.ID);
    const disabled = button.classList.contains("g-disabled");
    if (can && disabled) button.classList.remove("g-disabled");
    else if (!can && !disabled) button.classList.add("g-disabled");
  }

  override getTouchTools(): SidebarTouchTool[] {
    return [
      new TouchTool({
        id: "symbols",
        sidebar: this.getId(),
        icon: "gravit-icon-touch-newSymbols",
        panel: ".symbols-container",
        toolbar: ".symbols-toolbar",
      }) as unknown as SidebarTouchTool,
    ];
  }

  override toString(): string {
    return "[Object GSymbolsSidebar]";
  }
}
