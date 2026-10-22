import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";
import { NODE_PROPERTIES } from "./node-properties.ts";

// Engine document model: node classes, defaults, non-default values and
// their serialized form, clone, transform, bounding boxes, insertion rules,
// selectors, flags and the container API. Everything goes through the G
// namespace, so the same code runs against the new engine.

/** G class name -> node name, for every class with a public constructor. */
const CONSTRUCTIBLE = [
  "GScene",
  "GPage",
  "GLayer",
  "GGroup",
  "GSymbol",
  "GRectangle",
  "GEllipse",
  "GPolygon",
  "GPath",
  "GCompoundPath",
  "GCompoundShape",
  "GSimpleShape",
  "GPathsGraph",
  "GConnector",
  "GText",
  "GImage",
  "GImageGrid",
  "GSlice",
  "GCollabText",
  "GStyle",
  "GSwatch",
  "GSwatches",
  "GPGEdge",
  "GPGFacet",
  "GComment",
  "GAnnotationsList",
  "GEmptyAnnotation",
  "GTextAnnotation",
  "GHighlighterAnnotation",
  "GPencilAnnotation",
  "GCommentAnnotation",
  "GArrowAnnotation",
  "GRectangleAnnotation",
  "GEllipseAnnotation",
  "GCollaborativeTextAnnotation",
];

/** Node names restored from a minimal `{"@": name}` blob. */
const RESTORABLE = Object.keys(NODE_PROPERTIES);

const T = (a: number, b: number, c: number, d: number, e: number, f: number) => ({
  trf: [a, b, c, d, e, f],
});

