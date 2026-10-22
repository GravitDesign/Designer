import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Colors, color conversions (with and without the CMYK ICC profile),
// gradients and patterns.

const CSS_INPUTS = [
  "red",
  "transparent",
  "rebeccapurple",
  "#abc",
  "#a1b2c3",
  "#A1B2C3FF",
  "rgb(10, 20, 30)",
  "rgba(10,20,30,0.5)",
  "rgb(300,-5,20)",
  "hsl(120, 50%, 50%)",
  "hsla(240,100%,25%,0.2)",
  "rgb(10%, 50%, 100%)",
  "  blue  ",
  "notacolor",
  "#12",
  "",
];

const RGB_SAMPLES = [
  [0, 0, 0],
  [255, 255, 255],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [12, 200, 77],
  [128, 128, 128],
  [250, 128, 114],
  [1, 2, 3],
];

const CMYK_SAMPLES = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [0.2, 0.4, 0.6, 0.1],
  [0.5, 0.5, 0.5, 0.5],
];

/** Waits for the CMYK ICC profile the app loads at startup. */
const waitForProfile = `async (G) => {
  for (let i = 0; i < 400 && !G.GColor.currentCMYKProfile; i++) await new Promise((r) => setTimeout(r, 25));
  if (!G.GColor.currentCMYKProfile) throw new Error("ICC profile did not load");
}`;

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/colors/rgb",
    covers: ["ENG-COLOR-001", "ENG-COLOR-002", "ENG-PATTERN-001", "ENG-SER-005"],
    kind: "json",
    args: { css: CSS_INPUTS, samples: RGB_SAMPLES },
    inPage: withHelpers((_p, a: { css: string[]; samples: number[][] }, H) => {
      const G = H.G;
      const C = G.GRGBColor;
      const out: Record<string, unknown> = {};
      out.constants = [C.BLACK, C.WHITE, C.RED].map((c: { getValue(): unknown }) => c.getValue());
      out.parse = Object.fromEntries(a.css.map((s) => [s, H.attempt(() => C.parseCSSColor(s))]));
      out.fromCSS = Object.fromEntries(
        a.css.map((s) => [
          s,
          H.attempt(() => {
            const c = C.fromCSSColor(s);
            return c ? G.GPattern.serialize(c) : c;
          }),
        ]),
      );
      out.colors = a.samples.map((v) => {
        const c = new C(v);
        return {
          value: c.getValue(),
          serialized: G.GPattern.serialize(c),
          blob: c.serialize(),
          human: c.toHumanString(),
          screen: c.toScreen(),
          css: c.toScreenCSS(),
          cssHalf: c.toScreenCSS(0.5),
          background: c.asCSSBackground(0.25),
          hex: C.rgbToHtmlHex(v),
          rgbToCSS: C.rgbToCSS(v),
          closest: c.getClosestCSSName(),
          toString: String(c),
        };
      });
      out.clamped = new C([300, -20, 12.7]).getValue();
      const x = new C([10, 20, 30]);
      const y = new C([10, 20, 31]);
      out.equals = [C.equals(x, new C([10, 20, 30])), C.equals(x, y), C.equals(x, null)];
      out.closeEnough = H.attempt(() => [
        C.closeEnough(x, y),
        C.closeEnough(x, new C([90, 20, 30])),
      ]);
      out.mix = H.attempt(() => C.mix([x, new C([200, 100, 0])]));
      out.mixWeighted = H.attempt(() => C.mix([x, new C([200, 100, 0])], [0.25, 0.75]));
      out.blend = H.attempt(() => C.blend([255, 0, 0, 0.5], [0, 0, 255, 1]));
      out.deserialize = [
        H.v(G.GPattern.deserialize("C#[1,2,3]")),
        H.v(G.GPattern.deserialize("Y#[0.1,0.2,0.3,0.4]")),
        H.v(G.GPattern.deserialize("H#[120,0.5,0.5]")),
        H.attempt(() => G.GPattern.deserialize("Z#[1]")),
        H.attempt(() => G.GPattern.deserialize("garbage")),
      ];
      out.colorModes = G.GColor.ColorModes;
      out.average = new C([4, 5, 6]).getAverageColor && H.v(new C([4, 5, 6]).getAverageColor());
      out.clone = H.v(new C([7, 8, 9]).clone());
      return out;
    }),
  },
  {
    id: "engine-model/colors/cmyk-hsv",
    covers: ["ENG-COLOR-003", "ENG-COLOR-004", "ENG-COLOR-005", "ENG-COLOR-006"],
    kind: "json",
    args: { rgb: RGB_SAMPLES, cmyk: CMYK_SAMPLES, wait: waitForProfile },
    inPage: withHelpers(async (_p, a: { rgb: number[][]; cmyk: number[][]; wait: string }, H) => {
      const G = H.G;
      await (0, eval)(a.wait)(G);
      const C = G.GColor;
      const run = () => ({
        rgbToCMYK: a.rgb.map((v) => C.rgbToCMYK(v)),
        cmykToRGB: a.cmyk.map((v) => C.cmykToRGB(v)),
        cmykToHSV: a.cmyk.map((v) => C.cmykToHSV(v)),
        hsvToCMYK: a.rgb.map((v) => C.hsvToCMYK(C.rgbToHSV(v))),
        cmykScreen: a.cmyk.map((v) => new G.GCMYKColor(v).toScreen()),
        cmykCSS: a.cmyk.map((v) => new G.GCMYKColor(v).toScreenCSS()),
      });
      const withProfile = run();
      const profile = C.currentCMYKProfile;
      C.currentCMYKProfile = null;
      let without;
      try {
        without = run();
      } finally {
        C.currentCMYKProfile = profile;
      }
      return {
        withProfile,
        withoutProfile: without,
        profileNames: C.IccProfileNames,
        d50: C.D50,
        rgbToHSV: a.rgb.map((v) => C.rgbToHSV(v)),
        hsvToRGB: [
          [0, 0, 0],
          [0, 1, 1],
          [120, 1, 1],
          [240, 0.5, 0.5],
          [359, 0.2, 0.9],
          [60, 1, 0.5],
        ].map((v) => C.hsvToRGB(v)),
        cmyk: {
          defaultValue: new G.GCMYKColor().getValue(),
          human: new G.GCMYKColor([0.1, 0.2, 0.3, 0.4]).toHumanString(),
          serialized: G.GPattern.serialize(new G.GCMYKColor([0.1, 0.2, 0.3, 0.4])),
          clone: H.v(new G.GCMYKColor([0.5, 0, 0, 0]).clone()),
        },
        hsv: {
          value: new G.GHSVColor([200, 0.5, 0.25]).getValue(),
          screen: new G.GHSVColor([200, 0.5, 0.25]).toScreen(),
          human: new G.GHSVColor([200, 0.5, 0.25]).toHumanString(),
          serialized: G.GPattern.serialize(new G.GHSVColor([200, 0.5, 0.25])),
          isRGB: new G.GHSVColor([1, 1, 1]) instanceof G.GRGBColor,
        },
      };
    }),
  },
  {
    id: "engine-model/colors/color-helper",
    covers: ["ENG-COLOR-007", "ENG-STYLE-008"],
    kind: "json",
    args: { wait: waitForProfile },
    inPage: withHelpers(async (_p, a: { wait: string }, H) => {
      const G = H.G;
      await (0, eval)(a.wait)(G);
      const M = G.GColor.ColorModes;
      const colors = {
        rgb: H.rgb(200, 50, 10),
        cmyk: new G.GCMYKColor([0.1, 0.9, 0.2, 0]),
        hsv: new G.GHSVColor([90, 0.5, 0.5]),
      };
      const out: Record<string, unknown> = {};
      for (const [k, c] of Object.entries(colors)) {
        for (const mode of Object.keys(M)) {
          out[k + "->" + mode] = H.attempt(() => G.GColorHelper.convertColor(c, M[mode]));
        }
      }
      // Changing a scene's color mode converts its default styles.
      // (A standalone scene: the app resets "cm" on its open documents.)
      const s = new G.GScene();
      const styleFills = () =>
        (
          s.getStyles().getChildren() as {
            getProperty(n: string): unknown;
            getPaintLayers(): { getLayers(): { getProperty(n: string): unknown }[] };
          }[]
        ).map((st) => [
          st.getProperty("name"),
          H.attempt(() =>
            st
              .getPaintLayers()
              .getLayers()
              .map((l) => H.v(l.getProperty("_pt"))),
          ),
        ]);
      out.stylesRGB = styleFills();
      s.setProperty("cm", M.CMYK);
      out.stylesCMYK = { mode: s.getProperty("cm"), styles: styleFills() };
      s.setProperty("cm", M.HSB);
      out.stylesHSB = styleFills();
      s.setProperty("cm", M.RGB);
      out.stylesBackToRGB = styleFills();
      return out;
    }),
  },
  {
    id: "engine-model/colors/gradients",
    covers: [
      "ENG-GRAD-001",
      "ENG-GRAD-002",
      "ENG-GRAD-003",
      "ENG-GRAD-004",
      "ENG-GRAD-005",
      "ENG-SER-005",
      "ENG-SER-013",
    ],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const P = G.GPattern;
      const stops = [
        { position: 0.8, color: H.rgb(0, 0, 255), opacity: 1 },
        { position: -0.5, color: H.rgb(255, 0, 0), opacity: 0.5 },
        { position: 0.3, color: new G.GCMYKColor([0, 1, 0, 0]), opacity: 0.25 },
      ];
      const describe = (g: {
        getStops(): { position: number; color: unknown; opacity: number }[];
        getScale(): number;
        getTransform(): unknown;
        asCSSBackground(o?: number): string;
        toScreenCSS(o?: number): string;
        clone(): unknown;
      }) => {
        const s = P.serialize(g);
        return {
          serialized: s,
          stops: g.getStops().map((x) => [x.position, H.v(x.color), x.opacity]),
          scale: g.getScale(),
          transform: H.v(g.getTransform()),
          css: H.attempt(() => g.asCSSBackground()),
          cssHalf: H.attempt(() => g.asCSSBackground(0.5)),
          screenCSS: g.toScreenCSS(),
          angle: H.attempt(() => (g as unknown as { getAngle(): number }).getAngle()),
          average: H.attempt(() =>
            (g as unknown as { getAverageColor(): unknown }).getAverageColor(),
          ),
          cloneSerialized: P.serialize(g.clone()),
          roundTrip: P.serialize(P.deserialize(s)),
        };
      };
      const out: Record<string, unknown> = {};
      out.linearDefault = describe(new G.GLinearGradient());
      out.linear = describe(new G.GLinearGradient(stops, 2, 0.7, 0.3, 0.6, H.T(1, 0, 0, 1, 5, 5)));
      out.radialDefault = describe(new G.GRadialGradient());
      out.radial = describe(new G.GRadialGradient(stops, 0.8, 0.4, 0.6, 0.2, 0.9));
      // Known bug: the radial center is written as _cx/_cy but read as cx/cy,
      // so the moved center (20% 90%) comes back as 50% 50% after a round trip.
      const moved = new G.GRadialGradient(stops, 0.8, 0.4, 0.6, 0.2, 0.9);
      out.radialCenterRoundTrip = {
        before: moved.asCSSBackground(),
        serialized: P.serialize(moved),
        after: P.deserialize(P.serialize(moved)).asCSSBackground(),
        readsCx: P.deserialize(
          'R#{"x":[{"p":0,"c":"C#[0,0,0]"},{"p":1,"c":"C#[255,255,255]"}],"cx":0.1,"cy":0.3}',
        ).asCSSBackground(),
      };
      out.angularDefault = describe(new G.GAngularGradient());
      out.angular = H.attempt(() =>
        describe(new G.GAngularGradient(stops, 0.7, 0.4, 0.5, 0.5, null)),
      );
      out.angularStartAngle = H.attempt(() =>
        P.serialize(
          P.deserialize('A#{"x":[{"p":0,"c":"C#[0,0,0]"},{"p":1,"c":"C#[255,255,255]"}],"a0":1}'),
        ),
      );
      // Legacy: opacity-only stops merge into the color stops.
      out.legacyOpacityStops = P.serialize(
        P.deserialize(
          'L#{"x":[{"p":0,"c":"C#[255,0,0]"},{"p":1,"c":"C#[0,0,255]"},{"p":0,"o":0.2},{"p":1,"o":0.7},{"p":0.5,"o":0.1}]}',
        ),
      );
      // Legacy: an angular end angle a1 rescales the stops and adds a tail.
      out.legacyAngularEnd = H.attempt(() =>
        P.serialize(
          P.deserialize(
            'A#{"x":[{"p":0,"c":"C#[255,0,0]"},{"p":1,"c":"C#[0,0,255]"}],"a0":0,"a1":3.141592653589793}',
          ),
        ),
      );
      out.equals = {
        linear: [
          G.GLinearGradient.equals(new G.GLinearGradient(), new G.GLinearGradient()),
          G.GLinearGradient.equals(new G.GLinearGradient(null, 1, 0.5), new G.GLinearGradient()),
        ],
        radial: [
          G.GRadialGradient.equals(new G.GRadialGradient(), new G.GRadialGradient()),
          G.GRadialGradient.equals(
            new G.GRadialGradient(null, 0.5, 0.5, 0.5, 0.1, 0.1),
            new G.GRadialGradient(),
          ),
        ],
      };
      return out;
    }),
  },
  {
    id: "engine-model/colors/patterns",
    covers: [
      "ENG-PATTERN-001",
      "ENG-PATTERN-002",
      "ENG-PATTERN-003",
      "ENG-PATTERN-004",
      "ENG-SER-005",
    ],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const P = G.GPattern;
      const TP = G.GTexturePattern;
      const out: Record<string, unknown> = {};
      const tex = new TP();
      const state = (t: typeof tex) => ({
        serialized: P.serialize(t),
        repeat: t.getRepeatMode(),
        size: t.getSizeMode(),
        scale: t.getScaleMode(),
        position: t.getPosition(),
        width: t.getWidth(),
        height: t.getHeight(),
        angle: t.getAngle(),
        tileSize: t.getTileSize(),
        mask: t.isMask(),
        transform: H.v(t.getTransform()),
        url: H.attempt(() => t.getRawUrl()),
      });
      out.textureDefault = state(tex);
      for (const mode of Object.keys(TP.ScaleSettings)) {
        const t = new TP();
        TP.ScaleSettings[mode](t);
        out["preset-" + mode] = state(t);
      }
      const t = new TP();
      t.setRepeatMode(TP.RepeatMode.Horizontal);
      t.setSizeMode(TP.SizeMode.Length);
      t.setPosition(TP.PositionMode.Right);
      t.setWidth(40);
      t.setHeight(30);
      t.setAngle(0.5);
      t.setTileSize(12);
      t.setMask(true);
      t.setTransform(H.T(2, 0, 0, 2, 1, 1));
      out.textureSet = state(t);
      out.textureRoundTrip = P.serialize(P.deserialize(P.serialize(t)));
      out.textureEquals = [TP.equals(t, P.deserialize(P.serialize(t))), TP.equals(t, new TP())];
      out.textureCSS = H.attempt(() => t.asCSSBackground());
      const noise = new G.GNoisePattern();
      out.noiseDefault = {
        serialized: P.serialize(noise),
        type: noise.getType(),
        amount: noise.getAmount(),
        webgl: noise.isWebGL(),
      };
      const n2 = new G.GNoisePattern();
      n2.setType(G.GNoisePattern.Type.Color);
      n2.setAmount(0.8);
      out.noiseSet = {
        serialized: P.serialize(n2),
        roundTrip: P.serialize(P.deserialize(P.serialize(n2))),
        type: n2.getType(),
        amount: n2.getAmount(),
        isTexture: n2 instanceof TP,
      };
      const bg = new G.GBackground();
      out.background = {
        serialized: P.serialize(bg),
        roundTrip: H.v(P.deserialize(P.serialize(bg))),
        css: bg.asCSSBackground(),
        average: H.attempt(() => bg.getAverageColor()),
      };
      out.chessboard = H.attempt(() => P.asCSSBackground());
      return H.clean(out);
    }),
  },
  {
    id: "engine-model/colors/render-gradients",
    covers: ["ENG-GRAD-001", "ENG-GRAD-002", "ENG-GRAD-003", "ENG-FILL-001"],
    kind: "png",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const g = new G.GGroup();
      const stops = [
        { position: 0, color: H.rgb(255, 0, 0), opacity: 1 },
        { position: 0.5, color: H.rgb(0, 255, 0), opacity: 0.5 },
        { position: 1, color: H.rgb(0, 0, 255), opacity: 1 },
      ];
      const pats = [
        new G.GLinearGradient(stops),
        new G.GLinearGradient(stops, 1, Math.PI / 4),
        new G.GRadialGradient(stops),
        new G.GRadialGradient(stops, 1, 0.3, 0.3),
        new G.GCMYKColor([0, 0.5, 1, 0]),
      ];
      pats.forEach((pt, i) => {
        const r = H.rect(i * 50, 0, 40, 40);
        H.fill(r, pt);
        g.appendChild(r);
      });
      H.add(g);
      return g.toBitmap(1, 1).toImageDataUrl();
    }),
  },
]);

paritySuite("engine-model colors", scenarios, { newApp: false });
