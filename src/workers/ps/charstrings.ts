// Old: public/pscore.js (webpack module 1370 of its own build), the
// helpers in front of PSCore: the Type 1 → Type 2 charstring converter
// (minified `k`) and the Type 2 charstring interpreter that turns a glyph
// into path commands (`d`).
//
// Dropped as dead code: a cmap lookup (`g`) and a compiled-glyph class
// (`m`, getPathJs/compileGlyph) that nothing ever instantiated; both came
// from pdf.js's font code.

/** A path command of a glyph outline, as the show operators read it. */
export type GlyphCommand =
  | { cmd: "moveTo" | "lineTo" | "bezierCurveTo" | "translate"; args: number[] }
  | { cmd: "closePath"; args: null }
  | { cmd: "save" | "restore" };

/** The font data the Type 2 interpreter reads (see PSCore._getFont). */
export interface CharStringFont {
  subrs: unknown[];
  subrsBias: unknown;
  gsubrs: unknown[];
  gsubrsBias: unknown;
  glyphs: Record<number, Type1CharString>;
}

/** Type 2 operators the converter emits. */
const RMOVETO = [21];
const HMOVETO = [22];
const VMOVETO = [4];
const RLINETO = [5];
const HLINETO = [6];
const VLINETO = [7];
const RRCURVETO = [8];
const CLOSEPATH = [9];
const FLEX = [12, 35];
const ENDCHAR = [14];
const VHCURVETO = [30];
const HVCURVETO = [31];

/**
 * Converts one decrypted Type 1 charstring into Type 2 operators
 * (`output`), tracking the side bearing and advance width from hsbw/sbw.
 * Show adds `cmds`, `unicode` and `isInFont` once it has used the glyph.
 */
export class Type1CharString {
  width = 0;
  lsb = 0;
  flexing = false;
  output: number[] = [];
  stack: number[] = [];
  /** The four seac operands, when converting with seacAnalysis. */
  declare seac?: number[];
  declare cmds?: GlyphCommand[];
  declare unicode?: number;
  declare isInFont?: boolean;

