/**
 * A Windows .ico file holding PNG images (the format Windows Vista and
 * later read): a 6-byte header, one 16-byte directory entry per image,
 * then the PNG files as they are.
 */
export interface IcoImage {
  /** Width and height in pixels (1 to 256). */
  size: number;
  png: Buffer;
}

export function encodeIco(images: readonly IcoImage[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    if (size < 1 || size > 256) throw new Error(`an icon image must be 1 to 256 px, not ${size}`);
    const entry = Buffer.alloc(16);
    // 0 means 256 in the one-byte width and height fields.
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

/** The directory of an .ico file: each image's size, byte length and offset. */
export function readIcoDirectory(ico: Buffer): { size: number; length: number; offset: number }[] {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error("not an .ico file");
  const count = ico.readUInt16LE(4);
  const out: { size: number; length: number; offset: number }[] = [];
  for (let i = 0; i < count; i++) {
    const at = 6 + 16 * i;
    out.push({
      size: ico.readUInt8(at) || 256,
      length: ico.readUInt32LE(at + 8),
      offset: ico.readUInt32LE(at + 12),
    });
  }
  return out;
}
