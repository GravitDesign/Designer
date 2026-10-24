// Old: designer.browser.dev.js module 1563 (GContextMenu's touch overlay).
/**
 * The context menu of the touch layout: an overlay
 * (`.g-overlay.context-menu-touch-overlay`) with rows of big buttons
 * instead of the desktop menu:
 *
 *     flip h/v | rotate left/right
 *     Paste [menu: in place, inside, here, replace, style]
 *     Create compound shape [menu: the boolean operations, nested compound]
 *     Convert to path [menu: path operations]
 *     Create symbol [menu: reset, detach, go to master]
 *     Text [menu]           (enabled with a text selected)
 *     Image [menu]          (enabled with an image selected)
 *     clip, mask | flatten, duplicate
 *     lock, hide | Select [the elements under the press]
 *
 * The context menu (menus/context-menu.ts) builds it with
 * createTouchContextMenu and opens it in touch mode; when it has opened,
 * the designer's ContextMenuOpened document event updates the buttons'
 * disabled state.
 *
 * Plain DOM inside the Overlay, as the old one: the menu buttons and the
 * enabled checks work on the elements directly.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Point } from "../../engine/math/point.ts";
import { Block } from "../../engine/scene/block.ts";
import { Image } from "../../engine/scene/image.ts";
import { Node } from "../../engine/scene/node.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { Text } from "../../engine/text/text.ts";
import { Editor } from "../../editor/editor.ts";
import { Action } from "../actions/action.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { DocumentEvent } from "../document/document-event.ts";
import type { ContextMenu, ContextMenuPosition } from "../menus/context-menu.ts";
import { Menu, MenuPosition } from "../menus/menu.ts";
import { MenuItem } from "../menus/menu-item.ts";
import { designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";
import { propertyRowElement } from "./property-row-element.ts";

/** The ids of the actions on the overlay (the old classes' ID constants). */
const ID = {
  transform: "arrange.transform",
  paste: "paste.paste",
  pasteInPlace: "edit.paste.in-place",
  pasteInside: "edit.paste.inside",
  pasteHere: "edit.paste.here",
  pasteReplace: "edit.paste.replace",
  pasteStyle: "edit.paste.style",
  merge: "modify.merge",
  nestedCompound: "modify.createnestedcompound",
  convertToPath: "modify.converttopath",
  vectorize: "modify.vectorize",
  convertToRawPath: "modify.converttorawpath",
  outline: "modify.ouline",
  offset: "modify.offset",
  simplify: "modify.simplify",
  joinPaths: "modify.join-paths",
  splitPath: "modify.split-path",
  splitLine: "modify.split-line",
  createSymbol: "modify.createsymbol",
  resetInstance: "modify.resetinstance",
  detachSymbol: "modify.detachsymbol",
  fitSelection: "view.zoom.fit-selection",
  attachToPath: "modify.attachToPath",
  detachFromPath: "modify.detachFromPath",
  selectByFontType: "edit.selectbyfonttype",
  clip: "modify.clip",
  maskWithShape: "modify.mask-with-shape",
  convertToImage: "modify.path2bmp",
  duplicate: "edit.duplicate",
} as const;

/** GContextMenu.ID: the component id the Paste Here item passes to isAvailable. */
const CONTEXT_MENU_ID = "context.menu";

const Transform = {
  FlipHorizontal: "flip-horizontal",
  FlipVertical: "flip-vertical",
  Rotate90Left: "rotate-90-left",
  Rotate90Right: "rotate-90-right",
} as const;

/** A menu entry that isn't an action. */
interface CustomItem {
  caption: string;
  click: () => void;
  icon: string;
  isEnabled?: () => boolean;
  update?: (item: MenuItem) => void;
}

type MenuEntry = Action | CustomItem;

interface ButtonOptions {
  action?: Action | null;
  label?: string;
  icon?: string;
  click?: (event: MouseEvent) => void;
  isEnabled?: (event?: ContextMenuPosition | null) => boolean;
  longButton?: boolean;
  active?: boolean;
  isMenu?: boolean;
}

interface CheckedElement {
  element: HTMLElement;
  isEnabled?: (event?: ContextMenuPosition | null) => boolean;
}

/** A selected node with its properties (the selection holds elements). */
type PropertyNode = Node & { setProperty(name: string, value: unknown): void };

