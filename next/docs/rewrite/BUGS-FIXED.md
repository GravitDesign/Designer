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

## BUG-130 Port in use: the friendly error box never shows

Old code: electron-main.js (the port-in-use handler) and routes/ws.js (the
license WebSocket server attached to the same HTTP server).

- Reproduce: start the desktop app while another program listens on
  127.0.0.1:47823 (the fixed port since #6).
- Old: the license WebSocket server re-emitted the listen error on itself,
  where nothing listened, so it became an uncaught exception in the main
  process. Electron showed "A JavaScript error occurred in the main
  process", no window opened, the process kept running and held the
  single-instance lock, so the next start did nothing either. The app's
  own EADDRINUSE handler, which shows a readable message and quits, never
  ran.
- New: the new server has no license WebSocket server (it refuses
  upgrades), and electron/main.ts no longer re-throws the error, so the
  handler runs: a "Port 47823 is already in use..." box, then the app
  quits with code 0.
- Test: parity electron/port-in-use (new app, expected
  `port-in-use.fixed.json`: exit code 0, the showErrorBox event with that
  text, will-quit). It fails with the re-throwing listener back in place.
- Parity exceptions: electron/port-in-use. The .fixed file is the new
  app's recorded output; the old expected file records the uncaught
  exception box, a process that has to be killed and no will-quit.
## BUG-009 A painting error leaves the render phase on and the view stops repainting

Old code: chunk.vendor.js module 663, _paintAndRenderInternal (93530-93568,
scene.paint outside the try); module 103, tryRunRendering (25480-25489) and
render (the job registered at 25683 and only removed at 26022).

- Reproduce: make any element's paint throw (a bug in an effect, a broken
  shape), for example by patching an element's paint to throw, and let the
  view repaint. Then change anything and watch the view.
- Old: the tile renderer called scene.paint outside its try. An exception
  of the painting code left paintAndRender with the render phase still on,
  so every later repaint only queued or logged "render phase render,
  waiting" and thumbnails (page and symbol previews, which go through
  tryRunRendering while a render phase runs) queued forever. Only canvas
  errors (thrown at replay, inside the try) took the clean path. In
  tryRunRendering, a painting error also left the phase on, and a canvas
  error at replay cleared the render parameters and left its render job
  registered, so every later tryRunRendering went into the queue and never
  ran.
- New: the tile renderer finishes the canvas and the render phase in a
  finally and treats every painting error like the old canvas errors: it
  logs "Render error at canvas N:...", cleans up, calls back with
  (null, true, false) and goes on with the next request. tryRunRendering
  ends the render phase on any error, keeps the render parameters, leaves
  no job behind and starts the next queued rendering before it rethrows the
  error.
- Test: src/engine/paint/tile-cache.test.ts, "fails the tile on other
  painting errors and keeps painting afterwards (BUG-009)", and
  src/engine/paint/render-scheduler.test.ts, "ends the render phase on a
  canvas error in tryRunRendering and keeps rendering (BUG-009)" and "ends
  the render phase when the painting code itself throws (BUG-009)". All
  three fail with the old code (the error escapes the tile with the phase
  on; the parameters are cleared and the next rendering waits in the queue;
  the phase stays on).
- Parity exceptions: none. No recorded scenario paints an element that
  throws.

## BUG-010 setText leaves the text core's change events locked while a font is missing

Old code: chunk.vendor.js module 70, GText.setText (16684-16690).

- Reproduce: open a file whose text uses a font that isn't available yet
  (a Google font still loading, a local font that is gone). Restoring the
  text calls setText(content, true, true) with locked change events.
- Old: setText locked the text core's change events, found a run whose font
  wasn't resolved, marked the text to be set later and returned without
  unlocking. The core stayed locked until some later locked setText got
  through, so inline edits in that time sent no change events and never
  reached the text's content, and a save could write the stale text.
- New: setText unlocks the change events before it returns to wait for the
  font. The deferred setText once the font arrives is unchanged.
