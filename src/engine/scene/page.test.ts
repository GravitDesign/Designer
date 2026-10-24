import { afterEach, describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId } from "../core/object.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { Layer } from "./layer.ts";
import { NodeFlag } from "./node-change.ts";
import { Container } from "./node-container.ts";
import { Properties } from "./node-properties.ts";
import { Store } from "./node-store.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "./node.ts";
import { AfterThumbnailUpdate, Page, PageInvalidationRequestEvent } from "./page.ts";
import { Rectangle } from "./rectangle.ts";
import { SceneNode } from "./scene-node.ts";
import { SceneOptions } from "./scene-options.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

/**
 * A stand-in for GScene (scene.ts) with what pages call: the page list,
 * label sizes and links kept as plain lists (master -> pages).
 */
class TestScene extends Container(Store(Properties(SceneNode))) {
  static {
    registerNodeClass(this, "scene", "GTestScene");
  }

  $lbs = 10;
  $lbp = 7;
  $pgx = 2;
  $mpg: Page | null = null;
  readonly masterLinks = new Map<Node, Page[]>();
  readonly references = new Map<string, Node>();

  constructor() {
    super();
    const references = this.references;
    const workspace: NodeWorkspace = {
      getTransactionRecorder: () => null,
      addReference: () => {},
      removeReference: () => {},
      getReference: (id) => references.get(id) ?? null,
    };
    this._setWorkspace(workspace);
    this._setScene(this);
  }

  override validateInsertion(): boolean {
    return true;
  }

  override getProperty(name: string): unknown {
    if ("pgx" === name) return this.$pgx;
    if ("mpg" === name) return this.$mpg;
    return null;
  }

  iteratePages(visitor: (page: Page) => unknown, includeInvisible?: boolean): void {
    for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
      if (node instanceof Page && (includeInvisible || node.$vis) && false === visitor(node)) {
        return;
      }
    }
  }

  getShadowExpandArea(): null {
    return null;
  }

  getScreenBox(): null {
    return null;
  }

  link(master: Node | string, page: SceneNode): void {
    const list = this.masterLinks.get(master as Node) ?? [];
    list.push(page as Page);
    this.masterLinks.set(master as Node, list);
  }

  unlink(): void {}

  isLinked(page: Node, master: unknown): boolean {
    return !!master && (this.masterLinks.get(master as Node) ?? []).includes(page as Page);
  }

  hasLinks(): boolean {
    return false;
  }

  visitLinks(master: Node, visitor: (linked: SceneNode) => void): void {
    (this.masterLinks.get(master) ?? []).forEach(visitor);
  }

  visitReferences(page: Node, visitor: (master: Node) => void): void {
    for (const [master, pages] of this.masterLinks)
      if (pages.includes(page as Page)) visitor(master);
  }

  _unsetSceneNode(): void {}
  _invalidateArea(): void {}

  getTransformSettings(): null {
    return null;
  }

  getLabelBBox(scale: number): Rect {
    return new Rect(0, 0, 0, (this.$lbs + this.$lbp) * (scale || 1));
  }

  setActivePage(page: Page | null): void {
    this.activePage = page;
  }

  activePage: Page | null = null;
}

function sceneWith(count: number): { scene: TestScene; pages: Page[] } {
  const scene = new TestScene();
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    const page = new Page();
    scene.appendChild(page);
    pages.push(page);
  }
  return { scene, pages };
}

afterEach(() => {
  SceneOptions.scaleLabel = true;
  SceneOptions.pagesCanOverlap = true;
});

