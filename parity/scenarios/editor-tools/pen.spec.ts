import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { bezigonCases, freehandCases, knifeCases, penCases } from "./cases-path.ts";

paritySuite(
  "editor tools: pen, bezigon, freehand, knife",
  [...penCases, ...bezigonCases, ...freehandCases, ...knifeCases].map(toScenario),
  { newApp: false },
);
