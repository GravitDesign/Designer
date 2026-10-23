/* eslint-disable @typescript-eslint/no-explicit-any -- the programs run on the old classes too, through untyped namespaces */
/**
 * Recorded tests of the PDF writer below the scene level: fonts, images,
 * the worker split and small objects. Each program only uses its
 * arguments: `P`, the PDF classes under the names below (in the old app
 * they come from chunk.vendor.js modules 1422, 1216, 359, 1143, 1447,
 * 1223, 1144, 338, 1432, 1452, 1119, 1234, 1409, 1440, 1220, 1221, 1222,
 * 293 and 801), and `G`, the engine under its old names. So their source
 * text runs in the old app unchanged, which is where
 * pdf-writer.old-outputs.json was recorded.
 */

/** The PDF classes the programs use, by name. */
export interface PdfPrograms {
  PDFDocument: any;
  PDFCanvasContext: any;
  ColorSpaces: any;
  PDFByteStream: any;
  PDFFontSelection: any;
  PDFText: any;
  PDFGraphics: any;
  PDFString: any;
  PDFNumber: any;
  PDFWinAnsiEncoding: any;
  PDFRect: any;
  Rounding: any;
  PDFUnicode: any;
  PDFExtGState: any;
  PDFMediaBox: any;
  PDFLineDash: any;
  PDFLineCap: any;
  PDFLineJoin: any;
  numberFormat: any;
}

/** A pixel source as the image programs use it: the pixels the canvas really returned. */
export interface PixelData {
  width: number;
  height: number;
  /** RGBA bytes as base64. */
  pixels: string;
}

/**
 * The file as text with the dates fixed and long streams (embedded font
 * files) replaced by their length and a checksum, so recordings stay
 * small but still catch any changed byte.
 */
export function pdfSkeleton(latin: string): string {
  latin = latin.replace(/\(D:[0-9]{14}([^)]*)\)/g, "(D:20000101000000$1)");
  return latin.replace(/stream\n([\s\S]*?)\nendstream/g, (match, body: string) => {
    if (body.length < 4000) return match;
    let sum = 0;
    for (let i = 0; i < body.length; i++) sum = (sum * 31 + body.charCodeAt(i)) >>> 0;
    return "stream\n<" + body.length + " bytes, checksum " + sum + ">\nendstream";
  });
}

/** Writes the document and returns its bytes as base64 with the dates fixed. */
export function writeDocumentBase64(P: PdfPrograms, document: any): string {
  const output = new P.PDFByteStream();
  document.write(output);
  const bytes: ArrayLike<number> = output.asArray();
  let latin = "";
  for (let i = 0; i < bytes.length; i++) latin += String.fromCharCode(bytes[i] as number);
  latin = latin.replace(/\(D:[0-9]{14}([^)]*)\)/g, "(D:20000101000000$1)");
  return btoa(latin);
}

/**
 * Embeds a font (from `fontBytes`, base64) as `family` and writes text in
 * it: words in two sizes and colors, kerning pairs, a ligature, accents,
 * spaces only, letter spacing. Also returns what encode gives for a few
 * strings, written out.
 */
