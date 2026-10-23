// Old: public/pscore.js, systemdict entries anchorsearch … aload.
//
// getinterval links the new object to its source through the interval
// fields of objects.ts, so later writes to either side show up in the
// other (strings excepted: their characters can't be assigned).
import type { PSCore } from "../core.ts";
import type { PSArray, PSPlainRecord, PSString, PSValue } from "../objects.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** The interval fields getinterval sets (see PSComposite in objects.ts). */
interface IntervalLinks {
  intervalParent?: unknown;
  intervalChildren?: unknown[];
  intervalIndex?: number;
  intervalCount?: number;
  intervalTimeStamp?: number;
}

export const stringOperators: PSPlainRecord = {
  anchorsearch(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "anchorsearch")) return;
    const text = top(this, 2);
    const seek = top(this);
    if (this.classes.isPSObject(text, "string") && this.classes.isPSObject(seek, "string")) {
      this.stack.pop();
      this.stack.pop();
      if (text.value && text.value.substr(0, seek.value.length) == seek.value) {
        this.stack.push(this.classes.newObject("string", text.value.substr(seek.value.length)));
        this.stack.push(this.classes.newObject("string", seek.value));
        this.stack.push(this.classes.newObject("bool", true));
      } else {
        this.stack.push(text);
        this.stack.push(this.classes.newObject("bool", false));
      }
    } else this.initiateError("typecheck", "anchorsearch");
  },
  search(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "search")) return;
    const text = top(this, 2);
    const seek = top(this);
    if (this.classes.isPSObject(text, "string") && this.classes.isPSObject(seek, "string")) {
      this.stack.pop();
      this.stack.pop();
      const position = text.value.indexOf(seek.value);
      if (position === -1) {
        this.stack.push(text);
        this.stack.push(this.classes.newObject("bool", false));
      } else {
        this.stack.push(
          this.classes.newObject("string", text.value.slice(position + seek.value.length)),
        );
        this.stack.push(this.classes.newObject("string", seek.value));
        this.stack.push(this.classes.newObject("string", text.value.slice(0, position)));
        this.stack.push(this.classes.newObject("bool", true));
      }
    } else this.initiateError("typecheck", "search");
  },
  getinterval(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(3, "getinterval")) return;
    const source = top(this, 3);
    const index = top(this, 2);
    const count = top(this);
    if (!(
      this.classes.isUnsignedInt(index) &&
      this.classes.isUnsignedInt(count) &&
      (this.classes.isPSObject(source, "string") ||
        this.classes.isPSObject(source, "array") ||
        this.classes.isPSObject(source, "packedarray"))
    )) {
      this.initiateError("typecheck", "getinterval");
      return;
    }
    if (index + count > source.value.length) {
      this.initiateError("rangecheck", "getinterval");
      return;
    }
    this.stack.pop();
    this.stack.pop();
    this.stack.pop();
    if (this.classes.isPSObject(source, "array") || this.classes.isPSObject(source, "packedarray"))
      this.stack.push(
        this.classes.newObject(source.className, source.value.slice(index, index + count)),
      );
    else if (this.classes.isPSObject(source, "string"))
      this.stack.push(this.classes.newObject("string", source.value.substr(index, count)));
    const part = this.stack[this.stack.length - 1] as unknown as IntervalLinks;
    const parent = source as unknown as IntervalLinks;
    part.intervalParent = source;
    part.intervalIndex = index;
    part.intervalCount = count;
    part.intervalTimeStamp = performance.now();
    parent.intervalTimeStamp = performance.now();
    if (!("intervalChildren" in parent)) parent.intervalChildren = [];
    (parent.intervalChildren as unknown[]).push(this.stack[this.stack.length - 1]);
  },
  putinterval(this: PSCore) {
    this.fill$error();
    const name = "putinterval";
    if (this.stackunderflowCheck(3, name)) return;
    const target = top(this, 3);
    const index = top(this, 2);
    const source = top(this);
    if (!(
      this.classes.isUnsignedInt(index) &&
      (this.classes.isPSObject(target, "array") || this.classes.isPSObject(target, "string"))
    )) {
      this.initiateError("typecheck", name);
      return;
    }
    if (
      this.classes.isPSObject(target, "array") &&
      !this.classes.isPSObject(source, "array") &&
      !this.classes.isPSObject(source, "packedarray")
    ) {
      this.initiateError("typecheck", name);
      return;
    }
    if (this.classes.isPSObject(target, "string") && !this.classes.isPSObject(source, "string")) {
      this.initiateError("typecheck", name);
      return;
    }
    // The getters run as often as before: interval links sync on every read.
    const sourceObject = source as PSArray | PSString;
    if (index + sourceObject.value.length > target.value.length) {
      this.initiateError("rangecheck", name);
      return;
    }
    if (this.classes.isPSObject(target, "string"))
      target.value =
        target.value.slice(0, index) +
        (sourceObject.value as string) +
        target.value.slice(index + sourceObject.value.length);
    if (this.classes.isPSObject(target, "array")) {
      const items = source as PSArray;
      for (let i = index; i - index < items.value.length; i++)
        target.value[i] = items.value[i - index];
    }
    this.stack.pop();
    this.stack.pop();
    this.stack.pop();
  },
  astore(this: PSCore) {
    this.fill$error();
    const array = top(this);
    if (this.classes.isPSObject(array, "array")) {
      this.stack.pop();
      if (!this.stackunderflowCheck(array.value.length, "astore")) {
        array.value = this.stack.slice(this.stack.length - array.value.length);
        this.stack = this.stack.slice(0, this.stack.length - array.value.length);
        this.stack.push(array);
      }
    } else this.initiateError("typecheck", "astore");
  },
  aload(this: PSCore) {
    this.fill$error();
    const array = top(this);
    if (this.stackunderflowCheck(1, "aload")) return;
    if (this.classes.isPSObject(array, "array") || this.classes.isPSObject(array, "packedarray")) {
      this.stack.pop();
      this.stack = this.stack.concat(array.value);
      this.stack.push(array);
    } else this.initiateError("typecheck", "aload");
  },
};
