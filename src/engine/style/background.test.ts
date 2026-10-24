import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { getTypeId } from "../core/object.ts";
import { Background } from "./background.ts";
import { Pattern } from "./pattern.ts";

describe("Background", () => {
  const recorded = (
    JSON.parse(
      fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/colors/patterns.json"), "utf8"),
    ) as { background: { serialized: string; css: string; average: number[] } }
  ).background;

  it("is the B pattern without payload", () => {
    expect(getTypeId(Background)).toBe(24);
    expect(Pattern.serialize(new Background())).toBe(recorded.serialized);
    expect(Pattern.deserialize("B#")).toBeInstanceOf(Background);
  });

  it("shows the old stripes and a transparent average", () => {
    expect(new Background().asCSSBackground()).toBe(recorded.css);
    expect(new Background().getAverageColor()).toEqual(recorded.average);
    expect(new Background().toString()).toBe("[Object GBackground]");
  });

  it("equals any other background, and null only null", () => {
    expect(Background.equals(new Background(), new Background())).toBe(true);
    expect(Background.equals(null, null)).toBe(true);
    expect(Background.equals(null, new Background())).toBe(false);
    expect(Background.equals(new Background(), null)).toBe(false);
  });
});
