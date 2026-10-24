// Runs the interpreter in Node the way scratch recordings ran the old
// worker (public/ps*.js in a vm context), so tests can compare the message
// streams exactly. Not used by the app.
import { createHash } from "node:crypto";
import type { PSHost, PSHostMessage } from "./host.ts";
import { PSInterpreter } from "./interpreter.ts";
import { JPEG_FLAG_BYTES, JpegRequest } from "./jpeg.ts";

/** A recorded message: what the worker posted, compacted when it is large. */
export type RecordedMessage =
  | { func: string; data: unknown; sab?: number }
  | { digest: string; length: number; func: string }
  | { exception: string | true };

export interface RecordedRun {
  finished: boolean;
  messages: RecordedMessage[];
}

/**
 * Messages whose JSON is longer than 2000 characters are kept as their
 * length and SHA-256 (the recordings do the same).
 */
export function compactMessage(message: RecordedMessage): RecordedMessage {
  const json = JSON.stringify(message);
  if (json.length <= 2000) return message;
  return {
    digest: createHash("sha256").update(json).digest("hex"),
    length: json.length,
    func: (message as { func: string }).func,
  };
}

/**
 * Stands in for the page's JPEG decoding: a deterministic image whose size
 * and pixels depend on the data URL's length.
 */
export function fakeJpeg(
  dataUrl: unknown,
): { width: number; height: number; data: Uint8Array } | null {
  if (typeof dataUrl != "string" || !dataUrl.startsWith("data:")) return null;
  const width = 3 + (dataUrl.length % 5);
  const height = 2 + (dataUrl.length % 3);
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 37 + dataUrl.length) & 255;
  return { width, height, data };
}

/** Answers a "jpeg" request synchronously through its SharedArrayBuffer (see ./jpeg.ts). */
function answerJpeg(message: PSHostMessage): void {
  const buffer = message.result as SharedArrayBuffer;
  const flag = new Int32Array(buffer, 0, 1);
  const image = fakeJpeg(message.data[0]);
  if (message.data[1] === JpegRequest.Size) {
    const size = new Int32Array(buffer, JPEG_FLAG_BYTES, 2);
    size[0] = image ? image.width : 0;
    size[1] = image ? image.height : 0;
  } else {
    const pixels = new Uint8Array(buffer, JPEG_FLAG_BYTES, buffer.byteLength - JPEG_FLAG_BYTES);
    for (let i = 0; i < pixels.length; i++) pixels[i] = image ? (image.data[i] ?? 0) : 0;
  }
  flag[0] = 1;
}

/**
 * Runs a program to its end without yielding. Exceptions end the run like
 * they ended the old worker; they are recorded as `{exception: true}`.
 */
export function runInterpreter(input: Uint8Array, options: { outlineFonts: boolean }): RecordedRun {
  const messages: RecordedMessage[] = [];
  let finished = false;
  const host: PSHost = {
    postMessage(message) {
      const copy: { func: string; data: unknown; sab?: number } = {
        func: message.func,
        data: message.data,
      };
      if (message.func === "jpeg" && message.result) {
        answerJpeg(message);
        copy.sab = (message.result as SharedArrayBuffer).byteLength;
      }
      messages.push(JSON.parse(JSON.stringify(copy)) as RecordedMessage);
      if (message.func === "done") finished = true;
    },
    close() {},
    setTimeout() {
      return 0;
    },
    shouldYield: () => false,
  };
  const interpreter = new PSInterpreter(host);
  try {
    interpreter.init(input, {
      gDevelopment: false,
      maxWaitTime: 3e5,
      outlineFonts: options.outlineFonts,
    });
    interpreter.run();
  } catch {
    messages.push({ exception: true });
    finished = true;
  }
  return { finished, messages: messages.map(compactMessage) };
}
