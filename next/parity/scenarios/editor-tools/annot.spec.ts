import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { annotationCases } from "./cases-annot.ts";

paritySuite("editor tools: annotations", annotationCases.map(toScenario), { newApp: false });
