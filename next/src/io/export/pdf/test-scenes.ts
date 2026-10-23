/* eslint-disable @typescript-eslint/no-explicit-any -- builds scenes through the untyped G namespace, so the same source runs in the old app */
/**
 * Test documents for the PDF exporter's recorded tests. `buildPdfTestScene`
 * only uses its arguments (the engine namespace under the old G names),
 * so its source text also runs in the old app, where the expected bytes
 * in pdf-export.old-outputs.json were recorded with GPDFExport (old
 * chunk.vendor.js module 1406) on the same documents.
 */

export interface PdfTestCase {
  id: string;
  doc: "shapes" | "borders" | "multipage";
  /** "page", "pages" (every visible page) or a node built under that name. */
  target: string;
  /** Export options over the export dialog's defaults. */
  options: Record<string, unknown>;
  background?: { color: string; opacity: number };
  pageProps?: Record<string, unknown>;
}

export const PDF_TEST_CASES: PdfTestCase[] = [
  { id: "shapes-72dpi", doc: "shapes", target: "page", options: { dpi: 72 } },
  { id: "shapes-cmyk", doc: "shapes", target: "page", options: { dpi: 72, colorSpace: "cmyk" } },
  {
    id: "shapes-bleed",
    doc: "shapes",
    target: "page",
    options: { dpi: 72 },
    pageProps: { bl: 12 },
  },
  {
    id: "oval-background-96dpi",
    doc: "shapes",
    target: "oval",
    options: { dpi: 96, configuration: { sceneBackground: false } },
    background: { color: "C#[255,255,0]", opacity: 1 },
  },
  { id: "shapes-element", doc: "shapes", target: "tilted", options: { dpi: 300 } },
  { id: "multipage", doc: "multipage", target: "pages", options: { dpi: 72 } },
  { id: "multipage-scene", doc: "multipage", target: "scene", options: { dpi: 72 } },
  { id: "borders", doc: "borders", target: "page", options: { dpi: 72 } },
  { id: "borders-cmyk", doc: "borders", target: "page", options: { dpi: 72, colorSpace: "cmyk" } },
];

/**
 * Builds a test document on the scene's first page (one new layer per
 * page) and returns the nodes by name, with `page` and `scene`.
 */
