// Old: designer.browser.dev.js module 1660 (GTransformProperties).
/**
 * The advanced transform of transform mode: move, scale, rotate, reflect
 * and skew by typed values, applied around a pivot, optionally to a
 * number of copies (each copy gets the transformation one step further).
 * The settings overlay switches the scaling of borders and corners.
 */
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { formatNumber } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Element } from "../../engine/scene/element.ts";
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { InputBox } from "../widgets/input-box.ts";
import { initInputLabel } from "../widgets/input-label.ts";
import { PIVOT_CLICK_STATS, pivotSides } from "../widgets/pivot.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import {
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

/** An element as the transformation uses it. */
interface TransformElement extends Node {
  getGeometryBBox(): Rect | null;
  transform(transform: unknown, ...rest: unknown[]): void;
  beginUpdate(): void;
  endUpdate(): void;
  clone(): Node;
}

interface EditorLike {
  _setTransform(transform: Transform | null): void;
  applyTransform(target: unknown, ...rest: unknown[]): void;
}

const pivots = new WeakMap<HTMLElement, { value: string | null }>();

/** `$(div).gPivot()` (old module 1724) on plain DOM. */
export function initPivot(element: HTMLElement): HTMLElement {
  pivots.set(element, { value: null });
  element.classList.add("g-pivot");
  element.appendChild(el("div", "borderline"));
  for (const side of pivotSides()) {
    const button = el("div", "side");
    button.setAttribute("data-side", side);
    button.addEventListener("click", () => {
      designer().stats(PIVOT_CLICK_STATS);
      setPivotValue(element, side);
      element.dispatchEvent(new CustomEvent("pivotchange", { detail: side, bubbles: true }));
    });
    element.appendChild(button);
  }
  return element;
}

/** `gPivot("value", side)`. */
export function setPivotValue(element: HTMLElement, side: string): void {
  const data = pivots.get(element);
  if (data) data.value = side;
  for (const button of element.querySelectorAll("div[data-side]"))
    button.classList.toggle("g-active", button.getAttribute("data-side") === side);
}

/** `gPivot("value")`. */
export function pivotValue(element: HTMLElement | null): string | null {
  const data = element ? pivots.get(element) : undefined;
  return data ? data.value : null;
}

function tooltip(key: string, learnMoreOnly = false): RichTooltipConfig {
  const fields: Record<string, unknown> = {
    title: text("GTransformProperties", `text.${key}-tooltip-title`),
    description: text("GTransformProperties", `text.${key}-tooltip-description`),
  };
  if (!learnMoreOnly) fields.middle = false;
  fields.learnMore = "";
  return RichTooltipConfig.from(fields as unknown as Parameters<typeof RichTooltipConfig.from>[0]);
}

/** The value of the box on the panel's element matching `selector`. */
function boxValue(root: HTMLElement, selector: string): string {
  const input = root.querySelector<HTMLInputElement>(selector);
  const box = input ? InputBox.of(input) : null;
  return box ? box.value() : (undefined as unknown as string);
}

export class TransformProperties extends Properties {
  _panel: HTMLElement | null = null;
  _copiesAndApply: HTMLElement | null = null;
  _copiesAndApplyTouch: HTMLElement | null = null;
  override _document: Document | null = null;
  _elements: TransformElement[] = [];
  _scaleKeepRatio = false;
  _preserveScaleX = 100;
  _preserveScaleY = 100;
  /** The settings overlay's content (the old code kept the jQuery content as the panel). */
  _advancedTransformPanel: HTMLElement | null = null;
  _advancedTransformOverlay: Overlay | null = null;

  override isGroup(): boolean {
    return false;
  }

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    toolbar.classList.add("advanced-transform-toolbar");
    panel.classList.add("advanced-transform-properties");
    this._panel = panel;

