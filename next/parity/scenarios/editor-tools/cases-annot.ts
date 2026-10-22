import type { ToolCase } from "./case.ts";
import { THREE } from "./cases-pointer.ts";
import { fixtureScript } from "./fixture.ts";
import {
  clickElement,
  dblclick,
  repaint,
  shotView,
  wheel,
  down,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  probeDom,
  type,
  shot,
  up,
  wait,
  click,
  drag,
  fixTime,
  type Step,
} from "./steps.ts";

const openAnnotations: Step[] = [
  move(600, 500),
  clickElement(".sidebar-option.sidebar-annotations"),
  wait(300),
];
const annotTool = (name: string): Step[] => [
  clickElement(`.annotations-toolbar .gravit-icon-annotationtools-${name}`),
  wait(100),
];

const ANNOT = ["EDT-TOOL-087", "EDT-TOOLMGR-015", "EDT-TOOLMGR-028"];

/**
 * What every placed annotation records in its document: the annotation
 * meta properties (name, uid, email, time, seq, read) stamped on insert,
 * inside the page's annotations list (annlst).
 */
const STAMP = ["EDT-ANNOT-004", "EDT-ANNOT-005", "EDT-ANNOT-016"];

/** Draws a rectangle annotation from (x, y) to (x + 50, y + 40). */
const drawRect = (x: number, y: number): Step[] => [
  ...annotTool("rectangle"),
  ...drag(
    [x, y],
    [
      [x + 25, y + 20],
      [x + 50, y + 40],
    ],
  ),
  wait(200),
];

/** `part` inside the n-th (0 = newest) annotation row of the comments panel. */
const row = (n: number, part: string): string => `.annotation-row.parent >> nth=${n} >> ${part}`;

