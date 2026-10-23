// Old: designer.browser.dev.js module 1303 (GContextMenu).
/**
 * The context menus of the canvas and of the panels that open one through
 * it. The old code listened with jQuery on the #windows element:
 *
 * - a right click on the canvas (a native contextmenu event) opens the
 *   main context menu, unless the active tool takes it (crop mode gets
 *   the crop menu);
 * - the layers, pages, fill, border and effect panels triggered a jQuery
 *   "contextmenu" on #windows with options ({ previousEvent, data } or
 *   their own event with data.context): here they call trigger(options);
 * - a touch long press triggered it on the pressed element: the touch
 *   host reaches triggerAt through Designer.contextMenuTrigger.
 *
 * Which menu opens follows options.data.context (ContextMenuContext). In
 * touch mode the main menu is the touch overlay (app-touch-ui).
 */
import { Platform } from "../../engine/core/platform.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Key } from "../../engine/core/key.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Point } from "../../engine/math/point.ts";
import { Block } from "../../engine/scene/block.ts";
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { StyleLayer } from "../../engine/style/stylable-sets.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { applicationManager } from "../actions/host.ts";
import { Designer } from "../shell/designer.ts";
import { container, designer } from "../shell/globals.ts";
import { lateExport, systemDialog } from "../shell/late.ts";
import { Menu } from "./menu.ts";
import { MenuItem } from "./menu-item.ts";
import { MenuOpenEvent } from "./menu-open-event.ts";

/**
 * Where a context menu request comes from (module 450,
 * shell/drag-source.ts of app-shell-storage, not there yet).
 */
export const ContextMenuContext = {
  Crop: 1,
  Canvas: 2,
  PagePanel: 3,
  LayerPanel: 4,
  FillPropertyPanel: 5,
  BorderPropertyPanel: 6,
  EffectPropertyPanel: 7,
} as const;

/** A position as a mouse event carries it. */
export interface ContextMenuPosition {
  pageX?: number;
  pageY?: number;
  clientX?: number;
  clientY?: number;
}

/** What the panels hand over in options.data. */
export interface ContextMenuData {
  context?: number;
  /** The fill or border row's paint layer. */
  paintLayer?: unknown;
  /** The effect row's effect. */
  effect?: unknown;
  /** The border row: opens the advanced border settings. */
  openAdvancedSettings?: () => void;
  [key: string]: unknown;
}

/**
 * The second argument of the old jQuery trigger: the panel's own event
 * (with data.context), or { previousEvent, data }.
 */
export interface ContextMenuOptions extends ContextMenuPosition {
  previousEvent?: (ContextMenuPosition & { data?: ContextMenuData | null }) | null;
  data?: ContextMenuData | null;
}

/** The handler's first argument: the event (a native one, or an empty triggered one). */
interface ContextMenuEvent extends ContextMenuPosition {
  data?: ContextMenuData | null;
}

/** The active view as the context menu uses it. */
interface ContextView {
  _convertClientPositionFromMousePosition(event: unknown): Point;
  getWorldTransform(scene?: unknown): Transform;
  getViewConfiguration(): { multiPageView?: unknown };
}

/** The scene as the context menu uses it. */
interface ContextScene {
  hitTest(...args: unknown[]): ContextHit[] | null;
  getActivePage(): ContextPage;
  insertChild(node: unknown): void;
  renameClone(original: unknown, clone: unknown): void;
  deleteActivePage(): void;
}

interface ContextPage {
  clone(options: unknown): ContextPage;
  getPosition(...flags: boolean[]): { getX(): number; getY(): number };
  setProperty(name: string, value: unknown): void;
  getProperty(name: string): unknown;
  getSlavePages(): unknown[];
}

interface ContextHit {
  element: ContextElement;
}

interface ContextElement {
  getProperty(name: string): unknown;
  getParent(): unknown;
  getNodeNameTranslated(): string;
  setFlag(flag: number): void;
  removeFlag(flag: number): void;
}

interface ContextDocument {
  getScene(): ContextScene;
  getEditor(): {
    getSelection(): StyledNode[] | null;
    updateSelection(toggle: boolean, nodes: unknown[]): void;
  };
  isCommercialProductFile(): boolean;
  getStorageItem(): { getId(): unknown } | null;
}

interface StyledNode {
  getPaintLayers(): { getFillLayers(): PaintLayerNode[]; getBorderLayers(): PaintLayerNode[] };
}