export function buildPdfTestScene(G: any, scene: any, name: string): Record<string, any> {
  const pat = (s: string) => G.GPattern.deserialize(s);
  const fill = (el: any, pattern: string) => {
    const layer = new G.GStylable.FillPaintLayer();
    layer.setProperty("_pt", pat(pattern));
    el.getPaintLayers().appendChild(layer);
  };
  const border = (el: any, pattern: string, width: number, props?: Record<string, unknown>) => {
    const layer = new G.GStylable.BorderPaintLayer();
    layer.setProperties(["_pt", "_bw"], [pat(pattern), width]);
    if (props) layer.setProperties(Object.keys(props), Object.values(props));
    el.getPaintLayers().appendChild(layer);
  };
  const shape = (type: string, x: number, y: number, w: number, h: number, o: any = {}) => {
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
    if (o.border) border(el, o.border, o.bw ?? 1, o.borderProps);
    if (o.opacity !== undefined) el.setProperty("_stop", o.opacity);
    if (o.blend) el.setProperty("_sbl", o.blend);
    return el;
  };
  const setupPage = (page: any, w: number, h: number, bck: string | null, pageName: string) => {
    page.setProperties(["w", "h", "bck", "name"], [w, h, bck ? pat(bck) : null, pageName]);
  };
  const layerOf = (page: any) => {
    const layer = new G.GLayer();
    page.appendChild(layer);
    return layer;
  };
  const page = scene.getActivePage();
  const out: Record<string, any> = { page, scene };
  switch (name) {
    case "shapes": {
      setupPage(page, 320, 200, "C#[255,255,255]", "Artboard");
      const layer = layerOf(page);
      out.box = shape("rectangle", 20, 20, 120, 80, {
        fill: "C#[220,40,40]",
        border: "C#[0,0,0]",
        bw: 4,
      });
      out.oval = shape("ellipse", 170, 30, 130, 90, {
        fill: 'L#{"fx":0,"x":[{"p":0,"c":"C#[255,200,0]","o":1},{"p":1,"c":"C#[0,90,200]","o":1}]}',
      });
      out.tilted = shape("rectangle", 60, 120, 140, 50, {
        fill: 'R#{"s":0.5,"fx":0.3,"fy":0.3,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[40,140,60]","o":1}]}',
        border: "C#[40,40,120]",
        bw: 2,
        opacity: 0.7,
        rotate: 15,
      });
      out.corner = shape("rectangle", 230, 140, 70, 45, { fill: "C#[120,60,180]", corner: 12 });
      for (const key of ["box", "oval", "tilted", "corner"]) layer.appendChild(out[key]);
      break;
    }
    case "borders": {
      setupPage(page, 300, 200, "C#[250,250,250]", "Borders");
      const layer = layerOf(page);
      const nodes = [
        shape("rectangle", 20, 20, 80, 60, {
          fill: "C#[200,220,255]",
          border: "C#[0,0,200]",
          bw: 6,
          borderProps: { _ba: "I" },
        }),
        shape("ellipse", 120, 20, 80, 60, {
          fill: "C#[255,220,200]",
          border: "C#[200,0,0]",
          bw: 6,
          borderProps: { _ba: "O" },
        }),
        shape("rectangle", 220, 20, 60, 60, {
          border: "C#[0,120,0]",
          bw: 3,
          borderProps: { _bds: [4, 2], _blc: "round", _blj: "round" },
        }),
        shape("rectangle", 20, 110, 80, 60, {
          fill: 'L#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":0.2},{"p":1,"c":"C#[0,0,255]","o":1}]}',
        }),
        shape("ellipse", 120, 110, 80, 60, { fill: "C#[0,0,0]", opacity: 0.5, blend: "multiply" }),
        shape("rectangle", 220, 110, 60, 60, {
          fills: ["C#[255,255,0]", "C#[0,255,255]"],
          border: "C#[0,0,0]",
          bw: 1,
        }),
        shape("rectangle", 140, 175, 120, 20, {
          fill: "Y#[0.1,0.9,0.2,0.05]",
          border: "C#[0,0,0]",
          bw: 2,
          borderProps: { _bds: [0, 0] },
        }),
      ];
      for (const node of nodes) layer.appendChild(node);
      break;
    }
    case "multipage": {
      setupPage(page, 200, 100, "C#[255,255,255]", "Cover");
      layerOf(page).appendChild(shape("rectangle", 20, 20, 160, 60, { fill: "C#[200,0,0]" }));
      const second = new G.GPage();
      setupPage(second, 150, 150, "C#[230,240,255]", "Second");
      scene.appendChild(second);
      layerOf(second).appendChild(shape("ellipse", 25, 25, 100, 100, { fill: "C#[0,120,0]" }));
      out.page2 = second;
      break;
    }
    default:
      throw new Error("unknown test document " + name);
  }
  return out;
}

/**
 * The element to export and the options the export dialog would pass
 * (old GExporter.exportExportable for "pdf", user "Test", title
 * "Export Test").
 */
export function pdfTestExport(
  G: any,
  built: Record<string, any>,
  testCase: PdfTestCase,
): { element: any; options: Record<string, any> } {
  const page = built.page;
  if (testCase.pageProps) {
    const names = Object.keys(testCase.pageProps);
    page.setProperties(
      names,
      names.map((n) => (testCase.pageProps as Record<string, unknown>)[n]),
    );
  }
  let element: any;
  if (testCase.target === "page") element = page;
  else if (testCase.target === "scene") element = built.scene;
  else if (testCase.target === "pages")
    element = built.scene.getChildren().filter((n: any) => n instanceof G.GPage && n.isVisible());
  else element = built[testCase.target];
  const options: Record<string, any> = {
    jpegQuality: 92,
    configuration: {
      ignoreEffects: false,
      forceEffectsWhenZoomed: true,
      sceneBackground: true,
      isOutline: () => false,
    },
    backgroundColor: null,
    backgroundOpacity: 1,
    convertTextToPath: false,
    user: "Test",
    title: "Export Test",
    downsampleImages: false,
    disableWorker: true,
  };
  for (const [key, value] of Object.entries(testCase.options)) {
    if (key === "configuration") Object.assign(options.configuration, value);
    else options[key] = value;
  }
  if (testCase.background) {
    options.backgroundColor = G.GPattern.deserialize(testCase.background.color);
    options.backgroundOpacity = testCase.background.opacity;
  }
  return { element, options };
}
