import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { toolmgrCases, toolmgrInPage } from "./cases-toolmgr.ts";

paritySuite("editor tools: tool manager", [...toolmgrCases.map(toScenario), ...toolmgrInPage], {
  newApp: false,
});
