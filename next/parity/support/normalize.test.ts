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
    expect(normalizeDocument({ lmd: 1792629989621 })).toEqual({ lmd: "<time>" });
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
