/**
 * Webpack Module #1592
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const { PasswordlessAuthenticationActions: o, gApi: i } = n(10),
      a = n(44),
      r = n(604),
      s = n(337),
      { GLocale: l, GLocaleKey: c } = n(1);
    e.exports = class {
      async execute() {
        let { [o.SetPassword]: e } =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        try {
          await i.passwordlessAuthentication.authenticateWithSetPasswordToken(
            e
          ),
            await s.checkLicense();
          const t = await gDesigner.getUser();
          t &&
            gDesigner.executeWhenReady(() => {
              new r(t, r.Tabs.ChangePassword, {
                token: e,
                tabs: [r.Tabs.ChangePassword],
                closeable: !1,
                changePasswordOptions: {
                  autoClose: !0,
                  title: l.get(
                    new c("GChangePasswordPanel", "text.set-password")
                  ),
                  info: l.get(
                    new c("GChangePasswordPanel", "text.set-password-info")
                  ),
                },
              }).open();
            });
        } catch (e) {
          gDesigner.executeWhenReady(() => {
            a.error(e);
          });
        }
      }
    };
  }