  /**
   * Converts `charString` (with `subrs` for callsubr). Returns true when it
   * stopped on an error (too few operands). Kept: subrs are the PS string
   * objects of the font, which have no length, so callsubr converts nothing.
   */
  convert(charString: ArrayLike<number>, subrs: unknown[], seacAnalysis: boolean): boolean {
    const program = charString;
    let error = false;
    for (let i = 0; i < program.length; i++) {
      let value = program[i] as number;
      if (value < 32) {
        if (value === 12) value = (value << 8) + (program[++i] as number);
        switch (value) {
          case 1: // hstem
          case 3: // vstem
            this.stack = [];
            break;
          case 4: // vmoveto
            if (this.flexing) {
              if (this.stack.length < 1) {
                error = true;
                break;
              }
              const dy = this.stack.pop() as number;
              this.stack.push(0, dy);
              break;
            }
            error = this.executeCommand(1, VMOVETO);
            break;
          case 5:
            error = this.executeCommand(2, RLINETO);
            break;
          case 6:
            error = this.executeCommand(1, HLINETO);
            break;
          case 7:
            error = this.executeCommand(1, VLINETO);
            break;
          case 8:
            error = this.executeCommand(6, RRCURVETO);
            break;
          case 9:
            error = this.executeCommand(0, CLOSEPATH);
            this.stack = [];
            break;
          case 10: {
            // callsubr
            if (this.stack.length < 1) {
              error = true;
              break;
            }
            const index = this.stack.pop() as number;
            error = this.convert(subrs[index] as ArrayLike<number>, subrs, seacAnalysis);
            break;
          }
          case 11: // return
            return error;
          case 13: {
            // hsbw
            if (this.stack.length < 2) {
              error = true;
              break;
            }
            const advance = this.stack.pop() as number;
            const sideBearing = this.stack.pop() as number;
            this.lsb = sideBearing;
            this.width = advance;
            this.stack.push(sideBearing);
            error = this.executeCommand(1, HMOVETO);
            break;
          }
          case 14:
            this.output.push(ENDCHAR[0] as number);
            break;
          case 21:
            if (this.flexing) break;
            error = this.executeCommand(2, RMOVETO);
            break;
          case 22:
            if (this.flexing) {
              this.stack.push(0);
              break;
            }
            error = this.executeCommand(1, HMOVETO);
            break;
          case 30:
            error = this.executeCommand(4, VHCURVETO);
            break;
          case 31:
            error = this.executeCommand(4, HVCURVETO);
            break;
          case 3072: // dotsection
          case 3073: // vstem3
          case 3074: // hstem3
            this.stack = [];
            break;
          case 3078: // seac
            if (seacAnalysis) {
              this.seac = this.stack.splice(-4, 4);
              error = this.executeCommand(0, ENDCHAR);
            } else {
              error = this.executeCommand(4, ENDCHAR);
            }
            break;
          case 3079: {
            // sbw
            if (this.stack.length < 4) {
              error = true;
              break;
            }
            this.stack.pop();
            const advance = this.stack.pop() as number;
            const sideBearingY = this.stack.pop() as number;
            const sideBearingX = this.stack.pop() as number;
            this.lsb = sideBearingX;
            this.width = advance;
            this.stack.push(sideBearingX, sideBearingY);
            error = this.executeCommand(2, RMOVETO);
            break;
          }
          case 3084: {
            // div
            if (this.stack.length < 2) {
              error = true;
              break;
            }
            const divisor = this.stack.pop() as number;
            const dividend = this.stack.pop() as number;
            this.stack.push(dividend / divisor);
            break;
          }
          case 3088: {
            // callothersubr: only the flex othersubrs 0 and 1 matter
            if (this.stack.length < 2) {
              error = true;
              break;
            }
            const subr = this.stack.pop() as number;
            const argumentCount = this.stack.pop() as number;
            if (subr === 0 && argumentCount === 3) {
              const flex = this.stack.splice(this.stack.length - 17, 17);
              const at = (n: number) => flex[n] as number;
              this.stack.push(
                at(2) + at(0),
                at(3) + at(1),
                at(4),
                at(5),
                at(6),
                at(7),
                at(8),
                at(9),
                at(10),
                at(11),
                at(12),
                at(13),
                at(14),
              );
              error = this.executeCommand(13, FLEX, true);
              this.flexing = false;
              this.stack.push(at(15), at(16));
            } else if (subr === 1 && argumentCount === 0) {
              this.flexing = true;
            }
            break;
          }
          case 3089: // pop
            break;
          case 3105: // setcurrentpoint
            this.stack = [];
        }
        if (error) break;
      } else {
        if (value <= 246) value -= 139;
        else if (value <= 250) value = 256 * (value - 247) + (program[++i] as number) + 108;
        else if (value <= 254) value = -256 * (value - 251) - (program[++i] as number) - 108;
        else
          value =
            ((255 & (program[++i] as number)) << 24) |
            ((255 & (program[++i] as number)) << 16) |
            ((255 & (program[++i] as number)) << 8) |
            ((255 & (program[++i] as number)) << 0);
        this.stack.push(value);
      }
    }
    return error;
  }

  /**
   * Writes the top `count` operands and then `command`. Integers become
   * 16-bit operands, reals 16.16 fixed. `keep` removes only the written
   * operands instead of clearing the stack. Returns true when operands are
   * missing.
   */
  executeCommand(count: number, command: readonly number[], keep?: boolean): boolean {
    const length = this.stack.length;
    if (count > length) return true;
    const start = length - count;
    for (let i = start; i < length; i++) {
      let operand = this.stack[i] as number;
      if (operand === (operand | 0)) {
        this.output.push(28, (operand >> 8) & 255, operand & 255);
      } else {
        operand = (65536 * operand) | 0;
        this.output.push(
          255,
          (operand >> 24) & 255,
          (operand >> 16) & 255,
          (operand >> 8) & 255,
          operand & 255,
        );
      }
    }
    this.output.push(...command);
    if (keep) this.stack.splice(start, count);
    else this.stack.length = 0;
    return false;
  }

  /** Charstring decryption (r = 4330), dropping the four lead bytes. */
  decrypt(text: string): Uint8Array {
    let key = 4330;
    const bytes = new Uint8Array(text.length);
    let i: number;
    for (i = 0; i < 4; i++) {
      bytes[i] = text.charCodeAt(i);
      key = (52845 * ((bytes[i] as number) + key) + 22719) & 65535;
    }
    const plainLength = text.length - 4;
    const plain = new Uint8Array(plainLength);
    for (let j = 0; j < plainLength; i++, j++) {
      bytes[i] = text.charCodeAt(i);
      const cipher = bytes[i] as number;
      plain[j] = cipher ^ (key >> 8);
      key = (52845 * (cipher + key) + 22719) & 65535;
    }
    return plain;
  }
}

/** `error(...)` in the old code was an undefined global, so calling it threw. */
function undefinedErrorFunction(): never {
  throw new ReferenceError("error is not defined");
}

