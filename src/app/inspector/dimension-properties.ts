// Old: designer.browser.dev.js module 1294 (GDimensionProperties).
/**
 * Position, size, angle and anchors of the inspected elements, and the
 * align toolbar above them (align and distribute buttons, the settings
 * overlay with same width/height and snap to full/half units). Shown for
 * any selection of transformable elements; the page alone has none.
 *
 * Typed values go through the scene's unit (stringToPoint); the angle is
 * an equation in degrees. Several elements are resized and moved as one
 * box; the angle of several is the selection editor's.
 */
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { formatNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Element, GeometryChangeEvent } from "../../engine/scene/element.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { TOOLTIP_AREA } from "../actions/deps.ts";
import { AlignAction } from "../actions/modify/align-action.ts";
import { DistributeAction } from "../actions/modify/distribute-action.ts";
import { SnapUnitAction } from "../actions/view/snap-unit-action.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { InputBox } from "../widgets/input-box.ts";
import { initInputLabel } from "../widgets/input-label.ts";
import { InputSelect } from "../widgets/input-select.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig, type RichTooltipFields } from "../widgets/rich-tooltip-config.ts";
import type { Document } from "../document/document.ts";
import { container, designer } from "../shell/globals.ts";
import type { SidebarTouchTool } from "../shell/layout.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

const AnchorType = Element.Anchor.AnchorType;

type Element_ = globalThis.Element;
type Designer = ReturnType<typeof designer>;

/** A transformable element as the panel uses it. */
interface TransformElement extends Node {
  getGeometryBBox(): Rect | null;
  getAngle(): number | null;
  getProperty(name: string): unknown;
  setProperties(names: string[], values: unknown[]): void;
  transform(transform: Transform, ...rest: unknown[]): void;
}

/** The element editor calls the panel makes (GElementEditor and the box editors). */
interface EditorLike {
  getElement(): unknown;
  getPEGeometryBBox(): Rect | null;
  getRotationAngle?(): number;
  _setTransform(transform: Transform | null): void;
  applyTransform(target: unknown, ...rest: unknown[]): void;
  applyPropertiesToParts(properties: string[], values: unknown[]): boolean;
}

interface Dimensions {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

type AnchorValue = number;

/** An action's title in the current language (GLocale.get(action.getTitle())). */
function actionTitle(id: string): string {
  const action = designer().getAction(id);
  return String(Locale.get((action as NonNullable<typeof action>).getTitle()) ?? "");
}

function tooltip(key: string, middle?: boolean): RichTooltipConfig {
  const fields: RichTooltipFields = {
    title: text("GDimensionProperties", `text.${key}-tooltip-title`),
    description: text("GDimensionProperties", `text.${key}-tooltip-description`),
  };
  if (middle !== undefined) {
    fields.middle = middle;
    fields.learnMore = "";
  }
  return RichTooltipConfig.from(fields);
}

function anchorTooltip(key: string): RichTooltipConfig {
  return RichTooltipConfig.from({
    title: text("GDimensionProperties", `text.anchor-${key}-tooltip-title`),
    description: text("GDimensionProperties", `text.anchor-${key}-tooltip-description`),
    learnMore: "",
  });
}

/** `$(els).addClass(cond ? "g-active" : "")` and the matching removeClass. */
function activeIf(elements: Iterable<Element_>, add: boolean, remove: boolean): void {
  for (const element of elements) {
    if (add) element.classList.add("g-active");
    if (remove) element.classList.remove("g-active");
  }
}

/**
 * Editor.getLinkedElementsInSelection on scene nodes. The editor types its
 * nodes with its own structural view (EdNode in editor.ts), which the
 * engine's Node typings don't fully declare; the values are scene nodes.
 */
function linkedInSelection(
  editor: Editor,
  element: TransformElement,
  selection: readonly TransformElement[],
): Node[] {
  type EdNodes = Parameters<Editor["getLinkedElementsInSelection"]>[1];
  const nodes = selection as unknown as EdNodes;
  return editor.getLinkedElementsInSelection(
    element as unknown as EdNodes[number],
    nodes,
  ) as unknown as Node[];
}

export class DimensionProperties extends Properties {
  static _keepRatioName = "designer.settings.dimension.preserveratio";

