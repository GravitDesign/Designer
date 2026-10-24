// Old: public/pscore.js, systemdict shfill, fill, eofill.
import type { PSCore } from "../core.ts";
import type { PSValue } from "../objects.ts";
import { colorHelper } from "./graphics-support.ts";

export const paintOperators = {
  shfill(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const shading = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(shading, "dict")) {
      shading.value.gstate = this.classes.newObject("graphicsState", this.gstate);
      this.toGravit("shfill", [
        colorHelper(this)._getGColor([{ value: "Pattern" }], shading),
        this.gstate.clippingPath,
      ]);
      this.stack.pop();
    } else this.initiateError("typecheck");
  },

  fill(this: PSCore) {
    this.toGravit("fill", [
      this.gstate.path,
      colorHelper(this)._getGColor(this.gstate.colorSpace, this.gstate.color),
      this.gstate.clippingPath,
      false,
    ]);
    this.gstate.path = [];
  },

  eofill(this: PSCore) {
    const color = colorHelper(this)._getGColor(this.gstate.colorSpace, this.gstate.color);
    this.toGravit("fill", [this.gstate.path, color, this.gstate.clippingPath, true]);
    this.gstate.path = [];
  },
} satisfies Record<string, PSValue>;
