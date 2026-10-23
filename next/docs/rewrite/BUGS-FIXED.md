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
  - io-export-svg/corpus/fills-gradients, io-export-pdf/corpus/fills-gradients
    and io-export-bitmap/corpus/fills-gradients: the exported gradient is
    centered at 0.3/0.7. The old app gives the same hashes when the file's
    `_cx`/`_cy` are renamed to the `cx`/`cy` its reader expects.
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

## BUG-006 SVG import fails on elements named like built-in object members

Old code: the canvg fork in chunk.vendor.js module 1391, CreateElement.

- Reproduce: import (open, place or paste) an SVG that contains an element
  whose local name is a member of Object.prototype, for example
  `<constructor/>` or `<toString/>` (custom namespaces and generated SVGs can
  contain such names).
- Old: the element table was read with a plain property lookup, so the
  name found Object or Object.prototype.toString instead of the "unknown
  element" placeholder; the import then threw ("child.toScene is not a
  function" / "ElementClass is not a constructor") and nothing was
  imported.
- New: only the element table's own names count; any other name gets the
  unknown-element placeholder like every other unknown tag, and the rest of
  the SVG imports normally.
- Test: src/io/import/svg/svg-parser.test.ts, "BUG-006: element names that
  are built-in object members" (both cases fail with the old lookup).
- Parity exceptions: none. No recorded scenario contains such an element.

## BUG-007 Vector textures drop out of exports after the view painted them

