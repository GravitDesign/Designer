// Old: designer.browser.dev.js module 1657 (the touch GPatternChooser).
/**
 * The color chooser in touch mode: the desktop chooser (color-chooser.ts)
 * with bigger rows of eight swatches, small-caps palette buttons, another
 * texture editor layout, and a long-press menu on swatches and the hex
 * box that adds the swatch (or the current paint) to the document or
 * global swatches. It opens with the `pattern-chooser-overlay` class,
 * 250px from the right edge.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { equals } from "../../engine/core/util.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Color } from "../../engine/color/color.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import type { Gradient } from "../../engine/style/gradient.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import type { Pattern } from "../../engine/style/pattern.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { Swatch } from "../../engine/style/swatch.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { Menu } from "../menus/menu.ts";
import { css } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { InputBox } from "../widgets/input-box.ts";
import {
  PatternChooser,
  setTouchPatternChooserClass,
  swatchOfElement,
  type ColorModeParams,
  type PatternEditorParams,
  type RowColumn,
  type TouchParams,
} from "./color-chooser.ts";
import { InputSlider } from "./opacity-slider.ts";

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (classes) for (const name of classes.split(/\s+/)) if (name) element.classList.add(name);
  return element;
}

function miniFont(caption: string): HTMLElement {
  const label = el("div", "mini-font");
  label.textContent = caption;
  return label;
}

export class TouchPatternChooser extends PatternChooser {
  protected _advancedExpanded = true;
  protected _longPressTimer: unknown = null;
  protected _islongPress = false;

  constructor() {
    super({ clazz: "pattern-chooser-overlay", customRight: -250 });
    this.initContextMenu();
  }

  protected override _createChoosers(activate: (event: globalThis.Event) => void): HTMLElement {
    const chooser = el("div", "chooser");
    for (const [palette, className, key] of [
      ["colors", "GCommonNames", "text.colors"],
      ["swatches", "GPatternChooser", "text.swatches"],
      ["used", "GPatternChooser", "text.in-use"],
      ["mixer", "GPatternChooser", "text.mixer"],
    ] as const) {
      const button = el("button");
      button.setAttribute("data-palette", palette);
      button.appendChild(miniFont(text(className, key).toUpperCase()));
      button.addEventListener("click", activate);
      chooser.appendChild(button);
    }
    this._palettes.appendChild(chooser);
    return chooser;
  }

  /** The long-press menu: add the pressed swatch (or the current paint) to the swatches. */
  initContextMenu(): void {
    const menu = new Menu(null, "g-pattern-chooser-context-menu");
    this._contextMenu = {
      open: (target: Element) => menu.open(target as HTMLElement),
    };
    const addSwatch = (scope: string, pattern: Pattern | null, opacity: number | null) => {
      const swatch = new Swatch(pattern, opacity);
      const list = designer().getSwatches(scope);
      if (list) {
        for (let s = 0; s < list.length; ++s)
          if (equals(swatch, list[s], true)) {
            SystemDialog.alert(text("GPatternChooser", "text.equal-swatch-alert"));
            return;
          }
        list.push(swatch);
        designer().setSwatches(scope, list);
      }
    };
    // A gradient swatch is added with the current gradient, its first stop
    // taking the pressed swatch's color.
    const withFirstStop = (color: Pattern | null): Pattern => {
      const pattern = (this._pattern as Pattern).clone();
      if (
        pattern instanceof RadialGradient ||
        pattern instanceof LinearGradient ||
        pattern instanceof AngularGradient
      )
        ((pattern as Gradient)._stops[0] as { color: unknown }).color = color;
      return pattern;
    };
    const add = (scope: string) => {
      const target = this._currentLongPressTarget as Element;
      const pressed = target.closest(".swatch");
      const swatch = pressed ? swatchOfElement(pressed) : undefined;
      if (swatch) {
        let pattern = swatch.getProperty("_pt") as Pattern | null;
        const opacity = swatch.getProperty("_op") as number;
        scope = this._getSwatchScope(scope, this._pattern);
        pattern = withFirstStop(pattern);
        addSwatch(scope, pattern, opacity);
      } else if ("INPUT" === target.nodeName)
        addSwatch(this._getSwatchScope("document", this._pattern), this._pattern, this._opacity);
    };
    menu
      .createAddItem(text("GPatternChooser", "action.add-to-document-swatches"), () =>
        add("document"),
      )
      .setIcon("gravit-icon-add-swatches");
    menu
      .createAddItem(text("GPatternChooser", "action.add-to-global-swatches"), () => add("global"))
      .setIcon("gravit-icon-add-swatches");
  }

  override __getColorModeParams(): ColorModeParams {
    // "cymkWidth" as before: the CMYK boxes get no width.
    return { hexWidth: "25%", isTouchEnabled: true, rgbWidth: "12%", cymkWidth: "12%" };
  }

  protected override _createPatternEditorFirstRow(
    choose: () => void,
    paste: () => void,
  ): RowColumn[] {
    const chooseButton = el("button");
    chooseButton.prepend(el("span", "gravit-icon-add-image"));
    chooseButton.appendChild(miniFont(text("GPatternChooser", "action.choose-image") + "..."));
    chooseButton.classList.add("pattern-choose-image-button");
    chooseButton.addEventListener("click", choose);
    const pasteButton = el("button", "paste-btn g-flat");
    pasteButton.appendChild(el("span", "gravit-icon-paste-color-choose"));
    pasteButton.addEventListener("click", paste);
    return [
      { width: "80%", padding: false, content: chooseButton },
      { width: "20%", content: pasteButton },
    ];
  }

  protected override _createPatternEditorMaskRow(
    onMask: (event: globalThis.Event) => void,
  ): RowColumn[] {
    const toggle = el("label", "g-switch");
    const checkbox = el("input");
    checkbox.setAttribute("id", "texture-mask-touch");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("data-property", "texture_mask");
    checkbox.disabled = true;
    checkbox.addEventListener("change", onMask);
    toggle.append(checkbox, el("div"));
    const caption = el("label", "set-transparency-mask");
    caption.textContent = text("GPatternChooser", "action.set-transparency-mask");
    caption.setAttribute("for", "texture-mask-touch");
    return [
      { padding: false, width: "50px", content: toggle },
      { padding: false, width: "auto", content: caption },
    ];
  }

  protected override _createPatternEditorScaleRow(
    onInput: (event: globalThis.Event) => void,
    onChange: (event: globalThis.Event) => void,
    onBox: (event: globalThis.Event) => void,
  ): RowColumn[] {
    const caption = el("span");
    caption.textContent = text("GPatternChooser", "text.scale");
    const tile = el("div");
    tile.setAttribute("data-property", "texture_tile");
    new InputSlider(tile, { min: 10, max: 200 });
    tile.addEventListener("input", onInput);
    tile.addEventListener("change", onChange);
    const box = el("input");
    box.setAttribute("data-property", "texture_tile");
    box.setAttribute("type", "text");
    box.addEventListener("change", onBox);
    new InputBox(box, { minValue: 10, maxValue: 200, incrementValue: 1, postfix: "%" });
    return [
      { padding: false, width: "120px", content: caption },
      { width: "auto", content: tile },
      { width: "50px", content: box },
    ];
  }

  protected override _createPatternEditorAdvancedRow(advanced: HTMLElement): RowColumn[] {
    const option = el("div", "advanced-option");
    const title = el("b", "title");
    // Old: $("<b>" + text + " </b>").
    title.innerHTML = text("GPatternChooser", "text.advanced") + " ";
    option.appendChild(title);
    const icon = el("div", "gravit-icon-right expand-icon");
    icon.setAttribute("id", "expand-icon");
    option.appendChild(icon);
    option.addEventListener("click", () => {
      css(advanced, "display", "none" === getComputedStyle(advanced).display ? "block" : "none");
      this._advancedExpanded = !this._advancedExpanded;
      // Old: $("#expand-icon"), the first in the page.
      const expand = document.getElementById("expand-icon");
      if (expand) {
        expand.classList.remove("gravit-icon-right");
        expand.classList.remove("gravit-icon-down");
        expand.classList.add(this._advancedExpanded ? "gravit-icon-right" : "gravit-icon-down");
      }
    });
    return [{ width: "auto", content: option }];
  }

  override __getCreatePatternEditorParams(): PatternEditorParams {
    return {
      isTouchEnabled: true,
      repeatWidth: "48%",
      ghostWidth: "4%",
      postionWith: "48%",
      sizeWidth: "48%",
      unitWidth: "8%",
    };
  }

  protected override _createMixerPalette(palette: HTMLElement): void {
    for (const [name, key] of [
      ["tints", "text.tints"],
      ["shades", "text.shades"],
      ["tones", "text.tones"],
      ["mixes", "text.mixes"],
    ] as const) {
      const container = el("div", name);
      container.setAttribute("data-container", name);
      const title = el("div", "title");
      title.textContent = text("GPatternChooser", key).toUpperCase();
      container.appendChild(title);
      palette.appendChild(container);
      for (let n = 1; n <= 8; n += 1)
        this._createPaletteSwatch(RGBColor.WHITE as Color, container, false, false);
    }
    this._updateMixerPalette();
  }

  override __getUpdateMixerPaletteParams(): { maxCount: number } {
    return { maxCount: 8 };
  }

  override __getCreateUsedPaletteParams(): { isTouchEnabled: boolean; maxCount: number } {
    return { isTouchEnabled: true, maxCount: 8 };
  }

  override __getUpdateSwatchesPaletteParams(): TouchParams {
    return { isTouchEnabled: true };
  }

  override __getUpdateGradientStopParams(): TouchParams {
    return { isTouchEnabled: true };
  }

  override __getCreatePaletteSwatchParamas(): TouchParams {
    return { isTouchEnabled: true };
  }

  override __getUpdateOpacityParams(): TouchParams {
    return { isTouchEnabled: true };
  }

  override __getUpdateColorParams(): TouchParams {
    return { isTouchEnabled: true };
  }
}

setTouchPatternChooserClass(TouchPatternChooser);
