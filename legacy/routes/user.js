const { Router } = require("express");
const router = Router();

const LANGUAGES = {
  0: "de-DE",
  1: "en",
  2: "zh-CN",
  3: "pt-BR",
  4: "es-ES",
  5: "fr-FR",
  6: "pl-PL",
  7: "ru-RU",
  8: "tr-TR",
  9: "cs-CZ",
  10: "zh-TW",
  11: "it-IT",
  12: "ja-JP",
  13: "nl-NL",
  14: "sv-SE",
};

const LOCALE_TO_CODE = Object.fromEntries(
  Object.entries(LANGUAGES).map(([k, v]) => [v.toLowerCase(), Number(k)]),
);

function resolveLocale(langOrLocale) {
  if (langOrLocale in LANGUAGES) return LANGUAGES[langOrLocale];
  if (
    typeof langOrLocale === "string" &&
    LOCALE_TO_CODE[langOrLocale.toLowerCase()] !== undefined
  ) {
    return langOrLocale;
  }
  return "en";
}

const USER_PROFILE = {
  id: "12345678",
  email: "example@example.net",
  email_verified: true,
  email_expire: null,
  login: null,
  name: "Test User",
  avatar:
    "https://gravatar.com/avatar/2b6848a6719e6c2e6747d506d1ff57b3?s=64&d=retro",
  admin: null,
  flash: null,
  last_seen: new Date().toISOString(),
  app: "designer",
  last_update: new Date().toISOString(),
  stats: {},
  address: "",
  city: "",
  zip: "",
  state: "",
  country: "",
  trial_created: "2021-09-22T19:58:35.018Z",
  trial_expire: "2099-10-07T19:58:35.018Z",
  pro_created: "2021-09-22T19:58:35.018Z",
  pro_expire: "2099-12-31T23:59:59.000Z",
  created: "2021-09-22T19:58:32.748Z",
  last_name: "",
  runtime: "Browser",
  user_type: "normal",
  deactivated: false,
  legacy: false,
  guest_created: null,
  guest_expire: null,
  version: "3.15.0",
};

const SETTINGS = {
  notifications_disabled: false,
  trialDays: 15,
  quotas: { free: null, pro: null },
  subscription: {
    annual: { productId: null, coupon: "Trial20" },
    extraParameters: { "x-at": null, "x-clickref": null },
  },
  license: { offlineExpirationTime: 1296000000, offlineCountdown: 604800000 },
  reminders: {
    offlineWarning: 86400000,
    proOfferInFree: 1296000000,
    proOfferInTrial: 432000000,
    proOfferInTrialExpired: 1296000000,
    proOfferInTrialExpireSoon: 86400000,
    proOfferInTrialLastWarning: 0,
    proOfferSpecialPrice: 0,
    proExpireSoon: 2592000000,
  },
  flags: {
    welcomeMessage: false,
    windowsStoreAnnouncement: false,
    proOfferSpecialPrice: false,
    proOfferInTrialExpireSoon: false,
    proOfferInTrialLastWarning: false,
  },
};

router.get("/user/settings", (_req, res) => {
  res.json(SETTINGS);
});

router.get("/user", (req, res) => {
  const locale = resolveLocale(req.query.lang);
  res.json({ ...USER_PROFILE, locale, settings: SETTINGS });
});

router.put("/user", (req, res) => {
  const locale = resolveLocale(req.body?.locale);
  res.json({
    id: USER_PROFILE.id,
    name: USER_PROFILE.name,
    locale,
    email: USER_PROFILE.email,
    version: USER_PROFILE.version,
    runtime: USER_PROFILE.runtime,
    settings: { notifications_disabled: false },
  });
});

module.exports = router;
