# opentype (Gravit fork of opentype.js 0.11.0)

The old engine bundles a modified copy of opentype.js (chunk.vendor.js
modules 89 to 997). This folder ports it file by file to TypeScript. The
base is the opentype.js 0.11.0 source; every place where the bundle differs
from it is a Gravit change, marked with a `Gravit change` comment where it
lives and listed below. Do not upgrade to opentype.js 1.x: glyph outlines,
hinting and layout results are compared exactly with the old app.

Only `opentype.ts` is used from outside (by GOpenTypeFont, GOpenTypeUtil and
the PDF exporter): `parse`, `parseTableEntries`, `Font`, `Glyph`, `Path`,
`BoundingBox`, `load`, `loadSync`.

## Files

| Old module | File                                           | Upstream file                                |
| ---------- | ---------------------------------------------- | -------------------------------------------- |
| 89         | parse.ts                                       | parse.js                                     |
| 105        | check.ts                                       | check.js                                     |
| 115        | table.ts                                       | table.js                                     |
| 326        | path.ts                                        | path.js                                      |
| 376        | encoding.ts                                    | encoding.js                                  |
| 377        | types.ts                                       | types.js                                     |
| 378        | tokenizer.ts                                   | tokenizer.js                                 |
| 379        | char.ts                                        | char.js                                      |
| 529        | glyphset.ts                                    | glyphset.js                                  |
| 708        | opentype.ts                                    | opentype.js                                  |
| 709        | bbox.ts                                        | bbox.js                                      |
| 710        | tables/cmap.ts                                 | tables/cmap.js                               |
| 711        | tables/cff.ts                                  | tables/cff.js                                |
| 712        | glyph.ts                                       | glyph.js                                     |
| 713        | tables/head.ts                                 | tables/head.js                               |
| 714        | tables/hhea.ts                                 | tables/hhea.js                               |
| 715        | tables/hmtx.ts                                 | tables/hmtx.js                               |
| 716        | tables/ltag.ts                                 | tables/ltag.js                               |
| 717        | tables/maxp.ts                                 | tables/maxp.js                               |
| 718        | tables/name.ts                                 | tables/name.js                               |
| 719        | tables/os2.ts                                  | tables/os2.js                                |
| 720        | tables/post.ts                                 | tables/post.js                               |
| 721        | tables/gsub.ts                                 | tables/gsub.js                               |
| 722        | tables/meta.ts                                 | tables/meta.js                               |
| 723        | layout.ts                                      | layout.js                                    |
| 724        | util.ts                                        | util.js                                      |
| 725        | tables/glyf.ts                                 | tables/glyf.js                               |
| 982        | font.ts                                        | font.js                                      |
| 983        | tables/sfnt.ts                                 | tables/sfnt.js                               |
| 984        | draw.ts                                        | draw.js                                      |
| 985        | position.ts                                    | position.js                                  |
| 986        | substitution.ts                                | substitution.js                              |
| 987        | hintingtt.ts                                   | hintingtt.js                                 |
| 988        | bidi.ts                                        | bidi.js                                      |
| 989        | features/arab/context-check/arabic-word.ts     | features/arab/contextCheck/arabicWord.js     |
| 990        | features/arab/context-check/arabic-sentence.ts | features/arab/contextCheck/arabicSentence.js |
| 991        | features/arab/arabic-presentation-forms.ts     | features/arab/arabicPresentationForms.js     |
| 992        | features/arab/arabic-required-ligatures.ts     | features/arab/arabicRequiredLigatures.js     |
| 993        | features/feature-query.ts                      | features/featureQuery.js                     |
| 994        | tables/fvar.ts                                 | tables/fvar.js                               |
| 995        | tables/gpos.ts                                 | tables/gpos.js                               |
| 996        | tables/kern.ts                                 | tables/kern.js                               |
| 997        | tables/loca.ts                                 | tables/loca.js                               |

