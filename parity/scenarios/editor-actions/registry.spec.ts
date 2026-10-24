// The action registry itself: the ordered list of registered ids with
// each action's menu state on a fresh document, and the ids that must NOT
// be registered (the few dead non-cloud classes). The cloud, account,
// license and purchase actions and UI are recorded from the old app, and
// for the new app removedInNewApp checks that none of it is left.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario, type ScenarioContext } from "../../support/scenario.ts";
import type { Loose } from "./lib.ts";

// ACT-CLOUD-001..015: cloud, account, license and purchase actions. The
// old browser build registers none of them; the rewrite drops them.
const CLOUD_IDS = [
  "gravit-cloud.new",
  "gravit-cloud.open",
  "gravit-cloud.save",
  "gravit-cloud.save-as",
  "sync",
  "sync.info",
  "file.share",
  "file.share.opensharedfile",
  "gravit-versions-history",
  "file.sharepoint-checkout",
  "file.sharepoint-checkin",
  "example-files",
  "account.open",
  "account.logout",
  "help.purchase",
  "use-coupon-action",
  "toggle-pro-beta-license",
  "help.switchwebcdr.prod",
];

// Classes that exist but are never registered (not cloud).
const NOT_REGISTERED = [
  "check-for-updates",
  "language.en",
  "language.de",
  "help.translationtool",
  "view.toggle-paint-layers-visibility.fill",
  "view.toggle-paint-layers-visibility.border",
];

/** What the old app registers and can run of a list of action ids. */
function actionChecks(P: { app: Loose }, idList: unknown): unknown {
  const { app } = P;
  const ids = idList as string[];
  const registered = new Set(app.actionIds() as string[]);
  const cloudLike = (app.actionIds() as string[]).filter((id) =>
    /cloud|sync|share|account|purchase|coupon|license|webcdr|versions|sharepoint|example-files/.test(
      id,
    ),
  );
  return {
    cloudLikeRegistered: cloudLike,
    checks: ids.map((id) => {
      let error: string | null = null;
      try {
        app.execute(id);
      } catch (e) {
        error = String((e as Error).message);
      }
      return {
        id,
        registered: registered.has(id),
        info: app.editorActions.actionInfo(id),
        canExecute: !!app.canExecute(id),
        executeError: error,
      };
    }),
  };
}

// Traces of the cloud and license UI (ACT-CLOUD-017..021): PRO badges and
// buttons, the account avatar and popover, the collaborators bar, and the
// debug action hooks the cloud build installs on window.
const CLOUD_UI = {
  selectors: [
    ".g-pro",
    ".g-pro-button",
    ".g-tooltip-footer-pro-badge",
    ".g-profile-top-avatar",
    ".g-persona-bar",
    ".g-persona-container",
  ],
  globals: [
    "gdb_initsavestepsaction",
    "gdb_initsetupsystemdateaction",
    "gdb_inittranslationtoolaction",
    "gdb_initrecordgravitaction",
    "gdb_loaddesign",
  ],
};

function cloudUi(P: { app: Loose }, spec: unknown): unknown {
  const { app } = P;
  const s = spec as typeof CLOUD_UI;
  return {
    elements: s.selectors.map((sel) => ({ sel, count: document.querySelectorAll(sel).length })),
    globals: s.globals.map((g) => ({
      g,
      type: typeof (window as unknown as Record<string, unknown>)[g],
    })),
    proActions: (app.actionIds() as string[]).filter((id) => app.editorActions.actionInfo(id).pro),
  };
}

type W = { __parity: { app: Loose } };

/** The new app must not register, show or run any cloud action. */
async function assertCloudActionsRemoved({ page }: ScenarioContext): Promise<void> {
  const left = await page.evaluate((ids) => {
    const { app } = (window as unknown as W).__parity;
    const registered = new Set(app.actionIds() as string[]);
    return ids.filter((id) => registered.has(id) || app.canExecute(id));
  }, CLOUD_IDS);
  if (left.length > 0) throw new Error(`cloud actions still registered: ${left.join(", ")}`);
}

/** The new app must have no PRO badge, account UI, persona bar or gdb_* hook. */
async function assertCloudUiRemoved({ page }: ScenarioContext): Promise<void> {
  const left = await page.evaluate((spec) => {
    const { app } = (window as unknown as W).__parity;
    const out: string[] = [];
    for (const sel of spec.selectors) if (document.querySelector(sel)) out.push(sel);
    for (const g of spec.globals)
      if ((window as unknown as Record<string, unknown>)[g] !== undefined) out.push(g);
    for (const id of app.actionIds() as string[])
      if (app.editorActions.actionInfo(id).pro) out.push(`pro action ${id}`);
    return out;
  }, CLOUD_UI);
  if (left.length > 0) throw new Error(`cloud UI left in the new app: ${left.join(", ")}`);
}

paritySuite(
  "editor-actions registry",
  defineScenarios<unknown>([
    {
      id: "editor-actions/registry/registered",
      covers: ["ACT-MENU-002", "ACT-MENU-008", "ACT-KEY-024", "ACT-KEY-027"],
      kind: "json",
      inPage: ({ app }) =>
        (app.actionIds() as string[]).map((id) => ({ id, ...app.editorActions.actionInfo(id) })),
    },
    {
      id: "editor-actions/registry/not-registered",
      covers: ["ACT-HELP-009", "ACT-HELP-010", "ACT-HELP-011", "ACT-KEY-022", "ACT-KEY-023"],
      kind: "json",
      args: NOT_REGISTERED,
      inPage: actionChecks,
    },
    {
      id: "editor-actions/registry/cloud-actions",
      covers: Array.from({ length: 15 }, (_, i) => `ACT-CLOUD-${String(i + 1).padStart(3, "0")}`),
      kind: "json",
      args: CLOUD_IDS,
      inPage: actionChecks,
      removedInNewApp: assertCloudActionsRemoved,
    },
    {
      id: "editor-actions/registry/cloud-ui",
      covers: ["ACT-CLOUD-017", "ACT-CLOUD-018", "ACT-CLOUD-019", "ACT-CLOUD-020", "ACT-CLOUD-021"],
      kind: "json",
      args: CLOUD_UI,
      // Its own page: it reads every action's checked state, which reads
      // settings the shared page reset can leave undefined.
      open: { newDocument: true, settings: {} },
      inPage: cloudUi,
      removedInNewApp: assertCloudUiRemoved,
    },
  ]) as Scenario[],
  { newApp: false },
);
