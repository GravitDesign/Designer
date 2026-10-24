/**
 * Webpack Module #1345
 * Type: class
 * Name: GChangeAnchorPointsJointTypeMainAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(18)),
      s = o(n(1281)),
      l = n(198);
    class c extends s.default {
      getId() {
        return c.ID;
      }
      getTitle() {
        return c.TITLE;
      }
      getCategory() {
        return r.default.CATEGORY_MODIFY;
      }
      isVisible() {
        return !1;
      }
      getShortcut() {
        return [
          a.GKey.Constant.META,
          a.GKey.Constant.OPTION,
          a.GKey.Constant.A,
        ];
      }
      isEnabled() {
        return (
          gDesigner.getRightSidebars().getActiveSidebar() ===
          l.SidebarsIds.GInspectorSidebar
        );
      }
      toString() {
        return "[Object GChangeAnchorPointsJointTypeMainAction]";
      }
    }
    (c.ID = "modify.change-anchor-points-joint-type"),
      (c.TITLE = new i.GLocaleKey(
        "GChangeAnchorPointsJointTypeMainAction",
        "title"
      )),
      (e.exports = c);
  }