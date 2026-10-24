/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
// Exporter branches neither the unit-test cases nor the corpus pages
// reach: images (dictionary and inline, rotated, masked, with a border
// and a shadow, broken), inside and outside borders on shapes SVG has no
// native element for, a paths graph with a gradient fill and a dashed
// border (the source-in recoloring), text features (list markers with a
// gradient, gradient borders, ligatures, fractions, stylistic sets,
// localized forms, justified text, the full font family name), clipping
// containers with and without a border, a slice with a class, a symbol
// instance, and pages with linear and angular backgrounds.
import { inPageWithSvgLib } from "./lib.ts";

export interface ExtraArgs {
  name: string;
  png: string;
  jpg: string;
  /** A corpus document as JSON, for the cases that start from one. */
  json?: string;
}

export const EXTRA_CASES: { name: string; corpus?: string }[] = [
  { name: "images-dictionary" },
  { name: "images-inline" },
  { name: "image-framed" },
  { name: "image-broken" },
  { name: "borders-composite" },
  { name: "paths-graph-gradient", corpus: "paths-graph" },
  { name: "text-features" },
  { name: "text-full-family-name" },
  { name: "text-lists-gradient" },
  { name: "clip-containers" },
  { name: "slice-class", corpus: "slices" },
  { name: "symbol-instance", corpus: "symbols" },
  { name: "page-backgrounds" },
];

