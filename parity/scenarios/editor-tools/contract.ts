/**
 * Hooks the editor-tools scenarios need from both apps, at
 * window.__parity.app.editorTools. The old app's version is old-hooks.js
 * in this folder; the new app must implement the same functions with the
 * same results.
 */

/** What the editor looks like at one moment of an input sequence. */
export interface EditorToolState {
  /** Active tool class name, e.g. "GPointerTool". */
  tool: string;
  /** Temporary (spring-loaded / Space) tool class name, or null. */
  temporaryTool: string | null;
  /**
   * Selected nodes in selection order, each as "<i>/<j>/...:<nodeName>":
   * child indices from the scene root, then the node name.
   */
  selection: string[];
  /**
   * Part selection of each selected element's editor (handles, anchor
   * points ...), as plain data. Scene nodes inside a part id are written
   * as { node: nodeName, index: index in parent }; object keys sorted.
   * A string part id equal to a static field of the editor's class chain
   * (random uuids such as GPolygonEditor.OUTSIDE_PART_ID) is written as
   * the field name.
   * null when the editor has no part selection.
   */
  parts: (unknown[] | null)[];
  /**
   * For selected elements with anchor points, the indices of the anchor
   * points that carry the Selected flag; null for other elements.
   */
  anchors: (number[] | null)[];
  /**
   * Per selected element, what its editor paints at this moment: the
   * preview during a drag, else the element. box = geometry bbox
   * [x, y, w, h], trf = its transform matrix (or null), both exact;
   * isPreview tells whether a preview is painted. While it is, outline
   * holds the preview's vertices (GVertexSource rewindVertices(0) /
   * readVertex) as [command, x, y], at most 400, x and y rounded
   * to 1e-9 (last-bit noise from coalesced pointer moves).
   */
  preview: {
    box: number[] | null;
    trf: number[] | null;
    isPreview: boolean;
    outline?: [number, number, number][] | null;
  }[];
  /** GSelectTool edit mode (0 Select, 1 Transform, 2 Edit) or null. */
  selectEditMode: number | null;
  inlineEditing: boolean;
  /** [start, end] of the inline text selection while inline editing. */
  textSelection: [number, number] | null;
  zoom: number;
  /** View scroll [x, y]. */
  scroll: [number, number];
  /** Name of the top undo state, or null. */
  undo: string | null;
}

export interface EditorToolsHooks {
  /**
   * The tool manager's ToolChangedEvents since the last call (or since the
   * hooks were installed), oldest first, and forgets them: previous and
   * next tool class names, and `light` (a temporary switch, such as a
   * spring-loaded key or Space, that keeps the previous tool's state).
   */
  toolChanges(): { previous: string | null; next: string | null; light: boolean }[];
  /**
   * Sets the view to a known state: zoom factor `zoom` and scroll so that
   * scene point (0, 0) is at view pixel (originX, originY), i.e. the old
   * GSceneWidget.transform(-originX, -originY, zoom). Also turns off any
   * render caching that depends on how long a paint took (old:
   * GRendererConfig.CACHE_WHEN_DRAWING_LONGER_THAN), so screenshots don't
   * depend on machine load.
   */
  prepareView(zoom: number, originX: number, originY: number): void;
  /**
   * Scene-to-view matrix [a, b, c, d, tx, ty] (view pixels relative to the
   * .g-editor-widget element), rounded to 1e-6.
   */
  worldToView(): number[];
  state(): EditorToolState;
  /** The serialized scene ({ save: true }) as an object, without `lmd`. */
  document(): unknown;
  /**
   * One entry per tool in the tool manager, in registration order: name
   * (toString without "[Object ]"), getCursor(), and the indices of the
   * registered tools whose class this tool is an instance of.
   */
  /**
   * Activates the tool at `index` in the tool manager (registration order,
   * see toolRegistry); true when it became the active tool. Needed for the
   * connector tool, whose name equals the pen's.
   */
  activateToolAt(index: number): boolean;
  toolRegistry(): { index: number; name: string; cursor: string | null; instanceOf: number[] }[];
  /**
   * True once fonts are usable: the default font family's variants are
   * known (old: GFontManager.queryFontFamily) and no font is still loading.
   * Scenarios wait for it before and after building their fixture.
   */
  fontsReady(): boolean;
  /** Repaints the whole canvas (scene and editor overlay). */
  repaint(): void;
  /**
   * The app's tool table (old: gravit.tools), one plain-JSON object per
   * entry with every field except the tool class, keys sorted:
   * toolString, title, group, category, key, shortcuts, icon, feature,
   * richTooltipConfig ...
   */
  toolTable(): Record<string, unknown>[];
  /**
   * Overrides editor options (GEditorOptions: preserveAspectRatio,
   * snapRotate, invertSelectionMode, selectDoubleClickBehavior,
   * leaveWhenClosePath, imageCropDistance, ...) by name.
   */
  setEditorOptions(options: Record<string, unknown>): void;
  /**
   * Stops the inline text caret from blinking and makes it visible, so a
   * screenshot taken while inline editing is stable. Returns false when no
   * inline editor is open.
   */
  freezeCaret(): boolean;
}