- Test: src/engine/text/text.test.ts, "unlocks the change events when
  setText waits for a missing font (BUG-010)" (the core's lock is 1 after
  the call with the old code, 0 now; old-text.json still records the old
  1).
- Parity exceptions: none. No recorded scenario restores a text with a
  missing font and then reads the lock or edits the text.

## BUG-011 A mask in a plain group erases everything painted before it

Old code: chunk.vendor.js module 911, GElement.Stylable _paintStyle (the
separate-canvas choice at 117590); module 122, GGroup._paintStyleContent
(28134).

- Reproduce: group a shape with another shape on top, give the top shape
  the blend mode Mask or Inverse mask in the inspector (appearance blend
  select), and leave the group at 100% opacity with normal blend and no
  effect. Or open parity/corpus/files/masks.gvdesign.
- Old: a group paints into its own canvas only when its opacity or blend
  mode needs one. A plain group painted its children straight onto the
  canvas below, so the masking child's destination-in (Mask) or
  destination-out (Inverse mask) composite hit that whole canvas: the page
  background and every element painted before the group were erased
  outside the mask (Mask) or inside it (Inverse mask), and in the view the
  page showed the transparency checkerboard. Only groups with an effect,
  an opacity below 100% or a blend mode masked just their own children. A
  masking child directly in a layer erased the page the same way.
- New: a group, layer or symbol with a direct child whose blend is Mask or
  Inverse mask paints through its own canvas (the same path a group with
  opacity takes), so the mask cuts only the siblings painted before it in
  that container. Saved files are unchanged.
- Test: src/engine/scene/group.test.ts, "with a masking child (BUG-011)":
  a plain group and a layer with an "m" or "!m" child paint through their
  own canvas, and a mask in a nested group isolates only that group. All
  four fail with the old code.
- Parity exceptions: parity/exceptions/BUG-011.json. Checked against the
  old app: with every masking group of masks.gvdesign set to an opacity of
  0.999999 (which isolates it there without changing a pixel), the old
  app's PNG and JPEG exports equal the new app's byte for byte, so
  io-export-bitmap/corpus/masks and the corpus preview, bitmap and view
  renders differ only by the isolation. The PDF export ignores mask blends
  in both apps (it draws the mask shapes as plain black shapes); its
  `.fixed` output differs from the old one only in a q/Q pair around each
  masking group and the gradient pattern matrices of the shapes inside
  them, which move by (-2, +18) in PDF space. That puts the gradients
  exactly on their rectangles (checked against the gradient stops); the
  old export drew them 2 px to the right. Pending:
  platform/gvthumb/corpus/masks and import-export/corpus/masks.

## BUG-012 Offset drops inset parts of an open path that come near the source

Old code: chunk.vendor.js module 651, GVertexOffsetter.generatePolyOffset
(87884-87903, the loop `B < w.count` at 87896).

- Reproduce: offset an open path to one side only on the inset side, where
  the inset crosses itself (a tight curve next to a long line): Modify >
  Offset with a negative value, Vectorize Border of an inside border, or
  inside text on a path. For example the path `M 42 94 L 25 13 C ...`
  of the pinned unit test, offset by 30 or 60.
- Old: the trimmed inset is split where it crosses itself, and each part
  that comes near the source again is meant to be clipped around the
  source's ends, as the outset side does with _excludeCircleInside. The
  inset loop ran up to `sourceHits.count`, which an array doesn't have, so
  it never ran and every such part was dropped: the inset lost pieces the
  outset of the same path keeps, and in the pinned case the result was
  empty.
- New: the inset loop runs over the source hits and clips a part near the
  path's ends with _excludeCircleInside, like the outset loop. Closed paths
  and two-sided offsets are not affected. The clipped parts have the same
  quality as the outset's: with an offset much larger than the path's
  curvature both sides can still cross the source. An inset of 0 on an
  open path now reaches the same "Cannot read properties of null (reading
  'point')" as an outset of 0 (QUESTIONS.md "Offsetter: offset 0 on an
  open path with both sides throws"); no caller offsets by 0. The clipping
  reached the old slip of QUESTIONS.md "Offsetter: the rest of a cut arc
  starts at an unset cut point" on the inset side, where it put NaN into
  the output, so the rest of a cut arc with no earlier line cut now starts
  at the second circle hit.
