import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { OLD_TYPE_IDS, OLD_TYPE_ID_ALIASES, lookupOldTypeId } from "./type-ids.ts";

const recorded = JSON.parse(
  fs.readFileSync(
    new URL("../../../parity/expected/engine-model/type-ids/classes.json", import.meta.url),
    "utf8",
  ),
) as Record<string, number>;

describe("type-ids.ts", () => {
  it("matches the recording from the old app", () => {
    expect(OLD_TYPE_IDS).toEqual(recorded);
  });

  it("resolves every alias to a recorded class", () => {
    for (const [alias, name] of Object.entries(OLD_TYPE_ID_ALIASES)) {
      expect(lookupOldTypeId(alias)).toBe(recorded[name]);
    }
  });
});
