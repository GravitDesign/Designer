/**
 * GRulerWidget
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GRulerWidget() {
  // Constructor (reconstructed)
}

// Prototype methods
GRulerWidget.prototype.updateView = function (e, t) {
          (e === this._offset && t === this._scale) ||
            ((this._offset = e), (this._scale = t), this._paint());
        }

GRulerWidget.prototype.release = function () {
          this._scene.removeEventListener(
            n.AfterPropertiesChangeEvent,
            this._afterPropertiesChangeEvent,
            this
          );
        }

GRulerWidget.prototype.getHeight = function () {
          return this._orientation === h.Orientation.Horizontal
            ? 19
            : l.prototype.getHeight.call(this);
        }

GRulerWidget.prototype.getWidth = function () {
          return this._orientation === h.Orientation.Vertical
            ? this._verticalWidth
              ? this._verticalWidth
              : 19
            : l.prototype.getWidth.call(this);
        }

GRulerWidget.prototype.resize = function (e, t) {
          if (this._isUnitRuler) this._htmlElement.style.width = e + "px";
          else if (e !== this.getWidth() || t !== this.getHeight()) {
            l.prototype.resize.call(this, e, t);
            var i = s.getScreenDPI();
            this._orientation == h.Orientation.Horizontal &&
              (e = window.screen.availWidth),
              (this._canvas.width = e * i),
              (this._canvas.height = t * i),
              (this._canvas.style.width = e + "px"),
              (this._canvas.style.height = t + "px"),
              this._orientation === h.Orientation.Vertical &&
                (this._verticalWidth = e),
              this._paint();
          }
        }

GRulerWidget.prototype._paint = function () {
          if (this.isDisplayed()) {
            var e = s.getScreenDPI(),
              t = this.getWidth() * e,
              i = this.getHeight() * e,
              n = this._context,
              r = window
                .getComputedStyle(this._htmlElement, null)
                .getPropertyValue("color");
            n.clearRect(0, 0, t, i),
              (n.fillStyle = r),
              (n.strokeStyle = r),
              (n.lineWidth = 1);
            var l = 9 * e;
            (n.font = l + "px Verdana"),
              n.save(),
              this._orientation === h.Orientation.Vertical &&
                (n.translate(t, 0), n.rotate((Math.PI / 180) * 90)),
              n.beginPath();
            var A = 0,
              c = l,
              p = (19 * e) / 1.5,
              u = this._orientation === h.Orientation.Vertical ? i : t,
              d = 1 / this._scale,
              g = new o(1, this._scene.getProperty("ut")).toPoint(),
              f = 1,
              m = 0,
              y = false,
              _ = (50 * d) / g;
            if (g > 1)
              for (; 0 == Math.round(_) && f < 10 * g; )
                (f *= 10), (m += 1), (_ *= 10), (y = true);
            var v = 1;
            (_ = Math.round(_)) <= 1
              ? ((_ = 1), (v = 0.1))
              : _ > 1 && _ <= 2
              ? ((_ = 2), (v = 0.2))
              : _ > 2 && _ <= 5
              ? ((_ = 5), (v = 0.5))
              : _ > 5 && _ <= 10
              ? ((_ = 10), (v = 1))
              : _ > 10 && _ % 10 != 0
              ? (_ = 10 * (v = Math.round(_ / 10)))
              : (v = Math.round(_ / 10)),
              y && ((_ /= f), (v /= f));
            for (
              var b = (-this._offset * d) / g,
                C = Math.ceil(b / v) * v,
                w = Math.ceil(b / _) * _,
                E = ((u - this._offset) * d) / g,
                B = "",
                x = C,
                P = -9;
              x < E;
              x += v, ++P
            ) {
              var S = Math.round((x / d) * g) + this._offset;
              a.isEqualEps(x, w, 0.01 / f) && (P = Math.floor(10 * e)),
                P % Math.floor(10 * e) == 0
                  ? ((B = a.round(x, !1, y ? m : 0)), (A = c))
                  : ((B = ""), (A = p)),
                n.moveTo(S + 0.5, 19.5 * e),
                n.lineTo(S + 0.5, A + 0.5);
              var T = n.measureText(B).width;
              n.fillText(B, Math.ceil(S - T / 2), l - e);
            }
            n.stroke(), n.restore();
          }
        }

GRulerWidget.prototype._afterPropertiesChangeEvent = function (e) {
          !e.temporary &&
            e.node === this._scene &&
            e.properties.indexOf("ut") >= 0 &&
            (this._isUnitRuler ? this._updateUnitRuler() : this._paint());
        }

GRulerWidget.prototype._createUnitRuler = function (e) {
          (this._htmlElement.style.width = "19px"),
            (this._htmlElement.style.height = "19px"),
            (this._htmlElement.style.display = "flex"),
            (this._htmlElement.style.justifyContent = e.rulerLeftFill
              ? "flex-end"
              : "center");
        }

GRulerWidget.prototype._updateUnitRuler = function (e) {
          if (!this._htmlElement.firstChild) {
            var t = document.createElement("span");
            (t.style.font = "9px Verdana"),
              (t.style.alignSelf = "center"),
              e.rulerLeftFill && (t.style.marginRight = "5px"),
              (t.style.color = window
                .getComputedStyle(this._htmlElement, null)
                .getPropertyValue("color")),
              this._htmlElement.appendChild(t);
          }
          this._htmlElement.firstChild.innerHTML =
            this._scene.getProperty("ut");
        }

GRulerWidget.prototype.toString = function () {
          return "[Object GRulerWidget]";
        }

module.exports = GRulerWidget;
