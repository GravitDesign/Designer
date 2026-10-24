// Old: designer.browser.dev.js module 864 (GInspectorSidebar).
/**
 * The right sidebar with the property panels. It creates every panel of
 * PROPERTIES_TABLE (the old gravit.properties, in that order) into its
 * container once, and then shows the panels that accept the current
 * selection (or the active tool's default style, or the active page)
 * whenever the selection, the tool, the select tool's transform mode or
 * the document's storage item change.
 *
 * Registration of the other inspector clusters' panels: PROPERTIES_TABLE
 * names each panel's port-map file and export; the sidebar looks them up
 * at init through late.ts, so a panel appears as soon as its file exports
 * the class (see properties.ts for the contract). Missing ones are
 * listed by pendingProperties().
 *
 * Plain DOM, as the old jQuery code built it: the panels own the elements
 * they get in init and the sidebar toggles their display, the dividers and
 * the "last-toolbar" class in the old order.
 *
 * Dropped with the cloud: the version history panel (module 1528) and its
 * touch overlay (module 1529).
 */
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { registerClass } from "../../engine/core/object.ts";
import { AnnotationMixin } from "../../engine/scene/annotations/annotation.ts";
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Editor } from "../../editor/editor.ts";
import { ItemTool } from "../../editor/tools/item-tool.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { ToolChangedEvent } from "../../editor/tools/tool-manager.ts";
import type { Tool } from "../../editor/tools/tool.ts";
import { initAccordion } from "../widgets/accordion.ts";
import { DocumentEvent } from "../document/document-event.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";
import type { Properties } from "./properties.ts";
import { Sidebars, type SidebarLike, type SidebarTouchTool } from "../shell/layout.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { SidebarEvent } from "../shell/sidebar-event.ts";
import { SidebarsIds } from "../shell/sidebar-ids.ts";
import { Sidebar } from "../shell/sidebar.ts";
import { View } from "../shell/view.ts";
import {
  el,
  hide,
  insertAfter,
  isVisible,
  sceneOf,
  setDisplayed,
  show,
  type InspectedElements,
} from "./properties.ts";

/** One entry of the old gravit.properties table. */
export interface PropertiesRegistration {
  /** The old class name (or a description for the unnamed modules). */
  name: string;
  /** The old module ("a1294"). */
  module: string;
  /** The port-map target below src/app. */
  file: string;
  /** The export the file must have (a Properties subclass, constructed without arguments). */
  exportName: string;
}

const reg = (
  name: string,
  module: string,
  file: string,
  exportName: string,
): PropertiesRegistration => ({ name, module, file, exportName });

/**
 * gravit.properties in the old order (bootstrap a1483). Every inspector
 * cluster exports its panel under this name from this file.
 */
export const PROPERTIES_TABLE: readonly PropertiesRegistration[] = [
  reg("GDimensionProperties", "a1294", "inspector/dimension-properties.ts", "DimensionProperties"),
  reg("GAlignProperties", "a1274", "inspector/align-properties.ts", "AlignProperties"),
  reg("GTransformProperties", "a1660", "inspector/transform-properties.ts", "TransformProperties"),
  reg("GPageProperties", "a1339", "inspector/page-properties.ts", "PageProperties"),
  reg("GSceneProperties", "a1659", "inspector/scene-properties.ts", "SceneProperties"),
  reg(
    "GGroupFrameProperties",
    "a1655",
    "inspector/group-frame-properties.ts",
    "GroupFrameProperties",
  ),
  reg("GFrameProperties", "a1654", "inspector/frame-properties.ts", "FrameProperties"),
  reg("GItemProperties", "a1656", "inspector/item-properties.ts", "ItemProperties"),
  reg("GPolygonProperties", "a1270", "inspector/polygon-properties.ts", "PolygonProperties"),
  reg("GPathProperties", "a1269", "inspector/path-properties.ts", "PathProperties"),
  reg("GEllipseProperties", "a1265", "inspector/ellipse-properties.ts", "EllipseProperties"),
  reg("GTextProperties", "a1273", "inspector/text-properties.ts", "TextProperties"),
  reg("GImageProperties", "a1266", "inspector/image-properties.ts", "ImageProperties"),
  reg("GRectangleProperties", "a1271", "inspector/rectangle-properties.ts", "RectangleProperties"),
  reg("GSliceProperties", "a1272", "inspector/slice-properties.ts", "SliceProperties"),
  reg("GBoolOpProperties", "a1264", "inspector/bool-op-properties.ts", "BoolOpProperties"),
  reg("GSymbolProperties", "a1658", "inspector/symbol-properties.ts", "SymbolProperties"),
  reg(
    "GAppearanceProperties",
    "a1160",
    "inspector/appearance-properties.ts",
    "AppearanceProperties",
  ),
  reg("fill properties", "a1261", "inspector/fill-properties.ts", "FillProperties"),
  reg("border properties", "a1162", "inspector/border-properties.ts", "BorderProperties"),
  reg("GEffectProperties", "a1262", "inspector/effect-properties.ts", "EffectProperties"),
];

