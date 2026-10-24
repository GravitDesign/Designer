// Test support: SVG export cases. The same function runs in the old app's
// page against GSVGExport (chunk.vendor.js module 1455), to record
// svg-export-cases.json (the TypeScript types are stripped first), and in
// svg-export.test.ts against the port. So it may only use what it is
// given and no imports.
//
// Every case builds a small document, exports it and returns the SVG text
// normalized: random ids (clip paths, masks, filters, results, patterns,
// gradients, the editing data's node ids) are renamed in order of
// appearance, the editing data is inflated, and data URLs are replaced by
// their media type (raster fallbacks are browser pixels; Node has none).
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface SvgExportLib {
  /** The G namespace classes by their old names (GRectangle, GTransform, ...). */
  G: Record<string, any>;
  /** GSVGExport. */
  SVGExport: any;
  /** A fresh scene (with fonts resolved) and its first page. */
  newScene(): { scene: any; page: any };
  /** The export compatibility checks (old module 1235). */
  ExportCompat: any;
  /** GUtil.decompressString. */
  decompress(text: string): string;
}

export interface SvgCaseResult {
  svg?: string;
  error?: string;
  [key: string]: unknown;
}

export function normalizeSvgOutput(svg: string, decompress: (text: string) => string): string {
  let out = svg;
  const names = new Map<string, string>();
  const rename = (kind: string, token: string) => {
    const key = kind + ":" + token;
    if (!names.has(key)) names.set(key, kind + "#" + (names.size + 1));
    return names.get(key) as string;
  };
  const source = /(<gravitDesigner:gravitGraphicSource[^>]*><!\[CDATA\[)([^\]]*)(\]\]>)/.exec(out);
  if (source) {
    let json = decompress(source[2] as string);
    // The node ids of the editing data, renamed wherever they appear.
    const ids: string[] = [];
    const collect = (value: any): void => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") {
        for (const key of Object.keys(value)) {
          const v = value[key];
          if (["@id", "#", "&", "_effId", "_layId"].includes(key) && typeof v === "string") {
            if (!ids.includes(v)) ids.push(v);
          } else collect(v);
        }
      }
    };
    collect(JSON.parse(json));
    for (const id of ids) {
      json = json.split('"' + id + '"').join('"' + rename("node", id) + '"');
    }
    out = out.replace(source[2] as string, () => "inflated:" + json);
  }
  out = out.replace(/data:([a-z]+\/[a-z0-9.+-]+)[^"]*/g, "data:$1,<data>");
  out = out.replace(/_(lgradient|rgradient)_(\d+)/g, (_m, kind: string, n: string) =>
    rename(kind, n),
  );
  out = out.replace(/_pattern_([A-Za-z0-9]{3})(?![A-Za-z0-9])/g, (_m, t: string) =>
    rename("pattern", t),
  );
  out = out.replace(/_mask_filter_([A-Za-z0-9]{8})(?![A-Za-z0-9])/g, (_m, t: string) =>
    rename("maskfilter", t),
  );
  out = out.replace(/(?<![A-Za-z0-9])([A-Za-z0-9]{32})(?![A-Za-z0-9])/g, (_m, t: string) =>
    rename("id", t),
  );
  return out;
}

type Lib = SvgExportLib;

const pat = (lib: Lib, text: string) => lib.G.GPattern.deserialize(text);

function fill(lib: Lib, element: any, pattern: string, opacity?: number) {
  const layer = new lib.G.GStylable.FillPaintLayer();
  layer.setProperty("_pt", pat(lib, pattern));
  if (opacity !== undefined) layer.setProperty("_op", opacity);
  element.getPaintLayers().appendChild(layer);
  return layer;
}

function border(
  lib: Lib,
  element: any,
  pattern: string,
  width: number,
  props: Record<string, unknown> = {},
) {
  const layer = new lib.G.GStylable.BorderPaintLayer();
  layer.setProperties(["_pt", "_bw"], [pat(lib, pattern), width]);
  const names = Object.keys(props);
  if (names.length)
    layer.setProperties(
      names,
      names.map((n) => props[n]),
    );
  element.getPaintLayers().appendChild(layer);
  return layer;
}

interface ShapeOptions {
  fills?: string[];
  border?: string;
  bw?: number;
  borderProps?: Record<string, unknown>;
  borders?: [string, number, Record<string, unknown>?][];
  opacity?: number;
  rotate?: number;
  name?: string;
  noTrf?: boolean;
  props?: Record<string, unknown>;
  effects?: { type: string; props: Record<string, unknown> }[];
}

function shape(
  lib: Lib,
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  o: ShapeOptions = {},
) {
  const G = lib.G;
  const element = new G[type]();
  let trf = o.noTrf ? null : new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2);
  if (o.rotate) {
    trf = trf
      .translated(-(x + w / 2), -(y + h / 2))
      .rotated(o.rotate * (Math.PI / 180))
      .translated(x + w / 2, y + h / 2);
  }
  if (trf) element.setProperty("trf", trf);
  const props = o.props || {};
  const names = Object.keys(props);
  if (names.length)
    element.setProperties(
      names,
      names.map((n) => props[n]),
    );
  for (const f of o.fills || []) fill(lib, element, f);
  if (o.border) border(lib, element, o.border, o.bw || 1, o.borderProps);
  for (const b of o.borders || []) border(lib, element, b[0], b[1], b[2]);
  if (o.opacity !== undefined) element.setProperty("_stop", o.opacity);
  if (o.name) element.setProperty("name", o.name);
  for (const e of o.effects || []) {
    const effect = new G[e.type]();
    const keys = Object.keys(e.props);
    effect.setProperties(
      keys,
      keys.map((k) =>
        typeof e.props[k] === "string" && /#/.test(e.props[k] as string)
          ? pat(lib, e.props[k] as string)
          : e.props[k],
      ),
    );
    element.getEffects().appendChild(effect);
  }
  return element;
}

