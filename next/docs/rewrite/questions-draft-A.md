# QUESTIONS.md drafts, group A

Entries for the coordinator to number and merge. Code comments point at the
titles.

## GLength.toString appends undefined

Old code: chunk.vendor.js module 132 (GLength), lines 30395-30398.

toString formats the number and then appends `Unit[this._unit]`. The Unit
table is keyed by the upper-case names (`Unit.PX = "px"`), but `_unit` holds
the lower-case value, so the lookup is always undefined and the result reads
"5undefined" or "1.2undefined". I haven't checked whether any UI path shows
this string; a later cluster that calls toString for display would show it.

Kept. Pinned by next/src/engine/math/length.test.ts ("5undefined",
"1.2undefined").

## Radial gradient center is lost on reload

Old code: chunk.vendor.js module 158 (GRadialGradient), lines 33135-33148.

_serializeToBlob writes a center other than 0.5/0.5 as `_cx`/`_cy`, but
_deserializeFromBlob reads `cx`/`cy`. A radial gradient whose center was
moved comes back centered after a save and load (or a copy and paste, which
goes through the same blob).

Saved files can contain `_cx`: the gradient editor only changes focus and
scale, but the importers create off-center gradients through the
constructor: the Sketch importer (module 1130, line 240084), the SVG import
through canvg (module 1391, line 247443), the PDF import (module 1404, line
250977) and the canvas-context shim of module 1216 (line 243610). So an
imported off-center radial gradient loses its center on the next load. This
looks like a plain bug (data loss); the open question is only whether files
that already rely on the reset exist.

Kept. Pinned by next/src/engine/style/gradient.test.ts ("writes the center
as _cx/_cy but reads cx/cy (kept old bug)"). A fix would read `cx` first and
then `_cx`, and belongs in BUGS-FIXED.md.

## HarfBuzz clusters used as string indexes

Old code: chunk.vendor.js module 587 (GOpenTypeFont.stringToGlyphs), lines
82208-82250.

When HarfBuzz shapes the text, each glyph's `text` is
`text.slice(cluster, nextCluster)`. HarfBuzz reports clusters as UTF-8 byte
offsets, but the slice uses them as UTF-16 indexes. For ASCII the two agree.
For any other text the slices drift: Arabic letters take two bytes, so from
about the middle of a word on the slices are wrong or empty
("مرحبا بالعالم" gives "مر", "حب", "ا ", ... and then six empty strings). The
text engine reads `glyph.text` (tl-canvas-context.ts falls back to the
character when it is empty), so HarfBuzz-shaped text may map carets or
selections wrongly in the old app too. Whether anything visible depends on it
needs checking when the text-engine clusters are reviewed.

Kept. Pinned by next/src/engine/text/fonts/harfbuzz.test.ts ("reports
clusters as UTF-8 byte offsets"), the shaping entries of
next/src/engine/text/fonts/__fixtures__/old-fonts.json, and the parity
scenario engine-model/fonts/browser-probe.
