/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
import type { ParityHandle } from "../../support/scenario.ts";
import { normalizePdfString } from "./pdf-normalize.ts";
import { normalizeRandomTokens, svgGraphicSource } from "./normalize-ids.ts";

/**
 * In-page helpers for the import/export scenarios. `makePageLib` is sent to
 * the page as source text (see `inPageWithLib`), so it must not use
 * anything outside its own body. It only uses the G namespace and the
 * documented app hooks (app.importExport from contract.ts), so it runs
 * unchanged in both apps.
 */
export function makePageLib(
  p: ParityHandle,
  extras: {
    normalizePdf: (s: string) => string;
    normalizeTokens: (s: string) => string;
    svgGraphicSource: (s: string) => { start: number; end: number; b64: string } | null;
  },
) {
  const G = p.G;
  const app = p.app;
  const io = app.importExport;

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

  interface ShapeOptions {
    fill?: string;
    fills?: string[];
    border?: string;
    bw?: number;
    opacity?: number;
    rotate?: number;
    name?: string;
    corner?: number;
    exports?: { sz: string; sf: string; fm: string }[];
    effects?: { type: string; props: Record<string, any> }[];
  }

  /** A rectangle or ellipse with paint layers, effects and export rows. */
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
    for (const f of o.fills ?? (o.fill ? [o.fill] : [])) fill(el, f);
    if (o.border) border(el, o.border, o.bw ?? 1);
    if (o.opacity !== undefined) el.setProperty("_stop", o.opacity);
    if (o.name) el.setProperty("name", o.name);
    // "__export" is a custom property (third argument true), as the Export panel sets it.
    if (o.exports) el.setProperty("__export", o.exports, true);
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

  /** A text with one run; several fills make the exporters outline it. */
  const text = (
    x: number,
    y: number,
    content: string,
    o: {
      size?: number;
      family?: string;
      weight?: number;
      fills?: string[];
      name?: string;
      box?: [number, number];
    } = {},
  ) => {
    const t = new G.GText();
    t.setText(content);
    t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
    const ff = o.family ?? "Open Sans";
    t.setProperties(["_tff", "_tfi"], [ff, o.size ?? 20]);
    if (o.weight) t.setProperty("_tfw", o.weight);
    if (o.box) t.__parityBox = o.box;
    for (const f of o.fills ?? ["C#[20,20,20]"]) fill(t, f);
    if (o.name) t.setProperty("name", o.name);
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

  const insert = (els: any[]) => app.editor().insertElements(els, true);

  /**
   * Builds one of the named test documents on the fresh document's page.
   * Returns the created elements by name.
   */
  const build = async (name: string, data: Record<string, string> = {}) => {
    const scene = app.scene();
    const page = scene.getActivePage();
    const out: Record<string, any> = { page, scene };
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
        insert([out.box, out.oval, out.tilted, out.corner]);
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
        insert([out.title, out.multi]);
        // A fixed text box, set once the font has loaded. An auto-sized text
        // is fitted when its font arrives; until then it keeps its default
        // 142 x 27.2 box, and the exporters use whichever box the text has
        // at that moment (old-app race, seen as a clipped "Gravit Ex" in
        // pdf/text.render and a different clip rect in svg/text).
        await io.settle();
        for (const t of [out.title, out.multi]) {
          if (t.__parityBox)
            t.setProperties(
              ["aw", "ah", "w", "h"],
              [false, false, t.__parityBox[0], t.__parityBox[1]],
            );
        }
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
        insert([out.shadow, out.blurred, out.inner, out.sepia, out.angular]);
        break;
      }
      case "image": {
        setupPage(page, 240, 160, "C#[255,255,255]", "Pictures");
        out.png = image(10, 10, 128, 96, 64, 48, data.png ?? "", "Alpha PNG");
        out.jpg = image(140, 60, 90, 68, 80, 60, data.jpg ?? "", "Photo");
        insert([out.png, out.jpg]);
        break;
      }
      case "multipage": {
        setupPage(page, 200, 100, "C#[255,255,255]", "Cover");
        out.a = shape("rectangle", 20, 20, 160, 60, { fill: "C#[200,0,0]", name: "Red" });
        insert([out.a]);
        const p2 = new G.GPage();
        setupPage(p2, 150, 150, "C#[230,240,255]", "Second");
        scene.appendChild(p2);
        out.page2 = p2;
        const b = shape("ellipse", 25, 25, 100, 100, { fill: "C#[0,120,0]", name: "Green" });
        p2.appendChild(b);
        // data.hidden === "no" leaves out the hidden page: the old app
        // refuses to export or save any document with a hidden page, since
        // a hidden page has no geometry bbox and counts as an empty
        // infinite canvas (see ui/hidden-page-blocks-export).
        if (data.hidden === "no") break;
        const p3 = new G.GPage();
        setupPage(p3, 100, 100, "C#[0,0,0]", "Hidden");
        p3.setProperty("vis", false);
        scene.appendChild(p3);
        // A page without content counts as an empty infinite canvas, which
        // blocks every export (ADD-STORAGE-001).
        p3.appendChild(
          shape("rectangle", 10, 10, 50, 50, { fill: "C#[255,255,255]", name: "White" }),
        );
        out.page3 = p3;
        break;
      }
      default:
        throw new Error("unknown test document " + name);
    }
    await io.settle();
    await io.settle();
    return out;
  };

  /**
   * Exports through the export dialog's code path; returns the output as
   * base64.
   */
  const exportB64 = async (exportable: any) => {
    const blob = await io.exportExportable(exportable);
    if (!blob) return { mime: null, size: 0, b64: "" };
    return { mime: blob.type, size: blob.size, b64: await io.blobToBase64(blob) };
  };

  /** Decodes PNG/JPEG bytes with the browser and re-encodes the pixels as PNG. */
  const decodeToPng = async (b64: string, mime: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes], { type: mime }), {
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bmp, 0, 0);
    return c.toDataURL("image/png");
  };

  /** Renders a node through the engine at 1x on white (the scenario's render). */
  const render = (node: any, scale = 1) =>
    node.toBitmap(scale, scale, 0, G.GRGBColor.WHITE).toImageDataUrl("image/png");

  /** The dialog's default export settings for one format (FMT-EXPORT-022). */
  const dialogDefaults = (format: string, scenePage: any) => ({
    size: "1x",
    suffix: "",
    format,
    jpegQuality: 92,
    backgroundColor: format === "jpg" ? G.GRGBColor.WHITE : null,
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
    element: scenePage,
  });

  /**
   * What the user sees of the active document as JSON: the active page's
   * children (node, name, bbox, fill/border patterns, text), the selection,
   * the top undo step and the open documents.
   */
  const sceneState = () => {
    const page = app.scene().getActivePage();
    const editor = app.editor();
    const round = (v: number) => Math.round(v * 1000) / 1000;
    const describe = (n: any): any => {
      const b = n.getGeometryBBox ? n.getGeometryBBox() : null;
      const out: Record<string, any> = {
        node: n.getNodeName(),
        name: n.getProperty("name") ?? null,
        bbox: b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()].map(round) : null,
      };
      if (n.getPaintLayers && n.getPaintLayers()) {
        out.layers = n
          .getPaintLayers()
          .getChildren()
          .map(
            (l: any) =>
              l.getNodeName() +
              ":" +
              (l.getProperty("_pt") ? G.GPattern.serialize(l.getProperty("_pt")) : ""),
          );
      }
      if (n instanceof G.GText) out.text = n.getPlainText();
      if (n.getFirstChild && !(n instanceof G.GText) && n.getChildren().length) {
        out.children = n
          .getChildren()
          .filter((c: any) => c instanceof G.GElement)
          .map(describe);
      }
      return out;
    };
    return {
      documents: app.designer.getDocuments().map((d: any) => d.getTitle()),
      active: app.document().getTitle(),
      page: page.getProperty("name"),
      children: page
        .getChildren()
        .filter((n: any) => n instanceof G.GElement)
        .map(describe),
      selection: app
        .selection()
        .map((n: any) => n.getNodeName() + ":" + (n.getProperty("name") ?? "")),
      undo: editor.hasUndoState() ? editor.getUndoStateName() : null,
    };
  };

  /** Normalizes a base64 PDF the way pdf-normalize.ts describes. */
  const normalizePdfB64 = (b64: string) => btoa(extras.normalizePdf(atob(b64)));

  /** Random ids renamed (see normalize-ids.ts). */
  const normalizeTokens = (text: string) => extras.normalizeTokens(text);

  /**
   * An exported SVG made comparable: the zlib editing data of
   * gravitGraphicSource is inflated in place ("inflated:" + JSON) and every
   * random id is renamed (see normalize-ids.ts).
   */
  const normalizeSvg = async (svg: string) => {
    const src = extras.svgGraphicSource(svg);
    let out = svg;
    if (src) {
      const text = new TextDecoder().decode(Uint8Array.from(atob(src.b64), (c) => c.charCodeAt(0)));
      const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      const json = await new Response(stream).text();
      out = svg.slice(0, src.start) + "inflated:" + json + svg.slice(src.end);
    }
    return extras.normalizeTokens(out);
  };

  /** base64 bytes as UTF-8 text. */
  const utf8 = (b64: string) =>
    new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

  return {
    utf8,
    normalizeTokens,
    normalizeSvg,
    sceneState,
    normalizePdfB64,
    G,
    app,
    io,
    pat,
    fill,
    border,
    shape,
    text,
    image,
    setupPage,
    insert,
    build,
    exportB64,
    decodeToPng,
    render,
    dialogDefaults,
  };
}

export type PageLib = ReturnType<typeof makePageLib>;

/**
 * Wraps an in-page scenario function so it receives the page lib as its
 * third argument. Same trick as engine-model/helpers.ts: the runner sends
 * `toString()` of the function to the page.
 */
export function inPageWithLib<A>(
  fn: (p: ParityHandle, args: A, L: PageLib) => unknown,
): (p: ParityHandle, args: A) => unknown {
  const source = `(p, a) => (${fn.toString()})(p, a, (${makePageLib.toString()})(p, { normalizePdf: (${normalizePdfString.toString()}), normalizeTokens: (${normalizeRandomTokens.toString()}), svgGraphicSource: (${svgGraphicSource.toString()}) }))`;
  const wrapper = (): never => {
    throw new Error("in-page scenario functions only run in the page");
  };
  wrapper.toString = () => source;
  return wrapper;
}
