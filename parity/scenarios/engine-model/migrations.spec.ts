import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { withHelpers } from "./helpers.ts";

// Loading old-style blobs: every legacy-key migration the engine applies
// on restore (ENG-SER-011..017), re-serialized. The rewrite must read the
// same old files into the same model.

const scenarios: Scenario[] = defineScenarios<unknown>([
  {
    id: "engine-model/migrations/flat-style-keys",
    covers: ["ENG-SER-011", "ENG-SER-012", "ENG-STYLE-003", "ENG-BORDER-004"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const load = (blob: Record<string, unknown>) =>
        H.attempt(() => {
          const n = G.GNode.deserialize(JSON.stringify(blob));
          return {
            blob: H.blob(n, { copy: true }),
            layers: (n.getPaintLayers().getLayers() as unknown[]).map((l) => G.GNode.getName(l)),
          };
        });
      return {
        fillOnly: load({ "@": "rectangle", trf: [10, 0, 0, 10, 10, 10], _fpt: "C#[255,0,0]" }),
        fillFull: load({
          "@": "rectangle",
          _fpt: "C#[255,0,0]",
          _fop: 0.4,
          _fvs: false,
          _fpx: [1, 0, 0, 1, 2, 3],
        }),
        borderFull: load({
          "@": "ellipse",
          _bpt: "C#[0,0,255]",
          _bop: 0.5,
          _bvs: true,
          _bw: 4,
          _ba: "O",
          _bds: [3, 1],
          _blc: "round",
          _blj: "bevel",
          _bml: 7,
        }),
        fillAndBorder: load({ "@": "path", pts: [], _fpt: "C#[1,2,3]", _bpt: "C#[4,5,6]", _bw: 2 }),
        markerOffsetInside: load({
          "@": "path",
          _bpt: "C#[0,0,0]",
          _bhm: "A",
          _btm: "C",
          _bmo: true,
          _bmi: false,
        }),
        markerInsideTrue: load({ "@": "path", _bpt: "C#[0,0,0]", _bmi: true }),
        layerBooleanInside: (() => {
          const n = G.GNode.deserialize(
            JSON.stringify({
              "@": "rectangle",
              _layers: {
                "@": "paintLayers",
                $: [{ "@": "borderPaintLayer", _pt: "C#[0,0,0]", _bhmi: true, _btmi: false }],
              },
            }),
          );
          return H.props(n.getPaintLayers().getFirstChild(), ["_bhmi", "_btmi", "_bhmo", "_btmo"]);
        })(),
        layerLegacyKeys: (() => {
          const n = G.GNode.deserialize(
            JSON.stringify({
              "@": "rectangle",
              _layers: {
                "@": "paintLayers",
                $: [
                  {
                    "@": "borderPaintLayer",
                    _bpt: "C#[9,9,9]",
                    _bop: 0.3,
                    _bvs: false,
                    _bmo: true,
                  },
                ],
              },
            }),
          );
          return H.props(n.getPaintLayers().getFirstChild(), [
            "_pt",
            "_op",
            "_vs",
            "_bhmo",
            "_btmo",
          ]);
        })(),
        noStyle: load({ "@": "rectangle" }),
      };
    }),
  },
  {
    id: "engine-model/migrations/legacy-scene",
    covers: ["ENG-SER-015", "ENG-SER-016", "ENG-SER-017", "ENG-SER-009", "ENG-SER-010"],
    kind: "document",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const load = (blob: Record<string, unknown>) =>
        H.attempt(() =>
          JSON.parse(G.GNode.serialize(G.GNode.deserialize(JSON.stringify(blob)))),
        ) as unknown;
      // No "dictionary": a pre-3.10 document. Page settings stored on the
      // scene are forwarded to its page.
      const pre310 = {
        "@": "scene",
        v: 7,
        w: 500,
        h: 400,
        ml: 5,
        mt: 6,
        mr: 7,
        mb: 8,
        bl: 3,
        bck: "C#[1,2,3]",
        bop: 0.5,
        "@swatches": JSON.stringify([{ name: "A", pt: "C#[255,0,0]" }]),
        $: [
          {
            "@": "page",
            name: "P",
            $: [
              {
                "@": "layer",
                name: "L",
                $: [
                  {
                    "@": "path",
                    pts: [
                      [0, 0],
                      [10, 10],
                    ],
                    rtxt: "abc",
                  },
                  { "@": "image", trf: [5, 0, 0, 5, 5, 5] },
                  { "@": "image", trf: [5, 0, 0, 5, 5, 5], ipfc: true },
                  {
                    "@": "text",
                    trf: [1, 0, 0, 1, 0, 0],
                    aw: false,
                    ah: false,
                    w: 100,
                    h: 30,
                    ct: [{ text: "old", fontFamily: "Open Sans" }],
                    content: '[{"text":"old","fontFamily":"Open Sans"}]',
                  },
                ],
              },
            ],
          },
        ],
      };
      // No pages at all: the content gets a page with w/h 0.
      const pageless = {
        "@": "scene",
        dictionary: { entries: [] },
        $: [{ "@": "layer", name: "L", $: [{ "@": "rectangle", trf: [10, 0, 0, 10, 10, 10] }] }],
      };
      // Two pages without "off": offsets are computed from the layout.
      const noOffsets = {
        "@": "scene",
        dictionary: { entries: [] },
        pi: 1,
        $: [
          { "@": "page", name: "A", w: 300, h: 200 },
          { "@": "page", name: "B", w: 300, h: 200 },
        ],
      };
      // A version number from the future is ignored.
      const future = {
        "@": "scene",
        v: 99,
        dictionary: { entries: [] },
        $: [{ "@": "page", name: "F" }],
      };
      return JSON.stringify({
        pre310: load(pre310),
        pageless: load(pageless),
        noOffsets: load(noOffsets),
        future: load(future),
      });
    }),
  },
  {
    id: "engine-model/migrations/styles-repair-sdf",
    covers: ["ENG-SER-016", "ENG-STYLE-008"],
    kind: "json",
    inPage: withHelpers((_p, _a, H) => {
      const G = H.G;
      const s = H.app.scene();
      const styles = s.getStyles();
      // A stored default style with a wrong `_sdf` is repaired by its name.
      const names = (styles.getChildren() as { getProperty(n: string): unknown }[]).map((x) =>
        x.getProperty("name"),
      );
      const sdfOf = (name: string) =>
        (styles.getChildren() as { getProperty(n: string): unknown }[])
          .find((x) => x.getProperty("name") === name)
          ?.getProperty("_sdf");
      // `_sdf` is the type id of the class the default style is for; the
      // numbers are saved in files, so they are recorded as they are.
      const before = names.map((n) => [n, sdfOf(n as string)]);
      const rect = sdfOf("Rectangle Default");
      const ell = sdfOf("Ellipse Default");
      const st = (
        styles.getChildren() as {
          getProperty(n: string): unknown;
          setProperty(n: string, v: unknown): void;
        }[]
      ).find((x) => x.getProperty("name") === "Ellipse Default");
      st?.setProperty("_sdf", 99999);
      const broken = sdfOf("Ellipse Default");
      const repaired = H.attempt(() => {
        styles.repairSdf();
        return [sdfOf("Ellipse Default"), sdfOf("Ellipse Default") === ell];
      });
      return {
        before,
        sameTypeAsRectangle: rect === ell,
        broken,
        repaired,
        stylesNode: G.GNode.getName(styles),
      };
    }),
  },
]);

paritySuite("engine-model migrations", scenarios, { newApp: false });
