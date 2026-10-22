import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { directionCases, editorCases } from "./cases-editor.ts";
import { editorInPage } from "./cases-editor-api.ts";

paritySuite(
  "editor tools: editor api",
  [...editorCases.map(toScenario), ...directionCases.map(toScenario), ...editorInPage],
  { newApp: false },
);