    const settings = el("div");
    settings.style.width = "180px";
    this._advancedTransformOverlay = new Overlay(settings, {
      releaseOnClose: false,
      clazz: "g-overlay-advanced-transform",
    });
    this._advancedTransformPanel = settings;
    const checkboxRow = (property: string, caption: string, onChange: (on: boolean) => void) => {
      const box = el("input");
      box.setAttribute("type", "checkbox");
      box.setAttribute("data-property", property);
      box.checked = true;
      box.addEventListener("change", () => onChange(box.checked));
      const span = el("span");
      span.textContent = caption;
      const label = el("label");
      label.append(box, span);
      return propertyRow(el("div"), { columns: [{ width: "auto", content: label }] });
    };
    settings.appendChild(
      checkboxRow("_bs", text("GBorderPaintLayerProperties", "text.autoscale-borders"), (on) => {
        designer().stats(
          "transformproperties_toggle_autoscale-borders",
          on ? "enabled" : "disabled",
        );
        this._setBorderScale(on);
      }),
    );
    settings.appendChild(
      checkboxRow("esc", text("GCommonNames", "text.autoscale-corners"), (on) => {
        designer().stats(
          "transformproperties_toggle_autoscale-corners",
          on ? "enabled" : "disabled",
        );
        this._setCornersScale(on);
      }),
    );
    const title = el("label");
    title.textContent = text("GTransformProperties", "title");
    toolbar.appendChild(title);
    const settingsButton = el("button");
    settingsButton.setAttribute("data-action", "stroke-settings");
    settingsButton.setAttribute(
      "data-title",
      text("GTransformProperties", "text.advanced-transform-settings"),
    );
    settingsButton.appendChild(el("span", "gravit-icon-settings"));
    settingsButton.addEventListener("click", (event) => {
      designer().stats("transformproperties_open_advanced");
      (this._advancedTransformOverlay as Overlay).open(
        (event.target as HTMLElement).closest("button"),
      );
    });
    toolbar.appendChild(settingsButton);

    const moveTip = tooltip("move");
    const scaleTip = tooltip("scale");
    const rotateTip = tooltip("rotate");
    const axisTip = tooltip("rotate-axis");
    const skewTip = tooltip("skew");
    const copiesTip = tooltip("copies");
    const originTip = tooltip("transdorm-origin", true);

