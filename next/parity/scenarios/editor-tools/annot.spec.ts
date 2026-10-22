import { paritySuite } from "../../support/suite.ts";
import { toScenario } from "./case.ts";
import { annotationCases, annotationReviewCases } from "./cases-annot.ts";

paritySuite(
  "editor tools: annotations",
  [...annotationCases, ...annotationReviewCases].map(toScenario),
  { newApp: false },
);
