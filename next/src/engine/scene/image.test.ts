import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Platform, WebBrowser } from "../core/platform.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { ElementData } from "../paint/element-data.ts";
import { Vertex } from "../geometry/vertex.ts";
import { FakeCanvas, FakeImage, installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { SceneDictionary } from "../style/scene-dictionary.ts";
import { Group } from "./group.ts";
import { ElementChange } from "./element-change.ts";
import { Image, ImageStatusEvent } from "./image.ts";
import { ImageGrid, type ImageGridImages } from "./image-grid.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "./node.ts";

/** An image element that "loads" as soon as it gets a src: 3 x 2 pixels, or fails for a src ending in "#bad". */
class LoadingImage extends FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  crossOrigin: string | null = null;
  width = 0;
  height = 0;
  private _src = "";

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    if (!value) return;
    if (value.endsWith("#bad")) {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.onerror?.();
      return;
    }
    this.naturalWidth = 3;
    this.naturalHeight = 2;
    this.width = 3;
    this.height = 2;
    this.onload?.();
  }
}

/** A scene stand-in with the image dictionary and a workspace that resolves urls as they are. */
class ImageTestScene extends Group {
  static {
    registerNodeClass(this, "testimagescene", "GTestImageScene");
  }

  dictionary: SceneDictionary;
  destroyables: unknown[] = [];
  resolved: string[] = [];

  constructor() {
    super();
    const workspace: NodeWorkspace & {
      resolveUrl(url: string, done: (url: string) => void): void;
    } = {
      getTransactionRecorder: () => null,
      addReference: () => {},
      removeReference: () => {},
      getReference: () => null,
      resolveUrl: (url, done) => {
        this.resolved.push(url);
        // Dictionary urls resolve to their value, as GSceneDictionary answers them.
        done(SceneDictionary.isDictionary(url) ? (this.dictionary.getValue(url) as string) : url);
      },
    };
    this.dictionary = new SceneDictionary(this as never);
    this._setWorkspace(workspace);
    this._setScene(this as never);
  }

  override getWorkspace(): null {
    return null;
  }

  getDictionary(): SceneDictionary {
    return this.dictionary;
  }

  addDestroyable(destroyable: unknown): void {
    this.destroyables.push(destroyable);
  }

  _unsetSceneNode(): void {}
  _invalidateArea(): void {}
  getTransformSettings(): null {
    return null;
  }
  link(): void {}
  unlink(): void {}
  hasLinks(): boolean {
    return false;
  }
  visitLinks(): void {}
  visitReferences(): void {}

  override validateInsertion(): boolean {
    return true;
  }
}

function box(rect: Rect | null): number[] | null {
  return rect ? Rect.serialize(rect) : null;
}

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeCanvas();
  Platform.setWebBrowser(WebBrowser.Chrome);
  (globalThis as unknown as Record<string, unknown>).Image = LoadingImage;
});
afterEach(() => uninstall());

