/**
 * Webpack Module #1630
 * Type: class
 * Name: GSharePointCheckInAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8), n(20), n(3), n(34);
    var i = n(1),
      a = o(n(443));
    const { isExecutingOnMSTeamsSync: r } = a.default;
    var s = n(18),
      l = n(31);
    const c = n(1152),
      d = n(44),
      u = n(1631),
      p = n(78);
    function g() {}
    i.GObject.inherit(g, l),
      (g.ID = "file.sharepoint-checkin"),
      (g.TITLE = new i.GLocaleKey("GSharePointCheckInAction", "title")),
      (g.prototype.getId = function () {
        return g.ID;
      }),
      (g.prototype.getTitle = function () {
        return g.TITLE;
      }),
      (g.prototype.getCategory = function () {
        return s.CATEGORY_FILE;
      }),
      (g.prototype.getGroup = function () {
        return "file";
      }),
      (g.prototype.isEnabled = function () {
        return (
          !!this._isSupported() &&
          gDesigner.getActiveDocument().getStorageItem().isCheckedOutByMe()
        );
      }),
      (g.prototype._isSupported = function () {
        if (!r()) return !1;
        const e = gDesigner.getActiveDocument();
        if (!e) return !1;
        const t = e.getStorageItem();
        return !!t && t instanceof c.Item;
      }),
      (g.prototype.isVisible = function () {
        return this._isSupported();
      }),
      (g.prototype.execute = async function () {
        try {
          const e = gDesigner.getActiveDocument();
          if (e.isModified())
            return void d.alert(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GSharePointCheckInAction",
                  "text.doc-modified-save-before-check-in"
                )
              ).replace("%title", e.getTitle())
            );
          const t = e.getStorageItem(),
            n = t.getCloudClient(),
            o = await n.getLibrarySettings();
          await u.openCheckInDialog(o).then(async (n) => {
            let { ok: o, comment: i, type: a } = n;
            o &&
              (await t.checkIn(i, a),
              gDesigner.trigger(new p(p.Type.SynchronismUpdated, e)));
          });
        } catch (e) {
          d.alert(e.message);
        }
      }),
      (g.prototype.toString = function () {
        return "[Object GSharePointCheckInAction]";
      }),
      (e.exports = g);
  }