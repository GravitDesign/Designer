// Old: designer.browser.dev.js module 1265 (GEllipseProperties).
/**
 * Start and end angle and the arc / chord / pie type of ellipses. Shown
 * when every inspected element is an ellipse. Angles are shown in
 * degrees counter-clockwise (2π minus the stored radians).
 */
import { formatNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { BorderAlignment } from "../../engine/style/stylable-sets.ts";
import { InputBox } from "../widgets/input-box.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

/** Degrees as the angle boxes show them: counter-clockwise, two decimals. */
export function angleText(radians: number): string {
  return formatNumber(GMath.toDegrees(GMath.PI2 - radians), 2);
}

/** The stored angle for typed degrees: 2π minus the normalised radians. */
export function angleValue(degrees: number): number {
  const radians = GMath.normalizeAngleRadians(GMath.toRadians(degrees));
  return GMath.PI2 - radians;
}

export class EllipseProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _ellipses: Ellipse[] = [];

  override init(panel: HTMLElement): void {
    this._panel = panel;
    const control = (property: string): HTMLElement => {
      if (0 === property.indexOf("etp-")) {
        let icon: string;
        const type = parseInt(property.substr("etp-".length));
        switch (type) {
          case Ellipse.Type.Pie:
            icon = "gravit-icon-circle-pie";
            break;
          case Ellipse.Type.Chord:
            icon = "gravit-icon-ellipse-chord";
            break;
          case Ellipse.Type.Arc:
            icon = "gravit-icon-ellipse-arc";
            break;
          default:
            throw new Error("");
        }
        const button = el("div");
        button.setAttribute("data-property", property);
        button.classList.add("g-button", "g-icon");
        button.addEventListener("click", () => {
          designer().stats("ellipse_change_type", type);
          this._assignProperty("etp", type, text("GEllipseProperties", "action.change-shape"));
          if (type === Ellipse.Type.Arc) this._setBorderAlignmentCenter();
        });
        button.appendChild(el("span", icon));
        return button;
      }
      if ("sa" === property || "ea" === property) {
        const input = el("input");
        input.setAttribute("type", "text");
        input.setAttribute("data-property", property);
        input.addEventListener("change", () => {
          designer().stats("ellipse_change_angle");
          const value = Length.parseEquationValue((InputBox.of(input) as InputBox).value());
          if (null !== value)
            this._assignProperty(
              property,
              angleValue(value),
              text("GEllipseProperties", "action.change-angle"),
            );
          else this._updateProperties();
        });
        new InputBox(input);
        return input;
      }
      throw new Error("Unknown input property: " + property);
    };
    const angles = el("div", "ellipse-angles-property");
    propertyRow(angles, {
      label: text("GCommonNames", "text.angles"),
      columns: [
        { width: "50%", content: control("sa") },
        { width: "50%", content: control("ea") },
      ],
    });
    panel.appendChild(angles);
    const shape = el("div", "ellipse-shape-property");
    propertyRow(shape, {
      label: text("GEllipseProperties", "text.shape"),
      columns: [
        {
          width: "33.3%",
          clazz: "shape-type-chooser shape-arc",
          label: text("GEllipse", "type.arc"),
          content: control("etp-" + Ellipse.Type.Arc),
        },
        {
          width: "33.3%",
          clazz: "shape-type-chooser shape-chord",
          label: text("GEllipse", "type.chord"),
          content: control("etp-" + Ellipse.Type.Chord),
        },
        {
          width: "33.3%",
          clazz: "shape-type-chooser shape-pie",
          label: text("GEllipse", "type.pie"),
          content: control("etp-" + Ellipse.Type.Pie),
        },
      ],
    });
    panel.appendChild(shape);
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      // The old code removed the scene listener without its target.
      sceneOf(this._document as Document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
      );
      this._document = null;
    }
    this._ellipses = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i];
        if (element instanceof Ellipse) this._ellipses.push(element);
      }
      if (this._ellipses.length && this._ellipses.length === list.length) {
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        this._updateProperties();
        return true;
      }
    }
    return false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._ellipses.length > 0 && this._ellipses[0] === event.node)
      this._updateProperties();
  }

  _setBorderAlignmentCenter(): void {
    const names = ["_ba"];
    const values = [BorderAlignment.Center];
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      for (let r = 0, s = this._ellipses.length; r < s; ++r) {
        const layers = (
          (this._ellipses[r] as Ellipse).getPaintLayers() as PaintLayers
        ).getBorderLayers();
        for (let l = 0, c = layers.length; l < c; l++) {
          const layer = layers[l];
          if (layer instanceof BorderPaintLayer) layer.setProperties(names, values);
        }
      }
    } finally {
      editor.commitTransaction(text("GEllipseProperties", "text.ellipse-to-center"));
    }
  }

  _updateProperties(): void {
    const ellipse = this._ellipses[0] as Ellipse;
    const panel = this._panel as HTMLElement;
    for (const button of panel.querySelectorAll<HTMLElement>('[data-property^="etp"]')) {
      const type = (button.getAttribute("data-property") as string).substr("etp-".length);
      button.classList.toggle(
        "g-active",
        (ellipse.getProperty("etp") as number).toString() === type,
      );
    }
    for (const input of panel.querySelectorAll<HTMLInputElement>('input[data-property="sa"]'))
      input.value = angleText(ellipse.getProperty("sa") as number);
    for (const input of panel.querySelectorAll<HTMLInputElement>('input[data-property="ea"]'))
      input.value = angleText(ellipse.getProperty("ea") as number);
  }

  _assignProperty(property: string, value: unknown, title: string): void {
    this._assignProperties([property], [value], title);
  }

  _assignProperties(properties: string[], values: unknown[], title: string): void {
    const editor = editorOf(this._document as Document);
    editor.beginTransaction();
    try {
      for (let i = 0; i < this._ellipses.length; ++i)
        (this._ellipses[i] as Ellipse).setProperties(properties, values);
    } finally {
      editor.commitTransaction(title);
    }
  }

  override toString(): string {
    return "[Object GEllipseProperties]";
  }
}
