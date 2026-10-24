// Test support: builds minimal font files (only the tables a test needs)
// for the name-table reader. Also used to check the old bundle gives the
// same answers, so it imports nothing.

export interface NameRecord {
  platform: number;
  encoding: number;
  language: number;
  nameId: number;
  /** UTF-16 for platforms 0 and 3, single bytes for platform 1. */
  bytes: number[];
}

export const utf16 = (text: string) =>
  [...text].flatMap((c) => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 255]);
export const latin1 = (text: string) => [...text].map((c) => c.charCodeAt(0));

export function nameTable(records: NameRecord[]): number[] {
  const header = 6 + 12 * records.length;
  const out = [0, 0, records.length >> 8, records.length & 255, header >> 8, header & 255];
  const strings: number[] = [];
  for (const r of records) {
    const offset = strings.length;
    strings.push(...r.bytes);
    for (const v of [r.platform, r.encoding, r.language, r.nameId, r.bytes.length, offset]) {
      out.push(v >> 8, v & 255);
    }
  }
  return out.concat(strings);
}

/** STAT with the given axes (tag, value) and one axis value record per axis. */
export function statTable(axes: [string, number][]): number[] {
  const axisSize = 8;
  const axesOffset = 20;
  const valuesOffset = axesOffset + axisSize * axes.length;
  const out: number[] = [];
  const u16 = (v: number) => out.push((v >> 8) & 255, v & 255);
  const u32 = (v: number) => out.push((v >>> 24) & 255, (v >> 16) & 255, (v >> 8) & 255, v & 255);
  u16(1);
  u16(1);
  u16(axisSize);
  u16(axes.length);
  u32(axesOffset);
  u16(axes.length);
  u32(valuesOffset);
  u16(0);
  for (const [tag] of axes) {
    out.push(...latin1(tag));
    u16(0);
    u16(0);
  }
  for (let i = 0; i < axes.length; i++) u16(2 * axes.length + 12 * i);
  axes.forEach(([, value], i) => {
    u16(1);
    u16(i);
    u16(0);
    u16(0);
    u32(value * 65536);
  });
  return out;
}

/** A font file holding only the given tables (no glyphs; enough for the name reader). */
export function sfnt(tables: Record<string, number[]>): ArrayBuffer {
  const tags = Object.keys(tables).sort();
  const header = 12 + 16 * tags.length;
  const bytes: number[] = [0, 1, 0, 0, 0, tags.length, 0, 0, 0, 0, 0, 0];
  let offset = header;
  const bodies: number[] = [];
  for (const tag of tags) {
    const body = tables[tag] as number[];
    bytes.push(...latin1(tag), 0, 0, 0, 0);
    bytes.push((offset >>> 24) & 255, (offset >> 16) & 255, (offset >> 8) & 255, offset & 255);
    bytes.push(0, 0, body.length >> 8, body.length & 255);
    bodies.push(...body);
    while (bodies.length % 4) bodies.push(0);
    offset = header + bodies.length;
  }
  return new Uint8Array(bytes.concat(bodies)).buffer;
}

export const win = (language: number, nameId: number, text: string): NameRecord => ({
  platform: 3,
  encoding: 1,
  language,
  nameId,
  bytes: utf16(text),
});
