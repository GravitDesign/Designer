// Test support: drives GText through layout, properties, paths, shapes,
// serialization and the legacy migrations, and returns plain data. The
// same function runs in the old app's page against GText (to record
// __fixtures__/old-text.json; the TypeScript types are stripped first) and
// against the port in text.test.ts, so it may only use what it is given and
// no imports.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface TextProbeApi {
  /** GText. */
  Text: any;
  /** GNode (serialize, deserialize). */
  Node: any;
  Transform: any;
  Point: any;
  Path: any;
  /** GPathBase (for GPathBase.AnchorPoint). */
  PathBase: any;
  VertexInfo: any;
  RGBColor: any;
  /** GStylable (FillPaintLayer, BorderPaintLayer). */
  Stylable: any;
  FontManager: any;
  /** A font manager with the probe fonts resolved, Open Sans Regular as default. */
  fontManager: any;
}

/** The fonts the probe needs resolved: family, style, weight. */
export const TEXT_PROBE_FONTS: [string, string, number][] = [
  ["Open Sans", "N", 400],
  ["Open Sans", "N", 700],
  ["Open Sans", "I", 700],
  ["Open Sans", "I", 400],
  ["Open Sans", "N", 300],
  ["Open Sans", "I", 600],
  ["Open Sans", "N", 600],
  ["Noto Sans Hebrew", "N", 400],
  ["Noto Sans Arabic", "N", 400],
];

