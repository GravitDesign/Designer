import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenTypeUtil } from "../../engine/text/fonts/open-type-util.ts";
import { generateFormattedList, getFontFamily, parseNativeFonts } from "./font-style-naming.ts";
import { runNamingScenarios, type NamingEnv } from "./font-style-naming-scenarios.testing.ts";
import oldScenarios from "./font-style-naming-scenarios.json";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("font style naming, against the old module", () => {
  // font-style-naming-scenarios.json was recorded by running the same
  // scenarios on the old module 1200 in the old app page.
  it("names duplicate local fonts and groups families as before", async () => {
    let spy: ReturnType<typeof vi.spyOn> | null = null;
    const env: NamingEnv = {
      parseNativeFonts: parseNativeFonts as unknown as NamingEnv["parseNativeFonts"],
      generateFormattedList: generateFormattedList as unknown as NamingEnv["generateFormattedList"],
      stubGetFont(answer) {
        spy = vi
          .spyOn(OpenTypeUtil, "getFont")
          .mockImplementation(((...args: unknown[]) =>
            answer(new Uint8Array(args[3] as ArrayBuffer)[0] as number)) as never);
      },
      restoreGetFont() {
        if (spy) spy.mockRestore();
      },
    };
    const results = await runNamingScenarios(env);
    // Through JSON, as the recording went: undefined fields drop out.
    expect(JSON.parse(JSON.stringify(results))).toEqual(oldScenarios);
  });
});

describe("getFontFamily", () => {
  it("drops a variant suffix, then words from the end", () => {
    const known = new Set(["Fam", "Fam Book"]);
    const find = (name: string) => (known.has(name) ? name : undefined);
    expect(getFontFamily("Fam Book", find)).toBe("Fam Book");
    expect(getFontFamily("Fam Book variant 3", find)).toBe("Fam Book");
    expect(getFontFamily("Fam Light Italic", find)).toBe("Fam");
    expect(getFontFamily("Other", find)).toBeUndefined();
  });
});
