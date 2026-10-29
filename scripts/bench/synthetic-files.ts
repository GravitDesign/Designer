// Generated files for the large import cases: SVG, PDF, EPS and Sketch,
// written here byte by byte (a minimal PDF writer, a binary property list
// encoder and a store-only zip writer), and small PNG textures. Seeded:
// the same arguments give the same bytes on every run.
import zlib from "node:zlib";
import { PNG } from "pngjs";
import { random } from "./synthetic.ts";

// ---------------------------------------------------------------------------
// Images

/** A PNG of `w` x `h` with the colour `pixel(x, y)` returns as [r, g, b, a]. */
export function png(w: number, h: number, pixel: (x: number, y: number) => number[]): Buffer {
  const image = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r = 0, g = 0, b = 0, a = 255] = pixel(x, y);
      const i = (y * w + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = a;
    }
  }
  return PNG.sync.write(image);
}

/** Raw RGB bytes of the same patterns as `textures`, for PDF images. */
function pattern(kind: number, x: number, y: number, size: number): number[] {
  const u = x / size;
  const v = y / size;
  switch (kind % 4) {
    case 0:
      return ((x >> 3) + (y >> 3)) % 2 ? [230, 80, 40] : [250, 230, 200];
    case 1:
      return [Math.round(255 * u), Math.round(255 * v), 160];
    case 2:
      return (x + y) % 12 < 6 ? [30, 90, 200] : [200, 230, 255];
    default: {
      const d = Math.hypot(u - 0.5, v - 0.5);
      return [Math.round(255 * (1 - d)), 120, Math.round(255 * d)];
    }
  }
}

/** Four small PNGs (checks, gradient, stripes, rings) of `size` x `size`. */
export function texturePngs(size = 64): Buffer[] {
  return [0, 1, 2, 3].map((k) => png(size, size, (x, y) => pattern(k, x, y, size)));
}

export const dataUrl = (bytes: Buffer, type = "image/png"): string =>
  `data:${type};base64,${bytes.toString("base64")}`;

// ---------------------------------------------------------------------------
// SVG

/**
 * An SVG of `count` elements in groups of 50: paths, rects, circles,
 * ellipses, texts (three in ten) and embedded PNG images (one in forty),
 * filled with colours and with linear and radial gradients.
 */