interface PasteHere {
  setPosition(position: Point | null): void;
}

/** The image panel's actions (module 1268, inspector/image-crop.ts). */
type ImageAction = (image: unknown, ...args: unknown[]) => void;

/** gSelectedPanel (module 1711, sidebars/selected-panel.ts). */
type SelectedPanelClass = new (
  element: HTMLElement,
  options: { clickCallback(node: Node | null): void; renderFinishCallback(): void },
) => { setSelections(selections: unknown): unknown };

function text(group: string, key: string): string {
  return Locale.get(new LocaleKey(group, key)) as string;
}

function action(id: string): Action | null {
  return designer().getAction(id);
}

function editor(): Editor {
  return (designer().getActiveDocument() as unknown as { getEditor(): Editor }).getEditor();
}

function imageAction(name: string): ImageAction | null {
  return lateExport<ImageAction>("inspector/image-crop.ts", name);
}

function setDisabled(element: HTMLElement, disabled: boolean): void {
  // Old: element.attr("disabled", flag): disabled="disabled" or no attribute.
  if (disabled) element.setAttribute("disabled", "disabled");
  else element.removeAttribute("disabled");
}

/** Builds the touch overlay for `contextMenu`; returns the overlay's content element. */
export function createTouchContextMenu(contextMenu: ContextMenu): HTMLElement {
  return new TouchContextMenu(contextMenu).element;
}

export class TouchContextMenu {
  readonly element: HTMLElement;
  private readonly _contextMenu: ContextMenu;
  /** Every button with an enabled check (the old prototype array). */
  readonly _elementsToCheck: CheckedElement[] = [];

