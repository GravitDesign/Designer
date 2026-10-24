// Old: designer.browser.dev.js module 1261 (the fill paint layer panel).
/**
 * The inspector's fill panel: one row per fill paint layer of the first
 * inspected element (color swatch, blend mode, opacity, visibility, plus
 * the touch layout's rows), the toolbar (fill rule buttons for touch, the
 * advanced settings, remove and add) and the advanced settings overlay
 * (the fill rule).
 *
 * Changes apply to every inspected element's fill at the same index
 * (`_iterateEqualPaintLayer`). Rows are dragged to reorder (Shift
 * duplicates) or out of the panel to delete. The border panel
 * (border-properties.ts) is the sibling with the same structure.
 *
 * The old module defined no toString, so the panel reports the
 * inherited "[Object GProperties]", as before (the inspector sidebar
 * sorts panels into its groups by that string).
 */
import type { Pattern } from "../../engine/style/pattern.ts";
import { Color } from "../../engine/color/color.ts";
import { ColorHelper } from "../../engine/color/color-helper.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { formatOpacity } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforeRemoveEvent,
} from "../../engine/scene/node-events.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { NoisePattern } from "../../engine/style/noise-pattern.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { PropertySet } from "../../engine/style/stylable-sets.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { Editor, ModifiedEvent } from "../../editor/editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { StyleEdManager, type PatternHolder } from "../../editor/style-ed-manager.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { config } from "../config.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import type { Document } from "../document/document.ts";
import { ContextMenuContext, type ContextMenuOptions } from "../menus/context-menu.ts";
import { computed, css, cssAll, outerHeight } from "../shell/dom.ts";
import { designer, dragImage } from "../shell/globals.ts";
import type { SidebarLike, SidebarTouchTool } from "../shell/layout.ts";
import { SidebarEvent } from "../shell/sidebar-event.ts";
import { SidebarsIds } from "../shell/sidebar-ids.ts";
import { initAccordion, toggleAccordionOpen } from "../widgets/accordion.ts";
import { initBlendMode } from "../widgets/blend-select.ts";
import { offset } from "../widgets/dom-helpers.ts";
import { InputBox } from "../widgets/input-box.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import {
  chooserOf,
  clickPreview,
  eventArgs,
  inputSlider,
  patternChooser,
  patternChooserPopup,
  setSliderValue,
  sliderValue,
} from "./color-deps.ts";
import {
  addClass,
  attrs,
  changeArgs,
  el,
  findAll,
  getData,
  parents,
  propertyRow,
  removeClass,
  setData,
  setText,
  setValue,
  str,
  toggleClass,
  triggerChange,
} from "./paint-dom.ts";
import { PanelIds } from "./panel-ids.ts";
import { Properties, type InspectedElements } from "./properties.ts";
import { handleDragForDeleteIcon } from "../widgets/drag-delete.ts";
import { PressMode } from "../shell/press-mode.ts";

/** An inspected element with fills (a stylable node with paint layers). */
type FillOwner = Node & {
  getPaintLayers(): PaintLayers;
  getStylePropertySets(): string[];
  hasProperty(name: string): boolean;
  getProperty(name: string): unknown;
  setProperties(names: string[], values: unknown[]): unknown;
};

const KEY = "GFillPaintLayerProperties";

type Assign = (names: string[], values: unknown[], temporary?: boolean, related?: unknown) => void;

function layerOf(element: Element | null | undefined): FillPaintLayer | undefined {
  return getData<FillPaintLayer>(element, "paintLayer");
}

/** `$(el).position().top`: the top relative to the offset parent, without the margin. */
function positionTop(element: HTMLElement): number {
  return element.offsetTop - (parseFloat(computed(element, "margin-top")) || 0);
}

function tooltip(fields: ConstructorParameters<typeof RichTooltipConfig>[0]): RichTooltipConfig {
  return RichTooltipConfig.from(fields);
}

export class FillProperties extends Properties {
  _panel: HTMLElement | null = null;
  _advancedFillPanel: HTMLElement | null = null;
  _advancedFillOverlay: Overlay | null = null;
  _toolbar: HTMLElement | null = null;
  _elements: FillOwner[] | null = null;
  _styleEditorChange = false;
  _styleEdOn = false;
  _ownChange = false;
  _chooserElem: HTMLElement | null = null;

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._panel = addClass(panel, "fill-properties-panel");
    this._toolbar = toolbar;
    this.setTouchTools([
      new TouchTool({
        id: "fill",
        icon: "gravit-icon-touch-fill",
        // The old code passed the elements themselves.
        panel: this._panel,
        toolbar: this._toolbar,
        panelWidth: "368px",
      }) as SidebarTouchTool,
    ]);
    const advanced = el("div");
    this._advancedFillPanel = advanced;
    this._advancedFillOverlay = new Overlay(advanced, { releaseOnClose: false });

