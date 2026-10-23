// Old: chunk.vendor.js module 1462 (the SVG filter builder).
//
// Collects filter primitives per effect and writes them as one <filter>.
// Each effect adds a "series" filter (primitives chained one after the
// other: blur, color overlay) or a "parallel" one (primitives that read
// the source themselves and get merged: drop and inner shadow). Every
// primitive starts as its own little parsed document, as in the old code,
// so it keeps the xmlns attribute it was parsed with when it's imported.
import { uuid } from "../../../engine/core/util.ts";
import {
  createParsedDocument,
  SVG_NAMESPACE,
  type SvgDocument,
  type SvgElement,
} from "./svg-dom.ts";

/** The writer an effect's filter came from (blur, drop shadow, ...). */
export interface FilterWriter {
  /**
   * What the old builder grouped equal filters by: the writer module's
   * function as a string, which in the shipped (minified) code was
   * "function o() {}" for the drop shadow, the inner shadow and the color
   * overlay alike, so those count as equal.
   */
  readonly groupKey: string;
}

/** Attributes of a primitive, in the order they are written. */
export type FilterAttributes = Record<string, unknown>;

/** A filter in the making: its primitives (as documents) and how they connect. */
export interface FilterEntry {
  defs: SvgDocument[];
  filterInstance: FilterWriter;
  prefix?: string;
  addFilter(
    name: string,
    attributes?: FilterAttributes | null,
    style?: Record<string, unknown> | null,
    children?: string[] | null,
  ): void;
  setSource(source: string): void;
  setResult(result: string): void;
  getResult(): string | null;
  getLastDefElement(): SvgElement;
  getFirstDefElement(): SvgElement;
  getType(): string;
  overrideDefsSource(source: string, replacement: string): void;
}

const Type = {
  Series: "series",
  Parallel: "parallel",
} as const;

const FilterUnits = {
  UserSpaceOnUse: "userSpaceOnUse",
  ObjectBoundingBox: "objectBoundingBox",
} as const;

/**
 * The one child markup the writers pass: `<feFuncA xmlns="..." type="table" tableValues="0 x"/>`.
 * Parsed into an element with those attributes in that order.
 */
function parseChildMarkup(markup: string): SvgDocument {
  const match = /^<([A-Za-z]+)\s+([^>]*?)\s*\/>$/.exec(markup);
  if (!match) throw new Error("unsupported filter child markup: " + markup);
  const attributes: [string, string][] = [];
  let namespace: string = SVG_NAMESPACE;
  for (const attribute of (match[2] as string).matchAll(/([A-Za-z:-]+)=["']([^"']*)["']/g)) {
    const name = attribute[1] as string;
    const value = attribute[2] as string;
    if (name === "xmlns") namespace = value;
    else attributes.push([name, value]);
  }
  return createParsedDocument(namespace, match[1] as string, attributes);
}

export class FilterBuilder {
  static Type = Type;
  static FilterUnits = FilterUnits;

  filters: FilterEntry[];
  id: string;
  nextPrefixId: number;
  fill_opacity: number;
  _height: string;
  _width: string;
  _x: string;
  _y: string;
  _filterUnits: string;

  constructor() {
    this.filters = [];
    this.id = "";
    this.nextPrefixId = 100;
    this.fill_opacity = 1;
    this._height = "400%";
    this._width = "400%";
    this._x = "-200%";
    this._y = "-200%";
    this._filterUnits = FilterUnits.ObjectBoundingBox;
  }

  setId(id: string): void {
    this.id = id;
  }

  setFillOpacity(opacity: number): void {
    this.fill_opacity = opacity;
  }

  /** Kept: the old method took (height, width) in that order. */
  setDimensions(height: string, width: string): void {
    this._height = height;
    this._width = width;
  }

  setCoordinates(x: string, y: string): void {
    this._x = x;
    this._y = y;
  }

  setFilterUnits(units: string): void {
    this._filterUnits = units;
  }

