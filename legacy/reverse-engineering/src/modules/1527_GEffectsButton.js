/**
 * Webpack Module #1527
 * Type: class
 * Name: GEffectsButton
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(40);
    function a(e, t, n, a, r, s, l) {
      var c = e && t && n && a && l;
      if (
        ((this._htmlElement = $("<li></li>").addClass("g-effects-button")), c)
      ) {
        let c = "";
        s && s.category && (c = l(s.category) + "/"),
          this._htmlElement
            .gPro({ pro: r })
            .append(
              $("<span></span>")
                .addClass("g-effects-button-icon")
                .append($("<i></i>").addClass(t))
            )
            .append(
              $("<span></span>").addClass("g-effects-button-caption").append(e)
            )
            .on(
              "click",
              i.watchDog.trap(
                function () {
                  let e =
                    (n &&
                      o.GLocale.getValue(
                        (s && s.i18n) || n,
                        "name",
                        "unknown",
                        0
                      )) ||
                    "unkn";
                  r
                    ? gDesigner.stats("effects_add_proeffectdefault", c + e)
                    : gDesigner.stats("effects_add_effectdefault", c + e),
                    a(n, s);
                },
                () => !r,
                () =>
                  gDesigner.stats(
                    "effects_nonprotriespro_proeffectdefault",
                    c +
                      ((n &&
                        o.GLocale.getValue(
                          (s && s.i18n) || n,
                          "name",
                          "unknown",
                          0
                        )) ||
                        "unkn")
                  )
              )
            )
            .on(
              "mouseover",
              function () {
                this._htmlElement.addClass("active");
              }.bind(this)
            )
            .on(
              "mouseout",
              function () {
                this._htmlElement.removeClass("active");
              }.bind(this)
            );
      }
    }
    (a.prototype._htmlElement = null),
      (a.prototype.toString = function () {
        return "[Object GEffectsButton]";
      }),
      (e.exports = a);
  }