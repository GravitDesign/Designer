/**
 * Webpack Module #843
 * Type: class
 * Name: GOpenRecentAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(18),
      a = n(31);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "file.open-recent"),
      (r.TITLE = new o.GLocaleKey("GOpenRecentAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_FILE_OPEN_RECENT;
      }),
      (r.prototype.getGroup = function () {
        return "file-open/open-recent";
      }),
      (r.prototype.isEnabled = function (e) {
        return !1;
      }),
      (r.prototype.execute = function () {}),
      (r.prototype.toString = function () {
        return "[Object GOpenRecentAction]";
      }),
      (e.exports = r);
  }