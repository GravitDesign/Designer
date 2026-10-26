// Old: designer.browser.dev.js module 1260 (GOutlineSidebar).
/**
 * The "Layers" sidebar on the left: the pages toolbar and list (with the
 * single/multi-page switch), a divider to resize the pages list, the
 * layers toolbar and list, and the export rows of the selection.
 *
 * It owns plain DOM like the other sidebars (the shell hosts it in its
 * `.sidebar-container`). The lists are the pages and layers panels; this
 * class does what their rows ask for (move, duplicate, select, insert and
 * delete pages and layers) in editor transactions.
 */
import { Platform } from "../../engine/core/platform.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { GMath } from "../../engine/math/math.ts";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Element } from "../../engine/scene/element.ts";
import { Item } from "../../engine/scene/item.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import type {
  AfterFlagChangeEvent,
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
} from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { CollabText } from "../../engine/scene/annotations/collab-text.ts";
import { Util } from "../../engine/core/util.ts";
import { Editor, type TransactionData } from "../../editor/editor.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { ToolChangedEvent } from "../../editor/tools/tool-manager.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { applicationManager } from "../actions/host.ts";
import { FitAllAction } from "../actions/view/fit-all-action.ts";
import { FitSelectionAction } from "../actions/view/fit-selection-action.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { DocumentStatusEvent } from "../document/document-status-event.ts";
import { PageClip } from "../export/page-clip.ts";
import type { Document } from "../document/document.ts";
import { ExportProperties } from "../inspector/export-properties.ts";
import type { InspectedElements } from "../inspector/properties.ts";
import { ContextMenuContext, type ContextMenuOptions } from "../menus/context-menu.ts";
import { ApplicationStatusEvent } from "../shell/application-status-event.ts";
import { css } from "../shell/dom.ts";
import { container, designer } from "../shell/globals.ts";
import { Sidebars, type SidebarTouchTool } from "../shell/layout.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { Sidebar } from "../shell/sidebar.ts";
import { View } from "../shell/view.ts";
import { WindowEvent } from "../shell/windows.ts";
import { attachToolbarShadow } from "../themes/theme-scroll.ts";
import { initAccordion, toggleAccordionOpen } from "../widgets/accordion.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import type { PanelContainerNode, PanelNode } from "./layer-item.ts";
import { contextMenuOptions, LayerPanel } from "./layers-panel.ts";
import { PagePanel } from "./pages-panel.ts";
import type { TreeDropEvent, VirtualTreeNode } from "./virtual-tree.ts";

/** The view of the active window as the sidebar uses it (GEditorWidget). */
interface OutlineView {
  getViewConfiguration(): { multiPageView: boolean; pageLabelsVisible: boolean };
  invalidate(area?: Rect | null, scene?: boolean): unknown;
  zoomAtCenter(center: Point): void;
  getHtmlElement(): HTMLElement;
}

interface OutlineWindow {
  getView(): OutlineView;
  centerAndZoom(): void;
  scrollIntoView(box: Rect | null): void;
}

/** GDocument as the sidebar uses it. */
interface OutlineDocument {
  getScene(): Scene;
  getEditor(): Editor;
  getStatus(): number | null;
  getActiveWindow(): OutlineWindow | null;
  hasCDR(): boolean;
  addEventListener(
    eventClass: typeof DocumentStatusEvent,
    listener: (event: DocumentStatusEvent) => void,
    target?: object,
  ): void;
  removeEventListener(
    eventClass: typeof DocumentStatusEvent,
    listener: (event: DocumentStatusEvent) => void,
    target?: object,
  ): void;
}

/** A drop event the toolbars forward to the list's last visited row. */
type ForwardedDrop = globalThis.Event & { dataTransfer?: DataTransfer | null };

/** GNode.Store's clone (the nodes checked for the mixin first). */
function cloneNode(node: Node): Node | null {
  // clone comes from the Store mixin, which Node's typings lack.
  return (node as unknown as { clone(): Node | null }).clone();
}

/** GElement.Transform's transform. */
interface Transformable {
  transform(transform: Transform, noCheck?: boolean): void;
}

function text(table: string, key: string): string {
  return Locale.get(new LocaleKey(table, key)) as string;
}

function tooltip(title: string, description?: string): RichTooltipConfig {
  return RichTooltipConfig.from(
    description === undefined ? { title, learnMore: "" } : { title, description, learnMore: "" },
  );
}

/** A toolbar button: `<button data-title><span class=icon></span></button>`. */
function iconButton(title: string, icon: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.setAttribute("data-title", title);
  button.addEventListener("click", onClick);
  const span = document.createElement("span");
  span.classList.add(icon);
  button.appendChild(span);
  return button;
}

/** jQuery's preventDefault + stopPropagation handler of the drop zones. */
function swallow(event: globalThis.Event): void {
  event.preventDefault();
  event.stopPropagation();
}

export class OutlineSidebar extends Sidebar {
  static ID = "outline";
  static TITLE = new LocaleKey("GOutlineSidebar", "title");
  static MULTIPAGE_MODE_ENABLED_OPTION_NAME = "OutlineSidebar/Multipage_Mode";

  _document: OutlineDocument | null = null;
  _pageToolbar: HTMLElement | null = null;
  _layerToolbar: HTMLElement | null = null;
  _exportToolbar: HTMLElement | null = null;
  _outlineSidebarElement: HTMLElement | null = null;
  _pageContainerMaxHeight = 500;
  _pageContainerMinHeight = 50;
  _pagePanel: PagePanel | null = null;
  _pagePanelElement: HTMLElement | null = null;
  _pageModeSwitch: HTMLElement | null = null;
  _layerPanel: LayerPanel | null = null;
  _layerPanelElement: HTMLElement | null = null;
  _exportPanel: HTMLElement | null = null;
  _exportInstance: ExportProperties | null = null;
  _pageMenuOptionButton: HTMLElement | null = null;
  _transformMode = false;
  _htmlElement: HTMLElement | null = null;
  /** Cleared on deactivation, never set: the export rows get null elements. */
  /** Never set to anything but null (as in the old code): the export rows show the document's slices. */
  _elements: InspectedElements | null = null;

  override getId(): string {
    return OutlineSidebar.ID;
  }

