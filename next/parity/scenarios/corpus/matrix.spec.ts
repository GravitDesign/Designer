// Render matrix of the paint canvas (GPaintCanvas, GBlender, GBitmap): one
// 64 x 64 tile per primitive, blend mode, composite operator and CSS
// filter, drawn through the engine's public canvas API, plus the numbers
// those APIs return. The documents in the corpus show the same features
// as part of real elements; this pins each one down on its own.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";

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

paritySuite(
  "corpus paint matrix",
  defineScenarios<unknown>([
    {
      id: "corpus/matrix/enums",
      covers: [
        "EDT-PAINT-002",
        "EDT-PAINT-003",
        "EDT-PAINT-004",
        "EDT-PAINT-005",
        "EDT-PAINT-006",
        "EDT-PAINT-007",
        "EDT-PAINT-008",
        "EDT-PAINT-010",
        "EDT-PAINT-011",
        "EDT-RENDER-002",
        "EDT-RENDER-006",
        "EDT-RENDER-040",
        "EDT-GL-016",
      ],
      kind: "json",
      inPage: ({ G }) => {
        const C = G.GPaintCanvas;
        // The WebGL implementation the renders below were recorded with
        // (playwright.config.ts pins SwiftShader); a different one changes
        // every WebGL pixel, so it is part of the recorded output.
        const gl = document.createElement("canvas").getContext("webgl");
        const info = gl?.getExtension("WEBGL_debug_renderer_info");
        return {
          webglRenderer: gl && info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null,
          LineCap: C.LineCap,
          LineJoin: C.LineJoin,
          BlendMode: C.BlendMode,
          WebGLBlendMode: C.WebGLBlendMode,
          CompositeOperator: C.CompositeOperator,
          FillRule: C.FillRule,
          Filter: C.Filter,
          RenderAlgorithm: C.RenderAlgorithm,
          SmoothingQuality: C.SmoothingQuality,
          hasFilters: C.hasFilters(),
          screenDPI: C.getScreenDPI(),
          PaintMode: G.GScenePaintConfiguration.PaintMode,
          rendererConfig: G.GRendererConfig,
        };
      },
    },
    {
      id: "corpus/matrix/paint-canvas",
      covers: [
        "EDT-PAINT-002",
        "EDT-PAINT-006",
        "EDT-PAINT-009",
        "EDT-PAINT-023",
        "EDT-PAINT-024",
        "EDT-PAINT-025",
        "EDT-PAINT-026",
        "EDT-PAINT-027",
        "EDT-PAINT-028",
        "EDT-PAINT-029",
        "EDT-PAINT-030",
        "EDT-PAINT-031",
        "EDT-PAINT-032",
        "EDT-PAINT-033",
        "EDT-PAINT-034",
        "EDT-PAINT-035",
        "EDT-PAINT-036",
        "EDT-PAINT-037",
        "EDT-PAINT-038",
        "EDT-PAINT-039",
        "EDT-PAINT-041",
        "EDT-PAINT-042",
        "EDT-PAINT-043",
        "EDT-PAINT-007",
        "EDT-PAINT-013",
        "EDT-PAINT-049",
        "ENG-GRAD-004",
      ],
      kind: "png",
      inPage: ({ G }) => {
        const C = G.GPaintCanvas;
        const rgb = (r: number, g: number, b: number) => new G.GRGBColor([r, g, b]);
        const pt = (x: number, y: number) => new G.GPoint(x, y);
        const stops = (list: [number, number[], number?][]) =>
          list.map(([position, c, opacity]) => ({
            position,
            color: rgb(c[0] ?? 0, c[1] ?? 0, c[2] ?? 0),
            opacity: opacity ?? 1,
          }));
        const rainbow = stops([
          [0, [255, 0, 0]],
          [0.5, [0, 200, 0], 0.6],
          [1, [0, 0, 255]],
        ]);
        // A 256 x 256 source with one-pixel stripes: drawn at 64 x 64 it shows
        // whether the image was downscaled smoothly.
        const source = document.createElement("canvas");
        source.width = 256;
        source.height = 256;
        const sctx = source.getContext("2d") as CanvasRenderingContext2D;
        for (let i = 0; i < 256; i++) {
          sctx.fillStyle = i % 2 ? "#ffffff" : i % 4 ? "#ff0080" : "#0040ff";
          sctx.fillRect(i, 0, 1, 256);
        }
        sctx.fillStyle = "#000000";
        sctx.fillRect(96, 96, 64, 64);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine canvas
        const tiles: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine canvas
        const tile = (draw: (c: any) => void) => {
          const c = new C(false, true);
          c.resize(64, 64);
          c.prepare();
          draw(c);
          c.finish();
          tiles.push(c);
          return c;
        };
        const star = [pt(32, 4), pt(50, 60), pt(4, 24), pt(60, 24), pt(14, 60)];
        const zigzag = [pt(8, 48), pt(24, 12), pt(40, 48), pt(56, 12)];
        tile((c) => c.fillRect(8, 8, 48, 48, rgb(220, 30, 30), 0.5));
        tile((c) => c.fillRect(8, 8, 48, 48));
        tile((c) => c.strokeRect(8, 8, 48, 48, 3, rgb(30, 30, 220)));
        tile((c) => c.strokeLine(4, 60, 60, 4, 4, rgb(0, 150, 0), true, 0.8));
        tile((c) => {
          c.putVertices(star, true);
          c.fillVertices(rgb(200, 100, 0), 1, null, false);
        });
        tile((c) => {
          c.putVertices(star, true);
          c.fillVertices(rgb(200, 100, 0), 1, null, true);
        });
        (
          [
            ["butt", "miter", null],
            ["round", "round", null],
            ["square", "bevel", [6, 3]],
          ] as const
        ).forEach(([cap, join, dash]) =>
          tile((c) => {
            c.putVertices(zigzag, false);
            c.strokeVertices(rgb(40, 40, 160), 8, dash, cap, join, 4, 0.9);
          }),
        );
        tile((c) => {
          c.clipRect(16, 16, 32, 32);
          c.fillCanvas(rgb(0, 160, 160));
          c.resetClip();
          c.strokeRect(12, 12, 40, 40, 1);
        });
        tile((c) => {
          c.putVertices(star, true);
          c.clipVertices(true);
          c.fillRect(0, 0, 64, 64, rgb(120, 0, 160));
          c.resetClip();
        });
        tile((c) => c.fillCanvas(rgb(255, 200, 0), 0.4));
        tile((c) => {
          c.fillCanvas(rgb(0, 0, 0));
          c.clear();
          c.fillRect(20, 20, 24, 24, rgb(0, 0, 0));
        });
        // Patterns through createPatternPaint, filled the way GPage paints
        // its background: the path in place, the paint's transform on top.
        for (const pattern of [
          rgb(10, 120, 200),
          new G.GLinearGradient(rainbow, 1, Math.PI / 5),
          new G.GRadialGradient(rainbow, 0.7, 0.3, 0.3, 0.5, 0.5),
          new G.GAngularGradient(rainbow, 1, undefined, undefined, Math.PI / 3),
        ]) {
          tile((c) => {
            const box = new G.GRect(8, 8, 48, 48);
            const p = c.createPatternPaint(pattern, box);
            c.putVertices([pt(8, 8), pt(56, 8), pt(56, 56), pt(8, 56)], true);
            if (p.transform) {
              const old = c.setTransform(c.getTransform(true).preMultiplied(p.transform));
              c.fillVertices(p.paint, 1, null, false);
              c.setTransform(old);
            } else c.fillVertices(p.paint, 1, null, false);
          });
        }
        tile((c) => {
          const board = C.createChessboard(8, "#ffffff", "rgb(205,205,205)");
          c.putVertices([pt(0, 0), pt(64, 0), pt(64, 64), pt(0, 64)], true);
          c.fillVertices(c.createTexture(board), 1, null, false);
        });
        // Images: the Chrome downscale path (smooth, iterative), without
        // smoothing, a fragment, and with an opacity and operator.
        tile((c) => c.drawImage(source, 0, 0, false, 1, null, false, 64, 64));
        tile((c) => c.drawImage(source, 0, 0, true, 1, null, false, 64, 64));
        tile((c) => c.drawImage(source, 0, 0, false, 1, null, true, 64, 64));
        tile((c) => c.drawImageFragment(source, 64, 64, 0, 0, 128, 128, false, 0.8, null, 64, 64));
        tile((c) => {
          c.fillRect(0, 0, 64, 64, rgb(0, 200, 120));
          c.drawImage(source, 8, 8, false, 0.6, "multiply", false, 48, 48);
        });
        tile((c) => {
          c.setImageSmoothingQuality(C.SmoothingQuality.Low);
          c.setRenderAlgorithm(C.RenderAlgorithm.Pixelated);
          c.drawImage(source, 0, 0, false, 1, null, true, 64, 64);
        });
        tile((c) => {
          c.putAuxilliaryText("Ag 10", 4, 30);
          c.putAuxilliaryText("Ag", 60, 60, "bold 20px Verdana", "alphabetic", "end", 0.7, "#d00");
        });
        // Transforms, offsets and sub-canvases.
        tile((c) => {
          c.setScale(0.5);
          c.setOrigin(pt(-32, -32));
          c.fillRect(0, 0, 64, 64, rgb(200, 0, 0));
          c.setScale(1);
          c.setOrigin(pt(0, 0));
          c.setTransform(new G.GTransform().rotated(Math.PI / 8));
          c.strokeRect(20, 4, 30, 30, 2);
          c.resetTransform();
        });
        tile((c) => {
          const child = c.createCanvas(new G.GRect(10, 10, 40, 30), false, 2);
          child.fillRect(10, 10, 40, 30, rgb(0, 90, 200));
          child.strokeRect(10, 10, 40, 30, 3, rgb(255, 255, 255));
          c.fillRect(0, 32, 64, 32, rgb(255, 150, 0));
          c.drawCanvas(child, 0, 0, 0.75);
          c.drawCanvas(child, 4, 20, 1, "destination-out");
        });
        tile((c) => {
          const original = new C(false, true);
          original.resize(64, 64);
          original.prepare();
          original.fillRect(4, 4, 30, 30, rgb(255, 0, 255));
          original.strokeLine(0, 0, 64, 64, 6, rgb(0, 0, 0));
          original.finish();
          const copy = original.clone(true);
          c.drawCanvas(copy, 16, 16);
        });
        // CSS filters through setFilter, one per tile.
        const filters: [string, unknown][] = [
          ["blur", 4],
          ["brightness", 0.5],
          ["contrast", 2],
          ["drop-shadow", [4, 6, 3, rgb(0, 0, 160), 0.8]],
          ["grayscale", 1],
          ["hue-rotate", Math.PI / 2],
          ["invert", 1],
          ["opacity", 0.4],
          ["saturate", 3],
          ["sepia", [1]],
        ];
        for (const [name, value] of filters) {
          tile((c) => {
            c.setFilter(name, value);
            c.drawImage(source, 8, 8, false, 1, null, true, 48, 48);
            c.setFilter(name, null);
            c.fillRect(44, 44, 16, 16, rgb(220, 120, 0));
          });
        }
        const cols = 8;
        const sheet = document.createElement("canvas");
        sheet.width = cols * 66;
        sheet.height = Math.ceil(tiles.length / cols) * 66;
        const ctx = sheet.getContext("2d") as CanvasRenderingContext2D;
        tiles.forEach((c, i) => {
          ctx.drawImage(c.getBitmap().getHTMLElement(), (i % cols) * 66, Math.floor(i / cols) * 66);
        });
        return sheet.toDataURL("image/png");
      },
    },
    {
      // Every blend mode as the operator of a fill over a gradient: the
      // canvas modes go straight to the 2D context, the WebGL-only ones
      // through GBlender's blend shader. Then every composite operator for
      // a sub-canvas drawn with drawCanvas.
      id: "corpus/matrix/blend-and-composite",
      covers: [
        "EDT-PAINT-003",
        "EDT-PAINT-004",
        "EDT-PAINT-005",
        "EDT-PAINT-025",
        "EDT-PAINT-046",
        "EDT-PAINT-047",
        "EDT-PAINT-048",
        "EDT-GL-001",
        "EDT-GL-011",
      ],
      kind: "png",
      args: { modes: BLEND_MODES },
      inPage: ({ G }, args) => {
        const { modes } = args as { modes: string[] };
        const C = G.GPaintCanvas;
        const rgb = (r: number, g: number, b: number) => new G.GRGBColor([r, g, b]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine canvas
        const tiles: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine canvas
        const background = (c: any) => {
          const g = new G.GLinearGradient(
            [
              { position: 0, color: rgb(255, 0, 0), opacity: 1 },
              { position: 0.5, color: rgb(255, 255, 0), opacity: 1 },
              { position: 1, color: rgb(0, 120, 255), opacity: 0.5 },
            ],
            1,
            0,
          );
          const p = c.createPatternPaint(g, new G.GRect(0, 0, 64, 64));
          c.putVertices(
            [new G.GPoint(0, 0), new G.GPoint(64, 0), new G.GPoint(64, 64), new G.GPoint(0, 64)],
            true,
          );
          const old = c.setTransform(c.getTransform(true).preMultiplied(p.transform));
          c.fillVertices(p.paint, 1, null, false);
          c.setTransform(old);
        };
        for (const mode of modes) {
          const c = new C(false, true);
          c.resize(64, 64);
          c.prepare();
          background(c);
          c.fillRect(12, 12, 40, 40, rgb(120, 60, 220), 0.9, mode);
          c.finish();
          tiles.push(c);
        }
        for (const op of Object.values(C.CompositeOperator) as string[]) {
          const c = new C(false, true);
          c.resize(64, 64);
          c.prepare();
          c.fillRect(4, 4, 40, 40, rgb(0, 150, 255));
          const top = new C(false, true);
          top.resize(64, 64);
          top.prepare();
          top.fillRect(20, 20, 40, 40, rgb(255, 60, 0), 0.8);
          top.finish();
          c.drawCanvas(top, 0, 0, 1, op);
          c.finish();
          tiles.push(c);
        }
        const cols = 7;
        const sheet = document.createElement("canvas");
        sheet.width = cols * 66;
        sheet.height = Math.ceil(tiles.length / cols) * 66;
        const ctx = sheet.getContext("2d") as CanvasRenderingContext2D;
        tiles.forEach((c, i) => {
          ctx.drawImage(c.getBitmap().getHTMLElement(), (i % cols) * 66, Math.floor(i / cols) * 66);
        });
        return sheet.toDataURL("image/png");
      },
    },
    {
      id: "corpus/matrix/canvas-geometry",
      covers: [
        "EDT-PAINT-012",
        "EDT-PAINT-018",
        "EDT-PAINT-019",
        "EDT-PAINT-020",
        "EDT-PAINT-021",
        "EDT-PAINT-022",
        "EDT-PAINT-040",
        "EDT-PAINT-052",
      ],
      kind: "json",
      inPage: ({ G }) => {
        const C = G.GPaintCanvas;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine rect
        const rect = (r: any) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine point
        const point = (p: any) => (p ? [p.getX(), p.getY()] : null);
        const c = new C(false, true);
        c.resize(200, 120);
        c.prepare([new G.GRect(10, 10, 50, 40), new G.GRect(100, 20, 300, 300)]);
        const areas = c.getAreas().map(rect);
        const clipped = c.isClipped();
        c.finish();
        const whole = new C(false, true);
        whole.resize(80, 60);
        whole.prepare([new G.GRect(0, 0, 80, 60)]);
        const wholeClipped = whole.isClipped();
        whole.finish();
        const masked = [];
        c.setMasked(true);
        masked.push(c.isMasked());
        c.setMasked(true);
        masked.push(c.isMasked());
        c.setMasked(false);
        masked.push(c.isMasked());
        c.setMasked(-1);
        masked.push(c.isMasked());
        c.setScale(1.5);
        c.setOrigin(new G.GPoint(7.3, -4.6));
        c.setOffset(new G.GPoint(3, 2));
        const extents = c.getPaintExtents(new G.GRect(-20.25, 10.5, 90.7, 200.1));
        const unclamped = c.getPaintExtents(new G.GRect(-20.25, 10.5, 90.7, 200.1), true);
        const padded = c.getPaintExtents(new G.GRect(10, 10, 20, 20), false, [4, 5, 6, 7]);
        const final = c.getFinalExtents(extents);
        const translate = c.getTranslateCorrection(
          new G.GPoint(10.37, -3.71),
          new G.GPoint(2.5, 0.25),
        );
        const boxUp = c.getScaleBoxCorrection(10.3, 4.6, 33.3, 21.7, 1.5, true);
        const boxDown = c.getScaleBoxCorrection(10.3, 4.6, 33.3, 21.7, 0.5, false);
        const transform = c.getTransform().toString();
        const raw = c.getTransform(true).toString();
        // Pixel hit tests on a drawn shape: inside, near the edge within the
        // tolerance, and too far away.
        const h = new C(false, true);
        h.resize(64, 64);
        // The view sets an offset on every canvas it hit-tests.
        h.setOffset(new G.GPoint(0, 0));
        h.prepare();
        h.fillRect(20, 20, 20, 10, new G.GRGBColor([10, 200, 30]), 0.5);
        h.finish();
        const hit = (x: number, y: number, t: number) => {
          const r = h.hitTest(new G.GPoint(x, y), t);
          return r
            ? {
                pixel: Array.from(r.data.pixel as ArrayLike<number>),
                location: point(r.data.location),
                same: r.element === h,
              }
            : null;
        };
        return {
          size: [c.getWidth(), c.getHeight()],
          areas,
          clipped,
          wholeClipped,
          masked,
          extents: rect(extents),
          unclamped: rect(unclamped),
          padded: rect(padded),
          final: rect(final),
          translate: point(translate),
          boxUp: rect(boxUp),
          boxDown: rect(boxDown),
          transform,
          raw,
          hits: [hit(25, 25, 0), hit(18, 24, 3), hit(43, 33, 3), hit(5, 5, 2), hit(60, 60, 1)],
        };
      },
    },
    {
      id: "corpus/matrix/bitmap-ops",
      covers: ["EDT-PAINT-049", "EDT-PAINT-050", "EDT-PAINT-051"],
      kind: "json",
      inPage: ({ G }) => {
        const src = document.createElement("canvas");
        src.width = 40;
        src.height = 30;
        const ctx = src.getContext("2d") as CanvasRenderingContext2D;
        ctx.fillStyle = "rgba(200, 40, 90, 0.75)";
        ctx.fillRect(6, 4, 20, 14);
        ctx.fillStyle = "#1080ff";
        ctx.fillRect(18, 12, 9, 11);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine bitmap
        const png = (b: any) => b.toImageDataUrl(G.GBitmap.ImageType.PNG);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine bitmap
        const state = (b: any) => ({
          size: [b.getWidth(), b.getHeight()],
          offset: [b.getOffset().getX(), b.getOffset().getY()],
          png: png(b),
        });
        const base = new G.GBitmap(src);
        const out: Record<string, unknown> = { base: state(base) };
        out.clone = state(base.clone());
        out.clonePart = state(base.clone(new G.GRect(5, 3, 12, 10)));
        out.cloneEmpty = base.clone(new G.GRect(0, 0, 0, 5));
        const resized = base.clone();
        resized.resize(60, 50, G.GRect.Side.CENTER);
        out.resizeCenter = state(resized);
        const resizedBR = base.clone();
        resizedBR.resize(30, 20, G.GRect.Side.BOTTOM_RIGHT);
        out.resizeBottomRight = state(resizedBR);
        const cropped = base.clone();
        cropped.crop(4, 2, 10, 8);
        out.crop = state(cropped);
        const trimmed = base.clone();
        trimmed.trim();
        out.trim = state(trimmed);
        out.pixels = [
          [0, 0],
          [10, 10],
          [20, 20],
          [100, -5],
        ].map(([x, y]) => Array.from(base.getPixelValue(x, y) as ArrayLike<number>));
        const modified = base.clone();
        modified.modifyPixels(
          (data: Uint8ClampedArray, w: number, hgt: number, arg: number) => {
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 255 - (data[i] ?? 0);
              data[i + 3] = Math.min(255, (data[i + 3] ?? 0) + arg);
            }
            return [w, hgt];
          },
          40,
          new G.GRect(0, 0, 20, 30),
        );
        out.modifyPixels = state(modified);
        const filtered = base.clone();
        filtered.applyFilter(
          {
            apply: (data: Uint8ClampedArray) => {
              for (let i = 0; i < data.length; i += 4) data[i + 1] = 255;
            },
          },
          null,
        );
        out.applyFilter = state(filtered);
        const dpi = base.clone();
        dpi.setDPI(144);
        out.jpeg = dpi.toImageDataUrl(G.GBitmap.ImageType.JPEG, 0.9);
        out.png144 = png(dpi);
        out.sized = state(new G.GBitmap(12, 7));
        return out;
      },
    },
  ]),
  { newApp: false },
);
