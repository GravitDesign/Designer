/**
 * GShowGuideLinesAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShowGuideLinesAction() {}

GObject.inherit(GShowGuideLinesAction, GAction);

// Prototype methods
GShowGuideLinesAction.prototype.getId = function () {
        return s.ID;
      }

GShowGuideLinesAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GShowGuideLinesAction.prototype.getCategory = function () {
        return a.CATEGORY_VIEW_CANVAS;
      }

GShowGuideLinesAction.prototype.getGroup = function () {
        return "show/canvas";
      }

GShowGuideLinesAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, ","];
      }

GShowGuideLinesAction.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }

GShowGuideLinesAction.prototype.isCheckable = function () {
        return true;
      }

GShowGuideLinesAction.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          var t = e.getView().getViewConfiguration();
          return !!t && !0 === t.guideLinesVisible;
        }
        return false;
      }

GShowGuideLinesAction.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView();
        (e.getViewConfiguration().guideLinesVisible =
          !e.getViewConfiguration().guideLinesVisible),
          e.invalidate(),
          gDesigner.setSetting(
            "guide_lines_visible",
            e.getViewConfiguration().guideLinesVisible
          );
      }

GShowGuideLinesAction.prototype.toString = function () {
        return "[Object GShowGuideLinesAction]";
      }


module.exports = GShowGuideLinesAction;
