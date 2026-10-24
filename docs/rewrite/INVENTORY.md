# Inventory

Everything the old app does, one checklist line per item. This list is the
definition of done for the rewrite: an item is checked off when it works in
the new app and at least one test that names its id fails when the item is
broken. Tests name the items they cover with `covers("ID")`, and
`npm run inventory:check` lists items without a test.

Line references point into the reference build in public/ (chunk.vendor.js,
designer.browser.dev.js) unless another file is named. They were checked at
the start of each range; long ranges can be a few lines off at the end.
docs/rewrite/old-module-index.tsv maps line ranges to webpack modules.

Sections:

1. Engine document model (ENG-*)
2. Rendering and editor (EDT-*)
3. Actions, menus and shortcuts (ACT-*)
4. UI surfaces (UI-*)
5. File formats, import/export, workers and platform (FMT-*)
6. The running app, as recorded with Playwright (RUN-*)
7. Review additions (ADD-*)

Items marked "drop in rewrite" (cloud, account, license, purchase) are
checked off when the new app shows no trace of them, which is also tested.


## Engine document model

Scope: the engine part of `public/chunk.vendor.js` (node tree, properties, styles, effects, colors, patterns, text, fonts, geometry, scene features, serialization). Rendering internals, editors and tools are only listed where the model depends on them.

Conventions used below:

- "node name" is the string registered with `GNode.inherit`/`GNode.inheritAndMix`; it is the `@` value in saved JSON and the type name for `queryAll`.
- Property `foo` lives on the object as `$foo` (custom app properties as `@foo`). Defaults are the declared `...Properties` objects. Only values that differ from the default are written (see ENG-SER-004).
- Module ids are webpack ids from `next/docs/rewrite/old-module-index.tsv`.

### Node base, mixins and flags (NODE)

- [ ] ENG-NODE-001 GObject type system: `inherit`/`inheritAndMix` with numeric `__gtype_id__` counter and `__gmixins__` map, `hasMixin()`; mixins may not override unless forced — old: chunk.vendor.js:5-111 (module 0)
- [ ] ENG-NODE-002 GNode registry: `GNode.inherit(name, cls, parent)` registers node name <-> class (`_nodeClassToNameMap`, `_nameToNodeClassMap`), `getName`, `getClassFromId`; MIME `application/gravit+node` — old: chunk.vendor.js:279-288, 551-560 (module 2)
- [ ] ENG-NODE-003 GNode.Flag: Selected 2, Highlighted 4, Active 8, Transient 16, Expanded 32; `hasFlag/setFlag/removeFlag` with Before/AfterFlagChange — old: chunk.vendor.js:561-567 (module 2)
- [ ] ENG-NODE-004 GNode._Change codes: child insert/remove (1,2,10,11), properties (20,21), flag (30,31), parent attach/detach (40,41), PrepareStore/Store/PrepareRestore/Restore (50-53), workspace attach/detach (60,61) — old: chunk.vendor.js:568-585 (module 2)
- [ ] ENG-NODE-005 GNode.Properties mixin: `hasProperty/getProperty/setProperty/setProperties` (`$`=normal, `@`=custom), temporary values in `#$name` backups with `resetTemporaryProperty`, change events, transaction recorder hook — old: chunk.vendor.js:700-833 (module 2)
- [ ] ENG-NODE-006 GNode.Identity (`@id`, 6-char uuid), Tag, Reference (`#` referenceId), Multireference (`&` multiReferenceId) mixins — old: chunk.vendor.js:882-916 (module 2)
- [ ] ENG-NODE-007 GNode.Container mixin: linked-list children, append/insert/remove/clear, index lookup, `acceptChildren`, `getSubnodeIds` — old: chunk.vendor.js:917-1050 (module 2)
- [ ] ENG-NODE-008 GNode.Store mixin (`clone` via store/restore) and GNode.MapContainer (children keyed by id, `getById`, node name "MapContainer") — old: chunk.vendor.js:1051-1127 (module 2)
- [ ] ENG-NODE-009 GNode traversal and update API: `accept`, `findParent`, `getNodesByName`, `beginUpdate/endUpdate`, block changes/events, composite events, `validateInsertion/validateRemoval`, `isLocked`, `isRestoring` — old: chunk.vendor.js:1127-1484 (module 2)
- [ ] ENG-NODE-010 Selector engine on nodes: `queryAll/querySingle/queryCount/matches/filtered` with CSS-like syntax (`:selected`, attribute operators `*= ^= $= ~= |=`, nth) — old: chunk.vendor.js:73243-73790 (module 507)
- [ ] ENG-NODE-011 Scene-attached node base: `getScene/getSceneId/getPage`, `_Change.SceneAttached 200 / SceneDetached 201`, reference handling on attach/detach — old: chunk.vendor.js:19380-19508 (module 76)
- [ ] ENG-NODE-012 GElement base: bboxes (source/geometry/paint/children), `hitTest`, `getCollisions` with CollisionFlag (Partial, GeometryBBox 1024, PaintBBox 2048, FullyContained 4096, CollisionInfo 8192), `paint`, `toBitmap`, invalidation — old: chunk.vendor.js:5452-6220 (module 22)
- [ ] ENG-NODE-013 GElement.Flag: Hidden 1<<21, PartialLocked 1<<22, FullLocked 1<<23, NoPaint 1<<24; GElement._Change geometry/visual update codes 210-260 — old: chunk.vendor.js:5477-5498 (module 22)
- [ ] ENG-NODE-014 GElement.Transform mixin: `getTransform/setTransform/transform/preTransform/setBounds`, `MinimalDimention`, transform children — old: chunk.vendor.js:116392-116461 (module 908)
- [ ] ENG-NODE-015 GElement.Layout mixin: relayout of anchored children after transform (`_relayout`, `_layoutTransform`, `_layoutAnchorContents`) — old: chunk.vendor.js:116470-116544 (module 909)
- [ ] ENG-NODE-016 GElement.Accelerated mixin: quadtree indexes for children paint/geometry bbox, `retrieveChildrenInPaintBBox/GeometryBBox` — old: chunk.vendor.js:118216-118435 (module 912); quadtree impl chunk.vendor.js:31579-31748 (module 140)
- [ ] ENG-NODE-017 GBlock base (named, lockable, hideable): Visual `vis: true`; Meta `name: null` (xss-filtered), `lkt` LockType (P partial, F full), `plkt` ProgramLck bit flags (NoRealTime 1, NoSizeChanges 2, NoEdit 4, NoMove 8, NoOrigChildrenEdit 16, NoNewChildren 32, NoDelete 64, AlwaysBack 128, NoDirectVisibilityChange 256, NoSelect 512); lock/visibility propagate to children — old: chunk.vendor.js:15934-16149 (module 69)
- [ ] ENG-NODE-018 GBlock.LabelHolder mixin (page/symbol labels, label hit test and scaling) — old: chunk.vendor.js:15975-16017 (module 69)
- [ ] ENG-NODE-019 GItem base: Meta `clk: false` (click-through, skipped by selection), border width scaling on transform when border `_bs` or scene borderScale — old: chunk.vendor.js:26308-26389 (module 104)
- [ ] ENG-NODE-020 GShape base (not registered): Geometry `trf: null`, `bool: OR` (boolean role inside compound shape); Meta `scc: true` (children scale with container, else children get Start anchors); shapes are containers whose children are painted clipped to the shape; head/tail marker vertices — old: chunk.vendor.js:10792-12306 (module 56)
- [ ] ENG-NODE-021 GPathBase: Geometry/Meta `csc: true` (scale corners), Visual `evenodd: false`, anchor point container, referenced text and connector anchors (`reftxt`, `refanchors` in blob), `isClockWise`, `reverseOrder`, styled corners transform — old: chunk.vendor.js:8563-10189 (module 45)
- [ ] ENG-NODE-022 GPathBase.AnchorPoint node "anchorPoint": `tp` (CornerType or smooth type TA asymmetric, TS symmetric, TM mirror, TC connector), `x`,`y`, handles `hlx/hly/hrx/hry`, `ah` auto handles, `cu: true`, `cl`/`cr` corner radii; auto-handle and smooth/mirror calculation — old: chunk.vendor.js:8608-9280 (module 45)
- [ ] ENG-NODE-023 GPathBase.AnchorPoints container (unregistered), left/right invalidation, vertex generation with corners and shoulders — old: chunk.vendor.js:9281-9771 (module 45)
- [ ] ENG-NODE-024 CornerType enum: Rounded "R", InverseRounded "U", Bevel "B", Inset "I", Fancy "F" (used by rectangle, polygon, path anchors) — old: chunk.vendor.js:8594-8604 (module 45)
- [ ] ENG-NODE-025 GPath "path": Geometry `closed: false`; Meta `rtxt: null`; anchor points stored in blob `pts`; `isLine`, `insertHitPoint`, `correctClosedAttribute`, `addIntersectionPoints` — old: chunk.vendor.js:13598-14125 (module 60)
- [ ] ENG-NODE-026 GCompoundPath "compoundpath": Visual `evenodd: true`, Meta `csc: true`; sub-paths in "compoundpath.paths" container (stored as array of serialized path strings, multireference aware) — old: chunk.vendor.js:27224-27730 (module 113)
- [ ] ENG-NODE-027 GCompoundShape "Compound Shape" (name contains a space): live boolean of children by each child's `bool` (OR/XOR/AND/SUB), Visual `evenodd: false`, intersector disabled above 100 children — old: chunk.vendor.js:45149-45533 (module 233)
- [ ] ENG-NODE-028 GRectangle "rectangle": Geometry `uf: true` (uniform corners) and per corner `tl_/tr_/br_/bl_` + `uf: true`, `ct: Rounded`, `sx: 0`, `sy: 0` (corner type and x/y radius); base rect (-1,-1,2,2) mapped by `trf` — old: chunk.vendor.js:18943-19291 (module 73)
- [ ] ENG-NODE-029 GEllipse "ellipse": Geometry `sa: PI`, `ea: PI` (start/end angle; equal = full ellipse), `etp` Type Pie 0 / Chord 1 / Arc 2 — old: chunk.vendor.js:41332-41620 (module 214)
- [ ] ENG-NODE-030 GPolygon "polygon": Geometry `pts: 6`, `cx/cy: 0`, `or/ir: 0` outer/inner radius, `oa: 0`, `ia: 2PI-PI/3` outer/inner angle, `oct/ict` corner types (Rounded), `ocr/icr: 0` corner radii; stars = ir differs from or — old: chunk.vendor.js:54873-55101 (module 284)
- [ ] ENG-NODE-031 GSimpleShape "Ready Shape": predefined parameterized shape; blob `ssn` shape name, `icn` icon, `pvp` serialized vertex processor, `apv` annotation parameter values; draggable shape handles via `setAnnotationMouseLocation` — old: chunk.vendor.js:75037-75239 (module 530)
- [ ] ENG-NODE-032 GParameterizedVertexProcessor: vertices from Direct or Expression coordinates with min/max clamps, compiled with `Function(...)` after `isSecure` check; allowed Math funcs abs..trunc, min/max; serialize `[name, vertices, annotations, params]` — old: chunk.vendor.js:74697-74961 (module 528)
- [ ] ENG-NODE-033 GText "text": see TEXT section; inherits GShape with Reference mixin — old: chunk.vendor.js:16150-18930 (module 70)
- [ ] ENG-NODE-034 GImage "image" (inherits GRectangle, so corner radii apply): Meta `iw, ih, tmpUrl, storedUrl`; Geometry `px, py, pw, ph` (image rect/crop), `itrf` image transform; Visual `url`, `dblMode: false` (image transformed separately from frame), `ipfc: true`; types PNG/JPEG/GIF/BMP detected by magic bytes; ImageStatus Loaded/Resolving/Loading/Delayed/Error; `toFit` — old: chunk.vendor.js:24360-25312 (module 95)
- [ ] ENG-NODE-035 GImage CMYK JPEG handling: detects CMYK JPEG, converts with USWebCoatedSWOP ICC, ConvertStatus None/Checking/Converting/Converted/Failed — old: chunk.vendor.js:25153-25188 (module 95)
- [ ] ENG-NODE-036 GGroup "group": Geometry `trf: null`, `frm: null` (frame rect enabling constraints); style sets Style+Effects only; `setFrame` assigns Start anchors to children — old: chunk.vendor.js:27996-28262 (module 122)
- [ ] ENG-NODE-037 GLayer "layer": Visual `otl: false` (outline view), `prt: true` (printable), `cls: RGB(0,168,255)` layer color; Geometry `frm: false`; active layer stored as blob `__active`; may contain layers, lives in pages — old: chunk.vendor.js:33154-33443 (module 159)
- [ ] ENG-NODE-038 GPage "page": Geometry `w: 800`, `h: 600`, `x, y: 0`, `bl: 0` bleed, `ml/mt/mr/mb: 0` margins, `gp: 10`, `off: null` (page offset transform); Visual `bck: null` background pattern, `bop: 1`; w/h 0 = unbounded page — old: chunk.vendor.js:22592-23632 (module 83)
- [ ] ENG-NODE-039 GSymbol "symbol": Geometry `trf`, `frame`; Meta `masterRef`, `masterMultiRef`, `blockEv`, `dsb` (overridden sibling ids), `sbl` (nested symbol siblings), `swp`, `swpori` (swap state) — old: chunk.vendor.js:41907-44281 (module 216)
- [ ] ENG-NODE-040 GSlice "slice": Geometry `x, y: 0`, `w, h: 100`; Meta `trm: true` (trim), `cls: null` (color pattern) — old: chunk.vendor.js:55508-55609 (module 289)
- [ ] ENG-NODE-041 GConnector "connector" (a GPath): `connect(src, dst)` links first/last anchor to shapes via scene links, `relayout` picks nearest side centers with 5px offset — old: chunk.vendor.js:51219-51393 (module 268)
- [ ] ENG-NODE-042 GImageGrid "imagegrid": Geometry `grid` (rows of [w,h] cell fractions; default 3x3 layout), Visual `im: null`, `mg: 0.1` margin, `off: null`; images in "imagegrid.images" container; `addImage` — old: chunk.vendor.js:75465-75873 (module 534)
- [ ] ENG-NODE-043 GPathsGraph "Paths Graph" (vector network): anchors (MapContainer), edges ("GPathsGraph.Edges"), facets; `addAnchor/addEdge/splitEdge/connectAnchorsInPlace`, facet fill tree; blob keys `anchors`, `edges`, `facets` — old: chunk.vendor.js:35297-36864 (module 162)
- [ ] ENG-NODE-044 GPGAnchor "GPGAnchor": Geometry `uid`, `x`, `y`; EdgeType Out/In — old: chunk.vendor.js:91817-92129 (module 657)
- [ ] ENG-NODE-045 GPGEdge "GPGEdge": Geometry `uid`, `cSt: false` (custom style); source/destination anchor ids — old: chunk.vendor.js:61788-62258 (module 347)
- [ ] ENG-NODE-046 GPGFacet "GPGFacet": Geometry `uid`, `cSt`; DirectedEdge Straight/Reverse — old: chunk.vendor.js:91422-91816 (module 656)
- [ ] ENG-NODE-047 GCollabText "collabtext" (inherits GImage): Geometry `imgTrf`, `textTrf`; Meta `collab: true`, `Guid`; image/text mode switch, action buttons (GActionable) — old: chunk.vendor.js:75240-75341 (module 531); GActionable chunk.vendor.js:56598-56667 (module 327); GActionItem chunk.vendor.js:100521-100531 (module 727)
- [ ] ENG-NODE-048 GScene "scene": root; see SCENE section — old: chunk.vendor.js:33444-35149 (module 160)

### Annotations and comments (NODE, continued)

- [ ] ENG-NODE-049 GAnnotation mixin: Flag Hidden 1<<21; Meta `vis, name, text, img, uid, email, time, mtime, seq, loc, typ, rsv, rmd, sid, read, asgn, Guid, atp`; ignores `plkt, lkt, rtxt`; `addComment`, read/unread status, store/restore actions — old: chunk.vendor.js:23633-23778 (module 84)
- [ ] ENG-NODE-050 GComment "cmt": Type User 0 / Open 1 / Close 2; Meta `text, uid, time, mtime, seq, name: "", img, email, type, rmd, sid, read, asgn, Guid, atp` — old: chunk.vendor.js:63870-63955 (module 366)
- [ ] ENG-NODE-051 GAnnotationsList "annlst" (per page container): Meta `pgid, Guid, aid, rmd, sid`; own bbox/hit test/paint — old: chunk.vendor.js:72890-73242 (module 506)
- [ ] ENG-NODE-052 GRectangleAnnotation "anr" (GRectangle + GAnnotation) — old: chunk.vendor.js:55952-56016 (module 316)
- [ ] ENG-NODE-053 GEllipseAnnotation "ane" (GEllipse + GAnnotation) — old: chunk.vendor.js:56017-56081 (module 317)
- [ ] ENG-NODE-054 GHighlighterAnnotation "anh" (GPath + GAnnotation) — old: chunk.vendor.js:56082-56149 (module 318)
- [ ] ENG-NODE-055 GArrowAnnotation "anarr" (GPath + GAnnotation) — old: chunk.vendor.js:56150-56218 (module 319)
- [ ] ENG-NODE-056 GPencilAnnotation "anp" (GPath + GAnnotation) — old: chunk.vendor.js:56219-56286 (module 320)
- [ ] ENG-NODE-057 GTextAnnotation "ant" (GText + GAnnotation) — old: chunk.vendor.js:64822-64891 (module 370)
- [ ] ENG-NODE-058 GCommentAnnotation "anc" (GPath pin + GAnnotation, inside-path hit test) — old: chunk.vendor.js:55102-55337 (module 285)
- [ ] ENG-NODE-059 GEmptyAnnotation "ann" (non-visual comment thread holder) — old: chunk.vendor.js:235423-235486 (module 1035)
- [ ] ENG-NODE-060 GCollaborativeTextAnnotation "ancotext" (GRectangle + GAnnotation + Linkable) and GAnnotable mixin — old: chunk.vendor.js:75364-75464 (module 533); chunk.vendor.js:75342-75363 (module 532)
- [ ] ENG-NODE-061 GElement.Linkable mixin: Meta `targetGuid`; blob `annotablerefs` links annotations to elements — old: chunk.vendor.js:118908-118940 (module 914)

### Style system (STYLE)

- [ ] ENG-STYLE-001 GStylable mixin with property sets: Style "S", Effects "E", Text "T", Paragraph "P", FillPaintLayers "FL", BorderPaintLayers "BL"; `getStylePropertySets()` per class — old: chunk.vendor.js:6515-6522, 6594 (module 28)
- [ ] ENG-STYLE-002 Style set "S": `_sdf: null` (default-style type id), `_sbl: normal` (element blend), `_sfop: 1` (fill opacity), `_stop: 1` (total opacity) — old: chunk.vendor.js:6523-6531 (module 28)
- [ ] ENG-STYLE-003 Paint layers storage: element blob `_layers` (stored paintLayers node) or `_layId`; effects as `_eff` or `_effId` — old: chunk.vendor.js:6801-6874 (module 28)
- [ ] ENG-STYLE-004 GStylable.PaintLayer "paintLayer": Visual `_pt: null` (pattern), `_op: 1`, `_vs: true`, `_bl: normal`; Geometry `_px: null` (pattern transform); `hasStyle`, `isMask`, WebGL blend modes dropped when `noWebGL` — old: chunk.vendor.js:115463-115631 (module 900)
- [ ] ENG-STYLE-005 GStylable.FillPaintLayer "fillPaintLayer": separate-layer rendering when blend is "color"; destroys WebGL patterns on detach — old: chunk.vendor.js:115639-115697 (module 901)
- [ ] ENG-STYLE-006 GStylable.PaintLayers "paintLayers" container: fill/border layer queries, `hasFillMaskLayers`, `hasSeparateFillLayer` — old: chunk.vendor.js:115907-116054 (module 904)
- [ ] ENG-STYLE-007 Shared styles GStyle "style": Meta `name`, `ps` (property sets, default all six), `defaultStyle: true`; elements reference via `sref` (Stylable Geometry) and scene links; `assignStyleFrom` pushes to linked elements, `disconnectStyle` — old: chunk.vendor.js:74133-74191 (module 511); sref chunk.vendor.js:117518 (module 911)
- [ ] ENG-STYLE-008 Styles container "styles" (child of scene) with built-in default styles per type: Shape (white fill, black border), Text, Rectangle (fill 235,235,235), Ellipse, Polygon, Path, Paths graph, Connector and all annotation types (text annotation: multiply blend, black text); `repairSdf`, `setColorMode` — old: chunk.vendor.js:118941-119351 (module 915)
- [ ] ENG-STYLE-009 Swatches: "swatches" container under scene, "swatch" node with `_pt`, `_op: 1`, `isCMYK`; equality compares noise type and texture fields — old: chunk.vendor.js:93280-93296 (module 662); chunk.vendor.js:74251-74329 (module 517)
- [ ] ENG-STYLE-010 Stylable painting: style layers, separate layers, composite with background, effect cache (`_fxCache`), style mask clip area — old: chunk.vendor.js:117516-118207 (module 911)
- [ ] ENG-STYLE-011 Element opacity/visibility of paint: `hasStyleFill/hasStyleBorder`, `getStyleBorderPadding` (center w/2, outside w, inside 0), `equalsStyle`, `assignStyleFrom` — old: chunk.vendor.js:6625-6756, 6900 (module 28)

### Fills (FILL)

- [ ] ENG-FILL-001 Fill = FillPaintLayer whose `_pt` is any GPattern (color, gradient, texture, noise, background); multiple fills stacked with own opacity/blend/visibility — old: chunk.vendor.js:115639 (module 901)
- [ ] ENG-FILL-002 Fill masks: texture pattern with `_mask` makes the layer a mask over lower layers — old: chunk.vendor.js:115623, 115979 (module 900, 904); chunk.vendor.js:31292-31297 (module 139)
- [ ] ENG-FILL-003 GShape fill painting: `createShapePaint`, `_paintFill`, `_paintFillLayers`, `_paintFillMaskLayers`, pattern bbox, pixel snapping (`makeSharp`) — old: chunk.vendor.js:11152-11430 (module 56)
- [ ] ENG-FILL-004 Fill rule: per element `evenodd` (path false, compoundpath true, compound shape false), `FillRule` nonzero/evenodd — old: chunk.vendor.js:8605, 27246, 4097 (modules 45, 113, 14)

### Borders (BORDER)

- [ ] ENG-BORDER-001 BorderPaintLayer "borderPaintLayer": Geometry `_bw: 1` width, `_ba: "C"` alignment, `_blc: "square"` cap, `_blj: "miter"` join, `_bml: 3` miter limit; Visual `_bds: null` dash array; Meta `_bs: false` (scale with object) — old: chunk.vendor.js:115706-115735 (module 902)
- [ ] ENG-BORDER-002 Border alignment: Center "C", Outside "O", Inside "I" — old: chunk.vendor.js:6481-6485 (module 28)
- [ ] ENG-BORDER-003 Line caps butt/round/square and joins miter/bevel/round — old: chunk.vendor.js:4040-4049 (module 14)
- [ ] ENG-BORDER-004 Border markers (arrowheads): `_bhm` head and `_btm` tail marker (serialized vertex container), `_bhms/_btms: 1` scale, `_bhmo/_btmo: false` offset, `_bhmi/_btmi: 1` inside; marker types Circle C, Bullet B, Diamond D, Line L, LineDouble LD, Arrow A, ArrowFat AF, ArrowLine AL, ArrowDoubleLine ADL, ArrowLineBar ALB, ArrowPointer AP; marker cache size 10 — old: chunk.vendor.js:6486-6498, 115727-115734 (modules 28, 902); chunk.vendor.js:12037-12048 (module 56)
- [ ] ENG-BORDER-005 Border painting incl. separate inside/outside strokes, miter limit approximation, marker vertices and bbox — old: chunk.vendor.js:11648-12036 (module 56)
- [ ] ENG-BORDER-006 Border scaling on transform (GItem `_handleBorderScale`, scene `setBorderScale`, `setCornersScale`) — old: chunk.vendor.js:26361-26386 (module 104); chunk.vendor.js:35096-35104 (module 160)

### Effects (EFFECT)

- [ ] ENG-EFFECT-001 GStylable.Effects "effects" container: ordered Pre, Filter/Multi, Post per paint layer (`ly`), `getEffectsPadding/BBox`, pre-effects kept before others on insert — old: chunk.vendor.js:116060-116215 (module 905)
- [ ] ENG-EFFECT-002 GStylable.Effect base: Geometry `vs: true` (visible), `ly: null` (target style layer); Type PreEffect 0, PostEffect 1, Filter 2, Multi 3; padding, native canvas filter path, cacheable — old: chunk.vendor.js:116224-116380 (module 906)
- [ ] ENG-EFFECT-003 GBlurEffect "blurEffect" (Filter): `r: 5`, `b: false` (clip to shape); native canvas blur, else GL blur, else stack blur — old: chunk.vendor.js:46256-46345 (module 249); stack blur chunk.vendor.js:121288-121506 (module 931)
- [ ] ENG-EFFECT-004 GDropShadowEffect "dropShadowEffect" (Pre): `r: 5`, `x: 0`, `y: 0`, `pat: black`, `opc: 0.65`; r range 0-200 — old: chunk.vendor.js:56287-56418 (module 321)
- [ ] ENG-EFFECT-005 GInnerShadowEffect "innerShadowEffect" (Post): `r: 5`, `x: 0`, `y: 0`, `pat: black`, `opc: 0.5`; r 0-200 — old: chunk.vendor.js:70550-70674 (module 432)
- [ ] ENG-EFFECT-006 GOverlayEffect "overlayEffect" (Filter): `pat` default linear gradient black to transparent white, `opc: 1`, `alm: false` (alpha mask) — old: chunk.vendor.js:100569-100677 (module 729)
- [ ] ENG-EFFECT-007 GMirrorEffect "mirrorEffect" (Post, singleton): `rfh: 0.3` reflection height, `pad: 1`; `pat` white gradient at 90 deg, `opc: 0.6` — old: chunk.vendor.js:111103-111285 (module 840)
- [ ] ENG-EFFECT-008 GColorGradingEffect "clGradingEffect" (Filter): Visual `cp: null` (curves per channel a/r/g/b via cubic spline lookup tables) — old: chunk.vendor.js:233926-233967 (module 1008); curves chunk.vendor.js:233968-234086 (module 1009)
- [ ] ENG-EFFECT-009 GContactShadowEffect "contactShadowEffect" (Post): `r: 5`, `a: 5`, `o: 5`, `pat: black`, `opc: 0.75`; r 5-200 — old: chunk.vendor.js:234774-234976 (module 1028)
- [ ] ENG-EFFECT-010 GCurvedShadowEffect "curvedShadowEffect" (Pre): `s: 1`, `b: 10`, `a: 270`, `l: 5`, `c: 0.8`, `pat: black`, `opc: 0.65` — old: chunk.vendor.js:234977-235102 (module 1029)
- [ ] ENG-EFFECT-011 GLongShadowEffect "longShadowEffect" (Pre): `l: 60` length, `a: -45 deg`, `pat: black`, `opc: 0.2`, `den: 1` density, `fdm: true` fade — old: chunk.vendor.js:235180-235298 (module 1031)
- [ ] ENG-EFFECT-012 GMultiEffect "multiEffect" (abstract): bundles sub-effects registered via `register(cls, [fx...])`, props namespaced `<fxName>&<prop>`, `fxP/fxN` — old: chunk.vendor.js:75874-76053 (module 535)
- [ ] ENG-EFFECT-013 GColorAdjustMultiEffect "colorAdjustMultiEffect" = BrightnessContrast + HueSaturation, rendered by one GGLColorAdjustEffect — old: chunk.vendor.js:234663-234752 (module 1026)
- [ ] ENG-EFFECT-014 GAdjustMultiEffect "adjustMultiEffect" = DotScreen + Sepia + GLBlur — old: chunk.vendor.js:234753-234773 (module 1027)
- [ ] ENG-EFFECT-015 GWebGLEffect "GWebGLEffect" base (Filter): Geometry `shp` (shader params object), `sh` (shader class name), RANGES per effect, polynomial slider transform, shader lookup by name — old: chunk.vendor.js:10280-10390 (module 51); shader map designer.browser.dev.js:52403-52495 (module 817 -> vendor 206, 315, 346, 364, 365, 474-504)
- [ ] ENG-EFFECT-016 GGLBlurEffect: `radius: 5` (0-50), `clip: false`; clip variant shader — old: chunk.vendor.js:54671-54742 (module 282)
- [ ] ENG-EFFECT-017 GGLColorAdjustEffect: `brightness, contrast, hue, saturation: 0` (each -1..1); Meta `comp: true` — old: chunk.vendor.js:82571-82661 (module 588)
- [ ] ENG-EFFECT-018 GGLNoiseEffect: `amount: 0.5` (0-1); also used by GNoisePattern with `colored`, `transparency` — old: chunk.vendor.js:93254-93279 (module 661)
- [ ] ENG-EFFECT-019 GGLSepiaEffect: `amount: 0.5` (0-1) — old: chunk.vendor.js:100532-100568 (module 728)
- [ ] ENG-EFFECT-020 GGLBrightnessContrastEffect: `brightness, contrast: 0` (-1..1) — old: chunk.vendor.js:100678-100727 (module 730)
- [ ] ENG-EFFECT-021 GGLDotScreenEffect: `centerX/centerY: 50` (0-100), `angle: 0` (0-PI/2), `size: 10` (0-20) — old: chunk.vendor.js:100728-100762 (module 731)
- [ ] ENG-EFFECT-022 GGLHueSaturationEffect: `hue, saturation: 0` (-1..1) — old: chunk.vendor.js:100763-100813 (module 732)
- [ ] ENG-EFFECT-023 GGLZoomBlurEffect: `centerX/centerY: 50`, `strength: 0.3` (0-0.5) — old: chunk.vendor.js:111066-111102 (module 839)
- [ ] ENG-EFFECT-024 GGLBulgePinchEffect: `centerX/centerY: 50`, `radius: 50` (0-100), `strength: 0.5` (-1..1) — old: chunk.vendor.js:233760-233827 (module 1004)
- [ ] ENG-EFFECT-025 GGLEdgeWorkEffect: `radius: 10` (1-200) — old: chunk.vendor.js:233828-233856 (module 1005)
- [ ] ENG-EFFECT-026 GGLColorHalfToneEffect: `centerX/centerY: 50`, `angle: 0` (0-PI/2), `size: 50` (3-20) — old: chunk.vendor.js:233857-233892 (module 1006)
- [ ] ENG-EFFECT-027 GGLHexagonalEffect: `centerX/centerY: 50`, `scale: 1` (0-100) — old: chunk.vendor.js:233893-233925 (module 1007)
- [ ] ENG-EFFECT-028 GGLInnerGlowEffect (Filter): `radius: 5` (0-50), `intensity: 1` (0-2), `color: [255,255,224]`, `opacity: 1` — old: chunk.vendor.js:234087-234137 (module 1010)
- [ ] ENG-EFFECT-029 GGLToonEffect: `threshold: 0.2` (0-2), `quantization: 10` (0-20) — old: chunk.vendor.js:234138-234165 (module 1011)
- [ ] ENG-EFFECT-030 GGLBloomEffect: `bloomIntensity: 1.25`, `baseIntensity: 1`, `bloomSaturation: 1`, `baseSaturation: 1` (0-2 each), `blurRadius: 4` (0-50), `bloomThreshold: 0.25` (0-0.99) — old: chunk.vendor.js:234166-234201 (module 1012)
- [ ] ENG-EFFECT-031 GGLTrueBlurEffect: `radius: 5` (0-50) — old: chunk.vendor.js:234202-234227 (module 1013)
- [ ] ENG-EFFECT-032 GGLDenoiseEffect: `exponent: 10` (0-50) — old: chunk.vendor.js:234228-234256 (module 1014)
- [ ] ENG-EFFECT-033 GGLOuterGlowEffect (Post): `radius: 5`, `intensity: 1`, `color: [255,255,224]`, `opacity: 1` — old: chunk.vendor.js:234257-234307 (module 1015)
- [ ] ENG-EFFECT-034 GGLSwirlEffect: `centerX/centerY: 50`, `radius: 50` (0-100), `angle: 0.5` (-PI..PI) — old: chunk.vendor.js:234308-234365 (module 1016)
- [ ] ENG-EFFECT-035 GGLVignetteEffect: `size: 0.2`, `amount: 0.5` (0-1) — old: chunk.vendor.js:234366-234393 (module 1017)
- [ ] ENG-EFFECT-036 GGLStrokeLayerEffect: `width: 5` (0-100), `softness: 0.5` (0.01-1), `shape: 0.7071` (0-2), `color: white`, `opacity: 1`, `ellyptical: false`, `placement` dropdown outside/inside/center — old: chunk.vendor.js:234394-234462 (module 1018)
- [ ] ENG-EFFECT-037 GGLInkEffect: `strength: 0.5` (0-1) — old: chunk.vendor.js:234463-234488 (module 1019)
- [ ] ENG-EFFECT-038 GGLUnsharpMaskEffect: `radius: 0` (0-200), `strength: 0` (0-5) — old: chunk.vendor.js:234489-234516 (module 1020)
- [ ] ENG-EFFECT-039 GGLVibranceEffect: `amount: 0.5` (-1..1) — old: chunk.vendor.js:234517-234542 (module 1021)
- [ ] ENG-EFFECT-040 GGLSketchEffect: `strength: 0.5` (0-2) — old: chunk.vendor.js:234543-234568 (module 1022)
- [ ] ENG-EFFECT-041 GGLLensBlurEffect: `radius: 10` (0-50), `brightness: 0` (-1..1), `angle: 0` (-PI..PI) — old: chunk.vendor.js:234569-234598 (module 1023)
- [ ] ENG-EFFECT-042 GGLTiltShiftEffect: `startX: 25, startY: 50, endX: 75, endY: 50` (0-100), `blurRadius: 10` (0-50), `gradientRadius: 30` (0-100) — old: chunk.vendor.js:234599-234634 (module 1024)
- [ ] ENG-EFFECT-043 GGLRecolourEffect: `hue: 1`, `saturation: 1` (0-1) — old: chunk.vendor.js:234635-234662 (module 1025)
- [ ] ENG-EFFECT-044 GGLBendBlurEffect (registered by name, not in module 1 registry): `radius: 50` (0-100), `softness: 1` (0-50), `bend: 50` (0-50), `cov: 0.8` (0-1) — old: chunk.vendor.js:235103-235179 (module 1030)
- [ ] ENG-EFFECT-045 GGLBendEffect: `strengthX: 0.5`, `strengthY: 0` (-1..1), `radius: 50` (0-100) — old: chunk.vendor.js:235299-235349 (module 1032)
- [ ] ENG-EFFECT-046 GGLDrunkEffect: `strengthX: 0.5`, `strengthY: 0`, `radius: 50` — old: chunk.vendor.js:235350-235388 (module 1033)
- [ ] ENG-EFFECT-047 GGLFisheyeEffect: `strength: 50` (-100..100), shader name "GGLFishEyeShader" — old: chunk.vendor.js:235389-235422 (module 1034)
- [ ] ENG-EFFECT-048 Effect cache and render pipeline per element (`_paintWithEffects`, `_getFxCache/_setFxCache`, `defaultEffectDetailLevel`) — old: chunk.vendor.js:117696-118037 (module 911)

### Blend modes and compositing (BLEND)

- [ ] ENG-BLEND-001 Canvas blend modes (string ids): normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity — old: chunk.vendor.js:4050-4067 (module 14)
- [ ] ENG-BLEND-002 WebGL-only blend modes: linear_burn, linear_dodge, vivid_light, linear_light, pin_light, divide, add, subtract, hardmix, power, harmonic, sin (fall back to normal when WebGL is off) — old: chunk.vendor.js:4068-4082 (module 14); GL blend shader chunk.vendor.js:61679-61787 (module 346)
- [ ] ENG-BLEND-003 Composite operators source-over ... xor, lighter, darker (used for masks and effects) — old: chunk.vendor.js:4083-4096 (module 14)
- [ ] ENG-BLEND-004 Blend scopes: element `_sbl` (style set S), per paint layer `_bl`, effect `ly` targeting; "color" fill blend forces separate layer — old: chunk.vendor.js:6523-6531, 115482-115487, 115680 (modules 28, 900, 901)
- [ ] ENG-BLEND-005 Opacity scopes: element `_stop` total and `_sfop` fill opacity, paint layer `_op`, page `bop`, swatch `_op`, gradient stop `opacity` — old: chunk.vendor.js:6523-6531 (module 28); chunk.vendor.js:115482 (module 900)

### Colors (COLOR)

- [ ] ENG-COLOR-001 GColor base pattern: `_value` array, `serialize` = JSON array, `toScreen`, `toScreenCSS`, `asCSSBackground`; ColorModes RGB/HSB/CMYK — old: chunk.vendor.js:15423-15933 (module 68)
- [ ] ENG-COLOR-002 GRGBColor pattern id "C": [r,g,b] clamped 0-255; BLACK/WHITE/RED; `parseCSSColor` (rgb/rgba/hsl/hex/CSS names table incl. transparent), `fromCSSColor`, `mix`, `blend`, `getClosestCSSName` — old: chunk.vendor.js:5121-5447 (module 17)
- [ ] ENG-COLOR-003 GCMYKColor pattern id "Y": [c,m,y,k] 0-1, default [1,1,1,1]; screen via `cmykToRGB` — old: chunk.vendor.js:39012-39048 (module 188)
- [ ] ENG-COLOR-004 GHSVColor pattern id "H" (extends RGB): [h,s,v] — old: chunk.vendor.js:86931-86960 (module 649)
- [ ] ENG-COLOR-005 Conversions rgbToHSV, hsvToRGB, hsvToCMYK, cmykToHSV, cmykToRGB, rgbToCMYK (ICC-based when profile loaded), rgbToHtmlHex, rgbToCSS — old: chunk.vendor.js:15489-15885 (module 68)
- [ ] ENG-COLOR-006 ICC profile support: `setCMYKProfile("USWebCoatedSWOPv2")` loads `assets/data/icc/USWebCoatedSWOP.icc` (XHR or fs), D50 white point; ICC parser with device classes, color spaces, tags, intents — old: chunk.vendor.js:15442-15488 (module 68); parser chunk.vendor.js:83201-83444 (module 641)
- [ ] ENG-COLOR-007 GColorHelper.convertColor between color modes; scene `cm` change converts all style layers — old: chunk.vendor.js:86908-86930 (module 648); chunk.vendor.js:34958 (module 160)

### Gradients (GRAD)

- [ ] ENG-GRAD-001 GGradient base: stops `{position 0-1, color, opacity}` sorted, default white->black; `_scale: 1`, focal `_fx/_fy: 0.5`, `_transform`; blob `s, t, fx, fy, x:[{p,c,o}]` — old: chunk.vendor.js:30841-31032 (module 138)
- [ ] ENG-GRAD-002 GLinearGradient id "L": `_angle` (blob `r`), `_fx` default 0 — old: chunk.vendor.js:31878-31932 (module 147)
- [ ] ENG-GRAD-003 GRadialGradient id "R": `_scale` default 0.5, center `_cx/_cy: 0.5` — old: chunk.vendor.js:33090-33153 (module 158)
- [ ] ENG-GRAD-004 GAngularGradient id "A": WebGL shader rendered, `_scale: 0.5`, start angle `_a0` (blob `a0`), GL bug workaround flag — old: chunk.vendor.js:54743-54872 (module 283)
- [ ] ENG-GRAD-005 Gradient CSS output (`toScreenCSS`, `asCSSBackground`) for UI previews — old: chunk.vendor.js:30953-30966, 31901 (modules 138, 147)

### Patterns (PATTERN)

- [ ] ENG-PATTERN-001 GPattern registry: class ids "C" RGB, "Y" CMYK, "H" HSV, "L" linear, "R" radial, "A" angular, "T" texture, "N" noise, "B" background; MIME `application/gravit+pattern`; chessboard CSS background — old: chunk.vendor.js:10210-10279 (module 50)
- [ ] ENG-PATTERN-002 GTexturePattern "T": image url or embedded node (`n`), RepeatMode repeat/repeat-x/repeat-y/no-repeat, SizeMode auto/contain/cover/percent/length, PositionMode auto/top/left/center/right/bottom, ScaleMode fill/fit/stretch/tile (presets), width/height, angle, tileSize, mask flag, transform; blob `t,u,r,s,w,h,p,m,a,sm,ts,n,surl` — old: chunk.vendor.js:31033-31578 (module 139)
- [ ] ENG-PATTERN-003 GNoisePattern "N" (extends texture): Type original/black/white/color, `amount`, rendered by an internal rectangle with GGLNoiseEffect; blob adds `amount`, `type` — old: chunk.vendor.js:74330-74466 (module 518)
- [ ] ENG-PATTERN-004 GBackground "B": "page background" placeholder pattern (transparent, striped CSS preview) — old: chunk.vendor.js:48975-49003 (module 265)
- [ ] ENG-PATTERN-005 Image dictionary for pattern and image URLs: `dictionary://<uuid>` entries with reference counting, cached canvas, `cloud` protocol; scene-level wrapper resolves missing entries and redirects — old: chunk.vendor.js:44867-45000 (module 227); chunk.vendor.js:92130-92374 (module 658)

### Text (TEXT)

- [ ] ENG-TEXT-001 GText geometry: `aw: true`, `ah: true` (auto width/height), `afs: false` (auto-fit font size), `va` vertical align Top "t"/Middle "m"/Bottom "b", `ttrf`, `head: 0`, `content` (rich runs JSON), `w/h: 1` (constructor sets 142 x 27.236), `dir: ltr` — old: chunk.vendor.js:16219-16235 (module 70)
- [ ] ENG-TEXT-002 GText meta `_we: false`, `_bkpPath: null` (outline backup, not stored since `dontStorePaths`), `sc: false`, `_ed: true`; MAXLENGTH 8192 — old: chunk.vendor.js:16198-16202, 16260-16265 (module 70)
- [ ] ENG-TEXT-003 Character style set "T": `_tff` family, `_tfi: 20` size, `_tfw: 400`, `_tfs: "N"`, `_tcs` letter spacing, `_tws` word spacing, `_ttrf` transform, `_ttsc` script, `_tlsc` lang script, `_tv` variant, `_tdu` underline, `_tds` strikeout, `_tlig: "auto"`, `_tfrac`, `_tstyls` stylistic set, `_tlocl` localized form, `_fc` font color (pattern) — old: chunk.vendor.js:6532-6567 (module 28)
- [ ] ENG-TEXT-004 Paragraph style set "P": `_pal` align (l/c/r/j), `_plh: 1` line height, `_pas: "0"` paragraph spacing, `_pai: 0` indent — old: chunk.vendor.js:6568-6575, 6499-6504 (module 28)
- [ ] ENG-TEXT-005 Style-key to run-format mapping (`_tff` -> fontFamily ... `_tv` -> variant) used when applying element style to all runs — old: chunk.vendor.js:16236-16258 (module 70)
- [ ] ENG-TEXT-006 Run formatting keys and defaults: fontSize 10, fontColor transparent, align left, script normal, langScript auto, charSpacing 0, lineSpacing 1, paragraphSpacing "0", paragraphIndent 0, wordSpacing 0, listDepth 0, listMarker null, ligatures, fractions, variant, transformation, stylisticSet, localizedForm — old: chunk.vendor.js:31933-32144 (module 148)
- [ ] ENG-TEXT-007 Sub/superscript ("sub"/"super") and text transform Uppercase u / Lowercase l / Capitalize c / SmallCaps s (small caps falls back to Unicode small-cap letters) — old: chunk.vendor.js:6505-6514 (module 28); chunk.vendor.js:26416-26443 (module 108)
- [ ] ENG-TEXT-008 Decorations underline/strikeout (strikeout position/width from font) — old: chunk.vendor.js:6532 (module 28); chunk.vendor.js:82461-82478 (module 587)
- [ ] ENG-TEXT-009 Lists: markers Bullet, Check, Square, Number, RomanBracket, RomanDot with listDepth; listify/unlistify, increase/decrease/toggle list; marker glyph shapes (CircleFilled, SquareOutlined, DiamondFilled, ...) — old: chunk.vendor.js:16211-16218 (module 70); chunk.vendor.js:119352-119762 (module 916); chunk.vendor.js:120712-121002 (module 925)
- [ ] ENG-TEXT-010 List control codes ListStart/ListNext/ListEnd in the run stream — old: chunk.vendor.js:64793-64803 (module 368); chunk.vendor.js:120241-120568 (module 920)
- [ ] ENG-TEXT-011 Text layout core (GTL, a carota fork): document model, words/runs, layout, selection, ranges, undo/redo transactions, edit filters, caret — old: chunk.vendor.js:89609-90262 (module 652); chunk.vendor.js:63956-64792 (module 367); util chunk.vendor.js:35150-35296 (module 161)
- [ ] ENG-TEXT-012 Text on path: `atPath` (serialized path), `tpthd` direction outwards/inwards, `tptho` offset, `tpths` side inside/outside, `tpthl` distance; `attachPath`, linked via scene links — old: chunk.vendor.js:16360-16496 (module 70); transformer chunk.vendor.js:41621-41906 (module 215)
- [ ] ENG-TEXT-013 Text direction LTR/RTL and vertical TTB/BTT via direction transformer — old: chunk.vendor.js:49004-49110 (module 266)
- [ ] ENG-TEXT-014 Auto-fit font size `adaptFontSizeToFitBBox` — old: chunk.vendor.js:18877-18924 (module 70)
- [ ] ENG-TEXT-015 Text to outlines: `getTextShapes`, `toFakeText` / fake text with backup paths when fonts are missing, `hasEmbeddedFonts`, `replaceFonts` — old: chunk.vendor.js:16755-16880, 17870-17998 (module 70)
- [ ] ENG-TEXT-016 Text storage: blob `ct` rich content (array of runs) and `content` JSON string with `fontColor` serialized as pattern; temp text, edited-range save — old: chunk.vendor.js:18030-18093, 16266-16279 (module 70)
- [ ] ENG-TEXT-017 OpenType features: liga/rlig, frac, stylistic sets, localized forms (locl), variants (fvar axes); Features ids smcp, frac, fvar, stylisticset, locl — old: chunk.vendor.js:26409-26415 (module 108); chunk.vendor.js:82364-82445, 82498-82560 (module 587)
- [ ] ENG-TEXT-018 HarfBuzz shaping wrapper: Buffer (language, direction, script, reverse), Font (scale, variations, stylistic set, features, `getGlyphs` via hb_shape); DIRECTIONS ltr/rtl/ttb/btt; SCRIPTS tag table — old: chunk.vendor.js:110635-111065 (module 838); emscripten module chunk.vendor.js:128962-232686 (module 998)
- [ ] ENG-TEXT-019 Script/direction detection per string and BCP47 mapping of OpenType language tags — old: chunk.vendor.js:82062-82099 (module 587)

### Fonts (FONT)

- [ ] ENG-FONT-001 GFont abstract: family/style/weight, Style Normal "N" / Italic "I", Weight 100-900 with localized names (regular and italic), glyph API (baseline, outline, bbox, advance, bearings, max height), `toFontFaceSrc`, `getFontFamilyCorrected` (Noto Sans CS/CT -> CJK SC/TC) — old: chunk.vendor.js:26402-26569 (module 108)
- [ ] ENG-FONT-002 GFontManager: default font/styles/weights, `getFont`, `queryFontFamily`, `removeFont`, unresolved/pending tracking; events FontAvailable, FontUnavailable, ResolveFont, QueryFontFamily — old: chunk.vendor.js:54490-54670 (module 281)
- [ ] ENG-FONT-003 GOpenTypeFont: wraps opentype.js font plus HarfBuzz font, outline/bounds caches, `stringToGlyphs` with features, available scripts/variants/stylistic sets/language tags — old: chunk.vendor.js:81990-82570 (module 587)
- [ ] ENG-FONT-004 GOpenTypeUtil: binary struct parser for font containers (incl. Mac resource-style Pascal strings), name ids, `getOpenTypeInfo`, offset patching — old: chunk.vendor.js:99760-100520 (module 726)
- [ ] ENG-FONT-005 Placeholder font object (`DEFAULTFONT = new X("gravit","is","thebest")`) used before resolution — old: chunk.vendor.js:81513-81536 (module 568); chunk.vendor.js:16201 (module 70)
- [ ] ENG-FONT-006 Custom (uploaded) font families listed in scene `cst` — old: chunk.vendor.js:34745-34747, 34771 (module 160)

### Geometry and math (GEOM)

- [ ] ENG-GEOM-001 GPoint: x/y, min/max/equals, scale, multiply, add/subtract, cross/dot, translated/rotated/rotatedAt, lerp — old: chunk.vendor.js:1487-1577 (module 5)
- [ ] ENG-GEOM-002 GRect: x/y/w/h, Side enum (tl, tc, tr, rc, br, bc, bl, lc, cc), contains/intersects/united/subtracted/intersected, expanded/scaled, aligned/grid/rounded variants, `getSide`; serialize `[x,y,w,h]` — old: chunk.vendor.js:1578-2079 (module 6)
- [ ] ENG-GEOM-003 GTransform 2x3 matrix: multiply/preMultiply, invert, rotate/translate/scale/skew, map point/rect/quad, decomposed/noSkewDecomposed, makeInvertible, rect helpers (getNativeRectTransformation, getResizeTransform, correctForFrame); serialize identity as `[]` — old: chunk.vendor.js:2080-2477 (module 7)
- [ ] ENG-GEOM-004 GUtil helpers used by the model: uuid, xss, extend, equals (deep), packPoint/unpackPoint (2 x float32 base64), unpackNumbers, formatNumber — old: chunk.vendor.js:2484-2828 (module 11)
- [ ] ENG-GEOM-005 GMath: eps compare, angles, distances, line/segment/circle intersections, bezier eval/split/derivatives/arc length/self intersections, polynomial roots (Sturm, Descartes, Newton), point at length — old: chunk.vendor.js:2829-4009 (module 12)
- [ ] ENG-GEOM-006 GVertex commands Move 1, Line 2, Curve 3 (cubic), Curve2 4 (quadratic), Close 5 — old: chunk.vendor.js:10195-10208 (module 48)
- [ ] ENG-GEOM-007 GVertexSource interface (rewind/read/hasVertexForRead, isClockWise, toSVGPath) and GVertexTarget — old: chunk.vendor.js:23781-23904 (module 87); chunk.vendor.js:115882-115901 (module 903)
- [ ] ENG-GEOM-008 GVertexContainer: vertex array, serialize/deserialize, split/merge sources, makeClockWise, clone — old: chunk.vendor.js:10587-10790 (module 54)
- [ ] ENG-GEOM-009 GVertexInfo: bounds, path length, segment point, hit test (outline/segment/slope) — old: chunk.vendor.js:12309-13597 (module 59)
- [ ] ENG-GEOM-010 GVertexTransformer (transform a source) and GVertexPixelAligner (pixel snapping) — old: chunk.vendor.js:14128-14177 (module 63); chunk.vendor.js:31749-31866 (module 141)
- [ ] ENG-GEOM-011 GPathUtil: makeClockWise, createPathFromVertexSource (vertices -> GPath anchors) — old: chunk.vendor.js:37636-37776 (module 179)
- [ ] ENG-GEOM-012 GLength units pt, px, pc, in, mm, cm, pix, cc, dd, ft, yd, mi, m, km, q, h; DPI 72, default unit px; `parseLength`, `parseEquation` with lexer/parser/evaluator for typed math — old: chunk.vendor.js:30281-30760 (module 132)
- [ ] ENG-GEOM-013 GBitmap image operations: applyFilter, crop, resize, trim, getPixelValue, modifyPixels, setDPI, toImageBlob/Buffer/DataUrl (PNG/JPEG) — old: chunk.vendor.js:61377-61678 (module 345)
- [ ] ENG-GEOM-014 GSceneUtil.asFlattenElement — old: chunk.vendor.js:232834-232870 (module 1001)
- [ ] ENG-GEOM-015 GHitResult (element, data) used by hit testing — old: chunk.vendor.js:45065-45073 (module 229)

### Boolean operations (BOOL)

- [ ] ENG-BOOL-001 GVertexPolyBoolean ops OR 1, XOR 2, AND 3, SUB 4 on vertex sources with curve-aware polylines, inside test by winding or even-odd, hole detection, union/intersection/diff/xor — old: chunk.vendor.js:46723-48974 (module 264)
- [ ] ENG-BOOL-002 Polygon intersector/redistribution for boolean prep (PolyLine with AABB, quadtree, `redistributeVertexSource`) — old: chunk.vendor.js:37831-39011 (module 187)
- [ ] ENG-BOOL-003 Bezier-bezier intersection with Polynomial root finding — old: chunk.vendor.js:84473-86907 (module 647)
- [ ] ENG-BOOL-004 Live booleans via GCompoundShape children `bool` property — old: chunk.vendor.js:10836-10839 (module 56); chunk.vendor.js:45149-45533 (module 233)

### Path operations (PATHOP)

- [ ] ENG-PATHOP-001 GVertexOffsetter: polyline offset with arc segments (bulge), caps, intersection types, used for offset path / outline stroke — old: chunk.vendor.js:87043-89608 (module 651)
- [ ] ENG-PATHOP-002 GVertexSimplifier: simplify polylines then refit curves — old: chunk.vendor.js:232871-233129 (module 1002)
- [ ] ENG-PATHOP-003 GVertexFitter: curve fitting with tolerance and error (freehand/pencil smoothing) — old: chunk.vendor.js:67252-67643 (module 380)
- [ ] ENG-PATHOP-004 GImageTracer: bitmap to vector (color quantization, palette, layering, path scan, internodes, tracepath, blur) — old: chunk.vendor.js:233130-233759 (module 1003)
- [ ] ENG-PATHOP-005 Path editing ops on the model: reverseOrder, isClockWise, insertHitPoint, addIntersectionPoints, transformStyledCorners/transferStyledCorners, splitEdge (paths graph) — old: chunk.vendor.js:10066-10184 (module 45); chunk.vendor.js:13763-14058 (module 60)

### Scene, pages and document settings (SCENE)

- [ ] ENG-SCENE-001 GScene meta: `v: 10` version, `lmd` last modified, `cid` cloud id, `cfs` cloud sync, `can` cloud annotations, `asec`, `ut: px` unit, `ur: 1`, `name`, `_links`, `__ids` (scene ids of children), `rb: false` (blocks link bookkeeping), `cst` custom fonts, `dpi: 72`, `pi` active page index, `cm: RGB` color mode — old: chunk.vendor.js:33515-33541 (module 160)
- [ ] ENG-SCENE-002 Grid settings: `gx/gy: 10`, `gm` GridMode Boxed "box" / Axonometric "axo", `lgm` last mode, `gaw: 20`, `gah` (computed), `ga1: PI/6`, `ga2: -PI/6`, MIN_GRID_SIZE 1 — old: chunk.vendor.js:33505-33514, 34840-34909 (module 160)
- [ ] ENG-SCENE-003 Guides: horizontal/vertical guide lines `hgl`/`vgl` in scene meta; GGuide snapping framework (visual guides, detail map, snap zones) — old: chunk.vendor.js:33515 (module 160); chunk.vendor.js:25316-25415 (module 99); chunk.vendor.js:40423-41246 (module 210)
- [ ] ENG-SCENE-004 Page layout on canvas: `pgx: 2` pages per row, `mp: false`, labels `lbs: 10` size, `lbp: 7` padding, `lbc` color, `mve` multipage view; page `off` offsets; GSceneOptions pagesPerRow, pageGap, scaleLabel, pagesCanOverlap, defaultBorderPositionForLines — old: chunk.vendor.js:33554-33563 (module 160); chunk.vendor.js:22754-22854 (module 83); chunk.vendor.js:40403-40412 (module 207)
- [ ] ENG-SCENE-005 Pages: `insertPage` copies size/margins/background from master or active page and names "Page N"; active page; iteratePages; `renameClone` numbering "Name 1.2.3"; page bleed/margin/clip bboxes; trimToContent; page thumbnails — old: chunk.vendor.js:34124-34258, 34532-34569 (module 160); chunk.vendor.js:22723-22753, 22982-23001, 23577 (module 83)
- [ ] ENG-SCENE-006 Master pages: page `refs` to master pages; scene `mpg` (single master), `ompg` (odd), `empg` (even); `reassignMasterPages`, `getMasterPages/getSlavePages` — old: chunk.vendor.js:33564-33568, 34582-34616 (module 160); chunk.vendor.js:23062-23114 (module 83)
- [ ] ENG-SCENE-007 Layers per page, active layer handling (get/set/successor/delete) — old: chunk.vendor.js:22932-22981 (module 83); chunk.vendor.js:34226-34258 (module 160)
- [ ] ENG-SCENE-008 Links/references: `link/unlink`, `visitLinks`, `visitReferences`, `isLinked`, `linkCount/refCount`, sanity check; used by styles, symbols, master pages, connectors, text on path; GReferenceEvent — old: chunk.vendor.js:33739-34048 (module 160); chunk.vendor.js:71344-71358 (module 472)
- [ ] ENG-SCENE-009 Constraints (GElement.Anchor): per axis anchor type Start 1 / Middle 2 / End 3 / Stretch 4 (`hacr`, `vacr`) plus cached boxes/transforms/distances (`habox, hsbox, hatrf, hstrf, hdl, hdr, hcf`, `vabox, vsbox, vatrf, vstrf, vdt, vdb, vcf`); active inside groups/layers with `frm` and shapes with `scc` — old: chunk.vendor.js:116556-117503 (module 910)
- [ ] ENG-SCENE-010 Clipping/masking: shape children painted clipped to the parent shape outline; fill-layer masks; page clip (`clipToPage`) — old: chunk.vendor.js:11557-11647 (module 56); chunk.vendor.js:115979 (module 904)
- [ ] ENG-SCENE-011 Transform settings: border scaling and corner scaling flags — old: chunk.vendor.js:33486-33489, 35096-35104 (module 160)
- [ ] ENG-SCENE-012 Paint configuration: PaintMode Full F / Fast S / Outline L / Output O, pixel mode, clip to page, guides/slices/annotations visibility, noWebGL, effect cache, thumbnails — old: chunk.vendor.js:30761-30836 (module 133)
- [ ] ENG-SCENE-013 GWorkspace: font manager, transaction recorder, references, image memory accounting, `resolveUrl` (ResolveUrlEvent) — old: chunk.vendor.js:54384-54489 (module 280)
- [ ] ENG-SCENE-014 Transaction recorder: ActionType PropertyChange 0, FlagSet 1, FlagRemove 2, Insert 3, Remove 4, Special 5, Begin/EndBlock 6/7, Begin/FinishSelectionUpdate 8/9; begin/endTransaction; hooks from setProperties, child insert/remove, flags, special changes, transform box — old: chunk.vendor.js:71047-71343 (module 471); hook chunk.vendor.js:819-823 (module 2)
- [ ] ENG-SCENE-015 Recorded transaction state on nodes (`recordedTransaction`, `isRecordedTransaction`) and scene RecordedTransactionStarted/Finished events — old: chunk.vendor.js:1134, 1406 (module 2); chunk.vendor.js:33595-33609 (module 160)
- [ ] ENG-SCENE-016 Destroyables (WebGL patterns/effects freed with scene), reference counter, `destroy` — old: chunk.vendor.js:35105-35147 (module 160)
- [ ] ENG-SCENE-017 Cloud annotations state on scene (`getAnnotations/setAnnotations/cleanAnnotations`, last modified from cloud, `hasLinkedFiles`) — old: chunk.vendor.js:33646-33733 (module 160)
- [ ] ENG-SCENE-018 Unit and number formatting helpers on scene: `stringToLength`, `lengthToString`, `pointToString`, optimal decimals, increment value — old: chunk.vendor.js:34056-34094 (module 160)

### Symbols (SYMBOL)

- [ ] ENG-SYMBOL-001 Master/instance model: `GSymbol.create(nodes, target, name)` makes a master (`_master`, `masterRef`, `masterMultiRef`); instances link children to master children by multireference id (`&`) through `_siblingMap` — old: chunk.vendor.js:41994-42160 (module 216)
- [ ] ENG-SYMBOL-002 Synchronization: `synchronize`, `desynchronize`, `inSync`, sibling insert/remove/update propagation (AfterSiblingUpdate INSERT/REMOVE/UPDATE) — old: chunk.vendor.js:42208-42633, 42183-42194 (module 216)
- [ ] ENG-SYMBOL-003 Overrides: a child whose properties differ from its master sibling (geometry, visual, style sets, anchors, text content, trf) goes to `_disabledSiblingMap`, stored as `dsb`; nested symbol siblings in `sbl` — old: chunk.vendor.js:43237-43307, 43623-43711, 43938-44021 (module 216)
- [ ] ENG-SYMBOL-004 Instance operations: `convertToMaster`, `detach`, `swapWith`, `swapWithNew` (swp/swpori), `getMasterSymbol`, frame — old: chunk.vendor.js:42682-42819 (module 216)
- [ ] ENG-SYMBOL-005 Symbol transaction actions (special change serialize/revert) and thumbnails — old: chunk.vendor.js:43719-43780, 44221-44276 (module 216)
- [ ] ENG-SYMBOL-006 Scene symbol dictionary (blob `symbolDictionary`) and symbol image cache — old: chunk.vendor.js:34744, 34787 (module 160); chunk.vendor.js:121534-121745 (module 933)

### Serialization (SER)

- [ ] ENG-SER-001 Node blob format: `@` node name, `@id` identity (not on copy), `$` children array, `#` referenceId, `&` multiReferenceId, `@xxx` custom properties copied verbatim — old: chunk.vendor.js:289-347 (module 2)
- [ ] ENG-SER-002 Restore: looks up class by `@`, constructs, PrepareRestore, children restored inside blocked update, then `@` customs, `#`, `&`, Restore notification; progress callback 20-100% via `countBlobChildren` — old: chunk.vendor.js:348-437, 522-531 (module 2)
- [ ] ENG-SER-003 serialize/deserialize wrap store/restore in JSON (`beautify` indent 4), arrays of nodes, options save/copy/copyIgnoreProperties/singleton/exceptions/lastModifiedDate — old: chunk.vendor.js:438-521 (module 2)
- [ ] ENG-SER-004 Property store writes only non-default values (`storeProperties` compares with declared defaults); restore fills missing keys with defaults; per-key store/restore filters for transforms, rects, patterns — old: chunk.vendor.js:837-881 (module 2)
- [ ] ENG-SER-005 Pattern serialization `"<id>#<payload>"` (color JSON array, gradient JSON blob, texture JSON) — old: chunk.vendor.js:10235-10258 (module 50)
- [ ] ENG-SER-006 Compact anchor point arrays: `[tp?, ah?, packPoint(x,y), "&", mref, "#", ref, "h", packPoint, "H", packPoint, "C", packPoint(cl,cr)]`, legacy unpacked numeric form still read; sketch-path marker 0xDEADD00D — old: chunk.vendor.js:8660-8738, 9292-9323 (module 45)
- [ ] ENG-SER-007 Transform `[]` or 6 numbers, rect `[x,y,w,h]`, packed points base64 float32 — old: chunk.vendor.js:2093-2099, 1620-1625, 2719-2739 (modules 7, 6, 11)
- [ ] ENG-SER-008 Nested serialized strings inside blobs: path `reftxt`, paths graph `anchors/edges/facets`, compound path sub-paths, symbol master refs `mpg/ompg/empg` — old: chunk.vendor.js:9882-9900 (module 45); chunk.vendor.js:36450-36466 (module 162); chunk.vendor.js:34788-34790 (module 160)
- [ ] ENG-SER-009 Scene store specifics: `__ids` computed, `lmd` set only on save, `cid/cfs` dropped for singleton, `cst` dropped, `pi` from active page, `dictionary` and `symbolDictionary` blobs — old: chunk.vendor.js:34748-34790 (module 160)
- [ ] ENG-SER-010 Version handling: scene `v: 10` is written but no code reads it; all migrations detect legacy keys — old: chunk.vendor.js:33516 (module 160)
- [ ] ENG-SER-011 Migration: flat fill/border keys on element blob (`_fpt,_fop,_fvs,_fpx`, `_bpt,_bop,...`) become one Fill/Border paint layer — old: chunk.vendor.js:115912-115939, 116009-116047, 115644-115655, 115748-115759 (modules 904, 901, 902)
- [ ] ENG-SER-012 Migration: border `_bmo`/`_bmi` to head/tail `_bhmo/_btmo`, `_bhmi/_btmi`; boolean inside flags to 0/1 — old: chunk.vendor.js:115760-115770 (module 902)
- [ ] ENG-SER-013 Migration: gradient opacity-only stops merged into color stops; angular gradient `a1` end angle rescales stops and adds transparent tail — old: chunk.vendor.js:30994-31026 (module 138); chunk.vendor.js:54830-54855 (module 283)
- [ ] ENG-SER-014 Migration: legacy text nodes (`tlx/tly/trx/bry`, child `txPara`, `txBrk`, `cnt`) to `content` runs and `trf`; default black `_fpt` "C#[0,0,0]" dropped; font family renames — old: chunk.vendor.js:18095-18166 (module 70); chunk.vendor.js:26488-26494 (module 108)
- [ ] ENG-SER-015 Migration: pre-3.10 documents (no `dictionary`) flag `_pre310`, text legacy height fix; scene-level page props (`w,h,ml,mt,mr,mb,bl,bck,bop`) forwarded to page; pageless documents get w/h 0 — old: chunk.vendor.js:34741-34743, 34792-34815 (module 160); chunk.vendor.js:18221-18226 (module 70)
- [ ] ENG-SER-016 Migration: custom `@swatches` JSON moved into swatches node; styles `repairSdf` by default style names; page `off` computed if missing — old: chunk.vendor.js:35086-35093 (module 160); chunk.vendor.js:119322-119331 (module 915); chunk.vendor.js:34830-34838 (module 160)
- [ ] ENG-SER-017 Migration: path `rtxt` copied to `refs`; image without `ipfc` gets false and `itrf` from `trf`; compound shape without `evenodd` recomputes vertices — old: chunk.vendor.js:13943-13945 (module 60); chunk.vendor.js:24763-24767 (module 95); chunk.vendor.js:45313-45317 (module 233)
- [ ] ENG-SER-018 Simple shape and text blobs: `ssn/icn/pvp/apv`, text `ct` and `#` uuid when no path attached — old: chunk.vendor.js:75183-75204 (module 530); chunk.vendor.js:18051 (module 70)

### Events (EVENT)

- [ ] ENG-EVENT-001 GEvent / GEventTarget base (addEventListener with handler and target) — old: chunk.vendor.js:18932-18942 (module 72); chunk.vendor.js:19293-19379 (module 75)
- [ ] ENG-EVENT-002 GNode.BeforeInsertEvent / AfterInsertEvent (node, customObj) — old: chunk.vendor.js:586-602 (module 2)
- [ ] ENG-EVENT-003 GNode.BeforeRemoveEvent / AfterRemoveEvent — old: chunk.vendor.js:603-619 (module 2)
- [ ] ENG-EVENT-004 GNode.BeforePropertiesChangeEvent / AfterPropertiesChangeEvent (node, properties, values, custom, temporary, customObj) — old: chunk.vendor.js:620-653 (module 2)
- [ ] ENG-EVENT-005 GNode.BeforeFlagChangeEvent / AfterFlagChangeEvent (node, flag, set) — old: chunk.vendor.js:654-673 (module 2)
- [ ] ENG-EVENT-006 GNode.BeforeSpecialChangeEvent / AfterSpecialChangeEvent (node, data) and AfterRestoreEvent — old: chunk.vendor.js:674-699 (module 2)
- [ ] ENG-EVENT-007 GElement.GeometryChangeEvent Type Before 0 / After 1 / Child 2 — old: chunk.vendor.js:5500-5513 (module 22)
- [ ] ENG-EVENT-008 GPage.InvalidationRequestEvent (area) and GPage.AfterThumbnailUpdate (page, image) — old: chunk.vendor.js:22645-22660 (module 83)
- [ ] ENG-EVENT-009 GScene.InvalidationRequestEvent (area, page), InvalidationFinishedEvent (scene, configuration, wasDirty), RecordedTransactionStarted/FinishedEvent — old: chunk.vendor.js:33569-33610 (module 160)
- [ ] ENG-EVENT-010 GSymbol.AfterThumbnailUpdate and AfterSiblingUpdate (targetNode, updated, type) — old: chunk.vendor.js:42175-42194 (module 216)
- [ ] ENG-EVENT-011 GImage.StatusEvent and ConvertStatusEvent — old: chunk.vendor.js:24450-24466 (module 95)
- [ ] ENG-EVENT-012 GFontManager Font(Un)AvailableEvent, ResolveFontEvent, QueryFontFamilyEvent — old: chunk.vendor.js:54501-54543 (module 281)
- [ ] ENG-EVENT-013 GTexturePattern.UpdateEvent, GSceneDictionary.ResolvedMissingEntryEvent, GWorkspace.ResolveUrlEvent, GGuides.InvalidationRequestEvent — old: chunk.vendor.js:31055 (module 139); chunk.vendor.js:92169 (module 658); chunk.vendor.js:54384-54420 (module 280); chunk.vendor.js:40455-40462 (module 210)

### Notes for the rewrite

Third-party code embedded in the engine bundle (none of it is named or versioned in the bundle):

- opentype.js (npm `opentype.js`, 1.x): parser and tables in modules 89, 115, 376-378, 529, 708-725, 982-997 (cmap, CFF, glyf + hinting, GSUB/GPOS, name, OS/2, fvar, Arabic shaping helpers, Mac encodings).
- HarfBuzz compiled by Emscripten with WASM2JS, module 998 (chunk.vendor.js:128962-232686, about 6.4 MB of JS; it fakes `WebAssembly.Memory/Module/Instance` and names a dummy `ghbmodule.wasm`). Replace with the `harfbuzzjs` npm package (real wasm). Wrapper API in module 838.
- carota rich-text editor (npm `carota`), heavily forked into the "GTL" text engine: modules 148, 161, 367, 652-654, 916-927 (doc, runs, words, ranges, undo, edit filters, lists, direction/path transformers).
- glfx.js (evanw) filter set: the GGL* effects and shaders (vendor modules 206, 315, 346, 364, 365, 474-504, plus shader base module 42) match glfx.js filters (bulgePinch, swirl, dotScreen, colorHalftone, hexagonalPixelate, ink, edgeWork, vignette, zoomBlur, tiltShift, lensBlur, denoise, unsharpMask, vibrance, hueSaturation, brightnessContrast, sepia, noise) plus Gravit additions (bloom, toon, sketch, glows, stroke layer, bend/drunk/fisheye, recolour).
- imagetracerjs (npm `imagetracerjs`): GImageTracer, module 1003.
- big.js (npm `big.js`): module 913 (has the `[big.js]` error prefix).
- quadtree-js style QuadTree (`max_objects`, `max_levels`): module 140.
- StackBlur (mul/shg tables style, radius 1-254): module 931.
- A JPEG decoder in the style of pdf.js `jpg.js` (huffman tables, blocksPerLine) used for CMYK JPEG conversion: modules 659 and 932.
- Kevin Lindsey style Polynomial/Bezier intersection code: module 647.
- A cubic spline interpolator for color grading curves (module 1009); it leaks a global `cubicSpline` and patches `Array.prototype.getLowestAbove`.
- A CSS-selector engine for nodes (Slick-like API: parse, compute, nth, getUid): module 507.
- Own ICC profile parser (module 641) plus data file `assets/data/icc/USWebCoatedSWOP.icc`.

Surprises and traps:

- Node names are not uniform: most are lowercase ("rectangle", "path"), some have spaces ("Compound Shape", "Ready Shape", "Paths Graph"), GL effects use the class name ("GGLBlurEffect"), color grading is "clGradingEffect", annotations use short codes ("anr", "anarr", "ancotext"). These strings are the file format; keep them byte-exact.
- No real versioning. Scene `v: 10` is written but never read; every migration is "if legacy key present". The rewrite should add an explicit version and port each legacy-key migration listed in ENG-SER-011..017.
- Default styles store `_sdf` as a runtime `__gtype_id__` number, which depends on module load order. `repairSdf` fixes it by matching style names on load. The rewrite should store a stable class name instead.
- Radial gradient bug: `_serializeToBlob` writes `_cx`/`_cy` but `_deserializeFromBlob` reads `cx`/`cy` (chunk.vendor.js:33135-33148), so a moved radial center does not survive save/load. Decide whether to keep old files compatible by reading both keys.
- Scene `_handleChange` references an undeclared `mpIdx` when property `ms` changes (chunk.vendor.js:34950); that path throws if ever hit.
- `GUtil.unpackNumbers` loops over the base64 string length instead of the decoded length (chunk.vendor.js:2700-2716, module 11), and `packPoint` stores coordinates as float32, so anchor coordinates lose precision on every save.
- GSimpleShape/GParameterizedVertexProcessor compiles document-supplied expressions with `Function(...)` after a whitelist check (chunk.vendor.js:74940-74958). Loading an untrusted file runs generated code; the rewrite needs a real expression parser.
- Several blobs embed JSON strings inside JSON (paths graph anchors/edges/facets, path `reftxt`, master page refs, text `content`), so files are double-encoded in places.
- GImage inherits GRectangle and GCollabText inherits GImage; text annotation inherits GText. Inheritance is used for reuse more than for meaning, so the TypeScript model should use composition but keep the serialized shape.
- WebGL is part of the document model, not only rendering: angular gradients, noise patterns and all GGL effects need a GL context to render, and WebGL-only blend modes silently fall back to normal when WebGL is off.
- `GText.dontStorePaths = true` means text outlines are not saved; documents depend on fonts being resolvable (fake-text fallback otherwise).
- The engine also contains a canvas command recorder (GRendererCtx, module 111) and renderer config (module 166) that serialize 2D canvas calls into typed arrays; that belongs to the rendering inventory, not the model.

## Rendering and editor

Scope: rendering (paint canvas, renderer, WebGL effects), the editor (selection, undo, clipboard, drag and drop, element editors, handles, transform box, path and text editing, crop, symbols), every tool with its modifiers, guides and snapping, the annotation layer, the touch layer and the viewport.

Line references point into `public/chunk.vendor.js` (engine) and `public/designer.browser.dev.js` (app). Both bundles share one webpack module id space. Module ids match `next/docs/rewrite/old-module-index.tsv`.

Shortcut notation: META is Cmd on macOS desktop and Ctrl elsewhere, OPTION is Alt, REMOVE is Backspace on macOS and Delete elsewhere (GKey.transformKey, chunk.vendor.js:37258, module 164).


### PAINT: GPaintCanvas (module 14) and helpers

- [ ] EDT-PAINT-001 GPaintCanvas constructor: `new GPaintCanvas(forceRecorder, plain2d, persistent, multiThreaded)`; plain2d=true gives a real `<canvas>` 2D context, otherwise a GRendererCtx command recorder from the renderer (module 103); always creates a GBlender — old: chunk.vendor.js:4032-4038 (module 14)
- [ ] EDT-PAINT-002 LineCap / LineJoin enums: butt/round/square; miter/bevel/round — old: chunk.vendor.js:4040-4049 (module 14)
- [ ] EDT-PAINT-003 BlendMode enum: 16 CSS blend modes (normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity) — old: chunk.vendor.js:4050-4067 (module 14)
- [ ] EDT-PAINT-004 WebGLBlendMode enum: 12 extra blend modes only possible through the WebGL blend shader (linear_burn, linear_dodge, vivid_light, linear_light, pin_light, divide, add, subtract, hardmix, power, harmonic, sin), merged into BlendMode — old: chunk.vendor.js:4068-4082 (module 14)
- [ ] EDT-PAINT-005 CompositeOperator enum: source-over/atop/in/out, destination-over/atop/in/out, copy, xor, lighter, darker — old: chunk.vendor.js:4083-4096 (module 14)
- [ ] EDT-PAINT-006 FillRule enum: nonzero / evenodd — old: chunk.vendor.js:4097-4100 (module 14)
- [ ] EDT-PAINT-007 Filter enum (CSS canvas filters): blur, brightness, contrast, drop-shadow, grayscale, hue-rotate, invert, opacity, saturate, sepia, url (SVG) — old: chunk.vendor.js:4101-4113 (module 14)
- [ ] EDT-PAINT-008 RenderAlgorithm / SmoothingQuality enums: Pixelated=0, Crisp=1, Auto=2; Low/Medium/High — old: chunk.vendor.js:4114-4123 (module 14)
- [ ] EDT-PAINT-009 createChessboard(size, colorA, colorB): static 2x2-cell checker canvas used for transparent page backgrounds — old: chunk.vendor.js:4124-4137 (module 14)
- [ ] EDT-PAINT-010 hasFilters / disableFilters / enableFilters: feature-detects `ctx.filter` once; can be globally switched off — old: chunk.vendor.js:4141-4154 (module 14)
- [ ] EDT-PAINT-011 getScreenDPI: retina factor = devicePixelRatio / backingStorePixelRatio (webkit/moz/ms/o prefixes), cached after first call, default 1 — old: chunk.vendor.js:4155-4170 (module 14)
- [ ] EDT-PAINT-012 Size accessors: getWidth/getHeight (backing canvas pixels), resize(w,h) only touches canvas when size changes — old: chunk.vendor.js:4181-4195 (module 14)
- [ ] EDT-PAINT-013 getBitmap: lazily wraps the canvas in a GBitmap — old: chunk.vendor.js:4187-4189 (module 14)
- [ ] EDT-PAINT-014 Offset/origin/scale state: get/setOffset, get/setOrigin, get/setScale; origin+scale are folded into the effective transform via _updateTransform — old: chunk.vendor.js:4196-4214 (module 14)
- [ ] EDT-PAINT-015 Transform stack: getTransform(raw) returns transform × scale × translate(-origin) unless raw; setTransform returns previous; resetTransform = setTransform(null) — old: chunk.vendor.js:4215-4232 (module 14)
- [ ] EDT-PAINT-016 prepare(areas, debug): save(), reset transform/origin/scale, clip to the union of dirty rects (clamped to canvas) and clear them; no areas clears whole canvas; debug fills areas green — old: chunk.vendor.js:4233-4272 (module 14)
- [ ] EDT-PAINT-017 finish(): restore() and reset state; destroy() frees recorder ctx and blender — old: chunk.vendor.js:4293-4303 (module 14)
- [ ] EDT-PAINT-018 getAreas / isClipped: returns dirty areas copy; isClipped true when more than one area or one area not covering the canvas — old: chunk.vendor.js:4273-4292 (module 14)
- [ ] EDT-PAINT-019 Mask counter: isMasked / setMasked(n) (increment, negative resets) used for mask/inverse-mask blend ("m", "!m") — old: chunk.vendor.js:4276-4281 (module 14)
- [ ] EDT-PAINT-020 getPaintExtents(rect, noClamp, padding): maps a world rect to canvas pixels and clamps to canvas + padding [l,t,r,b] — old: chunk.vendor.js:4304-4323 (module 14)
- [ ] EDT-PAINT-021 getFinalExtents(rect): inverse-maps pixel extents back and scales by canvas scale — old: chunk.vendor.js:4324-4332 (module 14)
- [ ] EDT-PAINT-022 Pixel-snapping corrections: getTranslateCorrection (sub-pixel offset correction) and getScaleBoxCorrection (floor/ceil/round box at scale) used when compositing sub-canvases — old: chunk.vendor.js:4333-4369 (module 14)
- [ ] EDT-PAINT-023 createCanvas(extents, clipToAreas, padding): offscreen child canvas sized to the painted extents, inheriting scale, origin=offset=top-left, areas translated — old: chunk.vendor.js:4370-4396 (module 14)
- [ ] EDT-PAINT-024 clear(): clears the visible canvas region in world coordinates — old: chunk.vendor.js:4397-4407 (module 14)
- [ ] EDT-PAINT-025 drawCanvas(src, x, y, opacity, compositeOp, clearFirst, w, h): composites a child canvas with offset/scale correction; smoothing on only when scale < 1; default op source-over, opacity 1 — old: chunk.vendor.js:4408-4457 (module 14)
- [ ] EDT-PAINT-026 createTexture(image, repeat): ctx.createPattern for HTMLImage/canvas; skips incomplete or zero-sized images; default repeat Both — old: chunk.vendor.js:4458-4481 (module 14)
- [ ] EDT-PAINT-027 createPatternPaint(pattern, rect, transform): returns {paint, transform} for GColor, GLinearGradient (createLinearGradient from fx/fy+angle×scale), GRadialGradient (createRadialGradient), GAngularGradient (pre-rendered texture, no repeat), GTexturePattern (texture with repeat mode); stops clamped 0..1 — old: chunk.vendor.js:4482-4544 (module 14)
- [ ] EDT-PAINT-028 Clipping: hasClip, clipRect(x,y,w,h) (save+rect clip), resetClip (restore) — old: chunk.vendor.js:4548-4566 (module 14)
- [ ] EDT-PAINT-029 putVertices(source|points[], close): builds a path from a GVertexSource (Move/Line/Curve=quadratic/Curve2=cubic/Close), reading vertices at canvas scale; returns whether closed — old: chunk.vendor.js:4567-4615 (module 14)
- [ ] EDT-PAINT-030 clipVertices(evenOdd): save + clip current path with fill rule — old: chunk.vendor.js:4616-4621 (module 14)
- [ ] EDT-PAINT-031 strokeVertices(paint, width=1, dash[], cap=butt, join=miter, miterLimit=10, opacity=1, op=source-over): strokes current path through blender — old: chunk.vendor.js:4622-4635 (module 14)
- [ ] EDT-PAINT-032 fillVertices(paint, opacity=1, op, evenOdd): fills current path through blender — old: chunk.vendor.js:4636-4642 (module 14)
- [ ] EDT-PAINT-033 fillCanvas(paint, opacity, op): fills whole visible area — old: chunk.vendor.js:4643-4656 (module 14)
- [ ] EDT-PAINT-034 Rect primitives: fillRect (default black), clearRect, strokeRect (width 1, black) — old: chunk.vendor.js:4657-4677 (module 14)
- [ ] EDT-PAINT-035 strokeLine(x1,y1,x2,y2,width=1,color=black,dashed,opacity): dashed uses dash [2×width] — old: chunk.vendor.js:4678-4692 (module 14)
- [ ] EDT-PAINT-036 setImageSmoothingQuality / setRenderAlgorithm: maps to imageSmoothingQuality and CSS image-rendering fallbacks (pixelated/nearest-neighbor, crisp-edges/-moz-crisp-edges/-webkit-optimize-contrast, auto) — old: chunk.vendor.js:4693-4728 (module 14)
- [ ] EDT-PAINT-037 drawImage(img, x, y, noSmooth, opacity, op, noMipmap, w, h): Chrome on non-retina uses _drawSmoothImage (iterative half-size downscale, max 20 steps, skipped >= 32768px) for quality downscaling — old: chunk.vendor.js:4729-4745, 4961-5035 (module 14)
- [ ] EDT-PAINT-038 drawImageFragment(img, sx, sy, dx, dy, w, h, noSmooth, opacity, op, dw, dh): 9-arg sub-image draw — old: chunk.vendor.js:4746-4769 (module 14)
- [ ] EDT-PAINT-039 putAuxilliaryText / measureText: UI text (labels, rulers) via fillText, default "10px Verdana", baseline bottom, align start — old: chunk.vendor.js:4770-4784 (module 14)
- [ ] EDT-PAINT-040 hitTest(point, tolerance): pixel hit test by reading alpha of (2t+1)² getImageData around the point, returns nearest non-transparent pixel as GHitResult {pixel, location} — old: chunk.vendor.js:4785-4814 (module 14)
- [ ] EDT-PAINT-041 setFilter(filter, value): builds ctx.filter string; blur radius converted by /(sqrt(2 ln 255)-1), percent filters ×100, hue-rotate in degrees, drop-shadow [x,y,blur,color,opacity], null removes — old: chunk.vendor.js:4815-4869 (module 14)
- [ ] EDT-PAINT-042 clone(copyBitmap, {renderPhaseDraw, dontCopyContents, persistent}): during render phase clones the recorder (__clone); otherwise copies all ctx state, areas, transform and contents via drawCanvas(Copy) — old: chunk.vendor.js:4870-4960 (module 14)
- [ ] EDT-PAINT-043 _convertStyle / _convertImage: GColor to hex; accepts image, canvas, RendererCanvas, OffscreenCanvas, GPaintCanvas, GBitmap (unwraps real canvas across recorder types) — old: chunk.vendor.js:5051-5075 (module 14)
- [ ] EDT-PAINT-044 getRendererContext / isRendered: exposes recorder ctx, reports async render completion — old: chunk.vendor.js:5076-5090 (module 14)
- [ ] EDT-PAINT-045 Image smoothing get/set with webkit/moz prefixes — old: chunk.vendor.js:5088-5106 (module 14)
- [ ] EDT-PAINT-046 GBlender: wraps the 2D ctx; globalCompositeOperation setter maps "normal" to source-over; when the browser does not support the op, renders via WebGL blend shader (read background texture, draw, blend, copy back) per united dirty area — old: chunk.vendor.js:83467-83758 (module 643)
- [ ] EDT-PAINT-047 GBlender primitives: drawImage (3/5/9-arg), stroke, strokeRect, fill, fillRect each routed through custom blend path — old: chunk.vendor.js:83510-83644 (module 643)
- [ ] EDT-PAINT-048 WebGL blend shader: shader for the WebGLBlendMode set plus CSS modes — old: chunk.vendor.js:61679-61787 (module 346)
- [ ] EDT-PAINT-049 GBitmap: canvas-backed bitmap from size/image/canvas; ImageType PNG/JPEG; setDPI, getOffset, getHTMLElement — old: chunk.vendor.js:61377-61445 (module 345)
- [ ] EDT-PAINT-050 GBitmap export: toImageDataUrl, toImageBlob, toImageBuffer — old: chunk.vendor.js:61446-61510 (module 345)
- [ ] EDT-PAINT-051 GBitmap ops: clone, resize(w,h,anchorSide), crop, trim (alpha bbox), getPixelValue, modifyPixels(fn, rect), applyFilter — old: chunk.vendor.js:61511-61673 (module 345)
- [ ] EDT-PAINT-052 GCanvasHitResult-style holder {element, data} returned by hitTest — old: chunk.vendor.js:27216-27223 (module 112)
- [ ] EDT-PAINT-053 Destroyable mixin (destroy() abstract) mixed into canvas, context, blender — old: chunk.vendor.js:27986-27992 (module 118)

### PCTX: paint contexts

- [ ] EDT-PCTX-001 GPaintContext fields: configuration, canvas, canvasStack, dirtyMatcher, outlineColors, computedBackgroundColor — old: chunk.vendor.js:45010-45014 (module 228)
- [ ] EDT-PCTX-002 Editor colors: selectionOutline rgb(40,128,230), selectionShapeOutline (same), selectionSecond rgb(255,0,170), selectionThird rgb(132,102,176), highlight rgb(197,17,98), knife rgb(227,0,97), transformBox rgb(23,104,196), annotation rgb(235,100,60), slice rgb(0,255,168), label black — old: chunk.vendor.js:45015-45026 (module 228)
- [ ] EDT-PCTX-003 Outline color stack: isOutline() when outlineColors non-empty, getOutlineColor() = top or black — old: chunk.vendor.js:45027-45034 (module 228)
- [ ] EDT-PCTX-004 Canvas stack: getRootCanvas, pushCanvas (returns previous), popCanvas (throws on empty) — used for effect/blend sub-canvases — old: chunk.vendor.js:45034-45046 (module 228)
- [ ] EDT-PCTX-005 isIncludingInvisible (false), destroy() destroys stacked canvases — old: chunk.vendor.js:45047-45062 (module 228)
- [ ] EDT-PCTX-006 GSVGPaintContext: wraps an SVG canvas emulator; annotations flag from options; getSvgPaths, includeInvisible option, getGlobalCompositeOperation/getGlobalAlpha/getSvgStyleObject/getSvgStyle per path — old: chunk.vendor.js:244639-244775 (module 1237)
- [ ] EDT-PCTX-007 SVG paint canvas: GPaintCanvas subclass over the SVG context emulator, default 300x150, own blender — old: chunk.vendor.js:256428-256543 (module 1456)
- [ ] EDT-PCTX-008 GPDFPaintContext: config paintMode Full, ignoreEffects, no annotations, no fx cache, detail 1; beginNode/endNode push BEGIN/END markers into the PDF graphics list — old: chunk.vendor.js:253568-253632 (module 1444)
- [ ] EDT-PCTX-009 PDF node marker graphic (BEGIN/END) — old: chunk.vendor.js:243859-243882 (module 1219)

### RENDER: configuration, pipeline, view widget

- [ ] EDT-RENDER-001 GPaintConfiguration base class — old: chunk.vendor.js:116381-116387 (module 907)
- [ ] EDT-RENDER-002 PaintMode enum: Full "F", Fast "S", Outline "L", Output "O" (clip to page), with localized names paint.full/fast/outline/output — old: chunk.vendor.js:30767-30778 (module 133)
- [ ] EDT-RENDER-003 GScenePaintConfiguration defaults: paintMode F, pixelMode false, clipToPage false, guides/slices/annotations true, elementAnnotations false, showResolvedAnnotations false, clipArea null, ignoreEffects false, noWebGL false, forceEffectsWhenZoomed false, enableFxCache true, clipDirty true, sceneBackground true, multiPageView false, ignoreRulerOffsets/rulerLeftFill false, thumbnails true (85px), pageThumbnails false (85px), paintSharp true, watermark null — old: chunk.vendor.js:30779-30804 (module 133)
- [ ] EDT-RENDER-004 Visibility predicates: isOutline (mode L or context outline), isAnnotationsVisible, isGuidesVisible, isSlicesVisible, isElementAnnotationsVisible (hides removed "rmd" and resolved "rsv" unless shown), isClipToPage (clipToPage or Output mode) — old: chunk.vendor.js:30805-30831 (module 133)
- [ ] EDT-RENDER-005 GEditorPaintConfiguration: pageDecoration {chessboard true, margin true, shadow 0, shadowOffsetX/Y 0, shadowBackground rgba(0,0,0,0.5), background white}, gridVisible true, pageLabelsVisible false, symbolLabelsVisible true, guideLinesVisible true — old: chunk.vendor.js:107530-107552 (module 777)
- [ ] EDT-RENDER-006 GRendererConfig flags: ENABLE_RENDERER, ZOOM_STEP 37.5, CANVAS_GRID 1x1, WORKER_RENDERING off, MAX_TIME_PER_JOB 75ms, cache grid 1024x1024, ENABLE_CACHE, MAX_CACHED_PER_ONE_ZOOM 64, MAX_CACHED_ZOOM_LEVELS 5, CACHE_WHEN_DRAWING_LONGER_THAN 50, NO_WEBGL_WHEN_PANNING/ZOOMING true, SHOW_LOWRES_GIMMICK true, RERENDER_ZOOM_AFTER_MS 750, RERENDER_PAN_AFTER_MS 100, buffer 512..32768, memory pool 30MB, debug area flags — old: chunk.vendor.js:37341-37378 (module 166)
- [ ] EDT-RENDER-007 Outline paint mode: shapes stroke their geometry with getOutlineColor() instead of fill/border/effects (paintStyle skips effects, page background skipped, slices stroked) — old: chunk.vendor.js:11648-11660 (module 56), chunk.vendor.js:117542-117545 (module 911), chunk.vendor.js:55555-55570 (module 289)
- [ ] EDT-RENDER-008 Outline view action: id view.outline-view, shortcut Alt+Y, toggles L <-> Output/Full depending on page clip-content setting, persisted under designer.settings.outline-view.enabled — old: designer.browser.dev.js:98221-98301 (module 1297)
- [ ] EDT-RENDER-009 Fast view action: id view.fast-view, toggles S mode and sets defaultEffectDetailLevel = 0.5 / screenDPI (effects at reduced resolution); back to Output/Full on toggle off — old: designer.browser.dev.js:154640-154710 (module 1603)
- [ ] EDT-RENDER-010 Output (clip content) mode: page "clip content" button switches Output <-> Full — old: designer.browser.dev.js:105380-105410 (module 1339)
- [ ] EDT-RENDER-011 Pixel-sharp painting (makeSharp): when config.paintSharp and scene unit is px, outline/borders are snapped to half/full pixels based on max border width and alignment — old: chunk.vendor.js:11350-11417 (module 56)
- [ ] EDT-RENDER-012 GElement.isPaintable: visible, no NoPaint flag, non-empty paint bbox, intersects dirtyMatcher and config.clipArea; mask blend "m" always paints — old: chunk.vendor.js:5782-5803 (module 22)
- [ ] EDT-RENDER-013 GElement paint pipeline: paint = _preparePaint (sets root canvas masked flag) → _paint (paintStyle for stylables else children) → _finishPaint — old: chunk.vendor.js:5804-5806, 5894-5923 (module 22)
- [ ] EDT-RENDER-014 GElement.toBitmap(w, h, fitMode 0/1/2, bg, configOverrides, dpi, bgOpacity, area, persistent): offscreen raster render with Full mode, no annotations, no fx cache, no sharp, detail 1 (used by export/thumbnails) — old: chunk.vendor.js:5807-5875 (module 22)
- [ ] EDT-RENDER-015 Stylable paint: outline → content only; effects disabled when ignoreEffects/noWebGL or zoom > 6 with fx cache (unless forceEffectsWhenZoomed); effect padding computed; separate sub-canvas when opacity != 1 or blend != normal — old: chunk.vendor.js:117542-117595 (module 911)
- [ ] EDT-RENDER-016 Mask blend compositing: "m" → destination-in, "!m" → destination-out, clipped to mask clip area — old: chunk.vendor.js:117619-117642 (module 911)
- [ ] EDT-RENDER-017 Fill-layer opacity sub-canvas and effect application (_paintStyleFillLayer, _paintWithEffects): Filter effects render in place, Pre/Post/Multi effects render to a separate canvas and are drawn with the blend mode they return — old: chunk.vendor.js:117643-117695, 117962-118037 (module 911)
- [ ] EDT-RENDER-018 Effect (FX) cache: per-element cache keyed by effect + deps with invalidation (_getFxCache/_setFxCache/_reinvalidateFxDeps/_resetFxCacheAndState) — old: chunk.vendor.js:117790-117961 (module 911)
- [ ] EDT-RENDER-019 Page painting: background (color/gradient/pattern, opacity $bop) clipped to page, shadow on Windows Firefox fallback stroke, master page clip — old: chunk.vendor.js:23164-23260 (module 83)
- [ ] EDT-RENDER-020 Page thumbnails: repaint after paint when config.pageThumbnails, fires AfterThumbnailUpdate — old: chunk.vendor.js:23555-23577 (module 83)
- [ ] EDT-RENDER-021 Scene children painting: clipArea clip; multiPageView paints all pages in dirty area (active page last when pages can overlap) shifting canvas origin and dirty matcher per page; single-page paints active page — old: chunk.vendor.js:34308-34349 (module 160)
- [ ] EDT-RENDER-022 GSceneWidget options: minZoomFactor 0.06, maxZoomFactor 256, panOrZoomOnWheel true, limitScrollingToView false, pinchToZoomFactor 100 — old: chunk.vendor.js:62556-62562 (module 363)
- [ ] EDT-RENDER-023 Zoom snap steps: 0.12, 0.25, 0.5, 0.66, 1, 1.5, 2, 3, 4, 8, 16, 32, 64, 128 (wheel zoom stops at these) — old: chunk.vendor.js:62605-62607 (module 363)
- [ ] EDT-RENDER-024 Widget layers: element canvas (pixelated, low smoothing, the visible canvas), scene canvas grid (crisp, high), pan helper, watermark helper, debug canvas, hidden IME textarea "gravit-ime-textarea-608209", inline hint div — old: chunk.vendor.js:62418-62552 (module 363)
- [ ] EDT-RENDER-025 Retina resize: all canvases sized width×DPI, CSS size in CSS px; resize deferred while a repaint/pan frame is pending — old: chunk.vendor.js:62709-62756 (module 363)
- [ ] EDT-RENDER-026 Logical pixels: getLogicalZoom = zoom × screenDPI when logicalPixels (default true) — old: chunk.vendor.js:62817-62831 (module 363)
- [ ] EDT-RENDER-027 World/view transforms: getWorldTransform(page) / getViewTransform(page) add page position in multi-page view; getViewBox with offsets and margins — old: chunk.vendor.js:62832-62871 (module 363)
- [ ] EDT-RENDER-028 zoomAtCenter(point, zoom) clamps to min/max and centers; zoomAt(point, zoom) keeps point under cursor — old: chunk.vendor.js:62877-62908 (module 363)
- [ ] EDT-RENDER-029 zoomAll(rect, reduceOnly, activePageOffset): fit rect into view box — old: chunk.vendor.js:62909-62937 (module 363)
- [ ] EDT-RENDER-030 scrollBy(dx, dy): ignores moves <= 0.5px, returns actual delta; transform(x, y, zoom) sets both — old: chunk.vendor.js:62872-62876, 62938-62947 (module 363)
- [ ] EDT-RENDER-031 limitScrollingToView: clamps scroll to scene paint bbox (or geometry bbox in Output mode) plus pageGap (20) — old: chunk.vendor.js:63061-63154 (module 363)
- [ ] EDT-RENDER-032 Two dirty lists: element (editor overlay) and scene; invalidate(area, scene, elementArea) adds rects, schedules a rAF repaint, otherwise fires InvalidationFinishedEvent (deferred during recorded transactions) — old: chunk.vendor.js:62960-63027 (module 363)
- [ ] EDT-RENDER-033 invalidateAndResetCache / scene InvalidationRequestEvent: maps scene area to view (+2px), marks scene dirty and the cache dirty for current zoom/scroll — old: chunk.vendor.js:62948-62959, 63571-63589 (module 363)
- [ ] EDT-RENDER-034 _repaint: flushes dirty lists; on pan, reuses existing pixels (moveContent) and only renders exposed sub-areas; scene render is async with callback, editor overlay (_finishPaint) painted on element canvas after — old: chunk.vendor.js:63246-63388 (module 363)
- [ ] EDT-RENDER-035 Watermark: config.watermark image tiled over the element canvas after paint — old: chunk.vendor.js:63213-63233 (module 363)
- [ ] EDT-RENDER-036 Screen box: scene told about the view rect expanded by one viewport each side (for culling/prefetch) — old: chunk.vendor.js:63234-63245, 63513-63520 (module 363)
- [ ] EDT-RENDER-037 Zoom/pan quality modes: beginZoom/finishZoom, beginPan/finishPan set renderer quickRender/noWebGL during interaction, full rerender after; touch mode same — old: chunk.vendor.js:63389-63457, 63679-63691 (module 363)
- [ ] EDT-RENDER-038 _updateViewTransforms: rounds scroll, translates dirty lists while panning, invalidates only the exposed strips when only translating, updates scaleLabelFactor, triggers TransformEvent, relayouts rulers — old: chunk.vendor.js:63458-63527 (module 363)
- [ ] EDT-RENDER-039 Wheel: Ctrl/Meta or pinch (e.zoom) zooms (delta clamped ±20, step ZOOM_STEP 37.5 scaled by zoom/1.6, snaps to zoom steps, zoom at cursor); plain wheel scrolls, Shift swaps axes; rerender after 750/100ms idle — old: chunk.vendor.js:63600-63652 (module 363)
- [ ] EDT-RENDER-040 Cache sizing per hardware: desktop 5 zoom levels × 64 tiles, other 3 × 21; mobile deletes effect/blend textures after draw — old: chunk.vendor.js:63695-63706, 62466-62469 (module 363)
- [ ] EDT-RENDER-041 release(): detaches all listeners, destroys canvases/contexts/GL textures, cancels frames — old: chunk.vendor.js:63028-63060 (module 363)
- [ ] EDT-RENDER-042 Scene canvas grid: NxM tile GPaintCanvases, render queue that keeps only the latest request, paintAndRender job, moveContent for pans, drawTo element canvas, getSubCanvasContainingGraphic — old: chunk.vendor.js:93297-93800 (module 663)
- [ ] EDT-RENDER-043 Render request record {scene, paintContext, viewTransform, origin, scale, screen, panRepaint, callback} — old: chunk.vendor.js:122446-122457 (module 937)
- [ ] EDT-RENDER-044 Multi-zoom tile cache: per zoom level a 1024px canvas grid + cache matcher; cachedRender, setCache, setDirty; getGimmick draws a lower-res cached level scaled up while the real render runs ("low-res gimmick") — old: chunk.vendor.js:121746-122049 (module 934)
- [ ] EDT-RENDER-045 GDirtyList: dirty(x,y,w,h) rounds out, clamps to area, merges/subtracts against existing rects; translate, flush → Matcher, reset; buffer grows by 10 — old: chunk.vendor.js:93801-94027 (module 664)
- [ ] EDT-RENDER-046 Dirty Matcher: isDirty(rect), intersect, transform, clip, getDirtyArea, getDirtyRectangles, getNonIntersectingDirtyRectangles — old: chunk.vendor.js:93809-93891 (module 664)
- [ ] EDT-RENDER-047 GEditorWidget._paintElement order: page backgrounds (chessboard/shadow) → scene tiles → editor.paint → toolManager.paint → page margins → guides.paint → distance helper — old: chunk.vendor.js:236848-236889 (module 1081)
- [ ] EDT-RENDER-048 Page background decoration: chessboard 8px white / rgb(205,205,205) or background color, drop shadow via ctx.shadow*, skipped when page bg is fully opaque; Firefox-Windows shadow warning — old: chunk.vendor.js:236913-237030 (module 1081)
- [ ] EDT-RENDER-049 Page margin rendering: magenta rgb(255,0,255) rect at page margins (ml/mt/mr/mb), outlineWidth — old: chunk.vendor.js:237031-237062 (module 1081)
- [ ] EDT-RENDER-050 Shadow expand area: scene told to expand invalidation by page shadow size in view scale — old: chunk.vendor.js:236890-236912 (module 1081)
- [ ] EDT-RENDER-051 Retina-scaled editor metrics: GEditorOptions sizes (autoPanStep, outlineWidth, pageOutlineWidth, centerCrossSize, handle sizes) multiplied by screenDPI at load — old: chunk.vendor.js:6228-6268 (module 24)
- [ ] EDT-RENDER-052 Renderer scheduler (module 103): init(enabled, debug), begin/finish render phase, isRenderPhase, getRenderer(type 2d/webgl, attrs, persistent, multithreaded) returns GRendererCtx, GRendererCtxDbg or real context — old: chunk.vendor.js:25451-25560 (module 103)
- [ ] EDT-RENDER-053 Renderer.render(ctx, ...): replays recorded commands into a real context in time-sliced jobs (MAX_TIME_PER_JOB), saves resume point, reschedules via rAF, callback(canvas, finished, skipped) — old: chunk.vendor.js:25561-26048 (module 103)
- [ ] EDT-RENDER-054 tryRunRendering / scheduled renderings queue; forceCleanup on error; optional worker rendering via render.worker.js (disabled) — old: chunk.vendor.js:25469-25497, 26049-26075, 25427-25432 (module 103)
- [ ] EDT-RENDER-055 Render job object (job id, renderables, time limit, save/resume stack) — old: chunk.vendor.js:114017-114121 (module 898)
- [ ] EDT-RENDER-056 GRendererCtx: command recorder; ops serialized into an ArrayBuffer (byte op, flt64/int/uint/ptr/bool args), memory pointer table, buffer pooling (max 30MB), canvas pooling, persistent contexts — old: chunk.vendor.js:26572-26663 (module 111)
- [ ] EDT-RENDER-057 GRendererCtx static API: getOp/getVal, reset, finished, dispose, freeMemory, destroy, initializeContext/postInitializeContext, syncContext, op codes EXEC/MOV/DELETE/FINISH/FLUSHCANVAS — old: chunk.vendor.js:26954-27130 (module 111)
- [ ] EDT-RENDER-058 GRendererCtx.RendererCanvas and Renderable: proxy canvas (getContext, flushCanvas, isRendered, toDataURL) and deferred objects with dumpCode — old: chunk.vendor.js:26668-26840 (module 111)
- [ ] EDT-RENDER-059 2D ops recorded: arc, beginPath, bezierCurveTo, clearRect, clip, closePath (round join+cap emulated with lineTo), LinearGradient/RadialGradient/Pattern/ImageData renderables, createLinearGradient/Pattern/RadialGradient, drawImage, fill, fillRect, fillText, getImageData, putImageData, lineTo, measureText, moveTo, quadraticCurveTo, save/restore, rotate, scale, setLineDash/getLineDash, setTransform, transform, translate, stroke, strokeRect, strokeText; default property values — old: chunk.vendor.js:113107-113760 (module 897)
- [ ] EDT-RENDER-060 WebGL ops recorded: full WebGL 1 call set (buffers, framebuffers, textures, shaders, programs, blend, draw, readPixels, viewport, scissor ...) — old: chunk.vendor.js:114122-115452 (module 899)
- [ ] EDT-RENDER-061 GRendererCtxDbg: debug variant that executes directly and logs calls with GL constant names — old: chunk.vendor.js:39240-40357 (module 205)

### GL: WebGL effect pipeline

- [ ] EDT-GL-001 GL context singleton: getGLContext() creates webgl/experimental-webgl (premultipliedAlpha false) via renderer, enables OES_texture_float(_linear) or half_float, handles context lost/restored, warns "No WebGL support" — old: chunk.vendor.js:44708-44864 (module 226)
- [ ] EDT-GL-002 GLTexture: fromBytes/fromCanvas/fromCanvasCropped, clone, use/unuse, drawTo (render to texture), ensureFormat, swapWith, destroy — old: chunk.vendor.js:44443-44706 (module 226)
- [ ] EDT-GL-003 createTexture overloads (canvas with 5/7/9 args = cropped; bytes; size) and flushCanvasForSPECIALBrowsers — old: chunk.vendor.js:44744-44814 (module 226)
- [ ] EDT-GL-004 GL texture memory manager: addTexture, deleteTexture, flush, destroyTextures, checkMemory — old: chunk.vendor.js:70977-71046 (module 470)
- [ ] EDT-GL-005 Shader base: compileSource/linkProgram with shader caches, uniforms, textures, drawRect, default shader, fxaa, warpShader, simpleShader — old: chunk.vendor.js:7842-8167 (module 42)
- [ ] EDT-GL-006 Tiled shader apply: shouldEnableTiles (> 4M px), _getMaxSize (256..2048 tiles depending on padding), computeDownScale (detail level), apply/_renderTile/_genAreas/_copyCanvas — old: chunk.vendor.js:8168-8560 (module 42)
- [ ] EDT-GL-007 GWebGLRenderer mixin: draw, prepareShader (per-GL-context shader instance with backup when GL context changes), drawShader (creates target canvas, GL-bug probe), readPixels, update, renderMethod DIRECT/BYTES — old: chunk.vendor.js:71359-71635 (module 473)
- [ ] EDT-GL-008 GL drawing-bug probe: renders a 16px blur test on first use; on bad pixels (or Firefox/Linux) falls back to slower method — old: chunk.vendor.js:71542-71600 (module 473)
- [ ] EDT-GL-009 GWebGLEffect base: geometry props shp (shader params) and sh (shader class name), shader resolved by name through context map, Filter effect type, native CSS filter fast path (canApplyNativeEffect), polynomial property transforms, registered as scene destroyable — old: chunk.vendor.js:10280-10390 (module 51)
- [ ] EDT-GL-010 Shader context map: "./gl<name>shader" → module id, 36 shaders — old: designer.browser.dev.js:52403-52495 (module 817)
- [ ] EDT-GL-011 Shader modules: glblur 206, glbendblur 315, glblend 346, glangulargradient 364, glclipblur 365, glbend 474, glbloom 475, glbrightnesscontrast 476, glbulgepinch 477, glcoloradjust 478, glcolorhalftone 479, gldenoise 480, gldotscreen 481, gldrunk 482, gledgework 483, glfisheye 484, glhexagonal 485, glhuesaturation 486, glink 487, glinnerglow 488, gllensblur 489, glnoise 490, glouterglow 491, glrecolour 492, glsepia 493, glsketch 494, glstrokelayer 495, glswirl 496, gltiltshift 497, gltoon 498, gltrueblur 499, glunsharpmask 500, glvibrance 501, glvignette 502, glwarp 503, glzoomblur 504 — old: chunk.vendor.js:40358-40402, 55877-55951, 61679-61787, 63712-63869, 71636-72876 (modules 206, 315, 346, 364, 365, 474-504)
- [ ] EDT-GL-012 Native blur fast path: GGLBlurEffect uses ctx.filter blur when radius set and not clipped — old: chunk.vendor.js:54698-54706 (module 282)
- [ ] EDT-GL-013 Native drop shadow fast path: GDropShadowEffect uses ctx.filter drop-shadow for solid colors — old: chunk.vendor.js:56339-56350 (module 321)
- [ ] EDT-GL-014 GL effect classes (each: shp defaults, RANGES, sh shader name): GGLBlurEffect 282, GGLColorAdjustEffect 588, GGLNoiseEffect 661, GGLSepiaEffect 728, GGLBrightnessContrastEffect 730, GGLDotScreenEffect 731, GGLHueSaturationEffect 732, GGLZoomBlurEffect 839, GGLBulgePinchEffect 1004, GGLEdgeWorkEffect 1005, GGLColorHalfToneEffect 1006, GGLHexagonalEffect 1007, GGLInnerGlowEffect 1010, GGLToonEffect 1011, GGLBloomEffect 1012, GGLTrueBlurEffect 1013, GGLDenoiseEffect 1014, GGLOuterGlowEffect 1015, GGLSwirlEffect 1016, GGLVignetteEffect 1017 (size 0.2, amount 0.5), GGLStrokeLayerEffect 1018, GGLInkEffect 1019, GGLUnsharpMaskEffect 1020, GGLVibranceEffect 1021, GGLSketchEffect 1022, GGLLensBlurEffect 1023, GGLTiltShiftEffect 1024, GGLRecolourEffect 1025, GGLBendEffect 1032, GGLDrunkEffect 1033, GGLFisheyeEffect 1034 — old: chunk.vendor.js:54671-54742, 82571-82661, 93254-93279, 100532-100813, 111066-111102, 233760-235422 (registry chunk.vendor.js:112-268, module 1)
- [ ] EDT-GL-015 Non-GL / composite effects that use the same pipeline (for reference, owned by the styles inventory): GBlurEffect 249, GDropShadowEffect 321, GInnerShadowEffect 432, GMultiEffect 535, GOverlayEffect 729, GMirrorEffect 840, GColorGradingEffect 1008, GColorAdjustMultiEffect 1026, GAdjustMultiEffect 1027, GContactShadowEffect 1028, GCurvedShadowEffect 1029, GLongShadowEffect 1031; PDF variants GPDFDropShadowEffect 1448, GPDFInnerShadowEffect 1449 — old: chunk.vendor.js:46256-46345, 56287-56418, 70550-70674, 75874-76053, 100569-100677, 111103-111285, 233926-233967, 234663-235298, 254128-254463
- [ ] EDT-GL-016 Effect texture lifetime flags: DELETE_EFFECT_TEXTURES_AFTER_DRAW and DELETE_BLEND_AND_GRADIENT_TEXTURES_AFTER_DRAW (forced on non-desktop) — old: chunk.vendor.js:10360-10366 (module 51), chunk.vendor.js:83748-83750 (module 643)

### Tool manager and tool base (TOOLMGR)

Key naming used below: "Meta" is the platform command key. GPlatform maps it to Cmd on macOS desktop and to Ctrl everywhere else (iPad included), and suppresses AltGr (Ctrl+Alt right) on Windows. "Alt" is optionKey.

- [ ] EDT-TOOLMGR-001 GToolManager registry: constructor registers 30 tool instances in this order: Pointer, SubSelect, Lasso, Layer, Line, Pen, Bezigon, PathsGraph, Freehand, Magic, Rectangle, Ellipse, Triangle, Polygon, Star, SimpleShape, Text, Knife, Fill, Slice, Fill (again), Hand, Zoom, Connector, then annotation tools Ellipse, Pencil, Rectangle, Arrow, Comment, Highlighter; lookup by type id (getTool/indexOf/hasTool) — old: chunk.vendor.js:81004-81036 (module 553)
- [ ] EDT-TOOLMGR-002 Duplicate GFillTool registration: `addTool(new p())` is called twice, so the tool list holds two Fill instances and the type map points at the second; do not reproduce — old: chunk.vendor.js:81028-81030 (module 553)
- [ ] EDT-TOOLMGR-003 Default tool: defaultTool = GPointerTool, changeable with setDefaultTool; notifyJobDone(tool) switches back to the default tool on the next tick (setTimeout 0) unless the tool already is the default; shape, slice, pen-on-Esc etc. call it when they finish — old: chunk.vendor.js:81179-81190 (module 553)
- [ ] EDT-TOOLMGR-004 ToolChangedEvent: fired on every switch with previousTool, newTool and a `light` flag (temporary switch that keeps the old tool's state); InvalidationRequestEvent(manager, area) lets the active tool request a repaint of an area — old: chunk.vendor.js:81042-81062 (module 553)
- [ ] EDT-TOOLMGR-005 activateTool(tool, icon, force): refused while a temporary tool is active unless force; refuses if the current tool is not deactivatable (mid-drag) or the new tool's isActivatable(view) is false; passes an icon to tools with setIcon (simple shapes) — old: chunk.vendor.js:81100-81119 (module 553)
- [ ] EDT-TOOLMGR-006 Switching side effects: deactivating a tool clears the view cursor and closes any open inline editor; activating sets the new tool's cursor — old: chunk.vendor.js:81203-81238 (module 553)
- [ ] EDT-TOOLMGR-007 Spring-loaded tool keys: holding a tool key calls tempToolKeyActivate; on key up tempToolKeyRelease(tool, 450): held 450 ms or longer reverts to the previous tool, a quick tap keeps the new tool — old: chunk.vendor.js:81120-81168 (module 553); designer.browser.dev.js:122790-122836 (module 1491)
- [ ] EDT-TOOLMGR-008 Light (stateful) temporary switch: switching to Hand or Zoom, or from Pen/Bezigon to Pen/Bezigon/Pointer/SubSelect/Lasso, keeps the old tool's state (e.g. hold D while drawing with the pen to tweak points, release to continue the path) — old: chunk.vendor.js:81120-81138 (module 553)
- [ ] EDT-TOOLMGR-009 Space / middle mouse = temporary Hand: while Space or the middle button is held the Hand tool is active; released, the previous tool returns; disabled while inline text editing — old: chunk.vendor.js:81257-81296 (module 553)
- [ ] EDT-TOOLMGR-010 Space+Meta = temporary Zoom: pressing Meta while the temporary Hand is active (or while Hand is the active tool) switches to Zoom; Alt then zooms out (see Zoom tool) — old: chunk.vendor.js:81268-81282 (module 553)
- [ ] EDT-TOOLMGR-011 activateSubSelect / activateOldPathTool: helpers used by Enter (pen, freehand, pointer) to jump to SubSelect and by Tab in SubSelect to go back to the last Pen or Bezigon (falls back to Pen) — old: chunk.vendor.js:81191-81202 (module 553)
- [ ] EDT-TOOLMGR-012 Inline hint: tools call updateInlineHint(text, scenePoint, side) to show coordinate/size tooltips near the cursor; manager maps page coords to view coords — old: chunk.vendor.js:81239-81250 (module 553)
- [ ] EDT-TOOLMGR-013 GTool base API: getCursor (default cursor), supportsElementClick, activate(view, light)/deactivate(view, light), isDeactivatable, isActivatable(view), paint(context), updateCursor, invalidateArea, catchesContextMenu, toString — old: chunk.vendor.js:41247-41321 (module 211)
- [ ] EDT-TOOLMGR-014 toolExitKey: optional key (GEditorOptions.toolExitKey, default undefined) that makes any tool call notifyJobDone; the annotations sidebar sets it to ESC while active and restores it after — old: chunk.vendor.js:41260-41316 (module 211); designer.browser.dev.js:25432-25454 (module 567)
- [ ] EDT-TOOLMGR-015 GAnnotationTool mixin: marks a tool as an annotation tool and adds annotation transaction data (createAddAnnotationTransactionData) when it inserts elements — old: chunk.vendor.js:41322-41330 (module 212)
- [ ] EDT-TOOLMGR-016 GItemTool: base for tools that create items; getDefaultStyle() returns the scene style tagged `_sdf=<item type id>` so new items pick up the per-type default style; subclasses implement _getRelatedItemClass — old: chunk.vendor.js:57973-57999 (module 332)
- [ ] EDT-TOOLMGR-017 Auto-pan mixin: beginPan/panView/endPan scroll the view by autoPanStep (3 × screen DPI) while dragging near the viewport edge; used by select, shape, pen, freehand tools — old: chunk.vendor.js:58000-58095 (module 333)
- [ ] EDT-TOOLMGR-018 GShapeTool base: drag-to-create for box/line shapes; ctor flags keepRatio (Shift) and fromCenter (Alt); inserts a live preview shape on drag start (NoPaint + outline), finalises on drag end in one transaction "insert elements"; snaps start and current points through guides — old: chunk.vendor.js:45950-46243 (module 236)
- [ ] EDT-TOOLMGR-019 GShapeTool Shift: with keepRatio, Shift forces width = height (square/circle); for 2-point shapes it snaps the line to horizontal, vertical or 45° — old: chunk.vendor.js:46156-46165 (module 236)
- [ ] EDT-TOOLMGR-020 GShapeTool Alt: with fromCenter, Alt draws from the press point as centre — old: chunk.vendor.js:46166-46177 (module 236)
- [ ] EDT-TOOLMGR-021 GShapeTool Space while dragging: moves the whole shape being drawn instead of resizing it — old: chunk.vendor.js:46052-46063 (module 236)
- [ ] EDT-TOOLMGR-022 GShapeTool live tooltips: while hovering shows "x, y" (coordinatesTooltip), while dragging shows "w × h" or line length (sizeTooltip), decimals from tooltipDecimalPlaces — old: chunk.vendor.js:46117-46199 (module 236)
- [ ] EDT-TOOLMGR-023 GShapeTool click without drag: calls _createShapeManually (no-op for rectangle/ellipse/polygon; text, simple shapes and comment override it), then always notifyJobDone, so shape tools are one-shot and return to Pointer — old: chunk.vendor.js:46018-46031 (module 236)
- [ ] EDT-TOOLMGR-024 App tool table (gravit.tools): each entry has tool class, toolString, title, group (select/path/knife/shape/insert/view), category (menu divider), key, extra shortcuts, icon, pro/feature flag and rich tooltip (title, description, shortcut, video); first entry (Pointer) is activated at start — old: designer.browser.dev.js:119668-120075 (module 1483)
- [ ] EDT-TOOLMGR-025 Tool shortcut registration: for each entry with key or shortcuts, registerShortcut(down = tempToolKeyActivate, up = tempToolKeyRelease 450 ms); pro tools without licence show the PRO interruption; usage stats `tools_activate_shortcut` — old: designer.browser.dev.js:122787-122822 (module 1491)
- [ ] EDT-TOOLMGR-026 Q shortcut: activates Pointer if needed and switches GSelectTool into EditMode.Transform (advanced transform box); ignored while the annotations sidebar is active — old: designer.browser.dev.js:122823-122840 (module 1491)
- [ ] EDT-TOOLMGR-027 canActivateTool in annotation mode: while the annotations sidebar is open, tools in groups path/shape/knife/insert and category "special" (Lasso, Layer) cannot be activated from shortcuts — old: designer.browser.dev.js:122540-122554 (module 1491)
- [ ] EDT-TOOLMGR-028 Annotation sidebar tool whitelist: only Hand, Pointer, Zoom and tools with the GAnnotationTool mixin are allowed; switching to an annotation tool clears the selection — old: designer.browser.dev.js:25711-25726 (module 567)
- [ ] EDT-TOOLMGR-029 Toolbar tool groups: dropdown buttons per group (view, select, shape, path, knife) plus a Text button; the group button shows the last used tool of that group; menu items show the shortcut hint and PRO badge — old: designer.browser.dev.js:139652-139767, 140709-140760, 140931-140978 (module 1541)
- [ ] EDT-TOOLMGR-030 Toolbar click on the active tool: clicking the button of the already active tool resets to Pointer (unless chosen from the menu); respects the sidebar's isToolAllowed — old: designer.browser.dev.js:140695-140708 (module 1541)
- [ ] EDT-TOOLMGR-031 Shared editor options used by tools: pickDistance 4, cursorDistanceSmall 1 / cursorDistanceBig 10 (nudge), cursorConstraint 0 (constraint base angle), autoPanStep 3×DPI, selectDoubleClickBehavior (engine null, app sets "subselect"), leaveWhenClosePath false, invertSelectionMode false, preserveAspectRatio false (app stores it in `designer.settings.dimension.preserveratio`) — old: chunk.vendor.js:6222-6278 (module 24); designer.browser.dev.js:122660, 122684-122688 (module 1491)
- [ ] EDT-TOOLMGR-032 Modifier state: GPlatform tracks shift/alt/meta/ctrl plus Space, Tab, Esc, Z, plus (+/=) and minus keys and the middle button, and fires GModifiersChangedEvent with a `changed` map; tools react to it instead of key events — old: chunk.vendor.js:14440-14530 (module 64)
- [ ] EDT-TOOLMGR-033 Shift constraint helper: GEditor.convertToConstrain snaps a point to 0/45/90° steps (tan 22.5° threshold) around a start point, rotated by cursorConstraint; used by pen, bezigon, knife, pointer moves — old: chunk.vendor.js:19891-19910 (module 82)

### Tools (TOOL)

#### Pointer (selection)

- [ ] EDT-TOOL-001 Pointer tool: id GPointerTool, key V, group select, icon gravit-icon-cursor-filled, default tool; selects whole elements (selection detail off), activates style editors (gradient handles) — old: designer.browser.dev.js:119669-119692 (module 1483); chunk.vendor.js:80518-80586 (module 548)
- [ ] EDT-TOOL-002 Pointer cursors: Select over empty canvas, SelectDot over an element or editor part (or the cursor the part's editor returns), SelectPlus while Alt-dragging a copy, SelectResizeHoriz/Vert over a ruler guide line — old: chunk.vendor.js:58437-58458 (module 334)
- [ ] EDT-TOOL-003 Pointer click: selects the topmost selectable element; with a group, first click selects the group, clicking again inside an already selected group goes deeper (visualGroupSelect option changes the rule); clicking empty canvas clears the selection — old: chunk.vendor.js:58588-58745, 58746-58844 (module 334)
- [ ] EDT-TOOL-004 Pointer Shift+click: toggles the element in the selection; Shift+click on an editor part (handle, point) toggles part selection — old: chunk.vendor.js:58611-58700, 58906-58950 (module 334)
- [ ] EDT-TOOL-005 Pointer Meta+click (deep select): picks the element under the cursor ignoring group nesting and zones; repeated Meta+clicks cycle through the stacked elements below the currently selected one — old: chunk.vendor.js:58746-58795 (module 334)
- [ ] EDT-TOOL-006 Pointer marquee: drag on empty canvas draws a selection rectangle; by default elements touching the rectangle are selected, Alt selects only fully enclosed ones (inverted when invertSelectionMode); Shift adds to the selection; changing Shift/Alt mid-drag re-evaluates — old: chunk.vendor.js:59153-59199, 59497-59505, 59449-59496 (module 334)
- [ ] EDT-TOOL-007 Pointer Space during marquee: moves the marquee rectangle instead of resizing it — old: chunk.vendor.js:59178-59192 (module 334)
- [ ] EDT-TOOL-008 Pointer hold X: while X is held (without Meta) background hit-testing is off, so a drag that starts on an element starts a marquee instead of moving it — old: chunk.vendor.js:59600-59607, 59743-59745, 60828-60836 (module 334)
- [ ] EDT-TOOL-009 Pointer drag to move: dragging a selected element moves the selection with snapping (guides), coordinate/position tooltip; committed as "transform selection" — old: chunk.vendor.js:59022-59135, 60130-60160, 59200-59300 (module 334)
- [ ] EDT-TOOL-010 Pointer Shift while moving: constrains the move to horizontal/vertical/45° from the start point (path points use the path editor's constrainPosition) — old: chunk.vendor.js:60017-60050 (module 334)
- [ ] EDT-TOOL-011 Pointer Alt+drag: duplicates the selection and moves the copy, committed as "transform clone selection"; cursor turns to SelectPlus — old: chunk.vendor.js:59222-59275, 58437-58444 (module 334)
- [ ] EDT-TOOL-012 Pointer Meta while moving: collisionless move (elements keep their page/parent); when dropped over an image the moved items are added to the image mask, Meta also allows dropping into groups/containers; dropping onto another page reparents to that page — old: chunk.vendor.js:60134-60160, 60215-60300 (module 334)
- [ ] EDT-TOOL-013 Pointer resize handles: Shift keeps aspect ratio on corner handles; with preserveAspectRatio on, corner handles always keep ratio (text only if allowTextRatioPreservation); Alt resizes from the centre (passed to movePart) — old: chunk.vendor.js:59957-60016 (module 334)
- [ ] EDT-TOOL-014 Pointer rotate handle tooltip: shows the angle; Shift or snapRotate rounds the shown angle to whole degrees (the actual angle snapping lives in the box/transform editors) — old: chunk.vendor.js:60441-60519 (module 334)
- [ ] EDT-TOOL-015 Pointer transform box (EditMode.Transform): Q opens the transform box; drag transforms with Alt (from centre/pivot) and Shift (constrain) passed to transformTBox; clicking far outside drops back to Select mode — old: chunk.vendor.js:58399-58436, 58612-58635, 60286-60302 (module 334)
- [ ] EDT-TOOL-016 Pointer edit modes: GSelectTool.EditMode Select 0 / Transform 1 / Edit 2; Edit turns on selection detail and selection edit (points of shapes), Transform opens the transform box and full-content transform; EditModeChanged event — old: chunk.vendor.js:58168-58212, 58399-58436 (module 334)
- [ ] EDT-TOOL-017 Pointer double click: first tries to open the inline editor of the clicked element (text); otherwise lets the editor under the mouse handle it (in a transaction "modify %element"); with selectDoubleClickBehavior "subselect" (app default) a double click on a selected element switches to SubSelect, with "edit" it toggles EditMode.Edit; two presses more than 250 ms apart are not a double click — old: chunk.vendor.js:59506-59567 (module 334); chunk.vendor.js:80548-80575 (module 548)
- [ ] EDT-TOOL-018 Pointer Enter: with a selection, opens the inline editor of the first selected element that supports inline editing (text), otherwise switches to SubSelect — old: chunk.vendor.js:59707-59728 (module 334)
- [ ] EDT-TOOL-019 Pointer Esc: closes the inline editor if one is open, otherwise notifyJobDone; the toolExitKey also drops back to EditMode.Select — old: chunk.vendor.js:59773-59779 (module 334); chunk.vendor.js:80576-80581 (module 548)
- [ ] EDT-TOOL-020 Arrow-key nudge: arrows move the selection by cursorDistanceSmall (1), Shift+arrows by cursorDistanceBig (10), in document units; Meta+arrows moves collisionless; deltas accumulate and commit on key release or when Meta/Tab changes; ignored while Space is held — old: chunk.vendor.js:59614-59706, 59743-59757, 59916-59928 (module 334)
- [ ] EDT-TOOL-021 Arrow-key resize: holding + or − together with an arrow key resizes the selection from the matching side (top/bottom/left/right) instead of moving — old: chunk.vendor.js:59627-59697 (module 334)
- [ ] EDT-TOOL-022 Alt hover distance guides: with showDistance on, pressing Alt with no drag active activates the distance helper (measurements to neighbours); Alt+arrow nudges update it; released, measurement stops — old: chunk.vendor.js:59795-59802, 59698-59706 (module 334)
- [ ] EDT-TOOL-023 Pointer click on path segment: clicking a segment hit of a selected path inserts a new point there ("insert path point"); Shift keeps the existing point selection — old: chunk.vendor.js:58956-58990 (module 334)
- [ ] EDT-TOOL-024 Pointer ruler guide lines: pressing on a guide line starts MoveGuideLine mode and drags the guide (view.startMoveGuideLine/moveGuideLine) — old: chunk.vendor.js:58620-58635, 59143-59152, 59166-59171 (module 334)
- [ ] EDT-TOOL-025 Pointer crop context: hovering an image's internal part (crop) is reported by isCropContext and suppresses the tool's context menu handling — old: chunk.vendor.js:59568-59582 (module 334)
- [ ] EDT-TOOL-026 Pointer key forwarding: key events are forwarded to selected text editors that handle keys (canHandleKeyEvents) — old: chunk.vendor.js:59729-59741 (module 334)

#### SubSelect

- [ ] EDT-TOOL-027 SubSelect tool: id GSubSelectTool, key D, group select, icon gravit-icon-cursor (Corel build: gravit-icon-cursor-subselect); selects anchor points and parts inside paths and groups (selection detail on, path resize off, right-drag enabled) — old: designer.browser.dev.js:119692-119716 (module 1483); chunk.vendor.js:67951-68046 (module 386)
- [ ] EDT-TOOL-028 SubSelect cursors: inverse variants of the pointer cursors (SelectInverse, SelectDotInverse, SelectPlusInverse) — old: chunk.vendor.js:67968-67977 (module 386)
- [ ] EDT-TOOL-029 SubSelect selection rules: selects any item except groups (goes through groups to leaves), never pages; marquee uses partial bbox collision when nothing is selected — old: chunk.vendor.js:68013-68027 (module 386)
- [ ] EDT-TOOL-030 SubSelect Shift: Shift+click toggles anchor points; marquee with Shift adds points (inherited from GSelectTool) — old: chunk.vendor.js:58611-58700 (module 334)
- [ ] EDT-TOOL-031 SubSelect double click: with behaviour "subselect" (app default) a double click on empty space returns to the default tool — old: chunk.vendor.js:68003-68012 (module 386)
- [ ] EDT-TOOL-032 SubSelect Tab: with exactly one path or compound path selected, Tab returns to the last used Pen/Bezigon tool to continue drawing — old: chunk.vendor.js:68028-68041 (module 386)

#### Lasso

- [ ] EDT-TOOL-033 Lasso tool: id GLassoTool, key O, group select, category special, icon gravit-icon-rope; SubSelect with a freehand area selector (smoothed polygon) instead of a rectangle; cursor Lasso — old: designer.browser.dev.js:119718-119739 (module 1483); chunk.vendor.js:102469-102666 (module 748)
- [ ] EDT-TOOL-034 Lasso modifiers: Shift adds to the point selection; Alt switches to full-enclosure collision (inherited) — old: chunk.vendor.js:59449-59505 (module 334)

#### Layer

- [ ] EDT-TOOL-035 Layer tool: id GLayerTool, no shortcut in code (docs and shortcuts page say M), group select, category special, icon gravit-icon-sheets; on activate stores the selection and selects the active layer, on deactivate restores it; clicking selects the layer containing the clicked element — old: designer.browser.dev.js:119740-119758 (module 1483); chunk.vendor.js:106022-106066 (module 759)

#### Slice

- [ ] EDT-TOOL-036 Slice tool: id GSliceTool, key S, group select, category other, icon gravit-icon-slice, cursor Cross; drag creates a GSlice export area; one-shot (returns to default tool) — old: designer.browser.dev.js:119759-119779 (module 1483); chunk.vendor.js:106618-106798 (module 763)
- [ ] EDT-TOOL-037 Slice modifiers: Shift makes the slice square, Alt draws from the centre; Shift/Alt/Meta changes re-evaluate mid-drag — old: chunk.vendor.js:106736-106776 (module 763)

#### Path drawing

- [ ] EDT-TOOL-038 Pen tool: id GPenTool, key P, group path, icon gravit-icon-pen; click places corner points, click-drag pulls symmetric bezier handles; continues an open selected path from its selected end point (Append/Prepend), else creates a new path — old: designer.browser.dev.js:119780-119800 (module 1483); chunk.vendor.js:76057-76837 (module 539)
- [ ] EDT-TOOL-039 Pen cursors: PenStart (new path), Pen (adding), PenEnd (over the start point: closes), PenModify (over an end point or a point with handles), PenMinus (point without handles: delete), PenPlus / PenPlusMiddle (over a segment: insert), PenDrag while dragging — old: chunk.vendor.js:78778-78821 (module 541); chunk.vendor.js:76631-76656 (module 539)
- [ ] EDT-TOOL-040 Pen Shift: constrains the new point (and handle) to 45° steps from the previous anchor — old: chunk.vendor.js:78598-78612 (module 541)
- [ ] EDT-TOOL-041 Pen Alt while dragging a handle: breaks the handle pair (asymmetric, only the outgoing handle moves); Alt pressed before the drag starts edits the existing point's handle — old: chunk.vendor.js:76470-76560 (module 539); chunk.vendor.js:78566-78576 (module 541)
- [ ] EDT-TOOL-042 Pen Space while dragging: moves the anchor point being placed instead of its handle — old: chunk.vendor.js:76797-76831 (module 539)
- [ ] EDT-TOOL-043 Pen right click: right-click places a rounded-corner point (tp Rounded, cu); Alt+right-click places a connector point — old: chunk.vendor.js:76140-76152, 76180-76190 (module 539)
- [ ] EDT-TOOL-044 Pen on an existing path (edit mode): click on a point with handles removes the handles, click on a point without handles deletes it, click on a segment inserts a point; Shift on a segment highlights and inserts at the exact segment middle (red dot); Alt+right-click on a segment makes the inserted point a connector — old: chunk.vendor.js:78683-78777, 78867-78886 (module 541)
- [ ] EDT-TOOL-045 Pen close path: clicking the first point closes the path; with leaveWhenClosePath the tool exits on close — old: chunk.vendor.js:76116-76124, 76311-76320 (module 539)
- [ ] EDT-TOOL-046 Pen double click: finishes the current path (deselects points, commits) and goes to edit mode; with selectDoubleClickBehavior "edit" it exits the tool instead; double click = two presses within 250 ms — old: chunk.vendor.js:76100-76106 (module 539); chunk.vendor.js:78521-78531 (module 541)
- [ ] EDT-TOOL-047 Pen Esc: ends the path (deselects it), cursor back to PenStart and notifyJobDone (back to Pointer) — old: chunk.vendor.js:78559-78588 (module 541)
- [ ] EDT-TOOL-048 Pen Enter: ends the path and switches to SubSelect — old: chunk.vendor.js:78589-78597 (module 541)
- [ ] EDT-TOOL-049 Pen connect paths: clicking an end point of another open path joins the two paths ("join paths" transaction) — old: chunk.vendor.js:78904-79004 (module 541)
- [ ] EDT-TOOL-050 Pen auto-pan: while moving with the button released near the viewport edge the view scrolls (40 px margin) — old: chunk.vendor.js:76320-76330 (module 539)
- [ ] EDT-TOOL-051 Path tool transactions: undo names append point, insert elements, insert point, move point, delete point, modify point properties, modify path properties, join paths — old: chunk.vendor.js:78624-78675 (module 541)
- [ ] EDT-TOOL-052 Bezigon tool: id GBezigonTool, key B, group path, icon gravit-icon-pen-filled, PRO feature "bezigon"; click places points with automatic handles (ah) and no handle dragging; dragging moves the point just placed — old: designer.browser.dev.js:119801-119824 (module 1483); chunk.vendor.js:106156-106520 (module 761)
- [ ] EDT-TOOL-053 Bezigon Alt+click: places a symmetric (smooth curve, diamond) point; Alt on an existing point in edit mode converts it to symmetric — old: chunk.vendor.js:106394-106404, 106226-106231 (module 761)
- [ ] EDT-TOOL-054 Bezigon right click: right-click or Alt+right-click places a connector point; Alt+right-drag moves it — old: chunk.vendor.js:106218-106219, 106347-106350, 106394-106404 (module 761)
- [ ] EDT-TOOL-055 Bezigon Shift / close / connect: Shift constrains to 45°, clicking the first point closes (Alt on close makes it a corner), clicking another path's end connects; Esc/Enter/double click as Pen — old: chunk.vendor.js:106232-106300, 106405-106463 (module 761)
- [ ] EDT-TOOL-056 Freehand tool: id GFreehandTool, no shortcut, group path, category hand, icon gravit-icon-free-hand-draw, cursor PenStart; drag draws a smoothed (curve-fitted) path; closes automatically when the end is within 15 px of the start; new closed path gets its fill visible — old: designer.browser.dev.js:119847-119866 (module 1483); chunk.vendor.js:60842-61343 (module 335)
- [ ] EDT-TOOL-057 Freehand Shift: while Shift is held the stroke continues as straight segments (release the mouse with Shift to add polyline points); releasing Shift finishes — old: chunk.vendor.js:61132-61135, 61192-61279 (module 335)
- [ ] EDT-TOOL-058 Freehand continue stroke: pressing again within 500 ms of the last release continues smoothing from the last released position — old: chunk.vendor.js:61145-61160 (module 335)
- [ ] EDT-TOOL-059 Freehand digit keys: 0–9 set the new path's opacity (`_bop`): 1 = 10 % … 9 = 90 %, 0 = 100 % — old: chunk.vendor.js:61086-61105 (module 335)
- [ ] EDT-TOOL-060 Freehand Esc / Enter / double click: Esc ends and returns to default tool, Enter switches to SubSelect, double click exits only with behaviour "edit"; undo name "create freehand path" — old: chunk.vendor.js:61082-61131, 61335-61338 (module 335)
- [ ] EDT-TOOL-061 PathsGraph tool: GPathsGraphTool, registered but not on the toolbar; pen-like tool that draws into a GPathsGraph (live paint graph) with the same Alt/Shift/Esc/Enter rules — old: chunk.vendor.js:103715-104666 (module 753)
- [ ] EDT-TOOL-062 Connector tool: GConnectorTool (extends Pen), registered but not on the toolbar; hover highlights a path, press on a source path then a target path, release connects them via the path selection and returns to default tool; missing its own toString — old: chunk.vendor.js:100819-100912 (module 738)

#### Modify (knife group)

- [ ] EDT-TOOL-063 Knife tool: id GKnifeTool, key K, group knife, category modify, icon gravit-icon-scalpel, cursor Knife; drag a cut line, release cuts every crossed shape (or only the selected shapes if there is a selection); texts are converted to outlines first; locked items skipped — old: designer.browser.dev.js:119825-119846 (module 1483); chunk.vendor.js:104891-105876, 105603-105660, 105847-105871 (module 757)
- [ ] EDT-TOOL-064 Knife Shift: constrains the cut line to 45° steps — old: chunk.vendor.js:105514-105535 (module 757)
- [ ] EDT-TOOL-065 Knife Alt (curved cut): holding Alt at press drags bezier handles first; releasing Alt starts the actual cut along the curve; Space while dragging moves the point — old: chunk.vendor.js:104969, 105227-105256, 105290-105319 (module 757)
- [ ] EDT-TOOL-066 Knife right click: right-click adds a rounded point, Alt+right-click a connector point to the cut path (inherited pen logic) — old: chunk.vendor.js:104975-105012 (module 757)
- [ ] EDT-TOOL-067 Freehand Shaping (Magic) tool: id GMagicTool, no shortcut, group knife, category modify, icon gravit-icon-freehand-shape; freehand stroke that is unioned with or subtracted from the selected shapes; without a selection behaves like Freehand — old: designer.browser.dev.js:119867-119888 (module 1483); chunk.vendor.js:106799-106949 (module 764)
- [ ] EDT-TOOL-068 Magic add/subtract rule: starting inside a selected shape merges, starting outside subtracts; for a stroke that does not intersect the shape the winding decides (clockwise adds, counter-clockwise subtracts); Shift draws straight segments (inherited from Freehand) — old: chunk.vendor.js:106817-106845, 106905-106912 (module 764)

#### Shapes

- [ ] EDT-TOOL-069 Line tool: id GLineTool, key L, group shape, icon gravit-icon-line (Corel title "tool.line"); drag creates a 2-point path without fill; Shift snaps to 0/45/90°, Alt draws from centre; tooltip shows length — old: designer.browser.dev.js:119889-119913 (module 1483); chunk.vendor.js:80632-80698 (module 550)
- [ ] EDT-TOOL-070 Rectangle tool: id GRectangleTool, key R plus extra shortcut M, group shape, icon gravit-icon-rectangle, cursor Cross; Shift square, Alt from centre, Space moves; click without drag does nothing — old: designer.browser.dev.js:119914-119937 (module 1483); chunk.vendor.js:80587-80631 (module 549)
- [ ] EDT-TOOL-071 Ellipse tool: id GEllipseTool, key E, group shape, icon gravit-icon-ellipse; Shift circle, Alt from centre, Space moves — old: designer.browser.dev.js:119938-119958 (module 1483); chunk.vendor.js:80699-80743 (module 551)
- [ ] EDT-TOOL-072 Polygon tool: id GPolygonTool, no shortcut, group shape, category polygon, icon gravit-icon-polygon; always drawn from the press point as centre, drag sets outer radius and rotation; 6 points, inner radius = cos(π/n)·r; Shift locks rotation to 15° steps — old: designer.browser.dev.js:119959-119977 (module 1483); chunk.vendor.js:67806-67876 (module 384)
- [ ] EDT-TOOL-073 Triangle tool: id GTriangleTool, no shortcut, group shape, category polygon, icon gravit-icon-triangle; polygon with 3 points, Shift locks to 15° — old: designer.browser.dev.js:119978-119996 (module 1483); chunk.vendor.js:102247-102261 (module 746)
- [ ] EDT-TOOL-074 Star tool: id GStarTool, no shortcut, group shape, category polygon, icon gravit-icon-star; 5 points, inner radius 0.5 × outer, Shift locks to 18° steps — old: designer.browser.dev.js:119997-120015 (module 1483); chunk.vendor.js:104667-104687 (module 754)
- [ ] EDT-TOOL-075 Simple (parametric) shape tool: GSimpleShapeTool, activated from the shape library menu with init(shapeDef) and an icon; drag sizes the shape, click places it at natural size; 29 presets (rectangles, snipped/rounded corners, oval, triangles, parallelogram, trapezoid, diamond, n-gons, frame, arrows, plus/minus/multiply/equal) — old: chunk.vendor.js:106521-106617 (module 762); designer.browser.dev.js:141097-141160 (module 1541); designer.browser.dev.js:141255-142636 (module 1542)

#### Text

- [ ] EDT-TOOL-076 Text tool: id GTextTool, key T, group insert, icon gravit-icon-textbox; click creates auto-width text "your-text-here" and opens the inline editor; drag creates a fixed-size text box (auto width if narrower than 4, auto height if not taller than one line); Shift/Alt as rectangle — old: designer.browser.dev.js:120016-120036 (module 1483); chunk.vendor.js:80232-80517 (module 547)
- [ ] EDT-TOOL-077 Text tool cursors: Text (I-beam) over an existing text, Cross elsewhere — old: chunk.vendor.js:80272-80278 (module 547)
- [ ] EDT-TOOL-078 Text tool click on existing text: switches to Pointer, selects the text and opens the inline editor at the click position — old: chunk.vendor.js:80282-80296 (module 547)
- [ ] EDT-TOOL-079 Text on path: hovering a path/shape highlights it; clicking creates text linked to the path at the clicked offset (shapes are converted to a path first) — old: chunk.vendor.js:80308-80363, 80428-80480 (module 547)

#### View

- [ ] EDT-TOOL-080 Hand tool: id GHandTool, key H, group view, icon gravit-icon-move; drag scrolls the view; cursor HandOpen, HandClosed while dragging; also the temporary tool for Space and middle mouse — old: designer.browser.dev.js:120037-120056 (module 1483); chunk.vendor.js:104845-104890 (module 756)
- [ ] EDT-TOOL-081 Zoom tool: id GZoomTool, key Z, group view, icon gravit-icon-zoom-in; click zooms in to the next preset level at the click point; drag a rectangle zooms to fit it (a drag under 200 ms and under 64 px² counts as a click) — old: designer.browser.dev.js:120057-120070 (module 1483); chunk.vendor.js:104688-104844 (module 755)
- [ ] EDT-TOOL-082 Zoom tool Alt: Alt+click zooms out to the previous preset; Alt+drag zooms out relative to the rectangle; cursor ZoomPlus / ZoomMinus, ZoomNone when the limit (0.06–256) is reached — old: chunk.vendor.js:104712-104722, 104826-104834 (module 755)
- [ ] EDT-TOOL-083 Zoom presets: zoomLevels 6, 12, 25, 50, 66, 100, 150, 200, 300, 400, 800, 1600, 3200, 6400, 12800, 25600 %, zoomStep 2 when no presets; min/max from GSceneWidget.options (0.06 / 256); also used by the Zoom In/Out actions; zoomMode ±2 (zoom to min/max) is never set — old: chunk.vendor.js:104703-104709, 104785-104822 (module 755); chunk.vendor.js:62557-62558 (module 363)

#### Paint

- [ ] EDT-TOOL-084 Fill (live paint) tool: GFillTool, registered but not on the toolbar, cursor Pipette; only activatable when the selection is all GPathsGraph; click/drag fills the facet under the mouse with the tool's fill (setFill) or resets it to the parent style; undo name "modify fill" — old: chunk.vendor.js:105877-106021 (module 758)
- [ ] EDT-TOOL-085 Eye dropper (action, not a GTool): edit.eyedropper.fill on Meta+Alt+C and I, edit.eyedropper.border on Shift+Meta+Alt+C; opens the inspector's fill, text-colour or border eye dropper at the last cursor point — old: designer.browser.dev.js:157892-157981 (module 1645)
- [ ] EDT-TOOL-086 Place image (action, not a GTool): the toolbar's image button runs GPlaceImportAction with a menu (place/link); there is no image tool — old: designer.browser.dev.js:139769-139790 (module 1541)

#### Annotation tools (annotations sidebar only)

- [ ] EDT-TOOL-087 Annotation toolbar: buttons for Ellipse, Rectangle, Pencil, Highlighter, Line (arrow) and Note (comment) with fill/border/width property sets; no keyboard shortcuts; clicking the active one returns to Pointer; entering annotation mode activates Pointer, hides distance guides and sets toolExitKey = Esc — old: designer.browser.dev.js:25295-25393, 25395-25454 (module 567); designer.browser.dev.js:138340-138357 (module 1536)
- [ ] EDT-TOOL-088 Ellipse annotation tool: GEllipseAnnotationTool (Ellipse tool + annotation mixin), cursor CrossEllipse, creates GEllipseAnnotation; Shift circle, Alt from centre — old: chunk.vendor.js:106950-106976 (module 765)
- [ ] EDT-TOOL-089 Rectangle annotation tool: GRectangleAnnotationTool, cursor CrossRectangle, creates GRectangleAnnotation; Shift square, Alt from centre — old: chunk.vendor.js:107025-107051 (module 767)
- [ ] EDT-TOOL-090 Arrow annotation tool: GArrowAnnotationTool (Line tool based), cursor CrossArrow, creates GArrowAnnotation with head/tail markers; Shift 45° — old: chunk.vendor.js:107100-107126 (module 769)
- [ ] EDT-TOOL-091 Comment (note) annotation tool: GCommentAnnotationTool, cursor Comment; click places a GCommentAnnotation note at the point (dragging disabled) — old: chunk.vendor.js:107171-107228 (module 771)
- [ ] EDT-TOOL-092 Pencil annotation tool: GPencilAnnotationTool (Freehand based), cursor CrossFreehand, creates GPencilAnnotation; one stroke then back to default tool; Esc/Enter ignored — old: chunk.vendor.js:107360-107397 (module 773)
- [ ] EDT-TOOL-093 Highlighter annotation tool: GHighlighterAnnotationTool (Freehand based), cursor CrossHighlight, creates GHighlighterAnnotation; one stroke then back to default tool — old: chunk.vendor.js:107445-107482 (module 775)
- [ ] EDT-TOOL-094 Text annotation tool: GTextAnnotationTool (Text tool based) creates GTextAnnotation; not registered in GToolManager and not used by the app; uses `inherit` instead of `inheritAndMix`, so the GAnnotationTool mixin is never applied — old: chunk.vendor.js:238043-238062 (module 1088)

#### Touch

- [ ] EDT-TOOL-095 GTouchTool: not a canvas tool but a touch-layout panel descriptor (id, sidebar, icon, panel, panelWidth, toolbar, activate/deactivate); APPEARANCE_TOUCH_TOOL preset; sidebars return them from getTouchTools — old: designer.browser.dev.js:14688-14714 (module 340); designer.browser.dev.js:25274-25293 (module 567)

### Cursors (CURSOR)

- [ ] EDT-CURSOR-001 Cursor registry: map of cursor ids to asset names (module has no exported class name; reconstructed name GCursor); Default = null (browser default) — old: chunk.vendor.js:10391-10485 (module 52)
- [ ] EDT-CURSOR-002 Cursor CSS injection: initStyle builds one `.g-cursor-<name>` rule per cursor: `.cur` files from assets/cursor with no hotspot, the cross-* and comment cursors as SVG with hotspot 9 12, ids starting with "!" map to a native CSS cursor (Text = "text"); injected lazily on the first setCursor of a widget — old: chunk.vendor.js:10448-10483 (module 52); chunk.vendor.js:83844-83852 (module 644)
- [ ] EDT-CURSOR-003 Select cursors: Select, SelectInverse, SelectDot, SelectDotInverse, SelectPlus, SelectPlusInverse, SelectArrowOnly, SelectCross — old: chunk.vendor.js:10395-10402 (module 52)
- [ ] EDT-CURSOR-004 Resize/skew/rotate cursors: SelectResizeVert, SelectResizeHoriz, SelectResizeUpLeftDownRight, SelectResizeUpRightDownLeft, SelectSkewVert, SelectSkewHoriz, SelectRotate[8 positions tl, tc, tr, rc, br, bc, bl, lc], SelectRotateRound, SelectSmallRotateRound, SelectCurve, TextResize (TextResize has an asset but no user in code) — old: chunk.vendor.js:10403-10422 (module 52)
- [ ] EDT-CURSOR-005 View cursors: ZoomPlus, ZoomMinus, ZoomNone, HandOpen, HandClosed — old: chunk.vendor.js:10423-10427 (module 52)
- [ ] EDT-CURSOR-006 Drawing cursors: Cross, Pen, PenStart, PenEnd, PenPlus, PenPlusMiddle, PenMinus, PenModify, PenDrag, Lasso, Knife, Pipette, Pixel (Pixel has no user) — old: chunk.vendor.js:10394, 10428, 10435-10445 (module 52)
- [ ] EDT-CURSOR-007 Annotation cursors: CrossEllipse, CrossArrow, CrossRectangle, CrossHighlight, CrossFreehand, Comment (SVG) — old: chunk.vendor.js:10429-10434, 10458-10467 (module 52)
- [ ] EDT-CURSOR-008 Cursor assets: 52 files in public/assets/cursor; pen-close.cur and cursor-scrub.svg exist but are not referenced by the registry — old: chunk.vendor.js:10391-10485 (module 52)
- [ ] EDT-CURSOR-009 Tool-to-cursor mapping: Pointer/SubSelect editor-driven, Lasso → Lasso, pen family → Pen*, Freehand/Magic → PenStart, Knife → Knife, shape tools/Slice/Text → Cross, Text over text → Text, Zoom → Zoom*, Hand → Hand*, Fill → Pipette, annotation tools → Cross*/Comment — old: chunk.vendor.js:45970-45972 (module 236); chunk.vendor.js:61016-61018 (module 335); chunk.vendor.js:105895 (module 758)

### Docs vs code

- [ ] EDT-TOOL-096 Layer tool shortcut mismatch: shortcuts.html and selection-tools.html list Layer = M, but the code gives Layer no key and binds M as a second shortcut for Rectangle — old: designer.browser.dev.js:119740-119758, 119920-119921 (module 1483)
- [ ] EDT-TOOL-097 Rotation snap wording: selection-tools.html says Shift constrains rotation to 15°; the select tool only rounds the angle tooltip to whole degrees with Shift, the actual step is decided in the transform/box editors (check there) — old: chunk.vendor.js:60460-60480 (module 334)
- [ ] EDT-TOOL-098 Docs omissions: the docs do not mention hold-X marquee, Space-to-move marquee/shape, +/− arrow resizing, Meta deep-select cycling, freehand digit opacity, pen right-click rounded/connector points, Space+Meta zoom; all are in code — old: chunk.vendor.js:59600-59706 (module 334); chunk.vendor.js:61086-61105 (module 335)

### Editor core (EDITOR)

- [ ] EDT-EDITOR-001 GEditor per scene: one GEditor per GScene, stored as scene.__graphic_editor__; constructor registers the guide stack (bbox guide with DISTANCE_FIRST priority, grid, guide lines, points, page, full-pixels, page label, symbol label, action guide), the distance helper and scene listeners (insert, remove, flag change, geometry change), and adopts nodes already flagged :selected — old: chunk.vendor.js:19786-19848 (module 82)
- [ ] EDT-EDITOR-002 GEditor.getEditor / tryRunTransaction: static lookup from scene; tryRunTransaction(node, fn, name) wraps fn in begin/commit on the node's scene editor, no-op editor if none — old: chunk.vendor.js:19875-19890 (module 82)
- [ ] EDT-EDITOR-003 Editor events: FileDropEvent(file, position), CustomDropEvent(data, position), ModifiedEvent(data, type Raw=1/Undo=2/Redo=3), SelectionChangedEvent, InlineEditorEvent(BeforeOpen 0, AfterOpen 1, BeforeClose 10, AfterClose 11, TryOpen 20, SelectionChanged 100, TextEdited 101), InvalidationRequestEvent(editor, args with pages/pageTransform), EdGeometryChangeEvent, HotkeyEvent(keys) — old: chunk.vendor.js:20011-20105 (module 82)
- [ ] EDT-EDITOR-004 Selection detail mode (subselect): setSelectionDetail(on) sets/removes the Detail flag on every selected element editor; with selectDoubleClickBehavior "subselect" image editors also enter edit (crop) mode; leaving clears part selections — old: chunk.vendor.js:20152-20188 (module 82)
- [ ] EDT-EDITOR-005 Selection edit mode: setSelectionEdit(on) puts editors that support selection editing (image, paths graph) into edit mode, otherwise toggles the box editor ResizeAll flag — old: chunk.vendor.js:20189-20218 (module 82)
- [ ] EDT-EDITOR-006 Path resize mode: setPathResize(on) (default on) toggles ResizeAll on path, compound path and paths-graph editors so paths show a bbox resize frame — old: chunk.vendor.js:20219-20240 (module 82)
- [ ] EDT-EDITOR-007 Hide/show selection editors: hideSelection sets HideEditor on block editors and the multi-selection editor during interactions, resetHideSelection restores and refreshes — old: chunk.vendor.js:20244-20270 (module 82)
- [ ] EDT-EDITOR-008 Keys on/off for distance helper: keysOff/keysOn keep a list of keys that must not activate the distance helper; activateDistanceHelper(key) honours it — old: chunk.vendor.js:20274-20301 (module 82)
- [ ] EDT-EDITOR-009 Mapping scopes and align exclusions: getMappingScopes returns parent elements of the selection (or active layer / active page) for snapping, getAlignExclusions excludes the selection and its descendants from snap targets — old: chunk.vendor.js:20322-20363 (module 82)
- [ ] EDT-EDITOR-010 Element editor lifecycle: GElementEditor.openEditor creates the element editor on demand, opens parent editors first and inserts it in z-order among sibling editors; closeElementEditor closes children recursively, detaches and deletes element.__editor__ — old: chunk.vendor.js:7045-7105 (module 36)
- [ ] EDT-EDITOR-011 Editor auto close: editors close when an element is neither selected nor highlighted and has no child editors; parent editors close in cascade; node removal closes its editor — old: chunk.vendor.js:22208-22233, 22365-22377 (module 82)
- [ ] EDT-EDITOR-012 Hover highlight: Highlighted flag on an element opens its editor (without parent insertion) and sets the editor Highlighted flag; clearHighlighted removes it scene-wide; GEditorOptions.highlightOnHover default true — old: chunk.vendor.js:22215-22233, 21615-21627 (module 82)
- [ ] EDT-EDITOR-013 Geometry change invalidation: geometry Before/After/Child events on selected elements make their editor request repaint — old: chunk.vendor.js:22234-22243 (module 82)
- [ ] EDT-EDITOR-014 requestInvalidation: editor triggers InvalidationRequestEvent; GEditorWidget maps it through the page or scene world transform (multi-page aware) and invalidates only if the page is the active page in single-page view — old: chunk.vendor.js:20394-20397 (module 82), chunk.vendor.js:236796-236825 (module 1081)
- [ ] EDT-EDITOR-015 Inline editor open/close: openInlineEditor(node, view) refuses while a temporary tool is active, closes any open inline editor, switches a collaborative text annotation to text mode, fires TryOpen/BeforeOpen/AfterOpen and calls beginInlineEdit + adjustInlineEditForView; closeInlineEditor commits a transaction named by finishInlineEdit() or "inline editing" and fires BeforeClose/AfterClose — old: chunk.vendor.js:22131-22204, 22378-22414 (module 82)
- [ ] EDT-EDITOR-016 Active page by mouse: updateByMousePosition in multi-page view hit-tests page bodies and page labels (label height from scene label bbox, pickDistance padding), activates the page under the cursor, selects the page when its label is hit, highlights selectable pages on hover when pageSelectable — old: chunk.vendor.js:21535-21614 (module 82)
- [ ] EDT-EDITOR-017 Insert elements: insertElements(elements, noEditorSetup, noTransaction, insertAboveSelection, handleSymbols, target, insertBefore) targets active layer or scene/active page (skips locked layer/page and NoNewChildren lock), routes annotations into the page annotation list, inserts above the topmost selected sibling when asked, drops texts referenced by text-on-path, calls initialSetup(style of single selected element) on new editors, re-links symbol masters/instances, selects the result; undo name "insert elements" — old: chunk.vendor.js:21053-21190 (module 82)
- [ ] EDT-EDITOR-018 Exchange elements: exchangeElements(old, newList) replaces one node by several at the same position keeping selection — old: chunk.vendor.js:21191-21214 (module 82)
- [ ] EDT-EDITOR-019 Convert selection to paths: shapes become GPath (anchor points cloned, style assigned), texts become their text shapes, other vertex sources via createPathFromVertexSource; undo name "convert to paths" — old: chunk.vendor.js:21215-21279 (module 82)
- [ ] EDT-EDITOR-020 Join paths / split compound path: joinPaths merges selected paths and compound paths into one GCompoundPath at the position of the last one; splitCompoundPath re-inserts sub-paths — old: chunk.vendor.js:21280-21335 (module 82)
- [ ] EDT-EDITOR-021 Arrange order: arrangeOrder(send-front/bring-forward/send-backward/send-back) per parent, skipping over selected siblings, respecting AlwaysBack program lock via validateBlockInsertion; shortcuts Shift+META+Up front, META+Up forward, META+Down backward, Shift+META+Down back — old: chunk.vendor.js:21336-21399, 19977-20010 (module 82), designer.browser.dev.js:56753-56790 (module 869)
- [ ] EDT-EDITOR-022 Center selection: centerSelection aligns selection center/middle to the active page (fixed size: geometry bbox, else paint bbox) — old: chunk.vendor.js:20398-20414 (module 82)
- [ ] EDT-EDITOR-023 Constrain helper: GEditor.convertToConstrain snaps a drag vector to 0/45/90 degrees (tan 22.5 = 0.4142 threshold), optionally in a rotated frame — old: chunk.vendor.js:19891-19925 (module 82)
- [ ] EDT-EDITOR-024 Group bbox helpers: getGroupGeometryBBox (optionally editor preview bbox, optionally page offset for multi-page) and getGroupTransformBBox (editor selection bbox) — old: chunk.vendor.js:19926-19976 (module 82)
- [ ] EDT-EDITOR-025 Edit-transform settings: setFullContentTransform / getEdTransformSettings / clearEdTransformSettings carry a per-editor "transform full content" flag for the next transform — old: chunk.vendor.js:22504-22516 (module 82)
- [ ] EDT-EDITOR-026 Release: release() removes scene listeners and the scene back-reference — old: chunk.vendor.js:20364-20393 (module 82)
- [ ] EDT-EDITOR-027 GEditorOptions defaults: autoPanStep 3*dpi, maxUndoSteps 100, cloneShift 10, pickDistance 4, annotDropDistance 4, cursorDistanceSmall 1, cursorDistanceBig 10, tooltips on, cornerRotate on, rotateHandle "top", resizeHandles on, guide/grid colors, preserveAspectRatio off, selectDoubleClickBehavior null, pathDbClickTime 300, pageSelectable on, inlineEditText on, imageCropDistance 0, maxNumberOfEditorsToDraw 2000, annotationHandles size table, restore() rehydrates colors — old: chunk.vendor.js:6222-6451 (module 24)
- [ ] EDT-EDITOR-028 App overrides of editor options: designer sets selectDoubleClickBehavior "subselect", only coordinate tooltip, adaptiveResizeHandles, preserveAspectRatio from stored setting, outline paint mode from stored setting; touch mode switches handle sizes, pickDistance 20, rotate handle bottom, click-activated distance helper — old: designer.browser.dev.js:122660-122700, 123587-123652 (module 1491)
- [ ] EDT-EDITOR-029 GEditorWorkspace: workspace subclass owning the style editor manager and the GToolManager — old: chunk.vendor.js:107553-107574 (module 778)
- [ ] EDT-EDITOR-030 GEditorPaintConfiguration defaults: page decoration (chessboard, margin, shadow, background white), gridVisible, pageLabelsVisible off, symbolLabelsVisible on, guideLinesVisible on; app sets shadow 4, offsetY 2, rgba(0,0,0,0.25) — old: chunk.vendor.js:107530-107552 (module 777), designer.browser.dev.js:122689-122693 (module 1491)
- [ ] EDT-EDITOR-031 GEditorWidget glue: scene widget bound to a GEditor; wires guides and distance helper invalidation, editor/tool invalidation requests, repaints on scene grid/size/guide properties (w,h,gx,gy,gm,ga1,ga2,vgl,hgl,gaw,gah) and page margin changes — old: chunk.vendor.js:236368-236453, 236770-236828 (module 1081)
- [ ] EDT-EDITOR-032 Text input capture: GEditorWidget.startCaptureInput/endCaptureInput route keyboard and IME composition events through a hidden text box positioned at the caret (updateInputBox), blocking its copy/cut/paste — old: chunk.vendor.js:236634-236725 (module 1081)

### Selection model (SEL)

- [ ] EDT-SEL-001 Selection storage: selection is the ordered list of elements with Node.Flag.Selected; flag set/clear on a node adds/removes it via _tryAddToSelection/_tryRemoveFromSelection, which open/close the element editor and set Selected/Detail editor flags — old: chunk.vendor.js:22215-22233, 22310-22364 (module 82)
- [ ] EDT-SEL-002 Selection queries: hasSelection, getSelection, getSelectionBBox(geometry or paint), getPathSelection (single path/compound path or null), getIndividualSelection (drops containers whose selected children are selected) — old: chunk.vendor.js:20130-20151, 20302-20321, 20784-20803 (module 82)
- [ ] EDT-SEL-003 updateSelection(toggle, nodes): replace mode clears others then flags nodes; toggle mode flips each node (a deselected container re-selects its internally selected children); nodes locked with NoEdit+NoSizeChanges+NoMove+NoDelete+NoSelect are filtered — old: chunk.vendor.js:20595-20631 (module 82)
- [ ] EDT-SEL-004 Marquee/lasso selection: updateSelectionUnderCollision(toggle, nodes, area, multiPage, partsOnly) selects elements, or in detail mode selects parts (anchor points) inside the collision area and only fully-covered elements — old: chunk.vendor.js:20632-20671 (module 82)
- [ ] EDT-SEL-005 Marquee hover preview: highlightSelectablesUnderCollision highlights elements or parts that would be selected while dragging the marquee, with toggle (shift) semantics — old: chunk.vendor.js:20672-20741 (module 82)
- [ ] EDT-SEL-006 clearSelection(keep) / clearInternalSelection(container, keep): deselect all except a list; clearing a container restores its internally selected children — old: chunk.vendor.js:20742-20777 (module 82)
- [ ] EDT-SEL-007 Batched selection updates: _beginSelectionUpdate/_finishSelectionUpdate counter; SelectionChangedEvent fires once at the end, also deactivates the style editor and resets the last-clone memory; begin/finish are recorded into transactions — old: chunk.vendor.js:22244-22267 (module 82)
- [ ] EDT-SEL-008 Multi-selection editor: more than one individual element (not in detail mode) creates a GSelectionPositionEditor on the scene editor that draws one shared box and transforms all; one element uses its own editor; outline flags are cleared when the transform box is off — old: chunk.vendor.js:22268-22309 (module 82), chunk.vendor.js:101984-102246 (module 745)
- [ ] EDT-SEL-009 Save/restore selection with parts: _saveSelection records element, part selection and editor state data; _loadSelection restores both; storeSelection/restoreSelection expose it — old: chunk.vendor.js:22415-22447, 20778-20783 (module 82)
- [ ] EDT-SEL-010 Select by pattern: selectFromPattern(pattern) selects elements on the active page whose fill layers use an equal pattern — old: chunk.vendor.js:22448-22478 (module 82)
- [ ] EDT-SEL-011 Blink selection: blinkSelection(duration, count) flashes the Highlighted flag on the selection — old: chunk.vendor.js:22479-22503 (module 82)
- [ ] EDT-SEL-012 Select all (edit.select-all, META+A): in a text field runs the browser selectAll; else selects top-level, visible, unlocked, non-annotation items on the active page (all pages in multi-page view), skipping fully program-locked ones — old: designer.browser.dev.js:104652-104733 (module 1333)
- [ ] EDT-SEL-013 Deselect all (edit.deselect-all, Shift+META+A): clearSelection, or browser selectAll inside an editable field — old: designer.browser.dev.js:104734-104781 (module 1334)
- [ ] EDT-SEL-014 Invert selection (edit.invert-selection, Shift+META+I): selects the same candidate set as select all minus the currently selected — old: designer.browser.dev.js:154171-154239 (module 1599)
- [ ] EDT-SEL-015 Select-same base (GSelectByAction): builds a value from every selected element, enabled only if all match; selects all non-annotation elements in the scene with an equal value inside a transaction — old: designer.browser.dev.js:27327-27410 (module 609)
- [ ] EDT-SEL-016 Select same fill / border / fill+border (edit.select-by-paintlayer.fill|border|fill_border): compares the list of fill and/or border layer patterns (_pt) — old: designer.browser.dev.js:101369-101435 (module 1304)
- [ ] EDT-SEL-017 Select same border width (edit.select-by-border-width): compares border layer widths (_bw) — old: designer.browser.dev.js:101436-101463 (module 1305)
- [ ] EDT-SEL-018 Select same opacity (edit.select-by-transparency): compares _stop — old: designer.browser.dev.js:101464-101488 (module 1306)
- [ ] EDT-SEL-019 Select same blend mode (edit.select-by-blend-mode): compares _sbl — old: designer.browser.dev.js:101489-101513 (module 1307)
- [ ] EDT-SEL-020 Select same shape type (edit.select-by-shape): compares node name — old: designer.browser.dev.js:101514-101536 (module 1308)
- [ ] EDT-SEL-021 Select same effects (edit.select-by-effect): compares the effect children list — old: designer.browser.dev.js:101537-101561 (module 1309)
- [ ] EDT-SEL-022 Select same font (edit.selectbyfonttype): enabled when all selected texts share one family (_tff or default font); toggles in every text with that family (no transaction) — old: designer.browser.dev.js:76097-76170 (module 1180)
- [ ] EDT-SEL-023 Cycle through layers (view.cycle-through-layers.next|previous, Tab / Shift+Tab): only when the layers sidebar is active; moves selection to next/previous sibling (wraps) or next focusable node in the layer tree; hidden from menus — old: designer.browser.dev.js:106870-106969 (module 1344)
- [ ] EDT-SEL-024 Enter layer group (view.enter-layer-group, Enter; reverse Shift+Enter): in the layer panel selects the focused node's first child, or its parent in reverse, and expands/focuses it — old: designer.browser.dev.js:154787-154850 (module 1605)
- [ ] EDT-SEL-025 Enter key in select tool: with a selection and no annotations view, Enter opens the inline editor of the first selected element that can inline-edit, else switches to the subselect tool — old: chunk.vendor.js:59707-59727 (module 334)

### Undo and transactions (UNDO)

- [ ] EDT-UNDO-001 GTransactionRecorder actions: records PropertyChange (properties, values, oldValues), child insert, child remove, Active flag set/remove only, begin/end block changes with geometry invalidation, selection update begin/finish, transform-box center and box changes, and Special actions from node getTransactionAction/RevertAction — old: chunk.vendor.js:71047-71283 (module 471)
- [ ] EDT-UNDO-002 Recorded replay guard: during undo/redo nodes get recordedTransaction=true so change handlers can tell replays from user edits; scene fires RecordedTransactionStarted/FinishedEvent around each undo/redo — old: chunk.vendor.js:71079-71108, 22009-22052 (module 82/471)
- [ ] EDT-UNDO-003 beginTransaction: saves the selection, starts recorder transaction; nested begin ends the recorder's current list and stores it on the outer stack entry, then starts a new list — old: chunk.vendor.js:21880-21910 (module 82)
- [ ] EDT-UNDO-004 commitTransaction(name, relatedData): pops the stack, takes recorder actions (or the saved outer actions), skips empty transactions, stores selection before/after and pushes one undo state; throws if stack empty — old: chunk.vendor.js:21936-21964 (module 82)
- [ ] EDT-UNDO-005 Undo stack: pushState keeps {id uuid, name, action, revert, data, createdAt}, drops the oldest beyond maxUndoSteps (100), clears redo, fires ModifiedEvent (Raw with relatedData); no merging of consecutive states — old: chunk.vendor.js:21965-21986 (module 82)
- [ ] EDT-UNDO-006 Undo/redo replay: undo reverts actions in reverse order then restores the old selection; redo re-runs actions and restores the new selection; both fire ModifiedEvent Undo/Redo — old: chunk.vendor.js:21911-21935, 22009-22052 (module 82)
- [ ] EDT-UNDO-007 State names: getUndoStateName/getRedoStateName for menu titles; hasUndoState/hasRedoState, getUndoStates/getRedoStates (used by the history panel) — old: chunk.vendor.js:21987-22008 (module 82)
- [ ] EDT-UNDO-008 Save points and modified state: markSavePoint(id?) returns a _SavePoint with rollback; isModified compares top undo id to save point, or with a filter checks whether any state since the save point touched elements outside the filter; isElementModified counts property changes on a node — old: chunk.vendor.js:19850-19858, 22053-22130 (module 82)
- [ ] EDT-UNDO-009 Undo action (edit.undo, META+Z): title "Undo <name>"; in a focused editable field runs document.execCommand("undo") instead — old: designer.browser.dev.js:75606-75691 (module 1171)
- [ ] EDT-UNDO-010 Redo action (edit.redo, Shift+META+Z): same rules with redoState / execCommand("redo") — old: designer.browser.dev.js:95830-95914 (module 1284)
- [ ] EDT-UNDO-011 Transaction debug export: with debugTransactions on, exportStates/importStates serialise the starting scene and all states (node sequence ids) for bug reproduction — old: chunk.vendor.js:21628-21879, 22535-22590 (module 82), chunk.vendor.js:71284-71338 (module 471)

### Clipboard (CLIP)

- [ ] EDT-CLIP-001 Clipboard formats: node data is GNode.serialize JSON under MIME application/gravit+node; system clipboard gets text/xml `<gravit mimeType="application/gravit+node" restricted="<fileId|false>">escaped json</gravit>` plus text/plain of the first text; patterns use application/gravit+pattern — old: chunk.vendor.js:279 (module 2), chunk.vendor.js:10215 (module 50), designer.browser.dev.js:104467-104501 (module 1331)
- [ ] EDT-CLIP-002 Internal clipboard: app keeps a mime-type map (setClipboardContent/getClipboardContent/getClipboardMimeTypes) used as fallback when the system clipboard is unavailable — old: designer.browser.dev.js:122158-122171 (module 1491)
- [ ] EDT-CLIP-003 Copy (edit.copy, META+C) / Cut (edit.cut, META+X): listen to document copy/cut events; skip when an editable field or selectable text has focus; drop children whose parent is also selected, keep only items and layers, add linked elements and annotations to exceptions, append referenced shared styles, restrict commercial files; write internal + system clipboard (navigator clipboard via gContainer when no event, alert on failure) — old: designer.browser.dev.js:104209-104528 (module 1331)
- [ ] EDT-CLIP-004 Copy inline text: when the single copied text is inline-editing, text/plain gets the selected range, else the whole text — old: designer.browser.dev.js:104390-104407 (module 1331)
- [ ] EDT-CLIP-005 Copy/cut style from panel hover: when the mouse is over the fill, border or effect panel with an active style row, copy serialises that layer only; cut removes equal layers from the selection — old: designer.browser.dev.js:104366-104377, 104440-104466, 104502-104507 (module 1331)
- [ ] EDT-CLIP-006 Cut deletes selection: cut copies then calls deleteSelection inside one transaction "Cut selection" — old: designer.browser.dev.js:104440-104466 (module 1331)
- [ ] EDT-CLIP-007 Paste (paste.paste, META+V): shortcut focuses the hidden paste area so the browser paste event fires; menu execute reads navigator.clipboard (permission clipboard-read) and falls back to the internal clipboard — old: designer.browser.dev.js:57717-57784 (module 877)
- [ ] EDT-CLIP-008 Paste bridge (GPaste): listens to document paste (contenteditable div workaround for Firefox/Safari/no ClipboardEvent), accepts text/xml, text/plain, image/svg+xml, png, jpg, jpeg, gif, application/pdf, text/uri-list (URLs fetched as blobs); paste is blocked when the annotations sidebar is open unless inline-editing a text — old: designer.browser.dev.js:101778-101967 (module 1313)
- [ ] EDT-CLIP-009 Paste data resolution order: XML text that is an svg root becomes image/svg+xml; a gravit wrapper is unwrapped (refused if restricted to another file); node data first, then plain text, then images/SVG/PDF via placeOrImport — old: designer.browser.dev.js:101968-102196 (module 1313)
- [ ] EDT-CLIP-010 Paste nodes: shared styles are matched to equal existing styles or recreated, style refs remapped; a pasted page is appended as a new page with its children; elements are inserted above the selection; on infinite canvas the paste is centred in the view, on fixed-size pages it keeps its coordinates — old: designer.browser.dev.js:102064-102125 (module 1313)
- [ ] EDT-CLIP-011 Paste single style layer: a lone fill or border layer is appended to every selected stylable (not page/group/symbol), an effect to their effects — old: designer.browser.dev.js:102021-102063 (module 1313)
- [ ] EDT-CLIP-012 Paste into inline text: a GText or plain text while inline-editing goes to the text editor's processPaste (unless GInlineTextEditor.HANDLECOPYPASTE) — old: designer.browser.dev.js:102027-102033, 102136-102147 (module 1313)
- [ ] EDT-CLIP-013 Paste plain text: creates a GText with auto width, picks a font family that covers the string (and RTL direction) if the default font cannot, centres it in view — old: designer.browser.dev.js:102148-102176 (module 1313)
- [ ] EDT-CLIP-014 Paste images: png/jpg/gif/svg/pdf go through document.placeOrImport inside a "paste image" transaction — old: designer.browser.dev.js:102177-102196 (module 1313)
- [ ] EDT-CLIP-015 Paste style (edit.paste.style, F4): takes the first stylable node from the clipboard and assignStyleFrom onto every selected stylable; a text source is temporarily attached to the page so its style resolves — old: designer.browser.dev.js:57495-57583 (module 875)
- [ ] EDT-CLIP-016 Paste and replace (edit.paste.replace, OPTION+META+V): replaces each selected element by a clone of the clipboard content aligned to its geometry top-left — old: designer.browser.dev.js:57584-57716 (module 876)
- [ ] EDT-CLIP-017 Paste here (edit.paste.here, context menu only): pastes so the content's top-left lands at the right-click position mapped into page coordinates — old: designer.browser.dev.js:76278-76401 (module 1182)
- [ ] EDT-CLIP-018 Paste in place (edit.paste.in-place, Shift+META+V): needs a selection; pastes so the content's top-left matches the current selection bbox top-left — old: designer.browser.dev.js:76402-76501 (module 1183)
- [ ] EDT-CLIP-019 Paste inside (edit.paste.inside, OPTION+Shift+META+V): for each selected unlocked container inserts valid clones aligned to the container's top-left — old: designer.browser.dev.js:76502-76623 (module 1184)
- [ ] EDT-CLIP-020 New from clipboard (file.new.clipboard, Shift+Ctrl+OPTION+N): creates a new document with a white auto-size page, inserts clipboard items/layers, clears the internal clipboard and zooms to fit — old: designer.browser.dev.js:154555-154639 (module 1602)
- [ ] EDT-CLIP-021 Copy exclusion list: GEditorOptions.propertiesExcludedFromCopying is passed to clone/serialize (app sets it from its config, default null) — old: chunk.vendor.js:6283 (module 24), designer.browser.dev.js:122666-122667 (module 1491)

### Drag and drop (DND)

- [ ] EDT-DND-001 Canvas drop target: GEditorWidget listens to dragenter/dragover (dropEffect move) and drop on its input element; the app window also forwards stray drops to the active view — old: chunk.vendor.js:236393-236417, 237063-237066 (module 1081), designer.browser.dev.js:121731-121746 (module 1491)
- [ ] EDT-DND-002 File drop: each dropped file fires GEditor.FileDropEvent with the page-space position; the document resolves type by extension or MIME and calls placeOrImport at that point — old: chunk.vendor.js:237093-237100 (module 1081), designer.browser.dev.js:8155-8172 (module 163, GDocument)
- [ ] EDT-DND-003 placeOrImport formats: JPG/JPEG/HEIC/GIF/PNG as GImage via GBitmapImport (size limit maxPngDataSize, quarter for JPEG off iOS, HEIC converted), SVG/SVGZ via GSVGImport, PDF and AI via PDF import, EPS via GEPSImport; pro-only types interrupt; element moved so its top-left (or centre) is at the drop point — old: designer.browser.dev.js:7598-7895 (module 163, GDocument)
- [ ] EDT-DND-004 Data drop types: application/gravit+pattern (DropType.Pattern), application/gravit+node (Node, symbols resolved to the scene master), application/font+family (FontFamily), gravit/custom+drop+data (CustomDropEvent), text/plain (Text) — old: chunk.vendor.js:7037-7044 (module 36), chunk.vendor.js:237101-237137 (module 1081)
- [ ] EDT-DND-005 Drop onto element: hit-tests unlocked elements at the drop point and offers the drop to each editor's acceptDrop (child editors first) — old: chunk.vendor.js:237138-237168 (module 1081), chunk.vendor.js:7362-7371 (module 36)
- [ ] EDT-DND-006 Pattern drop on shape: dropping a pattern on a shape stroke replaces border layers, elsewhere replaces fill layers ("drop pattern") — old: chunk.vendor.js:30167-30193 (module 128)
- [ ] EDT-DND-007 Font drop on text: FontFamily drop sets _tff on the text ("drop font"); no app code sets this MIME type — old: chunk.vendor.js:68137-68153 (module 387)
- [ ] EDT-DND-008 Node drop on empty canvas: dropped node (e.g. from the symbols panel) is moved to the drop point (symbols by their bbox top-left), activates the page under the mouse, inserted above selection; master symbols get re-linked to instances in one "insert master symbol" transaction — old: chunk.vendor.js:237169-237229 (module 1081)
- [ ] EDT-DND-009 Symbol drop resolution: _handleSymbolDrop reuses an existing detached master with the same multireference id or promotes the dropped symbol to master (masterRef/masterMultiRef) — old: chunk.vendor.js:237067-237092 (module 1081)
- [ ] EDT-DND-010 Symbols panel drag source: symbol tiles set application/gravit+node with the serialized symbol on dragstart — old: designer.browser.dev.js:172136-172149 (module 1718)
- [ ] EDT-DND-011 Pattern drag source: swatch/pattern targets set application/gravit+pattern on dragstart — old: designer.browser.dev.js:172890-172991 (module 1723)
- [ ] EDT-DND-012 Touch drag polyfill: DragDropTouch maps touchstart/move/end to HTML5 drag events with a synthetic DataTransfer and drag image — old: designer.browser.dev.js:120522-120960 (module 1488)

### Keyboard nudging (NUDGE)

- [ ] EDT-NUDGE-001 Arrow nudge: in the select tool arrows move the selection by cursorDistanceSmall (1) or with Shift by cursorDistanceBig (10) document units; ignored while Space is held or during inline editing; deltas accumulate while keys repeat — old: chunk.vendor.js:59600-59690 (module 334), chunk.vendor.js:6236-6237 (module 24)
- [ ] EDT-NUDGE-002 Nudge commit on key up: releasing the arrow applies the accumulated transform as one undo step (applySelectionTransform) and leaves Moving mode — old: chunk.vendor.js:59743-59757, 59916-59928 (module 334)
- [ ] EDT-NUDGE-003 Keyboard resize: holding + or - with an arrow resizes the selection from the matching side (Up=top, Down=bottom, Left=left, Right=right; + grows, - shrinks), committed via applyResizeSelection — old: chunk.vendor.js:59626-59676, 59916-59924 (module 334), chunk.vendor.js:20916-20975 (module 82)
- [ ] EDT-NUDGE-004 Nudge options: META during nudge requests collisionless transform (pages), OPTION with distance helper active updates distance measurements; multi-page view moves in page space — old: chunk.vendor.js:59677-59706 (module 334)
- [ ] EDT-NUDGE-005 moveSelection with snapping: moveSelection(delta, snap, ...) skips NoMove-locked blocks, maps the bbox (or the closest side for single-element snap zones) through the guides with exclusions, then transforms; returns the effective delta — old: chunk.vendor.js:20804-20865 (module 82)
- [ ] EDT-NUDGE-006 scale/transform/resize selection: scaleSelection around a side or centre, transformSelection forwards edTransform to each editor (per-page offset in multi-page), resizeSelection forwards side drags; EdGeometryChangeEvent after each — old: chunk.vendor.js:20866-20940 (module 82)
- [ ] EDT-NUDGE-007 applySelectionTransform(clone, noTxn, keepSelection, ...): commits previewed editor transforms, optionally as clones (Alt-drag copy), skips partially locked elements, undo names "transform selection" / "transform clone selection" — old: chunk.vendor.js:20976-21049 (module 82)

### Image crop (CROP)

- [ ] EDT-CROP-001 Image edit (crop) mode: GImageEditor.setEditMode(on) sets dblMode/csc properties, opens an inner ImageBoxEditor (green #00FFA8, doubled rotate distance) for the image content; leaving or deselecting removes it — old: chunk.vendor.js:56827-56911 (module 329)
- [ ] EDT-CROP-002 Initial crop inset: when entering crop on an uncropped image and imageCropDistance > 0, the frame is shrunk by that distance (view-scale aware) in a "crop image" transaction — old: chunk.vendor.js:56838-56886 (module 329)
- [ ] EDT-CROP-003 Crop parts: CROPFRAME_PART_ID moves/resizes the visible frame, IMAGEINTERNAL_PART_ID drags the image inside the frame (setImageTransform), both snap via guides; crop handles painted as filled vertices; cursor SelectCross inside, SelectSmallRotateRound on rotate handle — old: chunk.vendor.js:56707-56708, 56920-57001 (module 329)
- [ ] EDT-CROP-004 Crop handles hit-test: _getInternalPartInfoAt / _getOutlinePartInfoAt / _getResizePartInfoAt and _iterateCropHandles with angle and middle handle annotations — old: chunk.vendor.js:57002-57240, 57240-57340 (module 329)
- [ ] EDT-CROP-005 Crop action (modify.crop): enabled for a single ready image in detail mode; finishes cropping by switching the pointer tool (from subselect if needed) to EditMode.Select — old: designer.browser.dev.js:101562-101616 (module 1310)
- [ ] EDT-CROP-006 Cancel crop (modify.cancel-crop): resets trf to the image transform (ut true, tl_sx 0) if they differ, then leaves crop like modify.crop — old: designer.browser.dev.js:101617-101688 (module 1311)
- [ ] EDT-CROP-007 Crop context: the select tool treats a press on IMAGEINTERNAL part as crop context (no context menu capture) — old: chunk.vendor.js:59576-59587 (module 334)

### Symbols (SYMBOL)

- [ ] EDT-SYMBOL-001 Create symbol (modify.createsymbol, F8): prompts for a name (default "Symbol N", unique among masters); existing instances are converted to masters, other valid nodes are wrapped with GSymbol.create in their common unlocked parent; more than one symbol in the selection is a pro feature — old: designer.browser.dev.js:27167-27326 (module 608)
- [ ] EDT-SYMBOL-002 Detach symbol (modify.detachsymbol, Shift+META+F8): detaches selected non-master instances that have a master; undo name counts them — old: designer.browser.dev.js:57420-57494 (module 874)
- [ ] EDT-SYMBOL-003 GSymbolEditor: purple (#8466B0) block editor with a draggable label part (LABEL_PART_ID moves the whole symbol, full-content transform), listens to scene geometry changes while attached — old: chunk.vendor.js:237603-237756 (module 1086)
- [ ] EDT-SYMBOL-004 Master edit propagation: transforming a master frame applies the same resize to sibling instances whose frame, scale and skew match the master (_transformSiblings), and to child elements as dependent updates with blockEv set — old: chunk.vendor.js:237783-237921 (module 1086)
- [ ] EDT-SYMBOL-005 Symbol labels: GSymbolLabelGuide draws "○ name" for masters above their frame (active page or all pages in multi-page view) when symbolLabelsVisible — old: chunk.vendor.js:235627-235699 (module 1077)
- [ ] EDT-SYMBOL-006 Delete inside instances: deleting a child of a non-master symbol hides and fully locks it (vis false, lkt Full) instead of removing, unless in detail mode — old: chunk.vendor.js:20537-20594 (module 82)
- [ ] EDT-SYMBOL-007 Insert with symbols: insertElements(…, handleSymbols) promotes pasted/dropped masters not present in the scene, remaps masterRef of instances and links instances to masters — old: chunk.vendor.js:21114-21180 (module 82)
- [ ] EDT-SYMBOL-008 Go to master (touch context menu): selects the first unlocked instance and runs fit selection; as written it never looks up the master — old: designer.browser.dev.js:149155-149200 (module 1563)

### Duplicate, delete, transform, align, clip (DUP)

- [ ] EDT-DUP-001 Duplicate (edit.duplicate, META+D, also Shift+META+D): cloneSelection(noShift, remember) clones store-able selected elements next to the originals (pages get a new offset and name) and selects them; repeated duplicate re-applies the transform between the last duplicate and its source (step and repeat) — old: designer.browser.dev.js:102422-102472 (module 1315), chunk.vendor.js:20466-20536 (module 82)
- [ ] EDT-DUP-002 Clone with offset: cloneSelection(true) offsets clones by cloneShift (10) and keeps the transform box active — old: chunk.vendor.js:20466-20536 (module 82)
- [ ] EDT-DUP-003 Delete (edit.delete, REMOVE; also Delete on macOS / Backspace elsewhere): with annotations sidebar active asks to confirm and removes annotations; with mouse over a fill/border/effect panel style removes those layers; else deleteSelection — old: designer.browser.dev.js:104529-104651 (module 1332)
- [ ] EDT-DUP-004 deleteSelection rules: skips NoDelete-locked nodes, lets editors delete selected parts (anchor points) instead of the element, removes now-empty compound paths/groups upward, deletes layers via scene.deleteActiveLayer, undo name "delete selection" — old: chunk.vendor.js:20537-20594 (module 82)
- [ ] EDT-DUP-005 Rotate/flip (arrange.transform.rotate-45/90/180-left|right, flip-vertical, flip-horizontal): rotates or mirrors each rotatable element around the group geometry centre; no shortcuts — old: designer.browser.dev.js:56952-57184 (module 871)
- [ ] EDT-DUP-006 Align (arrange.align.*): OPTION+A left, OPTION+H centre, OPTION+D right, OPTION+W top, OPTION+V middle, OPTION+S bottom, justify-horizontal/vertical without shortcut; a single element aligns to the page (fixed size) or scene paint bbox unless its editor aligns parts (anchor points) — old: designer.browser.dev.js:56250-56467 (module 866)
- [ ] EDT-DUP-007 arrangeAlign engine: aligns to the union bbox or a given rect, to the fully locked elements' bbox if any, to the parent bbox for a lone element whose editor cannot align parts; justify scales to full width/height; undo name "arrange alignment" — old: chunk.vendor.js:21400-21534 (module 82)
- [ ] EDT-DUP-008 Clip (modify.clip, OPTION+META+M): needs 2+ elements; the first in node order becomes the container and every other element whose paint bbox intersects it moves inside, with change blocking around the move — old: designer.browser.dev.js:51963-52061 (module 809)
- [ ] EDT-DUP-009 Mask with shape (modify.mask-with-shape, META+Shift+M): runs clip with reversed order, renames the container "Mask", replaces its fills with white and, if it had a black/white linear gradient fill, adds an alpha-mask GOverlayEffect from that gradient — old: designer.browser.dev.js:76171-76277 (module 1181)

### Element editors (ELEDIT)

All of these live in chunk.vendor.js. Class tree: GBaseEditor (39) → GBoxEditor (66) → GElementEditor (36) → GBlockEditor (154) → GItemEditor (274) → GShapeEditor (128) → GPathBaseEditor (155) → GPathEditor / GRectangleEditor / GEllipseEditor / GPolygonEditor. Editors are lazily attached to scene nodes as `node.__editor__`.

- [ ] EDT-ELEDIT-001 Editor registry: `GElementEditor.exports(EditorClass, NodeClass)` maps node type id → editor class; `createEditor` instantiates by type id — old: chunk.vendor.js:7033-7051 (module 36)
- [ ] EDT-ELEDIT-002 Registration table: GSceneEditor→GScene (79113), GPageEditor→GPage (57742), GLayerEditor→GLayer (106080), GGroupEditor→GGroup (102709), GPathBaseEditor→GPathBase (33005), GPathEditor→GPath (28307), GCompoundPathEditor→GCompoundPath (45553), GPathsGraphEditor→GPathsGraph (51649), GRectangleEditor→GRectangle (57370), GEllipseEditor→GEllipse (80768), GPolygonEditor→GPolygon incl. stars (102283), GTextEditor→GText (68084), GImageEditor→GImage (56700), GSliceEditor→GSlice (237384), GSimpleShapeEditor→GSimpleShape (237449), GCompoundShapeEditor→GCompoundShape (237256), GImageGridEditor→GImageGrid (237337), GSymbolEditor→GSymbol (237622), GCollabTextEditor→GCollabText (237950), connector editor→GConnector (235711); annotation editors register at 106994/107069/107140/107248/107411/107496/109280/238085 — old: chunk.vendor.js:7033-7036 (module 36)
- [ ] EDT-ELEDIT-003 openEditor: opens editor for node and recursively opens editors for all GElement ancestors, inserts child editor in z-order among siblings, calls `_attach`; throws if node not attached to a scene — old: chunk.vendor.js:7052-7090 (module 36)
- [ ] EDT-ELEDIT-004 closeElementEditor: closes child editors first (element and non-element), invalidates, detaches from parent editor, deletes `__editor__` — old: chunk.vendor.js:7091-7105 (module 36)
- [ ] EDT-ELEDIT-005 Editor tree base: parent/child editor list (append/insert/remove), `accept` visitor, `_paintChildren` with filter — old: chunk.vendor.js:7541-7575 (module 39)
- [ ] EDT-ELEDIT-006 Editor flags: Selected=1, Detail=2 (sub-select/detail mode), Outline=4, HideEditor=8, BackEditor=16 (painted behind/hit-tested last), Highlighted=32; setFlag/removeFlag invalidate before and after — old: chunk.vendor.js:7484-7491 (module 39)
- [ ] EDT-ELEDIT-007 PartInfo record: {editor, id, data, isolated, selectable}; isolated parts are dragged by the editor itself (movePart), non-isolated ones move with the selection — old: chunk.vendor.js:7500-7511 (module 39)
- [ ] EDT-ELEDIT-008 Part selection model: updatePartSelection(toggle, parts) does XOR-toggle when toggle=true else replace; only while Selected; `_partIdAreEqual` overridable; owned-parts variants for child editors — old: chunk.vendor.js:7585-7623 (module 39)
- [ ] EDT-ELEDIT-009 Part hit testing: getPartInfoAt walks child editors top-down, BackEditor children last, then own bbox expanded by tolerance → `_getPartInfoAt` — old: chunk.vendor.js:7637-7660 (module 39)
- [ ] EDT-ELEDIT-010 Temporary outline flag during drags: movePart/_setTransform set Outline temporarily (setOutlineTmpFlag) and clear it on apply/reset, so the preview is drawn as outline — old: chunk.vendor.js:7678-7693 (module 39)
- [ ] EDT-ELEDIT-011 Move/transform protocol: movePart → preview; applyPartMove = _prepare/_apply/_finish; edTransform sets a preview transform; applyTransform = _prepare/_apply/_finish; resetTransform drops preview — old: chunk.vendor.js:7686-7731 (module 39)
- [ ] EDT-ELEDIT-012 Editor capability hooks: canInlineEdit/beginInlineEdit/finishInlineEdit, canHandleDblClick/handleDblClick, canHandleKeyEvents/handleKeyEvent, isDeletePartsAllowed/deletePartsSelected, isAlignPartsAllowed/alignParts, validateSelectionChange, block/allowRemoval, getCursor — old: chunk.vendor.js:7732-7824 (module 39)
- [ ] EDT-ELEDIT-013 selectToolDragStartAction: lets an editor (or child) replace the dragged PartInfo when a drag starts (e.g. pull handles out of a point); second arg = right mouse button — old: chunk.vendor.js:7756-7764 (module 39)
- [ ] EDT-ELEDIT-014 Adaptive outline colour: samples canvas pixel under the element's top-left, blends element fill layers (opacity, `_stop`), and switches outline to white or dark blue (0,0,40) when the selection colour is too close to the background — old: chunk.vendor.js:7428-7483 (module 39)
- [ ] EDT-ELEDIT-015 Element preview: editors keep an `_elementPreview` clone (`_baseElement` back-link) painted instead of the element during drags; getPaintElement returns it — old: chunk.vendor.js:7118-7120 (module 36)
- [ ] EDT-ELEDIT-016 Element bbox: uses source bbox × transform when geometry is unchanged, adds margin and custom handle bbox; empty unless Selected/Highlighted — old: chunk.vendor.js:7171-7193 (module 36)
- [ ] EDT-ELEDIT-017 Layout re-anchoring: after part moves/transforms on elements with the Layout mixin, children with horizontal/vertical anchors (hacr/vacr, hatrf/vatrf) are re-laid-out unless noRelayout — old: chunk.vendor.js:7214-7265 (module 36)
- [ ] EDT-ELEDIT-018 Transform apply rules: blocked for PartialLocked elements or elements without Transform mixin; supports transform or preTransform (pre-multiplied in element space) — old: chunk.vendor.js:7270-7361 (module 36)
- [ ] EDT-ELEDIT-019 Drop on element editor: acceptDrop(e, dropType, data, hit) bubbles to child editors first; DropType Pattern=0, Text=1, Node=2, FontFamily=10; MIME `application/font+family`, `gravit/custom+drop+data` — old: chunk.vendor.js:7037-7044 (module 36)
- [ ] EDT-ELEDIT-020 initialSetup: new element gets creator `uid` when Annotable; overridden per type for default style — old: chunk.vendor.js:7381-7383 (module 36)
- [ ] EDT-ELEDIT-021 GBlockEditor program locks: `plkt & NoSizeChanges` removes resize handles, `plkt & NoMove` removes rotation; outline drawn from vertex outline (or box when hidden and no tbox) — old: chunk.vendor.js:32868-32875 (module 154)
- [ ] EDT-ELEDIT-022 GBlockEditor transformBox → preTransform on preview; paints with preview element — old: chunk.vendor.js:32913-32930 (module 154)
- [ ] EDT-ELEDIT-023 LabelHolder mixin: label bbox above element (scaled or fixed label size) used by pages/symbols as drag handle — old: chunk.vendor.js:32877-32893 (module 154)
- [ ] EDT-ELEDIT-024 GItemEditor catch handle: element placed inside a shape (content/mask) gets a center diamond "catch" handle to grab it, not for Paths children — old: chunk.vendor.js:51537-51610 (module 274)
- [ ] EDT-ELEDIT-025 GShapeEditor initialSetup: applies default style (`style[_sdf=<typeId>]`, fallback shape default) or the previous element's style: geometry+visual props, paint layers, effects — old: chunk.vendor.js:30126-30163 (module 128)
- [ ] EDT-ELEDIT-026 GShapeEditor pattern drop: dropping a pattern/colour on the stroke replaces border layers, elsewhere replaces fill layers (one transaction "drop-pattern") — old: chunk.vendor.js:30164-30192 (module 128)
- [ ] EDT-ELEDIT-027 Center cross: in Detail mode shapes with `_hasCenterCross` (rect, ellipse, polygon) draw an X of centerCrossSize (4px) when the shape is > 2× cross size — old: chunk.vendor.js:30215-30262 (module 128)
- [ ] EDT-ELEDIT-028 GPathBaseEditor: base for anchor-point shapes; preview clones anchor points with Selected flags; styled corners follow box transforms; ExtendingMode Off/Beginning/End for continuing paths; catch handle toggle — old: chunk.vendor.js:33004-33085 (module 155)
- [ ] EDT-ELEDIT-029 GGroupEditor: transform propagates to children (`dependentUpdate`); frames (`frm`) only move children that have no anchors unless full-contents transform; outline per child while transforming — old: chunk.vendor.js:102710-102771 (module 751)
- [ ] EDT-ELEDIT-030 GGroupEditor resize: computes resize from source bbox in box space, shift=keep ratio, alt=from center, preserve-ratio side forces ratio — old: chunk.vendor.js:102808-102838 (module 751)
- [ ] EDT-ELEDIT-031 GLayerEditor: selection outline colour = layer colour (`cls`); frame rect (`frm`) corrected on transform; children transformed with it; closes child editors on reset — old: chunk.vendor.js:106081-106137 (module 760)
- [ ] EDT-ELEDIT-032 GPageEditor: only resize (no rotate); drag page by its label (fixed-size scenes, `pageSelectable`); move writes page `off`set; resize writes w/h/off — old: chunk.vendor.js:57750-57934 (module 331)
- [ ] EDT-ELEDIT-033 Page collision: `pageCollisionTransform` (default when pages can't overlap) moves pages without overlap; otherwise Shift while dragging the label does collision-less move — old: chunk.vendor.js:57750-57772 (module 331)
- [ ] EDT-ELEDIT-034 Page reorder by drag (SWITCH_ORDER, off by default) and master-page move gating (MOVE_MASTER=true) — old: chunk.vendor.js:57861-57900 (module 331)
- [ ] EDT-ELEDIT-035 Page editor only paints for the active page unless multi-page view; page outline width = pageOutlineWidth (2px) — old: chunk.vendor.js:57947-57968 (module 331)
- [ ] EDT-ELEDIT-036 GSceneEditor: root editor; paints page editors offset by page position; hosts the transform box — old: chunk.vendor.js:79130-79182 (module 545)
- [ ] EDT-ELEDIT-037 GSelectionPositionEditor: virtual box editor around the whole multi-selection; disables resize/rotate if any item has NoSizeChanges; sets Outline on members; per-page offset in multi-page view; applies rotate/resize to each member — old: chunk.vendor.js:102098-102203 (module 745)
- [ ] EDT-ELEDIT-038 GCompoundShapeEditor: box = geometry bbox, edTransform forwards to children; setBooleanOp sets `bool` on all child shapes in one transaction — old: chunk.vendor.js:237256-237318 (module 1082)
- [ ] EDT-ELEDIT-039 GImageGridEditor: outline from vertices, axis-aligned box, resets child editors — old: chunk.vendor.js:237337-237365 (module 1083)
- [ ] EDT-ELEDIT-040 GSliceEditor: no rotation; transform applied as x/y/w/h props only when not rotated — old: chunk.vendor.js:237370-237428 (module 1084)
- [ ] EDT-ELEDIT-041 GImageEditor (extends rectangle editor): crop/edit mode via double-click (`dblMode`, `csc`); entering crop insets image by imageCropDistance when image and frame transforms match ("crop-image" transaction) — old: chunk.vendor.js:56827-56905 (module 329)
- [ ] EDT-ELEDIT-042 ImageBoxEditor: inner editor for the image inside the crop frame (BackEditor, outline outside, green 0,255,168, double rotation-corner distance) — old: chunk.vendor.js:56709-56794 (module 329)
- [ ] EDT-ELEDIT-043 Image crop drags: drag inside image = move image under frame (IMAGEINTERNAL, SelectCross cursor); drag frame outline = move frame (CROPFRAME); both snap via guides.mapRect; leaving selection exits crop mode — old: chunk.vendor.js:56920-57001 (module 329)
- [ ] EDT-ELEDIT-044 GCollabTextEditor: image-editor subclass for collaborative text annotation, switches text/image mode, no resize/rotate — old: chunk.vendor.js:237951-238037 (module 1087)
- [ ] EDT-ELEDIT-045 GConnectorEditor (unnamed module): GPathEditor subclass, no box resize/rotate; end anchors cannot be deleted; transforms src/dst paths and anchors — old: chunk.vendor.js:235700-235750 (module 1078)
- [ ] EDT-ELEDIT-046 GSymbolEditor: item editor with LabelHolder, purple colour (132,102,176) — old: chunk.vendor.js:237603-237626 (module 1086)
- [ ] EDT-ELEDIT-047 GStyleEditor base: sub-editor attached to shape/page/scene/group editor for editing a style property (gradients); snapDistance 5px; blocks editor updates while dragging — old: chunk.vendor.js:67889-67946 (module 385)
- [ ] EDT-ELEDIT-048 GGradientStyleEditor: activates on {propHolder, propName} holding a GGradient (fills, borders or effect props); edits a clone and writes back via setProperty — old: chunk.vendor.js:53986-54025 (module 276)
- [ ] EDT-ELEDIT-049 Add gradient stop: clicking on the gradient line (PLUS_STOP part, SelectPlus cursor) inserts a stop with interpolated colour/opacity ("add-gradient-stop" transaction) and selects it — old: chunk.vendor.js:54090-54134 (module 276)
- [ ] EDT-ELEDIT-050 Gradient snapping: stop/end drags snap within 5px to the element bbox corners, edge centers and center; holding Meta disables snapping — old: chunk.vendor.js:54268-54316 (module 276)
- [ ] EDT-ELEDIT-051 Linear gradient editor: end stops move/rotate/scale gradient (shift constrains angle via cursorConstraint relative to the other end); middle stops slide along the line clamped to first/last — old: chunk.vendor.js:109085-109230 (module 782)
- [ ] EDT-ELEDIT-052 Radial gradient editor: start/end/extra/move handles; EXTRA handle click toggles which axis leads (x/y, elliptic radius); MOVE handle translates (SelectCross); shift constrains — old: chunk.vendor.js:108166-108412 (module 780)
- [ ] EDT-ELEDIT-053 Angular gradient editor: center handle (snap) and end handle (shift constrain) — old: chunk.vendor.js:108758-108845 (module 781)
- [ ] EDT-ELEDIT-054 GSimpleShapeEditor: parametric shape "annotation" handles (simpleShape circle 10px) that set parameter by mouse position (setAnnotationMouseLocation); parts not deletable — old: chunk.vendor.js:237490-237600 (module 1085)
- [ ] EDT-ELEDIT-055 Editor-only render limit: maxNumberOfEditorsToDraw 2000 (option) — old: chunk.vendor.js:6284 (module 24)

### Handles (HANDLE)

Handle sizes are in GEditorOptions.annotationHandles and multiplied by screen DPI. Pick tolerance is `annotPickDistance` (default 0) around the handle box; segment tolerance `pickDistance` 4px.

- [ ] EDT-HANDLE-001 Handle painter: shapes rect/circle/diamond, filled+stroked, optional inverted colours, drop shadow (2px, rgba(0,0,0,.75)), outside stroke; bitmaps cached per style key — old: chunk.vendor.js:19628-19715 (module 81)
- [ ] EDT-HANDLE-002 Handle hit box: getAnnotationBBox = size+2 square at pixel-aligned point; paint margin = size+4+shadow*outlineWidth*4 — old: chunk.vendor.js:19716-19729 (module 81)
- [ ] EDT-HANDLE-003 Handle size defaults: rectangle corner circle 8 (margin 10), ellipse start circle/end diamond 8, polygon inner circle/outer diamond 8, text-on-path diamond 8, simple shape circle 10, path corner/control/constrain circle 6, node rect/circle/diamond 10, graph 10, gradient 9 (big 12), catch diamond 8, resize circle 10 inverted, rotate circle 10 at 22px — old: chunk.vendor.js:6285-6420 (module 24)
- [ ] EDT-HANDLE-004 Resize handles: 4 corners (ResizeEdges) + 4 edge centers (ResizeCenters); corners hidden when box smaller than paint margin unless adaptiveResizeHandles — old: chunk.vendor.js:15142-15198 (module 66)
- [ ] EDT-HANDLE-005 Adaptive resize handles (option, off): handle box enlarged to fit handles on tiny objects, drag offset compensated — old: chunk.vendor.js:15199-15240 (module 66)
- [ ] EDT-HANDLE-006 Resize cursor per handle: 8 rotation segments mapped to vert/horiz/diagonal cursors, honours box rotation and mirroring — old: chunk.vendor.js:14867-14896 (module 66)
- [ ] EDT-HANDLE-007 Rotation handle: circle 22px outside the top edge (rotateHandle "top", else bottom), connected by a line, icon rotates with the object; shown in detail mode by default — old: chunk.vendor.js:15065-15094 (module 66)
- [ ] EDT-HANDLE-008 Corner rotation zones: invisible zones just outside each corner (rotateDistance 4px) start rotation, cursor shows segment arrow — old: chunk.vendor.js:14962-15006 (module 66)
- [ ] EDT-HANDLE-009 Preserve-aspect-ratio handle: optional lock icon replacing one resize handle side; dragging it always keeps ratio — old: chunk.vendor.js:6426-6433 (module 24)
- [ ] EDT-HANDLE-010 Rectangle corner handles: in Detail mode each corner shows a circle handle inset along the shoulders; drag sets per-corner `<side>_sx/_sy`; Shift or uniform-corner (`_uf`) makes both shoulders equal; with uniform corners only one is drawn if suppressRedundantCorners — old: chunk.vendor.js:57397-57506 (module 330)
- [ ] EDT-HANDLE-011 Rectangle corner limits: handle only shown when the corner has room (margin+size) to both neighbours — old: chunk.vendor.js:57629-57650 (module 330)
- [ ] EDT-HANDLE-012 Ellipse arc handles: start angle (circle) and end angle (diamond) on the ellipse; dragging sets `sa`/`ea`; if both are selected they rotate together; no snapping — old: chunk.vendor.js:80805-80840 (module 552)
- [ ] EDT-HANDLE-013 Ellipse new element: if no border layer was inherited the border gets butt line caps — old: chunk.vendor.js:80848-80868 (module 552)
- [ ] EDT-HANDLE-014 Polygon/star handles: inner (circle) and outer (diamond) point handles; drag changes radius and angle (`ir/ia`, `or/oa`); Shift keeps the angle (radius only); dragging one of both selected moves the other by the same offset — old: chunk.vendor.js:102322-102372 (module 747)
- [ ] EDT-HANDLE-015 Path node handles: straight/corner = rect, smooth/symmetric/mirror/connector = circle, auto-handles (`ah`) = diamond; selected nodes inverted; highlighted overlay — old: chunk.vendor.js:29389-29476 (module 127)
- [ ] EDT-HANDLE-016 Path bezier handles: shown for selected points and the neighbouring side of adjacent selected points; drawn with a line from the node — old: chunk.vendor.js:29373-29388 (module 127)
- [ ] EDT-HANDLE-017 Path corner shoulder handles: for selected corner points with `cl`/`cr` set, show shoulder circles to edit corner rounding — old: chunk.vendor.js:29446-29460 (module 127)
- [ ] EDT-HANDLE-018 Path hit priority: node > right handle > left handle > right shoulder > left shoulder > segment (path hit test, slope strictly between 0 and 1) — old: chunk.vendor.js:29092-29198 (module 127)
- [ ] EDT-HANDLE-019 Text-on-path distance handle: diamond at the text start on the path; drag sets start offset `tpthl` — old: chunk.vendor.js:68285-68308 (module 387)
- [ ] EDT-HANDLE-020 Text auto-size handles: right-center handle inverted when auto-width (`aw`), bottom-center when auto-height (`ah`); bottom-right painted orange (235,100,60) when scale-content (`sc`) is on — old: chunk.vendor.js:68631-68666 (module 387)
- [ ] EDT-HANDLE-021 Gradient stop handles: one per stop along the gradient, start circle / end rect, size 9, 2px outline; SelectDot cursor — old: chunk.vendor.js:54044-54068 (module 276)
- [ ] EDT-HANDLE-022 Image crop handles: L-shaped corner and bar-shaped middle annotations (Annots Width 5, MiddleLength 30, AngleLength 20 ×DPI) filled with selection colour — old: chunk.vendor.js:57108-57340 (module 329)
- [ ] EDT-HANDLE-023 Catch handle (item inside shape): center diamond 8px — old: chunk.vendor.js:51578-51607 (module 274)
- [ ] EDT-HANDLE-024 Icon annotations: rotate, preserve-aspect-ratio, skew horizontal/vertical singletons sharing an icon-annotation base (module 383) — old: chunk.vendor.js:79010-79035 (modules 542, 543), chunk.vendor.js:102667-102692 (modules 749, 750)
- [ ] EDT-HANDLE-025 Simple-line mode: two-point lines get no box resize/rotate handles (simpleLineMode default on) — old: chunk.vendor.js:28451-28459 (module 127)

### Transform box and box transforms (XFORM)

- [ ] EDT-XFORM-001 Box resize via handles: movePart(RESIZE) maps mouse through guides (snapping, with exclusions), into box space; Shift = keep aspect ratio, Alt (optionKey) = resize from center — old: chunk.vendor.js:14629-14663 (module 66)
- [ ] EDT-XFORM-002 Preserve-aspect-ratio option: `preserveAspectRatio` makes corner handles keep ratio without Shift (texts only if allowTextRatioPreservation); set in select tool — old: chunk.vendor.js:59976-59993 (module 334)
- [ ] EDT-XFORM-003 Resize math: getResizeTransform(box, side, dx, dy, keepRatio, fromCenter); fromCenter doubles the scale delta and pivots on center; ratio uses the larger axis for corners, edge handles copy the scale — old: chunk.vendor.js:2183-2238 (module 7)
- [ ] EDT-XFORM-004 Box rotate: rotation around box center; Shift snaps to 15° (π/12); option snapRotate → 1° steps plus magnet to 90° multiples within 4° (π/45) — old: chunk.vendor.js:14664-14705 (module 66)
- [ ] EDT-XFORM-005 Rotation math: getRotationTransform(from, to, center, snap, step, magnetTol) — old: chunk.vendor.js:2123-2142 (module 7)
- [ ] EDT-XFORM-006 Keyboard/programmatic resize: GBoxEditor.resize(side, delta) — old: chunk.vendor.js:14717-14734 (module 66)
- [ ] EDT-XFORM-007 Outline alignment of box outline: Inside/Center/Outside, drawn via offscreen canvas + DestinationIn/Out — old: chunk.vendor.js:15372-15399 (module 66)
- [ ] EDT-XFORM-008 Transform box (GTransformBox) model: quad tl/tr/br/bl, pivot cx/cy (default box center), current trf and center trf; flags Rotate=1, Skew=2, Resize=4, Move=8 (all on by default) — old: chunk.vendor.js:79576-79633 (module 546)
- [ ] EDT-XFORM-009 Transform box handles: 8 resize (ids 0-7), ROTATION_CENTER pivot (8, diamond), SKEW_HORIZONTAL (9), SKEW_VERTICAL (10), ROTATE (11); plus hit zones OUTLINE (skew by dragging an edge), INSIDE (move), OUTSIDE (rotate within 100px), FAR_OUTSIDE — old: chunk.vendor.js:79598-79626 (module 546)
- [ ] EDT-XFORM-010 Transform box paint: outline, optional skew/rotate icon handles (disabled by default), resize handles, pivot; while rotating draws a horizontal reference line between left/right centers — old: chunk.vendor.js:79721-79831 (module 546)
- [ ] EDT-XFORM-011 Transform box handle visibility: corners need box > 2× handle margin, edge handles > 3× margin — old: chunk.vendor.js:80184-80214 (module 546)
- [ ] EDT-XFORM-012 Transform box hit test order: handles → outline (skew, segment parity = horizontal/vertical) / inside (move) → rotate icon → outside band (rotate) → far outside — old: chunk.vendor.js:79839-79922 (module 546)
- [ ] EDT-XFORM-013 Transform box resize: Shift = keep ratio, Alt = from pivot center; snapped through guides — old: chunk.vendor.js:79929-79970 (module 546)
- [ ] EDT-XFORM-014 Move pivot: dragging ROTATION_CENTER moves the pivot (snapped), applied with "move" transaction and recorded via afterTBoxCenterTransform — old: chunk.vendor.js:79971-79973 (module 546)
- [ ] EDT-XFORM-015 Skew: dragging an edge/skew handle shears around pivot; with Shift snaps dx/dy to a step (scene editor passes 10px, default 20) — old: chunk.vendor.js:79974-79989 (module 546)
- [ ] EDT-XFORM-016 Transform box move: dragging inside picks the nearest third of the box (corner, edge or center) as the snap point, then translates — old: chunk.vendor.js:79991-80005 (module 546)
- [ ] EDT-XFORM-017 Transform box rotate: free rotation around pivot; Shift = 15° steps; snapRotate 1° + 90° magnet; with Shift/snapRotate uses line-constrained rotation that snaps the box's horizontal axis — old: chunk.vendor.js:80006-80034 (module 546)
- [ ] EDT-XFORM-018 Line-constrained rotation math — old: chunk.vendor.js:2143-2182 (module 7)
- [ ] EDT-XFORM-019 Transform box mode state machine: NA, PASSIVE, TBOXMOVE, CNTRMOVE, ROTATE, RESIZE, SKEW; box hidden (pivot only) while dragging — old: chunk.vendor.js:79117-79125 (module 545)
- [ ] EDT-XFORM-020 Activate transform box: hides selection editor (HideEditor) or sets Outline on each selected element; listens to geometry and selection changes and rebuilds the box — old: chunk.vendor.js:79205-79268 (module 545)
- [ ] EDT-XFORM-021 Transform box cursors: inside=SelectCross, rotate=SelectRotateRound, edges=skew horiz/vert, handles=resize cursors, pivot=SelectArrowOnly — old: chunk.vendor.js:79325-79365 (module 545)
- [ ] EDT-XFORM-022 Snap-zone visuals while hovering inside the transform box (guides.getBBoxSnapZones) — old: chunk.vendor.js:79366-79424 (module 545)
- [ ] EDT-XFORM-023 transformTBox/applyTBoxTransform: guides with align exclusions and mapping scopes; result applied through GEditor.transformSelection/applySelectionTransform; undo records tbox changes (afterTBoxChange) — old: chunk.vendor.js:79450-79534 (module 545)
- [ ] EDT-XFORM-024 Select tool wiring: movePart receives shift (or ratio-forced), optionKey and multi-page flag; transformTBox receives optionKey, shiftKey — old: chunk.vendor.js:60000-60010 (module 334)
- [ ] EDT-XFORM-025 Multi-page transforms: EdTransformOptions {isMultiPage, fullContentsTransform, storedMoveData, doCollisionlessTransform}; per-page offset correction — old: chunk.vendor.js:14610-14616 (module 66)
- [ ] EDT-XFORM-026 GVertexTransformer: wraps a vertex source with a transform for previews and outlines — old: chunk.vendor.js:14128-14177 (module 63)

### Path editing (PATHEDIT)

- [ ] EDT-PATHEDIT-001 Path part types: Segment=1, Point=2, LeftHandle=3, RightHandle=4, LeftShoulder=5, RightShoulder=6; segment data HitRes/Handles — old: chunk.vendor.js:28308-28320 (module 127)
- [ ] EDT-PATHEDIT-002 Initial part selection from anchor points flagged :selected — old: chunk.vendor.js:28293-28304 (module 127)
- [ ] EDT-PATHEDIT-003 Point editing only in detail mode: point/handle hit tests and painting are off while ResizeAll is set (normal selection shows the box instead) — old: chunk.vendor.js:29092-29093 (module 127)
- [ ] EDT-PATHEDIT-004 Move selected points: with a part selection, edTransform transforms selected points (and their handles unless auto-handles) on a preview path; on apply, properties copied back in one blocked update — old: chunk.vendor.js:28591-28694 (module 127)
- [ ] EDT-PATHEDIT-005 Drag bezier handle: moves hlx/hly or hrx/hry on preview, clears auto-handles; Shift constrains to angle steps (cursorConstraint) from the node, with a constraint guide line drawn — old: chunk.vendor.js:29950-29992 (module 127)
- [ ] EDT-PATHEDIT-006 Handle mirroring: opposite handle follows according to anchor type tp (Symmetric/Mirror/Asymmetric/Connector) inside the path model; editor writes `tp` and `ah` — old: chunk.vendor.js:28537-28590 (module 127)
- [ ] EDT-PATHEDIT-007 Bend segment: left-drag on a curve segment moves both adjacent handles so the curve passes through the mouse (Bernstein weights); straight segments get handles created at 1/3 and 2/3 first — old: chunk.vendor.js:28700-28866 (module 127)
- [ ] EDT-PATHEDIT-008 Right-drag on a smooth point: pulls out new mirrored handles from the node (tp=Mirror); connector points pull only one side — old: chunk.vendor.js:28943-28985 (module 127)
- [ ] EDT-PATHEDIT-009 Alt+right-drag on a point: pulls out only one handle (right if missing, else left) without mirroring — old: chunk.vendor.js:28927-28942 (module 127)
- [ ] EDT-PATHEDIT-010 Right-drag on a corner point: pulls corner shoulders (rounding) when shoulders are short; otherwise moves the point — old: chunk.vendor.js:28871-28920 (module 127)
- [ ] EDT-PATHEDIT-011 Drag corner shoulder: sets cl or cr; Shift sets both equal (in Detail with independent-corner flag adjusts the other side) — old: chunk.vendor.js:29993-30046 (module 127)
- [ ] EDT-PATHEDIT-012 Double-click a point (Detail, toggleAnchorPointType): toggles Asymmetric ↔ Symmetric with auto-handles — old: chunk.vendor.js:28997-29017 (module 127)
- [ ] EDT-PATHEDIT-013 Marquee point selection: updatePartSelectionUnderCollision selects/highlights points inside a lasso/rect area, toggle mode, also selects the path — old: chunk.vendor.js:29529-29604 (module 127)
- [ ] EDT-PATHEDIT-014 Delete points: allowed when at least one point remains; points of non-master symbol instances can't be deleted — old: chunk.vendor.js:29605-29653 (module 127)
- [ ] EDT-PATHEDIT-015 Align selected points: alignParts(x, y) moves selected points to a shared x and/or y — old: chunk.vendor.js:29654-29696 (module 127)
- [ ] EDT-PATHEDIT-016 movePoint: moves a node and its handles together (handles untouched when auto-handles) — old: chunk.vendor.js:29913-29946 (module 127)
- [ ] EDT-PATHEDIT-017 Points selection type: No/First/Last/Middle/Several (used by tools to continue paths from an end point) — old: chunk.vendor.js:29492-29525 (module 127)
- [ ] EDT-PATHEDIT-018 Path extend mode: ExtendingMode Off/Beginning/End and active extending flag for pen/bezigon continuing a path — old: chunk.vendor.js:33006-33010 (module 155)
- [ ] EDT-PATHEDIT-019 Incremental preview: preview path built lazily with source→preview index table, extended to full path on demand — old: chunk.vendor.js:29714-29774 (module 127)
- [ ] EDT-PATHEDIT-020 Lines default centre border: when a multi-point line finishes drawing and defaultBorderPositionForLines is set, border alignment becomes Center — old: chunk.vendor.js:30084-30096 (module 127)
- [ ] EDT-PATHEDIT-021 Selection inside Paths compound: selection change refused for paths inside a GCompoundPath (validateSelectionChange) — old: chunk.vendor.js:29697-29700 (module 127)
- [ ] EDT-PATHEDIT-022 Segment cursor: SelectCurve over segments — old: chunk.vendor.js:28989-28993 (module 127)
- [ ] EDT-PATHEDIT-023 Compound path editor: delegates edTransform/apply/delete/align/part-selection to child path editors; whole-compound transform when no point selection — old: chunk.vendor.js:45554-45924 (module 235)
- [ ] EDT-PATHEDIT-024 Paths graph part types: Segment, Anchor, Point, LeftHandle, RightHandle, Facet; selection modes None/Anchors/Edge/Facets (one mode at a time) — old: chunk.vendor.js:51650-51667 (module 275)
- [ ] EDT-PATHEDIT-025 Paths graph hit test: edge handles/points in edit, graph anchors, edge points, edge segments, then facets (closed regions) — old: chunk.vendor.js:52589-52741 (module 275)
- [ ] EDT-PATHEDIT-026 Paths graph outgoing edge drawing: setOutgoingPathBase/insertOutgoingPathBase add a new graph line from a start anchor — old: chunk.vendor.js:51689-51714 (module 275)
- [ ] EDT-PATHEDIT-027 Paths graph split edge at segment hit or point — old: chunk.vendor.js:52760-52804 (module 275)
- [ ] EDT-PATHEDIT-028 Paths graph delete: edge mode removes an edge, anchor mode removes anchors (at least one must remain) — old: chunk.vendor.js:53335-53393 (module 275)
- [ ] EDT-PATHEDIT-029 Paths graph stylable parts: selected edges or facet edges become style targets (fill/stroke per facet) — old: chunk.vendor.js:52488-52515 (module 275)
- [ ] EDT-PATHEDIT-030 Paths graph double-click point toggles Asymmetric/Symmetric — old: chunk.vendor.js:52460-52487 (module 275)
- [ ] EDT-PATHEDIT-031 Paths graph defaults: new graph border gets round caps — old: chunk.vendor.js:51732-51739 (module 275)

### Text editing (TEXTEDIT)

- [ ] EDT-TEXTEDIT-001 GTextEditor property access: reads/writes through the selection when inline editing (range formatting), drops `trf` changes for text on path — old: chunk.vendor.js:68096-68112 (module 387)
- [ ] EDT-TEXTEDIT-002 Bold/italic hotkeys without inline edit: Ctrl/Cmd+B toggles weight Bold/Regular, Ctrl/Cmd+I toggles italic, only if the font family has that variant; fires HotkeyEvent — old: chunk.vendor.js:68163-68218 (module 387)
- [ ] EDT-TEXTEDIT-003 Font family drop on text: sets `_tff` ("drop-font" transaction) — old: chunk.vendor.js:68137-68154 (module 387)
- [ ] EDT-TEXTEDIT-004 Content sync: text-layout content changes are serialized to `content` in an "edit-text" transaction; adaptive font size (`afs`) refits the box — old: chunk.vendor.js:68219-68275 (module 387)
- [ ] EDT-TEXTEDIT-005 Text box resize rules: any handle except left/right center turns off auto-height; except top/bottom center turns off auto-width; with scale-content (`sc`) the bottom-right handle scales font size, other handles scale contents — old: chunk.vendor.js:68397-68478 (module 387)
- [ ] EDT-TEXTEDIT-006 Double-click resize handles: right-center toggles auto-width, bottom-center toggles auto-height — old: chunk.vendor.js:68539-68554 (module 387)
- [ ] EDT-TEXTEDIT-007 Paste into inline text: GText content or plain string (Windows line feeds normalized), then auto-width recheck — old: chunk.vendor.js:68479-68501 (module 387)
- [ ] EDT-TEXTEDIT-008 Auto-width overflow: auto-width text that grows past the page edge switches to fixed width (min 50px left) — old: chunk.vendor.js:68502-68527 (module 387)
- [ ] EDT-TEXTEDIT-009 Begin inline edit: requires inlineEditText option, a TL core, a default font, not fake text, editable flag; hides resize handles; first edit of untouched text selects all, else caret at click — old: chunk.vendor.js:69024-69066 (module 387)
- [ ] EDT-TEXTEDIT-010 Finish inline edit: restores resize handles (unless NoSizeChanges), sets `_we` (was edited), deletes the text when empty — old: chunk.vendor.js:69076-69098 (module 387)
- [ ] EDT-TEXTEDIT-011 Caret blink every 500ms while focused; hidden when focus lost — old: chunk.vendor.js:69012-69023 (module 387)
- [ ] EDT-TEXTEDIT-012 Inline editor events: InlineEditorEvent SelectionChanged/TextEdited, HotkeyEvent — old: chunk.vendor.js:68982-69011 (module 387)
- [ ] EDT-TEXTEDIT-013 GInlineTextEditor activation: captures mouse move/down/release/dblclick and key down/up; uses a hidden input box (IME) or key press events; Text cursor — old: chunk.vendor.js:102904-102946 (module 752)
- [ ] EDT-TEXTEDIT-014 Caret movement: Left/Right by char, Ctrl+Left/Right by word, Up/Down by line keeping x, Home/End line start/end, PageUp/PageDown document start/end; RTL swaps Left/Right — old: chunk.vendor.js:103106-103230 (module 752)
- [ ] EDT-TEXTEDIT-015 Shift+movement extends selection (anchor side tracked) — old: chunk.vendor.js:103136-103153 (module 752)
- [ ] EDT-TEXTEDIT-016 Backspace/Delete: delete char before/after or the selection — old: chunk.vendor.js:103231-103251 (module 752)
- [ ] EDT-TEXTEDIT-017 Space easter egg: typing space when the whole text is "lorem" replaces it with lorem ipsum filler — old: chunk.vendor.js:103252-103264 (module 752)
- [ ] EDT-TEXTEDIT-018 Enter: new list item in lists (or unlistify an empty item); Shift+Enter inserts line separator, else newline — old: chunk.vendor.js:103265-103274 (module 752)
- [ ] EDT-TEXTEDIT-019 Tab/Shift+Tab: change list depth in lists, else insert three spaces — old: chunk.vendor.js:103275-103283 (module 752)
- [ ] EDT-TEXTEDIT-020 Ctrl+Z / Ctrl+Y inside inline edit: editor-level undo/redo state (not during IME composition) — old: chunk.vendor.js:103284-103297 (module 752)
- [ ] EDT-TEXTEDIT-021 Ctrl+A selects all text — old: chunk.vendor.js:103298-103300 (module 752)
- [ ] EDT-TEXTEDIT-022 Internal rich clipboard Ctrl+C/X/V, disabled (HANDLECOPYPASTE=false; app clipboard used instead) — old: chunk.vendor.js:103301-103325 (module 752)
- [ ] EDT-TEXTEDIT-023 Formatting hotkeys: Ctrl+B bold, Ctrl+I italic (whole text, only if variant exists), Ctrl+U underline, Ctrl+D strikeout (on selection) — old: chunk.vendor.js:103326-103382 (module 752)
- [ ] EDT-TEXTEDIT-024 Character input filter: maps key codes (with Shift) to printable chars, non-printables ignored — old: chunk.vendor.js:103418-103455 (module 752)
- [ ] EDT-TEXTEDIT-025 IME composition: compositionstart/end, replace composed range, caret delta handling — old: chunk.vendor.js:103462-103521 (module 752)
- [ ] EDT-TEXTEDIT-026 Duplicate key event guard by timestamp (view and DOM key paths) — old: chunk.vendor.js:103527-103576 (module 752)
- [ ] EDT-TEXTEDIT-027 Mouse: click places caret, drag selects, Shift+click extends, double-click selects word, triple-click selects paragraph — old: chunk.vendor.js:103594-103697 (module 752)
- [ ] EDT-TEXTEDIT-028 isSelectionHit: tells the editor whether a press is on selected text (for dragging text out) — old: chunk.vendor.js:103698-103709 (module 752)
- [ ] EDT-TEXTEDIT-029 Text on path transformer: path type, side INSIDE/OUTSIDE, direction outwards/inwards, offset and start distance; maps glyph boxes along the path — old: chunk.vendor.js:41633-41680 (module 215)
- [ ] EDT-TEXTEDIT-030 Text direction transformer: LTR, RTL (mirrored glyph placement), TTB, BTT — old: chunk.vendor.js:49004-49060 (module 266)
- [ ] EDT-TEXTEDIT-031 Text on path transform: only translations can be applied to path-attached text; the attached path gets the transform — old: chunk.vendor.js:68321-68344 (module 387)

### Guides (GUIDE)

- [ ] EDT-GUIDE-001 GGuides manager: per-scene list of guide objects; `beginMap`/`finishMap` bracket a snapping pass (nested counter), collect visuals and invalidate their area; defaults `snapDistance: 5` (screen px, divided by logical zoom), `visualsLength: 10`, `guides: []` (enabled ids), `disabled: false`, `zones: false`; orientations H/V/O — old: chunk.vendor.js:40437-40489 (module 210)
- [ ] EDT-GUIDE-002 Guide registration order: editor creates GGuides and adds, in priority order, bbox (flagged as the bbox guide, priority DISTANCE_FIRST), grid, guide lines, points, page, full pixels, page label, symbol label, action guides; plus a GDistanceHelper — old: chunk.vendor.js:19786-19804 (module 82)
- [ ] EDT-GUIDE-003 mapPoint: asks each enabled guide in order until both x and y are snapped; first hit per axis wins; records a visual line from the snapped point to the target point when they are 2+ units apart; full-pixel guide restricts which guides may combine with it — old: chunk.vendor.js:40626-40687 (module 210)
- [ ] EDT-GUIDE-004 mapRect: snaps a rect via its top-left, bottom-right and center; first tries bbox-guide distance (equal-spacing) mapping, then per-side mapping honouring allowed snap zones — old: chunk.vendor.js:40688-40992 (module 210)
- [ ] EDT-GUIDE-005 Guide visuals painting: snap lines drawn 1 device px with guideOutlineColor (75,215,208), distance segments in distanceHelperColor (255,0,170) with value boxes from the distance helper; handle markers via paintAnnotation; multi-page offsets applied — old: chunk.vendor.js:40993-41120 (module 210)
- [ ] EDT-GUIDE-006 GGuide base + mixins: Visual (paint), Map (map, isMappingAllowed, mapTopLeftOnly), DetailMap modes DetailOnFilterOn/DetailOffFilterOn/FilterOff; exclusions list, allowed snap zones per guide, isRelativeToPage, scope support — old: chunk.vendor.js:25330-25415 (module 99)
- [ ] EDT-GUIDE-007 Smart guides (GBBoxGuide, id `guide.bbox`): snaps to left/right/top/bottom/center of other elements' geometry bboxes on the same page (or the page under the cursor in multi-page view); only elements inside the page bbox; `GUIDE_MARGIN = 20`; scope limits candidates to siblings of the edited elements' container (group/layer) — old: chunk.vendor.js:32178-32371, 32759-32791 (module 153)
- [ ] EDT-GUIDE-008 Distance guides / equal spacing: checkDistanceGuidesMapping + getDistGuides find equal gaps between three bboxes on an axis and produce value segments (with distance labels) and free segments — old: chunk.vendor.js:32390-32752 (module 153)
- [ ] EDT-GUIDE-009 Pivot snapping: _applySnappingToPivots collects visible shapes/paths whose bbox strip crosses the pivots for points snapping — old: chunk.vendor.js:32812-32847 (module 153)
- [ ] EDT-GUIDE-010 Ruler guide lines (GGuideLinesGuide, `guide.guide-lines`): stored in scene properties `hgl`/`vgl` (arrays of world coords, default null); painted full-width 1px in guideLineColor (0,145,234) when `guideLinesVisible`; snapping works even when hidden — old: chunk.vendor.js:100913-101000 (module 739); scene defaults chunk.vendor.js:33532-33533 (module 160)
- [ ] EDT-GUIDE-011 Create guide by dragging from ruler: mousedown on horizontal/vertical ruler (ignores first 2px of vertical ruler) starts a hint div in guideLineHintColor "blue"; drag snaps the position through GGuides excluding bbox and full-pixel guides; inline hint shows coordinate + unit; release adds value to hgl/vgl in an undoable transaction "add guide line"; a plain click without dragging adds a guide at 0 (the user guide calls this double-click) — old: chunk.vendor.js:236484-236618, 236829-236844 (module 1081)
- [ ] EDT-GUIDE-012 Move/remove guide line: pointer tool hit-tests guides within pickDistance/2 (only when guides visible, no other mode active), enters MoveGuideLine mode and calls startMoveGuideLine(index); dropping onto a ruler removes it ("remove guide line"), else "change guide line"; toggling Cmd re-maps the position live — old: chunk.vendor.js:60535-60567, 59147-59167 (module 334); chunk.vendor.js:236551-236618, 236845-236847 (module 1081)
- [ ] EDT-GUIDE-013 Grid guide (GGridGuide, `guide.grid`): paints a Boxed or Axonometric grid only when scene `gm` is set and `gridVisible`; cells grow to at least `MIN_CELL_SPACE = 10` screen px; gridColor (38,50,56) at opacity 0.125; snaps to grid points (axonometric uses `gaw`/`gah`/`ga2`); center zone disallowed — old: chunk.vendor.js:101001-101344 (module 740)
- [ ] EDT-GUIDE-014 Grid scene properties: `gx: 10`, `gy: 10`, `gm: null` (`box` / `axo`), `lgm` (last mode), `gaw: 20`, `gah`, `ga1`, `ga2`, axonometric default angles ±30°, `MIN_GRID_SIZE = 1` — old: chunk.vendor.js:33506-33533 (module 160)
- [ ] EDT-GUIDE-015 Points guide (GPointsGuide, `guide.points`): snaps to anchor points (pivots from element editors or findPivots) of elements in scope; draws node-shaped markers (straight=rect, smooth=circle, auto=diamond) — old: chunk.vendor.js:101350-101647 (module 741)
- [ ] EDT-GUIDE-016 Page guide (GPageGuide, `guide.scene`): for fixed-size scenes snaps to page geometry bbox and margin bbox edges/centers (multi-page aware) — old: chunk.vendor.js:101648-101775 (module 742)
- [ ] EDT-GUIDE-017 Page label guide (GPageLabelGuide, `guide.pagelabel`): paints page name labels above pages; hides a label when an active or higher element overlaps it; scale labels follow zoom — old: chunk.vendor.js:101776-101892 (module 743)
- [ ] EDT-GUIDE-018 Label guide base (GLabelGuide): LabelItem (label, position, color, scale flag, width), paint of collected labels; abstract getId — old: chunk.vendor.js:101893-101983 (module 744)
- [ ] EDT-GUIDE-019 Symbol label guide (`guide.symbollabel`): paints names of master symbols above their frames when `symbolLabelsVisible` — old: chunk.vendor.js:235627-235699 (module 1077)
- [ ] EDT-GUIDE-020 Action guide (`guide.action`): visual-only guide painting actionable items' (prototype action) overlays inside dirty rects; no snapping — old: chunk.vendor.js:235527-235626 (module 1076)
- [ ] EDT-GUIDE-021 Distance helper (GDistanceHelper): measurement overlay showing distances between selection and hovered element; value boxes (`VALUE_MARGIN 5`, `FONT_SIZE 10` × DPI), directions Up/Down/Left/Right, paintDistanceHint used by guides — old: chunk.vendor.js:76838-78103 (module 540)
- [ ] EDT-GUIDE-022 Alt shows distances: holding Option/Alt with no active drag activates the distance helper (unless keysOff includes Option, e.g. while a dialog is open); releasing deactivates; touch mode switches behaviour to "click" — old: chunk.vendor.js:59795-59802 (module 334); chunk.vendor.js:20277-20283 (module 82); designer.browser.dev.js:68480 (module 1150, an overlay dialog)
- [ ] EDT-GUIDE-023 Toggle guide lines visibility (`view.canvas.show-guide-lines`): Cmd+, ; flips viewConfiguration.guideLinesVisible and persists setting `guide_lines_visible` (default true) — old: designer.browser.dev.js:75471-75525 (module 1169)

### Snapping (SNAP)

- [ ] EDT-SNAP-001 Snap settings model: app settings `snap_disabled` (false), `snap_zones` (false), `snap_guides` (default: guide-lines, full-pixels, points, bbox, scene/page, grid) mirrored into GGuides.options on change — old: designer.browser.dev.js:121829-121838, 123530-123538 (module 1491)
- [ ] EDT-SNAP-002 Use Snapping toggle (`view.toggle-snap`): Shift+F10; flips `snap_disabled`; toolbar snap button reflects it — old: designer.browser.dev.js:96064-96136 (module 1288); toolbar designer.browser.dev.js:140182 (module 1541)
- [ ] EDT-SNAP-003 Cmd/Ctrl inverts snapping while held: with snapping on, Meta disables mapping; with snapping off, Meta enables it (full-pixel guide is exempt, so Cmd keeps full-pixel snapping) — old: chunk.vendor.js:25347-25358 (module 99); full-pixel exemption chunk.vendor.js:79075-79079 (module 544)
- [ ] EDT-SNAP-004 Per-guide toggles (`view.toggle-guide.<guideId>`): Snap to Grid / Guide Lines / Full Pixels / Anchor Points / Shapes / Pages; add/remove id in `snap_guides`; enabled only while snapping is on — old: designer.browser.dev.js:96016-96063 (module 1287)
- [ ] EDT-SNAP-005 Snap zones (`view.toggle-snapzones`): only the bbox side nearest the cursor (9 zones) snaps; zone overlay drawn as short tick marks (visualsLength) when within pickDistance of the bbox; disabled while Cmd held; hides distance guides — old: designer.browser.dev.js:96137-96191 (module 1289); chunk.vendor.js:41140-41218 (module 210); chunk.vendor.js:60666-60670 (module 334)
- [ ] EDT-SNAP-006 Snap distance: `GGuides.options.snapDistance = 5` screen units, converted to scene units by logical zoom in each guide's map — old: chunk.vendor.js:40445, 40646 (module 210)
- [ ] EDT-SNAP-007 Snap to grid: rounds to nearest grid point, only when grid mode `gm` is set (grid shown); can combine with full-pixels only if grid cells > 1 (or unit not px) — old: chunk.vendor.js:101304-101344 (module 740)
- [ ] EDT-SNAP-008 Snap to full pixels (`guide.full-pixels`): rounds x/y to integers only when document unit is px; top-left zone only — old: chunk.vendor.js:79036-79088 (module 544)
- [ ] EDT-SNAP-009 Snap to guide lines: nearest hgl/vgl within distance — old: chunk.vendor.js:100960-100995 (module 739)
- [ ] EDT-SNAP-010 Snap to shapes and equal spacing: see GBBoxGuide; scoped to group/layer siblings — old: chunk.vendor.js:32197-32371 (module 153)
- [ ] EDT-SNAP-011 Snap to anchor points and pages: see GPointsGuide / GPageGuide map — old: chunk.vendor.js:101378-101603 (module 741); chunk.vendor.js:101663-101767 (module 742)
- [ ] EDT-SNAP-012 Snap to pixel grid action (`arrange.snap-unit.full|half`): rounds selection bbox x/y/w/h to whole units (half adds 0.5); Full: Shift+Cmd+U; one transaction — old: designer.browser.dev.js:98097-98181 (module 1295)
- [ ] EDT-SNAP-013 Shift constrain to 45°: GEditor.convertToConstrain snaps a drag vector to 0/45/90° (tan 22.5° = 0.4142 threshold) relative to `cursorConstraint` angle (default 0) — old: chunk.vendor.js:19891-19910 (module 82); options chunk.vendor.js:6238 (module 24)
- [ ] EDT-SNAP-014 Rotation angle snapping: Shift snaps rotation to 15° steps (π/12); option `snapRotate` (default false) snaps to 1° with 4° (π/45) tolerance — old: chunk.vendor.js:80006-80033 (module 546); chunk.vendor.js:14684-14693 (module 66)
- [ ] EDT-SNAP-015 Vertex pixel aligner (GVertexPixelAligner): wraps a vertex source and aligns its bbox corners to device pixels (+0.5 unless full) for crisp outlines (selection area, editors) — old: chunk.vendor.js:31749-31866 (module 141)

### Viewport (VIEW)

- [ ] EDT-VIEW-001 Scene widget options: `minZoomFactor 0.06`, `maxZoomFactor 256`, `panOrZoomOnWheel true`, `limitScrollingToView false`, `pinchToZoomFactor 100` — old: chunk.vendor.js:62556-62562 (module 363)
- [ ] EDT-VIEW-002 View transforms: zoom + scroll → world↔view transforms; logical pixels multiply zoom by screen DPI (getLogicalZoom); per-page transforms add page position in multi-page view — old: chunk.vendor.js:62817-62851 (module 363)
- [ ] EDT-VIEW-003 View box, offset and margin: viewOffset/viewMargin [l,t,r,b] shrink the usable area (panels, rulers); getViewVisibleArea excludes rulers — old: chunk.vendor.js:62793-62810, 62852-62863, 63590-63599 (module 363)
- [ ] EDT-VIEW-004 zoomAtCenter / zoomAt / zoomAll: clamp to min/max; zoomAt keeps a world point fixed under cursor; zoomAll fits a rect (optionally "zoom out only" when the second flag is set, selection-relative in multi-page) — old: chunk.vendor.js:62877-62937 (module 363)
- [ ] EDT-VIEW-005 scrollBy + scroll correction: ignores |d| ≤ 0.5, rounds scroll, optional limit-to-content with pageGap 20 — old: chunk.vendor.js:62938-62947, 63061-63154 (module 363)
- [ ] EDT-VIEW-006 Wheel: Cmd/Ctrl+wheel or pinch (e.zoom) zooms at cursor, delta clamped to ±20, step `ZOOM_STEP 37.5`, snaps to preferred steps [0.12 … 128]; plain wheel pans, Shift+wheel swaps axes; full re-render 750 ms after zoom, 100 ms after pan — old: chunk.vendor.js:63600-63652, 62605-62607 (module 363); chunk.vendor.js:37344, 37363-37364 (module 166)
- [ ] EDT-VIEW-007 Pan/zoom quick render: beginZoom/finishZoom, beginPan/finishPan switch render parameters (no WebGL while panning/zooming by default) and invalidate cumulatively afterwards — old: chunk.vendor.js:63389-63457 (module 363); chunk.vendor.js:37356-37359 (module 166)
- [ ] EDT-VIEW-008 Auto-pan while dragging: tools mixin pans the view when the cursor is at the view edge by `autoPanStep = 3 × DPI` (or the drag delta), tracks cumulative translation so drags stay anchored — old: chunk.vendor.js:58005-58095 (module 333); option chunk.vendor.js:6230 (module 24)
- [ ] EDT-VIEW-009 Zoom In (`view.zoom.in`): Cmd++; next level from GZoomTool.zoomLevels, else ×2; zooms around selection center or canvas center; disabled at max — old: designer.browser.dev.js:96192-96272 (module 1290); app helper designer.browser.dev.js:124431-124460 (module 1491)
- [ ] EDT-VIEW-010 Zoom Out (`zoom.out`): Cmd+-; previous level, else ÷2; disabled at min — old: designer.browser.dev.js:96273-96352 (module 1291)
- [ ] EDT-VIEW-011 Zoom levels: GZoomTool.options zoomStep 2, levels 6% … 25600% ([0.06,0.12,0.25,0.5,0.66,1,1.5,2,3,4,8,16,32,64,128,256]); Alt switches zoom tool to zoom-out, drag rect zooms to area (ignored if <200 ms and <64 px²) — old: chunk.vendor.js:104703-104838 (module 755)
- [ ] EDT-VIEW-012 Magnification presets (`view.magnification.<n>`): 6,12,25,50,66,100,150,200,300,400,800,1600,3200,6400,12800,25600%; Cmd+5 = 50%, Cmd+1 = 100%, Cmd+4 = 400%, Cmd+8 = 800% (user guide also lists Cmd+2 = 200%, not in code); zoom centred on scene paint bbox — old: designer.browser.dev.js:75343-75418 (module 1167)
- [ ] EDT-VIEW-013 Original view (`view.zoom.original`): Cmd+0; zoom 100% at page/scene center — old: designer.browser.dev.js:95686-95743 (module 1282)
- [ ] EDT-VIEW-014 Fit All (`view.zoom.fit.all`): Alt+Cmd+0; zoomAll(scene paint bbox) — old: designer.browser.dev.js:19690-19760 (module 449)
- [ ] EDT-VIEW-015 Fit Selection (`view.zoom.fit-selection`): no shortcut; zoomAll(selection bbox, page-relative) — old: designer.browser.dev.js:24841-24877 (module 566)
- [ ] EDT-VIEW-016 Fit Current Layer (`view.zoom.fit-current-layer`): zoomAll(active layer paint bbox) — old: designer.browser.dev.js:154134-154170 (module 1598)
- [ ] EDT-VIEW-017 Toolbar zoom control: "-" / "+" buttons, dropdown with Original View + presets, double-click opens numeric % input (Enter applies, Esc cancels) — old: designer.browser.dev.js:140564-140690 (module 1541)
- [ ] EDT-VIEW-018 Initial view on open: centerAndZoom fits page/content if larger than view, else 100% centred; re-applied when window activates the first time — old: designer.browser.dev.js:129108-129128, 129167-129192 (module 1503)
- [ ] EDT-VIEW-019 Rulers (GRulerWidget): horizontal, vertical and a 19 px unit corner box showing scene unit `ut`; canvas-drawn ticks with adaptive step 1/2/5/10×, 9px Verdana labels, mouse position marker; origin at active page top-left — old: chunk.vendor.js:112711-112923 (module 893); layout chunk.vendor.js:63528-63570 (module 363)
- [ ] EDT-VIEW-020 Show Rulers (`view.canvas.show-rulers`): Cmd+Alt+R; also turns on guide lines when off; persists `rulers_visible` (default false); toggles `#mainframe.rulers` class — old: designer.browser.dev.js:155344-155402 (module 1614); setRulers chunk.vendor.js:62659-62708 (module 363)
- [ ] EDT-VIEW-021 Show Grid (`view.canvas.show-grid`): Cmd+Alt+G; toggles scene `gm` between null and last mode `lgm` (default Boxed) — so it is a document change, and grid snapping depends on it — old: designer.browser.dev.js:95915-95964 (module 1285)
- [ ] EDT-VIEW-022 Outline view (`view.outline-view`): Alt+Y; toggles paintMode Outline ↔ Output (fixed page with clip content) or Full — old: designer.browser.dev.js:98221-98301 (module 1297)
- [ ] EDT-VIEW-023 Fast view (`view.fast-view`): toggles paintMode Fast with `defaultEffectDetailLevel = 0.5/DPI`; no shortcut — old: designer.browser.dev.js:154640-154710 (module 1603)
- [ ] EDT-VIEW-024 Paint modes: Full `F`, Fast `S`, Outline `L`, Output `O`; plus pixelMode, clipToPage, guides/slices/annotations visibility flags, ignoreEffects, multiPageView, rulerLeftFill — old: chunk.vendor.js:30761-30836 (module 133)
- [ ] EDT-VIEW-025 Editor view configuration: pageDecoration (chessboard, margin, shadow, white background), gridVisible, pageLabelsVisible (false), symbolLabelsVisible, guideLinesVisible — old: chunk.vendor.js:107530-107552 (module 777)
- [ ] EDT-VIEW-026 Page background and margins: page painted with chessboard/background/shadow, margin rectangle from `ml/mt/mr/mb` — old: chunk.vendor.js:236913-237062 (module 1081)
- [ ] EDT-VIEW-027 Show Symbol Labels (`view.canvas.show-symbol-labels`): toggles symbolLabelsVisible, setting `symbol_labels_visible` (default true) — old: designer.browser.dev.js:95965-96015 (module 1286)
- [ ] EDT-VIEW-028 Show Slices (`view.canvas.show-slices`): toggles viewConfiguration.slices — old: designer.browser.dev.js:155403-155448 (module 1615)
- [ ] EDT-VIEW-029 Show Effects (`view.canvas.show-effects`): Cmd+E; toggles viewConfiguration.ignoreEffects — old: designer.browser.dev.js:155955-156000 (module 1619)
- [ ] EDT-VIEW-030 Show Selection Handles (`view.canvas.show-selection-handles`): Shift+Cmd+X; hides/restores editors' handles (HideEditor flag) — old: designer.browser.dev.js:157982-158046 (module 1646)
- [ ] EDT-VIEW-031 Toggle fill/border visibility (`view.toggle-paint-layers-visibility.fill|border`): F hides/shows fills, Shift+B borders of selection (sets `_vs` on paint layers, undoable); hidden from menus; disabled while an input has focus — old: designer.browser.dev.js:157660-157792 (module 1642)
- [ ] EDT-VIEW-032 Multi-page mode toggle (`view.toggle-multi-page-mode`): F6, hidden; toggles the outline sidebar multi-page mode — old: designer.browser.dev.js:158282-158318 (module 1650)
- [ ] EDT-VIEW-033 New view (`view.clone`): Cmd+Alt+N opens another window on the same document — old: designer.browser.dev.js:98182-98220 (module 1296)
- [ ] EDT-VIEW-034 Fullscreen (`view.fullscreen`): Alt+Enter — old: designer.browser.dev.js:104795-104860 (module 1335)
- [ ] EDT-VIEW-035 Enhanced tooltips (`help.tooltip-visibility`): toggles rich tooltips on/off — old: designer.browser.dev.js:106551-106601 (module 1342)
- [ ] EDT-VIEW-036 Inline hint: floating div near cursor for coordinates/sizes, 9 anchor sides, newline → `<br>`, hidden on mouse leave — old: chunk.vendor.js:62617-62658, 63663-63672 (module 363)
- [ ] EDT-VIEW-037 Editor widget: hooks guides, distance helper, editor and tool invalidations into the scene widget; IME input capture element; drag/drop listeners (drop handled in DND) — old: chunk.vendor.js:236368-236453, 236637-236725, 236793-236828 (module 1081)
- [ ] EDT-VIEW-038 Scrollbars: none. The canvas has no scrollbars; navigation is wheel, hand tool, auto-pan and touch only — old: chunk.vendor.js:62556-62562 (module 363) (no scrollbar code in either bundle)
- [ ] EDT-VIEW-039 Render cache sizing: desktop keeps 5 zoom levels × 64 cached tiles, other hardware 3 × 21 — old: chunk.vendor.js:63695-63706 (module 363)

### Annotation layer (ANNOT)

- [ ] EDT-ANNOT-001 Handle painter (GEditorAnnotation.paintAnnotation): draws handle shapes rect / circle / diamond with fill, stroke, shadow (SHADOW_SIZE 2) and optional icon, cached on offscreen canvases — old: chunk.vendor.js:19618-19732 (module 81)
- [ ] EDT-ANNOT-002 Handle style options (GEditorOptions.annotationHandles): sizes/types for rectangle, ellipse, polygon, textOnPath, text, simpleShape, path (corner/control/node/graph/center), gradient, catch, resize, rotate (distance 22), transform box (skew/rotate icons off by default), preserve-aspect-ratio handle — old: chunk.vendor.js:6276-6422 (module 24)
- [ ] EDT-ANNOT-003 Icon handles: base with lazy-loaded icon image and setIconVisible; GRotateAnnotation, GPreserveAspectRatioAnnotation, GSkewHorizontalAnnotation, GSkewVerticalAnnotation (singletons bound to their option blocks) — old: chunk.vendor.js:67646-67805 (module 383); chunk.vendor.js:79010-79035 (modules 542, 543); chunk.vendor.js:102667-102692 (modules 749, 750)
- [ ] EDT-ANNOT-004 GAnnotation mixin (review annotations): meta props vis, name, text, img, uid, email, time, mtime, seq, loc, typ, rsv (resolved), rmd (removed), sid, read, asgn, Guid, atp; Hidden flag; addComment; read/unread tracking — old: chunk.vendor.js:23633-23778 (module 84)
- [ ] EDT-ANNOT-005 GAnnotationsList (`annlst`): container node holding annotations; own bbox/hit-test/collision logic; resolve() — old: chunk.vendor.js:72890-73242 (module 506)
- [ ] EDT-ANNOT-006 Annotation visibility: shown only when configuration.annotations and elementAnnotations are on; removed (`rmd`) never shown; resolved (`rsv`) hidden unless showResolvedAnnotations — old: chunk.vendor.js:30808-30828 (module 133)
- [ ] EDT-ANNOT-007 Comment annotation (`anc`, path-based pin): placed by click (no drag) with the Comment cursor — old: chunk.vendor.js:55102-55337 (module 285); tool chunk.vendor.js:107171-107228 (module 771)
- [ ] EDT-ANNOT-008 Rectangle annotation (`anr`, rectangle-based): tool cursor CrossRectangle, no position hint — old: chunk.vendor.js:55952-56016 (module 316); tool chunk.vendor.js:107025-107051 (module 767); editor chunk.vendor.js:107052-107099 (module 768)
- [ ] EDT-ANNOT-009 Ellipse annotation (`ane`): cursor CrossEllipse — old: chunk.vendor.js:56017-56081 (module 317); tool chunk.vendor.js:106950-106976 (module 765); editor chunk.vendor.js:106977-107024 (module 766)
- [ ] EDT-ANNOT-010 Arrow annotation (`anarr`, path with marker; marker border scale) : cursor CrossArrow — old: chunk.vendor.js:56150-56218 (module 319); tool chunk.vendor.js:107100-107126 (module 769); editor chunk.vendor.js:107127-107170 (module 770)
- [ ] EDT-ANNOT-011 Pencil annotation (`anp`, freehand path): cursor CrossFreehand, Esc/Enter do nothing — old: chunk.vendor.js:56219-56286 (module 320); tool chunk.vendor.js:107360-107397 (module 773); editor chunk.vendor.js:107398-107444 (module 774)
- [ ] EDT-ANNOT-012 Highlighter annotation (`anh`, freehand path): cursor CrossHighlight — old: chunk.vendor.js:56082-56149 (module 318); tool chunk.vendor.js:107445-107482 (module 775); editor chunk.vendor.js:107483-107529 (module 776)
- [ ] EDT-ANNOT-013 Text annotation (`ant`, text-based, empty text allowed) — old: chunk.vendor.js:64822-64891 (module 370); tool chunk.vendor.js:238043-238062 (module 1088); editor chunk.vendor.js:109267-109311 (module 783)
- [ ] EDT-ANNOT-014 Collaborative text annotation (`ancotext`, rectangle + linkable references to annotated elements) — old: chunk.vendor.js:75364-75464 (module 533); editor chunk.vendor.js:238063-238093 (module 1089)
- [ ] EDT-ANNOT-015 Empty annotation (`ann`, container) — old: chunk.vendor.js:235423-235486 (module 1035)
- [ ] EDT-ANNOT-016 Annotation editor mixin: on insert stamps name (user), uid, time, seq (max+1 among siblings), loc, typ; transaction data AddAnnotation/RemoveAnnotation; removeAnnotations marks `rmd`, hides, deselects in one transaction — old: chunk.vendor.js:37428-37506 (module 172); tool mixin chunk.vendor.js:41322-41330 (module 212)
- [ ] EDT-ANNOT-017 Annotation element editors: hidden when annotations hidden; double-click swallowed; deletion blocked by program lock `plkt & NoDelete`; exclude themselves from snapping guides; comment editor forces moves without snapping and has no handles — old: chunk.vendor.js:106995-107020 (module 766); chunk.vendor.js:107291-107354 (module 772)
- [ ] EDT-ANNOT-018 Comments panel → canvas: clicking an annotation activates its page/layer, selects it plus linked elements (Shift/Cmd modify selection) and zooms to it; with Alt fits selection — old: designer.browser.dev.js:137759-137815 (module 1535)
- [ ] EDT-ANNOT-019 Cloud annotations payload (GCloudAnnotations): validates annotationsCollection + lastUpdateTime from server, converts UTS format — old: designer.browser.dev.js:62199-62240 (module 1094)

### Touch layer (TOUCH)

- [ ] EDT-TOUCH-001 Touch interface toggle (`view.toggle-touch`): flips setting `touch`; touch is on for iPad runtime, or when TOUCH_LAYOUT + pro + setting — old: designer.browser.dev.js:156828-156911 (module 1634); designer.browser.dev.js:122603-122613 (module 1491)
- [ ] EDT-TOUCH-002 Touch editor options: on enable switches distance helper to click mode, hides detail-mode resize/rotate handles, enlarges all handles (~22-23 px), pickDistance 20, annotPickDistance 4, rotate handle at bottom (distance 46), shows skew/rotate/aspect-ratio icon handles, transform box tolerance 0; default options restore desktop values — old: designer.browser.dev.js:123587-123700 (module 1491)
- [ ] EDT-TOUCH-003 Touch handler base: listens touchstart/move/end/cancel/gesturestart on a target, ignores moves under `MIN_TOUCH_MOVE_DISTANCE 20`, feeds a gesture helper — old: designer.browser.dev.js:57785-57913 (module 878); constants designer.browser.dev.js:23869-23880 (module 519)
- [ ] EDT-TOUCH-004 GGestureHelper: ordered gesture list, first active gesture that handles an event stops the rest; single-touch start delayed 50 ms so a second finger can turn it into a gesture; optional click suppression while swiping — old: designer.browser.dev.js:152159-152271 (module 1582)
- [ ] EDT-TOUCH-005 Editor touch handler: canvas gestures in order pinch/pan, tap→mouse, move→mouse, long-press; always preventDefault — old: designer.browser.dev.js:152309-152337 (module 1584)
- [ ] EDT-TOUCH-006 Two-finger pinch zoom and pan: equal finger distance (±10) pans via scrollBy, changing distance zooms at the midpoint by delta / (DPI × pinchToZoomFactor 100), clamped to min zoom; closes the context menu; enters/leaves touch render mode — old: designer.browser.dev.js:152338-152451 (module 1585); chunk.vendor.js:63679-63691 (module 363)
- [ ] EDT-TOUCH-007 Tap → mouse events: dispatches mousedown/mouseup/click, dblclick when two taps ≤ 300 ms and ≤ 25 px apart; two-finger tap detection (Target or Nearby with threshold) — old: designer.browser.dev.js:57914-58033 (module 879)
- [ ] EDT-TOUCH-008 Touch move → mousemove for tracked identifiers — old: designer.browser.dev.js:104164-104198 (module 1329)
- [ ] EDT-TOUCH-009 Long press → contextmenu after `LONG_PRESS_TIME_OUT 500` ms on a single finger, cancelled by move/end — old: designer.browser.dev.js:152452-152500 (module 1586)
- [ ] EDT-TOUCH-010 Assistant bar virtual keys: sticky Shift, Ctrl, Alt modifier keys (GPlatform.holdKey/releaseKey), arrow keys for nudge, copy, paste menu (paste, in place, inside, replace, style), delete, select/deselect, arrange order, fullscreen, group, ungroup, convert to path, help — old: designer.browser.dev.js:152501-153154 (module 1587)
- [ ] EDT-TOUCH-011 Touch toolbar: per-panel buttons opening fill/border/effect/appearance panels with counts — old: designer.browser.dev.js:139373-139487 (module 1540)
- [ ] EDT-TOUCH-012 Touch context menu: overlay with transform (flip, rotate), paste, compound, path, symbol, text, image sections — old: designer.browser.dev.js:149031-149120 (module 1563)
- [ ] EDT-TOUCH-013 Touch header menu with zoom button (Original, Fit, 50/100/200/400%) — old: designer.browser.dev.js:142712-142752 (module 1543)
- [ ] EDT-TOUCH-014 Quick help overlay (`help.open-quick-help`, touch only): labels UI areas and gestures (pinch to zoom, drag with 2 fingers, tap and hold) — old: designer.browser.dev.js:153194-153546 (module 1589); action designer.browser.dev.js:104887-104920 (module 1336)
- [ ] EDT-TOUCH-015 GTouchTool: descriptor for touch side panels (id, icon, panel selector, width, toolbar), e.g. APPEARANCE_TOUCH_TOOL; sidebar keeps one active touch tool — old: designer.browser.dev.js:14688-14714 (module 340); designer.browser.dev.js:16258-16272 (module 395)
- [ ] EDT-TOUCH-016 Touch render mode: startTouchMode/endTouchMode switch quick render / no WebGL during gestures and fully invalidate after — old: chunk.vendor.js:63679-63691 (module 363)

### Notes for the rewrite

#### Cross-cutting

- Some items appear twice on purpose because they sit on a boundary: the zoom and hand tools are listed under TOOL and VIEW, the annotation tools under TOOL and ANNOT, and the transform-box rotate step under TOOL-097 and XFORM. Implement each once.
- Group/ungroup and layer-panel drag and drop are not in this file. They belong to the panels inventory.
- Line references were checked at the start of each range. Ranges for long functions are approximate at the end.

#### Rendering

- The engine never draws straight to canvas during scene rendering. It records every 2D/WebGL call into a binary command buffer (GRendererCtx, modules 111/897/899) and replays it in 75 ms slices on rAF (module 103). That machinery exists only to keep the UI responsive with heavy effects; a rewrite can use OffscreenCanvas in a worker or plain tiled rendering with requestIdleCallback and drop the recorder entirely.
- Two-canvas design: the scene is rendered into cached tiles per zoom level (modules 663/934) and composited onto a single visible "element" canvas, then the editor overlay (selection, handles, guides, tools) is painted on top every frame. Keep this split: overlay repaints must not trigger scene rerenders.
- Panning reuses pixels (moveContent) and only renders the exposed strips; zoom shows a scaled lower-res cached level ("low-res gimmick") until the rerender after 750 ms. WebGL effects are turned off while panning/zooming. These are the behaviours users notice, so they need explicit equivalents.
- Retina is handled by sizing every backing canvas ×DPI and treating zoom as "logical zoom" (zoom×DPI). Editor UI metrics in GEditorOptions are pre-multiplied by DPI at module load, which breaks if the window moves between screens; compute them at paint time instead.
- 12 blend modes (linear burn, vivid light, divide, etc.) are implemented by reading back the canvas into a WebGL texture and blending in a shader (GBlender, module 643). This is slow and per dirty rect. A WebGL/WebGPU compositor would make these first-class.
- Effects: 31 GGL* effects resolve their shader by string name through a webpack context in the app bundle (app module 817 → cv 474-504). The shader GLSL sources are in cv; port them as-is. Blur and drop shadow already have a CSS `ctx.filter` fast path.
- Zoom range 6%..25600% with wheel snap points at 12, 25, 50, 66, 100, 150, 200, 300, 400, 800, 1600, 3200, 6400, 12800%.
- Paint modes are only four (Full, Fast, Outline, Output). "Pixel preview" does not exist as a paint mode; pixelMode on the config is unused. Pixel crispness comes from makeSharp (px documents only) and the full-pixel guide (snapping inventory).
- Lots of browser sniffing (Chrome smooth downscale, Firefox/Windows shadow bug, Firefox/Linux WebGL bug). Re-test before porting each workaround.

#### Tools

- Tools listen to raw view events plus a global modifier-changed event and re-run their drag logic when a modifier flips mid-gesture. A rewrite should keep that model (pointer state machine plus "modifiers changed" re-evaluation); a keydown-only approach loses Shift/Alt/Space toggling during a drag.
- Spring-loaded keys (450 ms) and the "light" switch that keeps pen state are central to how the pen, D and Space work. Model temporary tools as a stack in the tool manager, not as ad-hoc flags.
- GSelectTool is 2,700 lines mixing selection, move, nudge, transform box, guide dragging, image-mask drop, page reparenting and distance guides. Split it into a pointer state machine plus separate behaviours; SubSelect and Lasso are thin subclasses and should become configuration.
- Dead or hidden pieces to decide on: PathsGraph, Fill and Connector tools are registered but have no UI; Fill is registered twice; the simple-shape library menu is only reachable through a "simpleshape" category that no tool entry has; GTextAnnotationTool lacks its mixin; zoom modes ±2 are unused.
- Platform key mapping (Meta = Cmd on Mac, Ctrl elsewhere, AltGr suppression on Windows) lives in GPlatform and is assumed by every tool. Put it in one input layer.

#### Editor core

- Undo has no merge rules. Every committed transaction is one state, capped at 100. Nested transactions do not merge into the outer one: the inner commit pushes its own state, and actions recorded after the inner commit but before the outer commit are dropped, because the recorder is null by then and the outer commit falls back to the actions saved at nesting time (chunk.vendor.js:21880-21964). A rewrite should use a real nested transaction model.
- The selection lives in node flags (Selected, Highlighted) and the editor listens to flag events. Editors open and close as a side effect of those flags. Keep one source of truth, but expect callers everywhere (panels, actions, tools) to toggle flags directly.
- Clipboard is three layers: hidden contenteditable/textarea for browser events, navigator.clipboard for menu use, and an in-memory map. Paste in place aligns to the current selection's top-left, not to the copied position; plain paste keeps coordinates on fixed-size pages and centres in view on infinite canvas.
- Plus/minus + arrow keyboard resize is easy to miss; it lives in the select tool key handler, not in an action.
- The font-family drop MIME (application/font+family) is handled by the text editor but nothing in the app sets it, and "go to master" in the touch menu selects the instance instead of the master. Decide whether to fix or drop.
- Paste and drop both go through document.placeOrImport, so SVG/PDF/AI/EPS/bitmap import has a single entry point to port.
- Out of my scope but touched: group/ungroup (designer.browser.dev.js module 811) and layer panel tree drag and drop (designer.browser.dev.js:20240-20290) belong to the panels inventory.

#### Element editors

- Modifier mapping is consistent: Shift = keep ratio / 15° rotation / constrain angle / equal corners / keep polygon angle; Alt (optionKey) = from center, and on right-drag of a point pull a single handle; Meta disables gradient snapping. Ctrl/Cmd in text is `metaKey` in view events but `ctrlKey && !altKey` on the DOM path, so check Mac vs Windows mapping.
- Right mouse button drag is a real editing gesture on paths (pull handles, corner shoulders). Context menus must not swallow it.
- Bugs worth not porting: GSceneEditor.getCursor falls through from OUTSIDE to ROTATE (missing break, 79331); GPathEditor segment drag at slope ~0/1 builds a PartInfo with an undefined type `H` (28715-28740); `_movePreviewPointShoulders` reads `cr` as `cl` (`p = null != p ? A : 0`, 30019); paths-graph edge delete removes only the first selected edge (53376).
- Everything previews on a cloned element and commits on mouse up. Keep that split (preview state vs. committed model) so undo stays one transaction per drag.
- Handle geometry is in screen pixels × DPI and bitmaps are cached; the rewrite can draw handles as vector overlays but should keep the sizes from GEditorOptions.

#### Guides, viewport, annotations, touch

- Snapping is one ordered pipeline (GGuides) with first-hit-wins per axis. Keep the order (bbox, grid, guide lines, points, page, full pixels) because it decides which snap wins when several are in range. Snap distance is in screen pixels and must be divided by logical zoom.
- The Cmd/Ctrl key inverts snapping inside GGuide.isMappingAllowed by reading global modifier state. In the rewrite, pass modifiers into the snapping call instead of reading a global.
- "Show Grid" writes the document property `gm` rather than a view flag, so it is undoable, saved, and turns grid snapping on and off. Decide whether to keep that or split visibility from grid mode.
- Ruler guides are plain number arrays in scene properties `hgl`/`vgl` with no ids, so moves and removals are index-based. Guide lines still snap while hidden.
- Zoom limits are 6% to 25600% and appear in three places (GSceneWidget.options, GZoomTool levels, GMagnificationAction levels). Wheel zoom uses its own step list. Put them in one table.
- There are no scrollbars. Touch is a separate input layer that turns touches into synthetic mouse events and rewrites the editor's global handle options at runtime. A rewrite should treat handle sizes as per-input-mode config.
- Review annotations (comment, rectangle, ellipse, arrow, pencil, highlighter, text) are normal scene nodes in an `annlst` container that only exist when the corresponding visibility flag is on. Handle "annotations" (GEditorAnnotation) are a different thing. Name them differently.

## Actions, menus and shortcuts

Source of truth: public/designer.browser.dev.js (app) and public/chunk.vendor.js (engine). Line numbers point at the action id (or the class/function) in those files; module ids follow next/docs/rewrite/old-module-index.tsv.

How to read the shortcut column: "Cmd" means GKey META/COMMAND, which becomes Ctrl on every non-mac platform. "Option" is Alt elsewhere. "Ctrl" written alone is a real Control key on all platforms. When a shortcut is the same everywhere it is written once.

Flags in brackets: **not registered** means the class exists but is never put into gravit.actions (its shortcut is never bound and it never shows); hidden means the menu item exists but isVisible() is false, so it only works through its shortcut; **drop in rewrite** marks cloud, account, license and purchase items.

Counts: 211 entries (185 registered action instances, 5 unregistered non-cloud classes, 21 cloud/account/license items, all marked drop), plus 10 MENU, 13 CTX and 14 KEY system items.

### File

- [ ] ACT-FILE-001 file.new: New Design... — shortcut: Option+N (mac) / Alt+N; also Cmd+N (mac) / Ctrl+N — opens the New Document dialog (start tab); enabled when ApplicationManager.isCreatingNewDocumentEnabled() — old: designer.browser.dev.js:154520 (module 1601)
- [ ] ACT-FILE-002 file.open-from-template: New Design from Template... — shortcut: none — opens the New Document dialog on the templates tab; isEnabled is hard-coded `return false` (156198), so it always shows greyed out — old: designer.browser.dev.js:156184 (module 1623)
- [ ] ACT-FILE-003 file.new.clipboard: New from Clipboard — shortcut: Shift+Ctrl+Option+N (mac) / Shift+Ctrl+Alt+N — new document from the internal clipboard nodes; enabled when copy/paste enabled, a document is open and the clipboard holds Gravit nodes. Uses real Ctrl on mac too — old: designer.browser.dev.js:154566 (module 1602)
- [ ] ACT-FILE-004 file.open: Open Local File... — shortcut: Cmd+O (mac) / Ctrl+O — file picker for all loadable types, multi-select since commit b6f53f7 (line 52374 passes true); enabled when storage canPromptOpen() and isOpenFilesFromLocalEnabled() [available: not Safari] — old: designer.browser.dev.js:52338 (module 813)
- [ ] ACT-FILE-005 file.open.safari: Open Local File... — shortcut: Cmd+Option+O (mac) / Ctrl+Alt+O — same as file.open, Safari-only variant with a different shortcut (Safari owns Cmd+O) [available: Safari only] — old: designer.browser.dev.js:98362 (module 1299)
- [ ] ACT-FILE-006 file.open-recent: No Recent Files — shortcut: none — disabled placeholder item; the submenu is rebuilt by GContainer.updateRecentDocumentsAction (see MENU) — old: designer.browser.dev.js:53544 (module 843)
- [ ] ACT-FILE-007 file.save: Save — shortcut: Cmd+S (mac) / Ctrl+S — saves the active document; global shortcut (works in inputs); enabled when editing enabled, document modified or new, not syncing, and storage can save (else falls back to save-as) [global shortcut] — old: designer.browser.dev.js:19352 (module 447)
- [ ] ACT-FILE-008 file.save-as.gvdesign: Save to Local File as... ("Download File" when storage cannot save) — shortcut: Shift+Cmd+Option+S (mac) / Shift+Ctrl+Alt+S — GSaveAsAction for the native format (FILE_FORMATS default = gvdesign, no secondary formats); enabled when save-as enabled for the format and storage can prompt-save or download — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-009 file.save-all: Save All — shortcut: none — dead: isAvailable() and isEnabled() both return false; would save every modified document [never available] — old: designer.browser.dev.js:155280 (module 1612)
- [ ] ACT-FILE-010 file.place-import: Place Image... — shortcut: Option+P (mac) / Alt+P — file picker for import_image types, places the image into the document; enabled with a document, canPromptOpen() and isImportResourcesEnabled() [visible: not iPad] — old: designer.browser.dev.js:95773 (module 1283)
- [ ] ACT-FILE-011 file.import-image.photos / .files (GImportImageFromIOSAction): From Photos / From Files — shortcut: none — iPad-only image import from Photos or Files. Drop: no iPad runtime in the rewrite [available: iPad runtime only] — old: designer.browser.dev.js:157041 (module 1638)
- [ ] ACT-FILE-012 file.link-import: Link Image... — shortcut: none — places an image as a link to the file on disk; enabled only in Electron with a document [available: not iPad] — old: designer.browser.dev.js:95545 (module 1280)
- [ ] ACT-FILE-013 font.import: Add Fonts... — shortcut: none — imports local font files into IndexedDB; wrapped in GProAction (1626); enabled when import enabled, canPromptOpen() and indexedDB exists [PRO-gated] — old: designer.browser.dev.js:154973 (module 1608)
- [ ] ACT-FILE-014 file.export: Advanced Export... — shortcut: Shift+Cmd+E (mac) / Shift+Ctrl+E — opens the export dialog (slices, formats); isPro() true only adds the PRO badge; alerts on empty infinite canvas; enabled when export enabled and a document is open — old: designer.browser.dev.js:55047 (module 861)
- [ ] ACT-FILE-015 file.save-as.png: PNG Image (.png) — shortcut: none — quick export of the document as png (FileTypes with store:true minus gvdesign/pdf, module 389 line 15968); same enabled rule as save-as — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-016 file.save-as.jpg: JPEG Image (.jpg) — shortcut: none — quick export of the document as jpg (FileTypes with store:true minus gvdesign/pdf, module 389 line 15968); same enabled rule as save-as — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-017 file.save-as.svg: Scalable Vector Graphics (.svg) — shortcut: none — quick export of the document as svg (FileTypes with store:true minus gvdesign/pdf, module 389 line 15968); same enabled rule as save-as — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-018 file.save-as.pdf: 72 dpi — shortcut: none — quick PDF export at 72 dpi — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-019 file.save-as.pdf.96: 96 dpi — shortcut: none — quick PDF export at 96 dpi — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-020 file.save-as.pdf.150: 150 dpi — shortcut: none — quick PDF export at 150 dpi — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-021 file.save-as.pdf.300: 300 dpi — shortcut: none — quick PDF export at 300 dpi; wrapped in GProAction and isPro() (19066) - unlock in the rewrite [PRO-gated] — old: designer.browser.dev.js:19002 (module 445)
- [ ] ACT-FILE-022 file.export.pdf: Advanced Options... — shortcut: none — GExportAction with options {format:"pdf"}: export dialog preset to PDF — old: designer.browser.dev.js:55058 (module 861)
- [ ] ACT-FILE-023 file.print: Print... — shortcut: Cmd+P (mac) / Ctrl+P — renders a PDF (300 dpi if pro, else 150) and prints it; enabled when export enabled and the document is not new-unmodified — old: designer.browser.dev.js:155030 (module 1609)
- [ ] ACT-FILE-024 file.install-to-desktop: Install to Desktop — shortcut: none — triggers the PWA install prompt; enabled when the beforeinstallprompt event was captured [available: PWA install supported and not running standalone] — old: designer.browser.dev.js:75702 (module 1172)
- [ ] ACT-FILE-025 file.quit: Quit — shortcut: Cmd+Q (mac) / Ctrl+Q — gContainer.triggerClose() [available: not Browser/PWA (Electron only)] — old: designer.browser.dev.js:156752 (module 1632)

### Edit

- [ ] ACT-EDIT-001 edit.undo: Undo / "Undo %action" — shortcut: Cmd+Z (mac) / Ctrl+Z — editor undoState(), or document.execCommand("undo") when a text input has focus; disabled when editing is not enabled — old: designer.browser.dev.js:75628 (module 1171)
- [ ] ACT-EDIT-002 edit.redo: Redo / "Redo %action" — shortcut: Shift+Cmd+Z (mac) / Shift+Ctrl+Z — editor redoState(), or execCommand("redo") in inputs — old: designer.browser.dev.js:95852 (module 1284)
- [ ] ACT-EDIT-003 edit.cut: Cut — shortcut: Cmd+X (mac) / Ctrl+X — GCutCopyAction(true): from the shortcut it focuses a hidden textarea so the native cut event fills the clipboard; enabled with a selection — old: designer.browser.dev.js:104239 (module 1331)
- [ ] ACT-EDIT-004 edit.copy: Copy — shortcut: Cmd+C (mac) / Ctrl+C — GCutCopyAction(false), same mechanism as cut — old: designer.browser.dev.js:104238 (module 1331)
- [ ] ACT-EDIT-005 paste.paste: Paste — shortcut: Cmd+V (mac) / Ctrl+V — pastes from the system clipboard, falls back to the internal clipboard; note the id has no "edit." prefix; enabled with a document — old: designer.browser.dev.js:57728 (module 877)
- [ ] ACT-EDIT-006 edit.paste.in-place: Paste In Place — shortcut: Shift+Cmd+V (mac) / Shift+Ctrl+V — pastes at the original coordinates; enabled with a selection and paste support or internal clipboard — old: designer.browser.dev.js:76412 (module 1183)
- [ ] ACT-EDIT-007 edit.paste.replace: Paste and Replace — shortcut: Option+Cmd+V (mac) / Alt+Ctrl+V — replaces each selected element with the clipboard content; enabled with a selection — old: designer.browser.dev.js:57593 (module 876)
- [ ] ACT-EDIT-008 edit.paste.inside: Paste Inside Selection — shortcut: Option+Shift+Cmd+V (mac) / Alt+Shift+Ctrl+V — pastes into the selected container (group/shape); enabled when a selected element is a container — old: designer.browser.dev.js:76511 (module 1184)
- [ ] ACT-EDIT-009 edit.paste.here: Paste Here — shortcut: none — pastes at the right-click position; never in the main menu (isAvailable() without argument is false), only in the canvas context menu [available: only isAvailable("context.menu")] — old: designer.browser.dev.js:76288 (module 1182)
- [ ] ACT-EDIT-010 edit.paste.style: Paste Style — shortcut: F4 — applies the style of the first stylable clipboard node to the selection; enabled when clipboard holds nodes and a stylable element is selected — old: designer.browser.dev.js:57504 (module 875)
- [ ] ACT-EDIT-011 edit.delete: Delete — shortcut: Backspace (mac) / Delete; also Delete (mac) / Backspace — deletes the selection (or the active style/annotation in some contexts); enabled when an item or layer is selected and no confirm window is open — old: designer.browser.dev.js:104546 (module 1332)
- [ ] ACT-EDIT-012 edit.duplicate: Duplicate — shortcut: Cmd+D (mac) / Ctrl+D; also Shift+Cmd+D (mac) / Shift+Ctrl+D — editor.cloneSelection(); enabled with a selection — old: designer.browser.dev.js:102431 (module 1315)
- [ ] ACT-EDIT-013 edit.edit: Edit Selection — shortcut: none — opens the inline text editor on a selected text, otherwise switches to the Subselect tool; first item of the canvas context menu — old: designer.browser.dev.js:101700 (module 1312)
- [ ] ACT-EDIT-014 edit.select-all: Select All — shortcut: Cmd+A (mac) / Ctrl+A — selects all on the active page (or execCommand selectAll in inputs) — old: designer.browser.dev.js:104661 (module 1333)
- [ ] ACT-EDIT-015 edit.deselect-all: Deselect All — shortcut: Shift+Cmd+A (mac) / Shift+Ctrl+A — clears the selection; enabled with a selection or a focused input — old: designer.browser.dev.js:104743 (module 1334)
- [ ] ACT-EDIT-016 edit.invert-selection: Invert Selection — shortcut: Shift+Cmd+I (mac) / Shift+Ctrl+I — inverts the selection within the active page (or all pages in multi-page view) — old: designer.browser.dev.js:154180 (module 1599)
- [ ] ACT-EDIT-017 edit.selectbyfonttype: Font Type — shortcut: none — selects all texts with the same font family as the selection — old: designer.browser.dev.js:76106 (module 1180)
- [ ] ACT-EDIT-018 edit.select-by-paintlayer.fill: Fill — shortcut: none — GSelectByAction (609, line 27327): selects all elements with the same fill paint; enabled when the selection yields a pattern — old: designer.browser.dev.js:101379 (module 1304)
- [ ] ACT-EDIT-019 edit.select-by-paintlayer.border: Border — shortcut: none — GSelectByAction (609, line 27327): selects all elements with the same border paint; enabled when the selection yields a pattern — old: designer.browser.dev.js:101379 (module 1304)
- [ ] ACT-EDIT-020 edit.select-by-paintlayer.fill_border: Fill & Border — shortcut: none — GSelectByAction (609, line 27327): selects all elements with the same fill & border paint; enabled when the selection yields a pattern — old: designer.browser.dev.js:101379 (module 1304)
- [ ] ACT-EDIT-021 edit.select-by-border-width: Border Width — shortcut: none — selects all elements with the same border width — old: designer.browser.dev.js:101446 (module 1305)
- [ ] ACT-EDIT-022 edit.select-by-transparency: Transparency — shortcut: none — selects all elements with the same transparency — old: designer.browser.dev.js:101474 (module 1306)
- [ ] ACT-EDIT-023 edit.select-by-blend-mode: Blend Mode — shortcut: none — selects all elements with the same blend mode — old: designer.browser.dev.js:101499 (module 1307)
- [ ] ACT-EDIT-024 edit.select-by-shape: Shape — shortcut: none — selects all elements with the same shape — old: designer.browser.dev.js:101524 (module 1308)
- [ ] ACT-EDIT-025 edit.select-by-effect: Effect — shortcut: none — selects all elements with the same effect — old: designer.browser.dev.js:101547 (module 1309)
- [ ] ACT-EDIT-026 edit.settings: Settings... — shortcut: none — opens the settings dialog (id constant from module 1277 line 95502) — old: designer.browser.dev.js:155319 (module 1613)

### Modify (structure, compound, symbol)

- [ ] ACT-MODIFY-001 modify.group: Group Selection — shortcut: Cmd+G (mac) / Ctrl+G — wraps the selection in a GGroup; enabled when an element can be inserted into a group — old: designer.browser.dev.js:52163 (module 811)
- [ ] ACT-MODIFY-002 modify.clip: Clip Selection — shortcut: Option+Cmd+M (mac) / Alt+Ctrl+M — clips the lower elements with the top one; enabled with 2+ elements. Same keys as modify.createnestedcompound (conflict) — old: designer.browser.dev.js:51989 (module 809)
- [ ] ACT-MODIFY-003 modify.split: Ungroup Selection — shortcut: Shift+Cmd+G (mac) / Shift+Ctrl+G — ungroups groups, compound shapes, unlinked symbols and shapes with children — old: designer.browser.dev.js:56845 (module 870)
- [ ] ACT-MODIFY-004 modify.mask-with-shape: Mask with Shape — shortcut: Cmd+Shift+M (mac) / Ctrl+Shift+M — GClipAction variant that names the result "Mask"; same enabled rule as clip — old: designer.browser.dev.js:76181 (module 1181)
- [ ] ACT-MODIFY-005 modify.crop: Confirm Cropping — shortcut: none — leaves image crop mode keeping the crop; enabled when a ready image is in crop (selection detail) mode — old: designer.browser.dev.js:101571 (module 1310)
- [ ] ACT-MODIFY-006 modify.cancel-crop: Cancel Cropping — shortcut: none — leaves crop mode restoring the previous crop — old: designer.browser.dev.js:101626 (module 1311)
- [ ] ACT-MODIFY-007 modify.merge: Create Compound — shortcut: Shift+Cmd+Y (mac) / Shift+Ctrl+Y, then U/S/I/X within 500 ms — GMainAction: after the shortcut waits 500 ms for a sub-key (U union, S subtract, I intersect, X difference), otherwise runs union; enabled when 2+ valid vertex items or one compound [hidden menu item, shortcut only] — old: designer.browser.dev.js:52323 (module 812)
- [ ] ACT-MODIFY-008 modify.merge.intersect: Intersect — shortcut: Shift+Cmd+Y then I (mac) / Shift+Ctrl+Y then I — boolean intersect: creates a compound shape, or changes the operation of a selected compound; enabled like modify.merge — old: designer.browser.dev.js:154445 (module 1600)
- [ ] ACT-MODIFY-009 modify.merge.difference: Difference — shortcut: Shift+Cmd+Y then X (mac) / Shift+Ctrl+Y then X — boolean difference: creates a compound shape, or changes the operation of a selected compound; enabled like modify.merge — old: designer.browser.dev.js:154445 (module 1600)
- [ ] ACT-MODIFY-010 modify.merge.subtract: Subtract — shortcut: Shift+Cmd+Y then S (mac) / Shift+Ctrl+Y then S — boolean subtract: creates a compound shape, or changes the operation of a selected compound; enabled like modify.merge — old: designer.browser.dev.js:154445 (module 1600)
- [ ] ACT-MODIFY-011 modify.merge.union: Union — shortcut: Shift+Cmd+Y then U (mac) / Shift+Ctrl+Y then U — boolean union: creates a compound shape, or changes the operation of a selected compound; enabled like modify.merge — old: designer.browser.dev.js:154445 (module 1600)
- [ ] ACT-MODIFY-012 modify.createnestedcompound: Create Nested Compound — shortcut: Cmd+Option+M (mac) / Ctrl+Alt+M — nests 2+ selected compound shapes into one; registered after modify.clip with the same key combo, so it most likely shadows Clip's shortcut — old: designer.browser.dev.js:102483 (module 1316)
- [ ] ACT-MODIFY-013 modify.createsymbol: Create Symbol — shortcut: F8 — turns the selection into a symbol master + instance (prompts for a name); isPro() when 2+ symbols are selected without pro - unlock — old: designer.browser.dev.js:27190 (module 608)
- [ ] ACT-MODIFY-014 modify.detachsymbol: Detach Symbol Instance — shortcut: Shift+Cmd+F8 (mac) / Shift+Ctrl+F8 — detaches selected instances from their master — old: designer.browser.dev.js:57429 (module 874)
- [ ] ACT-MODIFY-015 modify.resetinstance: Reset Instance — shortcut: none — resets overridden instances to the master; enabled when an instance is out of sync — old: designer.browser.dev.js:75894 (module 1177)
- [ ] ACT-MODIFY-016 modify.path2bmp: Flatten — shortcut: F7 — rasterizes the selection into an image — old: designer.browser.dev.js:102287 (module 1314)

### Arrange and transform

- [ ] ACT-ARRANGE-001 arrange.order.send-front: Bring to Front — shortcut: Shift+Cmd+Up (mac) / Shift+Ctrl+Up — editor.arrangeOrder(); enabled with a selection (shortcuts table at 56753) — old: designer.browser.dev.js:56774 (module 869)
- [ ] ACT-ARRANGE-002 arrange.order.bring-forward: Bring Forward — shortcut: Cmd+Up (mac) / Ctrl+Up — editor.arrangeOrder(); enabled with a selection (shortcuts table at 56753) — old: designer.browser.dev.js:56774 (module 869)
- [ ] ACT-ARRANGE-003 arrange.order.send-backward: Send Backward — shortcut: Cmd+Down (mac) / Ctrl+Down — editor.arrangeOrder(); enabled with a selection (shortcuts table at 56753) — old: designer.browser.dev.js:56774 (module 869)
- [ ] ACT-ARRANGE-004 arrange.order.send-back: Send to Back — shortcut: Shift+Cmd+Down (mac) / Shift+Ctrl+Down — editor.arrangeOrder(); enabled with a selection (shortcuts table at 56753) — old: designer.browser.dev.js:56774 (module 869)
- [ ] ACT-ARRANGE-005 arrange.transform.rotate-45-left: Rotate 45° Left — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-006 arrange.transform.rotate-90-left: Rotate 90° Left — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-007 arrange.transform.rotate-180-left: Rotate 180° Left — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-008 arrange.transform.rotate-45-right: Rotate 45° Right — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-009 arrange.transform.rotate-90-right: Rotate 90° Right — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-010 arrange.transform.rotate-180-right: Rotate 180° Right — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-011 arrange.transform.flip-vertical: Flip Vertical — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)
- [ ] ACT-ARRANGE-012 arrange.transform.flip-horizontal: Flip Horizontal — shortcut: none — rotates/flips each selected element around its center; enabled when a selected element's editor allows rotation — old: designer.browser.dev.js:57048 (module 871)

### Align, distribute, snap to units

- [ ] ACT-ALIGN-001 arrange.align.align-left: Align Left — shortcut: Option+A (mac) / Alt+A — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-002 arrange.align.align-center: Align Center — shortcut: Option+H (mac) / Alt+H — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-003 arrange.align.align-right: Align Right — shortcut: Option+D (mac) / Alt+D — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-004 arrange.align.align-top: Align Top — shortcut: Option+W (mac) / Alt+W — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-005 arrange.align.align-middle: Align Middle — shortcut: Option+V (mac) / Alt+V — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-006 arrange.align.align-bottom: Align Bottom — shortcut: Option+S (mac) / Alt+S — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-007 arrange.align.align-justify-horizontal: Same Width — shortcut: none — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-008 arrange.align.align-justify-vertical: Same Height — shortcut: none — aligns the selection (to selection bounds, page or a key object depending on the align-to setting; a single element aligns its parts/page); enabled with a selection — old: designer.browser.dev.js:56367 (module 866)
- [ ] ACT-ALIGN-009 arrange.distribute.horizontal: Distribute Horizontally — shortcut: none — distributes the selection; enabled with more than 2 elements (2 when a spacing value is given) — old: designer.browser.dev.js:56519 (module 867)
- [ ] ACT-ALIGN-010 arrange.distribute.vertical: Distribute Vertically — shortcut: none — distributes the selection; enabled with more than 2 elements (2 when a spacing value is given) — old: designer.browser.dev.js:56519 (module 867)
- [ ] ACT-ALIGN-011 arrange.snap-unit.full: Snap to Full Units — shortcut: Shift+Cmd+U (mac) / Shift+Ctrl+U — rounds position and size of the selection to whole units; enabled with a selection — old: designer.browser.dev.js:98111 (module 1295)
- [ ] ACT-ALIGN-012 arrange.snap-unit.half: Snap to Half Units — shortcut: none — rounds to half units — old: designer.browser.dev.js:98111 (module 1295)

### Path

- [ ] ACT-PATH-001 modify.join-paths: Join Paths — shortcut: Cmd+J (mac) / Ctrl+J — converts selection to paths and joins them; enabled with 2+ path-like elements — old: designer.browser.dev.js:76036 (module 1179)
- [ ] ACT-PATH-002 modify.split-path: Split Path — shortcut: Shift+Cmd+J (mac) / Shift+Ctrl+J — splits compound paths into separate paths; enabled when a GCompoundPath is selected — old: designer.browser.dev.js:57359 (module 873)
- [ ] ACT-PATH-003 modify.converttopath: Convert to Path — shortcut: Cmd+Shift+P (mac) / Ctrl+Shift+P — editor.convertSelectionToPaths(); enabled for shapes/vertex sources that are not already paths — old: designer.browser.dev.js:52086 (module 810)
- [ ] ACT-PATH-004 modify.converttorawpath: Convert to Raw Path — shortcut: Cmd+Shift+R (mac) / Ctrl+Shift+R — flattens shapes, texts and compounds into plain paths (style kept) — old: designer.browser.dev.js:102934 (module 1320)
- [ ] ACT-PATH-005 modify.ouline: Convert to Outline — shortcut: F5 — prompts for a width and outlines the selected vertex sources (id typo "ouline" is in the original) — old: designer.browser.dev.js:76635 (module 1185)
- [ ] ACT-PATH-006 modify.offset: Expand/Shrink — shortcut: none — subclass of GOutlineAction: prompts for an offset and grows/shrinks the path (GVertexOffsetter); no shortcut — old: designer.browser.dev.js:102553 (module 1317)
- [ ] ACT-PATH-007 modify.vectorize: Vectorize Border — shortcut: none — turns borders into filled paths; enabled when a selected vertex source has a border layer — old: designer.browser.dev.js:57208 (module 872)
- [ ] ACT-PATH-008 modify.bmp2path: Vectorize Image — shortcut: none — traces a selected loaded image into paths — old: designer.browser.dev.js:155458 (module 1616)
- [ ] ACT-PATH-009 modify.simplify: Simplify Path — shortcut: Cmd+Option+S (mac) / Ctrl+Alt+S — reduces anchor points of selected vertex sources — old: designer.browser.dev.js:102612 (module 1318)
- [ ] ACT-PATH-010 modify.connect-lines: Connect Paths Lines — shortcut: none — connects open path ends; enabled when a GPath is selected — old: designer.browser.dev.js:154052 (module 1597)
- [ ] ACT-PATH-011 modify.split-line: Break Curve — shortcut: none — breaks a path at the selected anchor points; enabled when a selected path is splittable — old: designer.browser.dev.js:102766 (module 1319)
- [ ] ACT-PATH-012 modify.reverse-order: Reverse Order — shortcut: none — reverses the direction of selected paths — old: designer.browser.dev.js:155223 (module 1611)

### Text on path

- [ ] ACT-TEXT-001 modify.attachToPath: Attach Text to Path — shortcut: none — attaches a selected text (not inline-editing) to a selected path — old: designer.browser.dev.js:75808 (module 1176)
- [ ] ACT-TEXT-002 modify.detachFromPath: Detach Text from Path — shortcut: none — detaches texts that have a path attached — old: designer.browser.dev.js:75973 (module 1178)

### View

- [ ] ACT-VIEW-001 view.zoom.original: Original-View — shortcut: Cmd+0 (mac) / Ctrl+0 — zoom 100% centred on the page (fixed size) or content — old: designer.browser.dev.js:95695 (module 1282)
- [ ] ACT-VIEW-002 view.zoom.fit-selection: Fit Selection — shortcut: none — zooms to the selection bbox; enabled with a selection — old: designer.browser.dev.js:24849 (module 566)
- [ ] ACT-VIEW-003 view.zoom.fit-current-layer: Fit Layer — shortcut: none — zooms to the active layer bbox — old: designer.browser.dev.js:154142 (module 1598)
- [ ] ACT-VIEW-004 view.zoom.fit.all: Fit All — shortcut: Option+Cmd+0 (mac) / Alt+Ctrl+0 — zooms to the page (fixed size) or all content; enabled when the scene has a paint bbox — old: designer.browser.dev.js:19712 (module 449)
- [ ] ACT-VIEW-005 view.magnification.6: 6% — shortcut: none — sets zoom to 6% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-006 view.magnification.12: 12% — shortcut: none — sets zoom to 12% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-007 view.magnification.25: 25% — shortcut: none — sets zoom to 25% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-008 view.magnification.50: 50% — shortcut: Cmd+5 (mac) / Ctrl+5 — sets zoom to 50% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-009 view.magnification.66: 66% — shortcut: none — sets zoom to 66% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-010 view.magnification.100: 100% — shortcut: Cmd+1 (mac) / Ctrl+1 — sets zoom to 100% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-011 view.magnification.150: 150% — shortcut: none — sets zoom to 150% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-012 view.magnification.200: 200% — shortcut: none — sets zoom to 200% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-013 view.magnification.300: 300% — shortcut: none — sets zoom to 300% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-014 view.magnification.400: 400% — shortcut: Cmd+4 (mac) / Ctrl+4 — sets zoom to 400% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-015 view.magnification.800: 800% — shortcut: Cmd+8 (mac) / Ctrl+8 — sets zoom to 800% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-016 view.magnification.1600: 1600% — shortcut: none — sets zoom to 1600% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-017 view.magnification.3200: 3200% — shortcut: none — sets zoom to 3200% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-018 view.magnification.6400: 6400% — shortcut: none — sets zoom to 6400% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-019 view.magnification.12800: 12800% — shortcut: none — sets zoom to 12800% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-020 view.magnification.25600: 25600% — shortcut: none — sets zoom to 25600% around the content centre (ZOOM_LEVELS at 75355); enabled with an active window — old: designer.browser.dev.js:75354 (module 1167)
- [ ] ACT-VIEW-021 view.zoom.in: Zoom in — shortcut: Cmd++ (mac) / Ctrl++; also Cmd+= (mac) / Ctrl+= — next GZoomTool zoom level; global shortcut; mod+= alias added in registerShortcut (123233); enabled below max zoom [global shortcut] — old: designer.browser.dev.js:96215 (module 1290)
- [ ] ACT-VIEW-022 zoom.out: Zoom out — shortcut: Cmd+- (mac) / Ctrl+- — previous zoom level; global shortcut; note id is "zoom.out", not "view.zoom.out" [global shortcut] — old: designer.browser.dev.js:96296 (module 1291)
- [ ] ACT-VIEW-023 view.outline-view: Outline View — shortcut: Option+Y (mac) / Alt+Y — checkable: toggles paintMode Outline on the active view [checkable] — old: designer.browser.dev.js:98232 (module 1297)
- [ ] ACT-VIEW-024 view.fast-view: Fast View — shortcut: none — checkable: toggles paintMode Fast (no effects/AA) [checkable] — old: designer.browser.dev.js:154650 (module 1603)
- [ ] ACT-VIEW-025 view.canvas.show-rulers: Show Rulers — shortcut: Cmd+Option+R (mac) / Ctrl+Alt+R — toggles rulers; turning rulers on also turns guide lines on [checkable] — old: designer.browser.dev.js:155354 (module 1614)
- [ ] ACT-VIEW-026 view.canvas.show-guide-lines: Show Guide Lines — shortcut: Cmd+, (mac) / Ctrl+, — toggles guide lines, saved to setting guide_lines_visible [checkable] — old: designer.browser.dev.js:75480 (module 1169)
- [ ] ACT-VIEW-027 view.canvas.show-symbol-labels: Show Symbol Labels — shortcut: none — toggles symbol labels, saved to setting symbol_labels_visible [checkable] — old: designer.browser.dev.js:95973 (module 1286)
- [ ] ACT-VIEW-028 view.canvas.show-grid: Show Grid — shortcut: Cmd+Option+G (mac) / Ctrl+Alt+G — toggles scene property gm (grid mode), restores lgm or Boxed [checkable] — old: designer.browser.dev.js:95924 (module 1285)
- [ ] ACT-VIEW-029 view.canvas.show-slices: Show Slices — shortcut: none — toggles slice display on the view [checkable] — old: designer.browser.dev.js:155411 (module 1615)
- [ ] ACT-VIEW-030 view.canvas.show-effects: Show Effects — shortcut: Cmd+E (mac) / Ctrl+E — toggles viewConfiguration.ignoreEffects [checkable] — old: designer.browser.dev.js:155963 (module 1619)
- [ ] ACT-VIEW-031 view.canvas.show-selection-handles: Show Selection Handles — shortcut: Shift+Cmd+X (mac) / Shift+Ctrl+X — hides/shows the selection editor handles; enabled with a selection; no group, so it sits after a divider [checkable] — old: designer.browser.dev.js:158043 (module 1646)
- [ ] ACT-VIEW-032 view.toggle-snap: Use Snapping — shortcut: Shift+F10 — toggles setting snap_disabled [checkable] — old: designer.browser.dev.js:96089 (module 1288)
- [ ] ACT-VIEW-033 view.toggle-snapzones: Use Snap Zones — shortcut: none — toggles setting snap_zones (registered because HAS_SNAPZONES is true) [checkable] — old: designer.browser.dev.js:96160 (module 1289)
- [ ] ACT-VIEW-034 view.toggle-guide.guide.grid: Snap to Grid — shortcut: none — toggles this guide in setting snap_guides; disabled while snapping is off [checkable] — old: designer.browser.dev.js:96027 (module 1287)
- [ ] ACT-VIEW-035 view.toggle-guide.guide.guide-lines: Snap to Guide Lines — shortcut: none — toggles this guide in setting snap_guides; disabled while snapping is off [checkable] — old: designer.browser.dev.js:96027 (module 1287)
- [ ] ACT-VIEW-036 view.toggle-guide.guide.full-pixels: Snap to Full Pixels — shortcut: none — toggles this guide in setting snap_guides; disabled while snapping is off [checkable] — old: designer.browser.dev.js:96027 (module 1287)
- [ ] ACT-VIEW-037 view.toggle-guide.guide.points: Snap to Anchor Points — shortcut: none — toggles this guide in setting snap_guides; disabled while snapping is off [checkable] — old: designer.browser.dev.js:96027 (module 1287)
- [ ] ACT-VIEW-038 view.toggle-guide.guide.bbox: Snap to Shapes — shortcut: none — toggles this guide in setting snap_guides; disabled while snapping is off [checkable] — old: designer.browser.dev.js:96027 (module 1287)
- [ ] ACT-VIEW-039 view.toggle-guide.guide.scene: Snap to Pages — shortcut: none — toggles this guide in setting snap_guides; disabled while snapping is off [checkable] — old: designer.browser.dev.js:96027 (module 1287)
- [ ] ACT-VIEW-040 view.toggle-sidebar.inspector: Show Inspector Panel — shortcut: Option+2 (mac) / Alt+2 — checkable: shows/hides the Inspector sidebar and its column; created from gravit.sidebars (119659) and spliced before view.clone (122780) [checkable] — old: designer.browser.dev.js:75540 (module 1170)
- [ ] ACT-VIEW-041 view.toggle-sidebar.annotations: Show Comments Panel — shortcut: none — checkable: shows/hides the Comments sidebar and its column; created from gravit.sidebars (119659) and spliced before view.clone (122780); comments are collaboration, drop [visible: commenting enabled; checkable] — old: designer.browser.dev.js:75540 (module 1170)
- [ ] ACT-VIEW-042 view.toggle-sidebar.outline: Show Layers Panel — shortcut: Option+1 (mac) / Alt+1 — checkable: shows/hides the Layers sidebar and its column; created from gravit.sidebars (119659) and spliced before view.clone (122780) [checkable] — old: designer.browser.dev.js:75540 (module 1170)
- [ ] ACT-VIEW-043 view.toggle-sidebar.library: Show Libraries Panel — shortcut: none — checkable: shows/hides the Libraries sidebar and its column; created from gravit.sidebars (119659) and spliced before view.clone (122780) [visible: editing enabled; checkable] — old: designer.browser.dev.js:75540 (module 1170)
- [ ] ACT-VIEW-044 view.toggle-sidebar.symbols: Show Symbols Panel — shortcut: none — checkable: shows/hides the Symbols sidebar and its column; created from gravit.sidebars (119659) and spliced before view.clone (122780) [visible: editing enabled; checkable] — old: designer.browser.dev.js:75540 (module 1170)
- [ ] ACT-VIEW-045 view.play: Play/Present... — shortcut: Cmd+Option+Enter (mac) / Ctrl+Alt+Enter — fullscreen presentation of the pages; arrows/PageUp/PageDown/Space change page, Esc exits (155716); enabled with a document and Fullscreen API support [visible: not inside MS Teams] — old: designer.browser.dev.js:155827 (module 1617)
- [ ] ACT-VIEW-046 view.fullscreen: Toggle Fullscreen... — shortcut: Option+Enter (mac) / Alt+Enter — hides header/toolbar/sidebars and requests browser fullscreen, shows an exit banner [visible: fullscreen supported] — old: designer.browser.dev.js:104804 (module 1335)
- [ ] ACT-VIEW-047 view.toggle-touch: Touch interface / Disable Touch Interface — shortcut: none — switches the whole UI to the touch layout; wrapped in GProAction. Probably drop with the touch UI [available: TOUCH_LAYOUT, not guest, not iPad; checkable; PRO-gated] — old: designer.browser.dev.js:156861 (module 1634)

### Windows and tabs

- [ ] ACT-WINDOW-001 file.close-active-window: Close window — shortcut: Option+Q (mac) / Alt+Q — closes the active view/tab of the active document; hidden menu item, shortcut only [hidden menu item, shortcut only] — old: designer.browser.dev.js:158278 (module 1649)
- [ ] ACT-WINDOW-002 view.change-active-window.next: Select next tab — shortcut: Option+. (mac) / Alt+. — activates the next window tab (wraps); enabled with 2+ windows [hidden menu item, shortcut only] — old: designer.browser.dev.js:158387 (module 1651)
- [ ] ACT-WINDOW-003 view.change-active-window.previous: Select previous tab — shortcut: Option+, (mac) / Alt+, — activates the previous window tab [hidden menu item, shortcut only] — old: designer.browser.dev.js:158387 (module 1651)
- [ ] ACT-WINDOW-004 view.clone: New View — shortcut: Cmd+Option+N (mac) / Ctrl+Alt+N — opens a second window (tab) on the active document — old: designer.browser.dev.js:98191 (module 1296)

### Help

- [ ] ACT-HELP-001 open-link.contact-us: Contact Us — shortcut: none — GOpenLinkAction (1621, line 156108): gContainer.openExternalLink(https://github.com/rathlinus/gravit-designer) — old: designer.browser.dev.js:156150 (module 1622)
- [ ] ACT-HELP-002 open-link.user-guide: User Guide — shortcut: none — GOpenLinkAction (1621, line 156108): gContainer.openExternalLink(/docs/index.html) — old: designer.browser.dev.js:156156 (module 1622)
- [ ] ACT-HELP-003 open-link.tutorials: Tutorials — shortcut: none — GOpenLinkAction (1621, line 156108): gContainer.openExternalLink(YouTube playlist (module 1302 line 100524)) — old: designer.browser.dev.js:156162 (module 1622)
- [ ] ACT-HELP-004 open-link.request-new-feature: Request New Feature — shortcut: none — GOpenLinkAction (1621, line 156108): gContainer.openExternalLink(https://github.com/rathlinus/gravit-designer/issues) — old: designer.browser.dev.js:156168 (module 1622)
- [ ] ACT-HELP-005 help.tooltip-visibility: Display Enhanced Tooltips — shortcut: none — checkable: toggles rich tooltips, stored in container property designer.settings.enhanced-tooltips.enabled [checkable] — old: designer.browser.dev.js:106566 (module 1342)
- [ ] ACT-HELP-006 help.open-quick-help: Show Quick Help — shortcut: none — opens the quick help overlay [visible: touch mode only] — old: designer.browser.dev.js:104896 (module 1336)
- [ ] ACT-HELP-007 open-welcome-screen: Show Welcome Screen — shortcut: none — opens the New Document / welcome dialog; enabled when it is not open, creating is enabled and license.canAccessFreemium() (drop the license part) — old: designer.browser.dev.js:156223 (module 1624)
- [ ] ACT-HELP-008 help.shortcuts: Show Keyboard Shortcuts — shortcut: none — opens GShortcutsDialog (1644), a table built from every available action with a shortcut hint plus tool keys — old: designer.browser.dev.js:157802 (module 1643)
- [ ] ACT-HELP-009 check-for-updates: Check for Updates — shortcut: none — UNREGISTERED (imported as Ct at 119115, never used): getSoftwareUpdateManager().checkForUpdates(). Could come back for Electron auto-update [**not registered**] — old: designer.browser.dev.js:156261 (module 1625)
- [ ] ACT-HELP-010 language.<locale>: English / Deutsch / 中文 / Português / Español / Français — shortcut: none — UNREGISTERED: switches UI language, updates the cloud user locale and reloads. Only the English locale is bundled [**not registered**; checkable] — old: designer.browser.dev.js:156029 (module 1620)
- [ ] ACT-HELP-011 help.translationtool: Translation Tool [DEVELOPMENT] — shortcut: none — UNREGISTERED dev tool for editing translations. Drop [**not registered**] — old: designer.browser.dev.js:157103 (module 1639)

### Shortcut-only actions and the keyboard system

- [ ] ACT-KEY-001 edit.eyedropper.fill: Choose a fill color — shortcut: Cmd+Option+C (mac) / Ctrl+Alt+C; also I — opens the inspector eyedropper for fill (or text color / border depending on the selection) at the last cursor point [hidden menu item, shortcut only] — old: designer.browser.dev.js:157978 (module 1645)
- [ ] ACT-KEY-002 edit.eyedropper.border: Choose a border color — shortcut: Shift+Cmd+Option+C (mac) / Shift+Ctrl+Alt+C — opens the border eyedropper [hidden menu item, shortcut only] — old: designer.browser.dev.js:157978 (module 1645)
- [ ] ACT-KEY-003 edit.rename-layer: Rename a layer — shortcut: Option+R (mac) / Alt+R — starts inline rename of the focused row in the Layers panel (only when the outline sidebar is active) [hidden menu item, shortcut only] — old: designer.browser.dev.js:106459 (module 1340)
- [ ] ACT-KEY-004 edit.change-opacity: Change opacity ("Set opacity to %value") — shortcut: Shift+0..9 — Shift+digit sets opacity of the selection; a second digit within 500 ms gives two-digit values (Shift+2, Shift+5 = 25%); Shift+0 = 100% [hidden menu item, shortcut only] — old: designer.browser.dev.js:158161 (module 1647)
- [ ] ACT-KEY-005 modify.lock-layer: Lock a layer — shortcut: Cmd+2 (mac) / Ctrl+2 — toggles lock of the focused Layers-panel row (outline sidebar active only) [hidden menu item, shortcut only] — old: designer.browser.dev.js:154892 (module 1606)
- [ ] ACT-KEY-006 modify.change-anchor-points-joint-type: Change anchor point joint type — shortcut: Cmd+Option+A (mac) / Ctrl+Alt+A, then S/M/D/C/A within 500 ms — GMainAction, enabled only while the Inspector is the active right sidebar; without a sub-key nothing happens (execute is empty) [hidden menu item, shortcut only] — old: designer.browser.dev.js:107008 (module 1345)
- [ ] ACT-KEY-007 modify.change-anchor-points-joint-type.straight: Change anchor point joint type to Straight — shortcut: Cmd+Option+A then S (mac) / Ctrl+Alt+A then S — sets the joint type of selected anchor points via the inspector (asymmetric maps to Symmetric, disconnected to Asymmetric in the engine enum) [hidden menu item, shortcut only] — old: designer.browser.dev.js:158231 (module 1648)
- [ ] ACT-KEY-008 modify.change-anchor-points-joint-type.mirrored: Change anchor point joint type to Mirrored — shortcut: Cmd+Option+A then M (mac) / Ctrl+Alt+A then M — sets the joint type of selected anchor points via the inspector (asymmetric maps to Symmetric, disconnected to Asymmetric in the engine enum) [hidden menu item, shortcut only] — old: designer.browser.dev.js:158231 (module 1648)
- [ ] ACT-KEY-009 modify.change-anchor-points-joint-type.disconnected: Change anchor point joint type to Disconnected — shortcut: Cmd+Option+A then D (mac) / Ctrl+Alt+A then D — sets the joint type of selected anchor points via the inspector (asymmetric maps to Symmetric, disconnected to Asymmetric in the engine enum) [hidden menu item, shortcut only] — old: designer.browser.dev.js:158231 (module 1648)
- [ ] ACT-KEY-010 modify.change-anchor-points-joint-type.asymmetric: Change anchor point joint type to Asymmetric — shortcut: Cmd+Option+A then A (mac) / Ctrl+Alt+A then A — sets the joint type of selected anchor points via the inspector (asymmetric maps to Symmetric, disconnected to Asymmetric in the engine enum) [hidden menu item, shortcut only] — old: designer.browser.dev.js:158231 (module 1648)
- [ ] ACT-KEY-011 modify.change-anchor-points-joint-type.connector: Change anchor point joint type to Connector — shortcut: Cmd+Option+A then C (mac) / Ctrl+Alt+A then C — sets the joint type of selected anchor points via the inspector (asymmetric maps to Symmetric, disconnected to Asymmetric in the engine enum) [hidden menu item, shortcut only] — old: designer.browser.dev.js:158231 (module 1648)
- [ ] ACT-KEY-012 modify.swap-paint-layers: Swap fill and border — shortcut: X — turns fills into borders and borders into fills on stylable selected elements [hidden menu item, shortcut only] — old: designer.browser.dev.js:158481 (module 1652)
- [ ] ACT-KEY-013 modify.create-new-layer: Create new layer — shortcut: Cmd+M (mac) / Ctrl+M — shows the Layers sidebar and inserts a layer; enabled when editing enabled [hidden menu item, shortcut only] — old: designer.browser.dev.js:158529 (module 1653)
- [ ] ACT-KEY-014 view.enter-layer-group: Enter layer group — shortcut: Enter — Layers panel: moves focus/selection to the first child of the focused row [hidden menu item, shortcut only] — old: designer.browser.dev.js:154847 (module 1605)
- [ ] ACT-KEY-015 view.enter-layer-group.reverse: Leave layer group — shortcut: Shift+Enter — Layers panel: moves focus/selection to the parent row [hidden menu item, shortcut only] — old: designer.browser.dev.js:154848 (module 1605)
- [ ] ACT-KEY-016 view.toggle-layer-visibility: Hide a layer — shortcut: Cmd+3 (mac) / Ctrl+3 — toggles visibility of the focused Layers-panel row [hidden menu item, shortcut only] — old: designer.browser.dev.js:154937 (module 1607)
- [ ] ACT-KEY-017 view.cycle-through-layers.next: Select next layer — shortcut: Tab — Layers panel: selects the next sibling (wraps), only when the outline sidebar is active [hidden menu item, shortcut only] — old: designer.browser.dev.js:106965 (module 1344)
- [ ] ACT-KEY-018 view.cycle-through-layers.previous: Select previous layer — shortcut: Shift+Tab — Layers panel: selects the previous sibling [hidden menu item, shortcut only] — old: designer.browser.dev.js:106965 (module 1344)
- [ ] ACT-KEY-019 view.toggle-multi-page-mode: Toggle multipage mode — shortcut: F6 — outline sidebar toggleMultiPageMode() (single page vs all pages on the canvas) [hidden menu item, shortcut only] — old: designer.browser.dev.js:158315 (module 1650)
- [ ] ACT-KEY-020 view.change-active-page.next: Select next page — shortcut: Cmd+Option+Down (mac) / Ctrl+Alt+Down; also PageDown — activates the next page. getAdditionalShortcuts returns [PAGE_DOWN] instead of [[PAGE_DOWN]] (106504), so the PageDown binding is malformed and probably never fires [hidden menu item, shortcut only] — old: designer.browser.dev.js:106547 (module 1341)
- [ ] ACT-KEY-021 view.change-active-page.previous: Select previous page — shortcut: Cmd+Option+Up (mac) / Ctrl+Alt+Up; also PageUp — activates the previous page; same PageUp bug [hidden menu item, shortcut only] — old: designer.browser.dev.js:106547 (module 1341)
- [ ] ACT-KEY-022 view.toggle-paint-layers-visibility.fill: Toggle fills — shortcut: F — UNREGISTERED (module is required at 119132 but never instantiated): would toggle visibility of fill layers of the selection; disabled while an input has focus [**not registered**; hidden menu item, shortcut only] — old: designer.browser.dev.js:157789 (module 1642)
- [ ] ACT-KEY-023 view.toggle-paint-layers-visibility.border: Toggle borders — shortcut: Shift+B — UNREGISTERED: same for border layers [**not registered**; hidden menu item, shortcut only] — old: designer.browser.dev.js:157789 (module 1642)

Keyboard system:

- [ ] ACT-KEY-024 GAction base API — getId, getTitle, getFullTitle, getInfo, getIcon (icon map module 844), getCategory, getGroup, getGroupIcon, getShortcut, getShortcutHint, isShortcutGlobal, isRegisterShortcut (unused), getAdditionalShortcuts, isEnabled, isKeyBoardEventRequiredToExecute, isCheckable, isChecked, isAvailable(context), execute, executeFromShortcut, isPro, tooltip config, isVisible, noHover, getStyleClass, statsValue; SHORTCUT_DELAY = 500 — old: designer.browser.dev.js:672 (module 31)
- [ ] ACT-KEY-025 shortcut registration — shortcuts are bound when the main menu item is created (addMenuItem 122129), so only actions that pass isAvailable() get a key; additional shortcuts via registerAdditionalShortcuts (125004). registerShortcut binds Mousetrap (module 1595) on keydown, bindGlobal when isShortcutGlobal; Mod++ also binds mod+=; optional keyup handler for tool keys; while inline text editing the text editor gets the key first — old: designer.browser.dev.js:123216 (module 1491)
- [ ] ACT-KEY-026 key array to Mousetrap string — numbers go through GKey.transformKey, then map to ctrl/shift/alt/meta/space/enter/tab/backspace/arrows/pageup/pagedown/F-keys; strings pass through — old: designer.browser.dev.js:123857 (module 1491)
- [ ] ACT-KEY-027 platform modifier mapping — GKey.transformKey: META and COMMAND become Command on macOS desktop and Control everywhere else (including iPad); OPTION becomes Alt; REMOVE becomes Backspace on macOS and Delete elsewhere. shortcutToString renders ⌘⌥⇧⌃ glyphs on mac, "Ctrl+Shift+X" elsewhere — old: chunk.vendor.js:37258 (module 164)
- [ ] ACT-KEY-028 shortcut execution — executeAction(id, args, "shortcut") checks isAvailable() && isEnabled(), blocks in preview windows, calls executeFromShortcut, logs stats; isKeyBoardEventRequiredToExecute passes the KeyboardEvent (used by change-opacity) — old: designer.browser.dev.js:125016 (module 1491)
- [ ] ACT-KEY-029 two-stroke shortcuts — GMainAction / GSubAction: the main shortcut installs a capturing keydown listener for 500 ms; a matching sub-key runs that sub action, timeout runs the main execute(). Used by modify.merge (U/S/I/X) and anchor joint type (S/M/D/C/A). Hint template "%main then %sub" — old: designer.browser.dev.js:95608 (module 1281)
- [ ] ACT-KEY-030 tool keys — gravit.tools key/shortcuts are registered with temp activation on keydown and release on keyup (held key = temporary tool, quick tap = switch). Keys: V D O S P B K L R (+M) E T H Z. Covered in the tools inventory — old: designer.browser.dev.js:122816 (module 1491)
- [ ] ACT-KEY-031 Q shortcut — registerShortcut(["Q"]): activates the pointer tool in Transform edit mode (unless the comments sidebar is active) — old: designer.browser.dev.js:122840 (module 1491)
- [ ] ACT-KEY-032 space / middle mouse pan — GPlatform tracks spaceKey, middleButton, zKey, plus/minus, tab, escape as modifiers (vendor 14482). GToolManager._updateTemporaryTool: Space or middle button switches to the hand tool temporarily; holding Cmd/Ctrl while panning switches to the zoom tool; release restores the previous tool. Not available during inline text editing — old: chunk.vendor.js:81257 (module 553)
- [ ] ACT-KEY-033 space while drawing — shape tools: holding Space during a drag moves the shape being drawn instead of resizing — old: chunk.vendor.js:46103 (module 236)
- [ ] ACT-KEY-034 arrow nudge — GSelectTool keydown: arrows move the selection by cursorDistanceSmall, Shift = cursorDistanceBig. Covered with tools — old: chunk.vendor.js:59611 (module 334)
- [ ] ACT-KEY-035 document keydown housekeeping — Enter/Space on a focused button blurs it; any keydown outside editable fields refocuses the canvas view — old: designer.browser.dev.js:121776 (module 1491)
- [ ] ACT-KEY-036 play mode keys — inside view.play: Down/PageDown/Right/Space next page, Up/PageUp/Left previous, Esc exits — old: designer.browser.dev.js:155716 (module 1617)
- [ ] ACT-KEY-037 shortcuts dialog — lists getFullTitle() + getShortcutHint({isWordMode:true}) for every available action, then tool keys — old: designer.browser.dev.js:157852 (module 1644)

### Cloud, collaboration, account, license, purchase

- [ ] ACT-CLOUD-001 gravit-cloud.new / .open / .save / .save-as: New Cloud File / Open from .. / Save / Save to Cloud as... — shortcut: open: Shift+Cmd+O (mac) / Shift+Ctrl+O; save-as: Shift+Cmd+S (mac) / Shift+Ctrl+S — GGravitCloudAction: cloud file dialogs. Not in gravit.actions, so these shortcuts are never bound; still instantiated by the touch toolbar save menu (142799) and other modules. The tab menu "Save as..." item points at gravit-cloud.save-as and is skipped since 8becdac [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:19559 (module 448)
- [ ] ACT-CLOUD-002 sync: Sync File to Gravit Designer... / Unsync / Syncing... — shortcut: none — GCloudSynchronizationAction: toggles cloud sync for a local file; isAvailable needs CLOUD_SYNC_FEATURE.NEW_LAYOUT [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:96493 (module 1293)
- [ ] ACT-CLOUD-003 sync.info: Last synced at %date — shortcut: none — disabled info line for synced files, Electron on macOS only [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156373 (module 1627)
- [ ] ACT-CLOUD-004 file.share: Share File — shortcut: none — ShareManager.share(); enabled when isShareEnabled() [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156439 (module 1628)
- [ ] ACT-CLOUD-005 file.share.opensharedfile: Open Shared File... — shortcut: none — prompts for a share link and opens it; referenced by the tab context menu (skipped because unregistered) [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:80862 (module 1254)
- [ ] ACT-CLOUD-006 gravit-versions-history: Show Version History — shortcut: none — cloud version history panel; isPro; referenced by the tab context menu (skipped) [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:81060 (module 1256)
- [ ] ACT-CLOUD-007 file.sharepoint-checkout: Check Out and Refresh from SharePoint — shortcut: none — SharePoint storage check-out [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156480 (module 1629)
- [ ] ACT-CLOUD-008 file.sharepoint-checkin: Check In to SharePoint — shortcut: none — SharePoint storage check-in [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156549 (module 1630)
- [ ] ACT-CLOUD-009 example-files: Explore Example Files — shortcut: none — opens the cloud dialog on example files [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156798 (module 1633)
- [ ] ACT-CLOUD-010 account.open: Account settings — shortcut: none — runDeepLink("account"); Account menu only exists in touch mode [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156920 (module 1635)
- [ ] ACT-CLOUD-011 account.logout: Log out — shortcut: none — gDesigner.signout() [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156956 (module 1636)
- [ ] ACT-CLOUD-012 help.purchase: UPGRADE NOW — shortcut: none — openPaymentDialog(); visible for non-pro users when in-app purchase is allowed [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:72445 (module 1158)
- [ ] ACT-CLOUD-013 use-coupon-action: Use Coupon — shortcut: none — prompts for a coupon code and activates it [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:98312 (module 1298)
- [ ] ACT-CLOUD-014 toggle-pro-beta-license: Switch to Basic/PRO License — shortcut: none — beta-only license flag toggle [**not registered**; **drop in rewrite**] — old: designer.browser.dev.js:156991 (module 1637)
- [ ] ACT-CLOUD-015 help.switchwebcdr.<server>: <server name> — shortcut: none — switches the Corel web CDR server and reloads [**not registered**; checkable; **drop in rewrite**] — old: designer.browser.dev.js:157614 (module 1641)
- [ ] ACT-CLOUD-016 (GProAction wrapper): - — shortcut: none — wraps font.import, file.save-as.pdf.300 and view.toggle-touch: isPro() true, execute() calls handlePROFeatureInterruption() without a license. Rewrite: no wrapper, run the action [**drop in rewrite**] — old: designer.browser.dev.js:156286 (module 1626)
- [ ] ACT-CLOUD-017 (isPro / PRO badges): - — shortcut: none — isEnabledProFeatures() and the PRO badge via GMenuItem.setPro; affects file.export, file.save-as.pdf.300, modify.createsymbol, gravit-versions-history. Rewrite: everything unlocked, no badges [**drop in rewrite**] — old: designer.browser.dev.js:125029 (module 1491)
- [ ] ACT-CLOUD-018 (user details popover): Settings / Sign out — shortcut: none — header avatar overlay with account settings and sign-out buttons [**drop in rewrite**] — old: designer.browser.dev.js:174357 (module 1732)
- [ ] ACT-CLOUD-019 (cloud files browser context menus): - — shortcut: none — right-click menus on cloud files and folders (_handleFileContextMenu, folder onContext 146723 in 1548, files panel 98691 in 1300) [**drop in rewrite**] — old: designer.browser.dev.js:146029 (module 1547)
- [ ] ACT-CLOUD-020 (persona bar): - — shortcut: none — avatars of collaborators in the header [**drop in rewrite**] — old: designer.browser.dev.js:128989 (module 1502)
- [ ] ACT-CLOUD-021 (gdb_* debug action hooks): Save steps / Import steps / ... — shortcut: none — window.gdb_initsavestepsaction, gdb_initsetupsystemdateaction, gdb_inittranslationtoolaction, gdb_initrecordgravitaction may push extra actions when a test harness defines them; nothing in public/ defines them [**drop in rewrite**] — old: designer.browser.dev.js:120101 (module 1483)

### Menu system

- [ ] ACT-MENU-001 main menu builder — GDesigner._createMainMenu walks gravit.actions in order; each action's category chain (GCategory, module 18) becomes nested submenus by label, getGroup() "a/b/c" gives one group per level, and a divider is inserted whenever the group changes from the previous entry. isAvailable()==false actions are skipped, but they are still stored in the action map first (getAction works). Menus refresh title/enabled/checked on open. Throws if group depth != category depth — old: designer.browser.dev.js:123240 (module 1491)
- [ ] ACT-MENU-002 action registry — gravit.actions array built at startup (order defines menu order); GDesigner copies it into _actions and _actionsMap; getAction(id), executeAction(id, args, source) (122555) — old: designer.browser.dev.js:119444 (module 1483)
- [ ] ACT-MENU-003 categories — GCategory constants with label, parent, visible and icon getters: File, File/Share, File/Open Recent, File/Save as (unused), File/Gravit Designer (unused), File/Import, File/Import/Place Image..., File/Export, File/Export/PDF Document (.pdf), Edit, Edit/Paste, Edit/Select Same, Modify, Modify/Create Compound Shape, Modify/Arrange, Modify/Align, Modify/Transform, Modify/Path, Modify/Symbol, View, View/Canvas, View/Snap to, View/Magnification, Help, Help/Support, Help/Beta Feedback (unused), Help/Learn, Help/Language, Help/CDGS server, Account (visible only in touch mode, avatar icon) — old: designer.browser.dev.js:354 (module 18)
- [ ] ACT-MENU-004 menu bar — GHeader creates GMenuBar(gDesigner.getMainMenu()) in the header; top-level order is first appearance: File, Edit, Modify, View, Help. There is no Text, Arrange, Window or Object menu — old: designer.browser.dev.js:128448 (module 1500)
- [ ] ACT-MENU-005 GMenuBar widget — <nav class="g-menu-bar"> hosting the root GMenu — old: designer.browser.dev.js:128952 (module 1501)
- [ ] ACT-MENU-006 GMenu / GMenuItem widgets — menu, item, divider types; items carry caption, icon, shortcut hint, checked, enabled, visible (from action.isVisible()), PRO badge, rich tooltip; GMenu module 238 line 11384 — old: designer.browser.dev.js:14130 (module 339)
- [ ] ACT-MENU-007 recent files submenu — GContainer.updateRecentDocumentsAction clears File ▸ Open Recent and adds one item per recent document ("name.ext", storage icon), local items first then a divider before cloud items; empty list shows the disabled "No Recent Files" item; click opens the document — old: designer.browser.dev.js:3282 (module 85)
- [ ] ACT-MENU-008 sidebar toggles placement — one GToggleSidebarAction per gravit.sidebars entry (Inspector, Comments, Layers, Libraries, Symbols) spliced into the action list right before view.clone — old: designer.browser.dev.js:122780 (module 1491)
- [ ] ACT-MENU-009 touch hamburger menu — in touch mode the toolbar shows a menubar icon button whose dropdown is the whole main menu (getMainMenu().detach()); next to it Open (split: open menu), Save group (save, save-as gvdesign, gravit-cloud.save-as, sync), Undo with quick history, zoom menu (fit all, fit selection, 50/100/200/400%), snap button. Drop or fold into the desktop UI — old: designer.browser.dev.js:142757 (module 1543)
- [ ] ACT-MENU-010 Electron has no native menu — Menu.setApplicationMenu(null); the in-page menu bar is the only menu — old: electron-main.js:120

### Context menus

- [ ] ACT-CTX-001 canvas context-menu dispatcher — GContextMenu listens for "contextmenu" on the windows element; unless the active tool catches it, it picks a menu by data.context: PagePanel -> page menu, LayerPanel -> main context menu (touch overlay in touch mode), Fill/Border/EffectPropertyPanel -> property menus, crop mode -> crop menu, else the main context menu — old: designer.browser.dev.js:100570 (module 1303)
- [ ] ACT-CTX-002 canvas / layers main context menu — Edit Selection; Paste ▸ (Paste Here, Paste and Replace, Paste Style); --- Arrange ▸ (front, forward, backward, back); Align ▸ (left, center, right, same width, ---, top, middle, bottom, same height, ---, distribute horizontally, vertically); Transform ▸ (rotate 90 left, rotate 90 right, flip horizontal, flip vertical); --- Group, Create Compound (hidden), Ungroup, Mask with Shape; --- Convert to Path, Vectorize Border, Join Paths, Split Path; --- Create Symbol, Detach Symbol, Reset Instance; --- Attach Text to Path, Detach Text from Path; --- Select Same ▸ (Font Type, ---, Fill, Border, Fill & Border, ---, Border Width, Transparency, Blend Mode, Shape, Effect); --- Select ▸. Items are action-backed, so enabled/visible/shortcut hint come from the actions — old: designer.browser.dev.js:100640 (module 1303)
- [ ] ACT-CTX-003 Select ▸ hit list — lists elements under the cursor ("1. Rectangle"), children of hit groups as nested submenus; hover highlights, click selects (Shift adds) — old: designer.browser.dev.js:100813 (module 1303)
- [ ] ACT-CTX-004 crop context menu — Confirm Cropping, Cancel Cropping — old: designer.browser.dev.js:100898 (module 1303)
- [ ] ACT-CTX-005 pages panel context menu — Duplicate Page, Delete Page (confirm), Copy Page, Export Page (runs file.export with the page element); opened from the pages panel (module 1717 line 171741) — old: designer.browser.dev.js:100968 (module 1303)
- [ ] ACT-CTX-006 fill row context menu — Delete Fill, Copy Fill (inspector fill list) — old: designer.browser.dev.js:101095 (module 1303)
- [ ] ACT-CTX-007 border row context menu — Advanced Border Settings, Delete Border, Copy Border — old: designer.browser.dev.js:101171 (module 1303)
- [ ] ACT-CTX-008 effect row context menu — Apply to ▸ (Whole Element, Fill Only, Border Only), Copy Effect — old: designer.browser.dev.js:101263 (module 1303)
- [ ] ACT-CTX-009 layers panel trigger — right-click on a layer row selects it (if not selected) and re-triggers "contextmenu" with LayerPanel context on the windows element, so it shows the canvas menu — old: designer.browser.dev.js:168427 (module 1706)
- [ ] ACT-CTX-010 tab context menu — right-click on a document tab (handleContextMenu 128851): Rename (inline title edit; hidden for GExternalStorage files, renames cloud files remotely; needs editing enabled), ---, Save, Save as... (gravit-cloud.save-as, skipped), ---, Share (cloud), Open Shared File... (skipped), Show Version History (skipped), Advanced Export..., Duplicate (clones the scene into a new tab "name(1)", cloud files are copied server-side; hidden for external files), ---, Close Other Files (confirm), Close All (confirm). Since 8becdac items with needsAction and no registered action are skipped (128898) — old: designer.browser.dev.js:128109 (module 1500)
- [ ] ACT-CTX-011 touch context menu — icon sections (transform, paste, compound, path, symbol, text, image crop/original size/replace, select, visibility/lock toggles) shown instead of the desktop menu in touch mode. Probably drop — old: designer.browser.dev.js:149032 (module 1563)
- [ ] ACT-CTX-012 long-press -> contextmenu — touch long press synthesizes a contextmenu event — old: designer.browser.dev.js:152485 (module 1586)
- [ ] ACT-CTX-013 browser context menu suppression — document-level capture handler prevents the native menu except in editable fields or property panels that define their own — old: designer.browser.dev.js:121801 (module 1491)

### Main menu tree

Simulated from GDesigner._createMainMenu (designer.browser.dev.js:123240) for desktop Chrome, non-touch, web runtime: items whose isAvailable() is false there (Safari open, iPad import, Electron-only Quit, Save All, Paste Here, cloud items) are left out. "---" is a divider inserted on a group change. Hidden items exist in the menu but are not shown; a divider whose preceding item is hidden is hidden too. In Electron, File ▸ Quit appears after Install to Desktop (group file-quit, preceded by a divider), Install to Desktop disappears and Link Image is enabled.

- **File** ▸
  - ACT-FILE-001 New Design... (Option+N (mac) / Alt+N; also Cmd+N (mac) / Ctrl+N)
  - ACT-FILE-002 New Design from Template...
  - ACT-FILE-003 New from Clipboard (Shift+Ctrl+Option+N (mac) / Shift+Ctrl+Alt+N)
  - ---
  - ACT-FILE-004 Open Local File... (Cmd+O (mac) / Ctrl+O) _[available: not Safari]_
  - **Open Recent** ▸
    - ACT-FILE-006 No Recent Files
  - ---
  - ACT-FILE-007 Save (Cmd+S (mac) / Ctrl+S)
  - ACT-FILE-008 Save to Local File as... ("Download File" when storage cannot save) (Shift+Cmd+Option+S (mac) / Shift+Ctrl+Alt+S)
  - ---
  - ACT-WINDOW-001 Close window (Option+Q (mac) / Alt+Q) _[hidden]_
  - ---
  - **Import** ▸
    - ACT-FILE-010 Place Image... (Option+P (mac) / Alt+P) _[visible: not iPad]_
    - ACT-FILE-012 Link Image... _[available: not iPad]_
    - ---
    - ACT-FILE-013 Add Fonts...
  - ---
  - **Export** ▸
    - ACT-FILE-014 Advanced Export... (Shift+Cmd+E (mac) / Shift+Ctrl+E)
    - ---
    - ACT-FILE-015 PNG Image (.png)
    - ACT-FILE-016 JPEG Image (.jpg)
    - ACT-FILE-017 Scalable Vector Graphics (.svg)
    - **PDF Document (.pdf)** ▸
      - ACT-FILE-018 72 dpi
      - ACT-FILE-019 96 dpi
      - ACT-FILE-020 150 dpi
      - ACT-FILE-021 300 dpi
      - ---
      - ACT-FILE-022 Advanced Options...
  - ---
  - ACT-FILE-023 Print... (Cmd+P (mac) / Ctrl+P)
  - ---
  - ACT-FILE-024 Install to Desktop _[available: PWA install supported and not running standalone]_
- **Edit** ▸
  - ACT-EDIT-001 Undo / "Undo %action" (Cmd+Z (mac) / Ctrl+Z)
  - ACT-EDIT-002 Redo / "Redo %action" (Shift+Cmd+Z (mac) / Shift+Ctrl+Z)
  - ---
  - ACT-EDIT-003 Cut (Cmd+X (mac) / Ctrl+X)
  - ACT-EDIT-004 Copy (Cmd+C (mac) / Ctrl+C)
  - **Paste** ▸
    - ACT-EDIT-005 Paste (Cmd+V (mac) / Ctrl+V)
    - ACT-EDIT-006 Paste In Place (Shift+Cmd+V (mac) / Shift+Ctrl+V)
    - ACT-EDIT-007 Paste and Replace (Option+Cmd+V (mac) / Alt+Ctrl+V)
    - ACT-EDIT-008 Paste Inside Selection (Option+Shift+Cmd+V (mac) / Alt+Shift+Ctrl+V)
    - ACT-EDIT-010 Paste Style (F4)
  - ACT-EDIT-011 Delete (Backspace (mac) / Delete; also Delete (mac) / Backspace)
  - ACT-EDIT-012 Duplicate (Cmd+D (mac) / Ctrl+D; also Shift+Cmd+D (mac) / Shift+Ctrl+D)
  - ---
  - ACT-EDIT-013 Edit Selection
  - ACT-EDIT-014 Select All (Cmd+A (mac) / Ctrl+A)
  - ACT-EDIT-015 Deselect All (Shift+Cmd+A (mac) / Shift+Ctrl+A)
  - ACT-EDIT-016 Invert Selection (Shift+Cmd+I (mac) / Shift+Ctrl+I)
  - ---
  - **Select Same** ▸
    - ACT-EDIT-017 Font Type
    - ---
    - ACT-EDIT-018 Fill
    - ACT-EDIT-019 Border
    - ACT-EDIT-020 Fill & Border
    - ---
    - ACT-EDIT-021 Border Width
    - ACT-EDIT-022 Transparency
    - ACT-EDIT-023 Blend Mode
    - ACT-EDIT-024 Shape
    - ACT-EDIT-025 Effect
  - ---
  - ACT-EDIT-026 Settings...
  - ---
  - ACT-KEY-001 Choose a fill color (Cmd+Option+C (mac) / Ctrl+Alt+C; also I) _[hidden]_
  - ACT-KEY-002 Choose a border color (Shift+Cmd+Option+C (mac) / Shift+Ctrl+Alt+C) _[hidden]_
  - ACT-KEY-003 Rename a layer (Option+R (mac) / Alt+R) _[hidden]_
  - ACT-KEY-004 Change opacity ("Set opacity to %value") (Shift+0..9) _[hidden]_
- **Modify** ▸
  - **Arrange** ▸
    - ACT-ARRANGE-001 Bring to Front (Shift+Cmd+Up (mac) / Shift+Ctrl+Up)
    - ACT-ARRANGE-002 Bring Forward (Cmd+Up (mac) / Ctrl+Up)
    - ACT-ARRANGE-003 Send Backward (Cmd+Down (mac) / Ctrl+Down)
    - ACT-ARRANGE-004 Send to Back (Shift+Cmd+Down (mac) / Shift+Ctrl+Down)
  - **Align** ▸
    - ACT-ALIGN-001 Align Left (Option+A (mac) / Alt+A)
    - ACT-ALIGN-002 Align Center (Option+H (mac) / Alt+H)
    - ACT-ALIGN-003 Align Right (Option+D (mac) / Alt+D)
    - ---
    - ACT-ALIGN-004 Align Top (Option+W (mac) / Alt+W)
    - ACT-ALIGN-005 Align Middle (Option+V (mac) / Alt+V)
    - ACT-ALIGN-006 Align Bottom (Option+S (mac) / Alt+S)
    - ---
    - ACT-ALIGN-007 Same Width
    - ACT-ALIGN-008 Same Height
    - ---
    - ACT-ALIGN-009 Distribute Horizontally
    - ACT-ALIGN-010 Distribute Vertically
    - ---
    - ACT-ALIGN-011 Snap to Full Units (Shift+Cmd+U (mac) / Shift+Ctrl+U)
    - ACT-ALIGN-012 Snap to Half Units
  - **Transform** ▸
    - ACT-ARRANGE-005 Rotate 45° Left
    - ACT-ARRANGE-006 Rotate 90° Left
    - ACT-ARRANGE-007 Rotate 180° Left
    - ---
    - ACT-ARRANGE-008 Rotate 45° Right
    - ACT-ARRANGE-009 Rotate 90° Right
    - ACT-ARRANGE-010 Rotate 180° Right
    - ---
    - ACT-ARRANGE-011 Flip Vertical
    - ACT-ARRANGE-012 Flip Horizontal
  - ---
  - ACT-MODIFY-001 Group Selection (Cmd+G (mac) / Ctrl+G)
  - ACT-MODIFY-002 Clip Selection (Option+Cmd+M (mac) / Alt+Ctrl+M)
  - ACT-MODIFY-003 Ungroup Selection (Shift+Cmd+G (mac) / Shift+Ctrl+G)
  - ACT-MODIFY-004 Mask with Shape (Cmd+Shift+M (mac) / Ctrl+Shift+M)
  - ACT-MODIFY-005 Confirm Cropping
  - ACT-MODIFY-006 Cancel Cropping
  - ACT-MODIFY-007 Create Compound (Shift+Cmd+Y (mac) / Shift+Ctrl+Y, then U/S/I/X within 500 ms) _[hidden]_
  - ---
  - **Create Compound Shape** ▸
    - ACT-MODIFY-008 Intersect (Shift+Cmd+Y then I (mac) / Shift+Ctrl+Y then I)
    - ACT-MODIFY-009 Difference (Shift+Cmd+Y then X (mac) / Shift+Ctrl+Y then X)
    - ACT-MODIFY-010 Subtract (Shift+Cmd+Y then S (mac) / Shift+Ctrl+Y then S)
    - ACT-MODIFY-011 Union (Shift+Cmd+Y then U (mac) / Shift+Ctrl+Y then U)
  - ACT-MODIFY-012 Create Nested Compound (Cmd+Option+M (mac) / Ctrl+Alt+M)
  - ---
  - **Path** ▸
    - ACT-PATH-001 Join Paths (Cmd+J (mac) / Ctrl+J)
    - ACT-PATH-002 Split Path (Shift+Cmd+J (mac) / Shift+Ctrl+J)
    - ---
    - ACT-PATH-003 Convert to Path (Cmd+Shift+P (mac) / Ctrl+Shift+P)
    - ACT-PATH-004 Convert to Raw Path (Cmd+Shift+R (mac) / Ctrl+Shift+R)
    - ACT-PATH-005 Convert to Outline (F5)
    - ACT-PATH-006 Expand/Shrink
    - ACT-PATH-007 Vectorize Border
    - ACT-PATH-008 Vectorize Image
    - ACT-TEXT-001 Attach Text to Path
    - ACT-TEXT-002 Detach Text from Path
    - ACT-PATH-009 Simplify Path (Cmd+Option+S (mac) / Ctrl+Alt+S)
    - ---
    - ACT-PATH-010 Connect Paths Lines
    - ACT-PATH-011 Break Curve
    - ACT-PATH-012 Reverse Order
  - **Symbol** ▸
    - ACT-MODIFY-013 Create Symbol (F8)
    - ACT-MODIFY-014 Detach Symbol Instance (Shift+Cmd+F8 (mac) / Shift+Ctrl+F8)
    - ACT-MODIFY-015 Reset Instance
  - ---
  - ACT-MODIFY-016 Flatten (F7)
  - ---
  - ACT-KEY-005 Lock a layer (Cmd+2 (mac) / Ctrl+2) _[hidden]_
  - ACT-KEY-006 Change anchor point joint type (Cmd+Option+A (mac) / Ctrl+Alt+A, then S/M/D/C/A within 500 ms) _[hidden]_
  - ACT-KEY-007 Change anchor point joint type to Straight (Cmd+Option+A then S (mac) / Ctrl+Alt+A then S) _[hidden]_
  - ACT-KEY-008 Change anchor point joint type to Mirrored (Cmd+Option+A then M (mac) / Ctrl+Alt+A then M) _[hidden]_
  - ACT-KEY-009 Change anchor point joint type to Disconnected (Cmd+Option+A then D (mac) / Ctrl+Alt+A then D) _[hidden]_
  - ACT-KEY-010 Change anchor point joint type to Asymmetric (Cmd+Option+A then A (mac) / Ctrl+Alt+A then A) _[hidden]_
  - ACT-KEY-011 Change anchor point joint type to Connector (Cmd+Option+A then C (mac) / Ctrl+Alt+A then C) _[hidden]_
  - ACT-KEY-012 Swap fill and border (X) _[hidden]_
  - ACT-KEY-013 Create new layer (Cmd+M (mac) / Ctrl+M) _[hidden]_
- **View** ▸
  - ACT-VIEW-001 Original-View (Cmd+0 (mac) / Ctrl+0)
  - ACT-VIEW-002 Fit Selection
  - ACT-VIEW-003 Fit Layer
  - ACT-VIEW-004 Fit All (Option+Cmd+0 (mac) / Alt+Ctrl+0)
  - ---
  - ACT-KEY-014 Enter layer group (Enter) _[hidden]_
  - ACT-KEY-015 Leave layer group (Shift+Enter) _[hidden]_
  - ACT-KEY-016 Hide a layer (Cmd+3 (mac) / Ctrl+3) _[hidden]_
  - ACT-KEY-017 Select next layer (Tab) _[hidden]_
  - ACT-KEY-018 Select previous layer (Shift+Tab) _[hidden]_
  - ACT-KEY-019 Toggle multipage mode (F6) _[hidden]_
  - ACT-KEY-020 Select next page (Cmd+Option+Down (mac) / Ctrl+Alt+Down; also PageDown) _[hidden]_
  - ACT-KEY-021 Select previous page (Cmd+Option+Up (mac) / Ctrl+Alt+Up; also PageUp) _[hidden]_
  - ACT-WINDOW-002 Select next tab (Option+. (mac) / Alt+.) _[hidden]_
  - ACT-WINDOW-003 Select previous tab (Option+, (mac) / Alt+,) _[hidden]_
  - ---
  - **Magnification** ▸
    - ACT-VIEW-005 6%
    - ACT-VIEW-006 12%
    - ACT-VIEW-007 25%
    - ACT-VIEW-008 50% (Cmd+5 (mac) / Ctrl+5)
    - ACT-VIEW-009 66%
    - ACT-VIEW-010 100% (Cmd+1 (mac) / Ctrl+1)
    - ACT-VIEW-011 150%
    - ACT-VIEW-012 200%
    - ACT-VIEW-013 300%
    - ACT-VIEW-014 400% (Cmd+4 (mac) / Ctrl+4)
    - ACT-VIEW-015 800% (Cmd+8 (mac) / Ctrl+8)
    - ACT-VIEW-016 1600%
    - ACT-VIEW-017 3200%
    - ACT-VIEW-018 6400%
    - ACT-VIEW-019 12800%
    - ACT-VIEW-020 25600%
    - ---
    - ACT-VIEW-021 Zoom in (Cmd++ (mac) / Ctrl++; also Cmd+= (mac) / Ctrl+=)
    - ACT-VIEW-022 Zoom out (Cmd+- (mac) / Ctrl+-)
  - ---
  - ACT-VIEW-023 Outline View (Option+Y (mac) / Alt+Y) _[checkable]_
  - ACT-VIEW-024 Fast View _[checkable]_
  - ---
  - **Canvas** ▸
    - ACT-VIEW-025 Show Rulers (Cmd+Option+R (mac) / Ctrl+Alt+R) _[checkable]_
    - ACT-VIEW-026 Show Guide Lines (Cmd+, (mac) / Ctrl+,) _[checkable]_
    - ACT-VIEW-027 Show Symbol Labels _[checkable]_
    - ACT-VIEW-028 Show Grid (Cmd+Option+G (mac) / Ctrl+Alt+G) _[checkable]_
    - ACT-VIEW-029 Show Slices _[checkable]_
    - ACT-VIEW-030 Show Effects (Cmd+E (mac) / Ctrl+E) _[checkable]_
    - ---
    - ACT-VIEW-031 Show Selection Handles (Shift+Cmd+X (mac) / Shift+Ctrl+X) _[checkable]_
  - ---
  - **Snap to** ▸
    - ACT-VIEW-032 Use Snapping (Shift+F10) _[checkable]_
    - ACT-VIEW-033 Use Snap Zones _[checkable]_
    - ---
    - ACT-VIEW-034 Snap to Grid _[checkable]_
    - ACT-VIEW-035 Snap to Guide Lines _[checkable]_
    - ACT-VIEW-036 Snap to Full Pixels _[checkable]_
    - ACT-VIEW-037 Snap to Anchor Points _[checkable]_
    - ACT-VIEW-038 Snap to Shapes _[checkable]_
    - ACT-VIEW-039 Snap to Pages _[checkable]_
  - ---
  - ACT-VIEW-040 Show Inspector Panel (Option+2 (mac) / Alt+2) _[checkable]_
  - ACT-VIEW-041 Show Comments Panel _[visible: commenting enabled; checkable]_
  - ACT-VIEW-042 Show Layers Panel (Option+1 (mac) / Alt+1) _[checkable]_
  - ACT-VIEW-043 Show Libraries Panel _[visible: editing enabled; checkable]_
  - ACT-VIEW-044 Show Symbols Panel _[visible: editing enabled; checkable]_
  - ---
  - ACT-WINDOW-004 New View (Cmd+Option+N (mac) / Ctrl+Alt+N)
  - ---
  - ACT-VIEW-045 Play/Present... (Cmd+Option+Enter (mac) / Ctrl+Alt+Enter) _[visible: not inside MS Teams]_
  - ACT-VIEW-046 Toggle Fullscreen... (Option+Enter (mac) / Alt+Enter) _[visible: fullscreen supported]_
  - ---
  - ACT-VIEW-047 Touch interface / Disable Touch Interface _[available: TOUCH_LAYOUT, not guest, not iPad; checkable]_
- **Help** ▸
  - **Support** ▸
    - ACT-HELP-001 Contact Us
  - **Learn** ▸
    - ACT-HELP-002 User Guide
    - ACT-HELP-003 Tutorials
    - ACT-HELP-005 Display Enhanced Tooltips _[checkable]_
    - ACT-HELP-008 Show Keyboard Shortcuts
  - ACT-HELP-004 Request New Feature
  - ACT-HELP-006 Show Quick Help _[visible: touch mode only]_
  - ACT-HELP-007 Show Welcome Screen

### Notes for the rewrite

- The menu is data-driven: order comes from the registration list, nesting from the category chain, dividers from group changes. A declarative menu table (id, menu path, group, shortcut per platform) would replace both the GCategory/getGroup pair and the separate tab, context and touch menu definitions. Keep action ids stable; the tab menu, toolbar, context menus and stats refer to them by string.
- Several ids are inconsistent and worth keeping only behind an alias map: paste.paste (no edit. prefix), zoom.out (no view. prefix), modify.ouline (typo), modify.path2bmp is "Flatten", modify.bmp2path is "Vectorize Image", modify.split is "Ungroup", file.save-as.pdf (72 dpi has no suffix, the others do).
- Shortcut conflicts and bugs found: modify.clip and modify.createnestedcompound both use Cmd/Ctrl+Option/Alt+M (the later one probably wins); view.change-active-page PageUp/PageDown additional shortcuts are malformed (single key instead of array of arrays); file.open-from-template is hard-wired disabled; file.save-all is dead code; "Shift+Ctrl+Alt+N" for New from Clipboard uses a real Ctrl on mac while everything else uses Cmd.
- Hidden shortcut-only actions (ACT-KEY) are easy to lose because nothing in the menu shows them. Several only work when the Layers sidebar is focused (rename, lock, hide, enter/leave group, Tab cycling) or the Inspector is active (anchor joint type). Single-letter shortcuts X (swap fill/border) and I (eyedropper) fire on any keydown outside inputs, same as tool keys.
- Shortcuts only exist for actions that made it into the menu, because addMenuItem does the binding. The rewrite should bind shortcuts from the action table directly, independent of menu visibility, and filter by platform/runtime explicitly (Safari open variant, Electron-only quit).
- Two-stroke shortcuts (Shift+Cmd+Y then U/S/I/X, Cmd+Option+A then S/M/D/C/A) and Shift+digit opacity with a 500 ms second digit need their own small key-sequence handler; Mousetrap sequences are not used.
- Global shortcuts (fire inside text inputs): only Save, Zoom in, Zoom out. Undo/Redo/Select All/Deselect delegate to document.execCommand when an input has focus; cut/copy/paste go through a hidden textarea so the browser clipboard events fire. The rewrite needs an equivalent rule for "editable element focused".
- Drop: everything in ACT-CLOUD, the GProAction wrapper, PRO badges and isPro checks (Export, PDF 300 dpi, multi-symbol Create Symbol, Add Fonts, touch mode), open-welcome-screen's canAccessFreemium check, the Account menu, persona bar, Comments sidebar toggle (annotations need the cloud), the tab menu's Share/Open Shared File/Version History/cloud Save as items. Print should always use 300 dpi.
- Probably drop: touch layout (view.toggle-touch, touch context menu, touch hamburger, quick help, long press), iPad image import, Install to Desktop (PWA) unless the web build keeps PWA, language switcher (only English is bundled), translation tool, CDGS server switch, MS Teams checks.
- Consider restoring: view.toggle-paint-layers-visibility (F / Shift+B) is fully implemented but never registered; check-for-updates for Electron; file.open-from-template if templates ship locally.
- Help links already point at the GitHub repo and /docs; the YouTube tutorial playlist link comes from module 1302 and is still the original Gravit one.
- The user guide pages in docs/ (file-menu.html, edit-menu.html, modify-menu.html, view-menu.html, help-menu.html, shortcuts.html) describe the original Corel build and include cloud items; use them for wording, not as the source of the menu structure.

## UI surfaces

Everything the user sees outside menus and actions (those are in the actions inventory). One line per item. Line numbers refer to `public/designer.browser.dev.js` unless prefixed `chunk.vendor.js:` or `engine:`. Module ids come from `next/docs/rewrite/old-module-index.tsv`. CSS class names are given as the old code writes them, typos included, because the React rewrite reuses the old stylesheets.

### Shell

- [ ] UI-SHELL-001 Mainframe root: `body` gets `data-long-press-delay`=500 (LONG_PRESS_TIME_OUT) and a long-press handler that re-fires as `contextmenu`; a `div#mainframe` (display:none until init finishes) is prepended to body and holds `div.frame`. Child parts are appended in this order: #windows, #info, #header, #toolbar, #banner, #overlay, #panels, #footer, #left-sidebars, #right-sidebars. #assistant-bar is added later, only in touch mode. CSS: #mainframe 100%/overflow hidden, `#mainframe .resize *` uses col-resize cursor — old: designer.browser.dev.js:122703 (module 1491)
- [ ] UI-SHELL-002 Part id constants: Info "info", Header "header", Toolbar "toolbar", Panels "panels", Footer "footer", LeftSidebars "left-sidebars", RightSidebars "right-sidebars", Windows "windows", AssistantBar "assistant-bar", Banner "banner", Overlay "overlay" — old: designer.browser.dev.js:55663 (module 863)
- [ ] UI-SHELL-003 Part visibility API: getPart(part) finds #id inside #mainframe; isPartVisible means display != none; setPartVisible(part, visible, display="block") sets display and calls relayout. At init, Panels and Info are hidden — old: designer.browser.dev.js:122093 (module 1491)
- [ ] UI-SHELL-004 Relayout algorithm: top offset stacks Info, then Header, then Overlay (top only, adds nothing), then Toolbar (left/top/right between the sidebars), then Banner. Left and right sidebars get top = that offset and height = mainframe height minus offset, widened to the active sidebar's minimum width. Panels and Footer get left = left sidebar width and width = remaining width. The windows view offset is [left, top, right, bottom], with left and right forced to 0 in touch mode (sidebars float over the canvas). Window resize is debounced 500 ms. Also getCanvasWidth/Center from the sidebar widths — old: designer.browser.dev.js:123104 (module 1491)
- [ ] UI-SHELL-005 Platform body classes: g-edge/g-opera/g-chrome/g-firefox/g-safari/g-msie, g-desktop/g-tablet/g-phone, g-os-unix/g-os-windows/g-os-osx_ios, g-ipad — old: designer.browser.dev.js:122884 (module 1491)
- [ ] UI-SHELL-006 Document title and URL: the title is "<window title> - <app title>", or GDesigner text.design-by for documents owned by someone else. In browser/PWA runtimes, history.pushState goes to "/", "/?d=<id>[&annot=]" or "/?token=<t>[&annot=]" — old: designer.browser.dev.js:123790 (module 1491)
- [ ] UI-SHELL-007 Info bar GInfo (#info, email verification): shown only when subscriptions are enabled, the user is not a guest or anonymous and the email is not verified. Shows GInfo text.title with %date and a `span.link` "Resend email here" (gApi.resendEmailConfirmation). Re-checks daily. CSS #info absolute, padding 7px, bg #e1e1e1; .link #d72e63. Not an inspector panel despite the G-name — old: designer.browser.dev.js:135815 (module 1522)
- [ ] UI-SHELL-008 Header bar GHeader (#header, 36px flex, white): sections in order: optional βETA badge (SHOW_BETA_BRANDING), `.section.menu` (nav.g-menu-bar), `.section.tryout` (UPGRADEABLE licenses only, "try out pro"), `.section.persona`, `.section.windows` (tabs), `.section.busy` (hidden spinner with `.txt`, showBusyIcon/hideBusyIcon), `.section.login`. `#header.lone` when inspect is disabled (adds a bottom border) — old: designer.browser.dev.js:128461 (module 1500)
- [ ] UI-SHELL-009 Header login section `.section.login`: `.avatar` and `.username > span`. Avatar is a picture (background-image) or `gravit-user-bonhomme` initials on the user's color (class user-avatar), or header-cloud when nobody is logged in. Text is the full name or "cloud login". `.user` when logged in; hidden for anonymous users. Click opens gUserLogin/performLogin (debounced via has-been-clicked attr) — old: designer.browser.dev.js:128716 (module 1500)
- [ ] UI-SHELL-010 Menu bar container GMenuBar: `nav.g-menu-bar`, menu root gets `g-menu-root`, reset when touch turns off. Contents belong to the menus inventory — old: designer.browser.dev.js:128952 (module 1501)
- [ ] UI-SHELL-011 Persona bar: `.g-persona-bar > .g-persona-container > .g-persona-item[data-title]` with an img icon, active gets g-active. Renders only with more than one persona; GPersona has one (GraphicDesign), so it is always empty — old: designer.browser.dev.js:128989 (module 1502)
- [ ] UI-SHELL-012 Banner part GBanner (#banner): `.container > p` with GBanner text.access-expire (link with UTM). setEnabled is never called and CSS has no display:none, so the 25px #e0a305 bar is always laid out. Decide whether to port — old: designer.browser.dev.js:127993 (module 1497)
- [ ] UI-SHELL-013 Overlay part (#overlay): empty `.container`, setEnabled never called. CSS absolute, height 92.5%, z-index 1 — old: designer.browser.dev.js:128028 (module 1498)
- [ ] UI-SHELL-014 Fullscreen banner: `div.g-fullscreen-banner` on body, fades in 500 ms, hides after 5 s, text GToggleFullscreenAction fullscreen-banner ("Press Alt + Enter to exit fullscreen mode"). view.fullscreen hides Header, Toolbar, Panels and both sidebars and restores them; no banner in touch mode — old: designer.browser.dev.js:153155 (module 1588)
- [ ] UI-SHELL-015 GSidebars container (one per side): with more than one sidebar builds `.sidebar-selector` (`.singleton` when only one visible) of `.sidebar-option.sidebar-<id>` (`span.sidebar-title` + hidden `span.g-badge`; `.active`; `.content-width` while a badge shows). Each sidebar gets `.sidebar-container.sidebar-<id>[.multiple]`. Buttons call preventDefault on mousedown. Right side sets container `bottom` to the visible `.license-info` height — old: designer.browser.dev.js:16310 (module 395)
- [ ] UI-SHELL-016 Sidebar activation: setActiveSidebar(id) shows the container, applies stored/default width, fires SidebarEvent Activated/Deactivated (module 807) and picks the default touch tool. Settings "sidebars_<left|right>_active" (default true) and "sidebars_width_<id>". Defaults at init: left = outline, right = inspector — old: designer.browser.dev.js:16192 (module 395)
- [ ] UI-SHELL-017 Sidebar resize: hovering within 3*DPI px of the left sidebar's right edge adds `.resize` to .frame; drag clamps to getMinimumWidth; mouseup saves "sidebars_width_<id>". Only resizeable sidebars on the left can be resized — old: designer.browser.dev.js:16482 (module 395)
- [ ] UI-SHELL-018 Disabled sidebar state: `.g-disabled` on the container plus appended `.g-disabled-overlay` when the sidebar is not enabled or the license has no freemium access — old: designer.browser.dev.js:16295 (module 395)
- [ ] UI-SHELL-019 Sidebar toggle wiring: GToggleSidebarAction per sidebar ("view.toggle-sidebar.<id>", Alt+1 outline, Alt+2 inspector) hides the part and writes sidebars_<side>_active. _updateSidebars falls back to inspector/annotations on the right and outline on the left by edit/comment/inspect permission — old: designer.browser.dev.js:123391 (module 1491)
- [ ] UI-SHELL-020 Bottom panels GPanels (#panels): `.panels-tabs` of `button.panel-tab[data-panel-id]` with `span.collapse-icon`, plus `.panels-frame > .panel-container.panel-<id>`. Clicking the active tab cycles collapse none/half/full (`collapse-<mode>`, heights 146/78/22px). gravit.panels is empty, so the part is unused — old: designer.browser.dev.js:139237 (module 1539)
- [ ] UI-SHELL-021 Footer GFooter (#footer): `.root` of `.panel-container` per footer panel (software update, notifications; plus collaborative text and document notifications when isCorel). Hidden when no panel is enabled. `#footer.document-loading` (bg rgba(0,0,0,.75)) while the active document loads/saves/syncs/downloads — old: designer.browser.dev.js:135720 (module 1521)
- [ ] UI-SHELL-022 Windows container GWindows (#windows, bg #f7f7f7): WindowEvent Added/Removed/Deactivated/Activated. Removing activates previous else next window; closing the last window of a modified document asks canUnloadDocument; a synchronizing document shows "please wait"; removing the last window removes the document — old: designer.browser.dev.js:26699 (module 603)
- [ ] UI-SHELL-023 Window GWindow (`div.window`, VIEW_MARGIN 10): hosts the GEditorWidget; on first activate centers and zooms and applies rulers_visible, guide_lines_visible, symbol_labels_visible. White background for infinite scenes. Commercial files get the watermark image — old: designer.browser.dev.js:129033 (module 1503)
- [ ] UI-SHELL-024 Document loading/progress overlay: `.window-overlay > .window-overlay-container > .window-overlay-content` at the view offset: `p.text` ("Loading %name..." / Saving / Synchronizing / Downloading / opening-your-image), `<progress max=100>` 200px, `p.progress-info`, hidden `button.cancel-loading`. Repaints at most every 0.5% / 40 ms. Load failure shows text.loading-failed. This is the "loading screen" — old: designer.browser.dev.js:129223 (module 1503)
- [ ] UI-SHELL-025 Save-failed overlay: dark box (#333, radius 6px) with the message (or text.unable-to-save), Cancel and "Try again" — old: designer.browser.dev.js:129287 (module 1503)
- [ ] UI-SHELL-026 App boot loading state: index.html `<body class="loading">` removed after boot; gDesigner.toggleLoading toggles `body.g-loading` (CSS spinner `.g-loading:after`, also used on many panels) — old: designer.browser.dev.js:121977 (module 1491)
- [ ] UI-SHELL-027 Drag image helper: shared `div.g-drag-image` on body — old: designer.browser.dev.js:119262 (module 1483)
- [ ] UI-SHELL-028 Drag-and-drop of files: window dragover/drop preventDefault; drop goes to the active view (FileDropEvent, then document.placeOrImport at the drop point). With no open document a drop does nothing (no drop-to-open) — old: designer.browser.dev.js:121731 (module 1491)
- [ ] UI-SHELL-029 Global input guards: Ctrl/Meta+wheel preventDefault (no browser zoom); Safari gesturechange becomes ctrl+wheel; keydown refocuses the view unless an editable or number input has focus; document contextmenu suppressed except on editables — old: designer.browser.dev.js:121728 (module 1491)
- [ ] UI-SHELL-030 Rulers UI: setting rulers_visible (default false), toggled by view.rulers (Meta+Alt+R), also toggles `#mainframe.rulers`. Engine draws `.g-ruler-widget.horizontal|vertical` (canvas + 1px `.mouse-marker`, 19px thick) and a 19×19 corner showing the scene unit in 9px Verdana — old: designer.browser.dev.js:155395 (module 1614); engine: chunk.vendor.js:62659
- [ ] UI-SHELL-031 Startup environment dialogs: unsupported browser (text.unsupported-browser[-touch], one-time key designer.settings.dont_show_unsupported_browser_dialog) and screen smaller than 1024 (text.unsupported-screen-size, key designer.settings.dont_show_unsupported_screen_size_dialog) — old: designer.browser.dev.js:122749 (module 1491)
- [ ] UI-SHELL-032 Install PWA prompt logic: auto-shows GInstallPwaDialog on the 3rd beforeinstallprompt within 7 days on screens ≥1024 wide, not within 30 days of "Not now". Storage pwa.closed-install-pwa-dialog-date, pwa.show-install-dialog-3-times-a-week (dialog itself: DIALOG section) — old: designer.browser.dev.js:125213 (module 1491)
- [ ] UI-SHELL-033 Fonts download progress: `.fonts-download-progress` appended to #right-sidebars with "Downloading fonts" `.info`, `.count` " (0%)" and an X `.g-button.close` — old: designer.browser.dev.js:124659 (module 1491)
- [ ] UI-SHELL-034 Countdown timer: `div.g-timer` on body with GCommonNames text.countdown-timer (account deactivation) — old: designer.browser.dev.js:124285 (module 1491)
- [ ] UI-SHELL-035 Toolbar alignment: setting ui_toolbar_alignment (default true = left); false adds `.frame.ui-toolbar-center`. Touch always centers via `body.g-touch #toolbar:not(.g-simple-ui)` — old: designer.browser.dev.js:123518 (module 1491)

### Toolbar

- [ ] UI-TOOLBAR-001 GToolbar (#toolbar, 37px, white, borders, flex wrap): sections `div.section.compound-section.<name>-section` in order file, view, tool, transform, group, arrange, action, export. setEnabled toggles g-disabled on every `.toolbar-button > button`. `g-simple-ui` when pages-inspect is disabled — old: designer.browser.dev.js:139603 (module 1541)
- [ ] UI-TOOLBAR-002 Label button factory: `div.toolbar-button[data-action]` > `button.action-button[data-title]` (`.icon` span or `span.caption`; `.g-active`). Split buttons add `.dropdown` + `button.dropdown-button > span.gravit-icon-down`; menus add `.menu` + `span.gravit-icon-down.dropdown-icon`. Always ends with `span.processing` — old: designer.browser.dev.js:140978 (module 1541)
- [ ] UI-TOOLBAR-003 File section: Save, Undo (split, "quick history" dropdown of undo/redo states, `.pro` when restricted), Redo — old: designer.browser.dev.js:139605 (module 1541)
- [ ] UI-TOOLBAR-004 Zoom button `.zoom-button`: gravit-icon-zoom-in + caption "100%", attached "-"/"+" buttons (15px, `.left-attached`/`.right-attached`). Menu: Original view, divider, ZOOM_LEVELS 6,12,25,50,66,100,150,200,300,400,800,1600,3200,6400,12800,25600. Double-click opens `.gravit-zoom-manual-input` (number 6..25600 + "%"; Enter applies, Esc cancels) — old: designer.browser.dev.js:140564 (module 1541)
- [ ] UI-TOOLBAR-005 View section: zoom button, Fit All, View split (hand H / zoom Z), Snap `.snap-button` (gravit-icon-magnet, active when snap_disabled === false; menu: snap, snap zones, guides, grid/guide lines/symbol labels) — old: designer.browser.dev.js:139629 (module 1541)
- [ ] UI-TOOLBAR-006 Tool section: Select (split; Pointer V, SubSelect D, Lasso O, Layer, Slice S), Shape (Line L, Rectangle R/M, Ellipse E, Polygon, Triangle, Star), Path (Pen P, Bezigon B pro, Freehand), Knife (Knife K, Magic), Text T, Image (Place/Import, Link image). Active tool's icon is swapped in; changing tools activates the inspector — old: designer.browser.dev.js:139673 (module 1541)
- [ ] UI-TOOLBAR-007 Custom mod buttons (dev only, localStorage "enable_mods"): "Add custom button" dialog (textarea.custom_button_code, input.custom_button_name) saved to localStorage "designer.custom" as [{name, code, id}], rendered as `.custom_codes_button`; runs arbitrary code. Probably drop — old: designer.browser.dev.js:139790 (module 1541)
- [ ] UI-TOOLBAR-008 Transform/group/arrange/action sections: flip H/V, rotate 90 L/R; Group, Split, Merge (menu), Clip; Bring forward, Send backward; Create symbol, Convert to path, Vectorize border. Disabled by context (_updateContextTools) — old: designer.browser.dev.js:139862 (module 1541)
- [ ] UI-TOOLBAR-009 Export section: `.export-toolbar-button` (split; Export, Save As per FILE_FORMATS, PDF 96/150/300 dpi) + `.share-section` with collaborators and share button — old: designer.browser.dev.js:139977 (module 1541)
- [ ] UI-TOOLBAR-010 Share button gShareButton: `button.share-button.g-highlight-button.highlighted` > `span.icon` (private/public share while sharing) + `span.label` "Share"/"Shared"; owners only — old: designer.browser.dev.js:172367 (module 1719)
- [ ] UI-TOOLBAR-011 Unshare button gUnshareButton: `.unshare-button.g-highlight-button.highlighted` "Unshare with me" — old: designer.browser.dev.js:172437 (module 1720)
- [ ] UI-TOOLBAR-012 Realtime collaborators gCollaborators: `.g-collaborators > .g-collaborators-container`, online/offline (`.g-collaborator.offline`), up to 4 `.g-collaborator[data-title]` avatars then `.plus` overflow of `.g-collaborator-row` (cloud only) — old: designer.browser.dev.js:96353 (module 1292)
- [ ] UI-TOOLBAR-013 Menu button plugin gMenuButton: `.g-menu-button`; options menu/factory, defaultAction (opens after 250 ms hold), dblclick (500 ms), touch, reference; `.g-active` while open — old: designer.browser.dev.js:172512 (module 1721)
- [ ] UI-TOOLBAR-014 Simple UI (view/comment-only sharing): `#toolbar.g-simple-ui`, page button at the front of the view section, select section and comment toggle section — old: designer.browser.dev.js:140042 (module 1541)
- [ ] UI-TOOLBAR-015 Page button gPageButton: `.g-page-button`; desktop `.container` (gravit-icon-pages, `.caption` active page, gravit-icon-down); touch `.action-button` + dropdown. Menu `g-page-menu` lists visible pages; follows active-page changes — old: designer.browser.dev.js:174722 (module 1735)

### File tabs

- [ ] UI-TABS-001 Tabs strip: `#header .section.windows > .tabs` (24px, 11px font, right-aligned), hidden unless isDocumentTabManagementEnabled — old: designer.browser.dev.js:128550 (module 1500)
- [ ] UI-TABS-002 Tab `div.tab` (`.g-active` for active window): `.title > span.cover` (title with extension, "*" when modified) + hidden `input[type=text]`, then `span.close` "✕" (not for guests). Click activates, close removes, right-click opens the tab menu (`.context-pane-opened`) — old: designer.browser.dev.js:128663 (module 1500)
- [ ] UI-TABS-003 Tab cloud/sync indicators: `span.header-cloud` (googledrive/sharepoint/onedrivebusiness/cloud icon, `.animated` while syncing), `span.sync-status` "Synchronizing..." / "Failed to synch" — old: designer.browser.dev.js:128789 (module 1500)
- [ ] UI-TABS-004 Tab context menu: Rename (inline input, Enter/blur commits, cloud collision check), Save, Save As, Share, Open shared file, Version history (pro), Advanced export (pro), Duplicate ("(n+1)" suffix), Close other files (confirm), Close all (confirm text.close-all-tabs-confirmation) — old: designer.browser.dev.js:128096 (module 1500)
- [ ] UI-TABS-005 Tab reorder and files-list dropdown (ALLOW_REARRANGE_TABS): jQuery UI sortable on .tabs (axis x, revert 150). `.more-button > .more-symbol + .moreTab` toggle (`.active`) listing clones of every tab with `span.select` (`.more-tab-icon` on active), max-height body-50. The active tab is scrolled into view — old: designer.browser.dev.js:134169 (module 1517)
- [ ] UI-TABS-006 Tab title rules: document title + ":<index>" for 2nd and later windows of a document; getTitleWithExtension appends ".<ext>"; updates on Modified, StorageItemUpdated, AutoSaveSynchronized — old: designer.browser.dev.js:129091 (module 1503)

### Welcome screen

- [ ] UI-WELCOME-001 Welcome entry flow: at boot with no open-file request, show the welcome dialog if setting show_welcome_screen is not false, else create an infinite document. Reopens when the last document is removed; closing it creates an infinite document; without freemium access creates a custom-size document — old: designer.browser.dev.js:120231 (module 1483)
- [ ] UI-WELCOME-002 GNewDocumentDialog (gDialog `g-new-document-dialog`, alwaysCloseable, closeTimeout 0): `.sidebar` (`.sidebar-options`, `.footer`, `.version`) + `.frame` with presets. Enter creates a custom-size document. open({closable, cb, defaultOption, closeCallback}) — old: designer.browser.dev.js:142965 (module 1544)
- [ ] UI-WELCOME-003 Sidebar options `.option.<cls>` (`.option-icon`, `.option-text > .option-title + .option-subtitle`, `.option-separator`): start-option "New Design", local-option "Open from Computer", recent-option "Open Recent". Templates/cloud options are styled but never created — old: designer.browser.dev.js:143021 (module 1544)
- [ ] UI-WELCOME-004 Recent files overlay: gOverlay `g-recent-documents` > `.menu` of `.item.file` (`.icon`, `.name` "name.ext") or "No Recent Files" — old: designer.browser.dev.js:143092 (module 1544)
- [ ] UI-WELCOME-005 "Don't show anymore at startup" checkbox in `.footer-section`, writes show_welcome_screen = !checked — old: designer.browser.dev.js:143030 (module 1544)
- [ ] UI-WELCOME-006 Sidebar footer links `.links-container > .links-column > .link` "Tutorials" (YouTube playlist), "User guide" (/docs/index.html) via gContainer.openExternalLink — old: designer.browser.dev.js:143409 (module 1544)
- [ ] UI-WELCOME-007 Version widget `.version`: "Version <friendly>[ LTS| Staging][ runtime]"; on non-production clicks cycle internal version, build number, commit. This is the only "about" info in the app — old: designer.browser.dev.js:143217 (module 1544)
- [ ] UI-WELCOME-008 Spectator mode styling (`.on-spectator-mode`, readonly inputs, `.select-overlay`): dead code, _isSpectatorMode returns false — old: designer.browser.dev.js:143299 (module 1544)
- [ ] UI-WELCOME-009 Cloud templates panel `.g-templates-panel` in gDialog `g-templates-panel-container`: breadcrumbs, close, masonry `.column`s (235px, 32px gap) of `.asset-container.category-container|preset-container`, load more; gApi.listMarketV2 sorted -usages. Imported but never opened — old: designer.browser.dev.js:148175 (module 1558)

### New document

- [ ] UI-NEWDOC-001 Presets grid: `.presets-container > .header` (custom size row) + `.presets-frame > .presets`; each category `.preset` with `p.title`, `.icon` (assets/img/new-document/<icon>-white.svg and -black.svg `.hover`), `.select-container > p.name` (subTitle) — old: designer.browser.dev.js:143437 (module 1544)
- [ ] UI-NEWDOC-002 Preset size dropdown: gOverlay `preset-select` (offsetY 10) `ul > li[data-value]` "Name (WxH unit)"; picking creates the document immediately — old: designer.browser.dev.js:143702 (module 1544)
- [ ] UI-NEWDOC-003 Custom size row `.preset.custom-size`: `.g-input > .input-holder` with width/height gInputBox (min 0, step 1, empty allowed) separated by img.versus, `select[name=unit]` gUnit short (default px), `button.cloud-button.active` "Create!", `p.infinite-canvas` "Leave it empty for infinite canvas" (empty = 0 = infinite) — old: designer.browser.dev.js:143487 (module 1544)
- [ ] UI-NEWDOC-004 Document creation: createScene with ut = unit, dpi = preset dpi or 72; active page bck white, w/h converted to points — old: designer.browser.dev.js:143662 (module 1544)
- [ ] UI-NEWDOC-005 Preset table API: TYPE ids preset-uiux/social/print/presentation/web/video; getPresets(force) caches; category {id, name, subTitle, icon, default index, layouts[{id, name, unit, width, height, dpi?}]}. Also used by the page size select in the inspector; filtered there by scene unit. Names are hard-coded English — old: designer.browser.dev.js:71429 (module 1153)
- [ ] UI-NEWDOC-006 UI/UX Design "App & device screens" (default 0, px): iPhone 16 Pro 393×852, iPhone 16 Pro Max 430×932, iPhone SE 375×667, Samsung Galaxy S24 360×780, Google Pixel 9 412×892, iPad Pro 11" 834×1194, iPad Pro 13" 1024×1366, iPad Air 820×1180, Android Tablet 800×1280, Apple Watch Ultra 410×502, Apple Watch 45mm 396×484, Desktop HD 1920×1080, Desktop 1440×900, MacBook Pro 14" 1512×982, Surface Pro 1368×912 — old: designer.browser.dev.js:71450 (module 1153)
- [ ] UI-NEWDOC-007 Social Media "Posts, stories & covers" (px): Instagram Post 1080×1080, Instagram Story / Reel 1080×1920, Instagram Landscape 1080×566, Instagram Portrait 1080×1350, TikTok Video 1080×1920, YouTube Thumbnail 1280×720, YouTube Channel Art 2560×1440, Facebook Post 1200×630, Facebook Cover 820×312, Facebook Story 1080×1920, X (Twitter) Post 1600×900, X (Twitter) Header 1500×500, LinkedIn Post 1200×1200, LinkedIn Cover 1584×396, Pinterest Pin 1000×1500, Threads Post 1080×1080, Dribbble Shot 1600×1200 — old: designer.browser.dev.js:71581 (module 1153)
- [ ] UI-NEWDOC-008 Print "Paper & physical media" (default 4, all 300 dpi): A3 297×420 mm, A4 210×297 mm, A5 148×210 mm, US Letter 8.5×11 in, US Legal 8.5×14 in, Tabloid (11x17) 11×17 in, Business Card 85×55 mm, Postcard (4x6) 6×4 in, Poster (18x24) 18×24 in, Poster (24x36) 24×36 in, Flyer (5x7) 5×7 in, Brochure Tri-fold 11×8.5 in — old: designer.browser.dev.js:71727 (module 1153)
- [ ] UI-NEWDOC-009 Presentation "Slides & decks" (default 0): Widescreen (16:9) 1920×1080 px, Standard (4:3) 1024×768 px, Widescreen (16:10) 1920×1200 px, Google Slides 1920×1080 px, Keynote 1920×1080 px, PowerPoint 13.333×7.5 in @96 dpi, Pitch Deck 1280×720 px, A4 Landscape 297×210 mm @150 dpi — old: designer.browser.dev.js:71846 (module 1153)
- [ ] UI-NEWDOC-010 Web "Websites & banners" (px): Desktop HD (1920) 1920×1080, Desktop (1440) 1440×900, Laptop (1366) 1366×768, Small Desktop (1280) 1280×800, Full Page (1440) 1440×3072, Landing Page 1440×2560, Hero Banner 1920×600, Leaderboard Ad 728×90, Medium Rectangle Ad 300×250, Email Header 600×200, Favicon 512×512, Open Graph Image 1200×630 — old: designer.browser.dev.js:71923 (module 1153)
- [ ] UI-NEWDOC-011 Video / Motion "Video & animation frames" (px): Full HD (1080p) 1920×1080, 4K UHD 3840×2160, HD (720p) 1280×720, 2K (1440p) 2560×1440, Vertical Video (9:16) 1080×1920, Square Video (1:1) 1080×1080, YouTube Thumbnail 1280×720, YouTube End Screen 1920×1080, Twitch Overlay 1920×1080, Cinemascope (2.39:1) 2560×1072 — old: designer.browser.dev.js:72029 (module 1153)

### Sidebars

- [ ] UI-SIDEBAR-001 Sidebar ids: inspector, annotations, outline (symbols and library have their own ids) — old: designer.browser.dev.js:9175 (module 198)
- [ ] UI-SIDEBAR-002 GSidebar base: getOrientation, getMinimumWidth, getDefaultWidth, getSettingWidth ("sidebars_width_<id>"), isResizeable=false, isDeactivatable=true, init/activate/deactivate/relayout/resize, isToolAllowed, getTouchTools, updateBadge. Registered: inspector (right, 300, fixed), annotations (right, 300 / 376 touch, HAS_ANNOTATIONS only), outline (left, 250, resizable), symbols (left, 250), library (left, 250) — old: designer.browser.dev.js:51877 (module 806)
- [ ] UI-SIDEBAR-003 Comments sidebar GAnnotationsSidebar (right, cloud-only): annotations-toolbar with options overlay `g-annotation-sidebar-option-overlay` (show resolved, resolve all, notification settings), annotation panel list, offline overlay, save-file tip, hover notifications; comment tree gannotationpanel and @mentions input (`mentions-input-box`, `mentions-autocomplete-list`) — old: designer.browser.dev.js:24930 (module 567; also 1712/1713/1716)
- [ ] UI-SIDEBAR-004 GAnnotations page list (cloud-only): `.annotation-panel-label` "Page", `.annotations-container`, comment-count `g-badge.unread` — old: designer.browser.dev.js:137650 (module 1535)
- [ ] UI-SIDEBAR-005 Review docker (cloud-only, `.g-annotation-review-docker`): status, history actions, `g-file-status-selector` items, footer actions — old: designer.browser.dev.js:138727 (module 1537)
- [ ] UI-SIDEBAR-006 Toolbar shadow plugin gToolbarShadow: in touch mode, scrolling a list sets the toolbar box-shadow "0 <min(scrollTop,20)>px 20px -5px #DFDFDF" (light) / #2E2E2E (dark) — old: designer.browser.dev.js:174922 (module 1737)

### Layers

- [ ] UI-LAYERS-001 Outline sidebar shell GOutlineSidebar (id "outline", left, resizable, min/default 250): Pages section, resizable divider `#page-layer-divider` (page container height clamped 50..sidebar height-150, `.page-container-resizing`), Layers section, then the Export section (GExportProperties). Section headers are gAccordion. Touch adds touch tools pages/layers and row height 48 instead of 34 — old: designer.browser.dev.js:81704 (module 1260)
- [ ] UI-LAYERS-002 Layers toolbar `.toolbar.layer-toolbar`: "Layers" label, delete (gravit-icon-trash: deletes selection; if the active layer is then empty it deletes the layer too, else the active layer), new layer (gravit-icon-addlayer), both with rich tooltips. Toolbar is also a drop target. Gets `pattern-choose-actived` (sic) while a layer-colour chooser is open — old: designer.browser.dev.js:82106 (module 1260)
- [ ] UI-LAYERS-003 Insert layer: GLayer "Layer N" (N = scene layer count), inserted above the top-most selected item (or into the active page), made active, and the current selection is moved into it. One undo step "insert-layer" — old: designer.browser.dev.js:82627 (module 1260)
- [ ] UI-LAYERS-004 Layers container `.layers-container > .layers` (gToolbarShadow): click on empty space clears selection and active layer; Alt+click there runs Fit All; mouseenter/leave toggles setBlockHighlight — old: designer.browser.dev.js:82196 (module 1260)
- [ ] UI-LAYERS-005 Layer tree widget gLayerPanel (`.g-layer-panel`) on GVirtualTree: nodeStyle "layer-row", expand "layer-arrow gravit-icon-right", collapse "layer-arrow gravit-icon-down", insertInto "g-drop", separators g-up-separator-span1/2 and g-down-separator-span1/2, indent 15, row 21 — old: designer.browser.dev.js:168669 (module 1706)
- [ ] UI-LAYERS-006 Layer row content: `span.layer-title-group` > `span.layer-icon` + `span.layer-title` (name, else translated type name). Row classes g-active, g-selected, g-has-selection, g-symbol-row, layer-hidden, g-highlighted-row. Pro badge when the element has _pro. Hover sets the node's Highlighted flag (canvas highlight) — old: designer.browser.dev.js:107361 (module 1351)
- [ ] UI-LAYERS-007 Per-type layer icons: layer folderopen/folderclose, slice, group, pathgraph3, textbox (+ `.layer-icon-overlay` for fake text), picture, ellipse, rectangle, pen, polygon, merge-union, symbol master/instance/detached; compound children show union/intersect/subtract/difference by "bool". Inline 16×16 SVGs, "-small" in touch. No thumbnails — old: designer.browser.dev.js:107449 (module 1351)
- [ ] UI-LAYERS-008 Lock toggle `span.layer-action.layer-lock` (lock/unlock, g-active when locked): cycles none ↔ Full ("lkt"), stays locked if program-locked "plkt"; Alt+click applies to siblings; locking deselects the subtree; disabled inside a partially locked parent — old: designer.browser.dev.js:168862 (module 1706)
- [ ] UI-LAYERS-009 Visibility toggle `span.layer-action.layer-visibility` (display/hide, g-active when hidden): flips "vis"; Alt+click applies to siblings; inherited hidden parent marks the row layer-hidden — old: designer.browser.dev.js:168294 (module 1706)
- [ ] UI-LAYERS-010 Outline-mode toggle (GLayer rows only) `span.layer-action.layer-outline` (ellipse on / circle off): flips layer "otl" — old: designer.browser.dev.js:168333 (module 1706)
- [ ] UI-LAYERS-011 Layer colour swatch (GLayer rows only) `span.layer-color` with gPatternChooser {types:[GColor], hasOpacity:false, simplified:true}: sets "cls" and children that had the same colour — old: designer.browser.dev.js:168379 (module 1706)
- [ ] UI-LAYERS-012 Symbol reset button `span.layer-action.layer-synchronize` (gravit-icon-refresh), only when an instance is out of sync with its master — old: designer.browser.dev.js:168240 (module 1706)
- [ ] UI-LAYERS-013 Inline rename: dblclick on the title group opens gAutoEdit; Enter/blur submit, Esc cancels, Tab/Shift+Tab submit and rename the next/previous element; empty names ignored; not when locked; undo "rename-layer" — old: designer.browser.dev.js:168218 (module 1706)
- [ ] UI-LAYERS-014 Row click selection: click selects only that row (and the active page); Cmd/Ctrl toggles; Shift selects the range within the same parent; clicking the only selected row clears; Alt+click zooms to selection / fits all — old: designer.browser.dev.js:82795 (module 1260)
- [ ] UI-LAYERS-015 Auto-expand on canvas selection (setting auto_expand_layers): expands ancestors and scrolls into view. Expanded state is GNode.Flag.Expanded, saved in the document — old: designer.browser.dev.js:168598 (module 1706)
- [ ] UI-LAYERS-016 Drag reorder: title group draggable (data-drag-mode PRESS_AND_HOLD, not for partially locked). Title shows comma-joined dragged names; drop above/below/into via separator classes and g-drop. canDrop refuses locked targets, invalid insertions and (free users) symbol instances. Alt-drag duplicates; dropping into a compound shape copies its style. Undo "move-layer" — old: designer.browser.dev.js:82662 (module 1260)
- [ ] UI-LAYERS-017 GVirtualTree core (`.g-virtual-tree`, rows "vrow"): recycled rows (data-clean), drag classes g-drag-vrow, g-drag-mouse, g-dragging, g-drag, g-no-drop, root drop zone after the last row, auto-scroll near edges — old: designer.browser.dev.js:19814 (module 451)
- [ ] UI-LAYERS-018 GVirtualList (`.g-virtual-list` with `.vscroller` spacer): flat virtualised list of `.vrow` — old: designer.browser.dev.js:169018 (module 1709)
- [ ] UI-LAYERS-019 Layer/canvas context menu: right-click selects the row if needed, then opens the canvas context menu (context LayerPanel): Edit element; Paste submenu; Arrange; Align/distribute; Transform; Group, Merge, Split, Mask with shape; Convert to path, Vectorize border, Join/Split path; symbol items; Attach/Detach from path; Select same (…); Select (elements under cursor). Crop mode shows Crop/Cancel crop. No rename/delete entries — old: designer.browser.dev.js:100640 (module 1303)
- [ ] UI-LAYERS-020 "Select" elements-under-cursor overlay gSelectedPanel (`.g-selected-panel` in gOverlay `selected-menu-overlay`): tree of hit elements, selected-row/selected-arrow, "temp-N" groups; click replaces the selection — old: designer.browser.dev.js:169340 (module 1711)
- [ ] UI-LAYERS-021 Layers search/filter: does not exist (nothing to port) — old: designer.browser.dev.js:82196 (module 1260)

### Pages

- [ ] UI-PAGES-001 Pages toolbar `.toolbar.page-toolbar` (accordion): "Pages" label; multi-page switch (`.g-switch`, `input#toogle-page-mode-checkbox[data-property=multipage-switch]`; touch: `.toogle-page-mode` gCheckboxSlider); settings `.setting-menu-options` (opens page menu); delete active page; new page (gravit-icon-addpage). All with rich tooltips — old: designer.browser.dev.js:81791 (module 1260)
- [ ] UI-PAGES-002 Multi-page mode: toggles view multiPageView + pageLabelsVisible, recentres. Stored in gContainer "OutlineSidebar/Multipage_Mode". Forced off with alert text.multipage-alert if any page is infinite — old: designer.browser.dev.js:82436 (module 1260)
- [ ] UI-PAGES-003 Insert/delete page: scene.insertPage(), activate and navigate (undo "insert-page"); delete blocked by NoDelete lock; master page with slaves asks text.confirm-delete-masterpage; undo "delete-page" — old: designer.browser.dev.js:82464 (module 1260)
- [ ] UI-PAGES-004 Page tree widget gPagePanel (`.g-page-panel`, rows `.page-row`, row 34 / 48 touch), active row g-active, container `.pages-container > .pages` — old: designer.browser.dev.js:171865 (module 1717)
- [ ] UI-PAGES-005 Page row: `span.page-title-group > span.page-icon` (gravit-icon-page / page-infinity / page-master) + `span.page-title`; g-active, g-highlighted-row, hidden style "page-hiden" (sic) — old: designer.browser.dev.js:171563 (module 1717)
- [ ] UI-PAGES-006 Page lock toggle `span.page-action.page-lock` ("lkt" Full/none; a locked active page sets scene "edit" false) — old: designer.browser.dev.js:171641 (module 1717)
- [ ] UI-PAGES-007 Page visibility toggle `span.page-action.page-visibility` — old: designer.browser.dev.js:171691 (module 1717)
- [ ] UI-PAGES-008 Page rename: dblclick gAutoEdit on `.page-title`, undo "GPagePanel action.rename-page" — old: designer.browser.dev.js:171623 (module 1717)
- [ ] UI-PAGES-009 Page drag reorder (PRESS_AND_HOLD, g-dragging, undo "move-page") — old: designer.browser.dev.js:171573 (module 1717)
- [ ] UI-PAGES-010 Page click: activates (non-undoable change-active-page) and navigates — old: designer.browser.dev.js:82596 (module 1260)
- [ ] UI-PAGES-011 Page context menu GMenu `g-page-option-menu` (row right-click or settings button): Duplicate, Delete (master confirm), Copy, Export (file.export with that page) — old: designer.browser.dev.js:100969 (module 1303)

### Library and symbols

- [ ] UI-LIBRARY-001 Library sidebar GLibrarySidebar (id "library", left, 250, resizable): enabled only online; `library-container` with `.overlay .box` and `.offline`/`unavailable` + `span-unavailable` "text.connect"; rebuilds on networkAvailable; touch toolbar `library-toolbar g-touch-only` — old: designer.browser.dev.js:161826 (module 1662)
- [ ] UI-LIBRARY-002 Library panel root `g-library-panel`: search box then category grid — old: designer.browser.dev.js:161967 (module 1663)
- [ ] UI-LIBRARY-003 Library search `library-search` (g-input "Search…"): Enter searches; icon toggles search/close; listMarket {q, path "element.", limit 90, sort name} plus paged Unsplash search into `.assets .assets-wrapper.images` — old: designer.browser.dev.js:162443 (module 1663)
- [ ] UI-LIBRARY-004 Category grid `category-row` (3 per row): `.category > .content` (img.icon from CDN, span.title). Shared `.assets` panel under each row (classes first/second/third for column). Categories from ELEMENTS JSON: Shapes, Illustrations, Icons, Emojis, Stickers, Frames, Lines, Unsplash Photos (dropped when ENABLE_UNSPLASH_INTEGRATION false) — old: designer.browser.dev.js:162545 (module 1663); data chunk.vendor.js:110537
- [ ] UI-LIBRARY-005 Subcategory selector `select.selector` in `selector-container`: "All" then children (GCommonNames element.child.name.<slug>); full-width for photos — old: designer.browser.dev.js:162027 (module 1663)
- [ ] UI-LIBRARY-006 Asset tiles `asset-container[data-title] > img.asset`; photos in a masonry (columns max(2, ceil(width/200)), 4px gap, relayout on >50px width change, debounced 200ms) as `image-asset` with photographer link (utm_medium=referral) — old: designer.browser.dev.js:162119 (module 1663)
- [ ] UI-LIBRARY-007 Load more `.load-more` (pages of 90) and back-to-top `library-scroll-top` (after 50px scroll) — old: designer.browser.dev.js:162521 (module 1663)
- [ ] UI-LIBRARY-008 Asset drag to canvas: custom mouse/touch drag with floating preview scaled by zoom; drop inserts at point; click (<200ms) inserts at default position; width canvas/3 capped 300; lines 0.4×page width — old: designer.browser.dev.js:162733 (module 1663)
- [ ] UI-LIBRARY-009 Asset insert behaviours: inline SVG → placeOrImport; element.ui.* fetched and imported; Lines → rectangle with repeating texture fill; Unsplash photo → new GImage, or with Alt clipped into selection, or Cover texture fill on selection; too large → text.image-too-big — old: designer.browser.dev.js:162199 (module 1663)
- [ ] UI-LIBRARY-010 Symbols sidebar GSymbolsSidebar (id "symbols", left, 250, resizable): toolbar `symbols-toolbar` with "Symbols", delete and create-symbol (g-disabled unless GCreateSymbolAction can run); `symbols-container > .symbols`; click on empty space deselects masters — old: designer.browser.dev.js:161526 (module 1661)
- [ ] UI-LIBRARY-011 Symbol interactions: click a master → switch to its page, select, focus; dblclick → select master and all instances; delete removes the highlighted symbol (undo "action.delete-symbol") — old: designer.browser.dev.js:161757 (module 1661)
- [ ] UI-LIBRARY-012 Symbols list gSymbolsPanel `g-symbols-panel`: `div#symbol_<multireferenceId>` with draggable `span.symbol-title-group` (45% wide, 95px tall, #eee) and `span.symbol-image` thumbnail fitted in 85px; g-highlighted synced from Selected flag; dragstart sets GNode MIME data. No rename, no context menu, no reorder — old: designer.browser.dev.js:172027 (module 1718)
- [ ] UI-LIBRARY-013 Symbols empty state `symbol-panel-info` with "common.nosymbolsdefined" — old: designer.browser.dev.js:172228 (module 1718)
- [ ] UI-LIBRARY-014 Direct-link template/preset open handler (no UI): opens a shared item as template or preset, or builds a scene from presetLayout — old: designer.browser.dev.js:80928 (module 1255)

### Inspector panels

- [ ] UI-INSPECT-001 GInspectorSidebar: right sidebar id "inspector" (`.sidebar-container.sidebar-inspector`), title GInspectorSidebar.title, default/min width 300, not resizable, hidden when inspect is off and a doc is active, enabled only with an active document. Children `.panels.scrolling-panels` and `.panels.sticky-panels` (sticky if properties.isSticky()) — old: designer.browser.dev.js:55677 (module 864)
- [ ] UI-INSPECT-002 Panel registry/order (gravit.properties): Dimension, Align, Transform, Page, Scene, GroupFrame, Frame, Item, Polygon, Path, Ellipse, Text, Image, Rectangle, Slice, BoolOp, Symbol, Appearance, Fill, Border, Effects. Plugins can append — old: designer.browser.dev.js:120077 (module 1483)
- [ ] UI-INSPECT-003 Panel wrapper DOM: `<hr/>` + `.toolbar` (only if content) + `.properties-panel` (hidden until available). APPEARANCE_PROPERTIES panels go into `.appearance-property-panel` children of one `.properties-panel.appearance-properties-panel` sharing `.toolbar.appearance-toolbar` with `.appearance-toolbar-title` — old: designer.browser.dev.js:55769 (module 864)
- [ ] UI-INSPECT-004 APPEARANCE_PROPERTIES list: Align, Polygon, Path, Ellipse, Text, Image, Rectangle, Slice, BoolOp, Appearance — old: designer.browser.dev.js:55712 (module 864)
- [ ] UI-INSPECT-005 ACCORDIONS: Appearance, Fill, Border, Effects; toolbar gets `appearance-panel-toggle-btn` and gAccordion; accordion button hidden in touch — old: designer.browser.dev.js:55706 (module 864)
- [ ] UI-INSPECT-006 Selection → panels: individual non-annotation elements; empty selection falls back to the active item tool's default style element, else the active page. Each panel isAvailable(transformMode) then update(document, elements); dividers only between groups; `hr.appearance-divider`, `last-toolbar`; collects touch tools — old: designer.browser.dev.js:56033 (module 864)
- [ ] UI-INSPECT-007 Re-sync triggers: tool change, SelectionChanged, page Active flag change with empty selection, StorageItemUpdated, "touch" setting, annotations sidebar activation (touch) — old: designer.browser.dev.js:55953 (module 864)
- [ ] UI-INSPECT-008 Transform mode: GSelectTool EditModeChanged → `_transformMode`. Normal panels hide (isAvailable(m) = !m), Align and Transform show only in it, Dimension always — old: designer.browser.dev.js:56005 (module 864)
- [ ] UI-INSPECT-009 Panel reordering: desktop moves group-frame, frame, item, symbol-instance after the scene panel; touch moves them after the last appearance panel — old: designer.browser.dev.js:56098 (module 864)
- [ ] UI-INSPECT-010 Version history mode: `.panels.history-panel` with `.properties-panel.version-history-panel`; Enable hides all `.panels` and shows history; touch wraps it in gOverlay `g-version-history-panel-overlay` — old: designer.browser.dev.js:55883 (module 864)
- [ ] UI-INSPECT-011 Inspector API: openFill/BorderPatternChooser, openFill/Border/TextColorEyeDropper, setPathPointsNodeType, getTouchTools — old: designer.browser.dev.js:55827 (module 864)
- [ ] UI-INSPECT-012 GProperties base: isGroup true, isSticky false, isAvailable(m) !m, update clears active style list — old: designer.browser.dev.js:5046 (module 123)
- [ ] UI-INSPECT-013 GPanel base and panel class constants fill-properties-panel, border-properties-panel, effect-properties-panel — old: designer.browser.dev.js:27139 (module 606/607)
- [ ] UI-INSPECT-014 GDimensionProperties: `.dimension-panel` (`have-anchor` in touch), title `.transform-titile` (sic). Shown when all selected have Transform and are not pages; available in transform mode too. Touch tools dimension.align (370px) and dimension.dimension (395px) — old: designer.browser.dev.js:96712 (module 1294)
- [ ] UI-INSPECT-015 GAlignProperties: no toolbar, isGroup false, transform mode only, ≥2 transformable non-page elements; lives in the appearance block — old: designer.browser.dev.js:93826 (module 1274)
- [ ] UI-INSPECT-016 GTransformProperties (advanced transform): `.advanced-transform-properties`, toolbar `.advanced-transform-toolbar` with settings button opening `g-overlay-advanced-transform` (180px); transform mode only — old: designer.browser.dev.js:160706 (module 1660)
- [ ] UI-INSPECT-017 GAppearanceProperties: in the appearance block and an accordion; GStylable with Style set; rows `.appearance-opacity-property`, `.appearance-blending-property`, `.appearance-style-property` — old: designer.browser.dev.js:72581 (module 1160)
- [ ] UI-INSPECT-018 GPageProperties: `.page-properties-panel`, toolbar `.filled.page-toolbar.page-properties-toolbar` labelled uppercase "PAGE (<name>|Active|N Pages)"; touch tool "document" (380px); rows `data-property-row="fixed-size"` only for fixed-size pages — old: designer.browser.dev.js:105603 (module 1339)
- [ ] UI-INSPECT-019 GSceneProperties (document settings; there is no separate document settings dialog): `.scene-properties-panel`, toolbar `.scene-properties-toolbar` "Document"; only when the selection is exactly one page (incl. empty fallback) — old: designer.browser.dev.js:159701 (module 1659)
- [ ] UI-INSPECT-020 GGroupFrameProperties `.group-frame-property-panel` (all GGroup) — old: designer.browser.dev.js:158679 (module 1655)
- [ ] UI-INSPECT-021 GFrameProperties `.frame-property-panel` (all GLayer) — old: designer.browser.dev.js:158546 (module 1654)
- [ ] UI-INSPECT-022 GItemProperties `.item-property-panel` (containers whose children are all GItem) — old: designer.browser.dev.js:158837 (module 1656)
- [ ] UI-INSPECT-023 GSymbolProperties (symbol overrides): `.symbol-instance-panel`, toolbar `.filled.page-toolbar.symbol-instance-toolbar` "<name> (Instance of <master>)" or "N Instances" — old: designer.browser.dev.js:159481 (module 1658)
- [ ] UI-INSPECT-024 GSliceProperties `.slice-property-panel` (appearance block, all GSlice) — old: designer.browser.dev.js:90697 (module 1272)
- [ ] UI-INSPECT-025 GExportProperties (export list): sticky, mounted in the left outline sidebar, not the inspector: `.toolbar.toolbar-export.list-toolbar` + `.properties-panel.export-panel` (accordion); all selected GBlocks (empty = active page); label "Make exportable"/"Export"; `.empty-list` — old: designer.browser.dev.js:135969 (module 1523)
- [ ] UI-INSPECT-026 GVersionHistoryProperties: never in the normal list; toolbar `.filled.version-history-toolbar` (pro title, close gravit-icon-detach); `.version-history-panel-loading.g-loading`, sections manual save and auto save (AUTO_SAVE_ENABLED) — old: designer.browser.dev.js:136654 (module 1528)
- [ ] UI-INSPECT-027 Version history touch overlay mixin (gOverlay `g-version-history-panel-overlay`) — old: designer.browser.dev.js:137283 (module 1529)
- [ ] UI-INSPECT-028 Fill panel GFillPaintLayerProperties: `fill-properties-panel`, toolbar `list-toolbar fill-toolbar`: completely-fill (`fill completely-fill g-active`, evenodd=false), winding-fill (evenodd=true), settings (advanced overlay), remove, add (black, converted to scene color mode). Hover shows `copy-info-overlay` "text.copy-fill". Touch tool "fill" 368px — old: designer.browser.dev.js:83001 (module 1261)
- [ ] UI-INSPECT-029 Border panel GBorderPaintLayerProperties: `border-properties-panel`, toolbar `list-toolbar border-toolbar` (settings/remove/add); advanced overlay parent gets `border-settings`. Add = black with alignment text→Outside, arc→Center, closed shapes→Inside, open path→Center — old: designer.browser.dev.js:73095 (module 1162)
- [ ] UI-INSPECT-030 Effects panel GEffectProperties: `effects-properties-panel`, toolbar `list-toolbar effects-toolbar` with add opening GEffectsPanel. Empty list shows quick-add row `effects-default` (DropShadow, InnerShadow, Blur, ColorAdjust + "text.more"). Singleton effects only once — old: designer.browser.dev.js:84241 (module 1262)
- [ ] UI-INSPECT-031 Text panel GTextProperties: `text-properties-panel`; sections color-font, font-style-properties, decoration-properties, alignment-properties, vertical-properties, spacing-properties, sizing-properties, script row, auto-scale-font, text on path; advanced-settings overlay (typography, transform, lists, paragraph, language, stylistic set) — old: designer.browser.dev.js:91097 (module 1273)
- [ ] UI-INSPECT-032 Rectangle panel GRectangleProperties: "Corner" row with `corners-radius` slider (0-100 % of max) + `corner-radius` box + advanced button (`g-advanced-setting`) opening `advanced-panel-wrapper rectangle-properties` — old: designer.browser.dev.js:90340 (module 1271)
- [ ] UI-INSPECT-033 Polygon/star panel GPolygonProperties: Points, Size, Corner rows; advanced overlay with corner type, plain edges, autoscale, corners/radius/angles outside & inside — old: designer.browser.dev.js:89468 (module 1270)
- [ ] UI-INSPECT-034 Ellipse panel GEllipseProperties: `ellipse-angles-property` and `ellipse-shape-property` rows — old: designer.browser.dev.js:87399 (module 1265)
- [ ] UI-INSPECT-035 Path panel GPathProperties: path row (closed, autoscale corners) and point rows `position-row`, `joint-row`, corner chooser/radius — old: designer.browser.dev.js:88626 (module 1269)
- [ ] UI-INSPECT-036 Image panel GImageProperties: `g-image-convert-status` (profile check) and `image-button-row`: replace, original size, crop toggle, extract colors (up to 8) — old: designer.browser.dev.js:87568 (module 1266)
- [ ] UI-INSPECT-037 Boolean/compound panel GBoolOpProperties: `compound-row` with four `compound-chooser-btn[data-op]` OR/SUB/AND/XOR, writes "bool" (default OR) — old: designer.browser.dev.js:87179 (module 1264); engine: chunk.vendor.js:10836

### Fields and form widgets

- [ ] UI-FIELD-001 Dimension x / y: unit boxes with gInputLabel x/y, `data-dimension="x|y"`, row label "Position", columns 44/12/44%. Union bbox of selection in scene units, optimal decimals; writes a Move transaction — old: designer.browser.dev.js:97137 (module 1294)
- [ ] UI-FIELD-002 Dimension w / h: unit boxes min 0, `data-dimension="w|h"`, row "Size", transaction change-size — old: designer.browser.dev.js:97149 (module 1294)
- [ ] UI-FIELD-003 Keep-ratio toggle: gravit-icon-linked/unlinked, `data-ratio`, from GEditorOptions.preserveAspectRatio; persisted to gContainer "designer.settings.dimension.preserveratio" — old: designer.browser.dev.js:96731 (module 1294)
- [ ] UI-FIELD-004 Rotation: unit box postfix "°", label "R", `data-dimension="rotate"`, 1 decimal — old: designer.browser.dev.js:97171 (module 1294)
- [ ] UI-FIELD-005 "Transform" button `button.transform-button`: toggles select/transform edit mode, g-active in transform mode; touch label "Close" — old: designer.browser.dev.js:97160 (module 1294)
- [ ] UI-FIELD-006 Anchors horizontal `.anchor-panel` / `.anchor-buttons`: hacr-start/middle/end buttons; writes hacr (Start 1, Middle 2, End 3, Stretch 4 = start+end, default null); only when the parent has Layout — old: designer.browser.dev.js:97191 (module 1294)
- [ ] UI-FIELD-007 Anchors vertical: vacr-start/middle/end, writes vacr (engine default null chunk.vendor.js:116565) — old: designer.browser.dev.js:97350 (module 1294)
- [ ] UI-FIELD-008 Align/distribute toolbar `.main-toolbar` ("Align"): `.svg-button[data-action]` distribute H/V, align left/center/right, top/middle/bottom; desktop `.normal` and touch icons; disabled when the action can't run — old: designer.browser.dev.js:96889 (module 1294)
- [ ] UI-FIELD-009 Touch distribute spacing `.HorizontalInput`/`.VerticalInput` gInputSelect ["Auto","0",1,10,20,30,50,100], default Auto — old: designer.browser.dev.js:96873 (module 1294)
- [ ] UI-FIELD-010 Align settings overlay `.align-settings` → `.settingBox` rows: Same height, Same width, Full unit, Half unit — old: designer.browser.dev.js:96916 (module 1294)
- [ ] UI-FIELD-011 Align same-size buttons (align-justify-horizontal/vertical) — old: designer.browser.dev.js:93855 (module 1274)
- [ ] UI-FIELD-012 Align spacing X / Y: unit boxes min 1, default 1, `data-dist`; Enter runs distribute with that spacing — old: designer.browser.dev.js:93870 (module 1274)
- [ ] UI-FIELD-013 Transform overlay checkboxes: Autoscale borders (`_bs`, default checked → scene.setBorderScale) and Autoscale corners (`esc`, default checked) — old: designer.browser.dev.js:160725 (module 1660)
- [ ] UI-FIELD-014 Transform move x / y (default 0, `move-x|move-y`); quirk: negative values reset to 0 on decimals change — old: designer.browser.dev.js:160943 (module 1660)
- [ ] UI-FIELD-015 Transform scale w / h (postfix %, default 100) with `.transform-scale-link` link toggle (default unlinked) — old: designer.browser.dev.js:160981 (module 1660)
- [ ] UI-FIELD-016 Transform rotate / reflect (postfix °, default 0; reflect = mirror-axis angle) — old: designer.browser.dev.js:161085 (module 1660)
- [ ] UI-FIELD-017 Transform skew X / Y (postfix °, default 0) — old: designer.browser.dev.js:161129 (module 1660)
- [ ] UI-FIELD-018 Transform copies + origin + apply (`.copies-apply`): copies (int, default 0), gPivot (default center), "Apply" creates N cumulative copies — old: designer.browser.dev.js:161170 (module 1660)
- [ ] UI-FIELD-019 Transform touch layout `.copies-apply-touch` (`.left` copies + apply, `.right` pivot) — old: designer.browser.dev.js:161223 (module 1660)
- [ ] UI-FIELD-020 Appearance opacity: gInputSlider (`data-property="_stop"`, 0-100, cssClass opacity) + box (0-100 %, step getOpacityIncrement, equations); `_stop` = v/100, default 1; live preview while dragging — old: designer.browser.dev.js:72624 (module 1160)
- [ ] UI-FIELD-021 Appearance blending `select[data-property="_sbl"]`: gBlendMode + optgroup "Masking" (m Mask, !m Inverse mask); default normal — old: designer.browser.dev.js:72513 (module 1160)
- [ ] UI-FIELD-022 Appearance fill-rule select `evenodd` built but never mounted (do not port here; the fill panel has its own) — old: designer.browser.dev.js:72585 (module 1160)
- [ ] UI-FIELD-023 Page canvas row (`.canvas-properties-normal`, 4×25%): Color `bck` gPatternChooser (GColor/GGradient/GTexturePattern for fixed size, else color), Width, Height, Opacity `bop` — old: designer.browser.dev.js:105520 (module 1339)
- [ ] UI-FIELD-024 Page w / h: empty or 0 sets both to 0 (infinite); negatives rejected; defaults 800×600 (engine chunk.vendor.js:22629) — old: designer.browser.dev.js:105153 (module 1339)
- [ ] UI-FIELD-025 Page background opacity `bop` 0-100 %, default 1; unset bck becomes white with bop 0 — old: designer.browser.dev.js:105309 (module 1339)
- [ ] UI-FIELD-026 Page size preset `select[data-property="preset-size"]`: Custom group (@infinite), then preset categories (NEWDOC tables) filtered to the scene unit; value "WxHxDPI"; shows @custom when no match; @trim — old: designer.browser.dev.js:106035 (module 1339)
- [ ] UI-FIELD-027 Page rotate-canvas button (swap w/h) — old: designer.browser.dev.js:105334 (module 1339)
- [ ] UI-FIELD-028 Page trim-canvas button (page.trimToContent) — old: designer.browser.dev.js:105358 (module 1339)
- [ ] UI-FIELD-029 Page clip-content toggle (paint mode Output ↔ Full) — old: designer.browser.dev.js:105375 (module 1339)
- [ ] UI-FIELD-030 Page bleed `bl` (≥0, default 0) — old: designer.browser.dev.js:105197 (module 1339)
- [ ] UI-FIELD-031 Page margins ml/mt/mr/mb (≥0, default 0) + equal-margins lock (`data-lock-margin` default yes) — old: designer.browser.dev.js:105647 (module 1339)
- [ ] UI-FIELD-032 Page master page `select[data-property="master-page"]` (pro): empty = unlink, then other pages — old: designer.browser.dev.js:105283 (module 1339)
- [ ] UI-FIELD-033 Scene unit `ut` (px, mm, cm, in, pc, pt; default px) — old: designer.browser.dev.js:159901 (module 1659)
- [ ] UI-FIELD-034 Scene color mode `cm` RGB / HSB (pro) / CMYK (pro); also sets setting color_mode and converts elements — old: designer.browser.dev.js:159862 (module 1659)
- [ ] UI-FIELD-035 Scene DPI gInputSelect [72, 96, 144, 300], min 72, max 300, default 72 — old: designer.browser.dev.js:159711 (module 1659)
- [ ] UI-FIELD-036 Grid mode radios `input.grid-mode-radio` Off / On / Isometric → `gm` null | "box" | "axo" — old: designer.browser.dev.js:160073 (module 1659)
- [ ] UI-FIELD-037 Rectangular grid gx / gy (default 10/10) — old: designer.browser.dev.js:160156 (module 1659)
- [ ] UI-FIELD-038 Isometric grid gaw (default 20), ga1 [0,89]°, ga2 [-89,0]° (stored radians, engine fallback ±30°) — old: designer.browser.dev.js:160179 (module 1659)
- [ ] UI-FIELD-039 Scene cloud sync rows (enable-cloud-sync panel, `cfs` g-switch, last modified date); only when CLOUD_SYNC_FEATURE.NEW_LAYOUT is off, which it is not in this build — old: designer.browser.dev.js:160229 (module 1659)
- [ ] UI-FIELD-040 Group/Frame type select `frm` 0 Group / 1 Frame — old: designer.browser.dev.js:158697 (module 1655)
- [ ] UI-FIELD-041 Layer frame checkbox `frm-checkbox` (default false; gCheckboxSlider in touch) — old: designer.browser.dev.js:158550 (module 1654)
- [ ] UI-FIELD-042 Item click-through `clk` (default false) — old: designer.browser.dev.js:158839 (module 1656)
- [ ] UI-FIELD-043 Item scale-with-content `scc` (default true; shapes only) — old: designer.browser.dev.js:158879 (module 1656)
- [ ] UI-FIELD-044 Symbol choose-instance `select[data-property="symbol-instance"]`: -1 Detach, -2 blank, 1..N symbols, 0 Master; swapping keeps per-pair overrides — old: designer.browser.dev.js:159488 (module 1658)
- [ ] UI-FIELD-045 Slice x / y / w / h (w/h min 1e-10; disabled for multi-select) — old: designer.browser.dev.js:90821 (module 1272)
- [ ] UI-FIELD-046 Slice trim transparent `trm` (default true) — old: designer.browser.dev.js:90769 (module 1272)
- [ ] UI-FIELD-047 Slice background: checkbox + color `cls` (GColor, no opacity; default null) — old: designer.browser.dev.js:90740 (module 1272)
- [ ] UI-FIELD-048 Export toolbar buttons: `#btn-export` "Export..." (hidden when empty), create slice, add — old: designer.browser.dev.js:135981 (module 1523)
- [ ] UI-FIELD-049 Export add defaults {sz, sf, fm:"png"}, first unused of 1x/@1x, 2x/@2x, 3x/@3x, 1.5x/@1,5x, 0.5x/@0,5x; stored in element property `__export` — old: designer.browser.dev.js:136163 (module 1523)
- [ ] UI-FIELD-050 Export row size: free text + dropdown presets 1x, 2x, 0.5x, 3x, 512w, 512h, 128x128, 300dpi (`sz`) — old: designer.browser.dev.js:136288 (module 1523)
- [ ] UI-FIELD-051 Export row suffix `sf` (placeholder None/Multiple) — old: designer.browser.dev.js:136345 (module 1523)
- [ ] UI-FIELD-052 Export row format png / jpg / svg / pdf (`fm`) — old: designer.browser.dev.js:136402 (module 1523)
- [ ] UI-FIELD-053 Export row remove (icon button g-flat gravit-icon-close) — old: designer.browser.dev.js:136432 (module 1523)
- [ ] UI-FIELD-054 Version history item `.version-history-item` (vhi-initial/active/disabled): thumbnail, title, date, settings menu Preview/Restore — old: designer.browser.dev.js:136851 (module 1528)
- [ ] UI-FIELD-055 Version preview overlay `.vhp-preview-overlay` (edit-version, close-preview) — old: designer.browser.dev.js:137143 (module 1528)
- [ ] UI-FIELD-056 Fill rule select (fill advanced overlay) evenodd 0 Non-zero / 1 Even-odd, default false — old: designer.browser.dev.js:83016 (module 1261)
- [ ] UI-FIELD-057 Fill layer row `fill-block g-cursor-hand-open` (drag reorder, `g-drop-indicator`): drag-indicator; 40px gPatternChooser `_pt` (color, linear/radial/angular gradient, background, texture, noise; hasMask); blend `_bl`; opacity `_op`; visibility `_vs`; click selects (`g-selected`) — old: designer.browser.dev.js:83638 (module 1261)
- [ ] UI-FIELD-058 Fill opacity `fill-op` 0-100 %, default 1; touch adds a slider — old: designer.browser.dev.js:83569 (module 1261)
- [ ] UI-FIELD-059 Fill visibility `fill-visibility` (default true) — old: designer.browser.dev.js:83602 (module 1261)
- [ ] UI-FIELD-060 Fill blend `_bl` gBlendMode with rich tooltip, default normal — old: designer.browser.dev.js:83539 (module 1261)
- [ ] UI-FIELD-061 Border layer row `border-block`: color `_pt` (no noise, no mask), width `_bw`, blend, opacity `border-op`, visibility — old: designer.browser.dev.js:74637 (module 1162)
- [ ] UI-FIELD-062 Border width `_bw` gUnitBox min 0, stored pt, default 1 — old: designer.browser.dev.js:74385 (module 1162)
- [ ] UI-FIELD-063 Border position `_ba` I/C/O buttons, default C — old: designer.browser.dev.js:73178 (module 1162)
- [ ] UI-FIELD-064 Border ends `_blc` butt/round/square, default square — old: designer.browser.dev.js:73218 (module 1162)
- [ ] UI-FIELD-065 Border joins `_blj` bevel/miter/round, default miter — old: designer.browser.dev.js:73251 (module 1162)
- [ ] UI-FIELD-066 Miter limit `_bml` >0, only with miter join, default 3 — old: designer.browser.dev.js:73138 (module 1162)
- [ ] UI-FIELD-067 Dash pattern `_bds`: four boxes dash/gap/dash/gap, empty = solid, default null — old: designer.browser.dev.js:73159 (module 1162)
- [ ] UI-FIELD-068 Arrowheads `_bhm`/`_btm`: none, Circle C, Bullet B, Diamond D, Line L, LineDouble LD, Arrow A, ArrowFat AF, ArrowLine AL, ArrowDoubleLine ADL, ArrowLineBar ALB, ArrowPointer AP, custom "#" (paste button) — old: designer.browser.dev.js:73335 (module 1162)
- [ ] UI-FIELD-069 Arrow size `_bhms`/`_btms` min 1 %, default 100% — old: designer.browser.dev.js:73319 (module 1162)
- [ ] UI-FIELD-070 Arrow outline `_bhmo`/`_btmo` g-switch, default false — old: designer.browser.dev.js:73283 (module 1162)
- [ ] UI-FIELD-071 Arrow marker position `_bhmi`/`_btmi` slider 0-100, default 100% — old: designer.browser.dev.js:73299 (module 1162)
- [ ] UI-FIELD-072 Autoscale borders `_bs` checkbox, default false — old: designer.browser.dev.js:73854 (module 1162)
- [ ] UI-FIELD-073 Effect block `effect-block` / `effect-header` (drag reorder, drag out to delete), title, visibility, delete, `effect-layer` "applies to", collapsible `effect-settings > content`; context menu duplicate/move — old: designer.browser.dev.js:84457 (module 1262)
- [ ] UI-FIELD-074 Effect add menu categories: Most used, then Shadow, Blur, Artistic, Adjust, Distortion, Other; hidden/uncategorised excluded — old: designer.browser.dev.js:85086 (module 1262)
- [ ] UI-FIELD-075 Generic WebGL effect settings builder: walks the effect's "shp" params with class RANGES: brightness/contrast/hue/saturation → color slider + box (x100 %, hue ±180°); numbers → slider (step 0.002*range) + box; 3-array → color chooser; dropdown → select; boolean → g-switch. Labels GWebGLEffect.<param>. 31 of 40 effects use this — old: designer.browser.dev.js:85180 (module 1262)
- [ ] UI-FIELD-076 Drop Shadow: x, y (unit), r blur 0-200, opc 0-100 %, pat color; defaults 0, 0, 5, black, 0.65 — old: designer.browser.dev.js:85505 (module 1262); engine: chunk.vendor.js:56317
- [ ] UI-FIELD-077 Inner Shadow: same fields; defaults 0, 0, 5, black, 0.5 — old: designer.browser.dev.js:86821 (module 1262); engine: chunk.vendor.js:70579
- [ ] UI-FIELD-078 Curved Shadow: bend b -60..60, softness s 0..1, radius l 0..50, coverage c 0..1, angle a 0..360, opc, pat; defaults s1 b10 a270 l5 c0.8 opc 0.65 — old: designer.browser.dev.js:85643 (module 1262); engine: chunk.vendor.js:235010
- [ ] UI-FIELD-079 Contact Shadow: offset o, angle a 5-35°, blur r 5-200, opc, pat; defaults r5 a5 o5 opc 0.75 — old: designer.browser.dev.js:85879 (module 1262); engine: chunk.vendor.js:234809
- [ ] UI-FIELD-080 Long Shadow: angle a ±180°, length l ≥0, density den 5-100 %, pat, opc, fade fdm; defaults l60 a-45° opc 0.2 den1 fdm true — old: designer.browser.dev.js:85970 (module 1262); engine: chunk.vendor.js:235207
- [ ] UI-FIELD-081 Blur: radius r 0..50pt (10pt without WebGL) step 0.1, clip b; defaults 5, false — old: designer.browser.dev.js:86186 (module 1262); engine: chunk.vendor.js:46279
- [ ] UI-FIELD-082 Color Overlay: pat (gradient allowed), opc, blend alm; defaults black→transparent gradient, 1, false — old: designer.browser.dev.js:86285 (module 1262); engine: chunk.vendor.js:100590
- [ ] UI-FIELD-083 Color Grading: preset select none + Instagram group (1977, brannan, gotham, hefe, lord-kelvin, nashville, x-pro-ii from assets/data/acv/*.acv) and "Load ACV..." file input; writes cp — old: designer.browser.dev.js:86404 (module 1262); engine: chunk.vendor.js:233943
- [ ] UI-FIELD-084 Mirror: opc 0-100, pad ≥0, rfh 0-100 %; defaults 0.6, 1, 0.3 — old: designer.browser.dev.js:86595 (module 1262); engine: chunk.vendor.js:111136
- [ ] UI-FIELD-085 Color Adjust: brightness, contrast, hue, saturation -1..1, default 0 — old: designer.browser.dev.js:86767 (module 1262); engine: chunk.vendor.js:82585
- [ ] UI-FIELD-086 Recolour: hue 0..1 (0..360°), saturation 0..1; defaults 1, 1 — old: designer.browser.dev.js:86776 (module 1262); engine: chunk.vendor.js:234647
- [ ] UI-FIELD-087 Vignette: size 0..1 (0.2), amount 0..1 (0.5) — old: designer.browser.dev.js:86758 (module 1262); engine: chunk.vendor.js:234381
- [ ] UI-FIELD-088 Bulge/Pinch: centerX/Y 0..100 (50), radius 0..100 (50), strength -1..1 (0.5) — old: designer.browser.dev.js:86830 (module 1262); engine: chunk.vendor.js:233811
- [ ] UI-FIELD-089 Color Halftone: centerX/Y (50), angle 0..π/2 (0), size 3..20 (default 50, outside its range) — old: designer.browser.dev.js:86838 (module 1262); engine: chunk.vendor.js:233876
- [ ] UI-FIELD-090 Dot Screen: centerX/Y (50), angle 0..π/2 (0), size 0..20 (10) — old: designer.browser.dev.js:86846 (module 1262); engine: chunk.vendor.js:100746
- [ ] UI-FIELD-091 Brightness/Contrast (hidden): -1..1, 0 — old: designer.browser.dev.js:86854 (module 1262); engine: chunk.vendor.js:100689
- [ ] UI-FIELD-092 Fisheye: strength -100..100 (50) — old: designer.browser.dev.js:86862 (module 1262); engine: chunk.vendor.js:235412
- [ ] UI-FIELD-093 Bend: strengthX -1..1 (0.5), strengthY -1..1 (0), radius 0..100 (50) — old: designer.browser.dev.js:86870 (module 1262); engine: chunk.vendor.js:235335
- [ ] UI-FIELD-094 Denoise: exponent 0..50 (10) — old: designer.browser.dev.js:86878 (module 1262); engine: chunk.vendor.js:234246
- [ ] UI-FIELD-095 Edge Work: radius 1..200 (10) — old: designer.browser.dev.js:86886 (module 1262); engine: chunk.vendor.js:233846
- [ ] UI-FIELD-096 Hexagonal: centerX/Y (50), scale 0..100 (1) — old: designer.browser.dev.js:86894 (module 1262); engine: chunk.vendor.js:233908
- [ ] UI-FIELD-097 Hue/Saturation (hidden): -1..1, 0 — old: designer.browser.dev.js:86902 (module 1262); engine: chunk.vendor.js:100774
- [ ] UI-FIELD-098 Color Adjust Multi (hidden): renders sub-effect settings in sequence — old: designer.browser.dev.js:86568 (module 1262); engine: chunk.vendor.js:234665
- [ ] UI-FIELD-099 Ink: strength 0..1 (0.5) — old: designer.browser.dev.js:86918 (module 1262); engine: chunk.vendor.js:234475
- [ ] UI-FIELD-100 Lens Blur: radius 0..50 (10), brightness -1..1 (0), angle ±π (0) — old: designer.browser.dev.js:86926 (module 1262); engine: chunk.vendor.js:234584
- [ ] UI-FIELD-101 Noise effect: amount 0..1 (0.5) — old: designer.browser.dev.js:86934 (module 1262); engine: chunk.vendor.js:93269
- [ ] UI-FIELD-102 Sepia: amount 0..1 (0.5) — old: designer.browser.dev.js:86942 (module 1262); engine: chunk.vendor.js:100546
- [ ] UI-FIELD-103 Swirl: centerX/Y (50), radius (50), angle ±π (0.5) — old: designer.browser.dev.js:86950 (module 1262); engine: chunk.vendor.js:234349
- [ ] UI-FIELD-104 Tilt Shift: startX 25, startY 50, endX 75, endY 50, blurRadius 0..50 (10), gradientRadius 0..100 (30) — old: designer.browser.dev.js:86958 (module 1262); engine: chunk.vendor.js:234614
- [ ] UI-FIELD-105 Drunk: strengthX (0.5), strengthY (0), radius (50) — old: designer.browser.dev.js:86966 (module 1262); engine: chunk.vendor.js:235374
- [ ] UI-FIELD-106 Unsharp Mask: radius 0..200 (0), strength 0..5 (0) — old: designer.browser.dev.js:86974 (module 1262); engine: chunk.vendor.js:234504
- [ ] UI-FIELD-107 Vibrance: amount -1..1 (0.5) — old: designer.browser.dev.js:86982 (module 1262); engine: chunk.vendor.js:234532
- [ ] UI-FIELD-108 Bloom: bloomIntensity 0..2 (1.25), baseIntensity (1), bloomSaturation (1), baseSaturation (1), blurRadius 0..50 (4), bloomThreshold 0..0.99 (0.25) — old: designer.browser.dev.js:86990 (module 1262); engine: chunk.vendor.js:234181
- [ ] UI-FIELD-109 Sketch: strength 0..2 (0.5) — old: designer.browser.dev.js:86998 (module 1262); engine: chunk.vendor.js:234558
- [ ] UI-FIELD-110 Toon: threshold 0..2 (0.2), quantization 0..20 (10) — old: designer.browser.dev.js:87006 (module 1262); engine: chunk.vendor.js:234153
- [ ] UI-FIELD-111 Zoom Blur: centerX/Y (50), strength 0..0.5 (0.3) — old: designer.browser.dev.js:87014 (module 1262); engine: chunk.vendor.js:111088
- [ ] UI-FIELD-112 Stroke effect: width 0..100 (5), softness 0.01..1 (0.5), shape 0..2 (0.7071), color white opacity 1, ellyptical (false), placement Outside/Inside/Center (0) — old: designer.browser.dev.js:87022 (module 1262); engine: chunk.vendor.js:234433
- [ ] UI-FIELD-113 Inner Glow: radius 0..50 (5), intensity 0..2 (1), color [255,255,224] — old: designer.browser.dev.js:87030 (module 1262); engine: chunk.vendor.js:234120
- [ ] UI-FIELD-114 Outer Glow: radius 0..50 (5), intensity 0..2 (1), color [255,255,224] — old: designer.browser.dev.js:87038 (module 1262); engine: chunk.vendor.js:234290
- [ ] UI-FIELD-115 Legacy GL Blur (no category, never in the add menu): radius (5), clip — old: designer.browser.dev.js:86742 (module 1262); engine: chunk.vendor.js:54731
- [ ] UI-FIELD-116 gColorSlider: gInputSlider with gradient background; DefaultStops Hue/Saturation/Luminosity — old: designer.browser.dev.js:87077 (module 1263)
- [ ] UI-FIELD-117 GEffectsPanel overlay `g-effects-panel` (`g-effects-select`, `g-effects-content` grid) — old: designer.browser.dev.js:136474 (module 1526)
- [ ] UI-FIELD-118 GEffectsButton li `g-effects-button` (`-icon`, `-caption`, `active` on hover) — old: designer.browser.dev.js:136542 (module 1527)
- [ ] UI-FIELD-119 Text color `_fc` gPatternChooser [GColor], no opacity, default null (falls back to fill) — old: designer.browser.dev.js:91427 (module 1273)
- [ ] UI-FIELD-120 Font family `_tff` gFontsButton — old: designer.browser.dev.js:91455 (module 1273)
- [ ] UI-FIELD-121 Font weight/style select (encoded weight#style#family) → `_tfw` (400) / `_tfs` (Normal); "mixed" — old: designer.browser.dev.js:91503 (module 1273)
- [ ] UI-FIELD-122 Font size `_tfi` gUnitBox (pt, px in px docs) with presets 6,7,8,9,10,11,12,14,18,21,24,36,48,60,72; default 20 — old: designer.browser.dev.js:91469 (module 1273)
- [ ] UI-FIELD-123 Decorations bold / italic / underline `_tdu` / strikeout `_tds` toggle buttons — old: designer.browser.dev.js:91660 (module 1273)
- [ ] UI-FIELD-124 Paragraph alignment `_pal` l/c/r/j (click active → null) — old: designer.browser.dev.js:91350 (module 1273)
- [ ] UI-FIELD-125 Vertical align `va` t/m/b, default t — old: designer.browser.dev.js:91317 (module 1273)
- [ ] UI-FIELD-126 Character / word spacing `_tcs` / `_tws` (doc units) — old: designer.browser.dev.js:91486 (module 1273)
- [ ] UI-FIELD-127 Line height `_plh` + unit toggle %/doc unit; default 100% — old: designer.browser.dev.js:91527 (module 1273)
- [ ] UI-FIELD-128 Text sizing auto/fixed for width `aw` and height `ah` (default auto) — old: designer.browser.dev.js:91390 (module 1273)
- [ ] UI-FIELD-129 Text direction `dir` LTR/RTL/TTB — old: designer.browser.dev.js:91841 (module 1273)
- [ ] UI-FIELD-130 Language script `_tlsc` (auto + font scripts) — old: designer.browser.dev.js:91229 (module 1273)
- [ ] UI-FIELD-131 Scale content `sc` checkbox — old: designer.browser.dev.js:91637 (module 1273)
- [ ] UI-FIELD-132 Text on path: `tpths` side, `tpthd` reverse, `tptho` distance (labels look swapped) — old: designer.browser.dev.js:91902 (module 1273)
- [ ] UI-FIELD-133 Typography: sub/superscript `_ttsc`, ligatures `_tlig` (auto), fractions `_tfrac` (false) — old: designer.browser.dev.js:91962 (module 1273)
- [ ] UI-FIELD-134 Text transform `_ttrf` u/c/l/s toggles — old: designer.browser.dev.js:92028 (module 1273)
- [ ] UI-FIELD-135 List type `_pm` overlay (behind LISTS_FEATURE): none; Bullet/Check/Square; RomanDot/RomanBracket/Number — old: designer.browser.dev.js:91040 (module 1273)
- [ ] UI-FIELD-136 Paragraph indent `_pai` ≥0 — old: designer.browser.dev.js:91803 (module 1273)
- [ ] UI-FIELD-137 Paragraph spacing `_pas` + unit toggle — old: designer.browser.dev.js:91686 (module 1273)
- [ ] UI-FIELD-138 Language `_tlocl` and stylistic set `_tstyls` selects (disabled when the font has none) — old: designer.browser.dev.js:92445 (module 1273)
- [ ] UI-FIELD-139 Rectangle all-corners type gCornerTypePicker — old: designer.browser.dev.js:90350 (module 1271)
- [ ] UI-FIELD-140 Rectangle autoscale corners `csc` / uniform corners `uf` (default true/true) — old: designer.browser.dev.js:90141 (module 1271)
- [ ] UI-FIELD-141 Rectangle per-corner grid tl/tr/bl/br: `_ct` type (default Rounded R), `_sx`/`_sy` (0), `_uf` lock (true) — old: designer.browser.dev.js:90165 (module 1271)
- [ ] UI-FIELD-142 Corner type picker gCornerTypePicker: Rounded R, InverseRounded U, Bevel B, Inset I, Fancy F; 200px `corner-picker-overlay` unless notOverlay — old: designer.browser.dev.js:166240 (module 1697)
- [ ] UI-FIELD-143 Polygon points `pts` slider 3-25 + box min 3, default 6 — old: designer.browser.dev.js:89477 (module 1270)
- [ ] UI-FIELD-144 Polygon size (inner/outer ratio) 0-100 % — old: designer.browser.dev.js:89528 (module 1270)
- [ ] UI-FIELD-145 Polygon corner radius slider + box — old: designer.browser.dev.js:89401 (module 1270)
- [ ] UI-FIELD-146 Polygon plain edges / autoscale corners checkboxes — old: designer.browser.dev.js:89675 (module 1270)
- [ ] UI-FIELD-147 Polygon corners outside/inside `ocr`/`oct`, `icr`/`ict` (0, Rounded) — old: designer.browser.dev.js:89749 (module 1270)
- [ ] UI-FIELD-148 Polygon radius outside/inside `or`/`ir` — old: designer.browser.dev.js:89300 (module 1270)
- [ ] UI-FIELD-149 Polygon angles `oa`/`ia` (degrees in UI, stored 2π−rad) — old: designer.browser.dev.js:89336 (module 1270)
- [ ] UI-FIELD-150 Ellipse start/end angle `sa`/`ea` (stored 2π−rad, default π) — old: designer.browser.dev.js:87372 (module 1265)
- [ ] UI-FIELD-151 Ellipse type `etp` Arc 2 / Chord 1 / Pie 0 (default Pie; Arc sets border center) — old: designer.browser.dev.js:87341 (module 1265)
- [ ] UI-FIELD-152 Path closed / csc checkboxes (default false/true) — old: designer.browser.dev.js:88631 (module 1269)
- [ ] UI-FIELD-153 Anchor point x / y — old: designer.browser.dev.js:88459 (module 1269)
- [ ] UI-FIELD-154 Anchor point type `tp`: straight, mirror TM, asymmetric TA, symmetric TS (connector TC) — old: designer.browser.dev.js:88480 (module 1269)
- [ ] UI-FIELD-155 Anchor point corner: cl slider/box, ctp corner type, cu lock — old: designer.browser.dev.js:88812 (module 1269)
- [ ] UI-FIELD-156 Image actions: crop toggle, reset cropping, replace (png/jpg/jpeg/gif with size check), reset size — old: designer.browser.dev.js:88293 (module 1268)
- [ ] UI-FIELD-157 Image palette extraction (color quantizer) — old: designer.browser.dev.js:87849 (module 1267)
- [ ] UI-FIELD-158 Blend mode select gBlendMode: Normal; Darken [darken, multiply, color-burn, subtract*, linear_burn*]; Lighten [lighten, screen, color-dodge, linear_dodge*, add*]; Boost contrast [overlay, soft-light, hard-light, vivid_light*, linear_light*, pin_light*, hardmix*]; Adjust colors [hue, saturation, color, luminosity]; Invert colors [difference, exclusion, divide*, power*, harmonic*, sin*]. * = WebGL-only, label suffixed " *" — old: designer.browser.dev.js:166008 (module 1696); engine: chunk.vendor.js:4050
- [ ] UI-FIELD-159 gInputBox: selectOnFocus, triggerChangeOnEnter, key/wheel/mousemove increments 1 (Shift 10, Alt 0.1), x0.1 for in/cm docs, min/max, postfix, equations (GLength.parseEquationValue), drag scrubbing with cursor-scrub.svg — old: designer.browser.dev.js:167657 (module 1702)
- [ ] UI-FIELD-160 gInputSelect `g-input-select`: input + dropdown menu of {title,data} — old: designer.browser.dev.js:167785 (module 1703)
- [ ] UI-FIELD-161 gCheckboxSlider `g-checkbox-slider` — old: designer.browser.dev.js:167852 (module 1704)
- [ ] UI-FIELD-162 gUnitBox `g-unitbox`: unit postfix, preset list overlay (`option-list`, `option-item`), value as GLength — old: designer.browser.dev.js:167911 (module 1705)
- [ ] UI-FIELD-163 gPropertyRow `g-property-row`: label/icon, `columns` of `column` (width or `auto-grow`, `prefix`, `content`, `no-padding`, isMenu), `labels` row — old: designer.browser.dev.js:173045 (module 1725)
- [ ] UI-FIELD-164 Units gUnit: px Pixels, mm, cm, in, pc, pt (GLength unit.<u> and .short); engine also knows pix, cc, dd, ft, yd, mi, m, km, q, h; default px, DPI 72 — old: designer.browser.dev.js:173175 (module 1726); engine: chunk.vendor.js:30289
- [ ] UI-FIELD-165 gAccordion: `accordion` + `collapsed`/`expanded`, `g-accordion` icon toggle, `g-accordion-ghost` — old: designer.browser.dev.js:173642 (module 1729)
- [ ] UI-FIELD-166 gInputLabel `g-input-label` prefix inside inputs — old: designer.browser.dev.js:173706 (module 1730)
- [ ] UI-FIELD-167 gInputSlider `g-input-slider` (`-track`, `-thumb` active, `-background`); min/max/step; OPACITY_DEFAULT {0,100, opacity} — old: designer.browser.dev.js:54520 (module 857)
- [ ] UI-FIELD-168 gPivot `g-pivot`: nine `side` divs tl..cc, "pivotchange" — old: designer.browser.dev.js:172997 (module 1724)
- [ ] UI-FIELD-169 jQuery "input" special event shim — old: designer.browser.dev.js:170722 (module 1714)
- [ ] UI-FIELD-170 elastic() auto-growing textarea — old: designer.browser.dev.js:170796 (module 1715)
- [ ] UI-FIELD-171 gAutoEdit inline editor `g-auto-edit` (dblclick; Enter/blur submit, Esc close) — old: designer.browser.dev.js:165882 (module 1695)
- [ ] UI-FIELD-172 Drag helper (absolute positioning with grab offset) — old: designer.browser.dev.js:166630 (module 1699)
- [ ] UI-FIELD-173 Scrubbing gate: setting "scrubbing_flag" (default true) — old: designer.browser.dev.js:95504 (module 1278)
- [ ] UI-FIELD-174 `$.fn.debounce` and `:editable` selector (suppress shortcuts while typing) — old: designer.browser.dev.js:165540 (module 1689)

### Color picker

- [ ] UI-COLOR-001 Pattern chooser popup (singleton gOverlay `pattern-chooser`, shared by every swatch button): window.gPatternChooserNormal (module 1150) and gPatternChooserTouch (module 1657), picked per open by isTouchEnabled; closes on editor ModifiedEvent; onClose(pattern, opacity) — old: designer.browser.dev.js:67778 (module 1150)
- [ ] UI-COLOR-002 Pattern type select `pattern-type-select` (options `pattern-type`), filtered by settings.types; change creates the default of that type, opacity 1; hidden with singleOption — old: designer.browser.dev.js:67826 (module 1150)
- [ ] UI-COLOR-003 Pattern types: Color, Linear gradient, Radial gradient, Angular gradient (default white→black or current→black), Texture (serialized vector group, repeat Both), Noise, Background fill — old: designer.browser.dev.js:70538 (module 1150)
- [ ] UI-COLOR-004 Color mode select `colormode-selector`: RGB (free), HSB ("hsv", pro), CMYK (pro) — old: designer.browser.dev.js:67871 (module 1150)
- [ ] UI-COLOR-005 Color editor `color-editor`: `color-map` (canvas, `.overlay`, `.marker`), `color-details` (eyedropper, sliders, preview), `color-components`; `cmyk-mode` hides map and hue — old: designer.browser.dev.js:67968 (module 1150)
- [ ] UI-COLOR-006 Color map drag sets saturation/value — old: designer.browser.dev.js:70420 (module 1150)
- [ ] UI-COLOR-007 Hue slider and opacity slider (0-100, disabled when hasOpacity false) — old: designer.browser.dev.js:67996 (module 1150)
- [ ] UI-COLOR-008 Color preview `color-preview` (old/new over checkerboard) — old: designer.browser.dev.js:68045 (module 1150)
- [ ] UI-COLOR-009 Hex field (forced "#", max 7 chars, invalid keeps old) — old: designer.browser.dev.js:68296 (module 1150)
- [ ] UI-COLOR-010 Component fields: RGB 0-255; HSB H 0-360, S/B 0-100; CMYK 0-100 % (`cymk-label`, sic) — old: designer.browser.dev.js:68357 (module 1150)
- [ ] UI-COLOR-011 Alpha field "A" 0-100 % — old: designer.browser.dev.js:68426 (module 1150)
- [ ] UI-COLOR-012 Gradient editor bar `gradient-editor > .stops`: click adds a stop (interpolated color) — old: designer.browser.dev.js:67927 (module 1150)
- [ ] UI-COLOR-013 Gradient stop `div.stop` (g-active): drag moves; drag >50px off the bar removes (only with ≥3 stops); synced with the on-canvas gradient editor — old: designer.browser.dev.js:69790 (module 1150)
- [ ] UI-COLOR-014 Gradient actions `gradient-actions`: reverse stops, rotate −45°/+45° (hidden for radial) — old: designer.browser.dev.js:68063 (module 1150)
- [ ] UI-COLOR-015 Texture editor `pattern-editor`: preview, "Choose image…" (png/jpg/jpeg/gif), paste vector as texture, scale mode, tile 10-200 %, transparency mask switch (hasMask) — old: designer.browser.dev.js:68776 (module 1150)
- [ ] UI-COLOR-016 Texture advanced `pattern-advanced-settings`: Repeat, Position, Size mode, W/H, unit px/% — old: designer.browser.dev.js:68970 (module 1150)
- [ ] UI-COLOR-017 Noise editor `noise-editor`: intensity 0-100 slider + box, type select — old: designer.browser.dev.js:68532 (module 1150)
- [ ] UI-COLOR-018 Panel visibility per pattern type — old: designer.browser.dev.js:70031 (module 1150)
- [ ] UI-COLOR-019 Palette tabs `chooser` buttons data-palette colors / swatches (pro) / used / mixer; default colors — old: designer.browser.dev.js:68201 (module 1150)
- [ ] UI-COLOR-020 Colors palette `colors-palette`: 12 grays + 12 fixed hues (#980000, red, orange, yellow, green, cyan, #009688, #607D8B, #4A86E8, blue, #9900FF, magenta) — old: designer.browser.dev.js:69367 (module 1150)
- [ ] UI-COLOR-021 Mixer palette `mixer-palette`: Tints/Shades/Tones/Mixes rows of 10 (8 touch) — old: designer.browser.dev.js:69411 (module 1150)
- [ ] UI-COLOR-022 "In use" palette `used-palette` from document.getDocumentColors() by usage count; there is no recent-colors store — old: designer.browser.dev.js:69526 (module 1150)
- [ ] UI-COLOR-023 Swatch cell `div.swatch`: click applies; Alt+click selects all elements using it; CMYK overlay `cmyk-swatch` — old: designer.browser.dev.js:69148 (module 1150)
- [ ] UI-COLOR-024 Eyedropper inside the chooser `color-eyedropper g-flat eye-drop` — old: designer.browser.dev.js:67985 (module 1150)
- [ ] UI-COLOR-025 gPatternChooser button plugin `g-pattern-chooser` / `-simplified` / `only-picker`: span.preview g-button (g-active while open, rich tooltip), optional eyedropper; options asButton, label, singleOption, simplified, noEyedropper, types, hasOpacity, hasMask; events patternchange, chooseropen, chooserclose — old: designer.browser.dev.js:70700 (module 1150)
- [ ] UI-COLOR-026 gPatternTarget drag/drop of paints (GPattern.MIME_TYPE, 20×20 drag image) — old: designer.browser.dev.js:172890 (module 1723)
- [ ] UI-COLOR-027 Touch chooser variant: `pattern-chooser-overlay`, customRight −250, mini-font labels, advanced expanded by default, 8-entry rows. Bug: reads `cymkWidth` vs `cmykWidth` — old: designer.browser.dev.js:159045 (module 1657)
- [ ] UI-COLOR-028 Touch long-press menu `g-pattern-chooser-context-menu`: Add to document swatches / global swatches — old: designer.browser.dev.js:159143 (module 1657)
- [ ] UI-COLOR-029 Eyedropper widget gEyeDropper (g-button, gravit-icon-picker): `g-eye-dropper-picker g-cursor-pixel` with 135×135 magnifier, "R G B #HEX" label, current/new preview; mousedown commits; Esc cancels; touch uses a draggable point — old: designer.browser.dev.js:166367 (module 1698)

### Swatches

- [ ] UI-SWATCH-001 Swatches palette (tab in the color picker, pro; no separate swatches panel): sections `swatches-palette global` (+ " trial") and `swatches-palette document`, each with collapsible toolbar and `swatches-wrapper` — old: designer.browser.dev.js:69549 (module 1150)
- [ ] UI-SWATCH-002 Swatch scopes global|document × "", -linear-gradient, -radial-gradient, -angular-gradient, -texture-pattern, -noise-pattern; only the current type's scope is shown — old: designer.browser.dev.js:69595 (module 1150)
- [ ] UI-SWATCH-003 Swatch grid rows of 13 (RGB then CMYK), add button `swatch-button g-flat` (duplicates → text.equal-swatch-alert), active swatch g-active, load error info — old: designer.browser.dev.js:69613 (module 1150)
- [ ] UI-SWATCH-004 Swatch reorder by drag within the same section and CMYK-ness (g-drop) — old: designer.browser.dev.js:69279 (module 1150)
- [ ] UI-SWATCH-005 Swatch delete by dragging outside `.pattern-chooser` (undo "action.remove-swatch") — old: designer.browser.dev.js:69170 (module 1150)
- [ ] UI-SWATCH-006 Import/export swatches: gzip (pako level 9) of a serialized GSwatches node, file "Swatches.gvswatch" — old: designer.browser.dev.js:69568 (module 1150)
- [ ] UI-SWATCH-007 GSwatchesChangedEvent {scope} — old: designer.browser.dev.js:70939 (module 1151)

### Shared styles

- [ ] UI-STYLE-001 Style row in Appearance `appearance-style-property`: `style-selector-container` > `g-styles-preview` + `g-select g-styles-field-container > span.g-styles-field[data-property=_styles]` (name / "No style" / "Multiple selection"), pro tooltip — old: designer.browser.dev.js:72740 (module 1160)
- [ ] UI-STYLE-002 Sync style button `g-style-sync` (g-disabled unless the element differs from its style): pushes element appearance into the style — old: designer.browser.dev.js:72799 (module 1160)
- [ ] UI-STYLE-003 Style picker overlay gDesignerStyleEditor (pro, 250px `g-style-editor`): "No style" row detaches; list of document styles; toolbar "Create new style", "Organize styles…" — old: designer.browser.dev.js:174200 (module 1731)
- [ ] UI-STYLE-004 Style list item `div.style`: `style-selector` dot, 50×50 preview (or "Ab" for text), name ellipsis 200px; click assigns (undo "text.style-attribution") — old: designer.browser.dev.js:174075 (module 1731)
- [ ] UI-STYLE-005 Style creator/editor dialog `g-style-creator`: name (default "New style"), preview, checkboxes Style, Fill, Border, Effects, Text (Text also Paragraph; on by default only for GText); Create / Apply — old: designer.browser.dev.js:173757 (module 1731)
- [ ] UI-STYLE-006 Organize styles dialog `g-style-creator organizer`: drag reorder (g-drop), trash (disconnect then remove), settings (edit), Finish — old: designer.browser.dev.js:174226 (module 1731)
- [ ] UI-STYLE-007 Style preview cache: 50×50 GRectangle render (#EBEBEB fill if none) and "Ab" text variant, PNG data URLs in memory — old: designer.browser.dev.js:124003 (module 1491)

### Fonts

- [ ] UI-FONT-001 Font field gFontsButton: input toggling button/text on focus, typing filters, ↑/↓, Enter; overlay `g-font-list-overlay` — old: designer.browser.dev.js:166955 (module 1700)
- [ ] UI-FONT-002 Font provider tabs `ul.tab > li.tablink > a.tablinks`: Web fonts, Imported fonts (pro), System fonts (queryLocalFonts or Electron) — old: designer.browser.dev.js:166778 (module 1700)
- [ ] UI-FONT-003 Local fonts permission dialog `g-local-fonts-warning-dialog` (skipped with setting disable-local-fonts-access-warning; unsupported browser alert) — old: designer.browser.dev.js:166707 (module 1700)
- [ ] UI-FONT-004 Fonts list gFontsPanel `g-fonts-panel` (g-loading): `.fonts-row` (`.info`, `.preview`), lazy previews from the selected family outward, ~22px rows, load more at 70% scroll, g-selected — old: designer.browser.dev.js:167036 (module 1701)
- [ ] UI-FONT-005 Fonts panel API (search, select, weights/styles/subfamilies, reload) — old: designer.browser.dev.js:167205 (module 1701)
- [ ] UI-FONT-006 Web fonts provider: bundled Open Sans and Noto Sans (+CJK) catalogue, SVG previews, de-duplicated fetches. No Google Fonts — old: designer.browser.dev.js:26304 (module 590)
- [ ] UI-FONT-007 Noto font catalogue JSON {family, fonts[{weight, style, url}], preview, scripts} — old: designer.browser.dev.js:61142 (module 1075)
- [ ] UI-FONT-008 Imported fonts provider: preview row with delete `g-font-delete` (confirm.delete-font; replaces uses with Open Sans) — old: designer.browser.dev.js:67244 (module 1118)
- [ ] UI-FONT-009 Import fonts (ttf, otf, ttc, dfont, multiple; de-dupe family+weight+style) — old: designer.browser.dev.js:80073 (module 1245)
- [ ] UI-FONT-010 System fonts provider (queryLocalFonts, grouped by family, memory cache) — old: designer.browser.dev.js:77555 (module 1199)
- [ ] UI-FONT-011 Missing fonts dialog `g-missingfonts-dialog`: `font-row` (.postscriptname + gFontsButton), provider enablers, "Replace fonts", "Keep fonts" (adds to scene "cst") — old: designer.browser.dev.js:53302 (module 841)

### Images

- [ ] UI-IMAGE-001 Warn-linked-image dialog `g-warn-linked-image-dialog`: text, "never remind" (gContainer "designer.settings.warn-linked-image-dialog.never-remind"), Proceed / Cancel / X; before desktop save with linked files — old: designer.browser.dev.js:130707 (module 1511)
- [ ] UI-IMAGE-002 Image too big dialog (simple `.message` + OK): text.image-too-big / text.image-in-design-too-big; limits from GPlatform maxPngDataSize, maxImgDataUrlLength, maxImgLinearDimension, maxImgAreaDots — old: designer.browser.dev.js:4190 (module 119)
- [ ] UI-IMAGE-003 Local file picker: hidden `input#file-input` or showOpenFilePicker; open-directory needs "granted". Backs every image/swatch/font prompt. No image import options dialog exists — old: designer.browser.dev.js:76969 (module 1195)

### Dialogs

- [ ] UI-DIALOG-001 gDialog framework: `.g-dialog-container.<cls>-container` (visible) > `.g-dialog.<cls>` > `.g-dialog-content` + optional `.g-dialog-footer > .buttons`. Options releaseOnClose (true), className, buttons, openCallback, closeCallback(cancelled), nowrap, closeTimeout (250 ms), alwaysCloseable. Stack: Esc closes the top one, backdrop mousedown closes — old: designer.browser.dev.js:173270 (module 1727)
- [ ] UI-DIALOG-002 gOverlay popover framework `.g-overlay` (no-padding, g-overlay-modal, g-overlay-left-side, g-overlay-valign-bottom, g-overlay-side): options modal, padding, releaseOnClose, offsetX/Y, customRight, clazz, closeCallback, enterCallback, side, flipHorizontal; opens at element or {x,y}; outside mousedown/Esc closes; marks `.sidebar-inspector` / `.g-touch-toolbar` with `sidebar-overlay` — old: designer.browser.dev.js:172702 (module 1722)
- [ ] UI-DIALOG-003 GSystemDialog.alert(message, cb, {closeByEnter, className}) `.g-system-dialog.g-alert-dialog` — old: designer.browser.dev.js:1781 (module 44)
- [ ] UI-DIALOG-004 GSystemDialog.confirm(message, cb, cancelLabel, okLabel, closable, enterConfirms, escCancels, oneTimePropertyKey) `.g-confirm-dialog` (+ `g-onetime-dialog` with "do not show again" stored in gContainer under the key) — old: designer.browser.dev.js:1660 (module 44)
- [ ] UI-DIALOG-005 GSystemDialog.prompt `.g-prompt-dialog` (input.max-width; Enter/Esc) — old: designer.browser.dev.js:1744 (module 44)
- [ ] UI-DIALOG-006 GSystemDialog.showOneTimeDialog(message, key) — old: designer.browser.dev.js:1814 (module 44)
- [ ] UI-DIALOG-007 GSystemDialog.custom `.g-custom-dialog` (title, subtitle, footer, icon, buttons with Mousetrap shortcut, dontShowAgainCb); error() and externalFileError() — old: designer.browser.dev.js:2279 (module 44)
- [ ] UI-DIALOG-008 GSystemDialog v1 warning/info `.g-dialog-v1` (icon, title, pre.message, details, radio options, do-not-show-again bound to a setting; Promise) — old: designer.browser.dev.js:2077 (module 44)
- [ ] UI-DIALOG-009 messageWithInfo `.g-message-with-info-dialog`, advanced `.g-advanced-dialog`, splashScreenError `.g-splash-screen-error-dialog` — old: designer.browser.dev.js:2248 (module 44)
- [ ] UI-DIALOG-010 CDR warnings (settings disable_cdr_warning, disable_cdr_unsupported_effect, disable_cdr_unsupported_effects, default_cdr_unsupported_effects=1): Keep appearance / Keep editable / Save as CDRAPP / Omit — old: designer.browser.dev.js:1918 (module 44)
- [ ] UI-DIALOG-011 Simple message dialog (div.message + OK) — old: designer.browser.dev.js:9366 (module 219)
- [ ] UI-DIALOG-012 Offline dialog `.g-offline-dialog`: openOfflineWarning, openRetryConnection (Retry/Cancel), openUnavailableFeature — old: designer.browser.dev.js:12597 (module 256)
- [ ] UI-DIALOG-013 Keyboard shortcuts dialog `.g-shortcuts-dialog`: close, title, `.wrapper > table` one row per action with a shortcut, then tools. No categories — old: designer.browser.dev.js:157829 (module 1644)
- [ ] UI-DIALOG-014 Translation tool (internal) `.g-translation-tool-dialog`: project/language choosers, CSV export/import, per-key rows — old: designer.browser.dev.js:157165 (module 1640)
- [ ] UI-DIALOG-015 Paywall dialog `.g-paywall-dialog` (buy / edit) — old: designer.browser.dev.js:113363 (module 1473)
- [ ] UI-DIALOG-016 Purchase confirmation `.g-confirmation-dialog` — old: designer.browser.dev.js:113443 (module 1474)
- [ ] UI-DIALOG-017 Cloud sync conflict chooser `.g-document-chooser` (online vs offline preview, "newer" tag) — old: designer.browser.dev.js:113529 (module 1475)
- [ ] UI-DIALOG-018 New file/folder name prompt `.g-new-file-prompt-dialog` (input.name, Create/Cancel, validator) — old: designer.browser.dev.js:148078 (module 1556)
- [ ] UI-DIALOG-019 User name config `.g-username-config-dialog` (first/last name; OK disabled until both filled) — old: designer.browser.dev.js:148687 (module 1560)
- [ ] UI-DIALOG-020 Install PWA dialog `.g-install-pwa-dialog` (/-dark): Install / Not now, chromium section, footer — old: designer.browser.dev.js:148795 (module 1562)
- [ ] UI-DIALOG-021 Share dialog legacy `.g-share-dialog-legacy` (on/off, link + Copy, allow save, allow inspect) — old: designer.browser.dev.js:149811 (module 1566)
- [ ] UI-DIALOG-022 Share dialog (cloud) `.g-share-dialog`: public link role, email invites, invited list, errors; `.g-sent-invitation-email-dialog` — old: designer.browser.dev.js:150412 (module 1567)
- [ ] UI-DIALOG-023 File status history `.g-file-status-history-dialog` (cloud) — old: designer.browser.dev.js:139209 (module 1538)
- [ ] UI-DIALOG-024 Maintenance dialog `.g-maintenance-dialog` (iframe) — old: designer.browser.dev.js:164551 (module 1675)
- [ ] UI-DIALOG-025 Payment dialog `.g-payment-dialog` (iframe, g-loading) — old: designer.browser.dev.js:165043 (module 1680)
- [ ] UI-DIALOG-026 Windows Store announcement `.g-windows-store-announcement-dialog` (iframe, empty src) — old: designer.browser.dev.js:165340 (module 1685)
- [ ] UI-DIALOG-027 Beta warning `.g-beta-warning-dialog` ("I UNDERSTAND", gContainer "designer.betaflow.dismiss-warning-dialog") — old: designer.browser.dev.js:165373 (module 1686)
- [ ] UI-DIALOG-028 Memory warning `.g-memory-warn-dialog` (heap ≥80%, checked every minute, re-armed after 30 min) — old: designer.browser.dev.js:165467 (module 1687)
- [ ] UI-DIALOG-029 Profile dialog `.g-profile-dialog`: avatar upload (png/jpg ≤100 KB), tabs Account / Change password / Purchases — old: designer.browser.dev.js:26897 (module 604)
- [ ] UI-DIALOG-030 Account panel `.g-account-panel` (name, email, passwords, Save, Delete account confirm) — old: designer.browser.dev.js:130274 (module 1508)
- [ ] UI-DIALOG-031 Change password panel `.g-change-password-panel` — old: designer.browser.dev.js:130505 (module 1509)
- [ ] UI-DIALOG-032 Purchase panel `.g-purchase-panel` (search, order by, rows) — old: designer.browser.dev.js:129626 (module 1507)
- [ ] UI-DIALOG-033 Save chooser `.g-save-chooser-dialog > .g-save-chooser`: Save to file / Save to cloud — old: designer.browser.dev.js:130687 (module 1510)
- [ ] UI-DIALOG-034 Login dialog `.g-login-dialog`: sign-in, sign-up, reset password, thanks, offline views — old: designer.browser.dev.js:61271 (module 1093)
- [ ] UI-DIALOG-035 Login panel `.g-login-panel` (loading state of embedded login) — old: designer.browser.dev.js:19308 (module 446)
- [ ] UI-DIALOG-036 Has-updates warning on save `.g-has-updates-warning-dialog` (Cancel / Reload / Save) — old: designer.browser.dev.js:947 (module 40)
- [ ] UI-DIALOG-037 Force app update `.g-force-update-app-dialog` — old: designer.browser.dev.js:163190 (module 1665)
- [ ] UI-DIALOG-038 Export dialog GExportDialog `.g-export-dialog` (+ `dialog-expired-pro`): mode tabs Canvas / Selection / Assets (`.mode-container label[data-mode]`); settings `div[data-setting]`: format PNG/JPEG/SVG/PDF (png), size presets 1x, 2x, 0.5x, 3x, 512w, 512h, 128x128, 300dpi (1x; PDF Default 72 / Web 96 / Medium 150 / High 300 dpi), JPEG quality (92 %), background page/custom/none + colour (page bck/bop), color mode RGB/CMYK (PDF), with effects, decimal places (3, SVG), text as curves (false), export all (true), layer names as id (SVG), preserve SVG editing (false), do not downsample images (false), export to. Preview list `.preview-container > .item`, >200 in warning, exporting overlay with Cancel — old: designer.browser.dev.js:131152 (module 1513)
- [ ] UI-DIALOG-039 Print: no dialog; renders pages to SVG (300 dpi pro / 150 free) in a hidden iframe and calls window.print(); warnings printing-warning / printing-disabled — old: designer.browser.dev.js:155075 (module 1609)
- [ ] UI-DIALOG-040 Files panel shell GFilesPanel `.g-files-panel` (open/save): views Native / Sharepoint; header back, My cloud, new folder, sort updated/name/created asc/desc, filter, card/list toggle, maximize/close, recent / all files, drive list. Storage GFilesPanel.maximized, GFilesPanel.isFilesListStyle, designer.filespanel.cloud-accounts(.active) — old: designer.browser.dev.js:143858 (module 1545)
- [ ] UI-DIALOG-041 Cloud drive dialogs `.edit-account-dialog`, `.g-cloud-account-options` — old: designer.browser.dev.js:99373 (module 1300)
- [ ] UI-DIALOG-042 Sharepoint check-in `.g-sharepoint-check-in-dialog` (minor/major/overwrite, comment) — old: designer.browser.dev.js:156699 (module 1631)
- [ ] UI-DIALOG-043 Google Drive warning `.g-googledrive-warning-dialog` — old: designer.browser.dev.js:147140 (module 1553)
- [ ] UI-DIALOG-044 Access/permission dialogs `.g-request-permission-dialog`, `.g-request-access-dialog`, `.g-file-can-not-be-found-dialog` — old: designer.browser.dev.js:103540 (module 1322)
- [ ] UI-DIALOG-045 Deactivated user `.g-deactivated-user-dialog` (countdown) — old: designer.browser.dev.js:124328 (module 1491)
- [ ] UI-DIALOG-046 Unsupported features notice (GUnsupportedFeaturesDialog): lists noise/texture/background/angular gradient found in a file, OK + "don't show again" → setting disable_warning_unsupported_features — old: designer.browser.dev.js:78486 (module 1238)
- [ ] UI-DIALOG-047 Auto-save dialogs: `.g-auto-save-warn-dialog` (Disable/Enable; gContainer designer.settings.auto-save-warn-dialog-shown), `.g-auto-save-format-not-support-warn-dialog` (CDR/DES), `.g-auto-save-sync-dialog`, no-entries-in-version-history, file-updated-outside-app — old: designer.browser.dev.js:95159 (module 1276)
- [ ] UI-DIALOG-048 Not present in the old app: about dialog, document settings dialog (lives in the inspector scene panel), image import options, find/replace. Do not invent them in the port unless wanted — old: designer.browser.dev.js:143228 (module 1544)

### Settings

- [ ] UI-SETTING-001 Settings dialog GSettingsDialog (opened by edit.settings, module 1277 at 95499): gDialog className `g-settings-dialog`, not closable by Esc (open(false)). Each row is `.setting > .form > .text-description (.label, .description html, links target _blank) + .editor`; sub-rows get `.sub-setting`. Footer buttons `button.settings-button` Cancel / "Save changes". Values apply only on Save, which writes all keys in one setSetting call, then saves the server-side notification setting, then re-triggers `.symbols-container` scroll — old: designer.browser.dev.js:94426 (module 1275)
- [ ] UI-SETTING-002 Highlight on hover: g-switch `data-setting="highlight_on_hover"`, default true — old: designer.browser.dev.js:94054 (module 1275)
- [ ] UI-SETTING-003 Auto-expand layers: g-switch `auto_expand_layers`, default true — old: designer.browser.dev.js:94082 (module 1275)
- [ ] UI-SETTING-004 Auto save (only when AUTO_SAVE_ENABLED, true in this build): g-switch `auto_save` (dialog falls back to true, store default false) plus `select[data-setting=auto_save_interval]` with options AUTOSAVE_INTERVALS 5, 10, 20 (stored as the number; default AUTOSAVE_INTERVAL_DEFAULT 5) — old: designer.browser.dev.js:94699 (module 1275); constants 23816 (module 10)
- [ ] UI-SETTING-005 Auto save warning for local files: g-switch bound inverted to `autosave-prompt-for-local-files-disabled` (checked = warnings on), default warnings on — old: designer.browser.dev.js:94132 (module 1275); key 94808 (module 1276)
- [ ] UI-SETTING-006 Dev-only (not production/beta/lts/rc): "Enable steps debug" `enable_steps_debug` (default GEditorOptions.debugTransactions) and "Enable cached rendering" `enable_cache` (default GRendererConfig.ENABLE_CACHE; label not localised) — old: designer.browser.dev.js:94165 (module 1275)
- [ ] UI-SETTING-007 Theme: `div.g-select.g-theme-selector[data-setting=theme]` (min-width 170px) opening gOverlay `theme-selector` with `.g-theme-row` entries "Light theme (default)" key light and "Dark theme" key dark; Enter picks the hovered row; default "light" — old: designer.browser.dev.js:94577 (module 1275)
- [ ] UI-SETTING-008 Toolbar alignment (sub-setting under theme): g-switch `ui_toolbar_alignment`. The dialog reads it with fallback false, the store default is true (left-aligned) — old: designer.browser.dev.js:94224 (module 1275)
- [ ] UI-SETTING-009 Store text path: g-switch bound inverted to `dont_store_textpath` (checked = store) — old: designer.browser.dev.js:94254 (module 1275)
- [ ] UI-SETTING-010 Decimal places: g-switch `decimals-num-onoff` plus 60px gInputBox `decimals-num-val` (0..6, default shown "2"); off stores `decimals_num` = null (use GScene.decimalsNum), on stores the number — old: designer.browser.dev.js:94636 (module 1275)
- [ ] UI-SETTING-011 Disable warning for unsupported features: g-switch `disable_warning_unsupported_features` — old: designer.browser.dev.js:94307 (module 1275)
- [ ] UI-SETTING-012 EPS outline fonts: g-switch `eps_outline_fonts`, default true — old: designer.browser.dev.js:94337 (module 1275)
- [ ] UI-SETTING-013 Disable notifications: g-switch `notifications_disabled`, read from and saved to the server (gApi.getUserSettings / updateUserSettings), not local — old: designer.browser.dev.js:94362 (module 1275)
- [ ] UI-SETTING-014 Disable scrubbing: g-switch bound inverted to `scrubbing_flag` (checked = scrubbing off), default scrubbing on — old: designer.browser.dev.js:94374 (module 1275)
- [ ] UI-SETTING-015 Create backup copy of file (Electron only): g-switch `create_backup_copy`, default false — old: designer.browser.dev.js:94392 (module 1275)
- [ ] UI-SETTING-016 Save writes keys that may have no control: `system_fonts_enabled` has no element in the dialog, and the dev-only / Electron-only / auto-save rows may be absent, so Save sets those keys to undefined (or true for inverted ones) for the session; JSON.stringify drops undefined, so the default returns after reload. Fix in the port by only saving rendered rows — old: designer.browser.dev.js:94493 (module 1275)
- [ ] UI-SETTING-017 Settings store: gDesigner._settings holds defaults; getSetting(key, fallback) uses hasOwnProperty; setSetting(key|keys, value|values) only after load, fires GSettingChangedEvent(key, old, new) per changed key (module 135) and persists the whole object to gContainer "designer.settings" — old: designer.browser.dev.js:122172 (module 1491)
- [ ] UI-SETTING-018 Settings load: at start reads "designer.settings", fills missing keys from the defaults and fires a SettingChangedEvent (initial flag) for every key — old: designer.browser.dev.js:122968 (module 1491)
- [ ] UI-SETTING-019 Setting defaults: theme "light", snap_disabled false, snap_zones false, snap_guides [guide lines, full pixels, points, bbox, page, grid guide ids], rulers_visible false, guide_lines_visible true, symbol_labels_visible true, grid_visible true, page_labels_visible true, highlight_on_hover true, invert_selection false, auto_expand_layers true, system_fonts_enabled true, symbols_panel_shown false, decimals_num null, enable_steps_debug false, enable_cache (true when gdb_loaddesign exists), ui_toolbar_alignment true, eps_outline_fonts true, auto_save false, auto_save_interval 5, notifications_disabled false, touch false, sidebars_left_active true, sidebars_right_active true — old: designer.browser.dev.js:121828 (module 1491)
- [ ] UI-SETTING-020 Settings without defaults (set elsewhere): language, lastDirectory, color_mode, font-set, webcdr_choice, show_welcome_screen, sidebars_width_<id>, disable_cdr_warning, disable_cdr_unsupported_effect(s), default_cdr_unsupported_effects, autosave-prompt-for-reminding-not-support-cdr-des, disable-external-file-no-entries-created-waring (sic), disable-local-fonts-access-warning, disable_warning_unsupported_features, scrubbing_flag, create_backup_copy, reminder keys (trialExpired, proExpireSoon, proExpired, proOffer*, offlineWarning, upgradeScreen: last-shown date) — old: designer.browser.dev.js:103943 (module 1325); lastDirectory 11347 (module 237)
- [ ] UI-SETTING-021 Snap settings writers (view toggles, not in the dialog): snap_disabled, snap_zones, snap_guides array edits — old: designer.browser.dev.js:96048 (module 1287)

### Themes

- [ ] UI-THEME-001 Theme switch: on SettingChangedEvent "theme", _setTheme splits the `<link href$=".css">` href by "." and replaces part 2 (designer.browser.light.css ↔ designer.browser.dark.css), then calls `$(link).load(...)` and in the callback sets guide line color light [107,156,228] / dark [227,0,97], hint color "blue" / "#F790B6" (unless DESIGNER.* overrides), re-toggles rulers on every window and runs _updateTheme. "default" maps to "light". Only the theme key is stored (in "designer.settings") — old: designer.browser.dev.js:123731 (module 1491)
- [ ] UI-THEME-002 Canvas label color: after a theme change, reads the computed #windows background and sets GPaintContext.labelColor black or white by luminance (299R+587G+114B)/1000 ≥ 128 — old: designer.browser.dev.js:123766 (module 1491)
- [ ] UI-THEME-003 Theme-dependent JS values: touch toolbar shadow #DFDFDF / #2E2E2E (gToolbarShadow and symbols sidebar), mention avatar notification-icon-light.svg / -dark.svg — old: designer.browser.dev.js:171176 (module 1716)
- [ ] UI-THEME-004 Stylesheets: public/designer.browser.light.css (linked from index.html line 39) and designer.browser.dark.css, plus static.css. Two full stylesheets, no CSS variables, so the port either keeps swapping files or extracts tokens — old: designer.browser.dev.js:123733 (module 1491)

### Locale

- [ ] UI-I18N-001 Locale tables in the app: modules 814/815 and again 821/822 are identical JSON (two copies). Each is an array of 15 language entries {language, keyValue, abbreviation, isDefault, isAvailable, realName, translations, translationsExtended, translationsTemporary, translationsExtendedTemporary, etag}: English 0 en-US, German 1 de-DE, Chinese 2 zh-CN, Portuguese 3 pt-BR, Spanish 4 es-ES, French 5 fr-FR, Polish 6 pl-PL, Russian 7 ru-RU, Turkish 8 tr-TR, Czech 9 cs-CZ, ChineseTaiwan 10 zh-TW, Italian 11 it-IT, Japanese 12 ja-JP, Dutch 13 nl-NL, Swedish 14 sv-SE. Only English has strings: 814 has 360 class namespaces / 3378 keys (Designer project), 815 has 15 namespaces / 546 keys (Cloud project); the other 14 languages are empty in the bundle — old: designer.browser.dev.js:52392 (module 814), 52397 (815), 52829 (821), 52834 (822)
- [ ] UI-I18N-002 Engine locale tables: modules 885 and 941 in chunk.vendor.js are the same kind of table (another two copies, ~130 KB each) — old: chunk.vendor.js:112276 (module 885), chunk.vendor.js:122539 (module 941)
- [ ] UI-I18N-003 Lookup: GLocale.get(GLocaleKey(classId, key)) → getValue(class, key, default, lang): current language's project values (extension values first when enabled), falling back to English (GLocaleLanguage.Default); missing keys log "No value found for <class> and key <key>" (throws in strict mode). Class ids are strings like "GSettingsDialog". Projects: Designer and Cloud — old: chunk.vendor.js:112344 (module 889); duplicate engine copy chunk.vendor.js:122559 (module 945)
- [ ] UI-I18N-004 Language lookup: lookupLanguage(tag) matches the translation entries by full abbreviation, then by the first two letters, then a hard-coded en/de/zh(so)/pt/es/fr/pl/ru/tr/cs/it/ja/nl/sv switch, default English. lookupLocale(n) returns the lowercased abbreviation. _supportedISO6391Locales lists 13 codes (no sv, no zh-TW). Dates and currency use getLocaleLanguageTag — old: chunk.vendor.js:112529 (module 889)
- [ ] UI-I18N-005 Runtime translation fetch: setLanguage(lang) finds the entry, fetches the Designer and Cloud JSON for its abbreviation from a CDN URL given by gApi.fetchTranslationsURL(abbr, project) (cached per abbr/project, skipped when a HEAD etag equals the bundled etag), replaces values, then sets GLocale, GLocaleFactory and gApi language. Errors are swallowed (stays English) — old: designer.browser.dev.js:58736 (module 1037)
- [ ] UI-I18N-006 Startup language: gContainer.initLanguage reads "designer.settings".language if it is one of GravitLanguages (= GLocale.getAvailableLanguages()), else the system language, else English; an explicit language param overrides and is written to setting "language" — old: designer.browser.dev.js:3229 (module 85)
- [ ] UI-I18N-007 Language switch action GSwitchLanguageAction (id "language.<n>", category Help > Language, checkable): saves setting "language", updates the cloud user locale (login required unless anonymous), then reloads (browser/PWA) or shows "restart app". Titles exist only for the first 6 languages (English, Deutsch, 中文, Português, Español, Français). The module is imported in the app main module but never instantiated, so the old build has no language menu — old: designer.browser.dev.js:156003 (module 1620); import 119107 (module 1483)
- [ ] UI-I18N-008 Translation manager (in-app translation tool backend): per-project translations, extended/temporary overrides, CSV import/export — old: designer.browser.dev.js:106602 (module 1343)
- [ ] UI-I18N-009 Language names table GBCP47LanguageTags (text.lang.<code>, hundreds of entries) used by the text language select — old: designer.browser.dev.js:52392 (module 814)

### Tooltips

- [ ] UI-TOOLTIP-001 GRichTooltipConfig {title (required), description, video, pic, isPro, middle, shortcut, videoTimeout, marginLeft, side, learnMore, upgradeToProStatsValue, forceShow, flipHorizontal}; TOOLTIP_AREA TOOLBAR/SIDEBAR/MAIN_MENU — old: designer.browser.dev.js:2769 (module 67)
- [ ] UI-TOOLTIP-002 Rich tooltip gRichTooltip: 500 ms hover (instant if one is open), closes 100 ms after leaving; gOverlay `.g-rich-tooltip-container.g-tooltip-content-overlay`; content `.g-tooltip-content-wrapper(.g-pro)` header (`.simple` when not enhanced) with shortcut + title, description + Learn more, looping video, 298×160 picture, pro footer. Defaults videoTimeout 2000, middle true. Disabled in the Corel build unless forceShow — old: designer.browser.dev.js:173397 (module 1728)
- [ ] UI-TOOLTIP-003 Enhanced tooltips toggle (help.tooltip-visibility): gContainer "designer.settings.enhanced-tooltips.enabled", default true; off = title + shortcut only — old: designer.browser.dev.js:106553 (module 1342)
- [ ] UI-TOOLTIP-004 Simple tooltip: one body-level `div.g-tooltip` for any `[data-title]` (unless a rich tooltip is attached), 500 ms delay, instant within 500 ms of the last, centred below (flips above), `data-custom-left-offset`, `data-wrap` — old: designer.browser.dev.js:164458 (module 1673)

### Notifications

- [ ] UI-NOTIFY-001 Notification panel GNotificationPanel `.g-notification-panel` (g-hide when empty): close, `.content > .message`; plain, builder, custom (class, enter/exit animations, timeout, removed 600 ms after exit), popup, anonymous promo. Fed by gDesigner.addNotification via GNotificationEvent. This is the toast system; there is no other toast/snackbar — old: designer.browser.dev.js:163319 (module 1666)
- [ ] UI-NOTIFY-002 Auto-save toast `g-auto-save-notification` (5 s, spinner, random message of 3, or "failed"); closing sets gContainer "designer.settings.auto-save-hide-notification" — old: designer.browser.dev.js:95466 (module 1276)
- [ ] UI-NOTIFY-003 Document notifications panel `.g-document-notification-panel` (update available: Cancel / Update now) — old: designer.browser.dev.js:164251 (module 1669)
- [ ] UI-NOTIFY-004 Collaborative text panel `.g-collaborative-text-panel` and `.g-request-lock-dialog` (cloud) — old: designer.browser.dev.js:163577 (module 1668)
- [ ] UI-NOTIFY-005 Software update panel `.software-update-panel` (available, progress, ready, updating, none, release notes, error); Electron — old: designer.browser.dev.js:162924 (module 1665)
- [ ] UI-NOTIFY-006 Reminder manager (trial/pro reminders, only while idle; keys stored as settings) — old: designer.browser.dev.js:103940 (module 1325)

### Touch UI

- [ ] UI-TOUCH-001 Touch mode switch: isTouchEnabled = iPad runtime, or TOUCH_LAYOUT && pro && setting "touch" (default false). Toggles `body.g-touch`, assistant bar, touch tools, pattern chooser variant — old: designer.browser.dev.js:122603 (module 1491)
- [ ] UI-TOUCH-002 GToggleTouchAction "view.toggle-touch" (View menu, checkable, hidden for guests/iPad) — old: designer.browser.dev.js:156828 (module 1634)
- [ ] UI-TOUCH-003 Touch device prompt at startup (pro OK; one-time key designer.settings.dont_show_supported_touch_dialog) — old: designer.browser.dev.js:120126 (module 1483)
- [ ] UI-TOUCH-004 Touch editor options: larger handles (23*DPI rotate, rotate handle at bottom, keep-ratio handle), pickDistance 20, annotPickDistance 4; desktop defaults restored on exit — old: designer.browser.dev.js:123587 (module 1491)
- [ ] UI-TOUCH-005 Touch toolbar in sidebars `.g-touch-toolbar` with `button.g-touch-toolbar-button[g-touch-tool]` (+ `.count > .scale` badge); tapping sets the sidebar width to panelWidth, again collapses; `.align-active`, `.sidebar-inspector.expand`; default right width 300 — old: designer.browser.dev.js:139378 (module 1540)
- [ ] UI-TOUCH-006 GTouchTool model {def, id, sidebar, icon, panel, toolbar, panelWidth, activate, deactivate}; tools pages (320), layers (350), symbols, libraries, annotation, appearance (380), fill/border/effect (368), dimension.align (370), dimension.dimension (395), document (380) — old: designer.browser.dev.js:14688 (module 340)
- [ ] UI-TOUCH-007 Touch top toolbar `.section.menu-section.g-touch-only`: hamburger `.menubar-toolbar-button`, `.open-toolbar-button`, `.save-toolbar-button`, `.undo-toolbar-button`, zoom, snap — old: designer.browser.dev.js:142757 (module 1543)
- [ ] UI-TOUCH-008 Touch zoom button with `g-zoom-menu` (fit all, fit selection, 50, 100, 200, 400%) — old: designer.browser.dev.js:142712 (module 1543)
- [ ] UI-TOUCH-009 Touch files button `.window-button.g-touch-only` (replaces tabs; `span.ending` shows last 3 chars) — old: designer.browser.dev.js:142813 (module 1543)
- [ ] UI-TOUCH-010 Electron window controls `.native-button.g-touch-only` → overlay `g-toolbar-native-button-overlay` (not on macOS) — old: designer.browser.dev.js:142852 (module 1543)
- [ ] UI-TOUCH-011 Assistant bar (#assistant-bar, bottom 50px, centered, radius 10, bg #f0efef): gCollapsible `.container > .left-side + .right-side`; right side state in gContainer "designer.assistant-bar.left-side.expanded" — old: designer.browser.dev.js:152602 (module 1587)
- [ ] UI-TOUCH-012 Assistant bar buttons: Shift (86px, double-tap latches), Copy, Paste (split: in place, inside, replace, style), Delete, Select/Deselect all, Arrange menu, Fullscreen; Ctrl (86px), Alt (114px), Group, Ungroup, Convert to path, Help; arrow keys — old: designer.browser.dev.js:152738 (module 1587)
- [ ] UI-TOUCH-013 Virtual keys `.g-virtual-key-<key>` dispatch keydown/keyup; arrows repeat every 100 ms; modifiers via GPlatform.holdKey — old: designer.browser.dev.js:152625 (module 1587)
- [ ] UI-TOUCH-014 gCollapsible plugin `.g-collapsible.g-transitions-off.expanded|collapsed` + vertical/horizontal — old: designer.browser.dev.js:104924 (module 1337)
- [ ] UI-TOUCH-015 Quick help screen `body.g-quick-help` + `.g-quick-help-screen.<lang>`: static gesture tips and tooltips anchored to toolbar buttons, touch tools and keys — old: designer.browser.dev.js:153194 (module 1589)
- [ ] UI-TOUCH-016 Touch context menu (long-press) gOverlay `context-menu-touch-overlay`: `.transform-section` (flip, rotate), `.paste-section`, `.compound-section`, `.path-section`, `.symbol-section`, `.text-section`, `.image-section`, lock/hide, `.select-menu-button` — old: designer.browser.dev.js:149032 (module 1563)
- [ ] UI-TOUCH-017 Canvas properties in touch `.canvas-properties-touch` and `.page-size-and-bleed-properties-touch` rows — old: designer.browser.dev.js:154711 (module 1604)
- [ ] UI-TOUCH-018 Long-press → "long-press" CustomEvent → jQuery contextmenu at the touch point — old: designer.browser.dev.js:165700 (module 1693)
- [ ] UI-TOUCH-019 Z-order juggling: mousedown on sidebars / assistant bar / notification panel adds `.bring-to-front` to it — old: designer.browser.dev.js:122954 (module 1491)
- [ ] UI-TOUCH-020 HTML5 drag-and-drop touch polyfill — old: designer.browser.dev.js:120522 (module 1488)

### Persisted user data

In the browser runtime, gContainer.getProperty/setProperty is a thin wrapper over localStorage with JSON values, so every gContainer key below is a localStorage key (Electron and iPad containers override it).

- [ ] UI-STORAGE-001 gContainer property store (browser): getProperty(key) → Promise of JSON.parse(localStorage[key]) or null; setProperty → localStorage.setItem(key, JSON.stringify(v)); removeProperty, key-by-index, length. setCookie(name, value) writes the cookie for "/" and for the configured DOMAIN — old: designer.browser.dev.js:3144 (module 85)
- [ ] UI-STORAGE-002 "designer.settings": JSON object of every setting (see SETTING section), merged with defaults on load — old: designer.browser.dev.js:122198 (module 1491)
- [ ] UI-STORAGE-003 "swatches": JSON array of serialized GSwatch/GPattern strings (all global-* scopes concatenated; split by prefix on load) — old: designer.browser.dev.js:122258 (module 1491)
- [ ] UI-STORAGE-004 "recent_documents" (Electron only): array of up to 10 unique ids. "recent_external_<uid>": base64 of a JSON array of up to 10 strings `{"type":"googledrive"|null,"file":{...}}` — old: designer.browser.dev.js:122428 (module 1491)
- [ ] UI-STORAGE-005 "offline_cache": {license, user, lastUpdate} for offline start — old: designer.browser.dev.js:31055 (module 785)
- [ ] UI-STORAGE-006 Small UI flags (JSON booleans unless noted): "designer.settings.dimension.preserveratio" (96703), "designer.settings.enhanced-tooltips.enabled" (106558), "designer.settings.outline-view.enabled" (98235), "OutlineSidebar/Multipage_Mode" (81706), "designer.assistant-bar.left-side.expanded" (152960), "GFilesPanel.maximized", "GFilesPanel.isFilesListStyle" (143881), "designer.settings.warn-linked-image-dialog.never-remind", "designer.betaflow.dismiss-warning-dialog", "designer.settings.auto-save-warn-dialog-shown", "designer.settings.auto-save-hide-notification" (94816), one-time dialog keys "designer.settings.dont_show_unsupported_browser_dialog", "...dont_show_unsupported_screen_size_dialog", "...dont_show_supported_touch_dialog" — old: designer.browser.dev.js:96703 (module 1294)
- [ ] UI-STORAGE-007 PWA prompt keys "pwa.closed-install-pwa-dialog-date" (date) and "pwa.show-install-dialog-3-times-a-week" — old: designer.browser.dev.js:75704 (module 1172)
- [ ] UI-STORAGE-008 Files panel / cloud drive keys: "designer.filespanel.base-drive.current-folder", "designer.filespanel.cloud-drive.current-folder", "designer.filespanel.google-drive.current-folder", "designer.filespanel.cloud-accounts.<userId>", "designer.filespanel.cloud-accounts.active", "designer.filespanel.cloud-account.sharepoint.token.<settingsId>" — old: designer.browser.dev.js:143806 (module 1545); 51514 (module 802), 55231 (module 862), 147197 (module 1553), 78869 (module 1239)
- [ ] UI-STORAGE-009 Auth/integration keys: "googleapi_auth_key" {access_token, expires_at}, "googleapi_auth_email_hint", "msteams.authentication.tokens" (raw localStorage), "sp_getToken_data", ADAL cache entries "adal.*" (sessionStorage or localStorage per config; cleared on logout) — old: designer.browser.dev.js:58579 (module 1036); 79778 (module 1242); 78947 (module 1239); 114823 (module 1476)
- [ ] UI-STORAGE-010 Electron/app keys: "install_update_on_start", "last_update_check", "old_version", "enabled_subscriptions" — old: designer.browser.dev.js:164688 (module 1676); 124148 (module 1491)
- [ ] UI-STORAGE-011 Dev mod keys (raw localStorage): "enable_mods" (any value enables), "designer.custom" JSON [{name, code, id}] — old: designer.browser.dev.js:139790 (module 1541)
- [ ] UI-STORAGE-012 IndexedDB "gravitFontsDB" v1, store "gravitFonts": key "_gravit_font_list_" → [{family, weight, style "N"|"I", subfamily, displayname}], key "<family>_<weight>_<style>" → font ArrayBuffer/DataView. Only IndexedDB use in the app — old: designer.browser.dev.js:77353 (module 1198)
- [ ] UI-STORAGE-013 Cookies: "_gcoupon" read for coupons; setCookie helper; the bundled Amplitude analytics SDK (module 1739) keeps its own cookie/localStorage entries — old: designer.browser.dev.js:123982 (module 1491); 177255 (module 1739)
- [ ] UI-STORAGE-014 Engine token: chunk.vendor.js assigns `window.localStorage._token` as a plain property (persists as localStorage key "_token" in browsers) — old: chunk.vendor.js:69574
- [ ] UI-STORAGE-015 Document-level UI state saved in the file, not in storage: layer expanded flags (GNode.Flag.Expanded), document swatches, shared styles, export rows (`__export`), version history entries — old: designer.browser.dev.js:168598 (module 1706)

### Notes for the rewrite

- Locale: the bundle only ships English. The other 14 languages are fetched from a CDN through gApi.fetchTranslationsURL, which the rewrite won't have, and the language menu action is never instantiated. Plan to extract the English tables from module 814/815 into JSON keyed by class id and key (the GLocaleKey pair), and treat other languages as a later import. The tables are duplicated four times (app 814/815 and 821/822, engine 885 and 941); use one copy.
- Settings live in one JSON object under localStorage "designer.settings". Keep that key and shape if old users' settings should carry over. Several dialog rows are bound inverted (store text path, scrubbing, auto-save warning), and Save writes keys for rows that aren't rendered. Save only rendered rows in the port.
- Other localStorage keys are scattered constants across about 30 modules. A typed storage module with one list of keys would replace them; the STORAGE section is that list.
- Themes are two complete stylesheets swapped by rewriting the link href. The port can keep loading designer.browser.light.css/dark.css as is, but the theme-dependent colours hard-coded in JS (guide lines, label colour, touch shadows) need to come from the same theme source.
- Effect settings UIs are mostly generated from engine metadata (shp + RANGES). Build one generic React renderer and hand-write only the ten special forms (five shadows, blur, overlay, color grading, mirror, adjust multi).
- Export lives in the left outline sidebar (rows) plus the export dialog (module 1513). There is no export section in the inspector.
- Dead or unreachable UI that can be dropped or deferred: banner and overlay parts, bottom #panels, persona bar, spectator mode, templates panel, cloud sync rows in scene properties, appearance even-odd select, the "_tv" font variation select, Windows Store dialog, translation tool, custom mod buttons.
- Cloud-only UI (comments, review docker, collaborators, share, login, purchase, files panel cloud views) depends on a backend the rewrite may not have. Inventory kept here so they can be cut deliberately.
- CSS class typos must stay as-is to match the stylesheets: page-hiden, toogle-page-mode, pattern-choose-actived, transform-titile, cymk-label.
- Shapes other than fill/border/effects/text have no root class of their own; their CSS hangs on row classes (rectangle-properties, compound-row, ellipse-shape-property).
- Alt/Option is overloaded in the layers panel (siblings for lock/visibility, duplicate on drag, zoom on click); port all three.
- The preset tables were edited after the original Corel release (iPhone 16, Pixel 9, Threads) and are hard-coded English.

## File formats, import/export, workers and platform

Scope: the .gvdesign format and its embedded preview, every import and export path, the clipboard formats, the workers, autosave, local file storage, the service worker and PWA, the stub server and WebSocket, Electron and electron-builder, the Windows thumbnail provider and its CI, and the bundled docs.

References: `d` lines are in public/designer.browser.dev.js and `v` lines in public/chunk.vendor.js. Module ids come from next/docs/rewrite/old-module-index.tsv. The minified single-line files (workers, ps*.js, heic2any chunk) are cited as `file:1 (char ~N)` by byte offset. Items marked (to drop) are cloud, license, subscription or Corel integration code that the rewrite should not carry over.

### .gvdesign format

- [ ] FMT-GVD-001 Container: the whole file is one gzip stream (pako level 9) holding a single JSON object, the serialized GScene. There is no zip, no own header and no magic beyond gzip's 1F 8B. MIME application/gravit+design, extension gvdesign. FILE_FORMATS = [{ext:"gvdesign", type:"application/gravit+design", default:true}], plus FOLDER_FORMAT "application/gravit+folder" (cloud, to drop). File-type table entry GVDESIGN {load, store, default, category "gravit"} — old: public/designer.browser.dev.js:23758 (module 519); public/designer.browser.dev.js:15972 (module 389)
- [ ] FMT-GVD-002 Write path GDocument.store(storageItem, done, fail, opts): counts scene descendants, defers 10 ms, GNode.serialize(scene, {save:true, ...opts}), fails with "text.cannot-save" if the result is empty or shorter than the descendant count, defers again, gzips, fails "GZIP compression fail" if bytes ≤ 20 + count, then storageItem.write(bytes). Progress 10/50/75. On success marks the editor save point and adds the file to recent files — old: public/designer.browser.dev.js:7363 (module 163)
- [ ] FMT-GVD-003 Read path: GDocument.load(item) → item.read → _loadDataIntoDocument → unzipData → deserializeData → GNode.deserializeAsync. unzipData falls back to plain UTF-8 JSON when gunzip fails, so uncompressed .gvdesign files open too. After load it waits for pending fonts and shows the missing-fonts dialog — old: public/designer.browser.dev.js:6912, :6456, :6465 (module 163); unzipData public/designer.browser.dev.js:4821 (module 119)
- [ ] FMT-GVD-004 Node blob schema (GNode.store): "@" registered class name, "@id" node id (left out when copying), "$" array of child blobs, "#" referenceId, "&" multiReferenceId, plus custom "@xxx" attributes copied verbatim. Options: save, copy, copyIgnoreProperties, singleton, exceptions, passChildFilter, lastModifiedDate, beautify (4-space indent) — old: public/chunk.vendor.js:289 (store), :438 (serialize) (module 2 GNode)
- [ ] FMT-GVD-005 Property encoding: storeProperties writes blob[name] = this["$"+name] only when the value differs from the class default (deep equals); restoreProperties fills missing keys from the defaults. The per-class default tables are therefore part of the file format and must be kept exactly — old: public/chunk.vendor.js:837, :849 (module 2)
- [ ] FMT-GVD-006 Restore: JSON.parse (logs "invalid JSON", yields null), class lookup via _nameToNodeClassMap (unknown "@" → node silently dropped), progress 20 + 80·restored/total. deserializeAsync runs in time slices (scheduler module 640, 0/15 ms) — old: public/chunk.vendor.js:348 (restore), :475 (deserialize) (module 2); public/chunk.vendor.js:112927 (module 894)
- [ ] FMT-GVD-007 Registered node type names ("@" values): scene, page, layer, group, path, compoundpath, rectangle, ellipse, polygon, text, collabtext, image, imagegrid, slice, symbol, connector, style, styles, swatch, swatches, effects, paintLayers, paintLayer, fillPaintLayer, borderPaintLayer, the *Effect / GGL*Effect types, annotation nodes (ann, annlst, anp, ant, cmt). Some names come through minified variables and need resolving one by one — old: public/chunk.vendor.js:557 (_registerNodeClass, module 2)
- [ ] FMT-GVD-008 Scene root properties: v:10, lmd, cid, cfs, can, asec, ut (unit, px), ur:1, gx/gy:10, gm, lgm, gaw/gah/ga1/ga2 (axonometric grid), hgl/vgl, name, _links, __ids, rb, cst, dpi, pi (active page index), cm (color mode RGB); pgx:2, mp; lbs:10, lbp:7, lbc, mve. On save: lmd = Date.now() (or opts.lastModifiedDate), pi = active page, __ids = all ids, cid/cfs left out for singleton (local) saves, cst left out with dontStorePaths. Extra root keys: dictionary, symbolDictionary, mpg/empg/ompg (master pages). Restore also maps inherited page props w, h, ml, mt, mr, mb, bl, bck, bop — old: public/chunk.vendor.js:33515 (MetaProperties), :34736 (Store/Restore handler) (module 160 GScene)
- [ ] FMT-GVD-009 Versioning and migration: there is no effective file version. "v":10 equals its default, so it is never written and nothing reads it. setFileFormatVersion/saveFileFormatVersion are empty stubs. Only migration: a missing root "dictionary" sets _pre310 = true and GText recomputes legacy height (_legacyHeight). Per-node fixes in restore handlers, e.g. GImage defaults ipfc=false and derives itrf from trf — old: public/chunk.vendor.js:34743 (module 160), :18221 (module 70 GText), :24693 (module 95 GImage); stubs public/designer.browser.dev.js:6027 (module 163)
- [ ] FMT-GVD-010 Image/asset embedding via the scene dictionary: GImage.url and pattern layers (_pt._url) hold "dictionary://<uuid>". Root "dictionary": {entries:[{uuid, value, references}]}; value is a data: URL (embedded base64 image), http(s) URL, file:// (Electron linked file) or "cloud://id=…" (to drop). serialize() runs sanitize() (re-creates missing entries from storedUrl/rawUrl) and flush() (drops unreferenced entries). Deduplicated via putValueIfAbsent — old: public/chunk.vendor.js:44867 (module 227 GDictionary), :92130, :92318 (module 658 GSceneDictionary), :24693 (module 95)
- [ ] FMT-GVD-011 Image URL resolution on load: file/http/data URLs pass through; dictionary/gravit/document/asset/magenta values go through gApi.resolveUrls and are fetched into data URLs (cloud part to drop). Size limits GPlatform.maxPngDataSize and maxImgDataUrlLength ("text.image-in-design-too-big") — old: public/designer.browser.dev.js:4301 (module 119); public/chunk.vendor.js:14371 (module 64)
- [ ] FMT-GVD-012 Fonts are not embedded: text keeps family/style names only; missing fonts trigger the missing-fonts dialog after load. User fonts live in IndexedDB (FMT-STORAGE-014) — old: public/designer.browser.dev.js:6975 (module 163)
- [ ] FMT-GVD-013 Styles and swatches are ordinary scene children ("styles", "swatches"), created lazily by getStyles/getSwatches; symbols are in root "symbolDictionary" — old: public/chunk.vendor.js:34263, :35077 (module 160), :93288 (module 662 GSwatches), :119006 (module 915)
- [ ] FMT-GVD-014 Linked-file check: scene.hasLinkedFiles() is true when a referenced dictionary value starts with "file://"; Ctrl+S then shows a warning before saving — old: public/chunk.vendor.js:33698 (module 160); public/designer.browser.dev.js:19414 (module 447)
- [ ] FMT-GVD-015 Save sanity checks: verifyEnoughMemoryToSave; _verifyFileNotTooSmall warns "text.saveing-error" under 200 bytes (UN_BELIVEVABLE_FEW_BYTES_TO_SAVE) and re-serializes plus re-gzips the whole scene just to record documentRealFileSize; warns when the file shrank by more than half; disk full → "text.save-no-space" — old: public/designer.browser.dev.js:11272, :11318 (module 237); constant :23873 (module 519)
- [ ] FMT-GVD-016 Clipboard/drag node format: same JSON (array when several nodes) under MIME application/gravit+node, serialized with copy:true; patterns use application/gravit+pattern — old: public/chunk.vendor.js:279 (module 2), :237110 (module 1081 GEditorWidget)
- [ ] FMT-GVD-017 No other native formats: no .gvdproj/.gvd anywhere. Secondary formats (cdrapp, des = Corel) are hooks that always fail (_handleSecondaryFormatRead → LoadFailed, save → "text.cannot-save") (to drop) — old: public/designer.browser.dev.js:7356 (module 163), :140357 (module 1541)
- [ ] FMT-GVD-018 Templates and presets from the cloud: gApi.getPresetTemplate, loadDesignData → getFile/getShare/getAutoSave → bytes, wrapped as GMarketingFileStorageItem "<id>.gvdesign"; reached via ?directlink= (base64 JSON {type: preset|template, id}) (to drop or replace with bundled templates) — old: public/designer.browser.dev.js:4516 (module 119), :109500 (module 1374), :109692 (module 1378)
- [ ] FMT-GVD-019 Cloud document plumbing: a scene with cid+cfs loaded locally triggers loadFromCloud/chooseLatestDocument; cloud upload gzips, md5-base64s, PUTs to signed URLs with Content-Encoding gzip plus a thumbnail; GFilesPanel._repackNativeBlob re-embeds images on download (to drop) — old: public/designer.browser.dev.js:6465 (module 163), :9612 (module 220), :144471 (module 1545)
- [ ] FMT-GVD-020 Swatch file .gvswatch: gzipped serialized GNode list. Export writes "Swatches.gvswatch"; import deduplicates into document or global swatches, error "fail-import-swatch" — old: public/designer.browser.dev.js:124544 (export), :124575 (import) (module 1491)

### Embedded preview

- [ ] FMT-PREVIEW-001 Preview embedding on save (local addition, commit fa7f72f): after serializing, buildPreview() runs; the JPEG blob goes through FileReader.readAsDataURL and is spliced in as the first root key: '{"_preview":"data:image/jpeg;base64,…",' + rest. No blob, no FileReader, an error, or 4 s elapsed → saved without preview. The deserializer ignores the key — old: public/designer.browser.dev.js:7444 (finish), :7465 (splice), :7477 (4 s timeout) (module 163)
- [ ] FMT-PREVIEW-002 buildPreview(): first GPage of the scene, its bitmap paint area, longest side scaled to 600 px ("600w"/"600h" via GBitmapExport.convertSizeToScale), toBitmap(sx, sy, 2, WHITE), toImageBlob("image/jpeg") with browser-default quality. The promise never settles without a page, so callers rely on the 4 s timeout. Also used for cloud autosave/upload thumbnails — old: public/designer.browser.dev.js:8296 (module 163); toImageBlob public/chunk.vendor.js:61453 (module 345)
- [ ] FMT-PREVIEW-003 What gvthumb expects: stream ≤ 300 MB, starts with 1F 8B and ≥ 18 bytes, gunzip via inflateInit2(16+MAX_WBITS) ≤ 512 MB, byte-scan for the first literal "_preview", string value with backslash escapes, must contain "data:" and ";base64", base64 via CryptStringToBinaryA, JPEG or PNG decoded by WIC. Contract for the rewrite: keep gzip-of-JSON and put "_preview" first — old: native/gvthumb/gvthumb.cpp:55 (GunzipAll), :98 (ExtractPreview), :288 (300 MB cap)
- [ ] FMT-PREVIEW-004 Check tool: gunzip → JSON.parse(...)._preview with regex fallback; prints mime and size, validates the JPEG/PNG signature, --extract writes the image out — old: scripts/check-gvdesign-preview.cjs:1
- [ ] FMT-PREVIEW-005 Cloud thumbnails: autosave metadata thumbnail from buildPreview(), PUT as image/jpeg with Cache-Control public,max-age=31600000 to url_t (to drop) — old: public/designer.browser.dev.js:137386 (module 1530), :137490 (module 1531)

### Import

- [ ] FMT-IMPORT-001 Importer registry: exports {GSVGImport, GPDFImport, GSketchImport, GEPSImport, GBitmapImport} and sets pdf.js workerSrc = "pdf.worker.js". Static classes, no base class — old: public/chunk.vendor.js:241766 (module 1201)
- [ ] FMT-IMPORT-002 File-type table: fields ext, mime, category, load, store, import_image, pro. Types gvdesign (default), heic (load only), png, jpg, jpeg, svg, svgz (load only), pdf, ai (pro), eps (pro), sketch (pro), zip. getFileTypesArray() returns only GVDESIGN, PNG, HEIC, JPG, JPEG, SVG, PDF, EPS, so AI, SVGZ and SKETCH are never offered by open, place or drop — old: public/designer.browser.dev.js:15968 (module 389)
- [ ] FMT-IMPORT-003 Open dispatcher GDocument.load by extension: gvdesign / SVG+SVGZ / EPS / PDF+AI / SKETCH / JPG+JPEG+PNG+HEIC; unknown → LoadFailed "error-reading-file". In the "lts" env everything needs PRO (to drop) — old: public/designer.browser.dev.js:6912 (module 163)
- [ ] FMT-IMPORT-004 PRO gate on open and drop: file types with pro:true call handlePROFeatureInterruption (to drop) — old: public/designer.browser.dev.js:122367 (module 1491), :7900 (module 163)
- [ ] FMT-IMPORT-005 GSVGImport.import(data, opts, fontManager, cb): accepts string, ArrayBuffer, Uint8Array or Blob; detects gzip magic (svgz); root must be <svg> else "Invalid svg document."; options baseWidth/baseHeight 400, forceBaseSize false, target, fontProvider; page size from viewBox or width/height with unit detection; single-child groups unwrapped, empty groups removed, textPath refs stored as rtxt/attachPath; cb(err, node, {width, height, unit}) — old: public/chunk.vendor.js:244938 (module 1390)
- [ ] FMT-IMPORT-006 SVG element handlers (canvg-derived): svg, rect, circle, ellipse, line, polyline, polygon, path, switch, pattern, marker, defs, linearGradient, radialGradient, stop, font/font-face/missing-glyph/glyph, text, tspan, textPath, tref, a, image, g, symbol, style (CSS), use, mask, clipPath, filter, feMorphology, feComposite, feColorMatrix, feOffset, feFlood, feDropShadow, feGaussianBlur, foreignObject, title, desc, plus gravitGraphicSource and gravitElementRef. Options log, useCORS — old: public/chunk.vendor.js:245783 (module 1391)
- [ ] FMT-IMPORT-007 SVG round-trip: gravitGraphicSource holds a CDATA of compressed serialized Gravit nodes and gravitElementRef points into it; re-import restores native objects (pair with FMT-EXPORT-010) — old: public/chunk.vendor.js:248740 (module 1391)
- [ ] FMT-IMPORT-008 SVG opened as document: a GPage result becomes the page, otherwise group children move onto the page; page w/h from the SVG size, scene "ut" from the SVG unit, paint mode Output — old: public/designer.browser.dev.js:7012 (module 163)
- [ ] FMT-IMPORT-009 GPDFImport.import(data, {startPage, endPage, pdfjsOptions}, fontManager, cb, progress, aiCallback): pdf.js with disableCMYKToRGB:true; each page → GPage (viewport size, white bck) via a custom canvas context and graphics class; returns (pages, missingFonts, embeddedFonts); FontManagerProxy waits for fonts — old: public/chunk.vendor.js:249096 (module 1393), canvas ctx :249189 (module 1394), graphics class :250496 (module 1397)
- [ ] FMT-IMPORT-010 PDF opened as document: all pages imported (no page-selection dialog), named "Page N", merged with the Q optimiser; missing-fonts dialog offers keep, otherwise text becomes fake text (outlines); progress per page — old: public/designer.browser.dev.js:7184 (module 163)
- [ ] FMT-IMPORT-011 AI import goes through the PDF path: isAIFormat checks XMP dc:format == "application/vnd.adobe.illustrator"; error "ai-not-pdf-compatible"; PRO-gated; place-AI is dead because AI is not in getFileTypesArray — old: public/chunk.vendor.js:249086 (module 1393)
- [ ] FMT-IMPORT-012 GEPSImport (EPS/PS) in ps.worker.js: init options outlineFonts (setting eps_outline_fonts, default true), maxWaitTime 300 s, hard 300 s timeout terminates the worker; cancel and progress; error codes 01 FailedColorUseBlue, 02 FailedElement, 03 Timeout, 04 General, 05 Canceled; PRO-gated — old: public/chunk.vendor.js:250764 (module 1403), :251383 (module 1404)
- [ ] FMT-IMPORT-013 EPS opened as document: Q optimiser, unresolved fonts → fake text, content moved to origin, page size from EPS size or trimToContent(), page bck from EPS background or white; "keep-fonts-eps" message — old: public/designer.browser.dev.js:7087 (module 163)
- [ ] FMT-IMPORT-014 Setting "eps_outline_fonts" toggle in the settings dialog — old: public/designer.browser.dev.js:94331 (module 1275)
- [ ] FMT-IMPORT-015 GSketchImport: zip.js reads meta.json and pages/*.json; rejects document version ≥ 50 ("unsupported-sketch-version-50+"), unknown format → "unsupported-version"; options progress, ignoreSymbolPage, workspace, fontProvider; symbol masters/instances; replacedFonts → missing-fonts dialog. PRO and unreachable from the open list (see 002) — old: public/chunk.vendor.js:239507 (module 1121), :239647 (module 1122); app side public/designer.browser.dev.js:7269 (module 163)
- [ ] FMT-IMPORT-016 GBitmapImport.import(blob, cb) → data URL. Limits maxImgDataUrlLength, maxImgLinearDimension (absolute >>> 1), maxImgAreaDots (absolute >>> 2), error "Size limit exceeded". Formats are whatever <img> decodes (PNG/JPG/GIF; no WEBP/BMP/TIFF entries) — old: public/chunk.vendor.js:251398 (module 1405)
- [ ] FMT-IMPORT-017 Per-browser canvas limits used by import and export: absoluteMaxImgLinearDimension 4096–65536 (Safari 4194304), absoluteMaxImgAreaDots, maxPngDataSize, maxImgDataUrlLength — old: public/chunk.vendor.js:14267 (module 64 GPlatform)
- [ ] FMT-IMPORT-018 Raster opened as document: new scene, page sized to image, page bck white unless PNG, one GImage(iw, ih, url); error "image-too-big" — old: public/designer.browser.dev.js:6962 (module 163)
- [ ] FMT-IMPORT-019 HEIC: heic2any lazy-loaded (chunk 12), converted to a blob, then bitmap import — old: public/designer.browser.dev.js:113334 (module 1472); call sites :7331, :7845 (module 163)
- [ ] FMT-IMPORT-020 placeOrImport(file, {x, y, center}, …): imports into the current document at the drop point, names the element after the file. Size check file.size > maxPngDataSize (÷4 for JPG except iOS) → "image-too-big". Accepts JPG/JPEG/HEIC/GIF/PNG, SVG/SVGZ, PDF (first page only, wrapped in a named GRectangle), EPS (wrapped, background fill if any). Undo labels "import-from-pdf/ai/eps" — old: public/designer.browser.dev.js:7598 (module 163)
- [ ] FMT-IMPORT-021 GPlaceImportAction "file.place-import" (Alt+P, File > Import > Place Image…): import_image types, hidden on iPad, needs isImportResourcesEnabled — old: public/designer.browser.dev.js:95773 (module 1283)
- [ ] FMT-IMPORT-022 GLinkImageAction "file.link-import": Electron-runtime only, links the image as file://<id> in the scene dictionary instead of embedding (unreachable today, see FMT-ELECTRON-010) — old: public/designer.browser.dev.js:95545 (module 1280)
- [ ] FMT-IMPORT-023 GImportImageFromIOSAction (source PHOTOS / FILES) → placeOrImport — old: public/designer.browser.dev.js:157025 (module 1638)
- [ ] FMT-IMPORT-024 Drag & drop: GEditorWidget._handleDrop fires FileDropEvent per file at page coordinates; GDocument._dropFileEvent resolves extension (name, then MIME) → placeOrImport. Non-file drops: gravit node, pattern, font family, custom, text/plain. Dropping a .gvdesign does nothing — old: public/chunk.vendor.js:237093 (module 1081), :20011 (module 82); public/designer.browser.dev.js:8155 (module 163)
- [ ] FMT-IMPORT-025 Font import GImportFontsAction "font.import" (File > Import > Add fonts, PRO tooltip): ttf, otf, ttc, dfont; collections split with GOpenTypeUtil.getFont; stored in IndexedDB gravitFontsDB, deduplicated by family/weight/style; font provider reset — old: public/designer.browser.dev.js:154941 (module 1608), :80073 (module 1245), DB :77294 (module 1198)
- [ ] FMT-IMPORT-026 Local system fonts via window.queryLocalFonts with "local-fonts" permission and warning dialog (LOCAL_FONTS_API_ENABLED) — old: public/designer.browser.dev.js:166692 (module 1700)
- [ ] FMT-IMPORT-027 Local font agent: WebSocket client to ws(s)://127.0.0.1:32119 (DEFAULT_PORT, scans a port span) for a native Gravit font helper (to drop) — old: public/designer.browser.dev.js:109969, :110048 (module 1380)
- [ ] FMT-IMPORT-028 Import font resolver queryFirst: maps imported font names to the closest available family by Levenshtein distance; fed to GPDFImport.updateFontFamilies before PDF import — old: public/designer.browser.dev.js:8401 (module 163)
- [ ] FMT-IMPORT-029 GMissingFontsDialog: "fonts-missing" / "fonts-not-found", action keep-fonts, otherwise fake text — old: public/designer.browser.dev.js:53302 (module 841)
- [ ] FMT-IMPORT-030 Import optimiser Q(): merges consecutive sibling GPaths with identical geometry and style (after PDF and EPS) — old: public/designer.browser.dev.js:8374 (module 163)
- [ ] FMT-IMPORT-031 CorelDRAW (CDR) secondary formats stubbed; createCDRIntegrationEngine() returns null (to drop) — old: public/designer.browser.dev.js:23757 (module 519), :152115
- [ ] FMT-IMPORT-032 Figma import: not present (0 hits for "figma" in both bundles) — old: n/a

### Export

- [ ] FMT-EXPORT-001 Exporter registry {GBitmapExport, GPDFExport, GSVGExport}, static classes, no shared interface — old: public/chunk.vendor.js:109727 (module 797)
- [ ] FMT-EXPORT-002 GBitmapExport.export(node, size, bgColor, configuration, dpi, bgOpacity, clampToMax): toBitmap with forceEffectsWhenZoomed; clampToMax shrinks scale ×0.9 until under the max canvas size; helpers getBitmapPaintArea, getNodeSelfBitmapUsedArea, getMaximumCanvasSize — old: public/chunk.vendor.js:109743 (module 798)
- [ ] FMT-EXPORT-003 Size spec parser convertSizeToScale: "Nx" scale, "Nw" width, "Nh" height, "Ndpi" (DPI metadata or scale relative to 72), "WxH" fit to box — old: public/chunk.vendor.js:109806 (module 798)
- [ ] FMT-EXPORT-004 GBitmap.toImageBlob/toImageBuffer/toImageDataUrl: ImageType only PNG and JPEG (no WEBP/GIF/BMP/TIFF); when dpi ≠ 72 rewrites PNG pHYs / JPEG JFIF density — old: public/chunk.vendor.js:61419 (module 345)
- [ ] FMT-EXPORT-005 exportExportable: png/jpg via GBitmapExport at 72 dpi, JPEG quality (jpegQuality||100)/100; svg/pdf dispatch; unknown format throws — old: public/designer.browser.dev.js:80555 (module 1253)
- [ ] FMT-EXPORT-006 GSVGExport.DefaultOptions: forceRoot false, viewBox true, clipToPage false, preserveEditingCapabilities true (app passes false), layerNamesAsId false, print false, rasterizeUnsupportedObjectsByCDR undefined, useImageDictionary true, unit pt, dpi 72, includeInvisible false, annotations false; per-class Encoders table — old: public/chunk.vendor.js:254884 (module 1455)
- [ ] FMT-EXPORT-007 GSVGExport.export(node, opts, cb): temporarily sets page bck/bop from backgroundColor/Opacity, decimalPlacesPrecision (default 3), viewBox from bbox, width/height in pt, postProcess pass — old: public/chunk.vendor.js:255876 (module 1455)
- [ ] FMT-EXPORT-008 SVG layer names as IDs: id = layer name or translated type name; also writes stored "svgattrs" attributes — old: public/chunk.vendor.js:70782 (module 438)
- [ ] FMT-EXPORT-009 SVG text to curves when convertTextToPath, for fake text, more than one fill/border, or "dir" set — old: public/chunk.vendor.js:256128 (module 1455)
- [ ] FMT-EXPORT-010 SVG preserve editing capabilities: wraps content in <switch> + foreignObject/gravitElementRef and appends gravitGraphicSource with compressed serialized nodes — old: public/chunk.vendor.js:255937 (module 1455)
- [ ] FMT-EXPORT-011 SVG raster fallback checkRasterize: unsupported effects become an embedded PNG <image> at opts.dpi; natively supported: blur, GL blur, drop shadow, inner shadow — old: public/chunk.vendor.js:255267, list :254985 (module 1455)
- [ ] FMT-EXPORT-012 SVG unsupported-features report (texture, angular gradient, background fills, unsupported effects) shown after export unless disable_warning_unsupported_features — old: public/chunk.vendor.js:255009 (module 1455); public/designer.browser.dev.js:7519 (module 163)
- [ ] FMT-EXPORT-013 SVG images: image dictionary, transform matrix, blend mode, opacity, effects markup — old: public/chunk.vendor.js:255962 (module 1455)
- [ ] FMT-EXPORT-014 GPDFExport.export(node|scene|array, opts, cb, writer, messenger): colorSpace "rgb"/"cmyk" (table also RGBA, GRAY), dpi (min 72), configuration.ignoreEffects, jpegQuality, downsampleImages, backgroundColor/Opacity, convertTextToPath, user (→ Author), title, progress, disableWorker. PDF 1.7, compressed. A scene exports all pages; a GSlice uses the parent page bck; abortable — old: public/chunk.vendor.js:251500 (module 1406); color spaces :62326 (module 359)
- [ ] FMT-EXPORT-015 PDF bleed: page property "bl" (default 0) sets /BleedBox. No crop marks, TrimBox, OutputIntent or PDF/X — old: public/chunk.vendor.js:251553 (module 1406), :253450 (module 1439), GPage default :22633 (module 83)
- [ ] FMT-EXPORT-016 PDF effects: non-vectorable nodes rasterized at export dpi; background-affected effects replaced by a cropped page bitmap; drop and inner shadows drawn natively (modules 1448/1449) — old: public/chunk.vendor.js:251590 (module 1406)
- [ ] FMT-EXPORT-017 PDF text: CID fonts by default, outlines for multiple fills/borders, "dir" or convertTextToPath — old: public/chunk.vendor.js:251851 (module 1406), CID font :252867 (module 1431)
- [ ] FMT-EXPORT-018 PDF images: DCT at jpegQuality for JPEG sources, else Flate; alpha → SMask; optional downsampling to placed size; GPDFDocument default jpegQuality 85 — old: public/chunk.vendor.js:243218 (module 1216), :252252 (module 1422)
- [ ] FMT-EXPORT-019 PDF size guard GPDFExport.isSupported (raster areas vs maxPngDataSize), dialog shows "pdf-limit" — old: public/chunk.vendor.js:251467 (module 1406)
- [ ] FMT-EXPORT-020 PDF metadata: /Author, /Producer "Gravit Designer PDF Exporter", /Creator, /Title (default "Untitled"), /CreationDate — old: public/chunk.vendor.js:252699 (module 1426)
- [ ] FMT-EXPORT-021 PDF export worker pool: navigator.hardwareConcurrency (default 4) workers from pdfexport.worker.js?v=random, same-origin check or Blob importScripts fallback, passed to GPDFDocument {version 1.7, compress true, colorSpace, workers, user, title, jpegQuality, downsampleImages} — old: public/chunk.vendor.js:251514, :251528 (module 1406)
- [ ] FMT-EXPORT-022 Export dialog GExportDialog, modes canvas / selection / assets. Defaults: size 1x, format png, jpegQuality 92, page bck/bop, convertTextToPath false, decimalPlacesPrecision 3, preserveEditingCapabilities false, layerNamesAsId false, downsampleImages false; options remembered between opens — old: public/designer.browser.dev.js:131123 (module 1513)
- [ ] FMT-EXPORT-023 Dialog format select PNG / JPEG / SVG / PDF; more than one item in non-PDF mode, or assets mode, produces a ZIP — old: public/designer.browser.dev.js:131309, :131978 (module 1513)
- [ ] FMT-EXPORT-024 Dialog size field and menu: 1x, 2x, 0.5x, 3x, 512w, 512h, 128x128, 300dpi; for PDF Default 72 / Web 96 / Medium 150 / High 300 dpi, default from scene "dpi" — old: public/designer.browser.dev.js:131338, :132411 (module 1513)
- [ ] FMT-EXPORT-025 Dialog JPEG quality slider 25–100, default 92 (JPEG_EXPORT_QUALITY_DEFAULT), shown for jpg and pdf — old: public/designer.browser.dev.js:131413 (module 1513), constant :23870 (module 519)
- [ ] FMT-EXPORT-026 Dialog background page / custom (pattern chooser) / none; none hidden for jpg and pdf, page hidden in selection mode — old: public/designer.browser.dev.js:131423, :132026 (module 1513)
- [ ] FMT-EXPORT-027 Dialog color mode RGB/CMYK (PDF only) — old: public/designer.browser.dev.js:131536 (module 1513)
- [ ] FMT-EXPORT-028 Dialog "With effects" (PDF only) → configuration.ignoreEffects — old: public/designer.browser.dev.js:131554 (module 1513)
- [ ] FMT-EXPORT-029 Dialog decimal places precision (SVG, PRO badge) — old: public/designer.browser.dev.js:131589 (module 1513)
- [ ] FMT-EXPORT-030 Dialog "Export text as curves" (SVG and PDF) — old: public/designer.browser.dev.js:131610 (module 1513)
- [ ] FMT-EXPORT-031 Dialog "Export all" toggles all preview items — old: public/designer.browser.dev.js:131644 (module 1513)
- [ ] FMT-EXPORT-032 Dialog "Layer names as IDs" (SVG, PRO badge) — old: public/designer.browser.dev.js:131679 (module 1513)
- [ ] FMT-EXPORT-033 Dialog "Preserve SVG editing capabilities" (SVG, PRO badge) — old: public/designer.browser.dev.js:131720 (module 1513)
- [ ] FMT-EXPORT-034 Dialog "Do not downsample images" (PDF, checked by default) — old: public/designer.browser.dev.js:131771 (module 1513)
- [ ] FMT-EXPORT-035 Dialog "Export to" destination, shown only with 2+ destinations supporting the format; checks write permission — old: public/designer.browser.dev.js:131818, :131947 (module 1513)
- [ ] FMT-EXPORT-036 Dialog warnings: PDF over 200 in → "canvas-bigger-than-200-in"; PNG/JPG above max canvas → "default-limit" (%width/%height/%area MP); PDF raster limit → "pdf-limit" — old: public/designer.browser.dev.js:131887, :132262 (module 1513)
- [ ] FMT-EXPORT-037 Dialog run _export: filters checked previews, saves/restores opacities, progress overlay, Cancel for PDF (abort), unsupported-SVG dialog afterwards — old: public/designer.browser.dev.js:132233 (module 1513)
- [ ] FMT-EXPORT-038 Free-user lock in the dialog: for free/anonymous/expired licenses every control except format traps clicks and logs "nonprotriespro" (to drop) — old: public/designer.browser.dev.js:131192, :131247 (module 1513)
- [ ] FMT-EXPORT-039 GExportAction "file.export" (Shift+Cmd+E), isPro()=true (gate to drop); paywall for commercial files, error for empty infinite canvas, "save-before-export" prompt for new docs; variant {format:"pdf"} is File > Export > PDF > Advanced options — old: public/designer.browser.dev.js:55047 (module 861); registered :119459, :119476 (module 1483)
- [ ] FMT-EXPORT-040 Quick export GSaveAsAction "file.save-as.<ext>": PNG, JPG, SVG plus PDF at 72/96/150/300 dpi; 300 dpi PDF is PRO-gated (gate to drop) — old: public/designer.browser.dev.js:18977 (module 445); list :119462–119478 (module 1483)
- [ ] FMT-EXPORT-041 Quick export implementation in GDocument.store: SVG/SVGZ active page with empty options (SVGZ gzip level 9); PNG/JPG active page 1x/72 dpi, JPG on white, no quality passed (browser default ~0.92, docs claim 100%); PDF whole scene, dpi, jpegQuality 92, title, author = user name — old: public/designer.browser.dev.js:7514, :7544, :7556 (module 163)
- [ ] FMT-EXPORT-042 Per-element export settings: node property "__export" = array of {sz size, sf suffix, fm format} — old: public/designer.browser.dev.js:18810 (module 442)
- [ ] FMT-EXPORT-043 GExportProperties panel ("Make exportable"): add/update/remove rows; new-row sequence 1x(""), 2x/@2x, 3x/@3x, 1.5x/@1,5x, 0.5x/@0,5x; format png/jpg/svg/pdf, suffix, size menu — old: public/designer.browser.dev.js:136163, rows :136255 (module 1523)
- [ ] FMT-EXPORT-044 Create slice(s) from selection: GSlice at the paint bbox inherits the element's __export rows; GSlice's SVG encoder is a no-op — old: public/designer.browser.dev.js:136132 (module 1523); GSlice public/chunk.vendor.js:55508 (module 289)
- [ ] FMT-EXPORT-045 Panel Export button exports the selection's __export rows as assets (directory or ZIP) — old: public/designer.browser.dev.js:136113 (module 1523)
- [ ] FMT-EXPORT-046 generateExportables: scene → visible pages; assets mode recurses containers collecting __export rows; unnamed elements get translated type name + "_N" — old: public/designer.browser.dev.js:80496 (module 1253)
- [ ] FMT-EXPORT-047 Naming generateExportName: sanitizeFilename(name) + suffix + "(n)" on duplicates (same name and format) + "." + format; "/" in a layer name creates subfolders (case-insensitive reuse) — old: public/designer.browser.dev.js:80653, :80664 (module 1253)
- [ ] FMT-EXPORT-048 Multi-export: chooseDirectory when the storage supports it, else ZipDirectory (zip.js fs, useWebWorkers=false) "<doc>.zip"; several PDF items outside assets mode merge into one multi-page PDF named after the document — old: public/designer.browser.dev.js:80726, ZipDirectory :80823 (module 1253)
- [ ] FMT-EXPORT-049 Commercial-product check _validateCommercialDocument on every export path → paywall (to drop) — old: public/designer.browser.dev.js:80551 (module 1253)
- [ ] FMT-EXPORT-050 Page context menu "Export Page" → GExportAction {element: activePage} — old: public/designer.browser.dev.js:101077 (module 1303)
- [ ] FMT-EXPORT-051 Print GPrintAction "file.print": SVG per page (convertTextToPath, 300 dpi PRO / 150 otherwise) as base64 <img> in an iframe; warnings on Firefox and on Electron with effects — old: public/designer.browser.dev.js:155055 (module 1609)
- [ ] FMT-EXPORT-052 CDR export prepareCDRforSaving: needs the CDR engine (null), error 507 when too big (to drop) — old: public/designer.browser.dev.js:53797 (module 847)

### Clipboard

- [ ] FMT-CLIP-001 Paste controller: accepted MIME text/xml, text/plain, image/svg+xml, image/png, image/jpg, image/jpeg, image/gif, application/pdf, text/uri-list — old: public/designer.browser.dev.js:101787 (module 1313)
- [ ] FMT-CLIP-002 Async Clipboard API pasteFromClipboard (needs clipboard-read permission), per-type handlers — old: public/designer.browser.dev.js:101864 (module 1313)
- [ ] FMT-CLIP-003 Paste-event path: on Firefox, Safari or without ClipboardEvent a hidden contenteditable paste area; pasted <img> converted dataURL → Blob; skipped while an input is focused — old: public/designer.browser.dev.js:101798, :101886 (module 1313)
- [ ] FMT-CLIP-004 text/uri-list paste fetches each URL and stores the blob under its MIME — old: public/designer.browser.dev.js:101840 (module 1313)
- [ ] FMT-CLIP-005 Internal paste: XML <gravit mimeType="application/gravit+node" restricted="docId|false"> → GNode.deserialize; restricted content only into the same document (filterUnrestrictedCommercialFileElements); SVG text payload → image/svg+xml — old: public/designer.browser.dev.js:101968 (module 1313)
- [ ] FMT-CLIP-006 Paste of a single fill, border or effect layer adds it to every selected element (pages, groups, symbols excluded) — old: public/designer.browser.dev.js:102030 (module 1313)
- [ ] FMT-CLIP-007 Paste of elements: shared styles deduplicated or created and sref remapped; a pasted page becomes a new page; centred in view on infinite canvas — old: public/designer.browser.dev.js:102068 (module 1313)
- [ ] FMT-CLIP-008 Plain-text paste: into the active inline editor, else a new GText with a script-appropriate font (getDefaultFamilyForString) and RTL direction — old: public/designer.browser.dev.js:102130 (module 1313)
- [ ] FMT-CLIP-009 Image/SVG/PDF paste → placeOrImport, undo label "paste-image" — old: public/designer.browser.dev.js:102180 (module 1313)
- [ ] FMT-CLIP-010 Copy/Cut "edit.copy"/"edit.cut": serializes with linked-element exceptions and referenced styles; writes internal clipboard, text/xml gravit wrapper and text/plain of text content; writeText fallback; error "security-issues" — old: public/designer.browser.dev.js:104238, :104467 (module 1331)
- [ ] FMT-CLIP-011 Copy style (fill/border/effect under the mouse context) — old: public/designer.browser.dev.js:104366 (module 1331)
- [ ] FMT-CLIP-012 Restricted copy for commercial files or when the app manager disables copy (to drop with the marketplace) — old: public/designer.browser.dev.js:104378 (module 1331)
- [ ] FMT-CLIP-013 GPasteAction "paste.paste" (Cmd+V): async clipboard first, internal clipboard fallback — old: public/designer.browser.dev.js:57728 (module 877)
- [ ] FMT-CLIP-014 Paste variants: paste style, paste and replace (keeps target transform), paste here, paste in place, paste inside — old: public/designer.browser.dev.js:57504 (module 875), :57593 (module 876), :76288 (module 1182), :76412 (module 1183), :76511 (module 1184)
- [ ] FMT-CLIP-015 New document from clipboard "file.new.clipboard" — old: public/designer.browser.dev.js:154566 (module 1602)
- [ ] FMT-CLIP-016 Copy Page (context menu) as gravit XML via gContainer.copyToClipboard — old: public/designer.browser.dev.js:101060 (module 1303)
- [ ] FMT-CLIP-017 App clipboard store get/setClipboardContent (MIME map) and container copyToClipboard (writeText or selection fallback) — old: public/designer.browser.dev.js:122163 (module 1491), :109446 (module 1374)

### Workers

- [ ] FMT-WORKER-001 autosave.worker.js (cloud autosave, to drop): created as new Worker("./autosave.worker.js") by GAutoSaveManager. First message {cmd:"SETUP_URL_ENDPOINT", data:{url}}; then {cmd, data, id:uuid, user}. "sync-images" {id, images:[{name,url}], entries, cloudURL, token} → {id, cmd:"dictionary-updated", data}; "SAVE_REQUEST" {id, file, scene (serialized JSON), type, metadata?} → SAVE_SUCCESS (data.urls or data.file) / SAVE_FAILED. Gzips with pako level 9, md5 base64 with js-md5, PUT {url}/file/{id}/autosave then PUT to the signed URL. 5 MB because it is a separate webpack build with most of the engine, opentype.js, the HarfBuzz asm.js blob (~1.3 MB), locale tables, core-js 3.42.0 and pako; it fakes window, gContainer and gDesigner — old: public/autosave.worker.js:2 (char ~5036011 onmessage); creator public/designer.browser.dev.js:94772 (module 1276); command constants :26517 (module 591)
- [ ] FMT-WORKER-002 ps.worker.js: reflective RPC host. Main thread sends {func, data:[…]}; worker calls self[func](...data) and posts {error:0, result, call} or error -1/-2/-3. init(bytes, {gDevelopment, origin?, maxWaitTime, outlineFonts}) importScripts psclasses.js, pscore.js, psparser.js, psctm.js, pscolor.js (each ?v=random); run() calls parser.read(). origin is never passed, so the cross-origin Blob fallback would resolve the scripts against a blob: URL and fail — old: public/ps.worker.js:1 (char ~1036 init, ~1137 importScripts, ~1491 onmessage); host public/chunk.vendor.js:250764, "init" :250833, "run" :250844 (module 1403)
- [ ] FMT-WORKER-003 psparser.js PSParser tokenizer: DSC %% comments, numbers incl. radix #, [ ] << >> marks, /name //name, (string) escapes, <hex>, <~ascii85~>. Time-sliced _readLoop posts toGravit("progress",[pct]), then "done". Bug: endTime = new Date + MAXWAITTIME concatenates a string, so only the host's 300 s timeout works — old: public/psparser.js:1 (char ~9226 progress, ~9477 done, ~9636 read)
- [ ] FMT-WORKER-004 psclasses.js PSClasses: PostScript object model, newObject(type, value) for bool, name, string, mark, array, dict, file, graphicsState — old: public/psclasses.js:1 (char ~3245 newObject)
- [ ] FMT-WORKER-005 pscore.js PSCore interpreter: operator tables, graphics state stack, Standard-14 AFM widths, filters SubFileDecode, ASCII85, ReusableStreamDecode, LZWDecode, RunLengthDecode, DCTDecode, FontType1Decode; Type1/CFF charstrings, outlines text with outlineFonts. Paint calls go to the host as postMessage({func,data}): fill, stroke, rectfill, shfill, drawImage, show, error. waitForResponse("jpeg",[dataURL]) blocks on a SharedArrayBuffer with Atomics.wait, which needs cross-origin isolation (COOP/COEP), otherwise error "02" — old: public/pscore.js:1 (char ~153430 toGravit, ~156262 waitForResponse)
- [ ] FMT-WORKER-006 psctm.js PSCTM: CTM maths (getAngle, transform, inverseTransform) — old: public/psctm.js:1 (char ~927)
- [ ] FMT-WORKER-007 pscolor.js PSColor: Separation, DeviceN, Indexed, CIEBasedABC → XYZ → RGB, PS functions types 0/2/3/4, shadings axial, radial, Coons, tensor, triangle mesh; _getGColor maps to Gravit colors; error "01" — old: public/pscolor.js:1 (char ~3361 Separation, ~12460 _getGColor)
- [ ] FMT-WORKER-008 EPS host side GEPSParser workerAPI: stroke, fill, shfill, rectfill, drawImage, jpeg, resolveFont, show, done, error. The jpeg handler decodes the data URL to RGBA, writes size and pixels into the SAB and calls Atomics.store + Atomics.wake (removed old name of Atomics.notify) — old: public/chunk.vendor.js:251117, :251237 (module 1404)
- [ ] FMT-WORKER-009 pdf.worker.js: standalone pdfjs-dist 2.1.286 worker (entry module 1192), patched with disableCMYKToRGB. pdf.js MessageHandler protocol {sourceName, targetName, action, data, callbackId}: test, configure, GetDocRequest, GetPage, GetOperatorList… Bundles core-js 2.6.2 — old: public/pdf.worker.js:1 (char ~6115 "2.1.286", ~12609 disableCMYKToRGB); workerSrc public/chunk.vendor.js:241766 (module 1201)
- [ ] FMT-WORKER-010 chunk.vendors~pdfjsWorker.js: same pdf.js worker as webpack chunk 13, loaded for pdf.js's fake (main-thread) worker fallback — old: public/chunk.vendors~pdfjsWorker.js:1 (char ~5122 version); loader public/designer.browser.dev.js:39096 (module 792), chunk map :53
- [ ] FMT-WORKER-011 pdf.js main-side spawn: PDFWorker._initialize new Worker(workerSrc), Blob importScripts wrapper for cross-origin, _setupFakeWorker fallback (window.pdfjsWorker or chunk 13) — old: public/designer.browser.dev.js:40021 (module 792)
- [ ] FMT-WORKER-012 pdfexport.worker.js: request {uuid, command, …}. "raster" {dataBuffer, range{start,end}, colorspace, hasMask, width, height, index} → {uuid, index, command, imageBuffer, smaskBuffer, range, hasTransparency}; CMYK loads assets/data/icc/USWebCoatedSWOP.icc via GColor.setCMYKProfile. "jpegencoder" {buffer RGBA, width, height, quality, colorspace} → {buffer}. "zipencoder" {buffer} → {buffer: pako.deflate}. Transfers buffers. Bundles bluebird 2.11.0, pako, GColor + ICC reader, env APP_VERSION 3.15.0 BUILD_NUM 8795 — old: public/pdfexport.worker.js:1 (char ~100731 entry module 1366, ~26229 env); senders public/chunk.vendor.js:239354 (module 1113), :111352 (module 849), :239291 (module 1112)
- [ ] FMT-WORKER-013 heic2any inline worker: Blob worker window.__heic2any__worker with libheif inside; request {id, buffer} → {id, imageDataArr:[ImageData], error}; main thread canvas toBlob(toType, quality .92) or gifshot for multi-image GIF; error prefixes ERR_USER, ERR_LIBHEIF, ERR_CANVAS, ERR_GIF — old: public/chunk.vendors~heic2any.js:1 (char ~1201514 onmessage, ~1202941 new Worker)
- [ ] FMT-WORKER-014 render.worker.js (missing file, feature off): renderer could spawn grid workers new Worker("./render.worker.js") with OffscreenCanvas; WORKER_RENDERING_ENABLED false — old: public/chunk.vendor.js:25431 (module 103), flag :37347 (module 166)
- [ ] FMT-WORKER-015 zip.js workers disabled: z-worker.js/inflate.js/deflate.js not shipped, zip.useWebWorkers = false in both copies — old: public/designer.browser.dev.js:80495 (module 1253); public/chunk.vendor.js:239552 (module 1122)
- [ ] FMT-WORKER-016 static.maintenance.js: page script for the maintenance page (separate webpack build with core-js 3.42.0, pako, locales, gApi); localizes text.maintenance-title/info. Not a worker — old: public/static.maintenance.js:2 (char ~657828)
- [ ] FMT-WORKER-017 proxy.html: cross-origin settings probe for https://app-preview.corelvector.com; on message "v" replies "OK" if localStorage designer.settings parses, else "ERR". Nothing references it (to drop) — old: public/proxy.html:9

### Autosave

- [ ] FMT-AUTOSAVE-001 GAutoSaveManager singleton created at startup when AUTO_SAVE_ENABLED (false on Safari); starts the autosave worker, listens to document, settings and network events. Cloud-only, no local autosave (to drop) — old: public/designer.browser.dev.js:94760 (module 1276); flag :185; created :122877 (module 1491)
- [ ] FMT-AUTOSAVE-002 Settings: auto_save (app default false, settings checkbox shows true), auto_save_interval index into AUTOSAVE_INTERVALS [5,10,20] minutes, default 5. localStorage flags designer.settings.auto-save-warn-dialog-shown, designer.settings.auto-save-hide-notification, autosave-prompt-for-local-files-disabled, autosave-prompt-for-reminding-not-support-cdr-des, disable-external-file-no-entries-created-waring — old: public/designer.browser.dev.js:94805 (module 1276), :23816 (module 519), :94471 (module 1275), :121854 (module 1491)
- [ ] FMT-AUTOSAVE-003 Scheduling: one setTimeout per document, re-armed after each run and on Added/Activated/Loaded/SynchronismUpdated, cleared on Removed/BeforeReload or version-history lock; queue (module 1534). Skips offline, saving/loading, unmodified, conflict, CDR files, local files without cloud id ("sync to cloud" dialog) (to drop) — old: public/designer.browser.dev.js:94884, :94944, :94995 (module 1276)
- [ ] FMT-AUTOSAVE-004 GAutoSaveModel.save: marks save point (rolled back on failure), fires AutoSaveSynchronizing/Synchronized/SynchronizationFailed, helper per cloud: Gravit (1531), Google Drive (1532), SharePoint/OneDrive (1533) (to drop) — old: public/designer.browser.dev.js:137341 (module 1530)
- [ ] FMT-AUTOSAVE-005 Recovery UI: no local crash recovery. Only the cloud Version History panel (versions + autosave entries, gApi.getAutoSave). A local IndexedDB recovery store is new work — old: public/designer.browser.dev.js:136836 (module 1528), :4522 (module 119)

### Local file storage

- [ ] FMT-STORAGE-001 GStorage base (Directory, Item): getName/getExtension (upper-case after last dot), read/write(data, ok, fail, progress, doc), size checks; Storage canPromptOpen/canPromptSave/canSave/canDownload/canChooseDirectory, openPrompt/savePrompt/download, getWritePermission — old: public/designer.browser.dev.js:11123 (module 237)
- [ ] FMT-STORAGE-002 GBrowserFileStorage (File System Access API): _hasFileAPI = showSaveFilePicker exists and not ChromeOS; canSave/canPromptSave need FSA, canPromptOpen/canDownload always true. Handles are never persisted and items have no unique id, so reopening the same file is not deduplicated. Module 1512 is a near-identical copy — old: public/designer.browser.dev.js:76969 (module 1195), :130820 (module 1512)
- [ ] FMT-STORAGE-003 Open via showOpenFilePicker({multiple, excludeAcceptAllOption, types:[{description, accept:{mime:[.ext]}}]}); each handle → getFile().arrayBuffer() → Item(data, name, handle); callback (item, count); cancel DOMException ignored — old: public/designer.browser.dev.js:77137 (module 1195)
- [ ] FMT-STORAGE-004 Open fallback: hidden <input type=file id="file-input"> created once off-screen, multiple only set on creation, accept list removed on iOS/macOS, files read sequentially with FileReader.readAsArrayBuffer; "silent" option — old: public/designer.browser.dev.js:77175 (module 1195)
- [ ] FMT-STORAGE-005 File > Open (file.open, Ctrl/Cmd+O): login gate (to drop), load:true file types, multiple=true since b6f53f7, gDesigner.openDocument per file; enabled with canPromptOpen and isOpenFilesFromLocalEnabled; unavailable on Safari — old: public/designer.browser.dev.js:52366 (module 813)
- [ ] FMT-STORAGE-006 openDocument/_processOpenDocument: dedupes native designs by uniqueId+versionId, creates GDocument, load(item), fires Opened; "text.unsupported-file-extension" / "text.suggestion-open-image" — old: public/designer.browser.dev.js:122385, :122408 (module 1491)
- [ ] FMT-STORAGE-007 Save prompt showSaveFilePicker({suggestedName, excludeAcceptAllOption, types}); jpg MIME rewritten to "x-really-an-image/jpeg"; non-abort errors fall back to download — old: public/designer.browser.dev.js:77219, :77240 (module 1195)
- [ ] FMT-STORAGE-008 Write: queryPermission/requestPermission({writable}), createWritable → truncate(0) → write → close; QUOTA_EXCEEDED → disk-space dialog; other errors or no handle → FileSaver download — old: public/designer.browser.dev.js:77000, :77069 (module 1195)
- [ ] FMT-STORAGE-009 Download fallback: FileSaver.js (a[download] + createObjectURL, Safari/CriOS FileReader workarounds, default name "download") — old: public/designer.browser.dev.js:67107 (module 1117)
- [ ] FMT-STORAGE-010 Save As (file.save-as.<ext>, Shift+Cmd+Alt+S for native): one action per file type, title "Download…" when !canSave; login gate, write-permission check, savePrompt with item or doc name; native ext rebinds the document's storage item; then store(); without FSA → download — old: public/designer.browser.dev.js:19002, :19123 (module 445)
- [ ] FMT-STORAGE-011 Save (file.save, Ctrl/Cmd+S): enabled when modified or new; with FSA a new doc shows a "file or cloud" chooser → save-as gvdesign, an existing local item → store(item); without FSA (Firefox/Safari) it goes to the cloud path. Cloud/sync/conflict branches to drop — old: public/designer.browser.dev.js:19414, :19453, :19513 (module 447)
- [ ] FMT-STORAGE-012 Save All (file.save-all) is dead code: isEnabled() false, calls a doc.save() that does not exist — old: public/designer.browser.dev.js:155280 (module 1612)
- [ ] FMT-STORAGE-013 Recent files: addToRecentFiles after opening/saving a gvdesign persists only for the Electron runtime ("recent_documents") or cloud/external items ("recent_external_<uid>", max 10). Browser FSA files are never recorded; the menu needs a logged-in user and cloud listFiles; GOpenRecentAction is a disabled placeholder. A local recent list with persisted handles is new work — old: public/designer.browser.dev.js:122429, :123016 (module 1491), :4800 (module 119), :53536 (module 843), :3282 (module 85)
- [ ] FMT-STORAGE-014 Persistence keys: GContainer.get/setProperty = localStorage with JSON values; "designer.settings" (all settings incl. theme, auto_save, lastDirectory), "designer.custom"/"enable_mods", pwa.closed-install-pwa-dialog-date, pwa.show-install-dialog-3-times-a-week, cached SharePoint tokens. IndexedDB only "gravitFontsDB" v1, store "gravitFonts" — old: public/designer.browser.dev.js:3146 (module 85), :122175 (module 1491), :77353 (module 1198), :75704 (module 1172)
- [ ] FMT-STORAGE-015 Window drag & drop: window dragover/drop handlers forward to the active view's handleDropEvent; nothing opens a dropped file as a new document — old: public/designer.browser.dev.js:121731 (module 1491)
- [ ] FMT-STORAGE-016 Open-documents tabs and files dropdown: jQuery-UI sortable ".tabs" in #header plus "more-button" whose ".moreTab" clones overflowing tabs; closes on #mainframe click. 32b5444 sets z-index 10002 and overflow visible on #header — old: public/designer.browser.dev.js:134165 (module 1517); public/designer.browser.light.css:18109
- [ ] FMT-STORAGE-017 Unsaved-changes guard: window.onbeforeunload blocks when gContainer.canUnload(hasModifiedDocuments, hasSynchronizingDocuments) refuses; dirty state from GDocument.isModified — old: public/designer.browser.dev.js:120194 (module 1483), :3217 (module 85), :5961 (module 163)
- [ ] FMT-STORAGE-018 URL open requests at startup: ?d=, ?token=, ?storeContent=, external asset, ?directlink= → OpenFileRequest → cloud getFile/getShare (to drop) — old: public/designer.browser.dev.js:109300 (module 1374)
- [ ] FMT-STORAGE-019 Cloud storages: Gravit cloud item (module 220), Google Drive (556, picker 1036/1553), SharePoint/OneDrive (1152, client 1239), GFilesPanel cloud browser (1545), anonymous login gate around Open/Save As (446) (to drop) — old: public/designer.browser.dev.js:9385, :24186, :70953, :143740, :19230

### Service worker

- [ ] FMT-SW-001 cacher.js is the real service worker: Workbox 5.1.4 from storage.googleapis.com CDN, setCacheNameDetails prefix "gravit-designer", precache and runtime both "precache", precacheAndRoute of 1267 entries with revisions "<md5>_8795", ignoreURLParametersMatching [/.*/] (needed for the ?v=random worker URLs), skipWaiting on install — old: public/cacher.js:1 (importScripts), :7 (cache names), :12 (precacheAndRoute), :5061 (ignoreURLParametersMatching), :5068 (install)
- [ ] FMT-SW-002 Precache manifest contents: all workers, ps*.js, both vendor chunks, designer.browser.js (not the designer.browser.dev.js that index.html loads), CSS, index.html, manifest.json, proxy.html, static.maintenance.js, .well-known/assetlinks.json, the ICC profile and assets. Revisions are frozen at build 8795, so files edited later (chunk.vendor.js) keep being served from the old cache once the SW is installed — old: public/cacher.js:5000 (chunk.vendor.js), :5016 (designer.browser.js), :5048 (index.html)
- [ ] FMT-SW-003 Registration: GBrowserContainer registers "/cacher.js" 15 s after start and calls registration.update() — old: public/designer.browser.dev.js:109306 (module 1374)
- [ ] FMT-SW-004 public/service-worker.js: local addition, cache "designer-cache-v1", precaches /chunk.vendor.js and /designer.browser.js, deletes other caches on activate, clients.claim, cache-first fetch for those two files. Nothing registers it (dead) — old: public/service-worker.js:1, :27

### PWA

- [ ] FMT-PWA-001 manifest.json (root and public/ are identical): name "Gravit Designer", short_name "Vector", icons 512/256/128/48/32/16 PNG with ?v=8795, start_url "/index.html", display standalone, background_color #D72E63, theme_color #FFFFFF. No file_handlers, share_target, protocol_handlers or launchQueue use anywhere — old: public/manifest.json:1
- [ ] FMT-PWA-002 index.html links the manifest with crossorigin="use-credentials" and loads jquery.js, chunk.vendor.js, designer.browser.dev.js; title and og: tags still point to corelvector.com — old: public/index.html:26, :40, :43
- [ ] FMT-PWA-003 Install prompt capture: beforeinstallprompt is stored (window.__pwaEvent__ or gDesigner.setPwaEvent); appinstalled reloads the page — old: public/designer.browser.dev.js:109256, :109264 (module 1373)
- [ ] FMT-PWA-004 Install dialog throttling setPwaEvent: skipped on screens under 1024 px; not re-shown within 30 days after close (pwa.closed-install-pwa-dialog-date), at most 3 times a week (pwa.show-install-dialog-3-times-a-week) — old: public/designer.browser.dev.js:125213 (module 1491)
- [ ] FMT-PWA-005 GInstallToDesktopAction "file.install-to-desktop": calls prompt(), on accepted clears the throttle keys and closes the dialog; visible only when not display-mode standalone — old: public/designer.browser.dev.js:75703, :75736 (module 1172)
- [ ] FMT-PWA-006 Runtime detection getRuntime(): PWA when display-mode standalone, else Browser. Never returns Electron — old: public/designer.browser.dev.js:109315 (module 1374)
- [ ] FMT-PWA-007 .well-known/assetlinks.json: Android TWA link for package com.corelvector.app.twa with Corel's cert fingerprint (to drop) — old: public/.well-known/assetlinks.json:1

### Server (server.js, routes/)

- [ ] FMT-SERVER-001 Express app on PORT or 3100, express.json() body parser — old: server.js:7, :11
- [ ] FMT-SERVER-002 Static public/ with Cache-Control "public, max-age=2592000, immutable" for chunk.vendor.js and designer.browser.js only (the loaded designer.browser.dev.js gets no such header) — old: server.js:14
- [ ] FMT-SERVER-003 Static /docs → docs/ — old: server.js:26
- [ ] FMT-SERVER-004 GET /connection/test → "OK". The app probes it with HEAD (sync and async) for online detection — old: server.js:29; client public/designer.browser.dev.js:125127, :125178 (module 1491)
- [ ] FMT-SERVER-005 GET /maintenance/status → {maintenance:false}; client GET in module 970 — old: server.js:33; public/chunk.vendor.js:123485 (module 970)
- [ ] FMT-SERVER-006 GET /i18n-url/:locale/designer → {} — old: server.js:38; client public/chunk.vendor.js:70353 (module 417)
- [ ] FMT-SERVER-007 GET /license → {license:"pro", expire 2099-12-31, created, legacy:false} (to drop) — old: server.js:43; client public/chunk.vendor.js:69685 (module 417)
- [ ] FMT-SERVER-008 GET /subscription/test → {active, plan:"pro", status:1}; client treats status==1 as subscribed (to drop) — old: server.js:53; public/chunk.vendor.js:69663 (module 417)
- [ ] FMT-SERVER-009 GET /subscription/nextbillingdate → {date}, GET /subscription/lifetime → {lifetime:true} (to drop) — old: server.js:58, :61; public/chunk.vendor.js:69642 (module 417)
- [ ] FMT-SERVER-010 GET /quota → {quota:{pro:{}, free:{}}} (to drop) — old: server.js:66; public/chunk.vendor.js:69670 (module 417)
- [ ] FMT-SERVER-011 GET /ever-subscribed → {subscribed:true}, GET /total-subscription-days → {days:9999} (to drop) — old: server.js:71, :74; public/chunk.vendor.js:69695 (module 417)
- [ ] FMT-SERVER-012 GET /pro/paywall/:page → "" so the paywall iframe doesn't 404 (to drop) — old: server.js:79; client public/designer.browser.dev.js:104121
- [ ] FMT-SERVER-013 GET /file → [] (cloud file list, to drop) — old: server.js:84; public/chunk.vendor.js:69909 (module 417)
- [ ] FMT-SERVER-014 GET /null → {} (works around a client request with a null URL) — old: server.js:89
- [ ] FMT-SERVER-015 Request logger, mounted after the routes, so it only logs requests that fell through — old: server.js:94
- [ ] FMT-SERVER-016 GET /user/settings → SETTINGS (trialDays, quotas, subscription coupon, license offline times, reminder intervals, flags) (to drop except whatever locale/notification bits survive) — old: routes/user.js:100; client public/chunk.vendor.js:69597 (module 417)
- [ ] FMT-SERVER-017 GET /user?lang= → fake USER_PROFILE (id 12345678, "Test User", pro/trial dates to 2099, runtime "Browser", version 3.15.0) + resolved locale + settings (to drop) — old: routes/user.js:104, profile :37
- [ ] FMT-SERVER-018 PUT /user {locale} → echoes id, name, locale, email, version, runtime — old: routes/user.js:109
- [ ] FMT-SERVER-019 Locale table LANGUAGES 0–14 (de-DE, en, zh-CN, pt-BR, es-ES, fr-FR, pl-PL, ru-RU, tr-TR, cs-CZ, zh-TW, it-IT, ja-JP, nl-NL, sv-SE) and resolveLocale (numeric code or locale string, default "en"). Keep the mapping; the client sends gApi.lang as a number — old: routes/user.js:4, :26
- [ ] FMT-SERVER-020 Client API base: gApi.url = window.location.origin, managementUrl https://cloud-management.corel.com (getAppStatus, external call, to drop) — old: public/chunk.vendor.js:69578 (module 417)

### WebSocket

- [ ] FMT-WS-001 Server: ws.Server on path "/license/license", verifyClient always true; on connect sends {name:"license", data:{license:"pro", expire, created, legacy}}; replies {name:"pong"} to raw "ping" or {name:"ping"} (to drop with licensing) — old: routes/ws.js:11, :23, :28
- [ ] FMT-WS-002 Client: websocketURL = ws(s)://host + "/license", connect("/license") appends the path and ?token=; keepalive sends "ping" every 50 s when online; messages parsed as {name, data} and triggered as events; auto-reconnect — old: public/chunk.vendor.js:69580 (module 417), :123183 (connect), :123231 (_open) (module 957)

### Electron

- [ ] FMT-ELECTRON-001 Embedded server: re-implements a subset of server.js inside the main process (static public/ with the same Cache-Control, /docs, /connection/test, user routes, /maintenance/status, /i18n-url, /license, /subscription/test, /file, /null, WebSocket). Missing vs server.js: /subscription/nextbillingdate, /subscription/lifetime, /quota, /ever-subscribed, /total-subscription-days, /pro/paywall. /license returns a different shape {plan, status, expireDate, features} — old: electron-main.js:14, :51
- [ ] FMT-ELECTRON-002 Fixed port 47823 on 127.0.0.1: localStorage is partitioned by origin, so a random port reset all settings on each launch (#6). EADDRINUSE shows an error box and quits instead of falling back — old: electron-main.js:12, :75, :91
- [ ] FMT-ELECTRON-003 Single-instance lock: a second launch quits and the first focuses/restores its window — old: electron-main.js:131
- [ ] FMT-ELECTRON-004 BrowserWindow 1400×900, min 800×600, title "Gravit Designer", icon public/assets/prerendered/icon512.png, nodeIntegration false, contextIsolation true, autoHideMenuBar; no preload — old: electron-main.js:100
- [ ] FMT-ELECTRON-005 Menus: Menu.setApplicationMenu(null), so no native menu at all (the in-app menu bar is used) — old: electron-main.js:120
- [ ] FMT-ELECTRON-006 Loads http://127.0.0.1:<port>; the app runs as a plain web page (no IPC, no native dialogs, FSA API from Chromium) — old: electron-main.js:122
- [ ] FMT-ELECTRON-007 Lifecycle: window-all-closed closes the server and quits (also on macOS); activate recreates the window — old: electron-main.js:147, :152
- [ ] FMT-ELECTRON-008 File open handling: none. No open-file event, no argv parsing, second-instance ignores its argv, so double-clicking a .gvdesign does not open it — old: electron-main.js:134
- [ ] FMT-ELECTRON-009 File associations: none in package.json "build" (no fileAssociations), and the gvthumb DLL is not packaged or registered by the installer — old: package.json:31
- [ ] FMT-ELECTRON-010 App-side Electron branches (recent_documents, lastDirectory, file:// linked images, GLinkImageAction) are unreachable because getRuntime never returns Electron — old: public/designer.browser.dev.js:109315 (module 1374), :95545 (module 1280)

### Packaging (package.json)

- [ ] FMT-PKG-001 Scripts: start (node server.js), dev (node --watch), build (reverse-engineering/build-bundle.cjs), icons, serve, clean, electron, dist:win/linux/mac/all via electron-builder — old: package.json:7
- [ ] FMT-PKG-002 Dependencies express ^5.1.0, ws ^8.18.2; dev electron ^33.3.1, electron-builder ^25.1.8; node >=18 — old: package.json:20
- [ ] FMT-PKG-003 electron-builder common: appId com.gravit.designer.local, productName "Gravit Designer", output releases/, files electron-main.js, server.js, routes/**, public/**, docs/**, package.json (ships all of public/ including the unused original/minified bundles and *.tmp files) — old: package.json:31
- [ ] FMT-PKG-004 Windows: nsis x64 and portable x64, icon public/assets/prerendered/icon.ico; NSIS oneClick false, perMachine false, allowToChangeInstallationDirectory true, installer/uninstaller icons — old: package.json:45, :62
- [ ] FMT-PKG-005 Linux: AppImage x64 and deb x64, icon dir public/assets/prerendered, category Graphics — old: package.json:69
- [ ] FMT-PKG-006 macOS: dmg x64 + arm64, icon icon512.png, category public.app-category.graphics-design; no signing or notarization config — old: package.json:87

### Thumbnail provider (gvthumb)

- [ ] FMT-THUMB-001 COM in-proc DLL GravitThumbnail.dll implementing IThumbnailProvider + IInitializeWithStream; Initialize reads the whole stream (300 MB cap) — old: native/gvthumb/gvthumb.cpp:249, :288
- [ ] FMT-THUMB-002 GetThumbnail(cx): ExtractPreview → DecodeToHBITMAP with WIC, scale longest side to cx (default 256, never upscales, Fant), 32bpp PBGRA, WTSAT_ARGB — old: native/gvthumb/gvthumb.cpp:258, :143
- [ ] FMT-THUMB-003 Registration: CLSID {9350F9C2-8A3E-4325-8A0A-49DF202A4666} "Gravit Designer Thumbnail Handler", InprocServer32 ThreadingModel Apartment, HKCR\.gvdesign\ShellEx\{e357fccd-a995-4576-b01f-234630154e96} → CLSID, SHChangeNotify(ASSOCCHANGED); unregister deletes both trees. Per-machine HKCR only — old: native/gvthumb/gvthumb.cpp:33, :364, :386
- [ ] FMT-THUMB-004 Exports DllGetClassObject, DllCanUnloadNow, DllRegisterServer, DllUnregisterServer — old: native/gvthumb/gvthumb.def:1
- [ ] FMT-THUMB-005 Build: CMake 3.20, C++17, static MSVC runtime, zlib 1.3.1 fetched with SHA256 and linked statically, links windowscodecs, crypt32, shlwapi, ole32 — old: native/gvthumb/CMakeLists.txt:1, :14
- [ ] FMT-THUMB-006 register.bat / unregister.bat: require admin (net session), regsvr32 [/u], register also kills explorer and deletes thumbcache_*.db — old: native/gvthumb/register.bat:1, native/gvthumb/unregister.bat:1
- [ ] FMT-THUMB-007 Stray testharness.obj (7.8 KB) committed at the repo root with fa7f72f; not used by anything — old: testharness.obj (git show --stat fa7f72f)

### CI

- [ ] FMT-CI-001 Workflow "Thumbnail Provider": triggers on release published, push touching native/gvthumb/** or the workflow, workflow_dispatch; permissions contents: write; windows-latest — old: .github/workflows/thumbnail-provider.yml:5
- [ ] FMT-CI-002 Steps: cmake configure x64, build Release, package DLL + register/unregister.bat + README into GravitThumbnail-win-x64.zip, upload-artifact@v4, attach to release with softprops/action-gh-release@v2. No CI builds the web app or the Electron installers — old: .github/workflows/thumbnail-provider.yml:23, :46

### Scripts

- [ ] FMT-SCRIPT-001 check-gvdesign-preview.cjs (see FMT-PREVIEW-004) — old: scripts/check-gvdesign-preview.cjs:1
- [ ] FMT-SCRIPT-002 generate-icons.cjs: writes public/assets/img/new-document/preset-{uiux,social,print,presentation,web,video}-{white,black}.svg from Lucide paths (ISC), stroke 0.75, colors rgb(173,173,173) / rgb(114,114,114) — old: scripts/generate-icons.cjs:4, :43

### Docs

- [ ] FMT-DOCS-001 docs/ is the Corel user guide served at /docs (96 HTML pages plus wp-content/wp-includes assets, Corel copyright). Rebrand or rewrite — old: server.js:26; docs/index.html
- [ ] FMT-DOCS-002 import.html: lists .gvdesign, SVG, EPS, PDF, PNG, JPEG as open/import formats, opening creates a new tab, EPS/PDF/SVG cannot be saved back, place image and import fonts — old: docs/import.html:173
- [ ] FMT-DOCS-003 export.html: quick export defaults (PNG 1x page bg; JPEG 1x on white 100% quality; SVG 3 decimals no ids; SVGZ; PDF 72 and 150 dpi RGB with effects), advanced dialog options, size syntax 1920w/1080h/512×512/3x/0.5x. Code differs: JPEG quick export has no quality (browser default), SVGZ is not in the quick-export list — old: docs/export.html:177, :226
- [ ] FMT-DOCS-004 save-and-open-files.html: local vs cloud save, async save since 2020-1.3.1, cloud Version History (last 20), autosave every 5 min for cloud files, open shared files (cloud parts to drop) — old: docs/save-and-open-files.html:181, :202, :209
- [ ] FMT-DOCS-005 documents.html and working-with-files.html: tabs, files dropdown next to the profile picture, drag to reorder, unsaved asterisk, cloud logo on synced tabs — old: docs/documents.html:177, :185; docs/working-with-files.html:172
- [ ] FMT-DOCS-006 import-export.html is only an index page linking import.html and export.html — old: docs/import-export.html:172

### Bundled libraries

- [ ] FMT-LIB-001 pdfjs-dist 2.1.286 (build 7525e341) main-thread API, patched with disableCMYKToRGB and canvasGraphicsClass, includes core-js 2.6.2 — old: public/designer.browser.dev.js:41257 (module 792, lines 31142–51414)
- [ ] FMT-LIB-002 pako 1.0.x (index 165, lib/deflate 462, zlib/deflate 463, lib/inflate 465, zlib/inflate 466), exposed as window.pako; .gvdesign gzip/ungzip — old: public/designer.browser.dev.js:8513 (module 165), :21964 (module 463), :80491 (module 1253), :124553 (module 1491)
- [ ] FMT-LIB-003 zip.js (Gildas Lormeau, pre-2.x global zip API), two copies: core 1514 + zip-fs 1515 + pako codec 1516 for export ZIPs; inflate 1401 + core 1402 for Sketch import — old: public/designer.browser.dev.js:113115 (module 1402), :132670 (module 1514); public/chunk.vendor.js:239551 (module 1122)
- [ ] FMT-LIB-004 opentype.js ~1.x (no version string; bidi, FeatureQuery, TT hinting, fvar), WOFF via pako; TTC handled by Gravit's GOpenTypeUtil — old: public/chunk.vendor.js:94833 (module 708), :125384 (module 982); public/chunk.vendor.js:100111 (module 726)
- [ ] FMT-LIB-005 HarfBuzz emscripten asm.js/wasm2js build "ghbmodule" (~6.4 MB pretty-printed, no .wasm), cwrapped hb_blob_create, hb_font_create, hb_buffer_create, hb_buffer_add_utf8, hb_shape — old: public/chunk.vendor.js:128962 (module 998), wrapper :110831 (module 838)
- [ ] FMT-LIB-006 canvg 1.x heavily forked into the SVG importer — old: public/chunk.vendor.js:245201 (module 1391)
- [ ] FMT-LIB-007 heic2any (version unknown) with embedded libheif (emscripten) and gifshot, webpack chunk 12 module 1740 — old: public/chunk.vendors~heic2any.js:1 (char ~1200751 libheif, ~1204266 gifshot)
- [ ] FMT-LIB-008 ICC profile reader (Gravit's own), CMYK profile USWebCoatedSWOPv2 from assets/data/icc/USWebCoatedSWOP.icc — old: public/chunk.vendor.js:83201 (module 641), loader :15449 (module 68 GColor)
- [ ] FMT-LIB-009 JPEG encoder (Gravit's own baseline DCT, RGBA/CMYK/Gray) — old: public/chunk.vendor.js:111294 (module 849)
- [ ] FMT-LIB-010 PNG chunk writer (Gravit's own CRC32, setDPI inserts pHYs before IDAT) — old: public/chunk.vendor.js:113054 (module 895)
- [ ] FMT-LIB-011 PDF writer GPDFDocument (Gravit's own, not PDFKit/jsPDF) — old: public/chunk.vendor.js:252252 (module 1422)
- [ ] FMT-LIB-012 FileSaver.js — old: public/designer.browser.dev.js:67107 (module 1117)
- [ ] FMT-LIB-013 js-md5 (emn178) for Content-MD5 — old: public/designer.browser.dev.js:17839 (module 435)
- [ ] FMT-LIB-014 bluebird 2.11.0 (main bundle and pdfexport worker) — old: public/designer.browser.dev.js:65262 (module 1114)
- [ ] FMT-LIB-015 core-js 3.42.0 polyfills — old: public/designer.browser.dev.js:13277 (module 297)
- [ ] FMT-LIB-016 crypto-js (Base64, SHA256, HmacSHA256) — old: public/designer.browser.dev.js:12831 (module 272), :30580 (module 736)
- [ ] FMT-LIB-017 Workbox 5.1.4 (workbox-sw from CDN) — old: public/cacher.js:1
- [ ] FMT-LIB-018 jQuery 3.6.4 (jquery.js@v=ZB3RQ3 is an identical copy) — old: public/jquery.js:1

### Notes for the rewrite

Third-party code and its npm counterpart:

| Bundled | Version found | npm for the rewrite |
|---|---|---|
| pdf.js (main + worker, patched) | pdfjs-dist 2.1.286 | pdfjs-dist 4.x; the disableCMYKToRGB and canvasGraphicsClass patches must be redone, likely by walking getOperatorList instead of a fake canvas |
| pako | 1.0.x | pako 2.x, or fflate, or native CompressionStream("gzip") |
| zip.js (two copies) | pre-2.x global API | @zip.js/zip.js 2.x, or fflate's zip |
| opentype.js | ~1.x | opentype.js 1.3.x (fontkit if variable fonts matter) |
| HarfBuzz asm.js "ghbmodule" | custom build | harfbuzzjs (real wasm) |
| canvg fork | 1.x, heavily changed | no drop-in; write a DOMParser-based SVG importer, keep the gravitGraphicSource round-trip |
| heic2any + libheif + gifshot | unknown | heic2any 0.0.4 or libheif-js directly; drop gifshot |
| FileSaver.js | unknown | file-saver, or a plain a[download] helper |
| js-md5, crypto-js | unknown | only needed for cloud and licensing; drop |
| bluebird | 2.11.0 | native Promise |
| core-js | 3.42.0, 2.6.2 inside pdf.js | not needed for modern targets |
| Workbox | 5.1.4 from CDN | workbox-build / vite-plugin-pwa, self-hosted |
| jQuery | 3.6.4 | drop |

Gravit's own code that has to be ported, not replaced: the PostScript interpreter (ps*.js, AI/EPS import), the PDF writer (module 1422 and friends), the ICC reader (641), the JPEG encoder (849), the PNG pHYs writer (895) and the pdf.js-to-Gravit canvas bridge (1394/1397). No PDFKit, jsPDF, fontkit, fflate, JSZip, TIFF, WebP, PSD codecs or lcms are bundled.

Things to keep or fix:

- File compatibility hinges on two things: gzip-of-JSON with the same "@"/"$"/"#"/"&" keys, and the per-class default tables, because only non-default values are stored. There is no usable version field. The rewrite should write a real version key and keep reading files without one.
- Put "_preview" first in the JSON so gvthumb keeps working, or change gvthumb and the format together. gvthumb rejects uncompressed JSON files, which the app itself still opens.
- EPS import relies on SharedArrayBuffer and Atomics.wait for embedded JPEGs, so the page needs COOP/COEP headers. Neither server sets them. Atomics.wake should be Atomics.notify.
- Autosave, version history, templates, recent files and the WebSocket are all cloud or license code. Dropping them leaves no crash recovery and no local recent list; both need new designs (IndexedDB plus persisted FileSystemFileHandles).
- The service worker precache is frozen at build 8795 and lists designer.browser.js instead of designer.browser.dev.js. Once installed it serves stale engine code. Generate the manifest at build time.
- Electron is a thin shell around the web build. It has no file associations, no open-file or argv handling and no native menu, and its embedded server has drifted from server.js. Serving from one shared module (or a custom protocol instead of a localhost port) would remove the drift and the port conflict.
- AI, SVGZ and Sketch import exist but cannot be reached from the UI. Placing a PDF only takes page 1 while opening takes all pages. Per-element JPG export is always quality 100, quick JPG export uses the browser default, and the dialog default is 92.

## The running old app

What a user sees in the old build (public/index.html, which loads jquery.js, chunk.vendor.js and designer.browser.dev.js), recorded by driving it with Playwright 1.59.1 (Chromium build 1217, headless, 1600x1000 viewport) against `node server.js` on port 3191. Version string on the welcome screen: "Version i015.3 Web" (gDesigner.getVersion() = 3.15.0, build 8795, env production).

The scripts that produced every observation are in walkthrough-scripts/ next to this file. They write JSON dumps and screenshots to C:\Users\info\AppData\Local\Temp\gd-walkthrough (ROOT in common.js). Install with `npm i playwright@1.59.1` in that folder; 1.59.1 uses the chromium-1217 build already in ms-playwright, so nothing is downloaded. Screenshot names below (shots/NN-...) refer to that folder.

Two things change what the UI shows and are worth knowing before reading the rest:

- In Chromium the app uses the File System Access API (showOpenFilePicker / showSaveFilePicker). common.js hides those by default so the app falls back to a hidden `<input type=file id=file-input>` and Blob downloads, which Playwright can drive. With the API hidden, File > "Save to Local File as..." is relabelled "Download File". Pass `launch({ noFSA: false })` to keep the API.
- "Empty document" below means the infinite canvas created by the welcome screen's Create! button with no size. "Rectangle selected" means one rectangle inserted through the harness (default style, selected).

Counts: 326 items: START 20, SHELL 50, MENU 171, INSPECT 28, DIALOG 24, THEME 5, I18N 6, STORAGE 12, SAVE 10. Harness hooks: every expression in the last section was run and checked by 18-harness-verify.js and 21-hooks-extra.js.

### 1. Startup flow

On load there is no splash: the shell (menu bar, toolbar, empty Layers/Pages sidebar) renders greyed out behind a modal welcome dialog, `.g-dialog.g-new-document-dialog` inside `.g-dialog-container.g-new-document-dialog-container.visible` (shots/01-load.png). No document exists until the user creates or opens one. The right sidebar is empty until then. The user is treated as logged in ("T" avatar, Test User, pro license) because the stub server answers /user and /license.

- [ ] RUN-START-001 Welcome dialog at startup: modal, shown on every load unless designer.settings.show_welcome_screen is false; no close button, Escape does not dismiss it; left pane is magenta with the Gravit Designer logo, right pane holds size inputs and presets
- [ ] RUN-START-002 Left pane option "New Design" / "Design creation starts here": active by default (gradient highlight), shows the presets pane
- [ ] RUN-START-003 Left pane option "Open from Computer" / "Open a locally saved file": opens the file picker (showOpenFilePicker, or the file input fallback with accept=".gvdesign,.png,.heic,.jpg,.jpeg,.svg,.pdf,.eps" and multiple=true); the chosen file opens as a new tab and closes the dialog
- [ ] RUN-START-004 Left pane option "Open Recent" / "Open a recent opened file": does nothing visible when there are no recent files; the presets pane stays (shots/06-open-recent.png)
- [ ] RUN-START-005 Link "Tutorials": opens a new tab to the YouTube playlist PLqsk_4aqUvEYxmy5NpQakcZXa6_3w-I8F
- [ ] RUN-START-006 Link "User Guide": opens a new tab to http://localhost:3191/docs/index.html
- [ ] RUN-START-007 Version label: "Version i015.3 Web", bottom of the left pane
- [ ] RUN-START-008 Width / height inputs: placeholders "width" and "height" (lowercase via CSS, DOM says "Width"/"Height"), an "×" image between them, empty by default; hint below: "Leave it empty for infinite canvas"
- [ ] RUN-START-009 Unit select: px (default), mm, cm, in, pc, pt; dark grey pill with a caret
- [ ] RUN-START-010 Create! button: with empty inputs creates "Untitled-1" with an infinite canvas (page w=0, h=0); with 210 x 297 mm creates a fixed page of 595.28 x 841.89 pt-px and sets the document unit to Millimeters (shots/07-custom-a4mm.png)
- [ ] RUN-START-011 Preset category tiles: six tiles with an outline icon (swaps to a filled icon on hover), title and a caption with a down caret: "UI/UX Design" / "App & device screens", "Social Media" / "Posts, stories & covers", "Print" / "Paper & physical media", "Presentation" / "Slides & decks", "Web" / "Websites & banners", "Video / Motion" / "Video & animation frames"
- [ ] RUN-START-012 Preset list popup: clicking a tile opens `.g-overlay.preset-select`, a plain white list with a black border under the tile (shots/05-preset-0-UI_UX_Design.png); clicking an entry creates the document at once and closes the dialog (iPhone SE gave a 375 x 667 px page named "Page 1")
- [ ] RUN-START-013 UI/UX Design presets (15): iPhone 16 Pro (393x852 px); iPhone 16 Pro Max (430x932 px); iPhone SE (375x667 px); Samsung Galaxy S24 (360x780 px); Google Pixel 9 (412x892 px); iPad Pro 11" (834x1194 px); iPad Pro 13" (1024x1366 px); iPad Air (820x1180 px); Android Tablet (800x1280 px); Apple Watch Ultra (410x502 px); Apple Watch 45mm (396x484 px); Desktop HD (1920x1080 px); Desktop (1440x900 px); MacBook Pro 14" (1512x982 px); Surface Pro (1368x912 px)
- [ ] RUN-START-014 Social Media presets (17): Instagram Post (1080x1080 px); Instagram Story / Reel (1080x1920 px); Instagram Landscape (1080x566 px); Instagram Portrait (1080x1350 px); TikTok Video (1080x1920 px); YouTube Thumbnail (1280x720 px); YouTube Channel Art (2560x1440 px); Facebook Post (1200x630 px); Facebook Cover (820x312 px); Facebook Story (1080x1920 px); X (Twitter) Post (1600x900 px); X (Twitter) Header (1500x500 px); LinkedIn Post (1200x1200 px); LinkedIn Cover (1584x396 px); Pinterest Pin (1000x1500 px); Threads Post (1080x1080 px); Dribbble Shot (1600x1200 px)
- [ ] RUN-START-015 Print presets (12): A3 (297x420 mm); A4 (210x297 mm); A5 (148x210 mm); US Letter (8.5x11 in); US Legal (8.5x14 in); Tabloid (11x17) (11x17 in); Business Card (85x55 mm); Postcard (4x6) (6x4 in); Poster (18x24) (18x24 in); Poster (24x36) (24x36 in); Flyer (5x7) (5x7 in); Brochure Tri-fold (11x8.5 in)
- [ ] RUN-START-016 Presentation presets (8): Widescreen (16:9) (1920x1080 px); Standard (4:3) (1024x768 px); Widescreen (16:10) (1920x1200 px); Google Slides (1920x1080 px); Keynote (1920x1080 px); PowerPoint (13.333x7.5 in); Pitch Deck (1280x720 px); A4 Landscape (297x210 mm)
- [ ] RUN-START-017 Web presets (12): Desktop HD (1920) (1920x1080 px); Desktop (1440) (1440x900 px); Laptop (1366) (1366x768 px); Small Desktop (1280) (1280x800 px); Full Page (1440) (1440x3072 px); Landing Page (1440x2560 px); Hero Banner (1920x600 px); Leaderboard Ad (728x90 px); Medium Rectangle Ad (300x250 px); Email Header (600x200 px); Favicon (512x512 px); Open Graph Image (1200x630 px)
- [ ] RUN-START-018 Video / Motion presets (10): Full HD (1080p) (1920x1080 px); 4K UHD (3840x2160 px); HD (720p) (1280x720 px); 2K (1440p) (2560x1440 px); Vertical Video (9:16) (1080x1920 px); Square Video (1:1) (1080x1080 px); YouTube Thumbnail (1280x720 px); YouTube End Screen (1920x1080 px); Twitch Overlay (1920x1080 px); Cinemascope (2.39:1) (2560x1072 px)
- [ ] RUN-START-019 "Don't show anymore at startup" checkbox: bottom right, unchecked; checking it immediately writes show_welcome_screen:false into localStorage designer.settings
- [ ] RUN-START-020 File > New Design... (and Help > Show Welcome Screen) reopen the same dialog over the open document; it keeps the last typed width/height/unit (shots/08-file-new-design-dialog.png); a new document opens as a second tab "Untitled-2"

### 2. App shell

DOM skeleton after creating a document (06-dom.js, full dump in dom-skeleton.txt): `body.pro-license.pro-subscription.g-chrome.g-desktop.g-os-windows > #mainframe > .frame` with `#windows` (canvas `.g-scene-widget.g-editor-widget`), `#header`, `#toolbar`, `#banner`, `#overlay`, `#panels`, `#footer`, `#left-sidebars`, `#right-sidebars`. Toolbar buttons carry their title in `button.action-button[data-title]` and their action id in `.toolbar-button[data-action]`; hovering shows a rich tooltip (`.g-rich-tooltip-container`: shortcut, title, description, and a video slot) after about 1 s.

#### Header

- [ ] RUN-SHELL-001 Menu bar: `nav.g-menu-bar` with File, Edit, Modify, View, Help; menus open on click, submenus on hover
- [ ] RUN-SHELL-002 Document tabs: `#header .section.windows .tabs` (jQuery UI sortable); a tab reads "Untitled-1" plus "✕", with "*" appended while modified
- [ ] RUN-SHELL-003 Tab context menu (right-click a tab): Rename | Save (Ctrl+S) | Share | Advanced Export... (Shift+Ctrl+E) | Duplicate | Close Other Files | Close All
- [ ] RUN-SHELL-004 "More" button (double chevron left of the avatar): lists open documents ("Untitled-1*")
- [ ] RUN-SHELL-005 Avatar "T" (red circle): menu with "T | Test | example@example.net | Account settings | Log out"
- [ ] RUN-SHELL-006 Window title: "Gravit Designer - Create" on the welcome screen (seen in analytics requests)

#### Toolbar

Order and grouping as rendered; "disabled in the empty document" buttons enable once something is selected.

- [ ] RUN-SHELL-007 Toolbar button "Save": section file; data-action file.save; icon gravit-icon-save; tooltip "Ctrl+S | Save your document | Save your progress on the current file."
- [ ] RUN-SHELL-008 Toolbar button "Undo": section file; data-action edit.undo; icon gravit-icon-undo; disabled in the empty document; tooltip "Ctrl+Z | Undo | Revert last operation. Click multiple times to go even further in edit history."; dropdown: Redo [Shift+Ctrl+Z] (disabled)
- [ ] RUN-SHELL-009 Toolbar button "Redo": section file; data-action edit.redo; icon gravit-icon-redo; disabled in the empty document; tooltip "Shift+Ctrl+Z | Redo | Redo last undone operation."
- [ ] RUN-SHELL-010 Toolbar button "Zoom": section view; icon gravit-icon-zoom-in; tooltip "Zoom"
- [ ] RUN-SHELL-011 Toolbar button "Fit All": section view; icon gravit-icon-expand; tooltip "Alt+Ctrl+0 | Fit All | Click to fit all objects in the viewport to the screen."
- [ ] RUN-SHELL-012 Toolbar button "View": section view; icon gravit-icon-move; tooltip "H | Pan tool | Click and drag to pan view."; dropdown: Pan [H] / Zoom [Z]
- [ ] RUN-SHELL-013 Toolbar button "Snap": section view; icon gravit-icon-magnet; active; tooltip "Shift+F10 | Use Snapping | Click to enable snapping."; dropdown: Use Snapping [Shift+F10] (checked) / Use Snap Zones / --- / Snap to Grid (checked) / Snap to Guide Lines (checked) / Snap to Full Pixels (checked) / Snap to Anchor Points (checked) / Snap to Shapes (checked) / Snap to Pages (checked) / --- / Show Grid [Ctrl+Alt+G] / Show Guide Lines [Ctrl+,] (checked) / Show Symbol Labels (checked)
- [ ] RUN-SHELL-014 Toolbar button "Select": section tool; icon gravit-icon-cursor-filled; active; tooltip "V | Pointer tool | Click and drag to create a selection. Click an object to select it. Hold SHIFT to add/remove from selection. Hold ALT to select only objects fully enclosed in marqee"; dropdown: Pointer [V] / Subselect [D] / --- / Lasso [O] / Layer / --- / Slice [S]
- [ ] RUN-SHELL-015 Toolbar button "Shape": section tool; icon gravit-icon-shapes; tooltip "Shape"; dropdown: Line [L] / Rectangle [R] / Ellipse [E] / --- / Polygon / Triangle / Star
- [ ] RUN-SHELL-016 Toolbar button "Path": section tool; icon gravit-icon-pen; tooltip "P | Pen tool | Click and drag to create a starting point. Hold SHIFT to constrain it in 45°. Hold D to use Subselect tool."; dropdown: Pen [P] / Bezigon [B] / --- / Freehand
- [ ] RUN-SHELL-017 Toolbar button "Knife": section tool; icon gravit-icon-scalpel; tooltip "K | Knife tool | Click a vector object to slice it."; dropdown: Knife [K] / Freehand shaping
- [ ] RUN-SHELL-018 Toolbar button "Text": section tool; icon gravit-icon-textbox; tooltip "T | Text tool | Click to create text."
- [ ] RUN-SHELL-019 Toolbar button "Place image": section tool; icon gravit-icon-upload-image-icon; tooltip "Place image | Import an image from your computer."; dropdown: Place Image... [Alt+P] / Link Image... (disabled)
- [ ] RUN-SHELL-020 Toolbar button "Flip Horizontal": section transform; data-action arrange.transform.flip-horizontal; icon gravit-icon-flip-horizontal; disabled in the empty document; tooltip "Flip Horizontal | Flip an object horizontally."
- [ ] RUN-SHELL-021 Toolbar button "Flip Vertical": section transform; data-action arrange.transform.flip-vertical; icon gravit-icon-flip-vertical; disabled in the empty document; tooltip "Flip Vertical | Flip an object vertically."
- [ ] RUN-SHELL-022 Toolbar button "Rotate 90° Left": section transform; data-action arrange.transform.rotate-90-left; icon gravit-icon-rotate-left; disabled in the empty document; tooltip "Rotate left | Rotate 90° to the left."
- [ ] RUN-SHELL-023 Toolbar button "Rotate 90° Right": section transform; data-action arrange.transform.rotate-90-right; icon gravit-icon-rotate-right; disabled in the empty document; tooltip "Rotate right | Rotate an object 90° to the right."
- [ ] RUN-SHELL-024 Toolbar button "Group": section group; data-action modify.group; icon gravit-icon-group; disabled in the empty document; tooltip "Ctrl+G | Group items | Group selected elements."
- [ ] RUN-SHELL-025 Toolbar button "Ungroup": section group; data-action modify.split; icon gravit-icon-ungroup; disabled in the empty document; tooltip "Shift+Ctrl+G | Ungroup items | Ungroup selected group of elements."
- [ ] RUN-SHELL-026 Toolbar button "Create Compound Shape": section group; data-action modify.merge; icon gravit-icon-merge-union; disabled in the empty document; tooltip "Create Compound Shape"; dropdown: Union (disabled) / Subtract (disabled) / Intersect (disabled) / Difference (disabled)
- [ ] RUN-SHELL-027 Toolbar button "Clip": section group; data-action modify.clip; icon gravit-icon-clip-circle; disabled in the empty document; tooltip "Create a clip | Create a mask for an object. Click twice to edit the clipped object."
- [ ] RUN-SHELL-028 Toolbar button "Bring Forward": section arrange; data-action arrange.order.bring-forward; icon gravit-icon-bring-front; disabled in the empty document; tooltip "Ctrl+Up | Bring element forward | Bring an element up in the layer hierarchy."
- [ ] RUN-SHELL-029 Toolbar button "Send Backward": section arrange; data-action arrange.order.send-backward; icon gravit-icon-bring-back; disabled in the empty document; tooltip "Ctrl+Down | Send element backward | Send an element down in the layer hierarchy."
- [ ] RUN-SHELL-030 Toolbar button "Create Symbol": section action; data-action modify.createsymbol; icon gravit-icon-symbolmaster; disabled in the empty document; tooltip "Create Symbol | Turn the element into a new Symbol."
- [ ] RUN-SHELL-031 Toolbar button "Convert to Path": section action; data-action modify.converttopath; icon gravit-icon-convert-to-path; disabled in the empty document; tooltip "Ctrl+Shift+P | Convert to path | Convert the selected shape into a path."
- [ ] RUN-SHELL-032 Toolbar button "Vectorize Border": section action; data-action modify.vectorize; icon gravit-icon-vectorize-border; disabled in the empty document; tooltip "Vectorize Border | Convert a border into a shape."
- [ ] RUN-SHELL-033 Toolbar button "Advanced Export...": section export; data-action file.export; icon gravit-icon-export; tooltip "Shift+Ctrl+E | Export | Export your document or selection."
- [ ] RUN-SHELL-034 Zoom button: "-" and "+" attached buttons around a caption "100%"; clicking the caption opens Original-View (Ctrl+0), 6%, 12%, 25%, 50% (Ctrl+5), 66%, 100% (Ctrl+1), 150%, 200%, 300%, 400% (Ctrl+4), 800% (Ctrl+8), 1600%, 3200%, 6400%, 12800%, 25600%; a hidden number input (min 6, max 25600) allows typing a value
- [ ] RUN-SHELL-035 Share section: a hidden collaborators list and a hidden "Share" button after the export button

#### Tools

Tool manager order (gDesigner.getToolManager().getTool(i), 30 tools): GPointerTool, GSubSelectTool, GLassoTool, GLayerTool, GLineTool, GPenTool, GBezigonTool, GPathsGraphTool, GFreehandTool, GMagicTool, GRectangleTool, GEllipseTool, GTriangleTool, GPolygonTool, GStarTool, GSimpleShapeTool, GTextTool, GKnifeTool, GFillTool, GSliceTool, GFillTool, GHandTool, GZoomTool, GPenTool, then six annotation tools (GEllipseAnnotationTool, GPencilAnnotationTool, GRectangleAnnotationTool, GArrowAnnotationTool, GCommentAnnotationTool, GHighlighterAnnotationTool). Tools have no string id; they are identified by class (toString). gravit.tools lists the 19 user tools with group/category/key.

- [ ] RUN-SHELL-036 Pointer tool [V] (group select): active at start; selection marquee, Shift adds, Alt selects fully enclosed
- [ ] RUN-SHELL-037 Subselect [D], Lasso [O] (category special), Layer (special), Slice [S] (category other): in the Select dropdown
- [ ] RUN-SHELL-038 Pen [P], Bezigon [B], Freehand (category hand): Path dropdown; pen clicks then Enter leave an open path with a fill layer and a 1 px black border
- [ ] RUN-SHELL-039 Knife [K] and "Freehand shaping" (GMagicTool, category modify): Knife dropdown
- [ ] RUN-SHELL-040 Line [L], Rectangle [R], Ellipse [E], Polygon, Triangle, Star (category polygon): Shape dropdown; the toolbar icon switches to the last used shape tool; polygon, triangle and star drag from the centre outward
- [ ] RUN-SHELL-041 Text [T]: click on canvas starts inline editing; text defaults to Open Sans Regular 20, black (shots/30-text-editing.png)
- [ ] RUN-SHELL-042 Pan [H] and Zoom [Z]: View dropdown
- [ ] RUN-SHELL-043 Default element style: rectangles, ellipses, polygons get one fill C#[235,235,235] and no border; pen paths and lines get a border C#[0,0,0] width 1; text gets fill colour black via _fc and no fill layer

#### Left sidebar

- [ ] RUN-SHELL-044 Tabs: LAYERS (active, magenta), LIBRARIES, SYMBOLS
- [ ] RUN-SHELL-045 LAYERS tab: "Pages" accordion header with buttons Toggle Single / Multipage Mode (switch), Delete Active Page, Create New Page; page list ("Page 1"); a draggable divider; "Layers" header with Delete Layer or Item and New Layer; layer rows with type icon, name, and Toggle Locker / Toggle Visibility on hover; bottom "Make Exportable" bar with Create Slice and Add Export
- [ ] RUN-SHELL-046 Layer names come from the node type: Rectangle, Ellipse, Text (the text "Hello Gravit" shows as "Text"), Path, Polygon, Group, and the file name for placed images ("test-image")
- [ ] RUN-SHELL-047 LIBRARIES tab: search box "Search..." and tiles Shapes, Illustrations, Icons, Emojis, Stickers, Frames, Lines, Unsplash Photos; all thumbnails are broken images because dkqeh8b5t3gxm.cloudfront.net does not resolve (shots/31-left-LIBRARIES.png)
- [ ] RUN-SHELL-048 SYMBOLS tab: "Symbols" header with Delete Symbol and Create New Symbol; empty text "No symbols defined. Symbols let you reuse content in your design. Create a Symbol with the “+” icon from your selected element(s)."

#### Right sidebar

- [ ] RUN-SHELL-049 Tabs: INSPECTOR (active) and COMMENTS; COMMENTS shows "CURRENT STATUS: In review / Reviewers give feedback. / Please save and share the file to start the review process. / Save and share the design now" (shots/32-right-COMMENTS.png)

#### Canvas context menu

- [ ] RUN-SHELL-050 Right-click on canvas: Edit Selection | Paste > | --- | Arrange > | Align > | Transform > | --- | Group Selection (Ctrl+G) | Ungroup Selection | Mask with Shape | --- | Convert to Path | Vectorize Border | Join Paths | Split Path | --- | Create Symbol (F8) | Reset Instance | Detach Symbol Instance | --- | Attach Text to Path | Detach Text from Path | --- | Select Same > | --- | Select > (shots/72-context-menu.png)

### 3. Main menus

Walked through the DOM (08-menus.js, menus.json) in two states: the empty document, and the same document with one selected rectangle. Labels, shortcuts, separators and checkmarks are as shown in the rectangle state. Items whose state differs only because the document now has content (Print, Fit All, Undo) are marked the same way as selection-driven ones. Edit and Modify end with a trailing separator. File > Quit, Save All, Close and the iPad import items are hidden in the browser.

#### File

- [ ] RUN-MENU-001 File > New Design...: shortcut Alt+N; enabled
- [ ] RUN-MENU-002 File > New Design from Template...: disabled in both states
- [ ] RUN-MENU-003 File > New from Clipboard: shortcut Shift+Ctrl+Alt+N; disabled in both states
- [ ] RUN-MENU-004 File > Open Local File...: shortcut Ctrl+O; enabled; after a separator
- [ ] RUN-MENU-005 File > Open Recent: enabled; submenu
- [ ] RUN-MENU-006 File > Open Recent > No Recent Files: disabled in both states
- [ ] RUN-MENU-007 File > Save: shortcut Ctrl+S; enabled; after a separator
- [ ] RUN-MENU-008 File > Save to Local File as...: shortcut Shift+Ctrl+Alt+S; enabled
- [ ] RUN-MENU-009 File > Import: enabled; submenu; after a separator
- [ ] RUN-MENU-010 File > Import > Place Image...: shortcut Alt+P; enabled
- [ ] RUN-MENU-011 File > Import > Link Image...: disabled in both states
- [ ] RUN-MENU-012 File > Import > Add Fonts...: enabled; after a separator
- [ ] RUN-MENU-013 File > Export: enabled; submenu; after a separator
- [ ] RUN-MENU-014 File > Export > Advanced Export...: shortcut Shift+Ctrl+E; enabled
- [ ] RUN-MENU-015 File > Export > PNG Image (.png): enabled; after a separator
- [ ] RUN-MENU-016 File > Export > JPEG Image (.jpg): enabled
- [ ] RUN-MENU-017 File > Export > Scalable Vector Graphics (.svg): enabled
- [ ] RUN-MENU-018 File > Export > PDF Document (.pdf): enabled; submenu
- [ ] RUN-MENU-019 File > Export > PDF Document (.pdf) > 72 dpi: enabled
- [ ] RUN-MENU-020 File > Export > PDF Document (.pdf) > 96 dpi: enabled
- [ ] RUN-MENU-021 File > Export > PDF Document (.pdf) > 150 dpi: enabled
- [ ] RUN-MENU-022 File > Export > PDF Document (.pdf) > 300 dpi: enabled
- [ ] RUN-MENU-023 File > Export > PDF Document (.pdf) > Advanced Options...: enabled; after a separator
- [ ] RUN-MENU-024 File > Print...: shortcut Ctrl+P; disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-025 File > Install to Desktop: disabled in both states; after a separator

#### Edit

- [ ] RUN-MENU-026 Edit > Undo Insert Element(s): shortcut Ctrl+Z; disabled in the empty document, enabled with a selected rectangle; label in the empty document: "Undo"
- [ ] RUN-MENU-027 Edit > Redo: shortcut Shift+Ctrl+Z; disabled in both states
- [ ] RUN-MENU-028 Edit > Cut: shortcut Ctrl+X; disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-029 Edit > Copy: shortcut Ctrl+C; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-030 Edit > Paste: enabled; submenu
- [ ] RUN-MENU-031 Edit > Paste > Paste: shortcut Ctrl+V; enabled
- [ ] RUN-MENU-032 Edit > Paste > Paste In Place: shortcut Shift+Ctrl+V; disabled in both states
- [ ] RUN-MENU-033 Edit > Paste > Paste and Replace: shortcut Alt+Ctrl+V; disabled in both states
- [ ] RUN-MENU-034 Edit > Paste > Paste Inside Selection: shortcut Alt+Shift+Ctrl+V; disabled in both states
- [ ] RUN-MENU-035 Edit > Paste > Paste Style: shortcut F4; disabled in both states
- [ ] RUN-MENU-036 Edit > Delete: shortcut Del; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-037 Edit > Duplicate: shortcut Ctrl+D; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-038 Edit > Edit Selection: disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-039 Edit > Select All: shortcut Ctrl+A; enabled
- [ ] RUN-MENU-040 Edit > Deselect All: shortcut Shift+Ctrl+A; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-041 Edit > Invert Selection: shortcut Shift+Ctrl+I; enabled
- [ ] RUN-MENU-042 Edit > Select Same: enabled; submenu; after a separator
- [ ] RUN-MENU-043 Edit > Select Same > Font Type: disabled in both states
- [ ] RUN-MENU-044 Edit > Select Same > Fill: disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-045 Edit > Select Same > Border: disabled in both states
- [ ] RUN-MENU-046 Edit > Select Same > Fill & Border: disabled in both states
- [ ] RUN-MENU-047 Edit > Select Same > Border Width: disabled in both states; after a separator
- [ ] RUN-MENU-048 Edit > Select Same > Transparency: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-049 Edit > Select Same > Blend Mode: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-050 Edit > Select Same > Shape: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-051 Edit > Select Same > Effect: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-052 Edit > Settings...: enabled; after a separator

#### Modify

- [ ] RUN-MENU-053 Modify > Arrange: enabled; submenu
- [ ] RUN-MENU-054 Modify > Arrange > Bring to Front: shortcut Shift+Ctrl+Up; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-055 Modify > Arrange > Bring Forward: shortcut Ctrl+Up; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-056 Modify > Arrange > Send Backward: shortcut Ctrl+Down; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-057 Modify > Arrange > Send to Back: shortcut Shift+Ctrl+Down; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-058 Modify > Align: enabled; submenu
- [ ] RUN-MENU-059 Modify > Align > Align Left: shortcut Alt+A; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-060 Modify > Align > Align Center: shortcut Alt+H; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-061 Modify > Align > Align Right: shortcut Alt+D; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-062 Modify > Align > Align Top: shortcut Alt+W; disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-063 Modify > Align > Align Middle: shortcut Alt+V; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-064 Modify > Align > Align Bottom: shortcut Alt+S; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-065 Modify > Align > Same Width: disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-066 Modify > Align > Same Height: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-067 Modify > Align > Distribute Horizontally: disabled in both states; after a separator
- [ ] RUN-MENU-068 Modify > Align > Distribute Vertically: disabled in both states
- [ ] RUN-MENU-069 Modify > Align > Snap to Full Units: shortcut Shift+Ctrl+U; disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-070 Modify > Align > Snap to Half Units: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-071 Modify > Transform: enabled; submenu
- [ ] RUN-MENU-072 Modify > Transform > Rotate 45° Left: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-073 Modify > Transform > Rotate 90° Left: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-074 Modify > Transform > Rotate 180° Left: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-075 Modify > Transform > Rotate 45° Right: disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-076 Modify > Transform > Rotate 90° Right: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-077 Modify > Transform > Rotate 180° Right: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-078 Modify > Transform > Flip Vertical: disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-079 Modify > Transform > Flip Horizontal: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-080 Modify > Group Selection: shortcut Ctrl+G; disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-081 Modify > Clip Selection: shortcut Alt+Ctrl+M; disabled in both states
- [ ] RUN-MENU-082 Modify > Ungroup Selection: shortcut Shift+Ctrl+G; disabled in both states
- [ ] RUN-MENU-083 Modify > Mask with Shape: shortcut Ctrl+Shift+M; disabled in both states
- [ ] RUN-MENU-084 Modify > Confirm Cropping: disabled in both states
- [ ] RUN-MENU-085 Modify > Cancel Cropping: disabled in both states
- [ ] RUN-MENU-086 Modify > Create Compound Shape: enabled; submenu
- [ ] RUN-MENU-087 Modify > Create Compound Shape > Intersect: disabled in both states
- [ ] RUN-MENU-088 Modify > Create Compound Shape > Difference: disabled in both states
- [ ] RUN-MENU-089 Modify > Create Compound Shape > Subtract: disabled in both states
- [ ] RUN-MENU-090 Modify > Create Compound Shape > Union: disabled in both states
- [ ] RUN-MENU-091 Modify > Create Nested Compound: shortcut Ctrl+Alt+M; disabled in both states
- [ ] RUN-MENU-092 Modify > Path: enabled; submenu; after a separator
- [ ] RUN-MENU-093 Modify > Path > Join Paths: shortcut Ctrl+J; disabled in both states
- [ ] RUN-MENU-094 Modify > Path > Split Path: shortcut Shift+Ctrl+J; disabled in both states
- [ ] RUN-MENU-095 Modify > Path > Convert to Path: shortcut Ctrl+Shift+P; disabled in the empty document, enabled with a selected rectangle; after a separator
- [ ] RUN-MENU-096 Modify > Path > Convert to Raw Path: shortcut Ctrl+Shift+R; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-097 Modify > Path > Convert to Outline: shortcut F5; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-098 Modify > Path > Expand/Shrink: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-099 Modify > Path > Vectorize Border: disabled in both states
- [ ] RUN-MENU-100 Modify > Path > Vectorize Image: disabled in both states
- [ ] RUN-MENU-101 Modify > Path > Attach Text to Path: disabled in both states
- [ ] RUN-MENU-102 Modify > Path > Detach Text from Path: disabled in both states
- [ ] RUN-MENU-103 Modify > Path > Simplify Path: shortcut Ctrl+Alt+S; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-104 Modify > Path > Connect Paths Lines: disabled in both states; after a separator
- [ ] RUN-MENU-105 Modify > Path > Break Curve: disabled in both states
- [ ] RUN-MENU-106 Modify > Path > Reverse Order: disabled in both states
- [ ] RUN-MENU-107 Modify > Symbol: enabled; submenu
- [ ] RUN-MENU-108 Modify > Symbol > Create Symbol: shortcut F8; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-109 Modify > Symbol > Detach Symbol Instance: shortcut Shift+Ctrl+F8; disabled in both states
- [ ] RUN-MENU-110 Modify > Symbol > Reset Instance: disabled in both states
- [ ] RUN-MENU-111 Modify > Flatten: shortcut F7; disabled in the empty document, enabled with a selected rectangle; after a separator

#### View

- [ ] RUN-MENU-112 View > Original-View: shortcut Ctrl+0; enabled
- [ ] RUN-MENU-113 View > Fit Selection: disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-114 View > Fit Layer: disabled in both states
- [ ] RUN-MENU-115 View > Fit All: shortcut Alt+Ctrl+0; disabled in the empty document, enabled with a selected rectangle
- [ ] RUN-MENU-116 View > Magnification: enabled; submenu; after a separator
- [ ] RUN-MENU-117 View > Magnification > 6%: enabled
- [ ] RUN-MENU-118 View > Magnification > 12%: enabled
- [ ] RUN-MENU-119 View > Magnification > 25%: enabled
- [ ] RUN-MENU-120 View > Magnification > 50%: shortcut Ctrl+5; enabled
- [ ] RUN-MENU-121 View > Magnification > 66%: enabled
- [ ] RUN-MENU-122 View > Magnification > 100%: shortcut Ctrl+1; enabled
- [ ] RUN-MENU-123 View > Magnification > 150%: enabled
- [ ] RUN-MENU-124 View > Magnification > 200%: enabled
- [ ] RUN-MENU-125 View > Magnification > 300%: enabled
- [ ] RUN-MENU-126 View > Magnification > 400%: shortcut Ctrl+4; enabled
- [ ] RUN-MENU-127 View > Magnification > 800%: shortcut Ctrl+8; enabled
- [ ] RUN-MENU-128 View > Magnification > 1600%: enabled
- [ ] RUN-MENU-129 View > Magnification > 3200%: enabled
- [ ] RUN-MENU-130 View > Magnification > 6400%: enabled
- [ ] RUN-MENU-131 View > Magnification > 12800%: enabled
- [ ] RUN-MENU-132 View > Magnification > 25600%: enabled
- [ ] RUN-MENU-133 View > Magnification > Zoom in: shortcut Ctrl++; enabled; after a separator
- [ ] RUN-MENU-134 View > Magnification > Zoom out: shortcut Ctrl+-; enabled
- [ ] RUN-MENU-135 View > Outline View: shortcut Alt+Y; enabled; after a separator
- [ ] RUN-MENU-136 View > Fast View: enabled
- [ ] RUN-MENU-137 View > Canvas: enabled; submenu; after a separator
- [ ] RUN-MENU-138 View > Canvas > Show Rulers: shortcut Ctrl+Alt+R; enabled
- [ ] RUN-MENU-139 View > Canvas > Show Guide Lines: shortcut Ctrl+,; enabled; checked by default
- [ ] RUN-MENU-140 View > Canvas > Show Symbol Labels: enabled; checked by default
- [ ] RUN-MENU-141 View > Canvas > Show Grid: shortcut Ctrl+Alt+G; enabled
- [ ] RUN-MENU-142 View > Canvas > Show Slices: enabled; checked by default
- [ ] RUN-MENU-143 View > Canvas > Show Effects: shortcut Ctrl+E; enabled; checked by default
- [ ] RUN-MENU-144 View > Canvas > Show Selection Handles: shortcut Shift+Ctrl+X; disabled in the empty document, enabled with a selected rectangle; checked by default; after a separator
- [ ] RUN-MENU-145 View > Snap to: enabled; submenu; after a separator
- [ ] RUN-MENU-146 View > Snap to > Use Snapping: shortcut Shift+F10; enabled; checked by default
- [ ] RUN-MENU-147 View > Snap to > Use Snap Zones: enabled
- [ ] RUN-MENU-148 View > Snap to > Snap to Grid: enabled; checked by default; after a separator
- [ ] RUN-MENU-149 View > Snap to > Snap to Guide Lines: enabled; checked by default
- [ ] RUN-MENU-150 View > Snap to > Snap to Full Pixels: enabled; checked by default
- [ ] RUN-MENU-151 View > Snap to > Snap to Anchor Points: enabled; checked by default
- [ ] RUN-MENU-152 View > Snap to > Snap to Shapes: enabled; checked by default
- [ ] RUN-MENU-153 View > Snap to > Snap to Pages: enabled; checked by default
- [ ] RUN-MENU-154 View > Show Inspector Panel: shortcut Alt+2; enabled; checked by default; after a separator
- [ ] RUN-MENU-155 View > Show Comments Panel: enabled
- [ ] RUN-MENU-156 View > Show Layers Panel: shortcut Alt+1; enabled; checked by default
- [ ] RUN-MENU-157 View > Show Libraries Panel: enabled
- [ ] RUN-MENU-158 View > Show Symbols Panel: enabled
- [ ] RUN-MENU-159 View > New View: shortcut Ctrl+Alt+N; enabled; after a separator
- [ ] RUN-MENU-160 View > Play/Present...: shortcut Ctrl+Alt+Enter; enabled; after a separator
- [ ] RUN-MENU-161 View > Toggle Fullscreen...: shortcut Alt+Enter; enabled
- [ ] RUN-MENU-162 View > Touch interface: enabled; after a separator

#### Help

- [ ] RUN-MENU-163 Help > Support: enabled; submenu
- [ ] RUN-MENU-164 Help > Support > Contact Us: enabled
- [ ] RUN-MENU-165 Help > Learn: enabled; submenu
- [ ] RUN-MENU-166 Help > Learn > User Guide: enabled
- [ ] RUN-MENU-167 Help > Learn > Tutorials: enabled
- [ ] RUN-MENU-168 Help > Learn > Display Enhanced Tooltips: enabled; checked by default
- [ ] RUN-MENU-169 Help > Learn > Show Keyboard Shortcuts: enabled
- [ ] RUN-MENU-170 Help > Request New Feature: enabled
- [ ] RUN-MENU-171 Help > Show Welcome Screen: enabled

### 4. Inspector (right sidebar)

Recorded with 13-inspector.js (inspector.json, shots/30-inspector-*.png). Every selection state starts with the align toolbar (Distribute Horizontally, Distribute Vertically, Align Left, Align Center, Align Right, Align Top, Align Middle, Align Bottom) and the dimension panel. Blending selects always offer the same 30 modes: Normal, Darken, Multiply, Color Burn, Subtract *, Linear Burn *, Lighten, Screen, Color Dodge, Linear Dodge *, Add *, Overlay, Soft Light, Hard Light, Vivid Light *, Linear Light *, Pin Light *, Hard Mix *, Hue, Saturation, Color, Luminosity, Difference, Exclusion, Divide *, Power *, Harmonic *, Sine *, and for layer blending also Mask and Inverse Mask.

- [ ] RUN-INSPECT-001 Nothing selected, header "Page (Page 1)": Color swatch, W/H (0/0 on infinite canvas), Opacity 100%, Page Size select (Infinite Canvas plus every preset name), Rotate Canvas, Trim Canvas and Clip content buttons, Bleed 0, Margin Left/Top/Right/Bottom 0 with a link toggle, Master select (empty)
- [ ] RUN-INSPECT-002 Nothing selected, "Document" panel: Unit (Pixels, Millimeters, Centimeters, Inches, Picas, Points), Color Mode (RGB, HSB, CMYK), DPI 72, Grid radio Off (checked) / On / Isometric
- [ ] RUN-INSPECT-003 Fixed-size page, nothing selected: same Page panel with the real W/H (210 x 297 in mm documents) and the document Unit set to the unit chosen at creation
- [ ] RUN-INSPECT-004 Dimension panel: Position X/Y, Size W/H with a lock-ratio toggle between them, Angle R (0°), Transform button, Anchors (left/centre/right and top/middle/bottom buttons)
- [ ] RUN-INSPECT-005 Rectangle: Appearance accordion with Corner slider + number (0) + corner settings button, Opacity slider + 100%, Blending Normal, Style "No Shared Style" + Sync (disabled)
- [ ] RUN-INSPECT-006 Rectangle Fills: header with Advanced Fill Settings, Remove Selected Fill, Add Fill; one fill row with swatch, blend select Normal, 100% and an eye toggle
- [ ] RUN-INSPECT-007 Rectangle Borders: collapsed header with Add Border only (no border by default)
- [ ] RUN-INSPECT-008 Effects section (every element type): header with an add button and a list Blur +, Color Adjust +, Drop Shadow +, Inner Shadow +, More +
- [ ] RUN-INSPECT-009 Ellipse: Appearance shows Angles (180 / 180 start/end), Shape Open / Closed / Pie, Opacity, Blending, Style; same Fills/Borders/Effects as the rectangle
- [ ] RUN-INSPECT-010 Text (editing and selected): Appearance header gains an Advanced Settings button; Color swatch (black), font family "Open Sans" picker, Weight select (Light, Light Italic, Regular, Regular Italic, Semi-Bold, Semi-Bold Italic, Bold, Bold Italic, Extra-Bold, Extra-Bold Italic) = Regular, Size 20 with a dropdown
- [ ] RUN-INSPECT-011 Text Decoration: Bold, Italic, Underline, Strikethrough buttons
- [ ] RUN-INSPECT-012 Text Alignment: Align Left (active), Align Center, Align Right, Justify
- [ ] RUN-INSPECT-013 Text Spacing: Char 0, Word 0, Line 100 with a "%" unit toggle
- [ ] RUN-INSPECT-014 Text Sizing: Width Auto/Fix and Height Auto/Fix toggles (Auto active for both)
- [ ] RUN-INSPECT-015 Text Script: direction select Left-to-right / Right-to-left / Top-to-bottom and script select Auto / Latin; checkbox "Autoscale Font" (unchecked)
- [ ] RUN-INSPECT-016 Text Fills and Borders: both empty (only Add buttons); a 112 x 27.2 box for "Hello Gravit" at the click point
- [ ] RUN-INSPECT-017 Path (pen): Appearance shows checkboxes "Closed" (off) and "Autoscale Corners" (on), Opacity, Blending, Style
- [ ] RUN-INSPECT-018 Path Borders: Advanced stroke settings, Remove Selected Border, Add Border; border row with width 1, blend Normal, opacity 100%
- [ ] RUN-INSPECT-019 Line: selection reports node "path"; same panels as a pen path, no fill, 1 px border
- [ ] RUN-INSPECT-020 Polygon: Points 6, Corner, Opacity, Blending, Style; fill only
- [ ] RUN-INSPECT-021 Triangle: node "polygon" with Points 3
- [ ] RUN-INSPECT-022 Star: node "polygon" with Points 5 and inner Size 50%
- [ ] RUN-INSPECT-023 Multi-selection (rectangle + ellipse): dimension panel shows the union box; Appearance has only Opacity, Blending, Style; Fills shows the shared fill
- [ ] RUN-INSPECT-024 Group: "Group / Frame" select (Group), checkbox "Click-through this element" (off), Appearance with Opacity, Blending, Style; no Fills or Borders section
- [ ] RUN-INSPECT-025 Image (placed through File > Import > Place Image): placed at 0,0 with its pixel size (120 x 80); Appearance shows Replace, Orig. Size, Crop, Colors buttons, Corner, Opacity, Blending, Style; Fills and Borders empty
- [ ] RUN-INSPECT-026 History panel: an always-present `.panels.history-panel` container in the inspector (version history), empty for local files
- [ ] RUN-INSPECT-027 Inspector greys out together with the rest of the shell while a modal dialog is open
- [ ] RUN-INSPECT-028 Property panel classes registered in gravit.properties: GDimensionProperties, GAlignProperties, GTransformProperties, GPageProperties, GSceneProperties, GGroupFrameProperties, GFrameProperties, GItemProperties, GPolygonProperties, GPathProperties, GEllipseProperties, GTextProperties, GImageProperties, GRectangleProperties, GSliceProperties, GBoolOpProperties, GSymbolProperties, GAppearanceProperties, two GProperties, GEffectProperties

### 5. Dialogs

Opened from the menus with 14-dialogs.js, each in a fresh page with one selected rectangle (dialogs.json, shots/40-dialog-*.png). Export entries first ask "Do you want to save this file before exporting?" with No / Yes when the document is unsaved; the walkthrough answers No.

- [ ] RUN-DIALOG-001 Settings (Edit > Settings...): `.g-settings-dialog`, a scrolling list of rows with a title, a description and a toggle on the right; Cancel and Save Changes at the bottom (shots/40-dialog-settings.png)
- [ ] RUN-DIALOG-002 Settings "Highlight on hover" / "Highlight shapes when hovering them with the mouse.": on (highlight_on_hover)
- [ ] RUN-DIALOG-003 Settings "Auto expand layers" / "When set auto-expands the layer tree for the current selection.": on (auto_expand_layers)
- [ ] RUN-DIALOG-004 Settings "Enable auto-save" / "Files are saved automatically - please choose the interval (minutes) on the right. Please note that this feature is only available for files saved or synced to Gravit Designer.": off, interval select 5 / 10 / 20 = 5 (auto_save, auto_save_interval)
- [ ] RUN-DIALOG-005 Settings "Auto-save: Warning for unsaved/local files" / "Show warning to remind about saving/syncing files to Gravit Designer to enable auto-save.": on (autosave-prompt-for-local-files-disabled false)
- [ ] RUN-DIALOG-006 Settings "Change the theme of Gravit Designer": custom dropdown "Light Theme (default)" / "Dark Theme" (theme)
- [ ] RUN-DIALOG-007 Settings "Left-aligned icons in the toolbar.": on (ui_toolbar_alignment)
- [ ] RUN-DIALOG-008 Settings "Save text layers as paths" / "Saving paths will increase the file size but not require the fonts to be available.": off
- [ ] RUN-DIALOG-009 Settings "Rounding" / "Please switch on to be able to define the number of decimal places where values are rounded in input fields.": off (decimals_num null)
- [ ] RUN-DIALOG-010 Settings "Disable warning messages of unsupported features" / "Whether to disable warning message about unsupported features on svg exporter or not.": off
- [ ] RUN-DIALOG-011 Settings "Outline fonts in EPS import" / "Fonts will be outlined so that they are not required to display the file correctly. Switch off to keep font information and edit text layers.": on (eps_outline_fonts)
- [ ] RUN-DIALOG-012 Settings "Disable notifications" / "Stop receiving email notifications for new comments or annotations (can be changed for every design individually in the comments panel).": off
- [ ] RUN-DIALOG-013 Settings "Disable changing values in numeric input fields with dragging.": off (scrubbing_flag)
- [ ] RUN-DIALOG-014 Advanced Export (File > Export > Advanced Export..., toolbar export button): `.g-export-dialog`, left column with three round mode buttons Canvas (active) / Selection / Assets, then Format select PNG / JPEG / SVG / PDF = PNG, Size "1x" with a dropdown, Background select Use page color / Use custom color / Transparent; right side a large checkerboard preview; Cancel and Export (shots/40-dialog-advanced-export-after-no.png)
- [ ] RUN-DIALOG-015 Export PDF Advanced Options (File > Export > PDF Document (.pdf) > Advanced Options...): same dialog preset to PDF with Size "72dpi", JPEG Quality 92%, Background, Color Mode RGB / CMYK, checkboxes "With effects" (on), "Export text as curves" (off), "Don’t downsample bitmap images" (on) with the hint "Downsampling will reduce image quality but create a smaller PDF document."
- [ ] RUN-DIALOG-016 Quick exports PNG / JPEG / SVG / PDF 72-300 dpi: no dialog after the save prompt; the file downloads directly as Untitled-1.png / .jpg / .svg (SVG logs the warning "Missing encoder for node type E")
- [ ] RUN-DIALOG-017 Print (File > Print...): no dialog; renders a PDF and downloads it with a UUID name (045a3866-....pdf) in headless Chromium
- [ ] RUN-DIALOG-018 Add Fonts (File > Import > Add Fonts...): opens a multi-select file picker, no dialog
- [ ] RUN-DIALOG-019 Place Image (File > Import > Place Image..., toolbar image button): opens a file picker; the image lands at 0,0 and is selected
- [ ] RUN-DIALOG-020 Expand/Shrink (Modify > Path > Expand/Shrink): `.g-system-dialog.g-prompt-dialog`, text "Enter a positive value for offset or negative for inset:", input 1, Cancel / OK
- [ ] RUN-DIALOG-021 Keyboard Shortcuts (Help > Learn > Show Keyboard Shortcuts): `.g-shortcuts-dialog` titled "Keyboard Shortcuts", a two-column list of every shortcut action and its key, ending with the tools (Pointer tool V, Subselect tool D, Lasso tool O, Slice tool S, Pen tool P, Bezigon tool B, Knife tool K, Create line L, Create rectangle R, Create ellipse E, Text tool T, Pan tool H, Zoom tool Z); includes entries with no menu item, such as "Choose a fill color Ctrl + Alt + C", "Set opacity to 100% (10%, 20%, 25%, 26%, 30%, 40%, ... 90%) Shift + 0 (1, 2, 25, 26, 3, 4, ... 9)", "Create Compound (Union) Shift + Ctrl + Y then U", "Enter layer group Enter", "Select next layer Tab", "Toggle multipage mode F6", "Swap fill and border X"
- [ ] RUN-DIALOG-022 Play/Present (View > Play/Present...): full-window presentation of the content on a light grey background, no menus, toolbar or sidebars (shots/40-dialog-play.png)
- [ ] RUN-DIALOG-023 Save chooser (File > Save on a new document with the File System Access API present): `.g-save-chooser-dialog` with two choices "Save to File" and "Save to Cloud" (shots/62-fsa-save-chooser.png)
- [ ] RUN-DIALOG-024 External links: Help > Support > Contact Us opens https://github.com/rathlinus/gravit-designer; Help > Request New Feature opens https://github.com/rathlinus/gravit-designer/issues; Help > Learn > User Guide opens /docs/index.html; Help > Learn > Tutorials opens the YouTube playlist

### 6. Theme

- [ ] RUN-THEME-001 Theme switch lives only in Edit > Settings... > "Change the theme of Gravit Designer"; picking "Dark Theme" and pressing Save Changes applies it at once without a reload (shots/51-theme-dark-applied.png)
- [ ] RUN-THEME-002 Mechanism: the stylesheet link is swapped from designer.browser.light.css to designer.browser.dark.css; the body class list does not change
- [ ] RUN-THEME-003 Persistence: designer.settings.theme becomes "dark" in localStorage and survives a reload (shots/52-theme-dark-after-reload.png); gDesigner.getSetting('theme') returns "dark"
- [ ] RUN-THEME-004 Dark look: menu bar, toolbar and sidebars dark grey with white text; magenta stays the accent; the canvas itself stays white
- [ ] RUN-THEME-005 Only two themes exist: light (default) and dark

### 7. Language

- [ ] RUN-I18N-001 No UI to change the language: the Help > Language actions (GSwitchLanguageAction, ids language.N, titles English, Deutsch, 中文, Português, Español, Français) exist in the bundle but are not registered, so no menu shows them
- [ ] RUN-I18N-002 GLocaleLanguage enum: English 0, German 1, Chinese 2, Portuguese 3, Spanish 4, French 5, Polish 6, Russian 7, Turkish 8, Czech 9, ChineseTaiwan 10, Italian 11, Japanese 12, Dutch 13, Swedish 14; G.GLocale.getAvailableLanguages() returns 0-14
- [ ] RUN-I18N-003 Startup choice: initLanguage asks GET /user; for a logged-in user it uses user.locale, otherwise designer.settings.language, otherwise the browser language. With a German system G.GLocale.getLanguage() returned 1 while every label stayed English
- [ ] RUN-I18N-004 Translations never load: only English strings are bundled (the other 14 entries have empty translations), and the translation URL comes from GET /i18n-url/<abbr>/designer, which the stub server answers with {} so the fetch fails silently. Setting designer.settings.language = 1, adding ?lang=0 / ?lang=de-DE, or faking user.locale = de-DE all left the UI English
- [ ] RUN-I18N-005 The client sends its GLocale number as ?lang= on /user and /i18n-url (lang=1 seen), while routes/user.js maps 0 to de-DE and 1 to en: the two numberings are off by one
- [ ] RUN-I18N-006 Persistence key if it worked: designer.settings.language (number), written by gDesigner.setSetting('language', n)

### 8. Storage

Snapshots of localStorage, sessionStorage, IndexedDB, Cache Storage and cookies at start, after the theme change and at the end (15-theme-i18n.js, theme-i18n.json).

- [ ] RUN-STORAGE-001 localStorage "designer.settings": one JSON object holding all user settings; keys seen: theme ("light"/"dark"), snap_disabled, snap_zones, snap_guides (["guide.guide-lines","guide.full-pixels","guide.points","guide.bbox","guide.scene","guide.grid"]), rulers_visible, guide_lines_visible, symbol_labels_visible, grid_visible, page_labels_visible, highlight_on_hover, invert_selection, auto_expand_layers, system_fonts_enabled, symbols_panel_shown, decimals_num (null), enable_steps_debug, enable_cache, ui_toolbar_alignment, eps_outline_fonts, auto_save, auto_save_interval (5), notifications_disabled, touch, sidebars_left_active, sidebars_right_active, autosave-prompt-for-local-files-disabled, dont_store_textpath, disable_warning_unsupported_features, scrubbing_flag, show_welcome_screen (only after the checkbox), language (only after setSetting)
- [ ] RUN-STORAGE-002 Settings write through immediately: toggling View > Canvas > Show Rulers sets rulers_visible true in localStorage at once
- [ ] RUN-STORAGE-003 localStorage "offline_cache": JSON {user: {...profile, locale "en", settings, _color "#B30000"}, lastUpdate, license: {license "pro", expire 2099-12-31, created, legacy false}}
- [ ] RUN-STORAGE-004 localStorage "last_update_check": epoch milliseconds as a string
- [ ] RUN-STORAGE-005 localStorage "old_version": "\"3.15.0\"" (JSON string)
- [ ] RUN-STORAGE-006 localStorage "enabled_subscriptions": "true"
- [ ] RUN-STORAGE-007 localStorage "gtm:clientid" and "_gcl_ls": Google Tag Manager / Ads client data
- [ ] RUN-STORAGE-008 sessionStorage: empty
- [ ] RUN-STORAGE-009 IndexedDB: no databases after startup, document work, theme change or file open (font import would use it; not exercised)
- [ ] RUN-STORAGE-010 Cache Storage: empty; the service worker update fails ("Failed to update a ServiceWorker ... Not found")
- [ ] RUN-STORAGE-011 Cookies: _gcl_au, _ga, _gid, _dc_gtm_UA-62755463-8 (analytics), _ginst=Browser, _gdt= (empty), _gcoupon= (empty), _gdesignerv=3.15.0
- [ ] RUN-STORAGE-012 Recent files: kept in memory by gContainer (getRecentDocuments()), not in localStorage; opening a file through the input fallback leaves File > Open Recent at "No Recent Files"

### 9. Save

Checked with 17-save.js (save.json). The sample file is C:\Users\info\AppData\Local\Temp\gd-walkthrough\samples\sample-download-Untitled-1.gvdesign (4601 bytes, one rectangle and one ellipse).

- [ ] RUN-SAVE-001 File > Save on a new document, File System Access API present: opens the save chooser (Save to File / Save to Cloud)
- [ ] RUN-SAVE-002 "Save to File": calls showSaveFilePicker({ suggestedName: "Untitled-1.gvdesign", excludeAcceptAllOption: true, types: [{ description: "*.gvdesign", accept: { "application/gravit+design": ".gvdesign" } }] }) and writes once through the handle; the tab loses its "*"
- [ ] RUN-SAVE-003 Second Ctrl+S after a change: writes again to the same handle with no dialog
- [ ] RUN-SAVE-004 File > Save on a new document without the API (fallback): nothing happens, and the page throws "Unable to execute action 'gravit-cloud.save-as' - not registered."; the document stays modified
- [ ] RUN-SAVE-005 File > Download File (Save to Local File as... without the API): triggers a browser download named "Untitled-1.gvdesign" (Playwright 'download' event) and clears the modified flag
- [ ] RUN-SAVE-006 File format: gzip (magic 1f 8b 08) of one JSON object with keys _preview (JPEG data URL thumbnail), "@":"scene", "@id", "$" (children), lmd, cfs, __ids, dictionary, symbolDictionary
- [ ] RUN-SAVE-007 Scene JSON: pages as {"@":"page", "$":[annlst, elements...], w, h, off, bck "C#[255,255,255]", name "Page 1"}; a rectangle is {"@":"rectangle", uf, ct "R", sl, trf [100,0,0,60,200,160], _sdf, _layers {"@":"paintLayers", "$":[{"@":"fillPaintLayer","_pt":"C#[235,235,235]"}]}}; trf is the unit-shape transform (w/2, 0, 0, h/2, cx, cy)
- [ ] RUN-SAVE-008 Default styles saved with every file in {"@":"styles"}: Shape Default, Text Default, Rectangle Default, Ellipse Default, Polygon Default, Path Default, Path graph default and more
- [ ] RUN-SAVE-009 Round trip: opening the sample through Open from Computer gives a tab named after the file ("sample-download-Untitled-1") with scene > page > annlst, rectangle, ellipse
- [ ] RUN-SAVE-010 Exports and print also go through the download path in the fallback (Untitled-1.png / .jpg / .svg, a UUID-named PDF for print)

### Console errors seen

Startup and normal use (19-failed-requests.js):

- 404 for http://localhost:3191/undefined on every load (a URL built from an undefined value)
- net::ERR_NAME_NOT_RESOLVED for https://dkqeh8b5t3gxm.cloudfront.net/icons/{shape,illustration,icon,emoji,sticker,frame,line,image} (library thumbnails)
- Aborted analytics requests to www.google.com/ccm/collect and ad.doubleclick.net
- pageerror "Failed to update a ServiceWorker for scope ('http://localhost:3191/') with script ('Unknown'): Not found"
- pageerror "Unable to execute action 'gravit-cloud.save-as' - not registered." on File > Save without the File System Access API
- warning "Missing encoder for node type E" on SVG export
- Chromium noise: WebGL "GPU stall due to ReadPixels" and the Canvas2D willReadFrequently hint

### Harness hooks

All verified by 18-harness-verify.js (harness-verify.json) and 21-hooks-extra.js and used by the other scripts; harness.js wraps them as window.H. Everything is reached through gDesigner plus the webpack module cache, since the scene classes are not globals. Globals the app defines: gDesigner (app), gContainer (storage, runtime, recent files), gApi (server API), gravit (registries: plugins, actions, sidebars, panels, footer, tools, properties), gQA (debugDownloadPNG/PDF/SVG/JPEG, debugOpenFile, debugImportFont), GravitDesigner (webpack output, empty object), webpackJsonpGravitDesigner (chunk queue), Mousetrap, jQuery/$, pako, zip.

```js
// Wait until the app is ready (Playwright: page.waitForFunction)
window.gDesigner && gDesigner.isReady()                      // true
gDesigner.getVersion()                                       // "3.15.0"

// Skip the welcome dialog: new infinite-canvas document
gDesigner.newInfiniteDocument(); gDesigner.closeNewDocumentDialog();
// (UI path: page.click('.g-new-document-dialog .cloud-button'))

// Active document, scene, editor, view
const doc = gDesigner.getActiveDocument();                   // doc.getTitle() -> "Untitled-1"
const scene = doc.getScene();
const ed = doc.getEditor();
const view = gDesigner.getWindows().getActiveWindow().getView();   // getZoom(), getScrollX(), getScrollY()
gDesigner.getDocuments().map(d => d.getTitle());
doc.isModified();

// Get webpack's require and the core scene library (module 1)
webpackJsonpGravitDesigner.push([[987654], { gdHarness: (m, e, r) => { window.__wpRequire = r; } }, [['gdHarness']]]);
const G = __wpRequire(1);   // GRectangle, GEllipse, GText, GPath, GGroup, GPage, GLayer, GNode, GTransform, GRGBColor, GStylable, ... (152 keys)

// Create a rectangle at x=100,y=100, 200x120 (unit shape mapped by trf), with the default style, selected
const r = new G.GRectangle();
r.setProperty('trf', new G.GTransform(100, 0, 0, 60, 200, 160));   // (w/2, 0, 0, h/2, cx, cy)
ed.insertElements([r]);                                     // one undo step "Insert Element(s)"
// Ellipse the same way with new G.GEllipse()
// insertElements(elements, skipInitialStyle, noTransaction, insertAfterSelection)

// Add a red fill layer
const fl = new G.GStylable.FillPaintLayer(); fl.setProperty('_pt', new G.GRGBColor([255, 0, 0])); r.getPaintLayers().appendChild(fl);

// Selection
ed.updateSelection(false, [r]);  ed.getSelection().map(n => n.getNodeName());  ed.clearSelection();
scene.querySingle('rectangle');  scene.queryAll('ellipse');  scene.getActivePage().getChildren();

// Serialize / deserialize the document (what the .gvdesign file contains, minus _preview and gzip)
G.GNode.serialize(scene, { save: true });                   // JSON string
G.GNode.deserialize(json);                                  // -> GScene node

// Actions by id (186 registered; ids in 03-actions-menus.md); args are an array
gDesigner.getActions().map(a => a.getId());
gDesigner.canExecuteAction('modify.group');
gDesigner.executeAction('modify.group');                    // selection becomes ["group"]
gDesigner.executeAction('edit.undo');
gDesigner.executeAction('view.magnification.200');          // view.getZoom() -> 2
gDesigner.executeAction('help.shortcuts');                  // opens the shortcuts dialog

// Tools: no string ids, match by class name
const tm = gDesigner.getToolManager();
for (let i = 0; i < tm.getToolCount(); i++) { const t = tm.getTool(i); if (String(t) === '[Object GRectangleTool]') tm.activateTool(t); }
tm.activateTool(gravit.tools.find(t => String(t.tool.prototype) === '[Object GEllipseTool]').tool);   // by class
String(tm.getActiveTool());                                 // "[Object GEllipseTool]"
tm.activateTool(tm.getTool(0));                             // back to the pointer
// then drive the canvas with page.mouse; screen-to-scene depends on the view scroll (a new
// infinite document had scroll -450,-361, so a drag at screen 700,400 landed at scene 250,39)

// Settings
gDesigner.getSetting('theme'); gDesigner.setSetting('rulers_visible', true);   // persisted in localStorage designer.settings
```

Playwright side, also verified:

```js
// File input fallback + downloads: hide the File System Access API before the app loads
await context.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined; window.chooseFileSystemEntries = undefined; });
const dl = page.waitForEvent('download'); await clickMenu(page, ['File', 'Download File']); (await dl).saveAs(target);
const fc = page.waitForEvent('filechooser'); await page.click('.g-new-document-dialog .option.local-option'); (await fc).setFiles(file);
// Or keep the API and stub showSaveFilePicker to capture the bytes written (17-save.js part 3)
```

## Review additions

Phase-1 review of inventory files 01–06 against the old bundles, the user guide in docs/ and the module index.

How this was checked:

- Coverage: every module in old-module-index.tsv over 2 KB was matched against the inventory, counting both "(module N)" mentions and bundle line references that fall inside the module's line range. 824 modules are cited, 200 modules over 2 KB are not. Each of the 200 was looked at (code, string hints and which modules require it). The verdicts are at the end. Most of them are third-party code, locale JSON, cloud/paywall code or internals of features that already have items. The few with uncovered behaviour led to the items below.
- User guide: all 96 pages in docs/ were read as text and every described feature was looked up in the inventory (about 230 keyword checks). Nearly everything has an item. The gaps found are below; features that only exist in the guide are listed under "Docs features not in this build".
- Line references: 40 randomly sampled items (seed 7) were checked line by line, plus 12 more (seed 99). All 52 were right: the cited line holds what the item says, and the numbers checked (defaults, ranges, shortcuts) match the code. Error rate 0/52 for content. A separate mechanical check of every "file:line (module N)" pair found 33 references in 31 items where the line is right but the module id is wrong. Those are under Corrections.
- Categories from the review brief that were checked and are already well covered: connector, paths graph, multi-page mode, Play/Present, print, rulers, unit conversion (GLength), scrubbing and keyboard/wheel increments in number fields, wheel and pinch zoom, clipboard formats, file drop targets, high-DPI canvas, error dialogs, empty states, libraries panel (including the dead CDN), image effects UI, touch UI. Pen pressure: there is no pressure or pointerType handling anywhere in either bundle (the only "pressure" hits are stream backpressure in a polyfill), so there is nothing to port.

### Additions

#### Shell and menus

- [ ] ADD-SHELL-001 Window resize: the main window's resize event is debounced by 500 ms, then gDesigner.relayout() runs and, on the next tick, the active window's view is fully invalidated (invalidate(null, true)). Every open gOverlay also relayouts on each resize, without a debounce — old: designer.browser.dev.js:122762-122777 (module 1491); designer.browser.dev.js:172689-172693 (module 1722)
- [ ] ADD-MENU-001 Menu open/close rules: only one menu is active at a time (setActiveMenu). While a menu is open, Esc closes it, any cancelable mousedown anywhere closes it, and mouseup closes it too, but the mouseup listener is only armed 250 ms after opening so the opening click does not close it. The last 3 mouse positions are tracked while open, and Escape modifier events are stopped from reaching the rest of the app. A submenu closes 150 ms after the pointer leaves it unless it is hovered again in that time — old: designer.browser.dev.js:72306-72391 (module 1157); designer.browser.dev.js:11663-11672 (module 238)

#### Path commands (Modify > Path)

These actions have items in 03 (ACT-PATH-005/006/008/009, ACT-MODIFY-016) that only name them. The dialogs and the algorithms they call are below.

- [ ] ADD-PATH-001 Simplify Path dialog: prompt titled "Path simplification" with a slider 0–100 (step 1, default 10) and a synced 3em text field labelled "% Tolerance". 0, NaN or infinite shows "Entered invalid number for pixel tolerance.". Every selected vertex source except images is replaced by a new path built from GVertexSimplifier(source).simplify(tolerance / 2, false, true); properties are copied with assignFrom, the path goes to the same z-position, the results are selected, all in one transaction named "Simplify Path" — old: designer.browser.dev.js:102645-102753 (module 1318)
- [ ] ADD-PATH-002 Convert to Outline (F5) dialog and result: prompt "Enter a positive value for the outline:" prefilled with "1"; 0/NaN shows "Entered invalid number for outline value.". Width is the absolute value. Counter-clockwise paths are reversed first; the line cap comes from the top-most border layer (_blc). GVertexOffsetter(path, width, inner, outer, 0, cap) builds the outline ring, which replaces the original (assignFrom keeps style and name) and is selected; one transaction — old: designer.browser.dev.js:76670-76751 (module 1185)
- [ ] ADD-PATH-003 Expand/Shrink offset rules: same prompt flow as ADD-PATH-002 (default "1", invalid value alert "Entered invalid number for offset value."). The path is first made clockwise (GPathUtil.makeClockWise); a positive value offsets outward only, a negative value inward only, by the absolute value; cap from the top border. The guide says the path direction can flip the result, but the code normalises direction, so it does not — old: designer.browser.dev.js:102575-102589 (module 1317)
- [ ] ADD-PATH-004 Vectorize Image parameters: enabled only for selected GImages that have finished loading (getStatus() falsy). GImageTracer.imagedataToTracedata on the image canvas with ltres 1, qtres min(w/4, h/4, 10), numberofcolors 8, blurradius 2, colorquantcycles 5, pathomit min(w/4, h/4, 20). One path per palette layer, simplified with GVertexSimplifier(0.4), one solid fill in the palette colour, named after the closest CSS colour name (getClosestCSSName). All paths go into a new GGroup that replaces the image and is selected; undo "Vectorize Image". This function applies no transform to the group, so check the result's placement in the running app before porting — old: designer.browser.dev.js:155481-155583 (module 1616)
- [ ] ADD-PATH-005 Flatten (modify.path2bmp, F7) mechanics: takes selected items with a non-empty paint bbox; several items are first moved into a new GGroup at the top-most item's position. Non-images are rendered with toBitmap at max(screen DPI × 72, scene "dpi"); the result is a PNG data URL, so transparency is kept (the guide says transparent pixels become white; the code does not do that). The new GImage gets iw/ih/url and trf = itrf = scale(72/dpi) translated to the paint bbox top-left, replaces the source and is selected — old: designer.browser.dev.js:102320-102415 (module 1314)

#### Files

- [ ] ADD-STORAGE-001 Empty infinite canvas blocks saving: a document with any page that has no geometry bbox (an infinite canvas page with no content, hasPagesWithInfiniteEmptyCanvas) cannot be saved or written. performSave and the storage item write() refuse with code 507 and "Saving and exporting designs with an empty infinite canvas is not allowed." (passed to the callback, or shown as an alert); Save As download refuses it for non-native formats only. Export has the same check (FMT-EXPORT-039) — old: designer.browser.dev.js:8321-8325 (module 163); designer.browser.dev.js:4588-4608 (module 119); designer.browser.dev.js:9705-9735 (module 220); designer.browser.dev.js:19178-19190 (module 445); designer.browser.dev.js:24375-24395 (module 556)
- [ ] ADD-IMPORT-001 ACV curve file parser (Color Grading "Load ACV...", UI-FIELD-083): GUtil.readACVFile(buffer) skips the 4-byte header (version, curve count), reads the point count of the composite RGB curve, stores its first point as [0, output] and skips that point's input value, then stores the remaining points as [input, output]; then reads the R, G and B curves the same way (count, then output/input pairs). Returns {rgb, r, g, b} — old: designer.browser.dev.js:72215-72237 (module 1154)
- [ ] ADD-EXPORT-001 File name sanitizing (GUtil.sanitizeFilename(name, replacement = "_"), used for export names, FMT-EXPORT-047): replaces each of `" * / : < > ? \ |`, control characters U+0000–001F and U+0080–009F, names made only of dots, Windows device names (con, prn, aux, nul, com0–9, lpt0–9, with or without an extension) and trailing spaces or dots; then truncates to 255 characters — old: designer.browser.dev.js:72174-72191 (module 1154)

#### Tools, pages, symbols, input

- [ ] ADD-TOOL-001 Ready-shape catalogue data (needed to port EDT-TOOL-075 and ENG-NODE-031): 29 definitions, each {name, shapeGroup, subGroup, vertices, width 100, height 100} plus optional annotations {name "annot", annotList [{x0, y0, X, Y, minX, maxX, …}]} for the draggable handles and parameters [{name, expression}] evaluated from annot[i].X/Y. Vertices are a flat list of command codes and coordinates in the -1..1 box, where a coordinate can be an expression string ("-1 + rlen"). Groups: Shapes/Rectangles (Rectangle, Rounded Rectangle, Snip Single Corner, Snip Same Side Corner, Snip Diagonal Corner, Snip and Round Single Corner, Round Single Corner, Round Same Side Corner, Round Diagonal Corner), Shapes/Various (Oval, Triangle, Right Triangle, Parallelogram, Trapezoid, Diamond, Regular Pentagon, Hexagon, Heptagon, Octagon, Decagon, Dodecagon, Frame, Half Frame), Arrows/Classical (Right Arrow, Left-Right Arrow), Equation/Classical (Plus, Minus, Multiply, Equal). Port the table as data, not code — old: designer.browser.dev.js:141255-142636 (module 1542)
- [ ] ADD-SCENE-001 Duplicating a page with Edit > Duplicate (Ctrl+D, GDuplicateAction → editor.cloneSelection) while a page is selected, e.g. by its label in multi-page mode: the clone is inserted into the scene, its "off" offset is set to the source page's current position, it is renamed with scene.renameClone ("Name 1", "Name 1.2"…) and becomes the active page. pages.html also describes Alt+drag of a page label; that goes through the pointer tool's Alt-drag copy, not this function, and was not traced — old: chunk.vendor.js:20509-20526 (module 82); designer.browser.dev.js:102463 (module 1315)
- [ ] ADD-SCENE-002 Pages never overlap after a resize: when a page's w or h changes and GSceneOptions.pagesCanOverlap is false, the page runs doCollisionlessTransform and its "off" offset is shifted by the returned translation, so it is pushed clear of neighbouring pages. Name changes only repaint the label — old: chunk.vendor.js:23382-23395 (module 83)
- [ ] ADD-SYMBOL-001 Deleting a symbol from the Symbols panel deletes its instances: the panel calls scene.removeSymbol(master), which removes the symbol dictionary entry, removes every linked "symbol" instance from its parent, then removes the master. The guide warns about this ("all of its instances in the document are also deleted"); UI-LIBRARY-011 only says the symbol is removed — old: chunk.vendor.js:33687-33693 (module 160); designer.browser.dev.js:172046-172066 (module 1718)
- [ ] ADD-TOOLMGR-001 Canvas input event synthesis (GWidget + GMouseEvent): a drag starts once the pointer has moved at least 1 px on either axis from the press point while a drag-enabled button is held (left and middle by default; right only after setRightDrag). DragStart is fired with the press position, Drag events carry the delta from the previous position, DragEnd fires on release of the same button. The widget calls preventDefault on mousedown and wheel, and on Tab keydown so focus does not leave the canvas. Button constants: BUTTON_LEFT 0, MIDDLE 1, RIGHT 2; buttons bitmask LEFT 1, RIGHT 2, MIDDLE 4 — old: chunk.vendor.js:84015-84052, 84095-84107 (module 644); chunk.vendor.js:19509-19530 (module 77)
- [ ] ADD-FIELD-001 Texture "paste" button quirk: pasting a texture takes the first vector source or group from the application/gravit+node clipboard; if there is none it shows a native window.alert with the arrowhead message "Select a shape, copy it to clipboard then paste it as arrow here." (wrong text reused from the border arrow paste). Fix the message in the rewrite — old: designer.browser.dev.js:68889-68915 (module 1150)

### Docs features not in this build

These are described in docs/ but have no code in the old bundles, so they need no item:

- Help > Support > Send developer details: the id "developer-details" only appears in the analytics name map (designer.browser.dev.js:125910, 126142, 126387, 126577); no action is registered.
- Ctrl+; as an alternative to Ctrl+- for zoom out (other-tools.html): zoom.out only binds META+"-" (designer.browser.dev.js:96299).
- Flatten "filling any transparent pixels with the white color" (modify-menu.html): the code keeps transparency (see ADD-PATH-005).
- Expand/Shrink direction depending on path order (modify-paths.html): the code makes the path clockwise first (see ADD-PATH-003).
- 14 UI languages (help-menu.html): the build has 6 (ACT-HELP-010).
- Pen device support (touch-interface.html) beyond plain pointer events: no pressure, tilt or pointerType handling exists.
