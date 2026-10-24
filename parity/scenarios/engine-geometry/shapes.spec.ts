import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// Vertex generation of the parametric shapes and paths, and their geometry
// and paint bounding boxes.
const scenarios = defineScenarios([
  geo("shapes/rectangle-corners", ["ENG-NODE-028", "ENG-NODE-024", "ENG-NODE-023"], (L, G) => {
    const types = ["R", "U", "B", "I", "F"];
    const trfs = [
      [50, 0, 0, 30, 100, 100],
      [10, 0, 0, 40, 0, 0],
      [-50, 0, 0, 30, 0, 0],
      [35.35533905932738, 35.35533905932737, -21.213203435596423, 21.213203435596427, 0, 0],
      [50, 0, 15, 30, 7, 3],
    ];
    const out: unknown[] = [];
    for (const m of trfs) {
      for (const ct of types) {
        for (const radius of [0, 5, 12, 30, 80]) {
          const r = new G.GRectangle();
          r.setProperty("trf", new G.GTransform(m[0], m[1], m[2], m[3], m[4], m[5]));
          r.setProperties(["tl_ct", "tl_sx"], [ct, radius]);
          out.push({
            trf: m,
            ct,
            radius,
            props: ["tl_sx", "tr_sx", "br_sy", "bl_ct", "br_ct"].map((k) => r.getProperty(k)),
            verts: L.verts(r),
          });
        }
      }
    }
    // Non-uniform corners: each corner with its own type and radii.
    const mixed = [
      {
        uf: false,
        tl_ct: "R",
        tl_sx: 10,
        tl_sy: 10,
        tr_ct: "B",
        tr_sx: 6,
        tr_sy: 6,
        br_ct: "I",
        br_sx: 8,
        br_sy: 8,
        bl_ct: "F",
        bl_sx: 12,
        bl_sy: 12,
      },
      {
        uf: false,
        tl_uf: false,
        tl_ct: "R",
        tl_sx: 20,
        tl_sy: 5,
        tr_uf: false,
        tr_ct: "U",
        tr_sx: 5,
        tr_sy: 20,
      },
      { uf: false, tl_ct: "U", tl_sx: 100, tl_sy: 100, br_ct: "R", br_sx: 1, br_sy: 1 },
      { uf: false, tl_sx: 0, tr_sx: 3, br_sx: 0, bl_sx: 3, tr_sy: 3, bl_sy: 3 },
      { uf: false, cu: false, tl_ct: "R", tl_sx: 10, tl_sy: 10 },
    ];
    const mixedOut = mixed.map((props) => {
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(40, 0, 0, 25, 50, 50));
      const keys = Object.keys(props);
      r.setProperties(
        keys,
        keys.map((k) => (props as Record<string, unknown>)[k]),
      );
      return { props, verts: L.verts(r), bbox: L.enc(r.getGeometryBBox()) };
    });
    return { out, mixed: mixedOut };
  }),
  geo("shapes/ellipse-arcs", ["ENG-NODE-029"], (L, G) => {
    const angles = [
      0,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
      2 * Math.PI,
      -Math.PI / 3,
      5.5,
      0.001,
    ];
    const out: unknown[] = [];
    for (const etp of [0, 1, 2]) {
      for (let i = 0; i < angles.length; i++) {
        for (let j = 0; j < angles.length; j += 2) {
          const e = new G.GEllipse();
          e.setProperty("trf", new G.GTransform(40, 0, 0, 20, 10, 10));
          e.setProperties(["sa", "ea", "etp"], [angles[i], angles[j], etp]);
          out.push({
            etp,
            sa: angles[i],
            ea: angles[j],
            verts: L.verts(e),
            bbox: L.enc(e.getGeometryBBox()),
          });
        }
      }
    }
    const rotated = new G.GEllipse();
    rotated.setProperty("trf", new G.GTransform(30, 30, -10, 10, 0, 0));
    out.push({ rotated: L.verts(rotated), bbox: L.enc(rotated.getGeometryBBox()) });
    return out;
  }),
  geo("shapes/polygon-star", ["ENG-NODE-030"], (L, G) => {
    const out: unknown[] = [];
    const base = { cx: 0, cy: 0, or: 50, ir: 50, oa: 0, ia: 0 };
    const variants: Record<string, unknown>[] = [];
    for (const pts of [3, 4, 5, 6, 7, 8, 12]) {
      variants.push({ ...base, pts, ir: 50 * Math.cos(Math.PI / pts), ia: Math.PI / pts });
      variants.push({ ...base, pts, ir: 20, ia: Math.PI / pts });
    }
    for (const t of ["R", "U", "B", "I", "F"]) {
      variants.push({ ...base, pts: 5, ir: 20, ia: Math.PI / 5, oct: t, ocr: 6 });
      variants.push({ ...base, pts: 5, ir: 20, ia: Math.PI / 5, ict: t, icr: 4 });
      variants.push({
        ...base,
        pts: 6,
        ir: 50 * Math.cos(Math.PI / 6),
        ia: Math.PI / 6,
        oct: t,
        ocr: 10,
        ict: t,
        icr: 10,
      });
    }
    variants.push({ ...base, pts: 5, or: 50, ir: 70, oa: 0.3, ia: 1.1, cx: 10, cy: -5 });
    variants.push({ ...base, pts: 4, or: 30, ir: 0, ia: 0.785 });
    variants.push({ ...base, pts: 3, or: 0, ir: 0 });
    variants.push({ pts: 6 });
    variants.push({ ...base, pts: 9, ir: 25, ia: -0.4, oa: 2 });
    variants.push({ ...base, pts: 5, ir: 20, ia: Math.PI / 5, ocr: 1000 });
    for (const v of variants) {
      const p = new G.GPolygon();
      const keys = Object.keys(v);
      p.setProperties(
        keys,
        keys.map((k) => v[k]),
      );
      out.push({
        v,
        verts: L.verts(p),
        bbox: L.enc(p.getGeometryBBox()),
        plain: L.run(() => p.isPlainEdges()),
      });
    }
    const t = new G.GPolygon();
    t.setProperties(["pts", "or", "ir", "ia"], [5, 50, 20, Math.PI / 5]);
    t.setProperty("trf", new G.GTransform(1, 0.2, -0.3, 1.5, 100, 50));
    out.push({
      transformed: L.verts(t),
      bbox: L.enc(t.getGeometryBBox()),
      center: L.run(() => t.getCenter()),
    });
    return out;
  }),
  geo("shapes/path-anchors", ["ENG-NODE-022", "ENG-NODE-023", "ENG-NODE-025"], (L, G) => {
    const out: Record<string, unknown> = {};
    const spec: Record<string, [unknown[], boolean]> = {
      openLine: [
        [
          [0, 0],
          [100, 50],
        ],
        false,
      ],
      polyline: [
        [
          [0, 0],
          [50, 50],
          [100, 0],
          [150, 50],
        ],
        false,
      ],
      triangleClosed: [
        [
          [0, 0],
          [100, 0],
          [50, 80],
        ],
        true,
      ],
      handles: [
        [
          { x: 0, y: 0, hrx: 30, hry: -40 },
          { x: 100, y: 0, hlx: 70, hly: -40, hrx: 130, hry: 40 },
          { x: 200, y: 0, hlx: 170, hly: 40 },
        ],
        false,
      ],
      halfHandles: [
        [
          { x: 0, y: 0, hrx: 50, hry: 50 },
          { x: 100, y: 0 },
          { x: 100, y: 100, hlx: 150, hly: 50 },
        ],
        true,
      ],
      auto: [
        [
          { x: 0, y: 0, ah: true },
          { x: 100, y: 30, ah: true },
          { x: 200, y: 0, ah: true },
          { x: 150, y: 100, ah: true },
        ],
        true,
      ],
      autoOpen: [
        [
          { x: 0, y: 0, ah: true },
          { x: 100, y: 30, ah: true },
          { x: 200, y: 0, ah: true },
        ],
        false,
      ],
      symmetric: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0, tp: "TS", hlx: 80, hly: -20 },
          { x: 200, y: 0 },
        ],
        false,
      ],
      mirror: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0, tp: "TM", hlx: 80, hly: -20, hrx: 150, hry: 50 },
          { x: 200, y: 0 },
        ],
        false,
      ],
      asymmetric: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0, tp: "TA", hlx: 80, hly: -20, hrx: 150, hry: 50 },
          { x: 200, y: 0 },
        ],
        false,
      ],
      single: [[[5, 5]], false],
      singleClosed: [[[5, 5]], true],
      duplicatePoints: [
        [
          [0, 0],
          [0, 0],
          [50, 0],
          [50, 0],
          [50, 50],
        ],
        true,
      ],
    };
    for (const t of ["R", "U", "B", "I", "F"]) {
      for (const r of [5, 20, 200]) {
        spec[`corner-${t}-${r}`] = [
          [
            [0, 0],
            { x: 100, y: 0, tp: t, cl: r, cr: r },
            { x: 100, y: 100, tp: t, cl: r, cr: r / 2 },
            { x: 0, y: 100, tp: t, cl: r, cr: r, cu: false },
          ],
          true,
        ];
      }
    }
    for (const [name, [pts, closed]] of Object.entries(spec)) {
      const p = L.path(pts as (number[] | Record<string, unknown>)[], closed) as {
        isClockWise(): boolean;
        isLine(): boolean;
        isMultiPointsLine(): boolean;
        getGeometryBBox(): unknown;
      };
      const handles: unknown[] = [];
      const aps = (
        p as unknown as { getAnchorPoints(): { getFirstChild(): unknown } }
      ).getAnchorPoints();
      for (
        let ap = aps.getFirstChild() as {
          getProperty(k: string): unknown;
          getNext(): unknown;
        } | null;
        ap;
        ap = ap.getNext() as typeof ap
      ) {
        handles.push(["hlx", "hly", "hrx", "hry"].map((k) => L.enc(ap?.getProperty(k))));
      }
      out[name] = {
        verts: L.verts(p),
        handles,
        bbox: L.enc(p.getGeometryBBox()),
        cw: L.run(() => p.isClockWise()),
        isLine: L.run(() => p.isLine()),
        multiLine: L.run(() => p.isMultiPointsLine()),
      };
    }
    // Transformed path: the trf property maps the anchors.
    const tp = L.path([[0, 0], { x: 100, y: 0, tp: "B", cl: 10, cr: 10 }, [100, 100]], true);
    (tp as { setProperty(k: string, v: unknown): void }).setProperty(
      "trf",
      new G.GTransform(2, 0, 0, 0.5, 10, 10),
    );
    out.transformed = L.shape(tp);
    return out;
  }),
  geo("shapes/bboxes", ["ENG-NODE-012", "ENG-GEOM-009"], (L, G) => {
    const make: Record<string, () => unknown> = {
      rect: () => {
        const r = new G.GRectangle();
        r.setProperty("trf", new G.GTransform(50, 0, 0, 30, 100, 100));
        return r;
      },
      rectRotated: () => {
        const r = new G.GRectangle();
        r.setProperty(
          "trf",
          new G.GTransform(
            35.35533905932738,
            35.35533905932737,
            -21.213203435596423,
            21.213203435596427,
            0,
            0,
          ),
        );
        return r;
      },
      rectRounded: () => {
        const r = new G.GRectangle();
        r.setProperty("trf", new G.GTransform(50, 0, 0, 30, 0, 0).rotated(0.4));
        r.setProperties(["tl_sx"], [15]);
        return r;
      },
      ellipseSkewed: () => {
        const e = new G.GEllipse();
        e.setProperty("trf", new G.GTransform(30, 30, -10, 10, 0, 0));
        return e;
      },
      arc: () => {
        const e = new G.GEllipse();
        e.setProperty("trf", new G.GTransform(40, 0, 0, 20, 0, 0));
        e.setProperties(["sa", "ea", "etp"], [0.3, 2.5, 2]);
        return e;
      },
      star: () => {
        const p = new G.GPolygon();
        p.setProperties(["pts", "or", "ir", "ia"], [5, 50, 20, Math.PI / 5]);
        return p;
      },
      curvePath: () =>
        L.path(
          [
            { x: 0, y: 0, hrx: 30, hry: -80 },
            { x: 100, y: 0, hlx: 70, hly: 90 },
          ],
          false,
        ),
      line: () =>
        L.path(
          [
            [0, 0],
            [100, 40],
          ],
          false,
        ),
    };
    const borders: Record<string, Record<string, unknown> | null> = {
      none: null,
      center: { _bw: 6 },
      inside: { _bw: 6, _ba: "I" },
      outside: { _bw: 6, _ba: "O" },
      miter: { _bw: 4, _blj: "miter", _bml: 10 },
      roundCap: { _bw: 4, _blc: "round" },
      squareCap: { _bw: 4, _blc: "square" },
    };
    const out: Record<string, unknown> = {};
    for (const [name, f] of Object.entries(make)) {
      for (const [bname, b] of Object.entries(borders)) {
        const el = f();
        L.fill(el);
        if (b) L.border(el, b);
        const e = el as {
          getGeometryBBox(): unknown;
          getPaintBBox(): unknown;
          getSourceBBox(): unknown;
        };
        out[`${name}/${bname}`] = {
          source: L.run(() => e.getSourceBBox()),
          geometry: L.run(() => e.getGeometryBBox()),
          paint: L.run(() => e.getPaintBBox()),
        };
      }
    }
    return out;
  }),
  geo("shapes/compound-path", ["ENG-NODE-026", "ENG-GEOM-008"], (L, G) => {
    const c = new G.GCompoundPath();
    c.getPaths().appendChild(
      L.path(
        [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
        ],
        true,
      ),
    );
    c.getPaths().appendChild(
      L.path(
        [
          [25, 25],
          [25, 75],
          [75, 75],
          [75, 25],
        ],
        true,
      ),
    );
    c.getPaths().appendChild(
      L.path(
        [
          { x: 120, y: 0, hrx: 150, hry: -30 },
          { x: 180, y: 0, hlx: 150, hly: 30 },
        ],
        false,
      ),
    );
    const before = L.shape(c);
    // A compound path has no `trf` of its own: transform() maps every
    // sub-path's anchors.
    c.transform(new G.GTransform(0.5, 0, 0, 2, 10, 0));
    const firstPath = c.getPaths().getFirstChild();
    return {
      before,
      after: L.shape(c),
      firstPath: L.shape(firstPath),
      center: L.run(() => c.getCenter()),
    };
  }),
]);

paritySuite("engine-geometry shapes", scenarios, { newApp: false });
