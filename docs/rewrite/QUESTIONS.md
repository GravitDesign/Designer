# Open questions

Places where it was unclear whether the old behaviour is a bug or intended.
The new app keeps the old behaviour for every entry here.

Format: `## Q-NNN title`, then where it lives in the old code, what it does,
and why it is unclear.

## Q-001 Only English strings exist

Old code: locale tables in designer.browser.dev.js modules 814/815 (copies in
821/822) and chunk.vendor.js modules 885/941; translations for the other 14
languages come from gApi.fetchTranslationsURL (module 1037) and the server's
/i18n-url route returns {}. The language switch action (module 1620) is never
registered.

The app's own strings (menus, panels, dialogs) are English only: no other
translations of the Designer project exist in the repo, and the `language`
setting is ignored. The engine's own tables (chunk.vendor.js modules 885/941)
do hold translations for engine strings, and the engine picks them from
`navigator.language`: with a German, Japanese or Chinese browser the library's
"Load more…" reads "Mehr laden…", "もっと読み込む…", "装载更多…" and
`GLocale.getLanguage()` returns 1, 12 or 2 (recorded in ui/i18n/browser-* and
the locale-* screenshot variants). So users see mostly English with a few
translated engine strings.

The new app keeps exactly that: English app strings, the engine tables for
all their languages, the language chosen from `navigator.language`, and the
`language` setting ignored. Whether this mixed state is intended is the open
question. The parity suite pins the browser to en-US except in the locale
scenarios, which set the browser language explicitly.

## Q-002 Language codes differ between client and server

routes/user.js numbers languages with 0 = de-DE, 1 = en; the client's
GLocaleLanguage uses 0 = English. Nothing reads the server's numbering, since
the language can't be changed. Kept as is in the server; the new app uses the
client table.

## Q-003 Shortcut conflicts and malformed shortcuts

- modify.clip and modify.createnestedcompound both use Cmd/Ctrl+Alt+M. The
  action registered later wins in the old app; the new app registers in the
  same order so the same one wins.
- view.change-active-page has PageUp/PageDown extra shortcuts written as a
  single key instead of an array of arrays, so they never fire. Kept unbound.
- New from Clipboard uses a real Ctrl on Mac where everything else uses Cmd.
  Kept.

## Q-004 "Show Grid" is a document property

Toggling the grid writes scene property `gm`, so it is undoable, saved with
the file and also switches grid snapping. Could be intended (grid mode as a
document setting). Kept.

## Q-005 Hidden but implemented actions

view.toggle-paint-layers-visibility (F / Shift+B), check for updates, the
language switcher and the Fill / PathsGraph / Connector tools exist in code
but are never registered, so users can't reach them. Kept unreachable.

## Q-006 Different JPEG qualities per export path

Per-element export uses quality 100, quick export passes none (browser
default 0.92), the export dialog defaults to 92 and the PDF writer uses 85.
The docs say quick export uses 100. Kept as in code.

## Q-007 Placing a PDF imports only page 1

Opening a PDF imports every page, placing one imports the first page only.
Kept.

## Q-008 AI, SVGZ and Sketch import are unreachable

The importers exist but are not in the file-type list the UI offers. Kept
unreachable from the file picker; the importers are still ported so drag and
drop and paste behave the same where the old code reached them.

## Q-009 Anchor coordinates are stored as float32

GUtil.packPoint stores anchor coordinates as base64 float32, so they lose
precision on every save. This is the file format, and files must open in the
old app, so it is kept.

## Q-010 Cloud-only features

Autosave, version history, templates and recent files only work with the
cloud backend, which doesn't exist. With the cloud code dropped, the old app
has no local autosave and no recent-files list that survives a reload. The
new app keeps that: no new autosave or recent-files persistence is invented.

For a local document the old app's auto-save only ever shows cloud prompts
("save to cloud", or "enable Auto-Save?" leading there) after a few
minutes. Those prompts are part of the dropped cloud flow, so the new app
doesn't show them (parity/scenarios/platform/autosave.spec.ts checks they
are gone, and that a reload recovers nothing, as before).

Also dropped: the "dev mods" setting (UI-STORAGE-011), which evaluates code
stored in localStorage against the old webpack module ids and can't work
with a different build.

## Q-011 Ending a change or event block can throw

GNode._endBlockChanges / _endBlockEvents (chunk.vendor.js module 2): when a
code's count reaches zero and it was the last blocked one, the record is
deleted, but the loop goes on to the next code in the list and reads the
deleted record, which throws a TypeError. Every caller in the old engine
ends blocks with the same list it began them with, so the throw needs a
list that ends codes in a different grouping than it began them. Unclear
whether any UI path does that. Kept: the port throws the same way
(src/engine/scene/node.test.ts "Q-011").

<!-- Engine port, core, math, color, fonts, locale (phase 4 review) -->

## Q-012 GLength.toString appends undefined

Old code: chunk.vendor.js module 132 (GLength), lines 30395-30398.

toString formats the number and then appends `Unit[this._unit]`. The Unit
table is keyed by the upper-case names (`Unit.PX = "px"`), but `_unit` holds
the lower-case value, so the lookup is always undefined and the result reads
"5undefined" or "1.2undefined". I haven't checked whether any UI path shows
this string; a later cluster that calls toString for display would show it.

Kept. Pinned by next/src/engine/math/length.test.ts ("5undefined",
"1.2undefined").

## Q-013 Radial gradient center is lost on reload

Fixed: see BUGS-FIXED.md BUG-002.

## Q-014 HarfBuzz clusters used as string indexes

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

Fixed: see BUG-024 in BUGS-FIXED.md.

<!-- Engine port, geometry and paint (phase 4 review) -->

## Q-015 Fx cache bitmaps count as rendered at once

Old location: chunk.vendor.js module 14, GPaintCanvas.isRendered (lines
5082-5087) with RendererCanvas.isRendered of the recorder (26726-26734);
caller Stylable._getFxCache (117799).

What it does: the old fx cache only used a cached effect bitmap once its
recording had been replayed to the end. A cache made earlier in the same
paint pass (its recording not replayed yet) counted as a miss and the effect
was computed again. The port draws at once, so isRendered() is always true
and such a cache hits right away. The pixels of a hit should be the same as
a recomputed effect, but the scale-mismatch path after a hit (rescaling, or
_resetFxCacheAndState, 117801-117815) now runs in cases where the old code
recomputed.

Why it's unclear: emulating the old miss would mean tracking which recorded
canvases a pass has replayed, which the port has no other use for. A parity
scenario that paints an element with a cached effect across a zoom change
would show whether the rescale path changes pixels.

Kept (as a deviation). Pinned by next/src/engine/style/element-stylable-fx-cache.test.ts
(fake bitmaps answer isRendered true); no test pins the old miss.

## Q-016 A canvas error in a queued tryRunRendering blocks the later ones

Old location: chunk.vendor.js module 103, tryRunRendering (25482-25489) and
render (25561 onwards, the job registered at 25683 and only removed at the
end of a finished replay, 26022).

What it does: when the replay of a tryRunRendering pass hit a canvas error
(for example an arc with a negative radius), render threw after begin/finish
had already reset the render phase, but its render job stayed registered and
the render parameters stayed cleared. Every later tryRunRendering then saw a
job and went into the queue, where it was popped and queued again after
each tile render, so these paints (they only run when a render phase is
active, from 23610 and 44256) never happened again.

Why it's unclear: it is a hang after an error, not a choice. Errors of the
painting code itself (not the canvas) left the render phase on instead,
which blocks even more.

Fixed: see BUG-009 in BUGS-FIXED.md.

## Q-017 A painting error in a tile leaves the render phase on

Old location: chunk.vendor.js module 663, _paintAndRenderInternal (93534-93565).

What it does: scene.paint ran outside the tile renderer's try. An exception
of the painting code (not of the canvas, which only threw at replay inside
the try) left paintAndRender with the render phase on, so every later
paintAndRender only queued or logged "render phase render, waiting": the
view stopped repainting. Canvas errors took the try's path (console error,
cleanup, callback(null, true, false), next request).

Why it's unclear: a hang after a bug elsewhere; a fix would finish the render
phase in a finally.

Fixed: see BUG-009 in BUGS-FIXED.md.

## Q-018 GVertexPolyBoolean ignores its pip_check_policy argument

Old location: public/chunk.vendor.js module 264, constructor at line 46739
(`this.pip_check_policy = d.PIP_CHECK_ODDEVEN`).

What it does: the constructor takes a point-in-polygon policy as its first
argument but always stores odd-even. Compound shapes pass winding for a
winding fill (chunk.vendor.js 45207-45213), so a compound shape with a
winding fill still decides inside/outside of its children by odd-even when
it clips them.

Why it's unclear: the argument exists and callers pass it, so this looks like
a slip, and users can see it on overlapping children of a winding compound
shape. It may also be deliberate, if winding never worked in the clipper.

Kept. Pinned by next/src/engine/geometry/boolean/vertex-poly-boolean.test.ts
"ignores the point in polygon argument and turns policy 0 into AUTO".

## Q-019 common_segments_policy 0 (OUTSIDE) becomes AUTO

Old location: public/chunk.vendor.js module 264, constructor at line 46740
(`this.common_segments_policy = t || d.AUTO`).

What it does: `policy || AUTO` turns OUTSIDE (0) into AUTO (-1), so the
OUTSIDE policy for segments the two shapes share can't be chosen. INSIDE (1)
and the AUTO variants work.

Why it's unclear: OUTSIDE is a named constant of the class, so a caller was
meant to be able to pick it. No caller in the old app passes 0 (the merge
tool passes AUTO, compound shapes AUTO_MAX_PASSTHROUGH), so users can't see
it today.

Kept. Pinned by next/src/engine/geometry/boolean/vertex-poly-boolean.test.ts
"ignores the point in polygon argument and turns policy 0 into AUTO".

## Q-020 A collinear segment pair drops every later intersection too

Old location: public/chunk.vendor.js module 187, _treeIntersect at lines
38653-38662 (`found.splice(P)`).

What it does: on the flattened path (retainBezier without useIntersector, or
blockIntersector), when two segments turn out to be collinear the pair is
marked 666 and earlier hits of that pair are removed with `splice(P)`. With
one argument splice removes everything from P to the end of the list, so hits
of other, unrelated segment pairs found after the first hit of this pair are
dropped as well.

Why it's unclear: the intent was almost certainly `splice(P, 1)`. Shapes
with overlapping edges (an ellipse and a copy of itself, squares sharing an
edge with the block intersector) can lose intersections and then clip
differently.

Fixed: see BUG-014 in BUGS-FIXED.md.

## Q-021 Block intersector adds every quadratic-vs-curve hit

Old location: public/chunk.vendor.js module 187, _treeIntersect around line
38669 (`T.cp2 ? (I.cp2 ? w < 9 : w < 6) : I.cp2 ? 6 : 4`).

What it does: on the flattened path the number of hits kept per curve pair is
limited (cubic-cubic 9, cubic-other 6, curve-line 3 or 2). When the first
curve is a quadratic and the other one is a curve, the expression yields the
constants 6 or 4 instead of a comparison, which are always truthy, so every
hit is added. A quadratic against a nearly equal cubic gives 8 hits for one
pair.

Why it's unclear: the pattern of the other branches suggests `w < 6` and
`w < 4` were meant. It only matters on the block intersector path (compound
shapes with many children, or after the 10 s timeout).

Fixed: see BUG-014 in BUGS-FIXED.md.

## Q-022 Image tracer throws on zero colors or zero quantization cycles

Old code: chunk.vendor.js module 1003 (GImageTracer), colorquantization
233200-233249 and the palette read at 233243.

With `colorquantcycles: 0` the cycle loop never runs, so the index array
stays at -1 and layering reads `layers[-1]`: TypeError "Cannot read
properties of undefined (reading '2')". With `numberofcolors: 0` the palette
is empty and the first palette read throws "reading 'r'".

Unclear because no old caller can reach it: Image > Vectorize passes fixed
options (8 colors, 5 cycles). A later caller with user-set options would have
to validate them, or the tracer should treat 0 as "no output".

Kept. Pinned by image-tracer.recorded.test.ts "throws on colorquantcycles 0
and numberofcolors 0 like the old code" (and two cases in
image-tracer.recorded.json).

## Q-023 Knife cut of an open path with fit on throws "DEBUG is not defined"

Old code: chunk.vendor.js module 1079 (knife cut) _fitVertices, whose
reversed copy of a cut piece (`clone(piece, true)`) reaches the
`DEBUG && console.log(...)` lines of GVertexContainer.clone (module 54,
10757) for a piece that ends inside a cubic; the knife tool call is at 105700
(`f.performCut(T, X, H, Z, j, z, M)`).

performCut(paths, ..., isClosed = false, ..., fit = true) on an open path cut
twice throws ReferenceError "DEBUG is not defined" instead of returning
pieces. The knife tool passes fit = true when a cut path counts as closed by
_isPathClosed with more than one intersection, or when the shape has a fill,
while isClosed comes from the "closed" property, so an open path whose ends
meet, or a filled open path, may reach it.

Unclear whether the knife tool can produce that combination in practice; if
it can, cutting such a path fails with an exception (a BUGS-FIXED candidate).

Kept. Pinned by knife-cut.recorded.test.ts "matches 18 hand-made cuts" (the
open path with fit true case in knife-cut.recorded.json).

## Q-024 Offsetter: offset 0 on an open path with both sides throws

Old location: chunk.vendor.js module 651, GVertexOffsetter._excludeCircleInside
(line 89068, `c.next.point` with `c.next` null).

What it does: offsetting some open paths by 0 with both inset and outset
(a zigzag polyline, for example; a single straight line doesn't) throws
"TypeError: Cannot read properties of null (reading 'point')" from the last
line segment of the joined outline, for every cap and tolerance. Closed paths,
one-sided offsets of 0 and tiny offsets such as 1e-5 don't throw.

Why it's unclear: it's a crash, not a choice. No old caller reaches it: the
Outline Stroke action rejects values equal to 0 (designer.browser.dev.js
76690-76696), Vectorize Border uses `width || 1` and half of it for centered
borders (57279-57281), the Offset action is one-sided, and text on a path
skips offset 0 and is one-sided (chunk.vendor.js 41846-41849). A later caller
with a user-set width of 0 would crash, so a fix (no outline for offset 0) is
a BUGS-FIXED candidate.

Kept. Pinned by vertex-offsetter.test.ts "throws for offset 0 on an open path
with both sides (old crash)" and the `openPolyline 0 inout` cases of
vertex-offsetter.old-outputs.test.ts.

## Q-025 Offsetter: inset-only parts of an open path that touch the source are dropped

Old location: chunk.vendor.js module 651, GVertexOffsetter.generatePolyOffset
(line 87896, loop `B < w.count` over an array).

What it does: when an open path is offset on the inset side only and the
trimmed inset crosses itself, it is split into parts. A part that comes near
the source again is meant to be clipped against it (the outset side does this
through _excludeCircleInside). The old loop runs up to `sourceHits.count`,
which an array doesn't have, so the loop body never runs and every such part
is dropped completely. The inset of an open path therefore loses pieces that
the outset of the same path keeps.

Why it's unclear: it looks like a typo (`.count` of the polyline container
class used on a plain array), but it changes visible output of the Offset
action with a negative value on open paths.

Fixed: see BUG-012 in BUGS-FIXED.md.

## Q-026 Offsetter: the rest of a cut arc starts at an unset cut point

Old location: chunk.vendor.js module 651, GVertexOffsetter._excludeCircleInside
(lines 89054-89055, `new r(v, b)`; v and b are only set by a line cut,
89083-89108).

What it does: when an arc of the offset outline is cut twice by the circle
around a source hit, the remaining piece of the arc is started at the point
(cutX, cutY). Those are function-scoped variables that only a line cut
assigns. With no earlier line cut they are undefined, so the segment starts
at Point(undefined, undefined); after an earlier line cut it starts at that
unrelated point. In every case found so far (random search, about 1 in 6000
open curved paths with both sides) the segment is dropped later and no NaN
reaches the output, but nothing guarantees it.

Why it's unclear: almost certainly meant to be the second circle hit on the
arc; but changing it changes the outline wherever the branch runs.

Partly fixed by BUG-012 in BUGS-FIXED.md: once the inset side clipped its
parts, the unset case put NaN into an inset (random rr 31 of the recorded
cases), so with no earlier line cut the rest now starts at the second circle
hit. After an earlier line cut it still starts at that unrelated point
(kept). Pinned by vertex-offsetter.test.ts "cuts an arc with no earlier line
cut without putting NaN into the output (old quirk)" and the
restArcUndefinedCut cases of vertex-offsetter.old-outputs.test.ts.

## Q-027 Offsetter: the tangent point of a line uses dx for y

Old location: chunk.vendor.js module 651, GVertexOffsetter._getSegmToArcSqrDist
(lines 89210-89246, `g = c[0] * p + o.getY()` with p = dx).

What it does: when a segment touches the circle of an arc (one root of the
circle-line intersection), the touch point is computed as
(p1.x + t * dx, p1.y + t * dx) instead of (p1.y + t * dy). For a horizontal
line the touch point lands off the line, the "touch point within the segment"
test fails and the distance falls back to the end points. A horizontal line
from (-20, 10) to (20, 10) touching a quarter arc of radius 10 at its end
(0, 10) gets a squared distance of 200 instead of 0. The distance decides
which offset parts _gcppFilter keeps.

Why it's unclear: a copy-paste slip, but it decides which parts of an offset
survive, so a fix can change offsets of real shapes.

Fixed: see BUG-013 in BUGS-FIXED.md.

## Q-028 GVertexFitter degenerate fit puts the control points on the end points

Old location: chunk.vendor.js module 380, GVertexFitter._generateBezier (line 67486).

What it does: when the least-squares fit gives an alpha below 1e-6, the code
means to put both control points a third of the chord away from the end
points along the tangents. It calls GMath.ptDist with two points instead of
four numbers; GMath.ptSqrDist returns 0 when an argument is missing, so the
distance is 0 and both control points sit on their end points. The branch
runs often for freehand input (124 times across the parity fitter point sets).

Why it's unclear: it is plainly a typo (the call signature is wrong), but
it shapes every freehand stroke and simplified path that hits a degenerate
fit, so fixing it changes the output of existing drawing flows.

Kept. Pinned by next/src/engine/geometry/vertex-fitter.test.ts "collapses the
control points onto the end points in a degenerate fit, as the old code did"
and the recorded old fits in "VertexFitter against old outputs".

## Q-029 Kept crashes in the vertex helpers (getPathLength, GVertexContainer.clone, QuadTree.clear)

Old location: chunk.vendor.js module 59 GVertexInfo.getPathLength (line
13234), module 54 GVertexContainer.clone (line 10757 and the other
`DEBUG && console.log` lines), module 140 QuadTree.clear (line 31744).

What it does:
- getPathLength throws ReferenceError "cx2 is not defined" on any Curve2
  (cubic) segment.
- GVertexContainer.clone(source, true) logs through an undefined global
  DEBUG, so a reversed clone of a broken source (a curve without its control
  points, a first command that isn't Move, a count mismatch) throws
  ReferenceError "DEBUG is not defined" instead of returning null. It is
  reachable through makeClockWise with a broken curve (parity vertex/container
  "cloneBad").
- QuadTree.clear reads `nodes.length` before checking `nodes`, so it throws a
  TypeError on every tree.

Why it's unclear: these are crashes, which PORTING.md treats as bugs to fix
later. getPathLength and QuadTree.clear have no callers in the old bundles;
clone(reverse) can only crash on malformed vertex data.

Kept. Pinned by next/src/engine/geometry/vertex-info.test.ts
(VertexInfo.getPathLength, the ReferenceError case),
vertex-container.test.ts (the DEBUG log line case) and quadtree.test.ts
"throws on clear, as the old code did".

<!-- Engine port, nodes, styles, shapes, effects (phase 4 review) -->

## Q-030 Subclasses now inherit the _-prefixed static tables

Old code: chunk.vendor.js lines 40-49 (GObject.inherit).

GObject.inherit copied a parent's statics to the child unless the name
started with `_`, was `toString`, or the child already had it. So in the old
engine `GShape._Change`, `GPath._Change` or the `__FX` table of a multi
effect subclass were undefined unless the class set its own. The port uses
ES `class ... extends`, where every static resolves to the nearest ancestor's
value: an unregistered MultiEffect subclass now sees MultiEffect's `__FX`
(null) and GeometryProperties instead of undefined. Only introspection can
tell the two apart, but later ports shouldn't rely on either behaviour (for
example by testing `cls.__FX === undefined` to detect "not registered").

