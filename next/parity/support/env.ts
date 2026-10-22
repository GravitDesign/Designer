import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The `next/` folder. */
export const NEXT_ROOT = path.resolve(here, "..", "..");

/**
 * Folder that holds the old app (server.js, routes/, public/).
 * Until the cutover this is the repo root; after it, `legacy/`.
 */
export const LEGACY_ROOT = process.env.GD_LEGACY_ROOT
  ? path.resolve(process.env.GD_LEGACY_ROOT)
  : fs.existsSync(path.resolve(NEXT_ROOT, "..", "legacy", "server.js"))
    ? path.resolve(NEXT_ROOT, "..", "legacy")
    : path.resolve(NEXT_ROOT, "..");

export const OLD_PORT = Number(process.env.GD_OLD_PORT ?? 3190);
export const NEW_PORT = Number(process.env.GD_NEW_PORT ?? 3192);

export const OLD_URL = `http://127.0.0.1:${OLD_PORT}/`;
export const NEW_URL = `http://127.0.0.1:${NEW_PORT}/`;

/** Expected results recorded from the old app. */
export const EXPECTED_ROOT = path.join(NEXT_ROOT, "parity", "expected");

/** Where failing comparisons write their actual output and diff images. */
export const OUTPUT_ROOT = path.join(NEXT_ROOT, "test-results", "parity");

/** `GD_RECORD=1` rewrites the expected files from the old app. */
export const RECORDING = process.env.GD_RECORD === "1";
