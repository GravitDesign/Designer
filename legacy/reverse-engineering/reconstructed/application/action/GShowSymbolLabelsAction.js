/**
 * GShowSymbolLabelsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShowSymbolLabelsAction() {}

GObject.inherit(GShowSymbolLabelsAction, GAction);

// Prototype methods
GShowSymbolLabelsAction.prototype.getId = function () {
        return r.ID;
      }

GShowSymbolLabelsAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GShowSymbolLabelsAction.prototype.getCategory = function () {
        return i.CATEGORY_VIEW_CANVAS;
      }

GShowSymbolLabelsAction.prototype.getGroup = function () {
        return "show/canvas";
      }

GShowSymbolLabelsAction.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }

GShowSymbolLabelsAction.prototype.isCheckable = function () {
        return true;
      }

GShowSymbolLabelsAction.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          var t = e.getView().getViewConfiguration();
          return !!t && !!t.symbolLabelsVisible;
        }
        return false;
      }

GShowSymbolLabelsAction.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView();
        (e.getViewConfiguration().symbolLabelsVisible =
          !e.getViewConfiguration().symbolLabelsVisible),
          e.invalidate(),
          gDesigner.setSetting(
            "symbol_labels_visible",
            e.getViewConfiguration().symbolLabelsVisible
          );
      }

GShowSymbolLabelsAction.prototype.toString = function () {
        return "[Object GShowSymbolLabelsAction]";
      }



module.exports = GShowSymbolLabelsAction;