export function fontProgram(
  P: PdfPrograms,
  G: any,
  data: { fontBytes: string; family: string; texts: string[] },
  skeleton: (latin: string) => string,
): { document: string; encoded: string[] } {
  const binary = atob(data.fontBytes);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const font = G.GOpenTypeFont.create(data.family, "N", 400, bytes.buffer);
  const document = new P.PDFDocument({
    version: 1.7,
    compress: true,
    colorSpace: P.ColorSpaces.RGB,
    user: "Test",
    title: "Fonts",
  });
  document.newPage(300, 200);
  const graphics = document.createGraphics();
  const resource = document.body.getFontResource(font);
  const encoded: string[] = [];
  const writeTokens = (tokens: unknown[]) => {
    const output = new P.PDFByteStream();
    for (const token of tokens) {
      if (typeof token === "number") output.write(token);
      else (token as { write(o: unknown): void }).write(output);
      output.writeSpace();
    }
    const out: ArrayLike<number> = output.asArray();
    let latin = "";
    for (let i = 0; i < out.length; i++) latin += String.fromCharCode(out[i] as number);
    return btoa(latin);
  };
  let y = 20;
  data.texts.forEach((text, index) => {
    encoded.push(
      writeTokens(
        resource.getFont().encode(text, {
          letterSpacing: index % 2,
          kerning: true,
          features: { liga: true, rlig: true, frac: false, stylisticSet: null },
        }),
      ),
    );
    const word = new P.PDFText.Word({
      text,
      mode: index % 3,
      lineWidth: 1.5,
      charSpacing: index % 2 ? 0.5 : 0,
      wordSpacing: 0,
      fontReference: new P.PDFFontSelection(resource, index % 2 ? 12 : 18),
      fillColor: null,
      strokeColor: null,
      origin: new G.GTransform(1, 0, 0, 1, 10, (y += 20)),
      textLigatures: true,
      textFractions: false,
    });
    graphics.addText(word);
  });
  document.popGraphics();
  return { document: skeleton(atob(writeDocumentBase64(P, document))), encoded };
}

/**
 * Image XObjects from pixels: deflated with an alpha mask, JPEG (`jpeg`),
 * with a separate mask image, in RGB or CMYK. `canvas(data)` makes a
 * pixel source from recorded pixels; `workers` are passed to the document.
 */
export async function imageProgram(
  P: PdfPrograms,
  G: any,
  data: {
    colorSpace: string;
    images: { source: PixelData; jpeg: boolean; mask?: PixelData | null }[];
    jpegQuality?: number;
  },
  canvas: (pixels: PixelData) => unknown,
  workers?: unknown[],
): Promise<string> {
  const document = new P.PDFDocument({
    version: 1.7,
    compress: true,
    colorSpace: P.ColorSpaces[data.colorSpace],
    workers,
    user: "Test",
    title: "Images",
    jpegQuality: data.jpegQuality,
  });
  document.newPage(200, 200);
  const context = new P.PDFCanvasContext(document);
  let y = 0;
  for (const image of data.images) {
    const resource = context._createImageResource(
      canvas(image.source),
      image.jpeg,
      image.mask ? canvas(image.mask) : null,
    );
    const graphics = new P.PDFGraphics(document);
    graphics.add("1 0 0 1 0 " + (y += 10) + " cm");
    graphics.add("/" + resource.getName() + " Do");
    context.getGraphics().add(graphics);
  }
  context.finish();
  await document.ready();
  const result = writeDocumentBase64(P, document);
  document.finish();
  void G;
  return result;
}

