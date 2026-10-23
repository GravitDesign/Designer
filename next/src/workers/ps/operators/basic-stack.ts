// Old: public/pscore.js, systemdict entries dup … type.
//
// Kept quirks (QUESTIONS.md):
// - mark pushes a "[" mark.
// - cleartomark without a mark empties the stack.
// - dictstack makes the given array share the interpreter's dictionary
//   stack and replaces its first entry (the plain systemdict) by a dict
//   object wrapping it, which stays in the dictionary stack.
// - type answers unknowntype for numbers, booleans and null alike.
// - print discards its string; version pushes "3010".
import type { PSCore } from "../core.ts";
import type { PSPlainRecord, PSValue } from "../objects.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** What copy reads and writes on its operands without checking them first. */
interface Copyable {
  className?: string;
  value: unknown;
}

export const stackOperators: PSPlainRecord = {
  dup(this: PSCore) {
    const value = top(this);
    this.stack.push(value);
  },
  copy(this: PSCore) {
    this.fill$error();
    const countOrTarget = top(this);
    if (this.classes.isUnsignedInt(countOrTarget)) {
      if (this.stackunderflowCheck(countOrTarget + 1, "copy")) return;
      this.stack.pop();
      const copied = this.stack.slice(this.stack.length - countOrTarget);
      this.stack = this.stack.concat(copied);
      return;
    }
    if (this.stackunderflowCheck(2, "copy")) return;
    const target = countOrTarget as unknown as Copyable;
    const source = top(this, 2);
    if (
      (this.classes.isPSObject(source, "array") ||
        this.classes.isPSObject(source, "dict") ||
        this.classes.isPSObject(source, "string") ||
        this.classes.isPSObject(source, "packedarray")) &&
      (source.className == target.className ||
        (source.className == "packedarray" && target.className == "array"))
    ) {
      this.stack.pop();
      this.stack.pop();
      if (Array.isArray(source.value)) target.value = source.value.slice();
      else if (source.className == "dict") {
        const entries: PSPlainRecord = {};
        const sourceEntries = source.value;
        for (const key in sourceEntries) entries[key] = sourceEntries[key];
        target.value = entries;
      } else target.value = source.value;
      this.stack.push(countOrTarget);
    } else this.initiateError("typecheck", "copy");
  },
  exch(this: PSCore) {
    const first = this.stack.pop();
    const second = this.stack.pop();
    this.stack.push(first);
    this.stack.push(second);
  },
  roll(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "roll")) return;
    const shift = this.stack.pop();
    const count = this.stack.pop();
    if (this.classes.isUnsignedInt(count) && this.classes.isInt(shift)) {
      if (!this.stackunderflowCheck(count, "roll") && count != 0) {
        if (shift > 0)
          for (let i = 0; i < shift; i++) {
            const value = this.stack.pop();
            this.stack.splice(this.stack.length - count + 1, 0, value);
          }
        if (shift < 0)
          for (let i = 0; i < -shift; i++) {
            const value = this.stack[this.stack.length - count];
            this.stack.splice(this.stack.length - count, 1);
            this.stack.push(value);
          }
      }
    } else this.initiateError("typecheck", "roll");
  },
  index(this: PSCore) {
    this.fill$error();
    const depth = top(this);
    if (this.stackunderflowCheck((depth as number) + 1, "index")) return;
    if (this.classes.isUnsignedInt(depth)) {
      this.stack.pop();
      this.stack.push(this.stack[this.stack.length - 1 - depth]);
    } else this.initiateError("typecheck", "index");
  },
  pop(this: PSCore) {
    if (!this.stackunderflowCheck(1)) this.stack.pop();
  },
  mark(this: PSCore) {
    this.stack.push(this.classes.newObject("mark", "["));
  },
  cleartomark(this: PSCore) {
    this.fill$error();
    let removed: PSValue;
    do {
      removed = this.stack.pop();
    } while (!this.classes.isPSObject(removed, "mark") && this.stack.length > 0);
  },
  clear(this: PSCore) {
    this.stack = [];
  },
  counttomark(this: PSCore) {
    this.fill$error();
    let found = false;
    let index: number;
    for (index = this.stack.length - 1; index >= 0; index--) {
      if (this.classes.isPSObject(this.stack[index], "mark")) {
        found = true;
        break;
      }
    }
    if (found) this.stack.push(this.stack.length - index - 1);
    else this.initiateError("unmatchedmark", "counttomark");
  },
  count(this: PSCore) {
    this.stack.push(this.stack.length);
  },
  countdictstack(this: PSCore) {
    this.stack.push(this.currentDictStack.length);
  },
  countexecstack(this: PSCore) {
    this.stack.push(this.execstack.length);
  },
  dictstack(this: PSCore) {
    this.fill$error();
    const array = top(this);
    if (this.stackunderflowCheck(1, "dictstack")) return;
    if (this.classes.isPSObject(array, "array")) {
      this.stack.pop();
      array.value = this.currentDictStack as unknown as PSValue[];
      const wasGlobal = this.isGlobal;
      this.isGlobal = true;
      array.value[0] = this.classes.newObject("dict", this.systemdict);
      this.stack.push(this.classes.newObject("array", array.value));
      this.isGlobal = wasGlobal;
    } else this.initiateError("typecheck", "dictstack");
  },
  cleardictstack(this: PSCore) {
    this.currentDictStack = this.currentDictStack.slice(0, 3);
  },
  print(this: PSCore) {
    this.fill$error();
    const value = top(this);
    if (this.stackunderflowCheck(1, "print")) return;
    if (this.classes.isPSObject(value, "string")) this.stack.pop();
    else this.initiateError("typecheck", "print");
  },
  version(this: PSCore) {
    this.stack.push(this.classes.newObject("string", this.version));
  },
  readonly(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "readonly")) return;
    const value = top(this);
    if (
      this.classes.isPSObject(value, "array") ||
      this.classes.isPSObject(value, "packedarray") ||
      this.classes.isPSObject(value, "string") ||
      this.classes.isPSObject(value, "dict") ||
      this.classes.isPSObject(value, "file")
    ) {
      if (this.classes.isPSObject(value, "dict")) {
        value.access =
          value.access < this.classes.Access.ReadOnly ? value.access : this.classes.Access.ReadOnly;
      } else {
        this.stack.pop();
        const copy = this._makeObjCopy(value);
        copy.access =
          value.access < this.classes.Access.ReadOnly ? value.access : this.classes.Access.ReadOnly;
        this.stack.push(copy);
      }
    } else this.initiateError("typecheck", "readonly");
  },
  type(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "type")) return;
    const value = this.stack.pop();
    if (this.classes.isPSObject(value)) {
      this.stack.push(this.classes.newObject("name", value._type));
    } else {
      const typeName = typeof value == "function" ? "operatortype" : "unknowntype";
      this.stack.push(this.classes.newObject("name", typeName));
    }
  },
};
