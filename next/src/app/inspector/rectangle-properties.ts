// Old: designer.browser.dev.js module 1271 (GRectangleProperties).
/**
 * The "Corner" row of rectangles (and images, which are rectangles): a
 * radius slider and box for the uniform corner, and the advanced overlay
 * with the corner type, autoscale, uniform switch and the per-corner
 * smoothness, type and lock fields. Shown when every inspected element is
 * a rectangle.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Length } from "../../engine/math/length.ts";
import { Image } from "../../engine/scene/image.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { FullPixelsGuide } from "../../editor/guides/full-pixels-guide.ts";
import { Guides } from "../../editor/guides/guides.ts";
import { InputSlider } from "../color/opacity-slider.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { CornerTypePicker } from "../widgets/corner-type-select.ts";
import { InputBox } from "../widgets/input-box.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import type { Document } from "../document/document.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Editor } from "../../editor/editor.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { el, Properties, propertyRow, text, type InspectedElements } from "./properties.ts";

/** The scene and editor of the panel's document (set whenever the panel is shown). */
const sceneOf = (document: Document | null): Scene => (document as Document).getScene() as Scene;
const editorOf = (document: Document | null): Editor =>
  (document as Document).getEditor() as Editor;

const CORNERS = ["tl", "tr", "bl", "br"];
const SMOOTHNESS = ["tl_sx", "tl_sy", "tr_sx", "tr_sy", "bl_sx", "bl_sy", "br_sx", "br_sy"];

/** The decimals the radius fields show: none with full pixels on in px or pt, else the scene's. */
export function cornerDecimals(
  unit: unknown,
  guides: readonly string[] | null | undefined,
  optimal: () => number,
): number {
  return (unit == Length.Unit.PX || unit == Length.Unit.PT) &&
    guides &&
    guides.indexOf(FullPixelsGuide.ID) >= 0
    ? 0
    : optimal();
}

/** The slider position (percent) of a uniform radius: radius over half the shorter side. */
export function cornerPercent(radius: number, pointsMinDistance: number): number {
  return (radius / (pointsMinDistance / 2)) * 100;
}

/** jQuery's `.prop("disabled", v)`, also on elements without the property (an expando). */
function setDisabled(element: Element, value: boolean): void {
  (element as unknown as { disabled: boolean }).disabled = value;
}

export class RectangleProperties extends Properties {
  _panel: HTMLElement | null = null;
  _advancedPanel: HTMLElement | null = null;
  _advancedOverlay: Overlay | null = null;
  override _document: Document | null = null;
  _rectangles: Rectangle[] = [];

  override isGroup(): boolean {
    return true;
  }

