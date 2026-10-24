/**
 * Webpack Module #1686
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(20), n(34);
    var o = n(1);
    const i = n(44),
      { DESIGNER: { TITLE: a } = {} } = n(10);
    e.exports = class {
      async init() {
        (await this._shouldOpenWarningDialog()) &&
          gDesigner.executeWhenReady(() => this._openWarningDialog());
      }
      _openWarningDialog() {
        i.custom({
          icon: "info",
          closeable: !1,
          className: "g-beta-warning-dialog",
          title: o.GLocale.get(
            new o.GLocaleKey("GBetaFlow", "text.title")
          ).replace("%app", a),
          subtitle: o.GLocale.get(
            new o.GLocaleKey("GBetaFlow", "text.message")
          ),
          buttons: [
            {
              label: o.GLocale.get(
                new o.GLocaleKey("GBetaFlow", "text.i-understand")
              ).toUpperCase(),
              closeOnClick: !0,
              highlighted: !0,
            },
          ],
          dontShowAgainCb: (e) => {
            gContainer.setProperty(
              "designer.betaflow.dismiss-warning-dialog",
              !!e
            );
          },
        });
      }
      async _shouldOpenWarningDialog() {
        return !(await gContainer.getProperty(
          "designer.betaflow.dismiss-warning-dialog",
          !1
        ));
      }
    };
  }