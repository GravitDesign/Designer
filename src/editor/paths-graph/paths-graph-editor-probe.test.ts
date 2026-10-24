// Runs paths-graph-editor-probe.ts against the port and compares every
// section with what the same probe returned in the old app's page
// (__fixtures__/old-paths-graph-editor.json).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { probePathsGraphEditor } from "./paths-graph-editor-probe.ts";

const here = dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-paths-graph-editor.json"), "utf8"),
) as Record<string, unknown>;

// The whole G namespace, as the parity bridge builds it.
function merge(modules: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports as Record<string, unknown>)) {
      if (typeof part === "object" && part !== null) Object.assign(out, part);
    }
  }
  return out;
}
const G = merge(import.meta.glob("../../parity/g/*.ts", { eager: true }));

// Painting the handles makes canvas images, which need a document.
const uninstall = installFakeDom();
let probed: Record<string, unknown>;
try {
  probed = probePathsGraphEditor(G, { Platform });
} finally {
  uninstall();
}
const actual = JSON.parse(JSON.stringify(probed)) as Record<string, unknown>;

describe("GPathsGraphEditor against the old editor", () => {
  it("covers the same sections", () => {
    expect(Object.keys(actual)).toEqual(Object.keys(expected));
  });
  for (const name of Object.keys(expected)) {
    it(name, () => {
      expect(actual[name]).toEqual(expected[name]);
    });
  }
});
