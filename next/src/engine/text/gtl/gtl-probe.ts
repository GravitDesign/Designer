// Test support: drives the GTL layout engine through layout, editing,
// lists, transformers and drawing, and returns plain data. The same
// function runs in the old app's page against the old modules (to record
// __fixtures__/old-gtl.json; the TypeScript types are stripped first) and
// against the port in tl-core.test.ts, so it may only use what it is
// given and no imports.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface GtlProbeApi {
  /** GTLCore (old module 367) or TLCore. */
  TLCore: any;
  /** The run helpers (module 148). */
  Formatting: any;
  /** GTLUtil (module 161). */
  TLUtil: any;
  /** The run measuring and drawing helpers (module 195). */
  RunDraw: any;
  /** The OpenType text meter (module 416). */
  measure: any;
  /** The per sequence library (module 509). */
  Per: any;
  /** GTLCodes (module 920). */
  TLCodes: any;
  /** The GTL canvas context (module 655). */
  TLCanvasContext: any;
  VertexContainer: any;
  VertexInfo: any;
  Transform: any;
  RGBColor: any;
  /** A font manager with the probe fonts resolved. */
  fontManager: any;
}

/** The fonts the probe uses: family, style, weight. */
export const GTL_PROBE_FONTS: [string, string, number][] = [
  ["Open Sans", "N", 400],
  ["Open Sans", "N", 700],
  ["Open Sans", "I", 700],
  ["Open Sans", "I", 400],
  ["Open Sans", "N", 300],
  ["Open Sans", "I", 600],
  ["Open Sans", "N", 600],
  ["Noto Sans Hebrew", "N", 400],
  ["Noto Sans Arabic", "N", 400],
  ["Noto Sans CJK JP", "N", 400],
];

