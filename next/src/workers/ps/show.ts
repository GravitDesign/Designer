// Old: public/pscore.js (webpack module 1370 of its own build),
// PSCore.prototype._show.
//
// The text operators. With outlined fonts (or for charpath and
// stringwidth) a Type 1 font defined in the program is converted to path
// segments and posted as "fill" (or appended to the path for charpath);
// otherwise the text goes to the page as a "show" call that names the
// font, so the page sets it as text.
//
// Kept (QUESTIONS.md "PS worker: show operator quirks"):
// - kshow and cshow ignore their procedure and behave like show, as do
//   xshow/yshow/xyshow when the widths are a number string.
// - ashow/awidthshow pop the string before checking the numbers, so a
//   typecheck leaves the stack changed.
// - charpath and xyshow/xshow/yshow draw every outlined glyph at the start
//   position (only show, ashow, widthshow and awidthshow advance), and
//   stringwidth of an outlined font pushes 0 0.
// - The paint type is read as `paintType` (lowercase), which fonts don't
//   have, so outlined text is always filled.
import type { PSPoint } from "./ctm.ts";
import { compileType2Glyph, type GlyphCommand } from "./charstrings.ts";
import type { PSCore } from "./core.ts";
import type {
  PSArray,
  PSDict,
  PSPathSegment,
  PSPlainRecord,
  PSString,
  PSValue,
} from "./objects.ts";

export const ShowMode = {
  Show: 1,
  XYShow: 2,
  XShow: 3,
  YShow: 4,
  WidthShow: 5,
  AWidthShow: 6,
  AShow: 7,
  KShow: 8,
  CShow: 9,
  CharPath: 10,
  StringWidth: 11,
} as const;

export type ShowMode = (typeof ShowMode)[keyof typeof ShowMode];

/** A glyph as the layout loop sees it: a converted charstring, or only a width from Metrics. */
interface ShownGlyph {
  width?: number;
  cmds?: GlyphCommand[];
  unicode?: number;
  isInFont?: boolean;
}

interface ColorSource {
  _getGColor(colorSpace: PSValue, color: PSValue): unknown;
}

const CLOSEPATH = (): PSPathSegment => ({ type: "closepath", coord: { x: null, y: null } });

