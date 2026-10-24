import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// GText painting (_paintTextFill, _paintBorder, createShapePaint for a
// background fill): solid and gradient fills, a background (backdrop)
// fill, center, inside and outside borders, a gradient border, a scaled
// and rotated text, two fills on one text, and outline mode, each
// rendered with toBitmap at zoom 1 and 2.
//
// The texts don't go through the editor (it isn't ported yet), so they
// carry only the paint layers each case adds. Their font is a family of
// their own, resolved from the Open Sans file both apps serve, the way
// the app's font providers resolve fonts. Each scenario gets its own page
// because it adds that font to the workspace's font manager. A page
// without a default font (the new app before its font providers exist)
// gets Open Sans Regular from the same file as its default, which is the
// default font the old app has.

interface PaintArgs {
  case: string;
  zoom: number;
}

const CASES = [
  "fill-solid",
  "fill-gradient",
  "fill-background",
  "fill-two-layers",
  "fill-transformed",
  "border-center",
  "border-inside",
  "border-outside",
  "border-gradient",
  "border-transformed",
  "outline",
];

const COVERS: Record<string, string[]> = {
  fill: ["ENG-FILL-001", "ENG-TEXT-011"],
  border: ["ENG-BORDER-002", "ENG-BORDER-005", "ENG-TEXT-011"],
  outline: ["ENG-TEXT-011", "ENG-TEXT-015"],
};

const textPaint = (name: string, zoom: number): Scenario => ({
  id: `engine-model/text-paint/${name}-z${zoom}`,
  covers: COVERS[name.split("-")[0] as string] ?? ["ENG-TEXT-011"],
  kind: "png",
  open: { newDocument: true, settings: {} },
  args: { case: name, zoom },
  inPage: withHelpers(async (_p, a: PaintArgs, H) => {
    const G = H.G;
    const FAMILY = "Parity Paint Sans";
    const fm = H.app.scene().getWorkspace().getFontManager();
    const bytes = await (await fetch("assets/font/OpenSans-Regular.ttf")).arrayBuffer();
    const families = [FAMILY];
    if (!fm.getDefaultFont()) {
      families.push("Open Sans");
      fm.setDefaultFont(G.GOpenTypeFont.create("Open Sans", "N", 400, bytes));
    }
    fm.addEventListener(
      G.GFontManager.QueryFontFamilyEvent,
      (e: { family: string; callback(fonts: unknown[]): void }) => {
        if (families.includes(e.family))
          e.callback([{ family: e.family, style: "N", weight: 400 }]);
      },
    );
    fm.addEventListener(
      G.GFontManager.ResolveFontEvent,
      (e: { family: string; style: string; weight: number; resolved(f: unknown): void }) => {
        if (families.includes(e.family))
          e.resolved(G.GOpenTypeFont.create(e.family, e.style, e.weight, bytes));
      },
    );

    const gradient = (angle: number, withTransform: boolean) =>
      G.GPattern.deserialize(
        "L#" +
          JSON.stringify({
            x: [
              { p: 0, c: "C#[230,40,20]", o: 1 },
              { p: 0.5, c: "C#[250,220,30]", o: 0.9 },
              { p: 1, c: "C#[20,70,240]", o: 1 },
            ],
            r: angle,
            ...(withTransform ? { t: [0.9, 0.15, -0.1, 1, 0.05, 0] } : {}),
          }),
      );
    const t = new G.GText();
    const props = () => t.setProperties(["_tff", "_tfi"], [FAMILY, 30]);
    t.setProperty(
      "trf",
      a.case.endsWith("-transformed")
        ? new G.GTransform(1.2, 0.35, -0.35, 1.2, 10, 6)
        : new G.GTransform(1, 0, 0, 1, 10, 6),
    );
    H.add(t);
    // Set text and properties twice, the second time with every font
    // resolved (see H.text: the first pass can take the deferred path).
    t.setText("Paint gQ");
    props();
    await H.fonts(t);
    t.setText("Paint gQ");
    props();
    await H.fonts(t);

    const solid = H.rgb(30, 90, 200);
    let target = t;
    let configuration: Record<string, unknown> | null = null;
    switch (a.case) {
      case "fill-solid":
        H.fill(t, solid);
        break;
      case "fill-gradient":
        // A gradient with its own transform, on a layer with a pattern
        // transform: both go into the texture transform of the glyphs.
        H.fill(t, gradient(0.6, true), {
          _px: new G.GTransform(1, 0, 0.3, 1, 0.05, 0),
          _op: 0.85,
        });
        break;
      case "fill-background": {
        // The text fill shows the backdrop of the root canvas.
        const g = new G.GGroup();
        const back = H.rect(0, 0, 220, 60);
        H.fill(back, gradient(0, false));
        t.getParent().removeChild(t);
        g.appendChild(back);
        g.appendChild(t);
        H.fill(t, new G.GBackground());
        H.add(g);
        target = g;
        break;
      }
      case "fill-two-layers":
        H.fill(t, solid);
        H.fill(t, gradient(1.2, true), { _op: 0.5 });
        break;
      case "fill-transformed":
        H.fill(t, gradient(0.3, true));
        break;
      case "border-center":
      case "border-inside":
      case "border-outside": {
        const align = { center: "C", inside: "I", outside: "O" }[a.case.slice(7)] as string;
        H.fill(t, H.rgb(250, 230, 120));
        H.border(t, H.rgb(20, 20, 20), { _bw: 3, _ba: align });
        break;
      }
      case "border-gradient":
        H.border(t, gradient(0.9, true), { _bw: 4, _ba: "O", _blj: "round" });
        break;
      case "border-transformed":
        H.fill(t, solid);
        H.border(t, gradient(0.4, true), { _bw: 2, _ba: "C" });
        break;
      case "outline":
        H.fill(t, solid);
        H.border(t, H.rgb(200, 0, 0), { _bw: 3 });
        configuration = { paintMode: G.GScenePaintConfiguration.PaintMode.Outline };
        break;
      default:
        throw new Error("unknown case " + a.case);
    }
    // Paint twice: the second paint reuses the glyph bitmaps the core
    // rendered the first time (same resolution, same layer).
    target.toBitmap(a.zoom, a.zoom, null, null, configuration);
    const bitmap = target.toBitmap(a.zoom, a.zoom, null, null, configuration);
    const canvas = bitmap.getHTMLElement(true) as HTMLCanvasElement;
    const data = (canvas.getContext("2d") as CanvasRenderingContext2D).getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    ).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) if ((data[i] as number) > 0) ink++;
    if (ink === 0) throw new Error(`${a.case} painted nothing`);
    return bitmap.toImageDataUrl();
  }),
});

const scenarios: Scenario[] = defineScenarios<unknown>(
  CASES.flatMap((name) => [textPaint(name, 1), textPaint(name, 2)]),
);

paritySuite("engine-model text paint", scenarios, { newApp: false });
