/**
 * Webpack Module #1340
 * Type: class
 * Name: GRenameLayerAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(15),
      a = n(1),
      r = o(n(18)),
      s = n(198);
    const l = n(31);
    class c extends l {
      getId() {
        return c.ID;
      }
      getTitle() {
        return c.TITLE;
      }
      getCategory() {
        return r.default.CATEGORY_EDIT;
      }
      getShortcut() {
        return [i.GKey.Constant.OPTION, "R"];
      }
      isVisible() {
        return !1;
      }
      execute() {
        const e = gDesigner.getLeftSidebars().getActiveSidebar(),
          t = gDesigner
            .getLeftSidebars()
            .getSidebar(s.SidebarsIds.GOutlineSidebar),
          n = t.getLayerPanel(),
          { currentFocus: o } = n.data("glayerpanel");
        if (o && e === t.getId()) {
          const e = n.gLayerPanel("getTitleOfLayer", $(o.row));
          e.gAutoEdit("open", e.data("gautoedit"));
        }
      }
      toString() {
        return "[Object GRenameLayerAction]";
      }
    }
    (c.ID = "edit.rename-layer"),
      (c.TITLE = new a.GLocaleKey("GRenameLayerAction", "title")),
      (e.exports = c);
  }