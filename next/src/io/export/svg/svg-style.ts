// Old: chunk.vendor.js module 1149 (the exporter's CSS declaration map).
import type { SvgElement } from "./svg-dom.ts";

/**
 * An inline style as an ordered map of CSS properties, written back as
 * "name:value;name:value;". Parsing keeps the old quirks: entries are split
 * on ";" and ":" and only trimmed as a whole, so "a: b" keeps the space
 * before the value and an empty trailing entry adds the key "".
 */
export class SvgStyle {
  map: Record<string, unknown> = {};

  constructor(style?: string | null) {
    if (style) {
      style.split(";").forEach((entry) => {
        const parts = entry.trim().split(":");
        this.map[parts[0] as string] = parts[1];
      });
    }
  }

  set(name: string, value: unknown): void {
    this.map[name] = value;
  }

  get(name: string): unknown {
    return this.map[name];
  }

  remove(name: string): void {
    Reflect.deleteProperty(this.map, name);
  }

  toString(): string {
    let out = "";
    for (const name of Object.keys(this.map)) out += name + ":" + this.map[name] + ";";
    return out;
  }

  clone(): SvgStyle {
    const copy = new SvgStyle();
    for (const name of Object.keys(this.map)) copy.map[name] = this.map[name];
    return copy;
  }

  getLength(): number {
    return Object.keys(this.map).length;
  }

  setElementStyle(element: SvgElement): void {
    if (this.getLength() > 0) element.setAttribute("style", this.toString());
  }
}
