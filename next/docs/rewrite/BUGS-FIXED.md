# Bugs in the old app that the new app fixes

Each entry: how to reproduce, old behaviour, new behaviour, and the test that
covers it. Parity tests that diverge because of a fix name the entry id
(`BUG-NNN`) in their exception list.

## BUG-001 HarfBuzz wrapper writes past its buffer and leaks memory

Old code: the HarfBuzz wrapper in chunk.vendor.js (around module 838),
`setVariations`, `getGlyphs` and the string helpers.

- Reproduce: shape text with a variable font and set font variations (the
  text inspector's variation axes), with more than two axes.
- Old: `setVariations` allocated `8 * variations.length` bytes, but
  `variations` is an object, so the length is undefined and wasm got
  malloc(0); the loop then wrote 8 bytes per axis past that block into
  whatever followed it on the HarfBuzz heap. The feature struct passed to
  hb_shape and the temporary strings for tag and language lookups were
  never freed, so every shape call leaked a little heap.
- New: allocates 8 bytes per axis and frees the block, the feature struct
  and the temporary strings after use. HarfBuzz receives the same values,
  so shaping output is unchanged and no parity scenario differs.
- Test: src/engine/text/fonts/harfbuzz.test.ts, "BUG-001: HarfBuzz
  variations memory" (fails with the old size formula). The leaks have no
  observable output; they are covered by review only.

## BUG-002 Radial gradient center is lost on reload

Old code: chunk.vendor.js module 158 (GRadialGradient), lines 33135-33148.

- Reproduce: import an SVG, PDF or Sketch file with an off-center radial
  gradient (the importers set the center through the constructor), or open
  parity/corpus/files/fills-gradients.gvdesign, whose second radial fill
  is centered at 0.3/0.7. Save and open the file again, or copy and paste
  the shape.
- Old: _serializeToBlob writes a center other than 0.5/0.5 as `_cx`/`_cy`,
  but _deserializeFromBlob reads `cx`/`cy`, which nothing writes. Every
  load (and every paste, which goes through the same blob) resets the
  center to 0.5/0.5, and the next save drops it from the file for good.
- New: reads `_cx`/`_cy`, and still accepts `cx`/`cy` when `_cx`/`_cy` are
  missing. It writes exactly what the old app writes, so files stay
  compatible both ways: the new app reads old files with their center, and
  the old app still opens new files (and loses the center there, as
  before).
- Test: src/engine/style/gradient.test.ts, "BUG-002: keeps a moved center
  through save and load" (fails with the old reader: expected 0.5 to be
  0.2).
- Parity exceptions (each `.fixed` file equals the old output except that
  the center is restored):
  - engine-model/colors/gradients: radial.roundTrip keeps `_cx`/`_cy`,
    radialCenterRoundTrip.after is drawn at 20% 90%.
  - corpus/fills-gradients/document, corpus/fills-gradients/resave and
    compat/fills-gradients/roundtrip: the 0.3/0.7 gradient keeps
    `"_cx":0.3,"_cy":0.7`. The compat cross-app test (new app saves, old
    app opens) still matches the old expected file.
  - Not ported yet, will need a `.fixed` file from the new app's output:
    corpus/fills-gradients render-light, render-dark, preview and bitmap,
    platform/gvthumb/corpus/fills-gradients and
    import-export/corpus/fills-gradients (listed in exceptions.ts).
