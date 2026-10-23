/**
 * Late-bound modules of other app clusters: the shell reaches the system
 * dialog, the header, the toolbar, the menus and the welcome screen by
 * their port-map file and old export name, so it builds and runs while
 * those clusters are still being ported (docs/rewrite/UI.md, section 9).
 *
 * bootstrap.ts loads every app module once (an eager import.meta.glob)
 * and hands the map over with setLateModules; shell code looks exports
 * up at runtime, never at module load.
 */

type ModuleMap = Record<string, Record<string, unknown>>;

let modules: ModuleMap = {};

/** Keys are paths below src/app ("dialogs/system-dialog.ts"). */
export function setLateModules(map: ModuleMap): void {
  modules = map;
}

/** The export `name` of the module at `path` (below src/app), or null. */
export function lateExport<T>(path: string, name: string): T | null {
  const module = modules[path];
  if (!module || !(name in module)) return null;
  return module[name] as T;
}

/** Whether the module at `path` exists. */
export function hasLateModule(path: string): boolean {
  return path in modules;
}

/** GSystemDialog (app-widgets-dialogs) as the shell uses it. */
export interface SystemDialogLike {
  alert(message: string, ...rest: unknown[]): unknown;
  confirm?(message: string, done: (ok: boolean) => void, ...rest: unknown[]): unknown;
  showOneTimeDialog?(message: string, setting: string): unknown;
}

/** GSystemDialog, or a console fallback until the dialogs cluster exists. */
export function systemDialog(): SystemDialogLike {
  const dialog = lateExport<SystemDialogLike>("dialogs/system-dialog.ts", "SystemDialog");
  if (dialog) return dialog;
  return {
    alert(message: string) {
      console.warn("[system dialog]", message);
    },
  };
}