export function show(core: PSCore, showMode: ShowMode): void {
  if (core.stackunderflowCheck(1)) return;
  const classes = core.classes;
  const top = (n: number): PSValue => core.stack[core.stack.length - n];
  let mode: ShowMode = showMode;
  let text = null as unknown as PSString;
  let widths: PSValue[] = [];
  let ax = 0;
  let ay = 0;
  let charCode = 0;
  let cx = 0;
  let cy = 0;
  let strokePath: PSValue = false;

  switch (mode) {
    case ShowMode.Show:
    case ShowMode.StringWidth: {
      const value = top(1);
      if (!classes.isPSObject(value, "string")) {
        core.initiateError("typecheck");
        return;
      }
      text = value;
      core.stack.pop();
      break;
    }
    case ShowMode.XYShow:
    case ShowMode.XShow:
    case ShowMode.YShow: {
      if (core.stackunderflowCheck(2)) return;
      const numbers = top(1);
      const value = top(2);
      if (
        (!classes.isPSObject(numbers, "array") && !classes.isPSObject(numbers, "string")) ||
        !classes.isPSObject(value, "string")
      ) {
        core.initiateError("typecheck");
        return;
      }
      text = value;
      core.stack.pop();
      core.stack.pop();
      if (classes.isPSObject(numbers, "string")) {
        mode = ShowMode.Show;
      } else if (
        numbers.value.length < text.value.length ||
        (mode == ShowMode.XYShow && numbers.value.length < 2 * text.value.length)
      ) {
        core.initiateError("rangecheck");
        return;
      }
      widths = numbers.value as PSValue[];
      break;
    }
    case ShowMode.AShow:
    case ShowMode.AWidthShow: {
      if (core.stackunderflowCheck(3)) return;
      const value = top(1);
      if (!classes.isPSObject(value, "string")) {
        core.initiateError("typecheck");
        return;
      }
      text = value;
      core.stack.pop();
      const yOffset = top(1);
      const xOffset = top(2);
      if (typeof xOffset != "number" || typeof yOffset != "number") {
        core.initiateError("typecheck");
        return;
      }
      ay = yOffset;
      ax = xOffset;
      core.stack.pop();
      core.stack.pop();
      if (mode == ShowMode.AShow) break;
      if (core.stackunderflowCheck(3)) return;
      const char = top(1);
      const charY = top(2);
      const charX = top(3);
      if (typeof char != "number" || typeof charX != "number" || typeof charY != "number") {
        core.initiateError("typecheck");
        return;
      }
      charCode = char;
      cy = charY;
      cx = charX;
      core.stack.pop();
      core.stack.pop();
      core.stack.pop();
      break;
    }
    case ShowMode.WidthShow: {
      if (core.stackunderflowCheck(4)) return;
      const value = top(1);
      if (!classes.isPSObject(value, "string")) {
        core.initiateError("typecheck");
        return;
      }
      text = value;
      core.stack.pop();
      const char = top(1);
      const charY = top(2);
      const charX = top(3);
      if (typeof char != "number" || typeof charX != "number" || typeof charY != "number") {
        core.initiateError("typecheck");
        return;
      }
      charCode = char;
      cy = charY;
      cx = charX;
      core.stack.pop();
      core.stack.pop();
      core.stack.pop();
      break;
    }
    case ShowMode.KShow:
    case ShowMode.CShow: {
      if (core.stackunderflowCheck(2)) return;
      const value = top(1);
      const procedure = top(2);
      if (
        !classes.isPSObject(value, "string") ||
        !classes.isPSObject(procedure, "array") ||
        !procedure.executable
      ) {
        core.initiateError("typecheck");
        return;
      }
      text = value;
      core.stack.pop();
      core.stack.pop();
      mode = ShowMode.Show;
      break;
    }
    case ShowMode.CharPath: {
      if (core.stackunderflowCheck(2)) return;
      const value = top(2);
      if (!classes.isPSObject(value, "string") || !classes.isPSObject(top(1), "bool")) {
        core.initiateError("typecheck");
        return;
      }
      text = value;
      strokePath = (core.stack.pop() as { value: PSValue }).value;
      core.stack.pop();
    }
  }

  const gstate = core.gstate;
  if (!("value" in (gstate.font as object))) {
    core.initiateError("nocurrentfont");
    return;
  }
  if (gstate.position.x === null && mode != ShowMode.StringWidth) {
    core.initiateError("nocurrentpoint");
    return;
  }

  const glyphs: ShownGlyph[] = [];
  const font = (gstate.font as PSDict).value;
  const color = (core.color as unknown as ColorSource)._getGColor(gstate.colorSpace, gstate.color);
  let defaultWidth = gstate.CTM[0] ? 6 / gstate.CTM[0] : 6;
  let fontBBox: number[] | null = null;
  let fontMatrix = undefined as unknown as number[];
  if (font && font.FontBBox && font.FontMatrix) {
    fontBBox = (font.FontBBox as PSArray).value as number[];
    fontMatrix = (font.FontMatrix as PSArray).value as number[];
    if ((fontBBox[0] || fontBBox[2]) && fontMatrix[0])
      defaultWidth = Math.abs(
        ((fontBBox[2] as number) - (fontBBox[0] as number)) * (fontMatrix[0] as number),
      );
  }
  let drawn = false;
  let advance = text.value.length * defaultWidth;

  if (
    font &&
    font.CharStrings &&
    font.FontType == 1 &&
    (core.outlineFonts || mode == ShowMode.StringWidth || mode == ShowMode.CharPath)
  ) {
    const fontData = core._getFont(font);
    (fontData as { FontBBox?: unknown }).FontBBox = fontBBox;
    advance = 0;
    for (let index = 0; index < text.value.length; ++index) {
      const code = text.value.charCodeAt(index);
      let glyph: ShownGlyph | null = null;
      const converted = fontData.glyphs[code];
      if (converted) {
        if (!converted.cmds) {
          const commands: GlyphCommand[] = [];
          compileType2Glyph(converted.output, commands, fontData);
          converted.cmds = commands;
        }
        glyph = converted;
        glyph.unicode = code;
        glyph.isInFont = true;
        glyphs[index] = glyph;
      }
      const metrics = font.Metrics as PSDict | undefined;
      if (metrics && metrics.value) {
        const encoding = (font.Encoding as PSArray).value;
        const entry = encoding[code] as { value: PSValue } | undefined;
        const glyphName = entry ? entry.value : null;
        if (glyphName && metrics.value[glyphName as string]) {
          glyph = glyph || {};
          let metric = metrics.value[glyphName as string];
          if (typeof metric == "number") glyph.width = metric;
          else {
            if (classes.isPSObject(metric, "array")) metric = metric.value;
            const values = metric as number[];
            if (values.length == 2) glyph.width = values[1];
            else if (values.length == 4) glyph.width = values[2];
          }
        }
      }
      advance +=
        glyph && glyph.width
          ? glyph.width * ((font.FontMatrix as PSArray).value[0] as number)
          : defaultWidth;
    }
    if (glyphs.length) {
      let position: PSPoint =
        mode == ShowMode.StringWidth
          ? { x: 0, y: 0 }
          : { x: gstate.position.x as number, y: gstate.position.y as number };
      let matrix: number[];
      const path: PSPathSegment[] = [];
      for (let index = 0; index < glyphs.length; ++index) {
        const glyph = glyphs[index] as ShownGlyph;
        matrix = core.CTM.multiply(
          core.CTM.multiply(fontMatrix, [1, 0, 0, 1, position.x, position.y]),
          gstate.CTM,
        );
        if (glyph.cmds && glyph.cmds.length) {
          let point = core.CTM.transform(0, 0, matrix);
          path.push({ type: "moveto", coord: point });
          for (const command of glyph.cmds) {
            switch (command.cmd) {
              case "bezierCurveTo": {
                const [x1, y1, x2, y2, x3, y3] = command.args as [
                  number,
                  number,
                  number,
                  number,
                  number,
                  number,
                ];
                const coord1 = core.CTM.transform(x1, y1, matrix);
                const coord2 = core.CTM.transform(x2, y2, matrix);
                point = core.CTM.transform(x3, y3, matrix);
                path.push({ type: "curveto", coord1, coord2, coord3: point });
                break;
              }
              case "lineTo":
                point = core.CTM.transform(
                  command.args[0] as number,
                  command.args[1] as number,
                  matrix,
                );
                path.push({ type: "lineto", coord: point });
                break;
              case "moveTo":
                if (
                  path.length > 0 &&
                  mode == ShowMode.CharPath &&
                  strokePath &&
                  (path[path.length - 1] as PSPathSegment).type != "closepath"
                )
                  path.push(CLOSEPATH());
                point = core.CTM.transform(
                  command.args[0] as number,
                  command.args[1] as number,
                  matrix,
                );
                path.push({ type: "moveto", coord: point });
                break;
              case "closePath":
                path.push(CLOSEPATH());
            }
          }
        }
        if (
          path.length > 0 &&
          mode == ShowMode.CharPath &&
          strokePath &&
          (path[path.length - 1] as PSPathSegment).type != "closepath"
        )
          path.push(CLOSEPATH());
        if (
          mode == ShowMode.Show ||
          mode == ShowMode.AShow ||
          mode == ShowMode.WidthShow ||
          mode == ShowMode.AWidthShow
        ) {
          matrix = core.CTM.multiply(
            core.CTM.multiply([1, 0, 0, 1, glyph.width as number, 0], fontMatrix),
            [1, 0, 0, 1, position.x, position.y],
          );
          position = core.CTM.transform(0, 0, matrix);
          if (mode == ShowMode.AShow || mode == ShowMode.AWidthShow) {
            position.x += ax;
            position.y += ay;
          }
          if (
            (mode == ShowMode.WidthShow || mode == ShowMode.AWidthShow) &&
            charCode == glyph.unicode
          ) {
            position.x += cx;
            position.y += cy;
          }
        } else if (mode == ShowMode.XYShow) {
          position.x += widths[2 * index] as number;
          position.y += widths[2 * index + 1] as number;
        } else if (mode == ShowMode.XShow) {
          position.x += widths[index] as number;
        } else if (mode == ShowMode.YShow) {
          position.y += widths[index] as number;
        }
      }
      if (path.length > 1) {
        if (mode == ShowMode.StringWidth) {
          core.stack.push(position.x);
          core.stack.push(position.y);
        } else if (mode == ShowMode.CharPath) {
          gstate.path.push(path);
        } else {
          if (font.paintType != 2) {
            core.toGravit("fill", [[path], color, gstate.clippingPath, false]);
          } else if (font.paintType == 2) {
            const strokeWidth =
              (font.StrokeWidth as number) * (fontMatrix[0] as number) * (gstate.CTM[0] as number);
            core.toGravit("stroke", [
              [path],
              color,
              strokeWidth,
              gstate.clippingPath,
              gstate.lineCap,
              gstate.lineJoin,
              gstate.strokeAdjustment,
              gstate.miterLimit,
              gstate.dashPattern,
            ]);
          }
          gstate.position = { x: position.x, y: position.y };
        }
        drawn = true;
      }
    }
  }

  if (!drawn && mode != ShowMode.CharPath) {
    if (mode == ShowMode.StringWidth) {
      core.stack.push(advance);
      core.stack.push(0);
      return;
    }
    let fontName: PSValue = font ? (font.FontName as { value: PSValue }).value : null;
    let referencing = font;
    for (
      ;
      referencing.FontReferenced &&
      ((referencing.FontReferenced as PSDict).value as PSPlainRecord).FontName;
    ) {
      referencing = (referencing.FontReferenced as PSDict).value;
      fontName = (referencing.FontName as { value: PSValue }).value
        ? (referencing.FontName as { value: PSValue }).value
        : fontName;
    }
    let scaleMatrix: number[];
    let size = 12;
    if (
      font &&
      font.ScaleMatrix &&
      (scaleMatrix = (font.ScaleMatrix as PSArray).value as number[])[3]
    )
      size = (scaleMatrix[3] as number) * (gstate.CTM[3] as number);
    size = Math.abs(size);
    const origin = core.CTM.transform(gstate.position.x as number, gstate.position.y as number);
    if (font.PaintType != 2) {
      core.toGravit("show", [
        text.value,
        fontName,
        size,
        color,
        origin,
        font.PaintType,
        null,
        null,
        null,
        null,
      ]);
    } else {
      const strokeWidth =
        font.StrokeWidth && fontMatrix[0]
          ? (font.StrokeWidth as number) * fontMatrix[0] * (gstate.CTM[0] as number)
          : 1;
      core.toGravit("show", [
        text.value,
        fontName,
        size,
        color,
        origin,
        font.PaintType,
        null,
        null,
        null,
        null,
        strokeWidth,
        gstate.lineCap,
        gstate.lineJoin,
        gstate.strokeAdjustment,
        gstate.miterLimit,
        gstate.dashPattern,
      ]);
    }
    gstate.position.x = (gstate.position.x as number) + advance;
  }
}
