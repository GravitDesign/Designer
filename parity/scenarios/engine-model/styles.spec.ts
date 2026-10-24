import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";
import { EFFECTS, EFFECT_VALUES } from "./effects-data.ts";

// Styles: paint layers (fills, borders), effects, blend modes, opacity,
// shared styles, default styles and swatches.

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
  "linear_burn",
  "linear_dodge",
  "vivid_light",
  "linear_light",
  "pin_light",
  "divide",
  "add",
  "subtract",
  "hardmix",
  "power",
  "harmonic",
  "sin",
];

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/styles/property-sets",
    covers: ["ENG-STYLE-001", "ENG-STYLE-007", "ENG-NODE-036", "ENG-NODE-039"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      for (const c of [
        "GRectangle",
        "GEllipse",
        "GPolygon",
        "GPath",
        "GCompoundPath",
        "GCompoundShape",
        "GText",
        "GImage",
        "GGroup",
        "GLayer",
        "GSymbol",
        "GStyle",
        "GPathsGraph",
        "GConnector",
        "GImageGrid",
        "GTextAnnotation",
        "GRectangleAnnotation",
      ]) {
        const n = new G[c]();
        out[c] = {
          sets: n.getStylePropertySets(),
          paintLayers: !!n.getPaintLayers(),
          effects: !!n.getEffects(),
        };
      }
      const st = new G.GStyle();
      st.setProperty("ps", ["S", "FL"]);
      out.styleWithSubset = st.getStylePropertySets();
      return out;
    }),
  },
  {
    id: "engine-model/styles/paint-layers-document",
    covers: [
      "ENG-STYLE-003",
      "ENG-STYLE-004",
      "ENG-STYLE-005",
      "ENG-STYLE-006",
      "ENG-FILL-001",
      "ENG-FILL-002",
      "ENG-BORDER-001",
      "ENG-BORDER-002",
      "ENG-BORDER-003",
      "ENG-BORDER-004",
      "ENG-BLEND-004",
      "ENG-BLEND-005",
      "ENG-SER-005",
    ],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const r = H.rect(0, 0, 100, 60);
      r.setProperties(["_sbl", "_sfop", "_stop"], ["screen", 0.7, 0.9]);
      const f1 = H.fill(r, H.rgb(255, 0, 0));
      const f2 = H.fill(
        r,
        G.GPattern.deserialize(
          'L#{"x":[{"p":0,"c":"C#[0,0,0]","o":1},{"p":1,"c":"C#[255,255,255]","o":0.5}],"r":0.5}',
        ),
        {
          _op: 0.5,
          _bl: "multiply",
          _vs: false,
          _px: H.T(1, 0, 0, 1, 5, 5),
        },
      );
      const f3 = H.fill(r, new G.GCMYKColor([0, 1, 0.5, 0.1]), { _bl: "color" });
      const b1 = H.border(r, H.rgb(0, 0, 255), {
        _bw: 7,
        _ba: "O",
        _blc: "round",
        _blj: "bevel",
        _bml: 6,
        _bds: [4, 2, 1],
        _bs: true,
        _op: 0.8,
      });
      const b2 = H.border(r, H.rgb(0, 255, 0), {
        _bw: 2,
        _ba: "I",
        _bhm: "A",
        _btm: "LD",
        _bhms: 2,
        _btms: 0.5,
        _bhmo: true,
        _btmo: true,
        _bhmi: 0,
        _btmi: 0,
      });
      const pls = r.getPaintLayers();
      const name = (n: unknown) => (n ? G.GNode.getName(n) : null);
      const info = {
        layers: (pls.getLayers() as unknown[]).map(name),
        fills: (pls.getFillLayers() as unknown[]).map(name),
        borders: (pls.getBorderLayers() as unknown[]).map(name),
        hasFill: [r.hasStyleFill(), pls.hasStyleFill()],
        hasBorder: [r.hasStyleBorder(), pls.hasStyleBorder()],
        hasSeparateFillLayer: pls.hasSeparateFillLayer(),
        hasFillMaskLayers: pls.hasFillMaskLayers(),
        isSeparate: [f1.isSeparateLayer(), f2.isSeparateLayer(), f3.isSeparateLayer()],
        hasStyle: [f1.hasStyle(), f2.hasStyle(), b1.hasStyle()],
        isMask: [f1.isMask(), b1.isMask()],
        owner: [f1.getOwnerStylable() === r, b2.getOwnerStylable() === r],
        patternPropNames: [f1.getPatternPropNames(), b1.getPatternPropNames()],
        styleLayers: H.attempt(() => r.getStyleLayers()),
      };
      const json = H.ser(r);
      const restored = G.GNode.deserialize(json);
      return JSON.stringify({
        blob: JSON.parse(json),
        info,
        reserialized: H.ser(restored) === json,
        restoredLayers: (restored.getPaintLayers().getLayers() as unknown[]).map(name),
      });
    }),
  },
  {
    id: "engine-model/styles/paint-layer-operations",
    covers: ["ENG-STYLE-006", "ENG-STYLE-011", "ENG-FILL-002", "ENG-PATTERN-002"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const r = H.rect(0, 0, 10, 10);
      H.fill(r, H.rgb(1, 1, 1));
      H.fill(r, H.rgb(2, 2, 2));
      H.border(r, H.rgb(3, 3, 3));
      const pls = r.getPaintLayers();
      const names = () => H.kids(pls);
      const out: Record<string, unknown> = { start: names() };
      pls.clearBorderLayers();
      out.clearBorder = names();
      H.border(r, H.rgb(3, 3, 3));
      pls.clearFillLayers();
      out.clearFill = names();
      pls.clearLayers();
      out.clearAll = names();
      // A texture with the mask flag turns the layer into a mask.
      const tex = new G.GTexturePattern();
      H.fill(r, H.rgb(9, 9, 9));
      const m = H.fill(r, tex);
      out.maskBefore = [m.isMask(), pls.hasFillMaskLayers()];
      const masked = G.GPattern.deserialize(
        G.GPattern.serialize(tex).replace('"m":false', '"m":true'),
      );
      m.setProperty("_pt", masked);
      out.textureBlob = G.GPattern.serialize(tex);
      out.maskAfter = [m.isMask(), pls.hasFillMaskLayers()];
      // equalsStyle / assignStyleFrom between elements
      const a = H.rect(0, 0, 10, 10);
      const b = H.ellipse(0, 0, 20, 20);
      H.fill(a, H.rgb(10, 20, 30));
      H.border(a, H.rgb(0, 0, 0), { _bw: 5 });
      a.getEffects().appendChild(new G.GBlurEffect());
      a.setProperty("_stop", 0.5);
      out.equalBefore = H.attempt(() => a.equalsStyle(b));
      b.assignStyleFrom(a);
      out.equalAfter = H.attempt(() => a.equalsStyle(b));
      out.assigned = H.blob(b, { copy: true });
      const c = H.ellipse(0, 0, 20, 20);
      c.assignStyleFrom(a, false, ["FL"]);
      out.assignedFillOnly = H.attempt(() => H.blob(c, { copy: true }));
      return out;
    }),
  },
  {
    id: "engine-model/styles/effects-catalogue",
    covers: [
      "ENG-EFFECT-002",
      "ENG-EFFECT-003",
      "ENG-EFFECT-004",
      "ENG-EFFECT-005",
      "ENG-EFFECT-006",
      "ENG-EFFECT-007",
      "ENG-EFFECT-008",
      "ENG-EFFECT-009",
      "ENG-EFFECT-010",
      "ENG-EFFECT-011",
      "ENG-EFFECT-012",
      "ENG-EFFECT-013",
      "ENG-EFFECT-014",
      "ENG-EFFECT-015",
      "ENG-EFFECT-016",
      "ENG-EFFECT-017",
      "ENG-EFFECT-018",
      "ENG-EFFECT-019",
      "ENG-EFFECT-020",
      "ENG-EFFECT-021",
      "ENG-EFFECT-022",
      "ENG-EFFECT-023",
      "ENG-EFFECT-024",
      "ENG-EFFECT-025",
      "ENG-EFFECT-026",
      "ENG-EFFECT-027",
      "ENG-EFFECT-028",
      "ENG-EFFECT-029",
      "ENG-EFFECT-030",
      "ENG-EFFECT-031",
      "ENG-EFFECT-032",
      "ENG-EFFECT-033",
      "ENG-EFFECT-034",
      "ENG-EFFECT-035",
      "ENG-EFFECT-036",
      "ENG-EFFECT-037",
      "ENG-EFFECT-038",
      "ENG-EFFECT-039",
      "ENG-EFFECT-040",
      "ENG-EFFECT-041",
      "ENG-EFFECT-042",
      "ENG-EFFECT-043",
      "ENG-EFFECT-045",
      "ENG-EFFECT-046",
      "ENG-EFFECT-047",
    ],
    kind: "document",
    args: { classes: EFFECTS, values: EFFECT_VALUES },
    inPage: withHelpers(
      (_p, a: { classes: string[]; values: Record<string, Record<string, unknown>> }, H) => {
        const G = H.G;
        const out: Record<string, unknown> = {};
        for (const c of a.classes) {
          const fx = new G[c]();
          const props = ["vs", "ly", "shp", "sh", ...Object.keys(a.values[c] ?? {})];
          const info: Record<string, unknown> = {
            name: G.GNode.getName(fx),
            type: H.attempt(() => fx.getEffectType()),
            singleton: H.attempt(() => fx.isSingleton()),
            overlay: H.attempt(() => fx.isOverlayEffect()),
            affectedByChildren: H.attempt(() => fx.isAffectedByChildren()),
            affectedByContents: H.attempt(() => fx.isAffectedByContents()),
            defaults: H.props(fx, props),
            defaultPadding: H.attempt(() => fx.getEffectPadding()),
            defaultBlob: H.blob(fx),
          };
          H.setAll(fx, a.values[c] ?? {});
          const json = H.ser(fx);
          info.values = H.props(fx, props);
          info.padding = H.attempt(() => fx.getEffectPadding());
          info.blob = JSON.parse(json);
          info.reserialized = H.ser(G.GNode.deserialize(json)) === json;
          // The bounding box the effect adds to a 100 x 60 rectangle.
          const r = H.rect(0, 0, 100, 60);
          H.fill(r, H.rgb(255, 0, 0));
          r.getEffects().appendChild(fx);
          info.paintBBox = H.attempt(() => H.r(r.getPaintBBox()));
          info.effectsBBox = H.attempt(() =>
            H.r(r.getEffects().getEffectsBBox(r.getGeometryBBox())),
          );
          out[c] = info;
        }
        return JSON.stringify(out);
      },
    ),
  },
  {
    id: "engine-model/styles/effects-order-and-layers",
    covers: ["ENG-EFFECT-001", "ENG-EFFECT-002", "ENG-EFFECT-007", "ENG-BLEND-004"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const r = H.rect(0, 0, 100, 60);
      H.fill(r, H.rgb(255, 0, 0));
      H.border(r, H.rgb(0, 0, 0), { _bw: 4 });
      const fxs = r.getEffects();
      const order = () => H.kids(fxs);
      const out: Record<string, unknown> = {};
      fxs.appendChild(new G.GBlurEffect());
      fxs.appendChild(new G.GInnerShadowEffect());
      out.afterFilterPost = order();
      fxs.appendChild(new G.GDropShadowEffect());
      out.afterPre = order();
      fxs.insertChild(new G.GLongShadowEffect(), fxs.getFirstChild());
      out.afterInsertPreFirst = order();
      const mirror = new G.GMirrorEffect();
      fxs.appendChild(mirror);
      out.mirrorTwice = H.attemptMsg(() => {
        fxs.appendChild(new G.GMirrorEffect());
        return order();
      });
      // Effects targeting the fill layer ("F") and the border layer ("B").
      const fillFx = new G.GDropShadowEffect();
      fillFx.setProperty("ly", "F");
      fxs.appendChild(fillFx);
      const borderFx = new G.GBlurEffect();
      borderFx.setProperty("ly", "B");
      fxs.appendChild(borderFx);
      out.final = order();
      out.forLayer = {
        element: H.attempt(() =>
          (fxs.getEffectsForLayer(null) as unknown[]).map((n) => G.GNode.getName(n)),
        ),
        fill: H.attempt(() =>
          (fxs.getEffectsForLayer("F") as unknown[]).map((n) => G.GNode.getName(n)),
        ),
        border: H.attempt(() =>
          (fxs.getEffectsForLayer("B") as unknown[]).map((n) => G.GNode.getName(n)),
        ),
      };
      out.layersEffects = H.attempt(() => fxs.getLayersEffects());
      out.padding = H.attempt(() => fxs.getEffectsPadding());
      out.boxes = H.boxes(r);
      out.blob = H.blob(r, { copy: true });
      return out;
    }),
  },
  {
    id: "engine-model/styles/blend-and-opacity",
    covers: ["ENG-BLEND-001", "ENG-BLEND-002", "ENG-BLEND-004", "ENG-BLEND-005", "ENG-STYLE-002"],
    kind: "json",
    args: BLEND_MODES,
    inPage: withHelpers((_p, modes: string[], H) => {
      const G = H.G;
      const out: Record<string, unknown> = {};
      for (const m of modes) {
        const r = H.rect(0, 0, 10, 10);
        const l = H.fill(r, H.rgb(255, 0, 0));
        r.setProperty("_sbl", m);
        l.setProperty("_bl", m);
        const b = H.blob(r, { copy: true });
        out[m] = {
          element: b._sbl ?? "<default>",
          layer: b._layers.$[0]._bl ?? "<default>",
          separate: l.isSeparateLayer(),
          separateFill: r.getPaintLayers().hasSeparateFillLayer(),
        };
      }
      const r = H.rect(0, 0, 10, 10);
      r.setProperties(["_stop", "_sfop"], [0.25, 0.5]);
      out.opacity = H.props(r, ["_stop", "_sfop", "_sbl", "_sdf"]);
      const page = new G.GPage();
      page.setProperty("bop", 0.3);
      out.pageOpacity = page.getProperty("bop");
      return out;
    }),
  },
  {
    id: "engine-model/styles/shared-style",
    covers: ["ENG-STYLE-007", "ENG-SCENE-008", "ENG-STYLE-011"],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const st = new G.GStyle();
      st.setProperty("name", "Brand");
      s.getStyles().appendChild(st);
      H.fill(st, H.rgb(0, 128, 0));
      st.setProperty("_stop", 0.8);
      const a = H.add(H.rect(0, 0, 10, 10));
      const b = H.add(H.ellipse(0, 0, 10, 10));
      const c = H.add(H.rect(20, 0, 10, 10));
      a.setProperty("sref", st.getReferenceId());
      b.setProperty("sref", st.getReferenceId());
      const step: Record<string, unknown> = {};
      step.linked = {
        a: H.rawBlob(a),
        b: H.rawBlob(b),
        linkCount: s.linkCount(st),
        isLinked: [s.isLinked(a), s.isLinked(st)],
        referenced: a.getReferencedStyle() === st,
      };
      const src = H.rect(0, 0, 1, 1);
      H.fill(src, H.rgb(9, 9, 9));
      H.border(src, H.rgb(1, 1, 1), { _bw: 3 });
      st.assignStyleFrom(src);
      step.pushed = { style: H.rawBlob(st), a: H.rawBlob(a), b: H.rawBlob(b), c: H.rawBlob(c) };
      b.setProperty("sref", null);
      step.unlinkedOne = { linkCount: s.linkCount(st), b: H.rawBlob(b) };
      st.disconnectStyle();
      step.disconnected = {
        sref: [a.getProperty("sref"), b.getProperty("sref")],
        linkCount: s.linkCount(st),
        a: H.rawBlob(a),
      };
      // A style limited to fills only pushes fills.
      const st2 = new G.GStyle();
      st2.setProperty("ps", ["FL"]);
      s.getStyles().appendChild(st2);
      H.fill(st2, H.rgb(200, 100, 0));
      H.border(st2, H.rgb(0, 0, 0), { _bw: 9 });
      H.border(c, H.rgb(5, 5, 5), { _bw: 2 });
      c.setProperty("sref", st2.getReferenceId());
      step.fillsOnly = { style: H.rawBlob(st2), c: H.rawBlob(c) };
      return JSON.stringify(step);
    }),
  },
  {
    id: "engine-model/styles/default-styles",
    covers: ["ENG-STYLE-008", "ENG-STYLE-002", "ENG-SER-016"],
    kind: "document",
    // `_sdf` holds the type id of the element class; it is saved in files,
    // so it is compared as is. `sdfByType` also names the default style an
    // element uses.
    inPage: withHelpers(async (_p, _a, H) => {
      await H.warmText();
      const G = H.G;
      const s = H.app.scene();
      const styles = s.getStyles();
      const nodes: Record<string, unknown> = {
        rectangle: H.rect(0, 0, 10, 10),
        ellipse: H.ellipse(0, 0, 10, 10),
        polygon: new G.GPolygon(),
        path: new G.GPath(),
        compoundpath: new G.GCompoundPath(),
        text: new G.GText(),
        pathsGraph: new G.GPathsGraph(),
        connector: new G.GConnector(),
        image: new G.GImage(),
        anr: new G.GRectangleAnnotation(),
        ane: new G.GEllipseAnnotation(),
        ant: new G.GTextAnnotation(),
        anp: new G.GPencilAnnotation(),
        anh: new G.GHighlighterAnnotation(),
        anarr: new G.GArrowAnnotation(),
      };
      const sdfByType: Record<string, unknown> = {};
      const inserted: Record<string, unknown> = {};
      for (const [k, n] of Object.entries(nodes)) {
        H.insert(n);
        const sdf = (n as { getProperty(p: string): unknown }).getProperty("_sdf");
        const same = (styles.getChildren() as { getProperty(p: string): unknown }[])
          .filter((x) => x.getProperty("_sdf") === sdf)
          .map((x) => x.getProperty("name"));
        sdfByType[k] = sdf === null ? null : same;
        // Annotations stamp the insertion time, so these blobs go through clean.
        inserted[k] = H.blob(n);
      }
      return JSON.stringify({
        styles: H.rawBlob(styles),
        styleNames: (styles.getChildren() as { getProperty(p: string): unknown }[]).map((x) => [
          x.getProperty("name"),
          x.getProperty("defaultStyle"),
          x.getProperty("ps"),
        ]),
        // Default styles that share one `_sdf` value, by style name.
        sdfGroups: (() => {
          const groups: Record<string, unknown[]> = {};
          for (const x of styles.getChildren() as { getProperty(p: string): unknown }[]) {
            const key = String(x.getProperty("_sdf") === null ? "null" : "type");
            (groups[key] ??= []).push(x.getProperty("name"));
          }
          return groups;
        })(),
        sdfByType,
        inserted,
      });
    }),
  },
  {
    id: "engine-model/styles/swatches",
    covers: ["ENG-STYLE-009"],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const sw = s.getSwatches();
      const mk = (pt: unknown, name: string, op?: number) => {
        const x = new G.GSwatch();
        x.setProperties(["_pt", "name"], [pt, name]);
        if (op !== undefined) x.setProperty("_op", op);
        sw.appendChild(x);
        return x;
      };
      const a = mk(H.rgb(255, 0, 0), "Red");
      const b = mk(new G.GCMYKColor([0, 0, 1, 0]), "Yellow", 0.5);
      const c = mk(
        G.GPattern.deserialize(
          'R#{"x":[{"p":0,"c":"C#[0,0,0]","o":1},{"p":1,"c":"C#[255,255,255]","o":1}]}',
        ),
        "Radial",
      );
      const d = mk(new G.GTexturePattern(), "Texture");
      return JSON.stringify({
        swatches: H.rawBlob(sw),
        isCMYK: [a.isCMYK(), b.isCMYK(), c.isCMYK(), d.isCMYK()],
        accepts: [
          a.validateInsertion(sw),
          a.validateInsertion(new G.GLayer()),
          sw.validateInsertion(s),
        ],
        noiseEquals: G.GTexturePattern.equals(new G.GNoisePattern(), new G.GNoisePattern()),
      });
    }),
  },
  {
    id: "engine-model/styles/render-fills-borders",
    covers: ["ENG-FILL-003", "ENG-STYLE-010", "ENG-BORDER-005", "ENG-BLEND-001", "ENG-FILL-004"],
    kind: "png",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      // Fills with opacity and blend, borders with alignments, caps, dashes.
      const a = H.rect(0, 0, 60, 40);
      H.fill(a, H.rgb(255, 0, 0));
      H.fill(a, H.rgb(0, 0, 255), { _op: 0.5, _bl: "multiply" });
      H.border(a, H.rgb(0, 0, 0), { _bw: 6, _ba: "O" });
      g.appendChild(a);
      const b = H.ellipse(80, 0, 60, 40);
      H.fill(b, H.rgb(0, 200, 0));
      H.border(b, H.rgb(0, 0, 0), { _bw: 6, _ba: "I", _bds: [6, 3] });
      b.setProperty("_stop", 0.6);
      g.appendChild(b);
      const p = new G.GPath();
      for (const [x, y] of [
        [160, 40],
        [190, 0],
        [220, 40],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        p.getAnchorPoints().appendChild(ap);
      }
      H.border(p, H.rgb(80, 80, 80), {
        _bw: 8,
        _blc: "round",
        _blj: "round",
        _bhm: "A",
        _btm: "C",
      });
      g.appendChild(p);
      // Even-odd compound path with a hole.
      const cp = new G.GCompoundPath();
      const sub = (pts: number[][]) => {
        const q = new G.GPath();
        for (const [x, y] of pts) {
          const ap = new G.GPathBase.AnchorPoint();
          ap.setProperties(["x", "y"], [x, y]);
          q.getAnchorPoints().appendChild(ap);
        }
        q.setProperty("closed", true);
        return q;
      };
      cp.getPaths().appendChild(
        sub([
          [0, 60],
          [60, 60],
          [60, 100],
          [0, 100],
        ]),
      );
      cp.getPaths().appendChild(
        sub([
          [15, 70],
          [45, 70],
          [45, 90],
          [15, 90],
        ]),
      );
      H.fill(cp, H.rgb(255, 128, 0));
      g.appendChild(cp);
      // Gradient fill and a screen-blended element.
      const gr = H.rect(80, 60, 60, 40);
      H.fill(
        gr,
        G.GPattern.deserialize(
          'L#{"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,0,255]","o":1}]}',
        ),
      );
      g.appendChild(gr);
      const sc = H.ellipse(110, 70, 40, 40);
      H.fill(sc, H.rgb(0, 255, 0));
      sc.setProperty("_sbl", "screen");
      g.appendChild(sc);
      H.add(g);
      return g.toBitmap(1, 1).toImageDataUrl();
    }),
  },
  {
    id: "engine-model/styles/render-effects",
    covers: [
      "ENG-EFFECT-003",
      "ENG-EFFECT-004",
      "ENG-EFFECT-005",
      "ENG-EFFECT-011",
      "ENG-EFFECT-048",
    ],
    kind: "png",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      const add = (x: number, y: number, cls: string, values: Record<string, unknown>) => {
        const r = H.rect(x, y, 50, 40);
        H.fill(r, H.rgb(40, 120, 220));
        const fx = new G[cls]();
        H.setAll(fx, values);
        r.getEffects().appendChild(fx);
        g.appendChild(r);
      };
      add(0, 0, "GDropShadowEffect", { r: 4, x: 6, y: 6 });
      add(90, 0, "GInnerShadowEffect", { r: 4, x: 6, y: 6, opc: 0.9 });
      add(180, 0, "GBlurEffect", { r: 6 });
      add(0, 80, "GLongShadowEffect", { l: 30 });
      add(90, 80, "GOverlayEffect", {});
      add(180, 80, "GDropShadowEffect", { r: 0, x: -5, y: 5, pat: "pattern:C#[255,0,0]", opc: 1 });
      H.add(g);
      return g.toBitmap(1, 1).toImageDataUrl();
    }),
  },
]);

paritySuite("engine-model styles", scenarios, { newApp: false });
