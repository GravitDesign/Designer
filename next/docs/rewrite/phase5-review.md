# Phase 5 review, group E

Scope: clusters io-export-svg, io-export-pdf, io-export-bitmap, io-import-svg, io-import-pdf-eps and io-import-sketch from port-map.tsv; the new io-gvdesign code (next/src/io/gvdesign/); the workers in next/src/workers/ (pdf-export, pdf, ps, raster, zip-encoder) against public/*.worker.js and public/ps*.js; and the interim parity hooks in next/src/parity/app/ (document.ts, corpus.ts, import-export.ts, svg-import.ts, sketch-import.ts, pdf-eps-import.ts). BUG-007 (textures in exports) and BUG-008 (EPS JPEG images, COOP/COEP headers) are being fixed in parallel and are left out.

Summary: 1 high, 27 medium, 31 low. The ports follow the old code closely, branch for branch. The one behaviour difference users can hit is R5-E-501: PDF import strips weight names from embedded font names in the wrong order, so "…ExtraBold" fonts no longer map to their Google family. None of the parity hooks fake anything: each one runs the real importer, exporter or gvdesign code and mirrors its old-hooks.js. The biggest gap is coverage. io-export-svg.json and io-export-pdf.json in parity/ported are empty, every import-export suite runs with `newApp: false`, and io-export-bitmap lists only two meta scenarios. So SVG, PDF and bitmap export output has never been compared with the old app in a browser (R5-E-001, R5-E-201, R5-E-301). The second recurring problem is kept quirks that the code says are in QUESTIONS.md when they are not (R5-E-105, 106, 303, 403, 601, 604). The port-map.tsv rows for io-import-sketch, and three rows filed under io-import-pdf-eps, name files that don't exist (R5-E-504, R5-E-603).

Numbering by area: 001-099 SVG export, 101-199 PDF object model and writer, 201-299 PDF canvas and render, 301-399 bitmap export, zip and raster workers, 401-499 SVG import, 501-599 PDF/EPS import and the pdf.js/PostScript workers, 601-699 Sketch import, 701-799 gvdesign and the document/corpus hooks.

## io-export-svg

Scope: old modules 438, 852, 1148, 1149, 1202, 1235, 1236, 1237, 1455-1467 of
public/chunk.vendor.js against next/src/io/export/svg/** and
next/src/io/export/export-compat.ts, plus the SVG part of
next/src/parity/app/import-export.ts. Texture/pattern fill export left out
(BUG-007).

What I did: walked every old function (all 27 GSVGExport statics, the filter
builder, the four filter writers, GSVGContext, GSVGPaintCanvas,
GSVGPaintContext, the masks, gradients, style map, render context, post
process, SVG text core/render context and the word/line/paragraph module)
against the port, including the minified variable scoping (hoisted `var`s
that shadow module imports in exportImage, renderNode, renderPage,
setCommonStrokeStyles, drawText; none of them changes behaviour) and the
GUtil helpers the old code called (extend, each, map). Ran
`npx vitest run src/io/export/svg/svg-export.test.ts src/io/export/svg/svg-dom.test.ts`:
40/40 pass.

Overall the port is close to line-by-line: DOM operation order, id
generation order, attribute order, number formatting (including the
detached `formatNumber` that always rounds to 3 places) and the kept quirks
match. Findings below are the few real differences and the large untested
areas.

### R5-E-001 (medium): no SVG export parity scenario runs on the new app

- Old: the export matrix and corpus exports (next/parity/scenarios/import-export/export-cases.ts:193-290, corpus-export.spec.ts:62) record old-app SVGs.
- New: next/parity/ported/io-export-svg.json is `[]`, and every import-export suite is registered with `newApp: false` (export-engine.spec.ts:131, corpus-export.spec.ts:128). So none of `svg/page-default`, `svg/text`, `svg/effects`, `svg/image`, `svg/custom-bg`, ... is ever compared against the port in a browser.
- What differs: the only check is the Node unit test (svg-export.test.ts) with 37 cases recorded from the old app, run with a fake canvas. Everything that depends on the real browser (BitmapExport raster fallbacks are replaced by their media type in the normalizer, real font metrics in text layout, Chrome CSSOM) is not compared at all.
- The hook itself is honest: next/src/parity/app/import-export.ts:136-152 drives the real Exporter.exportExportable, which calls the real SvgExport (exporter.ts:323-343, index.ts:43); svgUnsupportedFeatures (import-export.ts:194-197) calls the real SvgExport.getUnsupportedFeatures. Nothing is faked.
- Fix: add the `svg/*` ids of export-cases.ts (and the corpus SVG ids once the corpus is enabled) to parity/ported/io-export-svg.json and run them.

### R5-E-002 (medium): image export is untested (exportImage, image dictionary, image masks)

- Old: chunk.vendor.js:255963-256127 (exportImage), 241841-241883 (createImageElement).
- New: svg-export.ts:1392-1519, svg-images.ts:149-183.
- What differs: nothing found by reading, but no case in testing/svg-export-cases.ts creates a GImage. The recorded JSON has 0 `<use` elements and the 4 `<image` elements are all raster fallbacks. Untested: `<use>` of the shared `img_<key>` image and the trailing `<defs>` written in done(), the non-dictionary `<image>` with `xlink:href` data URL, the rotation unrotate/rotate around getGeometryBBox, the "m"/"!m" image masks with the feColorMatrix filter and the white rect, the frame repaint with fills cleared and restored, the filter/mask regrouping from the last `<defs>`, and an image with no canvas (element removed). This is the svg/image scenario of the parity matrix (FMT-EXPORT-013), which isn't enabled either.
- Fix: add cases with a dictionary image, a data-URL image, a rotated image, an image with `_sbl` "m" and "!m", an image with a border and a drop shadow, and `useImageDictionary: false`.

### R5-E-003 (medium): composite-operation paths are untested (destination-in/out, source-in, nested canvases)

- Old: chunk.vendor.js:255722-255809 (processPath source-in, destination-in, destination-out), 255814-255876 (renderExportCanvas), 244571-244595 (createMaskDefinition), 257071-257074 and 257223-257242 (GSVGContext _duplicateLastPath, drawImage).
- New: svg-export.ts:1102-1191, 1202-1277; svg-masks.ts:80-107; svg-context.ts:131-136, 315-335.
- What differs: nothing found by reading, but the recorded JSON contains no `-1000%` (destination-out mask), no `_pattern_` (source-in on a paths graph and gradient border markers) and no nested canvas group. No case uses a GPathsGraph, a blend that paints through a sub-canvas, or an inside/outside border on a non-native shape (rounded rect, path), which is where the paint code composites with destination-in/out.
- Fix: add cases for a rounded rectangle and a path with inside and outside borders, a paths graph with a gradient fill (source-in), and an element whose paint goes through drawCanvas.

### R5-E-004 (medium): source-in restyling relies on an untested CSSOM emulation that likely differs for dash arrays

- Old: chunk.vendor.js:255746-255751: `t.style && t.style.stroke && "none" !== t.style.stroke && (t.style.stroke = d);` on a browser SVG element, so Chrome re-serializes the whole style attribute.
- New: svg-export.ts:1125-1133 writes `child.style.stroke = fill`; svg-dom.ts:378-394 rebuilds the attribute as `name: value;` joined by spaces, normalizing only colors and `url(...)` (normalizeCssValue, svg-dom.ts:398-435).
- What differs (likely, not verified in a browser): the recorded path styles come from SvgPaintContext.getSvgStyle, which writes `stroke-dasharray` as the array's toString (`4,4`) and can write invalid values such as `stroke-width:undefined`. Chrome serializes a comma list as `4, 4` and drops invalid declarations; the emulation keeps `4,4` and keeps the invalid declaration. svg-dom.test.ts:64-83 only checks colors and urls. This branch only runs for a GPathsGraph with a source-in step, which no case covers (R5-E-003).
- Fix: record a Chrome output for a dashed, gradient-filled paths graph and extend normalizeCssValue (comma lists, numbers, dropping invalid declarations) until it matches; add that string to svg-dom.test.ts.

### R5-E-005 (medium): text export branches beyond plain runs are untested

- Old: chunk.vendor.js:257370-257407 (drawMarker), 257449-257497 (text on path), 257442-257447 (fullFFName), 257677-257697 (ligatures, frac, stylistic set, locl and `lang`), 256128-256135 (_shouldConverTextToPath: `dir`, fake text).
- New: svg-tl-render.ts:197-214, 252-314, 242-250; svg-text-attributes.ts:201-220; svg-export.ts:1522-1529.
- What differs: nothing found by reading. Cases textPlain, textAuto, textStyled, textCurves, textTwoFills cover runs, decorations, spacing, a solid border and a gradient fill. Not covered: list markers (bullets or numbers, with a gradient fill which goes through createSvgLinearGradient into the shared `<defs>`), text on a path (one `<text>` per glyph from the path transformer), a gradient border, `fullFFName`, `textLocalizedForm` (the `lang` attribute and `"locl"`), stylistic sets and fractions, `ligatures: "auto"` with letter spacing, a `dir` text and a fake text being outlined, justified text (no merging).
- Fix: add text cases for each of these to svg-export-cases.ts and record them.

### R5-E-006 (medium): clipping containers, slices, symbols and page gradients are untested

- Old: chunk.vendor.js:256282-256314 (clipping a container's children with its own shape, the white helper fill, outline copies when the shape has a border), 255903-255906 (slice target and its class as background), 256400-256408 (gradient page background), 256382-256399 (angular page background raster).
- New: svg-export.ts:1699-1723, 1324-1327, 1822-1830, 1799-1821.
- What differs: nothing found by reading. The only container with children in the cases is a GCompoundPath with a fill, so the `whiteFill` branch (container without fill and border gets a temporary white fill that is removed again) and the `hasStyleBorder` outline copies never run. No case exports a GSlice, a GSymbol, or a page with a gradient or angular background.
- Fix: add cases for a rectangle without fill and border holding children, the same with a border, a slice with a class, a symbol instance, and pages with linear and angular backgrounds.

### R5-E-007 (low): SvgTextWord drops undefined init values, the old Word kept them

- Old: chunk.vendor.js:257550-257552 `function y(e) { l.extend(this, e); }` with `l = i(11)` (GUtil). GUtil.extend (chunk.vendor.js:2502-2511) copies every own key, undefined included: `n !== l && arguments[a].hasOwnProperty(s) && (n[s] = ... l)`.
- New: svg-text-attributes.ts:107-112: `// jQuery.extend skipped undefined values, so those keep the defaults.` and `if (void 0 !== init[key]) ...`.
- What differs: a word made with `lineWidth: undefined` (text without a border, svg-tl-render.ts:332-334), or any other undefined field that has a prototype default (charSpacing, textLigatures, textUnderline, ...), now reads the default (0, false, null) where the old one read undefined. merge() compares these fields with `===`, so a word with undefined and one with the default would now merge where the old code wrote two `<text>` elements. With the current run drawing (run-draw.ts:233-241) the fields are always set the same way within one text, so I found no input that shows it, but the comment is wrong about the old code.
- Fix: copy all own keys like GUtil.extend (`Object.assign(this, init)` gives the same result for a plain object literal) and fix the comment.

### R5-E-008 (low): SvgPaintCanvas now runs the GPaintCanvas constructor, which needs a DOM canvas

- Old: chunk.vendor.js:256436-256444: the GSVGPaintCanvas constructor never calls GPaintCanvas (`n.inherit(h, a)` without `a.call(this)`), so no 2D context is created.
- New: svg-paint-canvas.ts:29-37 calls `super()`, i.e. paint-canvas.ts:434-445, which calls RenderScheduler.getRenderer and so `document.createElement("canvas")` (render-scheduler.ts:223) for every SVG canvas, including every sub-canvas from createCanvas.
- What differs: an extra canvas element per SVG canvas, and the exporter needs `document`; svg-dom.ts:9-10 says the exporter "also runs in workers and in Node tests", which only holds with the fake canvas the test installs.
- Fix: either set `this._canvasContext` before anything reads it without calling the base allocation (a protected base-constructor flag), or correct the svg-dom.ts header.

### R5-E-009 (low): gradientAsSVG throws the fill message for a stroke style

- Old: chunk.vendor.js:244691 `o.strokeStyle.asSVG(a, 1)` (TypeError "o.strokeStyle.asSVG is not a function" for an angular gradient), 256403 `.paint.asSVG(...)`.
- New: svg-paint-context.ts:40 always throws `"o.fillStyle.asSVG is not a function"`.
- What differs: only the error text, for an angular (or other non-linear, non-radial) gradient border that reaches the paint context, which happens with `rasterizeUnsupportedObjectsByCDR: false`.
- Fix: pass the property name in, or drop the claim of an exact message.

### R5-E-010 (low): SvgContext.drawImage ignores null instead of throwing

- Old: chunk.vendor.js:257224 `if (e._canvasContext)` throws a TypeError for a null image.
- New: svg-context.ts:316-317 `if (!source || !source._canvasContext) return;`.
- What differs: a null argument is silently ignored. drawCanvas never passes null, so no user effect.
- Fix: drop the `!source ||` guard or note it as a deliberate deviation.

### R5-E-011 (low): stale comment and leftover placeholder variable

- New: next/src/parity/app/import-export.ts:13-14 says svgUnsupportedFeatures and pdfIsSupported "throw while the SVG and PDF exporters are not in the registry"; both are registered (io/export/index.ts:41-45), so the throws at lines 195 and 200 are dead.
- New: svg-export.ts:1663-1665 creates a `<g>` for a GPath only to `void contentGroup;` (the old code, chunk.vendor.js:256245, also created it unused). Reusing the scene's contentGroup variable for it makes the scene branch harder to read.
- Fix: update the header comment; give the path placeholder its own commented line (or drop it, since createSvgElement has no side effects on the document).


## io-export-pdf, PDF object model and document writing

Scope: every io-export-pdf module except pdf-canvas, pdf-export, pdf-tl-render,
pdf-paint-context, pdf-canvas-bridge, border-painter, raster-fallback,
master-page-processor and effects/*, plus next/src/workers/pdf-export/ against
public/pdfexport.worker.js (entry module 1366).

Method: walked each old module (public/chunk.vendor.js ranges from
old-module-index.tsv) against its new file. Modules checked function by
function: 90, 182, 197, 293, 338, 359, 390, 391, 440, 559, 560, 564, 602, 799,
800, 801, 850 (byte buffer, for offsets), 853-856, 1109-1111, 1119, 1143-1147,
1215, 1217-1234, 1407-1443, 1447, 1450, 1452, and worker module 1366. Ran
pdf-writer.recorded.test.ts, pdf-document.test.ts, info.test.ts and
handler.test.ts: 21 tests pass.

Result: the object model and writer are a close port. Number formatting
(normalizeNumber toFixed(4)/parseFloat, toHex padding), string escaping (text
form escapes only backslash and parentheses; byte form also \b \t \n \f \r),
UTF-8 token encoding through encodeURIComponent, dictionary key order, xref
offsets and row format, trailer /Size, object numbering and write order, WinAnsi
table (compared programmatically: identical 0-127, 160-255 and the 27
specials), Identity-H encoding with kerning splits, /W runs, ToUnicode CMap
text, font descriptor metrics, deflate (pako 1.0.11 on both sides), XObject,
group, soft mask, ExtGState, shading, function and pattern dictionaries all
match. The old GUtil.extend / GUtil.each / inheritAndMix semantics were checked
where the port replaced them (own properties only, toString not mixed in,
forEach order). Bluebird was replaced by native Promise; that is an accepted
deviation (PORT-PLAN.md a1114) and changes no output.

No high findings. What remains are untested branches, one tiny iteration
difference, and quirks that are kept but not written down where the code says
they are.

### R5-E-101 (medium): CFF (CID-keyed) font embedding is untested

- Old: public/chunk.vendor.js:252911-252931 (module 1431, the `n.isCIDFont` branch of the CID font constructor) and 252763-252790 (module 1428, `t._openTypeFont.isCIDFont` skips the FontFile2 stream).
- New: next/src/io/export/pdf/cid-font-type.ts:78-95, next/src/io/export/pdf/font-factory.ts:26-31.
- What differs: nothing in the code; both sides read the CFF table with parseTableEntries, put it deflated as /FontFile3 with /Subtype /CIDFontType0C, rename the font to `<PostScript>-Identity-H` in three places, switch the descendant to /CIDFontType0 and drop /CIDToGIDMap. The recorded writer test only embeds OpenSans (TrueType), and none of the nine recorded export documents contains FontFile3 or CIDFontType0C (checked by decoding pdf-export.old-outputs.json). The key order after the rename (/FontFile3 and /FontName appended or replaced in the descriptor, /CIDToGIDMap removed from the middle of the descendant) is the kind of thing that only a recorded byte comparison catches.
- Fix: add a case to fontProgram in test-programs.ts with a CID-keyed CFF font (the repo already has a Noto CJK fixture, see next/src/engine/text/opentype/__fixtures__/outlines-noto-cjk.json for the font it came from), record it in the old app and compare the skeleton as for OpenSans.

### R5-E-102 (medium): ToUnicode block split and astral code points are untested

- Old: public/chunk.vendor.js:252957-252982 (module 1431 `_updateUnicode`): `t = Math.min(100, i.length - o)` and the `e < 65536` / surrogate branch of the hex helper.
- New: next/src/io/export/pdf/cid-font-type.ts:133-157.
- What differs: nothing; but the recorded font test uses a handful of short texts, so it never reaches 100 glyphs (no second `beginbfrange` block, no `endbfrange` between blocks) and never maps a glyph above U+FFFF. Both branches build CMap text by hand, and an off-by-one or a changed separator would change every PDF with a longer text.
- Fix: extend fontProgram with a text of more than 100 distinct glyphs (OpenSans has enough) and, if a test font with an astral glyph is at hand, one such glyph; record in the old app.

### R5-E-103 (medium): standard Type 1 font path is untested

- Old: public/chunk.vendor.js:252774-252775 (module 1428: `s.isStandardFont(t.getFamily())` → `new s(i, t.getFamily())`), 253340-253380 (module 1435).
- New: next/src/io/export/pdf/font-factory.ts:22-23, next/src/io/export/pdf/type1-font.ts:129-148.
- What differs: nothing in the code. A font whose family is exactly one of the 14 base names (for example a user font called "Courier" or "Helvetica") is written as a non-embedded /Type1 with /WinAnsiEncoding, and its text goes through PDFWinAnsiEncoding instead of Identity-H, ignoring the shaping options. No unit or recorded test creates a PDF font through this path (no /Type1 in either fixture).
- Fix: in fontProgram (or a new small program), create an OpenTypeFont with family "Helvetica" from the OpenSans bytes, write one word, and record the result in the old app.

### R5-E-104 (low): arrays with holes are iterated differently

- Old: public/chunk.vendor.js:37791-37796 (module 182 `push`) and 55807-55812 (module 293 `add`) iterate with GUtil.each, which is `Array.prototype.forEach` (2529-2533) and skips holes.
- New: next/src/io/export/pdf/pdf-array.ts:50 and next/src/io/export/pdf/content-stream.ts:253 use `for (const item of value)`, which visits holes as undefined.
- What differs: for a sparse array (`[1, , 3]`) the old array gets two entries, the new one three, the middle one written as the text `undefined`. I found no caller in scope that passes a sparse array (dash arrays, matrices, encode/bounds lists are dense), so no output changes today.
- Fix: use `value.forEach((item) => this.push(item))` in PDFArray.push and `object.forEach((item) => this.add(item))` in PDFGraphics.add to keep the old semantics.

### R5-E-105 (low): media-box comment points at a QUESTIONS.md entry that doesn't exist

- Old: public/chunk.vendor.js:253500-253507 (module 1440 writes `[top left width height]`), 253450-253455 (module 1439 `setBleedBox` passes x, y, width, height).
- New: next/src/io/export/pdf/media-box.ts:10-11 says "the bleed box doesn't (kept, see QUESTIONS.md)".
- What differs: behaviour matches. But QUESTIONS.md has no entry about the media or bleed box (searched for media box, bleed, BleedBox). The kept bug is user-visible: with a bleed the /BleedBox is written as `[-b -b w+2b h+2b]` where PDF expects the upper right corner, so the bleed box ends up smaller than the trim area in other tools.
- Fix: add a QUESTIONS.md entry (old location, what is written, why it is kept, which recorded case pins it: shapes-bleed in pdf-export.old-outputs.json) and reference its id from media-box.ts.

### R5-E-106 (low): other kept writer quirks are only in code comments

- Old / new:
  - ToUnicode lead surrogate not floored: public/chunk.vendor.js:252964-252968 / next/src/io/export/pdf/cid-font-type.ts:139-143. For U+1F600 both write `[<d83d.8de00>]`, which is not valid hex, so copy and paste of such glyphs breaks.
  - /Length1 is the compressed length: 252857-252866 / next/src/io/export/pdf/font-stream.ts:112-124.
  - Page contents always deflated, compress flag ignored: 252674-252698 / next/src/io/export/pdf/object-store.ts:227-253.
  - Header ignores the version option: 253532-253543 and 252268 / next/src/io/export/pdf/header.ts, pdf-document.ts:141.
- What differs: nothing; each is kept on purpose and explained in a comment, but QUESTIONS.md, which the brief names as the list of kept quirks, has none of them.
- Fix: add one QUESTIONS.md entry per quirk (or one grouped "PDF writer quirks" entry) so the later "fix old bugs" pass finds them.

### R5-E-107 (low): quadraticCurveTo without a previous point is untested

- Old: public/chunk.vendor.js:241429-241447 (module 1147: the branch that calls the non-existent `this._x`, so it throws a TypeError).
- New: next/src/io/export/pdf/path-writer.ts:38-52 keeps it on purpose (calls the missing `_x` through a cast).
- What differs: nothing. But no test pins that it throws (or what an export does when a path starts with a quadratic curve), so a later clean-up could "fix" it silently and change output.
- Fix: add a unit test that a fresh PDFPath throws a TypeError on quadraticCurveTo, and one that it raises the curve to a cubic after a moveTo (check the six numbers against the 2/3 formula).

#### Checked and equal (no finding)

- Worker (next/src/workers/pdf-export/handler.ts vs pdfexport.worker.js module 1366): same checks in the same order with the same error texts, same answer shapes and transfer lists, same CMYK profile loading once with the rejection left unhandled. Only the ICC base path is absolute ("/assets/data/icc/"), documented in protocol.ts; the Electron build serves from http://127.0.0.1:port, so it resolves the same. The old worker accepted any key of the color-space table (including `_cmykToRGB`); the new one only the four spaces. Not reachable from the exporter.
- Uncompressed font streams (PDFRawBuffer over an ArrayBuffer) would break offsets on both sides (ByteBuffer.writeArray reads `.length`), but the exporter always passes compress: true (pdf-export.ts:427).
- The font cache is an array in the old body and an object in the new one; only `Object.keys(...).length` and keyed lookups are used, so names F0, F1, ... are the same.


## PDF export, canvas side (io-export-pdf)

Scope: pdf-canvas.ts (old 1216), pdf-export.ts (1406), pdf-paint-context.ts (1444),
pdf-canvas-bridge.ts (1445), pdf-tl-render.ts (1446), effects/drop-shadow.ts (1448),
effects/inner-shadow.ts (1449), raster-fallback.ts (1451, plus PDFRect.tile 1452),
border-painter.ts (1453), master-page-processor.ts (1454), text-writer.ts (1223),
path-writer.ts (1147), path-commands.ts (1420), marked-content.ts (1219). I also read
export-compat.ts (1235) because it makes the raster decisions, and the PDF branch of
exporter.ts against designer.browser.dev.js:80606-80649.

Summary: I walked every old function of these modules against the new code. The port is
faithful: argument defaults, branch order, the floating-point order of the transform
math (page origin, text matrices, bitmap placement), graphics-state creation, soft masks,
the bitmap cache, marker-based replacement, the worker/non-worker image split, tile
sizes, slice background swap and restore, bleed box, progress formula and the error
callback all match. Kept old quirks are there on purpose and commented (inner shadow
vector branch dead because nodes have no `$pat`; border painter passing itself as vertex
source when not sharp; `$_bl !== BlendMode` always true; PDFPath `_x`/`_y` missing). The
unsharp border-painter call is unreachable in PDF export anyway: Shape only takes that
branch when `context.canvas.hasClip()`, and PDFCanvasContext has no `clip` method, so
hasClip is always false.

The parity hook next/src/parity/app/import-export.ts does not fake the PDF path:
exportExportable goes through Exporter.exportExportable, which calls the real
PDFExport.export with the same option object as the old GExporter (minus the PRO
watchDog, documented), and pdfIsSupported calls PDFExport.isSupported. The problem is that
no PDF scenario runs against the new app (R5-E-201), so the hook is wired but unused.

No high findings. The mediums are coverage gaps on new code; the lows are one small
verified difference in export-compat and code-quality nits.

### R5-E-201 (medium): no PDF parity scenario runs against the new app

- Old location: n/a (scenarios were recorded in the old app).
- New location: next/parity/ported/io-export-pdf.json:1 (`[]`);
  next/parity/scenarios/import-export/export-engine.spec.ts:127-132;
  next/parity/scenarios/import-export/corpus-export.spec.ts:127-129.
- What differs: the PDF cases of the export matrix (pdf/page-72dpi, pdf/effects-150dpi,
  pdf/effects-ignored, pdf/cmyk, pdf/text, pdf/text-curves, pdf/image,
  pdf/image-downsample-q25, pdf/multipage, pdf/bleed, pdf/selection-custom-bg) and the
  52-file corpus export all run with
  ```ts
  paritySuite("import-export export matrix", ..., { newApp: false });
  paritySuite("import-export corpus exports", ..., { newApp: false });
  ```
  and io-export-pdf.json lists no ported ids. The only checks on the new code are the
  Vitest files pdf-export.test.ts (isSupported, missing callback, slice + progress) and
  pdf-export.recorded.test.ts, whose PDF_TEST_CASES (test-scenes.ts:22-42) only build the
  "shapes", "borders" and "multipage" documents. So shadows, raster fallback, text
  (PDFTLRender), images (drawImage, JPEG, downsampling, masks), the worker encode path,
  master pages, paths graphs and border markers have never been compared with the old
  output on the new code. Everything below in this file follows from that.
- Fix: switch the export matrix to `newApp: [<pdf/* ids>]` (the hook is ready; outputs are
  normalized and rendered with pdf.js already) and add the ids to io-export-pdf.json. For
  the corpus, enable at least effects-shadows, effects-extra-shadows,
  effects-blur-overlay-mirror, effects-large, blend-modes, borders-markers, paths-graph,
  pages-master, pages-master-odd-even, text-on-path, text-lists, text-character-styles,
  images and masks for the PDF format.

### R5-E-202 (medium): PDFTLRender branches for text on a path, list markers and underline/strikeout are untested

- Old location: public/chunk.vendor.js:253814-253877 (drawMarker), 253948-254011 (path
  transformer branch of drawText), 254032-254048 (underline, strikeout).
- New location: next/src/io/export/pdf/pdf-tl-render.ts:159-206, 260-327, 349-388.
- What differs: nothing found by reading; these branches carry the trickiest numeric code
  of the port (per-glyph origin `Y = (Y = L._source._transform.decomposed().translate
  .multiplied(L._transform)).translated(0, 2 * -Y._ty)` followed by in-place `_shx`/`_shy`
  negation, `relativeY` on the text matrix, strikeout position from
  `getStrikeoutPosition(-q.getY(), a, J, I)`), and no unit test or new-app scenario reaches
  them. The parity "text" document (page-lib.ts:178-201) has one plain line and one
  two-fill text that goes to the convert-to-path branch, so only the plain drawText path
  is used, and only in the old app.
- Fix: add recorded Vitest cases (old outputs recorded the same way as
  pdf-export.old-outputs.json) for a text on a path, a bulleted list, and a run with
  underline and strikeout, each with fill only, border only and both (mode FILL/STROKE/BOTH
  changes `Tr` and the decoration fill/stroke).

### R5-E-203 (medium): the sharp drop shadow (vector branch) and inner shadows on images are untested

- Old location: public/chunk.vendor.js:254144 (branch test), 254231-254246 (vector
  shadow), 254280 (`t instanceof h || t.hasStyleFill()`), 251792-251795 (image paint skipped
  when rasterized).
- New location: next/src/io/export/pdf/effects/drop-shadow.ts:109, 171-191;
  effects/inner-shadow.ts:50; pdf-export.ts:208.
- What differs: nothing found by reading. Only blurred shadows exist in test documents
  (page-lib.ts:207 drop shadow r 5, :217 inner shadow r 4), so the `$r == 0` path (shape
  filled again with `cm 1 0 0 1 x -y` and the fill opacity multiplied by the first fill
  layer's `$_op`) and an inner shadow on an image never run on the new code.
- Fix: add a recorded case with a rectangle with a sharp drop shadow (r 0, with and without
  fill-layer opacity) and an image with an inner shadow.

### R5-E-204 (medium): raster fallback decisions beyond the plain case are untested

- Old location: public/chunk.vendor.js:251605-251633 (page bitmap for nodes affected by
  the background), 254524-254535 (tile size, mirror/overlay disable tiling),
  254536-254571 (tiled export), 254595-254613 (PDFRect.tile).
- New location: next/src/io/export/pdf/pdf-export.ts:517-539;
  raster-fallback.ts:69-127; pdf-rect.ts.
- What differs: nothing found by reading, but three decision branches have no coverage on
  the new code:
  - Custom (WebGL) blend modes and background fills take the page-bitmap branch:
    the whole page is rendered once (`if (!pageBitmap)`) and cut with `replaceWithBitmap(...,
    pageArea, box)`. The bitmap is cached per exported page, not per `getPage()`, so a node
    on a master page reuses whatever page was rendered first, exactly as in the old
    `_ || (_ = A.export(t.getPage(), ...))`. Worth a test because it is easy to "fix" by
    accident.
  - Nodes over 1024 px at 72 dpi (fewer at higher dpi) are exported in tiles through
    `createExecutor(0)` and reassembled; mirror and overlay effects switch tiling off.
  - The `Proxy` that hides `$_stop`/`$_sbl` relies on the engine reading those fields
    directly (element-stylable.ts:166, 215, 223 do), so a later refactor to getProperty
    would silently bake opacity into the bitmap.
- Fix: add Vitest cases (they need a canvas; the recorded tests already run images
  through test-programs.ts) for a node with a custom blend mode, a node with a background
  fill, a blurred node larger than 1024 px, and one with a mirror effect; or enable the
  corpus files blend-modes, effects-large and effects-blur-overlay-mirror for the new app.

### R5-E-205 (medium): master pages in the compatibility processor are untested

- Old location: public/chunk.vendor.js:254777 (`e instanceof n && this._processMasterPages(e)`),
  254811-254823.
- New location: next/src/io/export/pdf/master-page-processor.ts:28, 59-68.
- What differs: nothing found by reading. Nodes on master pages are collected (and
  rasterized when incompatible) while the page is processed, and `isVectorable` then marks
  their proxies `_needToRaster`. None of the new-code tests has a master page.
- Fix: add a recorded case with a page using a master page that holds one vector shape
  and one shape with an angular gradient, so both the vector path and the marker
  replacement inside the master content are checked.

### R5-E-206 (medium): paths-graph borders in the PDF context are untested

- Old location: public/chunk.vendor.js:243145-243163 (_makeFillStyle), 243625-243635
  (stroke with the border layer paint), 243751-243753 (fillRect SourceIn), 251862-251894
  (PathsGraph and PGEdge proxies).
- New location: next/src/io/export/pdf/pdf-canvas.ts:143-159, 699-710, 855-856;
  pdf-export.ts:281-311.
- What differs: nothing found by reading. This path pops graphics until the last PDFPath,
  refills with the border pattern, multiplies the shape paint transform by `$trf`, and the
  PGEdge proxy forwards every own field to the source with accessors. No test document
  contains a paths graph.
- Fix: add a recorded case with a paths graph (solid border and gradient border) or
  enable the corpus file paths-graph.gvdesign for the new app.

### R5-E-207 (medium): error and abort paths of PDFExport.export are untested

- Old location: public/chunk.vendor.js:251549-251550, 251589-251648, 251652-251661,
  251685-251689.
- New location: next/src/io/export/pdf/pdf-export.ts:443-449, 452-553, 556-568.
- What differs: same behaviour as the old code, including two traps nobody tests:
  - An exception from `proxy(node).paint(context)` passes through the `finally` (which
    still finishes the page or starts the raster jobs) and then out of the `setTimeout`
    in exportEach, so the callback is never called and the dialog waits forever. Only
    errors inside raster jobs and the final write reach `fail`.
  - After `document.abort()`, exportNode and the raster loop return without calling
    `done()` or `job.done()`, so the callback is never called either; the exporter's
    messenger.close (exporter.ts:369-373) only runs if something does call it.
- Fix: add Vitest cases for a raster job that rejects (callback gets the error,
  `document.finish` ran), an abort between two pages (no callback, no further pages), and
  a node whose paint throws (document the hang in QUESTIONS.md as a kept quirk, since
  the old app hangs the same way).

### R5-E-208 (low): ExportCompat reads committed property values where the old code read the live fields

- Old location: public/chunk.vendor.js:244494, 244500, 244505, 244524
  ```js
  return A.isUnsupportedPattern(e.$_pt);
  if (A.isCustomBlendMode(e.$_sbl)) return !0;
  return A.isCustomBlendMode(e.$_bl);
  return e.$_pt instanceof a;
  ```
- New location: next/src/io/export/export-compat.ts:63, 70, 76, 106
  ```ts
  .some((layer) => ExportCompat.isUnsupportedPattern(layer.getProperty("_pt")));
  if (ExportCompat.isCustomBlendMode((node as PropertiesNode).getProperty("_sbl"))) return true;
  .some((layer) => ExportCompat.isCustomBlendMode(layer.getProperty("_bl")));
  .some((layer) => layer.getProperty("_pt") instanceof Background);
  ```
- What differs: getProperty (node-properties.ts:139-145) returns the `#` backup while a
  temporary value is set, and `undefined` instead of the prototype default for a property
  the node doesn't own. The `$` field is the live value. Prototype defaults are never
  custom or unsupported, so only temporaries matter: during a live preview (temporary
  blend mode or fill) the old code decided rasterization from the previewed value, the
  new one from the committed value, while the paint itself (element-stylable.ts reads
  `$_sbl`) uses the previewed one. Rare, but a PDF exported mid-preview could keep a
  WebGL blend mode as a PDF blend mode (or rasterize a node that no longer needs it).
- Fix: read the fields like the old code (`(node as { $_sbl?: unknown }).$_sbl`,
  `layer.$_pt`, `layer.$_bl`), or pass `temporary = true` to getProperty, which returns the
  live value.

### R5-E-209 (low): Anchor edge proxies swallow a null edge list the old code threw on

- Old location: public/chunk.vendor.js:251833-251842
  ```js
  return this.__source__.getOutEdges().map(function (e) { return t.proxy(e); });
  ```
- New location: next/src/io/export/pdf/pdf-export.ts:246-253
  ```ts
  return (this.__source__ as unknown as Anchor).getOutEdges()?.map((edge) => self.proxy(edge));
  ```
- What differs: with `_outEdges`/`_inEdges` null (the GAnchor prototype default,
  anchor.ts:54-55) the old proxy threw a TypeError and the new one returns undefined.
  PGAnchor always sets arrays (pg-anchor.ts:104-105), so I found no reachable case; it is a
  silent deviation from "keep thrown errors".
- Fix: drop the `?.` (cast instead), or add a comment that the null case is unreachable.

### R5-E-210 (low): small code-quality nits in pdf-canvas.ts, pdf-export.ts and pdf-tl-render.ts

- Old location: public/chunk.vendor.js:253782 (`GPDFTLRender.prototype._putVertices`).
- New location: next/src/io/export/pdf/pdf-canvas.ts:912-913; pdf-export.ts:72-73;
  pdf-tl-render.ts:99-100.
- What differs:
  - pdf-canvas.ts ends with `export type PDFContextNode = Node;` "keeps the import used",
    but `Node` is already used by replaceWithBitmap (line 297), so the alias is dead.
  - pdf-export.ts has two doc comments in a row for PDFExportCallback
    (`/** Called with an error, ... */` then `/** With the default writer ... */`); only
    the second attaches.
  - The old override `_putVertices` (returning a PDF path) is renamed `_putPDFVertices`
    because the base method returns a line count. Correct today, since drawMarker and
    drawText (the only base callers, tl-canvas-context.ts:445, 562, 581) are overridden,
    but the public name changed and a base-class caller added later would get canvas
    vertices instead of a PDF path.
- Fix: delete the alias; merge the two comments; keep the rename but say in the comment
  which base callers it relies on being overridden.


## io-export-bitmap (plus exporter glue)

Scope: next/src/io/export/{index,bitmap-export,jpeg-encoder,byte-buffer,canvas-holder,exporter,sanitize-filename}.ts, next/src/io/zip/*, next/src/workers/{raster,zip-encoder}.ts, next/src/workers/workers.test.ts, next/src/parity/app/import-export.ts.
Old: chunk.vendor.js modules 797, 798, 849, 850, 1112, 1113, 1120; designer.browser.dev.js modules 1253 (GExporter), 1514-1516 (zip.js), 72180 (GUtil.sanitizeFilename).

What I compared function by function and found the same: BitmapExport (export with the 0.9 clamp loop, getBitmapPaintArea, getNodeSelfBitmapUsedArea, getMaxCanvasUsedArea, getMaximumCanvasSize, convertSizeToScale incl. the "unit = rest after value.toString()" quirk), the JPEG encoder (tables, Int32Array(32) quant quirk, DCT, Huffman, bit flushing without padding, JFIF/APP14 headers, DHT layout, concurrenyEncode protocol), ByteBuffer, CanvasHolder, Raster.raster / concurrencyRaster (slicing, padding, mask join, bubbleSort by index), ZipEncoder, the zip.js writer (local header 0x14000808, deflate method set big-endian, DOS date/time with seconds/2, data descriptor, central directory "made by" 0x1400, EOCD), reader (EOCD seek, zip64/encrypted errors, CP437 vs UTF-8 names, CRC check), zip-fs tree and the pako codec (raw, 1 MB chunks, level never passed without workers), GExporter (generateExportables, exportExportable incl. jpegQuality (q||100)/100 and PDF dpi/quality defaults, generateExportName dedupe, exportToDirectory, export incl. PDF merge and ZIP fallback), sanitizeFilename (the Babel-expanded "." equals a plain non-unicode "."). GBitmap.toImageBlob (engine, not this cluster) also matches. The recorded-output unit tests (JPEG 12 cases, raster, deflate, zip bytes for flat/nested/big/empty with a unicode name) pass: 47/47 in the five test files.

The parity hook in import-export.ts drives the real code: it calls Exporter.exportExportable, generateExportables, generateExportName and BitmapExport directly; only the host (no user, the active document title as window title) is interim.

No behaviour differences that users or files would notice turned up. The findings are about coverage, an undocumented kept bug and stale docs.

### R5-E-301 (medium): the cluster's own parity scenarios are not listed as ported

Old location: n/a (parity plan).
New location: next/parity/ported/io-export-bitmap.json:1, next/docs/rewrite/PORT-PLAN.md:552.

What differs: PORT-PLAN gives this cluster "Parity scenarios: import-export/export-engine, import-export/export-meta". The ported list only has

    ["import-export/meta/size-specs", "import-export/meta/export-names"]

None of the PNG/JPG export matrix ids (import-export/export/png/*, png/*.decoded, jpg/* incl. jpegQuality 25/100, size 2x/0.5x/512w/512h/128x128/300dpi/" 1.5X ", from parity/scenarios/import-export/export-cases.ts) nor meta/canvas-limits, meta/clamp-to-max, meta/unknown-format, meta/exportables-canvas, meta/exportables-assets appear in any parity/ported/*.json (grep over all of them finds no "import-export/export" or those meta ids). So the actual PNG/JPEG bytes, the pHYs DPI chunk on 300dpi exports, transparent vs background output and the clamp to the browser canvas limit are never compared against the old app. The unit tests only check toBitmap's arguments with a fake node.

Fix: run `GD_RUN=io-export-bitmap npx playwright test parity/scenarios/import-export --project parity` for export-engine and export-meta, add every passing png/jpg/meta id to io-export-bitmap.json, and file the failing ones (browser-encoder differences should already be handled by the ".decoded" variants).

### R5-E-302 (medium): Exporter.export and exportToDirectory have no test

Old location: designer.browser.dev.js:80664-80725 (exportToDirectory), 80726-80823 (export).
New location: next/src/io/export/exporter.ts:413-484, 492-606; next/src/io/export/exporter.test.ts (only generateExportName, generateExportables, the unknown-format throw and a ZipDirectory smoke test).

What differs: nothing found by reading, but these branches are unexercised: "/" in names creating subdirectories with case-insensitive reuse (`path += part.toLowerCase()`), the "(n)" dedupe across directories, the item-without-name case that never calls onDone, the several-PDFs merge into one item named documentName, chooseDirectory vs the ZIP fallback (which passes the item's file type with noPrompt true, old behaviour), the single-PDF noPrompt download, and a write failure (`.catch(countWritten)`). A duplicate final name inside the ZIP (e.g. names "a(2)" and two "a" give "a(2).png" twice) makes zip-fs throw "Entry filename already exists.", which is swallowed by that catch and silently drops a file; same in the old code, but nothing pins it.

Fix: add exporter tests with a fake ExportStorage/ExportDirectory and a stubbed exporters.BitmapExport: multi-item export into ZipDirectory then read the archive back with FS.importBlob and assert entry full names (e.g. "Icons/A.png", "icons/B.png" ending up in one "Icons" folder, "A(2).png"), the PDF-merge case (element becomes an array, name = documentName), and that onDone fires exactly once.

### R5-E-303 (medium): kept raster remainder bug drops pixels in concurrent PDF export and isn't in QUESTIONS.md

Old location: public/chunk.vendor.js:239343-239349

    if (i === t.length - 1 && u > 0) {
      var g = u + 10 - ((u + 10) % 4),
        f = new Uint32Array(c.end - c.start + g);
      (f.set(A.slice(c.start, c.end), 0),
        (c.end += u),

New location: next/src/workers/raster.ts:66-71 (and the doc comment at 41-43)

    if (index === workers.length - 1 && remainder > 0) {
      const padding = remainder + 10 - ((remainder + 10) % 4);
      const padded = new Uint32Array(range.end - range.start + padding);
      padded.set(pixels.slice(range.start, range.end), 0);
      range.end += remainder;

What differs: nothing; the port keeps it on purpose (the comment says "old behaviour, kept"). But it is a user-visible bug: pdf-canvas.ts:411-412 uses the workers for any rasterized image over 100x100 when concurrency is available, and the last `remainder` pixels (count - sliceSize * workers) are zeros, so they come out black with alpha 0. Because alpha 0 sets hasTransparency, a soft mask is emitted and those pixels are transparent in the PDF. Example: a 101x101 image on 4 workers has sliceSize 2548 and loses the last 9 pixels of the bottom row. QUESTIONS.md lists kept quirks, but this one isn't there (grep for raster/remainder finds nothing), and BUGS-FIXED.md doesn't cover it.

Fix: add a QUESTIONS.md entry so it's a recorded decision. If it gets fixed instead, copy `pixels.slice(range.start, range.end + remainder)` into the padded buffer and record it in BUGS-FIXED.md, since it changes PDF bytes against the old app.

### R5-E-304 (medium): worker error paths and ZipEncoder.concurrencyEncode are untested

Old location: public/chunk.vendor.js:239286-239312 (zip), 239325-239402 (raster), 111342-111377 (jpeg).
New location: next/src/workers/zip-encoder.ts:13-38, next/src/workers/raster.ts:89-104, next/src/io/export/jpeg-encoder.ts:572-615; next/src/workers/workers.test.ts.

What differs: nothing by reading. workers.test.ts only covers the success path of concurrencyRaster with fake workers and ZipEncoder.encode. Nothing covers: an "error" event rejecting the promise and removing both listeners (the handler throws on empty buffers, a bad range or an unknown colour space, and that is how a PDF export job fails, see pdf-canvas.ts `.catch((error) => job.failed(error))`); ZipEncoder.concurrencyEncode at all (posting with the buffer transferred, ignoring answers with another uuid or command); and the small-image case where count < 4 * workers gives sliceSize 0, so every worker but the last gets range {0,0}, the worker throws 'Invalid "range"' and the job fails (only reached when the >100x100 guard is bypassed, so low practical risk).

Fix: add tests with a fake worker that fires "error" and assert rejection plus that `listeners.message`/`listeners.error` are empty afterwards, for all three; add a concurrencyEncode test for ZipEncoder like the existing JPEG one (wrong-uuid answer ignored, right one resolves).

### R5-E-305 (low): zip.ts header comment gets the UTF-8 flag wrong

Old location: designer.browser.dev.js:133437-133441

    _.view.setUint32(0, 335546376),
    v.version && _.view.setUint8(0, v.version),
    i || 0 === v.level || v.directory || _.view.setUint16(4, 2048),

New location: next/src/io/zip/zip.ts:12-13

    // Entries are stored with a data descriptor (bit 3) and the UTF-8 name
    // flag (bit 11, set only for deflated entries), in local time.

What differs: the code is right (zip.ts:711-713), the comment isn't. 335546376 is 0x14000808, so bytes 2-3 (the flags) are 0x0808 for every entry, stored or deflated, directories included. The conditional setUint16(4, 2048) is the compression method (big-endian 0x0800 gives method 8), not the flag. zip.ts:710 says this correctly.

Fix: "flags 0x0808 (data descriptor and UTF-8 names) on every entry; method 8 unless stored (dontDeflate, level 0 or a directory)".

### R5-E-306 (low): ZipFileEntry without params no longer throws

Old location: designer.browser.dev.js:133843-133846

    function b(e, t, n, o) {
      _.prototype.init.call(this, e, t, n, o),
        (this.Reader = n.Reader),

New location: next/src/io/zip/zip-fs.ts:249-253

    super(fs, name, params, parent);
    const p = params || {};
    this.Reader = p.Reader;

What differs: init's `n || (n = {})` only replaced init's own copy, so the old `addData(name)` / `addData(name, null)` threw a TypeError on `n.Reader` after the entry had already been pushed into fs.entries and the parent's children. The new code creates an entry with no Reader, which then fails later in exportZip (`new ReaderType(...)` on undefined). Nothing in the app calls addData without params, so this is unreachable today.

Fix: either keep it (and say so in a comment), or throw like before when params is null (`if (!params) throw new TypeError(...)` before super is not possible, so check after super and detach). A one-line comment is enough.

### R5-E-307 (low): stale "not ported yet" branches and comments

Old location: designer.browser.dev.js:80582, 80635 (`i.GSVGExport.export(...)`, `i.GPDFExport.export(...)` called unconditionally).
New location: next/src/io/export/exporter.ts:325 and 347; next/src/io/export/index.ts:37-45; next/src/parity/app/import-export.ts:13-14 and 196-203.

    if (!svgExport) throw new Error("SVG export is not ported yet.");
    ...
    if (!pdfExport) throw new Error("PDF export is not ported yet.");

and in the parity hooks header: "svgUnsupportedFeatures and pdfIsSupported throw while the SVG and PDF exporters are not in the registry."

What differs: index.ts now registers SvgExport and PDFExport, so these branches are dead and the hook comment is wrong. The registry type still says `SVGExport: SvgExporter | null`.

Fix: make the registry fields non-null, drop the two throws and the null checks in the hooks, and update the header comment of import-export.ts.

### R5-E-308 (low): EXPORT_FILE_TYPES is not GDocument.FileTypes

Old location: designer.browser.dev.js:16082 (and 5867 `K.FileTypes = N.getFileTypesArray()`)

    return [i.GVDESIGN, i.PNG, i.HEIC, i.JPG, i.JPEG, i.SVG, i.PDF, i.EPS];

New location: next/src/io/export/exporter.ts:130-139

    /** The export formats of GDocument.FileTypes (old module 389). */
    const EXPORT_FILE_TYPES = [png, jpg, jpeg, svg, svgz, pdf, zip]

What differs: the old list has no svgz or zip entry and also contains gvdesign, heic and eps. Exporter.export only uses it to find the type of the first item's format (png/jpg/svg/pdf), which both lists resolve to the same ext/mime, so no visible change today. But the comment claims it is GDocument.FileTypes, and a phase-7 host that returns the real list would make an "svgz" or "zip" lookup return undefined where this default returns a type.

Fix: copy the old array (ext and mime of the eight entries, in order), or change the comment to say it is a reduced stand-in until the app shell provides GDocument.FileTypes.


## io-import-svg (old modules 1390-1392)

Scope: next/src/io/import/svg/svg-import.ts (old 1390, chunk.vendor.js:244928-245055),
svg-parser.ts + svg-values.ts (old 1391, :245056-248851), helpers.ts (old 1392,
:248852-248999), parity hook next/src/parity/app/svg-import.ts.

I walked all three old modules function by function against the new files. The port
is close to line-for-line: GSVGImport.import, the arc helpers, Property, Font.Parse,
Rect, Transform, AspectRatio, ElementBase/RenderedElementBase (fill and border
layers including the array-object key order), path tokenizer and regex clean-up
(".5.5", "1e-5", missing separators, arc flag split), gradients (href takes only the
stops, units, reversed stops, blending of stops outside 0-1, userSpaceOnUse mapping,
radial gradientTransform), pattern, use/symbol/defs/switch, mask, clipPath, filter
and its primitives, text/tspan/textPath/tref/a, image, style/@font-face and the
font provider queue all keep the old branches, order and quirks. Old elements that
were not X.inherit'ed (circle, feFlood, feDropShadow, foreignObject,
gravitGraphicSource) don't change behaviour because nothing does instanceof on
their base classes. The class-field semantics of the ES2023 target (fields reset
after super()) don't clobber anything the base constructor sets.

Parity hook: next/src/parity/app/svg-import.ts is a faithful copy of
parity/scenarios/io-import-svg/old-hooks.js (same decode, same swap of the meter's
fontManager, same timeout and outcome shape) and calls the real SVGImport.import.
It fakes nothing. The scenarios run on the new app through parity/ported/io-import-svg.json.

Vitest on src/io/import/svg: 3 files, 22 tests pass. A scratch probe
(scratchpad/probe/p5.test.ts, run with its own config) confirmed finding 001.

### R5-E-401 (medium): CSS selectors and ids named like Object.prototype members pollute or mis-resolve (same class as BUG-006, not fixed)

- Old: chunk.vendor.js:248074 `var A = i.Styles[h] || {}` ... `A[i.trim(u)] = new i.Property(...)` ... `i.Styles[h] = A`;
  :245913 `null == i.Definitions[this.attribute("id").value] && (i.Definitions[...] = this)`;
  :245340 `getDefinition`: `return ... i.Definitions[e]`.
- New: svg-parser.ts:2551 `const rules = svg.Styles[selector] || {};` then `rules[trim(name)] = svg.property(...)`;
  svg-parser.ts:462 `null == svg.Definitions[this.attribute("id").value]`;
  svg-values.ts:266-273 `return this.context.Definitions[id]`.
- What differs: nothing versus the old app, but BUG-006 fixed only the element-name
  lookup in CreateElement while the same plain-object lookups stay in three other
  places. Verified with the new code: `<style>__proto__ { fill: red }</style>`
  makes `svg.Styles["__proto__"]` return Object.prototype, and the rule is written
  onto it: afterwards `({}).fill.value === "red"` for every object in the app
  session. Every `for (name in settings)` loop (for example the fill and border
  layer builders, svg-parser.ts:707 and :829) then also picks up `fill`, so later
  imports and other code see a stray property. A selector `constructor` writes onto
  the global Object function. Ids: `href="#toString"` resolves to
  Function.prototype.toString (probe: `typeof getDefinition() === "function"`), so
  `<use xlink:href="#toString"/>` throws "clone is not a function" and fails the
  import; `id="constructor"` is never registered because the lookup is not null.
- Fix: record it as a BUG-00x next to BUG-006 and make the three tables
  prototype-free: `Styles`, `Definitions` and `References` as
  `Object.create(null)` (or Maps), and in SvgStyle skip selectors that aren't own
  keys. Add tests for `__proto__ {…}`, `constructor {…}` and `href="#toString"`
  that fail on the current code.

### R5-E-402 (medium): risky branches with no unit test and no parity fixture

- Old: chunk.vendor.js:247955-247958 (`<image>` href ending in .svg: synchronous
  `i.ajax`), :248083-248097 (`@font-face` with `format("svg")`: `i.parseXml(i.ajax(b))`
  and CreateElement of every `<font>`), :245884-245920 (text nodes, CDATA nodes
  type 4, `e.nodeValue || e.text`).
- New: svg-parser.ts:2411-2428 (SvgImage constructor), :2560-2580 (SvgStyle
  @font-face), :465-481 (parseNode text capture), SvgTspan constructor :2318-2326.
- What is missing: none of the 39 own fixtures nor the 13 shared ones (grep over
  parity/scenarios/io-import-svg/fixtures and parity/fixtures/import/svg) contain
  non-ASCII text, entity or character references (`&amp;`, `&#...;`), CDATA inside
  `<text>`, an `<image>` with a .svg or http(s) href, or an @font-face with
  `format("svg")` (styles.svg only has `format("woff")`). The unit tests in
  svg-parser.test.ts cover element creation, style lookup, one tspan quirk, shapes,
  em units and BUG-006, nothing of the above. The two sync-XHR paths are the only
  ones that block the UI thread and the only network access in the importer.