    /** An input in a div with a label: the old `$("<div/>").append(input).gInputLabel(...)`. */
    const labelled = (input: HTMLInputElement, label: string, tip: RichTooltipConfig) => {
      const holder = el("div");
      holder.appendChild(input);
      initInputLabel(holder, { label });
      attachRichTooltip(holder, tip);
      return holder;
    };
    const moveBox = (property: string, stats: string) => {
      const box = el("input");
      box.addEventListener("keydown", (event) => this._confirmEvent(event));
      box.addEventListener("change", () => designer().stats(stats));
      box.setAttribute("type", "text");
      box.setAttribute("data-property", property);
      new InputBox(box).value("0");
      return box;
    };
    const degreeBox = (property: string, stats: string) => {
      const box = el("input");
      box.setAttribute("type", "text");
      box.setAttribute("data-property", property);
      box.addEventListener("change", () => designer().stats(stats));
      new InputBox(box, { postfix: "°" }).value("0");
      return box;
    };
    const scaleBox = (property: "scale-x" | "scale-y") => {
      const box = el("input");
      box.setAttribute("type", "text");
      box.setAttribute("data-property", property);
      box.addEventListener("change", (event) => {
        designer().stats("transformproperties_change_" + property);
        const value =
          parseFloat((InputBox.of(event.target as HTMLInputElement) as InputBox).value()) || 100;
        const x = property === "scale-x";
        if (this._scaleKeepRatio) {
          const factor = value / (x ? this._preserveScaleX : this._preserveScaleY);
          const other = (this._panel as HTMLElement).querySelector<HTMLInputElement>(
            `[data-property="${x ? "scale-y" : "scale-x"}"]`,
          ) as HTMLInputElement;
          const otherBox = InputBox.of(other) as InputBox;
          let otherValue = parseFloat(otherBox.value()) || 100;
          otherValue *= factor;
          otherBox.value(parseFloat(otherValue as unknown as string).toFixed(1));
        }
        if (x) this._preserveScaleX = value;
        else this._preserveScaleY = value;
      });
      new InputBox(box, { postfix: "%" }).value("100");
      return box;
    };

    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GCommonNames", "action.move"),
        columns: [
          {
            width: "44%",
            content: labelled(moveBox("move-x", "transformproperties_change_move-x"), "x", moveTip),
          },
          { width: "12%" },
          {
            width: "44%",
            content: labelled(moveBox("move-y", "transformproperties_change_move-y"), "y", moveTip),
          },
        ],
      }),
    );
    const link = el("span", "gravit-icon-unlinked transform-scale-link");
    link.style.textAlign = "center";
    link.style.cursor = "pointer";
    link.addEventListener("click", () => {
      if ("yes" === link.getAttribute("data-ratio")) {
        link.setAttribute("data-ratio", "no");
        link.setAttribute("class", "gravit-icon-unlinked transform-scale-link");
        this._scaleKeepRatio = false;
      } else {
        link.setAttribute("data-ratio", "yes");
        link.setAttribute("class", "gravit-icon-linked transform-scale-link");
        this._scaleKeepRatio = true;
      }
    });
    link.setAttribute("data-title", text("GDimensionProperties", "action.keep-ratio"));
    link.setAttribute("data-ratio", "no");
    const commonLabel = (key: string, fallback: string) =>
      String(Locale.get(new LocaleKey("GCommonNames", key), fallback));
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GTransformProperties", "text.scale"),
        columns: [
          {
            width: "44%",
            content: labelled(scaleBox("scale-x"), commonLabel("property-w", "w"), scaleTip),
          },
          { width: "12%", content: link },
          {
            width: "44%",
            content: labelled(scaleBox("scale-y"), commonLabel("property-h", "h"), scaleTip),
          },
        ],
      }),
    );
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GCommonNames", "action.rotate"),
        columns: [
          {
            width: "44%",
            content: labelled(
              degreeBox("rotate", "transformproperties_change_rotate-up"),
              "&#x2191;",
              rotateTip,
            ),
          },
          { width: "12%" },
          {
            width: "44%",
            content: labelled(
              degreeBox("reflect", "transformproperties_change_rotate-down"),
              "&#x2193;",
              axisTip,
            ),
          },
        ],
      }),
    );
    panel.appendChild(
      propertyRow(el("div"), {
        label: text("GTransformProperties", "text.skew"),
        columns: [
          {
            width: "44%",
            content: labelled(
              degreeBox("skew-x", "transformproperties_change_skew-x"),
              "X",
              skewTip,
            ),
          },
          { width: "12%" },
          {
            width: "44%",
            content: labelled(
              degreeBox("skew-y", "transformproperties_change_skew-y"),
              "Y",
              skewTip,
            ),
          },
        ],
      }),
    );
    panel.appendChild(el("hr"));
    const copiesAndApply = el("div", "copies-apply");
    panel.appendChild(copiesAndApply);
    this._copiesAndApply = copiesAndApply;
    const copiesAndApplyTouch = el("div", "copies-apply-touch");
    panel.appendChild(copiesAndApplyTouch);
    this._copiesAndApplyTouch = copiesAndApplyTouch;

    const copiesBox = () => {
      const box = el("input");
      box.addEventListener("change", () => designer().stats("transformproperties_change_copies"));
      box.setAttribute("type", "text");
      box.setAttribute("data-property", "copies");
      new InputBox(box).value("0");
      attachRichTooltip(box, copiesTip);
      return box;
    };
    const applyButton = (label: string) => {
      const button = el("button");
      button.textContent = label;
      button.classList.add("transform-button");
      return button;
    };

    // Desktop: copies and pivot in a row, the apply button below.
    const centred = el("div");
    centred.style.width = "100%";
    centred.style.display = "flex";
    centred.style.justifyContent = "center";
    const pivot = el("div");
    pivot.setAttribute("data-property", "pivot");
    pivot.style.alignSelf = "center";
    initPivot(pivot);
    setPivotValue(pivot, Rect.Side.CENTER);
    centred.appendChild(pivot);
    attachRichTooltip(centred, originTip);
    copiesAndApply.appendChild(
      propertyRow(el("div"), {
        label: text("GTransformProperties", "text.copies"),
        columns: [
          { width: "44%", content: copiesBox() },
          { width: "12%" },
          { width: "44%", html: centred },
        ],
      }),
    );
    const apply = applyButton(text("GCommonNames", "action.apply"));
    apply.style.marginTop = "5px";
    apply.addEventListener("click", () => this._applyTransformation());
    copiesAndApply.appendChild(
      propertyRow(el("div"), { label: "", columns: [{ width: "100%", content: apply }] }),
    );

    // Touch: copies and apply on the left, the pivot on the right.
    const left = el("div", "left");
    left.appendChild(
      propertyRow(el("div"), {
        label: text("GTransformProperties", "text.copies"),
        columns: [{ width: "100px", content: copiesBox() }],
      }),
    );
    const touchApply = applyButton(text("GDimensionProperties", "text.transform-apply"));
    touchApply.addEventListener("click", () => this._applyTransformation());
    left.appendChild(
      propertyRow(el("div", "transform-apply"), {
        columns: [{ width: "100%", content: touchApply }],
      }),
    );
    copiesAndApplyTouch.appendChild(left);
    const right = el("div", "right");
    const touchPivot = el("div");
    touchPivot.setAttribute("data-property", "pivot");
    initPivot(touchPivot);
    setPivotValue(touchPivot, Rect.Side.CENTER);
    right.appendChild(touchPivot);
    copiesAndApplyTouch.appendChild(right);
  }

  override isAvailable(transformMode: boolean): boolean {
    return true === transformMode;
  }

  _enableTouchModal(touch: boolean): void {
    const desktop = this._copiesAndApply as HTMLElement;
    const mobile = this._copiesAndApplyTouch as HTMLElement;
    if (touch) {
      mobile.style.setProperty("display", "block");
      desktop.style.setProperty("display", "none");
    } else {
      mobile.style.setProperty("display", "none");
      desktop.style.setProperty("display", "block");
    }
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      // The old code removed the listener without its target.
      designer().removeEventListener(SettingChangedEvent, this._settingChanged);
      this._document = null;
    }
    this._enableTouchModal(designer().isTouchEnabled());
    this._elements = [];
    if (document) {
      const list = elements as InspectedElements;
      for (let i = 0; i < list.length; ++i) {
        const element = list[i] as Node;
        if (element.hasMixin(Element.Transform) && !(element instanceof Page))
          this._elements.push(element as TransformElement);
      }
      if (this._elements.length && this._elements.length === list.length) {
        this._document = document;
        designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
        this._setBorderScale(this._getOwnBorderScale());
        this._setCornersScale(this._getOwnCornersScale());
        return true;
      }
    }
    return false;
  }

  _confirmEvent(event: KeyboardEvent): void {
    if (13 === event.keyCode) this._updateDisplayValues();
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("decimals_num" === event.key) this._updateDisplayValues();
  }

  _updateDisplayValues(): void {
    const scene = sceneOf(this._document as Document);
    const panel = this._panel as HTMLElement;
    for (const property of ["move-x", "move-y"]) {
      const input = panel.querySelector<HTMLInputElement>(`[data-property="${property}"]`);
      const box = input ? InputBox.of(input) : null;
      if (!box) continue;
      let value = parseFloat(box.value());
      value = isNaN(value) || value <= 0 || !value ? 0 : value;
      box.value(formatNumber(value, scene.getOptimalDecimalsCount()));
    }
  }

  _applyTransformation(): void {
    designer().stats("transformproperties_apply_transformation");
    const scene = sceneOf(this._document as Document);
    const panel = this._panel as HTMLElement;
    const holder = (
      designer().isTouchEnabled() ? this._copiesAndApplyTouch : this._copiesAndApply
    ) as HTMLElement;
    const copies = parseInt(boxValue(holder, '[data-property="copies"]'));
    const side = pivotValue(holder.querySelector<HTMLElement>('[data-property="pivot"]'));
    const moveX = scene.stringToPoint(boxValue(panel, '[data-property="move-x"]')) || 0;
    const moveY = scene.stringToPoint(boxValue(panel, '[data-property="move-y"]')) || 0;
    const scaleX = parseFloat(boxValue(panel, '[data-property="scale-x"]')) / 100 || 1;
    const scaleY = parseFloat(boxValue(panel, '[data-property="scale-y"]')) / 100 || 1;
    const rotate = GMath.toRadians(parseFloat(boxValue(panel, '[data-property="rotate"]'))) || 0;
    const skewX = GMath.toRadians(parseFloat(boxValue(panel, '[data-property="skew-x"]'))) || 0;
    const skewY = GMath.toRadians(parseFloat(boxValue(panel, '[data-property="skew-y"]'))) || 0;
    let reflect =
      parseFloat(parseFloat(boxValue(panel, '[data-property="reflect"]')) as unknown as string) ||
      0;
    reflect = 0 !== reflect ? GMath.toRadians(-reflect) : reflect;

    const transformElement = (element: TransformElement, transform: Transform) => {
      const editor = ElementEditor.openEditor(element) as unknown as EditorLike | null;
      if (editor) {
        editor._setTransform(transform);
        editor.applyTransform(element, true, null, null);
      } else {
        // The old code passed the element itself as the transform here; see
        // "Transform panel transforms an element by itself" in QUESTIONS.md.
        element.transform(element, true);
      }
    };
    const step = (index: number, element: TransformElement, origin: Point) => {
      element.beginUpdate();
      try {
        if (moveX || moveY)
          transformElement(element, new Transform(1, 0, 0, 1, moveX * index, moveY * index));
        if (!(1 === scaleX && 1 === scaleY))
          transformElement(
            element,
            new Transform()
              .translated(-origin.getX(), -origin.getY())
              .scaled(scaleX + (scaleX - 1) * (index - 1), scaleY + (scaleY - 1) * (index - 1))
              .translated(origin.getX(), origin.getY()),
          );
        if (0 !== rotate)
          transformElement(
            element,
            new Transform()
              .translated(-origin.getX(), -origin.getY())
              .rotated(rotate * index)
              .translated(origin.getX(), origin.getY()),
          );
        if (
          (0 !== skewX || 0 !== skewY) &&
          skewX > -GMath.PIHALF &&
          skewY > -GMath.PIHALF &&
          skewX < GMath.PIHALF &&
          skewY < GMath.PIHALF
        )
          transformElement(
            element,
            new Transform()
              .translated(-origin.getX(), -origin.getY())
              .skewed(skewX * index, skewY * index)
              .translated(origin.getX(), origin.getY()),
          );
        if (0 !== reflect) {
          const cos = Math.cos(reflect);
          const sin = Math.sin(reflect);
          if (index % 2)
            transformElement(
              element,
              new Transform()
                .translated(-origin.getX(), -origin.getY())
                .multiplied(new Transform(cos, -sin, sin, cos, 0, 0))
                .multiplied(new Transform(1, 0, 0, -1, 0, 0))
                .multiplied(new Transform(cos, sin, -sin, cos, 0, 0))
                .translated(origin.getX(), origin.getY()),
            );
        }
      } finally {
        element.endUpdate();
      }
    };

    Editor.tryRunTransaction(
      scene,
      () => {
        const groups: TransformElement[][] = [];
        let box: Rect | null = null;

        for (let i = 0; i < this._elements.length; ++i) {
          const element = this._elements[i] as TransformElement;
          const elementBox = side ? element.getGeometryBBox() : null;
          if (elementBox) box = box ? box.united(elementBox) : elementBox;
          const group: TransformElement[] = [element];
          if (copies > 0) {
            const parent = element.getParent() as unknown as {
              insertChild(child: Node, reference: Node | null): void;
            };
            const next = element.getNext() ? element.getNext() : null;
            for (let c = 0; c < copies; ++c) {
              const copy = element.clone() as TransformElement;
              parent.insertChild(copy, next);
              if (c == copies - 1) {
                copy.setFlag(Node.Flag.Selected as number);
                element.removeFlag(Node.Flag.Selected as number);
              }
              group.push(copy);
            }
          }
          groups.push(group);
        }
        let origin: Point | null = null;
        if (box && !box.isEmpty()) origin = box.getSide(side as string);
        if (origin)
          for (let i = 0; i < groups.length; ++i) {
            const group = groups[i] as TransformElement[];
            if (group.length > 1)
              for (let h = 0; h < group.length; ++h) step(h, group[h] as TransformElement, origin);
            else if (1 == group.length) step(1, group[0] as TransformElement, origin);
          }
      },
      text("GTransformProperties", "action.apply-transformation"),
    );
  }

  _getOwnBorderScale(): boolean {
    const box = (this._advancedTransformPanel as HTMLElement).querySelector<HTMLInputElement>(
      '[data-property="_bs"]',
    );
    return box ? box.checked : (undefined as unknown as boolean);
  }

  _setBorderScale(scale: boolean): void {
    if (this._document)
      sceneOf(this._document).setBorderScale(
        scale && (undefined === EditorOptions.scaleBorderWidth || EditorOptions.scaleBorderWidth),
      );
  }

  _getOwnCornersScale(): boolean {
    const box = (this._advancedTransformPanel as HTMLElement).querySelector<HTMLInputElement>(
      '[data-property="esc"]',
    );
    return box ? box.checked : (undefined as unknown as boolean);
  }

  _setCornersScale(scale: boolean): void {
    if (this._document)
      sceneOf(this._document).setCornersScale(
        scale && (undefined === EditorOptions.scaleCorners || EditorOptions.scaleCorners),
      );
  }

  override toString(): string {
    return "[Object GTransformProperties]";
  }
}
