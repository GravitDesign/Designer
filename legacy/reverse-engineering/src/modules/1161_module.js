/**
 * Webpack Module #1161
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.handleDragForDeleteIcon = function (e, t, n, o, i, a) {
        if (!n) return !1;
        var r = !1;
        if (e.clientX < n.left || e.clientY < n.top || e.clientY > n.top + o) {
          var s = gDesigner.isTouchEnabled() ? 30 : 10,
            l = e.clientX - i - t.outerWidth() - s,
            c = e.clientY - a;
          "none" === t.css("display") && t.css("display", "block"),
            t.css({ top: c, left: l }),
            (r = !0);
        } else t.css("display", "none"), (r = !1);
        return r;
      });
  }