// Old: public/psclasses.js (PSClasses, webpack module 1368 of its own build).
//
// The PostScript object model of the EPS/PS importer. Every PostScript
// value the interpreter handles is one of:
// - a plain JS number (integers and reals), null, or rarely a plain string,
//   boolean or array (some operators push raw values, see PSValue);
// - a native operator (a function called with the core as `this`);
// - a PSObject created through PSClasses.newObject (bool, name, operator,
//   mark, array, packedarray, dict, string, gstate, file, saveState);
// - a GraphicsState (the interpreter's graphics state, not a PS object).
//
// The old code ran in sloppy mode on ad-hoc objects; the classes here keep
// the same own properties (`in` checks and for..in enumeration see the
// same keys) and declare the fields other modules add later with `declare`,
// so they don't exist until they are assigned.
import type { PSCore } from "./core.ts";
import type { PSParser } from "./parser.ts";

/** A native operator: called with the interpreter core as `this`. */
export type PSProcedure = (this: PSCore) => void;

/** A plain JS object used as a dictionary (systemdict, statusdict, font data, ...). */
export interface PSPlainRecord {
  [key: string]: PSValue;
}

/** Everything that can sit on the operand stack or in a dictionary. */
export type PSValue =
  | number
  | boolean
  | string
  | null
  | undefined
  | PSProcedure
  | PSObject
  | GraphicsState
  | PSPlainRecord
  | PSValue[];

export type PSClassName =
  | "bool"
  | "saveState"
  | "name"
  | "operator"
  | "mark"
  | "array"
  | "packedarray"
  | "dict"
  | "string"
  | "gstate"
  | "file";

/** Access bits of a PostScript object. */
export const AccessFlags = { x: 1, r: 2, w: 4 } as const;

export const Access = {
  Noaccess: 0,
  ExecOnly: AccessFlags.x,
  ReadOnly: AccessFlags.x | AccessFlags.r,
  Unlimited: AccessFlags.x | AccessFlags.r | AccessFlags.w,
} as const;

/** The state `save` pushes and `restore` returns to. */
export interface SaveStateValue {
  saveGeneration: number;
  graphicsState: number;
}

/** Fields every PS object has (objectBuilder / compositeObjectBuilder). */
abstract class PSObjectBase {
  abstract readonly className: PSClassName;
  abstract readonly _type: string;
  access: number = Access.Unlimited;
  executable = false;
  composite = false;
  /** Input position of the token the object came from (-1 for composites). */
  pointer: number | null | undefined = -1;
}

/** bool, name, operator, mark and saveState: a value set once. */
abstract class PSSimpleObject<V> extends PSObjectBase {
  value: V;

  constructor(value: V, classes: PSClasses) {
    super();
    this.value = value;
    this.pointer = classes.parser.pointer;
  }
}

export class PSBool extends PSSimpleObject<boolean> {
  readonly className = "bool";
  readonly _type = "booleantype";
}

export class PSSaveState extends PSSimpleObject<SaveStateValue> {
  readonly className = "saveState";
  readonly _type = "savetype";
}

export class PSName extends PSSimpleObject<string> {
  readonly className = "name";
  readonly _type = "nametype";
  /** Immediately evaluated name (`//name`), looked up when it is read. */
  IEN = false;
  readonly #classes: PSClasses;

  constructor(value: string, classes: PSClasses) {
    super(value, classes);
    this.#classes = classes;
    if (value[0] == "/") this.value = value.substring(1);
  }

  execute(core: PSCore): void {
    if (!this.executable) return;
    const found = core.lookup(this);
    if (found === undefined) return;
    if (typeof found == "string" || typeof found == "number") core.stack.push(found);
    if (this.#classes.isPSObject(found)) {
      if ("execute" in found) found.execute(core);
      else core.stack.push(found);
    }
    if (typeof found == "function") found.call(core);
  }
}

export class PSOperator extends PSSimpleObject<string> {
  readonly className = "operator";
  readonly _type = "operatortype";
  readonly #classes: PSClasses;

  constructor(value: string, classes: PSClasses) {
    super(value, classes);
    this.#classes = classes;
    this.executable = true;
  }

