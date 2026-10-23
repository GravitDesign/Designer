# QUESTIONS.md drafts, group D

Entries for the coordinator to number and merge. Code comments point at the
titles.

## GText: Windows line-break fix runs on every OS

Old: public/chunk.vendor.js, GText.setText (module 70, near 16660). New: next/src/engine/text/text.ts, setText.

The old code tests `GSystem.OperatingSystem.Windows` before replacing "\r\n". That is the enum value (1), not a check of the current OS, so the replacement runs on every platform.

Unclear: the intent was probably "only on Windows", but texts pasted on macOS or Linux have always had their CRLF replaced, and files depend on that.

Kept. Pinned by text.test.ts "lays out crlf" (old-text.json layout.crlf).

## GText: setText leaves change events locked while fonts are missing

Old: public/chunk.vendor.js 16687. New: next/src/engine/text/text.ts, setText ("Returns with the change events still locked").

With `lockEvents`, setText calls `core.lockChangeEvents(1)` and then returns early when a run's font isn't resolved yet, without unlocking. The core stays locked until some later setText with `lockEvents` that gets through.

Unclear: looks like a slip. Until the next locked setText, the GTL core sends no change events, so the text editor can stop reacting after a font goes missing. Candidate for a BUGS-FIXED entry.

Kept. Pinned by text.test.ts "keeps the old slips (events left locked, raw trf array throws)" (old-text.json quirks.lockAfterMissing = 1).

## GText: the pending content property is never found

Old: public/chunk.vendor.js 17123-17130. New: next/src/engine/text/text.ts, getTLCore (the pending properties loop).

When the core initializes, the loop over the pending property sets looks for one with `props.hasOwnProperty("content")`. `props` is an array of names, so this is always false and the loop always ends on the last entry.

Unclear: the intent was probably `props.indexOf("content") >= 0`. I haven't checked what a fix would change in files.

Kept. Pinned by text.test.ts "keeps text and properties until it has a workspace" (old-text.json waiting).

## GText: pending range flag written as rng, read as toRange

Old: public/chunk.vendor.js 17415-17420 (writes `rng`) and 17158 (reads `toRange`). New: next/src/engine/text/text.ts, PendingProperties.

setProperties before the core exists stores the "apply to the selection" flag as `rng`, but replaying the pending properties reads `toRange`, which is always undefined. Pending properties are always replayed without the flag.

Unclear: a renamed field that one side missed. It only matters before the core is initialized, where there is no selection anyway.

Kept. No direct test; the waiting case in text.test.ts runs the replay with the flag unset.

## GText: replaceFonts sets _tfs twice

Old: public/chunk.vendor.js 17984-17985. New: next/src/engine/text/text.ts, replaceFonts.

With a Font as replacement and `updateContent`, the old code assigns `$_tfs = font.getWeight()` and then `$_tfs = font.getStyle()`. The second write wins, so `_tfw` is never updated from the replacement font.

Unclear: the first line was probably meant to set `$_tfw`. Fixing it would change `_tfw` in files after the missing-fonts dialog.

Kept. Pinned by text.test.ts "replaces fonts (fontSetterContent)" and "(fontContent)" (old-text.json replaceFonts).

## GText: the font listener stays after the text leaves the workspace

Old: public/chunk.vendor.js 18206-18213. New: next/src/engine/text/text.ts, _handleChange (WorkspaceDetach).

On WorkspaceDetach the old code schedules `_updateFontManagerListener(true)` 100 ms later, but only when the workspace is gone by then, and `_updateFontManagerListener` does nothing without a workspace. A text that was waiting for a font keeps its FontAvailableEvent listener after it is deleted: the font manager keeps it alive and it still reacts when the font arrives.

Unclear: clearly meant to remove the listener. Candidate for a BUGS-FIXED entry (remove it with the font manager captured before the detach).

Kept. Pinned by text.test.ts "keeps listening for fonts after it leaves the workspace".

## GText: the border pattern check reads the text's own _ba

Old: public/chunk.vendor.js 18617. New: next/src/engine/text/text.ts, _paintBorder.

The border paint tests `this.$_ba !== Inside` on the text itself. Texts have no `_ba` property (it belongs to the border paint layer), so the test is always true and the pattern box is always widened by the border reach.

Unclear: the layer's `$_ba` was probably meant. Changing it changes the pattern box of textured borders on text.

Kept. Not pinned by a test in text.test.ts; the text painting tests of R4-D-008 cover border painting.

