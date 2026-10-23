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
