// The corpus documents. Each entry is built by build.ts in the old app
// and saved as parity/corpus/files/<name>.gvdesign; the scenarios in
// parity/scenarios/corpus load every file and record its outputs.
//
// `build` runs inside the old app's page (sent as source text, like a
// scenario's inPage), with window.__cb from builder-lib.js as its first
// argument and the fixture images as the second.
//
// `features` lists what the file contains (for README.md), `covers` the
// INVENTORY.md items whose behaviour changes the file's load, save, preview
// or render output.

import type { Page } from "@playwright/test";

export interface FixtureImage {
  url: string;
  w: number;
  h: number;
}
export interface BuildArgs {
  png: FixtureImage;
  jpeg: FixtureImage;
}

// The build functions drive the old engine through builder-lib.js, which
// has no types; they run in the page, never in Node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lib = any;

export interface CorpusDocument {
  name: string;
  features: string[];
  covers: string[];
  build?: (L: Lib, args: BuildArgs) => unknown;
  /**
   * Optional real input after build, for content only a tool can make.
   * `at` maps a scene point of the active page to page (screen) pixels.
   */
  drive?: (page: Page, at: (x: number, y: number) => Promise<[number, number]>) => Promise<void>;
}

export const CORPUS_DOCUMENTS: CorpusDocument[] = [
  {
    name: "shapes-rectangles",
    features: [
      "rectangle with default style",
      "corner types R/U/B/I/F with uniform radius",
      "per-corner radii and types (uf false)",
      "rotated and skewed rectangles",
    ],
    covers: ["ENG-NODE-028", "ENG-NODE-024", "ENG-STYLE-008", "ENG-GEOM-003"],
    build: (L) => {
      const G = L.G;
      L.insert(L.rect(0, 0, 120, 80));
      const types = ["R", "U", "B", "I", "F"];
      types.forEach((ct: string, i: number) => {
        L.insert(L.rect(i * 140, 120, 120, 80, L.corners(ct, 20)));
      });
      L.insert(
        L.rect(0, 240, 160, 100, {
          uf: false,
          tl_ct: "R",
          tl_sx: 30,
          tl_sy: 30,
          tr_uf: false,
          tr_ct: "B",
          tr_sx: 20,
          tr_sy: 10,
          br_ct: "I",
          br_sx: 15,
          br_sy: 15,
          bl_ct: "U",
          bl_sx: 40,
          bl_sy: 20,
        }),
      );
      const rot = L.rect(220, 240, 120, 80, L.corners("R", 12));
      rot.transform(new G.GTransform().rotated(Math.PI / 6));
      L.insert(rot);
      const skew = L.rect(420, 240, 120, 80);
      skew.transform(new G.GTransform(1, 0, 0.4, 1, 0, 0));
      L.insert(skew);
    },
  },
  {
    name: "shapes-ellipses",
    features: ["full ellipse and circle", "pie, chord and arc (etp 0/1/2) with start/end angles"],
    covers: ["ENG-NODE-029"],
    build: (L) => {
      L.insert(L.ellipse(0, 0, 160, 100));
      L.insert(L.ellipse(200, 0, 100, 100));
      [0, 1, 2].forEach((etp: number, i: number) => {
        L.insert(
          L.style(
            L.ellipse(i * 140, 140, 120, 120, { etp, sa: Math.PI / 4, ea: Math.PI * 1.6 }),
            [[235, 235, 235]],
            [[[40, 40, 40], { _bw: 4 }]],
          ),
        );
      });
    },
  },
  {
    name: "shapes-polygons",
    features: [
      "polygons with 3, 5 and 8 points",
      "stars (inner radius differs)",
      "outer/inner corner types and radii",
      "outer/inner angle offsets",
    ],
    covers: ["ENG-NODE-030"],
    build: (L) => {
      L.insert(L.polygon(60, 60, 50, { pts: 3 }));
      L.insert(L.polygon(200, 60, 50, { pts: 5 }));
      L.insert(L.polygon(340, 60, 50, { pts: 8 }));
      L.insert(L.polygon(60, 200, 50, { pts: 5, ir: 22 }));
      L.insert(L.polygon(200, 200, 50, { pts: 7, ir: 30, oct: "B", ocr: 8, ict: "R", icr: 4 }));
      L.insert(L.polygon(340, 200, 50, { pts: 6, ir: 35, oa: 0.3, ia: 0.9, oct: "I", ocr: 6 }));
    },
  },
  {
    name: "shapes-paths",
    features: [
      "open and closed paths",
      "smooth anchors TA/TS/TM/TC with explicit handles",
      "auto handles (ah)",
      "anchor corners R/B/I with radii (cl/cr)",
      "self-intersecting closed path with evenodd on and off",
      "straight line",
    ],
    covers: [
      "ENG-NODE-021",
      "ENG-NODE-022",
      "ENG-NODE-023",
      "ENG-NODE-025",
      "ENG-SER-006",
      "ENG-FILL-004",
    ],
    build: (L) => {
      const S = [[255, 220, 120]];
      const B = [[[30, 30, 30], { _bw: 2 }]];
      L.insert(
        L.style(
          L.path(
            [
              [0, 0],
              [120, 0],
              [60, 90],
            ],
            false,
          ),
          S,
          B,
        ),
      );
      L.insert(
        L.style(
          L.path(
            [
              [160, 0],
              [280, 0],
              [280, 90],
              [160, 90],
            ],
            true,
          ),
          S,
          B,
        ),
      );
      L.insert(
        L.style(
          L.path(
            [
              { x: 0, y: 160, tp: "TA", hrx: 40, hry: 110, hlx: -20, hly: 170 },
              { x: 120, y: 160, tp: "TS", hlx: 80, hly: 220, hrx: 160, hry: 100 },
              { x: 240, y: 160, tp: "TM", hlx: 200, hly: 110, hrx: 280, hry: 210 },
              { x: 360, y: 160, tp: "TC" },
            ],
            false,
          ),
          [],
          [[[200, 40, 40], { _bw: 3 }]],
        ),
      );
      L.insert(
        L.style(
          L.path(
            [
              { x: 0, y: 260, ah: true },
              { x: 80, y: 220, ah: true },
              { x: 160, y: 300, ah: true },
              { x: 60, y: 340, ah: true },
            ],
            true,
          ),
          S,
          B,
        ),
      );
      L.insert(
        L.style(
          L.path(
            [
              { x: 200, y: 240, tp: "R", cl: 15, cr: 15 },
              { x: 320, y: 240, tp: "B", cl: 20, cr: 20 },
              { x: 320, y: 340, tp: "I", cl: 15, cr: 15 },
              { x: 200, y: 340, tp: "F", cl: 15, cr: 15 },
            ],
            true,
          ),
          S,
          B,
        ),
      );
      const star = (x: number, evenodd: boolean) =>
        L.style(
          L.path(
            [
              [x + 50, 380],
              [x + 80, 480],
              [x, 420],
              [x + 100, 420],
              [x + 20, 480],
            ],
            true,
            { evenodd },
          ),
          [[90, 160, 230]],
          B,
        );
      L.insert(star(0, false));
      L.insert(star(140, true));
      L.insert(
        L.style(
          L.path(
            [
              [280, 380],
              [400, 480],
            ],
            false,
          ),
          [],
          [[[0, 0, 0], { _bw: 6 }]],
        ),
      );
    },
  },
  {
    name: "shapes-compoundpath",
    features: ["compound path with two holes (evenodd)", "compound path with evenodd off"],
    covers: ["ENG-NODE-026", "ENG-SER-008", "ENG-FILL-004", "EDT-PAINT-006"],
    build: (L) => {
      const G = L.G;
      const make = (x: number, evenodd: boolean) => {
        const c = new G.GCompoundPath();
        c.getPaths().appendChild(
          L.path(
            [
              [x, 0],
              [x + 200, 0],
              [x + 200, 160],
              [x, 160],
            ],
            true,
          ),
        );
        c.getPaths().appendChild(
          L.path(
            [
              [x + 20, 20],
              [x + 90, 20],
              [x + 90, 140],
              [x + 20, 140],
            ],
            true,
          ),
        );
        c.getPaths().appendChild(
          L.path(
            [
              [x + 110, 20],
              [x + 180, 20],
              [x + 145, 140],
            ],
            true,
          ),
        );
        c.setProperty("evenodd", evenodd);
        return L.style(c, [[60, 120, 200]], [[[20, 20, 20], { _bw: 2 }]]);
      };
      L.insert(make(0, true));
      L.insert(make(240, false));
    },
  },
  {
    name: "shapes-ready",
    features: [
      "every ready shape of the catalogue that has handles (blob ssn/icn/pvp/apv); shapes without handles are left out because the old app cannot save them",
    ],
    covers: ["ENG-NODE-031", "ENG-NODE-032", "ENG-SER-018", "ADD-TOOL-001"],
    build: (L) => {
      const names: string[] = L.readyShapeNames(true);
      names.forEach((n: string, i: number) => {
        const s = L.readyShape(n, (i % 6) * 120, Math.floor(i / 6) * 120, 100, 100);
        L.insert(L.style(s, [[120, 200, 160]], [[[20, 60, 40], { _bw: 2 }]]));
      });
    },
  },
  {
    name: "compound-shapes",
    features: [
      "live compound shapes made with Modify > Union, Subtract, Intersect, Difference",
      "child bool modes OR/SUB/AND/XOR",
      "nested compound shape",
    ],
    covers: ["ENG-NODE-027", "ENG-BOOL-001", "ENG-BOOL-002", "ENG-BOOL-004", "ACT-MODIFY-005"],
    build: (L) => {
      const ops = [
        "modify.merge.union",
        "modify.merge.subtract",
        "modify.merge.intersect",
        "modify.merge.difference",
      ];
      ops.forEach((op: string, i: number) => {
        const a = L.style(L.rect(i * 180, 0, 110, 90), [[230, 120, 60]], [[[0, 0, 0], { _bw: 2 }]]);
        const b = L.ellipse(i * 180 + 50, 40, 100, 100);
        L.insert([a, b]);
        L.select([a, b]);
        L.run(op);
      });
      // Nested: a compound shape inside another one.
      const c1 = L.style(L.rect(0, 220, 140, 140), [[100, 100, 220]], [[[0, 0, 0], { _bw: 2 }]]);
      const c2 = L.ellipse(30, 250, 80, 80);
      L.insert([c1, c2]);
      L.select([c1, c2]);
      L.run("modify.merge.subtract");
      const inner = L.last();
      const c3 = L.polygon(170, 290, 70, { pts: 5, ir: 30 });
      L.insert(c3);
      L.select([inner, c3]);
      L.run("modify.merge.union");
    },
  },
  {
    name: "structure-groups-layers",
    features: [
      "nested groups",
      "extra layers: hidden, locked, outline view with a custom color and not printable",
      "hidden and locked elements",
      "element names",
      "group with a frame and child constraints (hacr/vacr)",
    ],
    covers: [
      "ENG-NODE-036",
      "ENG-NODE-037",
      "ENG-NODE-017",
      "ENG-SCENE-007",
      "ENG-SCENE-009",
      "EDT-RENDER-007",
      "ENG-NODE-013",
    ],
    build: (L) => {
      const G = L.G;
      const scene = L.scene();
      const page = L.page();
      const base = scene.getActiveLayer();
      const r1 = L.style(L.rect(0, 0, 100, 80, { name: "Back" }), [[250, 200, 80]], []);
      const r2 = L.style(L.ellipse(40, 30, 100, 80, { name: "Front" }), [[80, 160, 250]], []);
      const inner = L.group([r1, r2], { name: "Inner group" });
      const r3 = L.style(L.rect(160, 0, 80, 80), [[200, 80, 80]], []);
      L.insert(L.group([inner, r3], { name: "Outer group" }));
      const hidden = L.style(L.rect(260, 0, 60, 60, { vis: false }), [[0, 0, 0]], []);
      const locked = L.style(L.rect(340, 0, 60, 60, { lkt: "F" }), [[120, 120, 120]], []);
      L.insert([hidden, locked]);
      // Group with a frame: children keep their constraints.
      const a = L.style(L.rect(0, 140, 40, 40, { hacr: 1, vacr: 1 }), [[60, 180, 90]], []);
      const b = L.style(L.rect(160, 140, 40, 40, { hacr: 3, vacr: 3 }), [[60, 180, 90]], []);
      const c = L.style(L.rect(60, 150, 80, 20, { hacr: 4, vacr: 2 }), [[30, 90, 50]], []);
      L.insert(L.group([a, b, c], { name: "Framed", frm: new G.GRect(0, 140, 200, 40) }));
      const layers = [
        { name: "Hidden layer", vis: false },
        { name: "Locked layer", lkt: "F" },
        { name: "Outline layer", otl: true, cls: L.rgb(255, 0, 128), prt: false },
      ];
      layers.forEach((props: Record<string, unknown>, i: number) => {
        const layer = new G.GLayer();
        page.appendChild(layer);
        scene.setActiveLayer(layer);
        L.insert(
          L.style(L.rect(i * 120, 240, 100, 60), [[150, 100, 200]], [[[0, 0, 0], { _bw: 3 }]]),
        );
        L.props(layer, props);
      });
      if (base) scene.setActiveLayer(base);
    },
  },
  {
    name: "structure-clipping",
    features: [
      "Modify > Clip: shapes clipped by a rectangle and by an ellipse",
      "Modify > Mask with Shape with a black-to-white gradient (alpha-mask overlay effect)",
      "clipped content that overflows the clip shape",
    ],
    covers: [
      "EDT-PAINT-028",
      "EDT-PAINT-030",
      "EDT-PAINT-005",
      "ENG-BLEND-003",
      "ENG-SCENE-010",
      "ENG-NODE-020",
      "EDT-DUP-008",
      "EDT-DUP-009",
      "ENG-EFFECT-006",
      "EDT-RENDER-016",
    ],
    build: (L) => {
      const content = (x: number) => [
        L.style(L.rect(x - 30, -20, 120, 60), [[240, 90, 60]], []),
        L.style(L.ellipse(x + 40, 30, 100, 100), [[60, 120, 240]], []),
      ];
      const c1 = L.style(L.rect(0, 0, 140, 120), [[250, 240, 200]], [[[0, 0, 0], { _bw: 2 }]]);
      const k1 = content(0);
      L.insert([c1, ...k1]);
      L.select([c1, ...k1]);
      L.run("modify.clip");
      const c2 = L.style(L.ellipse(200, 0, 140, 120), [[220, 250, 220]], []);
      const k2 = content(200);
      L.insert([c2, ...k2]);
      L.select([c2, ...k2]);
      L.run("modify.clip");
      // Mask: the top shape with a black/white gradient masks the rest.
      const k3 = content(400);
      const m = L.style(
        L.ellipse(380, -10, 160, 140),
        [
          L.linear([
            [0, [0, 0, 0]],
            [1, [255, 255, 255]],
          ]),
        ],
        [],
      );
      L.insert([...k3, m]);
      L.select([...k3, m]);
      L.run("modify.mask-with-shape");
    },
  },
  {
    name: "images",
    features: [
      "embedded PNG with alpha and embedded JPEG (scene dictionary entries)",
      "scaled, rotated and flipped images",
      "image with rounded corners (GImage is a rectangle)",
      "image with an outside border and a drop shadow",
      "the same image placed several times (one dictionary entry)",
    ],
    covers: [
      "ENG-NODE-034",
      "FMT-GVD-010",
      "FMT-GVD-011",
      "ENG-PATTERN-005",
      "EDT-PAINT-037",
      "EDT-PAINT-026",
    ],
    build: (L, a) => {
      const G = L.G;
      L.insert(L.image(0, 0, 96, 64, a.png.url, a.png.w, a.png.h));
      L.insert(L.image(120, 0, 128, 80, a.jpeg.url, a.jpeg.w, a.jpeg.h));
      L.insert(L.image(280, 0, 48, 32, a.png.url, a.png.w, a.png.h));
      const rot = L.image(0, 120, 128, 80, a.jpeg.url, a.jpeg.w, a.jpeg.h);
      rot.transform(new G.GTransform().rotated(0.4));
      L.insert(rot);
      const flip = L.image(180, 120, 128, 80, a.jpeg.url, a.jpeg.w, a.jpeg.h);
      flip.transform(new G.GTransform(-1, 0, 0, 1, 488, 0));
      L.insert(flip);
      L.insert(L.image(0, 260, 160, 100, a.jpeg.url, a.jpeg.w, a.jpeg.h, L.corners("R", 24)));
      const fancy = L.image(200, 260, 144, 96, a.png.url, a.png.w, a.png.h);
      L.style(fancy, [], [[[20, 20, 20], { _bw: 4, _ba: "O" }]]);
      L.fx(fancy, G.GDropShadowEffect, { r: 8, x: 6, y: 6 });
      L.insert(fancy);
    },
  },
  {
    name: "slices",
    features: ["slices with and without trim", "slice with a color", "slices over shapes"],
    covers: ["ENG-NODE-040", "EDT-RENDER-004"],
    build: (L) => {
      L.insert(L.style(L.ellipse(0, 0, 200, 120), [[250, 180, 60]], []));
      L.insert(L.slice(-10, -10, 120, 80, { name: "Slice trim" }));
      L.insert(
        L.slice(100, 40, 120, 100, { name: "Slice no trim", trm: false, cls: L.rgb(255, 0, 0) }),
      );
      L.insert(L.slice(260, 0, 80, 80, { name: "Empty slice" }));
    },
  },
  {
    name: "connectors",
    features: ["connector between two shapes, with an arrow marker"],
    covers: ["ENG-NODE-041", "ENG-SCENE-008"],
    build: (L) => {
      const G = L.G;
      const a = L.style(L.rect(0, 0, 100, 60), [[200, 230, 250]], [[[0, 0, 0], { _bw: 2 }]]);
      const b = L.style(L.ellipse(260, 120, 100, 80), [[250, 220, 200]], [[[0, 0, 0], { _bw: 2 }]]);
      L.insert([a, b]);
      const c = new G.GConnector();
      const aps = c.getAnchorPoints();
      for (const [x, y] of [
        [100, 30],
        [260, 160],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        aps.appendChild(ap);
      }
      L.style(c, [], [[[0, 0, 0], { _bw: 2, _btm: "A" }]]);
      L.insert(c);
      c.connect(a, b);
    },
  },
  {
    name: "fills-colors",
    features: [
      "RGB, CMYK and HSV color fills",
      "fill layer opacity and a hidden fill layer",
      "element fill opacity (_sfop) and total opacity (_stop)",
      "no fill",
    ],
    covers: [
      "ENG-FILL-001",
      "ENG-FILL-003",
      "ENG-COLOR-001",
      "ENG-COLOR-002",
      "ENG-COLOR-003",
      "ENG-COLOR-004",
      "ENG-COLOR-005",
      "ENG-SER-005",
      "ENG-BLEND-005",
      "ENG-STYLE-002",
      "ENG-STYLE-004",
    ],
    build: (L) => {
      const cells: [
        unknown,
        Record<string, unknown> | undefined,
        Record<string, unknown> | undefined,
      ][] = [
        [L.rgb(230, 60, 60), undefined, undefined],
        [L.cmyk(0.1, 0.7, 0, 0), undefined, undefined],
        [L.hsv(0.55, 0.8, 0.9), undefined, undefined],
        [L.rgb(40, 160, 90), { _op: 0.4 }, undefined],
        [L.rgb(40, 160, 90), { _vs: false }, undefined],
        [L.rgb(40, 90, 200), undefined, { _sfop: 0.5 }],
        [L.rgb(40, 90, 200), undefined, { _stop: 0.5 }],
      ];
      cells.forEach(([pt, layer, el], i) => {
        const r = L.rect((i % 4) * 120, Math.floor(i / 4) * 120, 100, 100, el);
        L.style(r, [layer ? [pt, layer] : pt], [[[0, 0, 0], { _bw: 2 }]]);
        L.insert(r);
      });
      L.insert(L.style(L.rect(360, 120, 100, 100), [], [[[0, 0, 0], { _bw: 2 }]]));
    },
  },
  {
    name: "fills-gradients",
    features: [
      "linear gradients: two and five stops, angles 0/45/90 deg, stop opacity, scale",
      "radial gradients: centered, moved center, focal point, scale",
      "angular gradients (WebGL) with start angle",
      "gradient border",
    ],
    covers: [
      "ENG-GRAD-001",
      "ENG-GRAD-002",
      "ENG-GRAD-003",
      "ENG-GRAD-004",
      "EDT-PAINT-027",
      "EDT-GL-007",
      "EDT-GL-011",
      "ENG-SER-005",
    ],
    build: (L) => {
      const two = [
        [0, [255, 200, 0]],
        [1, [200, 0, 120]],
      ];
      const five = [
        [0, [255, 0, 0]],
        [0.25, [255, 255, 0]],
        [0.5, [0, 255, 0], 0.5],
        [0.75, [0, 0, 255]],
        [1, [255, 0, 255], 0],
      ];
      const fills = [
        L.linear(two),
        L.linear(five, Math.PI / 4),
        L.linear(two, Math.PI / 2, 0.5),
        L.radial(two),
        L.radial(five, 0.8, 0.3, 0.7),
        L.radial(two, 0.5, 0.5, 0.5, 0.2, 0.2),
        L.angular(five),
        L.angular(two, Math.PI / 3, 0.8),
      ];
      fills.forEach((pt: unknown, i: number) => {
        L.insert(L.style(L.rect((i % 4) * 120, Math.floor(i / 4) * 120, 100, 100), [pt], []));
      });
      L.insert(
        L.style(
          L.ellipse(480, 0, 140, 220),
          [L.linear(five, -Math.PI / 6)],
          [[L.linear(two), { _bw: 6 }]],
        ),
      );
    },
  },
  {
    name: "fills-textures",
    features: [
      "texture fills from the PNG and the JPEG fixture: tile, fill, fit, stretch",
      "repeat-x and repeat-y",
      "texture with angle and tile size",
      "vector texture (a node as pattern)",
      "texture used as a mask over a lower fill layer",
      "noise fills: original, black, white, color, with amounts",
      "page-background pattern (GBackground)",
    ],
    covers: [
      "ENG-PATTERN-001",
      "ENG-PATTERN-002",
      "ENG-PATTERN-003",
      "ENG-PATTERN-004",
      "ENG-FILL-002",
      "ENG-EFFECT-018",
      "EDT-PAINT-026",
      "EDT-PAINT-027",
      "FMT-GVD-010",
    ],
    build: (L, a) => {
      const T = L.G.GTexturePattern;
      const tex = (url: string, mode: string) =>
        L.texture(url, (t: Lib) => T.ScaleSettings[mode](t));
      const fills = [
        tex(a.png.url, "tile"),
        tex(a.jpeg.url, "fill"),
        tex(a.jpeg.url, "fit"),
        tex(a.png.url, "stretch"),
        L.texture(a.png.url, (t: Lib) => {
          T.ScaleSettings.tile(t);
          t.setRepeatMode(T.RepeatMode.Horizontal);
        }),
        L.texture(a.png.url, (t: Lib) => {
          T.ScaleSettings.tile(t);
          t.setRepeatMode(T.RepeatMode.Vertical);
        }),
        L.texture(a.jpeg.url, (t: Lib) => {
          T.ScaleSettings.tile(t);
          t.setAngle(Math.PI / 6);
          t.setTileSize(0.5);
        }),
      ];
      fills.forEach((pt: unknown, i: number) => {
        L.insert(L.style(L.rect((i % 4) * 120, Math.floor(i / 4) * 120, 100, 100), [pt], []));
      });
      // Vector texture: a small star.
      const star = L.polygon(10, 10, 10, { pts: 5, ir: 4 });
      L.clearStyle(star);
      L.fill(star, L.rgb(220, 40, 40));
      L.insert(
        L.style(
          L.rect(360, 120, 100, 100),
          [[255, 250, 230], L.texture(star, (t: Lib) => T.ScaleSettings.tile(t))],
          [],
        ),
      );
      // Mask: a texture fill layer with the mask flag over a gradient.
      const mask = L.texture(a.png.url, (t: Lib) => {
        T.ScaleSettings.stretch(t);
        t.setMask(true);
      });
      L.insert(
        L.style(
          L.rect(0, 240, 100, 100),
          [
            L.linear([
              [0, [0, 80, 200]],
              [1, [0, 200, 120]],
            ]),
            mask,
          ],
          [],
        ),
      );
      ["original", "black", "white", "color"].forEach((type: string, i: number) => {
        L.insert(
          L.style(
            L.rect(120 + i * 120, 240, 100, 100),
            [[90, 140, 200], L.noise(type, 0.3 + i * 0.2)],
            [],
          ),
        );
      });
      L.insert(L.style(L.rect(0, 360, 100, 100), [L.background()], [[[0, 0, 0], { _bw: 1 }]]));
    },
  },
  {
    name: "fills-multiple",
    features: [
      "three stacked fills with own opacity and blend modes",
      "a hidden fill layer between visible ones",
      "fill layer with blend mode color (separate layer)",
      "fill pattern transform (_px) on a gradient",
    ],
    covers: ["ENG-FILL-001", "ENG-STYLE-005", "ENG-STYLE-006", "ENG-BLEND-004", "ENG-STYLE-003"],
    build: (L) => {
      const G = L.G;
      const blueGreen = L.linear(
        [
          [0, [0, 0, 255]],
          [1, [0, 255, 0]],
        ],
        Math.PI / 4,
      );
      const glow = L.radial([
        [0, [255, 255, 255]],
        [1, [255, 255, 255], 0],
      ]);
      L.insert(
        L.style(
          L.rect(0, 0, 160, 120),
          [
            [230, 80, 40],
            [blueGreen, { _op: 0.6, _bl: "multiply" }],
            [glow, { _bl: "screen" }],
          ],
          [],
        ),
      );
      const fade = L.linear([
        [0, [255, 255, 0], 0.2],
        [1, [128, 0, 128]],
      ]);
      L.insert(
        L.style(
          L.rect(200, 0, 160, 120),
          [
            [40, 200, 200],
            [[255, 0, 0], { _vs: false }],
            [fade, { _op: 0.8 }],
          ],
          [],
        ),
      );
      const bw = L.linear([
        [0, [0, 0, 0]],
        [1, [255, 255, 255]],
      ]);
      L.insert(L.style(L.ellipse(400, 0, 160, 120), [bw, [[255, 0, 0], { _bl: "color" }]], []));
      const orange = L.linear([
        [0, [255, 120, 0]],
        [1, [0, 40, 160]],
      ]);
      L.insert(
        L.style(
          L.rect(0, 160, 160, 120),
          [[orange, { _px: new G.GTransform(0.5, 0, 0, 0.5, 0.25, 0.25) }]],
          [],
        ),
      );
    },
  },
  {
    name: "borders-alignment-width",
    features: [
      "borders centered, inside and outside",
      "border widths 1, 4, 12, 0.5",
      "border scaling with the object (_bs)",
      "outside border on an open path",
    ],
    covers: [
      "ENG-BORDER-001",
      "ENG-BORDER-002",
      "ENG-BORDER-005",
      "ENG-BORDER-006",
      "ENG-STYLE-011",
      "EDT-PAINT-031",
    ],
    build: (L) => {
      const aligns = ["C", "I", "O"];
      const widths = [1, 4, 12, 0.5];
      aligns.forEach((ba: string, i: number) => {
        widths.forEach((bw: number, j: number) => {
          L.insert(
            L.style(
              L.rect(j * 120, i * 110, 90, 80),
              [[230, 230, 250]],
              [[[30, 30, 120], { _bw: bw, _ba: ba }]],
            ),
          );
        });
      });
      L.insert(
        L.style(
          L.rect(480, 0, 90, 80),
          [[250, 230, 230]],
          [[[120, 30, 30], { _bw: 6, _bs: true }]],
        ),
      );
      L.insert(
        L.style(
          L.path(
            [
              [480, 120],
              [560, 160],
              [480, 200],
            ],
            false,
          ),
          [],
          [[[0, 0, 0], { _bw: 8, _ba: "O" }]],
        ),
      );
    },
  },
  {
    name: "borders-caps-joins-dashes",
    features: [
      "line caps butt, round, square",
      "line joins miter, bevel, round",
      "miter limits 1 and 10",
      "dash arrays [10,5], [2,2], [20,5,5,5] (the last with round caps)",
    ],
    covers: [
      "ENG-BORDER-001",
      "ENG-BORDER-003",
      "ENG-BORDER-005",
      "EDT-PAINT-002",
      "EDT-PAINT-031",
    ],
    build: (L) => {
      ["butt", "round", "square"].forEach((cap: string, i: number) => {
        L.insert(
          L.style(
            L.path(
              [
                [0, i * 40],
                [200, i * 40],
              ],
              false,
            ),
            [],
            [[[0, 0, 0], { _bw: 16, _blc: cap }]],
          ),
        );
      });
      ["miter", "bevel", "round"].forEach((join: string, i: number) => {
        const x = 260 + i * 100;
        L.insert(
          L.style(
            L.path(
              [
                [x, 100],
                [x + 40, 0],
                [x + 80, 100],
              ],
              false,
            ),
            [],
            [[[0, 0, 0], { _bw: 14, _blj: join }]],
          ),
        );
      });
      [1, 10].forEach((ml: number, i: number) => {
        const x = 560 + i * 80;
        L.insert(
          L.style(
            L.path(
              [
                [x, 100],
                [x + 20, 0],
                [x + 40, 100],
              ],
              false,
            ),
            [],
            [[[90, 0, 0], { _bw: 10, _bml: ml }]],
          ),
        );
      });
      const dashes = [
        [10, 5],
        [2, 2],
        [20, 5, 5, 5],
      ];
      dashes.forEach((d: number[], i: number) => {
        L.insert(
          L.style(
            L.rect(i * 140, 160, 120, 80),
            [],
            [[[0, 60, 160], { _bw: 3, _bds: d, _blc: i === 2 ? "round" : "butt" }]],
          ),
        );
      });
    },
  },
  {
    name: "borders-markers",
    features: [
      "all eleven head and tail markers (C, B, D, L, LD, A, AF, AL, ADL, ALB, AP)",
      "marker scale, offset and inside settings",
      "markers on a curved path",
    ],
    covers: ["ENG-BORDER-004", "ENG-BORDER-005"],
    build: (L) => {
      const markers = ["C", "B", "D", "L", "LD", "A", "AF", "AL", "ADL", "ALB", "AP"];
      const line = (y: number) =>
        L.path(
          [
            [40, y],
            [260, y],
          ],
          false,
        );
      markers.forEach((m: string, i: number) => {
        L.insert(L.style(line(i * 36), [], [[[0, 0, 0], { _bw: 3, _bhm: m, _btm: m }]]));
      });
      const right = (y: number) =>
        L.path(
          [
            [340, y],
            [540, y],
          ],
          false,
        );
      L.insert(
        L.style(
          right(0),
          [],
          [[[150, 0, 0], { _bw: 3, _bhm: "A", _btm: "C", _bhms: 2, _btms: 0.5 }]],
        ),
      );
      L.insert(
        L.style(
          right(60),
          [],
          [[[0, 120, 0], { _bw: 3, _bhm: "AF", _btm: "D", _bhmo: true, _btmo: true }]],
        ),
      );
      L.insert(
        L.style(
          right(120),
          [],
          [[[0, 0, 150], { _bw: 3, _bhm: "ALB", _btm: "B", _bhmi: 0, _btmi: 0 }]],
        ),
      );
      const curve = L.path(
        [
          { x: 340, y: 200, tp: "TS", hrx: 400, hry: 140 },
          { x: 540, y: 260, tp: "TS", hlx: 480, hly: 320 },
        ],
        false,
      );
      L.insert(L.style(curve, [], [[[0, 0, 0], { _bw: 4, _bhm: "AP", _btm: "AL" }]]));
    },
  },
  {
    name: "borders-multiple",
    features: [
      "three stacked border layers with different widths and alignments",
      "gradient borders",
      "border layer opacity, blend mode and a hidden border layer",
    ],
    covers: ["ENG-BORDER-001", "ENG-STYLE-006", "ENG-BLEND-004", "ENG-BLEND-005"],
    build: (L) => {
      L.insert(
        L.style(
          L.ellipse(0, 0, 160, 120),
          [[250, 250, 210]],
          [
            [[0, 0, 0], { _bw: 18, _ba: "O" }],
            [[255, 200, 0], { _bw: 10 }],
            [[200, 0, 0], { _bw: 3, _ba: "I" }],
          ],
        ),
      );
      const rb = L.linear([
        [0, [255, 0, 0]],
        [1, [0, 0, 255]],
      ]);
      const wb = L.radial([
        [0, [255, 255, 255]],
        [1, [0, 0, 0]],
      ]);
      L.insert(
        L.style(
          L.rect(200, 0, 160, 120),
          [],
          [
            [rb, { _bw: 12 }],
            [wb, { _bw: 4, _ba: "O", _op: 0.5, _bl: "multiply" }],
            [[0, 255, 0], { _bw: 20, _vs: false }],
          ],
        ),
      );
    },
  },
  {
    name: "effects-shadows",
    features: [
      "drop shadows: default, offset with blur, colored with opacity, zero radius",
      "inner shadows: default, offset, colored",
      "drop and inner shadow on the same element",
      "drop shadow on an open path",
    ],
    covers: [
      "EDT-RENDER-018",
      "EDT-PAINT-020",
      "EDT-PAINT-023",
      "EDT-PAINT-025",
      "ENG-EFFECT-001",
      "ENG-EFFECT-002",
      "ENG-EFFECT-004",
      "ENG-EFFECT-005",
      "ENG-EFFECT-048",
      "EDT-RENDER-015",
      "EDT-RENDER-017",
      "EDT-GL-013",
      "EDT-PAINT-041",
    ],
    build: (L) => {
      const G = L.G;
      const cell = (i: number) =>
        L.style(
          L.rect((i % 4) * 140, Math.floor(i / 4) * 140, 100, 100),
          [[250, 250, 250]],
          [[[0, 0, 0], { _bw: 1 }]],
        );
      const drops = [
        {},
        { r: 10, x: 8, y: 8 },
        { r: 4, x: -6, y: 6, pat: L.rgb(255, 0, 0), opc: 0.9 },
        { r: 0, x: 10, y: 10 },
      ];
      drops.forEach((p: Record<string, unknown>, i: number) => {
        const c = cell(i);
        L.fx(c, G.GDropShadowEffect, p);
        L.insert(c);
      });
      const inners = [{}, { r: 12, x: 6, y: 6 }, { r: 8, pat: L.rgb(0, 0, 255), opc: 0.8 }];
      inners.forEach((p: Record<string, unknown>, i: number) => {
        const c = cell(4 + i);
        L.fx(c, G.GInnerShadowEffect, p);
        L.insert(c);
      });
      const both = cell(7);
      L.fx(both, G.GDropShadowEffect, { r: 6, x: 4, y: 4 });
      L.fx(both, G.GInnerShadowEffect, { r: 6, x: -4, y: -4, pat: L.rgb(255, 120, 0) });
      L.insert(both);
      const p = L.style(
        L.path(
          [
            [0, 300],
            [120, 260],
            [240, 320],
          ],
          false,
        ),
        [],
        [[[0, 120, 0], { _bw: 6 }]],
      );
      L.fx(p, G.GDropShadowEffect, { r: 3, x: 0, y: 8 });
      L.insert(p);
    },
  },
  {
    name: "effects-blur-overlay-mirror",
    features: [
      "blur with and without clip to shape (b)",
      "overlay with color, with gradient, as alpha mask (alm)",
      "mirror (reflection) with custom height and padding",
      "hidden effect (vs false)",
    ],
    covers: [
      "ENG-EFFECT-001",
      "ENG-EFFECT-002",
      "ENG-EFFECT-003",
      "ENG-EFFECT-006",
      "ENG-EFFECT-007",
      "EDT-GL-012",
    ],
    build: (L, a) => {
      const G = L.G;
      const star = (i: number) =>
        L.style(
          L.polygon(60 + (i % 4) * 140, 60 + Math.floor(i / 4) * 160, 50, { pts: 5, ir: 22 }),
          [[240, 160, 30]],
          [[[90, 40, 0], { _bw: 3 }]],
        );
      const b1 = star(0);
      L.fx(b1, G.GBlurEffect, { r: 6 });
      const b2 = star(1);
      L.fx(b2, G.GBlurEffect, { r: 10, b: true });
      const o1 = star(2);
      L.fx(o1, G.GOverlayEffect, { pat: L.rgb(0, 120, 255), opc: 0.6 });
      const o2 = star(3);
      L.fx(o2, G.GOverlayEffect, {});
      const o3 = star(4);
      L.fx(o3, G.GOverlayEffect, { alm: true });
      const m1 = L.image(140, 120, 100, 63, a.jpeg.url, a.jpeg.w, a.jpeg.h);
      L.fx(m1, G.GMirrorEffect, {});
      const m2 = star(6);
      L.fx(m2, G.GMirrorEffect, { rfh: 0.6, pad: 10, opc: 0.3 });
      const hidden = star(7);
      L.fx(hidden, G.GBlurEffect, { r: 20, vs: false });
      L.insert([b1, b2, o1, o2, o3, m1, m2, hidden]);
    },
  },
  {
    name: "effects-extra-shadows",
    features: [
      "contact shadow with custom radius, angle and offset",
      "curved shadow with custom size, blur, angle, length and curvature",
      "long shadow: default, colored with density and without fade",
    ],
    covers: ["ENG-EFFECT-009", "ENG-EFFECT-010", "ENG-EFFECT-011", "ENG-EFFECT-001"],
    build: (L) => {
      const G = L.G;
      const box = (i: number) =>
        L.style(
          L.rect(40 + (i % 4) * 180, 40 + Math.floor(i / 4) * 180, 100, 100),
          [[120, 200, 250]],
          [[[0, 0, 0], { _bw: 1 }]],
        );
      const list: [unknown, Record<string, unknown>][] = [
        [G.GContactShadowEffect, {}],
        [G.GContactShadowEffect, { r: 12, a: 20, o: 10, opc: 0.5 }],
        [G.GCurvedShadowEffect, {}],
        [G.GCurvedShadowEffect, { s: 2, b: 20, a: 300, l: 12, c: 0.5, pat: L.rgb(80, 0, 0) }],
        [G.GLongShadowEffect, {}],
        [
          G.GLongShadowEffect,
          { l: 100, a: -Math.PI / 6, pat: L.rgb(0, 0, 160), opc: 0.5, den: 2, fdm: false },
        ],
      ];
      list.forEach(([Cls, p], i) => {
        const b = box(i);
        L.fx(b, Cls, p);
        L.insert(b);
      });
    },
  },
  {
    name: "effects-color",
    features: [
      "color grading with custom curves for rgb, r, g and b (cp)",
      "color adjust multi effect (brightness/contrast + hue/saturation)",
      "adjust multi effect (dot screen + sepia + GL blur)",
      "effects targeted at the fill layer and at the border layer (ly)",
    ],
    covers: [
      "ENG-EFFECT-008",
      "ENG-EFFECT-012",
      "ENG-EFFECT-013",
      "ENG-EFFECT-014",
      "ENG-EFFECT-002",
      "ENG-BLEND-004",
      "EDT-PAINT-051",
    ],
    build: (L, a) => {
      const G = L.G;
      const img = (i: number) =>
        L.image((i % 3) * 180, Math.floor(i / 3) * 140, 160, 100, a.jpeg.url, a.jpeg.w, a.jpeg.h);
      const g = img(0);
      L.fx(g, G.GColorGradingEffect, {
        cp: {
          rgb: [
            [0, 0],
            [128, 160],
            [255, 255],
          ],
          r: [
            [0, 30],
            [255, 255],
          ],
          g: [
            [0, 0],
            [255, 220],
          ],
          b: [
            [0, 0],
            [128, 90],
            [255, 255],
          ],
        },
      });
      const ca = img(1);
      const caFx = L.fx(ca, G.GColorAdjustMultiEffect, {});
      caFx.setProperty("GGLBrightnessContrastEffect&shp", { brightness: 0.2, contrast: 0.4 });
      caFx.setProperty("GGLHueSaturationEffect&shp", { hue: 0.5, saturation: -0.3 });
      const ad = img(2);
      const adFx = L.fx(ad, G.GAdjustMultiEffect, {});
      adFx.setProperty("GGLDotScreenEffect&shp", { centerX: 50, centerY: 50, angle: 0.3, size: 5 });
      adFx.setProperty("GGLSepiaEffect&shp", { amount: 0.8 });
      adFx.setProperty("GGLBlurEffect&shp", { radius: 2, clip: false });
      L.insert([g, ca, ad]);
      const onFill = L.style(
        L.rect(0, 160, 160, 100),
        [[60, 180, 90]],
        [[[20, 20, 120], { _bw: 10 }]],
      );
      L.fx(onFill, G.GBlurEffect, { r: 6, ly: "F" });
      const onBorder = L.style(
        L.rect(200, 160, 160, 100),
        [[60, 180, 90]],
        [[[20, 20, 120], { _bw: 10 }]],
      );
      L.fx(onBorder, G.GDropShadowEffect, { r: 4, x: 6, y: 6, ly: "B" });
      L.insert([onFill, onBorder]);
    },
  },
  ...[
    [
      "effects-webgl-1",
      [
        ["GGLBlurEffect", { radius: 8 }],
        ["GGLBlurEffect", { radius: 6, clip: true }],
        ["GGLColorAdjustEffect", { brightness: 0.2, contrast: 0.3, hue: 0.4, saturation: -0.3 }],
        ["GGLNoiseEffect", { amount: 0.7 }],
        ["GGLSepiaEffect", { amount: 0.9 }],
        ["GGLBrightnessContrastEffect", { brightness: -0.2, contrast: 0.5 }],
        ["GGLDotScreenEffect", { angle: 0.5, size: 6 }],
        ["GGLHueSaturationEffect", { hue: 0.5, saturation: 0.4 }],
        ["GGLZoomBlurEffect", { strength: 0.4, centerX: 30 }],
      ],
      [
        "ENG-EFFECT-016",
        "ENG-EFFECT-017",
        "ENG-EFFECT-018",
        "ENG-EFFECT-019",
        "ENG-EFFECT-020",
        "ENG-EFFECT-021",
        "ENG-EFFECT-022",
        "ENG-EFFECT-023",
      ],
    ],
    [
      "effects-webgl-2",
      [
        ["GGLBulgePinchEffect", { strength: -0.6, radius: 70 }],
        ["GGLEdgeWorkEffect", { radius: 4 }],
        ["GGLColorHalfToneEffect", { size: 8, angle: 0.3 }],
        ["GGLHexagonalEffect", { scale: 6 }],
        ["GGLInnerGlowEffect", { radius: 10, intensity: 1.5, color: [255, 0, 0] }],
        ["GGLToonEffect", { threshold: 0.4, quantization: 6 }],
        ["GGLBloomEffect", { bloomIntensity: 1.8, blurRadius: 8 }],
        ["GGLTrueBlurEffect", { radius: 9 }],
      ],
      [
        "ENG-EFFECT-024",
        "ENG-EFFECT-025",
        "ENG-EFFECT-026",
        "ENG-EFFECT-027",
        "ENG-EFFECT-028",
        "ENG-EFFECT-029",
        "ENG-EFFECT-030",
        "ENG-EFFECT-031",
      ],
    ],
    [
      "effects-webgl-3",
      [
        ["GGLDenoiseEffect", { exponent: 4 }],
        ["GGLOuterGlowEffect", { radius: 12, color: [0, 200, 255], intensity: 1.4 }],
        ["GGLSwirlEffect", { angle: 2, radius: 80 }],
        ["GGLVignetteEffect", { size: 0.4, amount: 0.8 }],
        [
          "GGLStrokeLayerEffect",
          { width: 6, color: [255, 0, 0], placement: { type: "dropdown", value: 1 } },
        ],
        ["GGLInkEffect", { strength: 0.8 }],
        ["GGLUnsharpMaskEffect", { radius: 20, strength: 2 }],
        ["GGLVibranceEffect", { amount: -0.6 }],
      ],
      [
        "ENG-EFFECT-032",
        "ENG-EFFECT-033",
        "ENG-EFFECT-034",
        "ENG-EFFECT-035",
        "ENG-EFFECT-036",
        "ENG-EFFECT-037",
        "ENG-EFFECT-038",
        "ENG-EFFECT-039",
      ],
    ],
    [
      "effects-webgl-4",
      [
        ["GGLSketchEffect", { strength: 1.2 }],
        ["GGLLensBlurEffect", { radius: 12, brightness: 0.3, angle: 0.5 }],
        ["GGLTiltShiftEffect", { blurRadius: 20, gradientRadius: 40 }],
        ["GGLRecolourEffect", { hue: 0.3, saturation: 0.8 }],
        ["GGLBendEffect", { strengthX: 0.8, strengthY: 0.3 }],
        ["GGLDrunkEffect", { strengthX: 0.7, strengthY: 0.4 }],
        ["GGLFisheyeEffect", { strength: 70 }],
        ["GGLBendBlurEffect", { bend: 30, radius: 60 }],
      ],
      [
        "ENG-EFFECT-040",
        "ENG-EFFECT-041",
        "ENG-EFFECT-042",
        "ENG-EFFECT-043",
        "ENG-EFFECT-044",
        "ENG-EFFECT-045",
        "ENG-EFFECT-046",
        "ENG-EFFECT-047",
      ],
    ],
  ].map(([name, effects, covers]): CorpusDocument => ({
    name: name as string,
    features: [
      "each WebGL effect on the JPEG image and on a star with a border, with non-default shader parameters: " +
        (effects as [string, unknown][]).map(([n, p]) => `${n} ${JSON.stringify(p)}`).join(", "),
    ],
    covers: [
      ...(covers as string[]),
      "ENG-EFFECT-015",
      "EDT-GL-005",
      "EDT-GL-006",
      "EDT-GL-007",
      "EDT-GL-009",
      "EDT-GL-010",
      "EDT-GL-011",
      "EDT-GL-014",
    ],
    build: new Function(
      "L",
      "a",
      `const list = ${JSON.stringify(effects)};
        list.forEach(([cls, shp], i) => {
          const Cls = L.G[cls] || L.nodeClass(cls);
          const x = (i % 4) * 180;
          const y = Math.floor(i / 4) * 260;
          const img = L.image(x, y, 160, 100, a.jpeg.url, a.jpeg.w, a.jpeg.h);
          L.fx(img, Cls, null, shp);
          const star = L.style(L.polygon(x + 80, y + 180, 60, { pts: 5, ir: 26 }), [[240, 160, 30]], [[[40, 40, 160], { _bw: 4 }]]);
          L.fx(star, Cls, null, shp);
          L.insert([img, star]);
        });`,
    ) as CorpusDocument["build"],
  })),
  {
    name: "blend-modes",
    features: [
      "the 16 canvas blend modes as element blend (_sbl) over a striped background",
      "the 12 WebGL-only blend modes as element blend",
    ],
    covers: [
      "ENG-BLEND-001",
      "ENG-BLEND-002",
      "ENG-BLEND-004",
      "ENG-STYLE-002",
      "EDT-PAINT-003",
      "EDT-PAINT-004",
      "EDT-PAINT-046",
      "EDT-PAINT-047",
      "EDT-PAINT-048",
    ],
    build: (L) => {
      const modes = [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
        "hue",
        "saturation",
        "color",
        "luminosity",
        "linear_burn",
        "linear_dodge",
        "vivid_light",
        "linear_light",
        "pin_light",
        "divide",
        "add",
        "subtract",
        "hardmix",
        "power",
        "harmonic",
        "sin",
      ];
      const stripes = L.linear([
        [0, [255, 0, 0]],
        [0.33, [255, 255, 0]],
        [0.66, [0, 160, 255]],
        [1, [40, 40, 40]],
      ]);
      L.insert(L.style(L.rect(-10, -10, 7 * 90 + 10, 4 * 90 + 10), [stripes], []));
      modes.forEach((m: string, i: number) => {
        const top = L.ellipse((i % 7) * 90, Math.floor(i / 7) * 90, 80, 80, { _sbl: m });
        L.insert(
          L.style(
            top,
            [
              L.radial([
                [0, [255, 255, 255]],
                [1, [120, 0, 200]],
              ]),
            ],
            [],
          ),
        );
      });
    },
  },
  {
    name: "blend-layers-opacity",
    features: [
      "fill layer blend modes (_bl) multiply, screen, overlay, difference, color, luminosity over a lower fill",
      "element total opacity 0.25/0.5/0.75 and fill opacity with a border",
      "paint layer opacity",
      "gradient stop opacity",
    ],
    covers: [
      "ENG-BLEND-004",
      "ENG-BLEND-005",
      "ENG-STYLE-002",
      "ENG-STYLE-005",
      "EDT-RENDER-015",
      "EDT-RENDER-017",
      "EDT-PAINT-025",
    ],
    build: (L) => {
      const base = L.linear([
        [0, [255, 120, 0]],
        [1, [0, 80, 200]],
      ]);
      ["multiply", "screen", "overlay", "difference", "color", "luminosity"].forEach(
        (m: string, i: number) => {
          L.insert(L.style(L.rect(i * 110, 0, 100, 100), [base, [[90, 200, 120], { _bl: m }]], []));
        },
      );
      [0.25, 0.5, 0.75].forEach((o: number, i: number) => {
        L.insert(
          L.style(
            L.rect(i * 110, 130, 100, 100, { _stop: o }),
            [[200, 40, 40]],
            [[[0, 0, 0], { _bw: 8 }]],
          ),
        );
        L.insert(
          L.style(
            L.rect(i * 110 + 330, 130, 100, 100, { _sfop: o }),
            [[200, 40, 40]],
            [[[0, 0, 0], { _bw: 8 }]],
          ),
        );
      });
      L.insert(
        L.style(
          L.rect(0, 260, 100, 100),
          [[[0, 0, 0], { _op: 0.3 }]],
          [[[0, 0, 255], { _bw: 6, _op: 0.5 }]],
        ),
      );
      L.insert(
        L.style(
          L.rect(110, 260, 220, 100),
          [
            L.linear([
              [0, [0, 0, 0], 1],
              [0.5, [255, 0, 0], 0.5],
              [1, [0, 0, 255], 0],
            ]),
          ],
          [],
        ),
      );
    },
  },
  {
    name: "text-layout",
    features: [
      "auto-width single line and multi-line text",
      "fixed-width text that wraps (aw false)",
      "fixed boxes with vertical align top, middle, bottom (ah false, va t/m/b)",
      "paragraph alignment left, center, right, justify (_pal)",
      "auto-fit font size (afs)",
    ],
    covers: [
      "ENG-NODE-033",
      "ENG-TEXT-001",
      "ENG-TEXT-004",
      "ENG-TEXT-011",
      "ENG-TEXT-014",
      "ENG-TEXT-016",
      "ENG-FONT-001",
      "ENG-FONT-002",
      "ENG-FONT-003",
      "FMT-GVD-012",
    ],
    build: (L) => {
      const lorem =
        "Gravit Designer draws vector shapes and text on an infinite canvas or on pages.";
      L.insert(L.text(0, 0, "Auto width text"));
      L.insert(L.text(0, 40, "First line\nSecond, longer line\nThird"));
      L.insert(L.text(0, 140, lorem, { aw: false, w: 220 }));
      ["t", "m", "b"].forEach((va: string, i: number) => {
        const t = L.text(260 + i * 160, 0, "Box " + va, {
          aw: false,
          ah: false,
          w: 140,
          h: 120,
          va,
        });
        L.style(t, [], [[[200, 200, 200], { _bw: 1 }]]);
        L.insert(t);
      });
      ["l", "c", "r", "j"].forEach((pal: string, i: number) => {
        L.insert(
          L.text(260 + (i % 2) * 260, 150 + Math.floor(i / 2) * 130, lorem, {
            aw: false,
            w: 240,
            _pal: pal,
            _tfi: 14,
          }),
        );
      });
      L.insert(L.text(0, 300, "Fit me", { aw: false, ah: false, w: 200, h: 80, afs: true }));
    },
  },
  {
    name: "text-character-styles",
    features: [
      "element-wide font size, weights 300/600/700/800, italic",
      "letter spacing, word spacing, line height, paragraph spacing, first-line indent",
      "font color, text with a gradient fill, a border and a drop shadow",
      "underline and strikeout on the whole text",
      "uppercase, lowercase, capitalize, small caps (_ttrf)",
    ],
    covers: [
      "ENG-TEXT-003",
      "ENG-TEXT-004",
      "ENG-TEXT-005",
      "ENG-TEXT-007",
      "ENG-TEXT-008",
      "ENG-FONT-001",
      "ENG-FONT-002",
    ],
    build: async (L) => {
      const G = L.G;
      await L.fonts([
        ["Open Sans", "N", 300],
        ["Open Sans", "N", 600],
        ["Open Sans", "N", 700],
        ["Open Sans", "N", 800],
        ["Open Sans", "I", 400],
        ["Open Sans", "I", 700],
      ]);
      const rows: Record<string, unknown>[] = [
        { _tfi: 32 },
        { _tfw: 300 },
        { _tfw: 600 },
        { _tfw: 700 },
        { _tfw: 800 },
        { _tfs: "I" },
        { _tfs: "I", _tfw: 700 },
        { _tcs: 6 },
        { _tws: 20 },
        { _tdu: true },
        { _tds: true },
        { _fc: L.rgb(220, 30, 90) },
        { _ttrf: "u" },
        { _ttrf: "l" },
        { _ttrf: "c" },
        { _ttrf: "s" },
      ];
      rows.forEach((p: Record<string, unknown>, i: number) => {
        L.insert(
          L.text((i % 2) * 320, Math.floor(i / 2) * 46, "Sample text " + JSON.stringify(p), {
            ...p,
          }),
        );
      });
      const para = L.text(660, 0, "Line height and spacing\nSecond paragraph\nThird paragraph", {
        aw: false,
        w: 260,
        _plh: 1.8,
        _pas: "12",
        _pai: 24,
      });
      L.insert(para);
      const fancy = L.text(660, 200, "FILLED", { _tfi: 64, _tfw: 800 });
      L.style(
        fancy,
        [
          L.linear([
            [0, [255, 0, 0]],
            [1, [0, 0, 255]],
          ]),
        ],
        [[[0, 0, 0], { _bw: 2 }]],
      );
      L.fx(fancy, G.GDropShadowEffect, { r: 4, x: 4, y: 4 });
      L.insert(fancy);
    },
  },
  {
    name: "text-runs",
    features: [
      "rich text runs with mixed size, weight, style and color",
      "per-run underline, strikeout, superscript and subscript",
      "per-run letter spacing and text transform",
      "ligatures and fractions on (OpenType features)",
      "runs set through text ranges like the inspector does",
    ],
    covers: [
      "ENG-TEXT-006",
      "ENG-TEXT-007",
      "ENG-TEXT-008",
      "ENG-TEXT-011",
      "ENG-TEXT-016",
      "ENG-TEXT-017",
      "ENG-TEXT-018",
    ],
    build: async (L) => {
      await L.fonts([
        ["Open Sans", "N", 700],
        ["Open Sans", "I", 400],
        ["Open Sans", "N", 300],
      ]);
      L.insert(
        L.text(0, 0, [
          { text: "Bold ", fontWeight: 700, fontSize: 28 },
          { text: "italic ", fontStyle: "italic", fontSize: 28, fontColor: L.rgb(200, 0, 0) },
          { text: "light ", fontWeight: 300, fontSize: 28 },
          { text: "small", fontSize: 12 },
        ]),
      );
      L.insert(
        L.text(0, 60, [
          { text: "under ", underline: true, fontSize: 24 },
          { text: "strike ", strikeout: true, fontSize: 24 },
          { text: "E=mc", fontSize: 24 },
          { text: "2", script: "super", fontSize: 24 },
          { text: " H", fontSize: 24 },
          { text: "2", script: "sub", fontSize: 24 },
          { text: "O", fontSize: 24 },
        ]),
      );
      L.insert(
        L.text(0, 120, [
          { text: "spaced ", charSpacing: 8, fontSize: 24 },
          { text: "upper ", transformation: "u", fontSize: 24 },
          { text: "Small Caps", transformation: "s", fontSize: 24 },
        ]),
      );
      L.insert(
        L.text(0, 180, [
          { text: "office fluff 1/2 3/4 ", ligatures: true, fractions: true, fontSize: 24 },
          { text: "office fluff 1/2 3/4", fontSize: 24 },
        ]),
      );
      const ranged = L.text(0, 240, "Ranges styled like the inspector", { _tfi: 24 });
      L.insert(ranged);
      const tl = ranged.getTLCore();
      tl.getRange(0, 6).setFormatting(["fontWeight", "fontColor"], [700, L.rgb(0, 120, 0)]);
      tl.getRange(7, 13).setFormatting(["fontSize"], [36]);
      tl.getRange(14, 18).setFormatting(["underline"], [true]);
    },
  },
  {
    name: "text-lists",
    features: [
      "lists with markers Bullet, Check, Square, Number, RomanBracket, RomanDot",
      "nested list depth (increaseList)",
    ],
    covers: ["ENG-TEXT-009", "ENG-TEXT-010", "ENG-TEXT-016"],
    build: (L) => {
      ["Bullet", "Check", "Square", "Number", "RomanBracket", "RomanDot"].forEach(
        (m: string, i: number) => {
          const t = L.text(
            (i % 3) * 240,
            Math.floor(i / 3) * 160,
            "First item\nSecond item\nThird item",
            { _tfi: 16 },
          );
          L.insert(t);
          t.getTLCore().getDocumentRange().toggleList(m);
          if (i === 3) t.getTLCore().getRange(11, 22).increaseList();
        },
      );
    },
  },
  {
    name: "text-on-path",
    features: [
      "text attached to an open curve with Modify > Attach Text to Path",
      "text attached to an ellipse, inside, with an offset",
    ],
    covers: ["ENG-TEXT-012", "ENG-SCENE-008", "ACT-TEXT-001"],
    build: (L) => {
      const curve = L.style(
        L.path(
          [
            { x: 0, y: 100, tp: "TS", hrx: 80, hry: -20 },
            { x: 300, y: 100, tp: "TS", hlx: 220, hly: 220 },
          ],
          false,
        ),
        [],
        [[[180, 180, 180], { _bw: 1 }]],
      );
      const t1 = L.text(0, 0, "Text that follows a curved path", { _tfi: 18 });
      L.insert([curve, t1]);
      L.select([t1, curve]);
      L.run("modify.attachToPath");
      const ring = L.style(L.ellipse(360, 0, 220, 220), [], [[[180, 180, 180], { _bw: 1 }]]);
      const t2 = L.text(360, 0, "Around the ellipse, inside", { _tfi: 16 });
      L.insert([ring, t2]);
      L.select([t2, ring]);
      L.run("modify.attachToPath");
      L.props(t2, { tpths: "inside", tptho: 6 });
    },
  },
  {
    name: "text-scripts",
    features: [
      "right-to-left Arabic and Hebrew text (Noto Sans Arabic/Hebrew)",
      "mixed left-to-right and right-to-left runs",
      "CJK text (Noto Sans CJK SC)",
      "text direction rtl on the element",
    ],
    covers: ["ENG-TEXT-013", "ENG-TEXT-018", "ENG-TEXT-019", "ENG-FONT-001", "ENG-FONT-003"],
    build: async (L) => {
      await L.fonts([
        ["Noto Sans Arabic", "N", 400],
        ["Noto Sans Hebrew", "N", 400],
        ["Noto Sans CJK SC", "N", 400],
      ]);
      L.insert(L.text(0, 0, "مرحبا بالعالم", { _tff: "Noto Sans Arabic", _tfi: 32 }));
      L.insert(L.text(0, 70, "שלום עולם", { _tff: "Noto Sans Hebrew", _tfi: 32 }));
      L.insert(
        L.text(0, 140, [
          { text: "Hello ", fontSize: 24 },
          { text: "مرحبا", fontFamily: "Noto Sans Arabic", fontSize: 24 },
          { text: " world", fontSize: 24 },
        ]),
      );
      L.insert(L.text(0, 200, "你好世界", { _tff: "Noto Sans CJK SC", _tfi: 32 }));
      L.insert(
        L.text(0, 270, "مرحبا بالعالم سطر ثان", {
          _tff: "Noto Sans Arabic",
          _tfi: 20,
          dir: "rtl",
          aw: false,
          w: 200,
        }),
      );
    },
  },
  {
    name: "symbols",
    features: [
      "symbol master made of a rectangle, an ellipse and a text",
      "instances: plain, moved and scaled, rotated",
      "instance overrides: changed fill, changed text, hidden child (dsb)",
      "nested symbol: a master that contains an instance of another symbol",
    ],
    covers: [
      "EDT-PAINT-039",
      "ENG-NODE-018",
      "ENG-NODE-039",
      "ENG-SYMBOL-001",
      "ENG-SYMBOL-002",
      "ENG-SYMBOL-003",
      "ENG-SYMBOL-006",
      "ENG-SCENE-008",
      "EDT-SYMBOL-001",
    ],
    build: (L) => {
      const G = L.G;
      const ed = L.ed();
      const parent = L.scene().getActiveLayer() || L.page();
      const a = L.style(L.rect(0, 0, 120, 80), [[250, 200, 60]], [[[0, 0, 0], { _bw: 2 }]]);
      const b = L.style(L.ellipse(70, 30, 60, 60), [[60, 140, 240]], []);
      const t = L.text(10, 10, "Card", { _tfi: 18 });
      L.insert([a, b, t]);
      ed.beginTransaction();
      const master = G.GSymbol.create([a, b, t], parent, "Card");
      ed.commitTransaction("Create Symbol");
      const instance = (dx: number, dy: number, extra?: (s: Lib) => void) => {
        L.select([master]);
        const s = L.run("edit.duplicate")[0];
        s.transform(new G.GTransform(1, 0, 0, 1, dx, dy));
        if (extra) extra(s);
        return s;
      };
      instance(160, 0);
      instance(320, 0, (s: Lib) => s.transform(new G.GTransform(1.5, 0, 0, 1.5, -160, 0)));
      instance(0, 160, (s: Lib) => s.transform(new G.GTransform().rotated(0.3)));
      const o = instance(220, 160);
      const kids = o.getChildren();
      const rect = kids.find((k: Lib) => k instanceof G.GRectangle);
      const text = kids.find((k: Lib) => k instanceof G.GText);
      const ell = kids.find((k: Lib) => k instanceof G.GEllipse);
      L.clearStyle(rect);
      L.fill(rect, L.rgb(120, 220, 120));
      text.setText("Changed");
      ell.setProperty("vis", false);
      // Nested: a second master containing an instance of the first.
      const frame = L.style(
        L.rect(-10, 310, 300, 110),
        [[240, 240, 240]],
        [[[0, 0, 0], { _bw: 1 }]],
      );
      L.insert(frame);
      const inner = instance(0, 320);
      ed.beginTransaction();
      const outer = G.GSymbol.create([frame, inner], parent, "Card row");
      ed.commitTransaction("Create Symbol");
      L.select([outer]);
      L.run("edit.duplicate")[0].transform(new G.GTransform(1, 0, 0, 1, 340, 0));
    },
  },
  {
    name: "pages-multiple",
    features: [
      "three fixed-size pages of different sizes, named",
      "content on each page, the second page active when saved (pi)",
      "pages laid out two per row (pgx)",
    ],
    covers: [
      "ENG-NODE-038",
      "ENG-SCENE-004",
      "ENG-SCENE-005",
      "ENG-SER-009",
      "EDT-RENDER-019",
      "EDT-RENDER-048",
      "FMT-GVD-008",
    ],
    build: (L) => {
      const scene = L.scene();
      const p1 = L.fixedPage(400, 300, { name: "Small", bck: L.rgb(255, 255, 255) });
      L.insert(L.style(L.rect(40, 40, 160, 100), [[250, 120, 60]], []));
      const p2 = scene.insertPage();
      L.props(p2, { name: "Wide", w: 600, h: 240, bck: L.rgb(230, 240, 255) });
      scene.setActivePage(p2);
      L.insert(L.style(L.ellipse(100, 40, 300, 160), [[60, 120, 240]], []));
      const p3 = scene.insertPage();
      L.props(p3, { name: "Tall", w: 240, h: 500, bck: L.rgb(240, 255, 230) });
      scene.setActivePage(p3);
      L.insert(L.style(L.polygon(120, 200, 90, { pts: 6 }), [[60, 180, 90]], []));
      scene.setActivePage(p2);
      void p1;
    },
  },
  {
    name: "pages-settings",
    features: [
      "page bleed and margins (bl, ml/mt/mr/mb)",
      "page background gradient with opacity (bck, bop)",
      "transparent page background (chessboard decoration)",
      "content outside the page (clipped in output)",
    ],
    covers: [
      "ENG-NODE-038",
      "ENG-SCENE-005",
      "EDT-RENDER-019",
      "EDT-RENDER-048",
      "EDT-RENDER-049",
      "EDT-PAINT-009",
      "ENG-BLEND-005",
    ],
    build: (L) => {
      const scene = L.scene();
      L.fixedPage(400, 300, {
        name: "Bleed and margins",
        bl: 20,
        ml: 30,
        mt: 20,
        mr: 40,
        mb: 50,
        bck: L.linear([
          [0, [255, 230, 200]],
          [1, [200, 220, 255]],
        ]),
        bop: 0.7,
      });
      L.insert(L.style(L.rect(-40, 100, 200, 100), [[220, 40, 40]], []));
      const p2 = scene.insertPage();
      L.props(p2, {
        name: "Transparent",
        w: 300,
        h: 300,
        bck: null,
        bl: 0,
        ml: 0,
        mt: 0,
        mr: 0,
        mb: 0,
        bop: 1,
      });
      scene.setActivePage(p2);
      L.insert(L.style(L.ellipse(50, 50, 200, 200), [[[40, 160, 90], { _op: 0.6 }]], []));
      scene.setActivePage(scene.getFirstChild());
    },
  },
  {
    name: "pages-grid-guides",
    features: [
      "boxed grid 20 x 20 (gm box, gx, gy)",
      "horizontal and vertical guide lines (hgl, vgl)",
      "fixed page 500 x 400",
    ],
    covers: ["ENG-SCENE-002", "ENG-SCENE-003", "EDT-RENDER-047"],
    build: (L) => {
      const scene = L.scene();
      L.fixedPage(500, 400, { bck: L.rgb(255, 255, 255) });
      scene.setProperties(
        ["gm", "gx", "gy", "hgl", "vgl"],
        ["box", 20, 20, [100, 250], [120, 380]],
      );
      L.insert(L.style(L.rect(120, 100, 260, 150), [[255, 220, 120]], [[[0, 0, 0], { _bw: 1 }]]));
    },
  },
  {
    name: "pages-axonometric-grid",
    features: ["axonometric grid (gm axo) with custom width and angles", "infinite canvas"],
    covers: ["ENG-SCENE-002"],
    build: (L) => {
      L.scene().setProperties(["gm", "gaw", "ga1", "ga2"], ["axo", 30, Math.PI / 5, -Math.PI / 7]);
      L.insert(
        L.style(L.polygon(100, 100, 80, { pts: 6 }), [[180, 220, 255]], [[[0, 0, 0], { _bw: 1 }]]),
      );
    },
  },
  {
    name: "pages-master",
    features: [
      "a master page with a header bar and a footer text",
      "two pages using it as master (page refs, scene links)",
      "a page without a master",
    ],
    covers: ["ENG-SCENE-006", "ENG-SCENE-008", "EDT-RENDER-019", "ENG-SER-008"],
    build: (L) => {
      const scene = L.scene();
      const master = L.fixedPage(400, 300, { name: "Master", bck: L.rgb(255, 255, 255) });
      L.insert(L.style(L.rect(0, 0, 400, 40), [[40, 60, 120]], []));
      L.insert(L.text(20, 260, "Footer from the master", { _tfi: 14 }));
      const pages = [1, 2, 3].map((i: number) => {
        const p = scene.insertPage();
        L.props(p, { name: "Page " + (i + 1), w: 400, h: 300, bck: L.rgb(255, 255, 255) });
        scene.setActivePage(p);
        L.insert(L.style(L.ellipse(100 + i * 30, 80, 160, 120), [[200, 60 * i, 60]], []));
        return p;
      });
      scene.link(master, pages[0]);
      scene.link(master, pages[1]);
      scene.setActivePage(pages[0]);
    },
  },
  {
    name: "pages-master-odd-even",
    features: [
      "scene-wide odd and even master pages (ompg, empg) assigned with reassignMasterPages",
      "four slave pages",
    ],
    covers: ["ENG-SCENE-006", "ENG-SER-008", "FMT-GVD-008"],
    build: (L) => {
      const scene = L.scene();
      const odd = L.fixedPage(300, 200, { name: "Odd master", bck: L.rgb(255, 250, 240) });
      L.insert(L.style(L.rect(0, 0, 40, 200), [[200, 60, 60]], []));
      const even = scene.insertPage();
      L.props(even, { name: "Even master", w: 300, h: 200, bck: L.rgb(240, 250, 255) });
      scene.setActivePage(even);
      L.insert(L.style(L.rect(260, 0, 40, 200), [[60, 60, 200]], []));
      for (let i = 0; i < 4; i++) {
        const p = scene.insertPage();
        L.props(p, { name: "Spread " + (i + 1), w: 300, h: 200 });
        scene.setActivePage(p);
        L.insert(L.text(100, 90, "Page " + (i + 1), { _tfi: 20 }));
      }
      scene.setProperties(["ompg", "empg"], [odd, even]);
      scene.reassignMasterPages();
      scene.setActivePage(scene.getChildByIndex ? scene.getFirstChild() : scene.getFirstChild());
    },
  },
  {
    name: "styles-swatches",
    features: [
      "two shared styles (GStyle in the scene styles) linked to three elements (sref)",
      "an element whose style differs from its linked style",
      "document swatches: RGB, CMYK, gradient",
    ],
    covers: ["ENG-STYLE-007", "ENG-STYLE-008", "ENG-STYLE-009", "FMT-GVD-013", "ENG-SCENE-008"],
    build: (L) => {
      const G = L.G;
      const scene = L.scene();
      const a = L.style(L.rect(0, 0, 100, 80), [[255, 120, 0]], [[[0, 0, 0], { _bw: 3 }]]);
      const b = L.ellipse(140, 0, 100, 80);
      const c = L.polygon(330, 40, 45, { pts: 5 });
      const d = L.style(L.rect(0, 120, 100, 80), [[0, 120, 200]], []);
      L.fx(d, G.GDropShadowEffect, { r: 6, x: 4, y: 4 });
      L.insert([a, b, c, d]);
      const makeStyle = (from: Lib, name: string) => {
        const s = new G.GStyle();
        s.setProperties(["name", "defaultStyle"], [name, false]);
        s.assignStyleFrom(from);
        scene.getStyles().appendChild(s);
        return s;
      };
      const s1 = makeStyle(a, "Orange outlined");
      const s2 = makeStyle(d, "Blue shadow");
      for (const el of [b, c]) {
        el.addStyle(s1.getReferenceId());
      }
      const e = L.rect(140, 120, 100, 80);
      L.insert(e);
      e.addStyle(s2.getReferenceId());
      L.clearStyle(e);
      L.fill(e, L.rgb(255, 0, 0));
      const sw = scene.getSwatches();
      for (const pt of [
        L.rgb(10, 200, 120),
        L.cmyk(0, 0.5, 1, 0),
        L.linear([
          [0, [0, 0, 0]],
          [1, [255, 0, 0]],
        ]),
      ]) {
        sw.appendChild(new G.GSwatch(pt));
      }
    },
  },
  {
    name: "transforms",
    features: [
      "rotated, scaled, skewed and mirrored rectangles with borders",
      "rotated group of shapes",
      "shape with scale-corners off (csc false) scaled non-uniformly",
      "text rotated and scaled",
    ],
    covers: ["ENG-GEOM-003", "ENG-NODE-014", "ENG-NODE-020", "ENG-NODE-021", "ENG-SER-007"],
    build: (L) => {
      const G = L.G;
      const mk = (x: number, t: Lib) => {
        const r = L.style(
          L.rect(x, 0, 80, 60, L.corners("R", 10)),
          [[120, 180, 250]],
          [[[0, 0, 0], { _bw: 3 }]],
        );
        r.transform(
          new G.GTransform(1, 0, 0, 1, -(x + 40), -30)
            .multiplied(t)
            .multiplied(new G.GTransform(1, 0, 0, 1, x + 40, 30)),
        );
        L.insert(r);
      };
      mk(0, new G.GTransform().rotated(Math.PI / 5));
      mk(140, new G.GTransform(1.6, 0, 0, 0.6, 0, 0));
      mk(280, new G.GTransform(1, 0.3, 0.5, 1, 0, 0));
      mk(420, new G.GTransform(-1, 0, 0, 1, 0, 0));
      mk(560, new G.GTransform(1, 0, 0, -1, 0, 0).rotated(0.4));
      const g = L.group([
        L.style(L.rect(0, 140, 80, 80), [[250, 120, 120]], []),
        L.style(L.ellipse(60, 160, 80, 80), [[120, 250, 120]], []),
      ]);
      g.transform(
        new G.GTransform(1, 0, 0, 1, -70, -190)
          .rotated(-0.5)
          .multiplied(new G.GTransform(1, 0, 0, 1, 70, 190)),
      );
      L.insert(g);
      const noCorners = L.style(
        L.rect(220, 140, 80, 80, { ...L.corners("R", 20), csc: false }),
        [[250, 220, 120]],
        [[[0, 0, 0], { _bw: 2 }]],
      );
      noCorners.transform(
        new G.GTransform(1, 0, 0, 1, -220, -140)
          .multiplied(new G.GTransform(2, 0, 0, 0.7, 0, 0))
          .multiplied(new G.GTransform(1, 0, 0, 1, 220, 140)),
      );
      L.insert(noCorners);
      const t = L.text(460, 160, "Rotated text", { _tfi: 24 });
      L.insert(t);
      t.transform(
        new G.GTransform(1, 0, 0, 1, -460, -160)
          .rotated(0.6)
          .multiplied(new G.GTransform(1.3, 0, 0, 1.3, 460, 160)),
      );
    },
  },
  {
    name: "scene-settings",
    features: [
      "document unit millimeters (ut mm), 300 dpi, CMYK color mode (cm)",
      "fixed page in mm, elements whose colors were converted to CMYK",
      "custom page label size and color (lbs, lbc)",
    ],
    covers: [
      "ENG-SCENE-001",
      "ENG-COLOR-007",
      "ENG-COLOR-003",
      "ENG-GEOM-012",
      "ENG-SCENE-018",
      "FMT-GVD-008",
    ],
    build: (L) => {
      const scene = L.scene();
      L.fixedPage(595, 842, { bck: L.rgb(255, 255, 255), name: "A4" });
      L.insert(L.style(L.rect(60, 60, 300, 200), [[220, 40, 40]], [[[0, 0, 120], { _bw: 4 }]]));
      L.insert(
        L.style(
          L.ellipse(100, 320, 300, 300),
          [
            L.linear([
              [0, [0, 200, 100]],
              [1, [255, 220, 0]],
            ]),
          ],
          [],
        ),
      );
      scene.setProperties(["ut", "dpi", "lbs", "lbc"], ["mm", 300, 14, L.rgb(200, 0, 0)]);
      scene.setProperty("cm", "CMYK");
    },
  },
  {
    name: "paths-graph",
    features: ["vector network drawn with the Paths Graph tool: anchors, edges and a closed facet"],
    covers: ["ENG-NODE-043", "ENG-NODE-044", "ENG-NODE-045", "ENG-NODE-046", "ENG-SER-008"],
    build: (L) => {
      L.insert(L.style(L.rect(0, 0, 10, 10), [[200, 200, 200]], []));
    },
    drive: async (page, at) => {
      await page.evaluate(() =>
        (
          window as unknown as { __parity: { app: { activateTool(n: string): boolean } } }
        ).__parity.app.activateTool("GPathsGraphTool"),
      );
      const pts: [number, number][] = [
        [100, 100],
        [300, 100],
        [300, 260],
        [100, 260],
        [100, 100],
      ];
      for (const [x, y] of pts) {
        const [sx, sy] = await at(x, y);
        await page.mouse.move(sx, sy, { steps: 4 });
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(400);
      }
      const [cx, cy] = await at(200, 40);
      await page.mouse.click(cx, cy);
      const [ex, ey] = await at(200, 180);
      await page.mouse.click(ex, ey);
      await page.keyboard.press("Escape");
      await page.evaluate(() =>
        (
          window as unknown as { __parity: { app: { activateTool(n: string): boolean } } }
        ).__parity.app.activateTool("GPointerTool"),
      );
    },
  },
  {
    name: "annotations",
    features: [
      "rectangle, ellipse, arrow and highlighter annotations drawn with the annotation tools (page annotation list annlst)",
    ],
    covers: [
      "ENG-NODE-049",
      "ENG-NODE-051",
      "ENG-NODE-052",
      "ENG-NODE-053",
      "ENG-NODE-054",
      "ENG-NODE-055",
      "EDT-RENDER-004",
    ],
    build: (L) => {
      L.insert(L.style(L.rect(0, 0, 400, 300), [[240, 240, 250]], []));
    },
    drive: async (page, at) => {
      const tool = (name: string) =>
        page.evaluate(
          (n) =>
            (
              window as unknown as { __parity: { app: { activateTool(n: string): boolean } } }
            ).__parity.app.activateTool(n),
          name,
        );
      const drag = async (x1: number, y1: number, x2: number, y2: number) => {
        const [a, b] = await at(x1, y1);
        const [c, d] = await at(x2, y2);
        await page.mouse.move(a, b);
        await page.mouse.down();
        await page.mouse.move((a + c) / 2, (b + d) / 2, { steps: 4 });
        await page.mouse.move(c, d, { steps: 4 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      };
      await tool("GRectangleAnnotationTool");
      await drag(20, 20, 160, 120);
      await tool("GEllipseAnnotationTool");
      await drag(200, 20, 360, 140);
      await tool("GArrowAnnotationTool");
      await drag(40, 260, 200, 180);
      await tool("GHighlighterAnnotationTool");
      await drag(220, 220, 380, 240);
      await tool("GPointerTool");
    },
  },
  {
    name: "structure-group-styles",
    features: [
      "group with total opacity 0.5 over a background",
      "group with a drop shadow and a blur effect",
      "group with blend mode multiply",
      "a second layer on top",
    ],
    covers: [
      "ENG-NODE-036",
      "ENG-NODE-037",
      "ENG-STYLE-001",
      "ENG-STYLE-010",
      "ENG-BLEND-004",
      "ENG-BLEND-005",
      "EDT-RENDER-015",
      "EDT-PCTX-004",
    ],
    build: (L) => {
      const G = L.G;
      const scene = L.scene();
      const bg = L.linear([
        [0, [255, 255, 0]],
        [1, [0, 160, 255]],
      ]);
      L.insert(L.style(L.rect(-20, -20, 640, 200), [bg], []));
      const pair = (x: number) => [
        L.style(L.rect(x, 0, 100, 100), [[220, 40, 40]], []),
        L.style(L.ellipse(x + 50, 50, 100, 100), [[40, 40, 220]], []),
      ];
      L.insert(L.group(pair(0), { _stop: 0.5 }));
      const g2 = L.group(pair(200));
      L.fx(g2, G.GDropShadowEffect, { r: 8, x: 8, y: 8 });
      L.fx(g2, G.GBlurEffect, { r: 2 });
      L.insert(g2);
      L.insert(L.group(pair(400), { _sbl: "multiply" }));
      const layer = new G.GLayer();
      L.page().appendChild(layer);
      scene.setActiveLayer(layer);
      L.insert(L.style(L.rect(100, 40, 400, 60), [[0, 0, 0]], []));
      L.props(layer, { name: "Top layer" });
    },
  },
];

/** Files in files/ that build.ts does not make. */
export const EXTRA_FILES: CorpusDocument[] = [
  {
    name: "walkthrough-sample",
    features: [
      "file saved by the phase-1 walkthrough with File > Download File: default-styled rectangle and ellipse on an infinite canvas",
    ],
    covers: ["ENG-NODE-028", "ENG-NODE-029", "ENG-STYLE-008"],
  },
];
