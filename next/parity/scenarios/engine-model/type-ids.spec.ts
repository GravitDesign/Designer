import { defineScenarios } from "../../support/scenario.ts";
import { paritySuite } from "../../support/suite.ts";

const scenarios = defineScenarios([
  {
    // Default styles and nodes save class type ids as `_sdf`. The numbers
    // come from the old engine's load order; the new engine keeps a table.
    id: "engine-model/type-ids/classes",
    covers: ["ENG-NODE-001", "ENG-STYLE-002"],
    kind: "json",
    inPage: ({ app }) => app.typeIds(),
  },
  {
    id: "engine-model/type-ids/default-style-targets",
    covers: ["ENG-STYLE-002", "EDT-TOOLMGR-016", "EDT-ELEDIT-025"],
    kind: "json",
    inPage: ({ G, app }) => {
      // Default styles are created when the first shape of a kind is inserted.
      const shapes = [
        new G.GRectangle(),
        new G.GEllipse(),
        new G.GPolygon(),
        new G.GPath(),
        new G.GText(),
      ];
      for (const s of shapes) s.setProperty("trf", new G.GTransform(10, 0, 0, 10, 50, 50));
      app.editor().insertElements(shapes);
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
