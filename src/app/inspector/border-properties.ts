// Old: designer.browser.dev.js module 1162 (the border paint layer panel).
/**
 * The inspector's border panel: one row per border paint layer of the
 * first inspected element (color swatch, width, blend mode, opacity,
 * visibility, plus the touch layout's rows), the toolbar with the advanced
 * stroke settings, remove and add, and the advanced stroke settings
 * overlay (caps, alignment, joins, miter limit, dashes, markers, scaling).
 *
 * Changes apply to every inspected element's border at the same index
 * (`_iterateEqualPaintLayer`). Rows are dragged to reorder (Shift
 * duplicates) or out of the panel to delete. The fill panel
 * (fill-properties.ts) is the sibling with the same structure.
 *
 * The old module defined no toString, so the panel reports the
 * inherited "[Object GProperties]", as before (the inspector sidebar
 * sorts panels into its groups by that string).
 *
 * Kept from the old code (see QUESTIONS.md):
 * - "Border panel takes elements by their fill property set";
 * - "Dropping a border outside the list is named after fills";
 * - "Border width box ignores the document unit".
 * The undo/redo re-open of the chooser referenced an undefined variable
 * and threw; it reopens the chooser like the fill panel (BUG-153).
 */
import type { Pattern } from "../../engine/style/pattern.ts";
import { Color } from "../../engine/color/color.ts";
import { ColorHelper } from "../../engine/color/color-helper.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { formatNumber, formatOpacity } from "../../engine/core/util.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexSource } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { Length } from "../../engine/math/length.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforeRemoveEvent,
} from "../../engine/scene/node-events.ts";
import { Path } from "../../engine/scene/path.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { BorderAlignment, BorderMarker, PropertySet } from "../../engine/style/stylable-sets.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { Text } from "../../engine/text/text.ts";
import { Editor, ModifiedEvent } from "../../editor/editor.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { StyleEdManager, type PatternHolder } from "../../editor/style-ed-manager.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { richTooltipVideoUrl } from "../actions/deps.ts";
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
import { UnitBox } from "../widgets/unit-box.ts";
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
  fadeCopyHint,
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

/** An inspected element with borders (a stylable node with paint layers). */
type BorderOwner = Node & {
  getPaintLayers(): PaintLayers;
  getStylePropertySets(): string[];
};

const KEY = "GBorderPaintLayerProperties";

/** `$(el).find(selector).first().data("paintLayer")`. */
function layerOf(element: Element | null | undefined): BorderPaintLayer | undefined {
  return getData<BorderPaintLayer>(element, "paintLayer");
}

/** `$(el).position().top`: the top relative to the offset parent, without the margin. */
function positionTop(element: HTMLElement): number {
  return element.offsetTop - (parseFloat(computed(element, "margin-top")) || 0);
}

function tooltip(fields: ConstructorParameters<typeof RichTooltipConfig>[0]): RichTooltipConfig {
  return RichTooltipConfig.from(fields);
}

/**
 * The alignment a new border gets on `element` (the Add Border button):
 * outside for texts, center for open paths and arcs, inside for every
 * other shape. The old code checked shapes first, and paths are shapes,
 * so open paths got Inside, which they can't show (BUG-154).
 */
export function newBorderAlignment(element: unknown): string | null {
  if (element instanceof Text) return BorderAlignment.Outside;
  if (element instanceof Path && !(element as unknown as { $closed: boolean }).$closed)
    return BorderAlignment.Center;
  if (element instanceof Shape)
    return element instanceof Ellipse && element.$etp === Ellipse.Type.Arc
      ? BorderAlignment.Center
      : BorderAlignment.Inside;
  return null;
}

export class BorderProperties extends Properties {
  _panel: HTMLElement | null = null;
  _toolbar: HTMLElement | null = null;
  _elements: BorderOwner[] | null = null;
  _advancedStrokePanel: HTMLElement | null = null;
  _advancedStrokeOverlay: Overlay | null = null;
  _styleEditorChange = false;
  _styleEdOn = false;
  _ownChange = false;
  _chooserElem: HTMLElement | null = null;

  get _doc(): Document | null {
    return this._document;
  }

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._panel = addClass(panel, "border-properties-panel");
    this._toolbar = toolbar;
    this.setTouchTools([
      new TouchTool({
        id: "border",
        icon: "gravit-icon-touch-border",
        // The old code passed the elements themselves.
        panel: this._panel,
        toolbar: this._toolbar,
        panelWidth: "368px",
      }) as SidebarTouchTool,
    ]);
    toolbar.appendChild(setText(el("label"), str(KEY, "title")));

    const advanced = el("div");
    css(advanced, "width", "280px");
    this._advancedStrokePanel = advanced;
    this._advancedStrokeOverlay = new Overlay(advanced, { releaseOnClose: false });
    addClass(this._advancedStrokeOverlay.getElement(), "border-settings");

    // Applies to the selected border, or the last one.
    const assignSelectedOrLast = (names: string[], values: unknown[], temporary?: boolean) => {
      let layer = this._getSelectedPaintLayer();
      if (!layer) layer = this._lastBlockLayer();
      if (layer) this._assign(layer, names, values, temporary);
    };
    // Applies to the selected border, or every border of the list.
    const assignSelectedOrAll = (names: string[], values: unknown[], temporary?: boolean) => {
      const selected = this._getSelectedPaintLayer();
      if (selected) this._assign(selected, names, values, temporary);
      else
        for (const block of findAll(this._panel as HTMLElement, ".border-block")) {
          const layer = layerOf(block);
          if (layer) this._assign(layer, names, values, temporary);
        }
    };
    const field = (property: string): HTMLElement =>
      this._createAdvancedField(property, assignSelectedOrLast, assignSelectedOrAll);

