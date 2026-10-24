/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
/**
 * In-page helpers for the io-export-pdf and io-export-bitmap scenarios.
 * Documents are built with the G namespace only, without the editor or the
 * app's documents: a workspace of their own whose font manager answers
 * every family with Open Sans from the app's assets, scenes restored from
 * corpus JSON with GNode.deserializeAsync or built from the export
 * matrix's test documents (the same content as import-export/page-lib.ts,
 * appended to the page instead of inserted through the editor), and the
 * exporters called through app.pdfExport and app.bitmapExport.
 *
 * `makeDocLib` is sent to the page as source text (see `inPageWithDocLib`),
 * so it must not use anything outside its own body.
 */
import type { ParityHandle } from "../../support/scenario.ts";
import { normalizePdfString } from "../import-export/pdf-normalize.ts";

export function makeDocLib(
  p: ParityHandle,
  extras: {
    normalizePdf: (s: string, since: number, until: number) => string;
  },
) {
  const G = p.G;
  const app = p.app;
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  /**
   * A workspace whose font manager has Open Sans as its default font and
   * answers every family with all styles and weights, each resolved at
   * once to Open Sans under that name (as if already downloaded: a text
   * appended to a page while its font is still pending threw in the old
   * app's layout, "reading 'isNewLine'").
   */
  const newWorkspace = async () => {
    const bytes = await (await fetch("assets/font/OpenSans-Regular.ttf")).arrayBuffer();
    const workspace = new G.GWorkspace();
    const fm = workspace.getFontManager();
    fm.setDefaultFont(G.GOpenTypeFont.create("Open Sans", "N", 400, bytes));
    const variants: { style: string; weight: number }[] = [];
    for (const style of ["N", "I"])
      for (let weight = 100; weight <= 900; weight += 100) variants.push({ style, weight });
    fm.addEventListener(
      G.GFontManager.QueryFontFamilyEvent,
      (e: { family: string; callback(fonts: unknown[]): void }) => {
        e.callback(variants.map((v) => ({ family: e.family, ...v })));
      },
    );
    fm.addEventListener(
      G.GFontManager.ResolveFontEvent,
      (e: { family: string; style: string; weight: number; resolved(f: unknown): void }) => {
        e.resolved(G.GOpenTypeFont.create(e.family, e.style, e.weight, bytes));
      },
    );
    return workspace;
  };

  /** The scene in a .gvdesign file's JSON, restored into `workspace`. */
  const loadScene = (json: string, workspace: any) =>
    new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("the scene did not restore")), 60000);
      G.GNode.deserializeAsync(json, workspace, null, null, (result: any) => {
        clearTimeout(timer);
        if (result instanceof G.GScene) resolve(result);
        else reject(new Error("the file holds no scene"));
      });
    });

  /** A new document's scene: one white page without a size. */
  const newScene = (workspace: any) => {
    const scene = new G.GScene(workspace);
    scene.getActivePage().setProperties(["bck", "w", "h"], [G.GRGBColor.WHITE, 0, 0]);
    return scene;
  };

  const children = (node: any): any[] => {
    const out: any[] = [];
    if (typeof node.getFirstChild === "function")
      for (let c = node.getFirstChild(); c; c = c.getNext()) out.push(c);
    return out;
  };

  /** Every image and texture pattern under root has loaded (or failed). */
  const imagesReady = (root: any) => {
    let ready = true;
    const pattern = (pt: any) => {
      if (pt && typeof pt.isReady === "function" && !pt.isReady()) ready = false;
    };
    const visit = (node: any) => {
      if (node instanceof G.GImage) {
        const s = node.getStatus();
        if (s !== G.GImage.ImageStatus.Loaded && s !== G.GImage.ImageStatus.Error) ready = false;
      }
      if (typeof node.getPaintLayers === "function" && node.getPaintLayers()) {
        for (const l of children(node.getPaintLayers())) pattern(l.getProperty("_pt"));
      }
      if (typeof node.hasProperty === "function" && node.hasProperty("bck")) {
        pattern(node.getProperty("bck"));
      }
      for (const c of children(node)) visit(c);
    };
    visit(root);
    return ready;
  };

  const textBoxes = (root: any) => {
    const out: string[] = [];
    const visit = (node: any) => {
      if (node instanceof G.GText) {
        const b = node.getGeometryBBox();
        out.push(b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()].join(",") : "-");
      }
      for (const c of children(node)) visit(c);
    };
    visit(root);
    return out.join(";");
  };

  /**
   * Waits until every image and texture pattern of the scene has loaded, no
   * font is pending, the text boxes stopped changing (texts lay out again
   * once their font arrives) and that held for five frames.
   */
  const settle = async (scene: any) => {
    const fm = scene.getWorkspace().getFontManager();
    const start = Date.now();
    let quiet = 0;
    let last = "";
    while (quiet < 5) {
      if (Date.now() - start > 60000) throw new Error("settle timed out");
      const sig = textBoxes(scene);
      const ok = imagesReady(scene) && !fm.hasPendingFonts() && sig === last;
      last = sig;
      quiet = ok ? quiet + 1 : 0;
      await frame();
      await sleep(20);
    }
  };

  const pat = (s: string) => G.GPattern.deserialize(s);

  const fill = (el: any, pattern: string, opacity?: number) => {
    const l = new G.GStylable.FillPaintLayer();
    l.setProperty("_pt", pat(pattern));
    if (opacity !== undefined) l.setProperty("_op", opacity);
    el.getPaintLayers().appendChild(l);
    return l;
  };
  const border = (el: any, pattern: string, width: number) => {
    const l = new G.GStylable.BorderPaintLayer();
    l.setProperties(["_pt", "_bw"], [pat(pattern), width]);
    el.getPaintLayers().appendChild(l);
    return l;
  };
  const effect = (el: any, type: string, props: Record<string, any>) => {
    const fx = new G[type]();
    const names = Object.keys(props);
    fx.setProperties(
      names,
      names.map((n) =>
        typeof props[n] === "string" && /#/.test(props[n]) ? pat(props[n]) : props[n],
      ),
    );
    el.getEffects().appendChild(fx);
    return fx;
  };

  interface ShapeOptions {
    fill?: string;
    fills?: string[];
    fillOpacity?: number;
    border?: string;
    bw?: number;
    opacity?: number;
    rotate?: number;
    name?: string;
    corner?: number;
    effects?: { type: string; props: Record<string, any> }[];
  }

  const shape = (
    type: "rectangle" | "ellipse",
    x: number,
    y: number,
    w: number,
    h: number,
    o: ShapeOptions = {},
  ) => {
    const el = type === "rectangle" ? new G.GRectangle() : new G.GEllipse();
    let trf = new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2);
    if (o.rotate) {
      trf = trf
        .translated(-(x + w / 2), -(y + h / 2))
        .rotated(o.rotate * (Math.PI / 180))
        .translated(x + w / 2, y + h / 2);
    }
    el.setProperty("trf", trf);
    if (o.corner) el.setProperty("tl_sx", o.corner);
    for (const f of o.fills ?? (o.fill ? [o.fill] : [])) fill(el, f, o.fillOpacity);
    if (o.border) border(el, o.border, o.bw ?? 1);
    if (o.opacity !== undefined) el.setProperty("_stop", o.opacity);
    if (o.name) el.setProperty("name", o.name);
    for (const e of o.effects ?? []) effect(el, e.type, e.props);
    return el;
  };

  const text = (
    x: number,
    y: number,
    content: string,
    o: {
      size?: number;
      fills?: string[];
      border?: string;
      bw?: number;
      name?: string;
      box?: [number, number];
      props?: Record<string, unknown>;
    } = {},
  ) => {
    const t = new G.GText();
    t.setText(content);
    t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
    t.setProperties(["_tff", "_tfi"], ["Open Sans", o.size ?? 20]);
    if (o.props) t.setProperties(Object.keys(o.props), Object.values(o.props));
    for (const f of o.fills ?? ["C#[20,20,20]"]) fill(t, f);
    if (o.border) border(t, o.border, o.bw ?? 1);
    if (o.name) t.setProperty("name", o.name);
    if (o.box) t.__parityBox = o.box;
    return t;
  };

  const image = (
    x: number,
    y: number,
    w: number,
    h: number,
    iw: number,
    ih: number,
    url: string,
    name?: string,
  ) => {
    const im = new G.GImage();
    im.setProperties(["iw", "ih", "url"], [iw, ih, url]);
    // transform() keeps the image transform (itrf) in step with trf.
    im.transform(new G.GTransform(w / iw, 0, 0, h / ih, x, y));
    if (name) im.setProperty("name", name);
    return im;
  };

  const setupPage = (page: any, w: number, h: number, bck: string | null, name: string) => {
    page.setProperties(["w", "h", "bck", "name"], [w, h, bck ? pat(bck) : null, name]);
    return page;
  };

  /** Fixes the box of texts built with `box` once their font has loaded. */
  const fixTextBoxes = async (scene: any, texts: any[]) => {
    await settle(scene);
    for (const t of texts) {
      if (t.__parityBox)
        t.setProperties(["aw", "ah", "w", "h"], [false, false, t.__parityBox[0], t.__parityBox[1]]);
    }
  };

  /**
   * Builds a test document on the scene's first page and returns the nodes
   * by name, with `page` and `scene`. "shapes", "text", "effects", "image"
   * and "multipage" are the export matrix's documents
   * (import-export/page-lib.ts); "sharp-shadows" and "decorations" add the
   * PDF exporter's vector shadow, inner shadows on images and text
   * decorations in every paint mode.
   */
  const build = async (scene: any, name: string, data: Record<string, string> = {}) => {
    const page = scene.getActivePage();
    const out: Record<string, any> = { page, scene };
    const add = (els: any[]) => {
      for (const el of els) page.appendChild(el);
    };
    switch (name) {
      case "shapes": {
        setupPage(page, 320, 200, "C#[255,255,255]", "Artboard");
        out.box = shape("rectangle", 20, 20, 120, 80, {
          fill: "C#[220,40,40]",
          border: "C#[0,0,0]",
          bw: 4,
          name: "Box",
        });
        out.oval = shape("ellipse", 170, 30, 130, 90, {
          fill: 'L#{"fx":0,"x":[{"p":0,"c":"C#[255,200,0]","o":1},{"p":1,"c":"C#[0,90,200]","o":1}]}',
          name: "Oval",
        });
        out.tilted = shape("rectangle", 60, 120, 140, 50, {
          fill: 'R#{"s":0.5,"fx":0.3,"fy":0.3,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[40,140,60]","o":1}]}',
          border: "C#[40,40,120]",
          bw: 2,
          opacity: 0.7,
          rotate: 15,
          name: "Tilted",
        });
        out.corner = shape("rectangle", 230, 140, 70, 45, {
          fill: "C#[120,60,180]",
          corner: 12,
          name: "Rounded",
        });
        add([out.box, out.oval, out.tilted, out.corner]);
        break;
      }
      case "text": {
        setupPage(page, 320, 120, "C#[255,255,255]", "Type");
        out.title = text(16, 16, "Gravit Export", { size: 30, name: "Title", box: [240, 44] });
        out.multi = text(16, 70, "Two fills", {
          size: 22,
          fills: ["C#[200,30,30]", "C#[30,30,200]"],
          name: "Multi",
        });
        add([out.title, out.multi]);
        await fixTextBoxes(scene, [out.title, out.multi]);
        break;
      }
      case "effects": {
        setupPage(page, 320, 200, "C#[250,250,250]", "Effects");
        out.shadow = shape("rectangle", 20, 20, 80, 60, {
          fill: "C#[60,120,220]",
          name: "Shadow",
          effects: [{ type: "GDropShadowEffect", props: { x: 6, y: 6, r: 5, pat: "C#[0,0,0]" } }],
        });
        out.blurred = shape("ellipse", 130, 20, 70, 70, {
          fill: "C#[230,120,0]",
          name: "Blurred",
          effects: [{ type: "GBlurEffect", props: { r: 4 } }],
        });
        out.inner = shape("rectangle", 220, 20, 80, 60, {
          fill: "C#[240,240,120]",
          name: "Inner",
          effects: [{ type: "GInnerShadowEffect", props: { x: 4, y: 4, r: 4, pat: "C#[0,0,0]" } }],
        });
        out.sepia = shape("rectangle", 20, 110, 120, 70, {
          fills: [
            'L#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,0,255]","o":1}]}',
          ],
          name: "Sepia",
          effects: [{ type: "GGLSepiaEffect", props: {} }],
        });
        out.angular = shape("ellipse", 170, 110, 120, 70, {
          fill: 'A#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,200,0]","o":1}]}',
          name: "Angular",
        });
        add([out.shadow, out.blurred, out.inner, out.sepia, out.angular]);
        break;
      }
      case "image": {
        setupPage(page, 240, 160, "C#[255,255,255]", "Pictures");
        out.png = image(10, 10, 128, 96, 64, 48, data.png ?? "", "Alpha PNG");
        out.jpg = image(140, 60, 90, 68, 80, 60, data.jpg ?? "", "Photo");
        add([out.png, out.jpg]);
        break;
      }
      case "multipage": {
        setupPage(page, 200, 100, "C#[255,255,255]", "Cover");
        out.a = shape("rectangle", 20, 20, 160, 60, { fill: "C#[200,0,0]", name: "Red" });
        add([out.a]);
        const p2 = new G.GPage();
        setupPage(p2, 150, 150, "C#[230,240,255]", "Second");
        scene.appendChild(p2);
        out.page2 = p2;
        p2.appendChild(shape("ellipse", 25, 25, 100, 100, { fill: "C#[0,120,0]", name: "Green" }));
        const p3 = new G.GPage();
        setupPage(p3, 100, 100, "C#[0,0,0]", "Hidden");
        p3.setProperty("vis", false);
        scene.appendChild(p3);
        p3.appendChild(
          shape("rectangle", 10, 10, 50, 50, { fill: "C#[255,255,255]", name: "White" }),
        );
        out.page3 = p3;
        break;
      }
      case "sharp-shadows": {
        // Drop shadows with radius 0 take the PDF exporter's vector branch
        // (the shape filled again, offset, with the first fill layer's
        // opacity); inner shadows on images go through the raster path.
        setupPage(page, 320, 200, "C#[255,255,255]", "Sharp");
        out.sharp = shape("rectangle", 20, 20, 80, 60, {
          fill: "C#[60,120,220]",
          name: "Sharp",
          effects: [{ type: "GDropShadowEffect", props: { x: 8, y: 6, r: 0, pat: "C#[0,0,0]" } }],
        });
        out.faded = shape("ellipse", 130, 20, 80, 60, {
          fill: "C#[230,120,0]",
          fillOpacity: 0.5,
          name: "Faded",
          effects: [
            { type: "GDropShadowEffect", props: { x: -6, y: 8, r: 0, pat: "C#[200,0,100]" } },
          ],
        });
        out.innerImage = image(20, 100, 96, 72, 64, 48, data.png ?? "", "Inner PNG");
        effect(out.innerImage, "GInnerShadowEffect", { x: 4, y: 4, r: 3, pat: "C#[0,0,0]" });
        out.innerPhoto = image(150, 100, 120, 90, 80, 60, data.jpg ?? "", "Inner Photo");
        effect(out.innerPhoto, "GInnerShadowEffect", { x: -5, y: 3, r: 0, pat: "C#[0,0,160]" });
        add([out.sharp, out.faded, out.innerImage, out.innerPhoto]);
        break;
      }
      case "decorations": {
        // Underline and strikeout with fill only, border only and both
        // (text render modes fill, stroke and fill + stroke).
        setupPage(page, 360, 200, "C#[255,255,255]", "Decorations");
        const decorated = { _tdu: true, _tds: true };
        out.filled = text(16, 16, "Filled text", {
          size: 26,
          props: decorated,
          name: "Filled",
          box: [320, 40],
        });
        out.stroked = text(16, 76, "Stroked text", {
          size: 26,
          fills: [],
          border: "C#[200,0,0]",
          bw: 1,
          props: decorated,
          name: "Stroked",
          box: [320, 40],
        });
        out.both = text(16, 136, "Both modes", {
          size: 26,
          fills: ["C#[0,90,200]"],
          border: "C#[0,0,0]",
          bw: 0.5,
          props: decorated,
          name: "Both",
          box: [320, 40],
        });
        add([out.filled, out.stroked, out.both]);
        await fixTextBoxes(scene, [out.filled, out.stroked, out.both]);
        break;
      }
      default:
        throw new Error("unknown test document " + name);
    }
    await settle(scene);
    await settle(scene);
    return out;
  };

  /** The export dialog's default settings for one format (FMT-EXPORT-022). */
  const dialogDefaults = (format: string, element: any) => ({
    size: "1x",
    suffix: "",
    format,
    jpegQuality: 92,
    backgroundColor: format === "jpg" ? G.GRGBColor.WHITE : null,
    backgroundOpacity: 1,
    colorSpace: undefined as string | undefined,
    configuration: {
      ignoreEffects: false,
      forceEffectsWhenZoomed: true,
      sceneBackground: true,
      isOutline: () => false,
    } as Record<string, unknown>,
    convertTextToPath: false,
    downsampleImages: false,
    element,
  });

  const bytesToB64 = (bytes: Uint8Array) => {
    let latin = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      latin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(latin);
  };

  const sha256 = async (bytes: Uint8Array<ArrayBuffer>) => {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  };

  /**
   * GExporter.exportExportable's PDF branch: the same option object
   * (dpi from the size, jpegQuality defaulting to 92) handed to
   * GPDFExport.export. `user` is the signed-in user's full name; the old
   * app's stub server account writes "Test". Resolves with the file's
   * bytes with the dates normalized (pdf-normalize.ts).
   */
  const exportPdf = async (ex: any, user: string, title: string) => {
    const since = Date.now();
    const dpi = G.GUtil.parseNumber(ex.size);
    const out = await app.pdfExport.export(ex.element, {
      dpi: dpi === null || dpi === undefined ? G.GUtil.parseNumber("72dpi") : dpi,
      colorSpace: ex.colorSpace,
      jpegQuality: ex.jpegQuality || 92,
      configuration: ex.configuration,
      backgroundColor: ex.backgroundColor,
      backgroundOpacity: ex.backgroundOpacity,
      convertTextToPath: ex.convertTextToPath,
      progress: null,
      user,
      title,
      downsampleImages: ex.downsampleImages,
    });
    if (!out.called) {
      throw new Error(
        out.error ? "export threw " + String(out.error) : "the export did not call back",
      );
    }
    if (out.error) throw new Error("export failed: " + String(out.error));
    if (!out.data) return new Uint8Array(0);
    const bytes = new Uint8Array(await new Blob([out.data]).arrayBuffer());
    let latin = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      latin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const normalized = extras.normalizePdf(latin, since, Date.now());
    return Uint8Array.from(normalized, (c) => c.charCodeAt(0));
  };

  /**
   * GExporter.exportExportable's PNG and JPEG branch: GBitmapExport.export
   * at the screen DPI with the clamp to the canvas limit, then
   * GBitmap.toImageBlob with the JPEG quality as a fraction.
   */
  const exportBitmap = async (ex: any) => {
    const bitmap = app.bitmapExport.export(
      ex.element,
      ex.size,
      ex.backgroundColor,
      ex.configuration,
      G.GLength.DPI,
      ex.backgroundOpacity,
      true,
    );
    if (!bitmap) return { mime: null as string | null, bytes: new Uint8Array(0) };
    const type = ex.format === "jpg" ? G.GBitmap.ImageType.JPEG : G.GBitmap.ImageType.PNG;
    const quality = ex.format === "jpg" ? (ex.jpegQuality || 100) / 100 : null;
    const blob: Blob | null = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("toImageBlob did not call back")), 60000);
      bitmap.toImageBlob(
        type,
        (b: Blob | null) => {
          clearTimeout(timer);
          resolve(b);
        },
        quality,
      );
    });
    if (!blob) return { mime: null as string | null, bytes: new Uint8Array(0) };
    return { mime: blob.type, bytes: new Uint8Array(await blob.arrayBuffer()) };
  };

  /** The visible pages of a scene, in order. */
  const visiblePages = (scene: any) =>
    scene.getChildren().filter((n: any) => n instanceof G.GPage && n.isVisible());

  return {
    G,
    app,
    newWorkspace,
    loadScene,
    newScene,
    settle,
    pat,
    build,
    dialogDefaults,
    bytesToB64,
    sha256,
    exportPdf,
    exportBitmap,
    visiblePages,
  };
}

export type DocLib = ReturnType<typeof makeDocLib>;

/**
 * Wraps an in-page scenario function so it receives the doc lib as its
 * third argument (the runner sends `toString()` of the function to the
 * page; see import-export/page-lib.ts inPageWithLib).
 */
export function inPageWithDocLib<A>(
  fn: (p: ParityHandle, args: A, L: DocLib) => unknown,
): (p: ParityHandle, args: A) => unknown {
  const source = `(p, a) => (${fn.toString()})(p, a, (${makeDocLib.toString()})(p, { normalizePdf: (${normalizePdfString.toString()}) }))`;
  const wrapper = (): never => {
    throw new Error("in-page scenario functions only run in the page");
  };
  wrapper.toString = () => source;
  return wrapper;
}
