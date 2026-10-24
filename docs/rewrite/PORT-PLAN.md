# Port plan

How the old bundles map onto `next/src`, in work packages (clusters) that can be ported and tested one at a time. The per-module table is port-map.tsv next to this file; this document groups it.

Module ids: `v` = public/chunk.vendor.js (engine), `a` = public/designer.browser.dev.js (app). The app bundle loads the vendor chunk into the same webpack module table, so app modules require engine modules by their vendor id (mostly `v1`, the G namespace barrel).

## Decisions

- `port`: rewrite in TypeScript, keeping the old algorithm and order of floating-point operations and the old public names minus the G prefix (PROGRESS.md, Approach).
- `npm:<package@version>`: only where the npm package is the same library and version family, so output stays bit-identical.
- `data:<what>`: tables or generated assets moved as data (JSON, binary build).
- `drop:<reason>`: cloud, account, licence, paywall, analytics, Teams/SharePoint/Google Drive, Corel interop, polyfills, webpack runtime, duplicates, dead code, and libraries the platform replaces.

| Decision | Modules | Old bytes |
| --- | ---: | ---: |
| port | 995 | 8.1 MB |
| npm | 21 | 1.0 MB |
| data | 5 | 6.7 MB |
| drop | 700 | 3.6 MB |
| total | 1721 | 19.3 MB |

The data total is dominated by the HarfBuzz build (v998, 6.4 MB of wasm2js output) and the English UI strings (a814, 170 KB).

## Summary per top-level folder

| Folder | Old bytes to port | Modules | Clusters |
| --- | ---: | ---: | ---: |
| next/src/engine | 3.0 MB | 340 | 23 |
| next/src/editor | 1.4 MB | 125 | 11 |
| next/src/io | 813 KB | 189 | 7 |
| next/src/workers | 5 KB | 2 | 1 |
| next/src/app | 2.9 MB | 339 | 21 |
| total | 8.1 MB | 995 | 60 work clusters |

Clusters are counted in every folder they write to, so the cluster column doesn't add up. Four more groups hold no work: npm-libraries (pako) and the drops (drop-engine-cloud, drop-app-cloud, drop-app-runtime). The drops need no porting, only the 'no trace' tests in parity/scenarios/platform/dropped.

Not in the two bundles but part of the port (see 'Sources outside the bundles'): the PostScript interpreter ps*.js (218 KB), server.js plus routes (7 KB) and electron-main.js.

## Dependency levels

A cluster depends only on clusters of a lower level or of its own level. Clusters on the same level can be ported in parallel; where they reference each other (listed per cluster under 'Same level'), agree on the class and method names first. Since the public names stay the old ones, the interface is already fixed by the old code.

Levels come from the require graph of the old modules, with one exception: 39 references point upwards (an earlier cluster requires a module of a later one). None of them are inheritance or construction; they are `instanceof` checks, static calls or factory lookups. Each cluster lists them under 'Late-bound references'. Port them through the node class registry (`Node.getClassFromId`, by node name), an injected interface, or a registration call made by the later cluster.

| Level | Clusters (parallel) | Old bytes to port |
| ---: | --- | ---: |
| 0 | engine-core, engine-locale, engine-math, engine-opentype-fork | 529 KB |
| 1 | engine-geometry-vertex, engine-color | 167 KB |
| 2 | engine-geometry-boolean, engine-paint | 453 KB |
| 3 | engine-geometry-offset-trace, engine-scene-node, engine-style, engine-text-gtl, engine-fonts | 737 KB |
| 4 | engine-effects-canvas, engine-effects-webgl, engine-shapes-path | 390 KB |
| 5 | engine-shapes-primitives, engine-paths-graph, engine-text-node | 300 KB |
| 6 | engine-scene-document, engine-symbols-images, engine-annotations-model | 381 KB |
| 7 | io-export-svg, io-export-pdf, io-export-bitmap, io-import-svg | 607 KB |
| 8 | editor-core, editor-view, editor-element-editors, editor-path-editors, editor-text-style-editors, editor-guides, io-import-pdf-eps, io-import-sketch | 1.1 MB |
| 9 | editor-tools-base, editor-tools-select, editor-tools-path, editor-paths-graph-annotations | 515 KB |
| 10 | app-config-document, app-widgets-dialogs, editor-touch | 334 KB |
| 11 | app-shell-storage, app-fonts-ui | 294 KB |
| 12 | app-actions-file-edit, app-actions-modify, app-actions-view, app-menus-toolbar, app-dialogs-notify, app-welcome-settings | 716 KB |
| 13 | app-inspector-geometry, app-inspector-document, app-inspector-shapes, app-inspector-text-styles, app-inspector-paint, app-inspector-effects, app-color-ui, app-sidebars-layers-pages, app-library-symbols-export, app-touch-ui | 1.3 MB |
| 14 | app-designer-main | 196 KB |

## Clusters

### Level 0

#### engine-core

Type system, events, util, platform and key input, async executor, uuid.

- Old bytes: 62 KB in 16 ported modules.
- Modules: v0, v11, v64, v72, v75, v77, v142, v150, v164, v167, v176, v437, v505, v513-v514, v640. Not ported here: v270 (drop), v209 (drop), v981 (drop), v913 (npm), a610 (npm).
- Target: 16 files under next/src/engine/core.
- Public API used by other clusters:
  - Key: translateCode, translateKey, shortcutToString, toLocalizedShort, transformKey
  - Util: map, equals, extend, each, find, uuid, formatNumber, parseNumber, formatOpacity, unique
  - Object: inherit, hasMixin, inheritAndMix, getName, getTypeId, mix
  - MouseEvent: DragEnd, isDragEvent
  - EventTarget: addEventListener, removeEventListener, trigger, hasEventListeners, removeAllEventListeners
  - async-executor: execute, abort
- Same level: engine-locale, engine-math.
- Parity scenarios: engine-model/nodes, engine-geometry/length-util.
- Inventory sections: ENG-EVENT, ENG-NODE, ENG-GEOM, EDT-TOOLMGR, FMT-GVD, FMT-IMPORT.
- Pitfalls: Type ids come from a global counter in load order (`__gtype_id__`), and default styles store them as `_sdf`; register classes in the old order or store names (INVENTORY ENG-SER notes). GPlatform/GSystem sniff the user agent (ua-parser-js) and decide Meta vs Ctrl, keep that table in one place. GUtil.uuid uses Math.random, parity normalizes ids. GUtil.unpackNumbers loops over the base64 length and packPoint stores float32: keep both for byte parity, fix only behind BUGS-FIXED. GKey keeps global modifier state that tools and guides read.

#### engine-locale

GLocale runtime (translation lib, Designer project), English tables.

- Old bytes: 25 KB in 16 ported modules, plus 172 KB data.
- Modules: v9, v47, v224, v457, v632, v634-v639, v884, v889-v892. Not ported here: v888 (data), v261 (drop), v633 (drop), v456 (drop), v885 (drop), v886 (drop), v887 (drop), a814 (data), a821 (drop), a815 (drop), a822 (drop).
- Target: 15 files under next/src/engine/core/locale, next/src/app/locale.
- Public API used by other clusters:
  - Locale: get, getValue, getLanguage, setLanguage, toLocaleDate, enableExtension, getAvailableLanguages, getLocaleTagISO6391, getTranslations
  - translation-loader: getByProject, getMapped
  - translation-event-target: addEventListener, removeEventListener, trigger, hasEventListeners
  - extend: extend
  - TranslationNotificationEvent: 
  - class-reference: getReference
- Parity scenarios: ui/menus, editor-actions/registry.
- Inventory sections: UI-I18N.
- Pitfalls: Tables are keyed by the old class names ("GSubAction", "GLength"), so the JSON keeps the G prefix even where the TS class drops it. Language is a global singleton set before any UI is built. Only en-US has content; the other 14 language entries are empty.

#### engine-math

Point, rect, transform, GMath (bezier, intersections, numeric helpers), GLength.

- Old bytes: 94 KB in 5 ported modules.
- Modules: v5-v7, v12, v132.
- Target: 5 files under next/src/engine/math.
- Public API used by other clusters:
  - Math: round, isEqualEps, ptDist, normalizeAngleRadians, toRadians, ptSqrDist, segmentSide, sqrSegmentDist, toDegrees, getCtrlPts
  - Rect: getX, getY, getHeight, getWidth, equals, isEmpty, getSide, translated, deserialize
  - Length: getValue, parseEquationValue, toPoint, toUnit, parseEquation, convert
  - Transform: map, equals, translated, deserialize, mapPoint, mapRect, inverted, scaled, multiplied
  - Point: getX, getY, max, equals, translated, min, add, subtract, rotated
- Same level: engine-core.
- Parity scenarios: engine-geometry/point-rect, engine-geometry/transform, engine-geometry/math, engine-geometry/length-util.
- Inventory sections: ENG-GEOM, EDT-XFORM, ENG-SER, UI-FIELD.
- Pitfalls: Keep the order of floating-point operations in GMath (bezier subdivision, cubic/quadratic roots, angle helpers) and in GTransform multiply/inverse; no Math.hypot, no `**` instead of Math.pow, no reassociation. GRect.serialize and GTransform.serialize formats are part of the file format. GLength conversions use fixed DPI constants.

#### engine-opentype-fork

opentype.js 0.11.0 fork with Gravit changes (pako inflate, locl/numr/dnom, morx flag, cmap formats, TT hinting fixes).

- Old bytes: 347 KB in 43 ported modules.
- Modules: v89, v105, v115, v326, v376-v379, v529, v708-v725, v982-v997.
- Target: 43 files under next/src/engine/text/opentype, next/src/engine/text/opentype/tables, next/src/engine/text/opentype/features/arab, next/src/engine/text/opentype/features.
- Public API used by other clusters:
  - hintingtt: exec
  - substitution: add, getFeature
  - arabic: setText
  - kern-gpos: init, getKerningValue
- Parity scenarios: engine-model/text.
- Inventory sections: FMT-LIB.
- Pitfalls: Base is opentype.js 0.11.0 with Gravit changes (pako inflate for WOFF, morx sets hasGHBTables, locl/numr/dnom/stylistic sets, extra cmap formats, TrueType hinting fixes). Do not upgrade to 1.x; port the fork file by file and diff against 0.11.0 to keep the changes visible.

### Level 1

#### engine-geometry-vertex

Vertex containers, vertex info (bbox, hit, length), transformers, path util, fitter, simplifier, pixel aligner.

- Old bytes: 79 KB in 9 ported modules.
- Modules: v48, v54, v59, v63, v87, v140-v141, v380, v903.
- Target: 9 files under next/src/engine/geometry.
- Public API used by other clusters:
  - VertexFitter: fitCurve
  - VertexContainer: clone, deserialize, serialize, readVertex, rewindVertices, addVertex, getCount, clearVertices, hasVertexForRead
  - quadtree: split, remove, clear, insert, retrieve, Element
  - VertexPixelAligner: readVertex, rewindVertices, hasVertexForRead
  - VertexSource: readVertex, rewindVertices, hasVertexForRead, isClockWise, toSVGPath
  - VertexTransformer: getTransform, setTransform, readVertex, rewindVertices, hasVertexForRead
- Depends on: engine-core, engine-math.
- Parity scenarios: engine-geometry/vertex, engine-geometry/pathops.
- Inventory sections: ENG-GEOM, EDT-XFORM, EDT-SNAP, ENG-PATHOP, ENG-NODE.
- Pitfalls: GVertexInfo lengths and bboxes come from iterative subdivision with fixed tolerances, keep step counts. The quadtree's retrieve order decides hit-test order. GVertexPixelAligner depends on the current zoom.

#### engine-color

RGB/CMYK/HSV colors, ICC reader, CMYK JPEG decoder (jpgjs fork).

- Old bytes: 88 KB in 13 ported modules.
- Modules: v17, v50, v68, v138, v147, v158, v188, v641-v642, v648-v649, v659, v932.
- Target: 13 files under next/src/engine/color, next/src/engine/style.
- Public API used by other clusters:
  - jpeg-decoder: getData, getColorSpace
  - Color: getValue, deserialize, serialize, toScreenCSS, toScreen, asCSSBackground, hsvToRGB, rgbToHtmlHex, cmykToRGB
  - RGBColor: equals, clone, toScreen, fromCSSColor, mix, parseCSSColor, blend, closeEnough, getClosestCSSName
  - icc-profile: read
  - Gradient: equals, deserialize, getTransform, serialize, setTransform, getScale, toScreenCSS, getStops, getAverageColor
  - Pattern: inherit, hasMixin, inheritAndMix, clone, deserialize, deserialize, serialize, serialize, asCSSBackground, asCSSBackground
- Depends on: engine-math, engine-core.
- Parity scenarios: engine-model/colors.
- Inventory sections: ENG-COLOR, ENG-GRAD, ENG-SER, ENG-PATTERN, EDT-CLIP, FMT-LIB.
- Pitfalls: The ICC profile (assets/data/icc/USWebCoatedSWOP.icc) loads asynchronously into a global; CMYK conversion before it loads gives different colors. Rounding in RGB/CMYK/HSV conversions and the color string formats are serialized. The jpgjs-derived decoder must produce identical RGBA for CMYK JPEGs.

### Level 2

#### engine-geometry-boolean

Polygon boolean ops, poly segments, Kevin Lindsey intersection fork with big.js precise variants.

