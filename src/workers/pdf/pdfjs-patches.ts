// Old: public/designer.browser.dev.js module 792 (pdf.js main build) and
// public/pdf.worker.js: the old app bundled a pdf.js 2.1.286 that Gravit
// had patched. The rewrite uses pdfjs-dist 2.1.266 (the closest release
// on npm) and applies the same changes to its two build files as text
// patches when they are loaded (io/import/pdf/pdfjs.ts for the main
// build, pdf.worker.ts for the worker). Each patch must
// match exactly once, so a different pdfjs-dist version fails loudly
// instead of half-patching.
//
// What Gravit changed:
// - CMYK colors stay CMYK. With the getDocument option disableCMYKToRGB
//   the worker sends setFillCMYKColor / setStrokeCMYKColor (values 0-100)
//   instead of converting them to RGB, and CanvasGraphics turns them into
//   "cmyk(c%,m%,y%,k%)" styles that the import's canvas bridge reads.
// - Text: showText draws each glyph's unicode text (not the font
//   character) and passes the glyph's advance to fillText/strokeText as a
//   fourth argument; glyphs endText can't add to a clip are skipped.
// - stroke() uses the line width as is (no minimum of one device pixel);
//   copyCtxState also copies the bridge's `_path`.
// - page.render() takes a canvasGraphicsClass (the importer's
//   CanvasGraphics subclass) and a progress callback that is called after
//   every operator with (done, total).
// - The main build exports CanvasGraphics, TilingPattern and
//   getShadingPatternFromIR so the importer can subclass them.
// - Fonts (worker): char codes keep their unicode values where possible
//   (pdf.js's older adjustMapping, before every glyph went to the private
//   use area), so the text the importer receives is real text; fonts carry
//   a serialized copy of their font dictionary (baseDict) and a `coded`
//   flag.
// - XRef tables may also start with the keyword xref_table.
//
// The old builds report version 2.1.286, a git build between the 2.1.266
// release and the next one; npm has no 2.1.286. The differences were
// found by comparing the old builds with pdfjs-dist 2.1.266 module by
// module, and a token comparison of the old worker against 2.1.266 with
// these patches applied shows nothing else that differs (only webpack
// polyfills and an unused worker-side Util.makeCssCMYK).

export interface TextPatch {
  /** What the patch does, for error messages. */
  name: string;
  find: string;
  replace: string;
}

