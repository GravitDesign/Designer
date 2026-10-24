/**
 * GColorAdjustMultiEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GColorAdjustMultiEffect() {
        n.call(this), (this._colorAdjust = new a(!0));
      }

// Prototype methods
GColorAdjustMultiEffect.prototype.getNodeNameTranslated = function () {
          return h.getValue(
            "GColorAdjustMultiEffect",
            "name",
            this.getNodeName()
          );
        }

GColorAdjustMultiEffect.prototype.render = function (e, t, i, n, r, o) {
          this._colorAdjust.render(e, t, i, n, r, o);
        }

GColorAdjustMultiEffect.prototype._handleChange = function (e, t) {
          if (e === l._Change.Store)
            this.storeProperties(t.blob, A.GeometryProperties);
          else if (e === l._Change.Restore)
            this.restoreProperties(t.blob, A.GeometryProperties);
          else if (e == l._Change.BeforePropertiesChange) {
            for (
              var i = t.properties,
                n = t.values,
                h = this._colorAdjust.$shp || a.GeometryProperties,
                c = 0;
              c < i.length;
              c++
            ) {
              var p = i[c].split("&")[0];
              l.getName(r) === p
                ? (n[c]
                    ? ((h.brightness = n[c].brightness),
                      (h.contrast = n[c].contrast))
                    : ((h.brightness = 0), (h.contrast = 0)),
                  this._fx[0].setProperty(
                    "shp",
                    n[c],
                    t.custom,
                    t.force,
                    t.temporary
                  ))
                : l.getName(o) === p &&
                  (n[c]
                    ? ((h.hue = n[c].hue), (h.saturation = n[c].saturation))
                    : ((h.hue = 0), (h.saturation = 0)),
                  this._fx[1].setProperty(
                    "shp",
                    n[c],
                    t.custom,
                    t.force,
                    t.temporary
                  ));
            }
            this._colorAdjust.setProperty(
              "shp",
              h,
              t.custom,
              t.force,
              t.temporary
            );
          }
          this._handleGeometryChangeForProperties(e, t, A.GeometryProperties),
            s.Effect.prototype._handleChange.call(this, e, t);
        }

GColorAdjustMultiEffect.prototype.getNodeNameTranslated = function () {
          return h.getValue(
            "GColorAdjustMultiEffect",
            "name",
            this.getNodeName()
          );
        }

GColorAdjustMultiEffect.prototype.toString = function () {
          return "[Object GColorAdjustMultiEffect]";
        }

GColorAdjustMultiEffect.prototype.destroy = function () {
          this._colorAdjust && this._colorAdjust.destroy(),
            n.prototype.destroy.call(this);
        }

module.exports = GColorAdjustMultiEffect;
