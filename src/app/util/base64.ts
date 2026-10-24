// Old: designer.browser.dev.js module 1042 (URL-safe base64 helpers).
const TO_URL_SAFE: Record<string, string> = { "+": "-", "/": "_" };
const FROM_URL_SAFE: Record<string, string> = { "-": "+", _: "/", ".": "=" };

/** Base64 to the URL-safe alphabet ("+" to "-", "/" to "_"). */
export const encode = (text: string): string =>
  text.replace(/[+/]/g, (c) => TO_URL_SAFE[c] as string);

/** URL-safe base64 back to standard base64 ("." becomes "="). */
export const decode = (text: string): string =>
  text.replace(/[-_.]/g, (c) => FROM_URL_SAFE[c] as string);

/** Drops one or two trailing padding characters ("=" or "."). */
export const trim = (text: string): string => text.replace(/[.=]{1,2}$/, "");

export const isBase64 = (text: string): boolean => /^[A-Za-z0-9+/]*[=]{0,2}$/.test(text);

export const isUrlSafeBase64 = (text: string): boolean => /^[A-Za-z0-9_-]*[.=]{0,2}$/.test(text);
