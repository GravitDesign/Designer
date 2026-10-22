import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";
import { EFFECTS, EFFECT_ITEMS, EFFECT_VALUES } from "./effects-data.ts";

// Render matrix: one small tile per blend mode (canvas and WebGL, on the
// element and on a paint layer), per effect with non-default values, plus
// the angular gradient and a fill mask. WebGL runs on SwiftShader
// (playwright.config.ts), so the GL tiles don't depend on the GPU.

const CANVAS_MODES = [
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
];

const WEBGL_MODES = [
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

interface BlendArgs {
  mode: string;
  scope: "element" | "layer";
}

const blend = (mode: string, scope: BlendArgs["scope"], webgl: boolean): Scenario => ({
  id: `engine-model/render/blend-${scope}-${mode}`,
  covers: [webgl ? "ENG-BLEND-002" : "ENG-BLEND-001", "ENG-BLEND-004"],
  kind: "png",
  args: { mode, scope },
  inPage: withHelpers((_p, a: BlendArgs, H) => {
    const G = H.G;
    // A gradient backdrop and a gradient ellipse on top, blended either as
    // a whole element (`_sbl`) or through its fill layer (`_bl`).
    const g = new G.GGroup();
    const back = H.rect(0, 0, 64, 64);
    H.fill(
      back,
      G.GPattern.deserialize(
        'L#{"x":[{"p":0,"c":"C#[255,40,0]","o":1},{"p":1,"c":"C#[0,60,255]","o":1}]}',
      ),
    );
    g.appendChild(back);
    const top = H.ellipse(8, 8, 48, 48);
    const layer = H.fill(
      top,
      G.GPattern.deserialize(
        'L#{"x":[{"p":0,"c":"C#[30,220,90]","o":1},{"p":1,"c":"C#[250,230,20]","o":0.8}],"r":1.5707963267948966}',
      ),
    );
    if (a.scope === "element") top.setProperty("_sbl", a.mode);
    else layer.setProperty("_bl", a.mode);
    g.appendChild(top);
    H.add(g);
    return g.toBitmap(1, 1).toImageDataUrl();
  }),
});

const effect = (cls: string): Scenario => ({
  id: `engine-model/render/effect-${cls}`,
  covers: [EFFECT_ITEMS[cls] ?? "ENG-EFFECT-001", "ENG-EFFECT-048"],
  kind: "png",
  args: { cls, values: EFFECT_VALUES[cls] ?? {} },
  inPage: withHelpers((_p, a: { cls: string; values: Record<string, unknown> }, H) => {
    const G = H.G;
    // A gradient rectangle with a border, so colour, edge and shape
    // effects all have something to work on.
    const r = H.rect(16, 16, 48, 32);
    H.fill(
      r,
      G.GPattern.deserialize(
        'L#{"x":[{"p":0,"c":"C#[255,40,0]","o":1},{"p":0.5,"c":"C#[250,230,20]","o":1},{"p":1,"c":"C#[0,60,255]","o":1}]}',
      ),
    );
    H.border(r, H.rgb(20, 20, 20), { _bw: 3 });
    const fx = new G[a.cls]();
    H.setAll(fx, a.values);
    r.getEffects().appendChild(fx);
    H.add(r);
    return r.toBitmap(1, 1).toImageDataUrl();
  }),
});

const scenarios: Scenario[] = defineScenarios<unknown>([
  ...CANVAS_MODES.flatMap((m) => [blend(m, "element", false), blend(m, "layer", false)]),
  ...WEBGL_MODES.flatMap((m) => [blend(m, "element", true), blend(m, "layer", true)]),
  // GWebGLEffect is the abstract base of the GL effects; it can't paint.
  ...EFFECTS.filter((c) => c !== "GWebGLEffect").map(effect),
  {
    id: "engine-model/render/angular-gradient",
    covers: ["ENG-GRAD-004", "ENG-GRAD-001"],
    kind: "png",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const stops = [
        { position: 0, color: H.rgb(255, 0, 0), opacity: 1 },
        { position: 0.4, color: H.rgb(0, 255, 0), opacity: 0.6 },
        { position: 1, color: H.rgb(0, 0, 255), opacity: 1 },
      ];
      const g = new G.GGroup();
      // Default start angle and scale, then a turned and scaled one, then
      // one restored from its blob.
      const pats = [
        new G.GAngularGradient(stops),
        new G.GAngularGradient(stops, 1, 0.3, 0.6, Math.PI / 3),
        G.GPattern.deserialize(
          'A#{"x":[{"p":0,"c":"C#[0,0,0]","o":1},{"p":1,"c":"C#[255,255,255]","o":1}],"a0":1}',
        ),
      ];
      pats.forEach((pt, i) => {
        const e = H.ellipse(i * 70, 0, 60, 60);
        H.fill(e, pt);
        g.appendChild(e);
      });
      H.add(g);
      return g.toBitmap(1, 1).toImageDataUrl();
    }),
  },
  {
    id: "engine-model/render/fill-mask",
    covers: ["ENG-FILL-002", "ENG-PATTERN-002"],
    kind: "png",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      // A texture layer flagged as mask cuts the fill layers above it to its
      // alpha: here a red and a blue fill, masked by a 4 x 4 checker whose
      // cells fade from opaque to transparent.
      const cv = document.createElement("canvas");
      cv.width = 4;
      cv.height = 4;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = `rgba(0, 0, 0, ${(x + y) % 2 ? 1 : (x + 1) / 5})`;
          ctx.fillRect(x, y, 1, 1);
        }
      const tex = new G.GTexturePattern(cv.toDataURL("image/png"));
      // Stretched over the element, as the "Stretch" scale option does.
      G.GTexturePattern.ScaleSettings.stretch(tex);
      tex.setMask(true);
      let loaded = 0;
      tex.addEventListener(G.GTexturePattern.UpdateEvent, () => loaded++);
      const r = H.rect(0, 0, 64, 64);
      H.add(r);
      H.fill(r, tex);
      H.fill(r, H.rgb(255, 0, 0));
      H.fill(r, H.rgb(0, 0, 255), { _op: 0.5 });
      for (let i = 0; i < 300 && loaded === 0; i++) await H.frame();
      if (loaded === 0) throw new Error("the mask texture did not load");
      if (!r.getPaintLayers().hasFillMaskLayers()) throw new Error("no mask layer");
      return r.toBitmap(1, 1).toImageDataUrl();
    }),
  },
]);

paritySuite("engine-model render", scenarios, { newApp: false });
