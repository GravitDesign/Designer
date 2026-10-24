/**
 * Webpack Module #1632
 * Type: class
 * Name: GQuitAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(31),
      r = n(18),
      s = n(85);
    function l() {}
    o.GObject.inherit(l, a),
      (l.ID = "file.quit"),
      (l.TITLE = new o.GLocaleKey("GQuitAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_FILE;
      }),
      (l.prototype.getGroup = function () {
        return "file-quit";
      }),
      (l.prototype.isEnabled = function () {
        return (
          gContainer.getRuntime() !== s.Runtime.Browser &&
          gContainer.getRuntime() !== s.Runtime.PWA
        );
      }),
      (l.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "Q"];
      }),
      (l.prototype.isAvailable = function () {
        return (
          gContainer.getRuntime() !== s.Runtime.Browser &&
          gContainer.getRuntime() !== s.Runtime.PWA
        );
      }),
      (l.prototype.execute = function () {
        gContainer.triggerClose();
      }),
      (l.prototype.toString = function () {
        return "[Object GQuitAction]";
      }),
      (e.exports = l);
  }