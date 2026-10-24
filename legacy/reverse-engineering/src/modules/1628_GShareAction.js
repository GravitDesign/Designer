/**
 * Webpack Module #1628
 * Type: class
 * Name: GShareAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    const i = n(18),
      a = n(31);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "file.share"),
      (r.TITLE = new o.GLocaleKey("GShareAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_FILE_SHARE;
      }),
      (r.prototype.getGroup = function () {
        return "file-share/share";
      }),
      (r.prototype.isEnabled = function () {
        return gDesigner.getApplicationManager().isShareEnabled();
      }),
      (r.prototype.isVisible = function () {
        return !0;
      }),
      (r.prototype.execute = function () {
        gDesigner.getShareManager().share();
      }),
      (r.prototype.toString = function () {
        return "[Object GShareAction]";
      }),
      (e.exports = r);
  }