  override getTitle(): LocaleKey {
    return OutlineSidebar.TITLE;
  }

  override isEnabled(): boolean {
    return null !== this._document;
  }

  /** The application manager's inspect switch, always on in the local app. */
  override isVisible(): boolean {
    return true;
  }

  override getOrientation(): string {
    return Sidebars.Orientation.Left;
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

  /** The layers panel: the handle the layer actions drive (getItem, getCurrentFocusedNode, ...). */
  getLayerPanel(): LayerPanel {
    return this._layerPanel as LayerPanel;
  }

  override relayout(): void {
    (this._pagePanel as PagePanel).relayout();
    (this._layerPanel as LayerPanel).relayout();
    this._pageContainerMaxHeight =
      parseInt(getComputedStyle(this._outlineSidebarElement as HTMLElement).height, 10) - 150;
  }

  /**
   * Gives the forwarded drop the dragged data. Events without their own
   * dataTransfer (all of them: they are plain events) get the original's.
   */
  _copyDataTransfer(target: ForwardedDrop, source: DragEvent): void {
    if (Object.prototype.hasOwnProperty.call(target, "dataTransfer")) {
      const types = source && source.dataTransfer && source.dataTransfer.types;
      if (types)
        types.forEach((type) => {
          // The old code passed only the data (one argument); kept, it is never reached.
          (target.dataTransfer as unknown as { setData(data: string): void }).setData(
            (source.dataTransfer as DataTransfer).getData(type),
          );
        });
    } else target.dataTransfer = source.dataTransfer;
  }

  override getTouchTools(): SidebarTouchTool[] {
    return [
      new TouchTool({
        def: true,
        id: "pages",
        sidebar: this.getId(),
        icon: "gravit-icon-touch-pages-panel",
        panel: ".pages-container",
        toolbar: ".page-toolbar",
        panelWidth: "320px",
      }),
      new TouchTool({
        id: "layers",
        sidebar: this.getId(),
        icon: "gravit-icon-touch-layers-panel",
        panel: [".layers-container", ".export-panel"],
        toolbar: ".layer-toolbar",
        panelWidth: "350px",
      }),
      // TouchTool types its id as string | null; both tools here have one.
    ] as unknown as SidebarTouchTool[];
  }

  override init(element: HTMLElement): void {
    this._htmlElement = element;
    const pageToolbar = document.createElement("div");
    pageToolbar.classList.add("toolbar", "page-toolbar");
    const pagesLabel = document.createElement("label");
    pagesLabel.textContent = text("GOutlineSidebar", "text.pages");
    pageToolbar.appendChild(pagesLabel);
    pageToolbar.addEventListener("dragover", swallow);
    pageToolbar.addEventListener("dragenter", swallow);
    pageToolbar.addEventListener("drop", (event) => this._forwardDrop(event, this._pagePanel));
    element.appendChild(pageToolbar);
    this._pageToolbar = pageToolbar;

    const modeSwitch = document.createElement("label");
    modeSwitch.classList.add("g-switch");
    modeSwitch.setAttribute("data-title", text("GOutlineSidebar", "action.toggle-page-mode"));
    css(modeSwitch, "margin-right", "5px");
    const checkbox = document.createElement("input");
    checkbox.setAttribute("id", "toogle-page-mode-checkbox");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("data-property", "multipage-switch");
    checkbox.addEventListener("change", (event) => this._multiPageModeChangeEventHandler(event));
    modeSwitch.appendChild(checkbox);
    modeSwitch.appendChild(document.createElement("div"));
    pageToolbar.appendChild(modeSwitch);
    attachRichTooltip(
      modeSwitch,
      tooltip(
        text("GOutlineSidebar", "text.multipage-tooltip-title"),
        text("GOutlineSidebar", "text.multipage-tooltip-description"),
      ),
    );
    this._pageModeSwitch = modeSwitch;

    const optionButton = document.createElement("button");
    optionButton.classList.add("setting-menu-options");
    optionButton.addEventListener("click", (event) => {
      this._contextMenu(contextMenuOptions(event, ContextMenuContext.PagePanel));
    });
    const settingsIcon = document.createElement("span");
    settingsIcon.classList.add("gravit-icon-settings");
    optionButton.appendChild(settingsIcon);
    pageToolbar.appendChild(optionButton);
    this._pageMenuOptionButton = optionButton;

    const deletePage = iconButton(
      text("GOutlineSidebar", "action.delete-active-page"),
      "gravit-icon-trash",
      () => this._deletePage(),
    );
    pageToolbar.appendChild(deletePage);
    attachRichTooltip(
      deletePage,
      tooltip(
        text("GOutlineSidebar", "text.delete-page-tooltip-title"),
        text("GOutlineSidebar", "text.delete-page-tooltip-description"),
      ),
    );
    const createPage = iconButton(
      text("GOutlineSidebar", "action.create-new-page"),
      "gravit-icon-addpage",
      () => {
        this._insertPage();
        toggleAccordionOpen(pageToolbar, true);
        // Shows the list again. The old code ran gAccordion("init",
        // $(pagePanel)) for this, but the element after the header is the
        // .pages-container, not the .pages list, so a folded list stayed
        // hidden under an open header (BUGS-FIXED.md "BUG-158").
        initAccordion(pageToolbar, { next: ".pages-container", title: "label" });
      },
    );
    pageToolbar.appendChild(createPage);
    attachRichTooltip(
      createPage,
      tooltip(
        text("GOutlineSidebar", "text.create-new-page-tooltip-title"),
        text("GOutlineSidebar", "text.create-new-page-tooltip-description"),
      ),
    );

    const pagesContainer = document.createElement("div");
    pagesContainer.classList.add("pages-container");
    element.appendChild(pagesContainer);
    const pagePanelElement = document.createElement("div");
    pagePanelElement.classList.add("pages");
    attachToolbarShadow(pagePanelElement, pageToolbar);
    pagePanelElement.addEventListener("dragover", swallow);
    pagePanelElement.addEventListener("dragenter", swallow);
    pagePanelElement.addEventListener("drop", (event) => this._forwardDrop(event, this._pagePanel));
    pagePanelElement.addEventListener("mouseenter", () =>
      (this._pagePanel as PagePanel).setBlockHighlight(true),
    );
    pagePanelElement.addEventListener("mouseleave", () =>
      (this._pagePanel as PagePanel).setBlockHighlight(false),
    );
    pagesContainer.appendChild(pagePanelElement);
    this._pagePanelElement = pagePanelElement;
    this._pagePanel = new PagePanel(pagePanelElement, {
      moveCallback: (parent, reference, nodes) =>
        this._movePageTreeNodeCallback(parent, reference, nodes),
      clickCallback: (node) => this._clickPageTreeNodeCallback(node),
      startDraggingCallback: (node) => this._startPageDraggingCallback(node),
    });

    let resizing = false;
    let startY: number | null = null;
    let startHeight: number | null = null;
    const divider = document.createElement("div");
    divider.setAttribute("id", "page-layer-divider");
    const move = (event: MouseEvent): void => {
      if (!resizing) return;
      let height = (startHeight as number) - (startY as number) + event.clientY;
      if (height < this._pageContainerMinHeight) height = this._pageContainerMinHeight;
      if (height > this._pageContainerMaxHeight) height = this._pageContainerMaxHeight;
      css(pagesContainer, "height", height + "px");
    };
    const up = (): void => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      resizing = false;
      startY = null;
      startHeight = null;
      element.classList.remove("page-container-resizing");
    };
    divider.addEventListener("mousedown", (event) => {
      startY = event.clientY;
      resizing = true;
      startHeight = parseInt(getComputedStyle(pagesContainer).height, 10);
      element.classList.add("page-container-resizing");
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
    element.appendChild(divider);
    divider.appendChild(document.createElement("hr"));
    divider.appendChild(document.createElement("div"));
    this._addLayerPanel(element);
    element.appendChild(document.createElement("hr"));

    const exportToolbar = document.createElement("div");
    exportToolbar.classList.add("toolbar", "toolbar-export");
    element.appendChild(exportToolbar);
    this._exportToolbar = exportToolbar;
    const exportPanel = document.createElement("div");
    exportPanel.classList.add("properties-panel");
    exportPanel.classList.add("export-panel");
    element.appendChild(exportPanel);
    this._exportPanel = exportPanel;
    this._exportInstance = new ExportProperties();
    this._exportInstance.init(exportPanel, exportToolbar);

    designer().addEventListener(DocumentEvent, this._documentEvent, this);
    designer().getToolManager().addEventListener(ToolChangedEvent, this._toolChangedEvent, this);
    designer().addEventListener(ApplicationStatusEvent, this._applicationStatusEvent, this);
    designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
    initAccordion(pageToolbar, { next: ".pages-container", title: "label" });
    initAccordion(exportToolbar, { next: ".properties-panel", title: "label" });
    this._outlineSidebarElement = element;
  }

  /** `$(windows).trigger("contextmenu", options)`. */
  private _contextMenu(options: ContextMenuOptions): void {
    const menu = designer().getContextMenu();
    if (menu) menu.trigger(options);
  }

  /** A drop on a toolbar or around the rows goes to the row the drag was last over. */
  private _forwardDrop(event: globalThis.Event, panel: PagePanel | LayerPanel | null): void {
    event.preventDefault();
    event.stopPropagation();
    const target = panel ? panel.getLastVisitedDroppable() : null;
    if (target) {
      const forwarded: ForwardedDrop = new MouseEvent("drop", { bubbles: true, cancelable: true });
      this._copyDataTransfer(forwarded, event as DragEvent);
      target.dispatchEvent(forwarded);
    }
  }

  toggleMultiPageMode(): void {
    const checkbox = this._getMultiPageSwitcher();
    if (checkbox) {
      checkbox.checked = !checkbox.matches(":checked");
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  _changePageMode(enabled: boolean, updateSwitch = true): void {
    (this._document as OutlineDocument)
      .getScene()
      .setProperty(PageClip.MULTIPAGE_VIEW_ENABLED, enabled);
    container().setProperty(OutlineSidebar.MULTIPAGE_MODE_ENABLED_OPTION_NAME, enabled);
    if (updateSwitch) {
      const checkbox = this._getMultiPageSwitcher();
      if (checkbox) checkbox.checked = enabled;
    }
  }

  _getMultiPageSwitcher(): HTMLInputElement | null {
    return this._pageModeSwitch
      ? this._pageModeSwitch.querySelector<HTMLInputElement>(
          'input[data-property="multipage-switch"]',
        )
      : null;
  }

  _multiPageModeChangeEventHandler(event: globalThis.Event): void {
    designer().stats("pages_change_multipage-mode");
    const checkbox = event.target as HTMLInputElement;
    this._refreshPageModeSwitch(checkbox, { showAlert: true });
    const enabled = checkbox.matches(":checked");
    this._changePageMode(enabled, false);
    const name = text("GOutlineSidebar", "action.toggle-page-mode");
    // The undo entry only flips the mode back; the fake property change
    // action makes the editor treat it as a document change.
    (this._document as OutlineDocument).getEditor().pushState(
      name,
      () => {
        this._changePageMode(enabled);
      },
      () => {
        this._changePageMode(!enabled);
      },
      // The old code passed this hand-made action list so the document saves
      // the change (a property change); it is not a full TransactionData.
      {
        actions: [{ isPropertyChangeAction: true, node: { hasMixin: () => false } }],
      } as unknown as TransactionData,
    );
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._touchInterfaceUpdate();
  }

  _applicationStatusEvent(event: ApplicationStatusEvent): void {
    if (event.status === ApplicationStatusEvent.Status.Ready) this._touchInterfaceUpdate();
  }

  _touchInterfaceUpdate(): void {
    const modeSwitch = this._pageModeSwitch as HTMLElement;
    const checkbox = modeSwitch.querySelector<HTMLInputElement>("#toogle-page-mode-checkbox");
    const optionButton = this._pageMenuOptionButton as HTMLElement;
    if (designer().isTouchEnabled()) {
      modeSwitch.classList.toggle("toogle-page-mode", true);
      modeSwitch.classList.toggle("g-switch", false);
      if (checkbox) mountCheckboxSlider(checkbox);
      css(optionButton, "display", "");
      (this._pagePanel as PagePanel).resetVTreeRowHeight("48");
      (this._layerPanel as LayerPanel).resetVTreeRowHeight("48");
    } else {
      modeSwitch.classList.toggle("toogle-page-mode", false);
      modeSwitch.classList.toggle("g-switch", true);
      if (checkbox) unmountCheckboxSlider(checkbox);
      css(optionButton, "display", "none");
      (this._pagePanel as PagePanel).resetVTreeRowHeight("34");
      (this._layerPanel as LayerPanel).resetVTreeRowHeight("34");
    }
  }

  _addLayerPanel(element: HTMLElement): void {
    if (!this._layerToolbar) {
      const toolbar = document.createElement("div");
      toolbar.classList.add("toolbar");
      toolbar.classList.add("layer-toolbar");
      const label = document.createElement("label");
      css(label, "flex-grow", "1");
      label.textContent = text("GOutlineSidebar", "text.layers");
      toolbar.appendChild(label);
      toolbar.addEventListener("dragover", swallow);
      toolbar.addEventListener("dragenter", swallow);
      toolbar.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = (this._layerPanel as LayerPanel).getLastVisitedDroppable();
        if (target) {
          const forwarded = new CustomEvent("drop", {
            bubbles: true,
            cancelable: true,
          }) as ForwardedDrop;
          this._copyDataTransfer(forwarded, event);
          // A drop on the toolbar counts as a drop at the top of the row.
          Object.assign(forwarded, { altKey: event.altKey, layerY: 0 });
          target.dispatchEvent(forwarded);
        }
      });
      this._layerToolbar = toolbar;
      const deleteButton = iconButton(
        text("GOutlineSidebar", "action.delete-layer-item"),
        "gravit-icon-trash",
        () => this._deleteLayerOrItem(),
      );
      toolbar.appendChild(deleteButton);
      attachRichTooltip(
        deleteButton,
        tooltip(
          text("GOutlineSidebar", "text.delete-layer-tooltip-title"),
          text("GOutlineSidebar", "text.delete-layer-tooltip-description"),
        ),
      );
      const newButton = iconButton(
        text("GOutlineSidebar", "action.new-layer"),
        "gravit-icon-addlayer",
        () => this.insertLayer(),
      );
      toolbar.appendChild(newButton);
      attachRichTooltip(
        newButton,
        tooltip(
          text("GOutlineSidebar", "text.new-layer-tooltip-title"),
          text("GOutlineSidebar", "text.new-layer-tooltip-description"),
        ),
      );
    }
    element.appendChild(this._layerToolbar);
    const layersContainer = document.createElement("div");
    layersContainer.classList.add("layers-container");
    element.appendChild(layersContainer);
    if (this._layerPanel) return;
    const panelElement = document.createElement("div");
    attachToolbarShadow(panelElement, this._layerToolbar);
    panelElement.classList.add("layers");
    panelElement.addEventListener("mouseenter", () => {
      const scene = (this._document as OutlineDocument).getScene();
      if (scene)
        scene.acceptChildren((node) => {
          if (node.hasFlag(Node.Flag.Highlighted as number))
            node.removeFlag(Node.Flag.Highlighted as number);
          return true;
        });
      (this._layerPanel as LayerPanel).setBlockHighlight(true);
    });
    panelElement.addEventListener("mouseleave", () =>
      (this._layerPanel as LayerPanel).setBlockHighlight(false),
    );
    panelElement.addEventListener("click", () => {
      designer().stats("layers_deselect_all-layers");
      (this._document as OutlineDocument).getEditor().clearSelection();
      const scene = (this._document as OutlineDocument).getScene();
      if (scene) scene.setActiveLayer(null);
      if (Platform.modifiers.optionKey)
        designer().executeAction(FitAllAction.ID, undefined, "outlinesidebar");
    });
    panelElement.addEventListener("dragover", swallow);
    panelElement.addEventListener("dragenter", swallow);
    panelElement.addEventListener("drop", (event) => this._forwardDrop(event, this._layerPanel));
    layersContainer.appendChild(panelElement);
    this._layerPanelElement = panelElement;
    this._layerPanel = new LayerPanel(panelElement, {
      moveCallback: (parent, reference, nodes) =>
        this._moveLayerTreeNodeCallback(parent, reference, nodes),
      isDuplicateEffectCallback: (event) => this._isDuplicateEffectCallback(event),
      duplicateCallback: (parent, reference, nodes) =>
        this._duplicateLayerTreeNodeCallback(parent, reference, nodes),
      clickCallback: (node) => this._clickLayerTreeNodeCallback(node),
      startDraggingCallback: (node) => this._startLayerDraggingCallback(node),
      patternChooserStatusChangeCallBack: (open) => this._patternChooserStatusChange(open),
    });
  }

  _documentEvent(event: DocumentEvent): void {
    if (event.type === DocumentEvent.Type.Activated) {
      const document = event.document as OutlineDocument;
      this._document = document;
      const scene = document.getScene();
      (this._pagePanel as PagePanel).scene(scene);
      (this._layerPanel as LayerPanel).scene(scene);
      this.trigger(View.UPDATE_EVENT);
      if (
        document.getStatus() === DocumentStatus.Ready ||
        document.getStatus() === DocumentStatus.Loaded
      ) {
        if (document.getActiveWindow()) void this._updateMultiPageMode();
        else designer().getWindows().addEventListener(WindowEvent, this._windowsEvent, this);
      } else document.addEventListener(DocumentStatusEvent, this._documentStatusEvent, this);
      const editor = document.getEditor();
      designer().getToolManager().addEventListener(ToolChangedEvent, this._updateExport, this);
      editor.addEventListener(Editor.SelectionChangedEvent, this._updateExport, this);
      scene.addEventListener(Node.AfterFlagChangeEvent, this._afterFlagChangeEvent, this);
      scene.addEventListener(Node.AfterPropertiesChangeEvent, this._afterPropertiesChanged, this);
      scene.addEventListener(Node.AfterInsertEvent, this._afterInsert, this);
      this._updateExport();
    } else if (event.type === DocumentEvent.Type.Deactivated) {
      (this._pagePanel as PagePanel).scene(null);
      (this._layerPanel as LayerPanel).scene(null);
      const document = this._document as OutlineDocument;
      const scene = document.getScene();
      const editor = document.getEditor();
      designer().getToolManager().removeEventListener(ToolChangedEvent, this._updateExport, this);
      designer().getWindows().removeEventListener(WindowEvent, this._windowsEvent, this);
      editor.removeEventListener(Editor.SelectionChangedEvent, this._updateExport, this);
      scene.removeEventListener(Node.AfterFlagChangeEvent, this._afterFlagChangeEvent, this);
      scene.removeEventListener(
        Node.AfterPropertiesChangeEvent,
        this._afterPropertiesChanged,
        this,
      );
      scene.removeEventListener(Node.AfterInsertEvent, this._afterInsert, this);
      document.removeEventListener(DocumentStatusEvent, this._documentStatusEvent, this);
      this._document = null;
      this._elements = null;
      this._updateExport();
      this.trigger(View.UPDATE_EVENT);
    }
  }

  _documentStatusEvent(event: DocumentStatusEvent): void {
    if (event.status !== DocumentStatus.Ready && event.status !== DocumentStatus.Loaded) return;
    void this._updateMultiPageMode();
    (this._document as OutlineDocument).removeEventListener(
      DocumentStatusEvent,
      this._documentStatusEvent,
      this,
    );
  }

  _windowsEvent(event: WindowEvent): void {
    if (event.type !== WindowEvent.Type.Activated) return;
    void this._updateMultiPageMode();
    designer().getWindows().removeEventListener(WindowEvent, this._windowsEvent, this);
  }

  /** The scene's own setting, else the last one used (stored in the container). */
  _isMultiPageModeEnabled(): unknown {
    const enabled = (this._document as OutlineDocument)
      .getScene()
      .getProperty(PageClip.MULTIPAGE_VIEW_ENABLED);
    return "boolean" == typeof enabled
      ? enabled
      : container().getProperty(OutlineSidebar.MULTIPAGE_MODE_ENABLED_OPTION_NAME);
  }

  async _updateMultiPageMode(): Promise<void> {
    const checkbox = this._getMultiPageSwitcher() as HTMLInputElement;
    const enabled = await this._isMultiPageModeEnabled();
    checkbox.checked = !!enabled;
    this._refreshPageModeSwitch(checkbox, { skipInvalidation: true });
  }

  _toolChangedEvent(event: ToolChangedEvent): void {
    const previous = event.previousTool;
    const next = event.newTool;
    if (previous && previous instanceof SelectTool) {
      if (!event.light) this._updateTransformMode(false);
      previous.removeEventListener(SelectTool.Event, this._selectToolEvent, this);
    }
    this._activeTool(next);
  }

  _activeTool(tool: unknown): void {
    if (tool && tool instanceof SelectTool)
      tool.addEventListener(SelectTool.Event, this._selectToolEvent, this);
  }

  _selectToolEvent(event: InstanceType<typeof SelectTool.Event>): void {
    if (event.type === SelectTool.Event.Type.EditModeChanged)
      this._updateTransformMode(
        (event.args as { mode?: unknown }).mode === SelectTool.EditMode.Transform,
      );
  }

  _insertPage(): void {
    if (!applicationManager().isEditingEnabled()) return;
    designer().stats("pages_insert_page");
    const scene = (this._document as OutlineDocument).getScene();
    Editor.tryRunTransaction(
      scene,
      () => {
        const page = scene.insertPage();
        scene.setActivePage(page);
      },
      text("GOutlineSidebar", "action.insert-page"),
    );
    this._navigateDrawingCenter(scene.getActivePage() as Page);
    this._refreshSelection();
  }

  sceneHasInfiniteCanvas(): boolean {
    let infinite = false;
    (this._document as OutlineDocument).getScene().iteratePages((page) => {
      if (!page.isFixedSized()) infinite = true;
      return !infinite;
    }, true);
    return infinite;
  }

  /**
   * Enables the switch and applies it to the view: multi-page view and
   * page labels follow the box, unless a page has an infinite canvas
   * (then the box is unchecked, with an alert when asked, and the view
   * only switches back to single page).
   */
  _refreshPageModeSwitch(
    checkbox: HTMLInputElement | null,
    {
      showAlert = false,
      skipInvalidation = false,
    }: { showAlert?: boolean; skipInvalidation?: boolean } = {},
  ): void {
    const switchable = !this.sceneHasInfiniteCanvas();
    const box = checkbox as HTMLInputElement;
    if (!this.isEnabled()) {
      box.setAttribute("data-title", "");
      box.disabled = true;
      return;
    }
    box.disabled = false;
    const window = (this._document as OutlineDocument).getActiveWindow() as OutlineWindow;
    const view = window.getView();
    let apply = switchable;
    if (!apply) {
      if (box.matches(":checked")) box.checked = false;
      if (showAlert) SystemDialog.alert(text("GOutlineSidebar", "text.multipage-alert"));
      apply = !!(
        view.getViewConfiguration().multiPageView || view.getViewConfiguration().pageLabelsVisible
      );
    }
    if (apply) {
      view.getViewConfiguration().multiPageView = box.matches(":checked");
      view.getViewConfiguration().pageLabelsVisible = box.matches(":checked");
      if (!skipInvalidation) {
        view.invalidate(null, true);
        if (showAlert) {
          window.centerAndZoom();
          this._refreshSelection();
        }
      }
    }
  }

  _deletePage(): void {
    designer().stats("pages_delete_page");
    const document = this._document as OutlineDocument;
    document.getEditor();
    const scene = document.getScene();
    const page = scene.getActivePage() as Page;
    if ((page.getProperty("plkt") as number) & Block.ProgramLck.NoDelete) return;
    const remove = (): void => {
      Editor.tryRunTransaction(
        scene,
        () => {
          scene.deleteActivePage();
        },
        text("GOutlineSidebar", "action.delete-page"),
      );
    };
    if (page.getSlavePages().length > 0)
      void SystemDialog.confirm(
        text("GOutlineSidebar", "text.confirm-delete-masterpage"),
        (ok) => {
          if (ok) remove();
        },
        null,
        null,
        true,
        true,
      );
    else remove();
    this._navigateDrawingCenter(scene.getActivePage() as Page);
    this._refreshSelection();
  }

  /**
   * Keeps the selection on the active page: in multi-page view the page
   * itself gets selected; otherwise elements of other pages drop out.
   */
  _refreshSelection(): void {
    const document = this._document as OutlineDocument;
    const editor = document.getEditor();
    const scene = document.getScene();
    const multiPageView = (document.getActiveWindow() as OutlineWindow)
      .getView()
      .getViewConfiguration().multiPageView;
    const page = scene.getActivePage();
    if (editor.hasSelection()) {
      const selection = editor.getSelection() as Node[];
      if (multiPageView) editor.updateSelection(false, [page]);
      else {
        const kept = selection.filter((node) => Editor.getElementPage(node) === page);
        if (kept.length !== selection.length) editor.updateSelection(false, kept);
      }
    } else if (multiPageView) editor.updateSelection(false, [page]);
  }

  _movePageTreeNodeCallback(parent: Node | null, reference: Node | null, nodes: Node[]): void {
    if (!(nodes && parent && nodes.length)) return;
    const pagePanel = this._pagePanel as PagePanel;
    pagePanel.blockHandlers(true);
    const document = this._document as OutlineDocument;
    const scene = document.getScene();
    const target = parent as PanelContainerNode;
    Editor.tryRunTransaction(
      scene,
      () => {
        document.getEditor().clearSelection();
        scene.startBlockReferenceChanges();
        if (nodes.length > 1) target.beginUpdate();
        for (let i = nodes.length; i > 0; --i) {
          const node = nodes[i - 1] as Node;
          (node.getParent() as PanelContainerNode).removeChild(node);
          target.insertChild(node, reference);
        }
        if (nodes.length > 1) target.endUpdate();
        scene.endBlockReferenceChanges();
        if (scene.isEvenOddMaster()) scene.reassignMasterPages();
      },
      text("GOutlineSidebar", "action.move-page"),
    );
    pagePanel.blockHandlers(false);
  }

  _startPageDraggingCallback(node: Node): Node[] | null {
    designer().stats("pages_start_drag");
    let nodes: Node[] | null = null;
    if (node) {
      nodes = [];
      const editor = (this._document as OutlineDocument).getEditor();
      if (node.hasFlag(Node.Flag.Selected as number)) {
        const selection = editor.getSelection();
        nodes = this._filterPageDraggable(selection);
        nodes = Node.order(nodes, true) as Node[];
      } else {
        editor.clearSelection();
        nodes.push(node);
      }
    }
    return nodes;
  }

  _filterPageDraggable(nodes: Node[] | null): Node[] {
    const out: Node[] = [];
    if (nodes)
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i] as Node;
        if (node instanceof Page && !node.hasFlag(Element.Flag.PartialLocked as number))
          out.push(node);
      }
    return out;
  }

