/**
 * Webpack Module #609
 * Type: class
 * Name: GSelectByAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(53);
    const a = n(18),
      r = n(106);
    function s(e, t) {
      r.call(this), (this._id = e), (this._title = t);
    }
    o.GObject.inherit(s, r),
      (s.EmptyValue = {}),
      (s.EmptyPattern = {}),
      (s.prototype._id = null),
      (s.prototype._title = null),
      (s.prototype.getId = function () {
        return this._id;
      }),
      (s.prototype.getTitle = function () {
        return this._title;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_SELECT_SAME;
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getSelection();
        if (!n || !n.length) return !1;
        return this._createPattern(n) !== s.EmptyPattern;
      }),
      (s.prototype._createPattern = function (e) {
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
      }),
      (s.prototype._matches = function (e, t) {
        return (
          e !== s.EmptyPattern &&
          t !== s.EmptyPattern &&
          o.GUtil.equals(e, t, !0)
        );
      }),
      (s.prototype._getValue = function (e) {
        throw "Not implemented";
      }),
      (s.prototype.execute = function () {
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
      }),
      (s.prototype.toString = function () {
        return "[Object GSelectByAction]";
      }),
      (e.exports = s);
  }