/** Small outputs of the writer's building blocks, as JSON. */
export function objectsProgram(P: PdfPrograms, G: any): Record<string, unknown> {
  const write = (object: { write(o: unknown): void }) => {
    const output = new P.PDFByteStream();
    object.write(output);
    const out: ArrayLike<number> = output.asArray();
    let latin = "";
    for (let i = 0; i < out.length; i++) latin += String.fromCharCode(out[i] as number);
    return latin;
  };
  const numbers = [0, -0, 1 / 3, -2 / 3, 1e-5, 123456.123456, 0.00005, 2.5, 1e21, -1e-7];
  const document = new P.PDFDocument({ version: 1.7, compress: true, user: "Test", title: "x" });
  document.newPage(100, 50);
  const blendModes = [
    "normal",
    "multiply",
    "color-dodge",
    "hard-light",
    "luminosity",
    "linear_burn",
    "darker",
  ];
  return {
    normalized: numbers.map((n) => P.PDFNumber.normalizeNumber(n)),
    hex: [0, 15, 255, 4096, 65535, 70000].map((n) => P.PDFNumber.toHex(n, 4)),
    textStrings: ["plain", "a(b)c", "back\\slash", "Ümlaut €", "tab\there"].map((s) =>
      write(P.PDFString.newFromString(s)),
    ),
    byteStrings: [
      [72, 105, 40, 41, 92],
      [8, 9, 10, 12, 13, 200],
    ].map((b) => write(P.PDFString.newFromBytes(b))),
    winAnsi: ["Hello", "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ", "ÀÉÎõü", "Ā日"].map((s) =>
      write(new P.PDFWinAnsiEncoding().encode(s)[0]),
    ),
    winAnsiToUnicode: [128, 65, 159, 300].map((c) => new P.PDFWinAnsiEncoding().toUnicode(c)),
    utf16: P.PDFUnicode.encodeToUTF16BE([65, 0x263a, 0xd83d, 0xde00]),
    utf32: P.PDFUnicode.encodeToUTF32(0xd83d, 0xde00),
    tiles: [
      [0, 0, 500, 300],
      [0, 0, 2100, 1100],
      [5, 5, 1024, 1025],
    ].map(([x, y, w, h]) => {
      const tiles = P.PDFRect.tile(new G.GRect(x, y, w, h));
      return tiles
        ? tiles.map((t: any) => [t.getX(), t.getY(), t.getWidth(), t.getHeight()])
        : null;
    }),
    rounding: [
      P.Rounding.round(1.23456),
      P.Rounding.round([1.23456, 2.5], 1),
      P.Rounding.round(NaN),
    ],
    numberFormat: [P.numberFormat.formatNumber(3.14159), P.numberFormat.formatMatrix([1.0005, 2])],
    gstates: blendModes.map((mode) =>
      write(new P.PDFExtGState({ opacity: 1.5, operation: 3, blendMode: mode })),
    ),
    mediaBox: [
      write(new P.PDFMediaBox(5, 7, 100, 50)),
      new P.PDFMediaBox(0, 0, 100, 50).relativeY(12.34567),
    ],
    dashes: [[], [0, 0], [4, 0], [3, 1.5]].map((d) => write(new P.PDFLineDash(d))),
    caps: [0, 1, 2].map((c) => write(new P.PDFLineCap(c))),
    joins: [0, 1, 2].map((j) => write(new P.PDFLineJoin(j))),
    colors: [
      "#ff8000",
      "rgba(10,20,30,0.5)",
      "rgb(255, 255, 255)",
      "cmyk(0.1,0.2,0.3,0.4)",
      "cmyk(0,1,0,0,0.25)",
    ].map((c) => [
      write(P.ColorSpaces.RGB.parseColor(c)),
      write(P.ColorSpaces.CMYK.parseColor(c)),
      write(P.ColorSpaces.GRAY.parseColor(c)),
    ]),
    relativeY: document.relativeY(10.123456),
    pdfPoint: (() => {
      const p = document.convertToPDFPoint(new G.GPoint(3, 4));
      return [p.getX(), p.getY()];
    })(),
    pdfMatrix: document.convertToPDFCoordinates(new G.GTransform(2, 0, 0, 3, 4, 5)).getMatrix(),
  };
}

/** The alpha of the generated test pixels. */
export type TestAlpha = "opaque" | "ramp" | "holes";

/**
 * Deterministic RGBA test pixels (base64): a color ramp, opaque, with an
 * alpha ramp, or with fully transparent holes.
 */
export function testPixels(width: number, height: number, seed: number, alpha: TestAlpha): string {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = (x * 7 + seed * 13) & 255;
      data[i + 1] = (y * 5 + seed * 29) & 255;
      data[i + 2] = ((x + y) * 3 + seed) & 255;
      data[i + 3] =
        alpha === "opaque"
          ? 255
          : alpha === "ramp"
            ? Math.min(255, Math.round((x / width) * 300))
            : (x * y + seed) % 7 === 0
              ? 0
              : 255;
    }
  }
  let latin = "";
  for (let i = 0; i < data.length; i++) latin += String.fromCharCode(data[i] as number);
  return btoa(latin);
}
