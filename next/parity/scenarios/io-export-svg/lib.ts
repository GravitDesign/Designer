/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
import type { ParityHandle } from "../../support/scenario.ts";

/**
 * In-page helpers for the io-export-svg scenarios. `makeSvgLib` is sent to
 * the page as source text (see `inPageWithSvgLib`), so it must not use
 * anything outside its own body. It uses only the G namespace and
 * app.svgExport (contract.ts), so it runs unchanged in both apps.
 *
 * Scenes live in a workspace of their own whose font manager knows the
 * Open Sans and Noto fonts the app ships in assets/font, resolved
 * synchronously from bytes fetched once per page, so text lays out with
 * the same fonts in both apps and nothing waits for a download. Every
 * other family fails and falls back to the default font (Open Sans 400).
 */
export function makeSvgLib(p: ParityHandle) {
  const G = p.G as any;
  const app = p.app as any;
  const io = app.svgExport;
  const w = window as any;

  const FONT_FILES: [string, string, number, string][] = [
    ["Open Sans", "N", 400, "OpenSans-Regular.ttf"],
    ["Open Sans", "I", 400, "OpenSans-Italic.ttf"],
    ["Open Sans", "N", 300, "OpenSans-Light.ttf"],
    ["Open Sans", "I", 300, "OpenSans-LightItalic.ttf"],
    ["Open Sans", "N", 600, "OpenSans-SemiBold.ttf"],
    ["Open Sans", "I", 600, "OpenSans-SemiBoldItalic.ttf"],
    ["Open Sans", "N", 700, "OpenSans-Bold.ttf"],
    ["Open Sans", "I", 700, "OpenSans-BoldItalic.ttf"],
    ["Open Sans", "N", 800, "OpenSans-ExtraBold.ttf"],
    ["Open Sans", "I", 800, "OpenSans-ExtraBoldItalic.ttf"],
    ["Noto Sans Hebrew", "N", 400, "noto/NotoSansHebrew-Regular.ttf"],
    ["Noto Sans Hebrew", "N", 700, "noto/NotoSansHebrew-Bold.ttf"],
    ["Noto Sans Arabic", "N", 400, "noto/NotoSansArabic-Regular.ttf"],
    ["Noto Sans Arabic", "N", 700, "noto/NotoSansArabic-Bold.ttf"],
  ];

  /** The font files' bytes, fetched once per page. */
  const fontBytes = async (): Promise<ArrayBuffer[]> => {
    if (!w.__svgExportFontBytes) {
      w.__svgExportFontBytes = await Promise.all(
        FONT_FILES.map(async (f) => (await fetch("assets/font/" + f[3])).arrayBuffer()),
      );
    }
    return w.__svgExportFontBytes;
  };

  /** A workspace whose font manager resolves the shipped fonts synchronously. */
  const newWorkspace = async () => {
    const bytes = await fontBytes();
    const workspace = new G.GWorkspace();
    const fm = workspace.getFontManager();
    const font = (i: number) => {
      const f = FONT_FILES[i] as [string, string, number, string];
      return G.GOpenTypeFont.create(f[0], f[1], f[2], bytes[i]);
    };
    fm.setDefaultFont(font(0));
    fm.addEventListener(
      G.GFontManager.QueryFontFamilyEvent,
      (e: { family: string; callback(fonts: unknown[]): void }) => {
        const list = FONT_FILES.filter((f) => f[0] === e.family).map((f) => ({
          family: f[0],
          style: f[1],
          weight: f[2],
        }));
        if (list.length) e.callback(list);
      },
    );
    fm.addEventListener(
      G.GFontManager.ResolveFontEvent,
      (e: {
        family: string;
        style: string;
        weight: number;
        resolved(f: unknown): void;
        failed(): void;
      }) => {
        const i = FONT_FILES.findIndex(
          (f) => f[0] === e.family && f[1] === e.style && f[2] === e.weight,
        );
        if (i >= 0) e.resolved(font(i));
        else e.failed();
      },
    );
    return workspace;
  };

  /**
   * A scene like GDesigner.newInfiniteDocument's (white page without a
   * size), with the page shadow area and annotations lists an open
   * document in the old app has.
   */
  const newScene = (workspace: any) => {
    const scene = new G.GScene(workspace);
    const page = scene.getActivePage();
    page.setProperties(["bck", "w", "h"], [G.GRGBColor.WHITE, 0, 0]);
    scene.setShadowExpandArea(9, 9, 9, 11);
    scene.getAnnotations();
    return { scene, page };
  };

  /** GNode.deserializeAsync into `workspace`, as GDocument loads a file. */
  const loadScene = (json: string, workspace: any): Promise<any> =>
    new Promise((resolve, reject) => {
      try {
        G.GNode.deserializeAsync(json, workspace, null, null, (scene: any) => {
          if (scene) scene.getAnnotations();
          resolve(scene);
        });
      } catch (e) {
        reject(e);
      }
    });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

  /** Every image and texture pattern under root has finished loading. */
  const assetsReady = (root: any): boolean => {
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
        for (let l = node.getPaintLayers().getFirstChild(); l; l = l.getNext()) {
          pattern(l.getProperty("_pt"));
        }
      }
      if (typeof node.hasProperty === "function" && node.hasProperty("bck")) {
        pattern(node.getProperty("bck"));
      }
      if (typeof node.getFirstChild === "function") {
        for (let c = node.getFirstChild(); c; c = c.getNext()) visit(c);
      }
    };
    visit(root);
    return ready;
  };

  /** Waits until assets have loaded and no font is pending, for five frames in a row. */
  const settle = async (scene: any) => {
    const fm = scene.getWorkspace().getFontManager();
    const start = Date.now();
    let quiet = 0;
    while (quiet < 5) {
      if (Date.now() - start > 30000) throw new Error("svg export settle timed out");
      quiet = assetsReady(scene) && !fm.hasPendingFonts() ? quiet + 1 : 0;
      await frame();
      await sleep(10);
    }
  };

  /** The export dialog's default settings for SVG (FMT-EXPORT-022). */
  const dialogDefaults = (element: any): Record<string, any> => ({
    size: "1x",
    suffix: "",
    format: "svg",
    jpegQuality: 92,
    backgroundColor: null,
    backgroundOpacity: 1,
    colorSpace: undefined,
    configuration: {
      ignoreEffects: false,
      forceEffectsWhenZoomed: true,
      sceneBackground: true,
      isOutline: () => false,
    },
    convertTextToPath: false,
    decimalPlacesPrecision: 3,
    preserveEditingCapabilities: false,
    layerNamesAsId: false,
    overrideBackground: false,
    downsampleImages: false,
    element,
  });

  /** The options GExporter.exportExportable passes GSVGExport.export for an exportable. */
  const exporterOptions = (ex: Record<string, any>) => ({
    convertTextToPath: ex.convertTextToPath,
    decimalPlacesPrecision: ex.decimalPlacesPrecision,
    preserveEditingCapabilities: ex.preserveEditingCapabilities,
    backgroundColor: ex.backgroundColor,
    backgroundOpacity: ex.backgroundOpacity,
    sceneBackground: !ex.configuration || ex.configuration.sceneBackground || !!ex.backgroundColor,
    layerNamesAsId: ex.layerNamesAsId,
  });

  /** Exports with the text meter on the scene's font manager. */
  const exportNode = (scene: any, node: any, options: Record<string, unknown> | null) =>
    io.withTextMeter(scene.getWorkspace().getFontManager(), () => io.export(node, options));

  const pat = (s: string) => G.GPattern.deserialize(s);

  const fill = (el: any, pattern: string) => {
    const l = new G.GStylable.FillPaintLayer();
    l.setProperty("_pt", pat(pattern));
    el.getPaintLayers().appendChild(l);
  };
  const border = (el: any, pattern: string, width: number) => {
    const l = new G.GStylable.BorderPaintLayer();
    l.setProperties(["_pt", "_bw"], [pat(pattern), width]);
    el.getPaintLayers().appendChild(l);
  };

  /** page-lib.ts's shape(), without the editor. */
  const shape = (
    type: "rectangle" | "ellipse",
    x: number,
    y: number,
    wd: number,
    h: number,
    o: Record<string, any> = {},
  ) => {
    const el = type === "rectangle" ? new G.GRectangle() : new G.GEllipse();
    let trf = new G.GTransform(wd / 2, 0, 0, h / 2, x + wd / 2, y + h / 2);
    if (o.rotate) {
      trf = trf
        .translated(-(x + wd / 2), -(y + h / 2))
        .rotated(o.rotate * (Math.PI / 180))
        .translated(x + wd / 2, y + h / 2);
    }
    el.setProperty("trf", trf);
    if (o.corner) el.setProperty("tl_sx", o.corner);
    for (const f of o.fills ?? (o.fill ? [o.fill] : [])) fill(el, f);
    if (o.border) border(el, o.border, o.bw ?? 1);
    if (o.opacity !== undefined) el.setProperty("_stop", o.opacity);
    if (o.name) el.setProperty("name", o.name);
    for (const e of o.effects ?? []) {
      const fx = new G[e.type]();
      const names = Object.keys(e.props);
      fx.setProperties(
        names,
        names.map((n) =>
          typeof e.props[n] === "string" && /#/.test(e.props[n]) ? pat(e.props[n]) : e.props[n],
        ),
      );
      el.getEffects().appendChild(fx);
    }
    return el;
  };

  const text = (x: number, y: number, content: string, o: Record<string, any> = {}) => {
    const t = new G.GText();
    t.setText(content);
    t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
    t.setProperties(["_tff", "_tfi"], [o.family ?? "Open Sans", o.size ?? 20]);
    for (const f of o.fills ?? ["C#[20,20,20]"]) fill(t, f);
    if (o.name) t.setProperty("name", o.name);
    return t;
  };

  const image = (
    x: number,
    y: number,
    wd: number,
    h: number,
    iw: number,
    ih: number,
    url: string,
    name: string,
  ) => {
    const im = new G.GImage();
    im.setProperties(["iw", "ih", "url"], [iw, ih, url]);
    im.transform(new G.GTransform(wd / iw, 0, 0, h / ih, x, y));
    im.setProperty("name", name);
    return im;
  };

  const setupPage = (page: any, wd: number, h: number, bck: string, name: string) =>
    page.setProperties(["w", "h", "bck", "name"], [wd, h, pat(bck), name]);

  /**
   * The test documents of the export matrix (page-lib.ts build()), built
   * on a fresh scene's page with appendChild instead of the editor.
   * Returns the created elements by lower-case name.
   */
  const build = async (name: string, data: Record<string, string>) => {
    const workspace = await newWorkspace();
    const { scene, page } = newScene(workspace);
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
        out.title = text(16, 16, "Gravit Export", { size: 30, name: "Title" });
        out.multi = text(16, 70, "Two fills", {
          size: 22,
          fills: ["C#[200,30,30]", "C#[30,30,200]"],
          name: "Multi",
        });
        add([out.title, out.multi]);
        await settle(scene);
        out.title.setProperties(["aw", "ah", "w", "h"], [false, false, 240, 44]);
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
      default:
        throw new Error("unknown test document " + name);
    }
    await settle(scene);
    return out;
  };

  return {
    G,
    app,
    io,
    newWorkspace,
    newScene,
    loadScene,
    settle,
    dialogDefaults,
    exporterOptions,
    exportNode,
    pat,
    build,
  };
}

export type SvgLib = ReturnType<typeof makeSvgLib>;

/**
 * Wraps an in-page scenario function so it receives the lib as its third
 * argument; the runner sends `toString()` of the wrapper to the page.
 */
export function inPageWithSvgLib<A>(
  fn: (p: ParityHandle, args: A, L: SvgLib) => unknown,
): (p: ParityHandle, args: A) => unknown {
  const source = `(p, a) => (${fn.toString()})(p, a, (${makeSvgLib.toString()})(p))`;
  const wrapper = (): never => {
    throw new Error("in-page scenario functions only run in the page");
  };
  wrapper.toString = () => source;
  return wrapper;
}
