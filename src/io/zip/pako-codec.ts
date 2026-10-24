// Old: designer.browser.dev.js module 1516 (zip.js codec on pako).
//
// zip.Deflater / zip.Inflater: raw deflate streams through pako with 1 MB
// output chunks. The deflate output decides the ZIP bytes.

import { Deflate, Inflate } from "pako";

/** What zip.js feeds data through: append returns what is ready, flush the rest. */
export interface ZipCodec {
  append(data: Uint8Array, onprogress?: (loaded: number) => void): Uint8Array | undefined;
  flush(): Uint8Array | undefined;
}

interface PakoStream {
  err: number;
  msg: string;
  onData: (chunk: Uint8Array) => void;
  push(data: Uint8Array, mode: boolean): boolean;
}

abstract class PakoCodec implements ZipCodec {
  private readonly _backEnd: PakoStream;
  private readonly _chunks: Uint8Array[] = [];
  private _dataLength = 0;

  protected constructor(deflate: boolean, options?: { level?: number | undefined }) {
    const pakoOptions: { raw: true; chunkSize: number; level?: number } = {
      raw: true,
      chunkSize: 1048576,
    };
    if (options && "number" == typeof options.level) {
      pakoOptions.level = options.level as -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    }
    this._backEnd = (deflate
      ? new Deflate(pakoOptions as ConstructorParameters<typeof Deflate>[0])
      : new Inflate(pakoOptions)) as unknown as PakoStream;
    this._backEnd.onData = this._onData.bind(this);
  }

  private _onData(chunk: Uint8Array): void {
    this._chunks.push(chunk);
    this._dataLength += chunk.length;
  }

  /** Everything pako produced since the last call, as one array (undefined if nothing). */
  private _fetchData(): Uint8Array | undefined {
    const backEnd = this._backEnd;
    if (0 !== backEnd.err) throw new Error(backEnd.msg);
    let data: Uint8Array | undefined;
    const chunks = this._chunks;
    if (1 === chunks.length) data = chunks[0];
    else if (chunks.length > 1) {
      data = new Uint8Array(this._dataLength);
      for (let i = 0, offset = 0; i < chunks.length; i++) {
        const chunk = chunks[i] as Uint8Array;
        data.set(chunk, offset);
        offset += chunk.length;
      }
    }
    chunks.length = 0;
    this._dataLength = 0;
    return data;
  }

  append(data: Uint8Array): Uint8Array | undefined {
    this._backEnd.push(data, false);
    return this._fetchData();
  }

  flush(): Uint8Array | undefined {
    this._backEnd.push(new Uint8Array(0), true);
    return this._fetchData();
  }
}

export class Deflater extends PakoCodec {
  constructor(options?: { level?: number | undefined }) {
    super(true, options);
  }
}

export class Inflater extends PakoCodec {
  constructor() {
    super(false);
  }
}