- Test: src/engine/geometry/vertex-offsetter.test.ts, "clips inset-only
  parts of an open path that touch the source near its ends (BUG-012)"
  (empty with the old code), and in vertex-offsetter.old-outputs.test.ts
  "keeps the inset parts of open paths that the old code dropped
  (BUG-012)". 33 of the 1,214 recorded old outputs change; their new
  outputs are in test-data/old-offsetter-outputs.fixed.json. Checked
  numerically: 32 are one-sided insets of open paths (one with a closed
  and an open sub-path), the 33rd (random snap 167) is a two-sided offset
  that only changes through the cut-arc start. Each new output has more
  vertices than the old one, none contains NaN, and every point of the old
  output lies on the new output (largest distance 0.000 after flattening
  both curves), so the fix only adds the parts the old code dropped. The
  one case that now throws is the offset-0 case above (random rr 36).
- Parity exceptions: none. No parity scenario offsets an open path on the
  inset side only (engine-geometry/pathops covers closed paths and
  two-sided offsets; all of them still match).

## BUG-013 Offset tangent point uses dx for y

Old code: chunk.vendor.js module 651, GVertexOffsetter._getSegmToArcSqrDist
(89212-89213, `g = c[0] * p + o.getY()` with p = dx).

- Reproduce: offset a path where a straight segment of the offset outline
  is exactly tangent to the circle of an arc of the source (rare; it
  decides which parts _gcppFilter keeps). Directly: the squared distance
  between the line (-20, 10)-(20, 10) and the quarter arc from (10, 0) to
  (0, 10) around (0, 0).
- Old: when the line touched the circle, the touch point was computed as
  (p1.x + t * dx, p1.y + t * dx) instead of p1.y + t * dy, so for any line
  that isn't at 45 degrees it landed off the line, the "touch point inside
  the segment" test failed and the distance fell back to the end points
  (200 instead of 0 in the example). An offset part that touches the
  source could then be kept although it should be dropped.
- New: the touch point uses dy for y.
- Test: src/engine/geometry/vertex-offsetter.test.ts, "puts the tangent
  point of the segment-to-arc distance on the line (BUG-013)" (200 with
  the old code). In vertex-offsetter.old-outputs.test.ts six of the
  recorded helper cases change, all to 0, listed in
  test-data/old-offsetter-outputs.fixed.json. Checked for each: the line
  touches the circle at a point of the arc that start, center and bulge
  define, or passes through the arc's given end point, so 0 is the right
  distance. None of the 1,214 recorded offset outputs changes.
- Parity exceptions: none. engine-geometry/pathops/offsetter still matches
  the old app.

## BUG-014 Boolean intersections: one collinear pair drops every later hit, quadratic-vs-curve hits unlimited

Old code: chunk.vendor.js module 187, _treeIntersect (38653-38662,
`f.splice(P)`, and 38669, `T.cp2 ? (I.cp2 ? w < 9 : w < 6) : I.cp2 ? 6 : 4`).

- Reproduce: path operations (Union, Subtract, Intersect, Difference) and
  compound shapes on the intersector path that keeps Béziers (compound
  shapes with many children, or after the 10 s timeout), with two paths
  that share a straight edge piece next to curves, or with a quadratic
  curve (from an import) against another curve.
- Old: when a segment pair turned out to be collinear, the hits already
  found for that pair were removed with `splice(index)`, which also removed
  every hit found after it, of any other pair, so the boolean worked with
  intersections missing. And the number of hits kept per curve pair was
  limited (cubic-cubic 9, cubic-quadratic 6, curve-line 3 or 2) except
  when the first curve was a quadratic and the other one a curve: there
  the expression gave the constants 6 or 4, which are always true, so every
  hit of the flattened curves was added. The result depended on the
  argument order: a quadratic against a nearly equal cubic gave 8 hits,
  the same cubic against the quadratic 6.
