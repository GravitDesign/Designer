// Old: chunk.vendor.js module 513.
/** A unique id, random unless given. */
import { uuid } from "./util.ts";

export class Uid {
  private readonly _uid: string;

  constructor(uid?: string | null) {
    this._uid = uid || uuid();
  }

  isEqual(other: Uid): boolean {
    return this._uid === other._uid;
  }

  toString(): string {
    return this._uid.toString();
  }
}