function path(lib: Lib, points: [number, number][], closed: boolean, o: ShapeOptions = {}) {
  const G = lib.G;
  const element = new G.GPath();
  const anchors = element.getAnchorPoints();
  for (const [x, y] of points) {
    const anchor = new G.GPathBase.AnchorPoint();
    anchor.setProperties(["x", "y"], [x, y]);
    anchors.appendChild(anchor);
  }
  element.setProperty("closed", closed);
  for (const f of o.fills || []) fill(lib, element, f);
  if (o.border) border(lib, element, o.border, o.bw || 1, o.borderProps);
  if (o.name) element.setProperty("name", o.name);
  const props = o.props || {};
  const names = Object.keys(props);
  if (names.length)
    element.setProperties(
      names,
      names.map((n) => props[n]),
    );
  return element;
}

function text(lib: Lib, x: number, y: number, content: string, o: Record<string, any> = {}) {
  const G = lib.G;
  const t = new G.GText();
  t.setText(content);
  t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
  t.setProperties(["_tff", "_tfi"], [o.family || "Open Sans", o.size || 20]);
  if (o.weight) t.setProperty("_tfw", o.weight);
  for (const f of o.fills || ["C#[20,20,20]"]) fill(lib, t, f);
  if (o.border) border(lib, t, o.border, o.bw || 1);
  if (o.name) t.setProperty("name", o.name);
  const props = o.props || {};
  const names = Object.keys(props);
  if (names.length)
    t.setProperties(
      names,
      names.map((n) => props[n]),
    );
  return t;
}

/** The page children that are elements (the first child is the annotations list). */
function elements(lib: Lib, parent: any): any[] {
  return parent.getChildren().filter((n: any) => n instanceof lib.G.GElement);
}

function page(lib: Lib, w: number, h: number, bck: string | null) {
  const made = lib.newScene();
  made.page.setProperties(["w", "h", "bck", "name"], [w, h, bck ? pat(lib, bck) : null, "Page"]);
  return made;
}

/** Exports synchronously (the exporter calls back before returning) and normalizes. */
function run(lib: Lib, node: any, options: Record<string, unknown> | null): SvgCaseResult {
  let result: SvgCaseResult = { error: "no callback" };
  try {
    lib.SVGExport.export(node, options, (error: unknown, svg: string) => {
      result = error ? { error: String(error) } : { svg: normalizeSvgOutput(svg, lib.decompress) };
    });
  } catch (e) {
    result = { error: String(e && (e as Error).message ? (e as Error).message : e) };
  }
  return result;
}

