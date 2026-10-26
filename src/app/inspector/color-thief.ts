// Old: designer.browser.dev.js module 1267 (Color Thief v2 by Lokesh Dhakar, MIT, with its MMCQ quantizer).
/**
 * Extracts the dominant colour and a palette of an image (the image
 * panel's "Colors" button). The image is drawn into a temporary canvas
 * appended to body, every 10th opaque, not-white pixel is sampled, and
 * the samples go through the modified median cut quantizer (MMCQ).
 *
 * The quantizer is kept as it was: every iteration order and comparison
 * is the original one, because the palette the panel shows depends on it.
 * Only the bounding box of the samples is fixed: the old one used "else
 * if" for the maxima, so a channel's maximum was only raised by samples
 * that didn't lower its minimum (BUG-155).
 *
 * Left out: forcebw (never called, and it called sort on the queue
 * object, which has none) and the URL and XHR helpers (getColorFromUrl,
 * getImageData, getColorAsync) and CanvasImage.clear and update, which
 * nothing used.
 *
 * A canvas whose getImageData throws (a tainted or zero-size image) stays
 * in body, as in the old code: see "Color Thief leaves its canvas in body
 * when sampling throws" in QUESTIONS.md.
 */

/** An RGB triple. */
export type RGB = [number, number, number];

/** The 5-bit histogram, indexed by colorIndex; holes are zero. */
type Histogram = (number | undefined)[];

const SIGBITS = 5;
const RSHIFT = 8 - SIGBITS;
const MAX_ITERATIONS = 1000;
const FRACT_BY_POPULATIONS = 0.75;