  _createBaseFilterObject(writer: FilterWriter | undefined): FilterEntry {
    if (!writer) throw "Invalid filter instance!";
    return {
      defs: [],
      filterInstance: writer,
      addFilter() {
        throw "Not defined!";
      },
      setSource(source) {
        this.getFirstDefElement().setAttribute("in", source);
      },
      setResult(result) {
        this.getLastDefElement().setAttribute("result", result);
      },
      getResult() {
        return this.getLastDefElement().getAttribute("result");
      },
      getLastDefElement() {
        return (this.defs[this.defs.length - 1] as SvgDocument).documentElement;
      },
      getFirstDefElement() {
        return (this.defs[0] as SvgDocument).documentElement;
      },
      getType() {
        throw "Not defined";
      },
      overrideDefsSource(source, replacement) {
        this.defs.forEach((def) => {
          const element = def.documentElement;
          if (element.getAttribute("in") === source) element.setAttribute("in", replacement);
          if (element.getAttribute("in2") === source) element.setAttribute("in2", replacement);
          if (element.getAttribute("in3") === source) element.setAttribute("in3", replacement);
        });
      },
    };
  }

  /** A filter whose primitives run one after the other. */
  createSeriesFilter(writer?: FilterWriter): FilterEntry {
    const entry = this._createBaseFilterObject(writer);
    entry.addFilter = (name, attributes, style, children) => {
      entry.defs.push(this.createFilter(name, attributes, style, children));
    };
    entry.getType = () => Type.Series;
    this.filters.push(entry);
    return entry;
  }

  /**
   * A filter whose primitives get their own result names (prefixed
   * "pf_<n>_"); the first one reads SourceGraphic unless it says otherwise.
   */
  createParallelFilter(writer: FilterWriter): FilterEntry {
    const entry = this._createBaseFilterObject(writer);
    entry.prefix = "pf_" + this.nextPrefixId++ + "_";
    entry.addFilter = (name, attributes, style, children) => {
      const values = attributes as FilterAttributes;
      if (0 == entry.defs.length && !values.in) values.in = "SourceGraphic";
      for (const key of Object.keys(values)) {
        const value = values[key];
        if (
          "SourceGraphic" != value &&
          "SourceAlpha" != value &&
          (key.startsWith("in") || "target" === key || "out" === key || "result" === key)
        ) {
          values[key] = entry.prefix + String(value);
        }
      }
      entry.defs.push(this.createFilter(name, values, style, children));
    };
    entry.getType = () => Type.Parallel;
    this.filters.push(entry);
    return entry;
  }

  /** One primitive as its own document, with its attributes, inline style and child elements. */
  createFilter(
    name: string,
    attributes?: FilterAttributes | null,
    style?: Record<string, unknown> | null,
    children?: string[] | null,
  ): SvgDocument {
    const document = createParsedDocument(SVG_NAMESPACE, name);
    if (attributes) {
      for (const key of Object.keys(attributes)) {
        document.documentElement.setAttribute(key, attributes[key]);
      }
    }
    if (style) {
      let text = document.documentElement.getAttribute("style") || "";
      for (const key of Object.keys(style)) {
        if (text) text += ";";
        text += key + ":" + style[key];
      }
      document.documentElement.setAttribute("style", text);
    }
    if (children) {
      for (const markup of children) {
        const child = parseChildMarkup(markup);
        document.documentElement.appendChild(document.importNode(child.documentElement));
      }
    }
    return document;
  }