  constructor(contextMenu: ContextMenu) {
    this._contextMenu = contextMenu;
    const content = document.createElement("div");
    new Overlay(content, { releaseOnClose: false, clazz: "context-menu-touch-overlay" });
    this.element = content;
    const row = (className: string, columns: Parameters<typeof propertyRowElement>[0]["columns"]) =>
      content.appendChild(propertyRowElement({ className, columns }));

    row("transform-section", [
      {
        width: "48%",
        content: this._createActionButtons([
          { action: action(ID.transform + "." + Transform.FlipHorizontal) },
          { action: action(ID.transform + "." + Transform.FlipVertical) },
        ]),
      },
      { width: "4%" },
      {
        width: "48%",
        content: this._createActionButtons([
          {
            action: action(ID.transform + "." + Transform.Rotate90Left),
            icon: "gravit-icon-rotate-left",
          },
          {
            action: action(ID.transform + "." + Transform.Rotate90Right),
            icon: "gravit-icon-rotate-right",
          },
        ]),
      },
    ]);
    row("paste-section", [
      {
        content: this._createActionButtonWithMenu(
          action(ID.paste),
          text("GContextMenu", "text.paste"),
          [
            action(ID.pasteInPlace),
            action(ID.pasteInside),
            action(ID.pasteHere),
            action(ID.pasteReplace),
            action(ID.pasteStyle),
          ] as MenuEntry[],
        ),
      },
    ]);
    const merge = action(ID.merge) as (Action & { getSubActions(): Action[] | null }) | null;
    const compound = merge
      ? ((merge.getSubActions() as Action[]).concat(
          action(ID.nestedCompound) as Action,
        ) as MenuEntry[])
      : null;
    row("compound-section", [
      {
        content: this._createActionButtonWithMenu(
          action(ID.merge),
          text("GContextMenu", "text.create-compound"),
          compound as MenuEntry[],
        ),
      },
    ]);
    row("path-section", [
      {
        content: this._createActionButtonWithMenu(
          action(ID.convertToPath),
          text("GContextMenu", "text.convert-to-path"),
          [
            action(ID.vectorize),
            action(ID.convertToRawPath),
            action(ID.outline),
            action(ID.offset),
            action(ID.simplify),
            action(ID.joinPaths),
            action(ID.splitPath),
            action(ID.splitLine),
          ] as MenuEntry[],
        ),
      },
    ]);
    row("symbol-section", [
      {
        content: this._createActionButtonWithMenu(
          action(ID.createSymbol),
          text("GContextMenu", "text.create-symbol"),
          [
            action(ID.resetInstance) as Action,
            action(ID.detachSymbol) as Action,
            {
              caption: text("GContextMenu", "text.go-to-master"),
              click: () => this._goToMaster(),
              icon: "gravit-icon-go-to-master",
              isEnabled: () => !!this._instanceToGoToMaster(),
            },
          ],
        ),
      },
    ]);
    row("text-section", [
      {
        content: this._createActionButtonMenu(
          "gravit-icon-textbox",
          text("GContextMenu", "text.text"),
          [
            action(ID.attachToPath),
            action(ID.detachFromPath),
            action(ID.selectByFontType),
          ] as MenuEntry[],
          () => !!this._getFirstSelectedTextElement(),
        ),
      },
    ]);
    const imageItems: CustomItem[] = [
      {
        caption: text("GContextMenu", "text.crop"),
        click: () => {
          const hasDetail = editor().hasSelectionDetail();
          const crop = imageAction("cropImage");
          if (crop) crop(this._getFirstSelectedImageElement(), hasDetail);
        },
        icon: "gravit-icon-crop",
        update: (item) => {
          const hasDetail = editor().hasSelectionDetail();
          item.setCaption(text("GImageProperties", hasDetail ? "action.no-crop" : "action.crop"));
        },
      },
      {
        caption: text("GContextMenu", "text.original-size"),
        click: () => {
          const originSize = imageAction("setOriginSize");
          if (originSize) originSize(this._getFirstSelectedImageElement());
        },
        icon: "gravit-icon-expand",
      },
      {
        caption: text("GContextMenu", "text.replace-image"),
        click: () => {
          const replace = imageAction("replaceImage");
          if (replace)
            replace(this._getFirstSelectedImageElement(), designer().getActiveDocument());
        },
        icon: "gravit-icon-replaceimg",
      },
    ];
    row("image-section", [
      {
        content: this._createActionButtonMenu(
          "gravit-icon-image",
          text("GContextMenu", "text.image"),
          imageItems,
          () => !!this._getFirstSelectedImageElement(),
        ),
      },
    ]);
    row("", [
      {
        width: "48%",
        content: this._createActionButtons([
          { action: action(ID.clip) },
          { action: action(ID.maskWithShape), icon: "gravit-icon-mask-with-shape" },
        ]),
      },
      { width: "4%" },
      {
        width: "48%",
        content: this._createActionButtons([
          { action: action(ID.convertToImage), icon: "gravit-icon-flatten" },
          { action: action(ID.duplicate), icon: "gravit-icon-duplicate" },
        ]),
      },
    ]);
    row("", [
      {
        width: "48%",
        content: this._createActionButtons([
          {
            icon: "gravit-icon-lock",
            click: () => {
              this._setAllSelectionsLocked();
              this._close();
            },
            isEnabled: () => this._getSelectedItems().length > 0,
          },
          {
            icon: "gravit-icon-hide-big",
            click: () => {
              this._setAllSelectionsHidden();
              this._close();
            },
            isEnabled: () => this._getSelectedItems().length > 0,
          },
        ]),
      },
      { width: "4%" },
      { width: "48%", content: this._createSelectMenuButton() },
    ]);
    designer().addEventListener(DocumentEvent, (event: DocumentEvent) =>
      this._documentEvent(event),
    );
  }

  /** The context menu's position fields the old code read directly. */
  private _internals(): ContextMenu {
    return this._contextMenu;
  }

  private _close(): void {
    const overlay = Overlay.of(this.element);
    if (overlay) overlay.close();
  }

  _documentEvent(event: DocumentEvent): void {
    if (event.type !== DocumentEvent.Type.ContextMenuOpened) return;
    const internals = this._internals();
    (action(ID.pasteHere) as unknown as PasteHere).setPosition(
      internals._contextMenuClientPosition,
    );
    for (const check of this._elementsToCheck)
      if (check.isEnabled && check.element)
        setDisabled(check.element, !check.isEnabled(internals._mouseEvent));
  }

  _createActionButtons(buttons: ButtonOptions | ButtonOptions[]): HTMLElement {
    const group = document.createElement("div");
    group.className = "button-group";
    for (const options of Array.isArray(buttons) ? buttons : [buttons])
      group.appendChild(this._createActionButton(options));
    return group;
  }