export function richSvg(count: number): string {
  const r = random(13);
  const w = Math.round(4000 * Math.sqrt(count / 3000));
  const h = Math.round(w * 0.75);
  const images = texturePngs(32).map((b) => dataUrl(b));
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<defs>`,
  ];
  for (let g = 0; g < 20; g++) {
    parts.push(
      `<linearGradient id="l${g}" x1="0" y1="0" x2="1" y2="${(g % 5) / 4}">` +
        `<stop offset="0" stop-color="hsl(${g * 18},70%,50%)"/>` +
        `<stop offset="0.5" stop-color="hsl(${g * 18 + 60},70%,60%)" stop-opacity="0.6"/>` +
        `<stop offset="1" stop-color="hsl(${g * 18 + 120},70%,60%)"/></linearGradient>`,
      `<radialGradient id="r${g}" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.3">` +
        `<stop offset="0" stop-color="#fff"/>` +
        `<stop offset="1" stop-color="hsl(${g * 18 + 200},60%,40%)"/></radialGradient>`,
    );
  }
  parts.push(`</defs>`);
  const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod".split(" ");
  for (let i = 0; i < count; i++) {
    if (i % 50 === 0) parts.push(i ? `</g><g id="grp${i}">` : `<g id="grp0">`);
    const x = (r() * (w - 100)).toFixed(1);
    const y = (r() * (h - 100)).toFixed(1);
    const pick = r();
    const fill =
      pick < 0.15
        ? `url(#l${i % 20})`
        : pick < 0.3
          ? `url(#r${i % 20})`
          : `hsl(${Math.floor(r() * 360)},60%,55%)`;
    const kind =
      i % 40 === 39
        ? "image"
        : (["path", "rect", "circle", "text", "ellipse", "text", "rect", "path", "text", "circle"][
            i % 10
          ] as string);
    if (kind === "path") {
      let d = `M${x} ${y}`;
      for (let k = 0; k < 5; k++) {
        d += ` C${(+x + r() * 80).toFixed(1)} ${(+y + r() * 80).toFixed(1)} ${(+x + r() * 80).toFixed(1)} ${(+y + r() * 80).toFixed(1)} ${(+x + r() * 80).toFixed(1)} ${(+y + r() * 80).toFixed(1)}`;
      }
      parts.push(`<path d="${d} Z" fill="${fill}" stroke="#222" stroke-width="1"/>`);
    } else if (kind === "rect") {
      parts.push(
        `<rect x="${x}" y="${y}" width="${(20 + r() * 60).toFixed(1)}" height="${(20 + r() * 60).toFixed(1)}" rx="4" fill="${fill}" stroke="#333" stroke-width="${(r() * 3).toFixed(1)}"/>`,
      );
    } else if (kind === "circle") {
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${(5 + r() * 30).toFixed(1)}" fill="${fill}" opacity="0.8"/>`,
      );
    } else if (kind === "ellipse") {
      parts.push(
        `<ellipse cx="${x}" cy="${y}" rx="${(10 + r() * 40).toFixed(1)}" ry="${(5 + r() * 20).toFixed(1)}" fill="${fill}" transform="rotate(${Math.floor(r() * 90)} ${x} ${y})"/>`,
      );
    } else if (kind === "text") {
      const text = Array.from(
        { length: 2 + Math.floor(r() * 5) },
        () => words[Math.floor(r() * words.length)],
      ).join(" ");
      parts.push(
        `<text x="${x}" y="${y}" font-family="Open Sans" font-size="${10 + Math.floor(r() * 14)}" fill="${pick < 0.3 ? fill : "#333"}">${text} ${i}</text>`,
      );
    } else {
      parts.push(
        `<image x="${x}" y="${y}" width="64" height="64" xlink:href="${images[i % images.length]}"/>`,
      );
    }
  }
  parts.push(`</g></svg>`);
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// PDF

/** A minimal PDF writer: numbered objects, an xref table and a trailer. */
class PdfWriter {
  private readonly objects: Buffer[] = [];

  /** Adds an object; returns its number. */
  add(body: string | Buffer): number {
    this.objects.push(typeof body === "string" ? Buffer.from(body, "latin1") : body);
    return this.objects.length;
  }

