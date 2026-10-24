import { afterEach, describe, expect, it, vi } from "vitest";
import { Locale } from "../../engine/core/locale/locale.ts";
import { appKey, appString } from "./strings.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app strings (UI-I18N-001, UI-I18N-009)", () => {
  it("reads the English table whatever the browser language", () => {
    expect(appString("GCommonNames", "text.cancel")).toBe("Cancel");
    expect(appString("GBCP47LanguageTags", "text.lang.ab")).toBe("Abkhazian");
    expect(Locale.get(appKey("GCommonNames", "text.cancel"))).toBe("Cancel");
  });

  it("gives the default or undefined for missing keys", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(appString("GCommonNames", "no-such-key", "x")).toBe("x");
    expect(appString("GCommonNames", "no-such-key")).toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });
});
