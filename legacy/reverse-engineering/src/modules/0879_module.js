/**
 * Webpack Module #879
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(4), n(322);
    var o = n(1),
      i = n(15);
    const a = n(880);
    class r extends a {
      constructor() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        super(),
          (this._lastClickPoint = null),
          (this._lastClickEventTime = 0),
          (this._config = Object.assign(
            {
              doubleTapDetection: r.DetectionMode.Target,
              doubleTapThreshold: 0,
              doubleTapDelay: 100,
            },
            e
          ));
      }
      canActivate() {
        return !0;
      }
      start(e, t) {
        (this._doubleTapTouches = null),
          e.areThereTwoTouchPointsOnTheTarget() &&
            (this._doubleTapTouches = Array.from(
              e.getOriginalEvent().targetTouches
            )),
          this._doubleTapTouches ||
            this._config.doubleTapDetection !== r.DetectionMode.Nearby ||
            (this._doubleTapTouches = this._getTwoTouchPointsNearby(
              e.getOriginalEvent().touches
            )),
          this._doubleTapTouches
            ? (this._doubleTapTime = Date.now())
            : e.iterateChangedTouches((e) => {
                this._dispatchEventFromTouch(
                  "mousedown",
                  e,
                  i.GMouseEvent.BUTTON_LEFT,
                  !t.isSwiping()
                );
              });
      }
      end(e, t) {
        if (this._doubleTapTouches) {
          return void (
            this._doubleTapTouches.every((e) => !t.hasActiveIdentifier(e)) &&
            ((this._doubleTapTouches = null),
            Date.now() - this._doubleTapTime <= this._config.doubleTapDelay &&
              e.iterateChangedTouches((e) => {
                this._dispatchEventFromTouch("mouseup", e);
              }))
          );
        }
        if (
          (e.iterateChangedTouches((e) => {
            this._dispatchEventFromTouch(
              "mouseup",
              e,
              i.GMouseEvent.BUTTON_LEFT,
              !t.isSwiping()
            );
          }),
          t.isSwiping())
        )
          return;
        const n = Date.now();
        e.iterateChangedTouches((e) => {
          this._dispatchEventFromTouch("click", e);
        });
        const a = e.getOriginalEvent().changedTouches[0];
        a &&
          (this._doubleTapTouches ||
            (this._isDblClick(a, n) &&
              this._dispatchEventFromTouch("dblclick", a)),
          (this._lastClickEventTime = n),
          (this._lastClickPoint = new o.GPoint(a.screenX, a.screenY)));
      }
      cancel(e) {
        e.iterateChangedTouches((e) => {
          this._dispatchEventFromTouch("mouseup", e);
        });
      }
      _isDblClick(e, t) {
        if (this._lastClickPoint && this._lastClickEventTime) {
          if (
            o.GMath.ptDist(
              e.screenX,
              e.screenY,
              this._lastClickPoint.getX(),
              this._lastClickPoint.getY()
            ) <= 25
          ) {
            if (t - this._lastClickEventTime <= 300) return !0;
          }
        }
        return !1;
      }
      _getTwoTouchPointsNearby(e) {
        const t = e.length;
        if (t > 1)
          for (let n = 0; n < t; n++)
            for (let i = n + 1; i < t; i++) {
              const t = e[n],
                a = e[i];
              if (
                o.GMath.ptDist(t.screenX, t.screenY, a.screenX, a.screenY) <=
                this._config.doubleTapThreshold
              )
                return [t, a];
            }
        return null;
      }
    }
    (r.DetectionMode = { Target: 0, Nearby: 1 }), (e.exports = r);
  }