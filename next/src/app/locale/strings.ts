// App string lookup. The strings live in ./data/en.json (designer.browser.dev.js
// module 814), loaded into the engine's Designer locale at startup; the app
// has English strings only, a few engine overrides aside (QUESTIONS.md Q-001).
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";

/**
 * The string for an old class name and key ("GCommonNames", "text.cancel").
 * A missing key logs an error and gives the default (undefined without one),
 * like GLocale.getValue.
 */
export function appString(
  className: string,
  key: string,
  defaultValue?: string,
): string | undefined {
  return Locale.getValue(className, key, defaultValue);
}

/** A key to pass around and resolve later with Locale.get. */
export function appKey(className: string, key: string): LocaleKey {
  return new LocaleKey(className, key);
}