  _panel: HTMLElement | null = null;
  _toolbar: HTMLElement | null = null;
  _transformButton: HTMLButtonElement | null = null;
  override _document: Document | null = null;
  _elements: TransformElement[] = [];
  _elementsBBox: Rect | null = null;
  _anchorsPanel: HTMLElement | null = null;
  _firstElementsBBox: Rect | null = null;
  _advancedFillPanel: Overlay | null = null;

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._panel = panel;
    this._toolbar = toolbar;
    panel.classList.add("dimension-panel");
    // The old touch tools took the panel elements themselves (and a mix of
    // element and selector for the second one).
    this.setTouchTools([
      new TouchTool({
        id: "dimension.align",
        icon: "gravit-icon-align",
        panelWidth: "370px",
        panel: toolbar,
      }) as SidebarTouchTool,
      new TouchTool({
        id: "dimension.dimension",
        icon: "gravit-icon-touch-transform",
        toolbar: ".advanced-transform-toolbar",
        panelWidth: "395px",
        panel: [panel, ".advanced-transform-properties"],
      }) as SidebarTouchTool,
    ]);

    const field = (key: string, config: RichTooltipConfig): HTMLElement => {
      if ("keep-ratio" == key) {
        const span = el("span");
        span.classList.add(
          EditorOptions.preserveAspectRatio ? "gravit-icon-linked" : "gravit-icon-unlinked",
        );
        span.style.textAlign = "center";
        span.style.cursor = "pointer";
        span.addEventListener("click", () => {
          if ("yes" === span.getAttribute("data-ratio")) {
            span.setAttribute("data-ratio", "no");
            span.setAttribute("class", "gravit-icon-unlinked");
            this._setAspectRatioBehavior(false);
            designer().stats("dimension_toggle_preserveratio", "disabled");
          } else {
            span.setAttribute("data-ratio", "yes");
            span.setAttribute("class", "gravit-icon-linked");
            this._setAspectRatioBehavior(true);
            designer().stats("dimension_toggle_preserveratio", "enabled");
          }
        });
        span.setAttribute("data-title", text("GDimensionProperties", "action.keep-ratio"));
        span.setAttribute("data-ratio", EditorOptions.preserveAspectRatio ? "yes" : "no");
        attachRichTooltip(span, config);
        return span;
      }
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-dimension", key);
      const holder = el("div");
      if ("x" === key || "y" === key || "w" === key || "h" === key) {
        const label = String(
          Locale.get(new LocaleKey("GCommonNames", "property-".concat(key.toLowerCase())), key),
        );
        input.addEventListener("change", (event) => {
          designer().stats("dimension_set_positionOrSize");
          this._assignDimension(
            key,
            (InputBox.of(event.target as HTMLInputElement) as InputBox).value(),
          );
        });
        new InputBox(input, { minValue: "w" === key || "h" === key ? 0 : null });
        holder.appendChild(input);
        initInputLabel(holder, { label, autoPadding: label.length > 1 });
      } else {
        // "rotate"
        input.addEventListener("change", (event) => {
          designer().stats("dimension_set_rotation");
          this._assignDimension(
            key,
            (InputBox.of(event.target as HTMLInputElement) as InputBox).value(),
          );
        });
        new InputBox(input, { postfix: "°" });
        holder.appendChild(input);
        initInputLabel(holder, { label: "R" });
      }
      attachRichTooltip(holder, config);
      return holder;
    };

    const alignButton = (type: string): HTMLButtonElement => {
      const id = AlignAction.ID + "." + type;
      const action = designer().getAction(id) as NonNullable<ReturnType<Designer["getAction"]>>;
      const config = action.getTooltipConfig(TOOLTIP_AREA.SIDEBAR) as RichTooltipConfig | null;
      const icon = el("span");
      // The cloud icon table's "icon" entry is empty, so the action's markup is used.
      icon.insertAdjacentHTML("beforeend", String(action.getIcon() ?? ""));
      icon.style.stroke = "transparent";
      if (config) attachRichTooltip(icon, config);
      const button = el("button");
      button.setAttribute("data-title", actionTitle(id));
      button.setAttribute("data-action", id);
      button.classList.add("svg-button");
      icon.classList.add("normal");
      button.appendChild(icon);
      button.appendChild(el("span", "gravit-icon-touch-".concat(type, " touch")));
      button.addEventListener("click", () => {
        designer().executeAction(id, undefined, "dimensionproperties");
      });
      return button;
    };

