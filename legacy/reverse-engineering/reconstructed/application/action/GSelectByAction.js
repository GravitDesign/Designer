/**
 * GSelectByAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GSelectByAction.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_SELECT_SAME;
      }

GSelectByAction.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return false;
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getSelection();
        if (!n || !n.length) return false;
        return this._createPattern(n) !== s.EmptyPattern;
      }

GSelectByAction.prototype._createPattern = function (e) {
        const t = e && e.length;
        if (!t) return s.EmptyPattern;
        const n = this._getValue(e[0]);
        if (n === s.EmptyValue) return s.EmptyPattern;
        for (let o = 1; o < t; o++) {
          const t = e[o],
            i = this._getValue(t);
          if (i === s.EmptyValue) return s.EmptyPattern;
          if (!this._matches(n, i)) return s.EmptyPattern;
        }
        return n;
      }

GSelectByAction.prototype._matches = function (e, t) {
        return (
          e !== s.EmptyPattern &&
          t !== s.EmptyPattern &&
          o.GUtil.equals(e, t, !0)
        );
      }

GSelectByAction.prototype._getValue = function (e) {
        throw "Not implemented";
      }

GSelectByAction.prototype.execute = function () {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getScene(),
          n = e && e.getEditor(),
          a = n && n.getSelection();
        if (!t || !a || !a.length) return;
        const r = this._createPattern(a);
        if (r === s.EmptyPattern) return;
        const l = [];
        t.accept((e) => {
          if (e instanceof o.GElement && !e.hasMixin(o.GAnnotation)) {
            const t = this._createPattern([e]);
            this._matches(r, t) && l.push(e);
          }
        }),
          l.length > 0 &&
            i.GEditor.tryRunTransaction(
              t,
              () => {
                n.updateSelection(!1, l);
              },
              o.GLocale.get(this.getTitle())
            );
      }

GSelectByAction.prototype.toString = function () {
        return "[Object GSelectByAction]";
      }

module.exports = GSelectByAction;
