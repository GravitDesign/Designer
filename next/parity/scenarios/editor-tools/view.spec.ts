import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { viewCases } from "./cases-view.ts";

paritySuite("editor tools: view", viewCases.map(toScenario), { newApp: false });
