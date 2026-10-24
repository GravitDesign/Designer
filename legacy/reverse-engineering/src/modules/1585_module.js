/**
 * Webpack Module #1585
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = n(10),
      s = o(n(880)),
      l = o(n(1189));
    let c = !1,
      d = 0,
      u = 0,
      p = 0,
      g = 0,
      h = 0,
      f = 0,
      m = 0,
      y = 0,
      v = 0,
      _ = 0,
      b =
        i.GPaintCanvas.getScreenDPI() *
        a.GSceneWidget.options.pinchToZoomFactor,
      w = 2 / i.GPaintCanvas.getScreenDPI();
    class C extends s.default {
      canActivate(e) {
        return e.areThereTwoTouchPointsOnTheTarget();
      }
      start(e) {
        const t = e.getOriginalEvent(),
          n = t.targetTouches[0];
        (h = d = m = n.clientX),
          (f = u = y = n.clientY),
          (c = e.areThereTwoTouchPointsOnTheTarget());
        const o = gDesigner.getActiveView();
        if (!o) return;
        const i = gDesigner.getContextMenu();
        i && i.close(),
          (this._twoFingersState = new l.default()),
          this._twoFingersState.update(t);
        let a = t.targetTouches[1];
        (p = v = a.clientX),
          (g = _ = a.clientY),
          o.startTouchMode(),
          (this._moved = !1);
      }
      move(e) {
        if (!this._twoFingersState) return !1;
        const t = e.getOriginalEvent();
        this._twoFingersState.update(t),
          (this._moved = !0),
          t.cancelable && (t.preventDefault(), t.stopPropagation());
        const n = gDesigner.getActiveView();
        if (!n) return !0;
        const o = t.targetTouches[0],
          s = t.targetTouches[1];
        if (!s) return !0;
        const { clientX: l, clientY: h } = o,
          { clientX: f, clientY: C } = s;
        if (
          d &&
          ((c =
            i.GMath.isEqualEps(d, l, r.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE) &&
            i.GMath.isEqualEps(u, h, r.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE) &&
            i.GMath.isEqualEps(p, f, r.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE) &&
            i.GMath.isEqualEps(g, C, r.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE)),
          !c)
        ) {
          const e = i.GMath.ptDist(m, y, v, _),
            t = i.GMath.ptDist(l, h, f, C);
          if (i.GMath.isEqualEps(e, t, r.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE)) {
            const e = ((0 == m ? 0 : l - m) + (0 == v ? 0 : f - v)) / w,
              t = ((0 == y ? 0 : h - y) + (0 == _ ? 0 : C - _)) / w;
            n.scrollBy(-e, -t);
          } else {
            const r = t - e;
            let l =
              gDesigner.getWindows().getActiveWindow().getView().getZoom() +
              r / b;
            const c = new Touch({
              identifier: i.GUtil.uuid(),
              pageX: (o.pageX + s.pageX) / 2,
              pageY: (o.pageY + s.pageY) / 2,
              target: o.target,
            });
            l =
              l < a.GSceneWidget.options.minZoomFactor
                ? a.GSceneWidget.options.minZoomFactor
                : l;
            var x = n
              .getViewTransform()
              .mapPoint(n._convertClientPositionFromMousePosition(c));
            n.zoomAt(x, l);
          }
        }
        return (m = l), (y = h), (v = f), (_ = C), !0;
      }
      end(e) {
        if (
          (this._twoFingersState &&
            this._twoFingersState.update(e.getOriginalEvent()),
          !this._twoFingersState ||
            !this._twoFingersState.hasActiveIdentifiers())
        ) {
          this._twoFingersState = null;
          const e = gDesigner.getActiveView();
          e && e.endTouchMode();
        }
        d = u = p = g = m = y = v = _ = 0;
        const t = !!this._moved;
        return (this._moved = !1), t;
      }
    }
    e.exports = C;
  }