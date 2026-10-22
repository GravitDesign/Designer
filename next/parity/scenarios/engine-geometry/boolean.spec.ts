import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo, type GeoBody } from "./lib.ts";

// GVertexPolyBoolean on many shape pairs, with the two configurations the
// app uses: the magic/merge tool (odd-even, AUTO, default intersector) and
// live compound shapes (odd-even or winding, AUTO_MAX_PASSTHROUGH, no
// intersector). Every op (OR, XOR, AND, SUB) and the result's flags are
// recorded.

// Shape pairs as functions of the helpers, so the same source runs in both
// apps. Each returns [a, b] vertex sources.
const pairs: GeoBody = (L) => {
  const star = (cx: number, cy: number, ro: number, ri: number, n: number, rot = 0) => {
    const xy: number[] = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const r = i % 2 ? ri : ro;
      xy.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    return L.poly(xy);
  };
  const donut = L.vc([
    1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 30, 30, 2, 30, 70, 2, 70, 70, 2, 70, 30,
    5, 0, 0,
  ]);
  const list: Record<string, [unknown, unknown]> = {
    overlap: [L.rect(0, 0, 100, 100), L.rect(50, 50, 100, 100)],
    overlapCcw: [L.rect(0, 0, 100, 100), L.rect(50, 50, 100, 100, true)],
    disjoint: [L.rect(0, 0, 50, 50), L.rect(100, 100, 50, 50)],
    touchingEdge: [L.rect(0, 0, 50, 50), L.rect(50, 0, 50, 50)],
    touchingCorner: [L.rect(0, 0, 50, 50), L.rect(50, 50, 50, 50)],
    sharedPartialEdge: [L.rect(0, 0, 50, 50), L.rect(50, 20, 50, 50)],
    nestedInner: [L.rect(0, 0, 100, 100), L.rect(25, 25, 50, 50)],
    nestedOuter: [L.rect(25, 25, 50, 50), L.rect(0, 0, 100, 100)],
    identical: [L.rect(0, 0, 100, 100), L.rect(0, 0, 100, 100)],
    insideTouching: [L.rect(0, 0, 100, 100), L.rect(0, 25, 50, 50)],
    cross: [L.rect(40, 0, 20, 100), L.rect(0, 40, 100, 20)],
    triangleSquare: [L.poly([0, 0, 120, 30, 20, 110]), L.rect(30, 20, 60, 60)],
    circles: [L.ellipse(50, 50, 50, 50), L.ellipse(100, 50, 50, 50)],
    circleTangent: [L.ellipse(50, 50, 50, 50), L.ellipse(150, 50, 50, 50)],
    circleInSquare: [L.rect(0, 0, 100, 100), L.ellipse(50, 50, 30, 30)],
    squareInCircle: [L.ellipse(50, 50, 60, 60), L.rect(20, 20, 60, 60)],
    circleOverSquareEdge: [L.rect(0, 0, 100, 100), L.ellipse(100, 50, 30, 30)],
    ellipses: [L.ellipse(50, 50, 60, 20), L.ellipse(50, 50, 20, 60)],
    starCircle: [star(50, 50, 50, 20, 5, -Math.PI / 2), L.ellipse(50, 50, 30, 30)],
    stars: [star(50, 50, 50, 20, 5), star(60, 55, 45, 25, 6, 0.3)],
    bowtieRect: [L.poly([0, 0, 100, 100, 100, 0, 0, 100]), L.rect(25, 25, 50, 50)],
    bowtieSelf: [
      L.poly([0, 0, 100, 100, 100, 0, 0, 100]),
      L.poly([0, 0, 100, 100, 100, 0, 0, 100]),
    ],
    donutRect: [donut, L.rect(50, 50, 100, 20)],
    donutHoleFill: [donut, L.rect(40, 40, 20, 20)],
    rectDonut: [L.rect(-20, 40, 140, 20), donut],
    quadCurves: [
      L.vc([1, 0, 0, 3, 100, 0, 3, 50, -60, 2, 100, 100, 2, 0, 100, 5, 0, 0]),
      L.vc([1, 50, -50, 2, 150, -50, 2, 150, 50, 3, 50, 50, 3, 100, 120, 5, 0, 0]),
    ],
    openA: [L.poly([0, 0, 100, 0, 100, 100], true), L.rect(50, -20, 100, 60)],
    degenerateLine: [L.poly([0, 0, 100, 100]), L.rect(0, 0, 100, 100)],
    degeneratePoint: [L.vc([1, 10, 10, 5, 0, 0]), L.rect(0, 0, 100, 100)],
    empty: [L.vc([]), L.rect(0, 0, 100, 100)],
    zeroArea: [L.rect(0, 0, 100, 0), L.rect(0, -10, 50, 20)],
    collinearSlivers: [L.rect(0, 0, 100, 10), L.rect(0, 10, 100, 1e-9)],
    multiSource: [
      L.vc([
        1, 0, 0, 2, 40, 0, 2, 40, 40, 2, 0, 40, 5, 0, 0, 1, 60, 0, 2, 100, 0, 2, 100, 40, 2, 60, 40,
        5, 0, 0,
      ]),
      L.rect(20, 20, 60, 40),
    ],
  };
  const rnd = L.rng(91);
  for (let i = 0; i < 8; i++) {
    const n = 4 + Math.floor(rnd() * 5);
    const a: number[] = [];
    const b: number[] = [];
    for (let k = 0; k < n; k++) {
      const ang = (k * Math.PI * 2) / n;
      const r1 = 30 + rnd() * 40;
      const r2 = 30 + rnd() * 40;
      a.push(50 + r1 * Math.cos(ang), 50 + r1 * Math.sin(ang));
      b.push(80 + r2 * Math.cos(ang + 0.2), 60 + r2 * Math.sin(ang + 0.2));
    }
    list[`random${i}`] = [L.poly(a), L.poly(b)];
  }
  return list;
};

