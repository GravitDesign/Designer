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
