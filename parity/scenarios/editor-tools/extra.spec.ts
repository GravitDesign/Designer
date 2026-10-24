import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { extraCases, extraInPage } from "./cases-extra.ts";

paritySuite("editor tools: extra", [...extraCases.map(toScenario), ...extraInPage], {
  newApp: false,
});
