/**
 * Webpack Module #1588
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(1);
    var o = function () {
      this._timer = 0;
    };
    (o.prototype._element = $("<div />").addClass("g-fullscreen-banner")),
      (o.prototype._timeout = 5e3),
      (o.prototype.setBannerText = function (e) {
        return this._element.html(e), this;
      }),
      (o.prototype.show = function () {
        var e = this;
        return (
          $("body").append(this._element),
          this._element.animate({ opacity: 1 }, 500),
          (this._timer = setTimeout(function () {
            e.hide();
          }, 5e3)),
          this
        );
      }),
      (o.prototype.hide = function () {
        return (
          this._element.animate(
            { opacity: 0 },
            {
              duration: 500,
              complete: function () {
                $(this).remove();
              },
            }
          ),
          clearTimeout(this._timer),
          this
        );
      }),
      (e.exports = o);
  }