/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// GImage painting, pixel hit testing and the url and load paths, and an
// image grid painting its image. Every case builds the same 8 x 6 bitmap
// in the page: an opaque red left half, a half-transparent blue block at
// the top right, an opaque green block at the bottom right, the rest
// transparent.

type PaintCase =
  | "placeholder"
  | "error"
  | "plain"
  | "fill-under"
  | "fill-over"
  | "border"
  | "rounded"
  | "crop"
  | "double-mode"
  | "preview"
  | "grid";

const paint = (name: PaintCase): Scenario => ({
  id: `engine-model/image/paint-${name}`,
  covers: name === "grid" ? ["ENG-NODE-042", "ENG-NODE-034"] : ["ENG-NODE-034"],
  kind: "png",
  args: { name },
  inPage: withHelpers(async (_p, a: { name: PaintCase }, H) => {
    const G = H.G;
    const I = G.GImage;
    const bitmapUrl = () => {
      const cv = document.createElement("canvas");
      cv.width = 8;
      cv.height = 6;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "rgba(255, 0, 0, 1)";
      ctx.fillRect(0, 0, 4, 6);
      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.fillRect(4, 0, 2, 3);
      ctx.fillStyle = "rgba(0, 160, 0, 1)";
      ctx.fillRect(6, 4, 2, 2);
      return cv.toDataURL("image/png");
    };
    const settle = async (img: any) => {
      for (
        let i = 0;
        i < 300 &&
        img.getStatus() !== I.ImageStatus.Loaded &&
        img.getStatus() !== I.ImageStatus.Error;
        i++
      )
        await H.frame();
      if (img.getStatus() !== I.ImageStatus.Loaded && img.getStatus() !== I.ImageStatus.Error)
        throw new Error("the image did not settle");
    };
    const img = new I();
    let target: any = img;
    switch (a.name) {
      case "placeholder":
        // Not loaded: the grey box of iw x ih.
        img.setProperties(["iw", "ih"], [40, 30]);
        img.setProperty("trf", H.T(1, 0, 0, 1, 5, 5));
        H.add(img);
        break;
      case "error": {
        // A url that doesn't decode: the grey crop box crossed out. The
        // second line ends at (px, ph), not (px, py + ph) (kept).
        img.setProperties(["iw", "ih", "px", "py", "pw", "ph"], [40, 30, 4, 2, 30, 20]);
        H.add(img);
        img.setProperty("url", "data:image/png;base64,AAAA");
        await settle(img);
        if (img.getStatus() !== I.ImageStatus.Error) throw new Error("expected an error");
        break;
      }
      case "preview": {
        // Only a temporary preview url: it is painted from its canvas
        // while the image itself still has no bitmap.
        img.setProperty("trf", H.T(4, 0, 0, 4, 0, 0));
        H.add(img);
        img.setProperty("tmpUrl", bitmapUrl());
        for (let i = 0; i < 300 && !img.getImageCanvas(); i++) await H.frame();
        if (!img.getImageCanvas()) throw new Error("the preview did not load");
        break;
      }
      default: {
        if (a.name === "grid") {
          const grid = new G.GImageGrid(true);
          grid.setProperty("trf", H.T(48, 0, 0, 48, 0, 0));
          H.add(grid);
          img.setProperty("trf", H.T(4, 0, 0, 4, 2, 2));
          grid.addImage(img, new G.GRect(0, 0, 10, 10));
          target = grid;
        } else {
          if (a.name === "crop") {
            // Cropped before the bitmap arrives and without itrf: the
            // bitmap is scaled into the crop box by an itrf made on load
            // (rendered at 8x below).
            img.setProperties(["px", "py", "pw", "ph"], [2, 1, 4, 3]);
          } else img.setTransform(H.T(8, 0, 0, 8, 0, 0));
          H.add(img);
        }
        img.setProperty("url", bitmapUrl());
        await settle(img);
        if (img.getStatus() !== I.ImageStatus.Loaded) throw new Error("the image did not load");
        if (a.name === "fill-under" || a.name === "fill-over") {
          H.fill(img, H.rgb(0, 200, 200), { _op: 0.5 });
          img.setProperty("ipfc", a.name === "fill-under");
        } else if (a.name === "border") {
          H.border(img, H.rgb(0, 0, 0), { _bw: 4 });
        } else if (a.name === "rounded") {
          img.setProperties(["tl_sx", "tl_sy"], [16, 16]);
        } else if (a.name === "double-mode") {
          // The frame stays, the bitmap moves; outside the frame it shows
          // at half opacity.
          img.setProperty("dblMode", true);
          img.setImageTransform(H.T(8, 0, 0, 8, 20, 12));
        }
        await H.frame();
      }
    }
    const scale = a.name === "crop" ? 8 : 1;
    const bitmap = target.toBitmap(scale, scale);
    if (!bitmap) throw new Error("no bitmap");
    return bitmap.toImageDataUrl();
  }),
});

