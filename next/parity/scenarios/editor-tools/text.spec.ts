import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { textEditCases, textToolCases } from "./cases-text.ts";

paritySuite("editor tools: text", [...textToolCases, ...textEditCases].map(toScenario), {
  newApp: false,
});