interface PaintLayerNode {
  getParent(): { removeChild(node: unknown): void };
}

/** Old action ids the menus look up (designer().getAction). */
const ID = {
  editElement: "edit.edit",
  pasteHere: "edit.paste.here",
  pasteReplace: "edit.paste.replace",
  pasteStyle: "edit.paste.style",
  arrangeOrder: "arrange.order",
  arrangeAlign: "arrange.align",
  distribute: "arrange.distribute",
  transform: "arrange.transform",
  group: "modify.group",
  merge: "modify.merge",
  split: "modify.split",
  maskWithShape: "modify.mask-with-shape",
  convertToPath: "modify.converttopath",
  vectorize: "modify.vectorize",
  joinPaths: "modify.join-paths",
  splitPath: "modify.split-path",
  createSymbol: "modify.createsymbol",
  resetInstance: "modify.resetinstance",
  detachSymbol: "modify.detachsymbol",
  attachToPath: "modify.attachToPath",
  detachFromPath: "modify.detachFromPath",
  selectByFontType: "edit.selectbyfonttype",
  selectByPaintLayer: "edit.select-by-paintlayer",
  selectByBorderWidth: "edit.select-by-border-width",
  selectByTransparency: "edit.select-by-transparency",
  selectByBlendMode: "edit.select-by-blend-mode",
  selectByShape: "edit.select-by-shape",
  selectByEffect: "edit.select-by-effect",
  crop: "modify.crop",
  cancelCrop: "modify.cancel-crop",
  export: "file.export",
} as const;

const Order = Editor.ArrangeOrderType;
const Align = Editor.ArrangeAlignType;

function text(group: string, key: string): string {
  return Locale.get(new LocaleKey(group, key)) as string;
}

function action(id: string) {
  return designer().getAction(id);
}

/** `$("<div/>").text(text).html()`: the text with &, < and > escaped. */
function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

/** The clipboard text for copied nodes, as the old menus built it. */
function clipboardText(serialized: string, restricted?: unknown): string {
  return (
    '<gravit mimeType="' +
    Node.MIME_TYPE +
    '"' +
    (restricted !== undefined ? ' restricted="' + String(restricted) + '"' : "") +
    ">" +
    escapeHtml(serialized) +
    "</gravit>"
  );
}

function copyOptions(): unknown {
  return { copy: true, copyIgnoreProperties: EditorOptions.propertiesExcludedFromCopying };
}

function activeDocument(): ContextDocument {
  return designer().getActiveDocument() as unknown as ContextDocument;
}

function activeView(): ContextView | null {
  const windows = designer().getWindows();
  const window = windows ? windows.getActiveWindow() : null;
  return window ? (window.getView() as unknown as ContextView | null) : null;
}

/** The touch overlay of app-touch-ui (module 1563 extended GContextMenu with it). */
type TouchMenuFactory = (contextMenu: ContextMenu) => HTMLElement | null;

export class ContextMenu {
  static readonly ID = "context.menu";

  private _contextMenuClientPosition: Point | null = null;
  private _mouseEvent: ContextMenuPosition | null = null;
  private _options: ContextMenuOptions | null = null;
  private _contextMenuTouch: HTMLElement | null = null;
  private _contextMenuDesktop: Menu | null = null;
  private readonly _htmlElement: HTMLElement;
  private readonly _menus: {
    context: Menu;
    crop: Menu;
    page: Menu;
    touch: HTMLElement | null;
    fill: Menu;
    border: Menu;
    effect: Menu;
  };

  constructor(element: HTMLElement) {
    this._htmlElement = element;
    // The old order of creation.
    const context = this._createContextMenu();
    const crop = this._createCropMenu();
    const page = this._createPageMenu();
    const touch = this._createTouchContextMenu();
    const fill = this._createFillPropertyMenu();
    const border = this._createBorderPropertyMenu();
    const effect = this._createEffectPropertyMenu();
    this._menus = { context, crop, page, touch, fill, border, effect };
    element.addEventListener("contextmenu", (event) => {
      this._handle(event, undefined);
    });
    Designer.contextMenuTrigger = (target, clientX, clientY) =>
      this.triggerAt(target, clientX, clientY);
  }

  /**
   * $(windows).trigger("contextmenu", options): what the panels call to
   * open their menu (options.data.context says which) or the canvas menu.
   */
  trigger(options?: ContextMenuOptions | null): boolean | undefined {
    return this._handle({}, options || undefined);
  }

