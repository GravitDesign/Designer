import { defineScenarios } from "../../support/scenario.ts";
import { paritySuite } from "../../support/suite.ts";

/**
 * Classes whose default style the editor creates on insert. The saved file
 * stores the class type id as `_sdf` on the element and on its default
 * style, so the new engine must use the same numbers.
 */
const INSERTED = [
  "GRectangle",
  "GEllipse",
  "GPolygon",
  "GPath",
  "GCompoundPath",
  "GText",
  "GImage",
  "GPathsGraph",
  "GConnector",
  "GRectangleAnnotation",
  "GEllipseAnnotation",
  "GTextAnnotation",
  "GPencilAnnotation",
  "GHighlighterAnnotation",
  "GArrowAnnotation",
];

const scenarios = defineScenarios<unknown>([
  {
    // The type id of every node class reachable from G. Only node classes
    // matter: documents save their ids (`_sdf`). The full table of the old
    // engine, which the new engine's src/engine/core/type-ids.ts is
    // generated from, is data in scripts/data/old-type-ids.json; it also
    // lists classes the rewrite drops on purpose (the canvas command
    // recorder GRendererCtx), so it is not compared as a whole.
    id: "engine-model/type-ids/node-classes",
    covers: ["ENG-NODE-001", "ENG-STYLE-002"],
    kind: "json",
    inPage: ({ G, app }) => {
      const all = app.typeIds() as Record<string, number>;
      const out: Record<string, number> = {};
      for (const [path, id] of Object.entries(all)) {
        let cls: unknown = G;
        for (const part of path.split(".")) {
          cls = (cls as Record<string, unknown> | undefined)?.[part];
        }
        const proto = (cls as { prototype?: unknown } | undefined)?.prototype;
        if (proto instanceof (G.GNode as new () => object)) out[path] = id;
      }
      return out;
    },
  },
  {
    id: "engine-model/type-ids/default-style-targets",
    covers: ["ENG-NODE-001", "ENG-STYLE-002", "EDT-TOOLMGR-016", "EDT-ELEDIT-025"],
    kind: "json",
    args: INSERTED,
    inPage: ({ G, app }, args) => {
      const classes = args as string[];
      // Default styles are created when the first element of a kind is
      // inserted. What is recorded is the saved file itself.
      const nodes = classes.map((c) => {
        const n = new G[c]();
        n.setProperty("trf", new G.GTransform(10, 0, 0, 10, 50, 50));
        return n;
      });
      app.editor().insertElements(nodes);
      const json = JSON.parse(app.serialize({ save: true })) as {
        $: { "@": string; $?: { "@": string; name?: string; _sdf?: number }[] }[];
      };
      const styles = json.$.find((n) => n["@"] === "styles");
      const page = json.$.find((n) => n["@"] === "page");
      return {
        styles: (styles?.$ ?? []).map((s) => [s.name, s._sdf]),
        nodes: (page?.$ ?? []).map((n) => [n["@"], n._sdf]),
      };
    },
  },
]);

paritySuite("engine model: type ids", scenarios, { newApp: false });