  /** Makes the page active (in a transaction), moves the view to it and fixes the selection. */
  changeActivePage(page: unknown): void {
    designer().stats("pages_select_page");
    const document = this._document;
    const scene = document && document.getScene();
    if (scene && page)
      Editor.tryRunTransaction(
        scene,
        () => {
          scene.setActivePage(page as Page);
          this._navigateDrawingCenter(page as Page);
          this._refreshSelection();
        },
        text("GOutlineSidebar", "action.change-active-page"),
      );
  }

  _clickPageTreeNodeCallback(node: Node | null): void {
    this.changeActivePage(node);
  }

  _navigateDrawingCenter(page: Page): void {
    const document = this._document as OutlineDocument;
    const view = (document.getActiveWindow() as OutlineWindow).getView();
    if (view.getViewConfiguration().multiPageView) {
      const transform = page.getTransform();
      const box = page.getGeometryBBox();
      const center = (transform as Transform).mapRect(box as Rect).getSide(Rect.Side.CENTER);
      view.zoomAtCenter(center);
    } else if (document.hasCDR()) {
      const box = page.getContentBBox();
      if (box && !box.isEmpty()) view.zoomAtCenter(box.getSide(Rect.Side.CENTER));
    }
  }

  /** A new layer named "Layer <count of layers>". */
  createLayer(): Layer {
    const scene = (this._document as OutlineDocument).getScene();
    const layer = new Layer();
    layer.setProperty(
      "name",
      text("GOutlineSidebar", "text.layer") + " " + scene.queryCount("layer").toString(),
    );
    return layer;
  }

