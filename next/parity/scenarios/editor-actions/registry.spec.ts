// The action registry itself: the ordered list of registered ids with
// each action's menu state on a fresh document, and the ids that must NOT
// be registered (cloud, account, license, purchase and the few dead
// non-cloud classes). The new app drops the cloud items, so it must not
// register them either.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";

const NOT_REGISTERED = [
  // ACT-CLOUD
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
  // Classes that exist but are never registered.
  "check-for-updates",
  "language.en",
  "language.de",
  "help.translationtool",
  "view.toggle-paint-layers-visibility.fill",
  "view.toggle-paint-layers-visibility.border",
];

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
      covers: [
        ...Array.from({ length: 21 }, (_, i) => `ACT-CLOUD-${String(i + 1).padStart(3, "0")}`),
        "ACT-HELP-009",
        "ACT-HELP-010",
        "ACT-HELP-011",
        "ACT-KEY-022",
        "ACT-KEY-023",
      ],
      kind: "json",
      args: NOT_REGISTERED,
      inPage: ({ app }, idList) => {
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
      },
    },
  ]) as Scenario[],
  { newApp: false },
);
