/**
 * Webpack Module #1325
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(8), n(20), n(527), n(107), n(4), n(32), n(33);
    var o = n(10);
    const i = n(1326),
      a = n(1578),
      r = n(256),
      s = n(441),
      l = {
        offlineWarning: () => r.openOfflineWarning(),
        trialExpired: () => a.openTrialExpired(),
        proExpireSoon: () => a.openProExpireSoon(),
        proExpireToday: () => a.openProExpireSoon(),
        proExpired: () => a.openProExpired(),
        upgradeScreen: () => a.openUpgradeScreen(),
        proOfferInTrial: () => a.openTrialMessage(),
        proOfferInTrialExpired: () => i.openOfferReminder(),
        proOfferInTrialExpireSoon: () => a.openTrialMessage(),
        proOfferInTrialLastWarning: () => a.openTrialMessage(),
        proOfferSpecialPrice: () => i.openOfferReminder(),
        proOfferInFree: () => i.openOfferReminder(),
      };
    e.exports = new (class {
      constructor() {
        (this._settings = Object.assign(
          {},
          o.defaultUserSettings.defaultUserSettings
        )),
          (this._intervalId = null),
          (this._flags = {
            proOfferInTrialLastWarning: !0,
            proOfferInTrialExpireSoon: !0,
          });
      }
      async start() {
        try {
          let e = await o.gApi.getUserSettings().catch(() => null);
          e && (this._settings = Object.assign(this._settings, e));
        } catch (e) {
          console.info("GReminderManager", "exception", e);
        }
        this._settings &&
          this._settings.reminders &&
          (this._settings.reminders.proOfferInTrialExpireSoon =
            o.DateAPI.daysToMilliseconds(1)),
          setInterval(
            this.checkReminders.bind(this),
            o.DateAPI.daysToMilliseconds(1)
          ),
          await this.checkReminders(),
          gDesigner.addEventListener(s, this.checkReminders, this);
      }
      async checkReminders() {
        if (!gDesigner.isEnabledSubscriptions()) return;
        let e = gDesigner.getSyncUser();
        if (!e || e.deactivated) return;
        if (!this._isAllowedToShowReminders()) return;
        const t = gDesigner.getLicense(),
          n = gDesigner.now();
        if (t.canAccessFreemium(n)) {
          if (t.isExpired(n)) {
            if (t.isTrial() && this.once("trialExpired"))
              return void this._checkPoint("proOfferInTrialExpired", n);
            if (t.isPro()) return void this.once("proExpired");
            this.execute("proOfferInTrialExpired");
          } else if (t.isPro())
            t.getExpirationDate() &&
              (this.once("proExpireSoon", t.getExpirationDate()) ||
                this.once("proExpireToday", t.getExpirationDate()));
          else if (t.isTrial())
            (await this._getShowTrialMessage()) &&
              this._waitUntilUserIsInactive() &&
              (this.execute("proOfferInTrial") ||
                this.once("proOfferInTrialExpireSoon", t.getExpirationDate()) ||
                this.once("proOfferInTrialLastWarning", t.getExpirationDate()));
          else if (t.isFree()) {
            const { reminders: { proOfferInFree: e = 15 } = {} } =
              this._settings;
            if (t.getCreationDate()) {
              const i = o.DateAPI.addTime(t.getCreationDate(), e);
              o.DateAPI.gte(n, i) &&
                this.execute("proOfferInFree") &&
                this.reset("proOfferInTrial", n);
            }
          }
          t.isPro() ||
            (t.isLegacy() &&
              t.getSpecialPriceDate() &&
              this.once("proOfferSpecialPrice", t.getSpecialPriceDate(), !0)),
            t.isOffline() &&
              !t.isOfflinePeriodExpired() &&
              (t.isPro() || t.isTrial()) &&
              this.execute("offlineWarning", t.getOfflineWarningDate()),
            t.isPro() &&
              !t.isExpired(n) &&
              (this.reset("proExpired"), this.reset("proExpireToday"));
        } else
          (await this._getShowTrialMessage()) &&
            this._executeReminder("upgradeScreen");
      }
      _isAllowedToShowReminders() {
        const e = new Date(gDesigner.now()).getTime(),
          t = gDesigner.getLicense();
        return !t.isTrial() || !o.DateAPI.lte(e, t.getCreationDate());
      }
      execute(e, t) {
        const n = gDesigner.now();
        t && (t = o.DateAPI.addTime(t, -this._settings.reminders[e] || 0));
        const i = gDesigner.getSetting(e);
        return (
          !(
            i &&
            !o.DateAPI.isExpired(n, new Date(i), this._settings.reminders[e])
          ) &&
          !(t && !o.DateAPI.isExpired(n, t)) &&
          this._executeReminder(e)
        );
      }
      once(e, t) {
        let n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        if (gDesigner.getSetting(e)) return !1;
        const i = gDesigner.now();
        return (
          t && (t = o.DateAPI.addTime(t, -this._settings.reminders[e] || 0)),
          !t || (!n && o.DateAPI.isExpired(i, t)) || (n && o.DateAPI.eq(i, t))
            ? this._executeReminder(e)
            : void 0
        );
      }
      _checkPoint(e, t) {
        gDesigner.setSetting(e, t);
      }
      _executeReminder(e) {
        return (
          !!this._checkFlag(e) &&
          (/^prod/.test("production") || console.info("ReminderManager", e),
          this._checkPoint(e, gDesigner.now()),
          this._handleStats(e),
          l[e].call(null),
          !0)
        );
      }
      _checkFlag(e) {
        return this._flags.hasOwnProperty(e)
          ? this._flags[e]
          : !1 !== this._settings.flags[e];
      }
      _handleStats(e) {
        let t, n;
        switch (e) {
          case "offlineWarning":
            gDesigner.pageTracking("/ProOfflineWarning");
            break;
          case "trialExpired":
            gDesigner.pageTracking("/ProTrialExpired");
            break;
          case "upgradeScreen":
            gDesigner.pageTracking("/Upgrade"),
              gDesigner
                .getUser()
                .then(async (e) => {
                  gDesigner
                    .getAmplitudeHelper()
                    .logEvent(
                      o.AmplitudeData.Events.ACCOUNT_TRIAL_EXPIRED_SCREEN,
                      {
                        ACCOUNT_TOTAL_TRIAL_DAYS_GIVEN: e.trial_created
                          ? o.DateAPI.millisecondsToDays(
                              o.DateAPI.diff(
                                new Date(e.trial_created),
                                new Date(e.trial_expire)
                              )
                            )
                          : null,
                        ACCOUNT_TOTAL_SUBSCRIPTION_DAYS_GIVEN:
                          await o.gApi.license.totalSubscriptionDays(e),
                        ACCOUNT_EVER_SUBSCRIBED:
                          await o.gApi.license.everSubscribed(),
                      }
                    );
                })
                .catch(() => null);
            break;
          case "proExpireSoon":
            (t = gDesigner.getLicense()),
              (n = o.DateAPI.millisecondsToDays(
                o.DateAPI.diff(
                  o.DateAPI.toUTCZone(gDesigner.now()),
                  t.getExpirationDate()
                )
              )),
              gDesigner.pageTracking("/ProReminders" + n);
            break;
          case "proExpireToday":
            gDesigner.pageTracking("/ProReminders1");
            break;
          case "proExpired":
            gDesigner.pageTracking("/ProSubExpired");
            break;
          case "proOfferInTrial":
            gDesigner.pageTracking("/ProTrial");
            break;
          case "proOfferInTrialExpired":
            gDesigner.pageTracking("/ProTrialExpired");
            break;
          case "proOfferInTrialExpireSoon":
            (t = gDesigner.getLicense()),
              (n = o.DateAPI.millisecondsToDays(
                o.DateAPI.diff(
                  o.DateAPI.toUTCZone(gDesigner.now()),
                  t.getExpirationDate()
                )
              )),
              gDesigner.pageTracking("/ProTrialExpireSoon" + n);
            break;
          case "proOfferInTrialLastWarning":
            gDesigner.pageTracking("/ProTrialExpireToday");
            break;
          case "proOfferSpecialPrice":
            gDesigner.pageTracking("/ProTrialSpecialPrice");
            break;
          case "proOfferInFree":
            gDesigner.pageTracking("/ProFree");
            break;
          case "upgrade":
            gDesigner.pageTracking("/Upgrade");
        }
      }
      reset(e, t) {
        gDesigner.setSetting(e, t);
      }
      resetAll() {
        Object.keys(l).forEach((e) => this.reset(e));
      }
      _waitUntilUserIsInactive() {
        return (
          !gDesigner.isUserActivelyUsingApp() ||
          (this._intervalId ||
            (this._intervalId = setInterval(() => {
              gDesigner.isUserActivelyUsingApp() ||
                (clearInterval(this._intervalId),
                (this._intervalId = null),
                this.checkReminders());
            }, o.ACTIVE_USAGE_IDLE_TIME)),
          !1)
        );
      }
      async _getShowTrialMessage() {
        try {
          const { showTrialMessage: e } =
            (await o.gApi.client.getConfiguration()) || {};
          return !!e;
        } catch (e) {
          console.error(
            "Failed to load client configuration. Skipping trial reminders"
          );
        }
        return !1;
      }
    })();
  }