/**
 * Interprets Type 2 charstring `program` and appends its outline to
 * `commands`. Kept: for seac (endchar with four operands) the old code
 * passed the glyph objects instead of their output, so accented glyphs
 * draw nothing, and a missing glyph throws.
 */
export function compileType2Glyph(
  program: unknown,
  commands: GlyphCommand[],
  font: CharStringFont,
): void {
  const stack: number[] = [];
  let x = 0;
  let y = 0;
  let stemCount = 0;
  const next = () => stack.shift() as number;
  const moveTo = (px: number, py: number) => commands.push({ cmd: "moveTo", args: [px, py] });
  const lineTo = (px: number, py: number) => commands.push({ cmd: "lineTo", args: [px, py] });
  const curveTo = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    commands.push({ cmd: "bezierCurveTo", args: [x1, y1, x2, y2, x3, y3] });

  const run = (code: ArrayLike<number>): void => {
    for (let u = 0; u < code.length;) {
      let x1: number;
      let x2: number;
      let y1: number;
      let y2: number;
      let clearStack = false;
      const op = code[u++] as number;
      switch (op) {
        case 1:
        case 3:
          stemCount += stack.length >> 1;
          clearStack = true;
          break;
        case 4:
          y += stack.pop() as number;
          moveTo(x, y);
          clearStack = true;
          break;
        case 5:
          while (stack.length > 0) {
            x += next();
            y += next();
            lineTo(x, y);
          }
          break;
        case 6:
          while (stack.length > 0) {
            x += next();
            lineTo(x, y);
            if (stack.length === 0) break;
            y += next();
            lineTo(x, y);
          }
          break;
        case 7:
          while (stack.length > 0) {
            y += next();
            lineTo(x, y);
            if (stack.length === 0) break;
            x += next();
            lineTo(x, y);
          }
          break;
        case 8:
          while (stack.length > 0) {
            x1 = x + next();
            y1 = y + next();
            x2 = x1 + next();
            y2 = y1 + next();
            x = x2 + next();
            y = y2 + next();
            curveTo(x1, y1, x2, y2, x, y);
          }
          break;
        case 9:
          commands.push({ cmd: "closePath", args: null });
          break;
        case 10: {
          const subr = font.subrs[(stack.pop() as number) + (font.subrsBias as number)];
          if (subr) run(subr as ArrayLike<number>);
          break;
        }
        case 11:
          return;
        case 12:
          switch (code[u++] as number) {
            case 34: {
              // hflex
              x1 = x + next();
              x2 = x1 + next();
              const flexY = y + next();
              x = x2 + next();
              curveTo(x1, y, x2, flexY, x, flexY);
              x1 = x + next();
              x2 = x1 + next();
              x = x2 + next();
              curveTo(x1, flexY, x2, y, x, y);
              break;
            }
            case 35:
              // flex
              x1 = x + next();
              y1 = y + next();
              x2 = x1 + next();
              y2 = y1 + next();
              x = x2 + next();
              y = y2 + next();
              curveTo(x1, y1, x2, y2, x, y);
              x1 = x + next();
              y1 = y + next();
              x2 = x1 + next();
              y2 = y1 + next();
              x = x2 + next();
              y = y2 + next();
              curveTo(x1, y1, x2, y2, x, y);
              stack.pop();
              break;
            case 36: {
              // hflex1
              x1 = x + next();
              const firstY = y + next();
              x2 = x1 + next();
              const middleY = firstY + next();
              x = x2 + next();
              curveTo(x1, firstY, x2, middleY, x, middleY);
              x1 = x + next();
              x2 = x1 + next();
              const lastY = middleY + next();
              x = x2 + next();
              curveTo(x1, middleY, x2, lastY, x, y);
              break;
            }
            case 37: {
              // flex1
              const startX = x;
              const startY = y;
              x1 = x + next();
              y1 = y + next();
              x2 = x1 + next();
              y2 = y1 + next();
              x = x2 + next();
              y = y2 + next();
              curveTo(x1, y1, x2, y2, x, y);
              x1 = x + next();
              y1 = y + next();
              x2 = x1 + next();
              y2 = y1 + next();
              x = x2;
              y = y2;
              if (Math.abs(x - startX) > Math.abs(y - startY)) x += next();
              else y += next();
              curveTo(x1, y1, x2, y2, x, y);
              break;
            }
            default:
              undefinedErrorFunction();
          }
          break;
        case 14:
          if (stack.length >= 4) {
            const accent = stack.pop() as number;
            const base = stack.pop() as number;
            y = stack.pop() as number;
            x = stack.pop() as number;
            commands.push({ cmd: "save" });
            commands.push({ cmd: "translate", args: [x, y] });
            compileType2Glyph(font.glyphs[accent], commands, font);
            commands.push({ cmd: "restore" });
            compileType2Glyph(font.glyphs[base], commands, font);
          }
          return;
        case 18:
          stemCount += stack.length >> 1;
          clearStack = true;
          break;
        case 19:
        case 20:
          stemCount += stack.length >> 1;
          u += (stemCount + 7) >> 3;
          clearStack = true;
          break;
        case 21:
          y += stack.pop() as number;
          x += stack.pop() as number;
          moveTo(x, y);
          clearStack = true;
          break;
        case 22:
          x += stack.pop() as number;
          moveTo(x, y);
          clearStack = true;
          break;
        case 23:
          stemCount += stack.length >> 1;
          clearStack = true;
          break;
        case 24:
          while (stack.length > 2) {
            x1 = x + next();
            y1 = y + next();
            x2 = x1 + next();
            y2 = y1 + next();
            x = x2 + next();
            y = y2 + next();
            curveTo(x1, y1, x2, y2, x, y);
          }
          x += next();
          y += next();
          lineTo(x, y);
          break;
        case 25:
          while (stack.length > 6) {
            x += next();
            y += next();
            lineTo(x, y);
          }
          x1 = x + next();
          y1 = y + next();
          x2 = x1 + next();
          y2 = y1 + next();
          x = x2 + next();
          y = y2 + next();
          curveTo(x1, y1, x2, y2, x, y);
          break;
        case 26:
          if (stack.length % 2) x += next();
          while (stack.length > 0) {
            x1 = x;
            y1 = y + next();
            x2 = x1 + next();
            y2 = y1 + next();
            x = x2;
            y = y2 + next();
            curveTo(x1, y1, x2, y2, x, y);
          }
          break;
        case 27:
          if (stack.length % 2) y += next();
          while (stack.length > 0) {
            x1 = x + next();
            y1 = y;
            x2 = x1 + next();
            y2 = y1 + next();
            x = x2 + next();
            y = y2;
            curveTo(x1, y1, x2, y2, x, y);
          }
          break;
        case 28:
          stack.push((((code[u] as number) << 24) | ((code[u + 1] as number) << 16)) >> 16);
          u += 2;
          break;
        case 29: {
          const subr = font.gsubrs[(stack.pop() as number) + (font.gsubrsBias as number)];
          if (subr) run(subr as ArrayLike<number>);
          break;
        }
        case 30:
          // vhcurveto
          while (stack.length > 0) {
            x1 = x;
            y1 = y + next();
            x2 = x1 + next();
            y2 = y1 + next();
            x = x2 + next();
            y = y2 + (stack.length === 1 ? next() : 0);
            curveTo(x1, y1, x2, y2, x, y);
            if (stack.length === 0) break;
            x1 = x + next();
            y1 = y;
            x2 = x1 + next();
            y2 = y1 + next();
            y = y2 + next();
            x = x2 + (stack.length === 1 ? next() : 0);
            curveTo(x1, y1, x2, y2, x, y);
          }
          break;
        case 31:
          // hvcurveto
          while (stack.length > 0) {
            x1 = x + next();
            y1 = y;
            x2 = x1 + next();
            y2 = y1 + next();
            y = y2 + next();
            x = x2 + (stack.length === 1 ? next() : 0);
            curveTo(x1, y1, x2, y2, x, y);
            if (stack.length === 0) break;
            x1 = x;
            y1 = y + next();
            x2 = x1 + next();
            y2 = y1 + next();
            x = x2 + next();
            y = y2 + (stack.length === 1 ? next() : 0);
            curveTo(x1, y1, x2, y2, x, y);
          }
          break;
        default:
          if (op < 32) console.log("unknown operator: " + op);
          if (op < 247) stack.push(op - 139);
          else if (op < 251) stack.push(256 * (op - 247) + (code[u++] as number) + 108);
          else if (op < 255) stack.push(256 * -(op - 251) - (code[u++] as number) - 108);
          else {
            stack.push(
              (((code[u] as number) << 24) |
                ((code[u + 1] as number) << 16) |
                ((code[u + 2] as number) << 8) |
                (code[u + 3] as number)) /
                65536,
            );
            u += 4;
          }
      }
      if (clearStack) stack.length = 0;
    }
  };
  run(program as ArrayLike<number>);
}
