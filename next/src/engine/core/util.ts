// Old: chunk.vendor.js module 11 (GUtil).
/**
 * Small helpers the whole engine uses: deep equality, object extension,
 * ids, number formatting, packing floats into base64, escaping and string
 * compression.
 *
 * The functions are exported one by one and as the `Util` object, which
 * is the old GUtil (the app adds a few members to it, such as
 * sanitizeFilename; those live with the app code that defines them).
 */
import { GMath } from "../math/math.ts";

export const SortOperators = {
  LessThan: -1,
  Equals: 0,
  GreaterThan: 1,
} as const;

type Dictionary = Record<string, unknown>;

/**
 * jQuery-style extend: copies the own properties of every source into the
 * target and returns it. With `true` as the first argument, object values
 * are copied deeply (arrays into new arrays).
 */
export function extend(...args: unknown[]): Dictionary {
  let deep: boolean;
  let target: Dictionary;
  let first = 1;
  if (typeof args[0] == "boolean") {
    deep = args[0];
    target = (args[1] || {}) as Dictionary;
    first = 2;
  } else {
    deep = false;
    target = (args[0] || {}) as Dictionary;
  }
  if (typeof target != "object" && typeof target != "function") target = {};
  for (let i = first; i < args.length; i++) {
    const source = args[i] as Dictionary | null | undefined;
    if (!source) continue;
    for (const key in source) {
      const value = source[key];
      if (target === value || !Object.prototype.hasOwnProperty.call(source, key)) continue;
      target[key] =
        deep && typeof value == "object"
          ? extend(deep, value instanceof Array ? [] : {}, value)
          : value;
    }
  }
  return target;
}

/** The first element that matches, or null. */
export function find<T>(list: ArrayLike<T>, predicate: (item: T) => unknown): T | null {
  for (let i = 0; i < list.length; i++) if (predicate(list[i] as T)) return list[i] as T;
  return null;
}

/** Maps an array, or the values of an object (with their keys). */
export function map<T, R>(source: readonly T[], fn: (value: T, index: number) => R): R[];
export function map<T, R>(
  source: Readonly<Record<string, T>>,
  fn: (value: T, key: string) => R,
): R[];
export function map(
  source: readonly unknown[] | Readonly<Record<string, unknown>>,
  fn: (value: unknown, key: never) => unknown,
): unknown[] {
  const call = fn as (value: unknown, key: number | string) => unknown;
  // Array.map also passes the array as a third argument, as the old code did.
  if (source instanceof Array) return source.map(call);
  const result: unknown[] = [];
  for (const key of Object.keys(source)) result.push(call(source[key], key));
  return result;
}

/**
 * Calls `fn(key, value)` for every array element (key = index) or own
 * object property. Note the argument order, key first.
 */
export function each<T>(
  source: readonly T[] | Readonly<Record<string, T>>,
  fn: (key: number | string, value: T) => void,
): void {
  if (source instanceof Array) source.forEach((value, index) => fn(index, value));
  else for (const key of Object.keys(source)) fn(key, source[key] as T);
}

/** The index of the first element `equals` to `value`, or -1. */
export function indexOfEquals(
  list: readonly unknown[],
  value: unknown,
  objectByValue?: boolean,
): number {
  for (let i = 0; i < list.length; ++i) if (equals(list[i], value, objectByValue)) return i;
  return -1;
}

interface WithStaticEquals {
  constructor: { equals?: (a: unknown, b: unknown) => boolean };
}

/**
 * Deep equality as the engine uses it for property values:
 *
 * - values whose class has a static `equals` (Point, Rect, Transform...)
 *   are equal when they have the same class and `equals` says so;
 * - dates by time, arrays element by element;
 * - numbers within `eps` (default 1e-14), NaN equal to NaN;
 * - strings with localeCompare;
 * - plain objects by identity, or key by key with `objectByValue`.
 */
