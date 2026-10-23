// Old: public/pscore.js (PSCore, webpack module 1370 of its own build).
//
// The PostScript interpreter: operand, execution, dictionary and graphics
// state stacks, error handling, and the bridge to the page (toGravit,
// waitForResponse). The operators of systemdict live in ./operators, the
// filters in ./filters.ts, text output in ./show.ts and Type 1 charstrings
// in ./charstrings.ts.
//
// Dropped: the old file also built a table of Standard 14 AFM widths, but
// never stored it anywhere (dead code).
import type { PSColor } from "./color.ts";
import type { PSCTM } from "./ctm.ts";
import { createFilters } from "./filters.ts";
import { Type1CharString } from "./charstrings.ts";
import {
  Access,
  type PSArray,
  type PSClasses,
  type PSDict,
  type PSObject,
  type PSPathSegment,
  type PSPlainRecord,
  type PSValue,
  type GraphicsState,
} from "./objects.ts";
import { basicOperators } from "./operators/basic.ts";
import { graphicsOperators } from "./operators/graphics.ts";
import type { PSParser } from "./parser.ts";
import { show, type ShowMode } from "./show.ts";
import { ISO_LATIN1_ENCODING, STANDARD_ENCODING } from "./encodings.ts";
import type { PSHost } from "./host.ts";

/** The font data _getFont builds for outlining Type 1 text. */
export interface PSType1FontData {
  subrs: PSValue[];
  subrsBias: PSValue;
  gsubrs: PSValue[];
  gsubrsBias: PSValue;
  FontMatrix: PSValue[];
  FontType: number;
  glyphs: Record<number, Type1CharString>;
}

/** The resource categories; findresource and friends add more by name. */
export interface PSResources {
  Category: PSDict;
  Font: PSDict;
  CIDFont: PSDict;
  CMap: PSDict;
  FontSet: PSDict;
  Encoding: PSDict;
  Form: PSDict;
  Pattern: PSDict;
  ProcSet: PSDict;
  FontType: PSDict;
  [category: string]: PSDict | undefined;
}

/** What fill$error stores in $error. */
interface ErrorState {
  [key: string]: PSValue;
}

export class PSCore {
  declare parser: PSParser;
  declare classes: PSClasses;
  declare host: PSHost;
  declare outlineFonts: boolean;
  /** The CTM helper (set by PSCTM's constructor). */
  declare CTM: PSCTM;
  /** The color helper (set by PSColor's constructor). */
  declare color: PSColor;
  declare nestedProcCount: number;
  /** False while the parser collects the tokens of a procedure. */
  declare execute: boolean;
  declare currentExecutableArray: PSArray | null;
  declare procArraysStack: PSArray[];
  declare clipPathId: number;
  declare stoppedContext: number;
  declare stopFlag: boolean;
  declare loopingContext: number;
  declare exitFlag: boolean;
  declare stack: PSValue[];
  declare execstack: PSValue[];
  declare gstack: GraphicsState[];
  declare version: string;
  declare productString: string;
  declare $error: PSDict;
  declare saveGeneration: number;
  declare isGlobal: boolean;
  declare isPackedMode: boolean;
  declare seedNum: number;
  declare m_z: number;
  declare lookupFailedCount: number;
  declare statusdict: PSPlainRecord;
  declare resources: PSResources;
  declare systemdict: PSPlainRecord;
  declare errordict: PSDict;
  declare userdict: PSDict;
  declare currentDictStack: (PSPlainRecord | PSDict)[];
  declare gstate: GraphicsState;
  /** Set by setuserparams. */
  declare userparams?: PSValue;
  /** Entry counts read by begincodespacerange / begincidrange. */
  declare codespacerangeCount?: PSValue;
  declare cidrangeCount?: PSValue;