  _createActionButton(options: ButtonOptions): HTMLElement {
    let icon = options.icon;
    let click = options.click;
    let isEnabled = options.isEnabled;
    const buttonAction = options.action;
    if (buttonAction) {
      // The old code also took the action's title as label here, but only
      // used options.label below (see "The touch menu's action buttons have
      // no label from the action" in QUESTIONS.md).
      if (!icon) icon = buttonAction.getIcon() || buttonAction.getGroupIcon() || undefined;
      if (!click)
        click = () => {
          designer().executeAction(buttonAction.getId(), undefined, "touchmenu");
        };
      if (!isEnabled) isEnabled = () => designer().canExecuteAction(buttonAction.getId());
    }
    // Old: $("<div>").gPro({ pro: action.isPro() }); without the licence
    // isPro is always false, which adds no class.
    const wrapper = document.createElement("div");
    if (buttonAction) {
      wrapper.classList.add("action");
      wrapper.setAttribute("data-action", buttonAction.getId());
    }
    const button = document.createElement("button");
    button.classList.add("action-button");
    if (options.longButton) button.classList.add("long-button");
    button.classList.toggle("g-active", true === options.active);
    wrapper.appendChild(button);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    this._elementsToCheck.push({ element: button, isEnabled });
    if (icon) {
      const span = document.createElement("span");
      button.appendChild(span);
      this._updateIcon(span, icon);
      button.classList.add("icon");
    }
    if (options.label) {
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = options.label;
      button.appendChild(label);
    }
    if (options.isMenu) {
      const tail = document.createElement("span");
      tail.className = "icon item-tail gravit-icon-chevron-left-small";
      button.appendChild(tail);
    }
    if (click) button.addEventListener("click", click);
    return wrapper;
  }

  private _fillMenu(menu: Menu, entries: MenuEntry[], update: "enabled" | "update"): void {
    for (const entry of entries) {
      if (entry instanceof Action) {
        if ("enabled" === update)
          menu.createAddItem(
            entry,
            null,
            null,
            null,
            entry.getId() === ID.pasteHere ? CONTEXT_MENU_ID : null,
          );
        else menu.createAddItem(entry);
      } else {
        const item = menu.createAddItem(entry.caption, entry.click);
        item.setIcon(entry.icon);
        item.addEventListener(MenuItem.UpdateEvent, () => {
          if ("enabled" === update) item.setEnabled((entry.isEnabled as () => boolean)());
          else if (entry.update) entry.update(item);
        });
      }
    }
  }

  _createActionButtonWithMenu(
    mainAction: Action | null,
    label: string,
    entries: MenuEntry[],
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "action-button-with-menu";
    wrapper.appendChild(this._createActionButton({ action: mainAction, label, longButton: true }));
    const menu = new Menu(null, "g-context-menu");
    menu.__which = "touchmenu";
    this._fillMenu(menu, entries, "enabled");
    const open = document.createElement("button");
    open.className = "open-menu icon gravit-icon-chevron-left-small";
    open.addEventListener("click", (event) => {
      menu.open(event.target as HTMLElement, MenuPosition.Right_Bottom, MenuPosition.Center);
    });
    this._elementsToCheck.push({
      element: open,
      isEnabled: () =>
        entries.some((entry) =>
          entry instanceof Action ? entry.isEnabled() : (entry.isEnabled as () => boolean)(),
        ),
    });
    wrapper.appendChild(open);
    return wrapper;
  }

  _createActionButtonMenu(
    icon: string,
    label: string,
    entries: MenuEntry[],
    isEnabled: () => boolean,
  ): HTMLElement {
    const menu = new Menu(null, "g-context-menu");
    menu.__which = "touchmenu";
    this._fillMenu(menu, entries, "update");
    const wrapper = document.createElement("div");
    wrapper.className = "action-menu-button";
    wrapper.appendChild(
      this._createActionButton({
        label,
        icon,
        click: (event) => {
          const target = (event.target as HTMLElement).closest(".action-menu-button");
          if (target)
            menu.open(target as HTMLElement, MenuPosition.Right_Bottom, MenuPosition.Center);
        },
        isMenu: true,
        isEnabled,
      }),
    );
    return wrapper;
  }

