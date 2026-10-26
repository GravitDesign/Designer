// Generated inputs for the benchmark. The corpus and the import fixtures
// are small (the largest .gvdesign is 79 KB), so the heavy cases use
// documents and files made here. Everything is deterministic: the same
// seed gives the same shapes on every run.

/** A small seeded random generator (mulberry32). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An SVG with `count` paths, rects, circles and texts, some grouped and gradient-filled. */
export function bigSvg(count: number): string {
  const r = random(7);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="3000" viewBox="0 0 4000 3000">`,
    `<defs>`,
  ];
  for (let g = 0; g < 20; g++) {
    parts.push(
      `<linearGradient id="g${g}" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="hsl(${g * 18},70%,50%)"/>` +
        `<stop offset="1" stop-color="hsl(${g * 18 + 120},70%,60%)"/></linearGradient>`,
    );
  }
  parts.push(`</defs>`);
  for (let i = 0; i < count; i++) {
    if (i % 50 === 0) parts.push(i ? `</g><g id="grp${i}">` : `<g id="grp0">`);
    const x = (r() * 3900).toFixed(1);
    const y = (r() * 2900).toFixed(1);
    const fill = r() < 0.3 ? `url(#g${i % 20})` : `hsl(${Math.floor(r() * 360)},60%,55%)`;
    const kind = i % 4;
    if (kind === 0) {
      let d = `M${x} ${y}`;
      for (let k = 0; k < 6; k++) {
        d += ` C${(+x + r() * 80).toFixed(1)} ${(+y + r() * 80).toFixed(1)} ${(+x + r() * 80).toFixed(1)} ${(+y + r() * 80).toFixed(1)} ${(+x + r() * 80).toFixed(1)} ${(+y + r() * 80).toFixed(1)}`;
      }
      parts.push(`<path d="${d} Z" fill="${fill}" stroke="#222" stroke-width="1"/>`);
    } else if (kind === 1) {
      parts.push(
        `<rect x="${x}" y="${y}" width="${(20 + r() * 60).toFixed(1)}" height="${(20 + r() * 60).toFixed(1)}" rx="4" fill="${fill}"/>`,
      );
    } else if (kind === 2) {
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${(5 + r() * 30).toFixed(1)}" fill="${fill}" opacity="0.8"/>`,
      );
    } else {
      parts.push(
        `<text x="${x}" y="${y}" font-family="Open Sans" font-size="14" fill="#333">Label ${i}</text>`,
      );
    }
  }
  parts.push(`</g></svg>`);
  return parts.join("\n");
}

/** An EPS with `count` filled and stroked curves in many colours. */
export function bigEps(count: number): string {
  const r = random(11);
  const lines = ["%!PS-Adobe-3.0 EPSF-3.0", "%%BoundingBox: 0 0 2000 1500", "%%EndComments"];
  for (let i = 0; i < count; i++) {
    const x = r() * 1950;
    const y = r() * 1450;
    lines.push(`${r().toFixed(3)} ${r().toFixed(3)} ${r().toFixed(3)} setrgbcolor`);
    let path = `newpath ${x.toFixed(1)} ${y.toFixed(1)} moveto`;
    for (let k = 0; k < 4; k++) {
      path += ` ${(x + r() * 60).toFixed(1)} ${(y + r() * 60).toFixed(1)} ${(x + r() * 60).toFixed(1)} ${(y + r() * 60).toFixed(1)} ${(x + r() * 60).toFixed(1)} ${(y + r() * 60).toFixed(1)} curveto`;
    }
    lines.push(`${path} closepath gsave fill grestore 0 setgray 0.5 setlinewidth stroke`);
  }
  lines.push("showpage", "%%EOF");
  return lines.join("\n") + "\n";
}

export interface HeavySpec {
  /** Number of shapes. */
  count: number;
  /** Every n-th shape gets a drop shadow (0 = none). */
  shadowEvery: number;
  /** Page size; the shapes are spread over it. */
  page: { w: number; h: number };
  /** Size of the group that the drag case moves. */
  groupSize: number;
}

export const HEAVY: HeavySpec = {
  count: 3000,
  shadowEvery: 10,
  page: { w: 4000, h: 3000 },
  groupSize: 200,
};

/**
 * Builds the heavy document in the page (sent as source text): shapes on
 * the active page of the active document, a group of `groupSize` of them
 * near the top-left, and a long text. Returns the number of nodes.
 */
export function buildHeavy(spec: HeavySpec): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine through the untyped G namespace
  const { G, app } = (window as any).__parity;
  let seed = 3;
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const scene = app.scene();
  const page = scene.getActivePage();
  page.setProperties(["w", "h"], [spec.page.w, spec.page.h]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const nodes: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const shadowed: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const fills: [any, number[]][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const groupKids: any[] = [];
  for (let i = 0; i < spec.count; i++) {
    const inGroup = i < spec.groupSize;
    const x = inGroup ? 100 + rnd() * 600 : rnd() * (spec.page.w - 100);
    const y = inGroup ? 100 + rnd() * 400 : rnd() * (spec.page.h - 100);
    const w = 20 + rnd() * 80;
    const h = 20 + rnd() * 80;
    const kind = i % 4;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine node
    let n: any;
    if (kind === 0 || kind === 1) {
      n = kind === 0 ? new G.GRectangle() : new G.GEllipse();
      n.setProperty("trf", new G.GTransform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
    } else if (kind === 2) {
      n = new G.GPolygon();
      const r = w / 2;
      n.setProperties(
        ["pts", "cx", "cy", "or", "ir", "oa", "ia"],
        [5, x + r, y + r, r, r * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI / 5],
      );
    } else {
      n = new G.GPath(true);
      const aps = n.getAnchorPoints();
      for (let k = 0; k < 6; k++) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x + rnd() * w, y + rnd() * h]);
        aps.appendChild(ap);
      }
    }
    fills.push([n, [Math.floor(rnd() * 255), Math.floor(rnd() * 255), Math.floor(rnd() * 255)]]);
    if (spec.shadowEvery && i % spec.shadowEvery === 0) shadowed.push(n);
    if (inGroup) groupKids.push(n);
    else nodes.push(n);
  }
  const group = new G.GGroup();
  for (const kid of groupKids) group.appendChild(kid);
  group.setProperty("name", "bench-group");
  app.editor().insertElements([group, ...nodes]);
  for (const [n, c] of fills) {
    const layers = n.getPaintLayers();
    let done = false;
    for (let l = layers.getFirstChild(); l; l = l.getNext()) {
      if (l instanceof G.GStylable.FillPaintLayer) {
        l.setProperty("_pt", new G.GRGBColor(c));
        done = true;
        break;
      }
    }
    if (!done) {
      const fl = new G.GStylable.FillPaintLayer();
      fl.setProperty("_pt", new G.GRGBColor(c));
      layers.appendChild(fl);
    }
  }
  for (const n of shadowed) n.getEffects().appendChild(new G.GDropShadowEffect());
  app.editor().clearSelection();
  let total = 0;
  scene.acceptChildren(() => {
    total++;
  });
  return total;
}

/** A long text: `paragraphs` paragraphs of lorem ipsum, about 60 words each. */
export function longText(paragraphs: number): string {
  const words =
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(
      " ",
    );
  const r = random(5);
  const out: string[] = [];
  for (let p = 0; p < paragraphs; p++) {
    const line: string[] = [];
    for (let i = 0; i < 60; i++) line.push(words[Math.floor(r() * words.length)] as string);
    out.push(line.join(" ") + ".");
  }
  return out.join("\n");
}
