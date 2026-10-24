import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The repo root (or the packaged app folder in Electron). */
export const APP_ROOT = process.env.GD_APP_ROOT
  ? path.resolve(process.env.GD_APP_ROOT)
  : path.resolve(here, "..");

/**
 * Built client (vite build output). GD_CLIENT_ROOT points a server at
 * another build, so parallel test runs don't share one dist/.
 */
export const CLIENT_ROOT = process.env.GD_CLIENT_ROOT
  ? path.resolve(process.env.GD_CLIENT_ROOT)
  : path.join(APP_ROOT, "dist");

function firstExisting(candidates: readonly string[]): string {
  return candidates.find((c) => fs.existsSync(c)) ?? (candidates[0] as string);
}

/**
 * Images, fonts, icons and data files shared with the old app. They are
 * large (about 180 MB), so the build doesn't copy them; the server serves
 * them from here. In the repo they are the old app's (legacy/public/assets);
 * the packaged app has them next to app.asar.
 */
export const ASSETS_ROOT = process.env.GD_ASSETS_ROOT
  ? path.resolve(process.env.GD_ASSETS_ROOT)
  : firstExisting([
      path.join(APP_ROOT, "assets"),
      path.join(APP_ROOT, "legacy", "public", "assets"),
      path.resolve(APP_ROOT, "..", "assets"),
    ]);

/** The HTML user guide served at /docs (the old app's legacy/docs). */
export const DOCS_ROOT = process.env.GD_DOCS_ROOT
  ? path.resolve(process.env.GD_DOCS_ROOT)
  : firstExisting([
      path.join(APP_ROOT, "guide"),
      path.join(APP_ROOT, "legacy", "docs"),
      path.resolve(APP_ROOT, "..", "docs"),
    ]);