const scenarios = defineScenarios([
  ...(
    [
      "placeholder",
      "error",
      "plain",
      "fill-under",
      "fill-over",
      "border",
      "rounded",
      "crop",
      "double-mode",
      "preview",
      "grid",
    ] as const
  ).map(paint),
  {
    id: "engine-model/image/hit-test",
    covers: ["ENG-NODE-034"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const I = G.GImage;
      const cv = document.createElement("canvas");
      cv.width = 8;
      cv.height = 6;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "rgba(255, 0, 0, 1)";
      ctx.fillRect(0, 0, 4, 6);
      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.fillRect(4, 0, 2, 3);
      ctx.fillStyle = "rgba(0, 160, 0, 1)";
      ctx.fillRect(6, 4, 2, 2);
      const img = new I();
      img.setTransform(H.T(10, 0, 0, 10, 100, 100));
      H.add(img);
      img.setProperty("url", cv.toDataURL("image/png"));
      for (let i = 0; i < 300 && img.getStatus() !== I.ImageStatus.Loaded; i++) await H.frame();
      if (img.getStatus() !== I.ImageStatus.Loaded) throw new Error("the image did not load");
      const hit = (x: number, y: number, tolerance: number, transform: any) => {
        const hits = img.hitTest(new G.GPoint(x, y), transform, null, false, -1, tolerance);
        if (!hits) return null;
        return hits.map((h: any) => {
          const pixel = h.data && h.data.pixel;
          return {
            node: G.GNode.getName(h.element),
            self: h.element === img,
            pixel: pixel ? Array.from(pixel as ArrayLike<number>) : (pixel ?? "<none>"),
            pixelType: pixel ? Object.prototype.toString.call(pixel) : null,
          };
        });
      };
      const identity = new G.GTransform();
      const zoom = H.T(2, 0, 0, 2, -50, -50);
      const out: Record<string, unknown> = {
        // Pixel coordinates (0.5, 0.5): opaque red.
        opaque: hit(105, 105, 0, identity),
        // (4.5, 0.5): half-transparent blue.
        halfTransparent: hit(145, 105, 0, identity),
        // (6.5, 1.5): transparent, nothing opaque within the tolerance.
        transparent: hit(165, 115, 0, identity),
        // (4.5, 4.5): transparent; the red edge is half a pixel left of it.
        nearEdge: hit(145, 145, 0, identity),
        nearEdgeTolerance: hit(145, 145, 2, identity),
        // Zoomed: the tolerance gains half the scale factor.
        zoomed: hit(2 * 145 - 50, 2 * 145 - 50, 0, zoom),
        zoomedTransparent: hit(2 * 165 - 50, 2 * 115 - 50, 0, zoom),
        // Outside the paint box.
        outside: hit(300, 300, 0, identity),
      };
      // Double mode: the bitmap moves out of the frame. A hit on its pixel
      // outside the frame still answers with the pixel.
      img.setProperty("dblMode", true);
      img.setImageTransform(H.T(10, 0, 0, 10, 180, 100));
      out.doubleInFrame = hit(105, 105, 0, identity);
      out.doubleOutsideFrame = hit(185, 105, 0, identity);
      out.doubleTransparent = hit(245, 105, 0, identity);
      return out;
    }),
  },
  {
    id: "engine-model/image/grid-images",
    covers: ["ENG-NODE-042"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const I = G.GImage;
      const cv = document.createElement("canvas");
      cv.width = 8;
      cv.height = 6;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "rgba(255, 0, 0, 1)";
      ctx.fillRect(0, 0, 4, 6);
      const url = cv.toDataURL("image/png");
      const settle = async (img: any) => {
        for (
          let i = 0;
          i < 300 &&
          img.getStatus() !== I.ImageStatus.Loaded &&
          img.getStatus() !== I.ImageStatus.Error;
          i++
        )
          await H.frame();
      };
      const children = (grid: any) =>
        grid._images ? grid._images.getChildren().map((c: any) => G.GNode.getName(c)) : null;
      const grid = new G.GImageGrid(true);
      grid.setProperty("trf", H.T(48, 0, 0, 48, 0, 0));
      H.add(grid);
      const img = new I();
      img.setProperty("trf", H.T(4, 0, 0, 4, 2, 2));
      grid.addImage(img, new G.GRect(0, 0, 10, 10));
      img.setProperty("url", url);
      await settle(img);
      const out: Record<string, unknown> = {
        // The scene and workspace reach the image through the container.
        attached: {
          status: img.getStatus(),
          scene: img.getScene() === H.app.scene(),
          workspace: img.getWorkspace() === H.app.scene().getWorkspace(),
          parent: G.GNode.getName(img.getParent()),
          props: H.props(img, ["trf", "itrf"]),
          gridBoxes: H.boxes(grid),
          children: children(grid),
        },
      };
      // Moving the image relayouts the grid's box.
      img.setProperty("trf", H.T(2, 0, 0, 2, 20, 20));
      out.moved = { props: H.props(img, ["trf", "itrf"]), gridBoxes: H.boxes(grid) };
      // Stored images are serialized nodes.
      const blob = JSON.parse(G.GNode.serialize(grid));
      out.stored = (blob.im as unknown[]).map((x) => typeof x);
      // Restore puts the images into `im` without the property change, so
      // the container stays empty until the grid is inserted somewhere.
      const restored = G.GNode.deserialize(G.GNode.serialize(grid));
      const childrenBeforeInsert = children(restored);
      H.add(restored);
      for (let i = 0; i < 5; i++) await H.frame();
      const restoredImage = (restored.getProperty("im") as any[])[0];
      out.restored = {
        isImage: restoredImage instanceof I,
        childrenBeforeInsert,
        children: children(restored),
        parent: restoredImage.getParent() ? G.GNode.getName(restoredImage.getParent()) : null,
        scene: !!restoredImage.getScene(),
        status: restoredImage.getStatus(),
      };
      // A second subnode collection with the container's id already taken
      // gives the container a new multireference id.
      const ids: Record<string, unknown> = {};
      grid.getSubnodeIds(ids);
      const before = grid._images.getMultireferenceId();
      const keysBefore = Object.keys(ids).length;
      grid.getSubnodeIds(ids);
      out.subnodeIds = {
        keysBefore,
        changed: grid._images.getMultireferenceId() !== before,
        keysAfter: Object.keys(ids).length,
        hasImage: Object.values(ids).includes(img),
      };
      // `mg` and `grid` changes don't reset the cached vertices.
      const stale = new G.GImageGrid(true);
      stale.setProperty("trf", H.T(100, 0, 0, 100, 0, 0));
      H.add(stale);
      const first = H.verts(stale);
      stale.setProperty("mg", 0.3);
      const afterMargin = H.verts(stale);
      stale.setProperty("grid", [[[1, 1]]]);
      const afterGrid = H.verts(stale);
      out.stale = {
        count: first.length,
        marginUnchanged: JSON.stringify(afterMargin) === JSON.stringify(first),
        gridUnchanged: JSON.stringify(afterGrid) === JSON.stringify(first),
        boxes: H.boxes(stale),
      };
      return out;
    }),
  },
  {
    id: "engine-model/image/load-and-url",
    covers: ["ENG-NODE-034"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      const I = G.GImage;
      const cv = document.createElement("canvas");
      cv.width = 8;
      cv.height = 6;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "rgba(255, 0, 0, 1)";
      ctx.fillRect(0, 0, 4, 6);
      const url = cv.toDataURL("image/png");
      const settle = async (img: any) => {
        for (
          let i = 0;
          i < 300 &&
          img.getStatus() !== I.ImageStatus.Loaded &&
          img.getStatus() !== I.ImageStatus.Error;
          i++
        )
          await H.frame();
      };
      const urlKind = (img: any) => {
        const value = img.getProperty("url");
        if (typeof value !== "string") return value;
        return value.split(":")[0];
      };
      const dictionary = H.app.scene().getDictionary();
      const state = (img: any) => ({
        status: img.getStatus(),
        url: urlKind(img),
        storedUrl: urlKind({ getProperty: () => img.getProperty("storedUrl") }),
        props: H.props(img, ["iw", "ih", "px", "py", "pw", "ph", "itrf"]),
        boxes: H.boxes(img),
      });
      const out: Record<string, unknown> = {};

      // A crop from a file without itrf: itrf scales the bitmap into it.
      const cropBlob = JSON.parse(G.GNode.serialize(new I()));
      Object.assign(cropBlob, { px: 2, py: 1, pw: 4, ph: 3, url });
      delete cropBlob.itrf;
      const cropped = G.GNode.deserialize(JSON.stringify(cropBlob));
      H.add(cropped);
      await settle(cropped);
      out.crop = state(cropped);
      // An uncropped file: no itrf is made.
      const plainBlob = JSON.parse(G.GNode.serialize(new I()));
      Object.assign(plainBlob, { px: 0, py: 0, pw: 8, ph: 6, url });
      const plain = G.GNode.deserialize(JSON.stringify(plainBlob));
      H.add(plain);
      await settle(plain);
      out.uncropped = state(plain);

      // The same data url again: the dictionary already holds it, so the
      // second image keeps the plain url.
      const entriesBefore = dictionary.getEntries().length;
      const first = new I();
      H.add(first);
      first.setProperty("url", url);
      await settle(first);
      const second = new I();
      H.add(second);
      second.setProperty("url", url);
      await settle(second);
      out.sameUrl = {
        first: state(first),
        second: state(second),
        newEntries: dictionary.getEntries().length - entriesBefore,
      };

      // A dictionary url whose entry is missing, with storedUrl set: the
      // stored value takes over and gets an entry of its own.
      const missingBlob = JSON.parse(G.GNode.serialize(new I()));
      Object.assign(missingBlob, { url: "dictionary://nosuchentry", storedUrl: url + "#x" });
      const missing = G.GNode.deserialize(JSON.stringify(missingBlob));
      H.add(missing);
      await settle(missing);
      out.missingEntry = state(missing);

      // A temporary preview before the real url.
      const preview = new I();
      H.add(preview);
      preview.setProperty("tmpUrl", url);
      for (let i = 0; i < 300 && !preview.getImageCanvas(); i++) await H.frame();
      out.preview = {
        status: preview.getStatus(),
        size: [preview.getWidth(), preview.getHeight()],
        canvas: preview.getImageCanvas()
          ? [preview.getImageCanvas().width, preview.getImageCanvas().height]
          : null,
        boxes: H.boxes(preview),
        ready: !!preview.isReady(),
      };
      return out;
    }),
  },
]);

paritySuite("engine-model image", scenarios, { newApp: false });
