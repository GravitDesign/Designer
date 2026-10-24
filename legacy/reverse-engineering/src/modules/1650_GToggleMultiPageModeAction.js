/**
 * Webpack Module #1650
 * Type: class
 * Name: GToggleMultiPageModeAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(31)),
      s = o(n(18)),
      l = n(198);
    class c extends r.default {
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
        return [a.GKey.Constant.F6];
      }
      isVisible() {
        return !1;
      }
      execute() {
        const e = gDesigner.getLeftSidebars(),
          t = e && e.getSidebar(l.SidebarsIds.GOutlineSidebar);
        t && t.toggleMultiPageMode();
      }
      toString() {
        return "[Object GToggleMultiPageModeAction]";
      }
    }
    (c.ID = "view.toggle-multi-page-mode"),
      (c.TITLE = new i.GLocaleKey("GToggleMultiPageModeAction", "title")),
      (e.exports = c);
  }