/** Values that differ from every default, per node name. */
const NON_DEFAULT: Record<string, Record<string, unknown>> = {
  rectangle: {
    trf: T(50, 0, 0, 25, 100, 80),
    uf: false,
    tl_uf: false,
    tl_ct: "B",
    tl_sx: 5,
    tl_sy: 7,
    tr_ct: "U",
    tr_sx: 4,
    tr_sy: 4,
    br_ct: "I",
    br_sx: 3,
    br_sy: 3,
    bl_ct: "F",
    bl_sx: 6,
    bl_sy: 6,
    csc: false,
    name: "Rect <b>bold</b>",
    vis: false,
    lkt: "P",
    plkt: 12,
    clk: true,
    bool: 3,
    scc: false,
    _sbl: "multiply",
    _sfop: 0.5,
    _stop: 0.25,
    hacr: 4,
    vacr: 2,
  },
  ellipse: {
    trf: T(40, 0, 0, 20, 50, 50),
    sa: 0.5,
    ea: 2,
    etp: 1,
    csc: false,
    evenodd: true,
  },
  polygon: {
    trf: T(1, 0, 0, 1, 10, 20),
    pts: 5,
    cx: 30,
    cy: 40,
    or: 50,
    ir: 20,
    oa: 0.3,
    ia: 1.2,
    oct: "B",
    ict: "I",
    ocr: 4,
    icr: 2,
  },
  path: { trf: T(2, 0, 0, 2, 5, 5), closed: true, evenodd: true },
  compoundpath: { trf: T(1, 0, 0, 1, 3, 4), evenodd: false, csc: false },
  "Compound Shape": { evenodd: true, scc: false, trf: T(1, 0, 0, 1, 7, 7) },
  group: { trf: T(1, 0, 0, 1, 10, 0), frm: { rect: [0, 0, 100, 50] }, clk: true },
  layer: {
    otl: true,
    prt: false,
    cls: "pattern:C#[255,0,0]",
    frm: true,
    name: "Layer X",
    lkt: "F",
  },
  page: {
    w: 1024,
    h: 768,
    x: 10,
    y: 20,
    bl: 5,
    ml: 1,
    mt: 2,
    mr: 3,
    mb: 4,
    gp: 20,
    off: T(1, 0, 0, 1, 100, 0),
    bck: "pattern:C#[10,20,30]",
    bop: 0.5,
    name: "Cover",
  },
  slice: { x: 10, y: 20, w: 30, h: 40, trm: false, cls: "pattern:C#[0,255,0]", name: "Icon" },
  image: {
    trf: T(50, 0, 0, 50, 50, 50),
    iw: 10,
    ih: 20,
    px: 1,
    py: 2,
    pw: 3,
    ph: 4,
    itrf: T(2, 0, 0, 2, 0, 0),
    dblMode: true,
    ipfc: false,
    url: "assets/img/none.png",
    storedUrl: "stored",
    tmpUrl: "tmp",
  },
  imagegrid: {
    mg: 0.2,
    grid: {
      json: [
        [
          [0.5, 1],
          [0.5, 1],
        ],
      ],
    },
    trf: T(50, 0, 0, 50, 50, 50),
  },
  symbol: { trf: T(1, 0, 0, 1, 5, 5), frame: { rect: [0, 0, 10, 10] }, blockEv: true },
  text: {
    trf: T(1, 0, 0, 1, 10, 10),
    aw: false,
    ah: false,
    afs: true,
    va: "m",
    w: 200,
    h: 50,
    head: 2,
    dir: 1,
    _tfi: 32,
    _tfw: 700,
    _tfs: "I",
    _tcs: 2,
    _tws: 3,
    _pal: "c",
    _plh: 1.5,
    _pas: "10",
    _pai: 4,
    _tdu: true,
    _tds: true,
    _ttrf: "u",
    _ttsc: "super",
    _tlig: "none",
    _tfrac: true,
    sc: true,
  },
  connector: { closed: false, trf: T(1, 0, 0, 1, 1, 1) },
  "Paths Graph": { trf: T(1, 0, 0, 1, 2, 2), bool: 2 },
  cmt: {
    text: "hi",
    uid: "u1",
    time: 1000,
    mtime: 2000,
    seq: 3,
    name: "Ann",
    img: "a.png",
    email: "a@example.com",
    type: 1,
    rmd: true,
    sid: "s",
    // "read" lists the uids that read the comment; setting "uid" adds itself.
    read: ["u0"],
    asgn: "x",
    Guid: "g",
    atp: 2,
  },
  // Annotations stamp "mtime" with the current time unless it is set too.
  anr: { text: "note", uid: "u2", time: 5, mtime: 6, seq: 1, loc: "here", typ: 2, rsv: true },
  annlst: { pgid: "pg", Guid: "gg", aid: "aa", rmd: true, sid: "ss" },
  style: { name: "Heading", ps: ["S", "FL"], defaultStyle: false, _sfop: 0.3 },
  swatch: { _pt: "pattern:C#[1,2,3]", _op: 0.4, name: "Mine" },
};

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/nodes/class-registry",
    // Only the items whose content is the registry, mixins or an enum; the
    // behaviour behind the other enums is covered where it is exercised.
    covers: [
      "ENG-NODE-001",
      "ENG-NODE-002",
      "ENG-NODE-003",
      "ENG-NODE-013",
      "ENG-NODE-024",
      "ENG-NODE-050",
      "ENG-BORDER-002",
      "ENG-BORDER-003",
      "ENG-BLEND-003",
    ],
    kind: "json",
    args: CONSTRUCTIBLE,
    inPage: withHelpers((_p, classes: string[], H) => {
      const G = H.G;
      const names: Record<string, unknown> = {};
      for (const c of classes) names[c] = H.attempt(() => G.GNode.getName(new G[c]()));
      const S = G.GStylable;
      for (const k of [
        "PaintLayer",
        "FillPaintLayer",
        "BorderPaintLayer",
        "PaintLayers",
        "Effects",
      ])
        names["GStylable." + k] = G.GNode.getName(new S[k]());
      names["GPathBase.AnchorPoint"] = G.GNode.getName(new G.GPathBase.AnchorPoint());
      const r = new G.GRectangle();
      const mixins: Record<string, boolean> = {};
      for (const m of [
        "Properties",
        "Identity",
        "Tag",
        "Reference",
        "Multireference",
        "Container",
        "Store",
      ])
        mixins["rectangle " + m] = r.hasMixin(G.GNode[m]);
      mixins["text Reference"] = new G.GText().hasMixin(G.GNode.Reference);
      mixins["page Container"] = new G.GPage().hasMixin(G.GNode.Container);
      mixins["rectangle Stylable"] = r.hasMixin(G.GElement.Stylable);
      mixins["rectangle Transform"] = r.hasMixin(G.GElement.Transform);
      mixins["group Layout"] = new G.GGroup().hasMixin(G.GElement.Layout);
      mixins["layer Accelerated"] = new G.GLayer().hasMixin(G.GElement.Accelerated);
      mixins["page LabelHolder"] = new G.GPage().hasMixin(G.GBlock.LabelHolder);
      mixins["rectangle instanceof GShape"] = r instanceof G.GShape;
      mixins["image instanceof GRectangle"] = new G.GImage() instanceof G.GRectangle;
      mixins["collabtext instanceof GImage"] = new G.GCollabText() instanceof G.GImage;
      mixins["ant instanceof GText"] = new G.GTextAnnotation() instanceof G.GText;
      mixins["connector instanceof GPath"] = new G.GConnector() instanceof G.GPath;
      mixins["anr hasMixin GAnnotation"] = new G.GRectangleAnnotation().hasMixin(G.GAnnotation);
      const PC = G.GPaintCanvas;
      return H.v({
        names,
        mixins,
        mime: [G.GNode.MIME_TYPE, G.GPattern.MIME_TYPE],
        nodeFlag: G.GNode.Flag,
        elementFlag: G.GElement.Flag,
        collisionFlag: G.GElement.CollisionFlag,
        lockType: G.GBlock.LockType,
        programLock: G.GBlock.ProgramLck,
        cornerType: G.GPathBase.CornerType,
        ellipseType: G.GEllipse.Type,
        commentType: G.GComment.Type,
        verticalAlign: G.GText.VerticalAlign,
        borderAlignment: S.BorderAlignment,
        borderMarker: S.BorderMarker,
        paragraphAlignment: S.ParagraphAlignment,
        typographyScript: S.TypographyScript,
        textTransformation: S.TextTransformation,
        propertySet: S.PropertySet,
        styleLayer: S.StyleLayer,
        effectType: S.Effect.Type,
        blendMode: PC.BlendMode,
        webGLBlendMode: PC.WebGLBlendMode,
        compositeOperator: PC.CompositeOperator,
        lineCap: PC.LineCap,
        lineJoin: PC.LineJoin,
        fillRule: PC.FillRule,
        imageStatus: G.GImage.ImageStatus,
        convertStatus: G.GImage.ConvertStatus,
        imageType: G.GImage.Type,
        gridMode: G.GScene.GridMode,
        minGridSize: G.GScene.MIN_GRID_SIZE,
        textMaxLength: G.GText.MAXLENGTH,
        markerSize: G.GPathBase.MARKER_SIZE,
        textureModes: {
          position: G.GTexturePattern.PositionMode,
          repeat: G.GTexturePattern.RepeatMode,
          size: G.GTexturePattern.SizeMode,
          scale: G.GTexturePattern.ScaleMode,
        },
        noiseType: G.GNoisePattern.Type,
        fontStyle: G.GFont.Style,
        fontWeight: G.GFont.Weight,
        fontFeatures: G.GFont.Features,
      });
    }),
  },
  {
    id: "engine-model/nodes/defaults-constructed",
    covers: [
      "ENG-NODE-005",
      "ENG-NODE-017",
      "ENG-NODE-019",
      "ENG-NODE-020",
      "ENG-NODE-021",
      "ENG-NODE-025",
      "ENG-NODE-026",
      "ENG-NODE-027",
      "ENG-NODE-028",
      "ENG-NODE-029",
      "ENG-NODE-030",
      "ENG-NODE-033",
      "ENG-NODE-034",
      "ENG-NODE-036",
      "ENG-NODE-037",
      "ENG-NODE-038",
      "ENG-NODE-039",
      "ENG-NODE-040",
      "ENG-NODE-042",
      "ENG-NODE-045",
      "ENG-NODE-046",
      "ENG-NODE-047",
      "ENG-NODE-049",
      "ENG-NODE-050",
      "ENG-NODE-051",
      "ENG-NODE-052",
      "ENG-NODE-053",
      "ENG-NODE-054",
      "ENG-NODE-055",
      "ENG-NODE-056",
      "ENG-NODE-057",
      "ENG-NODE-058",
      "ENG-NODE-059",
      "ENG-NODE-060",
      "ENG-NODE-061",
      "ENG-STYLE-002",
      "ENG-STYLE-007",
      "ENG-STYLE-009",
      "ENG-TEXT-001",
      "ENG-TEXT-002",
      "ENG-TEXT-003",
      "ENG-TEXT-004",
      "ENG-TEXT-012",
      "ENG-SCENE-001",
      "ENG-SCENE-002",
      "ENG-SCENE-004",
      "ENG-SCENE-006",
      "ENG-SCENE-009",
    ],
    kind: "json",
    args: { classes: CONSTRUCTIBLE, props: NODE_PROPERTIES },
    inPage: withHelpers((_p, a: { classes: string[]; props: Record<string, string[]> }, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      for (const c of a.classes) {
        const n = new G[c]();
        const name = G.GNode.getName(n);
        out[c] = {
          name,
          props: H.attempt(() => H.props(n, a.props[name] ?? [])),
          blob: H.attempt(() => H.blob(n)),
        };
      }
      const ap = new G.GPathBase.AnchorPoint();
      out["GPathBase.AnchorPoint"] = H.props(ap, [
        "tp",
        "x",
        "y",
        "hlx",
        "hly",
        "hrx",
        "hry",
        "ah",
        "cu",
        "cl",
        "cr",
      ]);
      return H.clean(out);
    }),
  },
  {
    id: "engine-model/nodes/defaults-restored",
    covers: ["ENG-SER-002", "ENG-SER-004", "ENG-SER-017", "ENG-NODE-044", "ENG-EFFECT-044"],
    kind: "json",
    args: { names: RESTORABLE, props: NODE_PROPERTIES },
    inPage: withHelpers((_p, a: { names: string[]; props: Record<string, string[]> }, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      for (const name of a.names) {
        const n = G.GNode.deserialize(JSON.stringify({ "@": name }));
        // GPG* nodes and effects have no identity; the others get a new random id.
        out[name] = {
          restoredAs: G.GNode.getName(n),
          props: H.attempt(() => H.props(n, a.props[name] ?? [])),
          blob: H.attempt(() => H.blob(n)),
        };
      }
      return H.clean(out);
    }),
  },
  {
    id: "engine-model/nodes/non-default-values",
    covers: [
      "ENG-NODE-005",
      "ENG-NODE-017",
      "ENG-NODE-019",
      "ENG-NODE-020",
      "ENG-NODE-026",
      "ENG-NODE-027",
      "ENG-NODE-028",
      "ENG-NODE-029",
      "ENG-NODE-030",
      "ENG-NODE-034",
      "ENG-NODE-036",
      "ENG-NODE-037",
      "ENG-NODE-038",
      "ENG-NODE-039",
      "ENG-NODE-040",
      "ENG-NODE-042",
      "ENG-NODE-049",
      "ENG-NODE-050",
      "ENG-NODE-051",
      "ENG-SER-001",
      "ENG-SER-003",
      "ENG-SER-004",
      "ENG-SER-005",
      "ENG-SER-007",
      "ENG-STYLE-007",
      "ENG-STYLE-009",
      "ENG-SCENE-009",
    ],
    kind: "document",
    args: NON_DEFAULT,
    inPage: withHelpers((_p, values: Record<string, Record<string, unknown>>, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      for (const name of Object.keys(values)) {
        const n = G.GNode.deserialize(JSON.stringify({ "@": name }));
        H.setAll(n, values[name] as Record<string, unknown>);
        const json = H.ser(n);
        const again = H.ser(G.GNode.deserialize(json));
        out[name] = {
          blob: JSON.parse(json),
          beautified: H.ser(n, { beautify: true }).split("\n").length,
          reserializedEqual: again === json,
          // Name goes through the XSS filter on set.
          name: H.v(n.getProperty("name")),
        };
      }
      return JSON.stringify(out);
    }),
  },
  {
    id: "engine-model/nodes/serialize-options",
    covers: ["ENG-SER-001", "ENG-SER-003", "ENG-NODE-006", "ENG-NODE-008"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      const r = H.rect(0, 0, 10, 10);
      r.setProperty("@custom", { a: 1 });
      r.setProperty("name", "R");
      g.appendChild(r);
      g.appendChild(H.ellipse(5, 5, 10, 10));
      const plain = H.blob(g);
      const copy = H.blob(g, { copy: true });
      const arrJson = G.GNode.serialize([r, g.getLastChild()]);
      const arr = JSON.parse(arrJson);
      const beautified = G.GNode.serialize(r, { beautify: true });
      const id = r.getId();
      const clone = r.clone();
      const restored = G.GNode.deserialize(H.ser(g));
      const restoredArr = G.GNode.deserialize(G.GNode.serialize([r, r]));
      return {
        plain,
        copy,
        array: H.clean(arr),
        beautified: H.clean(beautified),
        idLength: id.length,
        idChars: /^[A-Za-z0-9]+$/.test(id),
        plainKeys: Object.keys(plain),
        plainChildKeys: (plain.$ as Record<string, unknown>[]).map((c) => Object.keys(c)),
        copyHasIds: JSON.stringify(copy).includes('"@id"'),
        copyChildKeys: (copy.$ as Record<string, unknown>[]).map((c) => Object.keys(c)),
        custom: plain.$[0]["@custom"],
        arrayNames: arr.map((b: Record<string, unknown>) => b["@"]),
        beautifiedLines: beautified.split("\n").length,
        beautifiedIndent: beautified.split("\n")[1].match(/^ */)[0].length,
        cloneSameId: clone.getId() === id,
        cloneCustom: H.v(clone.getProperty("@custom")),
        cloneName: clone.getProperty("name"),
        restoredKids: H.kids(restored),
        restoredSameIds: restored.getFirstChild().getId() === id,
        restoredCustom: H.v(restored.getFirstChild().getProperty("@custom")),
        restoredArray: Array.isArray(restoredArr) ? restoredArr.length : "not an array",
      };
    }),
  },
  {
    id: "engine-model/nodes/clone",
    covers: ["ENG-NODE-008", "ENG-NODE-006", "ENG-STYLE-003"],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const r = H.rect(0, 0, 100, 50);
      H.fill(r, H.rgb(255, 0, 0));
      H.border(r, H.rgb(0, 0, 255), { _bw: 4 });
      r.getEffects().appendChild(new G.GDropShadowEffect());
      const g = new G.GGroup();
      g.appendChild(r);
      g.appendChild(H.ellipse(0, 0, 20, 20));
      const p = new G.GPath();
      for (const [x, y] of [
        [0, 0],
        [10, 0],
        [10, 10],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        p.getAnchorPoints().appendChild(ap);
      }
      for (const [k, n] of Object.entries({ rect: r, group: g, path: p, text: new G.GText() })) {
        const c = (n as { clone(): unknown }).clone() as typeof r;
        out[k] = {
          original: H.rawBlob(n),
          clone: H.rawBlob(c),
          sameId: c.getId && c.getId() === (n as typeof r).getId(),
          parent: c.getParent() ? "has parent" : null,
        };
      }
      return JSON.stringify(out);
    }),
  },
  {
    id: "engine-model/nodes/transform",
    covers: ["ENG-NODE-014", "ENG-NODE-015", "ENG-NODE-020", "ENG-NODE-036", "ENG-SER-007"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const m = H.T(1, 0.2, -0.3, 1.5, 10, 20);
      const out: Record<string, unknown> = {};
      const mk: Record<string, () => unknown> = {
        rectangle: () => H.rect(0, 0, 100, 50),
        ellipse: () => H.ellipse(0, 0, 100, 50),
        polygon: () => {
          const n = new G.GPolygon();
          n.setProperties(["pts", "or", "ir", "cx", "cy"], [5, 50, 25, 50, 50]);
          return n;
        },
        group: () => {
          const g = new G.GGroup();
          g.appendChild(H.rect(0, 0, 10, 10));
          g.appendChild(H.ellipse(20, 20, 10, 10));
          return g;
        },
        image: () => {
          const n = new G.GImage();
          n.setProperty("trf", H.T(50, 0, 0, 25, 50, 25));
          return n;
        },
        text: () => new G.GText(),
      };
      for (const [k, f] of Object.entries(mk)) {
        const n = f() as {
          transform(t: unknown): void;
          getTransform?: () => unknown;
          getProperty(n: string): unknown;
          getChildren(): { getProperty(n: string): unknown }[];
        };
        const before = H.boxes(n);
        n.transform(m);
        out[k] = {
          before,
          after: H.boxes(n),
          trf: H.v(n.getProperty("trf")),
          getTransform: n.getTransform ? H.v(n.getTransform()) : "<none>",
          children:
            k === "group" ? n.getChildren().map((c) => H.v(c.getProperty("trf"))) : undefined,
        };
      }
      // Identity serializes as [] and setBounds maps the geometry box.
      const r = H.rect(0, 0, 10, 10);
      r.setProperty("trf", new G.GTransform());
      out.identity = H.blob(r).trf ?? "<absent>";
      const r2 = H.rect(0, 0, 10, 10);
      r2.setBounds(new G.GRect(5, 6, 70, 80));
      out.setBounds = { trf: H.v(r2.getProperty("trf")), boxes: H.boxes(r2) };
      // Group with a frame relayouts its children (constraints).
      const fg = new G.GGroup();
      const child = H.rect(0, 0, 50, 50);
      fg.appendChild(child);
      fg.setProperty("frm", new G.GRect(0, 0, 100, 100));
      fg.transform(H.T(2, 0, 0, 1, 0, 0));
      out.framed = {
        frm: H.v(fg.getProperty("frm")),
        childTrf: H.v(child.getProperty("trf")),
        hacr: child.getProperty("hacr"),
        vacr: child.getProperty("vacr"),
      };
      return out;
    }),
  },
  {
    id: "engine-model/nodes/bboxes-with-styles",
    covers: [
      "ENG-NODE-012",
      "ENG-STYLE-011",
      "ENG-BORDER-001",
      "ENG-BORDER-002",
      "ENG-BORDER-003",
      "ENG-BORDER-004",
      "ENG-BORDER-005",
      "ENG-EFFECT-001",
      "ENG-EFFECT-003",
      "ENG-EFFECT-004",
      "ENG-EFFECT-005",
      "ENG-EFFECT-007",
      "ENG-EFFECT-009",
      "ENG-EFFECT-010",
      "ENG-EFFECT-011",
    ],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      const shapes: Record<string, () => unknown> = {
        rect: () => H.rect(0, 0, 100, 50),
        rotated: () => {
          const n = H.rect(0, 0, 100, 50);
          n.transform(new G.GTransform().rotated(0.5));
          return n;
        },
        openPath: () => {
          const p = new G.GPath();
          for (const [x, y] of [
            [0, 0],
            [100, 20],
            [0, 40],
          ]) {
            const ap = new G.GPathBase.AnchorPoint();
            ap.setProperties(["x", "y"], [x, y]);
            p.getAnchorPoints().appendChild(ap);
          }
          return p;
        },
      };
      const borders: Record<string, Record<string, unknown>> = {
        none: {},
        center10: { _bw: 10 },
        outside10: { _bw: 10, _ba: "O" },
        inside10: { _bw: 10, _ba: "I" },
        roundCapBevel: { _bw: 8, _blc: "round", _blj: "bevel" },
        buttMiter10: { _bw: 8, _blc: "butt", _blj: "miter", _bml: 10 },
        dashed: { _bw: 3, _bds: [5, 2] },
        markers: { _bw: 2, _bhm: "A", _btm: "C", _bhms: 2, _btms: 3 },
        markersOffset: { _bw: 2, _bhm: "AF", _btm: "D", _bhmo: true, _btmo: true },
        hidden: { _bw: 10, _vs: false },
      };
      for (const [sk, sf] of Object.entries(shapes)) {
        for (const [bk, bv] of Object.entries(borders)) {
          const n = sf() as ReturnType<typeof H.rect>;
          const l = bk !== "none" ? H.border(n, H.rgb(0, 0, 0), bv) : null;
          out[sk + "/" + bk] = {
            ...H.boxes(n),
            padding: l ? n.getStyleBorderPadding(l) : null,
            hasBorder: n.hasStyleBorder(),
            hasFill: n.hasStyleFill(),
          };
        }
      }
      const effects: Record<string, [string, Record<string, unknown>]> = {
        blur: ["GBlurEffect", { r: 12 }],
        dropShadow: ["GDropShadowEffect", { r: 10, x: 15, y: -5 }],
        dropShadowHidden: ["GDropShadowEffect", { r: 10, x: 15, y: -5, vs: false }],
        innerShadow: ["GInnerShadowEffect", { r: 10, x: 15, y: 5 }],
        mirror: ["GMirrorEffect", { rfh: 0.5, pad: 4 }],
        contactShadow: ["GContactShadowEffect", { r: 20, a: 10, o: 8 }],
        curvedShadow: ["GCurvedShadowEffect", { s: 2, b: 20, l: 10 }],
        longShadow: ["GLongShadowEffect", { l: 80 }],
        overlay: ["GOverlayEffect", {}],
        glBlur: ["GGLBlurEffect", {}],
        outerGlow: ["GGLOuterGlowEffect", {}],
        strokeLayer: ["GGLStrokeLayerEffect", {}],
        colorAdjust: ["GColorAdjustMultiEffect", {}],
      };
      for (const [ek, [cls, values]] of Object.entries(effects)) {
        const n = H.rect(0, 0, 100, 50);
        H.fill(n, H.rgb(255, 0, 0));
        H.border(n, H.rgb(0, 0, 0), { _bw: 4 });
        const fx = new G[cls]();
        H.setAll(fx, values);
        n.getEffects().appendChild(fx);
        out["effect/" + ek] = {
          ...H.boxes(n),
          padding: H.attempt(() => n.getEffects().getEffectsPadding()),
          type: H.attempt(() => fx.getEffectType()),
        };
      }
      // Two effects stack their padding.
      const n = H.rect(0, 0, 100, 50);
      H.fill(n, H.rgb(255, 0, 0));
      n.getEffects().appendChild(new G.GBlurEffect());
      n.getEffects().appendChild(new G.GDropShadowEffect());
      out["effect/blur+shadow"] = H.boxes(n);
      // Children bbox of a group with styled children.
      const g = new G.GGroup();
      const c1 = H.rect(0, 0, 10, 10);
      H.border(c1, H.rgb(0, 0, 0), { _bw: 6 });
      g.appendChild(c1);
      g.appendChild(H.ellipse(50, 50, 10, 10));
      out.group = {
        ...H.boxes(g),
        children: H.r(g.getChildrenPaintBBox && g.getChildrenPaintBBox()),
      };
      return out;
    }),
  },
  {
    id: "engine-model/nodes/validate-insertion",
    covers: ["ENG-NODE-009", "ENG-NODE-007", "ENG-NODE-037", "ENG-NODE-038", "ENG-STYLE-004"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const S = G.GStylable;
      const mk: Record<string, () => unknown> = {
        scene: () => new G.GScene(),
        page: () => new G.GPage(),
        layer: () => new G.GLayer(),
        group: () => new G.GGroup(),
        symbol: () => new G.GSymbol(),
        rectangle: () => new G.GRectangle(),
        ellipse: () => new G.GEllipse(),
        path: () => new G.GPath(),
        compoundpath: () => new G.GCompoundPath(),
        compoundShape: () => new G.GCompoundShape(),
        text: () => new G.GText(),
        image: () => new G.GImage(),
        imagegrid: () => new G.GImageGrid(),
        slice: () => new G.GSlice(),
        connector: () => new G.GConnector(),
        pathsGraph: () => new G.GPathsGraph(),
        style: () => new G.GStyle(),
        swatch: () => new G.GSwatch(),
        swatches: () => new G.GSwatches(),
        annlst: () => new G.GAnnotationsList(),
        anr: () => new G.GRectangleAnnotation(),
        cmt: () => new G.GComment(),
        ann: () => new G.GEmptyAnnotation(),
        paintLayers: () => new S.PaintLayers(),
        fillPaintLayer: () => new S.FillPaintLayer(),
        borderPaintLayer: () => new S.BorderPaintLayer(),
        effects: () => new S.Effects(),
        dropShadow: () => new G.GDropShadowEffect(),
        anchorPoint: () => new G.GPathBase.AnchorPoint(),
        anchorPoints: () => new G.GPathBase.AnchorPoints(),
      };
      const keys = Object.keys(mk);
      const out: Record<string, string> = {};
      for (const child of keys) {
        let row = "";
        for (const parent of keys) {
          const c = (mk[child] as () => unknown)() as {
            validateInsertion(p: unknown, r: unknown): boolean;
          };
          const p = (mk[parent] as () => unknown)();
          let ok: string;
          try {
            ok = c.validateInsertion(p, null) ? "1" : "0";
          } catch {
            ok = "E";
          }
          row += ok;
        }
        out[child] = row;
      }
      // Removal is allowed by default; locked nodes keep their children.
      const l = new G.GLayer();
      const r = new G.GRectangle();
      l.appendChild(r);
      return {
        columns: keys,
        rows: out,
        validateRemoval: r.validateRemoval(),
        rejected: H.attemptMsg(() => {
          new G.GPage().appendChild(new G.GPage());
          return "inserted";
        }),
      };
    }),
  },
  {
    id: "engine-model/nodes/query-selectors",
    covers: ["ENG-NODE-010", "ENG-NODE-009"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const a = H.add(H.rect(0, 0, 10, 10));
      a.setProperty("name", "Alpha one");
      const b = H.add(H.ellipse(20, 0, 10, 10));
      b.setProperty("name", "beta-two");
      const g = new G.GGroup();
      g.setProperty("name", "box");
      const c = H.rect(40, 0, 10, 10);
      c.setProperty("name", "gamma");
      const d = H.ellipse(60, 0, 10, 10);
      d.setProperty("name", "delta");
      g.appendChild(c);
      g.appendChild(d);
      H.add(g);
      const t = H.add(new G.GText());
      t.setProperty("name", "label");
      c.setFlag(G.GNode.Flag.Selected);
      d.setFlag(G.GElement.Flag.Hidden);
      const label = (n: { getProperty(k: string): unknown }) =>
        G.GNode.getName(n) + ":" + String(n.getProperty("name"));
      const sels = [
        "rectangle",
        "ellipse",
        "*",
        "group > rectangle",
        "group ellipse",
        "page rectangle",
        ":selected",
        '[name="gamma"]',
        '[name*="one"]',
        '[name^="beta"]',
        '[name$="two"]',
        '[name~="one"]',
        '[name|="beta"]',
        "[name]",
        "rectangle:first-child",
        "ellipse:last-child",
        "*:nth-child(2)",
        "*:nth-child(odd)",
        "rectangle, ellipse",
        "page > *",
        ":not(rectangle)",
        "page > *:last-child",
        "group + text",
        "ellipse ~ group",
        "text",
        "Compound Shape",
      ];
      const results: Record<string, unknown> = {};
      for (const sel of sels) results[sel] = H.attempt(() => s.queryAll(sel).map(label));
      return {
        results,
        single: H.attempt(() => label(s.querySingle("ellipse"))),
        singleNone: H.attempt(() => s.querySingle("polygon")),
        count: H.attempt(() => s.queryCount("rectangle")),
        matches: [a.matches("rectangle"), a.matches("ellipse"), c.matches("group > rectangle")],
        filtered: H.attempt(() => s.filtered && s.filtered("rectangle")),
        byName: H.attempt(() => s.getNodesByName && s.getNodesByName("rectangle").length),
      };
    }),
  },
  {
    id: "engine-model/nodes/flags-and-locks",
    covers: ["ENG-NODE-003", "ENG-NODE-013", "ENG-NODE-017", "ENG-NODE-009", "ENG-NODE-019"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const l = H.add(new G.GLayer());
      const g = new G.GGroup();
      const r = H.rect(0, 0, 10, 10);
      g.appendChild(r);
      l.appendChild(g);
      const state = () => ({
        layerLocked: l.isLocked(),
        groupLocked: g.isLocked(),
        rectLocked: r.isLocked(),
        rectPartial: r.hasFlag(G.GElement.Flag.PartialLocked),
        rectFull: r.hasFlag(G.GElement.Flag.FullLocked),
        rectHidden: r.hasFlag(G.GElement.Flag.Hidden),
        groupHidden: g.hasFlag(G.GElement.Flag.Hidden),
        rectVisible: H.attempt(() => r.isVisible && r.isVisible()),
      });
      const out: Record<string, unknown> = { initial: state() };
      l.setProperty("lkt", "P");
      out.layerPartial = state();
      l.setProperty("lkt", "F");
      out.layerFull = state();
      l.setProperty("lkt", null);
      out.unlocked = state();
      g.setProperty("vis", false);
      out.groupHidden = state();
      g.setProperty("vis", true);
      out.groupShown = state();
      r.setFlag(G.GNode.Flag.Selected);
      r.setFlag(G.GNode.Flag.Highlighted);
      out.flags = [
        r.hasFlag(G.GNode.Flag.Selected),
        r.hasFlag(G.GNode.Flag.Highlighted),
        r.hasFlag(G.GNode.Flag.Active),
      ];
      r.removeFlag(G.GNode.Flag.Selected);
      out.afterRemove = [r.hasFlag(G.GNode.Flag.Selected), r.hasFlag(G.GNode.Flag.Highlighted)];
      r.setProperty("plkt", G.GBlock.ProgramLck.NoMove | G.GBlock.ProgramLck.NoDelete);
      out.programLock = {
        plkt: r.getProperty("plkt"),
        validateRemoval: r.validateRemoval(),
      };
      r.setProperty("clk", true);
      out.clickThrough = r.getProperty("clk");
      return out;
    }),
  },
  {
    id: "engine-model/nodes/container-api",
    covers: ["ENG-NODE-007", "ENG-NODE-008", "ENG-NODE-009", "ENG-NODE-011"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      const a = H.rect(0, 0, 1, 1);
      const b = H.ellipse(0, 0, 1, 1);
      const c = new G.GPolygon();
      g.appendChild(a);
      g.appendChild(c);
      g.insertChild(b, c);
      const names = () => H.kids(g);
      const out: Record<string, unknown> = { order: names() };
      out.index = [g.getIndexOfChild(a), g.getIndexOfChild(b), g.getIndexOfChild(c)];
      out.byIndex = G.GNode.getName(g.getChildByIndex(1));
      out.first = G.GNode.getName(g.getFirstChild());
      out.last = G.GNode.getName(g.getLastChild());
      out.siblings = [G.GNode.getName(a.getNext()), b.getPrevious() === a, c.getNext()];
      out.parent = a.getParent() === g;
      g.removeChild(b);
      out.afterRemove = names();
      out.removedParent = b.getParent();
      const visited: string[] = [];
      g.acceptChildren((n: unknown) => {
        visited.push(G.GNode.getName(n));
      });
      out.acceptChildren = visited;
      const all: string[] = [];
      g.accept((n: unknown) => {
        all.push(G.GNode.getName(n));
      });
      out.accept = all;
      out.subnodeIds = H.attempt(() => g.getSubnodeIds().length);
      // Scene attachment
      const s = H.app.scene();
      out.detachedScene = a.getScene();
      H.add(g);
      out.attached = {
        scene: a.getScene() === s,
        page: a.getPage() === s.getActivePage(),
        findParent: G.GNode.getName(a.findParent((n: unknown) => n instanceof G.GPage)),
      };
      g.clearChildren();
      out.cleared = names();
      // beginUpdate/endUpdate blocks geometry change events until the end
      const r = H.add(H.rect(0, 0, 10, 10));
      const events: string[] = [];
      r.addEventListener(G.GElement.GeometryChangeEvent, (e: { type: number }) =>
        events.push("geometry " + e.type),
      );
      r.beginUpdate();
      r.setProperty("trf", H.T(20, 0, 0, 20, 0, 0));
      r.setProperty("trf", H.T(30, 0, 0, 30, 0, 0));
      events.push("before endUpdate");
      r.endUpdate();
      out.update = events;
      return out;
    }),
  },
  {
    id: "engine-model/nodes/shape-vertices",
    covers: [
      "ENG-NODE-020",
      "ENG-NODE-021",
      "ENG-NODE-022",
      "ENG-NODE-023",
      "ENG-NODE-024",
      "ENG-NODE-025",
      "ENG-NODE-028",
      "ENG-NODE-029",
      "ENG-NODE-030",
      "ENG-SER-006",
    ],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      for (const ct of ["R", "U", "B", "I", "F"]) {
        const r = H.rect(0, 0, 100, 60);
        r.setProperties(["tl_ct", "tl_sx", "tl_sy"], [ct, 10, 10]);
        out["rect-uniform-" + ct] = H.verts(r);
      }
      const r2 = H.rect(0, 0, 100, 60);
      r2.setProperties(
        ["uf", "tl_uf", "tl_sx", "tl_sy", "tr_ct", "tr_sx", "br_ct", "br_sx", "bl_sx", "bl_sy"],
        [false, false, 5, 15, "B", 8, "I", 12, 20, 20],
      );
      out["rect-per-corner"] = H.verts(r2);
      for (const [k, sa, ea, etp] of [
        ["full", Math.PI, Math.PI, 0],
        ["pie", 0, Math.PI / 2, 0],
        ["chord", 0, Math.PI / 2, 1],
        ["arc", 0.3, 4, 2],
      ] as const) {
        const e = H.ellipse(0, 0, 100, 60);
        e.setProperties(["sa", "ea", "etp"], [sa, ea, etp]);
        out["ellipse-" + k] = { verts: H.verts(e), boxes: H.boxes(e) };
      }
      const poly = (vals: Record<string, unknown>) => {
        const n = new G.GPolygon();
        H.setAll(n, { cx: 50, cy: 50, or: 50, ir: 50, ...vals });
        return { verts: H.verts(n), boxes: H.boxes(n) };
      };
      out["polygon-hexagon"] = poly({});
      out["polygon-star"] = poly({ pts: 5, ir: 20 });
      out["polygon-rounded"] = poly({ pts: 4, ir: 30, ocr: 5, icr: 3 });
      out["polygon-bevel"] = poly({ pts: 3, oct: "B", ocr: 8, ict: "I", icr: 4, ir: 25 });
      // Paths: anchor types, handles, auto handles, corners.
      const path = (pts: [number, number, Record<string, unknown>?][], closed: boolean) => {
        const p = new G.GPath();
        for (const [x, y, extra] of pts) {
          const ap = new G.GPathBase.AnchorPoint();
          ap.setProperties(["x", "y"], [x, y]);
          if (extra) H.setAll(ap, extra);
          p.getAnchorPoints().appendChild(ap);
        }
        p.setProperty("closed", closed);
        const blob = H.blob(p);
        return {
          verts: H.verts(p),
          pts: blob.pts,
          clockwise: p.isClockWise(),
          isLine: H.attempt(() => p.isLine()),
          boxes: H.boxes(p),
        };
      };
      out["path-line"] = path(
        [
          [0, 0],
          [100, 50],
        ],
        false,
      );
      out["path-corners"] = path(
        [
          [0, 0, { tp: "R", cl: 10, cr: 10 }],
          [100, 0, { tp: "B", cl: 10, cr: 20 }],
          [100, 100, { tp: "I", cl: 15, cr: 15 }],
          [0, 100, { tp: "U", cl: 5, cr: 5 }],
        ],
        true,
      );
      out["path-smooth"] = path(
        [
          [0, 0],
          [50, 50, { tp: "TS", hlx: 30, hly: 60, hrx: 70, hry: 40 }],
          [100, 0, { tp: "TA", ah: true }],
          [150, 50, { tp: "TM", hlx: 140, hly: 20 }],
          [200, 0, { tp: "TC" }],
        ],
        false,
      );
      out["path-ccw"] = path(
        [
          [0, 0],
          [0, 100],
          [100, 100],
        ],
        true,
      );
      // reverseOrder flips the direction.
      const rp = new G.GPath();
      for (const [x, y] of [
        [0, 0],
        [0, 100],
        [100, 100],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        rp.getAnchorPoints().appendChild(ap);
      }
      rp.setProperty("closed", true);
      const before = rp.isClockWise();
      rp.reverseOrder();
      out.reverseOrder = { before, after: rp.isClockWise(), verts: H.verts(rp) };
      return out;
    }),
  },
  {
    id: "engine-model/nodes/anchor-points-legacy",
    covers: ["ENG-SER-006", "ENG-NODE-022", "ENG-NODE-025"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      // The compact packed form, the legacy unpacked numeric form, and a
      // float that does not fit float32 (precision is lost on save).
      const blobs = {
        packed: {
          "@": "path",
          closed: true,
          pts: [
            ["AAAAAAAAAAA="],
            ["S", "AADIQgAAAAA=", "h", "AACgQgAAoME=", "H", "AADwQgAAoEE="],
            ["B", "AADIQgAAyEI=", "C", "AAAgQQAAIEE="],
            ["TA", true, "AAAAAAAAyEI="],
          ],
        },
        legacyObjects: {
          "@": "path",
          pts: [
            { x: 1.5, y: 2.5 },
            { x: 10, y: 20, tp: "S", hlx: 5, hly: 15, hrx: 15, hry: 25 },
            { x: 30, y: 0, cl: 3, cr: 4, tp: "B" },
          ],
        },
        legacyNumbers: {
          "@": "path",
          pts: [
            [0, 0],
            [50, 25],
            ["TS", 100, 0],
          ],
        },
      };
      const out: Record<string, unknown> = {};
      for (const [k, b] of Object.entries(blobs)) {
        out[k] = H.attempt(() => {
          const p = G.GNode.deserialize(JSON.stringify(b));
          const anchors = (p.getAnchorPoints().getChildren() as unknown[]).map((a) =>
            H.props(a, ["tp", "x", "y", "hlx", "hly", "hrx", "hry", "ah", "cl", "cr"]),
          );
          return { anchors, pts: H.blob(p).pts };
        });
      }
      const p = new G.GPath();
      const ap = new G.GPathBase.AnchorPoint();
      ap.setProperties(["x", "y"], [0.1, 1 / 3]);
      p.getAnchorPoints().appendChild(ap);
      const back = G.GNode.deserialize(H.ser(p)).getAnchorPoints().getFirstChild();
      out.float32 = { pts: H.blob(p).pts, x: back.getProperty("x"), y: back.getProperty("y") };
      out.packPoint = G.GUtil.packPoint(1 / 3, -2.5);
      out.unpackPoint = H.v(G.GUtil.unpackPoint("AADIQgAAAAA="));
      return out;
    }),
  },
]);

paritySuite("engine-model nodes", scenarios, { newApp: false });
