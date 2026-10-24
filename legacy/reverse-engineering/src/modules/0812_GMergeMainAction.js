/**
 * Webpack Module #812
 * Type: class
 * Name: GMergeMainAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(18)),
      s = o(n(31)),
      l = o(n(1281));
    class c extends l.default {
      static getActionSubId(e) {
        return "".concat(c.ID, ".").concat(e);
      }
      static getValidItems(e) {
        let t = [];
        if (e instanceof i.GGroup || e instanceof i.GCompoundShape)
          for (let n = e.getFirstChild(); null !== n; n = n.getNext()) {
            const e = c.getValidItems(n);
            t = t.concat(e);
          }
        else
          e.hasMixin(i.GVertexSource) &&
            e.validateInsertion(new i.GCompoundShape()) &&
            t.push(e);
        return t;
      }
      getId() {
        return c.ID;
      }
      getTitle() {
        return c.TITLE;
      }
      getCategory() {
        return r.default.CATEGORY_MODIFY;
      }
      getGroup() {
        return "structure-group";
      }
      isVisible() {
        return !1;
      }
      getShortcut() {
        return [a.GKey.Constant.SHIFT, a.GKey.Constant.META, a.GKey.Constant.Y];
      }
      getIcon() {
        return super.getIcon.call(this);
      }
      isEnabled() {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getIndividualSelection();
        if (!n || !n.length) return !1;
        let o = [];
        for (let e = 0; e < n.length; ++e) {
          const t = n[e];
          if (((o = o.concat(c.getValidItems(t))), o.length > 1)) return !0;
        }
        if (1 === o.length) {
          const e = o[0];
          return (
            e instanceof i.GCompoundShape ||
            e.getParent() instanceof i.GCompoundShape
          );
        }
        return !1;
      }
      getShortcutHint(e) {
        return s.default.prototype.getShortcutHint.call(this, e);
      }
      execute() {
        const e = c.getActionSubId(this.Type.Union);
        gDesigner.executeAction(e);
      }
      toString() {
        return "[Object GMergeMainAction]";
      }
    }
    (c.ID = "modify.merge"),
      (c.TITLE = new i.GLocaleKey("GMergeMainAction", "title")),
      (e.exports = c);
  }