export function probeText(api: TextProbeApi): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fm = api.fontManager;
  const workspace = {
    getFontManager: () => fm,
    getTransactionRecorder: () => null,
    addReference: () => {},
    removeReference: () => {},
    getReference: () => null,
  };

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
    // Only RGB as CSS: other color spaces go through a color profile.
    if (value instanceof api.RGBColor) return "color:" + value.toScreenCSS();
    if (typeof value.toScreenCSS === "function") return ["color", enc(value._value)];
    if (value.constructor && value.constructor !== Object && typeof value.toString === "function") {
      const text = String(value);
      if (text !== "[object Object]") return "obj:" + text;
    }
    const result: Record<string, any> = {};
    for (const key in value) result[key] = enc(value[key], depth + 1);
    return result;
  };
  const attempt = (fn: () => any): any => {
    try {
      return enc(fn());
    } catch (e) {
      return "throws: " + String((e as Error).name);
    }
  };
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
  const outline = (source: any): any => {
    if (!source) return enc(source);
    const parts: string[] = [];
    const vertex: any = { command: 0, x: 0, y: 0 };
    const head: any[] = [];
    if (source.rewindVertices(0)) {
      while (source.readVertex(vertex)) {
        parts.push(vertex.command + "," + String(vertex.x) + "," + String(vertex.y));
        if (head.length < 4) head.push([vertex.command, enc(vertex.x), enc(vertex.y)]);
      }
    }
    return {
      digest: digest(parts),
      head,
      bounds: enc(api.VertexInfo.calculateBounds(source, true)),
    };
  };
  const ID_KEYS = ["#", "@id", "_layId", "_effId", "&"];
  /** A blob with random ids replaced (also inside nested JSON strings). */
  const scrub = (value: any): any => {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === "object") {
      const result: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        const v = value[key];
        if (ID_KEYS.indexOf(key) >= 0 && typeof v === "string") result[key] = "<id>";
        else if (typeof v === "string" && /^[[{]/.test(v)) {
          try {
            result[key] = { json: scrub(JSON.parse(v)) };
          } catch {
            result[key] = v;
          }
        } else result[key] = scrub(v);
      }
      return result;
    }
    return enc(value);
  };
  const blob = (node: any, options?: any) => scrub(JSON.parse(api.Node.serialize(node, options)));
  const T = (a: number, b: number, c: number, d: number, e: number, f: number) =>
    new api.Transform(a, b, c, d, e, f);
  const boxes = (n: any) => ({
    source: enc(n.getSourceBBox()),
    geometry: enc(n.getGeometryBBox()),
    paint: enc(n.getPaintBBox()),
    exact: enc(n.getGeometryBBox(true)),
  });
  const PROPS = [
    "w",
    "h",
    "aw",
    "ah",
    "va",
    "trf",
    "dir",
    "_tff",
    "_tfi",
    "_tfw",
    "_tfs",
    "_fc",
    "_pal",
    "_plh",
    "_pas",
    "_ttrf",
    "_tcs",
    "_tws",
  ];
  const props = (n: any, names = PROPS) => {
    const result: Record<string, any> = {};
    for (const name of names) result[name] = attempt(() => n.getProperty(name));
    return result;
  };
  const make = (attach = true) => {
    const t = new api.Text();
    if (attach) t._setWorkspace(workspace);
    return t;
  };
  const setAll = (n: any, values: Record<string, any>) => {
    const names = Object.keys(values);
    n.setProperties(
      names,
      names.map((k) => values[k]),
    );
  };
  const state = (t: any) => {
    const result: Record<string, any> = {
      plain: enc(t.getPlainText()),
      boxes: boxes(t),
      // The vertices as they are, then laid out again (setText alone
      // doesn't mark them dirty).
      outline: outline(t),
    };
    t._verticesDirty = true;
    result.fresh = outline(t);
    result.props = props(t);
    result.blob = blob(t);
    return result;
  };

  // -- Layout cases (like the engine-model/text/layout-cases scenario).
  const SAMPLE = "The quick brown fox jumps over the lazy dog";
  const cases: [string, any, Record<string, any> | null][] = [
    ["default", "Hello world", null],
    ["twoLines", "Hello world\nSecond line", null],
    ["size40", "Hello", { _tfi: 40 }],
    ["bold", "Hello", { _tfw: 700 }],
    ["boldItalic", "Hello", { _tfw: 700, _tfs: "I" }],
    ["light", "Hello", { _tfw: 300 }],
    ["letterSpacing", "Hello", { _tcs: 5 }],
    ["wordSpacing", "a b c d", { _tws: 10 }],
    ["lineHeight", "one\ntwo\nthree", { _plh: 2 }],
    ["paragraphSpacing", "one\ntwo\nthree", { _pas: "15" }],
    ["paragraphIndent", "one\ntwo", { _pai: 20 }],
    ["wrapLeft", SAMPLE, { aw: false, w: 150 }],
    ["wrapCenter", SAMPLE, { aw: false, w: 150, _pal: "c" }],
    ["wrapJustify", SAMPLE, { aw: false, w: 150, _pal: "j" }],
    ["fixedTop", "Top", { aw: false, ah: false, w: 100, h: 80, va: "t" }],
    ["fixedMiddle", "Middle", { aw: false, ah: false, w: 100, h: 80, va: "m" }],
    ["fixedBottom", "Bottom", { aw: false, ah: false, w: 100, h: 80, va: "b" }],
    ["underline", "Underlined", { _tdu: true, _tds: true }],
    ["uppercase", "Hello World", { _ttrf: "u" }],
    ["smallCaps", "Hello World", { _ttrf: "s" }],
    ["superscript", "x2", { _ttsc: "super" }],
    ["color", "Red", { _fc: new api.RGBColor([255, 0, 0]) }],
    ["hebrew", "שלום עולם", { _tff: "Noto Sans Hebrew" }],
    ["arabicRtl", "مرحبا بالعالم", { _tff: "Noto Sans Arabic", dir: 1 }],
    [
      "richRuns",
      [
        { text: "Small ", fontFamily: "Open Sans", fontSize: 12 },
        { text: "Big ", fontFamily: "Open Sans", fontSize: 36, fontWeight: 700 },
        { text: "italic ", fontFamily: "Open Sans", fontStyle: "italic" },
        { text: "\nnext line", fontFamily: "Open Sans", lineSpacing: 1.5, charSpacing: 3 },
      ],
      null,
    ],
    [
      "list",
      [{ text: "first\nsecond", fontFamily: "Open Sans", listMarker: "Number", listDepth: 1 }],
      null,
    ],
    ["crlf", "a\r\nb", null],
  ];
  const layout: Record<string, any> = {};
  for (const [name, text, values] of cases) {
    const t = make();
    t.setText(text);
    if (values) setAll(t, values);
    layout[name] = state(t);
  }
  out.layout = layout;

  // -- Before a workspace: the text and properties wait.
  {
    const t = make(false);
    const before = {
      props: props(t, ["w", "h", "aw", "ah", "afs", "va", "dir", "_tfi", "_tff"]),
      content: enc(t.getContent()),
      plain: enc(t.getPlainText()),
      core: t.getTLCore() === null,
    };
    t.setText([{ text: "Waiting", fontSize: 30 }]);
    t.setProperties(["_tfw", "va"], [700, "m"]);
    const waiting = {
      content: enc(t.getContent()),
      plain: enc(t.getPlainText()),
      tfi: attempt(() => t.getProperty("_tfi")),
      tfw: attempt(() => t.getProperty("_tfw")),
      va: attempt(() => t.getProperty("va")),
      pending: enc(t._pendingProperties),
    };
    t._setWorkspace(workspace);
    out.waiting = { before, waiting, after: state(t) };
  }

  // -- Automatic size, auto fit, the length limit.
  {
    const t = make();
    t.setText("Fit me into the box please");
    setAll(t, { aw: false, ah: false, w: 100, h: 40, afs: true });
    const fit: Record<string, any> = { before: state(t) };
    t.adaptFontSizeToFitBBox();
    fit.after = state(t);
    const u = make();
    u.setText("Auto width text");
    fit.auto = state(u);
    u.setProperty("aw", false);
    u.setProperty("w", 50);
    fit.fixed = state(u);
    u.setProperty("aw", true);
    fit.autoAgain = state(u);
    u.setProperty("ah", false);
    fit.fixedHeight = props(u, ["w", "h", "aw", "ah"]);
    const long = make();
    long.setText("x".repeat(9000));
    fit.truncated = long.getPlainText().length;
    const runs = make();
    runs.setText([{ text: "y".repeat(8000) }, { text: "z".repeat(500) }, { text: "w" }]);
    fit.truncatedRuns = enc(runs.getContent().map((r: any) => r.text.length));
    out.sizes = fit;
  }

  // -- Text on a path.
  const anchors = (path: any, points: number[][]) => {
    for (const [x, y] of points) {
      const ap = new api.PathBase.AnchorPoint();
      ap.setProperties(["x", "y"], [x, y]);
      path.getAnchorPoints().appendChild(ap);
    }
    return path;
  };
  {
    const variants: Record<string, Record<string, any>> = {
      default: {},
      offset: { tptho: 10 },
      inside: { tpths: -1 },
      inwards: { tpthd: 1 },
      distance: { tpthl: 40 },
    };
    const onPath: Record<string, any> = {};
    for (const [name, values] of Object.entries(variants)) {
      const path = anchors(new api.Path(true), [
        [0, 0],
        [200, 0],
        [200, 200],
        [0, 200],
      ]);
      const t = make();
      t.setText("Around the square we go");
      t.attachPath(path);
      setAll(t, values);
      onPath[name] = { attached: t.hasPathAttached(), ...state(t) };
    }
    const open = anchors(new api.Path(), [
      [0, 100],
      [100, 0],
      [200, 100],
    ]);
    const t = make();
    t.setText("On an open path");
    t.attachPath(open);
    onPath.open = state(t);
    t.attachPath(null);
    onPath.detached = { attached: t.hasPathAttached(), ...state(t) };
    out.onPath = onPath;
  }

  // -- Convert to shapes.
  {
    const shapes = (t: any) =>
      t.getTextShapes().map((s: any) => ({
        name: api.Node.getName(s),
        outline: outline(s),
        box: enc(s.getGeometryBBox()),
        fills: s
          .getPaintLayers()
          .getLayers()
          .map((l: any) => [
            api.Node.getName(l),
            enc(l.getProperty("_pt")),
            enc(l.getProperty("_op")),
          ]),
      }));
    const t = make();
    t.setText("Ab\nCd");
    setAll(t, { _tfi: 30, trf: T(1, 0, 0, 1, 10, 20) });
    const colored = make();
    colored.setText([
      { text: "Red ", fontFamily: "Open Sans", fontColor: new api.RGBColor([255, 0, 0]) },
      { text: "blue", fontFamily: "Open Sans", fontColor: new api.RGBColor([0, 0, 255]) },
    ]);
    const filled = make();
    filled.setText("Filled");
    const layer = new api.Stylable.FillPaintLayer();
    layer.setProperty("_pt", new api.RGBColor([0, 128, 0]));
    filled.getPaintLayers().appendChild(layer);
    const middle = make();
    middle.setText("Mid");
    setAll(middle, { aw: false, ah: false, w: 100, h: 80, va: "m" });
    out.shapes = {
      plain: shapes(t),
      colored: shapes(colored),
      filled: shapes(filled),
      filledHasStyleFill: enc(filled.hasStyleFill()),
      plainHasStyleFill: enc(t.hasStyleFill()),
      middle: shapes(middle),
      isFakeText: enc(t.isFakeText()),
      hasEmbeddedFonts: enc(t.hasEmbeddedFonts()),
      hasFontsToResolve: enc(t.hasFontsToResolve()),
    };
  }

  // -- Serialize and restore.
  {
    const t = make();
    t.setText([
      { text: "Red ", fontFamily: "Open Sans", fontColor: new api.RGBColor([255, 0, 0]) },
      { text: "bold", fontFamily: "Open Sans", fontWeight: 700 },
    ]);
    setAll(t, { trf: T(1, 0, 0, 1, 5, 6) });
    const json = api.Node.serialize(t);
    const back = api.Node.deserialize(json);
    const beforeWorkspace = { plain: enc(back.getPlainText()), content: enc(back.getContent()) };
    back._setWorkspace(workspace);
    const parsed = JSON.parse(json);
    const copy = make();
    copy.assignFrom(t);
    out.serialize = {
      blob: scrub(parsed),
      ctIsArray: Array.isArray(parsed.ct),
      contentType: typeof parsed.content,
      hasRef: "#" in parsed,
      beforeWorkspace,
      restored: state(back),
      copy: state(copy),
      clone: state(
        (() => {
          const c = t.clone();
          c._setWorkspace(workspace);
          return c;
        })(),
      ),
    };
  }

  // -- Legacy blobs.
  {
    const legacy = {
      "@": "text",
      tlx: 10,
      tly: 20,
      trx: 110,
      try: 20,
      blx: 10,
      bry: 60,
      aw: false,
      _tff: "Open Sans",
      _tfi: 24,
      ct: {
        "@": "txContent",
        $: [
          {
            "@": "txPara",
            $: [
              { "@": "txChr", cnt: "Hello " },
              { "@": "txChr", _tfw: 700, cnt: "bold" },
            ],
          },
          { "@": "txBrk" },
          { "@": "txPara", _tfs: "I", cnt: "World" },
        ],
      },
    };
    const restore = (b: any) => {
      const n = api.Node.deserialize(JSON.stringify(b));
      if (n) n._setWorkspace(workspace);
      return n ? state(n) : null;
    };
    out.legacy = {
      tree: restore(legacy),
      withTtrf: restore({ ...legacy, ttrf: [2, 0, 0, 2, 0, 0] }),
      blackFpt: restore({
        "@": "text",
        _fpt: "C#[0,0,0]",
        ct: [{ text: "x" }],
        content: '[{"text":"x"}]',
      }),
      redFpt: restore({
        "@": "text",
        _fpt: "C#[255,0,0]",
        ct: [{ text: "x" }],
        content: '[{"text":"x"}]',
      }),
      fontAttrs: restore({
        "@": "text",
        _tff: "Open Sans",
        _tfw: 700,
        _tfs: "N",
        ct: [
          { text: "a", fontFamily: "Open Sans", fontWeight: 700 },
          { text: "b", fontFamily: "Open Sans", fontWeight: 400 },
        ],
        content:
          '[{"text":"a","fontFamily":"Open Sans","fontWeight":700},{"text":"b","fontFamily":"Open Sans","fontWeight":400}]',
      }),
      corrected: restore({
        "@": "text",
        ct: [{ text: "c", fontFamily: "Noto Sans CS" }],
        content: '[{"text":"c","fontFamily":"Noto Sans CS"}]',
      }),
      stringCt: restore({ "@": "text", ct: "plain string" }),
    };
  }

  // -- Transforms.
  {
    const transforms: Record<string, any> = {};
    const fixed = () => {
      const t = make();
      t.setText("Box text that wraps");
      setAll(t, { aw: false, w: 120, trf: T(1, 0, 0, 1, 10, 10) });
      return t;
    };
    let t = fixed();
    t.transform(T(2, 0, 0, 1, 0, 0));
    transforms.scaleX = state(t);
    t = fixed();
    t.transform(T(1, 0, 0, 3, 5, 5));
    transforms.scaleY = state(t);
    t = fixed();
    t.setProperty("sc", true);
    t.transform(T(2, 0, 0, 2, 0, 0));
    transforms.scaleContent = state(t);
    t = fixed();
    const c = Math.cos(0.5);
    const s = Math.sin(0.5);
    t.transform(T(c, s, -s, c, 0, 0));
    transforms.rotate = state(t);
    t = fixed();
    t.transform(T(-1, 0, 0, 1, 50, 0));
    transforms.flip = state(t);
    t = fixed();
    t.transform(T(1, 0, 0.5, 1, 0, 0));
    transforms.skew = state(t);
    t = fixed();
    t.setBounds(0, 0, 300, 100);
    transforms.setBounds = state(t);
    t = fixed();
    transforms.sourceBBox = enc(
      t.transformSourceBBox(T(1.5, 0, 0, 2, 3, 4), false, false, true, true),
    );
    transforms.afterSourceBBox = state(t);
    const auto = make();
    auto.setText("auto");
    auto.transform(T(2, 0, 0, 2, 0, 0));
    transforms.auto = state(auto);
    out.transforms = transforms;
  }

  // -- Value conversion tables.
  {
    const t = make();
    t.setText("v");
    const gravit: [string, any][] = [
      ["fontStyle", "italic"],
      ["fontStyle", "normal"],
      ["fontStyle", undefined],
      ["fontStyle", "I"],
      ["fontStyle", "oblique"],
      ["fontFamily", null],
      ["fontFamily", "Lato"],
      ["fontColor", "transparent"],
      ["fontColor", "rgba(1,2,3,0)"],
      ["fontColor", "rgba(1,2,3,0.5)"],
      ["fontColor", "#ff0000"],
      ["fontColor", null],
      ["fontWeight", "bold"],
      ["fontWeight", "normal"],
      ["fontWeight", "lighter"],
      ["fontWeight", "bolder"],
      ["fontWeight", "heavy"],
      ["fontWeight", "600"],
      ["fontWeight", 0],
      ["fontWeight", undefined],
      ["align", "left"],
      ["align", "center"],
      ["align", "right"],
      ["align", "justify"],
      ["align", "x"],
      ["transformation", "lowercase"],
      ["transformation", "uppercase"],
      ["transformation", "capitalize"],
      ["transformation", "smallcaps"],
      ["paragraphSpacing", 0],
      ["paragraphSpacing", NaN],
      ["paragraphSpacing", undefined],
      ["fontSize", 0],
      ["fontSize", undefined],
      ["lineSpacing", null],
      ["underline", false],
    ];
    const gtl: [string, any][] = [
      ["_tfw", "700"],
      ["_tfw", "bold"],
      ["_tfi", "12.5"],
      ["_tfi", 13],
      ["_tfi", "abc"],
      ["_tcs", null],
      ["_tff", "X"],
      ["_tfs", "I"],
      ["_tfs", "N"],
      ["_tfs", "q"],
      ["_fc", new api.RGBColor([1, 2, 3])],
      ["_fc", null],
      ["_fc", "C#[4,5,6]"],
      ["_fc", "nonsense"],
      ["_pal", "l"],
      ["_pal", "c"],
      ["_pal", "r"],
      ["_pal", "j"],
      ["_pal", "z"],
      ["_ttrf", "l"],
      ["_ttrf", "u"],
      ["_ttrf", "c"],
      ["_ttrf", "s"],
      ["_tdu", true],
      ["xyz", 1],
    ];
    out.values = {
      gravit: gravit.map(([k, v]) => attempt(() => t._getGravitValue(k, v))),
      gtl: gtl.map(([k, v]) => attempt(() => t._getGTLValue(k, v))),
      fixText: [
        enc(t._fixText({ text: "a" })),
        enc(t._fixText("a")),
        enc(t._fixText([{ text: "a" }])),
        enc(t._fixText({ x: 1 })),
      ],
      deserialize: [
        enc(JSON.parse('{"fontColor":"transparent"}', api.Text._deserializeContent)),
        enc(JSON.parse('{"fontColor":"C#[1,2,3]"}', api.Text._deserializeContent)),
        enc(JSON.parse('{"fontColor":"bad"}', api.Text._deserializeContent)),
        enc(JSON.parse('{"fontColor":{"_value":[1,2,3]}}', api.Text._deserializeContent)),
        enc(JSON.parse('{"fontColor":{"_value":[0.1,0.2,0.3,0.4]}}', api.Text._deserializeContent)),
      ],
      serialize: JSON.stringify(
        { fontColor: new api.RGBColor([9, 8, 7]), other: 1 },
        api.Text._serializeContent,
      ),
    };
    const blobs = [
      { ct: [{ fontFamily: "A" }, { fontFamily: "A" }], _tff: "A", _tfw: 700, _tfs: "N" },
      { ct: [{ fontFamily: "A", fontWeight: 700 }], _tff: "B", _tfw: 700 },
      { ct: [{ fontFamily: "A" }], _tff: "" },
      { _tff: "A" },
      { ct: [{ fontStyle: "italic" }], _tfs: "I" },
    ];
    out.fontAttributes = blobs.map((b) => {
      const copy = JSON.parse(JSON.stringify(b));
      t._fixFontAttributes(copy);
      return enc(copy);
    });
    const runs = [
      { text: "a", fontFamily: "A", fontStyle: "italic", fontWeight: 400, x: { fontFamily: "A" } },
    ];
    t._replaceFF(runs, { fontFamily: "A" }, { fontFamily: "B", fontStyle: "N", fontWeight: 700 });
    out.replaceFF = enc(runs);
  }

  // -- Selection properties and editing.
  {
    const t = make();
    t.setText([
      { text: "Hello ", fontFamily: "Open Sans", fontSize: 20 },
      { text: "World", fontFamily: "Open Sans", fontSize: 30, fontWeight: 700 },
    ]);
    const core = t.getTLCore();
    core.select(0, 3);
    const first = props(t, ["_tfi", "_tfw", "_pal"]);
    const selected: Record<string, any> = {};
    for (const name of ["_tfi", "_tfw", "_tfs", "_pal", "_plh"]) {
      selected[name] = attempt(() => t.getProperty(name, false, null, false, true));
    }
    core.select(8, 10);
    const second: Record<string, any> = {};
    for (const name of ["_tfi", "_tfw"]) {
      second[name] = attempt(() => t.getProperty(name, false, null, false, true));
    }
    core.select(0, 2);
    t.setProperties(["_tfi"], [50], false, false, false, true);
    const ranged = state(t);
    t.setText("Hello there", true);
    out.selection = {
      whole: first,
      selected,
      second,
      ranged,
      replaced: state(t),
      selectionAfterReplace: enc([core.selectedRange().start, core.selectedRange().end]),
    };
    t.setProperties(["_tff"], ["Open Sans"]);
    t.setProperties(["_tfw", "_tfs"], [700, "I"]);
    out.fontChange = state(t);
    t.setProperty("content", JSON.stringify([{ text: "From content", fontSize: 25 }]));
    out.contentProperty = state(t);
  }

  // -- Hit testing.
  {
    const t = make();
    t.setText("Hit me");
    setAll(t, { trf: T(1, 0, 0, 1, 100, 100) });
    const hit = (x: number, y: number) => {
      const r = t._detailHitTest(new api.Point(x, y), T(1, 0, 0, 1, 0, 0), 2);
      return r ? [r.element === t, enc(r.data)] : null;
    };
    out.hits = [hit(105, 110), hit(90, 110), hit(100, 100), hit(200, 200)];
  }

  // -- Missing fonts (an own font manager that can't resolve anything).
  {
    const own = new api.FontManager();
    own.setDefaultFont(fm.getDefaultFont());
    own.addEventListener(api.FontManager.ResolveFontEvent, (e: any) => e.failed());
    const ownWorkspace = { ...workspace, getFontManager: () => own };
    const t = new api.Text();
    t._setWorkspace(ownWorkspace);
    t.setText([{ text: "missing", fontFamily: "No Such Font" }]);
    out.missing = {
      plain: enc(t.getPlainText()),
      content: enc(t.getContent()),
      toResolve: enc(
        (t.hasFontsToResolve() || []).map((f: any) => [f.getFamily(), f.getStyle(), f.getWeight()]),
      ),
      fake: enc(t.isFakeText()),
      whenAvailable: enc(t._setTextWhenAvailable),
    };
  }
  out.statics = {
    MAXLENGTH: api.Text.MAXLENGTH,
    HMARGIN: api.Text.HMARGIN,
    VMARGIN: api.Text.VMARGIN,
    dontStorePaths: api.Text.dontStorePaths,
    HITTEST_TEXT: api.Text.HITTEST_TEXT,
    HITTEST_BOX: api.Text.HITTEST_BOX,
    VerticalAlign: enc(api.Text.VerticalAlign),
    Markers: enc(api.Text.Markers),
    GeometryProperties: enc(api.Text.GeometryProperties),
    MetaProperties: enc(api.Text.MetaProperties),
    VisualProperties: enc(api.Text.VisualProperties),
    PropertyMapping: enc(api.Text.PropertyMapping),
    DEFAULTFONT: [
      api.Text.DEFAULTFONT.getFamily(),
      api.Text.DEFAULTFONT.getStyle(),
      api.Text.DEFAULTFONT.getWeight(),
      api.Text.DEFAULTFONT.isResolved(),
    ],
    nodeName: api.Node.getName(new api.Text()),
    toString: String(new api.Text()),
    sets: enc(new api.Text().getStylePropertySets()),
  };
  return out;
}