    const wrapper = (label: string, content: HTMLElement): HTMLElement => {
      const box = el("div", "border-property-wrapper");
      box.appendChild(setText(el("div", "border-property-label"), label));
      box.appendChild(content);
      return box;
    };
    const group = (...buttons: [HTMLElement, string][]): HTMLElement => {
      const content = el("div", "border-property-content");
      for (const [button, clazz] of buttons) content.appendChild(addClass(button, clazz));
      return content;
    };
    const Cap = PaintCanvas.LineCap;
    const Join = PaintCanvas.LineJoin;
    advanced.appendChild(
      propertyRow(el("div"), {
        justified: true,
        columns: [
          {
            width: "50%",
            content: wrapper(
              str(KEY, "text.ends"),
              group(
                [field("_blc-" + Cap.Butt), "g-group-start"],
                [field("_blc-" + Cap.Round), "g-group-element"],
                [field("_blc-" + Cap.Square), "g-group-end"],
              ),
            ),
          },
          {
            width: "50%",
            content: wrapper(
              str("GCommonNames", "text.position"),
              group(
                [field("_ba-" + BorderAlignment.Inside), "g-group-start"],
                [field("_ba-" + BorderAlignment.Center), "g-group-element"],
                [field("_ba-" + BorderAlignment.Outside), "g-group-end"],
              ),
            ),
          },
        ],
      }),
    );
    const miterContent = el("div", "border-property-content top-2px");
    miterContent.appendChild(field("_bml"));
    const miter = wrapper(str(KEY, "text.miter-limit"), miterContent);
    attachRichTooltip(
      miter,
      tooltip({
        title: str(KEY, "text.miter-limit"),
        video: richTooltipVideoUrl("Miter_Limit.mp4"),
        description: str(KEY, "text.miter-limit-tooltip-description"),
        learnMore: "",
      }),
    );
    advanced.appendChild(
      propertyRow(el("div"), {
        justified: true,
        columns: [
          {
            width: "50%",
            content: wrapper(
              str(KEY, "text.joins"),
              group(
                [field("_blj-" + Join.Bevel), "g-group-start"],
                [field("_blj-" + Join.Miter), "g-group-element "],
                [field("_blj-" + Join.Round), "g-group-end"],
              ),
            ),
          },
          { width: "50%", content: miter },
        ],
      }),
    );
    const rule = el("hr");
    css(rule, "margin-bottom", "10px");
    advanced.appendChild(rule);
    advanced.appendChild(
      propertyRow(el("div"), {
        columns: [
          { width: "25%", content: field("_bds"), label: str(KEY, "text.dash") },
          { width: "25%", content: field("_bds"), label: str(KEY, "text.gap") },
          { width: "25%", content: field("_bds"), label: str(KEY, "text.dash") },
          { width: "25%", content: field("_bds"), label: str(KEY, "text.gap") },
        ],
      }),
    );
    advanced.appendChild(el("hr"));
    advanced.appendChild(el("p"));
    const markup = (key: string): HTMLElement => {
      const box = el("div");
      // Old: .html(...) with the string table's text.
      box.innerHTML = str(KEY, key);
      return box;
    };
    advanced.appendChild(
      propertyRow(el("div"), {
        columns: [
          { width: "45%", padding: false, content: markup("text.start-arrow") },
          { width: "10%" },
          { width: "45%", padding: false, content: markup("text.end-arrow") },
        ],
      }),
    );
    advanced.appendChild(
      propertyRow(el("div"), {
        columns: [
          { width: "37%", content: field("_bhm") },
          { width: "8%", content: field("arrow-paste-_bhm") },
          { width: "10%" },
          { width: "37%", content: field("_btm") },
          { width: "8%", content: field("arrow-paste-_btm") },
        ],
      }),
    );
    advanced.appendChild(
      propertyRow(el("div"), {
        columns: [
          { width: "45%", padding: false, content: field("_bhms") },
          { width: "10%" },
          { width: "45%", padding: false, content: field("_btms") },
        ],
      }),
    );
    advanced.appendChild(
      propertyRow(el("div"), {
        columns: [
          {
            width: "45%",
            prefix: { label: str(KEY, "text.outline"), width: "50px" },
            padding: false,
            content: field("_bhmo"),
          },
          { width: "10%" },
          {
            width: "45%",
            prefix: { label: str(KEY, "text.outline"), width: "50px" },
            padding: false,
            content: field("_btmo"),
          },
        ],
      }),
    );
    advanced.appendChild(
      propertyRow(el("div"), {
        columns: [
          {
            width: "45%",
            label: str(KEY, "text.marker-position"),
            padding: false,
            content: field("_bhmi"),
          },
          { width: "10%" },
          {
            width: "45%",
            label: str(KEY, "text.marker-position"),
            padding: false,
            content: field("_btmi"),
          },
        ],
      }),
    );
    const scale = el("input", "gravit-icon-touch-check-small");
    attrs(scale, { type: "checkbox", "data-property": "_bs" });
    scale.addEventListener("change", () => {
      designer().stats("border_change_autoscale", scale.checked ? "enabled" : "disabled");
      assignSelectedOrAll(["_bs"], [scale.checked]);
    });
    const scaleLabel = el("label");
    scaleLabel.appendChild(scale);
    scaleLabel.appendChild(setText(el("span"), str(KEY, "text.autoscale-borders")));
    advanced.appendChild(
      propertyRow(el("div"), { columns: [{ width: "auto", content: scaleLabel }] }),
    );

    addClass(toolbar, "list-toolbar border-toolbar");
    const settings = el("button");
    attrs(settings, {
      "data-action": "stroke-settings",
      "data-title": str(KEY, "text.advanced-stroke-settings"),
    });
    settings.appendChild(el("span", "gravit-icon-settings"));
    settings.appendChild(el("span", "gravit-icon-touch-settings"));
    settings.addEventListener("click", (event) => {
      designer().stats("border_open_advancedstrokepanel");
      this._updateAdvancedSettings();
      (this._advancedStrokeOverlay as Overlay).open(
        (event.target as Element).closest("button") as Element,
      );
    });
    attachRichTooltip(
      settings,
      tooltip({
        title: str(KEY, "text.advanced-stroke-settings-tooltip-title"),
        description: str(KEY, "text.advanced-stroke-settings-tooltip-description"),
        learnMore: "",
      }),
    );
    toolbar.appendChild(settings);