  override init(panel: HTMLElement): void {
    this._panel = panel;
    const field = (property: string): HTMLElement => this._createField(property);
    const uniformSmoothness = text("GRectangleProperties", "text.uniform-corner-smoothness");
    const horizontalSmoothness = text("GRectangleProperties", "text.horizontal-corner-smoothness");
    const verticalSmoothness = text("GRectangleProperties", "text.vertical-corner-smoothness");
    const cornerType = text("GRectangleProperties", "text.corner-type");

    const advanced = el("div", "advanced-panel-wrapper");
    advanced.classList.add("rectangle-properties");
    this._advancedOverlay = new Overlay(advanced, {
      releaseOnClose: false,
      clazz: "advanced-overlay",
    });
    this._advancedPanel = advanced;

    const types = el("div");
    types.style.marginBottom = "10px";
    types.setAttribute("data-property", "corners-type");
    types.classList.add("corner-type");
    new CornerTypePicker(types, { notOverlay: true });
    types.addEventListener("cornertypechange", (event) => {
      this._assignCorners(undefined, (event as CustomEvent<string>).detail);
    });
    advanced.appendChild(types);

    const checkboxLabel = (property: string, table: string, key: string) => {
      const label = el("label", "g-checkbox-label");
      const caption = el("span");
      caption.textContent = text(table, key);
      label.append(field(property), caption);
      return label;
    };
    advanced.appendChild(checkboxLabel("csc", "GCommonNames", "text.autoscale-corners"));
    advanced.appendChild(checkboxLabel("uf", "GRectangleProperties", "text.uniform-corners"));

    // The corner type buttons get the smoothness title and the lock buttons
    // the corner type title, as before (see "Swapped corner titles" in QUESTIONS.md).
    const corners = el("div", "corners-panel");
    const row = (...items: [string, string][]) => {
      const element = el("div", "corners-item-row with-padding");
      for (const [property, title] of items) {
        const item = field(property);
        item.setAttribute("data-title", title);
        element.appendChild(item);
      }
      corners.appendChild(element);
    };
    row(
      ["tl_ct", uniformSmoothness],
      ["tl_sx", horizontalSmoothness],
      ["tr_sx", horizontalSmoothness],
      ["tr_ct", uniformSmoothness],
    );
    row(
      ["tl_sy", verticalSmoothness],
      ["tl_uf", cornerType],
      ["tr_uf", cornerType],
      ["tr_sy", verticalSmoothness],
    );
    row(
      ["bl_sy", verticalSmoothness],
      ["bl_uf", cornerType],
      ["br_uf", cornerType],
      ["br_sy", verticalSmoothness],
    );
    row(
      ["bl_ct", uniformSmoothness],
      ["bl_sx", horizontalSmoothness],
      ["br_sx", horizontalSmoothness],
      ["br_ct", uniformSmoothness],
    );
    advanced.appendChild(corners);

    const settings = el("div");
    settings.setAttribute("data-title", text("GCommonNames", "text.advanced-settings"));
    settings.className = "g-button g-icon g-advanced-setting";
    settings.style.display = "flex";
    settings.style.justifyContent = "center";
    const icon = el("span", "gravit-icon-settings");
    icon.style.alignSelf = "center";
    icon.style.lineHeight = "19px";
    settings.appendChild(icon);
    settings.addEventListener("click", (event) => this._openAdvanced(event));

    const cornerRow = propertyRow(el("div"), {
      label: text("GCommonNames", "text.corner"),
      columns: [
        {
          width: "auto",
          clazz: "corners-radius-slider-wrapper",
          content: field("corners-radius-slider"),
        },
        { clazz: "corners-radius-no-padding" },
        { clazz: "corners-radius-input-wrapper", content: field("corners-radius-input") },
        { width: "3px" },
        { clazz: "advanced-settings-col", content: settings },
      ],
    });
    cornerRow.classList.add("corner-radius");
    panel.appendChild(cornerRow);
  }

  _openAdvanced(event: MouseEvent): void {
    designer().stats("rectangleproperties_open_advanced");
    const advanced = this._advancedPanel as HTMLElement;
    (this._advancedOverlay as Overlay).open((event.target as HTMLElement).closest(".g-button"));
    const touch = designer().isTouchEnabled();
    for (const selector of [".uf-checkbox", ".csc-checkbox"])
      for (const box of advanced.querySelectorAll<HTMLInputElement>(selector))
        if (touch) mountCheckboxSlider(box);
        else unmountCheckboxSlider(box);
    // The old code looked the picker up in the whole page and read the first one.
    const first = document.querySelector('div[data-property="corners-type"]');
    const picker = first ? CornerTypePicker.of(first) : null;
    if (picker) picker.update(picker.value());
  }

