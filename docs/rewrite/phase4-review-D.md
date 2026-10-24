# Phase 4 review, group D

Scope: clusters engine-text-gtl, engine-text-node, engine-scene-document, engine-symbols-images, engine-annotations-model, plus the interim app hooks in next/src/parity/app/document.ts.

Summary: no high findings. The ports follow the old code closely, including branch order, float order and the old quirks. Most findings are untested branches (undo, links, nested symbols, painting, file-format repair paths) and kept quirks that QUESTIONS.md doesn't list yet. Numbering is grouped by area: 001-099 GText, 100-299 GTL, 300-399 scene and document, 400-499 GSymbol, 500-599 images and dictionaries, 600-699 annotations.


### R4-D-001 (low): _preparePaint, _paint and _detailHitTest pass on arguments the old code dropped
Old: public/chunk.vendor.js:17816-17817 (`b.prototype._preparePaint.call(this, e)`), 18332-18337 (`b.prototype._paint.call(this, e)`), 17000-17001 (super hit test with 4 args).
New: next/src/engine/text/text.ts:2072-2073 (`super._preparePaint(context, arg)`), 2645-2650 (`super._paint(context, arg)`), 1176-1177 (passes `options` as well).
What differs: the old Text called its parent's methods with fewer arguments. Element._preparePaint forwards `arg` to isPaintable, then to getPaintBBox, then to _calculatePaintBBox. Only pages read `arg` today, and the paint box is cached after the first call, so I see no change in output right now. It is still a deviation from "same behaviour", and it would start to matter if a Text ever has children or if an override reads `arg`.
Fix: call `super._preparePaint(context)`, `super._paint(context)` and `super._detailHitTest(location, transform, tolerance, force)` like the old code did, or add a comment saying why forwarding is safe.

### R4-D-002 (low): the HITTEST_TEXT hit result has a plain array instead of a Uint8ClampedArray in `pixel`
Old: public/chunk.vendor.js:17039-17041 (`_.slice(C - 3, C + 1)` on ImageData.data).
New: next/src/engine/text/text.ts:1224-1226 (`Array.prototype.slice.call(data, ...)`).
What differs: the old result data was a Uint8ClampedArray, the new one is an Array. You only get here when Text.HITTEST_TEXT is true (the default is false), so this is a latent difference.
Fix: use `(data as Uint8ClampedArray).slice(bestIndex - 3, bestIndex + 1)` when `data` is typed, and keep `[0, 0, 0]` as the fallback.

### R4-D-003 (low): the quirks kept in GText are not in QUESTIONS.md
Old/new: the quirks are marked in comments in next/src/engine/text/text.ts at 766-768 (the Windows enum is always truthy, so CRLF replacement runs everywhere), 799-803 (setText returns with change events still locked when fonts are missing; old 16687), 1315-1316 (pending `props.hasOwnProperty("content")` is always false; old 17123-17130), 107-109 (`rng` is written but `toRange` is read; old 17415-17420 and 17158), 2254 (`$_tfs` is set twice; old 17984-17985), 2360-2361 (after WorkspaceDetach the font-manager listener is never removed; old 18206-18213), 2967 (`this.$_ba` is never set; old 18617) and 2460 (a raw `trf` array in a legacy blob throws; old 18112).
What differs: nothing at runtime. PORTING.md says each kept quirk gets a QUESTIONS.md entry, and QUESTIONS.md has no Text entries. Two of these can be seen by users. The locked change events can leave the text editor deaf after a font goes missing. The detach listener keeps deleted texts alive and lets them react to FontAvailableEvent.
Fix: add one QUESTIONS.md entry per quirk. Consider whether the two items above should become BUGS-FIXED candidates.

### R4-D-004 (low): fake text reads only the first backup path's vertices
Old: public/chunk.vendor.js:16880-16887 and 16915-16921 (`_vertexIterator` is never advanced).
New: next/src/engine/text/text.ts:1012-1018 and 1052-1059.
What differs: nothing, the port matches. But a fake text (missing or embedded font, with `_bkpPath`) that has several backup paths, one per style run, only gives out the vertices of the first path. This affects the outline-mode border, VertexTransformer users and anything else that reads vertices. It is an old bug that users can see in outline view and on export of mixed-style text with missing fonts, and it isn't documented.
Fix: record it in QUESTIONS.md. Add a unit test with two backup paths that pins today's behaviour, so a later fix is a deliberate choice.

### R4-D-005 (medium): the undo/redo branches of setProperties are not tested
Old: public/chunk.vendor.js:17452 (`"atPath" != V || this.isRecordedTransaction()`), 17703-17712 (moving the backup paths of a fake text by the trf delta), 18034-18035 (Store with `_isEdited` and `options.save === false` saves only the selection).
New: next/src/engine/text/text.ts:1692, 1951-1960, 2396-2397.
What differs: the code matches. text-probe.ts never calls the code while `isRecordedTransaction()` is true and never stores with `save: false`. These branches decide whether undoing a text-on-path change, or undoing a move of a fake text, gives the same file back. They also decide what text copy/paste puts on the clipboard while you edit.
Fix: add probe cases that run inside a transaction recorder: set `atPath` and `trf` on a text attached to a path, then undo and redo; transform a fake text and undo. Add one Store with `{options: {save: false}}` and a selection. Record the expectations in the old app as the other probe sections do.

### R4-D-006 (medium): direction changes and RTL path correction are not tested
Old: public/chunk.vendor.js:16427-16435 (_setDirection), 16442-16466 (_correctDirOnPath/_correctSideOnPath flip for mirrored RTL text), 17454-17456 and 17682-17689 (`dir` in setProperties and the trf pre-multiply).
New: next/src/engine/text/text.ts:508-517, 527-556, 1694-1698, 1933-1940.
What differs: the code matches. In the probe, "dir" only appears in the list of properties it reads (text-probe.ts:158). Nothing sets `dir`, and nothing puts RTL text on a path with a mirrored trf. The trf change here is written to the file.
Fix: add probe cases that set `dir` to RTL on plain text and on text attached to a path, with and without a negative x scale, and compare `trf`, `atPath` and the outline bounds.

### R4-D-007 (medium): replaceFonts, toFakeText and the deferred font setters with a replacement are not tested
Old: public/chunk.vendor.js:17891-17998 (replaceFonts), 17870-17874 (toFakeText), 17582-17662 (the `ee` setter with the `t` replacement, Font or family map).
New: next/src/engine/text/text.ts:2167-2269, 2133-2137, 1829-1912.
What differs: the code matches. These are what the missing-fonts dialog runs. They rewrite `content`, `$_tff`/`$_tfs` and the run families, and those values are saved. text.test.ts only covers waiting for a font and a font arriving later.
Fix: add probe cases for replaceFonts with a Font and with a `{family: family}` map, each with and without `updateContent`, on a text with pending deferred setters. Also cover toFakeText followed by store and restore.

### R4-D-008 (medium): text painting has no unit test, and the cluster lists one parity id
Old: public/chunk.vendor.js:18481-18601 (_paintTextFill: bitmap cache conditions, gradient texture transform, the desktop pixel read), 18603-18760 (_paintBorder: stroke width doubling, border area, outline mode), 18761-18795 (createShapePaint for GBackground).
New: next/src/engine/text/text.ts:2807-2848 (shared _textPaintTransform), 2855-2942, 2948-3071, 3074-3105.
What differs: the fill and border gradient math now lives in one shared helper, _textPaintTransform. It keeps the operation order, and I checked it term by term. In the fill, the RendererCanvas `isRendered()` test was dropped, as was the `!!c` part in the border. That falls under the accepted GRendererCtx deviation. But nothing tests any of this: no unit test, and next/parity/ported/engine-text-node.json lists only `engine-model/extras/opentype-helpers`. Gradient fills on text, Background (backdrop) fills, Inside/Center/Outside borders on text and outline mode are all unchecked.
Fix: add render parity scenarios for text with a solid fill, a linear gradient with a transform, a background fill, and center and outside borders at zoom 1 and 2, plus one in outline mode. List them in engine-text-node.json.

### R4-D-009 (medium): the pre-3.1 height repair and the re-layout on scene and workspace attach are not tested
Old: public/chunk.vendor.js:18214-18226 (SceneAttached: `_pre310`, `_legacyHeight`, `setProperty("h", ...)`), 17183-17196 (_getHeight repair), 18195-18205 (WorkspaceAttached re-attaching the path).
New: next/src/engine/text/text.ts:2366-2376, 1374-1387, 2344-2358.
What differs: the code matches. Opening an old file (`_pre310`) with a fixed-height text changes `h` and so changes the file, and nothing exercises that.
Fix: add a probe or parity case that loads a scene flagged `_pre310` with an `ah: false` text whose stored `h` is smaller than the laid-out height. Assert `h` after attach and after the fonts resolve.

