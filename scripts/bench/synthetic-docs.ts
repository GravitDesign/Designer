// Generated documents for the large cases: tens of thousands of objects
// flat, in groups or as symbol instances, many pages, and a page of
// effects and fills. The builders run in the page (sent as source text,
// so they use nothing from outside the function) and are seeded: the same
// spec gives the same document on every run.
import { random } from "./synthetic.ts";

export interface LargeSpec {
  /** Objects on the page: shapes (flat), shapes in groups (nested), masters and instances (symbols). */
  count: number;
  structure: "flat" | "nested" | "symbols";
  /** Every n-th shape gets a drop shadow (0 = none). */
  shadowEvery: number;
  page: { w: number; h: number };
  /** nested: groups per group, and shapes per innermost group. */
  fanout: number;
  /** nested: levels of groups. */
  levels: number;
  /** symbols: masters (two shapes each). */
  masters: number;
  /**
   * symbols: every n-th object is an instance of a master, the others are
   * shapes. Not every object: putting an instance into a scene walks the
   * whole scene (Scene.link), so building 20,000 instances takes hours.
   */
  instanceEvery: number;
}

/** The density of the heavy document (3,000 shapes on 4000 x 3000), scaled to `count`. */
export function largeSpec(count: number, structure: LargeSpec["structure"]): LargeSpec {
  const w = Math.round(4000 * Math.sqrt(count / 3000));
  return {
    count,
    structure,
    shadowEvery: 50,
    page: { w, h: Math.round(w * 0.75) },
    fanout: 10,
    levels: 3,
    masters: 5,
    instanceEvery: 10,
  };
}

/**
 * Builds a large document on a new page that replaces the active one. The
 * page is filled before it joins the scene: inserting tens of thousands
 * of children into a live page one by one re-measures the page every time
 * (finding 1), and this document is only built to be saved.
 */