type PropertiesClass = new () => Properties;

const pending: string[] = [];

/** The PROPERTIES_TABLE entries whose file or export is missing at the last build. */
export function pendingProperties(): readonly string[] {
  return pending;
}

/** The panel instances of the table that exist, in the table's order. */
export function buildProperties(
  table: readonly PropertiesRegistration[] = PROPERTIES_TABLE,
): Properties[] {
  pending.length = 0;
  const out: Properties[] = [];
  for (const entry of table) {
    const cls = lateExport<PropertiesClass>(entry.file, entry.exportName);
    if (typeof cls !== "function") {
      pending.push(`${entry.name} (${entry.module}, ${entry.file} ${entry.exportName})`);
      continue;
    }
    out.push(new cls());
  }
  return out;
}

/** The old toString of the class a table entry names (for the group lists below). */
function oldClassString(exportName: string, file: string): string | null {
  const cls = lateExport<PropertiesClass>(file, exportName);
  return typeof cls === "function" ? cls.prototype.toString() : null;
}

function tableString(exportName: string): string | null {
  const entry = PROPERTIES_TABLE.find((e) => e.exportName === exportName);
  return entry ? oldClassString(entry.exportName, entry.file) : null;
}

interface PropertyPanel {
  panel: HTMLElement;
  toolbar: HTMLElement | null;
  divider: HTMLElement;
  properties: Properties;
}

/** Where the sidebar finds the panel list; tests set their own. */
let propertiesSource: () => Properties[] = () => buildProperties();

/** Replaces the panel list the next init uses (unit tests). */
export function setPropertiesSource(source: () => Properties[]): void {
  propertiesSource = source;
}

export class InspectorSidebar extends Sidebar implements SidebarLike {
  static {
    registerClass(this, "GInspectorSidebar");
  }

  static readonly ID = SidebarsIds.GInspectorSidebar;
  static readonly TITLE = new LocaleKey("GInspectorSidebar", "title");

  /**
   * The panels whose toolbar becomes an accordion header (old
   * T.ACCORDIONS: appearance, fill, border, effects, by toString). Read
   * at use, because the classes come from other clusters' files.
   */
  static get ACCORDIONS(): (string | null)[] {
    return [
      tableString("AppearanceProperties"),
      tableString("FillProperties"),
      tableString("BorderProperties"),
      tableString("EffectProperties"),
    ];
  }

  /** The panels that share the appearance toolbar (old T.APPEARANCE_PROPERTIES). */
  static get APPEARANCE_PROPERTIES(): (string | null)[] {
    return [
      tableString("AlignProperties"),
      tableString("RectangleProperties"),
      tableString("PathProperties"),
      tableString("EllipseProperties"),
      tableString("TextProperties"),
      tableString("ImageProperties"),
      tableString("PolygonProperties"),
      tableString("SliceProperties"),
      tableString("BoolOpProperties"),
      tableString("AppearanceProperties"),
    ];
  }