- Fix: add fixtures: a text with "Grüße &amp; 日本語 &#x1F600;" in a tspan and in a
  CDATA section, a font-family with non-ASCII letters (cleanFontFamily regexes), an
  `<image xlink:href="sub.svg">` served by the parity server, and an @font-face with
  `src: url("f.svg#x") format("svg")` pointing at a served SVG font.

### R5-E-403 (low): QUESTIONS.md has none of the 13 "SVG import" entries the code points to

- Old: n/a (documentation).
- New: svg-parser.ts:13 ("QUESTIONS.md lists them under "SVG import""), and
  references to "SVG import arc rotation" (helpers.ts:125), "em units",
  "line bounds", "matrix order" (svg-values.ts:302, :89, :414),
  "font listeners" (svg-parser.ts:296), "font provider queue" (FontProviderQueue
  doc), "nested svg", "switch", "text box" (:2032), "text children" (:2099),
  "image listener" (:2409), "use" (:2596), "feColorMatrix" (:2980).
- What differs: `grep -n "SVG import" next/docs/rewrite/QUESTIONS.md` finds nothing
  (the last entry is Q-074; only Q-008 mentions SVGZ). The brief and PORTING.md
  rely on QUESTIONS.md to list kept quirks, so these quirks are undocumented.
- Fix: add one Q-0xx entry per cited name (old location, what the quirk is, why
  it is kept) and change the code comments to cite the Q numbers.

