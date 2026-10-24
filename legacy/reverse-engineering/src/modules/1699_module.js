/**
 * Webpack Module #1699
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(40);
    function i(e, t, n) {
      (this.element = e),
        (this.mouseMoveCallback = t || o.fakeFunction),
        (this.mouseUpCallback = n || o.fakeFunction),
        this.init();
    }
    (i.prototype.init = function () {
      (this._handleMouseDown = this._handleMouseDown.bind(this)),
        (this._onDragStart = this._onDragStart.bind(this)),
        (this._onMouseUp = this._onMouseUp.bind(this)),
        (this._onMouseMove = this._onMouseMove.bind(this)),
        this.element.addEventListener("mousedown", this._handleMouseDown),
        (this.element.style.position = "absolute");
    }),
      (i.prototype._updateElementOffset = function (e, t) {
        const n = this.element.getBoundingClientRect();
        (this._offsetX = e - n.left), (this._offsetY = t - n.top);
      }),
      (i.prototype._resetElementOffset = function () {
        (this._offsetX = 0), (this._offsetY = 0);
      }),
      (i.prototype._hasElementOffset = function () {
        return !!this._offsetX && !!this._offsetY;
      }),
      (i.prototype._handleMouseDown = function (e) {
        e.preventDefault(),
          e.stopPropagation(),
          this._resetElementOffset(),
          document.addEventListener("mousemove", this._onMouseMove),
          document.addEventListener("mouseup", this._onMouseUp),
          this.element.addEventListener("dragstart", this._onDragStart),
          this.moveTo(e.pageX, e.pageY);
      }),
      (i.prototype.moveTo = function (e, t, n) {
        n
          ? this._resetElementOffset()
          : this._hasElementOffset() || this._updateElementOffset(e, t),
          this.mouseMoveCallback({
            elementX: e - this._offsetX,
            elementY: t - this._offsetY,
            centerX: e - this._offsetX / 2,
            centerY: t - this._offsetY / 2,
            pageX: e,
            pageY: t,
          });
      }),
      (i.prototype._onMouseMove = function (e) {
        this.moveTo(e.pageX, e.pageY);
      }),
      (i.prototype._onDragStart = function () {
        return !1;
      }),
      (i.prototype._onMouseUp = function (e) {
        this.unmount(), this.mouseUpCallback(e);
      }),
      (i.prototype.unmount = function () {
        document.removeEventListener("mousemove", this._onMouseMove),
          document.removeEventListener("mouseup", this._onMouseUp),
          this.element.removeEventListener("mousedown", this._handleMouseDown),
          this.element.removeEventListener("dragstart", this._onDragStart);
      }),
      (e.exports = i);
  }