  /** A Flate-compressed stream object. */
  stream(data: string | Buffer, dict = ""): number {
    const bytes = zlib.deflateSync(typeof data === "string" ? Buffer.from(data, "latin1") : data);
    return this.add(
      Buffer.concat([
        Buffer.from(
          `<< /Length ${bytes.length} /Filter /FlateDecode ${dict}>>\nstream\n`,
          "latin1",
        ),
        bytes,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );
  }

  /** Reserves a number for an object written later with `set`. */
  reserve(): number {
    this.objects.push(Buffer.alloc(0));
    return this.objects.length;
  }

  set(n: number, body: string): void {
    this.objects[n - 1] = Buffer.from(body, "latin1");
  }

  bytes(root: number): Buffer {
    const header = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1");
    const chunks: Buffer[] = [header];
    let length = header.length;
    const offsets: number[] = [];
    this.objects.forEach((body, i) => {
      offsets.push(length);
      const chunk = Buffer.concat([
        Buffer.from(`${i + 1} 0 obj\n`, "latin1"),
        body,
        Buffer.from("\nendobj\n", "latin1"),
      ]);
      chunks.push(chunk);
      length += chunk.length;
    });
    let xref = `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size ${this.objects.length + 1} /Root ${root} 0 R >>\nstartxref\n${length}\n%%EOF\n`;
    chunks.push(Buffer.from(xref, "latin1"));
    return Buffer.concat(chunks);
  }
}

/**
 * A PDF of `pages` A4 landscape pages, each with `paths` filled and
 * stroked curves (some half transparent), `texts` text runs in Helvetica
 * and Times, four RGB images and four axial and radial gradient shadings.
 */
export function bigPdf(pages: number, paths: number, texts: number): Buffer {
  const r = random(17);
  const pdf = new PdfWriter();
  const catalog = pdf.reserve();
  const pagesObj = pdf.reserve();
  const f1 = pdf.add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const f2 = pdf.add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>",
  );
  const gs = pdf.add("<< /Type /ExtGState /ca 0.5 /CA 0.5 >>");
  const images: number[] = [];
  for (let k = 0; k < 4; k++) {
    const size = 64;
    const raw = Buffer.alloc(size * size * 3);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const [cr = 0, cg = 0, cb = 0] = pattern(k, x, y, size);
        raw.set([cr, cg, cb], (y * size + x) * 3);
      }
    images.push(
      pdf.stream(
        raw,
        `/Type /XObject /Subtype /Image /Width ${size} /Height ${size} /ColorSpace /DeviceRGB /BitsPerComponent 8 `,
      ),
    );
  }
  const shadings: number[] = [];
  for (let k = 0; k < 4; k++) {
    const fn = `<< /FunctionType 2 /Domain [0 1] /C0 [${k * 0.25} 0.4 0.9] /C1 [1 ${0.2 + k * 0.2} 0.1] /N 1 >>`;
    shadings.push(
      pdf.add(
        k % 2
          ? `<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [60 60 0 60 60 60] /Function ${fn} /Extend [true true] >>`
          : `<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 120 0] /Function ${fn} /Extend [true true] >>`,
      ),
    );
  }
  const resources =
    `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << /GS1 ${gs} 0 R >>` +
    ` /XObject << ${images.map((n, i) => `/Im${i + 1} ${n} 0 R`).join(" ")} >>` +
    ` /Shading << ${shadings.map((n, i) => `/Sh${i + 1} ${n} 0 R`).join(" ")} >> >>`;
  const W = 842;
  const H = 595;
  const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod".split(" ");
  const kids: number[] = [];
  const n = (v: number): string => v.toFixed(1);
  for (let p = 0; p < pages; p++) {
    const ops: string[] = [];
    for (let i = 0; i < paths; i++) {
      const x = r() * (W - 60);
      const y = r() * (H - 60);
      let d = `${n(x)} ${n(y)} m`;
      for (let k = 0; k < 3; k++) {
        d += ` ${n(x + r() * 50)} ${n(y + r() * 50)} ${n(x + r() * 50)} ${n(y + r() * 50)} ${n(x + r() * 50)} ${n(y + r() * 50)} c`;
      }
      const color = `${r().toFixed(3)} ${r().toFixed(3)} ${r().toFixed(3)}`;
      const paint = i % 3 === 0 ? "B" : i % 3 === 1 ? "f" : "S";
      const alpha = i % 10 === 0;
      ops.push(
        `${alpha ? "q /GS1 gs " : ""}${color} rg 0.2 0.2 0.2 RG ${(0.5 + r() * 2).toFixed(1)} w ${d} h ${paint}${alpha ? " Q" : ""}`,
      );
    }
    for (let i = 0; i < texts; i++) {
      const text = Array.from(
        { length: 2 + Math.floor(r() * 5) },
        () => words[Math.floor(r() * words.length)],
      ).join(" ");
      ops.push(
        `BT /F${(i % 2) + 1} ${8 + Math.floor(r() * 10)} Tf ${r().toFixed(2)} 0.1 0.3 rg ${n(r() * (W - 150))} ${n(r() * (H - 20))} Td (${text} ${p}.${i}) Tj ET`,
      );
    }
    for (let k = 0; k < 4; k++) {
      ops.push(`q 80 0 0 80 ${n(r() * (W - 80))} ${n(r() * (H - 80))} cm /Im${k + 1} Do Q`);
      const x = r() * (W - 120);
      const y = r() * (H - 120);
      ops.push(`q 1 0 0 1 ${n(x)} ${n(y)} cm 0 0 120 120 re W n /Sh${k + 1} sh Q`);
    }
    const content = pdf.stream(ops.join("\n"));
    kids.push(
      pdf.add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${content} 0 R /Resources ${resources} >>`,
      ),
    );
  }
  pdf.set(
    pagesObj,
    `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`,
  );
  pdf.set(catalog, `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
  return pdf.bytes(catalog);
}

// ---------------------------------------------------------------------------
// EPS

/**
 * An EPS of `count` objects: filled and stroked curves, one in ten a text
 * in Helvetica, one in a hundred a 16 x 16 RGB image and one in a hundred
 * an axial or radial gradient (shfill).
 */
export function richEps(count: number): string {
  const r = random(19);
  const W = 2000;
  const H = 1500;
  const lines = [
    "%!PS-Adobe-3.0 EPSF-3.0",
    `%%BoundingBox: 0 0 ${W} ${H}`,
    "%%LanguageLevel: 3",
    "%%EndComments",
  ];
  const words = "lorem ipsum dolor sit amet consectetur adipiscing elit".split(" ");
  for (let i = 0; i < count; i++) {
    const x = r() * (W - 60);
    const y = r() * (H - 60);
    if (i % 10 === 5) {
      const text = Array.from(
        { length: 2 + Math.floor(r() * 4) },
        () => words[Math.floor(r() * words.length)],
      ).join(" ");
      lines.push(
        `/Helvetica findfont ${8 + Math.floor(r() * 12)} scalefont setfont ${r().toFixed(3)} 0.2 0.3 setrgbcolor ${x.toFixed(1)} ${y.toFixed(1)} moveto (${text} ${i}) show`,
      );
    } else if (i % 100 === 17) {
      // The data as a procedure returning a hex string: the interpreter has
      // no ASCIIHexDecode filter (an unknown filter ends the import).
      let hex = "";
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          for (const c of pattern(i, px * 4, py * 4, 64)) hex += c.toString(16).padStart(2, "0");
        }
      }
      lines.push(
        `gsave ${x.toFixed(1)} ${y.toFixed(1)} translate 48 48 scale`,
        `16 16 8 [16 0 0 -16 0 16] { <${hex}> } false 3 colorimage grestore`,
      );
    } else if (i % 100 === 67) {
      const fn = `<< /FunctionType 2 /Domain [0 1] /C0 [1 ${r().toFixed(2)} 0] /C1 [0 0.2 ${r().toFixed(2)}] /N 1 >>`;
      lines.push(
        `gsave newpath ${x.toFixed(1)} ${y.toFixed(1)} moveto 60 0 rlineto 0 60 rlineto -60 0 rlineto closepath clip`,
        i % 200 === 67
          ? `<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${x.toFixed(1)} 0 ${(x + 60).toFixed(1)} 0] /Function ${fn} /Extend [true true] >> shfill`
          : `<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [${(x + 30).toFixed(1)} ${(y + 30).toFixed(1)} 0 ${(x + 30).toFixed(1)} ${(y + 30).toFixed(1)} 30] /Function ${fn} >> shfill`,
        "grestore",
      );
    } else {
      lines.push(`${r().toFixed(3)} ${r().toFixed(3)} ${r().toFixed(3)} setrgbcolor`);
      let path = `newpath ${x.toFixed(1)} ${y.toFixed(1)} moveto`;
      for (let k = 0; k < 4; k++) {
        path += ` ${(x + r() * 60).toFixed(1)} ${(y + r() * 60).toFixed(1)} ${(x + r() * 60).toFixed(1)} ${(y + r() * 60).toFixed(1)} ${(x + r() * 60).toFixed(1)} ${(y + r() * 60).toFixed(1)} curveto`;
      }
      lines.push(`${path} closepath gsave fill grestore 0 setgray 0.5 setlinewidth stroke`);
    }
  }
  lines.push("showpage", "%%EOF");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Binary property lists (for the archived strings of Sketch texts)

class Uid {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}

class Real {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}

type Plist =
  null | boolean | number | string | Real | Uid | Uint8Array | Plist[] | { [key: string]: Plist };

/** Encodes `root` as a binary property list ("bplist00"). */
export function bplist(root: Plist): Buffer {
  const flat: Plist[] = [];
  const children = new Map<number, number[]>();
  const keyRefs = new Map<number, number[]>();
  const visit = (value: Plist): number => {
    const index = flat.length;
    flat.push(value);
    if (Array.isArray(value)) {
      children.set(index, value.map(visit));
    } else if (
      value &&
      typeof value === "object" &&
      !(value instanceof Uid) &&
      !(value instanceof Real) &&
      !(value instanceof Uint8Array)
    ) {
      const keys = Object.keys(value);
      keyRefs.set(
        index,
        keys.map((k) => visit(k)),
      );
      children.set(
        index,
        keys.map((k) => visit(value[k] as Plist)),
      );
    }
    return index;
  };
  visit(root);
  const refSize = flat.length < 256 ? 1 : flat.length < 65536 ? 2 : 4;
  const uint = (v: number, size: number): number[] => {
    const out: number[] = [];
    for (let i = size - 1; i >= 0; i--) out.push(Math.floor(v / 2 ** (8 * i)) & 0xff);
    return out;
  };
  const count = (marker: number, n: number): number[] =>
    n < 15 ? [marker | n] : [marker | 0xf, 0x13, ...uint(n, 8)];
  const parts: Buffer[] = [Buffer.from("bplist00", "latin1")];
  let offset = 8;
  const offsets: number[] = [];
  flat.forEach((value, index) => {
    offsets.push(offset);
    let bytes: number[] | Buffer;
    if (value === null) bytes = [0x00];
    else if (value === false) bytes = [0x08];
    else if (value === true) bytes = [0x09];
    else if (typeof value === "number") bytes = [0x13, ...uint(value, 8)];
    else if (value instanceof Real) {
      const b = Buffer.alloc(9);
      b[0] = 0x23;
      b.writeDoubleBE(value.value, 1);
      bytes = b;
    } else if (value instanceof Uid) bytes = [0x83, ...uint(value.value, 4)];
    else if (value instanceof Uint8Array)
      bytes = Buffer.from([...count(0x40, value.length), ...value]);
    else if (typeof value === "string") {
      // eslint-disable-next-line no-control-regex -- ASCII check
      if (/^[\x00-\x7f]*$/.test(value))
        bytes = Buffer.from([...count(0x50, value.length), ...Buffer.from(value, "latin1")]);
      else {
        const utf16 = Buffer.from(value, "utf16le").swap16();
        bytes = Buffer.from([...count(0x60, value.length), ...utf16]);
      }
    } else if (Array.isArray(value)) {
      const refs = children.get(index) ?? [];
      bytes = [...count(0xa0, refs.length), ...refs.flatMap((ref) => uint(ref, refSize))];
    } else {
      const keys = keyRefs.get(index) ?? [];
      const refs = children.get(index) ?? [];
      bytes = [
        ...count(0xd0, keys.length),
        ...keys.flatMap((ref) => uint(ref, refSize)),
        ...refs.flatMap((ref) => uint(ref, refSize)),
      ];
    }
    const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    parts.push(buffer);
    offset += buffer.length;
  });
  const offsetSize = 4;
  const table = Buffer.from(offsets.flatMap((o) => uint(o, offsetSize)));
  const trailer = Buffer.from([
    0,
    0,
    0,
    0,
    0,
    0,
    offsetSize,
    refSize,
    ...uint(flat.length, 8),
    ...uint(0, 8),
    ...uint(offset, 8),
  ]);
  return Buffer.concat([...parts, table, trailer]);
}

/** An NSKeyedArchiver object table, as Sketch 49 stores attributed strings ($objects[0] is $null). */
class Archive {
  readonly objects: Plist[] = ["$null"];