  execute(core: PSCore): void {
    const found = core.lookup(this);
    if (found === undefined) return;
    if (typeof found == "string" || typeof found == "number" || found === null)
      core.stack.push(found);
    if (this.#classes.isPSObject(found)) {
      if ("execute" in found && found.executable) found.execute(core);
      else core.stack.push(found);
    }
    if (typeof found == "function") found.call(core);
  }
}

/** `[`, `]`, `<<`, `>>`, `{` and `}`. Executing a closing mark builds the array or dict. */
export class PSMark extends PSSimpleObject<string> {
  readonly className = "mark";
  readonly _type = "marktype";
  readonly #classes: PSClasses;

  constructor(value: string, classes: PSClasses) {
    super(value, classes);
    this.#classes = classes;
    this.executable = true;
  }

  execute(core: PSCore): PSArray | PSDict | false | undefined {
    let found = false;
    let depth = 0;
    if (this.value == "[" || this.value == "<<") core.stack.push(this);
    if (this.value != "]" && this.value != ">>") return undefined;
    let index: number;
    for (index = core.stack.length - 1; index >= 0; index--) {
      const entry = core.stack[index];
      if (entry === null || typeof entry != "object" || !("className" in entry)) continue;
      const mark = entry as PSObject;
      if (mark.className == "mark" && (mark.value == ">>" || mark.value == "]")) ++depth;
      if (mark.className == "mark" && (mark.value == "<<" || mark.value == "[")) {
        if (depth == 0) {
          found = true;
          break;
        }
        --depth;
      }
    }
    if (this.value == "]") {
      if (found) {
        const array = this.#classes.newObject("array", core.stack.slice(index + 1));
        array.pointer = this.pointer;
        core.stack = core.stack.slice(0, index);
        core.stack.push(array);
        return array;
      }
      return undefined;
    }
    // Sic: `& false` is always 0, so an odd number of entries is never refused.
    if ((core.stack.length - index) & Number(false)) return false;
    if (found) {
      const entries: PSPlainRecord = {};
      for (let i = index + 1; i < core.stack.length; i += 2) {
        const key = core.stack[i];
        if (key !== null && typeof key == "object" && "className" in key)
          entries[String((key as PSObject).value)] = core.stack[i + 1];
      }
      const dict = core.classes.newObject("dict", entries);
      dict.pointer = this.pointer;
      core.stack = core.stack.slice(0, index);
      core.stack.push(dict);
      return dict;
    }
    return undefined;
  }
}

/**
 * Arrays, dicts, strings and gstates. Created while `isGlobal` is false they
 * keep one copy of their value per save generation, so `restore` brings
 * back the value an object had at the matching `save`. Objects made by
 * getinterval share their elements with the parent through the interval
 * fields; the newer side wins when the value is read.
 */
abstract class PSComposite<V> extends PSObjectBase {
  override composite = true;
  global: boolean;
  valuePointer = 0;
  declare _value?: V[];
  declare intervalParent?: PSComposite<V>;
  declare intervalChildren?: PSComposite<V>[];
  declare intervalIndex?: number;
  declare intervalCount?: number;
  declare intervalTimeStamp?: number;
  readonly #classes: PSClasses;
  readonly #cloneValue: (value: V) => V;
  #plainValue: V;

  constructor(value: V, classes: PSClasses, cloneValue: (value: V) => V) {
    super();
    this.#classes = classes;
    this.#cloneValue = cloneValue;
    this.global = classes.core.isGlobal;
    this.pointer = -1;
    this.#plainValue = value;
    if (!classes.core.isGlobal) {
      this._value = [];
      this._value[classes.core.saveGeneration] = cloneValue(value);
    }
  }