    const distributeButton = (type: string): HTMLButtonElement => {
      const id = DistributeAction.ID + "." + type;
      const action = designer().getAction(id) as NonNullable<ReturnType<Designer["getAction"]>>;
      const config = action.getTooltipConfig(TOOLTIP_AREA.SIDEBAR) as RichTooltipConfig | null;
      const icon = el("span");
      icon.insertAdjacentHTML("beforeend", String(action.getIcon() ?? ""));
      if (config) attachRichTooltip(icon, config);
      const button = el("button");
      button.setAttribute("data-title", actionTitle(id));
      button.setAttribute("data-action", id);
      button.classList.add("svg-button");
      icon.classList.add("normal");
      button.appendChild(icon);
      button.appendChild(el("span", "gravit-icon-touch-".concat(type, " touch")));
      button.addEventListener("click", () => {
        const input = document.querySelector<HTMLInputElement>(".".concat(type, "Input input"));
        const raw = input ? input.value : undefined;
        const value = "Auto" == raw ? undefined : parseInt(raw as string);
        designer().executeAction(id, [undefined, undefined, value], "dimensionproperties");
      });
      return button;
    };

    const distanceSelect = (type: string): HTMLElement => {
      const holder = el("div", type + "Input");
      const select = new InputSelect(holder, { list: ["Auto", "0", 1, 10, 20, 30, 50, 100] });
      const pattern = /^-?[0-9]+.?[0-9]*$/;
      select.input.value = "Auto";
      select.unbindInputChange();
      select.input.addEventListener("change", function (this: HTMLInputElement) {
        if (!pattern.test(this.value)) this.value = "Auto";
      });
      return holder;
    };

    const Align = Editor.ArrangeAlignType;
    const Distribute = DistributeAction.Type;
    const classes = <T extends HTMLElement>(element: T, names: string): T => {
      element.classList.add(...names.split(" "));
      return element;
    };
    toolbar.classList.add("main-toolbar");
    toolbar.append(
      classes(distributeButton(Distribute.Horizontal), "primary normalDistribute"),
      classes(distributeButton(Distribute.Vertical), "primary normalDistribute"),
      el("span", "divider"),
      classes(alignButton(Align.AlignLeft), "secondary"),
      classes(alignButton(Align.AlignCenter), "secondary"),
      classes(alignButton(Align.AlignRight), "secondary"),
      el("span", "divider"),
      el("p", "interval"),
      classes(alignButton(Align.AlignTop), "secondary"),
      classes(alignButton(Align.AlignMiddle), "secondary"),
      classes(alignButton(Align.AlignBottom), "secondary"),
      el("p", "lineBreak"),
      classes(distributeButton(Distribute.Horizontal), "primary touchDistribute"),
      classes(distanceSelect(Distribute.Horizontal), "touchDistribute"),
      el("p", "interval"),
      classes(distributeButton(Distribute.Vertical), "primary touchDistribute"),
      classes(distanceSelect(Distribute.Vertical), "touchDistribute"),
    );

    const settings = el("div");
    this._advancedFillPanel = new Overlay(settings, { releaseOnClose: false });
    (settings.parentElement as HTMLElement).classList.add("settingBox");
    const settingRow = (key: string, icon: string, run: () => void): HTMLElement => {
      const content = el("div");
      content.textContent = text("GDimensionProperties", key);
      content.prepend(el("span", icon));
      content.addEventListener("click", () => {
        run();
        (this._advancedFillPanel as Overlay).close();
      });
      return content;
    };
    // The old code called gPropertyRow four times on the same element, so
    // it holds four sets of columns (and four g-property-row additions).
    const alignSettings = el("div", "alignSettings");
    propertyRow(alignSettings, {
      columns: [
        {
          width: "100%",
          content: settingRow("text.sameHeight", "gravit-icon-sameHeight", () => {
            new AlignAction(Align.AlignJustifyVertical).execute();
          }),
        },
      ],
    });
    propertyRow(alignSettings, {
      columns: [
        {
          width: "100%",
          content: settingRow("text.sameWidth", "gravit-icon-sameWidth", () => {
            new AlignAction(Align.AlignJustifyHorizontal).execute();
          }),
        },
      ],
    });
    propertyRow(alignSettings, {
      columns: [
        {
          width: "100%",
          content: settingRow("text.fullUnit", "gravit-icon-fullUnit", () => {
            new SnapUnitAction(SnapUnitAction.Type.FullUnit).execute();
          }),
        },
      ],
    });
    propertyRow(alignSettings, {
      columns: [
        {
          width: "100%",
          content: settingRow("text.halfUnit", "gravit-icon-HalfUnit", () => {
            new SnapUnitAction(SnapUnitAction.Type.HalfUnit).execute();
          }),
        },
      ],
    });
    settings.appendChild(alignSettings);
    toolbar.prepend(el("p", "lineBreak"));
    const settingsButton = el("button");
    settingsButton.setAttribute("data-title", text("GDimensionProperties", "text.setting"));
    settingsButton.classList.add("align-settings");
    settingsButton.appendChild(el("span", "gravit-icon-touch-settings"));
    settingsButton.addEventListener("click", (event) => {
      (this._advancedFillPanel as Overlay).open((event.target as HTMLElement).closest("button"));
    });
    toolbar.prepend(settingsButton);
    const title = el("label");
    title.textContent = text("GDimensionProperties", "text.alignTitle");
    toolbar.prepend(title);

