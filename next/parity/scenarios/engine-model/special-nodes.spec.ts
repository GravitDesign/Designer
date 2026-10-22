import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Node types with their own behaviour: compound paths and shapes,
// connectors, image grids, images, ready shapes (parameterized vertex
// processor), annotations and comments, and a paths graph drawn with the
// paths-graph tool.

/** A ready-shape definition in the catalogue format (see ADD-TOOL-001). */
const READY_SHAPE = {
  name: "Test Triangle",
  annotations: {
    name: "annot",
    annotList: [{ x0: -0.5, y0: -1, X: "x", Y: -1, minX: -0.9, maxX: 0.9 }],
  },
  parameters: [
    { name: "px", expression: "annot[0].X" },
    { name: "py", expression: "min(1, abs(annot[0].X) + 0.5)" },
  ],
  // [command, (coordType, value) x 2] ...; coordType 1 = number, 2 = expression
  vertices: [1, 2, "px", 1, -1, 2, 1, 1, 2, "py", 2, 1, -1, 1, 1, 5],
};

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/special/compound-path-and-shape",
    covers: [
      "ENG-NODE-026",
      "ENG-NODE-027",
      "ENG-FILL-004",
      "ENG-SER-008",
      "ENG-SER-017",
      "ENG-NODE-020",
    ],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const sub = (pts: number[][], closed = true) => {
        const q = new G.GPath();
        for (const [x, y] of pts) {
          const ap = new G.GPathBase.AnchorPoint();
          ap.setProperties(["x", "y"], [x, y]);
          q.getAnchorPoints().appendChild(ap);
        }
        q.setProperty("closed", closed);
        return q;
      };
      const cp = new G.GCompoundPath();
      cp.getPaths().appendChild(
        sub([
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
        ]),
      );
      cp.getPaths().appendChild(
        sub([
          [25, 25],
          [75, 25],
          [75, 75],
          [25, 75],
        ]),
      );
      const out: Record<string, unknown> = {
        compoundPath: {
          verts: H.verts(cp),
          boxes: H.boxes(cp),
          evenodd: cp.getProperty("evenodd"),
          blob: H.blob(cp),
          pathsKids: H.kids(cp.getPaths()),
        },
      };
      out.compoundPathRoundTrip = H.blob(G.GNode.deserialize(H.ser(cp)));
      // Live booleans: OR 1, XOR 2, AND 3, SUB 4 (the role of each child).
      for (const [k, bool] of [
        ["or", 1],
        ["xor", 2],
        ["and", 3],
        ["sub", 4],
      ] as const) {
        const cs = new G.GCompoundShape();
        cs.appendChild(H.rect(0, 0, 100, 100));
        const e = H.ellipse(50, 50, 100, 100);
        e.setProperty("bool", bool);
        cs.appendChild(e);
        out["compoundShape-" + k] = { verts: H.verts(cs), boxes: H.boxes(cs) };
      }
      const cs = new G.GCompoundShape();
      cs.appendChild(H.rect(0, 0, 100, 100));
      cs.appendChild(H.ellipse(20, 20, 40, 40));
      out.compoundShapeBlob = H.blob(cs);
      // Without "evenodd" in the blob, the vertices are recomputed on load.
      const legacy = H.blob(cs);
      delete legacy.evenodd;
      out.compoundShapeLegacy = H.attempt(() => {
        const n = G.GNode.deserialize(JSON.stringify(legacy));
        return { verts: H.verts(n).length, evenodd: n.getProperty("evenodd") };
      });
      return out;
    }),
  },
  {
    id: "engine-model/special/connector",
    covers: ["ENG-NODE-041", "ENG-SCENE-008"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const a = H.add(H.rect(0, 0, 50, 50));
      const b = H.add(H.rect(200, 100, 50, 50));
      const c = new G.GConnector();
      for (const [x, y] of [
        [0, 0],
        [1, 1],
      ]) {
        const ap = new G.GPathBase.AnchorPoint();
        ap.setProperties(["x", "y"], [x, y]);
        c.getAnchorPoints().appendChild(ap);
      }
      H.add(c);
      c.connect(a, b);
      const anchors = () =>
        (c.getAnchorPoints().getChildren() as unknown[]).map((p) => H.props(p, ["x", "y", "tp"]));
      const out: Record<string, unknown> = {
        anchors: anchors(),
        boxes: H.boxes(c),
        linked: [s.isLinked(a), s.isLinked(b)],
      };
      b.transform(H.T(1, 0, 0, 1, 0, 200));
      H.attempt(() => c.relayout());
      out.afterMove = anchors();
      a.transform(H.T(1, 0, 0, 1, 300, 0));
      H.attempt(() => c.relayout());
      out.afterMoveSource = anchors();
      out.blob = H.blob(c);
      return out;
    }),
  },
  {
    id: "engine-model/special/image-grid",
    covers: ["ENG-NODE-042"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const ig = new G.GImageGrid();
      ig.setProperty("trf", H.T(100, 0, 0, 100, 100, 100));
      H.add(ig);
      const out: Record<string, unknown> = {
        defaults: H.props(ig, ["grid", "im", "mg", "off"]),
        boxes: H.boxes(ig),
        verts: H.verts(ig).length,
      };
      ig.setProperty("grid", [
        [
          [0.5, 0.5],
          [0.5, 0.5],
        ],
        [[1, 0.5]],
      ]);
      out.customGrid = { verts: H.verts(ig), boxes: H.boxes(ig) };
      const img = new G.GImage();
      img.setProperty("trf", H.T(10, 0, 0, 10, 50, 50));
      H.attempt(() => ig.addImage(img, new G.GRect(40, 40, 20, 20)));
      out.afterAdd = H.props(ig, ["off"]);
      out.imageCount = H.attempt(
        () => (ig.getProperty("im") || []).filter((x: unknown) => !!x).length,
      );
      ig.setProperty("mg", 0.3);
      out.margin = { verts: H.verts(ig).slice(0, 12) };
      out.blob = H.blob(ig);
      return out;
    }),
  },
  {
    id: "engine-model/special/image",
    covers: ["ENG-NODE-034", "ENG-EVENT-011", "ENG-PATTERN-005"],
    kind: "json",
    inPage: withHelpers(async (_p, _a, H) => {
      const G = H.G;
      // A 3 x 2 PNG drawn in the page.
      const cv = document.createElement("canvas");
      cv.width = 3;
      cv.height = 2;
      const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 3, 2);
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(1, 0, 1, 1);
      const url = cv.toDataURL("image/png");
      const img = new G.GImage();
      img.setProperty("trf", H.T(50, 0, 0, 50, 50, 50));
      H.add(img);
      const statuses: unknown[] = [];
      img.addEventListener(G.GImage.StatusEvent, (e: { status: unknown }) =>
        statuses.push(e.status),
      );
      img.setProperty("url", url);
      for (
        let i = 0;
        i < 300 && img.getStatus() !== null && img.getStatus() !== G.GImage.ImageStatus.Error;
        i++
      )
        await H.frame();
      const blob = H.blob(img);
      const out: Record<string, unknown> = {
        statuses,
        status: img.getStatus(),
        size: H.props(img, ["iw", "ih", "px", "py", "pw", "ph", "itrf", "dblMode", "ipfc"]),
        boxes: H.boxes(img),
        urlIsDictionary: typeof blob.url === "string" ? blob.url.split(":")[0] : blob.url,
        blobKeys: Object.keys(blob),
      };
      H.attempt(() => img.toFit(true));
      out.toFit = { trf: H.v(img.getProperty("trf")), itrf: H.v(img.getProperty("itrf")) };
      img.setProperty("dblMode", true);
      img.setProperty("itrf", H.T(2, 0, 0, 2, 0, 0));
      out.doubleMode = { boxes: H.boxes(img), props: H.props(img, ["itrf", "dblMode"]) };
      // Corner radii apply because GImage is a GRectangle.
      img.setProperties(["tl_sx", "tl_sy"], [10, 10]);
      out.rounded = H.verts(img).length;
      out.constants = {
        noImage: [
          G.GImage.NO_IMAGE_WIDTH,
          G.GImage.NO_IMAGE_HEIGHT,
          H.v(G.GImage.NO_IMAGE_BACKGROUND),
        ],
      };
      return out;
    }),
  },
  {
    id: "engine-model/special/image-cmyk-jpeg",
    covers: ["ENG-NODE-035", "ENG-NODE-034"],
    kind: "json",
    // An 8 x 6 CMYK JPEG (made with Pillow: cyan rising left to right,
    // magenta top to bottom, yellow on the right half, black on the bottom
    // half) and a plain RGB JPEG for comparison.
    args: {
      cmyk: "data:image/jpeg;base64,/9j/7gAOQWRvYmUAZAAAAAAA/9sAQwACAQEBAQECAQEBAgICAgIEAwICAgIFBAQDBAYFBgYGBQYGBgcJCAYHCQcGBggLCAkKCgoKCgYICwwLCgwJCgoK/8AAFAgABgAIBEMRAE0RAFkRAEsRAP/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAA4EQwBNAFkASwAAPwDvP+Dkf/mP/wDbX+tWP+Ijv4/f88NU/wDAhf8A4qm/8Hzn/Nrv/c7f+4Cv1c/4bW+Kn/QA8P8A/gLP/wDHq//Z",
      rgb: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAAGAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC5RRRX5Gf5Tn//2Q==",
    },
    inPage: withHelpers(async (_p, a: { cmyk: string; rgb: string }, H) => {
      const G = H.G;
      const I = G.GImage;
      const load = async (url: string) => {
        const img = new I();
        const converts: unknown[] = [];
        const statuses: unknown[] = [];
        img.addEventListener(I.ConvertStatusEvent, (e: { status: unknown }) =>
          converts.push(e.status),
        );
        img.addEventListener(I.StatusEvent, (e: { status: unknown }) => statuses.push(e.status));
        H.add(img);
        img.setProperty("url", url);
        // Loaded, and for a JPEG the colour check has finished.
        const settled = () =>
          img.getStatus() === I.ImageStatus.Error ||
          (img.getStatus() === I.ImageStatus.Loaded &&
            [I.ConvertStatus.None, I.ConvertStatus.Converted, I.ConvertStatus.Failed].includes(
              converts[converts.length - 1],
            ));
        for (let i = 0; i < 300 && !settled(); i++) await H.frame();
        if (!settled()) throw new Error("the image did not settle");
        await H.frame();
        // The decoded pixels, as the element paints them at 1:1.
        const bmp = img.toBitmap(1, 1);
        const canvas = bmp.getHTMLElement(true) as HTMLCanvasElement;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        return {
          statuses,
          converts,
          convertStatus: img.getConvertStatus ? img.getConvertStatus() : "<no getter>",
          size: H.props(img, ["iw", "ih"]),
          pixels: Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data),
          width: canvas.width,
        };
      };
      return { convertStatuses: I.ConvertStatus, cmyk: await load(a.cmyk), rgb: await load(a.rgb) };
    }),
  },
  {
    id: "engine-model/special/ready-shape",
    covers: ["ENG-NODE-031", "ENG-NODE-032", "ENG-SER-018"],
    kind: "json",
    args: READY_SHAPE,
    inPage: withHelpers(
      (
        _p,
        def: {
          name: string;
          annotations: { name: string; annotList: { x0: number; y0: number }[] };
          parameters: unknown[];
          vertices: unknown[];
        },
        H,
      ) => {
        const G = H.G;
        const P = G.GParameterizedVertexProcessor;
        const proc = new P(
          def.annotations.name,
          def.annotations.annotList,
          def.parameters,
          def.vertices,
        );
        const points = def.annotations.annotList.map((a) => new G.GPoint(a.x0, a.y0));
        const shape = new G.GSimpleShape(proc, points, 100, 80, def.name);
        H.add(shape);
        const out: Record<string, unknown> = {
          name: G.GNode.getName(shape),
          verts: H.verts(shape),
          boxes: H.boxes(shape),
          trf: H.v(shape.getProperty("trf")),
          serializedProcessor: P.serialize(proc),
          mathFuncs: [P.SUPPORTED_MATH_FUNCS, P.SUPPORTED_MATH_FUNCS2],
          coordType: P.CoordType,
          blob: H.blob(shape),
        };
        shape.setAnnotationMouseLocation(0, new G.GPoint(80, 0));
        out.dragged = { verts: H.verts(shape), blobApv: H.blob(shape).apv ?? null };
        const back = G.GNode.deserialize(H.ser(shape));
        out.restored = { verts: H.verts(back), blob: H.blob(back) };
        // Expressions outside the whitelist are rejected.
        out.insecure = H.attempt(() => {
          const bad = new P(
            "annot",
            def.annotations.annotList,
            [{ name: "px", expression: "alert(1)" }],
            def.vertices,
          );
          return H.verts(new G.GSimpleShape(bad, points, 10, 10, "bad"));
        });
        return out;
      },
    ),
  },
  {
    id: "engine-model/special/annotations-and-comments",
    covers: [
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
      "ENG-SCENE-017",
    ],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const out: Record<string, unknown> = {};
      const list = H.page().getAnnotations ? H.page().getAnnotations() : null;
      out.pageAnnotationsList = list ? G.GNode.getName(list) : null;
      out.pageKids = H.kids(H.page());
      const kinds = [
        "GRectangleAnnotation",
        "GEllipseAnnotation",
        "GHighlighterAnnotation",
        "GArrowAnnotation",
        "GPencilAnnotation",
        "GTextAnnotation",
        "GCommentAnnotation",
        "GEmptyAnnotation",
        "GCollaborativeTextAnnotation",
      ];
      for (const k of kinds) {
        const n = new G[k]();
        const info: Record<string, unknown> = {
          name: G.GNode.getName(n),
          flagHidden: H.attempt(() =>
            n.hasFlag(G.GAnnotation.Flag ? G.GAnnotation.Flag.Hidden : 0),
          ),
          fillingCompleted: H.attempt(() => n.isFillingCompleted()),
          emptyTextAllowed: H.attempt(() => n.isEmptyTextAllowed()),
          stylable: H.attempt(() => n.getStylePropertySets()),
        };
        info.comment = H.attempt(() => {
          const c1 = n.addComment("first", "u1", "Ann", "a.png", "a@example.com");
          const c2 = n.addComment("second", "u2", "Bob", null, null, G.GComment.Type.Close);
          return {
            kids: H.kids(n),
            comments: [c1, c2].map((c: unknown) =>
              H.props(c, ["text", "uid", "seq", "name", "img", "email", "type", "rmd", "read"]),
            ),
            next: n.getNextAnnotationSequence(),
          };
        });
        info.blob = H.attempt(() => H.blob(n));
        out[k] = info;
      }
      out.sceneAnnotations = {
        has: H.attempt(() => s.hasAnnotations()),
        cloudAnnotations: s.isCloudAnnotations(),
        linkedFiles: H.attempt(() => s.hasLinkedFiles()),
      };
      out.annotable = typeof G.GAnnotable;
      out.linkable = typeof G.GElement.Linkable;
      return H.clean(out);
    }),
  },
  {
    id: "engine-model/special/paths-graph-drawn",
    covers: ["ENG-NODE-043", "ENG-NODE-044", "ENG-NODE-045", "ENG-NODE-046", "ENG-SER-008"],
    kind: "json",
    open: { newDocument: true, settings: {} },
    driver: async ({ page }) => {
      await page.clock.install();
      await page.evaluate(() => {
        const w = window as unknown as { __parity: { app: { activateTool(n: string): boolean } } };
        if (!w.__parity.app.activateTool("GPathsGraphTool")) throw new Error("no paths graph tool");
      });
      // Draw a closed triangle in the middle of the viewport.
      const x0 = 700;
      const y0 = 450;
      await page.mouse.move(x0 - 50, y0 - 50);
      for (const [dx, dy] of [
        [0, 0],
        [120, 0],
        [60, 90],
        [0, 0],
      ] as const) {
        await page.mouse.move(x0 + dx, y0 + dy, { steps: 4 });
        await page.mouse.down();
        await page.mouse.up();
        // The tool takes two presses closer than its double-click time
        // (Date.now based) as a double click; the fake clock moves on far
        // enough that they never are.
        await page.clock.runFor(1000);
      }
      await page.keyboard.press("Escape");
      return page.evaluate(() => {
        const { G, app } = (
          window as unknown as {
            __parity: {
              G: Record<string, never>;
              app: { scene(): { querySingle(s: string): unknown } };
            };
          }
        ).__parity;
        // The node name has a space, so it cannot be used as a selector.
        const GN = (G as unknown as { GNode: { getName(n: unknown): string } }).GNode;
        const pg = ((app.scene() as unknown as { queryAll(s: string): unknown[] })
          .queryAll("*")
          .find((n) => GN.getName(n) === "Paths Graph") ?? null) as null | Record<
          string,
          (...a: unknown[]) => unknown
        >;
        if (!pg) return { found: false };
        const ser = (G as unknown as { GNode: { serialize(n: unknown): string } }).GNode.serialize(
          pg,
        );
        const blob = JSON.parse(ser) as Record<string, unknown>;
        const nested = (k: string) => {
          const v = blob[k];
          if (typeof v !== "string") return v ?? null;
          const parsed = JSON.parse(v) as { "@": string; $?: { "@": string; props?: unknown[] }[] };
          return {
            node: parsed["@"],
            children: (parsed.$ ?? []).map((c) => c["@"]),
            // props = [uid, ...values]
            props: (parsed.$ ?? []).map((c) => c.props ?? null),
          };
        };
        // Anchor, edge and facet uids are random; name them uid1, uid2, ...
        // in order of first appearance so the references stay visible. A
        // uid is the first entry of a node's props; any other string equal
        // to one is a reference to it.
        const uids = new Map<string, string>();
        const parts = ["anchors", "edges", "facets"].map(nested);
        for (const part of parts) {
          const list = (part as { props?: unknown[] } | null)?.props ?? [];
          for (const props of list) {
            const uid = Array.isArray(props) ? props[0] : null;
            if (typeof uid === "string" && /^[A-Za-z0-9]{32}$/.test(uid) && !uids.has(uid))
              uids.set(uid, "uid" + (uids.size + 1));
          }
        }
        const relabel = (x: unknown): unknown => {
          if (typeof x === "string") return uids.get(x) ?? x;
          if (Array.isArray(x)) return x.map(relabel);
          if (x && typeof x === "object")
            return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, relabel(v)]));
          return x;
        };
        return relabel({
          found: true,
          keys: Object.keys(blob).filter((k) => !["@id", "_layId", "_effId"].includes(k)),
          anchors: parts[0],
          edges: parts[1],
          facets: parts[2],
          geometry: (() => {
            const b = (
              pg.getGeometryBBox as () => {
                getX(): number;
                getY(): number;
                getWidth(): number;
                getHeight(): number;
              } | null
            )();
            return b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null;
          })(),
        });
      });
    },
  },
]);

paritySuite("engine-model special nodes", scenarios, { newApp: false });
