import type { ParityHandle } from "../../support/scenario.ts";

/**
 * Elements a scenario starts with, built in the page through the G
 * namespace (public engine classes), so both apps build the same scene.
 * Coordinates are scene coordinates.
 */
export type ShapeSpec =
  | {
      type: "rect" | "ellipse";
      x: number;
      y: number;
      w: number;
      h: number;
      /** Solid fill colour; default keeps the inserted default style. */
      fill?: readonly [number, number, number];
      /** Adds a default drop shadow effect. */
      shadow?: boolean;
      name?: string;
      /** Rotation in degrees around the centre. */
      rotate?: number;
    }
  | {
      type: "polygon";
      cx: number;
      cy: number;
      r: number;
      points: number;
      /** Inner radius factor; 0 means a regular polygon (cos(pi/n)). */
      inner?: number;
      fill?: readonly [number, number, number];
    }
  | {
      type: "path";
      /** [x, y] or [x, y, hlx, hly, hrx, hry] per anchor point. */
      points: readonly (readonly number[])[];
      closed?: boolean;
      /** Anchor point type (tp) for all points, e.g. "TS" smooth. */
      tp?: string;
      fill?: readonly [number, number, number];
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      /** Fixed width; omitted means auto width. */
      w?: number;
    }
  | {
      type: "image";
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | { type: "group" | "layer"; children: readonly ShapeSpec[] }
  /** Compound path made of the given paths. */
  | { type: "compound"; children: readonly ShapeSpec[] };

export interface Fixture {
  shapes?: readonly ShapeSpec[];
  /** Indices into `shapes` to select at the end. */
  select?: readonly number[];
  /** Turns the active page into a fixed-size page at (0, 0). */
  page?: { w: number; h: number };
  /** Scene properties, e.g. { hgl: [100], gm: "box" }. */
  scene?: Record<string, unknown>;
  /** App settings set through app.setSetting before the shapes. */
  settings?: Record<string, unknown>;
  /** Editor options set through app.editorTools.setEditorOptions. */
  editorOptions?: Record<string, unknown>;
  /** Action ids executed after building. */
  actions?: readonly string[];
  /** Tool class name to activate at the end, e.g. "GRectangleTool". */
  tool?: string;
}

/**
 * Builds a fixture in the page. Sent as source text, so it must not use
 * anything from this module.
 */
export async function buildFixture({ G, app }: ParityHandle, spec: Fixture): Promise<void> {
  for (const [key, value] of Object.entries(spec.settings ?? {})) app.setSetting(key, value);
  if (spec.editorOptions) app.editorTools.setEditorOptions(spec.editorOptions);
  const scene = app.scene();
  for (const [key, value] of Object.entries(spec.scene ?? {})) scene.setProperty(key, value);
  if (spec.page) scene.getActivePage().setProperties(["w", "h"], [spec.page.w, spec.page.h]);

  // A 64 x 48 PNG with four coloured quadrants, drawn on a canvas.
  const imageUrl = (): string => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 48;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    const colours = ["#e53935", "#43a047", "#1e88e5", "#fdd835"];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = colours[i] as string;
      g.fillRect((i % 2) * 32, Math.floor(i / 2) * 24, 32, 24);
    }
    return c.toDataURL("image/png");
  };

  const setFill = (node: { getPaintLayers(): unknown }, fill?: readonly number[]): void => {
    if (!fill) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine object, loosely typed
    const layers = node.getPaintLayers() as any;
    for (let l = layers.getFirstChild(); l; l = l.getNext()) {
      if (l instanceof G.GStylable.FillPaintLayer) {
        l.setProperty("_pt", new G.GRGBColor([fill[0], fill[1], fill[2]]));
        return;
      }
    }
    const fl = new G.GStylable.FillPaintLayer();
    fl.setProperty("_pt", new G.GRGBColor([fill[0], fill[1], fill[2]]));
    layers.appendChild(fl);
  };

  const images: Promise<void>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const fills: [any, readonly number[]][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const shadows: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const make = (s: ShapeSpec): any => {
    const n = create(s);
    if ("fill" in s && s.fill) fills.push([n, s.fill]);
    if ("shadow" in s && s.shadow) shadows.push(n);
    return n;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
  const create = (s: ShapeSpec): any => {
    switch (s.type) {
      case "rect":
      case "ellipse": {
        const n = s.type === "rect" ? new G.GRectangle() : new G.GEllipse();
        let t = new G.GTransform(s.w / 2, 0, 0, s.h / 2, s.x + s.w / 2, s.y + s.h / 2);
        if (s.rotate) {
          const cx = s.x + s.w / 2;
          const cy = s.y + s.h / 2;
          t = t.multiplied(
            new G.GTransform()
              .translated(-cx, -cy)
              .rotated((s.rotate * Math.PI) / 180)
              .translated(cx, cy),
          );
        }
        n.setProperty("trf", t);
        if (s.name) n.setProperty("name", s.name);
        return n;
      }
      case "polygon": {
        const n = new G.GPolygon();
        const inner = s.inner ? s.r * s.inner : s.r * Math.cos(Math.PI / s.points);
        n.setProperties(
          ["pts", "cx", "cy", "or", "ir", "oa", "ia"],
          [s.points, s.cx, s.cy, s.r, inner, -Math.PI / 2, -Math.PI / 2 + Math.PI / s.points],
        );
        return n;
      }
      case "path": {
        const n = new G.GPath(!!s.closed);
        const aps = n.getAnchorPoints();
        for (const p of s.points) {
          const ap = new G.GPathBase.AnchorPoint();
          ap.setProperties(["x", "y"], [p[0], p[1]]);
          if (p.length >= 6) {
            ap.setProperties(["hlx", "hly", "hrx", "hry"], [p[2], p[3], p[4], p[5]]);
          }
          if (s.tp) ap.setProperty("tp", s.tp);
          aps.appendChild(ap);
        }
        return n;
      }
      case "text": {
        const n = new G.GText();
        n.setProperties(["aw", "ah"], [s.w === undefined, true]);
        n.setText(s.text, 1, 1);
        // Same as the text tool: a fixed width comes from mapping the unit
        // source box, which also places the text.
        if (s.w === undefined) n.setProperty("trf", new G.GTransform(1, 0, 0, 1, s.x, s.y));
        else n.transformSourceBBox(new G.GTransform(s.w, 0, 0, 1, s.x, s.y), true, false);
        return n;
      }
      case "image": {
        const n = new G.GImage();
        // Like a placed image: frame (trf) and content (itrf) transforms
        // are equal; without itrf the image content can't be hit.
        const t = new G.GTransform(s.w / 64, 0, 0, s.h / 48, s.x, s.y);
        n.setProperties(["trf", "itrf"], [t, t]);
        images.push(
          new Promise<void>((resolve) => {
            let tries = 0;
            const check = (): void => {
              tries++;
              if (n.getStatus && !n.getStatus()) resolve();
              else if (tries > 100) resolve();
              else setTimeout(check, 20);
            };
            n.setProperty("url", imageUrl());
            setTimeout(check, 20);
          }),
        );
        return n;
      }
      case "compound": {
        const n = new G.GCompoundPath();
        for (const c of s.children) n.getPaths().appendChild(make(c));
        return n;
      }
      case "group":
      case "layer": {
        // Children don't get the default style from insertElements; they
        // keep the shape's own defaults plus the requested fill.
        const g = s.type === "group" ? new G.GGroup() : new G.GLayer();
        for (const c of s.children) g.appendChild(make(c));
        return g;
      }
    }
  };

  const nodes = (spec.shapes ?? []).map((s) => make(s));
  if (nodes.length > 0) {
    app.editor().insertElements(nodes);
    // insertElements applies the default style; colours go on afterwards.
    for (const [node, fill] of fills) setFill(node, fill);
    for (const node of shadows) node.getEffects().appendChild(new G.GDropShadowEffect());
  }
  await Promise.all(images);
  app.editor().clearSelection();
  if (spec.select && spec.select.length > 0) {
    app.editor().updateSelection(
      false,
      spec.select.map((i) => nodes[i]),
    );
  }
  for (const id of spec.actions ?? []) app.execute(id);
  if (spec.tool) app.activateTool(spec.tool);
}