export function equals(a: unknown, b: unknown, objectByValue?: boolean, eps?: number): boolean {
  if (!a && a === b) return true;
  if (!a || !b) return false;
  const ctorA = (a as WithStaticEquals).constructor;
  const ctorB = (b as WithStaticEquals).constructor;
  if (ctorA.equals || ctorB.equals) {
    return ctorA === ctorB && (ctorA.equals as (x: unknown, y: unknown) => boolean)(a, b);
  }
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && +a == +b;
  }
  if (a instanceof Array || b instanceof Array) {
    if (a instanceof Array && b instanceof Array) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; ++i) {
        if (!equals(a[i], b[i], objectByValue, eps)) return false;
      }
      return true;
    }
    return false;
  }
  const type = typeof a;
  if (type !== typeof b) return false;
  if ("number" === type) {
    const x = a as number;
    const y = b as number;
    return isNaN(x) || isNaN(y) ? isNaN(x) && isNaN(y) : GMath.isEqualEps(x, y, eps);
  }
  if ("string" === type) return 0 === (a as string).localeCompare(b as string);
  if ("boolean" === type) return +(a as boolean) == +(b as boolean);
  if ("object" === type) {
    if (objectByValue) {
      const keysA = Object.keys(a as object);
      const keysB = Object.keys(b as object);
      if (!equals(keysA, keysB, objectByValue, eps)) return false;
      for (let i = 0; i < keysA.length; ++i) {
        const key = keysA[i] as string;
        if (!equals((a as Dictionary)[key], (b as Dictionary)[key], objectByValue, eps)) {
          return false;
        }
      }
      return true;
    }
    return a === b;
  }
  return false;
}

/** Whether `list` contains any of `values`. */
export function containsOneOf(list: readonly unknown[], values: readonly unknown[]): boolean {
  for (let i = 0; i < values.length; ++i) if (list.indexOf(values[i]) >= 0) return true;
  return false;
}

/** Whether `list` contains any key of `object` (own or inherited). */
export function containsObjectKey(list: readonly unknown[], object: object): boolean {
  for (const key in object) if (list.indexOf(key) >= 0) return true;
  return false;
}

/** Whether any property of `dictionary` is `value` (strictly). */
export function dictionaryContainsValue(dictionary: object, value: unknown): boolean {
  for (const key in dictionary) if ((dictionary as Dictionary)[key] === value) return true;
  return false;
}

const UUID_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

/** A random id of `length` (default 32) letters and digits. */
export function uuid(length?: number): string {
  const chars = UUID_CHARS;
  const out: string[] = [];
  const count = chars.length;
  length = length || 32;
  for (let i = 0; i < length; i++) out[i] = chars[0 | (Math.random() * count)] as string;
  return out.join("");
}

/** Replaces every occurrence of `search`, one `replace` call at a time. */
export function replaceAll(text: string, search: string, replacement: string): string {
  let result = text;
  while (result.indexOf(search) >= 0) result = result.replace(search, replacement);
  return result;
}

/**
 * The distinct values in order. Values are compared as object keys, so 2
 * and "2" count as the same value.
 */
export function unique<T>(list: readonly T[] | null | undefined): T[] | null {
  if (!list) return null;
  const seen: Record<string, number> = {};
  const result: T[] = [];
  const length = list.length;
  let next = 0;
  for (let i = 0; i < length; i++) {
    const value = list[i] as T;
    const key = value as unknown as string;
    if (1 !== seen[key]) {
      seen[key] = 1;
      result[next++] = value;
    }
  }
  return result;
}

/** Removes later duplicates (by identity) from `list` in place. */
export function uniqueObj<T>(list: T[]): T[] {
  for (let i = 0; i < list.length; i++) {
    const value = list[i];
    for (let j = list.length - 1; j > i; j--) if (value === list[j]) list.splice(j, 1);
  }
  return list;
}

/** The Java-style 32-bit string hash. */
export function hash(text: string): number {
  let result = 0;
  if (0 == text.length) return result;
  for (let i = 0, length = text.length; i < length; i++) {
    result = (result << 5) - result + text.charCodeAt(i);
    result |= 0;
  }
  return result;
}

