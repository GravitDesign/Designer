# QUESTIONS.md drafts, group B

Entries for the coordinator to number and merge. Code comments point at the
titles.

## Fx cache bitmaps count as rendered at once

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

## A canvas error in a queued tryRunRendering blocks the later ones

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

## A painting error in a tile leaves the render phase on

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

## GVertexPolyBoolean ignores its pip_check_policy argument

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

## common_segments_policy 0 (OUTSIDE) becomes AUTO

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

## A collinear segment pair drops every later intersection too

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

## Block intersector adds every quadratic-vs-curve hit

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

## Image tracer throws on zero colors or zero quantization cycles

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

## Knife cut of an open path with fit on throws "DEBUG is not defined"

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

## Offsetter: offset 0 on an open path with both sides throws

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

## Offsetter: inset-only parts of an open path that touch the source are dropped

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

## Offsetter: the rest of a cut arc starts at an unset cut point

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

## Offsetter: the tangent point of a line uses dx for y

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

## GVertexFitter degenerate fit puts the control points on the end points

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

## Kept crashes in the vertex helpers (getPathLength, GVertexContainer.clone, QuadTree.clear)

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

