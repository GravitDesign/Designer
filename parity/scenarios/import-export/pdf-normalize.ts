/**
 * Makes a PDF from the old exporter comparable between runs. Works on the
 * file as a latin1 string so the same function runs in Node and, sent as
 * source text, in the page.
 *
 * GPDFExport writes the wall-clock time into /CreationDate and /ModDate of
 * the info dictionary (FMT-EXPORT-020) as "D:YYYYMMDDHHmmSS" plus the
 * zone offset ("-00'00'" in the UTC test context). Only the 14 digits are
 * replaced, after checking that they name a moment between `since` and
 * `until` (the start and end of the export, in ms), so a wrong format, a
 * wrong offset or a constant date still shows up. The replacement has the
 * same length, so no byte offset in the file moves.
 */
export function normalizePdfString(input: string, since: number, until: number): string {
  return input.replace(
    /\/(CreationDate|ModDate) \(D:([0-9]{14})([^)]*)\)/g,
    (_match: string, key: string, digits: string, rest: string) => {
      const n = (from: number, to: number) => Number(digits.slice(from, to));
      let time = Date.UTC(n(0, 4), n(4, 6) - 1, n(6, 8), n(8, 10), n(10, 12), n(12, 14));
      // The exporter writes "+hh'mm'" east of UTC and "-hh'mm'" otherwise.
      const offset = /^([+-])([0-9]{2})'([0-9]{2})'$/.exec(rest);
      if (offset) {
        const minutes = Number(offset[2]) * 60 + Number(offset[3]);
        time += (offset[1] === "-" ? 1 : -1) * minutes * 60_000;
      }
      const from = Math.floor(since / 1000) * 1000 - 1000;
      if (!(time >= from && time <= until + 1000)) {
        throw new Error(
          `PDF ${key} D:${digits}${rest} is not the export time ` +
            `(${new Date(since).toISOString()} .. ${new Date(until).toISOString()})`,
        );
      }
      return "/" + key + " (D:20000101000000" + rest + ")";
    },
  );
}
