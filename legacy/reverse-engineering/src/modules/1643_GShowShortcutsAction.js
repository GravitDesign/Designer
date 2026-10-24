/**
 * Webpack Module #1643
 * Type: class
 * Name: GShowShortcutsAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    const { GObject: o, GLocaleKey: i } = n(1),
      a = n(31),
      r = n(18),
      s = n(1644);
    function l() {}
    o.inherit(l, a),
      (l.ID = "help.shortcuts"),
      (l.TITLE = new i("GShowShortcutsAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_HELP_LEARN;
      }),
      (l.prototype.getGroup = function () {
        return "help/learn";
      }),
      (l.prototype.execute = function () {
        new s().open();
      }),
      (l.prototype.toString = function () {
        return "[Object GShowShortcutsAction]";
      }),
      (e.exports = l);
  }