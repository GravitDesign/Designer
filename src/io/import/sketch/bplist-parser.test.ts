import { describe, expect, it } from "vitest";
import plists from "./__fixtures__/plists.json" with { type: "json" };
import recorded from "./__fixtures__/old-outputs.json" with { type: "json" };
import { BPlistParser, type PlistValue } from "./bplist-parser.ts";
import { base64ToBytes } from "./base64-bytes.ts";
import { NSArchiver } from "./ns-archiver.ts";

/** Data as byte lists and dates as times, the way the recording wrote them. */
function plain(value: PlistValue): unknown {
  if (value instanceof DataView)
    return { $data: Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  if (value instanceof Date) return { $date: value.getTime() };
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) out[key] = plain(value[key] as PlistValue);
    return out;
  }
  return value;
}

const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

describe("BPlistParser", () => {
  for (const [name, base64] of Object.entries(plists)) {
    it(`parses ${name} like the old parser`, () => {
      const expected = (recorded.bplist as Record<string, { ok?: unknown }>)[name]?.ok;
      expect(plain(new BPlistParser().parse(bytes(base64)))).toEqual(expected);
    });
  }

  it("keeps the old 32-bit integer arithmetic for 8-byte integers", () => {
    const value = new BPlistParser().parse(bytes(plists.types)) as Record<string, number>;
    expect(value.int64).toBe(705032704);
    expect(value.neg).toBe(-1);
  });

  it("rejects data without the bplist magic", () => {
    expect(() => new BPlistParser().parse(new TextEncoder().encode("notaplist-at-all"))).toThrow(
      "Invalid binary plist. Expected 'bplist' at offset 0.",
    );
  });

  it("does not change the caller's bytes when it swaps UTF-16 strings", () => {
    const input = bytes(plists.types);
    const copy = input.slice();
    new BPlistParser().parse(input);
    expect(input).toEqual(copy);
  });
});

describe("NSArchiver", () => {
  const archive = NSArchiver.from(plists.keyed) as NSArchiver;

  it("reads the root and references", () => {
    expect(archive.top()).toEqual(recorded.archiver.top);
    expect(archive.getByRef(2)).toBe(recorded.archiver.byRef2);
  });

  it("returns null for base64 of the wrong length and for other values", () => {
    expect(NSArchiver.from("abc")).toBe(recorded.archiver.fromOdd);
    expect(NSArchiver.from(5)).toBe(recorded.archiver.fromNumber);
  });

  it("turns an archived string of floats into 0..255 values", () => {
    const data = new DataView(new TextEncoder().encode("xx0.1 0.25 1 0.5").buffer, 2);
    expect(NSArchiver.toByte(data)).toEqual(recorded.archiver.toByte);
  });

  it("maps NS.keys to NS.objects", () => {
    const keyed = new NSArchiver({
      $top: { root: 1 },
      $objects: ["$null", { "NS.keys": [2, 3], "NS.objects": [4, 5] }, "a", "b", 1, "two"],
    });
    expect(keyed.toMap(keyed.top())).toEqual({ a: 1, b: "two" });
  });
});

describe("base64ToBytes", () => {
  for (const [text, result] of Object.entries(recorded.base64)) {
    it(`decodes ${JSON.stringify(text)} like base64-js`, () => {
      expect(Array.from(base64ToBytes(text))).toEqual((result as { ok: number[] }).ok);
    });
  }

  it("throws for a length that is not a multiple of 4", () => {
    expect(() => base64ToBytes("abc")).toThrow("Invalid string. Length must be a multiple of 4");
  });
});
