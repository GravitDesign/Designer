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

Kept. Pinned by next/src/engine/text/fonts/harfbuzz.test.ts ("reports
clusters as UTF-8 byte offsets"), the shaping entries of
next/src/engine/text/fonts/__fixtures__/old-fonts.json, and the parity
scenario engine-model/fonts/browser-probe.

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

Kept. Pinned by next/src/engine/paint/render-scheduler.test.ts "ends the
render phase on a canvas error in tryRunRendering, as the old replay did" and
"keeps the render phase on when the painting code itself throws".

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

Kept. Pinned by next/src/engine/paint/tile-cache.test.ts "lets other errors
of the painting code escape with the render phase on" and "reports a canvas
error like the old failed replay and keeps painting afterwards".

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

Kept. Pinned by the seeded fuzz in
next/src/engine/geometry/boolean/fixture-cases.test.ts (seed 11 fails with
`splice(P, 1)`) and the collinear.* cases there.

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

Kept. Pinned by next/src/engine/geometry/boolean/fixture-cases.test.ts
"block.quadCubicNear" (fails with `count < 6`).

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

Kept. Pinned by vertex-offsetter.test.ts "drops inset-only parts of an open
path that touch the source (old quirk)" and the insetDropped cases of
vertex-offsetter.old-outputs.test.ts.

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

Kept. Pinned by vertex-offsetter.test.ts "cuts an arc with no earlier line
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

Kept. Pinned by vertex-offsetter.test.ts "uses dx for y in the tangent point
of the segment-to-arc distance (old quirk)" and the helper cases of
vertex-offsetter.old-outputs.test.ts.

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

Old: public/chunk.vendor.js 16687. New: next/src/engine/text/text.ts, setText ("Returns with the change events still locked").

With `lockEvents`, setText calls `core.lockChangeEvents(1)` and then returns early when a run's font isn't resolved yet, without unlocking. The core stays locked until some later setText with `lockEvents` that gets through.

Unclear: looks like a slip. Until the next locked setText, the GTL core sends no change events, so the text editor can stop reacting after a font goes missing. Candidate for a BUGS-FIXED entry.

Kept. Pinned by text.test.ts "keeps the old slips (events left locked, raw trf array throws)" (old-text.json quirks.lockAfterMissing = 1).

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

Kept. Pinned by text.test.ts "replaces fonts (fontSetterContent)" and "(fontContent)" (old-text.json replaceFonts).

## Q-038 GText: the font listener stays after the text leaves the workspace

Old: public/chunk.vendor.js 18206-18213. New: next/src/engine/text/text.ts, _handleChange (WorkspaceDetach).

On WorkspaceDetach the old code schedules `_updateFontManagerListener(true)` 100 ms later, but only when the workspace is gone by then, and `_updateFontManagerListener` does nothing without a workspace. A text that was waiting for a font keeps its FontAvailableEvent listener after it is deleted: the font manager keeps it alive and it still reacts when the font arrives.

Unclear: clearly meant to remove the listener. Candidate for a BUGS-FIXED entry (remove it with the font manager captured before the detach).

Kept. Pinned by text.test.ts "keeps listening for fonts after it leaves the workspace".

## Q-039 GText: the border pattern check reads the text's own _ba

Old: public/chunk.vendor.js 18617. New: next/src/engine/text/text.ts, _paintBorder.

The border paint tests `this.$_ba !== Inside` on the text itself. Texts have no `_ba` property (it belongs to the border paint layer), so the test is always true and the pattern box is always widened by the border reach.

Unclear: the layer's `$_ba` was probably meant. Changing it changes the pattern box of textured borders on text.

Kept. Not pinned by a test in text.test.ts; the text painting tests of R4-D-008 cover border painting.

## Q-040 GText: a legacy blob with a raw trf array throws

Old: public/chunk.vendor.js 18112. New: next/src/engine/text/text.ts, _restoreLegacy.

Restoring a pre-2 text blob (corner coordinates `tlx`/`trx`/`blx`/...) that has `trf` but no `ttrf` uses the raw stored array as a transform and calls `preMultiplied` on it, which throws a TypeError. The text can't be restored.

Unclear: probably `Transform.deserialize(blob.trf)` was meant. No such file is known to exist; old files with corner coordinates store `ttrf`.

Kept. Pinned by text.test.ts "keeps the old slips (events left locked, raw trf array throws)" (old-text.json quirks.rawTrf).

## Q-041 GText: fake text reads only the first backup outline

Old: public/chunk.vendor.js 16880-16887 and 16915-16921. New: next/src/engine/text/text.ts, readVertex and hasVertexForRead.

A fake text (missing or embedded fonts, with `_bkpPath`) has one backup path per style run. readVertex and hasVertexForRead use `_vertexIterator`, which never moves on, so only the first backup path's vertices come out. The outline view border, vertex readers and exports of mixed-style text with missing fonts show only the first run.

Unclear: an old bug users can see. Fixing it changes outlines and exports of such texts. Candidate for a BUGS-FIXED entry.

Kept. Pinned by text.test.ts "reads only the first backup outline of a fake text" (old-text.json fakeVertices: two backups, the outline digest is the first one's).

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

Kept. Pinned by tl-core.test.ts "parses fonts and CSS like GTLUtil" (`deCRLFify("a\r\nb\r\nc\rd\te\r")`).

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

Kept. Pinned by next/src/engine/text/gtl/document.test.ts, "undoes and redoes setText", "setTextAtStart", "twoEdits", "toggleList", "toggleListOff" (recorded from the old app in __fixtures__/old-gtl-document.json). BUGS-FIXED candidate.

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

Kept. Pinned by parity engine-model/image/paint-error (px 4, py 2, pw 30, ph 20).

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

Kept. Pinned by parity engine-model/image/grid-images (attached.props.itrf) and engine-model/image/paint-grid.

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

Kept. Pinned by next/src/io/import/svg/helpers.test.ts "matches the old importer's arc segments exactly" and the io-import-svg/paths-svg parity scenario.

## Q-076 SVG import font listeners

Old location: public/chunk.vendor.js 245165-245185 (_resolvedFont removing the FontAvailableEvent and FontUnavailableEvent listeners), 245261 (addFontToResolve adding them once).

What it does: the importer adds its font listeners with the first font it waits for and removes them when no font is left to resolve. The flag that says they are on is never reset, so a font asked for after that is never answered, the job count never reaches zero and the import never calls back.

Why it's unclear: a text whose font is only asked for after another font has resolved (fonts that resolve at different times, an unknown family whose fallback is looked up later) hangs the import; whether that happens in practice depends on the font provider's timing.

Kept. Pinned by the io-import-svg/text-unknown-family-svg parity scenario (the callback never runs, `called: false`).

## Q-077 SVG import font provider queue

Old location: public/chunk.vendor.js 245110-245135 (svg.fontProvider.queryFirst, the `fontCallbackMap` keyed by `t + "_" + i + "_" + n` of the query).

What it does: queries to the font provider are queued by a key built from the query, but the query is an object, so every key is "[object Object]_undefined_undefined". While one query is out, every later one waits for it and gets the same answer, whatever family it asked for. The answer is passed on with all its arguments.

Why it's unclear: the key was meant to tell families apart. With a provider that answers synchronously nothing waits, so whether two families get mixed up depends on the provider.

Kept. Pinned by the io-import-svg/font-fallback-svg parity scenario (the recorded provider queries) and next/src/io/import/svg/svg-parser.test.ts "passes every argument of the provider's answer to every waiting query".

## Q-078 SVG import nested svg

Old location: public/chunk.vendor.js 246275 onwards (svg.Element.svg).

What it does: a nested `<svg>` becomes a group whose x, y and viewBox fit go into the transform its children get. The group itself gets no transform, no name and none of the nested svg's style.

Why it's unclear: a style or name on the nested svg is lost, although its children inherit the style through canvg's lookup; it may be on purpose (the outer svg is handled the same way) or an oversight.

Kept. Pinned by the io-import-svg/structure-svg and io-import-svg/viewbox-aspect-svg parity scenarios.

## Q-079 SVG import switch

Old location: public/chunk.vendor.js 246421 onwards (svg.Element.switch).

What it does: a `<switch>` takes the scene node of its first child that is neither a foreignObject nor an unknown element, then builds every child into it, so all of its children are drawn instead of only the first matching one. A switch holding Gravit's editing data replaces the whole import with the original document instead.

Why it's unclear: SVG renders only the first child whose conditions match. Files that rely on switch for fallbacks import with every alternative on top of each other.

Kept. Pinned by the io-import-svg/anchors-svg parity scenario and the roundtrip-*-preserved scenarios.

## Q-080 SVG import text box

Old location: public/chunk.vendor.js 247571-247580 (svg.Element.TextElementBase getBoundingBox).

What it does: the box of an imported text, which gradients and patterns on the text are fitted to, uses the text's width as its height too.

Why it's unclear: looks like a typo for getHeight(); gradient and pattern fills on imported text are placed against a square box.

Kept. Pinned by the io-import-svg/text-layout-svg parity scenario (a text with a gradient fill).

## Q-081 SVG import text children

Old location: public/chunk.vendor.js 247583 onwards (svg.Element.text).

What it does: every tspan (and every text node, which becomes a tspan) gives one Gravit text. The texts then get the settings (position, style) of the text element's child at the same index, which is not always the tspan they came from when the text mixes text nodes, tspans, textPaths, trefs and anchors.

Why it's unclear: the index pairing only lines up when the children are all tspans; mixed content gets shifted positions or styles.

Kept. Pinned by the io-import-svg/text-layout-svg and io-import-svg/use-text-svg parity scenarios.

## Q-082 SVG import image listener

Old location: public/chunk.vendor.js 247930-247945 (svg.Element.image, `i.image.removeEventListener(x.StatusEvent, this)`).

What it does: the image's status listener sizes the image to the element's width and height once it has loaded, then tries to remove itself with `this` instead of the listener function, which removes nothing. Every later status change (a reload) scales the image again.

Why it's unclear: the remove call shows the intent; the effect only shows when the image loads more than once.

Kept. Pinned by the io-import-svg/images-svg-placed parity scenario.

## Q-083 SVG import use

Old location: public/chunk.vendor.js 248111 onwards (svg.Element.use).

What it does: a `<use>` builds a fresh copy of the referenced element from its DOM node (without parent or type) and gives it the use's style and other attributes. The use's class attribute is copied only after the copy has picked its CSS rules, so CSS rules for the use's classes don't style the copy.

Why it's unclear: in browsers the instance inherits from the use element, so class rules on the use apply. Imported files that style `<use>` by class lose that style.

Kept. Pinned by the io-import-svg/use-symbol-svg, io-import-svg/use-text-svg and io-import-svg/structure-svg parity scenarios.

## Q-084 SVG import feColorMatrix

Old location: public/chunk.vendor.js 248535 onwards and 248669 (svg.Element.feColorMatrix apply: `e.getImageData(...)`).

What it does: canvg recolored canvas pixels in feColorMatrix's apply. The importer calls apply with its scene context, which has no getImageData, so a filter with an feColorMatrix that the importer applies throws a TypeError and the import fails.

Why it's unclear: the canvas code was left behind when the fork switched to building scene nodes; color matrix filters are common in exported SVGs.

Kept. Pinned by the io-import-svg/color-matrix-svg parity scenario.

## Q-085 SVG import line bounds

Old location: public/chunk.vendor.js 245486-245510 (svg.Rect, `expand`).

What it does: canvg's bounding box, which gradients and patterns use for objectBoundingBox units, moves its bottom edge to the x of a point below it instead of the y, so boxes of lines and paths come out wrong vertically.

Why it's unclear: an x/y slip; gradient and pattern fills with objectBoundingBox units on paths are placed against that box.

Kept. Pinned by next/src/io/import/svg/svg-values.test.ts "moves the bottom edge to the x of a lower point (old quirk)".

## Q-086 SVG import em units

Old location: public/chunk.vendor.js 245360 (svg.Property getEM, reading the font of `i.ctx`).

What it does: em and ex lengths are relative to the font of canvg's canvas context. The importer never sets one, so any em or ex length throws a TypeError ("Cannot read properties of undefined (reading 'font')") and the import fails.

Why it's unclear: em units are valid SVG; files that use them can't be imported at all.

Kept. Pinned by next/src/io/import/svg/svg-parser.test.ts "fails on em lengths, which needed canvg's canvas" and the io-import-svg/units-em-svg parity scenario.

## Q-087 SVG import matrix order

Old location: public/chunk.vendor.js 245652 (svg.Transform.Type.matrix).

What it does: in a transform list, `matrix()` is applied on the other side (multiplied instead of pre-multiplied) than translate, scale and rotate, so a matrix after another function applies in the opposite order.

Why it's unclear: transform lists like `translate(10) matrix(...)` import with a different result than browsers show; single matrix() transforms, the common case, are unaffected.

Kept. Pinned by next/src/io/import/svg/svg-values.test.ts "applies matrix() on the other side than translate()" and the io-import-svg/transforms-svg parity scenario.

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

Kept. next/src/io/import/sketch/effects/sketch-effect.ts and sketch-shape.ts. Pinned by the parity scenario io-import-sketch/styles-v49 (layers "shadows", "blur-gauss", "blur-zoom", "blur-bg").

## Q-099 Sketch symbol override replaceChild test is inverted

Old location: chunk.vendor.js:109568-109583 (module 796 sketchbase, replaceChild).

What it does: replaceChild is meant to put an override layer (or nothing) in place of a layer of the symbol master. The test is inverted: when the layer is not a direct child, the first direct child is replaced (the index variable was never set, and `splice(undefined, 1, ...)` starts at 0); when it is a direct child, the search goes on in the children, and the layer usually stays.

Why it's unclear: image overrides and nested-symbol overrides replace or remove the wrong layer, or none. A fix would replace the matching child at its own index and only search deeper when it isn't a direct child.

Kept. next/src/io/import/sketch/sketch-base.ts replaceChild. Pinned by sketch-model.test.ts "replaces the first child when the layer is not a direct child (old inverted test)" and the parity scenarios io-import-sketch/symbols-v49 (I-scaled, I-remove) and symbols-edge-v49.

## Q-100 Sketch path event blocks are unbalanced

Old location: chunk.vendor.js:240232-240240 and the release loop after it (module 1134 sketchpathutil, generatePath).

What it does: while building a path, composite events and child changes are blocked only when the path is created by a straight point. A path that starts with a curve point is never blocked, but is released like the others at the end (a release without a block does nothing). A path that ends up with a single anchor stays blocked, but it is dropped anyway.

Why it's unclear: the blocks look meant for every path, so curved paths send change events while their anchors are added. The imported geometry is the same either way, so users see no difference; it only costs work.

Kept. next/src/io/import/sketch/sketch-path-util.ts. The parity scenario io-import-sketch/primitives-v49 runs both cases (ovals start with a curve point, "G-single" has one point) and pins the resulting paths.

## Q-101 Sketch boolean groups take a first union as no operation

Old location: chunk.vendor.js:242909-242912 (module 1213 sketchshapegroup).

What it does: to see whether a boolean group mixes operations, the importer keeps the first operation in a variable and tests it with `if (first)`. Union is 0, which is falsy, so after a first union the next operation becomes "the first" instead of being compared. A group of union then subtract counts as uniform and is merged with one operation instead of step by step.

Why it's unclear: users get a different shape than in Sketch for groups that start with a union and continue with another operation. A fix would test `first !== null`.

Kept. next/src/io/import/sketch/sketch-shape-group.ts. Pinned by the parity scenario io-import-sketch/booleans-v49 (group "B-union-sub").

## Q-102 Sketch font names with Regular import as italic

Old location: chunk.vendor.js:240408 (module 1136 sketchtext, composeQuery).

What it does: the style is read with `/normal|italic|oblique|regular/i`, then `"normal" === style ? Normal : Italic`. Any font name containing "Regular" or "Oblique" (and "Italic") gets the italic style, so "OpenSans-Regular" is looked up as Open Sans italic.

Why it's unclear: almost every Sketch text uses a Regular face, and these import in italic or fall back to another font. A fix would map "regular" to Normal.

Kept. next/src/io/import/sketch/sketch-text.ts composeQuery. Pinned by sketch-patterns.test.ts "reads \"OpenSans-Regular\" like the old importer" (recorded from the old module) and the font queries of the parity scenarios io-import-sketch/text-v49 and symbols-edge-v49.

## Q-103 Sketch borders always import as inside

Old location: chunk.vendor.js:70841 (module 439 sketchelement): `t.setProperty("_ba", _[o.position || 1])` with `o = i.style`.

What it does: the border alignment is looked up from `style.position`, but Sketch keeps the position on each border and the style has none. Every border imports as Inside. A centre position (0) would also become Inside because of `|| 1`.

Why it's unclear: centred and outside borders move inwards, so strokes look thinner or shifted after the import. A fix would read `border.position` and test for undefined instead of using `||`.

Kept. next/src/io/import/sketch/sketch-element.ts (BORDER_ALIGNMENTS). Pinned by the parity scenario io-import-sketch/styles-v49 (layer "borders" with positions 0, 1, 2 and none).

## Q-104 PDF import never calls back for a document pdf.js can't open

Old location: chunk.vendor.js module 1393 (GPDFImport.import): `A.getDocument(...).then(function (e) { ... })` with no rejection handler.

What it does: when pdf.js rejects the document (a PDF that needs a user password, a file it can't parse), the import's callback is never called. The page waits forever; the AI check, which has a catch, does report the error.

Why it's unclear: users get no error and no import for an encrypted or broken PDF. A fix would add a rejection handler that calls back with the error.

Kept. next/src/io/import/pdf/pdf-import.ts (file comment). Pinned by the parity scenarios io-import-pdf-eps/pdf/encrypted-user-password-pdf (called: false) and io-import-pdf-eps/ai-check/encrypted-user-password-pdf (PasswordException reported).

## Q-105 EPS page side: show without a font name throws

Old location: chunk.vendor.js module 1404 (GEPSParser), the text handler that calls getDefaultFont on the wrong object.

What it does: text the worker sends without a font name makes the page side call getDefaultFont on an object that doesn't have it, so the handler throws and the text is lost.

Why it's unclear: a crash path. A fix would ask the font manager for its default font.

Kept. next/src/io/import/eps/eps-parser.ts. Pinned by eps-parser.test.ts "throws for text without a font name, as the old page side did".

## Q-106 PS worker: errordict handler that isn't an object

Old location: public/pscore.js initiateError: `"execute" in this.errordict.value[t]`.

What it does: a handler put into errordict that isn't an object or function (`errordict /typecheck 5 put`) makes `in` throw a TypeError; the run ends with no further messages and no "done", so the EPS import waits for its timeout.

Why it's unclear: a crash, but PostScript files rarely do this. A fix would skip or ignore the handler.

Kept. next/src/workers/ps/core.ts initiateError. Pinned by src/workers/ps/__fixtures__/corpus/basic-errordict-number-handler.ps (interpreter.recorded.test.ts).

## Q-107 PS worker: image/imagemask with PS objects as operands

Old location: public/psclasses.js compositeObjectBuilder (own isEOF/getUint8 functions on every composite) with pscore.js posting drawImage uncloned.

What it does: `{} (abc) 5 [1 0 0 1 0 0] {<ff>} image` posts PS objects as width and height; structured clone throws DataCloneError and the run ends with no "done". The port throws the same DataCloneError from toGravit (core.ts holdsPSObject).

Why it's unclear: a crash on malformed input. A fix would raise typecheck instead.

Kept. Pinned by corpus/gfx-image-ps-operands.ps and gfx-imagemask-ps-operands.ps (interpreter.recorded.test.ts).

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

Kept. Pinned by the corpus programs filter-subfile-*.ps, filter-ascii85-*.ps, filter-reusable-*.ps and filter-lzw.ps (interpreter.recorded.test.ts).

## Q-110 PS worker: show operator quirks

Old location: public/ps*.js text operators, ported to next/src/workers/ps/show.ts.

What it does:
- kshow and cshow ignore their procedure and behave like show, as do xshow, yshow and xyshow when the widths are a number string.
- ashow and awidthshow pop the string before checking the numbers, so a typecheck leaves the stack changed.
- charpath and xyshow/xshow/yshow draw every outlined glyph at the start position (only show, ashow, widthshow and awidthshow advance), and stringwidth of an outlined font pushes 0 0.
- The paint type is read as `paintType` (lowercase), which fonts don't have, so outlined text is always filled.

Why it's unclear: text set with these operators lands in the wrong place, and stroked fonts are filled. Each is a small fix.

Kept. Pinned by the corpus programs show-builtin-*.ps, show-outlined-*.ps and font-type1-stroked.ps (interpreter.recorded.test.ts).

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

Kept. Pinned by the corpus programs basic-arith.ps, basic-arith-errors.ps, basic-trig.ps, basic-atan.ps, basic-cos-typecheck.ps, basic-cvi.ps, basic-cvr.ps, basic-cvr-bool.ps and basic-cvs.ps (interpreter.recorded.test.ts).

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

Kept. next/src/io/gvdesign/load.ts deserializeScene only settles with a scene; next/src/parity/app/document.ts no longer sets LoadFailed. Pinned by load.test.ts: "never settles for a JSON array of shapes / a group root", "never settles for a root of an unknown class / a lone childless shape, whose restore never calls back", "never settles for JSON that is cut off", and "rejects when deserializeAsync throws".

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

Kept. editor/guides/guides.ts mapRect, with a comment pointing here.

## Q-122 Full pixels guide keeps the bottom-right zone

Old location: chunk.vendor.js module 544 (GFullPixelsGuide constructor).

What it does: the constructor removes every allowed snap zone except top-left with `forEach` over the zone list while `disallowSnapZone` splices the same list. The splice shifts bottom-right into the slot already visited, so the list ends as top-left and bottom-right. `mapTopLeftOnly()` is false for this guide, so it also counts as a zonable guide in getBBoxSnapZones, and mapRect can round the bottom-right corner instead of the top-left one.

Why it's unclear: the code clearly means "top-left only"; the result differs because of the mutation during iteration.

Kept. editor/guides/full-pixels-guide.ts; pinned by "keeps bottom-right on the full pixels guide" in guides.test.ts.

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

Kept. base-editor.ts getOutlineColor; pinned by "reads the outline background from the bottom-right pixel whatever x and y are" in base-editor.test.ts.

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

Kept. transform-box.ts constructor; pinned by "rotates around the centre unless one is given; 0 counts as none".

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
