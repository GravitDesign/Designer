import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// Vertex sources: GVertex commands, GVertexContainer, GVertexTransformer,
// GVertexInfo (bounds, length, segment points, hit tests, collinearity),
// GPathUtil and the pixel aligner.
const scenarios = defineScenarios([
  geo("vertex/container", ["ENG-GEOM-006", "ENG-GEOM-007", "ENG-GEOM-008"], (L, G) => {
    const C = G.GVertexContainer;
    const square = L.rect(0, 0, 10, 10);
    const squareCcw = L.rect(0, 0, 10, 10, true);
    const open = L.poly([0, 0, 10, 0, 10, 10], true);
    const curves = L.vc([
      1, 0, 0, 3, 10, 0, 3, 5, -5, 4, 20, 10, 4, 12, 0, 4, 18, 4, 2, 20, 20, 5, 0, 0,
    ]);
    const multi = L.vc([
      1, 0, 0, 2, 10, 0, 2, 10, 10, 5, 0, 0, 1, 20, 20, 2, 30, 20, 2, 30, 30, 5, 0, 0, 1, 50, 50, 2,
      60, 60,
    ]);
    const sources: Record<string, unknown> = {
      square,
      squareCcw,
      open,
      curves,
      multi,
      ellipse: L.ellipse(5, 5, 4, 2),
    };
    const out: Record<string, unknown> = { commands: G.GVertex.Command };
    for (const [name, s] of Object.entries(sources)) {
      const src = s as {
        isClockWise(): boolean;
        toSVGPath(f?: (v: number) => number): string;
        getCount(): number;
      };
      const ser = C.serialize(src);
      out[name] = {
        count: src.getCount(),
        serialize: L.enc(ser),
        deserialize: L.verts(C.deserialize(ser)),
        cw: src.isClockWise(),
        svg: src.toSVGPath(),
        svgRounded: src.toSVGPath((v: number) => Math.round(v * 10) / 10),
        split: L.run(() => C.splitVertexSource(src).map((x: unknown) => L.verts(x))),
        splitTrf: L.run(() =>
          C.splitVertexSource(src, new G.GTransform(2, 0, 0, 2, 1, 1)).map((x: unknown) =>
            L.verts(x),
          ),
        ),
        splitSame: C.splitVertexSource(src)[0] === src,
        makeCw: L.run(() => L.verts(C.makeClockWise(src))),
        makeCwForce: L.run(() => L.verts(C.makeClockWise(src, true))),
        clone: L.run(() => L.verts(C.clone(src))),
        cloneReversed: L.run(() => L.verts(C.clone(src, true))),
        copy: L.verts(new C(src)),
      };
    }
    // Reading, rewinding and the read index.
    const c = L.vc([1, 1, 1, 2, 2, 2, 2, 3, 3]);
    const v = new G.GVertex();
    const steps: unknown[] = [];
    steps.push(c.hasVertexForRead());
    steps.push(c.rewindVertices(0), c.hasVertexForRead(), c.readVertex(v), L.enc(v));
    steps.push(
      c.rewindVertices(2),
      c.readVertex(v),
      L.enc(v),
      c.readVertex(v),
      c.hasVertexForRead(),
    );
    steps.push(
      c.rewindVertices(3),
      c.readVertex(v),
      c.rewindVertices(4),
      c.rewindVertices(-1),
      c.rewindVertices(),
    );
    c.appendVertices(L.poly([5, 5, 6, 6]));
    steps.push(c.getCount(), L.verts(c));
    c.addVertex(2, 1, 0, new G.GTransform(1, 0, 0, 1, 100, 200));
    c.addVertex(5, 7, 8, new G.GTransform(1, 0, 0, 1, 100, 200));
    steps.push(L.verts(c));
    c.clearVertices();
    steps.push(c.getCount(), L.verts(c));
    out.steps = steps;
    out.merge = [
      L.verts(C.mergeVertexSources([square, open])),
      L.verts(C.mergeVertexSources([square, open], new G.GTransform(1, 0, 0, -1, 0, 0))),
      C.mergeVertexSources(square) === square,
      L.verts(C.mergeVertexSources([])),
    ];
    out.baseSource = (() => {
      const s = new G.GVertexSource();
      return [
        s.rewindVertices(0),
        s.readVertex(new G.GVertex()),
        s.hasVertexForRead(),
        s.toString(),
      ];
    })();
    out.cloneBad = L.run(() => C.clone(L.vc([2, 1, 1, 2, 2, 2]), true));
    out.deserializeEmpty = L.verts(C.deserialize([]));
    return out;
  }),
  geo("vertex/clockwise", ["ENG-GEOM-007"], (L) => {
    // isClockWise on many polygons (random stars and convex shapes, both orientations).
    const rnd = L.rng(71);
    const out: unknown[] = [];
    for (let i = 0; i < 40; i++) {
      const n = 3 + Math.floor(rnd() * 9);
      const xy: number[] = [];
      const dir = i % 2 ? 1 : -1;
      for (let k = 0; k < n; k++) {
        const a = (dir * k * Math.PI * 2) / n;
        const rad = 10 + rnd() * 30 * (k % 2 ? 0.4 : 1);
        xy.push(rad * Math.cos(a) + rnd(), rad * Math.sin(a) + rnd());
      }
      const p = L.poly(xy) as { isClockWise(): boolean };
      const q = L.poly(xy, true) as { isClockWise(): boolean };
      out.push([n, dir, p.isClockWise(), q.isClockWise()]);
    }
    return out;
  }),
  geo("vertex/transformer", ["ENG-GEOM-010"], (L, G) => {
    const src = L.vc([
      1, 0, 0, 2, 10, 0, 3, 10, 10, 3, 15, 5, 4, 0, 10, 4, 5, 15, 4, 0, 12, 5, 0, 0,
    ]);
    const trfs = [
      null,
      new G.GTransform(),
      new G.GTransform(2, 0, 0, 3, 5, -5),
      new G.GTransform(0, 1, -1, 0, 0, 0),
      new G.GTransform(1, 0.3, -0.2, 1, 7.5, 1.25),
    ];
    const res = trfs.map((t) => {
      const vt = new G.GVertexTransformer(src, t);
      return {
        verts: L.verts(vt),
        trf: L.enc(vt.getTransform()),
        has: vt.hasVertexForRead(),
        str: vt.toString(),
      };
    });
    const vt = new G.GVertexTransformer(src, null);
    vt.setTransform(new G.GTransform(1, 0, 0, 1, 1, 1));
    const v = new G.GVertex();
    v.command = 99;
    v.x = 1;
    v.y = 2;
    return {
      res,
      afterSet: L.verts(vt),
      unknownCommand: L.run(() =>
        G.GVertexTransformer.transformVertex(v, new G.GTransform(2, 0, 0, 2, 0, 0)),
      ),
      unknownNoTrf: L.run(() => G.GVertexTransformer.transformVertex(v, null)),
      nested: L.verts(new G.GVertexTransformer(new G.GVertexTransformer(src, trfs[2]), trfs[4])),
    };
  }),
  geo("vertex/info-bounds-length", ["ENG-GEOM-009"], (L, G) => {
    const I = G.GVertexInfo;
    const sources: unknown[] = [
      L.rect(0, 0, 10, 10),
      L.poly([0, 0, 10, 0, 10, 10], true),
      L.ellipse(5, 5, 4, 2),
      L.vc([1, 0, 0, 3, 10, 0, 3, 5, -5]),
      L.vc([1, 0, 0, 3, 10, 0, 3, 5, 15, 3, 20, 0, 3, 15, -15]),
      L.vc([1, 0, 0, 4, 10, 0, 4, 0, 10, 4, 10, 10]),
      L.vc([1, 0, 0, 4, 10, 0, 4, -5, 5, 4, 15, -5, 5, 0, 0]),
      L.vc([1, 3, 3]),
      L.vc([]),
      L.vc([1, 0, 0, 2, 5, 5, 1, 10, 10, 2, 0, 10, 5, 0, 0]),
    ];
    const rnd = L.rng(72);
    for (let i = 0; i < 15; i++) {
      const f: number[] = [1, rnd() * 100, rnd() * 100];
      for (let k = 0; k < 4; k++) {
        const kind = 2 + Math.floor(rnd() * 3);
        f.push(kind, rnd() * 100, rnd() * 100);
        if (kind >= 3) f.push(kind, rnd() * 100 - 20, rnd() * 100 - 20);
        if (kind === 4) f.push(kind, rnd() * 100 - 20, rnd() * 100 - 20);
      }
      if (i % 2) f.push(5, 0, 0);
      sources.push(L.vc(f));
    }
    return sources.map((s) => {
      const src = s as { rewindVertices(i: number): boolean };
      return {
        verts: L.verts(src),
        bounds: L.run(() => I.calculateBounds(src)),
        boundsExact: L.run(() => I.calculateBounds(src, true)),
        length: L.run(() => {
          src.rewindVertices(0);
          return I.getPathLength(src);
        }),
        segmentPoints: [1, 2, 3, 4, 7].map((seg) =>
          [0, 0.5, 1].map((t) => L.run(() => I.getSegmentPoint(src, seg, t))),
        ),
      };
    });
  }),
  geo("vertex/info-hittest", ["ENG-GEOM-009", "ENG-GEOM-015"], (L, G) => {
    const I = G.GVertexInfo;
    const shapes: Record<string, unknown> = {
      square: L.rect(0, 0, 100, 100),
      squareCcw: L.rect(0, 0, 100, 100, true),
      triangle: L.poly([0, 0, 100, 0, 50, 80]),
      openLine: L.poly([0, 0, 100, 0, 100, 100], true),
      ellipse: L.ellipse(50, 50, 50, 25),
      quad: L.vc([1, 0, 0, 3, 100, 0, 3, 50, 100, 5, 0, 0]),
      star: L.poly([50, 0, 61, 35, 98, 35, 68, 57, 79, 91, 50, 70, 21, 91, 32, 57, 2, 35, 39, 35]),
      selfIntersecting: L.poly([0, 0, 100, 100, 100, 0, 0, 100]),
      donut: L.vc([
        1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 25, 25, 2, 75, 25, 2, 75, 75, 2, 25,
        75, 5, 0, 0,
      ]),
      donutReversed: L.vc([
        1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 25, 25, 2, 25, 75, 2, 75, 75, 2, 75,
        25, 5, 0, 0,
      ]),
    };
    const probes: number[][] = [
      [50, 50],
      [0, 0],
      [100, 50],
      [50, 0],
      [50, -0.5],
      [50, -3],
      [-1, -1],
      [150, 150],
      [10, 10],
      [30, 30],
      [99.9, 99.9],
      [50, 25.2],
      [0, 50],
    ];
    const rnd = L.rng(73);
    for (let i = 0; i < 25; i++) probes.push([rnd() * 120 - 10, rnd() * 120 - 10]);
    const out: Record<string, unknown> = {};
    for (const [name, src] of Object.entries(shapes)) {
      out[name] = probes.map(([x, y]) => {
        const res = (tol: number, inside: boolean, evenOdd?: boolean) => {
          const h = new G.GHitResult();
          const hit = L.run(() => I.hitTest(x, y, src, tol, inside, h, evenOdd));
          return [hit, L.enc(h)];
        };
        return {
          p: [x, y],
          outline0: res(0, false),
          outline2: res(2, false),
          outline8: res(8, false),
          inside: res(0, true),
          insideEvenOdd: res(0, true, true),
          insideNonZero: res(0, true, false),
          insideTol: res(4, true),
        };
      });
    }
    return out;
  }),
  geo("vertex/info-collinear", ["ENG-GEOM-009"], (L, G) => {
    const I = G.GVertexInfo;
    const cases: number[][][] = [
      [
        [0, 10],
        [0, 0],
        [0, 20],
        [0, 0],
      ],
      [
        [0, 10],
        [0, 0],
        [5, 7],
        [0, 0],
      ],
      [
        [0, 10],
        [0, 1],
        [0, 20],
        [0, 0],
      ],
      [
        [0, 10],
        [0, 10],
        [-5, 30],
        [-5, 30],
      ],
      [
        [0, 10],
        [0, 0],
        [0, 3, 6, 20],
        [0, 0, 0, 0],
      ],
      [
        [0, 10],
        [0, 0],
        [0, 3, 6, 20],
        [0, 1, 0, 0],
      ],
      [
        [0, 5, 10],
        [0, 0, 0],
        [0, 20],
        [0, 0],
      ],
      [
        [0, 3, 6, 9],
        [0, 0, 0, 0],
        [0, 3, 6, 9],
        [0, 0, 0, 0],
      ],
      [
        [0, 3, 6, 9],
        [0, 3, 6, 9],
        [0, 9],
        [0, 9],
      ],
      [
        [0, 0, 9, 9],
        [0, 0, 9, 9],
        [0, 9],
        [0, 9],
      ],
      [
        [0, 3, 6, 9],
        [0, 5, -5, 0],
        [0, 3, 6, 9],
        [0, 5, -5, 0],
      ],
      [
        [0, 3, 6, 9],
        [0, 5, -5, 0],
        [9, 6, 3, 0],
        [0, -5, 5, 0],
      ],
      [
        [0, 3, 6, 9],
        [0, 5, -5, 0],
        [0, 3, 6, 9],
        [0, 5.1, -5, 0],
      ],
      [
        [0, 5, 10],
        [0, 5, 0],
        [0, 5, 10],
        [0, 5, 0],
      ],
      [
        [0, 10],
        [0, 0],
        [11, 20],
        [0, 0],
      ],
    ];
    return cases.map(([ax, ay, bx, by]) => ({
      in: [ax, ay, bx, by],
      r: [
        L.run(() => I.collinear(ax, ay, bx, by)),
        L.run(() => I.collinear(ax, ay, bx, by, 0.01)),
        L.run(() => I.collinear(ax, ay, bx, by, 1)),
      ],
    }));
  }),
  geo("vertex/pixel-aligner", ["ENG-GEOM-010", "EDT-SNAP-015"], (L, G, app) => {
    const hooks = app.engineGeometry;
    const src = L.vc([
      1, 0.3, 0.7, 2, 10.49, 0.2, 3, 10.51, 9.6, 3, 12.2, 5.5, 4, 0.1, 9.9, 4, 3.3, 12.7, 4, -1.4,
      11, 5, 0, 0,
    ]);
    const trfs = [
      new G.GTransform(),
      new G.GTransform(2, 0, 0, 2, 0.25, 0.25),
      new G.GTransform(1.5, 0, 0, 0.75, -3.3, 7.7),
      new G.GTransform(0, 1, -1, 0, 0, 0),
    ];
    const out: unknown[] = [];
    for (const t of trfs) {
      for (const full of [false, true]) {
        out.push({
          trf: L.enc(t),
          full,
          plain: L.run(() => L.verts(hooks.pixelAligner(src, t, full))),
          bbox: L.run(() =>
            L.verts(hooks.pixelAligner(src, t, full, new G.GRect(-1.4, 0.2, 13.6, 12.5))),
          ),
        });
      }
    }
    out.push({ noTrf: L.run(() => L.verts(hooks.pixelAligner(src, null, false))) });
    return out;
  }),
  geo("vertex/path-util", ["ENG-GEOM-011"], (L, G) => {
    const U = G.GPathUtil;
    const srcs: unknown[] = [
      L.rect(0, 0, 10, 10),
      L.rect(0, 0, 10, 10, true),
      L.poly([0, 0, 10, 0, 10, 10], true),
      L.ellipse(5, 5, 4, 2),
      L.vc([1, 0, 0, 3, 10, 0, 3, 5, -5, 2, 10, 10, 5, 0, 0]),
      L.vc([1, 0, 0, 2, 10, 0, 2, 10, 10, 5, 0, 0, 1, 20, 20, 2, 30, 20, 2, 30, 30, 5, 0, 0]),
      L.vc([1, 0, 0, 2, 10, 0, 1, 20, 20]),
      L.vc([2, 5, 5, 2, 6, 6]),
    ];
    const pathInfo = (p: unknown) => {
      if (!p) return p ?? null;
      const el = p as {
        getAnchorPoints(): { getFirstChild(): unknown };
        getProperty(n: string): unknown;
        getPaths?: () => { getFirstChild(): unknown };
      };
      const apsOf = (path: {
        getAnchorPoints(): { getFirstChild(): unknown };
        getProperty(n: string): unknown;
      }) => {
        const pts = [];
        for (
          let ap = path.getAnchorPoints().getFirstChild() as {
            getProperty(n: string): unknown;
            getNext(): unknown;
          } | null;
          ap;
          ap = ap.getNext() as typeof ap
        ) {
          pts.push(
            ["tp", "x", "y", "hlx", "hly", "hrx", "hry", "ah"].map((k) =>
              L.enc(ap?.getProperty(k)),
            ),
          );
        }
        return { closed: path.getProperty("closed"), pts };
      };
      if (el instanceof G.GCompoundPath) {
        const subs = [];
        for (
          let c = (el as unknown as { getPaths(): { getFirstChild(): unknown } })
            .getPaths()
            .getFirstChild() as {
            getNext(): unknown;
          } | null;
          c;
          c = c.getNext() as typeof c
        )
          subs.push(apsOf(c as unknown as Parameters<typeof apsOf>[0]));
        return { compound: subs, verts: L.verts(el) };
      }
      return { path: apsOf(el), verts: L.verts(el) };
    };
    const fromSources = srcs.map((s) => ({
      in: L.verts(s),
      created: L.run(() => pathInfo(U.createPathFromVertexSource(s))),
      createdList: L.run(() => (U.createPathFromVertexSource(s, true) as unknown[]).map(pathInfo)),
      // A bare GVertexContainer has no hasMixin, so this throws in the old app.
      madeCw: L.run(() => L.verts(U.makeClockWise(s))),
    }));
    // makeClockWise on paths reverses counter-clockwise anchor order in place.
    const cw = L.path(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      true,
    );
    const ccw = L.path(
      [
        { x: 0, y: 0, hrx: 0, hry: 5 },
        { x: 0, y: 10, hlx: -3, hly: 8 },
        [10, 10],
        { x: 10, y: 0, tp: "B", cl: 2, cr: 2 },
      ],
      true,
    );
    const compound = new G.GCompoundPath();
    compound.getPaths().appendChild(
      L.path(
        [
          [0, 0],
          [0, 30],
          [30, 30],
          [30, 0],
        ],
        true,
      ),
    );
    compound.getPaths().appendChild(
      L.path(
        [
          [5, 5],
          [25, 5],
          [25, 25],
        ],
        true,
      ),
    );
    const fromPaths = [cw, ccw, compound].map((p) => {
      const before = pathInfo(p);
      const result = L.run(() => {
        const r = U.makeClockWise(p);
        return [r === p, pathInfo(r)];
      });
      return { before, result };
    });
    return { fromSources, fromPaths };
  }),
]);

paritySuite("engine-geometry vertex", scenarios, { newApp: false });
