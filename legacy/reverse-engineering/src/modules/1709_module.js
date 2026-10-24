/**
 * Webpack Module #1709
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o(e, t, n, o) {
      (n = n || 0),
        (o = o || 30),
        (this._scroller = document.createElement("div")),
        this._scroller.classList.add("vscroller"),
        (this._container = e),
        (this._container.style.overflow = "auto"),
        (this._container.style.position = "relative"),
        this._container.classList.add("g-virtual-list"),
        this._container.appendChild(this._scroller),
        this._container.addEventListener("scroll", this._onScroll.bind(this)),
        this.beginUpdate(),
        t && this._renderer(t),
        o && this.rowHeight(o),
        n && this.rowCount(n),
        this.endUpdate();
    }
    n(57),
      n(3),
      (o.prototype._renderer = null),
      (o.prototype._rowHeight = 0),
      (o.prototype._rowCount = 0),
      (o.prototype._visibleRows = 0),
      (o.prototype._cachedRows = 0),
      (o.prototype._scroller = null),
      (o.prototype._updateCounter = 0),
      (o.prototype._lastRenderScrollTop = 0),
      (o.prototype._lastCleanedTime = 0),
      (o.prototype._cleanViewportTimerId = null),
      (o.prototype._renderer = function (e) {
        return arguments.length
          ? ((this._renderer = e), this._render(), this)
          : this._renderer;
      }),
      (o.prototype.rowHeight = function (e) {
        return arguments.length
          ? ((this._rowHeight = e),
            this._updateVisibleRows(),
            this._updateScroller(),
            this._render(),
            this)
          : this._rowHeight;
      }),
      (o.prototype.rowCount = function (e) {
        return arguments.length
          ? ((this._rowCount = e), this._updateScroller(), this._render(), this)
          : this._rowCount;
      }),
      (o.prototype.beginUpdate = function () {
        this._updateCounter++;
      }),
      (o.prototype.endUpdate = function () {
        0 == --this._updateCounter && this._render();
      }),
      (o.prototype.refresh = function () {
        return (
          this._updateVisibleRows(),
          this._updateScroller(),
          this._render(),
          this
        );
      }),
      (o.prototype._render = function () {
        if (0 === this._updateCounter) {
          var e = this._container.scrollTop,
            t = parseInt(e / this._rowHeight) - this._visibleRows;
          this._renderViewport(t < 0 ? 0 : t);
        }
        return this;
      }),
      (o.prototype._updateVisibleRows = function () {
        (this._visibleRows = Math.floor(
          this._container.offsetHeight / this._rowHeight
        )),
          (this._cachedRows = 3 * this._visibleRows),
          (this._scrollCacheSize = this._visibleRows * this._rowHeight);
      }),
      (o.prototype._updateScroller = function () {
        this._scroller.style.height =
          (this._rowCount * this._rowHeight).toString() + "px";
      }),
      (o.prototype._onScroll = function (e) {
        e.preventDefault(), this._requestViewportClean();
        var t = this._container.scrollTop;
        (!this._lastRenderScrollTop ||
          Math.abs(t - this._lastRenderScrollTop) > this._scrollCacheSize) &&
          (this._updateVisibleRows(),
          this._render(),
          (this._lastRenderScrollTop = t));
      }),
      (o.prototype._renderViewport = function (e) {
        for (var t = 1, n = this._container.childNodes.length; t < n; t++)
          (this._container.childNodes[t].style.display = "none"),
            this._container.childNodes[t].setAttribute("data-clean", "");
        if (this._rowCount && this._renderer && this._rowHeight) {
          for (
            var o = Math.min(this._rowCount, e + this._cachedRows),
              i = document.createDocumentFragment(),
              a = e;
            a < o;
            a++
          ) {
            var r = document.createElement("div");
            r.classList.add("vrow"),
              (r.style.top = a * this._rowHeight + "px"),
              this._renderer(a, r),
              i.appendChild(r);
          }
          this._container.appendChild(i);
        }
      }),
      (o.prototype._requestViewportClean = function () {
        null === this._cleanViewportTimerId &&
          (this._cleanViewportTimerId = setTimeout(
            function () {
              Date.now() - this._lastCleanedTime > 100 &&
                (this._cleanViewport(), (this._lastCleanedTime = Date.now())),
                (this._cleanViewportTimerId = null);
            }.bind(this),
            300
          ));
      }),
      (o.prototype._cleanViewport = function () {
        for (
          var e = this._container.querySelectorAll("div[data-clean]"),
            t = 0,
            n = e.length;
          t < n;
          t++
        )
          this._container.removeChild(e[t]), this._jqueryCleanup(e[t]);
      }),
      (o.prototype._jqueryCleanup = function (e) {
        window.hasOwnProperty("jQuery") &&
          jQuery.hasOwnProperty("cleanData") &&
          jQuery.hasOwnProperty("merge") &&
          jQuery.cleanData(
            jQuery.merge(Array.prototype.slice.call(e.querySelectorAll("*")), e)
          );
      }),
      (e.exports = o);
  }