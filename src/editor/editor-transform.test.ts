// Moving, scaling and resizing the selection, multi-page included, and
// the multi-page mouse tracking (updateByMousePosition). Expected values
// are recorded from the old app (GEditor, chunk.vendor.js module 82) with
// the same scenes built from the old classes.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Point } from "../engine/math/point.ts";
import { Rect } from "../engine/math/rect.ts";
import { Transform } from "../engine/math/transform.ts";
import { RectangleAnnotation } from "../engine/scene/annotations/rectangle-annotation.ts";
import { Block } from "../engine/scene/block.ts";
import { NodeFlag } from "../engine/scene/node-change.ts";
import type { Node } from "../engine/scene/node.ts";
import { Page } from "../engine/scene/page.ts";
import { Rectangle } from "../engine/scene/rectangle.ts";
import { SceneOptions } from "../engine/scene/scene-options.ts";
import { Scene } from "../engine/scene/scene.ts";
import { Editor } from "./editor.ts";
import { EditorOptions } from "./editor-options.ts";
import { EditorWorkspace } from "./editor-workspace.ts";
import "./annotations/rectangle-annotation-editor.ts";
import { BoxEditor } from "./element-editors/box-editor.ts";
import "./element-editors/layer-editor.ts";
import { PageEditor } from "./element-editors/page-editor.ts";
import "./element-editors/rectangle-editor.ts";
import "./element-editors/scene-editor.ts";
import "./element-editors/selection-position-editor.ts";
import { Guides } from "./guides/guides.ts";
import { PageGuide } from "./guides/page-guide.ts";

const here = dirname(fileURLToPath(import.meta.url));
const load = (name: string) =>
  JSON.parse(readFileSync(resolve(here, "__fixtures__", name), "utf8")) as Record<string, unknown>;
const oldTransform = load("old-editor-transform.json");
const oldMouse = load("old-editor-mouse.json");

type Box = [number, number, number, number] | null;
const box = (b: Rect | null | undefined): Box =>
  b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null;
const pt = (p: Point): [number, number] => [p.getX(), p.getY()];

function rect(a: number, d: number, x: number, y: number, name: string): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(a, 0, 0, d, x, y));
  r.setProperty("name", name);
  return r;
}

interface Setup {
  scene: Scene;
  editor: Editor;
  page: Page;
}

function setup(): Setup {
  const scene = new Scene(new EditorWorkspace());
  const editor = new Editor(scene);
  return { scene, editor, page: scene.getActivePage() as Page };
}

function twoPages(): Setup & { page2: Page } {
  const s = setup();
  const page2 = new Page();
  s.scene.appendChild(page2);
  return { ...s, page2 };
}

/**
 * Snapping reads the scene and the zoom from the guides' view. The old
 * code had no fallback without one (it threw), so the tests hand the
 * guides a minimal view, in the old recording too.
 */
function withView<T extends Setup>(s: T): T {
  (s.editor.getGuides() as unknown as { _view: unknown })._view = {
    getScene: () => s.scene,
    getLogicalZoom: () => 1,
    getZoom: () => 1,
    getViewConfiguration: () => ({ multiPageView: false }),
    getEditor: () => s.editor,
  };
  return s;
}

// The old app runs with the app's settings mirrored into these; the
// recording set them to the values used here.
const savedGuides = { ...Guides.options };
const savedScaleLabel = SceneOptions.scaleLabel;
beforeEach(() => {
  SceneOptions.scaleLabel = true;
  Guides.options.guides = [];
  Guides.options.zones = false;
});
afterEach(() => {
  Object.assign(Guides.options, savedGuides);
  SceneOptions.scaleLabel = savedScaleLabel;
  PageEditor.MOVE_MASTER = true;
  EditorOptions.pageSelectable = true;
});

