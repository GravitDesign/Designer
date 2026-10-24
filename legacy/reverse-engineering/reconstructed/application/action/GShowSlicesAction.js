/**
 * GShowSlicesAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShowSlicesAction() {}

GObject.inherit(GShowSlicesAction, GAction);

// Prototype methods
GShowSlicesAction.prototype.getId = function () {
        return r.ID;
      }

GShowSlicesAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GShowSlicesAction.prototype.getCategory = function () {
        return i.CATEGORY_VIEW_CANVAS;
      }

GShowSlicesAction.prototype.getGroup = function () {
        return "show/canvas";
      }

GShowSlicesAction.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }

GShowSlicesAction.prototype.isCheckable = function () {
        return true;
      }

GShowSlicesAction.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          var t = e.getView().getViewConfiguration();
          return !!t && !0 === t.slices;
        }
        return false;
      }

GShowSlicesAction.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView();
        (e.getViewConfiguration().slices = !e.getViewConfiguration().slices),
          e.invalidateAndResetCache(null);
      }

GShowSlicesAction.prototype.toString = function () {
        return "[Object GShowSlicesAction]";
      }


module.exports = GShowSlicesAction;