  /**
   * The touch long press: the old code triggered a jQuery contextmenu at
   * the pressed element with the position. It reached this handler only
   * for elements inside #windows; elsewhere it reached the element's own
   * handlers (a layer row, a tab), which are native listeners now, so it
   * is dispatched there as a contextmenu event.
   */
  triggerAt(target: globalThis.EventTarget, clientX: number, clientY: number): void {
    const position = { pageX: clientX, pageY: clientY, clientX, clientY };
    if ("nodeType" in target && this._htmlElement.contains(target as globalThis.Node)) {
      this._handle(position, undefined);
      return;
    }
    target.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX, clientY }),
    );
  }

  private _handle(
    event: ContextMenuEvent,
    options: ContextMenuOptions | undefined,
  ): boolean | undefined {
    const view = activeView();
    if (!view) return undefined;
    const previous: ContextMenuOptions | undefined =
      options && options.previousEvent ? options.previousEvent : options;
    const tool = designer().getToolManager().getActiveTool() as unknown as {
      catchesContextMenu(fromLayers: boolean): boolean;
    } | null;
    const context =
      (event.data && event.data.context) || (previous && previous.data && previous.data.context);
    if (tool && tool.catchesContextMenu(context == ContextMenuContext.LayerPanel || false))
      return undefined;
    let menu = this._menus.context;
    let main = false;
    if (context === ContextMenuContext.PagePanel) menu = this._menus.page;
    else if (context === ContextMenuContext.LayerPanel) main = true;
    else if (context === ContextMenuContext.FillPropertyPanel) menu = this._menus.fill;
    else if (context === ContextMenuContext.BorderPropertyPanel) menu = this._menus.border;
    else if (context === ContextMenuContext.EffectPropertyPanel) menu = this._menus.effect;
    else if (tool instanceof SelectTool && tool.isCropContext()) menu = this._menus.crop;
    else main = true;
    const positioned = "number" == typeof event.clientX ? event : previous;
    this._contextMenuClientPosition = view._convertClientPositionFromMousePosition(positioned);
    const x = event.pageX ? event.pageX : previous && previous.pageX;
    const y = event.pageY ? event.pageY : previous && previous.pageY;
    this._mouseEvent = event.pageX ? event : previous || null;
    this._options = options || null;
    const touch = this._menus.touch;
    const overlay = touch ? Overlay.of(touch) : null;
    if (designer().isTouchEnabled() && main && overlay)
      overlay.open({ x: x as number, y: y as number }, undefined, () => {
        designer().trigger(
          new DocumentEvent(DocumentEvent.Type.ContextMenuOpened, designer().getActiveDocument()),
        );
      });
    else menu.open({ x: x as number, y: y as number });
    this._contextMenuTouch = touch;
    this._contextMenuDesktop = menu;
    return true;
  }

  private _createContextMenu(): Menu {
    const menu = new Menu();
    menu.__which = "context";
    menu.createAddItem(action(ID.editElement));
    const paste = new MenuItem(MenuItem.Type.Menu, Menu);
    paste.setCaption(text("GPaste", "action.paste"));
    const pasteMenu = paste.getMenu() as Menu;
    pasteMenu
      .createAddItem(action(ID.pasteHere), null, null, null, ContextMenu.ID)
      .addEventListener(MenuItem.UpdateEvent, () => {
        const pasteHere = action(ID.pasteHere) as unknown as {
          setPosition(position: Point | null): void;
        } | null;
        if (pasteHere) pasteHere.setPosition(this._contextMenuClientPosition);
      });
    pasteMenu.createAddItem(action(ID.pasteReplace));
    pasteMenu.createAddItem(action(ID.pasteStyle));
    menu.addItem(paste);
    menu.createAddDivider();
    const arrange = new MenuItem(MenuItem.Type.Menu, Menu);
    arrange.setCaption(text("GContextMenu", "text.arrange"));
    for (const type of [
      Order.SendToFront,
      Order.BringForward,
      Order.SendBackward,
      Order.SendToBack,
    ])
      (arrange.getMenu() as Menu).createAddItem(action(ID.arrangeOrder + "." + type));
    menu.addItem(arrange);
    const align = new MenuItem(MenuItem.Type.Menu, Menu);
    align.setCaption(text("GContextMenu", "text.align"));
    const alignMenu = align.getMenu() as Menu;
    for (const type of [
      Align.AlignLeft,
      Align.AlignCenter,
      Align.AlignRight,
      Align.AlignJustifyHorizontal,
    ])
      alignMenu.createAddItem(action(ID.arrangeAlign + "." + type));
    alignMenu.createAddDivider();
    for (const type of [
      Align.AlignTop,
      Align.AlignMiddle,
      Align.AlignBottom,
      Align.AlignJustifyVertical,
    ])
      alignMenu.createAddItem(action(ID.arrangeAlign + "." + type));
    alignMenu.createAddDivider();
    alignMenu.createAddItem(action(ID.distribute + ".horizontal"));
    alignMenu.createAddItem(action(ID.distribute + ".vertical"));
    menu.addItem(align);
    const transform = new MenuItem(MenuItem.Type.Menu, Menu);
    transform.setCaption(text("GContextMenu", "text.transform"));
    for (const type of ["rotate-90-left", "rotate-90-right", "flip-horizontal", "flip-vertical"])
      (transform.getMenu() as Menu).createAddItem(action(ID.transform + "." + type));
    menu.addItem(transform);
    const groups = [
      [ID.group, ID.merge, ID.split, ID.maskWithShape],
      [ID.convertToPath, ID.vectorize, ID.joinPaths, ID.splitPath],
      [ID.createSymbol, ID.resetInstance, ID.detachSymbol],
      [ID.attachToPath, ID.detachFromPath],
    ];
    for (const group of groups) {
      menu.createAddDivider();
      for (const id of group) menu.createAddItem(action(id));
    }
    menu.createAddDivider();
    const same = new MenuItem(MenuItem.Type.Menu, Menu);
    same.setCaption(text("GContextMenu", "text.select-same"));
    const sameMenu = same.getMenu() as Menu;
    sameMenu.createAddItem(action(ID.selectByFontType));
    sameMenu.createAddDivider();
    for (const type of ["fill", "border", "fill_border"])
      sameMenu.createAddItem(action(ID.selectByPaintLayer + "." + type));
    sameMenu.createAddDivider();
    for (const id of [
      ID.selectByBorderWidth,
      ID.selectByTransparency,
      ID.selectByBlendMode,
      ID.selectByShape,
      ID.selectByEffect,
    ])
      sameMenu.createAddItem(action(id));
    menu.addItem(same);
    menu.createAddDivider();
    const select = new MenuItem(MenuItem.Type.Menu, Menu);
    select.setCaption(text("GContextMenu", "text.select"));
    select.setIcon("gravit-icon-cursor-filled");
    select.addEventListener(MenuItem.UpdateEvent, () => this._updateSelectMenu(select));
    menu.addItem(select);
    return menu;
  }

  /** Fills the Select submenu with the elements under the cursor. */
  private _updateSelectMenu(select: MenuItem): void {
    const selectMenu = select.getMenu() as Menu;
    selectMenu.clearItems();
    select.setEnabled(false);
    const { elementHits: hits, filteredElementHits: filtered, submenus } = this._getHitsElments();
    // As before: a hit is never a page itself (see "The Select hit list
    // checks hits for pages" in QUESTIONS.md).
    if ((hits && hits.length > 0 && (hits[0] as unknown) instanceof Page) || !hits || !hits.length)
      return;
    select.setEnabled(true);
    const label = (element: ContextElement): string =>
      element instanceof Block ? element.getLabel() : element.getNodeNameTranslated();
    const addHit = (target: Menu, caption: string, element: ContextElement): void => {
      target.createAddItem(
        caption,
        function (this: MenuItem) {
          (this.element as ContextElement).removeFlag(Node.Flag.Highlighted as number);
          activeDocument().getEditor().updateSelection(Platform.modifiers.shiftKey, [this.element]);
        },
        function (this: MenuItem) {
          (this.element as ContextElement).setFlag(Node.Flag.Highlighted as number);
        },
        function (this: MenuItem) {
          (this.element as ContextElement).removeFlag(Node.Flag.Highlighted as number);
        },
      ).element = element;
    };
    for (let o = 0; o < (filtered as ContextHit[]).length; o++) {
      const hit = (filtered as ContextHit[])[o] as ContextHit;
      const element = hit.element;
      const name = label(element);
      const key = "temp-" + hits.indexOf(hit);
      if ((submenus as Record<string, ContextElement[]>)[key]) {
        const item = new MenuItem(MenuItem.Type.Menu, Menu);
        item.setCaption((o + 1).toString() + ". " + name);
        item.setData(key);
        item.addEventListener(MenuItem.UpdateEvent, function (this: MenuItem) {
          const children = (submenus as Record<string, ContextElement[]>)[
            this.getData() as string
          ] as ContextElement[];
          const sub = this.getMenu() as Menu;
          sub.clearItems();
          for (let t = 0; t < children.length; t++) {
            const child = children[t] as ContextElement;
            addHit(sub, (t + 1).toString() + ". " + label(child), child);
          }
        });
        selectMenu.addItem(item);
      } else addHit(selectMenu, (o + 1).toString() + ". " + name, element);
    }
  }

  private _createCropMenu(): Menu {
    const menu = new Menu();
    menu.__which = "crop";
    menu.createAddItem(action(ID.crop));
    menu.createAddItem(action(ID.cancelCrop));
    return menu;
  }

  /**
   * The elements under the context menu position (pages and fully locked
   * elements left out), the hits that are not children of another hit,
   * and per hit index ("temp-<n>") the hits that are its children.
   */
  _getHitsElments(event?: ContextMenuPosition | null): {
    elementHits: ContextHit[] | null;
    filteredElementHits?: ContextHit[];
    submenus?: Record<string, ContextElement[]>;
  } {
    const position = event || this._mouseEvent;
    const view = activeView() as ContextView;
    const location = view._convertClientPositionFromMousePosition(position);
    const scene = activeDocument().getScene();
    const transform = view.getWorldTransform(scene);
    const acceptor = (element: unknown): boolean => !(element instanceof Page);
    const Lock = Block.ProgramLck;
    let hits = scene.hitTest(
      location,
      transform,
      acceptor,
      true,
      -1,
      EditorOptions.pickDistance,
      true,
      null,
      true,
      false,
      view.getViewConfiguration().multiPageView,
    );
    if (hits && hits.length > 0)
      hits = hits.filter((hit) => {
        const lock = hit.element.getProperty("plkt") as number;
        return !(
          lock & Lock.NoEdit &&
          lock & Lock.NoSizeChanges &&
          lock & Lock.NoMove &&
          lock & Lock.NoDelete
        );
      });
    if (hits && hits.length > 0 && (hits[0] as unknown) instanceof Page)
      return { elementHits: hits };
    const filtered: ContextHit[] = [];
    const submenus: Record<string, ContextElement[]> = {};
    if (hits && hits.length > 0)
      for (let u = 0; u < hits.length; ++u) {
        const parent = (hits[u] as ContextHit).element.getParent();
        let child = false;
        for (let h = 0; h < hits.length; ++h)
          if ((hits[h] as ContextHit).element === parent) {
            child = true;
            const list = submenus["temp-" + h];
            if (list) list.push((hits[u] as ContextHit).element);
            else submenus["temp-" + h] = [(hits[u] as ContextHit).element];
            break;
          }
        if (!child) filtered.push(hits[u] as ContextHit);
      }
    return { elementHits: hits, filteredElementHits: filtered, submenus };
  }

  private _createPageMenu(): Menu {
    const menu = new Menu(null, "g-page-option-menu");
    const t = {
      DUPLICATE: text("GContextMenu", "page-panel.text.duplicate"),
      DELETE: text("GContextMenu", "page-panel.text.delete"),
      COPY: text("GContextMenu", "page-panel.text.copy"),
      EXPORT: text("GContextMenu", "page-panel.text.export"),
    };
    const duplicate = menu.createAddItem(t.DUPLICATE, () => {
      const scene = activeDocument().getScene();
      Editor.tryRunTransaction(
        scene,
        () => {
          const page = scene.getActivePage();
          const clone = page.clone(copyOptions());
          scene.insertChild(clone);
          scene.renameClone(page, clone);
          const position = clone.getPosition(true, true, true, true);
          clone.setProperty("off", new Transform(1, 0, 0, 1, position.getX(), position.getY()));
        },
        t.DUPLICATE,
      );
    });
    const remove = menu.createAddItem(t.DELETE, () => {
      const scene = activeDocument().getScene();
      const page = scene.getActivePage();
      const hasSlaves = page.getSlavePages().length > 0;
      if ((page.getProperty("plkt") as number) & Block.ProgramLck.NoDelete) return;
      if (hasSlaves) {
        const dialog = systemDialog();
        if (dialog.confirm)
          dialog.confirm(
            text("GOutlineSidebar", "text.confirm-delete-masterpage"),
            (ok: boolean) => {
              if (ok)
                Editor.tryRunTransaction(
                  scene,
                  () => scene.deleteActivePage(),
                  text("GOutlineSidebar", "action.delete-page"),
                );
            },
            null,
            null,
            true,
            true,
          );
      } else Editor.tryRunTransaction(scene, () => scene.deleteActivePage(), t.DELETE);
    });
    const copy = menu.createAddItem(t.COPY, () => {
      const document = activeDocument();
      const scene = document.getScene();
      Editor.tryRunTransaction(
        scene,
        () => {
          const restricted =
            document.isCommercialProductFile() || !applicationManager().isCopyPasteEnabled();
          const page = scene.getActivePage();
          const serialized = Node.serialize(
            page as unknown as Node,
            copyOptions() as never,
          ) as string;
          void container().copyToClipboard(
            clipboardText(
              serialized,
              !!restricted && (document.getStorageItem() as { getId(): unknown }).getId(),
            ),
          );
        },
        t.COPY,
      );
    });
    const exportItem = menu.createAddItem(t.EXPORT, () => {
      const page = activeDocument().getScene().getActivePage();
      designer().executeAction(ID.export, [{ element: page }], undefined, true);
    });
    duplicate.setIcon("gravit-icon-duplicate");
    remove.setIcon("gravit-icon-delete");
    copy.setIcon("gravit-icon-copy");
    exportItem.setIcon("gravit-icon-export");
    exportItem.setProFeatureInterruption(false);
    // The old menu marked Export as Pro on open without Pro features; the
    // licence is dropped, so Pro features are always on.
    menu.__which = "page";
    return menu;
  }

  private _createTouchContextMenu(): HTMLElement | null {
    const create = lateExport<TouchMenuFactory>(
      "touch/touch-context-menu.ts",
      "createTouchContextMenu",
    );
    return create ? create(this) : null;
  }

  private _optionsData(): ContextMenuData | null {
    return (this._options && this._options.data) || null;
  }

  private _createFillPropertyMenu(): Menu {
    const menu = new Menu(null, "fill-context-menu");
    let layer: unknown = null;
    const n = {
      DELETE: text("GContextMenu", "fill-properties-panel.text.delete-fill"),
      COPY: text("GContextMenu", "fill-properties-panel.text.copy-fill"),
    };
    const remove = menu.createAddItem(n.DELETE, () => {
      if (layer) {
        const selection = activeDocument().getEditor().getSelection() as StyledNode[];
        Editor.tryRunTransaction(
          selection[0],
          () => {
            for (const node of selection) {
              const fills = node.getPaintLayers().getFillLayers();
              for (const fill of fills)
                if (FillPaintLayer.equals(fill as never, layer as never)) {
                  fill.getParent().removeChild(fill);
                  break;
                }
            }
          },
          n.DELETE,
        );
      }
    });
    const copy = menu.createAddItem(n.COPY, () => {
      if (layer) copyNodes(layer);
    });
    remove.setIcon("gravit-icon-trash");
    copy.setIcon("gravit-icon-copy");
    remove.setShortcutHint([Key.Constant.DELETE]);
    copy.setShortcutHint([Key.Constant.META, "C"]);
    menu.addEventListener(MenuOpenEvent, () => {
      const data = this._optionsData();
      layer = data && data.paintLayer;
    });
    menu.__which = "fill";
    return menu;
  }

  private _createBorderPropertyMenu(): Menu {
    const menu = new Menu(null, "border-context-menu");
    let layer: unknown = null;
    const n = {
      ADVANCED: text("GContextMenu", "border-properties-panel.text.advanced-settings"),
      DELETE: text("GContextMenu", "border-properties-panel.text.delete-border"),
      COPY: text("GContextMenu", "border-properties-panel.text.copy-border"),
    };
    const advanced = menu.createAddItem(n.ADVANCED, () => {
      const data = this._optionsData();
      if (data) (data.openAdvancedSettings as () => void)();
    });
    const remove = menu.createAddItem(n.DELETE, () => {
      if (layer) {
        const selection = activeDocument().getEditor().getSelection() as StyledNode[];
        Editor.tryRunTransaction(
          selection[0],
          () => {
            for (const node of selection) {
              const borders = node.getPaintLayers().getBorderLayers();
              for (const border of borders)
                if (BorderPaintLayer.equals(border as never, layer as never)) {
                  border.getParent().removeChild(border);
                  break;
                }
            }
          },
          n.DELETE,
        );
      }
    });
    const copy = menu.createAddItem(n.COPY, () => {
      if (layer) copyNodes(layer);
    });
    advanced.setIcon("gravit-icon-settings");
    remove.setIcon("gravit-icon-trash");
    copy.setIcon("gravit-icon-copy");
    remove.setShortcutHint([Key.Constant.DELETE]);
    copy.setShortcutHint([Key.Constant.META, "C"]);
    menu.addEventListener(MenuOpenEvent, () => {
      const data = this._optionsData();
      layer = data && data.paintLayer;
    });
    menu.__which = "border";
    return menu;
  }

  private _createEffectPropertyMenu(): Menu {
    const menu = new Menu(null, "effect-context-menu");
    let effect: {
      getProperty(name: string): unknown;
      setProperty(n: string, v: unknown): void;
    } | null = null;
    const n = {
      COPY: text("GContextMenu", "effect-properties-panel.text.copy-effect"),
      APPLY_TO_ELEMENT: text("GContextMenu", "effect-properties-panel.text.apply-to-element"),
      APPLY_TO_FILL: text("GContextMenu", "effect-properties-panel.text.apply-to-fill"),
      APPLY_TO_BORDER: text("GContextMenu", "effect-properties-panel.text.apply-to-border"),
    };
    const applyTo = (layer: string | null, name: string): void => {
      const target = effect as NonNullable<typeof effect>;
      Editor.tryRunTransaction(target, () => target.setProperty("ly", layer), name);
    };
    const apply = new MenuItem(MenuItem.Type.Menu, Menu);
    const applyMenu = apply.getMenu() as Menu;
    applyMenu.addClass("effect-context-menu");
    const toElement = applyMenu.createAddItem(n.APPLY_TO_ELEMENT, () =>
      applyTo(null, n.APPLY_TO_ELEMENT),
    );
    const toFill = applyMenu.createAddItem(n.APPLY_TO_FILL, () =>
      applyTo(StyleLayer.Fill, n.APPLY_TO_FILL),
    );
    const toBorder = applyMenu.createAddItem(n.APPLY_TO_BORDER, () =>
      applyTo(StyleLayer.Border, n.APPLY_TO_BORDER),
    );
    const copy = menu.createAddItem(n.COPY, () => {
      if (effect) copyNodes(effect);
    });
    apply.setCaption(n.APPLY_TO_ELEMENT);
    copy.setIcon("gravit-icon-copy");
    toElement.setIcon("gravit-icon-circle");
    toFill.setIcon("gravit-icon-fill");
    toBorder.setIcon("gravit-icon-stroke");
    copy.setShortcutHint([Key.Constant.META, "C"]);
    menu.addItem(apply);
    menu.addEventListener(MenuOpenEvent, () => {
      const data = this._optionsData();
      // As before this expects the effect row to have passed its effect.
      effect = (data && data.effect) as typeof effect;
      const layer = (effect as NonNullable<typeof effect>).getProperty("ly");
      let icon: string;
      let caption: string;
      if (layer === StyleLayer.Fill) {
        icon = "gravit-icon-fill";
        caption = n.APPLY_TO_FILL;
      } else if (layer === StyleLayer.Border) {
        icon = "gravit-icon-stroke";
        caption = n.APPLY_TO_BORDER;
      } else {
        icon = "gravit-icon-circle";
        caption = n.APPLY_TO_ELEMENT;
      }
      apply.setIcon(icon);
      apply.setCaption(caption);
    });
    menu.__which = "effect";
    return menu;
  }

  /** Closes the open context menu (touch overlay and desktop menu). */
  close(): void {
    if (this._contextMenuTouch) {
      const overlay = Overlay.of(this._contextMenuTouch);
      if (overlay) overlay.close();
    }
    if (this._contextMenuDesktop) this._contextMenuDesktop.close();
  }

  toString(): string {
    return "[Object GContextMenu]";
  }
}

/** Copies one node (a paint layer or an effect) to the clipboard. */
function copyNodes(node: unknown): void {
  const serialized = Node.serialize([node as Node], copyOptions() as never) as string;
  void container().copyToClipboard(clipboardText(serialized));
}
