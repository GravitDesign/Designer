// Old: chunk.vendor.js module 437.
/**
 * An empty GObject subclass the color classes build on. It has its own
 * type id in the old engine, so it stays a separate class.
 */
import { GObject, registerClass } from "./object.ts";

export class BaseObject extends GObject {
  static {
    registerClass(this, "GBaseObject");
  }
}