export const annotationCases: ToolCase[] = [
  {
    id: "annotations/mode-and-blocked-shortcuts",
    covers: [
      "EDT-TOOL-087",
      "EDT-TOOLMGR-027",
      "EDT-TOOLMGR-028",
      "EDT-TOOLMGR-026",
      "EDT-TOOLMGR-014",
    ],
    fixture: { ...THREE, select: [0] },
    steps: [
      ...openAnnotations,
      probe("opened"),
      press("r"),
      probe("r-blocked"),
      press("p"),
      probe("p-blocked"),
      press("q"),
      probe("q-ignored"),
      press("h"),
      probe("hand-allowed"),
      press("v"),
      ...annotTool("ellipse"),
      probe("ellipse-tool"),
      press("Escape"),
      wait(50),
      probe("esc-exits"),
      // The same keys once the comments sidebar is closed: Q now opens the
      // transform box (selectEditMode 1) and R the rectangle tool, so the
      // probes above show the keys being ignored, not doing nothing anyway.
      clickElement(".sidebar-option.sidebar-inspector"),
      wait(300),
      move(600, 500),
      press("q"),
      probe("q-outside-annotations"),
      press("r"),
      probe("r-outside-annotations"),
    ],
  },
  {
    id: "annotations/ellipse",
    covers: [...ANNOT, "EDT-TOOL-088", "EDT-CURSOR-007", "EDT-ANNOT-009", ...STAMP],
    steps: [
      ...openAnnotations,
      ...annotTool("ellipse"),
      move(90, 90),
      probe("cursor"),
      down(100, 100),
      move(150, 130),
      move(200, 180),
      up(),
      wait(50),
      probe("after"),
      ...annotTool("ellipse"),
      keyDown("Shift"),
      keyDown("Alt"),
      ...drag(
        [300, 300],
        [
          [330, 320],
          [360, 340],
        ],
      ),
      keyUp("Alt"),
      keyUp("Shift"),
    ],
  },
  {
    id: "annotations/rectangle",
    covers: [...ANNOT, "EDT-TOOL-089", "EDT-CURSOR-007", "EDT-ANNOT-008", ...STAMP],
    steps: [
      ...openAnnotations,
      ...annotTool("rectangle"),
      move(90, 90),
      probe("cursor"),
      ...drag(
        [100, 100],
        [
          [150, 130],
          [200, 180],
        ],
      ),
      ...annotTool("rectangle"),
      keyDown("Shift"),
      ...drag(
        [300, 300],
        [
          [330, 320],
          [380, 340],
        ],
      ),
      keyUp("Shift"),
    ],
  },
  {
    id: "annotations/arrow",
    covers: [...ANNOT, "EDT-TOOL-090", "EDT-CURSOR-007", "EDT-ANNOT-010", ...STAMP],
    steps: [
      ...openAnnotations,
      ...annotTool("line"),
      move(90, 90),
      probe("cursor"),
      ...drag(
        [100, 100],
        [
          [150, 130],
          [250, 160],
        ],
      ),
      ...annotTool("line"),
      keyDown("Shift"),
      ...drag(
        [100, 300],
        [
          [150, 320],
          [250, 340],
        ],
      ),
      keyUp("Shift"),
    ],
  },
  {
    id: "annotations/comment-note",
    covers: [...ANNOT, "EDT-TOOL-091", "EDT-CURSOR-007", "EDT-ANNOT-007", ...STAMP],
    steps: [
      ...openAnnotations,
      ...annotTool("comment"),
      move(140, 140),
      probe("cursor"),
      ...click(150, 150),
      wait(200),
      probe("after"),
    ],
  },
  {
    id: "annotations/pencil",
    covers: [...ANNOT, "EDT-TOOL-092", "EDT-CURSOR-007", "EDT-ANNOT-011", ...STAMP],
    steps: [
      ...openAnnotations,
      ...annotTool("pencil"),
      move(90, 90),
      probe("cursor"),
      press("Enter"),
      probe("enter-ignored"),
      // The freehand smoothing behind this tool reads Date.now(); pinning it
      // makes the fitted curve independent of machine load (as for the
      // freehand cases).
      fixTime(1_700_000_000_000),
      ...drag(
        [100, 100],
        [
          [130, 120],
          [170, 150],
          [210, 140],
          [240, 120],
        ],
      ),
      wait(600),
      probe("after"),
    ],
  },
  {
    id: "annotations/highlighter",
    covers: [...ANNOT, "EDT-TOOL-093", "EDT-CURSOR-007", "EDT-ANNOT-012", ...STAMP],
    steps: [
      ...openAnnotations,
      ...annotTool("highlighter"),
      move(90, 90),
      probe("cursor"),
      // The freehand smoothing behind this tool reads Date.now(); pinning it
      // makes the fitted curve independent of machine load (as for the
      // freehand cases).
      fixTime(1_700_000_000_000),
      ...drag(
        [100, 200],
        [
          [150, 200],
          [200, 202],
          [260, 204],
        ],
      ),
      wait(600),
      probe("after"),
    ],
  },
  {
    id: "annotations/drawing-overlay",
    covers: ["EDT-TOOL-088"],
    steps: [
      ...openAnnotations,
      ...annotTool("rectangle"),
      down(100, 100),
      move(150, 130),
      move(200, 180),
      shot(80, 80, 140, 120),
    ],
  },
  {
    id: "annotations/click-active-tool-returns-to-pointer",
    covers: ["EDT-TOOL-087", "EDT-TOOLMGR-030"],
    steps: [
      ...openAnnotations,
      ...annotTool("rectangle"),
      probe("rect"),
      ...annotTool("rectangle"),
      probe("toggled-off"),
    ],
  },
];

/** The canvas area between the panels, in view pixels. */
const CANVAS_SHOT = shotView(400, 260, 420, 300);

/**
 * One of each annotation type no registered tool creates: text
 * annotations (ant, one of them empty), a collaborative text annotation
 * (ancotext) and an empty annotation container (ann). Each gets a uid so
 * its time stamps are normalized.
 */
const untooledTypes = fixtureScript(({ G, app }) => {
  const pg = app.scene().getActivePage();
  let list = null;
  for (let c = pg.getFirstChild(); c; c = c.getNext()) {
    if (c instanceof G.GAnnotationsList) list = c;
  }
  const text = new G.GTextAnnotation();
  text.setProperties(
    ["trf", "uid", "name"],
    [new G.GTransform(1, 0, 0, 1, 100, 100), "fixture", "T"],
  );
  text.setText("Review note", 1, 1);
  const empty = new G.GTextAnnotation();
  empty.setProperties(
    ["trf", "uid", "name"],
    [new G.GTransform(1, 0, 0, 1, 100, 200), "fixture", "E"],
  );
  empty.setText("", 1, 1);
  const collab = new G.GCollaborativeTextAnnotation();
  collab.setProperties(
    ["trf", "uid", "name"],
    [new G.GTransform(20, 0, 0, 20, 360, 140), "fixture", "C"],
  );
  const container = new G.GEmptyAnnotation();
  container.setProperties(["uid", "name"], ["fixture", "N"]);
  for (const n of [text, empty, collab, container]) list.appendChild(n);
});

