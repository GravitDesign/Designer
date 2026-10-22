import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { snapCases } from "./cases-snap.ts";

paritySuite("editor tools: snapping and guides", snapCases.map(toScenario), { newApp: false });