- New: only the collinear pair's own hits are removed
  (`splice(index, 1)`), and a quadratic against a cubic or a quadratic is
  limited to 6 or 4 hits, like the other way round.
- Test: src/engine/geometry/boolean/fixture-cases.test.ts, the targeted
  case "block.quadCubicNear" and "matches the seeded differential fuzz,
  seed 11", which now compare with old-fixtures.fixed.json (both fail with
  the old code), and "has fixed outputs only for recorded cases they change
  (BUG-014)". Three of the 2,045 recorded outputs change, checked against
  full (unhashed) outputs of the old and the new code:
  - block.quadCubicNear: the first 6 of the old 8 hits, the same 6 hits
    the old code already gave with the arguments swapped.
  - fuzz 11.23.bool0 and 11.23.bool5 (the same shapes, two settings): the
    same 7 intersections; the result of clipOp(2) keeps one more
    vertex, (78.429, 54.411), which lies on the straight edge from
    (86.635, 70) to (69.108, 36.701). The shape is the same.
  The collinear.* cases don't change.
- Parity exceptions: none. The engine-geometry/boolean and pathops
  scenarios still match the old app.

## BUG-015 Fonts whose weight is only in the typographic subfamily get weight 400

Old code: chunk.vendor.js module 726, GOpenTypeUtil.getOpenTypeInfo
(100134-100180).

- Reproduce: import OpenSans-Light.ttf, OpenSans-SemiBoldItalic.ttf or
  OpenSans-ExtraBold.ttf (Fonts > Import, or a local font in the desktop
  app), or any font family that keeps its extra weights in the
  typographic subfamily name.
- Old: weight and style were read from the subfamily name (name id 2)
  alone. Fonts with more than the four classic styles name only "Regular",
  "Italic", "Bold" or "Bold Italic" there and put the real weight into the
  typographic subfamily (id 17), so Open Sans Light, SemiBold and
  ExtraBold (and their italics) all came out as weight 400. They showed up
  as Regular or Italic duplicates, and a text asking for weight 600 never
  found the SemiBold file. Noto Sans CJK KR Bold got 400 too.
- New: the weight and the style come from the typographic subfamily when
  it names them, and from the subfamily otherwise, with the same keyword
  rules as before. Open Sans Light is 300, SemiBold 600, ExtraBold 800
  (italics keep their style), Noto Sans CJK KR Bold 700. Fonts without a
  typographic subfamily are read as before; the family name is unchanged.
- Test: src/engine/text/fonts/open-type-font.test.ts, "reports weight 600
  for OpenSans SemiBoldItalic from its typographic subfamily (BUG-015)"
  and "reads names and styles like the old reader, weights also from the
  typographic subfamily (BUG-015)", which compares the old recording
  (__fixtures__/old-fonts.json) with these seven weights changed and
  nothing else; the collection tests do the same for the collection's
  first font, OpenSans-Light. All fail with the old reader. font-probe.ts
  now asks for the light font of the test collection by the weight the
  reader reports (400 in the old app, 300 now), so its table offsets are
  still compared.
- Parity exceptions: parity/exceptions/BUG-015.json.
  engine-model/extras/opentype-helpers (Light 300, SemiBoldItalic 600,
  ExtraBold 800) and engine-model/fonts/browser-probe (the collection's
  first font 300); each `.fixed` file differs from the old output only in
  those weights (checked with a field by field diff). Pending, not
  enabled for the new app yet: electron/settings-persist,
  electron/migration-old-userdata and platform/storage/old-session-profile
  import an ExtraBold font (OpenSans-ExtraBold renamed to "Mig Fonts") and
  record it as weight 400; once enabled they should get 800.
