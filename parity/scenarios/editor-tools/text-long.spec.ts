import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { textLongEditCases } from "./cases-text.ts";

paritySuite("editor tools: long text edits", textLongEditCases.map(toScenario), {
  newApp: true,
});