  add(value: Plist): Uid {
    this.objects.push(value);
    return new Uid(this.objects.length - 1);
  }

  map(entries: Record<string, Plist>): { "NS.keys": Uid[]; "NS.objects": Plist[] } {
    return {
      "NS.keys": Object.keys(entries).map((k) => this.add(k)),
      "NS.objects": Object.values(entries),
    };
  }

  encode(build: (a: Archive) => Plist): { _class: string; _archive: string } {
    const root = this.add(null);
    this.objects[root.value] = build(this);
    const data = bplist({
      $archiver: "NSKeyedArchiver",
      $objects: this.objects,
      $top: { root },
      $version: 100000,
    });
    return { _class: "MSArchiveHeader", _archive: data.toString("base64") };
  }
}

/** A Sketch 49 attributed string of one run: `text` in `font` at `size`, colour `rgba` ("r g b a"). */
function attributedString(
  text: string,
  font: string,
  size: number,
  rgba: string,
  align: number,
): Record<string, unknown> {
  const archive = new Archive().encode((a) => {
    const desc = a.add(
      a.map({ NSFontNameAttribute: a.add(font), NSFontSizeAttribute: a.add(new Real(size)) }),
    );
    const fontAttr = a.add({ NSFontDescriptorAttributes: desc, NSFontDescriptorOptions: 0 });
    const attributes = a.map({
      MSAttributedStringFontAttribute: fontAttr,
      NSColor: a.add({ NSColorSpace: 1, NSRGB: Buffer.from(rgba, "latin1") }),
      NSParagraphStyle: a.add({ NSAlignment: align }),
    });
    return { NSString: a.add(text), NSAttributes: a.add(attributes) };
  });
  return { _class: "MSAttributedString", archivedAttributedString: archive };
}

// ---------------------------------------------------------------------------
// Zip (store only)

/** A zip archive of `files`, stored uncompressed, dated 2020-01-01. */
export function zipStore(files: [string, Buffer][]): Buffer {
  const date = ((2020 - 1980) << 9) | (1 << 5) | 1;
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// ---------------------------------------------------------------------------
// Sketch

/**
 * A Sketch 49 file with one page of `artboards` artboards, each with
 * `groups` groups of `perGroup` layers: rectangles and ovals with colour
 * and gradient fills, borders and shadows, texts (one in six) and bitmaps
 * (one in twenty, four PNGs in images/).
 */
export function bigSketch(artboards: number, groups: number, perGroup: number): Buffer {
  const r = random(29);
  const rect = (x: number, y: number, w: number, h: number): Record<string, unknown> => ({
    _class: "rect",
    constrainProportions: false,
    x,
    y,
    width: w,
    height: h,
  });
  const color = (cr: number, cg: number, cb: number, a = 1): Record<string, unknown> => ({
    _class: "color",
    red: cr,
    green: cg,
    blue: cb,
    alpha: a,
  });
  const point = (x: number, y: number): string => `{${x}, ${y}}`;
  const corner = (x: number, y: number): Record<string, unknown> => ({
    _class: "curvePoint",
    cornerRadius: 0,
    curveFrom: point(x, y),
    curveMode: 1,
    curveTo: point(x, y),
    hasCurveFrom: false,
    hasCurveTo: false,
    point: point(x, y),
  });
  const k = 0.2238;
  const ovalPoints = [
    [0.5, 0, 0.5 + k, 0, 0.5 - k, 0],
    [1, 0.5, 1, 0.5 + k, 1, 0.5 - k],
    [0.5, 1, 0.5 - k, 1, 0.5 + k, 1],
    [0, 0.5, 0, 0.5 - k, 0, 0.5 + k],
  ].map(([px = 0, py = 0, fx = 0, fy = 0, tx = 0, ty = 0]) => ({
    _class: "curvePoint",
    cornerRadius: 0,
    curveFrom: point(fx, fy),
    curveMode: 2,
    curveTo: point(tx, ty),
    hasCurveFrom: true,
    hasCurveTo: true,
    point: point(px, py),
  }));
  const layer = (
    cls: string,
    id: string,
    name: string,
    frame: Record<string, unknown>,
    extra: Record<string, unknown>,
  ): Record<string, unknown> => ({
    _class: cls,
    do_objectID: id,
    name,
    frame,
    isVisible: true,
    isLocked: false,
    rotation: 0,
    isFlippedHorizontal: false,
    isFlippedVertical: false,
    ...extra,
  });
  const ref = (name: string): Record<string, unknown> => ({
    _class: "MSJSONFileReference",
    _ref_class: "MSImageData",
    _ref: name,
  });
  const style = (extra: Record<string, unknown>): Record<string, unknown> => ({
    _class: "style",
    endDecorationType: 0,
    miterLimit: 10,
    startDecorationType: 0,
    ...extra,
  });
  const colorFill = (c: Record<string, unknown>): Record<string, unknown> => ({
    _class: "fill",
    isEnabled: true,
    color: c,
    fillType: 0,
    noiseIndex: 0,
    noiseIntensity: 0,
    patternFillType: 1,
    patternTileScale: 1,
  });
  const gradientFill = (type: number): Record<string, unknown> => ({
    ...colorFill(color(0, 0, 0)),
    fillType: 1,
    gradient: {
      _class: "gradient",
      elipseLength: 0,
      from: "{0.5, 0}",
      to: "{0.5, 1}",
      gradientType: type,
      shouldSmoothenOpacity: false,
      stops: [
        { _class: "gradientStop", color: color(r(), r(), r()), position: 0 },
        { _class: "gradientStop", color: color(r(), r(), r()), position: 1 },
      ],
    },
  });
  let id = 0;
  const nextId = (prefix: string): string => `${prefix}-${++id}`;
  const shapeLayer = (
    x: number,
    y: number,
    w: number,
    h: number,
    i: number,
  ): Record<string, unknown> => {
    const oval = i % 2 === 1;
    const child = layer(oval ? "oval" : "rectangle", nextId("S"), "Path", rect(0, 0, w, h), {
      edited: false,
      booleanOperation: -1,
      ...(oval ? {} : { fixedRadius: 4, hasConvertedToNewRoundCorners: true }),
      path: {
        _class: "path",
        isClosed: true,
        pointRadiusBehaviour: 1,
        points: oval ? ovalPoints : [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)],
      },
    });
    const fills =
      i % 4 === 0 ? [gradientFill(i % 8 === 0 ? 0 : 1)] : [colorFill(color(r(), r(), r()))];
    const extra: Record<string, unknown> = { fills };
    if (i % 3 === 0)
      extra.borders = [
        {
          _class: "border",
          isEnabled: true,
          color: color(0, 0, 0),
          fillType: 0,
          position: 1,
          thickness: 2,
        },
      ];
    if (i % 10 === 0)
      extra.shadows = [
        {
          _class: "shadow",
          isEnabled: true,
          blurRadius: 4,
          color: color(0, 0, 0, 0.5),
          offsetX: 2,
          offsetY: 3,
          spread: 0,
        },
      ];
    return layer("shapeGroup", nextId("G"), `Shape ${i}`, rect(x, y, w, h), {
      style: style(extra),
      hasClickThrough: false,
      windingRule: 1,
      layers: [child],
    });
  };
  const words = "lorem ipsum dolor sit amet consectetur adipiscing elit".split(" ");
  const textLayer = (x: number, y: number, i: number): Record<string, unknown> => {
    const text = Array.from(
      { length: 2 + Math.floor(r() * 4) },
      () => words[Math.floor(r() * words.length)],
    ).join(" ");
    return layer("text", nextId("T"), text, rect(x, y, 160, 24), {
      attributedString: attributedString(
        `${text} ${i}`,
        "OpenSans-Regular",
        10 + Math.floor(r() * 10),
        `${r().toFixed(3)} 0.2 0.3 1`,
        i % 3,
      ),
      textBehaviour: 0,
      automaticallyDrawOnUnderlyingPath: false,
      dontSynchroniseWithSymbol: false,
      glyphBounds: "{{0, 0}, {160, 24}}",
      heightIsClipped: false,
      lineSpacingBehaviour: 2,
      style: style({}),
    });
  };
  const bitmapLayer = (x: number, y: number, i: number): Record<string, unknown> =>
    layer("bitmap", nextId("B"), `Image ${i}`, rect(x, y, 64, 64), {
      image: ref(`images/img${i % 4}`),
      style: style({}),
    });

  const boardW = 1200;
  const boardH = 900;
  const boards: Record<string, unknown>[] = [];
  let i = 0;
  for (let b = 0; b < artboards; b++) {
    const groupLayers: Record<string, unknown>[] = [];
    const cols = Math.ceil(Math.sqrt(groups));
    const cw = boardW / cols;
    const ch = boardH / Math.ceil(groups / cols);
    for (let g = 0; g < groups; g++) {
      const gx = (g % cols) * cw;
      const gy = Math.floor(g / cols) * ch;
      const kids: Record<string, unknown>[] = [];
      for (let n = 0; n < perGroup; n++, i++) {
        const x = r() * (cw - 70);
        const y = r() * (ch - 70);
        if (i % 20 === 19) kids.push(bitmapLayer(x, y, i));
        else if (i % 6 === 5) kids.push(textLayer(x, y, i));
        else kids.push(shapeLayer(x, y, 15 + r() * 50, 15 + r() * 50, i));
      }
      groupLayers.push(
        layer("group", nextId("GR"), `Group ${g}`, rect(gx, gy, cw, ch), {
          hasClickThrough: false,
          layers: kids,
        }),
      );
    }
    boards.push(
      layer(
        "artboard",
        nextId("A"),
        `Board ${b + 1}`,
        rect(b * (boardW + 100), 0, boardW, boardH),
        {
          style: { _class: "style" },
          hasBackgroundColor: true,
          backgroundColor: color(1, 1, 1),
          includeBackgroundColorInExport: true,
          layers: groupLayers,
        },
      ),
    );
  }
  const page = {
    _class: "page",
    do_objectID: "P1",
    name: "Page 1",
    frame: rect(0, 0, 0, 0),
    isVisible: true,
    style: { _class: "style" },
    layers: boards,
  };
  const doc = {
    _class: "document",
    do_objectID: "D1",
    pages: [{ _class: "MSJSONFileReference", _ref_class: "MSImmutablePage", _ref: "pages/P1" }],
  };
  const meta = {
    appVersion: "49.3",
    version: 96,
    pagesAndArtboards: {},
    build: 1,
    created: { app: "com.bohemiancoding.sketch3", appVersion: "49.3" },
  };
  const json = (v: unknown): Buffer => Buffer.from(JSON.stringify(v), "utf8");
  return zipStore([
    ["document.json", json(doc)],
    ["meta.json", json(meta)],
    ["user.json", json({})],
    ["pages/P1.json", json(page)],
    ...texturePngs(128).map((bytes, n): [string, Buffer] => [`images/img${n}.png`, bytes]),
  ]);
}
