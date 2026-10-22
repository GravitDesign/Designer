import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// Element hit tests (GElement.hitTest -> GShape._detailHitTest ->
// GVertexInfo.hitTest): points inside, outside, on the border and near it,
// with tolerances, styles and transforms.
const scenarios = defineScenarios([
  geo("hittest/elements", ["ENG-NODE-012", "ENG-GEOM-015", "ENG-GEOM-009"], (L, G) => {
    const T = (a: number, b: number, c: number, d: number, e: number, f: number) =>
      new G.GTransform(a, b, c, d, e, f);
    const make: Record<string, () => unknown> = {
      rect: () => {
        const r = new G.GRectangle();
        r.setProperty("trf", T(50, 0, 0, 30, 100, 100));
        return r;
      },
      rectRotated: () => {
        const r = new G.GRectangle();
        r.setProperty(
          "trf",
          T(50, 0, 0, 30, 0, 0)
            .rotated(Math.PI / 6)
            .translated(100, 100),
        );
        return r;
      },
      rectRounded: () => {
        const r = new G.GRectangle();
        r.setProperty("trf", T(50, 0, 0, 30, 100, 100));
        r.setProperties(["tl_sx"], [25]);
        return r;
      },
      ellipse: () => {
        const e = new G.GEllipse();
        e.setProperty("trf", T(50, 0, 0, 30, 100, 100));
        return e;
      },
      pie: () => {
        const e = new G.GEllipse();
        e.setProperty("trf", T(50, 0, 0, 30, 100, 100));
        e.setProperties(["sa", "ea", "etp"], [0, Math.PI, 0]);
        return e;
      },
      star: () => {
        const p = new G.GPolygon();
        p.setProperties(["pts", "or", "ir", "ia", "cx", "cy"], [5, 50, 20, Math.PI / 5, 100, 100]);
        return p;
      },
      openPath: () => L.path([[60, 80], { x: 100, y: 130, hlx: 80, hly: 140 }, [140, 80]], false),
      closedPath: () => L.path([[60, 80], { x: 100, y: 130, hlx: 80, hly: 140 }, [140, 80]], true),
      donut: () => {
        const c = new G.GCompoundPath();
        c.getPaths().appendChild(
          L.path(
            [
              [50, 70],
              [150, 70],
              [150, 130],
              [50, 130],
            ],
            true,
          ),
        );
        c.getPaths().appendChild(
          L.path(
            [
              [80, 85],
              [120, 85],
              [120, 115],
              [80, 115],
            ],
            true,
          ),
        );
        // The sub-path quadtree used for hit candidates is built when an
        // update finishes, as it is for every edited compound path.
        c.beginUpdate();
        c.endUpdate();
        return c;
      },
    };
    const styles: Record<string, (e: unknown) => void> = {
      fill: (e) => L.fill(e),
      border: (e) => L.border(e, { _bw: 6 }),
      both: (e) => {
        L.fill(e);
        L.border(e, { _bw: 2, _ba: "O" });
      },
      none: () => undefined,
    };
    const probes: number[][] = [
      [100, 100],
      [50, 70],
      [50, 100],
      [49, 100],
      [46, 100],
      [44, 100],
      [150, 130],
      [100, 70],
      [100, 68.5],
      [100, 66],
      [100, 84],
      [100, 116],
      [55, 75],
      [60, 79],
      [140, 81],
      [100, 130],
      [100, 131],
      [200, 200],
      [0, 0],
    ];
    const rnd = L.rng(81);
    for (let i = 0; i < 12; i++) probes.push([40 + rnd() * 120, 60 + rnd() * 80]);
    // The app always passes the view transform; null would throw in the
    // border and outline branches.
    const views = [T(1, 0, 0, 1, 0, 0), T(2, 0, 0, 2, -50, -30)];
    const out: Record<string, unknown> = {};
    for (const [name, f] of Object.entries(make)) {
      for (const [sname, s] of Object.entries(styles)) {
        const el = f() as { hitTest(...a: unknown[]): unknown };
        s(el);
        out[`${name}/${sname}`] = probes.map(([x, y]) => {
          const cell: unknown[] = [];
          for (const view of views) {
            const p = view.mapPoint(new G.GPoint(x, y));
            for (const tol of [0, 3]) {
              for (const force of [false, true]) {
                const hits = L.run(() => {
                  const res = el.hitTest(p, view, null, false, -1, tol, force) as
                    { element: unknown; data: { type: number; vertex: unknown } | null }[] | null;
                  if (!res) return null;
                  return res.map((h) => ({
                    self: h.element === el,
                    type: h.data ? h.data.type : null,
                    vertex: h.data ? L.enc(h.data.vertex) : null,
                  }));
                });
                cell.push(hits);
              }
            }
          }
          return [x, y, cell];
        });
      }
    }
    return out;
  }),
  geo("hittest/path-hittest", ["ENG-NODE-021", "ENG-GEOM-009"], (L, G) => {
    // GPathBase.pathHitTest(location, transform, inside, tolerance): used by
    // the path editors to find the segment under the cursor.
    const paths: Record<string, unknown> = {
      open: L.path([[0, 0], [100, 0], { x: 100, y: 100, hlx: 150, hly: 50 }], false),
      closed: L.path([[0, 0], [100, 0], { x: 100, y: 100, hlx: 150, hly: 50 }], true),
      transformed: (() => {
        const p = L.path(
          [
            [0, 0],
            [100, 0],
            [100, 100],
          ],
          true,
        ) as { setProperty(k: string, v: unknown): void };
        p.setProperty("trf", new G.GTransform(1, 0, 0, 1, 0, 0).rotated(0.5).translated(20, 10));
        return p;
      })(),
    };
    const probes = [
      [50, 0],
      [50, 2],
      [50, 6],
      [100, 50],
      [124, 50],
      [60, 30],
      [50, 50],
      [0, 0],
      [-5, -5],
      [70, 55],
    ];
    const out: Record<string, unknown> = {};
    for (const [name, p] of Object.entries(paths)) {
      const path = p as { pathHitTest(...a: unknown[]): unknown };
      out[name] = probes.map(([x, y]) =>
        [null, new G.GTransform(2, 0, 0, 2, 0, 0)].map((view) =>
          [false, true].map((inside) =>
            [0, 4].map((tol) =>
              L.run(() => {
                const pt = view ? view.mapPoint(new G.GPoint(x, y)) : new G.GPoint(x, y);
                const h = path.pathHitTest(pt, view, inside, tol) as { data: unknown } | null;
                return h ? L.enc(h.data) : null;
              }),
            ),
          ),
        ),
      );
    }
    return out;
  }),
]);

paritySuite("engine-geometry hit tests", scenarios, { newApp: false });
