// Old: designer.browser.dev.js module 1696 ($.fn.gBlendMode).
/**
 * Fills a `<select>` with the blend modes, grouped as the old inspector
 * listed them. Modes only the WebGL renderer has (no CSS equivalent) are
 * marked with " *". Used by the appearance, fill and border panels and by
 * the effect forms with a blend mode.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";

export interface BlendModeOption {
  type: string;
  name: string;
  /** False for the WebGL-only modes. */
  isCompatible: boolean;
}

export interface BlendModeGroup {
  /** The optgroup label; null puts the options straight into the select. */
  group: string | null;
  options: BlendModeOption[];
}

/** The groups, read from the string tables when called (as the old init did). */
export function blendModeGroups(): BlendModeGroup[] {
  const B = PaintCanvas.BlendMode;
  const name = (key: string): string => Locale.getValue("GPaintCanvas", key) as string;
  const group = (key: string): string => Locale.getValue("GAppearanceProperties", key) as string;
  const option = (type: string, key: string, isCompatible: boolean): BlendModeOption => ({
    type,
    name: name(key),
    isCompatible,
  });
  return [
    { group: null, options: [option(B.Normal, "blend.normal", true)] },
    {
      group: group("text.darken-image"),
      options: [
        option(B.Darken, "blend.darken", true),
        option(B.Multiply, "blend.multiply", true),
        option(B.ColorBurn, "blend.colorburn", true),
        option(B.Subtract, "blend.subtract", false),
        option(B.LinearBurn, "blend.linearburn", false),
      ],
    },
    {
      group: group("text.lighten-image"),
      options: [
        option(B.Lighten, "blend.lighten", true),
        option(B.Screen, "blend.screen", true),
        option(B.ColorDodge, "blend.colordodge", true),
        option(B.LinearDodge, "blend.lineardodge", false),
        option(B.Add, "blend.add", false),
      ],
    },
    {
      group: group("text.boost-contrast"),
      options: [
        option(B.Overlay, "blend.overlay", true),
        option(B.SoftLight, "blend.softlight", true),
        option(B.HardLight, "blend.hardlight", true),
        option(B.VividLight, "blend.vividlight", false),
        option(B.LinearLight, "blend.linearlight", false),
        option(B.PinLight, "blend.pinlight", false),
        option(B.HardMix, "blend.hardmix", false),
      ],
    },
    {
      group: group("text.adjust-colors"),
      options: [
        option(B.Hue, "blend.hue", true),
        option(B.Saturation, "blend.saturation", true),
        option(B.Color, "blend.color", true),
        option(B.Luminosity, "blend.luminosity", true),
      ],
    },
    {
      group: group("text.invert-colors"),
      options: [
        option(B.Difference, "blend.difference", true),
        option(B.Exclusion, "blend.exclusion", true),
        option(B.Divide, "blend.divide", false),
        option(B.Power, "blend.power", false),
        option(B.Harmonic, "blend.harmonic", false),
        option(B.Sin, "blend.sin", false),
      ],
    },
  ];
}

/** `$(select).gBlendMode()`: appends the groups and options; returns the select. */
export function initBlendMode<T extends HTMLSelectElement>(select: T): T {
  for (const { group, options } of blendModeGroups()) {
    let parent: HTMLElement = select;
    if (group) {
      const optgroup = document.createElement("optgroup");
      optgroup.setAttribute("label", group);
      select.appendChild(optgroup);
      parent = optgroup;
    }
    for (const { type, name, isCompatible } of options) {
      const option = document.createElement("option");
      option.setAttribute("value", type);
      option.textContent = "".concat(name).concat(isCompatible ? "" : " *");
      parent.appendChild(option);
    }
  }
  return select;
}
