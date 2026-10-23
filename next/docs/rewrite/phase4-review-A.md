# Phase 4 review, group A

Scope: the port-map clusters engine-core, engine-locale, engine-math,
engine-opentype-fork, engine-fonts and engine-color.

What I walked function by function against public/chunk.vendor.js:

- engine-core: modules 0 (GObject), 11 (GUtil), 64 (GPlatform), 72, 75, 77, 142, 150, 164, 167, 176, 437, 505, 513, 514, 640.
- engine-math: 5 (GPoint), 6 (GRect, including every branch of `subtracted`), 7 (GTransform), 12 (GMath, every function including getCubicRoots, locateByNewton, the Sturm helpers and the Float32 interval inversion), 132 (GLength, lexer, parser and evaluator).
- engine-color: 17, 50, 68 (including both ICC conversion paths), 138, 147, 158, 188, 641, 642, 648, 649, 659 (jpg.js: Huffman, all five scan decoders, the IDCT, getData, copyToImageData), 932.
- engine-fonts: 108, 281, 568, 587, 726 (all of the name-table and resource-fork reader), 838, plus the wasm loader that replaces 998.
- engine-locale: 224, 632, 634 to 639, 884, 889 to 892. I compared the shipped string tables with the old JSON byte for byte (814 with app/locale/data/en.json, 885, 886, 887 and 888 with the files in engine/core/locale/data). All five are identical.
- engine-opentype-fork: I only spot-checked this cluster: cmap (710), Font.stringToGlyphs and its helpers (982), and the README's list of Gravit changes. I did not walk hintingtt, cff, gsub, layout or the Arabic features instruction by instruction.

The ported code is close to the old code. The math, color, JPEG, ICC, gradient, event and font-manager code matches branch for branch, including the order of floating-point operations and the documented quirks. All 453 unit tests in core, math, color, text/fonts and text/opentype pass (Vitest, 45 files).

Counts: 1 high, 6 medium, 5 low.

