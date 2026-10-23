// Inputs and drivers for the recorded old-output tests of the boolean
// cluster (fixture-cases.test.ts). The same drivers ran once against the
// old modules (264, 187 and 1002 of public/chunk.vendor.js, loaded in
// Node) to record old-fixtures.json, so they only use members that the
// old and the new classes share. Nothing here imports JSON or vitest.
import type { Transform } from "../../math/transform.ts";
import type { Vertex } from "../vertex.ts";
import type { VertexContainer } from "../vertex-container.ts";
import type { VertexSimplifier } from "../vertex-simplifier.ts";
import type { VertexReader } from "../vertex-source.ts";
import type { PolyLineExtended } from "./poly-line-extended.ts";
import type { PolyIntersector, PolyLine } from "./poly-segments.ts";
import type { VertexPolyBoolean } from "./vertex-poly-boolean.ts";

/** The classes the drivers run on: the new ones, or the old modules when recording. */
export interface BooleanImpl {
  VertexPolyBoolean: typeof VertexPolyBoolean;
  PolyLineExtended: typeof PolyLineExtended;
  PolyIntersector: typeof PolyIntersector;
  VertexSimplifier: typeof VertexSimplifier;
  VertexContainer: typeof VertexContainer;
  Vertex: typeof Vertex;
  Transform: typeof Transform;
}