export const runExtraCase = inPageWithSvgLib(async (_p, a: ExtraArgs, L) => {
  const { G } = L;
  const pat = L.pat;
  const workspace = await L.newWorkspace();
  const fm = workspace.getFontManager();
  const fill = (el: any, pattern: string, props: Record<string, unknown> = {}) => {
    const l = new G.GStylable.FillPaintLayer();
    l.setProperty("_pt", pat(pattern));
    const names = Object.keys(props);
    if (names.length)
      l.setProperties(
        names,
        names.map((n) => props[n]),
      );
    el.getPaintLayers().appendChild(l);
  };
  const border = (el: any, pattern: string, width: number, props: Record<string, unknown> = {}) => {
    const l = new G.GStylable.BorderPaintLayer();
    l.setProperties(["_pt", "_bw"], [pat(pattern), width]);
    const names = Object.keys(props);
    if (names.length)
      l.setProperties(
        names,
        names.map((n) => props[n]),
      );
    el.getPaintLayers().appendChild(l);
  };
  const box = (type: string, x: number, y: number, w: number, h: number, rotate = 0) => {
    const el = new G[type]();
    let trf = new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2);
    if (rotate) {
      trf = trf
        .translated(-(x + w / 2), -(y + h / 2))
        .rotated(rotate * (Math.PI / 180))
        .translated(x + w / 2, y + h / 2);
    }
    el.setProperty("trf", trf);
    return el;
  };
  const path = (points: [number, number][], closed: boolean) => {
    const el = new G.GPath();
    for (const [x, y] of points) {
      const anchor = new G.GPathBase.AnchorPoint();
      anchor.setProperties(["x", "y"], [x, y]);
      el.getAnchorPoints().appendChild(anchor);
    }
    el.setProperty("closed", closed);
    return el;
  };
  const image = (
    x: number,
    y: number,
    w: number,
    h: number,
    iw: number,
    ih: number,
    url: string,
    rotate = 0,
  ) => {
    const im = new G.GImage();
    im.setProperties(["iw", "ih", "url"], [iw, ih, url]);
    let trf = new G.GTransform(w / iw, 0, 0, h / ih, x, y);
    if (rotate) {
      trf = trf
        .translated(-(x + w / 2), -(y + h / 2))
        .rotated(rotate * (Math.PI / 180))
        .translated(x + w / 2, y + h / 2);
    }
    im.transform(trf);
    return im;
  };
  const text = (x: number, y: number, content: string, props: Record<string, unknown> = {}) => {
    const t = new G.GText();
    t.setText(content);
    t.setProperty("trf", new G.GTransform(1, 0, 0, 1, x, y));
    const all: Record<string, unknown> = { _tff: "Open Sans", _tfi: 18, ...props };
    const names = Object.keys(all);
    t.setProperties(
      names,
      names.map((n) => all[n]),
    );
    return t;
  };
  const shadow = (el: any) => {
    const fx = new G.GDropShadowEffect();
    fx.setProperties(["x", "y", "r", "pat"], [4, 4, 3, pat("C#[0,0,0]")]);
    el.getEffects().appendChild(fx);
  };
  const LINEAR =
    'L#{"fx":0,"x":[{"p":0,"c":"C#[255,200,0]","o":1},{"p":1,"c":"C#[0,90,200]","o":1}]}';
  const RADIAL =
    'R#{"s":0.5,"fx":0.3,"fy":0.3,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[40,140,60]","o":0.5}]}';
  const ANGULAR =
    'A#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,200,0]","o":1}]}';

  const options = (extra: Record<string, unknown> = {}) => ({
    ...L.exporterOptions(L.dialogDefaults(null)),
    ...extra,
  });
  const run = async (scene: any, node: any, extra: Record<string, unknown> = {}) => {
    await L.settle(scene);
    return L.io.export(node, options(extra));
  };
  const fresh = (w: number, h: number) => {
    const made = L.newScene(workspace);
    made.page.setProperties(["w", "h", "name"], [w, h, "Page"]);
    return made;
  };

  return L.io.withTextMeter(fm, async () => {
    switch (a.name) {
      case "images-dictionary":
      case "images-inline": {
        const { scene, page } = fresh(360, 240);
        page.appendChild(image(10, 10, 64, 48, 64, 48, a.png));
        page.appendChild(image(90, 10, 80, 60, 80, 60, a.jpg, 30));
        const under1 = box("GRectangle", 190, 10, 80, 60);
        fill(under1, "C#[220,40,40]");
        page.appendChild(under1);
        const masked = image(200, 15, 64, 48, 64, 48, a.png);
        masked.setProperty("_sbl", "m");
        page.appendChild(masked);
        const under2 = box("GRectangle", 280, 10, 70, 60);
        fill(under2, "C#[40,160,40]");
        page.appendChild(under2);
        const inverse = image(285, 15, 60, 45, 80, 60, a.jpg);
        inverse.setProperty("_sbl", "!m");
        page.appendChild(inverse);
        const faded = image(140, 110, 80, 60, 80, 60, a.jpg);
        faded.setProperties(["_stop", "_sbl"], [0.5, "multiply"]);
        page.appendChild(faded);
        return run(scene, page, a.name === "images-inline" ? { useImageDictionary: false } : {});
      }
      case "image-framed": {
        // A fill and a border on an image, and a drop shadow.
        const { scene, page } = fresh(160, 120);
        const framed = image(20, 20, 96, 72, 64, 48, a.png);
        fill(framed, "C#[255,255,0]");
        border(framed, "C#[0,0,0]", 3, { _ba: "O" });
        shadow(framed);
        page.appendChild(framed);
        return run(scene, page);
      }
      case "image-broken": {
        // An image that fails to load paints its frame through strokeRect.
        const { scene, page } = fresh(100, 100);
        page.appendChild(image(20, 20, 40, 40, 4, 4, "data:image/png;base64,AAAA"));
        return run(scene, page);
      }
      case "borders-composite": {
        const { scene, page } = fresh(400, 260);
        const add = (
          el: any,
          b: [string, number, Record<string, unknown>][],
          fills = ["C#[250,220,120]"],
        ) => {
          for (const f of fills) fill(el, f);
          for (const [p, w, props] of b) border(el, p, w, props);
          page.appendChild(el);
          return el;
        };
        const r1 = add(box("GRectangle", 10, 10, 80, 60), [["C#[0,0,0]", 6, { _ba: "I" }]]);
        r1.setProperty("tl_sx", 14);
        const r2 = add(box("GRectangle", 110, 10, 80, 60), [["C#[0,0,200]", 6, { _ba: "O" }]]);
        r2.setProperty("tl_sx", 14);
        add(
          path(
            [
              [220, 70],
              [260, 10],
              [300, 70],
            ],
            true,
          ),
          [["C#[200,0,0]", 5, { _ba: "I" }]],
        );
        add(
          path(
            [
              [320, 70],
              [350, 10],
              [390, 70],
            ],
            true,
          ),
          [["C#[0,120,0]", 5, { _ba: "O", _op: 0.5 }]],
        );
        add(box("GEllipse", 20, 100, 100, 60, 20), [[LINEAR, 8, { _ba: "I" }]], [RADIAL]);
        const r3 = add(box("GRectangle", 150, 100, 90, 60, 10), [
          ["C#[0,0,0]", 2, {}],
          [LINEAR, 6, { _ba: "O" }],
        ]);
        r3.setProperty("tl_sx", 10);
        add(
          path(
            [
              [260, 180],
              [320, 110],
              [380, 180],
            ],
            false,
          ),
          [[LINEAR, 4, { _bhm: "A", _btm: "C", _bds: [6, 3] }]],
          [],
        );
        const polygon = new G.GPolygon();
        polygon.setProperties(
          ["pts", "cx", "cy", "or", "ir", "oa", "ia", "icr", "ocr"],
          [5, 60, 220, 30, 14, 0, Math.PI / 5, 3, 3],
        );
        add(polygon, [["C#[80,0,120]", 4, { _ba: "I" }]]);
        return run(scene, page);
      }
      case "paths-graph-gradient": {
        const scene = await L.loadScene(a.json as string, workspace);
        const page = scene.getActivePage();
        let graph: any = null;
        scene.acceptChildren((n: any) => {
          if (!graph && n instanceof G.GPathsGraph) graph = n;
        });
        if (!graph) throw new Error("no paths graph in the corpus file");
        graph.getPaintLayers().clearFillLayers();
        fill(graph, LINEAR);
        border(graph, RADIAL, 3, { _bds: [4, 2.5, 1], _blc: "round" });
        return run(scene, page);
      }
      case "text-features": {
        const { scene, page } = fresh(420, 360);
        const add = (t: any, f = ["C#[20,20,20]"]) => {
          for (const x of f) fill(t, x);
          page.appendChild(t);
          return t;
        };
        add(text(10, 10, "office fluff 1/2", { _tlig: true, _tfrac: true }));
        add(text(10, 40, "office auto spaced", { _tlig: "auto", _tcs: 3 }));
        add(text(10, 70, "office auto tight", { _tlig: "auto" }));
        add(text(10, 100, "stylistic set", { _tstyls: "ss01" }));
        add(text(10, 130, "localized istanbul", { _tlocl: "TRK " }));
        const bordered = add(text(10, 160, "Gradient border", { _tfi: 26 }), [RADIAL]);
        border(bordered, LINEAR, 1.5);
        const justified = add(
          text(10, 200, "Justified text that wraps over a few lines in a narrow box", {
            aw: false,
            w: 180,
            _pal: "j",
          }),
        );
        justified.setProperty("ah", false);
        add(text(220, 200, "Right aligned\nsecond line", { _pal: "r", aw: false, w: 180 }));
        add(text(10, 300, "Faded multiply", { _stop: 0.5, _sbl: "multiply" }));
        return run(scene, page);
      }
      case "text-full-family-name": {
        const { scene, page } = fresh(300, 80);
        const t = text(10, 10, "Full family name", { _tfw: 700 });
        fill(t, "C#[20,20,20]");
        page.appendChild(t);
        return run(scene, page, { fullFFName: true });
      }
      case "text-lists-gradient": {
        const { scene, page } = fresh(420, 200);
        const kinds = ["Bullet", "Number", "RomanDot"];
        kinds.forEach((kind, i) => {
          const t = text(10 + i * 140, 10, "First item\nSecond item\nThird item", { _tfi: 14 });
          fill(t, i === 1 ? "C#[20,20,20]" : LINEAR);
          page.appendChild(t);
          t.getTLCore().getDocumentRange().toggleList(kind);
        });
        return run(scene, page);
      }
      case "clip-containers": {
        const { scene, page } = fresh(400, 160);
        const child = (x: number, color: string) => {
          const e = box("GEllipse", x, 20, 90, 90);
          fill(e, color);
          return e;
        };
        // No fill and no border: the exporter paints it white for the clip, then removes that.
        const bare = box("GRectangle", 10, 10, 100, 80);
        bare.appendChild(child(40, "C#[60,120,240]"));
        page.appendChild(bare);
        // A border: outline copies on top of the clipped children.
        const framed = box("GRectangle", 140, 10, 100, 80);
        border(framed, "C#[0,0,0]", 3);
        framed.appendChild(child(170, "C#[240,90,60]"));
        page.appendChild(framed);
        // An ellipse with fill and an outside border.
        const ring = box("GEllipse", 270, 10, 110, 110);
        fill(ring, "C#[250,240,200]");
        border(ring, "C#[0,0,200]", 4, { _ba: "O" });
        ring.appendChild(child(300, "C#[0,160,80]"));
        page.appendChild(ring);
        return run(scene, page);
      }
      case "slice-class": {
        const scene = await L.loadScene(a.json as string, workspace);
        let slice: any = null;
        scene.acceptChildren((n: any) => {
          if (!slice && n instanceof G.GSlice) slice = n;
        });
        if (!slice) throw new Error("no slice in the corpus file");
        slice.setProperty("cls", "hero");
        return run(scene, slice);
      }
      case "symbol-instance": {
        const scene = await L.loadScene(a.json as string, workspace);
        const found: any[] = [];
        scene.acceptChildren((n: any) => {
          if (n instanceof G.GSymbol && n.getParent() instanceof G.GPage) found.push(n);
        });
        if (!found.length) throw new Error("no symbol instance in the corpus file");
        const outcomes = [];
        for (const instance of found.slice(0, 3)) outcomes.push(await run(scene, instance));
        return outcomes;
      }
      case "page-backgrounds": {
        const outcomes = [];
        for (const bck of [LINEAR, RADIAL, ANGULAR]) {
          const { scene, page } = fresh(200, 120);
          page.setProperty("bck", pat(bck));
          const r = box("GRectangle", 40, 30, 60, 40);
          fill(r, "C#[0,0,0]");
          page.appendChild(r);
          outcomes.push(await run(scene, page));
          outcomes.push(await run(scene, page, { rasterizeUnsupportedObjectsByCDR: false }));
        }
        return outcomes;
      }
      default:
        throw new Error("unknown extra case " + a.name);
    }
  });
});