  constructor(parser: PSParser, outlineFonts: boolean, host: PSHost) {
    // The assignments keep the old order: $error below is created while
    // saveGeneration and isGlobal are still unset, as it was.
    this.host = host;
    this.parser = parser;
    this.parser.core = this;
    this.classes = parser.classes;
    if (this.classes) this.classes.core = this;
    this.outlineFonts = outlineFonts;
    this.CTM = null as unknown as PSCTM;
    this.nestedProcCount = 0;
    this.execute = true;
    this.currentExecutableArray = null;
    this.clipPathId = 0;
    this.stoppedContext = 0;
    this.stopFlag = false;
    this.loopingContext = 0;
    this.exitFlag = false;
    this.stack = [];
    this.execstack = [];
    this.gstack = [];
    this.version = "3010";
    this.productString = "Gravit Designer PostScript importer";
    this.$error = this.classes.newObject("dict", {});
    this.saveGeneration = 0;
    this.isGlobal = false;
    this.isPackedMode = false;
    this.seedNum = 54321;
    this.m_z = 987654321;
    this.lookupFailedCount = 0;
    this.statusdict = {
      product: this.classes.newObject("string", this.productString),
    };
    const dict = (value: PSPlainRecord) => this.classes.newObject("dict", value);
    const resources = {} as PSResources;
    this.resources = resources;
    resources.Category = dict({});
    resources.Category.value.Category = resources.Category;
    resources.Font = dict({});
    resources.CIDFont = dict({});
    resources.CMap = dict({});
    resources.FontSet = dict({});
    resources.Encoding = dict({ StandardEncoding: null, ISOLatin1Encoding: null });
    resources.Form = dict({});
    resources.Pattern = dict({});
    resources.ProcSet = dict({ CIDInit: dict({}) });
    resources.FontType = dict({});
    const category = resources.Category.value;
    category.Generic = dict({});
    category.Font = resources.Font;
    category.CIDFont = resources.CIDFont;
    category.CMap = resources.CMap;
    category.FontSet = resources.FontSet;
    category.Encoding = resources.Encoding;
    category.Form = resources.Form;
    category.Pattern = resources.Pattern;
    category.ProcSet = resources.ProcSet;
    category.FontType = resources.FontType;
    category.ColorSpace = dict({});
    category.Filter = dict(createFilters(this));
    this.systemdict = { ...basicOperators, ...graphicsOperators };
    const errordict: PSPlainRecord = {
      handleerror(this: PSCore) {
        const error = this.$error.value as ErrorState;
        (error.newerror as PSObject).value = false;
        this.tokenAction(this.classes.newObject("operator", "stop"));
        if (this.stoppedContext == 0) this.stopFlag = false;
        this.exitFlag = false;
      },
      stackunderflow(this: PSCore) {
        const error = this.$error.value as ErrorState;
        (error.newerror as PSObject).value = false;
        this.tokenAction(this.classes.newObject("operator", "stop"));
      },
    };
    this.userdict = dict({});
    this.errordict = dict(errordict);
    // Sic: wraps the first $error dict object itself; fill$error replaces
    // the value before anything reads it.
    this.$error = this.classes.newObject("dict", this.$error as unknown as PSPlainRecord);
    this.systemdict.globaldict = dict({});
    this.currentDictStack = [this.systemdict, this.systemdict.globaldict as PSDict, this.userdict];
    this.gstate = this.classes.newObject("graphicsState", undefined);

    const standard = this.classes.newObject("string", STANDARD_ENCODING);
    standard.executable = true;
    standard.execute(this);
    resources.Encoding.value.StandardEncoding = this.stack.pop();
    const latin1 = this.classes.newObject("string", ISO_LATIN1_ENCODING);
    latin1.executable = true;
    latin1.execute(this);
    resources.Encoding.value.ISOLatin1Encoding = this.stack.pop();
    const encodings = (category.Encoding as PSDict).value;
    this.systemdict.StandardEncoding = encodings.StandardEncoding;
    this.systemdict.ISOLatin1Encoding = encodings.ISOLatin1Encoding;
  }

  /** Finds a name in the dictionary stack, innermost first. */
  lookup(key: PSValue): PSValue {
    let name = key;
    if (this.classes.isPSObject(name)) name = name.value as PSValue;
    const property = name as string;
    for (let i = this.currentDictStack.length - 1; i >= 0; i--) {
      const dict = this.currentDictStack[i] as PSPlainRecord | PSDict;
      if (this.classes.isPSObject(dict) && dict.value && property in dict.value)
        return dict.value[property];
      if (property in dict) return (dict as PSPlainRecord)[property];
    }
    this.lookupFailedCount++;
    return undefined;
  }

