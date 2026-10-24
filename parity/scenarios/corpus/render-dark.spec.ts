import { paritySuite } from "../../support/suite.ts";
import { corpusScenarios } from "./corpus-scenarios.ts";

paritySuite("corpus render dark", corpusScenarios(["render-dark"]), { newApp: false });