export function probeGtl(api: GtlProbeApi): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fm = api.fontManager;

  // -- Encoding: exact numbers, with the values JSON can't hold tagged.
  const enc = (value: any, depth = 0): any => {
    if (typeof value === "number") {
      if (Object.is(value, -0)) return "-0";
      if (Number.isNaN(value)) return "NaN";
      if (value === Infinity) return "Inf";
      if (value === -Infinity) return "-Inf";
      return value;
    }
    if (value === undefined) return "undef";
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "function") return "fn";
    if (depth > 6) return "deep";
    if (Array.isArray(value)) return value.map((v) => enc(v, depth + 1));
    if (typeof value.getMatrix === "function") return ["T"].concat(value.getMatrix().map(enc));
    if (typeof value.getX === "function" && typeof value.getWidth === "function") {
      return [
        "R",
        enc(value.getX()),
        enc(value.getY()),
        enc(value.getWidth()),
        enc(value.getHeight()),
      ];
    }
    if (value.constructor && value.constructor !== Object && typeof value.toString === "function") {
      const text = String(value);
      if (text !== "[object Object]") return "obj:" + text;
    }
    const result: Record<string, any> = {};
    for (const key in value) result[key] = enc(value[key], depth + 1);
    return result;
  };
  /**
   * A CSS color as a browser canvas reports it after a write ("transparent"
   * reads back as rgba(0, 0, 0, 0)), so Node's fake canvas and Chromium agree.
   */
  const color = (value: any): any => {
    if (typeof value !== "string") return enc(value);
    const text = value.trim().toLowerCase();
    if (text === "transparent") return "rgba(0, 0, 0, 0)";
    if (text === "black") return "#000000";
    if (/^#[0-9a-f]{3}$/.test(text))
      return "#" + text[1] + text[1] + text[2] + text[2] + text[3] + text[3];
    return text;
  };
  const tl = (r: any): any =>
    r ? [enc(r.l), enc(r.t), enc(r.w), enc(r.h), enc(r.r), enc(r.b)] : enc(r);
  /** A short exact digest of a long list of values. */
  const digest = (parts: string[]): string => {
    let hash = 2166136261;
    const text = parts.join(";");
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return parts.length + ":" + hash.toString(16);
  };
  const vertexDigest = (source: any): any => {
    if (!source) return enc(source);
    const parts: string[] = [];
    const vertex: any = { command: 0, x: 0, y: 0 };
    const head: any[] = [];
    if (source.rewindVertices(0)) {
      while (source.readVertex(vertex)) {
        parts.push(vertex.command + "," + String(vertex.x) + "," + String(vertex.y));
        if (head.length < 6) head.push([vertex.command, enc(vertex.x), enc(vertex.y)]);
      }
    }
    const bounds = api.VertexInfo.calculateBounds(source, true);
    return { digest: digest(parts), head, bounds: enc(bounds) };
  };

  // -- A 2D context stand-in that logs every call and property write.
  const makeLogger = (): any => {
    const log: string[] = [];
    const state: Record<string, any> = {
      fillStyle: "#000000",
      strokeStyle: "#000000",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      miterLimit: 10,
      font: "10px sans-serif",
      textAlign: "start",
      textBaseline: "alphabetic",
    };
    const ctx: any = { log };
    for (const key of Object.keys(state)) {
      Object.defineProperty(ctx, key, {
        get: () => state[key],
        set: (value: any) => {
          log.push("set " + key + "=" + JSON.stringify(enc(value)));
          state[key] = value;
        },
      });
    }
    const methods = [
      "save",
      "restore",
      "beginPath",
      "moveTo",
      "lineTo",
      "quadraticCurveTo",
      "bezierCurveTo",
      "closePath",
      "fill",
      "stroke",
      "fillRect",
      "strokeRect",
      "clearRect",
      "fillText",
      "strokeText",
      "setTransform",
    ];
    for (const name of methods) {
      ctx[name] = (...args: any[]) => {
        log.push(name + JSON.stringify(enc(args)));
      };
    }
    return ctx;
  };
  const logDigest = (log: string[]): any => ({ digest: digest(log), head: log.slice(0, 12) });

  // -- Fonts: the same files must be loaded on both sides.
  out.fonts = GTL_PROBE_FONTS.map((f) => {
    const font = fm.getFont(f[0], f[1], f[2]);
    const ot = font && font._openTypeFont;
    return [f.join("/"), !!font && font.isResolved(), ot ? [ot.unitsPerEm, ot.numGlyphs] : null];
  });

  // -- Static helpers.
  const F = api.Formatting;
  const U = api.TLUtil;
  const R = api.RunDraw;
  out.parseFont = [
    "normal 400 20px Open Sans",
    "italic 700 12px Noto Sans Hebrew",
    "bold 12pt Arial",
    'oblique small-caps lighter 9px/1.5 "Quoted Family"',
    "bolder 7.25px Some Family Name",
    "N 400 20px Open Sans",
    "normal normal 0px X",
    "italic 100 abc Font",
  ].map((text) => {
    try {
      return enc(U.parseFont(text));
    } catch (e: any) {
      return "throws " + e.constructor.name;
    }
  });
  out.cssProperty = [
    ["font: italic 700 12px Open Sans; color: red", "font", false],
    ["color: red; font-size: 12.5px", "font-size", true],
    ["a:b", "c", false],
    ["font:12px X; vertical-align: super", "vertical-align", false],
  ].map((c) => U.cssProperty(c[0], c[1], c[2]));
  out.transformText = [
    ["hello wORLD  foo", "uppercase"],
    ["hello wORLD  foo", "lowercase"],
    ["hello wORLD  foo", "capitalize"],
    ["hello wORLD", "smallcaps"],
    ["hello", null],
  ].map((c) => U.transformText(c[0], c[1], fm.getDefaultFont()));
  out.deCRLFify = U.deCRLFify("a\r\nb\r\nc\rd\te\r");
  const fontStringRuns: any[] = [
    null,
    {},
    { fontSize: 12, fontFamily: "Open Sans", fontWeight: 700, fontStyle: "italic" },
    { fontSize: 15, script: "super" },
    { fontSize: 15, script: "sub", fontWeight: { x: 1 } },
    { fontColor: "#ff0000", script: "super" },
  ];
  out.fontString = fontStringRuns.map((run) => [
    R.getFontString(run),
    R.getRunStyle(run),
    R.getRunStyle(run, true),
    enc(R.getAdditionalProps(run)),
  ]);
  const runA = { text: "a", fontSize: 12, fontFamily: "X", underline: true };
  const runB = { text: "b", fontSize: 12, fontFamily: "Y" };
  out.formatting = {
    same: [F.sameFormatting(runA, runB), F.sameFormatting(runA, { ...runA, text: "z" })],
    clone: enc(F.clone(Object.create(runA, { fontSize: { value: NaN } }))),
    merge: enc(F.merge(runA, runB)),
    mergeMarker: F.merge(runA, runB).fontFamily === F.multipleValues,
    lengths: [
      F.getTextLength("abc"),
      F.getTextLength(["ab", { $: "X" }, "c"]),
      F.getTextLength({ $: "X" }),
    ],
    plain: [
      F.getPlainText({ text: "ab" }),
      F.getPlainText({ text: ["ab", { $: "X" }] }),
      F.getPlainText({ text: { $: "X" } }),
    ],
    sub: (() => {
      const parts: any[] = [];
      F.getSubText((p: any) => parts.push(enc(p)), ["abc", { $: "X" }, "defg"], 1, 5);
      F.getSubText((p: any) => parts.push(enc(p)), "hello", 1, 3);
      return parts;
    })(),
    formatCreate: (() => {
      const created = F.format(
        { text: "q", fontSize: 3 },
        { fontSize: 9, align: F.multipleValues, underline: true },
        true,
      );
      return [
        Object.keys(created),
        created.text,
        created.fontSize,
        created.underline,
        "align" in created,
      ];
    })(),
    formatInPlace: (() => {
      const runs = [{ text: "a" }, { text: "b", fontSize: 1 }];
      F.format(runs, { fontSize: 9, align: F.multipleValues });
      return enc(runs);
    })(),
    consolidated: (() => {
      const merged: any[] = [];
      const step = F.consolidate();
      [
        { text: "a", fontSize: 1 },
        { text: "b", fontSize: 1 },
        { text: { $: "X" }, fontSize: 1 },
        { text: "c", fontSize: 2 },
      ].forEach((r) => step((x: any) => merged.push(x), r));
      return enc(merged);
    })(),
  };
  const P = api.Per;
  out.per = {
    map: P.create([1, 2, 3])
      .map((x: number, i: number) => x * 10 + i)
      .all(),
    filterSum: P.create([1, 2, 3, 4])
      .filter((x: number) => x % 2)
      .sum()
      .last(),
    take: P.create([1, 2, 3, 4]).take(2).all(),
    skip: P.create([1, 2, 3, 4]).skip(3).all(),
    first: P.create([5, 6]).first(),
    last: P.create([5, 6]).last(),
    min: P.create([5, 2, 6]).min().last(),
    max: P.create([5, 2, 6]).max().last(),
    concat: P.create([1]).concat([2, 3]).all(),
    flatten: P.create([[1, 2], 3])
      .flatten()
      .all(),
    reduce: P.create([1, 2, 3])
      .reduce((a: number, b: number) => a + b)
      .all(),
    some: [
      P.create([1, 2]).some((x: number) => x > 1),
      P.create([1, 2]).some((x: number) => x > 5),
    ],
    andOr: [
      P.create([1, 0]).and().last(),
      P.create([0, 0]).or().last(),
      P.create([1, 0]).not().all(),
    ],
    truthy: P.create([0, 1, null, 2]).truthy().all(),
    into: (() => {
      const target: number[] = [];
      P.create([1, 2, 3]).into(target, 2).submit();
      return target;
    })(),
    monitor: (() => {
      const m: any = { limit: 2 };
      P.create([7, 8, 9]).monitor(m).submit();
      return [m.count, m.first, m.last];
    })(),
    stringMapper: P.create([1, 2]).map("x * 3").all(),
    emptyCreate: P.create().all(),
  };

  // -- Measuring through the cached run measure and the text meter.
  const measured = (m: any) =>
    m
      ? [
          m.width,
          m.height,
          m.ascent,
          m.descent,
          m.minY,
          m.maxY,
          m.minX,
          m.maxX,
          m.lastGlyphWidth,
          m.lastGlyphAdvance,
        ].map(enc)
      : enc(m);
  const coreForDefaults = new api.TLCore();
  coreForDefaults.initialize(100, 100, fm, () => {});
  out.defaultFormatting = enc(F.defaultFormatting);

  // -- List marker codes.
  const C = api.TLCodes;
  const markerData = (path: number[]) => ({
    node: { getDepth: () => path.length - 1 },
    pathNumber: path,
  });
  const numberPaths = [
    [0],
    [3],
    [0, 0],
    [0, 24],
    [0, 25],
    [1, 51],
    [2, 0, 0],
    [2, 0, 3],
    [0, 0, 8],
    [0, 0, 1993],
    [0, 0, 0, 4],
    [0, 0, 0, 0, 26],
  ];
  out.markers = {
    numbers: numberPaths.map((path) => [
      new C.Number({ $: "Number" }, markerData(path)).value,
      new C.RomanDot({ $: "RomanDot" }, markerData(path)).value,
      new C.RomanBracket({ $: "RomanBracket" }, markerData(path)).value,
    ]),
    shapes: ["Bullet", "Check", "Square"].map((name) =>
      [0, 1, 2, 3].map((depth) => {
        const code = new C[name]({ $: name }, { node: { getDepth: () => depth }, pathNumber: [0] });
        return vertexDigest(code.source).digest;
      }),
    ),
    measured: ["Bullet", "Check", "Square", "Number", "RomanDot"].map((name) => {
      const code = new C[name]({ $: name }, markerData([0, 2]));
      return [enc(code.measure({ fontSize: 16, fontFamily: "Open Sans" })), enc(code._bbox)];
    }),
    factory: [
      enc(C.codeFactory({ $: "Nope" }, null, null)),
      C.codeFactory({ $: "ListEnd", extra: 1 }, null, null).extra,
      C.codeFactory({ $: "ListNext" }, null, null).eof,
      enc(C.codeFactory({ $: "ListStart", x: 2 }, "d", null).measure()),
    ],
  };

  const measureCases: [string, any][] = [
    ["Hello", {}],
    ["Hello world", { fontSize: 40 }],
    ["AVAV Ta", { fontSize: 30, charSpacing: 3 }],
    ["office", { ligatures: true }],
    ["office", { ligatures: false }],
    ["1/2", { fractions: true }],
    ["x2", { fontSize: 15, script: "super" }],
    ["H2O", { fontSize: 15, script: "sub" }],
    ["Hello", { transformation: "uppercase" }],
    [" ", { wordSpacing: 7 }],
    [" ", {}],
    ["fjord", { fontStyle: "italic", fontWeight: 700 }],
    ["שלום", { fontFamily: "Noto Sans Hebrew" }],
    ["مرحبا", { fontFamily: "Noto Sans Arabic" }],
    ["日本語テキスト", { fontFamily: "Noto Sans CJK JP" }],
    ["Missing", { fontFamily: "No Such Family" }],
  ];
  out.measure = measureCases.map(([text, run]) => {
    try {
      return measured(R.measure(text, run));
    } catch (e: any) {
      return "throws " + e.constructor.name;
    }
  });
  out.meterDirect = measured(
    api.measure("Typo", "font: normal 300 17px Open Sans", { charSpacing: 1.5 }),
  );

  // -- Layout of a core.
  const nodeTree = (node: any, depth: number): any => {
    const entry: any = [node.type, enc(node.ordinal), enc(node.length), tl(node.bounds())];
    if (node.type === "inline")
      entry.push(enc(node.left), enc(node.baseline), tl(node.bounds(true)));
    if (node.type === "line") entry.push(enc(node.baseline), enc(node.actualWidth));
    if (depth < 4 && node.type !== "line" && node.children) {
      entry.push(node.children().map((child: any) => nodeTree(child, depth + 1)));
    }
    return entry;
  };
  const describeLines = (core: any): any =>
    core.getLines().map((line: any) => ({
      box: [line.left, line.width, line.baseline, line.ascent, line.descent].map(enc),
      ordinal: [line.ordinal, line.length].map(enc),
      paragraph: [line.align, line.lineSpacing, line.paragraphSpacing, line.paragraphIndent].map(
        enc,
      ),
      ink: [line.minX, line.maxX, line.minY, line.maxY, line.actualWidth, line.rightPadding].map(
        enc,
      ),
      eof: line.isEOF(),
      spacing: enc(line.getLastValidCharSpacing()),
      words: line.positionedWords.map((w: any) => [
        enc(w.left),
        enc(w.width),
        enc(w.ordinal),
        enc(w.length),
        w.word.plainText(),
        tl(w.bounds(true)),
      ]),
    }));
  const describe = (
    core: any,
    extra?: { boxes?: boolean; carets?: boolean; hits?: boolean; draw?: boolean },
  ) => {
    const result: any = {};
    const frame = core._doc.frame;
    result.ok = !!frame;
    if (!frame) return result;
    result.sizes = [
      core.getWidth(),
      core.getHeight(),
      core.getActualWidth(),
      core.getActualHeight(),
      core.getLength(),
      core.getTopMargin(),
      core.getBottomMargin(),
      core.getLeftPadding(),
      core.getRightPadding(),
      core.getBBoxSpacing(),
      core.getMinX(),
      core.getDirection(),
    ].map(enc);
    result.bounds = [
      tl(core.getRealBounds()),
      tl(core.getActualBounds()),
      tl(frame.bounds()),
      tl(frame.bounds(true)),
    ];
    result.frame = [frame.ascent(), frame.descent(), frame.baseline(), frame.height].map(enc);
    result.lines = describeLines(core);
    result.tree = frame.lines.map((line: any) => nodeTree(line, 0));
    result.plain = core.getDocumentRange().plainText();
    result.saved = enc(core.getRichContent());
    const vertices = new api.VertexContainer();
    core.renderVertices(vertices);
    result.outline = vertexDigest(vertices);
    result.renderBounds = enc(core._calculateRenderBounds());
    const styled: any[] = [];
    core.renderVerticesWithStyle(styled);
    result.styled = styled.map((entry) => ({
      fill: color(entry.fill),
      stroke: color(entry.stroke),
      textFill: enc(entry.textFill),
      alpha: enc(entry.alpha),
      op: entry.op,
      transform: enc(entry.transform),
      vertices: entry.vertices ? vertexDigest(entry.vertices).digest : enc(entry.vertices),
    }));
    if (extra && extra.carets !== false) {
      const carets: any[] = [];
      for (let i = 0; i <= core.getLength(); i++) {
        try {
          carets.push(tl(core.getCaretCoords(i)));
        } catch (e: any) {
          carets.push("throws " + e.constructor.name);
        }
      }
      result.carets = carets;
    }
    if (extra && extra.boxes) {
      const boxes = core.getBoxes(core.getDocumentRange());
      result.boxes = boxes && boxes.map((b: any) => [enc(b.box), enc(b.transform)]);
      result.boxesFiltered = enc(
        (core.getBoxes(core.getRange(0, 3), (n: any) => n.type === "character") || []).length,
      );
    }
    if (extra && extra.hits) {
      const hits: any[] = [];
      const width = core.getWidth() || 100;
      const height = core.getHeight() || 30;
      for (let y = -5; y <= height + 5; y += Math.max(4, height / 6)) {
        for (let x = -5; x <= width + 5; x += Math.max(6, width / 8)) {
          const node = core.byCoordinate(x, y);
          hits.push(node ? [node.type, enc(node.ordinal)] : null);
        }
      }
      result.hits = hits;
    }
    if (extra && extra.draw) {
      // Drawing through the GTL canvas context into a logging context.
      const savedCtx = core._ctx;
      const flags = [
        ["fill", 1, { shapePaint: null }],
        ["stroke", 2, { shapePaint: api.RGBColor.BLACK, strokeWidth: 2 }],
        ["vertexFill", 1 | 4, { shapePaint: new api.RGBColor([200, 10, 10]), opacity: 0.5 }],
        [
          "vertexStrokeInside",
          2 | 4,
          { shapePaint: api.RGBColor.BLACK, strokeAlign: "I", lineJoin: "round" },
        ],
        [
          "vertexFillEvenOdd",
          1 | 4,
          { evenodd: true, valign: "m", paintTransform: new api.Transform(2, 0, 0, 2, 1, 1) },
        ],
      ];
      result.draw = flags.map(([name, flag, style]) => {
        const logger = makeLogger();
        core._ctx = new api.TLCanvasContext(core, logger);
        core._ctx.textTransformer = savedCtx.textTransformer;
        try {
          core.render(false, 1, style, flag);
          return [name, logDigest(logger.log), enc(core.getVShift())];
        } catch (e: any) {
          return [name, "throws " + e.constructor.name + ": " + e.message];
        } finally {
          core._ctx = savedCtx;
        }
      });
    }
    return result;
  };

  const SAMPLE = "The quick brown fox jumps over the lazy dog";
  interface Case {
    text: any;
    width?: number;
    wrap?: boolean;
    direction?: number;
    padding?: number;
    height?: number;
  }
  const make = (c: Case): any => {
    const core = new api.TLCore();
    core.initialize(c.width || 1, c.height || 1, fm, () => {});
    if (c.padding !== undefined) core.setPadding(c.padding);
    core.setWrap(!!c.wrap);
    const ok = core.setText(c.text);
    core.setWidth(c.width === undefined ? api.TLCore.AUTO : c.width);
    if (c.height !== undefined) core.setHeight(c.height);
    if (c.direction !== undefined) core.setDirection(c.direction);
    core._loadResult = ok;
    return core;
  };
  const os = (extra: any) => Object.assign({ fontFamily: "Open Sans" }, extra);
  const cases: Record<string, Case> = {
    plain: { text: "Hello world" },
    stringSecond: { text: "Hello world\nSecond line" },
    empty: { text: "" },
    trailingNewline: { text: "abc\n" },
    onlyNewlines: { text: "\n\n" },
    size40: { text: [os({ text: "Hello", fontSize: 40 })] },
    bold: { text: [os({ text: "Hello", fontWeight: 700 })] },
    boldItalic: { text: [os({ text: "Hello", fontWeight: 700, fontStyle: "italic" })] },
    light: { text: [os({ text: "Hello", fontWeight: 300 })] },
    semiBoldItalic: { text: [os({ text: "Hello", fontWeight: 600, fontStyle: "italic" })] },
    letterSpacing: { text: [os({ text: "Hello", charSpacing: 5 })] },
    letterSpacingWrap: { text: [os({ text: SAMPLE, charSpacing: 4 })], width: 160, wrap: true },
    wordSpacing: { text: [os({ text: "a b c d", wordSpacing: 10 })] },
    lineHeight: { text: [os({ text: "one\ntwo\nthree", lineSpacing: 2 })] },
    lineHeightPx: { text: [os({ text: "one\ntwo", lineSpacing: "33" })] },
    paragraphSpacing: { text: [os({ text: "one\ntwo\nthree", paragraphSpacing: "15" })] },
    paragraphSpacingFactor: { text: [os({ text: "one\ntwo", paragraphSpacing: 0.5 })] },
    paragraphIndent: {
      text: [os({ text: "one\ntwo", paragraphIndent: 20 })],
      width: 200,
      wrap: true,
    },
    wrapLeft: { text: [os({ text: SAMPLE })], width: 150, wrap: true },
    wrapCenter: { text: [os({ text: SAMPLE, align: "center" })], width: 150, wrap: true },
    wrapRight: { text: [os({ text: SAMPLE, align: "right" })], width: 150, wrap: true },
    wrapJustify: {
      text: [os({ text: SAMPLE + "\n" + SAMPLE, align: "justify" })],
      width: 150,
      wrap: true,
    },
    noWrapFixed: {
      text: [os({ text: SAMPLE, align: "right", charSpacing: 2 })],
      width: 100,
      wrap: false,
    },
    noWrapRightSpacing: {
      text: [os({ text: "Short", align: "right", charSpacing: 3 })],
      width: 200,
      wrap: false,
    },
    noWrapCenterSpacing: {
      text: [os({ text: "Short", align: "center", charSpacing: 3 })],
      width: 200,
      wrap: false,
    },
    wrapRightSpacing: {
      text: [os({ text: "Short", align: "right", charSpacing: 3 })],
      width: 200,
      wrap: true,
    },
    longWord: {
      text: [os({ text: "Supercalifragilisticexpialidocious word" })],
      width: 60,
      wrap: true,
    },
    punctuation: {
      text: [os({ text: "Hello, world! (test) [x] foo-bar «quote» $5 x/y" })],
      width: 70,
      wrap: true,
    },
    underline: { text: [os({ text: "Underlined", underline: true })] },
    strikeout: { text: [os({ text: "Struck", strikeout: true })] },
    uppercase: { text: [os({ text: "Hello World", transformation: "uppercase" })] },
    capitalize: { text: [os({ text: "hello world", transformation: "capitalize" })] },
    smallCaps: { text: [os({ text: "Hello World", transformation: "smallcaps" })] },
    superscript: {
      text: [os({ text: "x", fontSize: 20 }), os({ text: "2", fontSize: 20, script: "super" })],
    },
    subscript: {
      text: [os({ text: "H" }), os({ text: "2", script: "sub", fontSize: 20 }), os({ text: "O" })],
    },
    ligatures: { text: [os({ text: "office flow", ligatures: true })] },
    fractions: { text: [os({ text: "1/2 3/4", fractions: true })] },
    hebrew: { text: [{ text: "שלום עולם", fontFamily: "Noto Sans Hebrew" }] },
    arabicRtl: { text: [{ text: "مرحبا بالعالم", fontFamily: "Noto Sans Arabic" }], direction: 1 },
    rtl: { text: [os({ text: "Right to left", underline: true })], direction: 1 },
    ttb: { text: [{ text: "日本語 abc", fontFamily: "Noto Sans CJK JP" }], direction: 2 },
    btt: { text: [os({ text: "Bottom" })], direction: 3 },
    cjkWrap: {
      text: [
        {
          text: "日本語のテキストを折り返す。「かぎ」とカタカナ、ひらがな",
          fontFamily: "Noto Sans CJK JP",
        },
      ],
      width: 90,
      wrap: true,
    },
    richRuns: {
      text: [
        os({ text: "Small ", fontSize: 12 }),
        os({ text: "Big ", fontSize: 36, fontWeight: 700 }),
        os({ text: "italic ", fontStyle: "italic" }),
        os({ text: "under", underline: true }),
        os({ text: "\nnext line", lineSpacing: 1.5, charSpacing: 3 }),
      ],
      width: 300,
      wrap: true,
    },
    softBreak: { text: [os({ text: "soft break\nhard" })] },
    tabs: { text: "a\tb" },
    padded: { text: [os({ text: "Pad" })], padding: 7 },
    fixedHeight: { text: [os({ text: "Fixed" })], width: 100, height: 80, wrap: true },
    codeUnknown: { text: [os({ text: "a" }), os({ text: { $: "Unknown" } }), os({ text: "b" })] },
    listBullet: {
      text: [
        os({ text: { $: "ListStart" }, listMarker: "Bullet", listDepth: 0, fontSize: 20 }),
        os({ text: "first", fontSize: 20 }),
        os({ text: { $: "ListNext" }, listMarker: "Bullet", listDepth: 0, fontSize: 20 }),
        os({ text: "second", fontSize: 20 }),
        os({ text: { $: "ListEnd" }, fontSize: 20 }),
        os({ text: "after", fontSize: 20 }),
      ],
    },
    listNested: {
      text: [
        os({ text: { $: "ListStart" }, listMarker: "Number", listDepth: 0 }),
        os({ text: "top" }),
        os({ text: { $: "ListNext" }, listMarker: "RomanDot", listDepth: 1 }),
        os({ text: "inner" }),
        os({ text: { $: "ListNext" }, listMarker: "RomanBracket", listDepth: 2 }),
        os({ text: "deeper" }),
        os({ text: { $: "ListNext" }, listMarker: "Check", listDepth: 1 }),
        os({ text: "check" }),
        os({ text: { $: "ListNext" }, listMarker: "Square", listDepth: 0 }),
        os({ text: "back" }),
        os({ text: { $: "ListNext" }, listMarker: "RomanDot", listDepth: 2 }),
        os({ text: "jump" }),
        os({ text: { $: "ListEnd" } }),
      ],
      width: 200,
      wrap: true,
    },
    listEmptyItem: {
      text: [
        os({ text: { $: "ListStart" }, listMarker: "Number", listDepth: 0, fontSize: 14 }),
        os({ text: "" }),
        os({ text: { $: "ListNext" }, listMarker: "Number", listDepth: 0, fontSize: 14 }),
        os({ text: "x" }),
        os({ text: { $: "ListEnd" }, fontSize: 14 }),
      ],
    },
    listUnclosed: {
      text: [
        os({ text: "before\n" }),
        os({ text: { $: "ListNext" }, listMarker: "Bullet" }),
        os({ text: "orphan item" }),
      ],
    },
  };
  const layouts: Record<string, any> = {};
  for (const [name, c] of Object.entries(cases)) {
    try {
      const core = make(c);
      const detail =
        name === "plain" ||
        name === "wrapJustify" ||
        name === "listNested" ||
        name === "rtl" ||
        name === "richRuns";
      layouts[name] = describe(core, { boxes: true, carets: true, hits: detail, draw: detail });
      layouts[name].load = enc(core._loadResult);
    } catch (e: any) {
      layouts[name] = "throws " + e.constructor.name + ": " + e.message;
    }
  }
  out.layouts = layouts;

  // -- Editing through ranges.
  const edits: Record<string, any> = {};
  const edit = (name: string, text: any, steps: (core: any) => any) => {
    try {
      const core = make({ text, width: 220, wrap: true });
      const result = steps(core);
      edits[name] = { result: enc(result), after: describe(core, { carets: false }) };
    } catch (e: any) {
      edits[name] = "throws " + e.constructor.name + ": " + e.message;
    }
  };
  edit("toggleBullet", "first\nsecond\nthird", (core) => [
    core.getDocumentRange().toggleList("Bullet"),
    core.getDocumentRange().isList(),
  ]);
  edit("toggleNumberNested", "top\ninner\nlast", (core) => {
    const done = core.getDocumentRange().toggleList("Number");
    const at = core.getDocumentRange().plainText().indexOf("inner");
    const range = core.getRange(at, at + 5);
    return [done, range.canChangeListDepth(), range.increaseList(), range.canInsertListItem()];
  });
  edit("toggleRomanDotTwice", "top\ninner\nlast", (core) => {
    const done = core.getDocumentRange().toggleList("RomanDot");
    const at = core.getDocumentRange().plainText().indexOf("inner");
    core.getRange(at, at + 5).increaseList();
    core.getRange(at, at + 5).increaseList();
    const back = core.getRange(at, at + 5).decreaseList();
    return [done, back];
  });
  edit("toggleCheckOff", "a\nb", (core) => {
    const on = core.getDocumentRange().toggleList("Check");
    const off = core.getDocumentRange().toggleList(null);
    return [on, off];
  });
  edit("listPartial", "one\ntwo\nthree\nfour", (core) => {
    const range = core.getRange(5, 8);
    return [range.toggleList("Square"), core.getRange(0, 2).isList()];
  });
  edit("listJoinPrevious", "one\ntwo\nthree", (core) => {
    core.getRange(0, 2).toggleList("Bullet");
    const at = core.getDocumentRange().plainText().indexOf("three");
    return core.getRange(at, at + 2).toggleList("Bullet");
  });
  edit("createListItem", "one\ntwo", (core) => {
    core.getDocumentRange().toggleList("Number");
    const item = core.getRange(2, 2).createListItem();
    const caret = core.getRange(2, 2);
    return [enc(item), caret.canInsertListItem(), caret.canChangeListDepth()];
  });
  edit("insertAndSplice", [os({ text: "Hello world", fontSize: 18 })], (core) => {
    core.select(5, 5);
    core.insert(" big");
    const d1 = core._doc.splice(0, 1, "J");
    const d2 = core._doc.splice(3, 6, [os({ text: "XY", fontWeight: 700 })]);
    const d3 = core.getRange(1, 4).clear();
    return [d1, d2, d3, core.getSelection().start, core.getSelection().end];
  });
  edit("setFormatting", [os({ text: "Hello brave new world" })], (core) => {
    core.getRange(6, 11).setFormatting("fontWeight", 700);
    core.getRange(0, 5).setFormatting(["fontSize", "underline", "align"], [30, true, "center"]);
    core.getRange(12, 15).setFormatting("lineSpacing", 2);
    const f = core.getRange(6, 11).getFormatting();
    const mixed = core.getRange(0, 11).getFormatting();
    return [
      enc(f),
      mixed.fontWeight === api.Formatting.multipleValues,
      enc(core.getRange(3, 3).getFormatting()),
    ];
  });
  edit("insertFormatting", [os({ text: "ab" })], (core) => {
    core.select(1, 1);
    core.getRange(1, 1).setFormatting("fontSize", 40);
    const next = enc(core._doc.nextInsertFormatting);
    core.insert("X");
    return next;
  });
  edit("emptyThenType", [os({ text: "gone", fontSize: 33, fontWeight: 700 })], (core) => {
    core.getDocumentRange().clear();
    const empty = enc(core._doc.emptyFormatting);
    core.select(0, 0);
    core.insert("new");
    return empty;
  });
  edit("paragraphRange", "aa\nbb cc\ndd", (core) => {
    const p = core._doc.paragraphRange(4, 4);
    const l = core._doc.lineRange(4);
    core.select(4, 5);
    const sp = core.selectedParagraphRange();
    return [p.start, p.end, l.start, l.end, sp.start, sp.end, core.getRange(3, 6).plainText()];
  });
  edit("blocks", "aa\nbb\ncc", (core) => {
    core.getRange(3, 5).toggleList("Bullet");
    const blocks: any[] = [];
    core._doc.blocks(
      (b: any) => blocks.push([b.start, b.end, !!b.prev, enc(b.next)]),
      core.getDocumentRange(),
    );
    return blocks;
  });
  edit("undo", [os({ text: "undo me" })], (core) => {
    core.getRange(0, 4).setText("re");
    const can = [core._doc.canUndo(), core._doc.canUndo(true), core._doc.undo.length];
    return can;
  });
  edit("wordOrdinals", "aa bb\ncc dd", (core) => {
    const doc = core._doc;
    const list: any[] = [];
    for (let i = 0; i < doc.words.length + 1; i++) list.push(enc(doc.wordOrdinal(i)));
    const found = core.wordContainingOrdinal(4);
    return [list, found && [found.ordinal, found.index, found.offset, found.word.plainText()]];
  });
  edit("caretToggle", "ab", (core) => {
    const doc = core._doc;
    core.select(1, 1);
    const states = [
      core.toggleCaret(),
      core.toggleCaret(),
      core.toggleCaret(),
      core.isCaretVisible(),
      core.isSelectionChanged(),
    ];
    const logger = makeLogger();
    doc.drawSelection(logger, true);
    core.select(0, 2);
    doc.drawSelection(logger, false);
    return [states, logDigest(logger.log)];
  });
  out.edits = edits;

  // -- Text on a path.
  const makePath = (vertices: number[][], closed: boolean): any => ({
    _vc: (() => {
      const vc = new api.VertexContainer();
      for (const v of vertices) vc.addVertex(v[0], v[1], v[2]);
      return vc;
    })(),
    $closed: closed,
    rewindVertices(i: number) {
      return this._vc.rewindVertices(i);
    },
    readVertex(v: any) {
      return this._vc.readVertex(v);
    },
    hasVertexForRead() {
      return this._vc.hasVertexForRead();
    },
    _calculateGeometryBBox() {
      return api.VertexInfo.calculateBounds(this._vc, true);
    },
    reverseOrder() {
      this._vc = api.VertexContainer.clone(this._vc, true);
    },
  });
  const circle: number[][] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    circle.push([i ? 2 : 1, 100 + 100 * Math.cos(a), 100 + 100 * Math.sin(a)]);
  }
  circle.push([5, 0, 0]);
  const open = [
    [1, 0, 100],
    [2, 100, 0],
    [2, 200, 100],
    [2, 320, 60],
  ];
  const paths: Record<string, any> = {};
  const pathCases: [string, number[][], boolean, number[], number?][] = [
    ["circle", circle, true, [0, -1, 0, 0]],
    ["circleOutside", circle, true, [0, 1, 0.5, 0]],
    ["circleInwards", circle, true, [1, -1, 3, 0]],
    ["circleDistance", circle, true, [0, -1, 0, 40]],
    ["open", open, false, [0, -1, 0, 0]],
    ["openOffsetDistance", open, false, [0, 1, 6, 25]],
    ["circleRtl", circle, true, [0, -1, 0, 0], 1],
  ];
  for (const [name, vertices, closed, params, direction] of pathCases) {
    try {
      const core = make({
        text: [os({ text: "Around the circle we go", fontSize: 16, underline: name === "open" })],
      });
      if (direction !== undefined) core.setDirection(direction);
      core.setPath(makePath(vertices, closed), params[0], params[1], params[2], params[3]);
      const transformer = core.getTransformer("path");
      paths[name] = {
        layout: describe(core, { boxes: true, carets: false, draw: name === "circle" }),
        first: core.getTransformer() && core.getTransformer().getType(),
        pre: enc(transformer && transformer.getPreTransform()),
        hasPath: !!core.hasPathTransformer(),
      };
      core.setPath(null, 0, -1, 0, 0);
      paths[name].removed = [
        !!core.hasPathTransformer(),
        enc(core.getTransformer() && core.getTransformer().getType()),
        core.getWidth(),
      ];
    } catch (e: any) {
      paths[name] = "throws " + e.constructor.name + ": " + e.message;
    }
  }
  out.paths = paths;

  // -- Direction switching on one core.
  try {
    const core = make({ text: [os({ text: "Dir test" })] });
    const steps: any[] = [];
    for (const d of [1, 2, 3, 0, "1", 0]) {
      core.setDirection(d);
      const v = new api.VertexContainer();
      core.renderVertices(v);
      steps.push([
        enc(d),
        core.getDirection(),
        enc(core.getRenderBounds()),
        vertexDigest(v).digest,
      ]);
    }
    out.directions = steps;
  } catch (e: any) {
    out.directions = "throws " + e.constructor.name + ": " + e.message;
  }

  // -- Clone, events and the uninitialized core.
  try {
    const core = make({ text: [os({ text: "events" })] });
    const fired: any[] = [];
    core.contentChanged((p: any) => fired.push(["content", enc(p)]));
    core.selectionChanged((get: any) => fired.push(["selection", enc(get().fontFamily)]));
    core.paramChangeEvent("P");
    core.contentChanged((p: any) => fired.push(["content2", enc(p)]));
    core.select(1, 3);
    core.getRange(0, 1).setText("E");
    core.lockChangeEvents(true);
    core.getRange(0, 1).setText("e");
    const copy = core.cloneDocument();
    const fresh = new api.TLCore();
    let freshError: any = null;
    try {
      fresh.getCaretCoords(0);
    } catch (e: any) {
      freshError = e.message;
    }
    fresh.setWidth(50);
    out.misc = {
      fired,
      edited: core.getWasEdited(),
      clone: [copy.save().length, copy._width, copy.frame.length],
      fresh: [
        fresh.isInitialized(),
        fresh.getWidth(),
        fresh.getHeight(),
        fresh.getLength(),
        enc(fresh.getSelection()),
        freshError,
        enc(fresh._deferredSettings),
      ],
      padding: enc(core.getPadding()),
    };
  } catch (e: any) {
    out.misc = "throws " + e.constructor.name + ": " + e.message;
  }
  return out;
}