  /** Executes a token, or collects it into the procedure being read. */
  tokenAction(token: PSValue): void {
    let t = token;
    if (this.classes.isPSObject(t, "name") && t.IEN) t = this.lookup(t);
    if (this.execute) {
      if (this.classes.isPSObject(t) && t.value == "}" && this.currentExecutableArray) {
        const procedure = this.currentExecutableArray;
        procedure.executable = true;
        procedure.pointer = this.currentExecutableArray.pointer;
        this.procArraysStack = [];
        this.stack.push(procedure);
        this.currentExecutableArray = null;
        return;
      }
      this.tokenExecute(t);
    } else if (this.classes.isPSObject(t, "mark") && t.value == "{") {
      if (this.currentExecutableArray) {
        const nested = this.classes.newObject("array", []);
        this.currentExecutableArray.value.push(nested);
        this.procArraysStack.push(nested);
        this.currentExecutableArray = nested;
        this.currentExecutableArray.pointer = t ? t.pointer : null;
      } else {
        this.currentExecutableArray = this.classes.newObject("array", []);
        this.currentExecutableArray.pointer = t ? t.pointer : null;
        this.procArraysStack = [this.currentExecutableArray];
      }
    } else if (this.classes.isPSObject(t, "mark") && t.value == "}") {
      // Sic: `!length >= 2` compares a boolean with 2 and is always false.
      if (!this.currentExecutableArray) return;
      this.currentExecutableArray.pointer = t ? t.pointer : null;
      this.currentExecutableArray.executable = true;
      this.procArraysStack.pop();
      this.currentExecutableArray = this.procArraysStack[this.procArraysStack.length - 1] as
        PSArray | undefined as PSArray | null;
    } else {
      if (!this.currentExecutableArray) return;
      this.currentExecutableArray.value.push(t);
      this.currentExecutableArray.pointer = t ? pointerOf(t) : null;
    }
  }

  /** Runs one value: numbers and null are pushed, operators and executable objects run. */
  tokenExecute(t: PSValue): void {
    if (typeof t == "boolean") return;
    if (typeof t == "number" || t === null) {
      this.stack.push(t);
    } else if (typeof t == "function") {
      this.execstack.push(t);
      this.fill$error();
      t.call(this);
      this.execstack.pop();
    } else if (this.classes.isPSObject(t)) {
      if ("execute" in t && t.executable) {
        this.execstack.push(t);
        this.fill$error();
        (t.execute as (core: PSCore) => unknown).call(t, this);
        this.execstack.pop();
      } else {
        this.stack.push(t);
      }
    }
  }

  /** The name of the operator on top of the execution stack ("dunno" if unknown). */
  getMyName(): PSValue {
    const top = this.execstack[this.execstack.length - 1];
    let name: PSValue = "dunno";
    if (this.classes.isPSObject(top)) name = top.value as PSValue;
    else if (typeof top == "function") {
      for (const key in this.systemdict) {
        if (this.systemdict[key] === top) {
          name = key;
          break;
        }
      }
    }
    return name;
  }

  fill$error(): void {
    const name = this.getMyName();
    this.$error.value = {
      newerror: this.classes.newObject("bool", true),
      errorname: null,
      command: name === undefined ? null : name,
      errorinfo: null,
      ostack: null,
      estack: null,
      dstack: null,
    };
  }

  /**
   * Raises stackunderflow when fewer than `count` operands are on the
   * stack. Callers sometimes pass the operator name as a second argument;
   * it is ignored.
   */
  stackunderflowCheck(count: number, name?: string): boolean {
    void name;
    if (this.stack.length < count) {
      this.initiateError("stackunderflow", String(this.getMyName()));
      return true;
    }
    return false;
  }

