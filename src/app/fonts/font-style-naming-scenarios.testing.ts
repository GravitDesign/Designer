/**
 * Scenarios for parseNativeFonts and generateFormattedList. They run
 * against font-style-naming.ts in font-style-naming.test.ts and,
 * transpiled to plain JavaScript, against the old module 1200 in the old
 * app page, which recorded font-style-naming-scenarios.json. No imports:
 * the functions and a way to stub OpenTypeUtil.getFont come in `env`.
 */

export interface NamingEntry {
  family: string;
  weight: number;
  style: string;
  subfamily?: string;
  displayname?: string;
}

export interface NamingEnv {
  parseNativeFonts(fonts: unknown[]): Promise<Record<string, unknown>[]>;
  generateFormattedList(fonts: unknown[] | null): unknown;
  /** Replaces OpenTypeUtil.getFont: `answer` gets the file's first byte. */
  stubGetFont(answer: (id: number) => NamingEntry[] | null): void;
  restoreGetFont(): void;
}

export async function runNamingScenarios(env: NamingEnv): Promise<Record<string, unknown>> {
  /** File `id` holds the entries scripted for it. */
  const files: Record<number, NamingEntry[] | null> = {};
  env.stubGetFont((id) => {
    const entries = files[id];
    // A fresh copy: parseNativeFonts renames the entries it gets.
    return entries ? entries.map((entry) => ({ ...entry })) : null;
  });
  const local = (id: number, entries: NamingEntry[] | null) => {
    files[id] = entries;
    return {
      family: "local " + id,
      blob: () => Promise.resolve(new Blob([new Uint8Array([id])])),
    };
  };
  const clean = (fonts: Record<string, unknown>[]) =>
    fonts.map((font) => {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(font))
        out[key] = key === "blob" ? (font[key] as ArrayBuffer).byteLength : font[key];
      return out;
    });
  const out: Record<string, unknown> = {};
  try {
    out.empty = [
      await env.parseNativeFonts([]),
      await env.parseNativeFonts(null as unknown as unknown[]),
    ];
    out.subfamilyAppended = clean(
      await env.parseNativeFonts([
        local(1, [
          { family: "Fam", weight: 400, style: "N", subfamily: "Book", displayname: "Fam" },
        ]),
        local(2, [
          { family: "Fam", weight: 400, style: "N", subfamily: "Book", displayname: "Fam" },
        ]),
        local(3, [
          { family: "Fam", weight: 400, style: "N", subfamily: "Book", displayname: "Fam" },
        ]),
      ]),
    );
    out.variants = clean(
      await env.parseNativeFonts([
        local(4, [
          { family: "Var", weight: 700, style: "I" },
          { family: "Var", weight: 700, style: "I" },
          { family: "Var", weight: 700, style: "I" },
          { family: "Var", weight: 400, style: "I" },
        ]),
      ]),
    );
    out.subfamilyInName = clean(
      await env.parseNativeFonts([
        local(5, [
          { family: "Sub Light", weight: 300, style: "N", subfamily: "Light" },
          { family: "Sub Light", weight: 300, style: "N", subfamily: "Light" },
        ]),
        local(6, null),
        local(7, []),
      ]),
    );
    out.formatted = env.generateFormattedList([
      { family: "Grp Bold", weight: "700", style: "N", displayname: "Grp" },
      { family: "Grp", weight: "400", style: "N", displayname: "Grp", subfamily: "Regular" },
      { family: "Grp Regular", weight: "400", style: "I", displayname: "Grp" },
      { family: "Solo", weight: 500, style: "N" },
      { family: "Grp Bold", weight: "700", style: "I", displayname: "Grp" },
      { family: "", weight: "400", style: "N", displayname: "Empty" },
      { family: "Empty Long", weight: "400", style: "I", displayname: "Empty" },
    ]);
    out.formattedNull = env.generateFormattedList(null);
  } finally {
    env.restoreGetFont();
  }
  return out;
}
