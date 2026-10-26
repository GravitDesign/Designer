import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { Storage, StorageItem } from "../storage/storage.ts";
import { registerDocumentDialogs } from "./document-host.ts";
import { optimizeImport } from "./import-optimizer.ts";
import type { OpenImportContext } from "./open-import.ts";

const importer = vi.hoisted(() => ({ group: null as unknown }));

// The EPS and SVG imports hand over a group of shapes, as the real ones do
// once they have parsed the file.
vi.mock("../../io/import/eps/eps-import.ts", () => ({
  EPSImport: {
    import: (...args: unknown[]) => {
      const callback = args[3] as (e: unknown, g: unknown, s: unknown, b: unknown) => void;
      callback(null, importer.group, null, null);
    },
  },
}));

vi.mock("../../io/import/svg/svg-import.ts", () => ({
  SVGImport: {
    import: (...args: unknown[]) => {
      const callback = args[3] as (e: unknown, g: unknown, info: unknown) => void;
      callback(null, importer.group, { width: 900, height: 400 });
    },
  },
}));

vi.mock("../fonts/font-manager.ts", () => ({
  FontsProviderManager: {
    getInstance: () => ({ query: (answer: (r: { faces: [] }) => void) => answer({ faces: [] }) }),
  },
}));

const { openImportedFile } = await import("./open-import.ts");

class NamedItem extends StorageItem {
  constructor(private readonly name: string) {
    super(new Storage());
  }

  override getFullName(): string {
    return this.name;
  }
}

const COUNT = 60;

/** COUNT rectangles in a row, starting away from the origin. */
function shapes(): Group {
  const group = new Group();
  for (let i = 0; i < COUNT; ++i) {
    const rect = new Rectangle();
    rect.setProperty("trf", new Transform(5, 0, 0, 5, 100 + 12 * i, 200 + (i % 7)));
    group.appendChild(rect);
  }
  return group;
}

type Accel = Element & {
  _containingPaintQTreeElement: { x: number; y: number; width: number; height: number } | null;
  _containingGeometryQTreeElement: { x: number; y: number; width: number; height: number } | null;
};

const entry = (e: Accel["_containingPaintQTreeElement"]): number[] | null =>
  e ? [e.x, e.y, e.width, e.height] : null;
const box = (r: Rect | null): number[] | null =>
  r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null;

/** What the scene, its page and the page's children look like. */
function state(scene: Scene): unknown {
  const page = scene.getActivePage() as unknown as Accel & Page;
  return {
    page: [page.getProperty("w"), page.getProperty("h"), page.getProperty("x")],
    bck: String(page.getProperty("bck")),
    scenePaintEntry: entry(page._containingPaintQTreeElement),
    sceneGeometryEntry: entry(page._containingGeometryQTreeElement),
    pageIndex: page._elementIndex,
    pagePaint: box(page.getPaintBBox()),
    sceneGeometry: box(scene.getGeometryBBox()),
    children: page.getChildren().map((node) => {
      const child = node as Accel;
      return {
        trf: (
          (child as unknown as { getProperty(name: string): unknown }).getProperty(
            "trf",
          ) as Transform
        ).getMatrix(),
        index: child._elementIndex,
        paint: entry(child._containingPaintQTreeElement),
        geometry: entry(child._containingGeometryQTreeElement),
      };
    }),
  };
}

/**
 * The EPS branch as it was before the scene's geometry updates were
 * batched: every child's update reaches the scene.
 */
function openUnbatched(group: Group, scene: Scene): void {
  const page = scene.getActivePage() as Page;
  let united: Rect | null = null;
  const moved: Element[] = [];
  optimizeImport(group);
  const blocked = [
    Node._Change.BeforeChildRemove,
    Node._Change.AfterChildRemove,
    Node._Change.BeforeChildInsert,
    Node._Change.AfterChildInsert,
  ] as number[];
  scene._beginBlockChanges(blocked);
  group._blockUpdateChanges();
  while (group.getFirstChild()) {
    const child = group.getFirstChild() as Element;
    group.removeChild(child);
    page.appendChild(child);
    moved.push(child);
    if (child.getPaintBBox()) {
      united = united ? united.united(child.getPaintBBox() as Rect) : child.getPaintBBox();
    }
  }
  group._releaseUpdateChanges();
  for (const child of moved) {
    (child as Element & { transform(t: Transform): void }).transform(
      new Transform().translated(-(united as Rect).getX(), -(united as Rect).getY()),
    );
  }
  page.trimToContent();
  page.setProperty("bck", RGBColor.WHITE);
  scene._endBlockChanges(blocked);
}