function naturalOrder(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function colorIndex(r: number, g: number, b: number): number {
  return (r << (2 * SIGBITS)) + (g << SIGBITS) + b;
}

/** A priority queue that sorts lazily on peek and pop (the old PQueue). */
class PQueue<T> {
  private _contents: T[] = [];
  private _sorted = false;

  constructor(private readonly _comparator: (a: T, b: T) => number) {}

  private _sort(): void {
    this._contents.sort(this._comparator);
    this._sorted = true;
  }

  push(item: T): void {
    this._contents.push(item);
    this._sorted = false;
  }

  peek(index?: number): T {
    if (!this._sorted) this._sort();
    if (index === undefined) index = this._contents.length - 1;
    return this._contents[index] as T;
  }

  pop(): T | undefined {
    if (!this._sorted) this._sort();
    return this._contents.pop();
  }

  size(): number {
    return this._contents.length;
  }

  map<U>(fn: (item: T) => U): U[] {
    return this._contents.map(fn);
  }

  debug(): T[] {
    if (!this._sorted) this._sort();
    return this._contents;
  }
}

type Dimension = "r" | "g" | "b";

/** A box in the 5-bit colour space with its histogram. */
export class VBox {
  _volume: number | undefined;
  _count: number | undefined;
  _count_set = false;
  _avg: RGB | undefined;

  constructor(
    public r1: number,
    public r2: number,
    public g1: number,
    public g2: number,
    public b1: number,
    public b2: number,
    public histo: Histogram,
  ) {}

  volume(force?: boolean): number {
    if (!this._volume || force)
      this._volume = (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
    return this._volume;
  }

  count(force?: boolean): number {
    const histo = this.histo;
    if (!this._count_set || force) {
      let npix = 0;
      for (let i = this.r1; i <= this.r2; i++)
        for (let j = this.g1; j <= this.g2; j++)
          for (let k = this.b1; k <= this.b2; k++) npix += histo[colorIndex(i, j, k)] || 0;
      this._count = npix;
      this._count_set = true;
    }
    return this._count as number;
  }

  copy(): VBox {
    return new VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
  }

  avg(force?: boolean): RGB {
    const histo = this.histo;
    if (!this._avg || force) {
      let ntot = 0;
      const mult = 1 << (8 - SIGBITS);
      let rsum = 0;
      let gsum = 0;
      let bsum = 0;
      for (let i = this.r1; i <= this.r2; i++)
        for (let j = this.g1; j <= this.g2; j++)
          for (let k = this.b1; k <= this.b2; k++) {
            const hval = histo[colorIndex(i, j, k)] || 0;
            ntot += hval;
            rsum += hval * (i + 0.5) * mult;
            gsum += hval * (j + 0.5) * mult;
            bsum += hval * (k + 0.5) * mult;
          }
      this._avg = ntot
        ? [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)]
        : [
            ~~((mult * (this.r1 + this.r2 + 1)) / 2),
            ~~((mult * (this.g1 + this.g2 + 1)) / 2),
            ~~((mult * (this.b1 + this.b2 + 1)) / 2),
          ];
    }
    return this._avg;
  }

  contains(pixel: readonly number[]): boolean {
    const r = (pixel[0] as number) >> RSHIFT;
    const g = (pixel[1] as number) >> RSHIFT;
    const b = (pixel[2] as number) >> RSHIFT;
    return (
      r >= this.r1 && r <= this.r2 && g >= this.g1 && g <= this.g2 && b >= this.b1 && b <= this.b2
    );
  }
}

interface CMapEntry {
  vbox: VBox;
  color: RGB;
}

/** The colour map the quantizer returns. */
export class CMap {
  vboxes = new PQueue<CMapEntry>((a, b) =>
    naturalOrder(a.vbox.count() * a.vbox.volume(), b.vbox.count() * b.vbox.volume()),
  );

  push(vbox: VBox): void {
    this.vboxes.push({ vbox, color: vbox.avg() });
  }

  palette(): RGB[] {
    return this.vboxes.map((entry) => entry.color);
  }

  size(): number {
    return this.vboxes.size();
  }

  map(color: readonly number[]): RGB | undefined {
    const vboxes = this.vboxes;
    for (let i = 0; i < vboxes.size(); i++)
      if (vboxes.peek(i).vbox.contains(color)) return vboxes.peek(i).color;
    return this.nearest(color);
  }

  nearest(color: readonly number[]): RGB | undefined {
    const vboxes = this.vboxes;
    let d1: number | undefined;
    let pColor: RGB | undefined;
    for (let i = 0; i < vboxes.size(); i++) {
      const c = vboxes.peek(i).color;
      const d2 = Math.sqrt(
        Math.pow((color[0] as number) - c[0], 2) +
          Math.pow((color[1] as number) - c[1], 2) +
          Math.pow((color[2] as number) - c[2], 2),
      );
      if (d2 < (d1 as number) || d1 === undefined) {
        d1 = d2;
        pColor = c;
      }
    }
    return pColor;
  }
}

function getHisto(pixels: readonly RGB[]): Histogram {
  const histo: Histogram = new Array(1 << (3 * SIGBITS));
  for (const pixel of pixels) {
    const index = colorIndex(pixel[0] >> RSHIFT, pixel[1] >> RSHIFT, pixel[2] >> RSHIFT);
    histo[index] = (histo[index] || 0) + 1;
  }
  return histo;
}

function vboxFromPixels(pixels: readonly RGB[], histo: Histogram): VBox {
  let rmin = 1e6;
  let rmax = 0;
  let gmin = 1e6;
  let gmax = 0;
  let bmin = 1e6;
  let bmax = 0;
  for (const pixel of pixels) {
    const rval = pixel[0] >> RSHIFT;
    const gval = pixel[1] >> RSHIFT;
    const bval = pixel[2] >> RSHIFT;
    // The old code raised a maximum only for samples that didn't lower the
    // minimum ("else if"), so the boxes came out too small (BUG-155).
    if (rval < rmin) rmin = rval;
    if (rval > rmax) rmax = rval;
    if (gval < gmin) gmin = gval;
    if (gval > gmax) gmax = gval;
    if (bval < bmin) bmin = bval;
    if (bval > bmax) bmax = bval;
  }
  return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
}

function medianCutApply(histo: Histogram, vbox: VBox): VBox[] | undefined {
  if (!vbox.count()) return undefined;
  const rw = vbox.r2 - vbox.r1 + 1;
  const gw = vbox.g2 - vbox.g1 + 1;
  const bw = vbox.b2 - vbox.b1 + 1;
  const maxw = Math.max.apply(null, [rw, gw, bw]);
  if (1 == vbox.count()) return [vbox.copy()];
  let total = 0;
  const partialsum: number[] = [];
  const lookaheadsum: number[] = [];
  let i: number;
  let j: number;
  let k: number;
  let sumOf: number;
  if (maxw == rw)
    for (i = vbox.r1; i <= vbox.r2; i++) {
      sumOf = 0;
      for (j = vbox.g1; j <= vbox.g2; j++)
        for (k = vbox.b1; k <= vbox.b2; k++) sumOf += histo[colorIndex(i, j, k)] || 0;
      total += sumOf;
      partialsum[i] = total;
    }
  else if (maxw == gw)
    for (i = vbox.g1; i <= vbox.g2; i++) {
      sumOf = 0;
      for (j = vbox.r1; j <= vbox.r2; j++)
        for (k = vbox.b1; k <= vbox.b2; k++) sumOf += histo[colorIndex(j, i, k)] || 0;
      total += sumOf;
      partialsum[i] = total;
    }
  else
    for (i = vbox.b1; i <= vbox.b2; i++) {
      sumOf = 0;
      for (j = vbox.r1; j <= vbox.r2; j++)
        for (k = vbox.g1; k <= vbox.g2; k++) sumOf += histo[colorIndex(j, k, i)] || 0;
      total += sumOf;
      partialsum[i] = total;
    }
  partialsum.forEach((d, index) => {
    lookaheadsum[index] = total - d;
  });

  const doCut = (color: Dimension): VBox[] | undefined => {
    const dim1 = (color + "1") as "r1" | "g1" | "b1";
    const dim2 = (color + "2") as "r2" | "g2" | "b2";
    for (i = vbox[dim1]; i <= vbox[dim2]; i++)
      if ((partialsum[i] as number) > total / 2) {
        const vbox1 = vbox.copy();
        const vbox2 = vbox.copy();
        const left = i - vbox[dim1];
        const right = vbox[dim2] - i;
        let d2 =
          left <= right
            ? Math.min(vbox[dim2] - 1, ~~(i + right / 2))
            : Math.max(vbox[dim1], ~~(i - 1 - left / 2));
        while (!partialsum[d2]) d2++;
        let count2 = lookaheadsum[d2] as number;
        while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2] as number;
        vbox1[dim2] = d2;
        vbox2[dim1] = vbox1[dim2] + 1;
        return [vbox1, vbox2];
      }
    return undefined;
  };
  return doCut(maxw == rw ? "r" : maxw == gw ? "g" : "b");
}