const SIDEBAR = ["EDT-TOOL-087", "EDT-TOOLMGR-028"];

/** Comments panel, visibility, removal and editor rules. */
export const annotationReviewCases: ToolCase[] = [
  {
    id: "annotations/two-placed",
    covers: ["EDT-ANNOT-005", "EDT-ANNOT-016", "EDT-ANNOT-008"],
    // Two annotations in one list: seq counts up (max + 1 among siblings).
    steps: [...openAnnotations, ...drawRect(100, 100), ...drawRect(300, 300), probe("open")],
  },
  {
    id: "annotations/sidebar-open-shot",
    covers: ["EDT-ANNOT-006", "EDT-ANNOT-001", "EDT-ANNOT-002", "EDT-ANNOT-008"],
    // One annotation selected with its handles, one not.
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      move(600, 500),
      CANVAS_SHOT,
    ],
  },
  {
    id: "annotations/sidebar-closed-shot",
    covers: ["EDT-ANNOT-006", "EDT-ANNOT-017"],
    // Same scene; closing the comments sidebar hides the annotations and
    // their editors.
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      // While an annotation is selected the sidebar can't be left (see
      // annotations/selected-blocks-leaving-sidebar), so deselect first.
      ...click(600, 500),
      wait(300),
      clickElement(".sidebar-option.sidebar-inspector"),
      wait(300),
      move(600, 500),
      CANVAS_SHOT,
    ],
  },
  {
    id: "annotations/selected-blocks-leaving-sidebar",
    covers: ["EDT-ANNOT-006", ...SIDEBAR],
    // The old app keeps the comments sidebar open when its tab is left
    // while an annotation is selected (the inspector tab stays inactive);
    // after deselecting, the same click leaves it and hides annotations.
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      clickElement(".sidebar-option.sidebar-inspector"),
      wait(300),
      probeDom("selected", ".sidebar-option.sidebar-inspector"),
      ...click(600, 500),
      wait(300),
      clickElement(".sidebar-option.sidebar-inspector"),
      wait(300),
      probeDom("deselected", ".sidebar-option.sidebar-inspector"),
    ],
  },
  {
    id: "annotations/resolve-hides",
    covers: ["EDT-ANNOT-004", "EDT-ANNOT-006", ...SIDEBAR],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      // The newest annotation (300, 300) is the first row.
      clickElement(row(0, ".gravit-icon-resolve")),
      wait(300),
      // The panel's comment-count badge is updated later by a deferred
      // panel refresh, so its text depends on timing; the document records
      // the stored state instead.
      probe("resolved"),
    ],
  },
  {
    id: "annotations/resolve-hides-shot",
    covers: ["EDT-ANNOT-006"],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      clickElement(row(0, ".gravit-icon-resolve")),
      wait(300),
      move(600, 500),
      CANVAS_SHOT,
    ],
  },
  {
    id: "annotations/show-resolved-shot",
    covers: ["EDT-ANNOT-006"],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      clickElement(row(0, ".gravit-icon-resolve")),
      wait(300),
      clickElement(".annotations-toolbar .annotation-options"),
      wait(300),
      clickElement('.annotation-sidebar-options label:has-text("Show resolved") input'),
      wait(300),
      press("Escape"),
      move(600, 500),
      CANVAS_SHOT,
    ],
  },
  {
    id: "annotations/resolve-all",
    covers: ["EDT-ANNOT-005", "EDT-ANNOT-004"],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      clickElement(".annotations-toolbar .annotation-options"),
      wait(300),
      clickElement('.annotation-sidebar-options label:has-text("Resolve all")'),
      wait(300),
      // The panel's comment-count badge is updated later by a deferred
      // panel refresh, so its text depends on timing; the document records
      // the stored state instead.
      probe("resolved-all"),
    ],
  },
  {
    id: "annotations/panel-menu-delete",
    covers: ["EDT-ANNOT-016", ...SIDEBAR],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      clickElement(row(1, ".annotationpanel-menubutton")),
      wait(300),
      clickElement('.annotations-menu label:has-text("Delete")'),
      wait(300),
      probeDom("confirm", ".g-confirm-dialog-container .message"),
      clickElement(".g-confirm-dialog-container button.primary"),
      wait(300),
      probe("deleted"),
    ],
  },
  {
    id: "annotations/delete-key-ignored",
    covers: ["EDT-ANNOT-017"],
    // The Delete key never removes an annotation: edit.delete is enabled
    // only for a selection holding a GItem or GLayer. Annotations are
    // removed through the comments panel (annotations/panel-menu-delete).
    // So the editors' NoDelete program-lock check (isRemovalBlocked) is
    // never reached from the UI.
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      move(600, 500),
      ...click(100, 120),
      wait(300),
      probe("selected"),
      press("Delete"),
      wait(300),
      probe("after-delete"),
    ],
  },
  {
    id: "annotations/double-click-swallowed",
    covers: ["EDT-ANNOT-017"],
    // A double click on a rectangle switches to the subselect tool
    // (pointer/double-click-switches-to-subselect); on an annotation the
    // editor swallows it.
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      move(600, 500),
      ...click(100, 120),
      wait(300),
      dblclick(100, 120),
      wait(300),
      probe("after-dbl"),
    ],
  },
  {
    id: "annotations/move-does-not-snap-to-shapes",
    covers: ["EDT-ANNOT-017"],
    // The red rectangle's right edge is at x 300. A shape dragged to 3 px
    // from it snaps; the annotation editor excludes the shape guide.
    fixture: THREE,
    steps: [
      ...openAnnotations,
      ...drawRect(330, 300),
      move(600, 500),
      ...click(342, 340),
      wait(300),
      // Grab the bottom border between the handles and move left by 27 px,
      // which puts the left edge at x 303.
      down(342, 340),
      move(330, 338),
      move(315, 340),
      up(),
      wait(200),
      probe("moved"),
    ],
  },
  {
    id: "annotations/add-comment",
    covers: ["EDT-ANNOT-004", ...SIDEBAR],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      clickElement(".annotations-comment-placeholder"),
      type("Looks good"),
      clickElement(".annotations-buttonrow .annotations-addcomment"),
      wait(300),
      // The panel's comment-count badge is updated later by a deferred
      // panel refresh, so its text depends on timing; the document records
      // the stored state instead.
      probe("count"),
    ],
  },
  {
    id: "annotations/panel-click-selects-and-scrolls",
    covers: ["EDT-ANNOT-018"],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      move(600, 500),
      // Pan the first annotation out of view.
      wheel(0, 700),
      wait(200),
      probe("panned"),
      clickElement(row(1, ".annotation-title")),
      wait(300),
      probe("clicked-first"),
    ],
  },
  {
    id: "annotations/panel-alt-click-fits",
    covers: ["EDT-ANNOT-018"],
    steps: [
      ...openAnnotations,
      ...drawRect(100, 100),
      ...drawRect(300, 300),
      // The first annotation is not selected (drawing selects the newest).
      // No deselect click here: it commits the empty reply and the panel
      // rebuilds its rows later, so the row could be missing when clicked.
      move(600, 500),
      keyDown("Alt"),
      clickElement(row(1, ".annotation-title")),
      keyUp("Alt"),
      wait(300),
      probe("alt-clicked-first"),
    ],
  },
  {
    id: "annotations/untooled-types",
    covers: ["EDT-ANNOT-013", "EDT-ANNOT-014", "EDT-ANNOT-015", "EDT-ANNOT-004"],
    fixture: { script: untooledTypes },
    steps: [...openAnnotations, probe("open")],
  },
  {
    id: "annotations/untooled-types-shot",
    // Only the text annotation paints; the collaborative one shows nothing
    // without linked elements, the empty text and the container neither.
    covers: ["EDT-ANNOT-013"],
    fixture: { script: untooledTypes },
    steps: [...openAnnotations, wait(300), repaint(), move(600, 500), CANVAS_SHOT],
  },
  {
    id: "annotations/touch-transform-box-icon-handles",
    covers: ["EDT-ANNOT-001", "EDT-ANNOT-002", "EDT-ANNOT-003"],
    // In the touch interface the transform box shows the icon handles:
    // skew horizontal and vertical, rotate and preserve aspect ratio, next
    // to the circle handles and the diamond pivot.
    touch: true,
    open: { settings: { touch: true } },
    fixture: { ...THREE, select: [0] },
    steps: [press("q"), wait(500), repaint(), shot(40, 30, 340, 300)],
  },
];