    const fillRule = (): HTMLSelectElement => {
      const select = el("select");
      attrs(select, { "data-property": "evenodd" });
      const zero = el("option");
      zero.setAttribute("value", "0");
      select.appendChild(setText(zero, str("GCommonNames", "evenodd.non-zero")));
      const odd = el("option");
      odd.setAttribute("value", "1");
      select.appendChild(setText(odd, str("GCommonNames", "evenodd.even-odd")));
      select.addEventListener("change", () => {
        designer().stats("fill_toggle_fill-rule", "1" === select.value ? "enable" : "disable");
        this._assignProperty(
          "evenodd",
          "1" === select.value,
          str("GCommonNames", "action.change-fill-rule"),
        );
      });
      return select;
    };

    addClass(toolbar, "list-toolbar fill-toolbar");
    toolbar.appendChild(setText(el("label"), str(KEY, "title")));

    // The fill rule buttons of the touch toolbar (titled like the settings button, as before).
    const ruleButton = (clazz: string, icon: string, evenOdd: boolean): HTMLButtonElement => {
      const button = el("button");
      attrs(button, { "data-title": str(KEY, "action.advanced-settings") });
      addClass(button, clazz);
      button.appendChild(el("span", icon));
      button.addEventListener("click", () => {
        const on = evenOdd ? ".winding-fill" : ".completely-fill";
        const off = evenOdd ? ".completely-fill" : ".winding-fill";
        for (const item of findAll(document, on)) addClass(item, "g-active");
        for (const item of findAll(document, off)) removeClass(item, "g-active");
        this._assignProperty("evenodd", evenOdd, str("GCommonNames", "action.change-fill-rule"));
      });
      return button;
    };
    toolbar.appendChild(
      ruleButton("fill completely-fill g-active", "gravit-icon-touch-completely-fill", false),
    );
    toolbar.appendChild(ruleButton("fill winding-fill", "gravit-icon-touch-winding-fill", true));

    const settings = el("button");
    attrs(settings, {
      "data-title": str(KEY, "action.advanced-settings"),
      "data-action": "settings",
    });
    addClass(settings, "fill-settings");
    settings.appendChild(el("span", "gravit-icon-settings"));
    settings.addEventListener("click", (event) => {
      designer().stats("fill_open_advancedfillpanel");
      (this._advancedFillOverlay as Overlay).open(
        (event.target as Element).closest("button") as Element,
      );
    });
    attachRichTooltip(
      settings,
      tooltip({
        title: str(KEY, "text.fill-rule-tooltip-title"),
        description: str(KEY, "text.fill-rule-tooltip-description"),
        learnMore: "",
      }),
    );
    toolbar.appendChild(settings);

    const remove = el("button");
    attrs(remove, { "data-action": "remove", "data-title": str(KEY, "action.remove-selected") });
    remove.appendChild(el("span", "gravit-icon-trash"));
    remove.appendChild(el("span", "gravit-icon-touch-trash"));
    remove.addEventListener("click", (event) => {
      designer().stats("fill_remove_fill");
      event.stopPropagation();
      const layer = this._getSelectedPaintLayer();
      if (layer) this._removeEqualPaintLayers(layer);
      this._triggerInspector(SidebarEvent.Type.ChildRemoved);
    });
    attachRichTooltip(
      remove,
      tooltip({
        title: str(KEY, "text.remove-layer-tooltip-title"),
        description: str(KEY, "text.remove-layer-tooltip-description"),
        learnMore: "",
      }),
    );
    toolbar.appendChild(remove);

    const add = el("button");
    attrs(add, { "data-action": "add", "data-title": str(KEY, "action.add") });
    add.appendChild(el("span", "gravit-icon-plus"));
    add.appendChild(el("span", "gravit-icon-touch-plus"));
    add.addEventListener("click", () => {
      designer().stats("fill_add_fill");
      const elements = this._elements as FillOwner[];
      Editor.tryRunTransaction(
        elements[0],
        () => {
          const scene = this._document && this._document.getScene();
          const mode = scene && (scene.getProperty("cm") as string | null);
          const color = ColorHelper.convertColor(RGBColor.BLACK, mode || Color.ColorModes.RGB);
          for (let i = 0; i < elements.length; ++i) {
            const layer = new FillPaintLayer();
            layer.setProperty("_pt", color);
            (elements[i] as FillOwner).getPaintLayers().appendChild(layer);
          }
        },
        str(KEY, "action.add"),
      );
      toggleAccordionOpen(toolbar, true);
      initAccordion(toolbar, {});
      this._triggerInspector(SidebarEvent.Type.ChildAdded);
    });
    attachRichTooltip(
      add,
      tooltip({
        title: str(KEY, "text.add-layer-tooltip-title"),
        description: str(KEY, "text.add-layer-tooltip-description"),
        learnMore: "",
      }),
    );
    toolbar.appendChild(add);

