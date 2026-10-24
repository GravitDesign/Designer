/**
 * GOutlineViewAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOutlineViewAction() {}

// Prototype methods
GOutlineViewAction.prototype.getId = function () {
        return c.ID;
      }

GOutlineViewAction.prototype.getTitle = function () {
        return i.GLocale.get(c.TITLE);
      }

GOutlineViewAction.prototype.getCategory = function () {
        return r.default.CATEGORY_VIEW;
      }

GOutlineViewAction.prototype.getGroup = function () {
        return c.GroupID;
      }

GOutlineViewAction.prototype.isCheckable = function () {
        return true;
      }

GOutlineViewAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-out-line" : null;
      }

GOutlineViewAction.prototype.isChecked = function () {
        const e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          const t = e.getView().getViewConfiguration();
          return (
            !!t && t.paintMode === i.GScenePaintConfiguration.PaintMode.Outline
          );
        }
        return false;
      }

GOutlineViewAction.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }

GOutlineViewAction.prototype.getShortcut = function () {
        return [a.GKey.Constant.OPTION, "Y"];
      }

GOutlineViewAction.prototype.execute = function () {
        let e;
        if (
          gDesigner
            .getWindows()
            .getActiveWindow()
            .getView()
            .getViewConfiguration().paintMode ===
          i.GScenePaintConfiguration.PaintMode.Outline
        ) {
          var t = gDesigner.getActiveDocument();
          if (t) {
            var n = t.getScene().getActivePage();
            if (n && !n.isFixedSized())
              e = i.GScenePaintConfiguration.PaintMode.Full;
            else
              e =
                (n.getProperty(l.default.PAGE_CLIP_PROPERTY_NAME, !0) ||
                  l.default.PAGE_CLIP_CONTENT_ENABLED) ===
                l.default.PAGE_CLIP_CONTENT_ENABLED
                  ? i.GScenePaintConfiguration.PaintMode.Output
                  : i.GScenePaintConfiguration.PaintMode.Full;
          } else e = i.GScenePaintConfiguration.PaintMode.Output;
        } else e = i.GScenePaintConfiguration.PaintMode.Outline;
        gDesigner.setPaintMode(e),
          gDesigner.updateGEditorSceneConfigurationPaintMode(e);
      }

GOutlineViewAction.prototype.toString = function () {
        return "[Object GOutlineViewAction]";
      }


module.exports = GOutlineViewAction;