/** JSON-safe copy: -0, NaN, infinities and undefined become strings. */
export function normalize(value: unknown): unknown {
  if (value === undefined) return "U";
  if (typeof value === "number") {
    if (Object.is(value, -0)) return "-0";
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return String(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = normalize(item);
    return out;
  }
  return value;
}

/** A short hash of a normalized value, for the fuzz cases. */
export function hashOf(value: unknown): string {
  const text = JSON.stringify(normalize(value));
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

function attempt(run: () => unknown, withMessage = false): unknown {
  try {
    return run();
  } catch (error) {
    const name = (error as Error).constructor.name;
    return withMessage ? { throws: name, message: (error as Error).message } : { throws: name };
  }
}

const KAPPA = 0.5522847498307936;

export function rect(x: number, y: number, w: number, h: number): number[] {
  return [1, x, y, 2, x + w, y, 2, x + w, y + h, 2, x, y + h, 5, 0, 0];
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): number[] {
  const k = KAPPA;
  // prettier-ignore
  return [
    1, cx + rx, cy,
    4, cx, cy + ry, 4, cx + rx, cy + ry * k, 4, cx + rx * k, cy + ry,
    4, cx - rx, cy, 4, cx - rx * k, cy + ry, 4, cx - rx, cy + ry * k,
    4, cx, cy - ry, 4, cx - rx, cy - ry * k, 4, cx - rx * k, cy - ry,
    4, cx + rx, cy, 4, cx + rx * k, cy - ry, 4, cx + rx, cy - ry * k,
    5, 0, 0,
  ];
}

const quad = [1, 0, 0, 3, 100, 0, 3, 50, -60, 2, 100, 100, 2, 0, 100, 5, 0, 0];

function drivers(impl: BooleanImpl) {
  const build = (flat: number[]): VertexContainer => {
    const container = new impl.VertexContainer();
    for (let i = 0; i < flat.length; i += 3)
      container.addVertex(flat[i] as number, flat[i + 1] as number, flat[i + 2] as number);
    return container;
  };
  const verts = (source: VertexReader | null | undefined): unknown => {
    if (!source || !source.rewindVertices(0)) return null;
    const out: number[] = [];
    const vertex = new impl.Vertex();
    let guard = 0;
    while (source.readVertex(vertex)) {
      out.push(vertex.command, vertex.x, vertex.y);
      if (++guard > 100000) return [...out, "overflow"];
    }
    return out;
  };
  const ops = (a: number[], b: number[], args: ConstructorParameters<typeof VertexPolyBoolean>) =>
    [1, 2, 3, 4, 0].map((op) =>
      attempt(() => {
        const boolean = new impl.VertexPolyBoolean(...args);
        const ok = boolean.initializeSources(build(a), build(b));
        if (!ok) return { ok };
        const result = boolean.clipOp(op);
        return {
          ok,
          result: result ? result.map((s) => verts(s)) : result,
          didNotClip: boolean.didNotClip,
          holes: boolean.hassHoles,
          count: boolean._numIntersections,
        };
      }),
    );
  type Hits = ReturnType<PolyIntersector["intersect"]>;
  const hits = (found: Hits): unknown =>
    (found ?? []).map((r) => [
      r.pt.getX(),
      r.pt.getY(),
      r.polySeg0.seg,
      r.polySeg1.seg,
      r.slope0,
      r.slope1,
    ]);
  const polyList = (poly: PolyLine | null): unknown => {
    const out: unknown[] = [];
    for (let n = poly; n; n = n.next)
      out.push(n.point ? [n.point.getX(), n.point.getY(), n.seg, n.m, n.isLast] : "end");
    return out;
  };
  return { build, verts, ops, hits, polyList };
}

/** A ring of PolyLineExtended nodes; each sub-path's last node is isLast. */
function ring(impl: BooleanImpl, subPaths: number[][][]): PolyLineExtended[] {
  const nodes: PolyLineExtended[] = [];
  for (const sub of subPaths)
    sub.forEach((spec, i) => {
      const node = new impl.PolyLineExtended();
      node.x = spec[0] as number;
      node.y = spec[1] as number;
      if (spec.length >= 4) {
        node.cx1 = spec[2];
        node.cy1 = spec[3];
      }
      if (spec.length >= 6) {
        node.cx2 = spec[4];
        node.cy2 = spec[5];
      }
      node.isLast = i === sub.length - 1;
      nodes.push(node);
    });
  nodes.forEach((node, i) => {
    node.next = nodes[(i + 1) % nodes.length] as PolyLineExtended;
    node.prev = nodes[(i + nodes.length - 1) % nodes.length] as PolyLineExtended;
  });
  return nodes;
}

/** A ring's nodes from `start` along `next`, with links as indices into the walk. */
function dumpRing(start: PolyLineExtended | null): unknown {
  if (!start) return null;
  const walk: PolyLineExtended[] = [];
  let node: PolyLineExtended | null = start;
  do {
    walk.push(node);
    node = node.next;
  } while (node && node !== start && walk.length < 10000);
  const at = (n: PolyLineExtended | null): number | null => (n ? walk.indexOf(n) : null);
  return walk.map((n) => [
    n.x,
    n.y,
    n.cx1,
    n.cy1,
    n.cx2,
    n.cy2,
    n.isLast,
    n.isIsect,
    at(n.prev),
    at(n.nextCurve),
    at(n.currCurve),
  ]);
}

/** Hand-picked inputs for branches the parity scenarios don't reach. */
export function targetedCases(impl: BooleanImpl): Record<string, unknown> {
  const { build, verts, ops, hits, polyList } = drivers(impl);
  const PI = impl.PolyIntersector;
  const PLE = impl.PolyLineExtended;
  const VPB = impl.VertexPolyBoolean;
  const out: Record<string, unknown> = {};
  const record = (name: string, run: () => unknown) => {
    out[name] = attempt(run, true);
  };

  // R4-B-022: blockIntersector flattens every pair (count logic, quad 6/4).
  const pairs: [string, number[], number[]][] = [
    ["rectEllipse", rect(0, 0, 100, 100), ellipse(100, 50, 40, 60)],
    ["quadRect", quad, rect(20, -40, 60, 200)],
    ["ellipses", ellipse(50, 50, 50, 50), ellipse(100, 60, 50, 40)],
    ["quadEllipse", quad, ellipse(50, 0, 30, 30)],
  ];
  for (const [name, a, b] of pairs) {
    record("block." + name, () => ops(a, b, [1, -1, false, true]));
    record("blockPass." + name, () => ops(a, b, [1, -2, false, true]));
  }

  // A quad against a nearly equal cubic crosses its flattened pieces 8
  // times; quad-vs-curve pairs add every hit (the constant 6 is truthy).
  record("block.quadCubicNear", () =>
    hits(
      new PI(true, true, false, 1, true).intersect(
        build([1, 0, 0, 3, 100, 0, 3, 50, 50, 2, 100, -20, 2, 0, -20, 5, 0, 0]),
        build([
          1, 0, 0.05, 4, 100, 0.05, 4, 33.833, 33.383, 4, 66.167, 33.383, 2, 100, 30, 2, 0, 30, 5,
          0, 0,
        ]),
      ),
    ),
  );

  // R4-B-023: collinear pairs mark 666 and splice(P) drops later hits too.
  record("collinear.sameEllipse", () =>
    hits(
      new PI(true, true, false, 4).intersect(
        build(ellipse(50, 50, 40, 30)),
        build(ellipse(50, 50, 40, 30)),
      ),
    ),
  );
  record("collinear.shiftedCircle", () =>
    hits(
      new PI(true, true, false, 4).intersect(
        build(ellipse(50, 50, 40, 40)),
        build(ellipse(50, 51, 40, 40)),
      ),
    ),
  );
  record("collinear.sharedEdgeBlock", () =>
    hits(
      new PI(true, true, false, 4, true).intersect(
        build(rect(0, 0, 50, 50)),
        build(rect(50, 0, 50, 50)),
      ),
    ),
  );
  record("collinear.overlapEdgeBlock", () =>
    hits(
      new PI(true, true, false, 4, true).intersect(
        build(rect(0, 0, 50, 50)),
        build(rect(50, 20, 50, 50)),
      ),
    ),
  );
  record("collinear.sameEllipseBool", () =>
    ops(ellipse(50, 50, 40, 30), ellipse(50, 50, 40, 30), [1, -1]),
  );

  // R4-B-024: `lines` mode keys pairs by a string, and NaN curves stay single points.
  const zigzag = [1, 0, 0, 2, 50, 50, 2, 0, 50, 2, 50, 0, 2, 25, -20, 2, 25, 80];
  record("lines.zigzag", () =>
    hits(new PI(false, false, false, 2).intersect(build(zigzag), build(zigzag), true)),
  );
  record("lines.rects", () =>
    hits(
      new PI(false, false, false, 2).intersect(
        build(rect(0, 0, 50, 50)),
        build(rect(25, 25, 50, 50)),
        true,
      ),
    ),
  );
  record("nan.cubic", () =>
    polyList(
      new PI(false, true, false, 2)._makePolygon(build([1, 0, 0, 3, NaN, 10, 3, 5, 5, 5, 0, 0])),
    ),
  );
  record("nan.cubic4", () =>
    polyList(
      new PI(false, true, false, 2)._makePolygon(
        build([1, 0, 0, 4, 10, 10, 4, NaN, 2, 4, 5, 5, 5, 0, 0]),
      ),
    ),
  );

  // R4-B-042: fixed common segment policies and useIntersector on shared segments.
  for (const policy of [1, -2]) {
    record("policy" + policy + ".sharedPartialEdge", () =>
      ops(rect(0, 0, 50, 50), rect(50, 20, 50, 50), [1, policy, false, false]),
    );
    record("policy" + policy + ".sameEllipse", () =>
      ops(ellipse(50, 50, 40, 30), ellipse(50, 50, 40, 30), [1, policy, false, false]),
    );
    record("policy" + policy + ".halfShared", () =>
      ops(
        ellipse(50, 50, 40, 40),
        [...rect(10, 50, 80, 60).slice(0, 12), 5, 0, 0],
        [1, policy, false, false],
      ),
    );
  }
  record("intersector.sharedEdge", () =>
    ops(rect(0, 0, 50, 50), rect(50, 20, 50, 50), [1, -1, true]),
  );
  record("intersector.sameEllipse", () =>
    ops(ellipse(50, 50, 40, 30), ellipse(50, 50, 40, 30), [1, -1, true]),
  );

  // R4-B-041: methods nothing in the old app calls.
  record("reverseLoop.cubic", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0, 15, 5, 15, 10],
        [10, 20, 5, 25],
        [0, 20],
      ],
    ]);
    (nodes[1] as PolyLineExtended)._reverseLoop();
    return [dumpRing(nodes[0] as PolyLineExtended), dumpRing(nodes[3] as PolyLineExtended)];
  });
  record("reverseLoop.secondOfTwo", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [5, 0],
      ],
      [
        [10, 0, 12, 3, 14, 6],
        [20, 0],
        [20, 10],
      ],
    ]);
    (nodes[3] as PolyLineExtended)._reverseLoop();
    return dumpRing(nodes[0] as PolyLineExtended);
  });
  record("stitch.endToStart", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0],
      ],
      [
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ]);
    const head = (nodes[0] as PolyLineExtended)._stitch();
    return [dumpRing(head), verts(head.getPoints())];
  });
  record("stitch.startToStart", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0, 12, 4, 14, 8],
        [10, 10],
      ],
      [
        [0, 0],
        [0, 10],
        [10, 10],
      ],
    ]);
    const head = (nodes[2] as PolyLineExtended)._stitch();
    return [dumpRing(head), verts(head.getPoints())];
  });
  record("stitch.withClosedAndUnmatched", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0],
      ],
      [
        [50, 50],
        [60, 50],
        [50, 50],
      ],
      [
        [30, 30],
        [40, 40],
      ],
    ]);
    const head = (nodes[0] as PolyLineExtended)._stitch();
    return dumpRing(head);
  });
  record("stitch.single", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
    ]);
    return dumpRing((nodes[1] as PolyLineExtended)._stitch());
  });
  record("clean", () => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      [
        [50, 50],
        [60, 50],
      ],
    ]);
    (nodes[2] as PolyLineExtended).isIsect = true;
    return nodes.map((n) => [n.cleanForwards(), n.cleanBackwards()]);
  });
  record("closestTime", () => [
    PLE._getClosestTime(0, 0, 10, 3),
    PLE._getClosestTime(0, 0, 1e-6, 0),
    PLE._getClosestTime(5, 5, 5, 5),
    PLE._getClosestTime(-3, 2, 4, -9),
  ]);
  const duplicates = (side: number, broken: boolean) => {
    const nodes = ring(impl, [
      [
        [0, 0],
        [10, 0, 12, 2, 14, 4],
        [10, 0],
        [10, 10],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const [n0, n1, n2, , n4, , n6] = nodes as PolyLineExtended[];
    (n1 as PolyLineExtended).nextCurve = n4 as PolyLineExtended;
    const other = new PLE();
    for (const node of [n4, n6] as PolyLineExtended[]) {
      node.isIsect = true;
      node.corresponding = other;
      const isect = {
        polySeg0: side === 0 && !broken ? node : other,
        polySeg1: side === 1 ? node : other,
      };
      node.isectPoly = isect as unknown as PolyLineExtended["isectPoly"];
    }
    (n6 as PolyLineExtended).isLast = false;
    (n0 as PolyLineExtended).nextCurve = n2 as PolyLineExtended;
    const head = PLE.removeDuplicates(n0 as PolyLineExtended, side);
    const at = (n: PolyLineExtended | null) => nodes.indexOf(n as PolyLineExtended);
    return [
      dumpRing(head),
      nodes.map((n) => [
        at(n.nextCurve),
        n.isIsect,
        n.isectPoly ? [at(n.isectPoly.polySeg0), at(n.isectPoly.polySeg1)] : null,
      ]),
    ];
  };
  record("removeDuplicates.side0", () => duplicates(0, false));
  record("removeDuplicates.side1", () => duplicates(1, false));
  record("removeDuplicates.broken", () => duplicates(0, true));
  const initialized = (
    a: number[],
    b: number[],
    args: ConstructorParameters<typeof VertexPolyBoolean>,
  ) => {
    const boolean = new VPB(...args);
    boolean.initializeSources(build(a), build(b));
    return boolean;
  };
  record("getPointsCurves", () => {
    const boolean = initialized(ellipse(50, 50, 50, 50), ellipse(100, 50, 50, 50), [1, -1, true]);
    return [
      verts((boolean.sourceHead as PolyLineExtended).getPoints(true)),
      verts((boolean.clipHead as PolyLineExtended).getPoints(true)),
      boolean.numIntersections(),
    ];
  });
  record("getPointsCurvesQuad", () => {
    const boolean = initialized(quad, rect(20, -40, 60, 200), [1, -1]);
    return [
      verts((boolean.sourceHead as PolyLineExtended).getPoints(true)),
      boolean.numIntersections(),
    ];
  });
  record("numIntersections.disjoint", () =>
    initialized(rect(0, 0, 10, 10), rect(50, 50, 10, 10), [1, -1]).numIntersections(),
  );
  record("determineInside", () => {
    const boolean = initialized(rect(0, 0, 100, 100), rect(50, 50, 100, 100), [1, -1]);
    const source = boolean.sourceHead as PolyLineExtended;
    const clip = boolean.clipHead as PolyLineExtended;
    const result: unknown[] = [];
    for (const [a, b] of [
      [source, clip],
      [clip, source],
    ] as [PolyLineExtended, PolyLineExtended][])
      for (const use of [false, true]) {
        const found: PolyLineExtended[] = [];
        const inside = boolean.determineInside(a, b, found, null, use);
        result.push([inside, found[0] ? [found[0].x, found[0].y] : null]);
      }
    const same = initialized(rect(0, 0, 50, 50), rect(0, 0, 50, 50), [1, -1]);
    for (const use of [false, true]) {
      const found: PolyLineExtended[] = [];
      const inside = same.determineInside(
        same.sourceHead as PolyLineExtended,
        same.clipHead as PolyLineExtended,
        found,
        null,
        use,
      );
      result.push([inside, found[0] ? [found[0].x, found[0].y] : null]);
    }
    return result;
  });
  record(
    "joinVertices.one",
    () => VPB.joinVertices([build(rect(0, 0, 10, 10))]) ?? "returned undefined",
  );
  record("joinVertices.two", () =>
    VPB.joinVertices([build(rect(0, 0, 10, 10)), build(rect(20, 20, 10, 10))]),
  );

  // R4-B-025: the simplifier asks the source's own hasMixin.
  const duck = (answer: boolean) => {
    const inner = build(ellipse(0, 0, 20, 10));
    return {
      hasMixin: () => answer,
      rewindVertices: (index: number) => inner.rewindVertices(index),
      readVertex: (vertex: Vertex) => inner.readVertex(vertex),
    } as unknown as VertexReader;
  };
  record("simplifier.duckTrue", () => {
    const simplifier = new impl.VertexSimplifier(duck(true));
    return [simplifier.polys.length, verts(simplifier.simplify(0.5, false, true))];
  });
  record("simplifier.duckFalse", () => new impl.VertexSimplifier(duck(false)).polys.length);
  return normalize(out) as Record<string, unknown>;
}

/** The scratch differential fuzz of the review, as seeded cases. */
export function fuzzCases(
  impl: BooleanImpl,
  seedStart: number,
  iterations: number,
): Record<string, string> {
  const { build, verts, hits } = drivers(impl);
  let seed = seedStart >>> 0;
  const random = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const coordinate = (): number => {
    if (random() < 0.35) return Math.floor(random() * 11) * 10;
    return Math.round((random() * 140 - 20) * 1000) / 1000;
  };
  const shape = (): number[] => {
    const flat: number[] = [];
    const subPaths = random() < 0.25 ? 2 : 1;
    for (let s = 0; s < subPaths; s++) {
      const kind = random();
      if (kind < 0.2) {
        const x = coordinate();
        const y = coordinate();
        flat.push(...rect(x, y, 5 + random() * 80, 5 + random() * 80));
        continue;
      }
      if (kind < 0.35) {
        const cx = coordinate();
        const cy = coordinate();
        const rx = 5 + random() * 50;
        flat.push(...ellipse(cx, cy, rx, 5 + random() * 50));
        continue;
      }
      const count = 3 + Math.floor(random() * 5);
      flat.push(1, coordinate(), coordinate());
      for (let i = 1; i < count; i++) {
        const segment = random();
        if (segment < 0.6) flat.push(2, coordinate(), coordinate());
        else if (segment < 0.8)
          flat.push(3, coordinate(), coordinate(), 3, coordinate(), coordinate());
        else
          flat.push(
            4,
            coordinate(),
            coordinate(),
            4,
            coordinate(),
            coordinate(),
            4,
            coordinate(),
            coordinate(),
          );
      }
      if (random() < 0.9) flat.push(5, 0, 0);
    }
    return flat;
  };
  const configs: ConstructorParameters<typeof VertexPolyBoolean>[] = [
    [1, -1, undefined, undefined],
    [1, -2, false, false],
    [0, -2, false, false],
    [1, -1, true, false],
    [1, -1, false, true],
    [1, 0, false, false],
    [1, 1, true, false],
  ];
  const out: Record<string, string> = {};
  for (let it = 0; it < iterations; it++) {
    const a = shape();
    const b = random() < 0.1 ? a.slice() : shape();
    configs.forEach((args, c) => {
      out[`${seedStart}.${it}.bool${c}`] = hashOf(
        [1, 2, 3, 4, 0].map((op) =>
          attempt(() => {
            const boolean = new impl.VertexPolyBoolean(...args);
            const ok = boolean.initializeSources(build(a), build(b));
            if (!ok) return { ok };
            const result = boolean.clipOp(op);
            return {
              result: result ? result.map((s) => verts(s)) : result,
              didNotClip: boolean.didNotClip,
              holes: boolean.hassHoles,
              count: boolean._numIntersections,
            };
          }),
        ),
      );
    });
    for (const tolerance of [0.1, 2])
      for (const [lines, subdivide] of [
        [false, true],
        [false, false],
        [true, true],
        [true, false],
      ] as [boolean, boolean][])
        out[`${seedStart}.${it}.simplify.${tolerance}.${lines}.${subdivide}`] = hashOf(
          attempt(() =>
            verts(new impl.VertexSimplifier(build(a)).simplify(tolerance, lines, subdivide)),
          ),
        );
    const PI = impl.PolyIntersector;
    out[`${seedStart}.${it}.redistribute`] = hashOf(
      attempt(() => [
        PI.redistributeVertexSource(build(a.concat(b))).containers.map((g) =>
          g.map((x) => verts(x)),
        ),
        PI.redistributeVertexSource(build(a), new impl.Transform(2, 0, 0, 2, 5, 5)).containers.map(
          (g) => g.map((x) => verts(x)),
        ),
      ]),
    );
    out[`${seedStart}.${it}.intersect`] = hashOf(
      attempt(() => hits(new PI().intersect(build(a), build(b)))),
    );
    out[`${seedStart}.${it}.intersectBezier`] = hashOf(
      attempt(() =>
        hits(new PI(true, true, true, 0.125).intersect(build(a), build(b), false, false)),
      ),
    );
    out[`${seedStart}.${it}.intersectBlock`] = hashOf(
      attempt(() => hits(new PI(true, true, false, 4, true).intersect(build(a), build(b)))),
    );
    out[`${seedStart}.${it}.selfLines`] = hashOf(
      attempt(() => hits(new PI(false, false, false, 2).intersect(build(a), build(a), true))),
    );
  }
  return out;
}