describe("Editor.scaleSelection", () => {
  it("scales around the edge the signs of the direction pick", () => {
    const actual: Record<string, Box> = {};
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const { editor } = setup();
        const a = rect(10, 20, 50, 30, "a");
        editor.insertElements([a], true);
        editor.scaleSelection(2, 3, dx, dy, null, false, false, false);
        editor.applySelectionTransform();
        actual[String(dx) + "," + String(dy)] = box(a.getGeometryBBox());
      }
    }
    expect(actual).toEqual(oldTransform["scale"]);
  });

  it("scales elements of other pages in multi-page coordinates", () => {
    const { editor, page, page2 } = twoPages();
    const a = rect(10, 10, 100, 100, "a");
    const b = rect(10, 10, 100, 100, "b");
    page.appendChild(a);
    page2.appendChild(b);
    editor.updateSelection(false, [a, b]);
    expect(pt(page2.getPosition(true))).toEqual(oldTransform["pagePos"]);
    expect(box(Editor.getGroupGeometryBBox([a, b], false))).toEqual(oldTransform["groupBox"]);
    expect(box(Editor.getGroupGeometryBBox([a, b], true))).toEqual(oldTransform["groupBoxRel"]);
    editor.scaleSelection(2, 2, 1, 1, null, false, false, true);
    editor.applySelectionTransform();
    expect([box(a.getGeometryBBox()), box(b.getGeometryBBox())]).toEqual(
      oldTransform["multiScale"],
    );
  });

  it("scales every element in its own page's coordinates without multi-page", () => {
    const { editor, page, page2 } = twoPages();
    const a = rect(10, 10, 100, 100, "a");
    const b = rect(10, 10, 100, 100, "b");
    page.appendChild(a);
    page2.appendChild(b);
    editor.updateSelection(false, [a, b]);
    editor.scaleSelection(2, 2, 1, 1, null, false, false, false);
    editor.applySelectionTransform();
    expect([box(a.getGeometryBBox()), box(b.getGeometryBBox())]).toEqual(
      oldTransform["singleScale"],
    );
  });
});

describe("Editor.moveSelection", () => {
  it("moves elements on two pages by the same delta in multi-page mode", () => {
    const { editor, page, page2 } = twoPages();
    const a = rect(10, 10, 100, 100, "a");
    const b = rect(10, 10, 100, 100, "b");
    page.appendChild(a);
    page2.appendChild(b);
    editor.updateSelection(false, [a, b]);
    const moved = editor.moveSelection(new Point(5, 6), false, false, false, null, false, true);
    expect(pt(moved)).toEqual(oldTransform["multiMove"]);
    editor.applySelectionTransform();
    expect([box(a.getGeometryBBox()), box(b.getGeometryBBox())]).toEqual(
      oldTransform["multiMoveBoxes"],
    );
  });

  it("moves a selected page around the others only when collision-less", () => {
    for (const collisionless of [false, true]) {
      const { editor, page2 } = twoPages();
      editor.updateSelection(false, [page2]);
      expect(editor.getSelection()?.length).toBe(oldTransform["pageSel" + String(collisionless)]);
      editor.moveSelection(
        new Point(-700, 50),
        false,
        false,
        false,
        null,
        false,
        true,
        collisionless,
      );
      editor.applySelectionTransform();
      const offset = page2.getProperty("off") as Transform | null;
      expect([
        pt(page2.getPosition(true)),
        offset ? Transform.serialize(offset) : null,
        box(page2.getGeometryBBox()),
      ]).toEqual(oldTransform["pageMove" + String(collisionless)]);
    }
  });

  it("snaps the box's top-left, or with snap zones the side nearest the zone point", () => {
    Guides.options.guides = [PageGuide.ID];
    for (const zones of [false, true]) {
      Guides.options.zones = zones;
      const { editor } = withView(setup());
      const a = rect(10, 10, 0, 300, "a");
      editor.insertElements([a], true);
      const moved = editor.moveSelection(new Point(8, 0), true, false, false, new Point(10, 300));
      editor.applySelectionTransform();
      expect([pt(moved), box(a.getGeometryBBox())]).toEqual(oldTransform["zones" + String(zones)]);
    }
    Guides.options.zones = true;
    const { editor } = withView(setup());
    editor.insertElements([rect(10, 10, 0, 300, "a")], true);
    const moved = editor.moveSelection(new Point(8, 0), true, false, false, new Point(-10, 300));
    expect(pt(moved)).toEqual(oldTransform["zonesLeft"]);
  });

  // See "Moving an annotation disables every guide" in QUESTIONS.md.
  it("does not snap while an annotation is in the selection", () => {
    Guides.options.guides = [PageGuide.ID];
    const { editor, page } = withView(setup());
    const annotation = new RectangleAnnotation();
    annotation.setProperty("trf", new Transform(10, 0, 0, 10, 0, 300));
    (page.getAnnotations() as unknown as { appendChild(node: Node): void }).appendChild(
      annotation as unknown as Node,
    );
    editor.updateSelection(false, [annotation]);
    expect(editor.getSelection()?.length).toBe(oldTransform["annSel"]);
    expect(pt(editor.moveSelection(new Point(8, 0), true))).toEqual(oldTransform["annMove"]);
    editor.insertElements([rect(10, 10, 0, 300, "a")], true);
    expect(pt(editor.moveSelection(new Point(8, 0), true))).toEqual(oldTransform["rectMove"]);
  });

  it("does not move blocks locked against moving", () => {
    const { editor } = setup();
    const a = rect(10, 10, 0, 0, "a");
    a.setProperty("plkt", Block.ProgramLck.NoMove);
    editor.insertElements([a], true);
    expect(pt(editor.moveSelection(new Point(8, 3)))).toEqual(oldTransform["noMove"]);
  });
});

