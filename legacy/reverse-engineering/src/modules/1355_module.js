/**
 * Webpack Module #1355
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(4), n(13);
    var o = n(1);
    function i(e, t, n, o, i, a, r, s, l, c) {
      (this._container = e),
        (this._renderer = t),
        (this._nodeStyle = n),
        (this._expandStyle = o),
        (this._nodeClick = i),
        (this._nodeExpand = a),
        (this._upSpan1Style = r),
        (this._upSpan2Style = s),
        (this._downSpan1Style = l),
        (this._downSpan2Style = c);
    }
    (i.GSimpleTreeNodeNamed = function (e) {
      this.id = e;
    }),
      (i.GSimpleTreeNodeNamed.prototype.id = -1),
      (i.GSimpleTreeNodeNamed.prototype.virtualNode = !1),
      (i.GSimpleTreeNodeNamed.prototype._depth = void 0),
      (i.GSimpleTreeNodeNamed.prototype.isVisible = function () {
        return !0;
      }),
      (i.EXPAND_ID = o.GUtil.uuid()),
      (i.COLLAPSE_ID = o.GUtil.uuid()),
      (i.prototype._container = null),
      (i.prototype._renderer = null),
      (i.prototype._nodeStyle = null),
      (i.prototype._expandStyle = null),
      (i.prototype._nodeClick = null),
      (i.prototype._nodeExpand = null),
      (i.prototype._upSpan1Style = null),
      (i.prototype._upSpan2Style = null),
      (i.prototype._downSpan1Style = null),
      (i.prototype._downSpan2Style = null),
      (i.prototype._updateCount = 0),
      (i.prototype._nodes = []),
      (i.prototype._invalidation = null),
      (i.prototype.refresh = function () {
        this.requestInvalidation();
      }),
      (i.prototype._checkTreeSanity = function () {
        return !0;
      }),
      (i.prototype._isInvalidationBlocked = function () {
        return !0;
      }),
      (i.prototype._beforeInvalidationStart = async function (e) {}),
      (i.prototype._afterInvalidationEnd = function (e) {}),
      (i.prototype.requestInvalidation = function (e, t) {
        if (null === this._invalidation) {
          var n = $(this._container);
          if (!this._checkTreeSanity()) return;
          this._invalidation = setTimeout(() => {
            if (this._isInvalidationBlocked())
              return (
                (this._invalidation = null), void this.requestInvalidation(500)
              );
            this._beforeInvalidationStart(t).then(() => {
              n.empty();
              let e = document.createDocumentFragment();
              for (let t = 0; t < this._nodes.length; t++) {
                let n = this._newNode(this._nodes[t]),
                  o = this._renderer(this._nodes[t], n[0]);
                $(e).append(n),
                  n.hasClass("last-row") &&
                    $(e).append($("<div/>").addClass("last-row-division")),
                  o && o.length && n.before(o);
              }
              n.append(e),
                this._afterInvalidationEnd(),
                (this._invalidation = null);
            });
          }, e || 1);
        }
      }),
      (i.prototype.expandAndFocus = function () {}),
      (i.prototype.beginUpdate = function () {
        this._updateCount++;
      }),
      (i.prototype.endUpdate = function (e) {
        (this._updateCount = Math.max(0, this._updateCount - 1)),
          0 === this._updateCount && this.requestInvalidation(0, e);
      }),
      (i.prototype._newNode = function (e) {
        return $("<div>")
          .addClass(this._nodeStyle)
          .attr("id", e.id)
          .css("padding-left", 25 * e._depth)
          .on("click", (t) => {
            t.stopPropagation(), this._nodeClick(e);
          });
      }),
      (i.prototype.appendNode = function (e, t, n) {
        var o = e ? this._nodes.indexOf(e) : 0;
        if (o < 0) console.error("no parent found");
        else if (this._nodes.indexOf(t) >= 0)
          console.error("node already added");
        else {
          var i,
            a = e ? e._depth : -1;
          if (((t._depth = a + 1), n))
            for (var r = (i = e ? o + 1 : 0); r < this._nodes.length; r++) {
              if (this._nodes[r]._depth <= a || this._nodes[r].virtualNode) {
                i = Math.max(0, r - 1);
                break;
              }
              i = r;
            }
          else i = e ? o : 0;
          var s = null;
          (s =
            i >= this._nodes.length
              ? this._nodes.length
                ? this._nodes[this._nodes.length - 1]
                : null
              : this._nodes[i]),
            this.insertNodeAfter(s, t);
        }
      }),
      (i.prototype.prependNode = function (e, t) {
        if ((e ? this._nodes.indexOf(e) : 0) < 0)
          console.error("no parent found");
        else if (this._nodes.indexOf(t) >= 0)
          console.error("node already added");
        else {
          var n = e ? e._depth : -1;
          (t._depth = n + 1), this.insertNodeAfter(e, t);
        }
      }),
      (i.prototype.removeNode = function (e) {
        var t = this._nodes.indexOf(e);
        if (!(t < 0)) {
          var n = $(this._container);
          n.find("#" + this._nodes[t].id).remove(), this._nodes.splice(t, 1);
          for (var o = this._nodes[t]; o && e._depth < o._depth; )
            n.find("#" + o.id).remove(),
              this._nodes.splice(t, 1),
              (o = this._nodes[t]);
        }
      }),
      (i.prototype.insertNodeAfter = function (e, t) {
        var n = e ? this._nodes.indexOf(e) : this._nodes.length;
        if (n < 0) console.error("no ref node found");
        else if (this._nodes.indexOf(t) >= 0)
          console.error("node already added");
        else {
          var o = e ? e._depth : 0;
          if (void 0 === t._depth) t._depth = o;
          else if (t._depth > o) return void this._nodes.splice(n + 1, 0, t);
          for (
            n += 1;
            this._nodes[n] &&
            (this._nodes[n]._depth > o ||
              (this._nodes[n].virtualNode &&
                (0 === o || this._nodes[n]._depth < o)));

          )
            n++;
          n >= this._nodes.length
            ? this._nodes.push(t)
            : this._nodes.splice(n, 0, t);
        }
      }),
      (i.prototype.insertNodeBefore = function (e, t) {
        var n = e ? this._nodes.indexOf(e) : -1;
        if (n < 0) console.error("no ref node found");
        else if (this._nodes.indexOf(t) >= 0)
          console.error("node already added");
        else {
          var o = e ? e._depth : 0;
          for (
            void 0 === t._depth && (t._depth = o);
            n >= 0 && (this._nodes[n]._depth > o || this._nodes[n].virtualNode);

          )
            n--;
          n < 0 ? this._nodes.unshift(t) : this._nodes.splice(n, 0, t);
        }
      }),
      (i.prototype.clean = function () {
        (this._nodes = []), this.requestInvalidation();
      }),
      (i.prototype.isPendingInvalidation = function () {
        return null !== this._invalidation;
      }),
      (i.prototype.refresh = function () {}),
      (e.exports = i);
  }