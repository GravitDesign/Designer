import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { installMousetrapBinder, MousetrapBinder } from "../actions/mousetrap-binder.ts";
import { ACTION_TABLE, FOOTER_TABLE, loadAppModules, SIDEBAR_TABLE } from "./bootstrap.ts";
import { hasLateModule, lateExport, setLateModules } from "./late.ts";
import { setShortcutBinder, shortcutBinder, SingleKeyBinder } from "./shortcut-binder.ts";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(file));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$|\.testing\.ts$/.test(entry.name))
      out.push(file);
  }
  return out;
}

/**
 * Every late lookup with literal arguments in src/app: lateExport<...>("path",
 * "name"), the `find` bootstrap passes to its table entries, and
 * hasLateModule("path").
 */
function literalLookups(): { file: string; path: string; name: string | null }[] {
  const out: { file: string; path: string; name: string | null }[] = [];
  const lookup = /\b(?:lateExport|find)<[\s\S]*?>\(\s*"([^"]+)",\s*"([^"]+)"\s*,?\s*\)/g;
  const has = /\bhasLateModule\(\s*"([^"]+)"\s*\)/g;
  for (const file of sources(APP)) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(APP, file).split(path.sep).join("/");
    for (const m of text.matchAll(lookup))
      out.push({ file: rel, path: m[1] as string, name: m[2] as string });
    for (const m of text.matchAll(has)) out.push({ file: rel, path: m[1] as string, name: null });
  }
  return out;
}

/**
 * Lookups of modules another cluster has not ported yet. The action
 * handles the missing module (import-fonts-action.ts); drop the entry once
 * the module exists.
 */
const PENDING = [{ path: "fonts/font-db-loader.ts", name: "FontDBLoader" }];

afterEach(() => setLateModules({}));

describe("late-bound lookups (late.ts)", () => {
  it("finds the lookups in the sources", () => {
    const found = literalLookups();
    // Sanity check of the scan itself: these are known lookups.
    expect(found).toContainEqual({
      file: "shell/bootstrap.ts",
      path: "document/file-types.ts",
      name: "FileTypeList",
    });
    expect(found).toContainEqual({
      file: "shell/designer.ts",
      path: "menus/menu.ts",
      name: "Menu",
    });
    expect(found.length).toBeGreaterThan(40);
  });

  it("resolves every literal path and export name against the real modules", async () => {
    await loadAppModules();
    const missing = literalLookups()
      .filter((l) =>
        l.name === null ? !hasLateModule(l.path) : lateExport(l.path, l.name) === null,
      )
      .filter((l) => !PENDING.some((p) => p.path === l.path && p.name === l.name));
    expect(missing).toEqual([]);
  });

  it("finds the class of every action, sidebar and footer entry of the registration table", async () => {
    await loadAppModules();
    const missing = [...ACTION_TABLE, ...SIDEBAR_TABLE, ...FOOTER_TABLE]
      .filter((entry) => lateExport(entry.file, entry.exportName) === null)
      .map((entry) => `${entry.name}: ${entry.file} ${entry.exportName}`);
    expect(missing).toEqual([]);
  });
});

describe("the shortcut binder", () => {
  it("is the single-key fallback until boot installs Mousetrap", () => {
    setShortcutBinder(new SingleKeyBinder());
    installMousetrapBinder();
    expect(shortcutBinder()).toBeInstanceOf(MousetrapBinder);
  });
});
