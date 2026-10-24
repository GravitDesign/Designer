import { paritySuite } from "../../support/suite.ts";
import { corpusScenarios } from "./corpus-scenarios.ts";

paritySuite("corpus load and save", corpusScenarios(["document", "resave"]), { newApp: false });