    advanced.appendChild(
      propertyRow(el("div"), {
        label: str(KEY, "text.fill-rule"),
        columns: [{ width: "100%", content: fillRule() }],
      }),
    );

    designer()
      .getWorkspace()
      .getStyleEdManager()
      .addEventListener(StyleEdManager.EditorEvent, this._styleEditorEventHandler, this);
    // Old: this._panel.data("contextmenu", true), read by
    // Designer.propertyPanelHasContextMenu.
    (panel as unknown as { __contextmenu?: boolean }).__contextmenu = true;
    const checkContext = (event: MouseEvent) => {
      const height = outerHeight(panel);
      const position = offset(panel);
      if (event.clientY > position.top + height - 2) {
        designer().setMouseOverContext(null, null, null);
        panel.removeEventListener("mousemove", checkContext);
      }
    };
    panel.addEventListener("mouseenter", (event) => {
      designer().setMouseOverContext(PanelIds.FillPropertiesPanel, event, () =>
        this._showCopyInfo(),
      );
      panel.addEventListener("mousemove", checkContext);
    });
    panel.addEventListener("mouseleave", () => {
      panel.removeEventListener("mousemove", checkContext);
      designer().setMouseOverContext(null, null, null);
    });
  }

  /** The "Fill copied" note the mouse-over copy shows over the selected row. */
  private _showCopyInfo(): void {
    const panel = this._panel as HTMLElement;
    const previous = panel.querySelector(".copy-info-overlay");
    const selected = panel.querySelector<HTMLElement>(".fill-block.g-selected");
    const top = (selected && positionTop(selected)) || 0;
    const info = el("span", "copy-info-overlay");
    cssAll(info, { top });
    setText(info, str(KEY, "text.copy-fill"));
    if (previous) previous.remove();
    panel.appendChild(info);
    setTimeout(() => {
      // Old: .animate({ opacity: 0, top: "+=20" }, 500, remove).
      const animation = info.animate(
        [
          { opacity: 1, top: top + "px" },
          { opacity: 0, top: top + 20 + "px" },
        ],
        { duration: 500, easing: "ease-in-out", fill: "forwards" },
      );
      animation.onfinish = () => info.remove();
    }, 1e3);
  }

  private _triggerInspector(
    type: (typeof SidebarEvent.Type)[keyof typeof SidebarEvent.Type],
  ): void {
    const sidebar = designer().getRightSidebars().getSidebar(SidebarsIds.GInspectorSidebar);
    // Sic: the old code assumed the inspector sidebar is registered.
    (sidebar as SidebarLike).trigger(new SidebarEvent(type, sidebar));
  }

  private _removeEqualPaintLayers(layer: FillPaintLayer): void {
    Editor.tryRunTransaction(
      (this._elements as FillOwner[])[0],
      () => {
        const layers: FillPaintLayer[] = [];
        this._iterateEqualPaintLayer(layer, (equal) => {
          layers.push(equal);
        });
        for (const equal of layers) (equal.getParent() as ContainerNode).removeChild(equal);
      },
      str(KEY, "action.remove"),
    );
  }

  override update(
    document: Document | null,
    elements: InspectedElements | null,
    data?: unknown,
  ): boolean {
    const styleEditorChange = this._styleEditorChange;
    if (this._styleEditorChange) this._styleEditorChange = false;
    if (this._ownChange) return true;
    if (this._chooserElem) {
      const chooser = chooserOf(this._chooserElem);
      if (chooser) chooser.close();
    }
    if (this._document) {
      const scene = this._document.getScene();
      if (scene) {
        scene.removeEventListener(AfterInsertEvent, this._afterInsert, this);
        scene.removeEventListener(BeforeRemoveEvent, this._beforeRemove, this);
        scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
      }
      this._document = null;
    }
    this._elements = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i] as Node;
        const take = (_index: unknown, part: unknown) => {
          const node = part as FillOwner;
          if (
            node.hasMixin(Stylable) &&
            node.getStylePropertySets().indexOf(PropertySet.FillPaintLayers) >= 0
          )
            (this._elements as FillOwner[]).push(node);
        };
        const editor = ElementEditor.getEditor(element);
        const parts = editor ? (editor.getStylableParts() as unknown[] | null) : null;
        if (editor && parts) for (let p = 0; p < parts.length; ++p) take(p, parts[p]);
        else take(null, element);
      }
      if (this._elements.length) {
        this._document = document;
        const scene = document.getScene();
        if (scene) {
          scene.addEventListener(AfterInsertEvent, this._afterInsert, this);
          scene.addEventListener(BeforeRemoveEvent, this._beforeRemove, this);
          scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        }
        if (!styleEditorChange) this._updateProperties(data);
        return true;
      }
    }
    return false;
  }

  _styleEditorEventHandler(event: { type: unknown }): void {
    if (this._styleEdOn && event.type == StyleEdManager.EditorEventType.PrepareModifiedEvent)
      this._styleEditorChange = true;
  }

  _updateProperties(data?: unknown): void {
    if (this._elements && this._elements.length) {
      const first = this._elements[0] as FillOwner;
      for (const block of findAll(this._panel as HTMLElement, ".fill-block")) block.remove();
      const layers = first.getPaintLayers().getFillLayers();
      for (const layer of layers) if (layer) this._insertPaintLayer(layer, data);
      for (const select of findAll<HTMLSelectElement>(
        this._advancedFillPanel as HTMLElement,
        '[data-property="evenodd"]',
      )) {
        select.disabled = !first.hasProperty("evenodd");
        setValue(select, first.getProperty("evenodd") ? "1" : "0");
      }
      this._updateToolbar();
    } else console.warn("GFillPaintLayerProperties: empty _elements array");
  }

  _assignProperty(name: string, value: unknown, title?: string): void {
    this._assignProperties([name], [value], title);
  }

  _assignProperties(names: string[], values: unknown[], title?: string): void {
    if (this._document) {
      this._ownChange = true;
      const editor = this._document.getEditor() as Editor;
      editor.beginTransaction();
      try {
        const elements = this._elements as FillOwner[];
        for (let i = 0; i < elements.length; ++i)
          (elements[i] as FillOwner).setProperties(names, values);
      } finally {
        editor.commitTransaction(title || str(KEY, "action.modify"));
        this._ownChange = false;
      }
    } else console.warn("GFillPaintLayerProperties: empty _document property");
  }

  _updateToolbar(): void {
    const has = findAll(this._panel as HTMLElement, ".fill-block").length > 0;
    const toolbar = this._toolbar as HTMLElement;
    toggleClass(toolbar, "empty-list", !has);
    for (const action of ["settings", "remove"])
      for (const button of findAll(toolbar, "[data-action=" + action + "]"))
        css(button, "display", has ? "" : "none");
  }

  _insertPaintLayer(layer: FillPaintLayer, data?: unknown): void {
    const panel = this._panel as HTMLElement;
    let dragAllowed = false;
    let dragged: FillPaintLayer | null = null;
    let image: HTMLElement | null = null;
    let deleting = false;
    let panelOffset: { top: number; left: number } | null = null;
    let panelHeight = 0;
    let dx = 0;
    let dy = 0;
    const assign: Assign = (names, values, temporary, related) =>
      this._assign(layer, names, values, temporary, related);
    // Whether a drop on `block` is allowed (another row, or the row itself with Shift).
    const canDropOn = (block: Element): boolean => {
      if (dragged) {
        const target = layerOf(block);
        if (target && (target !== dragged || Platform.modifiers.shiftKey))
          return dragged.getParent() === target.getParent();
      }
      return false;
    };
    const indicator = el("div", "g-drop-indicator");

    const block = el("div", "fill-block g-cursor-hand-open");
    attrs(block, { "data-drag-mode": PressMode.PRESS_AND_HOLD });
    setData(block, "paintLayer", layer);
    block.setAttribute("draggable", "true");
    block.addEventListener("mousedown", (event) => {
      const target = event.target as Element;
      dragAllowed = designer().isTouchEnabled()
        ? !!target.closest(".drag-indicator")
        : target.classList.contains("fill-block") ||
          target.classList.contains("gravit-icon-drag-indicator") ||
          target.classList.contains("columns") ||
          target.classList.contains("column");
      const row = target.closest(".fill-block");
      if (row) toggleClass(row, "g-draggable-disabled", !dragAllowed);
    });
    block.addEventListener("dragstart", (event) => {
      if (!dragAllowed) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const row = (event.target as Element).closest(".fill-block") as HTMLElement;
      const rowOffset = offset(row);
      image = addClass(dragImage(), "drag-delete gravit-icon-trash");
      panelOffset = offset(panel);
      panelHeight = outerHeight(panel);
      dx = event.clientX - rowOffset.left;
      dy = event.clientY - rowOffset.top;
      event.stopPropagation();
      dragged = layerOf(row) || null;
      const transfer = event.dataTransfer as DataTransfer;
      transfer.effectAllowed = "move";
      transfer.setData("text/plain", "dummy_data");
      for (const other of findAll(panel, ".fill-block")) {
        const overlay = el("div", "grid-drag-overlay");
        overlay.addEventListener("dragenter", () => {
          const parent = overlay.parentNode as HTMLElement;
          const target = layerOf(parent);
          if (canDropOn(parent)) {
            if (dragged && target && dragged.getParent() === target.getParent()) {
              const owner = dragged.getParent() as ContainerNode;
              const from = owner.getIndexOfChild(dragged);
              const to = owner.getIndexOfChild(target);
              if (from !== to) {
                if (from < to) parent.before(indicator);
                else parent.after(indicator);
              }
            }
          } else indicator.remove();
        });
        overlay.addEventListener("dragleave", () => {
          const parent = overlay.parentNode as HTMLElement;
          if (canDropOn(parent))
            for (const shown of findAll(parent, ".g-drop-indicator")) shown.remove();
        });
        overlay.addEventListener("dragover", (dragEvent) => {
          if (canDropOn(overlay.parentNode as HTMLElement)) {
            dragEvent.preventDefault();
            dragEvent.stopPropagation();
            (dragEvent.dataTransfer as DataTransfer).dropEffect = "move";
          }
        });
        overlay.addEventListener("drop", () => {
          const row = (overlay.parentNode as HTMLElement).closest(".fill-block");
          const target = layerOf(row);
          for (const shown of findAll(panel, ".g-drop-indicator")) shown.remove();
          for (const shown of findAll(panel, ".grid-drag-overlay")) shown.remove();
          if (dragged && target && dragged.getParent() === target.getParent()) {
            const moved = dragged;
            const owner = moved.getParent() as ContainerNode;
            const from = owner.getIndexOfChild(moved);
            const to = owner.getIndexOfChild(target);
            Editor.tryRunTransaction(
              owner,
              () => {
                if (Platform.modifiers.shiftKey) {
                  const copy = moved.clone() as Node;
                  owner.insertChild(copy, from < to ? target.getNext() : target);
                } else if (from !== to) {
                  owner.removeChild(moved);
                  owner.insertChild(moved, from < to ? target.getNext() : target);
                }
              },
              Platform.modifiers.shiftKey ? str(KEY, "action.duplicate") : str(KEY, "action.move"),
            );
            this._updateProperties();
            this._setSelectedPaintLayer(moved);
          }
          dragged = null;
        });
        other.appendChild(overlay);
      }
    });
    block.addEventListener("drag", (event) => {
      deleting = handleDragForDeleteIcon(
        event,
        image as HTMLElement,
        panelOffset,
        panelHeight,
        dx,
        dy,
      );
    });
    block.addEventListener("dragend", (event) => {
      const row = (event.target as Element).closest(".fill-block");
      const target = layerOf(row ? row.closest(".fill-block") : null);
      for (const shown of findAll(panel, ".g-drop-indicator")) shown.remove();
      for (const shown of findAll(panel, ".grid-drag-overlay")) shown.remove();
      if (dragged && target && dragged.getParent() === target.getParent()) {
        const moved = dragged;
        const owner = moved.getParent() as ContainerNode;
        const from = owner.getIndexOfChild(moved);
        const to = owner.getIndexOfChild(target);
        Editor.tryRunTransaction(
          owner,
          () => {
            if (Platform.modifiers.shiftKey) {
              const copy = moved.clone() as Node;
              owner.insertChild(copy, from < to ? target.getNext() : target);
            } else if (from !== to) {
              owner.removeChild(moved);
              owner.insertChild(moved, from < to ? target.getNext() : target.getPrevious());
            }
          },
          Platform.modifiers.shiftKey ? str(KEY, "action.duplicate") : str(KEY, "action.move"),
        );
        this._updateProperties();
        this._setSelectedPaintLayer(moved);
      }
      if (dragged && deleting) this._removeEqualPaintLayers(dragged);
      if (image) css(image, "display", "none");
      image = null;
      event.stopPropagation();
      dragged = null;
    });
    block.addEventListener("click", () => {
      this._setSelectedPaintLayer(layer);
    });

    const swatch = this._createSwatch(layer, assign);
    const blend = this._createBlend(assign);
    addClass(blend, "normal");
    const opacity = el("input", "normal");
    attrs(opacity, { "data-property": "_op", type: "text" });
    opacity.addEventListener("change", () => {
      designer().stats("fill_change_opacity");
      const box = InputBox.of(opacity) as InputBox;
      assign(["_vs", "_op"], [true, (Length.parseEquationValue(box.value()) as number) / 100]);
    });
    new InputBox(opacity, {
      minValue: 0,
      maxValue: 100,
      incrementValue: designer().getOpacityIncrement(),
      postfix: "%",
    });
    const visibility = el("span", "fill-action fill-visibility gravit-icon-display normal");
    attrs(visibility, {
      "data-property": "_vs",
      "data-title": str("GCommonNames", "action.toggle-visibility"),
    });
    visibility.addEventListener("click", (event) => {
      designer().stats("fill_hide_show");
      event.stopPropagation();
      const hidden = visibility.classList.contains("gravit-icon-hide");
      removeClass(visibility, "gravit-icon-" + (hidden ? "hide" : "display"));
      addClass(visibility, "gravit-icon-" + (hidden ? "display" : "hide"));
      assign(["_vs"], [hidden]);
    });
    const indicatorIcon = el(
      "div",
      "gravit-icon-drag-indicator g-cursor-hand-open gravit-icon-touch-drag-indicator",
    );
    const touch = el("div", "touch");
    propertyRow(touch, {
      columns: [
        { width: "auto", content: this._createTouchField("_bl", assign) },
        { width: "60px", content: this._createTouchField("_vs", assign) },
      ],
    });
    propertyRow(touch, {
      columns: [
        { width: "auto", content: this._createTouchField("_ra", assign) },
        { width: "60px", content: this._createTouchField("_op", assign) },
      ],
    });
    propertyRow(block, {
      columns: [
        { clazz: "drag-indicator", content: indicatorIcon },
        { width: "40px", clazz: "color-preview", content: swatch },
        { width: "auto", content: blend },
        { width: "45px", content: opacity },
        { width: "20px", content: visibility },
        { width: "auto", content: touch },
      ],
    });
    panel.prepend(block);

    for (const columns of findAll(block, ".columns")) addClass(columns, "g-cursor-hand-open");
    for (const column of findAll(block, ".column")) addClass(column, "g-cursor-hand-open");
    for (const item of findAll(block, ".touch"))
      for (const column of parents(item, ".column")) addClass(column, "g-touch");
    for (const item of findAll(block, ".normal"))
      for (const column of parents(item, ".column")) addClass(column, "g-normal");
    for (const item of findAll(block, '[data-property="_pt"]'))
      for (const column of parents(item, ".column")) addClass(column, "g-color");
    for (const item of findAll(block, ".transparency"))
      for (const holder of parents(item, ".touch div:last-child>div"))
        addClass(holder, "g-transparency");
    for (const item of findAll(block, ".touch"))
      for (const select of findAll(item, "select")) {
        addClass(select, "g-select");
        (select.parentElement as HTMLElement).appendChild(
          el("span", "gravit-icon-touch-arrowDown"),
        );
      }
    block.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const target = layerOf(block) as FillPaintLayer;
      this._setSelectedPaintLayer(target);
      const options: ContextMenuOptions = {
        previousEvent: {
          pageX: event.pageX,
          pageY: event.pageY,
          clientX: event.clientX,
          clientY: event.clientY,
          data: { context: ContextMenuContext.FillPropertyPanel },
        },
        data: { paintLayer: target },
      };
      designer().getContextMenu()?.trigger(options);
    });
    this._setSelectedPaintLayer(layer);
    this._updatePaintLayer(layer, data);
    for (const slider of findAll(block, ".transparency")) {
      const op = parents(slider, ".touch")[0]?.querySelector<HTMLInputElement>(".fill-op");
      setSliderValue(slider, parseInt(op ? op.value : ""));
    }
  }

  /** The color swatch of a row (`_pt`). */
  private _createSwatch(layer: FillPaintLayer, assign: Assign): HTMLElement {
    const swatch = el("div");
    attrs(swatch, { "data-property": "_pt" });
    patternChooser(swatch, {
      types: [
        Color,
        LinearGradient,
        RadialGradient,
        AngularGradient,
        Background,
        TexturePattern,
        NoisePattern,
      ],
      hasMask: true,
    });
    swatch.addEventListener("chooseropen", () => {
      ((this._document as Document).getEditor() as Editor).hideSelection();
      designer()
        .getWorkspace()
        .getStyleEdManager()
        .updateEditor(layer as unknown as PatternHolder, "_pt", false);
      this._setSelectedPaintLayer(layer);
      this._styleEdOn = true;
      this._chooserElem = swatch;
    });
    swatch.addEventListener("chooserclose", (event) => {
      const [preventClose, closeEvent] = eventArgs(event) as [() => void, unknown];
      const manager = designer().getWorkspace().getStyleEdManager();
      if (manager.getOverlayLock(closeEvent)) preventClose();
      else {
        this._styleEdOn = false;
        manager.deactivateEditor();
        if (this._document) {
          ((this._document as Document).getEditor() as Editor).resetHideSelection();
          if (this._document.hasCDR()) {
            const popup = patternChooserPopup();
            const pattern = popup ? popup.getPattern() : null;
            if (pattern && !(pattern instanceof RGBColor))
              void SystemDialog.showCDRUnsupportedObjectWarning();
          }
        }
      }
      this._chooserElem = null;
    });
    swatch.addEventListener("patternchange", (event) => {
      const [pattern, opacity, temporary, fromChooser, stopIndex] = eventArgs(event) as [
        unknown,
        unknown,
        boolean | undefined,
        unknown,
        number | null | undefined,
      ];
      const names = ["_vs"];
      const values: unknown[] = [true];
      if (void 0 !== pattern) {
        names.push("_pt");
        values.push(pattern);
      }
      if ("number" == typeof opacity) {
        names.push("_op");
        values.push(opacity);
      }
      let related: { chooserOn: boolean; activeStopIdx?: number } | null = null;
      if (fromChooser) {
        related = { chooserOn: true };
        if (null != stopIndex) related.activeStopIdx = stopIndex;
      }
      assign(names, values, temporary, related);
    });
    return swatch;
  }

  /** A blend mode select (`_bl`). */
  private _createBlend(assign: Assign): HTMLSelectElement {
    const select = initBlendMode(el("select"));
    attachRichTooltip(
      select,
      tooltip({
        title: str("GAppearanceProperties", "text.blend-tooltip-title"),
        description: str("GAppearanceProperties", "text.blend-tooltip-description"),
        middle: false,
        forceShow: true,
        learnMore: config.LINKS.BLENDING_MODES_DOCUMENTATION_URL,
      }),
    );
    attrs(select, { "data-property": "_bl" });
    select.addEventListener("change", () => {
      designer().stats("fill_change_blend-mode", select.value);
      assign(["_bl"], [select.value]);
    });
    return select;
  }

  /** The fields of the touch rows (the old `x(property)`). */
  private _createTouchField(property: string, assign: Assign): HTMLElement {
    if ("_bl" === property) return this._createBlend(assign);
    if ("_op" === property) {
      const input = el("input", "fill-op");
      attrs(input, { "data-property": "_op", type: "text" });
      input.addEventListener("change", (event) => {
        designer().stats("fill_change_opacity");
        const box = InputBox.of(input) as InputBox;
        const typed = changeArgs(event)[0] as number | undefined;
        assign(
          ["_vs", "_op"],
          [true, ((typed || Length.parseEquationValue(box.value())) as number) / 100],
        );
        for (const touchRow of parents(input, ".touch"))
          for (const slider of findAll(touchRow, ".transparency"))
            setSliderValue(slider, Length.parseEquationValue(box.value()));
      });
      new InputBox(input, {
        minValue: 0,
        maxValue: 100,
        incrementValue: designer().getOpacityIncrement(),
        postfix: "%",
      });
      return input;
    }
    if ("_vs" === property) {
      const span = el("span", "fill-action fill-visibility gravit-icon-touch-show");
      attrs(span, {
        "data-property": "_vs",
        "data-title": str("GCommonNames", "action.toggle-visibility"),
      });
      span.addEventListener("click", (event) => {
        designer().stats("fill_hide_show");
        event.stopPropagation();
        const hidden = span.classList.contains("gravit-icon-touch-hide");
        removeClass(span, "gravit-icon-touch-" + (hidden ? "hide" : "show"));
        addClass(span, "gravit-icon-touch-" + (hidden ? "show" : "hide"));
        assign(["_vs"], [hidden]);
      });
      return span;
    }
    // "_ra"
    const slider = el("div", "transparency gravit-icon-touch-rectangle");
    inputSlider(slider, { type: "range", min: 0, max: 100, step: 1 });
    slider.addEventListener("input", (event) => {
      const target = event.target as Element;
      const value = parseInt(String(sliderValue(target)));
      for (const touchRow of parents(target, ".touch"))
        for (const op of findAll(touchRow, ".fill-op")) triggerChange(op, value);
    });
    return slider;
  }

  override openPatternChooser(): void {
    const button = this._firstSwatch()?.querySelector<HTMLElement>(".g-button");
    if (button) button.click();
  }

  override openEyeDropper(event?: unknown, options?: unknown): void {
    const chooser = chooserOf(this._firstSwatch());
    if (chooser) chooser.openEyeDropper(event as number | undefined, options as number | undefined);
  }

  /** `.fill-block:first-child [data-property="_pt"]`. */
  private _firstSwatch(): HTMLElement | null {
    const first = (this._panel as HTMLElement).firstElementChild;
    if (!first || !first.classList.contains("fill-block")) return null;
    return first.querySelector<HTMLElement>('[data-property="_pt"]');
  }

  _setSelectedPaintLayer(layer: FillPaintLayer | null | undefined): void {
    for (const block of findAll(this._panel as HTMLElement, ".fill-block"))
      toggleClass(block, "g-selected", layerOf(block) === layer);
    if (this._document) this._document.updateActiveStylesList("Fill", layer);
  }

  _getSelectedPaintLayer(): FillPaintLayer | undefined {
    return layerOf((this._panel as HTMLElement).querySelector(".fill-block.g-selected"));
  }

  _removePaintLayer(layer: FillPaintLayer): void {
    for (const block of findAll(this._panel as HTMLElement, ".fill-block"))
      if (layerOf(block) === layer) {
        block.remove();
        return;
      }
  }

  _updatePaintLayer(layer: FillPaintLayer | null, data?: unknown): void {
    if (!layer) return;
    for (const block of findAll(this._panel as HTMLElement, ".fill-block")) {
      if (layerOf(block) !== layer) continue;
      for (const swatch of findAll(block, '[data-property="_pt"]')) {
        const chooser = chooserOf(swatch);
        if (chooser) {
          chooser.setPattern(layer.getProperty("_pt", false, false, true) as Pattern | null);
          chooser.value(layer.getProperty("_pt", false, false, true) as Pattern | null);
          chooser.opacity(layer.getProperty("_op", false, false, true) as number);
        }
      }
      for (const input of findAll<HTMLInputElement>(block, '[data-property="_op"]')) {
        const box = InputBox.of(input);
        if (box)
          box.value(formatOpacity(100 * (layer.getProperty("_op", false, false, true) as number)));
      }
      for (const select of findAll<HTMLSelectElement>(block, '[data-property="_bl"]'))
        setValue(select, layer.getProperty("_bl"));
      const visible = layer.getProperty("_vs");
      for (const item of findAll(block, '[data-property="_vs"]')) {
        removeClass(item, "gravit-icon-" + (visible ? "hide" : "display"));
        addClass(item, "gravit-icon-" + (visible ? "display" : "hide"));
      }
      const related = data as {
        evtType?: number;
        chooserOn?: boolean;
        fillLayerIndex?: number | null;
        activeStopIdx?: number | null;
      } | null;
      if (
        related &&
        (related.evtType == ModifiedEvent.Type.Undo ||
          related.evtType == ModifiedEvent.Type.Redo) &&
        related.chooserOn &&
        null != related.fillLayerIndex &&
        (layer.getParent() as ContainerNode).getIndexOfChild(layer) == related.fillLayerIndex
      )
        for (const preview of findAll(block, ".preview"))
          clickPreview(preview, null != related.activeStopIdx ? related.activeStopIdx : null);
    }
  }

  _assign(
    layer: FillPaintLayer,
    names: string[],
    values: unknown[],
    temporary?: boolean,
    related?: unknown,
  ): void {
    if (temporary)
      this._iterateEqualPaintLayer(layer, (equal) => {
        equal.setProperties(names, values, false, false, true);
      });
    else {
      if (!this._document) return;
      let relatedData: Record<string, unknown> | null = null;
      if (related) {
        const index = (layer.getParent() as ContainerNode).getIndexOfChild(layer);
        relatedData = { fillLayerIndex: index, ...(related as Record<string, unknown>) };
      }
      this._ownChange = true;
      const editor = this._document.getEditor() as Editor;
      editor.beginTransaction();
      try {
        this._iterateEqualPaintLayer(layer, (equal, owner) => {
          const elementEditor = ElementEditor.getEditor(owner);
          if (!(elementEditor && elementEditor.applyPropertiesToParts(names, values)))
            equal.setProperties(names, values);
        });
      } finally {
        editor.commitTransaction(str(KEY, "action.change-properties"), relatedData);
        this._ownChange = false;
      }
    }
  }

  _afterInsert(event: AfterInsertEvent): void {
    const node = event.node as unknown;
    if (
      node instanceof FillPaintLayer &&
      (node.getOwnerStylable() as unknown) === (this._elements as FillOwner[])[0]
    ) {
      this._insertPaintLayer(node);
      this._updateToolbar();
    }
  }

  _beforeRemove(event: BeforeRemoveEvent): void {
    const node = event.node as unknown;
    if (
      node instanceof FillPaintLayer &&
      (node.getOwnerStylable() as unknown) === (this._elements as FillOwner[])[0]
    ) {
      this._removePaintLayer(node);
      let neighbour: Node | null = node.getPrevious();
      while (neighbour && !(neighbour instanceof FillPaintLayer))
        neighbour = neighbour.getPrevious();
      if (!(neighbour instanceof FillPaintLayer)) {
        neighbour = node.getNext();
        while (neighbour && !(neighbour instanceof FillPaintLayer)) neighbour = neighbour.getNext();
      }
      this._setSelectedPaintLayer(neighbour as FillPaintLayer | null);
      this._updateToolbar();
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    const node = event.node as unknown;
    if (
      node instanceof FillPaintLayer &&
      (node.getOwnerStylable() as unknown) === (this._elements as FillOwner[])[0]
    )
      this._updatePaintLayer(node);
  }

  /**
   * Calls `callback` with every inspected element's fill that is `layer`
   * or of its class at its index among all paint layers.
   */
  _iterateEqualPaintLayer(
    layer: FillPaintLayer | null | undefined,
    callback: (equal: FillPaintLayer, owner: FillOwner) => void,
  ): void {
    if (!layer) return;
    const index = (layer.getParent() as ContainerNode).getIndexOfChild(layer);
    const elements = this._elements as FillOwner[];
    for (let o = 0; o < elements.length; ++o) {
      const owner = elements[o] as FillOwner;
      const layers = owner.getPaintLayers();
      for (const other of layers.getFillLayers())
        if (
          (other && other === layer) ||
          (other.constructor === layer.constructor &&
            (layers as unknown as ContainerNode).getIndexOfChild(other) === index)
        )
          callback(other, owner);
    }
  }
}
