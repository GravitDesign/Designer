/**
 * GColorGradingEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GColorGradingEffect() {
        o.Effect.call(this), this._setDefaultProperties(s.VisualProperties);
      }

// Prototype methods
GColorGradingEffect.prototype.getEffectType = function () {
          return o.Effect.Type.Filter;
        }

GColorGradingEffect.prototype.getNodeNameTranslated = function () {
          return a.getValue("GColorGradingEffect", "name", this.getNodeName());
        }

GColorGradingEffect.prototype.render = function (e, t, i, r) {
          this.$cp && e.getBitmap().applyFilter(n, this.$cp);
        }

GColorGradingEffect.prototype._handleChange = function (e, t) {
          e === r._Change.Store
            ? this.storeProperties(t.blob, s.VisualProperties)
            : e === r._Change.Restore &&
              this.restoreProperties(t.blob, s.VisualProperties),
            this._handleVisualChangeForProperties(e, t, s.VisualProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GColorGradingEffect.prototype.toString = function () {
          return "[Object GColorGradingEffect]";
        }


module.exports = GColorGradingEffect;
