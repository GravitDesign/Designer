import { describe, expect, it } from "vitest";
import { normalizeDocument, type Json } from "./normalize.ts";

describe("normalizeDocument", () => {
  it("renames random ids in order of first appearance and follows references", () => {
    const doc: Json = {
      "@": "scene",
      "@id": "Xy12ab",
      __ids: ["hashA", "hashB"],
      $: [
        {
          "@": "page",
          "@id": "Pq9",
          $: [{ "@": "annlst", "@id": "An1", pgid: "Pq9", aid: "An1" }],
          "#": "hashA",
        },
      ],
    };
    expect(normalizeDocument(doc)).toEqual({
      "@": "scene",
      "@id": "id1",
      __ids: ["id2", "id3"],
      $: [
        {
          "@": "page",
          "@id": "id4",
          $: [{ "@": "annlst", "@id": "id5", pgid: "id4", aid: "id5" }],
          "#": "id2",
        },
      ],
    });
  });

  it("gives two documents with different random ids the same result", () => {
    const a: Json = { "@id": "aaa", $: [{ "@id": "bbb", ref: "aaa" }] };
    const b: Json = { "@id": "zzz", $: [{ "@id": "yyy", ref: "zzz" }] };
    expect(normalizeDocument(a)).toEqual(normalizeDocument(b));
  });

  it("keeps a difference in reference structure visible", () => {
    const a: Json = { "@id": "aaa", $: [{ "@id": "bbb", ref: "aaa" }] };
    const b: Json = { "@id": "zzz", $: [{ "@id": "yyy", ref: "yyy" }] };
    expect(normalizeDocument(a)).not.toEqual(normalizeDocument(b));
  });

  it("renames ids inside JSON stored as a string", () => {
    const doc: Json = { "@id": "n1", graph: JSON.stringify({ owner: "n1", x: 1 }) };
    expect(normalizeDocument(doc)).toEqual({
      "@id": "id1",
      graph: JSON.stringify({ owner: "id1", x: 1 }),
    });
  });

  it("replaces the save time but keeps its type", () => {
    expect(normalizeDocument({ lmd: Date.now() - 1000 })).toEqual({ lmd: "<time>" });
    expect(normalizeDocument({ lmd: 1000 })).toEqual({ lmd: 1000 });
    expect(normalizeDocument({ lmd: "now" })).toEqual({ lmd: "now" });
  });

  it("leaves numbers and ordinary strings alone", () => {
    const doc: Json = { "@id": "a", trf: [100, 0, 0, 60, 200, 160.5], name: "Page 1" };
    expect(normalizeDocument(doc)).toEqual({
      "@id": "id1",
      trf: [100, 0, 0, 60, 200, 160.5],
      name: "Page 1",
    });
  });

  it("drops the requested keys", () => {
    expect(normalizeDocument({ _preview: "data:...", a: 1 }, { dropKeys: ["_preview"] })).toEqual({
      a: 1,
    });
  });
});

describe("normalizeDocument, references beyond id keys", () => {
  it("keeps ids that came from a loaded file", () => {
    const doc: Json = { "@id": "fromFile", $: [{ "@id": "fresh", ref: "fromFile" }] };
    expect(normalizeDocument(doc, { keepIds: ["fromFile"] })).toEqual({
      "@id": "fromFile",
      $: [{ "@id": "id1", ref: "fromFile" }],
    });
  });

  it("shows an app that regenerated a loaded id", () => {
    const loaded: Json = { "@id": "fromFile" };
    const regenerated: Json = { "@id": "newOne" };
    expect(normalizeDocument(regenerated, { keepIds: ["fromFile"] })).not.toEqual(
      normalizeDocument(loaded, { keepIds: ["fromFile"] }),
    );
  });

  it("follows compact anchor references", () => {
    const doc: Json = { "@id": "a", pts: [[1, 2, "#", "anc1"]], other: "anc1" };
    expect(normalizeDocument(doc)).toEqual({
      "@id": "id1",
      pts: [[1, 2, "#", "id2"]],
      other: "id2",
    });
  });

  it("renames ids used as object keys", () => {
    const doc: Json = { "@id": "a", _links: { a: ["b"] }, $: [{ "@id": "b" }] };
    expect(normalizeDocument(doc)).toEqual({
      "@id": "id1",
      _links: { id1: ["id2"] },
      $: [{ "@id": "id2" }],
    });
  });

  it("renames ids in prefixed pattern strings and dictionary urls", () => {
    const doc: Json = {
      "@id": "a",
      _pt: 'N#{"@":"noise","@id":"n1"}',
      dict: [{ uuid: "u1" }],
      src: "dictionary://u1",
    };
    expect(normalizeDocument(doc)).toEqual({
      "@id": "id1",
      _pt: 'N#{"@":"noise","@id":"id2"}',
      dict: [{ uuid: "id3" }],
      src: "dictionary://id3",
    });
  });

  it("keeps the formatting of nested JSON text", () => {
    const spaced: Json = { "@id": "a", nested: '{ "owner": "a" }' };
    const compact: Json = { "@id": "a", nested: '{"owner":"a"}' };
    expect(normalizeDocument(spaced)).not.toEqual(normalizeDocument(compact));
  });
});