export const MAIN_PATCHES: readonly TextPatch[] = [
  {
    name: "export CanvasGraphics, TilingPattern and getShadingPatternFromIR",
    find: "exports.SVGGraphics = pdfjsDisplaySVG.SVGGraphics;\n",
    replace:
      "exports.SVGGraphics = pdfjsDisplaySVG.SVGGraphics;\n" +
      "exports.CanvasGraphics = __w_pdfjs_require__(154).CanvasGraphics;\n" +
      "exports.TilingPattern = __w_pdfjs_require__(155).TilingPattern;\n" +
      "exports.getShadingPatternFromIR = __w_pdfjs_require__(155).getShadingPatternFromIR;\n",
  },
  {
    name: "Util.makeCssCMYK",
    find:
      "  Util.makeCssRgb = function Util_makeCssRgb(r, g, b) {\n" +
      "    rgbBuf[1] = r;\n" +
      "    rgbBuf[3] = g;\n" +
      "    rgbBuf[5] = b;\n" +
      "    return rgbBuf.join('');\n" +
      "  };\n",
    replace:
      "  Util.makeCssRgb = function Util_makeCssRgb(r, g, b) {\n" +
      "    rgbBuf[1] = r;\n" +
      "    rgbBuf[3] = g;\n" +
      "    rgbBuf[5] = b;\n" +
      "    return rgbBuf.join('');\n" +
      "  };\n" +
      "\n" +
      "  var cmykBuf = ['cmyk(', 0, '%,', 0, '%,', 0, '%,', 0, '%)'];\n" +
      "\n" +
      "  Util.makeCssCMYK = function Util_makeCssCMYK(c, m, y, k) {\n" +
      "    cmykBuf[1] = c;\n" +
      "    cmykBuf[3] = m;\n" +
      "    cmykBuf[5] = y;\n" +
      "    cmykBuf[7] = k;\n" +
      "    return cmykBuf.join('');\n" +
      "  };\n",
  },
  {
    name: "CanvasGraphics CMYK colors",
    find: "    shadingFill: function CanvasGraphics_shadingFill(patternIR) {\n",
    replace:
      "    setStrokeCMYKColor: function CanvasGraphics_setStrokeCMYKColor(c, m, y, k) {\n" +
      "      var color = _util.Util.makeCssCMYK(c, m, y, k);\n" +
      "\n" +
      "      this.ctx.strokeStyle = color;\n" +
      "      this.current.strokeColor = color;\n" +
      "    },\n" +
      "    setFillCMYKColor: function CanvasGraphics_setFillCMYKColor(c, m, y, k) {\n" +
      "      var color = _util.Util.makeCssCMYK(c, m, y, k);\n" +
      "\n" +
      "      this.ctx.fillStyle = color;\n" +
      "      this.current.fillColor = color;\n" +
      "      this.current.patternFill = false;\n" +
      "    },\n" +
      "    shadingFill: function CanvasGraphics_shadingFill(patternIR) {\n",
  },
  {
    name: "executeOperatorList progress parameter",
    find: "    executeOperatorList: function CanvasGraphics_executeOperatorList(operatorList, executionStartIdx, continueCallback, stepper) {\n",
    replace:
      "    executeOperatorList: function CanvasGraphics_executeOperatorList(operatorList, executionStartIdx, continueCallback, stepper, progress) {\n",
  },
  {
    name: "executeOperatorList progress call",
    find:
      "        i++;\n" +
      "\n" +
      "        if (i === argsArrayLen) {\n" +
      "          return i;\n" +
      "        }\n" +
      "\n" +
      "        if (chunkOperations && ++steps > EXECUTION_STEPS) {\n",
    replace:
      "        i++;\n" +
      "\n" +
      "        if (progress) {\n" +
      "          progress(i, argsArrayLen);\n" +
      "        }\n" +
      "\n" +
      "        if (i === argsArrayLen) {\n" +
      "          return i;\n" +
      "        }\n" +
      "\n" +
      "        if (chunkOperations && ++steps > EXECUTION_STEPS) {\n",
  },
  {
    name: "render() options canvasGraphicsClass and progress",
    find:
      "          _ref3$background = _ref3.background,\n" +
      "          background = _ref3$background === void 0 ? null : _ref3$background;\n",
    replace:
      "          _ref3$background = _ref3.background,\n" +
      "          background = _ref3$background === void 0 ? null : _ref3$background,\n" +
      "          canvasGraphicsClass = _ref3.canvasGraphicsClass === void 0 ? null : _ref3.canvasGraphicsClass,\n" +
      "          progress = _ref3.progress === void 0 ? null : _ref3.progress;\n",
  },
  {
    name: "render() passes progress to the render task",
    find:
      "          imageLayer: imageLayer,\n" +
      "          background: background\n" +
      "        },\n" +
      "        objs: this.objs,\n",
    replace:
      "          imageLayer: imageLayer,\n" +
      "          background: background,\n" +
      "          progress: progress\n" +
      "        },\n" +
      "        objs: this.objs,\n",
  },
  {
    name: "render() passes canvasGraphicsClass to the render task",
    find:
      "        canvasFactory: canvasFactoryInstance,\n" +
      "        webGLContext: webGLContext,\n" +
      "        useRequestAnimationFrame: renderingIntent !== 'print',\n",
    replace:
      "        canvasFactory: canvasFactoryInstance,\n" +
      "        canvasGraphicsClass: canvasGraphicsClass,\n" +
      "        webGLContext: webGLContext,\n" +
      "        useRequestAnimationFrame: renderingIntent !== 'print',\n",
  },
  {
    name: "InternalRenderTask reads canvasGraphicsClass",
    find:
      "          canvasFactory = _ref11.canvasFactory,\n" +
      "          webGLContext = _ref11.webGLContext,\n",
    replace:
      "          canvasFactory = _ref11.canvasFactory,\n" +
      "          canvasGraphicsClass = _ref11.canvasGraphicsClass,\n" +
      "          webGLContext = _ref11.webGLContext,\n",
  },
  {
    name: "InternalRenderTask keeps the graphics class",
    find: "      this.canvasFactory = canvasFactory;\n      this.webGLContext = webGLContext;\n",
    replace:
      "      this.canvasFactory = canvasFactory;\n" +
      "      this.CanvasGraphics = canvasGraphicsClass || _canvas.CanvasGraphics;\n" +
      "      this.webGLContext = webGLContext;\n",
  },
  {
    name: "InternalRenderTask creates the graphics class",
    find: "        this.gfx = new _canvas.CanvasGraphics(canvasContext, this.commonObjs, this.objs, this.canvasFactory, this.webGLContext, imageLayer);\n",
    replace:
      "        this.gfx = new this.CanvasGraphics(canvasContext, this.commonObjs, this.objs, this.canvasFactory, this.webGLContext, imageLayer);\n",
  },
  {
    name: "InternalRenderTask reports progress",
    find: "                  this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList, this.operatorListIdx, this._continueBound, this.stepper);\n",
    replace:
      "                  this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList, this.operatorListIdx, this._continueBound, this.stepper, this.params.progress);\n",
  },
  {
    name: "copyCtxState copies the bridge's path",
    find: "var properties = ['strokeStyle', 'fillStyle', 'fillRule', 'globalAlpha', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'globalCompositeOperation', 'font'];",
    replace:
      "var properties = ['strokeStyle', 'fillStyle', 'fillRule', 'globalAlpha', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'globalCompositeOperation', 'font', '_path'];",
  },
  {
    name: "stroke uses the line width as is",
    find: "      ctx.lineWidth = Math.max(this.getSinglePixelWidth() * MIN_WIDTH_FACTOR, this.current.lineWidth);\n",
    replace: "      ctx.lineWidth = this.current.lineWidth;\n",
  },
  {
    name: "endText survives glyphs it can't add to the clip path",
    find: "        path.addToPath(ctx, path.fontSize);\n",
    replace:
      "        try {\n" +
      "          path.addToPath(ctx, path.fontSize);\n" +
      "        } catch (e) {\n" +
      '          console.warn("Couldn\'t add to path:" + e.message);\n' +
      "        }\n",
  },
  {
    name: "showText without a font",
    find: "      if (font.isType3Font) {\n        return this.showType3Text(glyphs);\n      }\n",
    replace:
      "      if (font && font.isType3Font) {\n        return this.showType3Text(glyphs);\n      }\n",
  },
  {
    name: "showText draws the unicode text of a glyph",
    find:
      "        var restoreNeeded = false;\n" +
      "        var spacing = (glyph.isSpace ? wordSpacing : 0) + charSpacing;\n" +
      "        var character = glyph.fontChar;\n",
    replace:
      "        var restoreNeeded = false;\n" +
      "        var spacing = (glyph.isSpace ? wordSpacing : 0) + charSpacing;\n" +
      "        var character = glyph.unicode;\n",
  },
  {
    name: "showText passes each glyph's advance to fillText and paintChar",
    find:
      "        if (glyph.isInFont || font.missingFile) {\n" +
      "          if (simpleFillText && !accent) {\n" +
      "            ctx.fillText(character, scaledX, scaledY);\n" +
      "          } else {\n" +
      "            this.paintChar(character, scaledX, scaledY, patternTransform);\n" +
      "\n" +
      "            if (accent) {\n" +
      "              scaledAccentX = scaledX + accent.offset.x / fontSizeScale;\n" +
      "              scaledAccentY = scaledY - accent.offset.y / fontSizeScale;\n" +
      "              this.paintChar(accent.fontChar, scaledAccentX, scaledAccentY, patternTransform);\n" +
      "            }\n" +
      "          }\n" +
      "        }\n" +
      "\n" +
      "        var charWidth = width * widthAdvanceScale + spacing * fontDirection;\n" +
      "        x += charWidth;\n",
    replace:
      "        var charWidth = width * widthAdvanceScale + spacing * fontDirection;\n" +
      "\n" +
      "        if (glyph.isInFont || font.missingFile) {\n" +
      "          if (simpleFillText && !accent) {\n" +
      "            ctx.fillText(character, scaledX, scaledY, charWidth);\n" +
      "          } else {\n" +
      "            this.paintChar(character, scaledX, scaledY, patternTransform, charWidth);\n" +
      "\n" +
      "            if (accent) {\n" +
      "              scaledAccentX = scaledX + accent.offset.x / fontSizeScale;\n" +
      "              scaledAccentY = scaledY - accent.offset.y / fontSizeScale;\n" +
      "              this.paintChar(accent.fontChar, scaledAccentX, scaledAccentY, patternTransform, charWidth);\n" +
      "            }\n" +
      "          }\n" +
      "        }\n" +
      "\n" +
      "        x += charWidth;\n",
  },
  {
    name: "paintChar takes the glyph's advance",
    find: "    paintChar: function paintChar(character, x, y, patternTransform) {\n",
    replace: "    paintChar: function paintChar(character, x, y, patternTransform, charWidth) {\n",
  },
  {
    name: "paintChar passes the advance to fillText",
    find:
      "        if (fillStrokeMode === _util.TextRenderingMode.FILL || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {\n" +
      "          ctx.fillText(character, x, y);\n" +
      "        }\n" +
      "\n" +
      "        if (fillStrokeMode === _util.TextRenderingMode.STROKE || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {\n" +
      "          ctx.strokeText(character, x, y);\n" +
      "        }\n",
    replace:
      "        if (fillStrokeMode === _util.TextRenderingMode.FILL || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {\n" +
      "          ctx.fillText(character, x, y, charWidth);\n" +
      "        }\n" +
      "\n" +
      "        if (fillStrokeMode === _util.TextRenderingMode.STROKE || fillStrokeMode === _util.TextRenderingMode.FILL_STROKE) {\n" +
      "          ctx.strokeText(character, x, y, charWidth);\n" +
      "        }\n",
  },
  {
    name: "GetDocRequest sends disableCMYKToRGB",
    find: "    isEvalSupported: source.isEvalSupported\n  }).then(function (workerId) {\n",
    replace:
      "    isEvalSupported: source.isEvalSupported,\n" +
      "    disableCMYKToRGB: source.disableCMYKToRGB\n" +
      "  }).then(function (workerId) {\n",
  },
];