const boolBody = (
  config: "merge" | "compoundEvenOdd" | "compoundWinding",
  names: string[] | null,
): GeoBody => {
  // The body is sent as source text, so the pair builder and the config
  // are spliced in as source and JSON.
  const src = `(L, G, app) => {
    const pairs = (${pairs.toString()})(L, G, app);
    const config = ${JSON.stringify(config)};
    const names = ${JSON.stringify(names)};
    const B = G.GVertexPolyBoolean;
    const make = () =>
      config === "merge"
        ? new B(B.PIP_CHECK_ODDEVEN, B.AUTO)
        : new B(config === "compoundWinding" ? B.PIP_CHECK_WINDING : B.PIP_CHECK_ODDEVEN, B.AUTO_MAX_PASSTHROUGH, false, false);
    const out = {};
    for (const name of names || Object.keys(pairs)) {
      const [a, b] = pairs[name];
      const ops = {};
      for (const [opName, op] of [["OR", B.OR], ["XOR", B.XOR], ["AND", B.AND], ["SUB", B.SUB], ["NONE", 0]]) {
        ops[opName] = L.run(() => {
          const pb = make();
          const ok = pb.initializeSources(a, b);
          if (!ok) return { ok };
          const res = pb.clipOp(op);
          return {
            ok,
            result: res ? res.map((s) => L.verts(s)) : res,
            didNotClip: pb.didNotClip,
            holes: pb.hassHoles,
          };
        });
      }
      out[name] = ops;
    }
    return out;
  }`;
  return (0, eval)(src) as GeoBody;
};

const scenarios = defineScenarios([
  geo("boolean/constants", ["ENG-BOOL-001"], (L, G) => {
    const B = G.GVertexPolyBoolean;
    return [
      B.OR,
      B.XOR,
      B.AND,
      B.SUB,
      B.PIP_CHECK_ODDEVEN,
      B.PIP_CHECK_WINDING,
      B.AUTO_MAX_PASSTHROUGH,
      B.AUTO,
      B.OUTSIDE,
      B.INSIDE,
    ];
  }),
  geo(
    "boolean/merge-tool",
    ["ENG-BOOL-001", "ENG-BOOL-002", "ENG-BOOL-003"],
    boolBody("merge", null),
  ),
  geo(
    "boolean/compound-evenodd",
    ["ENG-BOOL-001", "ENG-BOOL-002"],
    boolBody("compoundEvenOdd", null),
  ),
  geo(
    "boolean/compound-winding",
    ["ENG-BOOL-001"],
    // Only the pairs where the inside test could differ from odd-even.
    boolBody("compoundWinding", [
      "bowtieRect",
      "bowtieSelf",
      "donutRect",
      "donutHoleFill",
      "rectDonut",
      "multiSource",
      "stars",
      "nestedInner",
      "nestedOuter",
    ]),
  ),
  geo("boolean/live-compound-shape", ["ENG-BOOL-004", "ENG-NODE-027"], (L, G) => {
    const T = (a: number, b: number, c: number, d: number, e: number, f: number) =>
      new G.GTransform(a, b, c, d, e, f);
    const rect = (x: number, y: number, w: number, h: number) => {
      const r = new G.GRectangle();
      r.setProperty("trf", T(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
      return r;
    };
    const ellipse = (x: number, y: number, w: number, h: number) => {
      const e = new G.GEllipse();
      e.setProperty("trf", T(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
      return e;
    };
    const B = G.GVertexPolyBoolean;
    const combos: [string, number[]][] = [
      ["or", [B.OR, B.OR]],
      ["sub", [B.OR, B.SUB]],
      ["and", [B.OR, B.AND]],
      ["xor", [B.OR, B.XOR]],
      ["chain", [B.OR, B.OR, B.SUB, B.XOR]],
      ["chainAnd", [B.OR, B.SUB, B.AND]],
      ["zero", [B.OR, 0, B.SUB]],
    ];
    const out: Record<string, unknown> = {};
    for (const [name, bools] of combos) {
      for (const evenodd of [false, true]) {
        const cs = new G.GCompoundShape();
        const kids = [
          rect(0, 0, 100, 100),
          ellipse(50, 50, 100, 80),
          rect(20, 60, 140, 20),
          ellipse(-20, -20, 60, 60),
        ];
        bools.forEach((b, i) => {
          const k = kids[i];
          k.setProperty("bool", b);
          cs.appendChild(k);
        });
        cs.setProperty("evenodd", evenodd);
        L.fill(cs);
        const before = L.shape(cs);
        cs.setProperty("trf", T(1, 0, 0, 1, 0, 0).rotated(0.25).translated(10, 20));
        out[`${name}/${evenodd ? "evenodd" : "nonzero"}`] = {
          before,
          transformed: L.shape(cs),
          bools: bools.map((_, i) => kids[i].getProperty("bool")),
        };
      }
    }
    return out;
  }),
]);

paritySuite("engine-geometry boolean", scenarios, { newApp: false });
