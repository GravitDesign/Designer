// The writer below the scene level against what the old classes wrote
// for the same calls (pdf-writer.old-outputs.json, recorded in the old app
// with the programs of test-programs.ts): number, string and color
// formatting, graphics state and line style operators, embedded fonts
// (Type0/CIDFontType2 with widths and ToUnicode), image XObjects (deflated
// with soft masks, JPEG, CMYK) and the split of image work over workers.
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ASSETS_ROOT } from "../../../../server/paths.ts";
import { Color } from "../../../engine/color/color.ts";
import { IccProfile } from "../../../engine/color/icc-profile.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { handlePDFWorkerRequest } from "../../../workers/pdf-export/handler.ts";
import type { PDFWorkerRequest } from "../../../workers/pdf-export/protocol.ts";
import { PDFByteStream } from "./byte-stream.ts";
import { ColorSpaces } from "./color-spaces.ts";
import { PDFGraphics } from "./content-stream.ts";
import { PDFLineDash } from "./dash.ts";
import { PDFExtGState } from "./ext-gstate.ts";
import { PDFFontSelection } from "./font-key.ts";
import { PDFLineCap } from "./line-cap.ts";
import { PDFLineJoin } from "./line-join.ts";
import { PDFMediaBox } from "./media-box.ts";
import { numberFormat } from "./number-format.ts";
import { PDFCanvasContext } from "./pdf-canvas.ts";
import { PDFDocument } from "./pdf-document.ts";
import { PDFNumber } from "./pdf-number.ts";
import { PDFRect } from "./pdf-rect.ts";
import { PDFString } from "./pdf-string.ts";
import { Rounding } from "./rounding.ts";
import {
  fontProgram,
  imageProgram,
  objectsProgram,
  pdfSkeleton,
  testPixels,
  type PdfPrograms,
  type PixelData,
  type TestAlpha,
} from "./test-programs.ts";
import { PDFText } from "./text-writer.ts";
import { PDFUnicode } from "./unicode.ts";
import { PDFWinAnsiEncoding } from "./winansi-encoding.ts";
import recorded from "./pdf-writer.old-outputs.json" with { type: "json" };

const P: PdfPrograms = {
  PDFDocument,
  PDFCanvasContext,
  ColorSpaces,
  PDFByteStream,
  PDFFontSelection,
  PDFText,
  PDFGraphics,
  PDFString,
  PDFNumber,
  PDFWinAnsiEncoding,
  PDFRect,
  Rounding,
  PDFUnicode,
  PDFExtGState,
  PDFMediaBox,
  PDFLineDash,
  PDFLineCap,
  PDFLineJoin,
  numberFormat,
};

const G = { GTransform: Transform, GRect: Rect, GPoint: Point, GOpenTypeFont: OpenTypeFont };

interface RecordedPixels {
  width: number;
  height: number;
  seed: number;
  alpha: TestAlpha;
  pixels?: string;
}

interface RecordedImageCase {
  id: string;
  colorSpace: string;
  workers: number;
  jpegQuality?: number;
  images: { jpeg: boolean; source: RecordedPixels; mask: RecordedPixels | null }[];
  expected: string;
}

const fixture = recorded as unknown as {
  font: { family: string; texts: string[] };
  objects: Record<string, unknown>;
  fonts: { document: string; encoded: string[] };
  images: RecordedImageCase[];
};

/** The pixels as the old app's canvas gave them back. */
function pixelData(data: RecordedPixels): PixelData {
  return {
    width: data.width,
    height: data.height,
    pixels: data.pixels ?? testPixels(data.width, data.height, data.seed, data.alpha),
  };
}

/** A pixel source that returns the recorded pixels, as a canvas would. */
function pixelSource(data: PixelData) {
  const bytes = Uint8ClampedArray.from(Buffer.from(data.pixels, "base64"));
  return {
    width: data.width,
    height: data.height,
    getContext: () => ({ getImageData: () => ({ data: bytes.slice() }) }),
  };
}

type Listener = (event: unknown) => void;

/** A worker running the export worker's handler in this thread, answering asynchronously. */
class InThreadWorker {
  private readonly listeners: Record<string, Listener[]> = { message: [], error: [] };
  terminated = false;

  postMessage(message: unknown): void {
    setTimeout(() => {
      try {
        handlePDFWorkerRequest(message as PDFWorkerRequest, (answer) => {
          for (const listener of this.listeners.message?.slice() ?? []) listener({ data: answer });
        });
      } catch (error) {
        for (const listener of this.listeners.error?.slice() ?? []) listener(error);
      }
    }, 0);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners[type]?.push(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    const list = this.listeners[type] ?? [];
    const index = list.indexOf(listener);
    if (index >= 0) list.splice(index, 1);
  }

  terminate(): void {
    this.terminated = true;
  }
}

let previousProfile: typeof Color.currentCMYKProfile = null;
let previousZone: string | undefined;

beforeAll(() => {
  previousZone = process.env.TZ;
  process.env.TZ = "UTC";
  // The old app had the SWOP profile loaded when recording.
  previousProfile = Color.currentCMYKProfile;
  const bytes = new Uint8Array(
    fs.readFileSync(path.join(ASSETS_ROOT, "data/icc/USWebCoatedSWOP.icc")),
  );
  new IccProfile().read(bytes.slice().buffer, (profile) => {
    Color.currentCMYKProfile = profile;
  });
});

afterAll(() => {
  if (previousZone === undefined) delete process.env.TZ;
  else process.env.TZ = previousZone;
  Color.currentCMYKProfile = previousProfile;
});

describe("PDF writer against the old classes", () => {
  it("formats numbers, strings, colors, graphics states and line styles", () => {
    // JSON drops -0 and the like the same way on both sides.
    expect(JSON.parse(JSON.stringify(objectsProgram(P, G)))).toEqual(fixture.objects);
  });

  it("embeds a font with widths and a ToUnicode map and writes text in it", () => {
    const fontBytes = fs
      .readFileSync(path.join(ASSETS_ROOT, "font/OpenSans-Regular.ttf"))
      .toString("base64");
    const result = fontProgram(
      P,
      G,
      { fontBytes, family: fixture.font.family, texts: fixture.font.texts },
      pdfSkeleton,
    );
    expect(result.encoded).toEqual(fixture.fonts.encoded);
    expect(result.document).toBe(fixture.fonts.document);
  });

  for (const testCase of fixture.images) {
    it(`writes image XObjects: ${testCase.id}`, async () => {
      const workers = testCase.workers
        ? Array.from({ length: testCase.workers }, () => new InThreadWorker())
        : undefined;
      const document = await imageProgram(
        P,
        G,
        {
          colorSpace: testCase.colorSpace,
          jpegQuality: testCase.jpegQuality,
          images: testCase.images.map((image) => ({
            jpeg: image.jpeg,
            source: pixelData(image.source),
            mask: image.mask ? pixelData(image.mask) : null,
          })),
        },
        (data) => pixelSource(data),
        workers,
      );
      expect(pdfSkeleton(Buffer.from(document, "base64").toString("latin1"))).toBe(
        testCase.expected,
      );
      // The document stops its workers when it is done.
      if (workers) expect(workers.every((worker) => worker.terminated)).toBe(true);
    });
  }
});