/** MMCQ.quantize: a colour map of at most `maxcolors` colours, or false for bad input. */
export function quantize(pixels: readonly RGB[], maxcolors: number): CMap | false | undefined {
  if (!pixels.length || maxcolors < 2 || maxcolors > 256) return false;
  const histo = getHisto(pixels);
  const vbox = vboxFromPixels(pixels, histo);
  const pq = new PQueue<VBox>((a, b) => naturalOrder(a.count(), b.count()));
  pq.push(vbox);

  const iter = (lh: PQueue<VBox>, target: number): void => {
    let ncolors = 1;
    let niters = 0;
    while (niters < MAX_ITERATIONS) {
      const box = lh.pop() as VBox;
      if (box.count()) {
        const vboxes = medianCutApply(histo, box) as VBox[];
        const vbox1 = vboxes[0];
        const vbox2 = vboxes[1];
        if (!vbox1) return;
        lh.push(vbox1);
        if (vbox2) {
          lh.push(vbox2);
          ncolors++;
        }
        if (ncolors >= target) return;
        if (niters++ > MAX_ITERATIONS) return;
      } else {
        lh.push(box);
        niters++;
      }
    }
  };

  iter(pq, FRACT_BY_POPULATIONS * maxcolors);
  const pq2 = new PQueue<VBox>((a, b) =>
    naturalOrder(a.count() * a.volume(), b.count() * b.volume()),
  );
  while (pq.size()) pq2.push(pq.pop() as VBox);
  iter(pq2, maxcolors - pq2.size());
  const cmap = new CMap();
  while (pq2.size()) cmap.push(pq2.pop() as VBox);
  return cmap;
}

/** The samples getPalette takes: every `quality`-th pixel that is opaque enough and not white. */
export function samplePixels(data: ArrayLike<number>, pixelCount: number, quality: number): RGB[] {
  const pixels: RGB[] = [];
  for (let i = 0; i < pixelCount; i += quality) {
    const offset = 4 * i;
    const r = data[offset + 0] as number;
    const g = data[offset + 1] as number;
    const b = data[offset + 2] as number;
    const a = data[offset + 3] as number;
    if (a >= 125 && !(r > 250 && g > 250 && b > 250)) pixels.push([r, g, b]);
  }
  return pixels;
}

/** What can be drawn into the sampling canvas. */
export type ColorThiefSource = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

/** The temporary canvas of the old CanvasImage, appended to body while sampling. */
class CanvasImage {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;

  constructor(image: ColorThiefSource) {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    document.body.appendChild(this.canvas);
    this.width = this.canvas.width = image.width;
    this.height = this.canvas.height = image.height;
    this.context.drawImage(image, 0, 0, this.width, this.height);
  }

  getPixelCount(): number {
    return this.width * this.height;
  }

  getImageData(): ImageData {
    return this.context.getImageData(0, 0, this.width, this.height);
  }

  removeCanvas(): void {
    (this.canvas.parentNode as Node).removeChild(this.canvas);
  }
}

export class ColorThief {
  /** The dominant colour: the first entry of a 5-colour palette (throws when there is none). */
  getColor(source: ColorThiefSource, quality?: number): RGB {
    return (this.getPalette(source, 5, quality) as RGB[])[0] as RGB;
  }

  /** A palette of about `colorCount` colours (2 to 256, default 10), or null. */
  getPalette(source: ColorThiefSource, colorCount?: number, quality?: number): RGB[] | null {
    if (colorCount === undefined || colorCount < 2 || colorCount > 256) colorCount = 10;
    if (quality === undefined || quality < 1) quality = 10;
    const image = new CanvasImage(source);
    const pixels = samplePixels(image.getImageData().data, image.getPixelCount(), quality);
    const cmap = quantize(pixels, colorCount);
    const palette = cmap ? cmap.palette() : null;
    image.removeCanvas();
    return palette;
  }
}