describe("Editor.resizeSelection", () => {
  const side = Rect.Side.RIGHT_CENTER;

  it("resizes a single element through its block editor", () => {
    const { editor } = setup();
    const a = rect(10, 10, 0, 0, "a");
    editor.insertElements([a], true);
    editor.resizeSelection(side, new Point(5, 0), false);
    editor.applyResizeSelection(BoxEditor.RESIZE_HANDLE_PART_ID, { side });
    expect([box(a.getGeometryBBox()), editor.getUndoStateName()]).toEqual(
      oldTransform["resizeSingle"],
    );
  });

  it("leaves blocks locked against size changes alone", () => {
    const { editor } = setup();
    const a = rect(10, 10, 0, 0, "a");
    a.setProperty("plkt", Block.ProgramLck.NoSizeChanges);
    editor.insertElements([a], true);
    editor.resizeSelection(side, new Point(5, 0), false);
    editor.applyResizeSelection(BoxEditor.RESIZE_HANDLE_PART_ID, { side });
    expect([box(a.getGeometryBBox()), editor.getUndoStateName()]).toEqual(
      oldTransform["resizeLocked"],
    );
  });

  it("resizes several elements through the selection editor", () => {
    const { editor } = setup();
    const a = rect(10, 10, 0, 0, "a");
    const b = rect(10, 10, 40, 0, "b");
    editor.insertElements([a, b], true);
    editor.resizeSelection(side, new Point(25, 0), false);
    editor.applyResizeSelection(BoxEditor.RESIZE_HANDLE_PART_ID, { side });
    expect([box(a.getGeometryBBox()), box(b.getGeometryBBox()), editor.getUndoStateName()]).toEqual(
      oldTransform["resizeTwo"],
    );
  });
});

