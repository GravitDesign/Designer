import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { cropCases } from "./cases-crop.ts";
import { touchCases } from "./cases-touch.ts";

paritySuite("editor tools: crop and touch", [...cropCases, ...touchCases].map(toScenario), {
  newApp: false,
});
