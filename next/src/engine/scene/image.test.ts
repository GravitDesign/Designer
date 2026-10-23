import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Platform, WebBrowser } from "../core/platform.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { FakeImage, installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { SceneDictionary } from "../style/scene-dictionary.ts";
import { Group } from "./group.ts";
import { Image, ImageStatusEvent } from "./image.ts";
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
});
