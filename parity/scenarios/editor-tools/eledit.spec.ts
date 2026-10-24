import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { eleditCases } from "./cases-eledit.ts";

paritySuite("editor tools: element editors", eleditCases.map(toScenario), { newApp: false });