  get value(): V {
    const versions = this._value;
    if (!versions) return this.#plainValue;
    const generation = this.#classes.core.saveGeneration;
    if (generation >= versions.length) {
      for (let g = versions.length; g <= generation; g++)
        versions[g] = this.#cloneValue(versions[g - 1] as V);
    } else {
      while (generation < versions.length - 1) versions.pop();
    }
    let current = versions[generation] as V;
    const children = this.intervalChildren;
    const parent = this.intervalParent;
    if (children !== undefined) {
      for (const child of children) {
        const childVersions = child._value as V[];
        const start = child.intervalIndex as number;
        const count = child.intervalCount as number;
        if ((this.intervalTimeStamp as number) > (child.intervalTimeStamp as number)) {
          childVersions[generation] = sliceValue(current, start, start + count);
        } else {
          for (let i = 0; i < count; i++)
            assignElement(current, i + start, elementAt(childVersions[generation] as V, i));
        }
      }
    } else if (parent !== undefined) {
      const parentVersions = parent._value as V[];
      const start = this.intervalIndex as number;
      const count = this.intervalCount as number;
      if ((parent.intervalTimeStamp as number) > (this.intervalTimeStamp as number)) {
        current = sliceValue(parentVersions[generation] as V, start, start + count);
      } else {
        for (let i = 0; i < count; i++)
          assignElement(parentVersions[generation] as V, i + start, elementAt(current, i));
      }
    }
    return current;
  }

  set value(value: V) {
    if (!this._value) {
      this.#plainValue = value;
      return;
    }
    this._value[this.#classes.core.saveGeneration] = value;
    if (this.intervalChildren !== undefined || this.intervalParent !== undefined)
      this.intervalTimeStamp = performance.now();
  }

  isEOF(): boolean {
    return this.valuePointer >= valueLength(this.value);
  }

  getUint8(): number | null {
    const value = this.value;
    if (this.valuePointer >= valueLength(value)) return null;
    this.valuePointer++;
    return typeof value == "string"
      ? value.charCodeAt(this.valuePointer - 1)
      : (elementAt(value, this.valuePointer - 1) as number);
  }
}

function valueLength(value: unknown): number {
  return (value as { length: number }).length;
}

function sliceValue<V>(value: V, start: number, end: number): V {
  return (value as unknown as { slice(a: number, b: number): V }).slice(start, end);
}

function elementAt(value: unknown, index: number): unknown {
  return (value as Record<number, unknown>)[index];
}

/** Element assignment as sloppy mode did it: a no-op on strings. */
function assignElement(target: unknown, index: number, element: unknown): void {
  if (typeof target == "string") return;
  (target as Record<number, unknown>)[index] = element;
}

function copyArray(value: PSValue[]): PSValue[] {
  return value.slice();
}

function copyRecord(value: PSPlainRecord): PSPlainRecord {
  const copy: PSPlainRecord = {};
  for (const key in value) copy[key] = value[key];
  return copy;
}

function same<V>(value: V): V {
  return value;
}

export class PSArray extends PSComposite<PSValue[]> {
  readonly className = "array";
  readonly _type = "arraytype";
  /** The string the procedure produced last when it is read as a file (see getChar). */
  #procedureOutput: PSObject | null = null;
  #firstCall = true;
  #outputIndex = 0;
  readonly #arrayClasses: PSClasses;

  constructor(value: PSValue[], classes: PSClasses) {
    super(value, classes, copyArray);
    this.#arrayClasses = classes;
  }

  override isEOF(): boolean {
    const output = this.#procedureOutput;
    return (
      this.valuePointer >= this.value.length ||
      (this.executable &&
        !this.#firstCall &&
        (!output || !output.value || !(output.value as string).length))
    );
  }

