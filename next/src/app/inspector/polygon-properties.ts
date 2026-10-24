// Old: designer.browser.dev.js module 1270 (GPolygonProperties).
/**
 * Polygons and stars: the number of points, the inner size (stars), the
 * corner radius, and an advanced overlay with the corner type, plain
 * edges, autoscale corners and the outer/inner corners, radii and angles.
 * Shown when every inspected element is a polygon.
 */
import { formatNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { InputSlider } from "../color/opacity-slider.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { mountCheckboxSlider, unmountCheckboxSlider } from "../widgets/checkbox-slider.ts";
import { CornerTypePicker } from "../widgets/corner-type-select.ts";
import { InputBox, type InputBoxOptions } from "../widgets/input-box.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import type { Editor } from "../../editor/editor.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { el, Properties, propertyRow, text, type InspectedElements } from "./properties.ts";

/** The document's editor and scene (both exist while a panel shows the document). */
function editorOf(document: Document | null): Editor {
  return (document as Document).getEditor() as Editor;
}

function sceneOf(document: Document | null): Scene {
  return (document as Document).getScene() as Scene;
}

/** The scene calls of the panel. */
interface PanelScene {
  stringToPoint(text: string): number | null;
  pointToString(value: number, decimals?: number): string;
  getOptimalDecimalsCount(): number;
}

/** The new inner point angle and, with plain edges, inner radius for `points` points. */
export function pointsValues(
  points: number,
  outerAngle: number,
  outerRadius: number,
  plainEdges: boolean,
): { names: string[]; values: number[] } {
  const r = Math.PI / points;
  const s = GMath.normalizeAngleRadians(outerAngle + r);
  if (plainEdges) {
    const l = outerRadius * Math.cos(r);
    return { names: ["pts", "ia", "ir"], values: [points, s, l] };
  }
  return { names: ["pts", "ia"], values: [points, s] };
}

/** The corner radius slider's percentage for the outer corner radius. */
export function cornerRadiusPercent(
  outerCornerRadius: number,
  minDistance: number,
  plainEdges: boolean,
): number {
  let c = minDistance;
  if (!plainEdges) c /= 2;
  const l = Math.min(outerCornerRadius, c);
  return c > 0 ? (l / c) * 100 : 0;
}

/** jQuery's `.val(v)` on every match. */
function setValues(root: Element, selector: string, value: string): void {
  for (const input of root.querySelectorAll<HTMLInputElement>(selector)) input.value = value;
}

export class PolygonProperties extends Properties {
  _panel: HTMLElement | null = null;
  _advancedPanel: HTMLElement | null = null;
  _advancedOverlay: Overlay | null = null;
  override _document: Document | null = null;
  _polygons: Polygon[] = [];

  private _scene(): PanelScene {
    return (this._document as Document).getScene() as unknown as PanelScene;
  }

  override init(panel: HTMLElement): void {
    this._panel = panel;
    const sliderTooltip = () =>
      RichTooltipConfig.from({
        title: text("GCommonNames", "text.corner-radius-slider-tooltip-title"),
        description: text("GCommonNames", "text.corner-radius-slider-tooltip-description"),
      });
    const inputBox = (input: HTMLInputElement, options?: InputBoxOptions) => {
      new InputBox(input, options);
      return input;
    };
    const control = (property: string): HTMLElement => {
      if ("ir" === property || "or" === property) {
        const input = el("input", "radius-input-" + property);
        input.setAttribute("type", "text");
        input.setAttribute("data-property", property);
        input.addEventListener("change", () => {
          designer().stats("polygonproperties_change_radius");
          const value = this._scene().stringToPoint(input.value);
          if (null !== value && "number" == typeof value && value >= 0)
            this._assignProperty(
              property,
              value,
              text("GPolygonProperties", "action.change-radius"),
            );
          else this._updateProperties();
        });
        return inputBox(input);
      }
      if ("ia" === property || "oa" === property) {
        const input = el("input", "angle-input-" + property);
        input.setAttribute("type", "text");
        input.setAttribute("data-property", property);
        input.addEventListener("change", () => {
          designer().stats("polygonproperties_change_angle");
          let value = Length.parseEquationValue(input.value);
          if (null !== value) {
            value = GMath.normalizeAngleRadians(GMath.toRadians(value));
            this._assignProperty(
              property,
              GMath.PI2 - value,
              text("GPolygonProperties", "action.change-angle"),
            );
          } else this._updateProperties();
        });
        return inputBox(input, { fixedIncrement: true });
      }
      if ("ict" === property || "oct" === property) {
        const button = el("button", "g-flat");
        button.setAttribute("data-property", property);
        new CornerTypePicker(button);
        button.addEventListener("cornertypechange", (event) => {
          this._assignProperty(
            property,
            (event as CustomEvent<string>).detail,
            text("GPolygonProperties", "action.change-corner-type"),
          );
        });
        return button;
      }
      if ("icr" === property || "ocr" === property) {
        const input = el("input");
        input.setAttribute("type", "text");
        input.setAttribute("data-property", property);
        input.addEventListener("change", () => {
          designer().stats("polygonproperties_change_corner-radius");
          const value = this._scene().stringToPoint(input.value);
          if (null !== value && "number" == typeof value && value >= 0)
            this._assignProperty(
              property,
              value < 0 ? 0 : value,
              text("GPolygonProperties", "action.change-corner-radius"),
            );
          else this._updateProperties();
        });
        return inputBox(input);
      }
      if ("corners-radius-slider" === property) {
        const slider = el("div");
        slider.setAttribute("data-property", "corners-radius-slider");
        const handle = new InputSlider(slider, {
          min: 0,
          max: 100,
          richTooltipConfig: sliderTooltip(),
        });
        slider.addEventListener("mousedown", () => {
          const editor = editorOf(this._document);
          editor.hideSelection();
          document.addEventListener(
            "mouseup",
            () => editorOf(this._document).resetHideSelection(),
            { once: true },
          );
        });
        slider.addEventListener("input", () => {
          const radius = this._assignCornersRadius(parseInt(String(handle.value())) / 100, true);
          const scene = this._scene();
          setValues(
            this._panel as HTMLElement,
            '[data-property="corners-radius"]',
            scene.pointToString(radius, scene.getOptimalDecimalsCount()),
          );
        });
        slider.addEventListener("change", () => {
          designer().stats("polygonproperties_change_radius");
          this._assignCornersRadius(parseInt(String(handle.value())) / 100, false);
        });
        return slider;
      }
      if ("corners-radius-input" === property) {
        const input = el("input");
        input.setAttribute("type", "text");
        input.setAttribute("data-property", "corners-radius");
        input.classList.add("corner-radius");
        input.addEventListener("change", () => {
          designer().stats("polygonproperties_change_corners-radius");
          const value = this._scene().stringToPoint((InputBox.of(input) as InputBox).value());
          if (null !== value && "number" == typeof value && value >= 0)
            this._assignCornersRadius(value, false, true);
          else this._updateProperties();
        });
        return inputBox(input, { minValue: 0, incrementValue: 1 });
      }
      throw new Error("Unknown input property: " + property);
    };

    // Points
    const pointsSlider = el("div");
    pointsSlider.setAttribute("data-property", "pts");
    const pointsHandle = new InputSlider(pointsSlider, { min: 3, max: 25 });
    pointsSlider.addEventListener("input", () => {
      const value = pointsHandle.value();
      this._assignPoints(parseInt(String(value)), true);
      setValues(
        this._panel as HTMLElement,
        'input[type="text"][data-property="pts"]',
        String(value),
      );
    });
    pointsSlider.addEventListener("change", () => {
      designer().stats("polygonproperties_change_number-of-points");
      this._assignPoints(parseInt(String(pointsHandle.value())), false);
    });
    const pointsInput = el("input");
    pointsInput.setAttribute("type", "text");
    pointsInput.setAttribute("data-property", "pts");
    pointsInput.addEventListener("change", () => {
      designer().stats("polygonproperties_change_number-of-points");
      this._assignPoints(
        Length.parseEquationValue((InputBox.of(pointsInput) as InputBox).value()) as number,
        false,
      );
    });
    inputBox(pointsInput, { minValue: 3 });
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GPolygonProperties", "text.points"),
        columns: [
          { width: "auto", clazz: "point-slider-wrapper", content: pointsSlider },
          { width: "40px", content: pointsInput },
        ],
      }),
    );

    // Size
    const sizeSlider = el("div");
    sizeSlider.setAttribute("data-property", "size");
    const sizeHandle = new InputSlider(sizeSlider, { min: 0, max: 100 });
    sizeSlider.addEventListener("input", () => {
      const value = parseInt(String(sizeHandle.value()));
      this._assignSize(value / 100, true);
      for (const input of (this._panel as HTMLElement).querySelectorAll<HTMLInputElement>(
        '[type="text"][data-property="size"]',
      ))
        InputBox.of(input)?.value(formatNumber(value, 0));
    });
    sizeSlider.addEventListener("change", () => {
      designer().stats("polygonproperties_change_plain-edges");
      this._assignSize(parseInt(String(sizeHandle.value())) / 100, false);
    });
    const sizeInput = el("input");
    sizeInput.setAttribute("type", "text");
    sizeInput.setAttribute("data-property", "size");
    sizeInput.addEventListener("change", () => {
      designer().stats("polygonproperties_change_plain-edges");
      this._assignSize(
        (Length.parseEquationValue((InputBox.of(sizeInput) as InputBox).value()) as number) / 100,
        false,
      );
    });
    inputBox(sizeInput, { minValue: 0, maxValue: 100, postfix: "%" });
    const sizeRow = el("div");
    sizeRow.setAttribute("data-plain-edges", "false");
    panel.appendChild(
      propertyRow(sizeRow, {
        label: text("GCommonNames", "text.size"),
        columns: [
          { width: "auto", clazz: "size-slider-wrapper", content: sizeSlider },
          { width: "40px", content: sizeInput },
        ],
      }),
    );
    panel.appendChild(el("hr"));

    // Corner
    const advanced = el("div");
    advanced.setAttribute("data-title", text("GCommonNames", "text.advanced-settings"));
    advanced.classList.add("g-button", "g-icon", "g-advanced-setting");
    advanced.style.display = "flex";
    advanced.style.justifyContent = "center";
    const gear = el("span", "gravit-icon-settings");
    gear.style.alignSelf = "center";
    gear.style.lineHeight = "19px";
    advanced.appendChild(gear);
    advanced.addEventListener("click", (event) => {
      designer().stats("polygonproperties_click_advanced-corners");
      const advancedPanel = this._advancedPanel as HTMLElement;
      (this._advancedOverlay as Overlay).open(
        (event.target as HTMLElement).closest(".g-button") as HTMLElement,
      );
      const touch = designer().isTouchEnabled();
      for (const selector of [".edges-checkbox", ".csc-checkbox"])
        for (const box of advancedPanel.querySelectorAll<HTMLInputElement>(selector))
          if (touch) mountCheckboxSlider(box);
          else unmountCheckboxSlider(box);
      // The old code queried the whole page.
      const first = document.querySelector('div[data-property="corners-type"]');
      const picker = first ? CornerTypePicker.of(first) : null;
      if (picker) picker.update(picker.value());
    });
    const cornerRow = el("div");
    propertyRow(cornerRow, {
      label: text("GCommonNames", "text.corner"),
      columns: [
        {
          width: "auto",
          clazz: "corners-radius-slider-wrapper",
          content: control("corners-radius-slider"),
        },
        { clazz: "corners-radius-no-padding" },
        { clazz: "corners-radius-input-wrapper", content: control("corners-radius-input") },
        { width: "3px" },
        { clazz: "advanced-settings-col", content: advanced },
      ],
    });
    cornerRow.classList.add("corner-radius");
    panel.appendChild(cornerRow);

    // The advanced overlay
    const advancedPanel = el("div", "advanced-panel-wrapper");
    this._advancedPanel = advancedPanel;
    this._advancedOverlay = new Overlay(advancedPanel, {
      releaseOnClose: false,
      clazz: "advanced-overlay",
    });
    const cornersType = el("div");
    cornersType.style.marginBottom = "10px";
    cornersType.setAttribute("data-property", "corners-type");
    cornersType.classList.add("corner-type");
    new CornerTypePicker(cornersType, { notOverlay: true });
    cornersType.addEventListener("cornertypechange", (event) => {
      const type = (event as CustomEvent<string>).detail;
      this._assignProperties(
        ["ict", "oct"],
        [type, type],
        text("GPolygonProperties", "action.change-corner-type"),
      );
    });
    advancedPanel.appendChild(
      propertyRow(el("div"), { columns: [{ width: "100%", content: cornersType }] }),
    );
    const checkbox = (
      boxClass: string,
      property: string,
      caption: string,
      onChange: (checked: boolean) => void,
    ) => {
      const box = el("input", boxClass);
      box.setAttribute("type", "checkbox");
      box.setAttribute("data-property", property);
      box.addEventListener("change", () => onChange(box.matches(":checked")));
      const span = el("span");
      span.innerHTML = caption;
      const label = el("label", "g-checkbox-label");
      label.append(box, span);
      return propertyRow(el("div", "g-checkbox-label-wrapper"), {
        columns: [{ width: "100%", content: label }],
      });
    };
    advancedPanel.appendChild(
      checkbox(
        "edges-checkbox",
        "edges",
        text("GPolygonProperties", "text.plain-edges"),
        (checked) => {
          designer().stats(
            "polygonproperties_toggle_plain-edges",
            checked ? "enabled" : "disabled",
          );
          this._assignEdges(checked);
          this._updateProperties();
        },
      ),
    );
    advancedPanel.appendChild(
      checkbox("csc-checkbox", "csc", text("GCommonNames", "text.autoscale-corners"), (checked) => {
        designer().stats(
          "polygonproperties_toggle_autoscale-corners",
          checked ? "enabled" : "disabled",
        );
        this._assignProperty("csc", checked);
      }),
    );
    const wrapper = (...children: HTMLElement[]) => {
      const element = el("div", "corner-wrapper");
      element.append(...children);
      return element;
    };
    advancedPanel.appendChild(
      propertyRow(el("div", "corner-row-wrapper"), {
        label: text("GPolygonProperties", "text.corners"),
        columns: [
          {
            width: "50%",
            content: wrapper(control("ocr"), control("oct")),
            label: text("GCommonNames", "text.outside"),
          },
          {
            width: "50%",
            content: wrapper(control("icr"), control("ict")),
            label: text("GCommonNames", "text.inside"),
          },
        ],
      }),
    );
    advancedPanel.appendChild(
      propertyRow(el("div", "radius-row-wrapper"), {
        label: text("GCommonNames", "text.radius"),
        columns: [
          { width: "50%", content: control("or"), label: text("GCommonNames", "text.outside") },
          { width: "50%", content: control("ir"), label: text("GCommonNames", "text.inside") },
        ],
      }),
    );
    advancedPanel.appendChild(
      propertyRow(el("div", "angles-row-wrapper"), {
        label: text("GCommonNames", "text.angles"),
        columns: [
          { width: "50%", content: control("oa"), label: text("GCommonNames", "text.outside") },
          { width: "50%", content: control("ia"), label: text("GCommonNames", "text.inside") },
        ],
      }),
    );
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
    this._polygons = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Polygon) this._polygons.push(element);
      }
      if (this._polygons.length && this._polygons.length === list.length) {
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        this._updateProperties(true);
        return true;
      }
    }
    return false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._polygons.length > 0 && this._polygons[0] === event.node)
      this._updateProperties();
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateProperties();
  }

  _updateProperties(initial?: boolean): void {
    const polygon = this._polygons[0] as Polygon;
    const panel = this._panel as HTMLElement;
    const advanced = this._advancedPanel as HTMLElement;
    const scene = this._scene();
    const decimals = () => scene.getOptimalDecimalsCount();
    const point = (name: string) =>
      scene.pointToString(polygon.getProperty(name) as number, decimals());
    const outerRadius = polygon.getProperty("or") as number;
    const innerRadius = polygon.getProperty("ir") as number;
    const points = polygon.getProperty("pts");
    const size = (innerRadius / outerRadius) * 100;
    const plainEdges = polygon.isPlainEdges();
    const outerCornerRadius = polygon.getProperty("ocr") as number;
    const slider = (root: Element, selector: string, value: unknown) => {
      for (const element of root.querySelectorAll(selector)) InputSlider.of(element)?.value(value);
    };
    const box = (root: Element, selector: string, value: unknown) => {
      for (const element of root.querySelectorAll(selector)) InputBox.of(element)?.value(value);
    };
    const picker = (root: Element, selector: string, value: unknown) => {
      for (const element of root.querySelectorAll(selector))
        CornerTypePicker.of(element)?.value(value as string | null);
    };
    slider(panel, '.g-input-slider[data-property="pts"]', points);
    box(panel, '[type="text"][data-property="pts"]', points);
    slider(panel, '.g-input-slider[data-property="size"]', Math.round(size));
    box(panel, '[type="text"][data-property="size"]', formatNumber(size, 0));
    picker(advanced, '[data-property="corners-type"]', polygon.getProperty("oct"));
    const percent = cornerRadiusPercent(
      outerCornerRadius,
      polygon.getPointsMinDistance(),
      plainEdges,
    );
    slider(panel, '[data-property="corners-radius-slider"]', Math.round(percent));
    setValues(panel, '[data-property="corners-radius"]', point("ocr"));
    const edges = [...advanced.querySelectorAll<HTMLInputElement>('input[data-property="edges"]')];
    if (initial && plainEdges) for (const e of edges) e.checked = true;
    else if (!plainEdges) for (const e of edges) e.checked = false;
    for (const e of advanced.querySelectorAll<HTMLInputElement>('input[data-property="csc"]'))
      e.checked = !!polygon.getProperty("csc");
    picker(advanced, 'button[data-property="oct"]', polygon.getProperty("oct"));
    picker(advanced, 'button[data-property="ict"]', polygon.getProperty("ict"));
    setValues(advanced, 'input[data-property="ocr"]', point("ocr"));
    setValues(advanced, 'input[data-property="icr"]', point("icr"));
    setValues(advanced, 'input[data-property="or"]', point("or"));
    setValues(advanced, 'input[data-property="ir"]', point("ir"));
    setValues(
      advanced,
      'input[data-property="oa"]',
      formatNumber(GMath.toDegrees(GMath.PI2 - (polygon.getProperty("oa") as number)), 2),
    );
    setValues(
      advanced,
      'input[data-property="ia"]',
      formatNumber(GMath.toDegrees(GMath.PI2 - (polygon.getProperty("ia") as number)), 2),
    );
    const edgesChecked = !!edges[0] && edges[0].checked;
    for (const row of panel.querySelectorAll<HTMLElement>('[data-plain-edges="false"]'))
      row.style.setProperty("display", edgesChecked ? "none" : "");
  }

  _assignCornersRadius(value: number, temporary: boolean, absolute?: boolean): number {
    const editor = editorOf(this._document);
    if (!temporary) editor.beginTransaction();
    let first = 0;
    try {
      for (let a = 0; a < this._polygons.length; ++a) {
        const polygon = this._polygons[a] as Polygon;
        if (polygon.isVisible()) {
          let radius = value;
          if (!absolute) radius = value * polygon.getPointsMinDistance();
          if (polygon.isPlainEdges())
            polygon.setProperties(["ocr"], [radius], false, false, temporary);
          else {
            if (!absolute) radius /= 2;
            polygon.setProperties(["ocr", "icr"], [radius, radius], false, false, temporary);
          }
          if (0 === a) first = radius;
        }
      }
    } finally {
      if (!temporary) editor.commitTransaction(text("GCommonNames", "action.change-corners"));
    }
    return first;
  }

  _assignProperty(property: string, value: unknown, title?: string): void {
    this._assignProperties([property], [value], title);
  }

  _assignProperties(properties: string[], values: unknown[], title?: string): void {
    const editor = editorOf(this._document);
    editor.beginTransaction();
    try {
      for (let i = 0; i < this._polygons.length; ++i)
        (this._polygons[i] as Polygon).setProperties(properties, values);
    } finally {
      editor.commitTransaction(title);
    }
  }

  _assignSize(factor: number, temporary: boolean): void {
    const editor = editorOf(this._document);
    if (!temporary) editor.beginTransaction();
    try {
      for (let n = 0; n < this._polygons.length; ++n) {
        const polygon = this._polygons[n] as Polygon;
        const inner = (polygon.getProperty("or") as number) * factor;
        polygon.setProperty("ir", inner, false, false, temporary);
      }
    } finally {
      if (!temporary)
        editor.commitTransaction(text("GPolygonProperties", "action.change-polygon-size"));
    }
  }

  _assignPoints(points: number, temporary: boolean): void {
    const editor = editorOf(this._document);
    if (!temporary) editor.beginTransaction();
    try {
      for (let n = 0; n < this._polygons.length; ++n) {
        const polygon = this._polygons[n] as Polygon;
        const { names, values } = pointsValues(
          points,
          polygon.getProperty("oa") as number,
          polygon.getProperty("or") as number,
          polygon.isPlainEdges(),
        );
        polygon.setProperties(names, values, false, false, temporary);
      }
    } finally {
      if (!temporary)
        editor.commitTransaction(text("GPolygonProperties", "action.change-polygon-points"));
    }
  }

  _assignEdges(plainEdges: boolean, temporary?: boolean): void {
    if (!plainEdges) return;
    const editor = editorOf(this._document);
    if (!temporary) editor.beginTransaction();
    try {
      for (let n = 0; n < this._polygons.length; ++n) {
        const polygon = this._polygons[n] as Polygon;
        const outerRadius = polygon.getProperty("or") as number;
        const points = polygon.getProperty("pts") as number;
        const outerAngle = polygon.getProperty("oa") as number;
        const l = Math.PI / points;
        const c = outerAngle + l;
        const d = outerRadius * Math.cos(l);
        polygon.setProperties(["ir", "ia"], [d, c], false, false, temporary);
      }
    } finally {
      if (!temporary)
        editor.commitTransaction(text("GPolygonProperties", "action.change-polygon-size"));
    }
  }

  override toString(): string {
    return "[Object GPolygonProperties]";
  }
}
