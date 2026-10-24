/**
 * Webpack Module #1637
 * Type: class
 * Name: GToggleProBETALicenseAction
 */

function (e, t, n) {
    "use strict";
    n(8), n(527), n(3);
    var o = n(1),
      i = n(31),
      a = n(18);
    const { gApi: r } = n(10);
    var s = n(337);
    function l() {}
    o.GObject.inherit(l, i),
      (l.ID = "toggle-pro-beta-license"),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        const e = gDesigner.getLicense();
        return e.isPro() && !e.isExpired()
          ? "Switch to Basic License"
          : "Switch to PRO License";
      }),
      (l.prototype.getCategory = function () {
        return a.CATEGORY_HELP;
      }),
      (l.prototype.getGroup = function () {
        return "help";
      }),
      (l.prototype.isEnabled = function () {
        return gDesigner.isBeta();
      }),
      (l.prototype.isVisible = function () {
        return gDesigner.isBeta();
      }),
      (l.prototype.execute = async function () {
        const e = await r.getUserSettings(),
          t = (e.flags && e.flags.betaProLicense) || !1;
        r.updateUserSettings({ flags: { betaProLicense: !t } }).then(() => {
          s.checkLicense();
        });
      }),
      (l.prototype.toString = function () {
        return "[Object GToggleProBETALicenseAction]";
      }),
      (e.exports = l);
  }