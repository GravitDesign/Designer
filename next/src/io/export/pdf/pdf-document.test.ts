// GPDFDocument (old module 1422): jobs and the ready promise, abort, the
// workers' lifetime, and the file structure (header, numbering, xref
// offsets, trailer) of a written document.
import { inflateSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Point } from "../../../engine/math/point.ts";
import { PDFByteStream } from "./byte-stream.ts";
import { PDFDocument, type PDFExportWorker } from "./pdf-document.ts";
import { PDFFontStream } from "./font-stream.ts";

function newDocument(workers?: PDFExportWorker[]): PDFDocument {
  return new PDFDocument({ version: 1.7, compress: true, user: "A", title: "T", workers });
}

function fakeWorker(): PDFExportWorker & { terminated: number } {
  return {
    terminated: 0,
    postMessage() {},
    addEventListener() {},
    removeEventListener() {},
    terminate() {
      this.terminated++;
    },
  };
}

function written(document: PDFDocument): string {
  const output = new PDFByteStream();
  document.write(output);
  return Buffer.from(output.asArray()).toString("latin1");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PDFDocument jobs", () => {
  it("is ready at once without jobs", async () => {
    await expect(newDocument().ready()).resolves.toBeUndefined();
  });

  it("waits for every job begun before ready, then resolves", async () => {
    const document = newDocument();
    const first = document.beginJob("first");
    const second = document.beginJob("second");
    let resolved = false;
    const ready = document.ready().then(() => (resolved = true));
    first.done();
    await Promise.resolve();
    expect(resolved).toBe(false);
    second.done();
    await ready;
    expect(resolved).toBe(true);
    expect(document.getLastJob()).toBe(second);
  });

  it("fails with the error of a failed job", async () => {
    const document = newDocument();
    const job = document.beginJob("encode");
    const ready = document.ready();
    job.failed(new Error("broken"));
    await expect(ready).rejects.toThrow("broken");
    expect(job.getStatus()).toBe(PDFDocument.Job.Status.FAILED);
  });

  it("only moves a job forward (done can still turn into failed)", async () => {
    const document = newDocument();
    const job = document.beginJob();
    const ready = document.ready();
    job.failed(new Error("first"));
    job.done();
    expect(job.getStatus()).toBe(PDFDocument.Job.Status.FAILED);
    await expect(ready).rejects.toThrow("first");
    const later = newDocument();
    const other = later.beginJob();
    other.done();
    const failing = later.ready();
    other.failed(new Error("late"));
    expect(other.getStatus()).toBe(PDFDocument.Job.Status.FAILED);
    // Already resolved: the late failure changes nothing.
    await expect(failing).resolves.toBeUndefined();
    expect(JSON.parse(job.toString())).toEqual({ name: "Unknown", status: 3 });
  });

  it("aborts: rejects, stops writers and workers", async () => {
    const worker = fakeWorker();
    const document = newDocument([worker]);
    document.newPage(10, 10);
    const output = new PDFByteStream();
    document._writer = output;
    document.beginJob("raster");
    const ready = document.ready();
    document.abort(new Error("stop"));
    await expect(ready).rejects.toThrow("stop");
    expect(document.isAbort()).toBe(true);
    expect(worker.terminated).toBe(1);
    expect(() => output.write("x")).toThrow("AbortError");
  });

  it("finish stops the workers and drops the body", () => {
    const worker = fakeWorker();
    const document = newDocument([worker]);
    expect(document.hasConcurrencyFeature()).toBe(true);
    document.finish();
    expect(worker.terminated).toBe(1);
    expect(document.body).toBeUndefined();
    expect(newDocument([]).hasConcurrencyFeature()).toBe(false);
  });
});

describe("PDFDocument file structure", () => {
  it("numbers pages tree 1, info 2, catalog 3, then contents, resources, page", () => {
    const document = newDocument();
    document.newPage(320, 200);
    const text = written(document);
    expect(text.startsWith("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<</Type /Pages/Kids [6 0 R]/Count 1>>")).toBe(
      true,
    );
    expect(text).toContain("3 0 obj\n<</Type /Catalog/Pages 1 0 R>>\nendobj");
    expect(text).toContain(
      "6 0 obj\n<</Type /Page/Contents 4 0 R/Resources 5 0 R/MediaBox [0 0 320 200]/Parent 1 0 R>>\nendobj",
    );
    expect(text).toContain("trailer\n<</Root 3 0 R/Info 2 0 R/Size 7>>\nstartxref\n");
    expect(text.endsWith("%%EOF")).toBe(true);
  });

  it("writes xref offsets that point at the objects", () => {
    const document = newDocument();
    document.newPage(100, 100);
    document.newPage(50, 50);
    const text = written(document);
    const startxref = Number(/startxref\n(\d+)\n%%EOF$/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 5)).toBe("xref\n");
    const rows = text.slice(startxref).split("\n").slice(3, 12);
    rows.forEach((row, index) => {
      expect(row).toMatch(/^\d{10} 00000 n $/);
      const offset = Number(row.slice(0, 10));
      expect(text.slice(offset).startsWith(index + 1 + " 0 obj\n")).toBe(true);
    });
  });

  it("always deflates page contents and starts them with the page origin", () => {
    const document = newDocument();
    document.newPage(100, 100);
    document.setPageOrigin(new Point(5, -7));
    document.add("0 0 m");
    const text = written(document);
    const match = /4 0 obj\n<<\/Length (\d+)\/Filter \/FlateDecode>>stream\n/.exec(text);
    expect(match).not.toBeNull();
    const start = (match?.index ?? 0) + (match?.[0].length ?? 0);
    const data = Buffer.from(text.slice(start, start + Number(match?.[1])), "latin1");
    expect(inflateSync(data).toString("latin1")).toBe("1 0 0 1 5 -7 cm\n0 0 m");
  });

  it("deflates page contents even without compress (kept old quirk)", () => {
    const document = new PDFDocument({ version: 1.7, compress: false, user: "A", title: "T" });
    document.newPage(100, 100);
    document.add("0 0 m");
    expect(written(document)).toMatch(/4 0 obj\n<<\/Length \d+\/Filter \/FlateDecode>>stream\n/);
  });

  it("writes version 1.7 whatever version it is given (kept old quirk)", () => {
    const document = new PDFDocument({ version: 1.4, compress: true, user: "A", title: "T" });
    document.newPage(100, 100);
    expect(written(document).startsWith("%PDF-1.7\n")).toBe(true);
  });

  it("gives an embedded font file the compressed length as /Length1 (kept old quirk)", () => {
    const font = new Uint8Array(4000).map((_, i) => i % 7);
    const stream = new PDFFontStream(font, true);
    const output = new PDFByteStream();
    stream.write(output);
    const text = Buffer.from(output.asArray()).toString("latin1");
    const length = Number(/\/Length (\d+)/.exec(text)?.[1]);
    expect(length).toBeLessThan(font.length);
    expect(text).toContain("/Length1 " + length);
  });

  it("flips y against the page height", () => {
    const document = newDocument();
    document.newPage(100, 80);
    expect(document.relativeY(30.123456)).toBe(49.8765);
  });
});
