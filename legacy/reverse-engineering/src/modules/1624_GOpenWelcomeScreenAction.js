/**
 * Webpack Module #1624
 * Type: class
 * Name: GOpenWelcomeScreenAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(31),
      a = n(18);
    function r() {}
    o.GObject.inherit(r, i),
      (r.ID = "open-welcome-screen"),
      (r.TITLE = new o.GLocaleKey("GOpenWelcomeScreenAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return a.CATEGORY_HELP;
      }),
      (r.prototype.getGroup = function () {
        return "help";
      }),
      (r.prototype.isEnabled = function () {
        return (
          (!gDesigner._newDocumentDialog ||
            !gDesigner._newDocumentDialog.isOpen()) &&
          gDesigner.getApplicationManager().isCreatingNewDocumentEnabled() &&
          gDesigner.getLicense().canAccessFreemium()
        );
      }),
      (r.prototype.execute = function () {
        gDesigner.openNewDocumentDialog({ closable: !0 });
      }),
      (r.prototype.toString = function () {
        return "[Object GOpenWelcomeScreenAction]";
      }),
      (e.exports = r);
  }