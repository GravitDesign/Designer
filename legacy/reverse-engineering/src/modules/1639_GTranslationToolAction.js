/**
 * Webpack Module #1639
 * Type: class
 * Name: GTranslationToolAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    const i = n(18),
      a = n(31),
      r = n(1640),
      { IS_TRUNK: s, IS_LOCALHOST: l } = n(231);
    function c() {}
    o.GObject.inherit(c, a),
      (c.ID = "help.translationtool"),
      (c.TITLE = new o.GLocaleKey("GTranslationToolAction", "title")),
      (c.prototype._translationTool = null),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return o.GLocale.get(c.TITLE) + " [DEVELOPMENT]";
      }),
      (c.prototype.getCategory = function () {
        return i.CATEGORY_HELP;
      }),
      (c.prototype.getGroup = function () {
        return "help";
      }),
      (c.prototype.isEnabled = function () {
        return !0;
      }),
      (c.prototype.isVisible = function () {
        return !(!s && !l);
      }),
      (c.prototype.execute = function () {
        this._translationTool || (this._translationTool = new r()),
          this._translationTool.init();
      }),
      (c.prototype.toString = function () {
        return "[Object GTranslationToolAction]";
      }),
      (e.exports = c);
  }