### R4-D-010 (low): edge cases for MAXLENGTH and non-BMP text are not covered
Old: public/chunk.vendor.js:17850-17869 (_shorten uses `substr` on UTF-16 code units).
New: next/src/engine/text/text.ts:2110-2130.
What differs: nothing, the port matches. Cutting at 8192 code units can split a surrogate pair, for example an emoji, which leaves a lone surrogate in the stored `content`. No test covers a text at or over MAXLENGTH with astral characters, or runs where the cut falls on a run boundary.
Fix: add unit tests that pin today's behaviour: a string of 8191 ASCII characters plus an emoji, and runs whose total length crosses 8192 in the middle of the second run.

### R4-D-100 (medium): direction after path and LTR removal from a transformer chain are untested
- Old: public/chunk.vendor.js:64148-64187 (setDirection, the path-transformer branch that prepends a direction transformer, and the `remove()` branch for LTR)
- New: next/src/engine/text/gtl/tl-core.ts:255-290
- What differs: the code matches, but the probe only covers "direction first, then path" (circleRtl in gtl-probe.ts:934) and direction changes on a core without a path (gtl-probe.ts:963-977). Two branches never run: setDirection on a core whose head transformer is a path, which builds TLDirectionTextTransformer and calls `prepend`, and setDirection(LTR) when the direction transformer heads a chain with a path behind it, where `remove()` must return the path transformer as the new head. Both depend on TextTransformer.prepend/remove (module 650). A bug there would break text on a path that the user then flips to RTL or vertical.
- Fix: add a probe case to gtl-probe.ts: setPath(circle), setDirection(1), setDirection(2), setDirection(0). After each step record getTransformer().getType(), getTransformer("path") !== null, getRenderBounds() and a renderVertices digest. Record it from the old app and compare.

### R4-D-101 (medium): TLCore.render branches without a probe
- Old: public/chunk.vendor.js:64522-64736
- New: next/src/engine/text/gtl/tl-core.ts:678-860
- What differs: no behavioural difference found, but the draw probe (gtl-probe.ts:535-563) always calls `render(false, 1, style, flag)` with flags 1, 2, 1|4, 2|4. These are never exercised:
  - RENDERFLAG_SCALEBITMAP with a scale other than 1, which changes the bitmap size and setTranslate.
  - valign "b".
  - strokeAlign Outside (RENDERFLAG_OUTSIDEBRD, the DestinationOut fill).
  - RENDERFLAG_DRAWSELECTION with focused true.
  - FILL|STROKE in one call, where the stroke canvas becomes the fill canvas and the old stroke canvas is destroyed.
  - A second render with an unchanged size, which takes the clearRect path instead of a resize.
  - The copy into the fill and stroke canvases (copyInto). The probe swaps in a logger context, so the canvas copies are not compared.

  These paths decide text pixels at zoom levels other than 100%, for bottom-aligned text boxes and for outside borders on text.
- Fix: extend the draw list in gtl-probe.ts with `[8|1, scale 2]`, `{valign:"b"}`, `{strokeAlign:"O"}` with 2|4, 1|2, and `render(true, 1, ..., 16|1)`. Call render twice for one case. Also record the fill and stroke canvas sizes (`getCanvas(1).width/height`, `getCanvas(2) === getCanvas(1)`).

### R4-D-102 (low): kept GTL quirks have no QUESTIONS.md entry
- Old / new:
  - parseFont treats "oblique" as strikeout: public/chunk.vendor.js:35199 / next/src/engine/text/gtl/tl-util.ts:89.
  - deCRLFify replaces only the first "\r\n" and the first "\r": public/chunk.vendor.js:35240-35244 / tl-util.ts:150. Pasted text with Windows line breaks keeps stray "\r" after the first line.
  - Formatting.merge with an array of two or more runs recurses forever (RangeError), because reduce passes four arguments and merge re-wraps them: public/chunk.vendor.js:32008-32010 / formatting.ts:168-172. Range.getFormatting avoids it with its own wrapper.
  - TLCore.initialize throws ReferenceError when anything was deferred, and _setDeferred stores every value under "name": public/chunk.vendor.js:64021-64046, 64775-64778 / tl-core.ts:121-124, 910-913.
  - Part.DefaultInline.draw calls fillText, which TLCanvasContext doesn't have. A run with an unknown code object therefore throws during drawing, after `context.save()` and without the matching restore: public/chunk.vendor.js:74124-74130 / inline.ts:58-64.
- What differs: nothing. PORTING.md asks for a QUESTIONS.md entry for each kept quirk, and QUESTIONS.md has no GTL entries. The comments in the code mention some of them.
- Fix: add one QUESTIONS.md entry, "Q-0xx GTL quirks kept from carota/GTL", that lists the five items above. The deCRLFify item and the unknown-inline crash are candidates for later `fix:` commits with a parity exception.

### R4-D-103 (low): setText assigns `run.text` with strict semantics, where the old sloppy module ignored read-only properties
- Old: public/chunk.vendor.js:64092-64106 (`(t = i).text = e` in a non-strict module)
- New: next/src/engine/text/gtl/tl-core.ts:195 (`run.text = text as string`)
- What differs: the other GTL ports emulate sloppy writes with Reflect.set (word.ts:212, runs.ts:60, positioned-word.ts:127, formatting.ts:230), but setText doesn't. If getDocumentRange().getFormatting() ever returns a run whose `text` is read-only, the old code silently kept the old text and the new code throws TypeError. Such runs come from Object.create(run, {text: {value}}) in document.ts:516, range.ts:84/157/159 and TLUtil.derive. I tried insert-then-setText and the run that came back was writable (words are rebuilt from Characters), so I haven't found a reachable case.
- Fix: use `Reflect.set(run, "text", text)` with a comment like the ones in word.ts, or add a test that shows the run is always writable here.

### R4-D-104 (low): Measurement has own minX/maxX where the old one inherited them
- Old: public/chunk.vendor.js:73792-73808 (minX/maxX only on the prototype, never set by the constructor)
- New: next/src/engine/text/gtl/measurement.ts:11-12 (class fields, own properties)
- What differs: `Object.keys`, `hasOwnProperty` and JSON.stringify of a bare Measurement now list minX/maxX. The OpenType meter sets them anyway, so this only shows on `new Measurement()` from Part with DoMeasure false or a code without measure. I found no reader that enumerates them.
- Fix: none needed. Optionally `declare minX: number` plus `Measurement.prototype.minX = 0` to match exactly, or a one-line comment.

### R4-D-105 (low): TLNode.previous and byCoordinate return null where the old code returned undefined
- Old: public/chunk.vendor.js:51142-51151 (`return n ? n.last() : null`, and last() can be undefined), 51163-51180 (byCoordinate returns `i`, possibly undefined)
- New: next/src/engine/text/gtl/node.ts:70 (`?? null`), 106 (`found ?? null`)
- What differs: undefined becomes null. Callers in the GTL test truthiness, so I found no visible effect. A `=== undefined` check in a later editor port (text tool hit testing) would behave differently.
- Fix: return `parentPrevious.last()` and `found` unchanged and widen the return type to `TLNode | null | undefined`, or add a comment that callers only test truthiness.

### R4-D-106 (low): Per keeps `new Function` for string mappers
- Old: public/chunk.vendor.js:73843-73845
- New: next/src/engine/text/gtl/list-util.ts:54-56
- What differs: nothing. The ready-shape port replaced Function() with a parser to avoid eval, but here the eval stays. Only gtl-probe.ts:328 uses a string mapper, and the engine never does. It breaks under a CSP without 'unsafe-eval'.
- Fix: since no engine caller passes a string, throw for string mappers or drop the branch, and record the change in QUESTIONS.md. Or keep it and add a comment that only the probe uses it.

### R4-D-107 (low): TLCode and RenderFlags no longer throw when instantiated, and Per.pulse is untested
- Old: public/chunk.vendor.js:64794-64796, 64805-64807 (constructors that throw "cannot be instantiated"), 74024-74031 (pulse)
- New: next/src/engine/text/gtl/tl-code.ts, render-flags.ts (plain const objects); list-util.ts:245-252
- What differs: `new GTLCode()` through the parity bridge now fails with "not a constructor" instead of the old message. Nothing calls it. Per.pulse (setTimeout-driven) has no test.
- Fix: none needed for the constants. Add a fake-timer unit test for pulse: it emits 0, 1, 2 and stops when emit returns true.

