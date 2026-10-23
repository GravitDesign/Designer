// Old: public/pscore.js, systemdict entries eq … exit.
//
// Kept quirks (QUESTIONS.md):
// - eq and ne compare with JS loose equality; ne of two composite objects
//   (or an object and a number) is always false.
// - not on integers is a bitwise not (correct), but `and`/`or` check the
//   operands as integers before popping them, and bitshift uses JS 32-bit
//   shifts.
// - ifelse and if skip silently when the condition isn't a bool but still
//   pop their operands; they execute the procedure without checking it.
// - loop ends on stop (clearing the stop flag) and exit; for, forall and
//   repeat end only on exit. exit outside a loop and outside stopped runs
//   quit.
import type { PSCore } from "../core.ts";
import type { PSPlainRecord, PSValue } from "../objects.ts";
import { executeValue } from "./basic-support.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** Runs a procedure the way the loops do: on the execution stack, with $error filled. */
function runProcedure(core: PSCore, procedure: PSValue): void {
  core.execstack.push(procedure);
  core.fill$error();
  executeValue(procedure, core);
  core.execstack.pop();
}

type Comparison = (first: PSValue, second: PSValue) => boolean;

/**
 * gt, lt, ge and le: numbers compare as numbers, two strings by their text.
 * `compare(top, second)` receives the operands in pop order.
 */
function relational(core: PSCore, name: string, compare: Comparison): void {
  core.fill$error();
  if (core.stackunderflowCheck(2, name)) return;
  if (typeof top(core) != "number" || typeof top(core, 2) != "number") {
    if (
      core.classes.isPSObject(top(core), "string") &&
      core.classes.isPSObject(top(core, 2), "string")
    ) {
      const first = (core.stack.pop() as { value: PSValue }).value;
      const second = (core.stack.pop() as { value: PSValue }).value;
      core.stack.push(core.classes.newObject("bool", compare(first, second)));
    } else core.initiateError("typecheck", name);
  } else {
    const first = core.stack.pop();
    const second = core.stack.pop();
    core.stack.push(core.classes.newObject("bool", compare(first, second)));
  }
}

function isText(core: PSCore, value: PSValue): boolean {
  return core.classes.isPSObject(value, "string") || core.classes.isPSObject(value, "name");
}

function valueOf(value: PSValue): unknown {
  return (value as { value?: unknown }).value;
}

