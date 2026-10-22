import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";

const scenarios = defineScenarios([
  {
    id: "smoke/rectangle-document",
    covers: ["ENG-SER-001"],
    kind: "document",
    inPage: ({ G, app }) => {
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(100, 0, 0, 60, 200, 160));
      app.editor().insertElements([r]);
      return app.serialize({ save: true });
    },
  },
  {
    id: "smoke/rectangle-bbox",
    covers: ["ENG-GEOM-001"],
    kind: "json",
    inPage: ({ G }) => {
      const r = new G.GRectangle();
      r.setProperty("trf", new G.GTransform(100, 0, 0, 60, 200, 160));
      const b = r.getGeometryBBox();
      return [b.getX(), b.getY(), b.getWidth(), b.getHeight()];
    },
  },
]);

paritySuite("smoke", scenarios, { newApp: false });
