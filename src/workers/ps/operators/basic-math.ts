// Old: public/pscore.js, systemdict entries null … log.
//
// Kept quirks (QUESTIONS.md "PS worker: math operator quirks"):
// - div rounds its result to 9 decimals (5 above 1e5) through a string
//   round trip.
// - idiv computes parseInt(1 / (top / second)), i.e. second / top through
//   two divisions.
// - cos's typecheck path and atan both throw: cos names an undeclared
//   `myname`, atan calls a radianToDegree that PSCore doesn't have.
// - cvr and cvi test `"number" !== (value, false)`, which is always true,
//   so their typecheck branch never runs; cvr leaves numbers alone and
//   executes anything else.
// - cvs never writes into the target string (string indices are read-only)
//   and pushes a new string instead.
// - There is no truncate, ln or xor operator.
import type { PSCore } from "../core.ts";
import type { PSPlainRecord, PSValue } from "../objects.ts";
import { executeValue, sloppySet, undeclaredMyname } from "./basic-support.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

function popNumber(core: PSCore): number {
  return core.stack.pop() as number;
}

export const mathOperators: PSPlainRecord = {
  null(this: PSCore) {
    this.stack.push(null);
  },
  true(this: PSCore) {
    this.stack.push(this.classes.newObject("bool", true));
  },
  false(this: PSCore) {
    this.stack.push(this.classes.newObject("bool", false));
  },
  languagelevel: 3,
  abs(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    if (typeof top(this) == "number") this.stack.push(Math.abs(popNumber(this)));
    else this.initiateError("typecheck");
  },
  neg(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    if (typeof top(this) == "number") this.stack.push(-popNumber(this));
    else this.initiateError("typecheck");
  },
  add(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    if (typeof top(this) == "number" && typeof top(this, 2) == "number")
      this.stack.push(popNumber(this) + popNumber(this));
    else this.initiateError("typecheck");
  },
  sub(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    if (typeof top(this) == "number" && typeof top(this, 2) == "number")
      this.stack.push(-(popNumber(this) - popNumber(this)));
    else this.initiateError("typecheck");
  },
  mul(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    if (typeof top(this) == "number" && typeof top(this, 2) == "number")
      this.stack.push(popNumber(this) * popNumber(this));
    else this.initiateError("typecheck");
  },
  div(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const divisor = top(this);
    const dividend = top(this, 2);
    if (typeof divisor == "number" && typeof dividend == "number") {
      if (Math.abs(divisor) <= 1e-9) {
        this.initiateError("undefinedresult");
      } else {
        let quotient = dividend / divisor;
        const decimals = Math.abs(quotient) < 1e5 ? 9 : 5;
        quotient = +(
          Math.round((quotient + "e+" + decimals) as unknown as number) +
          "e-" +
          decimals
        );
        this.stack.pop();
        this.stack.pop();
        this.stack.push(quotient);
      }
    } else this.initiateError("typecheck");
  },
  idiv(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    if (typeof top(this) == "number" && typeof top(this, 2) == "number") {
      if (top(this) != 0)
        this.stack.push(parseInt((1 / (popNumber(this) / popNumber(this))) as unknown as string));
      else this.initiateError("undefinedresult");
    } else this.initiateError("typecheck");
  },
  mod(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const divisor = top(this);
    const dividend = top(this, 2);
    if (typeof divisor == "number" && typeof dividend == "number") {
      if (divisor != 0) {
        const remainder = dividend % divisor;
        this.stack.pop();
        this.stack.pop();
        this.stack.push(remainder);
      } else this.initiateError("undefinedresult");
    } else this.initiateError("typecheck");
  },
  sin(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const angle = top(this);
    if (typeof angle == "number") {
      this.stack.pop();
      this.stack.push(Math.sin(this.CTM.degreeToRadian(angle)));
    } else this.initiateError("typecheck");
  },
  cos(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const angle = top(this);
    if (typeof angle == "number") {
      this.stack.pop();
      this.stack.push(Math.cos(this.CTM.degreeToRadian(angle)));
    } else this.initiateError("typecheck", undeclaredMyname());
  },
  atan(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const numerator = top(this, 2) as number;
    const denominator = top(this) as number;
    let angle = Math.atan2(numerator, denominator);
    if (angle < 0) angle += 2 * Math.PI;
    // In degrees, 0 to 360; the old code called a radianToDegree that
    // PSCore doesn't have and threw ("atan throws in the PostScript
    // worker" in BUGS-FIXED.md).
    angle = (angle * 180) / Math.PI;
    this.stack.pop();
    this.stack.pop();
    this.stack.push(angle);
  },
  exp(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const base = top(this, 2);
    const exponent = top(this);
    if (typeof base == "number" && typeof exponent == "number") {
      this.stack.pop();
      this.stack.pop();
      this.stack.push(Math.pow(base, exponent));
    } else this.initiateError("typecheck");
  },
  sqrt(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const value = top(this);
    if (typeof value == "number") {
      this.stack.pop();
      this.stack.push(Math.sqrt(value));
    } else this.initiateError("typecheck");
  },
  cvr(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    if (typeof top(this) != "number") {
      const value = this.stack.pop();
      sloppySet(value, "executable", true);
      executeValue(value, this);
    }
  },
  cvi(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    let value = this.stack.pop();
    if (this.classes.isPSObject(value, "string")) {
      value.executable = true;
      value.execute(this);
      value = this.stack.pop();
    }
    if (typeof value != "number") this.initiateError("typecheck");
    else this.stack.push(parseInt(value as unknown as string));
  },
  ceiling(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const value = top(this);
    if (typeof value == "number") {
      this.stack.pop();
      this.stack.push(Math.ceil(value));
    } else this.initiateError("typecheck");
  },
  floor(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const value = top(this);
    if (typeof value == "number") {
      this.stack.pop();
      this.stack.push(Math.floor(value));
    } else this.initiateError("typecheck");
  },
  round(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const value = top(this);
    if (typeof value == "number") {
      this.stack.pop();
      this.stack.push(Math.round(value));
    } else this.initiateError("typecheck");
  },
  cvs(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const value = top(this, 2);
    const target = top(this);
    if (this.classes.isPSObject(target, "string")) {
      this.stack.pop();
      this.stack.pop();
      let text: string;
      if (typeof value == "number") text = value + "";
      else if (
        this.classes.isPSObject(value, "bool") ||
        this.classes.isPSObject(value, "string") ||
        this.classes.isPSObject(value, "name")
      )
        text = value.value + "";
      else text = "--nostringval--";
      // The old code copied the text into target.value character by
      // character, which sloppy mode ignored (strings are immutable).
      this.stack.push(this.classes.newObject("string", text));
    } else this.initiateError("typecheck");
  },
  cvrs(this: PSCore) {
    if (this.stackunderflowCheck(3)) return;
    let value = top(this, 3);
    const radix = top(this, 2);
    const target = top(this);
    if (
      typeof value == "number" &&
      this.classes.isUnsignedInt(radix) &&
      this.classes.isPSObject(target, "string")
    ) {
      if (radix > 36) {
        this.initiateError("rangecheck");
      } else {
        if (radix != 10) value = parseInt(value as unknown as string);
        target.value = value.toString(radix);
        this.stack.pop();
        this.stack.pop();
        this.stack.pop();
        this.stack.push(this.classes.newObject("string", target.value));
      }
    } else this.initiateError("typecheck");
  },
  log(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1)) return;
    const value = top(this);
    if (typeof value == "number") {
      if (value <= 0) this.initiateError("rangecheck", "log");
      else {
        this.stack.pop();
        this.stack.push(Math.log10(value));
      }
    } else this.initiateError("typecheck", "log");
  },
};