export const compareOperators: PSPlainRecord = {
  eq(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "eq")) return;
    const first = this.stack.pop();
    const second = this.stack.pop();
    let equal = false;
    if (first == second) equal = true;
    else if (
      (isText(this, first) && isText(this, second)) ||
      (this.classes.isPSObject(first, "bool") && this.classes.isPSObject(second, "bool"))
    )
      equal = valueOf(first) == valueOf(second);
    this.stack.push(this.classes.newObject("bool", equal));
  },
  ne(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "ne")) return;
    const first = this.stack.pop();
    const second = this.stack.pop();
    let different = false;
    if (this.classes.isPSObject(first) && this.classes.isPSObject(second)) {
      if (
        (isText(this, first) && isText(this, second)) ||
        (this.classes.isPSObject(first, "bool") && this.classes.isPSObject(second, "bool"))
      )
        different = valueOf(first) != valueOf(second);
    } else if (!this.classes.isPSObject(first) && !this.classes.isPSObject(second)) {
      different = first != second;
    }
    this.stack.push(this.classes.newObject("bool", different));
  },
  // The comparisons get (top, second) and test `second <op> top`, as `top <reversed op> second`.
  gt(this: PSCore) {
    relational(this, "gt", (first, second) => (first as number) < (second as number));
  },
  lt(this: PSCore) {
    relational(this, "lt", (first, second) => (first as number) > (second as number));
  },
  ge(this: PSCore) {
    relational(this, "ge", (first, second) => (first as number) <= (second as number));
  },
  le(this: PSCore) {
    relational(this, "le", (first, second) => (first as number) >= (second as number));
  },
  not(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "not")) return;
    const value = top(this);
    if (this.classes.isInt(value)) {
      this.stack.pop();
      this.stack.push(~value);
    } else if (this.classes.isPSObject(value, "bool")) {
      this.stack.pop();
      this.stack.push(this.classes.newObject("bool", !value.value));
    } else this.initiateError("typecheck", "not");
  },
  bitshift(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "bitshift")) return;
    const shift = top(this);
    const value = top(this, 2);
    if (this.classes.isInt(value) && this.classes.isInt(shift)) {
      this.stack.pop();
      this.stack.pop();
      this.stack.push(shift >= 0 ? value << shift : value >> -shift);
    } else this.initiateError("typecheck", "bitshift");
  },
  and(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "and")) return;
    const first = top(this);
    const second = top(this, 2);
    if (this.classes.isInt(first) && this.classes.isInt(second))
      this.stack.push((this.stack.pop() as number) & (this.stack.pop() as number));
    else if (this.classes.isPSObject(first, "bool") && this.classes.isPSObject(second, "bool")) {
      this.stack.pop();
      this.stack.pop();
      this.stack.push(this.classes.newObject("bool", first.value && second.value));
    } else this.initiateError("typecheck", "and");
  },
  or(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "or")) return;
    const first = top(this);
    const second = top(this, 2);
    if (this.classes.isInt(first) && this.classes.isInt(second))
      this.stack.push((this.stack.pop() as number) | (this.stack.pop() as number));
    else if (this.classes.isPSObject(first, "bool") && this.classes.isPSObject(second, "bool")) {
      this.stack.pop();
      this.stack.pop();
      this.stack.push(this.classes.newObject("bool", first.value || second.value));
    } else this.initiateError("typecheck", "or");
  },
  ifelse(this: PSCore) {
    const otherwise = this.stack.pop();
    const then = this.stack.pop();
    const condition = this.stack.pop();
    if (this.classes.isPSObject(condition, "bool")) {
      if (condition.value) {
        this.execstack.push(then);
        this.fill$error();
        executeValue(then, this);
      } else {
        this.execstack.push(otherwise);
        this.fill$error();
        executeValue(otherwise, this);
      }
      this.execstack.pop();
    }
  },
  if(this: PSCore) {
    const procedure = this.stack.pop();
    const condition = this.stack.pop();
    if (this.classes.isPSObject(condition, "bool") && condition.value)
      runProcedure(this, procedure);
  },
  for(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(4)) return;
    const initial = top(this, 4);
    const increment = top(this, 3);
    const limit = top(this, 2);
    const procedure = top(this);
    if (typeof initial == "number" && typeof increment == "number" && typeof limit == "number") {
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
      this.loopingContext++;
      if (increment > 0) {
        for (let counter = initial; counter <= limit; counter += increment) {
          this.stack.push(counter);
          runProcedure(this, procedure);
          if (this.exitFlag) break;
        }
      } else {
        for (let counter = initial; counter >= limit; counter += increment) {
          this.stack.push(counter);
          runProcedure(this, procedure);
          if (this.exitFlag) break;
        }
      }
      this.loopingContext--;
      this.exitFlag = false;
    } else this.initiateError("typecheck");
  },
  forall(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const collection = top(this, 2);
    const procedure = top(this);
    if (
      this.classes.isPSObject(collection, "dict") ||
      this.classes.isPSObject(collection, "array") ||
      this.classes.isPSObject(collection, "packedarray") ||
      this.classes.isPSObject(collection, "string")
    ) {
      this.stack.pop();
      this.stack.pop();
      this.loopingContext++;
      if (Array.isArray(collection.value) || this.classes.isPSObject(collection, "string")) {
        for (let i = 0; i < (collection.value as PSValue[] | string).length; i++) {
          const items = collection.value as PSValue[] | string;
          if (Array.isArray(items)) this.stack.push(items[i]);
          else this.stack.push((items as string).charCodeAt(i));
          runProcedure(this, procedure);
          if (this.exitFlag) break;
        }
      } else {
        const entries = collection.value as PSPlainRecord;
        for (const key in entries) {
          this.stack.push(this.classes.newObject("name", key));
          this.stack.push(entries[key]);
          runProcedure(this, procedure);
          if (this.exitFlag) break;
        }
      }
      this.loopingContext--;
      this.exitFlag = false;
    } else this.initiateError("typecheck");
  },
  repeat(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const count = top(this, 2);
    const procedure = top(this);
    if (this.classes.isUnsignedInt(count)) {
      if (this.classes.isPSObject(procedure, "array") && procedure.executable !== false) {
        this.stack.pop();
        this.stack.pop();
        this.loopingContext++;
        for (let i = 0; i < count; i++) {
          runProcedure(this, procedure);
          if (this.exitFlag) break;
        }
        this.loopingContext--;
        this.exitFlag = false;
      } else this.initiateError("typecheck");
    } else this.initiateError("rangecheck");
  },
  loop(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const procedure = top(this);
    if (this.classes.isPSObject(procedure, "array") && procedure.executable !== false) {
      this.stack.pop();
      this.loopingContext++;
      for (;;) {
        runProcedure(this, procedure);
        if (this.stopFlag) {
          this.stopFlag = false;
          break;
        }
        if (this.exitFlag) {
          this.exitFlag = false;
          break;
        }
      }
      this.loopingContext--;
    } else this.initiateError("typecheck");
  },
  exit(this: PSCore) {
    this.exitFlag = true;
    if (this.loopingContext > 0) return;
    if (this.stoppedContext > 0) {
      this.initiateError("invalidexit", "exit");
      return;
    }
    this.tokenExecute(this.classes.newObject("operator", "quit"));
  },
};
