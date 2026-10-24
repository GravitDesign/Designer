# Phase 4 review, group C

Scope: engine-scene-node, engine-style, engine-effects-canvas,
engine-effects-webgl, engine-shapes-path, engine-shapes-primitives,
engine-paths-graph.

What was checked:

- Compared old and new function by function for GNode (module 2) and its
  split files, GSceneNode (76), GElement (22), GElement.Transform, Layout,
  Anchor, Accelerated (908-912), GAnnotation.Linkable (914), GBlock (69),
  GItem (104), GAnchor, GAnchorLink, GSceneOptions, deserializeAsync
  (894), GStylable (28), GElement.Stylable (911), PaintLayer,
  FillPaintLayer, BorderPaintLayer (900-902), GTexturePattern (139),
  GDictionary (227), GSwatches (662), GBlurEffect (249), StackBlur (931),
  GMultiEffect (535), GAdjustMultiEffect and GColorAdjustMultiEffect
  (1026, 1027), GContactShadowEffect, GCurvedShadowEffect,
  GLongShadowEffect (1028, 1029, 1031), GWebGLEffect (51), GPathsGraph
  (162), GPGFacet (656), and the first half of GPathBase (45) and GShape
  (56) (AnchorPoint, construction, transforms, collisions, style layers,
  markers, `_handleChange`, the fake-container sync).
- Skimmed structure and names only (method-name diff against the old
  module, no line-by-line check): the rest of GPathBase and GShape, GPath,
  GCompoundPath, GCompoundShape, the eight primitives, GPGEdge, GPGAnchor,
  GGraph, GEdge, GEdgeLink, the remaining canvas effects and the GGL*
  effect classes. The GLSL of the shader modules wasn't diffed by hand: the
  existing old-shader harness (style/webgl/shaders/testing) runs every old
  shader module next to the new one and compares the compiled programs
  and passes.
- `npx vitest run src/engine/style src/engine/scene/paths-graph` (76
  files, 269 tests) and `npx vitest run src/engine/scene
  src/engine/geometry/path-util` (38 files, 476 tests) pass.

The ports I read line by line keep the old branch structure, argument
handling, event order and float operation order. I found no behaviour
difference a user or a file would notice. The findings are coverage gaps
(whole groups of painting and file code that no comparison reaches), one
real but latent difference in the multi-effect class tables, and some
small ones.

### R4-C-001 (medium): the effect and blend render matrix is never compared for the new app

- Old: every effect module (GBlurEffect 46256 ... GGLFisheyeEffect) and the blend modes in GPaintCanvas/GBlender.
- New: next/parity/scenarios/engine-model/render.spec.ts:51 (`blend-*`) and :84 (`effect-*`); next/parity/ported/engine-effects-canvas.json (empty), engine-effects-webgl.json (2 ids).
- What differs: the 98 recorded tiles in parity/expected/engine-model/render/ (42 `effect-<class>` tiles, one per canvas and WebGL effect with non-default values, and 56 `blend-element-*`/`blend-layer-*` tiles for the canvas and WebGL blend modes) are in no ported list, so `paritySuite(..., { newApp: false })` only runs them against the old app. The only effect pixels compared for the new app are engine-model/styles/render-effects (drop shadow, inner shadow, blur, long shadow, overlay; listed by engine-scene-document). Mirror, contact shadow, curved shadow, color grading, both multi effects, all 31 GGL* effects and every non-normal blend mode are pixel-untested. The shader harness checks programs and pass order, not the uniforms the effect classes compute (propertyTransform, padding, `$shp` mapping) or the canvas blending.
- Fix: add the `engine-model/render/effect-*` ids to engine-effects-canvas.json / engine-effects-webgl.json by class, and the `blend-*` ids to engine-style.json (canvas modes) and engine-effects-webgl.json (WebGL modes). Run `GD_RUN=engine-effects-webgl npx playwright test parity/scenarios/engine-model --project parity`, fix what fails, and record real browser differences as exceptions.

### R4-C-002 (medium): the multi-effect class tables only exist after the first instance

- Old: chunk.vendor.js:234771 `n.register(h, [o, a, r])` and :234749 `n.register(A, [r, o])` run when the module loads.
- New: next/src/engine/style/effects/adjust-multi-effect.ts:14-23, 30-32; next/src/engine/style/effects/color-adjust-multi-effect.ts:36-43, 57-59.
- What differs: `MultiEffect.register` is called from the constructor (lazily, because the GL classes are looked up by name and may not be registered yet). Until the first `new`, `AdjustMultiEffect.GeometryProperties` and `ColorAdjustMultiEffect.GeometryProperties` resolve through ES static inheritance to MultiEffect's `{fxP, fxN}`, `VisualProperties` is undefined and `__FX` is null. In the old app the tables held the prefixed sub-effect properties (`GGLDotScreenEffect&shp`, ...) from the start. Anything that reads the class tables without an instance gets the wrong set: the effects inspector building its fields or defaults, `Node.getClassFromId(id).GeometryProperties`, a store filter applied to a class.
- Fix: register both multi effects once engine-effects-webgl has registered its classes (a late-bound hook called at the end of the GL effects index, or an explicit `registerMultiEffects()` the engine bootstrap calls), and keep the constructor call only as a fallback. Add a test that reads `AdjustMultiEffect.GeometryProperties` and `ColorAdjustMultiEffect.VisualProperties` before constructing either.

