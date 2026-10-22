import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// GTransform: matrix operations, mapping, decomposition and the static
// helpers the transform box and tools use.
const scenarios = defineScenarios([
  geo("transform/matrix-ops", ["ENG-GEOM-003"], (L, G) => {
    const fixed: number[][] = [
      [1, 0, 0, 1, 0, 0],
      [1, 0, 0, 1, 1e-15, 0],
      [2, 0, 0, 3, 10, -20],
      [0, 1, -1, 0, 5, 5],
      [0.7071067811865476, 0.7071067811865475, -0.7071067811865475, 0.7071067811865476, 0, 0],
      [1, 0.5, 0.25, 1, 3, 4],
      [-1, 0, 0, 1, 0, 0],
      [1, 0, 0, -1, 0, 100],
      [0, 0, 0, 0, 1, 2],
      [1, 2, 2, 4, 0, 0],
      [0, 1, 1, 0, 0, 0],
      [1e-15, 0, 0, 1e-15, 0, 0],
      [50, 0, 0, 30, 100, 100],
      [-3, 2, 7, -0.5, -11, 0.125],
    ];
    const r = L.floats(41, 20 * 6, -5, 5);
    for (let i = 0; i < r.length; i += 6) fixed.push(r.slice(i, i + 6));
    const T = (m: number[]) => new G.GTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    const pts = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-3.5, 2.25],
      [1000, -1000],
    ];
    return fixed.map((m, i) => {
      const t = T(m);
      const o = T(fixed[(i + 3) % fixed.length] as number[]);
      return {
        in: m,
        isIdentity: t.isIdentity(),
        isValid: t.isValid(),
        det: L.enc(t.getDeterminant()),
        detRecip: L.enc(t.getDeterminantReciprocal()),
        translation: L.enc(t.getTranslation()),
        scaleFactor: L.enc(t.getScaleFactor()),
        rotationFactor: L.enc(t.getRotationFactor()),
        invertible: t.invertible(),
        inverted: L.enc(t.inverted()),
        makeInvertible: L.enc(t.makeInvertible()),
        makeInvertibleSame: t.makeInvertible() === t,
        multiplied: L.enc(t.multiplied(o)),
        preMultiplied: L.enc(t.preMultiplied(o)),
        rotated: [0, 0.3, Math.PI / 2, -Math.PI, 7].map((a) => L.enc(t.rotated(a))),
        translated: L.enc(t.translated(-4, 9.5)),
        scaled: [L.enc(t.scaled(2)), L.enc(t.scaled(2, -3)), L.enc(t.scaled(0.5, 0))],
        skewed: [L.enc(t.skewed(0.2, 0)), L.enc(t.skewed(0, -0.4)), L.enc(t.skewed(0.1, 0.3))],
        mapPoint: pts.map(([x, y]) => L.enc(t.mapPoint(new G.GPoint(x, y)))),
        map: pts.map(([x, y]) => {
          const v = { x, y };
          t.map(v);
          return L.enc(v);
        }),
        mapRect: [
          L.enc(t.mapRect(new G.GRect(-1, -1, 2, 2))),
          L.enc(t.mapRect(new G.GRect(3, 4, 0, 5))),
        ],
        mapQuad: L.enc(t.mapQuadrilateral(new G.GRect(1, 2, 3, 4))),
        mapQuadNull: L.enc(t.mapQuadrilateral(null)),
        serialize: L.enc(G.GTransform.serialize(t)),
        toString: t.toString(),
      };
    });
  }),
  geo("transform/statics", ["ENG-GEOM-003"], (L, G) => {
    const t = new G.GTransform(1, 2, 3, 4, 5, 6);
    return {
      defaults: L.enc(new G.GTransform()),
      partial: L.enc(new G.GTransform(2, undefined, "x", 3)),
      deserialize: [[], null, [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7]].map((m) =>
        L.enc(G.GTransform.deserialize(m)),
      ),
      serializeIdentity: L.enc(G.GTransform.serialize(new G.GTransform())),
      serializeNearIdentity: L.enc(G.GTransform.serialize(new G.GTransform(1, 0, 0, 1, 1e-15, 0))),
      equals: [
        G.GTransform.equals(t, new G.GTransform(1, 2, 3, 4, 5, 6)),
        G.GTransform.equals(t, new G.GTransform(1, 2, 3, 4, 5, 6.001)),
        G.GTransform.equals(t, new G.GTransform(1, 2, 3, 4, 5, 6.001), 0.01),
        G.GTransform.equals(null, null),
        G.GTransform.equals(t, null),
        G.GTransform.equals(null, t),
      ],
      nativeRect: [
        L.enc(G.GTransform.getNativeRectTransformation(new G.GRect(10, 20, 30, 40))),
        L.enc(G.GTransform.getNativeRectTransformation(new G.GRect(-1, 0, 0, 5))),
      ],
    };
  }),
  geo("transform/decompose", ["ENG-GEOM-003"], (L, G) => {
    const list: number[][] = [
      [1, 0, 0, 1, 0, 0],
      [2, 0, 0, 3, 10, -20],
      [0, 1, -1, 0, 5, 5],
      [1, 0.5, 0.25, 1, 3, 4],
      [-1, 0, 0, 1, 0, 0],
      [1, 0, 0, -1, 0, 100],
      [-2, 0, 0, -2, 0, 0],
      [1, 2, 2, 4, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [1, 0, 1, 1, 0, 0],
      [1, 1, 0, 1, 0, 0],
      [3, 0, 0, 3, 0, 0],
      [0.8660254037844387, 0.5, -0.5, 0.8660254037844387, 7, 8],
      [0, -1, 1, 0, 0, 0],
      [0, 2, 3, 0, 0, 0],
    ];
    const r = L.floats(42, 30 * 6, -3, 3);
    for (let i = 0; i < r.length; i += 6) list.push(r.slice(i, i + 6));
    // Rotations combined with non-uniform scale, which noSkewDecomposed
    // handles only when there is no skew left.
    for (let a = -3; a <= 3; a += 0.5) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      list.push([2 * c, 2 * s, -s, c, 1, 2]);
      list.push([c, s, -s, c, 0, 0]);
    }
    return list.map((m) => {
      const t = new G.GTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      return {
        in: m,
        decomposed: L.run(() => t.decomposed()),
        noSkew: L.run(() => t.noSkewDecomposed()),
      };
    });
  }),
  geo("transform/rotation-transform", ["ENG-GEOM-003", "EDT-SNAP-014"], (L, G) => {
    // getRotationTransform(startX, startY, curX, curY, cx, cy, snap, step, snapTolerance)
    const out: unknown[] = [];
    const r = L.floats(43, 25 * 6, -200, 200);
    const cases: unknown[][] = [
      [10, 0, 0, 10, 0, 0, false, undefined, undefined],
      [10, 0, 0, 10, 0, 0, true, undefined, undefined],
      [10, 0, 7, 8, 0, 0, true, undefined, undefined],
      [10, 0, 7, 8, 0, 0, true, Math.PI / 4, undefined],
      [10, 0, 1, 10, 0, 0, false, undefined, Math.PI / 45],
      [10, 0, 3, 10, 0, 0, false, undefined, Math.PI / 45],
      [10, 0, 10, 0.3, 0, 0, false, undefined, Math.PI / 45],
      [5, 5, 5, 5, 5, 5, false, undefined, undefined],
      [100, 50, 50, 100, 50, 50, true, Math.PI / 180, Math.PI / 45],
    ];
    for (let i = 0; i < r.length; i += 6) {
      const k = i / 6;
      cases.push([
        r[i],
        r[i + 1],
        r[i + 2],
        r[i + 3],
        r[i + 4],
        r[i + 5],
        k % 2 === 0,
        k % 3 === 0 ? Math.PI / 180 : undefined,
        k % 4 === 0 ? Math.PI / 45 : undefined,
      ]);
    }
    for (const c of cases) {
      out.push({ in: L.enc(c), t: L.run(() => G.GTransform.getRotationTransform(...c)) });
    }
    return out;
  }),
  geo("transform/line-constrain-rotation", ["ENG-GEOM-003", "EDT-SNAP-013"], (L, G) => {
    // getLineConstrainRotation(sx, sy, cx, cy, ox, oy, l1x, l1y, l2x, l2y, step, tolerance)
    const out: unknown[] = [];
    const r = L.floats(44, 20 * 10, -100, 100);
    const cases: unknown[][] = [
      [10, 0, 0, 10, 0, 0, 0, 0, 10, 1, undefined, undefined],
      [10, 0, 0, 10, 0, 0, 0, 0, 10, 1, Math.PI / 4, undefined],
      [10, 0, 0, 10, 0, 0, 0, 0, 10, 1, undefined, Math.PI / 45],
      [10, 0, 0, 10, 0, 0, 0, 0, 10, 1, Math.PI / 180, Math.PI / 45],
      [3, 4, 4, 3, 1, 1, -5, 2, 6, 8, undefined, undefined],
    ];
    for (let i = 0; i < r.length; i += 10) {
      const k = i / 10;
      cases.push([
        ...r.slice(i, i + 10),
        k % 2 ? Math.PI / 12 : undefined,
        k % 3 ? undefined : Math.PI / 45,
      ]);
    }
    for (const c of cases) {
      out.push({ in: L.enc(c), t: L.run(() => G.GTransform.getLineConstrainRotation(...c)) });
    }
    return out;
  }),
  geo("transform/resize-transform", ["ENG-GEOM-003"], (L, G) => {
    // getResizeTransform(rect, side, dx, dy, keepRatio, fromCenter)
    const sides = Object.keys(G.GRect.Side).map((k) => G.GRect.Side[k]);
    const rects = [
      [0, 0, 100, 50],
      [-20, 10, 40, 40],
      [5, 5, 0, 30],
      [5, 5, 30, 0],
      [0, 0, 0, 0],
    ];
    const deltas = [
      [10, 5],
      [-30, 20],
      [0, 0],
      [-100, -50],
      [-150, 7],
      [2.5, -60],
    ];
    const out: unknown[] = [];
    for (const [x, y, w, h] of rects) {
      const rect = new G.GRect(x, y, w, h);
      for (const side of sides) {
        for (const [dx, dy] of deltas) {
          out.push({
            in: [x, y, w, h, side, dx, dy],
            t: [false, true].map((ratio) =>
              [false, true].map((center) =>
                L.run(() => G.GTransform.getResizeTransform(rect, side, dx, dy, ratio, center)),
              ),
            ),
          });
        }
      }
    }
    return out;
  }),
  geo("transform/correct-for-frame", ["ENG-GEOM-003"], (L, G) => {
    const frames = [new G.GRect(0, 0, 100, 50), new G.GRect(-10, 20, 30, 40)];
    const list = [
      [1, 0, 0, 1, 0, 0],
      [2, 0, 0, 3, 10, 5],
      [0, 1, -1, 0, 5, 5],
      [1, 0, 0.5, 1, 0, 0],
      [-1, 0, 0, 1, 0, 0],
      [0.8660254037844387, 0.5, -0.5, 0.8660254037844387, 7, 8],
      [1, 2, 2, 4, 0, 0],
    ];
    return list.map((m) => {
      const t = new G.GTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      return {
        in: m,
        out: frames.map((f) => L.run(() => G.GTransform.correctForFrame(t, f))),
      };
    });
  }),
  geo("transform/editor-constrain", ["EDT-SNAP-013", "EDT-SNAP-014"], (L, G, app) => {
    // GEditor.convertToConstrain(originX, originY, x, y, angle): Shift-drag
    // constraint to 0/45/90 degrees relative to the cursor constraint angle.
    const editorClass = app.editor().constructor;
    const out: unknown[] = [];
    const rnd = L.rng(45);
    const cases: number[][] = [
      [0, 0, 10, 0, 0],
      [0, 0, 10, 4, 0],
      [0, 0, 10, 4.2, 0],
      [0, 0, 10, 10, 0],
      [0, 0, -3, 10, 0],
      [0, 0, 0, 0, 0],
      [5, 5, 15, 9, 0],
      [5, 5, 15, 9, Math.PI / 8],
      [0, 0, 10, 4.142, 0],
      [0, 0, 10, 4.143, 0],
      [0, 0, -10, -4.143, 0],
    ];
    for (let i = 0; i < 40; i++) {
      cases.push([
        rnd() * 100 - 50,
        rnd() * 100 - 50,
        rnd() * 100 - 50,
        rnd() * 100 - 50,
        i % 3 ? 0 : rnd() * 6 - 3,
      ]);
    }
    for (const c of cases) {
      out.push({
        in: c,
        out: L.run(() => editorClass.convertToConstrain(c[0], c[1], c[2], c[3], c[4] || undefined)),
      });
    }
    // Rotation snapping as the transform box calls it: Shift snaps to 15
    // degree steps; the snapRotate option snaps to 1 degree within 4 degrees
    // of a right angle.
    const rot: unknown[] = [];
    for (let deg = -180; deg <= 180; deg += 7.3) {
      const a = (deg * Math.PI) / 180;
      const x = 100 + 50 * Math.cos(a);
      const y = 100 + 50 * Math.sin(a);
      rot.push({
        deg,
        free: L.enc(G.GTransform.getRotationTransform(150, 100, x, y, 100, 100, false, null, null)),
        shift: L.enc(
          G.GTransform.getRotationTransform(150, 100, x, y, 100, 100, true, Math.PI / 12, null),
        ),
        snapRotate: L.enc(
          G.GTransform.getRotationTransform(
            150,
            100,
            x,
            y,
            100,
            100,
            true,
            Math.PI / 180,
            Math.PI / 45,
          ),
        ),
      });
    }
    return { constrain: out, rotation: rot };
  }),
]);

paritySuite("engine-geometry transform", scenarios, { newApp: false });
