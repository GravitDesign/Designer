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

## BUG-003 An empty annotation loses its meta properties on load

Old: public/chunk.vendor.js:235463-235468 (module 1035, GEmptyAnnotation `_handleChange`, Restore branch). Port: next/src/engine/scene/annotations/empty-annotation.ts.

Reproduce: deserialize `{"@": "ann", "text": "T", "uid": "u", "name": "N", "rsv": true}` and read the properties back, or open a file that contains an "ann" annotation, then save it again.

Old: restore called `restoreProperties(blob, GEmptyAnnotation.MetaProperties, ...)`. GEmptyAnnotation never had a MetaProperties static (GNode.inherit copies statics only from GSceneNode and GNode), so nothing was restored. A loaded "ann" came back with the defaults (text, uid, name, seq, rsv, rmd, loc, typ, email, read and the rest all lost), and the next save wrote only "@" and "@id".

New: restore uses Annotation.MetaProperties and the annotation restore action, like the text and collaborative text annotations. Store was always right, so the new app writes the same keys as the old app, and the old app opens the new app's files exactly as it opens its own (it still drops the values on load). Since restore now sets `vis`, loading an "ann" saved with `vis: false` would have hit the old `_updateVisibility`, which throws because a scene node has no `_requestInvalidation`. While restoring, the port only sets or clears the Hidden flag instead. Changing `vis` outside a restore still throws, as before.

Test: special-annotations.test.ts, "BUG-003: keeps its meta properties through save and load", "BUG-003: loads a hidden one without throwing" and "BUG-003: loads one with a uid and no read list". annotations-probe.test.ts replaces the old fixture's "empty" section (restored, saved, savedKeys) with the restored values. With the old restore, the first test and the three probe checks fail. Without the restore guard, the hidden-annotation test fails with a TypeError.

Parity exceptions: none (parity/exceptions/BUG-003.json lists no scenarios). No recorded scenario restores an "ann" that has meta properties set: engine-model/nodes/defaults-restored restores a bare `{"@": "ann"}`, which gives the defaults either way, and editor-tools/annotations/untooled-types builds its "ann" in the page instead of loading it.

## BUG-005 A ready shape without handles can't be saved

Old code: chunk.vendor.js module 530 (GSimpleShape), _handleChange store
branch, lines 75182-75190 (the throw is at 75187).

- Reproduce: activate the ready-shape tool with a shape that has no
  handles (Rectangle, Oval, Right Triangle, Diamond, Regular Pentagon,
  Heptagon, Decagon, Dodecagon or Minus from the catalogue, module 1542)
  and drag it onto the canvas, then use File > Download File. The toolbar's
  ready-shapes menu that does this (GToolbar.createSimpleShapesMenu) is
  only reached through a "simpleshape" tool category that no tool entry
  has, so in the shipped app it takes the menu's own code:
  `activateTool(GSimpleShapeTool, icon, true)` and `getActiveTool().init(def)`.
- Old: store loops over `_annotationsParamVals.length`, which is null for
  a shape without handles, and throws "Cannot read properties of null
  (reading 'length')". Node.serialize fails, so no file is downloaded and
  the document can't be saved at all (data loss). Copy, paste and
  duplicate go through the same store and fail too. Shapes with handles
  (Triangle, Rounded Rectangle and the others) save fine.
- New: a shape without handles stores `"apv":"[]"`, the same key with an
  empty list. The other keys (`ssn`, `icn`, `pvp`) are unchanged. Both
  restores read `"[]"` as an empty list (the old one checks only that
  `apv` is set), which draws the same shape as null because a shape
  without handles has no parameters. Checked both ways: a file the new
  app saved with Rectangle, Oval and Minus reopens with the same shapes and
  the same blobs in the new app and in the old app, and the old app can
  then save that file again (its store now finds a list).
- Test: src/engine/scene/simple-shape.test.ts, "saves a ready shape
  without handles with an empty list and restores it (BUG-005)" (fails
  with the old store: TypeError: Cannot read properties of null (reading
  'length')).
- Parity exceptions: none. No recorded scenario contains a ready shape
  without handles, because the old app can't save one: the
  corpus/shapes-ready file leaves them out (parity/corpus/documents.ts),
  and engine-model/nodes/defaults-restored still records `"<throws>"` for
  the blob of a bare restored Ready Shape, which fails earlier, on the
  missing processor.

## BUG-004 GAdjustMultiEffect loses its dot screen, sepia and blur settings on save

Old code: chunk.vendor.js module 535 (GMultiEffect `_handleChange`), used by module 1027 (GAdjustMultiEffect).

Reproduce: create a GAdjustMultiEffect, set `GGLSepiaEffect&shp` to `{ amount: 0.9 }` and `GGLBlurEffect&shp` to `{ radius: 12, clip: true }`, serialize it and deserialize the result.

Old: GMultiEffect stores and restores only its own table, fxP and fxN (written as `{}`, because the deep copy of the defaults turned null into `{}`). The effect is saved as `{"@":"adjustMultiEffect","fxP":{},"fxN":{}}` whatever its settings are, and comes back with the defaults (sepia 0.5, blur radius 5). GColorAdjustMultiEffect overrides the handler and stores its prefixed properties, so only GAdjustMultiEffect is affected. The old inspector has no entry for GAdjustMultiEffect (selecting an element that has one throws "Invalid effect/class"), so the settings can only come from the API or a file.

New: MultiEffect also stores and restores the class's `<effect>&<property>` properties (the sub-effect properties register() adds), each only when it differs from its default, as GColorAdjustMultiEffect does. fxP and fxN are still written as `{}`, so an effect with default settings is saved exactly as before. Restoring sets the values through setProperties, which hands them to the dot screen, sepia and blur effects. Files from the old app have none of the keys and open with the defaults, as before. The old app opens a file from the new app: its restore reads only fxP and fxN and ignores the extra keys, so the effect gets the defaults there (checked in the old app: the blob with `GGLSepiaEffect&shp` and `GGLBlurEffect&shp` deserializes without error, has the default settings and is saved again without the keys).

Test: next/src/engine/style/effects/gl-backed-effects.test.ts, "stores the changed effect settings and restores them into the effects" and "opens the old app's blob with the default settings".

Parity exceptions: next/parity/exceptions/BUG-004.json (engine-model/styles/effects-catalogue: the GAdjustMultiEffect blob has the two changed keys).
