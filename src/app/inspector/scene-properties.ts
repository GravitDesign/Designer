// Old: designer.browser.dev.js module 1659 (GSceneProperties).
/**
 * The "Document" panel: unit, color mode, dpi and the grid (off, boxed
 * with width and height, isometric with size and two angles). Shown with
 * the page panel when nothing is selected (one page inspected).
 *
 * Dropped with the cloud: the cloud sync rows (enable button, switch,
 * last modified date, the "welcome to the Gravit Cloud" link). The old
 * code added them only without CLOUD_SYNC_FEATURE.NEW_LAYOUT; the local
 * build had it set, so they were never there. The Pro gate of the color
 * mode select (isEnabledProFeatures, gPro badges) is gone with the licence.
 */
import { Color } from "../../engine/color/color.ts";
import { formatNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { AnnotationsList } from "../../engine/scene/annotations/annotations-list.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { InputBox } from "../widgets/input-box.ts";
import { InputSelect } from "../widgets/input-select.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { fillUnitSelect } from "../widgets/unit-select.ts";
import {
  editorOf,
  el,
  insertAfter,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

/** `$("<span>" + html + "</span>")`. */
function spanHtml(html: string): HTMLSpanElement {
  const span = el("span");
  span.innerHTML = html;
  return span;
}

/** `$("<span></span>").text(value)`. */
function spanText(value: string): HTMLSpanElement {
  const span = el("span");
  span.textContent = value;
  return span;
}

/**
 * The angle typed into "Angle 1" (0..89°) or "Angle 2" (-89..0°) of the
 * isometric grid, in degrees: normalized, folded into the half circle and
 * clamped as the old handler did.
 */
export function clampGridAngle(property: "ga1" | "ga2", degrees: number): number {
  let value = GMath.normalizeAngleDegrees(degrees);
  if ("ga1" == property) value = (value = value >= 180 ? value - 180 : value) >= 90 ? 89 : value;
  if ("ga2" == property)
    value =
      (value = (value = value > 0 ? value - 360 : value) <= -180 ? value + 180 : value) <= -90
        ? -89
        : value;
  return value;
}

export class SceneProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _scene: Scene | null = null;

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    panel.classList.add("scene-properties-panel");
    this._panel = panel;
    toolbar.classList.add("scene-properties-toolbar");
    const create = (property: string, tooltip: RichTooltipConfig | null = null): HTMLElement =>
      this._createInput(property, tooltip);
    const tip = (title: string, description: string | null, extra: object = {}) =>
      RichTooltipConfig.from({
        title: text("GSceneProperties", title),
        ...(description !== null ? { description: text("GSceneProperties", description) } : {}),
        ...extra,
      });
    const label = el("label");
    label.textContent = text("GCommonNames", "text.document");
    toolbar.appendChild(label);
    const row = (className: string): HTMLDivElement => {
      const element = el("div", className);
      panel.appendChild(element);
      return element;
    };
    propertyRow(row("unit-row"), {
      columns: [
        { clazz: "unit-title-column", content: spanHtml(text("GCommonNames", "text.unit")) },
        {
          clazz: "unit-selector-column",
          content: create(
            "ut",
            tip("text.unit-tooltip-title", "text.unit-tooltip-description", { middle: false }),
          ),
        },
      ],
    });
    panel.appendChild(el("hr"));
    propertyRow(row("color-mode-row"), {
      columns: [
        {
          clazz: "color-mode-title-column",
          content: spanText(text("GSceneProperties", "text.color-mode")),
        },
        {
          clazz: "color-mode-selector-column",
          content: create(
            "cm",
            tip("text.color-mode-tooltip-title", "text.color-mode-tooltip-description", {
              middle: false,
            }),
          ),
        },
      ],
    });
    panel.appendChild(el("hr"));
    propertyRow(row("dpi-row"), {
      columns: [
        { clazz: "dpi-title-column", content: spanText(text("GSceneProperties", "text.dpi")) },
        {
          clazz: "dpi-selector-column",
          content: create("dpi", tip("text.dpi-tooltip-title", null, { middle: false })),
        },
      ],
    });
    panel.appendChild(el("hr"));
    const gridTip = (description: string) =>
      tip("text.grid-tooltip-title", description, { learnMore: "" });
    propertyRow(row("grid-mode"), {
      columns: [
        { clazz: "grid-mode-title-column", content: spanHtml(text("GCommonNames", "text.grid")) },
        {
          clazz: "grid-mode-off-column",
          content: create("gm-", gridTip("text.grid-tooltip-description-off")),
        },
        {
          clazz: "grid-mode-box-column",
          content: create(
            "gm-" + Scene.GridMode.Boxed,
            gridTip("text.grid-tooltip-description-on"),
          ),
        },
        {
          clazz: "grid-mode-axo-column",
          content: create(
            "gm-" + Scene.GridMode.Axonometric,
            gridTip("text.grid-tooltip-description-isometric"),
          ),
        },
      ],
    });
    const boxed = row("grid-mode-type");
    boxed.setAttribute("data-grid-mode", Scene.GridMode.Boxed);
    propertyRow(boxed, {
      label: "",
      columns: [
        { width: "33.3%", label: text("GCommonNames", "text.width"), content: create("gx") },
        { width: "33.3%", label: text("GCommonNames", "text.height"), content: create("gy") },
      ],
    });
    const axonometric = row("grid-mode-type");
    axonometric.setAttribute("data-grid-mode", Scene.GridMode.Axonometric);
    propertyRow(axonometric, {
      label: "",
      columns: [
        { width: "33.3%", label: text("GCommonNames", "text.size"), content: create("gaw") },
        {
          width: "33.3%",
          label: text("GCommonNames", "text.angle") + " 1",
          content: create("ga1"),
        },
        {
          width: "33.3%",
          label: text("GCommonNames", "text.angle") + " 2",
          content: create("ga2"),
        },
      ],
    });
    panel.appendChild(el("hr"));
  }

  private _createInput(property: string, tooltip: RichTooltipConfig | null): HTMLElement {
    if ("dpi" === property) {
      const wrapper = el("div");
      const field = el("div");
      field.setAttribute("data-property", property);
      field.addEventListener("change", () => {
        const dpi = parseInt((InputSelect.of(field) as InputSelect).value()) || Length.DPI;
        designer().stats("sceneproperties_change_canvas-dpi", dpi);
        this._assignProperty(property, dpi, text("GSceneProperties", "action.change-canvas-dpi"));
      });
      new InputSelect(field, { list: [72, 96, 144, 300], minValue: 72, maxValue: 300 });
      wrapper.appendChild(field);
      attachRichTooltip(wrapper, tooltip);
      return wrapper;
    }
    if ("gx" === property || "gy" === property || "gaw" === property) {
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        if ("gx" === property)
          designer().stats("sceneproperties_change_rect-grid-settings", "width");
        else if ("gy" === property)
          designer().stats("sceneproperties_change_rect-grid-settings", "height");
        else designer().stats("sceneproperties_change_axono-grid-settings", "size");
        const value = sceneOf(this._document as Document).stringToPoint(
          (InputBox.of(input) as InputBox).value(),
        );
        if (null !== value && "number" == typeof value)
          this._assignProperty(
            property,
            value,
            text("GSceneProperties", "action.change-grid-settings"),
          );
        else this._updateProperties();
      });
      new InputBox(input);
      return input;
    }
    if ("ga1" === property || "ga2" === property) {
      const input = el("input");
      input.setAttribute("type", "text");
      input.setAttribute("data-property", property);
      input.addEventListener("change", () => {
        designer().stats(
          "sceneproperties_change_axono-grid-settings",
          "ga1" === property ? "angle1" : "angle2",
        );
        const value = parseFloat((InputBox.of(input) as InputBox).value());
        // Only a finite number. The old check (not null, a number) let NaN
        // through, which hid the grid and was saved as null (BUG-162).
        if (Number.isFinite(value))
          this._assignProperty(
            property,
            GMath.toRadians(clampGridAngle(property, value)),
            text("GSceneProperties", "action.change-grid-settings"),
          );
        else this._updateProperties();
      });
      new InputBox(input, { postfix: "°" });
      return input;
    }
    if (0 === property.indexOf("gm-")) {
      const mode = property.substr("gm-".length);
      let caption: string;
      switch (mode) {
        case Scene.GridMode.Boxed:
          caption = text("GSceneProperties", "text.on");
          break;
        case Scene.GridMode.Axonometric:
          caption = text("GSceneProperties", "text.isometric");
          break;
        default:
          caption = text("GSceneProperties", "text.off");
      }
      const label = el("label");
      const radio = el("input", "grid-mode-radio");
      radio.setAttribute("type", "radio");
      radio.setAttribute("data-property", property);
      radio.addEventListener("change", () => {
        designer().stats(
          "sceneproperties_change_grid-mode",
          "box" === mode ? "on" : "axo" === mode ? "isometric" : "off",
        );
        this._assignProperty(
          "gm",
          mode || null,
          text("GSceneProperties", "action.change-grid-settings"),
        );
        this._updateUI();
      });
      attachRichTooltip(radio, tooltip);
      label.appendChild(radio);
      label.appendChild(spanText(caption));
      return label;
    }
    if ("cm" === property) {
      const select = el("select");
      select.setAttribute("data-property", property);
      attachRichTooltip(select, tooltip);
      select.addEventListener("change", () => {
        const document = designer().getActiveDocument() as unknown as Document;
        const scene = sceneOf(document);
        const mode = select.value;
        designer().stats("sceneproperties_change_color-mode", mode);
        const children = (scene.getActivePage() as Page).getChildren() as Node[];
        if (!!children && children.find((child) => !(child instanceof AnnotationsList)))
          SystemDialog.alert(text("GSceneProperties", "text.reminder"));
        designer().setSetting("color_mode", mode);
        this._assignProperty(property, mode, text("GSceneProperties", "action.change-color-mode"));
        document.setColorModeElms(children);
      });
      return select;
    }
    if ("ut" === property) {
      const select = el("select");
      fillUnitSelect(select);
      select.setAttribute("data-property", property);
      attachRichTooltip(select, tooltip);
      select.addEventListener("change", () => {
        designer().stats("sceneproperties_change_canvas-unit", select.value);
        this._assignProperty(
          property,
          select.value,
          text("GSceneProperties", "action.change-canvas-unit"),
        );
      });
      return select;
    }
    throw new Error("Unknown input property: " + property);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      sceneOf(this._document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
        this,
      );
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._scene = null;
    if (!document) return false;
    const list = elements as InspectedElements;
    if (1 === list.length && list[0] instanceof Page)
      this._scene = (list[0] as Page).getScene() as Scene | null;
    if (!this._scene) return false;
    this._document = document;
    sceneOf(document).addEventListener(
      AfterPropertiesChangeEvent,
      this._afterPropertiesChange,
      this,
    );
    designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
    this._updateColorMode();
    this._updateProperties();
    this._updateUI();
    return true;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._scene === event.node) this._updateProperties();
  }

  /** The touch layout moves the color mode row below the dpi row and labels the dpi box. */
  _updateUI(): void {
    const panel = this._panel as HTMLElement;
    const colorMode = panel.querySelector<HTMLElement>(".color-mode-row");
    const dpi = panel.querySelector<HTMLElement>(".dpi-row");
    const unitTitles = panel.querySelectorAll(".unit-title-column span");
    if (designer().isTouchEnabled()) {
      const off = panel.querySelector<HTMLInputElement>('input[data-property="gm-"]');
      for (const grid of panel.querySelectorAll(".grid-mode")) {
        if (off && off.checked) grid.classList.remove("mode-on");
        else grid.classList.add("mode-on");
      }
      insertAfter(colorMode, dpi);
      const select = dpi ? dpi.querySelector(".dpi-selector-column .g-input-select") : null;
      if (select && !select.querySelector(".dpi-text")) {
        const label = el("span", "dpi-text");
        label.textContent = text("GSceneProperties", "text.dpi");
        insertAfter(label, select.querySelector("input"));
      }
      for (const span of unitTitles)
        span.textContent = text("GSceneProperties", "text.unit-tooltip-title");
    } else {
      if (dpi)
        for (const label of dpi.querySelectorAll(".dpi-selector-column .g-input-select .dpi-text"))
          label.remove();
      const before = dpi ? dpi.previousElementSibling : null;
      if (colorMode && before && before.parentNode)
        before.parentNode.insertBefore(colorMode, before);
      for (const grid of panel.querySelectorAll(".grid-mode")) grid.classList.remove("mode-on");
      for (const span of unitTitles) span.textContent = text("GCommonNames", "text.unit");
    }
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateProperties();
    else if ("touch" === event.key) this._updateUI();
  }

  _updateColorMode(): void {
    const selects = (this._panel as HTMLElement).querySelectorAll<HTMLSelectElement>(
      'select[data-property="cm"]',
    );
    for (const select of selects) {
      select.replaceChildren();
      for (const mode of [Color.ColorModes.RGB, Color.ColorModes.HSB, Color.ColorModes.CMYK]) {
        const option = el("option");
        option.setAttribute("value", mode);
        option.textContent = mode;
        select.appendChild(option);
      }
    }
  }

  _updateProperties(): void {
    const panel = this._panel as HTMLElement;
    const documentScene = sceneOf(this._document as Document);
    const scene = this._scene as Scene;
    const dpiFields = panel.querySelectorAll<HTMLElement>('[data-property="dpi"]');
    for (const field of dpiFields)
      InputSelect.of(field)?.value(scene.getProperty("dpi") || Length.DPI);
    const cdr = (this._document as Document).hasCDR();
    for (const field of dpiFields) {
      for (const input of field.querySelectorAll<HTMLInputElement>('[type="text"]'))
        input.disabled = cdr;
      for (const button of field.querySelectorAll<HTMLButtonElement>("button"))
        button.disabled = cdr;
      field.setAttribute(
        "data-title",
        cdr ? text("GCommonNames", "text.cant-change-cdr-limitations") : "",
      );
    }
    const colorMode = designer().getSetting("color_mode", Color.ColorModes.RGB) as string;
    if (colorMode) scene.setProperty("cm", colorMode);
    for (const select of panel.querySelectorAll<HTMLSelectElement>('select[data-property="cm"]'))
      select.value = colorMode;
    for (const select of panel.querySelectorAll<HTMLSelectElement>('select[data-property="ut"]'))
      select.value = scene.getProperty("ut") as string;
    const point = (property: string): void => {
      for (const input of panel.querySelectorAll<HTMLInputElement>(
        'input[data-property="' + property + '"]',
      ))
        InputBox.of(input)?.value(
          documentScene.pointToString(
            scene.getProperty(property) as number,
            scene.getOptimalDecimalsCount(),
          ),
        );
    };
    point("gx");
    point("gy");
    point("gaw");
    const angle = (property: string): void => {
      for (const input of panel.querySelectorAll<HTMLInputElement>(
        '[type="text"][data-property="' + property + '"]',
      ))
        InputBox.of(input)?.value(
          formatNumber(GMath.toDegrees(scene.getProperty(property) as number), 1),
        );
    };
    angle("ga1");
    angle("ga2");
    const gridMode = scene.getProperty("gm") as string | null;
    for (const radio of panel.querySelectorAll<HTMLInputElement>('[data-property^="gm"]')) {
      const mode = (radio.getAttribute("data-property") as string).substr("gm-".length);
      radio.checked = (!mode && !gridMode) || mode === gridMode;
    }
    for (const row of panel.querySelectorAll<HTMLElement>("[data-grid-mode]")) {
      const mode = row.getAttribute("data-grid-mode");
      row.style.setProperty("display", (!mode && !gridMode) || mode === gridMode ? "" : "none");
    }
  }

  _assignProperty(property: string, value: unknown, name?: string): void {
    this._assignProperties([property], [value], name);
  }

  _assignProperties(properties: string[], values: unknown[], name?: string): void {
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      (this._scene as Scene).setProperties(properties, values);
    } finally {
      editor.commitTransaction(name);
    }
  }

  override toString(): string {
    return "[Object GSceneProperties]";
  }
}
