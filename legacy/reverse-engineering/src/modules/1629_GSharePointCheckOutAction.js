/**
 * Webpack Module #1629
 * Type: class
 * Name: GSharePointCheckOutAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8), n(3);
    var i = n(1),
      a = o(n(443));
    const { isExecutingOnMSTeamsSync: r } = a.default;
    var s = n(18),
      l = n(31);
    const c = n(1152),
      d = n(44);
    function u() {}
    i.GObject.inherit(u, l),
      (u.ID = "file.sharepoint-checkout"),
      (u.TITLE = new i.GLocaleKey("GSharePointCheckOutAction", "title")),
      (u.prototype.getId = function () {
        return u.ID;
      }),
      (u.prototype.getTitle = function () {
        return u.TITLE;
      }),
      (u.prototype.getCategory = function () {
        return s.CATEGORY_FILE;
      }),
      (u.prototype.getGroup = function () {
        return "file";
      }),
      (u.prototype.isEnabled = function () {
        if (!r()) return !1;
        const e = gDesigner.getActiveDocument();
        if (!e) return !1;
        const t = e.getStorageItem();
        return !!t && t instanceof c.Item;
      }),
      (u.prototype.isVisible = function () {
        return this.isEnabled();
      }),
      (u.prototype.execute = async function () {
        try {
          const e = gDesigner.getActiveDocument().getStorageItem();
          if ((await e.refreshCheckOutStatus(), e.isCheckedOutByMe()))
            return d.alert(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GSharePointCheckOutAction",
                  "text.already-checkout"
                )
              )
            );
          await e.checkOut(),
            d.alert(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GSharePointCheckOutAction",
                  "text.successul-checkout"
                )
              )
            );
        } catch (e) {
          d.alert(e.message);
        }
      }),
      (u.prototype.toString = function () {
        return "[Object GSharePointCheckOutAction]";
      }),
      (e.exports = u);
  }