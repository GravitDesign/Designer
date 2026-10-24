/**
 * Webpack Module #1633
 * Type: action
 * Name: Action_example_files
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    const i = n(31),
      a = n(18),
      r = n(256);
    function s() {}
    o.GObject.inherit(s, i),
      (s.ID = "example-files"),
      (s.TITLE = new o.GLocaleKey("GExampleFilesAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_HELP_LEARN;
      }),
      (s.prototype.getGroup = function () {
        return "help/learn";
      }),
      (s.prototype.execute = function () {
        const e = {
            closable: !0,
            showCloudOptions: !0,
            openFromCloud: !0,
            nativeCloud: !0,
            showExampleFiles: !0,
          },
          t = () => gDesigner.openNewDocumentDialog(e);
        gDesigner.isOffline() ? r.openUnavailableFeature(t) : t();
      }),
      (s.prototype.toString = function () {
        return "[GObject GExampleFilesAction]";
      }),
      (e.exports = s);
  }