  _touchTools: SidebarTouchTool[] = [];
  _htmlElement: HTMLElement | null = null;
  _propertyPanels: PropertyPanel[] = [];
  _document: Document | null = null;
  _elements: InspectedElements | null = null;
  _transformMode = false;
  _appearancePanel: HTMLElement | null = null;

  override getId(): string {
    return InspectorSidebar.ID;
  }

  override getTitle(): LocaleKey {
    return InspectorSidebar.TITLE;
  }

  override isEnabled(): boolean {
    return !!this._document;
  }

  /** isInspectEnabled() of the local application manager is always true. */
  override isVisible(): boolean {
    return true;
  }

  override getOrientation(): string {
    return Sidebars.Orientation.Right;
  }

  override getMinimumWidth(): number {
    return 300;
  }

  override getDefaultWidth(): number {
    return 300;
  }

  override init(htmlElement: HTMLElement): void {
    this._htmlElement = htmlElement;
    const scrolling = el("div", "panels scrolling-panels");
    htmlElement.appendChild(scrolling);
    const sticky = el("div", "panels sticky-panels");
    htmlElement.appendChild(sticky);
    const appearanceToolbar = el("div", "toolbar appearance-toolbar");
    const appearancePanel = el("div");
    appearancePanel.style.display = "none";
    appearancePanel.className = "properties-panel appearance-properties-panel";
    this._appearancePanel = appearancePanel;
    const title = el("label", "appearance-toolbar-title");
    title.textContent = Locale.get(new LocaleKey("GAppearanceProperties", "title")) ?? "";
    appearanceToolbar.appendChild(title);

    const appearanceGroup = InspectorSidebar.APPEARANCE_PROPERTIES;
    for (const properties of propertiesSource()) {
      const container = properties.isSticky() ? sticky : scrolling;
      let panel = el("div");
      panel.style.display = "none";
      panel.className = "properties-panel";
      const divider = el("hr");
      let toolbar: HTMLElement | null = el("div", "toolbar");
      if (appearanceGroup.includes(properties.toString())) {
        const part = el("div", "appearance-property-panel");
        properties.init(part, appearanceToolbar);
        part.appendChild(divider);
        appearancePanel.appendChild(part);
        container.appendChild(appearanceToolbar);
        container.appendChild(appearancePanel);
        toolbar = appearanceToolbar;
        panel = part;
      } else {
        container.appendChild(divider);
        properties.init(panel, toolbar);
        if (toolbar.innerHTML !== "") container.appendChild(toolbar);
        else toolbar = null;
        container.appendChild(panel);
      }
      this._propertyPanels.push({ panel, toolbar, divider, properties });
    }

    const d = designer();
    this._activeTool(d.getToolManager().getActiveTool());
    this._updatePropertyPanels();
    d.getRightSidebars().addEventListener(SidebarEvent, this._sidebarEvent, this);
    d.addEventListener(SettingChangedEvent, this._settingChanged, this);
  }

  _getPropertyPanel<T extends Properties>(
    cls: abstract new (...args: never[]) => T,
  ): (PropertyPanel & { properties: T }) | null {
    return (
      (this._propertyPanels.find((p) => p.properties instanceof cls) as
        (PropertyPanel & { properties: T }) | undefined) || null
    );
  }

  /** The panel whose class is the export `exportName` of the table. */
  private _panelOf(exportName: string): PropertyPanel | null {
    const entry = PROPERTIES_TABLE.find((e) => e.exportName === exportName);
    const cls = entry ? lateExport<PropertiesClass>(entry.file, entry.exportName) : null;
    return typeof cls === "function" ? this._getPropertyPanel(cls) : null;
  }

  openFillPatternChooser(): void {
    const panel = this._panelOf("FillProperties");
    if (panel) panel.properties.openPatternChooser();
  }

