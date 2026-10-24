/**
 * GEffectsButton
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEffectsButton(e, t, n, a, r, s, l) {
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

// Prototype methods
GEffectsButton.prototype.open = function (e) {
        (this._parent = e), this._htmlElement.gOverlay("open", e);
      }

GEffectsButton.prototype.close = function (e) {
        this._htmlElement.gOverlay("close", e || this._parent);
      }

GEffectsButton.prototype.toString = function () {
        return "[Object GEffectsPanel]";
      }

GEffectsButton.prototype.toString = function () {
        return "[Object GEffectsButton]";
      }

module.exports = GEffectsButton;
