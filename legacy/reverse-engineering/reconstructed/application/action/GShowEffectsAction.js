/**
 * GShowEffectsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShowEffectsAction() {}

GObject.inherit(GShowEffectsAction, GAction);

// Prototype methods
GShowEffectsAction.prototype.getId = function () {
        return s.ID;
      }

GShowEffectsAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GShowEffectsAction.prototype.getCategory = function () {
        return a.CATEGORY_VIEW_CANVAS;
      }

GShowEffectsAction.prototype.getGroup = function () {
        return "show/canvas";
      }

GShowEffectsAction.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }

GShowEffectsAction.prototype.isCheckable = function () {
        return true;
      }

GShowEffectsAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "E"];
      }

GShowEffectsAction.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        return !!e && !e.getView().getViewConfiguration().ignoreEffects;
      }

GShowEffectsAction.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (!e) return false;
        var t = e.getView();
        (t.getViewConfiguration().ignoreEffects =
          !t.getViewConfiguration().ignoreEffects),
          t.invalidateAndResetCache(null);
      }

GShowEffectsAction.prototype.toString = function () {
        return "[Object GShowEffectsAction]";
      }


module.exports = GShowEffectsAction;
