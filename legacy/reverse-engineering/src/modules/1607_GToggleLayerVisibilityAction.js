/**
 * Webpack Module #1607
 * Type: class
 * Name: GToggleLayerVisibilityAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(15),
      a = n(1),
      r = n(198),
      s = o(n(18)),
      l = o(n(31));
    class c extends l.default {
      getId() {
        return c.ID;
      }
      getTitle() {
        return c.TITLE;
      }
      getCategory() {
        return s.default.CATEGORY_VIEW;
      }
      getShortcut() {
        return [i.GKey.Constant.META, "3"];
      }
      isVisible() {
        return !1;
      }
      execute() {
        const e = gDesigner.getLeftSidebars().getActiveSidebar(),
          t = gDesigner
            .getLeftSidebars()
            .getSidebar(r.SidebarsIds.GOutlineSidebar),
          n = t.getLayerPanel(),
          o = n.gLayerPanel("getCurrentFocusedNode");
        if (o && e === t.getId()) {
          const e = n.gLayerPanel("getItem", o);
          e.hasFlag(a.GNode.Flag.Selected) &&
            n.gLayerPanel("toggleHideStatusOfLayerOrItem", e);
        }
      }
      toString() {
        return "[Object GToggleLayerVisibilityAction]";
      }
    }
    (c.ID = "view.toggle-layer-visibility"),
      (c.TITLE = new a.GLocaleKey("GToggleLayerVisibilityAction", "title")),
      (e.exports = c);
  }