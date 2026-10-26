import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** The declarations of the stylesheet rule with exactly this selector. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(selector + " {");
  expect(start).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

describe("Advanced Export dialog stylesheet", () => {
  for (const theme of ["light", "dark"]) {
    it(`keeps the dialog inside a window taller than wide (${theme}, BUG-150)`, () => {
      const css = fs.readFileSync(
        path.resolve(import.meta.dirname, `../../../public/designer.browser.${theme}.css`),
        "utf8",
      );
      const body = rule(css, ".g-dialog.g-export-dialog > .g-dialog-content");
      const width = /(?:^|[;\s])width:\s*([^;]+);/.exec(body)?.[1]?.trim();
      // 120vh as before when the window is wide enough, never more than the
      // window's width less the dialog's 20px padding on each side.
      expect(width).toBe("min(120vh, calc(100vw - 40px))");
    });
  }
});