export function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function unescape(text: string): string {
  let result = replaceAll(text, "&lt;", "<");
  result = replaceAll(result, "&gt;", ">");
  result = replaceAll(result, "&quot;", '"');
  result = replaceAll(result, "&#039;", "'");
  result = replaceAll(result, "&amp;", "&");
  return result;
}

/** The old numeric test: `value - parseFloat(value) >= 0`. */
export function isNumeric(value: unknown): boolean {
  return (value as number) - parseFloat(value as string) >= 0;
}

/**
 * A number rounded to `decimals` (default 3) with `separator` (default
 * ".") as the decimal point.
 */
export function formatNumber(value: number, decimals?: number, separator?: string): string {
  separator = separator || ".";
  decimals = typeof decimals == "number" ? decimals : 3;
  return GMath.round(value, false, decimals).toString().replace(".", separator);
}

/**
 * Parses a number where the last "," or "." is the decimal point and the
 * others are dropped ("1.234,5" is 1234.5). Empty input gives NaN.
 */
export function parseNumber(text: string | null | undefined): number {
  if (!text) return Number.NaN;
  let result = "";
  let seenDecimal = false;
  for (let i = text.length; i >= 0; --i) {
    const char = text.charAt(i);
    if (("," !== char && "." !== char) || seenDecimal) {
      result = char + result;
    } else {
      result = "." + result;
      seenDecimal = true;
    }
  }
  return parseFloat(result);
}

/** A color number as six upper-case hex digits (cut to the first six). */
export function numToHexSixDigitsString(value: number): string {
  const hex = value.toString(16).toUpperCase();
  let result = hex || "000000";
  if (hex && hex.length < 6) result = new Array(7 - hex.length).join("0") + hex;
  else if (hex && hex.length > 6) result = hex.substr(0, 6);
  return result;
}

function bytesToBinaryString(bytes: Uint8Array): string {
  return String.fromCharCode.apply(null, bytes as unknown as number[]);
}

/** The numbers as float32 values, base64 encoded. */
export function packNumbers(...numbers: number[]): string {
  const floats = new Float32Array(numbers.length);
  const bytes = new Uint8Array(floats.buffer);
  for (let i = 0; i < numbers.length; i++) floats[i] = numbers[i] as number;
  return btoa(bytesToBinaryString(bytes));
}

/**
 * The inverse of packNumbers. Quirk kept: the loop runs over the length of
 * the base64 text, not of the decoded bytes, so it returns extra numbers
 * read past the end (NaN from charCodeAt, stored as 0 bytes).
 */
export function unpackNumbers(packed: string): number[] {
  const result: number[] = [];
  const float = new Float32Array(1);
  const bytes = new Uint8Array(float.buffer);
  const binary = atob(packed);
  for (let i = 0; i < packed.length; i += 4) {
    bytes[0] = binary.charCodeAt(i);
    bytes[1] = binary.charCodeAt(i + 1);
    bytes[2] = binary.charCodeAt(i + 2);
    bytes[3] = binary.charCodeAt(i + 3);
    result.push(float[0] as number);
  }
  return result;
}

const pointFloats = new Float32Array(2);
const pointBytes = new Uint8Array(pointFloats.buffer);

/** A point as two float32 values, base64 encoded. */
export function packPoint(x: number, y: number): string {
  pointFloats[0] = x;
  pointFloats[1] = y;
  return btoa(bytesToBinaryString(pointBytes));
}

/**
 * The inverse of packPoint. Returns a shared Float32Array that the next
 * call overwrites (old behaviour); copy it to keep the values.
 */
export function unpackPoint(packed: string): Float32Array {
  const binary = atob(packed);
  for (let i = 0; i < 8; i++) pointBytes[i] = binary.charCodeAt(i);
  return pointFloats;
}

export function parseXML(text: string): Document {
  if (typeof DOMParser != "undefined") {
    return new DOMParser().parseFromString(text, "application/xml");
  }
  throw new Error("XML Parsing not supported.");
}

