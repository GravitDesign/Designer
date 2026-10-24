/**
 * Webpack Module #1484
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8);
    var i = o(n(176)),
      a = n(1),
      r = o(n(1242)),
      s = o(n(44)),
      l = o(n(443)),
      c = n(1243);
    const { isPrivateChat: d, isTeamsChannel: u } = l.default;
    function p(e) {
      if ("function" != typeof e)
        throw "GMSTeamsAppLoader constructor error: Wrong argument is provided";
      this._callback = e;
    }
    (p.prototype.isExeuteOnMobileDevice = function () {
      return i.default.hardware === i.default.Hardware.Phone;
    }),
      (p.prototype.load = async function () {
        if (this.isExeuteOnMobileDevice())
          return void s.default.splashScreenError(
            a.GLocale.get(
              new a.GLocaleKey(
                "GSystemDialog",
                "text.unsupported-mobile-for-msteams-new"
              )
            )
          );
        const e = [c.MS_TEAMS_COMMAND];
        (await d())
          ? e.push(c.ONE_DRIVE_BUSINESS_COMMAND)
          : (await u()) && e.push(c.SHAREPOINT_COMMAND),
          r.default
            .getInstance()
            .authenticate(e)
            .then(() => {
              this._callback();
            });
      }),
      (e.exports = p);
  }