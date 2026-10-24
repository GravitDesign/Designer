// The PDF info dictionary (old module 1426): default strings and the
// creation date in local time with the zone offset, "+" east of UTC and
// "-" west of it and at UTC.
import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFByteStream } from "./byte-stream.ts";
import { PDFInfo } from "./info.ts";

let previousZone: string | undefined;

function infoText(zone: string, utc: number, author?: string, title?: string): string {
  previousZone = previousZone ?? process.env.TZ ?? "";
  process.env.TZ = zone;
  vi.useFakeTimers();
  vi.setSystemTime(utc);
  const output = new PDFByteStream();
  new PDFInfo(author, title).write(output);
  return Buffer.from(output.asArray()).toString("utf8");
}

afterEach(() => {
  vi.useRealTimers();
  if (previousZone !== undefined) {
    if (previousZone === "") delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
  previousZone = undefined;
});

describe("PDFInfo", () => {
  it("writes the defaults and the time in UTC as -00'00'", () => {
    expect(infoText("UTC", Date.UTC(2024, 0, 2, 3, 4, 5))).toBe(
      "<</Author (Gravit Designer)/Producer (Gravit Designer PDF Exporter)/Creator (Gravit Designer)" +
        "/Title (Untitled)/CreationDate (D:20240102030405-00'00')/ModDate (D:20240102030405-00'00')>>",
    );
  });

  it("uses local time with + east of UTC, minutes included", () => {
    expect(infoText("Asia/Kolkata", Date.UTC(2024, 0, 2, 3, 4, 5), "Ann (B)", "T\\x")).toContain(
      "/Author (Ann \\(B\\))/Producer (Gravit Designer PDF Exporter)/Creator (Gravit Designer)" +
        "/Title (T\\\\x)/CreationDate (D:20240102083405+05'30')",
    );
  });

  it("uses local time with - west of UTC", () => {
    expect(infoText("America/New_York", Date.UTC(2024, 0, 2, 3, 4, 5))).toContain(
      "/CreationDate (D:20240101220405-05'00')/ModDate (D:20240101220405-05'00')",
    );
  });
});
