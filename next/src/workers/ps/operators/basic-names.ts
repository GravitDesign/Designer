// Old: public/pscore.js, systemdict entries def … filter.
//
// Kept quirks (QUESTIONS.md):
// - stop outside `stopped` runs quit, which reports error "04" to the page
//   (the page then ends the import), and still sets the stop flag.
// - save/restore only version composite objects and the graphics state
//   stack; restore keeps the state saved at the matching save.
// - wcheck reports false for anything that isn't an object with unlimited
//   access, including numbers.
// - eexec pushes the plain systemdict object on the dictionary stack while
//   it runs the decrypted font program, so `def` inside it writes into
//   `.value` of a plain object and throws.
import type { PSCore } from "../core.ts";
import type { PSDict, PSObject, PSPlainRecord, PSProcedure, PSValue } from "../objects.ts";
import { sloppySet } from "./basic-support.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** The Filter resource category (filters.ts) as a record of operators. */
function filters(core: PSCore): PSPlainRecord {
  return (core.resources.Category.value.Filter as PSDict).value;
}

export const nameOperators: PSPlainRecord = {
  def(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "def")) return;
    if (top(this, 2) != null) {
      const value = this.stack.pop();
      let key = this.stack.pop();
      if (this.classes.isPSObject(key)) key = key.value as PSValue;
      const dict = this.currentDictStack[this.currentDictStack.length - 1] as PSDict;
      dict.value[key as string] = value;
    } else this.initiateError("typecheck", "def");
  },
  undef(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "undef")) return;
    const dict = top(this, 2);
    const key = top(this);
    if (this.classes.isPSObject(dict, "dict") && this.classes.isPSObject(key, "name")) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- PostScript dicts are keyed by name
      delete dict.value[key.value];
      this.stack.pop();
      this.stack.pop();
    } else this.initiateError("typecheck", "undef");
  },
  bind(this: PSCore) {
    const procedure = this.stack.pop();
    this._bindNames(procedure as PSObject);
    this.stack.push(procedure);
  },
  stopped(this: PSCore) {
    const procedure = this.stack.pop();
    this.stoppedContext++;
    this.execstack.push(procedure);
    this.fill$error();
    if (this.classes.isPSObject(procedure) && "execute" in procedure)
      (procedure.execute as (core: PSCore) => unknown).call(procedure, this);
    else this.stack.push(procedure);
    this.execstack.pop();
    this.stoppedContext--;
    this.stack.push(this.classes.newObject("bool", this.stopFlag));
    this.stopFlag = false;
  },
  stop(this: PSCore) {
    if (this.stoppedContext == 0) this.tokenExecute(this.classes.newObject("operator", "quit"));
    this.stopFlag = true;
  },
  quit(this: PSCore) {
    this.toGravit("error", ["04"]);
  },
  save(this: PSCore) {
    this.gstack.push(this.classes.newObject("graphicsState", this.gstate));
    const state = {
      saveGeneration: this.saveGeneration,
      graphicsState: this.gstack.length - 1,
    };
    this.saveGeneration++;
    this.stack.push(this.classes.newObject("saveState", state));
  },
  restore(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "restore")) return;
    const saved = top(this);
    if (this.classes.isPSObject(saved, "saveState")) {
      this.saveGeneration = saved.value.saveGeneration;
      this.gstate = this.gstack[saved.value.graphicsState] as typeof this.gstate;
      this.gstack = this.gstack.slice(0, saved.value.graphicsState);
      this.stack.pop();
    } else this.initiateError("typecheck", "restore");
  },
  currentglobal(this: PSCore) {
    this.stack.push(this.classes.newObject("bool", this.isGlobal));
  },
  setglobal(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "setglobal")) return;
    const flag = this.stack.pop();
    if (this.classes.isPSObject(flag, "bool")) this.isGlobal = flag.value;
    else this.initiateError("typecheck", "setglobal");
  },
  rcheck(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "rcheck")) return;
    const value = this.stack.pop();
    let readable = true;
    if (this.classes.isPSObject(value)) readable = value.access >= this.classes.Access.ReadOnly;
    this.stack.push(this.classes.newObject("bool", readable));
  },
  gcheck(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "gcheck")) return;
    const value = this.stack.pop();
    let global = true;
    if (this.classes.isPSObject(value) && "global" in value) global = value.global as boolean;
    this.stack.push(this.classes.newObject("bool", global));
  },
  wcheck(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "gcheck")) return;
    const value = this.stack.pop();
    const writable =
      !this.classes.isPSObject(value, "packedarray") &&
      (value as unknown as { access: number }).access == this.classes.Access.Unlimited;
    this.stack.push(this.classes.newObject("bool", writable));
  },
  noaccess(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "noaccess")) return;
    const value = top(this);
    if (
      this.classes.isPSObject(value, "array") ||
      this.classes.isPSObject(value, "packedarray") ||
      this.classes.isPSObject(value, "string") ||
      this.classes.isPSObject(value, "dict") ||
      this.classes.isPSObject(value, "file")
    ) {
      if (this.classes.isPSObject(value, "dict")) {
        if (value.access == this.classes.Access.ReadOnly)
          this.initiateError("invalidaccess", "noaccess");
        value.access = this.classes.Access.Noaccess;
        return;
      }
      this.stack.pop();
      const copy = this._makeObjCopy(value);
      copy.access = this.classes.Access.Noaccess;
      this.stack.push(copy);
    } else this.initiateError("typecheck", "noaccess");
  },
  currentpacking(this: PSCore) {
    this.stack.push(this.classes.newObject("bool", this.isPackedMode));
  },
  setpacking(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "setpacking")) return;
    const flag = this.stack.pop();
    if (this.classes.isPSObject(flag, "bool")) this.isPackedMode = flag.value;
    else this.initiateError("typecheck", "setpacking");
  },
  cvx(this: PSCore) {
    this.fill$error();
    if (this.stack.length < 1) {
      this.initiateError("stackunderflow", "cvx");
      return;
    }
    const value = top(this);
    if (this.classes.isPSObject(value)) {
      this.stack.pop();
      const copy = this._makeObjCopy(value);
      copy.executable = true;
      this.stack.push(copy);
    }
  },
  cvlit(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "cvlit")) return;
    const value = top(this);
    if (this.classes.isPSObject(value)) {
      this.stack.pop();
      const copy = this._makeObjCopy(value);
      copy.executable = false;
      this.stack.push(copy);
    }
  },
  xcheck(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "xcheck")) return;
    const value = this.stack.pop();
    let executable = false;
    if (this.classes.isPSObject(value) && value.executable === true) executable = true;
    this.stack.push(this.classes.newObject("bool", executable));
  },
  cvn(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "cvn")) return;
    const value = top(this);
    if (this.classes.isPSObject(value, "string")) {
      this.stack.pop();
      if (value.executable) this.stack.push(this.classes.newObject("operator", value.value));
      else this.stack.push(this.classes.newObject("name", value.value));
    } else this.initiateError("typecheck", "cvn");
  },
  eexec(this: PSCore) {
    if (this.stackunderflowCheck(1, "eexec")) return;
    if (this.classes.isPSObject(top(this), "file")) {
      (filters(this).FontType1Decode as PSProcedure).call(this);
      const decrypted = this.stack.pop();
      sloppySet(decrypted, "executable", true);
      this.currentDictStack.push(this.systemdict);
      this.tokenExecute(decrypted);
      (this.systemdict.end as PSProcedure).call(this);
    } else this.stack.pop();
  },
  exec(this: PSCore) {
    this.fill$error();
    if (this.stack.length < 1) {
      this.initiateError("stackunderflow", "exec");
      return;
    }
    this.tokenExecute(this.stack.pop());
  },
  executeonly(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "executeonly")) return;
    const value = top(this);
    if (
      this.classes.isPSObject(value, "array") ||
      this.classes.isPSObject(value, "packedarray") ||
      this.classes.isPSObject(value, "string") ||
      this.classes.isPSObject(value, "file")
    ) {
      this.stack.pop();
      const copy = this._makeObjCopy(value);
      copy.access =
        value.access < this.classes.Access.ExecOnly ? value.access : this.classes.Access.ExecOnly;
      this.stack.push(copy);
    } else this.initiateError("typecheck", "executeonly");
  },
  filter(this: PSCore) {
    this.fill$error();
    if (this.stack.length < 2) {
      this.initiateError("stackunderflow", "filter");
      return;
    }
    const name = this.stack.pop();
    const decoder = filters(this)[(name as unknown as { value: string }).value];
    if (decoder) (decoder as PSProcedure).call(this);
    else this.initiateError("nodecoder", "filter");
  },
};
