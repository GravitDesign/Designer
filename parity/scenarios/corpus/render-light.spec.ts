import { paritySuite } from "../../support/suite.ts";
import { corpusScenarios } from "./corpus-scenarios.ts";

paritySuite("corpus render light", corpusScenarios(["render-light"]), { newApp: false });