### R5-E-404 (low): non-SVG image hrefs no longer load an `<img>` (old side effects dropped)

- Old: chunk.vendor.js:247959-247971:
  `this.img = document.createElement("img"), 1 == i.opts.useCORS && (this.img.crossOrigin = "Anonymous") ... this.img.onload = function () { r.loaded = !0 } ... this.img.onerror = function () { i.log('ERROR: image "' + t + '" not found'), r.loaded = !0 } ... this.img.src = t`
- New: svg-parser.ts:2421-2427: only the `.svg` branch is kept; comment "canvg also
  loaded other images into an <img> for drawing; the scene image loads its URL itself."
- What differs: the old importer fetched every non-.svg image href a second time
  (honouring `useCORS`), logged a missing image with `opts.log`, and set `loaded`
  to true; the new one never sets `loaded` (stays false) and never logs. Nothing in
  scene building reads `img` or `loaded` (ImagesLoaded is dropped too), so the
  scene is the same; only the extra request and the log line are gone.
- Fix: none needed for behaviour; mention the dropped request, the `useCORS`
  option and the `log` message in the header comment so nobody relies on them.

### R5-E-405 (low): font provider queue passes only the first callback argument

- Old: chunk.vendor.js:245127-245131: `var n = arguments; t.forEach(function (e) { e.apply(null, n); });`
- New: svg-parser.ts:205-209: `(this.fontProvider as FontProvider).queryFirst(query, (answer) => { ... waiting.forEach((fn) => fn(answer)); ...`
- What differs: a provider that answers with more than one argument has the extra
  ones dropped. The importer's own callback only reads the first, so no current
  caller notices.