  /**
   * The new layer button (and Cmd+M): a layer above the frontmost
   * selected element (or at the top of the page), with the selected
   * elements moved into it.
   */
  insertLayer(): void {
    if (!applicationManager().isEditingEnabled()) return;
    designer().stats("layers_insert_layer");
    const scene = (this._document as OutlineDocument).getScene();
    Editor.tryRunTransaction(
      scene,
      () => {
        const active = designer().getActiveDocument();
        const editor = active && active.getEditor();
        const selection = ((editor && editor.getSelection()) || []) as Node[];
        let page = scene.getActivePage();
        if (!page) {
          page = scene.insertPage();
          page.setFlag(Node.Flag.Active as number);
        }
        const layer = this.createLayer();
        const nodes = selection.filter((node) => !this._hasSelectedParentLayer(node));
        const ordered = Node.order(nodes, true) as Node[] | null;
        const front = ordered && ordered[0];
        (
          (front && (front.getParent() as PanelContainerNode)) ||
          (page as PanelContainerNode)
        ).insertChild(layer, front);
        scene.setActiveLayer(layer);
        this._moveLayers(layer, null, nodes, false);
      },
      text("GOutlineSidebar", "action.insert-layer"),
    );
  }

  _hasSelectedParentLayer(node: Node): boolean {
    let found = false;
    for (
      let parent = node.getParent();
      parent instanceof Layer && !found;
      parent = parent.getParent()
    )
      if (parent.hasFlag(Node.Flag.Selected as number)) found = true;
    return found;
  }

