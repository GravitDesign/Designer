/**
 * Webpack Module #1284
 * Type: class
 * Name: GRedoAction
 */

function (e, t, n) {
    "use strict";
    n(20), n(3), n(34);
    var o = n(1),
      i = n(15),
      a = n(67),
      r = n(18),
      s = n(31);
    function l() {
      l.TOOLTIP_CONFIG = {
        [a.TOOLTIP_AREA.TOOLBAR]: a.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GRedoAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GRedoAction", "tooltip-description")
          ),
          shortcut: l.SHORTCUT,
        }),
      };
    }
    o.GObject.inherit(l, s),
      (l.ID = "edit.redo"),
      (l.TITLE = new o.GLocaleKey("GRedoAction", "title")),
      (l.SHORTCUT = [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "z"]),
      (l.TOOLTIP_CONFIG = null),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        var e = gDesigner.getActiveDocument();
        return e && e.getEditor().hasRedoState()
          ? o.GLocale.get(
              new o.GLocaleKey("GRedoAction", "redo-action")
            ).replace("%action", e.getEditor().getRedoStateName())
          : o.GLocale.get(l.TITLE);
      }),
      (l.prototype.getIcon = function () {
        return "gravit-icon-redo";
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_EDIT;
      }),
      (l.prototype.getGroup = function () {
        return "undo_redo";
      }),
      (l.prototype.getShortcut = function () {
        return l.SHORTCUT;
      }),
      (l.prototype.isEnabled = function () {
        return (
          !(
            gDesigner.getActiveDocument() &&
            !gDesigner.getActiveDocument().isEditingEnabled()
          ) &&
          (!(
            !document.activeElement ||
            !$(document.activeElement).is(":editable") ||
            $(document.activeElement).is(":button") ||
            $(document.activeElement).is("select") ||
            gDesigner.isGravitIME(document.activeElement)
          ) ||
            !(
              !gDesigner.getActiveDocument() ||
              !gDesigner.getActiveDocument().getEditor().hasRedoState()
            ))
        );
      }),
      (l.prototype.execute = function () {
        !document.activeElement ||
        !$(document.activeElement).is(":editable") ||
        $(document.activeElement).is(":button") ||
        $(document.activeElement).is("select") ||
        gDesigner.isGravitIME(document.activeElement)
          ? gDesigner.getActiveDocument().getEditor().redoState()
          : document.execCommand("redo");
      }),
      (l.prototype.getTooltipConfig = function (e) {
        return (e && l.TOOLTIP_CONFIG[e]) || null;
      }),
      (l.prototype.toString = function () {
        return "[Object GRedoAction]";
      }),
      (e.exports = l);
  }