describe("GPage", () => {
  it("is the node 'page' with the old type ids and defaults", () => {
    const page = new Page();
    expect(Node.getName(page)).toBe("page");
    expect(getTypeId(page)).toBe(165);
    expect(getTypeId(new PageInvalidationRequestEvent())).toBe(167);
    expect(getTypeId(Page.AfterThumbnailUpdate)).toBe(getTypeId(AfterThumbnailUpdate));
    expect(page.getProperty("w")).toBe(800);
    expect(page.getProperty("h")).toBe(600);
    expect(page.getProperty("gp")).toBe(10);
    expect(page.getProperty("bop")).toBe(1);
    expect(page.getPatternPropNames()).toEqual(["bck"]);
  });

  it("goes into scenes only", () => {
    const page = new Page();
    expect(page.validateInsertion(new TestScene())).toBe(true);
    expect(page.validateInsertion(new Layer())).toBe(false);
  });

  it("is fixed sized by w && h, the number itself", () => {
    const page = new Page();
    expect(page.isFixedSized()).toBe(600);
    page.setProperty("w", 0);
    expect(page.isFixedSized()).toBe(0);
    page.appendChild(rect(10, 20, 30, 40));
    expect(box(page.getGeometryBBox())).toEqual([10, 20, 30, 40]);
    expect(page.getClipBBox()).toBeNull();
    expect(page.getMarginBBox()).toBeNull();
  });

  it("has clip and margin boxes", () => {
    const page = new Page();
    page.setProperties(["bl", "ml", "mt", "mr", "mb"], [5, 1, 2, 3, 4]);
    expect(box(page.getGeometryBBox())).toEqual([0, 0, 800, 600]);
    expect(box(page.getClipBBox())).toEqual([-5, -5, 810, 610]);
    expect(box(page.getMarginBBox())).toEqual([1, 2, 796, 594]);
    expect(box(page.getPaintBBox())).toEqual([-5, -5, 810, 610]);
  });

  it("stores its offset and background", () => {
    const page = new Page();
    page.setProperties(
      ["off", "bck", "name"],
      [new Transform(1, 0, 0, 1, 7, 8), new RGBColor([1, 2, 3]), "P"],
    );
    const json = Node.serialize(page) as string;
    const blob = JSON.parse(json) as Record<string, unknown>;
    expect(blob["off"]).toEqual([1, 0, 0, 1, 7, 8]);
    expect(typeof blob["bck"]).toBe("string");
    expect("w" in blob).toBe(false);
    const back = Node.deserialize(json) as Page;
    expect(Transform.serialize(back.getProperty("off") as Transform)).toEqual([1, 0, 0, 1, 7, 8]);
    expect((back.getProperty("bck") as RGBColor).getValue()).toEqual([1, 2, 3]);
    expect(back.getProperty("name")).toBe("P");
  });

  it("sits in a grid of pgx pages per row in the multi-page view", () => {
    const { pages } = sceneWith(3);
    const at = (page: Page, multi: unknown = true) => {
      const p = page.getPosition(multi);
      return [p.getX(), p.getY()];
    };
    expect(at(pages[0] as Page)).toEqual([0, 0]);
    // Gap: label size + label padding + 5.
    expect(at(pages[1] as Page)).toEqual([822, 0]);
    expect(at(pages[2] as Page)).toEqual([0, 622]);
    expect(at(pages[2] as Page, false)).toEqual([0, 0]);
    expect(Transform.serialize((pages[1] as Page).getTransform())).toEqual([1, 0, 0, 1, 822, 0]);
    // A hidden page leaves its place.
    (pages[1] as Page).setProperty("vis", false);
    expect(at(pages[2] as Page)).toEqual([822, 0]);
  });

  it("moves a page that overlaps another below it, past the label", () => {
    const { pages } = sceneWith(2);
    const page = pages[1] as Page;
    page.setProperty("off", new Transform(1, 0, 0, 1, 100, 50));
    const position = page.getPosition(true);
    // Below the first page: -22 + 600 + 22 + 22 + 7 * 1.
    expect([position.getX(), position.getY()]).toEqual([100, 629]);
    const ignoringOffset = page.getPosition(true, true, false, true);
    expect([ignoringOffset.getX(), ignoringOffset.getY()]).toEqual([822, 0]);
  });

  it("keeps w and h unless both go to 0 when there are other pages", () => {
    const { pages } = sceneWith(2);
    const page = pages[0] as Page;
    page.setProperty("w", 0);
    expect(page.getProperty("w")).toBe(800);
    page.setProperty("h", 0);
    expect(page.getProperty("h")).toBe(600);
    page.setProperties(["w", "h"], [0, 0]);
    expect([page.getProperty("w"), page.getProperty("h")]).toEqual([0, 0]);
    const single = sceneWith(1).pages[0] as Page;
    single.setProperty("w", 0);
    expect(single.getProperty("w")).toBe(0);
  });

  it("moves away from other pages after a resize when pages can't overlap", () => {
    SceneOptions.pagesCanOverlap = false;
    const { pages } = sceneWith(2);
    const page = pages[1] as Page;
    page.setProperty("off", new Transform(1, 0, 0, 1, -500, 0));
    page.setProperty("w", 700);
    const off = Transform.serialize(page.getProperty("off") as Transform);
    // Pushed left of the first page and its gap (7 + label size + padding).
    expect(off).toEqual([1, 0, 0, 1, -724, 0]);
  });

  it("knows its master and slave pages by refs", () => {
    const { pages } = sceneWith(2);
    const [first, second] = pages as [Page, Page];
    expect(second.getMasterPages()).toEqual([]);
    second.setProperty("refs", [first.getReferenceId()]);
    expect(second.getMasterPages()).toEqual([first]);
    expect(first.getSlavePages()).toEqual([second]);
    expect(first.getMasterPages()).toEqual([]);
    expect(new Page().getMasterPages()).toEqual([]);
  });

  it("asks whether the single master paints anything but a color", () => {
    const { scene, pages } = sceneWith(1);
    const page = pages[0] as Page;
    const master = new Page();
    master.setProperty("bck", new RGBColor([255, 0, 0]));
    scene.$mpg = master;
    expect(page.isSingleMasterBackgroundContent()).toBe(false);
    scene.link(master, page);
    expect(page.isSingleMasterBackgroundContent()).toBe(false);
    master.appendChild(rect(-50, -40, 10, 10));
    expect(page.isSingleMasterBackgroundContent()).toBe(true);
    // An unbounded master widens the paint box of the page by its content.
    master.setProperties(["w", "h"], [0, 0]);
    expect(box(page.getPaintBBox())).toEqual([-50, -40, 850, 640]);
  });

  it("trims to its content and moves it to the origin", () => {
    const page = new Page();
    const child = rect(50, 60, 70, 80);
    page.appendChild(child);
    page.trimToContent();
    expect([page.getProperty("w"), page.getProperty("h")]).toEqual([70, 80]);
    expect(box(child.getGeometryBBox())).toEqual([0, 0, 70, 80]);
  });

  it("tracks the active layer", () => {
    const page = new Page();
    const a = new Layer();
    const b = new Layer();
    const sub = new Layer();
    page.appendChild(a);
    page.appendChild(b);
    b.appendChild(sub);
    page.setActiveLayer(b);
    expect(b.hasFlag(NodeFlag.Active)).toBe(true);
    page.setActiveLayer(sub);
    expect(b.hasFlag(NodeFlag.Active)).toBe(false);
    expect(sub.hasFlag(NodeFlag.Active)).toBe(true);
    expect(page.getSuccessorActiveLayer(b)).toBe(a);
    expect(page.getSuccessorActiveLayer(a)).toBe(b);
    expect(page.getSuccessorActiveLayer(sub)).toBe(b);
    expect(page.getSuccessorActiveLayer(rect(0, 0, 1, 1))).toBeNull();
    page.deleteActiveLayer(sub);
    expect(b.getFirstChild()).toBeNull();
    expect(b.hasFlag(NodeFlag.Active)).toBe(true);
    const item = rect(0, 0, 1, 1);
    a.appendChild(item);
    page.updateActiveLayerForElem(item);
    expect(a.hasFlag(NodeFlag.Active)).toBe(true);
    expect(b.hasFlag(NodeFlag.Active)).toBe(false);
  });

  it("makes itself the scene's active page when flagged active", () => {
    const { scene, pages } = sceneWith(2);
    (pages[1] as Page).setFlag(NodeFlag.Active);
    expect(scene.activePage).toBe(pages[1]);
  });

  it("hits its box, shifted to its position", () => {
    const { pages } = sceneWith(2);
    const page = pages[1] as Page;
    const hit = (x: number, y: number) =>
      page._detailHitTest(new Point(x, y), null, 0, undefined, undefined, true);
    expect(hit(900, 10)?.element).toBe(page);
    expect(hit(10, 10)).toBeNull();
  });
});