describe("GImage", () => {
  it("waits for a scene and shows a 100 x 100 placeholder", () => {
    const image = new Image();
    expect(Node.getName(image)).toBe("image");
    expect(image.getStatus()).toBe(Image.ImageStatus.Delayed);
    expect([image.getWidth(), image.getHeight()]).toEqual([100, 100]);
    image.setProperties(["iw", "ih"], [30, 20]);
    expect([image.getWidth(), image.getHeight()]).toEqual([30, 20]);
    image.setProperty("trf", new Transform(2, 0, 0, 2, 10, 10));
    expect(box(image.getGeometryBBox())).toEqual([10, 10, 60, 40]);
  });

  it("detects the type from the first bytes", () => {
    const image = new Image();
    expect(image._getType([137, 80, 78, 71, 13, 10, 26, 10, 0])).toBe("png");
    expect(image._getType([255, 216, 255, 224])).toBe("jpeg");
    expect(image._getType([71, 73, 70, 56, 57])).toBe("gif");
    expect(image._getType([66, 77, 1])).toBe("bmp");
    expect(image._getType([1, 2, 3])).toBe(undefined);
  });

  it("moves frame and bitmap together, only the frame in double mode", () => {
    const image = new Image();
    image.transform(new Transform(1, 0, 0, 1, 5, 0));
    expect(Transform.serialize(image.getProperty("trf") as Transform)).toEqual([1, 0, 0, 1, 5, 0]);
    expect(Transform.serialize(image.getProperty("itrf") as Transform)).toEqual([1, 0, 0, 1, 5, 0]);
    image.setProperty("dblMode", true);
    image.transform(new Transform(1, 0, 0, 1, 0, 7));
    expect(Transform.serialize(image.getProperty("trf") as Transform)).toEqual([1, 0, 0, 1, 5, 7]);
    expect(Transform.serialize(image.getProperty("itrf") as Transform)).toEqual([1, 0, 0, 1, 5, 0]);
    image.setTransform(new Transform(2, 0, 0, 2, 0, 0));
    expect(image.getProperty("itrf")).toBe(image.getProperty("trf"));
  });

  it("never saves dblMode or, when saving, the temporary urls; always ipfc", () => {
    const image = new Image();
    image.setProperties(["dblMode", "tmpUrl", "storedUrl"], [true, "tmp", "stored"]);
    const saved = JSON.parse(Node.serialize(image, { save: true }) as string) as Record<
      string,
      unknown
    >;
    expect("dblMode" in saved).toBe(false);
    expect("tmpUrl" in saved).toBe(false);
    expect("storedUrl" in saved).toBe(false);
    expect(saved["ipfc"]).toBe(true);
    const copied = JSON.parse(Node.serialize(image) as string) as Record<string, unknown>;
    expect(copied["tmpUrl"]).toBe("tmp");
  });

  it("migrates files from before ipfc: fills under, itrf from trf", () => {
    const image = new Image();
    image.setProperty("trf", new Transform(3, 0, 0, 3, 1, 1));
    const blob = JSON.parse(Node.serialize(image) as string) as Record<string, unknown>;
    delete blob["ipfc"];
    delete blob["itrf"];
    const restored = Node.deserialize(JSON.stringify(blob)) as Image;
    expect(restored.getProperty("ipfc")).toBe(false);
    expect(Transform.serialize(restored.getProperty("itrf") as Transform)).toEqual([
      3, 0, 0, 3, 1, 1,
    ]);
  });

  it("loads a data url through the scene's dictionary", () => {
    const scene = new ImageTestScene();
    const image = new Image();
    const statuses: unknown[] = [];
    image.addEventListener(ImageStatusEvent, (e: ImageStatusEvent) => statuses.push(e.status));
    scene.appendChild(image);
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAC";
    image.setProperty("url", url);
    expect(statuses).toEqual([
      Image.ImageStatus.Resolving,
      Image.ImageStatus.Loading,
      Image.ImageStatus.Loaded,
    ]);
    expect(image.getType()).toBe("png");
    expect(SceneDictionary.isDictionary(image.getProperty("url"))).toBe(true);
    expect(scene.dictionary.getValue(image.getProperty("url") as string)).toBe(url);
    expect(image.getProperties(["iw", "ih", "pw", "ph"])).toEqual([3, 2, 3, 2]);
    expect([image.getWidth(), image.getHeight()]).toEqual([3, 2]);
    expect(scene.destroyables).toContain(image);
  });

  it("reports an error for an image that doesn't load", () => {
    const scene = new ImageTestScene();
    const image = new Image();
    scene.appendChild(image);
    image.setProperty("url", "data:image/png;base64,AAAA");
    // A data url that loads; now one that fails.
    const failing = new Image();
    scene.appendChild(failing);
    failing._resolvedImage("data:image/png;base64,AAAA#bad");
    expect(failing.getStatus()).toBe(Image.ImageStatus.Error);
  });

  it("fits into a box by scaling down only", () => {
    const image = new Image();
    image.toFit(new Rect(0, 0, 50, 500));
    expect(Transform.serialize(image.getProperty("trf") as Transform)).toEqual([
      0.5, 0, 0, 0.5, 0, 0,
    ]);
    const small = new Image();
    small.toFit(new Rect(0, 0, 500, 500));
    expect(small.getProperty("trf")).toBe(null);
  });

  describe("hit testing on pixels", () => {
    const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAC";

    /** A loaded 3 x 2 image whose canvas has an opaque red left column, scaled 10x to (100, 100). */
    function loaded(): Image {
      const scene = new ImageTestScene();
      const image = new Image();
      scene.appendChild(image);
      image.setProperty("url", PNG);
      image.setTransform(new Transform(10, 0, 0, 10, 100, 100));
      const canvas = image._imageCanvas as unknown as FakeCanvas;
      expect(canvas).toBeInstanceOf(FakeCanvas);
      const context = canvas.getContext("2d") as unknown as {
        fillStyle: string;
        fillRect(x: number, y: number, w: number, h: number): void;
      };
      context.fillStyle = "#ff0000";
      context.fillRect(0, 0, 1, 2);
      return image;
    }

    function hit(image: Image, x: number, y: number, tolerance = 0): unknown {
      const hits = image.hitTest(new Point(x, y), new Transform(), null, false, -1, tolerance);
      if (!hits) return null;
      const data = (hits[0] as unknown as ElementData<Image, { pixel: Uint8ClampedArray }>).data;
      expect(data.pixel).toBeInstanceOf(Uint8ClampedArray);
      return Array.from(data.pixel);
    }

    it("answers with the RGBA of an opaque pixel, as a Uint8ClampedArray", () => {
      expect(hit(loaded(), 105, 105)).toEqual([255, 0, 0, 255]);
    });

    it("misses transparent pixels unless one within the tolerance is opaque", () => {
      const image = loaded();
      expect(hit(image, 125, 105)).toBe(null);
      // Pixel (1.5, 0.5): the opaque column is one pixel away. The radius
      // is floor(tolerance + 0.5 * scale factor): 1 for 0.6, 0 for 0.4.
      expect(hit(image, 115, 105, 0.6)).toEqual([255, 0, 0, 255]);
      expect(hit(image, 115, 105, 0.4)).toBe(null);
    });

    it("answers outside the frame in double mode", () => {
      const image = loaded();
      image.setProperty("dblMode", true);
      // The bitmap moves right of the frame (100..130).
      image.setImageTransform(new Transform(10, 0, 0, 10, 200, 100));
      expect(hit(image, 205, 105)).toEqual([255, 0, 0, 255]);
      // In the frame, over nothing of the bitmap.
      expect(hit(image, 105, 105)).toBe(null);
    });

    it("throws for a null view transform (getScaleFactor)", () => {
      const image = loaded();
      expect(() => image._detailHitTest(new Point(105, 105), null, 0)).toThrow(TypeError);
    });
  });

  describe("loading", () => {
    const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAC";
    let saved: Record<string, number>;
    beforeEach(() => {
      saved = {
        absoluteMaxImgLinearDimension: Platform.absoluteMaxImgLinearDimension,
        absoluteMaxImgAreaDots: Platform.absoluteMaxImgAreaDots,
        maxImgDataUrlLength: Platform.maxImgDataUrlLength,
      };
    });
    afterEach(() => Object.assign(Platform, saved));

    it("builds itrf for a crop restored without one", () => {
      const scene = new ImageTestScene();
      const blob = JSON.parse(Node.serialize(new Image()) as string) as Record<string, unknown>;
      Object.assign(blob, { px: 1, py: 0.5, pw: 1.5, ph: 1, url: PNG });
      delete blob["itrf"];
      const image = Node.deserialize(JSON.stringify(blob)) as Image;
      scene.appendChild(image);
      expect(image.getStatus()).toBe(Image.ImageStatus.Loaded);
      // scale(1.5 / 3, 1 / 2) then translate(px, py).
      expect(Transform.serialize(image.getProperty("itrf") as Transform)).toEqual([
        0.5, 0, 0, 0.5, 1, 0.5,
      ]);
      expect(image.getProperties(["iw", "ih", "pw", "ph"])).toEqual([3, 2, 1.5, 1]);
    });

    it("makes no itrf for an uncropped bitmap", () => {
      const scene = new ImageTestScene();
      const image = new Image();
      image.setProperties(["pw", "ph"], [3, 2]);
      scene.appendChild(image);
      image.setProperty("url", PNG);
      expect(image.getStatus()).toBe(Image.ImageStatus.Loaded);
      expect(image.getProperty("itrf")).toBe(null);
    });

    for (const [limit, value] of [
      ["absoluteMaxImgLinearDimension", 2],
      ["absoluteMaxImgAreaDots", 5],
    ] as const) {
      it(`reports an error for a bitmap over ${limit}`, () => {
        (Platform as unknown as Record<string, number>)[limit] = value;
        const scene = new ImageTestScene();
        const image = new Image();
        scene.appendChild(image);
        image.setProperty("url", PNG);
        expect(image.getStatus()).toBe(Image.ImageStatus.Error);
        expect(image.getImage()).toBe(null);
        expect(image.getProperty("iw")).toBe(null);
      });
    }

    it("reports an error for a data url longer than maxImgDataUrlLength, without loading", () => {
      Platform.maxImgDataUrlLength = PNG.length - 1;
      const scene = new ImageTestScene();
      const image = new Image();
      scene.appendChild(image);
      const statuses: unknown[] = [];
      image.addEventListener(ImageStatusEvent, (e: ImageStatusEvent) => statuses.push(e.status));
      image.setProperty("url", PNG);
      expect(statuses).toEqual([Image.ImageStatus.Resolving, Image.ImageStatus.Error]);
      expect(image.getImage()).toBe(null);
    });

    it("ignores the canvas it already paints", () => {
      const scene = new ImageTestScene();
      const image = new Image();
      scene.appendChild(image);
      image.setProperty("url", PNG);
      const changes: number[] = [];
      const notify = image._notifyChange.bind(image);
      image._notifyChange = (change: number, args?: unknown) => {
        changes.push(change);
        return notify(change, args);
      };
      image._updatedImage(image._imageCanvas);
      expect(changes).toEqual([]);
      const other = document.createElement("canvas");
      image._updatedImage(other);
      expect(changes[0]).toBe(ElementChange.PrepareGeometryUpdate);
      expect(changes[changes.length - 1]).toBe(ElementChange.FinishGeometryUpdate);
    });
  });

  describe("loading a url that isn't a data url", () => {
    interface Request {
      method: string;
      url: string;
      async: boolean;
      responseType: string;
    }
    let requests: Request[];
    let response: ArrayBuffer | null;
    let savedRequest: unknown;

    class FakeRequest {
      readonly DONE = 4;
      readyState = 0;
      responseType = "";
      response: ArrayBuffer | null = null;
      onreadystatechange: ((event: { target: FakeRequest }) => void) | null = null;
      private _request: Request | null = null;
      open(method: string, url: string, async: boolean): void {
        this._request = { method, url, async, responseType: this.responseType };
      }
      send(): void {
        requests.push(this._request as Request);
        this.readyState = this.DONE;
        this.response = response;
        this.onreadystatechange?.({ target: this });
      }
    }

    const globals = globalThis as unknown as Record<string, unknown>;
    beforeEach(() => {
      requests = [];
      response = new Uint8Array([255, 216, 255, 224, 0]).buffer;
      savedRequest = globals.XMLHttpRequest;
      globals.XMLHttpRequest = FakeRequest;
    });
    afterEach(() => {
      globals.XMLHttpRequest = savedRequest;
    });

    function load(url: string): Image {
      const scene = new ImageTestScene();
      const image = new Image();
      scene.appendChild(image);
      image.setProperty("url", url);
      return image;
    }

    it("fetches the bytes once for the type, then loads the image", () => {
      const image = load("http://example.test/a.png");
      expect(requests).toEqual([
        {
          method: "GET",
          url: "http://example.test/a.png",
          async: true,
          responseType: "arraybuffer",
        },
      ]);
      // Typed from the fetched bytes, not from the name.
      expect(image.getType()).toBe("jpeg");
      expect(image.getStatus()).toBe(Image.ImageStatus.Loaded);
    });

    it("asks for CORS on http, https and protocol-relative urls only", () => {
      const crossOrigin = (url: string): unknown => {
        // An image element that never loads, so it stays in _image.
        const savedImage = globals.Image;
        let element: LoadingImage | null = null;
        globals.Image = class extends LoadingImage {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias -- the test keeps the element the image made
            element = this;
          }
          override set src(_value: string) {}
          override get src(): string {
            return "";
          }
        };
        try {
          load(url);
        } finally {
          globals.Image = savedImage;
        }
        return (element as LoadingImage | null)?.crossOrigin;
      };
      expect(crossOrigin("https://example.test/a.png")).toBe("Anonymous");
      expect(crossOrigin("http://example.test/a.png")).toBe("Anonymous");
      expect(crossOrigin("//example.test/a.png")).toBe("Anonymous");
      expect(crossOrigin("file:///C:/a.png")).toBe(null);
    });

    it("rewrites Windows file urls with backslashes", () => {
      load("file://C:\\images\\a.png");
      expect(requests[0]?.url).toBe("file:///C:/images/a.png");
      load("file:///already/fine.png");
      expect(requests[1]?.url).toBe("file:///already/fine.png");
    });

    it("leaves the type undefined for a failed request; the image's error is reported", () => {
      response = null;
      const image = load("http://example.test/missing.png#bad");
      expect(image.getType()).toBe(undefined);
      expect(image.getStatus()).toBe(Image.ImageStatus.Error);
    });
  });

  describe("dictionary urls", () => {
    const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAC";

    it("keeps a plain url when another entry already holds the same value", () => {
      const scene = new ImageTestScene();
      const first = new Image();
      scene.appendChild(first);
      first.setProperty("url", PNG);
      expect(SceneDictionary.isDictionary(first.getProperty("url"))).toBe(true);
      const second = new Image();
      scene.appendChild(second);
      second.setProperty("url", PNG);
      expect(second.getProperty("url")).toBe(PNG);
      expect(scene.dictionary.getEntries().length).toBe(1);
    });

    it("recreates a missing entry from storedUrl", () => {
      const scene = new ImageTestScene();
      const blob = JSON.parse(Node.serialize(new Image()) as string) as Record<string, unknown>;
      Object.assign(blob, { url: "dictionary://nosuchentry", storedUrl: PNG });
      const image = Node.deserialize(JSON.stringify(blob)) as Image;
      scene.appendChild(image);
      const url = image.getProperty("url") as string;
      expect(SceneDictionary.isDictionary(url)).toBe(true);
      expect(url).not.toBe("dictionary://nosuchentry");
      expect(scene.dictionary.getValue(url)).toBe(PNG);
      expect(image.getProperty("storedUrl")).toBe(PNG);
      expect(image.getStatus()).toBe(Image.ImageStatus.Loaded);
    });

    it("drops the painted canvas when a loaded image gets a new plain url", () => {
      const scene = new ImageTestScene();
      const image = new Image();
      scene.appendChild(image);
      image.setProperty("url", PNG);
      const before = image._imageCanvas;
      expect(before).not.toBe(null);
      image.setProperty("url", PNG + "AA");
      expect(image.getStatus()).toBe(Image.ImageStatus.Loaded);
      expect(image._imageCanvas).not.toBe(null);
      expect(image._imageCanvas).not.toBe(before);
    });

    it("paints a temporary preview before the bitmap, not after", () => {
      const scene = new ImageTestScene();
      const image = new Image();
      scene.appendChild(image);
      image.setProperty("tmpUrl", PNG);
      expect(image.getStatus()).toBe(Image.ImageStatus.Delayed);
      expect(image.getImageCanvas()).toBeInstanceOf(FakeCanvas);
      // The preview's size becomes the shape's box; the geometry box stays
      // the placeholder's until the bitmap is loaded.
      expect(box(image.getSourceBBox())).toEqual([0, 0, 3, 2]);
      expect(box(image.getGeometryBBox())).toEqual([0, 0, 100, 100]);
      const loadedImage = new Image();
      scene.appendChild(loadedImage);
      loadedImage.setProperty("url", PNG);
      const canvas = loadedImage._imageCanvas;
      loadedImage.setProperty("tmpUrl", PNG + "AA");
      expect(loadedImage._imageCanvas).toBe(canvas);
    });
  });
});