### R4-A-001 (high): Android tablets are detected as desktop or phone because ua-parser-js was left out
- Old: public/chunk.vendor.js:37533-37570 (GSystem.hardware: `new UAParser({device: [...]}).getResult()` with the Samsung SM-P6xx rule added in front of ua-parser's own device rules, then the regex fallback)
- New: next/src/engine/core/system.ts:37-48 (deviceTypeFromUserAgent only checks the SM-P605/P610/P615 rule) and :51-74
- Differs: the comment says ua-parser-js "is not a dependency yet", but next/package.json:43 already has `ua-parser-js: 0.7.33`. Without the library, every user agent except the three Samsung models falls through to the regex fallback. I ran the old logic with the real ua-parser 0.7.33 next to the new function:
  - Galaxy Tab S8 (SM-X700) in Samsung Internet: old Tablet, new Phone (the fallback regex matches "Samsung" in "SamsungBrowser").
  - SM-X700 or SM-T510 in Chrome, Lenovo TB-J606F, Kindle Fire (KFTRWI): old Tablet, new Desktop.
  - Windows desktop, ChromeOS and Android phones: same on both sides.

  System.hardware feeds Platform (next/src/engine/core/platform.ts:52-104). An Android tablet now gets Desktop+Unix limits, a 65536 px canvas edge and a 4 GiB area, where the old app used the mobile Chrome limits (32768 and 117418896). It also changes tablet-only UI and touch paths in later clusters, and the Mac-desktop checks in Key.
- Fix: call ua-parser-js in deviceTypeFromUserAgent exactly as the old code did: `new UAParser({ device: [[/android.+((SM-P605|SM-P610|SM-P615))/i], [[UAParser.DEVICE.VENDOR, "Samsung"], UAParser.DEVICE.MODEL, [UAParser.DEVICE.TYPE, UAParser.DEVICE.TABLET]]] }).getResult().device.type`, and keep the try/catch. Add system.test.ts cases for the user agents above, with the expected values taken from the old logic (Tablet for all five tablets).

### R4-A-002 (medium): if harfbuzz-2.2.0.wasm fails to load, the whole engine fails to start
- Old: public/chunk.vendor.js:110658 (`o = i(998)()`: the asm.js build is inside the bundle and is created synchronously, so it cannot fail to load)
- New: next/src/engine/text/harfbuzz/harfbuzz-module.ts:207-222 (top-level `await instantiateHarfBuzz(await readWasm(WASM_URL))`)
- Differs: a fetch error, a 404, a wrong MIME type or an offline start without the .wasm cached rejects the top-level await. Every module that imports harfbuzz.ts (open-type-font.ts, and through it the text engine and everything above it) then fails to evaluate, so the app does not start at all. The old app could not lose HarfBuzz. The brief also asked for "the old asm.js module only as a fallback" (port-map row 998). No fallback exists, and nothing tests the failure path.
- Fix: either vendor the asm.js module and fall back to it when the wasm can't be fetched or instantiated, or make sure the .wasm ships with every build: check that the Electron bundle and any future service worker precache include it. Add a test that a failed fetch is handled, or document in PORTING.md that the .wasm is mandatory.

### R4-A-003 (medium): compressString and decompressString throw because no codec is set up, although pako is a dependency
- Old: public/chunk.vendor.js:2792-2807 (GUtil.compressString/decompressString through pako, `i(165)`), used by public/chunk.vendor.js:255939 (GSVGExport.addEditingCapabilities) and :248756 (canvg reads `gravitGraphicSource` back)
- New: next/src/engine/core/util.ts:406-437 (`setStringCompression`, which nothing outside util.test.ts calls)
- Differs: until some cluster calls setStringCompression, SVG export with "preserve editing capabilities" throws "String compression (pako) is not set up", and SVG import of a Gravit-exported SVG silently drops the embedded source (canvg's try/catch returns null). pako 1.0.11 is already a dependency (next/package.json:40, and opentype.ts imports it), so the indirection only adds a way to forget it.
- Fix: import pako in util.ts and use `pako.deflate(text, { to: "string" })` and `pako.inflate(binary, { to: "string" })` directly. Keep setStringCompression only as a test hook. Add a test that compressString("abc ä") equals the old bundle's output (record it from the old bundle), so the binary-string to base64-of-UTF-8 quirk is pinned.

### R4-A-004 (medium): the radial gradient center is saved under _cx/_cy but read from cx/cy, and the quirk isn't listed in QUESTIONS.md
- Old: public/chunk.vendor.js:33135-33148 (`_serializeToBlob` writes `e._cx`, `_deserializeFromBlob` reads `e.cx`)
- New: next/src/engine/style/radial-gradient.ts:76-89 (kept, with a "known bug, kept for parity" comment at :11-14)
- Differs: behaviour matches the old code. But it is a file-format quirk that users notice: a radial gradient whose center isn't 0.5/0.5 comes back centered after a save and load. QUESTIONS.md and BUGS-FIXED.md don't mention it. Today only the constructor sets _cx (the gradient editor at public/chunk.vendor.js:108226 reads it), so real files probably never contain `_cx`. Nothing tests the round trip.
- Fix: add a QUESTIONS.md entry (keep or fix, plus the evidence that old files never contain `_cx`). Add a unit test that pins the current round trip, so a later fix has to touch it on purpose. If the decision is to fix it, read `cx` first and then `_cx`, and record the change in BUGS-FIXED.md.

### R4-A-005 (medium): no parity scenarios cover engine-fonts, engine-opentype-fork or engine-locale
- Old: modules 108, 281, 587, 726, 838, 998 and 89-997 (the font stack), and 224 and 889 (locale)
- New: next/parity/ported/engine-fonts.json, engine-opentype-fork.json and engine-locale.json are all `[]`
- Differs: these clusters are tested only in Node: fixtures recorded from the old bundle (text/fonts/__fixtures__/old-fonts.json, text/opentype/__fixtures__) plus hand-written unit tests. Nothing compares the running apps. The fixtures cover 13 bundled fonts, but nothing covers:
  - the browser-only paths: wasm loading through fetch, toFontFaceSrc with `window.btoa`, and the FontManager/ResolveFontEvent flow the app drives;
  - user-supplied fonts (TTC, dfont, WOFF, CFF2, variable fonts other than the probe's `wght`);
  - locale bootstrapping with a non-English browser language. With de-DE the language becomes German (1) and the German strings come from designer-temporary.json; no test checks this.
- Fix: port parity scenarios that run in both apps. For fonts: getOpenTypeInfo and OpenTypeUtil.getFont over a TTC and a dfont, and stringToGlyphs for Latin with liga, frac, ss01 and locl, for Arabic, Devanagari and Thai, and with a variation. Also hinted getGlyphOutline at a few sizes. For locale: Locale.getLanguage, getLocaleLanguageTag and a few getValue calls with navigator.language set to de-DE, zh-TW and pt-BR.

### R4-A-006 (medium): the TTC and Mac resource-fork branches of OpenTypeParser are untested
- Old: public/chunk.vendor.js:99951-100035 (Parser.getFont: the collection branch with patchOffsets, the resource-fork branch with Pascal names) and :100104-100122 (_checkType)
- New: next/src/engine/text/fonts/open-type-util.ts:416-475 and :488-520
- Differs: the code matches the old code as far as I could read it, including patchOffsets, the 24-bit dataOffset that reads 4 bytes, and the `count > 256` guard. But open-type-util.test.ts only builds single sfnt files (test-sfnt.ts), and the font probe only loads single fonts. The TTC path cuts the buffer and rewrites table offsets in place. The resource-fork path relies on the shared `_position` of module-level nodes (Pointer "parent.parent"). Both are easy to break, and users load .ttc fonts.
- Fix: add fixtures (a tiny TTC with two fonts and a small dfont, built in test-sfnt.ts or taken from a free font) and assert the family, weight and style lists and the patched table offsets. Record the expected values from the old bundle, the way old-fonts.json was recorded.

### R4-A-007 (medium): HarfBuzz cluster byte offsets are used as string indexes, and the quirk isn't documented
- Old: public/chunk.vendor.js:82208-82250 (GOpenTypeFont.stringToGlyphs, `text: e.slice(t.cluster, n)`)
- New: next/src/engine/text/fonts/open-type-font.ts:337-369 (kept, with a code comment at :338 and a test at harfbuzz.test.ts:58)
- Differs: behaviour matches the old code, and the code comment and the test pin it. But whenever HarfBuzz shapes the text, `glyph.text` is wrong or empty for any non-ASCII text. Arabic letters take 2 UTF-8 bytes, so the cluster of the 7th character is already past the end of a 13-character string. The text engine (gtl/measure.ts:103, tl-canvas-context.ts:529) consumes these entries, so text that HarfBuzz shapes may get wrong selection or caret mapping in the old app as well. QUESTIONS.md doesn't list it, so later clusters don't know it was kept on purpose.
- Fix: add a QUESTIONS.md entry that links the test. When the text-engine clusters are reviewed, check whether anything relies on `glyph.text` for HarfBuzz-shaped text.

### R4-A-008 (low): port-map.tsv points to files and decisions that don't match the code
- Old: next/docs/rewrite/port-map.tsv (rows for modules 0, 814, 885-888 and 89-997)
- New:
  - module 0 is in next/src/engine/core/object.ts, not type-system.ts;
  - 814 is next/src/app/locale/data/en.json, not en-US.json;
  - 888 is engine/core/locale/data/designer-diff.json, not sub-actions.en-US.json;
  - 885, 886 and 887 are marked "drop" but ship as web-trial.json, designer-temporary.json and cloud-diff.json (identical to the old data);
  - the opentype file names differ (text/opentype/README.md has a corrected table: 982 is font.ts, 997 is tables/loca.ts and so on).
- Differs: only the docs. Reviewers and scripts that follow port-map.tsv end up at missing files, and the drop decisions for 885-887 contradict the code.
- Fix: regenerate the target and decision columns for these rows from the code (or from the opentype README table), and change 885-887 from drop to data.

### R4-A-009 (low): length.ts points to a QUESTIONS.md entry that doesn't exist
- Old: public/chunk.vendor.js:30395-30398 (GLength.toString appends `o.Unit[this._unit]`, which is always undefined, so the result is "5undefined")
- New: next/src/engine/math/length.ts:122-132 ("kept, see QUESTIONS.md")
- Differs: QUESTIONS.md (Q-001 to Q-011) has no entry for it.
- Fix: add the entry, or remove the reference.

### R4-A-010 (low): setCMYKProfile no longer reads file:// locations
- Old: public/chunk.vendor.js:15462-15470 (a base URL starting with "file" is read with Node fs, and `done` is called in `finally`)
- New: next/src/engine/color/color.ts:94-105 (always fetch)
- Differs: the comment explains the drop: the new Electron shell serves over HTTP, and image.ts and the app pass "assets/data/icc/". If a caller ever passes a file:// base URL, fetch rejects, the error is swallowed and CMYK images quietly keep the naive conversion. No test covers it.
- Fix: none needed now. Optionally log a warning when the fetch fails, so a missing profile is visible.

### R4-A-011 (low): the mixin cache in object.ts can go stale if markMixins runs after hasMixin
- Old: public/chunk.vendor.js:101-105 (hasMixin reads `__gmixins__`, which every inherit copies at definition time; no cache)
- New: next/src/engine/core/object.ts:188-199 (collectMixins caches the merged set per prototype in a WeakMap) and :207-214 (markMixins adds ids later)
- Differs: the old code had no ordering dependency. If markMixins (or a defineMixin application) runs for a class after hasMixin has already been asked about that class or a subclass, the cached set misses the new id. Today markMixins runs at module load, before any instance exists, so I found no live case.
- Fix: clear the cache in markMixins (or drop the cache, since prototype chains are short), and add a test that calls hasMixin before and after markMixins.

### R4-A-012 (low): the order of event listener groups changed from numeric to insertion order
- Old: public/chunk.vendor.js:19340-19356 (removeAllEventListeners walks `Object.keys(this._listeners)` from the end: integer keys in ascending order, then "null")
- New: next/src/engine/core/event-target.ts:136-150 (Map keys in insertion order)
- Differs: only the order in which listeners are marked unregistered and spliced. Nothing observes that order, because no listener runs during removeAllEventListeners, so behaviour is the same. Noted so nobody later relies on the group order of `_listeners`.
- Fix: none, or say so in the class comment.