const DIALOG = {
  convertTextToPath: false,
  decimalPlacesPrecision: 3,
  preserveEditingCapabilities: false,
  backgroundColor: null,
  backgroundOpacity: 1,
  sceneBackground: true,
  layerNamesAsId: false,
};

function dialog(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.assign({}, DIALOG, extra);
}

const ANGULAR = 'A#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,200,0]","o":1}]}';
const LINEAR =
  'L#{"fx":0,"x":[{"p":0,"c":"C#[255,200,0]","o":1},{"p":1,"c":"C#[0,90,200]","o":1}]}';
const RADIAL =
  'R#{"s":0.5,"fx":0.3,"fy":0.3,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[40,140,60]","o":0.5}]}';

function shapesPage(lib: Lib) {
  const made = page(lib, 320, 200, "C#[255,255,255]");
  const p = made.page;
  p.appendChild(
    shape(lib, "GRectangle", 20, 20, 120, 80, {
      fills: ["C#[220,40,40]"],
      border: "C#[0,0,0]",
      bw: 4,
      name: "Box",
    }),
  );
  p.appendChild(shape(lib, "GEllipse", 170, 30, 130, 90, { fills: [LINEAR], name: "Oval" }));
  p.appendChild(
    shape(lib, "GRectangle", 60, 120, 140, 50, {
      fills: [RADIAL],
      border: "C#[40,40,120]",
      bw: 2,
      opacity: 0.7,
      rotate: 15,
      name: "Tilted",
    }),
  );
  p.appendChild(
    shape(lib, "GRectangle", 230, 140, 70, 45, {
      fills: ["C#[120,60,180]"],
      props: { tl_sx: 12 },
      name: "Rounded",
    }),
  );
  return made;
}

