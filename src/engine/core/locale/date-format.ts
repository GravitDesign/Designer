// Old: chunk.vendor.js module 890.

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

/** Turns a string or a timestamp into a Date; a Date is returned as is. */
export function toDate(value: Date | string | number): Date {
  return typeof value === "string" || typeof value === "number" ? new Date(value) : value;
}

/** Formats a date for a language tag, by default as "October 22, 2026". */
export function formatDate(
  value: Date | string | number,
  languageTag: string,
  options?: Intl.DateTimeFormatOptions | null,
): string {
  return toDate(value).toLocaleDateString(languageTag, options || DEFAULT_OPTIONS);
}