Kept. Pinned by next/src/engine/style/effects/multi-effect.test.ts ("an
unregistered subclass sees MultiEffect's tables through static
inheritance").

## Q-031 Stylable elements share one effect cache array

Old code: chunk.vendor.js line 117522 (`GElement.Stylable.prototype._fxCache
= []`) and 117931 (the full reset in `_resetFxCacheAndState`).

The cache array sits on the mixin prototype, and inheritAndMix copies that
reference into every class it is mixed into (shapes, groups, layers,
symbols). Every stylable element of every class pushes into and splices the
same array until its first full reset gives it its own. Entries are matched
by the effect object and checked against the element's own effects, so an
element doesn't draw another element's bitmap, but one element's cleanup
can drop or keep entries of another, and the shared array holds bitmaps of
all elements that never had a full reset. It looks unintended; whether it
causes visible stale or missing cache hits wasn't checked.

Kept: the port puts one module-level array on every mixed class's
prototype. Pinned by next/src/engine/style/element-stylable-fx-cache.test.ts
("is one array shared by all stylable classes until a full reset").

## Q-032 Accelerated index after a visual update of a child not in the tree

Old code: chunk.vendor.js lines 118350-118360 (GElement.Accelerated
`_handleChange`, ChildVisualUpdate branch).

When a child that isn't in the paint tree yet gets a ChildVisualUpdate, the
layer or group inserts it and renumbers from the previous child's index,
without the `+ 1` the ChildGeometryUpdate branch adds. The child ends up
with the same `_elementIndex` as its previous sibling. Hit testing sorts the
candidates by that index, so two overlapping children with equal indices
come back in tree order rather than stacking order. It reads like a missing
`+ 1`, but it may never be reached in practice, since a child is normally in
the tree before it paints.

Kept. Pinned by next/src/engine/scene/element-accelerated.test.ts ("numbers
the children like the old layer through removes, inserts, updates and a
restore"), whose fixture was recorded from the old GLayer in Node.

<!-- Engine port, text, scene, symbols, images, annotations (phase 4 review) -->

## Q-033 GText: Windows line-break fix runs on every OS

Old: public/chunk.vendor.js, GText.setText (module 70, near 16660). New: next/src/engine/text/text.ts, setText.

The old code tests `GSystem.OperatingSystem.Windows` before replacing "\r\n". That is the enum value (1), not a check of the current OS, so the replacement runs on every platform.

Unclear: the intent was probably "only on Windows", but texts pasted on macOS or Linux have always had their CRLF replaced, and files depend on that.

Kept. Pinned by text.test.ts "lays out crlf" (old-text.json layout.crlf).

## Q-034 GText: setText leaves change events locked while fonts are missing

Old: public/chunk.vendor.js 16687. New: next/src/engine/text/text.ts, setText.

With `lockEvents`, setText calls `core.lockChangeEvents(1)` and then returns early when a run's font isn't resolved yet, without unlocking. The core stays locked until some later setText with `lockEvents` that gets through.

Unclear: looks like a slip. Until the next locked setText, the GTL core sends no change events, so the text editor can stop reacting after a font goes missing. Candidate for a BUGS-FIXED entry.

Fixed: see BUG-010 in BUGS-FIXED.md.

## Q-035 GText: the pending content property is never found

Old: public/chunk.vendor.js 17123-17130. New: next/src/engine/text/text.ts, getTLCore (the pending properties loop).

When the core initializes, the loop over the pending property sets looks for one with `props.hasOwnProperty("content")`. `props` is an array of names, so this is always false and the loop always ends on the last entry.

Unclear: the intent was probably `props.indexOf("content") >= 0`. I haven't checked what a fix would change in files.

Kept. Pinned by text.test.ts "keeps text and properties until it has a workspace" (old-text.json waiting).

## Q-036 GText: pending range flag written as rng, read as toRange

Old: public/chunk.vendor.js 17415-17420 (writes `rng`) and 17158 (reads `toRange`). New: next/src/engine/text/text.ts, PendingProperties.

setProperties before the core exists stores the "apply to the selection" flag as `rng`, but replaying the pending properties reads `toRange`, which is always undefined. Pending properties are always replayed without the flag.

Unclear: a renamed field that one side missed. It only matters before the core is initialized, where there is no selection anyway.

Kept. No direct test; the waiting case in text.test.ts runs the replay with the flag unset.

## Q-037 GText: replaceFonts sets _tfs twice

Old: public/chunk.vendor.js 17984-17985. New: next/src/engine/text/text.ts, replaceFonts.

With a Font as replacement and `updateContent`, the old code assigns `$_tfs = font.getWeight()` and then `$_tfs = font.getStyle()`. The second write wins, so `_tfw` is never updated from the replacement font.

Unclear: the first line was probably meant to set `$_tfw`. Fixing it would change `_tfw` in files after the missing-fonts dialog.

Fixed: see BUG-021 in BUGS-FIXED.md.

## Q-038 GText: the font listener stays after the text leaves the workspace

Old: public/chunk.vendor.js 18206-18213. New: next/src/engine/text/text.ts, _handleChange (WorkspaceDetach).

On WorkspaceDetach the old code schedules `_updateFontManagerListener(true)` 100 ms later, but only when the workspace is gone by then, and `_updateFontManagerListener` does nothing without a workspace. A text that was waiting for a font keeps its FontAvailableEvent listener after it is deleted: the font manager keeps it alive and it still reacts when the font arrives.

Unclear: clearly meant to remove the listener. Candidate for a BUGS-FIXED entry (remove it with the font manager captured before the detach).

Kept. Pinned by text.test.ts "keeps listening for fonts after it leaves the workspace".

## Q-039 GText: the border pattern check reads the text's own _ba

Old: public/chunk.vendor.js 18617. New: next/src/engine/text/text.ts, _paintBorder.

The border paint tests `this.$_ba !== Inside` on the text itself. Texts have no `_ba` property (it belongs to the border paint layer), so the test is always true and the pattern box is always widened by the border reach.

Unclear: the layer's `$_ba` was probably meant. Changing it changes the pattern box of textured borders on text.

Fixed: see BUG-022 in BUGS-FIXED.md.

## Q-040 GText: a legacy blob with a raw trf array throws

Old: public/chunk.vendor.js 18112. New: next/src/engine/text/text.ts, _restoreLegacy.

Restoring a pre-2 text blob (corner coordinates `tlx`/`trx`/`blx`/...) that has `trf` but no `ttrf` uses the raw stored array as a transform and calls `preMultiplied` on it, which throws a TypeError. The text can't be restored.

Unclear: probably `Transform.deserialize(blob.trf)` was meant. No such file is known to exist; old files with corner coordinates store `ttrf`.

Kept. Pinned by text.test.ts "keeps the old slip of a raw trf array throwing" (old-text.json quirks.rawTrf).

## Q-041 GText: fake text reads only the first backup outline

Old: public/chunk.vendor.js 16880-16887 and 16915-16921. New: next/src/engine/text/text.ts, readVertex and hasVertexForRead.

A fake text (missing or embedded fonts, with `_bkpPath`) has one backup path per style run. readVertex and hasVertexForRead use `_vertexIterator`, which never moves on, so only the first backup path's vertices come out. The outline view border, vertex readers and exports of mixed-style text with missing fonts show only the first run.

Unclear: an old bug users can see. Fixing it changes outlines and exports of such texts. Candidate for a BUGS-FIXED entry.

Fixed: see BUG-020 in BUGS-FIXED.md.

## Q-042 GText: the MAXLENGTH cut can split a surrogate pair

Old: public/chunk.vendor.js 17850-17869. New: next/src/engine/text/text.ts, _shorten.

The 8192 limit counts UTF-16 code units and cuts with `substr`. A string or run that crosses the limit in the middle of an emoji keeps a lone high surrogate, which is then stored in `content`.

Unclear: harmless for most text, but it writes malformed UTF-16 to the file.

Kept. Pinned by text.test.ts "cuts at MAXLENGTH code units, even inside a surrogate pair" (old-text.json maxLength).

## Q-043 GText: undoing attachPath through the recorder leaves the text detached

Old: public/chunk.vendor.js 17452 (`"atPath" != V || this.isRecordedTransaction()`) and the recorded branch after it. New: next/src/engine/text/text.ts, setProperties.

When the transaction recorder replays `atPath`/`trf` (recordedTransaction set), setProperties skips all path work and only stores the values. In the probe, a text moved from one path to another and then undone through the recorder's revert actions ends with `hasPathAttached()` false, and redo doesn't attach it again either. The stored `atPath` and `trf` are the old ones.

Unclear: the editor's undo may restore the attachment by other means (it records more than these property changes); this is what the engine alone does. Check when the editor phase ports undo of "attach text to path".

Kept. Pinned by text.test.ts "undoes and redoes through the transaction recorder (attachUndone)" and "(attachRedone)".

## Q-044 GTL parseFont reads oblique as strikeout

Old: public/chunk.vendor.js:35205 (GTLUtil.parseFont, module 161). New: next/src/engine/text/gtl/tl-util.ts (parseFont, case "oblique").

parseFont sets `strikeout: true` for the word "oblique" instead of an oblique or italic style. A CSS font string with "oblique" therefore gives an upright font with strikeout.

Unclear: looks like a copy slip (the italic case sits right above), but it decides how a parsed font string formats text, and fixing it would change the formatting of such runs.

Kept. Pinned by tl-core.test.ts "parses fonts and CSS like GTLUtil" (the `'oblique small-caps lighter 9px/1.5 "Quoted Family"'` case in gtl-probe.ts).

## Q-045 GTL deCRLFify replaces only the first line break

Old: public/chunk.vendor.js:35259-35262 (GTLUtil.deCRLFify, module 161). New: next/src/engine/text/gtl/tl-util.ts (deCRLFify).

`String.prototype.replace` with a string pattern replaces only the first match, so only the first "\r\n" and the first remaining "\r" become "\n". Tabs are all replaced (that one is a /g regex). TLCore.setText runs it on every string, so text with Windows line breaks (pasted or set through the API) keeps stray "\r" characters after the first line.

Unclear: clearly meant to normalize all line breaks; the leftover "\r" is laid out and saved in `content`. A fix changes saved text, so it needs a BUGS-FIXED entry and a parity exception.

Fixed: see BUG-023 in BUGS-FIXED.md.

## Q-046 GTL Formatting.merge recurses forever on an array of runs

Old: public/chunk.vendor.js:32008-32010 (Formatting.merge, module 148). New: next/src/engine/text/gtl/formatting.ts (merge).

With one array argument merge folds it with `Array.prototype.reduce(merge)`. reduce passes four arguments (accumulator, value, index, array), and merge with more than two arguments wraps them into an array and calls itself again, so an array of two or more runs recurses until the stack overflows (RangeError). Range.getFormatting avoids it with its own two-argument wrapper.

Unclear: the array form never works for more than one run. Nothing in the engine calls it that way today, as far as I found.

Kept. Pinned by tl-core.test.ts "keeps the old slips: merge of a run array, deferred initialize, unknown codes" (`quirks.mergeArray` is "throws RangeError").

## Q-047 GTL TLCore.initialize throws after deferred settings

Old: public/chunk.vendor.js:64021-64046 (GTLCore.initialize), 64775-64778 (_setDeferred), module 367. New: next/src/engine/text/gtl/tl-core.ts (initialize, _setDeferred).

Setters called before initialize store their value with _setDeferred, which writes every value under the key "name" (so only the last one survives). initialize then tests `hasOwnProperty(text)` with an undeclared `text`, which throws ReferenceError "text is not defined" whenever anything was deferred. The port throws the same error.

Unclear: the deferred settings never apply; a core that was configured before initialize can't be initialized. GText initializes its core before setting anything, so the app doesn't hit it as far as I found.

Kept. Pinned by tl-core.test.ts "keeps the old slips: merge of a run array, deferred initialize, unknown codes" (`quirks.deferredInit`: `{name: 10}` after setText then setWidth, then the ReferenceError) and "fires events, clones and handles an uninitialized core" (`fresh._deferredSettings`).

## Q-048 GTL unknown code objects

Old: public/chunk.vendor.js:121145 (the word splitter reads `.block` of the resolved code), 74124-74130 (Part.DefaultInline.draw), modules 927 and 510. New: next/src/engine/text/gtl/characters.ts (WordSplitter), next/src/engine/text/gtl/inline.ts (DefaultInline).

A run whose text is a code object that no code resolves (`{ $: "NoSuchCode" }`) makes the word splitter throw (it reads `.block` of undefined), so TLDocument.load returns false and the text stays empty. Part falls back to DefaultInline for such codes, but that is never reached through load or splice. DefaultInline.draw would throw anyway: it calls `context.fillText`, which TLCanvasContext doesn't have, after Part.draw's `context.save()` and without the matching restore.

Unclear: DefaultInline looks like it was meant to show unknown codes as a "?" box, but neither path works. A file with an unknown code loses the whole text on load.

Kept. Pinned by tl-core.test.ts "keeps the old slips: merge of a run array, deferred initialize, unknown codes" (`quirks.unknownInline`: load false, empty text) and gtl-core-quirks.test.ts "Part.DefaultInline throws in draw on a context without fillText, after the box".

## Q-049 GTL Per evaluates string mappers

Old: public/chunk.vendor.js:73843-73845 (module 509, the per library's toFunction). New: next/src/engine/text/gtl/list-util.ts (toFunction).

Per.map and Per.filter accept a string such as "x * 2" and turn it into a function with `new Function("x", "return " + mapper)`. No engine code passes a string; only gtl-probe.ts does, to pin the behaviour. Under a Content-Security-Policy without 'unsafe-eval' this branch would throw.

Unclear: dropping the branch (or throwing for strings) changes nothing for engine callers, but it is an API difference and the probe records the old result. The ready-shape port replaced Function() with a parser; here the eval stays for parity.

Kept. Pinned by tl-core.test.ts "runs per sequences" (the string mapper case in gtl-probe.ts).

## Q-050 GTL undo splices at the start and rolls back in a cascade

Old location: public/chunk.vendor.js:89677-89688 (module 652, makeEditCommand), 90226-90236 (performUndo), 89759-89762 (layout rolls back through performUndo). New: next/src/engine/text/gtl/document.ts, makeEditCommand, performUndo and layout.

What it does: the inverse command of a word splice is built as `this.makeEditCommand(this, start, words.length, removed)`, so the document is passed as the start and the start as the count. Undoing an edit runs `words.splice(document, start, insertedCount)`: the document coerces to 0, so it deletes the first `start` words and puts a number into the word array. The next layout throws inside its try, finds no frame and calls performUndo again, which pops the next transaction, until the undo log is empty. After that the document has no frame and plainText and save throw. Redo then puts `undefined` into the word list as well. TLCore.undo/redo and every layout failure (for example a splice that can't lay out) go through this.

Why it's unclear: the editor never calls TLCore.undo (it has its own undo), so the only reachable path is the rollback after a failed layout, which then corrupts the document instead of restoring it. Passing the right arguments (`start, words.length, removed`) would make undo and the rollback work, but it changes what a failed layout leaves behind.

Fixed: see BUG-025 in BUGS-FIXED.md.

## Q-051 GTL blocks never have a next block

Old location: public/chunk.vendor.js:89848-89850 (module 652, blocks: `next: { value: t[i + 1] }`, where `t` is the range, not the block list), used by listify at 119477-119491. New: next/src/engine/text/gtl/document.ts, blocks; next/src/engine/text/gtl/range.ts, listify.

What it does: every block that blocks() emits has `next` undefined, because it reads index `i + 1` of the range object. listify asks `next && next.isList()` to skip the closing ListEnd when a list follows; that never happens, so listify always appends a ListEnd and a following list is joined only by the edit filter, if at all.

Why it's unclear: the code clearly meant the next block. Reading it from the block list would change which runs listify writes when a list follows the listified range.

Kept. Pinned by next/src/engine/text/gtl/tl-core.test.ts, "edits blocks" (old-gtl.json), and the toggleList cases there.

## Q-052 GTL edit filter decrements past zero after removing a stray list end

Old location: public/chunk.vendor.js:120521-120566 (module 920, GTLCodes.editFilter). New: next/src/engine/text/gtl/tl-codes.ts, editFilter.

What it does: when a ListEnd appears while no list is open, the filter splices it out, but then still pops the open-formatting stack and decrements the open count, so the count goes negative for the rest of that pass. The splice makes the filter run again, so the next pass starts from zero and the result is the same as removing the code.

Why it's unclear: probably a missing `break`/`else`. It has no visible effect that I found, since the splice triggers another pass.

Kept. Pinned by next/src/engine/text/gtl/document.test.ts, "repairs list codes: strayListEnd" and "endAfterList".

## Q-053 GTL code names found on the old GTLCodes function

Old location: public/chunk.vendor.js:120254-120257 (module 920, `var n = c[e.$]; return n ? new n(e, t, i) : null`, where `c` is the GTLCodes function). New: next/src/engine/text/gtl/tl-codes.ts, codeFactory and failForFunctionProperty.

What it does: the old lookup also found names that aren't codes: the function's own `name` and `prototype`, and everything on Function.prototype and Object.prototype (`toString`, `call`, `bind`, `constructor`, `hasOwnProperty`, `__proto__` and so on). `new` on any of them throws: TypeError for the methods and values, SyntaxError for `constructor` (Function is called with the code object as a parameter name). `length` (0), `caller` and `arguments` (null on a sloppy function) give null. The port keeps the codes in a plain object and reproduces the throws for those names without calling them. In both apps a code object with an unknown name, thrown or not, makes loading the text fail (the word splitter reads `block` of the missing code), so the visible effect is the same; only TLCodes.codeFactory called directly differs.

Why it's unclear: only a malformed or hand-made file has such a name. Returning null for every name that isn't a code would be cleaner and changes nothing a user sees.

Kept. Pinned by next/src/engine/text/gtl/document.test.ts, "looks code names up like the old GTLCodes function object".

## Q-054 Changing the scene's ms throws

Old: chunk.vendor.js 34945-34953 (GScene._handleChange, AfterPropertiesChange) and 34110-34123 (refreshPagesPositions).

Setting `ms` calls refreshPagesPositions, which calls `refreshPosition()` on every child of the scene. Pages and the styles container have no such method, so this throws a TypeError as soon as the scene has a child. If it has none, the next line reads an undeclared `mpIdx` and throws a ReferenceError. So `ms` can never be changed without an exception.

Unclear: `ms` looks like a leftover of an older multi-page layout; nothing in the UI seems to set it, but a file or plugin that does gets an exception from setProperty.

Kept. Tests: src/engine/scene/scene.test.ts "throws when ms changes: pages have no refreshPosition" and "throws the old mpIdx ReferenceError when ms changes and no child needs a position".

## Q-055 Restoring a scene adds page keys to GScene.VisualProperties

Old: chunk.vendor.js 34807-34809 (GScene restore).

When a scene blob has page properties at the scene level (w, h, margins, bleed, bck, as files before 3.10 have), restore adds those names to the shared GScene.VisualProperties table itself, not to a copy. The table stays changed for the rest of the session: every scene made afterwards gets own `$w`, `$bl`, ... fields set to null. They are null, so they are not written into later files (checked: a scene stored after the leak has no w/bl/h keys).

Unclear: it looks like a slip (a copy was meant), but the visible effect is limited to the defaults table and the own null fields; nothing reads them through the scene, which forwards page properties to the active page.

Kept. Test: src/engine/scene/scene-probe.test.ts "visualLeak" (recorded in the old app, __fixtures__/old-scene.json). The same case also shows that restoring a scene blob without children and with w set throws a TypeError in both apps.

## Q-056 Selector engine quirks

Old: chunk.vendor.js 73243-73790 (module 507, the Slick-based node selector engine).

- `:first-child` (and `:first`) never matches: it asks `index(node, 0)`, which counts children from 1.
- `:nth-child(3)` matches the second child, `:even` the 1st, 3rd, ... child and `:odd` the 2nd, 4th, ...
- `#id` asks the scene for `getById`, which GScene doesn't have, so it throws a TypeError.
- A single `.tag` passes the tag text where a RegExp is expected; it would throw once a node has tags, but no node class has the Tag mixin.
- The `^` combinator calls `+` with its arguments shifted, which throws a TypeError when the first child doesn't match.
- In a list (`a, b`) later groups don't skip nodes an earlier group found, so a node can appear twice.

Unclear: the engine itself only uses simple selectors (`page`, `layer:active`, `:selected`), so these are reachable only from plugins or future code that uses the full syntax.

Kept. Tests: src/engine/scene/selector.test.ts "keeps the old nth quirks", "repeats nodes found by an earlier group of a list", "throws from ^ when the first child doesn't match, as the shifted old call did", "throws for ids, since the scene has no getById".

## Q-057 Nested transactions drop the outer actions

Old: chunk.vendor.js 71047-71090 (GTransactionRecorder.beginTransaction / endTransaction).

The recorder keeps one action list. beginTransaction replaces it, endTransaction returns it and stops recording. A transaction begun inside another therefore loses what the outer one recorded so far, and changes made between the inner end and the outer end are not recorded at all; the outer end returns null.

Unclear: whether any editor path nests transactions (for example a command that calls another command). If one does, undo of the outer step misses changes.

Kept. Test: src/engine/undo/transaction-recorder.test.ts "drops the outer actions when a transaction begins inside another".

## Q-058 The page shadow needs the editor's paint configuration

Old: chunk.vendor.js 23164-23328 (GPage._paint).

In the multi-page view with pages that can overlap, a fixed-size page with a background reads `configuration.pageDecoration` for its drop shadow. Only GEditorPaintConfiguration has that field (the app sets its shadow at boot: blur 4, offset y 2, rgba(0,0,0,0.25)). A plain GScenePaintConfiguration with multiPageView set throws a TypeError there. Firefox on Windows draws a thin frame instead and passes 1 as the paint.

Unclear: whether any non-editor paint (export, thumbnails, a plugin) ever paints with multiPageView; if so it throws.

Kept. Test: src/engine/scene/scene-probe.test.ts "paint" (cases overlapNoDecoration and overlapShadow, recorded in the old app).

## Q-059 Rebuilding an instance moves the master's children

Old location: public/chunk.vendor.js:42385-42405 (GSymbol.synchronize, the `else` branch taken by `synchronize(null, true)`).

What it does: the instance copies the master's properties, clears its children and appends a clone of each master child. The re-based transform (`_swapBaseTransforms(child trf, master trf, instance trf)`) is then written with `setProperty("trf", ...)` on the master's child, not on the copy. So every rebuild moves and scales the master's content by the instance's transform, and the copies keep the master's old transforms.

Why it's unclear: it reads like a typo (`e` for the copy), but it changes the master and every other instance, and the result is saved.

Kept. Pinned by engine-model/symbols-branches/synchronize-desynchronize (`masterAfterRebuild`, `rebuild`), run in Node by next/src/engine/scene/symbol-scenarios.test.ts.

## Q-060 Rebuilding an instance keeps the old nodes in its sibling map

Old location: public/chunk.vendor.js:42385-42405 (same branch), with the sibling bookkeeping in `_afterNodeInsert`/`_beforeNodeRemove`.

What it does: `synchronize(null, true)` (and `synchronize(null, true, true)`) clears the children and inserts fresh copies, but the removed children's entries stay in `_siblingMap`. Each rebuild grows the map (25, then 46, then 67 entries for a 3-child instance with a path and an image in the scenario), and the stale entries still point at detached nodes.

Why it's unclear: probably an oversight. I haven't traced whether anything later reads the stale entries.

Kept. Pinned by engine-model/symbols-branches/synchronize-desynchronize (`onlySiblings`, `keepFrame`, `rebuild` sibling counts).

## Q-061 Swapping for the same master drops the first swap pair

Old location: public/chunk.vendor.js:42760-42785 (GSymbol.swapWith, the `swp` cycle removal, "Strange swap array!").

What it does: inside an instance, each swap pushes the pair (old master, new master) to the parent's `swp`. When a pair has the same master twice (an instance of C swapped for C again), the repair branch runs `splice(0, 2)`, which removes the first pair of the array, not the pair it found. After B -> C, then C -> C, `swp` is [C, C] instead of [B, C]; swapping back to B then leaves [C, B] instead of an empty array. `swp` isn't saved, but `_translationSwapped` and `synchronize` read it for the rest of the session.

Why it's unclear: it looks like `splice(d - 1, 2)` was meant.

Kept. Pinned by engine-model/symbols-branches/nested-and-swaps (`swapSameAfterSwap`, `swapSameThenBack`).

## Q-062 Instance texts miss master text changes made outside the text editor

Old location: public/chunk.vendor.js:43418-43556 (GSymbol text content merge in the property push), with GText.setText not writing `content` (module 70).

What it does: a master text's content change reaches an in-sync instance through a merge against the master's previous `content` value. setText doesn't store `content` right away (a new text has `content` null, later it lags one change behind), so the merge compares with a stale or empty previous text and finds nothing to apply. In the scenario an instance keeps "Hello world" at size 20 after the master's size is set to 30 and its text to "Hello there" without a selection. Only formatting a selection while the text is edited reaches the instance.

Why it's unclear: the instance looks in sync (no override is recorded) but shows old text. It may be a bug in the old app that users see when editing a master text through the inspector.

Kept. Pinned by engine-model/symbols-branches/text-merge (`size`, `text`, `collapsedText`), run in Node by next/src/engine/scene/symbol-scenarios.test.ts (not run against the new app yet: its parity build has no font providers).

## Q-063 Image error cross ignores the crop origin

Old: public/chunk.vendor.js module 95, GImage._paintImageCanvas (24921-24936). New: next/src/engine/scene/image.ts, _paintImageCanvas.

An image whose bitmap failed to load paints the grey placeholder box (px, py, pw, ph) and a red cross over it. The two lines go from (px, py) to (pw, ph) and from (pw, py) to (px, ph), so they end at pw/ph instead of px + pw / py + ph. With a crop box that doesn't start at 0 the cross is off the box.

Unclear because it looks like a slip (end coordinates passed as sizes), but it is what users see for broken images in files with a crop.

Fixed: see BUG-018 in BUGS-FIXED.md.

## Q-064 Image hit test throws on a degenerate transform

Old: public/chunk.vendor.js module 95, GImage._detailHitTest (24644-24689). New: next/src/engine/scene/image.ts, _detailHitTest.

The pixel hit test inverts itrf times the view transform and maps the location with it. When itrf or the view transform has a zero scale, inverted() returns null and mapPoint throws a TypeError. A null view transform throws at getScaleFactor(). An image without itrf is fine (identity times the view transform).

Unclear because a hit test that throws aborts the whole hit test of the page, but a zero-scale image can only come from a broken file or a degenerate transform.

Kept. Pinned by image.test.ts "throws for a null view transform (getScaleFactor)".

## Q-065 Image preview canvas has the placeholder's size

Old: public/chunk.vendor.js module 95, GImage._updateTemporaryImage (24966-24984). New: next/src/engine/scene/image.ts, _updateTemporaryImage.

For a tmpUrl preview the image element gets width and height set to getWidth()/getHeight() before it loads, which is the placeholder size (iw x ih, or 100 x 100) because the image isn't loaded yet. _initImageCanvas then sizes the preview canvas from element.width/height, so the preview is drawn into a 100 x 100 canvas whatever the preview bitmap's size, while the shape box takes the preview's natural size.

Unclear because the preview is stretched to the placeholder size; it may have been meant to use naturalWidth/naturalHeight.

Kept. Pinned by parity engine-model/image/load-and-url (preview: canvas [100, 100], source box [0, 0, 8, 6]) and engine-model/image/paint-preview.

## Q-066 Image grid layout and margin changes don't reset the outline

Old: public/chunk.vendor.js module 534, GImageGrid._handleChange (75741-75860). New: next/src/engine/scene/image-grid.ts, _handleChange.

The grid caches its vertices in _vertexSource. Only FinishGeometryUpdate (or a child insert, remove or geometry update of the images container) clears it. Setting `grid` or `mg` doesn't, so after reading the outline once, a layout or margin change keeps the old cells until something else sends a geometry update.

Unclear because the outline and hit area of the grid stay stale; the editor probably always triggers a geometry update around these changes, so users may never see it.

Kept. Pinned by image.test.ts "doesn't reset its vertices when the margin or the layout changes (kept)" and parity engine-model/image/grid-images (stale) and engine-model/special/image-grid.

## Q-067 Image in a grid gets NaN offsets in itrf after it loads

Old: public/chunk.vendor.js modules 95 (GImage) and 534 (GImageGrid). New: next/src/engine/scene/image.ts, next/src/engine/scene/image-grid.ts.

An image added to a grid with addImage before its bitmap loads ends up, once loaded and fitted into its cell, with an itrf whose translation is NaN (trf is fine). I haven't traced where the NaN comes from; both apps give the same values.

Unclear because a NaN itrf looks wrong and would serialize as null; it may affect how such an image paints or saves.

Fixed: see BUG-017 in BUGS-FIXED.md.

## Q-068 Scene dictionary flush keeps the memory of dropped canvases

Old location: public/chunk.vendor.js 92356-92371 (GSceneDictionary.flush, module 658), with 92239-92272 (_updateReferences).

What it does: flush first calls _updateReferences(entries, true), which already deletes every entry without references from the map (removeEntry with `remove`). Its second loop, meant to delete those entries and call workspace.decreaseMemoryForImage on their cached canvas, then only sees the entries that survived, so it never gives the memory of a dropped canvas back. The workspace's image memory count only grows over a session of saves that drop images.

Why it's unclear: the second loop looks written to release the memory, so this reads like a slip, not a design. It has no visible effect until the budget (MEMORY_LIMIT) is reached, after which images stop caching.

Kept. Pinned by next/src/engine/style/scene-dictionary-scene.test.ts "flushes entries nothing uses" (recorded from the old app: `decreased` is empty).

## Q-069 Texture swatches keep their plain url, so flush drops their entry

Old location: public/chunk.vendor.js 92188-92212 (_afterInsertEvent), 92229-92238 (_redirectUrl), 92239-92272 (_updateReferences).

What it does: when a swatch with a texture pattern is inserted, _afterInsertEvent sees a plain url and calls _redirectUrl, which creates a dictionary entry but only rewrites the url of paint layers and images, not of swatches. The swatch keeps its data url, the new entry has nobody pointing at it, and the next flush (every save) drops it again. Swatches that already hold a dictionary url are counted as references.

Why it's unclear: creating the entry has no effect except an extra entry until the next save, so either swatches were meant to be redirected too or the entry shouldn't be created.

Kept. Pinned by next/src/engine/style/scene-dictionary-scene.test.ts "counts swatches with dictionary urls".

## Q-070 Symbol dictionary never removes its thumbnail listeners

Old location: public/chunk.vendor.js 121611-121614 (_afterInsert adds `this._updateThumbnail.bind(this)`), 121626-121630 (_beforeRemove removes a new bind), 121664-121681 (release removes the unbound method), module 933.

What it does: every master inserted into the scene gets a fresh bound listener for AfterThumbnailUpdate. _beforeRemove and release try to remove it with a different function (a new bind, or the unbound method), so nothing is removed. A removed master, or a master of a released scene, still writes its thumbnail into the dictionary entry, and each re-insert adds one more listener.

Why it's unclear: the remove calls show the intent to unsubscribe; the effect is a small leak and writes into entries that may no longer belong to the scene.

Kept. Pinned by next/src/engine/style/symbol-dictionary.test.ts "keeps listening to a master's thumbnails after removal and release".

## Q-071 Removing a symbol dictionary entry without a value throws

Old location: public/chunk.vendor.js 121631-121663 (removeEntry with `remove`, `i.value.symbol`), module 933.

What it does: removeEntry(entry, true) reads `entry.value.symbol` before anything else; an entry whose value is null (an entry restored from a blob that saved only its id, or one added by hand) throws a TypeError. Without `remove` it only drops a reference.

Why it's unclear: entries saved with references have value null, so whether a caller can reach this with such an entry depends on the editor's symbol removal paths, which aren't ported yet.

Kept. Pinned by next/src/engine/style/symbol-dictionary.test.ts "throws when removing an entry without a value for good".

## Q-072 GEmptyAnnotation restores none of its meta properties

Fixed: see BUGS-FIXED.md BUG-003.

## Q-073 Annotation model slips kept

Old locations and what they do:

- chunk.vendor.js:55319-55331 (GCommentAnnotation.initSizeAndPosition): when the pin already has an invertible `trf`, it calls `GTransform.invert`, which doesn't exist, so it throws a TypeError. A singular `trf` is left alone; no `trf` gets the icon transform. The editor's comment tool (107210-107211) only calls it on a fresh pin. PDF annotation import (238659) may call it after setting a `trf`, which would throw; that path isn't ported or tested yet.
- chunk.vendor.js:72948 (GAnnotationsList.getSelected): pushes into an undeclared `selectedAnnots`, so it throws a ReferenceError as soon as one annotation is selected, and otherwise returns `[]`.
- chunk.vendor.js:235442-235444 (GEmptyAnnotation.isVisible): tests `Flag.Hidden` of GSceneNode's flag table, which has no such bit, so it is always true.
- chunk.vendor.js:235477-235481 (GEmptyAnnotation `vis` change): sets or clears the Hidden flag and calls `_requestInvalidation`, which a scene node doesn't have, so changing `vis` throws a TypeError. Showing clears the flag before the throw; hiding throws before the flag is set.
- chunk.vendor.js:56612-56636 (GActionable.getActionsBBox): the row box doesn't move the second button and moves the third by the second's width plus 5, so the second button overlaps the first in the box.
- chunk.vendor.js:23756-23773 and 63928-63939 (GAnnotation `uid` change): adds the new uid to `read`, and throws a TypeError when `read` isn't an array.

Why it's unclear: each one is a slip in the old code, but none of them corrupts a file. Fixing them changes editor behaviour (selection of annotations, the comment pin, the review sidebar) that the editor phase has to check.

Kept. Pinned by special-annotations.test.ts ("throws on a second sizing, as the old GTransform.invert call did", "is always visible and throws when vis changes", "lays the buttons out right to left above the top right corner"), annotations-list.test.ts ("throws in getSelected once an annotation is selected (old slip)") and annotation.test.ts ("adds a new uid to read, and throws when read isn't an array").

## Q-074 Hit tests of annotations throw without a transform

Old location: chunk.vendor.js:55116-55135 (GCommentAnnotation.hitTest), 75324-75331 (GCollabText._detailHitTest), 56637 (GActionable.hitActionTest).

What it does: GCollabText's hit test ends in `hitActionTest(location, transform)`, which maps the button box with the transform, so any hit test without a transform throws a TypeError (even a miss on the shape). GCommentAnnotation and annotations in an annotations list throw a TypeError when a tolerance is given without a transform and the paint box test passes but the shape test misses the fill (the outline test maps through the transform).

Why it's unclear: the editor always passes a view transform, so the app never hits this; other callers (tools, plugins) would.

Kept. Pinned by annotations-probe.test.ts ("comment: leftTolerance3", "list: hitEllipseOutline", "collab: hitNoTransform", "collab: detailNullTransform"), recorded from the old app.

<!-- File formats, SVG export and import (phase 5 review) -->

## Q-075 SVG import arc rotation

Old location: public/chunk.vendor.js 248961-248962 (module 1392, arcToBezier: `Math.sin((A * n.PI2) / 360)`).

What it does: the arc helper turns `xAxisRotation` into radians as if it were degrees, but the path parser already passes radians. A rotated elliptical arc (`A rx ry 30 ...`) comes out with its rotation divided by about 57, so it is drawn almost unrotated.

Why it's unclear: clearly a units slip, but every rotated arc in an imported SVG has always looked this way in Gravit, and fixing it changes the geometry of imported files.

Fixed: see BUG-070 in BUGS-FIXED.md.

## Q-076 SVG import font listeners

Old location: public/chunk.vendor.js 245165-245185 (_resolvedFont removing the FontAvailableEvent and FontUnavailableEvent listeners), 245261 (addFontToResolve adding them once).

What it does: the importer adds its font listeners with the first font it waits for and removes them when no font is left to resolve. The flag that says they are on is never reset, so a font asked for after that is never answered, the job count never reaches zero and the import never calls back.

Why it's unclear: a text whose font is only asked for after another font has resolved (fonts that resolve at different times, an unknown family whose fallback is looked up later) hangs the import; whether that happens in practice depends on the font provider's timing.

Fixed: see BUG-071 in BUGS-FIXED.md.

## Q-077 SVG import font provider queue

Old location: public/chunk.vendor.js 245110-245135 (svg.fontProvider.queryFirst, the `fontCallbackMap` keyed by `t + "_" + i + "_" + n` of the query).

What it does: queries to the font provider are queued by a key built from the query, but the query is an object, so every key is "[object Object]_undefined_undefined". While one query is out, every later one waits for it and gets the same answer, whatever family it asked for. The answer is passed on with all its arguments.

Why it's unclear: the key was meant to tell families apart. With a provider that answers synchronously nothing waits, so whether two families get mixed up depends on the provider.

Fixed: see BUG-072 in BUGS-FIXED.md.

## Q-078 SVG import nested svg

Old location: public/chunk.vendor.js 246275 onwards (svg.Element.svg).

What it does: a nested `<svg>` becomes a group whose x, y and viewBox fit go into the transform its children get. The group itself gets no transform, no name and none of the nested svg's style.

Why it's unclear: a style or name on the nested svg is lost, although its children inherit the style through canvg's lookup; it may be on purpose (the outer svg is handled the same way) or an oversight.

Kept. Pinned by the io-import-svg/structure-svg and io-import-svg/viewbox-aspect-svg parity scenarios.

## Q-079 SVG import switch

Old location: public/chunk.vendor.js 246421 onwards (svg.Element.switch).

What it does: a `<switch>` takes the scene node of its first child that is neither a foreignObject nor an unknown element, then builds every child into it, so all of its children are drawn instead of only the first matching one. A switch holding Gravit's editing data replaces the whole import with the original document instead.

Why it's unclear: SVG renders only the first child whose conditions match. Files that rely on switch for fallbacks import with every alternative on top of each other.

Fixed: see BUG-073 in BUGS-FIXED.md.

## Q-080 SVG import text box

Old location: public/chunk.vendor.js 247571-247580 (svg.Element.TextElementBase getBoundingBox).

What it does: the box of an imported text, which gradients and patterns on the text are fitted to, uses the text's width as its height too.

Why it's unclear: looks like a typo for getHeight(); gradient and pattern fills on imported text are placed against a square box.

Kept. Pinned by the io-import-svg/text-layout-svg parity scenario (a text with a gradient fill).

## Q-081 SVG import text children

Old location: public/chunk.vendor.js 247583 onwards (svg.Element.text).

What it does: every tspan (and every text node, which becomes a tspan) gives one Gravit text. The texts then get the settings (position, style) of the text element's child at the same index, which is not always the tspan they came from when the text mixes text nodes, tspans, textPaths, trefs and anchors.

Why it's unclear: the index pairing only lines up when the children are all tspans; mixed content gets shifted positions or styles.

Fixed: see BUG-074 in BUGS-FIXED.md.

## Q-082 SVG import image listener

Old location: public/chunk.vendor.js 247930-247945 (svg.Element.image, `i.image.removeEventListener(x.StatusEvent, this)`).

What it does: the image's status listener sizes the image to the element's width and height once it has loaded, then tries to remove itself with `this` instead of the listener function, which removes nothing. Every later status change (a reload) scales the image again.

Why it's unclear: the remove call shows the intent; the effect only shows when the image loads more than once.

Kept. Pinned by the io-import-svg/images-svg-placed parity scenario.

## Q-083 SVG import use

Old location: public/chunk.vendor.js 248111 onwards (svg.Element.use).

What it does: a `<use>` builds a fresh copy of the referenced element from its DOM node (without parent or type) and gives it the use's style and other attributes. The use's class attribute is copied only after the copy has picked its CSS rules, so CSS rules for the use's classes don't style the copy.

Why it's unclear: in browsers the instance inherits from the use element, so class rules on the use apply. Imported files that style `<use>` by class lose that style.

Fixed: see BUG-075 in BUGS-FIXED.md.

## Q-084 SVG import feColorMatrix

Old location: public/chunk.vendor.js 248535 onwards and 248669 (svg.Element.feColorMatrix apply: `e.getImageData(...)`).

What it does: canvg recolored canvas pixels in feColorMatrix's apply. The importer calls apply with its scene context, which has no getImageData, so a filter with an feColorMatrix that the importer applies throws a TypeError and the import fails.

Why it's unclear: the canvas code was left behind when the fork switched to building scene nodes; color matrix filters are common in exported SVGs.

Fixed: see BUG-077 in BUGS-FIXED.md.

## Q-085 SVG import line bounds

Old location: public/chunk.vendor.js 245486-245510 (svg.Rect, `expand`).

What it does: canvg's bounding box, which gradients and patterns use for objectBoundingBox units, moves its bottom edge to the x of a point below it instead of the y, so boxes of lines and paths come out wrong vertically.

Why it's unclear: an x/y slip; gradient and pattern fills with objectBoundingBox units on paths are placed against that box.

Fixed: see BUG-078 in BUGS-FIXED.md.

## Q-086 SVG import em units

Old location: public/chunk.vendor.js 245360 (svg.Property getEM, reading the font of `i.ctx`).

What it does: em and ex lengths are relative to the font of canvg's canvas context. The importer never sets one, so any em or ex length throws a TypeError ("Cannot read properties of undefined (reading 'font')") and the import fails.

Why it's unclear: em units are valid SVG; files that use them can't be imported at all.

Fixed: see BUG-079 in BUGS-FIXED.md.

## Q-087 SVG import matrix order

Old location: public/chunk.vendor.js 245652 (svg.Transform.Type.matrix).

What it does: in a transform list, `matrix()` is applied on the other side (multiplied instead of pre-multiplied) than translate, scale and rotate, so a matrix after another function applies in the opposite order.

Why it's unclear: transform lists like `translate(10) matrix(...)` import with a different result than browsers show; single matrix() transforms, the common case, are unaffected.

Fixed: see BUG-080 in BUGS-FIXED.md.

## Q-088 SVG export text font colors

Old location: public/chunk.vendor.js 257703 (the SVG text word's renderSVG: `E instanceof s || y.set("fill", E)`, E the word's fill color).

What it does: a text colored by its font color (`_fc`, which the default text style sets, so every text made with the text tool, and run colors set through the inspector or text ranges) hands the color object, not a CSS color, to the style. The exported `<text>` gets `fill:[Object GRGBColor]`, which browsers ignore, so the text shows black. Only texts colored by a fill layer get a real color. Checked in the old app: exporting the corpus documents through File > Export writes this for every such text.

Why it's unclear: clearly wrong output, but it is what every SVG export of such a text has written. Listed as a BUGS-FIXED candidate.

Kept. Pinned by the io-export-svg/corpus/text-layout, text-runs, text-character-styles, text-lists, text-on-path, symbols and pages-master parity scenarios.

<!-- File formats, PDF and bitmap export (phase 5 review) -->

## Q-089 PDF writer quirks kept from the old code

Old location: public/chunk.vendor.js module 1431 `_updateUnicode` (252964-252968), module 1430 (252857-252866), module 1422 page contents (252674-252698), module 1442 and the GPDFDocument constructor (253532-253543, 252268).

What it does:
- ToUnicode: a code point above U+FFFF was meant to become a surrogate pair, but the lead surrogate isn't floored, so it's written as hex with a fraction. U+1F100 comes out as `[<d83c.4dd00>]`, which isn't valid hex, so copying such glyphs out of the PDF breaks.
- An embedded font file's /Length1 is the length of the compressed stream, not of the font file as PDF asks.
- Page contents are always deflated; the document's compress option is ignored there.
- The header always says `%PDF-1.7`; the version option is ignored.

Why it's unclear: the first two are wrong output that readers mostly tolerate; the last two make options do nothing. Fixing any of them changes PDF bytes against the old app.

Kept. next/src/io/export/pdf/cid-font-type.ts, font-stream.ts, object-store.ts, header.ts. Pinned by next/src/io/export/pdf/pdf-writer.recorded.test.ts "embeds fonts like the old classes: cid-cff" (the astral ToUnicode entries and /Length1 in the recorded file) and pdf-document.test.ts "deflates page contents even without compress (kept old quirk)", "writes version 1.7 whatever version it is given (kept old quirk)" and "gives an embedded font file the compressed length as /Length1 (kept old quirk)".

## Q-090 PDF author is the signed-in user's name

Old location: designer.browser.dev.js:80606-80618 (GExporter.exportExportable, PDF branch: `gDesigner.getUser()`, then `getFullUserName()` or the locale text "text.default-export-author") and chunk.vendor.js:110507 (getFullUserName: the first word of the name plus the last name).

What it does: the PDF's /Author is the full name of the signed-in account. In the parity setup the old app is signed in to the stub server's account ("Test User", no last name), so every recorded PDF has `/Author (Test)`. Without a user it would be the localized default author text.

Why it's unclear: the rewrite has no accounts, so the new app has no user name to write. Either it always writes the default author text (which changes every PDF against the recordings), or it gets a name from somewhere else (a setting, the OS user).

Kept for now: the parity hooks pass the same user as the old app's stub account. next/src/parity/app/import-export.ts gives the exporter host the user "Test"; the io-export-pdf scenarios pass "Test" as the user option (parity/scenarios/io-export-pdf/cases.ts PDF_USER). Pinned by every io-export-pdf scenario (the /Author in the recorded files). The app shell (phase 7) has to decide what its host returns.

## Q-091 Concurrent PDF raster drops the last pixels

Old location: public/chunk.vendor.js:239343-239349 (module 1113, concurrencyRaster); new: next/src/workers/raster.ts.

What it does: the pixels are split into one slice per worker, each a multiple of 4 pixels. The last worker's range includes the leftover pixels (count - sliceSize * workers), but only `pixels.slice(start, end)` is copied into its padded buffer before `end` grows. The leftover pixels reach the worker as 0, so they come out black with alpha 0. Because alpha 0 sets hasTransparency, an opaque image gets a soft mask and those pixels are transparent in the PDF. This happens for any rasterized image over 100x100 when the PDF export uses workers. Example: 101x101 on 4 workers loses the last 9 pixels of the bottom row.

Why it's unclear: it is plainly wrong output, but fixing it changes PDF bytes against the old app.

Kept. Pinned by next/src/workers/workers.test.ts "Raster.concurrencyRaster remainder (kept old bug)" (and the 7x3 case in "splits into slices of 4 pixels per worker..."). The fix would copy `pixels.slice(range.start, range.end + remainder)`.

## Q-092 A PDF export never finishes when a node's paint throws

Old location: public/chunk.vendor.js module 1406, GPDFExport.export: the node export (`try { proxy(node).paint(context) } finally {...}`, around 251589-251648) and the exportEach timer (251652-251661).

What it does: an exception from painting a node goes through the `finally`, which still finishes the page or starts the raster jobs, and then out of the setTimeout in exportEach. Only errors inside raster jobs and the final write reach the failure handler, so the export callback is never called and the export dialog waits forever.

Why it's unclear: this is a hang, not a decision. Reporting the error through the callback would let the dialog close with a message.

Kept. Pinned by "never calls back when a node's paint throws (kept hang)" in next/src/io/export/pdf/pdf-export.test.ts.

## Q-093 Aborting a PDF export during rasterization never calls back

Old location: public/chunk.vendor.js module 1406, GPDFExport.export: `if (E.isAbort()) return` at the start of the node export and in the raster loop (around 251549-251550 and 251600-251610).

What it does: after document.abort(), the node export and the raster loop return without calling done() or job.done(), so the export callback is never called and GExporter's messenger.close never runs. An abort between two pages behaves differently: exportEach goes on to write, the rejected document promise reaches the failure handler, and the callback gets an undefined error with no bytes, which GExporter treats as "aborted" and closes the dialog. Abort also rejects the document promise before anything listens to it, which shows up as an unhandled rejection.

Why it's unclear: whether the dialog closes after Cancel depends on when Cancel was pressed.

Kept. Pinned by "stops between pages after an abort and calls back without bytes" and "never calls back after an abort while nodes are rasterized (kept hang)" in next/src/io/export/pdf/pdf-export.test.ts.

## Q-094 Multi-file export drops a file whose final name is taken

Old location: designer.browser.dev.js:80664-80725 (GExporter.exportToDirectory); new: next/src/io/export/exporter.ts exportToDirectory.

What it does: the "(n)" numbering only counts names given out before, so names "a(2)", "a", "a" become "a(2).png", "a.png", "a(2).png". zip-fs throws "Entry filename already exists." for the second "a(2).png". The exporter's `.catch(countWritten)` swallows that and counts the file as written, so the ZIP silently lacks it. The numbering also counts across folders ("Icons/A" then "A" gives "A(2).png" at the top level).

Why it's unclear: silent data loss; the numbering across folders may be intended.

Kept. Pinned by next/src/io/export/exporter.test.ts "drops a file whose final name is taken and still finishes (old behaviour)" and "makes subdirectories for "/" ...".

## Q-095 Export to a directory never finishes when an item has no name

Old location: designer.browser.dev.js:80664-80725; new: next/src/io/export/exporter.ts exportToDirectory.

What it does: an item with an empty name is skipped without being counted, so onDone (and with it the ZIP save) never runs.

Why it's unclear: looks like an oversight; the export just hangs.

Kept. Pinned by next/src/io/export/exporter.test.ts "never calls onDone when an item has no name (old behaviour)".

## Q-096 Fallback ZIP is lost when the storage can't download

Old location: designer.browser.dev.js:80726-80823 (GExporter.export, chooseDirectory fallback); new: next/src/io/export/exporter.ts export.

What it does: when the user doesn't choose a directory, the ZIP is saved with noPrompt true and the format's file type, not ZIP. A storage that can prompt but can't download then saves nothing, and onDone never runs.

Why it's unclear: probably meant to download; the wrong file type and the lost file both look unintended.

Kept. Pinned by next/src/io/export/exporter.test.ts "falls back to a ZIP saved without a prompt when no directory is chosen (old behaviour)" and "saves nothing from the fallback ZIP when the storage can't download (old behaviour)".

## Q-097 zip.js addData without params throws after adding the entry

Old location: designer.browser.dev.js:133843-133846 (zip-fs ZipFileEntry constructor); new: next/src/io/zip/zip-fs.ts ZipFileEntry.

What it does: init's `params || {}` only replaced init's own copy, so the constructor then read `params.Reader` and threw a TypeError. By then the entry was already in fs.entries and in its parent's children.

Why it's unclear: the half-added entry is a bug, but nothing in the app calls addData without params.

Kept. Pinned by next/src/io/zip/zip.test.ts "throws on addData without params, after the entry has joined the tree (old zip.js)".

<!-- File formats, PDF, EPS, PostScript and Sketch import (phase 5 review) -->

## Q-098 Sketch import drops layer effects

Old location: chunk.vendor.js:109422-109430 (module 794 sketchshape, the effects loop), module 597 (sketcheffect) and 1123-1126 (the effect classes).

What it does: the shape importer creates each effect with `new Effect(data)` and calls `applyTo(node)`, but never `parse()`. `_effect` is set only in parse, so applyTo adds nothing. Drop shadows, inner shadows, gaussian and zoom blurs and colour controls never reach the imported layers. Only a background blur shows up, because its applyTo adds a fill layer on its own.

Why it's unclear: the effect classes are complete, so the importer clearly meant to convert them. Users lose every shadow and blur of a Sketch file without a warning. A fix would call `parse()` before `applyTo`; that changes the output of every Sketch file with effects.

Fixed: see BUG-103 in BUGS-FIXED.md.

## Q-099 Sketch symbol override replaceChild test is inverted

Old location: chunk.vendor.js:109568-109583 (module 796 sketchbase, replaceChild).

What it does: replaceChild is meant to put an override layer (or nothing) in place of a layer of the symbol master. The test is inverted: when the layer is not a direct child, the first direct child is replaced (the index variable was never set, and `splice(undefined, 1, ...)` starts at 0); when it is a direct child, the search goes on in the children, and the layer usually stays.

Why it's unclear: image overrides and nested-symbol overrides replace or remove the wrong layer, or none. A fix would replace the matching child at its own index and only search deeper when it isn't a direct child.

Fixed: see BUG-104 in BUGS-FIXED.md.

## Q-100 Sketch path event blocks are unbalanced

Old location: chunk.vendor.js:240232-240240 and the release loop after it (module 1134 sketchpathutil, generatePath).

What it does: while building a path, composite events and child changes are blocked only when the path is created by a straight point. A path that starts with a curve point is never blocked, but is released like the others at the end (a release without a block does nothing). A path that ends up with a single anchor stays blocked, but it is dropped anyway.

Why it's unclear: the blocks look meant for every path, so curved paths send change events while their anchors are added. The imported geometry is the same either way, so users see no difference; it only costs work.

Kept. next/src/io/import/sketch/sketch-path-util.ts. The parity scenario io-import-sketch/primitives-v49 runs both cases (ovals start with a curve point, "G-single" has one point) and pins the resulting paths.

## Q-101 Sketch boolean groups take a first union as no operation

Old location: chunk.vendor.js:242909-242912 (module 1213 sketchshapegroup).

What it does: to see whether a boolean group mixes operations, the importer keeps the first operation in a variable and tests it with `if (first)`. Union is 0, which is falsy, so after a first union the next operation becomes "the first" instead of being compared. A group of union then subtract counts as uniform and is merged with one operation instead of step by step.

Why it's unclear: users get a different shape than in Sketch for groups that start with a union and continue with another operation. A fix would test `first !== null`.

Fixed: see BUG-105 in BUGS-FIXED.md.

## Q-102 Sketch font names with Regular import as italic

Old location: chunk.vendor.js:240408 (module 1136 sketchtext, composeQuery).

What it does: the style is read with `/normal|italic|oblique|regular/i`, then `"normal" === style ? Normal : Italic`. Any font name containing "Regular" or "Oblique" (and "Italic") gets the italic style, so "OpenSans-Regular" is looked up as Open Sans italic.

Why it's unclear: almost every Sketch text uses a Regular face, and these import in italic or fall back to another font. A fix would map "regular" to Normal.

Fixed: see BUG-106 in BUGS-FIXED.md.

## Q-103 Sketch borders always import as inside

Old location: chunk.vendor.js:70841 (module 439 sketchelement): `t.setProperty("_ba", _[o.position || 1])` with `o = i.style`.

What it does: the border alignment is looked up from `style.position`, but Sketch keeps the position on each border and the style has none. Every border imports as Inside. A centre position (0) would also become Inside because of `|| 1`.

Why it's unclear: centred and outside borders move inwards, so strokes look thinner or shifted after the import. A fix would read `border.position` and test for undefined instead of using `||`.

Fixed: see BUG-107 in BUGS-FIXED.md.

## Q-104 PDF import never calls back for a document pdf.js can't open

Old location: chunk.vendor.js module 1393 (GPDFImport.import): `A.getDocument(...).then(function (e) { ... })` with no rejection handler.

What it does: when pdf.js rejects the document (a PDF that needs a user password, a file it can't parse), the import's callback is never called. The page waits forever; the AI check, which has a catch, does report the error.

Why it's unclear: users get no error and no import for an encrypted or broken PDF. A fix would add a rejection handler that calls back with the error.

Fixed: see BUG-102 in BUGS-FIXED.md.

## Q-105 EPS page side: show without a font name throws

Old location: chunk.vendor.js module 1404 (GEPSParser), the text handler that calls getDefaultFont on the wrong object.

What it does: text the worker sends without a font name makes the page side call getDefaultFont on an object that doesn't have it, so the handler throws and the text is lost.

Why it's unclear: a crash path. A fix would ask the font manager for its default font.

Kept. next/src/io/import/eps/eps-parser.ts. Pinned by eps-parser.test.ts "throws for text without a font name, as the old page side did".

## Q-106 PS worker: errordict handler that isn't an object

Old location: public/pscore.js initiateError: `"execute" in this.errordict.value[t]`.

What it does: a handler put into errordict that isn't an object or function (`errordict /typecheck 5 put`) makes `in` throw a TypeError; the run ends with no further messages and no "done", so the EPS import waits for its timeout.

Why it's unclear: a crash, but PostScript files rarely do this. A fix would skip or ignore the handler.

Kept, except for the wait: the run now ends with error "04" and done (see BUG-109 in BUGS-FIXED.md). next/src/workers/ps/core.ts initiateError. Pinned by src/workers/ps/__fixtures__/corpus/basic-errordict-number-handler.ps (interpreter.recorded.test.ts, its .fixed recording).

## Q-107 PS worker: image/imagemask with PS objects as operands

Old location: public/psclasses.js compositeObjectBuilder (own isEOF/getUint8 functions on every composite) with pscore.js posting drawImage uncloned.

What it does: `{} (abc) 5 [1 0 0 1 0 0] {<ff>} image` posts PS objects as width and height; structured clone throws DataCloneError and the run ends with no "done". The port throws the same DataCloneError from toGravit (core.ts holdsPSObject).

Why it's unclear: a crash on malformed input. A fix would raise typecheck instead.

Kept, except for the wait: the run now ends with error "04" and done (see BUG-109 in BUGS-FIXED.md). Pinned by corpus/gfx-image-ps-operands.ps and gfx-imagemask-ps-operands.ps (interpreter.recorded.test.ts, their .fixed recordings).

## Q-108 PS worker: shading mesh parameters

Old location: public/ps*.js, the shading code ported to next/src/workers/ps/color-shadings.ts.

What it does: the mesh parameters (BitsPerComponent, BitsPerCoordinate, BitsPerFlag, Decode, VerticesPerRow, Function) are read from the dict passed in, which for PatternType 2 is the pattern dict, not its shading. Mesh data only reads from files (ColorBitsReader). A lattice mesh (type 5) only builds triangles between its first two rows.

Why it's unclear: mesh shadings in patterns and lattice meshes with more than two rows import wrong or not at all. A fix would read the shading dict and build every row.

Kept. Pinned by the corpus programs color-sh4-*.ps, color-sh5-*.ps, color-sh6-*.ps, color-sh7-*.ps and color-sh-pattern-mesh.ps (interpreter.recorded.test.ts).

## Q-109 PS worker: filter quirks

Old location: public/ps*.js filters, ported to next/src/workers/ps/filters.ts.

What it does:
- SubFileDecode reads one more source byte on every call, even while bytes from an earlier partial EOD match are still queued.
- ASCII85Decode passes the `>` of `~>` through the tuple check too, and starts a new tuple on every call that needs more data.
- ReusableStreamDecode checks a variable that isn't assigned yet for its parameter dict, so a dict operand is never taken.
- LZWDecode reads an undeclared global (`currentValue`) on its first byte, which throws a ReferenceError; the decoder never runs.

Why it's unclear: these lose or corrupt data, and LZW images never import. Fixes are local to each filter.

Kept for ReusableStreamDecode only; SubFileDecode, ASCII85Decode and LZWDecode are fixed (see BUG-115 in BUGS-FIXED.md). Pinned by the corpus programs filter-subfile-*.ps, filter-ascii85-*.ps, filter-reusable-*.ps and filter-lzw.ps (interpreter.recorded.test.ts).

## Q-110 PS worker: show operator quirks

Old location: public/ps*.js text operators, ported to next/src/workers/ps/show.ts.

What it does:
- kshow and cshow ignore their procedure and behave like show, as do xshow, yshow and xyshow when the widths are a number string.
- ashow and awidthshow pop the string before checking the numbers, so a typecheck leaves the stack changed.
- charpath and xyshow/xshow/yshow draw every outlined glyph at the start position (only show, ashow, widthshow and awidthshow advance), and stringwidth of an outlined font pushes 0 0.
- The paint type is read as `paintType` (lowercase), which fonts don't have, so outlined text is always filled.

Why it's unclear: text set with these operators lands in the wrong place, and stroked fonts are filled. Each is a small fix.

Kept, except that charpath now advances and PaintType 2 fonts are stroked (see BUG-114 in BUGS-FIXED.md; xshow, yshow and xyshow already advanced with outlined fonts). Pinned by the corpus programs show-builtin-*.ps, show-outlined-*.ps and font-type1-stroked.ps (interpreter.recorded.test.ts).

## Q-111 PS worker: comparison and control operator quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-compare.ts.

What it does:
- eq and ne compare with JS loose equality; ne of two composite objects (or an object and a number) is always false.
- `and` and `or` check the operands as integers before popping them, and bitshift uses JS 32-bit shifts.
- if and ifelse skip silently when the condition isn't a bool but still pop their operands; they run the procedure without checking it.
- loop ends on stop (clearing the stop flag) and exit; for, forall and repeat end only on exit. exit outside a loop and outside stopped runs quit.

Why it's unclear: these differ from PostScript and can change the control flow of real programs. Fixing them changes the output of the files that hit them.

Kept. Pinned by the corpus programs basic-compare.ps, basic-logic.ps, basic-loops.ps, basic-exit-outside.ps and basic-exit-stopped.ps (interpreter.recorded.test.ts).

## Q-112 PS worker: dictionary operator quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-dicts.ts.

What it does:
- systemdict, statusdict and where wrap plain JS objects (and where even dict objects) in new global dict objects on every call.
- internaldict's error path names an undeclared `myname` and throws.
- where also finds names that are properties of the dict object itself (value, access, ...), and store/def write into `.value` of whatever is on top of the dictionary stack.
- put's string range check compares with the string object's `length`, which doesn't exist, so only negative indices are refused.
- maxlength is the number of entries plus 100; dict ignores its size.
- packedarray takes its count unchecked: a non-number count packs the whole stack.

Why it's unclear: mostly harmless for real files, but some paths throw or write into the wrong object.

Kept. Pinned by the corpus programs basic-dicts.ps, basic-dictstack-lookup.ps, basic-internaldict-error.ps, basic-put-get.ps and basic-packedarray-nocount.ps (interpreter.recorded.test.ts).

## Q-113 PS worker: file operator quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-files.ts.

What it does:
- file, currentfile and status are stubs: file pops its two operands and pushes a file on the program input, status always answers false.
- fileposition of an unpositioned file pushes undefined (the file object has no valuePointer).
- readline appends the line to the target string's old content and skips leading line breaks.
- readstring and readhexstring replace the target string's value.
- writestring discards its operands.

Why it's unclear: programs that read their own data with these operators get other bytes than in PostScript.

Kept. Pinned by the corpus programs basic-files.ps, basic-readline.ps and basic-readstring.ps (interpreter.recorded.test.ts).

## Q-114 PS worker: math operator quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-math.ts.

What it does:
- div rounds its result to 9 decimals (5 above 1e5) through a string round trip.
- idiv computes parseInt(1 / (top / second)), that is second / top through two divisions.
- cos's typecheck path and atan both throw: cos names an undeclared `myname`, atan calls a radianToDegree that PSCore doesn't have.
- cvr and cvi test `"number" !== (value, false)`, which is always true, so their typecheck branch never runs; cvr leaves numbers alone and executes anything else.
- cvs never writes into the target string and pushes a new string instead.
- There is no truncate, ln or xor operator.

Why it's unclear: atan in any file ends the import, and the rounding moves coordinates slightly.

Kept, except atan, which now returns degrees (see BUG-111 in BUGS-FIXED.md). Pinned by the corpus programs basic-arith.ps, basic-arith-errors.ps, basic-trig.ps, basic-atan.ps, basic-cos-typecheck.ps, basic-cvi.ps, basic-cvr.ps, basic-cvr-bool.ps and basic-cvs.ps (interpreter.recorded.test.ts).

## Q-115 PS worker: matrix and device operator quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-matrix.ts.

What it does:
- currentmatrix, defaultmatrix and identmatrix leave the matrix on the stack, as PostScript says, but setmatrix copies into the CTM array in place.
- setscreen and setcachelimit are stubs; currentscreen pushes a fixed frequency, angle and spot function, marking the function `executive` (a typo for executable, so it stays a literal string).
- cachestatus pushes fixed numbers.

Why it's unclear: harmless for drawing, but the spot function can't be executed.

Kept. Pinned by the corpus programs basic-matrix.ps and basic-screen-cache.ps (interpreter.recorded.test.ts).

## Q-116 PS worker: stop, save/restore, wcheck and eexec quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-names.ts.

What it does:
- stop outside `stopped` runs quit, which reports error "04" to the page (the page then ends the import), and still sets the stop flag.
- save/restore only version composite objects and the graphics state stack; restore keeps the state saved at the matching save.
- wcheck reports false for anything that isn't an object with unlimited access, including numbers.
- eexec pushes the plain systemdict object on the dictionary stack while it runs the decrypted font program, so `def` inside it writes into `.value` of a plain object and throws.

Why it's unclear: eexec fonts that `def` into systemdict fail to load, and a stray stop ends the import.

Kept. Pinned by the corpus programs basic-stop-quit.ps, basic-save-restore.ps, basic-access.ps, basic-eexec-file.ps and basic-eexec-string.ps (interpreter.recorded.test.ts).

## Q-117 PS worker: stack and misc operator quirks

Old location: public/ps*.js, ported to next/src/workers/ps/operators/basic-stack.ts.

What it does:
- mark pushes a "[" mark.
- cleartomark without a mark empties the stack.
- dictstack makes the given array share the interpreter's dictionary stack and replaces its first entry (the plain systemdict) by a dict object wrapping it, which stays in the dictionary stack.
- type answers unknowntype for numbers, booleans and null alike.
- print discards its string; version pushes "3010".

Why it's unclear: programs that branch on type see every simple value as unknowntype.

Kept. Pinned by the corpus programs basic-stack.ps, basic-dictstack.ps, basic-type.ps and basic-print-version.ps (interpreter.recorded.test.ts).

<!-- File formats, .gvdesign loading (phase 5 review) -->

## Q-118 A .gvdesign that holds no scene stays Loading

Old location: designer.browser.dev.js:6486-6512 (GDocument.deserializeData), chunk.vendor.js module 894 (GNode.deserializeAsync).

What it does: after the restore, the whole status branch of deserializeData is guarded by `i && (...)`, so its `_updateStatus(LoadFailed)` can never run. A file whose JSON parses but holds no scene never leaves Loading:
- a root that restores to null skips the branch and the promise never settles;
- a truthy non-scene (a JSON array, a group or page root) reaches `i.isCloudSynchronization()`, which only scenes have; the TypeError ends the async promise executor, the outer promise never settles and the browser logs an unhandled rejection;
- a root without children (a lone shape, a root of an unknown class) never even finishes its restore, because deserializeAsync only calls back once its time-sliced executor has run a list of children.

Cut-off or empty JSON also stays Loading (deserializeAsync never calls back). A synchronous throw from deserializeAsync rejects the promise; the status stays Loading there too.

Why it's unclear: the code clearly meant to show LoadFailed, so the user sees a document that loads forever with no error. This is a BUGS-FIXED candidate (broken UI). The new code does not reproduce the unhandled-rejection log.

Fixed: see BUG-100 in BUGS-FIXED.md.

## Q-119 PDF bleed box is written as x y width height

Old location: chunk.vendor.js module 1440 (the PDF page box) and the PDF exporter's page setup, which calls setBleedBox with the page area expanded by twice the bleed.

What it does: every page box is written as `[top left width height]`, so PDF readers take the third and fourth numbers as the upper right corner instead of a size. The media box starts at 0 0 and comes out right. The bleed box starts outside the page, at a negative x and y, so readers get a box that doesn't match the bleed area.

Why it's unclear: the box is wrong, but the files open and print normally; a reader only uses the bleed box when asked to.

Kept. next/src/io/export/pdf/media-box.ts writes the old order; pinned by the io-export-pdf/export/bleed.pdf parity scenario.

<!-- Editor, editor core and guides (phase 6) -->

## Q-120 BBoxGuide priority names are swapped

Old location: chunk.vendor.js module 153 (GBBoxGuide.hasPriorityDistanceFirst), used by module 210 (GGuides.mapRect).

What it does: `hasPriorityDistanceFirst()` returns true when the priority is `BBOX_FIRST`. GEditor sets `DISTANCE_FIRST`, so mapRect does not return the equal-spacing result straight away; it only takes it when the bbox guide's turn comes and the distance shift is smaller than the edge snap.

Why it's unclear: the method name says the opposite of what it checks. Either the name or the comparison is wrong, but the editor's behaviour (edges win over equal spacing unless spacing is closer) may be what users are used to.

Kept. editor/guides/bbox-guide.ts hasPriorityDistanceFirst; pinned by "calls BBOX_FIRST 'distance first'" in guides.test.ts.

## Q-121 Equal-spacing check ends mapRect

Old location: chunk.vendor.js module 210 (GGuides.mapRect, the `x === this._bboxGuide && v && ...` branch).

What it does: when the bbox guide found an equal-spacing match, its turn in the guide loop always returns: the spaced rect when the spacing shift wins, otherwise the input rect unchanged (the variable it returns starts as the input rect, so `if (r) return r` always fires). The guides after the bbox guide (grid, guide lines, points, page, full pixels) are not asked, and the edge snap the bbox guide itself just found is thrown away.

Why it's unclear: returning the unsnapped rect looks unintended; one would expect the edge snap or the later guides to apply. It only happens when a spacing candidate exists but loses.

Fixed: see BUG-047 in BUGS-FIXED.md.

## Q-122 Full pixels guide keeps the bottom-right zone

Old location: chunk.vendor.js module 544 (GFullPixelsGuide constructor).

What it does: the constructor removes every allowed snap zone except top-left with `forEach` over the zone list while `disallowSnapZone` splices the same list. The splice shifts bottom-right into the slot already visited, so the list ends as top-left and bottom-right. `mapTopLeftOnly()` is false for this guide, so it also counts as a zonable guide in getBBoxSnapZones, and mapRect can round the bottom-right corner instead of the top-left one.

Why it's unclear: the code clearly means "top-left only"; the result differs because of the mutation during iteration.

Fixed: see BUG-048 in BUGS-FIXED.md.

## Q-123 Guide lines snap to the first line in reach, not the nearest

Old location: chunk.vendor.js module 739 (GGuideLinesGuide.map).

What it does: of the ruler guides (`hgl`, `vgl`) within the snap distance, the first in the array wins, even when a later one is closer. All other guides pick the closest candidate.

Why it's unclear: with two guide lines a few pixels apart the snap goes to whichever was added first.

Kept. editor/guides/guide-lines-guide.ts map; pinned by "guide lines snap to the first line within the distance" in guides.test.ts.


## Q-124 Moving an annotation disables every guide

Old location: chunk.vendor.js module 82 (GEditor.moveSelection, `c.some(... hasMixin(A)) && (g = [_])`).

What it does: when the moved selection contains an annotation, the editor passes `[GBBoxGuide]` (the class itself) as the list of guide ids to mapPoint and mapRect. GGuides compares the list with each guide's string id, so no guide matches and nothing snaps.

Why it's unclear: the intent was probably "snap annotations to boxes only", which would need `[GBBoxGuide.ID]`. As written, annotations never snap while moved.

Kept. editor/editor.ts moveSelection passes the class, cast to the id list type.

## Q-125 isElementModified counts undo states

Old location: chunk.vendor.js module 82 (GEditor.isElementModified).

What it does: it walks the undo states newest first and, inside a state, stops at the first property change of the node (`if (++i < t) break; return !0`). So `count` (default 2) is the number of undo states that changed the node, not the number of changes; two changes in one transaction count once.

Why it's unclear: the name and the counter suggest changes. Callers (the app's "was this edited" checks) may rely on the state count.

Kept. editor/editor.ts isElementModified; pinned by "counts undo states with a change, not changes, in isElementModified" in editor.test.ts.

## Q-126 Both skew handles read the horizontal skew options

Old location: chunk.vendor.js modules 749 and 750 (GSkewHorizontalAnnotation, GSkewVerticalAnnotation).

What it does: both return `GEditorOptions.annotationHandles.tranformBox.skew`; there are no separate vertical options.

Why it's unclear: looks like a copy of the horizontal module, but with one options object there is nothing to get wrong yet.

Kept. editor/handles/skew-vertical-annotation.ts; pinned by "grows icon handles by the annotation pick distance" in editor-core-parts.test.ts.

<!-- Editor, editor view (phase 6) -->

## Q-127 A listener added twice keeps the widget listening

Old location: chunk.vendor.js module 644 (GWidget.addEventListener, removeEventListener, _unregisterInputEventListener).

What it does: every addEventListener for an input event class raises a counter, and the DOM listener goes away when the counter drops to 0. removeEventListener removes every registration of the listener at once (GEventTarget), but lowers the counter only once. A listener added twice and removed leaves the widget listening to the DOM event with no engine listener behind it.

Why it's unclear: it looks like a counting slip, but nothing visible goes wrong: the DOM listener only fills an event nobody receives.

Kept. src/editor/view/widget.ts; pinned by "keeps the DOM listener when a listener added twice is removed (old counting)" in widget.test.ts.

## Q-128 endCaptureInput does not give the focus back

Old location: chunk.vendor.js module 1081 (GEditorWidget.endCaptureInput).

What it does: startCaptureInput remembers document.activeElement and focuses the hidden IME text box. endCaptureInput "restores" the focus with `document.activeElement = this._lastFocus`, an assignment to a read-only property, which sloppy-mode code ignores. The text box is hidden, so the focus falls back to the body.

Why it's unclear: the intent was clearly to focus the previous element again, but the app may rely on the view keeping or losing the focus at that point (the view focuses itself on the next mouse down).

Kept. src/editor/view/editor-widget.ts leaves the assignment out (it would throw in a module) and does not refocus.

## Q-129 Page margin changes never repaint the overlay

Old location: chunk.vendor.js module 1081 (GEditorWidget._afterPropertiesChanged).

What it does: the view repaints its overlay when scene settings change, and for pages it checks `GUtil.containsOneOf(e.properties, this._viewConfiguration.pageDecoration.margin)`. `pageDecoration.margin` is the boolean that turns the margin outline on, not a list of property names, so the check is always false and changing a page's margins (ml, mt, mr, mb) does not repaint the magenta margin outline by itself.

Why it's unclear: the intended list was probably ["ml", "mt", "mr", "mb"]. The outline still updates whenever something else repaints that area, so it may never have been noticed.

Kept. src/editor/view/editor-widget.ts passes the flag on as the old code did.

## Q-130 A finished render sets noWebGL from a field that does not exist

Old location: chunk.vendor.js module 363 (GSceneWidget._repaint).

What it does: before a scene render the view saves `this._scenePaintContext.noWebGL` (a field the paint context never has, so undefined), sets `configuration.noWebGL` from the render parameters (true while panning or zooming), and when the render finishes writes the saved value back to `configuration.noWebGL`. After the first render the configuration's noWebGL is undefined instead of its default false, whatever it was set to before.

Why it's unclear: it reads like the save was meant to read `configuration.noWebGL`. Undefined and false paint the same, but a noWebGL set on the view configuration by other code would be lost after one render.

Kept. src/editor/view/scene-widget.ts (_repaint) reads the missing field and writes it back.

<!-- Editor, element and path editors (phase 6) -->

## Q-131 Outline colour reads the bottom-right pixel

Old location: chunk.vendor.js module 39, GBaseEditor.getOutlineColor.

What it does: clamps the pixel position with `Math.max(0, Math.min(canvas.getWidth() - 1))`, a one-argument Math.min, so x and y are thrown away and the background is always read from the canvas' bottom-right pixel (then cached on the paint context).

Why it's unclear: the callers pass the point just above the left of the element's paint box, so the intent was clearly to read the background next to the element. In a partial repaint the pixel read depends on the dirty area (the eledit/adaptive-outline fixtures work around that).

Fixed: see BUG-055 in BUGS-FIXED.md.

## Q-132 Segment bend moves the right handle 0.01 further

Old location: chunk.vendor.js module 127, GPathEditor.movePart, PartType.Segment case (around line 28560).

What it does: dragging a segment with SegmentData.Handles moves the left point's right handle by delta * cL, but the right point's left handle by delta * cR + 0.01 on both axes.

Why it's unclear: cL and cR are the same value, so the 0.01 looks like a leftover nudge (perhaps to avoid a degenerate curve), not an intended asymmetry.

Kept. path-editor.ts movePart (comment points here); pinned by "bends a straight segment by dragging it" in path-editor.test.ts.

## Q-133 Compound shape boolean op is named Drop Pattern

Old location: chunk.vendor.js module 1082, GCompoundShapeEditor.setBooleanOp.

What it does: commits the transaction that sets `bool` on the child shapes under the name of LocaleKey("GCompoundShapeEditor", "action.drop-pattern"), "Drop Pattern".

Why it's unclear: the undo entry for a boolean operation says "Drop Pattern", probably copied from GShapeEditor.acceptDrop. The UI never calls setBooleanOp (the inspector writes `bool` itself), so users don't see it.

Kept. compound-shape-editor.ts setBooleanOp; pinned in compound-shape-editor.test.ts.

## Q-134 Group editor's _scaleBorder is never called

Old location: chunk.vendor.js module 751, GGroupEditor._scaleBorder.

What it does: calls `_scaleBorder` on every child editor. Only GGroupEditor defines it, so a group with a non-group child would throw.

Why it's unclear: nothing in either bundle calls it; it looks like a leftover.

Kept. group-editor.ts _scaleBorder; not tested since it is unreachable.

## Q-135 Slice move without a preview adds the whole preview transform

Old location: chunk.vendor.js module 1084, GSliceEditor._applyTransform.

What it does: with a preview it reads the preview rectangle's full `trf`, not the change, and adds its translation to x/y when the scale factor is 1.

Why it's unclear: this only goes wrong for a slice whose box makes the rectangle's own transform have scale factor 1 (a 2 x 2 box). Every other size takes the preview bbox path.

Kept. slice-editor.ts _applyTransform.

## Q-136 Transform box bbox counts disabled skew handles

Old location: chunk.vendor.js module 546, GTransformBox._calculateGeometryBBox.

What it does: the box includes the skew handle points when `annotationHandles.tranformBox.skew` exists, and the rotate handle when `.rotate` exists. It doesn't check their `enabled` flag, so with the default options (both disabled) the scene editor's bbox still reaches 46 px above and right of the box and 46 px below it.

Why it's unclear: painting and hit testing do check `enabled` (_isSkewAnnotationEnabled, _isRotateAnnotationEnabled). It may be on purpose (a roomier repaint area) or a missing `.enabled`.

Kept. transform-box.ts _calculateGeometryBBox; pinned by "counts the skew and rotate handles in its box even when they are off" in transform-box.test.ts.

## Q-137 Transform box centre of 0 counts as no centre

Old location: chunk.vendor.js module 546, GTransformBox constructor.

What it does: `this.cx = t || (tlx + brx) / 2`. A pivot passed as x = 0 or y = 0, for example kept from an earlier box or given to setTransformBoxActive, is replaced by the box centre on that axis.

Why it's unclear: it only shows when the pivot sits exactly on the scene axis. It looks like a truthiness slip rather than intent.

Fixed: see BUG-045 in BUGS-FIXED.md.

## Q-138 Transform box handle under the mouse always counts as new

Old location: chunk.vendor.js module 545, GSceneEditor.updateTBoxUnderMouse.

What it does: it compares the new PartInfo with the remembered one by `id` and `data` using ==. For handles the data is a freshly mapped point every time, so `newPInfo` is true on every mouse move over a handle. Over the inside (data null) it is false.

Why it's unclear: callers probably use newPInfo to update the cursor only when the part changes, and over handles they update it on every move. Harmless, but looks unintended.

Kept. scene-editor.ts updateTBoxUnderMouse; pinned by "hit tests the box and keeps the dragged part under the mouse".

## Q-139 Page edTransform reads its options unchecked

Old location: chunk.vendor.js module 331, GPageEditor.edTransform.

What it does: `(this._collisionlessTransform || n.doCollisionlessTransform)`. When collision-less transforms are off (the default: pageCollisionTransform = !pagesCanOverlap and pagesCanOverlap is true), a call without options throws a TypeError. The UI paths found (rotation, label move) pass options, and a resize previews through transformBox instead.

Why it's unclear: it would be a crash if some path calls edTransform on a page without options; none was found.

Kept. page-editor.ts edTransform; pinned by "reads edTransform options unchecked without collision-less transforms".

## Q-140 Selection editor repaint before activate throws

Old location: chunk.vendor.js module 745, GSelectionPositionEditor.requestInvalidation.

What it does: it asks `GBaseEditor.getEditor(this._scene)`, which reads `__graphic_editor__` of the scene. Before activate and after deactivate `_scene` is null, so any flag change with invalidation at that time throws.

Why it's unclear: activate sets the scene before the first invalidating call, and nothing seems to touch the editor after deactivate. So it may never happen, but it's fragile.

Kept. selection-position-editor.ts requestInvalidation (not separately pinned).

## Q-141 Ellipse editor adds the centre cross box unmapped

Old location: chunk.vendor.js module 552, GEllipseEditor.getCustomBBox.

What it does: in detail mode it adds the box (cx - 2s - 1, cy - 2s - 1, 2s + 1, 2s + 1), s = centerCrossSize, around getPaintElement().getCenter(true), the centre in scene coordinates. The rest of the custom bbox is in view coordinates, and the box ends at the centre instead of surrounding it.

Why it's unclear: at zoom 1 with no scroll it roughly covers the top-left half of the cross that GShapeEditor._postPaint draws; at other views it covers an unrelated area. It only affects the invalidation/bbox area, so it may be a leftover.

Kept. ellipse-editor.ts getCustomBBox.

## Q-142 Applying a rectangle shoulder drag clears the part selection

Old location: chunk.vendor.js module 330, GRectangleEditor._applyPartMove.

What it does: after committing the radii it collects the selected shoulder parts and calls updatePartSelection(true, thoseParts). Toggle mode removes parts that are already selected, so the moved shoulders end up deselected (the selection becomes null). With no part selection at all, reading _partSelection.length throws.

Why it's unclear: it reads like it meant to keep the shoulders selected. The select tool always selects the part first, so the throw is probably unreachable.

Kept. rectangle-editor.ts _applyPartMove; pinned by "previews the corner radii of a shoulder drag and commits them" in rectangle-editor.test.ts.

<!-- Editor, text and style editors (phase 6) -->

## Q-143 Bold toggle checks a weight that doesn't exist

Old location: chunk.vendor.js module 387 (GTextEditor.handleKeyEvent, lines 68163-68218) and module 752 (GInlineTextEditor._handleKey, lines 103326-103382).

What it does: Ctrl/Cmd+B switches `_tfw` between Bold and Regular. It only does so when the new weight is `GFont.Weight.Normal`, the family is unknown to the font manager, or the family has a variant with the current style and the new weight. `GFont.Weight` has no `Normal` (only Thin to Heavy), so the first test compares with undefined and never holds. Italic has the same shape and works, because `GFont.Style.Normal` exists.

Why it's unclear: the check looks meant to always allow going back to Regular. As written, un-bolding a text whose family lacks a Regular variant in the current style does nothing.

Kept. text-editor.ts and inline-text-editor.ts compare with `WEIGHT_NORMAL` (undefined); text-editor.test.ts pins that un-bolding needs a Regular variant.

## Q-144 Pasted text loses Windows line feeds everywhere

Old location: chunk.vendor.js module 387 (GTextEditor.processPaste, lines 68479-68501).

What it does: before a pasted string goes into the inline edited text, the code runs `GUtil.replaceMicrosoftLineFeed` when `GSystem.OperatingSystem.Windows` is truthy. That is the enum value (1), not the current system, so the replacement runs on every system.

Why it's unclear: it reads like a platform check (`GSystem.operatingSystem === GSystem.OperatingSystem.Windows`). Since CRLF in pasted text should be normalized anyway, the result is probably what users want.

Kept. text-editor.ts processPaste. The text layout turns a CRLF into one line break anyway, so the result is the same with or without the replacement; text-editor.test.ts checks the pasted result.

## Q-145 Radial gradient extra handle returns an end handle without a point

Old location: chunk.vendor.js module 780 (GRadialGradientEditor.updatePartSelection, lines 108163-108205).

What it does: selecting the extra handle (the other radius end) switches the leading axis. When the last stop is not at 1, it returns a new END_HANDLE part info whose `point` is read from the part id, which is a string, so the point is undefined.

Why it's unclear: the end handle's point is never read by movePart (only the move handle's is), so nothing breaks, but the data looks meant to carry the end point.

Kept. radial-gradient-editor.ts updatePartSelection; radial-gradient-editor.test.ts pins the undefined point.

## Q-146 Text resize applies through the element editor, skipping the block editor

Old location: chunk.vendor.js module 387 (GTextEditor._applyPartMove and edTransform, lines 68312-68478).

What it does: the text editor calls `GBoxEditor.prototype.edTransform` and `GElementEditor.prototype._applyPartMove` directly, skipping the block editor's versions in between. It also calls `GShapeEditor.prototype._prepareApplyTransform(this, element)` on the prototype with the editor as the element; that looks for the Layout mixin on the editor and does nothing.

Why it's unclear: it may be on purpose (the block editor's pre-transform handling doesn't apply to text) or a leftover from an older class tree.

Kept. text-editor.ts calls the same base methods; the no-op call is left out with a comment.

## Q-147 Text editor writes two globals

Old location: chunk.vendor.js module 387 (GTextEditor.getFonts, line 68115, and _paintOutline, line 68846).

What it does: `getFonts` assigns `fontProperty` and `_paintOutline` assigns `hsv` without declaring them, which creates `window.fontProperty` and `window.hsv` in the old app.

Why it's unclear: nothing reads them; it's a missing `var`.

Kept as locals. text-editor.ts getFonts and _paintOutline.

<!-- Editor, tool base (phase 6) -->

## Q-148 The fill tool is registered twice

Old location: chunk.vendor.js module 553 (GToolManager constructor, lines 81028-81030).

What it does: the constructor calls `addTool(new GFillTool())` twice, once before and once after the slice tool. The tool list holds 30 tools with two fill tools (indices 18 and 20), and the type map points the class at the second one, so `getTool(GFillTool)` and `activateTool(GFillTool)` always reach index 20.

Why it's unclear: it looks like a copy-paste slip, but the registry order is observable (tool indices, toolmgr/registry), and nothing breaks.

Kept. editor/tools/tool-manager.ts registers both; tool-manager.test.ts "registers the thirty tools in the old order, the fill tool twice" and the parity scenario editor-tools/toolmgr/registry pin it.

## Q-149 Annotation tools snap to no guide

Old location: chunk.vendor.js module 236 (GShapeTool._getExclusions, lines 46113-46116).

What it does: for tools whose item class has the GAnnotation mixin, the shape tool passes `[GBBoxGuide]` (the class) as the list of guide ids to map with. GGuides compares those ids with each guide's `getId()` string ("guide.bbox" ...), so no guide ever matches and annotation shapes are drawn without any snapping.

Why it's unclear: the name says "exclusions" and the value is the bbox guide, as if only the bbox guide was meant to be left out (or used). Passing the class instead of `GBBoxGuide.ID` turns it into "no guides at all", which may or may not be what the review annotations wanted.

Kept. editor/tools/shape-tool.ts _getExclusions passes the class the same way.

## Q-150 The slice tool snaps a click and drops it

Old location: chunk.vendor.js module 763 (GSliceTool._mouseRelease, lines 106692-106701).

What it does: on a release without a drag the tool maps the click point through the guides (without beginMap/finishMap) and throws the result away, then ends its job. No slice is made.

Why it's unclear: it reads like the start of a click-to-create branch that was never finished (the shape tools call _createShapeManually there).

Kept. editor/tools/slice-tool.ts _mouseRelease does the same call and drops the result.

## Q-151 The text tool keeps an empty default measure

Old location: chunk.vendor.js module 547 (GTextTool._getDefaultMeasure, lines 80490-80513).

What it does: the text tool measures "Your text here" in the default text font once, to decide whether a dragged text box is low enough for an auto height. It calls the meter with `new`. When the font isn't resolved yet the meter returns null, `new` then yields an empty object, and that object is cached for the rest of the session: its height is undefined, so `boxHeight <= undefined` is false and every dragged text box gets a fixed height from then on, even after the font arrives.

Why it's unclear: it only matters when the first text box is dragged before the default font has loaded; it looks unintended but changes no data in the common case.

Fixed: see BUG-051 in BUGS-FIXED.md.

<!-- Editor, select tools (phase 6) -->

## Q-152 Resize snapping excludes only the resized element

Old location: chunk.vendor.js module 334 (GSelectTool._updateSelectionTransform, isolated part branch).

What it does: while a resize handle of an element editor is dragged, the tool copies the selection, looks for the resized element in it and then does `t = t.splice(r, 1)`. That keeps the removed entry (splice's return value), so the list passed to getAlignExclusions holds only the resized element instead of the selection without it. The path point branch further down does the same search but calls `t.splice(r, 1)` without the assignment, so there the list is the selection without the dragged path.

Why it's unclear: the two branches do the same search with opposite results, which reads like a slip. But snapping during a resize is tuned around this list, and the result is only the set of elements the guides skip, so it is not clearly wrong.

Kept. next/src/editor/tools/select/move-transform.ts (moveIsolatedPart) keeps the assignment; the resize parity scenarios (pointer/resize-*) pin the snapping.

## Q-153 Misspelled pagesCollisionTransform option

Old location: chunk.vendor.js module 334 (GSelectTool._mouseDragEnd, after the move transaction).

What it does: after a move drag the tool calls updateByMousePosition when `GEditorOptions.pagesCollisionTransform` is set. The option that exists is `pageCollisionTransform` (no s); the misspelled one is never defined, so the call never runs.

Why it's unclear: it may be meant to refresh the page hover state after a page drag in the multi-page view, or it may be dead code that was switched off this way on purpose.

Kept. next/src/editor/tools/select/drop-apply.ts reads the misspelled name, so the call stays off.

## Q-154 Selectable elements may repeat the first one

Old location: chunk.vendor.js module 334 (GSelectTool._getSelectableElements).

What it does: the duplicate check is `i.indexOf(r, t) < 0` where `t` is the "deep" flag. With deep set, `indexOf(r, true)` starts searching at index 1, so an element equal to the first entry is added again. Without the flag the search starts at 0 and duplicates are dropped.

Why it's unclear: the second argument looks like a leftover, not a deliberate start index. A repeated first entry only matters for the Meta click cycling (it can make the cycle stay on one element) and only when two hits map to the same selectable element.

Kept. SelectTool._getSelectableElements passes the flag as the start index; select-tool.test.ts ("keeps a repeated first element when deep") pins it.

## Q-155 Image mask undo name is not localized

Old location: chunk.vendor.js module 334 (GSelectTool._mouseDragEnd, image mask branch).

What it does: dropping images into a shape with Meta names the undo step with the literal "Create image mask"; every other name in the tool comes from the GSelectTool locale keys. The page drop appends the literal " & Switch Pages" or " & Move to Page" to the localized name.

Why it's unclear: probably missing keys, but the undo names are visible in the History panel and recorded by the parity scenarios, so changing them changes output.

Kept. next/src/editor/tools/select/drop-apply.ts uses the same literals; pointer/meta-drag-into-image-mask pins the name.

## Q-156 Dead checks in the select tool's press and modifier handlers

Old location: chunk.vendor.js module 334 (GSelectTool._mouseDown, _modifiersChanged, _keyDown).

What it does: _mouseDown returns early while an inline editor is open, but its later branch still checks that inline editor node to close it; that node is always null there. _modifiersChanged compares `e.button` with the right button, but a modifiers event has no button, so the check always passes. _keyDown returns while inline editing and then checks again before opening one on Enter.

Why it's unclear: they look like remains of an older flow where the press could happen during inline editing.

Kept. SelectTool keeps the checks with comments; they have no effect.

<!-- Editor, path tools (phase 6) -->

## Q-157 Freehand digits set _bop

Old location: chunk.vendor.js module 335 (GFreehandTool._keyDown, lines 61086-61105).

What it does: right after a stroke (or during one), the keys 0 to 9 set the
new path's `_bop` to 0.1 ... 0.9 (0 gives 1), each in its own "Create
freehand path" undo step unless a stroke's transaction is open. `_bop` is
the legacy border opacity: a path neither paints nor saves it, so the
document doesn't change, only the undo history grows (after two digits it
takes three undos to remove the path).

Why it's unclear: INVENTORY (EDT-TOOL-059) calls it "opacity", which the
user would expect to change the stroke. It changes nothing visible. It may
be a leftover from before paint layers, or meant to set the border layer's
opacity.

Kept. FreehandTool._keyDown; pinned by freehand-tool.test.ts ("digits set
_bop on the new path ...") and the parity scenario freehand/digit-opacity
(not yet listed: it needs the Ctrl+Z shortcut of the app shell).

## Q-158 leaveWhenClosePath waits for the second move

Old location: chunk.vendor.js module 539 (GPenTool._mouseDown and
_mouseMove, lines 76116-76124 and 76311-76320).

What it does: with the editor option leaveWhenClosePath the pen should
exit once a path is closed. Closing by clicking the first point commits and
forgets the path (`_reset` clears `_pathRef`), so the check after the
close sees no path. The first pointer move afterwards picks the closed path
up again through _checkMode, and only the second move (or the next press)
exits the tool. The parity scenario pen/close-path-leave-option records
the pen still active after the closing click.

Why it's unclear: the option reads like "leave right when the path
closes". Exiting one move later is probably unintended, but it's harmless.

Kept. PenTool._mouseDown / _mouseMove; pinned by pen-tool.test.ts ("with
leaveWhenClosePath the tool exits once the path is closed") and
pen/close-path-leave-option.

## Q-159 Pen prepend cursor checks the last point twice

Old location: chunk.vendor.js module 539 (GPenTool._mouseMove, lines
76386-76392).

What it does: while the next point follows the pointer, the pen shows
PenEnd over the path's other end and PenModify over the end being
extended. In Append mode it tests the first and the last point. In Prepend
mode it tests the last point for both, so over the first point (the one
being extended) the cursor is not PenModify, and over the last point it
says PenEnd.

Why it's unclear: looks like a copy-and-paste slip (the Prepend branch
should mirror Append), but it only affects the cursor.

Kept. PenTool._mouseMove (comment "The old code took the last point for
both").

## Q-160 Knife right-click polyline cuts at every click

Old location: chunk.vendor.js module 757 (GKnifeTool._mouseDown,
_mouseRelease, _modifiersChanged, lines 104955-105256).

What it does: every release without Alt held at its press cuts along the
line drawn so far and forgets it. A plain right click therefore cuts with
a one-point line (nothing happens) and starts over. An Alt+right click
keeps its point, and letting Alt go replays a press and release, but that
replayed press falls within the 300 ms double-click guard and is dropped.
The next click then cuts along a line from the Alt point only. Cutting a
rectangle along right clicks at three points across it (knife/right-click-
points) therefore gives one open path (the rectangle opened at one edge)
instead of two pieces.

Why it's unclear: INVENTORY (EDT-TOOL-066) says right clicks add rounded or
connector points to the cut path, as with the pen, which suggests a
polyline cut was intended. The result is confusing, but nothing is lost
(undo restores the shape).

Kept. KnifeTool; pinned by the parity scenario knife/right-click-points
and knife-tool.test.ts ("right clicks add rounded points to the line and
cut at every release", "with Alt at the press ...").

## Q-161 Knife elementHitTest

Old location: chunk.vendor.js module 757 (GKnifeTool.elementHitTest, lines
105769-105788).

What it does: hit-tests a vertex source and, for a hit on an outline
between two points, reads the undeclared global `locationInvTransformed`
(a ReferenceError) after assigning another undeclared global
(`elemHitRes`). Nothing in either bundle calls it, nor
getTransformedVertices next to it.

Why it's unclear: dead code that would crash if called; probably left over
from an earlier knife.

Kept. KnifeTool.elementHitTest throws the same ReferenceError at that
point and skips the global assignment; no test (unreachable).

## Q-162 Freehand finish on Shift up passes the modifiers event

Old location: chunk.vendor.js module 335 (GFreehandTool._modifiersChanged,
lines 61192-61201).

What it does: after a Shift release (straight segment mode), letting Shift
go finishes the stroke by calling _mouseRelease with the
ModifiersChangedEvent instead of a mouse event. Its `client` is undefined,
which goes to GEditor.updateByMousePosition. In the single page view that
position is not read. With the multi-page view on, updateByMousePosition
calls Rect.containsPoint(undefined), which would throw; I haven't tested
that case.

Why it's unclear: works in the usual case, may crash in the multi-page
view.

Fixed: see BUG-042 in BUGS-FIXED.md.

## Q-163 Freehand click makes a closed one-point path

Old location: chunk.vendor.js module 335 (GFreehandTool._mouseRelease and
_closeIfNeeded, lines 61260-61331).

What it does: a click without a move gives a stroke of one point. The
release adds a second point 1 px to the right, then the closing check
(end within 15 px of the start) moves it onto the first point and
correctClosedAttribute merges the two: the result is a closed path with a
single anchor point, selected and with its fill shown.

Why it's unclear: the extra point suggests a click was meant to leave a
small open path; the closing undoes that. The empty path stays in the
document.

Fixed: see BUG-052 in BUGS-FIXED.md.

<!-- Editor, paths graph and annotation tools (phase 6) -->

## Q-164 Paths graph handle part ids compare by type only

Old location: chunk.vendor.js module 275 (GPathsGraphEditor), `_partIdAreEqual`.

What it does: point and anchor parts compare by point, segment parts by their two points, and every other part type by `facet` (the test reads `F.PartType.Facet`, which is always truthy, instead of comparing the part's type with it). Handle parts (LeftHandle, RightHandle) have no facet, so two handle parts of the same side are equal whatever point they belong to.

Why it's unclear: it looks like a typo for `e.type == F.PartType.Facet`, but the handle comparison would still need a point test to tell handles apart. It only matters for part selection lookups (isPartSelected, toggling), and the editor rarely holds handle parts there.

Kept. next/src/editor/paths-graph/paths-graph-editor.ts, `_partIdAreEqual`; pinned by "compares handle part ids by type only" in paths-graph-editor.test.ts.

## Q-165 Paths graph editor restores PartInfos as part ids

Old location: chunk.vendor.js module 275 (GPathsGraphEditor), `_ensureConsistentSelection`.

What it does: rebuilds the part selection from the Selected flags of anchors, edges and facets (constructor, setEditMode, restoreEditorStateData), but pushes whole GBaseEditor.PartInfo objects instead of their ids into updatePartSelection. A PartInfo has no `type`, so the selection mode becomes None and the part selection holds PartInfos the rest of the editor can't read. In the constructor it does nothing, because the editor isn't selected yet.

Why it's unclear: the anchors, edges and facets keep their Selected flags, so painting still shows them selected; only the part selection is unusable until the next click replaces it. It may never have been noticed.

Kept. next/src/editor/paths-graph/paths-graph-editor.ts, `_ensureConsistentSelection`; pinned by "restores PartInfos, not part ids, from the Selected flags" in paths-graph-editor.test.ts.

## Q-166 Paths graph editor path-only methods

Old location: chunk.vendor.js module 275 (GPathsGraphEditor), `getPointsSelectionType`.

What it does: copied from GPathEditor. With exactly one selected part it reads `this._element.getAnchorPoints()`, which a paths graph doesn't have, so it throws a TypeError. With several parts it returns "S", without parts "N".

Why it's unclear: nothing in the bundle calls it on a paths graph editor (the paths graph tool asks the editor's active extending mode instead), so it is dead code that would crash if reached.

Kept. next/src/editor/paths-graph/paths-graph-editor.ts, `getPointsSelectionType`; pinned by "throws in getPointsSelectionType for one selected part" in paths-graph-editor.test.ts.

## Q-167 Text annotation tool without the annotation tool mixin

Old location: chunk.vendor.js module 1088 (GTextAnnotationTool).

What it does: calls `GObject.inherit(GTextAnnotationTool, GTextTool, [GAnnotationTool])`. `inherit` takes two arguments and ignores the mixin list, so unlike the other annotation tools (which use `inheritAndMix`) its insert transaction carries no add-annotation data. The tool isn't registered in the tool manager either, so it is unreachable.

Why it's unclear: probably a slip for `inheritAndMix`, but since the tool is unreachable and the transaction data only fed the dropped cloud comment sync, it has no visible effect.

Kept. next/src/editor/annotations/text-annotation-tool.ts extends TextTool without AnnotationToolMixin; pinned by "tag their insert transaction as an added annotation, except the text tool" in annotation-tools.test.ts.

<!-- Editor, fonts (phase 6) -->

## Q-168 A font download that fails leaves its waiting requests pending

Old location: designer.browser.dev.js module 590 (bundled fonts provider) and module 1379 (Google fonts provider), resolveFont.

What it does: both providers download a font file once and queue further requests for the same url. When the download fails for lack of connection (onerror), only the request that started it is failed; the queued ones are dropped from the queue without an answer. When the server answers outside 200-299, nobody is called and the url stays in the queue, so every later request for that file waits forever too.

Why it's unclear: in the engine those fonts stay pending (hasPendingFonts stays true), so a document that uses them never counts as loaded. It may be on purpose for the offline case (the font manager offers a retry dialog there), but the 404 case looks like an oversight.

Kept. app/fonts/fonts-provider.ts downloadFontFile; pinned by "fails only the first request on a connection error, and none on a 404" in app/fonts/providers.test.ts.

## Q-169 The first call to the imported fonts provider runs twice

Old location: designer.browser.dev.js module 1118 (GImportedFontsProvider), initialize, load and resolveFont.

What it does: the first load or resolveFont before the provider has read its font list both queues itself in a callback list and passes itself to initialize, which calls it once the list is read and then runs the callback list, which calls it again. A first resolveFont of a font that isn't imported therefore fails twice, and the font manager then asks the Google and local providers twice and fails the engine's font request twice (two FontUnavailableEvents and two MissingFontEvents for the same placeholder). A first load (the first font list query that reaches this provider) answers twice, so the providers after it are asked twice and their families can show up twice in that query's result.

Why it's unclear: it looks like a bug (duplicate events, duplicate entries in the first font list), but it only shows on the first request after a page load and nothing crashes.

Kept. app/fonts/imported-fonts-provider.ts initialize; pinned by "runs its first request twice, later ones once" in app/fonts/providers.test.ts.

## Q-170 A listed family whose download had no connection stays pending

Old location: designer.browser.dev.js module 255 (FontsProviderManager), resolveFont.

What it does: once a font list query has run, a family is resolved by the provider that listed it. If that provider fails with ConnectionError, the request is neither resolved nor failed: the old app only offered a "feature unavailable" retry dialog when it considered itself offline, and did nothing otherwise. A file that downloads but doesn't parse is also left unanswered on this path, while the path without a listing tries the next provider.

Why it's unclear: the font stays pending for good, so anything waiting for fonts (the missing-fonts dialog after opening a document, the corpus settle hook) never finishes. It may be meant to wait for the retry, but online nothing ever retries.

Kept. app/fonts/font-manager.ts FontsProviderManager.resolveFont; pinned by "leaves a listed font pending when its download had no connection" in app/fonts/font-manager.test.ts.

## Q-171 The Chinese default font checks for a family the app doesn't ship

Old location: designer.browser.dev.js GDesigner.init (lines 122620-122660).

What it does: for Chinese and traditional Chinese the app wants "Noto Sans CS" as its default font, but only if the bundled fonts provider has it. The bundled list has "Noto Sans CJK SC" and "Noto Sans CJK TC" ("Noto Sans CS" is only the old short name GFont.getFontFamilyCorrected maps), so the check always fails and Chinese keeps Open Sans. Japanese gets Noto Sans CJK JP as intended.

Why it's unclear: the Chinese branch is dead code; the intent was probably a CJK default font for Chinese too.

Kept. parity/app/fonts.ts installAppFonts; the bundled list check is pinned by "lists Open Sans first, then the CJK and Noto families" (hasFont("Noto Sans CS") is false) in app/fonts/providers.test.ts.

<!-- Editor, touch input (phase 6 review and phase 7) -->

## Q-172 Pinch zoom centre from a touch without a client position

Old location: designer.browser.dev.js module 1585 (pinch gesture, move).

What it does: to find the point to zoom around, the pinch gesture builds a `new Touch({ identifier: GUtil.uuid(), pageX, pageY, target })` at the middle of the two fingers and passes it to the view's `_convertClientPositionFromMousePosition`. The touch has no clientX/clientY (they default to 0), and the uuid string becomes identifier 0. The view reads clientX when the touch's target is its own element and it isn't absolutely positioned, and pageX otherwise.

Why it's unclear: whether the zoom centre is right depends on which element the first finger touched. When the widget's own element is the target, the centre is taken from client position 0 and not from the fingers.

Kept. next/src/editor/touch/pinch-gesture.ts builds the same touch; editor-tools/touch/pinch-zoom pins the result.

## Q-173 Dropped delayed touch start stays around

Old location: designer.browser.dev.js module 1582 (GGestureHelper, _dropDelayedTouchEvent).

What it does: dropping the held-back single-finger touch start clears its timeout but sets a misspelled field (`_delayedTouch`) to null, not `_delayedTouchEvent`. The held-back event stays referenced until the next touch start replaces it.

Why it's unclear: it looks like a typo. It has no visible effect, because the event is only delivered while its timeout is set.

Kept. next/src/editor/touch/gesture-helper.ts clears only the timeout; gesture-helper.test.ts ("drops the held-back start when a second finger comes down") pins that the event isn't delivered.

## Q-174 Deactivating a touch target drops click suppression for good

Old location: designer.browser.dev.js module 878 (touch target, deactivate).

What it does: deactivate always removes the document scroll listener that click suppression added, and activate doesn't add it back. A target with click suppression that is deactivated and activated again no longer counts page scrolls as swipes.

Why it's unclear: only the document touch target uses click suppression, and GDesigner never deactivates it, so it doesn't show. It could matter if the touch targets get reused.

Kept. next/src/editor/touch/touch-target.ts; touch-target.test.ts ("listens to page scrolls only with click suppression").

<!-- Editor core, view, guides (phase 6 review) (phase 6 review and phase 7) -->

## Q-175 Annotation exceptions stick to the first annotation list

Old location: public/chunk.vendor.js module 82 (GEditor.getAnnotationsExceptions), lines 20425-20435.

What it does: the annotation list variable is a hoisted `var` that is never reset. After the first node that is a page with annotations (or an AnnotationsList), every later node in the list adds that same list's annotations again and skips its own check. A later annotation or comment of another user is then not excluded from the clone.

Why it's unclear: it looks like a scoping slip, not intent. With a selection mixing a page with annotations and a later annotation or comment, cloneSelection and applySelectionTransform(clone) copy another user's annotation.

Kept. next/src/editor/editor.ts getAnnotationsExceptions declares `list` before the loop; pinned by the scenario "annotation-exceptions/list-sticks" in editor-edit-ops.scenarios.ts (run by editor-edit-ops.test.ts). Also a BUGS-FIXED candidate.

## Q-176 Long press inside an SVG doesn't swallow the release

Old location: designer.browser.dev.js module 1693 (GLongPressEvent._fireLongPressEvent), lines 165722-165730.

What it does: after dispatching "long-press", the old code swallowed the next trusted touchend/mouseup only when `target.parentElement.className.indexOf("g-scene-widget") === -1`. For an element inside an SVG (an svg icon, a path) the parent's className is an SVGAnimatedString: truthy but without indexOf, so the call threw inside the animation-frame callback after the event was dispatched, and no swallower was installed. The release and its click still reached their handlers.

Why it's unclear: the throw looks accidental (a TypeError in the console on every long press of an SVG icon). The intent was probably to swallow the release outside the scene widget for SVG elements too. That would change what a long press on an icon does next.

Kept. next/src/editor/touch/long-press-event.ts treats a non-string className as "no swallow" (without throwing); pinned by "doesn't swallow the release when the parent's className isn't a string (SVG)" in long-press-event.test.ts. Also a BUGS-FIXED candidate.

## Q-177 Style editor switch never fires EditorChangedEvent

Old location: chunk.vendor.js module 779 (GStyleEdManager), updateEditor 107685-107711 and _activateEditor 107752-107776.

What it does: _activateEditor triggers EditorChangedEvent(previous, new) only when an editor was already active. Its only caller, updateEditor, first calls deactivateEditor, and the editor's deactivate calls notifyDeactivated, which sets _activeEditor to null. So when a fill switches from a linear to a radial gradient, "previous" is null and no EditorChangedEvent fires. The isDeactivatable early return and the same-editor validateAlreadyActive check are also unreachable through updateEditor.

Why it's unclear: the event looks meant for panels that follow the active gradient editor. Either the old code never relied on it, or the deactivate-first ordering broke it.

Kept. next/src/editor/style-ed-manager.ts _activateEditor (comment points here); pinned by "switches to the radial editor without an EditorChangedEvent (updateEditor deactivates first)" and, for the direct call, "fires EditorChangedEvent(previous, new) when called with an editor still active" in style-ed-manager.test.ts.

## Q-178 Icon handle setIcon load race

Old location: chunk.vendor.js module 383 (icon handle base), setIcon 67741-67771 and _statusEvent 67784-67792.

What it does: setIcon starts an XHR and, on load, a FileReader, then assigns a new GImage to this._icon. Loads are never cancelled, so the one that finishes last wins, even when an older call finishes after a newer one or after setIcon(null). _statusEvent removes the listener from this._icon rather than from the event's image. A status event from an older image therefore unhooks the current icon and sets its bounds. If setIcon(null) ran in between, the status event throws a TypeError on the null _icon. A 404 or an Error status leaves an icon that counts as visible but has no canvas, so only the handle paints.

Why it's unclear: in the old app the touch handle icons are set once at startup, so the race may never happen there. A fix would track the pending request and unhook event.image.

Kept. next/src/editor/handles/icon-annotation.ts setIcon and _statusEvent (comments point here); pinned by "keeps the load that finishes last, and the other image's status unhooks the wrong one" and "overwrites a setIcon(null) made during a load, and a later status then throws" in icon-annotation.test.ts.

## Q-179 limitScrollingToView measures the unscaled page in output mode

Old location: chunk.vendor.js module 363 (GSceneWidget._correctScrollPosition), lines 63126-63150.

What it does: in output paint mode the old code assigns the active page's geometry box to the variable that held the zoom-scaled scene box, and the later "is the content bigger than the view" checks use it. That box is in world units, not scaled by the zoom, so at 400% a 400 x 300 page still counts as smaller than an 800 x 600 view and every scroll snaps back to centered.

Why it's unclear: it looks like an accidental reuse of the hoisted variable, but limitScrollingToView is never turned on, so nobody sees it.

Kept. SceneWidget._limitScrollPosition in next/src/editor/view/scene-widget.ts; pinned by "keeps the content within reach with limitScrollingToView" (output mode case) in scene-widget.test.ts, with values recorded from the old app.

## Q-180 limitScrollingToView and the view watermark are unused

Old location: chunk.vendor.js module 363 (GSceneWidget): _correctScrollPosition lines 63020-63150, the watermark parts of _finishPaint and _repaint, and _paintWatermark lines 63189-63208.

What it does: GSceneWidget.options.limitScrollingToView (default false) keeps the scroll within reach of the content. ScenePaintConfiguration.watermark paints a texture over the whole view after each repaint and keeps a copy of the screen without it. Nothing in the old app turns either on; the app shell only sets watermark to null.

Why it's unclear: both look like dead features that could be dropped.

Kept. Both are ported in next/src/editor/view/scene-widget.ts; pinned by the limitScrollingToView tests and "keeps the watermark over the composited screen" in scene-widget.test.ts.

## Q-181 A deferred resize drops the done callback of the one it replaces

Old location: chunk.vendor.js module 363 (GSceneWidget.resize), lines 62744-62753.

What it does: while a repaint or pan finish is pending, resize applies on the next frame. A second resize before that frame cancels the first one, including its done callback. GWindow.relayout passes a done that re-centres the view by half the size change, and it measures the "previous" size after the first resize already changed it. So with two relayouts in one frame, the first re-centring is lost and the view drifts during a window drag-resize.

Why it's unclear: it may be intended (only the last size matters), but the lost callback changes the scroll.

Kept. SceneWidget.resize in next/src/editor/view/scene-widget.ts; pinned by "resizes after a pending repaint has run, once, with the last size asked for" in scene-widget.test.ts.

## Q-182 Symbol labels never show the "●" prefix

Old location: chunk.vendor.js module 1077 (GSymbolLabelGuide._gatherLabels), lines 235640-235690.

What it does: the label text is `(isMaster() ? "○ " : "● ") + name`, but the symbol list was already filtered to `isMaster() && getScene()`, so the "● " prefix can never be painted.

Why it's unclear: either instance labels were dropped on purpose and the ternary is left over, or the filter was meant to let instances through.

Kept. next/src/editor/guides/symbol-label-guide.ts keeps both the filter and the ternary; pinned by "labels master symbols in the scene with a ○ prefix and the third outline colour" in label-guides.test.ts.

## Q-183 mapPoint keeps page-local values of another page

Old location: chunk.vendor.js module 742 (GPageGuide.map, 101660-101708) and module 210 (GGuides.mapPoint, 40626-40690).

What it does: in the multi-page view GPageGuide.map converts the point into the coordinates of the page under it and returns snap values in that page's own space, with that page as `page`. GGuides.mapRect converts its pivots into the same space (40733-40742) before taking the delta. GGuides.mapPoint takes `hit.x.value` / `hit.y.value` as they are, so a point near another page's edge comes back in that page's local coordinates: active-page (498,100) near page B's left edge comes back as (0,100).

Why it's unclear: the other guides answer in active-page space, and mapRect handles the page guide correctly, so this looks like a slip in mapPoint. It would make a mapped point jump when snapping to another page's edge in the multi-page view. Not checked in the old app UI.

Fixed: see BUG-049 in BUGS-FIXED.md.

## Q-184 Snap scope stays on the other page

Old location: chunk.vendor.js module 153 (GBBoxGuide.map 32340-32343, checkDistanceGuidesMapping 32484-32485, setScope 32759-32790) and module 741 (GPointsGuide.map 101545-101546, setScope 101618-101640).

What it does: with a scope set, mapping over a page other than the scope's main page calls _setEffectiveScope(thatPage), which replaces the snap elements with that page's top-level elements. Nothing resets _eSnapElems when the point comes back to the main page; only setScope (beginMap/finishMap) does. For the rest of that pass, snapping on the main page only considers the other page's elements, so the scoped children no longer snap.

Why it's unclear: the switch only makes sense while the point is over the other page. Keeping it afterwards looks unintended, but it only shows in multi-page documents while editing inside a group and dragging across pages.

Fixed: see BUG-050 in BUGS-FIXED.md.

<!-- Element editors (phase 6 review) (phase 6 review and phase 7) -->

## Q-185 Inline text editing ignores editing keys after a session ends mid-composition

Old location: chunk.vendor.js module 752 (GInlineTextEditor), deactivate and _compEnd at 102880-102899 and 103425-103435; GTextEditor.beginInlineEdit reuses the instance.

What it does: when inline editing ends while an IME composition is open, deactivate removes the input box listeners (endCaptureInput) before compositionend arrives, so _compositionOn stays true. The text editor keeps the same GInlineTextEditor, so in the next inline session _handleKey treats every key as a composition key: Backspace, Enter, Delete, Up/Down and Tab return undefined and do nothing until a new composition starts and ends. Left/Right/Home/End use the stale composition counters.

Why it's unclear: probably an oversight (deactivate never resets the composition state), but changing it alters what keys do after an interrupted IME session.

Fixed: see BUG-056 in BUGS-FIXED.md.

## Q-186 Scene editor rotation zone shows the plain rotate cursor

Old location: chunk.vendor.js module 545 (GSceneEditor.getCursor, around line 79331).

What it does: in getCursor, case OUTSIDE looks up the segment cursor (Cursor.SelectRotate[rotationSegment]) but has no break, so it falls through to case ROTATE and the cursor becomes SelectRotateRound. The rotation zone around the transform box never shows the segment's rotate cursor, and the lookup throws without part data.

Why it's unclear: it looks like a missing break, but the round cursor is what users of the old app saw, and nothing else reads the segment cursor.

Kept. scene-editor.ts getCursor spells out the fall-through; scene-editor.test.ts "shows the round rotate cursor outside the box (old missing break)" pins it.

## Q-187 Page SWITCH_ORDER compares page boxes in page coordinates

Old location: chunk.vendor.js module 331 (GPageEditor._applyPartMove, around line 57850).

What it does: with SWITCH_ORDER on, a label drop looks for the page whose geometry box centre is nearest the moved page's centre. Page geometry boxes are in each page's own coordinates (all start at 0,0), so the nearest page depends only on page sizes, not on where the pages sit. With equal sizes the moved page itself (or the first page) wins and nothing is reordered.

Why it's unclear: probably a bug, but SWITCH_ORDER is off in the app, so users never reach it.

Kept. page-editor.ts _applyPartMove; page-editor.test.ts "swaps places with the nearest page when SWITCH_ORDER is on" uses pages of different sizes to reach the swap.

## Q-188 Segment drag at slope 0 or 1 builds a part id without a type

Old location: chunk.vendor.js module 127 (GPathEditor.selectToolDragStartAction), lines 28715-28740.

What it does: a drag that starts on a segment near one of its ends (hit slope within 0.001 of 0 or 1) returns a PartInfo for the end point whose id is {type, point} with `type` read from a hoisted `var` that is never set on this path, so the type is undefined instead of PartType.Point.

Why it's unclear: looks like a bug (the id should be a point id), but code comparing part types then treats the drag as neither a point nor a segment.

Kept. path-editor.ts selectToolDragStartAction; path-editor.test.ts pins the undefined type.

## Q-189 Shift on a corner shoulder drag reads cl for cr, or nothing outside detail mode

Old location: chunk.vendor.js module 127 (GPathEditor._movePreviewPointShoulders), lines 30005-30045.

What it does: with Shift in detail mode, the right shoulder's start value is read from `cl` whenever `cr` is set, so both shoulders start from the left one. Outside detail mode the Shift branch uses the two `var`s that only the detail branch sets, so the returned translation is NaN.

Why it's unclear: both look like bugs, but they decide where the shoulders end up after a Shift drag.

Fixed for detail mode: see BUG-044 in BUGS-FIXED.md. The NaN outside detail mode stays: it only reaches a hint that ignores path parts.

## Q-190 A slice scaled without a preview gets height 0

Old location: chunk.vendor.js module 1084 (GSliceEditor._applyTransform), line 237413.

What it does: without an element preview the new height is `h * matrix[1]` (the vertical shear) instead of `h * matrix[3]`, so a pure scale applied through `_transform` sets the slice height to 0.

Why it's unclear: clearly a typo in the old code, but it changes saved slice sizes.

Fixed: see BUG-043 in BUGS-FIXED.md.

## Q-191 The connector editor has a type name the old app never had

Old location: chunk.vendor.js, the connector editor module (around line 235700).

What it does: the old connector editor class had no G name; it was only registered as the editor of GConnector, and its toString is the inherited "[Object GPathEditor]". The port registers it as "GConnectorEditor" so it gets a type id.

Why it's unclear: anything that looks editors up by type name now finds a name that didn't exist in the old app; toString is unchanged.

Kept. connector-editor.ts registerClass(this, "GConnectorEditor"); parity/g/editor-path-editors.ts doesn't expose it under a G name.

<!-- Tools (phase 6 review) (phase 6 review and phase 7) -->

## Q-192 Collab text nodes have no element editor

Old location: chunk.vendor.js module 1087 (GCollabTextEditor, 237927-238042) and module 1089 (GCollaborativeTextAnnotationEditor, 238063-238093), registered by the editor barrel (module 53) at 10552 and 10579.

What it does: in the old app a GCollabText (a text block from Gravit Cloud collaboration, shown as an image until edited) got a rectangle editor without rotate and resize handles, plus an inline text editor once it switched to text mode, so it could be selected, moved, deleted and double-clicked to edit its text. A GCollaborativeTextAnnotation got an editor without rotate and resize whose _showEditor returns false.

The new app drops both editors with cloud collaboration, but keeps the two node classes so such files still load and save. Checked in the old app with both editors unregistered: nothing throws (no page error on select, click, drag, hover, double click, openInlineEditor, store or delete), but updateSelection leaves the selection empty, so the collab text can't be selected, moved, deleted or edited, and a double click doesn't switch it to text mode. It stays in the file and is saved unchanged. That is what a user of the new app gets when a file holds such a node: it shows and saves, but is read-only and can only be removed by deleting its layer or parent.

Why it's unclear: the drop reason ("cloud collaboration") covers the sync, not old files that still hold these nodes. Porting the two editors is about 30 lines each if someone needs to edit such files.

Kept as dropped. No editor is registered for CollabText or CollaborativeTextAnnotation; the CollabText branch in next/src/editor/editor.ts openInlineEditor stays (dead until an editor exists).

## Q-193 Magic tool crashes on a selection with open sub-paths

Old location: chunk.vendor.js module 764 (GMagicTool._doTheClip), lines 106893-106898.

What it does: after uniting or subtracting the stroke, the old code removes the touched elements and then loops over the open sub-paths and calls `.item.getParent()` on them. They are raw vertex sources without an `item`, so any selection with an open sub-path (an open path, or a compound path with an open part) throws a TypeError from the mouse handler. The closed shapes are already removed by then. The freehand tool's transaction is still committed as "Create freehand path", so the document keeps the raw stroke and loses the shape; one undo restores it (checked in the old app).

Why it's unclear: the loop clearly meant to remove the elements the open parts came from, or nothing, not to throw. Users hit it by selecting a closed shape and an open path and drawing a magic stroke. BUGS-FIXED candidate.

Fixed: see BUG-041 in BUGS-FIXED.md.

## Q-194 Moving a whole paths graph throws

Old location: chunk.vendor.js module 275, GPathsGraphEditor.edTransform (51955-52104), which falls back to GPathBaseEditor.prototype.edTransform at 52104.

What it does: without a part selection, or with the resize box (pointer tool), the paths graph editor runs GPathBaseEditor's edTransform on itself. That reads path-base state a graph editor doesn't have and throws a TypeError on every move; the graph stays where it was.

Why it's unclear: a user hits it by dragging a selected live paint graph with the pointer tool. Looks like a plain bug (BUGS-FIXED candidate).

Kept. next/src/editor/paths-graph/paths-graph-editor.ts, edTransform; pinned by "throws on a whole-graph preview transform, as GPathBaseEditor's did" in paths-graph-editor.test.ts.

## Q-195 Paths graph edge delete removes only the first edge

Old location: chunk.vendor.js module 275, GPathsGraphEditor.deletePartsSelected (53366-53380).

What it does: in edge mode the loop removes the edge of the first Segment or Point part and then breaks, so with several edges selected only the first is deleted.

Why it's unclear: Delete with two edges selected deletes one. Probably a bug (BUGS-FIXED candidate).

Kept. next/src/editor/paths-graph/paths-graph-editor.ts, deletePartsSelected; pinned by "deletes only the first edge of an edge selection (old bug, kept)" in paths-graph-editor.test.ts.

## Q-196 Shift while hovering with the paths graph tool throws

Old location: chunk.vendor.js module 753, GPathsGraphTool._mouseMove (104076-104083) and _constrainIfNeeded (104478-104490).

What it does: after the first click, the hover move constrains against the graph itself, which has no getAnchorPoints, so every move with Shift held throws a TypeError.

Why it's unclear: holding Shift while drawing a live paint line is normal use. Probably a bug (BUGS-FIXED candidate).

Kept. next/src/editor/paths-graph/paths-graph-tool.ts, _constrainIfNeeded; pinned by "throws on a Shift move right after the first click (old bug, kept)" in paths-graph-tool.test.ts.

## Q-197 Paths graph edits leave no undo step

Old location: chunk.vendor.js module 753 (GPathsGraphTool transactions) and module 275 (editor applies); the old app's extra/paths-graph-editing expected output.

What it does: only creating a paths graph ("Insert Element(s)") becomes an undo step. Adding lines from anchors, splitting edges ("Insert Point") and moving anchors commit transactions that record no actions, so they can't be undone on their own.

Why it's unclear: the transactions are named as if they were meant to be undoable. The old scenario still shows "Insert Element(s)" after an anchor move.

Kept. Pinned by "starts a new line at an anchor or an edge pressed in Edit mode" in paths-graph-tool.test.ts and by the extra/paths-graph-editing scenario.

## Q-198 Paths graph tool double click drops the line

Old location: chunk.vendor.js module 753, GPathsGraphTool._mouseDblClick (104322-104330) and the double-click check in _mouseDown.

What it does: a second press within DBLCLICKTM clears the part selection and releases the preview without inserting the line being drawn, so it is lost; only its start anchor stays. With selectDoubleClickBehavior "edit" it reports the job done instead.

Why it's unclear: Esc ends the line and keeps it; a double click throws it away.

Kept. next/src/editor/paths-graph/paths-graph-tool.ts, _mouseDown and _mouseDblClick; pinned by "ends the line on a double click" in paths-graph-tool.test.ts.

## Q-199 Switching from the subselect tool to the pen drops the selected end point

Old location: chunk.vendor.js module 539/541 (GPenTool, GPathTool._checkMode).

What it does: after picking an end point of an open path with the subselect tool, activating the pen loses the point selection (probe "ready" in pen/continue-open-path shows no anchors), so the next click starts a new path instead of continuing. Continuing works only by clicking the end point with the pen itself (Edit mode switches to Append or Prepend).

Why it's unclear: INVENTORY EDT-TOOL-038 describes continuing from the selected end point; the old app never reaches that through the subselect tool.

Kept. The pen/continue-open-path and pen/continue-from-first-point scenarios pin it; pen-tool.test.ts "PenTool from the first point (Prepend)".

## Q-200 Pen Alt-press on the end point just dragged only drops its handle

Old location: chunk.vendor.js module 539 (GPenTool._closeOrChangePreviewIfNeeded and _updateHandles).

What it does: after dragging out a curve point, holding Alt and pressing on that point (then dragging) gives the same result as a plain click on it: its outgoing handle is removed and the Alt drag changes nothing. The "handle plus drag delta" branch only runs for a press on an existing point in Edit mode.

Why it's unclear: EDT-TOOL-041 says Alt pressed before the drag edits the existing point's handle; for the end point just placed it doesn't.

Kept. pen-tool.ts _closeOrChangePreviewIfNeeded; pinned by the pen/alt-press-on-end-point scenario and "on the end point just dragged" in pen-tool.test.ts.

## Q-201 Fill tool opacity getter returns 1 without a paths graph

Old location: chunk.vendor.js module 758 (GFillTool.getSelectionFillOpacity).

What it does: returns the first fill opacity of the first selected paths graph, null when that graph has no fill, and 1 when no paths graph is selected. getSelectionFillPattern returns null in both of the latter cases.

Why it's unclear: the two getters disagree for the same selection, and 1 looks like a default that was meant for both.

Kept. fill-tool.ts getSelectionFillOpacity; pinned by "the selection fill getters read the first selected paths graph" in fill-tool.test.ts.

## Q-202 Pages dropped on pages are removed

Old location: chunk.vendor.js module 334, GSelectTool._mouseDragEnd (59318-59400).

What it does: when the dropped items are pages (only possible with GEditorOptions.pageCollisionTransform on), each source page is removed from the scene, and it is put back next to the target only when GPageEditor.SWITCH_ORDER is on. SWITCH_ORDER is always false, so the page just disappears, with the undo name "... & Switch Pages".

Why it's unclear: the branch looks unfinished. The old app can't reach it, because pageCollisionTransform is !pagesCanOverlap and pagesCanOverlap is never set false.

Kept. select/drop-apply.ts movePagesOrElements; pinned by "removes the dropped page without SWITCH_ORDER (the old default)" in select-tool-drop.test.ts.

## Q-203 Page drop targets lose their highlight at once

Old location: chunk.vendor.js module 334, GSelectTool._updateSelectionTransform (60236-60282).

What it does: after the page drop targets are gathered (and highlighted), the image-mask cleanup runs over the whole scene with an empty target list and clears the Highlighted flag of the target page in the same step. A page drop target is never shown highlighted. Image mask targets keep their highlight.

Why it's unclear: the page highlight is set on purpose and then wiped; probably the second cleanup was meant to skip pages.

Fixed: see BUG-057 in BUGS-FIXED.md.

<!-- App shell (phase 6 review and phase 7) -->

## Q-204 The window overlay keeps its close-on-click handler

Old location: designer.browser.dev.js module 1503 (GWindow._setOverlayContent).

What it does: a progress overlay opened with a cancel handler holder
binds a click handler that closes the overlay and then tries to unbind
itself with `n._overlay.unbind("click", this)`, where `this` is the
overlay element, not the handler. jQuery treats the element as a
selector, removes nothing, and the handler stays on the reused overlay
element. Every later overlay of that window (also ones opened without
a cancel holder) then closes on a click.

Why it's unclear: it looks like the author meant a one-shot handler,
but the visible behaviour (a click closes later overlays too) is what
users got.

Kept. src/app/shell/window.ts `_setOverlayContent` adds the listener and
never removes it. Not pinned by a test yet (needs a DOM environment).

## Q-205 The save button of the close prompt has no shortcut

Old location: designer.browser.dev.js module 1491 (GDesigner.canUnloadDocument).

What it does: the "Save..." button of the "document modified" prompt
gets `shortcut: this._shortcutToMouseTrapShortcut(GKey.Constant.ENTER)`.
The function expects a list of keys; given a number, its loop runs zero
times and it returns "", so the button has an empty shortcut and Enter
does nothing special.

Why it's unclear: Enter was clearly meant to save; but the old app
never did that.

Kept. src/app/shell/designer.ts `canUnloadDocument` passes "" with a
comment. Not pinned yet (needs the system dialog cluster).

## Q-206 Root dividers in the main menu build

Old location: designer.browser.dev.js module 1491 (GDesigner._createMainMenu).

What it does: the menu table puts a divider between two top-level
entries whose group differs, and the final loop passes every root entry,
dividers included, to the menu builder, which reads `items.length` of the
divider and throws. With the complete action table no root divider is
ever made (every action's category chain starts with a top-level
category whose group part is ""), so the old app never hit it.

Why it's unclear: it is dead in the old app; it only matters while
actions are missing.

Kept the table logic; the new root loop skips non-menu entries
(src/app/shell/designer.ts, comment at the loop), which changes nothing
once all actions are registered.

## Q-207 Wrapped cloud actions are registered directly

Old location: designer.browser.dev.js module 1483 (gravit.actions) and
module 1626 (the cloud action wrapper).

What it does: four actions were wrapped (GImportFontsAction, the 300 dpi
PDF save as, GToggleTouchAction and, in Corel builds, export). The wrapper
answered `isPro()` true and did not pass `isVisible`, `noHover` and
`getStyleClass` through (so they took the GAction defaults), and its
`isEnabled` dropped the arguments.

Why it's unclear: the wrapper is dropped with the cloud (port-map), but
the menu items of those actions may have shown a Pro marker or lost
their style class in the old app.

Kept the inner actions in the same table positions (src/app/shell/bootstrap.ts).
The menus cluster should compare the four menu items in the ui/menus
DOM snapshots; if they differ, the table can wrap them again.

## Q-208 The theme callback waits for the stylesheet

Old location: designer.browser.dev.js module 1491 (GDesigner._setTheme).

What it does: the old code set the new href and ran its callback (guide
colours, rulers recreated, label colour) when `$(link).load(url)` had
fetched the CSS text, which races with the stylesheet itself being
applied; the rulers read their colours from the stylesheet.

Why it's unclear: in the old app the rulers could, in principle, keep
the previous theme's colours when the fetch won.

Kept the fetch; src/app/themes/theme.ts also waits for the link's load
before the callback, which removes the race.

## Q-209 Memory estimate counts only the last document

Old location: designer.browser.dev.js module 85 (GContainer._estimatingMemoryUsage).

What it does: `documents.reduce((e, t) => e + (t && t.getStorageItem()) ? t.getStorageItem().documentRealFileSize : 0, 0)`
parses as `(e + (...)) ? size : 0`, so the "sum" is the size of the last
document with a storage item (and throws, caught by the caller, when a
later document has none). The low-memory warning before a save uses it.

Why it's unclear: the intent was the total size of all open documents;
the effect is a warning that rarely shows.

Kept. src/app/shell/container.ts `_estimatingMemoryUsage`.

<!-- Documents and config (phase 6 review and phase 7) -->

## Q-210 Import font matching wraps long edit distances

Old location: designer.browser.dev.js module 163 (the font provider J, its edit distance `n`).

What it does: the distance between an imported font name and a listed family is computed in an Int8Array row, so distances above 127 wrap to negative numbers. When the first string is the longer one, the code swaps the strings but keeps the lengths it read first, so it compares the shorter name padded with undefined characters to a prefix of the longer one ("abcd" against "bcd" gives 3, the other way round 1).

Why it's unclear: the result is only a ranking for the closest family. Both quirks can pick another family than a true edit distance would, but nothing crashes and names are short.

Kept. src/app/document/import-font-provider.ts (editDistance); pinned in src/app/document/import.test.ts ("keeps the old lengths ...", "wraps distances above 127 ...").

## Q-211 clearActiveStylesList throws

Old location: designer.browser.dev.js module 163 (GDocument.clearActiveStylesList).

What it does: it clears `this._selectedStylesList`, a field nothing sets, so `Object.keys(undefined)` throws a TypeError. The list the document keeps is `_activeStylesList`.

Why it's unclear: probably a rename that missed this method. No caller in the old app was found, so the throw is never reached; fixing it would change nothing users see.

Kept. src/app/document/document.ts (clearActiveStylesList); pinned in src/app/document/document.test.ts ("throws in clearActiveStylesList like the old code").

## Q-212 Placing a PDF reports pages as percent

Old location: designer.browser.dev.js module 163 (GDocument.placeOrImport, the PDF branch `u`).

What it does: File > Import > Place and drop of a PDF hand the importer's progress callback `(done, total)` straight to the overlay's progress bar, so the bar shows the number of pages done (1 for the one page placed) on a 0-100 scale. Opening a PDF as a document computes the percentage.

Why it's unclear: cosmetic, the overlay is up for a moment only.

Kept. src/app/document/place-import.ts (placePdf).

## Q-213 The annotations lists come from the annotations sidebar

Old location: designer.browser.dev.js module 567 (GAnnotationsSidebar._documentEvent) and module 1712 (GAnnotationPanel, function `j`).

What it does: on every document activation the annotations sidebar called scene.getAnnotations(), which gives every page an annotations list; saved files carry these "annlst" nodes. The annotation panel it shows then writes `$plkt` straight onto each annotation (no change event): null when the signed-in user owns the annotation (its "uid"), else NoSizeChanges | NoMove | NoDelete. That undoes the NoLock (0) that GDocument._updateState set just before, so files keep `"plkt": null` on their annotations. Both UIs are dropped with the cloud.

Why it's unclear: the effects are part of every saved file with annotations, so they must stay, but their owners are gone, and without users there is no owner check: the port treats every annotation as the user's own (null), which is what the old app did for the stub user's annotations in the corpus.

Kept. src/app/document/document.ts (Document.activate, after _updateState); pinned by corpus/annotations/document and resave and compat/annotations/roundtrip.

<!-- Storage (phase 6 review and phase 7) -->

## Q-214 Save picker JPG MIME type

Old location: designer.browser.dev.js module 1195 (_prepareDialogTypes).

What it does: when the save picker is built for a JPG (ext "jpg"), the MIME type in the picker's accept map is replaced with "x-really-an-image/jpeg". "jpeg" and other extensions keep their real MIME type.

Why it's unclear: probably a workaround for Chromium merging or renaming the .jpg entry under image/jpeg, but nothing in the code says so, and the made-up type ends up in the picker options.

Kept. src/app/storage/file-system-access.ts (_prepareDialogTypes); pinned by "rewrites the JPG MIME type when saving and lists repeated MIME types" in file-system-access.test.ts.

## Q-215 Save prompt sends the suggested name only together with file types

Old location: designer.browser.dev.js module 1195 (savePrompt).

What it does: showSaveFilePicker gets suggestedName only when at least one file type is passed; with an empty type list the picker opens without a name. Without the File System Access API savePrompt does nothing at all (no callback, no download), so callers have to check canPromptSave first.

Why it's unclear: the name has nothing to do with the types; it looks like it was put in the wrong branch.

Kept. src/app/storage/file-system-access.ts (savePrompt); pinned by "sends no suggested name without types" and "does nothing without the API".

## Q-216 A failing done callback makes a handle write download the file too

Old location: designer.browser.dev.js module 1195 (GBrowserFileStorage.Item.write).

What it does: the write chain is createWritable, truncate(0), write, close, then done(). The catch at the end of the chain also catches an exception thrown by done(), treats it like a failed write, downloads the bytes with FileSaver and calls done() a second time.

Why it's unclear: only a bug in the caller triggers it, and then the user gets an unexpected download plus a second done. Not data loss (the file was written), so it stays.

Kept. src/app/storage/file-system-access.ts (BrowserFileItem.write); pinned by "downloads too and calls done twice when done throws after a write".

## Q-217 The file input keeps the multiple flag of its first use

Old location: designer.browser.dev.js module 1195 (openPrompt, file input branch).

What it does: the hidden input#file-input is created on the first openPrompt without the API, and multiple is set only then. Later prompts change the accept list but not multiple, so after a single-file prompt (an image import) every later prompt is single-file too, and the other way round.

Why it's unclear: looks unintended, but it is how the old app behaved and scenarios record the input's attributes (platform/files/input-fallback-open).

Kept. src/app/storage/file-system-access.ts (openPrompt); pinned by "creates the input once: multiple stays as first set, accept follows each call".

## Q-218 Save checks instanceof a storage class nobody creates

Old location: designer.browser.dev.js module 447 (GSaveAction, `n instanceof v.Item` with v = module 1512).

What it does: GSaveAction applies updateSaveOptions (module 1247) only when the document's item is an Item of module 1512, a second copy of the local storage that the app never instantiates (the container uses module 1195). So that branch never runs.

Why it's unclear: the copy differs slightly from 1195 (its _isFileAPIAvailable always returns false), so it may be a leftover of an older storage; the save options it would have set are never applied.

Kept: module 1512 is not ported (port-map: drop). The file actions cluster should keep the branch dead (never call updateSaveOptions from Save) and point at this entry.

<!-- File and edit actions (phase 6 review and phase 7) -->

## Q-219 Copy keeps children of copied groups

Old location: designer.browser.dev.js module 1331 (GCutCopyAction._filterOutSelectionWithSameParent).

What it does: meant to drop selected nodes whose ancestor is also copied. Its findParent predicate assigns `n = parent === kept` and returns nothing, so findParent walks every ancestor and only the topmost one (the scene) decides, and only against the last kept node. In practice nothing is filtered.

Why it's unclear: the name says it should filter; the editor's selection rarely holds a parent and its child at once, so it may never have mattered.

Kept. src/app/actions/edit/cut-copy-action.ts keeps the loop as it was.

## Q-220 Deselect All selects the text of a focused field

Old location: designer.browser.dev.js module 1334 (GDeselectAllAction.execute).

What it does: with an editable element focused, Shift+Ctrl+A runs `document.execCommand("selectAll")`, the same as Select All, instead of collapsing the text selection.

Why it's unclear: looks copied from Select All; a deselect would be expected.

Kept. src/app/actions/edit/deselect-all-action.ts; pinned by "select the text of a focused field instead" in src/app/actions/edit/edit-actions.test.ts.

## Q-221 Cut names its undo step with a key that has no class

Old location: designer.browser.dev.js module 1331 (GCutCopyAction._deleteCutSelection).

What it does: the undo name is `GLocale.get(new GLocaleKey("text.cut-selection"))`: the key text is passed as the class and the key is undefined, so the lookup misses (logs "No value found") and the transaction gets that result as its name. Only cutting a style layer from a properties panel uses the action title instead.

Why it's unclear: it reads like `new GLocaleKey("GCutCopyAction", "text.cut-selection")` was meant.

Kept. src/app/actions/edit/cut-copy-action.ts; the editor-actions/exec edit.cut case records the undo state name.

## Q-222 Save of a new document skips the cloud chooser

Old location: designer.browser.dev.js module 447 (GSaveAction._save, _saveDesktop).

What it does: in the old app, saving a new document opened a chooser between a local file and Gravit Cloud (module 1510), and in browsers that cannot write files (no File System Access API) every save of a document without a cloud file went to Gravit Cloud's Save As. With the cloud dropped, the port sends a new document straight to Save As (file.save-as.gvdesign: the save prompt, or a download where the browser can't write files), and an existing local file without File System Access is downloaded through Save As too.

Why it's unclear: the dropped chooser leaves only one choice, so asking makes no sense, but this is a visible change in the flow.

Kept as described (a consequence of the drop). src/app/actions/file/save-action.ts.

## Q-223 Print waits one timer turn before printing the SVG pages

Old location: designer.browser.dev.js module 1609 (GPrintAction, the SVG fallback).

What it does: after writing the page images into the hidden iframe, the old code ran `$(iframe.contentWindow.document).ready(fn)`. jQuery 3 ignores the document argument and, as the main page is loaded, runs the handler on a later timer turn.

Why it's unclear: the code looks like it waits for the iframe's images, which it does not.

Kept. src/app/actions/file/print-action.ts runs focus and print in a setTimeout.

## Q-224 Paste Here has two getIcon definitions

Old location: designer.browser.dev.js module 1182 (GPasteHereAction).

What it does: the prototype defines getIcon twice; the second (the touch icon "gravit-icon-paste-here", else null) wins.

Why it's unclear: dead first definition.

Kept the effective one. src/app/actions/edit/paste-here-action.ts.

## Q-225 Change Opacity writes null when run without a digit

Old location: designer.browser.dev.js module 1647 (GChangeOpacityAction.execute).

What it does: execute sets `_stop` of every selected stylable element to the pending opacity level and then clears it. Run from the menu or `executeAction` (no digit typed), the level is null and the elements get `_stop = null`.

Why it's unclear: the action is shortcut-only (invisible in menus), so only scripted calls reach it that way.

Kept. src/app/actions/edit/change-opacity-action.ts.

<!-- Widgets and dialogs (phase 6 review and phase 7) -->

## Q-226 Closing a lower overlay pops the top one

Old location: designer.browser.dev.js module 1722 ($.fn.gOverlay, `close`).

What it does: an outside mousedown or Escape walks the open overlays from the top and closes each one it happened outside of, passing the overlay's index. `close` checks the overlay is at that index, but then removes the last entry of the stack (`i.pop()`), not the one at the index. When the top overlay keeps itself open (a close listener calls the veto function) and one below it closes, the stack loses the top entry and keeps the closed one.

Why it's unclear: it only matters when an overlay vetoes its close while another one below it closes in the same event, which no flow seems to do on purpose. It looks like `splice(index, 1)` was meant.

Kept. dialogs/dialog-container.ts `Overlay.close` pops the last entry like the old code.

## Q-227 Prompt dialogs get an undefined class

Old location: designer.browser.dev.js module 44 (GSystemDialog.prompt).

What it does: the dialog class is `"g-system-dialog g-prompt-dialog " + className`, and most callers pass no class name, so the dialog gets the class `undefined` and its container `undefined-container`. The DOM snapshots of the expand/shrink and symbol name prompts record it.

Why it's unclear: looks like a missing default, but no stylesheet rule matches either class, so it changes nothing visible.

Kept. dialogs/system-dialog.ts `SystemDialog.prompt`; ui/dialog/expand-shrink.dom and ui/dialog/symbol-name-prompt.dom pin it.

## Q-228 fixedIncrement is never read

Old location: designer.browser.dev.js module 1702 ($.fn.gInputBox, `increment` and `mousemoveIncrement`).

What it does: in inch and centimetre documents a unit box steps by a tenth of the step size, unless `fixedIncrement` is set. The check reads `fixedIncrement` from the box's data object instead of its options, where it is never set, so the option has no effect and every unit box steps by tenths there.

Why it's unclear: the option exists and is documented by its default, so some caller may have expected whole steps.

Kept. widgets/input-box.ts `InputBoxValue._step`; widgets/input-box.test.ts "ignores fixedIncrement, as the old plugin did".

## Q-229 Scrubbing without decimals always steps up

Old location: designer.browser.dev.js module 1702 ($.fn.gInputBox, `mousemoveIncrement`).

What it does: a scrub move changes the value by the pixels moved (times the modifier factor). When the document shows no decimals, a change below 1 is raised to 1, and that includes zero and negative moves, so the first move event (which has no delta) and every downward move add 1.

Why it's unclear: the rule is meant for small fractional steps; applying it to negative steps reverses the drag direction.

Kept. widgets/input-box.ts `InputBoxValue._step`; widgets/input-box.test.ts "takes at least one whole step per move without decimals, even down or still".

## Q-230 Checkbox slider class lags behind

Old location: designer.browser.dev.js module 1704 ($.fn.gCheckboxSlider).

What it does: the `checked` class is set from the box when the slider is mounted and on user changes. Setting the box from code (`.prop("checked")` or the plugin's `value`) leaves the class as it was, and the class (and the change listener) stay after `unmount`. The stylesheet draws `.g-checkbox-slider.checked` and `:checked` alike, so the look only differs where the two disagree.

Why it's unclear: the class looks redundant next to `:checked`, and letting it go stale may not be intended.

Kept. widgets/checkbox-slider.ts and widgets/checkbox-slider-view.tsx track the class the same way.

## Q-231 One-time radio options

Old location: designer.browser.dev.js module 44 (GSystemDialog._dialogV1, the options list).

What it does: each option radio is created with `.prop("checked", fn)`. jQuery calls the function with the element's index in its own one-element set (always 0), so every radio is checked when the stored option is 0, and none otherwise. The browser then keeps only the last checked radio of the group.

Why it's unclear: the code was clearly meant to check the radio of the stored option. Only the CDR import dialogs use options, and those can't be reached in the local app.

Kept. dialogs/system-dialog.ts `_dialogV1` passes the same "all or none" state to the view.

## Q-232 Renaming submits unchanged names

Old location: designer.browser.dev.js module 1695 ($.fn.gAutoEdit, `submit`).

What it does: submit reads the field, closes it (which clears the remembered original text), and then compares the field's value with the cleared original. The comparison is always true, so any non-empty value is submitted, also when it didn't change.

Why it's unclear: the check was meant to skip unchanged names; submitting them only renames to the same name.

Kept. widgets/auto-edit.ts `AutoEdit.submit` compares after close like the old code.

## Q-233 Input select change fires twice on its container

Old location: designer.browser.dev.js module 1703 ($.fn.gInputSelect).

What it does: the input's change is passed on as a change of the `.g-input-select` container, which also receives the input's own change event by bubbling. A listener on the container runs twice per change.

Why it's unclear: the forwarding looks redundant, and a listener that writes the document does it twice (the canvas DPI field does).

Kept. widgets/input-select.ts forwards the change the same way; `<InputSelectView onChange>` runs per container event.

## Q-234 A rich tooltip under another overlay stays open

Old location: designer.browser.dev.js module 1728 ($.fn.gRichTooltip, `close`).

What it does: closing the tooltip asks its overlay to close and forgets it. The overlay only closes when it is the top one, so a tooltip that opened under a menu or chooser stays on screen until an outside click closes it.

Why it's unclear: probably never intended, but it needs another overlay to open while the tooltip is up.

Kept. widgets/rich-tooltip.ts `closeRichTooltip`.

<!-- Menus and toolbar (phase 6 review and phase 7) -->

## Q-235 A menu item's info hides the item

Old location: designer.browser.dev.js module 339 (GMenuItem.setInfo).

What it does: setInfo writes `display` on the whole `li` (shown when there is an info text, hidden when there is none) instead of on the info span. An item whose info goes from a text back to none disappears.

Why it's unclear: it looks like the info span was meant. No action of this build has an info text, so nothing visible depends on it.

Kept. menus/menu-item.ts setInfo; menu.test.ts "hides the whole item when its info goes from set to empty, as before".

## Q-236 Inline SVG action icons become class names

Old location: designer.browser.dev.js module 339 (GMenuItem.setIcon) with the icon table, module 844.

What it does: a string icon goes on an `<i>` with jQuery's addClass, so the align actions' inline SVG icons end up as a pile of class names (`<svg`, `class="align-svg"`, ...) and no icon shows.

Why it's unclear: the table has SVGs for these actions, so someone meant them to show, but the menu never rendered them. The recorded context menu DOM has the class names.

Kept. menus/menu-item.ts setIcon; menu.test.ts "shows captions as text and icons as an <i> with the class names".

## Q-237 The tab menu keeps a disabled Share entry

Old location: designer.browser.dev.js module 1500 (GHeader tab context menu table).

What it does: the tab menu has a Share entry that is enabled only for cloud files with sharing allowed. Sharing and the cloud are dropped, so the entry is always disabled.

Why it's unclear: it's a dead entry of a dropped feature, but removing it changes the tab menu the tabs/context-menu scenarios record.

Kept, always disabled. menus/header.ts TAB_MENU.

## Q-238 Toolbar.isVisible returns nothing

Old location: designer.browser.dev.js module 1541, GToolbar.prototype.isVisible.

What it does: the function evaluates `this._htmlElement.is(":visible")` but has no return, so it always gives undefined. setVisible compares that with the new value, so it always calls gDesigner.relayout().

Why it's unclear: it looks like a missing `return`, but the only effect is an extra relayout.

Kept. toolbar/toolbar.ts Toolbar.isVisible returns undefined; setVisible relays out every time.

## Q-239 Tool menus start with a divider unless the first tool of the table is in them

Old location: designer.browser.dev.js module 1541, GToolbar.prototype._createToolItems.

What it does: a divider is added when the category changes from the previous entry (starting from null). The check uses the index in the whole tool table, so a group whose first tool isn't table entry 0 (path, knife, shape, view) gets a divider before its first item.

Why it's unclear: it looks unintended, but the recorded dropdown screenshots show it.

Kept. toolbar/toolbar.ts _createToolItems; toolbar.test.ts "puts a divider before a tool group menu unless it starts the table".

## Q-240 The zoom input's keydown flag lives on the toolbar

Old location: designer.browser.dev.js module 1541, _initZoomButton (arrow functions using $(this).data("keydown")).

What it does: the arrow functions' `this` is the toolbar, so the "keydown" flag is shared by the whole toolbar, not kept per input.

Why it's unclear: harmless with one zoom input, but clearly not what was meant.

Kept. toolbar/toolbar.ts _initZoomButton keeps one flag per zoom button build.

## Q-241 The Select hit list checks hits for pages

Old location: designer.browser.dev.js module 1303, _getHitsElments and the Select item's UpdateEvent.

What it does: checks `hits[0] instanceof GPage`, but the hits are { element } records, so the check is always false. Pages are already filtered out by the hitTest acceptor.

Why it's unclear: it looks like it meant hits[0].element.

Kept. menus/context-menu.ts _updateSelectMenu / _getHitsElments.

## Q-242 Copy Effect comes before Apply To in the effect row menu

Old location: designer.browser.dev.js module 1303, _createEffectPropertyMenu.

What it does: adds Copy Effect first and the "Apply to" submenu after it. INVENTORY ACT-CTX-008 lists them the other way round.

Why it's unclear: the code and the inventory disagree.

Kept (code order). menus/context-menu.test.ts "names the effect's Apply To entry".

## Q-243 Page Copy writes its clipboard inside a transaction

Old location: designer.browser.dev.js module 1303, _createPageMenu COPY.

What it does: runs the serialize and copyToClipboard inside Editor.tryRunTransaction named "Copy Page", which may add an empty undo step.

Why it's unclear: nothing in the scene changes.

Kept. menus/context-menu.ts _createPageMenu.

<!-- Modify actions (phase 6 review and phase 7) -->

## Q-244 Vertical distribute compares the new top with x

Old location: designer.browser.dev.js module 867 (GDistributeAction.execute, the vertical branch where the elements don't fit).

What it does: when the elements are taller together than the area, their centres are spaced evenly. Before moving an element the code checks whether its new top differs from its current position, but it compares the new top with the box's x instead of its y. The horizontal branch compares x with x.

Why it's unclear: looks like a copy-paste slip. The effect is only a skipped no-op move when the new top happens to equal the old x, so the result is nearly always the same.

Kept. distribute-action.ts execute, vertical branch.

## Q-245 Clip Selection and Create Nested Compound share Ctrl+Alt+M

Old location: designer.browser.dev.js modules 809 (GClipAction.getShortcut, [OPTION, META, "M"]) and 1316 (GCreateNestedCompoundAction.getShortcut, [META, ALT_LEFT, "M"]).

What it does: both actions bind the same key. The recorded shortcuts scenario (editor-actions/shortcuts nested-compound-keys) shows Ctrl+Alt+M on two compounds running Clip Selection, so the nested compound shortcut never fires.

Why it's unclear: the nested compound action has a shortcut nobody can use, but its menu hint still shows it.

Kept. clip-action.ts and create-nested-compound-action.ts keep both shortcuts; which binding wins is up to the shortcut binder's order, pinned by editor-actions/shortcuts once that area is enabled.

## Q-246 Expand/Shrink shows the outline action's invalid-value text

Old location: designer.browser.dev.js modules 1185 (GOutlineAction.execute) and 1317 (GOffsetAction._dialogAlertMessage).

What it does: GOffsetAction defines _dialogAlertMessage ("Entered invalid number for offset value."), but the shared execute in GOutlineAction always alerts GOutlineAction's "Entered invalid number for outline value.", so Expand/Shrink shows the outline text and the offset string is never used.

Why it's unclear: looks like a missed override, but it is only a wording difference.

Kept. outline-action.ts execute uses the outline key; offset-action.ts keeps the unused _dialogAlertMessage. Pinned by path-actions.test.ts "shows the outline action's alert for an invalid offset".

## Q-247 Split Path is enabled in review mode

Old location: designer.browser.dev.js module 873 (GSplitPathAction).

What it does: isEnabled doesn't call GElementAction.isEnabled, so the menu item is enabled while the annotations sidebar is active. execute then checks it and returns false without doing anything.

Why it's unclear: every other element action is disabled in review mode.

Kept. split-path-action.ts isEnabled and execute.

## Q-248 Simplify ignores the typed tolerance

Old location: designer.browser.dev.js module 1318 (GSimplifyAction.execute).

What it does: the text field's change handler looks for the slider with $(this).parent().find(".g-input-slider"), but the slider is outside the field's span. Typed values never reach the slider, and OK uses the slider value (default 10).

Why it's unclear: the field is meant to set the tolerance, but the path-dialogs scenarios (simplify-typed-40, simplify-typed-0) record this behaviour.

Kept. simplify-action.ts reads only the slider value; pinned by editor-actions/path-dialogs/simplify-typed-* once the dialog exists.

## Q-249 Split Line gives a lone line its source's fill

Old location: designer.browser.dev.js module 1319 (GSplitLineAction.execute).

What it does: a piece that is a single line and has no border gets a black border if the source path has fill layers, and otherwise the source's first fill layer, which is undefined when there are no fills.

Why it's unclear: the condition looks inverted. With no fill layers it appends undefined, which probably throws.

Kept. split-line-action.ts, the isLine branch.

## Q-250 Detach Symbol's undo name has a stray "s" slot

Old location: designer.browser.dev.js module 874 (GDetachSymbolAction.execute).

What it does: the undo step is named from "Detach symbol %number" with %number replaced by "s" when more than one instance was detached, otherwise by "". One instance gives "Detach symbol " with a trailing space; the count itself never appears.

Why it's unclear: the placeholder is called %number but is used as a plural suffix.

Kept. detach-symbol-action.ts execute; pinned by symbol-layer-actions.test.ts "detaches an instance and names the undo step".

## Q-251 Joint type titles don't match the engine types

Old location: designer.browser.dev.js module 1648 (GChangeAnchorPointsJointTypeSubAction._getNodeType).

What it does: "Disconnected" (sub key D) sets the engine's Asymmetric type (TA), and "Asymmetric" (sub key A) sets Symmetric (TS). Straight sets "-".

Why it's unclear: the names look swapped, but they follow the inspector's point-type menu wording.

Kept. change-anchor-points-joint-type-sub-action.ts; pinned by symbol-layer-actions.test.ts "passes the engine type of each menu type to the inspector".

## Q-252 Enter layer group ignores which sidebar is active

Old location: designer.browser.dev.js module 1605 (GEnterLayerGroupAction.execute).

What it does: Enter and Shift+Enter move the layers panel focus into or out of a group even when the outline sidebar isn't the active left sidebar. Rename, lock, hide and cycle all check that it is.

Why it's unclear: probably an oversight, but the hidden panel's focus has no visible effect.

Kept. enter-layer-group-action.ts execute.

## Q-253 Page Down/Up are bare keys in the additional shortcuts

Old location: designer.browser.dev.js module 1341 (GChangeActivePageAction.getAdditionalShortcuts).

What it does: returns [PAGE_DOWN] instead of [[PAGE_DOWN]], a key where a shortcut (key list) is expected. The shortcut code treats it as a one-key shortcut.

Why it's unclear: inconsistent with every other getAdditionalShortcuts.

Kept. change-active-page-action.ts, cast with a comment.

<!-- View and help actions (phase 6 review and phase 7) -->

## Q-254 Fast view ignores the page clip setting

Old location: designer.browser.dev.js module 1603 (the fast view action, execute).

What it does: turning fast view off picks the paint mode from the page's clip setting, like Outline does. But it reads GPageProperties.CLIP_PROPERTY_NAME and GPageProperties.CLIP_CONTENT_ENABLED, which GPageProperties never defines (the real names are PAGE_CLIP_PROPERTY_NAME and PAGE_CLIP_CONTENT_ENABLED in module 442). Both are undefined, so the comparison is always true and a fixed-size page always goes back to Output (clipped), even when its "cce" setting says not to clip. Outline view reads the right names and goes back to Full on such a page.

Why it's unclear: almost certainly the wrong constant names, but the result only shows on a page whose clip content button is off, and the page properties panel re-applies the clip mode when the page is activated again.

Kept. fast-view-action.ts keeps the two undefined names; view-actions.test.ts ("fast view ignores the page clip setting on a fixed page") pins it next to Outline view's behaviour.

## Q-255 Snap to Half Pixel grows the size

Old location: designer.browser.dev.js module 1295 (GSnapUnitAction.execute).

What it does: Snap to Full Pixel rounds the geometry box's x, y, width and height. Snap to Half Pixel does the same and then adds 0.5 to all four, so a 30x40 box at (10, 21) becomes 30.5x40.5 at (10.5, 21.5). Its edges land on .5 on the left and top but on whole units on the right and bottom.

Why it's unclear: "half pixel" usually means moving the box by half a pixel (crisp 1px borders), not making it half a pixel larger. Adding 0.5 to the size may be intended (both edges at .5 would need the size kept), or a slip.

Kept. snap-unit-action.ts; view-actions.test.ts ("rounds the geometry box; half adds .5 to position and size") and editor-actions/exec/arrange.snap-unit.half pin it.

## Q-256 Fill and border visibility toggle is never registered

Old location: designer.browser.dev.js module 1642 (GTogglePaintLayersVisibilityAction) and the bootstrap's action list (module 1483, which imports the module but never instantiates the class).

What it does: the class handles F (fills) and Shift+B (borders): it hides or shows the paint layers of the selection and everything inside it. Since no instance is registered, the keys never reach it. Its transaction name is GLocale.get(TITLE), and TITLE is never set, so the undo entry would have no name.

Why it's unclear: a finished feature with shortcuts that is switched off, maybe on purpose (F and Shift+B clash with tool keys), maybe by accident.

Kept. toggle-paint-layers-visibility-action.ts exports the class; bootstrap's ACTION_TABLE has no entry for it, as before. editor-tools/view/toggle-fill-and-border-visibility pins that the keys do nothing.

## Q-257 Zoom Out's id has no "view." prefix

Old location: designer.browser.dev.js module 1291 (GZoomOutAction.ID = "zoom.out").

What it does: every other zoom action is "view.zoom.*" or "view.magnification.*"; Zoom Out is "zoom.out".

Why it's unclear: looks like an oversight, but the id is what menus, toolbar buttons and saved shortcuts refer to.

Kept. zoom-out-action.ts; editor-actions/exec/zoom.out pins the id.

<!-- Notify dialogs, welcome, settings (phase 6 review and phase 7) -->

## Q-258 Software update check without a release service

Old location: designer.browser.dev.js module 1676 (GSoftwareUpdateManager.start, initializeReleaseStatus, installUpdate).

What it does: start() scheduled a daily check against the cloud release service (gApi.software.getRelease), stored "last_update_check" and "old_version", and in Electron installed an update flagged with "install_update_on_start". A silent Electron install stored that flag instead of installing.

Why it's unclear: the release service is dropped with the cloud, and the three keys must not be written (platform/dropped). The new Electron window has no IPC channel to an updater either. Whether the desktop build should get a real updater (and what decides "silent") is open.

Kept: the class and its events. The release status is the old failure fallback (silent, no version), so a check never finds an update and a check the user asked for reports "no update available"; start() only connects the Electron updater channel (none is installed yet); the silent Electron install waits instead of writing the key. src/app/dialogs/software-update-manager.ts, pinned by "writes none of the dropped update keys when it starts" in src/app/dialogs/dialogs-notify.test.tsx.

## Q-259 Linked-image warning opens before it is built

Old location: designer.browser.dev.js module 1511 (GWarnLinkedImageDialog), called from module 447 (GSaveAction._save).

What it does: the constructor reads "designer.settings.warn-linked-image-dialog.never-remind" (a promise) and only builds the dialog when that resolves, but the save action calls open() right after `new`. open() then throws a TypeError, and the dialog that gets built later is never shown. With "never remind" stored, the save goes ahead.

Why it's unclear: it only happens when the default storage can save (desktop storage) and the document has linked images, which the browser build never reaches. It looks like a crash, but nothing a user of the web app can hit.

Kept: open() and close() throw the old TypeError while the dialog isn't built. src/app/dialogs/warn-linked-image-dialog.ts.

## Q-260 Keep Fonts adds duplicates to cst

Old location: designer.browser.dev.js module 841 (GMissingFontsDialog._keepFonts).

What it does: `!t.indexOf(e) >= 0 && t.push(e)` compares a boolean with 0, which is always true, so every missing family is pushed onto the scene's "cst" list again on each Keep Fonts, duplicates included.

Why it's unclear: the intent was clearly "add if missing", but the duplicates do no harm (the list is only searched with indexOf) and they are saved in the file.

Kept: src/app/dialogs/missing-fonts-dialog.ts `_keepFonts`. No test yet (the dialog needs a DOM).

## Q-261 Custom page size in pt is stored as text

Old location: designer.browser.dev.js module 1544 (GNewDocumentDialog._newDocumentCustomSize, _newDocument).

What it does: the typed width and height go into `new GLength(text, unit).toPoint()` as strings. For every unit but pt the conversion multiplies and gives a number; for pt, toPoint returns the value itself, so the page's "w" and "h" are strings ("210").

Why it's unclear: probably unintended, but the engine coerces the strings where it computes with them, and the saved file carries the string.

Kept: src/app/welcome/welcome-screen.ts `_newDocument` passes the texts through.

## Q-262 Notification panel content strings are HTML

Old location: designer.browser.dev.js module 1666 (GNotificationPanel._notificationEvent, _updateContent).

What it does: `$("<div>").addClass("message").append(message)` parses a string message as HTML, so a notification text with markup (or a file name with "<") is rendered as markup.

Why it's unclear: the callers pass string-table text and error messages; some error messages include user data such as file names.

Kept: strings are inserted as HTML (src/app/dialogs/notification-panel-view.tsx `useAppended`).

## Q-263 The settings dialog's developer rows depend on the build env

Old location: designer.browser.dev.js module 1275 (GSettingsDialog._buildDialog) and module 1483 (gDesigner.setEnv(nodeEnv)).

What it does: outside "production", "lts", "rc" and beta builds the dialog shows "Allow steps import/export" and "Enable cached rendering". The old build set env "production"; the new boot never calls setEnv, so getEnv() is null and the rows appear.

Why it's unclear: not a question about the old code, but a gap: the rows' settings have no effect in the new engine (no command recorder, no transaction debugging).

Kept: the dialog tests getEnv() as before (src/app/settings/settings-dialog.ts). The boot needs `designer.setEnv("production")` for editor-actions/dialogs/edit.settings and the settings scenarios to match.

<!-- Inspector geometry and shapes (phase 6 review and phase 7) -->

## Q-264 The appearance panel stays shown once any panel was shown

Old location: designer.browser.dev.js module 864 (GInspectorSidebar._updatePropertyPanels).

What it does: every visible panel sets the shared `.appearance-properties-panel`
to `display: ""`, but nothing ever hides it again. After the first update
with any visible panel (the page panel, on the first document), the
container stays shown even when none of its appearance panels is, for
example with nothing selected.

Why it's unclear: the container then holds only hidden panels, which looks
like a missing else branch, but it has no height and nothing shows.

Kept. src/app/inspector/inspector-sidebar.ts `_updatePropertyPanels`;
pinned by parity/expected/ui/inspector/nothing.dom.json (the container has
`style=""` there).

## Q-265 Inspector panels remove their listeners without the target

Old location: designer.browser.dev.js modules 1264, 1265, 1269, 1270, 1271,
1274, 1294, 1654-1656, 1660 (update()).

What it does: `removeEventListener(Event, this._handler)` without the
target argument removes every registration of that prototype method, not
just this panel's. Each panel exists once, so the effect is the same as
removing its own.

Why it's unclear: looks accidental; with two instances of a panel one
would unhook the other.

Kept. Every panel's update() passes no target, as before.

## Q-266 The align settings overlay is one row element with four sets of columns

Old location: designer.browser.dev.js module 1294 (GDimensionProperties.init, `.alignSettings`).

What it does: gPropertyRow is called four times on the same element
(same height, same width, full unit, half unit), so `.alignSettings` is a
single `g-property-row no-label` with four `.columns` children instead of
four rows.

Why it's unclear: it reads like four rows were meant, but the stylesheet
lays the columns out one under the other, so it looks like a list.

Kept. src/app/inspector/dimension-properties.ts init; visible in the
settings overlay of the align toolbar.

## Q-267 Moving by the X and Y boxes has an untranslated undo title

Old location: designer.browser.dev.js module 1294 (GDimensionProperties._assignDimension).

What it does: the transaction of a typed X or Y is named "Move" as a
literal string, while size and rotation use the string tables
("action.change-size", GCommonNames "action.rotate").

Why it's unclear: probably a missed translation; the undo menu shows
"Undo Move" in every language.

Kept. src/app/inspector/dimension-properties.ts `_assignDimension`.

## Q-268 Transform panel transforms an element by itself

Old location: designer.browser.dev.js module 1660 (GTransformProperties._applyTransformation, the helper `h`).

What it does: when no element editor can be opened for an element, the
helper calls `element.transform(element, true)`, passing the element where
the transform belongs, instead of the transform it built.

Why it's unclear: this is a bug (the transform is lost or the call throws),
but every element type the panel accepts has an element editor, so the
branch doesn't run in practice.

Kept. src/app/inspector/transform-properties.ts `_applyTransformation`.
BUGS-FIXED candidate if a case without an editor turns up.

## Q-269 Path panel _mainPath never set

Old location: designer.browser.dev.js module 1269 (GPathProperties.update).

What it does: while collecting the selected anchor points it checks
`1 == this._points.legth` (a typo for length), so `_mainPath` is never
assigned. Nothing reads `_mainPath`.

Why it's unclear: dead code because of a typo; harmless.

Kept. src/app/inspector/path-properties.ts drops the dead assignment and
leaves a comment where it was.

## Q-270 Path panel updates fields it never builds

Old location: designer.browser.dev.js module 1269 (GPathProperties._updatePointProperties).

What it does: it writes `input[data-point-property="cr"]` and
`button[data-point-property="cu"]`, but init never builds a "cr" input and
never calls the "cu" factory, so those queries match nothing. jQuery's
`prop("disabled")` on the `div[data-point-property="cl"]` slider only sets
a JavaScript property on the div, with no visible effect.

Why it's unclear: leftovers of an older corner UI.

Kept. src/app/inspector/path-properties.ts keeps the empty queries and the
property on the div.

## Q-271 Corner row column width "3x"

Old location: designer.browser.dev.js module 1269 (the path corner row).

What it does: one spacer column gets the CSS width "3x". The browser
rejects it, so the column has no width style. The polygon panel's copy of
the row uses "3px".

Why it's unclear: a typo for 3px, but the old DOM has the column without a
width.

Kept. src/app/inspector/path-properties.ts passes "3x"; pinned by
parity/expected/ui/inspector/path-point.dom.json.

## Q-272 Swapped corner titles in the rectangle advanced panel

Old location: designer.browser.dev.js module 1271 (GRectangleProperties.init).

What it does: the per-corner type buttons (tl_ct and so on) get the
tooltip "uniform corner smoothness", and the per-corner lock buttons (tl_uf
and so on) get "corner type".

Why it's unclear: the two tooltips look swapped.

Kept. src/app/inspector/rectangle-properties.ts init; visible in
parity/expected/ui/editor/rectangle-corners.dom.json.

## Q-273 Image panel ignores other elements

Old location: designer.browser.dev.js module 1266 (GImageProperties.update).

What it does: the panel shows when exactly one inspected element is an
image, even when other non-image elements are selected too. Two images
hide it.

Why it's unclear: every other shape panel requires all elements to be of
its type.

Kept. src/app/inspector/image-properties.ts update, pinned by the "shows
for exactly one image, ignoring other elements" test in
rectangle-properties.test.ts.

## Q-274 Color Thief bounding box uses else-if for the maxima

Old location: designer.browser.dev.js module 1267 (vboxFromPixels).

What it does: a sample that lowers a channel's minimum never raises its
maximum. With a single sample colour the box is empty, and the palette
shows the box centre (for example [104,104,104] for a pure [200,200,200]
image) instead of the colour.

Why it's unclear: a known bug of the third-party library; it changes the
extracted palette, which is wrong output.

Kept. src/app/inspector/color-thief.ts, pinned by the "keeps the else-if
bounding box" test. BUGS-FIXED candidate.

<!-- Text panel and styles (phase 6 review and phase 7) -->

## Q-275 Line height unit switch converts pt at 96 dpi

Old location: designer.browser.dev.js module 1273 (GTextProperties), the click handlers of the `_plh_unit` and `_pas_unit` buttons.

What it does: switching the line height (or the paragraph spacing in the advanced settings) between "%" and the document unit converts with the font size times 4/3: 150 % of a 20 pt font becomes a line height of 40, and 40 becomes 150 % again. The line height factor is kept at 0.01 or more; the paragraph spacing has no minimum.

Why it's unclear: 4/3 is the pt to px factor at 96 dpi, but everywhere else the app treats pt and px as equal (GLength uses 72 dpi). Typing a percentage into the line height box doesn't use the factor, so switching units changes the line height on screen.

Kept. text-properties.ts (percentToLength, lineHeightPercent, paragraphSpacingPercent); pinned in text-properties.test.ts ("the line height and paragraph spacing unit switch").

## Q-276 Bold toggle writes Infinity when no weights are known

Old location: designer.browser.dev.js module 1273 (GTextProperties._toggleFormatting).

What it does: turning bold off picks Regular when the font has it, else `Math.min` of the weights the last update found, then falls back to `GFont.Style.Regular`. That constant doesn't exist, so the fallback is undefined, and with an empty weight list `Math.min()` is Infinity, which is written as the text's `_tfw`.

Why it's unclear: the weight list is only empty before the first update or for a font the font list doesn't know; the fallback names a style constant for a weight, which looks like a slip.

Kept. text-properties.ts `_toggleFormatting`; pinned in text-properties.test.ts ("writes Infinity for bold text when no weights are known").

## Q-277 Font size box keeps the unit of its first init

Old location: designer.browser.dev.js module 1273 (GTextProperties.init and _updateProperties), module 1705 ($.fn.gUnitBox).

What it does: the size box is created with `gUnitBox({ source: "text" })` (unit px), and every update calls `gUnitBox({ unit, list, source })` again with pt (or px in px documents). The second call doesn't reach the input box, which keeps px as its unit and postfix; only the size list's click handler, rebound on every update, used the new unit for its item labels ("12 pt").

Why it's unclear: in a document that isn't in px the size field shows a px postfix while its list says pt. pt and px are the same size here (72 dpi), so the values agree.

Kept, apart from the list labels: text-properties.ts `_updateSizeBox` hands the list to the box once and lets the unit box's own list handler show it, so the items say px like the field (the ported UnitBox reads its options, not those of a later init). No parity scenario opens the size list.

<!-- Paint and effects panels (phase 6 review and phase 7) -->

## Q-278 Appearance opacity undo name is hard-coded English

Old location: designer.browser.dev.js module 1160 (GAppearanceProperties), the opacity slider and box change handlers.

What it does: both commit their transaction as "Change opacity", a literal string, while every other appearance change uses a string table key (GCommonNames action.change-blending-mode, ...).

Why it's unclear: the undo list shows English in every language. It may be an oversight or a missing key.

Kept. appearance-properties.ts, `_createField` ("opacity-slider", "opacity-input").

## Q-279 Fill rule buttons of the touch toolbar

Old location: designer.browser.dev.js module 1261 (fill panel), init.

What it does: the two touch fill rule buttons (completely fill, winding fill) carry the title of the advanced settings button ("Advanced Settings"), and a click toggles `g-active` on every `.completely-fill` / `.winding-fill` in the whole document, not only in this panel's toolbar.

Why it's unclear: the titles look copied from the settings button, and the document-wide toggle only works because there is one fill panel.

Kept. fill-properties.ts, `ruleButton` in `init`.

## Q-280 Appearance keeps an unused fill rule field

Old location: designer.browser.dev.js module 1160, the field factory in init.

What it does: the factory can build an "evenodd" select (with the key GCommonNames evenodd.non-odd, where the fill panel uses evenodd.even-odd), but init never asks for it.

Why it's unclear: dead code with a different string key than the fill panel's select.

Kept. appearance-properties.ts, `_createField("evenodd")`.

## Q-281 Add Border on an open path aligns it inside

Old location: designer.browser.dev.js module 1162 (border panel), the Add Border handler.

What it does: a new border gets Outside on texts, Center on open arcs and Inside on every other shape. The branch that gives open paths Center comes after the shape check, and paths are shapes, so it never runs: open paths get Inside, although the advanced settings disable Inside for open paths.

Why it's unclear: the open-path branch is clearly meant to run.

Kept. border-properties.ts `newBorderAlignment`, pinned in border-properties.test.ts.

## Q-282 Border panel takes elements by their fill property set

Old location: designer.browser.dev.js module 1162, `update`.

What it does: the panel keeps the inspected elements whose style property sets include FillPaintLayers, not BorderPaintLayers.

Why it's unclear: every element with borders also has fills today, so it doesn't show, but it reads like a copy from the fill panel.

Kept. border-properties.ts `update`, pinned in border-properties.test.ts.

## Q-283 Dropping a border outside the list is named after fills

Old location: designer.browser.dev.js module 1162, the row's dragend handler.

What it does: a move or Shift-duplicate finished by dragend is committed as GFillPaintLayerProperties "action.move" / "action.duplicate", while the drop handler uses the border panel's own names.

Why it's unclear: copied from the fill panel; the undo list names a border move "Move Fill".

Kept. border-properties.ts, dragend handler in `_insertPaintLayer`.

## Q-284 Border width box ignores the document unit

Old location: designer.browser.dev.js module 1162, `_updatePaintLayer`.

What it does: it calls gUnitBox again with the unit (px for px documents, else pt) on a box that is already set up; the plugin keeps its first options, so the width always shows in px.

Why it's unclear: the code clearly wants the unit to follow the document.

Kept. border-properties.ts `_updatePaintLayer`.

## Q-285 Shadow blur ranges are never read

Old location: designer.browser.dev.js module 1262, the drop/inner shadow and contact shadow forms.

What it does: the forms read `RANGES` from the effect instance, but RANGES is a static of the effect class, so the blur box always uses the defaults ([0, 200]; [5, 200] for the contact shadow).

Why it's unclear: the effect classes define ranges the form means to use.

Kept. effect-forms.ts `shadowForm`, `contactShadowForm`.

## Q-286 Effect categories sort

Old location: designer.browser.dev.js module 1262, `_createAddEffectMenu`.

What it does: the comparator was meant to put "Other" last, but it is inconsistent and the result is alphabetical: Adjust, Artistic, Blur, Distortion, Other, Shadow.

Why it's unclear: the code says one order, the menu shows another.

Kept. effect-forms.ts `compareCategories`, pinned in effect-properties.test.ts.

## Q-287 One range variable in the WebGL effect form

Old location: designer.browser.dev.js module 1262, the generic WebGL effect form.

What it does: one `var` holds the range across the loop over the effect's parameters, so the color rows' handlers use the range of the last row that set it. Each effect's color rows share one range, so it never shows.

Why it's unclear: looks like a closure bug that happens to be harmless.

Kept. effect-forms.ts, `lastRange()`.

## Q-288 Brannan preset value and caption swapped

Old location: designer.browser.dev.js module 1262, the color grading form.

What it does: the Brannan option's value is the localized string and its caption the literal "Brannan"; every other preset is the other way round.

Why it's unclear: in English both are "Brannan", so it only shows in other languages.

Kept. effect-forms.ts `gradingPresets`.

## Q-289 WebGL effect without RANGES throws

Old location: designer.browser.dev.js module 1262, the generic WebGL effect form.

What it does: for an effect class without RANGES the form reads `fxRanges`, an undefined global, and throws a ReferenceError. Every effect in the table has RANGES.

Why it's unclear: unreachable today; a fallback was probably intended.

Kept. effect-forms.ts, the form throws the same ReferenceError.

## Q-290 Effect row updates write to elements that don't exist

Old location: designer.browser.dev.js module 1262, `_updateEffect`.

What it does: it sets the visibility on `.effect-title input[type=checkbox]` and writes `.effect-layer`, but no row has either element.

Why it's unclear: left over from an older row layout.

Kept as comments in effect-properties.ts `_updateEffect`; nothing is written.

## Q-291 Border undo with an open chooser throws

Old location: designer.browser.dev.js module 1162, `_updatePaintLayer`.

What it does: on undo or redo of a change made in the chooser, the old code meant to reopen the chooser at the border's row, but it referenced `$element`, a variable that doesn't exist, so it threw a ReferenceError there (the fill and effect panels do reopen it).

Why it's unclear: a crash in an event handler after undo; a BUGS-FIXED candidate.

Kept (ported faithfully first). border-properties.ts `_updatePaintLayer`, pinned in border-properties.test.ts ("throws on undo").

<!-- Color UI (phase 6 review and phase 7) -->

## Q-292 The touch chooser module changes the desktop chooser's relayout

Old location: designer.browser.dev.js module 1657 (touch GPatternChooser), last statement; module 1150 `_relayout`.

What it does: the desktop chooser defines `_relayout()` as
`gOverlay("relayout", { preserveTop: false })`. The touch chooser's
module then assigns `GPatternChooser.prototype._relayout` (the desktop
class, not its own) to a version with a `preserveTop` argument that
defaults to true. Both modules load at boot, so every chooser keeps its
top on relayout, except when `_updatePattern` shows the background fill
(it calls `_relayout(!isBackground)`). The desktop version is dead code.

Why it's unclear: it looks like the touch override was meant for the
touch class only. The visible result (the chooser doesn't jump when it
gets shorter or taller after opening) is what users got.

Kept. src/app/color/color-chooser.ts `PatternChooser._relayout` has the
touch module's behaviour for both choosers; pinned by "relayouts keep the
top unless the pattern is the background fill" in color-chooser.test.ts.

## Q-293 Eye dropper on a tool change

Old location: designer.browser.dev.js module 1698 (`$.fn.gEyeDropper` setActive).

What it does: starting the eye dropper adds a ToolChangedEvent listener
that removes every `.g-eye-dropper-picker` element and then itself.
Ending it tries to remove "the" listener, but the function is created
anew on every setActive call, so the removal finds nothing. On a tool
change while picking, the loupe disappears but the dropper stays active:
its document listeners still run, the next mouse down still picks the
last pixel, and a later end calls `picker.remove()` on the detached
loupe.

Why it's unclear: it is probably a leftover, but it neither crashes nor
loses data; a tool change while picking only hides the loupe.

Kept. src/app/color/eye-dropper.ts `setActive`; pinned by "removes the
loupe on a tool change but stays active (the old quirk)" in
eye-dropper.test.ts.

## Q-294 The noise type select doesn't follow the pattern

Old location: designer.browser.dev.js module 1150 (`_updatePattern`, noise branch).

What it does: showing a noise pattern sets the intensity slider and box,
then looks for `[data-property="noise_type"]` in the texture editor
(`this._patternEditor`). The select is in the noise editor, so it keeps
its first option (or whatever the user picked last) whatever type the
pattern has.

Why it's unclear: looks like a typo for `_noiseEditor`, but fixing it
would change what the noise editor shows.

Kept. src/app/color/color-chooser.ts `_updatePattern`; pinned by "never
selects the noise type of the pattern in the type select" in
color-chooser.test.ts.

## Q-295 The swatches palette never stops listening

Old location: designer.browser.dev.js module 1150 (`_activatePalette`).

What it does: switching palettes should remove the SwatchesChangedEvent
listener when leaving the swatches palette, but the switch tests
`this._activatePalette` (the method) instead of `this._activePalette`,
so it never matches. Once the swatches palette was shown, the chooser
updates its swatch lists on every swatches change, also while another
palette shows, and each new visit adds the listener again (the engine's
event target decides whether it is added twice).

Why it's unclear: harmless extra work rather than wrong output.

Kept. src/app/color/color-chooser.ts `_activatePalette`; pinned by
"keeps listening to swatch changes after leaving the swatches palette"
in color-chooser.test.ts.

## Q-296 The touch chooser's CMYK boxes have no width

Old location: designer.browser.dev.js module 1657 (`__getColorModeParams`).

What it does: the desktop chooser's params name the CMYK box width
`cmykWidth` (18%); the touch chooser spells it `cymkWidth` (12%), so
`setColorMode` reads `undefined` and `.css("width", undefined)` writes
nothing: the four touch CMYK boxes take their width from the stylesheet.

Why it's unclear: a typo, but the touch layout may depend on it.

Kept. src/app/color/pattern-chooser.ts `__getColorModeParams` and
color-chooser.ts `setColorMode`; pinned by "switches to CMYK boxes and
hides the map; the touch chooser's boxes get no width" in
color-chooser.test.ts.

## Q-297 The used colors palette adds rows at fixed indexes

Old location: designer.browser.dev.js module 1150 (`_updateUsedPalette`).

What it does: the palette starts with one row of 12 swatches and fills
them with the document's colors. At every index divisible by 11 that
has a color (0, 11, 22, ...) it raises the limit by 12 and appends
another row. So one color in use already gives two rows (24 swatches,
23 of them hidden), and the rows are added before they are needed.

Why it's unclear: the intent was probably "a new row when this one is
full", but the hidden swatches don't show.

Kept. src/app/color/color-chooser.ts `_updateUsedPalette`, as before.
Covered by the ui/color/palette-used scenarios (DOM snapshot).

## Q-298 The texture tile box is disabled with the slider

Old location: designer.browser.dev.js module 1150 (`_updatePattern`, texture branch).

What it does: `find('[data-property="texture_tile"]').gInputSlider("disabled", ...)`
matches both the tile slider and its text box; the plugin method sets
the `disabled` attribute on the whole set, so the box is disabled too
when the scale mode isn't Tile.

Why it's unclear: it matches what users would expect, but only by
accident of the selector.

Kept. src/app/color/color-chooser.ts `_updatePattern` sets the attribute
on both elements.

## Q-299 A press on the slider track moves the thumb twice

Old location: designer.browser.dev.js module 857 (`$.fn.gInputSlider` init).

What it does: the track and the slider element (its parent) both have a
mousedown handler that moves the thumb to the pointer, so one press on
the track fires two "input" events with the same value. Each slider also
adds a window mousemove and mouseup handler that is never removed.

Why it's unclear: no visible effect besides the doubled event.

Kept. src/app/color/opacity-slider.ts; pinned by "fires input while
dragging and change on mouse up, reading the pointer" in
opacity-slider.test.ts.

<!-- Layers and pages (phase 6 review and phase 7) -->

## Q-300 New page marks the pages header open without showing the list

Old location: designer.browser.dev.js module 1260 (GOutlineSidebar.init, the create-page button).

What it does: after inserting a page, the button calls
`gAccordion("toggleOpen", true)` on the pages toolbar and then
`gAccordion("init", $(pagePanel))`. toggleOpen only switches the header's
classes to `expanded` and the arrow to down. The init call is meant to
show the list again, but the element after the toolbar is the
`.pages-container`, not the `.pages` list it is given, so it finds nothing
and shows nothing.

Why it's unclear: with the pages section folded, a new page leaves the
header looking open (arrow down) while the list stays hidden. It looks
like the button was meant to unfold the section.

Kept. outline-sidebar.ts (create-page button) only calls
toggleAccordionOpen; the comment there points here.

## Q-301 Dragging several layer rows leaves the last name on the row

Old location: designer.browser.dev.js module 1706 (row renderer, the
title group's dragstart handler); module 1717 does it right for pages.

What it does: while a drag starts, the row's title shows the names of all
dragged nodes joined with ", ". A timer then puts back the name held in
the loop variable, which by then is the name of the last dragged node,
not the row's own name. The pages panel restores the row's own name.

Why it's unclear: with several selected layers dragged from a row that
isn't the last of them, that row shows another layer's name until the
list renders again (which a drop or any change does right away).

Kept. layers-panel.ts restores the loop's last name (comment in the
dragstart handler).

## Q-302 Alt-drag in the layers panel selects the originals

Old location: designer.browser.dev.js module 1260 (GOutlineSidebar._moveLayers).

What it does: with Alt held, a moved node that has the Store mixin is
cloned and the clone inserted at the drop place, the original stays.
Afterwards the selection is set to the nodes that were dragged, i.e. the
originals, not the copies.

Why it's unclear: after duplicating by Alt-drag, the copies are where the
user dropped them but the originals are selected. The separate duplicate
path (`_duplicateLayerTreeNodeCallback`) selects the copies.

Kept. outline-sidebar.ts `_moveLayers` (comment before updateSelection).

## Q-303 Duplicating rows doesn't block the panel's own handlers

Old location: designer.browser.dev.js module 1260 (GOutlineSidebar._duplicateLayerTreeNodeCallback).

What it does: the move callbacks call `gLayerPanel("blockHandlers", true)`
before changing the scene so the panel doesn't add rows for its own
inserts, and false afterwards. The duplicate callback calls it with
false only, at the start.

Why it's unclear: probably meant true/false like the others; as it is the
panel adds the copies' rows through its insert handler, which also works.

Kept. outline-sidebar.ts `_duplicateLayerTreeNodeCallback` (comment).

## Q-304 Drop tests never collect the accepted nodes

Old location: designer.browser.dev.js modules 1706 and 1717 (the default canDropCallback of the layers and pages panels).

What it does: the test is meant to add the index of every accepted node
to the output list (`o.push(l)`), but the code reads `o.push[l]`, a
property lookup that does nothing. The tree then falls back to all
dragged nodes, which is the same set whenever the test passes.

Why it's unclear: harmless today; looks like a typo.

Kept. layers-panel.ts `_canDrop`, pages-panel.ts `_canDrop` (comments).

## Q-305 The layers and pages lists keep their row height as a string

Old location: designer.browser.dev.js module 1260 (GOutlineSidebar._touchInterfaceUpdate) and module 451 (GVirtualTree.resetRowHeight).

What it does: on boot and on every touch switch the sidebar sets the row
height of both lists to "34" or "48", strings, which the tree stores as
they are. Every use multiplies or subtracts it, so the arithmetic works,
and it overrides the height measured from the stylesheet.

Why it's unclear: looks accidental, but a number would behave the same
in every use the tree has.

Kept. virtual-tree.ts `resetRowHeight`, pinned by "keeps a row height set
as a string" in virtual-tree.test.ts.

## Q-306 Layer rows scroll into view on the next tick, not after 50 ms

Old location: designer.browser.dev.js module 451 (GVirtualTree.expandAndFocus).

What it does: the scroll to the focused row runs in
`setTimeout(fn.bind(this, 50))`: the 50 is bound as an argument of the
callback instead of being the delay, so the scroll runs on the next tick.

Why it's unclear: the 50 ms delay was clearly intended; the visible
difference is small.

Kept. virtual-tree.ts `expandAndFocus` (comment).

<!-- Document panels, library, export (phase 6 review and phase 7) -->

## Q-307 Page presets excluded for templates

Old location: designer.browser.dev.js module 1339 (GPageProperties: `_excludedPresets = [u.TYPE.MERCH]` and updatePropertiesAvailability).

What it does: the page panel disables the preset select of a document made from a template when the selected preset's id is in `_excludedPresets`. That list holds `TYPE.MERCH`, which the preset table (module 1153) no longer has, so the list is `[undefined]`. Options without a preset id (Infinite Canvas, or no matching option) then count as excluded: for a template document on an infinite or custom-size page the preset select is disabled and gets no "can't be changed" tooltip.

Why it's unclear: the merch presets went with the Corel marketplace. The rule now hits the wrong options, but it may also be meant to keep template sizes fixed.

Kept. src/app/inspector/page-properties.ts (`_excludedPresets`, updatePropertiesAvailability).

## Q-308 Second window of a document stops the page clip sync

Old location: designer.browser.dev.js module 1339 (GPageProperties._windowEvent).

What it does: on window activation the panel adds its page-activation and page-size listeners to the active document's scene, then removes them from the scene of the previously active window. When both windows show the same document (View > New Window), that is the same scene, so the remove takes away the listeners it just added. From then on page activation and page size changes no longer switch the clip (Output/Full) paint mode until a window of another document is activated.

Why it's unclear: it looks like an ordering slip, but it only matters with two windows of one document.

Kept. src/app/inspector/page-properties.ts `_windowEvent` (comment "Sic").

## Q-309 Page size button tooltips never attach

Old location: designer.browser.dev.js module 1339 (GPageProperties.init).

What it does: init attaches rich tooltips to the parents of the rotate, trim, clip content and bleed fields, but those rows are built by `_updateUI` at the end of init (and again on every update), so the lookups find nothing. The buttons only have their plain `data-title` tooltips.

Why it's unclear: the tooltip texts exist in the string table, so they were meant to show.

Kept. src/app/inspector/page-properties.ts init (`buttonTip` runs before `_updateUI`, as before); the ui/inspector DOM snapshots show no rich tooltip markup either way.

## Q-310 Slice background preview writes a custom property

Old location: designer.browser.dev.js module 1272 (GSliceProperties._assignProperties).

What it does: while the color chooser of a slice's background is dragged (temporary changes), the panel calls `setProperties(names, values, true)`. The third argument is `custom`, not `temporary`, so the preview goes into the custom property `@cls` and the slice doesn't show the color until the chooser commits.

Why it's unclear: probably meant as the temporary flag, but the committed value is right.

Kept. src/app/inspector/slice-properties.ts `_assignProperties`, pinned by document-panels.test.ts ("writes temporary changes to the custom property").

## Q-311 Symbol panel adds a settings listener on every update

Old location: designer.browser.dev.js module 1658 (GSymbolProperties.update).

What it does: with a document, update adds its SettingChangedEvent listener before it checks the selection, but removes it only when it showed instances the last time. Every update that ends without instances leaves one more listener, so a later touch-mode switch runs `_updateUI` many times (it only mounts or unmounts checkbox sliders, of which the panel has none).

Why it's unclear: harmless, but it grows with every selection change.

Kept. src/app/inspector/symbol-properties.ts update.

## Q-312 Typing a non-number into the isometric grid angles

Old location: designer.browser.dev.js module 1659 (GSceneProperties, the ga1/ga2 change handler).

What it does: the handler parses the box with `parseFloat` and checks `null !== t && "number" == typeof t`, which NaN passes. Typing text that isn't a number stores NaN as the grid angle.

Why it's unclear: the check was meant to reject bad input, like the other fields' `_updateProperties()` fallback.

Kept. src/app/inspector/scene-properties.ts (comment "Sic: parseFloat never gives null").

## Q-313 Export dialog never closes its color chooser

Old location: designer.browser.dev.js module 1513, init (the chooseropen/chooserclose handlers of .export-background-pattern-chooser) and close().

What it does: the handlers are plain functions, so `this._chooserElem = $(this)` writes to the chooser element, not the dialog. The dialog's `_chooserElem` stays null, and close() never closes an open color chooser.

Why it's unclear: it looks like a missing bind, but nothing visible breaks in the recorded flows.

Kept. src/app/export/export-dialog.ts: the listeners do nothing and close() only closes a chooser when `_chooserElem` is set, which never happens.

## Q-314 Export dialog has no output format in Assets mode

Old location: designer.browser.dev.js module 1513, `_getFormat`.

What it does: the "assets → zip" branch sits inside `if (this._hasFormat())`, which is false in Assets mode. So `_getFormat()` returns null there, and the storage destination list is always empty for assets.

Why it's unclear: it only matters with more than one storage destination, which the browser container doesn't have.

Kept. src/app/export/export-dialog.ts `_getFormat`, pinned by export-dialog.test.ts ("names the output format").

## Q-315 Export dialog's settings options object is mutated

Old location: designer.browser.dev.js module 1513, init (`Object.assign(a, {pro: true, ...})` for layer-as-id and preserve-editing).

What it does: the shared options object is changed in place, so the later "do-not-downsample-images" row also gets the Pro badge.

Why it's unclear: it only decided where Pro badges went; the licence is gone.

Kept as a no-op (badges dropped). It explains the `.pro` markup in parity/expected/ui/dialog/export-pdf-advanced.dom.json, which needs a DROP exception.

## Q-316 The export dialog remembers settings by reference

Old location: designer.browser.dev.js module 1513, constructor and `_export` (`f = this._settings`).

What it does: a dialog without options stores its settings object after an export. The next dialog copies it shallowly, so they share the same `configuration` object. Toggling "With effects" in a later dialog changes the remembered value even if that dialog is cancelled.

Why it's unclear: probably unintended, but not visibly wrong in the recorded flows.

Kept. src/app/export/export-dialog.ts (rememberedSettings), covered by import-export/ui/dialog-remembers-settings.

## Q-317 The library panel can't load assets any more

Old location: designer.browser.dev.js modules 1662 (GLibrarySidebar) and 1663 (library panel, `_doLoadAssets`/`_addAsset`).

What it does: the Libraries sidebar shows the category tiles and a search box, but every asset list came from the cloud marketplace (gApi.listMarket) and Unsplash (gApi.searchUnsplashPhotos, getUnsplashPhotos, getUnsplashPhotoUrl). In the old local app those calls fail at once (no API object), so a category or a search opens an empty box. The sidebar was enabled only while the cloud API was configured (isOnline) and showed an offline overlay without network.

Why it's unclear: the sidebar is now a shell with nothing to insert. Removing it changes the left sidebar tabs every UI scenario records; keeping it shows a feature that can't work. A local asset source could fill it later.

Kept. src/app/sidebars/library-sidebar.ts is always enabled and never offline; library-panel.ts keeps the layout, search and category code, and its market calls fail like the old ones (marketApi()). The asset tiles, drag and insert code is ported except the Unsplash photo download. Pinned by ui/library/category-open, ui/library/search-typed, ui/shell/left-libraries and library-panel.test.ts.

## Q-318 Library categories still point at the old asset CDN

Old location: chunk.vendor.js module 832 (config ELEMENTS), used by designer.browser.dev.js module 1664.

What it does: each category tile's icon is an `<img>` with a URL on dkqeh8b5t3gxm.cloudfront.net. In the parity runs the host doesn't resolve, so the icons show as broken images in both apps. Unsplash Photos is listed because ENABLE_UNSPLASH_INTEGRATION was true.

Why it's unclear: the new app makes requests to a third-party CDN that no longer serves anything useful, and the DOM snapshots record those URLs. Local icons would change the recordings.

Kept. src/app/sidebars/library-elements.ts holds the table byte for byte, Unsplash included. Pinned by the ui/library/* and ui/shell/left-libraries DOM snapshots and library-panel.test.ts.

<!-- Touch UI and font panels (phase 6 review and phase 7) -->

## Q-319 The assistant bar stores its right side as "left-side"

Old location: designer.browser.dev.js module 1587 (the assistant bar's init).

What it does: the arrow keys sit on the bar's right side, which folds
away. Its state is stored under `designer.assistant-bar.left-side.expanded`
and restored from there when the bar is built.

Why it's unclear: the key names the other side. Renaming it would lose
the state users already have stored.

Kept. src/app/touch/virtual-key-bar.ts (EXPANDED_PROPERTY); pinned in
touch.test.ts ("stores the arrow side's state and restores it") and by
ui/touch/assistant-toggle-state.

## Q-320 A tap on a virtual key sends keyup twice

Old location: designer.browser.dev.js module 1587 (the virtual key's mouseup and click handlers).

What it does: mousedown sends keydown, then both the wrapper's mouseup
and the button's click send keyup (and release the modifier) for the
same key, so the view gets keydown, keyup, keyup.

Why it's unclear: one release per press looks intended; the second
keyup does nothing visible since the key is already up.

Kept. src/app/touch/virtual-key-bar.ts (`release` from both handlers);
pinned by ui/touch/virtual-keys.

## Q-321 Both touch sidebars fall back to the right sidebar's width

Old location: designer.browser.dev.js module 1540 (GSidebars._setDefaultRightSidebarWidthForTouch).

What it does: when a touch toolbar update finds no active touch tool,
it sets the side's width to 300px, on the left sidebars as well as the
right ones, although the value and method are named for the right side.

Why it's unclear: probably written for the right side only; the left
side's width doesn't show in the touch layout until a tool opens, which
sets the width again.

Kept. src/app/touch/touch-toolbar.ts (DEFAULT_WIDTH_FOR_TOUCH); pinned in
touch.test.ts ("puts a button per tool first, ...").

## Q-322 The touch menu's action buttons have no label from the action

Old location: designer.browser.dev.js module 1563 (GContextMenu._createActionButton).

What it does: for a button backed by an action it computes the label
from the action's title when none was given, but then only adds a label
when the caller passed one, so the computed title is never shown.

Why it's unclear: looks like the label was meant to fall back to the
title. The icon-only buttons (flip, rotate, clip, ...) are what the old
app showed.

Kept. src/app/touch/touch-context-menu.ts `_createActionButton`; pinned by
ui/touch/context-menu.dom.

## Q-323 Enter in the font list picks the font once per loaded page

Old location: designer.browser.dev.js module 1701, function `l` (the row builder).

What it does: every time a batch of rows is added (the first list and
each page loaded while scrolling or selecting), it binds another keydown
handler on the panel. The font button's Enter triggers keydown on every
`.g-fonts-panel`, so the hovered font is picked, and assignFontCallback
runs, once per batch added since the panel was made.

Why it's unclear: looks like a handler meant to be bound once; picking
the same family repeatedly has no visible effect except repeated
property writes.

Kept. src/app/fonts/fonts-panel.ts `_append` adds a handler per batch.

## Q-324 The web fonts tab adds a missing system fonts provider

Old location: designer.browser.dev.js module 1700, the tab click handler in `g`.

What it does: outside the desktop runtimes it reads
`gContainer.getSystemFontsProvider()` and pushes it to the providers to
disable only when it is falsy (`d || c.push(d)`), so it either pushes
nothing or a null that would make disableProviders throw. The browser
container always returned the native fonts module, so nothing was ever
pushed.

Why it's unclear: the condition looks inverted; the intent was probably
to disable the system provider when there is one.

Kept as the browser behaved: src/app/fonts/fonts-button.ts pushes nothing
there (the new browser container has no system fonts provider, so the
literal code would throw). Pinned by fonts-button.test.ts ("builds the
tabs...": only the imported and local providers are disabled).

## Q-325 The weights of a family the font cache doesn't have throw

Old location: designer.browser.dev.js module 1701, `weightsForFont`.

What it does: reads `isLocalFont` from the cache lookup before checking
that the lookup found anything, so for an unknown family the promise
rejects with a TypeError instead of answering null like the other
lookups.

Why it's unclear: the null check right after shows null was expected;
the text panel awaits the result.

Kept. src/app/fonts/fonts-panel.ts `weightsForFont`; pinned in
fonts-panel.test.ts ("reads names, styles and weights from the cache").

## Q-326 Weights of the family itself count twice with `exact`

Old location: designer.browser.dev.js module 1701, `weightsForFont`.

What it does: with the third argument set, a font whose own family
equals the asked family pushes its weight twice (once for the match,
once unconditionally).

Why it's unclear: probably meant `else`; the text panel dedupes with
GUtil.unique, so it doesn't show.

Kept. src/app/fonts/fonts-panel.ts; pinned in fonts-panel.test.ts.

## Q-327 Google font previews refetch every later batch

Old location: designer.browser.dev.js module 1379, addPreviews.

What it does: a batch file (ten families) is fetched only from the first
batch whose first family has no cached preview; the flag is never
reset, so every later batch in the same call is fetched again even when
cached. A family missing from the list stops the call with a console
warning.

Why it's unclear: looks like a per-batch check written with a shared
flag.

Kept. src/app/fonts/web-fonts-provider.ts addPreviews; pinned in
previews.test.ts.

<!-- App integration (phase 7) -->

## Q-328 The settings are written once at startup

Old location: designer.browser.dev.js module 1325 (GReminderManager.start and checkReminders), started by the bootstrap (module 1483) after the screen size check.

What it does: with the always-pro licence of this build, checkReminders ended in `reset("proExpired")` and `reset("proExpireToday")`, which call `gDesigner.setSetting(key, undefined)`. The keys didn't exist, so setSetting counted that as a change and wrote the whole settings object, defaults included, to localStorage ("designer.settings"). That is the only write at startup; GDesigner.start itself writes nothing.

Why it's unclear: the reminder manager is dropped with the licence, but the write it caused is visible (platform scenarios wait for it, corpus/view/*-state read eps_outline_fonts from storage). Keeping the two reminder keys would add two undefined settings and two SettingChangedEvents nobody listens to.

Kept, without the reminder keys: boot calls Designer.writeSettings() at the point where the reminder manager started (src/app/shell/bootstrap.ts). Pinned by corpus/view/outline-view-state and corpus/view/fast-view-state (app-designer-main.json) and platform/storage's waitForStartupWrites.

## Q-329 Boot waits for the CMYK profile

Old location: designer.browser.dev.js module 1491 (GDesigner.init), `GColor.setCMYKProfile("USWebCoatedSWOPv2", "assets/data/icc/")`.

What it does: init starts loading the profile and nobody waits for it. CMYK colours convert with the naive formula until it has arrived, with the profile after.

Why it's unclear: whether a CMYK colour right after start uses the profile depends on load timing (engine-model/colors/gradients raced under load).

Changed in timing only: Designer.init keeps the call (loadsCmykProfile, set by boot) and boot resolves after the request finished (Designer.whenCmykProfileLoaded). No second request.

<!-- Removed features (phase 7 review, phase 8, brand) -->

## Q-330 The empty persona section in the header

Old location: designer.browser.dev.js module 1500 (GHeader.init) and
module 1502 (the persona bar).

What it does: the header has `.section.persona` with the persona bar in
it. The stylesheet gives `#header > .section.persona` flex-grow, so the
section pushes the document tabs to the right end of the header.

Why it's unclear: the section is named after the removed persona bar, but
it is also the header's only spacer, and no app CSS may be added.

Kept. src/app/menus/header.ts keeps the empty section (header.test.ts
checks it has no children); the persona bar inside it is gone
(REMOVED.md DROP-003).

## Q-331 The old app variant for the comments sidebar

Old location: designer.browser.dev.js module 10 (the app config),
`HAS_ANNOTATIONS`.

What it does: the switch registers the annotations sidebar and turns on
the commenting code. With it off the old app has no comments tab row, so
its inspector sits where the new app's does.

Why it's unclear: removing the 32 px tab row moves the inspector, and
round borders and circles then antialias differently, so a shifted old
shot is not pixel-equal to the new one. Checking those shots needed a
reference the old app renders itself.

Kept as a harness feature: parity/support/old-variants.ts serves the old
bundle with the switch off, and suite.ts runs "old app variants" tests
that require it to produce DROP-006's `.fixed` files. The switch also
leaves the annotations layer out of new documents, which the new app
still creates, so the variant is used only for scenarios that don't
record a document.

## Q-332 Licence cookies in ui/storage/after-startup

Old location: designer.browser.dev.js module 1483 (the bootstrap): the
`_gcoupon`, `_gdesignerv`, `_gdt` and `_ginst` cookies, and the
`last_update_check` and `old_version` localStorage keys.

What it does: the old app writes these at startup.

Why it's unclear: the cookies belong to the dropped licence and
analytics, but the two keys belong to the software update check, which
phase 8 ports. The scenario mixes both, so it isn't a DROP case yet.

Not changed. Once the update check is ported, the cookies can get a DROP
entry (rule: drop the four cookie names).

<!-- Platform (phase 7 review, phase 8, brand) -->

## Q-333 User guide videos served as application/mp4

Old location: server.js `express.static(path.join(__dirname, "docs"))`; the
content type comes from the mime-types 2 table bundled with the old
Express.

What it does: /docs/images/*.mp4 (the guide's videos) are served with
`Content-Type: application/mp4`. The mime table of the current Express
says `video/mp4`, which is the usual type for a video file.

Why it's unclear: it is a quirk of an old dependency, not of the app.
Browsers play the videos either way.

Kept. server/app.ts sets application/mp4 for .mp4 under /docs; pinned by
platform/docs/routing and the "serves the guide's videos as
application/mp4" test in server/app.test.ts.

## Q-334 First start takes the newest old session's settings

Old location: electron-main.js of the released desktop builds 1.0.0 and
1.0 (`listen(0)`), fixed later by #6 (port 47823).

What it does: the released old desktop app got a new random port, and so a
new, empty storage origin, on every launch. Its profile holds one set of
localStorage and IndexedDB data per launch. The new app's first start
(electron/migration.ts, src/app/migration/plan.ts) takes each kept
localStorage key (settings, swatches and the other LocalStorageKeys) from
the newest old origin that has it, and every imported font from every old
origin, extending the font list. Builds from the repo since #6 already used
port 47823, so their data carries over without any copying; then only
fonts from older random-port origins are added.

Why it's unclear: the user never saw the older sessions' data again in the
old app, so "take over" could mean only the last session (what users last
saw) or everything ever stored. Settings and swatches come from the last
session that had them; fonts come from all sessions, because an imported
font is something the user chose to keep.

Kept as described. Pinned by src/app/migration/plan.test.ts and the "new
desktop app: first start after the released old app" test in
parity/scenarios/electron/desktop.spec.ts (a real profile of release 1.0,
src/app/migration/fixtures/old-release-profile).

## Q-335 No recent files to take over from the old desktop app

Old location: designer.browser.dev.js GDesigner.addToRecentFiles (module
1491) and electron-main.js.

What it does: the old desktop app reported the browser runtime, so
addToRecentFiles did nothing for local files, and its main process kept no
list either (no app.addRecentDocument, no file of its own). File > Open
Recent always says "No Recent Files" (parity electron/app-menu,
platform/files/recent-files).

Why it's unclear: the user asked for the recent files list to be taken
over, but the old desktop app never had one.

Kept: nothing to migrate. If the new app should keep a recent files list in
the desktop app, that is a new feature.

## Q-336 Desktop updates on the portable exe and on macOS

Old location: none (the old desktop app had no updater).

What it does: electron/updater.ts drives electron-updater against the
GitHub releases of GravitDesign/designer. electron-updater updates the
NSIS install, the AppImage and the deb. It can't replace the portable exe,
so the portable build answers a check with an error message. On macOS it
needs a signed app and a zip artifact, which the dmg-only, unsigned build
doesn't have, so checks fail there with electron-updater's error.

Why it's unclear: the targets are the old ones (dmg only, no signing), and
adding a mac zip target or signing changes the release.

Kept the old targets. Adding `{ "target": "zip", "arch": ["x64", "arm64"] }`
to mac.target and a signing identity would make mac updates work.

<!-- Shell, documents, actions (phase 7 review) (phase 7 review, phase 8, brand) -->

## Q-337 The annotation tools go with the comments sidebar

Old location: designer.browser.dev.js, the annotations sidebar (bootstrap
module 1483, `HAS_ANNOTATIONS`) and its toolbar, which held the
annotation tools (rectangle, ellipse, arrow, pencil, highlighter, comment
note).

What it does: the comments sidebar was the only way into the review mode
and its tools; they are not in the tool table, the toolbar or the
shortcuts.

Why it's unclear: the removed-features pass dropped the sidebar (DROP-006)
but left open whether the tools go with it (see "The annotation tools and
their scenarios" in questions-draft-RF.md, which this entry answers).

Decided by the user (2026-10-24): the tools go with the sidebar. Documents
with annotations still load, render and save. REMOVED.md DROP-009; the 26
editor-tools/annotations/* scenarios of the review mode run
`removedInNewApp` checks (parity/scenarios/editor-tools/annot.spec.ts:
no sidebar tab, annotations toolbar, tool icon or comments row, no
annotation action, no letter or digit key that activates an annotation
tool). The tool table has no annotation tool (bootstrap.test.ts) and
canActivateTool blocks nothing.

## Q-338 Opening a file without an extension throws

Old location: designer.browser.dev.js module 1491
(GDesigner._processOpenDocument), `e.ext.toUpperCase() === n.toUpperCase()`
with `n = item.getExtension()`.

What it does: for a file whose name has no extension ("README"),
getExtension() is null and the lookup of the image formats throws a
TypeError out of openDocument. Nothing is opened and no message is shown.
A file with an unknown extension gets text.unsupported-file-extension.

Why it's unclear: it is a crash; the message for unknown extensions is
clearly what was meant. BUGS-FIXED candidate.

Kept. src/app/shell/designer.ts _processOpenDocument; pinned by "throws
for a file without an extension, as the old app did" in
src/app/shell/designer.test.ts.

## Q-339 Which browsers get the unsupported-browser notice

Old location: designer.browser.dev.js module 1483 (the bootstrap, lines
119293-119322) and module 1491 (_initBrowserSupported, isBrowserSupported,
the call in init).

What it does: the bootstrap sets the supported lists by the build flag
isCorel (module 803). That flag is false in this build, so the lists are
Chrome, Firefox, Safari and Edge on the desktop, and Chrome on Android
(GSystem Unix) and Safari on iOS on tablets. Any other browser, and every
phone, gets a one-time notice.

Why it's unclear: the phase 7 review read the Corel branch (no desktop
Safari). The other branch is the one this build runs.

Kept as the old build ran it: SUPPORTED_BROWSERS and
SUPPORTED_TABLET_BROWSERS in src/app/shell/bootstrap.ts; pinned by the
"unsupported-browser notice" tests in src/app/shell/designer.test.ts.

## Q-340 The old bundle files in the platform/server scenarios

Old location: public/index.html and the old build's files next to it
(jquery.js, chunk.vendor.js, designer.browser.js, designer.browser.dev.js,
the workers, cacher.js, service-worker.js, static.css, proxy.html).

What it does: platform/server/static-files and index-references record
how the old server serves those files and that index.html loads them.

Why it's unclear: the Vite build has its own hashed bundles under
/bundle, so the old names can't match; serving copies of the old build
would only hide that.

Decided closest to the old behaviour: the files the new build still has
under the old names (the pages, both theme stylesheets, the favicon, the
manifest, the 512 px icon, the icon font) must answer exactly as before,
every other old file must answer 404, and the new index.html must load
only files that exist, none of them an old bundle file, with the old
stylesheet and manifest links kept. REMOVED.md DROP-011; the two
scenarios run `removedInNewApp` checks (parity/scenarios/platform/server.spec.ts).

## Q-341 The online probe at start

Old location: designer.browser.dev.js module 1483, `const co =
gDesigner.isOfflineAsync()` (line 119250), read only at line 120172 by
the Electron start to open the sign-in.

What it does: one `HEAD /connection/test` while the app starts
(platform/server/online-probe).

Why it's unclear: the probe looks like part of the online detection, but
its result fed only the dropped sign-in. The rest of the online detection
(font providers retried when the network comes back, R7-B-031) works on
the window online and offline events and sends no probe.

Decided: the probe is dropped with the sign-in. REMOVED.md DROP-012; the
scenario checks that the new app sends no probe at start (`removedInNewApp`).
The /connection/test route stays (platform/server/connection-test).

## Q-342 An import error shows an empty message dialog

Old location: designer.browser.dev.js module 163 (GDocument's PDF, EPS,
SVG and Sketch import callbacks, `new GMessageDialog(e).open()`) and
module 219 (GMessageDialog, `$("<span/>").html(e)`).

What it does: when an importer reports an error object (a broken PDF
gives pdf.js's InvalidPDFException), the message dialog gets that object.
jQuery's .html() shows nothing for a value that is neither a string nor a
node, so the dialog has only its OK button.

Why it's unclear: the dialog was meant to say what went wrong; an empty
dialog looks broken. BUGS-FIXED candidate.

Kept. src/app/document/document-host.ts documentDialogs().message passes
"" for a non-string; pinned by import-export/import/open/pdf-broken.pdf.state
and src/app/document/document-host.test.ts.

<!-- Menus, widgets, dialogs, fonts (phase 7 review) (phase 7 review, phase 8, brand) -->

## Q-343 Menu captions and tab titles are text

Old location: designer.browser.dev.js module 339 (GMenuItem.setCaption, `t.html(...)`, around 14297) and module 1500 (GHeader._addWindowTab and _documentEvent, `.html(e.getTitleWithExtension())`, around 128586 and 128677).

What it does: the old menu item inserted string and locale captions as HTML, and the header set the tab title the same way. A layer or file named `<b>x</b>` or `a&amp;b` showed bold or decoded.

Why it's unclear: the markup came from user data (file and layer names), so this looks accidental, but it is a visible difference.

Changed to text. src/app/menus/menu-item.ts setCaption and src/app/menus/header.ts (_addWindowTab and _documentEvent) use textContent. Pinned by menu.test.ts "shows captions as text and icons as an <i> with the class names".

## Q-344 The touch save menu has two empty rows

Old location: designer.browser.dev.js module 1543 (_createSaveButtonGroup, around 142790-142805).

What it does: the touch toolbar's Save dropdown lists save-as for the default format, then GGravitCloudAction "gravit-cloud.save-as" and GCloudSynchronizationAction "sync". Neither cloud action is registered in the local app, so getAction gives null and createAddItem(null) adds an empty row for each.

Why it's unclear: the empty rows look like a leftover of the cloud build rather than intended UI.

Kept. src/app/toolbar/zoom-menu.ts _createSaveButtonGroup looks up both ids; pinned by zoom-menu.test.ts "gives the save menu the default save as and two empty rows for the cloud actions".

## Q-345 Renaming clears the field before removing it

Old location: designer.browser.dev.js module 1695 (gAutoEdit close, 165985-165988).

What it does: the old close removed the input first, then set input and value to null. Chromium fires blur on a focused input as it is removed, but jQuery's remove() unbinds the handlers before it detaches the node, so the old blur handler never ran then.

Why it's unclear: with native listeners the old order would run a nested submit from that blur (two renames on Enter, and Escape submitting a changed name). Clearing first keeps the old outcome: one rename on Enter, a real cancel on Escape.

Kept. src/app/widgets/auto-edit.ts close() clears the fields before input.remove(); src/app/widgets/auto-edit.test.ts fires blur from remove() and expects one submit on Enter and none on Escape.

## Q-346 Settings rounding box shows NaN for text

Old location: designer.browser.dev.js module 1275 (GSettingsDialog._createDecimalsNum, the change handler).

What it does: the decimals box's change handler parses the typed text with GUtil.parseNumber, clamps it to 0..6 and writes back `null !== t ? formatNumber(t, 0) : "2"`. parseNumber returns NaN, never null, for text, so typing "abc" shows "NaN", and the "2" fallback never runs. Save then skips the NaN and stores null (rounding off) although the switch is on.

Why it's unclear: the fallback suggests "2" was meant for invalid input, but the old code never reaches it.

Kept. src/app/settings/settings-dialog.ts (_decimals onBoxChange); settings.test.ts "clamps the typed rounding to 0..6; text gives NaN as in the old dialog".

## Q-347 Recent file names on the welcome screen are text

Old location: designer.browser.dev.js module 1544 (GNewDocumentDialog recent overlay, `.append(e.getName() + "." + ext)` at 143149).

What it does: the old overlay appended the recent file's name as a string, which jQuery parses as HTML, so a file named `<b>a</b>.gvdesign` showed a bold "a". The new overlay renders the name as text.

Why it's unclear: Q-262 keeps the HTML parsing for the notification panel, so the two places now differ. Text is the safer behaviour for file names, which users control.

Changed: the name is text. src/app/welcome/welcome-screen-view.tsx (RecentDocumentsView).

## Q-348 Go to master in the touch menu selects the instance

Old location: designer.browser.dev.js module 1563, 149153-149212 (the "Go to master" entry of the touch symbol menu).

What it does: it finds the first selected symbol instance that is neither locked nor a master, selects that instance (not its master), runs view.zoom.fit-selection and commits the transaction as "Go to Master".

Why it's unclear: the caption promises to go to the master symbol, but the code only zooms to the instance that is already selected.

Kept. src/app/touch/touch-context-menu.ts _goToMaster; pinned by touch.test.ts "selects the first unlocked instance and zooms to it in one transaction".

## Q-349 Deleting an imported font twice runs both deletes at once

Old location: designer.browser.dev.js module 1118, 67290-67395 (GImportedFontsProvider addPreviews, the trash icon's mouseup).

What it does: after the confirm, the delete is pushed onto the family's _queue and run when the queue has one entry. It is taken off the queue before it runs, so a second confirmed delete also finds one entry and starts at once. Both delete the same files. The second one stops when it can't find the family in the formatted list, so FONT_LIST is written and the manager reset only once.

Why it's unclear: the queue looks meant to run deletes one after the other, but it never waits.

Kept. src/app/fonts/imported-fonts-provider.ts _confirmDelete; pinned by imported-fonts-provider.test.ts "starts a second delete of the family at once, which stops at the missing family".

## Q-350 Font import gives up after about 50 tries

Old location: designer.browser.dev.js module 1245 (GFontDBLoader.import, 80073-80106, and _prompt).

What it does: while another import runs (or the font database isn't open yet), import() tries again every 100 ms. Its counter goes up twice per try, so it calls done and gives up after about 50 tries (5 seconds), not 100. The retries drop the options. Each picked file also sets the batch count back to the number of picked files before its own fonts are counted in.

Why it's unclear: the doubled counter looks like a slip, but nobody sees the difference unless the database takes seconds to open.

Kept. src/app/fonts/font-db-loader.ts import and _prompt; pinned by font-db-loader.test.ts "waits while busy and gives up after about 50 tries".

## Q-351 Closing a document never releases its missing-fonts listener

Old location: designer.browser.dev.js module 255 (releaseDocumentListener, 12262-12265) and module 1505 (GWindow.release, 129165).

What it does: the window's release() called the font manager's releaseDocumentListener with `this._document.sessionId`, a number, but the function read `e.sessionId` from its argument, so it never found the document's DocumentStatusEvent listener. A document closed before it became ready keeps that listener on the font manager.

Why it's unclear: the call shows the listener was meant to go away with the window; it never did.

Kept. The new font manager has no releaseDocumentListener; src/app/shell/window.ts release() still calls it through an optional lookup that finds nothing, and the listeners live in src/app/dialogs/missing-fonts-dialog.ts (listenerFor).

<!-- Inspector, colors, sidebars (phase 7 review) (phase 7 review, phase 8, brand) -->

## Q-352 Touch add-to-swatches adds the current paint

Old location: designer.browser.dev.js module 1657, initContextMenu (159143-159216).

What it does: the touch chooser's long-press menu ("Add to document/global swatches") always clones the current paint. For a color or texture the pressed swatch's pattern is ignored and only its opacity is used. For a gradient, the first stop's color is set to the pressed swatch's whole pattern, which can itself be a gradient or texture. A long press on the hex box always adds the current paint to the document scope, also from "Add to global swatches".

Why it's unclear: the menu reads like "add this swatch", but it adds something else, and the global item on the hex box writes to the document scope.

Kept. next/src/app/color/pattern-chooser.ts initContextMenu; pinned by "TouchPatternChooser long-press menu (kept quirks)" in color-chooser.test.ts.

## Q-353 Advanced texture settings open without the slide

Old location: designer.browser.dev.js 68760 (desktop) and 159346 (touch), jQuery slideToggle() at 400 ms.

What it does: the old chooser slid the advanced texture settings open and shut over 400 ms. The new one switches display between block and none at once.

Why it's unclear: it's a visible animation that was dropped, so whether the snap is acceptable is a product decision.

Kept as accepted (no animation), because the parity screenshots must not depend on animation timing. slideToggle in next/src/app/color/color-chooser.ts, used by both choosers; pinned by "toggles the advanced texture settings with the desktop Advanced button" and "toggles the advanced texture settings and the expand icon" in color-chooser.test.ts.

## Q-354 Copy hint stays in the panel after its fade

Old location: designer.browser.dev.js module 1162 (74092-74110), module 1163 (83312-83334), module 1262 (84874-84896).

What it does: after a mouse-over copy of a border, fill or effect, the "copied" hint fades with `animate({opacity: 0, top: "+=20"}, 500, hint.remove)`. jQuery calls the complete callback with `this` set to the bare element, so jQuery's remove removes nothing. The span stays in the panel at opacity 0, 20 px lower, position absolute and z-index 999, until the next copy replaces it.

Why it's unclear: the code clearly meant to remove the hint, and the invisible span catches clicks over that part of the panel.

Kept. paint-dom.ts fadeCopyHint (swing easing, 500 ms), used by border-, fill- and effect-properties.ts; pinned by the "fades the hint out ... leaves it in the panel" tests in border-properties.test.ts, fill-properties.test.ts and effect-properties-rows.test.ts. BUGS-FIXED candidate.

## Q-355 Copy hint throws without a selected row

Old location: designer.browser.dev.js module 1162 (74092-74096), module 1163 (83314-83318), module 1262 (84877-84881).

What it does: the border and fill hints read `find(".x-block.g-selected").position().top`. With no selected row, position() returns undefined and reading top throws, so no hint shows and the copy action stops after the copy. The effects hint does the same when the event target is outside an effect row; without an event it goes to top 0.

Why it's unclear: it only happens with a stale active Border or Fill style, and it is an uncaught error in the copy path.

Kept. border-properties.ts and fill-properties.ts _showCopyInfo, effect-properties.ts mouseenter callback; pinned by the "throws without a selected row" tests in border-properties.test.ts and fill-properties.test.ts, and "throws for an event outside an effect row" in effect-properties-rows.test.ts. BUGS-FIXED candidate.

## Q-356 WebGL effect sliders commit on every move

Old location: designer.browser.dev.js module 1262, number rows of the WebGL form (85328-85390).

What it does: the slider's input handler assigns `shp` as a temporary change, then sets the row's unit box and triggers change. The box handler compares with the committed `shp` and commits a transaction, so every slider input event adds an undo step. The recolour hue slider also redraws the saturation slider twice per move (once from the slider, once from the box).

Why it's unclear: the temporary assign suggests a single commit on release was intended.

Kept. effect-forms.ts webGLForm; pinned by "transforms a slider value with the effect's transform, to three decimals" and "recolours the recolour effect's saturation slider" in effect-properties-rows.test.ts. BUGS-FIXED candidate.

## Q-357 Unknown language tag stops the text panel update

Old location: designer.browser.dev.js module 1273, GTextProperties._updateLanguageSelector (93378-93407).

What it does: each language system tag of the font is named through GLocale.get("GBCP47LanguageTags", "text.lang." + bcp47). A tag without a BCP 47 code gives "text.lang.null", which has no string, so the name is undefined. The names are sorted with `e.name.localeCompare(t.name)`: when the undefined name is the left side of a comparison this throws, the select keeps only "Default" (enabled), and _updateProperties ends before _updateStylisticSetSelector, so the stylistic set select keeps its previous state. When the undefined name only ever sits on the right, it compares as "undefined" and the option gets an empty label.

Why it's unclear: it looks like a missing fallback (the raw tag would be a natural label), and whether it throws depends on the tag order.

Kept. text-properties.ts _updateLanguageSelector looks the name up with Locale.get and sorts with the same comparison; text-properties-panel.test.ts "the language select" pins both orders. BUGS-FIXED candidate.

## Q-358 Line height unit switch writes NaN for text in the box

Old location: designer.browser.dev.js module 1273, the `_plh_unit` click handler (91560-91624).

What it does: from "%", the box is read with GUtil.parseNumber, which gives NaN (never null) for text that isn't a number. The `null !== r` check passes, the label switches to the document unit, and since NaN is a number every text gets the line height "NaN" in a "Modify Text Properties" step. From a length, text in the box is kept as a string and only the label flips.

Why it's unclear: the null check suggests invalid input was meant to be ignored.

Kept. text-properties.ts _createLineHeightField; text-properties-panel.test.ts "writes NaN for a percentage box that isn't a number (old bug)". BUGS-FIXED candidate.

## Q-359 Paragraph spacing unit switch turns text into 0

Old location: designer.browser.dev.js module 1273, the `_pas_unit` click handler (91750-91801).

What it does: from a length, a box that GLength.parseEquation can't read leaves the value null. `!isNaN(null)` is true, so the spacing is recomputed from null and set to 0 % in a "Modify Text Properties" step. From "%", parseNumber gives NaN and nothing is written; in both directions the label flips.

Why it's unclear: the isNaN check reads as "ignore invalid input", but null slips through.

Kept. text-properties.ts _createParagraphSpacingField; text-properties-panel.test.ts "ignores text in a percentage box but sets 0 for text in a length box (old quirk)".

## Q-360 Transform panel Enter turns negative moves into 0

Old location: designer.browser.dev.js module 1660 (GTransformProperties._updateDisplayValues, 161317-161338).

What it does: Enter in the move x or y box, or a decimals_num setting change, reformats both boxes with `isNaN(t) || t <= 0 || !t ? 0 : t`. A typed -10 becomes 0, so a left or up move only works when the user clicks Apply without pressing Enter first.

Why it's unclear: moves are offsets and negative ones are valid; the check looks copied from the scale or copies boxes, which must be positive.

Kept. src/app/inspector/transform-properties.ts _updateDisplayValues; pinned by "formats the move boxes on Enter and turns negative values into 0" in transform-properties.test.ts. BUGS-FIXED candidate.

## Q-361 Frame and item panels add listeners on every update

Old location: designer.browser.dev.js modules 1654 (GFrameProperties.update, _updateUI, 158605-158642) and 1656 (GItemProperties.update, _updateUI, 158924-158966). Same pattern as Q-311 (module 1658); this extends Q-311 to these two modules.

What it does: with a document, update adds its SettingChangedEvent listener before it checks the elements, and removes it only when the last update showed the panel. Every update without layers (frame) or without an item with item children (item) leaves one more listener. In touch mode each update also calls _updateUI, which mounts the checkbox slider again on frm, clk and scc, and every mount adds another change listener to the checkbox.

Why it's unclear: harmless (the handlers are idempotent), but the listener counts grow with every selection change.

Kept. src/app/inspector/frame-properties.ts and item-properties.ts update; pinned by "adds a settings listener on every update with a document (Q-311)" and "mounts the checkbox slider again on every touch update (Q-311)" in inspector-frame-item.test.ts.

## Q-362 Align panel's gap check is hidden by the box's minimum

Old location: designer.browser.dev.js module 1274 (GAlignProperties._spaceEvent, 93907-93925).

What it does: the spacing boxes are input boxes with minValue 1, and reading the value clamps it. A typed "0" or "-5" reads as 1 and distributes with a gap of 1; only text that isn't a number reads as 0, which the panel's `distance > 0` check skips. The box then shows 1.

Why it's unclear: the `> 0` check suggests small gaps were meant to be rejected, not clamped.

Kept. src/app/inspector/align-properties.ts; pinned by "reads a typed gap below 1 as 1 (the box's minValue), skips text and shows 1" in inspector-frame-item.test.ts.

## Q-363 Ellipse angle boxes read unparsable text as 0

Old location: designer.browser.dev.js module 1265 (GEllipseProperties, the sa/ea change handler, about 87482-87527) with module 1702 (gInputBox value()).

What it does: the angle handler reads the box through gInputBox("value"), which turns text that isn't a number into "0" before the handler parses it. Typing "abc" into Start or End angle therefore stores 0 degrees (2π) and shows "0"; the handler's else branch (_updateProperties, which would restore the old value) never runs for typed input. The rectangle and polygon corner radius boxes read the box the same way and also have minValue 0, so a negative radius becomes 0 instead of being rejected.

Why it's unclear: the handler clearly meant to reject bad input and restore the box, but the box normalises first, so the user's angle is replaced by 0.

Kept. ellipse-properties.ts keeps the handler as is; pinned by "writes a typed angle; unparsable text counts as 0 degrees" in ellipse-properties.test.ts.

## Q-364 Color Thief leaves its canvas in body when sampling throws

Old location: designer.browser.dev.js module 1267 (Color Thief, CanvasImage and getPalette, lines 87851-87858 and 88225-88249).

What it does: getPalette appends a temporary canvas to body, draws the image, reads getImageData and removes the canvas only after quantizing. When getImageData throws (a tainted canvas or a zero-size image) the canvas is never removed, so every click on the image panel's "Colors" button for such an image leaves one more canvas in body.

Why it's unclear: it looks like a plain leak (no try/finally), but it only matters for images the browser won't let the app read, which the image panel may never get.

Kept. src/app/inspector/color-thief.ts (ColorThief.getPalette); pinned by "leaves the canvas in body when getImageData throws, like the old code" in src/app/inspector/color-thief.test.ts. BUGS-FIXED candidate.

## Q-365 The symbols panel piles up thumbnail listeners

Old location: designer.browser.dev.js module 1714 (gSymbolsPanel), 172055 and 172121.

What it does: every tile build adds a new bound AfterThumbnailUpdate listener to the master. The removal in the symbol-remove path passes the unbound function, so nothing comes off. Each scene switch (tab change) adds one more listener per master, and each one runs _thumbnailUpdated again.

Why it's unclear: it looks like a leak, but the visible result is the same (the thumbnail is redrawn several times). Q-070 covers the symbol dictionary, not this.

Kept. src/app/sidebars/symbols-panel.ts _createTile and _removeSymbol; pinned by symbols-panel.test.ts "adds another thumbnail listener per master on every scene switch, as the old code did". BUGS-FIXED candidate.

## Q-366 Library photo boxes reflow one by one on resize

Old location: designer.browser.dev.js module 1663, 162012-162020 and 162125-162170.

What it does: the old debounced resize handler took every non-empty .assets-wrapper as one jQuery set, used the first one's css("width") (250 when there was none), and reflowed the whole set in one _initMasonryLayoutColumns call. That call unwrapped every column in every box and appended the new columns to each box in the set, which means jQuery clones for all but the last. The new handler takes the width the same way, then reflows each box that holds photo columns on its own.

Why it's unclear: the old set call mixes the outer and inner photo wrappers and non-photo boxes, so its result with more than one non-empty box is not a sensible layout. The code is unreachable while the market API is gone.

Kept as described. src/app/sidebars/library-panel.ts constructor; pinned by library-panel.test.ts "reflows each box with photo columns when the width changed by more than 50px".

<!-- Brand (phase 7 review, phase 8, brand) -->

## Q-367 Other texts still say "Gravit Designer"

Old location: designer.browser.dev.js module 814 (the English string
table, src/app/locale/data/en.json).

What it does: about 40 strings name the app, among them the update
panel ("You are now running Gravit Designer %currentVersion"), the PWA
install dialog, the unsupported-browser notice, import warnings and the
PDF export's producer ("Gravit Designer PDF Exporter").

Why it's unclear: the task named the title, the version line, the
favicon, the manifest and the desktop app name. The string table must
stay the old bundle's byte for byte (scripts/extract-locales.test.ts),
so renaming these would need overrides like src/app/brand/brand-strings.ts,
and the PDF producer is part of exported files that the export scenarios
compare.

Kept. Only the named places change (CHANGES.md CHG-001). Renaming more
is a list of string overrides in the next look; say which ones.

## Q-368 No switch for the classic look in the UI

Old location: none (new in the rewrite).

What it does: the look comes from `?branding=classic|next` (stored),
the harness or preload override, or the stored choice
(src/app/brand/branding.ts).

Why it's unclear: the user decided on two looks but not on whether users
choose between them. A settings row would change the classic settings
dialog, which the parity screenshots compare.

Kept. No UI switch; `?branding=classic` in the browser, `GD_BRANDING=classic`
for the desktop app. Pinned by src/app/brand/branding.test.ts.

## Q-369 Every pink shade becomes the magenta's hue

Old location: designer.browser.light.css and .dark.css (about 25 pink and
raspberry shades around #d72e63).

What it does: scripts/brand/accent-css.ts maps every colour with a hue
of 325 to 352 degrees onto the magenta's hue, scaling saturation and
shifting lightness by what separates #d72e63 from #E3136B. Yellow, lime
and olive are used only in the welcome panel and the mark.

Why it's unclear: "mapped to the brand palette" could also mean using the
yellow or lime for some roles (selection rows, hover states). The old
desktop UI has no pink in the toolbar and selected layer rows are grey,
so those look the same in both looks.

Kept. One accent, the magenta. Pinned by scripts/brand/accent-css.test.ts
and the parity/scenarios/brand shots.