export const WORKER_PATCHES: readonly TextPatch[] = [
  {
    name: "evaluator option disableCMYKToRGB (default)",
    find: "    ignoreErrors: false,\n    isEvalSupported: true\n  };\n",
    replace:
      "    ignoreErrors: false,\n    isEvalSupported: true,\n    disableCMYKToRGB: false\n  };\n",
  },
  {
    name: "evaluator option disableCMYKToRGB (from getDocument)",
    find: "        ignoreErrors: data.ignoreErrors,\n        isEvalSupported: data.isEvalSupported\n      };\n",
    replace:
      "        ignoreErrors: data.ignoreErrors,\n" +
      "        isEvalSupported: data.isEvalSupported,\n" +
      "        disableCMYKToRGB: data.disableCMYKToRGB\n" +
      "      };\n",
  },
  {
    name: "keep CMYK fill and stroke colors",
    find:
      "            case _util.OPS.setFillCMYKColor:\n" +
      "              stateManager.state.fillColorSpace = _colorspace.ColorSpace.singletons.cmyk;\n" +
      "              args = _colorspace.ColorSpace.singletons.cmyk.getRgb(args, 0);\n" +
      "              fn = _util.OPS.setFillRGBColor;\n" +
      "              break;\n" +
      "\n" +
      "            case _util.OPS.setStrokeCMYKColor:\n" +
      "              stateManager.state.strokeColorSpace = _colorspace.ColorSpace.singletons.cmyk;\n" +
      "              args = _colorspace.ColorSpace.singletons.cmyk.getRgb(args, 0);\n" +
      "              fn = _util.OPS.setStrokeRGBColor;\n" +
      "              break;\n",
    replace:
      "            case _util.OPS.setFillCMYKColor:\n" +
      "              stateManager.state.fillColorSpace = _colorspace.ColorSpace.singletons.cmyk;\n" +
      "              if (self.options.disableCMYKToRGB) {\n" +
      "                args = _colorspace.ColorSpace.singletons.cmyk.getCmyk(args);\n" +
      "              } else {\n" +
      "                args = _colorspace.ColorSpace.singletons.cmyk.getRgb(args, 0);\n" +
      "                fn = _util.OPS.setFillRGBColor;\n" +
      "              }\n" +
      "              break;\n" +
      "\n" +
      "            case _util.OPS.setStrokeCMYKColor:\n" +
      "              stateManager.state.strokeColorSpace = _colorspace.ColorSpace.singletons.cmyk;\n" +
      "              if (self.options.disableCMYKToRGB) {\n" +
      "                args = _colorspace.ColorSpace.singletons.cmyk.getCmyk(args);\n" +
      "              } else {\n" +
      "                args = _colorspace.ColorSpace.singletons.cmyk.getRgb(args, 0);\n" +
      "                fn = _util.OPS.setStrokeRGBColor;\n" +
      "              }\n" +
      "              break;\n",
  },
  {
    name: "XRef tables also start with xref_table",
    find: "          if ((0, _primitives.isCmd)(obj, 'xref')) {\n",
    replace:
      "          if ((0, _primitives.isCmd)(obj, 'xref') || (0, _primitives.isCmd)(obj, 'xref_table')) {\n",
  },
  {
    name: "fonts keep a serialized copy of their font dictionary",
    find:
      "      var type = preEvaluatedFont.type;\n" +
      "      var maxCharIndex = composite ? 0xFFFF : 0xFF;\n" +
      "      var properties;\n",
    replace:
      "      var type = preEvaluatedFont.type;\n" +
      "      var maxCharIndex = composite ? 0xFFFF : 0xFF;\n" +
      "      var xref = this.xref;\n" +
      "      // Plain data for the whole font dictionary, references resolved\n" +
      "      // (streams are read to their end on the way).\n" +
      "      var serializeObject = function serializeObject(value) {\n" +
      "        var result;\n" +
      "        if ((0, _primitives.isName)(value)) {\n" +
      "          result = { type: 'name', value: value.name };\n" +
      "        } else if ((0, _primitives.isRef)(value)) {\n" +
      "          result = serializeObject(xref.fetchIfRef(value));\n" +
      "        } else if ((0, _primitives.isStream)(value)) {\n" +
      "          result = { type: 'stream', value: { buffer: value.getBytes(), dict: serializeObject(value.dict) } };\n" +
      "        } else if ((0, _primitives.isDict)(value)) {\n" +
      "          result = { type: 'dict', value: {} };\n" +
      "          value.forEach(function (key, entry) {\n" +
      "            result.value[key] = serializeObject(entry);\n" +
      "          });\n" +
      "        } else if (Array.isArray(value)) {\n" +
      "          result = { type: 'array', value: [] };\n" +
      "          value.forEach(function (entry, index) {\n" +
      "            result.value[index] = serializeObject(entry);\n" +
      "          });\n" +
      "        } else {\n" +
      "          result = (0, _util.isString)(value) ? { type: 'string', value: value } : value;\n" +
      "        }\n" +
      "        return result;\n" +
      "      };\n" +
      "      var serializedBaseDict = serializeObject(baseDict);\n" +
      "      var properties;\n",
  },
  {
    name: "font properties carry the serialized font dictionary",
    find: "        italicAngle: descriptor.get('ItalicAngle'),\n        isType3Font: false\n      };\n",
    replace:
      "        italicAngle: descriptor.get('ItalicAngle'),\n" +
      "        coded: false,\n" +
      "        baseDict: serializedBaseDict,\n" +
      "        isType3Font: false\n" +
      "      };\n",
  },
  {
    name: "Font keeps the serialized font dictionary",
    find: "  function Font(name, file, properties) {\n    var charCode;\n    this.name = name;\n",
    replace:
      "  function Font(name, file, properties) {\n    var charCode;\n    this.baseDict = properties.baseDict;\n    this.name = name;\n",
  },
  {
    name: "font char codes keep their unicode values (no private use area for every glyph)",
    find: "var PRIVATE_USE_AREAS = [[0xE000, 0xF8FF], [0x100000, 0x10FFFD]];\n",
    replace:
      "var PRIVATE_USE_OFFSET_START = 0xE000;\n" +
      "var PRIVATE_USE_OFFSET_END = 0xF8FF;\n" +
      "// Char codes that are moved to the private use area because canvas would\n" +
      "// shape or drop them: pairs of a first problematic code and the next\n" +
      "// unproblematic one, sorted.\n" +
      "var ProblematicCharRanges = new Int32Array([\n" +
      "  0x0000, 0x0020, 0x007F, 0x00A1, 0x00AD, 0x00AE,\n" +
      "  0x0600, 0x0780, 0x08A0, 0x10A0, 0x1780, 0x1800, 0x1C00, 0x1C50,\n" +
      "  0x2000, 0x2010, 0x2011, 0x2012, 0x2028, 0x2030, 0x205F, 0x2070,\n" +
      "  0x25CC, 0x25CD, 0x3000, 0x3001, 0x3164, 0x3165,\n" +
      "  0xAA60, 0xAA80, 0xD800, 0xE000, 0xFFF0, 0x10000\n" +
      "]);\n",
  },
  {
    name: "adjustMapping maps char codes to their unicode values where it can",
    find:
      "  function adjustMapping(charCodeToGlyphId, hasGlyph, newGlyphZeroId) {\n" +
      "    var newMap = Object.create(null);\n" +
      "    var toFontChar = [];\n" +
      "    var privateUseAreaIndex = 0;\n" +
      "    var nextAvailableFontCharCode = PRIVATE_USE_AREAS[privateUseAreaIndex][0];\n" +
      "    var privateUseOffetEnd = PRIVATE_USE_AREAS[privateUseAreaIndex][1];\n" +
      "\n" +
      "    for (var originalCharCode in charCodeToGlyphId) {\n" +
      "      originalCharCode |= 0;\n" +
      "      var glyphId = charCodeToGlyphId[originalCharCode];\n" +
      "\n" +
      "      if (!hasGlyph(glyphId)) {\n" +
      "        continue;\n" +
      "      }\n" +
      "\n" +
      "      if (nextAvailableFontCharCode > privateUseOffetEnd) {\n" +
      "        privateUseAreaIndex++;\n" +
      "\n" +
      "        if (privateUseAreaIndex >= PRIVATE_USE_AREAS.length) {\n" +
      "          (0, _util.warn)('Ran out of space in font private use area.');\n" +
      "          break;\n" +
      "        }\n" +
      "\n" +
      "        nextAvailableFontCharCode = PRIVATE_USE_AREAS[privateUseAreaIndex][0];\n" +
      "        privateUseOffetEnd = PRIVATE_USE_AREAS[privateUseAreaIndex][1];\n" +
      "      }\n" +
      "\n" +
      "      var fontCharCode = nextAvailableFontCharCode++;\n" +
      "\n" +
      "      if (glyphId === 0) {\n" +
      "        glyphId = newGlyphZeroId;\n" +
      "      }\n" +
      "\n" +
      "      newMap[fontCharCode] = glyphId;\n" +
      "      toFontChar[originalCharCode] = fontCharCode;\n" +
      "    }\n",
    replace:
      "  function isProblematicUnicodeLocation(code) {\n" +
      "    var i = 0,\n" +
      "        j = ProblematicCharRanges.length - 1;\n" +
      "\n" +
      "    while (i < j) {\n" +
      "      var c = i + j + 1 >> 1;\n" +
      "\n" +
      "      if (code < ProblematicCharRanges[c]) {\n" +
      "        j = c - 1;\n" +
      "      } else {\n" +
      "        i = c;\n" +
      "      }\n" +
      "    }\n" +
      "\n" +
      "    return !(i & 1);\n" +
      "  }\n" +
      "\n" +
      "  function adjustMapping(charCodeToGlyphId, properties) {\n" +
      "    var toUnicode = properties.toUnicode;\n" +
      "    var isSymbolic = !!(properties.flags & FontFlags.Symbolic);\n" +
      "    var isIdentityUnicode = properties.toUnicode instanceof IdentityToUnicodeMap;\n" +
      "    var newMap = Object.create(null);\n" +
      "    var toFontChar = [];\n" +
      "    var usedFontCharCodes = [];\n" +
      "    var nextAvailableFontCharCode = PRIVATE_USE_OFFSET_START;\n" +
      "\n" +
      "    for (var originalCharCode in charCodeToGlyphId) {\n" +
      "      originalCharCode |= 0;\n" +
      "      var glyphId = charCodeToGlyphId[originalCharCode];\n" +
      "      var fontCharCode = originalCharCode;\n" +
      "\n" +
      "      if (!isIdentityUnicode && toUnicode.has(originalCharCode)) {\n" +
      "        var unicode = toUnicode.get(fontCharCode);\n" +
      "\n" +
      "        if (unicode.length === 1) {\n" +
      "          fontCharCode = unicode.charCodeAt(0);\n" +
      "        }\n" +
      "      }\n" +
      "\n" +
      "      if ((usedFontCharCodes[fontCharCode] !== undefined || isProblematicUnicodeLocation(fontCharCode) || isSymbolic && isIdentityUnicode) && nextAvailableFontCharCode <= PRIVATE_USE_OFFSET_END) {\n" +
      "        do {\n" +
      "          fontCharCode = nextAvailableFontCharCode++;\n" +
      "        } while (usedFontCharCodes[fontCharCode] !== undefined && nextAvailableFontCharCode <= PRIVATE_USE_OFFSET_END);\n" +
      "      }\n" +
      "\n" +
      "      newMap[fontCharCode] = glyphId;\n" +
      "      toFontChar[originalCharCode] = fontCharCode;\n" +
      "      usedFontCharCodes[fontCharCode] = true;\n" +
      "    }\n",
  },
  {
    name: "checkAndRepair maps the cmap without a moved glyph zero",
    find:
      "      var glyphZeroId = numGlyphsOut - 1;\n" +
      "\n" +
      "      if (!dupFirstEntry) {\n" +
      "        glyphZeroId = 0;\n" +
      "      }\n" +
      "\n" +
      "      var newMapping = adjustMapping(charCodeToGlyphId, hasGlyph, glyphZeroId);\n",
    replace: "      var newMapping = adjustMapping(charCodeToGlyphId, properties);\n",
  },
  {
    name: "convert maps the glyphs without a moved glyph zero",
    find:
      "      var glyphZeroId = 1;\n" +
      "\n" +
      "      if (font instanceof CFFFont) {\n" +
      "        glyphZeroId = font.numGlyphs - 1;\n" +
      "      }\n" +
      "\n" +
      "      var mapping = font.getGlyphMapping(properties);\n" +
      "      var newMapping = adjustMapping(mapping, font.hasGlyphId.bind(font), glyphZeroId);\n",
    replace:
      "      var mapping = font.getGlyphMapping(properties);\n" +
      "      var newMapping = adjustMapping(mapping, properties);\n",
  },
  {
    name: "DeviceCmykCS.getCmyk",
    find: '    _createClass(DeviceCmykCS, [{\n      key: "getRgbItem",\n',
    replace:
      "    _createClass(DeviceCmykCS, [{\n" +
      '      key: "getCmyk",\n' +
      "      value: function getCmyk(src) {\n" +
      "        return new Uint8Array(src.map(function (value) {\n" +
      "          return 100 * value;\n" +
      "        }));\n" +
      "      }\n" +
      "    }, {\n" +
      '      key: "getRgbItem",\n',
  },
];

/** Applies patches in order; throws when one doesn't match exactly once. */
export function applyPatches(source: string, patches: readonly TextPatch[]): string {
  let text = source;
  for (const patch of patches) {
    const first = text.indexOf(patch.find);
    if (first < 0) throw new Error(`pdf.js patch "${patch.name}" doesn't match`);
    if (text.indexOf(patch.find, first + 1) >= 0)
      throw new Error(`pdf.js patch "${patch.name}" matches more than once`);
    text = text.slice(0, first) + patch.replace + text.slice(first + patch.find.length);
  }
  return text;
}
