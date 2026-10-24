// Old: public/pscore.js, systemdict setlinewidth … sethsbcolor: line
// parameters, cache device stubs, color spaces and colors, and the
// device parameters the importer accepts and ignores.
import type { PSCore } from "../core.ts";
import type { PSArray, PSValue } from "../objects.ts";
import { colorHelper, type Valued } from "./graphics-support.ts";

type NumericGStateField = "lineWidth" | "lineCap" | "lineJoin" | "miterLimit";

function setNumber(core: PSCore, name: string, field: NumericGStateField): void {
  core.fill$error();
  if (core.stackunderflowCheck(1, name)) return;
  const value = core.stack[core.stack.length - 1];
  if (typeof value == "number") {
    core.gstate[field] = value;
    core.stack.pop();
  } else core.initiateError("typecheck", name);
}

/** The name of the current color space family (colorSpace[0].value). */
function colorSpaceName(core: PSCore): unknown {
  return (core.gstate.colorSpace[0] as unknown as Valued).value;
}

/** An entry of the current color (an array of components, or 0 before any setcolor). */
function colorComponent(core: PSCore, index: number): PSValue {
  return (core.gstate.color as PSValue[])[index];
}

export const stateOperators = {
  setlinewidth(this: PSCore) {
    setNumber(this, "setlinewidth", "lineWidth");
  },

  setlinecap(this: PSCore) {
    setNumber(this, "setlinecap", "lineCap");
  },

  setlinejoin(this: PSCore) {
    setNumber(this, "setlinejoin", "lineJoin");
  },

  setmiterlimit(this: PSCore) {
    setNumber(this, "setmiterlimit", "miterLimit");
  },

  setdash(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "setdash")) return;
    const pattern = this.stack[this.stack.length - 2];
    const offset = this.stack[this.stack.length - 1];
    if (typeof offset == "number" && this.classes.isPSObject(pattern, "array")) {
      this.gstate.dashPattern = { arr: pattern.value as number[], param: offset };
      this.stack.pop();
      this.stack.pop();
    } else this.initiateError("typecheck", "setdash");
  },

  currentdash(this: PSCore) {
    this.fill$error();
    this.stack.push(this.classes.newObject("array", this.gstate.dashPattern.arr));
    this.stack.push(this.gstate.dashPattern.param);
  },

  currentstrokeadjust(this: PSCore) {
    this.fill$error();
    this.stack.push(this.classes.newObject("bool", this.gstate.strokeAdjustment));
  },

  /** Sic: pushes the new value back instead of consuming it. */
  setstrokeadjust(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "setstrokeadjust")) return;
    const value = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(value, "bool")) {
      this.gstate.strokeAdjustment = value.value;
      this.stack.pop();
      this.stack.push(this.classes.newObject("bool", this.gstate.strokeAdjustment));
    } else this.initiateError("typecheck", "setstrokeadjust");
  },

  setcharwidth(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "setcharwidth")) return;
    this.stack.pop();
    this.stack.pop();
  },

  setcachedevice(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(6, "setcachedevice")) return;
    for (let i = 0; i < 6; i++) this.stack.pop();
  },

  setcachedevice2(this: PSCore) {
    this.fill$error();
    // Sic: setcachedevice2 takes ten operands; four are removed.
    if (this.stackunderflowCheck(4, "setcachedevice2")) return;
    for (let i = 0; i < 4; i++) this.stack.pop();
  },

  setcolorspace(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "setcolorspace")) return;
    const space = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(space, "array")) this.gstate.colorSpace = space.value.slice();
    else if (this.classes.isPSObject(space, "name")) this.gstate.colorSpace = [space];
    else this.initiateError("typecheck", "setcolorspace");
    // Sic: popped even after a typecheck error.
    this.stack.pop();
  },

  currentcolorspace(this: PSCore) {
    this.stack.push(this.classes.newObject("array", this.gstate.colorSpace));
  },

  setcolor(this: PSCore) {
    const gstate = this.gstate;
    const channels = colorHelper(this).getColorChannelsCount(gstate.colorSpace);
    if (this.stackunderflowCheck(channels, "setcolor")) return;
    if ((gstate.colorSpace[0] as unknown as Valued).value !== "Pattern") {
      const components = this.stack.slice(this.stack.length - channels);
      // Sic: a non-number raises typecheck but the color is set anyway.
      for (let i = 0; i < channels; i++)
        if (typeof components[i] != "number") this.initiateError("typecheck", "setcolor");
      for (let i = 0; i < channels; i++) this.stack.pop();
      gstate.color = components;
    } else {
      gstate.color = this.stack[this.stack.length - 1];
      this.stack.pop();
    }
  },

  currentcolor(this: PSCore) {
    const gstate = this.gstate;
    if (colorSpaceName(this) == "Pattern") this.stack.push(gstate.color);
    else {
      const channels = colorHelper(this).getColorChannelsCount(gstate.colorSpace);
      for (let i = 0; i < channels; ++i) this.stack.push(colorComponent(this, i));
    }
  },

  currentblackgeneration(this: PSCore) {
    this.stack.push(this.gstate.blackGeneration);
  },

  setblackgeneration(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1)) return;
    this.gstate.blackGeneration = this.stack.pop() as PSArray;
  },

  currentundercolorremoval(this: PSCore) {
    this.stack.push(this.gstate.undercolorRemoval);
  },

  setundercolorremoval(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1)) return;
    this.gstate.undercolorRemoval = this.stack.pop() as PSArray;
  },

  currentflat(this: PSCore) {
    this.stack.push(this.gstate.flatness);
  },

  currenthalftone(this: PSCore) {
    this.stack.push(this.gstate.halftone);
  },

  sethalftone(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1)) return;
    this.gstate.halftone = this.stack.pop() as typeof this.gstate.halftone;
  },

  currentcolortransfer(this: PSCore) {
    this.stack.push(this.gstate.transfer[0]);
    this.stack.push(this.gstate.transfer[1]);
    this.stack.push(this.gstate.transfer[2]);
    this.stack.push(this.gstate.transfer[3]);
  },

  setcolortransfer(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(4)) return;
    this.gstate.transfer[3] = this.stack.pop() as PSArray;
    this.gstate.transfer[2] = this.stack.pop() as PSArray;
    this.gstate.transfer[1] = this.stack.pop() as PSArray;
    this.gstate.transfer[0] = this.stack.pop() as PSArray;
  },

  currenttransfer(this: PSCore) {
    this.stack.push(this.gstate.transfer[3]);
  },

  settransfer(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1)) return;
    this.gstate.transfer[3] = this.stack.pop() as PSArray;
  },

  currentsystemparams(this: PSCore) {
    const wasGlobal = this.isGlobal;
    this.isGlobal = true;
    this.stack.push(this.classes.newObject("dict", {}));
    this.isGlobal = wasGlobal;
  },

  currentpagedevice(this: PSCore) {
    this.stack.push(this.classes.newObject("dict", {}));
  },

  setpagedevice(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1)) return;
    this.stack.pop();
  },

  setuserparams(this: PSCore) {
    this.fill$error();
    const params = this.stack[this.stack.length - 1];
    if (this.stackunderflowCheck(1, "setuserparams")) return;
    if (this.classes.isPSObject(params, "dict")) this.userparams = this.stack.pop();
    else this.initiateError("typecheck", "setuserparams");
  },

  setoverprint(this: PSCore) {
    this.fill$error();
    const value = this.stack[this.stack.length - 1];
    if (this.stackunderflowCheck(1, "setoverprint")) return;
    if (this.classes.isPSObject(value, "bool")) {
      this.gstate.overprint = value.value;
      this.stack.pop();
    } else this.initiateError("typecheck", "setoverprint");
  },

  currentoverprint(this: PSCore) {
    this.fill$error();
    this.stack.push(this.classes.newObject("bool", this.gstate.overprint));
  },

  setgray(this: PSCore) {
    this.fill$error();
    const gray = this.stack[this.stack.length - 1];
    if (this.stackunderflowCheck(1, "setgray")) return;
    if (typeof gray == "number") {
      this.gstate.colorSpace = [this.classes.newObject("name", "DeviceGray")];
      this.gstate.color = [gray];
      this.stack.pop();
    } else this.initiateError("typecheck", "setgray");
  },

  /** Sic: in DeviceGray it pushes the color array itself, not its value. */
  currentgray(this: PSCore) {
    const space = colorSpaceName(this);
    if (space == "DeviceGray") this.stack.push(this.gstate.color);
    else if (space == "DeviceRGB")
      this.stack.push(
        0.3 * (colorComponent(this, 0) as number) +
          0.59 * (colorComponent(this, 1) as number) +
          0.11 * (colorComponent(this, 2) as number),
      );
    else this.stack.push(0);
  },

  setcmykcolor(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(4, "setcmykcolor")) return;
    const c = this.stack[this.stack.length - 4];
    const m = this.stack[this.stack.length - 3];
    const y = this.stack[this.stack.length - 2];
    const k = this.stack[this.stack.length - 1];
    if (
      typeof c == "number" &&
      typeof m == "number" &&
      typeof y == "number" &&
      typeof k == "number"
    ) {
      this.gstate.colorSpace = [this.classes.newObject("name", "DeviceCMYK")];
      this.gstate.color = [c, m, y, k];
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
    } else this.initiateError("typecheck", "setcmykcolor");
  },

  currentcmykcolor(this: PSCore) {
    if (colorSpaceName(this) == "DeviceCMYK") {
      for (let i = 0; i < 4; i++) this.stack.push(colorComponent(this, i));
    } else {
      for (let i = 0; i < 4; i++) this.stack.push(0);
    }
  },

  setrgbcolor(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(3, "setrgbcolor")) return;
    const r = this.stack[this.stack.length - 3];
    const g = this.stack[this.stack.length - 2];
    const b = this.stack[this.stack.length - 1];
    if (typeof r == "number" && typeof g == "number" && typeof b == "number") {
      this.gstate.colorSpace = [this.classes.newObject("name", "DeviceRGB")];
      this.gstate.color = [r, g, b];
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
    } else this.initiateError("typecheck", "setrgbcolor");
  },

  /** Sic: outside DeviceRGB it answers white. */
  currentrgbcolor(this: PSCore) {
    if (colorSpaceName(this) == "DeviceRGB") {
      for (let i = 0; i < 3; i++) this.stack.push(colorComponent(this, i));
    } else {
      for (let i = 0; i < 3; i++) this.stack.push(1);
    }
  },

  sethsbcolor(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(3, "sethsbcolor")) return;
    const hue = this.stack[this.stack.length - 3];
    const saturation = this.stack[this.stack.length - 2];
    const brightness = this.stack[this.stack.length - 1];
    if (typeof hue == "number" && typeof saturation == "number" && typeof brightness == "number") {
      const rgb = colorHelper(this).hsvToRGB([360 * hue, 100 * saturation, 100 * brightness]);
      this.gstate.colorSpace = [this.classes.newObject("name", "DeviceRGB")];
      this.gstate.color = rgb;
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
    } else this.initiateError("typecheck", "sethsbcolor");
  },
} satisfies Record<string, PSValue>;