describe("GImage broken-image box", () => {
  it("draws the error cross corner to corner of a crop box that doesn't start at 0 (BUG-018)", () => {
    const image = new Image();
    image.setProperties(["px", "py", "pw", "ph"], [10, 5, 20, 30]);
    image._status = Image.ImageStatus.Error;
    const lines: number[][] = [];
    const canvas = {
      getTransform: () => new Transform(),
      setTransform: () => {},
      fillRect: () => {},
      strokeLine: (x1: number, y1: number, x2: number, y2: number) => {
        lines.push([x1, y1, x2, y2]);
      },
    };
    image._paintImageCanvas({} as never, canvas as never, null, null);
    // The old cross ran from (10, 5) to (20, 30) and from (20, 5) to (10, 30).
    expect(lines).toEqual([
      [10, 5, 30, 35],
      [30, 5, 10, 35],
    ]);
  });
});

describe("GImageGrid with images", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAC";

  function gridWithImage(): { scene: ImageTestScene; grid: ImageGrid; image: Image } {
    const scene = new ImageTestScene();
    const grid = new ImageGrid(true);
    grid.setProperty("trf", new Transform(48, 0, 0, 48, 0, 0));
    scene.appendChild(grid);
    const image = new Image();
    image.setProperty("trf", new Transform(4, 0, 0, 4, 2, 2));
    grid.addImage(image, new Rect(0, 0, 10, 10));
    return { scene, grid, image };
  }

  function names(grid: ImageGrid): string[] {
    return (grid._images as ImageGridImages).getChildren().map((child) => Node.getName(child));
  }

  it("hands its scene and workspace to the images, which then load", () => {
    const { scene, grid, image } = gridWithImage();
    expect(image._scene).toBe(scene);
    expect(image._workspace).toBe(scene._workspace);
    image.setProperty("url", PNG);
    expect(image.getStatus()).toBe(Image.ImageStatus.Loaded);
    scene.removeChild(grid);
    expect(image._scene).toBe(null);
    expect(image._workspace).toBe(null);
  });

  it("passes a scene and workspace reaching it later on to the images", () => {
    const scene = new ImageTestScene();
    const group = new Group();
    const grid = new ImageGrid(true);
    group.appendChild(grid);
    const image = new Image();
    grid.addImage(image, new Rect(0, 0, 1, 1));
    expect(image._scene).toBe(null);
    scene.appendChild(group);
    expect(image._scene).toBe(scene);
    expect(image._workspace).toBe(scene._workspace);
    scene.removeChild(group);
    expect(image._scene).toBe(null);
    expect(image._workspace).toBe(null);
  });

  it("puts restored images back into its container", () => {
    const { grid } = gridWithImage();
    const blob = JSON.parse(Node.serialize(grid) as string) as Record<string, unknown>;
    expect((blob["im"] as unknown[]).map((item) => typeof item)).toEqual(["string"]);
    const restored = Node.deserialize(JSON.stringify(blob)) as ImageGrid;
    expect((restored.getProperty("im") as Node[])[0]).toBeInstanceOf(Image);
    // The old app shows the same before the grid is inserted anywhere
    // (parity engine-model/image/grid-images).
    expect(names(restored)).toEqual(["image"]);
  });

  it("keeps the images laid out in their cells when one is moved", () => {
    const { image } = gridWithImage();
    image.setProperty("url", PNG);
    const before = Transform.serialize(image.getProperty("trf") as Transform);
    // Loading fitted it into its cell.
    expect(before).not.toEqual([4, 0, 0, 4, 2, 2]);
    image.setProperty("trf", new Transform(2, 0, 0, 2, 20, 20));
    expect(Transform.serialize(image.getProperty("trf") as Transform)).toEqual(before);
  });

  it("gives its container a new multireference id when the id is already taken", () => {
    const { grid, image } = gridWithImage();
    const images = grid._images as ImageGridImages;
    const ids: Record<string, Node> = {};
    grid.getSubnodeIds(ids);
    const first = images.getMultireferenceId();
    expect(ids[first]).toBe(images);
    expect(Object.values(ids)).toContain(image);
    grid.getSubnodeIds(ids);
    expect(images.getMultireferenceId()).not.toBe(first);
    expect(ids[images.getMultireferenceId()]).toBe(images);
  });

  it("paints its images instead of fills", () => {
    const { grid } = gridWithImage();
    const second = new Image();
    grid.addImage(second, new Rect(40, 40, 5, 5));
    const painted: unknown[] = [];
    const context = { marker: true };
    for (const image of grid.getProperty("im") as (Image | null)[]) {
      if (image) image.paint = (paintContext: unknown) => void painted.push([image, paintContext]);
    }
    grid._paintFill(context as never);
    const images = (grid.getProperty("im") as (Image | null)[]).filter((image) => !!image);
    expect(images.length).toBe(2);
    expect(painted).toEqual(images.map((image) => [image, context]));
  });

  it("doesn't reset its vertices when the margin or the layout changes (kept)", () => {
    const grid = new ImageGrid(true);
    const read = (): number[][] => {
      const out: number[][] = [];
      if (!grid.rewindVertices()) return out;
      const vertex = new Vertex();
      while (grid.readVertex(vertex)) out.push([vertex.command, vertex.x, vertex.y]);
      return out;
    };
    const first = read();
    expect(first.length).toBe(45);
    grid.setProperty("mg", 0.3);
    expect(read()).toEqual(first);
    grid.setProperty("grid", [[[1, 1]]]);
    expect(read()).toEqual(first);
    // A geometry update does reset them.
    grid._notifyChange(ElementChange.FinishGeometryUpdate);
    expect(read().length).toBe(5);
  });
});