/** An opacity (0..1) with one decimal. */
export function formatOpacity(value: number): string {
  return formatNumber(value, 1);
}

function requireString(value: unknown, action: string): asserts value is string {
  if (typeof value != "string" && !(value instanceof String)) {
    // The old code threw a plain string.
    throw "Invalid format to " + action + ", it must at least be a string!";
  }
}

/** UTF-8 encodes a string, then base64 encodes it. */
export function base64EncodeUnicode(text: string): string {
  requireString(text, "encode");
  let binary: string;
  if (typeof TextEncoder == "function") {
    const parts: string[] = [];
    const bytes = new TextEncoder().encode(text);
    for (let i = 0, length = bytes.byteLength; i < length; i++) {
      parts.push(String.fromCharCode(bytes[i] as number));
    }
    binary = parts.join("");
  } else {
    binary = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
      String.fromCharCode(Number("0x" + hex)),
    );
  }
  return btoa(binary);
}

/** The inverse of base64EncodeUnicode. */
export function base64DecodeUnicode(encoded: string): string {
  requireString(encoded, "decode");
  const binary = atob(encoded);
  if (typeof TextDecoder == "function") {
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  }
  return decodeURIComponent(
    map(binary.split(""), (char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2)).join(
      "",
    ),
  );
}

/**
 * The string codec behind compressString: pako 1.0.11 `deflate`/`inflate`
 * with `{ to: "string" }`. pako isn't a dependency of the new app yet; the
 * cluster that adds it calls `setStringCompression` with it.
 */
export interface StringCompression {
  deflate(text: string): string;
  inflate(binary: string): string;
}

let stringCompression: StringCompression | null = null;

export function setStringCompression(codec: StringCompression): void {
  stringCompression = codec;
}

function compression(): StringCompression {
  if (!stringCompression) throw new Error("String compression (pako) is not set up");
  return stringCompression;
}

/** Deflates a string and base64 encodes the result. */
export function compressString(text: string): string {
  requireString(text, "compress");
  return base64EncodeUnicode(compression().deflate(text));
}

/** The inverse of compressString. */
export function decompressString(encoded: string): string {
  requireString(encoded, "decompress");
  return compression().inflate(base64DecodeUnicode(encoded));
}

/**
 * Sorts in place by moving each element down while it compares below its
 * neighbour (an insertion sort, despite the old name). Stable.
 */
export function bubbleSort<T>(list: T[], compare: (a: T, b: T) => number): T[] {
  for (let i = 0, length = list.length; i < length; i++) {
    for (let j = i; j > 0; j--) {
      if (compare(list[j] as T, list[j - 1] as T) < SortOperators.Equals) {
        const swap = list[j] as T;
        list[j] = list[j - 1] as T;
        list[j - 1] = swap;
      }
    }
  }
  return list;
}

/** Escapes < and > only; falsy input is returned as is. */
export function xss<T extends string | null | undefined>(text: T): T {
  return (text ? text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : text) as T;
}

/** CRLF to LF for strings; other values are returned as is. */
export function replaceMicrosoftLineFeed<T>(value: T): T {
  if (typeof value == "string" || value instanceof String) {
    return value.replace(/\r\n/g, "\n") as T;
  }
  return value;
}

/** The old GUtil. */
export const Util = {
  SortOperators,
  extend,
  find,
  map,
  each,
  indexOfEquals,
  equals,
  containsOneOf,
  containsObjectKey,
  dictionaryContainsValue,
  uuid,
  replaceAll,
  unique,
  uniqueObj,
  hash,
  escape,
  unescape,
  isNumeric,
  formatNumber,
  parseNumber,
  numToHexSixDigitsString,
  packNumbers,
  unpackNumbers,
  packPoint,
  unpackPoint,
  parseXML,
  formatOpacity,
  base64EncodeUnicode,
  base64DecodeUnicode,
  compressString,
  decompressString,
  bubbleSort,
  xss,
  replaceMicrosoftLineFeed,
};