### R4-C-003 (medium): the effect result cache in GElement.Stylable is untested

- Old: chunk.vendor.js:117790-117961 (`_getFxCache`, `_setFxCache`, `_reinvalidateFxDeps`, `_reinvalidateRemovedFx`, `_resetFxCacheAndState`, `_getFxIdx`), 6165-6210 (`_handleGeometryChangeForProperties`, trf branch).
- New: next/src/engine/style/element-stylable.ts:377-587; next/src/engine/scene/element.ts:928-980.
- What differs: nothing found, but no test reaches it. Every parity tile is painted with `toBitmap`, which sets `enableFxCache = false` (element.ts:604, old 5861), and no unit test names these methods. The branches with the most room for error are all here: drawing the cached bitmap rescaled after one zoom step (`drawImage` with the computed source rect), the reset after more than one step or a size misfit, dependency invalidation when an earlier effect changes, the partial reset that climbs to the nearest stylable ancestor, and the "pure move" rule that keeps the cache when only the translation of `trf` changes (with the Compound Shape and group special cases).
- Fix: unit tests with a fake scene (addDestroyable/destroy) and a canvas stub: same-scale hit (Copy draw), scale x2 (rescaled draw), scale x4 (reset), width off by more than 1 (reset, "size misfit"), changing the first of two effects (second entry dropped), and a `trf` change that only translates versus one that scales.

### R4-C-004 (medium): GPathsGraph painting, hit testing, paint box and undo actions are untested

- Old: chunk.vendor.js:36530-36569 (`_paintFill`), 36595-36799 (`_paintBorder`), 36819-36853 (`_calculatePaintBBox`), 35791-35829 (`_detailHitTest`), 35696-35744 (transaction actions, `_setFacets`), 91705-91811 (GPGFacet `_paintFill`).
- New: next/src/engine/scene/paths-graph/paths-graph.ts:614-655, 1687-1926, 1960-2008, 740-796, 631-679; pg-facet.ts:393-501.
- What differs: nothing found in the read-through. The one parity scenario (engine-geometry/pathops/paths-graph) covers addGraphLine and splitEdge, and paths-graph.test.ts covers store/restore, facet rebuilding and the cSt carry-over. Nothing covers the three-pass facet fill (2x scratch canvas, seam strokes, cut-out halves), the grouping of custom-style edges by depth-first search, the border padding taken from the widest custom edge, the edge-before-facet hit order, or the undo/redo closures that swap `_facets`.
- Fix: add a parity scenario that builds a graph with two facets (one with its own fill, cSt), one custom-style edge and a border, renders it with `toBitmap`, hit-tests a point on an edge and one inside a facet, and returns the paint box. List it in engine-paths-graph.json. Add a unit test for getTransactionAction/getTransactionRevertAction on the AfterSpecialChangeEvent data.

### R4-C-005 (medium): the quadtree index upkeep of GElement.Accelerated is untested

- Old: chunk.vendor.js:118305-118377.
- New: next/src/engine/scene/element-accelerated.ts:126-197.
- What differs: nothing found. element.test.ts:202 only checks the order of hits right after building the tree. Hit testing in layers and pages sorts the candidates by `_elementIndex`, so a wrong index after a reorder makes clicks select the element underneath. Untested: `_dirtyIndex` set on remove and used on the next insert, the BeforeChildRemove renumbering from `index - 1`, the ChildVisualUpdate path for a child not yet in the tree (renumbers from the previous index without +1, a kept quirk), and the rebuild on Restore.
- Fix: unit test on a layer with three overlapping rectangles: remove the bottom one, insert it on top, hit-test the overlap and expect it first; then hide and show a child and check `_elementIndex` of all children against the old numbering.

### R4-C-006 (medium): Element.toBitmap options beyond scale 1 are untested

- Old: chunk.vendor.js:5807-5874.
- New: next/src/engine/scene/element.ts:529-620.
- What differs: nothing found. Parity calls `toBitmap(1, 1)` or `toBitmap(scale, scale, 0, background)`. The `Length` width and height, `dpi` (scale by dpi/72 and `setDPI`), fit modes 1 (fill) and 2 (fit and center, with the origin offset), `backgroundOpacity`, the configuration override via `extend`, and `persistent = false` are not exercised. The export dialogs of later phases use them.
- Fix: unit tests with a canvas stub for mode 0/1/2 with different x and y scales (canvas size and origin), a `Length` width, and dpi 144 (scale doubles, bitmap DPI set).

