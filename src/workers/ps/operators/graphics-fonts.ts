// Old: public/pscore.js, systemdict findfont … SharedFontDirectory.
import type { PSCore } from "../core.ts";
import type { PSArray, PSDict, PSProcedure, PSValue } from "../objects.ts";

/** FontMatrix / ScaleMatrix entries of a font dict. */
function matrixOf(font: PSDict, key: "FontMatrix" | "ScaleMatrix"): number[] {
  return (font.value[key] as PSArray).value as number[];
}

export const fontOperators = {
  findfont(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const name = this.stack[this.stack.length - 1];
    if (
      (this.classes.isPSObject(name, "name") || this.classes.isPSObject(name, "string")) &&
      name.value
    ) {
      this.stack.pop();
      const fontName = name.value;
      const fonts = this.resources.Font.value;
      if (!fonts[fontName]) fonts[fontName] = this._createDefaultFont(fontName);
      this.stack.push(fonts[fontName]);
    } else this.initiateError("typecheck");
  },

  selectfont(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2)) return;
    const name = this.stack[this.stack.length - 2];
    const scaleOrMatrix = this.stack[this.stack.length - 1];
    if (!(
      (this.classes.isPSObject(name, "name") || this.classes.isPSObject(name, "string")) &&
      name.value
    )) {
      this.initiateError("typecheck");
      return;
    }
    let matrix: PSArray;
    if (
      (this.classes.isPSObject(scaleOrMatrix, "array") ||
        this.classes.isPSObject(scaleOrMatrix, "packedarray")) &&
      scaleOrMatrix.value.length == 6
    ) {
      matrix = scaleOrMatrix as PSArray;
    } else {
      if (typeof scaleOrMatrix != "number") {
        this.initiateError("typecheck");
        return;
      }
      matrix = this.classes.newObject("array", [scaleOrMatrix, 0, 0, scaleOrMatrix, 0, 0]);
    }
    let font: PSDict;
    const fontName = name.value;
    if (fontName in this.resources.Font.value) {
      this.stack.pop();
      this.stack.pop();
      font = this.resources.Font.value[fontName] as PSDict;
    } else {
      this.stack.pop();
      (this.systemdict.findfont as PSProcedure).call(this);
      if (this.stackunderflowCheck(1)) return;
      const found = this.stack[this.stack.length - 1];
      if (!this.classes.isPSObject(found, "dict")) {
        this.initiateError("typecheck");
        return;
      }
      font = found;
      this.stack.pop();
    }
    const selected = this.classes.newObject("dict", font.value);
    selected.value.FontMatrix = this.classes.newObject(
      "array",
      this.CTM.multiply(matrixOf(font, "FontMatrix"), matrix.value as number[]),
    );
    selected.value.ScaleMatrix = font.value.ScaleMatrix
      ? this.classes.newObject(
          "array",
          this.CTM.multiply(matrixOf(font, "ScaleMatrix"), matrix.value as number[]),
        )
      : matrix;
    this.gstate.font = selected;
  },

  scalefont(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const scale = this.stack[this.stack.length - 1];
    const font = this.stack[this.stack.length - 2];
    if (this.classes.isPSObject(font, "dict") && typeof scale == "number") {
      this.stack.pop();
      this.stack.pop();
      const scaled = this.classes.newObject("dict", font.value);
      scaled.value.FontMatrix = this.classes.newObject("array", matrixOf(font, "FontMatrix"));
      const fontMatrix = matrixOf(scaled, "FontMatrix");
      fontMatrix[0] = (fontMatrix[0] as number) * scale;
      fontMatrix[3] = (fontMatrix[3] as number) * scale;
      const scaleMatrix = this.classes.newObject("array", [scale, 0, 0, scale, 0, 0]);
      scaled.value.ScaleMatrix = font.value.ScaleMatrix
        ? this.classes.newObject(
            "array",
            this.CTM.multiply(matrixOf(font, "ScaleMatrix"), scaleMatrix.value as number[]),
          )
        : scaleMatrix;
      this.stack.push(scaled);
    } else this.initiateError("typecheck");
  },

  setfont(this: PSCore) {
    const font = this.stack[this.stack.length - 1];
    if (this.stackunderflowCheck(1)) return;
    if (this.classes.isPSObject(font, "dict")) {
      this.stack.pop();
      this.gstate.font = font;
    } else this.initiateError("typecheck");
  },

  makefont(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const font = this.stack[this.stack.length - 2];
    const matrix = this.stack[this.stack.length - 1];
    if (!this.classes.isPSObject(font, "dict")) {
      this.initiateError("typecheck");
      return;
    }
    if (!(
      this.classes.isPSObject(matrix, "array") || this.classes.isPSObject(matrix, "packedarray")
    )) {
      this.initiateError("typecheck");
      return;
    }
    if (matrix.value.length != 6) {
      this.initiateError("rangecheck");
      return;
    }
    this.stack.pop();
    this.stack.pop();
    const made = this.classes.newObject("dict", font.value);
    made.value.FontMatrix = this.classes.newObject(
      "array",
      this.CTM.multiply(matrixOf(font, "FontMatrix"), matrix.value as number[]),
    );
    made.value.ScaleMatrix = font.value.ScaleMatrix
      ? this.classes.newObject(
          "array",
          this.CTM.multiply(matrixOf(font, "ScaleMatrix"), matrix.value as number[]),
        )
      : matrix;
    this.stack.push(made);
  },

  definefont(this: PSCore) {
    if (this.stackunderflowCheck(2)) return;
    const key = this.stack[this.stack.length - 2];
    const font = this.stack[this.stack.length - 1];
    if (
      this.classes.isPSObject(font, "dict") &&
      (this.classes.isPSObject(key, "string") || this.classes.isPSObject(key, "name"))
    ) {
      this.stack.pop();
      this.stack.pop();
      const entries = font.value;
      const fontName = entries ? entries.FontName : undefined;
      if (
        entries &&
        (this.classes.isPSObject(fontName, "string") || this.classes.isPSObject(fontName, "name"))
      ) {
        const name = fontName.value;
        const fonts = this.resources.Font.value;
        if (name && !fonts[name]) fonts[name] = font;
        fonts[key.value] = font;
        this.stack.push(font);
      } else this.initiateError("typecheck");
    } else this.initiateError("typecheck");
  },

  composefont(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(3, "composefont")) return;
    const name = this.stack[this.stack.length - 3];
    if (this.classes.isPSObject(name, "string") || this.classes.isPSObject(name, "name")) {
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
      const fonts = this.resources.Font.value;
      fonts[name.value] = this.classes.newObject("dict", {});
      this.stack.push(fonts[name.value]);
    } else this.initiateError("typecheck", "composefont");
  },

  undefinefont(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "undefinefont")) return;
    const name = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(name, "string") || this.classes.isPSObject(name, "name")) {
      this.stack.pop();
      Reflect.deleteProperty(this.resources.Font.value, name.value);
    } else this.initiateError("typecheck", "undefinefont");
  },

  currentfont(this: PSCore) {
    this.stack.push(this.gstate.font);
  },

  FontDirectory(this: PSCore) {
    this.stack.push(this.resources.Font);
  },

  GlobalFontDirectory(this: PSCore) {
    this.stack.push(this.resources.Font);
  },

  SharedFontDirectory(this: PSCore) {
    this.stack.push(this.resources.Font);
  },
} satisfies Record<string, PSValue>;
