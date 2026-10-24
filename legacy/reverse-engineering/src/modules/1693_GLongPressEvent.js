/**
 * Webpack Module #1693
 * Type: class
 * Name: GLongPressEvent
 */

function (e, t, n) {
    "use strict";
    n(57), n(3);
    var o = n(1),
      i = n(15),
      a = n(10),
      r = n(40);
    function s() {}
    o.GObject.inherit(s, o.GEvent),
      (s.prototype._startX = 0),
      (s.prototype._startY = 0),
      (s.prototype._timerHandle = null),
      (s.prototype._mouseMove = null),
      (s.prototype._mouseUp = null),
      (s.prototype._mouseDown = null),
      (s.prototype._isTouchDevice = !1),
      (s.prototype._event = null),
      (s.prototype._touching = !1),
      (s.prototype._clearRequestTimeout = function (e) {
        e &&
          (window.cancelAnimationFrame
            ? window.cancelAnimationFrame(e.value)
            : window.webkitCancelAnimationFrame
            ? window.webkitCancelAnimationFrame(e.value)
            : window.webkitCancelRequestAnimationFrame
            ? window.webkitCancelRequestAnimationFrame(e.value)
            : window.mozCancelRequestAnimationFrame
            ? window.mozCancelRequestAnimationFrame(e.value)
            : window.oCancelRequestAnimationFrame
            ? window.oCancelRequestAnimationFrame(e.value)
            : window.msCancelRequestAnimationFrame
            ? window.msCancelRequestAnimationFrame(e.value)
            : clearTimeout(e.value));
      }),
      (s.prototype._requestTimeout = function (e, t) {
        if (
          !(
            window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            (window.mozRequestAnimationFrame &&
              window.mozCancelRequestAnimationFrame) ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame
          )
        )
          return { value: window.setTimeout(e, t) };
        var n = new Date().getTime(),
          o = {},
          i = function () {
            new Date().getTime() - n >= t
              ? e.call()
              : (o.value = requestAnimFrame(i));
          };
        return (o.value = requestAnimFrame(i)), o;
      }),
      (s.prototype._clearLongPressTimer = function () {
        this._clearRequestTimeout(this._timerHandle),
          (this._timerHandle = null);
      }),
      (s.prototype._cancelEvent = function (e) {
        e.stopImmediatePropagation(), e.preventDefault(), e.stopPropagation();
      }),
      (s.prototype._mouseDownHandler = function (e) {
        if (e.defaultPrevented) return void this._clearLongPressTimer();
        let { clientX: t, clientY: n } = e;
        "touchstart" === e.type &&
          e.changedTouches &&
          e.changedTouches[0] &&
          ({ clientX: t, clientY: n } = e.changedTouches[0]),
          (this._startX = t),
          (this._startY = n),
          this._startLongPressTimer(e);
      }),
      (s.prototype._startLongPressTimer = function (e) {
        this._clearLongPressTimer(), (this._event = e);
        var t = e.target,
          n = parseInt(
            t.getAttribute("data-long-press-delay") || a.LONG_PRESS_TIME_OUT,
            10
          );
        this._timerHandle = this._requestTimeout(
          this._fireLongPressEvent.bind(this),
          n
        );
      }),
      (s.prototype._fireLongPressEvent = function () {
        this._clearLongPressTimer();
        var e = this._event.target,
          t = this._isTouchDevice
            ? this._event.touches[0].clientX
            : this._event.clientX,
          n = this._isTouchDevice
            ? this._event.touches[0].clientY
            : this._event.clientY,
          o = e.dispatchEvent(
            new CustomEvent("long-press", {
              bubbles: !0,
              cancelable: !0,
              detail: { clientX: t, clientY: n },
            })
          ),
          i =
            this._event.target.parentElement &&
            this._event.target.parentElement.className &&
            -1 ===
              this._event.target.parentElement.className.indexOf(
                "g-scene-widget"
              );
        if (o && i) {
          const e = (t) => {
            t.isTrusted &&
              (document.removeEventListener("touchend", e, !0),
              document.removeEventListener("mouseup", e, !0),
              this._cancelEvent(t));
          };
          document.addEventListener("touchend", e, !0),
            document.addEventListener("mouseup", e, !0);
        }
      }),
      (s.prototype.startup = function () {
        if (
          ((this._isTouchDevice = i.GPlatform.constructor.isTouchDevice),
          (this._mouseDown = this._isTouchDevice ? "touchstart" : "mousedown"),
          (this._mouseUp = this._isTouchDevice ? "touchend" : "mouseup"),
          (this._mouseMove = this._isTouchDevice ? "touchmove" : "mousemove"),
          document.addEventListener(
            this._mouseUp,
            this._clearLongPressTimer.bind(this),
            !0
          ),
          document.addEventListener(
            this._mouseMove,
            this._mouseMoveHandler.bind(this),
            !0
          ),
          document.addEventListener(
            "wheel",
            this._clearLongPressTimer.bind(this),
            !0
          ),
          document.addEventListener(
            "scroll",
            this._clearLongPressTimer.bind(this),
            !0
          ),
          document.addEventListener(
            this._mouseDown,
            this._mouseDownHandler.bind(this)
          ),
          this._isTouchDevice &&
            i.GPlatform.webBrowser ===
              i.GPlatform.constructor.WebBrowser.Safari)
        ) {
          const e = !(0, r.isPassiveSupported)() || {
            passive: !0,
            capture: !0,
          };
          document.addEventListener(
            "touchstart",
            this._documentTouchStart.bind(this),
            e
          ),
            document.addEventListener(
              "touchend",
              this.documentTouchEnd.bind(this),
              e
            ),
            document.addEventListener(
              "touchcancel",
              this.documentTouchEnd.bind(this),
              e
            ),
            document.addEventListener(
              "mousedown",
              this._documentMouseDown.bind(this),
              !0
            );
        }
      }),
      (s.prototype._documentTouchStart = function (e) {
        e.isTrusted && (this._touching = !0);
      }),
      (s.prototype.documentTouchEnd = function (e) {
        e.isTrusted && (this._touching = !1);
      }),
      (s.prototype._documentMouseDown = function (e) {
        e.isTrusted &&
          this._touching &&
          e.cancelable &&
          e.stopImmediatePropagation();
      }),
      (s.prototype._mouseMoveHandler = function (e) {
        if ("touchmove" === e.type) {
          const { clientX: t, clientY: n } = e.changedTouches[0];
          if (
            Math.abs(t - this._startX) < a.MIN_TOUCH_MOVE_DISTANCE &&
            Math.abs(n - this._startY) < a.MIN_TOUCH_MOVE_DISTANCE
          )
            return;
        }
        this._clearLongPressTimer();
      }),
      (s.prototype.toString = function () {
        return "[Object GLongPressEvent]";
      }),
      new s().startup(),
      (e.exports = s);
  }