export const SVG_EXPORT_CASES: Record<string, (lib: Lib) => SvgCaseResult> = {
  shapesPage(lib) {
    return run(lib, shapesPage(lib).page, dialog());
  },
  shapesDefaultOptions(lib) {
    return run(lib, shapesPage(lib).page, null);
  },
  decimals0(lib) {
    return run(lib, shapesPage(lib).page, dialog({ decimalPlacesPrecision: 0 }));
  },
  decimals6(lib) {
    return run(lib, shapesPage(lib).page, dialog({ decimalPlacesPrecision: 6 }));
  },
  decimalsString(lib) {
    return run(lib, shapesPage(lib).page, dialog({ decimalPlacesPrecision: "1" }));
  },
  layerNamesAsId(lib) {
    const made = shapesPage(lib);
    elements(lib, made.page)[0].setProperty("svgattrs", { "data-a": "1", class: "k" }, true);
    return run(lib, made.page, dialog({ layerNamesAsId: true }));
  },
  preserveEditing(lib) {
    return run(lib, shapesPage(lib).page, dialog({ preserveEditingCapabilities: true }));
  },
  customBackground(lib) {
    return run(
      lib,
      shapesPage(lib).page,
      dialog({ backgroundColor: pat(lib, "C#[255,240,200]"), backgroundOpacity: 0.8 }),
    );
  },
  noSceneBackground(lib) {
    return run(lib, shapesPage(lib).page, dialog({ sceneBackground: false }));
  },
  coloredPageBackground(lib) {
    const made = shapesPage(lib);
    made.page.setProperty("bck", pat(lib, "C#[10,20,30]"));
    made.page.setProperty("bop", 0.5);
    return run(lib, made.page, dialog());
  },
  selectionBox(lib) {
    const made = shapesPage(lib);
    return run(lib, elements(lib, made.page)[0], dialog({ sceneBackground: false }));
  },
  selectionTilted(lib) {
    const made = shapesPage(lib);
    return run(lib, elements(lib, made.page)[2], dialog({ sceneBackground: false }));
  },
  wholeScene(lib) {
    const made = shapesPage(lib);
    return run(lib, made.scene, dialog());
  },
  infinitePage(lib) {
    const made = lib.newScene();
    made.page.setProperties(["w", "h"], [0, 0]);
    made.page.appendChild(shape(lib, "GRectangle", 10, 15, 50, 40, { fills: ["C#[1,2,3]"] }));
    made.page.appendChild(
      shape(lib, "GEllipse", 70, 5, 30, 30, { fills: ["C#[4,5,6]"], border: "C#[7,8,9]", bw: 3 }),
    );
    return run(lib, made.scene, dialog());
  },
  circleAndPolygons(lib) {
    const made = page(lib, 300, 200, null);
    const p = made.page;
    p.appendChild(
      shape(lib, "GEllipse", 10, 10, 60, 60, {
        fills: ["C#[0,0,255]"],
        border: "C#[255,0,0]",
        bw: 3,
      }),
    );
    p.appendChild(
      shape(lib, "GEllipse", 80, 10, 60, 40, {
        fills: ["C#[0,255,0]"],
        props: { sa: 0, ea: Math.PI },
      }),
    );
    p.appendChild(shape(lib, "GEllipse", 150, 10, 60, 40, { fills: ["C#[0,255,0]"], rotate: 30 }));
    const plain = {
      pts: 6,
      cx: 40,
      cy: 130,
      or: 30,
      ir: 30 * Math.cos(Math.PI / 6),
      oa: 0,
      ia: Math.PI / 6,
    };
    p.appendChild(
      shape(lib, "GPolygon", 0, 0, 0, 0, {
        noTrf: true,
        fills: ["C#[200,100,0]"],
        border: "C#[0,0,0]",
        bw: 2,
        props: plain,
      }),
    );
    p.appendChild(
      shape(lib, "GPolygon", 0, 0, 0, 0, {
        noTrf: true,
        fills: ["C#[200,100,0]"],
        props: { pts: 5, cx: 120, cy: 130, or: 30, ir: 12, oa: 0, ia: Math.PI / 5 },
      }),
    );
    p.appendChild(
      shape(lib, "GPolygon", 0, 0, 0, 0, {
        noTrf: true,
        fills: ["C#[200,100,0]"],
        props: {
          pts: 6,
          cx: 200,
          cy: 130,
          or: 30,
          ir: 30 * Math.cos(Math.PI / 6),
          oa: 0,
          ia: Math.PI / 6,
          icr: 4,
          ocr: 4,
        },
      }),
    );
    return run(lib, p, dialog());
  },
  paths(lib) {
    const made = page(lib, 300, 200, null);
    const p = made.page;
    p.appendChild(
      path(
        lib,
        [
          [10, 10],
          [100, 60],
        ],
        false,
        { border: "C#[0,0,0]", bw: 2, name: "Line" },
      ),
    );
    p.appendChild(
      path(
        lib,
        [
          [120, 10],
          [200, 40],
          [150, 90],
        ],
        true,
        { fills: ["C#[0,128,0]"], border: "C#[0,0,128]", bw: 1.5 },
      ),
    );
    p.appendChild(
      path(
        lib,
        [
          [10, 120],
          [80, 180],
          [150, 120],
          [220, 180],
        ],
        false,
        {
          border: "C#[128,0,0]",
          bw: 3,
          borderProps: { _bds: [4], _blc: "round", _blj: "bevel", _bhm: "A", _btm: "C" },
        },
      ),
    );
    p.appendChild(
      path(
        lib,
        [
          [240, 120],
          [290, 120],
          [290, 190],
          [240, 190],
        ],
        true,
        { fills: [LINEAR], props: { evenodd: true } },
      ),
    );
    return run(lib, p, dialog());
  },
  borders(lib) {
    const made = page(lib, 400, 200, null);
    const p = made.page;
    p.appendChild(
      shape(lib, "GRectangle", 10, 10, 60, 40, {
        fills: ["C#[255,0,0]"],
        border: "C#[0,0,0]",
        bw: 4,
        borderProps: { _ba: "O" },
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 90, 10, 60, 40, {
        fills: ["C#[255,0,0]"],
        border: "C#[0,0,0]",
        bw: 4,
        borderProps: { _ba: "I" },
      }),
    );
    p.appendChild(
      shape(lib, "GEllipse", 170, 10, 50, 50, {
        fills: ["C#[255,0,0]"],
        border: "C#[0,0,0]",
        bw: 4,
        borderProps: { _ba: "O" },
      }),
    );
    p.appendChild(
      shape(lib, "GEllipse", 240, 10, 50, 50, {
        fills: ["C#[255,0,0]"],
        border: "C#[0,0,0]",
        bw: 4,
        borderProps: { _ba: "I", _op: 0.5 },
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 10, 100, 80, 60, {
        fills: ["C#[0,200,0]", "C#[0,0,200]"],
        borders: [
          ["C#[0,0,0]", 2],
          ["C#[255,255,0]", 6, { _ba: "O" }],
        ],
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 110, 100, 80, 60, { fills: [LINEAR], border: RADIAL, bw: 5 }),
    );
    p.appendChild(
      shape(lib, "GPolygon", 0, 0, 0, 0, {
        noTrf: true,
        fills: ["C#[1,1,1]"],
        border: "C#[200,0,0]",
        bw: 3,
        borderProps: { _ba: "O" },
        props: {
          pts: 6,
          cx: 240,
          cy: 130,
          or: 30,
          ir: 30 * Math.cos(Math.PI / 6),
          oa: 0,
          ia: Math.PI / 6,
        },
      }),
    );
    return run(lib, p, dialog());
  },
  fillLayers(lib) {
    const made = page(lib, 300, 120, null);
    const p = made.page;
    const box = shape(lib, "GRectangle", 10, 10, 80, 60, { fills: ["C#[255,0,0]"] });
    box.getPaintLayers().getFirstChild().setProperties(["_op", "_bl"], [0.4, "multiply"]);
    fill(lib, box, LINEAR, 0.5);
    p.appendChild(box);
    const hidden = shape(lib, "GEllipse", 110, 10, 60, 60, { fills: ["C#[0,0,255]"] });
    hidden.getPaintLayers().getFirstChild().setProperty("_vs", false);
    p.appendChild(hidden);
    p.appendChild(
      shape(lib, "GRectangle", 190, 10, 80, 60, {
        fills: ["C#[10,20,30]"],
        props: { _sbl: "screen", _stop: 0.5 },
      }),
    );
    return run(lib, p, dialog());
  },
  effects(lib) {
    const made = page(lib, 400, 220, "C#[250,250,250]");
    const p = made.page;
    p.appendChild(
      shape(lib, "GRectangle", 20, 20, 80, 60, {
        fills: ["C#[60,120,220]"],
        effects: [{ type: "GDropShadowEffect", props: { x: 6, y: 6, r: 5, pat: "C#[0,0,0]" } }],
      }),
    );
    p.appendChild(
      shape(lib, "GEllipse", 130, 20, 70, 70, {
        fills: ["C#[230,120,0]"],
        effects: [{ type: "GBlurEffect", props: { r: 4 } }],
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 220, 20, 80, 60, {
        fills: ["C#[240,240,120]"],
        effects: [{ type: "GInnerShadowEffect", props: { x: 4, y: 4, r: 4, pat: "C#[0,0,0]" } }],
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 20, 120, 80, 60, {
        fills: ["C#[60,120,220]"],
        effects: [
          { type: "GDropShadowEffect", props: { x: 3, y: 3, r: 2, pat: "C#[255,0,0]" } },
          { type: "GInnerShadowEffect", props: { x: 2, y: 2, r: 2, pat: "C#[0,255,0]" } },
          { type: "GDropShadowEffect", props: { x: -3, y: -3, r: 1, pat: "C#[0,0,255]" } },
        ],
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 120, 120, 80, 60, {
        fills: ["C#[60,120,220]"],
        props: { _sfop: 0.5 },
        effects: [
          { type: "GBlurEffect", props: { r: 2 } },
          { type: "GBlurEffect", props: { r: 3 } },
        ],
      }),
    );
    p.appendChild(
      shape(lib, "GRectangle", 220, 120, 80, 60, {
        fills: ["C#[60,120,220]"],
        props: { _sfop: 0.25 },
      }),
    );
    const hidden = shape(lib, "GRectangle", 320, 120, 60, 60, {
      fills: ["C#[60,120,220]"],
      effects: [{ type: "GBlurEffect", props: { r: 2, vs: false } }],
    });
    p.appendChild(hidden);
    return run(lib, p, dialog());
  },
  glBlur(lib) {
    const made = page(lib, 200, 120, null);
    const element = shape(lib, "GRectangle", 20, 20, 80, 60, { fills: ["C#[60,120,220]"] });
    const effect = new lib.G.GGLBlurEffect();
    effect.setProperty("shp", { radius: 7, clip: false });
    element.getEffects().appendChild(effect);
    made.page.appendChild(element);
    return run(lib, made.page, dialog());
  },
  colorOverlay(lib) {
    const made = page(lib, 200, 120, null);
    made.page.appendChild(
      shape(lib, "GRectangle", 20, 20, 80, 60, {
        fills: ["C#[60,120,220]"],
        effects: [{ type: "GOverlayEffect", props: { pat: "C#[255,0,0]", opc: 0.5 } }],
      }),
    );
    return run(lib, made.page, dialog());
  },
  blendMasks(lib) {
    const made = page(lib, 300, 120, null);
    const p = made.page;
    p.appendChild(shape(lib, "GRectangle", 10, 10, 100, 80, { fills: ["C#[255,0,0]"] }));
    p.appendChild(
      shape(lib, "GEllipse", 40, 20, 60, 60, { fills: ["C#[0,0,0]"], props: { _sbl: "m" } }),
    );
    p.appendChild(shape(lib, "GRectangle", 150, 10, 100, 80, { fills: ["C#[0,255,0]"] }));
    p.appendChild(
      shape(lib, "GEllipse", 180, 20, 60, 60, { fills: ["C#[0,0,0]"], props: { _sbl: "!m" } }),
    );
    return run(lib, p, dialog());
  },
  groups(lib) {
    const G = lib.G;
    const made = page(lib, 300, 200, null);
    const p = made.page;
    const group = new G.GGroup();
    group.setProperties(["name", "_stop", "_sbl"], ["Grp", 0.5, "multiply"]);
    group.appendChild(shape(lib, "GRectangle", 10, 10, 50, 50, { fills: ["C#[1,2,3]"] }));
    group.appendChild(shape(lib, "GEllipse", 30, 30, 50, 50, { fills: ["C#[4,5,6]"] }));
    p.appendChild(group);
    const shadowed = new G.GGroup();
    shadowed.appendChild(shape(lib, "GRectangle", 100, 10, 50, 50, { fills: ["C#[7,8,9]"] }));
    const fx = new G.GDropShadowEffect();
    fx.setProperties(["x", "y", "r"], [2, 2, 2]);
    shadowed.getEffects().appendChild(fx);
    p.appendChild(shadowed);
    const layer = new G.GLayer();
    layer.setProperty("name", "Layer A");
    layer.appendChild(shape(lib, "GRectangle", 10, 100, 50, 50, { fills: ["C#[9,9,9]"] }));
    p.appendChild(layer);
    const invisible = shape(lib, "GRectangle", 200, 100, 50, 50, { fills: ["C#[9,9,9]"] });
    invisible.setProperty("vis", false);
    p.appendChild(invisible);
    return run(lib, p, dialog({ layerNamesAsId: true }));
  },
  includeInvisible(lib) {
    const made = page(lib, 200, 100, null);
    const invisible = shape(lib, "GRectangle", 20, 20, 50, 50, { fills: ["C#[9,9,9]"] });
    invisible.setProperty("vis", false);
    made.page.appendChild(invisible);
    made.page.appendChild(shape(lib, "GRectangle", 100, 20, 50, 50, { fills: ["C#[1,1,1]"] }));
    return run(lib, made.page, dialog({ includeInvisible: true }));
  },
  compound(lib) {
    const G = lib.G;
    const made = page(lib, 300, 200, null);
    const compound = new G.GCompoundPath();
    compound.appendChild(
      path(
        lib,
        [
          [10, 10],
          [110, 10],
          [110, 110],
          [10, 110],
        ],
        true,
      ),
    );
    compound.appendChild(
      path(
        lib,
        [
          [40, 40],
          [80, 40],
          [80, 80],
          [40, 80],
        ],
        true,
      ),
    );
    fill(lib, compound, "C#[100,0,100]");
    made.page.appendChild(compound);
    return run(lib, made.page, dialog());
  },
  rasterFallback(lib) {
    const made = page(lib, 300, 200, null);
    made.page.appendChild(
      shape(lib, "GRectangle", 20, 20, 120, 70, {
        fills: ['L#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,0,255]","o":1}]}'],
        effects: [{ type: "GGLSepiaEffect", props: {} }],
      }),
    );
    made.page.appendChild(
      shape(lib, "GEllipse", 170, 20, 120, 70, {
        fills: ['A#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,200,0]","o":1}]}'],
      }),
    );
    return run(lib, made.page, dialog());
  },
  textPlain(lib) {
    const made = page(lib, 320, 120, "C#[255,255,255]");
    const t = text(lib, 16, 16, "Gravit Export", { size: 30, name: "Title" });
    made.page.appendChild(t);
    t.setProperties(["aw", "ah", "w", "h"], [false, false, 240, 44]);
    return run(lib, made.page, dialog());
  },
  textAuto(lib) {
    const made = page(lib, 320, 120, null);
    made.page.appendChild(text(lib, 10, 10, "Two words here", { size: 18 }));
    return run(lib, made.page, dialog());
  },
  textStyled(lib) {
    const made = page(lib, 320, 200, null);
    const t = text(lib, 10, 10, "Spaced and lined", {
      size: 16,
      props: { _tcs: 2, _tws: 3, _tdu: true, _tds: true },
    });
    made.page.appendChild(t);
    const b = text(lib, 10, 60, "Bordered", { size: 24, border: "C#[200,0,0]", bw: 1 });
    made.page.appendChild(b);
    const g = text(lib, 10, 110, "Gradient", { size: 24, fills: [LINEAR] });
    made.page.appendChild(g);
    const m = text(lib, 10, 150, "Line one\nLine two", { size: 12, props: { _pal: "c" } });
    made.page.appendChild(m);
    return run(lib, made.page, dialog());
  },
  textCurves(lib) {
    const made = page(lib, 320, 120, null);
    made.page.appendChild(text(lib, 16, 16, "Curves", { size: 30 }));
    made.page.appendChild(
      text(lib, 16, 70, "Two fills", { size: 22, fills: ["C#[200,30,30]", "C#[30,30,200]"] }),
    );
    return run(lib, made.page, dialog({ convertTextToPath: true }));
  },
  textTwoFills(lib) {
    const made = page(lib, 320, 120, null);
    made.page.appendChild(
      text(lib, 16, 16, "Two fills", { size: 22, fills: ["C#[200,30,30]", "C#[30,30,200]"] }),
    );
    return run(lib, made.page, dialog({ decimalPlacesPrecision: 1 }));
  },
  missingBBox(lib) {
    const made = page(lib, 0, 0, null);
    return run(lib, made.page, dialog());
  },
  queries(lib) {
    const made = page(lib, 300, 200, null);
    const p = made.page;
    const a = shape(lib, "GRectangle", 10, 10, 50, 50, { fills: ["C#[1,2,3]"], name: "Plain" });
    const b = shape(lib, "GRectangle", 70, 10, 50, 50, {
      fills: [
        'T#{"u":null,"r":"repeat","s":"length","w":10,"h":10,"p":"auto","m":false,"a":0,"sm":"tile","ts":1}',
      ],
      name: "Textured",
    });
    const c = shape(lib, "GRectangle", 130, 10, 50, 50, {
      fills: ["C#[1,2,3]"],
      effects: [{ type: "GGLSepiaEffect", props: {} }],
    });
    const d = shape(lib, "GRectangle", 190, 10, 50, 50, {
      fills: ["C#[1,2,3]"],
      effects: [{ type: "GBlurEffect", props: { r: 2 } }],
    });
    const e = shape(lib, "GRectangle", 10, 100, 50, 50, { fills: ["C#[1,2,3]", "C#[3,2,1]"] });
    p.appendChild(a);
    p.appendChild(b);
    p.appendChild(c);
    p.appendChild(d);
    p.appendChild(e);
    const X = lib.SVGExport;
    const describe = (list: any[]) =>
      list.map((x: any) => ({
        name: x.name,
        features: x.features.map((f: any) =>
          f instanceof lib.G.GNode
            ? "effect:" + f.getNodeName()
            : "pattern:" + lib.G.GPattern.serialize(f).slice(0, 2),
        ),
      }));
    return {
      unsupported: describe(X.getUnsupportedFeatures(p)),
      supported: [a, b, c, d, e, p].map((n) => X.hasSupportedEffects(n)),
      unsupportedEffects: [a, b, c, d, e, p].map((n) => X.hasUnsupportedEffects(n)),
      cdr: [a, b, c, d, e, p].map((n) => X.hasUnsupportedObjectsByCDR(n)),
      isSupported: [
        new lib.G.GBlurEffect(),
        new lib.G.GDropShadowEffect(),
        new lib.G.GGLSepiaEffect(),
      ].map((f) => X.isSupportedEffect(f)),
    };
  },
  cdrOption(lib) {
    const made = page(lib, 300, 120, null);
    made.page.appendChild(
      shape(lib, "GRectangle", 10, 10, 50, 50, { fills: ["C#[1,2,3]", "C#[3,2,1]"] }),
    );
    made.page.appendChild(shape(lib, "GRectangle", 70, 10, 50, 50, { fills: ["C#[1,2,3]"] }));
    return run(lib, made.page, dialog({ rasterizeUnsupportedObjectsByCDR: true }));
  },
  threeSeriesFilters(lib) {
    const made = page(lib, 200, 120, null);
    made.page.appendChild(
      shape(lib, "GRectangle", 20, 20, 80, 60, {
        fills: ["C#[60,120,220]"],
        props: { _sfop: 0.5 },
        effects: [
          { type: "GBlurEffect", props: { r: 1 } },
          { type: "GBlurEffect", props: { r: 2 } },
          { type: "GBlurEffect", props: { r: 3 } },
        ],
      }),
    );
    return run(lib, made.page, dialog());
  },
  exportCompat(lib) {
    const G = lib.G;
    const made = page(lib, 300, 200, null);
    const p = made.page;
    const nodes = [
      shape(lib, "GRectangle", 10, 10, 50, 50, { fills: ["C#[1,2,3]"] }),
      shape(lib, "GRectangle", 10, 10, 50, 50, {
        fills: ["C#[1,2,3]"],
        props: { _sbl: "linear_burn" },
      }),
      shape(lib, "GRectangle", 10, 10, 50, 50, {
        fills: ["C#[1,2,3]"],
        props: { _sbl: "multiply" },
      }),
      shape(lib, "GRectangle", 10, 10, 50, 50, { fills: [ANGULAR] }),
      shape(lib, "GRectangle", 10, 10, 50, 50, { fills: ["B#"] }),
      shape(lib, "GRectangle", 10, 10, 50, 50, {
        fills: ["C#[1,2,3]"],
        effects: [{ type: "GDropShadowEffect", props: { x: 1, y: 1, r: 1 } }],
      }),
      shape(lib, "GRectangle", 10, 10, 50, 50, {
        fills: ["C#[1,2,3]"],
        effects: [{ type: "GBlurEffect", props: { r: 1 } }],
      }),
      shape(lib, "GRectangle", 10, 10, 50, 50, {
        fills: ["C#[1,2,3]"],
        effects: [{ type: "GBlurEffect", props: { r: 1, vs: false } }],
      }),
    ];
    const layer = nodes[0].getPaintLayers().getFirstChild();
    layer.setProperty("_bl", "divide");
    for (const n of nodes) p.appendChild(n);
    const X = lib.ExportCompat;
    return {
      compatible: nodes.map((n) => [X.isCompatible(n), X.isCompatible(n, true)]),
      effect: nodes.map((n) => X.hasUnsupportedEffect(n)),
      pattern: nodes.map((n) => X.hasUnsupportedPattern(n)),
      blend: nodes.map((n) => X.hasCustomBlendMode(n)),
      background: nodes.map((n) => [X.isAffectedByBackground(n), X.hasBackgroundFill(n)]),
      modes: ["linear_burn", "multiply", "hardmix", null, ""].map((m) => X.isCustomBlendMode(m)),
      patterns: [null, pat(lib, "C#[1,2,3]"), pat(lib, "B#")].map((v) => X.isUnsupportedPattern(v)),
      group: X.isCompatible(new G.GGroup()),
    };
  },
  noImageDictionary(lib) {
    return run(lib, shapesPage(lib).page, dialog({ useImageDictionary: false, annotations: true }));
  },
};