    const positionTip = tooltip("property-x-y", false);
    const sizeTip = tooltip("property-w-h", false);
    const ratioTip = tooltip("keep-ratio");
    const transformTip = tooltip("transform-button", false);
    const angleTip = tooltip("rotate-angle", false);

    const heading = el("div", "transform-titile");
    heading.textContent = text("GDimensionProperties", "text.transform-title");
    panel.appendChild(heading);
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GCommonNames", "text.position"),
        columns: [
          { width: "44%", content: field("x", positionTip) },
          { width: "12%" },
          { width: "44%", content: field("y", positionTip) },
        ],
      }),
    );
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GCommonNames", "text.size"),
        columns: [
          { width: "44%", content: field("w", sizeTip) },
          { width: "12%", content: field("keep-ratio", ratioTip) },
          { width: "44%", content: field("h", sizeTip) },
        ],
      }),
    );
    const holder = document.createElement("div");
    // Old: $("<button>" + title + "</button>"), so the title is parsed as markup.
    holder.innerHTML = "<button>" + text("GDimensionProperties", "text.transform") + "</button>";
    const transformButton = holder.firstElementChild as HTMLButtonElement;
    transformButton.classList.add("transform-button");
    transformButton.addEventListener("click", () => this._toggleTransformMode());
    attachRichTooltip(transformButton, transformTip);
    this._transformButton = transformButton;
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GCommonNames", "text.angle"),
        columns: [
          { width: "44%", content: field("rotate", angleTip) },
          { width: "12%" },
          { width: "44%", content: transformButton },
        ],
      }),
    );

    const anchorButton = (
      property: "hacr" | "vacr",
      icon: string,
      group: string,
      side: string,
      action: string,
      tip: string,
      stats: string,
      type: AnchorValue,
    ): HTMLElement => {
      const button = el("div");
      button.appendChild(el("span", icon));
      button.classList.add("g-button", group, `${property}-${side}`);
      button.setAttribute("data-title", text("GDimensionProperties", `action.anchor-${action}`));
      button.addEventListener("click", () => {
        designer().stats(stats);
        if (property === "hacr") {
          const value = this._getHorizontalAnchorValue();
          const result = this._defineAnchorProperty("hacr", type, value);
          this._defineAnchorButtonState(null, result);
        } else {
          const value = this._getVerticalAnchorValue();
          const result = this._defineAnchorProperty("vacr", type, value);
          this._defineAnchorButtonState(result, null);
        }
      });
      attachRichTooltip(button, anchorTooltip(tip));
      return button;
    };
    const horizontal = el("div", "anchor-buttons");
    horizontal.append(
      anchorButton(
        "hacr",
        "gravit-icon-anchor-left",
        "g-group-start",
        "start",
        "left",
        "left",
        "dimension_set_anchors-horizontalstart",
        AnchorType.Start,
      ),
      anchorButton(
        "hacr",
        "gravit-icon-anchor-center",
        "g-group-element",
        "middle",
        "center",
        "center",
        "dimension_set_anchors-horizontalmiddle",
        AnchorType.Middle,
      ),
      anchorButton(
        "hacr",
        "gravit-icon-anchor-right",
        "g-group-end",
        "end",
        "right",
        "right",
        "dimension_set_anchors-horizontalend",
        AnchorType.End,
      ),
    );
    const vertical = el("div", "anchor-buttons");
    vertical.append(
      anchorButton(
        "vacr",
        "gravit-icon-anchor-top",
        "g-group-start",
        "start",
        "top",
        "top",
        "dimension_set_anchors-verticalstart",
        AnchorType.Start,
      ),
      anchorButton(
        "vacr",
        "gravit-icon-anchor-middle",
        "g-group-element",
        "middle",
        "middle",
        "middle",
        "dimension_set_anchors-verticalmiddle",
        AnchorType.Middle,
      ),
      anchorButton(
        "vacr",
        "gravit-icon-anchor-bottom",
        "g-group-end",
        "end",
        "bottom",
        "bottom",
        "dimension_set_anchors-verticalend",
        AnchorType.End,
      ),
    );
    const anchors = propertyRow(el("div"), {
      label: text("GDimensionProperties", "text.anchors"),
      columns: [
        { width: "44%", content: horizontal },
        { width: "12%" },
        { width: "44%", content: vertical },
      ],
    });
    anchors.classList.add("anchor-panel");
    panel.appendChild(anchors);
    this._anchorsPanel = anchors;
  }

  _setAspectRatioBehavior(preserve: boolean): void {
    EditorOptions.preserveAspectRatio = preserve;
    EditorOptions.allowTextRatioPreservation = preserve;
    container().setProperty(DimensionProperties._keepRatioName, preserve);
  }

  override isAvailable(transformMode: boolean): boolean {
    const button = this._transformButton as HTMLButtonElement;
    button.classList.toggle("g-active", transformMode);
    if (designer().isTouchEnabled()) {
      const panel = this._panel as HTMLElement;
      const anchors = this._anchorsPanel as HTMLElement;
      const advanced = document.querySelectorAll(".advanced-transform-properties");
      if (transformMode) {
        button.textContent = text("GLocale", "close");
        for (const label of document.querySelectorAll(".advanced-transform-toolbar > label"))
          label.textContent = text("GDimensionProperties", "text.transform-advanced");
        anchors.classList.toggle("down", true);
        panel.classList.toggle("have-anchor", false);
        for (const element of advanced) element.classList.toggle("have-anchor", true);
      } else {
        button.textContent = text("GDimensionProperties", "text.transform");
        anchors.classList.toggle("down", false);
        panel.classList.toggle("have-anchor", true);
        for (const element of advanced) element.classList.toggle("have-anchor", false);
        panel.classList.add("have-anchor");
      }
      this._changeSideBarContinerZIndex(transformMode);
    }
    return true;
  }

  _changeSideBarContinerZIndex(raise: boolean): void {
    if (designer().isTouchEnabled()) {
      if (raise) designer().getRightSidebars().addClassName("more-z-index");
      else designer().getRightSidebars().removeClassName("more-z-index");
    }
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      const scene = sceneOf(this._document);
      scene.removeEventListener(GeometryChangeEvent, this._geometryChange, this);
      scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
      editorOf(this._document).removeEventListener(
        Editor.EdGeometryChangeEvent,
        this._edGeometryChange,
        this,
      );
      // The old code removed the setting listener without its target.
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._elements = [];
    this._anchorPanelDisplay("none");
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i] as Node;
        if (element.hasMixin(Element.Transform) && !(element instanceof Page))
          this._elements.push(element as TransformElement);
      }
      if (this._elements.length && this._elements.length === list.length) {
        this._document = document;
        const scene = sceneOf(document);
        scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        scene.addEventListener(GeometryChangeEvent, this._geometryChange, this);
        editorOf(document).addEventListener(
          Editor.EdGeometryChangeEvent,
          this._edGeometryChange,
          this,
        );
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        this._updateDimensions();
        this._updateToolbar();
        if (this._showAnchor()) {
          this._anchorPanelDisplay("");
          this._defineAnchorButtonState(
            this._getVerticalAnchorValue(),
            this._getHorizontalAnchorValue(),
          );
        }
        return true;
      }
    }
    return false;
  }

  private _anchorPanelDisplay(value: string): void {
    for (const anchors of (this._panel as HTMLElement).querySelectorAll<HTMLElement>(
      ".anchor-panel",
    ))
      anchors.style.setProperty("display", value);
  }

  _toggleTransformMode(): void {
    designer().stats("dimension_change_transform-mode");
    const manager = designer().getToolManager();
    if (!(manager.getActiveTool() && manager.getActiveTool() instanceof SelectTool))
      manager.activateTool(PointerTool);
    const tool = manager.getActiveTool();
    if (tool instanceof SelectTool)
      tool.setEditMode(
        tool.getEditMode() === SelectTool.EditMode.Transform
          ? SelectTool.EditMode.Select
          : SelectTool.EditMode.Transform,
      );
  }

  _geometryChange(event: GeometryChangeEvent): void {
    if (
      (event.type === GeometryChangeEvent.Type.After ||
        event.type === GeometryChangeEvent.Type.Child) &&
      this._elements.indexOf(event.element as unknown as TransformElement) >= 0
    )
      this._updateDimensions();
  }

  _edGeometryChange(): void {
    this._updateDimensions(false, true);
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (
      !event.temporary &&
      this._elements &&
      this._elements.indexOf(event.node as TransformElement) >= 0 &&
      this._showAnchor()
    )
      this._defineAnchorButtonState(
        this._getVerticalAnchorValue(),
        this._getHorizontalAnchorValue(),
      );
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateDimensions();
  }

  _getCurrentDimensions(keepBoxes?: boolean, fromEditors?: boolean): Dimensions | null {
    let dimensions: Dimensions | null = null;
    let angle = 0;
    if (!keepBoxes) {
      this._elementsBBox = null;
      this._firstElementsBBox = null;
      let editor: EditorLike | null = null;
      for (let i = 0; i < this._elements.length; ++i) {
        const element = this._elements[i] as TransformElement;
        if (element.hasMixin(Element.Transform)) {
          let box: Rect | null = null;
          if (fromEditors) {
            editor = ElementEditor.getEditor<EditorLike>(element);
            if (editor && editor.getElement()) box = editor.getPEGeometryBBox();
          } else box = element.getGeometryBBox();
          if (box) {
            this._elementsBBox = this._elementsBBox ? this._elementsBBox.united(box) : box;
            if (!this._firstElementsBBox) {
              this._firstElementsBBox = box;
              angle =
                fromEditors && editor
                  ? (editor.getRotationAngle as () => number)()
                  : (element.getAngle() as number);
            }
          }
        }
      }
      if (!this._elementsBBox) {
        this._elementsBBox = null;
        this._firstElementsBBox = this._elementsBBox;
      }
    }
    if (this._firstElementsBBox) {
      const several = this._elements.length > 1;
      const delta = this._getDelta();
      if (several) {
        let selectionAngle = 0;
        if (fromEditors) {
          const selection = editorOf(
            this._document as Document,
          ).getSelectionEditor() as unknown as {
            getRotationAngle(): number;
          } | null;
          if (selection) selectionAngle = selection.getRotationAngle();
        }
        const box = this._elementsBBox as Rect;
        dimensions = {
          x: box.getX() - delta.getX(),
          y: box.getY() - delta.getY(),
          w: box.getWidth(),
          h: box.getHeight(),
          angle: selectionAngle,
        };
      } else {
        const box = this._firstElementsBBox;
        dimensions = {
          x: box.getX() - delta.getX(),
          y: box.getY() - delta.getY(),
          w: box.getWidth(),
          h: box.getHeight(),
          angle,
        };
      }
    }
    return dimensions;
  }

  _updateDimensions(keepBoxes?: boolean, fromEditors?: boolean): void {
    const panel = this._panel as HTMLElement;
    const show = (key: string, value: number | null) => {
      let shown = "";
      if (null !== value)
        switch (key) {
          case "x":
          case "y":
          case "w":
          case "h": {
            const scene = sceneOf(this._document as Document);
            shown = scene.pointToString(value, scene.getOptimalDecimalsCount());
            break;
          }
          case "rotate":
            shown = formatNumber(GMath.toDegrees(value), 1);
        }
      for (const input of panel.querySelectorAll<HTMLInputElement>(
        'input[data-dimension="' + key + '"]',
      )) {
        InputBox.of(input)?.value(shown);
        input.disabled = null === value;
      }
    };
    const dimensions = this._getCurrentDimensions(keepBoxes, fromEditors);
    const ratios = panel.querySelectorAll<HTMLElement>("[data-ratio]");
    if (dimensions) {
      for (const ratio of ratios) ratio.style.setProperty("display", "");
      show("x", dimensions.x);
      show("y", dimensions.y);
      show("w", dimensions.w);
      show("h", dimensions.h);
      show("rotate", dimensions.angle);
    } else {
      for (const ratio of ratios) ratio.style.setProperty("display", "none");
      show("x", null);
      show("y", null);
      show("w", null);
      show("h", null);
      show("rotate", 0);
    }
  }

  _updateToolbar(): void {
    const toolbar = this._toolbar as HTMLElement;
    const d = designer();
    for (const element of toolbar.querySelectorAll<HTMLButtonElement>("[data-action]"))
      element.disabled = !d.canExecuteAction(element.getAttribute("data-action") as string);
    for (const input of toolbar.querySelectorAll<HTMLInputElement>(".touchDistribute>input"))
      input.disabled = !d.canExecuteAction("arrange.distribute.horizontal");
    for (const button of toolbar.querySelectorAll<HTMLButtonElement>(".touchDistribute>button"))
      button.disabled = !d.canExecuteAction("arrange.distribute.horizontal");
  }

  _assignDimension(key: string, value: string): void {
    if (!this._document) return;
    let target: number | null = null;
    let current: number | null = null;
    let title = "";
    const dimensions = this._getCurrentDimensions(false, false);
    const scene = sceneOf(this._document);
    switch (key) {
      case "x":
      case "y":
        title = "Move";
        target = scene.stringToPoint(value);
        current = dimensions ? ("x" == key ? dimensions.x : dimensions.y) : null;
        break;
      case "w":
      case "h":
        title = text("GDimensionProperties", "action.change-size");
        target = scene.stringToPoint(value);
        current = dimensions ? ("w" == key ? dimensions.w : dimensions.h) : null;
        break;
      case "rotate":
        title = text("GCommonNames", "action.rotate");
        target = Length.parseEquationValue(value);
        current = dimensions ? dimensions.angle : null;
    }
    if (
      null === target ||
      "number" != typeof target ||
      (("w" == key || "h" == key) && target <= 0) ||
      target === current
    ) {
      this._updateDimensions();
      return;
    }
    let goal: number = target;
    if ("x" === key || "y" === key) {
      const delta = this._getDelta();
      switch (key) {
        case "x":
          goal += delta.getX();
          break;
        case "y":
          goal += delta.getY();
      }
    }
    const transformFor = (
      box: Rect,
      keepRatio: boolean,
      angle?: number | null,
    ): Transform | undefined => {
      if ("w" === key || "h" === key) {
        if (("w" === key && box.getWidth() <= 0) || ("h" === key && box.getHeight() <= 0))
          return new Transform();
        let scaleX = 1;
        let scaleY = 1;
        switch (key) {
          case "w":
            scaleX = goal / box.getWidth();
            if (keepRatio) scaleY = scaleX;
            break;
          case "h":
            scaleY = goal / box.getHeight();
            if (keepRatio) scaleX = scaleY;
        }
        return new Transform()
          .translated(-box.getX(), -box.getY())
          .scaled(scaleX, scaleY)
          .translated(box.getX(), box.getY());
      }
      if ("x" === key) return new Transform().translated(goal - box.getX(), 0);
      if ("y" === key) return new Transform().translated(0, goal - box.getY());
      if ("rotate" === key) {
        const center = box.getSide(Rect.Side.CENTER);
        angle = angle || 0;
        return new Transform()
          .translated(-center.getX(), -center.getY())
          .rotated(angle - GMath.toRadians(goal))
          .translated(center.getX(), center.getY());
      }
      return undefined;
    };
    const several = this._elements.length > 1;
    const ratios = (this._panel as HTMLElement).querySelector("[data-ratio]");
    const keepRatio = "yes" === (ratios ? ratios.getAttribute("data-ratio") : undefined);
    const editor = editorOf(this._document);
    editor.beginTransaction();
    try {
      const apply = (
        element: TransformElement | null,
        transform: Transform,
        linked: Node[],
        settings: { fullContentTransform: boolean } | null,
      ) => {
        element = linked.length && linked.indexOf(element as Node) >= 0 ? null : element;
        if (element) {
          const full =
            (element instanceof SymbolNode && ("x" === key || "y" === key)) ||
            "rotate" === key ||
            (settings && settings.fullContentTransform);
          const elementEditor = ElementEditor.openEditor(element) as unknown as EditorLike | null;
          if (elementEditor) {
            elementEditor._setTransform(transform);
            elementEditor.applyTransform(element, full, linked);
          } else element.transform(transform, full, linked);
        }
      };
      let linked: Node[] = [];
      for (let i = 0; i < this._elements.length; ++i) {
        const element = this._elements[i] as TransformElement;
        linked = linked.concat(linkedInSelection(editor, element, this._elements));
      }
      if (several) {
        if (this._elementsBBox) {
          const transform = transformFor(this._elementsBBox, keepRatio) as Transform;
          for (let i = 0; i < this._elements.length; ++i)
            apply(
              this._elements[i] as TransformElement,
              transform,
              linked,
              editor.getEdTransformSettings(),
            );
        }
      } else
        for (let i = 0; i < this._elements.length; ++i) {
          const element = this._elements[i] as TransformElement;
          const box = element.getGeometryBBox();
          if (box) {
            const transform = transformFor(
              box,
              keepRatio,
              "rotate" === key ? element.getAngle() : null,
            );
            if (transform && !transform.isIdentity())
              apply(element, transform, linked, editor.getEdTransformSettings());
          }
        }
    } finally {
      editor.commitTransaction(title);
    }
  }

  _showAnchor(): boolean {
    const elements = this._elements;
    let show = true;
    for (let i = 0; i < elements.length; ++i) {
      const parent = (elements[i] as TransformElement).getParent();
      if (!parent || !parent.hasMixin(Element.Layout)) {
        show = false;
        break;
      }
    }
    return show;
  }

  _getHorizontalAnchorValue(): AnchorValue {
    return this._anchorValue("hacr");
  }

  _getVerticalAnchorValue(): AnchorValue {
    return this._anchorValue("vacr");
  }

  private _anchorValue(property: "hacr" | "vacr"): AnchorValue {
    const elements = this._elements;
    const first = elements[0] as TransformElement;
    let value = (first.getProperty(property) ? first.getProperty(property) : 0) as AnchorValue;
    for (let i = 0; i < elements.length; ++i)
      if ((elements[i] as TransformElement).getProperty(property) !== value) {
        value = 0;
        break;
      }
    return value;
  }

  _defineAnchorButtonState(vertical: AnchorValue | null, horizontal: AnchorValue | null): void {
    const panel = this._panel as HTMLElement;
    const find = (selector: string) => panel.querySelectorAll(selector);
    const set = (prefix: string, value: AnchorValue) => {
      activeIf(find(`.${prefix}-middle`), value === AnchorType.Middle, false);
      activeIf(
        find(`.${prefix}-start`),
        value === AnchorType.Stretch || value === AnchorType.Start,
        false,
      );
      activeIf(
        find(`.${prefix}-end`),
        value === AnchorType.Stretch || value === AnchorType.End,
        false,
      );
      activeIf(find(`.${prefix}-middle`), false, value !== AnchorType.Middle);
      activeIf(
        find(`.${prefix}-start`),
        false,
        value !== AnchorType.Start && value !== AnchorType.Stretch,
      );
      activeIf(
        find(`.${prefix}-end`),
        false,
        value !== AnchorType.End && value !== AnchorType.Stretch,
      );
    };
    if (null !== vertical) set("vacr", vertical);
    if (null !== horizontal) set("hacr", horizontal);
  }

  _defineAnchorProperty(property: string, type: AnchorValue, current: AnchorValue): AnchorValue {
    let value: AnchorValue = type;
    if (type === current) value = 0;
    else if (type !== AnchorType.Middle) {
      if (current === AnchorType.Stretch)
        value = type === AnchorType.End ? AnchorType.Start : AnchorType.End;
      else if (current === AnchorType.Start)
        value = type === AnchorType.End ? AnchorType.Stretch : 0;
      else if (current === AnchorType.End)
        value = type === AnchorType.Start ? AnchorType.Stretch : 0;
    }
    this._assignAnchorProperty([property], [value]);
    return value;
  }

  _assignAnchorProperty(properties: string[], values: unknown[]): void {
    if (this._document) {
      const editor = editorOf(this._document);
      editor.beginTransaction();
      try {
        for (let i = 0; i < this._elements.length; ++i) {
          const element = this._elements[i] as TransformElement;
          if ((element.getParent() as Node).hasMixin(Element.Layout)) {
            const elementEditor = ElementEditor.getEditor<EditorLike>(element);
            if (!(elementEditor && elementEditor.applyPropertiesToParts(properties, values)))
              element.setProperties(properties, values);
          }
        }
      } finally {
        editor.commitTransaction(text("GDimensionProperties", "action.change-anchor"));
      }
    } else console.warn("GDimensionProperties: empty _document property");
  }

  _getDelta(): Point {
    return new Point(0, 0);
  }

  override toString(): string {
    return "[Object GDimensionProperties]";
  }
}