### R4-D-200 (medium): undo and redo of a text document never run in a test; the inverse command is broken in the old code and in the port
- Old: public/chunk.vendor.js:89677-89688 (makeEditCommand logs `this.makeEditCommand(this, e, i.length, a)`), 90226-90236 (performUndo), 89759-89762 (layout rolls back through performUndo).
- New: next/src/engine/text/gtl/document.ts:102-121, 720-731, 193-198.
- What differs: nothing; the port keeps the quirk and says so in a doc comment. But the inverse command gets the document as its start, so undoing an edit runs `words.splice(doc→0, wordIndex, insertedCount)`. It deletes the first words of the document and puts a number into the word array. The next layout throws inside its try, finds no frame, and calls performUndo again, which pops the next transaction, and so on until the undo stack is empty. TLCore.undo/redo and every layout failure go through this. The probe only reads canUndo and undo.length (gtl-probe.ts "undo" edit); performUndo itself never runs, so a port change here would not show. The quirk is also missing from QUESTIONS.md.
- Fix: add a probe edit that calls core.undo() and core.redo() after a setText and after a toggleList, and records words, frame presence and plainText, then re-record old-gtl.json from the old app. Add a QUESTIONS.md entry for the broken inverse command and the rollback cascade. Because layout failure rolls back through it, consider a BUGS-FIXED entry later that passes the right arguments to the inverse.

### R4-D-201 (medium): edit filter repair branches are untested
- Old: public/chunk.vendor.js:120521-120566 (GTLCodes.editFilter).
- New: next/src/engine/text/gtl/tl-codes.ts:362-397.
- What differs: nothing found by reading. But only the toggle and list depth edits reach the filter. Three branches are never forced: a ListNext outside a list that becomes a ListStart, a stray ListEnd at depth 0 that is removed (note that the old code still pops and decrements after removing it, so `open` goes negative), and closing open lists before the eof word. The listUnclosed layout case loads an orphan ListNext but load() never runs the filters, so that case doesn't reach them either.
- Fix: add probe edits that splice runs with an orphan `{ $: "ListNext" }`, a stray `{ $: "ListEnd" }` and an unclosed ListStart into a plain document (doc.splice with a run array), and compare the saved runs with the old app.

