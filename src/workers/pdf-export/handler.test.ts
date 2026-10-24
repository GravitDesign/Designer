// The PDF export worker's message handling (old public/pdfexport.worker.js,
// module 1366): request checks, and the answers of the three commands.
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { handlePDFWorkerRequest } from "./handler.ts";
import type { PDFWorkerRequest } from "./protocol.ts";

interface Answer {
  message: Record<string, unknown>;
  transfer: Transferable[];
}

function handle(request: Partial<PDFWorkerRequest> & Record<string, unknown>): Answer[] {
  const answers: Answer[] = [];
  handlePDFWorkerRequest(request as PDFWorkerRequest, (message, transfer) => {
    answers.push({ message: message as Record<string, unknown>, transfer });
  });
  return answers;
}

/** Packed RGBA pixels (red in the low byte), as the canvas buffer holds them. */
function rgba(...pixels: [number, number, number, number][]): ArrayBuffer {
  const bytes = new Uint8Array(pixels.length * 4);
  pixels.forEach((p, i) => bytes.set(p, i * 4));
  return bytes.buffer;
}

describe("PDF export worker", () => {
  it("rejects bad requests the way the old worker did", () => {
    expect(() => handle({ command: "raster" })).toThrow('Missing "uuid" parameter');
    expect(() => handle({ uuid: "u", command: "raster" })).toThrow(
      'Missing PDF "colorspace" parameter',
    );
    expect(() => handle({ uuid: "u", command: "raster", colorspace: "LAB" })).toThrow(
      'Unsupported PDF "colorspace" #LAB',
    );
    expect(() => handle({ uuid: "u", command: "raster", colorspace: "RGB" })).toThrow(
      'Missing image "dataBuffer" parameter',
    );
    expect(() =>
      handle({ uuid: "u", command: "raster", colorspace: "RGB", dataBuffer: new ArrayBuffer(0) }),
    ).toThrow('Empty image "dataBuffer"');
    expect(() =>
      handle({ uuid: "u", command: "raster", colorspace: "RGB", dataBuffer: rgba([1, 2, 3, 4]) }),
    ).toThrow('Missing "range" parameter');
    expect(() =>
      handle({
        uuid: "u",
        command: "raster",
        colorspace: "RGB",
        dataBuffer: rgba([1, 2, 3, 4]),
        range: { start: 2, end: 2 },
      }),
    ).toThrow('Invalid "range"');
    expect(() => handle({ uuid: "u", command: "jpegencoder", colorspace: "GRAY" })).toThrow(
      'Unsupported JPEG "colorspace" #GRAY',
    );
    expect(() =>
      handle({ uuid: "u", command: "jpegencoder", colorspace: "RGBA", buffer: rgba([1, 2, 3, 4]) }),
    ).toThrow("Invalid image size #undefinedxundefined");
    expect(() => handle({ uuid: "u", command: "zipencoder" })).toThrow(
      'Missing ZIP "buffer" parameter',
    );
    expect(handle({ uuid: "u", command: "unknown" as never })).toEqual([]);
  });

  it("rasters a slice to the color space, with a mask unless the caller has one", () => {
    const pixels = rgba([10, 20, 30, 255], [40, 50, 60, 128]);
    const [withMask] = handle({
      uuid: "a",
      index: 3,
      command: "raster",
      colorspace: "RGB",
      dataBuffer: pixels,
      range: { start: 0, end: 2 },
    });
    const message = (withMask as Answer).message;
    expect(message.uuid).toBe("a");
    expect(message.index).toBe(3);
    expect([...new Uint8Array(message.imageBuffer as ArrayBuffer)]).toEqual([
      10, 20, 30, 40, 50, 60,
    ]);
    expect([...new Uint8Array(message.smaskBuffer as ArrayBuffer)]).toEqual([255, 128]);
    expect(message.hasTransparency).toBe(true);
    expect((withMask as Answer).transfer).toHaveLength(2);
    // Sic: hasMask means the caller brings the mask, so none is made.
    const [noMask] = handle({
      uuid: "b",
      index: 0,
      command: "raster",
      colorspace: "GRAY",
      dataBuffer: pixels,
      range: { start: 0, end: 2 },
      hasMask: true,
    });
    expect((noMask as Answer).message.smaskBuffer).toBeNull();
    expect([...new Uint8Array((noMask as Answer).message.imageBuffer as ArrayBuffer)]).toEqual([
      255, 128,
    ]);
    expect((noMask as Answer).message.hasTransparency).toBe(false);
  });

  it("deflates for zipencoder and JPEG-encodes for jpegencoder", () => {
    const data = new TextEncoder().encode("stream stream stream").buffer;
    const [zip] = handle({ uuid: "z", command: "zipencoder", buffer: data });
    expect(
      inflateSync(new Uint8Array((zip as Answer).message.buffer as ArrayBuffer)).toString(),
    ).toBe("stream stream stream");
    const [jpeg] = handle({
      uuid: "j",
      command: "jpegencoder",
      colorspace: "RGBA",
      buffer: rgba([255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [9, 9, 9, 255]),
      width: 2,
      height: 2,
      quality: 80,
    });
    const bytes = new Uint8Array((jpeg as Answer).message.buffer as ArrayBuffer);
    expect([bytes[0], bytes[1], bytes[bytes.length - 2], bytes[bytes.length - 1]]).toEqual([
      0xff, 0xd8, 0xff, 0xd9,
    ]);
  });
});