  _createSelectMenuButton(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "select-menu-button";
    wrapper.appendChild(
      this._createActionButton({
        label: text("GContextMenu", "text.select"),
        click: (event) => {
          const hits = this._contextMenu._getHitsElments();
          const activeEditor = editor();
          const content = document.createElement("div");
          const overlay = new Overlay(content, {
            releaseOnClose: true,
            offsetX: 100,
            offsetY: -25,
            clazz: "selected-menu-overlay",
          });
          const list = document.createElement("div");
          content.appendChild(list);
          overlay.open((event.target as HTMLElement).closest(".select-menu-button"));
          const SelectedPanel = lateExport<SelectedPanelClass>(
            "sidebars/selected-panel.ts",
            "SelectedPanel",
          );
          if (!SelectedPanel) return;
          new SelectedPanel(list, {
            clickCallback: (node) => {
              activeEditor.clearSelection();
              activeEditor.updateSelection(false, [node]);
            },
            renderFinishCallback: () => {
              overlay.relayout();
            },
          }).setSelections(hits);
        },
        isMenu: true,
        isEnabled: (event) => {
          const hits = this._contextMenu._getHitsElments(event);
          return !!(hits && hits.elementHits && hits.elementHits.length > 0);
        },
      }),
    );
    return wrapper;
  }

  _updateIcon(element: HTMLElement, icon: string): void {
    element.replaceChildren();
    element.setAttribute("class", "icon " + icon);
  }

  /** The editor's selection (the live array), or an empty list. */
  _getSelectedItems(): Node[] {
    const document = designer().getActiveDocument();
    if (document) {
      const activeEditor = (document as unknown as { getEditor(): Editor | null }).getEditor();
      if (activeEditor) {
        const selection = activeEditor.getSelection();
        return selection || [];
      }
    }
    return [];
  }

  _getFirstSelectedImageElement(): Node | null | undefined {
    const items = this._getSelectedItems();
    return items && items.length > 0 ? items.find((node) => node instanceof Image) : null;
  }

  _getFirstSelectedTextElement(): Node | null | undefined {
    const items = this._getSelectedItems();
    return items && items.length > 0 ? items.find((node) => node instanceof Text) : null;
  }

  /** The first selected symbol instance that isn't locked. */
  private _instanceToGoToMaster(): SymbolNode | null {
    const document = designer().getActiveDocument();
    if (!document) return null;
    const selection = (document as unknown as { getEditor(): Editor })
      .getEditor()
      .getIndividualSelection() as unknown as Node[] | null;
    if (!selection || !selection.length) return null;
    return (
      (selection.find(
        (node) => node instanceof SymbolNode && !node.isLocked() && !node.isMaster(),
      ) as SymbolNode | undefined) || null
    );
  }

  /** Selects the master of the selected instance and zooms to it (Go to master). */
  private _goToMaster(): void {
    const document = designer().getActiveDocument();
    const activeEditor = (document as unknown as { getEditor(): Editor }).getEditor();
    if (!document) return;
    const instance = this._instanceToGoToMaster();
    if (!instance) return;
    activeEditor.beginTransaction();
    activeEditor.clearSelection();
    activeEditor.updateSelection(false, [instance]);
    designer().executeAction(ID.fitSelection, undefined, undefined, true);
    activeEditor.commitTransaction(text("GContextMenu", "text.go-to-master"));
  }

  _setAllSelectionsHidden(): void {
    const items = this._getSelectedItems();
    if (items && items.length > 0)
      Editor.tryRunTransaction(
        (designer().getActiveDocument() as unknown as { getScene(): unknown }).getScene(),
        () => {
          for (let i = 0; i < items.length; i++) {
            const item = items[i] as PropertyNode;
            item.setProperty("vis", false);
            item.removeFlag(Node.Flag.Highlighted as number);
          }
        },
        text("GCommonNames", "action.toggle-visibility"),
      );
  }

  /**
   * Locks every selected element. Removing the selected flag takes it out
   * of the editor's live selection array, which ends the loop.
   */
  _setAllSelectionsLocked(): void {
    const items = this._getSelectedItems();
    if (items && items.length > 0)
      Editor.tryRunTransaction(
        (designer().getActiveDocument() as unknown as { getScene(): unknown }).getScene(),
        () => {
          for (; items.length > 0;) {
            const item = items[0] as PropertyNode;
            item.setProperty("lkt", Block.LockType.Full);
            item.removeFlag(Node.Flag.Highlighted as number);
            item.accept((node: Node) => {
              node.removeFlag(Node.Flag.Selected as number);
            });
          }
        },
        text("GCommonNames", "action.toggle-lock"),
      );
  }
}
