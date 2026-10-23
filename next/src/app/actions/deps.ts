/**
 * Modules of other app clusters the actions need, looked up late (see
 * shell/late.ts and docs/rewrite/UI.md section 9) while those clusters
 * are ported in parallel. Each lookup names the port-map file and the old
 * export name minus G; the types are the parts the actions use.
 */
import type { Node } from "../../engine/scene/node.ts";
import { lateExport, systemDialog } from "../shell/late.ts";
import { iterateEqualStyleLayers as iterateLayers } from "../util/designer-util.ts";

/** TOOLTIP_AREA of module 67 (widgets/rich-tooltip-config.ts). */
export const TOOLTIP_AREA = {
  TOOLBAR: "TOOLBAR",
  SIDEBAR: "SIDEBAR",
  MAIN_MENU: {
    TRY_PRO_COMMON: "TRY_PRO_COMMON",
    TRY_EXP_PDF_ADVANCED_SETTING: "TRY_EXP_PDF_ADVANCED_SETTING",
  },
} as const;

/** The fields of a GRichTooltipConfig the actions set. */
export interface RichTooltipFields {
  title: unknown;
  description?: unknown;
  shortcut?: unknown;
  middle?: boolean;
  video?: unknown;
  learnMore?: string;
}

/** GRichTooltipConfig.from (module 67), or the plain fields until that module exists. */
export function richTooltipConfig(fields: RichTooltipFields): unknown {
  const config = lateExport<{ from(fields: RichTooltipFields): unknown }>(
    "widgets/rich-tooltip-config.ts",
    "RichTooltipConfig",
  );
  return config ? config.from(fields) : fields;
}

/** The ids of the style panels the mouse-over context names (module 607). */
export const PanelIds = {
  FillPropertiesPanel: "fill-properties-panel",
  BorderPropertiesPanel: "border-properties-panel",
  EffectPropertiesPanel: "effect-properties-panel",
} as const;

/** The action icon table (module 844, menus/action-icons.ts). */
export function actionIcons(): Readonly<Record<string, string>> {
  return (
    lateExport<Readonly<Record<string, string>>>("menus/action-icons.ts", "ACTION_ICONS") || {}
  );
}

/**
 * iterateEqualStyleLayers of module 40 (util/designer-util.ts). The old
 * callers could pass no kind when the mouse-over context named another
 * panel; the cast keeps that call shape.
 */
export function iterateEqualStyleLayers(
  kind: string | null,
  layer: unknown,
  selection: readonly Node[],
  visit: (layer: Node) => void,
): void {
  iterateLayers(kind as "fill", layer, selection, visit as (layer: unknown) => void);
}

export { dataUrlToBlob } from "../util/download.ts";

/** GSystemDialog (module 44). */
export function alertDialog(message: string, ...rest: unknown[]): void {
  systemDialog().alert(message, ...rest);
}

/** GSystemDialog.confirm (module 44). */
export function confirmDialog(
  message: string,
  done: (ok: boolean) => void,
  ...rest: unknown[]
): void {
  const dialog = systemDialog();
  if (!dialog.confirm) throw new Error("dialogs/system-dialog.ts is not ported yet");
  dialog.confirm(message, done, ...rest);
}

/** GSystemDialog.error (module 44). */
export function errorDialog(message: string, options?: { showTitle?: boolean }): void {
  const dialog = lateExport<{ error(message: string, options?: unknown): unknown }>(
    "dialogs/system-dialog.ts",
    "SystemDialog",
  );
  if (dialog && dialog.error) dialog.error(message, options);
  else console.error("[system dialog]", message);
}

/**
 * gApi.getRichTooltipVideoURL (module 417): the API address, which is the
 * page origin in the local build, and the video name.
 */
export function richTooltipVideoUrl(name: string): string {
  return (typeof location === "object" ? location.origin : "") + "/rich-tooltip-video/" + name;
}
