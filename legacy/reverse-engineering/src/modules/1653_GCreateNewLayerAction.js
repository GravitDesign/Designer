/**
 * Webpack Module #1653
 * Type: class
 * Name: GCreateNewLayerAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(31)),
      s = o(n(18)),
      l = n(198),
      c = o(n(1170));
    class d extends r.default {
      getId() {
        return d.ID;
      }
      getTitle() {
        return d.TITLE;
      }
      getCategory() {
        return s.default.CATEGORY_MODIFY;
      }
      isVisible() {
        return !1;
      }
      getShortcut() {
        return [a.GKey.Constant.META, a.GKey.Constant.M];
      }
      isEnabled() {
        return gDesigner.getApplicationManager().isEditingEnabled();
      }
      execute() {
        this._showOutlineSidebar();
        const e = gDesigner.getLeftSidebars();
        (e && e.getSidebar(l.SidebarsIds.GOutlineSidebar)).insertLayer();
      }
      _showOutlineSidebar() {
        const e = gDesigner.getAction(
          "".concat(c.default.ID, ".").concat(l.SidebarsIds.GOutlineSidebar)
        );
        e.isChecked() || e.execute();
      }
      toString() {
        return "[Object GCreateNewLayerAction]";
      }
    }
    (d.ID = "modify.create-new-layer"),
      (d.TITLE = new i.GLocaleKey("GCreateNewLayerAction", "title")),
      (e.exports = d);
  }