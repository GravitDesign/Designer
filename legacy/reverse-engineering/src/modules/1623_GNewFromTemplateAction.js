/**
 * Webpack Module #1623
 * Type: class
 * Name: GNewFromTemplateAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(18),
      a = n(31),
      r = n(119);
    function s() {}
    o.GObject.inherit(s, a),
      (s.ID = "file.open-from-template"),
      (s.TITLE = new o.GLocaleKey("GNewFromTemplateAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return i.CATEGORY_FILE;
      }),
      (s.prototype.getGroup = function () {
        return "document";
      }),
      (s.prototype.isEnabled = function () {
        return false;
      }),
      (s.prototype.execute = function () {
        gContainer.newDocumentActionPerformed(),
          gDesigner.openNewDocumentDialog({
            closable: !0,
            showCloudOptions: !0,
            defaultOption: "templates-option",
            newOrFromTemplate: !0,
          });
      }),
      (s.prototype.toString = function () {
        return "[Object GNewFromTemplateAction]";
      }),
      (e.exports = s);
  }