  _moveLayerTreeNodeCallback(parent: Node | null, reference: Node | null, nodes: Node[]): void {
    const scene = (this._document as OutlineDocument).getScene();
    Editor.tryRunTransaction(
      scene,
      () => {
        this._moveLayers(parent, reference, nodes);
      },
      text("GOutlineSidebar", "action.move-layer"),
    );
  }

  /** Moves (with Alt: copies) the nodes into parent before reference and selects them. */
  _moveLayers(parent: Node | null, reference: Node | null, nodes: Node[], block = true): void {
    if (!(parent && parent.hasMixin(Node.Container) && nodes && nodes.length)) return;
    const target = parent as PanelContainerNode;
    nodes = nodes
      .slice()
      .filter((node) => Editor.validateBlockInsertion(node.getParent(), node, reference));
    if (!nodes.length) return;
    const layerPanel = this._layerPanel as LayerPanel;
    if (block) layerPanel.blockHandlers(true);
    const document = this._document as OutlineDocument;
    const scene = document.getScene();
    document.getEditor().clearSelection();
    scene.startBlockReferenceChanges();
    if (nodes.length > 1) target.beginUpdate();
    nodes.forEach((original) => {
      let node: Node | null = original;
      if (Platform.modifiers.optionKey) {
        if (node.hasMixin(Node.Store)) node = cloneNode(node);
      } else (node.getParent() as PanelContainerNode).removeChild(node);
      if (node) {
        target.insertChild(node, reference);
        if (parent instanceof CompoundShape)
          // assignStyleFrom is the Stylable mixin's, which Node's typings lack.
          (node as unknown as { assignStyleFrom(source: unknown): void }).assignStyleFrom(parent);
      }
    });
    if (nodes.length > 1) target.endUpdate();
    scene.endBlockReferenceChanges();
    // Selects the originals, also when Alt copied them; see "Alt-drag in the
    // layers panel selects the originals" in QUESTIONS.md.
    document.getEditor().updateSelection(false, nodes);
    if (block) layerPanel.blockHandlers(false);
  }

