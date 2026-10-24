// Old: chunk.vendor.js module 52 (the editor's cursor table, GCursor).

/**
 * The editor's cursors. Each value is the suffix of a "g-cursor-<name>"
 * CSS class; initStyle writes one rule per cursor. A leading "!" marks a
 * browser cursor name used as is ("text").
 */
export const Cursor = {
  Default: null as string | null,
  Pixel: "pixel",
  Select: "select",
  SelectInverse: "select-inverse",
  SelectDot: "select-dot",
  SelectDotInverse: "select-dot-inverse",
  SelectPlus: "select-plus",
  SelectPlusInverse: "select-plus-inverse",
  SelectArrowOnly: "select-arrow-only",
  SelectCross: "select-cross",
  SelectResizeVert: "select-resize-vert",
  SelectResizeHoriz: "select-resize-horiz",
  SelectResizeUpLeftDownRight: "select-upleft-downright",
  SelectResizeUpRightDownLeft: "select-upright-downleft",
  SelectSkewVert: "select-skew-vert",
  SelectSkewHoriz: "select-skew-horiz",
  /** One rotate cursor per handle, clockwise from top left. */
  SelectRotate: [
    "select-rot-tl",
    "select-rot-tc",
    "select-rot-tr",
    "select-rot-rc",
    "select-rot-br",
    "select-rot-bc",
    "select-rot-bl",
    "select-rot-lc",
  ],
  SelectRotateRound: "select-rot-round",
  SelectSmallRotateRound: "select-small-rot-round",
  SelectCurve: "select-curve",
  TextResize: "text-resize",
  ZoomPlus: "zoom-plus",
  ZoomMinus: "zoom-minus",
  ZoomNone: "zoom-none",
  HandOpen: "hand-open",
  HandClosed: "hand-closed",
  Cross: "cross",
  CrossEllipse: "cross-ellipse",
  CrossArrow: "cross-arrow",
  CrossRectangle: "cross-rectangle",
  CrossHighlight: "cross-highlight",
  CrossFreehand: "cross-freehand",
  Comment: "comment",
  Pen: "pen",
  PenStart: "pen-start",
  PenEnd: "pen-end",
  PenPlus: "pen-plus",
  PenPlusMiddle: "pen-plus-middle",
  PenMinus: "pen-minus",
  PenModify: "pen-modify",
  PenDrag: "pen-drag",
  Lasso: "lasso",
  Pipette: "pipette",
  Knife: "knife",
  Text: "!text",

  _styleElement: null as HTMLStyleElement | null,

  /** The CSS rule for one cursor name, as initStyle writes it. */
  cssRule(name: string): string {
    let css: string;
    if ("!" === name.charAt(0)) {
      name = name.substr(1);
      css = name;
    } else {
      switch (name) {
        case Cursor.CrossEllipse:
        case Cursor.CrossArrow:
        case Cursor.CrossRectangle:
        case Cursor.CrossHighlight:
        case Cursor.CrossFreehand:
        case Cursor.Comment:
          css = 'url("assets/cursor/' + name + '.svg") 9 12, auto';
          break;
        default:
          css = 'url("assets/cursor/' + name + '.cur"), auto';
      }
    }
    return ".g-cursor-" + name + " {cursor: " + css + " !important;}";
  },

  /** Adds the cursor classes' style sheet to the document once. */
  initStyle(): void {
    if (Cursor._styleElement || typeof document === "undefined" || !document.createElement) return;
    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    Cursor._styleElement = style;
    const rules: string[] = [];
    // The old code walked the object's own keys in order, taking every
    // string and every string of an array.
    for (const value of Object.values(Cursor) as unknown[]) {
      if (Array.isArray(value)) {
        for (const name of value as string[]) rules.push(Cursor.cssRule(name));
      } else if ("string" == typeof value) {
        rules.push(Cursor.cssRule(value));
      }
    }
    style.textContent = rules.join("\n");
    document.body.appendChild(style);
  },
};