  /** An executable array used as a data source: runs it for every new chunk. */
  getChar(): string | null {
    const core = this.#arrayClasses.core;
    const output = this.#procedureOutput;
    if (
      this.executable &&
      (!output ||
        !(output.value as string).length ||
        this.#outputIndex >= (output.value as string).length)
    ) {
      this.#firstCall = false;
      core.execstack.push(this);
      core.fill$error();
      this.execute(core);
      core.execstack.pop();
      const result = core.stack.pop();
      if (this.#arrayClasses.isPSObject(result, "string")) {
        this.#procedureOutput = result;
        this.#outputIndex = 0;
      }
    }
    const current = this.#procedureOutput;
    if (
      current &&
      current.value &&
      (current.value as string).length &&
      this.#outputIndex < (current.value as string).length
    ) {
      const char = (current.value as string)[this.#outputIndex] as string;
      ++this.#outputIndex;
      return char;
    }
    return null;
  }

  override getUint8(): number | null {
    if (this.executable) {
      const char = this.getChar();
      return char != null ? char.charCodeAt(0) : null;
    }
    return super.getUint8();
  }

  execute(core: PSCore): void {
    if (!this.executable) return;
    const classes = this.#arrayClasses;
    let depth = 0;
    let procedure: PSValue[] = [];
    const items = this.value;
    for (let n = 0; n < items.length; n++) {
      if (core.stopFlag || core.exitFlag) return;
      const item = items[n];
      if (classes.isPSObject(item, "mark") || classes.isPSObject(item, "array")) {
        if (item.value == "{" && ++depth == 1) continue;
        if (item.value == "}" && --depth == 0) {
          const array = classes.newObject("array", procedure);
          core.stack.push(array);
          array.executable = true;
          array.pointer = item.pointer;
          procedure = [];
          continue;
        }
        if (classes.isPSObject(item, "array")) {
          const array = classes.newObject("array", item.value);
          core.stack.push(array);
          array.executable = true;
          array.pointer = item.pointer;
          continue;
        }
      }
      if (depth == 0) core.tokenExecute(item);
      else procedure.push(item);
    }
  }
}

export class PSPackedArray extends PSComposite<PSValue[]> {
  readonly className = "packedarray";
  readonly _type = "packedarraytype";

  constructor(value: PSValue[], classes: PSClasses) {
    super(value, classes, copyArray);
    this.access = Access.ReadOnly;
  }
}

export class PSDict extends PSComposite<PSPlainRecord> {
  readonly className = "dict";
  readonly _type = "dicttype";

  constructor(value: PSPlainRecord, classes: PSClasses) {
    super(value, classes, copyRecord);
  }
}

export class PSString extends PSComposite<string> {
  readonly className = "string";
  readonly _type = "stringtype";
  readonly #stringClasses: PSClasses;

  constructor(value: string, classes: PSClasses) {
    super(value, classes, same);
    this.#stringClasses = classes;
  }

  /** An executable string is parsed and run like program text. */
  execute(core: PSCore): void {
    if (!this.executable) {
      core.stack.push(this);
      return;
    }
    const parser = this.#stringClasses.parser;
    const input = parser.inputArray;
    const eof = parser.EOF;
    const pointer = parser.pointer;
    const bytes = new Uint8Array(this.value.length);
    for (let i = 0, n = this.value.length; i < n; ++i) bytes[i] = this.value.charCodeAt(i);
    parser.pointer = 0;
    parser.EOF = false;
    parser.inputArray = bytes;
    parser.nestedParse++;
    parser._readLoop();
    parser.nestedParse--;
    parser.pointer = pointer;
    parser.EOF = eof;
    parser.inputArray = input;
  }
}

export class PSGState extends PSComposite<GraphicsState> {
  readonly className = "gstate";
  readonly _type = "gstatetype";

  constructor(value: GraphicsState, classes: PSClasses) {
    super(value, classes, same);
    this.executable = false;
  }
}

/**
 * A file: the program input itself, or a filter over another data source
 * (a file, string or procedure). Filters assign `filter` (and sometimes
 * isEOF, resetSelf, _init, ...) on the instance.
 */
export class PSFile {
  readonly className = "file";
  executable = false;
  access: number = Access.ReadOnly;
  readonly _type = "filetype";
  startPointer: number;
  EOF = false;
  underlyingFile: PSValue;
  firstRun = true;
  declare filter?: () => number | null;
  declare _init?: (a?: unknown, b?: unknown) => void;
  declare pointer?: number | null | undefined;
  declare value?: unknown;
  readonly #classes: PSClasses;

  constructor(underlyingFile: PSValue, classes: PSClasses) {
    this.#classes = classes;
    this.startPointer = classes.parser.pointer;
    this.underlyingFile = underlyingFile;
  }

  getChar(): string {
    return String.fromCharCode(this.getUint8() as number);
  }

  getUint8(): number | null {
    if ("filter" in this) {
      const byte = (this.filter as () => number | null)();
      if (byte === null) this.EOF = true;
      return byte;
    }
    if (this.firstRun) this.firstRun = false;
    this.#classes.parser.pointer++;
    return this.#classes.parser._uint8At(-1);
  }

  back(): void {
    this.#classes.parser.pointer--;
  }

  resetSelf(): void {
    const underlying = this.underlyingFile;
    if (underlying && typeof underlying == "object" && "resetSelf" in underlying)
      (underlying as { resetSelf(): void }).resetSelf();
  }

  flushSelf(): void {
    while (!this.isEOF()) this.getUint8();
  }

  bytesAvailable(): number {
    return -1;
  }

  isEOF(): boolean {
    return this.EOF || this.#classes.parser.isEOF();
  }

  init(a?: unknown, b?: unknown): void {
    const underlying = this.underlyingFile;
    if (underlying && typeof underlying == "object" && "init" in underlying)
      (underlying as { init(): void }).init();
    if ("_init" in this) (this._init as (a?: unknown, b?: unknown) => void)(a, b);
  }

  /** An executable file is read to its end and run like program text. */
  execute(core: PSCore): void {
    if (!this.executable) {
      core.stack.push(this);
      return;
    }
    const bytes: number[] = [];
    let byte: number | null;
    while (!this.isEOF() && (byte = this.getUint8()) != null) bytes.push(byte);
    const parser = this.#classes.parser;
    const input = parser.inputArray;
    const eof = parser.EOF;
    const pointer = parser.pointer;
    parser.pointer = 0;
    parser.EOF = false;
    parser.inputArray = bytes;
    parser.nestedParse++;
    parser._readLoop();
    parser.nestedParse--;
    parser.pointer = pointer;
    parser.EOF = eof;
    parser.inputArray = input;
  }
}

export type PSObject =
  | PSBool
  | PSSaveState
  | PSName
  | PSOperator
  | PSMark
  | PSArray
  | PSPackedArray
  | PSDict
  | PSString
  | PSGState
  | PSFile;

interface PSObjectByName {
  bool: PSBool;
  saveState: PSSaveState;
  name: PSName;
  operator: PSOperator;
  mark: PSMark;
  array: PSArray;
  packedarray: PSPackedArray;
  dict: PSDict;
  string: PSString;
  gstate: PSGState;
  file: PSFile;
  graphicsState: GraphicsState;
}

interface PSValueByName {
  bool: boolean;
  saveState: SaveStateValue;
  name: string;
  operator: string;
  mark: string;
  array: PSValue[];
  packedarray: PSValue[];
  dict: PSPlainRecord;
  string: string;
  gstate: GraphicsState;
  file: PSValue;
  graphicsState: GraphicsState | undefined;
}

export type PSObjectOf<K extends PSClassName> = PSObjectByName[K];

/** A point of the current path (null until the first moveto). */
export interface PSPosition {
  x: number | null;
  y: number | null;
}

/**
 * The graphics state. A new one starts from the PostScript defaults; a
 * copy takes over every own property, slicing arrays one level deep.
 */
export class GraphicsState {
  [key: string]: unknown;
  declare defaultCTM: number[];
  declare CTM: number[];
  declare position: PSPosition;
  declare path: PSPathSegment[][];
  declare clippingPath: PSClipPath[];
  declare clippingPathStack: PSClipPath[][];
  declare colorSpace: PSValue[];
  declare color: PSValue;
  declare font: PSValue;
  declare lineWidth: number;
  declare lineCap: number;
  declare lineJoin: number;
  declare miterLimit: number;
  declare dashPattern: { arr: number[]; param: number };
  declare strokeAdjustment: boolean;
  declare colorRendering: PSPlainRecord;
  declare overprint: boolean;
  declare blackGeneration: PSArray;
  declare undercolorRemoval: PSArray;
  declare transfer: PSArray[];
  declare halftone: PSDict;
  declare flatness: number;
  declare smoothness: number;
  declare device: unknown;

  constructor(source: GraphicsState | undefined, classes: PSClasses) {
    if (source === undefined) {
      const core = classes.core;
      this.defaultCTM = [1, 0, 0, -1, 0, 0];
      this.CTM = [1, 0, 0, -1, 0, 0];
      this.position = { x: null, y: null };
      this.path = [];
      this.clippingPath = [];
      this.clippingPathStack = [];
      this.colorSpace = [classes.newObject("name", "DeviceGray")];
      this.color = 0;
      this.font = {};
      this.lineWidth = 1;
      this.lineCap = 0;
      this.lineJoin = 0;
      this.miterLimit = 10;
      this.dashPattern = { arr: [], param: 0 };
      this.strokeAdjustment = false;
      this.colorRendering = {};
      this.overprint = false;
      this.blackGeneration = classes.newObject("array", [core.systemdict.pop, 0]);
      this.blackGeneration.executable = true;
      this.undercolorRemoval = classes.newObject("array", [core.systemdict.pop, 0]);
      this.undercolorRemoval.executable = true;
      this.transfer = [
        classes.newObject("array", []),
        classes.newObject("array", []),
        classes.newObject("array", []),
        classes.newObject("array", []),
      ];
      for (const transfer of this.transfer) transfer.executable = true;
      this.halftone = classes.newObject("dict", {
        HalftoneType: 1,
        SpotFunction: classes.newObject("array", []),
        Angle: 0,
        Frequency: 4.411,
      });
      this.flatness = 1;
      this.smoothness = 1;
      this.device = null;
    } else {
      for (const key in source) {
        const value = source[key];
        this[key] = Array.isArray(value) ? value.slice() : value;
      }
    }
  }
}

/** One segment of a subpath, as the host's path2GPath reads it. */
export interface PSPathSegment {
  type: string;
  [key: string]: unknown;
}

/** A clipping path: subpaths plus the id the host groups clips by. */
export type PSClipPath = PSPathSegment[][] & { clipPathId?: number };

/** PSClasses: creates PS objects and answers type questions about values. */
export class PSClasses {
  static readonly AccessFlags = AccessFlags;
  readonly Access = Access;
  readonly parser: PSParser;
  declare core: PSCore;

  constructor(parser: PSParser) {
    this.parser = parser;
    parser.classes = this;
    if (parser.core) {
      this.core = parser.core;
      this.core.classes = this;
    }
  }

  newObject<K extends keyof PSObjectByName>(type: K, value: PSValueByName[K]): PSObjectByName[K];
  newObject(type: string, value: unknown): PSObject | GraphicsState | null;
  newObject(type: string, value: unknown): PSObject | GraphicsState | null {
    switch (type) {
      case "bool":
        return new PSBool(value as boolean, this);
      case "saveState":
        return new PSSaveState(value as SaveStateValue, this);
      case "name":
        return new PSName(value as string, this);
      case "operator":
        return new PSOperator(value as string, this);
      case "mark":
        return new PSMark(value as string, this);
      case "array":
        return new PSArray(value as PSValue[], this);
      case "packedarray":
        return new PSPackedArray(value as PSValue[], this);
      case "dict":
        return new PSDict(value as PSPlainRecord, this);
      case "string":
        return new PSString(value as string, this);
      case "gstate":
        return new PSGState(value as GraphicsState, this);
      case "file":
        return new PSFile(value as PSValue, this);
      case "graphicsState":
        return new GraphicsState(value as GraphicsState | undefined, this);
      default:
        return null;
    }
  }

  /** Whether a value is a PS object (of the given class name). */
  isPSObject(value: unknown): value is PSObject;
  isPSObject<K extends PSClassName>(value: unknown, className: K): value is PSObjectOf<K>;
  isPSObject(value: unknown, className?: string): boolean {
    if (typeof value != "object" || value === null) return false;
    if (!("className" in value)) return false;
    if (className === undefined) return true;
    return (value as { className: string }).className == className;
  }

  isInt(value: unknown): value is number {
    return typeof value == "number" && value % 1 == 0;
  }

  isUnsignedInt(value: unknown): value is number {
    return this.isInt(value) && value >= 0;
  }
}
