/**
 * The designer's settings for components (docs/rewrite/UI.md, section 12).
 * Designer writes it after every change and after start() restored the
 * stored object; components only read it and call designer().setSetting.
 */
import { create } from "zustand";
import { defaultSettings, type DesignerSettings } from "../shell/settings.ts";

export interface SettingsState {
  settings: Readonly<DesignerSettings>;
  /** False until Designer.start() restored the stored settings. */
  loaded: boolean;
}

export const useSettingsStore = create<SettingsState>()(() => ({
  settings: defaultSettings(),
  loaded: false,
}));

/** Called by Designer with its settings object after a change. */
export function publishSettings(settings: DesignerSettings, loaded: boolean): void {
  useSettingsStore.setState({ settings: { ...settings }, loaded });
}

/** One setting, for a component: `useSetting("rulers_visible")`. */
export function useSetting<K extends keyof DesignerSettings>(key: K): DesignerSettings[K] {
  return useSettingsStore((state) => state.settings[key]);
}
