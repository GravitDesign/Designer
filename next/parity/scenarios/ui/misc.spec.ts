import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  behaviour,
  BROWSER_LOCALES,
  clickMenu,
  DEFAULT_LOCALE,
  LOCALES,
  openMenu,
  settle,
} from "./lib.ts";

interface LocaleWindow {
  __parity: {
    G: {
      GLocale: { getAvailableLanguages(): number[]; getLanguage(): number };
      GLocaleLanguage: Record<string, number>;
    };
  };
}

/** Values that are timestamps or random: kept as their type only. */
const VOLATILE_KEYS = ["last_update_check", "lastUpdate", "created", "_ga", "_gid"];

/**
 * Keys of the license and subscription cache. The rewrite drops licensing
 * (storage/license-cache checks that), so they stay out of the startup
 * snapshot instead of making the new app copy license data.
 */
const LICENSE_KEYS = ["offline_cache", "enabled_subscriptions"];

const scenarios: Scenario[] = [
  ...LOCALES.map((language) =>
    behaviour(
      `i18n/startup-${language}`,
      [
        "UI-I18N-001",
        "UI-I18N-003",
        "UI-I18N-004",
        "UI-I18N-006",
        "RUN-I18N-002",
        "RUN-I18N-003",
        "RUN-I18N-006",
      ],
      async (page) =>
        page.evaluate(() => {
          const { G } = (window as unknown as LocaleWindow).__parity;
          const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
            string,
            unknown
          >;
          return {
            available: G.GLocale.getAvailableLanguages(),
            enumeration: G.GLocaleLanguage,
            storedLanguage: s.language ?? "<unset>",
            language: G.GLocale.getLanguage(),
            menus: [
              ...document.querySelectorAll(
                "nav.g-menu-bar ul.g-menu-root > li > .g-menu-item-caption",
              ),
            ].map((c) => c.textContent),
          };
        }),
      { language },
    ),
  ),
  ...[DEFAULT_LOCALE, ...BROWSER_LOCALES].map((locale) =>
    behaviour(
      `i18n/browser-${locale}`,
      ["UI-I18N-002", "UI-I18N-003", "UI-I18N-004", "UI-I18N-006", "RUN-I18N-003"],
      async (page) =>
        page.evaluate(() => ({
          language: (window as unknown as LocaleWindow).__parity.G.GLocale.getLanguage(),
          navigator: navigator.language,
          title: document.title,
          loadMore: [...document.querySelectorAll(".load-more")].map((e) => e.textContent),
          sidebars: [...document.querySelectorAll(".sidebar-option .sidebar-title")].map(
            (e) => e.textContent,
          ),
        })),
      undefined,
      locale,
    ),
  ),
  behaviour("i18n/no-language-menu", ["RUN-I18N-001", "UI-I18N-007"], async (page) => {
    await openMenu(page, ["Help"]);
    return page.evaluate(() => ({
      help: [
        ...document.querySelectorAll("ul.g-menu:not(.g-menu-root) > li > .g-menu-item-caption"),
      ]
        .filter((c) => (c as HTMLElement).offsetParent !== null)
        .map((c) => c.textContent),
      languageActions: (
        window as unknown as { __parity: { app: { actionIds(): string[] } } }
      ).__parity.app
        .actionIds()
        .filter((id) => id.startsWith("language.")),
    }));
  }),
  behaviour(
    "storage/after-startup",
    [
      "UI-STORAGE-001",
      "UI-STORAGE-002",
      "UI-STORAGE-010",
      "UI-STORAGE-014",
      "UI-SETTING-017",
      "UI-SETTING-018",
      "UI-SETTING-019",
      "RUN-STORAGE-001",
      "RUN-STORAGE-004",
      "RUN-STORAGE-005",
      "RUN-STORAGE-008",
      "RUN-STORAGE-009",
      "RUN-STORAGE-010",
      "RUN-STORAGE-011",
      "UI-STORAGE-013",
    ],
    async (page) => {
      await settle(page, 500);
      // Analytics never load (network isolation), so only the app's own
      // cookies are left; values can be dates, names are what matters.
      const cookies = (await page.context().cookies()).map((c) => c.name).sort();
      const state = await page.evaluate(
        async ({ volatile, license }) => {
          const shape = (v: unknown, key = ""): unknown => {
            if (volatile.includes(key)) return `<${typeof v}>`;
            if (Array.isArray(v)) return v.map((x) => shape(x));
            if (v && typeof v === "object") {
              return Object.fromEntries(
                Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, shape(x, k)]),
              );
            }
            return v;
          };
          const local: Record<string, unknown> = {};
          for (const key of Object.keys(localStorage).sort()) {
            if (license.includes(key)) continue;
            const raw = localStorage.getItem(key) ?? "";
            let value: unknown;
            try {
              value = JSON.parse(raw);
            } catch {
              value = raw;
            }
            local[key] = shape(value, key);
          }
          const dbs = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null;
          const caches = "caches" in window ? await window.caches.keys() : null;
          return {
            local,
            session: Object.keys(sessionStorage).filter((k) => !k.startsWith("__parity")),
            dbs,
            caches,
          };
        },
        { volatile: VOLATILE_KEYS, license: LICENSE_KEYS },
      );
      return { ...state, cookies };
    },
  ),
  {
    // The license and subscription cache the old app keeps for offline
    // starts. Recorded as its shape only (no license values); the rewrite
    // drops licensing, so the new app must not write these keys at all.
    ...behaviour(
      "storage/license-cache",
      ["UI-STORAGE-005", "RUN-STORAGE-003", "RUN-STORAGE-006"],
      async (page) => {
        await settle(page, 500);
        return page.evaluate(
          (volatile) => {
            const cache = JSON.parse(localStorage.getItem("offline_cache") ?? "null") as Record<
              string,
              Record<string, unknown>
            > | null;
            const user = cache?.user ?? {};
            return {
              cacheKeys: cache ? Object.keys(cache).sort() : null,
              userKeys: Object.keys(user).sort(),
              userLocale: user.locale ?? "<unset>",
              volatileUserKeys: volatile.filter((k) => k in user),
              enabledSubscriptions: localStorage.getItem("enabled_subscriptions"),
            };
          },
          ["last_seen", "last_update", "created"],
        );
      },
    ),
    removedInNewApp: async ({ page }) => {
      const left = await page.evaluate(
        (keys) => keys.filter((k) => localStorage.getItem(k) !== null),
        LICENSE_KEYS,
      );
      if (left.length > 0) throw new Error(`license keys still written: ${left.join(", ")}`);
    },
  },
  behaviour(
    "storage/partial-settings-filled",
    ["UI-SETTING-018", "UI-STORAGE-002"],
    async (page) =>
      page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
          string,
          unknown
        >;
        return Object.keys(s)
          .sort()
          .map((k) => [k, s[k]]);
      }),
    { settings: { theme: "dark", rulers_visible: true } },
  ),
  behaviour(
    "storage/view-toggles-persist",
    ["UI-SETTING-021", "RUN-STORAGE-002", "UI-SETTING-017"],
    async (page) => {
      for (const path of [
        ["View", "Snap to", "Use Snap Zones"],
        ["View", "Snap to", "Snap to Grid"],
        ["View", "Canvas", "Show Rulers"],
        ["View", "Canvas", "Show Guide Lines"],
      ]) {
        await clickMenu(page, path);
      }
      return page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
          string,
          unknown
        >;
        return {
          snap_zones: s.snap_zones,
          snap_guides: s.snap_guides,
          rulers_visible: s.rulers_visible,
          guide_lines_visible: s.guide_lines_visible,
        };
      });
    },
  ),
];

paritySuite("ui misc", scenarios, { newApp: false });