port-map.tsv guessed some of these names (it lists, for example, module 982
as hintingtt-glyph.ts and 997 as bidi.ts). The table above is the real
mapping, checked against the upstream sources.

test-fonts.ts and outline-info.ts are test support only. `__fixtures__`
holds reference values dumped from the old bundle running in Node.

## WOFF and pako

The fork inflates compressed WOFF tables with pako 1.0.11
(`inflate(data, { raw: true })`, after skipping the 2-byte zlib header)
instead of tiny-inflate. opentype.ts imports pako (a dependency of next/
at that exact version). `setInflate` swaps the inflater for tests;
`setInflate(null)` restores pako.

## Gravit changes

- opentype.ts: pako instead of tiny-inflate; parse accepts a DataView; a
  morx table sets `font.hasGHBTables` (the text is then shaped with
  HarfBuzz); parse throws "Font doesn't contain known CMAP table." without
  a usable cmap; `numGlyphs` is clamped to the glyphs read;
  `parseTableEntries` is exported.
- font.ts: `stringToGlyphs(text, options, chars)` passes `options.direction`
  to Bidi, can report the characters behind each glyph, and applies frac
  (numr/dnom around /, U+2044 and U+2215), locl (when a language is set)
  and a stylistic set (`features.stylisticSet`, e.g. "ss01"). The default
  render options gain `frac: false, stylisticSet: null`. `forEachGlyph`
  passes the glyph's characters (with `generateText`) and the kerning
  value to the callback and only adds non-zero kerning.
- substitution.ts: `getFeature` also answers locl (single substitutions)
  and numr/dnom (single plus alternates).
- layout.ts: a table without scripts gets an empty script list; new
  `getLangSysTags(script)`.
- bidi.ts: Arabic sentences are no longer reversed; `getTextGlyphs` can
  also return the characters of the tokens that weren't deleted.
- tokenizer.ts: the FAIL messages don't quote the name.
- tables/cmap.ts: also reads Macintosh platform sub-tables (encoding 0, 1, 10) and falls back to any Unicode-platform sub-table; reads formats 0, 6,
  10 and 13; returns null instead of throwing when nothing fits; the error
  for other formats doesn't name the format; `make` is the older
  format-4-only writer.
- tables/glyf.ts: getPath adds a lineTo to the start of every quadratic
  curve (two after an off-curve point), so TrueType paths have more L
  commands than upstream.
- tables/cff.ts: a missing nominalWidthX counts as 0.
- hintingtt.ts: the x/y axis and unit vector setters throw on impossible
  slopes instead of producing NaN; MDAP and ALIGNRP retry with the dual
  projection vector when a move throws ("microsoftWorkaround"); MIAP moves
  by the CVT value when the distance is 0; SZP* in fpgm/prep gives an empty
  twilight zone; IF/ELSE skipping stops at the end of the program.
- parse.ts: the fork has no `parseList32` (nothing used `Parser.list32`),
  so both are left out.

All other modules are identical to opentype.js 0.11.0.

## Old quirks kept

- forEachGlyph doesn't reset the kerning value per glyph: the last glyph
  is moved by the previous pair's kerning again.
- OpenSans has an empty GPOS table, so `defaultKerningTables` is `[]`
  (truthy) and the kern table is never used: opentype.js never kerns
  OpenSans.
- Font.getKerningValue uses `glyph.index || glyph`, so glyph 0 is looked up
  as the glyph object.
- Glyph's `unicodes || unicode !== undefined ? [unicode] : []` precedence bug.
- hintingtt.ts: FDEF ends at the first 0x2D byte even inside push data, so
  most bundled Noto fonts fail their fpgm and are rendered unhinted; glyph
  programs that write the CVT change it for later glyphs at the same ppem.
- os2 parses `usMaxContent` (sic) but make writes `usMaxContext`.
- FeatureQuery keeps the direction in one module-level value.

## License

opentype.js is distributed under the MIT license:

```text
The MIT License (MIT)

Copyright (c) 2017 Frederik De Bleser

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