  _isDuplicateEffectCallback(event: TreeDropEvent): boolean {
    return !!event.altKey;
  }

  _duplicateLayerTreeNodeCallback(
    parent: Node | null,
    reference: Node | null,
    nodes: Node[],
  ): void {
    if (!(nodes && parent && parent.hasMixin(Node.Container) && nodes.length)) return;
    const target = parent as PanelContainerNode;
    // The old code passed false here (handlers stay on); see "Duplicating
    // rows doesn't block the panel's own handlers" in QUESTIONS.md.
    (this._layerPanel as LayerPanel).blockHandlers(false);
    const scene = (this._document as OutlineDocument).getScene();
    Editor.tryRunTransaction(
      scene,
      () => {
        const editor = (this._document as OutlineDocument).getEditor();
        editor.clearSelection();
        if (nodes.length > 1) target.beginUpdate();
        const copies: Node[] = [];
        for (let i = 0; i < nodes.length; ++i) {
          let node: Node | null = nodes[i] as Node;
          if (
            node.validateInsertion(target) &&
            node.hasMixin(Node.Store) &&
            Editor.validateBlockInsertion(target, node) &&
            (node = cloneNode(node))
          )
            copies.push(node);
        }
        editor.insertElements(copies, true, true, false, true, target, reference);
        if (parent instanceof CompoundShape) {
          for (let i = 0; i < copies.length; ++i)
            // assignStyleFrom is the Stylable mixin's, which Node's typings lack.
            (copies[i] as unknown as { assignStyleFrom(source: unknown): void }).assignStyleFrom(
              parent,
            );
        } else if (parent instanceof Shape) {
          const box = parent.getPaintBBox();
          if (box) {
            const x = box.getX();
            const y = box.getY();
            for (let i = 0; i < copies.length; ++i) {
              const copy = copies[i] as Node;
              const copyBox = copy instanceof Element ? copy.getPaintBBox() : null;
              if (copyBox && !box.intersectsRect(copyBox, true)) {
                const copyX = copyBox.getX();
                const copyY = copyBox.getY();
                if (!(
                  null === x ||
                  null === copyX ||
                  (GMath.isEqualEps(x, copyX) && GMath.isEqualEps(y, copyY))
                ))
                  // transform is the Transform mixin's (the copy is an Element), which Node's typings lack.
                  (copy as unknown as Transformable).transform(
                    new Transform(1, 0, 0, 1, x - copyX, y - copyY),
                    true,
                  );
              }
            }
          }
        }
        if (nodes.length > 1) target.endUpdate();
        editor.updateSelection(false, copies);
      },
      text("GOutlineSidebar", "action.move-layer"),
    );
  }

