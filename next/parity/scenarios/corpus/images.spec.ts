import { paritySuite } from "../../support/suite.ts";
import { corpusScenarios } from "./corpus-scenarios.ts";

paritySuite("corpus preview and bitmaps", corpusScenarios(["preview", "bitmap"]), {
  newApp: false,
});
