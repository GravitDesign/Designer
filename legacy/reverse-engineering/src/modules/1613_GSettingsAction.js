/**
 * Webpack Module #1613
 * Type: class
 * Name: GSettingsAction
 */

function (e, t, n) {
    "use strict";
    n(8), n(3);
    var o = n(1),
      i = n(18),
      a = n(31),
      r = n(1275),
      s = n(1277);
    function l() {}
    o.GObject.inherit(l, a),
      (l.ID = s.ID),
      (l.TITLE = new o.GLocaleKey("GSettingsAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return i.CATEGORY_EDIT;
      }),
      (l.prototype.getGroup = function () {
        return "settings";
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-setting-touch" : "";
      }),
      (l.prototype.execute = async function () {
        new r().then((e) => e.open());
      }),
      (l.prototype.toString = function () {
        return "[Object GSettingsAction]";
      }),
      (e.exports = l);
  }