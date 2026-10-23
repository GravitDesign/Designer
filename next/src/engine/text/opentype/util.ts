// Old: chunk.vendor.js module 724 (opentype.js util.js, unchanged).

import type * as fs from "node:fs";

type NodeFs = typeof fs;

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isNode(): boolean {
  return typeof window === "undefined";
}

/** Copies a Node Buffer (or any byte array) into a new ArrayBuffer. */
export function nodeBufferToArrayBuffer(buffer: ArrayLike<number>): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i] as number;
  }
  return arrayBuffer;
}

/** Copies an ArrayBuffer into a new Node Buffer. Only works in Node. */
export function arrayBufferToNodeBuffer(arrayBuffer: ArrayBuffer): Buffer {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i] as number;
  }
  return buffer;
}

/** Throws the message itself (a string, not an Error) when the expression is falsy. */
export function checkArgument(expression: unknown, message: string): asserts expression {
  if (!expression) {
    // The old code throws the bare string; callers that catch it see a string.
    throw message;
  }
}

/**
 * Port helper: Node's fs without a static import, so the browser build
 * doesn't pull it in. The old bundle required a browser shim for fs here.
 */
export function nodeFs(): NodeFs {
  const fs = globalThis.process?.getBuiltinModule?.("node:fs");
  if (!fs) {
    throw new Error("File access needs Node.js.");
  }
  return fs;
}
