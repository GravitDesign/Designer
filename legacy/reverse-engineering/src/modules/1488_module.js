/**
 * Webpack Module #1488
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(57), n(3), n(4), n(32), n(33);
    var i,
      a = n(10),
      r = n(40),
      s = o(n(565));
    !(function (e) {
      var t = (function () {
        function e() {
          (this._dropEffect = "move"),
            (this._effectAllowed = "all"),
            (this._data = {});
        }
        return (
          Object.defineProperty(e.prototype, "dropEffect", {
            get: function () {
              return this._dropEffect;
            },
            set: function (e) {
              this._dropEffect = e;
            },
            enumerable: !0,
            configurable: !0,
          }),
          Object.defineProperty(e.prototype, "effectAllowed", {
            get: function () {
              return this._effectAllowed;
            },
            set: function (e) {
              this._effectAllowed = e;
            },
            enumerable: !0,
            configurable: !0,
          }),
          Object.defineProperty(e.prototype, "types", {
            get: function () {
              return Object.keys(this._data);
            },
            enumerable: !0,
            configurable: !0,
          }),
          (e.prototype.clearData = function (e) {
            null != e ? delete this._data[e] : (this._data = null);
          }),
          (e.prototype.getData = function (e) {
            return this._data[e] || "";
          }),
          (e.prototype.setData = function (e, t) {
            this._data[e] = t;
          }),
          (e.prototype.setDragImage = function (e, t, o) {
            var i = n._instance;
            (i._imgCustom = e), (i._imgOffset = { x: t, y: o });
          }),
          e
        );
      })();
      e.DataTransfer = t;
      var n = (function () {
        function e() {
          if (e._instance) throw "DragDropTouch instance already created.";
          var t = (0, r.isPassiveSupported)();
          if ("ontouchstart" in document || "undefined" != typeof TouchEvent) {
            (this._documentTouchStart = this._documentTouchStart.bind(this)),
              (this._documentTouchEnd = this._documentTouchEnd.bind(this)),
              (this._documentDragStart = this._documentDragStart.bind(this)),
              document.addEventListener(
                "touchstart",
                this._documentTouchStart,
                !t || { passive: !0, capture: !0 }
              ),
              document.addEventListener(
                "touchend",
                this._documentTouchEnd,
                !t || { passive: !0, capture: !0 }
              ),
              document.addEventListener(
                "touchcancel",
                this._documentTouchEnd,
                !t || { passive: !0, capture: !0 }
              ),
              document.addEventListener(
                "dragstart",
                this._documentDragStart,
                !0
              );
            var n = document;
            (this._touchstart = this._touchstart.bind(this)),
              (this._touchmove = this._touchmove.bind(this)),
              (this._touchend = this._touchend.bind(this));
            var o = !!t && { passive: !1, capture: !1 };
            n.addEventListener("touchstart", this._touchstart, o);
          }
        }
        return (
          (e.getInstance = function () {
            return e._instance;
          }),
          (e.prototype._touching = !1),
          (e.prototype._documentTouchStart = function (e) {
            e.isTrusted && (this._touching = !0);
          }),
          (e.prototype._documentTouchEnd = function (e) {
            e.isTrusted && ((this._touching = !1), this._touchend(e));
          }),
          (e.prototype._documentDragStart = function (e) {
            e.isTrusted &&
              this._touching &&
              e.cancelable &&
              (e.preventDefault(), e.stopPropagation());
          }),
          (e.prototype._touchstart = function (t) {
            var n = this;
            if (this._shouldHandle(t)) {
              this._reset();
              var o = this._closestDraggable(t.target);
              o &&
                ((e._ISPRESSHOLDMODE =
                  parseInt(o.dataset.dragMode) === s.default.PRESS_AND_HOLD),
                (this._dragSource = o),
                this._updateImageOffset(t),
                (this._startTouchTime = new Date().getTime()),
                (this._ptDown = this._getPoint(t)),
                (this._lastTouch = t),
                this._dragSource.addEventListener(
                  "touchmove",
                  this._touchmove,
                  !0
                ),
                this._dragSource.addEventListener(
                  "touchend",
                  this._touchend,
                  !0
                ),
                this._dragSource.addEventListener(
                  "touchcancel",
                  this._touchend,
                  !0
                ),
                e._ISPRESSHOLDMODE &&
                  (this._pressHoldInterval = setTimeout(function () {
                    (n._isDragEnabled = !0),
                      (n._dragInitEvent = t),
                      n._touchmove(t);
                  }, e._PRESSHOLDAWAIT)));
            }
          }),
          (e.prototype._touchmove = function (t) {
            if (this._shouldCancelPressHoldMove(t)) this._reset();
            else if (
              this._shouldHandleMove(t) ||
              this._shouldHandlePressHoldMove(t)
            ) {
              var n = this._getTarget(t);
              if (
                (!this._img &&
                  this._dragSource &&
                  (t.cancelable && t.preventDefault(),
                  e._ISPRESSHOLDMODE &&
                    (this._dispatchEvent(
                      this._dragInitEvent || t,
                      "draginit",
                      this._dragSource
                    ),
                    this._dragSource.classList.add("g-draggable"),
                    this._dragSource.parentElement &&
                      this._dragSource.parentElement.classList.add(
                        "g-draggable-parent"
                      ))),
                !this._img && this._dragSource && this._shouldStartDragging(t))
              )
                t.cancelable && t.preventDefault(),
                  this._dragSource.classList.remove("g-draggable"),
                  this._dragSource.parentElement &&
                    this._dragSource.parentElement.classList.remove(
                      "g-draggable-parent"
                    ),
                  this._dispatchEvent(t, "dragstart", this._dragSource) ||
                    (this._createImage(t),
                    this._dispatchEvent(t, "dragenter", n));
              if (this._img) {
                const e = gDesigner.getContextMenu();
                e && e.close(),
                  (this._lastTouch = t),
                  t.cancelable && t.preventDefault(),
                  this._dispatchEvent(t, "drag", this._dragSource),
                  n != this._lastTarget &&
                    (this._dispatchEvent(t, "dragenter", n),
                    this._dispatchEvent(
                      this._lastTouch,
                      "dragleave",
                      this._lastTarget
                    ),
                    (this._lastTarget = n)),
                  this._moveImage(t),
                  (this._isDropZone = this._dispatchEvent(t, "dragover", n));
              }
            } else this._img && this._destroyImage();
          }),
          (e.prototype._touchend = function (e) {
            try {
              this._shouldHandle(e) &&
                this._dragSource &&
                ("touchcancel" !== e.type &&
                  this._isDropZone &&
                  this._dispatchEvent(
                    this._lastTouch,
                    "drop",
                    this._lastTarget
                  ),
                this._dispatchEvent(
                  this._lastTouch,
                  "dragend",
                  this._dragSource
                ));
            } finally {
              this._reset();
            }
          }),
          (e.prototype._shouldHandle = function (e) {
            if (e.touches && 1 === e.touches.length) {
              var t = e.touches[0] && e.touches[0].target;
              if (t && t.hasAttribute("draggable") && !t.draggable) return !1;
            }
            return (
              e && !e.defaultPrevented && e.touches && e.touches.length < 2
            );
          }),
          (e.prototype._shouldHandleMove = function (t) {
            return !e._ISPRESSHOLDMODE && t.cancelable && this._shouldHandle(t);
          }),
          (e.prototype._shouldHandlePressHoldMove = function (t) {
            return (
              e._ISPRESSHOLDMODE &&
              this._isDragEnabled &&
              t &&
              t.touches &&
              t.touches.length
            );
          }),
          (e.prototype._shouldCancelPressHoldMove = function (t) {
            return (
              e._ISPRESSHOLDMODE &&
              !this._isDragEnabled &&
              this._getDelta(t) > e._PRESSHOLDMARGIN
            );
          }),
          (e.prototype._shouldStartDragging = function (t) {
            var n = this._getDelta(t);
            return (
              (n > e.DRAG_MOVE_THRESHOLD &&
                n <= e.DRAG_MOVE_LIMIT &&
                new Date().getTime() - this._startTouchTime >=
                  e.DRAG_MOVE_DELAY) ||
              (e._ISPRESSHOLDMODE && n >= e._PRESSHOLDTHRESHOLD)
            );
          }),
          (e.prototype._reset = function () {
            this._destroyImage(),
              this._dragSource &&
                (this._dragSource.classList.remove("g-draggable"),
                this._dragSource.parentElement &&
                  this._dragSource.parentElement.classList.remove(
                    "g-draggable-parent"
                  ),
                this._dragSource.removeEventListener(
                  "touchmove",
                  this._touchmove
                ),
                this._dragSource.removeEventListener(
                  "touchend",
                  this._touchend
                ),
                this._dragSource.removeEventListener(
                  "touchcancel",
                  this._touchend
                )),
              (this._dragSource = null),
              (this._startTouchTime = 0),
              (this._lastTouch = null),
              (this._lastTarget = null),
              (this._ptDown = null),
              (this._isDragEnabled = !1),
              (this._isDropZone = !1),
              (this._dataTransfer = new t()),
              this._pressHoldInterval && clearTimeout(this._pressHoldInterval);
          }),
          (e.prototype._getPoint = function (e, t) {
            return (
              e && e.touches && (e = e.touches[0]),
              { x: t ? e.pageX : e.clientX, y: t ? e.pageY : e.clientY }
            );
          }),
          (e.prototype._getDelta = function (t) {
            if (e._ISPRESSHOLDMODE && !this._ptDown) return 0;
            var n = this._getPoint(t);
            return (
              Math.abs(n.x - this._ptDown.x) + Math.abs(n.y - this._ptDown.y)
            );
          }),
          (e.prototype._getTarget = function (e) {
            for (
              var t = this._getPoint(e),
                n = document.elementFromPoint(t.x, t.y);
              n && "none" == getComputedStyle(n).pointerEvents;

            )
              n = n.parentElement;
            return n;
          }),
          (e.prototype._translate = function (e, t, n) {
            e.style.transform = "translate3d("
              .concat(t, "px, ")
              .concat(n, "px, 0px)");
          }),
          (e.prototype._createImage = function (t) {
            this._img && this._destroyImage();
            var n = this._imgCustom || this._dragSource;
            (this._img = n.cloneNode(!0)),
              this._copyStyle(n, this._img),
              e._ISPRESSHOLDMODE &&
                this._img.classList.add("g-draggable-drag-image"),
              (this._img.style.left = this._img.style.top = "0px"),
              this._translate(this._img, -9999, -9999);
            var o = this._img.style;
            (o.position = "absolute"),
              (o.pointerEvents = "none"),
              (o["touch-action"] = "none"),
              (o.zIndex = "999999"),
              this._imgCustom ||
                (this._img.style.opacity = e._OPACITY.toString()),
              this._moveImage(t),
              document.body.appendChild(this._img);
          }),
          (e.prototype._updateImageOffset = function (e) {
            var t = (
                this._imgCustom || this._dragSource
              ).getBoundingClientRect(),
              n = this._getPoint(e);
            this._imgOffset = { x: n.x - t.left, y: n.y - t.top };
          }),
          (e.prototype._destroyImage = function () {
            this._img &&
              this._img.parentElement &&
              this._img.parentElement.removeChild(this._img),
              (this._img = null),
              (this._imgCustom = null);
          }),
          (e.prototype._moveImage = function (e) {
            if (this._img) {
              var t = this._getPoint(e);
              this._translate(
                this._img,
                t.x - this._imgOffset.x,
                t.y - this._imgOffset.y
              );
            }
          }),
          (e.prototype._copyProps = function (e, t, n) {
            for (var o = 0; o < n.length; o++) {
              var i = n[o];
              e[i] = t[i];
            }
          }),
          (e.prototype._copyStyle = function (t, n) {
            if (
              (e._rmvAtts.forEach(function (e) {
                n.removeAttribute(e);
              }),
              n.classList.add(e._CUSTOM_DRAGGING_ELEMENT_CLASS),
              t instanceof HTMLCanvasElement)
            ) {
              var o = t,
                i = n;
              (i.width = o.width),
                (i.height = o.height),
                i.getContext("2d").drawImage(o, 0, 0);
            }
            for (var a = getComputedStyle(t), r = 0; r < a.length; r++) {
              var s = a[r];
              s.indexOf("transition") < 0 && (n.style[s] = a[s]);
            }
            n.style.pointerEvents = "none";
            for (r = 0; r < t.children.length; r++)
              this._copyStyle(t.children[r], n.children[r]);
          }),
          (e.prototype._dispatchEvent = function (t, n, o) {
            try {
              if (t && o) {
                var i = document.createEvent("Event"),
                  a = t.touches ? t.touches[0] : t;
                if (
                  (i.initEvent(n, !0, !0),
                  (i.button = 0),
                  (i.which = i.buttons = 1),
                  this._copyProps(i, t, e._kbdProps),
                  this._copyProps(i, a, e._ptProps),
                  (i.dataTransfer = this._dataTransfer),
                  !i.layerX && !i.layerY)
                ) {
                  var r = o.getBoundingClientRect(),
                    s = i.clientX - r.left,
                    l = i.clientY - r.top;
                  (i.layerX = s), (i.layerY = l);
                }
                const c = o.dispatchEvent(i);
                return i.defaultPrevented || !1 === c;
              }
            } catch (t) {
              console.warn("DragDropTouch dispatch event error", t);
            }
            return !1;
          }),
          (e.prototype._closestDraggable = function (e) {
            for (; e; e = e.parentElement)
              if (e.hasAttribute("draggable") && e.draggable) return e;
            return null;
          }),
          e
        );
      })();
      (n._instance = new n()),
        (n._OPACITY = 0.5),
        (n._ISPRESSHOLDMODE = !1),
        (n._PRESSHOLDAWAIT = a.LONG_PRESS_TIME_OUT),
        (n._PRESSHOLDMARGIN = 25),
        (n._PRESSHOLDTHRESHOLD = a.MIN_TOUCH_MOVE_DISTANCE),
        (n.DRAG_MOVE_THRESHOLD = a.MIN_TOUCH_MOVE_DISTANCE || 0),
        (n.DRAG_MOVE_LIMIT = 25),
        (n.DRAG_MOVE_DELAY = 100),
        (n._rmvAtts = "draggable".split(",")),
        (n._CUSTOM_DRAGGING_ELEMENT_CLASS = "g-dragging-shadow-element"),
        (n._kbdProps = "altKey,ctrlKey,metaKey,shiftKey".split(",")),
        (n._ptProps = "pageX,pageY,clientX,clientY,screenX,screenY".split(",")),
        (e.DragDropTouch = n);
    })(i || (i = {}));
  }