describe("storeOutput for json", () => {
  it("keeps -0, NaN, infinities and undefined", async () => {
    const { storeOutput } = await import("./runner.ts");
    const out = storeOutput(
      { id: "x", covers: [], kind: "json" },
      { a: -0, b: NaN, c: Infinity, d: -Infinity, e: undefined, f: [0, -0] },
    ).toString("utf8");
    expect(JSON.parse(out)).toEqual({
      a: "<-0>",
      b: "<NaN>",
      c: "<Infinity>",
      d: "<-Infinity>",
      e: "<undefined>",
      f: [0, "<-0>"],
    });
  });
});

describe("normalizeDocument, deeply nested JSON", () => {
  it("renames ids two levels of JSON-in-strings deep", () => {
    const inner = JSON.stringify({ atPath: "p1" });
    const doc: Json = { "@id": "p1", reftxt: JSON.stringify({ data: inner }) };
    expect(normalizeDocument(doc)).toEqual({
      "@id": "id1",
      reftxt: JSON.stringify({ data: JSON.stringify({ atPath: "id1" }) }),
    });
  });
});

describe("parity exceptions", () => {
  it("loads one file per fixed bug and every .fixed file exists", async () => {
    const { EXCEPTIONS } = await import("./exceptions.ts");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { EXPECTED_ROOT } = await import("./env.ts");
    expect(EXCEPTIONS.length).toBeGreaterThan(0);
    for (const e of EXCEPTIONS) {
      const dir = path.dirname(path.join(EXPECTED_ROOT, e.scenario));
      const base = path.basename(e.scenario);
      const fixed = fs.readdirSync(dir).some((f) => f.startsWith(`${base}.fixed.`));
      expect(fixed, `${e.scenario} has no .fixed file for ${e.bug}`).toBe(true);
    }
  });

  it("documents every BUG entry in BUGS-FIXED.md and every DROP entry in REMOVED.md", async () => {
    const { EXCEPTIONS, documentFor, isDocumented } = await import("./exceptions.ts");
    const ids = [...new Set(EXCEPTIONS.map((e) => e.bug))];
    expect(ids.some((id) => id.startsWith("DROP-"))).toBe(true);
    for (const id of ids) expect(isDocumented(id), `${id} is not in ${documentFor(id)}`).toBe(true);
  });

  it("sends each id prefix to its document", async () => {
    const { documentFor, isDocumented } = await import("./exceptions.ts");
    expect(documentFor("BUG-002")).toBe("BUGS-FIXED.md");
    expect(documentFor("DROP-001")).toBe("REMOVED.md");
    expect(() => documentFor("FIX-1")).toThrow();
    // A DROP id is looked up in REMOVED.md only, not in BUGS-FIXED.md.
    expect(isDocumented("DROP-999")).toBe(false);
  });
});

describe("page origins", () => {
  it("replaces each app's own origin with one placeholder in stored output", async () => {
    const { storeOutput } = await import("./runner.ts");
    const scenario = { id: "x", covers: [], kind: "json" as const };
    const video = (origin: string) => ({ video: origin + "/rich-tooltip-video/Pen_Too.mp4" });
    const old = storeOutput(scenario, video("http://127.0.0.1:3190"), "http://127.0.0.1:3190");
    const next = storeOutput(scenario, video("http://127.0.0.1:3260"), "http://127.0.0.1:3260");
    expect(next.equals(old)).toBe(true);
    expect(JSON.parse(old.toString("utf8"))).toEqual({
      video: "<origin>/rich-tooltip-video/Pen_Too.mp4",
    });
  });

  it("keeps other hosts, ports and schemes", async () => {
    const { normalizeOrigin } = await import("./normalize.ts");
    const origin = "http://127.0.0.1:3190";
    expect(normalizeOrigin("ws://127.0.0.1:3190/license", origin)).toBe(
      "ws://127.0.0.1:3190/license",
    );
    expect(normalizeOrigin("http://127.0.0.1:3191/x", origin)).toBe("http://127.0.0.1:3191/x");
    expect(normalizeOrigin("http://127.0.0.1:3190/x", undefined)).toBe("http://127.0.0.1:3190/x");
  });
});