  /** The entries grouped by writer, groups in order of first appearance. */
  _groupEqualFilters(entries: FilterEntry[]): FilterEntry[][] {
    const groups: Record<string, FilterEntry[]> = {};
    entries.forEach((entry) => {
      const key = entry.filterInstance.groupKey;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return Object.keys(groups).map((key) => groups[key] as FilterEntry[]);
  }

  _generateResultId(): string {
    return "_out_" + uuid();
  }

  /**
   * Writes the parallel filters. With several, each gets a result id and
   * a merge node; equal ones are chained instead (the next reads the
   * previous result where it read SourceGraphic) and only the last of a
   * chain is merged. The one feMerge element moves behind each primitive
   * appended, so it ends up last.
   */
  _createParallelFilters(defs: SvgElement, filter: SvgElement, entries: FilterEntry[]): void {
    if (!entries.length) return;
    if (entries.length > 1) {
      const groups = this._groupEqualFilters(entries);
      const merge = (filter.ownerDocument as SvgDocument).createElementNS(SVG_NAMESPACE, "feMerge");
      const append = (entry: FilterEntry, merged: boolean) => {
        entry.defs.forEach((def) => {
          filter.appendChild(
            (defs.ownerDocument as SvgDocument).importNode(def.documentElement, true),
          );
          filter.appendChild(merge);
        });
        if (merged) {
          const node = (filter.ownerDocument as SvgDocument).createElementNS(
            SVG_NAMESPACE,
            "feMergeNode",
          );
          node.setAttribute("in", entry.getResult());
          merge.appendChild(node);
        }
      };
      groups.forEach((group) => {
        if (group.length > 1) {
          group.forEach((entry, index, list) => {
            entry.setResult(this._generateResultId());
            const next = list[index + 1];
            if (next) next.overrideDefsSource("SourceGraphic", entry.getResult() as string);
            append(entry, !next);
          });
        } else {
          const entry = group[0] as FilterEntry;
          entry.setResult(this._generateResultId());
          append(entry, true);
        }
      });
    } else {
      (entries[0] as FilterEntry).defs.forEach((def) => {
        filter.appendChild(
          (defs.ownerDocument as SvgDocument).importNode(def.documentElement, true),
        );
      });
    }
  }

  /**
   * Writes the series filters chained: the first reads SourceGraphic, the
   * last reads the result of the one before. A fill opacity below 1 adds
   * a component transfer of SourceGraphic blended under the chain's output.
   */
  _createSeriesFilters(defs: SvgElement, filter: SvgElement, entries: FilterEntry[]): void {
    if (!entries.length) return;
    let last: FilterEntry | undefined;
    if (entries.length > 1) {
      const result = this._generateResultId();
      (entries[entries.length - 2] as FilterEntry).setResult(result);
      last = entries[entries.length - 1] as FilterEntry;
      last.setSource(result);
    }
    let source: string | null = "SourceGraphic";
    entries.forEach((entry, index) => {
      if (0 == index) source = entry.getResult();
      else entry.overrideDefsSource("SourceGraphic", source as string);
    });
    if (1 != this.fill_opacity) {
      let target: FilterEntry;
      let output: SvgDocument | null;
      if (0 == entries.length) {
        target = this.createSeriesFilter();
        output = null;
      } else {
        target = entries[entries.length - 1] as FilterEntry;
        output = target.defs[target.defs.length - 1] as SvgDocument;
        output.documentElement.setAttribute("result", "FilterOut");
        target.defs.forEach((def) => {
          if (
            "feBlend" === def.documentElement.tagName &&
            "SourceGraphic" === def.documentElement.getAttribute("in")
          ) {
            def.documentElement.setAttribute("in", "SourceGraphicIgnore");
          }
        });
      }
      target.addFilter(
        "feComponentTransfer",
        { in: "SourceGraphic", result: "SourceGraphicFill" },
        null,
        [
          '<feFuncA xmlns="http://www.w3.org/2000/svg" type="table" tableValues="0 ' +
            this.fill_opacity +
            '"/>',
        ],
      );
      if (output) {
        target.addFilter("feBlend", { in: "SourceGraphicFill", in2: "FilterOut", mode: "normal" });
      }
    }
    entries.forEach((entry) => {
      entry.defs.forEach((def) => {
        filter.appendChild(
          (defs.ownerDocument as SvgDocument).importNode(def.documentElement, true),
        );
      });
    });
  }

  /** Appends the `<filter>` to `defs`: parallel filters first, then the series. */
  toXml(defs: SvgElement): void {
    if (0 != this.filters.length || 0 != this.fill_opacity) {
      const filter = (defs.ownerDocument as SvgDocument).createElementNS(SVG_NAMESPACE, "filter");
      defs.appendChild(filter);
      if (this.id) filter.setAttribute("id", this.id);
      filter.setAttribute("x", this._x);
      filter.setAttribute("y", this._y);
      filter.setAttribute("width", this._width);
      filter.setAttribute("height", this._height);
      filter.setAttribute("filterUnits", this._filterUnits);
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const parallel = this.filters.filter((entry) => entry.getType() === Type.Parallel);
      const series = this.filters.filter((entry) => entry.getType() === Type.Series);
      this._createParallelFilters(defs, filter, parallel);
      this._createSeriesFilters(defs, filter, series);
    }
  }
}
