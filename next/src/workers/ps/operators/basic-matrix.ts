// Old: public/pscore.js, systemdict entries matrix … setcachelimit.
//
// Kept quirks (QUESTIONS.md):
// - currentmatrix, defaultmatrix and identmatrix leave the matrix on the
//   stack, as PostScript says, but setmatrix copies into the CTM array in
//   place.
// - setscreen and setcachelimit are stubs; currentscreen pushes a fixed
//   frequency, angle and spot function, marking the function `executive`
//   (a typo for executable, so it stays a literal string).
// - cachestatus pushes fixed numbers.
import type { PSCore } from "../core.ts";
import type { PSPlainRecord, PSValue } from "../objects.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** The spot function text currentscreen returns (a 16×16 dither lookup). */
const SPOT_FUNCTION =
  "1 add 7.9999 mul cvi exch 1 add 7.9999 mul cvi 16 mul add (" +
  "\x0e\x8e.\xae\x06\x86&\xa6\x0c\x8c,\xac\x04\x84$\xa4\xceN\xeen\xc6F\xe6f\xccL\xecl\xc4D\xe4d" +
  ">\xbe\x1e\x9e6\xb6\x16\x96<\xbc\x1c\x9c4\xb4\x14\x94\xfe~\xde^\xf6v\xd6V\xfc|\xdc\x5c\xf4t\xd4T" +
  "\x01\x81!\xa1\x09\x89)\xa9\x03\x83#\xa3\x0b\x8b+\xab\xc1A\xe1a\xc9I\xe9i\xc3C\xe3c\xcbK\xebk" +
  "1\xb1\x11\x919\xb9\x19\x993\xb3\x13\x93;\xbb\x1b\x9b\xf1q\xd1Q\xf9y\xd9Y\xf3s\xd3S\xfb{\xdb[" +
  "\x0d\x8d-\xad\x05\x85%\xa5\x0f\x8f/\xaf\x07\x87'\xa7\xcdM\xedm\xc5E\xe5e\xcfO\xefo\xc7G\xe7g" +
  "=\xbd\x1d\x9d5\xb5\x15\x95?\xbf\x1f\x9f7\xb7\x17\x97\xfd}\xdd]\xf5u\xd5U\xff\x7f\xdf_\xf7w\xd7W" +
  "\x02\x82\x22\xa2\x0a\x8a*\xaa...) exch get 256 div";

/** Copies a six-entry matrix into another, or reports the old errors. */
function copyMatrixInto(core: PSCore, name: string, source: readonly number[]): void {
  const matrix = top(core);
  if (core.classes.isPSObject(matrix, "array")) {
    if (matrix.value.length == 6) for (let i = 0; i < 6; i++) matrix.value[i] = source[i];
    else core.initiateError("rangecheck", name);
  } else core.initiateError("typecheck", name);
}

export const matrixOperators: PSPlainRecord = {
  matrix(this: PSCore) {
    this.stack.push(this.classes.newObject("array", [1, 0, 0, 1, 0, 0]));
  },
  currentmatrix(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "currentmatrix")) return;
    copyMatrixInto(this, "currentmatrix", this.gstate.CTM);
  },
  defaultmatrix(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "defaultmatrix")) return;
    copyMatrixInto(this, "defaultmatrix", this.gstate.defaultCTM);
  },
  identmatrix(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "identmatrix")) return;
    copyMatrixInto(this, "identmatrix", [1, 0, 0, 1, 0, 0]);
  },
  setmatrix(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "setmatrix")) return;
    const matrix = top(this);
    if (this.classes.isPSObject(matrix, "array")) {
      if (matrix.value.length == 6) {
        for (let i = 0; i < 6; i++) this.gstate.CTM[i] = matrix.value[i] as number;
        this.stack.pop();
      } else this.initiateError("rangecheck", "setmatrix");
    } else this.initiateError("typecheck", "setmatrix");
  },
  initmatrix(this: PSCore) {
    this.fill$error();
    for (let i = 0; i < 6; i++) this.gstate.CTM[i] = this.gstate.defaultCTM[i] as number;
  },
  setscreen(this: PSCore) {
    this.stack.pop();
    this.stack.pop();
    this.stack.pop();
  },
  currentscreen(this: PSCore) {
    const spotFunction = this.classes.newObject("string", SPOT_FUNCTION);
    (spotFunction as unknown as { executive: boolean }).executive = true;
    this.stack.push(5.16171026);
    this.stack.push(0);
    this.stack.push(spotFunction);
  },
  cachestatus(this: PSCore) {
    this.fill$error();
    this.stack = this.stack.concat([0, 1e6, 0, 200, 0, 5e3, 1e4]);
  },
  setcachelimit(this: PSCore) {
    this.fill$error();
    this.stack.pop();
  },
};
