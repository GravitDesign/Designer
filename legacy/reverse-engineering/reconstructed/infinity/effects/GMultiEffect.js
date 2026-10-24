/**
 * GMultiEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GMultiEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GMultiEffect.prototype.render = function (e, t, i, n, r, o) {
          for (var a = false, l = 0; l < this._fx.length; l++)
            if (!this._fx[l].canApplyNativeEffect()) {
              a = true;
              break;
            }
          a
            ? this._fx.forEach(function (a) {
                a.render(e, t, i, n, r, o);
              })
            : (this._fx.forEach(function (a) {
                a.applyNativeEffect(e, t, i, n, r, o);
              }),
              (t || e).drawCanvas(e, 0, 0, 1, s.CompositeOperator.Copy),
              this._fx.forEach(function (n) {
                n.removeNativeEffect(e, t, i);
              }));
        }

GMultiEffect.prototype._handleChange = function (e, t) {
          if (e === n._Change.Store)
            this.storeProperties(t.blob, h.GeometryProperties);
          else if (e === n._Change.Restore)
            this.restoreProperties(t.blob, h.GeometryProperties);
          else if (e == n._Change.BeforePropertiesChange) {
            for (
              var i = t.properties, a = t.values, s = {}, l = {}, A = 0;
              A < i.length;
              A++
            )
              for (
                var c = i[A].split("&"), p = c[0], u = 0;
                u < this._fx.length;
                u++
              )
                if (n.getName(this._fx[u]) === p) {
                  s[p] || (s[p] = []),
                    s[p].push(c[1]),
                    l[p] || (l[p] = []),
                    l[p].push(a[A]);
                  break;
                }
            for (var d in s) {
              var g = null;
              for (u = 0; u < this._fx.length; u++)
                if (n.getName(this._fx[u]) === d) {
                  g = this._fx[u];
                  break;
                }
              g && g.setProperties(s[d], l[d], t.custom, t.force, t.temporary);
            }
          } else n._Change.AfterPropertiesChange;
          var f = n.getClassFromId(r.getTypeId(this));
          f.GeometryProperties &&
            this._handleGeometryChangeForProperties(e, t, f.GeometryProperties),
            f.VisualProperties &&
              this._handleVisualChangeForProperties(e, t, f.VisualProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GMultiEffect.prototype.getFXArray = function () {
          return this._fx;
        }

GMultiEffect.prototype.toString = function () {
          return "[Object GMultiEffect]";
        }

GMultiEffect.prototype.destroy = function () {
          this._fx &&
            this._fx.forEach(function (e) {
              e.destroy();
            });
        }

module.exports = GMultiEffect;