export function buildLarge(spec: LargeSpec): {
  nodes: number;
  topLevel: number;
  symbols: number;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine through the untyped G namespace
  const { G, app } = (window as any).__parity;
  let seed = 23;
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const scene = app.scene();
  const old = scene.getActivePage();
  const page = new G.GPage();
  page.setProperties(
    ["name", "w", "h", "bck"],
    [old.getProperty("name"), spec.page.w, spec.page.h, new G.GRGBColor([255, 255, 255])],
  );
  let made = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine node
  const shape = (x: number, y: number, w: number, h: number): any => {
    const kind = made % 4;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine node
    let n: any;
    if (kind === 0 || kind === 1) {
      n = kind === 0 ? new G.GRectangle() : new G.GEllipse();
      n.setProperty("trf", new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
    } else if (kind === 2) {
      n = new G.GPolygon();
      const r = Math.min(w, h) / 2;
      n.setProperties(
        ["pts", "cx", "cy", "or", "ir", "oa", "ia"],
        [5, x + r, y + r, r, r * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI / 5],
      );
    } else {
      n = new G.GPath(true);
      const aps = n.getAnchorPoints();
      for (let k = 0; k < 6; k++) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x + rnd() * w, y + rnd() * h]);
        aps.appendChild(ap);
      }
    }
    const layers = n.getPaintLayers();
    const fill = new G.GStylable.FillPaintLayer();
    fill.setProperty(
      "_pt",
      new G.GRGBColor([Math.floor(rnd() * 255), Math.floor(rnd() * 255), Math.floor(rnd() * 255)]),
    );
    layers.appendChild(fill);
    if (made % 3 === 0) {
      const border = new G.GStylable.BorderPaintLayer();
      border.setProperty("_pt", new G.GRGBColor([30, 30, 30]));
      layers.appendChild(border);
    }
    if (spec.shadowEvery && made % spec.shadowEvery === 0) {
      n.getEffects().appendChild(new G.GDropShadowEffect());
    }
    made++;
    return n;
  };

  let symbols = 0;
  if (spec.structure === "flat") {
    while (made < spec.count) {
      const w = 20 + rnd() * 80;
      const h = 20 + rnd() * 80;
      page.appendChild(shape(rnd() * (spec.page.w - w), rnd() * (spec.page.h - h), w, h));
    }
  } else if (spec.structure === "nested") {
    // Groups of groups, each level tiled over its parent's area, so every
    // group's shapes lie close together as in a real drawing.
    const tops = Math.ceil(spec.count / Math.pow(spec.fanout, spec.levels));
    const fill = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine node
      parent: any,
      depth: number,
      x: number,
      y: number,
      w: number,
      h: number,
    ): void => {
      const n = depth === 0 ? tops : spec.fanout;
      const cols = Math.max(1, Math.round(Math.sqrt((n * w) / h)));
      const rows = Math.ceil(n / cols);
      const cw = w / cols;
      const ch = h / rows;
      for (let i = 0; i < n && made < spec.count; i++) {
        const cx = x + (i % cols) * cw;
        const cy = y + Math.floor(i / cols) * ch;
        if (depth === spec.levels) {
          const sw = cw * (0.4 + rnd() * 0.5);
          const sh = ch * (0.4 + rnd() * 0.5);
          parent.appendChild(shape(cx + rnd() * (cw - sw), cy + rnd() * (ch - sh), sw, sh));
        } else {
          const group = new G.GGroup();
          const pad = Math.min(cw, ch) * 0.03;
          fill(group, depth + 1, cx + pad, cy + pad, cw - 2 * pad, ch - 2 * pad);
          if (group.getFirstChild()) parent.appendChild(group);
        }
      }
    };
    fill(page, 0, 0, 0, spec.page.w, spec.page.h);
  } else {
    // A few masters of two shapes each along the top; every
    // instanceEvery-th object is an instance of one of them (a copy of a
    // master, as Duplicate makes), the others are shapes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
    const masters: any[] = [];
    // No shadows in the masters: every fifth object would have one.
    made = 1;
    for (let m = 0; m < spec.masters; m++) {
      const x = 40 + m * 140;
      const a = shape(x, 40, 100, 70);
      const b = shape(x + 20, 55, 60, 40);
      masters.push(G.GSymbol.create([a, b], page, "Master " + (m + 1)));
    }
    symbols = masters.length;
    for (let i = masters.length; i < spec.count; i++) {
      if (i % spec.instanceEvery !== 0) {
        const w = 20 + rnd() * 80;
        const h = 20 + rnd() * 80;
        const y = 120 + rnd() * (spec.page.h - 220 - h);
        page.appendChild(shape(rnd() * (spec.page.w - w), y, w, h));
        continue;
      }
      const m = (i / spec.instanceEvery) % masters.length;
      const instance = masters[m].clone();
      const dx = rnd() * (spec.page.w - 160) - (40 + m * 140);
      const dy = 120 + rnd() * (spec.page.h - 240) - 40;
      instance.transform(new G.GTransform(1, 0, 0, 1, dx, dy));
      page.appendChild(instance);
    }
  }

  scene.appendChild(page);
  scene.setActivePage(page);
  try {
    scene.removeChild(old);
  } catch {
    // The empty first page stays; it changes nothing measured.
  }
  app.editor().clearSelection();
  let nodes = 0;
  scene.acceptChildren(() => {
    nodes++;
  });
  let topLevel = 0;
  for (let n = page.getFirstChild(); n; n = n.getNext()) topLevel++;
  return { nodes, topLevel, symbols };
}

export interface PagesSpec {
  pages: number;
  shapesPerPage: number;
  page: { w: number; h: number };
}

export const PAGES: PagesSpec = { pages: 60, shapesPerPage: 250, page: { w: 1200, h: 900 } };

