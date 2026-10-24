import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { lassoLayerCases, subselectCases } from "./cases-path.ts";

paritySuite(
  "editor tools: subselect, lasso, layer",
  [...subselectCases, ...lassoLayerCases].map(toScenario),
  { newApp: false },
);
