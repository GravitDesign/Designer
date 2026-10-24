/**
 * Functions the desktop main process runs inside a blank page of an
 * origin (webContents.executeJavaScript with the function's source), to
 * read or write that origin's storage. Each one must be self-contained:
 * no imports, no helpers outside its own body, plain JSON in and out.
 *
 * They open gravitFontsDB the way the app does (version 1, object store
 * "gravitFonts", created on upgrade; src/app/fonts/font-db.ts).
 */
import type { EncodedValue, FontDump } from "./plan.ts";

/** What applyMigration gets. */
export interface MigrationPayload {
  localStorage: Record<string, string>;
  fonts: { key: string; value: EncodedValue }[];
  /** The new font list, or null to leave it. */
  fontList: unknown[] | null;
}

/** What applyMigration did. */
export interface MigrationApplied {
  localStorage: string[];
  fonts: string[];
  fontList: boolean;
}

/**
 * The origin's gravitFontsDB entries, values encoded for JSON; null when
 * the origin has no such database (it is not created).
 */
export async function dumpFontDatabase(): Promise<FontDump | null> {
  const toBase64 = (bytes: Uint8Array): string => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  };
  const encode = async (value: unknown): Promise<EncodedValue> => {
    if (value instanceof ArrayBuffer) {
      return { kind: "binary", type: "ArrayBuffer", base64: toBase64(new Uint8Array(value)) };
    }
    if (value instanceof Uint8Array) {
      return { kind: "binary", type: "Uint8Array", base64: toBase64(value) };
    }
    if (value instanceof Blob) {
      const bytes = new Uint8Array(await value.arrayBuffer());
      return { kind: "binary", type: "Blob", mime: value.type, base64: toBase64(bytes) };
    }
    return { kind: "json", json: value };
  };
  const databases = await indexedDB.databases();
  if (!databases.some((d) => d.name === "gravitFontsDB")) return null;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("gravitFontsDB");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("cannot open gravitFontsDB"));
  });
  try {
    if (!db.objectStoreNames.contains("gravitFonts"))
      return { origin: location.origin, entries: [] };
    const store = db.transaction("gravitFonts").objectStore("gravitFonts");
    const [keys, values] = await Promise.all([
      new Promise<IDBValidKey[]>((resolve, reject) => {
        const r = store.getAllKeys();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error ?? new Error("getAllKeys failed"));
      }),
      new Promise<unknown[]>((resolve, reject) => {
        const r = store.getAll();
        r.onsuccess = () => resolve(r.result as unknown[]);
        r.onerror = () => reject(r.error ?? new Error("getAll failed"));
      }),
    ]);
    const entries: FontDump["entries"] = [];
    for (let i = 0; i < keys.length; i++) {
      if (typeof keys[i] !== "string") continue;
      entries.push({ key: keys[i] as string, value: await encode(values[i]) });
    }
    return { origin: location.origin, entries };
  } finally {
    db.close();
  }
}

/**
 * Writes the payload into this origin's localStorage and gravitFontsDB.
 * localStorage keys that exist already are left alone.
 */
export async function applyMigration(payload: MigrationPayload): Promise<MigrationApplied> {
  const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => {
    const s = atob(text);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  };
  const decode = (value: EncodedValue): unknown => {
    if (value.kind === "json") return value.json;
    const bytes = fromBase64(value.base64);
    if (value.type === "ArrayBuffer") return bytes.buffer;
    if (value.type === "Blob") return new Blob([bytes], { type: value.mime ?? "" });
    return bytes;
  };
  const applied: MigrationApplied = { localStorage: [], fonts: [], fontList: false };
  for (const [key, value] of Object.entries(payload.localStorage)) {
    if (localStorage.getItem(key) !== null) continue;
    localStorage.setItem(key, value);
    applied.localStorage.push(key);
  }
  if (payload.fonts.length === 0 && payload.fontList === null) return applied;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("gravitFontsDB", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("gravitFonts")) {
        request.result.createObjectStore("gravitFonts");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("cannot open gravitFontsDB"));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("gravitFonts", "readwrite");
      const store = transaction.objectStore("gravitFonts");
      for (const font of payload.fonts) {
        store.put(decode(font.value), font.key);
        applied.fonts.push(font.key);
      }
      if (payload.fontList !== null) {
        store.put(payload.fontList, "_gravit_font_list_");
        applied.fontList = true;
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("font write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("font write aborted"));
    });
  } finally {
    db.close();
  }
  return applied;
}
