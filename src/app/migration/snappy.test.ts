import { describe, expect, it } from "vitest";
import { snappyDecompress } from "./snappy.ts";

const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

describe("snappyDecompress", () => {
  it("reads a literal", () => {
    // length 5, literal of 5 bytes (tag (5-1)<<2)
    expect(text(snappyDecompress(Uint8Array.from([5, 4 << 2, 104, 101, 108, 108, 111])))).toBe(
      "hello",
    );
  });

  it("repeats with an overlapping 1-byte-offset copy", () => {
    // "a", then copy 9 bytes from offset 1: ((9-4)<<2)|1, offset 1
    expect(text(snappyDecompress(Uint8Array.from([10, 0, 97, (5 << 2) | 1, 1])))).toBe(
      "aaaaaaaaaa",
    );
  });

  it("copies with 2- and 4-byte offsets", () => {
    // "abc", copy 3 from offset 3 (2-byte offset), copy 2 from offset 6 (4-byte offset)
    const input = Uint8Array.from([
      8,
      2 << 2,
      97,
      98,
      99,
      ((3 - 1) << 2) | 2,
      3,
      0,
      ((2 - 1) << 2) | 3,
      6,
      0,
      0,
      0,
    ]);
    expect(text(snappyDecompress(input))).toBe("abcabcab");
  });

  it("reads a literal whose length follows the tag", () => {
    const body = "x".repeat(100);
    const input = Uint8Array.from([
      100,
      60 << 2, // one length byte follows
      99, // length - 1
      ...new TextEncoder().encode(body),
    ]);
    expect(text(snappyDecompress(input))).toBe(body);
  });

  it("rejects a copy before the start and a wrong length", () => {
    expect(() => snappyDecompress(Uint8Array.from([4, (0 << 2) | 1, 1]))).toThrow(/bad copy/);
    expect(() => snappyDecompress(Uint8Array.from([6, 4 << 2, 104, 101, 108, 108, 111]))).toThrow(
      /length mismatch/,
    );
  });
});