describe("Editor.updateByMousePosition", () => {
  const configuration = { multiPageView: true };
  const identity = [1, 0, 0, 1, 0, 0] as const;

  function state(s: Setup) {
    const pages: Page[] = [];
    s.scene.iteratePages((page: Page) => {
      pages.push(page);
    });
    const activated = s.editor.getActivatedPage();
    return {
      active: pages.indexOf(s.scene.getActivePage() as Page),
      activated: pages.indexOf(activated as Page),
      activatedRaw: activated === null ? null : activated === undefined ? "undef" : "page",
      sel: (s.editor.getSelection() || []).map((n) => pages.indexOf(n as Page)),
      hl: pages.map((p) => p.hasFlag(NodeFlag.Highlighted)),
    };
  }

  it("starts with the first page active and nothing activated", () => {
    const s = twoPages();
    expect(box(s.scene.getLabelBBox(1))).toEqual(oldMouse["labelBox"]);
    expect(box(s.scene.getPaintBBox(true as never))).toEqual(oldMouse["paint"]);
    expect(state(s)).toEqual(oldMouse["initial"]);
  });

  // [name, x, y, transform, highlightOnly]; page 2 starts highlighted.
  const cases: [string, number, number, readonly number[] | null, boolean][] = [
    ["body2", 1222, 300, null, false],
    ["label2", 832, -10, identity, false],
    ["label2hl", 832, -10, identity, true],
    // Without a transform the candidate area leaves out the label.
    ["label2NoTransform", 832, -10, null, false],
    ["body2hl", 1222, 300, null, true],
    ["label1", 10, -10, identity, false],
    ["gap", 811, 300, null, false],
    ["outside", 5000, 5000, null, false],
    ["outsidehl", 5000, 5000, null, true],
    ["abovelabel", 832, -40, identity, false],
    ["scaled-label2", 416, -8, [0.5, 0, 0, 0.5, 0, 0], false],
    ["scaled-body2", 611, 150, [0.5, 0, 0, 0.5, 0, 0], false],
  ];
  for (const [name, x, y, transform, highlightOnly] of cases) {
    it(`hit tests pages and labels: ${name}`, () => {
      const s = twoPages();
      s.page2.setFlag(NodeFlag.Highlighted);
      s.editor.updateByMousePosition(
        new Point(x, y),
        transform
          ? new Transform(...(transform as [number, number, number, number, number, number]))
          : null,
        highlightOnly,
        configuration,
      );
      expect(state(s)).toEqual(oldMouse[name]);
    });
  }

  it("clears the highlight or the activated page when the mouse leaves", () => {
    const s = twoPages();
    s.editor.updateByMousePosition(new Point(832, -10), new Transform(), true, configuration);
    const highlighted = state(s);
    s.editor.updateByMousePosition(new Point(5000, 5000), null, true, configuration);
    expect([highlighted, state(s)]).toEqual(oldMouse["hlThenOut"]);
    s.editor.updateByMousePosition(new Point(1222, 300), null, false, configuration);
    const activated = state(s);
    s.editor.updateByMousePosition(new Point(5000, 5000), null, false, configuration);
    expect([activated, state(s)]).toEqual(oldMouse["actThenOut"]);
  });

  it("does nothing outside the multi-page view", () => {
    const s = twoPages();
    s.editor.updateByMousePosition(new Point(1222, 300), null, false, { multiPageView: false });
    expect(state(s)).toEqual(oldMouse["noMulti"]);
  });

  it("highlights a linked page only while masters may move", () => {
    const s = twoPages();
    PageEditor.MOVE_MASTER = false;
    (s.scene as unknown as { hasLinks(page: unknown): boolean }).hasLinks = (page) =>
      page === s.page2;
    s.editor.updateByMousePosition(new Point(832, -10), new Transform(), true, configuration);
    expect(state(s)).toEqual(oldMouse["linkedNoMaster"]);
    PageEditor.MOVE_MASTER = true;
    s.editor.updateByMousePosition(new Point(832, -10), new Transform(), true, configuration);
    expect(state(s)).toEqual(oldMouse["linkedMaster"]);
  });

  it("leaves the highlight flags alone when pages aren't selectable", () => {
    const s = twoPages();
    EditorOptions.pageSelectable = false;
    s.page2.setFlag(NodeFlag.Highlighted);
    s.editor.updateByMousePosition(new Point(832, -10), new Transform(), true, configuration);
    expect(state(s)).toEqual(oldMouse["notSelectable"]);
  });
});
