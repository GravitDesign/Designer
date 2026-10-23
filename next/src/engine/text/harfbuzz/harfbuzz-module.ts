// Old: chunk.vendor.js module 998 (the Emscripten build of HarfBuzz 2.2.0).
/**
 * HarfBuzz 2.2.0 compiled to WebAssembly (vendor/harfbuzz, see its README),
 * loaded once when this module is first imported. The old bundle embedded
 * the same HarfBuzz version as asm.js and created it synchronously; the
 * module is instantiated with a top-level await instead, so everything that
 * imports it can use it synchronously the way the old wrapper did.
 *
 * Only the functions the old wrapper (module 838) called are exported from
 * the .wasm. This file adds the small part of the Emscripten runtime the
 * wrapper relied on: heap views, string marshalling and `setValue`.
 */

/** The exports of harfbuzz-2.2.0.wasm. Pointers and enums are plain i32 numbers. */
export interface HarfBuzzExports {
  memory: WebAssembly.Memory;
  _initialize(): void;
  malloc(size: number): number;
  free(pointer: number): void;
  hb_blob_create(
    data: number,
    length: number,
    mode: number,
    userData: number,
    destroy: number,
  ): number;
  hb_face_create(blob: number, index: number): number;
  hb_font_create(face: number): number;
  hb_font_set_scale(font: number, xScale: number, yScale: number): void;
  hb_font_set_variations(font: number, variations: number, length: number): void;
  hb_shape(font: number, buffer: number, features: number, length: number): void;
  hb_buffer_create(): number;
  hb_buffer_destroy(buffer: number): void;
  hb_buffer_add_utf8(
    buffer: number,
    text: number,
    textLength: number,
    itemOffset: number,
    itemLength: number,
  ): void;
  hb_buffer_guess_segment_properties(buffer: number): void;
  hb_buffer_reverse(buffer: number): void;
  hb_buffer_get_length(buffer: number): number;
  hb_buffer_get_glyph_infos(buffer: number, length: number): number;
  hb_buffer_get_glyph_positions(buffer: number, length: number): number;
  hb_buffer_get_language(buffer: number): number;
  hb_buffer_set_language(buffer: number, language: number): void;
  hb_buffer_get_direction(buffer: number): number;
  hb_buffer_set_direction(buffer: number, direction: number): void;
  hb_buffer_get_script(buffer: number): number;
  hb_buffer_set_script(buffer: number, script: number): void;
  hb_language_to_string(language: number): number;
  hb_language_from_string(text: number, length: number): number;
  hb_direction_to_string(direction: number): number;
  hb_direction_from_string(text: number, length: number): number;
  hb_script_get_horizontal_direction(script: number): number;
  hb_ot_tag_to_language(tag: number): number;
}

/** A value type of the old `Module.setValue`. */
export type HeapValueType = "i32" | "float";

/** The running HarfBuzz instance plus the runtime helpers the wrapper uses. */
export class HarfBuzzModule {
  readonly exports: HarfBuzzExports;
  private _views: {
    buffer: ArrayBuffer;
    u8: Uint8Array;
    i32: Int32Array;
    u32: Uint32Array;
    f32: Float32Array;
  } | null = null;

  constructor(exports: HarfBuzzExports) {
    this.exports = exports;
  }

  /** Heap views; recreated after the memory grew (any malloc can grow it). */
  private views() {
    const buffer = this.exports.memory.buffer;
    if (!this._views || this._views.buffer !== buffer) {
      this._views = {
        buffer,
        u8: new Uint8Array(buffer),
        i32: new Int32Array(buffer),
        u32: new Uint32Array(buffer),
        f32: new Float32Array(buffer),
      };
    }
    return this._views;
  }

  get HEAPU8(): Uint8Array {
    return this.views().u8;
  }

  get HEAP32(): Int32Array {
    return this.views().i32;
  }

  get HEAPU32(): Uint32Array {
    return this.views().u32;
  }

