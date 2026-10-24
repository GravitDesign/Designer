import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { bezigonBranchCases, penBranchCases } from "./cases-pen-branches.ts";

paritySuite(
  "editor tools: pen and bezigon branches",
  [...penBranchCases, ...bezigonBranchCases].map(toScenario),
  { newApp: false },
);