- Fix: forward all arguments (`(...answer) => waiting.forEach((fn) => fn(...answer))`)
  or note in the FontProvider doc that only the first is used.

### R5-E-406 (low): every element now has getBoundingBox/getAbsoluteBoundingBox

- Old: chunk.vendor.js:245941-245951: both methods exist only from
  RenderedElementBase on (`this.getBoundingBox = function () { throw new Error("getBoundingBox: unimplemented"); }`);
  plain ElementBase elements (defs, stop, mask, clipPath, style, filter, ...) have
  neither, so a call throws `TypeError: ... is not a function`.
- New: svg-parser.ts:611-617 puts both on SvgElementBase (`throw new Error("getBoundingBox: unimplemented")`,
  `return this.getBoundingBox()`).
- What differs: the error class changes from TypeError to Error, which the parity
  scenarios serialize (`"<" + error.name + ">"`). I found no input that reaches a
  call on a non-rendered element (a tspan's parent is a text, a or a rendered
  element whenever its fill is resolved), so this is latent.
- Fix: move both methods to SvgRenderedElementBase to keep the old shape.


## io-import-pdf-eps (PDF/EPS import, pdf.js and PostScript workers)

Scope: old chunk.vendor.js modules 1142, 1201, 1203-1205, 1213, 1393-1399, 1403-1405 against next/src/io/import/**, next/src/workers/pdf/**, next/src/workers/ps/**, and the parity hook next/src/parity/app/pdf-eps-import.ts.

What I checked and found faithful (no finding):
- PDF importer (1393): FontManagerProxy (including the slice-not-splice quirk), the AI check, page range and progress, render options, missing and embedded font collection.
- Canvas bridge (1394): save/restore property list, transforms (including the rotate quirk), clip collapse of equal consecutive clips, image-replaces-fresh-clip, scratch canvas handling, stroke/fill/fillRect, cmyk() CSS parsing, _putChar space-width search, and the font cache and embedded-font dedupe loop. The one exception is the weight-name order (R5-E-501).
- Text merger (1396), canvas graphics subclass (1397), tiling pattern (1398), canvas factory (1399) and embedded font (1395): line by line the same.
- Google font list (1203): the family list is identical. Font name helpers (1204): the same.
- EPS importer and parser (1403/1404), bitmap import (1405), Sketch shape group (1213) and Sketch font search (1142): the same.
- The parity hook runs the real importers. It mirrors next/parity/scenarios/io-import-pdf-eps/old-hooks.js one to one (same font meter swap, family-list restore, timeouts and outcome shapes) and fakes nothing.
- MAIN_PATCHES text, progress and showText/paintChar patches against designer.browser.dev.js module 792: these match, including the `glyph.unicode` character, the advance passed to fillText/paintChar, and the accent drawn with `fontChar`.
- PS worker: the operator table is identical (268 systemdict keys, same order). A differential fuzz of about 28k programs against the old ps*.js in a vm found no difference beyond PS001/PS002. CMYKToRGB and the shadings match line by line, and 15 real EPS/AI files give identical message streams (the DCT images are excluded).
- pdf.js worker: the old build is 2.1.286; the new one is stock 2.1.266 plus WORKER_PATCHES. A token comparison after patching and minifying finds only the Gravit patches, plus webpack polyfills and an unused worker-side Util.makeCssCMYK.

### R5-E-501 (high): embedded-font full-name lookup strips weight names in the wrong order, so "…ExtraBold" fonts aren't matched to Google families
- Old: public/chunk.vendor.js:249885 (module 1394 `_getCurrentFont`) iterates module 1204's array, whose order is defined at chunk.vendor.js:242628:
  `o.each(I.Font.Weight, function (e, t) { ((t = t.toLowerCase()), -1 !== s.indexOf(t) && (s = s.replace(t, ""))); })`
  with `Weight: ["ExtraLight","ExtraBold","SemiBold","Thin","Light","Regular","Medium","Bold","Heavy"]`.
- New: next/src/io/import/pdf/pdf-canvas-bridge.ts:870-873:
  `for (const weightName of Object.keys(Font.Weight)) { const lower = weightName.toLowerCase(); if (fullName.indexOf(lower) !== -1) fullName = fullName.replace(lower, ""); }`
  This uses the engine Font.Weight (next/src/engine/text/fonts/font.ts:88), whose key order is Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Heavy.
- What differs: "bold" is now stripped before "extrabold".
  - Take an embedded font whose family isn't in the Google list and whose full name is "Open Sans ExtraBold". The old code reduces it to "open sans", finds "Open Sans", calls fontManager.getFont("Open Sans", …, 800) and marks the font supported.
  - The new code reduces it to "open sans extra", finds nothing, registers the PDF's embedded font, and reports the family as missing.
  - Users see a different font in the text and an extra entry in the missing/embedded font lists.
  - ExtraLight and SemiBold happen to work, because those come before Light and Bold in both orders.
- Fix:
  - Iterate `FontNameHelpers.Weight` (font-style-names.ts, the module-1204 array that is already imported in the bridge) instead of `Object.keys(Font.Weight)`.
  - Add a bridge unit test that feeds a fake pdf.js font whose parsed names are family "XYZ", fullName "Open Sans ExtraBold", with the list ["Open Sans"]. Assert that `otf` is the font manager's Open Sans 800 and that missingFonts is empty. The test fails with the current order.

### R5-E-502 (medium): the canvas bridge and the merge paths of the text merger have no unit tests
- Old: chunk.vendor.js modules 1394 and 1396.
- New: next/src/io/import/pdf/pdf-canvas-bridge.ts (no test file). next/src/io/import/pdf/text-merge.test.ts covers only createTexts and getGeometryBBox (lines 29-80).
- What differs: no behaviour difference, but much of this code is only reached through parity PDFs, and nothing pins the branches below:
  - _getCurrentFont: Google-list hit, full-name fallback, dedupe against registered fonts with the same bytes, the `_<uuid>` rename, and the Open Sans substitute.
  - clip(): collapsing equal consecutive clips.
  - drawImage: the image that replaces its fresh clip, and the 1e8-pixel downscale.
  - The CanvasHolder bitmap vs node-move branches, and _getPattern with a cmyk() string.
  - TextMerger: mergeTexts, _mergeVerticalTexts (lineSpacing, "\n" line, origin move), _mergeHorizontalTexts (10 pt gap, split-off last char) and _applyAlignmentsAndIdentations (center within 2 pt, indent word).
- Fix: add pdf-canvas-bridge.test.ts with a stub `gfx.current` and font manager, and add mergeTexts cases to text-merge.test.ts. R5-E-501 is the first case that should be there.

### R5-E-503 (medium): pdf.js worker patches are only tested as text; xref_table, font-dictionary streams and encrypted PDFs are never run
- Old: public/pdf.worker.js: the xref_table branch in XRef.readXRef, the setFill/StrokeCMYKColor op path with getCmyk, adjustMapping, and translateFont's baseDict serializer.
- New: next/src/workers/pdf/pdfjs-patches.test.ts:73-83 only checks `expect(patched).toContain("disableCMYKToRGB: data.disableCMYKToRGB")` and `toContain("if (self.options.disableCMYKToRGB) {")`, and runs getCmyk on its own.
- What differs: nothing runs the patched worker on a document. colors.pdf covers k/K, and the text and CFF fixtures cover font mapping. But no fixture uses `xref_table`, is encrypted, or has a stream inside a font dictionary (the baseDict getBytes path). broken.pdf only goes through ai-check, not the "pdf" importer.
- Fix:
  - Add a Vitest that runs the patched worker in-process (pdfjs-dist fake worker in node) on a tiny inline PDF that uses `xref_table` and `0.1 0.2 0.3 0.4 k`. Assert OPS.setFillCMYKColor with [10,20,30,40] when disableCMYKToRGB is true, and setFillRGBColor when it is false.
  - Add an encrypted PDF to the parity fixtures to pin the "never calls back" quirk (pdf-import.ts:10-11).

### R5-E-504 (low): port-map lists three new files that don't exist
- Old: chunk.vendor.js modules 1142 (Sketch font search), 1205 (Sketch bitmap element) and 1213 (Sketch shape group).
- New: next/docs/rewrite/port-map.tsv maps them to next/src/io/import/fonts/import-font-resolver.ts, next/src/io/import/image-element.ts and next/src/io/import/shape-merge.ts, under io-import-pdf-eps. None of these files exist. The ports are next/src/io/import/sketch/sketch-font-search.ts, sketch-bitmap.ts and sketch-shape-group.ts (the first file says so in its header).
- What differs: documentation only. Coverage tooling and reviewers reading port-map look in the wrong place, and the modules are counted in the wrong cluster. I compared all three ports with the old code and they match.
- Fix: point the three rows at the sketch/ files and move them to the Sketch import cluster.

### R5-E-505 (low): an errordict handler that isn't an object no longer crashes the PS worker
- Old: public/pscore.js, initiateError (line 8136-8142 in a prettier copy): `t in this.errordict.value ? "function" == typeof this.errordict.value[t] ? ...call(this) : "execute" in this.errordict.value[t] ? ...execute(this) : ...`
- New: next/src/workers/ps/core.ts:346: `else if (handler && typeof handler == "object" && "execute" in handler)`
- What differs: take `errordict /typecheck 5 put (a) 1 add ...`. The old `in` on a number throws "TypeError: Cannot use 'in' operator…", so the run dies with no further output and no "done". The new code skips the handler and keeps going; in my test it posted 18 messages, including the stroke and "done", where the old worker posted 7 and then threw. The EPS import then finishes instead of waiting for the 300 s timeout.
- Fix: either drop the guard (`"execute" in (handler as object)`) to stay faithful, or keep it and list it in BUGS-FIXED.md. Add a corpus program for it either way.

### R5-E-506 (low): image/imagemask with PS-object operands now posts drawImage instead of dying with DataCloneError
- Old: public/psclasses.js (compositeObjectBuilder puts own `isEOF`/`getUint8` function properties on every array, dict and string), together with pscore.js, which posts drawImage uncloned, so structured clone throws.
- New: next/src/workers/ps/objects.ts:217-305 (PSComposite methods on the prototype, value in a private field) and next/src/workers/ps/operators/graphics-images.ts:215 and :294 (`toGravit("drawImage", [...], null, false)`).
- What differs:
  - For `{} (abc) 5 [1 0 0 1 0 0] {<ff>} image`, the old worker throws "DataCloneError: function(){...} could not be cloned" and never sends "done".
  - The new worker posts drawImage with PS objects as width and height, then "done". The page's drawImage then fails in createImageData.
  - Global composites made under `true setglobal` also lost their own enumerable `value`, so their contents vanish from structured-clone copies.
- Fix: either throw in toGravit when the payload holds a PS object (matching the old failure), or document it as a fix. Add a corpus case.

### R5-E-507 (low): isAIFormat now ends its worker on success, unlike the old code, and the change isn't documented
- Old: chunk.vendor.js module 1393: `d.isAIFormat = function (e) { return A.getDocument({data: e}).then(function (e) { return e.getMetadata().then(...) }) }`. The document and worker are never destroyed.
- New: next/src/io/import/pdf/pdf-import.ts:139-148: `const { task, terminate } = getDocument({ data }); ... document.getMetadata().then((info) => { terminate(); ...`
- What differs: one worker per AI check no longer leaks on success. A rejected load or getMetadata still leaks, and so does a failed render in import(), which never calls terminate. Users can't see the difference.
- Fix: say so in the comment, or terminate in a finally on every path (load rejection and render failure included).

### R5-E-508 (low): the patch header calls the old pdf.js build 2.1.266
- Old: public/pdf.worker.js contains `"2.1.286"!==p` (the "2.6.2" in the file is core-js).
- New: next/src/workers/pdf/pdfjs-patches.ts:1-33 says "the old worker is otherwise 2.1.266". pdfjs.ts:1-2 says 2.1.286 correctly.
- What differs: documentation only. The token comparison found no differences beyond the Gravit patches.
- Fix: write that the old builds report 2.1.286, a git build between 2.1.266 and the next release, and that a token comparison against patched 2.1.266 showed no further differences.


## io-import-sketch (Sketch importer)

Scope: next/src/io/import/sketch/** against chunk.vendor.js modules 439,
561-563, 597-601, 793-796, 1121-1141, 1205, 1206-1214 (1205 sketchbitmap,
1213 sketchshapegroup and 1142 sketchfontsearch are filed under
io-import-pdf-eps in port-map.tsv but are Sketch modules, so I reviewed them
too), designer module 1400 (the webpack context), designer module 1210
(jDataView, replaced by DataView in bplist-parser.ts) and the zip.js copy
the importer uses (designer 1402; its string and property sets match app
module 1514, which zip.ts ports).

Result: the port follows the old code closely. I walked every module
function by function and found no behaviour difference that a real Sketch
49 file can reach. The parity hook (next/src/parity/app/sketch-import.ts)
is a line-for-line copy of parity/scenarios/io-import-sketch/old-hooks.js:
it calls the real SketchImport.import with a new Workspace whose
_fontManager is the scenario's font manager and installs that manager in
openTypeMeasure.fontManager (old module 416's fontManager), with the same
timeout and release(). It fakes nothing. `npx vitest run
src/io/import/sketch` passes (5 files, 75 tests).

Checked and equal (no finding): v50+ rejection that still reads pages, the
"File format is not recognized." mapping, meta.json missing (never
settles), zip entries prefix match in _getEntry, progress maths,
_preProcess/_isSymbolPage/ignoreSymbolPage, NSKeyedArchiver and bplist
(Uint64 trailer values incl. toString used as an index, 32-bit int
arithmetic, UCS-2 swap in place in the copied buffer, console.err TypeError,
TextDecoder for utf8 as jDataView used it when TextDecoder exists, base64-js
padding), NSAttributeInfo raw bytes (jDataView getBytes() from offset 0 =
new Uint8Array view), UTF-16 substring of runs, NSRGB/NSCMYK, NSMaxLineHeight,
composeQuery, font search dedupe and ready(), symbol overrides incl. numeric
(old format) keys, MSImageData overrides, inverted replaceChild, nested
symbolID override, boolean shape groups (falsy-0 first op, mixed loop and
swap, _merge), path generation (curve modes, hasOwnProperty cornerRadius,
radius cap, event blocks), gradients (linear/radial/angular maths and
operation order), texture/noise patterns, bitmap deferred transforms,
artboard white fill, page w/h 0, the effect classes (incl. the inner-shadow
_getEffect that the old module put on the base prototype).

### R5-E-601 (medium): five kept-quirk references point at QUESTIONS.md entries that don't exist

- Old: chunk.vendor.js:109422-109430 (effects applied without parse), 109568-109583
  (replaceChild), 240232-240240 (path event blocks), 242909-242912 (boolean
  first op), 240408 (style regex).
- New: next/src/io/import/sketch/effects/sketch-effect.ts:15,
  sketch-base.ts:82, sketch-path-util.ts:67, sketch-shape-group.ts:101,
  sketch-text.ts:78.
- What differs: the code is faithful, but the comments cite
  `QUESTIONS.md "Sketch import drops effects"`, `"Sketch symbol override
  replaceChild"`, `"Sketch path event blocks"`, `"Sketch boolean groups"` and
  `"Sketch text fonts"`. next/docs/rewrite/QUESTIONS.md has only Q-008 for
  Sketch (`## Q-008 AI, SVGZ and Sketch import are unreachable`); no other
  file in the repo has these headings. Two of these are visible to users:
  shadows, inner shadows, gaussian/zoom blurs and colour controls are never
  imported (the old SketchShape calls `new l(e).applyTo(this._node)` without
  `parse()`, so `_effect` stays null), and a font name containing "Regular"
  imports as italic (`/normal|italic|oblique|regular/i`, then
  `"normal" === o ? Normal : Italic`). The brief says QUESTIONS.md is where
  kept quirks are listed, so reviewers and a later "fix old bugs" pass can't
  find these.
- Fix: add the five entries to QUESTIONS.md (old behaviour, why kept, what
  a fix would be), or change the comments to point at existing entries.

### R5-E-602 (medium): symbol branches that no test or scenario reaches

- Old: chunk.vendor.js:241008-241018 (image listeners in a symbol),
  241076-241087 (PinToCorner shift), 241068-241090 (`_transform` after the
  images load), 240453-240505 (`setText` on centred auto-width text and
  `_calculateNewPosition`).
- New: next/src/io/import/sketch/sketch-symbol-instance.ts:122-131,
  199-209, 215-221; sketch-text.ts:150-200.
- What differs: nothing in the code, but nothing covers it. The fixtures
  (parity/fixtures/import/sketch/*.sketch) have no `resizingType: 1` layer,
  no `bitmap` layer inside a symbol master (the M1I override in
  symbols-v49 is a shape group with an image fill, so `node instanceof
  Image` never matches), and the only text override target is checked
  without a width that exceeds its frame. These are the branches where the
  port changed how fields are read (`scale.getMatrix()[3]` for `t._sy`,
  `openTypeMeasure(...) || {}` for `new c(...)`), so a mistake there would
  go unnoticed.
- Fix: add a symbols fixture with a bitmap layer in the master, a layer
  with `resizingType: 1` and an instance with a different frame height, and
  a centred `textBehaviour: 0` text whose override is wider than its frame;
  record old outputs and add the scenario ids to parity/ported.

### R5-E-603 (low): port-map.tsv rows for this cluster name files that don't exist

- Old: next/docs/rewrite/port-map.tsv, rows for chunk.vendor.js 439, 561-563,
  597-601, 793-796, 1121-1141, 1206-1214, designer 1400; plus 1142, 1205,
  1213 under io-import-pdf-eps.
- New: next/src/io/import/sketch/*.ts.
- What differs: all 43 rows point at missing paths, and the roles are
  shuffled. Examples: `439 ... next/src/io/import/sketch/shape-group.ts`
  (439 is sketchelement, ported to sketch-element.ts), `1128 ...
  rectangle.ts` (1128 is sketchartboard), `1213 ...
  next/src/io/import/shape-merge.ts io-import-pdf-eps` (sketchshapegroup,
  ported to sketch/sketch-shape-group.ts), `1205 ...
  next/src/io/import/image-element.ts` (sketchbitmap), `1142 ...
  next/src/io/import/fonts/import-font-resolver.ts` (sketchfontsearch;
  sketch-font-search.ts says so in its header). Designer module 1400 lists
  the real names, e.g. `"./model/sketchelement": 439`,
  `"./model/item/sketchartboard": 1128`, `"./model/sketchshapegroup": 1213`.
- Fix: regenerate these rows from module 1400's name table: new path =
  sketch/sketch-<name>.ts (effects/ for the effect classes, bplist-parser.ts
  and ns-archiver.ts for ns/*), and move 1142, 1205, 1213 to
  io-import-sketch.

### R5-E-604 (low): border position is read from the style, not the border (kept, undocumented, misleading comment)

- Old: chunk.vendor.js:70841 `t.setProperty("_ba", _[o.position || 1])`,
  where `o = i.style`.
- New: next/src/io/import/sketch/sketch-element.ts:54
  `layer.setProperty("_ba", BORDER_ALIGNMENTS[style.position || 1]);`, with
  the comment `/** Sketch's border position: 0 center, 1 inside, 2 outside. */`.
- What differs: same behaviour. Sketch keeps `position` on each border, and
  the style has none, so every border imports as Inside. A centre (0) value
  would also become Inside because of `|| 1`. The comment reads as if the
  mapping works. Users see centred and outside borders move inwards.
- Fix: keep the code, add a QUESTIONS.md entry and a comment saying that
  `style.position` is always undefined, so every border imports as Inside.

### R5-E-605 (low): layers with a non-layer `_class` fail differently

- Old: chunk.vendor.js:81446 `var t = r._nameToNodeClassMap[e] || null;`
  (a plain object, so "constructor", "toString" and so on resolve to
  Object.prototype members); 82733-82745 SketchPattern has no `parse`, so
  `this.parse()` in its constructor runs SketchParser's
  `throw new Error("Not implemented")` (81461). That throw happens in the
  `layers.forEach` at 109610, outside the per-child try/catch.
- New: next/src/io/import/sketch/class-registry.ts:25
  `(typeof name === "string" && nameToClass.get(name)) || null` (a Map, so
  those names give null and a warning); sketch-pattern.ts:18
  `override parse(): void {}`.
- What differs: a layer with `_class: "pattern"` threw while its parent was
  being built, and the parent's parse was abandoned. Now it is created,
  parses to nothing and throws "appendTo is not a function" later. A layer
  with `_class: "constructor"` used to push the raw JSON object as a child.
  Now it is skipped. Sketch never writes these values, so no real file is
  affected.
- Fix: either remove the no-op `parse` from SketchPattern (every subclass
  overrides it, so nothing changes for real files) and note the Map in
  class-registry.ts as an intended difference, or list both in
  QUESTIONS.md.

### R5-E-606 (low): the PDF image-fill renderer is only installed by a module nothing imports

- Old: chunk.vendor.js:240158-240178 (calls pdf.js `getDocument` for a
  `%PDF` image directly).
- New: next/src/io/import/sketch/sketch-texture-pattern.ts:61-65
  `const render = SketchTexturePattern.pdfRenderer; if (render) ...`;
  next/src/io/import/index.ts:12
  `SketchTexturePattern.pdfRenderer = renderPdfImage;`.
- What differs: no file under next/src imports io/import/index.ts (grep for
  its path and for `Importers` finds nothing), so in the current app and in
  the parity bundle `pdfRenderer` stays null and a PDF image fill skips
  pdf.js entirely. The visible result is the same as before, because the
  old `getPage({scale: 1})` never settles and the fill keeps its 1x1
  placeholder (pdf-import.ts:255-262 keeps that). The difference only shows
  once someone fixes the getPage quirk, or if pdf.js side effects matter.
  No fixture has a PDF image.
- Fix: install the renderer where SketchImport is defined (or import
  io/import/index.ts from the app's import entry), and add a fixture with a
  PDF image fill so the path runs at least once.


## io-gvdesign and the interim parity hooks

Scope: next/src/io/gvdesign/ (format, load, preview, save-checks, store) against GDocument.unzipData (designer.browser.dev.js:4821-4841), _loadDataIntoDocument and deserializeData (6456-6513), the gvdesign branch of GDocument.store (7413-7510), buildPreview and hasPagesWithInfiniteEmptyCanvas (8296-8325), the storage item checks (11273-11312), GSaveAsAction's download branch (19176-19197) and the local storage's openPrompt, download and Item.write (77050-77265). Hooks: next/src/parity/app/document.ts and corpus.ts against parity/scenarios/corpus/old-hooks.js.

What matches: the gzip call (pako level 9, same header), the `_preview` splice and its 4 s timeout with the same done/clear/FileReader branches, the descendant-count and `20 + count` refusals, the 10/50/75 progress, the 10 ms deferrals, the preview's 600w/600h scale, fit mode 2 on white and the never-settling cases, the 507 empty-infinite-canvas check, the under-200-bytes and shrank-below-half checks, and the real-size re-serialization (save: true, singleton: false) that stamps lmd a second time. The download hook uses the same options ({save: true, singleton: true}), the same name fallback and a typeless Blob, as FileSaver did. The corpus hooks are a line-for-line copy of old-hooks.js except viewIdle (always true, documented) and the view box dropped from the layout check (documented). Nothing is faked: open and save go through the real io/gvdesign code. The five gvdesign test files cover most of this.

### R5-E-701 (medium): a file that restores to null or to a non-scene ends LoadFailed; the old document stayed Loading
Old: public/designer.browser.dev.js:6486-6512. The whole status branch is guarded by `i && (...)`, so `_updateStatus(_.LoadFailed)` is unreachable: a null result skips it and leaves the document Loading; a truthy non-scene (a JSON array, or a root blob whose class is a plain node) throws a TypeError at `i.isCloudSynchronization()` inside the async executor, which also leaves it Loading.
New: next/src/io/gvdesign/load.ts:39-50 (`resolve(result instanceof Scene ? result : null)`), next/src/parity/app/document.ts:263-267 (`if (!scene) { document.setStatus(DocumentStatus.LoadFailed); ...`), and the header comment of document.ts that says "a file that restores to something other than a scene is LoadFailed" as if that were the old behaviour.
What differs: a damaged .gvdesign whose JSON parses but is not a scene (an array, `{"@":"unknownClass"}`, a lone shape) now shows LoadFailed where the old app hung in Loading. The new behaviour is the better one, but it is a deviation with no BUGS-FIXED or QUESTIONS.md entry, and no test covers it (load.test.ts only covers the never-settling cut-off JSON).
Fix: either keep it and record it as a deliberate fix in BUGS-FIXED.md (and correct the document.ts comment), or reproduce the old hang. Either way add a load test for an array root and an unknown root class.

### R5-E-702 (low): load progress and the deserializeAsync rejection path are untested
Old: designer.browser.dev.js:6457-6476 (progress 5, 10, 15, then the restore's own steps; a synchronous throw from GNode.deserializeAsync rejects through `.catch(o)`).
New: next/src/io/gvdesign/load.ts:40-67.
What differs: nothing found, but load.test.ts never passes a progress callback and never makes deserializeAsync throw. store.test.ts pins 10/50/75 for the save side; the load side has no counterpart.
Fix: add a test that records progress for a small file (expect 5, 10, 15 and the restore steps up to 100), and one that stubs Node.deserializeAsync to throw and expects a rejection.

### R5-E-703 (low): the interim file.open hook accepts only .gvdesign and skips the File System Access picker
Old: designer.browser.dev.js:77137-77210. On Chromium the local storage uses `window.showOpenFilePicker` (unless disableFileSystemAccessAPI is set) and keeps the file handle for later writes; the file-input fallback sets `accept` to every type GOpenAction lists, and removes it on iOS.
New: next/src/parity/app/document.ts:303-325 (`fileInput.setAttribute("accept", "." + GVDESIGN_FILE_TYPE.ext)`, always the file input).
What differs: only the hook; the header comment says storage other than the file input is left out, so this is documented in spirit. The parity scenarios patch the input click on both sides, so results agree. Flagging it so the phase 7 storage port does not copy the interim shortcut.
Fix: none now. When app-shell-storage lands, port both branches and the full accept list, and keep the file handle on the item so Ctrl+S writes back.
