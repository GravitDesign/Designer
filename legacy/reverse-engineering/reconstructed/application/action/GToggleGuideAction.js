/**
 * GToggleGuideAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GToggleGuideAction(e, t) {
      (this._guideId = e), (this._guideName = t);
    }

GObject.inherit(GToggleGuideAction, GAction);

// Prototype methods
GToggleGuideAction.prototype.isCheckable = function () {
        return true;
      }

GToggleGuideAction.prototype.isChecked = function () {
        var e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          var t = e.getView().getViewConfiguration();
          return !!t && !!t.symbolLabelsVisible;
        }
        return false;
      }

GToggleGuideAction.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView();
        (e.getViewConfiguration().symbolLabelsVisible =
          !e.getViewConfiguration().symbolLabelsVisible),
          e.invalidate(),
          gDesigner.setSetting(
            "symbol_labels_visible",
            e.getViewConfiguration().symbolLabelsVisible
          );
      }

GToggleGuideAction.prototype.toString = function () {
        return "[Object GShowSymbolLabelsAction]";
      }

GToggleGuideAction.prototype.getId = function () {
        return r.ID + "." + this._guideId;
      }

GToggleGuideAction.prototype.getTitle = function () {
        return o.GLocale.get(
          new o.GLocaleKey("GCommonNames", "text.snap-to-action")
        ).replace("%action", this._guideName);
      }

GToggleGuideAction.prototype.getCategory = function () {
        return i.CATEGORY_VIEW_SNAP;
      }

GToggleGuideAction.prototype.getGroup = function () {
        return "snap/guide";
      }


GToggleGuideAction.prototype.isEnabled = function () {
        return !gDesigner.getSetting("snap_disabled");
      }





module.exports = GToggleGuideAction;