  /** Runs the errordict handler for `error` (or handleerror). The second argument is ignored. */
  initiateError(error: string, command?: unknown): void {
    void command;
    const name = this.getMyName();
    const state = this.$error.value as ErrorState;
    state.command = name;
    state.errorname = error;
    const handlers = this.errordict.value;
    if (error in handlers) {
      const handler = handlers[error];
      if (typeof handler == "function") handler.call(this);
      else if (handler && typeof handler == "object" && "execute" in handler)
        (handler as { execute(core: PSCore): unknown }).execute(this);
    } else if (this.classes.isPSObject(handlers.handleerror, "array")) {
      handlers.handleerror.executable = true;
      handlers.handleerror.execute(this);
    } else {
      (handlers.handleerror as (this: PSCore) => void).call(this);
    }
  }

  /** Copies a path two levels deep (subpaths and their segments arrays). */
  pathCopy(path?: PSPathSegment[][]): PSPathSegment[][] {
    const source = path === undefined ? this.gstate.path : path;
    const copy = source.slice();
    for (let i = 0; i < copy.length; i++) copy[i] = (copy[i] as PSPathSegment[]).slice();
    return copy;
  }

  /**
   * Posts a call to the page. With `clone` (the default) the data goes
   * through JSON first, as the old worker did; otherwise it is posted as is
   * together with `result` (a SharedArrayBuffer for waitForResponse).
   */
  toGravit(func: string, data?: unknown[], clone?: boolean | null, result?: unknown): void {
    if (clone === undefined) clone = true;
    const args = data || [];
    if (clone) this.host.postMessage({ func, data: JSON.parse(JSON.stringify(args)) as unknown[] });
    else this.host.postMessage({ func, data: args, result: result || null });
  }

  /** Turns a resourceforall template (`*`, `?`) into a regular expression. */
  templateToRegExp(template: string): RegExp {
    let source = "";
    for (let i = 0; i < template.length; i++) {
      switch (template[i]) {
        case "*":
          source += ".*";
          break;
        case "?":
          source += ".";
          break;
        default:
          source += template[i];
      }
    }
    return new RegExp(source);
  }

  /** A Type 1 font with standard encoding and no glyphs, for fonts that aren't defined. */
  _createDefaultFont(name: string): PSValue {
    const fonts = this.resources.Font.value;
    if (!fonts[name]) {
      const encodingSource = this.classes.newObject("string", STANDARD_ENCODING);
      encodingSource.executable = true;
      encodingSource.execute(this);
      const encoding = this.stack.pop();
      fonts[name] = this.classes.newObject("dict", {
        FontType: 1,
        FontMatrix: this.classes.newObject("array", [0.001, 0, 0, 0.001, 0, 0]),
        FontName: this.classes.newObject("name", name),
        Encoding: encoding,
        Private: this.classes.newObject("dict", {}),
        CharStrings: this.classes.newObject("dict", {}),
      });
    }
    return fonts[name];
  }

  /**
   * Asks the page for data and blocks until it answers through a
   * SharedArrayBuffer (used to decode JPEGs). Without a known size it
   * first asks for the size (two Int32s), then for the bytes. Without
   * SharedArrayBuffer and Atomics it reports error "02".
   */
  waitForResponse(func: string, data: unknown[], size?: number): Uint8Array | null {
    let byteCount = size;
    if (typeof Atomics != "undefined" && typeof SharedArrayBuffer != "undefined" && !byteCount) {
      const buffer = new SharedArrayBuffer(12);
      const dimensions = new Int32Array(buffer, 4, 2);
      const flag = new Int32Array(buffer, 0, 1);
      Atomics.store(flag, 0, 0);
      this.toGravit(func, data, false, buffer);
      Atomics.wait(flag, 0, 0, this.parser.MAXWAITTIME);
      if (flag[0]) byteCount = (dimensions[0] as number) * (dimensions[1] as number);
    }
    if (byteCount && typeof Atomics != "undefined" && typeof SharedArrayBuffer != "undefined") {
      const buffer = new SharedArrayBuffer(byteCount + 4);
      const bytes = new Uint8Array(buffer, 4, byteCount);
      const flag = new Int32Array(buffer, 0, 1);
      Atomics.store(flag, 0, 0);
      this.toGravit(func, data, false, buffer);
      Atomics.wait(flag, 0, 0, this.parser.MAXWAITTIME);
      return flag[0] ? bytes : null;
    }
    this.toGravit("error", ["02"]);
    return null;
  }