- Old bytes: 218 KB in 5 ported modules.
- Modules: v187, v264, v646-v647, v1002.
- Target: 5 files under next/src/engine/geometry/boolean, next/src/engine/geometry.
- Public API used by other clusters:
  - intersection: intersect
  - VertexPolyBoolean: clip, clipOp, diff, initializeSources, checkSanity
  - poly-segments: intersect, PolyLine, getFirstPoly, getSecondPoly, polyFromVertexSource, quadTreeFromPolygon, redistributeVertexSource
  - VertexSimplifier: simplify
- Depends on: engine-math, engine-geometry-vertex.
- Parity scenarios: engine-geometry/boolean.
- Inventory sections: ENG-BOOL, ENG-PATHOP.
- Pitfalls: big.js (6.2.2) precise variants and the hand-tuned epsilons (LARGE_EPS 1e-4, SMALL_EPS 1e-12) must be kept exactly; Jenkins-Traub root finder; output vertex order and start point end up in the saved JSON. Array.sort comparators must be the same functions (V8 sort is stable, so is the port's).

#### engine-paint

GPaintCanvas (Canvas 2D), paint context, renderer config, render scheduler, tile cache, dirty list.

- Old bytes: 236 KB in 24 ported modules.
- Modules: v14, v42, v103, v112, v118, v133, v166, v226, v228, v345-v346, v470, v473, v643, v663-v664, v895-v896, v898, v907, v934-v937. Not ported here: v111 (drop), v897 (drop), v899 (drop), v205 (drop).
- Target: 24 files under next/src/engine/paint, next/src/engine/paint/webgl.
- Public API used by other clusters:
  - PaintCanvas: getHeight, getWidth, clone, getTransform, drawImage, getScreenDPI, setTransform, hitTest, putVertices, resize
  - render-scheduler: init, finish, isEnabled, destroy, render, isRenderPhase, getRenderer, tryRunRendering, begin, getRenderParameters
  - shader: apply, destroy, clamp, computeDownScale, drawRect, fxaa, getDefaultShader, textures, warpShader
  - tile-renderer: getHeight, getWidth, resize, destroy, clear, cleanCache, drawTo, cleanup, getConsolidatedCanvas, getSubCanvasContainingGraphic
  - gl-context: createTexture, getGLContext
  - Blender: drawImage, fillRect, destroy, strokeRect, fill, stroke
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex.
- Late-bound references: GGLBlurEffect (engine-effects-webgl), GTexturePattern (engine-style).
- Parity scenarios: corpus/render-light, corpus/render-dark, engine-geometry/bitmap.
- Inventory sections: EDT-PAINT, EDT-RENDER, EDT-GL, EDT-PCTX, ENG-BLEND, EDT-VIEW.
- Pitfalls: The old engine records Canvas 2D and WebGL calls into a command buffer and replays them in 75 ms rAF slices; the port drops the recorder and calls the canvas directly, which must keep call order and state save/restore identical (prove with the corpus render scenarios before deleting anything). Backing canvases are sized x DPI and zoom is logical zoom; GBlender reads the canvas back into WebGL per dirty rect; the GL context is a shared singleton. Chrome-only `imageSmoothingQuality` sniffing. Tile cache shows a scaled low-res level until a rerender 750 ms later.

### Level 3

#### engine-geometry-offset-trace

Path offsetter, knife cut, image tracer (imagetracerjs fork).

- Old bytes: 142 KB in 3 ported modules.
- Modules: v651, v1003, v1079.
- Target: 3 files under next/src/engine/geometry.
- Public API used by other clusters:
  - VertexOffsetter: readVertex, rewindVertices, hasVertexForRead
  - ImageTracer: blur, getImgdata, imagedataToTracedata
  - knife-cut: checkSideOfUncut, performCut
- Depends on: engine-core, engine-math, engine-geometry-vertex, engine-paint.
- Parity scenarios: engine-geometry/pathops, engine-geometry/bitmap.
- Inventory sections: ENG-PATHOP.
- Pitfalls: The offsetter (96 KB) draws into a GPaintCanvas for some joins, so it needs the Canvas 2D backend in tests. The image tracer uses a seeded PRNG (_m_w/_m_z) instead of Math.random; keep it. Knife cut depends on the boolean intersector.

#### engine-scene-node

GNode tree and mixins, GElement, GBlock, GItem, element mixins (transform, layout, anchors, accelerated, linkable), node selector engine.

- Old bytes: 150 KB in 16 ported modules.
- Modules: v2, v22, v69, v76, v104, v207, v229, v472, v512, v569, v894, v908-v910, v912, v914.
- Target: 16 files under next/src/engine/scene, next/src/engine/serialize.
- Public API used by other clusters:
  - Node: inherit, getParent, getNext, inheritAndMix, deserialize, getWorkspace, serialize, hasFlag, beginUpdate, endUpdate
  - Element: getGeometryBBox, getPaintBBox, beginUpdate, endUpdate, hitTest, paint, getSourceBBox, isVisible, assignFrom, toBitmap
  - Block: assignFrom, isLocked, getLabel
  - scene-node: getScene, getPage, getSceneId
  - Item: assignFrom, validateInsertion, getCenter
  - Anchor: getId, setData, getData, getInEdges, getOutEdges, removeEdge, addEdge, addInEdge, addOutEdge
- Depends on: engine-core, engine-locale, engine-math, engine-color, engine-geometry-vertex, engine-paint.
- Same level: engine-style.
- Parity scenarios: engine-model/nodes, engine-geometry/hittest.
- Inventory sections: ENG-NODE, FMT-GVD, ENG-EVENT, ENG-SCENE, ENG-SER, EDT-RENDER.
- Pitfalls: Properties live as `$name` (custom `@name`), temporary values as `#$name`; events can be blocked with counters, and composite events fire at endUpdate. Flag bit values are saved. GElement caches bboxes and invalidates through change codes 210-260. Many modules reach later classes only through instanceof and the name registry; keep the registry (`GNode.getClassFromId`) as the late-binding point.

#### engine-style

Stylable, styles, paint layers (fill/border), effects container, patterns, gradients, texture/noise patterns, swatches, dictionaries.

- Old bytes: 111 KB in 14 ported modules.
- Modules: v28, v139, v227, v265, v511, v517, v662, v900-v902, v904-v906, v911.
- Target: 14 files under next/src/engine/style.
- Public API used by other clusters:
  - Stylable: getPaintLayers, getEffects, assignStyleFrom, hasStyleFill, hasStyleBorder, getStylePropertySets, getStyleBorderPadding, equalsStyle, getStyleLayers
  - TexturePattern: getHeight, getWidth, equals, clone, deserialize, getTransform, serialize, setTransform, getPosition
  - Dictionary: getValue, deserialize, serialize, merge, release, getEntries, getEntry, flush, putValueIfAbsent
  - Swatch: equals, validateInsertion, isCMYK
  - Style: assignStyleFrom, validateInsertion, getStylePropertySets, disconnectStyle
  - Background: equals, asCSSBackground, getAverageColor
- Depends on: engine-locale, engine-core, engine-math, engine-color, engine-geometry-vertex, engine-paint.
- Same level: engine-fonts, engine-scene-node.
- Late-bound references: GWorkspace (engine-scene-document), GNoisePattern (engine-effects-webgl).
- Parity scenarios: engine-model/styles, corpus/render-light.
- Inventory sections: ENG-STYLE, EDT-RENDER, ENG-TEXT, ENG-BORDER, ENG-BLEND, ENG-FILL.
- Pitfalls: Only values that differ from the per-class default tables are saved, so the default tables are file format. Radial gradient writes `_cx/_cy` but reads `cx/cy` (decide and log in BUGS-FIXED). GTexturePattern and paint layers keep runtime caches keyed by node ids.

#### engine-text-gtl

GTL layout engine (carota fork): runs, words, lines, frames, codes, lists, ranges, measuring.

- Old bytes: 257 KB in 32 ported modules.
- Modules: v148, v161, v195, v215, v230, v266-v267, v367-v369, v416, v508-v510, v650, v652-v655, v916-v928.
- Target: 32 files under next/src/engine/text/gtl, next/src/engine/text.
- Public API used by other clusters:
  - TLDirectionTextTransformer: getMatrix, getDirection, getPreTransform, setDirection
  - tl-core: getHeight, getWidth, getSelection, setText, destroy, render, select, initialize, getDocumentRange, insert
  - tl-canvas-context: getTransform, fillRect, save, scale, strokeVertices, fillVertices, restore, setScale, strokeRect, clearRect
  - document: splice, clone, save, load, select, children, width, insert, selectedRange, documentRange
  - range: setText, save, clear, plainText, getFormatting, setFormatting, canChangeListDepth, canInsertListItem, createListItem, decreaseList
  - TLPathTextTransformer: getMatrix, getBoxOrigin, getPreTransform
- Depends on: engine-math, engine-core, engine-geometry-vertex, engine-color, engine-geometry-boolean, engine-paint.
- Same level: engine-fonts, engine-geometry-offset-trace, engine-style.
- Parity scenarios: engine-model/text.
- Inventory sections: ENG-TEXT, EDT-TEXTEDIT.
- Pitfalls: Layout depends on canvas measureText, so results depend on the exact font files; parity needs the bundled fonts loaded in both apps. Super/subscript use 0.8 size; word breaking and list markers follow the carota fork, not upstream carota. Path and direction transformers and the GTL canvas context are in this cluster because the core requires them directly.

#### engine-fonts

Font model and manager, GOpenTypeFont/GOpenTypeUtil wrappers, HarfBuzz wrapper and build.

- Old bytes: 77 KB in 6 ported modules, plus 6.4 MB data.
- Modules: v108, v281, v568, v587, v726, v838. Not ported here: v998 (data).
- Target: 7 files under next/src/engine/text/fonts, next/src/engine/text/harfbuzz.
- Public API used by other clusters:
  - OpenTypeUtil: getFont, Parser
  - OpenTypeFont: create, getFamily, isResolved, getStyle, getWeight, stringToGlyphs, getGlyphBoundingRect, getGlyphOutline, getDirectionForString, getStrikeoutPosition
  - harfbuzz: Font, bcp47TagNumberToString, openTypeLanguageSystemTagNumberToBCP47TagNumber, scriptNameToOpenTypeScriptTagString, stringToTag
  - FontManager: getDefaultFont, getFont, getFonts, getDefaultFontStyles, getDefaultFontWeights, hasPendingFonts, queryFontFamily, removeFont, setDefaultFont, setDefaultFontStyles
  - Font: equals, getFamily, isResolved, getStyle, getWeight, stringToGlyphs, getGlyphBoundingRect, getGlyphOutline, isFailed, getFontFamilyCorrected
  - font-entry: getFamily, isResolved, getStyle, getWeight
- Depends on: engine-core, engine-locale, engine-math, engine-opentype-fork, engine-geometry-vertex.
- Same level: engine-text-gtl.
- Parity scenarios: engine-model/text.
- Inventory sections: ENG-TEXT, ENG-FONT, FMT-LIB, ENG-SER, ENG-EVENT.
- Pitfalls: Shaping must use HarfBuzz 2.2.0; harfbuzzjs ships a newer HarfBuzz and can shape differently. The font manager is a global singleton with async availability events; tests must await font load.

### Level 4

#### engine-effects-canvas

Canvas 2D effects: blur, shadows (drop, inner, contact, curved, long), overlay, mirror, multi effects, color grading curves, StackBlur fork.

- Old bytes: 62 KB in 14 ported modules.
- Modules: v249, v321, v432, v535, v729, v840, v931, v1008-v1009, v1026-v1029, v1031.
- Target: 14 files under next/src/engine/style/effects.
- Public API used by other clusters:
  - ContactShadowEffect: equals, destroy, getNodeNameTranslated, render, getEffectPadding, getEffectType
  - MultiEffect: equals, destroy, getNodeNameTranslated, render, getEffectPadding, register, getEffectType, getFXArray, isAffectedByChildren
  - MirrorEffect: equals, getNodeNameTranslated, render, getEffectPadding, isSingleton, getEffectType, isAffectedByChildren, isAffectedByContents
  - DropShadowEffect: equals, destroy, getNodeNameTranslated, render, getEffectPadding, applyNativeEffect, canApplyNativeEffect, getEffectType, removeNativeEffect
  - CurvedShadowEffect: equals, destroy, getNodeNameTranslated, render, getEffectPadding, getEffectType
  - InnerShadowEffect: equals, destroy, getNodeNameTranslated, render, getAbsoluteEffectPadding, getEffectPadding, getEffectType
- Depends on: engine-locale, engine-math, engine-core, engine-color, engine-paint, engine-scene-node, engine-style.
- Same level: engine-effects-webgl.
- Parity scenarios: engine-model/styles, corpus/render-light.
- Inventory sections: ENG-EFFECT, UI-FIELD, EDT-GL.
- Pitfalls: Blur and drop shadow have a CSS `ctx.filter` fast path plus a Firefox/Windows shadow workaround; StackBlur is a modified fork that premultiplies alpha. Canvas shadow and filter output differs between browsers, so pixel parity is only defined for the Chromium build the harness uses.

#### engine-effects-webgl

WebGL effect pipeline: GL context and texture manager, shader base, glfx-derived shaders, GGL* effects, blender for WebGL-only blend modes.

- Old bytes: 144 KB in 71 ported modules.
- Modules: v51, v206, v282-v283, v315, v364-v365, v474-v504, v518, v588, v661, v728, v730-v732, v839, v1004-v1007, v1010-v1025, v1030, v1032-v1034, a817.
- Target: 71 files under next/src/engine/style/webgl/shaders, next/src/engine/style/webgl/effects, next/src/engine/style, next/src/engine/style/webgl.
- Public API used by other clusters:
  - gl-stroke-layer-shader: destroy, render
  - gl-bend-blur-shader: render
  - gl-tilt-shift-shader: render
  - gl-angular-gradient-shader: render
  - NoisePattern: equals, clone, getType, getAverageColor, getTexture, setType, getAmount, isWebGL, setAmount
  - AngularGradient: equals, clone, destroy, asCSSBackground, getGradient, getShaderClass, isWebGL
- Depends on: engine-math, engine-core, engine-locale, engine-color, engine-paint, engine-style, engine-scene-node.
- Late-bound references: GRectangle (engine-shapes-primitives).
- Parity scenarios: corpus/render-light, engine-model/styles.
- Inventory sections: ENG-EFFECT, UI-FIELD, EDT-GL, ENG-GRAD, ENG-SER, ENG-PATTERN.
- Pitfalls: Shader GLSL strings must be byte-identical. Results depend on WebGL precision (highp), OES_texture_float, premultiplied-alpha upload flags and readPixels; headless Chromium renders with SwiftShader, so record and compare on the same backend. Shaders are looked up by string name through a webpack context (app module 817); the port needs an explicit name-to-class table. A Firefox/Linux sniff disables WebGL; WebGL-only blend modes fall back to normal when GL is off.

#### engine-shapes-path

GShape base, GPathBase with anchor points and corners, GPath, compound path, compound shape.

- Old bytes: 184 KB in 6 ported modules.
- Modules: v45, v56, v60, v113, v179, v233.
- Target: 6 files under next/src/engine/scene, next/src/engine/geometry.
- Public API used by other clusters:
  - PathBase: transform, readVertex, rewindVertices, getAnchorPoints, assignFrom, AnchorPoint, validateInsertion, hasVertexForRead, cloneAnchorPoints
  - Shape: transform, getTransform, setTransform, assignFrom, getAngle, getNodeNameTranslated, getPatternBBox, getSubnodeIds, createShapePaint
  - Path: clone, assignFrom, getAngle, getNodeNameTranslated, validateInsertion, isLine, correctClosedAttribute, findPivots, insertHitPoint
  - CompoundPath: transform, setTransform, readVertex, rewindVertices, assignFrom, getNodeNameTranslated, getPaths, hasVertexForRead, getSubnodeIds
  - CompoundShape: transform, readVertex, rewindVertices, assignFrom, getNodeNameTranslated, hasVertexForRead, findPivots, getCenter
  - PathUtil: createPathFromVertexSource, makeClockWise
- Depends on: engine-core, engine-math, engine-locale, engine-geometry-vertex, engine-color, engine-geometry-boolean, engine-paint, engine-scene-node, engine-style.
- Same level: engine-effects-webgl.
- Parity scenarios: engine-geometry/shapes, engine-model/nodes, engine-geometry/pathops.
- Inventory sections: ENG-NODE, ENG-SER, ENG-FILL, ENG-BORDER, ENG-BOOL, EDT-RENDER.
- Pitfalls: Auto handles, smooth/mirror rules and corner shoulders are computed in GPathBase.AnchorPoint; anchor coordinates go through packPoint (float32) on save. Path text references (`reftxt`) and connector anchors are JSON-in-JSON. GShape paints children clipped to the shape.

### Level 5

#### engine-shapes-primitives

Rectangle, ellipse, polygon, group, connector, slice, image grid, parameterized ready shapes.

- Old bytes: 69 KB in 8 ported modules.
- Modules: v73, v122, v214, v268, v284, v289, v528, v530.
- Target: 8 files under next/src/engine/scene.
- Public API used by other clusters:
  - Rectangle: assignFrom, getNodeNameTranslated, calculateMitterLimit, getPointsMinDistance, iterateSegments, getGeometryPropertiesSidePrefix, transferStyledCorners
  - Ellipse: assignFrom, getNodeNameTranslated
  - ParameterizedVertexProcessor: deserialize, serialize, getAnnotationPosition
  - Group: transform, getTransform, setTransform, getNodeNameTranslated, getAngle, getStylePropertySets, getCenter, setFrame
  - Polygon: assignFrom, getNodeNameTranslated, calculateMitterLimit, getCenter, getPointsMinDistance, isPlainEdges, iterateSegments, getOrigHalfHeight, getOrigHalfWidth
  - SimpleShape: readVertex, rewindVertices, hasVertexForRead, getIcon, getAnnotationPosition, iterateAnnotations, setAnnotationMouseLocation
- Depends on: engine-math, engine-locale, engine-core, engine-geometry-vertex, engine-color, engine-paint, engine-scene-node, engine-style, engine-shapes-path.
- Late-bound references: GPage (engine-scene-document), GLayer (engine-scene-document).
- Parity scenarios: engine-geometry/shapes, engine-model/nodes.
- Inventory sections: ENG-NODE, EDT-RENDER, FMT-EXPORT, ENG-SER.
- Pitfalls: GParameterizedVertexProcessor compiles document expressions with Function(); replace with an expression parser that evaluates in the same order with the same Math functions (abs..trunc, min/max) so vertices stay bit-identical. Polygon defaults are float expressions (2PI-PI/3). GImage inherits GRectangle, keep the serialized shape when switching to composition.

#### engine-paths-graph

Paths graph node (live paint), edges, facets, anchors, graph helper.

- Old bytes: 117 KB in 7 ported modules.
- Modules: v162, v347, v656-v657, v818, v929-v930.
- Target: 7 files under next/src/engine/scene/paths-graph.
- Public API used by other clusters:
  - PathsGraph: clone, readVertex, rewindVertices, getNodeNameTranslated, hasStyleFill, hasStyleBorder, findPivots, GraphPosition, addAnchor
  - PGEdge: deserialize, serialize, getId, validateInsertion, getStylePropertySets, getStyleBorderPadding, SplitPoint, getPathBase, setPathBase
  - PGFacet: deserialize, serialize, getId, init, getPath, validateInsertion, getStylePropertySets, getDirectedEdges, isInside
  - PGAnchor: deserialize, serialize, getId, setData, validateInsertion, getPoint, removeEdge
  - Graph: getData, setData, addAnchor, depthFirstSearch, getAnchors, getEdges, removeAnchor, removeEdge
  - Edge: getId, init, getData, setData, getAnchors, getDestination, getDestinationId, getSource, getSourceId
- Depends on: engine-core, engine-math, engine-locale, engine-geometry-vertex, engine-color, engine-geometry-boolean, engine-paint, engine-scene-node, engine-style, engine-shapes-path.
- Parity scenarios: engine-model/nodes.
- Inventory sections: ENG-NODE, ENG-SER.
- Pitfalls: Anchors, edges and facets are stored as JSON strings inside the blob (double encoding). The graph is registered but has no UI entry point; port it for file compatibility first.

#### engine-text-node

GText node, path-text and direction transformers, GTL canvas drawing context.

- Old bytes: 114 KB in 1 ported modules.
- Modules: v70.
- Target: 1 files under next/src/engine/text.
- Public API used by other clusters:
  - Text: getProperty, setProperties, transform, setTransform, readVertex, rewindVertices, setText, assignFrom, getContent
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex, engine-paint, engine-scene-node, engine-fonts, engine-style, engine-text-gtl, engine-shapes-path.
- Parity scenarios: engine-model/text, corpus/render-light.
- Inventory sections: ENG-TEXT, ENG-SER, ENG-NODE, ENG-FONT.
- Pitfalls: `GText.dontStorePaths = true`: outlines are not saved, so documents render only when fonts resolve (fake-text fallback otherwise). Content is JSON-in-JSON.

### Level 6

#### engine-scene-document

GScene, pages, layers, transactions (undo recorder), async deserialize, scene paint configuration.

- Old bytes: 163 KB in 8 ported modules.
- Modules: v83, v159-v160, v280, v471, v507, v915, v1001.
- Target: 8 files under next/src/engine/scene, next/src/engine/style, next/src/engine/undo.
- Public API used by other clusters:
  - Scene: getProperty, removeChild, getGeometryBBox, getPaintBBox, insertChild, getActivePage, hitTest, isFixedSized, destroy, link
  - Page: transform, getTransform, getPaintBBox, isFixedSized, paint, getPosition, assignFrom, getNodeNameTranslated, validateInsertion, InvalidationRequestEvent
  - default-styles: validateInsertion, setColorMode
  - TransactionRecorder: beginTransaction, afterChildInsert, afterFlagRemove, afterFlagSet, afterSetProperties, afterSpecialChange, afterTBoxCenterTransform, afterTBoxChange, beforeChildRemove
  - Layer: transform, getNodeNameTranslated, validateInsertion, setFrame
  - Workspace: getFontManager, getReference, getTransactionRecorder, addReference, resolveUrl, ResolveUrlEvent, decreaseMemoryForImage, increaseMemoryForImage, removeReference
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex, engine-paint, engine-fonts, engine-scene-node, engine-style, engine-shapes-path, engine-effects-canvas, engine-shapes-primitives, engine-text-node, engine-paths-graph.
- Same level: engine-annotations-model, engine-symbols-images.
- Parity scenarios: engine-model/nodes, corpus/load.
- Inventory sections: ENG-SCENE, ENG-SER, ENG-NODE, FMT-GVD, ENG-EVENT, EDT-RENDER.
- Pitfalls: GScene._handleChange references an undeclared `mpIdx` when `ms` changes. Migrations are 'legacy key present' checks with no version; scene `v: 10` is written but never read. Undo: nested transactions drop actions recorded between inner and outer commit, cap 100 states; port as is or fix with a BUGS-FIXED entry. Default styles register in class order.

#### engine-symbols-images

Symbols (master/instance, swap, overrides), GImage with CMYK conversion.

- Old bytes: 161 KB in 5 ported modules.
- Modules: v95, v216, v534, v658, v933.
- Target: 5 files under next/src/engine/scene, next/src/engine/style.
- Public API used by other clusters:
  - Symbol: clone, transform, getTransform, insertChild, create, setTransform, paint, isMaster, assignFrom
  - Image: getHeight, getWidth, transform, setTransform, getStatus, getType, assignFrom, destroy, getNodeNameTranslated
  - ImageGrid: readVertex, rewindVertices, hasVertexForRead, getSubnodeIds, addImage
  - SceneDictionary: release, flush, sanitize
  - symbol-dictionary: getSymbols, release, removeEntry
- Depends on: engine-math, engine-core, engine-locale, engine-geometry-vertex, engine-color, engine-paint, engine-scene-node, engine-style, engine-text-gtl, engine-shapes-path, engine-text-node, engine-shapes-primitives.
- Same level: engine-scene-document.
- Parity scenarios: engine-model/nodes, corpus/images, import-export/import.
- Inventory sections: ENG-SYMBOL, ENG-NODE, ENG-EVENT, ENG-PATTERN, ENG-SER.
- Pitfalls: Symbol instances sync with masters through sibling updates that recurse; swap state (`swp`, `swpori`) and overridden sibling ids are saved. GImage loads asynchronously (ImageStatus) and converts CMYK JPEGs; tests must wait for the status event. Scene dictionary resolves missing entries through events.

#### engine-annotations-model

Review annotation nodes (comment, rect, ellipse, arrow, pencil, highlighter, text) and the annlst container; loaded for file compatibility.

- Old bytes: 56 KB in 17 ported modules.
- Modules: v84, v285, v316-v320, v327, v366, v370, v506, v531-v533, v727, v999, v1035.
- Target: 17 files under next/src/engine/scene/annotations.
- Public API used by other clusters:
  - AnnotationsList: getGeometryBBox, getPaintBBox, beginUpdate, endUpdate, hitTest, paint, getSourceBBox, resolve, validateInsertion, getCollisions
  - CommentAnnotation: hitTest, validateInsertion, isPaintable, initDefaultForLimitedRestore, initSizeAndPosition
  - Annotation: initDefaultForLimitedRestore, initSizeAndPosition
  - CollabText: isTextMode, setModeText
  - CollaborativeTextAnnotation: validateInsertion, isPaintable, getAnnotableReferences
  - Comment: validateInsertion
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex, engine-paint, engine-scene-node, engine-style, engine-shapes-path, engine-shapes-primitives, engine-text-node.
- Same level: engine-symbols-images.
- Parity scenarios: engine-model/nodes, corpus/load.
- Inventory sections: ENG-NODE, EDT-ANNOT.
- Pitfalls: Annotation nodes live in an `annlst` container that only exists when the annotation flag is on. GCollabText inherits GImage and text annotation inherits GText; keep the serialized shapes even though the cloud features that wrote them are dropped.

### Level 7

#### io-export-svg

SVG export: GSVGExport, SVG paint context and canvas, text renderer, gradients, masks, filters, effect mapping.

- Old bytes: 146 KB in 21 ported modules.
- Modules: v438, v852, v1148-v1149, v1202, v1235-v1237, v1455-v1467.
- Target: 21 files under next/src/io/export/svg, next/src/io/export/svg/filters, next/src/io/export.
- Public API used by other clusters:
  - SVGExport: export, getUnsupportedFeatures, hasSupportedEffects
  - svg-tl-render: render
  - svg-text-attributes: add, setOrigin, getCurrentWord
  - svg-context: getTransform, setTransform, drawImage, fillRect, save, moveTo, restore, clearRect, lineTo, fill
  - SVGPaintContext: isIncludingInvisible
  - svg-images: push, pop, done, peek, beginJob, endJob
- Depends on: engine-core, engine-math, engine-color, engine-geometry-vertex, engine-paint, engine-style, engine-scene-node, engine-text-gtl, engine-fonts, engine-effects-webgl, engine-shapes-path, engine-effects-canvas, engine-shapes-primitives, engine-text-node, engine-paths-graph, engine-annotations-model, engine-scene-document, engine-symbols-images.
- Same level: io-export-bitmap, io-export-pdf.
- Parity scenarios: import-export/export-engine.
- Inventory sections: FMT-EXPORT, EDT-PCTX.
- Pitfalls: Number formatting (decimal places), attribute order and generated ids decide byte parity; ids are normalized by the harness, the rest must match. Unsupported effects are rasterized through the canvas, which is browser-dependent.

#### io-export-pdf

Gravit's own PDF writer GPDFDocument: objects, streams, resources, fonts (CID, Type1, encodings), images, shadings, text renderer, effects, rasterized fallbacks.

- Old bytes: 199 KB in 98 ported modules.
- Modules: v90, v182, v197, v293, v338, v359, v390-v391, v440, v559-v560, v564, v602, v799-v801, v853-v856, v1109-v1111, v1119, v1143-v1147, v1215-v1234, v1406-v1454.
- Target: 98 files under next/src/io/export/pdf, next/src/io/export/pdf/effects.
- Public API used by other clusters:
  - pdf-canvas: getParent, getTransform, pop, drawImage, setTransform, accept, drawCanvas, fillRect, finish, save
  - PDFExport: isSupported, export
  - pdf-tl-render: render
  - PDFDocument: add, finish, ready, write, abort, beginJob, endJob, getColorSpace, createPromise
  - content-stream: get, isEmpty, pop, add, remove, accept, set, clear, fill, stroke
  - PDFInnerShadowEffect: render
- Depends on: engine-core, engine-math, engine-locale, engine-opentype-fork, engine-color, engine-geometry-vertex, engine-paint, engine-scene-node, engine-style, engine-text-gtl, engine-fonts, engine-shapes-path, engine-effects-canvas, engine-text-node, engine-shapes-primitives, engine-paths-graph, engine-scene-document, engine-symbols-images.
- Same level: io-export-bitmap, io-export-svg.
- Parity scenarios: import-export/export-engine, import-export/export-meta.
- Inventory sections: FMT-EXPORT, EDT-PCTX, FMT-LIB.
- Pitfalls: Byte-exact output depends on object numbering, xref offsets, pako deflate level and the font subsetting done through the opentype fork. CreationDate and producer strings must be normalized in tests. Non-vectorable nodes are rasterized via canvas and, for CMYK, in the pdfexport worker.

#### io-export-bitmap

Bitmap export, JPEG encoder, PNG pHYs writer, export registry, export worker tasks (zip encode, raster), zip.js v1 (core, zip-fs, pako codec).

- Old bytes: 91 KB in 10 ported modules.
- Modules: v797-v798, v849-v850, v1112-v1113, v1120, a1514-a1516.
- Target: 10 files under next/src/io/export, next/src/io/zip, next/src/workers.
- Public API used by other clusters:
  - jpeg-encoder: encode, concurrenyEncode
  - raster: concurrencyRaster, raster
  - BitmapExport: export, convertSizeToScale, getBitmapPaintArea, getMaximumCanvasSize, getNodeSelfBitmapUsedArea
  - byte-buffer: getBuffer, getBytePosition, writeArray
  - zip-encoder: encode, concurrencyEncode
  - canvas-holder: getHTMLElement
- Depends on: engine-core, engine-math.
- Same level: io-export-pdf, io-export-svg.
- Parity scenarios: import-export/export-engine, import-export/export-meta.
- Inventory sections: FMT-EXPORT, FMT-LIB, FMT-WORKER.
- Pitfalls: Browser PNG/JPEG encoders (toBlob/toDataURL) differ between browsers; only Gravit's own JPEG encoder and the pHYs writer are deterministic. JPG quality differs by path (100 per element, browser default quick export, 92 in the dialog). zip.js v1 uses a global `zip` object with workers disabled.

#### io-import-svg

SVG importer (canvg 1.x fork building G* nodes).

- Old bytes: 171 KB in 3 ported modules.
- Modules: v1390-v1392.
- Target: 3 files under next/src/io/import/svg.
- Public API used by other clusters:
  - SVGImport: import
- Depends on: engine-core, engine-math, engine-color, engine-geometry-vertex, engine-geometry-boolean, engine-paint, engine-style, engine-scene-node, engine-text-gtl, engine-fonts, engine-shapes-path, engine-effects-canvas, engine-text-node, engine-shapes-primitives, engine-scene-document, engine-symbols-images.
- Same level: io-export-svg.
- Parity scenarios: import-export/import.
- Inventory sections: FMT-IMPORT, FMT-LIB.
- Pitfalls: The canvg fork parses through the DOM and maps CSS, gradients and filters straight to G* nodes; whitespace and unit handling decide geometry. Fonts resolve through the import font resolver.

### Level 8

#### editor-core

GEditor (selection, clipboard hooks, transactions), editor options, style editor manager, action manager, handle annotations, cursors.

- Old bytes: 144 KB in 13 ported modules.
- Modules: v24, v52, v81-v82, v383, v542-v543, v749-v750, v777-v779, v1080. Not ported here: v1000 (drop), v645 (drop).
- Target: 13 files under next/src/editor, next/src/editor/handles.
- Public API used by other clusters:
  - Editor: getScene, getEditor, beginTransaction, commitTransaction, getSelection, updateSelection, tryRunTransaction, requestInvalidation, clearSelection
  - StyleEdManager: getScene, getEditor, beginTransaction, commitTransaction, activate, deactivate, deactivateEditor, isActivated, getActiveEditor
  - EditorOptions: restore, isPreserveAspectRatioEnabledForSide
  - icon-annotation: paintAnnotation, getAnnotationBBox, getIcon, setIcon, getAnnotHalfWidth, isIconVisible, setIconVisible
  - ActionManager: setView
  - EditorPaintConfiguration: 
- Depends on: engine-core, engine-math, engine-locale, engine-geometry-vertex, engine-color, engine-paint, engine-scene-node, engine-style, engine-shapes-path, engine-effects-webgl, engine-text-node, engine-shapes-primitives, engine-paths-graph, engine-scene-document, engine-annotations-model, engine-symbols-images.
- Same level: editor-element-editors, editor-guides, editor-path-editors, editor-text-style-editors.
- Late-bound references: GPathsGraphEditor (editor-paths-graph-annotations), GToolManager (editor-tools-base).
- Parity scenarios: editor-tools/pointer, editor-actions/exec.
- Inventory sections: EDT-EDITOR, EDT-SEL, EDT-HANDLE, EDT-CURSOR, EDT-UNDO, EDT-ANNOT.
- Pitfalls: Selection lives in node flags (Selected, Highlighted), and editors open and close as side effects of flag events; panels and actions toggle flags directly. GEditorOptions multiplies handle sizes by DPI at module load (global); compute at paint time but keep the numbers. Undo states are capped at 100.

#### editor-view

GSceneWidget view, GWidget base, GEditorWidget (overlay, zoom, panning), ruler widget.

- Old bytes: 122 KB in 5 ported modules.
- Modules: v333, v363, v644, v893, v1081.
- Target: 5 files under next/src/editor/view.
- Public API used by other clusters:
  - SceneWidget: getScene, transform, getViewConfiguration, resize, invalidate, getViewTransform, getWorldTransform, getZoom, release
  - EditorWidget: getEditor, focus, getHtmlElement, release, setRulers, endCaptureInput, finishMoveGuideLine, handleDropEvent, hasFocus
  - Widget: getX, getY, addEventListener, getHeight, getWidth, removeEventListener, trigger, resize, focus
  - RulerWidget: getHeight, getWidth, resize, release
  - panning: beginPan, endPan, isPanning, panView, getLastPanMovement
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-paint, engine-scene-node, engine-scene-document, engine-symbols-images.
- Same level: editor-core, editor-element-editors, editor-guides.
- Late-bound references: GToolManager (editor-tools-base).
- Parity scenarios: smoke, editor-tools/pointer, corpus/render-light.
- Inventory sections: EDT-RENDER, EDT-VIEW, EDT-DND, EDT-EDITOR, EDT-TOUCH, EDT-GUIDE.
- Pitfalls: Zoom limits (6%..25600%) and the wheel snap list appear in three places; make one table. Panning reuses pixels and only renders exposed strips; WebGL effects switch off while panning or zooming. DOM pointer handling and DPI scaling.

#### editor-element-editors

Element editor base, box editor, transform box, block/item/shape/group/layer/page/scene editors, selection position editor, special editors.

- Old bytes: 226 KB in 21 ported modules.
- Modules: v36, v39, v66, v128, v154, v274, v329-v331, v545-v546, v552, v745, v747, v751, v760, v1082-v1086.
- Target: 21 files under next/src/editor/element-editors.
- Public API used by other clusters:
  - BoxEditor: resize, paint, resetTransform, getBBox, getBBoxMargin, getCursor, edTransform, getBox, getBoxTransform
  - ImageEditor: removeFlag, setEditMode, getBBox, getPartInfoAt, canApplyTransform, getCursor, createElementPreview, hasSelectionEditing, initialSetup
  - TransformBox: getTransform, setTransform, readVertex, rewindVertices, paint, hide, hasVertexForRead, show, getPartInfoAt
  - SceneEditor: paint, requestInvalidation, getBBox, getCursor, getTBoxMode, getTransformBox, isRelativeToPage, isTransformBoxActive, setTransformBoxActive
  - BaseEditor: getEditor, hasFlag, removeFlag, setFlag, accept, paint, invalidate, requestInvalidation, resetTransform
  - ElementEditor: getEditor, requestInvalidation, resetTransform, getElement, applyTransform, openEditor, getBBox, canApplyTransform, exports
- Depends on: engine-core, engine-math, engine-locale, engine-geometry-vertex, engine-color, engine-paint, engine-scene-node, engine-style, engine-shapes-path, engine-text-node, engine-shapes-primitives, engine-annotations-model, engine-scene-document, engine-symbols-images.
- Same level: editor-core, editor-path-editors.
- Parity scenarios: editor-tools/pointer, editor-tools/shapes.
- Inventory sections: EDT-ELEDIT, EDT-XFORM, EDT-HANDLE, EDT-CROP, EDT-DND, EDT-SNAP.
- Pitfalls: Everything previews on a cloned element and commits on mouse up as one transaction. GSceneEditor.getCursor falls through from OUTSIDE to ROTATE (missing break). Handle sizes are screen px x DPI from GEditorOptions.

#### editor-path-editors

Path editor (points, segments, handles, shoulders), path base and compound path editors, connector editor.

- Old bytes: 90 KB in 4 ported modules.
- Modules: v127, v155, v235, v1078.
- Target: 4 files under next/src/editor/element-editors.
- Public API used by other clusters:
  - PathEditor: removeFlag, setFlag, getPath, resetTransform, getBBox, getCursor, canApplyTransform, constrainPosition, getPartSelection
  - CompoundPathEditor: removeFlag, setFlag, resetTransform, updatePartSelection, getPartInfoAt, getBBox, canApplyTransform, edTransform, getActiveExtendingMode
  - PathBaseEditor: edTransform, getPointPreview, setCatchHandle, getPathBasePreview, releasePathBasePreview, transformBox
  - connector-editor: isDeletePartsAllowed
- Depends on: engine-core, engine-math, engine-geometry-vertex, engine-color, engine-scene-node, engine-style, engine-shapes-path, engine-shapes-primitives.
- Same level: editor-core, editor-element-editors.
- Parity scenarios: editor-tools/path.
- Inventory sections: EDT-PATHEDIT, EDT-HANDLE, EDT-ELEDIT.
- Pitfalls: Right-drag is an editing gesture (pull handles, corner shoulders), so context menus must not swallow it. Known bugs: segment drag at slope ~0/1 builds PartInfo type `H`; `_movePreviewPointShoulders` reads `cr` as `cl`.

#### editor-text-style-editors

Text editor and inline text editor, style editor, gradient style editors (linear, radial, angular).

- Old bytes: 142 KB in 7 ported modules.
- Modules: v276, v385, v387, v752, v780-v782.
- Target: 7 files under next/src/editor/element-editors.
- Public API used by other clusters:
  - TextEditor: getProperty, setProperty, setProperties, resetTransform, getBBox, isInlineEdit, getDefaultStyle, getPEGeometryBBox, hasPathAttached
  - InlineTextEditor: activate, deactivate, isActivated, setCursor
  - RadialGradientEditor: paint, activate, updatePartSelection, getPartInfoAt, getCursor, getCustomBBox, movePart
  - GradientStyleEditor: activate, deactivate, updatePartSelection, getCursor, getCustomBBox, getEditorData, getObjectNameModified, movePart, validateAlreadyActive
  - AngularGradientEditor: paint, activate, getPartInfoAt, getCursor, getCustomBBox, movePart
  - LinearGradientEditor: paint, activate, getPartInfoAt, resetPartMove, movePart
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex, engine-paint, engine-text-gtl, engine-scene-node, engine-fonts, engine-style, engine-shapes-path, engine-effects-webgl, engine-text-node, engine-shapes-primitives, engine-scene-document.
- Same level: editor-core, editor-element-editors.
- Parity scenarios: editor-tools/shapes, engine-model/text.
- Inventory sections: EDT-TEXTEDIT, EDT-ELEDIT, EDT-HANDLE, EDT-DND.
- Pitfalls: Inline editing uses a contenteditable element; Ctrl/Cmd is `metaKey` in view events but `ctrlKey && !altKey` on the DOM path. Gradient editors disable snapping with Meta. IME and clipboard inside text need manual checks; the parity driver can only type plain keys.

#### editor-guides

Snapping pipeline GGuides and guides (bbox, grid, guide lines, points, page, labels, full pixels, action, symbol labels), distance helper.

- Old bytes: 159 KB in 13 ported modules.
- Modules: v99, v153, v210, v540, v544, v739-v744, v1076-v1077.
- Target: 13 files under next/src/editor/guides.
- Public API used by other clusters:
  - distance-helper: paint, invalidate, requestInvalidation, isActivated, InvalidationRequestEvent, setView, activateMeasurement, deactivateMeasurement, refreshVisuals
  - Guides: mapPoint, mapRect, paint, invalidate, beginMap, finishMap, useExclusions, InvalidationRequestEvent, getBBoxSnapZones
  - BBoxGuide: map, getId, useExclusions, isRelativeToPage, setPriority
  - GridGuide: map, getId, paint
  - PointsGuide: map, getId, useExclusions, isRelativeToPage
  - PageGuide: map, getId, isRelativeToPage
- Depends on: engine-math, engine-core, engine-locale, engine-geometry-vertex, engine-color, engine-paint, engine-scene-node, engine-shapes-path, engine-scene-document, engine-annotations-model, engine-symbols-images.
- Same level: editor-core, editor-element-editors, editor-view.
- Parity scenarios: editor-tools/pointer.
- Inventory sections: EDT-GUIDE, EDT-SNAP, ENG-SCENE, ENG-EVENT, EDT-SYMBOL.
- Pitfalls: One ordered pipeline (bbox, grid, guide lines, points, page, full pixels), first hit wins per axis; keep the order. Snap distance is in screen px divided by logical zoom. Cmd/Ctrl inverts snapping by reading global modifier state; pass modifiers in instead but keep the result. Ruler guides are index-based number arrays (`hgl`/`vgl`).

#### io-import-pdf-eps

PDF import through pdf.js (canvas bridge, text merging, embedded fonts), EPS host side, bitmap import, importer registry, import font matching.

- Old bytes: 124 KB in 16 ported modules.
- Modules: v1142, v1201, v1203-v1205, v1213, v1393-v1399, v1403-v1405. Not ported here: a792 (npm).
- Target: 16 files under next/src/io/import/pdf, next/src/io/import, next/src/io/import/fonts, next/src/io/import/eps.
- Public API used by other clusters:
  - pdf-canvas-bridge: transform, drawImage, setTransform, fillRect, save, scale, moveTo, restore, getImageData, lineTo
  - google-font-names: contains
  - shape-merge: appendTo, parse
  - PDFImport: import, updateFontFamilies
  - import-font-resolver: getDefaultFont, getFont, ready, queryFirst
  - EPSImport: import
- Depends on: engine-core, engine-math, engine-opentype-fork, engine-locale, engine-color, engine-geometry-vertex, engine-paint, engine-geometry-boolean, engine-fonts, engine-scene-node, engine-text-gtl, engine-style, engine-shapes-path, engine-text-node, engine-shapes-primitives, engine-scene-document, engine-symbols-images, io-import-svg, io-export-bitmap.
- Same level: io-import-sketch.
- Parity scenarios: import-export/import.
- Inventory sections: FMT-IMPORT, FMT-WORKER, FMT-LIB.
- Pitfalls: pdf.js is pinned to 2.1.x with a Gravit CMYK patch (canvasGraphicsClass bridge); a newer pdfjs-dist changes text and path output. EPS runs ps*.js in a worker and needs SharedArrayBuffer plus COOP/COEP headers; Atomics.wake must become Atomics.notify. Placing a PDF imports page 1 only.

#### io-import-sketch

Sketch importer: document, pages, groups, shapes, styles, gradients, images, text (bplist NSAttributedString), symbols, effects.

- Old bytes: 87 KB in 42 ported modules.
- Modules: v439, v561-v563, v597-v601, v793-v796, v1121-v1141, v1206-v1209, v1211-v1212, v1214, a1400.
- Target: 42 files under next/src/io/import/sketch, next/src/io/import/sketch/effects.
- Public API used by other clusters:
  - text: parse, setText
  - sketch-document: parse, load, getReference, getVersion, getMissingFonts
  - symbols: clone, parse, appendTo
  - style: getParent, clone, transform, parse, appendTo, getId, accept, getChildren, getData, visitReferences
  - bplist: parse
  - shape-group: parse
- Depends on: engine-core, engine-locale, engine-math, engine-color, engine-paint, engine-style, engine-scene-node, engine-fonts, engine-text-gtl, engine-shapes-path, engine-effects-webgl, engine-effects-canvas, engine-text-node, engine-shapes-primitives, engine-scene-document, engine-symbols-images.
- Same level: io-import-pdf-eps.
- Parity scenarios: import-export/import.
- Inventory sections: FMT-IMPORT, FMT-WORKER, FMT-LIB.
- Pitfalls: Uses the zip.js v1 global API and a bplist reader for text archives; Sketch import is not reachable from the UI (FMT-IMPORT-002), port it after the reachable formats.

### Level 9

#### editor-tools-base

Tool base and tool manager, shape tools, text, zoom, hand, layer, slice, magic, connector, fill tools; G namespace barrels used by the parity harness (window.__parity.G) and the editor/input barrels.

- Old bytes: 92 KB in 23 ported modules.
- Modules: v1, v15, v53, v211, v236, v332, v384, v547-v551, v553, v738, v746, v754-v756, v758-v759, v762-v764.
- Target: 23 files under next/src/editor/tools, next/src/editor, next/src/engine.
- Public API used by other clusters:
  - ShapeTool: paint, activate, deactivate, getCursor, isDeactivatable
  - ToolManager: indexOf, paint, getActiveTool, activateTool, InvalidationRequestEvent, activateSubSelect, notifyJobDone, getTemporaryActiveTool, getTool
  - TextTool: deactivate, getCursor
  - SliceTool: paint, activate, deactivate, getCursor, isDeactivatable
  - ZoomTool: paint, activate, deactivate, getCursor, isDeactivatable
  - MagicTool: 
- Depends on: engine-core, engine-math, engine-locale, engine-geometry-vertex, engine-color, engine-paint, engine-geometry-boolean, engine-scene-node, engine-text-gtl, engine-fonts, engine-style, engine-geometry-offset-trace, engine-shapes-path, engine-effects-webgl, engine-effects-canvas, engine-shapes-primitives, engine-paths-graph, engine-text-node, engine-annotations-model, engine-symbols-images, engine-scene-document, editor-core, editor-element-editors, editor-guides, editor-view, editor-text-style-editors, editor-path-editors.
- Same level: editor-paths-graph-annotations, editor-tools-path, editor-tools-select.
- Parity scenarios: editor-tools/shapes, editor-tools/pointer, smoke.
- Inventory sections: EDT-TOOL, EDT-TOOLMGR, ACT-KEY, EDT-CURSOR, EDT-VIEW, EDT-GL.
- Pitfalls: Tools re-run drag logic when a modifier flips mid-gesture (GModifiersChangedEvent). Spring-loaded keys use a 450 ms timer; tests need fake timers. Zoom levels table duplicates the view's.

#### editor-tools-select

GSelectTool (selection, move, nudge, transform box, guide drag, mask drop), subselect, lasso.

- Old bytes: 124 KB in 3 ported modules.
- Modules: v334, v386, v748.
- Target: 3 files under next/src/editor/tools.
- Public API used by other clusters:
  - SelectTool: paint, activate, deactivate, setEditMode, isDeactivatable, Event, getCursor, getEditMode, catchesContextMenu
  - LassoTool: getCursor
  - SubSelectTool: activate, deactivate, getCursor
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex, engine-geometry-boolean, engine-scene-node, engine-shapes-path, engine-shapes-primitives, engine-paths-graph, engine-text-node, engine-scene-document, engine-symbols-images, engine-annotations-model, editor-element-editors, editor-core, editor-text-style-editors, editor-guides, editor-path-editors, editor-view.
- Same level: editor-paths-graph-annotations, editor-tools-base.
- Parity scenarios: editor-tools/pointer.
- Inventory sections: EDT-TOOL, EDT-NUDGE, EDT-XFORM, EDT-GUIDE, EDT-SEL, EDT-CROP.
- Pitfalls: GSelectTool is 2,700 lines mixing selection, move, nudge, transform box, guide dragging, mask drop and page reparenting; port behaviour-first with the pointer scenarios, then split. Plus/minus + arrow resize lives in its key handler.

#### editor-tools-path

Pen, path, freehand, bezigon and knife tools.

- Old bytes: 145 KB in 5 ported modules.
- Modules: v335, v539, v541, v757, v761.
- Target: 5 files under next/src/editor/tools.
- Public API used by other clusters:
  - PathTool: paint, activate, deactivate, getCursor, isDeactivatable, catchesContextMenu
  - KnifeTool: paint, activate, requestInvalidation, deactivate, getPath, getDefaultStyle, movePoint, getTransformFromNative, getPathPreview
  - PenTool: activate, deactivate
  - FreehandTool: activate, deactivate, getCursor, isDeactivatable
  - BezigonTool: activate, deactivate
- Depends on: engine-core, engine-math, engine-locale, engine-color, engine-geometry-vertex, engine-geometry-boolean, engine-paint, engine-scene-node, engine-geometry-offset-trace, engine-shapes-path, engine-text-node, engine-shapes-primitives, engine-symbols-images, editor-guides, editor-core, editor-path-editors, editor-view, editor-element-editors.
- Same level: editor-tools-base.
- Parity scenarios: editor-tools/path.
- Inventory sections: EDT-TOOL, EDT-CURSOR.
- Pitfalls: Pen keeps state across the 'light' switch (D, Space); knife uses the knife-cut algorithm from engine-geometry-offset-trace. Freehand fitting uses GVertexFitter tolerances.

#### editor-paths-graph-annotations

Paths graph editor and tool (registered, no UI entry); Review annotation tools and editors (only reachable from the annotations sidebar).

- Old bytes: 154 KB in 18 ported modules.
- Modules: v172, v212, v275, v753, v765-v776, v783, v1088. Not ported here: v1087 (drop), v1089 (drop).
- Target: 18 files under next/src/editor/annotations, next/src/editor/paths-graph.
- Public API used by other clusters:
  - PathsGraphEditor: resetTransform, setEditMode, canApplyTransform, getBBox, getCursor, getPartSelection, constrainPosition, edTransform, findPivots
  - PathsGraphTool: activate, deactivate, getCursor, isDeactivatable, catchesContextMenu
  - CommentAnnotationEditor: canHandleDblClick, getCustomBBox, handleDblClick, initialSetup, isRemovalBlocked, movePart
  - AnnotationEditor: removeAnnotations
  - CommentAnnotationTool: getCursor
  - RectangleAnnotationEditor: canHandleDblClick, handleDblClick, initialSetup, isRemovalBlocked
- Depends on: engine-math, engine-core, engine-locale, engine-geometry-vertex, engine-color, engine-geometry-boolean, engine-paint, engine-scene-node, engine-style, engine-shapes-path, engine-paths-graph, engine-shapes-primitives, engine-text-node, engine-annotations-model, editor-element-editors, editor-core, editor-path-editors, editor-guides, editor-text-style-editors.
- Same level: editor-tools-base, editor-tools-path.
- Parity scenarios: editor-tools/path, editor-tools/shapes.
- Inventory sections: EDT-ANNOT, EDT-PATHEDIT, EDT-TOOL, EDT-TOOLMGR, EDT-ELEDIT.
- Pitfalls: Registered but hidden tools (paths graph, review annotations). Paths-graph edge delete removes only the first selected edge. Annotation tools are only reachable from the annotations sidebar, which is dropped with the cloud; keep them behind a flag.

### Level 10

#### app-config-document

App config constants and file-format table, GDocument (load, save, placeOrImport, import optimiser), designer util grab-bag, document events.

- Old bytes: 184 KB in 23 ported modules.
- Modules: a10, a40, a78, a86, a119, a163, a173, a217, a355, a389, a442-a443, a519, a536, a592, a594, a790, a1042, a1154, a1301, a1557, a1688, a1690. Not ported here: a231 (drop).
- Target: 23 files under next/src/app/util, next/src/app/document, next/src/app, next/src/app/shell.
- Public API used by other clusters:
  - document: getScene, getEditor, getId, getActiveWindow, getWindows, getStatus, getTitle, activate, deactivate, load
  - document-images: performLogin, isOnline, resendEmailConfirmation, activateCoupon, convertToCloudItem, createFile, fileExists, getRecentStorageItems, loadDesignData, performSave
  - file-formats: logEvent
  - DocumentEvent: 
  - async-cache: get, reset
  - type-map: from, hasValue
- Depends on: engine-annotations-model, io-export-bitmap, io-import-pdf-eps, editor-tools-base.
- Same level: app-widgets-dialogs.
- Late-bound references: missing-font-tracker (app-fonts-ui), font-availability-tracker (app-fonts-ui), heic (app-shell-storage), storage (app-shell-storage), missing-fonts-dialog (app-dialogs-notify), pattern-type-menu (app-color-ui), document-chooser (app-library-symbols-export), font-manager (app-fonts-ui), GContainer (app-shell-storage), progress (app-shell-storage).
- Parity scenarios: corpus/load, import-export/import.
- Inventory sections: FMT-IMPORT, FMT-GVD, FMT-EXPORT, EDT-DND, FMT-PREVIEW, ADD-STORAGE.
- Pitfalls: GDocument is a god object (load, save, placeOrImport, import optimiser, UI hooks). Split load/save into io/format but keep one entry point for paste and drop. a10 mixes local config with cloud keys; port only the local ones. Many back-references to later app clusters go through gDesigner/gContainer globals.

#### app-widgets-dialogs

System dialog, dialog stack and container, message dialog, and the form widgets as React components: input box, unit box, select, checkbox slider, slider, pivot, property row, unit select, accordion, input label, rich tooltip, autoedit, elastic textarea, input event shim, debounce; Designer-side language loading and translation glue.

- Old bytes: 119 KB in 24 ported modules.
- Modules: a44, a67, a219, a394, a606-a607, a1037, a1343, a1689, a1695, a1702-a1705, a1714-a1715, a1722, a1724-a1730. Not ported here: a1640 (drop), a1620 (drop), a1639 (drop), a1685 (drop).
- Target: 24 files under next/src/app/widgets, next/src/app/dialogs, next/src/app/inspector, next/src/app/locale.
- Public API used by other clusters:
  - SystemDialog: error, alert, confirm, custom, info, showCDRUnsupportedObjectWarning, externalFileError, prompt, advanced
  - translation-manager: init, import, export
  - language: setLanguage
  - checkbox-slider: unmount
  - View: getId, isVisible, getTitle, isEnabled, UpdateEvent
  - message-dialog: open, close
- Depends on: engine-core, editor-tools-base.
- Same level: app-config-document.
- Late-bound references: settings-keys (app-welcome-settings), GMenu (app-menus-toolbar), alignment-position (app-shell-storage), GEnhancedTooltipsAction (app-actions-view), GRenameLayerAction (app-actions-modify), GCycleThroughLayersAction (app-actions-modify).
- Parity scenarios: ui/menus, editor-actions/dialogs.
- Inventory sections: UI-DIALOG, UI-FIELD, UI-I18N, UI-TOOLTIP, ACT-HELP, UI-INSPECT.
- Pitfalls: jQuery plugins (gInputBox, gUnitBox, gDialog, ...) become React components but must keep class names and keyboard behaviour (scrubbing, unit parsing). Dialog stack closes the top dialog on Esc.

#### editor-touch

Touch input layer: gesture helper, tap, pan, pinch, long press, touch tool.

- Old bytes: 31 KB in 14 ported modules.
- Modules: a340, a878-a880, a1189, a1329, a1581-a1586, a1590, a1693.
- Target: 14 files under next/src/editor/touch.
- Public API used by other clusters:
  - LongPressEvent: 
  - touch-target: activate, deactivate, addGesture, setDelayedTouchEventsEnabled
  - tap-gesture: start
  - pinch-gesture: start, move
  - gesture-helper: addGesture, scroll, setDelayedTouchEventsEnabled
  - long-press-gesture: deactivate, start, move
- Depends on: editor-tools-base.
- Same level: app-config-document.
- Parity scenarios: editor-tools/pointer.
- Inventory sections: EDT-TOUCH, UI-TOUCH, ACT-CTX, EDT-TOOL.
- Pitfalls: Turns touches into synthetic mouse events and rewrites the editor's global handle options at runtime; treat handle sizes as per-input-mode config.

### Level 11

#### app-shell-storage

Local storage items, File System Access (open directory, file handles), browser downloads, tabs rearrange, preview and recovery; Containers, layout, windows and tabs, sidebars, header/footer, modules and plugins.

- Old bytes: 168 KB in 52 ported modules.
- Modules: a85, a135, a198, a237, a395, a444, a450, a554-a555, a565, a603, a806-a808, a863, a1155, a1161, a1173, a1191, a1195, a1328, a1330, a1346-a1347, a1354, a1373-a1374, a1385-a1386, a1472, a1482, a1488, a1492-a1493, a1503, a1517, a1521-a1522, a1530-a1534, a1539, a1554, a1571, a1610, a1670-a1673, a1737. Not ported here: a1512 (drop), a1117 (drop), a1210 (drop), a1529 (drop), a1497 (drop), a1498 (drop), a1502 (drop), a1246 (drop), a1250 (drop).
- Target: 52 files under next/src/app/shell, next/src/app/storage, next/src/io/import, next/src/app/themes.
- Public API used by other clusters:
  - layout: init, getSidebar, getActiveSidebar, getHtmlElement, relayout, setActiveSidebar, setEnabled, addClassName, getSidebarsPart, removeClassName
  - window: getView, getTitle, activate, deactivate, getDocument, relayout, release, centerAndZoom, activateCancelLoading, activateProgress
  - BrowserContainer: getRuntime, getStorage, openExternalLink, start, getSystemFontsProvider, copyToClipboard, openStorageFile, openStorageFile, handleDeepLinking
  - Container: getProperty, setProperty, init, getRuntime, getStorage, openExternalLink, start, getSystemFontsProvider, canUnload
  - file-system-access: openPrompt, download, canDownload, canPromptOpen, canPromptSave, savePrompt, Item, canSave, canChooseDirectory, chooseDirectory
  - storage: openPrompt, download, canDownload, canPromptOpen, canPromptSave, savePrompt, Item, canSave, canChooseDirectory, chooseDirectory
- Depends on: engine-locale, engine-core, editor-tools-base, app-config-document, app-widgets-dialogs.
- Same level: app-fonts-ui.
- Late-bound references: category (app-actions-file-edit), GOpenRecentAction (app-actions-file-edit), presets (app-welcome-settings), GSaveAction (app-actions-file-edit), GSaveAsAction (app-actions-file-edit), bootstrap (app-designer-main).
- Parity scenarios: platform/storage, smoke, ui/welcome.
- Inventory sections: UI-SHELL, FMT-STORAGE, UI-SIDEBAR, UI-TABS, FMT-PWA, FMT-GVD.
- Pitfalls: Global `gDesigner` and `gContainer`; startup order matters. Containers create windows, tabs and sidebars with jQuery; the React port must keep DOM structure and CSS class names (including typos) because the stylesheets and the parity driver depend on them. localStorage keys are scattered; collect them in one typed module.

#### app-fonts-ui

Font manager (designer side), providers (web, local, imported, Noto), font DB (IndexedDB), font panel and button, native font parsing.

- Old bytes: 125 KB in 14 ported modules, plus 11 KB data.
- Modules: a255, a381, a590, a1118, a1198-a1200, a1245, a1379-a1380, a1470-a1471, a1700-a1701. Not ported here: a1075 (data).
- Target: 15 files under next/src/app/fonts.
- Public API used by other clusters:
  - font-manager: init, reset, getInstance, getProviderInstance, disableProviders, enableProviders, query, registerProvider, releaseDocumentListener, resolveFont
  - native-fonts: load, isInitialized, resolveFont
  - imported-fonts-provider: load, initialize, resolveFont
  - font-db: clear, ready, getInstance, getItem, setItem
  - web-fonts-provider: load, initialize, resolveFont
  - noto-fonts-provider: init, load, getDefaultFamilyForString, hasFont, resolveFont
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs.
- Same level: app-shell-storage.
- Late-bound references: missing-fonts-dialog (app-dialogs-notify).
- Parity scenarios: engine-model/text, ui/menus.
- Inventory sections: UI-FONT, FMT-IMPORT, UI-STORAGE.
- Pitfalls: Font providers load asynchronously (web, local via the Local Font Access API, imported via IndexedDB `gravitFontsDB`); permission prompts can't be automated, so tests stub the providers.

### Level 12

#### app-actions-file-edit

Action base, categories, file actions (new, open, save, save as, export, print, place), edit actions (undo, redo, cut/copy/paste variants, delete, select), clipboard bridge.

- Old bytes: 154 KB in 46 ported modules.
- Modules: a18, a31, a106, a445, a447, a609, a813, a843, a861, a875-a877, a1168, a1171, a1180, a1182-a1184, a1280-a1281, a1283-a1284, a1299, a1304-a1309, a1313, a1315, a1331-a1334, a1599, a1601-a1602, a1608-a1609, a1612-a1613, a1632, a1645, a1647, a1652. Not ported here: a1595 (npm), a1596 (npm).
- Target: 46 files under next/src/app/actions/edit, next/src/app/actions/file, next/src/app/actions, next/src/app/clipboard.
- Public API used by other clusters:
  - clipboard-bridge: getArea
  - CutCopyAction: getId, getTitle, isEnabled, execute, getIcon, getGroup, getCategory, getShortcut
  - SaveAsAction: getId, getTitle, isEnabled, execute, isPro, getGroup, getCategory, getShortcut, getTooltipConfig
  - SaveAction: getId, getTitle, isEnabled, execute, getIcon, getGroup, getCategory, getShortcut, getTooltipConfig
  - ExportAction: getId, getTitle, isEnabled, execute, isPro, getIcon, getGroup, getGroupIcon, getCategory
  - PrintAction: getId, getTitle, isEnabled, execute, getIcon, getGroup, getCategory, getShortcut
- Depends on: io-export-bitmap, editor-tools-base, app-config-document, app-widgets-dialogs, app-shell-storage, app-fonts-ui.
- Same level: app-actions-view, app-dialogs-notify, app-menus-toolbar, app-welcome-settings.
- Late-bound references: export-dialog (app-library-symbols-export).
- Parity scenarios: editor-actions/registry, editor-actions/exec, editor-actions/shortcuts.
- Inventory sections: ACT-EDIT, ACT-FILE, EDT-CLIP, FMT-CLIP, EDT-SEL, ACT-KEY.
- Pitfalls: Action ids are stable strings used by menus, toolbar, context menus and stats; keep the alias map for odd ids (paste.paste, zoom.out). Shortcuts are bound only for actions in the menu; bind from the action table instead. Undo/Redo/Select All delegate to document.execCommand when an input has focus; cut/copy/paste go through a hidden textarea.

#### app-actions-modify

Modify, arrange, align, path, symbol, crop, layer and text-on-path actions.

- Old bytes: 144 KB in 42 ported modules.
- Modules: a608, a809-a812, a866-a874, a1176-a1179, a1181, a1185, a1310-a1312, a1314, a1316-a1320, a1340-a1341, a1344-a1345, a1597, a1600, a1605-a1607, a1611, a1616, a1648, a1653.
- Target: 42 files under next/src/app/actions/modify.
- Public API used by other clusters:
  - MergeSubAction: isVisible, execute, getIcon, getGroup, getCategory, getTooltipConfig, getFullTitle, getShortcutSubKey
  - DistributeAction: getId, isEnabled, getTitle, execute, getIcon, getGroup, getShortcut, getCategory, getTooltipConfig
  - TransformAction: getId, isEnabled, getTitle, execute, getIcon, getGroup, getShortcut, getCategory, getTooltipConfig
  - AlignAction: getId, isEnabled, getTitle, execute, getGroup, getShortcut, getCategory, getTooltipConfig
  - SplitLineAction: getId, isEnabled, getTitle, execute, getIcon, getGroup, getCategory
  - VectorizeBorderAction: getId, isEnabled, getTitle, execute, getIcon, getGroup, getCategory, getTooltipConfig
- Depends on: editor-tools-base, app-widgets-dialogs, app-config-document, app-shell-storage.
- Same level: app-actions-file-edit, app-actions-view.
- Parity scenarios: editor-actions/exec.
- Inventory sections: ACT-MODIFY, ACT-KEY, ACT-PATH, ACT-ARRANGE, ACT-ALIGN, ADD-PATH.
- Pitfalls: Two-stroke shortcuts (Shift+Cmd+Y then U/S/I/X) need the small sequence handler; modify.clip and modify.createnestedcompound share Cmd+Alt+M.

#### app-actions-view

View, window and help actions (zoom, fit, magnification, grid, guides, snapping, rulers, slices, play, fullscreen, outline/fast view, windows).

- Old bytes: 70 KB in 34 ported modules.
- Modules: a449, a566, a1167, a1169-a1170, a1282, a1285-a1291, a1295-a1297, a1335, a1342, a1598, a1603, a1614-a1615, a1617, a1619, a1621-a1622, a1624-a1625, a1642-a1643, a1646, a1649-a1651. Not ported here: a1618 (drop).
- Target: 34 files under next/src/app/actions/view, next/src/app/actions/help.
- Public API used by other clusters:
  - PlayAction: getId, isVisible, getTitle, isEnabled, execute, getShortcut, changeActivePage, getCategory
  - TogglePaintLayersVisibilityAction: getId, isVisible, getTitle, isEnabled, execute, getShortcut, getCategory
  - ToggleFullscreenAction: getId, isVisible, getTitle, isEnabled, execute, getIcon, getShortcut, getCategory, isFullscreen
  - SnapUnitAction: getId, getTitle, isEnabled, execute, getGroup, getShortcut, getCategory
  - OutlineViewAction: getId, getTitle, isEnabled, execute, getIcon, getGroup, getShortcut, isChecked, getCategory
  - ToggleSidebarAction: getId, isVisible, getTitle, execute, getGroup, getShortcut, isChecked, getCategory, isCheckable
- Depends on: editor-tools-base, app-widgets-dialogs, app-config-document, app-shell-storage.
- Same level: app-actions-file-edit, app-actions-modify, app-dialogs-notify.
- Late-bound references: GPageProperties (app-inspector-document), fullscreen-banner (app-touch-ui).
- Parity scenarios: editor-actions/exec, editor-actions/shortcuts.
- Inventory sections: ACT-VIEW, EDT-VIEW, ACT-HELP, EDT-SNAP, ACT-WINDOW, ACT-KEY.
- Pitfalls: View toggles like Show Grid write document properties (`gm`), so they are undoable and saved.

#### app-menus-toolbar

Menu model, menu items, main menu bar and header, context menu, active-menu manager, menu button, toolbar, zoom menu, action icons.

- Old bytes: 201 KB in 14 ported modules.
- Modules: a238, a339, a804, a844, a1156-a1157, a1303, a1499-a1501, a1541, a1543, a1721, a1735.
- Target: 14 files under next/src/app/menus, next/src/app/toolbar, next/src/app/widgets.
- Public API used by other clusters:
  - toolbar: getHeight, init, isVisible, relayout, setEnabled, getToolName, setVisible, updateCommentToggleStatus
  - header: getHeight, init, relayout, getWindowTab, hideBusyIcon, setWindowTabEnable, showBusyIcon, updateLoginInfo
  - ContextMenu: close
  - MenuItem: getParent, addClass, isVisible, getType, isEnabled, activate, getAction, setData, getData
  - Menu: indexOf, getParent, addClass, open, close, update, createAddItem, getHtmlElement, detach
  - MenuBar: getParent, getMenu, isActive
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs, app-shell-storage.
- Same level: app-actions-file-edit, app-actions-modify, app-actions-view.
- Late-bound references: simple-shapes.json (app-library-symbols-export), GInspectorSidebar (app-inspector-geometry).
- Parity scenarios: ui/menus, editor-actions/registry.
- Inventory sections: UI-TOOLBAR, ACT-CTX, ACT-MENU, UI-TABS, UI-TOUCH, UI-SHELL.
- Pitfalls: Menu order comes from registration order, nesting from category chains, dividers from group changes; a declarative table must reproduce the same tree (ui/menus scenarios compare it).

#### app-dialogs-notify

Confirmation, linked image warning, shortcuts dialog, memory warning, missing fonts, new file prompt, PWA install, notifications, software update (Electron).

- Old bytes: 69 KB in 16 ported modules.
- Modules: a841, a1172, a1188, a1321, a1349, a1474, a1511, a1556, a1562, a1644, a1665-a1667, a1676-a1677, a1687. Not ported here: a256 (drop), a291 (drop).
- Target: 16 files under next/src/app/dialogs, next/src/app/actions/file.
- Public API used by other clusters:
  - SoftwareUpdatePanel: getId, init, isEnabled, getTitle, activate, deactivate
  - SoftwareUpdateManager: start, checkForUpdates, stop
  - NotificationPanel: getId, init, isEnabled
  - missing-fonts-dialog: open, close, getMissingFonts, setMissingFonts, setProviderEnablers
  - InstallPwaDialog: open, close
  - warn-linked-image-dialog: open, close, save
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs, app-shell-storage.
- Same level: app-actions-file-edit.
- Parity scenarios: editor-actions/dialogs, ui/welcome.
- Inventory sections: UI-DIALOG, UI-STORAGE, UI-NOTIFY, UI-IMAGE, ACT-KEY, UI-FONT.
- Pitfalls: Software update path is Electron-only; notifications are global.

#### app-welcome-settings

Welcome screen and new document dialog, document presets, settings dialog and keys.

- Old bytes: 80 KB in 6 ported modules.
- Modules: a1153, a1275, a1277-a1278, a1487, a1544.
- Target: 6 files under next/src/app/welcome, next/src/app/settings.
- Public API used by other clusters:
  - welcome-screen: open, close, isOpen, getDialogElement
  - settings-dialog: open, close
  - presets: getPresets
  - show-welcome-setting: getSetting, isEnabled
  - settings-keys: getSetting, isEnabled
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs, app-shell-storage.
- Same level: app-actions-file-edit.
- Parity scenarios: ui/welcome, platform/storage.
- Inventory sections: UI-SETTING, UI-NEWDOC, UI-WELCOME, UI-DIALOG, FMT-IMPORT, UI-FIELD.
- Pitfalls: Settings live in localStorage `designer.settings`; several rows are bound inverted and Save writes rows that aren't rendered (port: save only rendered rows, keep the key and shape).

### Level 13

#### app-inspector-geometry

Inspector sidebar, property panels base, align, dimension, transform, frame, group frame, item properties.

- Old bytes: 127 KB in 8 ported modules.
- Modules: a123, a864, a1274, a1294, a1654-a1656, a1660.
- Target: 8 files under next/src/app/inspector.
- Public API used by other clusters:
  - DimensionProperties: init, update, isAvailable
  - TransformProperties: init, update, isAvailable
  - InspectorSidebar: getId, init, isVisible, isEnabled, getTitle, activate, deactivate, getDefaultWidth, getMinimumWidth
  - ItemProperties: init, update
  - FrameProperties: init, update
  - GroupFrameProperties: init, update
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs, editor-touch, app-shell-storage, app-actions-modify, app-actions-view.
- Same level: app-inspector-document, app-inspector-effects, app-inspector-paint, app-inspector-shapes, app-inspector-text-styles.
- Parity scenarios: ui/menus.
- Inventory sections: UI-FIELD, UI-INSPECT, UI-STORAGE.
- Pitfalls: Panels update on selection and property events; values are formatted through GLength with the document unit.

#### app-inspector-document

Page, scene (document), symbol, slice and export properties.

- Old bytes: 131 KB in 6 ported modules.
- Modules: a1272, a1339, a1523, a1604, a1658-a1659.
- Target: 6 files under next/src/app/inspector.
- Public API used by other clusters:
  - PageProperties: init, update
  - SceneProperties: init, update
  - ExportProperties: init, update, isSticky
  - SliceProperties: init, update
  - SymbolProperties: init, update
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs, editor-touch, app-shell-storage, app-welcome-settings, app-actions-file-edit, app-actions-modify, app-actions-view, app-menus-toolbar.
- Same level: app-inspector-geometry, app-library-symbols-export.
- Parity scenarios: ui/menus, import-export/export-ui.
- Inventory sections: UI-FIELD, UI-INSPECT, FMT-EXPORT, EDT-RENDER, UI-TOUCH.
- Pitfalls: Page presets are hard-coded English tables edited after the Corel release.

#### app-inspector-shapes

Shape panels: path, polygon, rectangle, ellipse, image (crop), boolean, corner type select, Color Thief palette helper.

- Old bytes: 137 KB in 9 ported modules.
- Modules: a1264-a1271, a1697.
- Target: 9 files under next/src/app/inspector, next/src/app/widgets.
- Public API used by other clusters:
  - PathProperties: init, update, assignNodeType
  - PolygonProperties: init, update
  - RectangleProperties: init, update, isGroup
  - ImageProperties: init, update
  - EllipseProperties: init, update
  - BoolOpProperties: init, update, isGroup
- Depends on: editor-tools-base, app-widgets-dialogs, app-config-document, app-shell-storage.
- Same level: app-inspector-geometry, app-inspector-paint.
- Parity scenarios: ui/menus.
- Inventory sections: UI-FIELD, UI-INSPECT.
- Pitfalls: Corner type select and image crop share state with element editors.

#### app-inspector-text-styles

Text properties panel and shared style editor.

- Old bytes: 131 KB in 2 ported modules.
- Modules: a1273, a1731.
- Target: 2 files under next/src/app/inspector.
- Public API used by other clusters:
  - TextProperties: init, update, openEyeDropper
- Depends on: engine-text-gtl, editor-tools-base, app-config-document, app-widgets-dialogs, app-fonts-ui, app-shell-storage.
- Same level: app-inspector-geometry.
- Parity scenarios: engine-model/text, ui/menus.
- Inventory sections: UI-FIELD, UI-STYLE, UI-INSPECT.
- Pitfalls: GTextProperties is 108 KB; it edits GTL runs through the inline editor when one is open.

#### app-inspector-paint

Appearance (opacity, blend), fill and border panels, blend mode select, color-stop helpers.

- Old bytes: 154 KB in 5 ported modules.
- Modules: a1160, a1162, a1261, a1263, a1696.
- Target: 5 files under next/src/app/inspector, next/src/app/widgets.
- Public API used by other clusters:
  - border-properties: init, update, openEyeDropper, openPatternChooser
  - fill-properties: init, update, openEyeDropper, openPatternChooser
  - AppearanceProperties: init, update
- Depends on: editor-tools-base, app-widgets-dialogs, editor-touch, app-config-document, app-shell-storage.
- Same level: app-color-ui, app-inspector-geometry.
- Parity scenarios: engine-model/styles.
- Inventory sections: UI-FIELD, UI-INSPECT, UI-STYLE.
- Pitfalls: Border panel (77 KB) and fill panel are generated per paint layer; blend mode select lists WebGL-only modes.

#### app-inspector-effects

Effects panel (generic effect forms plus the special forms), effects button and panel.

- Old bytes: 112 KB in 3 ported modules.
- Modules: a1262, a1526-a1527.
- Target: 3 files under next/src/app/inspector.
- Public API used by other clusters:
  - EffectProperties: init, update
  - EffectsButton: 
  - EffectsPanel: open, close, addItem
- Depends on: editor-tools-base, app-widgets-dialogs, editor-touch, app-config-document, app-shell-storage.
- Same level: app-inspector-geometry, app-inspector-paint.
- Parity scenarios: engine-model/styles.
- Inventory sections: UI-FIELD, UI-INSPECT.
- Pitfalls: Most effect forms are generated from engine metadata (shp + RANGES); write one generic renderer plus the ten special forms.

#### app-color-ui

Color chooser (RGB/HSV/CMYK, gradients, patterns), pattern chooser, eye dropper, pattern drag targets, opacity slider, swatches event.

- Old bytes: 173 KB in 8 ported modules.
- Modules: a857, a1150-a1151, a1238, a1657, a1698-a1699, a1723.
- Target: 8 files under next/src/app/color.
- Public API used by other clusters:
  - color-chooser: open, close, getPattern, setColorMode
  - pattern-type-menu: open, close
  - drag-helper: init, moveTo
  - SwatchesChangedEvent: 
- Depends on: editor-tools-base, app-config-document, app-widgets-dialogs, app-shell-storage, app-menus-toolbar, app-actions-file-edit.
- Parity scenarios: ui/menus.
- Inventory sections: UI-COLOR, UI-SWATCH, UI-FIELD, EDT-GUIDE, ADD-FIELD, UI-DIALOG.
- Pitfalls: Color chooser (132 KB) mixes RGB/HSV/CMYK, gradients and patterns; CMYK display depends on the ICC profile being loaded.

#### app-sidebars-layers-pages

Outline sidebar, virtual tree, layers panel, pages panel, export rows.

- Old bytes: 167 KB in 8 ported modules.
- Modules: a451, a1260, a1351, a1706, a1709-a1711, a1717.
- Target: 8 files under next/src/app/sidebars.
- Public API used by other clusters:
  - OutlineSidebar: getId, init, getTitle, isVisible, isEnabled, relayout, getOrientation, getTouchTools, changeActivePage
  - virtual-list: beginUpdate, endUpdate
- Depends on: editor-tools-base, editor-touch, app-widgets-dialogs, app-config-document, app-shell-storage, app-actions-view.
- Same level: app-inspector-document.
- Parity scenarios: ui/menus.
- Inventory sections: UI-LAYERS, UI-PAGES, ACT-CTX, UI-STORAGE.
- Pitfalls: Virtual tree with drag and drop; Alt/Option is overloaded (siblings, duplicate on drag, zoom on click).

#### app-library-symbols-export

Symbols and library sidebars, library panel, ready-shape library data, export dialog and app-side export.

- Old bytes: 144 KB in 9 ported modules, plus 30 KB data.
- Modules: a1253, a1255, a1475, a1513, a1661-a1664, a1718. Not ported here: a1542 (data).
- Target: 10 files under next/src/app/sidebars, next/src/app/export, next/src/engine/scene.
- Public API used by other clusters:
  - export-dialog: open, close, init
  - library-panel: resize
  - export-document: export, generateExportables
  - SymbolsSidebar: getId, init, isVisible, getTitle, isEnabled, relayout, getOrientation, getTouchTools, getDefaultWidth
  - document-chooser: open, close
  - LibrarySidebar: getId, resize, init, isVisible, getTitle, isEnabled, relayout, getOrientation, getTouchTools
- Depends on: io-export-bitmap, io-import-pdf-eps, editor-tools-base, app-widgets-dialogs, editor-touch, app-config-document, app-shell-storage, app-actions-modify, app-actions-view, app-menus-toolbar.
- Same level: app-color-ui.
- Parity scenarios: import-export/export-ui, ui/menus.
- Inventory sections: FMT-EXPORT, UI-LIBRARY, UI-DIALOG, EDT-DND, ADD-SYMBOL, EDT-TOOL.
- Pitfalls: Export lives in the outline sidebar rows plus the export dialog; the ready-shape library is data that the toolbar also reads.

#### app-touch-ui

Touch UI: touch toolbar, touch context menu, virtual key bar, quick help, fullscreen banner, touch toggle.

- Old bytes: 70 KB in 8 ported modules.
- Modules: a1336-a1337, a1540, a1563, a1587-a1589, a1634.
- Target: 8 files under next/src/app/touch, next/src/app/actions/view, next/src/app/actions/help.
- Public API used by other clusters:
  - virtual-key-bar: init, activate, deactivate, getHtmlElement
  - quick-help: open, close
  - ToggleTouchAction: getId, getTitle, execute, isAvailable, getIcon, getGroup, getCategory, getTooltipConfig, isCheckable
  - fullscreen-banner: hide, show, setBannerText
  - OpenQuickHelpScreenAction: getId, isVisible, getTitle, isEnabled, execute, getGroup, getCategory
- Depends on: editor-tools-base, app-config-document, editor-touch, app-widgets-dialogs, app-shell-storage, app-menus-toolbar, app-actions-file-edit, app-actions-modify, app-actions-view.
- Same level: app-inspector-shapes.
- Parity scenarios: ui/menus.
- Inventory sections: UI-TOUCH, EDT-TOUCH, EDT-SYMBOL, ACT-CTX, UI-SHELL, ACT-VIEW.
- Pitfalls: Touch layout is optional (see decisions to confirm); keep it last.

### Level 14

#### app-designer-main

GDesigner main class (documents, windows, settings, actions, tools) and the bootstrap that registers tools, actions and panels.

- Old bytes: 196 KB in 3 ported modules.
- Modules: a1483, a1491, a1694.
- Target: 3 files under next/src/app/shell, next/src/app/widgets.
- Public API used by other clusters:
  - designer: getWorkspace, stats, getActiveDocument, isTouchEnabled, executeAction, getWindows, init, now, getSetting, getLicense
- Depends on: editor-tools-base, app-widgets-dialogs, app-config-document, editor-touch, app-fonts-ui, app-shell-storage, app-menus-toolbar, app-actions-view, app-dialogs-notify, app-welcome-settings, app-actions-file-edit, app-actions-modify, app-inspector-paint, app-inspector-shapes, app-color-ui, app-sidebars-layers-pages, app-library-symbols-export, app-inspector-text-styles, app-touch-ui, app-inspector-geometry, app-inspector-effects, app-inspector-document.
- Parity scenarios: smoke, ui/welcome, editor-actions/registry.
- Inventory sections: EDT-TOOL, UI-SHELL, EDT-TOOLMGR, ACT-KEY, UI-TOUCH, UI-STORAGE.
- Pitfalls: Registration order of tools, actions and panels defines menu and toolbar order; window.onerror and the global drag image live here.

## Third-party code

Versions were found by comparing distinctive code against published sources (token signatures against unpkg copies), banner strings and version constants. "Fork" means the code differs from every published version, so it is ported rather than installed.

| Modules | Library | Version found | Decision | Why |
| --- | --- | --- | --- | --- |
| v89, v105, v115, v326, v376-v379, v529, v708-v725, v982-v997 | opentype.js | 0.11.0 base | port (engine-opentype-fork) | Gravit fork: pako instead of tiny-inflate, morx flag, locl/numr/dnom, extra cmap formats, hinting fixes. About 30 modules are stock 0.11.0, the rest changed. |
| v998, wrapper v838 | HarfBuzz (Emscripten wasm2js, "ghb") | 2.2.0 (assert paths `harfbuzz-2.2.0/src/...`) | data: rebuild 2.2.0 as wasm with the same exports | harfbuzzjs ships a much newer HarfBuzz, shaping can differ. |
| v913 | big.js | 6.2.2 | npm:big.js@6.2.2 | stock |
| a610 | ua-parser-js | 0.7.33 | npm:ua-parser-js@0.7.33 | stock; GSystem uses it for OS and device detection |
| a165, a312, a462-a468, a94, a225, a310, a311, a313, a314, a469 | pako | 1.0.8-1.0.11 (lib identical) | npm:pako@1.0.11 | stock; output of deflate decides .gvdesign and PDF bytes |
| a792 | pdf.js main build | 2.1.286 (build 7525e341) | npm:pdfjs-dist@2.1.266 plus the Gravit CMYK patch, or vendor the old build | 2.1.286 is not on npm; 2.1.266 matches apart from the patch. public/pdf.worker.js carries the same patch. |
| a1595, a1596 | Mousetrap (+ pause plugin) | 1.6.x | npm:mousetrap@1.6.5 | stock; keeps key-name normalisation identical |
| v140 | quadtree-js | 1.x era, modified | port | Element class, retrieve modes |
| v931 | StackBlur | classic, modified | port | premultiplies alpha; stackblur-canvas would not match |
| v647 | Kevin Lindsey intersection/polynomial | modified | port | big.js precise variants, Jenkins-Traub, Gravit epsilons |
| v507 | Sly selector engine (not Slick) | unknown | port | adapted to scene nodes |
| v1003 | imagetracerjs | closest 1.1.x | port | seeded PRNG, Schneider curve fitting, no SVG output |
| v659, v932 | jpgjs (notmasteryet) | old API | port | CMYK via Gravit color util; not pdf.js's jpg.js |
| v1009 | monotone cubic spline | n/a | port | Gravit code; leaks global `cubicSpline` and patches Array.prototype |
| v1391, v1392 | canvg | 1.x structure | port | deep fork building G* nodes |
| a1401, a1402, a1514-a1516 | zip.js v1 (Gildas Lormeau) | v1, not on npm | port a1514-a1516; drop a1402 (copy) and a1401 (use pako inflate) | @zip.js/zip.js 2.x has a different API and container output |
| a1267 | probably Color Thief 2.x with inlined MMCQ | unknown | port | dominant-color palette for image fills; port keeps the palette identical |
| a1114 | bluebird | 2.11.0 | drop: native Promise | microtask timing differs slightly; nothing depends on bluebird API |
| a297 and about 250 more app modules | core-js | 3.42.0 | drop | polyfills |
| a55, a98, a234, a272, a273, a382, a537, a538, a736, a737, a1043-a1066 | crypto-js | 3.x | drop | only cloud and licensing use it |
| a435 | js-md5 | 0.7.x | drop | Content-MD5 for cloud uploads |
| a1117 | FileSaver.js | 1.3.x | drop: a[download] helper | same bytes |
| a1618 | screenfull | 3.x | drop: native Fullscreen API | |
| a1258, a1518-a1520, a605, a1257, a1259 | jQuery UI | 1.12.1 | drop | React UI; tab sorting reimplemented |
| a1210 | jDataView | 2.x | drop: native DataView | binary reads are deterministic |
| a1480 | @microsoft/teams-js | 1.13.1 | drop | Teams |
| a1739, a1358 | @amplitude/analytics-browser, analytics-connector | 1.5.8 | drop | analytics |
| a221, a250, a515, a516, a183, a819, a824, a837, a1116, a1489 | buffer, base64-js, ieee754, isarray, process, node-XMLHttpRequest, url-polyfill, codePointAt, setImmediate, abortcontroller-polyfill | various | drop | Node shims and polyfills |
| a424, a673 | core-js web.url-search-params, web.url | 3.42.0 | drop | (no whatwg-fetch is bundled) |

## Sources outside the bundles

These files are not webpack modules of the two bundles, so they have no rows in port-map.tsv, but they belong to clusters:

| File | Size | Decision | Cluster |
| --- | ---: | --- | --- |
| public/ps.worker.js, psparser.js, psclasses.js, pscore.js, psctm.js, pscolor.js | 218 KB | port to next/src/workers/postscript/ (Gravit's own PostScript interpreter) | io-import-pdf-eps (adds 218 KB; split it into its own cluster if that package gets too big) |
| public/pdfexport.worker.js | 187 KB | port as a module worker that reuses io-export-pdf and io-export-bitmap code (raster, CMYK, zip encode) | io-export-pdf |
| public/pdf.worker.js, chunk.vendors~pdfjsWorker.js | 787 KB, 762 KB | same decision as a792 (pdfjs-dist worker) | io-import-pdf-eps |
| public/chunk.vendors~heic2any.js (module 1740) | 1.2 MB | npm:heic2any (version not identified; check against 0.0.4) or libheif-js | io-import-pdf-eps (loader a1472 is in app-shell-storage) |
| public/autosave.worker.js | 5.0 MB | drop: cloud autosave | - |
| public/cacher.js, service-worker.js | 171 KB | drop: frozen Workbox precache; generate with vite-plugin-pwa if PWA stays | - |
| public/static.maintenance.js, proxy.html | 659 KB | drop: maintenance page and cross-origin probe for the cloud | - |
| public/jquery.js | 90 KB | drop | - |
| server.js, routes/user.js, routes/ws.js | 7 KB | port to next/server/ (static server; user and ws routes are cloud stubs, check before porting) | platform cluster, outside next/src |
| electron-main.js | small | port to next/electron/ sharing the server module | platform cluster, outside next/src |
| assets/data/icc/USWebCoatedSWOP.icc | binary | data, unchanged | engine-color |

## Decisions to confirm

- Command recorder (v111, v897, v899, v205) is dropped and the port paints directly. This removes about 140 KB, but it is the biggest behavioural change in the engine. Keep the old module list in port-map.tsv so it can be restored if the corpus render scenarios show differences.
- Review annotations: the model (engine-annotations-model) and tools (editor-paths-graph-annotations) are ported for file compatibility, the sidebar and panels are dropped with the cloud (a567, a1535, a1536, a1712). That leaves the annotation tools unreachable. Either drop the tools too or build a small local annotations sidebar later.
- Touch: the input layer (editor-touch) is ported, the touch UI (app-touch-ui) is ported last and could be dropped (INVENTORY lists the touch layout as "probably drop").
- HarfBuzz: rebuilding 2.2.0 as wasm needs Emscripten in the toolchain; vendoring the 6.4 MB asm.js module is the fallback.
- pdf.js: pin 2.1.266 plus a patch, or vendor the old 2.1.286 build. A newer pdfjs-dist is not bit-compatible.
- Mousetrap via npm versus a hand-written key handler in the action table. npm keeps key normalisation identical.
- Language switcher, translation tool and the other 14 languages are dropped; only en-US strings ship.

## Modules whose purpose is unclear

I assigned every module, but for these the name in port-map.tsv is a best guess from a quick read and the porter should confirm before writing tests:

- a1155 (condition/step runner), a1493 (step recorder), a1554 (value stack used by the loading-failure handler), a536 (async cache with a factory, used by language loading), a592 (error with description and cid), a355 (AppError), a1161 (drag-to-delete icon helper), a1191 (children tracker), a1670 and a1671 (plugin loader and GModule), a1672 (in-app link reload), a1042 (base64 helpers, maybe from js-base64).
- a1267: looks like Color Thief 2.x with MMCQ inlined (getColor, getPalette, quantize), version not identified.
- v437 (empty GObject subclass used as PDF base type), v1205 (image element parse shared by Sketch and PDF import), v1213 (compound/clip merge after import).
- v1001 GSceneUtil and v912 Accelerated: small and clear in purpose, but nothing in the inventory tests them directly.
- v53 and v1: the barrels. v1 also requires v507 at the end, which installs the selector engine on GNode as a side effect; keep that side effect.

## Biggest risks

1. Pixel parity of rendering. It depends on Canvas 2D and WebGL output of one Chromium build, the dropped command recorder, DPI handling and browser sniffing. Record expected images and compare on the same Chromium and GPU backend (SwiftShader in headless), and port engine-paint and the WebGL effects before anything that renders.
2. Text. Layout depends on measureText with the exact font files, the opentype.js 0.11 fork and HarfBuzz 2.2.0. A different HarfBuzz or opentype version changes glyph positions everywhere.
3. Hidden global state and load order: `__gtype_id__` counters saved as `_sdf`, GEditorOptions scaled by DPI at load, the GL context singleton, the font manager and ICC profile loading asynchronously, gDesigner and gContainer globals in the app.
4. Floating-point order in GMath, the boolean ops (with big.js), the offsetter and the vertex processor. Small reorderings change saved coordinates; the engine-geometry scenarios must run per cluster, not at the end.
5. Late-bound references between engine clusters (instanceof and registry lookups). Porting levels 3 to 6 in parallel needs the node name registry and the class names agreed first.
6. The app is jQuery-generated DOM that the stylesheets and the parity driver select by class name. The React port must reproduce the DOM structure and class names closely, which is more work than the byte counts suggest (about 2.9 MB of app code).
7. pdf.js and EPS: the import path depends on a patched old pdf.js and on SharedArrayBuffer with COOP/COEP headers that neither server sets today.
