import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { shapeCases } from "./cases-shapes.ts";

paritySuite("editor tools: shapes", shapeCases.map(toScenario), { newApp: false });
