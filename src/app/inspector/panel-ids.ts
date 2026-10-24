// Old: designer.browser.dev.js module 607.
/** The ids of the style panels that the mouse-over context names. */
export const PanelIds = {
  FillPropertiesPanel: "fill-properties-panel",
  BorderPropertiesPanel: "border-properties-panel",
  EffectPropertiesPanel: "effect-properties-panel",
} as const;

export type PanelId = (typeof PanelIds)[keyof typeof PanelIds];