### R4-C-007 (low): paint layers and their container get a `$refs` the old ones didn't have

- Old: chunk.vendor.js:115463 (`GStylable.PaintLayer` constructor) and 115907 (`GStylable.PaintLayers`) don't call the GSceneNode constructor, so `$refs` is undefined.
- New: next/src/engine/style/paint-layer.ts:52-53 and paint-layers.ts:22 (`super()` runs SceneNode's constructor, which sets `this.$refs = []`).
- What differs: `layer.hasProperty("refs")` is true and `getProperty("refs")` returns `[]` instead of the default. The old code only reads `$refs` on pages and through GSceneNode's handlers, which these classes skip, so nothing visible changes today.
- Fix: delete the own `$refs` in both constructors after `super()` with a comment, or add a QUESTIONS.md entry saying it's accepted.

### R4-C-008 (low): `storeProperties` and `restoreProperties` reject a null filter

- Old: chunk.vendor.js:838-842 and 849-854 (`i = i || function (e, t) { return t; }`).
- New: next/src/engine/scene/node-properties.ts:282-305 (`filter: PropertyFilter = passThrough`).
- What differs: a default parameter only replaces `undefined`. A caller passing `null` (or `false`) gets "filter is not a function" where the old code used the pass-through. No caller in the engine does this today; editor code ported later may.
- Fix: `const apply = filter || passThrough;` inside both methods.

### R4-C-009 (low): static inheritance now includes the `_`-prefixed tables

- Old: chunk.vendor.js:40-49 (`GObject.inherit` copies a parent's statics unless the name starts with `_`, is `toString` or the child already has it).
- New: ES `class ... extends`, for example next/src/engine/scene/shape.ts:170 and style/effects/multi-effect.ts:38.
- What differs: in the old engine `GShape._Change`, `GPath._Change` or a multi effect subclass's `__FX` were undefined unless the class set its own; now they resolve to the nearest ancestor's table. Only visible through introspection (and it makes R4-C-002 look like "no sub-effects" instead of failing loudly).
- Fix: none needed; add a line to QUESTIONS.md so later ports don't rely on either behaviour.

### R4-C-010 (low): the paths-graph scenario is listed by another cluster and the test comment is stale

- New: next/src/engine/scene/paths-graph/paths-graph-scenarios.test.ts:1-6; next/parity/ported/engine-scene-document.json:3; next/parity/ported/engine-paths-graph.json (empty).
- What differs: the comment says the scenario "isn't listed for the browser run yet" because the scene didn't exist; engine-scene-document has since listed it. engine-paths-graph.json, engine-scene-node.json, engine-style.json and engine-effects-canvas.json are all empty, so their coverage depends on another cluster's list.
- Fix: list in each cluster's json the scenarios that exercise it (the suite takes the union, duplicates are harmless), and update the comment.

### R4-C-011 (low): port-map points GHitResult at a file that doesn't exist

- Old: chunk.vendor.js:45065-45073 (module 229).
- New: next/docs/rewrite/port-map.tsv row for module 229 says next/src/engine/scene/hit-result.ts; the class is in next/src/engine/geometry/hit-result.ts.
- Fix: correct the target in port-map.tsv.

### R4-C-012 (low): PROGRESS.md still lists the GL effect registration as pending

- New: next/docs/rewrite/PROGRESS.md:230-232.
- What differs: the note says engine-effects-webgl must register GGLBlurEffect, GGLBendBlurEffect, GGLDotScreenEffect, GGLSepiaEffect, GGLBrightnessContrastEffect, GGLHueSaturationEffect and GGLColorAdjustEffect. All seven call `registerNodeClass` (for example style/webgl/effects/gl-blur-effect.ts:29).
- Fix: remove the entry.

### R4-C-013 (low): GPathsGraph needs 34 double casts to talk to its own graph mixin

- New: next/src/engine/scene/paths-graph/paths-graph.ts (34 `as unknown as`, for example 68-74, 101-104, 377, 1515-1519), plus `null as never` for the drawCanvas coordinates at 1774-1775 and 1893-1894.
- What differs: style only. PGAnchor and PGEdge don't declare that they satisfy GraphAnchor and GraphEdge, so every call into GraphMixin goes through `asGraphAnchor`/`asGraphEdge` or `as unknown as`. The `null as never` arguments hide that drawCanvas is called with null x/y (old behaviour, which the canvas treats as 0).
- Fix: have PGAnchor and PGEdge implement GraphAnchor and GraphEdge (or make GraphMixin generic over them) and drop the casts. Widen drawCanvas's x/y to `number | null` with a comment instead of `never`.
