# QUESTIONS.md drafts, group C

Entries for the coordinator to number and merge. Code comments point at the
titles.

## Subclasses now inherit the _-prefixed static tables

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

## Stylable elements share one effect cache array

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

## Accelerated index after a visual update of a child not in the tree

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