  openBorderPatternChooser(): void {
    const panel = this._panelOf("BorderProperties");
    if (panel) panel.properties.openPatternChooser();
  }

  openFillEyeDropper(pageX?: number, pageY?: number): void {
    const panel = this._panelOf("FillProperties");
    if (panel) panel.properties.openEyeDropper(pageX, pageY);
  }

  openBorderEyeDropper(pageX?: number, pageY?: number): void {
    const panel = this._panelOf("BorderProperties");
    if (panel) panel.properties.openEyeDropper(pageX, pageY);
  }

  openTextColorEyeDropper(pageX?: number, pageY?: number): void {
    const panel = this._panelOf("TextProperties");
    if (panel) panel.properties.openEyeDropper(pageX, pageY);
  }

  /** The joint-type actions: GPathProperties.assignNodeType on the selected points. */
  setPathPointsNodeType(type: unknown): void {
    const panel = this._panelOf("PathProperties");
    // The path panel's class is late-bound (PROPERTIES_TABLE), so the entry
    // is typed as the base Properties; the old code called it unchecked too.
    if (panel) (panel.properties as unknown as PathPropertiesLike).assignNodeType(type);
  }

  _sidebarEvent(event: SidebarEvent): void {
    const sidebar = event.sidebar as { getId(): string } | null;
    if (
      designer().isTouchEnabled() &&
      event.type === SidebarEvent.Type.Activated &&
      sidebar &&
      sidebar.getId() === SidebarsIds.GAnnotationsSidebar
    )
      this._updatePropertyPanels();
  }

  override activate(): void {
    const d = designer();
    d.addEventListener(DocumentEvent, this._documentEvent, this);
    d.getToolManager().addEventListener(ToolChangedEvent, this._toolChangedEvent, this);
    const document = d.getActiveDocument() as Document | null;
    if (document) this._activateDocument(document);
  }

  override deactivate(): void {
    const d = designer();
    d.removeEventListener(DocumentEvent, this._documentEvent, this);
    d.getToolManager().removeEventListener(ToolChangedEvent, this._toolChangedEvent, this);
    if (this._document) this._deactivateDocument();
  }

  _documentEvent(event: DocumentEvent): void {
    if (event.type === DocumentEvent.Type.Activated)
      this._activateDocument(event.document as Document);
    else if (event.type === DocumentEvent.Type.Deactivated) this._deactivateDocument();
    else if (event.type === DocumentEvent.Type.StorageItemUpdated)
      this._updatePropertyPanels(false, event.data ? event.data : null);
  }

  _activateDocument(document: Document): void {
    if (this._document) this._deactivateDocument();
    this._document = document;
    const scene = document.getScene();
    const editor = document.getEditor();
    designer()
      .getToolManager()
      .addEventListener(ToolChangedEvent, this._updateFromToolOrSelection, this);
    editor?.addEventListener(Editor.SelectionChangedEvent, this._updateFromToolOrSelection, this);
    scene?.addEventListener(Node.AfterFlagChangeEvent, this._afterFlagChangeEvent, this);
    this._updateFromToolOrSelection();
    this.trigger(View.UPDATE_EVENT);
  }

