import type { ScenarioContext } from "../../support/scenario.ts";
import { paritySuite } from "../../support/suite.ts";
import { toScenario, type ToolCase } from "./case.ts";
import { annotationCases, annotationReviewCases } from "./cases-annot.ts";

/**
 * The annotation (review) tools were reachable only from the comments
 * sidebar, which the new app removes (REMOVED.md DROP-006 and DROP-009).
 * Documents with annotations still load and render (corpus/annotations/*).
 * For the new app these scenarios check that no way to the tools is left:
 * no sidebar tab, no annotations toolbar or tool icon, no registered
 * action, and no key that activates an annotation tool.
 */
async function assertAnnotationToolsRemoved({ page }: ScenarioContext): Promise<void> {
  type Hooks = {
    __parity: {
      app: {
        actionIds(): string[];
        activeTool(): string | null;
        editorTools: { toolChanges(): { next: string | null }[] };
      };
    };
  };
  const left = await page.evaluate(() => {
    const found = [
      ".sidebar-option.sidebar-annotations",
      ".annotations-toolbar",
      "[class*='gravit-icon-annotationtools-']",
      ".annotation-row",
    ].filter((selector) => document.querySelector(selector));
    const { app } = (window as unknown as Hooks).__parity;
    for (const id of app.actionIds()) if (/annotation/i.test(id)) found.push(`action ${id}`);
    app.editorTools.toolChanges();
    return found;
  });
  // Every letter and digit: the tool shortcuts are single keys.
  await page.mouse.move(600, 500);
  for (const key of "abcdefghijklmnopqrstuvwxyz0123456789") {
    await page.keyboard.press(key);
    const tool = await page.evaluate(() => {
      const { app } = (window as unknown as Hooks).__parity;
      const reached = app.editorTools
        .toolChanges()
        .map((change) => change.next)
        .concat(app.activeTool());
      return reached.find((name) => !!name && /Annotation/.test(name)) ?? null;
    });
    if (tool) left.push(`key ${key} activates ${tool}`);
    await page.keyboard.press("Escape");
  }
  if (left.length > 0)
    throw new Error(`the annotation tools are still reachable: ${left.join(", ")}`);
}

/** Its subject is the transform box of the touch UI, which stays. */
const KEPT = new Set(["annotations/touch-transform-box-icon-handles"]);

const withRemoval = (c: ToolCase) =>
  KEPT.has(c.id)
    ? toScenario(c)
    : { ...toScenario(c), removedInNewApp: assertAnnotationToolsRemoved };

paritySuite(
  "editor tools: annotations",
  [...annotationCases, ...annotationReviewCases].map(withRemoval),
  { newApp: false },
);