  /** The field for a property (the old local `r`). */
  _createField(property: string): HTMLElement {
    if ("uf" === property) {
      const box = el("input", "uf-checkbox");
      box.setAttribute("type", "checkbox");
      box.setAttribute("data-property", property);
      box.addEventListener("change", () => {
        const checked = box.matches(":checked");
        designer().stats("rectangleproperties_toggle_uniform", checked ? "enabled" : "disabled");
        this._assignProperty(property, checked);
        this._updateProperties();
      });
      return box;
    }
    if ("csc" === property) {
      const box = el("input", "csc-checkbox");
      box.setAttribute("type", "checkbox");
      box.setAttribute("data-property", property);
      box.addEventListener("change", () => {
        const checked = box.matches(":checked");
        designer().stats(
          "rectangleproperties_toggle_scale-corners",
          checked ? "enabled" : "disabled",
        );
        this._assignProperty(property, checked);
      });
      return box;
    }
    if (SMOOTHNESS.includes(property)) {
      const input = el("input", "corner-input");
      if (property.endsWith("_sy")) input.classList.add("sy-input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats("rectangleproperties_scale_individual-corners");
        const value = sceneOf(this._document).stringToPoint(input.value);
        if (null !== value && "number" == typeof value && value >= 0)
          this._assignProperty(property, value);
        else this._updateProperties();
      });
      new InputBox(input);
      return input;
    }
    if (["tl_ct", "tr_ct", "bl_ct", "br_ct"].includes(property)) {
      let rotate = 0;
      let side = "right";
      if ("tl_ct" === property) {
        rotate = 270;
        side = "left";
      } else if ("bl_ct" === property) {
        rotate = 180;
        side = "left";
      } else if ("br_ct" === property) rotate = 90;
      const button = el("button", "g-flat");
      button.classList.add(side);
      button.setAttribute("data-property", property);
      button.style.width = "32px";
      new CornerTypePicker(button, { rotate });
      button.addEventListener("cornertypechange", (event) => {
        this._assignProperty(property, (event as CustomEvent<string>).detail);
      });
      return button;
    }
    if (["tl_uf", "tr_uf", "bl_uf", "br_uf"].includes(property)) {
      const side = "tl_uf" === property || "bl_uf" === property ? "uf-left" : "uf-right";
      const button = el("button", "g-flat");
      button.classList.add("uf-btn");
      button.classList.add(side);
      button.setAttribute("data-property", property);
      button.addEventListener("click", () => {
        designer().stats("rectangleproperties_toggle_individual-uniform-corners");
        this._assignProperty(property, !button.classList.contains("g-active"));
        this._updateProperties();
      });
      button.appendChild(el("span", "gravit-icon-lock"));
      return button;
    }
    if ("corners-radius-slider" === property) {
      const element = el("div");
      element.setAttribute("data-property", "corners-radius");
      const slider = new InputSlider(element, {
        min: 0,
        max: 100,
        richTooltipConfig: RichTooltipConfig.from({
          title: Locale.get(
            new LocaleKey("GCommonNames", "text.corner-radius-slider-tooltip-title"),
          ),
          description: Locale.get(
            new LocaleKey("GCommonNames", "text.corner-radius-slider-tooltip-description"),
          ),
          learnMore: "",
        }),
      });
      element.addEventListener("mousedown", () => {
        const editor = editorOf(this._document);
        editor.hideSelection();
        document.addEventListener("mouseup", () => editorOf(this._document).resetHideSelection(), {
          once: true,
        });
      });
      element.addEventListener("input", () => {
        const radius = this._assignCorners(parseInt(String(slider.value())) / 100, undefined, true);
        const scene = sceneOf(this._document);
        const decimals = cornerDecimals(scene.getProperty("ut"), Guides.options.guides, () =>
          scene.getOptimalDecimalsCount(),
        );
        for (const input of (this._panel as HTMLElement).querySelectorAll<HTMLInputElement>(
          '[type="text"][data-property="corners-radius"]',
        ))
          input.value = scene.pointToString(radius, decimals);
      });
      element.addEventListener("change", () => {
        designer().stats("rectangleproperties_input_corners-radius");
        this._assignCorners(parseInt(String(slider.value())) / 100, undefined, false);
      });
      return element;
    }
    if ("corners-radius-input" === property) {
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", "corners-radius");
      input.classList.add("corner-radius");
      input.addEventListener("change", () => {
        designer().stats("rectangleproperties_slide_corners-radius");
        const value = sceneOf(this._document).stringToPoint(
          (InputBox.of(input) as InputBox).value(),
        );
        if (null !== value && "number" == typeof value && value >= 0)
          this._assignProperties(["uf", "tl_sx"], [true, value]);
        else this._updateProperties();
      });
      new InputBox(input, { minValue: 0 });
      return input;
    }
    throw new Error("Unknown input property: " + property);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      // The old code removed both listeners without their target.
      sceneOf(this._document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
      );
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._rectangles = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Rectangle) this._rectangles.push(element);
      }
      if (this._rectangles.length && this._rectangles.length === list.length) {
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        this._updateProperties();
        return true;
      }
    }
    return false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._rectangles.length > 0 && this._rectangles[0] === event.node)
      this._updateProperties();
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateProperties();
  }

  _updateProperties(): void {
    const rectangle = this._rectangles[0] as Rectangle;
    const radius = rectangle.getProperty("tl_sx") as number;
    const bbox = rectangle.getGeometryBBox();
    const panel = this._panel as HTMLElement;
    const advanced = this._advancedPanel as HTMLElement;
    const sliders = [
      ...panel.querySelectorAll<HTMLElement>('.g-input-slider[data-property="corners-radius"]'),
    ];
    const inputs = [
      ...panel.querySelectorAll<HTMLInputElement>(
        'input[type="text"][data-property="corners-radius"]',
      ),
    ];
    const types = [...advanced.querySelectorAll<HTMLElement>('[data-property="corners-type"]')];
    const empty = null === bbox;
    for (const slider of sliders) setDisabled(slider, empty);
    for (const input of inputs) input.disabled = empty;
    for (const button of panel.querySelectorAll("button")) button.disabled = empty;
    if (empty) {
      for (const t of types) t.classList.add("g-disabled");
      return;
    }
    for (const t of types) t.classList.remove("g-disabled");
    const percent = cornerPercent(radius, rectangle.getPointsMinDistance());
    const scene = sceneOf(this._document);
    const decimals = cornerDecimals(scene.getProperty("ut"), Guides.options.guides, () =>
      scene.getOptimalDecimalsCount(),
    );
    for (const slider of sliders) InputSlider.of(slider)?.value(Math.round(percent));
    for (const input of inputs) InputBox.of(input)?.value(scene.pointToString(radius, decimals));
    for (const t of types) CornerTypePicker.of(t)?.value(rectangle.getProperty("tl_ct") as string);
    for (const box of advanced.querySelectorAll<HTMLInputElement>('input[data-property="csc"]')) {
      box.disabled = empty || rectangle instanceof Image;
      box.checked = !!rectangle.getProperty("csc");
    }
    const uniform = rectangle.getProperty("uf") as boolean;
    for (const box of advanced.querySelectorAll<HTMLInputElement>('input[data-property="uf"]'))
      box.checked = !!uniform;
    const panels = [...advanced.querySelectorAll<HTMLElement>(".corners-panel")];
    if (uniform) {
      for (const p of panels) p.style.setProperty("display", "none");
      return;
    }
    for (const p of panels) p.style.setProperty("display", "");
    for (const corner of CORNERS) {
      const find = <T extends Element>(selector: string) => [
        ...advanced.querySelectorAll<T>(selector),
      ];
      const locks = find<HTMLButtonElement>('button[data-property="' + corner + '_uf"]');
      const sx = find<HTMLInputElement>('input[data-property="' + corner + '_sx"]');
      const sy = find<HTMLInputElement>('input[data-property="' + corner + '_sy"]');
      const typeButtons = find<HTMLElement>('button[data-property="' + corner + '_ct"]');
      for (const input of sx)
        input.value = scene.pointToString(
          rectangle.getProperty(corner + "_sx") as number,
          decimals,
        );
      for (const input of sy)
        input.value = scene.pointToString(
          rectangle.getProperty(corner + "_sy") as number,
          decimals,
        );
      if (rectangle.getProperty(corner + "_uf")) {
        for (const lock of locks) lock.classList.add("g-active");
        for (const input of sy) input.disabled = true;
      } else {
        for (const lock of locks) lock.classList.remove("g-active");
        for (const input of sy) input.disabled = false;
      }
      for (const lock of locks) lock.disabled = !!uniform;
      for (const button of typeButtons)
        CornerTypePicker.of(button)?.value(rectangle.getProperty(corner + "_ct") as string);
    }
  }

  /**
   * Sets the uniform corner of every visible rectangle: `percent` of half
   * its shorter side and/or the type. A type on a rectangle without radius
   * gives it 25%. Returns the first rectangle's radius.
   */
  _assignCorners(
    percent: number | undefined,
    type: string | undefined,
    temporary?: boolean,
  ): number {
    if (!temporary) editorOf(this._document).beginTransaction();
    let first = 0;
    try {
      for (let a = 0; a < this._rectangles.length; ++a) {
        const rectangle = this._rectangles[a] as Rectangle;
        if (rectangle.isVisible()) {
          let radius = rectangle.getProperty("tl_sx") as number;
          let cornerType = rectangle.getProperty("tl_ct");
          if (0 === radius && "string" == typeof type && "number" != typeof percent) percent = 0.25;
          if ("number" == typeof percent) {
            rectangle.getGeometryBBox();
            radius = percent * (rectangle.getPointsMinDistance() / 2);
          }
          if ("string" == typeof type) cornerType = type;
          if (0 === a) first = radius;
          rectangle.setProperties(
            ["uf", "tl_sx", "tl_ct"],
            [true, radius, cornerType],
            false,
            false,
            temporary,
          );
        }
      }
    } finally {
      if (!temporary)
        editorOf(this._document).commitTransaction(text("GCommonNames", "action.change-corners"));
    }
    return first;
  }

  _assignProperty(property: string, value: unknown): void {
    this._assignProperties([property], [value]);
  }

  _assignProperties(properties: string[], values: unknown[]): void {
    const editor = editorOf(this._document);
    editor.beginTransaction();
    try {
      for (let i = 0; i < this._rectangles.length; ++i)
        (this._rectangles[i] as Rectangle).setProperties(properties, values);
    } finally {
      editor.commitTransaction(text("GRectangleProperties", "action.modify-rectangle-properties"));
    }
  }

  override toString(): string {
    return "[Object GRectangleProperties]";
  }
}
