/**
 * Makes a PDF from the old exporter comparable between runs. Works on the
 * file as a latin1 string so the same function runs in Node and, sent as
 * source text, in the page.
 *
 * GPDFExport writes the wall-clock time into /CreationDate and /ModDate of
 * the info dictionary (FMT-EXPORT-020), including the local UTC offset.
 * Those two values are replaced with a fixed date. The replacement can
 * change the length of the file (the offset is "Z" or "+hh'mm'"), so every
 * byte offset the exporter wrote after it (xref entries, startxref) is
 * shifted by the same amount. Offsets are adjusted, not recomputed, so a
 * wrong offset from the exporter still shows up as a difference.
 */
export function normalizePdfString(input: string): string {
  const shifts: { at: number; delta: number }[] = [];
  const s = input.replace(
    /\/(CreationDate|ModDate) \(D:[0-9]{14}[^)]*\)/g,
    (match: string, key: string, at: number) => {
      const out = "/" + key + " (D:20000101000000Z)";
      shifts.push({ at, delta: out.length - match.length });
      return out;
    },
  );
  const shift = (offset: number) =>
    offset + shifts.filter((x) => x.at < offset).reduce((sum, x) => sum + x.delta, 0);
  const xrefAt = s.lastIndexOf("\nxref\n");
  if (xrefAt < 0) return s;
  const body = s.slice(0, xrefAt + 1);
  const tail = s
    .slice(xrefAt + 1)
    .replace(
      /^(\d{10}) (\d{5}) n /gm,
      (_m: string, off: string, gen: string) =>
        String(shift(Number(off))).padStart(10, "0") + " " + gen + " n ",
    )
    .replace(/startxref\n(\d+)/, (_m: string, off: string) => "startxref\n" + shift(Number(off)));
  return body + tail;
}