  _deactivateDocument(): void {
    const document = this._document as Document;
    const scene = document.getScene();
    const editor = document.getEditor();
    designer()
      .getToolManager()
      .removeEventListener(ToolChangedEvent, this._updateFromToolOrSelection, this);
    editor?.removeEventListener(
      Editor.SelectionChangedEvent,
      this._updateFromToolOrSelection,
      this,
    );
    scene?.removeEventListener(Node.AfterFlagChangeEvent, this._afterFlagChangeEvent, this);
    this._document = null;
    this._elements = null;
    this._updatePropertyPanels(true);
    this.trigger(View.UPDATE_EVENT);
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

  _activeTool(tool: Tool | null): void {
    if (tool && tool instanceof SelectTool)
      tool.addEventListener(SelectTool.Event, this._selectToolEvent, this);
  }

  _selectToolEvent(event: InstanceType<typeof SelectTool.Event>): void {
    if (event.type === SelectTool.Event.Type.EditModeChanged)
      this._updateTransformMode(
        (event.args as { mode: number }).mode === SelectTool.EditMode.Transform,
      );
  }

  _updateTransformMode(transformMode: boolean): void {
    if (transformMode !== this._transformMode) {
      this._transformMode = transformMode;
      this._updatePropertyPanels(false);
    }
  }

  _afterFlagChangeEvent(event: InstanceType<typeof Node.AfterFlagChangeEvent>): void {
    if (
      event.node instanceof Page &&
      event.flag === Node.Flag.Active &&
      !(this._document as Document).getEditor()?.hasSelection()
    )
      this._updateFromToolOrSelection();
  }

  _updateFromToolOrSelection(): void {
    // The old code read the editor before checking the document.
    const editor = (this._document as Document).getEditor();
    if (this._document && editor) {
      this._elements = editor.getSelection() as InspectedElements | null;
      // filterIndividualElements takes and returns the editor's structural
      // node view (EdNode in editor.ts), which the engine's Node typings
      // don't fully declare; the elements are the selection's scene nodes.
      if (this._elements && this._elements.length)
        this._elements = editor.filterIndividualElements(
          this._elements.filter((element) => !element.hasMixin(AnnotationMixin)) as never[],
        ) as unknown as InspectedElements;
      if (!this._elements || this._elements.length === 0) {
        const tool = designer().getToolManager().getActiveTool();
        const style: Node | null = tool instanceof ItemTool ? tool.getDefaultStyle() : null;
        if (style) this._elements = [style];
        else this._elements = [sceneOf(this._document).getActivePage() as Node];
      }
    }
    this._updatePropertyPanels(false);
  }

  _updatePropertyPanels(noDocument?: boolean, data?: unknown): void {
    const d = designer();
    const touch = d.isTouchEnabled();
    const htmlElement = this._htmlElement as HTMLElement;
    let anyVisible = false;
    let previous: Properties | null = null;
    // The toolbar of the slice panel (old `s instanceof _`, _ = module 1272),
    // shown again in touch mode after a later appearance panel hid it.
    let sliceToolbar: HTMLElement | null = null;
    this._touchTools = [];
    const accordions = InspectorSidebar.ACCORDIONS;
    const sliceString = tableString("SliceProperties");
    for (const entry of this._propertyPanels) {
      const properties = entry.properties;
      let visible = properties.isAvailable(this._transformMode);
      if (visible)
        visible = entry.properties.update(
          noDocument ? null : this._document,
          this._elements ? this._elements : null,
          data || null,
        );
      if (visible) {
        const tools = entry.properties.getTouchTools();
        if (tools) this._touchTools = this._touchTools.concat(tools);
      }
      setDisplayed(entry.panel, !!visible);
      if (entry.toolbar) {
        setDisplayed(entry.toolbar, !!visible);
        if (sliceString !== null && properties.toString() === sliceString && visible)
          sliceToolbar = entry.toolbar;
        if (accordions.includes(entry.properties.toString()) && visible) {
          entry.toolbar.classList.add("appearance-panel-toggle-btn");
          initAccordion(entry.toolbar, { next: ".properties-panel", title: "label" });
          for (const button of htmlElement.querySelectorAll<HTMLElement>(
            ".appearance-panel-toggle-btn button.g-accordion",
          ))
            if (touch) hide(button);
            else show(button);
        }
      }
      const group = !!visible && anyVisible && properties.isGroup(previous);
      setDisplayed(entry.divider, group);
      anyVisible = anyVisible || !!visible;
      if (visible) {
        previous = properties;
        setDisplayed(this._appearancePanel as HTMLElement, true);
      }
      // _isPropertiesEnabled is always true in the old code.
      if (entry.toolbar) entry.toolbar.classList.toggle("g-disabled", false);
      if (entry.panel) entry.panel.classList.toggle("g-disabled", false);
    }
    if (sliceToolbar && touch) sliceToolbar.style.display = "";

    const page = htmlElement.ownerDocument;
    if (page.querySelectorAll(".appearance-divider").length === 0) {
      const firstToolbar = page.querySelector(".appearance-toolbar");
      if (firstToolbar) firstToolbar.before(el("hr", "appearance-divider"));
    }
    const firstToolbar = page.querySelector(".appearance-toolbar");
    const dividerHidden =
      !!firstToolbar && getComputedStyle(firstToolbar).getPropertyValue("display") === "none";
    for (const divider of page.querySelectorAll<HTMLElement>(".appearance-divider"))
      setDisplayed(divider, !dividerHidden);
    const visibleRules = [
      ...page.querySelectorAll<HTMLElement>(".appearance-properties-panel >div >hr"),
    ].filter(isVisible);
    const lastRule = visibleRules[visibleRules.length - 1];
    if (lastRule) lastRule.style.display = "none";
    for (const sidebar of page.querySelectorAll(".sidebar-inspector")) {
      const toolbars = [...sidebar.querySelectorAll<HTMLElement>(".toolbar")];
      for (const toolbar of toolbars) toolbar.classList.remove("last-toolbar");
      const shown = toolbars.filter(isVisible);
      shown[shown.length - 1]?.classList.add("last-toolbar");
    }
    if (touch) this._fireUpdateEvent();
    this._updateUI();
  }

  /** Moves the frame, group frame, item and symbol instance panels below the scene panel. */
  _updateUI(): void {
    const htmlElement = this._htmlElement as HTMLElement;
    const groupFrame = htmlElement.querySelector(".group-frame-property-panel");
    const frame = htmlElement.querySelector(".frame-property-panel");
    const item = htmlElement.querySelector(".item-property-panel");
    const symbolToolbar = htmlElement.querySelector(".symbol-instance-toolbar");
    const symbolPanel = htmlElement.querySelector(".symbol-instance-panel");
    const anchor = designer().isTouchEnabled()
      ? htmlElement.querySelector(
          ".appearance-properties-panel .appearance-property-panel:last-child",
        )
      : (htmlElement.querySelector(".scene-properties-panel")?.nextElementSibling ?? null);
    if (anchor) {
      insertAfter(symbolPanel, anchor);
      insertAfter(symbolToolbar, anchor);
      insertAfter(item?.nextElementSibling ?? null, anchor);
      insertAfter(item, anchor);
      insertAfter(frame?.nextElementSibling ?? null, anchor);
      insertAfter(frame, anchor);
      insertAfter(groupFrame?.nextElementSibling ?? null, anchor);
      insertAfter(groupFrame, anchor);
    }
  }

  _settingChanged(event: SettingChangedEvent): void {
    if (event.key === "touch") {
      const touch = designer().isTouchEnabled();
      for (const button of (this._htmlElement as HTMLElement).querySelectorAll<HTMLElement>(
        ".appearance-panel-toggle-btn button.g-accordion",
      ))
        if (touch) hide(button);
        else show(button);
      this._updateUI();
      this._updatePropertyPanels();
    }
  }

  override getTouchTools(options: { disableContextSensitive?: boolean } = {}): SidebarTouchTool[] {
    const { disableContextSensitive = false } = options;
    return disableContextSensitive ? this._getAllTouchTools() : this._touchTools;
  }

  _getAllTouchTools(): SidebarTouchTool[] {
    return [
      ...new Set(
        this._propertyPanels.reduce<SidebarTouchTool[]>((all, entry) => {
          const tools = entry.properties.getTouchTools();
          if (tools) all = all.concat(tools);
          return all;
        }, []),
      ),
    ];
  }

  override toString(): string {
    return "[Object GInspectorSidebar]";
  }
}

/** What setPathPointsNodeType needs of the path panel. */
interface PathPropertiesLike {
  assignNodeType(type: unknown): void;
}
