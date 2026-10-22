import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// Path operations: offsetting (offset path / outline stroke), simplifying,
// curve fitting, knife intersections and the path model edits.
const scenarios = defineScenarios([
  geo("pathops/offsetter", ["ENG-PATHOP-001"], (L, G) => {
    const star = (() => {
      const xy: number[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 20 : 50;
        xy.push(50 + r * Math.cos(a), 50 + r * Math.sin(a));
      }
      return L.poly(xy);
    })();
    const sources: Record<string, unknown> = {
      square: L.rect(0, 0, 100, 100),
      squareCcw: L.rect(0, 0, 100, 100, true),
      triangle: L.poly([0, 0, 100, 0, 50, 20]),
      star,
      ellipse: L.ellipse(50, 50, 50, 30),
      quad: L.vc([1, 0, 0, 3, 100, 0, 3, 50, -60, 2, 100, 100, 2, 0, 100, 5, 0, 0]),
      openPolyline: L.poly([0, 0, 50, 40, 100, 0, 150, 60], true),
      openCurve: L.vc([1, 0, 0, 4, 100, 0, 4, 30, -60, 4, 70, 60]),
      openLine: L.poly([0, 0, 100, 0], true),
      twoContours: L.vc([
        1, 0, 0, 2, 40, 0, 2, 40, 40, 2, 0, 40, 5, 0, 0, 1, 60, 0, 2, 100, 0, 2, 100, 40, 2, 60, 40,
        5, 0, 0,
      ]),
    };
    const caps = [undefined, "butt", "round", "square"];
    const out: Record<string, unknown> = {};
    for (const [name, src] of Object.entries(sources)) {
      const isOpen = name.startsWith("open");
      const rows: unknown[] = [];
      for (const offset of [0, 1, 5, 18, 60]) {
        for (const [inset, outset] of [
          [true, true],
          [true, false],
          [false, true],
        ]) {
          for (const cap of isOpen ? caps : [undefined]) {
            for (const tol of [0, 0.3]) {
              rows.push({
                offset,
                inset,
                outset,
                cap: cap ?? null,
                tol,
                verts: L.run(() =>
                  L.verts(new G.GVertexOffsetter(src, offset, inset, outset, tol, cap)),
                ),
              });
            }
          }
        }
      }
      out[name] = rows;
    }
    return out;
  }),
  geo("pathops/simplifier", ["ENG-PATHOP-002"], (L, G) => {
    const rnd = L.rng(101);
    const walk = (n: number, closed: boolean) => {
      const xy: number[] = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i < n; i++) {
        x += 2 + rnd() * 3;
        y += Math.sin(i / 4) * 4 + (rnd() - 0.5);
        xy.push(x, y);
      }
      return L.poly(xy, !closed);
    };
    const circlePts = (n: number, noise: number) => {
      const xy: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        const r = 50 + (rnd() - 0.5) * noise;
        xy.push(50 + r * Math.cos(a), 50 + r * Math.sin(a));
      }
      return L.poly(xy);
    };
    const sources: Record<string, unknown> = {
      walkOpen: walk(60, false),
      walkClosed: walk(40, true),
      circle: circlePts(48, 0),
      noisyCircle: circlePts(64, 3),
      square: L.rect(0, 0, 100, 100),
      zigzag: L.poly([0, 0, 10, 10, 20, 0, 30, 10, 40, 0, 50, 10, 60, 0], true),
      ellipse: L.ellipse(50, 50, 50, 30),
      straight: L.poly([0, 0, 10, 0.01, 20, 0, 30, -0.01, 40, 0], true),
    };
    const out: Record<string, unknown> = {};
    for (const [name, src] of Object.entries(sources)) {
      out[name] = [0.1, 0.4, 2, 8].map((tol) =>
        [
          [false, true],
          [false, false],
          [true, true],
        ].map(([a, b]) => L.run(() => L.verts(new G.GVertexSimplifier(src).simplify(tol, a, b)))),
      );
    }
    out.empty = L.run(() => L.verts(new G.GVertexSimplifier(null).simplify(1, false, true)));
    return out;
  }),
  geo("pathops/fitter", ["ENG-PATHOP-003"], (L, G, app) => {
    const hooks = app.engineGeometry;
    const rnd = L.rng(102);
    const P = (x: number, y: number) => new G.GPoint(x, y);
    const sets: Record<string, unknown[]> = {
      line: [P(0, 0), P(10, 0), P(20, 0), P(30, 0)],
      arc: Array.from({ length: 20 }, (_, i) => P(50 * Math.cos(i / 6), 50 * Math.sin(i / 6))),
      wave: Array.from({ length: 40 }, (_, i) => P(i * 3, Math.sin(i / 3) * 20)),
      noisy: Array.from({ length: 30 }, (_, i) => P(i * 4 + rnd(), Math.sqrt(i) * 10 + rnd() * 2)),
      corner: [P(0, 0), P(10, 0), P(20, 0), P(20, 10), P(20, 20)],
      two: [P(0, 0), P(10, 10)],
    };
    const out: Record<string, unknown> = {};
    for (const [name, pts] of Object.entries(sets)) {
      out[name] = [
        // The freehand tool uses new GVertexFitter(7) and 20 segments.
        [7, undefined, 20],
        [7, undefined, 1],
        [undefined, undefined, 20],
        [1, 0.1, 40],
        [50, undefined, 3],
      ].map(([err, tol, P2]) =>
        L.run(() => {
          const f = hooks.vertexFitter(err, tol);
          return [f.fitCurve(pts, P2), f.fitCurve(pts, P2, P(1, 0), P(-1, 0))];
        }),
      );
    }
    return out;
  }),
  geo(
    "pathops/knife-intersections",
    ["ENG-PATHOP-005", "ENG-BOOL-002", "ENG-NODE-025"],
    (L, G, app) => {
      const hooks = app.engineGeometry;
      const anchors = (p: unknown) => {
        const pts: unknown[] = [];
        const aps = (p as { getAnchorPoints(): { getFirstChild(): unknown } }).getAnchorPoints();
        for (
          let ap = aps.getFirstChild() as {
            getProperty(k: string): unknown;
            getNext(): unknown;
          } | null;
          ap;
          ap = ap.getNext() as typeof ap
        ) {
          pts.push(
            ["tp", "x", "y", "hlx", "hly", "hrx", "hry"].map((k) => L.enc(ap?.getProperty(k))),
          );
        }
        return pts;
      };
      const cases: [unknown[], boolean, unknown[], boolean][] = [
        [
          [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
          true,
          [
            [-20, 50],
            [120, 50],
          ],
          false,
        ],
        [
          [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
          true,
          [
            [50, -20],
            [50, 120],
            [-20, 30],
          ],
          false,
        ],
        [
          [
            { x: 0, y: 50, hrx: 0, hry: 0 },
            { x: 100, y: 50, hlx: 50, hly: -50, hrx: 150, hry: 150 },
            [0, 100],
          ],
          true,
          [
            [30, -10],
            [60, 150],
          ],
          false,
        ],
        [
          [
            [0, 0],
            [100, 100],
          ],
          false,
          [
            [0, 100],
            [100, 0],
          ],
          false,
        ],
        [
          [
            [0, 0],
            [100, 0],
          ],
          false,
          [
            [0, 10],
            [100, 10],
          ],
          false,
        ],
        [
          [
            [0, 0],
            [100, 0],
            [50, 80],
          ],
          true,
          [
            [0, 0],
            [100, 100],
          ],
          false,
        ],
      ];
      return cases.map(([pa, ca, pb, cb]) => {
        const a = L.path(pa as (number[] | Record<string, unknown>)[], ca);
        const b = L.path(pb as (number[] | Record<string, unknown>)[], cb);
        return L.run(() => {
          const is = hooks.intersectPaths(a, b);
          const added = G.GPath.addIntersectionPoints(a, b, is.raw, true);
          return {
            points: L.enc(is.points),
            added: added
              ? added.map((list: unknown[]) =>
                  list.map((ap) =>
                    L.enc([
                      (ap as { getProperty(k: string): unknown }).getProperty("x"),
                      (ap as { getProperty(k: string): unknown }).getProperty("y"),
                    ]),
                  ),
                )
              : added,
            a: anchors(a),
            b: anchors(b),
          };
        });
      });
    },
  ),
  geo("pathops/redistribute", ["ENG-BOOL-002"], (L, G, app) => {
    const hooks = app.engineGeometry;
    const sources = [
      L.vc([
        1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 25, 25, 2, 75, 25, 2, 75, 75, 2, 25,
        75, 5, 0, 0,
      ]),
      L.vc([
        1, 0, 0, 2, 40, 0, 2, 40, 40, 2, 0, 40, 5, 0, 0, 1, 60, 0, 2, 100, 0, 2, 100, 40, 2, 60, 40,
        5, 0, 0,
      ]),
      L.vc([
        1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 10, 10, 2, 90, 10, 2, 90, 90, 2, 10,
        90, 5, 0, 0, 1, 30, 30, 2, 70, 30, 2, 70, 70, 2, 30, 70, 5, 0, 0,
      ]),
      L.vc([
        1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 50, 50, 2, 150, 50, 2, 150, 150, 2,
        50, 150, 5, 0, 0,
      ]),
      L.rect(0, 0, 10, 10),
    ];
    return sources.map((s) =>
      L.run(() => [
        hooks.redistribute(s).map((group: unknown[]) => group.map((x) => L.verts(x))),
        hooks
          .redistribute(s, new G.GTransform(2, 0, 0, 2, 5, 5))
          .map((group: unknown[]) => group.map((x) => L.verts(x))),
      ]),
    );
  }),
  geo("pathops/path-edits", ["ENG-PATHOP-005", "ENG-NODE-021", "ENG-NODE-025"], (L, G) => {
    const anchors = (p: unknown) => {
      const pts: unknown[] = [];
      const aps = (p as { getAnchorPoints(): { getFirstChild(): unknown } }).getAnchorPoints();
      for (
        let ap = aps.getFirstChild() as {
          getProperty(k: string): unknown;
          getNext(): unknown;
        } | null;
        ap;
        ap = ap.getNext() as typeof ap
      ) {
        pts.push(
          ["tp", "x", "y", "hlx", "hly", "hrx", "hry", "cl", "cr", "ah"].map((k) =>
            L.enc(ap?.getProperty(k)),
          ),
        );
      }
      return pts;
    };
    type PathLike = {
      reverseOrder(): void;
      isClockWise(): boolean;
      insertHitPoint(h: unknown): unknown;
      getProperty(k: string): unknown;
      setProperty(k: string, v: unknown): void;
      transformStyledCorners(target: unknown, t: unknown): void;
      transferStyledCorners(target: unknown): void;
      correctClosedAttribute(): void;
      getSegmentMiddle?: (i: number) => unknown;
    };
    const mk = () =>
      L.path(
        [
          { x: 0, y: 0, tp: "B", cl: 5, cr: 5 },
          { x: 100, y: 0, hrx: 130, hry: 50 },
          { x: 100, y: 100, hlx: 130, hly: 70, tp: "TS" },
          { x: 0, y: 100, tp: "R", cl: 10, cr: 4 },
        ],
        true,
      ) as PathLike;
    const out: Record<string, unknown> = {};
    const p = mk();
    out.cw = p.isClockWise();
    p.reverseOrder();
    out.reversed = { anchors: anchors(p), verts: L.verts(p), cw: p.isClockWise() };
    p.reverseOrder();
    out.reversedTwice = anchors(p);
    // insertHitPoint at segment/slope positions as a hit test would report them.
    out.inserts = [
      { segment: 1, slope: 0.5 },
      { segment: 2, slope: 0.25 },
      { segment: 3, slope: 0.9 },
      { segment: 4, slope: 0.5 },
      { segment: 2, slope: 0 },
      { segment: 2, slope: 1 },
      null,
    ].map((h) => {
      const q = mk();
      return L.run(() => {
        const ap = q.insertHitPoint(h) as { getProperty(k: string): unknown } | null;
        return {
          inserted: ap ? [ap.getProperty("x"), ap.getProperty("y")] : null,
          anchors: anchors(q),
          verts: L.verts(q),
        };
      });
    });
    // Styled corner radii follow a transform's scale.
    out.styledCorners = [
      new G.GTransform(2, 0, 0, 2, 0, 0),
      new G.GTransform(2, 0, 0, 0.5, 0, 0),
      new G.GTransform(1, 0, 0, 1, 50, 50),
      new G.GTransform(0, 3, -3, 0, 0, 0),
    ].map((t) =>
      L.run(() => {
        const src = mk();
        const target = mk();
        src.transformStyledCorners(target, t);
        const src2 = mk();
        const target2 = mk();
        src2.setProperty("csc", false);
        src2.transformStyledCorners(target2, t);
        return { scaled: anchors(target), noScale: anchors(target2) };
      }),
    );
    out.transfer = (() => {
      const a = mk();
      const b = L.path(
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
        ],
        true,
      ) as PathLike;
      a.transferStyledCorners(b);
      return anchors(b);
    })();
    out.correctClosed = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 1e-9],
      ],
    ].map((pts) => {
      const q = L.path(pts, false) as PathLike;
      q.correctClosedAttribute();
      return { closed: q.getProperty("closed"), anchors: anchors(q) };
    });
    out.segmentMiddle = [0, 1, 2, 3, 4].map((i) =>
      L.run(() => (p.getSegmentMiddle ? p.getSegmentMiddle(i) : "missing")),
    );
    return out;
  }),
  geo("pathops/paths-graph", ["ENG-NODE-043", "ENG-PATHOP-005"], (L, G, app) => {
    const count = (c: { getFirstChild(): unknown }) => {
      let n = 0;
      for (
        let x = c.getFirstChild() as { getNext(): unknown } | null;
        x;
        x = x.getNext() as typeof x
      )
        n++;
      return n;
    };
    const describe = (g: {
      getAnchors(): { getFirstChild(): unknown };
      getEdges(): { getFirstChild(): unknown };
      getFacets(): { getFirstChild(): unknown };
      getGeometryBBox(): unknown;
    }) => {
      const anchors: unknown[] = [];
      for (
        let x = g.getAnchors().getFirstChild() as {
          getProperty(k: string): unknown;
          getNext(): unknown;
        } | null;
        x;
        x = x.getNext() as typeof x
      ) {
        anchors.push([L.enc(x.getProperty("x")), L.enc(x.getProperty("y"))]);
      }
      return {
        anchors,
        edges: count(g.getEdges()),
        facets: count(g.getFacets()),
        bbox: L.enc(g.getGeometryBBox()),
        verts: L.run(() => L.verts(g)),
      };
    };
    const lines: [unknown[], boolean][][] = [
      [
        [
          [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
            [0, 0],
          ],
          false,
        ],
        [
          [
            [50, -20],
            [50, 120],
          ],
          false,
        ],
      ],
      [
        [
          [
            [0, 0],
            [100, 100],
          ],
          false,
        ],
        [
          [
            [0, 100],
            [100, 0],
          ],
          false,
        ],
        [
          [
            [0, 50],
            [100, 50],
          ],
          false,
        ],
      ],
      [
        [
          [
            [0, 0],
            { x: 100, y: 0, hrx: 150, hry: 50 },
            { x: 100, y: 100, hlx: 150, hly: 50 },
            [0, 100],
          ],
          true,
        ],
      ],
    ];
    const out: unknown[] = [];
    for (const set of lines) {
      const g = new G.GPathsGraph();
      app.scene().getActivePage().appendChild(g);
      const steps: unknown[] = [];
      for (const [pts, closed] of set) {
        // Graph lines are bare GPathBase objects (a GPath can't live in an
        // edge), built from a path's anchors as the graph editor does.
        const p = L.path(pts as (number[] | Record<string, unknown>)[], closed) as {
          cloneAnchorPoints(): unknown;
        };
        steps.push(L.run(() => g.addGraphLine(new G.GPathBase(false, p.cloneAnchorPoints()))));
      }
      const before = describe(g);
      const split = L.run(() => {
        const edge = g.getEdges().getFirstChild();
        const outEdges: unknown[] = [];
        const outAnchors: unknown[] = [];
        g.splitEdge(
          edge,
          [
            { seg: 0, slope: 0.25 },
            { seg: 0, slope: 0.75 },
          ],
          true,
          outEdges,
          outAnchors,
        );
        return { edges: outEdges.length, anchors: outAnchors.length, graph: describe(g) };
      });
      out.push({ steps, before, split });
    }
    return out;
  }),
  geo("pathops/flatten-element", ["ENG-GEOM-014"], (L, G) => {
    const rect = (x: number) => {
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(5, 0, 0, 5, x, 0));
      return r;
    };
    const describe = (n: unknown): unknown => {
      const node = n as { getNodeName(): string; getFirstChild?: () => unknown };
      const kids: unknown[] = [];
      if (node && node.getFirstChild && !(node instanceof G.GShape)) {
        for (
          let c = node.getFirstChild() as { getNext(): unknown } | null;
          c;
          c = c.getNext() as typeof c
        )
          kids.push(describe(c));
      }
      return node ? [node.getNodeName(), kids] : node;
    };
    const cases: (() => unknown)[] = [
      () => {
        const l = new G.GLayer();
        l.appendChild(rect(0));
        return l;
      },
      () => {
        const l = new G.GLayer();
        l.appendChild(rect(0));
        l.appendChild(rect(20));
        return l;
      },
      () => {
        const l = new G.GLayer();
        const g = new G.GGroup();
        g.appendChild(rect(0));
        const inner = new G.GGroup();
        inner.appendChild(rect(40));
        g.appendChild(inner);
        l.appendChild(g);
        l.appendChild(rect(20));
        const sub = new G.GLayer();
        sub.appendChild(rect(60));
        l.appendChild(sub);
        return l;
      },
      () => new G.GLayer(),
    ];
    return cases.map((f) => L.run(() => describe(G.GSceneUtil.asFlattenElement(f()))));
  }),
]);

paritySuite("engine-geometry path operations", scenarios, { newApp: false });