Old location: chunk.vendor.js module 14, GPaintCanvas._convertImage (lines
5054-5075), reached from GPaintCanvas.createTexture (the "pattern couldn't
have been created" warning, line 4476) and drawImage.

Reproduce: open a document with a vector texture fill (a texture pattern
built from nodes, such as the star tile in the corpus file
fills-textures.gvdesign) so that the view paints it, then export the page as
PNG, JPEG, SVG or PDF, or render it with GElement.toBitmap.

Old: the texture pattern caches the bitmap of its nodes the first time it is
painted. When the view paints it, that happens inside a render pass, so the
bitmap's canvas belongs to the command recorder and the bitmap hands out the
recorder's canvas object instead of the real canvas. _convertImage swapped
that object for the real canvas when it was given a recorded paint canvas,
but not when it was given a bitmap. A recorder resolved it later at replay,
so the view itself looked right, but every plain canvas rejected it:
createPattern threw, createTexture returned no pattern, and the fill was
left out. From then on the texture was missing from toBitmap, the bitmap,
SVG and PDF exports, for as long as the cached bitmap lived. Whether an
export showed the texture depended on whether the view had painted it first.

New: _convertImage returns the bitmap's real canvas, the same as for a
paint canvas, so a texture shows up in exports regardless of what the view
painted before. The rest of the recorder emulation stays (the RecorderCanvas
stand-in and RenderScheduler.isRecordedCanvas, which only served this case,
are gone). Saved files are not affected.

Test: next/src/engine/paint/paint-canvas.test.ts, "bitmaps of recorded
canvases": a bitmap made during a render pass gives a pattern of its real
canvas on a plain canvas without the warning, and draws there. Both tests
fail with the old behaviour (the stand-in gives no pattern and logs the
warning; drawImage throws).

Parity exceptions: next/parity/exceptions/BUG-007.json. No scenario enabled
for the new app shows the difference yet, because the new app has no view
(nothing paints in a render pass). Pending, to get .fixed files once they are
enabled: corpus/fills-textures/bitmap (the star tile is an empty cream
square in the old output) and import-export/corpus/fills-textures (PNG,
JPEG, SVG and PDF exports without the star). The preview, the canvas renders
and the gvthumb thumbnail show the star in the old output and need nothing.

## BUG-008 EPS/PS files with JPEG images can't be imported

Old code: server.js (no cross-origin isolation headers); the page side of
the JPEG handshake in chunk.vendor.js module 1404, GEPSParser jpeg (lines
251237-251270); the worker side in public/pscore.js, PSCore
waitForResponse and the DCTDecode filter.

- Reproduce: import (open or place) an EPS/PS file whose image data goes
  through DCTDecode, for example an image dict with `/DataSource currentfile
  /ASCII85Decode filter /DCTDecode filter`.
- Old: the PostScript worker can't decode JPEGs, so it asks the page and
  blocks in Atomics.wait on a SharedArrayBuffer until the page answers. The
  old server sent no COOP/COEP headers, so the page had no
  SharedArrayBuffer and every JPEG failed at once with the "Parts of the
  EPS file aren't supported..." message: error "02" and no image when the
  data isn't a JPEG the image reader accepts, error "0" and an all-black
  image of the right size for a real JPEG (image-dct-rgb.eps). With
  SharedArrayBuffer the handshake was broken too: the page signalled with
  Atomics.wake, which browsers have removed, so it threw and the worker
  slept until its 300-second timeout; the page told a size request by a
  byte view of length 2, which the 8-byte size area never has, so it wrote
  pixels where the size belonged; and the worker asked for as many bytes
  as its reader guessed (width x height for a gray image), so gray and
  CMYK images got the first part of the RGBA bytes instead of their
  samples.
- New: the server (and with it the Electron app's embedded server) sends
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless`, so the page and its
  workers are cross-origin isolated. credentialless rather than
  require-corp, so cross-origin images and fonts without CORS headers still
  load. Chromium supports it since 96 (Electron 45 runs Chromium 156 and is
  isolated), Firefox since 119; Safari ignores credentialless, so there the
  page is not isolated and JPEGs in EPS files still report error "02" as
  before. The handshake (src/workers/ps/jpeg.ts) names its request kind:
  the worker asks for the size, then for width x height RGBA pixels; the
  page answers with Atomics.notify, also when the browser can't decode the
  image (size 0 x 0, which the worker reports as error "02"). DCTDecode
  then delivers the JPEG's own components (gray, RGB or CMYK, read from
  the frame header) like PostScript does. The imported image equals the
  browser's decode of the JPEG pixel for pixel, and equals the old app's
  result for the same JPEG placed as a bitmap. A CMYK JPEG arrives as the
  browser's RGB turned back into CMYK without black, which the app's CMYK
  profile then converts; its colors can differ from the browser's view of
  the JPEG.
- Test: src/io/import/eps/eps-jpeg-import.test.ts runs EPSImport with the
  interpreter in a worker thread against Chromium-decoded pixels of RGB,
  gray and CMYK JPEG fixtures and the parity fixture filter-dct-file.ps
  (all four hang with the old code; with only Atomics.wake fixed, gray,
  CMYK and the undecodable JPEG still fail). The handshake on each side:
  src/workers/ps/jpeg.test.ts and the "EPSParser.jpeg" tests in
  src/io/import/eps/eps-parser.test.ts (fail with the old code).
  server/cross-origin-isolation.test.ts checks the headers on every kind
  of response. The interpreter recordings of filter-dct-file.ps and
  fixture-image-dct.eps get `.fixed.json` versions that differ from the
  old worker's only in the jpeg calls (checked by
  interpreter.recorded.test.ts).
- Parity exceptions: io-import-pdf-eps/eps/image-dct-rgb-eps (fixture
  image-dct-rgb.eps, an RGB JPEG photo next to a red square). The old app
  reports the "Parts of the EPS file aren't supported..." message (error
  "0") and leaves an all-black 80 x 60 image where the photo goes; the
  `.fixed` output has the decoded photo and no message, and the rest of
  the group is the same. io-import-pdf-eps/eps/filter-dct-file-ps embeds
  bytes no browser decodes and still ends with error "02" and an empty
  group in both apps; io-import-pdf-eps/eps/image-dct-eps and
  import-export/import/open/eps-image-dct.eps.state stop at ASCIIHexDecode,
  which the worker lacks, before the JPEG.