/** Builds a document of many fixed-size pages, each filled before it joins the scene. */
export function buildPages(spec: PagesSpec): { nodes: number; pages: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine through the untyped G namespace
  const { G, app } = (window as any).__parity;
  let seed = 31;
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const scene = app.scene();
  const old = scene.getActivePage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine node
  let first: any = null;
  for (let p = 0; p < spec.pages; p++) {
    const page = new G.GPage();
    page.setProperties(
      ["name", "w", "h", "bck"],
      ["Page " + (p + 1), spec.page.w, spec.page.h, new G.GRGBColor([255, 255, 255])],
    );
    for (let i = 0; i < spec.shapesPerPage; i++) {
      const w = 20 + rnd() * 80;
      const h = 20 + rnd() * 80;
      const x = rnd() * (spec.page.w - w);
      const y = rnd() * (spec.page.h - h);
      const n = i % 2 ? new G.GEllipse() : new G.GRectangle();
      n.setProperty("trf", new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
      const fill = new G.GStylable.FillPaintLayer();
      fill.setProperty(
        "_pt",
        new G.GRGBColor([
          Math.floor(rnd() * 255),
          Math.floor(rnd() * 255),
          Math.floor(rnd() * 255),
        ]),
      );
      n.getPaintLayers().appendChild(fill);
      if (i % 25 === 0) n.getEffects().appendChild(new G.GDropShadowEffect());
      page.appendChild(n);
    }
    scene.appendChild(page);
    if (!first) first = page;
  }
  scene.setActivePage(first);
  try {
    scene.removeChild(old);
  } catch {
    // The empty first page stays.
  }
  app.editor().clearSelection();
  let nodes = 0;
  scene.acceptChildren(() => {
    nodes++;
  });
  let pages = 0;
  for (let n = scene.getFirstChild(); n; n = n.getNext()) if (n instanceof G.GPage) pages++;
  return { nodes, pages };
}

// ---------------------------------------------------------------------------
// The effects page

export interface EffectsSpec {
  cols: number;
  rows: number;
  /** Tile size; each tile holds one styled object. */
  tile: number;
}

export const EFFECTS: EffectsSpec = { cols: 24, rows: 18, tile: 150 };

/**
 * The effects page as serialized nodes (the .gvdesign format without
 * ids): one object per tile, cycling through eight styles that together
 * use linear, radial and angular gradients, image textures, several fills
 * and borders per shape, layer and element blend modes and opacity, drop
 * and inner shadows, blur (canvas and WebGL) and clipping masks.
 * `textures` are image URLs (data: URLs).
 */
export function effectsNodes(spec: EffectsSpec, textures: string[]): string[] {
  const r = random(41);
  const color = (): string =>
    `C#[${Math.floor(r() * 255)},${Math.floor(r() * 255)},${Math.floor(r() * 255)}]`;
  const stops = (n: number): { p: number; c: string; o: number }[] =>
    Array.from({ length: n }, (_, i) => ({ p: i / (n - 1), c: color(), o: i % 3 === 2 ? 0.5 : 1 }));
  const linear = (): string => "L#" + JSON.stringify({ fx: 0, x: stops(3), r: r() * Math.PI });
  const radial = (): string => "R#" + JSON.stringify({ s: 0.5, x: stops(3) });
  const angular = (): string => "A#" + JSON.stringify({ s: 0.5, x: stops(4), a0: -Math.PI });
  const texture = (i: number): string =>
    "T#" +
    JSON.stringify({
      u: textures[i % textures.length],
      r: "repeat",
      s: "auto",
      w: null,
      h: null,
      p: "auto",
      m: false,
      a: (i % 4) * 0.3,
      sm: "tile",
      ts: 0.5 + (i % 3) * 0.25,
    });
  type Json = Record<string, unknown>;
  const fill = (pt: string, extra: Json = {}): Json => ({
    "@": "fillPaintLayer",
    _pt: pt,
    ...extra,
  });
  const border = (pt: string, width: number): Json => ({
    "@": "borderPaintLayer",
    _pt: pt,
    _bw: width,
  });
  const layers = (...l: Json[]): Json => ({ "@": "paintLayers", $: l });
  const effects = (...e: Json[]): Json => ({ "@": "effects", $: e });
  const drop = (): Json => ({
    "@": "dropShadowEffect",
    r: 6 + Math.floor(r() * 10),
    x: 6,
    y: 6,
    pat: "C#[0,0,0]",
    opc: 0.6,
  });
  const inner = (): Json => ({ "@": "innerShadowEffect", r: 8, x: 4, y: 4, pat: "C#[0,0,80]" });
  const blur = (): Json => ({ "@": "blurEffect", r: 3 + Math.floor(r() * 5) });
  const glBlur = (): Json => ({
    "@": "GGLBlurEffect",
    shp: { radius: 6, clip: false },
    sh: "GGLBlurShader",
  });
  const box = (kind: string, x: number, y: number, w: number, h: number, extra: Json): Json => ({
    "@": kind,
    trf: [w / 2, 0, 0, h / 2, x + w / 2, y + h / 2],
    ...extra,
  });
  const out: string[] = [];
  const t = spec.tile;
  const s = t * 0.7;
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      const i = row * spec.cols + col;
      const x = col * t + (t - s) / 2;
      const y = row * t + (t - s) / 2;
      let node: Json;
      switch (i % 8) {
        case 0:
          node = box("rectangle", x, y, s, s, {
            _layers: layers(fill(linear()), border(color(), 6), border(color(), 2)),
            _eff: effects(drop()),
          });
          break;
        case 1:
          node = box("ellipse", x, y, s, s * 0.8, {
            _sbl: "multiply",
            _layers: layers(fill(radial()), border(color(), 3)),
            _eff: effects(inner()),
          });
          break;
        case 2:
          node = box("rectangle", x, y, s, s, {
            _layers: layers(fill(angular())),
            _eff: effects(blur()),
          });
          break;
        case 3:
          node = box("rectangle", x, y, s, s * 0.9, {
            _layers: layers(fill(texture(i)), border(color(), 4)),
            _eff: effects(drop()),
          });
          break;
        case 4:
          // A clipping mask: the ellipse on top clips the gradient rectangle.
          node = {
            "@": "group",
            $: [
              box("rectangle", x, y, s, s, {
                _layers: layers(fill(linear()), border(color(), 4)),
              }),
              box("ellipse", x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8, {
                _sbl: "m",
                _layers: layers(fill("C#[0,0,0]")),
              }),
            ],
          };
          break;
        case 5:
          node = {
            "@": "polygon",
            pts: 5,
            cx: x + s / 2,
            cy: y + s / 2,
            or: s / 2,
            ir: s / 4,
            oa: -Math.PI / 2,
            ia: -Math.PI / 2 + Math.PI / 5,
            _stop: 0.8,
            _layers: layers(
              fill(color()),
              fill(linear(), { _op: 0.5, _bl: "screen" }),
              fill(texture(i), { _op: 0.6, _bl: "overlay" }),
              border(radial(), 3),
            ),
          };
          break;
        case 6:
          node = box("rectangle", x, y, s, s, {
            _layers: layers(fill(radial()), border(color(), 2)),
            _eff: effects(i % 16 === 6 ? glBlur() : drop(), inner()),
          });
          break;
        default:
          node = box("ellipse", x, y, s, s, {
            _sbl: "screen",
            _layers: layers(fill(texture(i)), fill(linear(), { _op: 0.4 }), border(linear(), 5)),
            _eff: effects(drop(), inner(), blur()),
          });
      }
      out.push(JSON.stringify(node));
    }
  }
  return out;
}

/** Inserts serialized nodes into the active page, sized `w` x `h`; returns their number. */
export function insertSerialized(spec: { w: number; h: number; nodes: string[] }): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the hooks through the untyped window
  const { app } = (window as any).__parity;
  const page = app.scene().getActivePage();
  page.setProperties(["w", "h"], [spec.w, spec.h]);
  const nodes = spec.nodes.map((json: string) => app.deserialize(json));
  app.editor().insertElements(nodes, true, true);
  app.editor().clearSelection();
  return nodes.length;
}
