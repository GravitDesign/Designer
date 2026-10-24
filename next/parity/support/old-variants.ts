import type { Page } from "@playwright/test";

/**
 * The old app with one of its own build switches turned off. A removed
 * feature that the old code could already switch off (REMOVED.md) is
 * compared this way: the old app without the feature must produce the
 * `.fixed` output the new app produces, so the difference between the
 * old expected file and `.fixed` is exactly what the old app itself
 * changes when the feature is gone (layout shifts and antialiasing
 * included).
 */
export interface OldVariant {
  /** The old bundle file to patch (served by the old server). */
  file: string;
  /** Each `from` must occur exactly once in the file. */
  replace: readonly (readonly [from: string, to: string])[];
  /** What the switch does, for the test titles and REMOVED.md. */
  title: string;
}

export const OLD_VARIANTS: Readonly<Record<string, OldVariant>> = {
  // designer.browser.dev.js module 10 (the app config): HAS_ANNOTATIONS
  // registers the annotations (comments) sidebar in the bootstrap
  // (module 1483) and turns on the commenting code paths.
  "no-annotations": {
    file: "designer.browser.dev.js",
    replace: [["(i.HAS_ANNOTATIONS = !0)", "(i.HAS_ANNOTATIONS = !1)"]],
    title: "without annotations (HAS_ANNOTATIONS off)",
  },
};

/** Applies a variant's replacements to the bundle text. */
export function patchBundle(text: string, variant: OldVariant): string {
  let out = text;
  for (const [from, to] of variant.replace) {
    const first = out.indexOf(from);
    if (first < 0 || out.indexOf(from, first + 1) >= 0) {
      throw new Error(`old variant: ${JSON.stringify(from)} must occur exactly once`);
    }
    out = out.slice(0, first) + to + out.slice(first + from.length);
  }
  return out;
}

/** Serves the patched bundle to this page from now on (reloads included). */
export async function installOldVariant(page: Page, name: string): Promise<void> {
  const variant = OLD_VARIANTS[name];
  if (!variant) throw new Error(`unknown old app variant ${name}`);
  await page.route(`**/${variant.file}`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: patchBundle(await response.text(), variant) });
  });
}
