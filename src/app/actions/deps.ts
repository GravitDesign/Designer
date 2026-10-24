/**
 * What the actions use of other app clusters: the rich tooltip configs,
 * the panel ids, the system dialog and the action icons (both looked up
 * late, see shell/late.ts: the dialog module loads Mousetrap, which needs
 * a DOM, and the actions are unit tested in Node) and the style layer
 * helper.
 */
import type { Node } from "../../engine/scene/node.ts";
import { RichTooltipConfig, type RichTooltipFields } from "../widgets/rich-tooltip-config.ts";
import { lateExport, systemDialog } from "../shell/late.ts";
import { iterateEqualStyleLayers as iterateLayers } from "../util/designer-util.ts";

export { TOOLTIP_AREA, type RichTooltipFields } from "../widgets/rich-tooltip-config.ts";
export { PanelIds } from "../inspector/panel-ids.ts";

/** GRichTooltipConfig.from (module 67). */
export function richTooltipConfig(fields: RichTooltipFields): unknown {
  return RichTooltipConfig.from(fields);
}

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
  if (!dialog.confirm) throw new Error("no system dialog (the app modules are not loaded)");
  dialog.confirm(message, done, ...rest);
}

/** GSystemDialog.error (module 44). */
export function errorDialog(message: string, options?: { showTitle?: boolean }): void {
  const dialog = lateExport<{ error(message: string, options?: unknown): unknown }>(
    "dialogs/system-dialog.ts",
    "SystemDialog",
  );
  if (dialog) dialog.error(message, options);
  else console.error("[system dialog]", message);
}

/**
 * gApi.getRichTooltipVideoURL (module 417): the API address, which is the
 * page origin in the local build, and the video name.
 */
export function richTooltipVideoUrl(name: string): string {
  return (typeof location === "object" ? location.origin : "") + "/rich-tooltip-video/" + name;
}
