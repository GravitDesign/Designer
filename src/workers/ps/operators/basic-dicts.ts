// Old: public/pscore.js, systemdict entries systemdict … product.
//
// Kept quirks (QUESTIONS.md "PS worker: dictionary operator quirks"):
// - systemdict, statusdict and where wrap plain JS objects (and where even
//   PSDict objects) in new global dict objects on every call.
// - internaldict's error path names an undeclared `myname` and throws.
// - where also finds names that are properties of the dict object itself
//   (value, access, ...), and store/def write into `.value` of whatever is
//   on top of the dictionary stack.
// - put's string range check compares with the string object's `length`,
//   which doesn't exist, so only negative indices are refused.
// - maxlength is the number of entries plus 100; dict ignores its size.
// - packedarray takes its count unchecked: a non-number count packs the
//   whole stack.
import type { PSCore } from "../core.ts";
import type { PSDict, PSPlainRecord, PSValue } from "../objects.ts";
import { undeclaredMyname, valueOf } from "./basic-support.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** The value record of a dictionary-stack entry, as the old code read it. */
function entryValue(entry: PSPlainRecord | PSDict): PSPlainRecord {
  return (entry as PSDict).value;
}

export const dictOperators: PSPlainRecord = {
  systemdict(this: PSCore) {
    const wasGlobal = this.isGlobal;
    this.isGlobal = true;
    this.stack.push(this.classes.newObject("dict", this.systemdict));
    this.isGlobal = wasGlobal;
  },
  userdict(this: PSCore) {
    this.stack.push(this.userdict);
  },
  errordict(this: PSCore) {
    this.stack.push(this.errordict);
  },
  $error(this: PSCore) {
    this.stack.push(this.$error);
  },
  statusdict(this: PSCore) {
    this.stack.push(this.classes.newObject("dict", this.statusdict));
  },
  currentdict(this: PSCore) {
    this.stack.push(this.currentDictStack[this.currentDictStack.length - 1]);
  },
  internaldict(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    if (top(this) === 1183615869) {
      this.stack.pop();
      this.stack.push(this.classes.newObject("dict", {}));
    } else this.initiateError("invalidaccess", undeclaredMyname());
  },
  dict(this: PSCore) {
    if (this.stack.length < 1) {
      this.initiateError("stackunderflow", "dict");
      return;
    }
    if (this.classes.isInt(top(this))) {
      this.stack.pop();
      this.stack.push(this.classes.newObject("dict", {}));
    } else this.initiateError("typecheck", "dict");
  },
  known(this: PSCore) {
    if (this.stack.length < 2) {
      this.initiateError("stackunderflow", "known");
      return;
    }
    const keyValue = top(this);
    const dictValue = top(this, 2);
    if (
      (this.classes.isPSObject(keyValue, "name") ||
        typeof keyValue == "number" ||
        this.classes.isPSObject(keyValue, "string")) &&
      this.classes.isPSObject(dictValue, "dict")
    ) {
      let key = this.stack.pop();
      const dict = this.stack.pop() as PSDict;
      if (typeof key == "object" && key !== null && "className" in key)
        key = valueOf(key) as PSValue;
      this.stack.push(this.classes.newObject("bool", (key as string) in dict.value));
    } else this.initiateError("typecheck", "known");
  },
  where(this: PSCore) {
    if (this.stack.length < 1) {
      this.initiateError("stackunderflow", "where");
      return;
    }
    const nameValue = top(this);
    if (!this.classes.isPSObject(nameValue, "name")) {
      this.initiateError("typecheck", "where");
      return;
    }
    const name = this.stack.pop() as typeof nameValue;
    for (let i = this.currentDictStack.length - 1; i >= 0; i--) {
      const entry = this.currentDictStack[i] as PSPlainRecord | PSDict;
      if (this.classes.isPSObject(entry) && name.value in entry.value) {
        this.stack.push(entry);
        this.stack.push(this.classes.newObject("bool", true));
        return;
      }
      if (name.value in entry) {
        const wasGlobal = this.isGlobal;
        this.isGlobal = true;
        this.stack.push(this.classes.newObject("dict", entry as PSPlainRecord));
        this.isGlobal = wasGlobal;
        this.stack.push(this.classes.newObject("bool", true));
        return;
      }
    }
    this.stack.push(this.classes.newObject("bool", false));
  },
  store(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "store")) return;
    let key = top(this, 2);
    const value = top(this);
    if (this.classes.isPSObject(key)) key = key.value as PSValue;
    const property = key as string;
    this.stack.pop();
    this.stack.pop();
    let index: number;
    for (index = this.currentDictStack.length - 1; index >= 0; index--) {
      const entry = this.currentDictStack[index] as PSPlainRecord | PSDict;
      if (this.classes.isPSObject(entry) && property in entry.value) {
        entry.value[property] = value;
        return;
      }
    }
    if (index < 1) index = this.currentDictStack.length - 1;
    const target = this.currentDictStack[index] as PSDict;
    if (
      this.classes.isPSObject(value) &&
      !(value as { global?: boolean }).global &&
      (index <= 1 || target.global)
    )
      this.initiateError("invalidaccess", "store");
    else entryValue(target)[property] = value;
  },
  begin(this: PSCore) {
    if (this.stack.length < 1) {
      this.initiateError("stackunderflow");
      return;
    }
    if (this.classes.isPSObject(top(this), "dict"))
      this.currentDictStack.push(this.stack.pop() as PSDict);
    else this.initiateError("typecheck");
  },
  end(this: PSCore) {
    this.fill$error();
    if (this.currentDictStack.length < 4) this.initiateError("dictstackunderflow", "end");
    else this.currentDictStack.pop();
  },
  put(this: PSCore) {
    this.fill$error();
    if (this.stack.length < 3) {
      this.initiateError("stackunderflow", "put");
      return;
    }
    const newValue = top(this);
    const key = top(this, 2);
    const container = top(this, 3);
    if (
      this.classes.isPSObject(container, "dict") &&
      !this.classes.isPSObject(key, "name") &&
      typeof key != "number"
    ) {
      this.initiateError("typecheck", "put");
      return;
    }
    if (
      this.classes.isPSObject(container, "array") ||
      this.classes.isPSObject(container, "string")
    ) {
      if (!this.classes.isInt(key)) {
        this.initiateError("typecheck", "put");
        return;
      }
      if (
        this.classes.isPSObject(container, "array") &&
        (key > container.value.length || key < 0)
      ) {
        this.initiateError("rangecheck", "put");
        return;
      }
      // Sic: PS string objects have no `length`, so this only refuses negative indices.
      if (
        this.classes.isPSObject(container, "string") &&
        (key > (container as unknown as { length: number }).length || key < 0)
      ) {
        this.initiateError("rangecheck", "put");
        return;
      }
      if (
        this.classes.isPSObject(container, "string") &&
        (typeof newValue != "number" || newValue % 1 != 0)
      ) {
        this.initiateError("typecheck", "put");
        return;
      }
    }
    const value = this.stack.pop();
    const index = this.stack.pop();
    const target = this.stack.pop();
    if (this.classes.isPSObject(target, "array") || this.classes.isPSObject(target, "dict")) {
      const record = target.value as unknown as Record<string, PSValue>;
      if (this.classes.isPSObject(index)) record[index.value as string] = value;
      else record[index as string] = value;
    } else if (this.classes.isPSObject(target, "string")) {
      const position = index as number;
      target.value =
        target.value.substr(0, position) +
        String.fromCharCode(value as number) +
        target.value.substr(position + 1);
    }
  },
  get(this: PSCore) {
    this.fill$error();
    if (this.stack.length < 2) {
      this.initiateError("stackunderflow", "get");
      return;
    }
    const key = top(this);
    const container = top(this, 2);
    if (!(
      this.classes.isPSObject(container, "dict") ||
      this.classes.isPSObject(container, "array") ||
      this.classes.isPSObject(container, "packedarray") ||
      this.classes.isPSObject(container, "string")
    )) {
      this.initiateError("typecheck", "get");
      return;
    }
    if (
      this.classes.isPSObject(container, "dict") &&
      !this.classes.isPSObject(key, "name") &&
      !this.classes.isPSObject(key, "string") &&
      typeof key != "number"
    ) {
      this.initiateError("typecheck", "get");
      return;
    }
    if (
      this.classes.isPSObject(container, "array") ||
      this.classes.isPSObject(container, "string") ||
      this.classes.isPSObject(container, "packedarray")
    ) {
      if (!this.classes.isInt(key)) {
        this.initiateError("typecheck", "get");
        return;
      }
      if (!this.classes.isUnsignedInt(key) || key >= container.value.length) {
        this.initiateError("rangecheck", "get");
        return;
      }
    }
    let index = this.stack.pop();
    const source = this.stack.pop();
    if (
      this.classes.isPSObject(source, "array") ||
      this.classes.isPSObject(source, "dict") ||
      this.classes.isPSObject(source, "packedarray")
    ) {
      if (this.classes.isPSObject(index)) index = index.value as PSValue;
      this.stack.push((source.value as unknown as Record<string, PSValue>)[index as string]);
    } else if (this.classes.isPSObject(source, "string")) {
      this.stack.push((source.value[index as number] as string).charCodeAt(0));
    }
  },
  load(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "load")) return;
    const name = this.stack.pop();
    const found = this.lookup(name);
    if (found !== undefined) this.stack.push(found);
    else this.initiateError("undefined", "load");
  },
  length(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "length")) return;
    const value = top(this);
    if (
      this.classes.isPSObject(value, "array") ||
      this.classes.isPSObject(value, "packedarray") ||
      this.classes.isPSObject(value, "string") ||
      this.classes.isPSObject(value, "name")
    ) {
      this.stack.pop();
      this.stack.push(value.value.length);
    } else if (this.classes.isPSObject(value, "dict")) {
      this.stack.pop();
      this.stack.push(Object.keys(value.value).length);
    } else this.initiateError("typecheck", "length");
  },
  maxlength(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "maxlength")) return;
    const value = top(this);
    if (this.classes.isPSObject(value, "dict")) {
      this.stack.pop();
      this.stack.push(Object.keys(value.value).length + 100);
    } else this.initiateError("typecheck", "maxlength");
  },
  array(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "array")) return;
    const size = top(this);
    if (this.classes.isUnsignedInt(size)) {
      this.stack.pop();
      const items: PSValue[] = [];
      for (let i = 0; i < size; i++) items[i] = null;
      this.stack.push(this.classes.newObject("array", items));
    } else this.initiateError("typecheck", "array");
  },
  packedarray(this: PSCore) {
    this.fill$error();
    const count = top(this) as number;
    if (this.stackunderflowCheck(count, "packedarray")) return;
    this.stack.pop();
    const packed = this.classes.newObject(
      "packedarray",
      this.stack.slice(this.stack.length - count),
    );
    this.stack = this.stack.slice(0, this.stack.length - count);
    this.stack.push(packed);
  },
  string(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "string")) return;
    const size = top(this);
    if (this.classes.isUnsignedInt(size)) {
      this.stack.pop();
      let text = "";
      for (let i = 0; i < size; i++) text += String.fromCharCode(0);
      this.stack.push(this.classes.newObject("string", text));
    } else this.initiateError("typecheck", "string");
  },
  product(this: PSCore) {
    this.stack.push(this.classes.newObject("string", this.productString));
  },
};