  /** Converts the glyphs of a Type 1 font dict into Type 2 charstrings by encoding index. */
  _getFont(font: PSPlainRecord): PSType1FontData {
    const charStrings = (font.CharStrings as PSDict).value;
    const privateDict = (font.Private as PSDict).value;
    const data: PSType1FontData = {
      subrs: privateDict.Subrs ? (privateDict.Subrs as PSArray).value : [],
      subrsBias: privateDict.SubrsBias,
      gsubrs: privateDict.GSubrs ? (privateDict.GSubrs as PSArray).value : [],
      gsubrsBias: privateDict.GSubrsBias,
      FontMatrix: (font.FontMatrix as PSArray).value,
      FontType: 1,
      glyphs: {},
    };
    const encoding = (font.Encoding as PSArray).value;
    for (let i = 0; i < encoding.length; ++i) {
      const converter = new Type1CharString();
      const glyphName = (encoding[i] as PSObject).value as string;
      const charString = charStrings[glyphName] as PSObject | undefined;
      const decrypted = charString ? converter.decrypt(charString.value as string) : null;
      if (decrypted) {
        converter.convert(decrypted, data.subrs, false);
        data.glyphs[i] = converter;
      }
    }
    return data;
  }

  _show(mode: ShowMode): void {
    show(this, mode);
  }

  /** A shallow copy of an object (arrays get their own element list). */
  _makeObjCopy(object: PSObject): PSObject {
    const copy = (
      this.classes.isPSObject(object, "array") || this.classes.isPSObject(object, "packedarray")
        ? this.classes.newObject(object.className, (object.value as PSValue[]).slice())
        : this.classes.newObject(object.className, object.value)
    ) as PSObject;
    copy.access = object.access;
    copy.executable = object.executable;
    copy.pointer = object.pointer;
    return copy;
  }

  /**
   * bind: replaces operator names in a procedure by their current
   * definitions. Sic: only procedures with unlimited access (or packed
   * arrays) are bound; they become read-only.
   */
  _bindNames(procedure: PSArray | PSObject): void {
    if (
      !(procedure.access < Access.Unlimited) ||
      this.classes.isPSObject(procedure, "packedarray")
    ) {
      const items = procedure.value as PSValue[];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        if (this.classes.isPSObject(item, "operator")) {
          const found = this.lookup(item);
          if (typeof found == "function") items[i] = found;
        } else if (this.classes.isPSObject(item, "array") && item.executable) {
          this._bindNames(item);
        }
      }
      procedure.access = Access.ReadOnly;
    }
  }
}

function pointerOf(value: PSValue): number | null | undefined {
  return (value as { pointer?: number | null }).pointer;
}

/** Reads bit fields MSB first from a data source (a file or composite with getUint8). */
export class BitsReader {
  private readonly dataSource: { isEOF(): boolean; getUint8(): number | null };
  private currentBitShift = 0;
  private currentValue: number | null = null;

  constructor(dataSource: { isEOF(): boolean; getUint8(): number | null }) {
    this.dataSource = dataSource;
  }

  isEOF(): boolean {
    return this.dataSource.isEOF();
  }

  readBits(count: number): number {
    let bits = count;
    if (this.currentValue === null) this.currentValue = this.dataSource.getUint8();
    let result = (this.currentValue as number) & (255 >> this.currentBitShift);
    for (bits -= 8 - this.currentBitShift; bits > 8;) {
      this.currentValue = this.dataSource.getUint8();
      result = (result << 8) + (this.currentValue as number);
      bits -= 8;
    }
    if (bits > 0) {
      this.currentValue = this.dataSource.getUint8();
      result <<= bits;
      result += (this.currentValue as number) >> (8 - bits);
    } else {
      this.currentValue = null;
    }
    this.currentBitShift = bits;
    return result;
  }
}
