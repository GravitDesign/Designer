import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// Bitmap operations and bitmap-to-vector tracing on small synthetic images
// (pixels written directly, so nothing depends on canvas anti-aliasing).
const scenarios = defineScenarios([
  geo("bitmap/image-tracer", ["ENG-PATHOP-004"], (L, G) => {
    const w = 24;
    const h = 18;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let c = [255, 255, 255, 255];
        if (x >= 2 && x < 10 && y >= 3 && y < 12) c = [220, 30, 30, 255];
        if ((x - 16) * (x - 16) + (y - 9) * (y - 9) <= 25) c = [20, 40, 200, 255];
        if (x >= 5 && x < 7 && y >= 6 && y < 8) c = [255, 255, 255, 255];
        if (y === 15 && x > 2 && x < 21) c = [0, 0, 0, 255];
        data[i] = c[0] as number;
        data[i + 1] = c[1] as number;
        data[i + 2] = c[2] as number;
        data[i + 3] = c[3] as number;
      }
    }
    const img = { width: w, height: h, data };
    const options = [
      { numberofcolors: 4 },
      { numberofcolors: 4, ltres: 0.5, qtres: 0.5, pathomit: 0 },
      { numberofcolors: 2, colorsampling: false, colorquantcycles: 1 },
      { numberofcolors: 8, blurradius: 2, blurdelta: 30 },
      {},
    ];
    return {
      defaults: new G.GImageTracer().checkoptions({}),
      traces: options.map((o) =>
        L.run(() => new G.GImageTracer().imagedataToTracedata(img, { ...o })),
      ),
    };
  }),
  geo("bitmap/operations", ["ENG-GEOM-013"], (L, G) => {
    // Built on a plain canvas so the pixels are exact.
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 6;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const img = ctx.createImageData(8, 6);
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4;
        const inside = x >= 2 && x < 6 && y >= 1 && y < 4;
        img.data[i] = inside ? 200 : 0;
        img.data[i + 1] = x * 30;
        img.data[i + 2] = y * 40;
        img.data[i + 3] = inside ? 255 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    const bmp = new G.GBitmap(canvas);
    const pixels = (b: {
      getWidth(): number;
      getHeight(): number;
      getPixelValue(x: number, y: number): ArrayLike<number>;
    }) => {
      const out: number[][] = [];
      for (let y = 0; y < b.getHeight(); y++) {
        const row: number[] = [];
        for (let x = 0; x < b.getWidth(); x++) row.push(...Array.from(b.getPixelValue(x, y)));
        out.push(row);
      }
      return out;
    };
    const res: Record<string, unknown> = {
      types: G.GBitmap.ImageType,
      size: [bmp.getWidth(), bmp.getHeight()],
      offset: L.enc(bmp.getOffset()),
      pixels: pixels(bmp),
      clamped: [
        L.enc(Array.from(bmp.getPixelValue(-5, -5))),
        L.enc(Array.from(bmp.getPixelValue(100, 100))),
      ],
    };
    const clone = bmp.clone(new G.GRect(1, 1, 4, 3));
    res.clone = clone
      ? { size: [clone.getWidth(), clone.getHeight()], pixels: pixels(clone) }
      : null;
    res.cloneEmpty = bmp.clone(new G.GRect(0, 0, 0, 3));
    const modified = bmp.clone();
    modified.modifyPixels(
      (d: Uint8ClampedArray) => {
        for (let i = 0; i < d.length; i += 4) d[i + 1] = 255 - (d[i + 1] as number);
      },
      null,
      new G.GRect(0, 0, 4, 6),
    );
    res.modified = pixels(modified);
    const filtered = bmp.clone();
    filtered.applyFilter({ apply: (d: Uint8ClampedArray) => d.fill(7, 0, 8) });
    res.filtered = pixels(filtered);
    const trimmed = bmp.clone();
    trimmed.trim();
    res.trim = {
      size: [trimmed.getWidth(), trimmed.getHeight()],
      offset: L.enc(trimmed.getOffset()),
      pixels: pixels(trimmed),
    };
    const cropped = bmp.clone();
    cropped.crop(1, 2, 3, 1);
    res.crop = {
      size: [cropped.getWidth(), cropped.getHeight()],
      offset: L.enc(cropped.getOffset()),
    };
    res.resize = ["tl", "cc", "br", "tc", "rc"].map((side) => {
      const r = bmp.clone();
      r.resize(12, 4, side);
      return { side, size: [r.getWidth(), r.getHeight()], pixels: pixels(r) };
    });
    // PNG encoding of the bitmap's canvas (same browser in both apps).
    res.dataUrl = bmp.toImageDataUrl("image/png");
    res.element = bmp.getHTMLElement() === canvas;
    bmp.setDPI(144);
    res.toString = bmp.toString();
    return res;
  }),
  geo("bitmap/encode", ["ENG-GEOM-013"], async (_L, G) => {
    // toImageBuffer / toImageBlob: PNG and JPEG bytes at the default 72 DPI
    // and at other DPIs, which rewrite the PNG pHYs chunk and the JPEG JFIF
    // density. The bytes come from the browser's encoder (the same in both
    // apps); the DPI patching is the engine's.
    const canvas = document.createElement("canvas");
    canvas.width = 6;
    canvas.height = 4;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const img = ctx.createImageData(6, 4);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = (i * 7) % 256;
      img.data[i + 1] = (i * 13) % 256;
      img.data[i + 2] = 200;
      img.data[i + 3] = i % 8 ? 255 : 128;
    }
    ctx.putImageData(img, 0, 0);
    const bmp = new G.GBitmap(canvas);
    const base64 = (buf: ArrayBuffer) => {
      let bin = "";
      for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
      return btoa(bin);
    };
    const buffer = (type: string, quality: unknown, dpi: unknown) =>
      new Promise<string>((resolve) => {
        bmp.toImageBuffer(type, (b: ArrayBuffer) => resolve(base64(b)), quality, dpi);
      });
    const out: Record<string, unknown> = {};
    for (const [type, quality] of [
      ["image/png", undefined],
      ["png", undefined],
      ["image/jpeg", 0.9],
      ["jpg", 0.5],
    ] as const) {
      for (const dpi of [undefined, 72, 144, 300]) {
        out[`${type} q${String(quality)} dpi${String(dpi)}`] = await buffer(type, quality, dpi);
      }
    }
    // setDPI changes the DPI used when none is passed.
    bmp.setDPI(96);
    out["png after setDPI(96)"] = await buffer("image/png", undefined, undefined);
    out["jpeg after setDPI(96)"] = await buffer("image/jpeg", 0.9, undefined);
    return out;
  }),
]);

paritySuite("engine-geometry bitmap", scenarios, { newApp: false });