### R4-D-202 (medium): failure paths of load, spliceWordsWithRuns and checkSanity are untested
- Old: public/chunk.vendor.js:89708-89729 (load returns false when splitting throws), 89960-89978 (spliceWordsWithRuns returns without an edit when a word can't be measured), 90009-90024 (checkSanity false on exception).
- New: next/src/engine/text/gtl/document.ts:141-162, 429-442, 474-485.
- What differs: nothing found. None of the probe cases makes word measuring throw (Word throws "Couldn't measure text" when a Part constructor throws, for example a code whose measure returns null or a missing font measure). The false branch of checkSanity is what keeps listify and unlistify from applying a change that would not lay out (range.ts:94, 190), and it is never taken.
- Fix: add a probe case with a custom code whose measure throws (through doc.customCodes) and check load's result, the unchanged words after a splice, and listify returning false.

### R4-D-203 (low): codeFactory no longer finds names on the function prototype chain
- Old: public/chunk.vendor.js:120254-120257 (`var n = c[e.$]; return n ? new n(e, t, i) : null` on the GTLCodes function object).
- New: next/src/engine/text/gtl/tl-codes.ts:406-412.
- What differs: the old lookup also found inherited and own function properties: `$` of "toString", "call", "bind", "constructor", "name", "length", "prototype" and so on. `new` on those throws (or, for "constructor", calls Function with the run object as source and throws a SyntaxError), so word measuring fails and load returns false. The port uses hasOwnProperty on a plain object, so those names give null and fall through to customCodes, and the text loads with an unknown code. Only a malformed or hand-made file reaches this.
- Fix: keep as is, but add a QUESTIONS.md note, or mimic the old behaviour by throwing for names that are not own keys but exist on Function.prototype or as function own properties. A unit test with `{ $: "toString" }` should pin whichever is chosen.

### R4-D-204 (low): kept quirk in blocks() is not in QUESTIONS.md
- Old: public/chunk.vendor.js:89848-89850 (`next: { value: t[i + 1] }` reads the range, not the block list).
- New: next/src/engine/text/gtl/document.ts:285-293.
- What differs: nothing. The doc comment says `next` is always undefined. Because of that, listify always appends a ListEnd (range.ts:126-133, old 119477-119491 `u && u.isList()`; port `next && next.isList()` is never true), and joining with a following list relies on the edit filter. The probe "blocks" edit pins it. It is not listed in QUESTIONS.md.
- Fix: add a QUESTIONS.md entry next to the undo one (R4-D-200).

### R4-D-205 (low): misleading comment on the pattern fill in vertex drawText
- Old: public/chunk.vendor.js:91154-91163.
- New: next/src/engine/text/tl-canvas-context.ts:594-608.
- What differs: behaviour is the same. The comment says the converted pattern style is "overwritten right below". It is not: the next line assigns `this.fillStyle`, whose getter reads the canvas fillStyle that was just set, so the converted style stays unless a default fill is set. The comment should say that.
- Fix: reword to "kept unless a default fill other than transparent is set: the fillStyle getter reads it back".

### R4-D-206 (low): RendererCanvas unwrapping in the constructor is dropped without a note
- Old: public/chunk.vendor.js:90660-90664 (`t instanceof d.RendererCanvas ? t = t.parent`).
- New: next/src/engine/text/tl-canvas-context.ts:103-108.
- What differs: the recorder's canvas wrapper is gone (accepted deviation), so the branch has nothing to match. TLCore is the only caller (tl-core.ts:117). The constructor only mentions the HTMLCanvasElement case.
- Fix: add a one-line comment that the old RendererCanvas branch belonged to the dropped recorder.

### R4-D-207 (low): list marker numbering edges are untested
- Old: public/chunk.vendor.js:120898-120931 (roman and letter numbering).
- New: next/src/engine/text/gtl/list-markers.ts:188-210.
- What differs: nothing found. The probe lists have at most a few items per level, so these are never checked against the old code: letters past the 25th item (index % 25, then repeats: "a", ..., "y", "aa"), roman numerals from 4000 on, and the loop step past the table that compares with NaN. RomanBracket and depths 3+ (kind 0 again) are only covered by single items.
- Fix: add a unit test that builds RomanDotCode and RomanBracketCode for paths like [0,24], [0,25], [0,50], [0,0,3998], [0,0,0,4] and compares with values computed from the old function (it is self-contained, so it can be copied into the test as the oracle).

### R4-D-208 (low): untyped `as never` casts without a reason comment
- New: next/src/engine/text/gtl/document.ts:88, 109, 152, 333, 395, 438; next/src/engine/text/tl-canvas-context.ts:597, 603, 619, 624; next/src/engine/text/gtl/range.ts:165; next/src/engine/text/gtl/tl-codes.ts:411.
- What differs: `as never` turns off type checking the same way `any` does, which PORTING.md asks to justify. Most are fine (calling a paint canvas method with the text context as `this`, the dynamic splice), but none says why. document.ts:152/438 cast a WordSpan | null that already matches Word's parameter after `.truthy()`.
- Fix: replace the casts that aren't needed with the real types, and add a short reason comment on the others (the createPatternPaint.call calls need the paint canvas `this` shape; the splice.apply call keeps the old dynamic arguments).

### R4-D-209 (low): the default font meter has no test
- Old: public/chunk.vendor.js:121168-121201 (module 928).
- New: next/src/engine/text/gtl/default-font-measure.ts:17-41.
- What differs: nothing found. TLCore installs the OpenType meter instead, so nothing calls this and no test runs it, including the unresolved default font branch that returns an empty Measurement.
- Fix: add a small unit test with a fake font manager for both the resolved and the unresolved default font, or note in the file that it is dead code kept for the module.

### R4-D-300 (medium): link bookkeeping events and block-reference mode are untested
Old: public/chunk.vendor.js:34617-34715 (`_refreshLinks`), 34021-34029 (`startBlockReferenceChanges`/`endBlockReferenceChanges`), 34030-34051 (`_cleanupLinks`), 33898-33922 (`unlink` with `_temporarilyDisabledLinks`).
New: next/src/engine/scene/scene.ts:1658-1745, 833-875, 668-701.
What differs: nothing found on reading, but no unit test or ported scenario fires a GReferenceEvent (linked true/false) out of `_refreshLinks`, or runs `startBlockReferenceChanges` → link/unlink (suppressed) → `endBlockReferenceChanges(keep)` and the re-merge of `_temporarilyDisabledLinks`. engine-model/scene/links-and-references only calls link/unlink/isLinked/linkCount/refCount/visit*. These paths drive undo of style/master/symbol links (editor phase) and shared-style repaint.
Fix: add scene.test.ts cases: (1) listen for ReferenceEvent on a node, link then unlink it to a style, assert one `linked=true` then one `linked=false`; (2) remove a linked node, call `_refreshLinks`, assert its id lands in `_temporarilyDisabledLinks` and comes back when re-inserted; (3) block mode: `startBlockReferenceChanges`, `link`, assert `_links` unchanged, `endBlockReferenceChanges()`.

### R4-D-301 (medium): restore-time link repair branches are untested
Old: public/chunk.vendor.js:33739-33857 (`_recreateLinksLookup`).
New: next/src/engine/scene/scene.ts:493-626.
What differs: same code, but these branches have no test: re-identified reference (`getOldReferenceId` in `_links` moves to the new id), legacy text `rtxt` linking with its ReferenceEvent and the "text links but no other link" throw (new comment at 614 says it throws, nothing checks it), style links rebuilt from `sref` including rewriting `$sref` from the old reference id, the "Inexistent links found" cleanup splice, and "Invalid reference id." deletion. legacy-scene only feeds a path with `rtxt: "abc"` that matches nothing. These run on every paste/import of linked content.
Fix: build blobs for each case in scene.test.ts (two scenes in one workspace so ids collide, a text with `rtxt` naming a path's reference id, an element with `sref` of a style, a `_links` entry whose scene id is not in `__ids`, a `_links` key with no reference) and assert the resulting `_links`/`_linksLookup`; add a parity scenario for the paste-into-second-scene case since it is file-visible.

### R4-D-302 (medium): even/odd master assignment on insert and removal is only partly covered
Old: public/chunk.vendor.js:34509-34616 (`insertChild` page branch, `removeChild`, `reassignMasterPages`, `_fixSingleMpg` with `plkt` NoEdit), 34124-34155 (`insertPage` picks `empg`/`ompg`/`mpg` by parity of the count).
New: next/src/engine/scene/scene.ts:1522-1550, 1600-1655, 981-1016.
What differs: nothing found. engine-model/scene/master-pages sets `ompg`/`empg` and stores; no test inserts or removes a page afterwards to check the reassignment, nor the `plkt & NoEdit` skip, nor `insertPage` copying size from the even master for page 2.
Fix: unit test: set ompg/empg, insertPage twice, assert page 1 links ompg and page 2 empg and the copied w/h; remove page 1 and assert the old page 2 is now linked to ompg; set `plkt` NoEdit on a page and assert its link is left alone.

### R4-D-303 (medium): multi-page paint, hit test and collisions have no unit coverage
Old: public/chunk.vendor.js:34308-34352 (`_paintChildren` multiPageView), 34368-34429 (`hitTest` multiPage/annotations), 34430-34460 (`getCollisions` multiPage).
New: next/src/engine/scene/scene.ts:1214-1272, 1300-1410, 1414-1450.
What differs: arguments and branch order match (checked tolerance at index 5, multiPage at 10, annotations at 11). Untested: pagesCanOverlap sort (active page last when painting, first when hit testing), the fallback that returns `[candidates[0]]` (a page, not an ElementHit) when nothing inside a page is hit, annotation hit testing per page, and the dirty matcher re-transform chain `shift.preMultiplied(previous.inverted())`. These are editor-phase paths, so parity can't reach them yet.
Fix: unit tests with two fixed pages side by side: hitTest with multiPage on the second page's area returns that page's element; on empty page area returns `[page]`; getCollisions with multiPage returns elements of both pages shifted by their positions; a fake dirtyMatcher records the transforms passed while painting.

### R4-D-304 (medium): page painting branches (background, masters, clip, shadow, thumbnails) are only covered by a few renders
Old: public/chunk.vendor.js:23164-23328 (`_paint`), 23537-23630 (`_invalidationFinishedHandler`, `paint`, `_getPageThumbnail`), 23519-23527 (`getPageImage`).
New: next/src/engine/scene/page.ts:794-978, 1186-1287, 1168-1177.
What differs: nothing found. Untested: texture background with `createTextureTransform`, paint with `transform` (gradient) path, master page background + children painted under the page with clip to bleed vs clip to the master box, the Firefox-on-Windows frame and the shadow branch (reads `configuration.pageDecoration`, which only GEditorPaintConfiguration has, so a plain ScenePaintConfiguration with multiPageView and pagesCanOverlap and a background throws a TypeError in both apps), the infinite-canvas colour background, and thumbnail generation/AfterThumbnailUpdate.
Fix: add page.test.ts cases with a recording PaintCanvas stub for each background kind and for a page linked to a master (assert clipRect args and fillRect order), and one for `_getPageThumbnail` sizes (e.g. 800x600 page, 100x100 max gives a 100x75 canvas and scale 0.125). Note the pageDecoration throw in QUESTIONS.md.

### R4-D-305 (low): DefaultStyles writes a fallback `_sdf` when annotation classes are not registered
Old: public/chunk.vendor.js:118989-119000 (`a.getTypeId(h)` with the class imported directly, always registered).
New: next/src/engine/style/default-styles.ts:89-93 (`classTypeId` falls back to `lookupOldTypeId`).
What differs: the old module required every annotation class, so `_sdf` was always the class's live id. The new code returns the table number when engine-annotations-model isn't loaded. Same value as long as type-ids.ts is right; if the annotation cluster is never imported (a build that drops it) the default styles still get ids but `repairSdf` can't tell. Not observable in the app today.
Fix: assert in default-styles.test.ts that, with the annotation cluster imported, `classTypeId("GTextAnnotation")` equals `getTypeId(TextAnnotation)` and equals the table value, so a drift fails.

### R4-D-306 (low): TransactionRecorder coerces the block flags to booleans
Old: public/chunk.vendor.js:71127-71129, 71163-71165 (`withInvalidation: !!n && n[0]` keeps the raw `n[0]`).
New: next/src/engine/undo/transaction-recorder.ts:124-126, 258-259, 276-277 (`blockFlag` returns `!!arg[index]`).
What differs: the recorded action's `withInvalidation`/`noGeometryInvalidation` hold `true/false` instead of the caller's value (or `false` instead of `undefined`/`0`). Only truthiness is read today, so no behaviour change; it matters only if the editor's undo code or debug dumps inspect the field.
Fix: return `!!arg && (arg as unknown[])[index]` typed as `unknown`, or note the deviation in the header.

### R4-D-307 (low): Scene.addDestroyable accepts any object with a destroy method
Old: public/chunk.vendor.js:35105-35124 (GRendererCtx → push, RendererCanvas → push parent, else `e.hasMixin(GDestroyable)`; an object without `hasMixin` throws), 35125-35134 (`R.destroy(t)` for renderer contexts).
New: next/src/engine/scene/scene.ts:2186-2210 (`isDestroyable` duck typing).
What differs: with the recorder dropped (accepted deviation) the renderer branches are gone; the duck typing also accepts plain objects with `destroy` that the old code rejected or threw on. Current callers (text core, effects, images, border patterns, style copies) all carry the Destroyable mixin, so no difference today.
Fix: none needed; add a one-line comment at addDestroyable that the renderer-context branches went with GRendererCtx.

### R4-D-308 (low): Page.getActiveLayer depends on selector.ts being loaded by someone else
Old: public/chunk.vendor.js:22932-22934 (`this.querySingle || i(507)` loads the selector on demand).
New: next/src/engine/scene/page.ts:527-529 (casts to Queryable; only scene.ts imports selector.ts).
What differs: a Page used without scene.ts in the module graph (unit test, worker) throws "querySingle is not a function". Inside the app scene.ts is always loaded.
Fix: `import "./selector.ts";` in page.ts like scene.ts does.

### R4-D-309 (low): kept quirks cited as "QUESTIONS.md" have no entry there
Old: public/chunk.vendor.js:34945-34953 (`mpIdx` ReferenceError on `ms` change), 34110-34123 (`refreshPagesPositions` calls the missing `refreshPosition`), 73243-73790 (selector quirks: `:first-child` never matches, `:nth-child` off by one, `#id` throws, `^` shifted arguments), 71047-71090 (nested transactions drop the outer list), 34807-34809 (restore adds page props to the shared `GScene.VisualProperties`, so every later scene stores w/h/margins/bck in its own blob).
New: next/src/engine/scene/scene.ts:951-956, 1828-1832, 1930-1936; selector.ts:8-20; transaction-recorder.ts:7-11.
What differs: behaviour is kept, but next/docs/rewrite/QUESTIONS.md has only Q-001..Q-011 and none of these. The VisualProperties mutation is the one with file impact (scene blobs written after opening an old file gain page keys).
Fix: add Q entries for each, and a scene.test.ts case for the VisualProperties leak (restore a blob with `w`, then store a fresh scene and assert the leaked keys appear) so a later "fix" is a deliberate BUGS-FIXED change.

### R4-D-310 (low): minified loop names and odd locals left in scene.ts and page.ts
Old: public/chunk.vendor.js (various).
New: next/src/engine/scene/scene.ts:558, 583, 585, 603, 855, 858, 1252, 1369, 1916, 2054, 2203 (`c`, `y`, `o`, `l`, `h`, `e` copied from the minified loops); next/src/engine/scene/page.ts:993, 1026 (`change_`).
What differs: style only; PORTING.md asks for names that say what they hold.
Fix: rename to `nodeIndex`, `linkIndex`, `childIndex`, `propertyIndex` etc., and `change_` to `propertiesChange`.

### R4-D-311 (low): DefaultStyles registers a G name the old app never had
Old: public/chunk.vendor.js:118941 (module 915 has no G name; registered only as node "styles").
New: next/src/engine/style/default-styles.ts:106 (`registerNodeClass(this, "styles", "GStyles")`).
What differs: `toString()`/the G namespace show "GStyles" where the old class printed its minified function. Not serialized. The accepted deviation covers toString returning the old G name, but this one is invented.
Fix: note it in the file header (or PORTING.md's list of invented names) so nothing starts depending on `G.GStyles` as an old API.

### R4-D-312 (low): interim document hooks: faithful, two small gaps
Old: public/designer.browser.dev.js:121713 (`new GEditorWorkspace()`), 122285-122303 (`newInfiniteDocument`, `createScene`), 122689-122694 (boot options), 5851-5864 + 6016-6026 + 6073-6260 (GDocument ctor → setScene → `_updateScene` → `new GEditor(scene)`), 25562-25568 (annotations sidebar `scene.getAnnotations()` on activation).
New: next/src/parity/app/document.ts:38-75.
What differs: the scene setup matches: one workspace, `GSceneOptions.scaleLabel=false` and `defaultBorderPositionForLines=true` (the only two GSceneOptions the app sets), `new GScene(workspace)`, `setProperties(["bck","w","h"],[WHITE,0,0])` on the active page, then `getAnnotations()`. I checked that `GEditorOptions.scaleBorderWidth`/`scaleCorners` are only ever read (default undefined, chunk.vendor.js:6248-6249), so skipping setBorderScale/setCornersScale is right. Gaps: (1) old `newInfiniteDocument` returns the GDocument, the hook returns void (the parity contract types it void, so harmless now); (2) the GEditor constructor (chunk.vendor.js:19786-19846) sets `scene.__graphic_editor__`, adds AfterInsert/BeforeRemove/flag/geometry listeners and pulls `:selected` nodes into the selection, and boot sets `GEditorPaintConfiguration.prototype.pageDecoration` shadow 4/offsetY 2/rgba(0,0,0,0.25) (122691-122694); none of that exists yet, so any engine scenario whose result depends on editor listeners or page shadows in the multi-page view must stay unlisted until the editor phase.
Fix: return the InterimDocument from newInfiniteDocument for parity with the old API, and add the pageDecoration/GEditor note to the file's "What it leaves out" list.

### R4-D-400 (medium): synchronize, desynchronize and getDisabledSiblings have almost no tests
- Old: chunk.vendor.js:42208-42413 (synchronize), 42456-42469 (getDisabledSiblings), 42470-42585 (desynchronize)
- New: symbol.ts:568-727, 733-765 (_matchScaleAndSkew, shared by both), 816-824, 827-903
- What differs: nothing found. The old frame/scale/skew block, copied twice in the old code, is now one helper, and the read order (frame set first, then `trf` read) is still the same. But the editor calls these for "reset instance" and its undo (designer.browser.dev.js calls `.synchronize(` and `desynchronize`). Only `instance.synchronize()` with no arguments is tested (symbol.test.ts:184). These are untested: `synchronize(node)` limited to a subtree, the redirect to an enclosing instance that owns the node, `synchronize(null, true)` (rebuilds the content from the master; note it writes the rebased `trf` onto the master's child, not the copy, kept at 713), anchor-point restore through `anchorsByPath`, image `itrf` rebasing, the `_translationSwapped` fallback, the scale/skew match when the instance was scaled, and a desynchronize round trip.
- Fix: add unit tests. Override a fill and a path anchor on an instance, call getDisabledSiblings, synchronize, then desynchronize with the saved map, and assert the blobs match the overridden state. Scale an instance 2x and assert that synchronize brings back the master's scale while keeping the top left. Call synchronize(null, true) and assert the children were rebuilt. Each test should fail when the matching branch is removed.

### R4-D-401 (medium): the text content merge between master and instance is untested
- Old: chunk.vendor.js:41936-41952 (run text with code-object numbering), 42083-42160, 43418-43556
- New: symbol.ts:152-176 (runsText, module-wide codeObjectIds), 444-550, 1890-1911, 1991-2133 (_mergeTextContent)
- What differs: nothing found. The evaluation order of the three runsText calls (target, new, previous) matches the old order, and that order decides the module-wide code-object numbers. The mixed-selection condition, the `ce[1] < 0` clamp (only in the selection branch, as in the old code) and `DoMeasure` reset to true at the end also match. But only `_getChangedText` has a test (symbol.test.ts:266). These are untested: `_getChangedTextContentProperties`, `_assignChangedTextContentProperties`, all four merge branches (formatting a selection, text edit with a selection, collapsed selection with run-property change, collapsed selection with text edit), and the `multipleValues` rule. This is the most intricate code in the module, and it is only reachable from the text editor.
- Fix: add unit tests with two instances of a master text. (a) Bold a range in the master while the instance changed a different property: the instance gets bold only where its old value matched. (b) Type into the master when the instance has the same text: the instance's text changes and its own formatting stays. (c) Same as (b), but the instance's text differs: no change. Also test `_getChangedTextContentProperties` directly on small run arrays (before empty, after empty, mismatch at run 0).

### R4-D-402 (medium): nested symbols, swapping inside an instance and their restore paths are untested
- Old: chunk.vendor.js:42435-42455 (_translationSwapped), 42659-42681 (_getMasterSibling nested), 43140-43154 (_getDeadSiblingsFromNode), 43781-43911 (_iterateSiblings owner search, canUpdate walk), 44018-44055 (restore `sbl` and `swp`), 42728-42790 (swapWith inside a parent instance: `swp` cycle removal)
- New: symbol.ts:786-813, 1006-1032, 1575-1592, 2304-2433, 2651-2689, 1091-1155
- What differs: nothing found. Every scenario uses one level of symbols. These are untested: the `sbl` save (symbol.ts:2606) and restore of a master that holds an instance of another master, the `findOwner` recursion with `_cachedSymbolSiblings`, the `swp` pair array (push, cycle detection, "Strange swap array" repair), `canUpdate` during a dependent move, and the `masterOwner !== this` filter in visitInstance. A wrong `sbl` restore breaks files with nested symbols on load.
- Fix: add a parity scenario (or unit tests) with master A that contains an instance of master B, plus two instances of A. Edit B and check both A instances. Swap the inner B instance in one A instance for C, then swap it back (the cycle case), and save. Restore a page copy and compare `sbl`/`dsb`/`swp` and the sibling maps' key sets.

### R4-D-403 (medium): comparedClasses re-creates the old prototype walk without a direct test, and ES static inheritance changes what each level reads
- Old: chunk.vendor.js:43244-43272
- New: symbol.ts:1677-1688, 2862-2894
- What differs: the old loop read `p.GeometryProperties` / `p.VisualProperties` from classes made with GObject.inherit, whose statics are not inherited. In the port these are ES classes, so a subclass with no own table returns its parent's table. Each level can then add its parent's names a second time. As long as the walk reaches that parent anyway (it stops only at Element/Node level, which have no tables) the result is only duplicate names, and arePropertiesEqual gives the same answer. Still, this hand-written walk (old levels resolved through `getTypeId` of an inherited `__gtype_id__`, then the GShape/GItem/GBlock/Effect fallback) decides whether an instance child counts as overridden, and nothing pins the list it produces. I didn't run the old engine to compare the lists.
- Fix: read only own tables (`Object.prototype.hasOwnProperty.call(cls, "GeometryProperties")`) to match the old lookup exactly. Add a unit test that pins the name list for a rectangle, an ellipse, a path, a text, a group, an image and a nested instance. Get the expected lists once from the old engine in the parity harness.

### R4-D-404 (medium): preTransform copies GElement.Transform.preTransform instead of calling it, and the constrained-content branch of transform is untested
- Old: chunk.vendor.js:42843-42884 (transform, `hasAnchors && dependentUpdate && !force` branch), 42885-42902 (preTransform calls `GElement.Transform.prototype.preTransform`)
- New: symbol.ts:1238-1283, 1285-1314; element-transform.ts:94-107
- What differs: the behaviour is the same today, because the inlined block equals element-transform.ts:94-107. But a later fix in the mixin won't reach symbols. Neither the constrained-children branch (children with `hacr`/`vacr` skipped), nor preTransform, nor the `_blockEvents` change inside a non-master parent has a test.
- Fix: replace the inlined block with `super.preTransform(transform, force, exceptions)` if the mixin chain resolves to TransformMixin there (Layout and the others don't override it), or call the mixin's prototype method explicitly. Add tests: an instance with one constrained child, transformed as a dependent update, leaves that child to the layout. preTransform of a symbol inside a group gives the same `trf` and child transforms as the old engine.

### R4-D-405 (low): the symbol undo actions are untested
- Old: chunk.vendor.js:43719-43780
- New: symbol.ts:2257-2296
- What differs: nothing. The revert action sends `created: !created` and the deserialized action uses the node's own scene, both as in the old code. No test covers them, and no test runs the transaction recorder on a symbol create/remove.
- Fix: a unit test that runs each returned function against a stub scene and asserts the AfterSpecialChangeEvent payload (`created` flipped on revert), plus the null cases (no-op function, `null` from the serialized form).

### R4-D-406 (low): the thumbnail path is untested; getSymbolImage dropped a debug log
- Old: chunk.vendor.js:42648-42658 (logs "GET SYMBOL IMAGE"), 44180-44276
- New: symbol.ts:990-999, 2727-2826
- What differs: the old `console.log("GET SYMBOL IMAGE")` is gone. That's fine, but it isn't listed as a deviation. The thumbnail sizing (aspect fit to width, then height), the render-phase branch through RenderScheduler.tryRunRendering, and the AfterThumbnailUpdate fired in setTimeout have no tests. The symbols panel shows these thumbnails.
- Fix: a unit test with a 100x50 master and `thumbnailSize` 64. Assert a canvas of 64x32 and one AfterThumbnailUpdate after a timer tick. Note the dropped log in the file or in QUESTIONS.md.

### R4-D-407 (low): the enableSweepInstances branch and the BLOCK_EDITED branches are untested
- Old: chunk.vendor.js:44147-44172 (sweep), and BLOCK_EDITED in 42213, 43366, 43390, 43628-43632, 43684-43691, 43701, 43868, 44009, 44048
- New: symbol.ts:2576-2584, 2695-2716; BLOCK_EDITED at 576, 1826, 1856, 2147, 2165, 2217, 2238, 2400, 2642, 2679
- What differs: nothing found. The editor sets BLOCK_EDITED while it edits an instance in place. In that mode overrides leave `_siblingMap` entirely and restore drops `dsb`/`sbl` ids. None of this runs in a test.
- Fix: unit tests with `Symbol.BLOCK_EDITED = true` (reset it in afterEach). Override a child: it moves to the disabled map and is deleted from `_siblingMap`. Make it match again: it moves back. Restore a blob with `dsb`. Also test removing a master with `enableSweepInstances = true`: its instances' children are unpacked into their parents and the instances removed.

### R4-D-408 (low): inSync(node, deep) is untested
- Old: chunk.vendor.js:42586-42633
- New: symbol.ts:910-972
- What differs: nothing. Only the no-argument form is tested. The `deep` subtree check, the walk up enclosing instances, and the check that a disabled non-element (a paint layer or effect) belongs to the node are not tested. The editor uses these to decide whether "reset" is enabled.
- Fix: test inSync(child), inSync(group, true) with an overridden fill inside the group (false), and the same after synchronize(group) (true).

### R4-D-409 (low): the old no-op _copyTextToContent is not ported
- Old: chunk.vendor.js:43712-43714
- New: none
- What differs: the old method only loops and reads `e[i].text`, with no effect, and no other bundle calls it (it appears only in chunk.vendor.js and its copy in autosave.worker.js). Leaving it out is fine.
- Fix: none needed. Optionally add a one-line note in the file header saying it was dead.

### R4-D-410 (low): sceneClassOf falls back to scene.constructor where the old code would throw
- Old: chunk.vendor.js:44094-44099, 44115-44120 (`o.getClassFromId(c.getTypeId(this._scene)).InvalidationFinishedEvent`)
- New: symbol.ts:2841-2846
- What differs: when the scene's type id doesn't resolve to a registered class, the old code throws a TypeError on attach and detach. The port quietly uses the constructor instead. That can't happen with a real GScene, so this is only a small defensive deviation.
- Fix: keep it, but say in the comment that the fallback is new. Or drop it to match the old code.

### R4-D-411 (low): the class name Symbol shadows the global Symbol in this module and in every importer
- Old: n/a (GSymbol)
- New: symbol.ts:265 and the files that `import { Symbol }`
- What differs: nothing at runtime today. I grepped and found no use of `Symbol.iterator`, `Symbol.for` or `Symbol(` in importers. TypeScript would flag such a use, but a reader can easily misread it.
- Fix: keep the public name (PORTING.md rule), and add a header comment in symbol.ts that it shadows the built-in. Importers that need the built-in can use `globalThis.Symbol`.

### R4-D-500 (medium): image hit testing on pixels is untested
Old: public/chunk.vendor.js:24644-24689 (`_detailHitTest`). New: next/src/engine/scene/image.ts:457-509.
What differs: the logic matches, including the fractional row index, the tolerance rewritten to `floor(tolerance + 0.5*scale)` and passed on to super, the `[0,0,0]` fallback, and `dblMode || pixel || force`. But no unit test or parity scenario calls hitTest on an image. image.test.ts has no hit test, and parity special/image only checks boxes. This is the branch that makes clicks on transparent pixels miss.
Fix: add a unit test with a small canvas that has a transparent and an opaque pixel and an itrf scale. Assert a hit on the opaque pixel (with ElementData `pixel` [r,g,b,a]), null on a transparent pixel outside tolerance, and the shape fallback in dblMode. Check that it fails when the alpha test `0 !== data[i]` is flipped.

### R4-D-501 (medium): image painting is untested (placeholder box, error cross, ipfc order, dblMode overlay, mask path)
Old: public/chunk.vendor.js:24806-24939 (`_paintFillLayers`, `_paintStyleSeparate`, `_paintImageCanvas`). New: next/src/engine/scene/image.ts:630-806.
What differs: nothing found in the code. No pixel scenario renders a GImage, though. Parity special/image-cmyk-jpeg uses toBitmap only for the decoded pixels at 1:1, with no fills, borders, crop, clip or dblMode. Untested branches:
- the placeholder grey box, and the red cross on Error (the cross uses pw/ph as end coordinates, not px+pw, which is an old quirk)
- ipfc true (image under the fills) vs false (over)
- the clip path vs the push-canvas-and-DestinationIn mask path (rounded corners)
- the dblMode half-opacity overlay (`opacity ? opacity/2 : 0.5`)
- the direct `_paintCompositedWithBackground` shortcut for an image without style
Fix: add a render parity scenario (kind: pixels) with images in each state: not loaded, error url, loaded with a fill and ipfc true and false, rounded corners, a crop (pw/ph/px/py), and dblMode. Also add the cross-line quirk to QUESTIONS.md if it isn't there.

### R4-D-502 (medium): non-data url loading (XHR type sniffing, file:// backslash fix, crossOrigin) is untested
Old: public/chunk.vendor.js:25056-25087. New: next/src/engine/scene/image.ts:943-963.
What differs: the port matches, except that it always uses `XMLHttpRequest` (the old Node/ActiveX fallbacks don't apply in a browser, which is fine). Every test and scenario uses data urls, so the XHR path, `_type` set from the fetched bytes (which drives the CMYK check for http JPEGs), the `file://C:\x` to `file:///C:/x` rewrite and `crossOrigin = "Anonymous"` are never run.
Fix: add a unit test with a stubbed XMLHttpRequest and Image. Assert the GET url after the backslash rewrite, that `_type` comes from the response bytes, and that crossOrigin is set for http and `//` urls. Also cover a failed request (null response gives `_getType` an empty array, so `_type` is undefined, and then Error comes from onerror).

### R4-D-503 (medium): crop restore (pw/ph/px/py without itrf) and the size-limit Error are untested
Old: public/chunk.vendor.js:25093-25150 (`_updatedImage`). New: next/src/engine/scene/image.ts:974-1034.
What differs: the code matches. But the branch that builds `itrf = scale(pw/w, ph/h).translate(px,py)` for an older file with a crop and no itrf is never run: parity special/image loads with px=py=0 and pw/ph unset. Neither are the Error paths for a 0-sized bitmap or one over Platform.absoluteMaxImgLinearDimension or absoluteMaxImgAreaDots, the over-length data url check against Platform.maxImgDataUrlLength, or the early return when the same canvas arrives again. These decide how old files look on load.
Fix: add unit tests that restore a blob with pw/ph/px/py and no itrf, load a stub bitmap, and assert the exact itrf. Set Platform limits low and assert Error plus destroyImage. Give a data url longer than maxImgDataUrlLength and assert Error without Loading.

### R4-D-504 (medium): the dictionary's url handling for images is barely tested
Old: public/chunk.vendor.js:24774-24805 (`_updateUrl`), 24966-24984 (`_updateTemporaryImage`). New: next/src/engine/scene/image.ts:598-627, 833-854.
What differs: nothing found. Untested branches:
- the early return when another entry already holds the same plain value (`getEntries().some(...)`), which leaves `url` a plain url
- storedUrl taking over when the entry is missing (`this.$url = this.$storedUrl`)
- dropping `_imageCanvas` or `_image` when the value is null
- tmpUrl previews
Copy and paste and undo of images run through these.
Fix: add unit tests on a real SceneDictionary. Use two images with the same data url, an image restored with a dictionary url whose entry is missing but storedUrl set, and a tmpUrl set before the bitmap loads (assert the geometry update and that the bitmap is painted from tmpUrl).

### R4-D-505 (low): Image.destroy no longer releases the offscreen renderer canvas
Old: public/chunk.vendor.js:25211-25219 (`E.destroy(this._imageCanvasOffscreen)`, module 103). New: next/src/engine/scene/image.ts:1096-1106.
What differs: the port only nulls the field. A code comment says worker canvases aren't ported, but `_getProperImageCanvas` (image.ts:674-705) still calls RenderScheduler.getRenderer and keeps its canvas in `_imageCanvasOffscreen`. If RenderScheduler.isMultiThreaded can ever return true, each destroyed image leaks a renderer from the pool.
Fix: if RenderScheduler has a destroy or release counterpart, call it. If isMultiThreaded is always false in the port, say that in the comment, and maybe assert it.

### R4-D-506 (low): the `_detailHitTest` doc comment is wrong about images without itrf
Old: public/chunk.vendor.js:24644-24655. New: next/src/engine/scene/image.ts:452-456.
What differs: the comment says an image without itrf can't be hit because the inverse fails. In both versions the matrix is then identity times the view transform, which inverts fine. What actually happens, in old and new alike, is that a non-invertible itrf or transform (zero scale) makes `inverted()` return null, and `.mapPoint` throws a TypeError. A null `transform` throws too, at `getScaleFactor()`.
Fix: rewrite the comment to describe the real quirk (a degenerate itrf or transform throws), and add it to QUESTIONS.md.

### R4-D-507 (low): the hit-test pixel is a plain array instead of a Uint8ClampedArray
Old: public/chunk.vendor.js:24682 (`f.slice(_ - 3, _ + 1)` on ImageData.data gives a Uint8ClampedArray). New: next/src/engine/scene/image.ts:496 (`Array.prototype.slice.call` gives an Array).
What differs: the type of ElementData.data.pixel. Nothing in public/*.js reads `.pixel`, so nothing visible changes now. JSON serialization of the two types differs ({"0":..} vs [..]) if it ever reaches a parity comparison.
Fix: use `data.slice(...)` when `data` is a typed array, falling back to Array for the `[0,0,0]` placeholder, or note it as accepted.

### R4-D-508 (medium): image grid painting, image restore and scene propagation are untested
Old: public/chunk.vendor.js:75725-75872 (`_paintFill`, `_handleChange`, `getSubnodeIds`). New: next/src/engine/scene/image-grid.ts:332-435.
What differs: the code matches. In the old `_paintFill` the loop variable `i` is an undeclared implicit global (the module has no "use strict"). The port's local `i` is the right reading. Parity special/image-grid only checks JSON. Untested:
- painting the images
- Restore of `im` (deserialized images go into `$im` without the AfterPropertiesChange sync, so the Images container stays empty after a load, in old and new alike)
- the workspace and scene propagation into the images
- getSubnodeIds multireference reset
- the ChildGeometryUpdate relayout
Fix: add a unit test for store and restore of a grid with an image. Assert the blob `im` is an array of serialized image strings, and pin down (and add to QUESTIONS.md) that restored images are not children of the Images container. Add a pixel scenario for a grid with one loaded image.

### R4-D-509 (low): grid and mg changes don't invalidate the grid's vertices (kept quirk, undocumented)
Old: public/chunk.vendor.js:75741-75800 (no `_handleGeometryChangeForProperties` for GeometryProperties or VisualProperties). New: next/src/engine/scene/image-grid.ts:352-426.
What differs: nothing, both keep it. Setting `grid` or `mg` doesn't reset `_vertexSource` unless something else sends FinishGeometryUpdate, so the outline can go stale. Parity special/image-grid sets grid and mg and compares the vertices, so the old outcome is pinned, but QUESTIONS.md doesn't explain it.
Fix: add a QUESTIONS.md entry, and a unit test that sets `mg` and asserts the vertices (whatever the old engine gives).

### R4-D-510 (medium): SceneDictionary flush, release, texture-fill redirect and cloud-id resolution are untested
Old: public/chunk.vendor.js:92229-92372. New: next/src/engine/style/scene-dictionary.ts:162-345.
What differs: nothing found. The ported `String(x) in entries` keeps the old `in` coercion, and `instanceof Swatch` matches old module 517. scene-dictionary.test.ts covers put and count, sanitize recreate, data-url resolve and the memory budget. Untested:
- `flush()`, which runs before saving and drops unreferenced entries from the file
- `release()`, which lowers the memory count and clears cachedCanvas
- the PaintLayer texture branches of `_afterInsertEvent`, `_afterRemoveEvent` and `_redirectUrl` (`$_pt._url` rewrite)
- swatch reference counting
- the re-trigger of ResolveUrlEvent for non-file, http or data values (cloud ids)
- sanitize throwing "Missing entry value"
Fix: add unit tests for each. In particular, flush with one used and one unused entry must keep only the used one and lower workspace memory for the dropped one's canvas. Also add a texture-fill layer with a plain data url that gets redirected to a dictionary:// url.

### R4-D-511 (medium): the symbol dictionary's thumbnail path and release are untested
Old: public/chunk.vendor.js:121569-121572, 121664-121681, 121709-121743. New: next/src/engine/style/symbol-dictionary.ts:96-123, 157-160, 244-254.
What differs: nothing found. Both keep the quirks that never-matching bound listeners are removed in `_beforeRemove` and `release`. Untested:
- Entry.deserialize loading the thumbnail data url into a Canvas2DPaintCanvas and firing AfterThumbnailUpdate
- `_updateThumbnail` writing the image into the entry
- Entry.serialize with an image (PNG data url)
- `removeEntry(..., true)` on an entry without a value (throws in both)
The symbols panel shows these thumbnails, and they are saved in the file for unreferenced masters.
Fix: add a unit test that deserializes an entry with a tiny PNG data url (stub Image so onload runs), then assert value.image is a canvas of the PNG's size and that the master got AfterThumbnailUpdate. Add a serialize round trip with an image.

### R4-D-600 (medium): GEmptyAnnotation drops all meta properties on load, kept without a QUESTIONS or BUGS-FIXED entry
- Old: public/chunk.vendor.js:235463-235468 (restore reads `a.MetaProperties`, which is undefined because GNode.inherit copies statics only from GSceneNode and GNode, and neither has MetaProperties).
- New: next/src/engine/scene/annotations/empty-annotation.ts:6-9, 25, 49-55.
- What differs: nothing; the port reproduces it. But a saved "ann" loses text, uid, time, seq, name, rsv, rmd and so on when it is loaded, and the next save writes defaults. By PORTING.md that is data loss, so it needs either a QUESTIONS.md entry or a `fix:` with a BUGS-FIXED entry. The file header says "Two old slips are kept (QUESTIONS.md)", but QUESTIONS.md has no such entry (it has Q-001 to Q-011 only, none about annotations).
- Fix: add a QUESTIONS.md entry now. Then decide: either keep it, or fix it in a separate commit (restore with Annotation.MetaProperties and restoreAction), with a BUGS-FIXED entry and a parity exception for the defaults-restored scenarios.

### R4-D-601 (low): kept annotation quirks are not in QUESTIONS.md
- Old: chunk.vendor.js:55330 (`t.invert()` throws for any invertible trf), 72948 (`selectedAnnots` ReferenceError), 235442-235444 (`isVisible` always true), 235477-235481 (`vis` change throws after flipping the flag), 56612-56636 (getActionsBBox: the second button overlaps the first), 23756-23773 and 63928-63939 (setting `uid` throws when `read` isn't an array).
- New: comment-annotation.ts:124-136, annotations-list.ts:111-123, empty-annotation.ts:43-74, actionable.ts:45-50, annotation.ts:239-245, comment.ts:3.
- What differs: behaviour matches. These are documented only in code comments, and empty-annotation.ts points to QUESTIONS.md entries that don't exist.
- Fix: add one QUESTIONS.md entry, "Annotation model slips kept", that lists these.

### R4-D-602 (medium): CommentAnnotation.hitTest has no test
- Old: chunk.vendor.js:55116-55135.
- New: comment-annotation.ts:68-93.
- What differs: same logic. The port drops the 6th `false` argument to _detailHitTest; that is harmless, because Shape._detailHitTest (shape.ts:1778) takes five. But nothing tests the filter-false, empty-paint-box, outside-tolerance, acceptor-not-1 or hit branches, and the editor's annotation picking depends on them.
- Fix: add unit tests for an "anc" with the icon geometry (initDefaultForLimitedRestore plus initSizeAndPosition): a hit inside the paint box, a miss outside, a hit just outside within the tolerance, a filter that returns false (null), and an acceptor that returns 0 (null).

### R4-D-603 (medium): AnnotationsList hit test, paint and the FinishGeometryUpdate modes are untested
- Old: chunk.vendor.js:72940-72944 (paint), 73025-73027 (hitTest through GElement), 73155-73196 (FinishGeometryUpdate modes 0, 1, 2, -1 and [mode, extra]), ChildVisualUpdate, AfterFlagChange NoPaint, InvalidationRequested forwarding.
- New: annotations-list.ts:104-109, 202-227, 357-469.
- What differs: I found no difference by reading. annotations-list.test.ts covers boxes, collisions, resolve, store, update counting and isPaintable, but not hitTest (it borrows Element.prototype.hitTest on a non-Element, so a later Element refactor that touches an Element-only field would break it silently), paint, mode 1, mode 2 (skip invalidation) or the parent notifications.
- Fix: test hitTest on a list in a page (it returns the child annotation's hit, and null when stacked is false and nothing is hit), paint calling only Element children, and _finishGeometryUpdate with 1, 2 and [0, extra], asserting the parent's _notifyChange arguments and the invalidation calls.

### R4-D-604 (medium): GCollaborativeTextAnnotation link store/restore and scene attach are untested
- Old: chunk.vendor.js:75414-75452 (Store: meta, then own blob, then Linkable.MetaProperties `targetGuid` into the own blob, then `annotablerefs`), 118917-118930 (module 914), 75453-75458 (_handleReferencesOnSceneAttach with the restored refs).
- New: collaborative-text-annotation.ts:284-307, element-linkable.ts:55-72.
- What differs: same order. special-annotations.test.ts:119-141 checks only the fixed icon and locks and isPaintable. Nothing tests `annotablerefs` being written (only when collab texts reference it), `targetGuid` going into the `own` blob with separateSaving, restore keeping `_restoredReferences`, or the scene attach linking and then resetting them. This is file-format code.
- Fix: in a scene, a GCollabText that references an "ancotext". Store, and assert `annotablerefs` and `targetGuid` (also with separateSaving, where both go into `own`). Restore into a new scene, and assert the link exists after attach and `_getRestoredAnnotableReferences()` is null.

### R4-D-605 (medium): Annotable.linkAnnotation and getLinkedAnnotations are untested
- Old: chunk.vendor.js:75346-75362.
- New: annotable.ts:181-196.
- What differs: same. No unit test, and the parity scenario only checks `typeof G.GAnnotable` (special-nodes.spec.ts).
- Fix: test that it returns false for a non-Linkable annotation and when there is no scene, that it returns true and the scene records the link, and that getLinkedAnnotations returns only nodes that have the Annotation mixin.

### R4-D-606 (medium): GCollabText text-mode paint box, hit test and button are untested
- Old: chunk.vendor.js:75314-75336 (_calculatePaintBBox expanded by the button row, _detailHitTest that uses GRectangle's test with force=true in image mode and GText's in text mode, then hitActionTest), module 1000 paint and execute (232716-232727).
- New: collab-text.ts:123-158, collab-text-action.ts:142-158.
- What differs: same. special-annotations.test.ts:165-191 covers the constructor and the mode switch, but not the expanded paint box, the hit order (shape before button), a hit on the button returning `{action}`, CollabTextAction.execute (it closes an open inline editor first) or paint's fill colours. Also, a null transform makes hitActionTest throw in both old and new code.
- Fix: add tests for the paint box height growing by the button's height (24), the button hit returning ElementData with the action, and execute calling close, updateSelection and open, in that order, on a fake editor.

### R4-D-607 (low): the text-mode class shares GCollabText's type id
- Old: chunk.vendor.js:75262 (`this.__gtype_id__ = n.getTypeId(d)`, an own field on each instance), and module 999 (232687-232697) got its own counter id from inherit (46642).
- New: collab-text-annotation-base.ts:19 registers the class with GCollabText's id.
- What differs: instances behave the same: Node.getName gives "collabtext" in text mode, as before. But getTypeId(CollabTextAnnotationBase), on the class, now returns the collabtext id where the old one returned a distinct id. Nothing reads it today, as far as I can see. Event listener tables keyed by class id would mix the two if anything ever registered on the base class.
- Fix: none needed. Optionally say in the file comment that the class-level id differs from the old one on purpose.

### R4-D-608 (low): port-map.tsv target path for module 1000 lacks `next/`
- Old: port-map.tsv row for module 1000: `src/engine/scene/annotations/collab-text-action.ts`.
- New: the file is next/src/engine/scene/annotations/collab-text-action.ts. There is no src/engine at the repo root.
- Fix: change the target to `next/src/engine/scene/annotations/collab-text-action.ts`.

### R4-D-609 (low): stale header comment in collab-text-action.ts
- New: collab-text-action.ts:7-8 says "port-map.tsv lists this module as dead code", but port-map.tsv lists module 1000 as `port` in this cluster.
- Fix: remove the sentence, or say that it was moved from dead code to port.

### R4-D-610 (low): parity/ported/engine-annotations-model.json is empty
- New: next/parity/ported/engine-annotations-model.json is `[]`. The scenarios that cover this cluster (engine-model/special/annotations-and-comments, engine-model/nodes/*) are listed in engine-scene-document.json instead.
- What differs: the coverage exists, but it is booked under another cluster, so `GD_RUN=engine-annotations-model` runs nothing.
- Fix: list the annotation scenario ids in engine-annotations-model.json too, or note in PROGRESS.md that engine-scene-document claims them.

### R4-D-611 (low): the comment pin's second sizing throws, reachable from PDF import
- Old: chunk.vendor.js:55319-55331, called from 107210-107211 (the comment tool's _createShapeManually) and 238659 (PDF annotation import, which may already have set a trf).
- New: comment-annotation.ts:130-136.
- What differs: same. The new code throws a synthetic `TypeError("t.invert is not a function")` instead of calling a missing method. The message matches the old minified one, but whether io-import-pdf-eps ever reaches it with a trf already set isn't tested.
- Fix: note it in the QUESTIONS entry (R4-D-601). Add a parity case once PDF import is ported.

Code quality: there is no `any` in the cluster, and no minified names or copied minified code. Casts are `as unknown as` with narrow target types. Comments explain why. Nothing to report beyond R4-D-609.
