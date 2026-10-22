import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { pointerCases, pointerInPage } from "./cases-pointer.ts";

paritySuite("editor tools: pointer", [...pointerCases.map(toScenario), ...pointerInPage], {
  newApp: false,
});