  _startLayerDraggingCallback(node: Node): Node[] | null {
    let nodes: Node[] | null = null;
    if (node) {
      designer().stats("layers_start_drag");
      nodes = [];
      const editor = (this._document as OutlineDocument).getEditor();
      if (node.hasFlag(Node.Flag.Selected as number)) {
        const selection = editor.getSelection();
        nodes = this._filterLayerDraggable(selection);
        nodes = Node.order(nodes, true) as Node[];
      } else {
        editor.clearSelection();
        nodes.push(node);
      }
    }
    return nodes;
  }

  _patternChooserStatusChange(open: boolean): void {
    (this._layerToolbar as HTMLElement).classList.toggle("pattern-choose-actived", open);
  }

  /** The selected nodes that can be dragged: not partly locked and without a selected parent. */
  _filterLayerDraggable(nodes: Node[] | null): Node[] {
    const out: Node[] = [];
    if (nodes)
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i] as Node;
        if (!node.hasFlag(Element.Flag.PartialLocked as number)) {
          let selectedParent = false;
          for (
            let parent = node.getParent();
            null != parent && !selectedParent;
            parent = parent.getParent()
          )
            selectedParent = parent.hasFlag(Node.Flag.Selected as number);
          if (!selectedParent) out.push(node);
        }
      }
    return out;
  }

  /**
   * A click on a layer row: selects the node (Cmd toggles it, Shift
   * selects the range from the last selected node of the same kind), or
   * deselects a selected row. With Alt it then zooms to the selection (or
   * everything when nothing is selected).
   */
  _clickLayerTreeNodeCallback(node: Node | null): void {
    if (!node) return;
    if (node instanceof CollabText) designer().stats("layers_select_collab-text");
    else designer().stats("layers_select_layer");
    const document = this._document as OutlineDocument;
    document.getScene().updateActivePageForElem(node);
    document.getScene().updateActiveLayerForElem(node);
    const editor = document.getEditor();
    let kind: typeof Item | typeof Layer | null = null;
    let changed = false;
    if (node instanceof Item) kind = Item;
    else if (node instanceof Layer) kind = Layer;
    if (!kind) return;
    const view = designer().getWindows().getActiveWindow()?.getView() as OutlineView;
    for (const child of view.getHtmlElement().children)
      if (child instanceof HTMLDivElement && child.getAttribute("tabindex") === "0") child.focus();
    const layerPanel = this._layerPanel as LayerPanel;
    const modifiers = Platform.modifiers;
    if (
      modifiers.metaKey ||
      (!node.hasFlag(Node.Flag.Selected as number) &&
        !node.hasFlag(Element.Flag.FullLocked as number) &&
        !modifiers.shiftKey)
    ) {
      layerPanel.onlyUpdateStyle(true);
      editor.updateSelection(modifiers.metaKey, [node]);
      layerPanel.onlyUpdateStyle(false);
      changed = true;
    } else if (modifiers.shiftKey) {
      const selection = editor.getSelection();
      let anchor: Node | null = null;
      if (selection && selection.length) {
        for (let i = selection.length - 1; i >= 0 && !anchor; --i)
          if (selection[i] instanceof kind) anchor = selection[i] as Node;
        if (anchor && anchor !== node) {
          let all: Node[] = [];
          const sameKind = kind;
          document.getScene().accept(
            (candidate) => {
              if (candidate instanceof sameKind) all.push(candidate);
              return true;
            },
            false,
            true,
          );
          if (all) {
            all = Node.order(all) as Node[];
            let range: Node[] = [];
            let inside = false;
            let anchorIndex: number | null = null;
            let nodeIndex: number | null = null;
            for (let i = 0; i < all.length && (null === anchorIndex || null === nodeIndex); ++i) {
              const candidate = all[i] as Node;
              if (candidate === anchor || candidate === node) {
                inside = !inside;
                range.push(candidate);
                if (candidate === anchor) anchorIndex = i;
                else nodeIndex = i;
              } else if (inside) range.push(candidate);
            }
            const anchorParent = (anchor as Node).getParent();
            const nodeParent = node.getParent();
            const first = anchor;
            range = range.filter((candidate) => {
              const treeNode = layerPanel.getTreeNode(candidate);
              if (node === candidate || first === candidate) return true;
              const parentItem = layerPanel.getItem(
                (treeNode as VirtualTreeNode).parent as VirtualTreeNode,
              );
              return parentItem
                ? anchorParent === parentItem
                : candidate !== anchorParent && candidate !== nodeParent;
            });
            const autoExpand = designer().getSetting("auto_expand_layers");
            designer().setSetting("auto_expand_layers", false);
            if (range.length) {
              if ((anchorIndex as number) > (nodeIndex as number)) range.reverse();
              editor.updateSelection(false, range);
              changed = true;
            }
            setTimeout(() => {
              designer().setSetting("auto_expand_layers", autoExpand);
            }, 50);
          }
        } else {
          editor.updateSelection(false, [node]);
          changed = true;
        }
      }
    } else if (node.hasFlag(Node.Flag.Selected as number)) {
      layerPanel.onlyUpdateStyle(true);
      editor.clearSelection();
      layerPanel.onlyUpdateStyle(false);
      changed = true;
    }
    if (!changed) return;
    if (modifiers.optionKey) {
      if (editor.hasSelection())
        designer().executeAction(FitSelectionAction.ID, undefined, "outlinesidebar");
      else designer().executeAction(FitAllAction.ID, undefined, "outlinesidebar");
    } else if (node.hasMixin(Node.Properties) && (node as PanelNode).getProperty("collab")) {
      const window = document.getActiveWindow();
      if (window) window.scrollIntoView((node as Element).getGeometryBBox());
    }
  }

  /** The delete button: deletes the selection (and the active layer when it is then empty), or the active layer. */
  _deleteLayerOrItem(): void {
    designer().stats("layers_delete_layer-or-item");
    const document = this._document as OutlineDocument;
    const editor = document.getEditor();
    const scene = document.getScene();
    const layer = scene.getActiveLayer();
    if (editor.hasSelection())
      Editor.tryRunTransaction(
        scene,
        () => {
          editor.deleteSelection(true);
          const active = scene.getActiveLayer();
          if (
            layer &&
            layer === active &&
            !(layer as PanelContainerNode).acceptChildren(
              (child) => child instanceof Item,
              false,
              true,
            )
          )
            scene.deleteActiveLayer(layer);
        },
        text("GOutlineSidebar", "action.delete-layer-item"),
      );
    else if (layer)
      Editor.tryRunTransaction(
        scene,
        () => {
          scene.deleteActiveLayer(layer);
        },
        text("GOutlineSidebar", "action.delete-layer-item"),
      );
  }

  _updateExport(): void {
    if (this._exportInstance)
      this._exportInstance.update(
        // The sidebar types the active document as the parts it calls
        // (OutlineDocument); it is the app's Document.
        this._document as unknown as Document | null,
        this._elements,
      );
  }

  _updateTransformMode(transform: boolean): void {
    if (transform !== this._transformMode) {
      this._transformMode = transform;
      this._updateExport();
    }
  }

  _afterFlagChangeEvent(event: AfterFlagChangeEvent): void {
    if (
      event.node instanceof Page &&
      event.flag === Node.Flag.Active &&
      !(this._document as OutlineDocument).getEditor().hasSelection()
    )
      this._updateExport();
  }

  _afterPropertiesChanged(event: AfterPropertiesChangeEvent): void {
    if (
      !event.temporary &&
      (event.node instanceof Scene || event.node instanceof Page) &&
      Util.containsOneOf(event.properties as string[], ["w", "h"])
    )
      this._refreshPageModeSwitch(this._getMultiPageSwitcher());
  }

  _afterInsert(event: AfterInsertEvent): void {
    const node = event.node;
    if (node instanceof Page && 0 === node.getProperty("w"))
      this._refreshPageModeSwitch(this._getMultiPageSwitcher());
  }

  override toString(): string {
    return "[Object GOutlineSidebar]";
  }
}