## GText: a legacy blob with a raw trf array throws

Old: public/chunk.vendor.js 18112. New: next/src/engine/text/text.ts, _restoreLegacy.

Restoring a pre-2 text blob (corner coordinates `tlx`/`trx`/`blx`/...) that has `trf` but no `ttrf` uses the raw stored array as a transform and calls `preMultiplied` on it, which throws a TypeError. The text can't be restored.

Unclear: probably `Transform.deserialize(blob.trf)` was meant. No such file is known to exist; old files with corner coordinates store `ttrf`.

Kept. Pinned by text.test.ts "keeps the old slips (events left locked, raw trf array throws)" (old-text.json quirks.rawTrf).

## GText: fake text reads only the first backup outline

Old: public/chunk.vendor.js 16880-16887 and 16915-16921. New: next/src/engine/text/text.ts, readVertex and hasVertexForRead.

A fake text (missing or embedded fonts, with `_bkpPath`) has one backup path per style run. readVertex and hasVertexForRead use `_vertexIterator`, which never moves on, so only the first backup path's vertices come out. The outline view border, vertex readers and exports of mixed-style text with missing fonts show only the first run.

Unclear: an old bug users can see. Fixing it changes outlines and exports of such texts. Candidate for a BUGS-FIXED entry.

Kept. Pinned by text.test.ts "reads only the first backup outline of a fake text" (old-text.json fakeVertices: two backups, the outline digest is the first one's).

## GText: the MAXLENGTH cut can split a surrogate pair

Old: public/chunk.vendor.js 17850-17869. New: next/src/engine/text/text.ts, _shorten.

The 8192 limit counts UTF-16 code units and cuts with `substr`. A string or run that crosses the limit in the middle of an emoji keeps a lone high surrogate, which is then stored in `content`.

Unclear: harmless for most text, but it writes malformed UTF-16 to the file.

Kept. Pinned by text.test.ts "cuts at MAXLENGTH code units, even inside a surrogate pair" (old-text.json maxLength).

## GText: undoing attachPath through the recorder leaves the text detached

Old: public/chunk.vendor.js 17452 (`"atPath" != V || this.isRecordedTransaction()`) and the recorded branch after it. New: next/src/engine/text/text.ts, setProperties.

When the transaction recorder replays `atPath`/`trf` (recordedTransaction set), setProperties skips all path work and only stores the values. In the probe, a text moved from one path to another and then undone through the recorder's revert actions ends with `hasPathAttached()` false, and redo doesn't attach it again either. The stored `atPath` and `trf` are the old ones.

Unclear: the editor's undo may restore the attachment by other means (it records more than these property changes); this is what the engine alone does. Check when the editor phase ports undo of "attach text to path".

Kept. Pinned by text.test.ts "undoes and redoes through the transaction recorder (attachUndone)" and "(attachRedone)".

## GTL parseFont reads oblique as strikeout

Old: public/chunk.vendor.js:35205 (GTLUtil.parseFont, module 161). New: next/src/engine/text/gtl/tl-util.ts (parseFont, case "oblique").

parseFont sets `strikeout: true` for the word "oblique" instead of an oblique or italic style. A CSS font string with "oblique" therefore gives an upright font with strikeout.

Unclear: looks like a copy slip (the italic case sits right above), but it decides how a parsed font string formats text, and fixing it would change the formatting of such runs.

Kept. Pinned by tl-core.test.ts "parses fonts and CSS like GTLUtil" (the `'oblique small-caps lighter 9px/1.5 "Quoted Family"'` case in gtl-probe.ts).

## GTL deCRLFify replaces only the first line break

Old: public/chunk.vendor.js:35259-35262 (GTLUtil.deCRLFify, module 161). New: next/src/engine/text/gtl/tl-util.ts (deCRLFify).

`String.prototype.replace` with a string pattern replaces only the first match, so only the first "\r\n" and the first remaining "\r" become "\n". Tabs are all replaced (that one is a /g regex). TLCore.setText runs it on every string, so text with Windows line breaks (pasted or set through the API) keeps stray "\r" characters after the first line.

Unclear: clearly meant to normalize all line breaks; the leftover "\r" is laid out and saved in `content`. A fix changes saved text, so it needs a BUGS-FIXED entry and a parity exception.

Kept. Pinned by tl-core.test.ts "parses fonts and CSS like GTLUtil" (`deCRLFify("a\r\nb\r\nc\rd\te\r")`).

## GTL Formatting.merge recurses forever on an array of runs

Old: public/chunk.vendor.js:32008-32010 (Formatting.merge, module 148). New: next/src/engine/text/gtl/formatting.ts (merge).

With one array argument merge folds it with `Array.prototype.reduce(merge)`. reduce passes four arguments (accumulator, value, index, array), and merge with more than two arguments wraps them into an array and calls itself again, so an array of two or more runs recurses until the stack overflows (RangeError). Range.getFormatting avoids it with its own two-argument wrapper.

Unclear: the array form never works for more than one run. Nothing in the engine calls it that way today, as far as I found.

Kept. Pinned by tl-core.test.ts "keeps the old slips: merge of a run array, deferred initialize, unknown codes" (`quirks.mergeArray` is "throws RangeError").

## GTL TLCore.initialize throws after deferred settings

Old: public/chunk.vendor.js:64021-64046 (GTLCore.initialize), 64775-64778 (_setDeferred), module 367. New: next/src/engine/text/gtl/tl-core.ts (initialize, _setDeferred).

Setters called before initialize store their value with _setDeferred, which writes every value under the key "name" (so only the last one survives). initialize then tests `hasOwnProperty(text)` with an undeclared `text`, which throws ReferenceError "text is not defined" whenever anything was deferred. The port throws the same error.

Unclear: the deferred settings never apply; a core that was configured before initialize can't be initialized. GText initializes its core before setting anything, so the app doesn't hit it as far as I found.

Kept. Pinned by tl-core.test.ts "keeps the old slips: merge of a run array, deferred initialize, unknown codes" (`quirks.deferredInit`: `{name: 10}` after setText then setWidth, then the ReferenceError) and "fires events, clones and handles an uninitialized core" (`fresh._deferredSettings`).

## GTL unknown code objects

Old: public/chunk.vendor.js:121145 (the word splitter reads `.block` of the resolved code), 74124-74130 (Part.DefaultInline.draw), modules 927 and 510. New: next/src/engine/text/gtl/characters.ts (WordSplitter), next/src/engine/text/gtl/inline.ts (DefaultInline).

A run whose text is a code object that no code resolves (`{ $: "NoSuchCode" }`) makes the word splitter throw (it reads `.block` of undefined), so TLDocument.load returns false and the text stays empty. Part falls back to DefaultInline for such codes, but that is never reached through load or splice. DefaultInline.draw would throw anyway: it calls `context.fillText`, which TLCanvasContext doesn't have, after Part.draw's `context.save()` and without the matching restore.

Unclear: DefaultInline looks like it was meant to show unknown codes as a "?" box, but neither path works. A file with an unknown code loses the whole text on load.

Kept. Pinned by tl-core.test.ts "keeps the old slips: merge of a run array, deferred initialize, unknown codes" (`quirks.unknownInline`: load false, empty text) and gtl-core-quirks.test.ts "Part.DefaultInline throws in draw on a context without fillText, after the box".

## GTL Per evaluates string mappers

Old: public/chunk.vendor.js:73843-73845 (module 509, the per library's toFunction). New: next/src/engine/text/gtl/list-util.ts (toFunction).

Per.map and Per.filter accept a string such as "x * 2" and turn it into a function with `new Function("x", "return " + mapper)`. No engine code passes a string; only gtl-probe.ts does, to pin the behaviour. Under a Content-Security-Policy without 'unsafe-eval' this branch would throw.

Unclear: dropping the branch (or throwing for strings) changes nothing for engine callers, but it is an API difference and the probe records the old result. The ready-shape port replaced Function() with a parser; here the eval stays for parity.

Kept. Pinned by tl-core.test.ts "runs per sequences" (the string mapper case in gtl-probe.ts).

## GTL undo splices at the start and rolls back in a cascade

Old location: public/chunk.vendor.js:89677-89688 (module 652, makeEditCommand), 90226-90236 (performUndo), 89759-89762 (layout rolls back through performUndo). New: next/src/engine/text/gtl/document.ts, makeEditCommand, performUndo and layout.

What it does: the inverse command of a word splice is built as `this.makeEditCommand(this, start, words.length, removed)`, so the document is passed as the start and the start as the count. Undoing an edit runs `words.splice(document, start, insertedCount)`: the document coerces to 0, so it deletes the first `start` words and puts a number into the word array. The next layout throws inside its try, finds no frame and calls performUndo again, which pops the next transaction, until the undo log is empty. After that the document has no frame and plainText and save throw. Redo then puts `undefined` into the word list as well. TLCore.undo/redo and every layout failure (for example a splice that can't lay out) go through this.

Why it's unclear: the editor never calls TLCore.undo (it has its own undo), so the only reachable path is the rollback after a failed layout, which then corrupts the document instead of restoring it. Passing the right arguments (`start, words.length, removed`) would make undo and the rollback work, but it changes what a failed layout leaves behind.

Kept. Pinned by next/src/engine/text/gtl/document.test.ts, "undoes and redoes setText", "setTextAtStart", "twoEdits", "toggleList", "toggleListOff" (recorded from the old app in __fixtures__/old-gtl-document.json). BUGS-FIXED candidate.

## GTL blocks never have a next block

Old location: public/chunk.vendor.js:89848-89850 (module 652, blocks: `next: { value: t[i + 1] }`, where `t` is the range, not the block list), used by listify at 119477-119491. New: next/src/engine/text/gtl/document.ts, blocks; next/src/engine/text/gtl/range.ts, listify.

What it does: every block that blocks() emits has `next` undefined, because it reads index `i + 1` of the range object. listify asks `next && next.isList()` to skip the closing ListEnd when a list follows; that never happens, so listify always appends a ListEnd and a following list is joined only by the edit filter, if at all.

Why it's unclear: the code clearly meant the next block. Reading it from the block list would change which runs listify writes when a list follows the listified range.

Kept. Pinned by next/src/engine/text/gtl/tl-core.test.ts, "edits blocks" (old-gtl.json), and the toggleList cases there.

## GTL edit filter decrements past zero after removing a stray list end

Old location: public/chunk.vendor.js:120521-120566 (module 920, GTLCodes.editFilter). New: next/src/engine/text/gtl/tl-codes.ts, editFilter.

What it does: when a ListEnd appears while no list is open, the filter splices it out, but then still pops the open-formatting stack and decrements the open count, so the count goes negative for the rest of that pass. The splice makes the filter run again, so the next pass starts from zero and the result is the same as removing the code.

Why it's unclear: probably a missing `break`/`else`. It has no visible effect that I found, since the splice triggers another pass.

Kept. Pinned by next/src/engine/text/gtl/document.test.ts, "repairs list codes: strayListEnd" and "endAfterList".

## GTL code names found on the old GTLCodes function

Old location: public/chunk.vendor.js:120254-120257 (module 920, `var n = c[e.$]; return n ? new n(e, t, i) : null`, where `c` is the GTLCodes function). New: next/src/engine/text/gtl/tl-codes.ts, codeFactory and failForFunctionProperty.

What it does: the old lookup also found names that aren't codes: the function's own `name` and `prototype`, and everything on Function.prototype and Object.prototype (`toString`, `call`, `bind`, `constructor`, `hasOwnProperty`, `__proto__` and so on). `new` on any of them throws: TypeError for the methods and values, SyntaxError for `constructor` (Function is called with the code object as a parameter name). `length` (0), `caller` and `arguments` (null on a sloppy function) give null. The port keeps the codes in a plain object and reproduces the throws for those names without calling them. In both apps a code object with an unknown name, thrown or not, makes loading the text fail (the word splitter reads `block` of the missing code), so the visible effect is the same; only TLCodes.codeFactory called directly differs.

Why it's unclear: only a malformed or hand-made file has such a name. Returning null for every name that isn't a code would be cleaner and changes nothing a user sees.

Kept. Pinned by next/src/engine/text/gtl/document.test.ts, "looks code names up like the old GTLCodes function object".

## Changing the scene's ms throws

Old: chunk.vendor.js 34945-34953 (GScene._handleChange, AfterPropertiesChange) and 34110-34123 (refreshPagesPositions).

Setting `ms` calls refreshPagesPositions, which calls `refreshPosition()` on every child of the scene. Pages and the styles container have no such method, so this throws a TypeError as soon as the scene has a child. If it has none, the next line reads an undeclared `mpIdx` and throws a ReferenceError. So `ms` can never be changed without an exception.

Unclear: `ms` looks like a leftover of an older multi-page layout; nothing in the UI seems to set it, but a file or plugin that does gets an exception from setProperty.

Kept. Tests: src/engine/scene/scene.test.ts "throws when ms changes: pages have no refreshPosition" and "throws the old mpIdx ReferenceError when ms changes and no child needs a position".

## Restoring a scene adds page keys to GScene.VisualProperties

Old: chunk.vendor.js 34807-34809 (GScene restore).

When a scene blob has page properties at the scene level (w, h, margins, bleed, bck, as files before 3.10 have), restore adds those names to the shared GScene.VisualProperties table itself, not to a copy. The table stays changed for the rest of the session: every scene made afterwards gets own `$w`, `$bl`, ... fields set to null. They are null, so they are not written into later files (checked: a scene stored after the leak has no w/bl/h keys).

Unclear: it looks like a slip (a copy was meant), but the visible effect is limited to the defaults table and the own null fields; nothing reads them through the scene, which forwards page properties to the active page.

Kept. Test: src/engine/scene/scene-probe.test.ts "visualLeak" (recorded in the old app, __fixtures__/old-scene.json). The same case also shows that restoring a scene blob without children and with w set throws a TypeError in both apps.

## Selector engine quirks

Old: chunk.vendor.js 73243-73790 (module 507, the Slick-based node selector engine).

- `:first-child` (and `:first`) never matches: it asks `index(node, 0)`, which counts children from 1.
- `:nth-child(3)` matches the second child, `:even` the 1st, 3rd, ... child and `:odd` the 2nd, 4th, ...
- `#id` asks the scene for `getById`, which GScene doesn't have, so it throws a TypeError.
- A single `.tag` passes the tag text where a RegExp is expected; it would throw once a node has tags, but no node class has the Tag mixin.
- The `^` combinator calls `+` with its arguments shifted, which throws a TypeError when the first child doesn't match.
- In a list (`a, b`) later groups don't skip nodes an earlier group found, so a node can appear twice.

Unclear: the engine itself only uses simple selectors (`page`, `layer:active`, `:selected`), so these are reachable only from plugins or future code that uses the full syntax.

Kept. Tests: src/engine/scene/selector.test.ts "keeps the old nth quirks", "repeats nodes found by an earlier group of a list", "throws from ^ when the first child doesn't match, as the shifted old call did", "throws for ids, since the scene has no getById".

## Nested transactions drop the outer actions

Old: chunk.vendor.js 71047-71090 (GTransactionRecorder.beginTransaction / endTransaction).

The recorder keeps one action list. beginTransaction replaces it, endTransaction returns it and stops recording. A transaction begun inside another therefore loses what the outer one recorded so far, and changes made between the inner end and the outer end are not recorded at all; the outer end returns null.

Unclear: whether any editor path nests transactions (for example a command that calls another command). If one does, undo of the outer step misses changes.

Kept. Test: src/engine/undo/transaction-recorder.test.ts "drops the outer actions when a transaction begins inside another".

## The page shadow needs the editor's paint configuration

Old: chunk.vendor.js 23164-23328 (GPage._paint).

In the multi-page view with pages that can overlap, a fixed-size page with a background reads `configuration.pageDecoration` for its drop shadow. Only GEditorPaintConfiguration has that field (the app sets its shadow at boot: blur 4, offset y 2, rgba(0,0,0,0.25)). A plain GScenePaintConfiguration with multiPageView set throws a TypeError there. Firefox on Windows draws a thin frame instead and passes 1 as the paint.

Unclear: whether any non-editor paint (export, thumbnails, a plugin) ever paints with multiPageView; if so it throws.

Kept. Test: src/engine/scene/scene-probe.test.ts "paint" (cases overlapNoDecoration and overlapShadow, recorded in the old app).

## Rebuilding an instance moves the master's children

Old location: public/chunk.vendor.js:42385-42405 (GSymbol.synchronize, the `else` branch taken by `synchronize(null, true)`).

What it does: the instance copies the master's properties, clears its children and appends a clone of each master child. The re-based transform (`_swapBaseTransforms(child trf, master trf, instance trf)`) is then written with `setProperty("trf", ...)` on the master's child, not on the copy. So every rebuild moves and scales the master's content by the instance's transform, and the copies keep the master's old transforms.

Why it's unclear: it reads like a typo (`e` for the copy), but it changes the master and every other instance, and the result is saved.

Kept. Pinned by engine-model/symbols-branches/synchronize-desynchronize (`masterAfterRebuild`, `rebuild`), run in Node by next/src/engine/scene/symbol-scenarios.test.ts.

## Rebuilding an instance keeps the old nodes in its sibling map

Old location: public/chunk.vendor.js:42385-42405 (same branch), with the sibling bookkeeping in `_afterNodeInsert`/`_beforeNodeRemove`.

What it does: `synchronize(null, true)` (and `synchronize(null, true, true)`) clears the children and inserts fresh copies, but the removed children's entries stay in `_siblingMap`. Each rebuild grows the map (25, then 46, then 67 entries for a 3-child instance with a path and an image in the scenario), and the stale entries still point at detached nodes.

Why it's unclear: probably an oversight. I haven't traced whether anything later reads the stale entries.

Kept. Pinned by engine-model/symbols-branches/synchronize-desynchronize (`onlySiblings`, `keepFrame`, `rebuild` sibling counts).

## Swapping for the same master drops the first swap pair

Old location: public/chunk.vendor.js:42760-42785 (GSymbol.swapWith, the `swp` cycle removal, "Strange swap array!").

What it does: inside an instance, each swap pushes the pair (old master, new master) to the parent's `swp`. When a pair has the same master twice (an instance of C swapped for C again), the repair branch runs `splice(0, 2)`, which removes the first pair of the array, not the pair it found. After B -> C, then C -> C, `swp` is [C, C] instead of [B, C]; swapping back to B then leaves [C, B] instead of an empty array. `swp` isn't saved, but `_translationSwapped` and `synchronize` read it for the rest of the session.

Why it's unclear: it looks like `splice(d - 1, 2)` was meant.

Kept. Pinned by engine-model/symbols-branches/nested-and-swaps (`swapSameAfterSwap`, `swapSameThenBack`).

## Instance texts miss master text changes made outside the text editor

Old location: public/chunk.vendor.js:43418-43556 (GSymbol text content merge in the property push), with GText.setText not writing `content` (module 70).

What it does: a master text's content change reaches an in-sync instance through a merge against the master's previous `content` value. setText doesn't store `content` right away (a new text has `content` null, later it lags one change behind), so the merge compares with a stale or empty previous text and finds nothing to apply. In the scenario an instance keeps "Hello world" at size 20 after the master's size is set to 30 and its text to "Hello there" without a selection. Only formatting a selection while the text is edited reaches the instance.

Why it's unclear: the instance looks in sync (no override is recorded) but shows old text. It may be a bug in the old app that users see when editing a master text through the inspector.

Kept. Pinned by engine-model/symbols-branches/text-merge (`size`, `text`, `collapsedText`), run in Node by next/src/engine/scene/symbol-scenarios.test.ts (not run against the new app yet: its parity build has no font providers).

## Image error cross ignores the crop origin

Old: public/chunk.vendor.js module 95, GImage._paintImageCanvas (24921-24936). New: next/src/engine/scene/image.ts, _paintImageCanvas.

An image whose bitmap failed to load paints the grey placeholder box (px, py, pw, ph) and a red cross over it. The two lines go from (px, py) to (pw, ph) and from (pw, py) to (px, ph), so they end at pw/ph instead of px + pw / py + ph. With a crop box that doesn't start at 0 the cross is off the box.

Unclear because it looks like a slip (end coordinates passed as sizes), but it is what users see for broken images in files with a crop.

Kept. Pinned by parity engine-model/image/paint-error (px 4, py 2, pw 30, ph 20).

## Image hit test throws on a degenerate transform

Old: public/chunk.vendor.js module 95, GImage._detailHitTest (24644-24689). New: next/src/engine/scene/image.ts, _detailHitTest.

The pixel hit test inverts itrf times the view transform and maps the location with it. When itrf or the view transform has a zero scale, inverted() returns null and mapPoint throws a TypeError. A null view transform throws at getScaleFactor(). An image without itrf is fine (identity times the view transform).

Unclear because a hit test that throws aborts the whole hit test of the page, but a zero-scale image can only come from a broken file or a degenerate transform.

Kept. Pinned by image.test.ts "throws for a null view transform (getScaleFactor)".

## Image preview canvas has the placeholder's size

Old: public/chunk.vendor.js module 95, GImage._updateTemporaryImage (24966-24984). New: next/src/engine/scene/image.ts, _updateTemporaryImage.

For a tmpUrl preview the image element gets width and height set to getWidth()/getHeight() before it loads, which is the placeholder size (iw x ih, or 100 x 100) because the image isn't loaded yet. _initImageCanvas then sizes the preview canvas from element.width/height, so the preview is drawn into a 100 x 100 canvas whatever the preview bitmap's size, while the shape box takes the preview's natural size.

Unclear because the preview is stretched to the placeholder size; it may have been meant to use naturalWidth/naturalHeight.

Kept. Pinned by parity engine-model/image/load-and-url (preview: canvas [100, 100], source box [0, 0, 8, 6]) and engine-model/image/paint-preview.

## Image grid layout and margin changes don't reset the outline

Old: public/chunk.vendor.js module 534, GImageGrid._handleChange (75741-75860). New: next/src/engine/scene/image-grid.ts, _handleChange.

The grid caches its vertices in _vertexSource. Only FinishGeometryUpdate (or a child insert, remove or geometry update of the images container) clears it. Setting `grid` or `mg` doesn't, so after reading the outline once, a layout or margin change keeps the old cells until something else sends a geometry update.

Unclear because the outline and hit area of the grid stay stale; the editor probably always triggers a geometry update around these changes, so users may never see it.

Kept. Pinned by image.test.ts "doesn't reset its vertices when the margin or the layout changes (kept)" and parity engine-model/image/grid-images (stale) and engine-model/special/image-grid.

## Image in a grid gets NaN offsets in itrf after it loads

Old: public/chunk.vendor.js modules 95 (GImage) and 534 (GImageGrid). New: next/src/engine/scene/image.ts, next/src/engine/scene/image-grid.ts.

An image added to a grid with addImage before its bitmap loads ends up, once loaded and fitted into its cell, with an itrf whose translation is NaN (trf is fine). I haven't traced where the NaN comes from; both apps give the same values.

Unclear because a NaN itrf looks wrong and would serialize as null; it may affect how such an image paints or saves.

Kept. Pinned by parity engine-model/image/grid-images (attached.props.itrf) and engine-model/image/paint-grid.

## Scene dictionary flush keeps the memory of dropped canvases

Old location: public/chunk.vendor.js 92356-92371 (GSceneDictionary.flush, module 658), with 92239-92272 (_updateReferences).

What it does: flush first calls _updateReferences(entries, true), which already deletes every entry without references from the map (removeEntry with `remove`). Its second loop, meant to delete those entries and call workspace.decreaseMemoryForImage on their cached canvas, then only sees the entries that survived, so it never gives the memory of a dropped canvas back. The workspace's image memory count only grows over a session of saves that drop images.

Why it's unclear: the second loop looks written to release the memory, so this reads like a slip, not a design. It has no visible effect until the budget (MEMORY_LIMIT) is reached, after which images stop caching.

Kept. Pinned by next/src/engine/style/scene-dictionary-scene.test.ts "flushes entries nothing uses" (recorded from the old app: `decreased` is empty).

## Texture swatches keep their plain url, so flush drops their entry

Old location: public/chunk.vendor.js 92188-92212 (_afterInsertEvent), 92229-92238 (_redirectUrl), 92239-92272 (_updateReferences).

What it does: when a swatch with a texture pattern is inserted, _afterInsertEvent sees a plain url and calls _redirectUrl, which creates a dictionary entry but only rewrites the url of paint layers and images, not of swatches. The swatch keeps its data url, the new entry has nobody pointing at it, and the next flush (every save) drops it again. Swatches that already hold a dictionary url are counted as references.

Why it's unclear: creating the entry has no effect except an extra entry until the next save, so either swatches were meant to be redirected too or the entry shouldn't be created.

Kept. Pinned by next/src/engine/style/scene-dictionary-scene.test.ts "counts swatches with dictionary urls".

## Symbol dictionary never removes its thumbnail listeners

Old location: public/chunk.vendor.js 121611-121614 (_afterInsert adds `this._updateThumbnail.bind(this)`), 121626-121630 (_beforeRemove removes a new bind), 121664-121681 (release removes the unbound method), module 933.

What it does: every master inserted into the scene gets a fresh bound listener for AfterThumbnailUpdate. _beforeRemove and release try to remove it with a different function (a new bind, or the unbound method), so nothing is removed. A removed master, or a master of a released scene, still writes its thumbnail into the dictionary entry, and each re-insert adds one more listener.

Why it's unclear: the remove calls show the intent to unsubscribe; the effect is a small leak and writes into entries that may no longer belong to the scene.

Kept. Pinned by next/src/engine/style/symbol-dictionary.test.ts "keeps listening to a master's thumbnails after removal and release".

## Removing a symbol dictionary entry without a value throws

Old location: public/chunk.vendor.js 121631-121663 (removeEntry with `remove`, `i.value.symbol`), module 933.

What it does: removeEntry(entry, true) reads `entry.value.symbol` before anything else; an entry whose value is null (an entry restored from a blob that saved only its id, or one added by hand) throws a TypeError. Without `remove` it only drops a reference.

Why it's unclear: entries saved with references have value null, so whether a caller can reach this with such an entry depends on the editor's symbol removal paths, which aren't ported yet.

Kept. Pinned by next/src/engine/style/symbol-dictionary.test.ts "throws when removing an entry without a value for good".

## GEmptyAnnotation restores none of its meta properties

Old location: public/chunk.vendor.js:235463-235468 (module 1035, GEmptyAnnotation `_handleChange`, Restore branch).

What it does: restore calls `restoreProperties(blob, GEmptyAnnotation.MetaProperties, ...)`. GEmptyAnnotation never had a `MetaProperties` static: GNode.inherit copies statics only from GSceneNode and GNode, and neither has one. So nothing is restored. A saved "ann" comes back with the defaults (text, uid, name, seq, rsv, rmd, loc, typ, email, read all lost), and the next save writes only "@". This is data loss for files that contain "ann" annotations.

Why it's unclear: it is plainly a slip (the shape annotations restore `GAnnotation.MetaProperties`), but the fix changes what old files load as and what the defaults-restored scenarios record. It is a BUGS-FIXED candidate: restore with `Annotation.MetaProperties` and `restoreAction`, with a parity exception.

Kept. Pinned by special-annotations.test.ts ("restores none of its meta properties (old slip)") and annotations-probe.test.ts ("empty: restored", "empty: saved", "empty: savedKeys"), recorded from the old app.

## Annotation model slips kept

Old locations and what they do:

- chunk.vendor.js:55319-55331 (GCommentAnnotation.initSizeAndPosition): when the pin already has an invertible `trf`, it calls `GTransform.invert`, which doesn't exist, so it throws a TypeError. A singular `trf` is left alone; no `trf` gets the icon transform. The editor's comment tool (107210-107211) only calls it on a fresh pin. PDF annotation import (238659) may call it after setting a `trf`, which would throw; that path isn't ported or tested yet.
- chunk.vendor.js:72948 (GAnnotationsList.getSelected): pushes into an undeclared `selectedAnnots`, so it throws a ReferenceError as soon as one annotation is selected, and otherwise returns `[]`.
- chunk.vendor.js:235442-235444 (GEmptyAnnotation.isVisible): tests `Flag.Hidden` of GSceneNode's flag table, which has no such bit, so it is always true.
- chunk.vendor.js:235477-235481 (GEmptyAnnotation `vis` change): sets or clears the Hidden flag and calls `_requestInvalidation`, which a scene node doesn't have, so changing `vis` throws a TypeError. Showing clears the flag before the throw; hiding throws before the flag is set.
- chunk.vendor.js:56612-56636 (GActionable.getActionsBBox): the row box doesn't move the second button and moves the third by the second's width plus 5, so the second button overlaps the first in the box.
- chunk.vendor.js:23756-23773 and 63928-63939 (GAnnotation `uid` change): adds the new uid to `read`, and throws a TypeError when `read` isn't an array.

Why it's unclear: each one is a slip in the old code, but none of them corrupts a file. Fixing them changes editor behaviour (selection of annotations, the comment pin, the review sidebar) that the editor phase has to check.

Kept. Pinned by special-annotations.test.ts ("throws on a second sizing, as the old GTransform.invert call did", "is always visible and throws when vis changes", "lays the buttons out right to left above the top right corner"), annotations-list.test.ts ("throws in getSelected once an annotation is selected (old slip)") and annotation.test.ts ("adds a new uid to read, and throws when read isn't an array").

## Hit tests of annotations throw without a transform

Old location: chunk.vendor.js:55116-55135 (GCommentAnnotation.hitTest), 75324-75331 (GCollabText._detailHitTest), 56637 (GActionable.hitActionTest).

What it does: GCollabText's hit test ends in `hitActionTest(location, transform)`, which maps the button box with the transform, so any hit test without a transform throws a TypeError (even a miss on the shape). GCommentAnnotation and annotations in an annotations list throw a TypeError when a tolerance is given without a transform and the paint box test passes but the shape test misses the fill (the outline test maps through the transform).

Why it's unclear: the editor always passes a view transform, so the app never hits this; other callers (tools, plugins) would.

Kept. Pinned by annotations-probe.test.ts ("comment: leftTolerance3", "list: hitEllipseOutline", "collab: hitNoTransform", "collab: detailNullTransform"), recorded from the old app.