/** The SVG branch for a group as it was before the batching. */
function openSvgUnbatched(group: Group, scene: Scene): void {
  const page = scene.getActivePage() as Page;
  while (group.getFirstChild()) {
    const child = group.getFirstChild() as Element;
    group.removeChild(child);
    page.appendChild(child);
    child.getPaintBBox();
  }
  page.setProperties(["w", "h"], [900, 400]);
}

let workspace: EditorWorkspace;

beforeEach(() => {
  workspace = new EditorWorkspace();
  registerDocumentDialogs({ message: () => {} });
  setDesigner({
    getWorkspace: () => ({ getFontManager: () => ({}) }),
    getWindows: () => ({ getActiveWindow: () => null }),
    getSetting: (_key: string, value: unknown) => value,
    createScene: (noPage?: boolean) => new Scene(workspace, noPage),
  } as never);
});

afterEach(() => {
  resetGlobals();
  vi.restoreAllMocks();
});

function open(name: string, extension: string): Scene | null {
  let opened: Scene | null = null;
  const context: OpenImportContext = {
    document: {},
    updateStatus: () => {},
    setTitle: () => {},
    setScene: (scene) => {
      opened = scene;
    },
    preProcessFonts: () => {},
    postProcessFonts: () => {},
    initCancelHandler: () => {},
  };
  importer.group = shapes();
  openImportedFile(context, new NamedItem(name), extension, new Uint8Array(4), {
    progress: null,
  });
  return opened;
}

describe("opening an EPS file with many shapes", () => {
  it("leaves the scene, the page and the shapes as the unbatched open did", () => {
    const opened = open("shapes.eps", "EPS");
    expect(opened).toBeInstanceOf(Scene);
    const reference = new Scene(workspace);
    openUnbatched(shapes(), reference);
    const result = state(opened as unknown as Scene) as { children: unknown[] };
    expect(result.children).toHaveLength(COUNT);
    expect(result).toEqual(state(reference));
  });

  it("computes the page's paint box a few times, not once per shape", () => {
    const calculate = vi.spyOn(Page.prototype, "_calculatePaintBBox");
    openUnbatched(shapes(), new Scene(workspace));
    // The unbatched open recomputes it for every insert and every move.
    expect(calculate.mock.calls.length).toBeGreaterThan(COUNT / 2);
    calculate.mockClear();
    open("shapes.eps", "EPS");
    expect(calculate.mock.calls.length).toBeLessThan(10);
  });
});

describe("opening an SVG file with many shapes at the top", () => {
  it("leaves the scene, the page and the shapes as the unbatched open did", () => {
    const opened = open("shapes.svg", "SVG");
    expect(opened).toBeInstanceOf(Scene);
    const reference = new Scene(workspace);
    openSvgUnbatched(shapes(), reference);
    const result = state(opened as unknown as Scene) as { children: unknown[] };
    expect(result.children).toHaveLength(COUNT);
    expect(result).toEqual(state(reference));
  });

  it("computes the page's paint box a few times, not once per shape", () => {
    const calculate = vi.spyOn(Page.prototype, "_calculatePaintBBox");
    openSvgUnbatched(shapes(), new Scene(workspace));
    // The unbatched open recomputes it for every insert.
    expect(calculate.mock.calls.length).toBeGreaterThan(COUNT / 2);
    calculate.mockClear();
    open("shapes.svg", "SVG");
    expect(calculate.mock.calls.length).toBeLessThan(10);
  });
});