  /** Writes one value at a byte address, like Emscripten's setValue. */
  setValue(pointer: number, value: number, type: HeapValueType): void {
    if (type === "i32") this.views().i32[pointer >> 2] = value;
    else this.views().f32[pointer >> 2] = value;
  }

  /**
   * Copies a string into the heap as null-terminated UTF-8 and returns its
   * address; free it with `free`. Encodes like the old runtime's
   * stringToUTF8: a UTF-16 surrogate is always combined with the next code
   * unit, even when the two don't form a pair (TextEncoder would write
   * U+FFFD instead), so odd strings reach HarfBuzz as they did before.
   */
  allocString(text: string): number {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; ++i) {
      let code = text.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdfff) {
        code = (0x10000 + ((code & 0x3ff) << 10)) | (text.charCodeAt(++i) & 0x3ff);
      }
      if (code <= 0x7f) {
        bytes.push(code);
      } else if (code <= 0x7ff) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      } else if (code <= 0xffff) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      } else {
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 63),
          0x80 | ((code >> 6) & 63),
          0x80 | (code & 63),
        );
      }
    }
    bytes.push(0);
    const pointer = this.exports.malloc(bytes.length);
    this.HEAPU8.set(bytes, pointer);
    return pointer;
  }

  /** Reads a null-terminated UTF-8 string; a null pointer gives "" (old UTF8ToString). */
  readString(pointer: number): string {
    if (!pointer) return "";
    const heap = this.HEAPU8;
    let end = pointer;
    while (heap[end]) ++end;
    return new TextDecoder().decode(heap.subarray(pointer, end));
  }

  /** Calls `fn` with the string in the heap and frees it afterwards. */
  withString<T>(text: string, fn: (pointer: number) => T): T {
    const pointer = this.allocString(text);
    try {
      return fn(pointer);
    } finally {
      this.exports.free(pointer);
    }
  }
}

/** WASI error code for "function not supported". */
const ENOSYS = 52;

/**
 * Instantiates harfbuzz-2.2.0.wasm. Its only imports are the libc hooks of a
 * standalone Emscripten build: HarfBuzz reads HB_OPTIONS from the
 * environment (there is none) and never writes to a file.
 */
export async function instantiateHarfBuzz(bytes: BufferSource): Promise<HarfBuzzModule> {
  let memory: WebAssembly.Memory | null = null;
  const imports = {
    env: {
      emscripten_notify_memory_growth() {},
    },
    wasi_snapshot_preview1: {
      environ_sizes_get(countPointer: number, sizePointer: number) {
        const view = new DataView((memory as WebAssembly.Memory).buffer);
        view.setUint32(countPointer, 0, true);
        view.setUint32(sizePointer, 0, true);
        return 0;
      },
      environ_get: () => 0,
      fd_write: () => ENOSYS,
      fd_close: () => ENOSYS,
      fd_seek: () => ENOSYS,
    },
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exports = instance.exports as unknown as HarfBuzzExports;
  memory = exports.memory;
  exports._initialize();
  return new HarfBuzzModule(exports);
}

const WASM_URL = new URL("../../../../vendor/harfbuzz/harfbuzz-2.2.0.wasm", import.meta.url);

interface NodeProcess {
  getBuiltinModule?(id: "node:fs"): { readFileSync(path: URL): Uint8Array };
}

/** The .wasm bytes: fetched in the browser, read from disk under Node (Vitest). */
async function readWasm(url: URL): Promise<BufferSource> {
  if (url.protocol === "file:") {
    const nodeProcess = (globalThis as { process?: NodeProcess }).process;
    const fs = nodeProcess?.getBuiltinModule?.("node:fs");
    if (!fs) throw new Error("Cannot read " + url.href + " here");
    return fs.readFileSync(url) as Uint8Array<ArrayBuffer>;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Cannot load HarfBuzz: " + response.status + " " + url.href);
  return response.arrayBuffer();
}

/** The HarfBuzz instance the engine uses. */
export const harfBuzzModule: HarfBuzzModule = await instantiateHarfBuzz(await readWasm(WASM_URL));