    const remove = el("button");
    attrs(remove, {
      "data-action": "remove",
      "data-title": str(KEY, "action.remove-selected-border"),
    });
    remove.appendChild(el("span", "gravit-icon-trash"));
    remove.appendChild(el("span", "gravit-icon-touch-trash"));
    remove.addEventListener("click", (event) => {
      designer().stats("border_remove_border");
      event.stopPropagation();
      const layer = this._getSelectedPaintLayer();
      if (layer) this._removeEqualPaintLayers(layer);
      this._triggerInspector(SidebarEvent.Type.ChildRemoved);
    });
    attachRichTooltip(
      remove,
      tooltip({
        title: str(KEY, "text.remove-border-tooltip-title"),
        description: str(KEY, "text.remove-border-tooltip-description"),
        learnMore: "",
      }),
    );
    toolbar.appendChild(remove);

    const add = el("button");
    attrs(add, { "data-action": "add", "data-title": str(KEY, "action.add-border") });
    add.appendChild(el("span", "gravit-icon-plus"));
    add.appendChild(el("span", "gravit-icon-touch-plus"));
    add.addEventListener("click", () => {
      designer().stats("border_add_border");
      const elements = this._elements as BorderOwner[];
      Editor.tryRunTransaction(
        elements[0],
        () => {
          const scene = this._document && this._document.getScene();
          const mode = scene && (scene.getProperty("cm") as string | null);
          const color = ColorHelper.convertColor(RGBColor.BLACK, mode || Color.ColorModes.RGB);
          for (let i = 0; i < elements.length; ++i) {
            const element = elements[i] as BorderOwner;
            const layer = new BorderPaintLayer();
            const alignment = newBorderAlignment(element);
            if (alignment !== null) layer.setProperty("_ba", alignment);
            layer.setProperty("_pt", color);
            element.getPaintLayers().appendChild(layer);
            this._triggerInspector(SidebarEvent.Type.ChildAdded);
          }
        },
        str(KEY, "action.add-border"),
      );
      toggleAccordionOpen(toolbar, true);
      initAccordion(toolbar, {});
    });
    attachRichTooltip(
      add,
      tooltip({
        title: str(KEY, "text.add-border-tooltip-title"),
        description: str(KEY, "text.add-border-tooltip-description"),
        learnMore: "",
      }),
    );
    toolbar.appendChild(add);

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
      designer().setMouseOverContext(PanelIds.BorderPropertiesPanel, event, () =>
        this._showCopyInfo(),
      );
      panel.addEventListener("mousemove", checkContext);
    });
    panel.addEventListener("mouseleave", () => {
      panel.removeEventListener("mousemove", checkContext);
      designer().setMouseOverContext(null, null, null);
    });
  }

  /** The "Border copied" note the mouse-over copy shows over the selected row. */
  private _showCopyInfo(): void {
    const panel = this._panel as HTMLElement;
    const previous = panel.querySelector(".copy-info-overlay");
    const selected = panel.querySelector<HTMLElement>(".border-block.g-selected");
    // Sic: without a selected row the old `.position()` gave undefined and
    // reading its top threw, so no hint showed (see "Copy hint throws
    // without a selected row" in QUESTIONS.md).
    if (!selected) throw new TypeError("Cannot read properties of undefined (reading 'top')");
    const top = positionTop(selected) || 0;
    const info = el("span", "copy-info-overlay");
    cssAll(info, { top });
    setText(info, str(KEY, "text.copy-border"));
    if (previous) previous.remove();
    panel.appendChild(info);
    setTimeout(() => fadeCopyHint(info), 1e3);
  }

  /** The inputs of the advanced stroke settings (the old `u(property)`). */
  private _createAdvancedField(
    property: string,
    assignSelectedOrLast: (names: string[], values: unknown[]) => void,
    assignSelectedOrAll: (names: string[], values: unknown[]) => void,
  ): HTMLElement {
    if ("_bw" === property || "_bml" === property) {
      const input = el("input");
      attrs(input, { type: "text", "data-property": property });
      input.addEventListener("change", () => {
        let layer = this._getSelectedPaintLayer();
        if (!layer) layer = this._lastBlockLayer();
        if (this._getProperty(layer, "_blj") === PaintCanvas.LineJoin.Miter) {
          const value = Length.parseEquationValue(input.value);
          designer().stats("border_change_miterlimit", value);
          if (null !== value && value > 0) assignSelectedOrLast(["_vs", property], [true, value]);
          else this._updateProperties();
        }
      });
      new InputBox(input);
      return input;
    }
    if ("_bds" === property) {
      const input = el("input");
      attrs(input, { type: "text", "data-property": property });
      input.addEventListener("change", () => {
        const dashes: number[] = [];
        designer().stats("border_change_dash");
        const columns = input.closest(".columns");
        if (columns)
          for (const box of findAll<HTMLInputElement>(columns, '[data-property="_bds"]')) {
            const value = Length.parseEquationValue(box.value);
            if (null !== value && value >= 0) dashes.push(value);
          }
        assignSelectedOrAll(["_vs", property], [true, dashes]);
      });
      new InputBox(input);
      return input;
    }
    if (0 === property.indexOf("_ba-")) {
      let icon = "";
      let title = "";
      const alignment = property.substr("_ba-".length);
      switch (alignment) {
        case BorderAlignment.Inside:
          icon = "gravit-icon-line-stroke-inside";
          title = str("GStylable", "border-alignment.inside");
          break;
        case BorderAlignment.Center:
          icon = "gravit-icon-line-stroke-center";
          title = str("GStylable", "border-alignment.center");
          break;
        case BorderAlignment.Outside:
          icon = "gravit-icon-line-stroke-outside";
          title = str("GStylable", "border-alignment.outside");
      }
      const button = el("button", "g-icon g-flat");
      css(button, "width", "33.3%");
      attrs(button, { "data-property": property, "data-title": title });
      button.addEventListener("click", () => {
        let name = alignment;
        for (const key of Object.keys(BorderAlignment))
          if (alignment === BorderAlignment[key as keyof typeof BorderAlignment]) {
            name = key;
            break;
          }
        designer().stats("border_change_align", name);
        assignSelectedOrAll(["_vs", "_ba"], [true, alignment]);
      });
      button.appendChild(el("span", icon));
      return button;
    }
    if (0 === property.indexOf("_blc-")) {
      let icon = "";
      let title = "";
      const cap = property.substr("_blc-".length);
      switch (cap) {
        case PaintCanvas.LineCap.Butt:
          icon = "gravit-icon-line-cap-butt";
          title = str("GPaintCanvas", "linecap.butt");
          break;
        case PaintCanvas.LineCap.Round:
          icon = "gravit-icon-line-cap-round";
          title = str("GPaintCanvas", "linecap.round");
          break;
        case PaintCanvas.LineCap.Square:
          icon = "gravit-icon-line-cap-square";
          title = str("GPaintCanvas", "linecap.square");
      }
      const button = el("button", "g-icon g-flat");
      css(button, "width", "33.3%");
      attrs(button, { "data-title": title, "data-property": property });
      button.addEventListener("click", () => {
        designer().stats("border_change_cap", cap);
        assignSelectedOrAll(["_vs", "_blc"], [true, cap]);
      });
      button.appendChild(el("span", icon));
      return button;
    }
    if (0 === property.indexOf("_blj-")) {
      let icon = "";
      let title = "";
      const join = property.substr("_blj-".length);
      switch (join) {
        case PaintCanvas.LineJoin.Bevel:
          icon = "gravit-icon-line-join-bevel";
          title = str("GPaintCanvas", "linejoin.bevel");
          break;
        case PaintCanvas.LineJoin.Round:
          icon = "gravit-icon-line-join-round";
          title = str("GPaintCanvas", "linejoin.round");
          break;
        case PaintCanvas.LineJoin.Miter:
          icon = "gravit-icon-line-join-miter";
          title = str("GPaintCanvas", "linejoin.miter");
      }
      const button = el("button", "g-icon g-flat");
      css(button, "width", "33.3%");
      attrs(button, { "data-title": title, "data-property": property });
      button.addEventListener("click", () => {
        designer().stats("border_change_join", join);
        assignSelectedOrAll(["_vs", "_blj"], [true, join]);
      });
      button.appendChild(el("span", icon));
      return button;
    }
    if ("_bhmo" === property || "_btmo" === property) {
      const label = el("label", "g-switch");
      const input = el("input");
      attrs(input, { type: "checkbox", "data-property": property });
      input.addEventListener("change", () => {
        designer().stats("border_toggle_markersoutline", input.checked ? "enable" : "disable");
        assignSelectedOrAll([property], [input.checked]);
      });
      label.appendChild(input);
      label.appendChild(el("div"));
      return label;
    }
    if ("_bhmi" === property || "_btmi" === property) {
      const slider = el("div");
      attrs(slider, { "data-property": property });
      inputSlider(slider, { type: "range", min: 0, max: 100, step: 1 });
      slider.addEventListener("mousedown", () => {
        const editor = (this._document as Document).getEditor() as Editor;
        editor.hideSelection();
        document.addEventListener("mouseup", () => editor.resetHideSelection(), { once: true });
      });
      slider.addEventListener("input", (event) => {
        const value = parseInt(String(sliderValue(event.target as Element))) / 100;
        assignSelectedOrAll([property], [value]);
      });
      slider.addEventListener("change", () => {
        designer().stats("border_change_markersposition");
        assignSelectedOrAll([property], [parseInt(String(sliderValue(slider))) / 100]);
      });
      return slider;
    }
    if ("_bhms" === property || "_btms" === property) {
      const input = el("input");
      attrs(input, { type: "text", "data-property": property });
      input.addEventListener("change", () => {
        designer().stats("border_change_tailmarkerscalation");
        const box = InputBox.of(input) as InputBox;
        assignSelectedOrAll([property], [(Length.parseEquationValue(box.value()) as number) / 100]);
      });
      new InputBox(input, { minValue: 1, incrementValue: 1, postfix: "%" });
      return input;
    }
    if ("_bhm" === property || "_btm" === property) {
      const select = el("select");
      attrs(select, { "data-property": property });
      const option = (value: string, text: string, disabled = false): void => {
        const item = el("option");
        item.setAttribute("value", value);
        if (disabled) item.disabled = true;
        setText(item, text);
        select.appendChild(item);
      };
      option("", str("GCommonNames", "text.none"));
      option(BorderMarker.Circle, str("GStylable", "border-marker.circle"));
      option(BorderMarker.Bullet, str("GStylable", "border-marker.bullet"));
      option(BorderMarker.Diamond, str("GStylable", "border-marker.diamond"));
      option(BorderMarker.Line, str("GStylable", "border-marker.line"));
      option(BorderMarker.LineDouble, str("GStylable", "border-marker.linedouble"));
      option(BorderMarker.Arrow, str("GStylable", "border-marker.arrow"));
      option(BorderMarker.ArrowFat, str("GStylable", "border-marker.arrowfat"));
      option(BorderMarker.ArrowLine, str("GStylable", "border-marker.arrowline"));
      option(BorderMarker.ArrowDoubleLine, str("GStylable", "border-marker.arrowdoubleline"));
      option(BorderMarker.ArrowLineBar, str("GStylable", "border-marker.arrowlinebar"));
      option(BorderMarker.ArrowPointer, str("GStylable", "border-marker.arrowpointer"));
      option("#", str(KEY, "option.custom"), true);
      select.addEventListener("change", () => {
        let name = select.value;
        for (const key of Object.keys(BorderMarker))
          if (name === BorderMarker[key as keyof typeof BorderMarker]) {
            name = key;
            break;
          }
        designer().stats("border_change_headmarker", name);
        assignSelectedOrAll([property], [select.value || null]);
      });
      return select;
    }
    if (0 === property.indexOf("arrow-paste-")) {
      const target = property.substr("arrow-paste-".length);
      const button = el("button", "g-flat g-icon");
      attrs(button, { "data-title": str("GPasteAction", "title") });
      button.appendChild(el("span", "gravit-icon-paste"));
      button.addEventListener("click", () => {
        designer().stats("border_click_paste");
        let pasted = false;
        const nodes = Node.deserialize(designer().getClipboardContent(Node.MIME_TYPE) as string) as
          Node[] | null;
        if (nodes && nodes.length)
          for (let n = 0; n < nodes.length; ++n)
            if ((nodes[n] as Node).hasMixin(VertexSource)) {
              const source = nodes[n] as unknown as ConstructorParameters<
                typeof VertexTransformer
              >[0];
              const bounds = VertexInfo.calculateBounds(source, true);
              if (bounds) {
                const side = bounds.getSide(Rect.Side.BOTTOM_CENTER);
                assignSelectedOrAll(
                  [target],
                  [
                    new VertexContainer(
                      new VertexTransformer(
                        source,
                        new Transform(1, 0, 0, -1, -side.getX(), -side.getY()),
                      ),
                    ),
                  ],
                );
                pasted = true;
                break;
              }
            }
        if (!pasted) window.alert(str("GCommonNames", "arrow-paste.alert"));
      });
      return button;
    }
    throw new Error("Unknown input property: " + property);
  }

  private _triggerInspector(
    type: (typeof SidebarEvent.Type)[keyof typeof SidebarEvent.Type],
  ): void {
    const sidebar = designer().getRightSidebars().getSidebar(SidebarsIds.GInspectorSidebar);
    // Sic: the old code assumed the inspector sidebar is registered.
    (sidebar as SidebarLike).trigger(new SidebarEvent(type, sidebar));
  }

  private _removeEqualPaintLayers(layer: BorderPaintLayer): void {
    Editor.tryRunTransaction(
      (this._elements as BorderOwner[])[0],
      () => {
        const layers: BorderPaintLayer[] = [];
        this._iterateEqualPaintLayer(layer, (equal) => {
          layers.push(equal);
        });
        for (const equal of layers) (equal.getParent() as ContainerNode).removeChild(equal);
      },
      str(KEY, "action.remove-border"),
    );
  }

  private _lastBlockLayer(): BorderPaintLayer | undefined {
    const blocks = findAll(this._panel as HTMLElement, ".border-block");
    return layerOf(blocks[blocks.length - 1]);
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
        // Sic: borders are taken from elements with the fill property set
        // (see "Border panel takes elements by their fill property set").
        const take = (_index: unknown, part: unknown) => {
          const node = part as BorderOwner;
          if (
            node.hasMixin(Stylable) &&
            node.getStylePropertySets().indexOf(PropertySet.FillPaintLayers) >= 0
          )
            (this._elements as BorderOwner[]).push(node);
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

  override openPatternChooser(): void {
    const button = this._firstSwatch()?.querySelector<HTMLElement>(".g-button");
    if (button) button.click();
  }

  override openEyeDropper(pageX?: number, pageY?: number): void {
    const chooser = chooserOf(this._firstSwatch());
    if (chooser) chooser.openEyeDropper(pageX, pageY);
  }

  /** `.border-block:first-child [data-property="_pt"]`. */
  private _firstSwatch(): HTMLElement | null {
    const panel = this._panel as HTMLElement;
    const first = panel.firstElementChild;
    if (!first || !first.classList.contains("border-block")) return null;
    return first.querySelector<HTMLElement>('[data-property="_pt"]');
  }

  _styleEditorEventHandler(event: { type: unknown }): void {
    if (this._styleEdOn && event.type == StyleEdManager.EditorEventType.PrepareModifiedEvent)
      this._styleEditorChange = true;
  }

  _updateProperties(data?: unknown): void {
    if (this._elements && this._elements.length) {
      for (const block of findAll(this._panel as HTMLElement, ".border-block")) block.remove();
      const layers = (this._elements[0] as BorderOwner).getPaintLayers().getBorderLayers();
      for (const layer of layers) if (layer) this._insertPaintLayer(layer, data);
      this._updateToolbar();
    } else console.warn("GBorderPaintLayerProperties: empty _elements array");
  }

  _updateToolbar(): void {
    const has = findAll(this._panel as HTMLElement, ".border-block").length > 0;
    const toolbar = this._toolbar as HTMLElement;
    toggleClass(toolbar, "empty-list", !has);
    for (const action of ["stroke-settings", "arrow-settings", "remove"])
      for (const button of findAll(toolbar, "[data-action=" + action + "]"))
        css(button, "display", has ? "" : "none");
  }

  _insertPaintLayer(layer: BorderPaintLayer, data?: unknown): void {
    const panel = this._panel as HTMLElement;
    let dragAllowed = false;
    let dragged: BorderPaintLayer | null = null;
    let image: HTMLElement | null = null;
    let deleting = false;
    let panelOffset: { top: number; left: number } | null = null;
    let panelHeight = 0;
    let dx = 0;
    let dy = 0;
    // Whether a drop on `block` is allowed (another row, or the row itself with Shift).
    const canDropOn = (block: Element): boolean => {
      if (dragged) {
        const target = layerOf(block);
        if (target && (target !== dragged || Platform.modifiers.shiftKey))
          return dragged.getParent() === target.getParent();
      }
      return false;
    };
    const assign = (names: string[], values: unknown[], temporary?: boolean, related?: unknown) =>
      this._assign(layer, names, values, temporary, related);
    const indicator = el("div", "g-drop-indicator");

    const block = el("div", "border-block g-cursor-hand-open");
    attrs(block, { "data-drag-mode": PressMode.PRESS_AND_HOLD });
    setData(block, "paintLayer", layer);
    block.setAttribute("draggable", "true");
    block.addEventListener("mousedown", (event) => {
      const target = event.target as Element;
      dragAllowed = designer().isTouchEnabled()
        ? !!target.closest(".drag-indicator")
        : target.classList.contains("border-block") ||
          target.classList.contains("gravit-icon-drag-indicator") ||
          target.classList.contains("columns") ||
          target.classList.contains("column");
      const row = target.closest(".border-block");
      if (row) toggleClass(row, "g-draggable-disabled", !dragAllowed);
    });
    block.addEventListener("dragstart", (event) => {
      if (!dragAllowed) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const row = (event.target as Element).closest(".border-block") as HTMLElement;
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
      for (const other of findAll(panel, ".border-block")) {
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
          const target = layerOf(overlay.parentNode as HTMLElement);
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
              Platform.modifiers.shiftKey
                ? str(KEY, "action.duplicate-border")
                : str(KEY, "action.move-border"),
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
      const row = (event.target as Element).closest(".border-block");
      const target = layerOf(row ? row.closest(".border-block") : null);
      for (const shown of findAll(panel, ".g-drop-indicator")) shown.remove();
      for (const shown of findAll(panel, ".grid-drag-overlay")) shown.remove();
      if (dragged && target && dragged.getParent() === target.getParent()) {
        const moved = dragged;
        const owner = moved.getParent() as ContainerNode;
        const from = owner.getIndexOfChild(moved);
        const to = owner.getIndexOfChild(target);
        // Sic: named after the fill panel's actions (see "Dropping a
        // border outside the list is named after fills").
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
          Platform.modifiers.shiftKey
            ? str("GFillPaintLayerProperties", "action.duplicate")
            : str("GFillPaintLayerProperties", "action.move"),
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
      designer().stats("border_set_border");
      this._setSelectedPaintLayer(layer);
    });

    const normalVisibility = el(
      "span",
      "border-action border-visibility gravit-icon-display normal",
    );
    attrs(normalVisibility, {
      "data-property": "_vs",
      "data-title": str("GCommonNames", "action.toggle-visibility"),
    });
    normalVisibility.addEventListener("click", (event) => {
      designer().stats("border_hide_border");
      event.stopPropagation();
      const hidden = normalVisibility.classList.contains("gravit-icon-hide");
      removeClass(normalVisibility, "gravit-icon-" + (hidden ? "hide" : "display"));
      addClass(normalVisibility, "gravit-icon-" + (hidden ? "display" : "hide"));
      assign(["_vs"], [hidden]);
    });
    const indicatorIcon = el(
      "div",
      "gravit-icon-drag-indicator g-cursor-hand-open gravit-icon-touch-drag-indicator",
    );
    const touch = el("div", "touch");
    const swatch = this._createRowField("_pt", layer, assign);
    const width = addClass(this._createRowField("_bw", layer, assign), "normal");
    const blend = addClass(this._createRowField("_bl", layer, assign), "normal");
    const opacity = addClass(this._createRowField("_op", layer, assign), "normal");
    propertyRow(block, {
      columns: [
        { clazz: "drag-indicator", content: indicatorIcon },
        { width: "40px", clazz: "color-preview", content: swatch },
        { width: "40px", content: width },
        { width: "auto", content: blend },
        { width: "45px", content: opacity },
        { width: "20px", content: normalVisibility },
        { width: "auto", content: touch },
      ],
    });
    propertyRow(touch, {
      columns: [
        { width: "40px", content: this._createRowField("_bw", layer, assign) },
        { width: "auto", content: this._createRowField("_bl", layer, assign) },
        { width: "60px", content: this._createRowField("_vs", layer, assign) },
      ],
    });
    propertyRow(touch, {
      columns: [
        { width: "auto", content: this._createRowField("_ra", layer, assign) },
        { width: "60px", content: this._createRowField("_op", layer, assign) },
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
      const target = layerOf(block) as BorderPaintLayer;
      this._setSelectedPaintLayer(target);
      const options: ContextMenuOptions = {
        previousEvent: {
          pageX: event.pageX,
          pageY: event.pageY,
          clientX: event.clientX,
          clientY: event.clientY,
          data: { context: ContextMenuContext.BorderPropertyPanel },
        },
        data: {
          openAdvancedSettings: () => {
            this._updateAdvancedSettings();
            const button = (this._toolbar as HTMLElement).querySelector(
              "[data-action=stroke-settings]",
            );
            (this._advancedStrokeOverlay as Overlay).open(button);
          },
          paintLayer: target,
        },
      };
      designer().getContextMenu()?.trigger(options);
    });
    this._setSelectedPaintLayer(layer);
    this._updatePaintLayer(layer, data);
    for (const slider of findAll(block, ".transparency")) {
      const op = parents(slider, ".touch")[0]?.querySelector<HTMLInputElement>(".border-op");
      setSliderValue(slider, parseInt(op ? op.value : ""));
    }
  }

  /** The fields of a border row (the old `C(property)`). */
  private _createRowField(
    property: string,
    layer: BorderPaintLayer,
    assign: (names: string[], values: unknown[], temporary?: boolean, related?: unknown) => void,
  ): HTMLElement {
    if ("_pt" === property) {
      const swatch = el("div");
      attrs(swatch, { "data-property": "_pt" });
      patternChooser(swatch, {
        types: [Color, LinearGradient, RadialGradient, AngularGradient, Background, TexturePattern],
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
    if ("_bl" == property) {
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
        designer().stats("border_change_blendmode", select.value);
        assign(["_bl"], [select.value]);
      });
      return select;
    }
    if ("_op" === property) {
      const input = el("input", "border-op");
      attrs(input, { "data-property": "_op", type: "text" });
      input.addEventListener("change", (event) => {
        designer().stats("border_change_opacity");
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
    if ("_bw" === property) {
      const input = el("input");
      attrs(input, { "data-property": property });
      input.addEventListener("change", () => {
        designer().stats("border_change_width");
        const length = (UnitBox.of(input) as UnitBox).value();
        const px = length ? length.toUnit(Length.Unit.PX) : null;
        if (null !== px && px >= 0) assign(["_vs", property], [true, px]);
        else this._updateProperties();
      });
      new UnitBox(input, { minValue: 0, source: "border" });
      attachRichTooltip(
        input,
        tooltip({
          title: str(KEY, "text.border-width-tooltip-title"),
          description: str(KEY, "text.border-width-tooltip-description"),
          learnMore: "",
        }),
      );
      return input;
    }
    if ("_vs" === property) {
      const span = el("span", "border-action border-visibility gravit-icon-touch-show");
      attrs(span, {
        "data-property": "_vs",
        "data-title": str("GCommonNames", "action.toggle-visibility"),
      });
      span.addEventListener("click", (event) => {
        designer().stats("border_hide_border");
        event.stopPropagation();
        const hidden = span.classList.contains("gravit-icon-touch-hide");
        removeClass(span, "gravit-icon-touch-" + (hidden ? "hide" : "show"));
        addClass(span, "gravit-icon-touch-" + (hidden ? "show" : "hide"));
        assign(["_vs"], [hidden]);
      });
      return span;
    }
    if ("_ra" === property) {
      const slider = el("div", "transparency gravit-icon-touch-rectangle");
      inputSlider(slider, { type: "range", min: 0, max: 100, step: 1 });
      slider.addEventListener("input", (event) => {
        const target = event.target as Element;
        const value = parseInt(String(sliderValue(target)));
        for (const touchRow of parents(target, ".touch"))
          for (const op of findAll(touchRow, ".border-op")) triggerChange(op, value);
      });
      return slider;
    }
    throw new Error("Unknown input property: " + property);
  }

  _removePaintLayer(layer: BorderPaintLayer): void {
    for (const block of findAll(this._panel as HTMLElement, ".border-block"))
      if (layerOf(block) === layer) {
        block.remove();
        return;
      }
  }

  _updatePaintLayer(layer: BorderPaintLayer | null, data?: unknown): void {
    if (!layer) return;
    for (const block of findAll(this._panel as HTMLElement, ".border-block")) {
      if (layerOf(block) !== layer) continue;
      for (const swatch of findAll(block, '[data-property="_pt"]')) {
        const chooser = chooserOf(swatch);
        if (chooser) {
          chooser.setPattern(layer.getProperty("_pt", false, false, true) as Pattern | null);
          chooser.value(layer.getProperty("_pt", false, false, true) as Pattern | null);
          chooser.opacity(layer.getProperty("_op", false, false, true) as number);
        }
      }
      const width = this._getProperty(layer, "_bw") as number | null;
      for (const input of findAll<HTMLInputElement>(block, '[data-property="_bw"]')) {
        // Re-running the plugin on a box keeps its first options (see
        // "Border width box ignores the document unit").
        const scene = (this._document as Document).getScene();
        new UnitBox(input, {
          unit:
            (scene ? scene.getProperty("ut") : null) === Length.Unit.PX
              ? Length.Unit.PX
              : Length.Unit.PT,
          minValue: 0,
        }).value(null !== width ? new Length(width, Length.Unit.PX) : null);
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
    }
    this._updateAdvancedSettings();
    const related = data as {
      evtType?: number;
      chooserOn?: boolean;
      borderLayerIndex?: number | null;
      activeStopIdx?: number | null;
    } | null;
    if (
      related &&
      (related.evtType == ModifiedEvent.Type.Undo || related.evtType == ModifiedEvent.Type.Redo) &&
      related.chooserOn &&
      null != related.borderLayerIndex &&
      (layer.getParent() as ContainerNode).getIndexOfChild(layer) == related.borderLayerIndex
    )
      // Reopens the chooser of the layer's row, like the fill panel. The old
      // code clicked `$element.find(".preview")`, a variable that doesn't
      // exist, so it threw a ReferenceError here (BUG-153).
      for (const block of findAll(this._panel as HTMLElement, ".border-block"))
        if (layerOf(block) === layer)
          for (const preview of findAll(block, ".preview"))
            clickPreview(preview, null != related.activeStopIdx ? related.activeStopIdx : null);
  }

  _assign(
    layer: BorderPaintLayer,
    names: string[],
    values: unknown[],
    temporary?: boolean,
    related?: unknown,
  ): void {
    if (temporary)
      this._iterateEqualPaintLayer(layer, (equal) => {
        equal.setProperties(names, values, false, false, true);
      });
    else if (this._document) {
      let relatedData: Record<string, unknown> | null = null;
      if (related) {
        const index = (layer.getParent() as ContainerNode).getIndexOfChild(layer);
        relatedData = { borderLayerIndex: index, ...(related as Record<string, unknown>) };
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
        editor.commitTransaction(str(KEY, "action.change-border-properties"), relatedData);
        this._ownChange = false;
      }
    }
  }

  /** The layer's own value (the old callers' default arguments were never read). */
  _getProperty(layer: BorderPaintLayer | null | undefined, name: string): unknown {
    return layer ? layer.getProperty(name) : null;
  }

  _afterInsert(event: AfterInsertEvent): void {
    const node = event.node as unknown;
    if (
      node instanceof BorderPaintLayer &&
      (node.getOwnerStylable() as unknown) === (this._elements as BorderOwner[])[0]
    ) {
      this._insertPaintLayer(node);
      this._updateToolbar();
    }
  }

  _beforeRemove(event: BeforeRemoveEvent): void {
    const node = event.node as unknown;
    if (
      node instanceof BorderPaintLayer &&
      (node.getOwnerStylable() as unknown) === (this._elements as BorderOwner[])[0]
    ) {
      this._removePaintLayer(node);
      let neighbour: Node | null = node.getPrevious();
      while (neighbour && !(neighbour instanceof BorderPaintLayer))
        neighbour = neighbour.getPrevious();
      if (!(neighbour instanceof BorderPaintLayer)) {
        neighbour = node.getNext();
        while (neighbour && !(neighbour instanceof BorderPaintLayer))
          neighbour = neighbour.getNext();
      }
      this._setSelectedPaintLayer(neighbour as BorderPaintLayer | null);
      this._updateToolbar();
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    const node = event.node as unknown;
    if (
      node instanceof BorderPaintLayer &&
      (node.getOwnerStylable() as unknown) === (this._elements as BorderOwner[])[0]
    )
      this._updatePaintLayer(node);
  }

  _updateAdvancedSettings(): void {
    const show = (layer: BorderPaintLayer): void => {
      const dashes = this._getProperty(layer, "_bds") as number[] | null;
      const panel = this._advancedStrokePanel as HTMLElement;
      findAll<HTMLInputElement>(panel, '[data-property="_bds"]').forEach((input, index) => {
        setValue(input, dashes && dashes.length > index ? dashes[index] : "");
      });
      for (const button of findAll(panel, '[data-property^="_ba"]')) {
        const alignment = (button.getAttribute("data-property") as string).substr("_ba-".length);
        if (alignment === BorderAlignment.Inside || alignment === BorderAlignment.Outside) {
          let open = false;
          let closed = false;
          for (let u = 0, count = (this._elements as BorderOwner[]).length; u < count; u++) {
            const element = (this._elements as BorderOwner[])[u];
            if (
              (element instanceof Path && !(element as unknown as { $closed: boolean }).$closed) ||
              (element instanceof Ellipse && element.$etp === Ellipse.Type.Arc)
            )
              open = true;
            else closed = true;
          }
          let name = "";
          switch (alignment) {
            case BorderAlignment.Inside:
              name = str("GStylable", "border-alignment.inside");
              break;
            case BorderAlignment.Outside:
              name = str("GStylable", "border-alignment.outside");
          }
          // jQuery .attr("disabled", true | false).
          if (open) button.setAttribute("disabled", "disabled");
          else button.removeAttribute("disabled");
          const title =
            open && closed ? str(KEY, "text.border-alignment.disabled") + ": " + name : name;
          button.setAttribute("data-title", title);
        }
        toggleClass(button, "g-active", this._getProperty(layer, "_ba") === alignment);
      }
      for (const button of findAll(panel, '[data-property^="_blc"]')) {
        const cap = (button.getAttribute("data-property") as string).substr("_blc-".length);
        toggleClass(button, "g-active", this._getProperty(layer, "_blc") === cap);
      }
      for (const button of findAll(panel, '[data-property^="_blj"]')) {
        const join = (button.getAttribute("data-property") as string).substr("_blj-".length);
        toggleClass(button, "g-active", this._getProperty(layer, "_blj") === join);
      }
      const miter = panel.querySelector<HTMLInputElement>('[data-property="_bml"]');
      if (miter) {
        const box = InputBox.of(miter);
        if (box) box.value(formatNumber(this._getProperty(layer, "_bml") as number));
        if (this._getProperty(layer, "_blj") !== PaintCanvas.LineJoin.Miter)
          miter.setAttribute("disabled", "disabled");
        else miter.removeAttribute("disabled");
      }
      const head = this._getProperty(layer, "_bhm");
      for (const select of findAll<HTMLSelectElement>(panel, '[data-property="_bhm"]'))
        setValue(select, head instanceof VertexContainer ? "#" : head || "");
      const tail = this._getProperty(layer, "_btm");
      for (const select of findAll<HTMLSelectElement>(panel, '[data-property="_btm"]'))
        setValue(select, tail instanceof VertexContainer ? "#" : tail || "");
      for (const name of ["_bhms", "_btms"])
        for (const input of findAll<HTMLInputElement>(panel, '[data-property="' + name + '"]')) {
          const box = InputBox.of(input);
          if (box) box.value(formatNumber(100 * (this._getProperty(layer, name) as number), 0));
        }
      const check = (name: string): void => {
        for (const input of findAll<HTMLInputElement>(panel, '[data-property="' + name + '"]'))
          input.checked = !!this._getProperty(layer, name);
      };
      check("_bhmo");
      for (const slider of findAll(panel, '[data-property="_bhmi"]'))
        setSliderValue(slider, 100 * (this._getProperty(layer, "_bhmi") as number));
      check("_btmo");
      for (const slider of findAll(panel, '[data-property="_btmi"]'))
        setSliderValue(slider, 100 * (this._getProperty(layer, "_btmi") as number));
      check("_bs");
    };
    const selected = this._getSelectedPaintLayer();
    if (selected) show(selected);
    else {
      const last = this._lastBlockLayer();
      if (last) show(last);
    }
  }

  _setSelectedPaintLayer(layer: BorderPaintLayer | null | undefined): void {
    for (const block of findAll(this._panel as HTMLElement, ".border-block"))
      toggleClass(block, "g-selected", layerOf(block) === layer);
    if (this._document) this._document.updateActiveStylesList("Border", layer);
  }

  _getSelectedPaintLayer(): BorderPaintLayer | undefined {
    return layerOf((this._panel as HTMLElement).querySelector(".border-block.g-selected"));
  }

  /**
   * Calls `callback` with every inspected element's border that is `layer`
   * or of its class at its index among the borders.
   */
  _iterateEqualPaintLayer(
    layer: BorderPaintLayer | null | undefined,
    callback: (equal: BorderPaintLayer, owner: BorderOwner) => void,
  ): void {
    if (!layer) return;
    const index = (layer.getParent() as unknown as PaintLayers).getBorderLayers().indexOf(layer);
    const elements = this._elements as BorderOwner[];
    for (let o = 0; o < elements.length; ++o) {
      const owner = elements[o] as BorderOwner;
      const layers = owner.getPaintLayers().getBorderLayers();
      layers.forEach((other, i) => {
        if ((other && other === layer) || (other.constructor === layer.constructor && i === index))
          callback(other, owner);
      });
    }
  }
}
